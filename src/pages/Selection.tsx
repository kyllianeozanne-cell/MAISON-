import { motion } from 'framer-motion'
import { useMemo, useRef, useState } from 'react'
import { LookBoard } from '../components/LookBoard'
import { GarmentThumb } from '../components/GarmentThumb'
import type { Tab } from '../components/NavBar'
import { readableOn } from '../lib/colors'
import { ColorDot, Empty, Header, Icon, Sheet, toast } from '../components/ui'
import { BRANDS, MERCHANTS, imagesUrl, useCatalog, type Product } from '../lib/catalog'
import { dominantColor, processPhoto } from '../lib/photo'
import { categoriesFor, SLOT_LABEL, slotOf } from '../lib/constants'
import { NAMED_COLORS, colorName } from '../lib/colors'
import { SECTIONS, buildNeeds, matchProducts, ownStyles, pairsFor, type Need } from '../lib/selection'
import { useStore } from '../lib/store'
import { cx, eur } from '../lib/utils'
import type { CategoryId, Garment, Slot, Style } from '../types'

const SLOTS: Slot[] = ['top', 'bottom', 'outer', 'shoes', 'accessory', 'suit']
const SLOT_SHORT: Record<Slot, string> = { top: 'Hauts', bottom: 'Bas', outer: 'Vestes', shoes: 'Chaussures', accessory: 'Accessoires', suit: 'Costumes' }
const PRICES = [50, 100, 150, 250, 400]
const HEX = Object.fromEntries(NAMED_COLORS.map((c) => [c.name, c.hex])) as Record<string, string>

interface Filters { slot: Slot | ''; color: string; style: Style | ''; brand: string; maxPrice: number | null; favs: boolean }
const NO_FILTER: Filters = { slot: '', color: '', style: '', brand: '', maxPrice: null, favs: false }

export function Selection({ go, tryLook }: { go: (t: Tab) => void; tryLook: (l: { itemIds: string[] }) => void }) {
  const { garments, settings, selFavs, toggleSelFav, shopItems, removeShopItem } = useStore()
  const favs = selFavs ?? []
  const cat = useCatalog()
  const ready = cat.ready
  const mine = shopItems ?? []
  const products = useMemo(() => [...mine, ...cat.products], [mine, cat.products])
  const [addOpen, setAddOpen] = useState(false)
  const [f, setF] = useState<Filters>(NO_FILTER)
  const [open, setOpen] = useState<Need | null>(null)
  const [filterOpen, setFilterOpen] = useState(false)

  const needs = useMemo(() => buildNeeds(garments, settings), [garments, settings])
  const styles = useMemo(() => ownStyles(garments, settings), [garments, settings])
  const matched = useMemo(() => new Map(needs.map((n) => [n.id, matchProducts(n, products, settings)])), [needs, products, settings])

  const brands = useMemo(() => [...new Set(products.map((p) => p.brand))].sort(), [products])
  const colorsPresent = useMemo(() => [...new Set(needs.map((n) => n.colorName))], [needs])
  const active = [f.slot, f.color, f.style, f.brand, f.maxPrice, f.favs].filter(Boolean).length

  const visible = needs.filter((n) => {
    if (f.slot && slotOf(n.cat) !== f.slot) return false
    if (f.color && n.colorName !== f.color) return false
    if (f.style && !n.styles.includes(f.style)) return false
    if (f.favs && !favs.includes(n.id)) return false
    if (f.brand || f.maxPrice) {
      const ps = matched.get(n.id) ?? []
      if (!ps.some((p) => (!f.brand || p.brand === f.brand) && (!f.maxPrice || p.price <= f.maxPrice))) return false
    }
    return true
  })

  const own = garments.filter((g) => g.status !== 'archived')
  if (own.length < 3) {
    return (
      <div className="pb-32">
        <Header eyebrow="Pièces choisies pour toi" title="Sélection" />
        <Empty icon="bag" title="Ton dressing est encore vide" text="Ajoute quelques pièces : MAISON repère alors ce qui te manque et ce qui s’accorde avec ce que tu possèdes." action={<button className="btn-gold" onClick={() => go('wardrobe')}>Ouvrir mon dressing</button>} />
      </div>
    )
  }

  return (
    <div className="pb-32">
      <Header eyebrow={settings.name ? `Choisie pour ${settings.name}` : 'Pièces choisies pour toi'} title="Sélection" />
      <p className="mx-6 -mt-1 mb-5 text-[12.5px] leading-relaxed text-creme/50">
        Analyse de tes {own.length} pièces{styles.length ? ` et de ton style ${styles.join(' / ')}` : ''}{settings.budget ? ` · budget ${eur(settings.budget)} max` : ''}. Les achats se font chez les marchands.
      </p>

      <div className="no-scrollbar flex gap-2 overflow-x-auto px-6">
        <button onClick={() => setFilterOpen(true)} className={cx('chip flex items-center gap-1.5', active > 0 && 'chip-on')}><Icon name="filter" size={13} />Filtres{active ? ` · ${active}` : ''}</button>
        <button onClick={() => setF({ ...f, favs: !f.favs })} className={cx('chip flex items-center gap-1.5', f.favs && 'chip-on')}><Icon name="heart" size={13} />Favoris{favs.length ? ` · ${favs.length}` : ''}</button>
        {SLOTS.filter((s) => needs.some((n) => slotOf(n.cat) === s)).map((s) => <button key={s} onClick={() => setF({ ...f, slot: f.slot === s ? '' : s })} className={cx('chip', f.slot === s && 'chip-on')}>{SLOT_SHORT[s]}</button>)}
      </div>

      <div className="px-6 pt-4"><button onClick={() => setAddOpen(true)} className="btn-ghost w-full !py-2.5"><Icon name="plus" size={15} /> Ajouter un article trouvé en boutique</button></div>
      {mine.length > 0 && (
        <section className="mt-8">
          <div className="px-6"><div className="caps">Mes trouvailles</div><p className="mt-1.5 font-serif text-[19px] italic text-creme/60">Les articles que tu as repérés.</p></div>
          <div className="no-scrollbar mt-4 flex scroll-px-6 gap-4 overflow-x-auto px-6 pb-2">
            {mine.map((p) => (
              <article key={p.id} className="card w-[46%] max-w-[200px] shrink-0 overflow-hidden">
                <img src={p.image} alt={p.name} loading="lazy" className="aspect-[4/5] w-full bg-creme object-cover" />
                <div className="p-3">
                  <div className="line-clamp-2 font-serif text-[15px] leading-tight text-ivoire">{p.name}</div>
                  <div className="mt-1 text-[11px] text-creme/50">{[p.brand, p.price ? eur(p.price) : ''].filter(Boolean).join(' · ')}</div>
                  <div className="mt-3 flex gap-2">
                    {p.url && <a href={p.url} target="_blank" rel="noopener noreferrer" className="flex-1 rounded-full border border-champagne/40 py-1.5 text-center text-[10px] uppercase tracking-[0.14em] text-champagne">Voir</a>}
                    <button onClick={() => removeShopItem(p.id)} aria-label="Retirer" className="rounded-full border border-white/10 px-2.5 text-creme/45"><Icon name="trash" size={13} /></button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {visible.length === 0 && <p className="px-6 py-16 text-center text-[13px] text-creme/45">Aucune pièce ne correspond à ces filtres.</p>}

      {SECTIONS.map((sec) => {
        const list = visible.filter((n) => n.section === sec.id)
        if (!list.length) return null
        return (
          <section key={sec.id} className="mt-10">
            <div className="px-6">
              <div className="caps">{sec.title}</div>
              <p className="mt-1.5 font-serif text-[19px] italic leading-snug text-creme/60">{sec.sub}</p>
            </div>
            <div className="no-scrollbar mt-4 flex snap-x snap-mandatory scroll-px-6 gap-4 overflow-x-auto px-6 pb-2">
              {list.map((n) => <NeedCard key={n.id} n={n} products={matched.get(n.id) ?? []} fav={favs.includes(n.id)} onFav={() => toggleSelFav(n.id)} onOpen={() => setOpen(n)} />)}
            </div>
          </section>
        )
      })}

      <div className="card mx-6 mt-12 p-5 text-[11.5px] leading-relaxed text-creme/50">
        <div className="caps mb-2">Comment ça marche</div>
        {ready && products.length === 0
          ? 'Aucun catalogue produit n’est branché pour l’instant : MAISON ne montre ni prix ni photo qu’elle ne peut pas vérifier. Chaque recommandation te mène vers une recherche chez un marchand. Les fiches produits (photo, marque, prix, lien) s’affichent dès que des articles sont ajoutés au catalogue (public/catalog.json, voir README).'
          : 'Les produits affichés viennent du catalogue Maison : prix et liens relevés aux dates indiquées, à confirmer chez le marchand.'}
      </div>

      <Sheet open={!!open} onClose={() => setOpen(null)} title={open?.title} tall>
        {open && <Detail n={open} garments={own} products={matched.get(open.id) ?? []} brand={(settings.favBrands ?? [])[0]} fav={favs.includes(open.id)} onFav={() => toggleSelFav(open.id)} onTry={(ids) => { setOpen(null); tryLook({ itemIds: ids }) }} />}
      </Sheet>

      <AddItem open={addOpen} onClose={() => setAddOpen(false)} />

      <Sheet open={filterOpen} onClose={() => setFilterOpen(false)} title="Filtres">
        <div className="caps mb-2">Catégorie</div>
        <div className="mb-6 flex flex-wrap gap-2">{SLOTS.map((s) => <button key={s} onClick={() => setF({ ...f, slot: f.slot === s ? '' : s })} className={cx('chip', f.slot === s && 'chip-on')}>{SLOT_LABEL[s]}</button>)}</div>
        <div className="caps mb-2">Couleur</div>
        <div className="mb-6 flex flex-wrap gap-3">{colorsPresent.map((c) => <button key={c} aria-label={c} onClick={() => setF({ ...f, color: f.color === c ? '' : c })}><ColorDot color={HEX[c]} size={28} ring={f.color === c} /></button>)}</div>
        <div className="caps mb-2">Style</div>
        <div className="mb-6 flex flex-wrap gap-2">{[...new Set(needs.flatMap((n) => n.styles))].map((s) => <button key={s} onClick={() => setF({ ...f, style: f.style === s ? '' : s })} className={cx('chip', f.style === s && 'chip-on')}>{s}</button>)}</div>
        {products.length > 0 && (
          <>
            <div className="caps mb-2">Marque</div>
            <div className="mb-6 flex flex-wrap gap-2">{brands.map((b) => <button key={b} onClick={() => setF({ ...f, brand: f.brand === b ? '' : b })} className={cx('chip', f.brand === b && 'chip-on')}>{b}</button>)}</div>
            <div className="caps mb-2">Prix maximum</div>
            <div className="mb-6 flex flex-wrap gap-2">{PRICES.map((p) => <button key={p} onClick={() => setF({ ...f, maxPrice: f.maxPrice === p ? null : p })} className={cx('chip', f.maxPrice === p && 'chip-on')}>{eur(p)}</button>)}</div>
          </>
        )}
        <p className="mb-5 text-[11px] text-creme/40">Budget par article : à régler dans Profil → Mon style.</p>
        <div className="grid grid-cols-2 gap-3">
          <button className="btn-ghost" onClick={() => setF(NO_FILTER)}>Réinitialiser</button>
          <button className="btn-gold" onClick={() => setFilterOpen(false)}>Voir {visible.length}</button>
        </div>
      </Sheet>
    </div>
  )
}

function NeedCard({ n, products, fav, onFav, onOpen }: { n: Need; products: Product[]; fav: boolean; onFav: () => void; onOpen: () => void }) {
  const p = products[0]
  const sex = useStore((st) => st.settings.gender) ?? 'homme'
  const q = `${n.noun} ${n.colorName} ${sex}`
  return (
    <motion.article initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="card w-[78%] max-w-[320px] shrink-0 snap-start overflow-hidden">
      <button onClick={onOpen} className="block w-full text-left">
        <div className="relative flex aspect-[4/5] flex-col bg-[#d8cdb9]">
          {p ? <img src={p.image} alt={p.name} loading="lazy" className="h-full w-full bg-creme object-contain p-4" /> : (
            <>
              <div className="relative flex flex-[1.6] items-center justify-center px-5 text-center" style={{ background: `linear-gradient(160deg, ${n.color}, ${n.color}dd)` }}>
                <span className="font-serif text-[26px] italic leading-tight" style={{ color: readableOn(n.color) }}>{n.title}</span>
                <span className="absolute left-3 top-3 rounded-full bg-noir/70 px-2.5 py-1 text-[9px] uppercase tracking-[0.16em] text-champagne">Pièce à trouver</span>
              </div>
              {n.pairs.length > 0 && (
                <div className="flex flex-1 gap-1.5 p-1.5">
                  {n.pairs.slice(0, 3).map((g) => <div key={g.id} className="relative flex-1 overflow-hidden rounded-lg bg-creme">{g.photo ? <img src={g.photo} alt={g.name} className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: 'center 35%' }} /> : <div className="h-full" style={{ background: g.color }} />}</div>)}
                </div>
              )}
            </>
          )}
        </div>
      </button>
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-serif text-[20px] leading-tight text-ivoire">{p ? p.name : n.title}</h3>
            <div className="mt-1.5 flex items-center gap-2 text-[11px] text-creme/50"><ColorDot color={p?.color ?? n.color} size={10} />{p ? `${p.brand} · ${eur(p.price)}` : n.colorName}</div>
          </div>
          <button onClick={onFav} aria-label="Favori" className={cx('p-1', fav ? 'text-champagne' : 'text-creme/35')}><Icon name="heart" size={20} className={fav ? 'fill-champagne' : ''} /></button>
        </div>
        <p className="mt-3 line-clamp-4 text-[12px] leading-relaxed text-creme/60">{n.why}</p>
        <div className="mt-4 flex flex-wrap gap-1.5">
          {MERCHANTS.slice(0, 4).map((m) => <a key={m.id} href={imagesUrl(q, m.site)} target="_blank" rel="noopener noreferrer" className="rounded-full border border-champagne/30 px-2.5 py-1 text-[10px] uppercase tracking-[0.1em] text-champagne">{m.label}</a>)}
        </div>
        <button onClick={onOpen} className="btn-ghost mt-3 w-full !py-2.5">Voir le détail</button>
      </div>
    </motion.article>
  )
}

function Detail({ n, garments, products, brand, fav, onFav, onTry }: { n: Need; garments: Garment[]; products: Product[]; brand?: string; fav: boolean; onFav: () => void; onTry: (ids: string[]) => void }) {
  const target: Garment = useMemo(() => ({ id: 'sel-target', name: n.title, category: n.cat, subcategory: '', brand: '', color: n.color, secondaryColors: [], material: '', size: '', seasons: [], styles: [], formality: 3, purchaseDate: '', price: null, notes: '', photo: '', wornDates: [], status: 'available', createdAt: 0 }), [n])
  const { pairs, coverage } = useMemo(() => pairsFor(n.cat, n.color, 3, garments), [n, garments])
  const lookItems = [target, ...pairs.filter((g) => slotOf(g.category) !== slotOf(n.cat))]
  const sex = useStore((st) => st.settings.gender) ?? 'homme'
  const q = `${n.noun} ${n.colorName} ${sex}`
  const mine = useStore((st) => st.settings.favStyles) ?? []
  const inspo = useMemo(() => {
    const own = [...mine, ...n.styles]
    const out: string[] = []
    for (const st of own) for (const b of BRANDS[st]?.[sex] ?? []) if (!out.includes(b)) out.push(b)
    return out.slice(0, 6)
  }, [mine, n.styles, sex])
  return (
    <div>
      <LookBoard items={lookItems} className="mx-auto mb-2 w-[78%]" />
      <p className="mb-1 text-center text-[10px] uppercase tracking-[0.16em] text-creme/35">Aperçu : la couleur recommandée avec tes vêtements</p>
      <p className="my-5 text-[13.5px] leading-relaxed text-ivoire">{n.why}</p>

      {pairs.length > 0 && (
        <>
          <div className="caps mb-3">À porter avec ({coverage})</div>
          <div className="no-scrollbar -mx-6 mb-6 flex gap-3 overflow-x-auto px-6">
            {pairs.map((g) => <div key={g.id} className="w-20 shrink-0"><GarmentThumb garment={g} className="aspect-[4/5] rounded-xl" /><div className="mt-1.5 line-clamp-2 text-[10.5px] leading-tight text-creme/60">{g.name}</div></div>)}
          </div>
        </>
      )}

      {products.length > 0 && (
        <>
          <div className="caps mb-3">Disponible chez les marchands</div>
          <div className="mb-6 space-y-3">
            {products.map((p) => (
              <a key={p.id} href={p.url} target="_blank" rel="noopener noreferrer" className="card flex gap-4 p-3">
                <img src={p.image} alt={p.name} loading="lazy" className="h-24 w-20 shrink-0 rounded-lg bg-creme object-contain" />
                <div className="min-w-0 flex-1">
                  <div className="font-serif text-[17px] leading-tight text-ivoire">{p.name}</div>
                  <div className="mt-1 text-[11.5px] text-creme/55">{p.brand} · {colorName(p.color)}</div>
                  <div className="mt-2 text-[15px] text-champagne">{eur(p.price)}</div>
                  <div className="mt-1 text-[10px] text-creme/35">Relevé le {p.checkedAt} · {p.merchant}</div>
                </div>
                <Icon name="chevron" size={16} className="self-center text-champagne" />
              </a>
            ))}
          </div>
        </>
      )}

      <div className="caps mb-3">Voir des images de vêtements</div>
      <div className="mb-5 flex flex-wrap gap-2">
        {MERCHANTS.slice(0, 4).map((m) => <a key={m.id} href={imagesUrl(q, m.site)} target="_blank" rel="noopener noreferrer" className="chip">{m.label}</a>)}
        <a href={imagesUrl(q)} target="_blank" rel="noopener noreferrer" className="chip chip-on">Tous les sites</a>
      </div>
      <div className="caps mb-3">Chercher en boutique</div>
      <div className="mb-5 flex flex-wrap gap-2">
        {MERCHANTS.filter((m) => m.url).map((m) => <a key={m.id} href={m.url!(q)} target="_blank" rel="noopener noreferrer" className="chip">{m.label}</a>)}
        {brand && <a href={imagesUrl(`${brand} ${q}`)} target="_blank" rel="noopener noreferrer" className="chip chip-on">{brand}</a>}
      </div>
      {inspo.length > 0 && (
        <>
          <div className="caps mb-3">Marques dans ton esprit</div>
          <div className="mb-5 flex flex-wrap gap-2">{inspo.map((b) => <a key={b} href={imagesUrl(`${b} ${q}`)} target="_blank" rel="noopener noreferrer" className="chip">{b}</a>)}</div>
        </>
      )}
      <p className="mb-6 text-[10.5px] leading-relaxed text-creme/35">Ce sont des liens de recherche : prix et disponibilité sont ceux du marchand. Les images s’ouvrent dans Google Images.</p>

      <div className="grid grid-cols-2 gap-3">
        <button className="btn-ghost" onClick={onFav}><Icon name="heart" size={15} className={fav ? 'fill-champagne' : ''} /> {fav ? 'Favori' : 'Ajouter aux favoris'}</button>
        {pairs.length > 1 && <button className="btn-gold" onClick={() => onTry(pairs.filter((g, i, a) => a.findIndex((x) => slotOf(x.category) === slotOf(g.category)) === i).map((g) => g.id))}>Voir mes associations</button>}
      </div>
    </div>
  )
}

function AddItem({ open, onClose }: { open: boolean; onClose: () => void }) {
  const addShopItem = useStore((s) => s.addShopItem)
  const CATEGORIES = categoriesFor(useStore((s) => s.settings.gender))
  const file = useRef<HTMLInputElement>(null)
  const [image, setImage] = useState('')
  const [color, setColor] = useState('#8b8b8b')
  const [name, setName] = useState('')
  const [brand, setBrand] = useState('')
  const [price, setPrice] = useState('')
  const [url, setUrl] = useState('')
  const [category, setCategory] = useState<CategoryId>('chemise')
  const pick = async (f: File) => {
    try { const p = await processPhoto(f, { cutout: false }); setImage(p); setColor(await dominantColor(p).catch(() => '#8b8b8b')) } catch { toast('Image illisible') }
  }
  const save = () => {
    if (!image || !name.trim()) return toast('Ajoute une photo et un nom.')
    let link = url.trim()
    if (link && !/^https?:\/\//i.test(link)) link = `https://${link}`
    let merchant = ''
    try { merchant = link ? new URL(link).hostname.replace(/^www\./, '') : '' } catch { link = '' }
    addShopItem({ name: name.trim(), brand: brand.trim(), price: parseFloat(price.replace(',', '.')) || 0, category, color, styles: [], image, url: link, merchant })
    setImage(''); setName(''); setBrand(''); setPrice(''); setUrl(''); onClose(); toast('Article ajouté')
  }
  return (
    <Sheet open={open} onClose={onClose} title="Article trouvé" tall>
      <p className="mb-4 text-[12px] leading-relaxed text-creme/50">Zara, H&M, Kiabi, New Yorker… : ajoute la photo (capture d’écran ou galerie) et le lien de la fiche. L’article apparaît dans ta Sélection, avec le prix que tu indiques.</p>
      <button onClick={() => file.current?.click()} className="mb-4 flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-xl border border-dashed border-white/15 bg-noir text-creme/40">
        {image ? <img src={image} alt="" className="h-full w-full object-contain" /> : <span className="flex items-center gap-2 text-[12px]"><Icon name="image" size={18} /> Choisir une photo</span>}
      </button>
      <input ref={file} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) pick(f) }} />
      <input className="field mb-3" placeholder="Nom de l’article" value={name} onChange={(e) => setName(e.target.value)} />
      <div className="mb-3 grid grid-cols-2 gap-3">
        <input className="field" placeholder="Marque" value={brand} onChange={(e) => setBrand(e.target.value)} />
        <input className="field" inputMode="decimal" placeholder="Prix (€)" value={price} onChange={(e) => setPrice(e.target.value)} />
      </div>
      <input className="field mb-3" inputMode="url" autoCapitalize="none" placeholder="Lien de la fiche produit" value={url} onChange={(e) => setUrl(e.target.value)} />
      <select className="field mb-6" value={category} onChange={(e) => setCategory(e.target.value as CategoryId)}>{CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</select>
      <button className="btn-gold w-full" onClick={save}>Ajouter à ma Sélection</button>
    </Sheet>
  )
}
