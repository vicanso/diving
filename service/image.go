package service

import (
	"strconv"
	"strings"

	"github.com/wagoodman/dive/filetree"
	"github.com/wagoodman/dive/image"
)

type (
	// ImageAnalysis analysis for image
	ImageAnalysis struct {
		// Efficiency space efficiency of image
		Efficiency float64 `json:"efficiency,omitempty"`
		// SizeBytes size of image
		SizeBytes uint64 `json:"sizeBytes,omitempty"`
		// UserSizeByes user size of image
		UserSizeByes uint64 `json:"userSizeByes,omitempty"`
		// WastedBytes wasted size of image
		WastedBytes uint64 `json:"wastedBytes,omitempty"`
		// LayerAnalysisList layer analysis list
		LayerAnalysisList []*LayerAnalysis `json:"layerAnalysisList,omitempty"`
		// InefficiencyAnalysisList inefficiency analysis list
		InefficiencyAnalysisList []*InefficiencyAnalysis `json:"inefficiencyAnalysisList,omitempty"`
	}
	// LayerAnalysis analysis for layer
	LayerAnalysis struct {
		ID      string `json:"id,omitempty"`
		ShortID string `json:"shortID,omitempty"`
		Index   int    `json:"index,omitempty"`
		Command string `json:"command,omitempty"`
		Size    uint64 `json:"size,omitempty"`
		// FileAnalysis analysis for file of layer
		FileAnalysis *FileAnalysis `json:"-"`
	}
	// FileAnalysis analysis info for file
	FileAnalysis struct {
		IDS      string                   `json:"ids,omitempty"`
		IsDir    bool                     `json:"isDir,omitempty"`
		Size     int64                    `json:"size,omitempty"`
		LinkName string                   `json:"linkName,omitempty"`
		Mode     string                   `json:"mode,omitempty"`
		DiffType filetree.DiffType        `json:"diffType,omitempty"`
		Children map[string]*FileAnalysis `json:"children,omitempty"`
	}
	// InefficiencyAnalysis analysis for inefficiency
	InefficiencyAnalysis struct {
		Path           string `json:"path,omitempty"`
		CumulativeSize int64  `json:"cumulativeSize,omitempty"`
		Count          int    `json:"count,omitempty"`
	}
)

func findOrCreateDir(m *FileAnalysis, pathList []string) *FileAnalysis {
	current := m
	for _, path := range pathList {
		if current.Children[path] == nil {
			current.Children[path] = &FileAnalysis{
				IsDir:    true,
				Children: make(map[string]*FileAnalysis),
			}
		}
		current = current.Children[path]
	}
	return current
}

func analyzeFile(layer, upperLayer image.Layer) (*FileAnalysis, error) {

	tree := layer.Tree()
	if upperLayer != nil {
		err := tree.Compare(upperLayer.Tree())
		if err != nil {
			return nil, err
		}
	}
	topFileAnalysis := &FileAnalysis{
		IsDir:    true,
		Children: make(map[string]*FileAnalysis),
	}
	tree.VisitDepthChildFirst(func(node *filetree.FileNode) error {
		fileInfo := node.Data.FileInfo
		if fileInfo.Path == "" {
			return nil
		}
		arr := strings.SplitN(fileInfo.Path, "/", -1)
		end := len(arr) - 1
		m := findOrCreateDir(topFileAnalysis, arr[:end])
		ids := strconv.Itoa(fileInfo.Uid) + ":" + strconv.Itoa(fileInfo.Gid)
		if fileInfo.IsDir {
			m.Mode = fileInfo.Mode.String()
			m.IDS = ids
			return nil
		}
		m.Children[arr[len(arr)-1]] = &FileAnalysis{
			IDS:      ids,
			Size:     fileInfo.Size,
			LinkName: fileInfo.Linkname,
			Mode:     fileInfo.Mode.String(),
			DiffType: node.Data.DiffType,
		}
		return nil
	}, nil)
	countDirSize(topFileAnalysis)
	return topFileAnalysis, nil
}

func countDirSize(fileAnalysis *FileAnalysis) int64 {
	if !fileAnalysis.IsDir {
		return fileAnalysis.Size
	}
	var size int64
	for _, item := range fileAnalysis.Children {
		if item.IsDir {
			size += countDirSize(item)
			continue
		}
		size += item.Size
	}
	fileAnalysis.Size = size
	return size
}

// Analyze analyze the docker images
func Analyze(name string) (imgAnalysis *ImageAnalysis, err error) {
	analyzer := image.GetAnalyzer(name)
	reader, err := analyzer.Fetch()
	if err != nil {
		return
	}
	defer reader.Close()
	err = analyzer.Parse(reader)
	if err != nil {
		return
	}
	result, err := analyzer.Analyze()
	if err != nil {
		return
	}
	// 镜像基本信息
	imgAnalysis = &ImageAnalysis{
		Efficiency:        result.Efficiency,
		SizeBytes:         result.SizeBytes,
		UserSizeByes:      result.UserSizeByes,
		WastedBytes:       result.WastedBytes,
		LayerAnalysisList: make([]*LayerAnalysis, len(result.Layers)),
	}

	// 分析生成低效数据（多个之间文件层覆盖）
	inefficiencyAnalysisList := make([]*InefficiencyAnalysis, 0, len(result.Inefficiencies))
	for _, item := range result.Inefficiencies {
		if item.CumulativeSize == 0 {
			continue
		}
		inefficiencyAnalysisList = append(inefficiencyAnalysisList, &InefficiencyAnalysis{
			Path:           item.Path,
			CumulativeSize: item.CumulativeSize,
			Count:          len(item.Nodes),
		})
	}
	imgAnalysis.InefficiencyAnalysisList = inefficiencyAnalysisList

	layerCount := len(result.Layers)
	layers := make([]image.Layer, layerCount)
	// layer的顺序为从顶至底层
	// 保证layer的排序
	for _, layer := range result.Layers {
		layers[layer.Index()] = layer
	}

	for index, layer := range layers {
		var upperLayer image.Layer
		if index < len(result.Layers)-1 {
			upperLayer = result.Layers[index+1]
		}
		la := &LayerAnalysis{
			ID:      layer.Id(),
			ShortID: layer.ShortId(),
			Index:   layer.Index(),
			Command: layer.Command(),
			Size:    layer.Size(),
		}
		imgAnalysis.LayerAnalysisList[index] = la

		fileAnalysis, e := analyzeFile(layer, upperLayer)
		if e != nil {
			err = e
			return
		}
		la.FileAnalysis = fileAnalysis
	}

	return
}
