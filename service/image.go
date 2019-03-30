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
		// UserSizeBytes user size of image
		UserSizeBytes uint64 `json:"userSizeBytes,omitempty"`
		// WastedBytes wasted size of image
		WastedBytes uint64 `json:"wastedBytes,omitempty"`
		// LayerAnalysisList layer analysis list
		LayerAnalysisList []*LayerAnalysis `json:"layerAnalysisList,omitempty"`
		// InefficiencyAnalysisList inefficiency analysis list
		InefficiencyAnalysisList []*InefficiencyAnalysis `json:"inefficiencyAnalysisList,omitempty"`
		TreeCache                *filetree.TreeCache     `json:"-"`
	}
	// LayerAnalysis analysis for layer
	LayerAnalysis struct {
		ID      string `json:"id,omitempty"`
		ShortID string `json:"shortID,omitempty"`
		Index   int    `json:"index,omitempty"`
		Command string `json:"command,omitempty"`
		Size    uint64 `json:"size,omitempty"`
	}
	// FileAnalysis analysis info for file
	FileAnalysis struct {
		IDS      string `json:"ids,omitempty"`
		IsDir    bool   `json:"isDir,omitempty"`
		Size     int64  `json:"size,omitempty"`
		LinkName string `json:"linkName,omitempty"`
		Mode     string `json:"mode,omitempty"`
		// Unchanged DiffType = iota
		// Changed
		// Added
		// Removed
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

// findOrCreateDir 查找目录或创建该目录
func findOrCreateDir(m *FileAnalysis, pathList []string) *FileAnalysis {
	current := m
	for _, path := range pathList {
		// 如果该目录为空，则创建
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

func analyzeFile(tree *filetree.FileTree) *FileAnalysis {

	topFileAnalysis := &FileAnalysis{
		IsDir:    true,
		Children: make(map[string]*FileAnalysis),
	}
	tree.VisitDepthParentFirst(func(node *filetree.FileNode) error {
		fileInfo := node.Data.FileInfo
		// 如果无目录信息，则跳过
		if fileInfo.Path == "" {
			return nil
		}
		// 拆分路径
		arr := strings.SplitN(fileInfo.Path, "/", -1)
		end := len(arr) - 1
		m := findOrCreateDir(topFileAnalysis, arr[:end])
		ids := strconv.Itoa(fileInfo.Uid) + ":" + strconv.Itoa(fileInfo.Gid)
		diffType := node.Data.DiffType
		mode := fileInfo.Mode.String()
		// 如果是目录，则添加相应的属性
		if fileInfo.IsDir {
			m.Mode = mode
			m.IDS = ids
			m.DiffType = diffType
			return nil
		}
		// 添加子文件至目录
		m.Children[arr[len(arr)-1]] = &FileAnalysis{
			IDS:      ids,
			Size:     fileInfo.Size,
			LinkName: fileInfo.Linkname,
			Mode:     mode,
			DiffType: diffType,
		}
		return nil
	}, nil)
	updateDirSizeAndDiffType(topFileAnalysis)
	return topFileAnalysis
}

// updateDirSizeAndDiffType 计算目录的大小以及更新diff type
func updateDirSizeAndDiffType(fileAnalysis *FileAnalysis) int64 {
	if !fileAnalysis.IsDir {
		return fileAnalysis.Size
	}
	var size int64
	unchangedCount := 0
	changedCount := 0
	addedCount := 0
	removedCount := 0
	for _, item := range fileAnalysis.Children {
		if item.IsDir {
			size += updateDirSizeAndDiffType(item)
		} else {
			size += item.Size
		}
		switch item.DiffType {
		case filetree.Changed:
			changedCount++
		case filetree.Added:
			addedCount++
		case filetree.Removed:
			removedCount++
		default:
			unchangedCount++
		}
	}
	// 如果目录的diff type 为默认值
	// diff type 中未处理目录新增的情况
	if fileAnalysis.DiffType == filetree.Unchanged {
		// 只有新增文件
		if unchangedCount == 0 &&
			removedCount == 0 &&
			changedCount == 0 &&
			addedCount != 0 {
			fileAnalysis.DiffType = filetree.Added
		}
	}
	fileAnalysis.Size = size
	return size
}

// GetFileAnalysis get file analysis
func GetFileAnalysis(imgAnalysis *ImageAnalysis, index int) *FileAnalysis {

	cache := imgAnalysis.TreeCache
	layerCount := len(imgAnalysis.LayerAnalysisList)

	layerIndex := layerCount - index - 1

	// 使用的是比较模式，只与上一层的比较
	bottomTreeStart := 0
	topTreeStop := layerIndex
	bottomTreeStop := layerIndex - 1
	topTreeStart := layerIndex

	tree := cache.Get(bottomTreeStart, bottomTreeStop, topTreeStart, topTreeStop)

	return analyzeFile(tree)
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
	var userSizeBytes uint64
	// 默认的计算 user size bytes有误
	layerCount := len(result.Layers)
	for i, layer := range result.Layers {
		if i < layerCount-1 {
			userSizeBytes += layer.Size()
		}
	}

	// 镜像基本信息
	imgAnalysis = &ImageAnalysis{
		Efficiency:        result.Efficiency,
		SizeBytes:         result.SizeBytes,
		UserSizeBytes:     userSizeBytes,
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

	layers := make([]image.Layer, layerCount)
	// layer的顺序为从顶至底层（最新生成的那层为0）
	// 保证layer的排序
	for _, layer := range result.Layers {
		layers[layer.Index()] = layer
	}

	cache := filetree.NewFileTreeCache(result.RefTrees)
	cache.Build()
	imgAnalysis.TreeCache = &cache

	// 生成各层的相关信息
	for index, layer := range layers {
		la := &LayerAnalysis{
			ID:      layer.Id(),
			ShortID: layer.ShortId(),
			Index:   layer.Index(),
			Command: layer.Command(),
			Size:    layer.Size(),
		}
		imgAnalysis.LayerAnalysisList[index] = la
	}
	return
}
