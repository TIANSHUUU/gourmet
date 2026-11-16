import type { PlaceKind } from '@/lib/places'

export type MapUIStrings = {
  title: string
  loading: string
  searchPlaceholder: string
  noResults: string
  overview: string
  kinds: Record<PlaceKind, string>
  viewStory: string
  openGoogle: string
  openAmap: string
  close: string
  mapFailedTitle: string
  mapFailedHint: string
  seeOnMap: string
  recenter: string
  togglePitch: string
  dpad: string
  up: string
  down: string
  left: string
  right: string
}

export const MAP_UI: Record<'en' | 'zh', MapUIStrings> = {
  en: {
    title: 'Pineapple Map',
    loading: 'Loading map…',
    searchPlaceholder: 'Find a place, cuisine or suburb…',
    noResults: 'No matching place',
    overview: 'Overview',
    kinds: {
      food: 'Food', cafe: 'Cafés', bakery: 'Bakeries', bar: 'Bars',
      sight: 'Sights', activity: 'Things to do', shop: 'Shops', stay: 'Stays',
    },
    viewStory: 'Read the story →',
    openGoogle: 'Open in Google Maps ↗',
    openAmap: 'Open in Amap ↗',
    close: 'Close',
    mapFailedTitle: 'The map could not load',
    mapFailedHint: 'Here is the full list instead — every place still links to its page.',
    seeOnMap: 'See on the map →',
    recenter: 'Back to the pineapple',
    togglePitch: 'Toggle tilt',
    dpad: 'Move the pineapple',
    up: 'Move up',
    down: 'Move down',
    left: 'Move left',
    right: 'Move right',
  },
  zh: {
    title: '菠萝子地图',
    loading: '地图加载中…',
    searchPlaceholder: '找店、菜系或街区…',
    noResults: '没有匹配的地方',
    overview: '总览',
    kinds: {
      food: '美食', cafe: '咖啡', bakery: '烘焙', bar: '酒吧',
      sight: '景点', activity: '玩乐', shop: '买买买', stay: '住宿',
    },
    viewStory: '查看图文 →',
    openGoogle: '在 Google 地图打开 ↗',
    openAmap: '在高德地图打开 ↗',
    close: '关闭',
    mapFailedTitle: '地图没能加载',
    mapFailedHint: '先看列表吧,每一家都能点进详情。',
    seeOnMap: '在地图上看 →',
    recenter: '回到菠萝子',
    togglePitch: '切换俯视',
    dpad: '操控菠萝子',
    up: '向上',
    down: '向下',
    left: '向左',
    right: '向右',
  },
}
