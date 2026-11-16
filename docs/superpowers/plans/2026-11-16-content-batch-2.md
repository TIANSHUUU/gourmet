# 第二批成稿 + 「烘焙」分类 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 新增第 4 个吃喝分类「烘焙 / Bakeries」(可颂徽章),把 Suburbia 和 Soma Pastry 挪进去;新增两座城市(莫宁顿半岛、金泽);从 Google Takeout 成稿 5 家:Wasshoi Bar and Grill、Tatin、Madame Sourdough、Crittenden Wines、金沢鮨 藍AO。

**Architecture:** 分类是一个 kind 字符串,贯穿 `restaurants.ts`(类型)→ `places.ts`(zod 允许值)→ `map/kinds.ts`(顺序/颜色/emoji)→ `scripts/lib/badges.mjs`(SVG 徽章,颜色必须与 kinds 一致,有测试)→ `mapI18n.ts` / `CategoryNav.tsx`(中英标签)。徽章改完要 `badges:render` + `map:assets` 产出 `public/map-assets/icons/badge-bakery.png` 并更新 manifest。城市只是 `cities.json` 里两条记录。5 家条目照 Suburbia 那套:编辑决定(分类、slug、链接、日期、标签)本计划已定死,执行者只写 tagline 和双语正文(忠实原文)。

**Tech Stack:** Next 16 静态导出、zod、Vitest 2、sharp(徽章渲染与照片导入)。无新依赖。

**基线:** main @ `55f55b4`,`npx vitest run` = **168 passed**。

---

## 开工前必读

- 先完整读 `CLAUDE.md`(尤其「Adding a new place」「Importing Google reviews (Takeout)」「Map」里 Art assets 与 Category badges 两段)。
- 工作目录 `/Users/tantianshu/Documents/code/gourmet/web`(git 根)。共用检出,不要新建 worktree。
- 分支 `feat/content-batch-2`,从 main 切出。每个 Task 一次 commit,提交信息用计划里的。
- **不 push、不合并 main、不改 `.env*`、不启动 dev 服务器**(指挥官自己起预览截图)。
- 工作区里 `docs/superpowers/HANDOFF.md` 有指挥官未提交的改动,`git status` 看到属正常:**不要 add、不要还原**。
- `field-notes/takeout/` 的草稿不要提交、不要删。本计划文件还没进 git,Task 1 的 commit 把它一起加上。

## 已定的编辑决定(照抄,不要改)

| slug | 名字 | 目录 | category | suburb / city | 类型标签 en / zh | visited | 照片目录(原图) |
|---|---|---|---|---|---|---|---|
| `wasshoi` | Wasshoi Bar and Grill | restaurants | food | South Yarra / Melbourne | Japanese grill / 日式炭烤 | 2026-08-25 | `/Users/tantianshu/Documents/code/gourmet/restaurant/Wasshoi/imgs`(1 张) |
| `tatin` | Tatin | restaurants | bakery | Balwyn North / Melbourne | Pastry & sourdough / 酥点 · 酸种面包 | 2026-07-05 | `/Users/tantianshu/Documents/code/gourmet/cafe/tatin-bakery/imgs`(2 张) |
| `madame-sourdough` | Madame Sourdough | restaurants | bakery | Mont Albert North / Melbourne | Sourdough bakery / 酸种面包店 | 2026-07-19 | `/Users/tantianshu/Documents/code/gourmet/cafe/madame-sourdough/imgs`(2 张) |
| `crittenden-wines` | Crittenden Wines | restaurants | food | Dromana / Mornington Peninsula | Winery restaurant / 酒庄餐厅 | 2026-10-26 | `/Users/tantianshu/Documents/code/gourmet/restaurant/Crittenden_Wines/imgs`(3 张) |
| `kanazawa-sushi-ao` | 金沢鮨 藍AO | restaurants | food | Katamachi / Kanazawa | Sushi omakase / 寿司 Omakase | 2026-09-16 | `/Users/tantianshu/Documents/code/gourmet/restaurant/金沢鮨藍AO/imgs`(5 张,含 2 张 .JPG) |

- `visited` 都是 Takeout 评论日期(业主没有附注别的到访日期)。
- `map_url` 一律「带店名 + 保留 Takeout 的 ftid `!1s0x0:0x…`」,指挥官已在浏览器里逐个点开,都直达对的店,坐标与草稿一致。具体值见 Task 4。
- 「烘焙」= 面包店、酥点、可颂、派类甜点铺。颜色 `#C2557A`(玫瑰色,和现有 7 色都分得开),地图 emoji 🥐,中英标签「烘焙 / Bakeries」,排在「咖啡」之后、「酒吧」之前。徽章图案指挥官已出图核对过 32 px 可辨认。

---

### Task 1: 新增 `bakery` 分类(类型 / 校验 / 颜色 / 徽章 / 中英标签)

**Files:**
- Test: `src/lib/places.test.ts`
- Modify: `src/lib/restaurants.ts`、`src/lib/places.ts`、`src/lib/map/kinds.ts`、`src/lib/mapI18n.ts`、`src/components/CategoryNav.tsx`
- Modify: `scripts/lib/badges.mjs`、`scripts/render-badges.mjs`(注释)、`scripts/ingest-map-assets.mjs`(合成占位)
- Create(脚本生成): `public/map-assets/icons/badge-bakery.png`;Modify(脚本生成): `public/map-assets/manifest.json`

- [ ] **Step 1: 切分支**

```bash
cd /Users/tantianshu/Documents/code/gourmet/web
git checkout main && git checkout -b feat/content-batch-2
```

- [ ] **Step 2: 写失败的测试**

`src/lib/places.test.ts` 的 `describe('parsePlaceFile', …)` 里,第一个 `it(...)`(parses a valid restaurant file…)之后插入:

```ts
  it('accepts bakery as a restaurants/ category', () => {
    const raw = base.replace('category: food', 'category: bakery')
    expect(parsePlaceFile(raw, 'restaurants/test.md', RESTAURANT_KINDS).kind).toBe('bakery')
  })
```

- [ ] **Step 3: 跑测试确认失败**

Run: `npx vitest run src/lib/places.test.ts`
Expected: 新测试 FAIL(zod 报 category 不在允许值里 / Invalid enum value)。

- [ ] **Step 4: 类型与校验**

`src/lib/restaurants.ts`:

```ts
export type Category = 'food' | 'cafe' | 'bar'
```

改为

```ts
export type Category = 'food' | 'cafe' | 'bakery' | 'bar'
```

`src/lib/places.ts`:

```ts
export const RESTAURANT_KINDS = ['food', 'cafe', 'bar'] as const
```

改为

```ts
export const RESTAURANT_KINDS = ['food', 'cafe', 'bakery', 'bar'] as const
```

- [ ] **Step 5: 顺序 / 颜色 / emoji(`src/lib/map/kinds.ts`)**

```ts
export const KIND_ORDER: PlaceKind[] = ['food', 'cafe', 'bar', 'sight', 'activity', 'shop', 'stay']
```

改为

```ts
export const KIND_ORDER: PlaceKind[] = ['food', 'cafe', 'bakery', 'bar', 'sight', 'activity', 'shop', 'stay']
```

`KIND_COLORS` 里 `cafe: '#8C5A3C',` 这一行之后插入一行:

```ts
  bakery: '#C2557A',
```

`KIND_GLYPHS` 里 `cafe: '☕',` 这一行之后插入一行:

```ts
  bakery: '🥐',
```

- [ ] **Step 6: 中英标签**

`src/lib/mapI18n.ts` 英文那块:

```ts
      food: 'Food', cafe: 'Cafés', bar: 'Bars',
```

改为

```ts
      food: 'Food', cafe: 'Cafés', bakery: 'Bakeries', bar: 'Bars',
```

中文那块:

```ts
      food: '美食', cafe: '咖啡', bar: '酒吧',
```

改为

```ts
      food: '美食', cafe: '咖啡', bakery: '烘焙', bar: '酒吧',
```

`src/components/CategoryNav.tsx`:

```ts
  cafe: { en: 'Cafés', zh: '咖啡' },
```

之后插入一行

```ts
  bakery: { en: 'Bakeries', zh: '烘焙' },
```

并把

```ts
const ORDER: CategoryFilter[] = ['all', 'food', 'cafe', 'bar']
```

改为

```ts
const ORDER: CategoryFilter[] = ['all', 'food', 'cafe', 'bakery', 'bar']
```

- [ ] **Step 7: 徽章 SVG(`scripts/lib/badges.mjs`)**

第 1 行注释里的 `7 种 kind` 改成 `8 种 kind`。

`BADGE_COLORS` 里 `cafe: '#8C5A3C',` 之后插入一行(**位置必须在 cafe 与 bar 之间**,`BADGE_KINDS` 的顺序要等于 `KIND_ORDER`,有测试):

```js
  bakery: '#C2557A',
```

`GLYPHS` 里 `cafe: (c) => \`…\`,` 整项之后、`// 红酒杯(杯肚半满)` 之前插入:

```js
  // 可颂(五段分层的弯月),整体下移 6 px 让视觉重心居中
  bakery: (c) => `<g transform="translate(0 6)">
    <path d="M16 62 Q16 50 26 46 Q32 32 48 28 Q64 32 70 46 Q80 50 80 62 Q80 68 74 68 Q68 62 62 62 Q58 54 48 54 Q38 54 34 62 Q28 62 22 68 Q16 68 16 62 Z" fill="${CREAM}"/>
    <path d="M38 32 Q43 43 41 55" fill="none" stroke="${c}" stroke-width="3.4" stroke-linecap="round"/>
    <path d="M58 32 Q53 43 55 55" fill="none" stroke="${c}" stroke-width="3.4" stroke-linecap="round"/>
    <path d="M27 47 Q32 54 31 62" fill="none" stroke="${c}" stroke-width="3" stroke-linecap="round"/>
    <path d="M69 47 Q64 54 65 62" fill="none" stroke="${c}" stroke-width="3" stroke-linecap="round"/>
    </g>`,
```

`scripts/render-badges.mjs` 第 1 行注释里的 `7 枚` 改成 `8 枚`。

`scripts/ingest-map-assets.mjs` 合成占位那一行:

```js
  const badges = { food: ['F', '#E8603C'], cafe: ['C', '#8C5A3C'], bar: ['B', '#7B4B94'], sight: ['S', '#2F8F83'], activity: ['A', '#3C8ABF'], shop: ['Sh', '#D58A2B'], stay: ['St', '#5A6B9E'] }
```

改为

```js
  const badges = { food: ['F', '#E8603C'], cafe: ['C', '#8C5A3C'], bakery: ['Bk', '#C2557A'], bar: ['B', '#7B4B94'], sight: ['S', '#2F8F83'], activity: ['A', '#3C8ABF'], shop: ['Sh', '#D58A2B'], stay: ['St', '#5A6B9E'] }
```

- [ ] **Step 8: 渲染徽章并入库**

```bash
npm run -s badges:render
npm run -s map:assets
git status --short public/
```

Expected:`badges:render` 打印「渲染 8 枚徽章 → …/badge-{food,cafe,bakery,bar,sight,activity,shop,stay}.png」;`map:assets` 跑完;`git status --short public/` **只应**出现

```
 M public/map-assets/manifest.json
?? public/map-assets/icons/badge-bakery.png
```

`grep -o '"badge-bakery"' public/map-assets/manifest.json` 应打印 `"badge-bakery"`。

若 `git status` 还出现其他 `public/` 文件被改(说明重新渲染不是逐字节一致),先只暂存这两个,再把其余的还原,并在报告里写明是哪些文件:

```bash
git add public/map-assets/icons/badge-bakery.png public/map-assets/manifest.json
git checkout -- public/
git status --short public/
```

(`git checkout -- public/` 只还原未暂存的改动,已 add 的两个不受影响。)

- [ ] **Step 9: 跑测试确认通过**

Run: `npx vitest run`
Expected: **170 passed**(168 + 本 Task 新增的 1 个 `it` + `src/lib/cover.test.ts` 的 `it.each` 自动多出的 bakery 一项)。其中 `scripts/lib/badges.test.mjs`(颜色/顺序一致、8 枚都能渲染)与 `src/lib/cover.test.ts`(`badge-bakery.png` 存在)必须通过。

- [ ] **Step 10: lint**

Run: `npm run lint`
Expected: 无报错(TypeScript 会要求 `mapI18n` / `CategoryNav` 的 Record 都含 bakery,Step 6 已补)。

- [ ] **Step 11: Commit(连同本计划文件)**

```bash
git add src/lib/places.test.ts src/lib/restaurants.ts src/lib/places.ts src/lib/map/kinds.ts src/lib/mapI18n.ts src/components/CategoryNav.tsx scripts/lib/badges.mjs scripts/render-badges.mjs scripts/ingest-map-assets.mjs public/map-assets/icons/badge-bakery.png public/map-assets/manifest.json docs/superpowers/plans/2026-11-16-content-batch-2.md
git commit -m "Add a Bakeries category with a croissant badge"
```

---

### Task 2: Suburbia 与 Soma Pastry 改归「烘焙」

**Files:**
- Modify: `src/data/restaurants/suburbia-bakery.md`、`src/data/restaurants/soma-pastry.md`(各改 `category:` 一行)

- [ ] **Step 1: 改分类**

`src/data/restaurants/suburbia-bakery.md` 里 `category: cafe` 改为 `category: bakery`。
`src/data/restaurants/soma-pastry.md` 里 `category: food` 改为 `category: bakery`。
其余(类型标签、正文)不动。

- [ ] **Step 2: 测试**

Run: `npx vitest run`
Expected: **170 passed**。

- [ ] **Step 3: Commit**

```bash
git add src/data/restaurants/suburbia-bakery.md src/data/restaurants/soma-pastry.md
git commit -m "Move Suburbia Bakery and Soma Pastry into Bakeries"
```

---

### Task 3: 新城市:莫宁顿半岛、金泽(TDD)

**Files:**
- Test: `src/lib/map/cities.test.ts`
- Modify: `src/data/map/cities.json`

- [ ] **Step 1: 写失败的测试**

`src/lib/map/cities.test.ts` 的 `it('maps known places to their city', …)` 里,`mount-gambier` 那行之后追加两行:

```ts
    expect(cityOf([145.019116, -38.3353])?.slug).toBe('mornington-peninsula') // Crittenden Wines
    expect(cityOf([136.650668, 36.558865])?.slug).toBe('kanazawa') // 金沢鮨 藍AO
```

- [ ] **Step 2: 跑测试确认失败**

Run: `npx vitest run src/lib/map/cities.test.ts`
Expected: FAIL(`cityOf` 返回 null,`expected undefined to be 'mornington-peninsula'`)。

- [ ] **Step 3: 加城市**

`src/data/map/cities.json` 数组末尾(`mount-gambier` 那条之后)追加两条,注意给 `mount-gambier` 那条的 `}` 后加逗号:

```json
  {
    "slug": "mornington-peninsula",
    "name_zh": "莫宁顿半岛",
    "name_en": "Mornington Peninsula",
    "bounds": [[144.65, -38.5], [145.3, -38.12]],
    "view": { "center": [145.0, -38.33], "zoom": 14, "pitch": 45, "bearing": 0 }
  },
  {
    "slug": "kanazawa",
    "name_zh": "金泽(石川)",
    "name_en": "Kanazawa, Ishikawa",
    "bounds": [[136.55, 36.48], [136.78, 36.65]],
    "view": { "center": [136.6566, 36.5613], "zoom": 14.5, "pitch": 45, "bearing": 0 }
  }
```

(莫宁顿半岛北界 -38.12 在墨尔本南界 -38.1 之南,两城不重叠;`zoom` 是单店时的镜头,多店时自动 fitBounds。)

- [ ] **Step 4: 跑测试确认通过**

Run: `npx vitest run src/lib/map/cities.test.ts`
Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git add src/lib/map/cities.test.ts src/data/map/cities.json
git commit -m "Map: add Mornington Peninsula and Kanazawa"
```

---

### Task 4: 成稿 5 家

**Files:**
- Create: `src/data/restaurants/{wasshoi,tatin,madame-sourdough,crittenden-wines,kanazawa-sushi-ao}.md`
- Create(脚本生成): `public/images/<slug>/*.jpg`
- 读(不改、不提交):`field-notes/takeout/{wasshoi-bar-and-grill,tatin,madame-sourdough,crittenden-wines,ao}.md`

- [ ] **Step 1: 导入照片**

```bash
npm run -s photos:import -- /Users/tantianshu/Documents/code/gourmet/restaurant/Wasshoi/imgs wasshoi
npm run -s photos:import -- /Users/tantianshu/Documents/code/gourmet/cafe/tatin-bakery/imgs tatin
npm run -s photos:import -- /Users/tantianshu/Documents/code/gourmet/cafe/madame-sourdough/imgs madame-sourdough
npm run -s photos:import -- /Users/tantianshu/Documents/code/gourmet/restaurant/Crittenden_Wines/imgs crittenden-wines
npm run -s photos:import -- "/Users/tantianshu/Documents/code/gourmet/restaurant/金沢鮨藍AO/imgs" kanazawa-sushi-ao
```

Expected:依次 1 / 2 / 2 / 3 / 5 张;webp 都是 `1062×1416`(AO 的 `2.webp` 是横图 `1600×1200`,两张 `.JPG` 长边缩到 1600),每条末尾打印 `images:` 片段,粘进下面对应文件。

- [ ] **Step 2: 建 5 个文件**

frontmatter 照抄(`images:` 用 Step 1 打印的列表);`tagline_en` / `tagline_zh` 与 `## en` / `## zh` 由你按 Step 3 写。

`src/data/restaurants/wasshoi.md`:

```markdown
---
slug: wasshoi
name: "Wasshoi Bar and Grill"
suburb: "South Yarra"
city: "Melbourne"
category: food
cuisine_en: "Japanese grill"
cuisine_zh: "日式炭烤"
map_url: "https://www.google.com/maps/place/Wasshoi+Bar+and+Grill/data=!4m2!3m1!1s0x0:0xff01ed38e3a0ac38"
coords: [144.992586, -37.846028]
map_type: google
visited: "2026-08-25"
tagline_en: "<你写>"
tagline_zh: "<你写>"
images:
  - "1.jpg"
---

## en

<你写>

## zh

<你写>
```

`src/data/restaurants/tatin.md`:

```markdown
---
slug: tatin
name: "Tatin"
suburb: "Balwyn North"
city: "Melbourne"
category: bakery
cuisine_en: "Pastry & sourdough"
cuisine_zh: "酥点 · 酸种面包"
map_url: "https://www.google.com/maps/place/Tatin/data=!4m2!3m1!1s0x0:0x600a05a4a07e9072"
coords: [145.077777, -37.783529]
map_type: google
visited: "2026-07-05"
tagline_en: "<你写>"
tagline_zh: "<你写>"
images:
  - "1.jpg"
  - "2.jpg"
---

## en

<你写>

## zh

<你写>
```

`src/data/restaurants/madame-sourdough.md`:

```markdown
---
slug: madame-sourdough
name: "Madame Sourdough"
suburb: "Mont Albert North"
city: "Melbourne"
category: bakery
cuisine_en: "Sourdough bakery"
cuisine_zh: "酸种面包店"
map_url: "https://www.google.com/maps/place/Madame+Sourdough/data=!4m2!3m1!1s0x0:0xea17d5ddab0fd6e6"
coords: [145.11142, -37.800117]
map_type: google
visited: "2026-07-19"
tagline_en: "<你写>"
tagline_zh: "<你写>"
images:
  - "1.jpg"
  - "2.jpg"
---

## en

<你写>

## zh

<你写>
```

`src/data/restaurants/crittenden-wines.md`:

```markdown
---
slug: crittenden-wines
name: "Crittenden Wines"
suburb: "Dromana"
city: "Mornington Peninsula"
category: food
cuisine_en: "Winery restaurant"
cuisine_zh: "酒庄餐厅"
map_url: "https://www.google.com/maps/place/Crittenden+Wines/data=!4m2!3m1!1s0x0:0xd01ae6f5f5e9d47"
coords: [145.019116, -38.3353]
map_type: google
visited: "2026-10-26"
tagline_en: "<你写>"
tagline_zh: "<你写>"
images:
  - "1.jpg"
  - "2.jpg"
  - "3.jpg"
---

## en

<你写>

## zh

<你写>
```

`src/data/restaurants/kanazawa-sushi-ao.md`:

```markdown
---
slug: kanazawa-sushi-ao
name: "金沢鮨 藍AO"
suburb: "Katamachi"
city: "Kanazawa"
category: food
cuisine_en: "Sushi omakase"
cuisine_zh: "寿司 Omakase"
map_url: "https://www.google.com/maps/place/%E9%87%91%E6%B2%A2%E9%AE%A8+%E8%97%8DAO/data=!4m2!3m1!1s0x0:0x4200479eb582cde3"
coords: [136.650668, 36.558865]
map_type: google
visited: "2026-09-16"
tagline_en: "<你写>"
tagline_zh: "<你写>"
images:
  - "1.jpg"
  - "2.jpg"
  - "3.jpg"
  - "4.jpg"
  - "5.jpg"
---

## en

<你写>

## zh

<你写>
```

- [ ] **Step 3: 写正文与 tagline(规则,业主 2026-11-16 定的)**

底稿是各自草稿的 `## takeout` 段(业主自己写的评论)。**忠实原文,不增不减**:

1. **原文是英文的 4 家**(Wasshoi、Tatin、Madame Sourdough、Crittenden):`## en` = 业主原文,**只修明显的笔误和语法**(例如漏冠词、单复数),**不改写、不换词、不加句子**;业主的缩写和 emoji(`def`、`imo`、`bc`、`🥰`)照留。`## zh` = 按原文逐句忠实翻译,自然口语化(不要翻译腔),不增不减;emoji 照留;店名、`tsukune`、`sake`、`cruffin`、`danish`、`Mornington` 这类专名可保留英文或用通行中文。
2. **原文是中文的 AO**:`## zh` = 业主原文,只修笔误和标点(例如半角左括号配全角右括号「(我们点的…追加了）」统一成全角「（…）」);`## en` = 忠实英译,不增不减。「喉黑」译作 `nodoguro (blackthroat seaperch)`,「ikyu」写作 `Ikyu`(订位网站)。
3. 段落按原文分段(空行分段);原文两段就两段。
4. **绝对不要**加原文没有的话:不加总结句、俏皮话、「强烈推荐」之类;不写星级、价格(原文提到的「a little pricey」「性价比高」照译即可)。
5. tagline:一句话,只用该评论里出现的事实和说法;`tagline_en` ≤ 12 个词,`tagline_zh` ≤ 22 个字。
6. 写完自查:`grep -n '<你写>' src/data/restaurants/*.md` 无输出;中英两版逐句对应。

- [ ] **Step 4: lint + 全量测试 + 构建**

Run: `npm run lint && npx vitest run && NEXT_PUBLIC_BASE_PATH=/gourmet npm run build`
Expected: lint 无报错;**170 passed**;构建成功。

```bash
ls out | grep -E '^(wasshoi|tatin|madame-sourdough|crittenden-wines|kanazawa-sushi-ao)\.html$'
ls public/images/{wasshoi,tatin,madame-sourdough,crittenden-wines,kanazawa-sushi-ao} | head -30
grep -c 'images/[a-z-]*/undefined' out/index.html
```

Expected:列出 5 个 `.html`;各目录 1 / 2 / 2 / 3 / 5 个 jpg;最后一条输出 `0`。

- [ ] **Step 5: Commit**

```bash
git add src/data/restaurants/wasshoi.md src/data/restaurants/tatin.md src/data/restaurants/madame-sourdough.md src/data/restaurants/crittenden-wines.md src/data/restaurants/kanazawa-sushi-ao.md public/images/wasshoi public/images/tatin public/images/madame-sourdough public/images/crittenden-wines public/images/kanazawa-sushi-ao
git commit -m "Add five places from Google Takeout: Wasshoi, Tatin, Madame Sourdough, Crittenden Wines, Sushi AO"
```

---

### Task 5: 文档

**Files:**
- Modify: `CLAUDE.md`(三处)

- [ ] **Step 1: 分类说明**

`CLAUDE.md` 里

```
restaurants/ only allows `food | cafe | bar`)
```

替换为

```
restaurants/ only allows `food | cafe | bakery | bar`; `bakery` = bakeries, pastry and croissant shops, pie shops — added 2026-11-16 with a croissant badge, colour `#C2557A`)
```

- [ ] **Step 2: 徽章数量**

```
holds the 7 SVGs
```

替换为

```
holds the 8 SVGs (bakery = croissant, added 2026-11-16)
```

- [ ] **Step 3: 已上线条目**

```
suburbia-bakery (bakery café, Fairfield/Melbourne — first entry from Google Takeout; its 3 photos are webp downloads from the owner's Google review, 1062×1416)
```

替换为

```
suburbia-bakery (bakery café, Fairfield/Melbourne — first entry from Google Takeout; its 3 photos are webp downloads from the owner's Google review, 1062×1416), wasshoi (Japanese grill, Prahran Market/Melbourne), tatin (bakery, Balwyn North/Melbourne), madame-sourdough (bakery, Mont Albert North/Melbourne), crittenden-wines (winery restaurant, Dromana/Mornington Peninsula), kanazawa-sushi-ao (sushi omakase, Katamachi/Kanazawa). soma-pastry and suburbia-bakery moved to `bakery` on 2026-11-16
```

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md
git commit -m "Docs: Bakeries category, two new cities, batch-2 places"
```

---

## 收尾报告(执行者写给指挥官)

- 分支名、5 个 commit 的 hash、`git status`(应只剩 `HANDOFF.md` 是指挥官的未提交改动)。
- 测试数量(应为 170)、lint / build 结果、Task 1 Step 3 与 Task 3 Step 2 的失败信息(先红后绿)。
- Task 1 Step 8 的 `git status --short public/` 输出;是否有被还原的文件。
- 5 次 `photos:import` 的输出(每张尺寸和 KB)。
- 5 家的成稿全文:tagline 两条 + `## en` + `## zh` 原样贴出。
- 与计划的偏离及原因(没有就写「无」)。
- 最后一句:「等你看过文案和预览,再合并到 main 并 push」。

## 指挥官验收清单(不是执行者的活)

- 重跑 lint / test / build;`git log main..feat/content-batch-2` + 读 diff。
- 文案逐句对照草稿:有没有多出来的话、有没有改写业主原话。
- 预览:首页(新顺序:Crittenden 成头条;分类栏多了「烘焙」,点它只剩 4 家)、`/map` 分类 chips 有「烘焙」且徽章是可颂、城市 chips 多了莫宁顿半岛和金泽、两座新城的镜头、5 个详情页(手机)。
