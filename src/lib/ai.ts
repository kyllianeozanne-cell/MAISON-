import { CAT_BY_ID } from './constants'
import { colorName } from './colors'
import { usable } from './stylist'
import { supabase } from './supabase'
import type { Garment, Weather } from '../types'

export interface AiAnswer {
  message: string
  title: string
  itemIds: string[]
}

/** L'IA n'est disponible que si une fonction serveur est configurée. */
export const aiConfigured = Boolean(import.meta.env.VITE_AI_FUNCTION_URL || supabase)

/**
 * Envoie une demande au styliste IA hébergé côté serveur (Supabase Edge Function).
 * La clé de l'API d'IA ne quitte jamais le serveur : le client n'envoie que le
 * dressing (sans photos) et la météo. Les identifiants renvoyés sont ensuite
 * validés ici : toute pièce qui n'existe pas dans le dressing est écartée.
 */
export async function askStylist(
  message: string,
  garments: Garment[],
  weather: Weather | null,
  history: { role: 'user' | 'assistant'; content: string }[],
): Promise<AiAnswer> {
  const available = usable(garments)
  const compact = available.map((g) => ({
    id: g.id,
    name: g.name,
    category: CAT_BY_ID[g.category].label,
    color: colorName(g.color),
    material: g.material,
    seasons: g.seasons,
    styles: g.styles,
    formality: g.formality,
    worn: g.wornDates.length,
    lastWorn: g.wornDates.length ? g.wornDates.reduce((a, b) => (a > b ? a : b)) : null,
  }))

  const body = {
    message,
    history: history.slice(-8),
    wardrobe: compact,
    weather: weather
      ? { temp: weather.temp, feels: weather.feels, label: weather.label, rainProb: weather.rainProb, wind: weather.wind, min: weather.min, max: weather.max }
      : null,
    date: new Date().toISOString().slice(0, 10),
  }

  let data: unknown
  const url = import.meta.env.VITE_AI_FUNCTION_URL as string | undefined
  if (url) {
    const session = supabase ? (await supabase.auth.getSession()).data.session : null
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}),
      },
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error(`Styliste IA indisponible (${res.status})`)
    data = await res.json()
  } else if (supabase) {
    const { data: d, error } = await supabase.functions.invoke('stylist', { body })
    if (error) throw new Error(error.message)
    data = d
  } else {
    throw new Error('Styliste IA non configuré')
  }

  const a = data as Partial<AiAnswer>
  const valid = new Set(available.map((g) => g.id))
  const itemIds = (a.itemIds ?? []).filter((id) => valid.has(id))
  return {
    message: String(a.message ?? '').trim() || 'Voici ma sélection.',
    title: String(a.title ?? 'Sélection du styliste'),
    itemIds,
  }
}
