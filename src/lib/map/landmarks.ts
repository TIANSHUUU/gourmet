import fs from 'fs'
import path from 'path'
import { z } from 'zod'
import type { Feature, FeatureCollection, Point } from 'geojson'

const entry = z.object({
  name_zh: z.string().min(1),
  name_en: z.string().min(1),
  coords: z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)]),
  icon: z.string().regex(/^lm-[a-z0-9-]+$/, '须形如 lm-<slug>,对应收件箱的 lm-<slug>.png'),
  minzoom: z.number().min(0).max(22).default(13),
})
const file = z.array(entry)

export type LandmarkProps = { name_zh: string; name_en: string; icon: string; minzoom: number; city: string }
export type LandmarkFeature = Feature<Point, LandmarkProps>
export type LandmarkCollection = FeatureCollection<Point, LandmarkProps>

/** 一个城市文件的内容 → Point features(属性里带上城市 slug)。校验失败点名文件 */
export function parseLandmarks(raw: unknown, city: string): LandmarkFeature[] {
  const parsed = file.safeParse(raw)
  if (!parsed.success) {
    const issues = parsed.error.issues.map(i => `${i.path.join('.') || '(root)'}: ${i.message}`).join('; ')
    throw new Error(`[landmarks] ${city}.json: ${issues}`)
  }
  return parsed.data.map(e => ({
    type: 'Feature',
    geometry: { type: 'Point', coordinates: e.coords },
    properties: { name_zh: e.name_zh, name_en: e.name_en, icon: e.icon, minzoom: e.minzoom, city },
  }))
}

const DIR = path.join(process.cwd(), 'src/data/map/landmarks')

/** 全部城市的地标;目录不存在 → 空集合 */
export function getAllLandmarks(): LandmarkCollection {
  const features: LandmarkFeature[] = []
  if (fs.existsSync(DIR)) {
    for (const f of fs.readdirSync(DIR).filter(f => f.endsWith('.json')).sort()) {
      const raw = JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf-8')) as unknown
      features.push(...parseLandmarks(raw, f.replace(/\.json$/, '')))
    }
  }
  return { type: 'FeatureCollection', features }
}
