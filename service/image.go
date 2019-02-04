package service

import (
	"sort"

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
		FilePathList             []string                `json:"-"`
	}
	// LayerAnalysis analysis for layer
	LayerAnalysis struct {
		ID      string `json:"id,omitempty"`
		ShortID string `json:"shortID,omitempty"`
		Index   int    `json:"index,omitempty"`
		Command string `json:"command,omitempty"`
		Size    uint64 `json:"size,omitempty"`
		// FileAnalysisList analysis for file of layer
		FileAnalysisList []*FileAnalysis `json:"-"`
	}
	// FileAnalysis analysis for file
	FileAnalysis struct {
		Path     string
		Size     int64
		LinkName string
		Mode     string
		// const (
		// 	Unchanged DiffType = iota
		// 	Changed
		// 	Added
		// 	Removed
		// )
		DiffType filetree.DiffType
	}
	// FileAnalysisDiffInfo analysis diff info for file
	FileAnalysisDiffInfo struct {
		// Layer layer of container
		Layer    int    `json:"layer,omitempty"`
		Size     int64  `json:"size,omitempty"`
		LinkName string `json:"linkName,omitempty"`
		Mode     string `json:"mode,omitempty"`
		Type     int    `json:"type,omitempty"`
	}
	// FileAnalysisInfo analysis info for file
	FileAnalysisInfo struct {
		Path      string                  `json:"path,omitempty"`
		Size      int64                   `json:"size,omitempty"`
		LinkName  string                  `json:"linkName,omitempty"`
		Mode      string                  `json:"mode,omitempty"`
		DiffInfos []*FileAnalysisDiffInfo `json:"diffInfos,omitempty"`
	}
	// InefficiencyAnalysis analysis for inefficiency
	InefficiencyAnalysis struct {
		Path           string `json:"path,omitempty"`
		CumulativeSize int64  `json:"cumulativeSize,omitempty"`
	}
)

func analyzeFile(layer, upperLayer image.Layer) ([]*FileAnalysis, error) {
	fileAnalysisList := make([]*FileAnalysis, 0, 100)
	tree := layer.Tree()
	if upperLayer != nil {
		err := tree.Compare(upperLayer.Tree())
		if err != nil {
			return nil, err
		}
	}
	tree.VisitDepthChildFirst(func(node *filetree.FileNode) error {
		fileInfo := node.Data.FileInfo
		if fileInfo.IsDir || fileInfo.Path == "" {
			return nil
		}
		fileAnalysisList = append(fileAnalysisList, &FileAnalysis{
			Path:     fileInfo.Path,
			Size:     fileInfo.Size,
			LinkName: fileInfo.Linkname,
			Mode:     fileInfo.Mode.String(),
			DiffType: node.Data.DiffType,
		})
		return nil
	}, nil)
	return fileAnalysisList, nil
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
		// InefficiencyAnalysisList: make([]*InefficiencyAnalysis, len(result.Inefficiencies)),
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

	allFilePathMap := make(map[string]bool)
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

		fileAnalysisList, e := analyzeFile(layer, upperLayer)
		if e != nil {
			err = e
			return
		}
		for _, fileAnalysis := range fileAnalysisList {
			allFilePathMap[fileAnalysis.Path] = true
		}
		la.FileAnalysisList = fileAnalysisList
	}

	allFilePathList := make([]string, 0, len(allFilePathMap))
	for path := range allFilePathMap {
		allFilePathList = append(allFilePathList, path)
	}
	sort.Strings(allFilePathList)
	imgAnalysis.FilePathList = allFilePathList
	return
}
