export GO111MODULE = on

.PHONY: default test test-cover dev build

# for dev
dev:
	export GO_ENV=dev && fresh

# for test
test:
	go test -race -cover ./...

test-cover:
	go test -race -coverprofile=test.out ./... && go tool cover --html=test.out

build-web:
	cd web \
		&& npm run build

list-mod:
	go list -m -u all

bench:
	go test -bench=. ./...

build:
	packr2
	go build -tags netgo -o diving

clean:
	packr2 clean

release:
	go mod tidy
