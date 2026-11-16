// 把 scripts/lib/badges.mjs 的 8 枚 SVG 徽章渲染成 badge-<kind>.png(96×96,透明底)放进收件箱,
// 并在 <收件箱>/_preview/badges.png 生成一张 32 px 实际大小的对照图。之后跑 `npm run map:assets` 入库。
//   npm run badges:render                  → ../map/inbox/melbourne(相对 web/)
//   npm run badges:render -- --out <dir>   → 指定目录
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'
import { BADGE_KINDS, badgeSvg, SIZE } from './lib/badges.mjs'

const args = process.argv.slice(2)
const outFlag = args.indexOf('--out')
const OUT = path.resolve(outFlag >= 0 ? args[outFlag + 1] : '../map/inbox/melbourne')
const PREVIEW = path.join(OUT, '_preview', 'badges.png')

await mkdir(OUT, { recursive: true })
await mkdir(path.dirname(PREVIEW), { recursive: true })

const pngs = new Map()
for (const kind of BADGE_KINDS) {
  const png = await sharp(Buffer.from(badgeSvg(kind)), { density: 288 }).resize(SIZE, SIZE).png().toBuffer()
  pngs.set(kind, png)
  await writeFile(path.join(OUT, `badge-${kind}.png`), png)
}
console.log(`渲染 ${BADGE_KINDS.length} 枚徽章 → ${OUT}/badge-{${BADGE_KINDS.join(',')}}.png`)

// 对照图:第一行 96 px(3 倍),下面三行是地图上的真实大小 32 px,分别压在草地 / 道路 / 水面色上
const BG = ['#B9C95E', '#F2E7C4', '#6FB3D2']
const gap = 24, big = SIZE, small = SIZE / 3
const W = gap + BADGE_KINDS.length * (big + gap)
const rows = [{ size: big, bg: '#B9C95E' }, ...BG.map((bg) => ({ size: small, bg }))]
const H = rows.reduce((h, r) => h + r.size + gap, gap)
const layers = []
let y = gap
for (const r of rows) {
  layers.push({ input: { create: { width: W, height: r.size + gap, channels: 4, background: r.bg } }, left: 0, top: y - gap / 2 })
  let x = gap
  for (const kind of BADGE_KINDS) {
    const buf = r.size === big ? pngs.get(kind) : await sharp(pngs.get(kind)).resize(r.size, r.size).png().toBuffer()
    layers.push({ input: buf, left: Math.round(x + (big - r.size) / 2), top: y })
    x += big + gap
  }
  y += r.size + gap
}
await sharp({ create: { width: W, height: H, channels: 4, background: '#ffffff' } }).composite(layers).png().toFile(PREVIEW)
console.log(`对照图 → ${PREVIEW}`)
