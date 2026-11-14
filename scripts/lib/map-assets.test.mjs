import { describe, it, expect } from 'vitest'
import { classifyAsset, buildManifest, spriteFrames, pixelRatioFor, FRAME, POSES, SIZES } from './map-assets.mjs'

describe('classifyAsset', () => {
  it('maps known prefixes to kinds, ids and target sizes', () => {
    expect(classifyAsset('pat-wood.png')).toEqual({ kind: 'pattern', id: 'pat-wood', size: 512 })
    expect(classifyAsset('badge-food.png')).toEqual({ kind: 'badge', id: 'badge-food', size: 96 })
    expect(classifyAsset('lm-flinders.png')).toEqual({ kind: 'landmark', id: 'lm-flinders', size: 256 })
    expect(classifyAsset('shop-zareh.png')).toEqual({ kind: 'storefront', id: 'shop-zareh', size: 192 })
    expect(classifyAsset('pp-walk-a.png')).toEqual({ kind: 'pose', id: 'walk-a', size: null })
  })
  it('is case-insensitive on the filename', () => {
    expect(classifyAsset('BADGE-Food.PNG')?.id).toBe('badge-food')
  })
  it('rejects unknown prefixes, unknown poses and non-png files', () => {
    expect(classifyAsset('pp-dance.png')).toBeNull()
    expect(classifyAsset('tree.png')).toBeNull()
    expect(classifyAsset('pat-wood.jpg')).toBeNull()
    expect(classifyAsset('README.md')).toBeNull()
    expect(classifyAsset('.DS_Store')).toBeNull()
  })
})

describe('buildManifest', () => {
  const a = (name) => classifyAsset(name)
  it('sorts ids and separates patterns from icons', () => {
    const m = buildManifest([a('lm-mcg.png'), a('pat-water.png'), a('badge-bar.png'), a('pat-grass.png'), a('shop-zareh.png')])
    expect(m).toEqual({ patterns: ['pat-grass', 'pat-water'], icons: ['badge-bar', 'lm-mcg', 'shop-zareh'], walker: null })
  })
  it('enables the painted walker only when all four poses are present', () => {
    const three = POSES.slice(0, 3).map(p => a(`pp-${p}.png`))
    expect(buildManifest(three).walker).toBeNull()
    const four = POSES.map(p => a(`pp-${p}.png`))
    expect(buildManifest(four).walker).toBe('pineapple-painted')
  })
  it('returns an empty manifest for an empty inbox', () => {
    expect(buildManifest([])).toEqual({ patterns: [], icons: [], walker: null })
  })
})

describe('spriteFrames', () => {
  it('lays out 8 frames in the pixel sheet grid (idle×2 / walk×4 / celebrate×2)', () => {
    const f = spriteFrames()
    expect(f).toHaveLength(8)
    expect(f.map(x => x.pose)).toEqual(['idle', 'idle', 'walk-a', 'walk-b', 'walk-a', 'walk-b', 'cheer', 'idle'])
    expect(f[2]).toMatchObject({ col: 0, row: 1, x: 0, y: FRAME.h })
    expect(f[7]).toMatchObject({ col: 1, row: 2, x: FRAME.w, y: FRAME.h * 2 })
  })
  it('nudges the second idle frame down 2px so idle "breathes"', () => {
    const f = spriteFrames()
    expect(f[0].dy).toBe(0)
    expect(f[1].dy).toBe(2)
    expect(f.filter(x => x.dy !== 0)).toHaveLength(1)
  })
  it('sheet dimensions match the pixel sprite (512×480)', () => {
    expect(FRAME.w * FRAME.cols).toBe(512)
    expect(FRAME.h * FRAME.rows).toBe(480)
  })
})

describe('pixelRatioFor / SIZES', () => {
  it('pairs each kind with a ratio that yields the intended on-screen size', () => {
    expect(SIZES.badge / pixelRatioFor('badge')).toBe(32)
    expect(SIZES.pattern / pixelRatioFor('pattern')).toBe(256)
    expect(SIZES.landmark / pixelRatioFor('landmark')).toBe(128)
    expect(SIZES.storefront / pixelRatioFor('storefront')).toBe(96)
    expect(pixelRatioFor('pose')).toBe(1)
  })
})
