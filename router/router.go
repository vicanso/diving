package router

import (
	"github.com/vicanso/elton"
)

var (
	// groupList 路由组列表
	groupList = make([]*elton.Group, 0)
)

// NewGroup new router group
func NewGroup(path string, handlerList ...elton.Handler) *elton.Group {
	g := elton.NewGroup(path, handlerList...)
	groupList = append(groupList, g)
	return g
}

// NewAPIGroup new api router group
func NewAPIGroup(path string, handlerList ...elton.Handler) *elton.Group {
	return NewGroup("/api"+path, handlerList...)
}

// GetGroups get groups
func GetGroups() []*elton.Group {
	return groupList
}
