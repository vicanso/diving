package log

import (
	"context"
	"fmt"
	"net/url"
	"os"
	"regexp"
	"strconv"

	"github.com/rs/zerolog"
	"github.com/vicanso/diving/util"
	mask "github.com/vicanso/go-mask"
)

var enabledDebugLog = false
var defaultLogger = newLogger()

// 日志中值的最大长度
var logFieldValueMaxSize = 30
var logMask = mask.New(
	mask.RegExpOption(regexp.MustCompile(`(?i)password`)),
	mask.MaxLengthOption(logFieldValueMaxSize),
	mask.NotMaskRegExpOption(regexp.MustCompile(`stack`)),
)

type httpServerLogger struct{}

func (hsl *httpServerLogger) Write(p []byte) (int, error) {
	Info(context.Background()).
		Str("category", "httpServerLogger").
		Msg(string(p))
	return len(p), nil
}

type redisLogger struct{}

func (rl *redisLogger) Printf(ctx context.Context, format string, v ...interface{}) {
	Info(context.Background()).
		Str("category", "redisLogger").
		Msg(fmt.Sprintf(format, v...))
}

type entLogger struct{}

func (el *entLogger) Log(args ...interface{}) {
	Info(context.Background()).
		Msg(fmt.Sprint(args...))
}

// DebugEnabled 是否启用了debug日志
func DebugEnabled() bool {
	return enabledDebugLog
}

// newLogger 初始化logger
func newLogger() *zerolog.Logger {
	// 全局禁用sampling
	zerolog.DisableSampling(true)
	// 如果要节约日志空间，可以配置
	zerolog.TimestampFieldName = "t"
	zerolog.LevelFieldName = "l"
	zerolog.TimeFieldFormat = "2006-01-02T15:04:05.999Z07:00"

	l := zerolog.New(os.Stdout).
		Level(zerolog.InfoLevel).
		With().
		Timestamp().
		Logger()

	// 如果有配置指定日志级别，则以配置指定的输出
	logLevel := os.Getenv("LOG_LEVEL")
	if logLevel != "" {
		lv, _ := strconv.Atoi(logLevel)
		l = l.Level(zerolog.Level(lv))
		if logLevel != "" && lv <= 0 {
			enabledDebugLog = true
		}
	}

	return &l
}

func fillTraceInfos(ctx context.Context, e *zerolog.Event) *zerolog.Event {
	if ctx == nil {
		ctx = context.Background()
	}
	return e.Str("traceID", util.GetTraceID(ctx))
}

func Info(ctx context.Context) *zerolog.Event {
	return fillTraceInfos(ctx, defaultLogger.Info())
}

func Error(ctx context.Context) *zerolog.Event {
	return fillTraceInfos(ctx, defaultLogger.Error())
}

func Debug(ctx context.Context) *zerolog.Event {
	return fillTraceInfos(ctx, defaultLogger.Debug())
}

func Warn(ctx context.Context) *zerolog.Event {
	return fillTraceInfos(ctx, defaultLogger.Warn())
}

// URLValues create a url.Values log event
func URLValues(query url.Values) *zerolog.Event {
	if len(query) == 0 {
		return zerolog.Dict()
	}
	return zerolog.Dict().Fields(logMask.URLValues(query))
}

// Struct create a struct log event
func Struct(data interface{}) *zerolog.Event {
	if data == nil {
		return zerolog.Dict()
	}

	// 转换出错忽略
	m, _ := logMask.Struct(data)
	return zerolog.Dict().Fields(m)
}
