'use client'

import dynamic from 'next/dynamic'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLang } from '@/components/LanguageContext'
import { basePath } from '@/lib/basePath'
import { MAP_UI } from '@/lib/mapI18n'
import { cityOf, type City } from '@/lib/map/cities'
import { KIND_ORDER } from '@/lib/map/kinds'
import { parseMapUrl, serializeMapUrl } from '@/lib/map/urlState'
import type { PlaceCollection, PlaceFeature } from '@/lib/map/placesToGeoJSON'
import type { LngLat, PlaceKind } from '@/lib/places'
import CityChips from './CityChips'
import KindChips from './KindChips'
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

export default function MapPageClient({ data, cities }: { data: PlaceCollection; cities: City[] }) {
  const { lang } = useLang()
  const ui = MAP_UI[lang]
  const [activeCity, setActiveCity] = useState<string | null>(null)
  const [activeSlug, setActiveSlug] = useState<string | null>(null)
  const [kinds, setKinds] = useState<PlaceKind[]>(KIND_ORDER)
  const [failed, setFailed] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(false)
  const [hydrated, setHydrated] = useState(false)

  const bySlug = useMemo(() => new Map(data.features.map(f => [f.properties.slug, f])), [data])
  const available = useMemo(
    () => KIND_ORDER.filter(k => data.features.some(f => f.properties.kind === k)),
    [data],
  )
  const focusFeature: PlaceFeature | null = activeSlug ? (bySlug.get(activeSlug) ?? null) : null

  // 首次挂载:读 URL、读系统动效偏好(静态导出下不用 useSearchParams,避免 Suspense 包装)。
  // 这是「挂载后一次性读取浏览器状态」:首帧必须与服务端 HTML 一致,不能把 window 读进 useState 初始值,
  // 所以这里同步 setState 是有意的(react-hooks/set-state-in-effect 的告警在此不适用)。
  useEffect(() => {
    const { city, place } = parseMapUrl(window.location.search)
    const f = place ? (bySlug.get(place) ?? null) : null
    const cityFromPlace = f ? (cityOf(f.geometry.coordinates as LngLat, cities)?.slug ?? null) : null
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActiveCity(city && cities.some(c => c.slug === city) ? city : cityFromPlace)
    setActiveSlug(f ? f.properties.slug : null)
    setReducedMotion(window.matchMedia('(prefers-reduced-motion: reduce)').matches)
    setHydrated(true)
  }, [bySlug, cities])

  // 状态 → URL(replaceState,不产生历史记录)
  useEffect(() => {
    if (!hydrated) return
    const qs = serializeMapUrl({ city: activeCity, place: activeSlug })
    window.history.replaceState(null, '', `${window.location.pathname}${qs}`)
  }, [activeCity, activeSlug, hydrated])

  const pickPlace = useCallback((slug: string) => {
    const f = bySlug.get(slug)
    if (!f) return
    const c = cityOf(f.geometry.coordinates as LngLat, cities)
    if (c) setActiveCity(c.slug)
    setActiveSlug(slug)
  }, [bySlug, cities])

  const pickCity = useCallback((slug: string | null) => {
    setActiveCity(slug)
    setActiveSlug(null)
  }, [])

  const toggleKind = useCallback((k: PlaceKind) => {
    setKinds(prev => (prev.includes(k) ? prev.filter(x => x !== k) : [...prev, k]))
  }, [])

  if (failed) return <MapFallbackList data={data} cities={cities} />

  return (
    // 67px = Header 64px + 非首页的 3px 蓝色下边框
    <section className="relative h-[calc(100dvh-67px)] min-h-[480px] bg-[#1E242C]" aria-label={ui.title}>
      {hydrated && (
        <MapView
          styleUrl={`${basePath}/maps/painted.json`}
          data={data}
          cities={cities}
          activeCity={activeCity}
          focusPlace={focusFeature}
          kinds={kinds}
          reducedMotion={reducedMotion}
          onPlaceClick={pickPlace}
          onMapClick={() => setActiveSlug(null)}
          onFail={err => { console.error('[map] fallback to list:', err); setFailed(true) }}
        />
      )}
      {/* 顶部悬浮层:搜索 + 城市 + 分类。外层不接事件,内层才接,免得挡住地图拖拽 */}
      <div className="absolute inset-x-0 top-0 z-10 p-3 flex flex-col gap-2 pointer-events-none">
        <div className="pointer-events-auto"><MapSearch features={data.features} onPick={pickPlace} /></div>
        <div className="pointer-events-auto"><CityChips cities={cities} active={activeCity} onChange={pickCity} /></div>
        <div className="pointer-events-auto"><KindChips available={available} active={kinds} onToggle={toggleKind} /></div>
      </div>
      {focusFeature && <PlaceCard feature={focusFeature} onClose={() => setActiveSlug(null)} />}
      <noscript>
        <MapFallbackList data={data} cities={cities} />
      </noscript>
    </section>
  )
}
