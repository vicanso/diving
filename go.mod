module github.com/vicanso/diving

go 1.18

// related to an invalid pseudo version in github.com/docker/distribution@v0.0.0-20181126153310-93e082742a009850ac46962150b2f652a822c5ff
replace github.com/docker/docker => github.com/docker/engine v17.12.0-ce-rc1.0.20200916142827-bd33bbf0497b+incompatible

require (
	github.com/containerd/containerd v1.6.6 // indirect
	github.com/dustin/go-humanize v1.0.0
	github.com/robfig/cron/v3 v3.0.1
	github.com/rs/zerolog v1.27.0
	github.com/vicanso/elton v1.9.5
	github.com/vicanso/go-mask v1.0.0
	github.com/vicanso/hes v0.6.0
	github.com/vicanso/lru-ttl v1.5.1
	github.com/wagoodman/dive v0.10.0
	go.uber.org/automaxprocs v1.5.1
	golang.org/x/net v0.0.0-20220802222814-0bcc04d9c69b
	golang.org/x/sys v0.0.0-20220803195053-6e608f9ce704 // indirect
)

require (
	github.com/Microsoft/go-winio v0.5.2 // indirect
	github.com/andybalholm/brotli v1.0.4 // indirect
	github.com/awesome-gocui/gocui v1.1.0 // indirect
	github.com/cespare/xxhash v1.1.0 // indirect
	github.com/docker/cli v20.10.17+incompatible // indirect
	github.com/docker/distribution v2.8.1+incompatible // indirect
	github.com/docker/docker v20.10.17+incompatible // indirect
	github.com/docker/go-connections v0.4.0 // indirect
	github.com/docker/go-units v0.4.0 // indirect
	github.com/fatih/color v1.13.0 // indirect
	github.com/gdamore/encoding v1.0.0 // indirect
	github.com/gdamore/tcell/v2 v2.5.2 // indirect
	github.com/gogo/protobuf v1.3.2 // indirect
	github.com/golang/protobuf v1.5.2 // indirect
	github.com/google/uuid v1.3.0 // indirect
	github.com/gorilla/mux v1.7.3 // indirect
	github.com/hashicorp/golang-lru v0.5.4 // indirect
	github.com/logrusorgru/aurora v2.0.3+incompatible // indirect
	github.com/lucasb-eyer/go-colorful v1.2.0 // indirect
	github.com/mattn/go-colorable v0.1.12 // indirect
	github.com/mattn/go-isatty v0.0.14 // indirect
	github.com/mattn/go-runewidth v0.0.13 // indirect
	github.com/opencontainers/go-digest v1.0.0 // indirect
	github.com/opencontainers/image-spec v1.0.3-0.20211202183452-c5a74bcca799 // indirect
	github.com/phayes/permbits v0.0.0-20190612203442-39d7c581d2ee // indirect
	github.com/pkg/errors v0.9.1 // indirect
	github.com/rivo/uniseg v0.3.1 // indirect
	github.com/sirupsen/logrus v1.9.0 // indirect
	github.com/tidwall/gjson v1.14.1 // indirect
	github.com/tidwall/match v1.1.1 // indirect
	github.com/tidwall/pretty v1.2.0 // indirect
	github.com/vicanso/intranet-ip v0.1.0 // indirect
	github.com/vicanso/keygrip v1.2.1 // indirect
	golang.org/x/term v0.0.0-20220722155259-a9ba230a4035 // indirect
	golang.org/x/text v0.3.7 // indirect
	google.golang.org/genproto v0.0.0-20220803205849-8f55acc8769f // indirect
	google.golang.org/grpc v1.48.0 // indirect
	google.golang.org/protobuf v1.28.1 // indirect
)
