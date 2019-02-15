FROM golang:1.11.1-alpine as builder

RUN apk update \
  && apk add docker git \
  && git clone --depth=1 https://github.com/vicanso/diving.git /diving \
  && cd /diving \
  && go build -tags netgo -o diving 

FROM alpine 

EXPOSE 7001

COPY --from=builder /usr/lib/libltdl.so.7.3.1 /usr/lib/
COPY --from=builder /usr/bin/docker /usr/bin/docker
COPY --from=builder /diving/diving /usr/local/bin/diving

RUN ln -s /usr/lib/libltdl.so.7.3.1 /usr/lib/libltdl.so.7 \
  && ln -s /usr/lib/libltdl.so.7.3.1 /usr/lib/libltdl.so

CMD ["diving"]

HEALTHCHECK --interval=10s --timeout=3s \
  CMD diving --mode=check || exit 1