import { getAllRestaurants } from '@/lib/restaurants'
import HomepageClient from '@/components/HomepageClient'

export default function HomePage() {
  const restaurants = getAllRestaurants()
  return <HomepageClient restaurants={restaurants} />
}
