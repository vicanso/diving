module github.com/vicanso/diving

go 1.16

// related to an invalid pseudo version in github.com/docker/distribution@v0.0.0-20181126153310-93e082742a009850ac46962150b2f652a822c5ff
replace github.com/docker/docker => github.com/docker/engine v0.0.0-20190822205725-ed20165a37b4

require (
	github.com/dustin/go-humanize v1.0.0
	github.com/gobuffalo/packr/v2 v2.8.1
	github.com/nsf/termbox-go v0.0.0-20190817171036-93860e161317 // indirect
	github.com/robfig/cron/v3 v3.0.1
	github.com/vicanso/elton v1.3.0
	github.com/vicanso/hes v0.3.6
	github.com/vicanso/lru-ttl v0.4.1
	github.com/wagoodman/dive v0.10.0
	github.com/wagoodman/keybinding v0.0.0-20181213133715-6a824da6df05 // indirect
	go.uber.org/automaxprocs v1.4.0
	go.uber.org/zap v1.16.0
	golang.org/x/crypto v0.0.0-20200622213623-75b288015ac9 // indirect
	golang.org/x/lint v0.0.0-20191125180803-fdd1cda4f05f // indirect
	golang.org/x/net v0.0.0-20210226172049-e18ecbb05110
)
