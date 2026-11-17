import { describe, it, expect } from 'vitest'
import { KIND_ORDER, KIND_COLORS, KIND_GLYPHS, isSpotKind } from './kinds'
import { RESTAURANT_KINDS, SPOT_KINDS } from '@/lib/places'

describe('kinds', () => {
  it('orders every kind exactly once', () => {
    expect([...KIND_ORDER].sort()).toEqual([...RESTAURANT_KINDS, ...SPOT_KINDS].sort())
  })
  it('has a hex colour and a glyph for each kind', () => {
    for (const k of KIND_ORDER) {
      expect(KIND_COLORS[k]).toMatch(/^#[0-9A-F]{6}$/i)
      expect(KIND_GLYPHS[k].length).toBeGreaterThan(0)
    }
  })
  it('isSpotKind is true exactly for the spots/ kinds (map-only, no detail page)', () => {
    for (const k of SPOT_KINDS) expect(isSpotKind(k), k).toBe(true)
    for (const k of RESTAURANT_KINDS) expect(isSpotKind(k), k).toBe(false)
  })
})
