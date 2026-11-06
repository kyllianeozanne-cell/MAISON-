import { useEffect, useState } from 'react'
import { CAT_BY_ID } from './constants'
import type { CategoryId, Style } from '../types'

/**
 * Catalogue produits : fichier statique `public/catalog.json` (aucune API commerciale n'est branchée).
 * Chaque produit doit provenir d'une fiche marchande réelle : prix, image et lien vérifiables.
 * Une entrée invalide est ignorée plutôt qu'affichée.
 *
 * {
 *   "id": "sandro-mocassins-001", "name": "Mocassins en cuir", "brand": "Sandro", "price": 245,
 *   "category": "chaussures", "color": "#5e4331", "styles": ["classique"],
 *   "image": "https://…/photo.jpg", "url": "https://…/fiche-produit", "merchant": "Sandro",
 *   "checkedAt": "2026-11-04"
 * }
 */
export interface Product {
  id: string
  name: string
  brand: string
  price: number
  category: CategoryId
  color: string
  styles: Style[]
  image: string
  url: string
  merchant: string
  checkedAt: string
}

const https = (u: unknown): u is string => typeof u === 'string' && /^https:\/\/[^\s]+$/.test(u)

export function validProduct(p: Partial<Product>): p is Product {
  return (
    typeof p.id === 'string' && !!p.id && typeof p.name === 'string' && !!p.name && typeof p.brand === 'string' &&
    typeof p.price === 'number' && p.price > 0 && !!p.category && p.category in CAT_BY_ID &&
    typeof p.color === 'string' && /^#[0-9a-f]{6}$/i.test(p.color) && https(p.image) && https(p.url) &&
    typeof p.merchant === 'string' && typeof p.checkedAt === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(p.checkedAt)
  )
}

let cache: Product[] | null = null
let inflight: Promise<Product[]> | null = null

async function loadCatalog(): Promise<Product[]> {
  if (cache) return cache
  inflight ??= fetch(`${import.meta.env.BASE_URL}catalog.json`, { cache: 'no-cache' })
    .then((r) => (r.ok ? r.json() : { products: [] }))
    .then((j: { products?: Partial<Product>[] }) => (cache = (j.products ?? []).filter(validProduct).map((p) => ({ ...p, styles: p.styles ?? [] }))))
    .catch(() => (cache = []))
  return inflight
}

export function useCatalog(): { products: Product[]; ready: boolean } {
  const [products, setProducts] = useState<Product[]>(cache ?? [])
  const [ready, setReady] = useState(cache !== null)
  useEffect(() => {
    let alive = true
    loadCatalog().then((p) => { if (alive) { setProducts(p); setReady(true) } })
    return () => { alive = false }
  }, [])
  return { products, ready }
}

/** Recherches : liens de recherche réels (pas des fiches produits). `images` ouvre Google Images limité au site de la marque. */
export const MERCHANTS: { id: string; label: string; url?: (q: string) => string; site: string }[] = [
  { id: 'zara', label: 'Zara', site: 'zara.com', url: (q) => `https://www.zara.com/fr/fr/search?searchTerm=${encodeURIComponent(q)}` },
  { id: 'hm', label: 'H&M', site: 'hm.com', url: (q) => `https://www2.hm.com/fr_fr/search-results.html?q=${encodeURIComponent(q)}` },
  { id: 'kiabi', label: 'Kiabi', site: 'kiabi.com' },
  { id: 'newyorker', label: 'New Yorker', site: 'newyorker.fr' },
  { id: 'zalando', label: 'Zalando', site: 'zalando.fr', url: (q) => `https://www.zalando.fr/catalogue/?q=${encodeURIComponent(q)}` },
  { id: 'asos', label: 'ASOS', site: 'asos.com', url: (q) => `https://www.asos.com/fr/search/?q=${encodeURIComponent(q)}` },
  { id: 'redoute', label: 'La Redoute', site: 'laredoute.fr', url: (q) => `https://www.laredoute.fr/psrch/psrch.aspx?kwd=${encodeURIComponent(q)}` },
]

export const imagesUrl = (q: string, site?: string) => `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(site ? `site:${site} ${q}` : q)}`

/** Marques réelles à regarder selon le style (inspiration, pas des produits). */
export const BRANDS: Record<string, { homme: string[]; femme: string[] }> = {
  classique: { homme: ['Massimo Dutti', 'Zara', 'Celio', 'Jules'], femme: ['Massimo Dutti', 'Mango', 'Sézane', 'Zara'] },
  'old money': { homme: ['Ralph Lauren', 'Brooks Brothers', 'Massimo Dutti', 'Lacoste'], femme: ['Ralph Lauren', 'Massimo Dutti', 'Sézane', 'Max Mara'] },
  casual: { homme: ['Uniqlo', 'H&M', 'Kiabi', 'Jules'], femme: ['Uniqlo', 'H&M', 'Kiabi', 'Zara'] },
  streetwear: { homme: ['Nike', 'Carhartt WIP', 'Zara', 'New Yorker'], femme: ['Nike', 'Pull&Bear', 'Bershka', 'New Yorker'] },
  sportif: { homme: ['Nike', 'Adidas', 'Decathlon', 'New Balance'], femme: ['Nike', 'Adidas', 'Decathlon', 'New Balance'] },
  business: { homme: ['Hugo Boss', 'Celio', 'Jules', 'Massimo Dutti'], femme: ['Mango', 'Zara', 'Hugo Boss', 'Morgan'] },
  soiree: { homme: ['Zara', 'Hugo Boss', 'Sandro', 'Massimo Dutti'], femme: ['Zara', 'Mango', 'Sandro', 'Maje'] },
}
