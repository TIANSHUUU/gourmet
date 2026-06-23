'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useLang } from './LanguageContext'
import type { Restaurant } from '@/lib/restaurants'
import { basePath } from '@/lib/basePath'

export default function FeaturedCard({ restaurant, number }: { restaurant: Restaurant; number: number }) {
  const { lang } = useLang()
  const { slug, name, suburb, city, cuisine_en, cuisine_zh, tagline_en, tagline_zh, images } = restaurant
  const cuisine = lang === 'en' ? cuisine_en : cuisine_zh
  const tagline = lang === 'en' ? tagline_en : tagline_zh
  const num = String(number).padStart(2, '0')

  return (
    <Link href={`/${slug}`} className="group block border-b-[1.5px] border-[#0F84B5] pb-8 mb-8">
      <div className="grid md:grid-cols-[1.15fr_1fr] gap-7 items-center">
        <div className="relative aspect-[4/3] overflow-hidden">
          <Image
            src={`${basePath}/images/${slug}/${images[0]}`}
            alt={name}
            fill
            priority
            className="object-cover group-hover:scale-105 transition-transform duration-500"
            sizes="(max-width: 768px) 100vw, 560px"
          />
        </div>
        <div>
          <div className="flex items-center gap-3 mb-3">
            <span className="font-label text-xs font-bold text-[#F0742A]">№ {num}</span>
            <span className="font-label text-[10px] uppercase tracking-widest text-[#0C6E97] border-[1.5px] border-[#0F84B5] px-2 py-0.5">
              {cuisine}
            </span>
          </div>
          <h2 className="font-display font-semibold text-3xl md:text-4xl text-[#13314A] leading-tight mb-2 group-hover:text-[#F0742A] transition-colors">
            {name}
          </h2>
          {tagline && <p className="font-display italic text-lg text-[#4A5A68] leading-relaxed mb-3">{tagline}</p>}
          <p className="font-label text-[11px] uppercase tracking-wider text-[#8A99A6]">
            {suburb} · {city}
          </p>
        </div>
      </div>
    </Link>
  )
}
