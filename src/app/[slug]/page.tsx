import { getRestaurant, getAllRestaurants } from '@/lib/restaurants'
import { notFound } from 'next/navigation'
import RestaurantDetail from '@/components/RestaurantDetail'

export async function generateStaticParams() {
  return getAllRestaurants().map(r => ({ slug: r.slug }))
}

export default async function RestaurantPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const restaurant = getRestaurant(slug)
  if (!restaurant) notFound()
  return <RestaurantDetail restaurant={restaurant} />
}
