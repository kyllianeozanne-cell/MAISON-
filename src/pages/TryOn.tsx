import { motion } from 'framer-motion'
import { lazy, Suspense, useMemo, useRef, useState } from 'react'
import { AvatarEditor } from '../components/AvatarEditor'
import { GarmentThumb } from '../components/GarmentThumb'
import { OutfitCollage, orderItems } from '../components/Look'
import { PhotoAvatar, fitOf } from '../components/PhotoAvatar'
import { Empty, Header, Icon, Sheet, Spinner, toast } from '../components/ui'
import { CONTEXTS, SLOT_LABEL, slotOf } from '../lib/constants'
import { suggest } from '../lib/stylist'
import { useStore } from '../lib/store'
import { useWeather } from '../lib/weatherStore'
import { cx, longDate, ymd } from '../lib/utils'
import type { Context, Fit, Garment, Outfit, Slot } from '../types'

const AvatarView = lazy(() => import('../components/Avatar3D').then((m) => ({ default: m.AvatarView })))
const SLOTS: Slot[] = ['top', 'bottom', 'outer', 'shoes', 'accessory', 'suit']
interface Snap { tryOn: string[]; fit: Record<string, Fit> }

export function TryOn({ goStylist }: { goStylist: () => void }) {
  const { garments, avatar, tryOn, outfits } = useStore()
  const { setAvatar, toggleTryOn, setTryOn, clearTryOn, saveOutfit, updateOutfit, toggleFavorite, removeOutfit, logOutfit } = useStore()
  const settings = useStore((s) => s.settings)
  const weather = useWeather((s) => s.weather)
  const [slot, setSlot] = useState<Slot>('top')
  const [rotate, setRotate] = useState(false)
  const [use3d, setUse3d] = useState(false)
  const [editor, setEditor] = useState(false)
  const [saveOpen, setSaveOpen] = useState(false)
  const [name, setName] = useState('')
  const [ctx, setCtx] = useState<Context | ''>('')
  const [fav, setFav] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [selId, setSelId] = useState<string | null>(null)
  const past = useRef<Snap[]>([])
  const future = useRef<Snap[]>([])
  const [, bump] = useState(0)
  const scroller = useRef<HTMLDivElement>(null)

  const available = useMemo(() => garments.filter((g) => g.status === 'available'), [garments])
  const worn = useMemo(() => tryOn.map((id) => garments.find((g) => g.id === id)).filter((g): g is Garment => !!g), [tryOn, garments])
  const slots = SLOTS.filter((s) => available.some((g) => slotOf(g.category) === s))
  const activeSlot = slots.includes(slot) ? slot : slots[0]
  const list = available.filter((g) => slotOf(g.category) === activeSlot)
  const wornIds = new Set(tryOn)
  const inSlot = (s: Slot) => worn.find((g) => slotOf(g.category) === s)
  const layers = worn.filter((g) => slotOf(g.category) !== 'accessory')
  const sel = layers.find((g) => g.id === selId)
  const selFit = sel ? fitOf(avatar.fit, sel) : null

  /* ---- historique (annuler / rétablir) ---- */
  const current = (): Snap => ({ tryOn: [...tryOn], fit: { ...(avatar.fit ?? {}) } })
  const snap = () => { past.current.push(current()); if (past.current.length > 40) past.current.shift(); future.current = []; bump((n) => n + 1) }
  const restore = (s: Snap) => { setTryOn(s.tryOn); setAvatar({ fit: s.fit }); setSelId(null); bump((n) => n + 1) }
  const undo = () => { const p = past.current.pop(); if (!p) return; future.current.push(current()); restore(p) }
  const redo = () => { const f = future.current.pop(); if (!f) return; past.current.push(current()); restore(f) }

  const choose = (id: string) => {
    snap()
    const was = tryOn.includes(id)
    toggleTryOn(id)
    setSelId(was ? (selId === id ? null : selId) : id)
  }
  const clear = () => { snap(); clearTryOn(); setEditingId(null); setSelId(null) }
  const resetFits = () => { snap(); setAvatar({ fit: {} }); toast('Positions réinitialisées') }
  const setFit = (g: Garment, patch: Partial<Fit>) => setAvatar({ fit: { ...(avatar.fit ?? {}), [g.id]: { ...fitOf(avatar.fit, g), ...patch } } })
  const fitFor = (ids: string[]) => Object.fromEntries(ids.filter((i) => avatar.fit?.[i]).map((i) => [i, avatar.fit[i]]))

  const shuffle = () => {
    const looks = suggest(garments, weather, { context: 'quotidien', tone: 'default', mustInclude: [], avoidIds: tryOn, count: 1, prefs: { styles: settings.favStyles ?? [], colors: settings.favColors ?? [] } })
    if (!looks[0]) return toast('Il faut au moins un haut et un bas disponibles.')
    snap(); setTryOn(looks[0].itemIds); setSelId(null); toast('Nouvelle combinaison')
  }
  const share = async () => {
    if (worn.length === 0) return toast('Compose d’abord une tenue.')
    const text = `MAISON — ${name || 'Ma tenue'}\n` + orderItems(worn).map((g) => `• ${g.name}${g.brand ? ` (${g.brand})` : ''}`).join('\n')
    try { if (navigator.share) await navigator.share({ title: 'MAISON', text }); else { await navigator.clipboard.writeText(text); toast('Composition copiée') } } catch { /* annulé */ }
  }
  const dateLabel = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
  const openSave = () => {
    if (worn.length === 0) return toast('Ajoute au moins une pièce.')
    const ed = editingId ? outfits.find((o) => o.id === editingId) : null
    setName(ed?.name ?? `Tenue du ${dateLabel}`); setCtx(ed?.context ?? ''); setFav(ed?.favorite ?? false); setSaveOpen(true)
  }
  const confirmSave = () => {
    const n = name.trim() || 'Ma tenue'
    if (editingId) { updateOutfit(editingId, { name: n, itemIds: tryOn, context: ctx, favorite: fav, fit: fitFor(tryOn) }); toast('Tenue mise à jour') }
    else { saveOutfit(n, tryOn, ctx, fav, fitFor(tryOn)); toast(fav ? 'Tenue enregistrée en favori' : 'Tenue enregistrée') }
    setEditingId(null); setSaveOpen(false)
  }
  const loadOutfit = (o: Outfit, edit = false) => {
    snap(); setTryOn(o.itemIds); setAvatar({ fit: { ...(o.fit ?? {}) } }); setEditingId(edit ? o.id : null); setSelId(null)
    scroller.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    toast(edit ? 'Modification de la tenue' : 'Tenue essayée')
  }

  if (garments.length === 0) {
    return (
      <div className="pb-32">
        <Header eyebrow="Compose tes tenues sur ta photo" title="Essayage" />
        <Empty icon="avatar" title="Rien à essayer encore" text="Ajoute des pièces à ton dressing pour les voir sur toi." action={<button className="btn-ghost" onClick={() => setEditor(true)}>Importer ma photo</button>} />
        <AvatarEditor open={editor} onClose={() => setEditor(false)} />
      </div>
    )
  }

  const iconBtn = (icon: string, label: string, on: () => void, disabled = false) => (
    <button key={label} onClick={on} disabled={disabled} aria-label={label} className={cx('flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-noir/70 text-creme/80 backdrop-blur', disabled && 'opacity-30')}><Icon name={icon} size={17} /></button>
  )

  return (
    <div className="pb-32">
      <Header eyebrow="Compose tes tenues sur ta photo" title="Essayage" right={<button onClick={() => setEditor(true)} className="btn-ghost !px-4 !py-2.5"><Icon name="avatar" size={14} /> Ma photo</button>} />

      <div ref={scroller} className="relative mx-6 overflow-hidden rounded-[20px] border border-white/[0.05] bg-gradient-to-b from-brun to-anthracite shadow-depth">
        <div className="h-[56vh] min-h-[380px] max-h-[560px]">
          {avatar.photo ? (
            <PhotoAvatar photo={avatar.photo} items={worn} fit={avatar.fit} neck={avatar.neck ?? 0.15} selectedId={selId} onSelect={setSelId} onStart={snap} onFit={(id, f) => setAvatar({ fit: { ...(avatar.fit ?? {}), [id]: f } })} />
          ) : use3d ? (
            <Suspense fallback={<div className="flex h-full items-center justify-center"><Spinner /></div>}>
              <AvatarView config={avatar} items={worn} autoRotate={rotate} />
            </Suspense>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-4 px-8 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full border border-champagne/30 text-champagne"><Icon name="avatar" size={26} stroke={1} /></div>
              <p className="max-w-[260px] text-[13px] leading-relaxed text-creme/60">Importe une photo de toi en pied : tes pièces se posent dessus et tu peux les ajuster.</p>
              <button className="btn-gold" onClick={() => setEditor(true)}>Importer ma photo</button>
              <button className="text-[11px] uppercase tracking-[0.18em] text-creme/40 underline underline-offset-4" onClick={() => setUse3d(true)}>Utiliser le mannequin 3D</button>
            </div>
          )}
        </div>
        <div className="absolute right-3 top-3 z-10 flex flex-col gap-2">
          {iconBtn('undo', 'Annuler', undo, past.current.length === 0)}
          {iconBtn('redo', 'Rétablir', redo, future.current.length === 0)}
          {iconBtn('x', 'Tout retirer', clear, worn.length === 0)}
          {avatar.photo ? iconBtn('rotate', 'Réinitialiser les positions', resetFits) : use3d ? iconBtn('rotate', 'Rotation automatique', () => setRotate((r) => !r)) : null}
        </div>
        {(avatar.photo || use3d) && <p className="pointer-events-none absolute inset-x-4 bottom-2.5 z-10 text-center text-[9.5px] uppercase tracking-[0.16em] text-creme/40">{avatar.photo ? 'Montage sur ta photo · pas un ajustement réel' : 'Aperçu indicatif · couleurs et volumes'}</p>}
      </div>

      {avatar.photo && layers.length > 0 && (
        <div className="card mx-6 mt-3 p-4">
          {sel && selFit ? (
            <>
              <div className="mb-3 flex items-center justify-between"><span className="line-clamp-1 text-[12.5px] text-ivoire">{sel.name}</span><button className="chip" onClick={() => setSelId(null)}>OK</button></div>
              <label className="mb-3 block"><span className="caps mb-2 block">Taille</span><input type="range" min={0.1} max={0.95} step={0.01} value={selFit.s} onPointerDown={() => snap()} onChange={(e) => setFit(sel, { s: Number(e.target.value) })} /></label>
              <label className="mb-3 block"><span className="caps mb-2 block">Rotation · {Math.round(selFit.r ?? 0)}°</span><input type="range" min={-45} max={45} step={1} value={selFit.r ?? 0} onPointerDown={() => snap()} onChange={(e) => setFit(sel, { r: Number(e.target.value) })} /></label>
              <button className="chip" onClick={() => { snap(); const n = { ...(avatar.fit ?? {}) }; delete n[sel.id]; setAvatar({ fit: n }) }}>Réinitialiser cette pièce</button>
            </>
          ) : <p className="text-[11.5px] leading-relaxed text-creme/50">Touche une pièce sur la photo pour la déplacer, la redimensionner ou la faire pivoter.</p>}
          <label className="mt-4 block"><span className="caps mb-2 block">Ligne du cou · protège le visage</span><input type="range" min={0.04} max={0.3} step={0.005} value={avatar.neck ?? 0.15} onChange={(e) => setAvatar({ neck: Number(e.target.value) })} /></label>
        </div>
      )}

      {editingId && <p className="mx-6 mt-3 text-center text-[11px] uppercase tracking-[0.18em] text-champagne">Modification d’une tenue enregistrée</p>}

      <div className="no-scrollbar mt-6 flex gap-2 overflow-x-auto px-6">
        {slots.map((s) => <button key={s} onClick={() => setSlot(s)} className={cx('chip', activeSlot === s && 'chip-on')}>{SLOT_LABEL[s]}{inSlot(s) ? ' ·' : ''}</button>)}
      </div>
      <div className="no-scrollbar mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-6 pb-2">
        {inSlot(activeSlot) && activeSlot !== 'accessory' && (
          <button onClick={() => choose(inSlot(activeSlot)!.id)} className="flex aspect-[4/5] w-[88px] shrink-0 snap-start flex-col items-center justify-center gap-2 rounded-maison border border-dashed border-champagne/40 text-champagne"><Icon name="x" size={18} /><span className="text-[9px] uppercase tracking-[0.16em]">Retirer</span></button>
        )}
        {list.map((g) => {
          const on = wornIds.has(g.id)
          return (
            <motion.button key={g.id} whileTap={{ scale: 0.96 }} onClick={() => choose(g.id)} className={cx('relative w-[88px] shrink-0 snap-start overflow-hidden rounded-maison border transition', on ? 'border-champagne shadow-gold' : 'border-transparent')}>
              <GarmentThumb garment={g} className="aspect-[4/5]" />
              {on && <span className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-champagne text-noir"><Icon name="check" size={12} stroke={2} /></span>}
            </motion.button>
          )
        })}
      </div>

      <div className="mx-6 mt-5 grid grid-cols-2 gap-3">
        <button className="btn-gold col-span-2" onClick={openSave}><Icon name="check" size={16} /> {editingId ? 'Mettre à jour la tenue' : 'Enregistrer la tenue'}</button>
        <button className="btn-ghost" onClick={() => { if (worn.length === 0) return toast('Compose d’abord une tenue.'); saveOutfit(`Favori du ${dateLabel}`, tryOn, '', true, fitFor(tryOn)); toast('Ajoutée aux favoris') }}><Icon name="heart" size={16} /> Favori</button>
        <button className="btn-ghost" onClick={shuffle}><Icon name="shuffle" size={16} /> Autre combinaison</button>
        <button className="btn-ghost" onClick={share}><Icon name="share" size={16} /> Partager</button>
        <button className="btn-ghost" onClick={() => { if (worn.length === 0) return toast('Compose d’abord une tenue.'); logOutfit(ymd(), tryOn); toast(`Portée aujourd’hui · ${longDate()}`) }}><Icon name="calendar" size={16} /> Porter aujourd’hui</button>
      </div>
      <button onClick={goStylist} className="mx-auto mt-5 block text-[11px] uppercase tracking-[0.18em] text-creme/40 underline underline-offset-4">Demander au styliste</button>

      <section className="mt-10">
        <div className="mb-4 flex items-baseline justify-between px-6"><h2 className="title-serif text-[26px]">Mes tenues</h2><span className="caps !text-creme/40">{outfits.length}</span></div>
        {outfits.length === 0 ? (
          <Empty icon="layers" title="Aucune tenue enregistrée" text="Compose une tenue puis enregistre-la : elle apparaîtra ici avec sa composition et ses réglages." />
        ) : (
          <div className="grid grid-cols-2 gap-4 px-6">
            {outfits.map((o) => {
              const items = o.itemIds.map((id) => garments.find((g) => g.id === id)).filter((g): g is Garment => !!g)
              return (
                <article key={o.id} className="card overflow-hidden">
                  <button onClick={() => loadOutfit(o)} className="block w-full text-left"><OutfitCollage items={items} className="rounded-none" /></button>
                  <div className="p-3.5">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="line-clamp-2 font-serif text-[17px] leading-tight text-ivoire">{o.name}</h3>
                      <button onClick={() => toggleFavorite(o.id)} aria-label="Favori" className={o.favorite ? 'text-champagne' : 'text-creme/30'}><Icon name="heart" size={17} className={o.favorite ? 'fill-champagne' : ''} /></button>
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
        <label className="mb-5 block"><span className="caps mb-2 block">Nom</span><input className="field" value={name} onChange={(e) => setName(e.target.value)} /></label>
        <span className="caps mb-2 block">Contexte</span>
        <div className="mb-5 flex flex-wrap gap-2">{CONTEXTS.map((c) => <button key={c.id} onClick={() => setCtx(ctx === c.id ? '' : c.id)} className={cx('chip', ctx === c.id && 'chip-on')}>{c.label}</button>)}</div>
        <button onClick={() => setFav((f) => !f)} className={cx('mb-6 flex items-center gap-2 text-[12px] uppercase tracking-[0.16em]', fav ? 'text-champagne' : 'text-creme/50')}><Icon name="heart" size={16} className={fav ? 'fill-champagne' : ''} /> Ajouter aux favoris</button>
        <button className="btn-gold w-full" onClick={confirmSave}>{editingId ? 'Mettre à jour' : 'Enregistrer'}</button>
      </Sheet>
      <AvatarEditor open={editor} onClose={() => setEditor(false)} />
    </div>
  )
}
