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
