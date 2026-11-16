# 菠萝子朝向修正 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 地图上的手绘菠萝子往哪边走,脸就朝哪边(现在是反的:按 → 往右走时脸朝左,像在倒着走)。

**Architecture:** 根因:翻转逻辑沿用像素版的约定「原画朝右,往左走才加 `.pp-flip` 镜像」。像素版是对称正脸,约定对错看不出来;2026-11-15 上线的手绘四连格是**脸朝左**的四分之三侧脸(墨镜偏画面左侧,所有 idle / walk 帧都是),于是整个反了。修法:把「原画朝向」做成雪碧图描述的一部分(`walkerSprite()` 多返回 `facesLeft`,手绘版由常量 `PAINTED_WALKER_FACES_LEFT = true` 决定),「要不要镜像」交给纯函数 `spriteFlipped(facing, artFacesLeft)`(单测覆盖四种组合),`WalkerMarker` 只按它的结果切 `.pp-flip`,并在构造时就按初始朝向设好类名。业主以后重画成朝右,只改一个常量。

**Tech Stack:** TypeScript、MapLibre GL 6(不涉及其 API 改动)、Vitest 2。无新依赖。

**基线:** main @ `96fab4f`,`npx vitest run` = **166 passed**。

---

## 开工前必读

- 先完整读 `CLAUDE.md`(尤其「Map (`/map`)」里 Walker 一段)。
- 工作目录 `/Users/tantianshu/Documents/code/gourmet/web`(git 根)。共用检出,不要新建 worktree。
- 分支 `feat/walker-facing`,从 main 切出。每个 Task 一次 commit,提交信息用计划里的。
- **不 push、不合并 main、不改 `.env*`、不启动 dev 服务器**(指挥官会自己起预览、按方向键验收)。
- 本计划文件还没进 git:Task 1 的 commit 把它一起加上。
- **不要**改 `facingFromDx`、`pathPosition` 的符号约定(+1 = 往屏幕右走),也不要动雪碧图 PNG。

## 文件结构

| 文件 | 动作 | 职责 |
|---|---|---|
| `src/lib/map/walker.ts` | 改(末尾追加) | `spriteFlipped(facing, artFacesLeft)`:要不要镜像 |
| `src/lib/map/walker.test.ts` | 改 | import + 一个新 describe |
| `src/lib/map/assets.ts` | 改 | `WalkerSprite` 类型、`PAINTED_WALKER_FACES_LEFT`、`walkerSprite()` 多返回 `facesLeft` |
| `src/lib/map/assets.test.ts` | 改 | `walkerSprite` 两条期望加上 `facesLeft` |
| `src/components/map/walkerMarker.ts` | 整文件替换 | 按 `spriteFlipped` 切 `.pp-flip`,构造时就设好 |
| `src/components/map/walkerController.ts` | 改两处 | 构造参数类型换成 `WalkerSprite` |
| `src/components/map/walker.css` | 改注释 | 说明翻转由谁决定 |
| `CLAUDE.md` | 改一句 | 记录原画朝向与常量 |

---

### Task 1: 纯函数 `spriteFlipped`(TDD)

**Files:**
- Modify: `src/lib/map/walker.ts`(末尾追加)
- Test: `src/lib/map/walker.test.ts`

- [ ] **Step 1: 切分支**

```bash
cd /Users/tantianshu/Documents/code/gourmet/web
git checkout main && git checkout -b feat/walker-facing
```

Expected: `Switched to a new branch 'feat/walker-facing'`

- [ ] **Step 2: 写失败的测试**

`src/lib/map/walker.test.ts` 开头的 import:

```ts
import {
  autoWalkDuration, dirFromKeys, facingFromDx, movePoint, nearestWithin, normalize,
  proximityStep, NEAR_IDLE, WALK_KEYS, type PlacePoint,
} from './walker'
```

改为

```ts
import {
  autoWalkDuration, dirFromKeys, facingFromDx, movePoint, nearestWithin, normalize,
  proximityStep, spriteFlipped, NEAR_IDLE, WALK_KEYS, type PlacePoint,
} from './walker'
```

然后在 `describe('normalize / movePoint / facingFromDx', …)` 整块**之后**、`describe('autoWalkDuration', …)` **之前**插入:

```ts
describe('spriteFlipped', () => {
  it('mirrors left-facing art when walking right, and right-facing art when walking left', () => {
    // 手绘版:原画脸朝左
    expect(spriteFlipped(1, true)).toBe(true)
    expect(spriteFlipped(-1, true)).toBe(false)
    // 像素版:按朝右处理
    expect(spriteFlipped(1, false)).toBe(false)
    expect(spriteFlipped(-1, false)).toBe(true)
  })
})
```

- [ ] **Step 3: 跑测试确认失败**

Run: `npx vitest run src/lib/map/walker.test.ts`
Expected: FAIL,`spriteFlipped is not a function`(或 not exported)。

- [ ] **Step 4: 实现**

在 `src/lib/map/walker.ts` 里 `facingFromDx` 函数**之后**插入:

```ts
/**
 * 要不要水平镜像精灵图,小人才会脸朝行进方向。
 * facing:1 = 往屏幕右走,-1 = 往左走(facingFromDx / pathPosition 的约定)。
 * artFacesLeft:原画(未镜像的帧)脸朝左。手绘版(2026-11-15)是脸朝左的四分之三侧脸;
 * 像素版是对称正脸,按朝右处理。
 */
export function spriteFlipped(facing: 1 | -1, artFacesLeft: boolean): boolean {
  return artFacesLeft ? facing === 1 : facing === -1
}
```

- [ ] **Step 5: 跑测试确认通过**

Run: `npx vitest run src/lib/map/walker.test.ts`
Expected: PASS(该文件比原来多 1 个 test)。

- [ ] **Step 6: Commit(连同本计划文件)**

```bash
git add src/lib/map/walker.ts src/lib/map/walker.test.ts docs/superpowers/plans/2026-11-16-walker-facing.md
git commit -m "Walker: spriteFlipped() decides mirroring from the art's own facing"
```

---

### Task 2: 雪碧图描述带上原画朝向(TDD)

**Files:**
- Modify: `src/lib/map/assets.ts`
- Test: `src/lib/map/assets.test.ts`

- [ ] **Step 1: 改测试期望**

`src/lib/map/assets.test.ts` 里这两行:

```ts
    expect(walkerSprite(full, '/gourmet')).toEqual({ url: '/gourmet/sprites/pineapple-painted.png', pixelArt: false })
    expect(walkerSprite(EMPTY_MANIFEST, '')).toEqual({ url: '/sprites/pineapple-classic.png', pixelArt: true })
```

改为

```ts
    expect(walkerSprite(full, '/gourmet')).toEqual({ url: '/gourmet/sprites/pineapple-painted.png', pixelArt: false, facesLeft: true })
    expect(walkerSprite(EMPTY_MANIFEST, '')).toEqual({ url: '/sprites/pineapple-classic.png', pixelArt: true, facesLeft: false })
```

- [ ] **Step 2: 跑测试确认失败**

Run: `npx vitest run src/lib/map/assets.test.ts`
Expected: FAIL(实际对象缺 `facesLeft`)。

- [ ] **Step 3: 实现**

`src/lib/map/assets.ts` 里这一段:

```ts
/** 小人雪碧图:有手绘版用手绘版;只有像素版需要 image-rendering: pixelated(走 .pp-pixel) */
export function walkerSprite(m: AssetManifest, basePath: string): { url: string; pixelArt: boolean } {
  return { url: walkerSpriteUrl(m, basePath), pixelArt: m.walker === null }
}
```

替换为

```ts
/** 小人雪碧图描述:地址、是否像素风(像素版要 .pp-pixel 硬边)、原画脸是否朝左(决定何时镜像) */
export type WalkerSprite = { url: string; pixelArt: boolean; facesLeft: boolean }

/**
 * 手绘小人原画的朝向。2026-11-15 的四连格是脸朝左的四分之三侧脸(墨镜偏画面左侧)。
 * 业主重画后若改成脸朝右,把它改成 false。像素版是对称正脸,一律按朝右处理。
 */
export const PAINTED_WALKER_FACES_LEFT = true

/** 小人雪碧图:有手绘版用手绘版 */
export function walkerSprite(m: AssetManifest, basePath: string): WalkerSprite {
  const painted = m.walker !== null
  return {
    url: walkerSpriteUrl(m, basePath),
    pixelArt: !painted,
    facesLeft: painted && PAINTED_WALKER_FACES_LEFT,
  }
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `npx vitest run src/lib/map/assets.test.ts`
Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git add src/lib/map/assets.ts src/lib/map/assets.test.ts
git commit -m "Map assets: walkerSprite() reports which way the painted art faces"
```

---

### Task 3: Marker 按原画朝向镜像

**Files:**
- Modify: `src/components/map/walkerMarker.ts`(整文件替换)
- Modify: `src/components/map/walkerController.ts`(import + 构造参数类型)
- Modify: `src/components/map/walker.css`(两处注释)

- [ ] **Step 1: 整文件替换 `src/components/map/walkerMarker.ts`**

```ts
import { Marker, type Map as MapLibreMap } from 'maplibre-gl'
import type { LngLat } from '@/lib/places'
import type { WalkerSprite } from '@/lib/map/assets'
import { spriteFlipped } from '@/lib/map/walker'

export type WalkerAction = 'idle' | 'walk' | 'celebrate'

/**
 * 小人相对坐标点的屏幕偏移(像素):站在"门口右下",让白色店名标签与店面小插画保持可见。
 * 精灵盒 ≈ 45×56 px(0.35 缩放,脚在盒子底边中点),店名标签的主体在坐标点上方 8–36 px 处。
 * 只往右挪盖不住标签(盒子会盖住短名字的末尾),所以主要往下挪:盒子顶边落在标签底边之下,
 * 不论店名多长都不会挡住。计划原值 [22, 6] 在开发验收里仍会盖住 "Zareh" 的最后一个字母。
 */
export const WALKER_OFFSET: [number, number] = [22, 42]

/**
 * 菠萝子 marker。
 * MapLibre 会覆写 marker 根元素的 transform 来定位,所以缩放/翻转类必须挂在内层 .pp-sprite 上,
 * 根元素只是定位壳(与 travel-timeline retroMap.ts 同一个坑)。
 * 根元素布局尺寸是 128×160(transform 不改布局),anchor: 'bottom' 对齐的是这个盒子的底边中点;
 * 内层 transform-origin: bottom center,所以缩小后脚仍踩在坐标点上。
 * offset 只影响屏幕位置,getLngLat() 仍是坐标点本身,所以邻近判定不受影响。
 * 朝向:facing 是行进方向(1 = 往右);要不要加 .pp-flip 镜像由 spriteFlipped() 按原画朝向决定。
 */
export class WalkerMarker {
  readonly marker: Marker
  private readonly wrap: HTMLDivElement
  private readonly sprite: HTMLDivElement
  private readonly artFacesLeft: boolean
  private action: WalkerAction = 'idle'
  private facing: 1 | -1 = 1

  constructor(sprite: WalkerSprite) {
    this.artFacesLeft = sprite.facesLeft
    this.wrap = document.createElement('div')
    this.wrap.className = 'pp-wrap pp-hidden'
    this.sprite = document.createElement('div')
    this.sprite.className = 'pp-sprite pp-map pp-idle' + (sprite.pixelArt ? ' pp-pixel' : '')
    this.sprite.style.backgroundImage = `url(${sprite.url})`
    this.applyFacing() // 初始朝向(往右)也要按原画朝向设好,否则第一次往右走时 setFacing 会因"没变化"直接返回
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
    this.applyFacing()
  }

  private applyFacing(): void {
    this.sprite.classList.toggle('pp-flip', spriteFlipped(this.facing, this.artFacesLeft))
  }
}
```

(与原文件相比只多了:两行 import、`artFacesLeft` 字段及其赋值、构造里的 `applyFacing()`、类注释最后一行、`applyFacing` 方法;`setFacing` 改为调用它。其余逐字不变。)

- [ ] **Step 2: 改 `src/components/map/walkerController.ts`**

import 区这一行:

```ts
import { WalkerMarker } from './walkerMarker'
```

改为

```ts
import type { WalkerSprite } from '@/lib/map/assets'
import { WalkerMarker } from './walkerMarker'
```

构造函数参数这一行:

```ts
    sprite: { url: string; pixelArt: boolean },
```

改为

```ts
    sprite: WalkerSprite,
```

(`MapView.tsx` 传的是 `walkerSprite(manifest, basePath)`,类型自动对上,不用改。)

- [ ] **Step 3: 改 `src/components/map/walker.css` 两处注释**

第 4 行

```css
   手绘版(public/sprites/pineapple-painted.png)用同一帧表;只有像素版需要 .pp-pixel 的硬边缩放。 */
```

改为

```css
   手绘版(public/sprites/pineapple-painted.png)用同一帧表;只有像素版需要 .pp-pixel 的硬边缩放。
   .pp-flip 只负责镜像;哪个行进方向要镜像,由 spriteFlipped()(src/lib/map/walker.ts)按原画朝向决定
   ——手绘版原画脸朝左,像素版按朝右。 */
```

以及

```css
/* 缩放/翻转挂在内层 sprite 上:MapLibre 会覆写 marker 根元素的 transform 来定位 */
```

改为

```css
/* 缩放/镜像挂在内层 sprite 上:MapLibre 会覆写 marker 根元素的 transform 来定位 */
```

- [ ] **Step 4: lint + 全量测试 + 构建**

Run: `npm run lint && npx vitest run && NEXT_PUBLIC_BASE_PATH=/gourmet npm run build`
Expected: lint 无报错;测试 **167 passed**(166 + 1);构建成功(TypeScript 类型检查通过)。

- [ ] **Step 5: Commit**

```bash
git add src/components/map/walkerMarker.ts src/components/map/walkerController.ts src/components/map/walker.css
git commit -m "Walker: face the walking direction with the left-facing painted sprite"
```

---

### Task 4: 文档

**Files:**
- Modify: `CLAUDE.md`(一句)

- [ ] **Step 1: 在 Map 一节的 Walker 说明里补一句**

`CLAUDE.md` 里这一句:

```
On the map the walker is 45×56 CSS px (`.pp-map` scale 0.35).
```

替换为

```
On the map the walker is 45×56 CSS px (`.pp-map` scale 0.35). **Facing:** the painted art is a ¾ view facing screen-left; `PAINTED_WALKER_FACES_LEFT` in `src/lib/map/assets.ts` records that, and `spriteFlipped()` (`src/lib/map/walker.ts`) decides when `.pp-flip` mirrors the sprite so the face always points the way it walks (`facing` +1 = moving right). If a redrawn sheet faces right, set the constant to `false` — don't touch the flip CSS.
```

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "Docs: painted walker faces left; spriteFlipped() handles mirroring"
```

---

## 收尾报告(执行者写给指挥官)

- 分支名、4 个 commit 的 hash 与信息、`git status` 是否干净。
- 测试数量(应为 167)、lint / build 结果、Task 1 Step 3 与 Task 2 Step 2 的失败信息(证明先红后绿)。
- 与计划的偏离及原因(没有就写「无」)。
- 最后一句:「等你在预览里按方向键验收过,再合并到 main 并 push」。

## 指挥官验收清单(不是执行者的活)

- 自己重跑 lint / test / build,`git log main..feat/walker-facing` + 读 diff。
- `preview_start web-dev`,`/gourmet/map?city=melbourne&place=suburbia-bakery`,关卡片后用脚本按住方向键(`window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowRight' }))`,截图后再发 `keyup`;合成的按一下就松开太快,一帧都不走):
  - 按住 → 往右走:`.pp-sprite` 有 `pp-flip`,截图里墨镜偏右;
  - 按住 ← 往左走:没有 `pp-flip`,墨镜偏左;
  - 松手后停住的 idle 保持最后的朝向。
- 点另一家店的标签让小人自动走过去,看朝向和走向一致(注:自动行走的朝向按经度算,地图转过角度时可能不准,本计划不处理)。

---

## 追加(指挥官预览验收后,2026-11-16)

### Task 5: 自动行走到站时不要转身

验收结果:方向键 → / ← 朝向都对了;但点店名(或搜索)让小人自动走过去时,往西走一路脸朝左(对),**一到站就转身朝右**庆祝。根因在 `src/lib/map/geo.ts` 的 `pathPosition()`:`t = 1` 时 `idx` 是最后一个点,`next` 也是它自己,`next[0] >= pos[0]` 恒为真 → 朝向一律回到 +1(朝右)。修法:终点处改看**最后一段**的走向。(修复前同样会在到站时转身,只是方向正好反过来,所以一直没被注意到。)

**Files:**
- Modify: `src/lib/map/geo.ts`(`pathPosition` 整个函数)
- Test: `src/lib/map/geo.test.ts`(`describe('pathPosition', …)` 里追加一个 `it`)

- [ ] **Step 1: 写失败的测试**

`src/lib/map/geo.test.ts` 的 `describe('pathPosition', …)` 里,`it('faces east when the path heads east and west when it heads west', …)` 之后追加:

```ts
  it('keeps the last segment\'s direction at the end of the path (no about-face on arrival)', () => {
    expect(pathPosition(buildPath([[10, 0], [0, 0]], 10), 1).facing).toBe(-1)
    expect(pathPosition(path, 1).facing).toBe(1)
  })
```

- [ ] **Step 2: 跑测试确认失败**

Run: `npx vitest run src/lib/map/geo.test.ts`
Expected: 新测试 FAIL(第一条期望 -1,实际 1)。

- [ ] **Step 3: 实现**

`src/lib/map/geo.ts` 里整个函数

```ts
/** 进度 t ∈ [0,1] 对应的路径点与朝向(1 = 向东 / 右,-1 = 向西 / 左) */
export function pathPosition(path: LngLat[], t: number): { pos: LngLat; facing: 1 | -1 } {
  const c = Math.min(1, Math.max(0, t))
  const idx = Math.min(path.length - 1, Math.floor(c * (path.length - 1)))
  const pos = path[idx]
  const next = path[Math.min(path.length - 1, idx + 1)]
  return { pos, facing: next[0] >= pos[0] ? 1 : -1 }
}
```

替换为

```ts
/**
 * 进度 t ∈ [0,1] 对应的路径点与朝向(1 = 向东 / 右,-1 = 向西 / 左)。
 * 朝向看当前所在那一段的走向;到了终点就看最后一段——否则终点的"下一个点"是它自己,
 * 朝向会一律变成向东,小人往西走到站时会突然转身。
 */
export function pathPosition(path: LngLat[], t: number): { pos: LngLat; facing: 1 | -1 } {
  const c = Math.min(1, Math.max(0, t))
  const last = path.length - 1
  const idx = Math.min(last, Math.floor(c * last))
  const pos = path[idx]
  const [from, to] = idx < last ? [pos, path[idx + 1]] : [path[Math.max(0, last - 1)], pos]
  return { pos, facing: to[0] >= from[0] ? 1 : -1 }
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `npx vitest run src/lib/map/geo.test.ts`
Expected: PASS。

- [ ] **Step 5: lint + 全量测试 + 构建**

Run: `npm run lint && npx vitest run && NEXT_PUBLIC_BASE_PATH=/gourmet npm run build`
Expected: lint 无报错;测试 **168 passed**(167 + 1);构建成功。

- [ ] **Step 6: Commit(连同本计划文件的这段追加)**

```bash
git add src/lib/map/geo.ts src/lib/map/geo.test.ts docs/superpowers/plans/2026-11-16-walker-facing.md
git commit -m "Auto-walk: keep the last segment's facing on arrival instead of turning east"
```
