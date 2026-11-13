import { describe, it, expect } from 'vitest'
import { CITIES, cityOf, inBounds } from './cities'
import { getAllPlaces } from '@/lib/places'

describe('inBounds', () => {
  it('is inclusive on the edges', () => {
    expect(inBounds([0, 0], [[0, 0], [1, 1]])).toBe(true)
    expect(inBounds([1, 1], [[0, 0], [1, 1]])).toBe(true)
    expect(inBounds([1.0001, 0.5], [[0, 0], [1, 1]])).toBe(false)
  })
})

describe('cityOf', () => {
  it('maps known places to their city', () => {
    expect(cityOf([144.984692, -37.797961])?.slug).toBe('melbourne') // Zareh
    expect(cityOf([141.205015, 40.615081])?.slug).toBe('towada') // Soma Pastry
    expect(cityOf([140.783782, -37.829651])?.slug).toBe('mount-gambier') // South Australian Hotel
  })
  it('returns null outside every city', () => {
    expect(cityOf([0, 0])).toBeNull()
  })
})

describe('cities.json sanity', () => {
  it('each city view.center lies inside its own bounds', () => {
    for (const c of CITIES) expect(inBounds(c.view.center, c.bounds), c.slug).toBe(true)
  })
  it('slugs are unique and url-safe', () => {
    const slugs = CITIES.map(c => c.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
    for (const s of slugs) expect(s).toMatch(/^[a-z0-9-]+$/)
  })
  it('every real place falls inside some city (add a city to cities.json if this fails)', () => {
    for (const p of getAllPlaces()) expect(cityOf(p.coords)?.slug, `${p.slug} ${p.coords}`).toBeTruthy()
  })
})
