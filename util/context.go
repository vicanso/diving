package util

import (
	"context"
)

type contextKey string

const (
	traceIDKey contextKey = "traceID"
)

func getStringFromContext(ctx context.Context, key contextKey) string {
	v := ctx.Value(key)
	if v == nil {
		return ""
	}
	s, _ := v.(string)
	return s
}

// SetTraceID sets trace id to context
func SetTraceID(ctx context.Context, traceID string) context.Context {
	return context.WithValue(ctx, traceIDKey, traceID)
}

// GetTraceID gets trace id from context
func GetTraceID(ctx context.Context) string {
	return getStringFromContext(ctx, traceIDKey)
}
