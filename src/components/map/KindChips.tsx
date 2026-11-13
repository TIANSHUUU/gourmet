'use client'

import { useLang } from '@/components/LanguageContext'
import { MAP_UI } from '@/lib/mapI18n'
import { KIND_COLORS, KIND_ORDER } from '@/lib/map/kinds'
import type { PlaceKind } from '@/lib/places'

export default function KindChips({
  available, active, onToggle,
}: { available: PlaceKind[]; active: PlaceKind[]; onToggle: (k: PlaceKind) => void }) {
  const { lang } = useLang()
  const ui = MAP_UI[lang]
  const shown = KIND_ORDER.filter(k => available.includes(k))
  if (shown.length < 2) return null
  return (
    <div className="flex gap-2 overflow-x-auto">
      {shown.map(k => {
        const on = active.includes(k)
        return (
          <button
            key={k}
            type="button"
            aria-pressed={on}
            onClick={() => onToggle(k)}
            className={`shrink-0 rounded-full px-3 py-1 font-label text-[11px] uppercase tracking-widest border transition-colors ${
              on ? 'text-white border-transparent' : 'bg-[#1E242C]/70 text-[#F8F2DD]/70 border-white/20'
            }`}
            style={on ? { background: KIND_COLORS[k] } : undefined}
          >
            {ui.kinds[k]}
          </button>
        )
      })}
    </div>
  )
}
