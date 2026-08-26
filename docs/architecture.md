# 架构说明

一个极简插件的两个半身：**宿主半**负责数据，**浏览器半**负责呈现，中间只隔
一个本地 JSON 接口。

## 整体数据流

```
┌─────────────────────────── dsh web 进程 ───────────────────────────┐
│                                                                   │
│  browser half (lib/client.js)                 host half (lib/index.js)
│  ┌──────────────────────────┐                ┌────────────────────┐│
│  │ sidebar.footer.action    │  GET /balance-  │ fetchBalance()     ││
│  │  → BalanceStatus 组件     │──/status───────→│  · credentials     ││
│  │  · 两行 + 能量条           │◄─JSON──────────│    .resolve(ref)   ││
│  │  · Tooltip               │                │  · GET user/balance││
│  │  · 玻璃详情窗 Modal       │                │  · 3 retries/15s   ││
│  │  · 60s 轮询 + 手动刷新     │                ├────────────────────┤│
│  └──────────────────────────┘                │ collectUsage()     ││
│                                              │  · persistence.list││
│                                              │  · readRaw(id)     ││
│                                              │  · 按天分桶 fold     ││
│                                              │  · 窗口聚合 today/  ││
│                                              │    week/month/all   ││
│                                              └────────────────────┘│
└───────────────────────────────────────────────────────────────────┘
```

## 宿主半（`lib/index.js`，纯 ESM，无构建）

- **挂载方式**：`cordis.patch.yml` 在 profile 组合中插入一行
  `{ id: balance-status, name: dsh-balance-status }`；插件 `inject: ["webServer"]`
  并向 `ctx.webServer.register({ kind: "prefix", path: "/balance-status" })`
  注册路由。仅 `127.0.0.1` 可访问（与应用同信任边界），不暴露任何密钥。
- **余额**：`fetchBalance(ctx)` 与官方适配器同源——
  1. 读取 `llm-deepseek` 设置段（`apiKeyEnv` / `baseURL`）或回退默认值
     （`DEEPSEEK_API_KEY` / `https://api.deepseek.com` + `DEEPSEEK_BASE_URL`）；
  2. 通过 `credentials.resolve(ref)` 逐次解析密钥（永不落盘、永不进日志）；
  3. `GET {baseURL}/user/balance`，3 次尝试 × 15s 超时，401/403 标记为
     `UNAUTHORIZED`，缺少密钥标记为 `MISSING_CREDENTIAL`。
- **用量**：`collectUsage()` 遍历 `sessionPersistence` 的全量会话元数据，
  对每个会话：
  - `stat` 文件，`mtime < 本月起点` 的直接跳过（窗口外不可能有值）；
  - 命中缓存（mtime+size 未变）直接复用按天分桶结果，否则 `readRaw(id)`
    读出 zstd JSONL 原文并折叠；
  - 折叠规则：`assistant/message` 且 `source.kind === "model"` 的事件，
    取其 `usage`（inputTokens/outputTokens）按**本地日**入桶，并同时
    维护每个模型的 input/output/calls 细分；
  - 窗口回答 = 对分桶做区间求和（today/week/month/all），一次扫描应答，
    窗口滚动无需重读日志。
- **显示参考值（可配置）**：能量条参考值按 宿主设置段 `balance-status`（settings.yaml
  用户层）→ 环境变量 `BALANCE_STATUS_BALANCE_TARGET` / `BALANCE_STATUS_DAILY_TOKENS`
  → 编译默认值（¥100 / 500K）顺序解析；设置段改动后下一个快照即生效，无需重启。
- **缓存与并发**：快照 60s TTL + 单飞行（single-flight）合并并发请求；
  余额单独 60s TTL，失败时保留上一次成功值并记录 `balanceError`。
  手动刷新 `?force=1` 旁路缓存。

## 浏览器半（`src/client.tsx` → `lib/client.js`）

- **打包**：`scripts/build-client.mjs` 用 esbuild 将 TSX 编译为
  Harness 客户端插件格式（`window.__ModuleLoader__.load({ id, factory })`），
  externals 只依赖壳层种子字：`react`、`react/jsx-runtime`、
  `@deepseek-ai/dsh-client-ui-primitives`（Tooltip/Modal/Button/图标）。
- **挂载**：`dsh.client: { platform: "web", inject: [...] }` 声明后，
  服务端 client-modules 把它扫描进 `window.__DSH_BOOT__`，浏览器侧按
  `ctx.slots.inject("sidebar.footer.action", …)` 注册一条脚部动作——
  即设置按钮正上方那两行。
- **主题**：`src/styles.ts` 中的 CSS 为**主题成对**（`body[data-ds-dark-theme]`）：
  - 浅色：白磨砂玻璃 + 深色高反差字（`#f6f8fb` 以上之类仅深色用）；
  - 深色：纯玻璃（`background: transparent` + `backdrop-filter`）+ 近白字；
  - 唯一的壳层覆盖：让脚部操作列纵向堆叠（`.hHd-Xa_footerActions`），
    以保证整宽状态块能排在 Cordis 徽标之前并紧贴设置按钮。
- **提示与详情**：悬停 Tooltip 用 `primitives.Tooltip` 的 label 函数形式
  （`\n` 多行）；详情窗用 `primitives.Modal`（mask+title+close+footer），
  打开时重新拉取一次数据。

## 可靠性边界

- 余额接口失败：保留最后值 + 非阻塞 `balanceError`，界面给出"未配置密钥 /
  获取失败"文案，副作用仅此；
- 日志读取失败：该会话折叠结果置空，其它会话不受影响（`errors[]` 收集）；
- 会话日志在写入中截断：读取走持久层的稳定读（torn 帧语义），统计以
  已提交前缀为准；
- 卸载：删除 profile bundle 并重启即完全移除，无数据残留（只读，无写入）。

## 设计取舍

| 取舍 | 原因 |
| --- | --- |
| 用本地会话日志而非云端统计 | 数据不出本机；无额外 API 依赖；窗口模型贴近"今日/本周/本月" |
| 按天分桶而非每次全量重算 | 窗口滚动（跨日/跨周/跨月）只需求和，无需重读历史日志 |
| 复用 credentials/settings 服务 | 与官方适配器同一密钥源，改动一次全局生效 |
| 主题成对 CSS 而非自定义主题 | 不注册 theme override，不污染全局 token |
| 单接口 JSON 而非 Remote RPC | 不参与 API 网关描述符生成，零桥接维护成本 |
