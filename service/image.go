package service

import (
	"errors"
	"os/exec"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/wagoodman/dive/dive"

	"github.com/wagoodman/dive/dive/filetree"
)

type (
	imageInfo struct {
		fetchedAt time.Time
		name      string
	}
	fetchedImages struct {
		sync.Mutex
		imageInfoList []*imageInfo
	}
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
		Comparer                 *filetree.Comparer      `json:"-"`
		// TreeCache                *filetree.TreeCache     `json:"-"`
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

var currentFetchedImages = &fetchedImages{}

// Add 添加image
func (fi *fetchedImages) Add(name string) {
	fi.Lock()
	defer fi.Unlock()
	if len(fi.imageInfoList) == 0 {
		fi.imageInfoList = make([]*imageInfo, 0)
	}
	var found *imageInfo
	for _, item := range fi.imageInfoList {
		if item.name == name {
			found = item
		}
	}
	if found != nil {
		found.fetchedAt = time.Now()
	} else {
		fi.imageInfoList = append(fi.imageInfoList, &imageInfo{
			fetchedAt: time.Now(),
			name:      name,
		})
	}
}

// ClearExpired 清除过期的镜像
func (fi *fetchedImages) ClearExpired() []string {
	fi.Lock()
	defer fi.Unlock()
	// 一天前的镜像则删除
	expiredTime := time.Now().AddDate(0, 0, -1)
	expiredImages := make([]string, 0)
	infos := make([]*imageInfo, 0)
	for _, item := range fi.imageInfoList {
		if item.fetchedAt.Before(expiredTime) {
			expiredImages = append(expiredImages, item.name)
		} else {
			infos = append(infos, item)
		}
	}
	fi.imageInfoList = infos

	return expiredImages
}

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
		case filetree.Modified:
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
	if fileAnalysis.DiffType == filetree.Unmodified {
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

// RemoveExpiredImages remove expired image
func RemoveExpiredImages() (err error) {
	expiredImages := currentFetchedImages.ClearExpired()
	for _, name := range expiredImages {
		cmd := exec.Command("docker", "rmi", name)
		e := cmd.Run()
		if e != nil {
			err = e
		}
	}
	return
}

// GetFileAnalysis get file analysis
func GetFileAnalysis(imgAnalysis *ImageAnalysis, index int) (*FileAnalysis, error) {

	// cache := imgAnalysis.TreeCache
	layerCount := len(imgAnalysis.LayerAnalysisList)

	layerIndex := layerCount - index - 1

	// 使用的是比较模式，只与上一层的比较
	bottomTreeStart := 0
	topTreeStop := layerIndex
	bottomTreeStop := layerIndex - 1
	topTreeStart := layerIndex

	tree, err := imgAnalysis.Comparer.GetTree(filetree.NewTreeIndexKey(bottomTreeStart, bottomTreeStop, topTreeStart, topTreeStop))
	if err != nil {
		return nil, err
	}

	return analyzeFile(tree), nil
}

// Analyze analyze the docker images
func Analyze(name string) (imgAnalysis *ImageAnalysis, err error) {
	resolver, err := dive.GetImageResolver(dive.SourceDockerEngine)
	if err != nil {
		return
	}
	image, err := resolver.Fetch(name)
	if err != nil {
		return
	}
	result, err := image.Analyze()
	if err != nil {
		return
	}

	// 镜像基本信息
	imgAnalysis = &ImageAnalysis{
		Efficiency:        result.Efficiency,
		SizeBytes:         result.SizeBytes,
		UserSizeBytes:     result.UserSizeByes,
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

	comparer := filetree.NewComparer(result.RefTrees)
	errs := comparer.BuildCache()
	if len(errs) != 0 {
		err = errors.New(errs[0].Error())
		return
	}
	imgAnalysis.Comparer = &comparer

	// 生成各层的相关信息
	max := len(result.Layers)
	for index, layer := range result.Layers {
		la := &LayerAnalysis{
			ID:      layer.Id,
			ShortID: layer.ShortId(),
			Index:   layer.Index,
			Command: layer.Command,
			Size:    layer.Size,
		}
		// 更换层的顺序
		imgAnalysis.LayerAnalysisList[max-index-1] = la
	}
	// 添加至当前已拉取的镜像
	currentFetchedImages.Add(name)
	return
}
