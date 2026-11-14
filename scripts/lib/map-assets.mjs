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
