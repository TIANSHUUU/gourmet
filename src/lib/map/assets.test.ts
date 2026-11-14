import { describe, it, expect } from 'vitest'
import { EMPTY_MANIFEST, hasIcon, imageSpecs, parseManifest, storefrontSlugs, walkerSpriteUrl } from './assets'

const full = { patterns: ['pat-wood'], icons: ['badge-food', 'lm-mcg', 'shop-zareh'], walker: 'pineapple-painted' as const }

describe('parseManifest', () => {
  it('accepts a valid manifest', () => {
    expect(parseManifest(full)).toEqual(full)
  })
  it('falls back to the empty manifest on garbage, null or wrong shapes', () => {
    expect(parseManifest(null)).toEqual(EMPTY_MANIFEST)
    expect(parseManifest('nope')).toEqual(EMPTY_MANIFEST)
    expect(parseManifest({ patterns: 'pat-wood' })).toEqual(EMPTY_MANIFEST)
    expect(parseManifest({ walker: 'something-else' })).toEqual(EMPTY_MANIFEST)
  })
  it('fills missing fields with defaults', () => {
    expect(parseManifest({ icons: ['badge-bar'] })).toEqual({ patterns: [], icons: ['badge-bar'], walker: null })
  })
})

describe('imageSpecs', () => {
  it('builds urls under basePath and pairs each id with its pixelRatio', () => {
    expect(imageSpecs(full, '/gourmet')).toEqual([
      { id: 'pat-wood', url: '/gourmet/map-assets/patterns/pat-wood.png', pixelRatio: 2 },
      { id: 'badge-food', url: '/gourmet/map-assets/icons/badge-food.png', pixelRatio: 3 },
      { id: 'lm-mcg', url: '/gourmet/map-assets/icons/lm-mcg.png', pixelRatio: 2 },
      { id: 'shop-zareh', url: '/gourmet/map-assets/icons/shop-zareh.png', pixelRatio: 2 },
    ])
  })
  it('is empty for the empty manifest', () => {
    expect(imageSpecs(EMPTY_MANIFEST, '')).toEqual([])
  })
})

describe('walkerSpriteUrl / hasIcon / storefrontSlugs', () => {
  it('picks the painted sheet only when the manifest has it', () => {
    expect(walkerSpriteUrl(full, '/gourmet')).toBe('/gourmet/sprites/pineapple-painted.png')
    expect(walkerSpriteUrl(EMPTY_MANIFEST, '')).toBe('/sprites/pineapple-classic.png')
  })
  it('hasIcon checks the icons list', () => {
    expect(hasIcon(full, 'badge-food')).toBe(true)
    expect(hasIcon(full, 'badge-bar')).toBe(false)
  })
  it('storefrontSlugs strips the shop- prefix', () => {
    expect(storefrontSlugs(full)).toEqual(['zareh'])
    expect(storefrontSlugs(EMPTY_MANIFEST)).toEqual([])
  })
})
