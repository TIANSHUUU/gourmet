'use client'

import { useEffect, useRef, useState, type RefObject } from 'react'
import {
  AttributionControl,
  Map as MapLibreMap,
  setWorkerUrl,
  type GeoJSONSource,
  type MapLayerMouseEvent,
  type StyleSpecification,
} from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import './walker.css'
import type { Point } from 'geojson'
import { basePath } from '@/lib/basePath'
import { makeBadge, makeLabelBackground } from './mapImages'
import { WalkerController } from './walkerController'
import { KIND_ORDER } from '@/lib/map/kinds'
import { boundsOf, haversineMeters } from '@/lib/map/geo'
import { inBounds, type City } from '@/lib/map/cities'
import type { Vec } from '@/lib/map/walker'
import type { PlaceCollection, PlaceFeature } from '@/lib/map/placesToGeoJSON'
import type { LngLat, PlaceKind } from '@/lib/places'

export const SOURCE_ID = 'places'
export const LAYER_CLUSTER = 'place-cluster'
export const LAYER_CLUSTER_COUNT = 'place-cluster-count'
export const LAYER_LABEL = 'place-label'
export const LAYER_BADGE = 'place-badge'

// MapLibre 的 padding 是持久的:每次镜头操作都显式给,卡片关闭时复位
const OVERVIEW_PADDING = { top: 150, bottom: 60, left: 60, right: 60 }
const CITY_PADDING = { top: 150, bottom: 80, left: 40, right: 40 }
const CARD_PADDING_MOBILE = { top: 0, bottom: 260, left: 0, right: 0 }
const CARD_PADDING_DESKTOP = { top: 0, bottom: 0, left: 0, right: 380 }
/** 单店城市:小人出生在店南边约 90 m,免得一按键就"到达" */
const SPAWN_OFFSET_LAT = -0.0008

/** 父组件通过 apiRef 调用的命令(键盘 / DPad / 按钮) */
export type MapApi = {
  setInput: (dir: Vec) => void
  recenter: () => void
  togglePitch: () => void
}

type Props = {
  /** 已带 basePath 的样式 JSON 地址 */
  styleUrl: string
  data: PlaceCollection
  cities: City[]
  /** null = 总览(框住全部地点,小人隐藏) */
  activeCity: string | null
  /** 卡片打开的地点:镜头飞过去、高亮、小人站过去 */
  focusPlace: PlaceFeature | null
  /** 点标签后要走去的店;nonce 让连点同一家也能重新走 */
  walkTarget: { slug: string; nonce: number } | null
  /** 当前显示的分类 */
  kinds: PlaceKind[]
  reducedMotion: boolean
  apiRef: RefObject<MapApi | null>
  onPlaceClick: (slug: string) => void
  /** 点到空白处(用于收起卡片) */
  onMapClick: () => void
  /** 小人到达某店(自动行走到达 / 自由行走停留满时长) */
  onArrive: (slug: string) => void
  /** 小人从某店门口走开 */
  onLeave: (slug: string) => void
  /** 样式拿不到 / WebGL 不可用 → 父组件切到纯列表 */
  onFail: (err: unknown) => void
}

export default function MapView(props: Props) {
  const { styleUrl, data, cities, activeCity, focusPlace, walkTarget, kinds, reducedMotion, apiRef } = props
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MapLibreMap | null>(null)
  const walkerRef = useRef<WalkerController | null>(null)
  const [ready, setReady] = useState(false)
  // 回调放 ref:父组件每次渲染传新函数,不应触发重建地图
  const cbRef = useRef({ onPlaceClick: props.onPlaceClick, onMapClick: props.onMapClick, onArrive: props.onArrive, onLeave: props.onLeave, onFail: props.onFail })
  useEffect(() => {
    cbRef.current = { onPlaceClick: props.onPlaceClick, onMapClick: props.onMapClick, onArrive: props.onArrive, onLeave: props.onLeave, onFail: props.onFail }
  })
  const lastFocusRef = useRef<string | null>(null)
  const lastNearRef = useRef<string | null>(null)

  // 1) 建图(只跑一次;StrictMode 下会跑两遍,靠 cancelled 守住)。reducedMotion 只在建图时读一次。
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
          attributionControl: false,
        })
        // 署名放左下:右下 / 底部会被卡片盖住(手机端卡片里另有一行署名)
        map.addControl(new AttributionControl({ compact: false }), 'bottom-left')
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
              // active = 卡片打开的店(橙);near = 小人站在门口的店(蓝)
              'text-color': [
                'case',
                ['boolean', ['feature-state', 'active'], false], '#F0742A',
                ['boolean', ['feature-state', 'near'], false], '#0F84B5',
                '#2B2A24',
              ],
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

          // 小人:事件全部转发到最新的回调;near 高亮直接改 feature-state
          const walker = new WalkerController(m, `${basePath}/sprites/pineapple-classic.png`, reducedMotion, {
            onArrive: slug => cbRef.current.onArrive(slug),
            onLeave: slug => cbRef.current.onLeave(slug),
            onNear: slug => {
              if (lastNearRef.current) m.setFeatureState({ source: SOURCE_ID, id: lastNearRef.current }, { near: false })
              lastNearRef.current = slug
              if (slug) m.setFeatureState({ source: SOURCE_ID, id: slug }, { near: true })
            },
          })
          walkerRef.current = walker
          apiRef.current = {
            setInput: dir => walker.setInput(dir),
            recenter: () => {
              if (!walker.isVisible()) return
              m.easeTo({ center: walker.position(), zoom: Math.max(m.getZoom(), 15), duration: reducedMotion ? 0 : 500 })
            },
            togglePitch: () => m.easeTo({ pitch: m.getPitch() > 20 ? 0 : 55, duration: reducedMotion ? 0 : 500 }),
          }
          setReady(true)
        })
      } catch (err) {
        cbRef.current.onFail(err)
      }
    })()
    return () => {
      cancelled = true
      apiRef.current = null
      walkerRef.current?.destroy()
      walkerRef.current = null
      mapRef.current = null
      map?.remove()
    }
    // data 只在建图时用一次,后续通过 setData 更新;只有 styleUrl 变化才重建
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [styleUrl])

  // 2) 城市切换 / 总览:城市视角框住该城所有店;小人出现在城市中心(单店城市:店南边一点)
  useEffect(() => {
    const m = mapRef.current
    const walker = walkerRef.current
    if (!m || !walker || !ready) return
    const city = cities.find(c => c.slug === activeCity)
    if (!city) {
      walker.hide()
      const b = boundsOf(data.features.map(f => f.geometry.coordinates as LngLat))
      if (b) m.fitBounds(b, { padding: OVERVIEW_PADDING, pitch: 0, bearing: 0, maxZoom: 12, duration: reducedMotion ? 0 : 1200 })
      return
    }
    const inCity = data.features
      .map(f => f.geometry.coordinates as LngLat)
      .filter(c => inBounds(c, city.bounds))
    const cam = { pitch: city.view.pitch, bearing: city.view.bearing, padding: CITY_PADDING }
    let spawn: LngLat
    if (inCity.length >= 2) {
      const b = boundsOf(inCity) as [LngLat, LngLat]
      m.fitBounds(b, { ...cam, maxZoom: city.view.zoom, duration: reducedMotion ? 0 : 1800 })
      spawn = [(b[0][0] + b[1][0]) / 2, (b[0][1] + b[1][1]) / 2]
    } else if (inCity.length === 1) {
      const opts = { ...cam, center: inCity[0], zoom: city.view.zoom }
      if (reducedMotion) m.jumpTo(opts); else m.flyTo({ ...opts, duration: 1800 })
      spawn = [inCity[0][0], inCity[0][1] + SPAWN_OFFSET_LAT]
    } else {
      const opts = { ...cam, center: city.view.center, zoom: city.view.zoom }
      if (reducedMotion) m.jumpTo(opts); else m.flyTo({ ...opts, duration: 1800 })
      spawn = city.view.center
    }
    walker.placeAt(spawn)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCity, ready])

  // 3) 卡片打开的店:高亮 + 飞过去(给卡片留出位置)+ 小人站过去;关闭时复位 padding
  useEffect(() => {
    const m = mapRef.current
    const walker = walkerRef.current
    if (!m || !walker || !ready) return
    if (lastFocusRef.current) m.setFeatureState({ source: SOURCE_ID, id: lastFocusRef.current }, { active: false })
    lastFocusRef.current = focusPlace?.properties.slug ?? null
    if (!focusPlace) {
      m.easeTo({ padding: activeCity ? CITY_PADDING : OVERVIEW_PADDING, duration: reducedMotion ? 0 : 300 })
      return
    }
    m.setFeatureState({ source: SOURCE_ID, id: focusPlace.properties.slug }, { active: true })
    const center = focusPlace.geometry.coordinates as LngLat
    // 不是走着到的(URL 直达 / 减少动态 / 搜索)就瞬移过去;走着到的别打断庆祝动画
    if (!walker.isVisible() || haversineMeters(walker.position(), center) > 5) walker.placeAt(center)
    const mobile = window.matchMedia('(max-width: 767px)').matches
    const opts = { center, zoom: 16, pitch: 55, padding: mobile ? CARD_PADDING_MOBILE : CARD_PADDING_DESKTOP }
    if (reducedMotion) m.jumpTo(opts)
    else m.flyTo({ ...opts, duration: 1500 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusPlace, ready])

  // 4) 点标签 → 小人走过去
  useEffect(() => {
    const walker = walkerRef.current
    if (!walker || !ready || !walkTarget) return
    const f = data.features.find(x => x.properties.slug === walkTarget.slug)
    if (f) walker.walkTo(walkTarget.slug, f.geometry.coordinates as LngLat)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walkTarget, ready])

  // 5) 分类筛选:重设数据(聚合数字跟着变);小人的"可到达店铺" = 当前城市 ∩ 当前分类
  useEffect(() => {
    const m = mapRef.current
    const walker = walkerRef.current
    if (!m || !walker || !ready) return
    const shown = data.features.filter(f => kinds.includes(f.properties.kind))
    const src = m.getSource(SOURCE_ID) as GeoJSONSource | undefined
    src?.setData({ ...data, features: shown })
    const city = cities.find(c => c.slug === activeCity)
    walker.setPlaces(
      shown
        .filter(f => !city || inBounds(f.geometry.coordinates as LngLat, city.bounds))
        .map(f => ({ slug: f.properties.slug, coords: f.geometry.coordinates as LngLat })),
    )
  }, [kinds, data, cities, activeCity, ready])

  // 外层负责铺满;maplibre-gl.css 里 `.maplibregl-map{position:relative}`(非 layer)会压过 Tailwind 的 `absolute`,
  // 所以容器本身用 h-full w-full,不依赖它的 position
  return (
    <div className="absolute inset-0">
      <div ref={containerRef} className="h-full w-full" />
    </div>
  )
}
