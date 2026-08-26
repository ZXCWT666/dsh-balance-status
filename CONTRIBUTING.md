# 贡献指南

感谢参与！这个仓库很小，规则也很少。

## 开发环境

```powershell
# 1) 仓库根安装构建依赖（esbuild + react，仅开发用）
pnpm install

# 2) 构建浏览器半
node scripts/build-client.mjs        # 或 pnpm build
```

- 构建输出 `lib/client.js` **提交入库**（与源码同步，CI 会校验无漂移）；
- `lib/index.js` 是宿主半，纯 ESM，不需要构建；
- 本机安装测试：`dsh plugin --profile web add <本仓库路径>`（重启 Harness 应用生效）。

## 本地校验

```powershell
node scripts/smoke-client.mjs    # 浏览器产物物料化冒烟（注册 slots/locale 是否正常）
node scripts/build-client.mjs    # 构建
node scripts/validate-host.mjs   # 宿主离线校验（读 $DSH_HOME，可选）
```

- `smoke-client.mjs` 用真实 react + 桩 primitives 执行 bundle，检查
  `apply()` 注册的目标 slot / locale 命名空间；
- `validate-host.mjs` 需要 `$DSH_HOME`（默认 `~/.dsh`）下的会话日志与
  `DEEPSEEK_API_KEY` 凭证，会在离线状态直连 DeepSeek 余额接口；
- 完整链路：`pnpm check`（build + smoke）。

## 文件导航

| 文件 | 作用 |
| --- | --- |
| `lib/index.js` | 宿主半：路由 + 余额获取 + 用量聚合 |
| `src/client.tsx` | 浏览器半：组件、Tooltip、玻璃 Modal、i18n 字典 |
| `src/styles.ts` | CSS 文本 + 类名映射（含主题成对玻璃样式） |
| `lib/types.d.ts` | 宿主/浏览器共享的接口类型 |
| `scripts/*.mjs` | 构建与校验脚本 |
| `docs/architecture.md` | 架构说明 |

## 提交规范

- **双语边界**：所有界面文案同时更新 `src/client.tsx` 里的 `zh` 与 `en` 字典；
  单位统一用 `tok`（与官方中文界面一致）；文档用中文；
- **构建产物**：改动 `src/*` 后必须重新构建并提交 `lib/client.js`；
- **版本**：功能/修复按 semver 递增 `package.json` 版本，并在
  `CHANGELOG.md` 追加条目；
- **打码**：界面的截图在上传前，把真实余额数字马赛克化（参考
  `docs/screenshot-*.png` 的做法）；
- Commit 信息用英文祈使句，正文说明动机与影响面。

## CI

`.github/workflows/ci.yml` 在 Push/PR 时执行：安装 → 构建 → 冒烟 → 校验
`lib/client.js` 与源码无漂移。宿主离线校验（需要本机目录与凭证）不入 CI。
