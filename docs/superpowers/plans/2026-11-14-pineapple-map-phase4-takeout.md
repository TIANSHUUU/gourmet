# 菠萝子地图 Phase 4:Takeout 导入景点 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把业主存量的 Google 评论(Takeout 导出)半自动变成网站上的景点 / 玩乐条目:脚本把 `Reviews.json` 转成带坐标与元数据的草稿 + 一张索引表,业主挑一批,执行模型成稿到 `src/data/spots/`,配上压缩过的照片;景点在地图、搜索、分类筛选与详情页里全部可用。

**Architecture:** 纯逻辑 `scripts/lib/takeout.mjs`(两代 Takeout 格式 → 统一结构、slug、判重、草稿 markdown、索引表)与 `scripts/lib/photos.mjs`(照片排序与命名)都有单测;`scripts/import-takeout.mjs` 只写 `web/field-notes/takeout/`(gitignore,公开仓库不放评论全量),**永不写 `src/data/`**;成稿是对话里的编辑工作,照计划的清单逐条做。`src/app/[slug]/page.tsx` 改用 `getPlace()`,景点自动获得详情页。照片用 `scripts/import-photos.mjs`(sharp:长边 1600、自动转正、剥 EXIF/GPS)进 `public/images/<slug>/`。

**Tech Stack:** 与前几阶段相同(sharp 已是 devDependency),无新依赖。

**前置:** Phase 0–3 已合并上线。业主的 Takeout 导出可能还没做——本计划的 Task 1–4 不依赖它(用内联样例),Task 5 起需要真实文件。

**设计文档:** `web/docs/superpowers/specs/2026-11-13-pineapple-map-design.md`(§6.8 内容管线、§8 Phase 4、附录 B 两代字段)

---

## 开工前必读

1. `web/CLAUDE.md`(Adding a new place、Map 一节)与 `web/AGENTS.md`。所有命令在 `/Users/tantianshu/Documents/code/gourmet/web` 下执行;先 `git switch -c feat/map-phase4`。
2. **Takeout 的字段名没有官方样例**,计划里的两代格式(附录 B)来自二手资料。解析器对认不出的格式必须**打印第一条 feature 的全部 key 并退出**,不要猜。
3. 草稿目录 `web/field-notes/takeout/` 整个 gitignore:仓库是公开的,业主几十上百条评论的全量不该进 git;真相源是业主自己保存的 Takeout 压缩包。
4. 成稿(Task 6)是**编辑工作**:要翻译 / 润色成「简洁、轻快、略带幽默」的双语(业主偏好,见 CLAUDE.md),要定类别,要配图。**哪些条目成稿由业主挑**(Task 5 结束时把索引表交给业主,等回复),成稿后给业主预览再提交。不要自作主张把全部评论都发上网站。
5. 景点的 `cuisine_en / cuisine_zh` 字段当「类型标签」用(如 `Onsen / 温泉`、`Hike / 徒步`、`Museum / 博物馆`),地图卡片与详情页都会显示它。
6. 新城市:成稿的景点若落在 `cities.json` 任何 bounds 之外,`cities.test.ts` 会失败——按 CLAUDE.md 加城市条目(slug、中英名、bounds、默认视角)。这是预期中的工作,不是故障。
7. 有意留到以后的(不要顺手做):首页加「玩乐」入口 / 改版、Takeout 照片的自动配对(照片由业主按地点提供)、其他城市的地标。
8. **未经业主确认不 `git push`、不合并**。每个 Task 结束 commit 一次。

---

## 文件结构

| 文件 | 操作 | 职责 |
|---|---|---|
| `scripts/lib/takeout.mjs` | 新建 | 纯逻辑:格式识别、归一化、slug、判重、草稿 markdown、索引表 |
| `scripts/lib/takeout.test.mjs` | 新建 | 单测(两代格式内联样例) |
| `scripts/import-takeout.mjs` | 新建 | `Reviews.json` → `field-notes/takeout/<slug>.md` + `INDEX.md`;跳过已收录 |
| `scripts/lib/photos.mjs` | 新建 | 纯逻辑:照片文件筛选、自然排序、目标命名 |
| `scripts/lib/photos.test.mjs` | 新建 | 单测 |
| `scripts/import-photos.mjs` | 新建 | 原图目录 → `public/images/<slug>/N.jpg`(长边 1600、转正、剥元数据),打印 `images:` 片段 |
| `.gitignore` | 修改 | 忽略 `field-notes/takeout/` |
| `package.json` | 修改 | 脚本 `takeout:import`、`photos:import` |
| `src/app/[slug]/page.tsx` | 修改 | 用 `getAllPlaces / getPlace`,景点也有详情页 |
| `src/components/RestaurantDetail.tsx` | 修改 | props 类型改为 `Place` |
| `src/data/spots/*.md` | 新建(成稿) | 业主挑选的第一批景点 |
| `src/data/map/cities.json` | 修改(按需) | 新城市 |
| `public/images/<slug>/` | 新建(成稿) | 压缩后的照片 |
| `CLAUDE.md` | 修改 | Takeout 导入与照片脚本说明 |

---

### Task 1: Takeout 解析纯逻辑(TDD)

**Files:**
- Create: `scripts/lib/takeout.mjs`
- Create: `scripts/lib/takeout.test.mjs`

- [ ] **Step 1: 写失败的测试**

新建 `scripts/lib/takeout.test.mjs`:

```js
import { describe, it, expect } from 'vitest'
import {
  detectFormat, normalizeReview, parseTakeout, slugify, uniqueSlug, guessSuburb,
  placeKey, isAlreadyPublished, draftMarkdown, indexMarkdown,
} from './takeout.mjs'

// 旧格式:Maps (your places)/Reviews.json(GeoJSON,属性名带空格)
const legacy = {
  type: 'FeatureCollection',
  features: [{
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [144.984692, -37.797961] },
    properties: {
      'Google Maps URL': 'https://www.google.com/maps/place/Zareh/data=!4m2!3m1!1s0x6ad6430013769889:0xb9f7e97f8baa3b6b',
      Location: {
        Address: '368 Smith St, Collingwood VIC 3066, Australia',
        'Business Name': 'Zareh',
        'Country Code': 'AU',
        'Geo Coordinates': { Latitude: '-37.797961', Longitude: '144.984692' },
      },
      Published: '2026-08-26T09:00:00Z',
      'Star Rating': 5,
      'Review Comments': 'Great ambiance and amazing food.',
    },
  }],
}

// 新格式:蛇形属性名,坐标可能缺失,星级可能是单词
const modern = {
  type: 'FeatureCollection',
  features: [{
    type: 'Feature',
    geometry: null,
    properties: {
      date: '2025-02-20T03:00:00Z',
      five_star_rating_published: 'FIVE',
      google_maps_url: 'https://www.google.com/maps/place/?q=place_id:ChIJxxxx',
      location: { address: '〒034-0011 青森県十和田市稲生町', country_code: 'JP', name: '相馬菓子舗' },
      review_text_published: '  Best apple pie on the trip.  ',
    },
  }],
}

describe('detectFormat', () => {
  it('tells the two known generations apart', () => {
    expect(detectFormat(legacy)).toBe('legacy')
    expect(detectFormat(modern)).toBe('modern')
  })
  it('returns empty for no features and null for an unknown shape', () => {
    expect(detectFormat({ type: 'FeatureCollection', features: [] })).toBe('empty')
    expect(detectFormat({ features: [{ properties: { foo: 1, bar: 2 } }] })).toBeNull()
    expect(detectFormat({})).toBeNull()
  })
})

describe('normalizeReview', () => {
  it('maps the legacy fields', () => {
    expect(normalizeReview(legacy.features[0], 'legacy')).toEqual({
      name: 'Zareh',
      address: '368 Smith St, Collingwood VIC 3066, Australia',
      coords: [144.984692, -37.797961],
      url: legacy.features[0].properties['Google Maps URL'],
      rating: 5,
      text: 'Great ambiance and amazing food.',
      date: '2026-08-26',
    })
  })
  it('maps the modern fields, tolerating a missing geometry and a worded rating', () => {
    expect(normalizeReview(modern.features[0], 'modern')).toEqual({
      name: '相馬菓子舗',
      address: '〒034-0011 青森県十和田市稲生町',
      coords: null,
      url: 'https://www.google.com/maps/place/?q=place_id:ChIJxxxx',
      rating: 5,
      text: 'Best apple pie on the trip.',
      date: '2025-02-20',
    })
  })
  it('treats a [0, 0] geometry as missing', () => {
    const f = { ...modern.features[0], geometry: { type: 'Point', coordinates: [0, 0] } }
    expect(normalizeReview(f, 'modern').coords).toBeNull()
  })
})

describe('parseTakeout', () => {
  it('returns the format and normalized reviews', () => {
    const r = parseTakeout(legacy)
    expect(r.format).toBe('legacy')
    expect(r.reviews).toHaveLength(1)
  })
  it('throws listing the first feature keys when the format is unknown', () => {
    expect(() => parseTakeout({ features: [{ properties: { foo: 1, bar: 2 } }] })).toThrow(/foo, bar/)
  })
})

describe('slugify / uniqueSlug', () => {
  it('makes url-safe ascii slugs and empties non-latin names', () => {
    expect(slugify('Death & Co Melbourne')).toBe('death-and-co-melbourne')
    expect(slugify("Mary's Café")).toBe('mary-s-cafe')
    expect(slugify('相馬菓子舗')).toBe('')
  })
  it('falls back to place-N and de-duplicates', () => {
    const taken = new Set(['zareh'])
    expect(uniqueSlug('zareh', taken)).toBe('zareh-2')
    expect(uniqueSlug('', taken)).toBe('place')
    expect(uniqueSlug('', taken)).toBe('place-2')
  })
})

describe('guessSuburb', () => {
  it('reads the suburb out of an Australian address and gives up elsewhere', () => {
    expect(guessSuburb('368 Smith St, Collingwood VIC 3066, Australia')).toBe('Collingwood')
    expect(guessSuburb('33 Commercial St W, Mount Gambier SA 5290, Australia')).toBe('Mount Gambier')
    expect(guessSuburb('〒034-0011 青森県十和田市稲生町')).toBe('')
  })
})

describe('placeKey / isAlreadyPublished', () => {
  const existing = [
    { name: 'Zareh', map_url: 'https://www.google.com/maps/place/Zareh/@-37.79,144.98,17z/data=!3m1!4b1!4m6!3m5!1s0x6ad6430013769889:0xb9f7e97f8baa3b6b!8m2!3d-37.797961!4d144.984692' },
    { name: "Mary's", map_url: 'https://www.google.com/maps/place/x?cid=777' },
  ]
  it('extracts the ftid or cid from a Google Maps url', () => {
    expect(placeKey(existing[0].map_url)).toBe('0x6ad6430013769889:0xb9f7e97f8baa3b6b')
    expect(placeKey(existing[1].map_url)).toBe('777')
    expect(placeKey('https://www.google.com/maps/place/?q=place_id:ChIJ')).toBe('')
  })
  it('matches by place key first, then by case-insensitive name', () => {
    const r = normalizeReview(legacy.features[0], 'legacy')
    expect(isAlreadyPublished(r, existing)).toBe(true)
    expect(isAlreadyPublished({ ...r, url: '', name: "MARY'S" }, existing)).toBe(true)
    expect(isAlreadyPublished({ ...r, url: '', name: 'Somewhere New' }, existing)).toBe(false)
  })
})

describe('draftMarkdown', () => {
  it('writes frontmatter the places loader will accept once category/city are filled', () => {
    const md = draftMarkdown(normalizeReview(legacy.features[0], 'legacy'), 'zareh-2')
    expect(md).toContain('slug: zareh-2')
    expect(md).toContain('name: "Zareh"')
    expect(md).toContain('suburb: "Collingwood"')
    expect(md).toContain('coords: [144.984692, -37.797961]')
    expect(md).toContain('visited: "2026-08-26"')
    expect(md).toContain('## takeout\n\nGreat ambiance and amazing food.')
    expect(md).toMatch(/## en\n\n## zh\n$/)
  })
  it('flags a missing coordinate and an empty review', () => {
    const md = draftMarkdown({ ...normalizeReview(modern.features[0], 'modern'), text: '' }, 'place')
    expect(md).toContain('coords: null')
    expect(md).toContain('⚠')
    expect(md).toContain('只有星级')
  })
})

describe('indexMarkdown', () => {
  it('sorts newest first and counts statuses', () => {
    const rows = [
      { slug: 'a', name: 'A', date: '2024-01-01', rating: 4, coords: null, text: 'x', address: 'addr', status: 'draft' },
      { slug: 'b', name: 'B', date: '2026-05-01', rating: 5, coords: [1, 2], text: 'yy', address: 'addr', status: 'published' },
    ]
    const md = indexMarkdown(rows)
    expect(md.indexOf('| B |')).toBeLessThan(md.indexOf('| A |'))
    expect(md).toContain('共 2 条;已收录 1;缺坐标 1')
    expect(md).toContain('**缺**')
  })
})
```

- [ ] **Step 2: 跑测试,确认失败**

Run: `npx vitest run scripts/lib/takeout.test.mjs`
Expected: FAIL,`Failed to load url ./takeout.mjs`。

- [ ] **Step 3: 实现**

新建 `scripts/lib/takeout.mjs`:

```js
// Google Takeout「Maps (your places)/Reviews.json」解析:两代格式 → 统一结构;草稿 markdown;索引表。
// 纯逻辑,import-takeout.mjs 与 vitest 共用。字段名来自二手资料(spec 附录 B),认不出的格式一律报错而不是猜。

const RATING_WORDS = { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5 }
const round6 = (n) => Math.round(n * 1e6) / 1e6

/** 'legacy' | 'modern' | 'empty' | null */
export function detectFormat(doc) {
  const features = doc?.features
  if (!Array.isArray(features)) return null
  if (features.length === 0) return 'empty'
  const p = features[0]?.properties ?? {}
  if ('google_maps_url' in p || 'review_text_published' in p || 'five_star_rating_published' in p) return 'modern'
  if ('Google Maps URL' in p || 'Star Rating' in p || 'Review Comments' in p) return 'legacy'
  return null
}

export function featureKeys(doc) {
  const f = doc?.features?.[0]
  return f ? Object.keys(f.properties ?? {}) : []
}

function toRating(v) {
  if (typeof v === 'number') return v
  if (typeof v === 'string') {
    const w = RATING_WORDS[v.trim().toUpperCase()]
    if (w) return w
    const n = Number(v)
    if (Number.isFinite(n)) return n
  }
  return null
}
const toDay = (v) => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v) ? v.slice(0, 10) : '')

/** 优先 geometry,其次 Location 里的经纬度;[0,0] 视为缺失。返回 [lng, lat] */
function toCoords(feature, latRaw, lngRaw) {
  const g = feature?.geometry?.coordinates
  if (Array.isArray(g) && Number.isFinite(g[0]) && Number.isFinite(g[1]) && !(g[0] === 0 && g[1] === 0)) {
    return [round6(g[0]), round6(g[1])]
  }
  const lat = Number(latRaw)
  const lng = Number(lngRaw)
  if (Number.isFinite(lat) && Number.isFinite(lng) && !(lat === 0 && lng === 0) && latRaw !== undefined) {
    return [round6(lng), round6(lat)]
  }
  return null
}

export function normalizeReview(feature, format) {
  const p = feature.properties ?? {}
  if (format === 'legacy') {
    const loc = p.Location ?? {}
    const geo = loc['Geo Coordinates'] ?? {}
    return {
      name: loc['Business Name'] ?? '',
      address: loc.Address ?? '',
      coords: toCoords(feature, geo.Latitude, geo.Longitude),
      url: p['Google Maps URL'] ?? '',
      rating: toRating(p['Star Rating']),
      text: String(p['Review Comments'] ?? '').trim(),
      date: toDay(p.Published),
    }
  }
  const loc = p.location ?? {}
  return {
    name: loc.name ?? '',
    address: loc.address ?? '',
    coords: toCoords(feature),
    url: p.google_maps_url ?? '',
    rating: toRating(p.five_star_rating_published),
    text: String(p.review_text_published ?? '').trim(),
    date: toDay(p.date),
  }
}

export function parseTakeout(doc) {
  const format = detectFormat(doc)
  if (format === 'empty') return { format, reviews: [] }
  if (!format) {
    throw new Error(
      `认不出的 Takeout 格式。第一条 feature 的属性 key:${featureKeys(doc).join(', ') || '(无)'}。` +
      '请把这些 key 连同一条脱敏样例发给维护者,在 scripts/lib/takeout.mjs 补一个分支;不要猜。',
    )
  }
  return { format, reviews: doc.features.map(f => normalizeReview(f, format)) }
}

/** ASCII slug;非拉丁名字会得到空串,由 uniqueSlug 兜底成 place-N,成稿时人工改名 */
export function slugify(name) {
  return String(name)
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function uniqueSlug(base, taken) {
  const root = base || 'place'
  let s = root
  let i = 2
  while (taken.has(s)) s = `${root}-${i++}`
  taken.add(s)
  return s
}

const AU_STATES = 'VIC|NSW|QLD|SA|WA|TAS|NT|ACT'
/** 澳洲地址 "…, Suburb STATE 1234, Australia" 里的 Suburb;其他国家留空,成稿时人工填 */
export function guessSuburb(address) {
  const re = new RegExp(`^(.+?)\\s+(${AU_STATES})\\s+\\d{4}$`)
  for (const part of String(address).split(',').map(s => s.trim())) {
    const m = re.exec(part)
    if (m) return m[1]
  }
  return ''
}

/** Google 链接里的地点标识(ftid 的 0x…:0x…,或 cid=),用于和已发布的店判重 */
export function placeKey(url) {
  const s = String(url ?? '')
  const m = /!1s(0x[0-9a-f]+:0x[0-9a-f]+)/i.exec(s) || /[?&]cid=(\d+)/.exec(s)
  return m ? m[1].toLowerCase() : ''
}

export function isAlreadyPublished(review, existing) {
  const key = placeKey(review.url)
  const name = String(review.name).trim().toLowerCase()
  return existing.some(e =>
    (key !== '' && placeKey(e.map_url) === key) ||
    (name !== '' && String(e.name).trim().toLowerCase() === name),
  )
}

const y = (s) => JSON.stringify(String(s ?? ''))

/** 草稿:frontmatter 与 restaurants/spots 同形,category / city 留给成稿;原文放 ## takeout */
export function draftMarkdown(r, slug) {
  const coords = r.coords
    ? `[${r.coords[0]}, ${r.coords[1]}]`
    : 'null   # ⚠ Takeout 没给坐标:成稿时从 map_url 抠(npm run coords:backfill)或人工补'
  return `---
slug: ${slug}
name: ${y(r.name)}
suburb: ${y(guessSuburb(r.address))}
city: ""
category: ""            # sight | activity | shop | stay;吃喝类请改放 restaurants/(food | cafe | bar)
cuisine_en: ""          # 类型标签,如 "Onsen" / "Hike" / "Museum"
cuisine_zh: ""
map_url: ${y(r.url)}
map_type: google
coords: ${coords}
visited: ${y(r.date)}
tagline_en: ""
tagline_zh: ""
images: []
takeout:
  rating: ${r.rating ?? 'null'}     # 仅供参考,不上网站
  address: ${y(r.address)}
---

## takeout

${r.text || '(这条评论没有文字,只有星级)'}

## en

## zh
`
}

/** 索引表:新 → 旧;给业主挑选用 */
export function indexMarkdown(rows) {
  const sorted = [...rows].sort((a, b) => (b.date || '').localeCompare(a.date || ''))
  const published = rows.filter(r => r.status === 'published').length
  const missing = rows.filter(r => !r.coords).length
  const lines = [
    '# Takeout 评论索引',
    '',
    `共 ${rows.length} 条;已收录 ${published};缺坐标 ${missing}`,
    '',
    '| 状态 | 日期 | 星 | 名称 | slug | 坐标 | 字数 | 地址 |',
    '|---|---|---|---|---|---|---|---|',
  ]
  for (const r of sorted) {
    lines.push(
      `| ${r.status === 'published' ? '已收录' : '草稿'} | ${r.date || '—'} | ${r.rating ?? '—'} | ${r.name} | \`${r.slug}\` | ${r.coords ? '✓' : '**缺**'} | ${r.text.length} | ${r.address} |`,
    )
  }
  return lines.join('\n') + '\n'
}
```

- [ ] **Step 4: 跑测试,确认通过**

Run: `npx vitest run scripts/lib/takeout.test.mjs`
Expected: `15 passed`。

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/takeout.mjs scripts/lib/takeout.test.mjs
git commit -m "Add Takeout review parsing: two formats → drafts + index (pure logic)"
```

---

### Task 2: 导入脚本与忽略规则

**Files:**
- Create: `scripts/import-takeout.mjs`
- Modify: `.gitignore`
- Modify: `package.json`

- [ ] **Step 1: 新建 `scripts/import-takeout.mjs`**

```js
// Google Takeout 评论 → 草稿。只写 field-notes/takeout/,永不碰 src/data/。
//   npm run takeout:import -- <Reviews.json> [--out field-notes/takeout] [--since YYYY-MM]
// 已经在 restaurants/ 或 spots/ 里的店(按 Google 地点 id 或名字判重)不写草稿,只在索引里标「已收录」。
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises'
import path from 'node:path'
import matter from 'gray-matter'
import { parseTakeout, slugify, uniqueSlug, isAlreadyPublished, draftMarkdown, indexMarkdown } from './lib/takeout.mjs'

const [, , file, ...rest] = process.argv
if (!file) {
  console.error('用法: node scripts/import-takeout.mjs <Reviews.json> [--out field-notes/takeout] [--since YYYY-MM]')
  process.exit(2)
}
const opt = (flag, fallback) => {
  const i = rest.indexOf(flag)
  return i >= 0 && rest[i + 1] ? rest[i + 1] : fallback
}
const OUT = opt('--out', 'field-notes/takeout')
const SINCE = opt('--since', '')

const doc = JSON.parse(await readFile(file, 'utf8'))
const { format, reviews } = parseTakeout(doc)

const existing = []
for (const dir of ['src/data/restaurants', 'src/data/spots']) {
  let names = []
  try { names = (await readdir(dir)).filter(f => f.endsWith('.md')) } catch { continue }
  for (const f of names) {
    const { data } = matter(await readFile(path.join(dir, f), 'utf8'))
    existing.push({ name: data.name ?? '', map_url: data.map_url ?? '' })
  }
}

await mkdir(OUT, { recursive: true })
const taken = new Set()
const rows = []
let written = 0
let skippedOld = 0
for (const r of reviews) {
  if (SINCE && r.date && r.date.slice(0, 7) < SINCE) { skippedOld++; continue }
  const slug = uniqueSlug(slugify(r.name), taken)
  const status = isAlreadyPublished(r, existing) ? 'published' : 'draft'
  rows.push({ ...r, slug, status })
  if (status === 'draft') {
    await writeFile(path.join(OUT, `${slug}.md`), draftMarkdown(r, slug))
    written++
  }
}
await writeFile(path.join(OUT, 'INDEX.md'), indexMarkdown(rows))

console.log(
  `格式 ${format};共 ${reviews.length} 条${SINCE ? `(早于 ${SINCE} 的 ${skippedOld} 条已跳过)` : ''};` +
  `写入草稿 ${written},已收录跳过 ${rows.length - written},缺坐标 ${rows.filter(r => !r.coords).length}。` +
  `索引:${path.join(OUT, 'INDEX.md')}`,
)
```

- [ ] **Step 2: `.gitignore` 末尾追加**

```
# Takeout 评论草稿(业主全量评论,公开仓库不放;真相源是业主自己的 Takeout 压缩包)
field-notes/takeout/
```

- [ ] **Step 3: `package.json` 加脚本**

`"scripts"` 里 `"map:assets"` 之后追加(前一行末尾补逗号):

```json
    "takeout:import": "node scripts/import-takeout.mjs",
    "photos:import": "node scripts/import-photos.mjs"
```

(`photos:import` 的脚本在 Task 3 创建。)

- [ ] **Step 4: 用内联样例跑一遍**

```bash
mkdir -p /tmp/takeout-sample && cat > /tmp/takeout-sample/Reviews.json <<'EOF'
{"type":"FeatureCollection","features":[
 {"type":"Feature","geometry":{"type":"Point","coordinates":[144.984692,-37.797961]},"properties":{"Google Maps URL":"https://www.google.com/maps/place/Zareh/data=!4m2!3m1!1s0x6ad6430013769889:0xb9f7e97f8baa3b6b","Location":{"Address":"368 Smith St, Collingwood VIC 3066, Australia","Business Name":"Zareh","Country Code":"AU","Geo Coordinates":{"Latitude":"-37.797961","Longitude":"144.984692"}},"Published":"2026-08-26T09:00:00Z","Star Rating":5,"Review Comments":"Great ambiance and amazing food."}},
 {"type":"Feature","geometry":{"type":"Point","coordinates":[144.9767,-37.8678]},"properties":{"Google Maps URL":"https://www.google.com/maps/place/Luna+Park/data=!4m2!3m1!1s0x6ad66800aaaaaaaa:0x1","Location":{"Address":"18 Lower Esplanade, St Kilda VIC 3182, Australia","Business Name":"Luna Park Melbourne","Country Code":"AU","Geo Coordinates":{"Latitude":"-37.8678","Longitude":"144.9767"}},"Published":"2026-03-02T05:00:00Z","Star Rating":4,"Review Comments":"Old-school fun. The Scenic Railway is a century old and still rattles."}}
]}
EOF
npm run -s takeout:import -- /tmp/takeout-sample/Reviews.json && cat field-notes/takeout/INDEX.md && ls field-notes/takeout && git status --short
```

Expected:输出 `格式 legacy;共 2 条;写入草稿 1,已收录跳过 1,缺坐标 0。索引:field-notes/takeout/INDEX.md`;索引里 Zareh 标「已收录」(按 ftid 与已发布的 `zareh.md` 判重)、Luna Park 标「草稿」;目录里有 `INDEX.md` 与 `luna-park-melbourne.md`;**`git status` 看不到 `field-notes/`**(已忽略)。

- [ ] **Step 5: 看一眼草稿**

Run: `cat field-notes/takeout/luna-park-melbourne.md`
Expected:frontmatter 里 `suburb: "St Kilda"`、`coords: [144.9767, -37.8678]`、`visited: "2026-03-02"`、`category: ""`,正文 `## takeout` 下是评论原文,`## en` / `## zh` 为空。

- [ ] **Step 6: 清理样例并 Commit**

```bash
rm -rf field-notes/takeout /tmp/takeout-sample
git add scripts/import-takeout.mjs .gitignore package.json
git commit -m "Add takeout:import: Reviews.json → gitignored drafts + INDEX.md, skipping published places"
```

---

### Task 3: 照片导入脚本(TDD 纯逻辑 + sharp)

**Files:**
- Create: `scripts/lib/photos.mjs`
- Create: `scripts/lib/photos.test.mjs`
- Create: `scripts/import-photos.mjs`

- [ ] **Step 1: 写失败的测试**

新建 `scripts/lib/photos.test.mjs`:

```js
import { describe, it, expect } from 'vitest'
import { planPhotos } from './photos.mjs'

describe('planPhotos', () => {
  it('keeps jpg/jpeg/png, ignores the rest, and numbers targets from 1', () => {
    const p = planPhotos(['b.JPG', 'a.png', 'notes.md', '.DS_Store', 'c.jpeg'])
    expect(p.files).toEqual(['a.png', 'b.JPG', 'c.jpeg'])
    expect(p.targets).toEqual(['1.jpg', '2.jpg', '3.jpg'])
    expect(p.skipped).toEqual([])
  })
  it('sorts naturally so 10 comes after 2', () => {
    expect(planPhotos(['IMG_10.jpg', 'IMG_2.jpg', 'IMG_1.jpg']).files).toEqual(['IMG_1.jpg', 'IMG_2.jpg', 'IMG_10.jpg'])
  })
  it('reports HEIC files as skipped instead of silently dropping them', () => {
    const p = planPhotos(['x.heic', 'y.jpg'])
    expect(p.files).toEqual(['y.jpg'])
    expect(p.skipped).toEqual(['x.heic'])
  })
})
```

- [ ] **Step 2: 跑测试,确认失败**

Run: `npx vitest run scripts/lib/photos.test.mjs`
Expected: FAIL,`Failed to load url ./photos.mjs`。

- [ ] **Step 3: 实现纯逻辑**

新建 `scripts/lib/photos.mjs`:

```js
// 照片导入的纯逻辑:挑出图片文件、自然排序、顺序命名 1.jpg…
const IMAGE = /\.(jpe?g|png)$/i
const HEIC = /\.heic$/i

export function planPhotos(names) {
  const files = names.filter(n => IMAGE.test(n)).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
  return {
    files,
    targets: files.map((_, i) => `${i + 1}.jpg`),
    skipped: names.filter(n => HEIC.test(n)),
  }
}
```

- [ ] **Step 4: 跑测试,确认通过**

Run: `npx vitest run scripts/lib/photos.test.mjs`
Expected: `3 passed`。

- [ ] **Step 5: 写脚本**

新建 `scripts/import-photos.mjs`:

```js
// 原图目录 → public/images/<slug>/1.jpg, 2.jpg…(长边 1600、按 EXIF 转正、剥掉全部元数据含 GPS)
//   npm run photos:import -- <原图目录> <slug> [--max 1600] [--out public/images]
// 末尾打印可直接粘进 frontmatter 的 images: 片段。HEIC 不处理:请先在访达里转成 JPEG(保留拍摄时间便于排序)。
import { readdir, mkdir } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'
import { planPhotos } from './lib/photos.mjs'

const [, , srcDir, slug, ...rest] = process.argv
if (!srcDir || !slug || !/^[a-z0-9-]+$/.test(slug)) {
  console.error('用法: node scripts/import-photos.mjs <原图目录> <slug(小写英文连字符)> [--max 1600] [--out public/images]')
  process.exit(2)
}
const opt = (flag, fallback) => {
  const i = rest.indexOf(flag)
  return i >= 0 && rest[i + 1] ? rest[i + 1] : fallback
}
const MAX = Number(opt('--max', '1600'))
const OUT = path.join(opt('--out', 'public/images'), slug)

const { files, targets, skipped } = planPhotos(await readdir(srcDir))
if (skipped.length) console.warn(`⚠ 跳过 HEIC(请先转成 JPEG):${skipped.join(', ')}`)
if (files.length === 0) {
  console.error('目录里没有 jpg / jpeg / png')
  process.exit(1)
}
await mkdir(OUT, { recursive: true })
for (let i = 0; i < files.length; i++) {
  const src = path.join(srcDir, files[i])
  const dest = path.join(OUT, targets[i])
  const info = await sharp(src)
    .rotate() // 按 EXIF 方向转正,之后元数据不再保留
    .resize({ width: MAX, height: MAX, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 82, mozjpeg: true })
    .toFile(dest)
  console.log(`${files[i]} → ${dest} (${info.width}×${info.height}, ${Math.round(info.size / 1024)} KB)`)
}
console.log('\nimages:\n' + targets.map(t => `  - "${t}"`).join('\n'))
```

- [ ] **Step 6: 用现成的原图目录试跑到临时输出(不动 public/)**

```bash
mkdir -p /tmp/photos-out && npm run -s photos:import -- /Users/tantianshu/Documents/code/gourmet/restaurant/Zareh/imgs zareh-test --out /tmp/photos-out && sips -g pixelWidth -g pixelHeight /tmp/photos-out/zareh-test/1.jpg | tail -2 && exiftool -gps:all -DateTimeOriginal /tmp/photos-out/zareh-test/1.jpg 2>/dev/null || echo "(exiftool 未安装,跳过元数据检查)"
```

Expected:每张打印尺寸(长边 1600)与 KB 数(通常 150–400 KB);末尾打印 `images:` 列表;`sips` 显示长边 1600;若装了 exiftool,GPS 与拍摄时间字段为空。然后 `rm -rf /tmp/photos-out`。

- [ ] **Step 7: Commit**

```bash
git add scripts/lib/photos.mjs scripts/lib/photos.test.mjs scripts/import-photos.mjs
git commit -m "Add photos:import: resize to 1600px, auto-orient, strip EXIF/GPS, number sequentially"
```

---

### Task 4: 景点详情页

**Files:**
- Modify: `src/app/[slug]/page.tsx`
- Modify: `src/components/RestaurantDetail.tsx`

- [ ] **Step 1: 路由改用统一的 Place 读取层**

把 `src/app/[slug]/page.tsx` 整个替换为:

```tsx
import { getPlace, getAllPlaces } from '@/lib/places'
import { notFound } from 'next/navigation'
import RestaurantDetail from '@/components/RestaurantDetail'

// restaurants/ 与 spots/ 都在这里出详情页;首页网格仍只列吃喝
export async function generateStaticParams() {
  return getAllPlaces().map(p => ({ slug: p.slug }))
}

export default async function PlacePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const place = getPlace(slug)
  if (!place) notFound()
  return <RestaurantDetail restaurant={place} />
}
```

- [ ] **Step 2: 详情组件接受 Place**

`src/components/RestaurantDetail.tsx`:
- `import type { Restaurant } from '@/lib/restaurants'` 改为 `import type { Place } from '@/lib/places'`
- `export default function RestaurantDetail({ restaurant }: { restaurant: Restaurant })` 改为 `export default function RestaurantDetail({ restaurant }: { restaurant: Place })`

(组件内只用到 `slug / name / suburb / city / cuisine_* / images / review_* / map_url / map_type / visited`,`Place` 全有。)

- [ ] **Step 3: 类型检查 + 构建**

Run: `npx tsc --noEmit && npm run lint && npm run build`
Expected: 全绿;构建输出里 `/[slug]` 下仍是现有 6 家店(spots/ 目前为空)。

- [ ] **Step 4: Commit**

```bash
git add "src/app/[slug]/page.tsx" src/components/RestaurantDetail.tsx
git commit -m "Detail pages for every place (restaurants + spots) via getPlace()"
```

---

### Task 5: 跑真实 Takeout 导出,把索引交给业主挑选

**前提:业主已导出。** 导出路径约定:`/Users/tantianshu/Documents/code/gourmet/map/takeout/Reviews.json`(gourmet 根目录不是 git 仓库,放这里安全)。Takeout 里勾选「Maps (your places)」得到评论;照片本阶段不从 Takeout 取(见开工前必读第 7 条)。

- [ ] **Step 1: 文件在不在**

Run: `ls -la /Users/tantianshu/Documents/code/gourmet/map/takeout/ 2>/dev/null || echo "没有导出文件"`

- **没有** → 本 Task 与 Task 6 暂停。结束本轮,报告里写明:Task 1–4 已完成并提交,Task 5–6 等业主把 `Reviews.json` 放到上述路径后继续(在 Google Takeout 只勾「Maps (your places)」,下载解压后找到 `Reviews.json`)。跳到 Task 7 先把文档做掉。
- **有** → 继续。

- [ ] **Step 2: 导入**

Run: `npm run -s takeout:import -- /Users/tantianshu/Documents/code/gourmet/map/takeout/Reviews.json`
Expected:打印格式、总数、草稿数、已收录数、缺坐标数。**若报「认不出的 Takeout 格式」**:把错误里列出的 key 原样写进报告,结束本轮等维护者补分支;不要自己猜字段。

- [ ] **Step 3: 把索引交给业主**

读 `field-notes/takeout/INDEX.md`,在报告里给出:总数、已收录数、缺坐标数、按日期排的前 30 条(日期 / 星 / 名称 / 地址 / 字数),并提议一个首批名单(10 条左右:优先有文字、有坐标、非吃喝、分布在已有城市或同一新城市的)。**结束本轮,等业主回复选哪些**;业主也可能顺手给每个条目的照片目录。

---

### Task 6: 成稿首批景点(业主挑完之后)

每一条按下面的清单做;做完一批统一提交、给业主预览,不要一条一提交。

- [ ] **Step 1: 照片**

业主把每个景点的原图放在 `/Users/tantianshu/Documents/code/gourmet/spots/<slug>/imgs/`(与 `restaurant/<name>/imgs/` 同一习惯;HEIC 请业主先转 JPEG)。对每个 slug:

```bash
npm run -s photos:import -- /Users/tantianshu/Documents/code/gourmet/spots/<slug>/imgs <slug>
```

把末尾打印的 `images:` 片段粘进该条目的 frontmatter。没有照片的条目 `images: []`——地图卡片与详情页都能处理无图(卡片不显示封面,详情页不显示大图)。

- [ ] **Step 2: 从草稿成稿**

把 `field-notes/takeout/<slug>.md` 复制为 `src/data/spots/<slug>.md`,然后:

1. `slug`:非拉丁名字的草稿叫 `place-N`,改成有意义的英文 slug(如 `oirase-gorge`);照片目录与 `public/images/<slug>/` 同名。
2. `name`:保留原名(日文 / 中文名照原样,可加英文:`"奥入瀬渓流 Oirase Gorge"`)。
3. `suburb` / `city`:填实际的区与城市。`city` 用网站已有的写法(如 `Melbourne`、`Aomori`、`South Australia`),地图归属以坐标为准。
4. `category`:`sight`(看的)/ `activity`(玩的、体验)/ `shop`(买的)/ `stay`(住的)。若其实是吃喝,移到 `src/data/restaurants/` 并用 `food | cafe | bar`。
5. `cuisine_en` / `cuisine_zh`:类型标签,简短(`"Gorge walk"` / `"溪谷步道"`,`"Onsen"` / `"温泉"`,`"Market"` / `"市集"`)。
6. `coords`:草稿有就用;`null` 的先试 `npm run coords:backfill`(它会从 `map_url` 抠),还抠不到就请业主给一条带坐标的 Google 地图链接。
7. `visited`:草稿里的评论日期(YYYY-MM-DD),业主另说的以业主为准。
8. `tagline_en` / `tagline_zh`:一句话,十来个字。
9. `## en` / `## zh`:以 `## takeout` 原文为底,写成**简洁、轻快、略带幽默**的双语(业主偏好,见 CLAUDE.md 第 3 条);原文是英文就润色英文、译中文,反之亦然。不逐字直译。
10. 删掉 `## takeout` 段与 `takeout:` 块(星级不上网站)。

- [ ] **Step 3: 新城市**

Run: `npx vitest run src/lib/map/cities.test.ts src/lib/places.test.ts`
若 `every real place falls inside some city` 失败,按失败信息里的坐标在 `src/data/map/cities.json` 加城市:`slug`(小写英文)、`name_zh` / `name_en`、`bounds` 包住该城所有点并留余量、`view.center` 取城中心、`zoom` 按城市大小(大城 12.5、小镇 15)、`pitch` 30–50、`bearing` 0。再跑测试到通过。

- [ ] **Step 4: 构建与预览**

Run: `npm run lint && npm run test && npm run build`
然后 dev 预览(`preview_start` 的 `gourmet-dev`):
- `/gourmet/map`:新类别 chips 出现(如「景点」「玩乐」),新城市 chip 出现;点新景点标签小人走过去、卡片显示类型标签与封面;搜索能搜到新景点。
- `/gourmet/<slug>`:详情页正常,类型标签 chip、照片、双语正文、「在地图上看 →」。
- 首页不受影响(仍只列吃喝)。

截图:地图上一个新景点的卡片(桌面)、一个新景点的详情页(手机 375px),存 `docs/superpowers/screenshots/2026-11-14-map-phase4-card.png` / `…-phase4-detail.png`。

- [ ] **Step 5: 给业主预览,点头后 Commit**

报告里列出每条成稿的 slug、类别、城市、双语 tagline,附截图,等业主确认文案与照片。确认后:

```bash
git add src/data/spots public/images src/data/map/cities.json docs/superpowers/screenshots
git commit -m "Add first batch of spots from Google reviews: <slug1>, <slug2>, …"
```

---

### Task 7: 文档与收尾

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: 「Adding a new place」小节改两处**

第 1 步

```
1. Copy images → `web/public/images/<slug>/`
```

改为

```
1. Photos: put the originals in `/Users/tantianshu/Documents/code/gourmet/{restaurant,cafe,winebar,spots}/<name>/imgs/` (HEIC → JPEG first), then `npm run photos:import -- <that dir> <slug>` → `web/public/images/<slug>/1.jpg…` (long edge 1600, auto-oriented, EXIF/GPS stripped) and paste the printed `images:` list. Older entries were copied as full-size originals; re-import them the same way if a page feels heavy.
```

第 6 步末尾追加一句:

```
 Spots use `cuisine_en/zh` as a short **type label** (e.g. `Onsen / 温泉`, `Hike / 徒步`). Every place (restaurants and spots) gets a detail page at `/<slug>` via `getPlace()`.
```

- [ ] **Step 2: 在 `## Map` 之前插入新小节**

```markdown
## Importing Google reviews (Takeout)
- Owner exports Google Takeout with only "Maps (your places)" ticked and drops `Reviews.json` at `/Users/tantianshu/Documents/code/gourmet/map/takeout/`. Then `npm run takeout:import -- /Users/tantianshu/Documents/code/gourmet/map/takeout/Reviews.json [--since YYYY-MM]`.
- Output goes to `web/field-notes/takeout/` (**gitignored** — the owner's whole review history must not land in this public repo): one draft `.md` per review not yet on the site (same frontmatter as `restaurants/`/`spots/`, review text under `## takeout`, `category`/`city` left blank, `coords` from Takeout or `null`), plus `INDEX.md` (newest first, "已收录" for places already published — matched by the Google ftid/cid in `map_url`, else by name). The script never writes `src/data/`.
- Two Takeout generations are recognised (`scripts/lib/takeout.mjs`: legacy "Google Maps URL"/"Star Rating"/"Review Comments" and modern `google_maps_url`/`five_star_rating_published`/`review_text_published`). An unknown shape makes the script print the first feature's keys and exit — add a branch, don't guess. Star ratings stay in the draft only; the site shows no ratings (owner decision).
- Publishing a draft is editorial work: owner picks from `INDEX.md`; Claude fills `category` (`sight | activity | shop | stay`, or moves food/drink to `restaurants/`), `city`/`suburb`, type labels, tagline, bilingual text in the usual concise light-hearted tone, imports photos with `photos:import`, and adds a `cities.json` entry when a spot falls outside every city (the test says so). Preview, owner OK, then commit.
```

- [ ] **Step 3: `## Status` 里的地图状态行**

把「…Phase 4(Takeout 导入景点)待做。」改为「…Phase 4(Takeout 导入管线 + 景点详情页)已完成;景点内容按 `INDEX.md` 逐批成稿。」

- [ ] **Step 4: 三件套**

Run: `npm run lint && npm run test && npm run build`
Expected: 全绿(测试 129 + 15 + 3 = 147 个,成稿后 `places` / `cities` 的真实数据用例自动覆盖新条目)。

- [ ] **Step 5: Commit**

```bash
git add CLAUDE.md
git commit -m "Docs: Takeout import workflow and photos:import in CLAUDE.md"
```

- [ ] **Step 6: 给业主的报告(不要 push、不要合并)**

报告包含:分支名 `feat/map-phase4`;Task 5 的状态(没有导出文件 / 已导入 N 条并附索引摘要 / 格式认不出并附 key);成稿了哪些条目(或等业主挑选);截图;与计划的偏离及原因;一句「等你看过预览,再合并到 main 并 push」。

---

### Task 8(可选,需业主点头):站点英文简介与首页副标题

景点上线后,`layout.tsx` 三处 `description` 与首页 hero 副标题(`HomepageClient.tsx` 的 `sub` 两处)仍写着「restaurants, cafés & bars」。**只在 Task 6 已有景点上线、且业主同意时做**;先在报告里提案,点头后再改:

- EN:`A personal guide to places worth revisiting — food, drink and days out.`
- ZH(首页副标题):`私藏清单:餐厅、咖啡馆、酒吧,还有值得专程去的地方。`

改完 `npm run build`,单独一个 commit:`Copy: broaden site description to cover sights & activities`,并把 CLAUDE.md Style 节里「English `description` strings still say … on purpose」那句删掉。

---

## 验收清单(对照设计文档 §8 Phase 4)

- [ ] `npm run takeout:import` 能吃两代格式,认不出就打印 key 退出;草稿与索引只在 gitignore 的 `field-notes/takeout/`
- [ ] 已发布的店按 Google 地点 id / 名字判重,不重复出草稿
- [ ] `npm run photos:import` 产出长边 1600、无 EXIF/GPS 的顺序命名照片
- [ ] 每个 place(含 spots)都有 `/<slug>` 详情页;首页仍只列吃喝
- [ ] 首批景点(业主挑选)成稿:类别、类型标签、坐标、双语文案、照片齐全;新城市已入 `cities.json`;地图 chips / 搜索 / 卡片 / 详情页都能用
- [ ] `npm run lint && npm run test && npm run build` 全绿;截图入库;报告已交,未 push
