export GO111MODULE = on

.PHONY: default test test-cover dev build

# for dev
dev:
	air -c .air.toml

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
	go build -tags netgo -o diving

release:
	go mod tidy
