import type { CategoryId, Context, Season, Slot, Style } from '../types'

export const CATEGORIES: { id: CategoryId; label: string; slot: Slot }[] = [
  { id: 'tshirt', label: 'T-shirts', slot: 'top' },
  { id: 'polo', label: 'Polos', slot: 'top' },
  { id: 'chemise', label: 'Chemises', slot: 'top' },
  { id: 'pull', label: 'Pulls', slot: 'top' },
  { id: 'sweat', label: 'Sweats', slot: 'top' },
  { id: 'veste', label: 'Vestes', slot: 'outer' },
  { id: 'manteau', label: 'Manteaux', slot: 'outer' },
  { id: 'blouson', label: 'Blousons', slot: 'outer' },
  { id: 'pantalon', label: 'Pantalons', slot: 'bottom' },
  { id: 'jean', label: 'Jeans', slot: 'bottom' },
  { id: 'short', label: 'Shorts', slot: 'bottom' },
  { id: 'costume', label: 'Costumes', slot: 'suit' },
  { id: 'chaussures', label: 'Chaussures', slot: 'shoes' },
  { id: 'baskets', label: 'Baskets', slot: 'shoes' },
  { id: 'bottines', label: 'Bottines', slot: 'shoes' },
  { id: 'accessoire', label: 'Accessoires', slot: 'accessory' },
  { id: 'ceinture', label: 'Ceintures', slot: 'accessory' },
  { id: 'montre', label: 'Montres', slot: 'accessory' },
  { id: 'sac', label: 'Sacs', slot: 'accessory' },
  { id: 'autre', label: 'Autres', slot: 'accessory' },
]

export const CAT_BY_ID = Object.fromEntries(CATEGORIES.map((c) => [c.id, c])) as Record<
  CategoryId,
  (typeof CATEGORIES)[number]
>

export const slotOf = (c: CategoryId): Slot => CAT_BY_ID[c].slot

export const SLOT_LABEL: Record<Slot, string> = {
  top: 'Haut',
  bottom: 'Bas',
  outer: 'Veste / Manteau',
  shoes: 'Chaussures',
  accessory: 'Accessoires',
  suit: 'Costume',
}

export const SEASONS: { id: Season; label: string }[] = [
  { id: 'printemps', label: 'Printemps' },
  { id: 'ete', label: 'Été' },
  { id: 'automne', label: 'Automne' },
  { id: 'hiver', label: 'Hiver' },
]

export const STYLES: Style[] = ['classique', 'old money', 'casual', 'streetwear', 'sportif', 'business', 'soiree']

export const CONTEXTS: { id: Context; label: string }[] = [
  { id: 'quotidien', label: 'Quotidien' },
  { id: 'travail', label: 'Travail' },
  { id: 'rendez-vous', label: 'Rendez-vous' },
  { id: 'soiree', label: 'Soirée' },
  { id: 'weekend', label: 'Week-end' },
  { id: 'vacances', label: 'Vacances' },
]

export const MATERIALS = [
  'Coton', 'Lin', 'Laine', 'Cachemire', 'Soie', 'Denim', 'Cuir', 'Daim',
  'Polyester', 'Maille', 'Flanelle', 'Velours', 'Synthétique', 'Autre',
]

export const FORMALITY_LABEL = ['', 'Très décontracté', 'Décontracté', 'Smart casual', 'Habillé', 'Formel']

export const SKIN_TONES = ['#f1d3b8', '#e6b995', '#c98f65', '#9a6642', '#6b4529', '#43291a']
export const HAIR_COLORS = ['#14100d', '#3a2a1e', '#6b4a2f', '#a07a4c', '#c8b08a', '#8a8a8a', '#d8d4cc']

export function season(date = new Date()): Season {
  const m = date.getMonth() + 1
  if (m >= 3 && m <= 5) return 'printemps'
  if (m >= 6 && m <= 8) return 'ete'
  if (m >= 9 && m <= 11) return 'automne'
  return 'hiver'
}
