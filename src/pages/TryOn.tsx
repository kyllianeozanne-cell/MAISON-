import { motion } from 'framer-motion'
import { useMemo, useRef, useState } from 'react'
import { AvatarEditor } from '../components/AvatarEditor'
import { AvatarView } from '../components/Avatar3D'
import { GarmentThumb } from '../components/GarmentThumb'
import { OutfitCollage, orderItems } from '../components/Look'
import { Empty, Header, Icon, Sheet, toast } from '../components/ui'
import { CONTEXTS, SLOT_LABEL, slotOf } from '../lib/constants'
import { suggest } from '../lib/stylist'
import { useStore } from '../lib/store'
import { useWeather } from '../lib/weatherStore'
import { cx, longDate, ymd } from '../lib/utils'
import type { Context, Garment, Outfit, Slot } from '../types'

const SLOTS: Slot[] = ['top', 'bottom', 'outer', 'shoes', 'accessory', 'suit']

export function TryOn({ goStylist }: { goStylist: () => void }) {
  const { garments, avatar, tryOn, outfits } = useStore()
  const { toggleTryOn, setTryOn, clearTryOn, saveOutfit, updateOutfit, toggleFavorite, removeOutfit, logOutfit } = useStore()
  const weather = useWeather((s) => s.weather)
  const [slot, setSlot] = useState<Slot>('top')
  const [rotate, setRotate] = useState(false)
  const [editor, setEditor] = useState(false)
  const [saveOpen, setSaveOpen] = useState(false)
  const [name, setName] = useState('')
  const [ctx, setCtx] = useState<Context | ''>('')
  const [fav, setFav] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const scroller = useRef<HTMLDivElement>(null)

  const available = useMemo(() => garments.filter((g) => g.status === 'available'), [garments])
  const worn = useMemo(() => tryOn.map((id) => garments.find((g) => g.id === id)).filter((g): g is Garment => !!g), [tryOn, garments])
  const slotCounts = useMemo(() => {
    const m: Record<string, number> = {}
    for (const g of available) m[slotOf(g.category)] = (m[slotOf(g.category)] ?? 0) + 1
    return m
  }, [available])
  const list = useMemo(() => available.filter((g) => slotOf(g.category) === slot), [available, slot])
  const slots = SLOTS.filter((s) => slotCounts[s])
  const activeSlot = slots.includes(slot) ? slot : slots[0]
  const wornIds = new Set(tryOn)
  const currentInSlot = (s: Slot) => worn.find((g) => slotOf(g.category) === s)

  const shuffle = () => {
    const looks = suggest(garments, weather, { context: 'quotidien', tone: 'default', mustInclude: [], avoidIds: tryOn, count: 1 })
    if (!looks[0]) return toast('Il faut au moins un haut et un bas disponibles.')
    setTryOn(looks[0].itemIds)
    toast('Nouvelle combinaison')
  }

  const share = async () => {
    if (worn.length === 0) return toast('Compose d’abord une tenue.')
    const text = `MAISON — ${name || 'Ma tenue'}\n` + orderItems(worn).map((g) => `• ${g.name}${g.brand ? ` (${g.brand})` : ''}`).join('\n')
    try {
      if (navigator.share) await navigator.share({ title: 'MAISON', text })
      else { await navigator.clipboard.writeText(text); toast('Composition copiée') }
    } catch { /* partage annulé */ }
  }

  const openSave = () => {
    if (worn.length === 0) return toast('Ajoute au moins une pièce à l’avatar.')
    const ed = editingId ? outfits.find((o) => o.id === editingId) : null
    setName(ed?.name ?? `Tenue du ${new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}`)
    setCtx(ed?.context ?? '')
    setFav(ed?.favorite ?? false)
    setSaveOpen(true)
  }

  const confirmSave = () => {
    const n = name.trim() || 'Ma tenue'
    if (editingId) { updateOutfit(editingId, { name: n, itemIds: tryOn, context: ctx, favorite: fav }); toast('Tenue mise à jour') }
    else { saveOutfit(n, tryOn, ctx, fav); toast(fav ? 'Tenue enregistrée en favori' : 'Tenue enregistrée') }
    setEditingId(null)
    setSaveOpen(false)
  }

  const loadOutfit = (o: Outfit, edit = false) => {
    setTryOn(o.itemIds)
    setEditingId(edit ? o.id : null)
    scroller.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    toast(edit ? 'Modification de la tenue' : 'Tenue essayée')
  }

  if (garments.length === 0) {
    return (
      <div className="pb-32">
        <Header eyebrow="Fitting room" title="Try on" />
        <Empty icon="avatar" title="Rien à essayer encore" text="Ajoute des pièces à ton dressing pour les voir sur ton avatar." action={<button className="btn-ghost" onClick={() => setEditor(true)}>Régler mon avatar</button>} />
        <AvatarEditor open={editor} onClose={() => setEditor(false)} />
      </div>
    )
  }

  return (
    <div className="pb-32">
      <Header
        eyebrow="Fitting room"
        title="Try on"
        right={<button onClick={() => setEditor(true)} className="btn-ghost !px-4 !py-2.5"><Icon name="edit" size={14} /> Avatar</button>}
      />

      <div ref={scroller} className="relative mx-6 overflow-hidden rounded-[20px] border border-white/[0.05] bg-gradient-to-b from-brun to-anthracite shadow-depth">
        <div className="h-[50vh] min-h-[360px] max-h-[520px]">
          <AvatarView config={avatar} items={worn} autoRotate={rotate} />
        </div>
        <div className="absolute right-3 top-3 flex flex-col gap-2">
          {[
            { i: 'rotate', on: () => setRotate((r) => !r), active: rotate, l: 'Rotation automatique' },
            { i: 'undo', on: () => { clearTryOn(); setEditingId(null) }, active: false, l: 'Tout retirer' },
          ].map((b) => (
            <button key={b.i} onClick={b.on} aria-label={b.l} className={cx('flex h-10 w-10 items-center justify-center rounded-full border bg-noir/70 backdrop-blur', b.active ? 'border-champagne text-champagne' : 'border-white/10 text-creme/70')}>
              <Icon name={b.i} size={17} />
            </button>
          ))}
        </div>
        <p className="absolute inset-x-4 bottom-2.5 text-center text-[9.5px] uppercase tracking-[0.16em] text-creme/35">
          Aperçu indicatif · couleurs et volumes, pas la coupe réelle
        </p>
      </div>

      {editingId && <p className="mx-6 mt-3 text-center text-[11px] uppercase tracking-[0.18em] text-champagne">Modification d’une tenue enregistrée</p>}

      {/* Sélecteur par emplacement */}
      <div className="no-scrollbar mt-6 flex gap-2 overflow-x-auto px-6">
        {slots.map((s) => (
          <button key={s} onClick={() => setSlot(s)} className={cx('chip', activeSlot === s && 'chip-on')}>
            {SLOT_LABEL[s]}{currentInSlot(s) ? ' ·' : ''}
          </button>
        ))}
      </div>

      <div className="no-scrollbar mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-6 pb-2">
        {currentInSlot(activeSlot) && activeSlot !== 'accessory' && (
          <button onClick={() => toggleTryOn(currentInSlot(activeSlot)!.id)} className="flex aspect-[4/5] w-[88px] shrink-0 snap-start flex-col items-center justify-center gap-2 rounded-maison border border-dashed border-champagne/40 text-champagne">
            <Icon name="x" size={18} /><span className="text-[9px] uppercase tracking-[0.16em]">Retirer</span>
          </button>
        )}
        {(activeSlot === slot ? list : available.filter((g) => slotOf(g.category) === activeSlot)).map((g) => {
          const on = wornIds.has(g.id)
          return (
            <motion.button
              key={g.id}
              whileTap={{ scale: 0.96 }}
              onClick={() => toggleTryOn(g.id)}
              className={cx('relative w-[88px] shrink-0 snap-start overflow-hidden rounded-maison border transition', on ? 'border-champagne shadow-gold' : 'border-transparent')}
            >
              <GarmentThumb garment={g} className="aspect-[4/5]" />
              {on && <span className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-champagne text-noir"><Icon name="check" size={12} stroke={2} /></span>}
            </motion.button>
          )
        })}
      </div>

      {/* Actions */}
      <div className="mx-6 mt-5 grid grid-cols-2 gap-3">
        <button className="btn-gold col-span-2" onClick={openSave}><Icon name="check" size={16} /> {editingId ? 'Mettre à jour la tenue' : 'Enregistrer la tenue'}</button>
        <button className="btn-ghost" onClick={() => { if (worn.length === 0) return toast('Compose d’abord une tenue.'); setFav(true); setName(`Favori du ${new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}`); saveOutfit(`Favori du ${new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}`, tryOn, '', true); toast('Ajoutée aux favoris') }}>
          <Icon name="heart" size={16} /> Favori
        </button>
        <button className="btn-ghost" onClick={shuffle}><Icon name="shuffle" size={16} /> Autre combinaison</button>
        <button className="btn-ghost" onClick={share}><Icon name="share" size={16} /> Partager</button>
        <button className="btn-ghost" onClick={() => { if (worn.length === 0) return toast('Compose d’abord une tenue.'); logOutfit(ymd(), tryOn); toast(`Portée aujourd’hui · ${longDate()}`) }}>
          <Icon name="calendar" size={16} /> Porter aujourd’hui
        </button>
      </div>
      <button onClick={goStylist} className="mx-auto mt-5 block text-[11px] uppercase tracking-[0.18em] text-creme/40 underline underline-offset-4">Demander au styliste</button>

      {/* Bibliothèque */}
      <section className="mt-10">
        <div className="mb-4 flex items-baseline justify-between px-6">
          <h2 className="title-serif text-[26px]">Mes tenues</h2>
          <span className="caps !text-creme/40">{outfits.length}</span>
        </div>
        {outfits.length === 0 ? (
          <Empty icon="layers" title="Aucune tenue enregistrée" text="Compose une tenue sur ton avatar puis enregistre-la : elle apparaîtra ici avec sa composition." />
        ) : (
          <div className="grid grid-cols-2 gap-4 px-6">
            {outfits.map((o) => {
              const items = o.itemIds.map((id) => garments.find((g) => g.id === id)).filter((g): g is Garment => !!g)
              return (
                <article key={o.id} className="card overflow-hidden">
                  <button onClick={() => loadOutfit(o)} className="block w-full text-left">
                    <OutfitCollage items={items} className="rounded-none" />
                  </button>
                  <div className="p-3.5">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="line-clamp-2 font-serif text-[17px] leading-tight text-ivoire">{o.name}</h3>
                      <button onClick={() => toggleFavorite(o.id)} aria-label="Favori" className={o.favorite ? 'text-champagne' : 'text-creme/30'}>
                        <Icon name="heart" size={17} className={o.favorite ? 'fill-champagne' : ''} />
                      </button>
                    </div>
                    <p className="mt-1.5 line-clamp-2 text-[11px] leading-snug text-creme/45">{orderItems(items).map((g) => g.name).join(' · ')}</p>
                    <div className="mt-3 flex gap-1.5">
                      <button onClick={() => loadOutfit(o, true)} className="flex-1 rounded-full border border-white/10 py-2 text-[10px] uppercase tracking-[0.14em] text-creme/70">Modifier</button>
                      <button onClick={() => { removeOutfit(o.id); toast('Tenue supprimée') }} className="rounded-full border border-white/10 px-3 text-creme/50" aria-label="Supprimer"><Icon name="trash" size={14} /></button>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>

      <Sheet open={saveOpen} onClose={() => setSaveOpen(false)} title={editingId ? 'Mettre à jour' : 'Enregistrer la tenue'}>
        <OutfitCollage items={worn} className="mx-auto mb-6 w-[70%]" />
        <label className="mb-5 block">
          <span className="caps mb-2 block">Nom</span>
          <input className="field" value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <span className="caps mb-2 block">Contexte</span>
        <div className="mb-5 flex flex-wrap gap-2">
          {CONTEXTS.map((c) => <button key={c.id} onClick={() => setCtx(ctx === c.id ? '' : c.id)} className={cx('chip', ctx === c.id && 'chip-on')}>{c.label}</button>)}
        </div>
        <button onClick={() => setFav((f) => !f)} className={cx('mb-6 flex items-center gap-2 text-[12px] uppercase tracking-[0.16em]', fav ? 'text-champagne' : 'text-creme/50')}>
          <Icon name="heart" size={16} className={fav ? 'fill-champagne' : ''} /> Ajouter aux favoris
        </button>
        <button className="btn-gold w-full" onClick={confirmSave}>{editingId ? 'Mettre à jour' : 'Enregistrer'}</button>
      </Sheet>
      <AvatarEditor open={editor} onClose={() => setEditor(false)} />
    </div>
  )
}
