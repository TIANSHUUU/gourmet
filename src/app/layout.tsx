import type { Metadata } from 'next'
import { Fraunces, Inter, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { LangProvider } from '@/components/LanguageContext'
import Header from '@/components/Header'
import Footer from '@/components/Footer'

const fraunces = Fraunces({ subsets: ['latin'], variable: '--font-fraunces' })
const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' })

export const metadata: Metadata = {
  // bare origin only — Next already prefixes the basePath (/gourmet) onto the
  // opengraph-image file-convention path, so including it here would double it.
  metadataBase: new URL('https://tianshuuu.github.io/'),
  title: '猪比登美食指南',
  description: 'A personal guide to restaurants, cafés & bars worth revisiting.',
  openGraph: {
    title: '猪比登美食指南',
    description: 'A personal guide to restaurants, cafés & bars worth revisiting.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '猪比登美食指南',
    description: 'A personal guide to restaurants, cafés & bars worth revisiting.',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${inter.variable} ${jetbrainsMono.variable} antialiased`}>
      <body className="min-h-screen bg-[#FCFAF4] text-[#13314A] font-[family-name:var(--font-inter)]">
        <LangProvider>
          <Header />
          <main>{children}</main>
          <Footer />
        </LangProvider>
      </body>
    </html>
  )
}
