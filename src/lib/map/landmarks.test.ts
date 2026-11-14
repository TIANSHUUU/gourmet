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
