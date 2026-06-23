'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useLang } from './LanguageContext'
import { basePath } from '@/lib/basePath'

export default function Header() {
  const { lang, toggle } = useLang()
  const pathname = usePathname()
  const isHome = pathname === '/'

  return (
    <header className={`sticky top-0 z-50 header-gradient ${isHome ? '' : 'border-b-[3px] border-[#0F84B5]'}`}>
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 group">
          <Image
            src={`${basePath}/logo-mark.png`}
            alt=""
            width={38}
            height={38}
            priority
            className="rounded-full ring-2 ring-white/70 shadow-sm"
          />
          <span className="font-display font-bold text-xl tracking-tight text-white group-hover:opacity-80 transition-opacity">
            猪比登美食指南
          </span>
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
