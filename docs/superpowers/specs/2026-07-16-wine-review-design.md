# 酒评页面（Wine Review）设计文档

日期：2026-07-16
状态：待实现（设计已确认）

## 1. 目标概述

在现有 gourmet 餐厅指南（Next.js 应用）中新增一个「酒评 / Wine」板块：

- 在顶部 Header 增加导航标签，可在「餐厅指南」和「酒评」之间切换（形式参考 coffee-tracker 的 `Tracker | Diary` 入口）。
- 新建酒评列表页与详情页，**视觉沿用 coffee-tracker 的 coffee-diary 编排式排版**，但换成 gourmet 现有的地中海配色。
- coffee-diary 的口味指标（酸/甜/醇厚/香气/余韵）替换为葡萄酒四项：**Body / Tannin / Acidity / Sweetness**。
- 首次上线附带 1–2 瓶双语示例酒 + 空状态。

参考实现：`/Users/tantianshu/Documents/code/coffee-tracker/docs/`（`diary.html`、`diary-detail.html`、`diary.css`、`diary-common.js`、`diary.json`）。

## 2. 路由与文件结构

在 gourmet 的 Next.js 16 应用（`web/`，static export、`basePath: /gourmet`、Tailwind v4）中新增：

- `/wine` —— 酒评列表页
- `/wine/[slug]` —— 单瓶酒评详情页（`generateStaticParams` 静态生成；Next 16 里 `params` 为 Promise，实现前先查 `node_modules/next/dist/docs/` 与现有 `src/app/[slug]/page.tsx` 的写法对齐）

餐厅指南部分**除 Header 增加导航标签外不改动**。酒评页复用全局 `<Header>` 与 `<Footer>`（语言切换、品牌一致），在其下渲染 coffee-diary 风格的编排式正文。

**新增文件**

- `src/app/wine/page.tsx` —— 列表页（server 组件取数据，交给 client 组件渲染交互）
- `src/app/wine/[slug]/page.tsx` —— 详情页（含 `generateStaticParams`）
- `src/app/wine/wine.css` —— 从 `diary.css` 移植、重新配色并作用域化的样式
- `src/components/wine/WineListClient.tsx` —— 列表交互（搜索 + 类型筛选 + 卡片网格）
- `src/components/wine/WineDetail.tsx` —— 详情渲染（两种版式 + 滑块 + Details 信息栏）
- `src/lib/wines.ts` —— 类型定义 + 读取/排序/取单条的工具函数
- `src/data/wines.json` —— 酒评内容数据（1–2 条示例）
- `public/images/wines/<slug>/…` —— 示例配图

**修改文件**

- `src/components/Header.tsx` —— 增加「Restaurants / 餐厅 · Wine / 酒评」导航标签与激活态
- 一处双语 UI 字典（酒评板块用），可新建 `src/lib/wineI18n.ts` 或就近内联

## 3. 入口标签（Header 导航）

在现有 Header 的 logo 与语言切换之间插入导航标签，形式参考 coffee-diary 的 `Tracker | Diary`：

```
[🍍 猪比登美食指南]        Restaurants · Wine        [中文]
                              ▔▔▔▔▔▔▔▔ (激活态)
```

- **Restaurants / 餐厅** → `/`（在首页与餐厅详情页为激活态）
- **Wine / 酒评** → `/wine`（在酒评列表与详情页为激活态）

样式适配地中海渐变 Header：白色文字、JetBrains Mono 小号大写字距、激活态用**爱琴海蓝 `#0F84B5`** 下划线。激活态由 `usePathname()` 判断（`/wine` 前缀 → Wine 激活，否则 Restaurants 激活）；标签文案随 `useLang()` 切换。

## 4. 视觉系统（coffee-diary 版式 + gourmet 配色）

保留 coffee-diary 的编排式结构、排版节奏、首字下沉笔记、broadsheet 细线卡片、三档口味滑块，仅重新配色与字体归一：

| 角色 | coffee-diary | 酒评页 |
|---|---|---|
| 纸底 paper | 暖 crema 奶油 | gourmet 奶油 `#FCFAF4` |
| 墨色 ink | 咖啡棕 | gourmet 藏青墨 `#13314A` |
| 主强调色 accent | terracotta | **复古红砖 `#C84B2F`**（kicker、滑块圆点、首字下沉、激活态、section 标记） |
| 次强调色 | — | **爱琴海蓝 `#0F84B5`**（分隔线、hover、蓝色面板底） |
| 字形 glyph | ☕ | 🍷 |

**字体**：复用 gourmet 已加载的 Fraunces（标题）+ Inter（正文）+ JetBrains Mono（标签）+ 思源宋体（中文），不新增字体。（如后续想要 coffee-diary 那种更"杂志感"的衬线正文，可将 Inter 换成衬线体，非本期默认。）

**CSS 移植与作用域**：

- 从 `diary.css` 移植 list / detail / 组件相关样式，**不移植** coffee-diary 的 `header`、`body`、`html`、`*` reset、`.wordmark`、`.nav-*`、`.lang-toggle`（这些属于 gourmet 自有 Header，单独在 `Header.tsx` 处理）。
- 酒评页面根节点包一层 `<div className="wine-scope">`；`wine.css` 中调色板变量与所有选择器统一作用域到 `.wine-scope`，避免 `.card` / `.hero` / `.panel` 等通用类名泄漏影响站点其余部分或与 Tailwind 冲突。
- OKLCH 调色板变量重映射为上表的 gourmet 配色。

## 5. 数据模型

结构化条目存于 `src/data/wines.json`，经 `src/lib/wines.ts` 定义类型与工具函数读取（结构化品鉴数据用 JSON 比餐厅的 markdown 更合适，也与 coffee-diary 的 `diary.json` 1:1 对应，移植更忠实）。

```ts
type Localized = { zh: string; en: string }
type Level = 'low' | 'medium' | 'high'
type WineType = 'red' | 'white' | 'rose' | 'sparkling'

interface WineFlavour { icon: string; label: Localized }

interface WineProfile {            // 四项指标，顺序固定
  body?: Level
  tannin?: Level
  acidity?: Level
  sweetness?: Level
}

interface WineDetails {            // Details 信息栏，展示顺序即此顺序
  producer?: string               // 生产商（专有名词，通常单一字符串）
  country?: Localized             // 国家
  flag?: string                   // 🇫🇷（国家旗帜，也用于产区行前缀）
  region?: Localized              // 产区
  varieties?: Localized           // 葡萄品种（支持混酿，如 "60% Cabernet / 40% Merlot"）
  alcohol?: string                // 酒精度，如 "13.0%"
  vintage?: string                // 年份，如 "2021" 或 "NV"
  size?: string                   // 容量，如 "750 ml"
  closure?: Localized             // 封瓶，如 天然软木塞 / Natural cork
  notes?: Localized               // 可选：产区叙述文字
  map_url?: string                // 可选：产区地图链接
}

interface WineEntry {
  slug: string
  date?: string                   // 品鉴日期 YYYY-MM-DD（列表排序键）
  wine_name: Localized            // 酒名
  winery: Localized               // 酒庄
  image?: string
  images?: string[]               // 2+ 张 → 杂志版式，0/1 张 → hero 版式
  color?: 'pink'|'peach'|'blue'|'green'|'cocoa'   // hero 背景 wash
  wine_type?: WineType            // 驱动筛选 pill
  price_aud?: string              // 价格（hero 价签，与 details.size 合并显示）
  url?: string                    // 购买/来源链接
  tags?: Localized[]              // 标签（国家/品种/风格）
  flavours?: WineFlavour[]        // 风味 emoji + 标签
  story?: Localized               // 品鉴笔记（首字下沉）
  pairing?: Localized             // 配餐建议（对应 coffee 的 brew.method）
  profile?: WineProfile           // 四项滑块
  summary?: Localized             // 总评（高亮带，🍷 字形）
  details?: WineDetails           // 8 字段信息栏
}
```

**四项指标（滑块）**：Body / Tannin / Acidity / Sweetness，各三档（Low / Medium / High），复用 coffee-diary 的三停滑块渲染。ZH 档位标签用 低 / 中 / 高。（后续如需 Body 用「轻盈–饱满」、Sweetness 用「干–甜」等分维标签，可再加，非本期。）

**Details 信息栏（每瓶必含 8 项，顺序固定）**：Producer、Country、Region、Varieties、Alcohol、Vintage、Size、Closure。Country 行带国旗 emoji，`flag` 同时用于产区行前缀。可选的「产区叙述 + 地图链接」块仅在提供 `notes`/`map_url` 时渲染。

## 6. 列表页（`/wine`）

- 页头：标题 + 斜体引言（`listTitle` / `listIntro`）。
- 控件：搜索框 + 类型筛选 pill：**All / Red / White / Rosé / Sparkling**（对应 coffee 的烘焙筛选）。
- 结果：broadsheet 细线卡片网格，每张 = 缩略图 + 酒名 + 酒庄 + 风味 chips。
- 搜索匹配酒名 / 酒庄 / 产区 / 品种（zh+en 合并小写匹配）。
- 空状态：无数据 → 🍷 + 「还没有酒 / No wines yet」；有数据但无匹配 → 🔍 + 「没有匹配的酒」。

## 7. 详情页（`/wine/[slug]`）

沿用 coffee-diary 两种版式：**2+ 张图 → 杂志跨页版式（A）**，**0/1 张图 → 大 hero 版式（B）**。区块顺序：

1. Hero：图片 + 酒名 + 酒庄 + 品鉴日期 + 价格/容量 + 标签
2. 风味 Flavour Notes（emoji 图标组）
3. 品鉴笔记 Notes（首字下沉）
4. 双栏面板：**配餐 Pairing（左）+ 风味曲线 Taste Profile 四项滑块（右）**
5. 总评 Summary（爱琴海蓝/红砖高亮带 + 🍷）
6. Details 信息栏（8 字段）
7. 产区 Region（可选叙述 + 地图链接）
8. 来源链接 Source（购买/产品页，可选）

## 8. 双语 i18n

酒评板块维护一份双语 UI 字典（结构参考 coffee-diary `diary-common.js` 的 `UI` 对象），由 `useLang()` 驱动：

- 导航：Restaurants/餐厅、Wine/酒评
- 板块：Flavour Notes/风味、Notes/品鉴笔记、Pairing/配餐、Taste Profile/风味曲线、Summary/总评、Details/详情、Region/产区、Source/查看购买
- Details 字段标签：Producer/生产商、Country/国家、Region/产区、Varieties/葡萄品种、Alcohol/酒精度、Vintage/年份、Size/容量、Closure/封瓶
- 指标：body/酒体、tannin/单宁、acidity/酸度、sweetness/甜度；档位 Low·Medium·High / 低·中·高
- 筛选：All/全部、Red/红、White/白、Rosé/桃红、Sparkling/气泡
- 列表：listTitle "Wine Diary" / "酒评日记"，listIntro "Every bottle I've opened — and written down." / "每一瓶我开过、写下来的酒。"
- 返回/空态/未找到等提示语

内容翻译遵循既定调性：**简洁、轻松、有趣**，非正式 Michelin 腔。

## 9. 示例内容

编写 1–2 瓶合理的双语示例酒，含完整四项指标、品鉴笔记、配餐、总评与 8 字段 Details，配 1–2 张占位/示例图。内容明确可编辑，附可用的 🍷 空状态。

## 10. 构建与验证

- `npm run build` 通过，且 `/wine` 与每个 `/wine/[slug]` 均正常静态生成。
- 图片 `src` 一律用 `basePath` 前缀（`src/lib/basePath.ts`），否则线上图片会挂。
- 视觉走查：列表卡片、详情两种版式、四项滑块、Header 导航激活态、中英切换。
- 不自动提交/推送，除非用户明确要求。

## 11. 范围外（YAGNI）

- 不做酒评的增删改后台，内容手工编辑 `wines.json`。
- 不做分维度自定义滑块标签（本期统一 Low/Medium/High）。
- 不改动餐厅指南的既有页面与数据（仅 Header 增加导航）。
- 不新增字体依赖。
