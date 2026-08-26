# dsh-balance-status

DeepSeek 账户余额状态组件 —— 属于 DeepSeek Harness 插件体系中的
**极简型插件（Minimal Plugin）**。

## 什么是「极简型」

| | 极简型（本插件） | 重量级插件 |
| --- | --- | --- |
| 入口 | 一个 slot（`sidebar.footer.action`） | 替换布局 / 面板 / 工作台 |
| 宿主侧 | 一个只读接口（`/balance-status/status`） | 服务、store、后台任务、配置树 |
| 设置 | 无设置页、无配置项 | 设置分区 / 配置面板 |
| 数据 | 复用现有凭证与本地会话日志，零新增存储 | 自带存储 / 持久化 |
| 卸载 | 删一行 bundle，无残留 | 需清理数据与配置 |

朴素地说：它**以小见大**——只占侧边栏底部两行字 + 两条能量条，不做任何
超出本职的事；装上即用，卸下即净，不打断任何既有交互。

```
DeepSeek 账户余额    ¥17.83      ████████░░  余额剩余
今日 Token 消耗      2.6M tok     ██████████  今日已用
```

## 功能

- **看**：余额剩余量 / 今日消耗量，两行扫完；
- **悬停**：余额、今日消耗、输入/输出 tok、配额百分比、最后同步；
- **点击**：磨砂玻璃详情窗——余额（总额/赠送/充值）、今日/本周/本月、
  模型使用、API 调用次数、手动刷新；
- **数据**：余额来自 DeepSeek 官方 API（复用 Models 页凭证，无 Key 配置）；
  消耗量直接聚合本地会话日志（zstd JSONL，按天分桶增量重读）；
- **刷新**：60s 自动 + 弹窗打开即同步 + 手动刷新；深/浅主题成对适配。

## 界面预览

| 侧边栏组件 | 详情弹窗（深色玻璃） | 悬停提示 |
| --- | --- | --- |
| ![侧边栏组件](docs/screenshot-sidebar.png) | ![详情弹窗](docs/screenshot-modal.png) | ![悬停提示](docs/screenshot-tooltip.png) |

## 目录

```
dsh-balance-status/
  package.json          profile bundle + dsh.client 声明
  cordis.patch.yml      插入组合行（id: balance-status）
  lib/index.js          宿主半（纯 ESM）：/balance-status/status
  lib/client.js         浏览器半（由 src/ 构建）
  src/                  组件与样式源码
  scripts/              构建 / 校验脚本
  docs/                 界面预览截图
```

## 安装

```powershell
dsh plugin --profile web add <本仓库路径>
```

修改 `src/` 后先 `node scripts/build-client.mjs` 重建，再重新安装；
profile 变更需重启 Harness 应用，仅 bundle 变更刷新页面即可。

## 接口

`GET http://127.0.0.1:3080/balance-status/status` → `{ ok, syncedAt, balance,
targets, usage, errors }`，详见 `lib/index.js` 头部注释。

## License

[MIT](LICENSE)
