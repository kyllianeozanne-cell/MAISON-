import { motion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import { LocationPicker } from '../components/LocationPicker'
import { LookCard, OutfitCollage } from '../components/Look'
import { GarmentThumb } from '../components/GarmentThumb'
import { Icon, Section, Spinner, toast } from '../components/ui'
import { homeSelections } from '../lib/stylist'
import { useStore } from '../lib/store'
import { useWeather } from '../lib/weatherStore'
import { greeting, longDate } from '../lib/utils'
import type { Garment, Look } from '../types'
import type { Tab } from '../components/NavBar'

export function Home({ go, tryLook }: { go: (t: Tab) => void; tryLook: (l: { itemIds: string[] }) => void }) {
  const { garments, outfits, settings } = useStore()
  const { weather, loading, error, load } = useWeather()
  const [loc, setLoc] = useState(false)
  const [seed, setSeed] = useState(0)

  useEffect(() => { load() }, [load, settings.location])

  const active = garments.filter((g) => g.status !== 'archived')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const looks: Look[] = useMemo(() => homeSelections(garments, weather), [garments, weather, seed])
  const recent = outfits.slice(0, 6)
  const byId = (ids: string[]) => ids.map((id) => garments.find((g) => g.id === id)).filter((g): g is Garment => !!g)
  const today = looks[0]

  return (
    <div className="pb-32">
      <div className="px-6 pt-[calc(var(--safe-top)+32px)]">
        <div className="caps mb-3">{longDate()}</div>
        <h1 className="title-serif text-[46px]">{greeting()}</h1>
        <p className="mt-2 font-serif text-[20px] italic text-creme/60">
          {settings.name ? `${settings.name}, your style, curated for today.` : 'Your style, curated for today.'}
        </p>
      </div>

      {/* Météo */}
      <div className="mx-6 mt-8 card p-5">
        {!settings.location ? (
          <div className="flex items-center justify-between gap-4">
            <p className="text-[13px] leading-relaxed text-creme/60">Active la météo pour des tenues adaptées à ta journée.</p>
            <button className="btn-gold shrink-0 !px-4 !py-2.5" onClick={() => setLoc(true)}>Activer</button>
          </div>
        ) : loading && !weather ? (
          <div className="flex justify-center py-4"><Spinner /></div>
        ) : weather ? (
          <div>
            <div className="flex items-start justify-between">
              <div>
                <div className="caps mb-1.5 flex items-center gap-1.5"><Icon name="pin" size={12} />{settings.location.label}</div>
                <div className="flex items-baseline gap-3">
                  <span className="title-serif text-[54px]">{weather.temp}°</span>
                  <span className="text-[13px] text-creme/55">ressenti {weather.feels}°</span>
                </div>
                <div className="text-[13px] text-ivoire">{weather.label}</div>
              </div>
              <button onClick={() => load(true)} className="p-1 text-creme/40" aria-label="Actualiser"><Icon name="rotate" size={17} /></button>
            </div>
            <div className="mt-4 flex gap-6 border-t border-champagne/15 pt-4 text-[11.5px] text-creme/60">
              <span className="flex items-center gap-1.5"><Icon name="rain" size={15} />{weather.rainProb} %</span>
              <span className="flex items-center gap-1.5"><Icon name="wind" size={15} />{weather.wind} km/h</span>
              <span>{weather.min}° / {weather.max}°</span>
            </div>
            <div className="no-scrollbar mt-4 flex gap-5 overflow-x-auto">
              {weather.hourly.filter((_, i) => i % 3 === 0).slice(0, 6).map((h) => (
                <div key={h.time} className="shrink-0 text-center text-[11px] text-creme/55">
                  <div>{h.time.slice(11, 13)} h</div>
                  <div className="my-1 font-serif text-[18px] text-ivoire">{h.temp}°</div>
                  <div>{h.rain} %</div>
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

      {/* Tenue du jour */}
      <Section title="Today’s selection" action={looks.length > 0 && <button onClick={() => setSeed((s) => s + 1)} className="text-creme/50" aria-label="Autre"><Icon name="shuffle" size={18} /></button>}>
        <div className="px-6">
          {today ? (
            <LookCard look={today} garments={garments} onTry={tryLook} hasWeather={!!weather} wide />
          ) : (
            <div className="card p-6 text-center">
              <p className="mb-5 text-[13px] leading-relaxed text-creme/55">
                {active.length === 0 ? 'Ajoute des vêtements pour recevoir une première sélection.' : 'Il te faut au moins un haut et un bas disponibles pour composer une tenue.'}
              </p>
              <button className="btn-gold" onClick={() => go('wardrobe')}>Ouvrir mon dressing</button>
            </div>
          )}
        </div>
      </Section>

      {/* Aperçu dressing */}
      <Section title="My wardrobe" action={<button onClick={() => go('wardrobe')} className="caps">Voir tout</button>}>
        <div className="px-6">
          <div className="mb-4 flex items-baseline gap-3">
            <span className="title-serif text-[44px]">{active.length}</span>
            <span className="caps !text-creme/50">pièce{active.length > 1 ? 's' : ''}</span>
          </div>
          {active.length > 0 && (
            <div className="no-scrollbar -mx-6 flex gap-3 overflow-x-auto px-6">
              {active.slice(0, 10).map((g) => (
                <button key={g.id} onClick={() => go('wardrobe')} className="w-24 shrink-0"><GarmentThumb garment={g} className="aspect-[4/5] rounded-maison" /></button>
              ))}
            </div>
          )}
        </div>
      </Section>

      {/* Dernières tenues */}
      {recent.length > 0 && (
        <Section title="Latest outfits" action={<button onClick={() => go('tryon')} className="caps">Voir tout</button>}>
          <div className="no-scrollbar flex gap-4 overflow-x-auto px-6">
            {recent.map((o) => (
              <button key={o.id} onClick={() => { tryLook({ itemIds: o.itemIds }) }} className="w-36 shrink-0 text-left">
                <OutfitCollage items={byId(o.itemIds)} />
                <div className="mt-2 line-clamp-1 font-serif text-[17px] text-ivoire">{o.name}</div>
              </button>
            ))}
          </div>
        </Section>
      )}

      {/* Accès rapide */}
      <motion.button whileTap={{ scale: 0.98 }} onClick={() => go('tryon')} className="card mx-6 mt-9 flex w-[calc(100%-48px)] items-center justify-between p-5 text-left">
        <div>
          <div className="caps mb-1.5">Virtual fitting room</div>
          <div className="font-serif text-[22px] text-ivoire">Essayer sur mon avatar</div>
        </div>
        <Icon name="chevron" size={20} className="text-champagne" />
      </motion.button>

      {/* Recommandations */}
      {looks.length > 1 && (
        <Section title="Recommendations">
          <div className="no-scrollbar flex snap-x snap-mandatory gap-4 overflow-x-auto px-6">
            {looks.slice(1).map((l) => (
              <LookCard key={l.id} look={l} garments={garments} onTry={(x) => { tryLook(x); toast(l.title) }} hasWeather={!!weather} />
            ))}
          </div>
        </Section>
      )}

      <LocationPicker open={loc} onClose={() => setLoc(false)} />
    </div>
  )
}
