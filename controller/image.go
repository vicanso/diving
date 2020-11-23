package controller

import (
	"net/http"
	"strconv"
	"time"

	"github.com/vicanso/diving/router"
	"github.com/vicanso/diving/service"
	"github.com/vicanso/elton"
	"github.com/vicanso/hes"
	lruttl "github.com/vicanso/lru-ttl"
	"go.uber.org/zap"
)

var (
	// imageInfoCache image basic info
	imageInfoCache *lruttl.Cache
)

const (
	analysisDoing = iota
	analysisFail
	analysisDone
)

type (
	// imageCtrl image ctrl
	imageCtrl struct{}
	imageInfo struct {
		// CreatedAt create time
		CreatedAt int64 `json:"createdAt,omitempty"`
		// Status status
		Status int `json:"status,omitempty"`
		// Err error
		Err error `json:"err,omitempty"`
		// TimeConsuming time consuming
		TimeConsuming time.Duration `json:"timeConsuming,omitempty"`
		// Analysis image analysis information
		Analysis *service.ImageAnalysis `json:"-"`
	}
)

func init() {
	imageInfoCache = lruttl.New(32, 30*time.Minute)
	g := router.NewAPIGroup("/images")
	ctrl := imageCtrl{}

	g.GET("/tree/*", ctrl.getTree)

	g.GET("/detail/*", ctrl.getBasicInfo)

	g.GET("/caches", ctrl.getCacheList)
}

func doAnalyze(name string) {
	startedAt := time.Now()
	analysis, err := service.Analyze(name)
	if err != nil {
		imageInfoCache.Add(name, &imageInfo{
			CreatedAt:     startedAt.Unix(),
			Status:        analysisFail,
			Err:           err,
			TimeConsuming: time.Since(startedAt),
		})
		logger.Error("analyze fail",
			zap.String("name", name),
			zap.Error(err),
		)
		return
	}
	imageInfoCache.Add(name, &imageInfo{
		CreatedAt:     startedAt.Unix(),
		Status:        analysisDone,
		Analysis:      analysis,
		TimeConsuming: time.Since(startedAt),
	})
}

// getBasicInfo get basic info of image
func (ctrl imageCtrl) getBasicInfo(c *elton.Context) (err error) {
	name := c.Param("*")
	var info *imageInfo
	v, ok := imageInfoCache.Get(name)
	if ok {
		info = v.(*imageInfo)
	}
	if info == nil {
		info = &imageInfo{
			CreatedAt: time.Now().Unix(),
			Status:    analysisDoing,
		}
		imageInfoCache.Add(name, info)
		go doAnalyze(name)
	}
	// 如果正在处理中，则直接返回
	if info.Status == analysisDoing {
		c.StatusCode = http.StatusAccepted
		return
	}
	if info.Status == analysisFail {
		err = hes.NewWithError(info.Err)
		return
	}
	if !service.IsDev() {
		c.CacheMaxAge(5 * time.Minute)
	}
	c.Body = info.Analysis
	return
}

func (ctrl imageCtrl) getTree(c *elton.Context) (err error) {
	layer := c.QueryParam("layer")
	if layer == "" {
		err = hes.New("layer can not be null")
		return
	}
	index, e := strconv.Atoi(layer)
	if e != nil {
		err = hes.NewWithErrorStatusCode(e, http.StatusBadRequest)
		return
	}

	name := c.Param("*")
	v, ok := imageInfoCache.Get(name)
	if !ok {
		err = hes.New("can not get tree of image")
		return
	}
	info := v.(*imageInfo)
	if info.Err != nil {
		err = info.Err
		return
	}
	if info.Status != analysisDone {
		err = hes.New("the image is analysising, please wait for a moment")
		return
	}
	if index >= len(info.Analysis.LayerAnalysisList) {
		err = hes.New("the layer index is too big")
		return
	}
	if !service.IsDev() {
		c.CacheMaxAge(5 * time.Minute)
	}

	result, err := service.GetFileAnalysis(info.Analysis, index)
	if err != nil {
		return
	}
	c.Body = result
	return
}

// getCacheList get cache list
func (ctrl imageCtrl) getCacheList(c *elton.Context) (err error) {
	keys := imageInfoCache.Keys()
	result := make(map[string]*imageInfo)
	for _, key := range keys {
		v, ok := imageInfoCache.Get(key)
		if ok {
			info := v.(*imageInfo)
			result[key.(string)] = info
		}
	}
	c.Body = result
	return
}
