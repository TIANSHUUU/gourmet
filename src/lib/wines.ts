import raw from '@/data/wines.json'

export type Localized = { zh: string; en: string }
export type Level = 'low' | 'medium' | 'high'
export type WineType = 'red' | 'white' | 'rose' | 'sparkling'

export type WineFlavour = { icon: string; label: Localized }

export type WineProfile = {
  body?: Level
  tannin?: Level
  acidity?: Level
  sweetness?: Level
}

export type WineDetails = {
  producer?: string
  country?: Localized
  flag?: string
  region?: Localized
  varieties?: Localized
  alcohol?: string
  vintage?: string
  size?: string
  closure?: Localized
  notes?: Localized
  map_url?: string
}

export type WineEntry = {
  slug: string
  date?: string
  wine_name: Localized
  winery: Localized
  image?: string
  images?: string[]
  color?: 'pink' | 'peach' | 'blue' | 'green' | 'cocoa'
  wine_type?: WineType
  price_aud?: string
  url?: string
  tags?: Localized[]
  flavours?: WineFlavour[]
  story?: Localized
  pairing?: Localized
  profile?: WineProfile
  summary?: Localized
  details?: WineDetails
}

const data = raw as unknown as { entries: WineEntry[] }

export function sortWines(list: WineEntry[]): WineEntry[] {
  return [...list].sort(
    (a, b) => (b.date || '').localeCompare(a.date || '') || a.slug.localeCompare(b.slug)
  )
}

export function getAllWines(): WineEntry[] {
  return sortWines(data.entries || [])
}

export function getWine(slug: string): WineEntry | undefined {
  return getAllWines().find(w => w.slug === slug)
}
