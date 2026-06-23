'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useLang } from './LanguageContext'
import type { Restaurant } from '@/lib/restaurants'
import { basePath } from '@/lib/basePath'

export default function RestaurantCard({ restaurant, number }: { restaurant: Restaurant; number: number }) {
  const { lang } = useLang()
  const { slug, name, suburb, city, cuisine_en, cuisine_zh, images } = restaurant
  const cuisine = lang === 'en' ? cuisine_en : cuisine_zh
  const num = String(number).padStart(2, '0')

  return (
    <Link href={`/${slug}`} className="group block">
      <div className="relative aspect-[16/10] overflow-hidden mb-3">
        <Image
          src={`${basePath}/images/${slug}/${images[0]}`}
          alt={name}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-500"
          sizes="(max-width: 768px) 100vw, 50vw"
        />
      </div>
      <div className="flex items-center gap-2.5 mb-1">
        <span className="font-label text-xs font-bold text-[#F0742A]">№ {num}</span>
        <span className="font-label text-[10px] uppercase tracking-widest text-[#0C6E97]">{cuisine}</span>
      </div>
      <h2 className="font-display font-semibold text-xl text-[#13314A] leading-tight group-hover:text-[#F0742A] transition-colors">
        {name}
      </h2>
      <p className="font-label text-[10px] uppercase tracking-wider text-[#8A99A6] mt-1">
        {suburb} · {city}
      </p>
    </Link>
  )
}
