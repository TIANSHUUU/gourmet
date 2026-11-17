import citiesJson from '@/data/map/cities.json'
import type { LngLat } from '@/lib/places'

export type CityView = { center: LngLat; zoom: number; pitch: number; bearing: number }
export type City = {
  slug: string
  name_zh: string
  name_en: string
  /** ISO 3166-1 两位码(AU / JP …),决定地图上的国家筛选按钮 */
  country: string
  /** [[西, 南], [东, 北]] */
  bounds: [LngLat, LngLat]
  view: CityView
}

// JSON 里的数组被 TS 推断成 number[],这里断言成元组类型;cities.test.ts 负责校验内容
export const CITIES: City[] = citiesJson as unknown as City[]

export function inBounds([lng, lat]: LngLat, [[w, s], [e, n]]: [LngLat, LngLat]): boolean {
  return lng >= w && lng <= e && lat >= s && lat <= n
}

/** 坐标落在哪个城市的 bounds 里;都不在 → null(只在总览出现) */
export function cityOf(coords: LngLat, cities: City[] = CITIES): City | null {
  return cities.find(c => inBounds(coords, c.bounds)) ?? null
}
