'use client'

import { useLang } from '@/components/LanguageContext'
import { MAP_UI } from '@/lib/mapI18n'
import type { City } from '@/lib/map/cities'

export default function CityChips({
  cities, active, onChange,
}: { cities: City[]; active: string | null; onChange: (slug: string | null) => void }) {
  const { lang } = useLang()
  const ui = MAP_UI[lang]
  const chip = (on: boolean) =>
    `shrink-0 rounded-full px-3 py-1.5 font-label text-xs uppercase tracking-widest transition-colors ${
      on ? 'bg-[#F0742A] text-white' : 'bg-[#1E242C]/80 text-[#F8F2DD] hover:bg-[#1E242C]'
    }`
  return (
    <div className="flex gap-2 overflow-x-auto">
      <button type="button" className={chip(active === null)} onClick={() => onChange(null)}>
        {ui.overview}
      </button>
      {cities.map(c => (
        <button key={c.slug} type="button" className={chip(active === c.slug)} onClick={() => onChange(c.slug)}>
          {lang === 'en' ? c.name_en : c.name_zh}
        </button>
      ))}
    </div>
  )
}
