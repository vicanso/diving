FROM node:12-alpine as webbuilder

ADD ./ /diving

RUN cd /diving/web \
  && npm i \
  && npm run build \
  && rm -rf node_module

FROM golang:1.14-alpine as builder

COPY --from=webbuilder /diving /diving

RUN apk update \
  && apk add git gcc make \
  && go get -u github.com/gobuffalo/packr/v2/packr2 \
  && cd /diving \
  && make build

FROM alpine 

RUN addgroup -g 1000 go \
	&& adduser -u 1000 -G go -s /bin/sh -D g

USER go
WORKDIR /home/go

EXPOSE 7001

COPY --from=builder /diving/diving /usr/local/bin/diving
COPY --from=builder /diving/entrypoint ~/entrypoint.sh

CMD ["diving"]

ENTRYPOINT ["~/entrypoint.sh"]

HEALTHCHECK --interval=10s --timeout=3s \
  CMD diving --mode=check || exit 1