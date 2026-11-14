import { describe, it, expect } from 'vitest'
import sharp from 'sharp'
import { BADGE_COLORS, BADGE_KINDS, badgeSvg, CREAM, SIZE } from './badges.mjs'
import { KIND_COLORS, KIND_ORDER } from '@/lib/map/kinds'

describe('badges', () => {
  it('kinds 与颜色和 src/lib/map/kinds.ts 完全一致', () => {
    expect(BADGE_KINDS).toEqual(KIND_ORDER)
    expect(BADGE_COLORS).toEqual(KIND_COLORS)
  })

  it('每种 kind 都渲染成 96×96、角落透明、圆心不透明的徽章', async () => {
    for (const kind of BADGE_KINDS) {
      const svg = badgeSvg(kind)
      expect(svg).toContain(`viewBox="0 0 ${SIZE} ${SIZE}"`)
      expect(svg).toContain(BADGE_COLORS[kind])
      expect(svg).toContain(CREAM)
      const { data, info } = await sharp(Buffer.from(svg)).resize(SIZE, SIZE).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
      expect([info.width, info.height]).toEqual([SIZE, SIZE])
      expect(data[3]).toBe(0)
      const mid = ((SIZE / 2) * SIZE + SIZE / 2) * 4
      expect(data[mid + 3]).toBe(255)
    }
  })

  it('不认识的 kind 直接报错', () => {
    expect(() => badgeSvg('spa')).toThrow(/unknown badge kind/)
  })
})
