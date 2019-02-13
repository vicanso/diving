# diving

Using diving you can analyze docker image on the website. It use [dive](https://github.com/wagoodman/dive) to get the analyze information.


The first time may be slow, because it should pull the image first.

![Image](.data/demo.gif)


## Installation

```
docker -d --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -p 7001:7001 \
  vicanso/diving
```
