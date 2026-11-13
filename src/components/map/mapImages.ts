import { KIND_COLORS, KIND_GLYPHS } from '@/lib/map/kinds'
import type { PlaceKind } from '@/lib/places'

const DPR = 2

type StretchOptions = {
  pixelRatio: number
  stretchX: [number, number][]
  stretchY: [number, number][]
  content: [number, number, number, number]
}

/**
 * 白色圆角标签底图(9-slice 可拉伸),底边中央带小三角指针。
 * 返回 map.addImage 需要的 ImageData 与拉伸选项;所有像素坐标都是图片实际像素(已乘 DPR)。
 * 逻辑尺寸:标签体 64×28,指针高 8 → 总高 36。
 */
export function makeLabelBackground(): { image: ImageData; options: StretchOptions } {
  const w = 64, body = 28, tip = 8, h = body + tip, r = 9
  const c = document.createElement('canvas')
  c.width = w * DPR
  c.height = h * DPR
  const ctx = c.getContext('2d')!
  ctx.scale(DPR, DPR)
  ctx.fillStyle = '#FFFFFF'
  ctx.strokeStyle = 'rgba(60, 55, 40, 0.28)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(r, 0.5)
  ctx.lineTo(w - r, 0.5)
  ctx.quadraticCurveTo(w - 0.5, 0.5, w - 0.5, r)
  ctx.lineTo(w - 0.5, body - r)
  ctx.quadraticCurveTo(w - 0.5, body - 0.5, w - r, body - 0.5)
  ctx.lineTo(w / 2 + tip * 0.75, body - 0.5)
  ctx.lineTo(w / 2, h - 0.5) // 指针尖
  ctx.lineTo(w / 2 - tip * 0.75, body - 0.5)
  ctx.lineTo(r, body - 0.5)
  ctx.quadraticCurveTo(0.5, body - 0.5, 0.5, body - r)
  ctx.lineTo(0.5, r)
  ctx.quadraticCurveTo(0.5, 0.5, r, 0.5)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
  return {
    image: ctx.getImageData(0, 0, w * DPR, h * DPR),
    options: {
      pixelRatio: DPR,
      // 可拉伸区:圆角之间的直边;content = 文字允许占据的区域(不含指针)
      stretchX: [[r * DPR, (w - r) * DPR]],
      stretchY: [[r * DPR, (body - r) * DPR]],
      content: [6 * DPR, 4 * DPR, (w - 6) * DPR, (body - 4) * DPR],
    },
  }
}

/** 分类徽章占位:实色圆 + emoji。Phase 3 换手绘 PNG 时只改这里(或改成 map.loadImage) */
export function makeBadge(kind: PlaceKind): { image: ImageData; options: { pixelRatio: number } } {
  const s = 32
  const c = document.createElement('canvas')
  c.width = s * DPR
  c.height = s * DPR
  const ctx = c.getContext('2d')!
  ctx.scale(DPR, DPR)
  ctx.fillStyle = KIND_COLORS[kind]
  ctx.beginPath()
  ctx.arc(s / 2, s / 2, s / 2 - 1.5, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = '#FFFFFF'
  ctx.lineWidth = 2
  ctx.stroke()
  ctx.font = '16px system-ui, "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(KIND_GLYPHS[kind], s / 2, s / 2 + 1)
  return { image: ctx.getImageData(0, 0, s * DPR, s * DPR), options: { pixelRatio: DPR } }
}
