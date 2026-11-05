import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { NavBar, type Tab } from './components/NavBar'
import { Splash, ToastHost, toast } from './components/ui'
import { Home } from './pages/Home'
import { Profile } from './pages/Profile'
import { Selection } from './pages/Selection'
import { Stylist } from './pages/Stylist'
import { TryOn } from './pages/TryOn'
import { Wardrobe } from './pages/Wardrobe'
import { useStore } from './lib/store'
import { useWeather } from './lib/weatherStore'
import { homeSelections } from './lib/stylist'
import { ymd } from './lib/utils'
import { LocationPicker } from './components/LocationPicker'
import type { Garment } from './types'

function useHydrated() {
  const [h, setH] = useState(useStore.persist.hasHydrated())
  useEffect(() => {
    const un = useStore.persist.onFinishHydration(() => setH(true))
    return un
  }, [])
  return h
}

function Welcome() {
  const { setSettings, setOnboarded } = useStore()
  const [name, setName] = useState('')
  const [loc, setLoc] = useState(false)
  const done = () => { setSettings({ name: name.trim() }); setOnboarded() }
  return (
    <div className="flex h-full flex-col justify-between px-8 pb-[calc(var(--safe-bottom)+40px)] pt-[calc(var(--safe-top)+80px)]">
      <div>
        <div className="font-serif text-[15px] font-light tracking-[0.55em] text-champagne">MAISON</div>
        <h1 className="title-serif mt-10 text-[54px]">Ton dressing privé.</h1>
        <p className="mt-5 max-w-[320px] font-serif text-[21px] italic leading-snug text-creme/60">Chaque pièce, chaque tenue, composées avec soin.</p>
      </div>
      <div>
        <input className="field mb-3" placeholder="Ton prénom" value={name} onChange={(e) => setName(e.target.value)} />
        <button className="field mb-6 text-left text-creme/55" onClick={() => setLoc(true)}>{useStore.getState().settings.location?.label ?? 'Activer la météo (facultatif)'}</button>
        <button className="btn-gold w-full" onClick={done}>Entrer</button>
      </div>
      <LocationPicker open={loc} onClose={() => setLoc(false)} />
    </div>
  )
}

export default function App() {
  const hydrated = useHydrated()
  const onboarded = useStore((s) => s.onboarded)
  const [tab, setTab] = useState<Tab>('home')
  const [boot, setBoot] = useState(true)
  const { garments, settings, calendar, setTryOn, toggleTryOn, tryOn } = useStore()
  const weather = useWeather((s) => s.weather)

  useEffect(() => { const t = setTimeout(() => setBoot(false), 900); return () => clearTimeout(t) }, [])

  // Notification quotidienne (à l'ouverture de l'app, une fois par jour)
  useEffect(() => {
    if (!hydrated || !settings.notifications || !('Notification' in window) || Notification.permission !== 'granted') return
    const key = 'maison-notif-day'
    try { if (localStorage.getItem(key) === ymd()) return } catch { return }
    const planned = calendar.find((e) => e.date === ymd() && e.planned)
    const body = planned
      ? `Tenue planifiée : ${planned.itemIds.map((id) => garments.find((g) => g.id === id)?.name).filter(Boolean).join(', ')}`
      : weather ? (() => { const l = homeSelections(garments, weather)[0]; return l ? `${weather.feels}° ressentis. Suggestion : ${l.itemIds.map((id) => garments.find((g) => g.id === id)?.name).filter(Boolean).slice(0, 3).join(', ')}` : '' })() : ''
    if (!body) return
    try { new Notification('MAISON', { body }); localStorage.setItem(key, ymd()) } catch { /* ignore */ }
  }, [hydrated, settings.notifications, weather, calendar, garments])

  const tryLook = (l: { itemIds: string[] }) => { setTryOn(l.itemIds); setTab('tryon'); toast('Look prêt à composer') }
  const tryGarment = (g: Garment) => { if (!tryOn.includes(g.id)) toggleTryOn(g.id); setTab('tryon') }

  if (!hydrated || boot) return <Splash />
  if (!onboarded) return <Welcome />

  return (
    <div className="mx-auto h-full max-w-[560px]">
      <main className="h-full overflow-y-auto overscroll-contain" id="scroll">
        <AnimatePresence mode="wait">
          <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.28 }} className="min-h-full">
            {tab === 'home' && <Home go={setTab} tryLook={tryLook} />}
            {tab === 'wardrobe' && <Wardrobe onTryGarment={tryGarment} />}
            {tab === 'tryon' && <TryOn goStylist={() => setTab('stylist')} />}
            {tab === 'selection' && <Selection go={setTab} tryLook={tryLook} />}
            {tab === 'stylist' && <Stylist tryLook={tryLook} />}
            {tab === 'profile' && <Profile />}
          </motion.div>
        </AnimatePresence>
      </main>
      <NavBar tab={tab} onChange={(t) => { setTab(t); document.getElementById('scroll')?.scrollTo({ top: 0 }) }} />
      <ToastHost />
    </div>
  )
}
