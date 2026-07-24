'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useLang } from './LanguageContext'
import { basePath } from '@/lib/basePath'
import { WINE_UI } from '@/lib/wineI18n'

export default function Header() {
  const { lang, toggle } = useLang()
  const pathname = usePathname()
  const isHome = pathname === '/'
  const isWine = pathname.startsWith('/wine')
  const ui = WINE_UI[lang]

  const navClass = (active: boolean) =>
    `font-label text-xs uppercase tracking-widest pb-1 border-b-2 transition-colors ${
      active ? 'border-white text-white font-semibold' : 'border-transparent text-white/70 hover:text-white'
    }`

  return (
    <header className={`sticky top-0 z-50 header-gradient ${isHome ? '' : 'border-b-[3px] border-[#0F84B5]'}`}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
        <Link href="/" className="flex items-center gap-2.5 group min-w-0">
          <Image
            src={`${basePath}/logo-mark.png`}
            alt=""
            width={38}
            height={38}
            priority
            className="rounded-full ring-2 ring-white/70 shadow-sm shrink-0"
          />
          <span className="font-display font-bold text-lg sm:text-xl tracking-tight text-white whitespace-nowrap group-hover:opacity-80 transition-opacity">
            <span className="sm:hidden">菠萝子</span>
            <span className="hidden sm:inline">菠萝子美食指南</span>
          </span>
        </Link>
        <div className="flex items-center gap-3 sm:gap-5 shrink-0">
          <nav className="flex items-center gap-3 sm:gap-4">
            <Link href="/" className={navClass(!isWine)}>{ui.navRestaurants}</Link>
            <Link href="/wine" className={navClass(isWine)}>{ui.navWine}</Link>
          </nav>
          <button
            onClick={toggle}
            className="font-label text-xs uppercase tracking-widest px-3 py-1.5 rounded-full border border-white text-white hover:bg-white hover:text-[#F0742A] transition-all duration-200"
          >
            {lang === 'en' ? '中文' : 'EN'}
          </button>
        </div>
      </div>
    </header>
  )
}
