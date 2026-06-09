'use client'

import Link from 'next/link'
import { useLang } from './LanguageContext'

export default function Header() {
  const { lang, toggle } = useLang()

  return (
    <header className="sticky top-0 z-50 bg-[#FAFAF7]/90 backdrop-blur-sm border-b border-[#E8E4DE]">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="font-bold text-xl tracking-tight text-[#1A1A1A] hover:text-[#C84B2F] transition-colors">
          猪比登美食指南🐷🕵️
        </Link>
        <button
          onClick={toggle}
          className="text-sm font-medium px-3 py-1.5 rounded-full border border-[#1A1A1A] hover:bg-[#1A1A1A] hover:text-white transition-all duration-200"
        >
          {lang === 'en' ? '中文' : 'EN'}
        </button>
      </div>
    </header>
  )
}
