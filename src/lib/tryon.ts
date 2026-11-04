import type { Garment, Slot } from '../types'

/**
 * Architecture d'essayage : chaque « fournisseur » transforme (photo de la personne + vêtement) en image.
 * - « overlay » : montage local sur la photo (PhotoAvatar). Disponible, pas photoréaliste.
 * - « remote » : essayage par IA via TON serveur (VITE_TRYON_URL). Aucune connexion n'est fournie par défaut ;
 *   la clé du service d'IA doit rester sur ce serveur, jamais dans l'application.
 *   Contrat attendu : POST { person: dataURL, garment: dataURL, category: 'tops'|'bottoms'|'one-pieces' }
 *   → 200 { image: dataURL | url }.
 */
export interface TryOnRequest { person: string; garment: Garment; slot: Slot }
export interface TryOnProvider { id: string; label: string; photoreal: boolean; ready: () => boolean; run: (r: TryOnRequest) => Promise<string> }

export const overlayProvider: TryOnProvider = {
  id: 'overlay', label: 'Montage sur photo', photoreal: false, ready: () => true,
  run: async () => { throw new Error('Le montage local est géré par PhotoAvatar.') },
}

const remoteUrl = (): string | undefined => (import.meta.env as Record<string, string | undefined>).VITE_TRYON_URL

export const remoteProvider: TryOnProvider = {
  id: 'remote', label: 'Essayage IA (serveur)', photoreal: true, ready: () => Boolean(remoteUrl()),
  run: async ({ person, garment, slot }) => {
    const url = remoteUrl()
    if (!url) throw new Error('Essayage IA non configuré.')
    const category = slot === 'bottom' ? 'bottoms' : slot === 'suit' ? 'one-pieces' : 'tops'
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ person, garment: garment.photo, category }) })
    if (!res.ok) throw new Error(`Essayage IA indisponible (${res.status})`)
    const j = (await res.json()) as { image?: string }
    if (!j.image) throw new Error('Réponse invalide')
    return j.image
  },
}

export const tryOnProviders: TryOnProvider[] = [overlayProvider, remoteProvider]
