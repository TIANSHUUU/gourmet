'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useLang } from '@/components/LanguageContext'
import { basePath } from '@/lib/basePath'
import { WINE_UI, pick } from '@/lib/wineI18n'
import type { WineEntry, WineType } from '@/lib/wines'

const TYPES: Array<'all' | WineType> = ['all', 'red', 'white', 'rose', 'sparkling']

const WASH: Record<string, string> = {
  pink: 'var(--wash-pink)',
  peach: 'var(--wash-peach)',
  blue: 'var(--wash-blue)',
  green: 'var(--wash-green)',
  cocoa: 'var(--wash-cocoa)',
}

export default function WineListClient({ wines }: { wines: WineEntry[] }) {
  const { lang } = useLang()
  const ui = WINE_UI[lang]
  const [q, setQ] = useState('')
  const [type, setType] = useState<'all' | WineType>('all')

  const filtered = useMemo(() => {
    const kw = q.trim().toLowerCase()
    return wines.filter(w => {
      if (type !== 'all' && w.wine_type !== type) return false
      if (!kw) return true
      const hay = [
        pick(w.wine_name, 'en'), pick(w.wine_name, 'zh'),
        pick(w.winery, 'en'), pick(w.winery, 'zh'),
        pick(w.details?.region, 'en'), pick(w.details?.region, 'zh'),
        pick(w.details?.varieties, 'en'), pick(w.details?.varieties, 'zh'),
        ...(w.tags || []).flatMap(t => [pick(t, 'en'), pick(t, 'zh')]),
        ...(w.flavours || []).flatMap(f => [pick(f.label, 'en'), pick(f.label, 'zh')]),
      ].join(' ').toLowerCase()
      return hay.includes(kw)
    })
  }, [wines, q, type])

  return (
    <main className="list-page">
      <div className="list-head">
        <h1 className="list-title">{ui.listTitle}</h1>
        <p className="list-intro">{ui.listIntro}</p>
      </div>

      <div className="controls">
        <input
          className="search-box"
          value={q}
          placeholder={ui.searchPlaceholder}
          onChange={e => setQ(e.target.value)}
        />
        <div className="filter-pills">
          {TYPES.map(t => (
            <button
              key={t}
              type="button"
              className={`filter-pill${type === t ? ' active' : ''}`}
              onClick={() => setType(t)}
            >
              {t === 'all' ? ui.filterAll : ui.types[t]}
            </button>
          ))}
        </div>
      </div>

      {wines.length === 0 ? (
        <EmptyState icon="🍷" title={ui.emptyList} hint={ui.emptyHint} />
      ) : filtered.length === 0 ? (
        <EmptyState icon="🔍" title={ui.noMatch} />
      ) : (
        <div className="card-grid">
          {filtered.map(w => (
            <WineCard key={w.slug} wine={w} lang={lang} />
          ))}
        </div>
      )}
    </main>
  )
}

function WineCard({ wine, lang }: { wine: WineEntry; lang: 'en' | 'zh' }) {
  const cover = wine.images?.[0] || wine.image
  return (
    <Link className="card" href={`/wine/${wine.slug}`}>
      <div className="card-thumb" style={{ background: WASH[wine.color || 'pink'] }}>
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`${basePath}/images/wines/${wine.slug}/${cover}`} alt="" />
        ) : (
          <span className="card-thumb-fallback">🍷</span>
        )}
      </div>
      <div className="card-body">
        <div className="card-name">{pick(wine.wine_name, lang)}</div>
        <div className="card-roaster">{pick(wine.winery, lang)}</div>
        <div className="card-flavours">
          {(wine.flavours || []).slice(0, 3).map((f, i) => (
            <span className="chip" key={i}>
              {f.icon} {pick(f.label, lang)}
            </span>
          ))}
        </div>
      </div>
    </Link>
  )
}

function EmptyState({ icon, title, hint }: { icon: string; title: string; hint?: string }) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">{icon}</div>
      <p>{title}</p>
      {hint ? <small>{hint}</small> : null}
    </div>
  )
}
