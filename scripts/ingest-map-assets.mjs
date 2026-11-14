// 把收件箱里的 PNG 规整成网站资产。镜像语义:输出 = 收件箱里现在有的;收件箱空了,输出也清空。
//   npm run map:assets                     读 ../map/inbox/melbourne(相对 web/)
//   npm run map:assets -- --inbox <dir>    指定别的收件箱
//   npm run map:assets -- --synthetic      用程序生成的占位资产跑一遍管线(验证用;它的产物不要提交)
// 产物:public/map-assets/{patterns,icons}/*.png、public/sprites/pineapple-painted.png、
//       public/map-assets/manifest.json,以及 <收件箱>/_preview/*-2x2.png(贴图平铺自检,不入库)。
// 末尾自动重跑 scripts/build-map-style.mjs(有贴图才输出 fill-pattern)。
import { readdir, mkdir, rm, writeFile } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import path from 'node:path'
import sharp from 'sharp'
import { classifyAsset, buildManifest, spriteFrames, FRAME, SIZES, POSES } from './lib/map-assets.mjs'

const args = process.argv.slice(2)
const synthetic = args.includes('--synthetic')
const inboxFlag = args.indexOf('--inbox')
const INBOX = path.resolve(inboxFlag >= 0 ? args[inboxFlag + 1] : '../map/inbox/melbourne')
const SRC_DIR = synthetic ? path.join(INBOX, '_synthetic') : INBOX
const OUT_PATTERNS = 'public/map-assets/patterns'
const OUT_ICONS = 'public/map-assets/icons'
const OUT_SPRITE = 'public/sprites/pineapple-painted.png'
const OUT_MANIFEST = 'public/map-assets/manifest.json'
const PREVIEW_DIR = path.join(INBOX, '_preview')
const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 }

// ---------- 合成占位资产(只为验证管线) ----------
// 确定性伪随机,保证每次生成一样
function lcg(seed) {
  let s = seed >>> 0
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296)
}
/** 无缝:每个元素在 ±size 的 8 个邻位各画一份 */
function wrapped(size, items, draw) {
  const out = []
  for (const it of items) for (const dx of [-size, 0, size]) for (const dy of [-size, 0, size]) out.push(draw(it, dx, dy))
  return out.join('')
}
function svgPattern(name) {
  const s = 512
  const rnd = lcg(name.length * 7919)
  const pts = (n) => Array.from({ length: n }, () => ({ x: rnd() * s, y: rnd() * s, r: 0.5 + rnd() }))
  const specs = {
    'pat-wood': { bg: '#6E9F49', body: wrapped(s, pts(40), (p, dx, dy) =>
      `<circle cx="${p.x + dx}" cy="${p.y + dy}" r="${18 + p.r * 14}" fill="${p.r > 1 ? '#4F8A3B' : '#8FBF5A'}"/>`) },
    'pat-grass': { bg: '#B9C95E', body: wrapped(s, pts(120), (p, dx, dy) =>
      `<circle cx="${p.x + dx}" cy="${p.y + dy}" r="${1.5 + p.r * 2}" fill="#9DB04A"/>`) },
    'pat-water': { bg: '#6FB3D2', body: Array.from({ length: 8 }, (_, i) =>
      `<path d="M-20 ${i * 64 + 32} q 32 -10 64 0 t 64 0 t 64 0 t 64 0 t 64 0 t 64 0 t 64 0 t 64 0 t 64 0" fill="none" stroke="#E6F4FA" stroke-width="3"/>`).join('') },
    'pat-sand': { bg: '#E9DBA9', body: wrapped(s, pts(90), (p, dx, dy) =>
      `<circle cx="${p.x + dx}" cy="${p.y + dy}" r="${1 + p.r}" fill="#D6C58C"/>`) },
  }
  const { bg, body } = specs[name]
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}"><rect width="${s}" height="${s}" fill="${bg}"/>${body}</svg>`
}
function svgBadge(label, color) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><circle cx="128" cy="128" r="118" fill="#F8F2DD" stroke="${color}" stroke-width="14"/><text x="128" y="150" font-size="88" font-family="Helvetica, Arial, sans-serif" font-weight="700" text-anchor="middle" fill="${color}">${label}</text></svg>`
}
function svgLandmark(label, color) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><rect x="24" y="40" width="208" height="176" rx="22" fill="${color}" stroke="#3B392C" stroke-width="8"/><polygon points="40,44 128,0 216,44" fill="#8C5A3C" stroke="#3B392C" stroke-width="6"/><text x="128" y="150" font-size="64" font-family="Helvetica, Arial, sans-serif" font-weight="700" text-anchor="middle" fill="#F8F2DD">${label}</text></svg>`
}
function svgStorefront(label) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><rect x="32" y="96" width="192" height="128" fill="#E9DCC2" stroke="#3B392C" stroke-width="8"/><rect x="24" y="72" width="208" height="40" rx="8" fill="#E8603C" stroke="#3B392C" stroke-width="6"/><rect x="108" y="150" width="40" height="74" fill="#6E4B2A"/><text x="128" y="102" font-size="30" font-family="Helvetica, Arial, sans-serif" font-weight="700" text-anchor="middle" fill="#F8F2DD">${label}</text></svg>`
}
/** 简陋的"手绘"菠萝子:四个姿势只差手臂 / 腿 */
function svgPose(pose) {
  const arms = { idle: 'M70 190 l-26 30 M186 190 l26 30', 'walk-a': 'M70 190 l-30 10 M186 190 l30 -14', 'walk-b': 'M70 190 l-30 -14 M186 190 l30 10', cheer: 'M70 180 l-20 -40 M186 180 l20 -40' }[pose]
  const legs = { idle: 'M108 280 v34 M148 280 v34', 'walk-a': 'M108 280 l-16 34 M148 280 l16 34', 'walk-b': 'M108 280 l16 34 M148 280 l-16 34', cheer: 'M108 280 v34 M148 280 v34' }[pose]
  return `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="320"><path d="M128 70 l-30 -56 l14 44 l-40 -30 l26 42 l-50 -8 l50 24 z" fill="#43A047"/><ellipse cx="128" cy="190" rx="66" ry="96" fill="#F7C948" stroke="#E8A020" stroke-width="6"/><rect x="88" y="146" width="80" height="26" rx="13" fill="#1A1A1A"/><path d="M104 214 q24 26 48 0" stroke="#D84315" stroke-width="8" fill="none" stroke-linecap="round"/><path d="${arms}" stroke="#E8A020" stroke-width="12" stroke-linecap="round" fill="none"/><path d="${legs}" stroke="#8D5524" stroke-width="12" stroke-linecap="round" fill="none"/></svg>`
}
async function writeSyntheticInbox(dir) {
  await rm(dir, { recursive: true, force: true })
  await mkdir(dir, { recursive: true })
  const files = []
  for (const name of ['pat-wood', 'pat-grass', 'pat-water', 'pat-sand']) files.push([`${name}.png`, svgPattern(name)])
  const badges = { food: ['F', '#E8603C'], cafe: ['C', '#8C5A3C'], bar: ['B', '#7B4B94'], sight: ['S', '#2F8F83'], activity: ['A', '#3C8ABF'], shop: ['Sh', '#D58A2B'], stay: ['St', '#5A6B9E'] }
  for (const [k, [label, color]] of Object.entries(badges)) files.push([`badge-${k}.png`, svgBadge(label, color)])
  const lms = { flinders: ['FSS', '#D9A441'], 'arts-centre': ['ART', '#C9C9C9'], mcg: ['MCG', '#5A6B9E'], exhibition: ['REB', '#E9DCC2'], shrine: ['SHR', '#9A9A9A'], 'luna-park': ['LUNA', '#E8603C'] }
  for (const [k, [label, color]] of Object.entries(lms)) files.push([`lm-${k}.png`, svgLandmark(label, color)])
  files.push(['shop-zareh.png', svgStorefront('ZAREH')])
  for (const pose of POSES) files.push([`pp-${pose}.png`, svgPose(pose)])
  for (const [name, svg] of files) await sharp(Buffer.from(svg)).png().toFile(path.join(dir, name))
  console.log(`生成 ${files.length} 个合成占位资产 → ${dir}`)
}

// ---------- 规整 ----------
async function normalizeTo(src, asset, dest) {
  const img = sharp(src).ensureAlpha()
  if (asset.kind === 'pattern') {
    const meta = await img.metadata()
    if (meta.width !== meta.height) console.warn(`⚠ ${path.basename(src)} 不是正方形(${meta.width}×${meta.height}),强行缩放会失真;贴图请用正方形`)
    await img.resize(asset.size, asset.size, { fit: 'fill' }).png().toFile(dest)
    return
  }
  await img.resize(asset.size, asset.size, { fit: 'contain', background: TRANSPARENT }).png().toFile(dest)
}

async function preview2x2(file, id) {
  const s = SIZES.pattern
  const tile = await sharp(file).png().toBuffer()
  await mkdir(PREVIEW_DIR, { recursive: true })
  await sharp({ create: { width: s * 2, height: s * 2, channels: 4, background: TRANSPARENT } })
    .composite([{ input: tile, left: 0, top: 0 }, { input: tile, left: s, top: 0 }, { input: tile, left: 0, top: s }, { input: tile, left: s, top: s }])
    .png().toFile(path.join(PREVIEW_DIR, `${id}-2x2.png`))
}

async function buildSpriteSheet(poseFiles) {
  const layers = []
  for (const f of spriteFrames()) {
    let frame = sharp(poseFiles.get(f.pose)).ensureAlpha()
      .resize(FRAME.w, FRAME.h, { fit: 'contain', position: 'south', background: TRANSPARENT })
    // 下移的帧裁掉底部 dy 像素,免得越界画到下一行
    if (f.dy) frame = sharp(await frame.png().toBuffer()).extract({ left: 0, top: 0, width: FRAME.w, height: FRAME.h - f.dy })
    layers.push({ input: await frame.png().toBuffer(), left: f.x, top: f.y + f.dy })
  }
  await sharp({ create: { width: FRAME.w * FRAME.cols, height: FRAME.h * FRAME.rows, channels: 4, background: TRANSPARENT } })
    .composite(layers).png().toFile(OUT_SPRITE)
}

async function main() {
  if (synthetic) await writeSyntheticInbox(SRC_DIR)
  let names = []
  try {
    names = (await readdir(SRC_DIR)).sort()
  } catch {
    console.log(`收件箱不存在:${SRC_DIR}(按空收件箱处理)`)
  }
  const assets = []
  const skipped = []
  for (const n of names) {
    const a = classifyAsset(n)
    if (a) assets.push({ ...a, src: path.join(SRC_DIR, n) })
    else if (!n.startsWith('_') && !n.startsWith('.')) skipped.push(n)
  }
  if (skipped.length) console.log('跳过(文件名不认识):', skipped.join(', '))

  // 镜像语义:先清空输出,再按收件箱重建
  await rm(OUT_PATTERNS, { recursive: true, force: true })
  await rm(OUT_ICONS, { recursive: true, force: true })
  await rm(OUT_SPRITE, { force: true })
  await mkdir(OUT_PATTERNS, { recursive: true })
  await mkdir(OUT_ICONS, { recursive: true })

  const poseFiles = new Map()
  for (const a of assets) {
    if (a.kind === 'pose') { poseFiles.set(a.id, a.src); continue }
    const dest = path.join(a.kind === 'pattern' ? OUT_PATTERNS : OUT_ICONS, `${a.id}.png`)
    await normalizeTo(a.src, a, dest)
    if (a.kind === 'pattern') await preview2x2(dest, a.id)
    console.log(`规整 ${path.basename(a.src)} → ${dest}`)
  }
  const manifest = buildManifest(assets)
  if (manifest.walker) {
    await buildSpriteSheet(poseFiles)
    console.log(`拼出手绘雪碧图 → ${OUT_SPRITE}`)
  } else if (poseFiles.size) {
    console.log(`⚠ 姿势图只有 ${[...poseFiles.keys()].join(', ')},四张(${POSES.join(', ')})齐了才拼雪碧图`)
  }
  await mkdir(path.dirname(OUT_MANIFEST), { recursive: true })
  await writeFile(OUT_MANIFEST, JSON.stringify(manifest, null, 2) + '\n')
  console.log('manifest:', JSON.stringify(manifest))
  if (manifest.patterns.length) console.log(`贴图 2×2 平铺预览 → ${PREVIEW_DIR}(肉眼检查接缝)`)

  // 有无贴图决定样式里是否输出 fill-pattern,所以样式必须跟着重建
  execFileSync(process.execPath, ['scripts/build-map-style.mjs'], { stdio: 'inherit' })
}

await main()
