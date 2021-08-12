module github.com/vicanso/diving

go 1.16

// related to an invalid pseudo version in github.com/docker/distribution@v0.0.0-20181126153310-93e082742a009850ac46962150b2f652a822c5ff
replace github.com/docker/docker => github.com/docker/engine v17.12.0-ce-rc1.0.20200916142827-bd33bbf0497b+incompatible

require (
	github.com/containerd/containerd v1.5.5 // indirect
	github.com/dustin/go-humanize v1.0.0
	github.com/robfig/cron/v3 v3.0.1
	github.com/vicanso/elton v1.4.2
	github.com/vicanso/hes v0.3.9
	github.com/vicanso/lru-ttl v0.5.0
	github.com/wagoodman/dive v0.10.0
	go.uber.org/automaxprocs v1.4.0
	go.uber.org/zap v1.19.0
	golang.org/x/net v0.0.0-20210805182204-aaa1db679c0d
	golang.org/x/sys v0.0.0-20210809222454-d867a43fc93e // indirect
)
