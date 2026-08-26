# dsh-balance-status

[![版本](https://img.shields.io/badge/version-1.0.1-4a90d9)][![许可](https://img.shields.io/badge/license-MIT-green)][![类型](https://img.shields.io/badge/plugin-minimal-blueviolet)][![CI](https://img.shields.io/badge/CI-ready-lightgrey)]

DeepSeek 账户余额状态组件 —— 属于 DeepSeek Harness 插件体系中的
**极简型插件（Minimal Plugin）**：一个 slot 入口、一个只读接口、零配置。

```
DeepSeek 账户余额    ¥17.83      ████████░░  余额剩余
今日 Token 消耗      2.6M tok     ██████████  今日已用
```

## 什么是「极简型」

| | 极简型（本插件） | 重量级插件 |
| --- | --- | --- |
| 入口 | 一个 slot（`sidebar.footer.action`） | 替换布局 / 面板 / 工作台 |
| 宿主侧 | 一个只读接口（`/balance-status/status`） | 服务、store、后台任务、配置树 |
| 设置 | 无设置页、无配置项 | 设置分区 / 配置面板 |
| 数据 | 复用现有凭证与本地会话日志，零新增存储 | 自带存储 / 持久化 |
| 卸载 | 删一行 bundle，无残留 | 需清理数据与配置 |

装上即用，卸下即净，不打断任何既有交互。

## 功能

- **看**：余额剩余量 / 今日消耗量，两行扫完（能量条：绿=剩余，品牌色=已用）；
- **悬停**：余额、今日消耗、输入/输出 tok、配额百分比、最后同步；
- **点击**：磨砂玻璃详情窗——余额（总额/赠送/充值）、今日/本周/本月、
  模型使用、API 调用次数、手动刷新；深/浅主题成对适配；
- **数据**：余额来自 DeepSeek 官方 API（复用 Models 页凭证，无需新 Key）；
  消耗量聚合本地会话日志（zstd JSONL，按天分桶增量重读）；
- **刷新**：60s 自动 + 弹窗打开即同步 + 手动刷新（`?force=1`）。

## 界面预览

| 侧边栏组件 | 详情弹窗（深色玻璃） | 悬停提示 |
| --- | --- | --- |
| ![侧边栏组件](docs/screenshot-sidebar.png) | ![详情弹窗](docs/screenshot-modal.png) | ![悬停提示](docs/screenshot-tooltip.png) |

## 入门

```powershell
# 克隆后安装进 web profile（自动同步 dsh.profile.bundles）
dsh plugin --profile web add <本仓库路径>     # 重启 Harness 应用后生效
```

装完后侧边栏底部、设置按钮上方即出现组件；模型与凭证沿用 Models 页配置，
**无需任何插件级设置**。

快速验证：

```powershell
# 手动强制刷新一次（旁路 60s 缓存）
curl "http://127.0.0.1:3080/balance-status/status?force=1"
```

示例响应见 [`examples/status-response.json`](examples/status-response.json)，
组合补丁见 [`examples/profile-patch.yml`](examples/profile-patch.yml)。

## 开发

```powershell
pnpm install          # 构建依赖（esbuild + react，仅开发用）
pnpm check            # build + smoke 冒烟
pnpm validate         # 宿主离线校验（可选，读 $DSH_HOME + 真实凭证）
```

- 修改 `src/*` 后：`pnpm build` → 重新安装 → 刷新页面（bundle 变更无需重启）；
- 修改 profile/composition 需要重启 Harness 应用；
- 接口类型见 `lib/types.d.ts`；架构细节见 [`docs/architecture.md`](docs/architecture.md)；
  提交规范见 [`CONTRIBUTING.md`](CONTRIBUTING.md)；版本记录见
  [`CHANGELOG.md`](CHANGELOG.md)。

## 目录

```
dsh-balance-status/
  package.json          profile bundle + dsh.client 声明 + 开发脚本
  cordis.patch.yml      插入组合行（id: balance-status）
  lib/index.js          宿主半（纯 ESM）：/balance-status/status
  lib/client.js         浏览器半（由 src/ 构建，提交入库）
  lib/types.d.ts        共享接口类型
  src/                  组件与样式源码（TSX + 主题成对 CSS）
  scripts/              构建 / 冒烟 / 校验脚本
  examples/             组合补丁与接口响应示例
  docs/                 架构文档 + 界面预览截图
  .github/workflows/    CI 工作流（本地就绪；提交到 GitHub 前需 `gh auth refresh -s workflow`）
```

## 接口

`GET http://127.0.0.1:3080/balance-status/status` → `{ ok, syncedAt, balance,
balanceError, targets, usage, errors }`；`?force=1` 旁路缓存。字段说明与
窗口语义见 [`docs/architecture.md`](docs/architecture.md)。

## 常见问题

**CI 工作流怎么没生效？**
仓库已内置 .github/workflows/ci.yml（安装 → 构建 → 冒烟 → bundle 无漂移
校验）。当前 GitHub 令牌缺少 workflow 权限无法推送该文件；执行
gh auth refresh -s workflow 授权后即可随下次提交一并入库。

**显示「未配置密钥」？**
在 设置 → Models 中填入 DeepSeek API Key（写入 `$DSH_HOME/.credentials.yaml`，
或导出 `DEEPSEEK_API_KEY` 环境变量）。组件复用与模型相同的凭证源。

**能量条的比例怎么改？**
`lib/index.js` 顶部 `BALANCE_DISPLAY_TARGET`（余额参考，默认 ¥100）与
`DAILY_TOKEN_TARGET`（每日参考，默认 500K）。改后重启 Harness 应用。

**「今日」按什么时区？**
宿主本地时区（GUI 与宿主同机）；今日从本地 00:00 起算。

**会消耗 token 吗？**
不会。唯一的外部调用是 DeepSeek 余额接口（不计 token）；用量统计只是
读本地会话日志。没有后台任务轮询。

**卸载干净吗？**
干净。`dsh plugin --profile web remove dsh-balance-status`（或删补丁行）+
重启，即完全移除；组件只读不写，无数据残留。

## License

[MIT](LICENSE)
