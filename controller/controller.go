package controller

import (
	"context"
	"time"

	"github.com/vicanso/elton"
	"github.com/vicanso/elton/middleware"
	"github.com/vicanso/hes"
	lruttl "github.com/vicanso/lru-ttl"
)

var (
	errQueryNotAllow = hes.New("query is not allowed")
)

type cacheStore struct {
	lru *lruttl.Cache
}

func (c *cacheStore) Get(ctx context.Context, key string) ([]byte, error) {
	value, ok := c.lru.Get(key)
	if !ok {
		return nil, nil
	}
	buf, _ := value.([]byte)
	return buf, nil
}

func (c *cacheStore) Set(ctx context.Context, key string, data []byte, ttl time.Duration) error {
	c.lru.Add(key, data, ttl)
	return nil
}

var httpCache = middleware.NewCache(middleware.CacheConfig{
	Store: &cacheStore{
		lru: lruttl.New(100, 5*time.Minute),
	},
})

// noQuery not allow any query string
func noQuery(c *elton.Context) (err error) {
	if c.Request.URL.RawQuery != "" {
		err = errQueryNotAllow
		return
	}
	return c.Next()
}
