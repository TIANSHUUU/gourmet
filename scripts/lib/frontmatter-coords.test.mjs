import { describe, it, expect } from 'vitest'
import { hasCoordsLine, insertCoords } from './frontmatter-coords.mjs'

const raw = `---
slug: zareh
name: "Zareh"
map_url: "https://www.google.com/maps/place/Zareh/@-37.797961,144.9821171,17z/data=!3m1!4b1!4m6!3m5!1s0x6ad6430013769889:0xb9f7e97f8baa3b6b!8m2!3d-37.797961!4d144.984692"
map_type: google
visited: "2026-08-26"
---

## en

Great ambiance.
`

describe('hasCoordsLine', () => {
  it('is false when frontmatter has no coords', () => {
    expect(hasCoordsLine(raw)).toBe(false)
  })
  it('is true once a coords line exists', () => {
    expect(hasCoordsLine(raw.replace('map_type: google', 'coords: [144.984692, -37.797961]\nmap_type: google'))).toBe(true)
  })
  it('ignores a "coords" that only appears in the body', () => {
    expect(hasCoordsLine(raw + '\ncoords: [1, 2]\n')).toBe(false)
  })
})

describe('insertCoords', () => {
  it('inserts a coords line right after map_url, leaving everything else byte-identical', () => {
    const out = insertCoords(raw, [144.984692, -37.797961])
    const lines = out.split('\n')
    const i = lines.findIndex(l => l.startsWith('map_url:'))
    expect(lines[i + 1]).toBe('coords: [144.984692, -37.797961]')
    expect(out.replace('coords: [144.984692, -37.797961]\n', '')).toBe(raw)
  })
  it('appends a trailing comment when a note is given', () => {
    const out = insertCoords(raw, [1, 2], 'coords from viewport (@), verify')
    expect(out).toContain('coords: [1, 2]   # coords from viewport (@), verify')
  })
  it('is a no-op when coords already exist', () => {
    const once = insertCoords(raw, [1, 2])
    expect(insertCoords(once, [3, 4])).toBe(once)
  })
  it('throws when there is no map_url line to anchor on', () => {
    expect(() => insertCoords('---\nslug: x\n---\nbody', [1, 2])).toThrow(/map_url/)
  })
})
