# 酒评页面（Wine Review）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a bilingual "Wine / 酒评" section to the gourmet Next.js app — a nav entrance in the shared header plus `/wine` (list) and `/wine/[slug]` (detail) pages that reuse coffee-diary's editorial layout, re-skinned in the gourmet Mediterranean palette, with taste metrics **Body / Tannin / Acidity / Sweetness**.

**Architecture:** New Next.js routes under `src/app/wine/`. A route-level `layout.tsx` imports a scoped stylesheet (`wine.css`, ported from coffee-tracker's `diary.css`, all selectors namespaced under `.wine-scope`) and wraps children in `<div className="wine-scope">`. Content is a structured JSON file (`src/data/wines.json`) read through a typed lib (`src/lib/wines.ts`). Two client components (`WineListClient`, `WineDetail`) render the list and detail using a bilingual dictionary (`src/lib/wineI18n.ts`) driven by the existing `useLang()` context. The shared `Header` gains a nav entrance.

**Tech Stack:** Next.js 16.2.7 (app router, `output: export`, `basePath: /gourmet`), React 19, TypeScript, Tailwind v4 (only for the header/site chrome; the wine body uses the ported plain CSS), Vitest 2 (node env, `@` → `./src` alias).

Reference source (read-only): `/Users/tantianshu/Documents/code/coffee-tracker/docs/{diary.css,diary.html,diary-detail.html,diary-common.js,diary.json}`.
Spec: `web/docs/superpowers/specs/2026-07-16-wine-review-design.md`.

---

## File Structure

**Create:**
- `src/data/wines.json` — content (2 sample entries + `entries` array).
- `src/lib/wines.ts` — types (`WineEntry` etc.) + `sortWines` / `getAllWines` / `getWine`.
- `src/lib/wines.test.ts` — unit test for `sortWines`.
- `src/lib/wineI18n.ts` — `WineUIStrings` type, `WINE_UI` dict, `pick()` helper.
- `src/lib/wineI18n.test.ts` — unit test for `pick`.
- `src/app/wine/wine.css` — ported + scoped editorial stylesheet.
- `src/app/wine/layout.tsx` — imports `wine.css`, wraps children in `.wine-scope`.
- `src/app/wine/page.tsx` — list route (server component).
- `src/app/wine/[slug]/page.tsx` — detail route + `generateStaticParams`.
- `src/components/wine/WineListClient.tsx` — list interactions (search + type filter + cards).
- `src/components/wine/WineDetail.tsx` — detail rendering (A/B layouts, sliders, spec).

**Modify:**
- `src/components/Header.tsx` — add the "Restaurants / Wine" nav entrance.

Each file has one responsibility; the two React components are split list vs. detail so each stays focused.

---

## Conventions for every task

- Exact paths are given. `@/` resolves to `web/src/`.
- Run commands from `web/` (`cd /Users/tantianshu/Documents/code/gourmet/web`).
- Commit steps are included per the standard workflow. **The human owns commit/push** — if running unattended without commit authorization, stage the files and pause instead of committing.
- Images always go through `basePath` (`src/lib/basePath.ts`). The two sample wines ship **without photos** (they use color washes + 🍷 fallbacks), so no image binaries are needed; real photos can be dropped into `public/images/wines/<slug>/` later.

---

## Task 1: Wine data — content, types, loaders

**Files:**
- Create: `src/data/wines.json`
- Create: `src/lib/wines.ts`
- Test: `src/lib/wines.test.ts`

- [ ] **Step 1: Create the sample content**

`src/data/wines.json`:

```json
{
  "entries": [
    {
      "slug": "yangarra-old-vine-grenache-2021",
      "date": "2026-06-28",
      "wine_name": { "zh": "扬加拉 老藤歌海娜 2021", "en": "Yangarra Old Vine Grenache 2021" },
      "winery": { "zh": "扬加拉酒庄", "en": "Yangarra Estate" },
      "color": "pink",
      "wine_type": "red",
      "price_aud": "45.00",
      "url": "https://www.yangarra.com",
      "tags": [
        { "zh": "澳大利亚", "en": "Australia" },
        { "zh": "歌海娜", "en": "Grenache" },
        { "zh": "有机", "en": "Organic" }
      ],
      "flavours": [
        { "icon": "🍓", "label": { "zh": "草莓", "en": "Strawberry" } },
        { "icon": "🌹", "label": { "zh": "干玫瑰", "en": "Dried rose" } },
        { "icon": "🌿", "label": { "zh": "地中海灌木", "en": "Garrigue" } }
      ],
      "story": {
        "zh": "麦克拉伦谷的老藤歌海娜，颜色浅得像放大版桃红，别被骗了——香气一上来就是熟透的草莓加一把干香草。\n\n入口轻盈多汁，单宁细得几乎察觉不到，微微的胡椒尾韵让它一点都不腻。冰镇十五分钟再喝，夏天傍晚神器。",
        "en": "An old-vine Grenache from McLaren Vale, so pale it looks like a rosé that hit the gym — don't be fooled. The nose is all ripe strawberry and a fistful of dried herbs.\n\nLight and juicy on the palate, tannins so fine you barely notice them, with a peppery lift on the finish that keeps it from ever feeling heavy. Fifteen minutes in the fridge and it's a summer-evening hero."
      },
      "pairing": {
        "zh": "微微冰镇后配炭火羊排、番茄冷盘，或者就着一盘火腿也行。",
        "en": "Lightly chilled, with lamb off the grill, a tomato salad — or honestly just a plate of jamón."
      },
      "profile": { "body": "medium", "tannin": "low", "acidity": "medium", "sweetness": "low" },
      "summary": {
        "zh": "浅色不代表清淡——多汁草莓、细腻单宁、胡椒尾韵，冰一冰就是夏夜万金油。",
        "en": "Pale but not shy — juicy strawberry, silky tannins, a peppery finish. Chill it and it goes with anything."
      },
      "details": {
        "producer": "Yangarra Estate Vineyard",
        "country": { "zh": "澳大利亚", "en": "Australia" },
        "flag": "🇦🇺",
        "region": { "zh": "麦克拉伦谷，南澳", "en": "McLaren Vale, South Australia" },
        "varieties": { "zh": "歌海娜", "en": "Grenache" },
        "alcohol": "14.5%",
        "vintage": "2021",
        "size": "750 ml",
        "closure": { "zh": "螺旋盖", "en": "Screw cap" },
        "notes": {
          "zh": "麦克拉伦谷位于阿德莱德以南，地中海式气候加上古老砂质土壤，是南澳歌海娜与罗讷风格红酒的宝地。",
          "en": "McLaren Vale, just south of Adelaide, pairs a Mediterranean climate with ancient sandy soils — prime country for South Australian Grenache and Rhône-style reds."
        },
        "map_url": "https://www.google.com/maps/place/McLaren+Vale+SA"
      }
    },
    {
      "slug": "les-capriades-pet-nat-piege-a-filles",
      "date": "2026-05-10",
      "wine_name": { "zh": "卡普里亚德 「少女陷阱」气泡", "en": "Les Capriades Pétillant « Piège à Filles »" },
      "winery": { "zh": "卡普里亚德", "en": "Les Capriades" },
      "color": "green",
      "wine_type": "sparkling",
      "price_aud": "52.00",
      "tags": [
        { "zh": "法国", "en": "France" },
        { "zh": "自然酒", "en": "Natural wine" },
        { "zh": "祖传法气泡", "en": "Pét-Nat" }
      ],
      "flavours": [
        { "icon": "🍏", "label": { "zh": "青苹果", "en": "Green apple" } },
        { "icon": "🍞", "label": { "zh": "烤面包", "en": "Brioche" } },
        { "icon": "🌼", "label": { "zh": "洋甘菊", "en": "Chamomile" } }
      ],
      "story": {
        "zh": "卢瓦尔河谷祖传法气泡（Pét-Nat）名门，开瓶记得小心——气很足，跑得比你手快。\n\n气泡细腻，青苹果加一点面包发酵香，酸度爽脆但不咬人，尾巴干净带一丝洋甘菊花香。不装、不端着，就是让人一杯接一杯的那种酒。",
        "en": "A benchmark pét-nat from a Loire cult producer — open it carefully, there's a lot of gas and it moves faster than your hand.\n\nFine bubbles, green apple and a little bready lees character, crisp acidity that never bites, and a clean finish with a whisper of chamomile. No airs, no pretension — just the kind of bottle that empties itself one glass at a time."
      },
      "pairing": {
        "zh": "一晚的开胃第一杯，配炸物、生蚝，或者只配好心情。",
        "en": "The first pour of the night — with anything fried, fresh oysters, or just good company."
      },
      "profile": { "body": "low", "tannin": "low", "acidity": "high", "sweetness": "low" },
      "summary": {
        "zh": "细泡、脆酸、青苹果加烤面包香——毫无距离感的开胃气泡，一开就见底。",
        "en": "Fine bubbles, crisp acidity, green apple and brioche — an approachable aperitif fizz that disappears fast."
      },
      "details": {
        "producer": "Les Capriades (Pascal Potaire & Moses Gadouche)",
        "country": { "zh": "法国", "en": "France" },
        "flag": "🇫🇷",
        "region": { "zh": "卢瓦尔河谷", "en": "Loire Valley" },
        "varieties": { "zh": "白诗南 / 默尼耶皮诺", "en": "Chenin Blanc / Menu Pineau" },
        "alcohol": "12%",
        "vintage": "NV",
        "size": "750 ml",
        "closure": { "zh": "皇冠盖", "en": "Crown cap" },
        "notes": {
          "zh": "卡普里亚德是卢瓦尔河谷祖传法（méthode ancestrale）气泡的标杆，一次发酵在瓶中完成，不加糖不加酵母，天然带气。",
          "en": "Les Capriades is a reference point for méthode ancestrale in the Loire — a single fermentation finished in the bottle, no added sugar or yeast, naturally sparkling."
        }
      }
    }
  ]
}
```

- [ ] **Step 2: Write the failing test**

`src/lib/wines.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { sortWines, type WineEntry } from './wines'

const make = (slug: string, date: string): WineEntry => ({
  slug,
  date,
  wine_name: { zh: slug, en: slug },
  winery: { zh: '', en: '' },
})

describe('sortWines', () => {
  it('orders newest date first, slug as tiebreak', () => {
    const out = sortWines([
      make('a', '2026-03-01'),
      make('b', '2026-06-01'),
      make('c', '2026-06-01'),
    ]).map(w => w.slug)
    expect(out).toEqual(['b', 'c', 'a'])
  })
})
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npx vitest run src/lib/wines.test.ts`
Expected: FAIL — cannot resolve `./wines` (module not created yet).

- [ ] **Step 4: Write the lib**

`src/lib/wines.ts`:

```ts
import raw from '@/data/wines.json'

export type Localized = { zh: string; en: string }
export type Level = 'low' | 'medium' | 'high'
export type WineType = 'red' | 'white' | 'rose' | 'sparkling'

export type WineFlavour = { icon: string; label: Localized }

export type WineProfile = {
  body?: Level
  tannin?: Level
  acidity?: Level
  sweetness?: Level
}

export type WineDetails = {
  producer?: string
  country?: Localized
  flag?: string
  region?: Localized
  varieties?: Localized
  alcohol?: string
  vintage?: string
  size?: string
  closure?: Localized
  notes?: Localized
  map_url?: string
}

export type WineEntry = {
  slug: string
  date?: string
  wine_name: Localized
  winery: Localized
  image?: string
  images?: string[]
  color?: 'pink' | 'peach' | 'blue' | 'green' | 'cocoa'
  wine_type?: WineType
  price_aud?: string
  url?: string
  tags?: Localized[]
  flavours?: WineFlavour[]
  story?: Localized
  pairing?: Localized
  profile?: WineProfile
  summary?: Localized
  details?: WineDetails
}

const data = raw as unknown as { entries: WineEntry[] }

export function sortWines(list: WineEntry[]): WineEntry[] {
  return [...list].sort(
    (a, b) => (b.date || '').localeCompare(a.date || '') || a.slug.localeCompare(b.slug)
  )
}

export function getAllWines(): WineEntry[] {
  return sortWines(data.entries || [])
}

export function getWine(slug: string): WineEntry | undefined {
  return getAllWines().find(w => w.slug === slug)
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run src/lib/wines.test.ts`
Expected: PASS (1 test).

- [ ] **Step 6: Commit**

```bash
git add src/data/wines.json src/lib/wines.ts src/lib/wines.test.ts
git commit -m "feat(wine): add wine data types, loaders, and sample content"
```

---

## Task 2: Bilingual dictionary + `pick` helper

**Files:**
- Create: `src/lib/wineI18n.ts`
- Test: `src/lib/wineI18n.test.ts`

- [ ] **Step 1: Write the failing test**

`src/lib/wineI18n.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { pick, WINE_UI } from './wineI18n'

describe('pick', () => {
  it('returns the chosen language', () => {
    expect(pick({ zh: '甲', en: 'A' }, 'en')).toBe('A')
    expect(pick({ zh: '甲', en: 'A' }, 'zh')).toBe('甲')
  })
  it('passes strings through and handles undefined', () => {
    expect(pick('x', 'zh')).toBe('x')
    expect(pick(undefined, 'en')).toBe('')
  })
  it('falls back when the chosen language is empty', () => {
    expect(pick({ zh: '', en: 'A' }, 'zh')).toBe('A')
  })
})

describe('WINE_UI', () => {
  it('has matching keys for both languages', () => {
    expect(Object.keys(WINE_UI.en).sort()).toEqual(Object.keys(WINE_UI.zh).sort())
    expect(WINE_UI.zh.dims.body).toBe('酒体')
    expect(WINE_UI.en.dims.tannin).toBe('Tannin')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/wineI18n.test.ts`
Expected: FAIL — cannot resolve `./wineI18n`.

- [ ] **Step 3: Write the dictionary + helper**

`src/lib/wineI18n.ts`:

```ts
import type { WineType, Localized } from '@/lib/wines'

export type WineUIStrings = {
  navRestaurants: string
  navWine: string
  listTitle: string
  listIntro: string
  searchPlaceholder: string
  filterAll: string
  types: Record<WineType, string>
  flavours: string
  notes: string
  pairing: string
  tasteProfile: string
  summary: string
  details: string
  region: string
  source: string
  viewRegion: string
  tasted: string
  fields: Record<
    'producer' | 'country' | 'region' | 'varieties' | 'alcohol' | 'vintage' | 'size' | 'closure',
    string
  >
  dims: Record<'body' | 'tannin' | 'acidity' | 'sweetness', string>
  levels: Record<'low' | 'medium' | 'high', string>
  back: string
  emptyList: string
  emptyHint: string
  noMatch: string
  notFound: string
}

export const WINE_UI: Record<'en' | 'zh', WineUIStrings> = {
  en: {
    navRestaurants: 'Restaurants',
    navWine: 'Wine',
    listTitle: 'Wine Diary',
    listIntro: "Every bottle I've opened — and written down.",
    searchPlaceholder: 'Search wine / winery / region / grape…',
    filterAll: 'All',
    types: { red: 'Red', white: 'White', rose: 'Rosé', sparkling: 'Sparkling' },
    flavours: 'Flavour Notes',
    notes: 'Notes',
    pairing: 'Pairing',
    tasteProfile: 'Taste Profile',
    summary: 'Summary',
    details: 'Details',
    region: 'Region',
    source: 'View product',
    viewRegion: 'View region',
    tasted: 'Tasted',
    fields: {
      producer: 'Producer',
      country: 'Country',
      region: 'Region',
      varieties: 'Varieties',
      alcohol: 'Alcohol',
      vintage: 'Vintage',
      size: 'Size',
      closure: 'Closure',
    },
    dims: { body: 'Body', tannin: 'Tannin', acidity: 'Acidity', sweetness: 'Sweetness' },
    levels: { low: 'Low', medium: 'Medium', high: 'High' },
    back: '← Back to wine diary',
    emptyList: 'No wines yet',
    emptyHint: 'Had a great glass? Jot it down.',
    noMatch: 'No matching wine',
    notFound: 'Entry not found',
  },
  zh: {
    navRestaurants: '餐厅',
    navWine: '酒评',
    listTitle: '酒评日记',
    listIntro: '每一瓶我开过、写下来的酒。',
    searchPlaceholder: '搜索酒名 / 酒庄 / 产区 / 品种…',
    filterAll: '全部',
    types: { red: '红', white: '白', rose: '桃红', sparkling: '气泡' },
    flavours: '风味',
    notes: '品鉴笔记',
    pairing: '配餐',
    tasteProfile: '风味曲线',
    summary: '总评',
    details: '详情',
    region: '产区',
    source: '查看购买',
    viewRegion: '查看产区',
    tasted: '品鉴',
    fields: {
      producer: '生产商',
      country: '国家',
      region: '产区',
      varieties: '葡萄品种',
      alcohol: '酒精度',
      vintage: '年份',
      size: '容量',
      closure: '封瓶',
    },
    dims: { body: '酒体', tannin: '单宁', acidity: '酸度', sweetness: '甜度' },
    levels: { low: '低', medium: '中', high: '高' },
    back: '← 返回酒评',
    emptyList: '还没有酒',
    emptyHint: '喝到好酒了就来记一笔',
    noMatch: '没有匹配的酒',
    notFound: '未找到这条记录',
  },
}

export function pick(field: Localized | string | undefined, lang: 'en' | 'zh'): string {
  if (field == null) return ''
  if (typeof field === 'string') return field
  return field[lang] || field.en || field.zh || ''
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/wineI18n.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/wineI18n.ts src/lib/wineI18n.test.ts
git commit -m "feat(wine): add bilingual UI dictionary and pick helper"
```

---

## Task 3: Ported + scoped stylesheet `wine.css`

**Files:**
- Create: `src/app/wine/wine.css` (from `coffee-tracker/docs/diary.css`)

The port keeps **all of diary.css's component rules verbatim**, changes only the palette/font variable values, and namespaces everything under `.wine-scope` so the generic class names (`.card`, `.hero`, `.panel`, …) cannot leak into the Tailwind-based site. diary.css's own chrome (reset, `html`, `body`, `:root`, `::selection`, `header`, `.wordmark`, `.header-right`, `.nav-*`, `.lang-toggle*`) is **dropped** — the gourmet `Header` handles chrome.

- [ ] **Step 1: Copy the reference stylesheet**

```bash
mkdir -p src/app/wine
cp /Users/tantianshu/Documents/code/coffee-tracker/docs/diary.css src/app/wine/wine.css
```

- [ ] **Step 2: Delete the chrome/reset rules**

In `src/app/wine/wine.css`, delete these rule blocks entirely (originally near the top of diary.css):
- the `*, *::before, *::after { … }` reset, `html { overflow-x: clip; }`, `body { overflow-x: clip; }`
- the whole `:root { … }` variable block (will be replaced in Step 3)
- the base `body { font-family: … }` block
- the `::selection { … }` rule
- everything from `header { … }` through `.lang-toggle:focus-visible { … }` (the header/wordmark/nav/lang-toggle chrome)

Keep everything **from the `.kicker { … }` rule onward** to the end of the file (the `@media (prefers-reduced-motion)` block).

- [ ] **Step 3: Wrap the remaining rules and add the new variables**

Restructure the file so the entire remaining content is nested inside a single `.wine-scope { … }` block, with this variable/base block at the top:

```css
/* Wine Diary — ported from coffee-tracker/docs/diary.css, scoped to .wine-scope,
   re-skinned in the gourmet Mediterranean palette (cream · navy · brick · aegean). */

.wine-scope {
  /* ── Palette ── */
  --color-paper:      #FCFAF4;  /* cream base */
  --color-paper-2:    #F4EEE1;  /* deeper cream — panels */
  --color-paper-3:    #EDE4D3;  /* deepest tint */
  --color-rule:       #E5DCC9;  /* hairline */
  --color-rule-2:     #CFC3AC;  /* stronger rule */
  --color-neutral:    #8A99A6;  /* blue-grey */
  --color-muted:      #5A6E7D;  /* meta / captions */
  --color-ink:        #13314A;  /* navy ink */
  --color-accent:     #C84B2F;  /* retro brick-red */
  --color-accent-ink: #FCFAF4;  /* text on accent */
  --color-focus:      #0F84B5;  /* aegean blue */
  --color-highlight:  #F3E4C4;  /* warm summary band */

  /* per-entry hero washes — soft, paper-level */
  --wash-pink:  oklch(92% 0.045 18);
  --wash-peach: oklch(93% 0.055 62);
  --wash-blue:  oklch(92% 0.038 235);
  --wash-green: oklch(93% 0.042 150);
  --wash-cocoa: oklch(89% 0.045 70);

  /* ── Type — reuse gourmet's already-loaded fonts.
     --font-mono is intentionally NOT redefined here so it inherits the global
     JetBrains Mono variable set on <html> by the root layout. ── */
  --font-display: var(--font-fraunces), "Noto Serif SC", ui-serif, Georgia, serif;
  --font-body:    var(--font-inter), "Noto Serif SC", ui-serif, Georgia, sans-serif;

  --text-xs:   0.78rem;
  --text-sm:   0.875rem;
  --text-base: 1.0625rem;
  --text-md:   1.33rem;
  --text-lg:   1.75rem;
  --text-xl:   2.3rem;
  --text-2xl:  3rem;
  --text-display: clamp(2.6rem, 4.5vw + 1rem, 4.25rem);

  --space-2xs: 0.25rem;
  --space-xs:  0.5rem;
  --space-sm:  0.75rem;
  --space-md:  1rem;
  --space-lg:  1.5rem;
  --space-xl:  2.5rem;
  --space-2xl: 4rem;
  --space-3xl: 6rem;

  --header-h: 64px;

  /* base typography for the wine subtree */
  font-family: var(--font-body);
  color: var(--color-ink);
  font-size: var(--text-base);
  line-height: 1.6;
  font-variant-numeric: oldstyle-nums;
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;

  /* ▽▽▽ all kept diary component rules go here, verbatim (CSS nesting scopes
     each one to `.wine-scope …`). Paste the retained rules — `.kicker` through
     the end — inside this block unchanged, EXCEPT the one edit in Step 4. ▽▽▽ */

  .kicker { /* …verbatim from diary.css… */ }
  /* … all the way through … */
}
```

Practically: keep the retained rules exactly as they are, just indent them inside the `.wine-scope { … }` braces. Native CSS nesting (flattened by the project's Lightning CSS pipeline) turns `.card { … }` into `.wine-scope .card { … }`, `.panel-peach .slider-dot { … }` into `.wine-scope .panel-peach .slider-dot { … }`, etc.

- [ ] **Step 4: Fix the one nested global selector**

The retained `@media (prefers-reduced-motion: reduce)` block ends the file with a bare universal selector. Inside `.wine-scope` it must reference the parent explicitly. Change:

```css
@media (prefers-reduced-motion: reduce) {
  * { transition: none !important; }
}
```

to:

```css
@media (prefers-reduced-motion: reduce) {
  & * { transition: none !important; }
}
```

- [ ] **Step 5: Sanity-check the file**

Confirm the file has exactly one top-level `.wine-scope {` and a matching closing `}` at the end, contains no `header`/`.wordmark`/`.nav-`/`.lang-toggle`/bare `body`/`:root` rules, and still contains `.list-page`, `.card`, `.hero`, `.panel`, `.slider-row`, `.spec-row`, `.summary-box`. (It is imported and visually verified in later tasks — no standalone build here.)

- [ ] **Step 6: Commit**

```bash
git add src/app/wine/wine.css
git commit -m "feat(wine): add scoped editorial stylesheet ported from coffee-diary"
```

---

## Task 4: Wine route layout + list page

**Files:**
- Create: `src/app/wine/layout.tsx`
- Create: `src/components/wine/WineListClient.tsx`
- Create: `src/app/wine/page.tsx`

- [ ] **Step 1: Create the route layout (loads the scoped CSS + wrapper)**

`src/app/wine/layout.tsx`:

```tsx
import './wine.css'

export default function WineLayout({ children }: { children: React.ReactNode }) {
  return <div className="wine-scope">{children}</div>
}
```

- [ ] **Step 2: Create the list client component**

`src/components/wine/WineListClient.tsx`:

```tsx
'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useLang } from '@/components/LanguageContext'
import { basePath } from '@/lib/basePath'
import { WINE_UI, pick } from '@/lib/wineI18n'
import type { WineEntry, WineType } from '@/lib/wines'

const TYPES: Array<'all' | WineType> = ['all', 'red', 'white', 'rose', 'sparkling']

const WASH: Record<string, string> = {
  pink: 'var(--wash-pink)',
  peach: 'var(--wash-peach)',
  blue: 'var(--wash-blue)',
  green: 'var(--wash-green)',
  cocoa: 'var(--wash-cocoa)',
}

export default function WineListClient({ wines }: { wines: WineEntry[] }) {
  const { lang } = useLang()
  const ui = WINE_UI[lang]
  const [q, setQ] = useState('')
  const [type, setType] = useState<'all' | WineType>('all')

  const filtered = useMemo(() => {
    const kw = q.trim().toLowerCase()
    return wines.filter(w => {
      if (type !== 'all' && w.wine_type !== type) return false
      if (!kw) return true
      const hay = [
        pick(w.wine_name, 'en'), pick(w.wine_name, 'zh'),
        pick(w.winery, 'en'), pick(w.winery, 'zh'),
        pick(w.details?.region, 'en'), pick(w.details?.region, 'zh'),
        pick(w.details?.varieties, 'en'), pick(w.details?.varieties, 'zh'),
        ...(w.tags || []).flatMap(t => [pick(t, 'en'), pick(t, 'zh')]),
        ...(w.flavours || []).flatMap(f => [pick(f.label, 'en'), pick(f.label, 'zh')]),
      ].join(' ').toLowerCase()
      return hay.includes(kw)
    })
  }, [wines, q, type])

  return (
    <main className="list-page">
      <div className="list-head">
        <h1 className="list-title">{ui.listTitle}</h1>
        <p className="list-intro">{ui.listIntro}</p>
      </div>

      <div className="controls">
        <input
          className="search-box"
          value={q}
          placeholder={ui.searchPlaceholder}
          onChange={e => setQ(e.target.value)}
        />
        <div className="filter-pills">
          {TYPES.map(t => (
            <button
              key={t}
              type="button"
              className={`filter-pill${type === t ? ' active' : ''}`}
              onClick={() => setType(t)}
            >
              {t === 'all' ? ui.filterAll : ui.types[t]}
            </button>
          ))}
        </div>
      </div>

      {wines.length === 0 ? (
        <EmptyState icon="🍷" title={ui.emptyList} hint={ui.emptyHint} />
      ) : filtered.length === 0 ? (
        <EmptyState icon="🔍" title={ui.noMatch} />
      ) : (
        <div className="card-grid">
          {filtered.map(w => (
            <WineCard key={w.slug} wine={w} lang={lang} />
          ))}
        </div>
      )}
    </main>
  )
}

function WineCard({ wine, lang }: { wine: WineEntry; lang: 'en' | 'zh' }) {
  const cover = wine.images?.[0] || wine.image
  return (
    <Link className="card" href={`/wine/${wine.slug}`}>
      <div className="card-thumb" style={{ background: WASH[wine.color || 'pink'] }}>
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`${basePath}/images/wines/${wine.slug}/${cover}`} alt="" />
        ) : (
          <span className="card-thumb-fallback">🍷</span>
        )}
      </div>
      <div className="card-body">
        <div className="card-name">{pick(wine.wine_name, lang)}</div>
        <div className="card-roaster">{pick(wine.winery, lang)}</div>
        <div className="card-flavours">
          {(wine.flavours || []).slice(0, 3).map((f, i) => (
            <span className="chip" key={i}>
              {f.icon} {pick(f.label, lang)}
            </span>
          ))}
        </div>
      </div>
    </Link>
  )
}

function EmptyState({ icon, title, hint }: { icon: string; title: string; hint?: string }) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">{icon}</div>
      <p>{title}</p>
      {hint ? <small>{hint}</small> : null}
    </div>
  )
}
```

- [ ] **Step 3: Create the list route (server component)**

`src/app/wine/page.tsx`:

```tsx
import { getAllWines } from '@/lib/wines'
import WineListClient from '@/components/wine/WineListClient'

export default function WinePage() {
  return <WineListClient wines={getAllWines()} />
}
```

- [ ] **Step 4: Build and verify the list route generates**

Run: `npm run build`
Expected: build succeeds; the route list includes `/wine` (a static route). No TypeScript errors.

- [ ] **Step 5: Visual check**

Run: `npm run dev`, open `http://localhost:3000/gourmet/wine`.
Expected: editorial list with title "Wine Diary", italic intro, a search box, filter pills (All / Red / White / Rosé / Sparkling), and two broadsheet cards (Yangarra Grenache, Les Capriades) each showing a color-wash thumb with a 🍷 glyph, wine name, winery, and flavour chips. Typing in search and clicking a pill filters the list. (Language toggle is wired in Task 6.) Stop the dev server when done.

- [ ] **Step 6: Commit**

```bash
git add src/app/wine/layout.tsx src/app/wine/page.tsx src/components/wine/WineListClient.tsx
git commit -m "feat(wine): add /wine list page with search and type filter"
```

---

## Task 5: Wine detail component + dynamic route

**Files:**
- Create: `src/components/wine/WineDetail.tsx`
- Create: `src/app/wine/[slug]/page.tsx`

- [ ] **Step 1: Create the detail component**

`src/components/wine/WineDetail.tsx`:

```tsx
'use client'

import Link from 'next/link'
import { useLang } from '@/components/LanguageContext'
import { basePath } from '@/lib/basePath'
import { WINE_UI, pick, type WineUIStrings } from '@/lib/wineI18n'
import type { WineEntry, WineProfile, WineDetails, Level } from '@/lib/wines'

type Lang = 'en' | 'zh'

const WASH: Record<string, string> = {
  pink: 'var(--wash-pink)',
  peach: 'var(--wash-peach)',
  blue: 'var(--wash-blue)',
  green: 'var(--wash-green)',
  cocoa: 'var(--wash-cocoa)',
}

const DIMS = ['body', 'tannin', 'acidity', 'sweetness'] as const
const LEVELS: Level[] = ['low', 'medium', 'high']
const EN_MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function imgSrc(slug: string, s: string) {
  return `${basePath}/images/wines/${slug}/${s}`
}

function formatDate(s: string | undefined, lang: Lang): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || '')
  if (!m) return s || ''
  const year = m[1]
  const month = parseInt(m[2], 10)
  const day = parseInt(m[3], 10)
  if (lang === 'zh') return `${year} 年 ${month} 月 ${day} 日`
  return `${EN_MONTHS[month - 1]} ${day}, ${year}`
}

function hasProfile(p?: WineProfile): boolean {
  return !!p && DIMS.some(d => p[d])
}
function hasSpec(d: WineDetails, lang: Lang): boolean {
  return !!(
    d.producer || pick(d.country, lang) || pick(d.region, lang) || pick(d.varieties, lang) ||
    d.alcohol || d.vintage || d.size || pick(d.closure, lang)
  )
}
function hasRegion(d: WineDetails, lang: Lang): boolean {
  return !!(pick(d.region, lang) || pick(d.notes, lang) || d.map_url)
}

export default function WineDetail({ wine }: { wine: WineEntry }) {
  const { lang } = useLang()
  const ui = WINE_UI[lang]
  const imgs = wine.images?.length ? wine.images : wine.image ? [wine.image] : []
  return (
    <>
      <Link className="back-link" href="/wine">{ui.back}</Link>
      <div>
        {imgs.length >= 2
          ? <Spread wine={wine} imgs={imgs} lang={lang} ui={ui} />
          : <Hero wine={wine} imgs={imgs} lang={lang} ui={ui} />}
      </div>
    </>
  )
}

/* ── shared pieces ── */

function Meta({ wine, lang, ui }: { wine: WineEntry; lang: Lang; ui: WineUIStrings }) {
  const priceLine = wine.price_aud
    ? `$${wine.price_aud} AUD${wine.details?.size ? ' / ' + wine.details.size : ''}`
    : ''
  const tags = wine.tags || []
  const winery = pick(wine.winery, lang)
  return (
    <>
      <h1 className="bean-name">{pick(wine.wine_name, lang)}</h1>
      {winery && <div className="bean-meta">{winery}</div>}
      {wine.date && <div className="bean-dates">{`${ui.tasted} ${formatDate(wine.date, lang)}`}</div>}
      {priceLine && <div className="bean-price">{priceLine}</div>}
      {tags.length > 0 && (
        <div className="hero-tags hero-tags--static">
          {tags.map((t, i) => <span className="hero-tag" key={i}>{pick(t, lang)}</span>)}
        </div>
      )}
    </>
  )
}

function FlavourRow({ wine, lang }: { wine: WineEntry; lang: Lang }) {
  return (
    <div className="flavour-row">
      {(wine.flavours || []).map((f, i) => (
        <div className="icon-item" key={i}>
          <div className="icon-emoji">{f.icon}</div>
          <div className="icon-label">{pick(f.label, lang)}</div>
        </div>
      ))}
    </div>
  )
}

function Story({ text }: { text: string }) {
  return (
    <div className="story">
      {text.split('\n\n').map((p, i) => <p key={i}>{p}</p>)}
    </div>
  )
}

function SliderRow({ dim, value, ui }: { dim: (typeof DIMS)[number]; value: Level; ui: WineUIStrings }) {
  const idx = Math.max(0, LEVELS.indexOf(value))
  const pct = (idx / 2) * 100
  return (
    <div className="slider-row">
      <div className="slider-label">{ui.dims[dim]}</div>
      <div className="slider-track">
        <span className="slider-dot" style={{ left: `${pct}%` }} />
      </div>
      <div className="slider-scale">
        <span>{ui.levels.low}</span>
        <span>{ui.levels.medium}</span>
        <span>{ui.levels.high}</span>
      </div>
    </div>
  )
}

function TasteProfile({ profile, ui }: { profile: WineProfile; ui: WineUIStrings }) {
  const rows = DIMS.filter(d => profile[d])
  return (
    <div>
      <h2 className="section-title">{ui.tasteProfile}</h2>
      <div className="taste-grid">
        {rows.map(d => <SliderRow key={d} dim={d} value={profile[d] as Level} ui={ui} />)}
      </div>
    </div>
  )
}

function Pairing({ text, ui }: { text: string; ui: WineUIStrings }) {
  return (
    <div>
      <h2 className="section-title">{ui.pairing}</h2>
      <div className="brew-method">{text}</div>
    </div>
  )
}

function SpecRows({ details, lang, ui }: { details: WineDetails; lang: Lang; ui: WineUIStrings }) {
  const rows: Array<[string, string]> = []
  const add = (label: string, val: string) => { if (val) rows.push([label, val]) }
  add(ui.fields.producer, details.producer || '')
  add(ui.fields.country, [details.flag, pick(details.country, lang)].filter(Boolean).join(' '))
  add(ui.fields.region, pick(details.region, lang))
  add(ui.fields.varieties, pick(details.varieties, lang))
  add(ui.fields.alcohol, details.alcohol || '')
  add(ui.fields.vintage, details.vintage || '')
  add(ui.fields.size, details.size || '')
  add(ui.fields.closure, pick(details.closure, lang))
  return (
    <div className="spec">
      {rows.map(([label, val], i) => (
        <div className="spec-row" key={i}>
          <div className="spec-label">{label}</div>
          <div className="spec-value">{val}</div>
        </div>
      ))}
    </div>
  )
}

function Region({ details, lang, ui }: { details: WineDetails; lang: Lang; ui: WineUIStrings }) {
  const name = pick(details.region, lang)
  const notes = pick(details.notes, lang)
  return (
    <>
      {name && <div className="origin-name">{details.flag ? details.flag + ' ' : ''}{name}</div>}
      {notes && <p className="origin-notes">{notes}</p>}
      {details.map_url && (
        <a className="source-link origin-map" href={details.map_url} target="_blank" rel="noopener noreferrer">
          {ui.viewRegion} ↗
        </a>
      )}
    </>
  )
}

/* ── Layout B: single/none photo — hero + panels ── */
function Hero({ wine, imgs, lang, ui }: { wine: WineEntry; imgs: string[]; lang: Lang; ui: WineUIStrings }) {
  const hasPhotos = imgs.length > 0
  const story = pick(wine.story, lang)
  const pairing = pick(wine.pairing, lang)
  const summary = pick(wine.summary, lang)
  const d = wine.details
  return (
    <div className="detail">
      <section className="hero">
        <div
          className={hasPhotos ? 'hero-left has-photos' : 'hero-left'}
          style={hasPhotos ? undefined : { background: WASH[wine.color || 'pink'] }}
        >
          {hasPhotos
            ? imgs.map((s, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img className="hero-photo" key={i} src={imgSrc(wine.slug, s)} alt="" />
              ))
            : <span className="hero-img-fallback">🍷</span>}
        </div>
        <div className="hero-right">
          <Meta wine={wine} lang={lang} ui={ui} />
          {(wine.flavours || []).length > 0 && (
            <div className="hero-sub">
              <div className="kicker">{ui.flavours}</div>
              <FlavourRow wine={wine} lang={lang} />
            </div>
          )}
          {story && (
            <div className="hero-sub">
              <div className="kicker">{ui.notes}</div>
              <Story text={story} />
            </div>
          )}
        </div>
      </section>

      {(pairing || hasProfile(wine.profile)) && (
        <section className="panel panel-peach">
          <div className="brewpair">
            {pairing && <Pairing text={pairing} ui={ui} />}
            {hasProfile(wine.profile) && <TasteProfile profile={wine.profile!} ui={ui} />}
          </div>
        </section>
      )}

      {summary && (
        <section className="summary-wrap">
          <div className="summary-box">
            <span className="cup">🍷</span>
            <span>{summary}</span>
          </div>
        </section>
      )}

      {d && hasSpec(d, lang) && (
        <section className="panel panel-peach">
          <h2 className="section-title">{ui.details}</h2>
          <SpecRows details={d} lang={lang} ui={ui} />
        </section>
      )}

      {d && hasRegion(d, lang) && (
        <section className="panel panel-blue">
          <h2 className="section-title">{ui.region}</h2>
          <Region details={d} lang={lang} ui={ui} />
        </section>
      )}

      {wine.url && (
        <section className="source-wrap">
          <a className="source-link" href={wine.url} target="_blank" rel="noopener noreferrer">
            {ui.source} ↗
          </a>
        </section>
      )}
    </div>
  )
}

/* ── Layout A: 2+ photos — magazine spread ── */
function Spread({ wine, imgs, lang, ui }: { wine: WineEntry; imgs: string[]; lang: Lang; ui: WineUIStrings }) {
  const story = pick(wine.story, lang)
  const pairing = pick(wine.pairing, lang)
  const summary = pick(wine.summary, lang)
  const d = wine.details
  return (
    <div className="spread">
      <aside className="gallery">
        {imgs.map((s, i) => (
          <div className="shot" key={i}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imgSrc(wine.slug, s)} alt="" />
          </div>
        ))}
      </aside>
      <div className="content">
        <div className="blk"><Meta wine={wine} lang={lang} ui={ui} /></div>
        {(wine.flavours || []).length > 0 && (
          <div className="blk">
            <div className="kicker">{ui.flavours}</div>
            <FlavourRow wine={wine} lang={lang} />
          </div>
        )}
        {story && (
          <div className="blk">
            <div className="kicker">{ui.notes}</div>
            <Story text={story} />
          </div>
        )}
        {pairing && <div className="blk sep"><Pairing text={pairing} ui={ui} /></div>}
        {hasProfile(wine.profile) && (
          <div className="blk sep"><TasteProfile profile={wine.profile!} ui={ui} /></div>
        )}
        {summary && (
          <div className="blk sep">
            <div className="summary-box">
              <span className="cup">🍷</span>
              <span>{summary}</span>
            </div>
          </div>
        )}
        {d && hasSpec(d, lang) && (
          <div className="blk sep">
            <h2 className="section-title">{ui.details}</h2>
            <SpecRows details={d} lang={lang} ui={ui} />
          </div>
        )}
        {d && hasRegion(d, lang) && (
          <div className="blk sep">
            <h2 className="section-title">{ui.region}</h2>
            <Region details={d} lang={lang} ui={ui} />
          </div>
        )}
        {wine.url && (
          <div className="blk sep">
            <a className="source-link" href={wine.url} target="_blank" rel="noopener noreferrer">
              {ui.source} ↗
            </a>
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create the dynamic detail route**

`src/app/wine/[slug]/page.tsx`:

```tsx
import { getAllWines, getWine } from '@/lib/wines'
import { notFound } from 'next/navigation'
import WineDetail from '@/components/wine/WineDetail'

export async function generateStaticParams() {
  return getAllWines().map(w => ({ slug: w.slug }))
}

export default async function WineEntryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const wine = getWine(slug)
  if (!wine) notFound()
  return <WineDetail wine={wine} />
}
```

- [ ] **Step 3: Build and verify detail routes generate**

Run: `npm run build`
Expected: build succeeds; output includes prerendered pages for `/wine/yangarra-old-vine-grenache-2021` and `/wine/les-capriades-pet-nat-piege-a-filles` (a `/wine/[slug]` entry with 2 generated params). No TypeScript errors.

- [ ] **Step 4: Visual check**

Run: `npm run dev`. From `/gourmet/wine`, click each card.
Expected (Layout B, since samples have no photos): back link, hero with a color wash + big 🍷, wine name + winery + "Tasted …" + "$45.00 AUD / 750 ml" + tag chips; Flavour Notes icon row; Notes with a drop-cap first paragraph; a two-column panel with **Pairing** (left) and **Taste Profile** (right) showing four sliders labelled Body / Tannin / Acidity / Sweetness with the dot at the right stop; a summary band with 🍷; a Details block listing Producer · Country (with flag) · Region · Varieties · Alcohol · Vintage · Size · Closure; a Region block with a "View region ↗" link (Yangarra only); and a "View product ↗" source link (Yangarra only). Stop the dev server when done.

- [ ] **Step 5: Commit**

```bash
git add src/components/wine/WineDetail.tsx "src/app/wine/[slug]/page.tsx"
git commit -m "feat(wine): add wine detail page with taste sliders and details spec"
```

---

## Task 6: Header nav entrance

**Files:**
- Modify: `src/components/Header.tsx`

- [ ] **Step 1: Replace the Header with the nav-enabled version**

Replace the entire contents of `src/components/Header.tsx` with:

```tsx
'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useLang } from './LanguageContext'
import { basePath } from '@/lib/basePath'
import { WINE_UI } from '@/lib/wineI18n'

export default function Header() {
  const { lang, toggle } = useLang()
  const pathname = usePathname()
  const isHome = pathname === '/'
  const isWine = pathname.startsWith('/wine')
  const ui = WINE_UI[lang]

  const navClass = (active: boolean) =>
    `font-label text-xs uppercase tracking-widest pb-1 border-b-2 transition-colors ${
      active ? 'border-white text-white font-semibold' : 'border-transparent text-white/70 hover:text-white'
    }`

  return (
    <header className={`sticky top-0 z-50 header-gradient ${isHome ? '' : 'border-b-[3px] border-[#0F84B5]'}`}>
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 group">
          <Image
            src={`${basePath}/logo-mark.png`}
            alt=""
            width={38}
            height={38}
            priority
            className="rounded-full ring-2 ring-white/70 shadow-sm"
          />
          <span className="font-display font-bold text-xl tracking-tight text-white group-hover:opacity-80 transition-opacity">
            猪比登美食指南
          </span>
        </Link>
        <div className="flex items-center gap-4 sm:gap-5">
          <nav className="flex items-center gap-3 sm:gap-4">
            <Link href="/" className={navClass(!isWine)}>{ui.navRestaurants}</Link>
            <Link href="/wine" className={navClass(isWine)}>{ui.navWine}</Link>
          </nav>
          <button
            onClick={toggle}
            className="font-label text-xs uppercase tracking-widest px-3 py-1.5 rounded-full border border-white text-white hover:bg-white hover:text-[#F0742A] transition-all duration-200"
          >
            {lang === 'en' ? '中文' : 'EN'}
          </button>
        </div>
      </div>
    </header>
  )
}
```

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: build succeeds, no TypeScript errors.

- [ ] **Step 3: Visual check — the entrance + active states + language**

Run: `npm run dev`.
Expected:
- On `/gourmet` (home): header shows logo, then `Restaurants · Wine` (Restaurants underlined/active in white), then the language toggle. Homepage layout is otherwise unchanged.
- Click **Wine** → navigates to `/gourmet/wine`; now **Wine** is the active (underlined) tab. Click **Restaurants** → back home.
- Toggle **中文/EN**: nav labels switch between `Restaurants·Wine` and `餐厅·酒评`, and all wine list/detail text (title, intro, filters, section titles, slider labels, details field labels, story/summary) switches language.
- Visit a restaurant detail page (e.g. from the home grid) → **Restaurants** stays active. Stop the dev server when done.

- [ ] **Step 4: Commit**

```bash
git add src/components/Header.tsx
git commit -m "feat(wine): add Restaurants/Wine nav entrance to the header"
```

---

## Task 7: Full verification

**Files:** none (verification only)

- [ ] **Step 1: Run the unit tests**

Run: `npm test`
Expected: all tests pass, including `wines.test.ts` and `wineI18n.test.ts` (plus the pre-existing `format` and `restaurants` tests).

- [ ] **Step 2: Full production build**

Run: `npm run build`
Expected: success. The route summary lists `/`, `/wine`, `/wine/[slug]`, and `/[slug]`. Confirm the exported output contains the wine pages:

Run: `ls out/wine && ls out/wine/yangarra-old-vine-grenache-2021`
Expected: an `index.html` for `/wine` and for each wine slug.

- [ ] **Step 3: Serve the exported site and walk through it**

Run: `npx serve out -l 3001` (or any static server), open `http://localhost:3001/gourmet/wine`.
Expected: the same behavior as the dev checks, served from the static export (this is what GitHub Pages serves). Verify images/glyphs, both layouts, sliders, nav active states, and language toggle. Stop the server when done.

- [ ] **Step 4: Confirm the restaurant guide is unchanged**

Open `http://localhost:3001/gourmet/` and one restaurant detail page.
Expected: identical to before except the new `Restaurants · Wine` nav in the header. No layout/palette regressions on the guide.

---

## Self-Review (completed during planning)

**Spec coverage:**
- Routing `/wine` + `/wine/[slug]` → Tasks 4, 5. ✅
- Header entrance (Restaurants/Wine, active state, bilingual) → Task 6. ✅
- Visual system (coffee-diary layout, gourmet palette, scoped CSS, reused fonts) → Task 3. ✅
- Data model (`WineEntry`, 4 metrics, 8-field Details) → Task 1. ✅
- List page (search, type pills, cards, empty states) → Task 4. ✅
- Detail page (A/B layouts, flavour, notes, pairing+sliders, summary, details, region, source) → Task 5. ✅
- Bilingual dictionary + tone → Tasks 2 (dict) + 1 (sample content). ✅
- Sample content (2 wines + empty state) → Task 1 + Task 4 empty-state code. ✅
- Build/verify, basePath images, no auto-commit → Task 7 + conventions. ✅

**Placeholder scan:** No TBD/TODO. The only "paste verbatim" instruction (Task 3) is a precise, deterministic transform of a known source file with the exact new variable block and the exact single edit spelled out — not a hand-wave.

**Type consistency:** `WineEntry`/`Localized`/`Level`/`WineType`/`WineProfile`/`WineDetails` defined in Task 1 are the names imported in Tasks 4–5. `WINE_UI`/`WineUIStrings`/`pick` from Task 2 are imported consistently (`WineUIStrings` is the prop type threaded through every detail sub-component). `sortWines`/`getAllWines`/`getWine` names match between lib (Task 1) and routes (Tasks 4–5). `DIMS` order (body, tannin, acidity, sweetness) matches `WineProfile` and `WINE_UI.dims`. Class names used in the components exist in the ported `wine.css` (they are diary.css's original names, kept intact).

**Notes for the implementer:**
- `<img>` (not `next/image`) is used deliberately for the ported editorial layout; the per-`<img>` eslint-disable comments keep `@next/next/no-img-element` quiet.
- The active-nav underline is white (matching the existing `CategoryNav`) rather than aegean, for legibility on the gradient — a deliberate small deviation from the spec's "aegean underline"; easy to switch to `border-[#0F84B5]` if preferred.
- If the CSS-nesting flatten in Task 3 ever misbehaves, the visual check in Task 4 Step 5 catches it immediately (styles would be unscoped/absent).
