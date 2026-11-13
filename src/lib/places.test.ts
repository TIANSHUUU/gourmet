import { describe, it, expect } from 'vitest'
import { parsePlaceFile, getAllPlaces, RESTAURANT_KINDS, SPOT_KINDS } from './places'

const base = `---
slug: test-place
name: "Test Place"
suburb: "Fitzroy"
city: "Melbourne"
category: food
cuisine_en: "Test"
cuisine_zh: "测试"
map_url: "https://www.google.com/maps/place/x"
coords: [144.978, -37.798]
map_type: google
visited: "2026-01"
images:
  - "1.jpg"
---

## en

Hello.

## zh

你好。
`

describe('parsePlaceFile', () => {
  it('parses a valid restaurant file into a Place with kind + coords + reviews', () => {
    const p = parsePlaceFile(base, 'restaurants/test.md', RESTAURANT_KINDS)
    expect(p.kind).toBe('food')
    expect(p.coords).toEqual([144.978, -37.798])
    expect(p.review_en).toBe('Hello.')
    expect(p.review_zh).toBe('你好。')
    expect(p.images).toEqual(['1.jpg'])
  })

  it('names the file when coords are missing', () => {
    const raw = base.replace(/^coords:.*\n/m, '')
    expect(() => parsePlaceFile(raw, 'restaurants/test.md', RESTAURANT_KINDS)).toThrow(/restaurants\/test\.md.*coords/)
  })

  it('rejects coords written as [lat, lng] (second number out of latitude range)', () => {
    const raw = base.replace(/^coords:.*$/m, 'coords: [-37.798, 144.978]')
    expect(() => parsePlaceFile(raw, 'restaurants/test.md', RESTAURANT_KINDS)).toThrow(/coords/)
  })

  it('rejects a spot category inside restaurants/', () => {
    const raw = base.replace('category: food', 'category: sight')
    expect(() => parsePlaceFile(raw, 'restaurants/test.md', RESTAURANT_KINDS)).toThrow(/不允许/)
  })

  it('accepts a spot category inside spots/', () => {
    const raw = base.replace('category: food', 'category: sight')
    expect(parsePlaceFile(raw, 'spots/test.md', SPOT_KINDS).kind).toBe('sight')
  })

  it('defaults map_type to google when omitted', () => {
    const raw = base.replace(/^map_type:.*\n/m, '')
    expect(parsePlaceFile(raw, 'restaurants/test.md', RESTAURANT_KINDS).map_type).toBe('google')
  })
})

describe('getAllPlaces (real data under src/data)', () => {
  it('loads every restaurant, each with coords, sorted newest first', () => {
    const all = getAllPlaces()
    expect(all.length).toBeGreaterThanOrEqual(6)
    for (const p of all) expect(p.coords, p.slug).toHaveLength(2)
    const visited = all.map(p => p.visited)
    expect(visited).toEqual([...visited].sort().reverse())
  })
})
