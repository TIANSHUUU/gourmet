'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useLang } from './LanguageContext'

export default function Header() {
  const { lang, toggle } = useLang()
  const pathname = usePathname()
  const isHome = pathname === '/'

  return (
    <header className={`sticky top-0 z-50 header-gradient ${isHome ? '' : 'border-b-[3px] border-[#0F84B5]'}`}>
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="font-display font-bold text-xl tracking-tight text-white hover:opacity-80 transition-opacity">
          猪比登美食指南🐷🕵️
        </Link>
        <button
          onClick={toggle}
          className="font-label text-xs uppercase tracking-widest px-3 py-1.5 rounded-full border border-white text-white hover:bg-white hover:text-[#F0742A] transition-all duration-200"
        >
          {lang === 'en' ? '中文' : 'EN'}
        </button>
      </div>
    </header>
  )
}
