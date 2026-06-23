'use client'

import type { Restaurant } from '@/lib/restaurants'
import RestaurantCard from './RestaurantCard'

export default function RestaurantGrid({
  restaurants,
  startNumber,
}: {
  restaurants: Restaurant[]
  startNumber: number
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-10">
      {restaurants.map((r, i) => (
        <RestaurantCard key={r.slug} restaurant={r} number={startNumber + i} />
      ))}
    </div>
  )
}
