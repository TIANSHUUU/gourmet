import type { Feature, FeatureCollection, Point } from 'geojson'
import type { Place, PlaceKind } from '@/lib/places'
import { isSpotKind } from './kinds'

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
  /** 只有景点类(地图专属,没有图文页)才有值:评论全文 */
  review_en: string
  review_zh: string
  /** 只有景点类才有值:封面之外的照片,用 GALLERY_SEP 连接(MapLibre 属性只放字符串);展示层用 splitGallery 还原 */
  gallery: string
}

export type PlaceFeature = Feature<Point, PlaceProps>
export type PlaceCollection = FeatureCollection<Point, PlaceProps>

export const GALLERY_SEP = '|'

export function splitGallery(s: string): string[] {
  return s ? s.split(GALLERY_SEP).filter(Boolean) : []
}

export function placesToGeoJSON(places: Place[]): PlaceCollection {
  return {
    type: 'FeatureCollection',
    features: places.map(p => {
      const spot = isSpotKind(p.kind)
      return {
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
          review_en: spot ? p.review_en : '',
          review_zh: spot ? p.review_zh : '',
          gallery: spot ? p.images.slice(1).join(GALLERY_SEP) : '',
        },
      }
    }),
  }
}
