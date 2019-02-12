.PHONY: default test test-cover dev

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
		&& npm run build \
		&& cd .. \
		&& packr -z

bench:
	go test -bench=. ./...

build:
	go build -o diving 