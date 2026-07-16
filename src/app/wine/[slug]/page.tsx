import { getAllWines, getWine } from '@/lib/wines'
import { notFound } from 'next/navigation'
import WineDetail from '@/components/wine/WineDetail'

export async function generateStaticParams() {
  return getAllWines().map(w => ({ slug: w.slug }))
}

export default async function WineEntryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const wine = getWine(slug)
  if (!wine) notFound()
  return <WineDetail wine={wine} />
}
