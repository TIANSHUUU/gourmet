# gourmet 现场笔记(Field Notes)设计文档

日期:2026-08-14
状态:设计已与业主逐条确认,待写实施计划

把 travel-timeline 的「途中笔记」机制移植到 gourmet:在手机上现场记录酒评和餐厅点评,回到电脑由 Claude 读取笔记、改写翻译、配图,更新到正式网站。本文所有决策均已与业主确认。

## 1. 背景与目标

gourmet 现在只能在电脑上编辑 `wines.json` / `restaurants/*.md`。喝一支酒、吃一顿饭的当下,酒庄/年份/ABV/品种、店名/菜系/坐标、以及那一刻的真实感受,回家后很难完整复原。

本模块补上采集这一层:**现场 30 秒存一条带照片的结构化笔记,回电脑成稿时直接消费,一处都不用复制黏贴。**

目标:

1. 手机上现场低成本采集,照片当场压到网站成品规格;
2. 笔记的每个字段在成稿时都有归宿;
3. 笔记是私人素材,永不进入网站构建。

非目标:替代成稿。改写与翻译仍由 Claude 在对话中完成,笔记省掉的是「回忆事实」「查坐标」「配照片」这三件苦活。

## 2. 已确认的关键决策

| 决策点 | 结论 |
|---|---|
| 放哪里 | 放在 **gourmet 的 `web/` 仓库内**,新建 `web/notes-app/`。放一起才能复用成稿管线 |
| 采集形态 | **手机网页表单**(加主屏当 app),顶部 🍷酒 / 🍽️店 切换 |
| 部署形态 | **独立 Cloudflare Worker**,和主站分开部署。主站 Next.js 构建 / GitHub Pages 部署一个字不改 |
| 存储 | **Cloudflare R2 单桶 `gourmet-notes`**。业主已为 travel 绑卡并成功用过 R2,绑卡这道坎已过。一条笔记 = 一个 `note.json` |
| 鉴权 | Worker 自校验一个 32 字节随机 token,手机与命令行共用。token 走 URL fragment(`#t=`) |
| 数据流 | **单向**:手机 → R2 → `notes:pull` → 本地 `web/field-notes/`。拉下来后本地为唯一真相源,不回写手机 |
| 笔记类型 | 两种:`wine`(酒)/ `place`(餐厅·咖啡·酒吧) |
| 笔记粒度 | 一条笔记 = 一件事(一支酒 / 一家店),与最终 entry 一对一 |
| 语言 | 现场只写中文,英文翻译留到成稿 |
| 评分 | **不做评分字段**(业主决定,与现网站调性一致) |
| 分区键 | 用 `kind`(而非 travel 的 `trip`)分区:R2 键 `wine/<id>/…`、`place/<id>/…` |
| 清理 | 成稿上线后,**在手机 app 里逐条删**(travel 已有的删除功能)。`notes:pull` 永不删 R2。不做电脑端批量清理命令 |
| 隐私 | 途中不涉及真人化名问题;EXIF/GPS 在手机压缩时即剥离 |

## 3. 系统架构

```
手机网页 gourmet-notes.tianshu-tan.workers.dev
   │  token 校验(URL #t= 首次带入 → localStorage)
   ▼
独立 Worker ──────► R2 单桶 gourmet-notes(note.json + 压缩后照片)
                         │
                    npm run notes:pull(单向、幂等)
                         ▼
                web/field-notes/{wine,place}/
                         ▼
           Claude 读着更新 wines.json / restaurants/*.md
```

代码位置:`web/notes-app/`,独立 `wrangler.jsonc`,`npm run notes:deploy` 手动部署(变更频率低,不接 Git 自动部署)。

三条实现约束(沿用 travel):

- **不用打包器。** 手机页面是单个内联 CSS/JS 的 HTML,Worker 直接返回。
- **共用逻辑写成 `.mjs`。** Worker 与 pull 脚本共用的纯逻辑放 `web/notes-app/shared/note.mjs`,单一实现,vitest 直接测。
- **新增开发依赖:** `zod`(schema)、`yaml`(pull 写文件)、`wrangler` + `@cloudflare/workers-types`(部署与类型)。均只用于 notes-app / 脚本,不进网站运行时(网站仍是 Next 静态导出)。

**主站零改动是硬约束:** 笔记永不进 `web/src/`,不可能被 Next 构建进网站。

## 4. 数据模型

### 4.1 笔记(`note.json`)

```yaml
id: 2026-08-14T20-30-00Z-a7f3     # 生成时确定,永不变;改笔记靠它定位
kind: wine                         # wine | place
at: 2026-08-14T20:30:00+10:00      # 事情发生的时间,默认=打开表单时刻,可改
title: Muto Touriga Nacional 2022  # 唯一必填(酒名 / 店名)

# place: 仅 kind: place 时填(name / gmaps_url / coords,由店表单的 Google Maps 解析写入)

body: |                            # 可选,现场流水账中文
  黑胡椒草本，冰糖山楂酸甜，单宁很软

wine:                              # 仅 kind: wine;内部字段全可选
  winery: Muto Wines
  wine_type: red                   # red | white | rose | sparkling | null
  vintage: "2022"
  abv: "13.0%"                     # 存字符串,照抄酒标
  varieties: Touriga Nacional
  region: Riverland, SA
  price_aud: "24.00"
  pairing: 韩式烤肉
  flavours: [黑胡椒, 草本, 冰糖山楂]   # 风味关键词标签行

venue:                             # 仅 kind: place;内部字段全可选
  category: food                   # food | cafe | bar | null
  cuisine: 尼日利亚菜
  dishes: [苏亚烤牛肉, 炸大蕉]        # 招牌菜/关键词标签行

photos:                            # 可选
  - file: 2026-08-14-2030-01.jpg
    note: 酒瓶,配韩烧
  - file: 2026-08-14-2030-02.jpg
    note: ""

created_at: 2026-08-14T20:31:02Z
updated_at: 2026-08-14T20:38:11Z
```

**必填只有三个:`kind`、`at`、`title`。** 其余全部可空,包括 `body`。只拍张照配一句话也是合法笔记——门槛高一分,现场就少记一条。

Schema 约束(zod,`kind` 门控):`kind: wine` 时不允许 `venue` 块;`kind: place` 时不允许 `wine` 块(与 travel 里 `dive` 块的 refine 同理)。`abv`/`price_aud`/`vintage` 存字符串,避免手机数字输入带 `%`、小数的摩擦,也和 `wines.json` 里本就是字符串一致。`place` 块(`name` / `gmaps_url` / `coords: [lng,lat]|null`)只在 `kind: place` 时由店表单的 Google Maps 解析写入;酒不采集地点,产区只用 `wine.region` 文本。

`flavours` / `dishes` 做成可增删的标签行而非文本框:它们是成稿时最能写出东西的字段,值得结构化——酒的风味词直接映射成网站的 emoji+双语 flavour,店的招牌菜写进正文。

### 4.2 R2 布局

```
<kind>/<note-id>/note.json
<kind>/<note-id>/photos/<file>.jpg
```

不设数据库。列表 = R2 list 前缀;改字段 = 覆盖写 `note.json`。

### 4.3 本地布局与入库策略

```
web/field-notes/wine/
  notes/2026-08-14-2030-muto-touriga-nacional-2022.yaml
  photos/2026-08-14-2030-01.jpg
web/field-notes/place/
  notes/…  photos/…
```

- `field-notes/*/notes/*.yaml` → **提交进 git**。体积小,是真正值钱的结构化数据,也是第二份备份。
- `field-notes/*/photos/` → **gitignore**。R2 那份是备份;被选中用到网站上的照常复制进 `public/images/…` 并提交。

文件名规则(沿用 travel):

- 笔记 `<YYYY-MM-DD>-<HHmm>-<slug>.yaml`。slug 从 `title` 推(酒名/店名,必填故总有);**保留中日文**,只清文件系统不友好的字符。撞名补 `id` 随机后缀,再撞接 `-2`/`-3`,**绝不返回已占用的名字**(会静默覆盖真实笔记)。
- 时间戳按**字符串**从 `at` 里取,不经 `Date`(`at` 带当地时区偏移,用 `Date` 会变成运行机器时区,同一条笔记在不同电脑上拉出不同文件名)。
- 照片 `<YYYY-MM-DD>-<HHmm>-<NN>.jpg`,时刻取自所属笔记的 `at`,`NN` 笔记内递增;同分钟撞名补 `id` 后缀。

## 5. 手机端界面

单页,新建与编辑共用同一个表单(新建=空表单,编辑=回填)。

**顶部:** 返回列表 / 标题 / 保存 → **🍷酒 | 🍽️店 类型切换(决定表单字段与云端分区)** → 时间(自动带入,可改)→ 标题(必填)。

**🍷 酒表单:** 正文 → 酒庄 · 类型(红/白/桃红/气泡 选择器)· 年份 · ABV · 品种 · 产区 · 价格(AUD)· 配餐 · **风味关键词标签行** → 照片网格。

**🍽️ 店表单:** 正文 → 类别(美食/咖啡/酒吧 选择器)· 菜系 · **粘贴 Google Maps 链接**(→「解析」按钮取店名/坐标,或「当前位置」)· **招牌菜标签行** → 照片网格。

照片区:点「加照片」→ 相册多选 → 缩略图入网格 → 每张下面一个可选说明框。**文件名、笔记 id、时间戳全部自动,一张照片唯一要动手的就是那句说明。**

三条体验约束(沿用 travel):

- **压缩在手机上完成再上传。** `createImageBitmap(file, { imageOrientation: 'from-image' })` → canvas → 长边 1600px、JPEG q0.78,与网站成品规格一致;canvas 重编码天然剥离 EXIF/GPS。iOS 的 HEIC 走同一路径。
- **多张照片串行处理**,避免一次选十几张大图把手机浏览器内存打爆。
- **正在填的内容随时落 localStorage 草稿**,误关标签页/上传失败/断网回来内容还在。

酒的 ABV/年份等次要格默认可见但可留空;店的招牌菜折叠不折叠都行。目标是坐下 30 秒存一条。

## 6. Worker API

照搬 travel,`:trip` 换成 `:kind`(校验 `kind ∈ {wine, place}`):

| 方法 | 路径 | 用途 |
|---|---|---|
| GET | `/` | 返回手机页面 HTML(不鉴权) |
| GET | `/api/notes?kind=<wine\|place>` | 笔记列表摘要,新的在前 |
| GET | `/api/notes/:kind/:id` | 单条笔记 |
| PUT | `/api/notes/:kind/:id` | 新建或覆盖(幂等);body 的 kind/id 与路径不一致则 400 |
| DELETE | `/api/notes/:kind/:id` | 删除笔记及其全部照片(手机端清理用) |
| POST | `/api/notes/:kind/:id/photos?at=<笔记的 at>` | 上传一张(已压缩),返回生成的文件名 |
| DELETE | `/api/notes/:kind/:id/photos/:file` | 删一张 |
| POST | `/api/resolve-place` | 传 Google Maps URL,返回 `{ name, coords, resolved_url }` |
| GET | `/api/photos/:kind/:id/:file` | 取照片(缩略图 / pull 下载) |

实现要点全部保留(这些是 travel 用真实数据踩出来的):

- **列表靠 R2 `customMetadata`**(PUT 时写 `title`(截 120 字)/`at`/`kind`/`updated_at`/`photo_count`),列表一次 `list()` 拿全摘要,不为每条再 GET。
- **`list()` 必须走完游标**(`listAll`),否则静默少给对象。
- **照片序号取「已有文件名最大序号 + 1」**,不能用数量 + 1(删掉 `-01` 后 `count+1` 会撞上还在的 `-03`)。序号不复用,照片 GET 才敢设一年长缓存。
- **上传必须串行**(服务端先读序号再写,并发会算出同一序号静默覆盖);手机端 `addPhotos` 用 for-await。
- **上传上限 3MB**(压缩正常约 400KB,超了只可能是压缩失效,当场报错)。
- **`/api/resolve-place` 有域名白名单**,只放行 `google.com`/`goo.gl`/`google.co.jp` 及子域名(后缀精确匹配,不用 `includes`,防 `google.com.evil.net`),强制 https,8 秒超时——否则就是现成的 SSRF 出口。
- **路径段统一 `decodeURIComponent`**,否则中文/带空格的值 body 与路径对不上。
- **鉴权闸口支配所有路由**:`/` → 非 `/api/` 404 → `checkToken` → 路由。新增路由一律加在闸口之后。
- **`page.html` 客户端代码里绝不能出现任何第三方 API key**(`/` 无条件公开)。Google Maps 解析在服务端做且不需 key。

**Token 传递:** 首次 `GET /#t=<token>`,页面 JS 存 localStorage 后 `history.replaceState` 抹掉地址栏;之后所有 `/api/*` 带 `X-Notes-Token` 头。用 fragment 而非 `?t=`:fragment 不上送服务器,token 不进请求日志与 Referer。**等地址栏 `#t=` 消失再「添加到主屏幕」**,否则图标会存下带 token 的启动地址。

## 7. `npm run notes:pull`

```bash
npm run notes:pull          # 拉本地已有的全部 kind
npm run notes:pull wine     # 只拉酒
npm run notes:pull place    # 只拉店
```

照搬 travel,把「遍历 trip」换成「遍历 kind」,写进 `web/field-notes/<kind>/`:

- **幂等**:`updated_at` 未变的直接跳过。
- **不删 R2 上的任何东西。**
- 照片先写 `<file>.part` 再 `rename`,断网不留半截坏图。
- **撞名判定只看「别的笔记」占用的文件名**,否则一条笔记改标题重拉会把自己上次的照片当撞名,越拉越多重复。
- 本地孤儿照片(手机删了本地还留着)**只报告不删除**(可能是唯一副本)。
- token / URL 从 `web/.env` 读(`NOTES_URL`、`NOTES_TOKEN`)。

## 8. 成稿管线(Claude 做,笔记全程只读)

拉下来后我读 `field-notes/<kind>/notes/*.yaml`,和业主确认后改写成正式 entry,选中的照片复制进 `public/images/…` 重命名,再 `npm run build` 预览、业主确认、提交推送(GitHub Pages 自动部署)。

**🍷 wine 笔记 → `src/data/wines.json`:**

| 笔记 | → `wines.json` |
|---|---|
| `at`(日期部分) | `date` |
| `title` | `wine_name`(zh 润色 + en 翻译),并据此生成 `slug` |
| `wine.winery` | `winery` + `details.producer` |
| `wine.wine_type` | `wine_type` |
| `wine.vintage` / `abv` / `varieties` / `region` | `details.vintage` / `alcohol` / `varieties` / `region` |
| `wine.price_aud` | `price_aud` |
| `wine.flavours[]` | `flavours[]`(转 emoji + 双语标签) |
| `body` | `story`(改写 zh + 翻译 en) |
| `wine.pairing` | `pairing`(zh + en) |
| `photos[].file` / `.note` | `images[]`(复制进 `public/images/wines/<slug>/`)/ 备注 |

`tags`、`details.country`/`flag`、`details.notes`(产区介绍)、`details.map_url`(产区地图,按 `wine.region` 名称查得)、`color` 由我据内容补齐(现网站惯例)。酒不采集地点坐标。

**🍽️ place 笔记 → `src/data/restaurants/<slug>.md`:**

| 笔记 | → `restaurants/*.md` |
|---|---|
| `at`(年月) | `visited`(YYYY-MM) |
| `title` | `name`,并据此生成 `slug` |
| `venue.category` | `category`(food/cafe/bar) |
| `venue.cuisine` | `cuisine_zh` + `cuisine_en`(翻译) |
| `place.gmaps_url` | `map_url`(+ `map_type`:google;中国大陆用 amap) |
| `place.name` / `coords` | 推 `suburb` / `city` |
| `body` + `venue.dishes` | `## zh` 正文改写 + `## en` 翻译 |
| `photos[].file` | `images[]`(复制进 `public/images/<slug>/`) |

`tagline_en/zh` 由我据内容写(可选)。

**笔记全程只读,成稿不改动它。** 成稿后原始笔记仍在,日后想查「那次 ABV 到底多少」随时能翻。

## 9. 安全与隐私

- **鉴权**:32 字节随机 token,`wrangler secret put NOTES_TOKEN` 设置;所有 `/api/*` 定长比较校验(`checkToken`)。威胁模型是「有人随机撞到这个 URL」,随机 token 让这件事等于不可能。泄露时换 secret 重新部署即可。
- **EXIF/GPS 在手机压缩时即剥离**,与网站照片管线一致。
- **笔记永不进入 `web/src/`**,不可能被 Next 构建进网站;`field-notes/` 与 `.env`/`.dev.vars`/`.wrangler`/`field-notes/*/photos/` 全部 gitignore。
- `resolve-place` 域名白名单防 SSRF(见 §6)。
- 后续可选加固:Cloudflare Access 对 workers.dev 逐个 Worker 配置,不波及主站。

## 10. 测试

- **单元测试(vitest,gourmet 已装 v2.1.9)** 针对 `notes-app/shared/note.mjs` 纯逻辑:笔记 schema 校验(合法/缺必填/空串/坏坐标/`kind` 与块的门控/`photos[].file` 必填/`at` 非法日期)、Google Maps 链接解析坐标(`!3d/!4d`、`/maps/search/`、`?q=`、`@lat,lng`、路线链接返回 null、地名不被 JSON 碎片污染)、笔记/照片文件名生成与撞名避让、时间戳按字符串解析(换时区不变)、token 定长比较、pull 幂等判断。移植 travel 的用例并按新 schema 调整。
- **不给本模块加 e2e**:独立 Worker,不进主站测试套件。改为一份**手动冒烟清单**:手机真存一条带图的酒 + 一条店 → 编辑一次 → 删一张照片 → `notes:pull` → 检查落地文件与照片。
- **主站现有 `npm run test`、`npm run build`、GitHub Pages 部署完全不受影响**,这是硬约束。

## 11. 明确不做(YAGNI)

- **评分字段**——业主已定,不做。
- **离线优先 / Service Worker**——只做 localStorage 草稿。
- **双向同步**——pull 后不回写手机。
- **笔记自动生成 entry 的脚本**——改写要判断和文风,由 Claude 在对话中做。
- **电脑端批量清理 R2**——用手机 app 逐条删。
- **`trip`/合集分组、多用户、视频音频、笔记在网站上展示、笔记地图可视化。**

## 12. 与 travel 的复用关系

| 文件 | 移植方式 |
|---|---|
| `shared/note.mjs` | 纯逻辑(slugify/localStamp/photoFileName/photoLocalName/noteFileName/extractCoords/extractPlaceName/checkToken/isUpToDate)**照搬**;schema 改:去 `trip`、`kind` 改 `wine\|place`、`dive` 块换成 `wine`+`venue` 块;`noteFileName` 的 slug 源从 `place.name` 改成 `title` |
| `worker.ts` | **照搬**;`:trip`→`:kind`,校验 kind 白名单;R2 操作 / resolve-place / 鉴权闸口 / listAll / nextPhotoIndex 不变 |
| `page.html` | **主要新工作**:重建两种 kind 的表单与 gourmet 字段;复用压缩 / localStorage 草稿 / 串行上传 / token 机制 |
| `notes-pull.mjs` | **照搬**;遍历 kind 取代遍历 trip,写 `field-notes/<kind>/` |
| `wrangler.jsonc` | 新建:`name: gourmet-notes`,bucket `gourmet-notes` |
| `package.json` scripts | 加 `notes:dev` / `notes:deploy` / `notes:pull` |

## 13. 部署与业主一次性动作

1. 建 R2 桶:`npx wrangler r2 bucket create gourmet-notes`
2. 生成 token:`openssl rand -hex 32`
3. 设进 Worker:`npx wrangler secret put NOTES_TOKEN --config web/notes-app/wrangler.jsonc`,同串写进 `web/.env`(`NOTES_TOKEN=…`,并加 `NOTES_URL=https://gourmet-notes.tianshu-tan.workers.dev`)
4. `npm run notes:deploy`
5. 手机打开 `https://gourmet-notes.tianshu-tan.workers.dev/#t=<token>`,**等 `#t=` 从地址栏消失再加主屏**
6. 真机冒烟(照片压缩 / 相册多选 / 定位 / 断网存草稿这些模拟不了,需业主在手机上过一遍)

## 14. 风险与已知代价

| 风险 | 说明与应对 |
|---|---|
| R2 10GB 与 travel 共享 | 压缩照片约 400KB/张,一年数百 MB;10GB ≈ 2 万+ 张,余量两个数量级,不构成问题 |
| token 泄露 | 浏览器历史/截图可能带出 URL;影响面限于读写本人笔记,换 secret 重新部署即可 |
| 手机压缩大图卡顿 | 串行处理 + 进度提示;必要时限制单次张数 |
| 仓库草稿变多、commit 变碎 | 已接受;照片不入 git 已挡住主要体积 |
| 忘记 pull 就清空手机相册 | 不受影响:压缩后照片与笔记都在 R2 |

## 15. 后续文档

实施计划:`web/docs/superpowers/plans/2026-08-14-gourmet-field-notes.md`(待写)
