'use client'

import { useState, useMemo } from 'react'
import Image from 'next/image'
import type { Restaurant } from '@/lib/restaurants'
import SearchBar from './SearchBar'
import RestaurantGrid from './RestaurantGrid'
import FeaturedCard from './FeaturedCard'
import CategoryNav, { type CategoryFilter } from './CategoryNav'
import { useLang } from './LanguageContext'
import { basePath } from '@/lib/basePath'

export default function HomepageClient({ restaurants }: { restaurants: Restaurant[] }) {
  const { lang } = useLang()
  const [keyword, setKeyword] = useState('')
  const [city, setCity] = useState('all')
  const [category, setCategory] = useState<CategoryFilter>('all')

  const cities = useMemo(() => [...new Set(restaurants.map(r => r.city))].sort(), [restaurants])

  const filtered = useMemo(() => {
    const kw = keyword.toLowerCase().trim()
    return restaurants.filter(r => {
      const cityMatch = city === 'all' || r.city === city
      const catMatch = category === 'all' || r.category === category
      const kwMatch =
        kw === '' ||
        r.name.toLowerCase().includes(kw) ||
        r.cuisine_en.toLowerCase().includes(kw) ||
        r.cuisine_zh.includes(kw)
      return cityMatch && catMatch && kwMatch
    })
  }, [restaurants, keyword, city, category])

  const headline = filtered[0]
  const rest = filtered.slice(1)

  const hero =
    lang === 'en'
      ? {
          heading: (<>Places I Actually<br /><em className="italic">Go Back To.</em></>),
          sub: 'A personal guide to restaurants, cafés & bars worth revisiting.',
        }
      : {
          heading: (<>真正值得<br /><em className="italic">回去</em>的地方。</>),
          sub: '私藏美食清单，餐厅、咖啡馆与酒吧，全凭真心推荐。',
        }

  return (
    <div>
      {/* Terracotta hero region (continues from the header) */}
      <section className="header-gradient">
        <div className="max-w-6xl mx-auto px-6 pt-12 pb-8">
          <div className="md:grid md:grid-cols-[1.05fr_0.95fr] md:gap-10 md:items-center">
            <div>
              <h1 className="font-display font-semibold text-white text-4xl md:text-5xl leading-[1.02] max-w-[14ch]">
                {hero.heading}
              </h1>
              <p className="mt-4 text-white/90 max-w-xl">{hero.sub}</p>
            </div>
            <div className="mt-7 md:mt-0">
              <Image
                src={`${basePath}/scene.jpg`}
                alt={lang === 'en' ? 'Pineapple-head dining at a Paris natural-wine bistro' : '菠萝头在巴黎自然酒馆吃饭'}
                width={960}
                height={960}
                priority
                className="w-full max-w-xs md:max-w-sm mx-auto md:ml-auto rounded-2xl ring-1 ring-white/40 shadow-2xl rotate-[-2deg]"
              />
            </div>
          </div>
          <div className="mt-8">
            <CategoryNav value={category} onChange={setCategory} />
          </div>
        </div>
        <div className="h-[3px] bg-[#0F84B5]" />
      </section>

      {/* Cream body */}
      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="mb-10">
          <SearchBar
            keyword={keyword}
            city={city}
            cities={cities}
            onKeywordChange={setKeyword}
            onCityChange={setCity}
          />
        </div>

        {filtered.length === 0 ? (
          <p className="font-label text-sm text-[#8A99A6] mt-8">
            {lang === 'en' ? 'No results. Try a different keyword or filter.' : '没有找到结果，换个关键词或筛选试试。'}
          </p>
        ) : (
          <>
            {headline && <FeaturedCard restaurant={headline} number={1} />}
            {rest.length > 0 && <RestaurantGrid restaurants={rest} startNumber={2} />}
          </>
        )}
      </div>
    </div>
  )
}
