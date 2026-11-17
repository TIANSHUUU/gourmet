'use client'

import Link from 'next/link'
import { useLang } from '@/components/LanguageContext'
import { basePath } from '@/lib/basePath'
import { formatVisited, splitParagraphs } from '@/lib/format'
import { MAP_UI } from '@/lib/mapI18n'
import { KIND_COLORS, isSpotKind } from '@/lib/map/kinds'
import { splitGallery, type PlaceFeature } from '@/lib/map/placesToGeoJSON'

export default function PlaceCard({ feature, onClose }: { feature: PlaceFeature; onClose: () => void }) {
  const { lang } = useLang()
  const ui = MAP_UI[lang]
  const p = feature.properties
  const tagline = lang === 'en' ? p.tagline_en : p.tagline_zh
  const cuisine = lang === 'en' ? p.cuisine_en : p.cuisine_zh
  const where = lang === 'en' ? `${p.suburb}, ${p.city}` : `${p.city} · ${p.suburb}`
  const visited = formatVisited(p.visited, lang)
  const mapLabel = p.map_type === 'amap' ? ui.openAmap : ui.openGoogle
  // 景点类没有图文页:评论全文和其余照片直接放在卡片里(内容区可滚动),也不显示「查看图文」
  const spot = isSpotKind(p.kind)
  const review = spot ? (lang === 'en' ? p.review_en : p.review_zh) : ''
  const gallery = spot ? splitGallery(p.gallery) : []

  return (
    <aside
      role="dialog"
      aria-label={p.name}
      className="absolute z-20 inset-x-0 bottom-0 md:inset-x-auto md:right-4 md:top-4 md:bottom-4 md:w-[360px] flex flex-col max-h-[70dvh] md:max-h-none overflow-hidden rounded-t-2xl md:rounded-2xl bg-[#FCFAF4] text-[#13314A] shadow-2xl"
    >
      {p.cover && (
        <div className="relative shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`${basePath}/images/${p.slug}/${p.cover}`} alt={p.name} className="w-full h-40 md:h-52 object-cover" />
        </div>
      )}
      <button
        type="button"
        onClick={onClose}
        aria-label={ui.close}
        className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/50 text-white text-lg leading-none"
      >
        ×
      </button>
      <div className="p-4 flex flex-col gap-2 overflow-y-auto">
        <div className="flex items-center gap-2 flex-wrap">
          <h2 className={`font-display text-2xl font-bold ${p.cover ? '' : 'pr-10'}`}>{p.name}</h2>
          <span
            className="font-label text-[10px] uppercase tracking-widest text-white px-2 py-0.5 rounded-full"
            style={{ background: KIND_COLORS[p.kind] }}
          >
            {ui.kinds[p.kind]}
          </span>
        </div>
        <p className="font-label text-[11px] uppercase tracking-wider text-[#8A99A6]">{cuisine} · {where}</p>
        {visited && <p className="font-label text-[11px] uppercase tracking-wider text-[#F0742A]">{visited}</p>}
        {tagline && <p className="text-base leading-relaxed">{tagline}</p>}
        {review && (
          <div className="text-sm leading-relaxed space-y-3 pt-1">
            {splitParagraphs(review).map((para, i) => (
              <p key={i}>{para}</p>
            ))}
          </div>
        )}
        {gallery.map(img => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={img} src={`${basePath}/images/${p.slug}/${img}`} alt={p.name} className="w-full h-auto rounded-sm mt-1" />
        ))}
        <div className="flex gap-2 pt-2 flex-wrap">
          {!spot && (
            <Link
              href={`/${p.slug}`}
              className="inline-flex items-center bg-[#0F84B5] text-white font-label text-xs font-bold uppercase tracking-widest px-4 py-2 hover:bg-[#F0742A] transition-colors"
            >
              {ui.viewStory}
            </Link>
          )}
          <a
            href={p.map_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center border-[1.5px] border-[#0F84B5] text-[#0F84B5] font-label text-xs font-bold uppercase tracking-widest px-4 py-2 hover:border-[#F0742A] hover:text-[#F0742A] transition-colors"
          >
            {mapLabel}
          </a>
        </div>
        <p className="md:hidden pt-3 text-[10px] leading-snug text-[#8A99A6]">
          Map © <a className="underline" href="https://openfreemap.org" target="_blank" rel="noopener noreferrer">OpenFreeMap</a>
          {' '}© <a className="underline" href="https://www.openmaptiles.org/" target="_blank" rel="noopener noreferrer">OpenMapTiles</a>
          {' '}Data © <a className="underline" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors
        </p>
      </div>
    </aside>
  )
}
