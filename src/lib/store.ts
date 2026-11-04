import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { idbStorage } from './db'
import { slotOf } from './constants'
import { uid, ymd } from './utils'
import type {
  AvatarConfig, CalendarEntry, Capsule, Context, Garment, Outfit, Settings, WishItem,
} from '../types'

export const DEFAULT_AVATAR: AvatarConfig = {
  height: 180,
  build: 0.45,
  shoulders: 0.5,
  waist: 0.45,
  legs: 0.5,
  skin: '#e6b995',
  hair: 'short',
  hairColor: '#3a2a1e',
  beard: 'none',
  underwear: 'noir',
  photo: '',
  fit: {},
}

export const DEFAULT_SETTINGS: Settings = {
  name: '',
  location: null,
  notifications: false,
  aiEnabled: false,
}

interface Data {
  garments: Garment[]
  outfits: Outfit[]
  calendar: CalendarEntry[]
  wishlist: WishItem[]
  capsules: Capsule[]
  avatar: AvatarConfig
  settings: Settings
  tryOn: string[]
  onboarded: boolean
}

interface Actions {
  addGarment: (g: Omit<Garment, 'id' | 'createdAt' | 'wornDates' | 'status'> & Partial<Pick<Garment, 'wornDates' | 'status'>>) => string
  updateGarment: (id: string, patch: Partial<Garment>) => void
  removeGarment: (id: string) => void
  setStatus: (id: string, status: Garment['status']) => void

  saveOutfit: (name: string, itemIds: string[], context?: Context | '', favorite?: boolean) => string
  updateOutfit: (id: string, patch: Partial<Outfit>) => void
  toggleFavorite: (id: string) => void
  removeOutfit: (id: string) => void

  logOutfit: (date: string, itemIds: string[], opts?: { planned?: boolean; outfitId?: string; note?: string }) => void
  markPlannedWorn: (date: string) => void
  removeEntry: (date: string) => void

  addWish: (w: Omit<WishItem, 'id' | 'createdAt'>) => void
  removeWish: (id: string) => void
  addCapsule: (name: string, itemIds?: string[]) => string
  updateCapsule: (id: string, patch: Partial<Capsule>) => void
  removeCapsule: (id: string) => void

  setAvatar: (patch: Partial<AvatarConfig>) => void
  setSettings: (patch: Partial<Settings>) => void

  toggleTryOn: (garmentId: string) => void
  setTryOn: (ids: string[]) => void
  clearTryOn: () => void

  setOnboarded: () => void
  exportData: () => string
  importData: (json: string) => boolean
  resetAll: () => void
}

export type Store = Data & Actions

const initial: Data = {
  garments: [],
  outfits: [],
  calendar: [],
  wishlist: [],
  capsules: [],
  avatar: DEFAULT_AVATAR,
  settings: DEFAULT_SETTINGS,
  tryOn: [],
  onboarded: false,
}

/** Applique la règle « une pièce par emplacement » (sauf accessoires) à une sélection. */
export function normalizeSelection(ids: string[], garments: Garment[]): string[] {
  const byId = new Map(garments.map((g) => [g.id, g]))
  const result: string[] = []
  const used = new Set<string>()
  // on parcourt à l'envers : la dernière sélection gagne
  for (const id of [...ids].reverse()) {
    const g = byId.get(id)
    if (!g) continue
    const slot = slotOf(g.category)
    if (slot === 'accessory') {
      result.unshift(id)
      continue
    }
    if (slot === 'suit') {
      if (used.has('suit') || used.has('top') || used.has('bottom')) continue
      used.add('suit')
      result.unshift(id)
      continue
    }
    if (slot === 'top' || slot === 'bottom') {
      if (used.has('suit') || used.has(slot)) continue
    } else if (used.has(slot)) continue
    used.add(slot)
    result.unshift(id)
  }
  return result
}

export const useStore = create<Store>()(
  persist(
    (set, get) => ({
      ...initial,

      addGarment: (g) => {
        const id = uid()
        const garment: Garment = {
          wornDates: [],
          status: 'available',
          ...g,
          id,
          createdAt: Date.now(),
        }
        set((s) => ({ garments: [garment, ...s.garments] }))
        return id
      },
      updateGarment: (id, patch) =>
        set((s) => ({ garments: s.garments.map((g) => (g.id === id ? { ...g, ...patch } : g)) })),
      removeGarment: (id) =>
        set((s) => ({
          garments: s.garments.filter((g) => g.id !== id),
          outfits: s.outfits
            .map((o) => ({ ...o, itemIds: o.itemIds.filter((i) => i !== id) }))
            .filter((o) => o.itemIds.length > 0),
          capsules: s.capsules.map((c) => ({ ...c, itemIds: c.itemIds.filter((i) => i !== id) })),
          calendar: s.calendar.map((e) => ({ ...e, itemIds: e.itemIds.filter((i) => i !== id) })),
          tryOn: s.tryOn.filter((i) => i !== id),
        })),
      setStatus: (id, status) =>
        set((s) => ({
          garments: s.garments.map((g) => (g.id === id ? { ...g, status } : g)),
          tryOn: status === 'available' ? s.tryOn : s.tryOn.filter((i) => i !== id),
        })),

      saveOutfit: (name, itemIds, context = '', favorite = false) => {
        const id = uid()
        const outfit: Outfit = { id, name, itemIds, favorite, context, note: '', createdAt: Date.now() }
        set((s) => ({ outfits: [outfit, ...s.outfits] }))
        return id
      },
      updateOutfit: (id, patch) =>
        set((s) => ({ outfits: s.outfits.map((o) => (o.id === id ? { ...o, ...patch } : o)) })),
      toggleFavorite: (id) =>
        set((s) => ({ outfits: s.outfits.map((o) => (o.id === id ? { ...o, favorite: !o.favorite } : o)) })),
      removeOutfit: (id) => set((s) => ({ outfits: s.outfits.filter((o) => o.id !== id) })),

      logOutfit: (date, itemIds, opts = {}) => {
        const planned = !!opts.planned
        set((s) => {
          const prev = s.calendar.find((e) => e.date === date)
          // si on remplace une tenue déjà portée ce jour-là, on retire les anciens "ports"
          let garments = s.garments
          if (prev && !prev.planned) {
            const old = new Set(prev.itemIds)
            garments = garments.map((g) =>
              old.has(g.id) ? { ...g, wornDates: g.wornDates.filter((d) => d !== date) } : g,
            )
          }
          if (!planned) {
            const ids = new Set(itemIds)
            garments = garments.map((g) =>
              ids.has(g.id) && !g.wornDates.includes(date) ? { ...g, wornDates: [...g.wornDates, date] } : g,
            )
          }
          const entry: CalendarEntry = { date, itemIds, planned, outfitId: opts.outfitId, note: opts.note }
          return { garments, calendar: [...s.calendar.filter((e) => e.date !== date), entry] }
        })
      },
      markPlannedWorn: (date) => {
        const e = get().calendar.find((x) => x.date === date)
        if (e) get().logOutfit(date, e.itemIds, { planned: false, outfitId: e.outfitId, note: e.note })
      },
      removeEntry: (date) =>
        set((s) => {
          const e = s.calendar.find((x) => x.date === date)
          if (!e) return {}
          const ids = new Set(e.itemIds)
          return {
            calendar: s.calendar.filter((x) => x.date !== date),
            garments: e.planned
              ? s.garments
              : s.garments.map((g) => (ids.has(g.id) ? { ...g, wornDates: g.wornDates.filter((d) => d !== date) } : g)),
          }
        }),

      addWish: (w) => set((s) => ({ wishlist: [{ ...w, id: uid(), createdAt: Date.now() }, ...s.wishlist] })),
      removeWish: (id) => set((s) => ({ wishlist: s.wishlist.filter((w) => w.id !== id) })),
      addCapsule: (name, itemIds = []) => {
        const id = uid()
        set((s) => ({ capsules: [...s.capsules, { id, name, itemIds }] }))
        return id
      },
      updateCapsule: (id, patch) =>
        set((s) => ({ capsules: s.capsules.map((c) => (c.id === id ? { ...c, ...patch } : c)) })),
      removeCapsule: (id) => set((s) => ({ capsules: s.capsules.filter((c) => c.id !== id) })),

      setAvatar: (patch) => set((s) => ({ avatar: { ...s.avatar, ...patch } })),
      setSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),

      toggleTryOn: (garmentId) =>
        set((s) => {
          if (s.tryOn.includes(garmentId)) return { tryOn: s.tryOn.filter((i) => i !== garmentId) }
          return { tryOn: normalizeSelection([...s.tryOn, garmentId], s.garments) }
        }),
      setTryOn: (ids) => set((s) => ({ tryOn: normalizeSelection(ids, s.garments) })),
      clearTryOn: () => set({ tryOn: [] }),

      setOnboarded: () => set({ onboarded: true }),
      exportData: () => {
        const s = get()
        const { garments, outfits, calendar, wishlist, capsules, avatar, settings } = s
        return JSON.stringify(
          { app: 'maison', version: 1, exportedAt: new Date().toISOString(), garments, outfits, calendar, wishlist, capsules, avatar, settings },
          null,
          2,
        )
      },
      importData: (json) => {
        try {
          const d = JSON.parse(json)
          if (d?.app !== 'maison' || !Array.isArray(d.garments)) return false
          set({
            garments: d.garments ?? [],
            outfits: d.outfits ?? [],
            calendar: d.calendar ?? [],
            wishlist: d.wishlist ?? [],
            capsules: d.capsules ?? [],
            avatar: { ...DEFAULT_AVATAR, ...(d.avatar ?? {}) },
            settings: { ...DEFAULT_SETTINGS, ...(d.settings ?? {}) },
            tryOn: [],
            onboarded: true,
          })
          return true
        } catch {
          return false
        }
      },
      resetAll: () => set({ ...initial }),
    }),
    {
      name: 'maison-v1',
      storage: createJSONStorage(() => idbStorage),
      version: 1,
    },
  ),
)

export const todayKey = () => ymd()
