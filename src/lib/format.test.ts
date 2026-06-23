import { describe, it, expect } from 'vitest'
import { formatVisited } from './format'

describe('formatVisited', () => {
  it('formats English month + year', () => {
    expect(formatVisited('2026-06', 'en')).toBe('Visited June 2026')
    expect(formatVisited('2026-03', 'en')).toBe('Visited March 2026')
  })
  it('formats Chinese', () => {
    expect(formatVisited('2026-06', 'zh')).toBe('造访于 2026 年 6 月')
  })
  it('returns empty string for missing or malformed input', () => {
    expect(formatVisited('', 'en')).toBe('')
    expect(formatVisited('2026', 'en')).toBe('')
    expect(formatVisited('2026-13', 'en')).toBe('')
  })
})
