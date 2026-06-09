'use client'

import { createContext, useContext, useState, ReactNode } from 'react'

type Lang = 'en' | 'zh'
type LangContextType = { lang: Lang; toggle: () => void }

const LangContext = createContext<LangContextType>({ lang: 'en', toggle: () => {} })

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>('en')
  const toggle = () => setLang(l => (l === 'en' ? 'zh' : 'en'))
  return <LangContext.Provider value={{ lang, toggle }}>{children}</LangContext.Provider>
}

export function useLang() {
  return useContext(LangContext)
}
