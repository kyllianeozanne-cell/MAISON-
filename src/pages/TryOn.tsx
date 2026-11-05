import { motion } from 'framer-motion'
import { useMemo, useRef, useState } from 'react'
import { GarmentThumb } from '../components/GarmentThumb'
import { orderItems } from '../components/Look'
import { LookBoard } from '../components/LookBoard'
import { Empty, Header, Icon, Sheet, toast } from '../components/ui'
import { CONTEXTS, SLOT_LABEL, slotOf } from '../lib/constants'
import { prefsOf, suggest } from '../lib/stylist'
import { useStore } from '../lib/store'
import { useWeather } from '../lib/weatherStore'
import { cx, longDate, ymd } from '../lib/utils'
import type { Context, Garment, Outfit, Slot } from '../types'

const SLOTS: Slot[] = ['top', 'bottom', 'outer', 'shoes', 'accessory', 'suit']
const LABEL: Record<Slot, string> = { ...SLOT_LABEL, outer: 'Veste' }

export function TryOn({ goStylist }: { goStylist: () => void }) {
  const { garments, tryOn, outfits, settings } = useStore()
  const { toggleTryOn, setTryOn, clearTryOn, saveOutfit, updateOutfit, toggleFavorite, removeOutfit, logOutfit } = useStore()
  const weather = useWeather((s) => s.weather)
  const [slot, setSlot] = useState<Slot>('top')
  const [saveOpen, setSaveOpen] = useState(false)
  const [name, setName] = useState('')
  const [ctx, setCtx] = useState<Context | ''>('')
  const [fav, setFav] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const top = useRef<HTMLDivElement>(null)

  const available = useMemo(() => garments.filter((g) => g.status === 'available'), [garments])
  const worn = useMemo(() => tryOn.map((id) => garments.find((g) => g.id === id)).filter((g): g is Garment => !!g), [tryOn, garments])
  const slots = SLOTS.filter((s) => available.some((g) => slotOf(g.category) === s))
  const activeSlot = slots.includes(slot) ? slot : slots[0]
  const list = available.filter((g) => slotOf(g.category) === activeSlot)
  const wornIds = new Set(tryOn)
  const dateLabel = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })

  const shuffle = () => {
    const l = suggest(garments, weather, { context: 'quotidien', tone: 'default', mustInclude: [], avoidIds: tryOn, count: 1, prefs: prefsOf(settings) })[0]
    if (!l) return toast('Il faut au moins un haut et un bas disponibles.')
    setTryOn(l.itemIds); toast('Nouvelle combinaison')
  }
  const share = async () => {
    if (worn.length === 0) return toast('Compose d’abord un look.')
    const text = `MAISON — ${name || 'Mon look'}\n` + orderItems(worn).map((g) => `• ${g.name}${g.brand ? ` (${g.brand})` : ''}`).join('\n')
    try { if (navigator.share) await navigator.share({ title: 'MAISON', text }); else { await navigator.clipboard.writeText(text); toast('Composition copiée') } } catch { /* annulé */ }
  }
  const openSave = () => {
    if (worn.length === 0) return toast('Ajoute au moins une pièce.')
    const ed = editingId ? outfits.find((o) => o.id === editingId) : null
    setName(ed?.name ?? `Look du ${dateLabel}`); setCtx(ed?.context ?? ''); setFav(ed?.favorite ?? false); setSaveOpen(true)
  }
  const confirmSave = () => {
    const n = name.trim() || 'Mon look'
    if (editingId) { updateOutfit(editingId, { name: n, itemIds: tryOn, context: ctx, favorite: fav }); toast('Look mis à jour') }
    else { saveOutfit(n, tryOn, ctx, fav); toast(fav ? 'Look enregistré en favori' : 'Look enregistré') }
    setEditingId(null); setSaveOpen(false)
  }
  const loadOutfit = (o: Outfit, edit = false) => {
    setTryOn(o.itemIds); setEditingId(edit ? o.id : null)
    top.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    toast(edit ? 'Modification du look' : 'Look chargé')
  }

  if (garments.length === 0) {
    return (
      <div className="pb-32">
        <Header eyebrow="Compose tes looks" title="Composer" />
        <Empty icon="layers" title="Rien à composer encore" text="Ajoute des pièces à ton dressing pour créer tes premiers looks." />
      </div>
    )
  }

  return (
    <div className="pb-32">
      <Header eyebrow="Compose tes looks" title="Composer" right={<button onClick={goStylist} className="btn-ghost !px-4 !py-2.5"><Icon name="sparkle" size={14} /> Styliste</button>} />

      <div ref={top} className="relative mx-6">
        {worn.length > 0 ? (
          <LookBoard items={worn} className="shadow-depth" />
        ) : (
          <div className="flex aspect-[4/5] flex-col items-center justify-center rounded-maison border border-dashed border-champagne/30 px-10 text-center">
            <Icon name="layers" size={28} stroke={1} className="mb-4 text-champagne" />
            <p className="text-[13px] leading-relaxed text-creme/55">Choisis des pièces ci-dessous : elles se composent ici comme dans un lookbook.</p>
          </div>
        )}
        {settings.photo && <img src={settings.photo} alt="Ma photo" className="absolute left-3 top-3 h-16 w-12 rounded-lg border border-white/20 object-cover shadow-depth" />}
      </div>
      {editingId && <p className="mx-6 mt-3 text-center text-[11px] uppercase tracking-[0.18em] text-champagne">Modification d’un look enregistré</p>}

      {worn.length > 0 && (
        <div className="no-scrollbar mx-6 mt-4 flex gap-2 overflow-x-auto">
          {worn.map((g) => <button key={g.id} onClick={() => toggleTryOn(g.id)} className="chip flex items-center gap-1.5">{g.name}<Icon name="x" size={12} /></button>)}
        </div>
      )}

      <div className="no-scrollbar mt-6 flex gap-2 overflow-x-auto px-6">
        {slots.map((s) => <button key={s} onClick={() => setSlot(s)} className={cx('chip', activeSlot === s && 'chip-on')}>{LABEL[s]}</button>)}
      </div>
      <div className="no-scrollbar mt-4 flex snap-x snap-mandatory scroll-px-6 gap-3 overflow-x-auto px-6 pb-2">
        {list.map((g) => {
          const on = wornIds.has(g.id)
          return (
            <motion.button key={g.id} whileTap={{ scale: 0.96 }} onClick={() => toggleTryOn(g.id)} className={cx('relative w-[92px] shrink-0 snap-start overflow-hidden rounded-maison border transition', on ? 'border-champagne shadow-gold' : 'border-transparent')}>
              <GarmentThumb garment={g} className="aspect-[4/5]" />
              {on && <span className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-champagne text-noir"><Icon name="check" size={12} stroke={2} /></span>}
            </motion.button>
          )
        })}
      </div>

      <div className="mx-6 mt-5 grid grid-cols-2 gap-3">
        <button className="btn-gold col-span-2" onClick={openSave}><Icon name="check" size={16} /> {editingId ? 'Mettre à jour le look' : 'Enregistrer le look'}</button>
        <button className="btn-ghost" onClick={() => { if (worn.length === 0) return toast('Compose d’abord un look.'); saveOutfit(`Favori du ${dateLabel}`, tryOn, '', true); toast('Ajouté aux favoris') }}><Icon name="heart" size={16} /> Favori</button>
        <button className="btn-ghost" onClick={shuffle}><Icon name="shuffle" size={16} /> Autre idée</button>
        <button className="btn-ghost" onClick={share}><Icon name="share" size={16} /> Partager</button>
        <button className="btn-ghost" onClick={() => { if (worn.length === 0) return toast('Compose d’abord un look.'); logOutfit(ymd(), tryOn); toast(`Porté aujourd’hui · ${longDate()}`) }}><Icon name="calendar" size={16} /> Porter aujourd’hui</button>
        <button className="btn col-span-2 text-creme/50" onClick={() => { clearTryOn(); setEditingId(null) }}><Icon name="undo" size={15} /> Réinitialiser la composition</button>
      </div>

      <section className="mt-10">
        <div className="mb-4 flex items-baseline justify-between px-6"><h2 className="title-serif text-[26px]">Mon lookbook</h2><span className="caps !text-creme/40">{outfits.length}</span></div>
        {outfits.length === 0 ? (
          <Empty icon="layers" title="Aucun look enregistré" text="Compose un look puis enregistre-le : il apparaîtra ici." />
        ) : (
          <div className="grid grid-cols-2 gap-4 px-6">
            {outfits.map((o) => {
              const items = o.itemIds.map((id) => garments.find((g) => g.id === id)).filter((g): g is Garment => !!g)
              return (
                <article key={o.id} className="card overflow-hidden">
                  <button onClick={() => loadOutfit(o)} className="block w-full text-left"><LookBoard items={items} className="rounded-none" /></button>
                  <div className="p-3.5">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="line-clamp-2 font-serif text-[17px] leading-tight text-ivoire">{o.name}</h3>
                      <button onClick={() => toggleFavorite(o.id)} aria-label="Favori" className={o.favorite ? 'text-champagne' : 'text-creme/30'}><Icon name="heart" size={17} className={o.favorite ? 'fill-champagne' : ''} /></button>
                    </div>
                    <div className="mt-3 flex gap-1.5">
                      <button onClick={() => loadOutfit(o, true)} className="flex-1 rounded-full border border-white/10 py-2 text-[10px] uppercase tracking-[0.14em] text-creme/70">Modifier</button>
                      <button onClick={() => { removeOutfit(o.id); toast('Look supprimé') }} className="rounded-full border border-white/10 px-3 text-creme/50" aria-label="Supprimer"><Icon name="trash" size={14} /></button>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>

      <Sheet open={saveOpen} onClose={() => setSaveOpen(false)} title={editingId ? 'Mettre à jour' : 'Enregistrer le look'}>
        <LookBoard items={worn} className="mx-auto mb-6 w-[62%]" />
        <label className="mb-5 block"><span className="caps mb-2 block">Nom</span><input className="field" value={name} onChange={(e) => setName(e.target.value)} /></label>
        <span className="caps mb-2 block">Occasion</span>
        <div className="mb-5 flex flex-wrap gap-2">{CONTEXTS.map((c) => <button key={c.id} onClick={() => setCtx(ctx === c.id ? '' : c.id)} className={cx('chip', ctx === c.id && 'chip-on')}>{c.label}</button>)}</div>
        <button onClick={() => setFav((f) => !f)} className={cx('mb-6 flex items-center gap-2 text-[12px] uppercase tracking-[0.16em]', fav ? 'text-champagne' : 'text-creme/50')}><Icon name="heart" size={16} className={fav ? 'fill-champagne' : ''} /> Ajouter aux favoris</button>
        <button className="btn-gold w-full" onClick={confirmSave}>{editingId ? 'Mettre à jour' : 'Enregistrer'}</button>
      </Sheet>
    </div>
  )
}
