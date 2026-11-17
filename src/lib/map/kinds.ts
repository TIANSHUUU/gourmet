import type { PlaceKind } from '@/lib/places'

/** 地图上分类 chips 的顺序 */
export const KIND_ORDER: PlaceKind[] = ['food', 'cafe', 'bakery', 'bar', 'sight', 'activity', 'shop', 'stay']

/** 分类色:徽章占位底色、卡片 chip、筛选 chip 选中态 */
export const KIND_COLORS: Record<PlaceKind, string> = {
  food: '#E8603C',
  cafe: '#8C5A3C',
  bakery: '#C2557A',
  bar: '#7B4B94',
  sight: '#2F8F83',
  activity: '#3C8ABF',
  shop: '#D58A2B',
  stay: '#5A6B9E',
}

/** 徽章占位用的 emoji;Phase 3 换成手绘 PNG 后仅卡片仍可能用到 */
export const KIND_GLYPHS: Record<PlaceKind, string> = {
  food: '🍜',
  cafe: '☕',
  bakery: '🥐',
  bar: '🍷',
  sight: '📷',
  activity: '🥾',
  shop: '🛍️',
  stay: '🛏️',
}

/**
 * 景点 / 玩乐 / 购物 / 住宿(spots/ 里的四类)只出现在地图上:没有 /<slug> 图文页,
 * 评论全文和照片显示在地图卡片里(业主 2026-11-17 定)。
 * 放在这里而不是 places.ts,是因为 places.ts 引用了 fs,不能进浏览器包;与 SPOT_KINDS 的一致性由 kinds.test.ts 保证。
 */
const SPOT_KIND_SET: ReadonlySet<PlaceKind> = new Set<PlaceKind>(['sight', 'activity', 'shop', 'stay'])

export function isSpotKind(kind: PlaceKind): boolean {
  return SPOT_KIND_SET.has(kind)
}
