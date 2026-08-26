# dsh-balance-status

一个**极简的 DeepSeek 账户余额组件**。两行字、两条能量条，嵌在 DeepSeek
Harness Web 侧边栏底部、设置按钮正上方——看起来就是 Harness 自己的一部分，
没有卡片、没有边框、没有阴影、没有任何多余的东西。

```
DeepSeek 账户余额    ¥17.83      ████████░░  余额剩余
今日 Token 消耗      2.6M tok     ██████████  今日已用
```

## 它做了什么

- **看**: 余额剩余多少、今天花了多少 token，一眼扫过；
- **悬停**: 余额 / 今日消耗 / 输入与输出 tok / 配额百分比 / 最后同步，一行一个数；
- **点击**: 打开一个磨砂玻璃小窗——余额、今日/本周/本月、模型使用、API 调用次数、手动刷新；
- **其余**: 没有按钮组，没有设置页，没有多余的层级。数据 60 秒自动刷新，右下角落一个「刷新」。

## 为什么这么小

| 维度 | 做法 |
| --- | --- |
| 外观 | 复用侧边栏原生颜色与间距，零新增视觉层 |
| 数据 | 余额走 DeepSeek 官方 API（复用现有凭证）；消耗量直接聚合本地会话日志，不依赖第三方统计 |
| 实现 | 宿主侧一个纯 ESM 文件 + 浏览器侧一个 bundle，原生 slot 挂载 |

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
profile 变更需要重启 Harness 应用，仅 bundle 变更刷新页面即可。

## 接口

`GET http://127.0.0.1:3080/balance-status/status` → `{ ok, syncedAt, balance,
targets, usage, errors }`，详见 `lib/index.js` 头部注释。

## License

[MIT](LICENSE)
