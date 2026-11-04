import { useMemo, useRef, useState } from 'react'
import { LocationPicker } from '../components/LocationPicker'
import { GarmentThumb } from '../components/GarmentThumb'
import { OutfitCollage } from '../components/Look'
import { ColorDot, Empty, Header, Icon, Segmented, Sheet, toast } from '../components/ui'
import { CATEGORIES, CAT_BY_ID, STYLES, slotOf } from '../lib/constants'
import { colorName, NAMED_COLORS } from '../lib/colors'
import { aiConfigured } from '../lib/ai'
import { demoGarments } from '../lib/demo'
import { supabase } from '../lib/supabase'
import { usable, warmthOf, targetWarmth } from '../lib/stylist'
import { useStore } from '../lib/store'
import { fetchTripWeather } from '../lib/weather'
import { cx, eur, parseYmd, ymd } from '../lib/utils'
import type { CategoryId, Garment, GeoPoint } from '../types'

type Sub = 'stats' | 'style' | 'calendar' | 'trip' | 'wish' | 'capsule' | 'settings'

function Bars({ data }: { data: { label: string; n: number; color?: string }[] }) {
  const max = Math.max(1, ...data.map((d) => d.n))
  return (
    <div className="space-y-3">
      {data.map((d) => (
        <div key={d.label}>
          <div className="mb-1 flex justify-between text-[12px]"><span className="flex items-center gap-2 text-ivoire">{d.color && <ColorDot color={d.color} size={10} />}{d.label}</span><span className="text-creme/50">{d.n}</span></div>
          <div className="h-[3px] rounded-full bg-white/10"><div className="h-full rounded-full bg-champagne" style={{ width: `${(d.n / max) * 100}%` }} /></div>
        </div>
      ))}
    </div>
  )
}

const Block = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="card mb-5 p-5"><div className="caps mb-4">{title}</div>{children}</div>
)

function GarmentRow({ g, sub }: { g: Garment; sub: string }) {
  return (
    <div className="flex items-center gap-3 border-b border-white/[0.05] py-2.5 last:border-0">
      <GarmentThumb garment={g} className="h-12 w-10 shrink-0 rounded-md" />
      <span className="flex-1 truncate text-[13px] text-ivoire">{g.name}</span>
      <span className="text-[11px] text-creme/45">{sub}</span>
    </div>
  )
}

const GROUP_LABEL: Record<string, string> = { top: 'Hauts', bottom: 'Bas', outer: 'Vestes', suit: 'Costumes', shoes: 'Chaussures', accessory: 'Accessoires' }
function Donut({ data }: { data: { label: string; n: number }[] }) {
  const total = data.reduce((a, d) => a + d.n, 0) || 1
  const shades = ['#E8DFD0', '#C5AD83', '#8f7d5d', '#5e5340', '#3a342b', '#2a2622']
  const C = 2 * Math.PI * 52
  let acc = 0
  return (
    <div className="flex items-center gap-6">
      <svg viewBox="0 0 140 140" className="h-36 w-36 shrink-0 -rotate-90">
        <circle cx="70" cy="70" r="52" fill="none" stroke="#191918" strokeWidth="22" />
        {data.map((d, i) => {
          const len = (d.n / total) * C
          const el = <circle key={d.label} cx="70" cy="70" r="52" fill="none" stroke={shades[i % shades.length]} strokeWidth="22" strokeDasharray={`${Math.max(0, len - 1.5)} ${C}`} strokeDashoffset={-acc} />
          acc += len
          return el
        })}
      </svg>
      <div className="flex-1 space-y-2">
        {data.map((d, i) => (
          <div key={d.label} className="flex items-center justify-between text-[12px]">
            <span className="flex items-center gap-2 text-ivoire"><ColorDot color={shades[i % shades.length]} size={9} />{d.label}</span>
            <span className="text-creme/50">{Math.round((d.n / total) * 100)} %</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ---------- Statistiques ---------- */
function Stats() {
  const all = useStore((s) => s.garments)
  const outfitCount = useStore((s) => s.outfits.length)
  const g = all.filter((x) => x.status !== 'archived')
  const top = (keyFn: (x: Garment) => string, n = 6, hex?: (x: Garment) => string) => {
    const m = new Map<string, { n: number; color?: string }>()
    g.forEach((x) => { const k = keyFn(x); if (!k) return; const e = m.get(k) ?? { n: 0, color: hex?.(x) }; e.n++; m.set(k, e) })
    return [...m.entries()].sort((a, b) => b[1].n - a[1].n).slice(0, n).map(([label, v]) => ({ label, ...v }))
  }
  const priced = g.filter((x) => x.price != null)
  const total = priced.reduce((a, x) => a + (x.price ?? 0), 0)
  const worn = priced.filter((x) => x.wornDates.length > 0)
  const perWear = worn.length ? worn.reduce((a, x) => a + (x.price ?? 0) / x.wornDates.length, 0) / worn.length : null
  const most = [...g].filter((x) => x.wornDates.length).sort((a, b) => b.wornDates.length - a.wornDates.length).slice(0, 5)
  const never = g.filter((x) => x.wornDates.length === 0)
  if (g.length === 0) return <Empty icon="chart" title="Pas encore de données" text="Tes statistiques apparaîtront dès que ton dressing contiendra des pièces." />
  return (
    <div>
      <div className="mb-5 grid grid-cols-3 gap-3">
        {[['Pièces', String(g.length)], ['Tenues', String(outfitCount)], ['Marques', String(new Set(g.map((x) => x.brand).filter(Boolean)).size)]].map(([k, v]) => (
          <div key={k} className="card p-4 text-center"><div className="title-serif text-[26px]">{v}</div><div className="caps mt-1 !text-[9px]">{k}</div></div>
        ))}
      </div>
      <Block title="Répartition par catégorie"><Donut data={top((x) => GROUP_LABEL[slotOf(x.category)], 6)} /></Block>
      <Block title="Valeur du dressing"><div className="flex justify-between text-[13px] text-ivoire"><span>{priced.length ? eur(total) : 'Prix non renseignés'}</span><span className="text-creme/50">{perWear != null ? `${eur(Math.round(perWear))} par port` : ''}</span></div></Block>
      <Block title="Couleurs dominantes"><Bars data={top((x) => colorName(x.color), 6, (x) => x.color)} /></Block>
      <Block title="Marques"><Bars data={top((x) => x.brand, 6)} /></Block>
      <Block title="Les plus portées">{most.length ? most.map((x) => <GarmentRow key={x.id} g={x} sub={`${x.wornDates.length}×`} />) : <p className="text-[12px] text-creme/45">Enregistre tes tenues dans le calendrier.</p>}</Block>
      <Block title={`Jamais portées (${never.length})`}>{never.slice(0, 8).map((x) => <GarmentRow key={x.id} g={x} sub="—" />)}{never.length === 0 && <p className="text-[12px] text-creme/45">Tout a été porté.</p>}</Block>
    </div>
  )
}

/* ---------- Calendrier ---------- */
function CalendarView() {
  const { calendar, outfits, garments, tryOn, logOutfit, removeEntry, markPlannedWorn } = useStore()
  const [cur, setCur] = useState(() => { const d = new Date(); d.setDate(1); return d })
  const [sel, setSel] = useState<string | null>(null)
  const byId = (ids: string[]) => ids.map((i) => garments.find((x) => x.id === i)).filter((x): x is Garment => !!x)
  const first = (cur.getDay() + 6) % 7
  const days = new Date(cur.getFullYear(), cur.getMonth() + 1, 0).getDate()
  const key = (d: number) => ymd(new Date(cur.getFullYear(), cur.getMonth(), d))
  const entry = sel ? calendar.find((e) => e.date === sel) : undefined
  const future = sel ? sel > ymd() : false
  const forgotten = useMemo(() => {
    const lim = ymd(new Date(Date.now() - 45 * 86400000))
    return usable(garments).filter((g) => !g.wornDates.some((d) => d >= lim)).slice(0, 6)
  }, [garments])
  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <button onClick={() => setCur(new Date(cur.getFullYear(), cur.getMonth() - 1, 1))} className="p-2 text-creme/60"><Icon name="chevronL" size={18} /></button>
        <h3 className="title-serif text-[24px] capitalize">{cur.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}</h3>
        <button onClick={() => setCur(new Date(cur.getFullYear(), cur.getMonth() + 1, 1))} className="p-2 text-creme/60"><Icon name="chevron" size={18} /></button>
      </div>
      <div className="grid grid-cols-7 gap-1.5 text-center">
        {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => <div key={i} className="caps !text-[9px] pb-1 !text-creme/35">{d}</div>)}
        {Array.from({ length: first }).map((_, i) => <div key={`e${i}`} />)}
        {Array.from({ length: days }).map((_, i) => {
          const k = key(i + 1); const e = calendar.find((x) => x.date === k)
          return (
            <button key={k} onClick={() => setSel(k)} className={cx('relative aspect-square rounded-lg border text-[12px]', k === ymd() ? 'border-champagne text-champagne' : 'border-white/[0.06] text-creme/70', e && !e.planned && 'bg-champagne/15', e?.planned && 'border-dashed border-champagne/60')}>
              {i + 1}{e && <span className={cx('absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full', e.planned ? 'bg-creme/60' : 'bg-champagne')} />}
            </button>
          )
        })}
      </div>
      <p className="mt-3 text-[10.5px] text-creme/35">Plein = portée · pointillé = planifiée</p>
      {forgotten.length > 0 && <div className="mt-7"><Block title="Oubliées depuis 45 jours">{forgotten.map((g) => <GarmentRow key={g.id} g={g} sub={g.wornDates.length ? 'ancien port' : 'jamais'} />)}</Block></div>}

      <Sheet open={!!sel} onClose={() => setSel(null)} title={sel ? parseYmd(sel).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }) : ''}>
        {sel && (
          <div>
            {entry && (
              <div className="mb-6">
                <OutfitCollage items={byId(entry.itemIds)} className="mx-auto mb-4 w-[70%]" />
                <p className="mb-4 text-center text-[11px] uppercase tracking-[0.18em] text-champagne">{entry.planned ? 'Tenue planifiée' : 'Tenue portée'}</p>
                <div className="flex gap-3">
                  {entry.planned && <button className="btn-gold flex-1" onClick={() => { markPlannedWorn(sel); toast('Marquée comme portée') }}>Portée</button>}
                  <button className="btn-ghost flex-1" onClick={() => { removeEntry(sel); toast('Entrée retirée') }}>Retirer</button>
                </div>
              </div>
            )}
            <div className="caps mb-3">{entry ? 'Remplacer par' : future ? 'Planifier' : 'Enregistrer'}</div>
            {tryOn.length > 0 && <button className="btn-ghost mb-3 w-full" onClick={() => { logOutfit(sel, tryOn, { planned: future }); toast('Enregistré'); setSel(null) }}>Utiliser l’avatar actuel</button>}
            {outfits.map((o) => (
              <button key={o.id} onClick={() => { logOutfit(sel, o.itemIds, { planned: future, outfitId: o.id }); toast('Enregistré'); setSel(null) }} className="mb-2 flex w-full items-center justify-between rounded-xl border border-white/[0.07] px-4 py-3 text-left text-[13.5px] text-ivoire">{o.name}<Icon name="chevron" size={14} className="text-creme/30" /></button>
            ))}
            {outfits.length === 0 && tryOn.length === 0 && <p className="text-[12px] text-creme/45">Compose une tenue dans « Try on » pour pouvoir l’enregistrer ici.</p>}
          </div>
        )}
      </Sheet>
    </div>
  )
}

/* ---------- Valise ---------- */
function Trip() {
  const garments = useStore((s) => s.garments)
  const [dest, setDest] = useState<GeoPoint | null>(null)
  const [pick, setPick] = useState(false)
  const [start, setStart] = useState(ymd())
  const [days, setDays] = useState(4)
  const [list, setList] = useState<Garment[] | null>(null)
  const [info, setInfo] = useState('')
  const [busy, setBusy] = useState(false)

  const build = async () => {
    if (!dest) return toast('Choisis une destination.')
    setBusy(true)
    const end = ymd(new Date(parseYmd(start).getTime() + (days - 1) * 86400000))
    const w = await fetchTripWeather(dest, start, end)
    const min = w?.min ?? 15, max = w?.max ?? 22, rain = (w?.rainDays ?? 0) > 0
    setInfo(w ? `${min}° – ${max}°, ${w.rainDays} jour(s) de pluie probable` : 'Prévisions indisponibles à cette date : liste basée sur la saison courante.')
    const feel = (min + max) / 2
    const want = (cat: CategoryId[], n: number) => usable(garments).filter((g) => cat.includes(g.category))
      .sort((a, b) => Math.abs(warmthOf(a) - (targetWarmth(feel) / 3)) - Math.abs(warmthOf(b) - (targetWarmth(feel) / 3))).slice(0, n)
    const slotPick = (slot: string, n: number) => {
      const pool = usable(garments).filter((g) => slotOf(g.category) === slot)
      return pool.sort((a, b) => Math.abs(warmthOf(a) - targetWarmth(feel) / 3) - Math.abs(warmthOf(b) - targetWarmth(feel) / 3)).slice(0, n)
    }
    void want
    const out = [
      ...slotPick('top', Math.min(7, Math.ceil(days * 0.7))),
      ...slotPick('bottom', Math.min(4, Math.ceil(days / 3) + 1)),
      ...slotPick('shoes', 2),
      ...(min < 15 || rain ? slotPick('outer', 1) : []),
      ...usable(garments).filter((g) => g.category === 'montre' || g.category === 'ceinture').slice(0, 2),
    ]
    setList(out)
    setBusy(false)
  }

  return (
    <div>
      <button onClick={() => setPick(true)} className="field mb-4 flex items-center justify-between text-left"><span className={dest ? 'text-ivoire' : 'text-creme/30'}>{dest?.label ?? 'Destination'}</span><Icon name="pin" size={16} /></button>
      <div className="mb-5 grid grid-cols-2 gap-4">
        <input type="date" className="field" value={start} onChange={(e) => setStart(e.target.value)} />
        <input type="number" min={1} max={16} className="field" value={days} onChange={(e) => setDays(Math.max(1, Math.min(16, Number(e.target.value) || 1)))} />
      </div>
      <button className="btn-gold mb-6 w-full" onClick={build} disabled={busy}><Icon name="suitcase" size={16} /> Préparer la valise</button>
      {list && (
        <Block title={`${list.length} pièces — ${info}`}>
          {list.length === 0 ? <p className="text-[12px] text-creme/45">Ton dressing ne contient pas encore assez de pièces.</p> : list.map((g) => <GarmentRow key={g.id} g={g} sub={CAT_BY_ID[g.category].label} />)}
        </Block>
      )}
      <LocationPicker open={pick} onClose={() => setPick(false)} onPick={setDest} />
    </div>
  )
}

/* ---------- Wishlist ---------- */
function Wish() {
  const { wishlist, garments, addWish, removeWish } = useStore()
  const [open, setOpen] = useState(false)
  const [f, setF] = useState({ name: '', brand: '', category: 'pull' as CategoryId, color: '#1c2b4a', price: '', url: '' })
  return (
    <div>
      <button className="btn-gold mb-6 w-full" onClick={() => setOpen(true)}><Icon name="plus" size={16} /> Ajouter un souhait</button>
      {wishlist.length === 0 && <Empty icon="star" title="Wishlist vide" text="Note ce que tu veux acheter : je le compare à ce que tu possèdes déjà." />}
      {wishlist.map((w) => {
        const same = garments.filter((g) => g.category === w.category && g.status !== 'archived')
        const dup = same.filter((g) => colorName(g.color) === colorName(w.color))
        return (
          <div key={w.id} className="card mb-4 p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3"><ColorDot color={w.color} size={16} /><div><div className="font-serif text-[19px] text-ivoire">{w.name}</div><div className="caps !text-creme/45">{w.brand || CAT_BY_ID[w.category].label}{w.price != null ? ` · ${eur(w.price)}` : ''}</div></div></div>
              <button onClick={() => removeWish(w.id)} className="text-creme/40" aria-label="Retirer"><Icon name="x" size={16} /></button>
            </div>
            <p className="mt-3 text-[12px] leading-relaxed text-creme/55">
              {dup.length ? `Tu possèdes déjà ${dup.length} ${CAT_BY_ID[w.category].label.toLowerCase()} de cette couleur (${dup.map((g) => g.name).join(', ')}).` : same.length ? `Tu as ${same.length} ${CAT_BY_ID[w.category].label.toLowerCase()}, aucun dans cette couleur : elle apporterait de la variété.` : `Aucun article de cette catégorie dans ton dressing : elle comblerait un manque.`}
            </p>
            {w.url && <a href={w.url} target="_blank" rel="noreferrer" className="caps mt-3 inline-block underline underline-offset-4">Voir l’article</a>}
          </div>
        )
      })}
      <Sheet open={open} onClose={() => setOpen(false)} title="Nouveau souhait" tall>
        <input className="field mb-3" placeholder="Nom" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        <input className="field mb-3" placeholder="Marque" value={f.brand} onChange={(e) => setF({ ...f, brand: e.target.value })} />
        <select className="field mb-3" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value as CategoryId })}>{CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</select>
        <label className="mb-3 flex items-center gap-3 text-[12px] text-creme/60">Couleur <input type="color" value={f.color} onChange={(e) => setF({ ...f, color: e.target.value })} /></label>
        <input className="field mb-3" type="number" placeholder="Prix €" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} />
        <input className="field mb-6" placeholder="Lien (facultatif)" value={f.url} onChange={(e) => setF({ ...f, url: e.target.value })} />
        <button className="btn-gold w-full" onClick={() => { if (!f.name.trim()) return toast('Donne un nom.'); addWish({ name: f.name.trim(), brand: f.brand, category: f.category, color: f.color, price: f.price ? Number(f.price) : null, url: f.url.trim(), note: '' }); setF({ ...f, name: '', price: '', url: '' }); setOpen(false) }}>Ajouter</button>
      </Sheet>
    </div>
  )
}

/* ---------- Capsules ---------- */
function Capsules() {
  const { capsules, garments, addCapsule, updateCapsule, removeCapsule } = useStore()
  const [name, setName] = useState('')
  const [edit, setEdit] = useState<string | null>(null)
  const cap = capsules.find((c) => c.id === edit)
  return (
    <div>
      <div className="mb-6 flex gap-2">
        <input className="field" placeholder="Travail, Été, Week-end…" value={name} onChange={(e) => setName(e.target.value)} />
        <button className="btn-gold !px-5" onClick={() => { if (!name.trim()) return; setEdit(addCapsule(name.trim())); setName('') }}>Créer</button>
      </div>
      {capsules.length === 0 && <Empty icon="layers" title="Aucune capsule" text="Regroupe une sélection de pièces pour une situation précise." />}
      {capsules.map((c) => (
        <button key={c.id} onClick={() => setEdit(c.id)} className="card mb-3 flex w-full items-center justify-between p-5 text-left">
          <div><div className="font-serif text-[20px] text-ivoire">{c.name}</div><div className="caps !text-creme/45">{c.itemIds.length} pièces</div></div>
          <Icon name="chevron" size={16} className="text-champagne" />
        </button>
      ))}
      <Sheet open={!!cap} onClose={() => setEdit(null)} title={cap?.name} tall>
        {cap && (
          <div>
            <div className="grid grid-cols-3 gap-3">
              {garments.filter((g) => g.status !== 'archived').map((g) => {
                const on = cap.itemIds.includes(g.id)
                return <button key={g.id} onClick={() => updateCapsule(cap.id, { itemIds: on ? cap.itemIds.filter((i) => i !== g.id) : [...cap.itemIds, g.id] })} className={cx('overflow-hidden rounded-maison border', on ? 'border-champagne' : 'border-transparent opacity-60')}><GarmentThumb garment={g} className="aspect-[4/5]" /></button>
              })}
            </div>
            <button className="btn mt-6 w-full text-creme/45" onClick={() => { removeCapsule(cap.id); setEdit(null) }}><Icon name="trash" size={15} /> Supprimer la capsule</button>
          </div>
        )}
      </Sheet>
    </div>
  )
}

/* ---------- Réglages ---------- */
function Settings() {
  const { settings, setSettings, exportData, importData, resetAll, addGarment, garments } = useStore()
  const [loc, setLoc] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const file = useRef<HTMLInputElement>(null)
  const notif = async () => {
    if (settings.notifications) return setSettings({ notifications: false })
    if (!('Notification' in window)) return toast('Notifications non prises en charge ici.')
    const p = await Notification.requestPermission()
    setSettings({ notifications: p === 'granted' })
    toast(p === 'granted' ? 'Notifications activées' : 'Autorisation refusée')
  }
  const Row = ({ k, children }: { k: string; children: React.ReactNode }) => <div className="flex items-center justify-between border-b border-white/[0.05] py-4"><span className="text-[13.5px] text-ivoire">{k}</span>{children}</div>
  return (
    <div>
      <Block title="Profil">
        <input className="field mb-3" placeholder="Ton prénom" value={settings.name} onChange={(e) => setSettings({ name: e.target.value })} />
        <button className="field flex items-center justify-between text-left" onClick={() => setLoc(true)}><span>{settings.location?.label ?? 'Choisir ma localisation'}</span><Icon name="pin" size={16} /></button>
      </Block>
      <Block title="Notifications">
        <Row k="Suggestion du jour"><button onClick={notif} className={cx('chip', settings.notifications && 'chip-on')}>{settings.notifications ? 'Activées' : 'Activer'}</button></Row>
        <p className="mt-3 text-[11px] leading-relaxed text-creme/40">Envoyées à l’ouverture de l’app (tenue planifiée ou sélection météo). Les notifications en arrière-plan demandent un serveur push, non configuré ici.</p>
      </Block>
      <Block title="Styliste IA">
        <Row k="Utiliser l’IA"><button disabled={!aiConfigured} onClick={() => setSettings({ aiEnabled: !settings.aiEnabled })} className={cx('chip', settings.aiEnabled && aiConfigured && 'chip-on', !aiConfigured && 'opacity-40')}>{settings.aiEnabled && aiConfigured ? 'Active' : 'Inactive'}</button></Row>
        <p className="mt-3 text-[11px] leading-relaxed text-creme/40">{aiConfigured ? 'Fonction serveur détectée. Seuls le nom, la catégorie et la couleur des pièces sont envoyés, jamais les photos.' : 'Non configurée : le styliste fonctionne en mode local. Voir le README pour brancher une clé API côté serveur.'}</p>
      </Block>
      <Block title="Données">
        <p className="mb-4 text-[11.5px] text-creme/45">{supabase ? 'Supabase détecté (synchronisation à brancher, voir README).' : 'Tout est stocké sur cet appareil.'}</p>
        <div className="grid grid-cols-2 gap-3">
          <button className="btn-ghost" onClick={() => { const b = new Blob([exportData()], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = `maison-${ymd()}.json`; a.click(); URL.revokeObjectURL(a.href) }}><Icon name="download" size={15} /> Exporter</button>
          <button className="btn-ghost" onClick={() => file.current?.click()}><Icon name="upload" size={15} /> Importer</button>
          {garments.length === 0 && <button className="btn-ghost col-span-2" onClick={() => { demoGarments().forEach((g) => addGarment(g)); toast('Démo chargée') }}>Charger un dressing de démonstration</button>}
          {confirm ? <button className="btn col-span-2 border border-red-300/40 text-red-200" onClick={() => { resetAll(); setConfirm(false); toast('Données effacées') }}>Confirmer : tout effacer</button> : <button className="btn col-span-2 text-creme/45" onClick={() => setConfirm(true)}>Tout effacer</button>}
        </div>
        <input ref={file} type="file" accept="application/json" hidden onChange={async (e) => { const f = e.target.files?.[0]; e.target.value = ''; if (!f) return; toast(importData(await f.text()) ? 'Import réussi' : 'Fichier invalide') }} />
      </Block>
      <LocationPicker open={loc} onClose={() => setLoc(false)} />
    </div>
  )
}

function Prefs() {
  const { settings, setSettings } = useStore()
  const styles = settings.favStyles ?? []
  const colors = settings.favColors ?? []
  const sizes = settings.sizes ?? { top: '', bottom: '', shoes: '' }
  const tg = <T,>(a: T[], v: T) => (a.includes(v) ? a.filter((x) => x !== v) : [...a, v])
  const labels = { top: 'Haut', bottom: 'Bas', shoes: 'Chaussures' }
  return (
    <div>
      <Block title="Styles favoris"><div className="flex flex-wrap gap-2">{STYLES.map((s) => <button key={s} onClick={() => setSettings({ favStyles: tg(styles, s) })} className={cx('chip', styles.includes(s) && 'chip-on')}>{s}</button>)}</div></Block>
      <Block title="Couleurs préférées"><div className="flex flex-wrap gap-3">{NAMED_COLORS.map((c) => <button key={c.name} onClick={() => setSettings({ favColors: tg(colors, c.name) })} aria-label={c.name}><ColorDot color={c.hex} size={28} ring={colors.includes(c.name)} /></button>)}</div></Block>
      <Block title="Mes tailles"><div className="grid grid-cols-3 gap-3">{(['top', 'bottom', 'shoes'] as const).map((k) => <input key={k} className="field" placeholder={labels[k]} value={sizes[k]} onChange={(e) => setSettings({ sizes: { ...sizes, [k]: e.target.value } })} />)}</div></Block>
      <p className="px-1 text-[11.5px] leading-relaxed text-creme/40">Le styliste et les recommandations privilégient ces choix.</p>
    </div>
  )
}

export function Profile() {
  const [sub, setSub] = useState<Sub>('stats')
  const name = useStore((s) => s.settings.name)
  return (
    <div className="pb-32">
      <Header eyebrow={name || 'Ton style, ton identité.'} title="Mon profil" />
      <div className="px-6">
        <div className="mb-6"><Segmented<Sub> value={sub} onChange={setSub} options={[{ id: 'stats', label: 'Stats' }, { id: 'style', label: 'Mon style' }, { id: 'calendar', label: 'Calendrier' }, { id: 'trip', label: 'Valise' }, { id: 'wish', label: 'Wishlist' }, { id: 'capsule', label: 'Capsules' }, { id: 'settings', label: 'Réglages' }]} /></div>
        {sub === 'stats' && <Stats />}
        {sub === 'style' && <Prefs />}
        {sub === 'calendar' && <CalendarView />}
        {sub === 'trip' && <Trip />}
        {sub === 'wish' && <Wish />}
        {sub === 'capsule' && <Capsules />}
        {sub === 'settings' && <Settings />}
      </div>
    </div>
  )
}
