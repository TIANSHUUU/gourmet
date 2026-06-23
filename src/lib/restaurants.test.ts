import { describe, it, expect } from 'vitest'
import { sortRestaurants, type Restaurant } from './restaurants'

const make = (slug: string, visited: string): Restaurant => ({
  slug, name: slug, suburb: '', city: '', category: 'food',
  cuisine_en: '', cuisine_zh: '', map_url: '', map_type: 'google',
  visited, images: [], review_en: '', review_zh: '',
})

describe('sortRestaurants', () => {
  it('orders newest visited first, slug as tiebreak', () => {
    const out = sortRestaurants([
      make('a', '2026-03'),
      make('b', '2026-06'),
      make('c', '2026-06'),
    ]).map(r => r.slug)
    expect(out).toEqual(['b', 'c', 'a'])
  })
})
