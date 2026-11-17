'use client'

import Link from 'next/link'
import { useLang } from '@/components/LanguageContext'
import { MAP_UI } from '@/lib/mapI18n'
import { cityOf, type City } from '@/lib/map/cities'
import { isSpotKind } from '@/lib/map/kinds'
import type { PlaceCollection, PlaceFeature } from '@/lib/map/placesToGeoJSON'
import type { LngLat } from '@/lib/places'

export default function MapFallbackList({ data, cities }: { data: PlaceCollection; cities: City[] }) {
  const { lang } = useLang()
  const ui = MAP_UI[lang]
  const groups = new Map<string, PlaceFeature[]>()
  for (const f of data.features) {
    const c = cityOf(f.geometry.coordinates as LngLat, cities)
    const key = c ? (lang === 'en' ? c.name_en : c.name_zh) : f.properties.city
    groups.set(key, [...(groups.get(key) ?? []), f])
  }
  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <h1 className="font-display text-3xl font-bold mb-2">{ui.mapFailedTitle}</h1>
      <p className="text-[#8A99A6] mb-8">{ui.mapFailedHint}</p>
      {[...groups.entries()].map(([city, list]) => (
        <section key={city} className="mb-8">
          <h2 className="font-label text-xs uppercase tracking-widest text-[#0C6E97] mb-3">{city}</h2>
          <ul className="space-y-2">
            {list.map(f => (
              <li key={f.properties.slug}>
                {isSpotKind(f.properties.kind) ? (
                  <a href={f.properties.map_url} target="_blank" rel="noopener noreferrer" className="font-semibold hover:text-[#F0742A]">
                    {f.properties.name}
                  </a>
                ) : (
                  <Link href={`/${f.properties.slug}`} className="font-semibold hover:text-[#F0742A]">
                    {f.properties.name}
                  </Link>
                )}
                <span className="text-[#8A99A6]">
                  {' '}· {lang === 'en' ? f.properties.cuisine_en : f.properties.cuisine_zh} · {f.properties.suburb}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
