import { describe, it, expect } from 'vitest'
import {
  autoWalkDuration, dirFromKeys, facingFromDx, movePoint, nearestWithin, normalize,
  proximityStep, spriteFlipped, NEAR_IDLE, WALK_KEYS, type PlacePoint,
} from './walker'

describe('dirFromKeys', () => {
  it('maps arrows and WASD to unit vectors (screen y grows downwards)', () => {
    expect(dirFromKeys(new Set(['ArrowUp']))).toEqual({ x: 0, y: -1 })
    expect(dirFromKeys(new Set(['KeyS']))).toEqual({ x: 0, y: 1 })
    expect(dirFromKeys(new Set(['KeyA']))).toEqual({ x: -1, y: 0 })
    expect(dirFromKeys(new Set(['ArrowRight']))).toEqual({ x: 1, y: 0 })
  })
  it('normalises diagonals and cancels opposites', () => {
    const d = dirFromKeys(new Set(['ArrowUp', 'ArrowRight']))
    expect(d.x).toBeCloseTo(Math.SQRT1_2)
    expect(d.y).toBeCloseTo(-Math.SQRT1_2)
    expect(dirFromKeys(new Set(['ArrowUp', 'ArrowDown']))).toEqual({ x: 0, y: 0 })
  })
  it('ignores unrelated keys and exposes the handled key set', () => {
    expect(dirFromKeys(new Set(['Space', 'Enter']))).toEqual({ x: 0, y: 0 })
    expect(WALK_KEYS.has('KeyW')).toBe(true)
    expect(WALK_KEYS.has('Space')).toBe(false)
  })
})

describe('normalize / movePoint / facingFromDx', () => {
  it('normalize keeps zero as zero', () => {
    expect(normalize({ x: 0, y: 0 })).toEqual({ x: 0, y: 0 })
    expect(normalize({ x: 3, y: 4 })).toEqual({ x: 0.6, y: 0.8 })
  })
  it('movePoint advances by speed × dt', () => {
    expect(movePoint({ x: 10, y: 10 }, { x: 1, y: 0 }, 500, 180)).toEqual({ x: 100, y: 10 })
  })
  it('facingFromDx keeps the previous facing when not moving horizontally', () => {
    expect(facingFromDx(1, -1)).toBe(1)
    expect(facingFromDx(-0.5, 1)).toBe(-1)
    expect(facingFromDx(0, -1)).toBe(-1)
  })
})

describe('spriteFlipped', () => {
  it('mirrors left-facing art when walking right, and right-facing art when walking left', () => {
    // 手绘版:原画脸朝左
    expect(spriteFlipped(1, true)).toBe(true)
    expect(spriteFlipped(-1, true)).toBe(false)
    // 像素版:按朝右处理
    expect(spriteFlipped(1, false)).toBe(false)
    expect(spriteFlipped(-1, false)).toBe(true)
  })
})

describe('autoWalkDuration', () => {
  it('clamps between 1.2 s and 4 s', () => {
    expect(autoWalkDuration(10)).toBe(1200)
    expect(autoWalkDuration(800)).toBe(2000)
    expect(autoWalkDuration(50_000)).toBe(4000)
  })
})

// 1° 纬度 ≈ 111 km → 0.0001° ≈ 11 m
const at = (dLat: number): [number, number] => [144.0, -37.0 + dLat]
const places: PlacePoint[] = [
  { slug: 'a', coords: at(0) },
  { slug: 'b', coords: at(0.005) }, // 约 555 m 外
]

describe('nearestWithin', () => {
  it('returns the closest place inside the radius, or null', () => {
    expect(nearestWithin(at(0.0001), places, 30)?.slug).toBe('a')
    expect(nearestWithin(at(0.001), places, 30)).toBeNull()
  })
})

describe('proximityStep', () => {
  it('enters, dwells, arrives once, and resets after leaving', () => {
    let r = proximityStep(NEAR_IDLE, at(0.0001), places, 0) // 11 m:进入
    expect(r.state.near).toBe('a')
    expect(r.arrive).toBeNull()

    r = proximityStep(r.state, at(0.0001), places, 200) // 停留 200 ms:还没到
    expect(r.arrive).toBeNull()

    r = proximityStep(r.state, at(0.0001), places, 450) // 停留 450 ms:到达
    expect(r.arrive).toBe('a')

    r = proximityStep(r.state, at(0.0001), places, 900) // 继续站着:不重复触发
    expect(r.arrive).toBeNull()
    expect(r.left).toBeNull()

    r = proximityStep(r.state, at(0.0004), places, 1000) // 44 m:在 30–60 m 迟滞带内,仍算在店门口
    expect(r.state.near).toBe('a')
    expect(r.left).toBeNull()

    r = proximityStep(r.state, at(0.001), places, 1100) // 111 m:走开
    expect(r.left).toBe('a')
    expect(r.state).toEqual(NEAR_IDLE)

    r = proximityStep(r.state, at(0.0001), places, 2000) // 回来:重新计时
    expect(r.state.near).toBe('a')
    expect(r.state.since).toBe(2000)
    r = proximityStep(r.state, at(0.0001), places, 2500)
    expect(r.arrive).toBe('a')
  })
  it('does nothing when no place is near', () => {
    const r = proximityStep(NEAR_IDLE, at(0.002), places, 0)
    expect(r).toEqual({ state: NEAR_IDLE, arrive: null, left: null })
  })
})
