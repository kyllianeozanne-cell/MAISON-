import { fetchWeek } from './weather'
import { prefsOf, suggest } from './stylist'
import { useStore } from './store'
import { ymd } from './utils'
import type { Context } from '../types'

/** Planifie les 7 prochains jours (sans écraser les jours déjà remplis) en évitant de répéter les pièces. Retourne le nombre de jours planifiés. */
export async function planWeek(): Promise<number> {
  const st = useStore.getState()
  const week = st.settings.location ? await fetchWeek(st.settings.location) : {}
  const recent: string[][] = []
  let n = 0
  for (let i = 0; i < 7; i++) {
    const d = new Date(Date.now() + i * 86400000)
    const key = ymd(d)
    const existing = st.calendar.find((e) => e.date === key)
    if (existing) { recent.push(existing.itemIds); continue }
    const dow = d.getDay()
    const context: Context = dow === 0 || dow === 6 ? 'weekend' : 'travail'
    const avoid = recent.slice(-2).flat()
    const look = suggest(st.garments, week[key] ?? null, { context, tone: context === 'weekend' ? 'casual' : 'smart', mustInclude: [], avoidIds: avoid, count: 1, prefs: prefsOf(st.settings), date: d })[0]
    if (!look) continue
    st.logOutfit(key, look.itemIds, { planned: true })
    recent.push(look.itemIds)
    n++
  }
  return n
}
