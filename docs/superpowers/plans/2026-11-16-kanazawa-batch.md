# 景点只上地图 + 金泽首批景点 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 业主 2026-11-17 定:景点 / 玩乐 / 购物 / 住宿(`spots/` 里的 `sight | activity | shop | stay`)**只出现在地图上**,不要有和吃喝一样的图文页。它们的照片和中英评论全文直接显示在地图卡片里。然后成稿金泽 4 个地点:石川县立图书馆、Daiwa Roynet Hotel Kanazawa Miyabi、好日山荘 金沢エムザ店(无照片)、mont-bell。

**Architecture:** 新增客户端安全的判断 `isSpotKind(kind)`(放 `src/lib/map/kinds.ts`,因为 `places.ts` 引用了 `fs`,不能进浏览器包)。`[slug]` 详情页只为吃喝生成,景点访问 `/<slug>` 一律 404。`placesToGeoJSON` 只给景点多带三个**字符串**属性:`review_en`、`review_zh`、`gallery`(封面之外的照片,用 `|` 连接;已有测试要求属性全是字符串)。`PlaceCard` 对景点显示评论段落和其余照片、隐藏「查看图文 →」按钮;吃喝类卡片完全不变。地图失效时的备用列表里,景点改链到 Google 地图。首页本来就只列吃喝,不动。

**Tech Stack:** Next 16 静态导出、React 19、Vitest 2。无新依赖。

**基线:** main @ `d52164b`,`npx vitest run` = **170 passed**。

---

## 开工前必读

- 先完整读 `CLAUDE.md`(尤其「Adding a new place」第 6 条与「Map」一节)。
- 工作目录 `/Users/tantianshu/Documents/code/gourmet/web`(git 根)。共用检出,不要新建 worktree。
- 分支 `feat/kanazawa-spots`,从 main 切出。每个 Task 一次 commit,提交信息用计划里的。
- **不 push、不合并 main、不改 `.env*`、不启动 dev 服务器**(指挥官自己起预览截图)。
- `field-notes/takeout/` 的草稿不要提交、不要删。本计划文件还没进 git,Task 1 的 commit 把它一起加上。
- 业主已决定 **KIRARI 这次不上**,不要建它的文件。

---

### Task 1: `isSpotKind` + 景点数据带评论与照片(TDD)

**Files:**
- Modify: `src/lib/map/kinds.ts`、`src/lib/map/placesToGeoJSON.ts`
- Test: `src/lib/map/kinds.test.ts`、`src/lib/map/placesToGeoJSON.test.ts`

- [ ] **Step 1: 切分支**

```bash
cd /Users/tantianshu/Documents/code/gourmet/web
git checkout main && git checkout -b feat/kanazawa-spots
```

- [ ] **Step 2: 写失败的测试**

`src/lib/map/kinds.test.ts`:import 行

```ts
import { KIND_ORDER, KIND_COLORS, KIND_GLYPHS } from './kinds'
```

改为

```ts
import { KIND_ORDER, KIND_COLORS, KIND_GLYPHS, isSpotKind } from './kinds'
```

并在 `describe('kinds', …)` 里最后一个 `it` 之后追加:

```ts
  it('isSpotKind is true exactly for the spots/ kinds (map-only, no detail page)', () => {
    for (const k of SPOT_KINDS) expect(isSpotKind(k), k).toBe(true)
    for (const k of RESTAURANT_KINDS) expect(isSpotKind(k), k).toBe(false)
  })
```

`src/lib/map/placesToGeoJSON.test.ts`:import 行

```ts
import { placesToGeoJSON } from './placesToGeoJSON'
```

改为

```ts
import { placesToGeoJSON, splitGallery } from './placesToGeoJSON'
```

并在 `describe('placesToGeoJSON', …)` 里最后一个 `it` 之后追加:

```ts
  it('carries the full review and the extra photos only for map-only spots', () => {
    const [spot, food] = placesToGeoJSON([
      make({ slug: 's', kind: 'sight', images: ['1.jpg', '2.jpg', '3.jpg'], review_en: 'Hi.', review_zh: '嗨。' }),
      make({ slug: 'f', kind: 'food', review_en: 'Yum.', review_zh: '好吃。' }),
    ]).features
    expect(spot.properties.review_en).toBe('Hi.')
    expect(spot.properties.review_zh).toBe('嗨。')
    expect(spot.properties.gallery).toBe('2.jpg|3.jpg')
    expect(food.properties.review_en).toBe('')
    expect(food.properties.review_zh).toBe('')
    expect(food.properties.gallery).toBe('')
  })
  it('splitGallery turns the joined string back into file names', () => {
    expect(splitGallery('2.jpg|3.jpg')).toEqual(['2.jpg', '3.jpg'])
    expect(splitGallery('')).toEqual([])
  })
```

- [ ] **Step 3: 跑测试确认失败**

Run: `npx vitest run src/lib/map/kinds.test.ts src/lib/map/placesToGeoJSON.test.ts`
Expected: FAIL(`isSpotKind` / `splitGallery` 不是导出成员,或 `review_en` 为 undefined)。

- [ ] **Step 4: 实现 `isSpotKind`**

`src/lib/map/kinds.ts` 文件末尾追加:

```ts
/**
 * 景点 / 玩乐 / 购物 / 住宿(spots/ 里的四类)只出现在地图上:没有 /<slug> 图文页,
 * 评论全文和照片显示在地图卡片里(业主 2026-11-17 定)。
 * 放在这里而不是 places.ts,是因为 places.ts 引用了 fs,不能进浏览器包;与 SPOT_KINDS 的一致性由 kinds.test.ts 保证。
 */
const SPOT_KIND_SET: ReadonlySet<PlaceKind> = new Set<PlaceKind>(['sight', 'activity', 'shop', 'stay'])

export function isSpotKind(kind: PlaceKind): boolean {
  return SPOT_KIND_SET.has(kind)
}
```

- [ ] **Step 5: 实现 GeoJSON 属性(`src/lib/map/placesToGeoJSON.ts`)**

文件开头的 import:

```ts
import type { Place, PlaceKind } from '@/lib/places'
```

之后加一行:

```ts
import { isSpotKind } from './kinds'
```

`PlaceProps` 类型里 `cover: string` 那一行之后(类型的 `}` 之前)加:

```ts
  /** 只有景点类(地图专属,没有图文页)才有值:评论全文 */
  review_en: string
  review_zh: string
  /** 只有景点类才有值:封面之外的照片,用 GALLERY_SEP 连接(MapLibre 属性只放字符串);展示层用 splitGallery 还原 */
  gallery: string
```

`export type PlaceCollection = …` 那一行之后加:

```ts
export const GALLERY_SEP = '|'

export function splitGallery(s: string): string[] {
  return s ? s.split(GALLERY_SEP).filter(Boolean) : []
}
```

`placesToGeoJSON` 函数整体替换为:

```ts
export function placesToGeoJSON(places: Place[]): PlaceCollection {
  return {
    type: 'FeatureCollection',
    features: places.map(p => {
      const spot = isSpotKind(p.kind)
      return {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: p.coords },
        properties: {
          slug: p.slug,
          name: p.name,
          kind: p.kind,
          suburb: p.suburb,
          city: p.city,
          cuisine_en: p.cuisine_en,
          cuisine_zh: p.cuisine_zh,
          tagline_en: p.tagline_en ?? '',
          tagline_zh: p.tagline_zh ?? '',
          visited: p.visited,
          map_url: p.map_url,
          map_type: p.map_type,
          cover: p.images[0] ?? '',
          review_en: spot ? p.review_en : '',
          review_zh: spot ? p.review_zh : '',
          gallery: spot ? p.images.slice(1).join(GALLERY_SEP) : '',
        },
      }
    }),
  }
}
```

- [ ] **Step 6: 跑测试确认通过**

Run: `npx vitest run src/lib/map/kinds.test.ts src/lib/map/placesToGeoJSON.test.ts`
Expected: PASS(含原有的「properties 全是字符串」那条)。

- [ ] **Step 7: Commit(连同本计划文件)**

```bash
git add src/lib/map/kinds.ts src/lib/map/kinds.test.ts src/lib/map/placesToGeoJSON.ts src/lib/map/placesToGeoJSON.test.ts docs/superpowers/plans/2026-11-16-kanazawa-batch.md
git commit -m "Map data: isSpotKind(); spots carry their full review and extra photos"
```

---

### Task 2: 景点只在地图上(详情页 / 卡片 / 备用列表)

**Files:**
- Modify: `src/app/[slug]/page.tsx`(整文件替换)
- Modify: `src/components/map/PlaceCard.tsx`(整文件替换)
- Modify: `src/components/map/MapFallbackList.tsx`(链接那段)

- [ ] **Step 1: 详情页只为吃喝生成——整文件替换 `src/app/[slug]/page.tsx`**

```tsx
import { getPlace, getAllPlaces } from '@/lib/places'
import { notFound } from 'next/navigation'
import RestaurantDetail from '@/components/RestaurantDetail'
import { isSpotKind } from '@/lib/map/kinds'

// 只有吃喝(restaurants/)有图文页;景点 / 玩乐 / 购物 / 住宿只在地图上,卡片里看全文(业主 2026-11-17 定)
export async function generateStaticParams() {
  return getAllPlaces().filter(p => !isSpotKind(p.kind)).map(p => ({ slug: p.slug }))
}

export default async function PlacePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const place = getPlace(slug)
  if (!place || isSpotKind(place.kind)) notFound()
  return <RestaurantDetail restaurant={place} />
}
```

- [ ] **Step 2: 地图卡片——整文件替换 `src/components/map/PlaceCard.tsx`**

```tsx
'use client'

import Link from 'next/link'
import { useLang } from '@/components/LanguageContext'
import { basePath } from '@/lib/basePath'
import { formatVisited, splitParagraphs } from '@/lib/format'
import { MAP_UI } from '@/lib/mapI18n'
import { KIND_COLORS, isSpotKind } from '@/lib/map/kinds'
import { splitGallery, type PlaceFeature } from '@/lib/map/placesToGeoJSON'

export default function PlaceCard({ feature, onClose }: { feature: PlaceFeature; onClose: () => void }) {
  const { lang } = useLang()
  const ui = MAP_UI[lang]
  const p = feature.properties
  const tagline = lang === 'en' ? p.tagline_en : p.tagline_zh
  const cuisine = lang === 'en' ? p.cuisine_en : p.cuisine_zh
  const where = lang === 'en' ? `${p.suburb}, ${p.city}` : `${p.city} · ${p.suburb}`
  const visited = formatVisited(p.visited, lang)
  const mapLabel = p.map_type === 'amap' ? ui.openAmap : ui.openGoogle
  // 景点类没有图文页:评论全文和其余照片直接放在卡片里(内容区可滚动),也不显示「查看图文」
  const spot = isSpotKind(p.kind)
  const review = spot ? (lang === 'en' ? p.review_en : p.review_zh) : ''
  const gallery = spot ? splitGallery(p.gallery) : []

  return (
    <aside
      role="dialog"
      aria-label={p.name}
      className="absolute z-20 inset-x-0 bottom-0 md:inset-x-auto md:right-4 md:top-4 md:bottom-4 md:w-[360px] flex flex-col max-h-[70dvh] md:max-h-none overflow-hidden rounded-t-2xl md:rounded-2xl bg-[#FCFAF4] text-[#13314A] shadow-2xl"
    >
      {p.cover && (
        <div className="relative shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`${basePath}/images/${p.slug}/${p.cover}`} alt={p.name} className="w-full h-40 md:h-52 object-cover" />
        </div>
      )}
      <button
        type="button"
        onClick={onClose}
        aria-label={ui.close}
        className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/50 text-white text-lg leading-none"
      >
        ×
      </button>
      <div className="p-4 flex flex-col gap-2 overflow-y-auto">
        <div className="flex items-center gap-2 flex-wrap">
          <h2 className={`font-display text-2xl font-bold ${p.cover ? '' : 'pr-10'}`}>{p.name}</h2>
          <span
            className="font-label text-[10px] uppercase tracking-widest text-white px-2 py-0.5 rounded-full"
            style={{ background: KIND_COLORS[p.kind] }}
          >
            {ui.kinds[p.kind]}
          </span>
        </div>
        <p className="font-label text-[11px] uppercase tracking-wider text-[#8A99A6]">{cuisine} · {where}</p>
        {visited && <p className="font-label text-[11px] uppercase tracking-wider text-[#F0742A]">{visited}</p>}
        {tagline && <p className="text-base leading-relaxed">{tagline}</p>}
        {review && (
          <div className="text-sm leading-relaxed space-y-3 pt-1">
            {splitParagraphs(review).map((para, i) => (
              <p key={i}>{para}</p>
            ))}
          </div>
        )}
        {gallery.map(img => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={img} src={`${basePath}/images/${p.slug}/${img}`} alt={p.name} className="w-full h-auto rounded-sm mt-1" />
        ))}
        <div className="flex gap-2 pt-2 flex-wrap">
          {!spot && (
            <Link
              href={`/${p.slug}`}
              className="inline-flex items-center bg-[#0F84B5] text-white font-label text-xs font-bold uppercase tracking-widest px-4 py-2 hover:bg-[#F0742A] transition-colors"
            >
              {ui.viewStory}
            </Link>
          )}
          <a
            href={p.map_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center border-[1.5px] border-[#0F84B5] text-[#0F84B5] font-label text-xs font-bold uppercase tracking-widest px-4 py-2 hover:border-[#F0742A] hover:text-[#F0742A] transition-colors"
          >
            {mapLabel}
          </a>
        </div>
        <p className="md:hidden pt-3 text-[10px] leading-snug text-[#8A99A6]">
          Map © <a className="underline" href="https://openfreemap.org" target="_blank" rel="noopener noreferrer">OpenFreeMap</a>
          {' '}© <a className="underline" href="https://www.openmaptiles.org/" target="_blank" rel="noopener noreferrer">OpenMapTiles</a>
          {' '}Data © <a className="underline" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors
        </p>
      </div>
    </aside>
  )
}
```

(与原文件相比只改了:两处 import、`spot` / `review` / `gallery` 三个常量、tagline 之后的评论段落与照片、「查看图文」按钮外包 `{!spot && …}`。)

- [ ] **Step 3: 地图备用列表里景点改链 Google 地图**

`src/components/map/MapFallbackList.tsx` 顶部 import 区加一行:

```tsx
import { isSpotKind } from '@/lib/map/kinds'
```

把

```tsx
                <Link href={`/${f.properties.slug}`} className="font-semibold hover:text-[#F0742A]">
                  {f.properties.name}
                </Link>
```

替换为

```tsx
                {isSpotKind(f.properties.kind) ? (
                  <a href={f.properties.map_url} target="_blank" rel="noopener noreferrer" className="font-semibold hover:text-[#F0742A]">
                    {f.properties.name}
                  </a>
                ) : (
                  <Link href={`/${f.properties.slug}`} className="font-semibold hover:text-[#F0742A]">
                    {f.properties.name}
                  </Link>
                )}
```

- [ ] **Step 4: lint + 全量测试 + 构建**

Run: `npm run lint && npx vitest run && NEXT_PUBLIC_BASE_PATH=/gourmet npm run build`
Expected: lint 无报错;**173 passed**(170 + Task 1 的 3 个);构建成功(此时还没有任何景点,产物与之前一致)。

- [ ] **Step 5: Commit**

```bash
git add "src/app/[slug]/page.tsx" src/components/map/PlaceCard.tsx src/components/map/MapFallbackList.tsx
git commit -m "Spots are map-only: no detail page, full review and photos in the map card"
```

---

### Task 3: 成稿金泽 4 个景点

**已定的编辑决定(照抄):**

| slug | 名字(照原样) | category | suburb / city | 类型标签 en / zh | visited | 草稿 | 原评论语言 | 照片 |
|---|---|---|---|---|---|---|---|---|
| `ishikawa-prefectural-library` | Ishikawa Prefectural Library | sight | Kodatsuno / Kanazawa | Library / 图书馆 | 2026-09-11 | `ishikawa-prefectural-library.md` | 英文 | `gourmet/spots/ishikawa-prefectural-library/imgs`(2 张) |
| `daiwa-roynet-kanazawa-miyabi` | Daiwa Roynet Hotel Kanazawa Miyabi | stay | Hirooka / Kanazawa | Hotel / 酒店 | 2026-09-11 | `daiwa-roynet-hotel-kanazawa-miyabi.md` | 中文 | `gourmet/spots/daiwa-roynet-kanazawa-miyabi/imgs`(2 张 JPG) |
| `kojitsu-sanso-kanazawa` | 好日山荘 金沢エムザ店 | shop | Musashimachi / Kanazawa | Outdoor gear / 户外用品 | 2026-09-10 | `place-8.md` | 英文 | **无,业主说只用文字:`images: []`** |
| `mont-bell-kanazawa` | mont-bell | shop | Honmachi / Kanazawa | Outdoor gear / 户外用品 | 2026-09-09 | `mont-bell.md` | 中文 | `gourmet/spots/mont-bell-kanazawa/imgs`(1 张) |

`visited` = Takeout 评论日期;`map_url` 指挥官已在浏览器里逐个验证。照片目录的完整路径前缀是 `/Users/tantianshu/Documents/code/gourmet/`。

**Files:**
- Create: `src/data/spots/{ishikawa-prefectural-library,daiwa-roynet-kanazawa-miyabi,kojitsu-sanso-kanazawa,mont-bell-kanazawa}.md`
- Create(脚本生成): `public/images/{ishikawa-prefectural-library,daiwa-roynet-kanazawa-miyabi,mont-bell-kanazawa}/*.jpg`

- [ ] **Step 1: 导入照片(3 家)**

```bash
npm run -s photos:import -- /Users/tantianshu/Documents/code/gourmet/spots/ishikawa-prefectural-library/imgs ishikawa-prefectural-library
npm run -s photos:import -- /Users/tantianshu/Documents/code/gourmet/spots/daiwa-roynet-kanazawa-miyabi/imgs daiwa-roynet-kanazawa-miyabi
npm run -s photos:import -- /Users/tantianshu/Documents/code/gourmet/spots/mont-bell-kanazawa/imgs mont-bell-kanazawa
```

Expected:依次 2 / 2 / 1 张(图书馆 `1.webp` 是横图 1888×1416 → `1600×1200`;酒店两张 JPG 长边不到 1600,保持原尺寸)。

- [ ] **Step 2: 建 4 个文件**

frontmatter 照抄;`<你写>` 按 Step 3 写。

`src/data/spots/ishikawa-prefectural-library.md`:

```markdown
---
slug: ishikawa-prefectural-library
name: "Ishikawa Prefectural Library"
suburb: "Kodatsuno"
city: "Kanazawa"
category: sight
cuisine_en: "Library"
cuisine_zh: "图书馆"
map_url: "https://www.google.com/maps/place/Ishikawa+Prefectural+Library/data=!4m2!3m1!1s0x0:0x9e0f65f7f4ab77a1"
coords: [136.680341, 36.548802]
map_type: google
visited: "2026-09-11"
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

`src/data/spots/daiwa-roynet-kanazawa-miyabi.md`:

```markdown
---
slug: daiwa-roynet-kanazawa-miyabi
name: "Daiwa Roynet Hotel Kanazawa Miyabi"
suburb: "Hirooka"
city: "Kanazawa"
category: stay
cuisine_en: "Hotel"
cuisine_zh: "酒店"
map_url: "https://www.google.com/maps/place/Daiwa+Roynet+Hotel+Kanazawa+Miyabi/data=!4m2!3m1!1s0x0:0x462ea3307382a03f"
coords: [136.647213, 36.58064]
map_type: google
visited: "2026-09-11"
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

`src/data/spots/kojitsu-sanso-kanazawa.md`:

```markdown
---
slug: kojitsu-sanso-kanazawa
name: "好日山荘 金沢エムザ店"
suburb: "Musashimachi"
city: "Kanazawa"
category: shop
cuisine_en: "Outdoor gear"
cuisine_zh: "户外用品"
map_url: "https://www.google.com/maps/place/%E5%A5%BD%E6%97%A5%E5%B1%B1%E8%8D%98+%E9%87%91%E6%B2%A2%E3%82%A8%E3%83%A0%E3%82%B6%E5%BA%97/data=!4m2!3m1!1s0x0:0xc01f9015e26bd01f"
coords: [136.655011, 36.572005]
map_type: google
visited: "2026-09-10"
tagline_en: "<你写>"
tagline_zh: "<你写>"
images: []
---

## en

<你写>

## zh

<你写>
```

`src/data/spots/mont-bell-kanazawa.md`:

```markdown
---
slug: mont-bell-kanazawa
name: "mont-bell"
suburb: "Honmachi"
city: "Kanazawa"
category: shop
cuisine_en: "Outdoor gear"
cuisine_zh: "户外用品"
map_url: "https://www.google.com/maps/place/mont-bell/data=!4m2!3m1!1s0x0:0x2784f7340fd8cf37"
coords: [136.651872, 36.575585]
map_type: google
visited: "2026-09-09"
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

- [ ] **Step 3: 正文与 tagline(业主定的规则)**

底稿是各草稿 `field-notes/takeout/<草稿>.md` 的 `## takeout` 段。**忠实原文,不增不减**:

1. **原文英文**(图书馆、好日山荘):`## en` = 业主原文,只修明显笔误与语法,不改写、不换词、不加句子。`## zh` = 逐句忠实翻译,自然口语化,不增不减;`tax free` 可译「免税」,`info desk` 译「服务台」。
2. **原文中文**(Daiwa Roynet、mont-bell):`## zh` = 业主原文,只修笔误和标点(mont-bell 原文「货品丰富 还有很多outlet款」中间的空格改成逗号);`## en` = 忠实英译,不增不减。
3. 段落按原文分段;原文很短(图书馆一句、mont-bell 两句)就保持很短,**不要为了凑长度补内容**。
4. **绝对不要**加原文没有的话:不加总结句、俏皮话、推荐语;不写星级、价格。
5. tagline:一句话,只用该评论里出现的事实和说法;`tagline_en` ≤ 12 个词,`tagline_zh` ≤ 22 个字。
6. 自查:`grep -rn '<你写>' src/data/` 无输出。

- [ ] **Step 4: lint + 全量测试 + 构建 + 产物检查**

Run: `npm run lint && npx vitest run && NEXT_PUBLIC_BASE_PATH=/gourmet npm run build`
Expected: lint 无报错;**173 passed**(`cities.test.ts` 会校验 4 个新点都在金泽边界内);构建成功。

```bash
ls out | grep -cE '^(ishikawa-prefectural-library|daiwa-roynet-kanazawa-miyabi|kojitsu-sanso-kanazawa|mont-bell-kanazawa)\.html$'
grep -c 'accessible to different groups' out/map.html
grep -c 'Ishikawa Prefectural Library' out/index.html
```

Expected:第一条 `0`(景点没有图文页);第二条 ≥ `1`(评论全文进了地图页数据);第三条 `0`(首页不列景点)。

- [ ] **Step 5: Commit**

```bash
git add src/data/spots public/images/ishikawa-prefectural-library public/images/daiwa-roynet-kanazawa-miyabi public/images/mont-bell-kanazawa
git commit -m "Add the first spots (Kanazawa): prefectural library, Daiwa Roynet hotel, Kojitsu Sanso, mont-bell"
```

---

### Task 4: 文档

**Files:**
- Modify: `CLAUDE.md`(两处)

- [ ] **Step 1: 景点只上地图**

`CLAUDE.md` 里

```
Every place (restaurants and spots) gets a detail page at `/<slug>` via `getPlace()`.
```

替换为

```
Only food & drink (`restaurants/`) get a detail page at `/<slug>`. **Spots are map-only** (owner decision 2026-11-17): no detail page and never on the homepage; their full review and extra photos are shown inside the map card (`PlaceCard`, fed by the `review_en/zh` and `gallery` properties that `placesToGeoJSON` fills for spots only). `isSpotKind()` in `src/lib/map/kinds.ts` is the switch (client-safe; `places.ts` imports `fs`).
```

- [ ] **Step 2: 已上线条目**

```
soma-pastry and suburbia-bakery moved to `bakery` on 2026-11-16
```

替换为

```
soma-pastry and suburbia-bakery moved to `bakery` on 2026-11-16. First spots (map-only, Kanazawa, 2026-11-17): ishikawa-prefectural-library (sight), daiwa-roynet-kanazawa-miyabi (stay), kojitsu-sanso-kanazawa (shop, text only), mont-bell-kanazawa (shop)
```

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "Docs: spots are map-only; first Kanazawa spots"
```

---

## 收尾报告(执行者写给指挥官)

- 分支名、4 个 commit 的 hash、`git status` 是否干净。
- 测试数量(173)、lint / build 结果、Task 1 Step 3 的失败信息(先红后绿)、Task 3 Step 4 三条检查的输出。
- 3 次 `photos:import` 的输出(每张尺寸、KB)。
- 4 条成稿全文(tagline 两条 + `## en` + `## zh`)。
- 与计划的偏离及原因(没有就写「无」)。
- 最后一句:「等你看过文案和预览,再合并到 main 并 push」。

## 指挥官验收清单(不是执行者的活)

- 重跑 lint / test / build,读 diff;文案逐句对照草稿。
- 预览:`/map?city=kanazawa&place=ishikawa-prefectural-library` 卡片里有照片、标语、中英全文、第二张照片,没有「查看图文」;好日山荘卡片无图、标题不被 × 压;`/gourmet/ishikawa-prefectural-library` 是 404;首页不变;吃喝类卡片照旧有「查看图文」。
