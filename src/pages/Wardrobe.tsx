import { motion } from 'framer-motion'
import { useMemo, useState } from 'react'
import { AddGarmentSheet } from '../components/AddGarment'
import { GarmentDetail } from '../components/GarmentDetail'
import { GarmentThumb } from '../components/GarmentThumb'
import { ColorDot, Empty, Header, Icon, Sheet, useDebounced, toast } from '../components/ui'
import { CATEGORIES, CAT_BY_ID, SEASONS, STYLES, MATERIALS, slotOf } from '../lib/constants'
import { colorName } from '../lib/colors'
import { demoGarments } from '../lib/demo'
import { useStore } from '../lib/store'
import { cx } from '../lib/utils'
import type { CategoryId, Garment, Season, Slot, Style } from '../types'

interface Filters {
  cats: CategoryId[]
  sizes: string[]
  onlyFav: boolean
  colors: string[]
  brands: string[]
  seasons: Season[]
  materials: string[]
  styles: Style[]
  price: string // '' | 'none' | '<50' | '50-150' | '150-400' | '400+'
  freq: string // '' | 'never' | 'rare' | 'regular' | 'often'
  showArchived: boolean
  onlyLaundry: boolean
}
const NO_FILTERS: Filters = { cats: [], sizes: [], onlyFav: false, colors: [], brands: [], seasons: [], materials: [], styles: [], price: '', freq: '', showArchived: false, onlyLaundry: false }
const GROUPS: { id: Slot; label: string }[] = [{ id: 'top', label: 'Hauts' }, { id: 'bottom', label: 'Bas' }, { id: 'outer', label: 'Vestes' }, { id: 'suit', label: 'Costumes' }, { id: 'shoes', label: 'Chaussures' }, { id: 'accessory', label: 'Accessoires' }]

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
const tg = <T,>(a: T[], v: T) => (a.includes(v) ? a.filter((x) => x !== v) : [...a, v])

function matches(g: Garment, f: Filters, grp: Slot | 'all', q: string): boolean {
  if (g.status === 'archived' && !f.showArchived) return false
  if (f.onlyLaundry && g.status !== 'laundry') return false
  if (grp !== 'all' && slotOf(g.category) !== grp) return false
  if (f.cats.length && !f.cats.includes(g.category)) return false
  if (f.onlyFav && !g.favorite) return false
  if (f.sizes.length && !f.sizes.includes(g.size)) return false
  if (q) {
    const hay = norm([g.name, g.brand, g.subcategory, g.material, g.notes, colorName(g.color), CAT_BY_ID[g.category].label, g.styles.join(' ')].join(' '))
    if (!q.split(/\s+/).every((w) => hay.includes(w))) return false
  }
  if (f.colors.length && !f.colors.includes(colorName(g.color))) return false
  if (f.brands.length && !f.brands.includes(g.brand)) return false
  if (f.seasons.length && !f.seasons.some((s) => g.seasons.includes(s))) return false
  if (f.materials.length && !f.materials.includes(g.material)) return false
  if (f.styles.length && !f.styles.some((s) => g.styles.includes(s))) return false
  if (f.price) {
    const p = g.price
    if (f.price === 'none' ? p != null : p == null) return false
    if (p != null) {
      if (f.price === '<50' && !(p < 50)) return false
      if (f.price === '50-150' && !(p >= 50 && p < 150)) return false
      if (f.price === '150-400' && !(p >= 150 && p < 400)) return false
      if (f.price === '400+' && !(p >= 400)) return false
    }
  }
  if (f.freq) {
    const n = g.wornDates.length
    if (f.freq === 'never' && n !== 0) return false
    if (f.freq === 'rare' && !(n >= 1 && n <= 2)) return false
    if (f.freq === 'regular' && !(n >= 3 && n <= 9)) return false
    if (f.freq === 'often' && n < 10) return false
  }
  return true
}

function ChipGroup<T extends string>({ label, options, value, onToggle }: { label: string; options: { id: T; label: string }[]; value: T[]; onToggle: (v: T) => void }) {
  if (options.length === 0) return null
  return (
    <div className="mb-6">
      <div className="caps mb-3">{label}</div>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <button key={o.id} onClick={() => onToggle(o.id)} className={cx('chip', value.includes(o.id) && 'chip-on')}>{o.label}</button>
        ))}
      </div>
    </div>
  )
}

export function Wardrobe({ onTryGarment }: { onTryGarment: (g: Garment) => void }) {
  const garments = useStore((s) => s.garments)
  const addGarment = useStore((s) => s.addGarment)
  const updateGarment = useStore((s) => s.updateGarment)
  const [cat, setCat] = useState<Slot | 'all'>('all')
  const [query, setQuery] = useState('')
  const q = useDebounced(norm(query.trim()), 150)
  const [filters, setFilters] = useState<Filters>(NO_FILTERS)
  const [filterOpen, setFilterOpen] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [openId, setOpenId] = useState<string | null>(null)

  const present = useMemo(() => new Set(garments.filter((g) => g.status !== 'archived').map((g) => slotOf(g.category))), [garments])
  const groups = GROUPS.filter((x) => present.has(x.id))
  const list = useMemo(() => garments.filter((g) => matches(g, filters, cat, q)), [garments, filters, cat, q])
  const brands = useMemo(() => Array.from(new Set(garments.map((g) => g.brand).filter(Boolean))).sort(), [garments])
  const sizeList = useMemo(() => Array.from(new Set(garments.map((g) => g.size).filter(Boolean))).sort(), [garments])
  const colors = useMemo(() => Array.from(new Set(garments.map((g) => colorName(g.color)))).sort(), [garments])
  const colorHex = (n: string) => garments.find((g) => colorName(g.color) === n)?.color ?? '#888'
  const activeCount =
    filters.sizes.length + (filters.onlyFav ? 1 : 0) + filters.cats.length + filters.colors.length + filters.brands.length + filters.seasons.length + filters.materials.length + filters.styles.length +
    (filters.price ? 1 : 0) + (filters.freq ? 1 : 0) + (filters.showArchived ? 1 : 0) + (filters.onlyLaundry ? 1 : 0)
  const opened = garments.find((g) => g.id === openId) ?? null
  const active = garments.filter((g) => g.status !== 'archived').length

  const loadDemo = () => {
    demoGarments().forEach((g) => addGarment(g))
    toast('Dressing de démonstration chargé')
  }

  return (
    <div className="pb-32">
      <Header
        eyebrow={`${active} pièce${active > 1 ? 's' : ''}`}
        title="Mon dressing"
        right={
          <button onClick={() => setAddOpen(true)} className="flex h-12 w-12 items-center justify-center rounded-full bg-champagne text-noir shadow-depth active:scale-95" aria-label="Ajouter une pièce">
            <Icon name="plus" size={22} stroke={1.4} />
          </button>
        }
      />

      {garments.length === 0 ? (
        <Empty
          icon="hanger"
          title="Ton dressing est vide"
          text="Photographie tes pièces une à une ou importe-les depuis ta galerie. Chaque vêtement devient une fiche complète."
          action={
            <div className="flex flex-col items-center gap-3">
              <button onClick={() => setAddOpen(true)} className="btn-gold">Ajouter ma première pièce</button>
              <button onClick={loadDemo} className="text-[11px] uppercase tracking-[0.18em] text-creme/40 underline underline-offset-4">Charger un dressing de démonstration</button>
            </div>
          }
        />
      ) : (
        <>
          <div className="flex items-center gap-3 px-6">
            <div className="relative flex-1">
              <Icon name="search" size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-creme/35" />
              <input className="field pl-11" placeholder="Rechercher une pièce, une marque, une couleur…" value={query} onChange={(e) => setQuery(e.target.value)} />
            </div>
            <button onClick={() => setFilterOpen(true)} className={cx('relative flex h-[46px] w-[46px] items-center justify-center rounded-xl border', activeCount ? 'border-champagne text-champagne' : 'border-white/10 text-creme/60')} aria-label="Filtres">
              <Icon name="filter" size={19} />
              {activeCount > 0 && <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-champagne text-[9px] text-noir">{activeCount}</span>}
            </button>
          </div>

          <div className="no-scrollbar mt-5 flex gap-2 overflow-x-auto px-6">
            <button onClick={() => setCat('all')} className={cx('chip', cat === 'all' && 'chip-on')}>Tous</button>
            {groups.map((c) => (
              <button key={c.id} onClick={() => setCat(c.id)} className={cx('chip', cat === c.id && 'chip-on')}>{c.label}</button>
            ))}
          </div>

          {list.length === 0 ? (
            <Empty
              icon="search" title="Aucun résultat" text="Aucune pièce ne correspond à cette recherche ou à ces filtres."
              action={<button onClick={() => { setFilters(NO_FILTERS); setQuery(''); setCat('all') }} className="btn-ghost">Réinitialiser</button>}
            />
          ) : (
            <div className="mt-6 grid grid-cols-3 gap-x-3 gap-y-6 px-5">
              {list.map((g, i) => (
                <motion.button
                  key={g.id}
                  layout
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, delay: Math.min(i, 8) * 0.04, ease: [0.22, 1, 0.36, 1] }}
                  onClick={() => setOpenId(g.id)}
                  className="text-left"
                >
                  <div className="relative">
                    <GarmentThumb garment={g} className={cx('aspect-[4/5] rounded-maison shadow-depth', g.status !== 'available' && 'opacity-55')} />
                    <span role="button" aria-label="Favori" onClick={(e) => { e.stopPropagation(); updateGarment(g.id, { favorite: !g.favorite }) }} className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-noir/60 text-champagne backdrop-blur"><Icon name="heart" size={15} className={g.favorite ? 'fill-champagne' : ''} /></span>
                    {g.status === 'laundry' && <span className="absolute left-2.5 top-2.5 flex items-center gap-1 rounded-full bg-noir/80 px-2.5 py-1 text-[9px] uppercase tracking-[0.15em] text-champagne"><Icon name="drop" size={11} /> Lavage</span>}
                    {g.status === 'archived' && <span className="absolute left-2.5 top-2.5 rounded-full bg-noir/80 px-2.5 py-1 text-[9px] uppercase tracking-[0.15em] text-creme/70">Archivée</span>}
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <ColorDot color={g.color} size={9} />
                    <span className="caps !text-creme/45">{g.brand || CAT_BY_ID[g.category].label}</span>
                  </div>
                  <div className="mt-1 line-clamp-2 font-serif text-[14.5px] leading-tight text-ivoire">{g.name}</div>
                </motion.button>
              ))}
            </div>
          )}
        </>
      )}

      <Sheet open={filterOpen} onClose={() => setFilterOpen(false)} title="Filtres" tall>
        <ChipGroup label="Catégorie" options={CATEGORIES.map((c) => ({ id: c.id, label: c.label }))} value={filters.cats} onToggle={(v) => setFilters((f) => ({ ...f, cats: tg(f.cats, v) }))} />
        <ChipGroup label="Couleur" options={colors.map((c) => ({ id: c, label: c }))} value={filters.colors} onToggle={(v) => setFilters((f) => ({ ...f, colors: tg(f.colors, v) }))} />
        <ChipGroup label="Marque" options={brands.map((b) => ({ id: b, label: b }))} value={filters.brands} onToggle={(v) => setFilters((f) => ({ ...f, brands: tg(f.brands, v) }))} />
        <ChipGroup label="Saison" options={SEASONS} value={filters.seasons} onToggle={(v) => setFilters((f) => ({ ...f, seasons: tg(f.seasons, v) }))} />
        <ChipGroup label="Taille" options={sizeList.map((s) => ({ id: s, label: s }))} value={filters.sizes} onToggle={(v) => setFilters((f) => ({ ...f, sizes: tg(f.sizes, v) }))} />
        <ChipGroup label="Matière" options={MATERIALS.map((m) => ({ id: m, label: m }))} value={filters.materials} onToggle={(v) => setFilters((f) => ({ ...f, materials: tg(f.materials, v) }))} />
        <ChipGroup label="Style" options={STYLES.map((s) => ({ id: s, label: s }))} value={filters.styles} onToggle={(v) => setFilters((f) => ({ ...f, styles: tg(f.styles, v) }))} />
        <ChipGroup
          label="Prix" value={filters.price ? [filters.price] : []}
          options={[{ id: '<50', label: '< 50 €' }, { id: '50-150', label: '50 – 150 €' }, { id: '150-400', label: '150 – 400 €' }, { id: '400+', label: '400 € +' }, { id: 'none', label: 'Non renseigné' }]}
          onToggle={(v) => setFilters((f) => ({ ...f, price: f.price === v ? '' : v }))}
        />
        <ChipGroup
          label="Fréquence de port" value={filters.freq ? [filters.freq] : []}
          options={[{ id: 'never', label: 'Jamais' }, { id: 'rare', label: '1 – 2 fois' }, { id: 'regular', label: '3 – 9 fois' }, { id: 'often', label: '10 fois +' }]}
          onToggle={(v) => setFilters((f) => ({ ...f, freq: f.freq === v ? '' : v }))}
        />
        <ChipGroup
          label="Statut" value={[...(filters.showArchived ? ['archived'] : []), ...(filters.onlyLaundry ? ['laundry'] : []), ...(filters.onlyFav ? ['fav'] : [])]}
          options={[{ id: 'fav', label: 'Favoris' }, { id: 'laundry', label: 'Au lavage' }, { id: 'archived', label: 'Afficher les archivées' }]}
          onToggle={(v) => setFilters((f) => (v === 'laundry' ? { ...f, onlyLaundry: !f.onlyLaundry } : v === 'fav' ? { ...f, onlyFav: !f.onlyFav } : { ...f, showArchived: !f.showArchived }))}
        />
        <div className="sticky bottom-0 -mx-6 mt-4 flex gap-3 bg-anthracite px-6 pb-2 pt-3">
          <button className="btn-ghost flex-1" onClick={() => setFilters(NO_FILTERS)}>Effacer</button>
          <button className="btn-gold flex-[2]" onClick={() => setFilterOpen(false)}>Voir {list.length} pièce{list.length > 1 ? 's' : ''}</button>
        </div>
      </Sheet>

      <AddGarmentSheet open={addOpen} onClose={() => setAddOpen(false)} />
      <GarmentDetail garment={opened} onClose={() => setOpenId(null)} onTry={onTryGarment} />
    </div>
  )
}
