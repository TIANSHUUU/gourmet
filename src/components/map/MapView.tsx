'use client'

import { useEffect, useRef, useState } from 'react'
import {
  Map as MapLibreMap,
  setWorkerUrl,
  type GeoJSONSource,
  type MapLayerMouseEvent,
  type StyleSpecification,
} from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import type { Point } from 'geojson'
import { basePath } from '@/lib/basePath'
import { makeBadge, makeLabelBackground } from './mapImages'
import { KIND_ORDER } from '@/lib/map/kinds'
import { boundsOf } from '@/lib/map/geo'
import type { City } from '@/lib/map/cities'
import type { PlaceCollection, PlaceFeature } from '@/lib/map/placesToGeoJSON'
import type { LngLat, PlaceKind } from '@/lib/places'

export const SOURCE_ID = 'places'
export const LAYER_CLUSTER = 'place-cluster'
export const LAYER_CLUSTER_COUNT = 'place-cluster-count'
export const LAYER_LABEL = 'place-label'
export const LAYER_BADGE = 'place-badge'

type Props = {
  /** 已带 basePath 的样式 JSON 地址 */
  styleUrl: string
  data: PlaceCollection
  cities: City[]
  /** null = 总览(框住全部地点) */
  activeCity: string | null
  /** 需要镜头飞过去并高亮的地点 */
  focusPlace: PlaceFeature | null
  /** 当前显示的分类 */
  kinds: PlaceKind[]
  reducedMotion: boolean
  onPlaceClick: (slug: string) => void
  /** 点到空白处(用于收起卡片) */
  onMapClick: () => void
  /** 样式拿不到 / WebGL 不可用 → 父组件切到纯列表 */
  onFail: (err: unknown) => void
}

export default function MapView(props: Props) {
  const { styleUrl, data, cities, activeCity, focusPlace, kinds, reducedMotion } = props
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MapLibreMap | null>(null)
  const [ready, setReady] = useState(false)
  // 回调放 ref:父组件每次渲染传新函数,不应触发重建地图
  const cbRef = useRef({ onPlaceClick: props.onPlaceClick, onMapClick: props.onMapClick, onFail: props.onFail })
  // 不能在渲染期写 ref(react-hooks/refs);无依赖 effect 每次渲染后同步最新回调
  useEffect(() => {
    cbRef.current = { onPlaceClick: props.onPlaceClick, onMapClick: props.onMapClick, onFail: props.onFail }
  })
  const lastFocusRef = useRef<string | null>(null)

  // 1) 建图(只跑一次;StrictMode 下会跑两遍,靠 cancelled 守住)
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    let map: MapLibreMap | null = null
    let cancelled = false
    ;(async () => {
      try {
        if (!('WebGL2RenderingContext' in window)) throw new Error('WebGL2 不可用')
        const res = await fetch(styleUrl)
        if (!res.ok) throw new Error(`样式加载失败 ${res.status} ${styleUrl}`)
        const style = (await res.json()) as StyleSpecification
        if (cancelled) return
        // maplibre 6 的 ESM worker 靠 import.meta.url 定位,Turbopack 打包后找不到(404 → "Worker failed to load")。
        // 改用 public/maps/ 下的副本(npm run maps:worker 从 node_modules 同步;升级 maplibre-gl 后要重跑)
        setWorkerUrl(`${basePath}/maps/maplibre-gl-worker.js`)
        map = new MapLibreMap({
          container: el,
          style,
          center: [144.9631, -37.8136],
          zoom: 3,
          maxPitch: 65,
          attributionControl: { compact: true },
        })
        mapRef.current = map
        map.on('error', e => {
          // WebGL 建不出来是致命的;单张瓦片/字形 404 只是警告
          if (/webgl/i.test(String(e.error?.message ?? ''))) cbRef.current.onFail(e.error)
          else console.warn('[map]', e.error)
        })
        map.once('load', () => {
          const m = mapRef.current
          if (!m) return
          const lb = makeLabelBackground()
          m.addImage('label-bg', lb.image, lb.options)
          for (const k of KIND_ORDER) {
            const b = makeBadge(k)
            m.addImage(`badge-${k}`, b.image, b.options)
          }
          m.addSource(SOURCE_ID, {
            type: 'geojson',
            data,
            promoteId: 'slug', // feature-state 用 slug 当 id
            cluster: true,
            clusterMaxZoom: 12,
            clusterRadius: 40,
          })
          m.addLayer({
            id: LAYER_CLUSTER, type: 'circle', source: SOURCE_ID, filter: ['has', 'point_count'],
            paint: {
              'circle-color': '#F0742A',
              'circle-radius': ['step', ['get', 'point_count'], 16, 5, 20, 20, 26],
              'circle-stroke-color': '#FFFFFF',
              'circle-stroke-width': 2,
            },
          })
          m.addLayer({
            id: LAYER_CLUSTER_COUNT, type: 'symbol', source: SOURCE_ID, filter: ['has', 'point_count'],
            layout: { 'text-field': ['get', 'point_count_abbreviated'], 'text-font': ['Noto Sans Bold'], 'text-size': 13 },
            paint: { 'text-color': '#FFFFFF' },
          })
          m.addLayer({
            id: LAYER_LABEL, type: 'symbol', source: SOURCE_ID, filter: ['!', ['has', 'point_count']],
            layout: {
              'text-field': ['get', 'name'],
              'text-font': ['Noto Sans Bold'], // 只能用 OpenFreeMap 提供的字体栈名
              'text-size': 12,
              'text-anchor': 'bottom',
              'text-offset': [0, -1.0], // 单位 em;把文字抬高到指针之上。指针没对准点就调这个
              'icon-image': 'label-bg',
              'icon-text-fit': 'both',
              'icon-text-fit-padding': [4, 8, 4, 8],
              'icon-anchor': 'bottom',
              'icon-pitch-alignment': 'viewport',
              'text-pitch-alignment': 'viewport',
            },
            paint: {
              'text-color': ['case', ['boolean', ['feature-state', 'active'], false], '#F0742A', '#2B2A24'],
            },
          })
          m.addLayer({
            id: LAYER_BADGE, type: 'symbol', source: SOURCE_ID, filter: ['!', ['has', 'point_count']],
            layout: {
              'icon-image': ['concat', 'badge-', ['get', 'kind']],
              'icon-anchor': 'bottom',
              'icon-offset': [0, -44], // 像素;徽章浮在标签正上方。重叠/离太远就调这个
              'icon-pitch-alignment': 'viewport',
              'icon-allow-overlap': true,
              'icon-ignore-placement': true,
            },
          })

          const pick = (e: MapLayerMouseEvent) => {
            const f = e.features?.[0]
            if (f) cbRef.current.onPlaceClick(String(f.properties.slug))
          }
          m.on('click', LAYER_LABEL, pick)
          m.on('click', LAYER_BADGE, pick)
          m.on('click', LAYER_CLUSTER, async e => {
            const f = e.features?.[0]
            if (!f) return
            const src = m.getSource(SOURCE_ID) as GeoJSONSource
            const zoom = await src.getClusterExpansionZoom(Number(f.properties.cluster_id))
            m.easeTo({ center: (f.geometry as Point).coordinates as LngLat, zoom })
          })
          m.on('click', e => {
            const hits = m.queryRenderedFeatures(e.point, { layers: [LAYER_LABEL, LAYER_BADGE, LAYER_CLUSTER] })
            if (hits.length === 0) cbRef.current.onMapClick()
          })
          for (const id of [LAYER_LABEL, LAYER_BADGE, LAYER_CLUSTER]) {
            m.on('mouseenter', id, () => { m.getCanvas().style.cursor = 'pointer' })
            m.on('mouseleave', id, () => { m.getCanvas().style.cursor = '' })
          }
          setReady(true)
        })
      } catch (err) {
        cbRef.current.onFail(err)
      }
    })()
    return () => {
      cancelled = true
      mapRef.current = null
      map?.remove()
    }
    // data 只在建图时用一次,后续通过 setData 更新;只有 styleUrl 变化才重建
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [styleUrl])

  // 2) 城市切换 / 总览
  useEffect(() => {
    const m = mapRef.current
    if (!m || !ready) return
    const city = cities.find(c => c.slug === activeCity)
    if (city) {
      const { center, zoom, pitch, bearing } = city.view
      if (reducedMotion) m.jumpTo({ center, zoom, pitch, bearing })
      else m.flyTo({ center, zoom, pitch, bearing, duration: 1800 })
    } else {
      const b = boundsOf(data.features.map(f => f.geometry.coordinates as LngLat))
      // 顶部留 150px:搜索框 + 两排 chips 浮在地图上,别让最北边的点钻到它们底下
      if (b) m.fitBounds(b, { padding: { top: 150, bottom: 60, left: 60, right: 60 }, pitch: 0, bearing: 0, maxZoom: 12, duration: reducedMotion ? 0 : 1200 })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCity, ready])

  // 3) 聚焦某店:高亮 + 飞过去(给卡片留出位置)
  useEffect(() => {
    const m = mapRef.current
    if (!m || !ready) return
    if (lastFocusRef.current) m.setFeatureState({ source: SOURCE_ID, id: lastFocusRef.current }, { active: false })
    lastFocusRef.current = focusPlace?.properties.slug ?? null
    if (!focusPlace) return
    m.setFeatureState({ source: SOURCE_ID, id: focusPlace.properties.slug }, { active: true })
    const mobile = window.matchMedia('(max-width: 767px)').matches
    const opts = {
      center: focusPlace.geometry.coordinates as LngLat,
      zoom: 16,
      pitch: 55,
      padding: mobile ? { top: 0, bottom: 260, left: 0, right: 0 } : { top: 0, bottom: 0, left: 0, right: 380 },
    }
    if (reducedMotion) m.jumpTo(opts)
    else m.flyTo({ ...opts, duration: 1500 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusPlace, ready])

  // 4) 分类筛选:重设数据(聚合数字跟着变)
  useEffect(() => {
    const m = mapRef.current
    if (!m || !ready) return
    const src = m.getSource(SOURCE_ID) as GeoJSONSource | undefined
    src?.setData({ ...data, features: data.features.filter(f => kinds.includes(f.properties.kind)) })
  }, [kinds, data, ready])

  // 外层负责铺满;maplibre-gl.css 里 `.maplibregl-map{position:relative}`(非 layer)会压过 Tailwind 的 `absolute`,
  // 所以容器本身用 h-full w-full,不依赖它的 position
  return (
    <div className="absolute inset-0">
      <div ref={containerRef} className="h-full w-full" />
    </div>
  )
}
