export type MapUrlState = { city: string | null; place: string | null }

const SLUG = /^[a-z0-9-]+$/

/** 解析 `?city=&place=`;非 slug 形态的值一律丢弃(URL 是用户可控输入) */
export function parseMapUrl(search: string): MapUrlState {
  const p = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search)
  const clean = (v: string | null) => (v && SLUG.test(v) ? v : null)
  return { city: clean(p.get('city')), place: clean(p.get('place')) }
}

export function serializeMapUrl(state: MapUrlState): string {
  const p = new URLSearchParams()
  if (state.city) p.set('city', state.city)
  if (state.place) p.set('place', state.place)
  const s = p.toString()
  return s ? `?${s}` : ''
}
