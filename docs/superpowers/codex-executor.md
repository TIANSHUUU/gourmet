# 用 Codex 执行实施计划(Claude 额度用完时的备用执行者)

> 适用对象:业主本人。背景:本仓库的实施计划(`docs/superpowers/plans/*.md`)是写给"零上下文执行者"的,
> 文件路径、代码、命令、预期输出、提交点全在计划里,所以 ChatGPT Plus 自带的 Codex 也能照做。
> 规格书与计划仍由 Claude 会话撰写、报告仍由 Claude 会话核实,只是"动手的那一步"换人。

## 1. 安装与登录(一次性)

```bash
npm i -g @openai/codex
```

然后在 `web/` 目录下运行 `codex`,选「Sign in with ChatGPT」用 Plus 账号登录;或者直接用 ChatGPT 桌面端里的 Codex,把项目文件夹选成 `web/`。

额度:按每 5 小时窗口的消息数估算,另有周上限,和 ChatGPT 聊天共用一个池子。计划把代码都写好了、执行偏机械,**先用便宜的模型跑**,卡住再换强的。官方额度页:<https://developers.openai.com/codex/pricing>。

## 2. 它读什么、不读什么

- Codex 只读 `AGENTS.md`(从 git 根目录往下逐级合并,单文件上限 32 KiB),**不读 `CLAUDE.md`**。本仓库的 `web/AGENTS.md` 已写明"先完整读同目录的 `CLAUDE.md` 并遵守",所以不用再复制一份。
- 计划开头那行 `REQUIRED SUB-SKILL: superpowers:executing-plans` 是 Claude Code 的技能名,Codex 没有;`AGENTS.md` 已让它忽略,开工提示词里再提一句更稳。

## 3. 沙箱与审批(建议配置)

默认 `workspace-write` 沙箱:能改工作区文件,但**断网**、且 `.git` 只读。我们的流程里有两处会撞上:

| 会撞上的操作 | 原因 | 处理 |
|---|---|---|
| `npm run maps` / `npm run map:assets` | 要从 tiles.openfreemap.org 拉样式 | 开网络(下面的配置),或逐次批准 |
| `npm install`(计划新增依赖时) | 要联网 | 同上 |
| 每个 Task 的 `git commit` | 写 `.git` | 每次弹确认点同意即可;嫌烦就自己在另一个终端 commit |

`~/.codex/config.toml` 建议片段(没有就新建):

```toml
approval_policy = "on-request"
sandbox_mode = "workspace-write"

[sandbox_workspace_write]
network_access = true
```

禁止 push 没有专用开关;断网时本来就推不出去,开了网络就靠 `AGENTS.md` + 开工提示词里的明文禁止。想再加一道硬保险可以用(官方标为实验性的)规则文件 `~/.codex/rules/default.rules`:

```
prefix_rule(pattern=["git", "push"], decision="forbidden", justification="push 由业主在 Claude 会话核实后手动执行")
```

## 4. 开工提示词(复制即用,替换方括号)

```
先完整读 web/CLAUDE.md,再读 web/docs/superpowers/specs/2026-11-13-pineapple-map-design.md 里与本阶段相关的章节。
然后按 web/docs/superpowers/plans/[计划文件].md 逐个 Task 执行:按步骤做,跑它写的命令并核对预期输出,每做完一个 Task 就 git commit 一次,提交信息用计划里给的。
只在分支 [feat/xxx] 上工作(不存在就从 main 切出);绝不 push、绝不合并到 main、绝不改 .env*。计划开头提到的 superpowers 技能忽略。
全部完成后跑 npm run lint && npm run test && NEXT_PUBLIC_BASE_PATH=/gourmet npm run build,三项都要通过。
最后给一份报告:每个 Task 的状态、与计划的偏离及原因、测试数量、截图路径(截图放 /tmp/,不要提交)。
```

工作目录选 `web/`(它是 git 根目录,`AGENTS.md` 和 `CLAUDE.md` 都在这里)。

## 5. 之后怎么核实

把 Codex 的报告原文(或路径)发给 Claude 会话,核实步骤和核 Sonnet 执行一样:重跑 `lint` / `test` / 带 basePath 的 `build`,读 diff,看截图,再决定是否合并 push。核实不依赖执行者是谁。

## 6. 和 Sonnet 会话执行的差异

- 没有 superpowers 技能;TDD 的节奏靠计划里"先写失败测试 → 跑 → 实现 → 跑 → 提交"的步骤本身保证。
- Codex 的子代理、skills、MCP 都有,但没有"读 markdown 计划逐步执行"的内置功能,全靠第 4 节的提示词。
- 本地 dev 预览同样需要 `web/.env.local` 含 `NEXT_PUBLIC_BASE_PATH=/gourmet`(见 `CLAUDE.md`)。
