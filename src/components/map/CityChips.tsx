'use client'

import { useLang } from '@/components/LanguageContext'
import { MAP_UI } from '@/lib/mapI18n'
import type { City } from '@/lib/map/cities'
import { COUNTRIES, countriesOf } from '@/lib/map/countries'
import FlagCircle from './FlagCircle'

/**
 * 城市筛选两级:第一排「总览 + 国家(圆形国旗 + 国名)」,选了国家才出现第二排「该国城市」。
 * 默认深灰底,选中橙底(与分类按钮同一套)。点国家 / 城市的含义由 MapPageClient 的 pickCountry / pickCity 决定。
 */
export default function CityChips({
  cities, country, city, onCountry, onCity,
}: {
  cities: City[]
  country: string | null
  city: string | null
  onCountry: (code: string | null) => void
  onCity: (slug: string) => void
}) {
  const { lang } = useLang()
  const ui = MAP_UI[lang]
  const chip = (on: boolean) =>
    `shrink-0 rounded-full font-label text-xs uppercase tracking-widest transition-colors ${
      on ? 'bg-[#F0742A] text-white' : 'bg-[#1E242C]/80 text-[#F8F2DD] hover:bg-[#1E242C]'
    }`
  const row = 'flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'
  const inCountry = country ? cities.filter(c => c.country === country) : []
  return (
    <div className="flex flex-col gap-2">
      <div className={row}>
        <button
          type="button"
          aria-pressed={country === null}
          className={`${chip(country === null)} px-3 py-1.5`}
          onClick={() => onCountry(null)}
        >
          {ui.overview}
        </button>
        {countriesOf(cities).map(code => {
          const names = COUNTRIES[code]
          const label = names ? (lang === 'en' ? names.name_en : names.name_zh) : code
          return (
            <button
              key={code}
              type="button"
              aria-pressed={country === code}
              className={`${chip(country === code)} inline-flex items-center gap-1.5 py-[3px] pl-[3px] pr-3`}
              onClick={() => onCountry(code)}
            >
              <FlagCircle code={code} />
              {label}
            </button>
          )
        })}
      </div>
      {inCountry.length > 0 && (
        <div className={row}>
          {inCountry.map(c => (
            <button
              key={c.slug}
              type="button"
              aria-pressed={city === c.slug}
              className={`${chip(city === c.slug)} px-3 py-1.5`}
              onClick={() => onCity(c.slug)}
            >
              {lang === 'en' ? c.name_en : c.name_zh}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
