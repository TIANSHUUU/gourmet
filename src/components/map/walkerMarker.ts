import { Marker, type Map as MapLibreMap } from 'maplibre-gl'
import type { LngLat } from '@/lib/places'

export type WalkerAction = 'idle' | 'walk' | 'celebrate'

/** 小人相对坐标点的屏幕偏移(像素):站在"门口右下",让白色店名标签与店面小插画保持可见 */
export const WALKER_OFFSET: [number, number] = [22, 6]

/**
 * 菠萝子 marker。
 * MapLibre 会覆写 marker 根元素的 transform 来定位,所以缩放/翻转类必须挂在内层 .pp-sprite 上,
 * 根元素只是定位壳(与 travel-timeline retroMap.ts 同一个坑)。
 * 根元素布局尺寸是 128×160(transform 不改布局),anchor: 'bottom' 对齐的是这个盒子的底边中点;
 * 内层 transform-origin: bottom center,所以缩小后脚仍踩在坐标点上。
 * offset 只影响屏幕位置,getLngLat() 仍是坐标点本身,所以邻近判定不受影响。
 */
export class WalkerMarker {
  readonly marker: Marker
  private readonly wrap: HTMLDivElement
  private readonly sprite: HTMLDivElement
  private action: WalkerAction = 'idle'
  private facing: 1 | -1 = 1

  constructor(spriteUrl: string) {
    this.wrap = document.createElement('div')
    this.wrap.className = 'pp-wrap pp-hidden'
    this.sprite = document.createElement('div')
    this.sprite.className = 'pp-sprite pp-map pp-idle'
    this.sprite.style.backgroundImage = `url(${spriteUrl})`
    this.wrap.appendChild(this.sprite)
    this.marker = new Marker({
      element: this.wrap,
      anchor: 'bottom',
      offset: WALKER_OFFSET,
      pitchAlignment: 'viewport', // 俯视时小人保持直立
      rotationAlignment: 'viewport',
    })
  }

  addTo(map: MapLibreMap): this {
    this.marker.addTo(map)
    return this
  }

  remove(): void {
    this.marker.remove()
  }

  setLngLat(p: LngLat): void {
    this.marker.setLngLat(p)
  }

  getLngLat(): LngLat {
    const l = this.marker.getLngLat()
    return [l.lng, l.lat]
  }

  show(): void {
    this.wrap.classList.remove('pp-hidden')
  }

  hide(): void {
    this.wrap.classList.add('pp-hidden')
  }

  setAction(a: WalkerAction): void {
    if (a === this.action) return
    this.sprite.classList.remove(`pp-${this.action}`)
    this.sprite.classList.add(`pp-${a}`)
    this.action = a
  }

  getAction(): WalkerAction {
    return this.action
  }

  setFacing(f: 1 | -1): void {
    if (f === this.facing) return
    this.facing = f
    this.sprite.classList.toggle('pp-flip', f === -1)
  }
}
