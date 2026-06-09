import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'

export type Restaurant = {
  slug: string
  name: string
  suburb: string
  city: string
  category: string
  cuisine_en: string
  cuisine_zh: string
  map_url: string
  map_type: 'google' | 'amap'
  images: string[]
  review_en: string
  review_zh: string
}

const dataDir = path.join(process.cwd(), 'src/data/restaurants')

function parseReviews(content: string): { en: string; zh: string } {
  const enMatch = content.match(/## en\s+([\s\S]*?)(?=## zh|$)/i)
  const zhMatch = content.match(/## zh\s+([\s\S]*?)$/i)
  return {
    en: enMatch ? enMatch[1].trim() : '',
    zh: zhMatch ? zhMatch[1].trim() : '',
  }
}

export function getAllRestaurants(): Restaurant[] {
  const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.md'))
  return files.map(file => {
    const raw = fs.readFileSync(path.join(dataDir, file), 'utf-8')
    const { data, content } = matter(raw)
    const { en, zh } = parseReviews(content)
    return { ...data, review_en: en, review_zh: zh } as Restaurant
  })
}

export function getRestaurant(slug: string): Restaurant | undefined {
  return getAllRestaurants().find(r => r.slug === slug)
}
