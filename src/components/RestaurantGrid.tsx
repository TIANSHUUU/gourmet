'use client'

import type { Restaurant } from '@/lib/restaurants'
import RestaurantCard from './RestaurantCard'

export default function RestaurantGrid({ restaurants }: { restaurants: Restaurant[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {restaurants.map(r => (
        <RestaurantCard key={r.slug} restaurant={r} />
      ))}
    </div>
  )
}
