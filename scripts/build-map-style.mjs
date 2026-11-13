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
