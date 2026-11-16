import type { LngLat } from '@/lib/places'

/** 一组坐标的外接矩形 [[西, 南], [东, 北]];空数组 → null */
export function boundsOf(points: LngLat[]): [LngLat, LngLat] | null {
  if (points.length === 0) return null
  let w = Infinity, s = Infinity, e = -Infinity, n = -Infinity
  for (const [lng, lat] of points) {
    w = Math.min(w, lng); e = Math.max(e, lng)
    s = Math.min(s, lat); n = Math.max(n, lat)
  }
  return [[w, s], [e, n]]
}

const EARTH_RADIUS_M = 6371008.8
const toRad = (deg: number) => (deg * Math.PI) / 180

/** 两点大圆距离(米) */
export function haversineMeters(a: LngLat, b: LngLat): number {
  const dLat = toRad(b[1] - a[1])
  const dLng = toRad(b[0] - a[0])
  const la1 = toRad(a[1])
  const la2 = toRad(b[1])
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h))
}

/** 折线按段等分采样(移植自 travel-timeline journey.ts);末尾补上终点 */
export function buildPath(points: LngLat[], samplesPerSeg = 48): LngLat[] {
  if (points.length < 2) return [...points]
  const out: LngLat[] = []
  for (let i = 0; i < points.length - 1; i++) {
    const [x1, y1] = points[i]
    const [x2, y2] = points[i + 1]
    for (let s = 0; s < samplesPerSeg; s++) {
      const t = s / samplesPerSeg
      out.push([x1 + (x2 - x1) * t, y1 + (y2 - y1) * t])
    }
  }
  out.push(points[points.length - 1])
  return out
}

/**
 * 进度 t ∈ [0,1] 对应的路径点与朝向(1 = 向东 / 右,-1 = 向西 / 左)。
 * 朝向看当前所在那一段的走向;到了终点就看最后一段——否则终点的"下一个点"是它自己,
 * 朝向会一律变成向东,小人往西走到站时会突然转身。
 */
export function pathPosition(path: LngLat[], t: number): { pos: LngLat; facing: 1 | -1 } {
  const c = Math.min(1, Math.max(0, t))
  const last = path.length - 1
  const idx = Math.min(last, Math.floor(c * last))
  const pos = path[idx]
  const [from, to] = idx < last ? [pos, path[idx + 1]] : [path[Math.max(0, last - 1)], pos]
  return { pos, facing: to[0] >= from[0] ? 1 : -1 }
}
