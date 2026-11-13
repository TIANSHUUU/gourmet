import { describe, it, expect } from 'vitest'
import { KIND_ORDER, KIND_COLORS, KIND_GLYPHS } from './kinds'
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
})
