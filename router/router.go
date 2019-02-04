package router

import (
	"github.com/vicanso/cod"
)

var (
	// groupList 路由组列表
	groupList = make([]*cod.Group, 0)
)

// NewGroup new router group
func NewGroup(path string, handlerList ...cod.Handler) *cod.Group {
	g := cod.NewGroup(path, handlerList...)
	groupList = append(groupList, g)
	return g
}

// NewAPIGroup new api router group
func NewAPIGroup(path string, handlerList ...cod.Handler) *cod.Group {
	return NewGroup("/api"+path, handlerList...)
}

// GetGroups get groups
func GetGroups() []*cod.Group {
	return groupList
}
