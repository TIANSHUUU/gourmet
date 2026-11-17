import type { LngLat } from '@/lib/places'
import { inBounds, type City } from './cities'

/** 地图国家筛选用到的国家:ISO 两位码 → 中英名。cities.json 出现新国家而这里没有时,countries.test.ts 会失败 */
export const COUNTRIES: Record<string, { name_en: string; name_zh: string }> = {
  AU: { name_en: 'Australia', name_zh: '澳大利亚' },
  JP: { name_en: 'Japan', name_zh: '日本' },
}

/** 'AU' → 🇦🇺(两个 regional indicator 字符);只在没有代码画圆旗的国家当后备 */
export function flagEmoji(code: string): string {
  return [...code.toUpperCase()].map(ch => String.fromCodePoint(0x1f1e6 + ch.charCodeAt(0) - 65)).join('')
}

/** cities.json 里出现过的国家,按第一次出现的顺序 */
export function countriesOf(cities: City[]): string[] {
  return [...new Set(cities.map(c => c.country))]
}

/** 落在该国任一城市边界内的坐标(国家视角的镜头范围) */
export function coordsInCountry(coords: LngLat[], cities: City[], country: string): LngLat[] {
  const mine = cities.filter(c => c.country === country)
  return coords.filter(p => mine.some(c => inBounds(p, c.bounds)))
}

/** 正 n 角星的 polygon points,第一个尖朝正上;ratio = 内半径 / 外半径 */
export function starPoints(cx: number, cy: number, r: number, n: number, ratio: number): string {
  const pts: string[] = []
  for (let i = 0; i < n * 2; i++) {
    const rr = i % 2 ? r * ratio : r
    const a = -Math.PI / 2 + (i * Math.PI) / n
    pts.push(`${(cx + rr * Math.cos(a)).toFixed(1)},${(cy + rr * Math.sin(a)).toFixed(1)}`)
  }
  return pts.join(' ')
}
