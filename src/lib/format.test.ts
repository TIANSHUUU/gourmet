import { describe, it, expect } from 'vitest'
import { formatVisited, splitParagraphs } from './format'

describe('formatVisited', () => {
  it('formats English month + year', () => {
    expect(formatVisited('2026-06', 'en')).toBe('Visited June 2026')
    expect(formatVisited('2026-03', 'en')).toBe('Visited March 2026')
  })
  it('formats Chinese', () => {
    expect(formatVisited('2026-06', 'zh')).toBe('造访于 2026 年 6 月')
  })
  it('ignores an optional day, still showing the month', () => {
    expect(formatVisited('2026-08-26', 'en')).toBe('Visited August 2026')
    expect(formatVisited('2026-08-26', 'zh')).toBe('造访于 2026 年 8 月')
  })
  it('returns empty string for missing or malformed input', () => {
    expect(formatVisited('', 'en')).toBe('')
    expect(formatVisited('2026', 'en')).toBe('')
    expect(formatVisited('2026-13', 'en')).toBe('')
  })
})

describe('splitParagraphs', () => {
  it('splits on blank lines and trims each paragraph', () => {
    expect(splitParagraphs('First para.\n\n  Second para.  \n\n\nThird.')).toEqual([
      'First para.',
      'Second para.',
      'Third.',
    ])
  })

  it('keeps a single paragraph (including soft line breaks) as one item, and drops empty input', () => {
    expect(splitParagraphs('One line\nstill the same para')).toEqual(['One line\nstill the same para'])
    expect(splitParagraphs('   ')).toEqual([])
  })
})
