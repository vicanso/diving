package log

import (
	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
)

var (
	defaultLogger *zap.Logger
)

func init() {
	c := zap.NewProductionConfig()
	c.EncoderConfig.EncodeTime = zapcore.ISO8601TimeEncoder
	// 只针对panic 以上的日志增加stack trace
	l, err := c.Build(zap.AddStacktrace(zap.DPanicLevel))
	if err != nil {
		panic(err)
	}
	defaultLogger = l
}

// Default get default logger
func Default() *zap.Logger {
	return defaultLogger
}
