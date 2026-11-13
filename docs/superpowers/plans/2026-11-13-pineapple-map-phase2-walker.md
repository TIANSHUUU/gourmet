# 菠萝子地图 Phase 2:菠萝子小人 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 `/map` 上加入会走路的像素菠萝子:点标签它自己走过去、到达弹卡片;桌面方向键 / 手机虚拟方向键可以自由操控,走进店铺 30 m 停 0.4 s 弹卡片;另加右下角「回到菠萝子 / 俯视切换」按钮,并把地图署名挪到不被卡片遮住的位置。

**Architecture:** 纯逻辑(按键 → 方向向量、自动行走时长、屏幕坐标推进、邻近迟滞判定)在 `src/lib/map/walker.ts` + `geo.ts`,vitest 覆盖;DOM 与动画循环收进 `WalkerController`(一个 class,持有 MapLibre `Marker` + 像素雪碧图,跑 rAF 循环,对外只有 `placeAt / walkTo / setInput / setPlaces / hide / destroy` 与三个事件回调);`MapView` 创建控制器并通过 `apiRef` 暴露 `setInput / recenter / togglePitch` 给父组件的键盘监听、`DPad` 与 `MapControls`。小人形象直接复用 travel-timeline 的像素雪碧图(Phase 3 换手绘版时帧表不变、CSS 零改动)。

**Tech Stack:** 与 Phase 1 相同(Next 16 静态导出 · React 19 · Tailwind 4 · maplibre-gl 6 · vitest 2),无新依赖。

**前置:** Phase 1 已合并上线(`/map`、`MapView.tsx`、`MapPageClient.tsx`、`src/lib/map/*` 都在 `main`)。

**设计文档:** `web/docs/superpowers/specs/2026-11-13-pineapple-map-design.md`(§5.2 布局、§5.4 交互流程、§6.6 小人系统、§8 Phase 2 验收)

---

## 开工前必读

1. `web/CLAUDE.md`(尤其 **Map (`/map`)** 一节:worker 副本、maplibre CSS 压过 Tailwind、`.env.local`)与 `web/AGENTS.md`。
2. 所有命令在 `/Users/tantianshu/Documents/code/gourmet/web` 下执行;`git` 也在这里。先 `git switch -c feat/map-phase2`。
3. 本地 dev 必须有 `web/.env.local` 含 `NEXT_PUBLIC_BASE_PATH=/gourmet`(Phase 1 已建;换机器要重建),否则 `public/` 下的雪碧图 404。
4. **与规格的两处有意简化**(执行时不要"修回去"):
   - 自由操控时镜头**锁定**在小人身上(每帧 `easeTo({ center, duration: 0 })`),而不是规格 §6.6 写的「离开中心 35% 区域才软跟随」——锁定更简单,也更像俯视角游戏;松手后用户仍可随意拖地图。
   - 行走路径是直线(规格 Phase 3 才考虑沿街路由)。
5. **MapLibre 的 `padding` 是持久的**:`flyTo / easeTo / jumpTo / fitBounds` 里传过的 `padding` 会留在地图上,影响之后所有以 `center` 为准的镜头操作。本阶段每个镜头操作都**显式**带 padding(常量在 `MapView.tsx` 顶部),卡片关闭时把 padding 复位成城市级 padding。
6. 有意留到以后的(不要顺手做):音效、沿街路由、手绘小人、小人的朝向以外的动画。
7. 视觉与交互任务的「完成」证据是截图与逐项核对,不是「应该没问题」。**未经业主确认不 `git push`、不合并**。每个 Task 结束 commit 一次。

---

## 文件结构

| 文件 | 操作 | 职责 |
|---|---|---|
| `public/sprites/pineapple-classic.png` | 复制 | 像素菠萝子雪碧图(512×480:4 列 × 128px,3 行 × 160px;行0 idle×2 / 行1 walk×4 / 行2 celebrate×2) |
| `src/components/map/walker.css` | 新建 | `.pp-*` 动画类(不含图片 URL,URL 由 JS 带 basePath 设置) |
| `src/lib/map/geo.ts` | 修改 | 加 `haversineMeters`、`buildPath`、`pathPosition` |
| `src/lib/map/geo.test.ts` | 修改 | 对应测试 |
| `src/lib/map/walker.ts` | 新建 | 纯逻辑:常量、`dirFromKeys`、`normalize`、`autoWalkDuration`、`movePoint`、`facingFromDx`、`nearestWithin`、`proximityStep` |
| `src/lib/map/walker.test.ts` | 新建 | 对应测试 |
| `src/components/map/walkerMarker.ts` | 新建 | DOM:MapLibre `Marker` + 内层雪碧图元素,动作/朝向/显隐 |
| `src/components/map/walkerController.ts` | 新建 | 动画循环与状态:自动行走、自由操控、邻近判定、庆祝;只碰 map 与 marker |
| `src/components/map/DPad.tsx` | 新建 | 手机虚拟方向键(四向,按住持续) |
| `src/components/map/MapControls.tsx` | 新建 | 「回到菠萝子」「俯视切换」两个圆按钮 |
| `src/components/map/MapView.tsx` | 重写 | 接入控制器与 `apiRef`;署名挪到左下;城市视角改为框住该城所有店;`near` 高亮;padding 规范 |
| `src/components/map/MapPageClient.tsx` | 重写 | `walkTarget` 状态、键盘监听、DPad / MapControls 布局、到达 / 离开回调 |
| `src/components/map/PlaceCard.tsx` | 修改 | 手机端卡片底部加一行地图署名 |
| `src/lib/mapI18n.ts` | 修改 | 新增按钮 / 方向键文案 |
| `CLAUDE.md` | 修改 | 小人系统维护说明 |

---

### Task 1: 雪碧图资源与动画 CSS

**Files:**
- Copy: `/Users/tantianshu/Documents/code/travel-timeline/public/sprites/pineapple-classic.png` → `public/sprites/pineapple-classic.png`
- Create: `src/components/map/walker.css`

- [ ] **Step 1: 建分支、复制雪碧图**

```bash
git switch -c feat/map-phase2
mkdir -p public/sprites
cp /Users/tantianshu/Documents/code/travel-timeline/public/sprites/pineapple-classic.png public/sprites/pineapple-classic.png
sips -g pixelWidth -g pixelHeight public/sprites/pineapple-classic.png
```

Expected: `pixelWidth: 512`、`pixelHeight: 480`。

- [ ] **Step 2: 新建 `src/components/map/walker.css`**

```css
/* 像素菠萝子(移植自 travel-timeline/src/styles/sprite.css 的 .pp-* 部分)。
   雪碧图 512×480:4 列 × 128px,3 行 × 160px;行0 idle×2 / 行1 walk×4 / 行2 celebrate×2。
   背景图 URL 不写在这里(要带 basePath),由 walkerMarker.ts 用 style.backgroundImage 设置。
   Phase 3 换手绘版:保持同样的帧表布局,这个文件不用改。 */
.pp-sprite {
  width: 128px;
  height: 160px;
  background-repeat: no-repeat;
  background-position: 0 0;
  image-rendering: pixelated;
}
.pp-idle { animation: pp-idle 0.9s steps(2) infinite; }
@keyframes pp-idle { to { background-position-x: -256px; } }
.pp-walk { background-position-y: -160px; animation: pp-walk 0.5s steps(4) infinite; }
@keyframes pp-walk { to { background-position-x: -512px; } }
.pp-celebrate { background-position-y: -320px; animation: pp-cel 0.5s steps(2) 3; }
@keyframes pp-cel { to { background-position-x: -256px; } }

/* 缩放/翻转挂在内层 sprite 上:MapLibre 会覆写 marker 根元素的 transform 来定位 */
.pp-map { transform: scale(0.35); transform-origin: bottom center; }
.pp-map.pp-flip { transform: scale(0.35) scaleX(-1); }

/* 根元素(定位壳):不吃事件,点击穿透到地图 */
.pp-wrap { pointer-events: none; }
.pp-wrap.pp-hidden { display: none; }

@media (prefers-reduced-motion: reduce) {
  .pp-sprite { animation: none !important; }
}
```

- [ ] **Step 3: Commit**

```bash
git add public/sprites/pineapple-classic.png src/components/map/walker.css
git commit -m "Add pixel pineapple sprite sheet and walker animation classes"
```

---

### Task 2: `geo.ts` 补三件:距离、直线路径、路径取点(TDD)

**Files:**
- Modify: `src/lib/map/geo.ts`
- Modify: `src/lib/map/geo.test.ts`

- [ ] **Step 1: 把 `src/lib/map/geo.test.ts` 整个替换为**

```ts
import { describe, it, expect } from 'vitest'
import { boundsOf, buildPath, haversineMeters, pathPosition } from './geo'

describe('boundsOf', () => {
  it('returns null for no points', () => {
    expect(boundsOf([])).toBeNull()
  })
  it('returns [[west, south], [east, north]]', () => {
    expect(boundsOf([[144.9, -37.8], [141.2, 40.6], [140.8, -37.83]])).toEqual([[140.8, -37.83], [144.9, 40.6]])
  })
  it('collapses to the point itself for a single point', () => {
    expect(boundsOf([[1, 2]])).toEqual([[1, 2], [1, 2]])
  })
})

describe('haversineMeters', () => {
  it('is zero for the same point', () => {
    expect(haversineMeters([144.9, -37.8], [144.9, -37.8])).toBe(0)
  })
  it('Zareh → Mary\'s is roughly 260 m', () => {
    const d = haversineMeters([144.984692, -37.797961], [144.987251, -37.799096])
    expect(d).toBeGreaterThan(240)
    expect(d).toBeLessThan(280)
  })
  it('Melbourne CBD → Mount Gambier is roughly 370 km', () => {
    const d = haversineMeters([144.9671, -37.8183], [140.783782, -37.829651])
    expect(d).toBeGreaterThan(355_000)
    expect(d).toBeLessThan(385_000)
  })
})

describe('buildPath', () => {
  it('returns the input untouched for fewer than two points', () => {
    expect(buildPath([])).toEqual([])
    expect(buildPath([[1, 2]])).toEqual([[1, 2]])
  })
  it('samples each segment and ends exactly on the last point', () => {
    const p = buildPath([[0, 0], [1, 0], [1, 1]], 4)
    expect(p).toHaveLength(9) // 4 + 4 + 终点
    expect(p[0]).toEqual([0, 0])
    expect(p[4]).toEqual([1, 0])
    expect(p[8]).toEqual([1, 1])
  })
})

describe('pathPosition', () => {
  const path = buildPath([[0, 0], [10, 0]], 10)
  it('clamps t into [0, 1]', () => {
    expect(pathPosition(path, -1).pos).toEqual([0, 0])
    expect(pathPosition(path, 2).pos).toEqual([10, 0])
  })
  it('faces east when the path heads east and west when it heads west', () => {
    expect(pathPosition(path, 0.5).facing).toBe(1)
    expect(pathPosition(buildPath([[10, 0], [0, 0]], 10), 0.5).facing).toBe(-1)
  })
})
```

- [ ] **Step 2: 跑测试,确认新用例失败**

Run: `npx vitest run src/lib/map/geo.test.ts`
Expected: FAIL,`haversineMeters` / `buildPath` / `pathPosition` 不是函数(`boundsOf` 的 3 个仍通过)。

- [ ] **Step 3: 把 `src/lib/map/geo.ts` 整个替换为**

```ts
import type { LngLat } from '@/lib/places'

/** 一组坐标的外接矩形 [[西, 南], [东, 北]];空数组 → null */
export function boundsOf(points: LngLat[]): [LngLat, LngLat] | null {
  if (points.length === 0) return null
  let w = Infinity, s = Infinity, e = -Infinity, n = -Infinity
  for (const [lng, lat] of points) {
    w = Math.min(w, lng); e = Math.max(e, lng)
    s = Math.min(s, lat); n = Math.max(n, lat)
  }
  return [[w, s], [e, n]]
}

const EARTH_RADIUS_M = 6371008.8
const toRad = (deg: number) => (deg * Math.PI) / 180

/** 两点大圆距离(米) */
export function haversineMeters(a: LngLat, b: LngLat): number {
  const dLat = toRad(b[1] - a[1])
  const dLng = toRad(b[0] - a[0])
  const la1 = toRad(a[1])
  const la2 = toRad(b[1])
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h))
}

/** 折线按段等分采样(移植自 travel-timeline journey.ts);末尾补上终点 */
export function buildPath(points: LngLat[], samplesPerSeg = 48): LngLat[] {
  if (points.length < 2) return [...points]
  const out: LngLat[] = []
  for (let i = 0; i < points.length - 1; i++) {
    const [x1, y1] = points[i]
    const [x2, y2] = points[i + 1]
    for (let s = 0; s < samplesPerSeg; s++) {
      const t = s / samplesPerSeg
      out.push([x1 + (x2 - x1) * t, y1 + (y2 - y1) * t])
    }
  }
  out.push(points[points.length - 1])
  return out
}

/** 进度 t ∈ [0,1] 对应的路径点与朝向(1 = 向东 / 右,-1 = 向西 / 左) */
export function pathPosition(path: LngLat[], t: number): { pos: LngLat; facing: 1 | -1 } {
  const c = Math.min(1, Math.max(0, t))
  const idx = Math.min(path.length - 1, Math.floor(c * (path.length - 1)))
  const pos = path[idx]
  const next = path[Math.min(path.length - 1, idx + 1)]
  return { pos, facing: next[0] >= pos[0] ? 1 : -1 }
}
```

- [ ] **Step 4: 跑测试,确认通过**

Run: `npx vitest run src/lib/map/geo.test.ts`
Expected: `10 passed`。

- [ ] **Step 5: Commit**

```bash
git add src/lib/map/geo.ts src/lib/map/geo.test.ts
git commit -m "geo: add haversineMeters, buildPath, pathPosition"
```

---

### Task 3: 小人纯逻辑 `walker.ts`(TDD)

**Files:**
- Create: `src/lib/map/walker.ts`
- Create: `src/lib/map/walker.test.ts`

- [ ] **Step 1: 写失败的测试**

新建 `src/lib/map/walker.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import {
  autoWalkDuration, dirFromKeys, facingFromDx, movePoint, nearestWithin, normalize,
  proximityStep, NEAR_IDLE, WALK_KEYS, type PlacePoint,
} from './walker'

describe('dirFromKeys', () => {
  it('maps arrows and WASD to unit vectors (screen y grows downwards)', () => {
    expect(dirFromKeys(new Set(['ArrowUp']))).toEqual({ x: 0, y: -1 })
    expect(dirFromKeys(new Set(['KeyS']))).toEqual({ x: 0, y: 1 })
    expect(dirFromKeys(new Set(['KeyA']))).toEqual({ x: -1, y: 0 })
    expect(dirFromKeys(new Set(['ArrowRight']))).toEqual({ x: 1, y: 0 })
  })
  it('normalises diagonals and cancels opposites', () => {
    const d = dirFromKeys(new Set(['ArrowUp', 'ArrowRight']))
    expect(d.x).toBeCloseTo(Math.SQRT1_2)
    expect(d.y).toBeCloseTo(-Math.SQRT1_2)
    expect(dirFromKeys(new Set(['ArrowUp', 'ArrowDown']))).toEqual({ x: 0, y: 0 })
  })
  it('ignores unrelated keys and exposes the handled key set', () => {
    expect(dirFromKeys(new Set(['Space', 'Enter']))).toEqual({ x: 0, y: 0 })
    expect(WALK_KEYS.has('KeyW')).toBe(true)
    expect(WALK_KEYS.has('Space')).toBe(false)
  })
})

describe('normalize / movePoint / facingFromDx', () => {
  it('normalize keeps zero as zero', () => {
    expect(normalize({ x: 0, y: 0 })).toEqual({ x: 0, y: 0 })
    expect(normalize({ x: 3, y: 4 })).toEqual({ x: 0.6, y: 0.8 })
  })
  it('movePoint advances by speed × dt', () => {
    expect(movePoint({ x: 10, y: 10 }, { x: 1, y: 0 }, 500, 180)).toEqual({ x: 100, y: 10 })
  })
  it('facingFromDx keeps the previous facing when not moving horizontally', () => {
    expect(facingFromDx(1, -1)).toBe(1)
    expect(facingFromDx(-0.5, 1)).toBe(-1)
    expect(facingFromDx(0, -1)).toBe(-1)
  })
})

describe('autoWalkDuration', () => {
  it('clamps between 1.2 s and 4 s', () => {
    expect(autoWalkDuration(10)).toBe(1200)
    expect(autoWalkDuration(800)).toBe(2000)
    expect(autoWalkDuration(50_000)).toBe(4000)
  })
})

// 1° 纬度 ≈ 111 km → 0.0001° ≈ 11 m
const at = (dLat: number): [number, number] => [144.0, -37.0 + dLat]
const places: PlacePoint[] = [
  { slug: 'a', coords: at(0) },
  { slug: 'b', coords: at(0.005) }, // 约 555 m 外
]

describe('nearestWithin', () => {
  it('returns the closest place inside the radius, or null', () => {
    expect(nearestWithin(at(0.0001), places, 30)?.slug).toBe('a')
    expect(nearestWithin(at(0.001), places, 30)).toBeNull()
  })
})

describe('proximityStep', () => {
  it('enters, dwells, arrives once, and resets after leaving', () => {
    let r = proximityStep(NEAR_IDLE, at(0.0001), places, 0) // 11 m:进入
    expect(r.state.near).toBe('a')
    expect(r.arrive).toBeNull()

    r = proximityStep(r.state, at(0.0001), places, 200) // 停留 200 ms:还没到
    expect(r.arrive).toBeNull()

    r = proximityStep(r.state, at(0.0001), places, 450) // 停留 450 ms:到达
    expect(r.arrive).toBe('a')

    r = proximityStep(r.state, at(0.0001), places, 900) // 继续站着:不重复触发
    expect(r.arrive).toBeNull()
    expect(r.left).toBeNull()

    r = proximityStep(r.state, at(0.0004), places, 1000) // 44 m:在 30–60 m 迟滞带内,仍算在店门口
    expect(r.state.near).toBe('a')
    expect(r.left).toBeNull()

    r = proximityStep(r.state, at(0.001), places, 1100) // 111 m:走开
    expect(r.left).toBe('a')
    expect(r.state).toEqual(NEAR_IDLE)

    r = proximityStep(r.state, at(0.0001), places, 2000) // 回来:重新计时
    expect(r.state.near).toBe('a')
    expect(r.state.since).toBe(2000)
    r = proximityStep(r.state, at(0.0001), places, 2500)
    expect(r.arrive).toBe('a')
  })
  it('does nothing when no place is near', () => {
    const r = proximityStep(NEAR_IDLE, at(0.002), places, 0)
    expect(r).toEqual({ state: NEAR_IDLE, arrive: null, left: null })
  })
})
```

- [ ] **Step 2: 跑测试,确认失败**

Run: `npx vitest run src/lib/map/walker.test.ts`
Expected: FAIL,`Failed to load url ./walker`。

- [ ] **Step 3: 新建 `src/lib/map/walker.ts`**

```ts
import type { LngLat } from '@/lib/places'
import { haversineMeters } from './geo'

/** 自由操控:屏幕像素/秒(与缩放无关,手感恒定) */
export const WALK_SPEED_PX = 180
/** 进入店铺范围(米)→ 开始计时 */
export const ENTER_RADIUS_M = 30
/** 离开店铺范围(米)→ 才算走开(迟滞,避免在边界抖动) */
export const EXIT_RADIUS_M = 60
/** 在范围内停留多久触发到达 */
export const DWELL_MS = 400
/** 自由操控时若缩放低于此值,先拉近到街道级 */
export const FREE_WALK_MIN_ZOOM = 15
/** 自动行走的演出速度(米/秒)与时长上下限 */
export const AUTO_WALK_MPS = 400
export const AUTO_WALK_MIN_MS = 1200
export const AUTO_WALK_MAX_MS = 4000

export type Vec = { x: number; y: number }
export const ZERO: Vec = { x: 0, y: 0 }

// KeyboardEvent.code → 屏幕方向(y 向下为正)
const KEY_DIRS: Record<string, Vec> = {
  ArrowUp: { x: 0, y: -1 }, KeyW: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 }, KeyS: { x: 0, y: 1 },
  ArrowLeft: { x: -1, y: 0 }, KeyA: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 }, KeyD: { x: 1, y: 0 },
}
export const WALK_KEYS: ReadonlySet<string> = new Set(Object.keys(KEY_DIRS))

export function normalize(v: Vec): Vec {
  const len = Math.hypot(v.x, v.y)
  return len === 0 ? ZERO : { x: v.x / len, y: v.y / len }
}

export function isZero(v: Vec): boolean {
  return v.x === 0 && v.y === 0
}

/** 当前按下的 KeyboardEvent.code 集合 → 单位方向向量(对角线归一化,相反键抵消) */
export function dirFromKeys(codes: ReadonlySet<string>): Vec {
  let x = 0, y = 0
  for (const c of codes) {
    const d = KEY_DIRS[c]
    if (d) { x += d.x; y += d.y }
  }
  return normalize({ x, y })
}

export function autoWalkDuration(meters: number): number {
  return Math.min(AUTO_WALK_MAX_MS, Math.max(AUTO_WALK_MIN_MS, (meters / AUTO_WALK_MPS) * 1000))
}

/** 屏幕像素坐标按方向推进 dt 毫秒 */
export function movePoint(p: Vec, dir: Vec, dtMs: number, speedPx = WALK_SPEED_PX): Vec {
  const s = (speedPx * dtMs) / 1000
  return { x: p.x + dir.x * s, y: p.y + dir.y * s }
}

/** 水平位移决定朝向;不动时保持原朝向 */
export function facingFromDx(dx: number, prev: 1 | -1): 1 | -1 {
  return dx > 0 ? 1 : dx < 0 ? -1 : prev
}

export type PlacePoint = { slug: string; coords: LngLat }

export function nearestWithin(pos: LngLat, places: PlacePoint[], radiusM: number): { slug: string; dist: number } | null {
  let best: { slug: string; dist: number } | null = null
  for (const p of places) {
    const dist = haversineMeters(pos, p.coords)
    if (dist <= radiusM && (!best || dist < best.dist)) best = { slug: p.slug, dist }
  }
  return best
}

export type NearState = {
  /** 正在"门口"的店 */
  near: string | null
  /** 进入门口的时刻 */
  since: number | null
  /** 这次停留已经触发过到达的店(避免重复弹卡) */
  arrived: string | null
}
export const NEAR_IDLE: NearState = { near: null, since: null, arrived: null }

/**
 * 邻近判定(带迟滞):进入 ENTER 半径开始计时,停留满 DWELL 触发一次 arrive;
 * 离开 EXIT 半径才算走开(复位,之后可再次触发)。纯函数,时间由调用方传入。
 */
export function proximityStep(
  prev: NearState, pos: LngLat, places: PlacePoint[], now: number,
): { state: NearState; arrive: string | null; left: string | null } {
  if (prev.near) {
    const cur = places.find(p => p.slug === prev.near)
    const dist = cur ? haversineMeters(pos, cur.coords) : Infinity
    if (dist > EXIT_RADIUS_M) return { state: NEAR_IDLE, arrive: null, left: prev.near }
    if (prev.arrived !== prev.near && prev.since !== null && now - prev.since >= DWELL_MS) {
      return { state: { ...prev, arrived: prev.near }, arrive: prev.near, left: null }
    }
    return { state: prev, arrive: null, left: null }
  }
  const n = nearestWithin(pos, places, ENTER_RADIUS_M)
  if (!n) return { state: prev, arrive: null, left: null }
  return { state: { near: n.slug, since: now, arrived: null }, arrive: null, left: null }
}
```

- [ ] **Step 4: 跑测试,确认通过**

Run: `npx vitest run src/lib/map/walker.test.ts`
Expected: `10 passed`。

- [ ] **Step 5: Commit**

```bash
git add src/lib/map/walker.ts src/lib/map/walker.test.ts
git commit -m "Add walker pure logic: key → direction, auto-walk timing, proximity with hysteresis"
```

---

### Task 4: `WalkerMarker` 与 `WalkerController`(DOM + 动画循环)

这两个模块碰 DOM 与 MapLibre 实例,vitest(node)不测,靠 Task 8 在浏览器里验证。

**Files:**
- Create: `src/components/map/walkerMarker.ts`
- Create: `src/components/map/walkerController.ts`

- [ ] **Step 1: 新建 `src/components/map/walkerMarker.ts`**

```ts
import { Marker, type Map as MapLibreMap } from 'maplibre-gl'
import type { LngLat } from '@/lib/places'

export type WalkerAction = 'idle' | 'walk' | 'celebrate'

/**
 * 菠萝子 marker。
 * MapLibre 会覆写 marker 根元素的 transform 来定位,所以缩放/翻转类必须挂在内层 .pp-sprite 上,
 * 根元素只是定位壳(与 travel-timeline retroMap.ts 同一个坑)。
 * 根元素布局尺寸是 128×160(transform 不改布局),anchor: 'bottom' 对齐的是这个盒子的底边中点;
 * 内层 transform-origin: bottom center,所以缩小后脚仍踩在坐标点上。
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
```

- [ ] **Step 2: 新建 `src/components/map/walkerController.ts`**

```ts
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
```

- [ ] **Step 3: 类型检查**

Run: `npx tsc --noEmit`
Expected: 无错误。若 `Marker` 构造选项里 `pitchAlignment` / `rotationAlignment` 报类型错,查 `node_modules/maplibre-gl/dist/maplibre-gl.d.ts` 里 `MarkerOptions` 的字段名并对齐。

- [ ] **Step 4: Commit**

```bash
git add src/components/map/walkerMarker.ts src/components/map/walkerController.ts
git commit -m "Add WalkerMarker + WalkerController: sprite marker, auto-walk, free-walk, proximity loop"
```

---

### Task 5: 文案、虚拟方向键、右下角按钮

**Files:**
- Modify: `src/lib/mapI18n.ts`
- Create: `src/components/map/DPad.tsx`
- Create: `src/components/map/MapControls.tsx`

- [ ] **Step 1: 给 `src/lib/mapI18n.ts` 加文案**

`MapUIStrings` 类型里 `seeOnMap: string` 之后加:

```ts
  recenter: string
  togglePitch: string
  dpad: string
  up: string
  down: string
  left: string
  right: string
```

`en` 对象里 `seeOnMap: 'See on the map →',` 之后加:

```ts
    recenter: 'Back to the pineapple',
    togglePitch: 'Toggle tilt',
    dpad: 'Move the pineapple',
    up: 'Move up',
    down: 'Move down',
    left: 'Move left',
    right: 'Move right',
```

`zh` 对象里 `seeOnMap: '在地图上看 →',` 之后加:

```ts
    recenter: '回到菠萝子',
    togglePitch: '切换俯视',
    dpad: '操控菠萝子',
    up: '向上',
    down: '向下',
    left: '向左',
    right: '向右',
```

- [ ] **Step 2: 新建 `src/components/map/DPad.tsx`**

```tsx
'use client'

import { useRef, type PointerEvent } from 'react'
import { useLang } from '@/components/LanguageContext'
import { MAP_UI } from '@/lib/mapI18n'
import { normalize, type Vec } from '@/lib/map/walker'

type Key = 'up' | 'down' | 'left' | 'right'
const VEC: Record<Key, Vec> = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } }

/** 手机虚拟方向键:按住持续移动,松开停;同时按两个方向走对角线 */
export default function DPad({ onDir }: { onDir: (d: Vec) => void }) {
  const { lang } = useLang()
  const ui = MAP_UI[lang]
  const held = useRef(new Set<Key>())

  const emit = () => {
    let x = 0, y = 0
    for (const k of held.current) { x += VEC[k].x; y += VEC[k].y }
    onDir(normalize({ x, y }))
  }
  const press = (k: Key) => (e: PointerEvent<HTMLButtonElement>) => {
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId) // 手指滑出按钮也能收到 pointerup
    held.current.add(k)
    emit()
  }
  const release = (k: Key) => () => {
    if (!held.current.delete(k)) return
    emit()
  }
  const btn = (k: Key, glyph: string, label: string) => (
    <button
      type="button"
      aria-label={label}
      className="w-12 h-12 rounded-xl bg-[#1E242C]/85 text-[#F8F2DD] text-lg grid place-items-center select-none touch-none active:bg-[#F0742A]"
      onPointerDown={press(k)}
      onPointerUp={release(k)}
      onPointerCancel={release(k)}
      onContextMenu={e => e.preventDefault()}
    >
      {glyph}
    </button>
  )

  return (
    <div role="group" aria-label={ui.dpad} className="grid grid-cols-3 grid-rows-3 gap-1 w-[9.5rem]">
      <span />{btn('up', '▲', ui.up)}<span />
      {btn('left', '◀', ui.left)}<span />{btn('right', '▶', ui.right)}
      <span />{btn('down', '▼', ui.down)}<span />
    </div>
  )
}
```

- [ ] **Step 3: 新建 `src/components/map/MapControls.tsx`**

```tsx
'use client'

import { useLang } from '@/components/LanguageContext'
import { MAP_UI } from '@/lib/mapI18n'

/** 右下角(手机)/ 左下角(桌面)两个圆按钮:回到菠萝子、切换俯视 */
export default function MapControls({ onRecenter, onTogglePitch }: { onRecenter: () => void; onTogglePitch: () => void }) {
  const { lang } = useLang()
  const ui = MAP_UI[lang]
  const btn = 'w-11 h-11 rounded-full bg-[#1E242C]/85 text-[#F8F2DD] shadow-lg grid place-items-center hover:bg-[#F0742A] transition-colors font-label text-xs font-bold'
  return (
    <div className="flex flex-col gap-2">
      <button type="button" className={btn} aria-label={ui.recenter} title={ui.recenter} onClick={onRecenter}>🍍</button>
      <button type="button" className={btn} aria-label={ui.togglePitch} title={ui.togglePitch} onClick={onTogglePitch}>3D</button>
    </div>
  )
}
```

- [ ] **Step 4: 类型检查 + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: 无错误。

- [ ] **Step 5: Commit**

```bash
git add src/lib/mapI18n.ts src/components/map/DPad.tsx src/components/map/MapControls.tsx
git commit -m "Add DPad and MapControls with en/zh labels"
```

---

### Task 6: `MapView.tsx` 接入小人、署名位置、城市视角

**Files:**
- Rewrite: `src/components/map/MapView.tsx`

- [ ] **Step 1: 把 `src/components/map/MapView.tsx` 整个替换为**

```tsx
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
```

- [ ] **Step 2: 类型检查**

Run: `npx tsc --noEmit`
Expected: 无错误。常见报错:
- `RefObject<MapApi | null>` 与父组件 `useRef<MapApi | null>(null)` 的类型不一致 → React 19 的 `useRef(null)` 返回 `RefObject<T | null>`,两边保持一致即可;若报 `MutableRefObject`,把 Props 里的类型改成 `MutableRefObject<MapApi | null>`。
- `AttributionControl` 不是具名导出 → `grep -n "class AttributionControl" node_modules/maplibre-gl/dist/maplibre-gl.d.ts`,按实际名字改。
- `padding` 对象类型 → 查 d.ts 的 `PaddingOptions`。

- [ ] **Step 3: Commit**

```bash
git add src/components/map/MapView.tsx
git commit -m "MapView: mount walker controller, expose apiRef, move attribution, fit city to its places"
```

---

### Task 7: `MapPageClient.tsx` 接线、卡片署名行

**Files:**
- Rewrite: `src/components/map/MapPageClient.tsx`
- Modify: `src/components/map/PlaceCard.tsx`

- [ ] **Step 1: 把 `src/components/map/MapPageClient.tsx` 整个替换为**

```tsx
'use client'

import dynamic from 'next/dynamic'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLang } from '@/components/LanguageContext'
import { basePath } from '@/lib/basePath'
import { MAP_UI } from '@/lib/mapI18n'
import { cityOf, type City } from '@/lib/map/cities'
import { KIND_ORDER } from '@/lib/map/kinds'
import { parseMapUrl, serializeMapUrl } from '@/lib/map/urlState'
import { dirFromKeys, WALK_KEYS } from '@/lib/map/walker'
import type { PlaceCollection, PlaceFeature } from '@/lib/map/placesToGeoJSON'
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

export default function MapPageClient({ data, cities }: { data: PlaceCollection; cities: City[] }) {
  const { lang } = useLang()
  const ui = MAP_UI[lang]
  const [activeCity, setActiveCity] = useState<string | null>(null)
  const [activeSlug, setActiveSlug] = useState<string | null>(null)
  const [walkTarget, setWalkTarget] = useState<{ slug: string; nonce: number } | null>(null)
  const [kinds, setKinds] = useState<PlaceKind[]>(KIND_ORDER)
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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActiveCity(city && cities.some(c => c.slug === city) ? city : cityFromPlace)
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
    if (c) setActiveCity(c.slug)
    if (reducedMotion) {
      setActiveSlug(slug)
      return
    }
    setActiveSlug(null)
    setWalkTarget({ slug, nonce: Date.now() })
  }, [bySlug, cities, reducedMotion])

  const pickCity = useCallback((slug: string | null) => {
    setActiveCity(slug)
    setActiveSlug(null)
    setWalkTarget(null)
  }, [])

  const toggleKind = useCallback((k: PlaceKind) => {
    setKinds(prev => (prev.includes(k) ? prev.filter(x => x !== k) : [...prev, k]))
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
          cities={cities}
          activeCity={activeCity}
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
        <div className="pointer-events-auto"><CityChips cities={cities} active={activeCity} onChange={pickCity} /></div>
        <div className="pointer-events-auto"><KindChips available={available} active={kinds} onToggle={toggleKind} /></div>
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
```

- [ ] **Step 2: 卡片底部加署名行(手机端卡片会盖住地图左下的署名)**

`src/components/map/PlaceCard.tsx` 里,`<div className="flex gap-2 pt-2 flex-wrap">…</div>`(两个按钮那块)之后、外层 `</div>` 之前加:

```tsx
        <p className="md:hidden pt-3 text-[10px] leading-snug text-[#8A99A6]">
          Map © <a className="underline" href="https://openfreemap.org" target="_blank" rel="noopener noreferrer">OpenFreeMap</a>
          {' '}© <a className="underline" href="https://www.openmaptiles.org/" target="_blank" rel="noopener noreferrer">OpenMapTiles</a>
          {' '}Data © <a className="underline" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors
        </p>
```

- [ ] **Step 3: 类型检查 + lint + 全量测试 + 构建**

Run: `npx tsc --noEmit && npm run lint && npm run test && npm run build`
Expected: 全绿(测试应为 89 + 新增 17 = 106 个:geo 多 7 个、walker 10 个)。

- [ ] **Step 4: Commit**

```bash
git add src/components/map/MapPageClient.tsx src/components/map/PlaceCard.tsx
git commit -m "Wire the walker: walk-to on tap, keyboard + DPad free walk, arrive/leave → card; attribution line in card"
```

---

### Task 8: 浏览器验收(dev)

Claude 桌面端用 `preview_start` 的 `gourmet-dev` 起 dev 服务,打开 `http://localhost:3000/gourmet/map`;按键可以用浏览器工具的 `key` 动作(按住用 `repeat`),或在控制台 `dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowRight' }))` / `keyup` 模拟。命令行环境就手动开浏览器。逐项核对并在最终报告里逐条打勾。

- [ ] **Step 1: 控制台与网络**

Expected:无红色报错;`sprites/pineapple-classic.png` 200;无 ≥400 响应。

- [ ] **Step 2: 总览没有小人,进城市有**

总览(`/gourmet/map`)看不到菠萝子。点「墨尔本」→ 镜头框住 4 家店(**Don's 不再被切在底边**),菠萝子出现在四家店外接矩形的中心,待机动画在跳;左下角出现 🍍 与 3D 两个圆按钮,署名条在它们下方左下角。

- [ ] **Step 3: 点标签 → 走过去 → 弹卡**

点 Zareh 标签:卡片**不立刻**出现;菠萝子朝 Zareh 走(走路帧循环,向西走时镜像),镜头跟着;1.2–4 s 内到达,举手庆祝,然后镜头推到 z16 / pitch 55、卡片出现、URL `?city=melbourne&place=zareh`。再点 Mary's 标签:从 Zareh 走过去(约 260 m)。

- [ ] **Step 4: 键盘自由操控与邻近触发**

关掉卡片。按住 → 键:若当前缩放 < 15,先自动拉近到 z15.5 / pitch 55,然后菠萝子向右走、镜头锁定跟随;松开停下变待机。按 W/A/S/D 同样有效。在搜索框里打字时按方向键**不**移动小人。
走到 Don's(可先点「总览」再点墨尔本重置,或用搜索飞到 Prahran 附近后关卡片):靠近 30 m 内标签文字变蓝(near);停 0.4 s 后弹卡片、标签变橙;继续走开超过 60 m,卡片自动收起。

- [ ] **Step 5: 两个按钮**

拖地图把小人拖出视野,点 🍍 → 镜头回到小人(缩放 ≥ 15)。点 3D → pitch 在 0 与 55 之间切换。

- [ ] **Step 6: 城市切换与 URL 直达**

点「十和田」→ 镜头到 Soma Pastry Shop,小人出现在店南边约 90 m 处(不是叠在店上)。新标签页打开 `?city=melbourne&place=dons` → 落地即在 Don's、卡片打开、小人站在 Don's 门口。

- [ ] **Step 7: 手机视口 375×812**

右下出现虚拟方向键(触屏模拟:视口切到 mobile 预设后刷新,使 `(pointer: coarse)` 为真);按住 ▲ 小人向上走,松开停。卡片打开时方向键消失、卡片底部有一行署名;关卡片方向键回来。左下两个按钮不与署名条重叠。

- [ ] **Step 8: 减少动态**

覆盖 `matchMedia('(prefers-reduced-motion: reduce)')` 为真后进入 `/map`(与 Phase 1 同样做法):点标签 → 小人瞬移、卡片立即出现,无行走动画;雪碧图不播帧动画。

- [ ] **Step 9: 分类筛选影响"可到达"**

关掉「酒吧」后走到 Don's 门口不触发任何高亮或卡片;打开后恢复。

- [ ] **Step 10: 截图存档**

`docs/superpowers/screenshots/2026-11-13-map-phase2-desktop.png`(墨尔本,菠萝子刚到 Zareh、卡片打开)与 `…-phase2-mobile.png`(手机视口,城市视图,方向键与菠萝子都在画面里)。

- [ ] **Step 11: Commit**

```bash
git add docs/superpowers/screenshots
git commit -m "Add Phase 2 walker screenshots"
```

若 Step 1–9 发现问题并改了代码,先单独提交修复(`Fix walker issues found in dev acceptance: …`),再提交截图。

---

### Task 9: 构建验收、文档、收尾

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: 用 CI 同样的环境变量构建并本地静态服务验证**

```bash
NEXT_PUBLIC_BASE_PATH=/gourmet npm run build && ls out/sprites/pineapple-classic.png out/map.html
SERVE_DIR=$(mktemp -d) && ln -s "$PWD/out" "$SERVE_DIR/gourmet" && (cd "$SERVE_DIR" && python3 -m http.server 3999)
```

打开 `http://localhost:3999/gourmet/map.html`:进墨尔本小人出现(雪碧图经 `/gourmet/sprites/…` 200),点标签能走,方向键能动。完成后停掉服务。

- [ ] **Step 2: CLAUDE.md 的 Map 一节末尾追加**

```markdown
- **Walker (Phase 2):** `walkerController.ts` owns the pineapple (MapLibre `Marker` + pixel sprite from travel-timeline, `public/sprites/pineapple-classic.png`, 4×3 frames of 128×160; swap the PNG for a painted version with the same frame grid and `walker.css` needs no change). Pure logic + constants (30 m enter / 60 m exit / 400 ms dwell / 180 px·s⁻¹ / auto-walk 1.2–4 s) live in `src/lib/map/walker.ts` (unit-tested). `MapView` exposes `apiRef` (`setInput` / `recenter` / `togglePitch`); keyboard (arrows + WASD) is handled in `MapPageClient`, touch uses `DPad.tsx`. Tap a label → walk → arrive → card; free-walk camera is locked on the walker; below zoom 15 the first input zooms in first.
- **Camera padding is persistent in MapLibre.** Every camera call in `MapView` passes an explicit padding constant (`OVERVIEW_PADDING` / `CITY_PADDING` / `CARD_PADDING_*`) and closing the card resets it — keep that invariant when adding camera moves. City views now `fitBounds` the city's own places (`cities.json` `view.zoom` acts as the max zoom / single-place zoom).
- Attribution control sits bottom-left (`AttributionControl`, non-compact); the mobile card repeats the attribution line because it covers the map's bottom.
```

同一文件 `## Status` 里那行「地图(2026-11)…」改成:

```
- 地图(2026-11):总策划案 `docs/superpowers/specs/2026-11-13-pineapple-map-design.md`;Phase 0(数据)、Phase 1(`/map`)、Phase 2(菠萝子小人)已完成,见下方「Map」一节;Phase 3(手绘资产·墨尔本试点)与 Phase 4(Takeout 导入景点)待做。
```

- [ ] **Step 3: 三件套**

Run: `npm run lint && npm run test && npm run build`
Expected: 全绿。

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md
git commit -m "Docs: walker system and camera padding invariant in CLAUDE.md"
```

- [ ] **Step 5: 给业主的报告(不要 push、不要合并)**

报告包含:分支名 `feat/map-phase2`;Task 8 九项逐条打勾(每项一句证据);两张截图;与计划的偏离及原因;一句「等你看过截图点头,再合并到 main 并 push」。

---

## 验收清单(对照设计文档 §8 Phase 2)

- [ ] 桌面按方向键小人移动,走进 Don's 30 m 弹卡片,走开收起
- [ ] 点任意标签 ≤ 4 s 到达并弹卡
- [ ] 开启系统「减少动态效果」后瞬移
- [ ] 单测覆盖状态机(邻近迟滞)与按键解析(`walker.test.ts`)、距离与路径(`geo.test.ts`)
- [ ] 手机虚拟方向键可用;卡片打开时让位
- [ ] 「回到菠萝子」「切换俯视」按钮可用;署名在桌面与手机(卡片内)都可见
- [ ] 城市视角框住该城所有店;总览无小人
- [ ] `npm run lint && npm run test && npm run build` 全绿;截图入库;报告已交,未 push
