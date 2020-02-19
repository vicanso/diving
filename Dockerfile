FROM node:10-alpine as webbuilder

RUN apk update \
  && apk add git \
  && git clone --depth=1 https://github.com/vicanso/diving.git /diving \
  && cd /diving/web \
  && npm i \
  && npm run build \
  && rm -rf node_module

FROM golang:1.13-alpine as builder

COPY --from=webbuilder /diving /diving

RUN apk update \
  && apk add git gcc make \
  && go get -u github.com/gobuffalo/packr/v2/packr2 \
  && cd /diving \
  && make build
FROM alpine 

EXPOSE 7001

COPY --from=builder /diving/diving /usr/local/bin/diving

CMD ["diving"]

HEALTHCHECK --interval=10s --timeout=3s \
  CMD diving --mode=check || exit 1