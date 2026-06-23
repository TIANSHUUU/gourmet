'use client'

import Image from 'next/image'
import { useLang } from './LanguageContext'
import type { Restaurant } from '@/lib/restaurants'
import { basePath } from '@/lib/basePath'
import { formatVisited } from '@/lib/format'

export default function RestaurantDetail({ restaurant }: { restaurant: Restaurant }) {
  const { lang } = useLang()
  const {
    slug, name, suburb, city, cuisine_en, cuisine_zh,
    images, review_en, review_zh, map_url, map_type, visited,
  } = restaurant

  const cuisine = lang === 'en' ? cuisine_en : cuisine_zh
  const review = lang === 'en' ? review_en : review_zh
  const locationLabel = lang === 'en' ? `${suburb}, ${city}` : `${city} · ${suburb}`
  const visitedLabel = formatVisited(visited, lang)
  const mapLabel = map_type === 'amap'
    ? (lang === 'en' ? 'Open in Amap' : '在高德地图查看')
    : (lang === 'en' ? 'Open in Google Maps' : '在谷歌地图查看')

  return (
    <article className="max-w-3xl mx-auto px-6 py-10">
      <div className="relative w-full aspect-[4/3] overflow-hidden mb-8">
        <Image
          src={`${basePath}/images/${slug}/${images[0]}`}
          alt={name}
          fill
          priority
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 768px"
        />
      </div>

      <div className="flex flex-wrap items-start gap-3 mb-2">
        <h1 className="font-display text-3xl md:text-4xl font-bold text-[#13314A]">{name}</h1>
        <span className="font-label text-[10px] uppercase tracking-widest text-[#0C6E97] border-[1.5px] border-[#0F84B5] px-2 py-1 mt-2">
          {cuisine}
        </span>
      </div>
      {visitedLabel && (
        <p className="font-label text-[11px] uppercase tracking-wider text-[#F0742A] mb-1">{visitedLabel}</p>
      )}
      <p className="font-label text-[11px] uppercase tracking-wider text-[#8A99A6] mb-8">{locationLabel}</p>

      <p className="text-[#13314A] text-lg leading-relaxed mb-12">{review}</p>

      {images.length > 1 && (
        <div className="grid grid-cols-2 gap-3 mb-12">
          {images.slice(1).map((img, i) => (
            <div key={i} className="relative aspect-[4/3] overflow-hidden">
              <Image
                src={`${basePath}/images/${slug}/${img}`}
                alt={`${name} — photo ${i + 2}`}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 50vw, 350px"
              />
            </div>
          ))}
        </div>
      )}

      <a
        href={map_url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 bg-[#0F84B5] text-white font-label text-xs font-bold uppercase tracking-widest px-6 py-3 hover:bg-[#F0742A] transition-colors duration-200"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        {mapLabel}
      </a>
    </article>
  )
}
