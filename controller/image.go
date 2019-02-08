package controller

import (
	"net/http"
	"strconv"

	lru "github.com/hashicorp/golang-lru"
	"github.com/vicanso/cod"
	"github.com/vicanso/diving/router"
	"github.com/vicanso/diving/service"
	"github.com/vicanso/hes"
	"go.uber.org/zap"
)

var (
	// imageInfoCache image basic info
	imageInfoCache *lru.Cache
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
		Status   int
		Err      error
		Analysis *service.ImageAnalysis
	}
)

func init() {
	c, err := lru.New(1024)
	if err != nil {
		panic(err)
	}
	imageInfoCache = c
	g := router.NewAPIGroup("/images")
	ctrl := imageCtrl{}

	g.GET("/tree/*name", ctrl.getTree)

	g.GET("/detail/*name", ctrl.getBasicInfo)

}

func doAnalyze(name string) {
	analysis, err := service.Analyze(name)
	if err != nil {
		imageInfoCache.Add(name, &imageInfo{
			Status: analysisFail,
			Err:    err,
		})
		logger.Error("analyze fail",
			zap.String("name", name),
			zap.Error(err),
		)
		return
	}
	imageInfoCache.Add(name, &imageInfo{
		Status:   analysisDone,
		Analysis: analysis,
	})
}

// getBasicInfo get basic info of image
func (ctrl imageCtrl) getBasicInfo(c *cod.Context) (err error) {
	name := c.Param("name")[1:]
	var info *imageInfo
	v, ok := imageInfoCache.Get(name)
	if !ok {
		info = &imageInfo{
			Status: analysisDoing,
		}
		imageInfoCache.Add(name, info)
		go doAnalyze(name)
	} else {
		info = v.(*imageInfo)
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
		c.CacheMaxAge("5m")
	}
	c.Body = info.Analysis
	return
}

func (ctrl imageCtrl) getTree(c *cod.Context) (err error) {
	index, e := strconv.Atoi(c.QueryParam("layer"))
	if e != nil {
		err = hes.NewWithErrorStatusCode(e, http.StatusBadRequest)
		return
	}

	name := c.Param("name")[1:]
	var info *imageInfo
	v, ok := imageInfoCache.Get(name)
	if !ok {
		err = hes.New("can not get tree of image")
		return
	}
	info = v.(*imageInfo)
	if info.Err != nil {
		err = info.Err
		return
	}
	if info.Status != analysisDone {
		err = hes.New("the image is analysising, please wait for a moment")
		return
	}
	layerAnalysisList := info.Analysis.LayerAnalysisList
	if index > len(layerAnalysisList) {
		err = hes.New("layer no is too big")
		return
	}
	// path := c.QueryParam("path")

	c.Body = layerAnalysisList[index].FileAnalysis

	return
}
