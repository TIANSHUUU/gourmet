import { z } from 'zod'

/** public/map-assets/manifest.json 的形状(由 scripts/ingest-map-assets.mjs 生成) */
export type AssetManifest = {
  patterns: string[]
  icons: string[]
  walker: 'pineapple-painted' | null
}

export const EMPTY_MANIFEST: AssetManifest = { patterns: [], icons: [], walker: null }

const schema = z.object({
  patterns: z.array(z.string()).default([]),
  icons: z.array(z.string()).default([]),
  walker: z.literal('pineapple-painted').nullable().default(null),
})

/** 解析失败一律回退空 manifest(= 全部用占位),绝不让地图页因为资产清单坏掉 */
export function parseManifest(raw: unknown): AssetManifest {
  const r = schema.safeParse(raw)
  return r.success ? r.data : EMPTY_MANIFEST
}

export type ImageSpec = { id: string; url: string; pixelRatio: number }

/** 图片像素 ÷ 显示 CSS 像素;与 scripts/lib/map-assets.mjs 的 SIZES / pixelRatioFor 成对 */
const PIXEL_RATIO: Record<string, number> = { pat: 2, badge: 3, lm: 2, shop: 2 }
const ratioOf = (id: string) => PIXEL_RATIO[id.split('-')[0]] ?? 1

/** 运行时要预取并 addImage 的全部图片 */
export function imageSpecs(m: AssetManifest, basePath: string): ImageSpec[] {
  return [
    ...m.patterns.map(id => ({ id, url: `${basePath}/map-assets/patterns/${id}.png`, pixelRatio: ratioOf(id) })),
    ...m.icons.map(id => ({ id, url: `${basePath}/map-assets/icons/${id}.png`, pixelRatio: ratioOf(id) })),
  ]
}

export function walkerSpriteUrl(m: AssetManifest, basePath: string): string {
  return `${basePath}/sprites/${m.walker ?? 'pineapple-classic'}.png`
}

export function hasIcon(m: AssetManifest, id: string): boolean {
  return m.icons.includes(id)
}

/** 有店面小插画的店 slug 列表(icons 里的 shop-<slug>) */
export function storefrontSlugs(m: AssetManifest): string[] {
  return m.icons.filter(id => id.startsWith('shop-')).map(id => id.slice('shop-'.length))
}
