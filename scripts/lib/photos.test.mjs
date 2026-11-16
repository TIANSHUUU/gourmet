import { describe, it, expect } from 'vitest'
import { planPhotos } from './photos.mjs'

describe('planPhotos', () => {
  it('keeps jpg/jpeg/png, ignores the rest, and numbers targets from 1', () => {
    const p = planPhotos(['b.JPG', 'a.png', 'notes.md', '.DS_Store', 'c.jpeg'])
    expect(p.files).toEqual(['a.png', 'b.JPG', 'c.jpeg'])
    expect(p.targets).toEqual(['1.jpg', '2.jpg', '3.jpg'])
    expect(p.skipped).toEqual([])
  })
  it('sorts naturally so 10 comes after 2', () => {
    expect(planPhotos(['IMG_10.jpg', 'IMG_2.jpg', 'IMG_1.jpg']).files).toEqual(['IMG_1.jpg', 'IMG_2.jpg', 'IMG_10.jpg'])
  })
  it('reports HEIC files as skipped instead of silently dropping them', () => {
    const p = planPhotos(['x.heic', 'y.jpg'])
    expect(p.files).toEqual(['y.jpg'])
    expect(p.skipped).toEqual(['x.heic'])
  })
  it('accepts webp (photos downloaded from the Google Maps review page)', () => {
    const p = planPhotos(['2.webp', '1.WEBP', 'cover.jpg'])
    expect(p.files).toEqual(['1.WEBP', '2.webp', 'cover.jpg'])
    expect(p.targets).toEqual(['1.jpg', '2.jpg', '3.jpg'])
  })
})
