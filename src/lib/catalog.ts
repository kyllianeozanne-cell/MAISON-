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

/** Recherches chez des marchands : de vrais liens de recherche, pas des fiches produits. */
export const MERCHANTS: { id: string; label: string; url: (q: string) => string }[] = [
  { id: 'zalando', label: 'Zalando', url: (q) => `https://www.zalando.fr/catalogue/?q=${encodeURIComponent(q)}` },
  { id: 'asos', label: 'ASOS', url: (q) => `https://www.asos.com/fr/search/?q=${encodeURIComponent(q)}` },
  { id: 'redoute', label: 'La Redoute', url: (q) => `https://www.laredoute.fr/psrch/psrch.aspx?kwd=${encodeURIComponent(q)}` },
]
