import fs from 'fs'
import path from 'path'
import { describe, expect, it } from 'vitest'
import { badgePath } from './cover'
import { RESTAURANT_KINDS, SPOT_KINDS } from './places'

describe('badgePath', () => {
  it('points at the painted category badge under public/', () => {
    expect(badgePath('cafe')).toBe('/map-assets/icons/badge-cafe.png')
  })

  it.each([...RESTAURANT_KINDS, ...SPOT_KINDS])('badge file exists for %s', kind => {
    const file = path.join(process.cwd(), 'public', badgePath(kind))
    expect(fs.existsSync(file)).toBe(true)
  })
})
