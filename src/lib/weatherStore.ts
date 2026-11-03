import { create } from 'zustand'
import { fetchWeather } from './weather'
import { useStore } from './store'
import type { Weather } from '../types'

interface WeatherState {
  weather: Weather | null
  loading: boolean
  error: string | null
  load: (force?: boolean) => Promise<void>
}

export const useWeather = create<WeatherState>((set, get) => ({
  weather: null,
  loading: false,
  error: null,
  load: async (force = false) => {
    const loc = useStore.getState().settings.location
    if (!loc) {
      set({ weather: null, error: null, loading: false })
      return
    }
    if (get().loading) return
    set({ loading: true, error: null })
    try {
      const w = await fetchWeather(loc, force)
      set({ weather: w, loading: false })
    } catch (e) {
      set({ loading: false, error: e instanceof Error ? e.message : 'Météo indisponible' })
    }
  },
}))
