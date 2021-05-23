package controller

import (
	"bytes"
	"time"

	"github.com/vicanso/diving/asset"
	"github.com/vicanso/diving/router"
	"github.com/vicanso/elton"
	"github.com/vicanso/elton/middleware"
)

// assetCtrl asset ctrl
type assetCtrl struct{}

var assetFS = middleware.NewEmbedStaticFS(asset.GetFS(), "dist")

func init() {
	g := router.NewGroup("")
	ctrl := assetCtrl{}
	g.GET("/", ctrl.index)
	g.GET("/favicon.ico", ctrl.favIcon)

	g.GET("/static/*", middleware.NewStaticServe(assetFS, middleware.StaticServeConfig{
		Path: "/static",
		// 客户端缓存一年
		MaxAge: 365 * 24 * time.Hour,
		// 缓存服务器缓存一个小时
		SMaxAge:             time.Hour,
		DenyQueryString:     true,
		DisableLastModified: true,
	}))
}

func sendFile(c *elton.Context, file string) (err error) {
	// 因为静态文件打包至程序中，直接读取
	buf, err := assetFS.Get(file)
	if err != nil {
		return
	}
	c.SetContentTypeByExt(file)
	c.BodyBuffer = bytes.NewBuffer(buf)
	return
}

func (ctrl assetCtrl) index(c *elton.Context) (err error) {
	c.CacheMaxAge(10 * time.Second)
	return sendFile(c, "index.html")
}

func (ctrl assetCtrl) favIcon(c *elton.Context) (err error) {
	c.CacheMaxAge(10 * time.Minute)
	return sendFile(c, "favicon.ico")
}
