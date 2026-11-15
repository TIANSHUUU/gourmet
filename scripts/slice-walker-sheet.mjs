// 把手绘小人四连格切成收件箱要的四张姿势图,再由 `npm run map:assets` 拼雪碧图。
//   npm run walker:slice -- <四连格.png> [--inbox ../map/inbox/melbourne]
// 四连格要求:透明背景,四个人物从左到右 = idle / walk-a / walk-b / cheer,同比例、脚底同一条线,人物之间留空。
import path from 'node:path'
import { mkdir } from 'node:fs/promises'
import sharp from 'sharp'
import { findFigureSpans, planSlices } from './lib/walker-sheet.mjs'

const args = process.argv.slice(2)
const src = args.find(a => !a.startsWith('--'))
if (!src) {
  console.error('用法: node scripts/slice-walker-sheet.mjs <四连格.png> [--inbox <dir>]')
  process.exit(1)
}
const inboxFlag = args.indexOf('--inbox')
const INBOX = path.resolve(inboxFlag >= 0 ? args[inboxFlag + 1] : '../map/inbox/melbourne')
const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 }

const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
const cols = new Array(info.width).fill(0)
for (let y = 0; y < info.height; y++)
  for (let x = 0; x < info.width; x++) if (data[(y * info.width + x) * 4 + 3] >= 128) cols[x]++
const spans = findFigureSpans(cols)
console.log(`找到 ${spans.length} 个人物:`, spans.map(([a, b]) => `x${a}-${b}`).join(', '))
const plan = planSlices(spans, info.width, info.height)

await mkdir(INBOX, { recursive: true })
for (const p of plan) {
  const figure = await sharp(src).ensureAlpha().extract(p.extract).png().toBuffer()
  const dest = path.join(INBOX, `pp-${p.pose}.png`)
  await sharp({ create: { ...p.canvas, channels: 4, background: TRANSPARENT } })
    .composite([{ input: figure, left: p.left, top: p.top }])
    .png().toFile(dest)
  console.log(`pp-${p.pose}.png ← x${p.extract.left}-${p.extract.left + p.extract.width - 1},画布 ${p.canvas.width}×${p.canvas.height}`)
}
console.log(`完成 → ${INBOX};接着跑 npm run map:assets 拼雪碧图`)
