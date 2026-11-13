# 菠萝子地图(Pineapple Map)总策划案

日期:2026-11-13
状态:总策划案(设计 + 分阶段路线图),待业主审阅。审阅通过后,按阶段各出一份实施计划(`docs/superpowers/plans/`,writing-plans 格式),交执行模型逐任务实施。

> 一句话:把「菠萝子美食指南」里的店铺、以及将来补进来的景点/玩乐内容,放到一张**手绘俯视画风、但地理位置真实**的互动地图上;菠萝子小人可以走到任何一个地点,到达后弹出这家店的图文卡片和 Google 地图入口。

---

## 1. 背景与目标

**现状**

- gourmet 站(Next.js 静态导出 → GitHub Pages,`https://tianshuuu.github.io/gourmet/`):6 家店 + 酒评,内容是 `web/src/data/restaurants/*.md`,每条有 `map_url` 但**没有坐标字段**。
- 大量非吃喝的内容(景点、体验、玩乐)只存在于业主的 Google 评论里,还没有搬上网站。
- travel-timeline(Astro + MapLibre GL,像素风,Cloudflare Workers)只覆盖和伴侣的共同旅行,但已经做出了「复古配色真实地图 + 菠萝头沿路线行走」的全套机制,可以移植。
- 灵感:X 上一个日本温泉地图 app 的截图(`/Users/tantianshu/Documents/code/gourmet/map/visual-ref.jpeg`)。

**目标**

1. 一张地图看全所有去过并推荐的地方(吃喝 + 玩乐),按城市切换。
2. 有游戏感:俯视手绘画风;菠萝子小人能走到目的地,到达即弹卡片。
3. 内容零重复维护:地图直接读现有 markdown 数据,只需补一个 `coords` 字段。
4. 把 Google 评论里的存量内容低成本搬进来(半自动导入 → 人工润色)。
5. 全部跑在免费额度内,不引入服务器。

**非目标(v1 明确不做)**

- 用户登录、收藏、评论;实时营业信息;步行导航/路线规划(小人走路是演出,不是导航)。
- 中国大陆高德底图(高德链接照旧只做外链跳转)。
- 背景音乐。

---

## 2. 参考图拆解:我们要的「画风」到底是什么

| 维度 | 参考图里的做法 | 我们的复刻手段 |
|---|---|---|
| 视角 | 约 60° 斜俯视(鸟瞰),不是正上方 | MapLibre `pitch` 45–60°,街道级开启 3D 建筑挤出 |
| 地表 | 暖黄绿草地底色 | 底色与 landcover 图层配色(§6.4 调色板) |
| 植被 | 成簇的圆形树冠(深绿/浅绿/粉樱),成片铺在空地 | `fill-pattern` 用无缝「树丛」贴图铺在 wood/park/grass 多边形上 |
| 道路 | 米色小路、深一号的描边 | transportation 线图层双色(fill + casing) |
| 水体 | 青蓝河流、白色波纹 | water 填色 + 波纹 `fill-pattern`;waterway 线 |
| 建筑 | 灰褐瓦顶、米色墙的日式房子,成片 | `building-3d` 挤出层(OSM 真实轮廓)暖灰配色;远景用平面 footprint |
| 标注 | 白色圆角标签 + 底部小三角指针;重点上方浮一个圆形图标徽章(饭碗/酒坛/鸟居) | symbol 图层 + 可拉伸(9-slice)标签底图 + 分类徽章图标 |
| UI | 深灰蓝半透明搜索条、右下圆形悬浮按钮、底部深色行动条,珊瑚橙点缀 | 深色 UI 外壳 + 品牌橙 `#F0742A` |

**关键认识**:参考图是一整张 AI 插画,不是真实地理。它的魅力来自三样东西——**配色、成簇的小元素(树、房子)、斜视角**。这三样在真实地图引擎上能复刻到七成;剩下三成靠「点状美术」(城市地标小插画、店面小插画)补足。追求 100% 像参考图,就只能放弃真实地理(见 §3 方案 B 的代价)。

---

## 3. 方案比较

| | A. 真实地图 + 手绘皮肤 | B. 每城一张 AI 插画大图 | **C. A 为引擎 + 点状插画(推荐)** |
|---|---|---|---|
| 做法 | MapLibre + OpenFreeMap 矢量瓦片 + 自定义「手绘」样式 | 让图像模型画一张城市俯视插画,做成可缩放大图(Leaflet CRS.Simple),钉子按像素坐标手摆 | A 的全部 + 每城 3–8 个地标小插画 + 每店一张店面小插画(可选) + 小镇可叠加整张插画(可选) |
| 像参考图程度 | 6–7 成 | 10 成 | 8–9 成 |
| 地理真实 | 真实 | 示意(路网、距离都是画的) | 真实 |
| 新增一家店 | 加一行坐标即出现 | 店在画幅外就要重画;画幅内也要手工对位 | 加一行坐标即出现;店面插画可选 |
| 多城市一致性 | 自动一致 | 每城风格漂移,难控 | 自动一致,点状插画按同一套「画风圣经」生成 |
| 墨尔本这种多区城市 | 自动可缩放 | 一张图放不下 20 多个区,要么太小要么太空 | 同 A |
| 美术工作量 | 一套无缝贴图(5–8 张) | 每城 1 张大图(但要反复返工) | 贴图 + 每城几个地标 + 可选店面 |
| 风险 | 瓦片服务依赖(可换) | 画幅/对位/返工 | 同 A |

**推荐 C**。理由:地理真实是「朋友拿着它真的能找过去」的底线;点状插画把参考图最打动人的「小房子小树」感觉补回来,而且是增量的——没有也能上线,有了就更好。B 方案保留一个用法:对十和田这种只有一两家店的小镇,可以把一张 AI 插画按经纬度四角叠加到真实地图上(MapLibre `image` source),钉子仍是真实坐标(§8 Phase 4 可选实验)。

---

## 4. 决策表

决策 #1、#6、#7 已于 2026-11-13 由业主确认(Mary's 的坐标链接也已补齐);其余按推荐值定下来并据此写方案。**任何一条不同意,改表即可,方案对应段落跟着改**。

| # | 决策点 | 结论(默认) | 备选 | 影响范围 |
|---|---|---|---|---|
| 1 | 放哪里 | **gourmet 站内新增 `/map` 路由**(业主已确认),同仓库、同部署 | — | 全局;站内能直接读 markdown 数据,免去同步 |
| 2 | 地图引擎 | **MapLibre GL JS 5 + OpenFreeMap 矢量瓦片**(免费、无 key、travel-timeline 已验证) | MapTiler 免费档 / Protomaps 自托管 | §6 |
| 3 | 画风路线 | **方案 C** | A 或 B | §2–3、§7 |
| 4 | 小人形象 | **Phase 2 先复用 travel-timeline 的像素菠萝头**(直接可用,走路动画现成);Phase 3 再换手绘版 | 一开始就等手绘版 | §6.6、§7 |
| 5 | 弹窗里的「Google 地图信息」 | **v1 = 自己的图文卡片 + 「在 Google 地图打开」按钮**;Google Maps Embed(iframe,免费但要申请 API key)作 Phase 3 可选开关 | 一开始就嵌 iframe | §6.7 |
| 6 | 美术资产谁产出 | **Phase 1–2 用程序生成的占位图案**(纯色 + 简单纹理),保证流程先跑通;**Phase 3 以墨尔本为试点**(业主已确认):业主用图像模型按 §7.1 的资产包与提示词生成,执行模型只负责接入;试点效果满意后再铺开到其他城市,期间其他城市继续占位 | 执行模型自己画(效果不可控,不推荐) | §7.1、§8 |
| 7 | 非吃喝内容放哪 | 同站,新建 `src/data/spots/` 目录(与 `restaurants/` 同一套 frontmatter);**站名改为「菠萝子指南」(业主已确认,Phase 0 执行)**;首页版式暂不改,地图先全量展示 | 单独站点 | §6.3、§8 Phase 0 |
| 8 | 评分 | **不展示星级**(沿用 2026-08 现场笔记的决定);Takeout 导入时星级保留在草稿里仅供参考 | 展示 | §6.8 |
| 9 | 小人走路路径 | Phase 2 直线(含镜头跟随);Phase 3 可选接 Valhalla 公共步行路由沿街走,失败回退直线 | 一直直线 | §6.6 |
| 10 | 地标 | 每城 3–8 个「一眼认得的」地标,业主列清单,其余全部由 OSM 数据自动出 | 不做地标 | §5.3、§6.3 |
| 11 | 音效 | v1 不做 | 移植 travel 的 `sfx.ts` | — |
| 12 | 坐标顺序 | `[lng, lat]`(经度在前,与 travel-timeline、MapLibre 一致) | — | 全部数据与代码 |

---

## 5. 产品形态

### 5.1 页面与入口

```
/map                       地图页(全部城市总览 → 选城市)
/map?city=melbourne        直接落到某城市
/map?city=melbourne&place=zareh   直接落到某店并弹卡片(可分享)
```

- Header 导航加第三项「地图 / Map」(现有 `Header.tsx`,`WINE_UI` 字典里加文案)。
- 每个详情页(`/<slug>`)的 Google 地图按钮旁加一个「在菠萝子地图上看」小链接(Phase 1 末尾,可选)。

### 5.2 布局

手机(主要场景,参考图就是手机):

```
┌──────────────────────────────┐
│ ▣ 🔍 找店或地方        [中/EN] │  ← 深色半透明搜索条(悬浮)
│  [墨尔本] [青森] [芒特甘比尔]   │  ← 城市 chips(横向滚动)
│                              │
│         （地图全屏）           │
│      ▢ 标签  ▢ 标签           │
│           🍍                 │  ← 菠萝子小人(HTML marker)
│                        (◎)   │  ← 右下:定位到小人 / 重置视角
│                        (▲)   │  ← 右下:切换俯视角度
│ ┌──────────────────────────┐ │
│ │ 照片 │ Zareh  中东菜 · Kensington │  ← 底部卡片(bottom sheet),
│ │      │ 一句话推荐语              │     上滑展开全文
│ │ [查看图文 →] [Google 地图 ↗]  │ │
│ └──────────────────────────┘ │
│  [◁ ▷ △ ▽ 虚拟方向键](可收起)   │  ← 自由操控模式才显示
└──────────────────────────────┘
```

桌面:地图占满,卡片改为右侧 360px 面板;方向键用键盘(WASD / 方向键),不显示虚拟键。

### 5.3 三级细节(回答「每个城市要多精确」)

原则:**位置真实,外观示意**。所有地貌都来自 OSM 数据自动生成,**人工只做两件事**:每城列几个地标、(可选)每店一张店面小图。

| 层级 | 缩放 | 俯仰 | 看得到什么 | 用途 |
|---|---|---|---|---|
| 城市级 | z 11–13 | 0–30° | 平涂的手绘底图:水体、公园绿地、主干道、区名(Collingwood 等);店铺**聚合成带数字的圆点** | 一眼看出哪些区有店 |
| 街区级 | z 14–15 | 45° | 街道带名字、公园贴树丛纹理、建筑 footprint 平面、店铺白色标签逐个展开(自动避让) | 挑店 |
| 街道级 | z 16–18 | 60° | 3D 建筑挤出、树丛与草地纹理、地标小插画、店面小插画(有则显示)、分类徽章 | 小人走路的舞台 |

- OpenFreeMap 瓦片最大 z14,再放大是矢量过采样(overzoom),线条依旧清晰。
- 日本小镇(十和田)/ 芒特甘比尔这类有山有湖的地方,Phase 3 可选加地形阴影(`hillshade`),山体立刻有体积感。
- 不追求建筑外观与真实一致:OSM 的轮廓 + 统一的暖灰配色就是「示意」。

### 5.4 交互流程

1. 进入 `/map`:默认「总览」——镜头框住所有有坐标的地点,店铺聚合显示;顶部城市 chips。
2. 选城市(点 chip 或点聚合圆点):`flyTo` 到该城市 `cities.json` 里定义的 center/zoom/pitch;小人出现在该城市的出生点(`cities.json` 的 `view.center`)。
3. 三种到达方式(任选):
   - **点标签 / 点卡片列表中的店** → 小人自动走过去,镜头跟随,到达时蹦一下 + 弹卡片;
   - **自由操控**:桌面方向键 / 手机虚拟方向键,小人按屏幕方向移动;走进某店 30 m 半径内并停留 0.4 s → 弹卡片;走出 60 m → 卡片收起(或手动关闭);
   - **搜索框**选店 → 同「点标签」。
4. 卡片:封面照、店名、分类 chip、区·城市、造访时间、一句话推荐语(双语跟随站点语言)、「查看图文 →」(站内 `/<slug>`)、「在 Google 地图打开 ↗」(`map_url`);Phase 3 可选「地图预览」展开 Google Maps Embed iframe。
5. URL 同步:选城 / 选店写进 `?city=&place=`,可直接分享。

### 5.5 搜索与筛选

- 搜索框匹配:店名、菜系(中英)、区名;结果下拉,选中即触发「走过去」。
- 分类筛选 chips(与首页 `CategoryNav` 同一套语义):全部 / 餐厅 / 咖啡 / 酒吧 / 景点 / 玩乐 / 买买买 / 住宿;筛掉的店标签隐藏(symbol 图层 `filter`)。

### 5.6 双语

- 沿用 `LanguageContext`;UI 文案进字典(建议新建 `src/lib/mapI18n.ts`,与 `wineI18n.ts` 同构)。
- 店名在地图标签上**始终显示原名**(品牌名不翻译);地标标签跟随语言(`name_zh` / `name_en`)。

### 5.7 降级与错误处理

| 情况 | 行为 |
|---|---|
| 瓦片服务不可用 / WebGL 不支持 | 地图区域显示「地图加载失败」提示 + **按城市分组的店铺纯列表**(每条可点进详情页),功能不丢 |
| `prefers-reduced-motion` | 小人不走路,直接出现在目的地并弹卡片;镜头 `jumpTo` 而非 `flyTo` |
| 某条数据缺坐标 | **构建失败**并指出文件名(zod 校验),不允许静默漏掉 |
| 无 JS | Next 静态导出下仍输出纯列表(同第一行) |

---

## 6. 技术架构

### 6.1 技术栈

- 现有:Next 16(静态导出,`basePath: /gourmet`)、React 19、Tailwind 4、gray-matter、zod、vitest、Playwright。
- **新增运行时依赖仅一个**:`maplibre-gl@^5`。仅在 `/map` 路由按需加载(`next/dynamic`,`ssr: false`),不影响其他页面体积。
- 底图数据:OpenFreeMap 矢量瓦片(`https://tiles.openfreemap.org/planet`,OpenMapTiles schema),样式以其 `liberty` 为底由脚本生成、**产物提交入库**(构建不依赖网络)。
- 字体/字形:OpenFreeMap 自带 glyphs(`Noto Sans Regular/Bold`);标签用它。

### 6.2 目录与文件职责

| 文件 | 职责 |
|---|---|
| `web/src/app/map/page.tsx` | 服务端:读全部地点 + 城市 + 地标,序列化成 props;渲染 `MapPageClient` |
| `web/src/components/map/MapPageClient.tsx` | 客户端外壳:搜索条、城市 chips、筛选、卡片、虚拟方向键;`dynamic(() => import('./MapView'), { ssr: false })` |
| `web/src/components/map/MapView.tsx` | 唯一直接碰 `maplibre-gl` 的组件:建图、加 source/layer、事件、挂小人;对外只暴露回调与命令(flyToCity / walkTo / setFilter) |
| `web/src/components/map/PlaceCard.tsx` | 卡片(bottom sheet / 侧栏) |
| `web/src/components/map/DPad.tsx` | 手机虚拟方向键 |
| `web/src/components/map/MapFallbackList.tsx` | 降级纯列表 |
| `web/src/lib/places.ts` | 读 `restaurants/` + `spots/` 合并为统一 `Place[]`,zod 校验(坐标必填) |
| `web/src/lib/map/geo.ts` | 纯函数:haversine 距离、经纬度 ↔ 米、直线路径采样(移植 `journey.ts` 的 `buildPath` / `pathPosition`) |
| `web/src/lib/map/walker.ts` | 纯逻辑:小人状态机(idle / auto / free / arrived)、速度模型、邻近判定;不碰 DOM,可单测 |
| `web/src/lib/map/placesToGeoJSON.ts` | `Place[]` → GeoJSON FeatureCollection(properties 扁平化) |
| `web/src/lib/mapI18n.ts` | 地图页 UI 文案字典 |
| `web/src/data/map/cities.json` | 城市清单(§6.3) |
| `web/src/data/map/landmarks/<city>.json` | 每城地标(§6.3) |
| `web/src/data/spots/*.md` | 非吃喝地点(与 restaurants 同 frontmatter) |
| `web/scripts/build-map-style.mjs` | 生成 `public/maps/painted.json`(§6.4),`npm run maps` |
| `web/scripts/backfill-coords.mjs` | 一次性:从 `map_url` 抠坐标写回 frontmatter,抠不到的列出来让人补 |
| `web/scripts/import-takeout.mjs` | Takeout 评论 → `web/field-notes/takeout/*.md` 草稿(§6.8) |
| `web/public/maps/painted.json` | 样式产物(入库) |
| `web/public/map-assets/patterns/*.png` | 无缝贴图(草地、树丛、水波、沙地) |
| `web/public/map-assets/icons/*.png` | 分类徽章、标签底图(9-slice)、地标小插画、店面小插画 |
| `web/public/sprites/pineapple-classic.png` + `src/components/map/sprite.css` | 小人雪碧图(Phase 2 从 travel-timeline 复制) |

约束:**所有自家静态资源 URL 必须经 `basePath` 前缀**(`src/lib/basePath.ts`):`public/maps/painted.json` 本身的 fetch 地址、所有贴图与图标(经 `map.addImage` 加载)、雪碧图。样式 JSON 内部的 `sprite` 与 `glyphs` 字段继续指向 OpenFreeMap 的绝对地址,不需处理。

### 6.3 数据模型

**地点(现有 frontmatter 新增两字段)**

```yaml
# web/src/data/restaurants/zareh.md (以及 spots/*.md)
coords: [144.984692, -37.797961]   # 必填,[lng, lat]
place_id: ""                        # 可选,Google Place ID(ChIJ…),仅 Embed 用;空则 Embed 用 q=店名+地址
```

**非吃喝地点** `web/src/data/spots/<slug>.md`:frontmatter 与 restaurants 完全相同,`category` 取值扩展为 `sight | activity | shop | stay`(restaurants 仍只允许 `food | cafe | bar`,首页逻辑不受影响)。正文同样 `## en` / `## zh`。图片放 `public/images/<slug>/`。

统一类型(`src/lib/places.ts`):

```ts
export type PlaceKind = 'food' | 'cafe' | 'bar' | 'sight' | 'activity' | 'shop' | 'stay'
export type Place = Restaurant & { kind: PlaceKind; coords: [number, number]; place_id?: string }
export function getAllPlaces(): Place[]   // restaurants + spots,zod 校验,缺 coords 抛错并点名文件
```

**城市** `web/src/data/map/cities.json`:

```json
[
  { "slug": "melbourne", "name_zh": "墨尔本", "name_en": "Melbourne",
    "bounds": [[144.55, -38.10], [145.40, -37.55]],
    "view": { "center": [144.9631, -37.8136], "zoom": 12.5, "pitch": 30, "bearing": 0 } },
  { "slug": "towada", "name_zh": "十和田(青森)", "name_en": "Towada, Aomori",
    "bounds": [[141.10, 40.55], [141.30, 40.68]],
    "view": { "center": [141.2050, 40.6151], "zoom": 15, "pitch": 50, "bearing": 0 } },
  { "slug": "mount-gambier", "name_zh": "芒特甘比尔", "name_en": "Mount Gambier",
    "bounds": [[140.70, -37.88], [140.85, -37.78]],
    "view": { "center": [140.7838, -37.8297], "zoom": 15, "pitch": 50, "bearing": 0 } }
]
```

地点归属城市**按 `bounds` 包含坐标判定**,不靠字符串匹配(现有数据里 Mount Gambier 的 `city` 字段是 "South Australia",字符串匹配会乱)。落在任何城市外的地点只在总览出现,并在构建日志里警告。

**地标** `web/src/data/map/landmarks/melbourne.json`:

```json
[
  { "name_zh": "弗林德斯街车站", "name_en": "Flinders Street Station",
    "coords": [144.9672, -37.8183], "icon": "lm-flinders", "minzoom": 13 }
]
```

`icon` 对应 `public/map-assets/icons/<icon>.png`;文件不存在时回退到通用地标徽章,不报错。

### 6.4 底图样式生成(`build-map-style.mjs`)

移植自 travel-timeline 的同名脚本(按 `source-layer` 匹配规则,不依赖具体 layer id),改为「手绘暖色」调色板,并多做四件事:保留并重配色 `building-3d`、去掉 POI 图标与公路盾牌、为 pattern 预留槽位、把区名标签改成奶油色小牌。

**调色板 v0(可调,改脚本常量后 `npm run maps`)**

| 用途 | 色值 | 说明 |
|---|---|---|
| 地表底色 `background` | `#D6D07A` | 参考图的暖黄绿 |
| 草地/公园 `landcover.grass`、`park` | `#B9C95E` | 比底色绿一点 |
| 林地 `landcover.wood` | `#6E9F49` | Phase 3 换成树丛 pattern |
| 住宅区 `landuse.residential` | `#D9D08A` | 略暖,和底色区分即可 |
| 沙地 `landcover.sand` | `#E9DBA9` | |
| 水面 `water` | `#6FB3D2` | Phase 3 叠波纹 pattern |
| 河流线 `waterway` | `#5FA3C4` | |
| 道路面 `transportation`(非 casing) | `#F2E7C4` | 米色 |
| 道路描边(id 含 casing/outline) | `#B9A878` | |
| 建筑平面 `building`(fill) | `#C7B596` | 低缩放 |
| 建筑挤出 `building-3d` | `#C3AE8C`,`fill-extrusion-vertical-gradient: true`,`minzoom 14` | 高度用瓦片自带 `render_height` |
| 区名/地名 `place` 标签 | 文字 `#3B392C`,光晕 `#F8F2DD` 宽 1.5 | |
| 街道名 `transportation_name` | 文字 `#5A553F`,`minzoom 15` | |

**删除**:`poi` 的所有 symbol 图层(店铺图标会和我们的标签打架)、公路盾牌(`transportation_name` 里带 `ref` 的 shield 层)、`aerodrome_label`。**保留**:边界线调淡。

**pattern 槽位**:脚本接受一个 `PATTERNS` 映射(`wood → 'pat-wood'`、`grass → 'pat-grass'`、`water → 'pat-water'`、`sand → 'pat-sand'`);对应 PNG 存在于 `public/map-assets/patterns/` 时输出 `fill-pattern`,否则输出纯色。这样 Phase 1 没有美术也能跑,Phase 3 丢文件进去重跑脚本即可。pattern 图片在运行时用 `map.addImage()` 注册(样式 JSON 的 `sprite` 字段仍指向 OpenFreeMap 的,我们不自建 sprite 图集)。

**视角策略**:`pitch` 随缩放:`z≤12 → 0–30°`,`z14 → 45°`,`z≥16 → 60°`;只在 `flyTo` 时设定,用户手势可自由改;右下角按钮一键在「平视 / 俯视」间切换。`maxPitch` 设 65。

### 6.5 地点渲染(symbol 图层而非 HTML marker)

用 GeoJSON source(`cluster: true, clusterMaxZoom: 12, clusterRadius: 40`)+ 三个图层:

1. `place-cluster`:circle + 数字(低缩放)。
2. `place-label`:symbol,`text-field: ['get','name']`,`text-font: ['Noto Sans Bold']`,`text-size 12`;**白色圆角标签底图**用 `map.addImage('label-bg', img, { stretchX, stretchY, content, pixelRatio: 2 })`(9-slice 可拉伸)+ `icon-text-fit: 'both'`、`icon-text-fit-padding`;`icon-anchor: 'bottom'`,底图图片自带底部小三角指针(指针区域不在 `content` 框内,不会被拉伸)。
3. `place-badge`:symbol,`icon-image: ['concat', 'badge-', ['get','kind']]`,`icon-anchor: 'bottom'`,`icon-offset` 让徽章浮在标签正上方;`icon-pitch-alignment: 'viewport'`(俯视时图标保持直立)。

- 选 symbol 图层的理由:自动避让(标签多时不叠成一团)、与地图同帧渲染、俯视下正确排序;HTML marker 留给唯一需要 DOM 动画的小人。
- 点击:`map.on('click', ['place-label','place-badge'])` → 触发「走过去」;hover 变指针。
- 筛选:`map.setFilter('place-label', ['in', ['get','kind'], ['literal', kinds]])`。
- 地标:同样方式独立 source `landmarks`,图标用 `lm-*`,`minzoom` 取数据里的值;`icon-size` 随缩放插值放大。

### 6.6 小人系统

- **形象**:Phase 2 直接复制 travel-timeline 的 `public/sprites/pineapple-classic.png`(16×20 字符画 ×8 放大;帧表:行0 idle×2 / 行1 walk×4 / 行2 celebrate×2)与 `sprite.css` 里的 `.pp-*` 类。Phase 3 换手绘版时**沿用同一帧表布局**,CSS 零改动。
- **挂载**:`new maplibregl.Marker({ element, anchor: 'bottom', pitchAlignment: 'viewport', rotationAlignment: 'viewport' })`。**坑**:MapLibre 会覆写 marker 根元素的 `transform`,所以缩放/翻转类必须挂在内层 sprite 元素上,外层只做定位壳(travel-timeline `retroMap.ts` 的注释已写明,照抄 `spriteMarker` / `markerSprite`)。
- **状态机**(`walker.ts`,纯逻辑,可单测):

```
idle ──点标签/搜索──▶ auto(目标 slug, 路径, t)──到达──▶ arrived(slug) ──关卡片/再操作──▶ idle
idle ──按键/摇杆──▶ free(速度向量)──松手──▶ idle
free ──进入某店 30 m 且停留 ≥0.4 s──▶ arrived(slug)
```

- **自动行走**:路径 = 直线采样(移植 `buildPath` / `pathPosition`);时长 = `clamp(距离 m / 400, 1.2 s, 4 s)`;逐帧 `marker.setLngLat` + `map.easeTo({ center, duration: 0 })` 跟随;行进方向决定 `scaleX(-1)` 翻转;到达后 `flyTo` 到 z16 / pitch 60,播 celebrate,弹卡片。Phase 3 可选:先向 Valhalla 公共实例请求 `pedestrian` 路线(`https://valhalla1.openstreetmap.de/route`,公平使用,1 req/s 以内),成功则沿折线走,失败/超时 1.5 s 回退直线。
- **自由操控**:输入 → 屏幕方向单位向量 → 速度(屏幕像素/秒,固定 180 px/s,这样不同缩放下「手感」一致)→ 每帧 `map.project(pos) + v·dt` → `map.unproject` 回经纬度;镜头在小人离开视口中心 35% 区域时软跟随。手机虚拟方向键 `DPad.tsx`(四向,pointer 事件,支持长按)。
- **邻近判定**:每帧对当前城市内的地点算 haversine(数量 < 200,直接遍历即可),最近者 < 30 m 高亮其标签;停留 0.4 s 弹卡;> 60 m 收起。
- **出生点**:进入城市时放在 `cities.json` 的 `view.center`;若 URL 带 `place=`,直接放在该店旁并弹卡。
- `prefers-reduced-motion`:所有动画退化为瞬移(同 travel-timeline `playJourney` 的分支)。

### 6.7 卡片(`PlaceCard.tsx`)

- React 组件,不用 MapLibre Popup(样式自由、双语、手机 bottom sheet 更顺手)。
- 内容:封面(`images[0]`,经 basePath)、名字、`kind` chip、`suburb · city`、`formatVisited`、`tagline_{lang}`、按钮「查看图文 →」(`/${slug}`)、「在 Google 地图打开 ↗」(`map_url`,`map_type: amap` 时文案换高德,与 `RestaurantDetail.tsx` 一致)。
- 展开态(上滑 / 桌面默认):完整 `review_{lang}` + 缩略图。
- **Phase 3 可选**:「地图预览」按钮,展开后才加载 iframe:`https://www.google.com/maps/embed/v1/place?key=<KEY>&q=place_id:<place_id>`(无 `place_id` 时 `q=<店名>,<区>`)。Maps Embed API 免费且不限量,但需要在 Google Cloud 申请 key 并**按 HTTP referrer 限制到 `tianshuuu.github.io`**;key 写在代码里是正常做法(referrer 限制保护它)。不申请 key 就不做这一项。

### 6.8 内容管线:Google 评论导入(`import-takeout.mjs`)

目标:把业主 Google 评论里的存量(景点/体验/店)半自动变成 `spots/` 或 `restaurants/` 的草稿。

```
Google Takeout(勾 "Maps (your places)" 得评论;勾 "Maps" 得评论照片)
   │ 解压
   ▼
node scripts/import-takeout.mjs <Reviews.json> [--photos <目录>] [--since 2023-01]
   │ 每条评论 → 一个草稿 markdown(frontmatter 齐全:name / coords / map_url / visited / 原文 / 星级仅注释)
   ▼
web/field-notes/takeout/<slug>.md  (+ photos/ 若有,gitignore)
   │ Claude 在对话里逐条:定 category、翻译/润色(简洁明快略带幽默)、挑图、起 slug
   ▼
web/src/data/spots/<slug>.md  或  restaurants/<slug>.md
```

- Takeout 的评论 JSON 有**两代格式**(字段名见附录 B),脚本两种都要认;都不匹配时打印它实际看到的 key 列表并退出,**不要猜**。
- 坐标:新格式里部分评论没有坐标 → 草稿里 `coords: null` 并在汇总表里标红,由 Claude 用 `map_url` 解析(`extractCoords`,见附录 A)或人工补。
- 星级写进草稿 frontmatter 的注释行,**不进网站**(决策 #8)。
- 此脚本只写 `field-notes/`,**永不直接写 `src/data/`**(与现场笔记同一条纪律:素材与成稿分离)。

### 6.9 性能

- `maplibre-gl` 仅 `/map` 加载(gzip 约 250 KB),进入视口后再建图(复用 `whenVisible` 思路)。
- 地点数据随页面 props 内联(百条以内,< 50 KB);封面图懒加载。
- 样式 JSON 入库,无网络依赖;贴图 PNG 单张 ≤ 60 KB;地标/店面小图 ≤ 30 KB。
- 目标:手机 4G 下 `/map` 首屏(底图可见)3 s 内。

### 6.10 测试

- **vitest(纯逻辑)**:`places.ts`(合并、校验、缺坐标点名报错)、`geo.ts`(距离、路径采样)、`walker.ts`(状态机、邻近判定、停留计时)、`placesToGeoJSON`、`import-takeout` 的两代格式解析(用 fixture)。
- **Playwright 冒烟**(项目已装):`/map` 渲染出城市 chips 与降级列表容器;点击 chip 后 URL 带 `?city=`;点标签后卡片出现并含两个按钮。**WebGL 在 headless 里可能不可用**:给 chromium 加 `--use-gl=angle --use-angle=swiftshader --ignore-gpu-blocklist`;若仍不行,e2e 只断言 DOM 层(卡片、列表、URL),地图像素由人工截图验证。
- **构建即测试**:`npm run build` 必须通过;产物在 `/gourmet` 前缀下资源路径正确(用 `npx serve out` 并访问 `/gourmet/map/` 验证,或检查 `out/map.html` 里的 URL)。

---

## 7. 美术资产清单与规格(Phase 3,业主用图像模型产出)

先写一份**画风圣经**(一段文字,所有资产的提示词都带上它),保证一致性:

> 手绘故事书风格,俯视 60° 斜视角,暖黄绿草地、米色小路、青蓝水面、灰褐瓦顶米墙的房子、成簇的圆形树冠(深绿/浅绿/偶尔粉色),柔和的左上方光源与短投影,色彩饱和但不刺眼,无文字,无人物。
> (EN) Hand-painted storybook style, 60° bird's-eye view, warm yellow-green meadow, cream footpaths, teal-blue water, houses with grey-brown tiled roofs and cream walls, clusters of round tree canopies (dark green / light green / occasional pink), soft top-left light with short shadows, saturated but gentle colours, no text, no people.

| 资产 | 文件 | 规格 | 数量 | 提示词要点 |
|---|---|---|---|---|
| 树丛贴图 | `patterns/pat-wood.png` | 512×512,**无缝可平铺**,不透明 | 1 | 「seamless tileable top-down texture of dense round tree canopies on meadow」+ 圣经 |
| 草地贴图 | `patterns/pat-grass.png` | 512×512,无缝,不透明,细微笔触 | 1 | 「seamless tileable meadow texture, subtle brush strokes, sparse tiny shrubs」 |
| 水波贴图 | `patterns/pat-water.png` | 512×512,无缝,不透明 | 1 | 「seamless tileable teal water with thin white ripple strokes」 |
| 沙地贴图 | `patterns/pat-sand.png` | 512×512,无缝 | 1 | 「seamless tileable pale sand texture」 |
| 标签底图 | `icons/label-bg.png` | 64×40 @2x,白色圆角矩形 + 底部小三角,**透明背景**;9-slice 参数写在代码里 | 1 | 可由执行模型直接用代码生成(矢量画),不需要图像模型 |
| 分类徽章 | `icons/badge-{food,cafe,bar,sight,activity,shop,stay}.png` | 96×96 @2x,圆形底 + 图案,透明背景 | 7 | 「round badge icon of a rice bowl / coffee cup / wine glass / torii gate / hiking boot / shopping bag / bed」+ 圣经;**同一批次生成**保证一致 |
| 地标小插画 | `icons/lm-<slug>.png` | 256×256,透明背景,居中,俯视 60° | 每城 3–8 | 「isolated top-down 3/4 view illustration of Flinders Street Station, Melbourne」+ 圣经;抠图留透明 |
| 店面小插画(可选) | `icons/shop-<slug>.png` | 192×192,透明背景 | 每店 1 | 用业主自己的店面照片做参考图(img2img),「storefront of … as a small isolated illustration」+ 圣经 |
| 手绘菠萝子雪碧图(可选) | `sprites/pineapple-painted.png` | 与像素版同帧表:4 列 × 3 行,单帧 128×160;透明背景 | 1 | 图像模型很难直接出整齐雪碧图;可行路线:先生成「站立」「迈左腿」「迈右腿」「举手」4 张同风格单图 → 执行模型用脚本(sharp)拼成帧表。行走 2 帧交替即可 |

无缝贴图的检验:执行模型用 sharp 把图 2×2 平铺后截图,肉眼无接缝即可;有接缝就让业主重生成或用「tile」类工具修。

### 7.1 墨尔本试点资产包(业主现在就可以开始生成)

**为什么选墨尔本**:店最多(4 家)、朋友最常用、地标最多也最考验风格一致性;而且贴图与徽章本来就是全站通用的,做一次所有城市都受益。十和田留给 Phase 4 的「整张插画叠加」实验更合适。

**交付方式**:生成的 PNG 直接放进 `/Users/tantianshu/Documents/code/gourmet/map/inbox/melbourne/`(文件名按下表;尺寸不必精确,执行模型负责缩放、抠图、重命名并搬进 `web/public/map-assets/`)。

**生成通用守则**

1. 同一个模型、同一个会话里连续生成,每条提示词末尾都带上下面这段「画风圣经」;若工具支持参考图,附上 `map/visual-ref.jpeg` 作风格参考。
2. 一律 1024×1024 出图,缩小由执行模型做。
3. 四张贴图必须**无缝可平铺**:工具有「tile / 平铺」选项就打开(Midjourney `--tile`、Stable Diffusion 的 tiling),没有就在提示词里强调;自检:把同一张图四份拼成 2×2,接缝处看不出来才算过。
4. 徽章、地标、店面:**透明背景**优先;工具不支持就用纯白背景,之后在 macOS 访达里右键 → 快速操作 → 「移除背景」,或交给执行模型用 rembg 抠。
5. 单张不满意就重生成那一张,不要整批重来;整批「色温」要一致,最后把全部缩略图摆在一起看一眼。

**画风圣经(每条提示词末尾粘贴)**

```
Hand-painted storybook illustration style, 60-degree bird's-eye view, warm yellow-green meadows, cream-coloured footpaths with slightly darker edges, teal-blue water with thin white ripple strokes, houses with grey-brown tiled roofs and cream walls, clusters of round tree canopies in dark green, light green and occasional pink, soft light from the top-left with short shadows, saturated but gentle colours, clean edges, no text, no people, no watermark.
```

**A. 通用贴图(4 张,全站共用)**

| 文件名 | 提示词(末尾加画风圣经) |
|---|---|
| `pat-wood.png` | Seamless tileable texture seen from above at a slight tilt: dense clusters of round tree canopies covering a warm yellow-green meadow, a mix of dark green and light green canopies with a few pink blossom trees, tiny soft shadows falling to the bottom-right, the four edges must tile seamlessly with no visible border, square 1024x1024. |
| `pat-grass.png` | Seamless tileable texture of a warm yellow-green meadow with subtle hand-painted brush strokes, a few tiny shrubs and flower dots scattered sparsely, no trees, the four edges tile seamlessly, square 1024x1024. |
| `pat-water.png` | Seamless tileable texture of calm teal-blue water with thin white hand-painted ripple strokes and gentle colour variation, the four edges tile seamlessly, square 1024x1024. |
| `pat-sand.png` | Seamless tileable texture of pale cream sand with faint hand-painted grain and a few small pebbles, the four edges tile seamlessly, square 1024x1024. |

**B. 分类徽章(7 张,全站共用;同一会话连续出,保证成套)**

模板:`A single round badge icon: a cream circular background with a thin warm-brown outline, containing 【主体】, centred, isolated on a transparent background (or plain white if transparency is unsupported), flat shading, bold simple shapes that stay readable when shrunk to 48 pixels, square 1024x1024.` + 画风圣经

| 文件名 | 【主体】 |
|---|---|
| `badge-food.png` | a steaming rice bowl with a pair of chopsticks |
| `badge-cafe.png` | a coffee cup with latte art on a small saucer |
| `badge-bar.png` | a wine glass next to a coupe cocktail glass |
| `badge-sight.png` | a vintage camera |
| `badge-activity.png` | a hiking boot with a tiny flag |
| `badge-shop.png` | a paper shopping bag with a ribbon |
| `badge-stay.png` | a cosy bed with a pillow and a folded blanket |

**C. 墨尔本地标(6 张;坐标为约值,执行模型接入时用 OSM 核对)**

模板:`An isolated miniature illustration of 【地标描述】, seen from a 60-degree bird's-eye view, centred on a transparent background (or plain white), simplified and chunky like a tabletop model, bold readable silhouette that still reads when shrunk to 64 pixels, square 1024x1024.` + 画风圣经

| 文件名 | 【地标描述】 | 约坐标 [lng, lat] |
|---|---|---|
| `lm-flinders.png` | Flinders Street Station in Melbourne: long yellow Edwardian facade, green copper dome, clock tower at the corner | [144.9671, -37.8183] |
| `lm-arts-centre.png` | the Arts Centre Melbourne spire: a tall white lattice spire rising from a round base | [144.9683, -37.8206] |
| `lm-mcg.png` | the Melbourne Cricket Ground: a huge oval stadium with a white roof ring and tall light towers, green pitch inside | [144.9834, -37.8200] |
| `lm-exhibition.png` | the Royal Exhibition Building: a long cream Victorian hall with a large central dome, formal gardens and a fountain in front | [144.9717, -37.8047] |
| `lm-shrine.png` | the Shrine of Remembrance: a grey stone stepped-pyramid roof on a classical columned base, surrounded by lawn | [144.9734, -37.8305] |
| `lm-luna-park.png` | Luna Park St Kilda: a giant laughing face gateway between two towers, a wooden rollercoaster behind | [144.9767, -37.8678] |

**D. 店面小插画(4 张,可选,第二批再做)**

每家用业主自己拍的门脸照片做参考图(img2img):`Using the attached photo as reference, a small isolated storefront illustration of 【店名】 in Melbourne, 60-degree bird's-eye view, centred on a transparent background, simplified like a tabletop model, keep the real facade colours and signage shapes but no readable text, square 1024x1024.` + 画风圣经。文件名 `shop-marys.png`、`shop-dons.png`、`shop-zareh.png`、`shop-death-and-co.png`。

**E. 手绘菠萝子(可选,随时)**

按 §7 表格最后一行:先出 4 张同风格单图(站立 / 迈左腿 / 迈右腿 / 举手庆祝),主体是现有的菠萝子形象(墨镜、菠萝冠、大笑容),文件名 `pp-idle.png`、`pp-walk-a.png`、`pp-walk-b.png`、`pp-cheer.png`;执行模型用 sharp 拼成与像素版同布局的雪碧图。

**试点验收(业主看截图判断)**

- 四张贴图 2×2 拼接无接缝,铺满大面积时没有明显的重复感;
- 七个徽章摆在一起像一套;缩到 48 px 还分得清;
- 六个地标缩到 64 px 仍认得出是哪;
- `/map` 墨尔本 z15 截图与参考图并排,色温与「小房子小树」的密度感接近;
- 以上任一项不过,只重做对应那几张。

---

## 8. 分阶段路线图

每个阶段 = 一份独立实施计划 = 一个独立可上线的增量。阶段内任务按 TDD(纯逻辑)+ 预览截图(视觉)推进。

### Phase 0 数据打底(无 UI,半个会话)

- `scripts/backfill-coords.mjs`:复制 `notes-app/shared/note.mjs` 的 `extractCoords`,遍历 `restaurants/*.md`,写回 `coords`;抠不到的打印清单(目前 6 条 `map_url` 都是带 `!3d…!4d…` 的 place 链接,应全部自动命中;`marys.md` 的链接已于 2026-11-13 从搜索链接换成 place 链接)。
- **站名改为「菠萝子指南」**:`src/components/Header.tsx`(品牌文字)、`src/app/layout.tsx`(`title`、`openGraph.title`、`twitter.title` 三处)、`CLAUDE.md` Style 节。英文 `description` 与首页 hero 副标题(`HomepageClient.tsx` 的 `sub` 两处)先不动,等景点内容上线再一起改。`src/app/opengraph-image.jpg` / `twitter-image.jpg` 先打开看画面里有没有旧站名,有则报告给业主重新出图,不要自行 P 图。
- `src/lib/places.ts` + zod + 单测;`src/data/map/cities.json`(墨尔本 / 十和田 / 芒特甘比尔);`src/data/spots/` 空目录 + `.gitkeep`。
- `web/CLAUDE.md` 增补:新字段、新目录、`npm run maps`、本策划案路径。
- **验收**:`npm run test`、`npm run build` 全绿;单测断言每个数据文件都有合法 `coords`;6 家店坐标全部由脚本自动抠出,零人工;Header 与页面 `<title>` 显示「菠萝子指南」。

### Phase 1 地图 MVP(1–2 个会话)

- 装 `maplibre-gl`;`scripts/build-map-style.mjs` → `public/maps/painted.json`(调色板 v0,无 pattern);`npm run maps` 脚本。
- `/map` 路由、`MapPageClient` / `MapView` / `PlaceCard` / `MapFallbackList`;城市 chips;地点 symbol 图层(聚合 + 9-slice 标签 + 徽章占位图标,徽章先用代码画的纯色圆点);点标签弹卡片(此时**没有小人**,直接 `flyTo` + 卡片);URL 参数;分类筛选;搜索;Header 导航加「地图」;降级列表。
- **验收**:手机与桌面访问 `/map`,墨尔本显示 4 个标签、十和田 1 个、芒特甘比尔 1 个;点 Zareh 弹卡片含封面与两个按钮;切城市镜头飞过去;`?city=&place=` 直达;断网(DevTools offline)重载显示降级列表;`npm run build` 后 `out/` 里的资源路径都带 `/gourmet`。
- 上线:业主确认预览后 push。

### Phase 2 菠萝子小人(1 个会话)

- 复制像素雪碧图 + CSS;`walker.ts` 状态机(先写测试);HTML marker 挂载;点标签 → 走过去 → 到达弹卡;键盘 + `DPad` 自由操控 + 邻近触发;镜头软跟随;reduced-motion 分支;右下「回到小人」按钮。
- **验收**:桌面按方向键小人移动,走进 Don's 30 m 弹卡片,走开收起;点任意标签 ≤ 4 s 到达并弹卡;开启系统「减少动态效果」后瞬移;单测覆盖状态机与邻近判定。

### Phase 3 画风升级·墨尔本试点(§7.1 资产到位后,1–2 个会话;可与 Phase 4 并行)

- **试点城市 = 墨尔本**,其他城市继续用占位。接入 §7.1 资产包:四张贴图(重跑 `npm run maps`)、七个分类徽章、墨尔本地标图层(6 个)、店面小插画(有则显示)、手绘菠萝子(帧表不变,若已生成);可选:`hillshade`(DEM 源,例如 AWS 开放数据的 terrarium 瓦片,**使用前核实可用性与条款**)、Valhalla 沿街行走、Google Maps Embed 开关(需 key)。
- **验收**:z12 / z15 / z17 三档各截一张墨尔本的图,与参考图并排给业主看(十和田此时仍是占位,截一张作对照);无控制台报错;贴图无接缝;帧率在手机上不掉到 30 以下。**业主点头后**,再按 §7.1 同一套提示词为十和田、芒特甘比尔各生成 2–3 个地标,铺开。

### Phase 4 内容扩充(持续)

- `import-takeout.mjs`(两代格式 + fixture 单测);首批 10 个景点/玩乐进 `spots/`;地图分类 chips 出现新类别;首页是否加「玩乐」入口由业主另定。
- 可选实验:十和田整张 AI 插画按四角经纬度叠加(`image` source),看效果决定是否推广到其他小镇。

---

## 9. 给执行模型的须知

1. 开工前读 `web/CLAUDE.md`、`web/AGENTS.md`(Next 16 与你记忆中的不同,**先读 `node_modules/next/dist/docs/`**)、本策划案;每个阶段先用 writing-plans 产出实施计划再动手。
2. **basePath 铁律**:任何图片、贴图、样式 JSON、雪碧图路径都要经 `basePath`;本地 `npm run dev` 看不出问题,线上会全挂。
3. 纯逻辑与 DOM 分离(`src/lib/map/*` 不 import `maplibre-gl`,可单测);`MapView.tsx` 是唯一碰地图实例的地方。
4. 不引入新的 UI 框架或地图封装库(不用 react-map-gl),直接用 `maplibre-gl`,与 travel-timeline 保持同一套心智。
5. 样式只改 `build-map-style.mjs` 的常量再 `npm run maps`,不要手改 `painted.json`;想可视化试色可以把 `painted.json` 拖进 Maputnik(`https://maplibre.org/maputnik/`)玩,但结论要回写到脚本。
6. 视觉类任务:用预览截图(手机 + 桌面各一)作为「完成」证据;需要业主拍板的视觉选择,给 2–3 个候选截图,不要自己定。
7. 完成标准:`npm run test` 与 `npm run build` 通过 + 截图 + 验收清单逐条打勾;**未经业主确认不 push**(push 即上线)。
8. 已知坑:MapLibre 覆写 marker 根元素 transform(见 §6.6);Next 静态导出下地图组件必须 `'use client'` + `dynamic(..., { ssr: false })`,并 import `maplibre-gl/dist/maplibre-gl.css`;像素雪碧图要 `image-rendering: pixelated`;`text-font` 只能用 OpenFreeMap 提供的字体栈名(`Noto Sans Regular` / `Noto Sans Bold`),写错整层不显示;中文标签若字形缺失,改用 HTML marker 兜底。
9. 外部服务只用免费、无需 key 的默认项(OpenFreeMap);任何需要 key 或有配额的服务(Google Embed、Valhalla、DEM)都做成**可关的可选项**,默认关闭,且失败不影响主流程。

---

## 10. 风险与备选

| 风险 | 应对 |
|---|---|
| OpenFreeMap 社区服务停摆 | 脚本以 `source-layer` 匹配,换 MapTiler 免费档(需 key)或自托管 Protomaps(PMTiles)只需改 source,样式规则不动 |
| 老设备 WebGL 不可用 | 降级纯列表(§5.7),内容不丢 |
| 美术风格漂移 | 画风圣经 + 同批次生成 + 统一光源方向;徽章一次性生成全套 |
| 「像参考图」的期望落差 | Phase 1 就给业主看 v0 截图校准预期;点状插画是增量,随时可加 |
| 执行模型对地图引擎不熟 | §6 已给出具体 API 名与 travel-timeline 可照抄的文件(附录 A);MapLibre 官方示例:`add-a-pattern-to-a-polygon`、`display-buildings-in-3d`、`add-a-stretchable-image-to-the-map`(icon-text-fit)、`add-an-image` |
| 站名与定位 | 已决定改名「菠萝子指南」(Phase 0 执行);英文 description 与首页文案在景点内容上线时同步更新 |
| Takeout 格式再变 | 脚本遇到未知格式即打印 key 并退出,人工看一眼补一个分支 |

---

## 11. 需要业主提供 / 拍板的事项

| 事项 | 何时需要 | 说明 |
|---|---|---|
| 确认 §4 决策表剩余项(或改) | Phase 0 前 | #1、#6、#7 已确认;#4、#5 等仍按默认 |
| 墨尔本地标清单确认 | Phase 3 前 | §7.1 预填了 6 个,可增删;十和田/芒特甘比尔待试点通过后再列 |
| 墨尔本试点资产包(§7.1) | 随时可开始,Phase 3 前到位 | 放进 `/Users/tantianshu/Documents/code/gourmet/map/inbox/melbourne/` 即可,命名与尺寸由执行模型规整 |
| Google Takeout 导出(Maps (your places) + Maps 照片) | Phase 4 | 解压后告诉路径即可 |
| Google Maps Platform key(可选) | 仅当要 Embed | 按 referrer 限制 |

---

## 附录 A:travel-timeline 可直接复用的代码(同一台机器)

| 路径 | 复用方式 |
|---|---|
| `/Users/tantianshu/Documents/code/travel-timeline/scripts/build-map-style.mjs` | 复制后改调色板、加 `building-3d` 重配色、POI 删除、pattern 槽位 |
| `/Users/tantianshu/Documents/code/travel-timeline/src/scripts/journey.ts` | `buildPath` / `pathPosition` 原样搬进 `src/lib/map/geo.ts`;`playJourney` 的 reduced-motion 与逐帧跟随写法照抄 |
| `/Users/tantianshu/Documents/code/travel-timeline/src/scripts/retroMap.ts` | `spriteMarker` / `markerSprite` / `whenVisible` / `markMapFailed` |
| `/Users/tantianshu/Documents/code/travel-timeline/public/sprites/pineapple-classic.png` + `src/styles/sprite.css`(`.pp-*` 部分) | 直接复制;牛奶盒(`.mb-*`)不要 |
| `/Users/tantianshu/Documents/code/travel-timeline/scripts/gen-sprite.mjs` | 若要微调像素画才需要;手绘版不用它 |
| `web/notes-app/shared/note.mjs` 的 `extractCoords` / `extractPlaceName` | 坐标回填与 Takeout 导入共用(复制到 `scripts/lib/` 或直接 import `.mjs`) |

## 附录 B:Google Takeout 评论 JSON 的两代字段(执行时**以真实文件为准**)

| 含义 | 旧格式(`Maps (your places)/Reviews.json`,GeoJSON FeatureCollection) | 新格式(文件名仍为 `Reviews.json`,属性名蛇形;与 Google Data Portability 的 `local_actions` schema 一致) |
|---|---|---|
| 店名 | `properties.Location["Business Name"]` | `properties.location.name` |
| 地址 | `properties.Location.Address` | `properties.location.address` |
| 坐标 | `geometry.coordinates`([lng, lat])或 `Location["Geo Coordinates"]{Latitude, Longitude}` | `geometry.coordinates`;**部分评论缺失** |
| 地图链接 | `properties["Google Maps URL"]` | `properties.google_maps_url` |
| 星级 | `properties["Star Rating"]` | `properties.five_star_rating_published` |
| 正文 | `properties["Review Comments"]` | `properties.review_text_published` |
| 日期 | `properties.Published` | `properties.date` |
| 照片 | 不在此文件;另勾选 Takeout 的「Maps」得到照片与每张照片的 JSON 元数据 | 同左 |

两列都来自二手资料拼凑,没有一份官方样例。脚本的第一步永远是打印第一条 feature 的全部 key。

## 附录 C:`backfill-coords.mjs` 逻辑

1. 读 `src/data/restaurants/*.md`(gray-matter)。
2. 已有合法 `coords` → 跳过。
3. 否则 `extractCoords(map_url)`:依次匹配 `!3d<lat>!4d<lng>`、`/maps/search/<lat>,<lng>`、`q=<lat>,<lng>`、`@<lat>,<lng>`;命中则写 `coords: [lng, lat]`(六位小数)。注意 `@` 形式是视口中心而非店的精确位置,优先级最低,写回时在 frontmatter 加注释 `# coords from viewport (@), verify`。
4. 未命中 → 汇总打印「文件名 + map_url」,退出码 1,不改文件。
5. 写回时保留原 frontmatter 顺序与正文(用 gray-matter `stringify`,并人工 diff 一次确认没把引号/格式搞乱)。
