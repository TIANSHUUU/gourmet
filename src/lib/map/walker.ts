import type { LngLat } from '@/lib/places'
import { haversineMeters } from './geo'

/** 自由操控:屏幕像素/秒(与缩放无关,手感恒定) */
export const WALK_SPEED_PX = 180
/** 进入店铺范围(米)→ 开始计时 */
export const ENTER_RADIUS_M = 30
/** 离开店铺范围(米)→ 才算走开(迟滞,避免在边界抖动) */
export const EXIT_RADIUS_M = 60
/** 在范围内停留多久触发到达 */
export const DWELL_MS = 400
/** 自由操控时若缩放低于此值,先拉近到街道级 */
export const FREE_WALK_MIN_ZOOM = 15
/** 自动行走的演出速度(米/秒)与时长上下限 */
export const AUTO_WALK_MPS = 400
export const AUTO_WALK_MIN_MS = 1200
export const AUTO_WALK_MAX_MS = 4000

export type Vec = { x: number; y: number }
export const ZERO: Vec = { x: 0, y: 0 }

// KeyboardEvent.code → 屏幕方向(y 向下为正)
const KEY_DIRS: Record<string, Vec> = {
  ArrowUp: { x: 0, y: -1 }, KeyW: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 }, KeyS: { x: 0, y: 1 },
  ArrowLeft: { x: -1, y: 0 }, KeyA: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 }, KeyD: { x: 1, y: 0 },
}
export const WALK_KEYS: ReadonlySet<string> = new Set(Object.keys(KEY_DIRS))

export function normalize(v: Vec): Vec {
  const len = Math.hypot(v.x, v.y)
  return len === 0 ? ZERO : { x: v.x / len, y: v.y / len }
}

export function isZero(v: Vec): boolean {
  return v.x === 0 && v.y === 0
}

/** 当前按下的 KeyboardEvent.code 集合 → 单位方向向量(对角线归一化,相反键抵消) */
export function dirFromKeys(codes: ReadonlySet<string>): Vec {
  let x = 0, y = 0
  for (const c of codes) {
    const d = KEY_DIRS[c]
    if (d) { x += d.x; y += d.y }
  }
  return normalize({ x, y })
}

export function autoWalkDuration(meters: number): number {
  return Math.min(AUTO_WALK_MAX_MS, Math.max(AUTO_WALK_MIN_MS, (meters / AUTO_WALK_MPS) * 1000))
}

/** 屏幕像素坐标按方向推进 dt 毫秒 */
export function movePoint(p: Vec, dir: Vec, dtMs: number, speedPx = WALK_SPEED_PX): Vec {
  const s = (speedPx * dtMs) / 1000
  return { x: p.x + dir.x * s, y: p.y + dir.y * s }
}

/** 水平位移决定朝向;不动时保持原朝向 */
export function facingFromDx(dx: number, prev: 1 | -1): 1 | -1 {
  return dx > 0 ? 1 : dx < 0 ? -1 : prev
}

export type PlacePoint = { slug: string; coords: LngLat }

export function nearestWithin(pos: LngLat, places: PlacePoint[], radiusM: number): { slug: string; dist: number } | null {
  let best: { slug: string; dist: number } | null = null
  for (const p of places) {
    const dist = haversineMeters(pos, p.coords)
    if (dist <= radiusM && (!best || dist < best.dist)) best = { slug: p.slug, dist }
  }
  return best
}

export type NearState = {
  /** 正在"门口"的店 */
  near: string | null
  /** 进入门口的时刻 */
  since: number | null
  /** 这次停留已经触发过到达的店(避免重复弹卡) */
  arrived: string | null
}
export const NEAR_IDLE: NearState = { near: null, since: null, arrived: null }

/**
 * 邻近判定(带迟滞):进入 ENTER 半径开始计时,停留满 DWELL 触发一次 arrive;
 * 离开 EXIT 半径才算走开(复位,之后可再次触发)。纯函数,时间由调用方传入。
 */
export function proximityStep(
  prev: NearState, pos: LngLat, places: PlacePoint[], now: number,
): { state: NearState; arrive: string | null; left: string | null } {
  if (prev.near) {
    const cur = places.find(p => p.slug === prev.near)
    const dist = cur ? haversineMeters(pos, cur.coords) : Infinity
    if (dist > EXIT_RADIUS_M) return { state: NEAR_IDLE, arrive: null, left: prev.near }
    if (prev.arrived !== prev.near && prev.since !== null && now - prev.since >= DWELL_MS) {
      return { state: { ...prev, arrived: prev.near }, arrive: prev.near, left: null }
    }
    return { state: prev, arrive: null, left: null }
  }
  const n = nearestWithin(pos, places, ENTER_RADIUS_M)
  if (!n) return { state: prev, arrive: null, left: null }
  return { state: { near: n.slug, since: now, arrived: null }, arrive: null, left: null }
}
