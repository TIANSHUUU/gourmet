import { describe, it, expect } from 'vitest'
import { boundsOf } from './geo'

describe('boundsOf', () => {
  it('returns null for no points', () => {
    expect(boundsOf([])).toBeNull()
  })
  it('returns [[west, south], [east, north]]', () => {
    expect(boundsOf([[144.9, -37.8], [141.2, 40.6], [140.8, -37.83]])).toEqual([[140.8, -37.83], [144.9, 40.6]])
  })
  it('collapses to the point itself for a single point', () => {
    expect(boundsOf([[1, 2]])).toEqual([[1, 2], [1, 2]])
  })
})
