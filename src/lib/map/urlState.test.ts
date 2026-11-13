import { describe, it, expect } from 'vitest'
import { parseMapUrl, serializeMapUrl } from './urlState'

describe('parseMapUrl', () => {
  it('reads city and place', () => {
    expect(parseMapUrl('?city=melbourne&place=zareh')).toEqual({ city: 'melbourne', place: 'zareh' })
  })
  it('accepts a search string without the leading ?', () => {
    expect(parseMapUrl('city=towada')).toEqual({ city: 'towada', place: null })
  })
  it('drops values that are not url-safe slugs', () => {
    expect(parseMapUrl('?city=<script>&place=Zareh')).toEqual({ city: null, place: null })
  })
  it('returns nulls for an empty string', () => {
    expect(parseMapUrl('')).toEqual({ city: null, place: null })
  })
})

describe('serializeMapUrl', () => {
  it('builds a query string, omitting nulls', () => {
    expect(serializeMapUrl({ city: 'melbourne', place: null })).toBe('?city=melbourne')
    expect(serializeMapUrl({ city: 'melbourne', place: 'zareh' })).toBe('?city=melbourne&place=zareh')
  })
  it('returns an empty string when nothing is set', () => {
    expect(serializeMapUrl({ city: null, place: null })).toBe('')
  })
  it('round-trips', () => {
    const s = { city: 'mount-gambier', place: 'south-aus-hotel' }
    expect(parseMapUrl(serializeMapUrl(s))).toEqual(s)
  })
})
