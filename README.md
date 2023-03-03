
# This repo is archived, please use  [diving-rs](https://github.com/vicanso/diving-rs) instead of it. It is fast and simple, develop with Rust.

# diving

Using diving you can analyze docker image on the website. It use [dive](https://github.com/wagoodman/dive) to get the analyzed information.


The first time may be slow, because it pulls the image first.

![Image](.data/demo.gif)


## Installation

```
docker run -d --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -p 7001:7001 \
  vicanso/diving
```
