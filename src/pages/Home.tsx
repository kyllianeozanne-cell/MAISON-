import { motion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import { GarmentThumb } from '../components/GarmentThumb'
import { LocationPicker } from '../components/LocationPicker'
import { CompatBadge, LookRow, OutfitCollage, orderItems } from '../components/Look'
import { Icon, Section, Segmented, Spinner } from '../components/ui'
import { slotOf } from '../lib/constants'
import { homeSelections, suggest } from '../lib/stylist'
import { useStore } from '../lib/store'
import { isWet } from '../lib/weather'
import { useWeather } from '../lib/weatherStore'
import { greeting, longDate, ymd } from '../lib/utils'
import type { Garment, Look } from '../types'
import type { Tab } from '../components/NavBar'

type RTab = 'today' | 'week' | 'events'
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

function Hero({ look, garments, onTry, hasWeather }: { look: Look; garments: Garment[]; onTry: (l: Look) => void; hasWeather: boolean }) {
  const items = orderItems(look.itemIds.map((id) => garments.find((g) => g.id === id)).filter((g): g is Garment => !!g))
  const main = items.find((g) => slotOf(g.category) === 'outer' || slotOf(g.category) === 'suit') ?? items[0]
  const rest = items.filter((g) => g.id !== main.id)
  const side = rest.slice(0, 3)
  return (
    <div className="card overflow-hidden p-3">
      <div className="grid grid-cols-[1fr_86px] gap-2">
        <GarmentThumb garment={main} className="aspect-[3/4] rounded-xl" />
        <div className="flex flex-col gap-2">
          {side.map((g) => <GarmentThumb key={g.id} garment={g} className="aspect-square rounded-xl" />)}
          {rest.length > 3 && <div className="flex flex-1 items-center justify-center rounded-xl bg-brun text-[12px] text-champagne">+{rest.length - 3}</div>}
        </div>
      </div>
      <p className="mt-4 px-1 text-[12.5px] leading-relaxed text-creme/60">{look.reason}</p>
      <div className="mt-4 flex items-center justify-between gap-3 px-1 pb-1">
        {hasWeather ? <CompatBadge score={look.score} /> : <span />}
        <button onClick={() => onTry(look)} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-champagne text-noir" aria-label="Essayer"><Icon name="chevron" size={18} stroke={1.6} /></button>
      </div>
    </div>
  )
}

export function Home({ go, tryLook }: { go: (t: Tab) => void; tryLook: (l: { itemIds: string[] }) => void }) {
  const { garments, outfits, settings, calendar } = useStore()
  const { weather, loading, error, load } = useWeather()
  const [loc, setLoc] = useState(false)
  const [seed, setSeed] = useState(0)
  const [rtab, setRtab] = useState<RTab>('today')

  useEffect(() => { load() }, [load, settings.location])

  const active = garments.filter((g) => g.status !== 'archived')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const looks: Look[] = useMemo(() => homeSelections(garments, weather), [garments, weather, seed])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const events: Look[] = useMemo(() => {
    const used: string[] = []
    return ([['travail', 'smart', 'Look bureau'], ['rendez-vous', 'oldmoney', 'Rendez-vous'], ['soiree', 'formal', 'Soirée']] as const).flatMap(([context, tone, title]) => {
      const l = suggest(garments, weather, { context, tone, mustInclude: [], avoidIds: used.slice(-6) })[0]
      if (!l) return []
      used.push(...l.itemIds)
      return [{ ...l, title }]
    })
  }, [garments, weather, seed])
  const week = useMemo(() => {
    const out: { k: string; d: Date; planned: boolean; ids: string[] }[] = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(Date.now() + i * 86400000)
      const e = calendar.find((x) => x.date === ymd(d))
      if (e) out.push({ k: e.date, d, planned: e.planned, ids: e.itemIds })
    }
    return out
  }, [calendar])
  const recent = outfits.slice(0, 6)
  const byId = (ids: string[]) => ids.map((id) => garments.find((g) => g.id === id)).filter((g): g is Garment => !!g)
  const today = looks[0]
  const wIcon = weather ? (isWet(weather) ? 'rain' : weather.code <= 1 ? 'sun' : 'cloud') : 'sun'

  return (
    <div className="pb-32">
      <div className="flex items-center justify-between px-6 pt-[calc(var(--safe-top)+20px)]">
        <span className="w-6" />
        <span className="pl-[0.5em] font-serif text-[15px] tracking-[0.5em] text-ivoire">MAISON</span>
        <button onClick={() => go('wardrobe')} className="w-6 text-creme/70" aria-label="Rechercher"><Icon name="search" size={20} /></button>
      </div>

      <div className="px-6 pt-9">
        <h1 className="title-serif text-[40px]">{greeting()}{settings.name ? ` ${settings.name}` : ''}.</h1>
        <p className="mt-2 text-[13.5px] text-creme/55">{cap(longDate())}</p>
      </div>

      <div className="card mx-6 mt-6 p-4">
        {!settings.location ? (
          <div className="flex items-center justify-between gap-4">
            <p className="text-[13px] leading-relaxed text-creme/60">Active la météo pour des tenues adaptées à ta journée.</p>
            <button className="btn-gold shrink-0 !px-4 !py-2.5" onClick={() => setLoc(true)}>Activer</button>
          </div>
        ) : loading && !weather ? (
          <div className="flex justify-center py-3"><Spinner /></div>
        ) : weather ? (
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Icon name={wIcon} size={38} stroke={1} className="text-champagne" />
                <div>
                  <div className="text-[11px] text-creme/50">Aujourd’hui · {settings.location.label}</div>
                  <div className="title-serif text-[34px]">{weather.temp}°C</div>
                </div>
              </div>
              <div className="text-right text-[12px] text-creme/60">
                <div className="text-ivoire">{weather.label}</div>
                <div>↑ {weather.max}°  ↓ {weather.min}° · ressenti {weather.feels}°</div>
                <div className="mt-0.5">Pluie {weather.rainProb} % · {weather.wind} km/h</div>
              </div>
            </div>
            <div className="no-scrollbar mt-3 flex gap-6 overflow-x-auto border-t border-white/[0.06] pt-3">
              {weather.hourly.filter((_, i) => i % 3 === 0).slice(0, 6).map((h) => (
                <div key={h.time} className="shrink-0 text-center text-[11px] text-creme/50">
                  <div>{h.time.slice(11, 13)} h</div><div className="font-serif text-[16px] text-ivoire">{h.temp}°</div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-4">
            <p className="text-[12.5px] text-creme/55">{error ?? 'Météo indisponible.'}</p>
            <button className="btn-ghost !px-4 !py-2.5" onClick={() => load(true)}>Réessayer</button>
          </div>
        )}
      </div>

      <div className="mt-8 px-6">
        <div className="mb-3 flex items-end justify-between">
          <div>
            <div className="caps">Tenue du jour</div>
            {today && <div className="mt-1.5 font-serif text-[24px] text-ivoire">{today.title}</div>}
          </div>
          {today && <button onClick={() => setSeed((s) => s + 1)} className="p-1 text-creme/50" aria-label="Autre proposition"><Icon name="shuffle" size={18} /></button>}
        </div>
        {today ? (
          <Hero look={today} garments={garments} onTry={tryLook} hasWeather={!!weather} />
        ) : (
          <div className="card p-6 text-center">
            <p className="mb-5 text-[13px] leading-relaxed text-creme/55">{active.length === 0 ? 'Ajoute des vêtements pour recevoir une première sélection.' : 'Il te faut au moins un haut et un bas disponibles pour composer une tenue.'}</p>
            <button className="btn-gold" onClick={() => go('wardrobe')}>Ouvrir mon dressing</button>
          </div>
        )}
      </div>

      <Section title="Mon dressing" action={<button onClick={() => go('wardrobe')} className="caps">Voir tout</button>}>
        <div className="px-6">
          <div className="mb-4 flex items-baseline gap-3"><span className="title-serif text-[40px]">{active.length}</span><span className="text-[13px] text-creme/50">pièce{active.length > 1 ? 's' : ''}</span></div>
          {active.length > 0 && (
            <div className="no-scrollbar -mx-6 flex gap-3 overflow-x-auto px-6">
              {active.slice(0, 10).map((g) => <button key={g.id} onClick={() => go('wardrobe')} className="w-24 shrink-0"><GarmentThumb garment={g} className="aspect-[4/5] rounded-xl" /></button>)}
            </div>
          )}
        </div>
      </Section>

      {recent.length > 0 && (
        <Section title="Dernières tenues" action={<button onClick={() => go('tryon')} className="caps">Voir tout</button>}>
          <div className="no-scrollbar flex gap-4 overflow-x-auto px-6">
            {recent.map((o) => (
              <button key={o.id} onClick={() => tryLook({ itemIds: o.itemIds })} className="w-36 shrink-0 text-left">
                <OutfitCollage items={byId(o.itemIds)} />
                <div className="mt-2 line-clamp-1 font-serif text-[16px] text-ivoire">{o.name}</div>
              </button>
            ))}
          </div>
        </Section>
      )}

      <Section title="Recommandations">
        <div className="px-6">
          <div className="mb-5"><Segmented<RTab> value={rtab} onChange={setRtab} options={[{ id: 'today', label: 'Aujourd’hui' }, { id: 'week', label: 'Semaine' }, { id: 'events', label: 'Événements' }]} /></div>
          <motion.div key={rtab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-3">
            {rtab === 'today' && (looks.length > 1 ? looks.slice(1).map((l) => <LookRow key={l.id} look={l} garments={garments} onTry={tryLook} temp={weather?.temp} />) : <p className="py-4 text-center text-[12.5px] text-creme/45">Pas encore assez de pièces pour proposer plusieurs looks.</p>)}
            {rtab === 'events' && (events.length ? events.map((l) => <LookRow key={l.id} look={l} garments={garments} onTry={tryLook} temp={weather?.temp} />) : <p className="py-4 text-center text-[12.5px] text-creme/45">Ajoute des pièces pour obtenir des looks par occasion.</p>)}
            {rtab === 'week' && (week.length ? week.map((w) => (
              <button key={w.k} onClick={() => tryLook({ itemIds: w.ids })} className="card flex items-center gap-4 p-3 text-left">
                <div className="flex w-28 shrink-0 gap-1">{byId(w.ids).slice(0, 3).map((g) => <GarmentThumb key={g.id} garment={g} className="aspect-[3/4] flex-1 rounded-md" />)}</div>
                <div className="flex-1"><div className="font-serif text-[18px] capitalize text-ivoire">{w.d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'short' })}</div><div className="text-[11.5px] text-creme/50">{w.planned ? 'Tenue planifiée' : 'Tenue portée'}</div></div>
                <Icon name="chevron" size={16} className="text-champagne" />
              </button>
            )) : <p className="py-4 text-center text-[12.5px] text-creme/45">Aucune tenue planifiée cette semaine. Planifie-les dans Profil → Calendrier.</p>)}
          </motion.div>
        </div>
      </Section>

      <LocationPicker open={loc} onClose={() => setLoc(false)} />
    </div>
  )
}
