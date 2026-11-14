import { describe, it, expect } from 'vitest'
import { boundsOf, buildPath, haversineMeters, pathPosition } from './geo'

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

describe('haversineMeters', () => {
  it('is zero for the same point', () => {
    expect(haversineMeters([144.9, -37.8], [144.9, -37.8])).toBe(0)
  })
  it('Zareh → Mary\'s is roughly 260 m', () => {
    const d = haversineMeters([144.984692, -37.797961], [144.987251, -37.799096])
    expect(d).toBeGreaterThan(240)
    expect(d).toBeLessThan(280)
  })
  it('Melbourne CBD → Mount Gambier is roughly 370 km', () => {
    const d = haversineMeters([144.9671, -37.8183], [140.783782, -37.829651])
    expect(d).toBeGreaterThan(355_000)
    expect(d).toBeLessThan(385_000)
  })
})

describe('buildPath', () => {
  it('returns the input untouched for fewer than two points', () => {
    expect(buildPath([])).toEqual([])
    expect(buildPath([[1, 2]])).toEqual([[1, 2]])
  })
  it('samples each segment and ends exactly on the last point', () => {
    const p = buildPath([[0, 0], [1, 0], [1, 1]], 4)
    expect(p).toHaveLength(9) // 4 + 4 + 终点
    expect(p[0]).toEqual([0, 0])
    expect(p[4]).toEqual([1, 0])
    expect(p[8]).toEqual([1, 1])
  })
})

describe('pathPosition', () => {
  const path = buildPath([[0, 0], [10, 0]], 10)
  it('clamps t into [0, 1]', () => {
    expect(pathPosition(path, -1).pos).toEqual([0, 0])
    expect(pathPosition(path, 2).pos).toEqual([10, 0])
  })
  it('faces east when the path heads east and west when it heads west', () => {
    expect(pathPosition(path, 0.5).facing).toBe(1)
    expect(pathPosition(buildPath([[10, 0], [0, 0]], 10), 0.5).facing).toBe(-1)
  })
})
