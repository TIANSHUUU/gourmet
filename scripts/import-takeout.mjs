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
