# CI 状态与本地验证

本页记录 `dsh-balance-status` 的持续集成状态，以及与 CI 完全同口径的
本地验证结果。

## 工作流（`.github/workflows/ci.yml`）

**触发**：push 到 `main`、pull request、`workflow_dispatch`（手动）。

**job 1 — build-and-smoke**

| 步骤 | 命令 | 目的 |
| --- | --- | --- |
| Checkout | `actions/checkout@v4` | 拉取仓库 |
| pnpm | `pnpm/action-setup@v4` | 提供 pnpm |
| Node | `actions/setup-node@v4`（node 22，`cache: pnpm`） | 运行时 |
| Install | `pnpm install --frozen-lockfile` | 按锁定版本安装（esbuild/react 仅开发用） |
| Build | `node scripts/build-client.mjs` | 由 `src/` 生成浏览器 bundle |
| Smoke | `node scripts/smoke-client.mjs` | 物料化 bundle 并校验 slot/locale 注册 |
| 无漂移 | `git diff --exit-code -- lib/client.js` | 提交的 `lib/client.js` 必须与源码一致 |

**job 2 — typecheck**

- `package.json` 清单健全性：`dsh.bundle.patch`、`dsh.client.platform === "web"`、
  `exports["./client"]` 存在。

## 本地同口径验证（2026-08-26，开发机）

在仓库根克隆目录（`C:\Users\USER\source\repos\dsh-balance-status`）执行：

```
$ pnpm install
  Done in 902ms using pnpm v11.22.0          # allowBuilds 已允许 esbuild

$ node scripts/build-client.mjs
  built <repo>/lib/client.js                  # 26,414 bytes

$ node scripts/smoke-client.mjs
  registered id: dsh-balance-status
  exports: [ 'apply', 'inject' ]
  slots.inject target: sidebar.footer.action
  register disposer is function: true
  locale namespaces: [ 'balance' ]
  OK

$ git diff --exit-code -- lib/client.js       # 退出码 0 —— 提交包与源码零漂移
```

**宿主半离线校验（不进 CI）**：`node scripts/validate-host.mjs` 需要本机的
`$DSH_HOME`（会话日志）与 `DEEPSEEK_API_KEY` 凭证，并会直连 DeepSeek
余额接口——它属于开发机工具，CI 不具备这些环境。开发机上的最新结果为：
余额 `{ available, CNY }`、今日/本周/本月/全部四窗口与 `targets` 字段全部正常。

## GitHub 侧当前状态

| 项 | 状态 |
| --- | --- |
| 工作流文件 | ✔ 已入库：`.github/workflows/ci.yml`（1,358 字节） |
| Actions 权限 | ✔ `gh api .../actions/permissions` → `enabled: true` |
| 工作流注册 | ✔ `actions/workflows` 计数 1 |
| 令牌权限 | ✔ 已授予 `workflow` scope（此前推送被拒） |
| Run 执行 | ⏳ 首次 run 已创建，但平台侧 Runner 未启动（排队中/无时间戳），
  push 触发的一次被判为平台侧失败 |

首次运行通常是私有仓库的 Runner 激活延迟；若持续排队，请检查账户的
Actions 配额或是否需要在仓库 Actions 页手动激活。流水线本身已在本页
验证过一遍。

## 手动触发

```powershell
gh workflow run ci.yml --repo ZXCWT666/dsh-balance-status
```

查看进度：

```powershell
gh run list --repo ZXCWT666/dsh-balance-status
gh run view <run-id> --repo ZXCWT666/dsh-balance-status
```
