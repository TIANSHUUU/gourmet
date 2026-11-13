# 菠萝子地图 Phase 0:数据打底 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 给全部地点补上 `coords` 坐标、建立统一的 `Place` 读取层与城市配置、把站名改成「菠萝子指南」,为 `/map` 页面打好数据基础。本阶段**不出任何 UI**。

**Architecture:** 坐标以 `coords: [lng, lat]` 写进每个 markdown 的 frontmatter(一次性脚本从 `map_url` 抠出,文本插入,不重排 frontmatter);`src/lib/places.ts` 用 zod 把 `restaurants/` 与新建的 `spots/` 合并成统一的 `Place[]`,缺坐标即抛错并点名文件;`src/data/map/cities.json` + `cityOf()` 按 bounds 判定地点归属城市。

**Tech Stack:** Next 16 静态导出 · gray-matter · zod 3 · vitest 2 · Node 22 ESM 脚本(`.mjs`)

**设计文档:** `web/docs/superpowers/specs/2026-11-13-pineapple-map-design.md`(§4 决策表、§6.3 数据模型、§8 Phase 0、附录 C)

---

## 开工前必读

1. `web/CLAUDE.md`(部署、basePath 铁律、内容规范)与 `web/AGENTS.md`(Next 16 与你记忆中的不同)。
2. **所有命令在 `/Users/tantianshu/Documents/code/gourmet/web` 目录下执行**;仓库根目录就是 `web/`(`git` 命令也在这里跑)。
3. 本机 Node 是 22.2:`.mjs` 脚本不能 import `.ts`,所以脚本共用的纯逻辑一律写 `.mjs`,vitest 直接测 `.mjs`(先例:`notes-app/shared/note.test.mjs`)。
4. vitest 没有配置 `include`,用默认匹配 `**/*.{test,spec}.?(c|m)[jt]s?(x)`,因此 `scripts/lib/*.test.mjs` 会被自动收进 `npm run test`。
5. **未经业主确认不 `git push`**(push 即上线)。每个 Task 结束 commit 一次。
6. 工作在 `main` 分支上即可(本阶段改动小、不影响线上页面);如果你更习惯分支,`git switch -c feat/map-phase0`,最后不要自行合并。

---

## 文件结构

| 文件 | 操作 | 职责 |
|---|---|---|
| `scripts/lib/frontmatter-coords.mjs` | 新建 | 纯函数:判断/插入 frontmatter 里的 `coords` 行(文本级,不重排) |
| `scripts/lib/frontmatter-coords.test.mjs` | 新建 | 上者的单元测试 |
| `scripts/backfill-coords.mjs` | 新建 | 一次性脚本:遍历数据目录,从 `map_url` 抠坐标写回;`--check` 只校验 |
| `src/data/restaurants/*.md`(6 个) | 修改 | 每个加一行 `coords: [lng, lat]` |
| `src/data/spots/.gitkeep` | 新建 | 非吃喝地点目录(本阶段为空) |
| `src/lib/restaurants.ts` | 修改 | 导出 `parseReviews`;`Restaurant` 类型加可选 `coords` |
| `src/lib/places.ts` | 新建 | 统一 `Place` 类型、zod 校验、`parsePlaceFile()`、`getAllPlaces()` |
| `src/lib/places.test.ts` | 新建 | 单元测试 + 真实数据校验 |
| `src/data/map/cities.json` | 新建 | 三个城市的 bounds / 默认视角 |
| `src/lib/map/cities.ts` | 新建 | `City` 类型、`CITIES`、`inBounds()`、`cityOf()` |
| `src/lib/map/cities.test.ts` | 新建 | 单元测试 + 真实数据归属校验 |
| `src/components/Header.tsx` | 修改 | 站名文字 |
| `src/app/layout.tsx` | 修改 | 三处 `title` |
| `CLAUDE.md` | 修改 | 站名、新字段、新目录、新脚本 |
| `package.json` | 修改 | `coords:backfill` / `coords:check` 脚本 |

---

### Task 1: 坐标回填脚本(先测纯函数,再跑脚本)

**Files:**
- Create: `scripts/lib/frontmatter-coords.mjs`
- Create: `scripts/lib/frontmatter-coords.test.mjs`
- Create: `scripts/backfill-coords.mjs`
- Modify: `package.json`(scripts)
- Modify: `src/data/restaurants/*.md`(由脚本写入)

- [ ] **Step 1: 写失败的单元测试**

新建 `scripts/lib/frontmatter-coords.test.mjs`:

```js
import { describe, it, expect } from 'vitest'
import { hasCoordsLine, insertCoords } from './frontmatter-coords.mjs'

const raw = `---
slug: zareh
name: "Zareh"
map_url: "https://www.google.com/maps/place/Zareh/@-37.797961,144.9821171,17z/data=!3m1!4b1!4m6!3m5!1s0x6ad6430013769889:0xb9f7e97f8baa3b6b!8m2!3d-37.797961!4d144.984692"
map_type: google
visited: "2026-08-26"
---

## en

Great ambiance.
`

describe('hasCoordsLine', () => {
  it('is false when frontmatter has no coords', () => {
    expect(hasCoordsLine(raw)).toBe(false)
  })
  it('is true once a coords line exists', () => {
    expect(hasCoordsLine(raw.replace('map_type: google', 'coords: [144.984692, -37.797961]\nmap_type: google'))).toBe(true)
  })
  it('ignores a "coords" that only appears in the body', () => {
    expect(hasCoordsLine(raw + '\ncoords: [1, 2]\n')).toBe(false)
  })
})

describe('insertCoords', () => {
  it('inserts a coords line right after map_url, leaving everything else byte-identical', () => {
    const out = insertCoords(raw, [144.984692, -37.797961])
    const lines = out.split('\n')
    const i = lines.findIndex(l => l.startsWith('map_url:'))
    expect(lines[i + 1]).toBe('coords: [144.984692, -37.797961]')
    expect(out.replace('coords: [144.984692, -37.797961]\n', '')).toBe(raw)
  })
  it('appends a trailing comment when a note is given', () => {
    const out = insertCoords(raw, [1, 2], 'coords from viewport (@), verify')
    expect(out).toContain('coords: [1, 2]   # coords from viewport (@), verify')
  })
  it('is a no-op when coords already exist', () => {
    const once = insertCoords(raw, [1, 2])
    expect(insertCoords(once, [3, 4])).toBe(once)
  })
  it('throws when there is no map_url line to anchor on', () => {
    expect(() => insertCoords('---\nslug: x\n---\nbody', [1, 2])).toThrow(/map_url/)
  })
})
```

- [ ] **Step 2: 跑测试,确认失败**

Run: `npx vitest run scripts/lib/frontmatter-coords.test.mjs`
Expected: FAIL,错误含 `Failed to load url ./frontmatter-coords.mjs`(模块不存在)。

- [ ] **Step 3: 实现纯函数**

新建 `scripts/lib/frontmatter-coords.mjs`:

```js
// frontmatter 里的 coords 行:文本级判断与插入,不重新序列化 frontmatter(避免引号/顺序被改动)

/** 返回首个 --- ... --- 之间的文本;没有 frontmatter 返回 null */
export function frontmatterBlock(raw) {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/)
  return m ? m[1] : null
}

/** frontmatter 里是否已有 `coords: [` 开头的行(正文里出现不算) */
export function hasCoordsLine(raw) {
  const fm = frontmatterBlock(raw)
  return fm !== null && /^coords:\s*\[/m.test(fm)
}

/**
 * 在 `map_url:` 行之后插入 `coords: [lng, lat]`。
 * 已有 coords → 原样返回;找不到 map_url 行 → 抛错(宁可人工处理也不要插错位置)。
 */
export function insertCoords(raw, [lng, lat], note = '') {
  if (hasCoordsLine(raw)) return raw
  const line = `coords: [${lng}, ${lat}]${note ? `   # ${note}` : ''}`
  const out = raw.replace(/^(map_url:.*)$/m, `$1\n${line}`)
  if (out === raw) throw new Error('frontmatter 里没有 map_url 行,无法定位插入点')
  return out
}
```

- [ ] **Step 4: 跑测试,确认通过**

Run: `npx vitest run scripts/lib/frontmatter-coords.test.mjs`
Expected: `7 passed`。

- [ ] **Step 5: 写回填脚本**

新建 `scripts/backfill-coords.mjs`:

```js
// 一次性:给 src/data/{restaurants,spots}/*.md 补 coords(从 map_url 抠)。
//   node scripts/backfill-coords.mjs          写入
//   node scripts/backfill-coords.mjs --check  只校验,缺坐标退出码 1
// 坐标解析复用现场笔记的 extractCoords(同一套正则,单一实现)。
import { readdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import matter from 'gray-matter'
import { extractCoords } from '../notes-app/shared/note.mjs'
import { hasCoordsLine, insertCoords } from './lib/frontmatter-coords.mjs'

const DIRS = ['src/data/restaurants', 'src/data/spots']
const check = process.argv.includes('--check')

// 这三种链接形态里的坐标是店本身的位置;只剩 @lat,lng 时那是视口中心,需人工核对
const isPrecise = (url) =>
  /!3d-?\d/.test(url) || /\/maps\/search\/-?\d/.test(url) || /[?&]q(?:uery)?=-?\d/.test(url)

const missing = []
let written = 0

for (const dir of DIRS) {
  let files = []
  try {
    files = (await readdir(dir)).filter((f) => f.endsWith('.md')).sort()
  } catch {
    continue // 目录不存在(spots/ 可能还空着)
  }
  for (const f of files) {
    const p = path.join(dir, f)
    const raw = await readFile(p, 'utf8')
    if (hasCoordsLine(raw)) continue
    const { data } = matter(raw)
    const url = typeof data.map_url === 'string' ? data.map_url : ''
    const coords = extractCoords(url)
    if (!coords) {
      missing.push(`${p}  ←  ${url || '(没有 map_url)'}`)
      continue
    }
    if (check) {
      missing.push(`${p}  (能自动抠出 [${coords}],但还没写入;去掉 --check 再跑一次)`)
      continue
    }
    const note = isPrecise(url) ? '' : 'coords from viewport (@), verify'
    await writeFile(p, insertCoords(raw, coords, note))
    written++
    console.log(`写入 ${p}: [${coords}]${note ? '  ⚠ ' + note : ''}`)
  }
}

if (missing.length) {
  console.error('以下文件缺 coords:\n  ' + missing.join('\n  '))
  process.exit(1)
}
console.log(check ? '全部文件都有 coords ✓' : `完成,写入 ${written} 个文件`)
```

- [ ] **Step 6: 加 npm 脚本**

在 `package.json` 的 `"scripts"` 里 `"notes:pull"` 之后追加两行(注意前一行末尾加逗号):

```json
    "notes:pull": "node scripts/notes-pull.mjs",
    "coords:backfill": "node scripts/backfill-coords.mjs",
    "coords:check": "node scripts/backfill-coords.mjs --check"
```

- [ ] **Step 7: 跑回填**

Run: `npm run coords:backfill`
Expected 输出 6 行「写入」,坐标应与下表一致(六位小数,`[lng, lat]`),且**没有** ⚠ 标记:

| 文件 | coords |
|---|---|
| `src/data/restaurants/death-and-co.md` | `[144.97134, -37.815262]` |
| `src/data/restaurants/dons.md` | `[144.992866, -37.846978]` |
| `src/data/restaurants/marys.md` | `[144.987251, -37.799096]` |
| `src/data/restaurants/soma-pastry.md` | `[141.205015, 40.615081]` |
| `src/data/restaurants/south-aus-hotel.md` | `[140.783782, -37.829651]` |
| `src/data/restaurants/zareh.md` | `[144.984692, -37.797961]` |

最后一行:`完成,写入 6 个文件`。若有文件进了「缺 coords」清单,停下来把 `map_url` 贴给业主,不要手填坐标。

- [ ] **Step 8: 看 diff,确认每个文件只多了一行**

Run: `git diff --stat src/data/restaurants && git diff src/data/restaurants/zareh.md`
Expected: 6 个文件各 `+1`;zareh 的 diff 只有一行 `+coords: [144.984692, -37.797961]`,紧跟在 `map_url:` 行后,其余字节未变。

- [ ] **Step 9: 用 --check 复核**

Run: `npm run coords:check`
Expected: `全部文件都有 coords ✓`,退出码 0。

- [ ] **Step 10: Commit**

```bash
git add scripts/lib/frontmatter-coords.mjs scripts/lib/frontmatter-coords.test.mjs scripts/backfill-coords.mjs package.json src/data/restaurants
git commit -m "Add coords to all places via backfill script (map_url → [lng, lat])"
```

---

### Task 2: 统一的 Place 读取层(`src/lib/places.ts`)

**Files:**
- Modify: `src/lib/restaurants.ts`
- Create: `src/lib/places.ts`
- Create: `src/lib/places.test.ts`
- Create: `src/data/spots/.gitkeep`

- [ ] **Step 1: 建空的 spots 目录**

Run: `mkdir -p src/data/spots && touch src/data/spots/.gitkeep`

- [ ] **Step 2: 写失败的测试**

新建 `src/lib/places.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { parsePlaceFile, getAllPlaces, RESTAURANT_KINDS, SPOT_KINDS } from './places'

const base = `---
slug: test-place
name: "Test Place"
suburb: "Fitzroy"
city: "Melbourne"
category: food
cuisine_en: "Test"
cuisine_zh: "测试"
map_url: "https://www.google.com/maps/place/x"
coords: [144.978, -37.798]
map_type: google
visited: "2026-01"
images:
  - "1.jpg"
---

## en

Hello.

## zh

你好。
`

describe('parsePlaceFile', () => {
  it('parses a valid restaurant file into a Place with kind + coords + reviews', () => {
    const p = parsePlaceFile(base, 'restaurants/test.md', RESTAURANT_KINDS)
    expect(p.kind).toBe('food')
    expect(p.coords).toEqual([144.978, -37.798])
    expect(p.review_en).toBe('Hello.')
    expect(p.review_zh).toBe('你好。')
    expect(p.images).toEqual(['1.jpg'])
  })

  it('names the file when coords are missing', () => {
    const raw = base.replace(/^coords:.*\n/m, '')
    expect(() => parsePlaceFile(raw, 'restaurants/test.md', RESTAURANT_KINDS)).toThrow(/restaurants\/test\.md.*coords/)
  })

  it('rejects coords written as [lat, lng] (second number out of latitude range)', () => {
    const raw = base.replace(/^coords:.*$/m, 'coords: [-37.798, 144.978]')
    expect(() => parsePlaceFile(raw, 'restaurants/test.md', RESTAURANT_KINDS)).toThrow(/coords/)
  })

  it('rejects a spot category inside restaurants/', () => {
    const raw = base.replace('category: food', 'category: sight')
    expect(() => parsePlaceFile(raw, 'restaurants/test.md', RESTAURANT_KINDS)).toThrow(/不允许/)
  })

  it('accepts a spot category inside spots/', () => {
    const raw = base.replace('category: food', 'category: sight')
    expect(parsePlaceFile(raw, 'spots/test.md', SPOT_KINDS).kind).toBe('sight')
  })

  it('defaults map_type to google when omitted', () => {
    const raw = base.replace(/^map_type:.*\n/m, '')
    expect(parsePlaceFile(raw, 'restaurants/test.md', RESTAURANT_KINDS).map_type).toBe('google')
  })
})

describe('getAllPlaces (real data under src/data)', () => {
  it('loads every restaurant, each with coords, sorted newest first', () => {
    const all = getAllPlaces()
    expect(all.length).toBeGreaterThanOrEqual(6)
    for (const p of all) expect(p.coords, p.slug).toHaveLength(2)
    const visited = all.map(p => p.visited)
    expect(visited).toEqual([...visited].sort().reverse())
  })
})
```

- [ ] **Step 3: 跑测试,确认失败**

Run: `npx vitest run src/lib/places.test.ts`
Expected: FAIL,`Failed to load url ./places`。

- [ ] **Step 4: 让 `restaurants.ts` 导出 `parseReviews` 并加可选 `coords`**

修改 `src/lib/restaurants.ts`:

把

```ts
  images: string[]
  review_en: string
  review_zh: string
}
```

改成

```ts
  images: string[]
  coords?: [number, number] // [lng, lat];Phase 0 起所有文件都有,地图层(places.ts)强校验
  place_id?: string
  review_en: string
  review_zh: string
}
```

把 `function parseReviews(content: string)` 改成 `export function parseReviews(content: string)`。其余不动。

- [ ] **Step 5: 实现 `places.ts`**

新建 `src/lib/places.ts`:

```ts
import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import { z } from 'zod'
import { parseReviews, type Restaurant } from './restaurants'

/** 吃喝三类沿用 restaurants/;玩乐四类放 spots/。地图上统一叫 kind */
export const RESTAURANT_KINDS = ['food', 'cafe', 'bar'] as const
export const SPOT_KINDS = ['sight', 'activity', 'shop', 'stay'] as const
export type PlaceKind = (typeof RESTAURANT_KINDS)[number] | (typeof SPOT_KINDS)[number]

/** [经度, 纬度] —— 与 travel-timeline、MapLibre 一致,经度在前 */
export type LngLat = [number, number]

export type Place = Omit<Restaurant, 'category' | 'coords'> & {
  kind: PlaceKind
  coords: LngLat
}

const lngLat = z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)])

const frontmatter = z.object({
  slug: z.string().min(1),
  name: z.string().min(1),
  suburb: z.string().default(''),
  city: z.string().min(1),
  category: z.enum([...RESTAURANT_KINDS, ...SPOT_KINDS]),
  cuisine_en: z.string().default(''),
  cuisine_zh: z.string().default(''),
  map_url: z.string().url(),
  map_type: z.enum(['google', 'amap']).default('google'),
  visited: z.string().regex(/^\d{4}-\d{2}(-\d{2})?$/, '格式应为 YYYY-MM 或 YYYY-MM-DD'),
  tagline_en: z.string().optional(),
  tagline_zh: z.string().optional(),
  images: z.array(z.string()).default([]),
  coords: lngLat,
  place_id: z.string().optional(),
})

/** 解析一个地点 markdown。校验失败时错误信息里带文件名,构建日志一眼能定位 */
export function parsePlaceFile(raw: string, file: string, allowed: readonly PlaceKind[]): Place {
  const { data, content } = matter(raw)
  const parsed = frontmatter.safeParse(data)
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map(i => `${i.path.join('.') || '(root)'}: ${i.message}`)
      .join('; ')
    throw new Error(`[places] ${file}: ${issues}`)
  }
  const fm = parsed.data
  if (!allowed.includes(fm.category)) {
    throw new Error(
      `[places] ${file}: category "${fm.category}" 不允许出现在这个目录(允许:${allowed.join(', ')})`,
    )
  }
  const { category, ...rest } = fm
  const { en, zh } = parseReviews(content)
  return { ...rest, kind: category, review_en: en, review_zh: zh }
}

const DATA_ROOT = path.join(process.cwd(), 'src/data')
const SOURCES: Array<{ dir: string; allowed: readonly PlaceKind[] }> = [
  { dir: 'restaurants', allowed: RESTAURANT_KINDS },
  { dir: 'spots', allowed: SPOT_KINDS },
]

/** 全部地点(吃喝 + 玩乐),按 visited 新→旧;任何一个文件不合法都抛错(构建即校验) */
export function getAllPlaces(): Place[] {
  const out: Place[] = []
  for (const { dir, allowed } of SOURCES) {
    const abs = path.join(DATA_ROOT, dir)
    if (!fs.existsSync(abs)) continue
    for (const f of fs.readdirSync(abs).filter(f => f.endsWith('.md')).sort()) {
      out.push(parsePlaceFile(fs.readFileSync(path.join(abs, f), 'utf-8'), `${dir}/${f}`, allowed))
    }
  }
  const seen = new Set<string>()
  for (const p of out) {
    if (seen.has(p.slug)) throw new Error(`[places] slug 重复: ${p.slug}`)
    seen.add(p.slug)
  }
  return out.sort((a, b) => b.visited.localeCompare(a.visited) || a.slug.localeCompare(b.slug))
}

export function getPlace(slug: string): Place | undefined {
  return getAllPlaces().find(p => p.slug === slug)
}
```

- [ ] **Step 6: 跑测试,确认通过**

Run: `npx vitest run src/lib/places.test.ts`
Expected: `7 passed`。如果「缺 coords」用例的正则没匹配上,打印一下实际错误信息——zod 对缺失字段的 message 是 `Required`,路径是 `coords`,拼出来应是 `[places] restaurants/test.md: coords: Required`。

- [ ] **Step 7: 全量测试 + 类型检查**

Run: `npm run test && npx tsc --noEmit`
Expected: 全部通过,无类型错误。(`Place` 的 `place_id?: string | undefined` 与 zod 推断类型兼容;若报 `exactOptionalPropertyTypes` 相关错误,说明 tsconfig 被改过,先问业主。)

- [ ] **Step 8: Commit**

```bash
git add src/lib/restaurants.ts src/lib/places.ts src/lib/places.test.ts src/data/spots/.gitkeep
git commit -m "Add places.ts: unified Place loader (restaurants + spots) with zod-validated coords"
```

---

### Task 3: 城市配置与归属判定

**Files:**
- Create: `src/data/map/cities.json`
- Create: `src/lib/map/cities.ts`
- Create: `src/lib/map/cities.test.ts`

- [ ] **Step 1: 写城市配置**

新建 `src/data/map/cities.json`(`bounds` = `[[西, 南], [东, 北]]`;`view` 是进入该城市时的默认镜头):

```json
[
  {
    "slug": "melbourne",
    "name_zh": "墨尔本",
    "name_en": "Melbourne",
    "bounds": [[144.55, -38.1], [145.4, -37.55]],
    "view": { "center": [144.9631, -37.8136], "zoom": 12.5, "pitch": 30, "bearing": 0 }
  },
  {
    "slug": "towada",
    "name_zh": "十和田(青森)",
    "name_en": "Towada, Aomori",
    "bounds": [[141.1, 40.55], [141.3, 40.68]],
    "view": { "center": [141.205, 40.6151], "zoom": 15, "pitch": 50, "bearing": 0 }
  },
  {
    "slug": "mount-gambier",
    "name_zh": "芒特甘比尔",
    "name_en": "Mount Gambier",
    "bounds": [[140.7, -37.88], [140.85, -37.78]],
    "view": { "center": [140.7838, -37.8297], "zoom": 15, "pitch": 50, "bearing": 0 }
  }
]
```

- [ ] **Step 2: 写失败的测试**

新建 `src/lib/map/cities.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { CITIES, cityOf, inBounds } from './cities'
import { getAllPlaces } from '@/lib/places'

describe('inBounds', () => {
  it('is inclusive on the edges', () => {
    expect(inBounds([0, 0], [[0, 0], [1, 1]])).toBe(true)
    expect(inBounds([1, 1], [[0, 0], [1, 1]])).toBe(true)
    expect(inBounds([1.0001, 0.5], [[0, 0], [1, 1]])).toBe(false)
  })
})

describe('cityOf', () => {
  it('maps known places to their city', () => {
    expect(cityOf([144.984692, -37.797961])?.slug).toBe('melbourne') // Zareh
    expect(cityOf([141.205015, 40.615081])?.slug).toBe('towada') // Soma Pastry
    expect(cityOf([140.783782, -37.829651])?.slug).toBe('mount-gambier') // South Australian Hotel
  })
  it('returns null outside every city', () => {
    expect(cityOf([0, 0])).toBeNull()
  })
})

describe('cities.json sanity', () => {
  it('each city view.center lies inside its own bounds', () => {
    for (const c of CITIES) expect(inBounds(c.view.center, c.bounds), c.slug).toBe(true)
  })
  it('slugs are unique and url-safe', () => {
    const slugs = CITIES.map(c => c.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
    for (const s of slugs) expect(s).toMatch(/^[a-z0-9-]+$/)
  })
  it('every real place falls inside some city (add a city to cities.json if this fails)', () => {
    for (const p of getAllPlaces()) expect(cityOf(p.coords)?.slug, `${p.slug} ${p.coords}`).toBeTruthy()
  })
})
```

- [ ] **Step 3: 跑测试,确认失败**

Run: `npx vitest run src/lib/map/cities.test.ts`
Expected: FAIL,`Failed to load url ./cities`。

- [ ] **Step 4: 实现 `cities.ts`**

新建 `src/lib/map/cities.ts`:

```ts
import citiesJson from '@/data/map/cities.json'
import type { LngLat } from '@/lib/places'

export type CityView = { center: LngLat; zoom: number; pitch: number; bearing: number }
export type City = {
  slug: string
  name_zh: string
  name_en: string
  /** [[西, 南], [东, 北]] */
  bounds: [LngLat, LngLat]
  view: CityView
}

// JSON 里的数组被 TS 推断成 number[],这里断言成元组类型;cities.test.ts 负责校验内容
export const CITIES: City[] = citiesJson as unknown as City[]

export function inBounds([lng, lat]: LngLat, [[w, s], [e, n]]: [LngLat, LngLat]): boolean {
  return lng >= w && lng <= e && lat >= s && lat <= n
}

/** 坐标落在哪个城市的 bounds 里;都不在 → null(只在总览出现) */
export function cityOf(coords: LngLat, cities: City[] = CITIES): City | null {
  return cities.find(c => inBounds(coords, c.bounds)) ?? null
}
```

- [ ] **Step 5: 跑测试,确认通过**

Run: `npx vitest run src/lib/map/cities.test.ts`
Expected: `6 passed`。

- [ ] **Step 6: Commit**

```bash
git add src/data/map/cities.json src/lib/map/cities.ts src/lib/map/cities.test.ts
git commit -m "Add cities.json + cityOf(): place → city by bounds"
```

---

### Task 4: 站名改为「菠萝子指南」

**Files:**
- Modify: `src/components/Header.tsx`
- Modify: `src/app/layout.tsx`
- Modify: `CLAUDE.md`
- Inspect only: `src/app/opengraph-image.jpg`、`src/app/twitter-image.jpg`

- [ ] **Step 1: Header 品牌文字**

`src/components/Header.tsx` 里 `<span className="font-display font-bold ...">` 的内容 `菠萝子美食指南` 改为 `菠萝子指南`(只改这一处文字,class 不动)。

- [ ] **Step 2: 页面标题三处**

`src/app/layout.tsx` 的 `metadata` 里,`title: '菠萝子美食指南'`、`openGraph.title: '菠萝子美食指南'`、`twitter.title: '菠萝子美食指南'` 三处都改成 `'菠萝子指南'`。`description` 三处**不改**(等景点内容上线再一起改)。

- [ ] **Step 3: 确认没有漏网之鱼**

Run: `grep -rn "美食指南" src CLAUDE.md`
Expected: 只剩 `CLAUDE.md` 里 Style 节那一行(下一步改)。

- [ ] **Step 4: CLAUDE.md Style 节**

`CLAUDE.md` 里这一行:

```
- Site name: "菠萝子美食指南" (renamed 2026-07 from 猪比登 to match the pineapple avatar). Logo = cropped pineapple-head mark (`public/logo-mark.png`); favicon = pineapple (`src/app/icon.png`). The old 🐷🕵️/🐽 emojis were dropped.
```

改为:

```
- Site name: "菠萝子指南" (2026-11 dropped 美食 to make room for sights & activities; 2026-07 renamed from 猪比登 to match the pineapple avatar). Logo = cropped pineapple-head mark (`public/logo-mark.png`); favicon = pineapple (`src/app/icon.png`). The old 🐷🕵️/🐽 emojis were dropped. English `description` strings still say "restaurants, cafés & bars" on purpose — update them together with the homepage hero copy once sights go live.
```

- [ ] **Step 5: 检查分享图里有没有旧站名**

用 Read 工具打开 `src/app/opengraph-image.jpg` 和 `src/app/twitter-image.jpg` 看图。**如果图里印着「菠萝子美食指南」**,在最终报告里写明「分享图含旧站名,需业主重新出图」,**不要自己 P 图**;图里没有文字就什么都不用做。

- [ ] **Step 6: 跑 lint 与构建**

Run: `npm run lint && npm run build`
Expected: 无 lint 错误;构建成功,`out/index.html` 里 `<title>` 为 `菠萝子指南`(`grep -o "<title>[^<]*</title>" out/index.html`)。

- [ ] **Step 7: Commit**

```bash
git add src/components/Header.tsx src/app/layout.tsx CLAUDE.md
git commit -m "Rename site to 菠萝子指南"
```

---

### Task 5: 文档与脚本说明(让下一个人少踩坑)

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: 更新「Adding a new place」的 frontmatter 清单**

`CLAUDE.md` 里

```
   slug, name, suburb, city, category, cuisine_en, cuisine_zh, map_url, map_type (google|amap), images: [...]
```

改为

```
   slug, name, suburb, city, category, cuisine_en, cuisine_zh, map_url, map_type (google|amap),
   coords: [lng, lat]  (required — run `npm run coords:backfill` to fill it from map_url, or `npm run coords:check` to verify),
   images: [...]
```

- [ ] **Step 2: 在「Adding a new place」小节末尾追加一段**

紧接着第 5 步「Commit + push (auto-deploys)」之后追加:

```
6. Non-food places (sights / activities / shops / stays) go to `web/src/data/spots/<slug>.md` with the **same frontmatter**; `category` there must be one of `sight | activity | shop | stay` (restaurants/ only allows `food | cafe | bar`). They are read by `src/lib/places.ts` (`getAllPlaces()`, zod-validated, build fails on a missing/invalid `coords`) and will show on the `/map` page; the homepage grid stays food-only for now.
7. `src/data/map/cities.json` decides which city a place belongs to **by bounds**, not by its `city` string. A place outside every city makes `src/lib/map/cities.test.ts` fail — add a city entry (slug, names, bounds, default view) when that happens.
```

- [ ] **Step 3: 跑全部测试**

Run: `npm run test`
Expected: 全部通过(含 `notes-app`、`scripts/lib`、`src/lib` 下所有测试)。

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md
git commit -m "Docs: coords field, spots/ directory and cities.json in CLAUDE.md"
```

---

### Task 6: 收尾验收

- [ ] **Step 1: 三件套**

Run: `npm run lint && npm run test && npm run build`
Expected: 全绿。

- [ ] **Step 2: 确认工作区干净**

Run: `git status --short && git log --oneline -6`
Expected: 无未提交改动;最近 5 个 commit 依次是 Task 1–5 的提交。

- [ ] **Step 3: 给业主的报告(不要 push)**

报告里写清:6 家店的坐标表(Task 1 Step 7 那张)、分享图是否含旧站名(Task 4 Step 5)、测试数量、以及一句「已在本地 commit,等你确认后 push」。

---

## 验收清单(对照设计文档 §8 Phase 0)

- [ ] `npm run test`、`npm run build` 全绿
- [ ] 单测断言每个数据文件都有合法 `coords`(`places.test.ts` 的真实数据用例)
- [ ] 6 家店坐标全部由脚本自动抠出,零人工
- [ ] Header 与页面 `<title>` 显示「菠萝子指南」
- [ ] `CLAUDE.md` 已写明 `coords`、`spots/`、`cities.json`、`coords:*` 脚本
