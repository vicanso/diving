package main

import (
	"context"
	"flag"
	"fmt"
	"net/http"
	"os"
	"time"

	"golang.org/x/net/http2"
	"golang.org/x/net/http2/h2c"

	"github.com/dustin/go-humanize"
	_ "github.com/vicanso/diving/controller"
	"github.com/vicanso/diving/log"
	"github.com/vicanso/diving/router"
	_ "github.com/vicanso/diving/schedule"
	"github.com/vicanso/diving/util"
	"github.com/vicanso/elton"
	"github.com/vicanso/elton/middleware"
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
		log.Info(context.Background()).Msg(value)
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

	e := elton.New()

	e.OnError(func(c *elton.Context, err error) {
		log.Error(c.Context()).
			Str("uri", c.Request.RequestURI).
			Err(err).
			Msg("unexpected error")
	})

	e.Use(middleware.NewRecover())

	e.Use(middleware.NewStats(middleware.StatsConfig{
		OnStats: func(statsInfo *middleware.StatsInfo, c *elton.Context) {
			log.Info(c.Context()).
				Str("ip", statsInfo.IP).
				Str("method", statsInfo.Method).
				Str("uri", statsInfo.URI).
				Int("status", statsInfo.Status).
				Str("latency", statsInfo.Latency.String()).
				Str("size", humanize.Bytes(uint64(statsInfo.Size))).
				Msg("access log")
		},
	}))

	e.Use(middleware.NewDefaultError())

	e.Use(func(c *elton.Context) error {
		ctx := util.SetTraceID(c.Context(), util.RandomString(8))
		c.WithContext(ctx)
		c.NoCache()
		return c.Next()
	})

	e.Use(middleware.NewDefaultFresh())
	e.Use(middleware.NewDefaultETag())

	e.Use(middleware.NewDefaultResponder())

	// health check
	e.GET("/ping", func(c *elton.Context) (err error) {
		c.Body = "pong"
		return
	})

	groups := router.GetGroups()
	for _, g := range groups {
		e.AddGroup(g)
	}

	// http1与http2均支持
	e.Server = &http.Server{
		Handler: h2c.NewHandler(e, &http2.Server{}),
	}

	log.Info(context.Background()).Msg("server will listen on " + listen)
	err := e.ListenAndServe(listen)
	if err != nil {
		panic(err)
	}
}
