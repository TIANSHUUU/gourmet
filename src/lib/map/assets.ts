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

export function hasIcon(m: AssetManifest, id: string): boolean {
  return m.icons.includes(id)
}

/** 有店面小插画的店 slug 列表(icons 里的 shop-<slug>) */
export function storefrontSlugs(m: AssetManifest): string[] {
  return m.icons.filter(id => id.startsWith('shop-')).map(id => id.slice('shop-'.length))
}
