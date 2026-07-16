import { describe, it, expect } from 'vitest'
import { pick, WINE_UI } from './wineI18n'

describe('pick', () => {
  it('returns the chosen language', () => {
    expect(pick({ zh: '甲', en: 'A' }, 'en')).toBe('A')
    expect(pick({ zh: '甲', en: 'A' }, 'zh')).toBe('甲')
  })
  it('passes strings through and handles undefined', () => {
    expect(pick('x', 'zh')).toBe('x')
    expect(pick(undefined, 'en')).toBe('')
  })
  it('falls back when the chosen language is empty', () => {
    expect(pick({ zh: '', en: 'A' }, 'zh')).toBe('A')
  })
})

describe('WINE_UI', () => {
  it('has matching keys for both languages', () => {
    expect(Object.keys(WINE_UI.en).sort()).toEqual(Object.keys(WINE_UI.zh).sort())
    expect(WINE_UI.zh.dims.body).toBe('酒体')
    expect(WINE_UI.en.dims.tannin).toBe('Tannin')
  })
})
