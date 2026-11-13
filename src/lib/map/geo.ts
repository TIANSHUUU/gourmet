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
