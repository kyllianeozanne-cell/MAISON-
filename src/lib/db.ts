import { del, get, set } from 'idb-keyval'
import type { StateStorage } from 'zustand/middleware'

/**
 * Stockage persistant dans IndexedDB (les photos en data URL dépassent vite
 * les 5 Mo de localStorage). Si IndexedDB est indisponible (navigation privée
 * stricte), on retombe sur localStorage.
 */
export const idbStorage: StateStorage = {
  getItem: async (name) => {
    try {
      const v = await get<string>(name)
      if (v != null) return v
    } catch {
      /* ignore */
    }
    try {
      return localStorage.getItem(name)
    } catch {
      return null
    }
  },
  setItem: async (name, value) => {
    try {
      await set(name, value)
    } catch {
      try {
        localStorage.setItem(name, value)
      } catch {
        /* quota */
      }
    }
  },
  removeItem: async (name) => {
    try {
      await del(name)
    } catch {
      /* ignore */
    }
    try {
      localStorage.removeItem(name)
    } catch {
      /* ignore */
    }
  },
}
