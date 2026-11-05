import { CAT_BY_ID } from './constants'
import { colorName } from './colors'
import { usable } from './stylist'
import { supabase } from './supabase'
import type { Garment, Settings, Weather } from '../types'

export interface AiAnswer { message: string; title: string; itemIds: string[] }

export const serverConfigured = Boolean(import.meta.env.VITE_AI_FUNCTION_URL || supabase)

/** « direct » : clé personnelle de l'utilisateur (stockée sur l'appareil) ; « server » : fonction serveur ; null : moteur local. */
export function aiMode(s: { aiEnabled: boolean; aiKey?: string }): 'direct' | 'server' | null {
  if (!s.aiEnabled) return null
  if (s.aiKey) return 'direct'
  return serverConfigured ? 'server' : null
}

const SYSTEM =
  'Tu es le styliste personnel d’un homme au goût sûr. Tu composes des tenues UNIQUEMENT avec les pièces de la liste fournie, en utilisant leurs identifiants exacts. ' +
  'N’invente aucune pièce. Tiens compte de la météo, de la saison, des couleurs, de la formalité, des préférences et des pièces peu portées. ' +
  'Réponds uniquement par un JSON strict : {"title": string, "message": string (2 à 3 phrases en français qui expliquent les associations), "itemIds": string[]} ' +
  'avec un haut, un bas (ou un costume), des chaussures, éventuellement une veste et un accessoire.'

interface Opts { apiKey?: string; prefs?: Settings; mustInclude?: string[]; avoid?: string[] }

export async function askStylist(
  message: string,
  garments: Garment[],
  weather: Weather | null,
  history: { role: 'user' | 'assistant'; content: string }[],
  opts: Opts = {},
): Promise<AiAnswer> {
  const available = usable(garments)
  const wardrobe = available.map((g) => ({
    id: g.id, name: g.name, category: CAT_BY_ID[g.category].label, color: colorName(g.color), material: g.material,
    seasons: g.seasons, styles: g.styles, formality: g.formality, worn: g.wornDates.length,
    lastWorn: g.wornDates.length ? g.wornDates.reduce((a, b) => (a > b ? a : b)) : null,
  }))
  const w = weather ? { temp: weather.temp, feels: weather.feels, label: weather.label, rainProb: weather.rainProb, wind: weather.wind, min: weather.min, max: weather.max } : null
  const p = opts.prefs
  const prefs = p ? { styles: p.favStyles ?? [], colors: p.favColors ?? [], occasions: p.favContexts ?? [], evite: p.avoid ?? [], superpositions: p.layers ?? false } : null
  const date = new Date().toISOString().slice(0, 10)

  let data: unknown
  if (opts.apiKey) {
    const content =
      `Date: ${date}\nMétéo: ${JSON.stringify(w)}\nPréférences: ${JSON.stringify(prefs)}\nDressing: ${JSON.stringify(wardrobe)}\n` +
      (opts.mustInclude?.length ? `Pièces à inclure (ids): ${JSON.stringify(opts.mustInclude)}\n` : '') +
      (opts.avoid?.length ? `Évite de reprendre ces pièces (ids): ${JSON.stringify(opts.avoid)}\n` : '') +
      `Demande: ${message}`
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': opts.apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({ model: 'claude-haiku-5-5', max_tokens: 700, system: SYSTEM, messages: [{ role: 'user', content }] }),
    })
    if (!res.ok) throw new Error(`IA indisponible (${res.status})`)
    const j = (await res.json()) as { content?: { text?: string }[] }
    const text = j.content?.[0]?.text ?? ''
    data = JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1))
  } else {
    const body = { message, history: history.slice(-8), wardrobe, weather: w, prefs, date }
    const url = import.meta.env.VITE_AI_FUNCTION_URL as string | undefined
    if (url) {
      const session = supabase ? (await supabase.auth.getSession()).data.session : null
      const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}) }, body: JSON.stringify(body) })
      if (!res.ok) throw new Error(`Styliste IA indisponible (${res.status})`)
      data = await res.json()
    } else if (supabase) {
      const { data: d, error } = await supabase.functions.invoke('stylist', { body })
      if (error) throw new Error(error.message)
      data = d
    } else throw new Error('Styliste IA non configuré')
  }

  const a = data as Partial<AiAnswer>
  const valid = new Set(available.map((g) => g.id))
  return {
    message: String(a.message ?? '').trim() || 'Voici ma sélection.',
    title: String(a.title ?? 'Sélection du styliste'),
    itemIds: (a.itemIds ?? []).filter((id) => valid.has(id)),
  }
}
