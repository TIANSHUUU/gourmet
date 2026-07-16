import { getAllWines } from '@/lib/wines'
import WineListClient from '@/components/wine/WineListClient'

export default function WinePage() {
  return <WineListClient wines={getAllWines()} />
}
