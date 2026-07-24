import type { WineType, Localized } from '@/lib/wines'

export type WineUIStrings = {
  navRestaurants: string
  navWine: string
  listTitle: string
  listIntro: string
  searchPlaceholder: string
  filterAll: string
  types: Record<WineType, string>
  flavours: string
  notes: string
  pairing: string
  tasteProfile: string
  summary: string
  details: string
  region: string
  source: string
  viewRegion: string
  tasted: string
  fields: Record<
    'producer' | 'country' | 'region' | 'varieties' | 'alcohol' | 'vintage' | 'size' | 'closure',
    string
  >
  dims: Record<'body' | 'tannin' | 'acidity' | 'sweetness', string>
  levels: Record<'low' | 'medium' | 'high', string>
  back: string
  emptyList: string
  emptyHint: string
  noMatch: string
  notFound: string
}

export const WINE_UI: Record<'en' | 'zh', WineUIStrings> = {
  en: {
    navRestaurants: 'Food',
    navWine: 'Wine',
    listTitle: 'Wine Diary',
    listIntro: "Every bottle I've opened — and written down.",
    searchPlaceholder: 'Search wine / winery / region / grape…',
    filterAll: 'All',
    types: { red: 'Red', white: 'White', rose: 'Rosé', sparkling: 'Sparkling' },
    flavours: 'Flavour Notes',
    notes: 'Notes',
    pairing: 'Pairing',
    tasteProfile: 'Taste Profile',
    summary: 'Summary',
    details: 'Details',
    region: 'Region',
    source: 'View product',
    viewRegion: 'View region',
    tasted: 'Tasted',
    fields: {
      producer: 'Producer',
      country: 'Country',
      region: 'Region',
      varieties: 'Varieties',
      alcohol: 'Alcohol',
      vintage: 'Vintage',
      size: 'Size',
      closure: 'Closure',
    },
    dims: { body: 'Body', tannin: 'Tannin', acidity: 'Acidity', sweetness: 'Sweetness' },
    levels: { low: 'Low', medium: 'Medium', high: 'High' },
    back: '← Back to wine diary',
    emptyList: 'No wines yet',
    emptyHint: 'Had a great glass? Jot it down.',
    noMatch: 'No matching wine',
    notFound: 'Entry not found',
  },
  zh: {
    navRestaurants: '美食',
    navWine: '酒评',
    listTitle: '酒评日记',
    listIntro: '每一瓶我开过、写下来的酒。',
    searchPlaceholder: '搜索酒名 / 酒庄 / 产区 / 品种…',
    filterAll: '全部',
    types: { red: '红', white: '白', rose: '桃红', sparkling: '气泡' },
    flavours: '风味',
    notes: '品鉴笔记',
    pairing: '配餐',
    tasteProfile: '风味曲线',
    summary: '总评',
    details: '详情',
    region: '产区',
    source: '查看购买',
    viewRegion: '查看产区',
    tasted: '品鉴',
    fields: {
      producer: '生产商',
      country: '国家',
      region: '产区',
      varieties: '葡萄品种',
      alcohol: '酒精度',
      vintage: '年份',
      size: '容量',
      closure: '封瓶',
    },
    dims: { body: '酒体', tannin: '单宁', acidity: '酸度', sweetness: '甜度' },
    levels: { low: '低', medium: '中', high: '高' },
    back: '← 返回酒评',
    emptyList: '还没有酒',
    emptyHint: '喝到好酒了就来记一笔',
    noMatch: '没有匹配的酒',
    notFound: '未找到这条记录',
  },
}

export function pick(field: Localized | string | undefined, lang: 'en' | 'zh'): string {
  if (field == null) return ''
  if (typeof field === 'string') return field
  return field[lang] || field.en || field.zh || ''
}
