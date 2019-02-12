package main

import (
	"flag"
	"net/http"
	"os"
	"time"

	"github.com/vicanso/cod"
	"github.com/vicanso/cod/middleware"
	_ "github.com/vicanso/diving/controller"
	"github.com/vicanso/diving/log"
	"github.com/vicanso/diving/router"
	"go.uber.org/zap"
)

var (
	runMode string
)

// 获取监听地址
func getListen() string {
	listen := os.Getenv("LISTEN")
	if listen == "" {
		listen = ":7001"
	}
	return listen
}

func check() {
	listen := getListen()
	url := ""
	if listen[0] == ':' {
		url = "http://127.0.0.1" + listen + "/ping"
	} else {
		url = "http://" + listen + "/ping"
	}
	client := http.Client{
		Timeout: 3 * time.Second,
	}
	resp, err := client.Get(url)
	if err != nil || resp == nil || resp.StatusCode != http.StatusOK {
		os.Exit(1)
		return
	}
	os.Exit(0)
}

func main() {

	flag.StringVar(&runMode, "mode", "", "running mode")
	flag.Parse()

	if runMode == "check" {
		check()
		return
	}
	listen := getListen()

	logger := log.Default()

	d := cod.New()

	// 如果出错则会触发此回调（在 ErrorHandler 中会将出错转换为相应的http响应，此类情况不会触发）
	d.OnError(func(c *cod.Context, err error) {
		// 可以针对实际场景输出更多的日志信息
		logger.DPanic("exception",
			zap.String("uri", c.Request.RequestURI),
			zap.Error(err),
		)
	})

	d.Use(middleware.NewRecover())

	d.Use(middleware.NewStats(middleware.StatsConfig{
		OnStats: func(statsInfo *middleware.StatsInfo, _ *cod.Context) {
			logger.Info("access log",
				zap.String("ip", statsInfo.IP),
				zap.String("method", statsInfo.Method),
				zap.String("uri", statsInfo.URI),
				zap.Int("status", statsInfo.Status),
				zap.String("consuming", statsInfo.Consuming.String()),
			)
		},
	}))

	d.Use(middleware.NewDefaultErrorHandler())

	d.Use(func(c *cod.Context) error {
		c.NoCache()
		return c.Next()
	})

	d.Use(middleware.NewDefaultFresh())
	d.Use(middleware.NewDefaultETag())
	d.Use(middleware.NewDefaultCompress())

	d.Use(middleware.NewDefaultResponder())

	// health check
	d.GET("/ping", func(c *cod.Context) (err error) {
		c.Body = "pong"
		return
	})

	groups := router.GetGroups()
	for _, g := range groups {
		d.AddGroup(g)
	}

	logger.Info("server will listen on " + listen)
	err := d.ListenAndServe(listen)
	if err != nil {
		panic(err)
	}
}
