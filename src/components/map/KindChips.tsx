'use client'

import { useLang } from '@/components/LanguageContext'
import { MAP_UI } from '@/lib/mapI18n'
import { KIND_ORDER } from '@/lib/map/kinds'
import type { PlaceKind } from '@/lib/places'

/**
 * 分类筛选(可多选,业主 2026-11-17 定):默认全部深灰 = 不筛选、显示全部;点了才选中(橙色),只显示选中的分类。
 * 地图上的徽章 / 标签仍用分类色,这里的按钮不用。
 */
export default function KindChips({
  available, selected, onToggle,
}: { available: PlaceKind[]; selected: PlaceKind[]; onToggle: (k: PlaceKind) => void }) {
  const { lang } = useLang()
  const ui = MAP_UI[lang]
  const shown = KIND_ORDER.filter(k => available.includes(k))
  if (shown.length < 2) return null
  return (
    <div className="flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {shown.map(k => {
        const on = selected.includes(k)
        return (
          <button
            key={k}
            type="button"
            aria-pressed={on}
            onClick={() => onToggle(k)}
            className={`shrink-0 rounded-full px-3 py-1 font-label text-[11px] uppercase tracking-widest transition-colors ${
              on ? 'bg-[#F0742A] text-white' : 'bg-[#1E242C]/80 text-[#F8F2DD] hover:bg-[#1E242C]'
            }`}
          >
            {ui.kinds[k]}
          </button>
        )
      })}
    </div>
  )
}
