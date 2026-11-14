# 菠萝子地图 Phase 3:画风升级·墨尔本试点 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让地图能"吃"业主用图像模型生成的美术资产(无缝贴图、分类徽章、墨尔本地标、店面小插画、手绘菠萝子),一条命令规整进站点并在运行时加载;资产缺哪样就回退到现有占位(纯色、画布徽章、像素小人),所以**没有美术也能完整开发与验收**。

**Architecture:** 业主把 PNG 丢进 `/Users/tantianshu/Documents/code/gourmet/map/inbox/melbourne/`;`npm run map:assets` 用 sharp 按文件名前缀规整尺寸、拼手绘雪碧图、出 2×2 平铺预览、写 `public/map-assets/manifest.json`,再重跑底图样式脚本(有贴图才输出 `fill-pattern`)。运行时 `MapView` 读 manifest,建图前把图片预取成 `ImageBitmap`,在 `style.load` 时同步 `addImage`(所以首帧就有贴图,不会闪);manifest 里没有的一律回退。地标是新的 GeoJSON 图层(数据在 `src/data/map/landmarks/<city>.json`);店面是 places 源上的新 symbol 图层。纯逻辑(文件名分类、manifest、雪碧图帧表、地标校验)全部有单测;`--synthetic` 开关用程序生成的占位资产把整条管线跑通。

**Tech Stack:** 与前几阶段相同 + `sharp`(仅脚本用的 devDependency)。

**前置:** Phase 0–2 已合并上线(`main` 含 `/map`、小人、`scripts/build-map-style.mjs` 的 pattern 槽位)。

**设计文档:** `web/docs/superpowers/specs/2026-11-13-pineapple-map-design.md`(§6.4 样式与 pattern 槽位、§6.5 地标、§7 / §7.1 资产规格与墨尔本试点、§8 Phase 3 验收)

---

## 开工前必读

1. `web/CLAUDE.md`(Map 一节:worker 副本、CSS 坑、padding 规范、小人)与 `web/AGENTS.md`。
2. 所有命令在 `/Users/tantianshu/Documents/code/gourmet/web` 下执行;先 `git switch -c feat/map-phase3`。本地 dev 需要 `web/.env.local` 含 `NEXT_PUBLIC_BASE_PATH=/gourmet`。
3. **收件箱可能是空的**(业主还没生成资产)。这不影响本阶段:Task 3 的 `--synthetic` 会生成占位资产把管线跑通;Task 9 再按收件箱的真实情况决定提交什么。**合成资产只用于验证,不提交**(Task 9 Step 1 会把它们清掉)。
4. 规整尺寸(图片像素)与运行时 `pixelRatio`(图片像素 ÷ 显示的 CSS 像素)成对出现:贴图 512 / 2、徽章 96 / 3(显示 32px)、地标 256 / 2(基准 128px,再按缩放 `icon-size`)、店面 192 / 2。改一边要改另一边(`scripts/lib/map-assets.mjs` 的 `SIZES` 与 `src/lib/map/assets.ts` 的 `PIXEL_RATIO`)。
5. 有意留到以后的(不要顺手做):地形阴影(DEM)、沿街路由、Google Maps Embed、其他城市的地标(试点只做墨尔本,十和田 / 芒特甘比尔等业主看过效果再说)。
6. 配色微调是**视觉决定**:Task 10 只产出候选截图给业主挑,不要自作主张改调色板提交。
7. 视觉与交互任务的「完成」证据是截图与逐项核对。**未经业主确认不 `git push`、不合并**。每个 Task 结束 commit 一次。

---

## 文件结构

| 文件 | 操作 | 职责 |
|---|---|---|
| `package.json` | 修改 | devDep `sharp`;脚本 `map:assets` |
| `scripts/lib/map-assets.mjs` | 新建 | 纯逻辑:文件名分类、manifest、雪碧图帧表、尺寸常量 |
| `scripts/lib/map-assets.test.mjs` | 新建 | 上者的单测 |
| `scripts/ingest-map-assets.mjs` | 新建 | 收件箱 → `public/map-assets/`(镜像语义)+ 雪碧图 + 2×2 预览 + manifest,末尾重跑样式脚本;`--synthetic` 生成占位资产 |
| `public/map-assets/manifest.json` | 生成后提交 | 运行时据此决定加载什么 |
| `public/map-assets/{patterns,icons}/*.png` | 生成后提交(有真资产时) | 规整后的贴图与图标 |
| `public/sprites/pineapple-painted.png` | 生成后提交(有四张姿势图时) | 手绘雪碧图,帧表与像素版一致 |
| `src/lib/map/assets.ts` | 新建 | 纯逻辑:解析 manifest、图片 URL 与 pixelRatio、小人雪碧图 URL |
| `src/lib/map/assets.test.ts` | 新建 | 单测 |
| `src/data/map/landmarks/melbourne.json` | 新建 | 6 个墨尔本地标 |
| `src/lib/map/landmarks.ts` | 新建 | 读取 + zod 校验 → GeoJSON |
| `src/lib/map/landmarks.test.ts` | 新建 | 单测 + 真实数据归属校验 |
| `src/components/map/mapImages.ts` | 修改 | 加 `makeGenericLandmark()` 占位图标 |
| `src/components/map/walkerMarker.ts` | 修改 | 小人站位偏移(不再挡住店名标签) |
| `src/components/map/MapView.tsx` | 重写 | manifest 预载、`style.load` 注册图片、徽章回退、地标与店面图层、语言切换、小人雪碧图选择 |
| `src/components/map/MapPageClient.tsx` | 修改 | 传 `lang` 与 `landmarks` |
| `src/app/map/page.tsx` | 修改 | 读地标传给客户端 |
| `CLAUDE.md` | 修改 | 资产管线说明 |

---

### Task 1: 依赖与脚本

**Files:**
- Modify: `package.json`

- [ ] **Step 1: 建分支、装 sharp**

```bash
git switch -c feat/map-phase3
npm install -D sharp@^0.34
node -e "require('sharp'); console.log('sharp ok')"
```

Expected: 最后一行 `sharp ok`(Apple Silicon 预编译二进制随包带;若报错说明网络拦了预编译包下载,重试一次 `npm install`)。

- [ ] **Step 2: 加脚本**

`package.json` 的 `"scripts"` 里 `"maps:worker"` 之后追加(前一行末尾补逗号):

```json
    "map:assets": "node scripts/ingest-map-assets.mjs"
```

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "Add sharp + map:assets script"
```

---

### Task 2: 收件箱纯逻辑(TDD)

**Files:**
- Create: `scripts/lib/map-assets.mjs`
- Create: `scripts/lib/map-assets.test.mjs`

- [ ] **Step 1: 写失败的测试**

新建 `scripts/lib/map-assets.test.mjs`:

```js
import { describe, it, expect } from 'vitest'
import { classifyAsset, buildManifest, spriteFrames, pixelRatioFor, FRAME, POSES, SIZES } from './map-assets.mjs'

describe('classifyAsset', () => {
  it('maps known prefixes to kinds, ids and target sizes', () => {
    expect(classifyAsset('pat-wood.png')).toEqual({ kind: 'pattern', id: 'pat-wood', size: 512 })
    expect(classifyAsset('badge-food.png')).toEqual({ kind: 'badge', id: 'badge-food', size: 96 })
    expect(classifyAsset('lm-flinders.png')).toEqual({ kind: 'landmark', id: 'lm-flinders', size: 256 })
    expect(classifyAsset('shop-zareh.png')).toEqual({ kind: 'storefront', id: 'shop-zareh', size: 192 })
    expect(classifyAsset('pp-walk-a.png')).toEqual({ kind: 'pose', id: 'walk-a', size: null })
  })
  it('is case-insensitive on the filename', () => {
    expect(classifyAsset('BADGE-Food.PNG')?.id).toBe('badge-food')
  })
  it('rejects unknown prefixes, unknown poses and non-png files', () => {
    expect(classifyAsset('pp-dance.png')).toBeNull()
    expect(classifyAsset('tree.png')).toBeNull()
    expect(classifyAsset('pat-wood.jpg')).toBeNull()
    expect(classifyAsset('README.md')).toBeNull()
    expect(classifyAsset('.DS_Store')).toBeNull()
  })
})

describe('buildManifest', () => {
  const a = (name) => classifyAsset(name)
  it('sorts ids and separates patterns from icons', () => {
    const m = buildManifest([a('lm-mcg.png'), a('pat-water.png'), a('badge-bar.png'), a('pat-grass.png'), a('shop-zareh.png')])
    expect(m).toEqual({ patterns: ['pat-grass', 'pat-water'], icons: ['badge-bar', 'lm-mcg', 'shop-zareh'], walker: null })
  })
  it('enables the painted walker only when all four poses are present', () => {
    const three = POSES.slice(0, 3).map(p => a(`pp-${p}.png`))
    expect(buildManifest(three).walker).toBeNull()
    const four = POSES.map(p => a(`pp-${p}.png`))
    expect(buildManifest(four).walker).toBe('pineapple-painted')
  })
  it('returns an empty manifest for an empty inbox', () => {
    expect(buildManifest([])).toEqual({ patterns: [], icons: [], walker: null })
  })
})

describe('spriteFrames', () => {
  it('lays out 8 frames in the pixel sheet grid (idle×2 / walk×4 / celebrate×2)', () => {
    const f = spriteFrames()
    expect(f).toHaveLength(8)
    expect(f.map(x => x.pose)).toEqual(['idle', 'idle', 'walk-a', 'walk-b', 'walk-a', 'walk-b', 'cheer', 'idle'])
    expect(f[2]).toMatchObject({ col: 0, row: 1, x: 0, y: FRAME.h })
    expect(f[7]).toMatchObject({ col: 1, row: 2, x: FRAME.w, y: FRAME.h * 2 })
  })
  it('nudges the second idle frame down 2px so idle "breathes"', () => {
    const f = spriteFrames()
    expect(f[0].dy).toBe(0)
    expect(f[1].dy).toBe(2)
    expect(f.filter(x => x.dy !== 0)).toHaveLength(1)
  })
  it('sheet dimensions match the pixel sprite (512×480)', () => {
    expect(FRAME.w * FRAME.cols).toBe(512)
    expect(FRAME.h * FRAME.rows).toBe(480)
  })
})

describe('pixelRatioFor / SIZES', () => {
  it('pairs each kind with a ratio that yields the intended on-screen size', () => {
    expect(SIZES.badge / pixelRatioFor('badge')).toBe(32)
    expect(SIZES.pattern / pixelRatioFor('pattern')).toBe(256)
    expect(SIZES.landmark / pixelRatioFor('landmark')).toBe(128)
    expect(SIZES.storefront / pixelRatioFor('storefront')).toBe(96)
    expect(pixelRatioFor('pose')).toBe(1)
  })
})
```

- [ ] **Step 2: 跑测试,确认失败**

Run: `npx vitest run scripts/lib/map-assets.test.mjs`
Expected: FAIL,`Failed to load url ./map-assets.mjs`。

- [ ] **Step 3: 实现**

新建 `scripts/lib/map-assets.mjs`:

```js
// 美术资产收件箱的纯逻辑:文件名分类、manifest、手绘雪碧图帧表。ingest 脚本与 vitest 共用。

/** 规整后的图片像素尺寸(正方形)。改这里要同步改 src/lib/map/assets.ts 的 PIXEL_RATIO */
export const SIZES = { pattern: 512, badge: 96, landmark: 256, storefront: 192 }
/** 手绘小人需要的四张姿势图(文件名 pp-<pose>.png) */
export const POSES = ['idle', 'walk-a', 'walk-b', 'cheer']
/** 雪碧图帧表,与像素版 pineapple-classic.png 完全一致 */
export const FRAME = { w: 128, h: 160, cols: 4, rows: 3 }

/** 按文件名判断资产类型;不认识的(含非 png)返回 null */
export function classifyAsset(filename) {
  const m = /^([a-z]+)-([a-z0-9-]+)\.png$/i.exec(filename)
  if (!m) return null
  const prefix = m[1].toLowerCase()
  const rest = m[2].toLowerCase()
  if (prefix === 'pat') return { kind: 'pattern', id: `pat-${rest}`, size: SIZES.pattern }
  if (prefix === 'badge') return { kind: 'badge', id: `badge-${rest}`, size: SIZES.badge }
  if (prefix === 'lm') return { kind: 'landmark', id: `lm-${rest}`, size: SIZES.landmark }
  if (prefix === 'shop') return { kind: 'storefront', id: `shop-${rest}`, size: SIZES.storefront }
  if (prefix === 'pp' && POSES.includes(rest)) return { kind: 'pose', id: rest, size: null }
  return null
}

/** manifest:运行时据此决定加载哪些图、哪些回退到占位 */
export function buildManifest(assets) {
  const patterns = assets.filter(a => a.kind === 'pattern').map(a => a.id).sort()
  const icons = assets
    .filter(a => a.kind === 'badge' || a.kind === 'landmark' || a.kind === 'storefront')
    .map(a => a.id)
    .sort()
  const poses = new Set(assets.filter(a => a.kind === 'pose').map(a => a.id))
  const walker = POSES.every(p => poses.has(p)) ? 'pineapple-painted' : null
  return { patterns, icons, walker }
}

/**
 * 手绘雪碧图帧表:行0 idle×2 / 行1 walk×4 / 行2 celebrate×2(与 walker.css 的动画一致)。
 * 第二个 idle 帧下移 2px,两帧交替就是"呼吸";celebrate 的第二帧用 idle,举手 ↔ 放下。
 */
export function spriteFrames() {
  const rows = [
    ['idle', 'idle'],
    ['walk-a', 'walk-b', 'walk-a', 'walk-b'],
    ['cheer', 'idle'],
  ]
  const out = []
  rows.forEach((row, r) =>
    row.forEach((pose, c) =>
      out.push({ pose, col: c, row: r, x: c * FRAME.w, y: r * FRAME.h, dy: r === 0 && c === 1 ? 2 : 0 }),
    ),
  )
  return out
}

/** addImage 的 pixelRatio = 图片像素 ÷ 想显示的 CSS 像素 */
export function pixelRatioFor(kind) {
  return { pattern: 2, badge: 3, landmark: 2, storefront: 2 }[kind] ?? 1
}
```

- [ ] **Step 4: 跑测试,确认通过**

Run: `npx vitest run scripts/lib/map-assets.test.mjs`
Expected: `10 passed`。

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/map-assets.mjs scripts/lib/map-assets.test.mjs
git commit -m "Add map-assets pure logic: filename classification, manifest, sprite frame table"
```

---

### Task 3: 收件箱规整脚本(含 `--synthetic`)

**Files:**
- Create: `scripts/ingest-map-assets.mjs`

- [ ] **Step 1: 写脚本**

新建 `scripts/ingest-map-assets.mjs`:

```js
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
```

- [ ] **Step 2: 用合成资产跑一遍**

Run: `npm run map:assets -- --synthetic`
Expected 输出依次包含:`生成 22 个合成占位资产`、22 行以内的「规整 …」(18 个非姿势文件)、`拼出手绘雪碧图 → public/sprites/pineapple-painted.png`、`manifest: {"patterns":["pat-grass","pat-sand","pat-water","pat-wood"],"icons":[…14 个:7 徽章 + 6 地标 + 1 店面…],"walker":"pineapple-painted"}`、最后样式脚本打印 `patterns: { wood: 'pat-wood', grass: 'pat-grass', water: 'pat-water', sand: 'pat-sand' }`。

- [ ] **Step 3: 检查产物**

```bash
ls public/map-assets/patterns public/map-assets/icons
sips -g pixelWidth -g pixelHeight public/sprites/pineapple-painted.png public/map-assets/patterns/pat-wood.png public/map-assets/icons/badge-food.png | grep -E "pixel|png"
ls ../map/inbox/melbourne/_preview
node -e "const s=require('./public/maps/painted.json');console.log(s.layers.filter(l=>l.paint&&l.paint['fill-pattern']).map(l=>l.id+':'+l.paint['fill-pattern']))"
```

Expected:4 张贴图、14 个图标;雪碧图 512×480、贴图 512×512、徽章 96×96;预览目录有 4 个 `*-2x2.png`;最后一行列出 `landcover_wood:pat-wood`、`landcover_grass:pat-grass`、`park:pat-grass`、`water:pat-water`、`landcover_sand:pat-sand` 等。用 Read 工具打开 `../map/inbox/melbourne/_preview/pat-wood-2x2.png` 看一眼:四块之间看不出接缝(合成贴图是按无缝生成的,看得出接缝说明 `wrapped()` 坏了)。

- [ ] **Step 4: 确认镜像语义(空收件箱 → 输出清空)**

Run: `npm run map:assets && cat public/map-assets/manifest.json && ls public/map-assets/patterns public/map-assets/icons && ls public/sprites`
Expected(收件箱此时为空):manifest 为 `{"patterns": [], "icons": [], "walker": null}`;两个目录为空;`public/sprites` 只有 `pineapple-classic.png`;样式脚本打印 `patterns: { wood: null, … }`。`git status` 里 `painted.json` 应无改动(回到纯色版)。
如果收件箱里已经有业主放的真资产,这一步会把它们规整出来——那也对,继续即可,Task 9 再统一处理。

- [ ] **Step 5: Commit**(只提交脚本与空 manifest;合成产物已被 Step 4 清掉)

```bash
git add scripts/ingest-map-assets.mjs public/map-assets/manifest.json
git commit -m "Add ingest-map-assets: inbox → normalized assets, painted sprite sheet, manifest (+ --synthetic)"
```

---

### Task 4: 运行时资产模块(TDD)

**Files:**
- Create: `src/lib/map/assets.ts`
- Create: `src/lib/map/assets.test.ts`

- [ ] **Step 1: 写失败的测试**

新建 `src/lib/map/assets.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { EMPTY_MANIFEST, hasIcon, imageSpecs, parseManifest, storefrontSlugs, walkerSpriteUrl } from './assets'

const full = { patterns: ['pat-wood'], icons: ['badge-food', 'lm-mcg', 'shop-zareh'], walker: 'pineapple-painted' as const }

describe('parseManifest', () => {
  it('accepts a valid manifest', () => {
    expect(parseManifest(full)).toEqual(full)
  })
  it('falls back to the empty manifest on garbage, null or wrong shapes', () => {
    expect(parseManifest(null)).toEqual(EMPTY_MANIFEST)
    expect(parseManifest('nope')).toEqual(EMPTY_MANIFEST)
    expect(parseManifest({ patterns: 'pat-wood' })).toEqual(EMPTY_MANIFEST)
    expect(parseManifest({ walker: 'something-else' })).toEqual(EMPTY_MANIFEST)
  })
  it('fills missing fields with defaults', () => {
    expect(parseManifest({ icons: ['badge-bar'] })).toEqual({ patterns: [], icons: ['badge-bar'], walker: null })
  })
})

describe('imageSpecs', () => {
  it('builds urls under basePath and pairs each id with its pixelRatio', () => {
    expect(imageSpecs(full, '/gourmet')).toEqual([
      { id: 'pat-wood', url: '/gourmet/map-assets/patterns/pat-wood.png', pixelRatio: 2 },
      { id: 'badge-food', url: '/gourmet/map-assets/icons/badge-food.png', pixelRatio: 3 },
      { id: 'lm-mcg', url: '/gourmet/map-assets/icons/lm-mcg.png', pixelRatio: 2 },
      { id: 'shop-zareh', url: '/gourmet/map-assets/icons/shop-zareh.png', pixelRatio: 2 },
    ])
  })
  it('is empty for the empty manifest', () => {
    expect(imageSpecs(EMPTY_MANIFEST, '')).toEqual([])
  })
})

describe('walkerSpriteUrl / hasIcon / storefrontSlugs', () => {
  it('picks the painted sheet only when the manifest has it', () => {
    expect(walkerSpriteUrl(full, '/gourmet')).toBe('/gourmet/sprites/pineapple-painted.png')
    expect(walkerSpriteUrl(EMPTY_MANIFEST, '')).toBe('/sprites/pineapple-classic.png')
  })
  it('hasIcon checks the icons list', () => {
    expect(hasIcon(full, 'badge-food')).toBe(true)
    expect(hasIcon(full, 'badge-bar')).toBe(false)
  })
  it('storefrontSlugs strips the shop- prefix', () => {
    expect(storefrontSlugs(full)).toEqual(['zareh'])
    expect(storefrontSlugs(EMPTY_MANIFEST)).toEqual([])
  })
})
```

- [ ] **Step 2: 跑测试,确认失败**

Run: `npx vitest run src/lib/map/assets.test.ts`
Expected: FAIL,`Failed to load url ./assets`。

- [ ] **Step 3: 实现**

新建 `src/lib/map/assets.ts`:

```ts
import { z } from 'zod'

/** public/map-assets/manifest.json 的形状(由 scripts/ingest-map-assets.mjs 生成) */
export type AssetManifest = {
  patterns: string[]
  icons: string[]
  walker: 'pineapple-painted' | null
}

export const EMPTY_MANIFEST: AssetManifest = { patterns: [], icons: [], walker: null }

const schema = z.object({
  patterns: z.array(z.string()).default([]),
  icons: z.array(z.string()).default([]),
  walker: z.literal('pineapple-painted').nullable().default(null),
})

/** 解析失败一律回退空 manifest(= 全部用占位),绝不让地图页因为资产清单坏掉 */
export function parseManifest(raw: unknown): AssetManifest {
  const r = schema.safeParse(raw)
  return r.success ? r.data : EMPTY_MANIFEST
}

export type ImageSpec = { id: string; url: string; pixelRatio: number }

/** 图片像素 ÷ 显示 CSS 像素;与 scripts/lib/map-assets.mjs 的 SIZES / pixelRatioFor 成对 */
const PIXEL_RATIO: Record<string, number> = { pat: 2, badge: 3, lm: 2, shop: 2 }
const ratioOf = (id: string) => PIXEL_RATIO[id.split('-')[0]] ?? 1

/** 运行时要预取并 addImage 的全部图片 */
export function imageSpecs(m: AssetManifest, basePath: string): ImageSpec[] {
  return [
    ...m.patterns.map(id => ({ id, url: `${basePath}/map-assets/patterns/${id}.png`, pixelRatio: ratioOf(id) })),
    ...m.icons.map(id => ({ id, url: `${basePath}/map-assets/icons/${id}.png`, pixelRatio: ratioOf(id) })),
  ]
}

export function walkerSpriteUrl(m: AssetManifest, basePath: string): string {
  return `${basePath}/sprites/${m.walker ?? 'pineapple-classic'}.png`
}

export function hasIcon(m: AssetManifest, id: string): boolean {
  return m.icons.includes(id)
}

/** 有店面小插画的店 slug 列表(icons 里的 shop-<slug>) */
export function storefrontSlugs(m: AssetManifest): string[] {
  return m.icons.filter(id => id.startsWith('shop-')).map(id => id.slice('shop-'.length))
}
```

- [ ] **Step 4: 跑测试,确认通过**

Run: `npx vitest run src/lib/map/assets.test.ts`
Expected: `8 passed`。

- [ ] **Step 5: Commit**

```bash
git add src/lib/map/assets.ts src/lib/map/assets.test.ts
git commit -m "Add runtime asset manifest helpers"
```

---

### Task 5: 墨尔本地标数据与读取层(TDD)

**Files:**
- Create: `src/data/map/landmarks/melbourne.json`
- Create: `src/lib/map/landmarks.ts`
- Create: `src/lib/map/landmarks.test.ts`

- [ ] **Step 1: 写地标数据**

新建 `src/data/map/landmarks/melbourne.json`(文件名 = 城市 slug;`icon` 对应收件箱的 `lm-*.png`,没有图时运行时回退通用占位;`minzoom` 是出现的最低缩放):

```json
[
  { "name_zh": "弗林德斯街车站", "name_en": "Flinders Street Station", "coords": [144.9671, -37.8183], "icon": "lm-flinders", "minzoom": 12 },
  { "name_zh": "墨尔本艺术中心", "name_en": "Arts Centre Melbourne", "coords": [144.9683, -37.8206], "icon": "lm-arts-centre", "minzoom": 13 },
  { "name_zh": "墨尔本板球场", "name_en": "Melbourne Cricket Ground", "coords": [144.9834, -37.8200], "icon": "lm-mcg", "minzoom": 12 },
  { "name_zh": "皇家展览馆", "name_en": "Royal Exhibition Building", "coords": [144.9717, -37.8047], "icon": "lm-exhibition", "minzoom": 13 },
  { "name_zh": "战争纪念馆", "name_en": "Shrine of Remembrance", "coords": [144.9734, -37.8305], "icon": "lm-shrine", "minzoom": 13 },
  { "name_zh": "月亮公园", "name_en": "Luna Park", "coords": [144.9767, -37.8678], "icon": "lm-luna-park", "minzoom": 13 }
]
```

- [ ] **Step 2: 核对坐标**(OSM Nominatim,免费、无 key;每次请求间隔 ≥1 s,带一个通用 User-Agent)

```bash
for q in "Flinders Street Station, Melbourne" "Arts Centre Melbourne" "Melbourne Cricket Ground" "Royal Exhibition Building, Melbourne" "Shrine of Remembrance, Melbourne" "Luna Park, St Kilda"; do
  curl -s -A "pineapple-map-landmark-check" "https://nominatim.openstreetmap.org/search?format=json&limit=1&q=$(python3 -c "import urllib.parse,sys;print(urllib.parse.quote(sys.argv[1]))" "$q")" | python3 -c "import json,sys;r=json.load(sys.stdin);print(sys.argv[1], '→', r[0]['lon'], r[0]['lat'] if r else 'no result')" "$q"
  sleep 1.2
done
```

Expected:每个结果与 JSON 里的坐标相差不超过 0.002°(约 200 m)。差得多就把 JSON 改成 Nominatim 的值(保留 4 位小数)。网络不通就跳过这一步,在报告里注明"坐标未核对"。

- [ ] **Step 3: 写失败的测试**

新建 `src/lib/map/landmarks.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { getAllLandmarks, parseLandmarks } from './landmarks'
import { cityOf } from './cities'
import type { LngLat } from '@/lib/places'

const ok = [{ name_zh: '车站', name_en: 'Station', coords: [144.9671, -37.8183], icon: 'lm-flinders', minzoom: 12 }]

describe('parseLandmarks', () => {
  it('turns entries into Point features tagged with the city', () => {
    const [f] = parseLandmarks(ok, 'melbourne')
    expect(f.geometry).toEqual({ type: 'Point', coordinates: [144.9671, -37.8183] })
    expect(f.properties).toEqual({ name_zh: '车站', name_en: 'Station', icon: 'lm-flinders', minzoom: 12, city: 'melbourne' })
  })
  it('defaults minzoom to 13', () => {
    const [f] = parseLandmarks([{ ...ok[0], minzoom: undefined }], 'melbourne')
    expect(f.properties.minzoom).toBe(13)
  })
  it('rejects icons that are not lm-<slug> and names the city file', () => {
    expect(() => parseLandmarks([{ ...ok[0], icon: 'flinders' }], 'melbourne')).toThrow(/melbourne\.json.*icon/)
  })
  it('rejects coords written as [lat, lng]', () => {
    expect(() => parseLandmarks([{ ...ok[0], coords: [-37.8, 144.9] }], 'melbourne')).toThrow(/coords/)
  })
})

describe('getAllLandmarks (real data)', () => {
  it('loads melbourne.json and every landmark sits inside the city it is filed under', () => {
    const fc = getAllLandmarks()
    expect(fc.features.length).toBeGreaterThanOrEqual(6)
    for (const f of fc.features) {
      expect(cityOf(f.geometry.coordinates as LngLat)?.slug, f.properties.name_en).toBe(f.properties.city)
    }
  })
})
```

- [ ] **Step 4: 跑测试,确认失败**

Run: `npx vitest run src/lib/map/landmarks.test.ts`
Expected: FAIL,`Failed to load url ./landmarks`。

- [ ] **Step 5: 实现**

新建 `src/lib/map/landmarks.ts`:

```ts
import fs from 'fs'
import path from 'path'
import { z } from 'zod'
import type { Feature, FeatureCollection, Point } from 'geojson'

const entry = z.object({
  name_zh: z.string().min(1),
  name_en: z.string().min(1),
  coords: z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)]),
  icon: z.string().regex(/^lm-[a-z0-9-]+$/, '须形如 lm-<slug>,对应收件箱的 lm-<slug>.png'),
  minzoom: z.number().min(0).max(22).default(13),
})
const file = z.array(entry)

export type LandmarkProps = { name_zh: string; name_en: string; icon: string; minzoom: number; city: string }
export type LandmarkFeature = Feature<Point, LandmarkProps>
export type LandmarkCollection = FeatureCollection<Point, LandmarkProps>

/** 一个城市文件的内容 → Point features(属性里带上城市 slug)。校验失败点名文件 */
export function parseLandmarks(raw: unknown, city: string): LandmarkFeature[] {
  const parsed = file.safeParse(raw)
  if (!parsed.success) {
    const issues = parsed.error.issues.map(i => `${i.path.join('.') || '(root)'}: ${i.message}`).join('; ')
    throw new Error(`[landmarks] ${city}.json: ${issues}`)
  }
  return parsed.data.map(e => ({
    type: 'Feature',
    geometry: { type: 'Point', coordinates: e.coords },
    properties: { name_zh: e.name_zh, name_en: e.name_en, icon: e.icon, minzoom: e.minzoom, city },
  }))
}

const DIR = path.join(process.cwd(), 'src/data/map/landmarks')

/** 全部城市的地标;目录不存在 → 空集合 */
export function getAllLandmarks(): LandmarkCollection {
  const features: LandmarkFeature[] = []
  if (fs.existsSync(DIR)) {
    for (const f of fs.readdirSync(DIR).filter(f => f.endsWith('.json')).sort()) {
      const raw = JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf-8')) as unknown
      features.push(...parseLandmarks(raw, f.replace(/\.json$/, '')))
    }
  }
  return { type: 'FeatureCollection', features }
}
```

- [ ] **Step 6: 跑测试,确认通过**

Run: `npx vitest run src/lib/map/landmarks.test.ts`
Expected: `5 passed`。

- [ ] **Step 7: Commit**

```bash
git add src/data/map/landmarks/melbourne.json src/lib/map/landmarks.ts src/lib/map/landmarks.test.ts
git commit -m "Add Melbourne landmarks data + zod-validated loader"
```

---

### Task 6: 占位地标图标与小人站位偏移

**Files:**
- Modify: `src/components/map/mapImages.ts`
- Modify: `src/components/map/walkerMarker.ts`

- [ ] **Step 1: `mapImages.ts` 末尾追加通用地标占位**

```ts
/** 地标占位(收件箱没有对应 lm-*.png 时用):奶油色圆底 + 深色五角星。Phase 3 资产到位后不再出现 */
export function makeGenericLandmark(): { image: ImageData; options: { pixelRatio: number } } {
  const s = 40
  const c = document.createElement('canvas')
  c.width = s * DPR
  c.height = s * DPR
  const ctx = c.getContext('2d')!
  ctx.scale(DPR, DPR)
  ctx.fillStyle = '#F8F2DD'
  ctx.strokeStyle = '#3B392C'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(s / 2, s / 2, s / 2 - 2, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
  ctx.fillStyle = '#3B392C'
  ctx.beginPath()
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? 11 : 4.5
    const a = -Math.PI / 2 + (i * Math.PI) / 5
    ctx.lineTo(s / 2 + r * Math.cos(a), s / 2 + r * Math.sin(a))
  }
  ctx.closePath()
  ctx.fill()
  return { image: ctx.getImageData(0, 0, s * DPR, s * DPR), options: { pixelRatio: DPR } }
}
```

- [ ] **Step 2: 小人站到店门口右下方,不再盖住店名标签**

`src/components/map/walkerMarker.ts`:

在 `export type WalkerAction = …` 之后加:

```ts
/** 小人相对坐标点的屏幕偏移(像素):站在"门口右下",让白色店名标签与店面小插画保持可见 */
export const WALKER_OFFSET: [number, number] = [22, 6]
```

构造函数里 `new Marker({ … })` 的选项加一行 `offset: WALKER_OFFSET,`(放在 `anchor: 'bottom',` 之后)。类注释末尾补一句:`offset 只影响屏幕位置,getLngLat() 仍是坐标点本身,所以邻近判定不受影响。`

- [ ] **Step 3: 类型检查**

Run: `npx tsc --noEmit`
Expected: 无错误。

- [ ] **Step 4: Commit**

```bash
git add src/components/map/mapImages.ts src/components/map/walkerMarker.ts
git commit -m "Add generic landmark placeholder icon; offset the walker so it doesn't cover labels"
```

---

### Task 7: `MapView` 接入资产、地标与店面图层

**Files:**
- Rewrite: `src/components/map/MapView.tsx`
- Modify: `src/components/map/MapPageClient.tsx`
- Modify: `src/app/map/page.tsx`

- [ ] **Step 1: 把 `src/components/map/MapView.tsx` 整个替换为**

```tsx
'use client'

import { useEffect, useRef, useState, type RefObject } from 'react'
import {
  AttributionControl,
  Map as MapLibreMap,
  setWorkerUrl,
  type GeoJSONSource,
  type MapLayerMouseEvent,
  type PaddingOptions,
  type StyleSpecification,
} from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import './walker.css'
import type { Point } from 'geojson'
import { basePath } from '@/lib/basePath'
import { makeBadge, makeGenericLandmark, makeLabelBackground } from './mapImages'
import { WalkerController } from './walkerController'
import { KIND_ORDER } from '@/lib/map/kinds'
import { boundsOf, haversineMeters } from '@/lib/map/geo'
import { inBounds, type City } from '@/lib/map/cities'
import { EMPTY_MANIFEST, hasIcon, imageSpecs, parseManifest, storefrontSlugs, walkerSpriteUrl, type AssetManifest, type ImageSpec } from '@/lib/map/assets'
import type { LandmarkCollection } from '@/lib/map/landmarks'
import type { Vec } from '@/lib/map/walker'
import type { PlaceCollection, PlaceFeature } from '@/lib/map/placesToGeoJSON'
import type { LngLat, PlaceKind } from '@/lib/places'

export const SOURCE_ID = 'places'
export const SOURCE_LANDMARKS = 'landmarks'
export const LAYER_CLUSTER = 'place-cluster'
export const LAYER_CLUSTER_COUNT = 'place-cluster-count'
export const LAYER_STOREFRONT = 'place-storefront'
export const LAYER_LABEL = 'place-label'
export const LAYER_BADGE = 'place-badge'
export const LAYER_LANDMARK = 'landmark'
const GENERIC_LANDMARK = 'lm-generic'

// MapLibre 的 padding 是持久的:每次镜头操作都显式给,卡片关闭时复位。
// 注意 fitBounds 默认把 padding 叠加在地图"当前 padding"上且不持久化,所以 fitBounds 都要带 absolutePadding: true
// (maplibre 7 起成为默认);flyTo / easeTo / jumpTo 传的 padding 本来就是替换并持久。
const OVERVIEW_PADDING = { top: 150, bottom: 60, left: 60, right: 60 }
const CITY_PADDING = { top: 150, bottom: 80, left: 40, right: 40 }
// 手机:右下角有 ~150px 高的虚拟方向键,底部要多留,否则最南的店会被它盖住
const CITY_PADDING_MOBILE = { top: 150, bottom: 200, left: 40, right: 40 }
const isMobileViewport = () => window.matchMedia('(max-width: 767px)').matches
const cityPadding = () => (isMobileViewport() ? CITY_PADDING_MOBILE : CITY_PADDING)
const CARD_PADDING_MOBILE = { top: 0, bottom: 260, left: 0, right: 0 }
const CARD_PADDING_DESKTOP = { top: 0, bottom: 0, left: 0, right: 380 }
/** 单店城市:小人出生在店南边约 90 m,免得一按键就"到达" */
const SPAWN_OFFSET_LAT = -0.0008

/** 父组件通过 apiRef 调用的命令(键盘 / DPad / 按钮) */
export type MapApi = {
  setInput: (dir: Vec) => void
  recenter: () => void
  togglePitch: () => void
}

type Props = {
  /** 已带 basePath 的样式 JSON 地址 */
  styleUrl: string
  data: PlaceCollection
  landmarks: LandmarkCollection
  cities: City[]
  lang: 'en' | 'zh'
  /** null = 总览(框住全部地点,小人隐藏) */
  activeCity: string | null
  /** 卡片打开的地点:镜头飞过去、高亮、小人站过去 */
  focusPlace: PlaceFeature | null
  /** 点标签后要走去的店;nonce 让连点同一家也能重新走 */
  walkTarget: { slug: string; nonce: number } | null
  /** 当前显示的分类 */
  kinds: PlaceKind[]
  reducedMotion: boolean
  apiRef: RefObject<MapApi | null>
  onPlaceClick: (slug: string) => void
  /** 点到空白处(用于收起卡片) */
  onMapClick: () => void
  /** 小人到达某店(自动行走到达 / 自由行走停留满时长) */
  onArrive: (slug: string) => void
  /** 小人从某店门口走开 */
  onLeave: (slug: string) => void
  /** 样式拿不到 / WebGL 不可用 → 父组件切到纯列表 */
  onFail: (err: unknown) => void
}

type LoadedImage = ImageSpec & { bitmap: ImageBitmap }

/** 读资产清单;404 / 坏 JSON 都当空清单(全部回退占位) */
async function fetchManifest(): Promise<AssetManifest> {
  try {
    const res = await fetch(`${basePath}/map-assets/manifest.json`)
    if (!res.ok) return EMPTY_MANIFEST
    return parseManifest(await res.json())
  } catch {
    return EMPTY_MANIFEST
  }
}

/** 建图前把全部资产图片取成 ImageBitmap;单张失败只影响那一张(回退占位) */
async function preloadImages(specs: ImageSpec[]): Promise<LoadedImage[]> {
  const results = await Promise.all(
    specs.map(async s => {
      try {
        const res = await fetch(s.url)
        if (!res.ok) throw new Error(String(res.status))
        return { ...s, bitmap: await createImageBitmap(await res.blob()) }
      } catch (err) {
        console.warn('[map] 资产加载失败,回退占位:', s.id, err)
        return null
      }
    }),
  )
  return results.filter((r): r is LoadedImage => r !== null)
}

const landmarkTextField = (lang: 'en' | 'zh') => ['get', lang === 'en' ? 'name_en' : 'name_zh'] as ['get', string]

export default function MapView(props: Props) {
  const { styleUrl, data, landmarks, cities, lang, activeCity, focusPlace, walkTarget, kinds, reducedMotion, apiRef } = props
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MapLibreMap | null>(null)
  const walkerRef = useRef<WalkerController | null>(null)
  const [ready, setReady] = useState(false)
  // 回调放 ref:父组件每次渲染传新函数,不应触发重建地图
  const cbRef = useRef({ onPlaceClick: props.onPlaceClick, onMapClick: props.onMapClick, onArrive: props.onArrive, onLeave: props.onLeave, onFail: props.onFail })
  useEffect(() => {
    cbRef.current = { onPlaceClick: props.onPlaceClick, onMapClick: props.onMapClick, onArrive: props.onArrive, onLeave: props.onLeave, onFail: props.onFail }
  })
  const lastFocusRef = useRef<string | null>(null)
  const lastNearRef = useRef<string | null>(null)
  // 地图此刻"应有"的 padding(总览 / 城市 / 卡片)。凡是自己不换 padding 的镜头操作(聚合圈点击、🍍、3D、小人起步拉近)
  // 都要带上它:MapLibre 里任何不带 padding 的镜头调用,会把进行中的 padding 过渡打断在半截并留在那里
  const padRef = useRef<PaddingOptions>(OVERVIEW_PADDING)

  // 1) 建图(只跑一次;StrictMode 下会跑两遍,靠 cancelled 守住)。reducedMotion 只在建图时读一次。
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    let map: MapLibreMap | null = null
    let cancelled = false
    ;(async () => {
      try {
        if (!('WebGL2RenderingContext' in window)) throw new Error('WebGL2 不可用')
        // 样式、资产清单、资产图片一起取:图片要在 style.load 时同步 addImage,首帧才有贴图(否则 fill-pattern 会闪空)
        const [styleRes, manifest] = await Promise.all([fetch(styleUrl), fetchManifest()])
        if (!styleRes.ok) throw new Error(`样式加载失败 ${styleRes.status} ${styleUrl}`)
        const [style, images] = await Promise.all([
          styleRes.json() as Promise<StyleSpecification>,
          preloadImages(imageSpecs(manifest, basePath)),
        ])
        if (cancelled) return
        const loadedIds = new Set(images.map(i => i.id))
        const landmarkData: LandmarkCollection = {
          ...landmarks,
          features: landmarks.features.map(f => ({
            ...f,
            properties: { ...f.properties, icon: loadedIds.has(f.properties.icon) ? f.properties.icon : GENERIC_LANDMARK },
          })),
        }
        const shops = storefrontSlugs(manifest).filter(s => loadedIds.has(`shop-${s}`))

        // maplibre 6 的 ESM worker 靠 import.meta.url 定位,Turbopack 打包后找不到(404 → "Worker failed to load")。
        // 改用 public/maps/ 下的副本(npm run maps:worker 从 node_modules 同步;升级 maplibre-gl 后要重跑)
        setWorkerUrl(`${basePath}/maps/maplibre-gl-worker.js`)
        map = new MapLibreMap({
          container: el,
          style,
          center: [144.9631, -37.8136],
          zoom: 3,
          maxPitch: 65,
          attributionControl: false,
        })
        // 署名放左下:右下 / 底部会被卡片盖住(手机端卡片里另有一行署名)
        map.addControl(new AttributionControl({ compact: false }), 'bottom-left')
        mapRef.current = map
        map.on('error', e => {
          // WebGL 建不出来是致命的;单张瓦片/字形 404 只是警告
          if (/webgl/i.test(String(e.error?.message ?? ''))) cbRef.current.onFail(e.error)
          else console.warn('[map]', e.error)
        })
        // style.load 在首帧渲染前触发:此时注册贴图 / 图标,样式里的 fill-pattern 从第一帧起就能画
        map.once('style.load', () => {
          const m = mapRef.current
          if (!m) return
          for (const img of images) m.addImage(img.id, img.bitmap, { pixelRatio: img.pixelRatio })
        })
        map.once('load', () => {
          const m = mapRef.current
          if (!m) return
          const lb = makeLabelBackground()
          m.addImage('label-bg', lb.image, lb.options)
          // 徽章:收件箱有 PNG 就用 PNG(style.load 时已注册),没有就画布占位
          for (const k of KIND_ORDER) {
            if (hasIcon(manifest, `badge-${k}`) && loadedIds.has(`badge-${k}`)) continue
            const b = makeBadge(k)
            m.addImage(`badge-${k}`, b.image, b.options)
          }
          const gl = makeGenericLandmark()
          m.addImage(GENERIC_LANDMARK, gl.image, gl.options)

          // 地标图层先加:后加的 places 图层在碰撞时优先(店名永远不让位给地标)
          m.addSource(SOURCE_LANDMARKS, { type: 'geojson', data: landmarkData })
          m.addLayer({
            id: LAYER_LANDMARK, type: 'symbol', source: SOURCE_LANDMARKS,
            filter: ['>=', ['zoom'], ['get', 'minzoom']],
            layout: {
              'icon-image': ['get', 'icon'],
              'icon-size': ['interpolate', ['linear'], ['zoom'], 12, 0.3, 15, 0.5, 17, 0.8],
              'icon-anchor': 'bottom',
              'icon-pitch-alignment': 'viewport',
              'text-field': landmarkTextField(lang),
              'text-font': ['Noto Sans Regular'],
              'text-size': 11,
              'text-anchor': 'top',
              'text-offset': [0, 0.3],
              'text-pitch-alignment': 'viewport',
              'text-optional': true,
            },
            paint: {
              'text-color': '#3B392C',
              'text-halo-color': '#F8F2DD',
              'text-halo-width': 1.5,
            },
          })

          m.addSource(SOURCE_ID, {
            type: 'geojson',
            data,
            promoteId: 'slug', // feature-state 用 slug 当 id
            cluster: true,
            clusterMaxZoom: 12,
            clusterRadius: 40,
          })
          m.addLayer({
            id: LAYER_CLUSTER, type: 'circle', source: SOURCE_ID, filter: ['has', 'point_count'],
            paint: {
              'circle-color': '#F0742A',
              'circle-radius': ['step', ['get', 'point_count'], 16, 5, 20, 20, 26],
              'circle-stroke-color': '#FFFFFF',
              'circle-stroke-width': 2,
            },
          })
          m.addLayer({
            id: LAYER_CLUSTER_COUNT, type: 'symbol', source: SOURCE_ID, filter: ['has', 'point_count'],
            layout: { 'text-field': ['get', 'point_count_abbreviated'], 'text-font': ['Noto Sans Bold'], 'text-size': 13 },
            paint: { 'text-color': '#FFFFFF' },
          })
          // 店面小插画:只给收件箱里有 shop-<slug>.png 的店,街道级才出现,压在标签下面
          if (shops.length) {
            m.addLayer({
              id: LAYER_STOREFRONT, type: 'symbol', source: SOURCE_ID, minzoom: 15.5,
              filter: ['all', ['!', ['has', 'point_count']], ['in', ['get', 'slug'], ['literal', shops]]],
              layout: {
                'icon-image': ['concat', 'shop-', ['get', 'slug']],
                'icon-size': ['interpolate', ['linear'], ['zoom'], 15.5, 0.5, 17, 0.8, 18, 1],
                'icon-anchor': 'bottom',
                'icon-pitch-alignment': 'viewport',
                'icon-allow-overlap': true,
                'icon-ignore-placement': true,
              },
            })
          }
          m.addLayer({
            id: LAYER_LABEL, type: 'symbol', source: SOURCE_ID, filter: ['!', ['has', 'point_count']],
            layout: {
              'text-field': ['get', 'name'],
              'text-font': ['Noto Sans Bold'], // 只能用 OpenFreeMap 提供的字体栈名
              'text-size': 12,
              'text-anchor': 'bottom',
              'text-offset': [0, -1.0], // 单位 em;把文字抬高到指针之上。指针没对准点就调这个
              'icon-image': 'label-bg',
              'icon-text-fit': 'both',
              'icon-text-fit-padding': [4, 8, 4, 8],
              'icon-anchor': 'bottom',
              'icon-pitch-alignment': 'viewport',
              'text-pitch-alignment': 'viewport',
            },
            paint: {
              // active = 卡片打开的店(橙);near = 小人站在门口的店(蓝)
              'text-color': [
                'case',
                ['boolean', ['feature-state', 'active'], false], '#F0742A',
                ['boolean', ['feature-state', 'near'], false], '#0F84B5',
                '#2B2A24',
              ],
            },
          })
          m.addLayer({
            id: LAYER_BADGE, type: 'symbol', source: SOURCE_ID, filter: ['!', ['has', 'point_count']],
            layout: {
              'icon-image': ['concat', 'badge-', ['get', 'kind']],
              'icon-anchor': 'bottom',
              'icon-offset': [0, -44], // 像素;徽章浮在标签正上方。重叠/离太远就调这个
              'icon-pitch-alignment': 'viewport',
              'icon-allow-overlap': true,
              'icon-ignore-placement': true,
            },
          })

          const pick = (e: MapLayerMouseEvent) => {
            const f = e.features?.[0]
            if (f) cbRef.current.onPlaceClick(String(f.properties.slug))
          }
          const clickable = [LAYER_LABEL, LAYER_BADGE, ...(shops.length ? [LAYER_STOREFRONT] : [])]
          for (const id of clickable) m.on('click', id, pick)
          m.on('click', LAYER_CLUSTER, async e => {
            const f = e.features?.[0]
            if (!f) return
            const src = m.getSource(SOURCE_ID) as GeoJSONSource
            const zoom = await src.getClusterExpansionZoom(Number(f.properties.cluster_id))
            m.easeTo({ center: (f.geometry as Point).coordinates as LngLat, zoom, padding: padRef.current })
          })
          m.on('click', e => {
            const hits = m.queryRenderedFeatures(e.point, { layers: [...clickable, LAYER_CLUSTER] })
            if (hits.length === 0) cbRef.current.onMapClick()
          })
          for (const id of [...clickable, LAYER_CLUSTER]) {
            m.on('mouseenter', id, () => { m.getCanvas().style.cursor = 'pointer' })
            m.on('mouseleave', id, () => { m.getCanvas().style.cursor = '' })
          }

          // 小人:事件全部转发到最新的回调;near 高亮直接改 feature-state。雪碧图:有手绘版用手绘版
          const walker = new WalkerController(m, walkerSpriteUrl(manifest, basePath), reducedMotion, {
            onArrive: slug => cbRef.current.onArrive(slug),
            onLeave: slug => cbRef.current.onLeave(slug),
            onNear: slug => {
              if (lastNearRef.current) m.setFeatureState({ source: SOURCE_ID, id: lastNearRef.current }, { near: false })
              lastNearRef.current = slug
              if (slug) m.setFeatureState({ source: SOURCE_ID, id: slug }, { near: true })
            },
          }, () => padRef.current)
          walkerRef.current = walker
          apiRef.current = {
            setInput: dir => walker.setInput(dir),
            recenter: () => {
              if (!walker.isVisible()) return
              m.easeTo({ center: walker.position(), zoom: Math.max(m.getZoom(), 15), padding: padRef.current, duration: reducedMotion ? 0 : 500 })
            },
            togglePitch: () => m.easeTo({ pitch: m.getPitch() > 20 ? 0 : 55, padding: padRef.current, duration: reducedMotion ? 0 : 500 }),
          }
          setReady(true)
        })
      } catch (err) {
        cbRef.current.onFail(err)
      }
    })()
    return () => {
      cancelled = true
      apiRef.current = null
      walkerRef.current?.destroy()
      walkerRef.current = null
      mapRef.current = null
      map?.remove()
    }
    // data / landmarks 只在建图时用一次,后续通过 setData 更新;只有 styleUrl 变化才重建
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [styleUrl])

  // 2) 城市切换 / 总览:城市视角框住该城所有店;小人出现在城市中心(单店城市:店南边一点)
  useEffect(() => {
    const m = mapRef.current
    const walker = walkerRef.current
    if (!m || !walker || !ready) return
    const city = cities.find(c => c.slug === activeCity)
    if (!city) {
      padRef.current = OVERVIEW_PADDING
      walker.hide()
      const b = boundsOf(data.features.map(f => f.geometry.coordinates as LngLat))
      if (b) m.fitBounds(b, { padding: OVERVIEW_PADDING, absolutePadding: true, pitch: 0, bearing: 0, maxZoom: 12, duration: reducedMotion ? 0 : 1200 })
      return
    }
    const inCity = data.features
      .map(f => f.geometry.coordinates as LngLat)
      .filter(c => inBounds(c, city.bounds))
    padRef.current = cityPadding()
    const cam = { pitch: city.view.pitch, bearing: city.view.bearing, padding: padRef.current }
    let spawn: LngLat
    if (inCity.length >= 2) {
      const b = boundsOf(inCity) as [LngLat, LngLat]
      m.fitBounds(b, { ...cam, absolutePadding: true, maxZoom: city.view.zoom, duration: reducedMotion ? 0 : 1800 })
      spawn = [(b[0][0] + b[1][0]) / 2, (b[0][1] + b[1][1]) / 2]
    } else if (inCity.length === 1) {
      const opts = { ...cam, center: inCity[0], zoom: city.view.zoom }
      if (reducedMotion) m.jumpTo(opts); else m.flyTo({ ...opts, duration: 1800 })
      spawn = [inCity[0][0], inCity[0][1] + SPAWN_OFFSET_LAT]
    } else {
      const opts = { ...cam, center: city.view.center, zoom: city.view.zoom }
      if (reducedMotion) m.jumpTo(opts); else m.flyTo({ ...opts, duration: 1800 })
      spawn = city.view.center
    }
    walker.placeAt(spawn)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCity, ready])

  // 3) 卡片打开的店:高亮 + 飞过去(给卡片留出位置)+ 小人站过去;关闭时复位 padding
  useEffect(() => {
    const m = mapRef.current
    const walker = walkerRef.current
    if (!m || !walker || !ready) return
    const hadFocus = lastFocusRef.current !== null
    if (lastFocusRef.current) m.setFeatureState({ source: SOURCE_ID, id: lastFocusRef.current }, { active: false })
    lastFocusRef.current = focusPlace?.properties.slug ?? null
    if (!focusPlace) {
      padRef.current = activeCity ? cityPadding() : OVERVIEW_PADDING
      // 只有"刚关掉卡片"才需要把 padding 缓动回去。首次加载 / 卡片开着切城市时,上面的城市 effect 已经起了
      // 带 padding 的 fitBounds / flyTo,这里再 easeTo 会把它打断(MapLibre 任何镜头调用都会 stop 掉进行中的动画)
      if (hadFocus && !m.isMoving()) m.easeTo({ padding: padRef.current, duration: reducedMotion ? 0 : 300 })
      return
    }
    m.setFeatureState({ source: SOURCE_ID, id: focusPlace.properties.slug }, { active: true })
    const center = focusPlace.geometry.coordinates as LngLat
    // 不是走着到的(URL 直达 / 减少动态 / 搜索)就瞬移过去;走着到的别打断庆祝动画
    if (!walker.isVisible() || haversineMeters(walker.position(), center) > 5) walker.placeAt(center)
    padRef.current = isMobileViewport() ? CARD_PADDING_MOBILE : CARD_PADDING_DESKTOP
    const opts = { center, zoom: 16, pitch: 55, padding: padRef.current }
    if (reducedMotion) m.jumpTo(opts)
    else m.flyTo({ ...opts, duration: 1500 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusPlace, ready])

  // 4) 点标签 → 小人走过去
  useEffect(() => {
    const walker = walkerRef.current
    if (!walker || !ready || !walkTarget) return
    const f = data.features.find(x => x.properties.slug === walkTarget.slug)
    if (f) walker.walkTo(walkTarget.slug, f.geometry.coordinates as LngLat)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walkTarget, ready])

  // 5) 分类筛选:重设数据(聚合数字跟着变);小人的"可到达店铺" = 当前城市 ∩ 当前分类
  useEffect(() => {
    const m = mapRef.current
    const walker = walkerRef.current
    if (!m || !walker || !ready) return
    const shown = data.features.filter(f => kinds.includes(f.properties.kind))
    const src = m.getSource(SOURCE_ID) as GeoJSONSource | undefined
    src?.setData({ ...data, features: shown })
    const city = cities.find(c => c.slug === activeCity)
    walker.setPlaces(
      shown
        .filter(f => !city || inBounds(f.geometry.coordinates as LngLat, city.bounds))
        .map(f => ({ slug: f.properties.slug, coords: f.geometry.coordinates as LngLat })),
    )
  }, [kinds, data, cities, activeCity, ready])

  // 6) 语言切换:地标名跟随(店名是品牌名,不翻译)
  useEffect(() => {
    const m = mapRef.current
    if (!m || !ready || !m.getLayer(LAYER_LANDMARK)) return
    m.setLayoutProperty(LAYER_LANDMARK, 'text-field', landmarkTextField(lang))
  }, [lang, ready])

  // 外层负责铺满;maplibre-gl.css 里 `.maplibregl-map{position:relative}`(非 layer)会压过 Tailwind 的 `absolute`,
  // 所以容器本身用 h-full w-full,不依赖它的 position
  return (
    <div className="absolute inset-0">
      <div ref={containerRef} className="h-full w-full" />
    </div>
  )
}
```

- [ ] **Step 2: `MapPageClient.tsx` 传 `lang` 与 `landmarks`**

- import 区加一行:`import type { LandmarkCollection } from '@/lib/map/landmarks'`
- 组件签名 `export default function MapPageClient({ data, cities }: { data: PlaceCollection; cities: City[] })` 改为
  `export default function MapPageClient({ data, landmarks, cities }: { data: PlaceCollection; landmarks: LandmarkCollection; cities: City[] })`
- `<MapView` 的 props 里 `data={data}` 之后加两行:

```tsx
          landmarks={landmarks}
          lang={lang}
```

- [ ] **Step 3: `src/app/map/page.tsx` 读地标**

整个替换为:

```tsx
import type { Metadata } from 'next'
import { getAllPlaces } from '@/lib/places'
import { placesToGeoJSON } from '@/lib/map/placesToGeoJSON'
import { getAllLandmarks } from '@/lib/map/landmarks'
import { CITIES } from '@/lib/map/cities'
import MapPageClient from '@/components/map/MapPageClient'

export const metadata: Metadata = {
  title: '菠萝子地图 · 菠萝子指南',
  description: 'Every place on the guide, on one hand-painted map.',
}

export default function MapPage() {
  // 构建时执行:getAllPlaces / getAllLandmarks 都做 zod 校验,数据不合法直接让构建失败
  const data = placesToGeoJSON(getAllPlaces())
  const landmarks = getAllLandmarks()
  return <MapPageClient data={data} landmarks={landmarks} cities={CITIES} />
}
```

- [ ] **Step 4: 类型检查 + lint + 测试 + 构建**

Run: `npx tsc --noEmit && npm run lint && npm run test && npm run build`
Expected: 全绿(测试应为 106 + 10 + 8 + 5 = 129 个)。常见类型错误:
- `['>=', ['zoom'], ['get', 'minzoom']]` 作 filter 报错 → `import type { FilterSpecification } from 'maplibre-gl'`,断言 `as FilterSpecification`。
- `setLayoutProperty` 的 value 类型 → 断言 `as ExpressionSpecification`(`import type { ExpressionSpecification } from 'maplibre-gl'`)。
- `createImageBitmap` 类型缺失 → tsconfig `lib` 含 `dom`,应已存在;若报错确认没人改过 tsconfig。

- [ ] **Step 5: Commit**

```bash
git add src/components/map/MapView.tsx src/components/map/MapPageClient.tsx src/app/map/page.tsx
git commit -m "MapView: preload manifest assets at style.load, landmark + storefront layers, painted walker, lang-aware landmark labels"
```

---

### Task 8: 浏览器验收(用合成资产,然后验证回退)

Claude 桌面端用 `preview_start` 的 `gourmet-dev` 起 dev,页面 `http://localhost:3000/gourmet/map`。逐项核对并在报告里逐条打勾。

- [ ] **Step 1: 装上合成资产**

Run: `npm run map:assets -- --synthetic`
刷新页面。

- [ ] **Step 2: 控制台**

Expected:**没有** `Image "…" could not be loaded` 之类的缺图警告(说明 `style.load` 注册早于首帧),没有红色报错;网络里 `manifest.json`、4 张贴图、14 个图标、`pineapple-painted.png` 全部 200。

- [ ] **Step 3: 城市级 z12–13(点「墨尔本」)**

Expected:公园 / 绿地铺着 `pat-grass` 的斑点纹理,林地(Yarra 沿岸、Royal Park)铺 `pat-wood` 的圆树冠,水面(Yarra、海湾)铺 `pat-water` 波纹,St Kilda 海滩带 `pat-sand`;看得到 Flinders Street Station 与 MCG 的地标图标(minzoom 12)+ 英文名;**图案没有明显的网格感 / 接缝**。截图 `docs/superpowers/screenshots/2026-11-14-map-phase3-z12.png`。

- [ ] **Step 4: 街区级 z15**

搜索 Flinders 附近(或拖到 CBD 南缘)并把缩放调到 15:六个地标都出现(Luna Park 要往南拖),图标约 64px 高、名字在下方;点右上「中文」→ 地标名变成中文(「弗林德斯街车站」等);**若中文显示为空白 / 方块**,说明 OpenFreeMap 的字形不含 CJK → 把 `landmarkTextField` 改为恒用 `name_en`,删掉 effect 6,并在报告里写明「地图上的地标名仅英文」。截图 `…-phase3-z15.png`。

- [ ] **Step 5: 街道级 z17(点 Zareh 标签让小人走过去)**

Expected:Zareh 点上出现店面小插画(`shop-zareh`),白色标签浮在它上方,徽章是 PNG 版(字母 F 的圆章)而非 emoji;小人是手绘雪碧图(合成的大头菠萝),站在店门口**右下方**,标签完整可见;走路 / 庆祝帧正常切换。截图 `…-phase3-z17.png`。

- [ ] **Step 6: 其他回归**

总览聚合、切城市、卡片、方向键、减少动态、分类筛选(Phase 1 / 2 的行为)全部不变;地标标签在与店名冲突时让位(店名永远显示)。

- [ ] **Step 7: 回退验证(空收件箱)**

Run: `npm run map:assets`(收件箱为空 → 产物清空、manifest 空、样式回到纯色),刷新。
Expected:控制台无报错也无缺图警告;贴图回到纯色;徽章回到画布 emoji 版;六个地标用通用五角星占位图标,名字照常;Zareh 没有店面小插画;小人回到像素版。

- [ ] **Step 8: Commit 截图**

```bash
git add docs/superpowers/screenshots
git commit -m "Add Phase 3 screenshots (synthetic assets at z12 / z15 / z17)"
```

若 Step 2–7 发现问题并改了代码,先单独提交修复(`Fix asset pipeline issues found in dev acceptance: …`),再提交截图。

---

### Task 9: 真实资产(如有)、构建验收、文档、收尾

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: 按收件箱的真实情况决定提交什么**

```bash
ls -la ../map/inbox/melbourne/ | grep -v "^d\|_preview\|_synthetic"
npm run map:assets
git status --short public/
```

- 收件箱**有**业主放的真资产 → 上一条命令已把它们规整出来。用 Read 工具逐张看 `../map/inbox/melbourne/_preview/*-2x2.png`(接缝)与 `public/map-assets/icons/*.png`(透明底是否干净、缩到 48px 还认得出),刷新 dev 再过一遍 Task 8 Step 3–5 并重拍三张截图(覆盖同名文件);有接缝或抠图不干净的,**不要自己修图**,在报告里点名哪几张要重做。然后 `git add public/map-assets public/sprites public/maps/painted.json docs/superpowers/screenshots && git commit -m "Add Melbourne pilot art assets"`。
- 收件箱**空** → 产物已清空,`git status` 里 `public/` 应只有 manifest 空内容(无变化);什么都不用提交。

- [ ] **Step 2: 用 CI 同样的环境变量构建并本地静态服务验证**

```bash
NEXT_PUBLIC_BASE_PATH=/gourmet npm run build && ls out/map-assets/manifest.json out/map.html
SERVE_DIR=$(mktemp -d) && ln -s "$PWD/out" "$SERVE_DIR/gourmet" && (cd "$SERVE_DIR" && python3 -m http.server 3999)
```

打开 `http://localhost:3999/gourmet/map.html`:`/gourmet/map-assets/manifest.json` 200,地图与地标正常。完成后停掉服务。

- [ ] **Step 3: CLAUDE.md 的 Map 一节末尾追加**

```markdown
- **Art assets (Phase 3):** drop PNGs into `/Users/tantianshu/Documents/code/gourmet/map/inbox/melbourne/` (names: `pat-{wood,grass,water,sand}`, `badge-<kind>`, `lm-<slug>`, `shop-<place-slug>`, `pp-{idle,walk-a,walk-b,cheer}` — spec §7.1) and run `npm run map:assets`. It mirrors the inbox into `public/map-assets/{patterns,icons}/` (sharp-resized: 512 / 96 / 256 / 192 px), builds `public/sprites/pineapple-painted.png` when all four poses exist, writes `public/map-assets/manifest.json`, drops `_preview/*-2x2.png` seam checks next to the inbox, then re-runs `npm run maps` so `fill-pattern` appears only for existing tiles. Commit `public/map-assets`, `public/sprites`, `public/maps/painted.json` together. `npm run map:assets -- --synthetic` runs the pipeline on generated placeholders (never commit its output). Everything missing from the manifest falls back: flat colours, canvas badges, `lm-generic` star for landmarks, pixel walker.
- Runtime: `MapView` fetches the manifest, preloads every listed image as an `ImageBitmap` **before** creating the map and registers them in `style.load` (before the first frame), so there are no "image missing" flashes. Sizes and `pixelRatio` are paired: `scripts/lib/map-assets.mjs` `SIZES` ↔ `src/lib/map/assets.ts` `PIXEL_RATIO`.
- Landmarks: `src/data/map/landmarks/<city>.json` (`name_zh`, `name_en`, `coords [lng, lat]`, `icon: lm-<slug>`, `minzoom`), loaded by `src/lib/map/landmarks.ts` (zod; a landmark outside its city's bounds fails the test). Layer `landmark` sits below the place layers so place labels win collisions; the label language follows the site toggle.
- Storefronts: a `shop-<slug>.png` in the inbox adds that place to the `place-storefront` layer (z ≥ 15.5). The walker stands 22 px right / 6 px below the point (`WALKER_OFFSET`) so labels and storefronts stay visible.
```

同一文件 `## Status` 里那行「地图(2026-11)…」改成:

```
- 地图(2026-11):总策划案 `docs/superpowers/specs/2026-11-13-pineapple-map-design.md`;Phase 0(数据)、Phase 1(`/map`)、Phase 2(小人)、Phase 3(资产管线·墨尔本试点)已完成,见下方「Map」一节;美术资产由业主生成后 `npm run map:assets` 接入;Phase 4(Takeout 导入景点)待做。
```

- [ ] **Step 4: 三件套**

Run: `npm run lint && npm run test && npm run build`
Expected: 全绿。

- [ ] **Step 5: Commit**

```bash
git add CLAUDE.md
git commit -m "Docs: art asset pipeline, landmarks and storefronts in CLAUDE.md"
```

---

### Task 10: 配色候选(只出截图,不改提交)

贴图进来后原来的纯色调色板(`scripts/build-map-style.mjs` 的 `palette`)未必和谐。这一步只产出给业主挑的候选,**不提交任何调色板改动**。

- [ ] **Step 1: 装上合成资产(或真资产)**

Run: `npm run map:assets -- --synthetic`(有真资产则 `npm run map:assets`)。

- [ ] **Step 2: 候选 A = 当前调色板**

dev 下墨尔本 z15(CBD 南缘,能同时看到河、公园、道路、建筑)截图 `docs/superpowers/screenshots/2026-11-14-map-phase3-palette-A.png`。

- [ ] **Step 3: 候选 B = 道路与建筑更暖、描边更淡**

临时把 `palette` 改为:`road: '#F5EBCB'`、`roadCasing: '#C9B98A'`、`building: '#D2BE9C'`、`building3d: '#CDB892'`、`residential: '#DDD492'`、`background: '#D9D37E'`,`npm run maps`,刷新,同一视角截图 `…-palette-B.png`。

- [ ] **Step 4: 还原**

```bash
git checkout -- scripts/build-map-style.mjs
npm run map:assets          # 收件箱为空时这会把合成产物清掉并重建纯色样式;有真资产则重建真资产版
git status --short
```

Expected:`scripts/build-map-style.mjs` 与 `public/maps/painted.json` 无改动(真资产情况下 painted.json 应与 Task 9 提交的一致)。

- [ ] **Step 5: Commit 两张候选截图**

```bash
git add docs/superpowers/screenshots/2026-11-14-map-phase3-palette-A.png docs/superpowers/screenshots/2026-11-14-map-phase3-palette-B.png
git commit -m "Add palette candidate screenshots for the owner to choose"
```

- [ ] **Step 6: 给业主的报告(不要 push、不要合并)**

报告包含:分支名 `feat/map-phase3`;收件箱当时的状态(空 / 有哪些真资产,哪几张需要重做);Task 8 七项逐条打勾;三张阶段截图 + 两张配色候选;CJK 地标名是否可用;与计划的偏离及原因;一句「等你看过截图、选了配色,再合并到 main 并 push」。

---

## 验收清单(对照设计文档 §8 Phase 3)

- [ ] `npm run map:assets -- --synthetic` 一条命令跑通整条管线;空收件箱时产物清空、全部回退、无控制台报错
- [ ] 贴图经 `fill-pattern` 铺在 wood / grass / park / water / sand 上,首帧无缺图闪烁,2×2 预览无接缝
- [ ] 六个墨尔本地标按 minzoom 出现,名字跟随语言(或已记录 CJK 回退),店名在碰撞时优先
- [ ] 徽章 / 店面 / 手绘小人:有资产用资产,没有回退占位
- [ ] 小人不再挡住店名标签
- [ ] z12 / z15 / z17 三张截图 + 两张配色候选已入库
- [ ] `npm run lint && npm run test && npm run build` 全绿(129 个测试);报告已交,未 push
