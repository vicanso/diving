package main

import (
	"flag"
	"fmt"
	"net/http"
	"os"
	"time"

	"go.uber.org/zap"

	_ "github.com/vicanso/diving/controller"
	"github.com/vicanso/diving/log"
	"github.com/vicanso/diving/router"
	"github.com/vicanso/elton"

	humanize "github.com/dustin/go-humanize"

	compress "github.com/vicanso/elton-compress"
	errorHandler "github.com/vicanso/elton-error-handler"
	etag "github.com/vicanso/elton-etag"
	fresh "github.com/vicanso/elton-fresh"
	recover "github.com/vicanso/elton-recover"
	responder "github.com/vicanso/elton-responder"
	stats "github.com/vicanso/elton-stats"
	maxprocs "go.uber.org/automaxprocs/maxprocs"
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

func init() {
	_, _ = maxprocs.Set(maxprocs.Logger(func(format string, args ...interface{}) {
		value := fmt.Sprintf(format, args...)
		log.Default().Info(value)
	}))
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

	d := elton.New()

	d.OnError(func(c *elton.Context, err error) {
		logger.DPanic("unexpected error",
			zap.String("uri", c.Request.RequestURI),
			zap.Error(err),
		)
	})

	d.Use(recover.New())

	d.Use(stats.New(stats.Config{
		OnStats: func(statsInfo *stats.Info, _ *elton.Context) {
			logger.Info("access log",
				zap.String("ip", statsInfo.IP),
				zap.String("method", statsInfo.Method),
				zap.String("uri", statsInfo.URI),
				zap.Int("status", statsInfo.Status),
				zap.String("consuming", statsInfo.Consuming.String()),
				zap.String("size", humanize.Bytes(uint64(statsInfo.Size))),
			)
		},
	}))

	d.Use(errorHandler.NewDefault())

	d.Use(func(c *elton.Context) error {
		c.NoCache()
		return c.Next()
	})

	d.Use(fresh.NewDefault())
	d.Use(etag.NewDefault())
	d.Use(compress.NewDefault())

	d.Use(responder.NewDefault())

	// health check
	d.GET("/ping", func(c *elton.Context) (err error) {
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
