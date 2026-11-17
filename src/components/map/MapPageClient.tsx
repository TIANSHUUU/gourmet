'use client'

import dynamic from 'next/dynamic'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLang } from '@/components/LanguageContext'
import { basePath } from '@/lib/basePath'
import { MAP_UI } from '@/lib/mapI18n'
import { cityOf, type City } from '@/lib/map/cities'
import { KIND_ORDER, effectiveKinds, toggledKinds } from '@/lib/map/kinds'
import { parseMapUrl, serializeMapUrl } from '@/lib/map/urlState'
import { dirFromKeys, WALK_KEYS } from '@/lib/map/walker'
import type { PlaceCollection, PlaceFeature } from '@/lib/map/placesToGeoJSON'
import type { LandmarkCollection } from '@/lib/map/landmarks'
import type { LngLat, PlaceKind } from '@/lib/places'
import type { MapApi } from './MapView'
import CityChips from './CityChips'
import DPad from './DPad'
import KindChips from './KindChips'
import MapControls from './MapControls'
import MapFallbackList from './MapFallbackList'
import MapSearch from './MapSearch'
import PlaceCard from './PlaceCard'

// maplibre-gl 只能在浏览器里跑:ssr:false(只允许在 Client Component 里这样写)
const MapView = dynamic(() => import('./MapView'), {
  ssr: false,
  loading: () => (
    <p className="absolute inset-0 grid place-items-center text-sm text-[#F8F2DD]/70">地图加载中… Loading map…</p>
  ),
})

const isTypingTarget = (t: EventTarget | null) =>
  t instanceof HTMLElement && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)

export default function MapPageClient({ data, landmarks, cities }: { data: PlaceCollection; landmarks: LandmarkCollection; cities: City[] }) {
  const { lang } = useLang()
  const ui = MAP_UI[lang]
  const [activeCity, setActiveCity] = useState<string | null>(null)
  const [activeSlug, setActiveSlug] = useState<string | null>(null)
  const [walkTarget, setWalkTarget] = useState<{ slug: string; nonce: number } | null>(null)
  // 只选了国家、还没选城市时,地图停在该国视角(不写进 URL)
  const [activeCountry, setActiveCountry] = useState<string | null>(null)
  // 分类可多选;一个都没选 = 全部显示。传给 MapView 的是 effectiveKinds 之后的结果
  const [selectedKinds, setSelectedKinds] = useState<PlaceKind[]>([])
  const kinds = useMemo(() => effectiveKinds(selectedKinds), [selectedKinds])
  const [failed, setFailed] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(false)
  const [isTouch, setIsTouch] = useState(false)
  const [hydrated, setHydrated] = useState(false)
  const apiRef = useRef<MapApi | null>(null)

  const bySlug = useMemo(() => new Map(data.features.map(f => [f.properties.slug, f])), [data])
  const available = useMemo(
    () => KIND_ORDER.filter(k => data.features.some(f => f.properties.kind === k)),
    [data],
  )
  const focusFeature: PlaceFeature | null = activeSlug ? (bySlug.get(activeSlug) ?? null) : null

  // 首次挂载:读 URL、读系统动效偏好、判断触屏(静态导出下不用 useSearchParams,避免 Suspense 包装)。
  // 这是「挂载后一次性读取浏览器状态」:首帧必须与服务端 HTML 一致,不能把 window 读进 useState 初始值,
  // 所以这里同步 setState 是有意的(react-hooks/set-state-in-effect 的告警在此不适用)。
  useEffect(() => {
    const { city, place } = parseMapUrl(window.location.search)
    const f = place ? (bySlug.get(place) ?? null) : null
    const cityFromPlace = f ? (cityOf(f.geometry.coordinates as LngLat, cities)?.slug ?? null) : null
    const startCity = city && cities.some(c => c.slug === city) ? city : cityFromPlace
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActiveCity(startCity)
    setActiveCountry(cities.find(c => c.slug === startCity)?.country ?? null)
    setActiveSlug(f ? f.properties.slug : null)
    setReducedMotion(window.matchMedia('(prefers-reduced-motion: reduce)').matches)
    setIsTouch(window.matchMedia('(pointer: coarse)').matches)
    setHydrated(true)
  }, [bySlug, cities])

  // 状态 → URL(replaceState,不产生历史记录)
  useEffect(() => {
    if (!hydrated) return
    const qs = serializeMapUrl({ city: activeCity, place: activeSlug })
    window.history.replaceState(null, '', `${window.location.pathname}${qs}`)
  }, [activeCity, activeSlug, hydrated])

  // 键盘操控:方向键 / WASD;在输入框里打字时不劫持;按住多个键走对角线;窗口失焦时松开
  useEffect(() => {
    const pressed = new Set<string>()
    const emit = () => apiRef.current?.setInput(dirFromKeys(pressed))
    const down = (e: KeyboardEvent) => {
      if (!WALK_KEYS.has(e.code) || isTypingTarget(e.target) || e.metaKey || e.ctrlKey || e.altKey) return
      e.preventDefault() // 方向键别滚页面
      if (pressed.has(e.code)) return
      pressed.add(e.code)
      emit()
    }
    const up = (e: KeyboardEvent) => {
      if (!pressed.delete(e.code)) return
      emit()
    }
    const clear = () => {
      if (pressed.size === 0) return
      pressed.clear()
      emit()
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', clear)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('blur', clear)
    }
  }, [])

  // 点标签 / 搜索选中:减少动态时直接开卡片(小人瞬移),否则让小人走过去,到了再开
  const pickPlace = useCallback((slug: string) => {
    const f = bySlug.get(slug)
    if (!f) return
    const c = cityOf(f.geometry.coordinates as LngLat, cities)
    if (c) {
      setActiveCity(c.slug)
      setActiveCountry(c.country)
    }
    if (reducedMotion) {
      setActiveSlug(slug)
      return
    }
    setActiveSlug(null)
    setWalkTarget({ slug, nonce: Date.now() })
  }, [bySlug, cities, reducedMotion])

  const pickCity = useCallback((slug: string) => {
    setActiveCity(slug)
    setActiveCountry(cities.find(c => c.slug === slug)?.country ?? null)
    setActiveSlug(null)
    setWalkTarget(null)
  }, [cities])

  // 总览(null):清空国家与城市。点国家:选中并进该国视角;已在该国某城市里 → 退回该国视角;
  // 已在该国视角 → 再点一次取消、回总览
  const pickCountry = useCallback((code: string | null) => {
    const backToOverview = code === null || (code === activeCountry && activeCity === null)
    setActiveCountry(backToOverview ? null : code)
    setActiveCity(null)
    setActiveSlug(null)
    setWalkTarget(null)
  }, [activeCountry, activeCity])

  const toggleKind = useCallback((k: PlaceKind) => {
    setSelectedKinds(prev => toggledKinds(prev, k))
  }, [])

  const handleArrive = useCallback((slug: string) => {
    setWalkTarget(null)
    setActiveSlug(slug)
  }, [])

  const handleLeave = useCallback((slug: string) => {
    setActiveSlug(prev => (prev === slug ? null : prev))
  }, [])

  if (failed) return <MapFallbackList data={data} cities={cities} />

  return (
    // 67px = Header 64px + 非首页的 3px 蓝色下边框
    <section className="relative h-[calc(100dvh-67px)] min-h-[480px] bg-[#1E242C]" aria-label={ui.title}>
      {hydrated && (
        <MapView
          styleUrl={`${basePath}/maps/painted.json`}
          data={data}
          landmarks={landmarks}
          lang={lang}
          cities={cities}
          activeCity={activeCity}
          activeCountry={activeCountry}
          focusPlace={focusFeature}
          walkTarget={walkTarget}
          kinds={kinds}
          reducedMotion={reducedMotion}
          apiRef={apiRef}
          onPlaceClick={pickPlace}
          onMapClick={() => setActiveSlug(null)}
          onArrive={handleArrive}
          onLeave={handleLeave}
          onFail={err => { console.error('[map] fallback to list:', err); setFailed(true) }}
        />
      )}
      {/* 顶部悬浮层:搜索 + 城市 + 分类。外层不接事件,内层才接,免得挡住地图拖拽 */}
      <div className="absolute inset-x-0 top-0 z-10 p-3 flex flex-col gap-2 pointer-events-none">
        <div className="pointer-events-auto"><MapSearch features={data.features} onPick={pickPlace} /></div>
        <div className="pointer-events-auto"><CityChips cities={cities} country={activeCountry} city={activeCity} onCountry={pickCountry} onCity={pickCity} /></div>
        <div className="pointer-events-auto"><KindChips available={available} selected={selectedKinds} onToggle={toggleKind} /></div>
      </div>
      {/* 左下:回到菠萝子 / 切换俯视(在署名条上方);只在城市视图里有小人时显示 */}
      {activeCity && (
        <div className="absolute left-3 bottom-9 z-10">
          <MapControls onRecenter={() => apiRef.current?.recenter()} onTogglePitch={() => apiRef.current?.togglePitch()} />
        </div>
      )}
      {/* 右下:触屏才有虚拟方向键;卡片打开时让位 */}
      {activeCity && isTouch && !focusFeature && (
        <div className="absolute right-3 bottom-3 z-10">
          <DPad onDir={d => apiRef.current?.setInput(d)} />
        </div>
      )}
      {focusFeature && <PlaceCard feature={focusFeature} onClose={() => setActiveSlug(null)} />}
      <noscript>
        <MapFallbackList data={data} cities={cities} />
      </noscript>
    </section>
  )
}
