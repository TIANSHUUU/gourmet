import { getPlace, getAllPlaces } from '@/lib/places'
import { notFound } from 'next/navigation'
import RestaurantDetail from '@/components/RestaurantDetail'

// restaurants/ 与 spots/ 都在这里出详情页;首页网格仍只列吃喝
export async function generateStaticParams() {
  return getAllPlaces().map(p => ({ slug: p.slug }))
}

export default async function PlacePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const place = getPlace(slug)
  if (!place) notFound()
  return <RestaurantDetail restaurant={place} />
}
