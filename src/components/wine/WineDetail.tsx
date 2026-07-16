'use client'

import Link from 'next/link'
import { useLang } from '@/components/LanguageContext'
import { basePath } from '@/lib/basePath'
import { WINE_UI, pick, type WineUIStrings } from '@/lib/wineI18n'
import type { WineEntry, WineProfile, WineDetails, Level } from '@/lib/wines'

type Lang = 'en' | 'zh'

const WASH: Record<string, string> = {
  pink: 'var(--wash-pink)',
  peach: 'var(--wash-peach)',
  blue: 'var(--wash-blue)',
  green: 'var(--wash-green)',
  cocoa: 'var(--wash-cocoa)',
}

const DIMS = ['body', 'tannin', 'acidity', 'sweetness'] as const
const LEVELS: Level[] = ['low', 'medium', 'high']
const EN_MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function imgSrc(slug: string, s: string) {
  return `${basePath}/images/wines/${slug}/${s}`
}

function formatDate(s: string | undefined, lang: Lang): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || '')
  if (!m) return s || ''
  const year = m[1]
  const month = parseInt(m[2], 10)
  const day = parseInt(m[3], 10)
  if (lang === 'zh') return `${year} 年 ${month} 月 ${day} 日`
  return `${EN_MONTHS[month - 1]} ${day}, ${year}`
}

function hasProfile(p?: WineProfile): boolean {
  return !!p && DIMS.some(d => p[d])
}
function hasSpec(d: WineDetails, lang: Lang): boolean {
  return !!(
    d.producer || pick(d.country, lang) || pick(d.region, lang) || pick(d.varieties, lang) ||
    d.alcohol || d.vintage || d.size || pick(d.closure, lang)
  )
}
function hasRegion(d: WineDetails, lang: Lang): boolean {
  return !!(pick(d.region, lang) || pick(d.notes, lang) || d.map_url)
}

export default function WineDetail({ wine }: { wine: WineEntry }) {
  const { lang } = useLang()
  const ui = WINE_UI[lang]
  const imgs = wine.images?.length ? wine.images : wine.image ? [wine.image] : []
  return (
    <>
      <Link className="back-link" href="/wine">{ui.back}</Link>
      <div>
        {imgs.length >= 2
          ? <Spread wine={wine} imgs={imgs} lang={lang} ui={ui} />
          : <Hero wine={wine} imgs={imgs} lang={lang} ui={ui} />}
      </div>
    </>
  )
}

/* ── shared pieces ── */

function Meta({ wine, lang, ui }: { wine: WineEntry; lang: Lang; ui: WineUIStrings }) {
  const priceLine = wine.price_aud
    ? `$${wine.price_aud} AUD${wine.details?.size ? ' / ' + wine.details.size : ''}`
    : ''
  const tags = wine.tags || []
  const winery = pick(wine.winery, lang)
  return (
    <>
      <h1 className="bean-name">{pick(wine.wine_name, lang)}</h1>
      {winery && <div className="bean-meta">{winery}</div>}
      {wine.date && <div className="bean-dates">{`${ui.tasted} ${formatDate(wine.date, lang)}`}</div>}
      {priceLine && <div className="bean-price">{priceLine}</div>}
      {tags.length > 0 && (
        <div className="hero-tags hero-tags--static">
          {tags.map((t, i) => <span className="hero-tag" key={i}>{pick(t, lang)}</span>)}
        </div>
      )}
    </>
  )
}

function FlavourRow({ wine, lang }: { wine: WineEntry; lang: Lang }) {
  return (
    <div className="flavour-row">
      {(wine.flavours || []).map((f, i) => (
        <div className="icon-item" key={i}>
          <div className="icon-emoji">{f.icon}</div>
          <div className="icon-label">{pick(f.label, lang)}</div>
        </div>
      ))}
    </div>
  )
}

function Story({ text }: { text: string }) {
  return (
    <div className="story">
      {text.split('\n\n').map((p, i) => <p key={i}>{p}</p>)}
    </div>
  )
}

function SliderRow({ dim, value, ui }: { dim: (typeof DIMS)[number]; value: Level; ui: WineUIStrings }) {
  const idx = Math.max(0, LEVELS.indexOf(value))
  const pct = (idx / 2) * 100
  return (
    <div className="slider-row">
      <div className="slider-label">{ui.dims[dim]}</div>
      <div className="slider-track">
        <span className="slider-dot" style={{ left: `${pct}%` }} />
      </div>
      <div className="slider-scale">
        <span>{ui.levels.low}</span>
        <span>{ui.levels.medium}</span>
        <span>{ui.levels.high}</span>
      </div>
    </div>
  )
}

function TasteProfile({ profile, ui }: { profile: WineProfile; ui: WineUIStrings }) {
  const rows = DIMS.filter(d => profile[d])
  return (
    <div>
      <h2 className="section-title">{ui.tasteProfile}</h2>
      <div className="taste-grid">
        {rows.map(d => <SliderRow key={d} dim={d} value={profile[d] as Level} ui={ui} />)}
      </div>
    </div>
  )
}

function Pairing({ text, ui }: { text: string; ui: WineUIStrings }) {
  return (
    <div>
      <h2 className="section-title">{ui.pairing}</h2>
      <div className="brew-method">{text}</div>
    </div>
  )
}

function SpecRows({ details, lang, ui }: { details: WineDetails; lang: Lang; ui: WineUIStrings }) {
  const rows: Array<[string, string]> = []
  const add = (label: string, val: string) => { if (val) rows.push([label, val]) }
  add(ui.fields.producer, details.producer || '')
  add(ui.fields.country, [details.flag, pick(details.country, lang)].filter(Boolean).join(' '))
  add(ui.fields.region, pick(details.region, lang))
  add(ui.fields.varieties, pick(details.varieties, lang))
  add(ui.fields.alcohol, details.alcohol || '')
  add(ui.fields.vintage, details.vintage || '')
  add(ui.fields.size, details.size || '')
  add(ui.fields.closure, pick(details.closure, lang))
  return (
    <div className="spec">
      {rows.map(([label, val], i) => (
        <div className="spec-row" key={i}>
          <div className="spec-label">{label}</div>
          <div className="spec-value">{val}</div>
        </div>
      ))}
    </div>
  )
}

function Region({ details, lang, ui }: { details: WineDetails; lang: Lang; ui: WineUIStrings }) {
  const name = pick(details.region, lang)
  const notes = pick(details.notes, lang)
  return (
    <>
      {name && <div className="origin-name">{details.flag ? details.flag + ' ' : ''}{name}</div>}
      {notes && <p className="origin-notes">{notes}</p>}
      {details.map_url && (
        <a className="source-link origin-map" href={details.map_url} target="_blank" rel="noopener noreferrer">
          {ui.viewRegion} ↗
        </a>
      )}
    </>
  )
}

/* ── Layout B: single/none photo — hero + panels ── */
function Hero({ wine, imgs, lang, ui }: { wine: WineEntry; imgs: string[]; lang: Lang; ui: WineUIStrings }) {
  const hasPhotos = imgs.length > 0
  const story = pick(wine.story, lang)
  const pairing = pick(wine.pairing, lang)
  const summary = pick(wine.summary, lang)
  const d = wine.details
  return (
    <div className="detail">
      <section className="hero">
        <div
          className={hasPhotos ? 'hero-left has-photos' : 'hero-left'}
          style={hasPhotos ? undefined : { background: WASH[wine.color || 'pink'] }}
        >
          {hasPhotos
            ? imgs.map((s, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img className="hero-photo" key={i} src={imgSrc(wine.slug, s)} alt="" />
              ))
            : <span className="hero-img-fallback">🍷</span>}
        </div>
        <div className="hero-right">
          <Meta wine={wine} lang={lang} ui={ui} />
          {(wine.flavours || []).length > 0 && (
            <div className="hero-sub">
              <div className="kicker">{ui.flavours}</div>
              <FlavourRow wine={wine} lang={lang} />
            </div>
          )}
          {story && (
            <div className="hero-sub">
              <div className="kicker">{ui.notes}</div>
              <Story text={story} />
            </div>
          )}
        </div>
      </section>

      {(pairing || hasProfile(wine.profile)) && (
        <section className="panel panel-peach">
          <div className="brewpair">
            {pairing && <Pairing text={pairing} ui={ui} />}
            {hasProfile(wine.profile) && <TasteProfile profile={wine.profile!} ui={ui} />}
          </div>
        </section>
      )}

      {summary && (
        <section className="summary-wrap">
          <div className="summary-box">
            <span className="cup">🍷</span>
            <span>{summary}</span>
          </div>
        </section>
      )}

      {d && hasSpec(d, lang) && (
        <section className="panel panel-peach">
          <h2 className="section-title">{ui.details}</h2>
          <SpecRows details={d} lang={lang} ui={ui} />
        </section>
      )}

      {d && hasRegion(d, lang) && (
        <section className="panel panel-blue">
          <h2 className="section-title">{ui.region}</h2>
          <Region details={d} lang={lang} ui={ui} />
        </section>
      )}

      {wine.url && (
        <section className="source-wrap">
          <a className="source-link" href={wine.url} target="_blank" rel="noopener noreferrer">
            {ui.source} ↗
          </a>
        </section>
      )}
    </div>
  )
}

/* ── Layout A: 2+ photos — magazine spread ── */
function Spread({ wine, imgs, lang, ui }: { wine: WineEntry; imgs: string[]; lang: Lang; ui: WineUIStrings }) {
  const story = pick(wine.story, lang)
  const pairing = pick(wine.pairing, lang)
  const summary = pick(wine.summary, lang)
  const d = wine.details
  return (
    <div className="spread">
      <aside className="gallery">
        {imgs.map((s, i) => (
          <div className="shot" key={i}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imgSrc(wine.slug, s)} alt="" />
          </div>
        ))}
      </aside>
      <div className="content">
        <div className="blk"><Meta wine={wine} lang={lang} ui={ui} /></div>
        {(wine.flavours || []).length > 0 && (
          <div className="blk">
            <div className="kicker">{ui.flavours}</div>
            <FlavourRow wine={wine} lang={lang} />
          </div>
        )}
        {story && (
          <div className="blk">
            <div className="kicker">{ui.notes}</div>
            <Story text={story} />
          </div>
        )}
        {pairing && <div className="blk sep"><Pairing text={pairing} ui={ui} /></div>}
        {hasProfile(wine.profile) && (
          <div className="blk sep"><TasteProfile profile={wine.profile!} ui={ui} /></div>
        )}
        {summary && (
          <div className="blk sep">
            <div className="summary-box">
              <span className="cup">🍷</span>
              <span>{summary}</span>
            </div>
          </div>
        )}
        {d && hasSpec(d, lang) && (
          <div className="blk sep">
            <h2 className="section-title">{ui.details}</h2>
            <SpecRows details={d} lang={lang} ui={ui} />
          </div>
        )}
        {d && hasRegion(d, lang) && (
          <div className="blk sep">
            <h2 className="section-title">{ui.region}</h2>
            <Region details={d} lang={lang} ui={ui} />
          </div>
        )}
        {wine.url && (
          <div className="blk sep">
            <a className="source-link" href={wine.url} target="_blank" rel="noopener noreferrer">
              {ui.source} ↗
            </a>
          </div>
        )}
      </div>
    </div>
  )
}
