# ZCodium 个人 Harness 化简化

## 目标

将本仓库从“社区开源 ZCode 发行版”收敛为个人 harness：移除全部 z.ai / Z.AI / BigModel 官方平台集成与登录体系，删除非桌面端子系统和发布分发链路，尽可能减少维护面。

## 决策（2026-09-23 与用户确认）

1. **产品形态：仅桌面。** 删除 `packages/web`、`packages/server/src/remote/`（SSH/Docker/WSL 远程 workspace）、`harness/remote/`、relay 与手机远控恢复链路（`web-remote-replayable`）。`desktop-continuous` 桌面内链路保留。
2. **登录体系：彻底删除。** 不再有官方账号概念：删除 OAuth adapters（zai/bigmodel）、`LoginApiKeyForm`、WelcomeScreen 登录门禁、CLI login-flow。应用启动直接进入工作区；模型能力全部来自用户在设置里自配的 provider（API Key / 自定义 baseUrl）。
3. **发布链路：全部删除。** 删除 `.github/workflows/`、release-it 配置与钩子、代码签名物料、`scripts/zcode-distribution/`、SEA 上传、`docs/community/`。构建只保留本地命令（`dev:desktop`、`build` 等）。

## 保留边界

- 核心运行链：`packages/desktop`（main/host/renderer/scheduler）、`packages/services`、`packages/server`（stdio/host 入口）、`packages/client`、`packages/rpc`、`packages/shared`（协议与类型）、`packages/ui`、`packages/provider*`、`packages/model-option-map`、`apps/zcode-cli`。
- 用户自配 provider 的配置、模型 URL、密钥、代理与本地功能不受影响。
- 既有架构治理（`pnpm architecture:check`）、i18n 框架、主题与快捷键等本地能力保留。

## 分层删除顺序（低风险 → 高风险）

- **A 官方独立服务**：official-mcp、feedback、client-config/client-scenes、forceUpdate 与官方更新通道、conversation-share、conversation-telemetry、device(MID)、coding-plan-subscription、bigmodel 用量/额度、usage-stats 官方部分、UI 对应面板、Stripe 依赖。
- **B 市场与 CDN**：CLI official-marketplace、desktop remoteCdn、zcode-builtin 下载、mock-cdn、`config/provider/zcode-builtin.json` 内 Z.ai/BigModel 模板。
- **C 登录与 OAuth**：见决策 2；`ZAI_PROVIDER_ID`/`BIGMODEL_PROVIDER_ID` 及 model-provider-family 映射一并移除。
- **D 协议层**：`zcode-protocol` 中 `family: ["zai","bigmodel"]` 枚举、offPeak 载荷字段、`zcodeEndpoint.ts` 常量；重写 `services/src/node.ts` 组合根；同步 CLI contracts。协议改动提供严格类型与运行时校验。
- **E 整包删除**：见决策 1、3；同步收缩根 `package.json` scripts（typecheck 目标、dev/build 入口）与 `pnpm-workspace.yaml`。

## 前置事实

fork 已有 `packages/shared/src/officialPlatformPolicy.ts`（7 个官方开关默认关闭）与 `no-official-platform` / `no-telemetry` 回归测试，实现的是“逻辑断连”。本 spec 的目标是“物理删除”，删除完成后这些开关与其设置 UI（“Z.AI 服务”/“官方服务”区块）一并移除，回归测试改为断言相关标识符不再出现于源码。

## 验收

- 每层完成后执行 `pnpm typecheck`、`pnpm lint`、`pnpm architecture:check --changed` 并报告真实结果。
- 全仓 grep 不再命中：`z.ai`、`zai`、`bigmodel`、`zhipu`、`GLM`、`coding-plan`、`offPeak`、`official-marketplace`、`remoteCdn`（文档/THIRD-PARTY-NOTICES 中的来源声明除外）。
- `pnpm dev:desktop` 冷启动直接进入工作区，无登录页、无官方请求；桌面连续流与 Host/lease 语义不变。
