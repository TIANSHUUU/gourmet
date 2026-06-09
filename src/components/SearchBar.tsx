'use client'

import { useLang } from './LanguageContext'

type Props = {
  keyword: string
  city: string
  cities: string[]
  onKeywordChange: (v: string) => void
  onCityChange: (v: string) => void
}

export default function SearchBar({ keyword, city, cities, onKeywordChange, onCityChange }: Props) {
  const { lang } = useLang()

  const placeholder = lang === 'en' ? 'Restaurant or cuisine…' : '餐厅名称或菜系…'
  const allLabel = lang === 'en' ? 'All Cities' : '全部城市'

  return (
    <div className="flex flex-col sm:flex-row w-full max-w-2xl bg-white rounded-2xl shadow-md overflow-hidden border border-[#E8E4DE]">
      {/* Keyword input */}
      <div className="flex items-center flex-1 px-4 py-3 gap-2">
        <svg className="w-4 h-4 text-[#9B9490] shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <circle cx="11" cy="11" r="8" /><path strokeLinecap="round" d="m21 21-4.35-4.35" />
        </svg>
        <input
          type="text"
          value={keyword}
          onChange={e => onKeywordChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1 bg-transparent text-[#1A1A1A] placeholder-[#9B9490] text-sm outline-none"
        />
      </div>

      {/* Divider */}
      <div className="hidden sm:block w-px bg-[#E8E4DE] my-3" />
      <div className="sm:hidden h-px bg-[#E8E4DE] mx-4" />

      {/* City dropdown */}
      <div className="flex items-center px-4 py-3 sm:w-44">
        <select
          value={city}
          onChange={e => onCityChange(e.target.value)}
          className="w-full bg-transparent text-[#1A1A1A] text-sm outline-none cursor-pointer appearance-none"
        >
          <option value="all">{allLabel}</option>
          {cities.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {/* Find button */}
      <button
        onClick={() => {}}
        className="bg-[#C84B2F] text-white text-sm font-semibold px-6 py-3 sm:rounded-r-2xl hover:bg-[#a83d25] transition-colors duration-200 active:scale-95"
      >
        {lang === 'en' ? 'Find' : '搜索'}
      </button>
    </div>
  )
}
