import { getPlace, getAllPlaces } from '@/lib/places'
import { notFound } from 'next/navigation'
import RestaurantDetail from '@/components/RestaurantDetail'
import { isSpotKind } from '@/lib/map/kinds'

// 只有吃喝(restaurants/)有图文页;景点 / 玩乐 / 购物 / 住宿只在地图上,卡片里看全文(业主 2026-11-17 定)
export async function generateStaticParams() {
  return getAllPlaces().filter(p => !isSpotKind(p.kind)).map(p => ({ slug: p.slug }))
}

export default async function PlacePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const place = getPlace(slug)
  if (!place || isSpotKind(place.kind)) notFound()
  return <RestaurantDetail restaurant={place} />
}
