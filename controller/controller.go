package controller

import (
	"github.com/vicanso/elton"
	"github.com/vicanso/hes"
)

var (
	errQueryNotAllow = hes.New("query is not allowed")
)

// noQuery not allow any query string
func noQuery(c *elton.Context) (err error) {
	if c.Request.URL.RawQuery != "" {
		err = errQueryNotAllow
		return
	}
	return c.Next()
}
