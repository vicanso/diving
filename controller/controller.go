package controller

import (
	"github.com/vicanso/cod"
	"github.com/vicanso/diving/log"
	"github.com/vicanso/hes"
)

var (
	logger           = log.Default()
	errQueryNotAllow = hes.New("query is not allowed")
)

// noQuery not allow any query string
func noQuery(c *cod.Context) (err error) {
	if c.Request.URL.RawQuery != "" {
		err = errQueryNotAllow
		return
	}
	return c.Next()
}
