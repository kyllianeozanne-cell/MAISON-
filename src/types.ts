export type CategoryId =
  | 'tshirt' | 'polo' | 'chemise' | 'pull' | 'sweat'
  | 'veste' | 'manteau' | 'blouson'
  | 'pantalon' | 'jean' | 'short' | 'costume'
  | 'chaussures' | 'baskets' | 'bottines'
  | 'accessoire' | 'ceinture' | 'montre' | 'sac' | 'autre'
  | 'blouse' | 'robe' | 'jupe' | 'combinaison' | 'ensemble' | 'escarpins' | 'ballerines'

export type Gender = 'homme' | 'femme'

export type Slot = 'top' | 'bottom' | 'outer' | 'shoes' | 'accessory' | 'suit'

export type Season = 'printemps' | 'ete' | 'automne' | 'hiver'
export type Style = 'classique' | 'old money' | 'casual' | 'streetwear' | 'sportif' | 'business' | 'soiree'
export type Status = 'available' | 'laundry' | 'archived'
export type Context = 'quotidien' | 'travail' | 'rendez-vous' | 'soiree' | 'weekend' | 'vacances'

export interface Garment {
  id: string
  name: string
  category: CategoryId
  subcategory: string
  brand: string
  color: string // hex principal
  secondaryColors: string[]
  material: string
  size: string
  seasons: Season[]
  styles: Style[]
  formality: 1 | 2 | 3 | 4 | 5
  purchaseDate: string // YYYY-MM-DD ou ''
  price: number | null
  notes: string
  photo: string // data URL (peut être vide)
  original?: string // photo d'origine, conservée pour pouvoir re-détourer
  wornDates: string[]
  status: Status
  favorite?: boolean
  createdAt: number
}

export interface Outfit {
  id: string
  name: string
  itemIds: string[]
  favorite: boolean
  context: Context | ''
  note: string
  createdAt: number
}

export interface CalendarEntry {
  date: string // YYYY-MM-DD
  itemIds: string[]
  planned: boolean
  outfitId?: string
  note?: string
}

export interface WishItem {
  id: string
  name: string
  brand: string
  category: CategoryId
  color: string
  price: number | null
  url: string
  note: string
  createdAt: number
}

export interface Capsule {
  id: string
  name: string
  itemIds: string[]
}

export interface GeoPoint {
  lat: number
  lon: number
  label: string
}

export interface Settings {
  name: string
  location: GeoPoint | null
  notifications: boolean
  aiEnabled: boolean
  favStyles?: Style[]
  favColors?: string[]
  sizes?: { top: string; bottom: string; shoes: string }
  photo?: string
  aiKey?: string
  favContexts?: Context[]
  avoid?: CategoryId[]
  layers?: boolean
  favBrands?: string[]
  lastBackup?: string
  gender?: Gender
  budget?: number | null
}

export interface Weather {
  temp: number
  feels: number
  code: number
  label: string
  rainProb: number
  wind: number
  isDay: boolean
  hourly: { time: string; temp: number; rain: number }[]
  min: number
  max: number
  fetchedAt: number
}

export interface Look {
  id: string
  title: string
  itemIds: string[]
  reason: string
  score: number // 0..100 compat météo
  harmony?: number // 0..100 harmonie des couleurs
  match?: number // 0..100 score global
  context: Context
}
