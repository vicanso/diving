module github.com/vicanso/diving

go 1.15

// related to an invalid pseudo version in github.com/docker/distribution@v0.0.0-20181126153310-93e082742a009850ac46962150b2f652a822c5ff
replace github.com/docker/docker => github.com/docker/engine v0.0.0-20190822205725-ed20165a37b4

require (
	github.com/dustin/go-humanize v1.0.0
	github.com/gobuffalo/packr/v2 v2.8.1
	github.com/vicanso/elton v1.2.1
	github.com/vicanso/hes v0.2.4
	github.com/vicanso/lru-ttl v0.2.0
	github.com/wagoodman/dive v0.9.2
	go.uber.org/automaxprocs v1.3.0
	go.uber.org/zap v1.16.0
	golang.org/x/net v0.0.0-20201110031124-69a78807bb2b
)
