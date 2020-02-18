module github.com/vicanso/diving

go 1.13

require (
	github.com/docker/docker v0.7.3-0.20190309235953-33c3200e0d16
	github.com/dustin/go-humanize v1.0.0
	github.com/gobuffalo/packr/v2 v2.7.1
	github.com/hashicorp/golang-lru v0.5.4
	github.com/vicanso/elton v0.2.3
	github.com/vicanso/elton-compress v0.1.7
	github.com/vicanso/elton-error-handler v0.1.4
	github.com/vicanso/elton-etag v0.1.2
	github.com/vicanso/elton-fresh v0.1.2
	github.com/vicanso/elton-recover v0.1.4
	github.com/vicanso/elton-responder v0.1.6
	github.com/vicanso/elton-static-serve v0.1.2
	github.com/vicanso/elton-stats v0.1.2
	github.com/vicanso/hes v0.2.1
	github.com/wagoodman/dive v0.9.2
	go.uber.org/zap v1.13.0
)

// related to an invalid pseudo version in github.com/docker/distribution@v0.0.0-20181126153310-93e082742a009850ac46962150b2f652a822c5ff
replace github.com/docker/docker => github.com/docker/engine v0.0.0-20190822205725-ed20165a37b4
