import { describe, it, expect } from 'vitest'
import { COUNTRIES, coordsInCountry, countriesOf, flagEmoji, starPoints } from './countries'
import { CITIES } from './cities'
import type { LngLat } from '@/lib/places'

describe('countries', () => {
  it('flagEmoji builds the regional-indicator pair', () => {
    expect(flagEmoji('AU')).toBe('🇦🇺')
    expect(flagEmoji('jp')).toBe('🇯🇵')
  })
  it('countriesOf lists each country once, in cities.json order', () => {
    expect(countriesOf(CITIES)).toEqual(['AU', 'JP'])
  })
  it('every city names a country that has zh/en names (add it to COUNTRIES if this fails)', () => {
    for (const c of CITIES) expect(COUNTRIES[c.country], `${c.slug} → ${c.country}`).toBeDefined()
  })
  it("coordsInCountry keeps only points inside that country's cities", () => {
    const zareh: LngLat = [144.984692, -37.797961]
    const soma: LngLat = [141.205015, 40.615081]
    expect(coordsInCountry([zareh, soma], CITIES, 'AU')).toEqual([zareh])
    expect(coordsInCountry([zareh, soma], CITIES, 'JP')).toEqual([soma])
  })
  it('starPoints gives 2n points with the first tip straight up', () => {
    const pts = starPoints(100, 100, 50, 7, 0.44).split(' ')
    expect(pts).toHaveLength(14)
    expect(pts[0]).toBe('100.0,50.0')
  })
})
