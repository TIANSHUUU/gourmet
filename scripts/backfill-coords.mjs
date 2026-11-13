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
