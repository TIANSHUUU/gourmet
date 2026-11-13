import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import { z } from 'zod'
import { parseReviews, type Restaurant } from './restaurants'

/** 吃喝三类沿用 restaurants/;玩乐四类放 spots/。地图上统一叫 kind */
export const RESTAURANT_KINDS = ['food', 'cafe', 'bar'] as const
export const SPOT_KINDS = ['sight', 'activity', 'shop', 'stay'] as const
export type PlaceKind = (typeof RESTAURANT_KINDS)[number] | (typeof SPOT_KINDS)[number]

/** [经度, 纬度] —— 与 travel-timeline、MapLibre 一致,经度在前 */
export type LngLat = [number, number]

export type Place = Omit<Restaurant, 'category' | 'coords'> & {
  kind: PlaceKind
  coords: LngLat
}

const lngLat = z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)])

const frontmatter = z.object({
  slug: z.string().min(1),
  name: z.string().min(1),
  suburb: z.string().default(''),
  city: z.string().min(1),
  category: z.enum([...RESTAURANT_KINDS, ...SPOT_KINDS]),
  cuisine_en: z.string().default(''),
  cuisine_zh: z.string().default(''),
  map_url: z.string().url(),
  map_type: z.enum(['google', 'amap']).default('google'),
  visited: z.string().regex(/^\d{4}-\d{2}(-\d{2})?$/, '格式应为 YYYY-MM 或 YYYY-MM-DD'),
  tagline_en: z.string().optional(),
  tagline_zh: z.string().optional(),
  images: z.array(z.string()).default([]),
  coords: lngLat,
  place_id: z.string().optional(),
})

/** 解析一个地点 markdown。校验失败时错误信息里带文件名,构建日志一眼能定位 */
export function parsePlaceFile(raw: string, file: string, allowed: readonly PlaceKind[]): Place {
  const { data, content } = matter(raw)
  const parsed = frontmatter.safeParse(data)
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map(i => `${i.path.join('.') || '(root)'}: ${i.message}`)
      .join('; ')
    throw new Error(`[places] ${file}: ${issues}`)
  }
  const fm = parsed.data
  if (!allowed.includes(fm.category)) {
    throw new Error(
      `[places] ${file}: category "${fm.category}" 不允许出现在这个目录(允许:${allowed.join(', ')})`,
    )
  }
  const { category, ...rest } = fm
  const { en, zh } = parseReviews(content)
  return { ...rest, kind: category, review_en: en, review_zh: zh }
}

const DATA_ROOT = path.join(process.cwd(), 'src/data')
const SOURCES: Array<{ dir: string; allowed: readonly PlaceKind[] }> = [
  { dir: 'restaurants', allowed: RESTAURANT_KINDS },
  { dir: 'spots', allowed: SPOT_KINDS },
]

/** 全部地点(吃喝 + 玩乐),按 visited 新→旧;任何一个文件不合法都抛错(构建即校验) */
export function getAllPlaces(): Place[] {
  const out: Place[] = []
  for (const { dir, allowed } of SOURCES) {
    const abs = path.join(DATA_ROOT, dir)
    if (!fs.existsSync(abs)) continue
    for (const f of fs.readdirSync(abs).filter(f => f.endsWith('.md')).sort()) {
      out.push(parsePlaceFile(fs.readFileSync(path.join(abs, f), 'utf-8'), `${dir}/${f}`, allowed))
    }
  }
  const seen = new Set<string>()
  for (const p of out) {
    if (seen.has(p.slug)) throw new Error(`[places] slug 重复: ${p.slug}`)
    seen.add(p.slug)
  }
  return out.sort((a, b) => b.visited.localeCompare(a.visited) || a.slug.localeCompare(b.slug))
}

export function getPlace(slug: string): Place | undefined {
  return getAllPlaces().find(p => p.slug === slug)
}
