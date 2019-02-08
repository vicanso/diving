package service

import (
	"os"
)

const (
	// ENV go env
	ENV = "GO_ENV"
	// DEV dev env
	DEV = "dev"
)

// IsDev is dev mode
func IsDev() bool {
	return os.Getenv(ENV) == DEV
}
