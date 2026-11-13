# 菠萝子地图 Phase 1:地图 MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 上线 `/map` 页面:手绘暖色风格的真实地图(MapLibre + OpenFreeMap),所有地点以「白色圆角标签 + 分类徽章」标在地图上,按城市切换镜头,点标签弹出图文卡片,支持搜索、分类筛选、URL 直达与加载失败降级。**本阶段没有小人**(Phase 2)。

**Architecture:** 服务端页面 `app/map/page.tsx` 在构建时把 `getAllPlaces()` 转成 GeoJSON 传给客户端;`MapView.tsx` 是唯一直接使用 `maplibre-gl` 的组件(建图、symbol 图层、事件),其余 UI(搜索、城市/分类 chips、卡片、降级列表)是普通 React 组件;底图样式由脚本从 OpenFreeMap liberty 生成并提交入库;纯逻辑(GeoJSON 转换、URL 状态、边界计算、分类表)放 `src/lib/map/`,vitest 覆盖。

**Tech Stack:** Next 16(App Router,`output: 'export'`,basePath `/gourmet`)· React 19 · Tailwind 4 · maplibre-gl 6.x(ESM-only)· OpenFreeMap 矢量瓦片(免费、无 key)· zod · vitest 2

**前置:** Phase 0 计划(`2026-11-13-pineapple-map-phase0-data.md`)已完成——每个地点都有 `coords`,`src/lib/places.ts` 与 `src/lib/map/cities.ts` 已存在。

**设计文档:** `web/docs/superpowers/specs/2026-11-13-pineapple-map-design.md`(§5 产品形态、§6 技术架构、§8 Phase 1 验收)

---

## 开工前必读

1. `web/CLAUDE.md`、`web/AGENTS.md`;Next 16 的文档在 `node_modules/next/dist/docs/`,**动手前先读** `01-app/02-guides/lazy-loading.md`(`ssr: false` 只能在 Client Component 里用)。
2. 所有命令在 `/Users/tantianshu/Documents/code/gourmet/web` 下执行;`git` 也在这里。
3. **basePath 铁律**:自家静态资源(样式 JSON、图片)的 URL 一律 `${basePath}/...`(`src/lib/basePath.ts`)。本地 `npm run dev` 看不出问题,线上会全挂。
4. 本计划的代码按 **maplibre-gl 6.x** 写(ESM-only,`import { Map as MapLibreMap } from 'maplibre-gl'`,不再有默认导出)。Task 1 会用 grep 核对本计划用到的 API 名;对不上就以 `node_modules/maplibre-gl/dist/maplibre-gl.d.ts` 为准改代码,并在报告里写明。
5. 视觉类任务的「完成」证据是截图(手机 375px + 桌面各一张),不是「我觉得应该没问题」。
6. **未经业主确认不 `git push`**。每个 Task 结束 commit 一次。
7. 分支:`git switch -c feat/map-phase1`(改动面大,留个干净的 main 方便回退);完成后不要自行合并,报告给业主。
8. 有意留到 Phase 2 的东西(不要顺手做):右下角「重置视角 / 回到小人」按钮、俯视角度切换按钮、音效。本阶段点城市 chip 即重置该城视角。

---

## 文件结构

| 文件 | 操作 | 职责 |
|---|---|---|
| `package.json` | 修改 | 依赖 `maplibre-gl`、`@types/geojson`;脚本 `maps` |
| `scripts/build-map-style.mjs` | 新建 | OpenFreeMap liberty → 手绘暖色样式 `public/maps/painted.json`(含 pattern 槽位、自检) |
| `public/maps/painted.json` | 生成后提交 | 底图样式产物(构建不依赖网络) |
| `src/lib/map/placesToGeoJSON.ts` | 新建 | `Place[]` → GeoJSON FeatureCollection(属性扁平化) |
| `src/lib/map/placesToGeoJSON.test.ts` | 新建 | 单测 |
| `src/lib/map/geo.ts` | 新建 | `boundsOf()`:一组坐标的外接矩形 |
| `src/lib/map/geo.test.ts` | 新建 | 单测 |
| `src/lib/map/urlState.ts` | 新建 | `?city=&place=` 的解析与序列化 |
| `src/lib/map/urlState.test.ts` | 新建 | 单测 |
| `src/lib/map/kinds.ts` | 新建 | 分类顺序、颜色、占位 emoji |
| `src/lib/map/kinds.test.ts` | 新建 | 单测 |
| `src/lib/mapI18n.ts` | 新建 | 地图页 UI 文案(中英) |
| `src/lib/wineI18n.ts` | 修改 | 加 `navMap` 导航文案 |
| `src/components/map/mapImages.ts` | 新建 | 用 canvas 生成标签底图(9-slice)与分类徽章占位图 |
| `src/components/map/MapView.tsx` | 新建 | 唯一碰 `maplibre-gl` 的组件 |
| `src/components/map/PlaceCard.tsx` | 新建 | 卡片(手机底部抽屉 / 桌面右侧面板) |
| `src/components/map/CityChips.tsx` | 新建 | 总览 + 城市切换 |
| `src/components/map/KindChips.tsx` | 新建 | 分类筛选 |
| `src/components/map/MapSearch.tsx` | 新建 | 搜索框 + 下拉结果 |
| `src/components/map/MapFallbackList.tsx` | 新建 | 地图失败 / 无 JS 时的纯列表 |
| `src/components/map/MapPageClient.tsx` | 新建 | 客户端外壳:状态、URL 同步、动态加载 MapView |
| `src/app/map/page.tsx` | 新建 | 服务端页面:读数据 → props |
| `src/components/Header.tsx` | 修改 | 导航加「地图」 |
| `src/components/RestaurantDetail.tsx` | 修改 | 加「在地图上看 →」链接 |
| `CLAUDE.md` | 修改 | `/map` 维护说明 |

---

### Task 1: 依赖、脚本与环境核对

**Files:**
- Modify: `package.json`

- [ ] **Step 1: 建分支并安装依赖**

```bash
git switch -c feat/map-phase1
npm install maplibre-gl@^6
npm install -D @types/geojson
```

Expected: `package.json` 的 `dependencies` 出现 `"maplibre-gl": "^6.x.x"`,`devDependencies` 出现 `"@types/geojson"`。

- [ ] **Step 2: 加 `maps` 脚本**

`package.json` 的 `"scripts"` 里 `"coords:check"` 之后追加(前一行末尾补逗号):

```json
    "coords:check": "node scripts/backfill-coords.mjs --check",
    "maps": "node scripts/build-map-style.mjs"
```

- [ ] **Step 3: 核对本计划用到的 MapLibre API 名**

Run:

```bash
grep -c "export declare class Map " node_modules/maplibre-gl/dist/maplibre-gl.d.ts
grep -n "getClusterExpansionZoom(clusterId: number): Promise<number>" node_modules/maplibre-gl/dist/maplibre-gl.d.ts | head -1
grep -n "setFeatureState(feature: FeatureIdentifier" node_modules/maplibre-gl/dist/maplibre-gl.d.ts | head -1
grep -n "MapLayerMouseEvent" node_modules/maplibre-gl/dist/maplibre-gl.d.ts | head -1
grep -n "stretchX?: Array<\[number, number\]>" node_modules/maplibre-gl/dist/maplibre-gl.d.ts | head -1
grep -n "pitchAlignment?: Alignment" node_modules/maplibre-gl/dist/maplibre-gl.d.ts | head -1
ls node_modules/maplibre-gl/dist/ | grep -i -E "css|worker"
```

Expected: 第一条输出 `1`;接下来五条各打印一行(行号不重要);最后一条列出 `maplibre-gl.css` 与一个 worker 文件。如果 `maplibre-gl.d.ts` 不存在,先 `ls node_modules/maplibre-gl/dist/*.d.ts` 找到类型文件名再重跑。**任何一条为空**,就在 d.ts 里搜该名字的近似写法(例如 `grep -n "ClusterExpansionZoom"`),按实际签名调整后文代码,并在最终报告里列出差异。

- [ ] **Step 4: 核对本地 dev 下 public 资源的路径习惯**

启动 dev(Claude 桌面端用 `preview_start` 的 `gourmet-dev`;命令行则 `npm run dev`),打开 `http://localhost:3000/gourmet/`,确认首页餐厅卡片图片正常显示。

- 图片正常 → 说明 dev 下 `${basePath}` 为空字符串也能取到 `public/` 文件,后文 `styleUrl` 照 `${basePath}/maps/painted.json` 写即可。
- 图片裂开 → 新建 `web/.env.local`(已被 `.env*` 忽略)写一行 `NEXT_PUBLIC_BASE_PATH=/gourmet`,重启 dev 再看;在报告里记一笔。

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json
git commit -m "Add maplibre-gl 6 + @types/geojson, maps script"
```

---

### Task 2: 底图样式生成脚本

**Files:**
- Create: `scripts/build-map-style.mjs`
- Create(生成): `public/maps/painted.json`

- [ ] **Step 1: 写脚本**

新建 `scripts/build-map-style.mjs`:

```js
// 以 OpenFreeMap liberty 样式为底,套「手绘暖色」调色板 → public/maps/painted.json
// 规则按 source-layer 匹配,与具体图层 id 解耦(移植自 travel-timeline/scripts/build-map-style.mjs)。
// 改配色:改下面的 palette 常量后 `npm run maps`,把产物一起提交。不要手改 painted.json。
import { writeFile, mkdir, access } from 'node:fs/promises'

const SRC = 'https://tiles.openfreemap.org/styles/liberty'
const OUT = 'public/maps/painted.json'

const palette = {
  background: '#D6D07A',   // 地表底色:参考图的暖黄绿
  grass: '#B9C95E',        // 草地 / 公园
  wood: '#6E9F49',         // 林地(Phase 3 换树丛贴图)
  residential: '#D9D08A',  // 住宅区,比底色略暖
  sand: '#E9DBA9',
  water: '#6FB3D2',        // 水面(Phase 3 叠波纹贴图)
  waterway: '#5FA3C4',     // 河流线
  road: '#F2E7C4',         // 道路面:米色
  roadCasing: '#B9A878',   // 道路描边
  building: '#C7B596',     // 建筑平面(低缩放)
  building3d: '#C3AE8C',   // 建筑挤出(z14+)
  labelText: '#3B392C',
  labelHalo: '#F8F2DD',
  streetText: '#5A553F',
  waterText: '#2F6E8A',
  boundary: '#B8A77A',
}

// pattern 槽位:贴图存在才输出 fill-pattern,否则纯色。Phase 3 把 PNG 放进
// public/map-assets/patterns/ 再跑一次脚本即可;运行时还要 map.addImage 注册同名图片。
const PATTERNS = { wood: 'pat-wood', grass: 'pat-grass', water: 'pat-water', sand: 'pat-sand' }
async function exists(p) {
  try { await access(p); return true } catch { return false }
}
const available = {}
for (const [key, name] of Object.entries(PATTERNS)) {
  available[key] = (await exists(`public/map-assets/patterns/${name}.png`)) ? name : null
}

const style = await (await fetch(SRC)).json()
style.name = 'pineapple-painted'

// 1) 删掉会和我们自己的标签打架的图层:POI 图标、公路盾牌、机场标签
style.layers = style.layers.filter((l) =>
  !(l.type === 'symbol' && l['source-layer'] === 'poi') &&
  !(l.type === 'symbol' && l['source-layer'] === 'aerodrome_label') &&
  !(l.type === 'symbol' && l['source-layer'] === 'transportation_name' && /shield/.test(l.id)),
)

const classIs = (l, cls) => JSON.stringify(l.filter ?? '').includes(`"${cls}"`)
const fillWithPattern = (layer, color, pattern) => {
  layer.paint['fill-color'] = color
  layer.paint['fill-opacity'] = 1
  if (pattern) layer.paint['fill-pattern'] = pattern
}

// 2) 逐层重配色
for (const layer of style.layers) {
  const sl = layer['source-layer']
  layer.paint ??= {}
  if (layer.type === 'background') layer.paint['background-color'] = palette.background
  if (layer.type === 'fill' && sl === 'water') fillWithPattern(layer, palette.water, available.water)
  if (layer.type === 'line' && sl === 'waterway') layer.paint['line-color'] = palette.waterway
  if (layer.type === 'fill' && sl === 'landcover') {
    if (classIs(layer, 'wood')) fillWithPattern(layer, palette.wood, available.wood)
    else if (classIs(layer, 'grass')) fillWithPattern(layer, palette.grass, available.grass)
    else if (classIs(layer, 'sand')) fillWithPattern(layer, palette.sand, available.sand)
    else fillWithPattern(layer, palette.grass, null)
  }
  if (layer.type === 'fill' && sl === 'park') fillWithPattern(layer, palette.grass, available.grass)
  if (layer.type === 'line' && sl === 'park') layer.paint['line-color'] = palette.wood
  if (layer.type === 'fill' && sl === 'landuse') {
    fillWithPattern(layer, classIs(layer, 'residential') ? palette.residential : palette.grass, null)
  }
  if (layer.type === 'fill' && sl === 'building') {
    layer.paint['fill-color'] = palette.building
    layer.paint['fill-outline-color'] = palette.roadCasing
  }
  if (layer.type === 'fill-extrusion' && sl === 'building') {
    layer.paint['fill-extrusion-color'] = palette.building3d
    layer.paint['fill-extrusion-opacity'] = 0.9
    layer.paint['fill-extrusion-vertical-gradient'] = true
    layer.minzoom = 14
  }
  if (layer.type === 'line' && sl === 'transportation') {
    layer.paint['line-color'] = /casing|outline/.test(layer.id) ? palette.roadCasing : palette.road
  }
  if (layer.type === 'fill' && sl === 'transportation') layer.paint['fill-color'] = palette.road
  if (layer.type === 'line' && sl === 'boundary') {
    layer.paint['line-color'] = palette.boundary
    layer.paint['line-opacity'] = 0.5
  }
  if (layer.type === 'symbol' && sl === 'place') {
    layer.paint['text-color'] = palette.labelText
    layer.paint['text-halo-color'] = palette.labelHalo
    layer.paint['text-halo-width'] = 1.5
  }
  if (layer.type === 'symbol' && sl === 'transportation_name') {
    layer.paint['text-color'] = palette.streetText
    layer.paint['text-halo-color'] = palette.labelHalo
    layer.paint['text-halo-width'] = 1.2
    layer.minzoom = Math.max(layer.minzoom ?? 0, 15)
  }
  if (layer.type === 'symbol' && (sl === 'water_name' || sl === 'waterway')) {
    layer.paint['text-color'] = palette.waterText
    layer.paint['text-halo-color'] = palette.labelHalo
  }
}

// 3) 自检:关键图层必须在,否则说明上游样式改版了
if (!style.layers.some((l) => l.id === 'building-3d' && l.type === 'fill-extrusion')) {
  throw new Error('liberty 里找不到 fill-extrusion 图层 building-3d,上游样式可能改版,先人工检查再继续')
}
if (!style.layers.some((l) => l['source-layer'] === 'landcover')) {
  throw new Error('liberty 里找不到 landcover 图层,上游样式可能改版')
}

await mkdir('public/maps', { recursive: true })
await writeFile(OUT, JSON.stringify(style))
console.log(`wrote ${OUT}: ${style.layers.length} layers; patterns:`, available)
```

- [ ] **Step 2: 生成并检查**

Run: `npm run maps && node -e "const s=require('./public/maps/painted.json');console.log(s.name,s.layers.length,s.layers.filter(l=>l['source-layer']==='poi').length,s.layers.find(l=>l.type==='background').paint)"`
Expected: 第一行 `wrote public/maps/painted.json: 1xx layers; patterns: { wood: null, grass: null, water: null, sand: null }`;第二行 `pineapple-painted <1xx> 0 { 'background-color': '#D6D07A' }`(POI 图层数为 0)。

- [ ] **Step 3: 确认样式里没有本地相对路径**

Run: `node -e "const s=require('./public/maps/painted.json');console.log(s.sprite, s.glyphs, Object.values(s.sources).map(x=>x.url||x.tiles))"`
Expected: `sprite` 与 `glyphs` 都是 `https://tiles.openfreemap.org/...` 绝对地址;sources 也是绝对地址。(所以样式 JSON 内部不需要 basePath 处理,只有**它自己的 fetch 地址**需要。)

- [ ] **Step 4: Commit**

```bash
git add scripts/build-map-style.mjs public/maps/painted.json
git commit -m "Add build-map-style: painted (hand-drawn warm) basemap style from OpenFreeMap liberty"
```

---

### Task 3: `placesToGeoJSON`(TDD)

**Files:**
- Create: `src/lib/map/placesToGeoJSON.ts`
- Create: `src/lib/map/placesToGeoJSON.test.ts`

- [ ] **Step 1: 写失败的测试**

新建 `src/lib/map/placesToGeoJSON.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { placesToGeoJSON } from './placesToGeoJSON'
import type { Place } from '@/lib/places'

const make = (over: Partial<Place>): Place => ({
  slug: 'x', name: 'X', suburb: 'S', city: 'C', kind: 'food',
  cuisine_en: 'Cuisine', cuisine_zh: '菜系', map_url: 'https://maps.google.com/?q=1', map_type: 'google',
  visited: '2026-01', images: ['1.jpg', '2.jpg'], coords: [144.9, -37.8], review_en: '', review_zh: '',
  ...over,
})

describe('placesToGeoJSON', () => {
  it('turns each place into a Point feature with flat properties', () => {
    const fc = placesToGeoJSON([make({ slug: 'a', tagline_en: 'Hi', tagline_zh: '嗨' }), make({ slug: 'b', coords: [1, 2] })])
    expect(fc.type).toBe('FeatureCollection')
    expect(fc.features).toHaveLength(2)
    expect(fc.features[0].geometry).toEqual({ type: 'Point', coordinates: [144.9, -37.8] })
    expect(fc.features[0].properties.slug).toBe('a')
    expect(fc.features[0].properties.tagline_zh).toBe('嗨')
    expect(fc.features[1].geometry.coordinates).toEqual([1, 2])
  })
  it('uses the first image as cover and empty strings for missing taglines', () => {
    const [f] = placesToGeoJSON([make({})]).features
    expect(f.properties.cover).toBe('1.jpg')
    expect(f.properties.tagline_en).toBe('')
    expect(placesToGeoJSON([make({ images: [] })]).features[0].properties.cover).toBe('')
  })
  it('keeps no nested objects in properties (MapLibre flattens them otherwise)', () => {
    const [f] = placesToGeoJSON([make({})]).features
    for (const v of Object.values(f.properties)) expect(typeof v).toBe('string')
  })
})
```

- [ ] **Step 2: 跑测试,确认失败**

Run: `npx vitest run src/lib/map/placesToGeoJSON.test.ts`
Expected: FAIL,`Failed to load url ./placesToGeoJSON`。

- [ ] **Step 3: 实现**

新建 `src/lib/map/placesToGeoJSON.ts`:

```ts
import type { Feature, FeatureCollection, Point } from 'geojson'
import type { Place, PlaceKind } from '@/lib/places'

/** 地图上一个地点的属性:全部是字符串,方便 MapLibre 表达式与 setData */
export type PlaceProps = {
  slug: string
  name: string
  kind: PlaceKind
  suburb: string
  city: string
  cuisine_en: string
  cuisine_zh: string
  tagline_en: string
  tagline_zh: string
  visited: string
  map_url: string
  map_type: 'google' | 'amap'
  /** 封面文件名(images[0]),完整路径由展示层拼 `${basePath}/images/${slug}/${cover}` */
  cover: string
}

export type PlaceFeature = Feature<Point, PlaceProps>
export type PlaceCollection = FeatureCollection<Point, PlaceProps>

export function placesToGeoJSON(places: Place[]): PlaceCollection {
  return {
    type: 'FeatureCollection',
    features: places.map(p => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: p.coords },
      properties: {
        slug: p.slug,
        name: p.name,
        kind: p.kind,
        suburb: p.suburb,
        city: p.city,
        cuisine_en: p.cuisine_en,
        cuisine_zh: p.cuisine_zh,
        tagline_en: p.tagline_en ?? '',
        tagline_zh: p.tagline_zh ?? '',
        visited: p.visited,
        map_url: p.map_url,
        map_type: p.map_type,
        cover: p.images[0] ?? '',
      },
    })),
  }
}
```

- [ ] **Step 4: 跑测试,确认通过**

Run: `npx vitest run src/lib/map/placesToGeoJSON.test.ts`
Expected: `3 passed`。

- [ ] **Step 5: Commit**

```bash
git add src/lib/map/placesToGeoJSON.ts src/lib/map/placesToGeoJSON.test.ts
git commit -m "Add placesToGeoJSON"
```

---

### Task 4: 纯逻辑三件:`geo.boundsOf`、`urlState`、`kinds`(TDD)

**Files:**
- Create: `src/lib/map/geo.ts`、`src/lib/map/geo.test.ts`
- Create: `src/lib/map/urlState.ts`、`src/lib/map/urlState.test.ts`
- Create: `src/lib/map/kinds.ts`、`src/lib/map/kinds.test.ts`

- [ ] **Step 1: 写三个失败的测试**

新建 `src/lib/map/geo.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { boundsOf } from './geo'

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
```

新建 `src/lib/map/urlState.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { parseMapUrl, serializeMapUrl } from './urlState'

describe('parseMapUrl', () => {
  it('reads city and place', () => {
    expect(parseMapUrl('?city=melbourne&place=zareh')).toEqual({ city: 'melbourne', place: 'zareh' })
  })
  it('accepts a search string without the leading ?', () => {
    expect(parseMapUrl('city=towada')).toEqual({ city: 'towada', place: null })
  })
  it('drops values that are not url-safe slugs', () => {
    expect(parseMapUrl('?city=<script>&place=Zareh')).toEqual({ city: null, place: null })
  })
  it('returns nulls for an empty string', () => {
    expect(parseMapUrl('')).toEqual({ city: null, place: null })
  })
})

describe('serializeMapUrl', () => {
  it('builds a query string, omitting nulls', () => {
    expect(serializeMapUrl({ city: 'melbourne', place: null })).toBe('?city=melbourne')
    expect(serializeMapUrl({ city: 'melbourne', place: 'zareh' })).toBe('?city=melbourne&place=zareh')
  })
  it('returns an empty string when nothing is set', () => {
    expect(serializeMapUrl({ city: null, place: null })).toBe('')
  })
  it('round-trips', () => {
    const s = { city: 'mount-gambier', place: 'south-aus-hotel' }
    expect(parseMapUrl(serializeMapUrl(s))).toEqual(s)
  })
})
```

新建 `src/lib/map/kinds.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { KIND_ORDER, KIND_COLORS, KIND_GLYPHS } from './kinds'
import { RESTAURANT_KINDS, SPOT_KINDS } from '@/lib/places'

describe('kinds', () => {
  it('orders every kind exactly once', () => {
    expect([...KIND_ORDER].sort()).toEqual([...RESTAURANT_KINDS, ...SPOT_KINDS].sort())
  })
  it('has a hex colour and a glyph for each kind', () => {
    for (const k of KIND_ORDER) {
      expect(KIND_COLORS[k]).toMatch(/^#[0-9A-F]{6}$/i)
      expect(KIND_GLYPHS[k].length).toBeGreaterThan(0)
    }
  })
})
```

- [ ] **Step 2: 跑测试,确认三个都失败**

Run: `npx vitest run src/lib/map/`
Expected: 三个文件 FAIL(模块不存在);`placesToGeoJSON.test.ts` 与 `cities.test.ts` 仍 PASS。

- [ ] **Step 3: 实现三个模块**

新建 `src/lib/map/geo.ts`:

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
```

新建 `src/lib/map/urlState.ts`:

```ts
export type MapUrlState = { city: string | null; place: string | null }

const SLUG = /^[a-z0-9-]+$/

/** 解析 `?city=&place=`;非 slug 形态的值一律丢弃(URL 是用户可控输入) */
export function parseMapUrl(search: string): MapUrlState {
  const p = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search)
  const clean = (v: string | null) => (v && SLUG.test(v) ? v : null)
  return { city: clean(p.get('city')), place: clean(p.get('place')) }
}

export function serializeMapUrl(state: MapUrlState): string {
  const p = new URLSearchParams()
  if (state.city) p.set('city', state.city)
  if (state.place) p.set('place', state.place)
  const s = p.toString()
  return s ? `?${s}` : ''
}
```

新建 `src/lib/map/kinds.ts`:

```ts
import type { PlaceKind } from '@/lib/places'

/** 地图上分类 chips 的顺序 */
export const KIND_ORDER: PlaceKind[] = ['food', 'cafe', 'bar', 'sight', 'activity', 'shop', 'stay']

/** 分类色:徽章占位底色、卡片 chip、筛选 chip 选中态 */
export const KIND_COLORS: Record<PlaceKind, string> = {
  food: '#E8603C',
  cafe: '#8C5A3C',
  bar: '#7B4B94',
  sight: '#2F8F83',
  activity: '#3C8ABF',
  shop: '#D58A2B',
  stay: '#5A6B9E',
}

/** 徽章占位用的 emoji;Phase 3 换成手绘 PNG 后仅卡片仍可能用到 */
export const KIND_GLYPHS: Record<PlaceKind, string> = {
  food: '🍜',
  cafe: '☕',
  bar: '🍷',
  sight: '📷',
  activity: '🥾',
  shop: '🛍️',
  stay: '🛏️',
}
```

- [ ] **Step 4: 跑测试,确认通过**

Run: `npx vitest run src/lib/map/`
Expected: 全部 PASS(`geo` 3、`urlState` 7、`kinds` 2,加上已有的)。

- [ ] **Step 5: Commit**

```bash
git add src/lib/map/geo.ts src/lib/map/geo.test.ts src/lib/map/urlState.ts src/lib/map/urlState.test.ts src/lib/map/kinds.ts src/lib/map/kinds.test.ts
git commit -m "Add map pure logic: boundsOf, url state, kind table"
```

---

### Task 5: 文案字典

**Files:**
- Create: `src/lib/mapI18n.ts`
- Modify: `src/lib/wineI18n.ts`

- [ ] **Step 1: 新建 `src/lib/mapI18n.ts`**

```ts
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
}

export const MAP_UI: Record<'en' | 'zh', MapUIStrings> = {
  en: {
    title: 'Pineapple Map',
    loading: 'Loading map…',
    searchPlaceholder: 'Find a place, cuisine or suburb…',
    noResults: 'No matching place',
    overview: 'Overview',
    kinds: {
      food: 'Food', cafe: 'Cafés', bar: 'Bars',
      sight: 'Sights', activity: 'Things to do', shop: 'Shops', stay: 'Stays',
    },
    viewStory: 'Read the story →',
    openGoogle: 'Open in Google Maps ↗',
    openAmap: 'Open in Amap ↗',
    close: 'Close',
    mapFailedTitle: 'The map could not load',
    mapFailedHint: 'Here is the full list instead — every place still links to its page.',
    seeOnMap: 'See on the map →',
  },
  zh: {
    title: '菠萝子地图',
    loading: '地图加载中…',
    searchPlaceholder: '找店、菜系或街区…',
    noResults: '没有匹配的地方',
    overview: '总览',
    kinds: {
      food: '美食', cafe: '咖啡', bar: '酒吧',
      sight: '景点', activity: '玩乐', shop: '买买买', stay: '住宿',
    },
    viewStory: '查看图文 →',
    openGoogle: '在 Google 地图打开 ↗',
    openAmap: '在高德地图打开 ↗',
    close: '关闭',
    mapFailedTitle: '地图没能加载',
    mapFailedHint: '先看列表吧,每一家都能点进详情。',
    seeOnMap: '在地图上看 →',
  },
}
```

- [ ] **Step 2: 给导航加 `navMap`**

`src/lib/wineI18n.ts`:
- `WineUIStrings` 类型里 `navWine: string` 下一行加 `navMap: string`
- `en` 对象里 `navWine: 'Wine',` 下一行加 `navMap: 'Map',`
- `zh` 对象里 `navWine: '酒评',` 下一行加 `navMap: '地图',`

- [ ] **Step 3: 类型检查**

Run: `npx tsc --noEmit`
Expected: 无错误。

- [ ] **Step 4: Commit**

```bash
git add src/lib/mapI18n.ts src/lib/wineI18n.ts
git commit -m "Add map UI strings (en/zh) and navMap label"
```

---

### Task 6: 画布生成的标签底图与徽章占位

**Files:**
- Create: `src/components/map/mapImages.ts`

这个模块依赖浏览器 canvas,vitest(node 环境)不测它,靠 Task 11 的截图验证。

- [ ] **Step 1: 新建 `src/components/map/mapImages.ts`**

```ts
import { KIND_COLORS, KIND_GLYPHS } from '@/lib/map/kinds'
import type { PlaceKind } from '@/lib/places'

const DPR = 2

type StretchOptions = {
  pixelRatio: number
  stretchX: [number, number][]
  stretchY: [number, number][]
  content: [number, number, number, number]
}

/**
 * 白色圆角标签底图(9-slice 可拉伸),底边中央带小三角指针。
 * 返回 map.addImage 需要的 ImageData 与拉伸选项;所有像素坐标都是图片实际像素(已乘 DPR)。
 * 逻辑尺寸:标签体 64×28,指针高 8 → 总高 36。
 */
export function makeLabelBackground(): { image: ImageData; options: StretchOptions } {
  const w = 64, body = 28, tip = 8, h = body + tip, r = 9
  const c = document.createElement('canvas')
  c.width = w * DPR
  c.height = h * DPR
  const ctx = c.getContext('2d')!
  ctx.scale(DPR, DPR)
  ctx.fillStyle = '#FFFFFF'
  ctx.strokeStyle = 'rgba(60, 55, 40, 0.28)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(r, 0.5)
  ctx.lineTo(w - r, 0.5)
  ctx.quadraticCurveTo(w - 0.5, 0.5, w - 0.5, r)
  ctx.lineTo(w - 0.5, body - r)
  ctx.quadraticCurveTo(w - 0.5, body - 0.5, w - r, body - 0.5)
  ctx.lineTo(w / 2 + tip * 0.75, body - 0.5)
  ctx.lineTo(w / 2, h - 0.5) // 指针尖
  ctx.lineTo(w / 2 - tip * 0.75, body - 0.5)
  ctx.lineTo(r, body - 0.5)
  ctx.quadraticCurveTo(0.5, body - 0.5, 0.5, body - r)
  ctx.lineTo(0.5, r)
  ctx.quadraticCurveTo(0.5, 0.5, r, 0.5)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
  return {
    image: ctx.getImageData(0, 0, w * DPR, h * DPR),
    options: {
      pixelRatio: DPR,
      // 可拉伸区:圆角之间的直边;content = 文字允许占据的区域(不含指针)
      stretchX: [[r * DPR, (w - r) * DPR]],
      stretchY: [[r * DPR, (body - r) * DPR]],
      content: [6 * DPR, 4 * DPR, (w - 6) * DPR, (body - 4) * DPR],
    },
  }
}

/** 分类徽章占位:实色圆 + emoji。Phase 3 换手绘 PNG 时只改这里(或改成 map.loadImage) */
export function makeBadge(kind: PlaceKind): { image: ImageData; options: { pixelRatio: number } } {
  const s = 32
  const c = document.createElement('canvas')
  c.width = s * DPR
  c.height = s * DPR
  const ctx = c.getContext('2d')!
  ctx.scale(DPR, DPR)
  ctx.fillStyle = KIND_COLORS[kind]
  ctx.beginPath()
  ctx.arc(s / 2, s / 2, s / 2 - 1.5, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = '#FFFFFF'
  ctx.lineWidth = 2
  ctx.stroke()
  ctx.font = '16px system-ui, "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(KIND_GLYPHS[kind], s / 2, s / 2 + 1)
  return { image: ctx.getImageData(0, 0, s * DPR, s * DPR), options: { pixelRatio: DPR } }
}
```

- [ ] **Step 2: 类型检查**

Run: `npx tsc --noEmit`
Expected: 无错误。

- [ ] **Step 3: Commit**

```bash
git add src/components/map/mapImages.ts
git commit -m "Add canvas-drawn label background (9-slice) and badge placeholders"
```

---

### Task 7: `MapView.tsx`(唯一碰 maplibre-gl 的组件)

**Files:**
- Create: `src/components/map/MapView.tsx`

- [ ] **Step 1: 新建 `src/components/map/MapView.tsx`**

```tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import {
  Map as MapLibreMap,
  type GeoJSONSource,
  type MapLayerMouseEvent,
  type StyleSpecification,
} from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import type { Point } from 'geojson'
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
  cbRef.current = { onPlaceClick: props.onPlaceClick, onMapClick: props.onMapClick, onFail: props.onFail }
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
      if (b) m.fitBounds(b, { padding: 60, pitch: 0, bearing: 0, maxZoom: 12, duration: reducedMotion ? 0 : 1200 })
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

  return <div ref={containerRef} className="absolute inset-0" />
}
```

- [ ] **Step 2: 类型检查**

Run: `npx tsc --noEmit`
Expected: 无错误。常见报错与处理:
- `MapLayerMouseEvent` 找不到 → 用 Task 1 Step 3 查到的实际类型名替换。
- `padding` 不接受对象 → 查 d.ts 里 `PaddingOptions`,按其字段名改。
- `addImage` 的第三个参数类型不匹配 → 查 `StyleImageMetadata`,把 `mapImages.ts` 的 `StretchOptions` 字段对齐。
- layout/paint 里的表达式数组(如 `['case', ...]`、`['step', ...]`)报「不能赋给 ExpressionSpecification」→ `import type { ExpressionSpecification } from 'maplibre-gl'`,把该数组写成 `([...] as ExpressionSpecification)`。

- [ ] **Step 3: Commit**

```bash
git add src/components/map/MapView.tsx
git commit -m "Add MapView: MapLibre map with clustered label/badge symbol layers"
```

---

### Task 8: 卡片、chips、搜索、降级列表

**Files:**
- Create: `src/components/map/PlaceCard.tsx`
- Create: `src/components/map/CityChips.tsx`
- Create: `src/components/map/KindChips.tsx`
- Create: `src/components/map/MapSearch.tsx`
- Create: `src/components/map/MapFallbackList.tsx`

- [ ] **Step 1: `PlaceCard.tsx`**

```tsx
'use client'

import Link from 'next/link'
import { useLang } from '@/components/LanguageContext'
import { basePath } from '@/lib/basePath'
import { formatVisited } from '@/lib/format'
import { MAP_UI } from '@/lib/mapI18n'
import { KIND_COLORS } from '@/lib/map/kinds'
import type { PlaceFeature } from '@/lib/map/placesToGeoJSON'

export default function PlaceCard({ feature, onClose }: { feature: PlaceFeature; onClose: () => void }) {
  const { lang } = useLang()
  const ui = MAP_UI[lang]
  const p = feature.properties
  const tagline = lang === 'en' ? p.tagline_en : p.tagline_zh
  const cuisine = lang === 'en' ? p.cuisine_en : p.cuisine_zh
  const where = lang === 'en' ? `${p.suburb}, ${p.city}` : `${p.city} · ${p.suburb}`
  const visited = formatVisited(p.visited, lang)
  const mapLabel = p.map_type === 'amap' ? ui.openAmap : ui.openGoogle

  return (
    <aside
      role="dialog"
      aria-label={p.name}
      className="absolute z-20 inset-x-0 bottom-0 md:inset-x-auto md:right-4 md:top-4 md:bottom-4 md:w-[360px] flex flex-col max-h-[70dvh] md:max-h-none overflow-hidden rounded-t-2xl md:rounded-2xl bg-[#FCFAF4] text-[#13314A] shadow-2xl"
    >
      {p.cover && (
        <div className="relative shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`${basePath}/images/${p.slug}/${p.cover}`} alt={p.name} className="w-full h-40 md:h-52 object-cover" />
        </div>
      )}
      <button
        type="button"
        onClick={onClose}
        aria-label={ui.close}
        className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/50 text-white text-lg leading-none"
      >
        ×
      </button>
      <div className="p-4 flex flex-col gap-2 overflow-y-auto">
        <div className="flex items-center gap-2 flex-wrap">
          <h2 className="font-display text-2xl font-bold">{p.name}</h2>
          <span
            className="font-label text-[10px] uppercase tracking-widest text-white px-2 py-0.5 rounded-full"
            style={{ background: KIND_COLORS[p.kind] }}
          >
            {ui.kinds[p.kind]}
          </span>
        </div>
        <p className="font-label text-[11px] uppercase tracking-wider text-[#8A99A6]">{cuisine} · {where}</p>
        {visited && <p className="font-label text-[11px] uppercase tracking-wider text-[#F0742A]">{visited}</p>}
        {tagline && <p className="text-base leading-relaxed">{tagline}</p>}
        <div className="flex gap-2 pt-2 flex-wrap">
          <Link
            href={`/${p.slug}`}
            className="inline-flex items-center bg-[#0F84B5] text-white font-label text-xs font-bold uppercase tracking-widest px-4 py-2 hover:bg-[#F0742A] transition-colors"
          >
            {ui.viewStory}
          </Link>
          <a
            href={p.map_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center border-[1.5px] border-[#0F84B5] text-[#0F84B5] font-label text-xs font-bold uppercase tracking-widest px-4 py-2 hover:border-[#F0742A] hover:text-[#F0742A] transition-colors"
          >
            {mapLabel}
          </a>
        </div>
      </div>
    </aside>
  )
}
```

- [ ] **Step 2: `CityChips.tsx`**

```tsx
'use client'

import { useLang } from '@/components/LanguageContext'
import { MAP_UI } from '@/lib/mapI18n'
import type { City } from '@/lib/map/cities'

export default function CityChips({
  cities, active, onChange,
}: { cities: City[]; active: string | null; onChange: (slug: string | null) => void }) {
  const { lang } = useLang()
  const ui = MAP_UI[lang]
  const chip = (on: boolean) =>
    `shrink-0 rounded-full px-3 py-1.5 font-label text-xs uppercase tracking-widest transition-colors ${
      on ? 'bg-[#F0742A] text-white' : 'bg-[#1E242C]/80 text-[#F8F2DD] hover:bg-[#1E242C]'
    }`
  return (
    <div className="flex gap-2 overflow-x-auto">
      <button type="button" className={chip(active === null)} onClick={() => onChange(null)}>
        {ui.overview}
      </button>
      {cities.map(c => (
        <button key={c.slug} type="button" className={chip(active === c.slug)} onClick={() => onChange(c.slug)}>
          {lang === 'en' ? c.name_en : c.name_zh}
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 3: `KindChips.tsx`**(只渲染数据里实际出现的分类;少于两类就不显示)

```tsx
'use client'

import { useLang } from '@/components/LanguageContext'
import { MAP_UI } from '@/lib/mapI18n'
import { KIND_COLORS, KIND_ORDER } from '@/lib/map/kinds'
import type { PlaceKind } from '@/lib/places'

export default function KindChips({
  available, active, onToggle,
}: { available: PlaceKind[]; active: PlaceKind[]; onToggle: (k: PlaceKind) => void }) {
  const { lang } = useLang()
  const ui = MAP_UI[lang]
  const shown = KIND_ORDER.filter(k => available.includes(k))
  if (shown.length < 2) return null
  return (
    <div className="flex gap-2 overflow-x-auto">
      {shown.map(k => {
        const on = active.includes(k)
        return (
          <button
            key={k}
            type="button"
            aria-pressed={on}
            onClick={() => onToggle(k)}
            className={`shrink-0 rounded-full px-3 py-1 font-label text-[11px] uppercase tracking-widest border transition-colors ${
              on ? 'text-white border-transparent' : 'bg-[#1E242C]/70 text-[#F8F2DD]/70 border-white/20'
            }`}
            style={on ? { background: KIND_COLORS[k] } : undefined}
          >
            {ui.kinds[k]}
          </button>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 4: `MapSearch.tsx`**

```tsx
'use client'

import { useMemo, useState } from 'react'
import { useLang } from '@/components/LanguageContext'
import { MAP_UI } from '@/lib/mapI18n'
import type { PlaceFeature } from '@/lib/map/placesToGeoJSON'

export default function MapSearch({
  features, onPick,
}: { features: PlaceFeature[]; onPick: (slug: string) => void }) {
  const { lang } = useLang()
  const ui = MAP_UI[lang]
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)

  const hits = useMemo(() => {
    const kw = q.trim().toLowerCase()
    if (!kw) return []
    return features
      .filter(f => {
        const p = f.properties
        return [p.name, p.cuisine_en, p.cuisine_zh, p.suburb, p.city].join(' ').toLowerCase().includes(kw)
      })
      .slice(0, 8)
  }, [features, q])

  return (
    <div className="relative max-w-xl">
      <input
        value={q}
        onChange={e => { setQ(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={ui.searchPlaceholder}
        aria-label={ui.searchPlaceholder}
        className="w-full rounded-full bg-[#1E242C]/90 text-[#F8F2DD] placeholder-[#F8F2DD]/60 px-4 py-2.5 text-sm outline-none ring-1 ring-white/10 focus:ring-[#F0742A]"
      />
      {open && q.trim() && (
        <ul className="absolute mt-1 w-full rounded-xl bg-[#FCFAF4] text-[#13314A] shadow-xl overflow-hidden">
          {hits.length === 0 && <li className="px-4 py-2 text-sm text-[#8A99A6]">{ui.noResults}</li>}
          {hits.map(f => (
            <li key={f.properties.slug}>
              <button
                type="button"
                className="w-full text-left px-4 py-2 text-sm hover:bg-[#F0742A]/10"
                onMouseDown={e => e.preventDefault()}
                onClick={() => { onPick(f.properties.slug); setQ(''); setOpen(false) }}
              >
                <span className="font-semibold">{f.properties.name}</span>
                <span className="text-[#8A99A6]">
                  {' '}· {lang === 'en' ? f.properties.cuisine_en : f.properties.cuisine_zh} · {f.properties.suburb}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
```

- [ ] **Step 5: `MapFallbackList.tsx`**

```tsx
'use client'

import Link from 'next/link'
import { useLang } from '@/components/LanguageContext'
import { MAP_UI } from '@/lib/mapI18n'
import { cityOf, type City } from '@/lib/map/cities'
import type { PlaceCollection, PlaceFeature } from '@/lib/map/placesToGeoJSON'
import type { LngLat } from '@/lib/places'

export default function MapFallbackList({ data, cities }: { data: PlaceCollection; cities: City[] }) {
  const { lang } = useLang()
  const ui = MAP_UI[lang]
  const groups = new Map<string, PlaceFeature[]>()
  for (const f of data.features) {
    const c = cityOf(f.geometry.coordinates as LngLat, cities)
    const key = c ? (lang === 'en' ? c.name_en : c.name_zh) : f.properties.city
    groups.set(key, [...(groups.get(key) ?? []), f])
  }
  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <h1 className="font-display text-3xl font-bold mb-2">{ui.mapFailedTitle}</h1>
      <p className="text-[#8A99A6] mb-8">{ui.mapFailedHint}</p>
      {[...groups.entries()].map(([city, list]) => (
        <section key={city} className="mb-8">
          <h2 className="font-label text-xs uppercase tracking-widest text-[#0C6E97] mb-3">{city}</h2>
          <ul className="space-y-2">
            {list.map(f => (
              <li key={f.properties.slug}>
                <Link href={`/${f.properties.slug}`} className="font-semibold hover:text-[#F0742A]">
                  {f.properties.name}
                </Link>
                <span className="text-[#8A99A6]">
                  {' '}· {lang === 'en' ? f.properties.cuisine_en : f.properties.cuisine_zh} · {f.properties.suburb}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
```

- [ ] **Step 6: 类型检查 + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: 无错误。

- [ ] **Step 7: Commit**

```bash
git add src/components/map/PlaceCard.tsx src/components/map/CityChips.tsx src/components/map/KindChips.tsx src/components/map/MapSearch.tsx src/components/map/MapFallbackList.tsx
git commit -m "Add map UI: place card, city/kind chips, search, fallback list"
```

---

### Task 9: 客户端外壳与页面

**Files:**
- Create: `src/components/map/MapPageClient.tsx`
- Create: `src/app/map/page.tsx`

- [ ] **Step 1: `MapPageClient.tsx`**

```tsx
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

  // 首次挂载:读 URL、读系统动效偏好(静态导出下不用 useSearchParams,避免 Suspense 包装)
  useEffect(() => {
    const { city, place } = parseMapUrl(window.location.search)
    const f = place ? (bySlug.get(place) ?? null) : null
    const cityFromPlace = f ? (cityOf(f.geometry.coordinates as LngLat, cities)?.slug ?? null) : null
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
    <section className="relative h-[calc(100dvh-64px)] min-h-[480px] bg-[#1E242C]" aria-label={ui.title}>
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
```

- [ ] **Step 2: `src/app/map/page.tsx`**

```tsx
import type { Metadata } from 'next'
import { getAllPlaces } from '@/lib/places'
import { placesToGeoJSON } from '@/lib/map/placesToGeoJSON'
import { CITIES } from '@/lib/map/cities'
import MapPageClient from '@/components/map/MapPageClient'

export const metadata: Metadata = {
  title: '菠萝子地图 · 菠萝子指南',
  description: 'Every place on the guide, on one hand-painted map.',
}

export default function MapPage() {
  // 构建时执行:getAllPlaces 会对每个数据文件做 zod 校验,缺坐标直接让构建失败
  const data = placesToGeoJSON(getAllPlaces())
  return <MapPageClient data={data} cities={CITIES} />
}
```

- [ ] **Step 3: 类型检查 + lint + 构建**

Run: `npx tsc --noEmit && npm run lint && npm run build`
Expected: 全部通过;构建输出里出现 `/map` 路由(静态)。若构建报 `ssr: false is not allowed with next/dynamic in Server Components`,说明 `dynamic()` 被放进了服务端文件——它必须留在 `MapPageClient.tsx`(有 `'use client'`)里。

- [ ] **Step 4: Commit**

```bash
git add src/components/map/MapPageClient.tsx src/app/map/page.tsx
git commit -m "Add /map page: client shell with URL state, chips, search and card"
```

---

### Task 10: 导航入口与详情页链接

**Files:**
- Modify: `src/components/Header.tsx`
- Modify: `src/components/RestaurantDetail.tsx`

- [ ] **Step 1: Header 加「地图」**

`src/components/Header.tsx`:

把

```tsx
  const isWine = pathname.startsWith('/wine')
```

改成

```tsx
  const isWine = pathname.startsWith('/wine')
  const isMap = pathname.startsWith('/map')
```

把 `<nav>` 里的两个链接改成三个:

```tsx
            <Link href="/" className={navClass(!isWine && !isMap)}>{ui.navRestaurants}</Link>
            <Link href="/wine" className={navClass(isWine)}>{ui.navWine}</Link>
            <Link href="/map" className={navClass(isMap)}>{ui.navMap}</Link>
```

- [ ] **Step 2: 详情页加「在地图上看 →」**

`src/components/RestaurantDetail.tsx`:

顶部 import 区加两行:

```tsx
import Link from 'next/link'
import { MAP_UI } from '@/lib/mapI18n'
```

在 Google 地图那个 `<a ...>…{mapLabel}</a>` 之后(`<Lightbox` 之前)加:

```tsx
      <Link
        href={`/map?place=${slug}`}
        className="ml-4 inline-flex items-center font-label text-xs uppercase tracking-widest text-[#0F84B5] hover:text-[#F0742A] transition-colors"
      >
        {MAP_UI[lang].seeOnMap}
      </Link>
```

- [ ] **Step 3: 类型检查 + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: 无错误。

- [ ] **Step 4: Commit**

```bash
git add src/components/Header.tsx src/components/RestaurantDetail.tsx
git commit -m "Link the map from the header nav and detail pages"
```

---

### Task 11: 本地预览验收(dev)

这一步是本阶段真正的「测试」。Claude 桌面端用内置浏览器工具;命令行环境就手动开浏览器,逐项核对并截图。

- [ ] **Step 1: 启动并打开**

`preview_start` 的 `gourmet-dev`(或 `npm run dev`),打开 `http://localhost:3000/gourmet/map`。

- [ ] **Step 2: 控制台与网络**

Expected:控制台**无红色报错**;网络里 `painted.json` 200,`tiles.openfreemap.org` 的瓦片与字形请求 200。
常见问题:
- `painted.json` 404 → `styleUrl` 的 basePath 处理与 Task 1 Step 4 的结论不一致。
- 控制台 `Failed to construct 'Worker'` 或 worker 相关报错(maplibre 6 的 ESM worker 在某些打包配置下取不到)→ 把 `node_modules/maplibre-gl/dist/` 里的 worker 文件(Task 1 Step 3 最后一条列出的那个)复制到 `public/maps/`,在 `MapView.tsx` 建图前调用 `setWorkerUrl(`${basePath}/maps/<worker 文件名>`)`(`import { setWorkerUrl } from 'maplibre-gl'`),并在报告里说明。
- 标签文字不显示但徽章显示 → `text-font` 字体栈名不对,只能用 `Noto Sans Regular` / `Noto Sans Bold` / `Noto Sans Italic`。

- [ ] **Step 3: 总览**

Expected:镜头框住三地(澳洲东南 + 日本北部),看到 3 个带数字的橙色聚合圆点(4 / 1 / 1),或在该缩放下已散开的标签;顶部有搜索框、「总览 / 墨尔本 / 十和田(青森) / 芒特甘比尔」chips、三个分类 chips(美食 / 酒吧 … 只显示数据里有的)。

- [ ] **Step 4: 城市切换**

点「墨尔本」→ 镜头飞到墨尔本,pitch 30°,看到 4 个白色圆角标签(Mary's、Zareh、Don's、Death & Co),每个上方一个彩色徽章;URL 变为 `?city=melbourne`。点「十和田」→ 飞到 Soma Pastry Shop,pitch 50°,z15 下能看到建筑轮廓。

- [ ] **Step 5: 卡片**

在墨尔本点 Zareh 的标签 → 镜头推到 z16 / pitch 55,标签文字变橙色;卡片出现(手机:底部抽屉;桌面:右侧面板),含封面图、名字、「美食」chip、`Middle Eastern · Kensington, Melbourne`、造访时间、一句话推荐、两个按钮。URL 为 `?city=melbourne&place=zareh`。点「查看图文 →」进入 `/gourmet/zareh`;浏览器后退回到地图。

- [ ] **Step 6: URL 直达**

新标签页直接打开 `http://localhost:3000/gourmet/map?city=melbourne&place=dons` → 落地即在 Don's 上方并弹卡片。

- [ ] **Step 7: 关闭与筛选**

点地图空白处 → 卡片收起,URL 去掉 `place=`。点「酒吧」chip 关掉 → Don's、Death & Co 的标签与徽章消失,再点回来恢复。

- [ ] **Step 8: 搜索**

搜索框输入 `nigerian` → 下拉出现 Mary's;点它 → 飞过去并弹卡片,搜索框清空。输入 `zzz` → 显示「没有匹配的地方」。

- [ ] **Step 9: 语言切换**

点右上「中文 / EN」→ chips、卡片文案、按钮文案全部切换;地图上的店名标签保持原名不变。

- [ ] **Step 10: 手机视口**

视口 375×812:搜索框、chips 横向可滚动、不遮住标签;卡片为底部抽屉,地图把目标点抬到卡片上方可见区域;chips 与卡片都能点到。

- [ ] **Step 11: 减少动态效果**

DevTools → Rendering → `prefers-reduced-motion: reduce` → 刷新,切城市 / 点标签时镜头瞬移而非飞行。

- [ ] **Step 12: 降级**

DevTools → Network → 添加请求阻止规则 `*painted.json*` → 刷新 → 页面显示「地图没能加载」+ 按城市分组的列表,每条可点进详情;控制台有一条 `[map] fallback to list:` 日志。取消阻止规则。

- [ ] **Step 13: 截图存档**

手机(墨尔本 + Zareh 卡片)与桌面(墨尔本总貌)各一张,存到 `docs/superpowers/screenshots/2026-11-13-map-phase1-mobile.png` 与 `...-desktop.png`(目录不存在就建)。

- [ ] **Step 14: Commit**

```bash
git add docs/superpowers/screenshots
git commit -m "Add Phase 1 map screenshots"
```

---

### Task 12: 构建产物验收(basePath)、文档与收尾

**Files:**
- Modify: `CLAUDE.md`
- Modify: `.github/workflows/deploy.yml`

- [ ] **Step 1: 用 CI 同样的环境变量构建**

Run: `NEXT_PUBLIC_BASE_PATH=/gourmet npm run build && ls out/map.html && grep -rl "gourmet/maps/painted.json" out/_next/static | head -1`
Expected: `out/map.html` 存在;grep 打印出至少一个 chunk 文件名(说明样式地址已带 `/gourmet`)。

- [ ] **Step 2: 按线上路径结构本地起一个静态服务**

```bash
SERVE_DIR=$(mktemp -d) && ln -s "$PWD/out" "$SERVE_DIR/gourmet" && (cd "$SERVE_DIR" && python3 -m http.server 3999)
```

(后台运行或开第二个终端。)打开 `http://localhost:3999/gourmet/map.html`:地图正常显示、点标签弹卡片、封面图正常。这一步验证的是**所有自家资源都带了 basePath**;哪一样 404 就回去补 `${basePath}`。完成后停掉服务。

- [ ] **Step 3: CLAUDE.md 加 `/map` 维护说明**

在 `CLAUDE.md` 的 `## Style` 小节**之前**插入:

```markdown
## Map (`/map`)
- Hand-painted-style real map (MapLibre GL 6 + OpenFreeMap vector tiles, free, no key). Design: `docs/superpowers/specs/2026-11-13-pineapple-map-design.md`; plans: `docs/superpowers/plans/2026-11-13-pineapple-map-phase*.md`.
- `src/components/map/MapView.tsx` is the **only** file that imports `maplibre-gl`; everything else is plain React. Pure logic lives in `src/lib/map/` and is unit-tested.
- Basemap style: edit the `palette` in `scripts/build-map-style.mjs`, run `npm run maps`, commit `public/maps/painted.json`. Never hand-edit the JSON. Dropping seamless PNGs into `public/map-assets/patterns/{pat-wood,pat-grass,pat-water,pat-sand}.png` and re-running `npm run maps` switches those layers to `fill-pattern` (they must also be registered with `map.addImage` under the same names — see spec §6.4).
- Places come from `getAllPlaces()` (restaurants/ + spots/); the page is static, so adding a place = adding a markdown file with `coords`. Cities/default camera: `src/data/map/cities.json`.
- URL state: `/map?city=<slug>&place=<slug>`. Labels use OpenFreeMap glyphs (`Noto Sans Bold` only). Map failure or no WebGL2 falls back to `MapFallbackList`.
- Label background and kind badges are drawn on a canvas at runtime (`mapImages.ts`); Phase 3 replaces badges with painted PNGs.
```

- [ ] **Step 3b: 修正 CLAUDE.md 里几处过期内容**(Phase 0 审阅时发现,与地图无关但顺手改掉)

`## Style` 里的

```
- Background `#FAFAF7`, accent/terracotta `#C84B2F`, rounded-2xl cards
```

改为

```
- Background `#FCFAF4` (cream), ink `#13314A`, accents `#F0742A` (orange) / `#0F84B5` (blue); map page chrome `#1E242C`. (Mediterranean redesign 2026-06 — the old `#FAFAF7` / `#C84B2F` are gone.)
```

`## Status` 里的

```
- Added so far: marys (Nigerian, Collingwood/Melbourne), south-aus-hotel (wine bar, Mount Gambier), death-and-co (cocktail bar, CBD/Melbourne)
```

改为

```
- Added so far: marys (Nigerian, Collingwood/Melbourne), south-aus-hotel (wine bar, Mount Gambier), death-and-co (cocktail bar, CBD/Melbourne), soma-pastry (pastry shop, Towada/Aomori), dons (wine bar, Prahran/Melbourne), zareh (Middle Eastern, Kensington/Melbourne)
```

`## Status` 里以「**地图计划(2026-11-13)**」开头的那一整行改为

```
- 地图(2026-11):总策划案 `docs/superpowers/specs/2026-11-13-pineapple-map-design.md`;Phase 0(coords / `places.ts` / `cities.json` / 改站名)已上线,Phase 1(`/map`)见下方「Map」一节,Phase 2+(小人、手绘资产、Takeout 导入)待做。
```

- [ ] **Step 3c: 部署工作流先跑测试再构建**

`.github/workflows/deploy.yml` 里

```yaml
      - run: npm ci
      - run: npm run build
```

改为

```yaml
      - run: npm ci
      - run: npm run test
      - run: npm run build
```

理由:`places.test.ts` / `cities.test.ts` 的真实数据用例是坐标与城市归属的第一道守卫;`/map` 上线后构建也会校验,但测试更早、报错更清楚。

- [ ] **Step 4: 三件套**

Run: `npm run lint && npm run test && npm run build`
Expected: 全绿。

- [ ] **Step 5: Commit**

```bash
git add CLAUDE.md .github/workflows/deploy.yml
git commit -m "Docs: /map notes, refresh stale CLAUDE.md lines; run tests in deploy workflow"
```

- [ ] **Step 6: 给业主的报告(不要 push、不要合并)**

报告包含:分支名 `feat/map-phase1`;Task 1 Step 3 与 Step 4 的核对结果(API 名是否一致、dev 下 basePath 结论);两张截图;Task 11 十二项逐条打勾;任何偏离计划的地方及原因;一句「等你看过截图点头,我再合并到 main 并 push」。

---

## 验收清单(对照设计文档 §8 Phase 1)

- [ ] 手机与桌面访问 `/map`:墨尔本 4 个标签、十和田 1 个、芒特甘比尔 1 个
- [ ] 点 Zareh 弹卡片,含封面与两个按钮
- [ ] 切城市镜头飞过去;`?city=&place=` 直达
- [ ] 阻止样式请求后重载 → 降级列表
- [ ] `NEXT_PUBLIC_BASE_PATH=/gourmet npm run build` 后的产物在 `/gourmet/` 前缀下资源路径全部正确
- [ ] `npm run lint && npm run test && npm run build` 全绿
- [ ] `deploy.yml` 已加 `npm run test`;CLAUDE.md 的配色 / Added so far / 地图状态三处已更新
- [ ] 截图已存档;报告已交,未 push
