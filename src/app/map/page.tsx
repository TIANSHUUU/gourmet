import type { Metadata } from 'next'
import { getAllPlaces } from '@/lib/places'
import { placesToGeoJSON } from '@/lib/map/placesToGeoJSON'
import { getAllLandmarks } from '@/lib/map/landmarks'
import { CITIES } from '@/lib/map/cities'
import MapPageClient from '@/components/map/MapPageClient'

export const metadata: Metadata = {
  title: '菠萝子地图 · 菠萝子指南',
  description: 'Every place on the guide, on one hand-painted map.',
}

export default function MapPage() {
  // 构建时执行:getAllPlaces / getAllLandmarks 都做 zod 校验,数据不合法直接让构建失败
  const data = placesToGeoJSON(getAllPlaces())
  const landmarks = getAllLandmarks()
  return <MapPageClient data={data} landmarks={landmarks} cities={CITIES} />
}
