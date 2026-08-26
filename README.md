# dsh-balance-status

DeepSeek 账户余额状态组件 —— **DeepSeek Harness Web（dsh web）** 的原生 profile
插件。它注册为侧边栏脚部的状态小组件，外观与行为都像内置功能：无卡片背景、
无边框、无阴影、不新增视觉层级。

## 界面预览

| 侧边栏组件 | 详情弹窗（深色玻璃） | 悬停提示 |
| --- | --- | --- |
| ![侧边栏组件](docs/screenshot-sidebar.png) | ![详情弹窗](docs/screenshot-modal.png) | ![悬停提示](docs/screenshot-tooltip.png) |

## 功能特性

```
DeepSeek 账户余额                      ¥46.93
[██████░░░░]  ← 余额剩余量条
今日 Token 消耗                     274.5K
[████████░░]  ← 今日消耗量条
```

- **侧边栏小组件**（设置按钮正上方）：两行状态 + 能量条——余额行表示**剩余量**
  （相对 `BALANCE_DISPLAY_TARGET`，默认 ¥100 参考，绿色），Token 行表示
  **今日已消耗量**（相对 `DAILY_TOKEN_TARGET`，默认 500K/日参考，品牌色）。
  两个常量都在 `lib/index.js` 顶部。侧边栏收起时显示两条迷你能量条（不依赖
  表情符号图标）。
- **悬停提示**（原生轻量 Tooltip）：账户余额 / 今日消耗 / 输入 tok / 输出 tok /
  余额剩余与今日配额百分比 / 最后同步。
- **详情弹窗**（原生 primitives Modal）：账户余额（总额 / 赠送 / 充值）、
  今日 / 本周 / 本月 Token 用量与调用次数、本月按模型拆分用量、API 调用次数、
  手动刷新、加载 / 失败状态；弹窗为**主题成对的磨砂玻璃面板**（白色外观：
  白玻璃 + 深色高反差字；深色外观：纯玻璃 + 近白字）。
- **数据来源**：余额走 DeepSeek `user/balance` API，复用 Models 页管理的凭证
  （`llm-deepseek.apiKeyEnv`，默认 `DEEPSEEK_API_KEY`，经凭据服务逐次解析；
  `baseURL` 跟随 `llm-deepseek` 设置或 `DEEPSEEK_BASE_URL`，3 次重试 +
  15s 超时）。Token 消耗从 `$DSH_HOME/sessions` 的 zstd JSONL 会话日志聚合
  （按本地天分桶，仅重读变更日志；今日 / 本周 / 本月一次扫描应答）。
- **刷新策略**：宿主 60s 快照缓存 + 余额 60s 自动重取；组件挂载与每 60s 轮询、
  弹窗打开即再同步、支持手动强制刷新（`?force=1`）。

## 目录结构

```
dsh-balance-status/
  package.json        profile bundle + dsh.client 声明
  cordis.patch.yml    插入组合行（id: balance-status）
  lib/index.js        宿主半（纯 ESM，无需构建）：/balance-status/status
  lib/client.js       浏览器半（由 src/ 构建，__ModuleLoader__ 格式）
  src/client.tsx      组件 / 弹窗源码
  src/styles.ts       类名映射 + 插件 CSS（含主题成对玻璃样式）
  scripts/build-client.mjs   esbuild 构建脚本（生成 lib/client.js）
  scripts/validate-host.mjs  宿主半离线校验脚本
  scripts/smoke-client.mjs   浏览器产物物料化冒烟测试
  docs/               界面预览截图
```

## 安装 / 重新构建

```powershell
# 一次性安装进 profile（自动同步 dsh.profile.bundles）
dsh plugin --profile web add <本仓库路径>

# 修改 src/* 后：重建 lib/client.js，再刷新安装副本
node scripts/build-client.mjs
dsh plugin --profile web add <本仓库路径>   # 或 pnpm install --force
```

组合 / bundle 集变更在服务启动时解析，因此改动 profile 后需要重启 `dsh web`
（重启 Harness 应用）。仅客户端 bundle 内容变化时刷新页面即可（no-cache 提供）。

## 接口

`GET http://127.0.0.1:3080/balance-status/status` → JSON：

```json
{
  "ok": true,
  "syncedAt": 1787668701995,
  "balance": { "available": true, "currency": "CNY", "total": 46.93,
               "granted": 0, "toppedUp": 46.93 },
  "balanceError": null,
  "targets": { "balance": 100, "dailyTokens": 500000 },
  "usage": {
    "today": { "input": 179159, "output": 95344, "calls": 136, "models": { } },
    "week":  { ... },
    "month": { ... },
    "all":   { ... }
  },
  "errors": []
}
```

## 备注

- 唯一一处壳体 CSS 覆盖（`footerActions` 改为纵向排列）用于让整宽状态块排在
  其他脚部操作（如 Cordis 徽标）之前、紧贴设置按钮上方；该选择器绑定本构建的
  侧边栏模块类名。
- 用量窗口锚定在宿主本地时区（GUI 与宿主同机）。
- 深浅主题均已适配（详见 `src/styles.ts` 的 theme-paired 规则）。

## License

[MIT](LICENSE)
