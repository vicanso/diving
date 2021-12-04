// Copyright 2020 tree xie
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package schedule

import (
	"context"
	"time"

	"github.com/robfig/cron/v3"
	"github.com/vicanso/diving/log"
	"github.com/vicanso/diving/service"
)

func init() {
	c := cron.New()

	_, _ = c.AddFunc("@every 1h", removeExpiredImages)

	c.Start()
}

func removeExpiredImages() {
	// 镜像删除，如果程序刚好重启等有可能导致镜像未删除
	// 服务对应的实体机有硬盘空间监控，因此问题不太大
	err := service.RemoveExpiredImages()
	startedAt := time.Now()
	if err != nil {
		log.Error(context.Background()).
			Err(err).
			Msg("remove expired images fail")
		return
	}
	log.Info(context.Background()).
		Str("use", time.Since(startedAt).String()).
		Msg("remove expired images done")
}
