# 指挥官交接(菠萝子地图项目)

> 给接手「指挥官」角色的新会话(任何模型)。上一任:Claude Fable 5.1,交接于 2026-11-15。
> 指挥官负责:和业主讨论 → 写 spec / 实施计划 → 起执行会话 → 核实报告 → 业主拍板后合并 push。
> 执行者(Sonnet 会话或 Codex)只按计划动手、只 commit 不 push。

## 1. 先读什么(按顺序)

| 顺序 | 文件 | 为什么 | 长度 |
|---|---|---|---|
| 1 | 记忆文件 `project_gourmet_guide.md`(Claude 自动记忆目录,索引在 `MEMORY.md`) | 全站历史、业主偏好、各模块状态的压缩版 | 1 屏 |
| 2 | `web/CLAUDE.md` | 数据格式、basePath 坑、地图管线、测试/构建命令、分支规则(Claude Code 自动加载,但要通读) | 13 KB |
| 3 | 本文件 | 当前状态与下一步 | |
| 4 | `web/docs/superpowers/specs/2026-11-13-pineapple-map-design.md` | 地图总策划案。至少读:决策表、§6 架构、§6.8 Takeout、§7/§7.1 资产规格与提示词、§8 阶段划分 | 长,按需 |
| 5 | `web/docs/superpowers/plans/2026-11-14-pineapple-map-phase4-takeout.md` | 正在进行的阶段;Task 5–6 还没做 | 长 |
| 6 | 其他记忆文件 `feedback_*.md` | 用中文对话;双语评论语气轻松简洁;首页最新优先 | 很短 |

其他阶段的计划(`plans/2026-11-1*-pineapple-map-phase0..3-*.md`)只在要改对应模块时再读。上一任会话的完整记录在
`~/.claude/projects/-Users-tantianshu-Documents-code-gourmet/1523efd4-9db6-4076-a3b8-403c1f0dd896.jsonl`,太大不要整读,需要时用会话记录搜索工具查关键词。

## 2. 工作方式(业主已认可,照做)

1. **写计划**用 superpowers 的 `writing-plans` 技能格式:每个 Task 列出精确文件路径、完整代码、精确命令与预期输出、提交步骤。执行者会**逐字照做**,计划里没写的它不会补,所以代码要写全、数字要自己核(测试数、图标数)。写完做 self-review:spec 覆盖、占位符扫描、前后 Task 的名字/签名一致。
2. **起执行会话**:`start_session`,`fresh`、model `sonnet`、`use_worktree: false`(共用 `web/` 检出)。简报模板见 §5。一次一个写代码的会话;它在 `feat/<阶段名>` 分支上工作,只 commit 不 push、不合并。
3. **核实报告**(不要只信报告):`npm run lint`、`npm run test`、`NEXT_PUBLIC_BASE_PATH=/gourmet npm run build` 三项自己重跑;`git log main..feat/x` + 读 diff;地图类改动用内置浏览器 `preview_start`(`.claude/launch.json` 里已配 `web-dev`)看 `http://localhost:3000/gourmet/map?city=melbourne` 并截图,用 `SendUserFile` 发给业主。
4. **合并与发布**只在业主明说「合并并 push」后:`git checkout main && git merge --no-ff feat/x && git push origin main`,push 后 `gh run watch` 确认 Deploy 跑绿,再 `curl` 线上文件确认。做完切回原分支,保持检出干净。
5. 业主偏好:中文对话;回复先给结论;截图比描述管用;美术资产由业主自己用 GPT Image 生成,放进收件箱;数字/尺寸类决定(贴图比例、图标大小)可以自己定但要截图给业主看。

## 3. 当前状态(2026-11-15)

**线上** `https://tianshuuu.github.io/gourmet/`,main = `c429f76`,Deploy 绿。地图已有:4 张 riso 贴图、6 个墨尔本地标贴纸、7 枚 SVG 分类徽章;小人仍是像素版。

**分支**(`web/` 是 git 根目录):

| 分支 | 状态 | 说明 |
|---|---|---|
| `main` | 已 push | |
| `feat/map-phase4` | 5 个提交未合并,**检出当前停在这里** | Task 1–4、7 已完成(Takeout 解析 + 导入脚本 + 照片导入 + 全部地点详情页 + 文档);Task 5–6 等业主的 `Reviews.json`;Task 8 文案改动需业主批准。合并时 `package.json` scripts 在 `map:assets` 后两边各加了一行,会有一处一行冲突 |
| `feat/map-phase1/2/3`、`feat/map-art-melbourne`、`feat/map-badges` | 已合并进 main | 可删 |

**美术收件箱** `/Users/tantianshu/Documents/code/gourmet/map/inbox/melbourne/`(不在 git 里):`pat-{grass,wood,water,sand}.png`、`lm-{flinders,arts-centre,mcg,exhibition,shrine,luna-park}.png`、`badge-*.png`(由 `npm run badges:render` 生成)、`_preview/`。淘汰的透明版贴图和早期 AI 味图鉴在 `map/inbox/_spare/melbourne/`。风格基准 = `lm-flinders.png`(扁平 riso 贴纸,奶油描边)。

**执行会话**:Phase 4 的 Sonnet 会话 id `local_75b2d697-d1b2-45ba-8658-45456c8d8a18`(空闲,等 Takeout)。可以 `SendMessage` 续用,也可以起新会话。

## 4. 下一步队列(按优先级)

1. **Takeout**:业主在 Takeout 列表里找不到「Maps (your places)」(官方文档仍说评论在这个产品下;原因未查明)。等业主截图「Maps」的完整选项列表再判断;退路是用内置浏览器登录 Google Maps「你的贡献 → 评价」抓取后转成导入脚本认的格式。文件到位后放 `/Users/tantianshu/Documents/code/gourmet/map/takeout/Reviews.json` → 合并 Phase 4 → 跑 `npm run takeout:import` → 把 `field-notes/takeout/INDEX.md` 交业主挑 → 执行者成稿到 `src/data/spots/`。
2. **小人手绘版**:业主会出一张横向四连格 `pp-sheet.png`(idle / walk-a / walk-b / cheer,同比例同基线)。指挥官用 sharp 按等宽切成四张**同高**的 `pp-{idle,walk-a,walk-b,cheer}.png` 放进收件箱(保持同高才能比例一致),`npm run map:assets` 会自动拼雪碧图,地图上显示约 45×56 px,截图给业主看。
3. **美术待拍板**:z14+ 市中心 3D 建筑棕色太抢戏(`scripts/build-map-style.mjs` 的 `building` / `building3d`);配色 A/B;地标与店名的碰撞优先级(现在店名永远优先)。
4. 其他城市(十和田、Mount Gambier)的地标与贴图铺开;「About Me」页(业主心愿);`gourmet/{restaurant,cafe,winebar}/` 里未发布的条目。

## 5. 执行会话简报模板

```
你在 /Users/tantianshu/Documents/code/gourmet/web(共用检出,不要新建 worktree)。
先完整读 CLAUDE.md,再读 docs/superpowers/plans/<计划>.md。
从 main 切出分支 feat/<名字>(已存在就直接 checkout),按计划逐个 Task 执行,每个 Task 一次 commit,提交信息用计划里的。
不 push、不合并 main、不改 .env*。本地 dev 需要 web/.env.local 含 NEXT_PUBLIC_BASE_PATH=/gourmet。
全部完成后跑 npm run lint && npm run test && NEXT_PUBLIC_BASE_PATH=/gourmet npm run build。
报告里写:分支名、每个 Task 状态、与计划的偏离及原因、测试数量、截图路径,最后一句「等你看过预览,再合并到 main 并 push」。
```

## 6. 前几阶段踩过的坑(CLAUDE.md 里没写全的那部分)

- 执行者会把计划里的假设当真:Phase 2 计划里 `fitBounds` padding、逐帧 `easeTo`、dwell 循环三处假设都错了,是执行者发现并修的。写计划时对 MapLibre 行为不确定的地方,要么先验证,要么在计划里标明"若 X 不成立则 Y"。
- 截图要等:MapLibre 符号布局(地标、标签)在镜头变化后要 2–4 秒才稳定,截早了会以为图标没渲染。
- 内置浏览器面板被业主隐藏时 MapLibre 不出帧,截图是空底色;用 `javascript_tool` 调 `map.triggerRepaint(); map._render(performance.now())` 强制一帧再截。地图实例可以从 `.maplibregl-map` 元素的 React fiber 里找到(上一任用过)。
- 自动权限模式下,Bash 命令带 `cd` 时偶尔被要求原样重发一次,照做即可。
- 面板隐藏 / 使用上限:Sonnet 会话曾因 5 小时用量上限中途死掉,重开一个干净会话即可,分支上的提交不会丢。
