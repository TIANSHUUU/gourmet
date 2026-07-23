'use client'

import { useLang } from './LanguageContext'
import type { Category } from '@/lib/restaurants'

export type CategoryFilter = 'all' | Category

const LABELS: Record<CategoryFilter, { en: string; zh: string }> = {
  all: { en: 'All', zh: '全部' },
  food: { en: 'Food', zh: '美食' },
  cafe: { en: 'Cafés', zh: '咖啡' },
  bar: { en: 'Bars', zh: '酒吧' },
}
const ORDER: CategoryFilter[] = ['all', 'food', 'cafe', 'bar']

export default function CategoryNav({
  value,
  onChange,
}: {
  value: CategoryFilter
  onChange: (v: CategoryFilter) => void
}) {
  const { lang } = useLang()
  return (
    <nav className="flex flex-wrap gap-x-6 gap-y-2 font-label text-xs uppercase tracking-widest">
      {ORDER.map(c => (
        <button
          key={c}
          onClick={() => onChange(c)}
          className={`pb-1 border-b-2 transition-colors ${
            value === c ? 'border-white text-white font-bold' : 'border-transparent text-white/80 hover:text-white'
          }`}
        >
          {lang === 'en' ? LABELS[c].en : LABELS[c].zh}
        </button>
      ))}
    </nav>
  )
}
