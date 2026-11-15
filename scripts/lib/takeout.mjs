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
