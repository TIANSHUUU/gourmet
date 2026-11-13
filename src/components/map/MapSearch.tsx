'use client'

import { useMemo, useState } from 'react'
import { useLang } from '@/components/LanguageContext'
import { MAP_UI } from '@/lib/mapI18n'
import type { PlaceFeature } from '@/lib/map/placesToGeoJSON'

export default function MapSearch({
  features, onPick,
}: { features: PlaceFeature[]; onPick: (slug: string) => void }) {
  const { lang } = useLang()
  const ui = MAP_UI[lang]
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)

  const hits = useMemo(() => {
    const kw = q.trim().toLowerCase()
    if (!kw) return []
    return features
      .filter(f => {
        const p = f.properties
        return [p.name, p.cuisine_en, p.cuisine_zh, p.suburb, p.city].join(' ').toLowerCase().includes(kw)
      })
      .slice(0, 8)
  }, [features, q])

  return (
    <div className="relative max-w-xl">
      <input
        value={q}
        onChange={e => { setQ(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={ui.searchPlaceholder}
        aria-label={ui.searchPlaceholder}
        className="w-full rounded-full bg-[#1E242C]/90 text-[#F8F2DD] placeholder-[#F8F2DD]/60 px-4 py-2.5 text-sm outline-none ring-1 ring-white/10 focus:ring-[#F0742A]"
      />
      {open && q.trim() && (
        <ul className="absolute mt-1 w-full rounded-xl bg-[#FCFAF4] text-[#13314A] shadow-xl overflow-hidden">
          {hits.length === 0 && <li className="px-4 py-2 text-sm text-[#8A99A6]">{ui.noResults}</li>}
          {hits.map(f => (
            <li key={f.properties.slug}>
              <button
                type="button"
                className="w-full text-left px-4 py-2 text-sm hover:bg-[#F0742A]/10"
                onMouseDown={e => e.preventDefault()}
                onClick={() => { onPick(f.properties.slug); setQ(''); setOpen(false) }}
              >
                <span className="font-semibold">{f.properties.name}</span>
                <span className="text-[#8A99A6]">
                  {' '}· {lang === 'en' ? f.properties.cuisine_en : f.properties.cuisine_zh} · {f.properties.suburb}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
