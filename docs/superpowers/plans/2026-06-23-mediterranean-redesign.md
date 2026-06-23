# Mediterranean Visual Overhaul — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Re-skin the gourmet guide into a "Mediterranean editorial" identity (terracotta + Aegean blue + cream, magazine layout) per `docs/superpowers/specs/2026-06-23-mediterranean-redesign-design.md`, keeping static export + bilingual behaviour.

**Architecture:** Next.js 16 App Router, static export. Data = markdown + gray-matter in `src/data/restaurants/`, read server-side in `src/lib/restaurants.ts`, rendered by client components that read language from `LanguageContext`. This plan adds two data fields (`visited`, `tagline_*`), remaps `category`, sorts newest-first, and restyles every component. Pure logic (date formatting, sort) is unit-tested with Vitest; visual changes are verified with `npm run build` + grep of `out/` + the dev server.

**Tech Stack:** Next 16, React 19, Tailwind v4 (arbitrary hex classes, matching existing code), `next/font/google`, gray-matter, Vitest.

**Design tokens (use these exact hexes — match existing arbitrary-class style):**
`#F0742A` terracotta · `#0F84B5` aegean · `#0C6E97` aegean-ink · `#FCFAF4` cream · `#13314A` ink · `#4A5A68` ink-soft · `#8A99A6` ink-faint · `#7d93a6` placeholder.

**Helper classes (added in Task 2, used everywhere):** `font-display` (Fraunces → Noto Serif SC → serif), `font-label` (JetBrains Mono). Body default = Inter.

---

## Task 1: Vitest setup

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`
- Create: `src/lib/format.test.ts` (sanity test, replaced in Task 3)

- [ ] **Step 1: Install Vitest**

Run: `npm install -D vitest`
Expected: adds `vitest` to devDependencies, exits 0.

- [ ] **Step 2: Add test script**

In `package.json` `"scripts"`, add:
```json
"test": "vitest run"
```

- [ ] **Step 3: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  test: { environment: 'node' },
})
```

- [ ] **Step 4: Create a sanity test `src/lib/format.test.ts`**

```ts
import { describe, it, expect } from 'vitest'

describe('vitest wiring', () => {
  it('runs', () => {
    expect(1 + 1).toBe(2)
  })
})
```

- [ ] **Step 5: Run tests**

Run: `npm test`
Expected: 1 passing test.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json vitest.config.ts src/lib/format.test.ts
git commit -m "chore: add vitest"
```

---

## Task 2: Fonts + global tokens

**Files:**
- Modify: `src/app/layout.tsx`
- Modify: `src/app/globals.css`

- [ ] **Step 1: Replace `src/app/layout.tsx`**

```tsx
import type { Metadata } from 'next'
import { Fraunces, Inter, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { LangProvider } from '@/components/LanguageContext'
import Header from '@/components/Header'
import Footer from '@/components/Footer'

const fraunces = Fraunces({ subsets: ['latin'], variable: '--font-fraunces' })
const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' })

export const metadata: Metadata = {
  title: '猪比登美食指南🐷🕵️',
  description: 'A personal guide to restaurants, cafés & bars worth revisiting.',
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🐽</text></svg>",
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${inter.variable} ${jetbrainsMono.variable} antialiased`}>
      <body className="min-h-screen bg-[#FCFAF4] text-[#13314A] font-[family-name:var(--font-inter)]">
        <LangProvider>
          <Header />
          <main>{children}</main>
          <Footer />
        </LangProvider>
      </body>
    </html>
  )
}
```

- [ ] **Step 2: Replace `src/app/globals.css`**

```css
@import "tailwindcss";
@import url('https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@600;700&display=swap');

:root {
  --background: #FCFAF4;
  --foreground: #13314A;
}

body {
  background: var(--background);
  color: var(--foreground);
}

/* Editorial heading stack: Latin via Fraunces, CJK falls through to Noto Serif SC */
.font-display { font-family: var(--font-fraunces), 'Noto Serif SC', Georgia, serif; }
.font-label { font-family: var(--font-mono), ui-monospace, monospace; }
```

- [ ] **Step 3: Build to verify fonts resolve**

Run: `npm run build`
Expected: compiles successfully (downloads Fraunces/Inter/JetBrains Mono via next/font). If next/font errors, re-check the import names (`Fraunces`, `Inter`, `JetBrains_Mono`).

- [ ] **Step 4: Commit**

```bash
git add src/app/layout.tsx src/app/globals.css
git commit -m "feat: load Mediterranean fonts + cream/ink tokens"
```

---

## Task 3: `formatVisited` helper (TDD)

**Files:**
- Create/replace: `src/lib/format.ts`
- Replace: `src/lib/format.test.ts`

- [ ] **Step 1: Write failing tests in `src/lib/format.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { formatVisited } from './format'

describe('formatVisited', () => {
  it('formats English month + year', () => {
    expect(formatVisited('2026-06', 'en')).toBe('Visited June 2026')
    expect(formatVisited('2026-03', 'en')).toBe('Visited March 2026')
  })
  it('formats Chinese', () => {
    expect(formatVisited('2026-06', 'zh')).toBe('造访于 2026 年 6 月')
  })
  it('returns empty string for missing or malformed input', () => {
    expect(formatVisited('', 'en')).toBe('')
    expect(formatVisited('2026', 'en')).toBe('')
    expect(formatVisited('2026-13', 'en')).toBe('')
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test`
Expected: FAIL — `formatVisited` not found / module './format' has no export.

- [ ] **Step 3: Implement `src/lib/format.ts`**

```ts
const EN_MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export function formatVisited(visited: string, lang: 'en' | 'zh'): string {
  const m = /^(\d{4})-(\d{2})$/.exec(visited ?? '')
  if (!m) return ''
  const year = m[1]
  const monthIdx = parseInt(m[2], 10) - 1
  if (monthIdx < 0 || monthIdx > 11) return ''
  if (lang === 'zh') return `造访于 ${year} 年 ${monthIdx + 1} 月`
  return `Visited ${EN_MONTHS[monthIdx]} ${year}`
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm test`
Expected: all `formatVisited` tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/format.ts src/lib/format.test.ts
git commit -m "feat: add formatVisited helper"
```

---

## Task 4: Data layer — type, fields, sort (TDD for sort)

**Files:**
- Modify: `src/lib/restaurants.ts`
- Create: `src/lib/restaurants.test.ts`

- [ ] **Step 1: Write failing test `src/lib/restaurants.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { sortRestaurants, type Restaurant } from './restaurants'

const make = (slug: string, visited: string): Restaurant => ({
  slug, name: slug, suburb: '', city: '', category: 'food',
  cuisine_en: '', cuisine_zh: '', map_url: '', map_type: 'google',
  visited, images: [], review_en: '', review_zh: '',
})

describe('sortRestaurants', () => {
  it('orders newest visited first, slug as tiebreak', () => {
    const out = sortRestaurants([
      make('a', '2026-03'),
      make('b', '2026-06'),
      make('c', '2026-06'),
    ]).map(r => r.slug)
    expect(out).toEqual(['b', 'c', 'a'])
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test`
Expected: FAIL — `sortRestaurants` not exported.

- [ ] **Step 3: Replace `src/lib/restaurants.ts`**

```ts
import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'

export type Category = 'food' | 'cafe' | 'bar'

export type Restaurant = {
  slug: string
  name: string
  suburb: string
  city: string
  category: Category
  cuisine_en: string
  cuisine_zh: string
  map_url: string
  map_type: 'google' | 'amap'
  visited: string // YYYY-MM
  tagline_en?: string
  tagline_zh?: string
  images: string[]
  review_en: string
  review_zh: string
}

const dataDir = path.join(process.cwd(), 'src/data/restaurants')

function parseReviews(content: string): { en: string; zh: string } {
  const enMatch = content.match(/## en\s+([\s\S]*?)(?=## zh|$)/i)
  const zhMatch = content.match(/## zh\s+([\s\S]*?)$/i)
  return {
    en: enMatch ? enMatch[1].trim() : '',
    zh: zhMatch ? zhMatch[1].trim() : '',
  }
}

export function sortRestaurants(list: Restaurant[]): Restaurant[] {
  return [...list].sort(
    (a, b) => b.visited.localeCompare(a.visited) || a.slug.localeCompare(b.slug)
  )
}

export function getAllRestaurants(): Restaurant[] {
  const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.md'))
  const list = files.map(file => {
    const raw = fs.readFileSync(path.join(dataDir, file), 'utf-8')
    const { data, content } = matter(raw)
    const { en, zh } = parseReviews(content)
    return { ...data, review_en: en, review_zh: zh } as Restaurant
  })
  return sortRestaurants(list)
}

export function getRestaurant(slug: string): Restaurant | undefined {
  return getAllRestaurants().find(r => r.slug === slug)
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm test`
Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/restaurants.ts src/lib/restaurants.test.ts
git commit -m "feat: add visited/tagline fields, category type, newest-first sort"
```

---

## Task 5: Migrate the 3 content entries

**Files:**
- Modify: `src/data/restaurants/marys.md`
- Modify: `src/data/restaurants/death-and-co.md`
- Modify: `src/data/restaurants/south-aus-hotel.md`

- [ ] **Step 1: `marys.md` frontmatter** — change `category`, add `visited`, `tagline_*`. New frontmatter block (leave the `## en` / `## zh` body unchanged):

```yaml
---
slug: marys
name: "Mary's"
suburb: "Collingwood"
city: "Melbourne"
category: food
cuisine_en: "Nigerian"
cuisine_zh: "尼日利亚菜"
map_url: "https://www.google.com/maps/search/Mary's+Collingwood+Nigerian"
map_type: google
visited: "2026-06"
tagline_en: "No question — a Collingwood must. Smoky, soulful, gloriously unpretentious."
tagline_zh: "毫无悬念的 Collingwood 必打卡——烟火气十足，毫不端着。"
images:
  - "1.jpg"
  - "2.jpg"
  - "3.jpg"
---
```

- [ ] **Step 2: `death-and-co.md` frontmatter** — `winebar` → `bar`, add `visited` + taglines:

```yaml
category: bar
visited: "2026-05"
tagline_en: "Cocktail royalty's first stop down under — dim lights, serious drinks."
tagline_zh: "鸡尾酒殿堂的首家海外店，灯光昏暗，酒认真得很。"
```
(Set `category: bar`; add the three lines alongside the existing keys, keeping `images` and body unchanged.)

- [ ] **Step 3: `south-aus-hotel.md` frontmatter** — `winebar` → `bar`, add `visited` + taglines:

```yaml
category: bar
visited: "2026-03"
tagline_en: "A small-town gem worth the detour — proper wine, zero pretension."
tagline_zh: "值得绕路的小镇宝藏，酒地道，人随性。"
```

- [ ] **Step 4: Build to verify content parses**

Run: `npm run build`
Expected: compiles; 3 detail routes generated (`/marys`, `/death-and-co`, `/south-aus-hotel`).

- [ ] **Step 5: Commit**

```bash
git add src/data/restaurants/*.md
git commit -m "content: remap category, add visited dates + taglines"
```

---

## Task 6: Header — terracotta band

**Files:**
- Modify: `src/components/Header.tsx`

- [ ] **Step 1: Replace `src/components/Header.tsx`**

Uses `usePathname()` so the Aegean closing rule shows on every page **except** the homepage (where the hero supplies it, keeping the terracotta continuous).

```tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useLang } from './LanguageContext'

export default function Header() {
  const { lang, toggle } = useLang()
  const pathname = usePathname()
  const isHome = pathname === '/'

  return (
    <header className={`sticky top-0 z-50 bg-[#F0742A] ${isHome ? '' : 'border-b-[3px] border-[#0F84B5]'}`}>
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="font-display font-bold text-xl tracking-tight text-white hover:opacity-80 transition-opacity">
          猪比登美食指南🐷🕵️
        </Link>
        <button
          onClick={toggle}
          className="font-label text-xs uppercase tracking-widest px-3 py-1.5 rounded-full border border-white text-white hover:bg-white hover:text-[#F0742A] transition-all duration-200"
        >
          {lang === 'en' ? '中文' : 'EN'}
        </button>
      </div>
    </header>
  )
}
```

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: compiles.

- [ ] **Step 3: Commit**

```bash
git add src/components/Header.tsx
git commit -m "feat: terracotta header"
```

---

## Task 7: CategoryNav (new)

**Files:**
- Create: `src/components/CategoryNav.tsx`

- [ ] **Step 1: Create `src/components/CategoryNav.tsx`**

```tsx
'use client'

import { useLang } from './LanguageContext'
import type { Category } from '@/lib/restaurants'

export type CategoryFilter = 'all' | Category

const LABELS: Record<CategoryFilter, { en: string; zh: string }> = {
  all: { en: 'All', zh: '全部' },
  food: { en: 'Food', zh: '餐厅' },
  cafe: { en: 'Cafés', zh: '咖啡' },
  bar: { en: 'Bars', zh: '酒吧' },
}
const ORDER: CategoryFilter[] = ['all', 'food', 'cafe', 'bar']

export default function CategoryNav({
  value,
  onChange,
}: {
  value: CategoryFilter
  onChange: (v: CategoryFilter) => void
}) {
  const { lang } = useLang()
  return (
    <nav className="flex flex-wrap gap-x-6 gap-y-2 font-label text-xs uppercase tracking-widest">
      {ORDER.map(c => (
        <button
          key={c}
          onClick={() => onChange(c)}
          className={`pb-1 border-b-2 transition-colors ${
            value === c ? 'border-white text-white font-bold' : 'border-transparent text-white/80 hover:text-white'
          }`}
        >
          {lang === 'en' ? LABELS[c].en : LABELS[c].zh}
        </button>
      ))}
    </nav>
  )
}
```

- [ ] **Step 2: Commit** (consumed in Task 9; build verified there)

```bash
git add src/components/CategoryNav.tsx
git commit -m "feat: add CategoryNav"
```

---

## Task 8: SearchBar — Aegean restyle

**Files:**
- Modify: `src/components/SearchBar.tsx`

- [ ] **Step 1: Replace `src/components/SearchBar.tsx`** (props/logic identical; only styling changes)

```tsx
'use client'

import { useLang } from './LanguageContext'

type Props = {
  keyword: string
  city: string
  cities: string[]
  onKeywordChange: (v: string) => void
  onCityChange: (v: string) => void
}

export default function SearchBar({ keyword, city, cities, onKeywordChange, onCityChange }: Props) {
  const { lang } = useLang()
  const placeholder = lang === 'en' ? 'Restaurant or cuisine…' : '餐厅名称或菜系…'
  const allLabel = lang === 'en' ? 'All Cities' : '全部城市'

  return (
    <div className="flex flex-col sm:flex-row w-full max-w-2xl bg-white border-2 border-[#0F84B5]">
      <div className="flex items-center flex-1 px-4 py-3 gap-2">
        <svg className="w-4 h-4 text-[#0F84B5] shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <circle cx="11" cy="11" r="8" /><path strokeLinecap="round" d="m21 21-4.35-4.35" />
        </svg>
        <input
          type="text"
          value={keyword}
          onChange={e => onKeywordChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1 bg-transparent text-[#13314A] placeholder-[#7d93a6] text-sm outline-none"
        />
      </div>

      <div className="hidden sm:block w-0.5 bg-[#0F84B5]" />
      <div className="sm:hidden h-0.5 bg-[#0F84B5]" />

      <div className="flex items-center px-4 py-3 sm:w-44">
        <select
          value={city}
          onChange={e => onCityChange(e.target.value)}
          className="w-full bg-transparent text-[#13314A] text-xs font-label uppercase tracking-wide outline-none cursor-pointer appearance-none"
        >
          <option value="all">{allLabel}</option>
          {cities.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      <button
        onClick={() => {}}
        className="bg-[#0F84B5] text-white font-label text-xs font-bold uppercase tracking-widest px-6 py-3 hover:bg-[#0C6E97] transition-colors duration-200"
      >
        {lang === 'en' ? 'Find' : '搜索'}
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Commit** (build verified in Task 9)

```bash
git add src/components/SearchBar.tsx
git commit -m "feat: restyle SearchBar (Aegean, square)"
```

---

## Task 9: HomepageClient — hero, category filter, headline/grid split

**Files:**
- Modify: `src/components/HomepageClient.tsx`

- [ ] **Step 1: Replace `src/components/HomepageClient.tsx`**

```tsx
'use client'

import { useState, useMemo } from 'react'
import type { Restaurant } from '@/lib/restaurants'
import SearchBar from './SearchBar'
import RestaurantGrid from './RestaurantGrid'
import FeaturedCard from './FeaturedCard'
import CategoryNav, { type CategoryFilter } from './CategoryNav'
import { useLang } from './LanguageContext'

export default function HomepageClient({ restaurants }: { restaurants: Restaurant[] }) {
  const { lang } = useLang()
  const [keyword, setKeyword] = useState('')
  const [city, setCity] = useState('all')
  const [category, setCategory] = useState<CategoryFilter>('all')

  const cities = useMemo(() => [...new Set(restaurants.map(r => r.city))].sort(), [restaurants])

  const filtered = useMemo(() => {
    const kw = keyword.toLowerCase().trim()
    return restaurants.filter(r => {
      const cityMatch = city === 'all' || r.city === city
      const catMatch = category === 'all' || r.category === category
      const kwMatch =
        kw === '' ||
        r.name.toLowerCase().includes(kw) ||
        r.cuisine_en.toLowerCase().includes(kw) ||
        r.cuisine_zh.includes(kw)
      return cityMatch && catMatch && kwMatch
    })
  }, [restaurants, keyword, city, category])

  const headline = filtered[0]
  const rest = filtered.slice(1)

  const hero =
    lang === 'en'
      ? {
          heading: (<>Places I Actually<br /><em className="italic">Go Back To.</em></>),
          sub: 'A personal guide to restaurants, cafés & bars worth revisiting.',
        }
      : {
          heading: (<>真正值得<br /><em className="italic">回去</em>的地方。</>),
          sub: '私藏美食清单，餐厅、咖啡馆与酒吧，全凭真心推荐。',
        }

  const tag = `Melbourne & SA · ${filtered.length} ${lang === 'en' ? (filtered.length === 1 ? 'Entry' : 'Entries') : '家'} · Est. 2026`

  return (
    <div>
      {/* Terracotta hero region (continues from the header) */}
      <section className="bg-[#F0742A]">
        <div className="max-w-6xl mx-auto px-6 pt-10 pb-8">
          <p className="font-label text-[11px] uppercase tracking-[0.22em] text-white/85 mb-3">{tag}</p>
          <h1 className="font-display font-semibold text-white text-4xl md:text-5xl leading-[1.02] max-w-[14ch]">
            {hero.heading}
          </h1>
          <p className="mt-4 text-white/90 max-w-xl">{hero.sub}</p>
          <div className="mt-7">
            <CategoryNav value={category} onChange={setCategory} />
          </div>
        </div>
        <div className="h-[3px] bg-[#0F84B5]" />
      </section>

      {/* Cream body */}
      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="mb-10">
          <SearchBar
            keyword={keyword}
            city={city}
            cities={cities}
            onKeywordChange={setKeyword}
            onCityChange={setCity}
          />
        </div>

        {filtered.length === 0 ? (
          <p className="font-label text-sm text-[#8A99A6] mt-8">
            {lang === 'en' ? 'No results. Try a different keyword or filter.' : '没有找到结果，换个关键词或筛选试试。'}
          </p>
        ) : (
          <>
            {headline && <FeaturedCard restaurant={headline} number={1} />}
            {rest.length > 0 && <RestaurantGrid restaurants={rest} startNumber={2} />}
          </>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Build** (will fail until Task 10 adds FeaturedCard/Grid signature — that's expected; do Task 10 next, then build)

Run: `npm run build`
Expected: FAIL — `FeaturedCard` not found. Proceed to Task 10, then build there.

- [ ] **Step 3: Commit** (after Task 10 build passes — see Task 10 Step 4)

---

## Task 10: FeaturedCard + RestaurantCard + RestaurantGrid

**Files:**
- Create: `src/components/FeaturedCard.tsx`
- Modify: `src/components/RestaurantCard.tsx`
- Modify: `src/components/RestaurantGrid.tsx`

- [ ] **Step 1: Create `src/components/FeaturedCard.tsx`**

```tsx
'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useLang } from './LanguageContext'
import type { Restaurant } from '@/lib/restaurants'
import { basePath } from '@/lib/basePath'

export default function FeaturedCard({ restaurant, number }: { restaurant: Restaurant; number: number }) {
  const { lang } = useLang()
  const { slug, name, suburb, city, cuisine_en, cuisine_zh, tagline_en, tagline_zh, images } = restaurant
  const cuisine = lang === 'en' ? cuisine_en : cuisine_zh
  const tagline = lang === 'en' ? tagline_en : tagline_zh
  const num = String(number).padStart(2, '0')

  return (
    <Link href={`/${slug}`} className="group block border-b-[1.5px] border-[#0F84B5] pb-8 mb-8">
      <div className="grid md:grid-cols-[1.15fr_1fr] gap-7 items-center">
        <div className="relative aspect-[4/3] overflow-hidden">
          <Image
            src={`${basePath}/images/${slug}/${images[0]}`}
            alt={name}
            fill
            priority
            className="object-cover group-hover:scale-105 transition-transform duration-500"
            sizes="(max-width: 768px) 100vw, 560px"
          />
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

- [ ] **Step 2: Replace `src/components/RestaurantCard.tsx`**

```tsx
'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useLang } from './LanguageContext'
import type { Restaurant } from '@/lib/restaurants'
import { basePath } from '@/lib/basePath'

export default function RestaurantCard({ restaurant, number }: { restaurant: Restaurant; number: number }) {
  const { lang } = useLang()
  const { slug, name, suburb, city, cuisine_en, cuisine_zh, images } = restaurant
  const cuisine = lang === 'en' ? cuisine_en : cuisine_zh
  const num = String(number).padStart(2, '0')

  return (
    <Link href={`/${slug}`} className="group block">
      <div className="relative aspect-[16/10] overflow-hidden mb-3">
        <Image
          src={`${basePath}/images/${slug}/${images[0]}`}
          alt={name}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-500"
          sizes="(max-width: 768px) 100vw, 50vw"
        />
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

- [ ] **Step 3: Replace `src/components/RestaurantGrid.tsx`**

```tsx
'use client'

import type { Restaurant } from '@/lib/restaurants'
import RestaurantCard from './RestaurantCard'

export default function RestaurantGrid({
  restaurants,
  startNumber,
}: {
  restaurants: Restaurant[]
  startNumber: number
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-10">
      {restaurants.map((r, i) => (
        <RestaurantCard key={r.slug} restaurant={r} number={startNumber + i} />
      ))}
    </div>
  )
}
```

- [ ] **Step 4: Build**

Run: `npm run build`
Expected: compiles; homepage + 3 detail routes generated.

- [ ] **Step 5: Verify homepage content in export**

Run: `grep -o "No question — a Collingwood must[^<\"]*" out/index.html | head -1`
Expected: prints the Mary's tagline (Mary's is newest → headline, English default render).

Run: `grep -o "Food\|Cafés\|Bars\|№ 0[0-9]" out/index.html | sort -u`
Expected: shows `Bars`, `Cafés`, `Food`, `№ 01`, `№ 02`, `№ 03`.

- [ ] **Step 6: Commit** (includes HomepageClient/SearchBar/CategoryNav from Tasks 7–9)

```bash
git add src/components/FeaturedCard.tsx src/components/RestaurantCard.tsx src/components/RestaurantGrid.tsx src/components/HomepageClient.tsx
git commit -m "feat: magazine homepage (hero, category filter, headline + numbered grid)"
```

---

## Task 11: RestaurantDetail — reskin + Visited line (keep map_type)

**Files:**
- Modify: `src/components/RestaurantDetail.tsx`

- [ ] **Step 1: Replace `src/components/RestaurantDetail.tsx`**

```tsx
'use client'

import Image from 'next/image'
import { useLang } from './LanguageContext'
import type { Restaurant } from '@/lib/restaurants'
import { basePath } from '@/lib/basePath'
import { formatVisited } from '@/lib/format'

export default function RestaurantDetail({ restaurant }: { restaurant: Restaurant }) {
  const { lang } = useLang()
  const {
    slug, name, suburb, city, cuisine_en, cuisine_zh,
    images, review_en, review_zh, map_url, map_type, visited,
  } = restaurant

  const cuisine = lang === 'en' ? cuisine_en : cuisine_zh
  const review = lang === 'en' ? review_en : review_zh
  const locationLabel = lang === 'en' ? `${suburb}, ${city}` : `${city} · ${suburb}`
  const visitedLabel = formatVisited(visited, lang)
  const mapLabel = map_type === 'amap'
    ? (lang === 'en' ? 'Open in Amap' : '在高德地图查看')
    : (lang === 'en' ? 'Open in Google Maps' : '在谷歌地图查看')

  return (
    <article className="max-w-3xl mx-auto px-6 py-10">
      <div className="relative w-full aspect-[4/3] overflow-hidden mb-8">
        <Image
          src={`${basePath}/images/${slug}/${images[0]}`}
          alt={name}
          fill
          priority
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 768px"
        />
      </div>

      <div className="flex flex-wrap items-start gap-3 mb-2">
        <h1 className="font-display text-3xl md:text-4xl font-bold text-[#13314A]">{name}</h1>
        <span className="font-label text-[10px] uppercase tracking-widest text-[#0C6E97] border-[1.5px] border-[#0F84B5] px-2 py-1 mt-2">
          {cuisine}
        </span>
      </div>
      {visitedLabel && (
        <p className="font-label text-[11px] uppercase tracking-wider text-[#F0742A] mb-1">{visitedLabel}</p>
      )}
      <p className="font-label text-[11px] uppercase tracking-wider text-[#8A99A6] mb-8">{locationLabel}</p>

      <p className="text-[#13314A] text-lg leading-relaxed mb-12">{review}</p>

      {images.length > 1 && (
        <div className="grid grid-cols-2 gap-3 mb-12">
          {images.slice(1).map((img, i) => (
            <div key={i} className="relative aspect-[4/3] overflow-hidden">
              <Image
                src={`${basePath}/images/${slug}/${img}`}
                alt={`${name} — photo ${i + 2}`}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 50vw, 350px"
              />
            </div>
          ))}
        </div>
      )}

      <a
        href={map_url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 bg-[#0F84B5] text-white font-label text-xs font-bold uppercase tracking-widest px-6 py-3 hover:bg-[#F0742A] transition-colors duration-200"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        {mapLabel}
      </a>
    </article>
  )
}
```

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: compiles.

- [ ] **Step 3: Verify the Visited line in export**

Run: `grep -o "Visited June 2026" out/marys.html | head -1`
Expected: prints `Visited June 2026`.

- [ ] **Step 4: Commit**

```bash
git add src/components/RestaurantDetail.tsx
git commit -m "feat: reskin detail page + Visited line"
```

---

## Task 12: Footer — palette pass

**Files:**
- Modify: `src/components/Footer.tsx`

- [ ] **Step 1: Replace `src/components/Footer.tsx`**

```tsx
export default function Footer() {
  return (
    <footer className="mt-20 border-t-[1.5px] border-[#0F84B5] py-8">
      <div className="max-w-6xl mx-auto px-6 font-label text-xs uppercase tracking-wider text-[#8A99A6]">
        say hi 👋{' '}
        <a href="mailto:alubiaroja529@gmail.com" className="text-[#0C6E97] normal-case hover:text-[#F0742A] transition-colors">
          alubiaroja529@gmail.com
        </a>
      </div>
    </footer>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/Footer.tsx
git commit -m "feat: restyle footer"
```

---

## Task 13: Full QA pass

**Files:** none (verification only)

- [ ] **Step 1: Tests + build**

Run: `npm test && npm run build`
Expected: all tests pass; build succeeds with routes `/`, `/marys`, `/death-and-co`, `/south-aus-hotel`.

- [ ] **Step 2: Manual visual check (both languages)**

Run: `npm run dev`, open `http://localhost:3000`. Confirm:
- Header + hero are one continuous terracotta block; Aegean rule closes it above the search bar.
- Category nav filters (Food → Mary's only; Bars → Death & Co + SA Hotel; Cafés → empty state).
- Headline = Mary's (newest, June 2026) with italic tagline + № 01; grid shows № 02 / № 03.
- Toggle 中文: hero, nav labels, tagline, Find, Visited line all switch.
- Detail page: terracotta header with Aegean rule, "Visited June 2026" under the name, blue map button; Amap/Google label still switches by `map_type`.

- [ ] **Step 3: Final commit (if any tweaks)**

```bash
git add -A
git commit -m "polish: Mediterranean redesign QA fixes"
```

---

## Self-Review Notes (author)
- **Spec coverage:** palette/type → Task 2; data model (visited/tagline/category) → Tasks 4–5; sort/headline rule → Tasks 4, 9; magazine homepage → Tasks 7–10; detail + Visited → Task 11; bilingual → handled in each component via `useLang`; fonts incl. CJK → Task 2. All covered.
- **Terracotta-region boundary** (spec §3) → Header `usePathname` + hero closing rule (Tasks 6, 9).
- **Type consistency:** `Category` / `CategoryFilter`, `FeaturedCard({restaurant, number})`, `RestaurantCard({restaurant, number})`, `RestaurantGrid({restaurants, startNumber})`, `formatVisited(visited, lang)`, `sortRestaurants(list)` — names consistent across tasks.
- **Out of scope:** no new places, no CMS/booking, deployment unchanged. Push to `main` (auto-deploy) only on user instruction.
