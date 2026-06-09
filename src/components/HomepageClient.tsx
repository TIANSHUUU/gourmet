'use client'

import { useState, useMemo } from 'react'
import type { Restaurant } from '@/lib/restaurants'
import SearchBar from './SearchBar'
import RestaurantGrid from './RestaurantGrid'
import { useLang } from './LanguageContext'

export default function HomepageClient({ restaurants }: { restaurants: Restaurant[] }) {
  const { lang } = useLang()
  const [keyword, setKeyword] = useState('')
  const [city, setCity] = useState('all')

  const cities = useMemo(
    () => [...new Set(restaurants.map(r => r.city))].sort(),
    [restaurants]
  )

  const filtered = useMemo(() => {
    const kw = keyword.toLowerCase().trim()
    return restaurants.filter(r => {
      const cityMatch = city === 'all' || r.city === city
      const kwMatch =
        kw === '' ||
        r.name.toLowerCase().includes(kw) ||
        r.cuisine_en.toLowerCase().includes(kw) ||
        r.cuisine_zh.includes(kw)
      return cityMatch && kwMatch
    })
  }, [restaurants, keyword, city])

  const heroText = lang === 'en'
    ? { heading: <>Places I Actually<br /><span className="text-[#C84B2F]">Go Back To.</span></>, sub: 'A personal guide to restaurants, cafés & bars worth revisiting.' }
    : { heading: <>真正值得<br /><span className="text-[#C84B2F]">回去的地方。</span></>, sub: '私藏美食清单，餐厅、咖啡馆与酒吧，全凭真心推荐。' }

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      {/* Hero */}
      <div className="mb-8">
        <h1 className="text-4xl md:text-5xl font-bold text-[#1A1A1A] leading-tight">
          {heroText.heading}
        </h1>
        <p className="mt-4 text-[#6B6B6B] text-lg max-w-xl">{heroText.sub}</p>
      </div>

      {/* Search bar */}
      <div className="mb-10">
        <SearchBar
          keyword={keyword}
          city={city}
          cities={cities}
          onKeywordChange={setKeyword}
          onCityChange={setCity}
        />
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <p className="text-[#9B9490] text-sm mt-8">
          {lang === 'en' ? 'No results. Try a different keyword or city.' : '没有找到结果，换个关键词或城市试试。'}
        </p>
      ) : (
        <RestaurantGrid restaurants={filtered} />
      )}
    </div>
  )
}
