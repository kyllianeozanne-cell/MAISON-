import { slotOf } from './constants'
import { isNeutral, colorFamily } from './colors'
import { ymd } from './utils'
import type { Garment } from '../types'

const avail = (g: Garment[]) => g.filter((x) => x.status === 'available')

/** Nombre de tenues distinctes réalisables (haut × bas × chaussures, plus costumes). */
export function countOutfits(garments: Garment[]): number {
  const a = avail(garments)
  const n = (s: string) => a.filter((g) => slotOf(g.category) === s).length
  const shoes = Math.max(1, n('shoes'))
  return (n('top') * n('bottom') + n('suit') * Math.max(1, n('top'))) * shoes
}

export const daysAgo = (n: number) => ymd(new Date(Date.now() - n * 86400000))

/** Pièces non portées depuis `days` jours (ou jamais). */
export function dormant(garments: Garment[], days = 60): Garment[] {
  const lim = daysAgo(days)
  return avail(garments).filter((g) => !g.wornDates.some((d) => d >= lim))
}

export function costPerWear(g: Garment): number | null {
  return g.price && g.price > 0 ? g.price / Math.max(1, g.wornDates.length) : null
}

export interface Bilan { pieces: number; outfits: number; dormant: number; neutralPct: number; basics: { label: string; ok: boolean }[] }

export function bilan(garments: Garment[]): Bilan {
  const a = avail(garments)
  const has = (...c: string[]) => a.some((g) => c.includes(g.category))
  const neutral = a.length ? a.filter((g) => isNeutral(g.color) || colorFamily(g.color) === 'earth').length / a.length : 0
  return {
    pieces: a.length,
    outfits: countOutfits(garments),
    dormant: dormant(garments).length,
    neutralPct: Math.round(neutral * 100),
    basics: [
      { label: 'Chemise', ok: has('chemise') }, { label: 'Pull', ok: has('pull') }, { label: 'Pantalon', ok: has('pantalon', 'jean') },
      { label: 'Veste ou manteau', ok: has('veste', 'manteau', 'blouson') }, { label: 'Chaussures habillées', ok: a.some((g) => g.category === 'chaussures') },
      { label: 'Baskets', ok: has('baskets') },
    ],
  }
}

/** Défi : porter chaque pièce disponible au moins une fois sur 30 jours. */
export function challenge(garments: Garment[]): { worn: number; total: number; left: Garment[] } {
  const lim = daysAgo(30)
  const a = avail(garments)
  const left = a.filter((g) => !g.wornDates.some((d) => d >= lim))
  return { worn: a.length - left.length, total: a.length, left }
}
