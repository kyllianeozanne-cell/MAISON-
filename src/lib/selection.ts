import { CAT_BY_ID, slotOf } from './constants'
import { NAMED_COLORS, colorName, harmony, isNeutral } from './colors'
import type { Product } from './catalog'
import type { CategoryId, Garment, Settings, Slot, Style } from '../types'

export type SelSection = 'indispensables' | 'style' | 'complete' | 'decouvertes'

export const SECTIONS: { id: SelSection; title: string; sub: string }[] = [
  { id: 'indispensables', title: 'Les indispensables', sub: 'Les pièces essentielles qui manquent à ton dressing.' },
  { id: 'style', title: 'En accord avec ton style', sub: 'Dans l’esprit de ce que tu portes et aimes.' },
  { id: 'complete', title: 'Complète tes tenues', sub: 'Elles s’associent à ce que tu possèdes déjà.' },
  { id: 'decouvertes', title: 'Découvertes Maison', sub: 'Des pièces pour faire évoluer ton style.' },
]

interface Tpl {
  id: string
  cat: CategoryId
  noun: string
  g: 'm' | 'f'
  pl?: boolean
  colors: string[] // noms de NAMED_COLORS, par ordre de préférence
  styles: Style[]
  formality: number
  essential?: boolean
  disc?: boolean
  sex?: 'homme' | 'femme' // absent = mixte
  gap: (c: Ctx) => number // 0 (rien ne manque) → 1 (indispensable)
}

interface Ctx { all: Garment[]; of: (...c: CategoryId[]) => Garment[]; colorsIn: (...c: CategoryId[]) => Set<string> }

const none = (...c: CategoryId[]) => (x: Ctx) => (x.of(...c).length === 0 ? 1 : 0)
const few = (n: number, base: number, ...c: CategoryId[]) => (x: Ctx) => { const k = x.of(...c).length; return k === 0 ? Math.min(1, base + 0.2) : k < n ? base : 0 }

const TPL: Tpl[] = [
  { id: 'chemise-blanche', cat: 'chemise', noun: 'Chemise', g: 'f', colors: ['Blanc', 'Bleu ciel'], styles: ['classique', 'business', 'old money'], formality: 4, essential: true, gap: (x) => (x.of('chemise').length === 0 ? 1 : x.colorsIn('chemise').has('Blanc') ? 0 : 0.8) },
  { id: 'chemise-ciel', cat: 'chemise', noun: 'Chemise Oxford', g: 'f', colors: ['Bleu ciel', 'Écru'], styles: ['classique', 'old money', 'casual'], formality: 3, gap: few(3, 0.5, 'chemise') },
  { id: 'pull-maille', cat: 'pull', noun: 'Pull en maille fine', g: 'm', colors: ['Marine', 'Gris', 'Camel'], styles: ['classique', 'old money', 'business'], formality: 3, essential: true, gap: few(2, 0.75, 'pull') },
  { id: 'chino', cat: 'pantalon', noun: 'Pantalon chino', g: 'm', colors: ['Beige', 'Marine', 'Kaki'], styles: ['classique', 'casual', 'old money'], formality: 3, essential: true, gap: few(2, 0.75, 'pantalon') },
  { id: 'tailleur', cat: 'pantalon', noun: 'Pantalon de costume', g: 'm', colors: ['Anthracite', 'Marine'], styles: ['business', 'classique', 'soiree'], formality: 4, gap: (x) => (x.all.some((g) => g.category === 'pantalon' && g.formality >= 4) ? 0 : 0.8) },
  { id: 'jean', cat: 'jean', noun: 'Jean brut', g: 'm', colors: ['Marine', 'Noir'], styles: ['casual', 'streetwear', 'classique'], formality: 2, gap: none('jean') },
  { id: 'blazer', cat: 'veste', noun: 'Veste blazer', g: 'f', colors: ['Marine', 'Anthracite', 'Camel'], styles: ['classique', 'business', 'old money', 'soiree'], formality: 4, essential: true, gap: none('veste', 'costume') },
  { id: 'manteau', cat: 'manteau', noun: 'Manteau long', g: 'm', colors: ['Camel', 'Anthracite', 'Marine'], styles: ['classique', 'old money', 'business'], formality: 4, essential: true, gap: none('manteau') },
  { id: 'blouson', cat: 'blouson', noun: 'Blouson léger', g: 'm', colors: ['Kaki', 'Marine', 'Beige'], styles: ['casual', 'streetwear', 'classique'], formality: 2, gap: none('blouson', 'veste') },
  { id: 'mocassins', cat: 'chaussures', noun: 'Mocassins en cuir', g: 'm', pl: true, colors: ['Marron', 'Noir', 'Chocolat'], styles: ['classique', 'old money', 'business'], formality: 4, essential: true, gap: (x) => (x.all.some((g) => g.category === 'chaussures' && g.formality >= 3) ? 0 : 1) },
  { id: 'derbies', cat: 'chaussures', noun: 'Derbies en cuir', g: 'f', pl: true, colors: ['Noir', 'Chocolat'], styles: ['business', 'classique', 'soiree'], formality: 5, gap: few(2, 0.45, 'chaussures') },
  { id: 'baskets', cat: 'baskets', noun: 'Baskets en cuir', g: 'f', pl: true, colors: ['Blanc', 'Écru'], styles: ['casual', 'streetwear', 'sportif', 'old money'], formality: 2, essential: true, gap: none('baskets') },
  { id: 'chelsea', cat: 'bottines', noun: 'Bottines Chelsea', g: 'f', pl: true, colors: ['Marron', 'Noir'], styles: ['classique', 'soiree', 'casual'], formality: 3, gap: none('bottines') },
  { id: 'ceinture', cat: 'ceinture', noun: 'Ceinture en cuir', g: 'f', colors: ['Marron', 'Noir'], styles: ['classique', 'business', 'old money'], formality: 4, essential: true, gap: none('ceinture') },
  { id: 'montre', cat: 'montre', noun: 'Montre sobre', g: 'f', colors: ['Anthracite', 'Marron'], styles: ['classique', 'business', 'old money'], formality: 4, gap: none('montre') },
  { id: 'tshirt', cat: 'tshirt', noun: 'T-shirt en coton épais', g: 'm', colors: ['Blanc', 'Noir', 'Gris'], styles: ['casual', 'streetwear', 'sportif'], formality: 1, essential: true, gap: few(3, 0.75, 'tshirt') },
  { id: 'polo', sex: 'homme', cat: 'polo', noun: 'Polo en maille', g: 'm', colors: ['Marine', 'Écru'], styles: ['old money', 'classique', 'casual'], formality: 3, gap: none('polo') },
  { id: 'sweat', cat: 'sweat', noun: 'Sweat épais', g: 'm', colors: ['Gris', 'Anthracite', 'Marine'], styles: ['casual', 'streetwear', 'sportif'], formality: 1, gap: none('sweat') },
  { id: 'sac', cat: 'sac', noun: 'Sac en cuir', g: 'm', colors: ['Marron', 'Noir'], styles: ['classique', 'business'], formality: 4, gap: none('sac') },
  { id: 'costume', sex: 'homme', cat: 'costume', noun: 'Costume', g: 'm', colors: ['Marine', 'Anthracite'], styles: ['business', 'soiree', 'classique'], formality: 5, gap: none('costume') },
  // Pièces féminines
  { id: 'blouse', sex: 'femme', cat: 'blouse', noun: 'Blouse fluide', g: 'f', colors: ['Blanc', 'Écru', 'Bleu ciel'], styles: ['classique', 'business', 'old money'], formality: 4, essential: true, gap: none('blouse', 'chemise') },
  { id: 'robe-noire', sex: 'femme', cat: 'robe', noun: 'Petite robe', g: 'f', colors: ['Noir', 'Marine', 'Bordeaux'], styles: ['soiree', 'classique'], formality: 4, essential: true, gap: none('robe') },
  { id: 'robe-midi', sex: 'femme', cat: 'robe', noun: 'Robe midi', g: 'f', colors: ['Camel', 'Écru', 'Vert'], styles: ['casual', 'old money', 'classique'], formality: 3, gap: few(2, 0.5, 'robe') },
  { id: 'jupe', sex: 'femme', cat: 'jupe', noun: 'Jupe plissée', g: 'f', colors: ['Noir', 'Camel', 'Marine'], styles: ['classique', 'old money', 'casual'], formality: 3, essential: true, gap: none('jupe') },
  { id: 'combinaison', sex: 'femme', cat: 'combinaison', noun: 'Combinaison', g: 'f', colors: ['Noir', 'Kaki', 'Marine'], styles: ['soiree', 'classique', 'casual'], formality: 4, gap: none('combinaison') },
  { id: 'tailleur', sex: 'femme', cat: 'ensemble', noun: 'Ensemble tailleur', g: 'm', colors: ['Anthracite', 'Beige', 'Noir'], styles: ['business', 'classique', 'old money'], formality: 4, essential: true, gap: none('ensemble', 'costume') },
  { id: 'escarpins', sex: 'femme', cat: 'escarpins', noun: 'Escarpins', g: 'm', pl: true, colors: ['Noir', 'Beige', 'Bordeaux'], styles: ['soiree', 'classique', 'business'], formality: 5, essential: true, gap: none('escarpins') },
  { id: 'ballerines', sex: 'femme', cat: 'ballerines', noun: 'Ballerines', g: 'f', pl: true, colors: ['Noir', 'Beige', 'Bordeaux'], styles: ['classique', 'casual', 'old money'], formality: 3, gap: none('ballerines') },
  { id: 'ensemble-maille', sex: 'femme', cat: 'ensemble', noun: 'Ensemble en maille', g: 'm', colors: ['Écru', 'Gris', 'Camel'], styles: ['casual', 'old money'], formality: 3, disc: true, gap: () => 0.4 },
  // Découvertes
  { id: 'd-trench', cat: 'manteau', noun: 'Trench', g: 'm', colors: ['Beige', 'Camel'], styles: ['old money', 'classique'], formality: 4, disc: true, gap: (x) => (x.all.some((g) => g.category === 'manteau' && g.formality >= 4) ? 0.5 : 0.35) },
  { id: 'd-roule', cat: 'pull', noun: 'Pull col roulé fin', g: 'm', colors: ['Écru', 'Noir', 'Camel'], styles: ['classique', 'old money', 'soiree'], formality: 3, disc: true, gap: () => 0.4 },
  { id: 'd-overshirt', cat: 'blouson', noun: 'Surchemise', g: 'f', colors: ['Olive', 'Kaki', 'Marron'], styles: ['casual', 'streetwear'], formality: 2, disc: true, gap: () => 0.4 },
  { id: 'd-plisse', cat: 'pantalon', noun: 'Pantalon à pinces', g: 'm', colors: ['Écru', 'Gris', 'Anthracite'], styles: ['old money', 'classique'], formality: 4, disc: true, gap: () => 0.4 },
  { id: 'd-lin', cat: 'chemise', noun: 'Chemise en lin', g: 'f', colors: ['Écru', 'Bleu ciel'], styles: ['old money', 'casual'], formality: 3, disc: true, gap: () => 0.35 },
  { id: 'd-cardigan', cat: 'pull', noun: 'Cardigan en maille', g: 'm', colors: ['Camel', 'Gris', 'Vert'], styles: ['old money', 'classique'], formality: 3, disc: true, gap: () => 0.35 },
  { id: 'd-coach', cat: 'blouson', noun: 'Veste coach', g: 'f', colors: ['Noir', 'Kaki'], styles: ['streetwear', 'casual', 'sportif'], formality: 2, disc: true, gap: () => 0.3 },
]

export interface Need {
  id: string
  section: SelSection
  cat: CategoryId
  title: string
  g: 'm' | 'f'
  pl: boolean
  colorName: string
  color: string
  styles: Style[]
  why: string
  pairs: Garment[]
  coverage: number // pièces du dressing avec lesquelles elle s'associe
  noun: string
  score: number
}

const HEX = Object.fromEntries(NAMED_COLORS.map((c) => [c.name, c.hex])) as Record<string, string>
const ADJ: Record<string, [string, string]> = { Blanc: ['blanc', 'blanche'], Noir: ['noir', 'noire'], Bleu: ['bleu', 'bleue'], Gris: ['gris', 'grise'], Vert: ['vert', 'verte'], 'Gris clair': ['gris clair', 'gris clair'] }
export const colorAdj = (name: string, g: 'm' | 'f', pl: boolean): string => {
  const base = ADJ[name] ? ADJ[name][g === 'f' ? 1 : 0] : name.toLowerCase()
  return pl && !/[sx]$/.test(base) && ADJ[name] ? base + 's' : base
}
const listFr = (a: string[]) => (a.length <= 1 ? a.join('') : `${a.slice(0, -1).join(', ')} et ${a[a.length - 1]}`)
const low = (s: string) => s.charAt(0).toLowerCase() + s.slice(1)

const PAIR_SLOTS: Record<Slot, Slot[]> = {
  top: ['bottom', 'outer', 'shoes'],
  bottom: ['top', 'outer', 'shoes'],
  outer: ['top', 'bottom', 'shoes'],
  shoes: ['bottom', 'top', 'outer'],
  accessory: ['top', 'bottom', 'shoes'],
  suit: ['top', 'shoes'],
}

/** Pièces du dressing qui s'associent à une pièce de couleur/catégorie données. */
export function pairsFor(cat: CategoryId, color: string, formality: number, garments: Garment[]): { pairs: Garment[]; coverage: number } {
  const wanted = PAIR_SLOTS[slotOf(cat)]
  const cands = garments
    .filter((g) => g.status === 'available' && wanted.includes(slotOf(g.category)) && harmony(color, g.color) >= 0.84 && Math.abs(g.formality - formality) <= 1)
    .sort((a, b) => harmony(color, b.color) - harmony(color, a.color) || Math.abs(a.formality - formality) - Math.abs(b.formality - formality))
  const perSlot: Record<string, number> = {}
  const pairs: Garment[] = []
  for (const g of cands) {
    const s = slotOf(g.category)
    if ((perSlot[s] ?? 0) >= 2) continue
    perSlot[s] = (perSlot[s] ?? 0) + 1
    pairs.push(g)
    if (pairs.length >= 4) break
  }
  return { pairs, coverage: cands.length }
}

export function ownStyles(garments: Garment[], s: Settings): Style[] {
  const fav = s.favStyles ?? []
  const count = new Map<Style, number>()
  garments.forEach((g) => g.styles.forEach((st) => count.set(st, (count.get(st) ?? 0) + 1)))
  const top = [...count.entries()].sort((a, b) => b[1] - a[1]).slice(0, 2).map(([k]) => k)
  return [...new Set([...fav, ...top])]
}

export function buildNeeds(garments: Garment[], s: Settings): Need[] {
  const own = garments.filter((g) => g.status !== 'archived')
  const ctx: Ctx = {
    all: own,
    of: (...c) => own.filter((g) => c.includes(g.category)),
    colorsIn: (...c) => new Set(own.filter((g) => c.includes(g.category)).map((g) => colorName(g.color))),
  }
  const styles = ownStyles(own, s)
  const favColors = s.favColors ?? []
  const avoid = s.avoid ?? []
  const out: Need[] = []

  const sex = s.gender ?? 'homme'
  for (const t of TPL) {
    if (avoid.includes(t.cat) || (t.sex && t.sex !== sex)) continue
    const gap = t.gap(ctx)
    if (gap < 0.3) continue
    const owned = ctx.colorsIn(t.cat)
    // couleur : celle qui s'accorde le mieux avec le dressing, sans doublon de catégorie
    let best: { name: string; sc: number; p: ReturnType<typeof pairsFor> } | null = null
    t.colors.forEach((name, i) => {
      if (owned.has(name) && gap < 1) return
      if (owned.has(name) && t.cat !== 'chemise') return
      const p = pairsFor(t.cat, HEX[name], t.formality, own)
      const sc = Math.min(p.coverage, 8) + (favColors.includes(name) ? 3 : 0) - i * 0.6
      if (!best || sc > best.sc) best = { name, sc, p }
    })
    if (!best) continue
    const b = best as { name: string; sc: number; p: ReturnType<typeof pairsFor> }
    const styleHit = t.styles.filter((x) => styles.includes(x))
    const section: SelSection = t.disc ? 'decouvertes' : t.essential && gap >= 0.7 ? 'indispensables' : styleHit.length ? 'style' : 'complete'
    const dem = t.pl ? 'Ces' : t.g === 'f' ? 'Cette' : 'Ce'
    const label = CAT_BY_ID[t.cat].label.toLowerCase()
    const subject = `${dem} ${low(t.noun)} ${colorAdj(b.name, t.g, !!t.pl)}`
    const parts: string[] = []
    if (b.p.pairs.length) parts.push(`${subject} ${t.pl ? 's’accordent' : 's’accorde'} avec ${listFr(b.p.pairs.slice(0, 3).map((g) => g.name))}.`)
    else parts.push(`${subject} apporterait une base neutre à ton dressing.`)
    if (gap >= 0.7 && !t.disc) parts.push(own.length && ctx.of(t.cat).length === 0 ? `Tu n’as aucun article dans la catégorie ${label} : c’est ce qui te manque le plus.` : `Tu n’as pas encore cette base dans ton dressing.`)
    else if (styleHit.length) parts.push(`${t.pl ? 'Ils correspondent' : t.g === 'f' ? 'Elle correspond' : 'Il correspond'} à ton style ${styleHit[0]}.`)
    else if (t.disc) parts.push('Une piste pour faire évoluer ton style sans bousculer tes bases.')
    if (b.p.coverage > 0) parts.push(`Compatible avec ${b.p.coverage} de tes ${own.length} pièces.`)
    out.push({
      id: `need:${t.id}:${b.name}`, section, cat: t.cat, title: `${t.noun} ${colorAdj(b.name, t.g, !!t.pl)}`, g: t.g, pl: !!t.pl,
      colorName: b.name, color: HEX[b.name], styles: t.styles, noun: t.noun,
      why: parts.join(' ').replace(/ ?\. ?\./g, '.'), pairs: b.p.pairs, coverage: b.p.coverage,
      score: gap * 10 + styleHit.length * 2 + Math.min(b.p.coverage, 8) * 0.4 + (favColors.includes(b.name) ? 1.5 : 0),
    })
  }
  const cap: Record<SelSection, number> = { indispensables: 6, style: 6, complete: 6, decouvertes: 5 }
  const result: Need[] = []
  for (const sec of SECTIONS) result.push(...out.filter((n) => n.section === sec.id).sort((a, b) => b.score - a.score).slice(0, cap[sec.id]))
  return result
}

/** Produits du catalogue qui répondent à un besoin (catégorie identique, couleur proche, budget). */
export function matchProducts(n: Need, products: Product[], s: Settings): Product[] {
  const brands = (s.favBrands ?? []).map((b) => b.trim().toLowerCase()).filter(Boolean)
  return products
    .filter((p) => p.category === n.cat && (colorName(p.color) === n.colorName || (isNeutral(p.color) && isNeutral(n.color))) && (!s.budget || p.price <= s.budget))
    .sort((a, b) => Number(brands.includes(b.brand.toLowerCase())) - Number(brands.includes(a.brand.toLowerCase())) || a.price - b.price)
    .slice(0, 3)
}
