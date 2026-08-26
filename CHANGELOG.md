# 变更日志

本文件记录 `dsh-balance-status` 的每次版本变更。

## [1.0.2] — 2026-08-26

**功能**

- 能量条参考值改为可配置：宿主设置段 `balance-status`（`settings.yaml`
  用户层，热生效）→ 环境变量 `BALANCE_STATUS_BALANCE_TARGET` /
  `BALANCE_STATUS_DAILY_TOKENS` → 编译默认值，按序覆盖；
- 详情弹窗新增「缓存命中（本月）」与「推理 Token（本月）」两行
  （`cacheReadTokens` / `reasoningTokens` 已进入聚合与接口字段）；
- i18n 清零：相对时间（刚刚/X 分钟前/小时前）与冒号分隔符全部走字典，
  en 字典不再中英混排。

**内部**

- 宿主导出纯函数（`foldUsage` / `aggregateWindows` / `scanZstdFrames` /
  `resolveTargets` / 时间窗口），新增 `scripts/unit.mjs`（13 例，无网络
  无凭证，可入 CI）；`pnpm check` = build + smoke + unit；
- CI 改为 `workflow_dispatch` 手动触发（平台 Runner 激活前避免排队噪音）；
- `lib/types.d.ts` 与示例响应补充 cacheRead/reasoning 字段；
- package.json 升至 1.0.2，声明 `@deepseek-ai/schemastery` 运行时依赖。

## [1.0.1] — 2026-08-26

**功能**

- 详情弹窗改为**主题成对磨砂玻璃**面板：浅色＝白玻璃＋深色高反差字；
  深色＝纯玻璃（透明底 + `backdrop-filter`）＋近白字；
  用 `:has()` 把该弹窗背后的模态蒙版换成白色 32%（浅色主题下不再发黑）；
- 侧边栏收起模式改为两条迷你能量条（不再依赖 emoji 图标）；
- 界面单位统一为 `tok`（与官方中文统计条一致），去掉标题大写转换。

**修复**

- 修复详情弹窗「API 调用次数」与数值间距过大的问题（`line-height` 无单位）；
- 修复浅色主题下弹窗透出深色蒙版导致「整体发黑」；
- 余额获取改为 3 次重试（1.5s 间隔），并支持 `DEEPSEEK_BASE_URL` 环境变量
  覆盖（与官方适配器一致）。

**内部**

- 新增 `lib/types.d.ts` 共享类型、`pnpm build/smoke/validate/check` 脚本、
  `.github/workflows/ci.yml`、`docs/architecture.md`、`CONTRIBUTING.md`。

## [1.0.0] — 2026-08-25

**首发**

- 侧边栏脚部（设置按钮上方）两行状态 + 能量条：
  余额剩余量（绿色，¥100 参考）/ 今日消耗量（品牌色，500K/日参考）；
- 悬停原生 Tooltip（余额、今日/输入/输出 tok、配额百分比、最后同步）；
- 详情弹窗（今日/本周/本月、模型使用、API 调用次数、手动刷新/加载/错误态）；
- 宿主接口 `GET /balance-status/status`：余额走 DeepSeek 官方 API（复用
  Models 页凭证），用量从本地 zstd JSONL 会话日志聚合（按天分桶、增量重读）；
- 60s 快照缓存 + 60s 余额自动刷新 + 手动强制刷新（`?force=1`）。
