FROM node:14-alpine as webbuilder

ADD ./ /diving

RUN cd /diving/web \
  && npm i \
  && npm run build \
  && rm -rf node_module

FROM golang:1.16-alpine as builder

COPY --from=webbuilder /diving /diving

RUN apk update \
  && apk add docker git gcc make \
  && rm -rf asset/dist \
  && cp -rf web/build asset/dist \
  && cd /diving \
  && make build

FROM alpine 

EXPOSE 7001

COPY --from=builder /usr/bin/docker /usr/bin/docker
COPY --from=builder /diving/diving /usr/local/bin/diving
COPY --from=builder /diving/entrypoint.sh /entrypoint.sh

CMD ["diving"]

ENTRYPOINT ["/entrypoint.sh"]

HEALTHCHECK --interval=10s --timeout=3s \
  CMD diving --mode=check || exit 1