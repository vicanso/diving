FROM golang:1.11-alpine as builder

RUN apk update \
  && apk add docker git \
  && git clone --depth=1 https://github.com/vicanso/diving.git /diving \
  && cd /diving \
  && go build -tags netgo -o diving 

FROM ubuntu 

EXPOSE 7001

COPY --from=builder -L /usr/lib/libltdl.so* /usr/lib/
COPY --from=builder /usr/bin/docker /usr/bin/docker
COPY --from=builder /diving/diving /usr/local/bin/diving

CMD ["diving"]

HEALTHCHECK --interval=10s --timeout=3s \
  CMD diving --mode=check || exit 1