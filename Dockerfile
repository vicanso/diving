FROM golang:1.11.5 as builder

RUN git clone --depth=1 https://github.com/vicanso/diving.git /diving \
  && cd /diving \
  && go build -o diving 

FROM ubuntu 

EXPOSE 7001

RUN apt-get update \
  && apt-get install \
  apt-transport-https \
  ca-certificates \
  curl \
  gnupg-agent \
  software-properties-common -y \
  && curl -fsSL https://download.docker.com/linux/ubuntu/gpg | apt-key add - \
  && apt-key fingerprint 0EBFCD88 \
  && add-apt-repository \
   "deb [arch=amd64] https://download.docker.com/linux/ubuntu \
   $(lsb_release -cs) \
   stable" \
  && apt-get update \
  && apt-get install docker-ce-cli -y

COPY --from=builder /diving/diving /usr/local/bin/diving

CMD ["diving"]

HEALTHCHECK --interval=10s --timeout=3s \
  CMD diving --mode=check || exit 1