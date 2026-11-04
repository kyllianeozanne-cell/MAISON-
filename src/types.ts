export type CategoryId =
  | 'tshirt' | 'polo' | 'chemise' | 'pull' | 'sweat'
  | 'veste' | 'manteau' | 'blouson'
  | 'pantalon' | 'jean' | 'short' | 'costume'
  | 'chaussures' | 'baskets' | 'bottines'
  | 'accessoire' | 'ceinture' | 'montre' | 'sac' | 'autre'

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
  wornDates: string[]
  status: Status
  favorite?: boolean
  createdAt: number
}

export interface Fit {
  x: number
  y: number
  s: number
  r?: number
}

export interface Outfit {
  id: string
  name: string
  itemIds: string[]
  favorite: boolean
  context: Context | ''
  note: string
  fit?: Record<string, Fit>
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

export interface AvatarConfig {
  height: number // cm 150-205
  build: number // 0 (fin) -> 1 (large)
  shoulders: number // 0..1
  waist: number // 0..1
  legs: number // 0..1 (longueur relative)
  skin: string
  hair: 'none' | 'short' | 'medium' | 'long' | 'wavy'
  hairColor: string
  beard: 'none' | 'stubble' | 'short' | 'full'
  underwear: 'beige' | 'noir'
  photo: string // photo en pied (data URL), stockée sur l'appareil
  fit: Record<string, Fit>
  neck?: number // ligne du cou (fraction de la hauteur de la photo)
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
