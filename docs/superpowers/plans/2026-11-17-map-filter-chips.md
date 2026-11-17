# 地图筛选按钮改版 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/map` 的分类按钮改成「默认深灰、点了才选中(橙色)、可多选、都不选 = 全部」;城市按钮改成两级:第一排「总览 + 圆形国旗 + 国名」,点国家后出现第二排该国城市,镜头移到该国全部地点。

**Architecture:** 设计见 `docs/superpowers/specs/2026-11-17-map-filter-chips-design.md`。纯逻辑放 `src/lib/map/`(可单测):`countries.ts`(国家清单、国旗 emoji、国内坐标筛选、星形坐标)与 `kinds.ts` 新增的 `effectiveKinds` / `toggledKinds`。`cities.json` 每城加 `country`。UI:新组件 `FlagCircle.tsx`(代码画的圆旗,AU / JP;其他国家用 emoji 裁圆后备),`CityChips.tsx` 改为两排,`KindChips.tsx` 改样式与语义。状态在 `MapPageClient.tsx`(新增 `activeCountry`、`selectedKinds`),`MapView.tsx` 只在总览分支里多认一个 `activeCountry` 来缩小镜头范围——城市视角、卡片、小人逻辑都不动。

**Tech Stack:** React 19、MapLibre GL 6、Tailwind 4、Vitest 2。无新依赖。

**基线:** main @ `081e5e1`,`npx vitest run` = **173 passed**。

---

## 开工前必读

- 先完整读 `CLAUDE.md`(尤其「Map (`/map`)」里关于 camera padding 的三个坑——本计划只在总览分支换了 fitBounds 的范围,不新增任何镜头调用)。
- 工作目录 `/Users/tantianshu/Documents/code/gourmet/web`(git 根)。共用检出,不要新建 worktree。
- 分支 `feat/map-filter-chips`,从 main 切出。每个 Task 一次 commit,提交信息用计划里的。
- **不 push、不合并 main、不改 `.env*`、不启动 dev 服务器**(指挥官自己起预览验收)。
- 设计文档和本计划文件都还没进 git,Task 1 的 commit 把它们一起加上。

---

### Task 1: 国家数据与纯逻辑(TDD)

**Files:**
- Create: `src/lib/map/countries.ts`
- Test: `src/lib/map/countries.test.ts`
- Modify: `src/lib/map/cities.ts`(`City` 类型加 `country`)、`src/data/map/cities.json`(每城加 `country`)
- Modify: `src/lib/map/kinds.ts`(加 `effectiveKinds`、`toggledKinds`)
- Test: `src/lib/map/kinds.test.ts`

- [ ] **Step 1: 切分支**

```bash
cd /Users/tantianshu/Documents/code/gourmet/web
git checkout main && git checkout -b feat/map-filter-chips
```

- [ ] **Step 2: 写失败的测试**

新建 `src/lib/map/countries.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { COUNTRIES, coordsInCountry, countriesOf, flagEmoji, starPoints } from './countries'
import { CITIES } from './cities'
import type { LngLat } from '@/lib/places'

describe('countries', () => {
  it('flagEmoji builds the regional-indicator pair', () => {
    expect(flagEmoji('AU')).toBe('🇦🇺')
    expect(flagEmoji('jp')).toBe('🇯🇵')
  })
  it('countriesOf lists each country once, in cities.json order', () => {
    expect(countriesOf(CITIES)).toEqual(['AU', 'JP'])
  })
  it('every city names a country that has zh/en names (add it to COUNTRIES if this fails)', () => {
    for (const c of CITIES) expect(COUNTRIES[c.country], `${c.slug} → ${c.country}`).toBeDefined()
  })
  it("coordsInCountry keeps only points inside that country's cities", () => {
    const zareh: LngLat = [144.984692, -37.797961]
    const soma: LngLat = [141.205015, 40.615081]
    expect(coordsInCountry([zareh, soma], CITIES, 'AU')).toEqual([zareh])
    expect(coordsInCountry([zareh, soma], CITIES, 'JP')).toEqual([soma])
  })
  it('starPoints gives 2n points with the first tip straight up', () => {
    const pts = starPoints(100, 100, 50, 7, 0.44).split(' ')
    expect(pts).toHaveLength(14)
    expect(pts[0]).toBe('100.0,50.0')
  })
})
```

`src/lib/map/kinds.test.ts`:import 行

```ts
import { KIND_ORDER, KIND_COLORS, KIND_GLYPHS, isSpotKind } from './kinds'
```

改为

```ts
import { KIND_ORDER, KIND_COLORS, KIND_GLYPHS, effectiveKinds, isSpotKind, toggledKinds } from './kinds'
```

并在 `describe('kinds', …)` 里最后一个 `it` 之后追加:

```ts
  it('effectiveKinds: nothing selected means every kind is shown', () => {
    expect(effectiveKinds([])).toEqual(KIND_ORDER)
    expect(effectiveKinds(['bar', 'cafe'])).toEqual(['bar', 'cafe'])
  })
  it('toggledKinds adds a kind once and removes it on the second tap', () => {
    expect(toggledKinds([], 'cafe')).toEqual(['cafe'])
    expect(toggledKinds(['cafe'], 'bakery')).toEqual(['cafe', 'bakery'])
    expect(toggledKinds(['cafe', 'bakery'], 'cafe')).toEqual(['bakery'])
  })
```

- [ ] **Step 3: 跑测试确认失败**

Run: `npx vitest run src/lib/map/countries.test.ts src/lib/map/kinds.test.ts`
Expected: FAIL(`./countries` 找不到;`effectiveKinds` / `toggledKinds` 不是导出成员)。

- [ ] **Step 4: `City` 类型加 `country`**

`src/lib/map/cities.ts` 里 `City` 类型的

```ts
  name_en: string
```

之后插入一行:

```ts
  /** ISO 3166-1 两位码(AU / JP …),决定地图上的国家筛选按钮 */
  country: string
```

- [ ] **Step 5: `cities.json` 每城加 `country`**

整文件替换 `src/data/map/cities.json` 为:

```json
[
  {
    "slug": "melbourne",
    "name_zh": "墨尔本",
    "name_en": "Melbourne",
    "country": "AU",
    "bounds": [[144.55, -38.1], [145.4, -37.55]],
    "view": { "center": [144.9631, -37.8136], "zoom": 12.5, "pitch": 30, "bearing": 0 }
  },
  {
    "slug": "towada",
    "name_zh": "十和田(青森)",
    "name_en": "Towada, Aomori",
    "country": "JP",
    "bounds": [[141.1, 40.55], [141.3, 40.68]],
    "view": { "center": [141.205, 40.6151], "zoom": 15, "pitch": 50, "bearing": 0 }
  },
  {
    "slug": "mount-gambier",
    "name_zh": "芒特甘比尔",
    "name_en": "Mount Gambier",
    "country": "AU",
    "bounds": [[140.7, -37.88], [140.85, -37.78]],
    "view": { "center": [140.7838, -37.8297], "zoom": 15, "pitch": 50, "bearing": 0 }
  },
  {
    "slug": "mornington-peninsula",
    "name_zh": "莫宁顿半岛",
    "name_en": "Mornington Peninsula",
    "country": "AU",
    "bounds": [[144.65, -38.5], [145.3, -38.12]],
    "view": { "center": [145.0, -38.33], "zoom": 14, "pitch": 45, "bearing": 0 }
  },
  {
    "slug": "kanazawa",
    "name_zh": "金泽(石川)",
    "name_en": "Kanazawa, Ishikawa",
    "country": "JP",
    "bounds": [[136.55, 36.48], [136.78, 36.65]],
    "view": { "center": [136.6566, 36.5613], "zoom": 14.5, "pitch": 45, "bearing": 0 }
  }
]
```

(先 `git diff src/data/map/cities.json` 确认除了 5 行 `"country"` 没有别的差异。)

- [ ] **Step 6: 新建 `src/lib/map/countries.ts`**

```ts
import type { LngLat } from '@/lib/places'
import { inBounds, type City } from './cities'

/** 地图国家筛选用到的国家:ISO 两位码 → 中英名。cities.json 出现新国家而这里没有时,countries.test.ts 会失败 */
export const COUNTRIES: Record<string, { name_en: string; name_zh: string }> = {
  AU: { name_en: 'Australia', name_zh: '澳大利亚' },
  JP: { name_en: 'Japan', name_zh: '日本' },
}

/** 'AU' → 🇦🇺(两个 regional indicator 字符);只在没有代码画圆旗的国家当后备 */
export function flagEmoji(code: string): string {
  return [...code.toUpperCase()].map(ch => String.fromCodePoint(0x1f1e6 + ch.charCodeAt(0) - 65)).join('')
}

/** cities.json 里出现过的国家,按第一次出现的顺序 */
export function countriesOf(cities: City[]): string[] {
  return [...new Set(cities.map(c => c.country))]
}

/** 落在该国任一城市边界内的坐标(国家视角的镜头范围) */
export function coordsInCountry(coords: LngLat[], cities: City[], country: string): LngLat[] {
  const mine = cities.filter(c => c.country === country)
  return coords.filter(p => mine.some(c => inBounds(p, c.bounds)))
}

/** 正 n 角星的 polygon points,第一个尖朝正上;ratio = 内半径 / 外半径 */
export function starPoints(cx: number, cy: number, r: number, n: number, ratio: number): string {
  const pts: string[] = []
  for (let i = 0; i < n * 2; i++) {
    const rr = i % 2 ? r * ratio : r
    const a = -Math.PI / 2 + (i * Math.PI) / n
    pts.push(`${(cx + rr * Math.cos(a)).toFixed(1)},${(cy + rr * Math.sin(a)).toFixed(1)}`)
  }
  return pts.join(' ')
}
```

- [ ] **Step 7: `kinds.ts` 加两个函数**

`src/lib/map/kinds.ts` 文件末尾追加:

```ts
/** 地图分类筛选:一个都没选 = 显示全部 */
export function effectiveKinds(selected: PlaceKind[]): PlaceKind[] {
  return selected.length ? selected : KIND_ORDER
}

/** 点一下分类按钮:没选中就加上,已选中就去掉(可多选) */
export function toggledKinds(selected: PlaceKind[], k: PlaceKind): PlaceKind[] {
  return selected.includes(k) ? selected.filter(x => x !== k) : [...selected, k]
}
```

- [ ] **Step 8: 跑测试确认通过**

Run: `npx vitest run`
Expected: **180 passed**(173 + countries 5 + kinds 2)。

- [ ] **Step 9: Commit(连同设计文档与本计划)**

```bash
git add src/lib/map/countries.ts src/lib/map/countries.test.ts src/lib/map/cities.ts src/data/map/cities.json src/lib/map/kinds.ts src/lib/map/kinds.test.ts docs/superpowers/specs/2026-11-17-map-filter-chips-design.md docs/superpowers/plans/2026-11-17-map-filter-chips.md
git commit -m "Map filters: country data, effectiveKinds/toggledKinds"
```

---

### Task 2: 圆形国旗与两级城市按钮

**Files:**
- Create: `src/components/map/FlagCircle.tsx`
- Modify: `src/components/map/CityChips.tsx`(整文件替换)

(这一步改完 `CityChips` 的 props 后,`MapPageClient.tsx` 会类型报错,Task 3 修;所以本 Task 只做文件,**lint / build 留到 Task 3 一起跑**,本 Task 只跑测试。)

- [ ] **Step 1: 新建 `src/components/map/FlagCircle.tsx`**

```tsx
import { flagEmoji, starPoints } from '@/lib/map/countries'

// 代码画的圆形国旗(512×512 画布,外层 span 裁成圆)。没画的国家:国旗 emoji 放大后裁圆顶上。
// 澳大利亚:左上米字旗、左下联邦七角星、右侧南十字星(位置按圆形构图重排过,指挥官 2026-11-17 出图核对过)
const AU_STARS: Array<[number, number, number, number]> = [
  [128, 380, 70, 7],
  [384, 96, 36, 7],
  [384, 420, 38, 7],
  [300, 236, 34, 7],
  [462, 208, 30, 7],
  [420, 300, 18, 5],
]

function Australia() {
  return (
    <svg viewBox="0 0 512 512" width="100%" height="100%" aria-hidden="true">
      <rect width="512" height="512" fill="#012169" />
      {/* 内层 svg 默认 overflow:hidden,把米字旗裁在左上 256×256 里 */}
      <svg x="0" y="0" width="256" height="256" viewBox="0 0 256 256">
        <path d="M0,0 L256,256 M256,0 L0,256" stroke="#fff" strokeWidth="52" />
        <path d="M0,0 L256,256 M256,0 L0,256" stroke="#C8102E" strokeWidth="17" />
        <path d="M128,0 V256 M0,128 H256" stroke="#fff" strokeWidth="84" />
        <path d="M128,0 V256 M0,128 H256" stroke="#C8102E" strokeWidth="50" />
      </svg>
      {AU_STARS.map(([cx, cy, r, n]) => (
        <polygon key={`${cx}-${cy}`} fill="#fff" points={starPoints(cx, cy, r, n, n === 5 ? 0.42 : 0.44)} />
      ))}
    </svg>
  )
}

function Japan() {
  return (
    <svg viewBox="0 0 512 512" width="100%" height="100%" aria-hidden="true">
      <rect width="512" height="512" fill="#fff" />
      <circle cx="256" cy="256" r="154" fill="#BC002D" />
    </svg>
  )
}

export default function FlagCircle({ code, size = 22 }: { code: string; size?: number }) {
  const art = code === 'AU' ? <Australia /> : code === 'JP' ? <Japan /> : null
  return (
    <span
      aria-hidden="true"
      className="inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full"
      style={{ width: size, height: size }}
    >
      {art ?? <span style={{ fontSize: size * 1.55, lineHeight: 1 }}>{flagEmoji(code)}</span>}
    </span>
  )
}
```

- [ ] **Step 2: 整文件替换 `src/components/map/CityChips.tsx`**

```tsx
'use client'

import { useLang } from '@/components/LanguageContext'
import { MAP_UI } from '@/lib/mapI18n'
import type { City } from '@/lib/map/cities'
import { COUNTRIES, countriesOf } from '@/lib/map/countries'
import FlagCircle from './FlagCircle'

/**
 * 城市筛选两级:第一排「总览 + 国家(圆形国旗 + 国名)」,选了国家才出现第二排「该国城市」。
 * 默认深灰底,选中橙底(与分类按钮同一套)。点国家 / 城市的含义由 MapPageClient 的 pickCountry / pickCity 决定。
 */
export default function CityChips({
  cities, country, city, onCountry, onCity,
}: {
  cities: City[]
  country: string | null
  city: string | null
  onCountry: (code: string | null) => void
  onCity: (slug: string) => void
}) {
  const { lang } = useLang()
  const ui = MAP_UI[lang]
  const chip = (on: boolean) =>
    `shrink-0 rounded-full font-label text-xs uppercase tracking-widest transition-colors ${
      on ? 'bg-[#F0742A] text-white' : 'bg-[#1E242C]/80 text-[#F8F2DD] hover:bg-[#1E242C]'
    }`
  const row = 'flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'
  const inCountry = country ? cities.filter(c => c.country === country) : []
  return (
    <div className="flex flex-col gap-2">
      <div className={row}>
        <button
          type="button"
          aria-pressed={country === null}
          className={`${chip(country === null)} px-3 py-1.5`}
          onClick={() => onCountry(null)}
        >
          {ui.overview}
        </button>
        {countriesOf(cities).map(code => {
          const names = COUNTRIES[code]
          const label = names ? (lang === 'en' ? names.name_en : names.name_zh) : code
          return (
            <button
              key={code}
              type="button"
              aria-pressed={country === code}
              className={`${chip(country === code)} inline-flex items-center gap-1.5 py-[3px] pl-[3px] pr-3`}
              onClick={() => onCountry(code)}
            >
              <FlagCircle code={code} />
              {label}
            </button>
          )
        })}
      </div>
      {inCountry.length > 0 && (
        <div className={row}>
          {inCountry.map(c => (
            <button
              key={c.slug}
              type="button"
              aria-pressed={city === c.slug}
              className={`${chip(city === c.slug)} px-3 py-1.5`}
              onClick={() => onCity(c.slug)}
            >
              {lang === 'en' ? c.name_en : c.name_zh}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: 测试**

Run: `npx vitest run`
Expected: **180 passed**(本 Task 没加测试;TS 报错在 vitest 里不影响,Task 3 会修)。

- [ ] **Step 4: Commit**

```bash
git add src/components/map/FlagCircle.tsx src/components/map/CityChips.tsx
git commit -m "Map: round flag chips and a two-level country → city row"
```

---

### Task 3: 分类按钮新语义 + 状态接线 + 国家镜头

**Files:**
- Modify: `src/components/map/KindChips.tsx`(整文件替换)
- Modify: `src/components/map/MapPageClient.tsx`(多处)
- Modify: `src/components/map/MapView.tsx`(props、import、总览分支、deps)

- [ ] **Step 1: 整文件替换 `src/components/map/KindChips.tsx`**

```tsx
'use client'

import { useLang } from '@/components/LanguageContext'
import { MAP_UI } from '@/lib/mapI18n'
import { KIND_ORDER } from '@/lib/map/kinds'
import type { PlaceKind } from '@/lib/places'

/**
 * 分类筛选(可多选,业主 2026-11-17 定):默认全部深灰 = 不筛选、显示全部;点了才选中(橙色),只显示选中的分类。
 * 地图上的徽章 / 标签仍用分类色,这里的按钮不用。
 */
export default function KindChips({
  available, selected, onToggle,
}: { available: PlaceKind[]; selected: PlaceKind[]; onToggle: (k: PlaceKind) => void }) {
  const { lang } = useLang()
  const ui = MAP_UI[lang]
  const shown = KIND_ORDER.filter(k => available.includes(k))
  if (shown.length < 2) return null
  return (
    <div className="flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {shown.map(k => {
        const on = selected.includes(k)
        return (
          <button
            key={k}
            type="button"
            aria-pressed={on}
            onClick={() => onToggle(k)}
            className={`shrink-0 rounded-full px-3 py-1 font-label text-[11px] uppercase tracking-widest transition-colors ${
              on ? 'bg-[#F0742A] text-white' : 'bg-[#1E242C]/80 text-[#F8F2DD] hover:bg-[#1E242C]'
            }`}
          >
            {ui.kinds[k]}
          </button>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 2: `MapPageClient.tsx` —— import**

```ts
import { KIND_ORDER } from '@/lib/map/kinds'
```

改为

```ts
import { KIND_ORDER, effectiveKinds, toggledKinds } from '@/lib/map/kinds'
```

- [ ] **Step 3: `MapPageClient.tsx` —— 状态**

```ts
  const [kinds, setKinds] = useState<PlaceKind[]>(KIND_ORDER)
```

替换为

```ts
  // 只选了国家、还没选城市时,地图停在该国视角(不写进 URL)
  const [activeCountry, setActiveCountry] = useState<string | null>(null)
  // 分类可多选;一个都没选 = 全部显示。传给 MapView 的是 effectiveKinds 之后的结果
  const [selectedKinds, setSelectedKinds] = useState<PlaceKind[]>([])
  const kinds = useMemo(() => effectiveKinds(selectedKinds), [selectedKinds])
```

- [ ] **Step 4: `MapPageClient.tsx` —— 首次挂载读 URL 时带上国家**

这两行(注释 + setState):

```ts
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActiveCity(city && cities.some(c => c.slug === city) ? city : cityFromPlace)
```

替换为(注释要紧贴在第一个 setState 正上方):

```ts
    const startCity = city && cities.some(c => c.slug === city) ? city : cityFromPlace
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActiveCity(startCity)
    setActiveCountry(cities.find(c => c.slug === startCity)?.country ?? null)
```

- [ ] **Step 5: `MapPageClient.tsx` —— 选店时国家跟着城市**

`pickPlace` 里

```ts
    if (c) setActiveCity(c.slug)
```

替换为

```ts
    if (c) {
      setActiveCity(c.slug)
      setActiveCountry(c.country)
    }
```

- [ ] **Step 6: `MapPageClient.tsx` —— `pickCity` / `pickCountry` / `toggleKind`**

把整段

```ts
  const pickCity = useCallback((slug: string | null) => {
    setActiveCity(slug)
    setActiveSlug(null)
    setWalkTarget(null)
  }, [])

  const toggleKind = useCallback((k: PlaceKind) => {
    setKinds(prev => (prev.includes(k) ? prev.filter(x => x !== k) : [...prev, k]))
  }, [])
```

替换为

```ts
  const pickCity = useCallback((slug: string) => {
    setActiveCity(slug)
    setActiveCountry(cities.find(c => c.slug === slug)?.country ?? null)
    setActiveSlug(null)
    setWalkTarget(null)
  }, [cities])

  // 总览(null):清空国家与城市。点国家:选中并进该国视角;已在该国某城市里 → 退回该国视角;
  // 已在该国视角 → 再点一次取消、回总览
  const pickCountry = useCallback((code: string | null) => {
    const backToOverview = code === null || (code === activeCountry && activeCity === null)
    setActiveCountry(backToOverview ? null : code)
    setActiveCity(null)
    setActiveSlug(null)
    setWalkTarget(null)
  }, [activeCountry, activeCity])

  const toggleKind = useCallback((k: PlaceKind) => {
    setSelectedKinds(prev => toggledKinds(prev, k))
  }, [])
```

- [ ] **Step 7: `MapPageClient.tsx` —— 传给 MapView 与两个按钮组件**

`<MapView` 的 props 里

```tsx
          activeCity={activeCity}
```

之后插入一行

```tsx
          activeCountry={activeCountry}
```

(`kinds={kinds}` 那行不用改,`kinds` 现在是 `effectiveKinds` 的结果。)

把

```tsx
        <div className="pointer-events-auto"><CityChips cities={cities} active={activeCity} onChange={pickCity} /></div>
        <div className="pointer-events-auto"><KindChips available={available} active={kinds} onToggle={toggleKind} /></div>
```

替换为

```tsx
        <div className="pointer-events-auto"><CityChips cities={cities} country={activeCountry} city={activeCity} onCountry={pickCountry} onCity={pickCity} /></div>
        <div className="pointer-events-auto"><KindChips available={available} selected={selectedKinds} onToggle={toggleKind} /></div>
```

- [ ] **Step 8: `MapView.tsx` —— props 与 import**

`MapViewProps`(或该组件的 props 类型)里

```ts
  activeCity: string | null
```

之后插入:

```ts
  /** 只选了国家、还没选城市时:总览镜头只框住该国的地点(ISO 两位码);null = 全部地点 */
  activeCountry: string | null
```

组件开头的解构

```ts
  const { styleUrl, data, landmarks, cities, lang, activeCity, focusPlace, walkTarget, kinds, reducedMotion, apiRef } = props
```

改为

```ts
  const { styleUrl, data, landmarks, cities, lang, activeCity, activeCountry, focusPlace, walkTarget, kinds, reducedMotion, apiRef } = props
```

import 区在

```ts
import { inBounds, type City } from '@/lib/map/cities'
```

之后加一行:

```ts
import { coordsInCountry } from '@/lib/map/countries'
```

- [ ] **Step 9: `MapView.tsx` —— 总览分支按国家缩小范围**

注释行

```ts
  // 2) 城市切换 / 总览:城市视角框住该城所有店;小人出现在城市中心(单店城市:店南边一点)
```

改为

```ts
  // 2) 城市切换 / 国家 / 总览:城市视角框住该城所有店,小人出现在城市中心(单店城市:店南边一点);
  //    没选城市时是俯视总览,选了国家就只框住该国的地点(镜头参数与总览完全相同)
```

总览分支里

```ts
      const b = boundsOf(data.features.map(f => f.geometry.coordinates as LngLat))
```

替换为

```ts
      const all = data.features.map(f => f.geometry.coordinates as LngLat)
      const b = boundsOf(activeCountry ? coordsInCountry(all, cities, activeCountry) : all)
```

这个 effect 末尾的依赖

```ts
  }, [activeCity, ready])
```

改为

```ts
  }, [activeCity, activeCountry, ready])
```

(该行上方的 `// eslint-disable-next-line react-hooks/exhaustive-deps` 保留。)

- [ ] **Step 10: lint + 全量测试 + 构建**

Run: `npm run lint && npx vitest run && NEXT_PUBLIC_BASE_PATH=/gourmet npm run build`
Expected: lint 无报错;**180 passed**;构建成功(TypeScript 通过)。

- [ ] **Step 11: Commit**

```bash
git add src/components/map/KindChips.tsx src/components/map/MapPageClient.tsx src/components/map/MapView.tsx
git commit -m "Map: kind chips select (multi, orange) instead of hide; country view camera"
```

---

### Task 4: 文档

- [ ] **Step 1: `CLAUDE.md` Map 一节加一条**

在以 `- Attribution control sits bottom-left` 开头的那一行**之前**插入一行:

```
- **Filter chips (2026-11-17):** kind chips are dark by default (= no filter, everything shown); tapping selects a kind (orange `#F0742A`), several can be selected, tapping again deselects — `effectiveKinds()` / `toggledKinds()` in `src/lib/map/kinds.ts`. Map badges and labels keep their kind colours. The city row is two-level: `Overview` + one chip per country (round code-drawn flag from `FlagCircle.tsx` + name from `COUNTRIES` in `src/lib/map/countries.ts`); picking a country fits the camera to that country's places (same overview camera, no walker) and reveals its cities; tapping the selected country again goes back (city → country view → overview). Every `cities.json` entry needs a `country` (ISO 2-letter); a new country needs a `COUNTRIES` entry (test enforces) and ideally a flag in `FlagCircle` (otherwise the emoji fallback is used). The country-only state is not written to the URL.
```

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "Docs: map filter chips and the country → city row"
```

---

## 收尾报告(执行者写给指挥官)

- 分支名、4 个 commit 的 hash、`git status` 是否干净。
- 测试数量(180)、lint / build 结果、Task 1 Step 3 的失败信息(先红后绿)。
- `git diff main -- src/data/map/cities.json` 是否只多了 5 行 `country`。
- 与计划的偏离及原因(没有就写「无」)。
- 最后一句:「等你在预览里点过按钮,再合并到 main 并 push」。

## 指挥官验收清单(不是执行者的活)

- 重跑 lint / test / build,读 diff。
- 预览 `/gourmet/map`:分类按钮初始全深灰、点「咖啡」只剩咖啡且按钮变橙、再点「烘焙」两类都在、再点取消;国家排是「总览 / 🇦🇺 澳大利亚 / 🇯🇵 日本」(圆旗),点日本镜头框住十和田 + 金泽并出现城市排,点金泽进城市视角(小人出现),再点日本退回国家视角,再点日本回总览;`?city=kanazawa` 直达时日本按钮是橙的;手机尺寸下各排不溢出(横向可滑)。

---

## 追加(指挥官预览后 + 业主反馈,2026-11-17)

### Task 5: 镜头留白跟着新的顶部按钮区走(为南北很长的国家做准备)

业主:日本视角下金泽那团离画面底边太近;以后会同时有北海道和冲绳的条目,国家视角要框得住南北两端。

指挥官实测(desktop 835×834 与 mobile 375×812 一样):顶部浮层底边在总览时约 **133 px**,选了国家 / 城市后多一排城市按钮,约 **169 px**;地点的徽章 + 店名牌伸到坐标点上方约 55 px。现在 `OVERVIEW_PADDING` / `CITY_PADDING` 的 top 都是 150,所以国家视角和城市视角里最北的点会钻到按钮下面;bottom 60 也太贴边。用 `[[127.68,26.21],[141.9,45.41]]`(那霸 → 宗谷)模拟过:top 210 / bottom 100 时桌面与手机都能完整框住整个日本(缩放约 3.7),南北两端都离边缘有余量。

**Files:**
- Modify: `src/components/map/MapView.tsx`(padding 常量 + 三处使用)
- Modify: `CLAUDE.md`(Camera padding 那条补一句)

- [ ] **Step 1: 常量**

`src/components/map/MapView.tsx` 里这四行:

```ts
const OVERVIEW_PADDING = { top: 150, bottom: 60, left: 60, right: 60 }
const CITY_PADDING = { top: 150, bottom: 80, left: 40, right: 40 }
// 手机:右下角有 ~150px 高的虚拟方向键,底部要多留,否则最南的店会被它盖住
const CITY_PADDING_MOBILE = { top: 150, bottom: 200, left: 40, right: 40 }
```

替换为:

```ts
// top = 顶部浮层底边 + ~45 px(徽章 + 店名牌伸到坐标点上方约 55 px)。浮层底边实测(2026-11-17):
// 总览约 133 px;选了国家 / 城市后多一排城市按钮,约 169 px。浮层布局改了要重新量。
// 国家视角会遇到南北很长的国家(日本:北海道 ↔ 冲绳),bottom 也留足,别让最南的点贴边。
const OVERVIEW_PADDING = { top: 180, bottom: 100, left: 60, right: 60 }
const COUNTRY_PADDING = { top: 210, bottom: 100, left: 60, right: 60 }
const COUNTRY_PADDING_MOBILE = { top: 210, bottom: 100, left: 40, right: 40 }
const CITY_PADDING = { top: 210, bottom: 80, left: 40, right: 40 }
// 手机:右下角有 ~150px 高的虚拟方向键,底部要多留,否则最南的店会被它盖住
const CITY_PADDING_MOBILE = { top: 210, bottom: 200, left: 40, right: 40 }
```

紧接在 `const cityPadding = () => …` 那一行之后加一行:

```ts
const overviewPadding = (country: string | null) =>
  country ? (isMobileViewport() ? COUNTRY_PADDING_MOBILE : COUNTRY_PADDING) : OVERVIEW_PADDING
```

- [ ] **Step 2: 总览 / 国家分支用它**

城市 effect 的总览分支里:

```ts
      padRef.current = OVERVIEW_PADDING
```

改为

```ts
      padRef.current = overviewPadding(activeCountry)
```

同一分支里的

```ts
      if (b) m.fitBounds(b, { padding: OVERVIEW_PADDING, absolutePadding: true, pitch: 0, bearing: 0, maxZoom: 12, duration: reducedMotion ? 0 : 1200 })
```

改为

```ts
      if (b) m.fitBounds(b, { padding: padRef.current, absolutePadding: true, pitch: 0, bearing: 0, maxZoom: 12, duration: reducedMotion ? 0 : 1200 })
```

- [ ] **Step 3: 卡片关闭时复位也用它**

卡片 effect 里:

```ts
      padRef.current = activeCity ? cityPadding() : OVERVIEW_PADDING
```

改为

```ts
      padRef.current = activeCity ? cityPadding() : overviewPadding(activeCountry)
```

(`const padRef = useRef<PaddingOptions>(OVERVIEW_PADDING)` 的初始值不用改。全文件除常量定义外,不应再有别处直接用 `OVERVIEW_PADDING` 做镜头调用——`grep -n "OVERVIEW_PADDING" src/components/map/MapView.tsx` 应只剩定义、`overviewPadding` 里、`useRef` 初始值三处。)

- [ ] **Step 4: 文档**

`CLAUDE.md` 里以 `- **Camera padding is persistent in MapLibre.**` 开头的那一行,在该行末尾追加一句(同一行,前面空一格):

```
Padding `top` = the top overlay's bottom edge + ~45 px (badge + label reach ~55 px above the point); measured 2026-11-17: ~133 px in overview, ~169 px once a country/city is picked (extra city row) — hence `OVERVIEW_PADDING` top 180 and `COUNTRY_PADDING[_MOBILE]` / `CITY_PADDING[_MOBILE]` top 210, bottom 100 for overview/country so long countries (Japan, Hokkaido ↔ Okinawa) don't hug the edges. Re-measure if the overlay layout changes.
```

- [ ] **Step 5: lint + 全量测试 + 构建**

Run: `npm run lint && npx vitest run && NEXT_PUBLIC_BASE_PATH=/gourmet npm run build`
Expected: lint 无报错;**180 passed**;构建成功。

- [ ] **Step 6: Commit(连同本计划文件的这段追加)**

```bash
git add src/components/map/MapView.tsx CLAUDE.md docs/superpowers/plans/2026-11-17-map-filter-chips.md
git commit -m "Map camera: padding follows the taller chip overlay; room for long countries"
```
