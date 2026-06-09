import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import './globals.css'
import { LangProvider } from '@/components/LanguageContext'
import Header from '@/components/Header'
import Footer from '@/components/Footer'

const geist = Geist({ subsets: ['latin'], variable: '--font-geist-sans' })

export const metadata: Metadata = {
  title: '猪比登美食指南🐷🕵️',
  description: 'A personal guide to restaurants, cafés & bars worth revisiting.',
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🐽</text></svg>",
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} antialiased`}>
      <body className="min-h-screen bg-[#FAFAF7] font-[family-name:var(--font-geist-sans)]">
        <LangProvider>
          <Header />
          <main>{children}</main>
          <Footer />
        </LangProvider>
      </body>
    </html>
  )
}
