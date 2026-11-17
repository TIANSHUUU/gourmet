import { describe, it, expect } from 'vitest'
import { placesToGeoJSON, splitGallery } from './placesToGeoJSON'
import type { Place } from '@/lib/places'

const make = (over: Partial<Place>): Place => ({
  slug: 'x', name: 'X', suburb: 'S', city: 'C', kind: 'food',
  cuisine_en: 'Cuisine', cuisine_zh: '菜系', map_url: 'https://maps.google.com/?q=1', map_type: 'google',
  visited: '2026-01', images: ['1.jpg', '2.jpg'], coords: [144.9, -37.8], review_en: '', review_zh: '',
  ...over,
})

describe('placesToGeoJSON', () => {
  it('turns each place into a Point feature with flat properties', () => {
    const fc = placesToGeoJSON([make({ slug: 'a', tagline_en: 'Hi', tagline_zh: '嗨' }), make({ slug: 'b', coords: [1, 2] })])
    expect(fc.type).toBe('FeatureCollection')
    expect(fc.features).toHaveLength(2)
    expect(fc.features[0].geometry).toEqual({ type: 'Point', coordinates: [144.9, -37.8] })
    expect(fc.features[0].properties.slug).toBe('a')
    expect(fc.features[0].properties.tagline_zh).toBe('嗨')
    expect(fc.features[1].geometry.coordinates).toEqual([1, 2])
  })
  it('uses the first image as cover and empty strings for missing taglines', () => {
    const [f] = placesToGeoJSON([make({})]).features
    expect(f.properties.cover).toBe('1.jpg')
    expect(f.properties.tagline_en).toBe('')
    expect(placesToGeoJSON([make({ images: [] })]).features[0].properties.cover).toBe('')
  })
  it('keeps no nested objects in properties (MapLibre flattens them otherwise)', () => {
    const [f] = placesToGeoJSON([make({})]).features
    for (const v of Object.values(f.properties)) expect(typeof v).toBe('string')
  })
  it('carries the full review and the extra photos only for map-only spots', () => {
    const [spot, food] = placesToGeoJSON([
      make({ slug: 's', kind: 'sight', images: ['1.jpg', '2.jpg', '3.jpg'], review_en: 'Hi.', review_zh: '嗨。' }),
      make({ slug: 'f', kind: 'food', review_en: 'Yum.', review_zh: '好吃。' }),
    ]).features
    expect(spot.properties.review_en).toBe('Hi.')
    expect(spot.properties.review_zh).toBe('嗨。')
    expect(spot.properties.gallery).toBe('2.jpg|3.jpg')
    expect(food.properties.review_en).toBe('')
    expect(food.properties.review_zh).toBe('')
    expect(food.properties.gallery).toBe('')
  })
  it('splitGallery turns the joined string back into file names', () => {
    expect(splitGallery('2.jpg|3.jpg')).toEqual(['2.jpg', '3.jpg'])
    expect(splitGallery('')).toEqual([])
  })
})
