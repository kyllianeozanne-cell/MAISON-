import { CAT_BY_ID, slotOf, season as currentSeason } from './constants'
import { colorFamily, colorName, isNeutral, paletteHarmony } from './colors'
import { isWet } from './weather'
import { clamp, daysBetween, parseYmd, shuffle, uid, ymd } from './utils'
import type { Context, Garment, Look, Season, Slot, Weather } from '../types'

export type Tone = 'default' | 'casual' | 'smart' | 'formal' | 'oldmoney'

export interface StyleRequest {
  context: Context
  tone: Tone
  mustInclude: string[] // ids de pièces imposées
  avoidIds?: string[] // ids à éviter (ex : « une autre combinaison »)
  count?: number
  date?: Date
}

/* ---------- Chaleur (valeurs relatives) ---------- */

const BASE_WARMTH: Record<string, number> = {
  tshirt: 1, polo: 1.2, chemise: 1.3, pull: 3, sweat: 2.6,
  veste: 1.5, manteau: 3.5, blouson: 2.2,
  pantalon: 1.5, jean: 1.7, short: 0.6, costume: 3,
  chaussures: 1, baskets: 1, bottines: 1.5,
  accessoire: 0, ceinture: 0, montre: 0, sac: 0, autre: 0,
}

const MATERIAL_WARMTH: Record<string, number> = {
  lin: -0.4, laine: 0.6, cachemire: 0.7, flanelle: 0.4, velours: 0.3, soie: -0.1,
  denim: 0.2, cuir: 0.3, daim: 0.2, maille: 0.4, coton: 0, polyester: 0,
}

export function warmthOf(g: Garment): number {
  const base = BASE_WARMTH[g.category] ?? 0
  if (base === 0) return 0
  return Math.max(0.2, base + (MATERIAL_WARMTH[g.material.toLowerCase()] ?? 0))
}

export function targetWarmth(feels: number): number {
  return 2.4 + Math.max(0, 26 - feels) * 0.33
}

/* ---------- Disponibilité & saisons ---------- */

export function usable(garments: Garment[]): Garment[] {
  return garments.filter((g) => g.status === 'available')
}

function seasonFit(g: Garment, s: Season): number {
  if (g.seasons.length === 0 || g.seasons.length === 4) return 1
  if (g.seasons.includes(s)) return 1
  // saisons voisines : pénalité douce
  const order: Season[] = ['hiver', 'printemps', 'ete', 'automne']
  const i = order.indexOf(s)
  const neighbours = [order[(i + 1) % 4], order[(i + 3) % 4]]
  return g.seasons.some((x) => neighbours.includes(x)) ? 0.6 : 0.2
}

function formalityTarget(ctx: Context, tone: Tone): number {
  const base: Record<Context, number> = {
    quotidien: 2.6, travail: 3.8, 'rendez-vous': 3.6, soiree: 4, weekend: 2.2, vacances: 2.2,
  }
  let t = base[ctx]
  if (tone === 'casual') t = Math.min(t, 2.4) - 0.4
  if (tone === 'smart') t = 3.3
  if (tone === 'formal') t = Math.max(t, 4.4)
  if (tone === 'oldmoney') t = Math.max(3.4, Math.min(t, 4))
  return t
}

/* ---------- Candidats ---------- */

interface Candidate {
  items: Garment[]
  score: number
  weatherScore: number
}

function bySlot(garments: Garment[]): Record<Slot, Garment[]> {
  const m: Record<Slot, Garment[]> = { top: [], bottom: [], outer: [], shoes: [], accessory: [], suit: [] }
  for (const g of garments) m[slotOf(g.category)].push(g)
  return m
}

function recencyDays(g: Garment, today: Date): number {
  if (g.wornDates.length === 0) return 999
  const last = g.wornDates.reduce((a, b) => (a > b ? a : b))
  return daysBetween(parseYmd(last), today)
}

function scoreCandidate(items: Garment[], w: Weather | null, req: StyleRequest, today: Date): Candidate {
  const s = currentSeason(today)
  const feels = w ? Math.min(w.feels, (w.feels + w.min + 2) / 2 + 1) : null // un peu de poids à la fraîcheur du matin
  const body = items.filter((g) => slotOf(g.category) !== 'accessory')

  // 1) Météo
  let weatherScore = 1
  const total = body.reduce((a, g) => a + warmthOf(g), 0)
  if (feels !== null) {
    const diff = total - targetWarmth(feels)
    weatherScore -= clamp(Math.abs(diff) / 5, 0, 0.8)
    const hasOuter = items.some((g) => slotOf(g.category) === 'outer' || g.category === 'costume')
    if (feels < 14 && !hasOuter) weatherScore -= 0.3
    if (feels >= 24 && items.some((g) => slotOf(g.category) === 'outer')) weatherScore -= 0.25
    if (feels < 17 && items.some((g) => g.category === 'short')) weatherScore -= 0.6
    if (feels < 8 && items.some((g) => g.category === 'manteau')) weatherScore += 0.1
    if (feels < 12 && items.some((g) => g.category === 'tshirt') && !items.some((g) => g.category === 'pull' || g.category === 'sweat' || slotOf(g.category) === 'outer')) weatherScore -= 0.3
    if (isWet(w)) {
      const shoes = items.find((g) => slotOf(g.category) === 'shoes')
      if (shoes) {
        const mat = shoes.material.toLowerCase()
        if (mat === 'daim' || mat === 'lin') weatherScore -= 0.35
        else if (shoes.category === 'baskets' && isNeutral(shoes.color) && shoes.color.toLowerCase() > '#d0d0d0') weatherScore -= 0.15
        else if (shoes.category === 'bottines' || mat === 'cuir') weatherScore += 0.05
      }
      const outer = items.find((g) => slotOf(g.category) === 'outer')
      if (!outer) weatherScore -= 0.15
      else if (outer.category === 'blouson' || outer.category === 'manteau') weatherScore += 0.05
    }
  }
  weatherScore = clamp(weatherScore, 0, 1)

  // 2) Formalité (cohérence + cible)
  const fs = body.map((g) => g.formality)
  const fAvg = fs.reduce((a, b) => a + b, 0) / Math.max(1, fs.length)
  const fSpread = Math.max(...fs) - Math.min(...fs)
  const target = formalityTarget(req.context, req.tone)
  const formalityScore = clamp(1 - Math.abs(fAvg - target) / 3 - Math.max(0, fSpread - 1) * 0.15, 0, 1)

  // 3) Couleurs
  const colorItems = body.map((g) => g.color)
  let colorScore = paletteHarmony(colorItems)
  if (req.tone === 'oldmoney') {
    const ok = colorItems.filter((c) => isNeutral(c) || colorFamily(c) === 'earth' || /^#(1|2)[0-9a-f]/i.test(c)).length
    colorScore = colorScore * 0.7 + (ok / colorItems.length) * 0.3
  }

  // 4) Saison + style
  const seasonScore = body.reduce((a, g) => a + seasonFit(g, s), 0) / Math.max(1, body.length)
  let styleScore = 0.7
  const wantStyle = req.tone === 'oldmoney' ? ['old money', 'classique']
    : req.tone === 'casual' ? ['casual', 'streetwear', 'sportif']
    : req.tone === 'smart' ? ['classique', 'casual', 'business']
    : req.tone === 'formal' ? ['business', 'classique', 'soiree']
    : req.context === 'travail' ? ['business', 'classique']
    : req.context === 'soiree' || req.context === 'rendez-vous' ? ['soiree', 'classique', 'old money']
    : []
  if (wantStyle.length) {
    const hits = body.filter((g) => g.styles.some((x) => wantStyle.includes(x))).length
    styleScore = 0.4 + 0.6 * (hits / body.length)
  }

  // 5) Rotation : on remet en lumière les pièces oubliées, on évite les ports récents
  let rotation = 0.5
  const days = body.map((g) => recencyDays(g, today))
  const tooRecent = days.filter((d) => d <= 1).length
  const forgotten = days.filter((d) => d >= 30).length
  rotation += forgotten * 0.1 - tooRecent * 0.25
  // les pièces portées souvent (donc aimées) restent légèrement favorisées
  const favs = body.filter((g) => g.wornDates.length >= 5).length
  rotation += favs * 0.04
  rotation = clamp(rotation, 0, 1)

  // 6) « Une autre combinaison »
  let novelty = 1
  if (req.avoidIds?.length) {
    const overlap = items.filter((g) => req.avoidIds!.includes(g.id)).length
    novelty = 1 - overlap / Math.max(1, items.length)
  }

  const score =
    weatherScore * 0.3 + colorScore * 0.24 + formalityScore * 0.2 + seasonScore * 0.1 +
    styleScore * 0.08 + rotation * 0.08
  return { items, score: score * (0.6 + 0.4 * novelty), weatherScore }
}

export function buildCandidates(garments: Garment[], w: Weather | null, req: StyleRequest, tries = 500): Candidate[] {
  const pool = usable(garments)
  const slots = bySlot(pool)
  const today = req.date ?? new Date()
  const must = pool.filter((g) => req.mustInclude.includes(g.id))
  const mustBySlot = bySlot(must)

  const feels = w?.feels ?? 18
  const wantOuter = feels < 15 || (feels < 19 && (isWet(w) || req.context === 'travail' || req.context === 'soiree'))
  const allowOuter = feels < 24 || req.context === 'soiree' || req.context === 'travail'

  const out = new Map<string, Candidate>()
  const pickFrom = (slot: Slot): Garment | undefined => {
    if (mustBySlot[slot].length) return mustBySlot[slot][0]
    const list = slots[slot]
    return list.length ? list[Math.floor(Math.random() * list.length)] : undefined
  }

  for (let i = 0; i < tries; i++) {
    const useSuit = slots.suit.length > 0 && (mustBySlot.suit.length > 0 || (Math.random() < 0.18 && req.context !== 'weekend' && req.context !== 'vacances'))
    let items: (Garment | undefined)[] = []
    if (useSuit && !mustBySlot.top.length && !mustBySlot.bottom.length) {
      const suit = pickFrom('suit')
      const shirt = pickFrom('top')
      const shoes = pickFrom('shoes')
      items = [suit, shirt, shoes]
    } else {
      const top = pickFrom('top')
      const bottom = pickFrom('bottom')
      const shoes = pickFrom('shoes')
      let outer: Garment | undefined
      if (mustBySlot.outer.length) outer = mustBySlot.outer[0]
      else if (allowOuter && slots.outer.length && (wantOuter || Math.random() < 0.35)) outer = pickFrom('outer')
      items = [top, bottom, outer, shoes]
    }
    // accessoire facultatif (une montre ou une ceinture de préférence)
    if (slots.accessory.length && Math.random() < 0.55) {
      const acc = mustBySlot.accessory[0] ?? slots.accessory[Math.floor(Math.random() * slots.accessory.length)]
      items.push(acc)
    }
    const clean = items.filter((x): x is Garment => !!x)
    const hasBody = clean.some((g) => slotOf(g.category) === 'suit') || (clean.some((g) => slotOf(g.category) === 'top') && clean.some((g) => slotOf(g.category) === 'bottom'))
    if (!hasBody) continue
    // toutes les pièces imposées doivent être présentes
    if (must.some((m) => !clean.some((c) => c.id === m.id))) {
      for (const m of must) if (!clean.some((c) => c.id === m.id)) clean.push(m)
    }
    const key = clean.map((g) => g.id).sort().join('|')
    if (out.has(key)) continue
    out.set(key, scoreCandidate(clean, w, req, today))
  }
  return [...out.values()].sort((a, b) => b.score - a.score)
}

/* ---------- Explication ---------- */

function listFr(parts: string[]): string {
  if (parts.length <= 1) return parts.join('')
  return parts.slice(0, -1).join(', ') + ' et ' + parts[parts.length - 1]
}

export function explain(items: Garment[], w: Weather | null, req: StyleRequest): string {
  const body = items.filter((g) => slotOf(g.category) !== 'accessory')
  const colors = body.map((g) => g.color)
  const sentences: string[] = []

  const allCalm = colors.every((c) => isNeutral(c) || colorFamily(c) === 'earth')
  const navy = body.find((g) => /marine/i.test(colorName(g.color)))
  const sand = body.find((g) => ['Beige', 'Écru', 'Camel'].includes(colorName(g.color)))
  if (navy && sand) sentences.push(`Le ${colorName(navy.color).toLowerCase()} et le ${colorName(sand.color).toLowerCase()} forment une association de référence.`)
  else if (allCalm) sentences.push('Les tons neutres et naturels fonctionnent particulièrement bien ensemble.')
  else sentences.push('Les couleurs restent sobres et se répondent avec justesse.')

  const fAvg = body.reduce((a, g) => a + g.formality, 0) / Math.max(1, body.length)
  if (req.tone === 'oldmoney') sentences.push('Une silhouette intemporelle, dans l’esprit old money.')
  else if (fAvg >= 4.2) sentences.push('Une tenue habillée, précise et structurée.')
  else if (fAvg >= 3.2) sentences.push('Une silhouette élégante sans être trop habillée.')
  else if (fAvg >= 2.3) sentences.push('Un style décontracté mais soigné.')
  else sentences.push('Une allure détendue, pensée pour le confort.')

  if (w) {
    const f = w.feels
    const day = f < 6 ? 'une journée froide' : f < 13 ? 'une journée fraîche' : f < 19 ? 'une journée douce' : f < 25 ? 'une journée agréable' : 'une journée chaude'
    const sun = w.code <= 2 && w.isDay ? ' et ensoleillée' : ''
    const rain = isWet(w) ? ', avec un risque de pluie pris en compte dans le choix des chaussures' : ''
    sentences.push(`Idéale pour ${day}${sun} (${w.feels}° ressentis)${rain}.`)
  }

  const today = req.date ?? new Date()
  const forgotten = body
    .map((g) => ({ g, d: recencyDays(g, today) }))
    .filter((x) => x.d >= 30)
    .sort((a, b) => b.d - a.d)[0]
  if (forgotten) {
    sentences.push(
      forgotten.d >= 999
        ? `Elle fait découvrir « ${forgotten.g.name} », encore jamais portée.`
        : `Elle remet en lumière « ${forgotten.g.name} », non portée depuis ${forgotten.d} jours.`,
    )
  }
  return sentences.join(' ')
}

/* ---------- API publique ---------- */

export function weatherCompat(items: Garment[], w: Weather | null, req: StyleRequest): number {
  if (!w) return 0
  const c = scoreCandidate(items, w, req, req.date ?? new Date())
  return Math.round(c.weatherScore * 100)
}

export function suggest(garments: Garment[], w: Weather | null, req: StyleRequest): Look[] {
  const cands = buildCandidates(garments, w, req)
  const count = req.count ?? 1
  const picked: Candidate[] = []
  for (const c of cands) {
    // diversité : on évite des tenues qui partagent trop de pièces avec celles déjà retenues
    const tooClose = picked.some((p) => c.items.filter((g) => p.items.some((q) => q.id === g.id)).length >= Math.max(2, c.items.length - 1))
    if (!tooClose) picked.push(c)
    if (picked.length >= count) break
  }
  return picked.map((c) => ({
    id: uid(),
    title: '',
    itemIds: c.items.map((g) => g.id),
    reason: explain(c.items, w, req),
    score: Math.round(c.weatherScore * 100),
    context: req.context,
  }))
}

/** Ce qui manque au dressing pour composer une tenue. */
export function missingForOutfit(garments: Garment[]): string[] {
  const s = bySlot(usable(garments))
  const missing: string[] = []
  if (!s.suit.length) {
    if (!s.top.length) missing.push('un haut (t-shirt, chemise, pull…)')
    if (!s.bottom.length) missing.push('un bas (pantalon, jean, short…)')
  }
  return missing
}

/* ---------- Sélections nommées pour l'accueil ---------- */

export function homeSelections(garments: Garment[], w: Weather | null): Look[] {
  const defs: { title: string; req: StyleRequest }[] = [
    { title: 'Today’s outfit', req: { context: 'quotidien', tone: 'default', mustInclude: [] } },
    { title: 'Old Money Look', req: { context: 'rendez-vous', tone: 'oldmoney', mustInclude: [] } },
    { title: 'Casual Elegance', req: { context: 'quotidien', tone: 'smart', mustInclude: [] } },
    { title: 'Evening Selection', req: { context: 'soiree', tone: 'formal', mustInclude: [] } },
    { title: 'Weekend Outfit', req: { context: 'weekend', tone: 'casual', mustInclude: [] } },
  ]
  const used: string[] = []
  const looks: Look[] = []
  for (const d of defs) {
    const req = { ...d.req, avoidIds: used.slice(-6) }
    const l = suggest(garments, w, req)[0]
    if (!l) continue
    used.push(...l.itemIds)
    looks.push({ ...l, title: d.title })
  }
  return looks
}

/* ---------- Compréhension de la demande (mode local, sans IA) ---------- */

export interface ParsedIntent {
  context: Context
  tone: Tone
  mustInclude: string[]
  label: string
}

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

export function parseIntent(text: string, garments: Garment[]): ParsedIntent {
  const t = norm(text)
  let context: Context = 'quotidien'
  let tone: Tone = 'default'
  let label = 'Today’s selection'

  if (/rendez|date\b|diner en amoureux/.test(t)) { context = 'rendez-vous'; label = 'Rendez-vous' }
  else if (/travail|bureau|boulot|reunion|entretien|client/.test(t)) { context = 'travail'; label = 'Au travail' }
  else if (/soiree|diner|sortie|resto|restaurant|bar\b|club/.test(t)) { context = 'soiree'; label = 'Soirée' }
  else if (/week-?end/.test(t)) { context = 'weekend'; label = 'Week-end' }
  else if (/vacances|voyage|plage/.test(t)) { context = 'vacances'; label = 'Vacances' }

  if (/old money|vieille fortune/.test(t)) { tone = 'oldmoney'; label = 'Old Money' }
  else if (/sans etre trop habille|smart casual|chic decontract|elegant sans/.test(t)) { tone = 'smart'; label = 'Casual Elegance' }
  else if (/decontract|casual|relax|cool|simple|confort/.test(t)) { tone = 'casual'; label = 'Plus décontracté' }
  else if (/formel|habille|ceremonie|mariage|costume|chic/.test(t)) { tone = 'formal'; label = 'Tenue habillée' }

  // « que porter avec ce pantalon / ma chemise bleue »
  const mustInclude: string[] = []
  const avec = t.match(/avec (?:ce |cet |cette |mon |ma |mes |le |la |les |l')?(.+?)(?:\?|$|\.|,)/)
  if (avec) {
    const q = avec[1].trim()
    const words = q.split(/\s+/).filter((x) => x.length > 2)
    const scored = garments
      .filter((g) => g.status !== 'archived')
      .map((g) => {
        const hay = norm(`${g.name} ${CAT_BY_ID[g.category].label} ${g.brand} ${colorName(g.color)} ${g.material}`)
        const hits = words.filter((w) => hay.includes(w.replace(/s$/, ''))).length
        return { g, hits }
      })
      .filter((x) => x.hits > 0)
      .sort((a, b) => b.hits - a.hits)
    if (scored[0]) {
      mustInclude.push(scored[0].g.id)
      label = `Avec ${scored[0].g.name}`
    }
  }
  return { context, tone, mustInclude, label }
}

export const todayStr = () => ymd()
export { shuffle }
