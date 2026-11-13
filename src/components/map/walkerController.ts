import type { Map as MapLibreMap } from 'maplibre-gl'
import type { LngLat } from '@/lib/places'
import { buildPath, haversineMeters, pathPosition } from '@/lib/map/geo'
import {
  autoWalkDuration, facingFromDx, isZero, movePoint, proximityStep,
  FREE_WALK_MIN_ZOOM, NEAR_IDLE, ZERO, type NearState, type PlacePoint, type Vec,
} from '@/lib/map/walker'
import { WalkerMarker } from './walkerMarker'

export type WalkerEvents = {
  /** 自动行走到达 / 自由行走在店门口停满时长 */
  onArrive: (slug: string) => void
  /** 进入 / 离开某店门口范围(用于高亮标签);null = 不在任何店门口 */
  onNear: (slug: string | null) => void
  /** 从某店门口走开(超过 EXIT 半径) */
  onLeave: (slug: string) => void
}

type AutoWalk = { slug: string; path: LngLat[]; start: number; duration: number }

/**
 * 小人的状态与动画循环。状态:
 *   idle  —— 站着(循环不跑)
 *   auto  —— 沿直线走向某店,镜头锁定
 *   free  —— 按方向键 / 摇杆移动,镜头锁定,每帧做邻近判定
 * 只碰 map 与 marker;要通知 React 的事情全部走 events。
 */
export class WalkerController {
  private readonly marker: WalkerMarker
  private places: PlacePoint[] = []
  private input: Vec = ZERO
  private auto: AutoWalk | null = null
  private near: NearState = NEAR_IDLE
  private raf = 0
  private last = 0
  private facing: 1 | -1 = 1
  private visible = false
  private celebratingUntil = 0
  private celebrateTimer = 0
  /** 自由操控起步时的拉近动画结束时刻;期间不做镜头锁定,免得打断它 */
  private zoomingUntil = 0

  constructor(
    private readonly map: MapLibreMap,
    spriteUrl: string,
    private readonly reducedMotion: boolean,
    private readonly events: WalkerEvents,
  ) {
    this.marker = new WalkerMarker(spriteUrl)
    const c = map.getCenter()
    this.marker.setLngLat([c.lng, c.lat]) // addTo 之前必须有坐标
    this.marker.addTo(map)
  }

  /** 当前可"走到"的店(当前城市 ∩ 当前分类筛选) */
  setPlaces(places: PlacePoint[]): void {
    this.places = places
    this.near = NEAR_IDLE
  }

  position(): LngLat {
    return this.marker.getLngLat()
  }

  isVisible(): boolean {
    return this.visible
  }

  /** 瞬移到某点并站定(进入城市、卡片打开、减少动态时用) */
  placeAt(p: LngLat): void {
    this.auto = null
    this.marker.setLngLat(p)
    this.marker.setAction('idle')
    this.near = NEAR_IDLE
    this.show()
  }

  show(): void {
    this.visible = true
    this.marker.show()
  }

  hide(): void {
    this.visible = false
    this.auto = null
    this.input = ZERO
    this.marker.hide()
    this.stopLoop()
  }

  /** 自动行走(直线)到某店;到达时触发 onArrive。减少动态 → 直接瞬移 */
  walkTo(slug: string, to: LngLat): void {
    if (!this.visible) this.show()
    const from = this.position()
    if (this.reducedMotion) {
      this.placeAt(to)
      this.events.onArrive(slug)
      return
    }
    this.input = ZERO
    this.auto = { slug, path: buildPath([from, to]), start: performance.now(), duration: autoWalkDuration(haversineMeters(from, to)) }
    this.marker.setAction('walk')
    this.startLoop()
  }

  /** 自由操控输入:屏幕方向单位向量,ZERO = 松开 */
  setInput(dir: Vec): void {
    if (!this.visible) return
    const wasZero = isZero(this.input)
    this.input = dir
    if (isZero(dir)) {
      if (!this.auto && performance.now() > this.celebratingUntil) this.marker.setAction('idle')
      return
    }
    this.auto = null
    if (wasZero && this.map.getZoom() < FREE_WALK_MIN_ZOOM) {
      // 城市级缩放下 30 m 半径根本点不中:先拉近到街道级再走
      const duration = this.reducedMotion ? 0 : 600
      this.zoomingUntil = performance.now() + duration
      this.map.easeTo({ center: this.position(), zoom: FREE_WALK_MIN_ZOOM + 0.5, pitch: 55, duration })
    }
    this.marker.setAction('walk')
    this.startLoop()
  }

  destroy(): void {
    this.stopLoop()
    window.clearTimeout(this.celebrateTimer)
    this.marker.remove()
  }

  private startLoop(): void {
    if (this.raf) return
    this.last = performance.now()
    this.raf = requestAnimationFrame(this.frame)
  }

  private stopLoop(): void {
    if (this.raf) cancelAnimationFrame(this.raf)
    this.raf = 0
  }

  private frame = (now: number): void => {
    this.raf = 0
    const dt = Math.min(64, now - this.last) // 切后台回来不要一帧跳很远
    this.last = now
    if (this.auto) this.stepAuto(now)
    else if (!isZero(this.input)) this.stepFree(dt, now)
    if (this.auto || !isZero(this.input)) this.raf = requestAnimationFrame(this.frame)
  }

  private stepAuto(now: number): void {
    const a = this.auto as AutoWalk
    const t = Math.min(1, (now - a.start) / a.duration)
    const { pos, facing } = pathPosition(a.path, t)
    this.marker.setLngLat(pos)
    this.setFacing(facing)
    this.map.easeTo({ center: pos, duration: 0 })
    if (t >= 1) {
      this.auto = null
      this.celebrate()
      this.events.onArrive(a.slug)
    }
  }

  private stepFree(dt: number, now: number): void {
    const p = this.map.project(this.position())
    const next = movePoint({ x: p.x, y: p.y }, this.input, dt)
    const ll = this.map.unproject([next.x, next.y])
    const pos: LngLat = [ll.lng, ll.lat]
    this.marker.setLngLat(pos)
    this.setFacing(facingFromDx(this.input.x, this.facing))
    if (now > this.celebratingUntil) this.marker.setAction('walk')
    // 镜头锁定小人(规格里的"35% 软跟随"简化为锁定);拉近动画期间先不抢镜头
    if (now > this.zoomingUntil) this.map.easeTo({ center: pos, duration: 0 })

    const r = proximityStep(this.near, pos, this.places, now)
    const nearChanged = r.state.near !== this.near.near
    this.near = r.state
    if (nearChanged) this.events.onNear(r.state.near)
    if (r.left) this.events.onLeave(r.left)
    if (r.arrive) {
      this.celebrate()
      this.events.onArrive(r.arrive)
    }
  }

  private celebrate(): void {
    this.marker.setAction('celebrate') // CSS 里跳 3 次 × 0.5 s
    this.celebratingUntil = performance.now() + 1500
    window.clearTimeout(this.celebrateTimer)
    this.celebrateTimer = window.setTimeout(() => {
      if (!this.auto && isZero(this.input)) this.marker.setAction('idle')
    }, 1500)
  }

  private setFacing(f: 1 | -1): void {
    this.facing = f
    this.marker.setFacing(f)
  }
}
