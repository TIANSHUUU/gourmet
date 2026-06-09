'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useLang } from './LanguageContext'
import type { Restaurant } from '@/lib/restaurants'

export default function RestaurantCard({ restaurant }: { restaurant: Restaurant }) {
  const { lang } = useLang()
  const { slug, name, suburb, city, cuisine_en, cuisine_zh, images } = restaurant
  const cuisine = lang === 'en' ? cuisine_en : cuisine_zh
  const coverImage = `/images/${slug}/${images[0]}`

  return (
    <Link href={`/${slug}`} className="group block">
      <div className="overflow-hidden rounded-2xl bg-white shadow-sm hover:shadow-md transition-shadow duration-300">
        <div className="relative aspect-[4/3] overflow-hidden">
          <Image
            src={coverImage}
            alt={name}
            fill
            priority
            className="object-cover group-hover:scale-105 transition-transform duration-500"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        </div>
        <div className="p-5">
          <div className="flex items-start justify-between gap-2">
            <h2 className="text-xl font-bold text-[#1A1A1A] group-hover:text-[#C84B2F] transition-colors leading-tight">
              {name}
            </h2>
            <span className="shrink-0 text-xs font-medium bg-[#F4ECE4] text-[#C84B2F] px-2.5 py-1 rounded-full mt-0.5">
              {cuisine}
            </span>
          </div>
          <p className="text-sm text-[#6B6B6B] mt-1.5">
            {suburb}, {city}
          </p>
        </div>
      </div>
    </Link>
  )
}
