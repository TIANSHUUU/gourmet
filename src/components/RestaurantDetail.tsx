'use client'

import Image from 'next/image'
import { useLang } from './LanguageContext'
import type { Restaurant } from '@/lib/restaurants'

export default function RestaurantDetail({ restaurant }: { restaurant: Restaurant }) {
  const { lang } = useLang()
  const {
    slug, name, suburb, city, cuisine_en, cuisine_zh,
    images, review_en, review_zh, map_url,
  } = restaurant

  const cuisine = lang === 'en' ? cuisine_en : cuisine_zh
  const review = lang === 'en' ? review_en : review_zh
  const locationLabel = lang === 'en' ? `${suburb}, ${city}` : `${city} · ${suburb}`

  return (
    <article className="max-w-3xl mx-auto px-6 py-10">

      {/* Hero image */}
      <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden mb-8">
        <Image
          src={`/images/${slug}/${images[0]}`}
          alt={name}
          fill
          priority
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 768px"
        />
      </div>

      {/* Name + meta */}
      <div className="flex flex-wrap items-start gap-3 mb-1">
        <h1 className="text-3xl md:text-4xl font-bold text-[#1A1A1A]">{name}</h1>
        <span className="text-sm font-medium bg-[#F4ECE4] text-[#C84B2F] px-3 py-1 rounded-full mt-1.5">
          {cuisine}
        </span>
      </div>
      <p className="text-[#6B6B6B] mb-8">{locationLabel}</p>

      {/* Review */}
      <p className="text-[#1A1A1A] text-lg leading-relaxed mb-12">{review}</p>

      {/* Gallery */}
      {images.length > 1 && (
        <div className="grid grid-cols-2 gap-3 mb-12">
          {images.slice(1).map((img, i) => (
            <div key={i} className="relative aspect-[4/3] rounded-xl overflow-hidden">
              <Image
                src={`/images/${slug}/${img}`}
                alt={`${name} — photo ${i + 2}`}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 50vw, 350px"
              />
            </div>
          ))}
        </div>
      )}

      {/* Map CTA */}
      <a
        href={map_url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 bg-[#1A1A1A] text-white font-medium px-6 py-3 rounded-full hover:bg-[#C84B2F] transition-colors duration-200"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        {lang === 'en' ? 'Open in Google Maps' : '在谷歌地图查看'}
      </a>
    </article>
  )
}
