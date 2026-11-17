# 指挥官交接(菠萝子地图项目)

> 给接手「指挥官」角色的新会话(任何模型:Opus / Sonnet / Codex 都行)。上一任:Claude Opus 5.5,最后更新 2026-11-16。
> 本文件是活文档:每次交接前,由当时的指挥官更新 §3 现状与 §4 队列。
> 指挥官负责:和业主讨论 → 写 spec / 实施计划 → 起执行会话 → 核实报告 → 业主拍板后合并 push。
> 执行者(Sonnet 会话或 Codex)只按计划动手、只 commit 不 push。

## 1. 先读什么(按顺序)

| 顺序 | 文件 | 为什么 | 长度 |
|---|---|---|---|
| 1 | 记忆文件 `project_gourmet_guide.md`(Claude 自动记忆目录,索引在 `MEMORY.md`) | 全站历史、业主偏好、各模块状态的压缩版 | 1 屏 |
| 2 | `web/CLAUDE.md` | 数据格式、basePath 坑、地图管线、测试/构建命令、分支规则(Claude Code 自动加载,但要通读) | 13 KB |
| 3 | 本文件 | 当前状态与下一步 | |
| 4 | `web/docs/superpowers/specs/2026-11-13-pineapple-map-design.md` | 地图总策划案。至少读:决策表、§6 架构、§6.8 Takeout、§7/§7.1 资产规格与提示词、§8 阶段划分 | 长,按需 |
| 5 | `web/docs/superpowers/plans/2026-11-14-pineapple-map-phase4-takeout.md` | 只需读开头的状态行和 **Task 6**(成稿清单);其余 Task 已上线 | 只读 Task 6 |
| 6 | 其他记忆文件 `feedback_*.md` | 用中文对话;双语评论语气轻松简洁;首页最新优先 | 很短 |

其他阶段的计划(`plans/2026-11-1*-pineapple-map-phase0..3-*.md`)只在要改对应模块时再读。上一任会话的完整记录在
`~/.claude/projects/-Users-tantianshu-Documents-code-gourmet/1523efd4-9db6-4076-a3b8-403c1f0dd896.jsonl`,太大不要整读,需要时用会话记录搜索工具查关键词。

## 2. 工作方式(业主已认可,照做)

1. **写计划**用 superpowers 的 `writing-plans` 技能格式:每个 Task 列出精确文件路径、完整代码、精确命令与预期输出、提交步骤。执行者会**逐字照做**,计划里没写的它不会补,所以代码要写全、数字要自己核(测试数、图标数)。写完做 self-review:spec 覆盖、占位符扫描、前后 Task 的名字/签名一致。
2. **起执行会话**:`start_session`,`fresh`、model `sonnet`、`use_worktree: false`(共用 `web/` 检出)。简报模板见 §5。一次一个写代码的会话;它在 `feat/<阶段名>` 分支上工作,只 commit 不 push、不合并。
3. **核实报告**(不要只信报告):`npm run lint`、`npm run test`、`NEXT_PUBLIC_BASE_PATH=/gourmet npm run build` 三项自己重跑;`git log main..feat/x` + 读 diff;地图类改动用内置浏览器 `preview_start`(`.claude/launch.json` 里已配 `web-dev`)看 `http://localhost:3000/gourmet/map?city=melbourne` 并截图,用 `SendUserFile` 发给业主。
4. **合并与发布**只在业主明说「合并并 push」后:`git checkout main && git merge --no-ff feat/x && git push origin main`,push 后 `gh run watch` 确认 Deploy 跑绿,再 `curl` 线上文件确认。做完切回原分支,保持检出干净。
5. 业主偏好:中文对话;回复先给结论;截图比描述管用;美术资产由业主自己用 GPT Image 生成,放进收件箱;数字/尺寸类决定(贴图比例、图标大小)可以自己定但要截图给业主看。

## 3. 当前状态(2026-11-16)

**线上** `https://tianshuuu.github.io/gourmet/`:Phase 0–4 全部上线(最后一次功能合并 `38383f0`,2026-11-15),Deploy 绿。地图已有:4 张 riso 贴图、6 个墨尔本地标贴纸、7 枚 SVG 分类徽章、手绘小人;Takeout 导入脚本与全部地点详情页已在 main。

2026-11-16 用 **Suburbia Bakery**(业主自己的 Google 评论)试跑了 Takeout 成稿全流程,计划 `plans/2026-11-16-takeout-trial-suburbia.md`(5 个 Task)。试跑补上了四处只有 Takeout 条目才会碰到的缺口:首页卡片无照片时改用分类徽章占位(`CoverFallback` + `src/lib/cover.ts`);详情页正文按空行分段(`splitParagraphs`);地图卡片无封面时标题避让 × 按钮;`photos:import` 接受 webp。Takeout 导出里没有评论照片(`Reviews.json` 没有照片字段),业主会从 Google 地图评价页下载 webp。站上现有 7 家吃喝,**还没有任何景点**。

同日第二批(计划 `plans/2026-11-16-content-batch-2.md`,7 个 Task):新增第 4 个吃喝分类 **烘焙 / Bakeries**(`bakery`,可颂徽章 `#C2557A`,Suburbia 与 Soma Pastry 挪入);新增城市 **莫宁顿半岛**、**金泽**;成稿 Wasshoi、Tatin、Madame Sourdough、Crittenden Wines、金沢鮨 藍AO、Aunty Peg's。站上现有 13 家吃喝。原图库新增 `gourmet/bakery/`。

2026-11-17 第三批(计划 `plans/2026-11-16-kanazawa-batch.md`,4 个 Task):业主定 **景点 / 玩乐 / 购物 / 住宿只上地图**——`spots/` 四类不生成 `/<slug>` 图文页、不进首页,评论全文和其余照片直接显示在地图卡片里(`isSpotKind()` 在 `src/lib/map/kinds.ts`;`placesToGeoJSON` 只给景点带 `review_en/zh` 与 `gallery`)。首批景点(金泽):石川县立图书馆、Daiwa Roynet Hotel Kanazawa Miyabi、好日山荘 金沢エムザ店(业主要求只用文字)、mont-bell。KIRARI(金泽回转寿司)业主决定暂不上。景点照片放 `gourmet/spots/<slug>/imgs/`。

2026-11-17 地图筛选按钮改版(设计 `specs/2026-11-17-map-filter-chips-design.md`,计划 `plans/2026-11-17-map-filter-chips.md`,5 个 Task):分类按钮默认深灰、点了才选中(橙)、可多选、都不选 = 全部;城市按钮改成两级——「总览 + 圆形国旗 + 国名」,点国家镜头框住该国地点并出现第二排城市。国旗是代码画的 SVG(`FlagCircle.tsx`,现有 AU / JP;新国家没画时用 emoji 裁圆后备),新国家要在 `src/lib/map/countries.ts` 的 `COUNTRIES` 加中英名、每个城市在 `cities.json` 写 `country`。镜头留白按顶部按钮区的实测高度设(总览 top 180、国家 / 城市 top 210、总览与国家 bottom 100),为日本这种南北很长的国家留余量;按钮区布局改了要重量。

**分支**(`web/` 是 git 根目录):

| 分支 | 状态 | 说明 |
|---|---|---|
| `main` | 已 push | |
| `feat/map-phase4` | 已合并(`38383f0`) | Task 5 已跑:`npm run takeout:import` 导入 400 条 → `field-notes/takeout/INDEX.md` + `INDEX-vic.md`(gitignore);Task 6(按业主挑的批次成稿到 `src/data/spots/`)待做;Task 8 文案改动需业主批准 |
| `feat/map-phase1/2/3`、`feat/map-art-melbourne`、`feat/map-badges`、`feat/map-walker-art` | 已合并进 main | 可删;**检出当前停在 main** |

**美术收件箱** `/Users/tantianshu/Documents/code/gourmet/map/inbox/melbourne/`(不在 git 里):`pat-{grass,wood,water,sand}.png`、`lm-{flinders,arts-centre,mcg,exhibition,shrine,luna-park}.png`、`badge-*.png`(由 `npm run badges:render` 生成)、`_preview/`。淘汰的透明版贴图和早期 AI 味图鉴在 `map/inbox/_spare/melbourne/`。风格基准 = `lm-flinders.png`(扁平 riso 贴纸,奶油描边)。

**执行会话**:没有在跑的。Phase 4 的 Sonnet 会话 `local_75b2d697-d1b2-45ba-8658-45456c8d8a18`、Suburbia 试跑会话 `local_24b5b542-e5bb-4cc3-81c1-ae54abfa3b3d` 使命都已完成,可归档;成稿批次请按 §5 B 起新会话。

## 4. 下一步队列(按优先级)

1. **景点成稿(Phase 4 Task 6)——管线已用 Suburbia 试跑通,其余等业主拍板**。Takeout 已导入:文件 `map/takeout/Maps (your places)/Reviews.json`(新格式,400 条;`map/Takeout/` 是同一份重复拷贝,可删),索引 `web/field-notes/takeout/INDEX.md`(394 草稿 / 6 已收录 / 8 缺坐标)和墨尔本子集 `INDEX-vic.md`(74 条),都在 gitignore 目录里,**丢了就重跑**:

   ```bash
   npm run -s takeout:import -- "/Users/tantianshu/Documents/code/gourmet/map/takeout/Maps (your places)/Reviews.json"
   { sed -n '1,6p' field-notes/takeout/INDEX.md; grep '^| ' field-notes/takeout/INDEX.md | awk -F'|' 'NR>2 && $9 ~ /VIC/'; } > field-notes/takeout/INDEX-vic.md
   ```

   分布:日本 167、澳洲 83(VIC 73)、香港 45、泰国 43、印尼 13、越南 10、西班牙 6、乌兹别克 4、无国家码 29;正文 200 字以上 152 条。

   **前任提议的第一批(墨尔本 10 家)**:~~Suburbia Bakery by Seven Seeds~~(2026-11-16 试跑已成稿,slug `suburbia-bakery`);第二批(2026-11-16)业主改挑了 Wasshoi、Tatin、Madame Sourdough、Crittenden、金沢鮨 藍AO、Aunty Peg's 并已上线;原名单里还没做的 6 家:Riché Cafe(Richmond,咖啡)、Liquid Room Urban Sanctuary(Sandringham,玩乐/浴场,将是第一个景点类条目)、Co Thu Quan(Richmond,越南菜)、Leena's Bar(Elsternwick,酒吧)、Brunetti Classico(Carlton,咖啡)、Lune Croissanterie(Armadale,烘焙)。**先问业主要不要换人、加人,定了再开执行会话**(简报模板见 §5 B)。

   成稿规则全在 Phase 4 计划 Task 6:吃喝类放 `src/data/restaurants/`(food / cafe / bar),其余放 `src/data/spots/`(sight / activity / shop / stay);双语文案简洁轻快(feedback 记忆);不显示星级;照片业主放 `/Users/tantianshu/Documents/code/gourmet/spots/<slug>/imgs/` 后 `npm run photos:import -- <目录> <slug>`,没有照片就 `images: []`;城市边界外的点要加 `cities.json`(测试会报);一批统一提交、业主看过预览再合并。

   **试跑定下的做法(2026-11-16)**:
   - **`visited` 用真实到访日期**:业主有时隔几个月才写评论,这时会附注实际日期,以附注为准;没有附注就用草稿里的评论日期。绝不为了在首页靠前而改日期。执行者只看得到草稿,所以业主附注的日期要逐条写进简报。
   - **编辑决定由指挥官在计划里定死**:分类、slug、`map_url`、`visited`、类型标签。执行者只写 tagline 和双语正文,并按计划的事实清单自查。**正文必须忠实原文**:业主看过试跑稿后明确说「不用多加……之类的话语，按照我的原文翻译即可」(试跑稿自己加了「算是意外之喜 / Happy accident」,还把英文意译了)。指挥官要对照草稿逐句核:有没有多出来的话、有没有改写业主的原话。
   - `map_url`:保留 Takeout 的 ftid `!1s0x…:0x…`,`takeout:import` 靠它判重;路径里补上店名(`/maps/place/<Name+With+Pluses>/data=!4m2!3m1!1s0x…`)。写进计划前,先在浏览器里点开确认能到对的店。
   - 吃喝类的照片目录按分类放 `gourmet/{restaurant,cafe,bakery,winebar}/<名字>/imgs/`(`bakery/` 是 2026-11-16 随「烘焙」分类新建的);没有照片就 `images: []`,首页卡片会显示徽章占位。
   - 预览要看三处:首页卡片、手机上的详情页、`/map?city=…&place=<slug>` 的卡片。景点没有首页卡片和详情页,只看地图卡片(全文 + 照片、没有「查看图文」)。地图瓦片要等 10 秒左右才出来;开发服务器上直接打开景点的 `/<slug>` 会报 500(output: export 的开发模式行为),正式构建里不生成该页,线上是 404。
2. **小人手绘版**:已完成上线(`npm run walker:slice` + `map:assets`,见 CLAUDE.md Map 一节)。重画时同样流程。
3. **美术待拍板**:z14+ 市中心 3D 建筑棕色太抢戏(`scripts/build-map-style.mjs` 的 `building` / `building3d`);配色 A/B;地标与店名的碰撞优先级(现在店名永远优先)。
4. 其他城市(十和田、Mount Gambier)的地标与贴图铺开;「About Me」页(业主心愿);`gourmet/{restaurant,cafe,winebar}/` 里未发布的条目。
5. **以后可加(业主 2026-11-16 提出,暂缓,先丰富内容)**:菠萝子在地图上每累计走约 10 秒,弹一条该城市的冷门小知识(电视问答风,中英双语,每条要有出处);已评估过,对加载几乎无影响(100 条约 10 KB gzip,可懒加载),工作量主要在内容核实和交互(计时口径、与店铺卡片的冲突、手机端位置、频率与不重复)。

## 5. 执行会话简报模板

**A. 执行一份实施计划**

```
你在 /Users/tantianshu/Documents/code/gourmet/web(共用检出,不要新建 worktree)。
先完整读 CLAUDE.md,再读 docs/superpowers/plans/<计划>.md。
从 main 切出分支 feat/<名字>(已存在就直接 checkout),按计划逐个 Task 执行,每个 Task 一次 commit,提交信息用计划里的。
不 push、不合并 main、不改 .env*。本地 dev 需要 web/.env.local 含 NEXT_PUBLIC_BASE_PATH=/gourmet。
全部完成后跑 npm run lint && npm run test && NEXT_PUBLIC_BASE_PATH=/gourmet npm run build。
报告里写:分支名、每个 Task 状态、与计划的偏离及原因、测试数量、截图路径,最后一句「等你看过预览,再合并到 main 并 push」。
```

**B. 成稿一批景点(Phase 4 Task 6;把 <slug 列表> 换成业主定的)**

```
你在 /Users/tantianshu/Documents/code/gourmet/web(共用检出,不要新建 worktree)。
先完整读 CLAUDE.md(尤其「Adding a new place」「Importing Google reviews」「Style」),再读 docs/superpowers/plans/2026-11-14-pineapple-map-phase4-takeout.md 的 Task 6。
从 main 切出分支 feat/spots-batch-<N>。草稿在 field-notes/takeout/<slug>.md(gitignore,不要提交),按 Task 6 的 10 条清单逐个成稿:<slug 列表>。
吃喝类放 src/data/restaurants/,其余放 src/data/spots/;双语正文忠实于草稿的 ## takeout 原文:原文那种语言只修笔误和语法,另一种语言自然、口语化地翻译,不增不减(不要自己加俏皮话或总结句),不出现星级;照片目录不存在就 images: []。
每条都要有 coords;落在现有城市边界外的,按 Task 6 Step 3 加 cities.json。
visited 用业主附注的到访日期:<slug: YYYY-MM-DD 列表,没有附注的写「用草稿评论日期」>。分类 / slug / map_url / 类型标签按计划里定好的照抄。
一批做完统一一次 commit;不 push、不合并 main。跑 npm run lint && npm run test && NEXT_PUBLIC_BASE_PATH=/gourmet npm run build。
报告:每条的 slug / 分类 / 城市 / 双语 tagline,地图卡片与详情页截图路径,最后一句「等你看过文案和预览,再合并到 main 并 push」。
```

## 6. 前几阶段踩过的坑(CLAUDE.md 里没写全的那部分)

- 执行者会把计划里的假设当真:Phase 2 计划里 `fitBounds` padding、逐帧 `easeTo`、dwell 循环三处假设都错了,是执行者发现并修的。写计划时对 MapLibre 行为不确定的地方,要么先验证,要么在计划里标明"若 X 不成立则 Y"。
- 截图要等:MapLibre 符号布局(地标、标签)在镜头变化后要 2–4 秒才稳定,截早了会以为图标没渲染。
- 内置浏览器面板被业主隐藏时 MapLibre 不出帧,截图是空底色;用 `javascript_tool` 调 `map.triggerRepaint(); map._render(performance.now())` 强制一帧再截。地图实例可以从 `.maplibregl-map` 元素的 React fiber 里找到(上一任用过)。
- 自动权限模式下,Bash 命令带 `cd` 时偶尔被要求原样重发一次,照做即可。
- 面板隐藏 / 使用上限:Sonnet 会话曾因 5 小时用量上限中途死掉,重开一个干净会话即可,分支上的提交不会丢。
- 本地 dev 预览用 `preview_start` 的 `web-dev`(`.claude/launch.json`);页面是 `http://localhost:3000/gourmet/map?city=melbourne`。
- 本地 dev 地图停在 zoom 3、样式永远 `isStyleLoaded() === false`,而线上同一提交正常:是 Turbopack 的 `.next` 缓存脏了(2026-11-15 一次合并时 package.json 带着冲突标记被编译过一次之后就这样)。停掉 dev 服务器、`rm -rf .next`、再起,立即恢复。先怀疑缓存,再怀疑代码。
