import { describe, it, expect } from 'vitest'
import { sortWines, type WineEntry } from './wines'

const make = (slug: string, date: string): WineEntry => ({
  slug,
  date,
  wine_name: { zh: slug, en: slug },
  winery: { zh: '', en: '' },
})

describe('sortWines', () => {
  it('orders newest date first, slug as tiebreak', () => {
    const out = sortWines([
      make('a', '2026-03-01'),
      make('b', '2026-06-01'),
      make('c', '2026-06-01'),
    ]).map(w => w.slug)
    expect(out).toEqual(['b', 'c', 'a'])
  })
})
