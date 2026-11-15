'use client'

import { useEffect, useRef, useState, type RefObject } from 'react'
import {
  AttributionControl,
  Map as MapLibreMap,
  setWorkerUrl,
  type GeoJSONSource,
  type MapLayerMouseEvent,
  type PaddingOptions,
  type StyleSpecification,
} from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import './walker.css'
import type { Point } from 'geojson'
import { basePath } from '@/lib/basePath'
import { makeBadge, makeGenericLandmark, makeLabelBackground } from './mapImages'
import { WalkerController } from './walkerController'
import { KIND_ORDER } from '@/lib/map/kinds'
import { boundsOf, haversineMeters } from '@/lib/map/geo'
import { inBounds, type City } from '@/lib/map/cities'
import { EMPTY_MANIFEST, hasIcon, imageSpecs, parseManifest, storefrontSlugs, walkerSprite, type AssetManifest, type ImageSpec } from '@/lib/map/assets'
import type { LandmarkCollection } from '@/lib/map/landmarks'
import type { Vec } from '@/lib/map/walker'
import type { PlaceCollection, PlaceFeature } from '@/lib/map/placesToGeoJSON'
import type { LngLat, PlaceKind } from '@/lib/places'

export const SOURCE_ID = 'places'
export const SOURCE_LANDMARKS = 'landmarks'
export const LAYER_CLUSTER = 'place-cluster'
export const LAYER_CLUSTER_COUNT = 'place-cluster-count'
export const LAYER_STOREFRONT = 'place-storefront'
export const LAYER_LABEL = 'place-label'
export const LAYER_BADGE = 'place-badge'
export const LAYER_LANDMARK = 'landmark'
const GENERIC_LANDMARK = 'lm-generic'

// MapLibre 的 padding 是持久的:每次镜头操作都显式给,卡片关闭时复位。
// 注意 fitBounds 默认把 padding 叠加在地图"当前 padding"上且不持久化,所以 fitBounds 都要带 absolutePadding: true
// (maplibre 7 起成为默认);flyTo / easeTo / jumpTo 传的 padding 本来就是替换并持久。
const OVERVIEW_PADDING = { top: 150, bottom: 60, left: 60, right: 60 }
const CITY_PADDING = { top: 150, bottom: 80, left: 40, right: 40 }
// 手机:右下角有 ~150px 高的虚拟方向键,底部要多留,否则最南的店会被它盖住
const CITY_PADDING_MOBILE = { top: 150, bottom: 200, left: 40, right: 40 }
const isMobileViewport = () => window.matchMedia('(max-width: 767px)').matches
const cityPadding = () => (isMobileViewport() ? CITY_PADDING_MOBILE : CITY_PADDING)
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
  landmarks: LandmarkCollection
  cities: City[]
  lang: 'en' | 'zh'
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

type LoadedImage = ImageSpec & { bitmap: ImageBitmap }

/** 读资产清单;404 / 坏 JSON 都当空清单(全部回退占位) */
async function fetchManifest(): Promise<AssetManifest> {
  try {
    const res = await fetch(`${basePath}/map-assets/manifest.json`)
    if (!res.ok) return EMPTY_MANIFEST
    return parseManifest(await res.json())
  } catch {
    return EMPTY_MANIFEST
  }
}

/** 建图前把全部资产图片取成 ImageBitmap;单张失败只影响那一张(回退占位) */
async function preloadImages(specs: ImageSpec[]): Promise<LoadedImage[]> {
  const results = await Promise.all(
    specs.map(async s => {
      try {
        const res = await fetch(s.url)
        if (!res.ok) throw new Error(String(res.status))
        return { ...s, bitmap: await createImageBitmap(await res.blob()) }
      } catch (err) {
        console.warn('[map] 资产加载失败,回退占位:', s.id, err)
        return null
      }
    }),
  )
  return results.filter((r): r is LoadedImage => r !== null)
}

const landmarkTextField = (lang: 'en' | 'zh') => ['get', lang === 'en' ? 'name_en' : 'name_zh'] as ['get', string]

export default function MapView(props: Props) {
  const { styleUrl, data, landmarks, cities, lang, activeCity, focusPlace, walkTarget, kinds, reducedMotion, apiRef } = props
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
  // 地图此刻"应有"的 padding(总览 / 城市 / 卡片)。凡是自己不换 padding 的镜头操作(聚合圈点击、🍍、3D、小人起步拉近)
  // 都要带上它:MapLibre 里任何不带 padding 的镜头调用,会把进行中的 padding 过渡打断在半截并留在那里
  const padRef = useRef<PaddingOptions>(OVERVIEW_PADDING)

  // 1) 建图(只跑一次;StrictMode 下会跑两遍,靠 cancelled 守住)。reducedMotion 只在建图时读一次。
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    let map: MapLibreMap | null = null
    let cancelled = false
    ;(async () => {
      try {
        if (!('WebGL2RenderingContext' in window)) throw new Error('WebGL2 不可用')
        // 样式、资产清单、资产图片一起取:图片要在 style.load 时同步 addImage,首帧才有贴图(否则 fill-pattern 会闪空)
        const [styleRes, manifest] = await Promise.all([fetch(styleUrl), fetchManifest()])
        if (!styleRes.ok) throw new Error(`样式加载失败 ${styleRes.status} ${styleUrl}`)
        const [style, images] = await Promise.all([
          styleRes.json() as Promise<StyleSpecification>,
          preloadImages(imageSpecs(manifest, basePath)),
        ])
        if (cancelled) return
        const loadedIds = new Set(images.map(i => i.id))
        const landmarkData: LandmarkCollection = {
          ...landmarks,
          features: landmarks.features.map(f => ({
            ...f,
            properties: { ...f.properties, icon: loadedIds.has(f.properties.icon) ? f.properties.icon : GENERIC_LANDMARK },
          })),
        }
        const shops = storefrontSlugs(manifest).filter(s => loadedIds.has(`shop-${s}`))

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
        // style.load 在首帧渲染前触发:此时注册贴图 / 图标,样式里的 fill-pattern 从第一帧起就能画
        map.once('style.load', () => {
          const m = mapRef.current
          if (!m) return
          for (const img of images) m.addImage(img.id, img.bitmap, { pixelRatio: img.pixelRatio })
        })
        map.once('load', () => {
          const m = mapRef.current
          if (!m) return
          const lb = makeLabelBackground()
          m.addImage('label-bg', lb.image, lb.options)
          // 徽章:收件箱有 PNG 就用 PNG(style.load 时已注册),没有就画布占位
          for (const k of KIND_ORDER) {
            if (hasIcon(manifest, `badge-${k}`) && loadedIds.has(`badge-${k}`)) continue
            const b = makeBadge(k)
            m.addImage(`badge-${k}`, b.image, b.options)
          }
          const gl = makeGenericLandmark()
          m.addImage(GENERIC_LANDMARK, gl.image, gl.options)

          // 地标图层先加:后加的 places 图层在碰撞时优先(店名永远不让位给地标)
          m.addSource(SOURCE_LANDMARKS, { type: 'geojson', data: landmarkData })
          m.addLayer({
            id: LAYER_LANDMARK, type: 'symbol', source: SOURCE_LANDMARKS,
            filter: ['>=', ['zoom'], ['get', 'minzoom']],
            layout: {
              'icon-image': ['get', 'icon'],
              'icon-size': ['interpolate', ['linear'], ['zoom'], 12, 0.45, 15, 0.7, 17, 1.0],
              'icon-anchor': 'bottom',
              'icon-pitch-alignment': 'viewport',
              'text-field': landmarkTextField(lang),
              'text-font': ['Noto Sans Regular'],
              'text-size': 11,
              'text-anchor': 'top',
              'text-offset': [0, 0.3],
              'text-pitch-alignment': 'viewport',
              'text-optional': true,
            },
            paint: {
              'text-color': '#3B392C',
              'text-halo-color': '#F8F2DD',
              'text-halo-width': 1.5,
            },
          })

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
          // 店面小插画:只给收件箱里有 shop-<slug>.png 的店,街道级才出现,压在标签下面
          if (shops.length) {
            m.addLayer({
              id: LAYER_STOREFRONT, type: 'symbol', source: SOURCE_ID, minzoom: 15.5,
              filter: ['all', ['!', ['has', 'point_count']], ['in', ['get', 'slug'], ['literal', shops]]],
              layout: {
                'icon-image': ['concat', 'shop-', ['get', 'slug']],
                'icon-size': ['interpolate', ['linear'], ['zoom'], 15.5, 0.5, 17, 0.8, 18, 1],
                'icon-anchor': 'bottom',
                'icon-pitch-alignment': 'viewport',
                'icon-allow-overlap': true,
                'icon-ignore-placement': true,
              },
            })
          }
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
          const clickable = [LAYER_LABEL, LAYER_BADGE, ...(shops.length ? [LAYER_STOREFRONT] : [])]
          for (const id of clickable) m.on('click', id, pick)
          m.on('click', LAYER_CLUSTER, async e => {
            const f = e.features?.[0]
            if (!f) return
            const src = m.getSource(SOURCE_ID) as GeoJSONSource
            const zoom = await src.getClusterExpansionZoom(Number(f.properties.cluster_id))
            m.easeTo({ center: (f.geometry as Point).coordinates as LngLat, zoom, padding: padRef.current })
          })
          m.on('click', e => {
            const hits = m.queryRenderedFeatures(e.point, { layers: [...clickable, LAYER_CLUSTER] })
            if (hits.length === 0) cbRef.current.onMapClick()
          })
          for (const id of [...clickable, LAYER_CLUSTER]) {
            m.on('mouseenter', id, () => { m.getCanvas().style.cursor = 'pointer' })
            m.on('mouseleave', id, () => { m.getCanvas().style.cursor = '' })
          }

          // 小人:事件全部转发到最新的回调;near 高亮直接改 feature-state。雪碧图:有手绘版用手绘版
          const walker = new WalkerController(m, walkerSprite(manifest, basePath), reducedMotion, {
            onArrive: slug => cbRef.current.onArrive(slug),
            onLeave: slug => cbRef.current.onLeave(slug),
            onNear: slug => {
              if (lastNearRef.current) m.setFeatureState({ source: SOURCE_ID, id: lastNearRef.current }, { near: false })
              lastNearRef.current = slug
              if (slug) m.setFeatureState({ source: SOURCE_ID, id: slug }, { near: true })
            },
          }, () => padRef.current)
          walkerRef.current = walker
          apiRef.current = {
            setInput: dir => walker.setInput(dir),
            recenter: () => {
              if (!walker.isVisible()) return
              m.easeTo({ center: walker.position(), zoom: Math.max(m.getZoom(), 15), padding: padRef.current, duration: reducedMotion ? 0 : 500 })
            },
            togglePitch: () => m.easeTo({ pitch: m.getPitch() > 20 ? 0 : 55, padding: padRef.current, duration: reducedMotion ? 0 : 500 }),
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
    // data / landmarks 只在建图时用一次,后续通过 setData 更新;只有 styleUrl 变化才重建
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [styleUrl])

  // 2) 城市切换 / 总览:城市视角框住该城所有店;小人出现在城市中心(单店城市:店南边一点)
  useEffect(() => {
    const m = mapRef.current
    const walker = walkerRef.current
    if (!m || !walker || !ready) return
    const city = cities.find(c => c.slug === activeCity)
    if (!city) {
      padRef.current = OVERVIEW_PADDING
      walker.hide()
      const b = boundsOf(data.features.map(f => f.geometry.coordinates as LngLat))
      if (b) m.fitBounds(b, { padding: OVERVIEW_PADDING, absolutePadding: true, pitch: 0, bearing: 0, maxZoom: 12, duration: reducedMotion ? 0 : 1200 })
      return
    }
    const inCity = data.features
      .map(f => f.geometry.coordinates as LngLat)
      .filter(c => inBounds(c, city.bounds))
    padRef.current = cityPadding()
    const cam = { pitch: city.view.pitch, bearing: city.view.bearing, padding: padRef.current }
    let spawn: LngLat
    if (inCity.length >= 2) {
      const b = boundsOf(inCity) as [LngLat, LngLat]
      m.fitBounds(b, { ...cam, absolutePadding: true, maxZoom: city.view.zoom, duration: reducedMotion ? 0 : 1800 })
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
    const hadFocus = lastFocusRef.current !== null
    if (lastFocusRef.current) m.setFeatureState({ source: SOURCE_ID, id: lastFocusRef.current }, { active: false })
    lastFocusRef.current = focusPlace?.properties.slug ?? null
    if (!focusPlace) {
      padRef.current = activeCity ? cityPadding() : OVERVIEW_PADDING
      // 只有"刚关掉卡片"才需要把 padding 缓动回去。首次加载 / 卡片开着切城市时,上面的城市 effect 已经起了
      // 带 padding 的 fitBounds / flyTo,这里再 easeTo 会把它打断(MapLibre 任何镜头调用都会 stop 掉进行中的动画)
      if (hadFocus && !m.isMoving()) m.easeTo({ padding: padRef.current, duration: reducedMotion ? 0 : 300 })
      return
    }
    m.setFeatureState({ source: SOURCE_ID, id: focusPlace.properties.slug }, { active: true })
    const center = focusPlace.geometry.coordinates as LngLat
    // 不是走着到的(URL 直达 / 减少动态 / 搜索)就瞬移过去;走着到的别打断庆祝动画
    if (!walker.isVisible() || haversineMeters(walker.position(), center) > 5) walker.placeAt(center)
    padRef.current = isMobileViewport() ? CARD_PADDING_MOBILE : CARD_PADDING_DESKTOP
    const opts = { center, zoom: 16, pitch: 55, padding: padRef.current }
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

  // 6) 语言切换:地标名跟随(店名是品牌名,不翻译)
  useEffect(() => {
    const m = mapRef.current
    if (!m || !ready || !m.getLayer(LAYER_LANDMARK)) return
    m.setLayoutProperty(LAYER_LANDMARK, 'text-field', landmarkTextField(lang))
  }, [lang, ready])

  // 外层负责铺满;maplibre-gl.css 里 `.maplibregl-map{position:relative}`(非 layer)会压过 Tailwind 的 `absolute`,
  // 所以容器本身用 h-full w-full,不依赖它的 position
  return (
    <div className="absolute inset-0">
      <div ref={containerRef} className="h-full w-full" />
    </div>
  )
}
