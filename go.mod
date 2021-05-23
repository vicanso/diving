module github.com/vicanso/diving

go 1.16

// related to an invalid pseudo version in github.com/docker/distribution@v0.0.0-20181126153310-93e082742a009850ac46962150b2f652a822c5ff
replace github.com/docker/docker => github.com/docker/engine v0.0.0-20190822205725-ed20165a37b4

require (
	github.com/dustin/go-humanize v1.0.0
	github.com/robfig/cron/v3 v3.0.1
	github.com/vicanso/elton v1.4.0
	github.com/vicanso/hes v0.3.9
	github.com/vicanso/lru-ttl v0.4.2
	github.com/wagoodman/dive v0.10.0
	go.uber.org/automaxprocs v1.4.0
	go.uber.org/zap v1.16.0
	golang.org/x/lint v0.0.0-20210508222113-6edffad5e616 // indirect
	golang.org/x/net v0.0.0-20210521195947-fe42d452be8f
	golang.org/x/tools v0.1.1 // indirect
)
