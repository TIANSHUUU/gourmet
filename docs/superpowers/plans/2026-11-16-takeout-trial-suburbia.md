# Takeout 试跑:Suburbia Bakery 成稿 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 用一条 Google 评论(Suburbia Bakery by Seven Seeds)把「Takeout 草稿 → 成稿 → 首页 / 地图 / 详情页」整条管线跑一遍,并补上管线里缺的一环:没有照片的条目在首页卡片上不再是破图。

**Architecture:** 首页的 `RestaurantCard` / `FeaturedCard` 现在无条件读 `images[0]`;Takeout 草稿几乎都没照片(`images: []`),上线会出现 `/images/<slug>/undefined` 破图。新增 `src/lib/cover.ts`(纯函数 `badgePath`,单测保证 7 个分类的手绘徽章文件都在)和 `src/components/CoverFallback.tsx`(分类色淡底 + 居中徽章),两张卡片在 `images` 为空时改用它。详情页(`RestaurantDetail`)和地图卡片(`PlaceCard`)已经处理了无图,不动。然后把草稿成稿为 `src/data/restaurants/suburbia-bakery.md`(吃喝类,`cafe`)。

**Tech Stack:** Next 16(`output: "export"`)、React 19、Tailwind 4、Vitest 2。无新依赖。

**基线:** main @ `1bfaee9`,`npx vitest run` = **155 passed**。

---

## 开工前必读

- 先完整读 `CLAUDE.md`(尤其「Adding a new place」「Importing Google reviews」「Style」)。
- 工作目录 `/Users/tantianshu/Documents/code/gourmet/web`(git 根)。共用检出,不要新建 worktree。
- 分支:`feat/takeout-trial-suburbia`,从 main 切出。每个 Task 一次 commit,提交信息用计划里的。
- **不 push、不合并 main、不改 `.env*`、不启动 dev 服务器**(指挥官会自己起预览截图)。
- `field-notes/takeout/` 是 gitignore 目录,里面的草稿**不要提交、不要删**。
- 本计划文件本身还没进 git:Task 1 的 commit 里把它一起加上。

## 文件结构

| 文件 | 动作 | 职责 |
|---|---|---|
| `src/lib/cover.ts` | 新建 | `badgePath(kind)`:分类 → 手绘徽章的 public 路径(不含 basePath) |
| `src/lib/cover.test.ts` | 新建 | 路径格式 + 7 个分类的徽章 PNG 都真实存在 |
| `src/components/CoverFallback.tsx` | 新建 | 无图封面:分类色 12% 淡底 + 居中徽章 |
| `src/components/RestaurantCard.tsx` | 改 | `images` 为空时用 `CoverFallback`(徽章 64px) |
| `src/components/FeaturedCard.tsx` | 改 | 同上(徽章 80px) |
| `src/data/restaurants/suburbia-bakery.md` | 新建 | 成稿条目 |
| `CLAUDE.md` | 改 | 「Added so far」加一条;说明无图条目的首页占位 |

---

### Task 1: 无图条目的首页封面占位

**Files:**
- Create: `src/lib/cover.ts`
- Test: `src/lib/cover.test.ts`
- Create: `src/components/CoverFallback.tsx`
- Modify: `src/components/RestaurantCard.tsx`(整文件替换)
- Modify: `src/components/FeaturedCard.tsx`(整文件替换)

- [ ] **Step 1: 切分支**

```bash
cd /Users/tantianshu/Documents/code/gourmet/web
git checkout main && git checkout -b feat/takeout-trial-suburbia
```

Expected: `Switched to a new branch 'feat/takeout-trial-suburbia'`

- [ ] **Step 2: 写失败的测试**

新建 `src/lib/cover.test.ts`:

```ts
import fs from 'fs'
import path from 'path'
import { describe, expect, it } from 'vitest'
import { badgePath } from './cover'
import { RESTAURANT_KINDS, SPOT_KINDS } from './places'

describe('badgePath', () => {
  it('points at the painted category badge under public/', () => {
    expect(badgePath('cafe')).toBe('/map-assets/icons/badge-cafe.png')
  })

  it.each([...RESTAURANT_KINDS, ...SPOT_KINDS])('badge file exists for %s', kind => {
    const file = path.join(process.cwd(), 'public', badgePath(kind))
    expect(fs.existsSync(file)).toBe(true)
  })
})
```

- [ ] **Step 3: 跑测试确认失败**

Run: `npx vitest run src/lib/cover.test.ts`
Expected: FAIL,报 `Failed to resolve import "./cover"`(或 Cannot find module)。

- [ ] **Step 4: 写最小实现**

新建 `src/lib/cover.ts`:

```ts
import type { PlaceKind } from './places'

/**
 * 没有照片的条目,封面用该分类的手绘徽章占位。
 * 返回 public/ 下的路径,不含 basePath——展示层自己拼 `${basePath}${badgePath(kind)}`。
 * 徽章由 `npm run badges:render` + `npm run map:assets` 生成(见 CLAUDE.md Map 一节)。
 */
export function badgePath(kind: PlaceKind): string {
  return `/map-assets/icons/badge-${kind}.png`
}
```

- [ ] **Step 5: 跑测试确认通过**

Run: `npx vitest run src/lib/cover.test.ts`
Expected: PASS,**8 passed**(1 个路径 + 7 个分类)。

- [ ] **Step 6: 新建占位组件**

新建 `src/components/CoverFallback.tsx`:

```tsx
import Image from 'next/image'
import { basePath } from '@/lib/basePath'
import { badgePath } from '@/lib/cover'
import { KIND_COLORS } from '@/lib/map/kinds'
import type { Category } from '@/lib/restaurants'

/**
 * 没有照片的条目(Takeout 成稿多数如此)用的封面占位:分类色 12% 淡底 + 居中手绘分类徽章。
 * 父元素必须是 `relative` 且有固定宽高比(两张卡片的图片框本来就是)。
 */
export default function CoverFallback({ category, size }: { category: Category; size: number }) {
  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 flex items-center justify-center"
      style={{ backgroundColor: `${KIND_COLORS[category]}1F` }}
    >
      <Image
        src={`${basePath}${badgePath(category)}`}
        alt=""
        width={size}
        height={size}
        className="group-hover:scale-110 transition-transform duration-500"
      />
    </div>
  )
}
```

(`KIND_COLORS` 是 `#RRGGBB`,后缀 `1F` = 约 12% 不透明度的 8 位十六进制色。徽章源图 96px,所以显示尺寸不超过 96。)

- [ ] **Step 7: 改 `RestaurantCard.tsx`(整文件替换为下面内容)**

```tsx
'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useLang } from './LanguageContext'
import type { Restaurant } from '@/lib/restaurants'
import { basePath } from '@/lib/basePath'
import CoverFallback from './CoverFallback'

export default function RestaurantCard({ restaurant, number }: { restaurant: Restaurant; number: number }) {
  const { lang } = useLang()
  const { slug, name, suburb, city, category, cuisine_en, cuisine_zh, images } = restaurant
  const cuisine = lang === 'en' ? cuisine_en : cuisine_zh
  const num = String(number).padStart(2, '0')

  return (
    <Link href={`/${slug}`} className="group block">
      <div className="relative aspect-[16/10] overflow-hidden mb-3">
        {images.length > 0 ? (
          <Image
            src={`${basePath}/images/${slug}/${images[0]}`}
            alt={name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
            sizes="(max-width: 768px) 100vw, 50vw"
          />
        ) : (
          <CoverFallback category={category} size={64} />
        )}
      </div>
      <div className="flex items-center gap-2.5 mb-1">
        <span className="font-label text-xs font-bold text-[#F0742A]">№ {num}</span>
        <span className="font-label text-[10px] uppercase tracking-widest text-[#0C6E97]">{cuisine}</span>
      </div>
      <h2 className="font-display font-semibold text-xl text-[#13314A] leading-tight group-hover:text-[#F0742A] transition-colors">
        {name}
      </h2>
      <p className="font-label text-[10px] uppercase tracking-wider text-[#8A99A6] mt-1">
        {suburb} · {city}
      </p>
    </Link>
  )
}
```

- [ ] **Step 8: 改 `FeaturedCard.tsx`(整文件替换为下面内容)**

```tsx
'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useLang } from './LanguageContext'
import type { Restaurant } from '@/lib/restaurants'
import { basePath } from '@/lib/basePath'
import CoverFallback from './CoverFallback'

export default function FeaturedCard({ restaurant, number }: { restaurant: Restaurant; number: number }) {
  const { lang } = useLang()
  const { slug, name, suburb, city, category, cuisine_en, cuisine_zh, tagline_en, tagline_zh, images } = restaurant
  const cuisine = lang === 'en' ? cuisine_en : cuisine_zh
  const tagline = lang === 'en' ? tagline_en : tagline_zh
  const num = String(number).padStart(2, '0')

  return (
    <Link href={`/${slug}`} className="group block border-b-[1.5px] border-[#0F84B5] pb-8 mb-8">
      <div className="grid md:grid-cols-[1.15fr_1fr] gap-7 items-center">
        <div className="relative aspect-[4/3] overflow-hidden">
          {images.length > 0 ? (
            <Image
              src={`${basePath}/images/${slug}/${images[0]}`}
              alt={name}
              fill
              priority
              className="object-cover group-hover:scale-105 transition-transform duration-500"
              sizes="(max-width: 768px) 100vw, 560px"
            />
          ) : (
            <CoverFallback category={category} size={80} />
          )}
        </div>
        <div>
          <div className="flex items-center gap-3 mb-3">
            <span className="font-label text-xs font-bold text-[#F0742A]">№ {num}</span>
            <span className="font-label text-[10px] uppercase tracking-widest text-[#0C6E97] border-[1.5px] border-[#0F84B5] px-2 py-0.5">
              {cuisine}
            </span>
          </div>
          <h2 className="font-display font-semibold text-3xl md:text-4xl text-[#13314A] leading-tight mb-2 group-hover:text-[#F0742A] transition-colors">
            {name}
          </h2>
          {tagline && <p className="font-display italic text-lg text-[#4A5A68] leading-relaxed mb-3">{tagline}</p>}
          <p className="font-label text-[11px] uppercase tracking-wider text-[#8A99A6]">
            {suburb} · {city}
          </p>
        </div>
      </div>
    </Link>
  )
}
```

- [ ] **Step 9: lint + 全量测试**

Run: `npm run lint && npx vitest run`
Expected: lint 无报错;测试 **163 passed**(155 + 8)。

- [ ] **Step 10: Commit(连同本计划文件)**

```bash
git add src/lib/cover.ts src/lib/cover.test.ts src/components/CoverFallback.tsx src/components/RestaurantCard.tsx src/components/FeaturedCard.tsx docs/superpowers/plans/2026-11-16-takeout-trial-suburbia.md
git commit -m "Homepage cards: category-badge cover for places without photos"
```

---

### Task 2: 成稿 Suburbia Bakery

**Files:**
- Create: `src/data/restaurants/suburbia-bakery.md`
- 读(不改、不提交):`field-notes/takeout/suburbia-bakery-by-seven-seeds.md`
- 语气参照(只读):`src/data/restaurants/marys.md`、`src/data/restaurants/zareh.md`

**已定的编辑决定(照抄,不要改):**
- 吃喝类 → 放 `src/data/restaurants/`,`category: cafe`(谷歌把它归为咖啡店;Seven Seeds 是烘焙商;这会是首页「Cafés / 咖啡」下的第一家)。
- slug 缩短为 `suburbia-bakery`(和现有 `dons` / `zareh` 一样短)。
- `map_url` 换成带店名的写法,**保留** `!1s0x0:0x74d008e2d2ce52e1` 那段——Takeout 判重靠它(`scripts/lib/takeout.mjs` 的 `placeKey`)。指挥官已在浏览器里点开验证过能直达这家店。
- `visited` 用评论日期 `2026-07-11`(首页排第 3,在 Zareh、Don's 之后)。
- 没有照片:`images: []`(Task 1 的占位会接住)。

- [ ] **Step 1: 新建 `src/data/restaurants/suburbia-bakery.md`**

frontmatter 照抄下面,只把两条 tagline 和两段正文换成你写的:

```markdown
---
slug: suburbia-bakery
name: "Suburbia Bakery by Seven Seeds"
suburb: "Fairfield"
city: "Melbourne"
category: cafe
cuisine_en: "Bakery café"
cuisine_zh: "烘焙咖啡馆"
map_url: "https://www.google.com/maps/place/Suburbia+Bakery+by+Seven+Seeds/data=!4m2!3m1!1s0x0:0x74d008e2d2ce52e1"
coords: [145.026645, -37.768958]
map_type: google
visited: "2026-07-11"
tagline_en: "<你写>"
tagline_zh: "<你写>"
images: []
---

## en

<你写>

## zh

<你写>
```

- [ ] **Step 2: 写双语文案**

底稿是草稿 `field-notes/takeout/suburbia-bakery-by-seven-seeds.md` 的 `## takeout` 段(业主自己写的英文 Google 评论)。规则:

1. 语气:**简洁、轻快、略带幽默**,像跟朋友安利,不要米其林腔。先读 `marys.md` / `zareh.md` 的 `## en` / `## zh` 找手感。
2. `## en`:润色业主原文,保留第一人称和口吻,修掉笔误(原文 "Love this pace!" 是 "place";"coffee testing" 是 "coffee tasting")。**80–120 词**,一段或两段。
3. `## zh`:按意思重写成自然的中文,不逐字直译;**130–200 字**;中文标点用全角(,。!——)。店名、`Seven Seeds`、`shakshuka` 这类专名保留英文。
4. 事实只能来自原文,一条都别丢、一条都别加:
   - 面包和酥点选择多;味噌黑麦面包(miso rye loaf)很有意思;
   - 点了斑斓丹麦(pandan danish)和 shakshuka,都有意思又好吃;
   - 火腿芝士法棍不像名字那么平淡:面包的脆度和湿润度刚好,优质 provolone 芝士 + 火腿 + 芥末完美收尾;
   - 氛围温馨友好,宽敞明亮;
   - 去的那天正好有咖啡品鉴(coffee tasting),试了好几款 Seven Seeds——业主一直很喜欢的烘焙商。
   - **不要**写星级、价格、外带/早餐(这些在 Takeout 里但不在评论正文里)。
5. tagline:`tagline_en` **不超过 12 个词**,`tagline_zh` **不超过 22 个字**,一句话点出这家的记忆点。
6. 写完自查:中英两版事实一致;没有占位符 `<你写>` 残留。

- [ ] **Step 3: 城市归属与数据校验**

Run: `npx vitest run src/lib/map/cities.test.ts src/lib/places.test.ts`
Expected: 全部 PASS(Fairfield `[145.026645, -37.768958]` 在 melbourne 边界 `[[144.55,-38.1],[145.4,-37.55]]` 内,不需要改 `cities.json`)。

- [ ] **Step 4: lint + 全量测试 + 构建**

Run: `npm run lint && npx vitest run && NEXT_PUBLIC_BASE_PATH=/gourmet npm run build`
Expected: lint 无报错;测试 **163 passed**;构建成功。

再确认静态产物:

```bash
ls out | grep suburbia
grep -o 'badge-cafe.png' out/index.html | head -1
grep -o 'images/suburbia-bakery/undefined' out/index.html | head -1
```

Expected: 第一条列出 `suburbia-bakery.html`(和 `suburbia-bakery` 目录/`.txt`);第二条打印 `badge-cafe.png`;第三条**什么都不打印**(没有破图路径)。

- [ ] **Step 5: Commit**

```bash
git add src/data/restaurants/suburbia-bakery.md
git commit -m "Add Suburbia Bakery by Seven Seeds (first place from Google Takeout)"
```

---

### Task 3: 文档

**Files:**
- Modify: `CLAUDE.md`(两处)

- [ ] **Step 1: 「Added so far」加一条**

把 `CLAUDE.md` 里这一行:

```
- Added so far: marys (Nigerian, Collingwood/Melbourne), south-aus-hotel (wine bar, Mount Gambier), death-and-co (cocktail bar, CBD/Melbourne), soma-pastry (pastry shop, Towada/Aomori), dons (wine bar, Prahran/Melbourne), zareh (Middle Eastern, Collingwood/Melbourne)
```

替换为:

```
- Added so far: marys (Nigerian, Collingwood/Melbourne), south-aus-hotel (wine bar, Mount Gambier), death-and-co (cocktail bar, CBD/Melbourne), soma-pastry (pastry shop, Towada/Aomori), dons (wine bar, Prahran/Melbourne), zareh (Middle Eastern, Collingwood/Melbourne), suburbia-bakery (bakery café, Fairfield/Melbourne — first entry from Google Takeout, no photos yet)
```

- [ ] **Step 2: 「Adding a new place」第 1 条补一句无图说明**

把这一行末尾:

```
and paste the printed `images:` list. Older entries were copied as full-size originals; re-import them the same way if a page feels heavy.
```

替换为:

```
and paste the printed `images:` list. Older entries were copied as full-size originals; re-import them the same way if a page feels heavy. No photos yet → `images: []`: homepage cards fall back to `CoverFallback` (category colour wash + painted badge from `badgePath()` in `src/lib/cover.ts`), the detail page and the map card simply omit the picture.
```

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "Docs: no-photo cover fallback, Suburbia Bakery added"
```

---

## 收尾报告(执行者写给指挥官)

- 分支名、3 个 commit 的 hash 与信息、`git status` 是否干净(`field-notes/` 被忽略属正常)。
- 测试数量(应为 163)、lint / build 结果、Task 2 Step 4 三条 grep 的输出。
- 成稿全文:两条 tagline + `## en` + `## zh` 原样贴出,并注明英文词数、中文字数。
- 与计划的偏离及原因(没有就写「无」)。
- 最后一句:「等你看过文案和预览,再合并到 main 并 push」。

## 指挥官核实清单(不是执行者的活)

- 自己重跑 `npm run lint`、`npm run test`、`NEXT_PUBLIC_BASE_PATH=/gourmet npm run build`;`git log main..feat/takeout-trial-suburbia` + 读 diff。
- `preview_start web-dev`,截:首页卡片(桌面,中英各看一眼)、`/gourmet/suburbia-bakery` 详情页(手机 375)、`/gourmet/map?city=melbourne&place=suburbia-bakery` 地图卡片;`SendUserFile` 发业主。
- 文案对照草稿逐条核事实与语气。
