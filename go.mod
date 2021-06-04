module github.com/vicanso/diving

go 1.16

// related to an invalid pseudo version in github.com/docker/distribution@v0.0.0-20181126153310-93e082742a009850ac46962150b2f652a822c5ff
replace github.com/docker/docker => github.com/docker/engine v0.0.0-20190822205725-ed20165a37b4

require (
	github.com/dustin/go-humanize v1.0.0
	github.com/robfig/cron/v3 v3.0.1
	github.com/vicanso/elton v1.4.1
	github.com/vicanso/hes v0.3.9
	github.com/vicanso/lru-ttl v0.5.0
	github.com/wagoodman/dive v0.10.0
	go.uber.org/automaxprocs v1.4.0
	go.uber.org/zap v1.17.0
	golang.org/x/net v0.0.0-20210525063256-abc453219eb5
	golang.org/x/sys v0.0.0-20210510120138-977fb7262007 // indirect
)
