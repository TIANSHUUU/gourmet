import { describe, it, expect } from 'vitest'
import {
  detectFormat, normalizeReview, parseTakeout, slugify, uniqueSlug, guessSuburb,
  placeKey, isAlreadyPublished, draftMarkdown, indexMarkdown,
} from './takeout.mjs'

// 旧格式:Maps (your places)/Reviews.json(GeoJSON,属性名带空格)
const legacy = {
  type: 'FeatureCollection',
  features: [{
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [144.984692, -37.797961] },
    properties: {
      'Google Maps URL': 'https://www.google.com/maps/place/Zareh/data=!4m2!3m1!1s0x6ad6430013769889:0xb9f7e97f8baa3b6b',
      Location: {
        Address: '368 Smith St, Collingwood VIC 3066, Australia',
        'Business Name': 'Zareh',
        'Country Code': 'AU',
        'Geo Coordinates': { Latitude: '-37.797961', Longitude: '144.984692' },
      },
      Published: '2026-08-26T09:00:00Z',
      'Star Rating': 5,
      'Review Comments': 'Great ambiance and amazing food.',
    },
  }],
}

// 新格式:蛇形属性名,坐标可能缺失,星级可能是单词
const modern = {
  type: 'FeatureCollection',
  features: [{
    type: 'Feature',
    geometry: null,
    properties: {
      date: '2025-02-20T03:00:00Z',
      five_star_rating_published: 'FIVE',
      google_maps_url: 'https://www.google.com/maps/place/?q=place_id:ChIJxxxx',
      location: { address: '〒034-0011 青森県十和田市稲生町', country_code: 'JP', name: '相馬菓子舗' },
      review_text_published: '  Best apple pie on the trip.  ',
    },
  }],
}

describe('detectFormat', () => {
  it('tells the two known generations apart', () => {
    expect(detectFormat(legacy)).toBe('legacy')
    expect(detectFormat(modern)).toBe('modern')
  })
  it('returns empty for no features and null for an unknown shape', () => {
    expect(detectFormat({ type: 'FeatureCollection', features: [] })).toBe('empty')
    expect(detectFormat({ features: [{ properties: { foo: 1, bar: 2 } }] })).toBeNull()
    expect(detectFormat({})).toBeNull()
  })
})

describe('normalizeReview', () => {
  it('maps the legacy fields', () => {
    expect(normalizeReview(legacy.features[0], 'legacy')).toEqual({
      name: 'Zareh',
      address: '368 Smith St, Collingwood VIC 3066, Australia',
      coords: [144.984692, -37.797961],
      url: legacy.features[0].properties['Google Maps URL'],
      rating: 5,
      text: 'Great ambiance and amazing food.',
      date: '2026-08-26',
    })
  })
  it('maps the modern fields, tolerating a missing geometry and a worded rating', () => {
    expect(normalizeReview(modern.features[0], 'modern')).toEqual({
      name: '相馬菓子舗',
      address: '〒034-0011 青森県十和田市稲生町',
      coords: null,
      url: 'https://www.google.com/maps/place/?q=place_id:ChIJxxxx',
      rating: 5,
      text: 'Best apple pie on the trip.',
      date: '2025-02-20',
    })
  })
  it('treats a [0, 0] geometry as missing', () => {
    const f = { ...modern.features[0], geometry: { type: 'Point', coordinates: [0, 0] } }
    expect(normalizeReview(f, 'modern').coords).toBeNull()
  })
})

describe('parseTakeout', () => {
  it('returns the format and normalized reviews', () => {
    const r = parseTakeout(legacy)
    expect(r.format).toBe('legacy')
    expect(r.reviews).toHaveLength(1)
  })
  it('throws listing the first feature keys when the format is unknown', () => {
    expect(() => parseTakeout({ features: [{ properties: { foo: 1, bar: 2 } }] })).toThrow(/foo, bar/)
  })
})

describe('slugify / uniqueSlug', () => {
  it('makes url-safe ascii slugs and empties non-latin names', () => {
    expect(slugify('Death & Co Melbourne')).toBe('death-and-co-melbourne')
    expect(slugify("Mary's Café")).toBe('mary-s-cafe')
    expect(slugify('相馬菓子舗')).toBe('')
  })
  it('falls back to place-N and de-duplicates', () => {
    const taken = new Set(['zareh'])
    expect(uniqueSlug('zareh', taken)).toBe('zareh-2')
    expect(uniqueSlug('', taken)).toBe('place')
    expect(uniqueSlug('', taken)).toBe('place-2')
  })
})

describe('guessSuburb', () => {
  it('reads the suburb out of an Australian address and gives up elsewhere', () => {
    expect(guessSuburb('368 Smith St, Collingwood VIC 3066, Australia')).toBe('Collingwood')
    expect(guessSuburb('33 Commercial St W, Mount Gambier SA 5290, Australia')).toBe('Mount Gambier')
    expect(guessSuburb('〒034-0011 青森県十和田市稲生町')).toBe('')
  })
})

describe('placeKey / isAlreadyPublished', () => {
  const existing = [
    { name: 'Zareh', map_url: 'https://www.google.com/maps/place/Zareh/@-37.79,144.98,17z/data=!3m1!4b1!4m6!3m5!1s0x6ad6430013769889:0xb9f7e97f8baa3b6b!8m2!3d-37.797961!4d144.984692' },
    { name: "Mary's", map_url: 'https://www.google.com/maps/place/x?cid=777' },
  ]
  it('extracts the ftid or cid from a Google Maps url', () => {
    expect(placeKey(existing[0].map_url)).toBe('0x6ad6430013769889:0xb9f7e97f8baa3b6b')
    expect(placeKey(existing[1].map_url)).toBe('777')
    expect(placeKey('https://www.google.com/maps/place/?q=place_id:ChIJ')).toBe('')
  })
  it('matches by place key first, then by case-insensitive name', () => {
    const r = normalizeReview(legacy.features[0], 'legacy')
    expect(isAlreadyPublished(r, existing)).toBe(true)
    expect(isAlreadyPublished({ ...r, url: '', name: "MARY'S" }, existing)).toBe(true)
    expect(isAlreadyPublished({ ...r, url: '', name: 'Somewhere New' }, existing)).toBe(false)
  })
})

describe('draftMarkdown', () => {
  it('writes frontmatter the places loader will accept once category/city are filled', () => {
    const md = draftMarkdown(normalizeReview(legacy.features[0], 'legacy'), 'zareh-2')
    expect(md).toContain('slug: zareh-2')
    expect(md).toContain('name: "Zareh"')
    expect(md).toContain('suburb: "Collingwood"')
    expect(md).toContain('coords: [144.984692, -37.797961]')
    expect(md).toContain('visited: "2026-08-26"')
    expect(md).toContain('## takeout\n\nGreat ambiance and amazing food.')
    expect(md).toMatch(/## en\n\n## zh\n$/)
  })
  it('flags a missing coordinate and an empty review', () => {
    const md = draftMarkdown({ ...normalizeReview(modern.features[0], 'modern'), text: '' }, 'place')
    expect(md).toContain('coords: null')
    expect(md).toContain('⚠')
    expect(md).toContain('只有星级')
  })
})

describe('indexMarkdown', () => {
  it('sorts newest first and counts statuses', () => {
    const rows = [
      { slug: 'a', name: 'A', date: '2024-01-01', rating: 4, coords: null, text: 'x', address: 'addr', status: 'draft' },
      { slug: 'b', name: 'B', date: '2026-05-01', rating: 5, coords: [1, 2], text: 'yy', address: 'addr', status: 'published' },
    ]
    const md = indexMarkdown(rows)
    expect(md.indexOf('| B |')).toBeLessThan(md.indexOf('| A |'))
    expect(md).toContain('共 2 条;已收录 1;缺坐标 1')
    expect(md).toContain('**缺**')
  })
})
