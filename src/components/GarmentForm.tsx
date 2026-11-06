import { useState } from 'react'
import { categoriesFor, FORMALITY_LABEL, MATERIALS, SEASONS, STYLES } from '../lib/constants'
import { NAMED_COLORS, colorName } from '../lib/colors'
import { useStore } from '../lib/store'
import { cx } from '../lib/utils'
import { GarmentThumb } from './GarmentThumb'
import { ColorDot, Field } from './ui'
import type { CategoryId, Garment, Season, Style } from '../types'

export type GarmentDraft = Omit<Garment, 'id' | 'createdAt' | 'wornDates' | 'status'>

export const emptyDraft = (over: Partial<GarmentDraft> = {}): GarmentDraft => ({
  name: '',
  category: 'tshirt',
  subcategory: '',
  brand: '',
  color: '#8b8b8b',
  secondaryColors: [],
  material: 'Coton',
  size: '',
  seasons: ['printemps', 'ete', 'automne', 'hiver'],
  styles: [],
  formality: 3,
  purchaseDate: '',
  price: null,
  notes: '',
  photo: '',
  ...over,
})

function toggle<T>(arr: T[], v: T): T[] {
  return arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]
}

export function GarmentForm({
  initial, submitLabel, onSubmit, onCancel,
}: { initial: GarmentDraft; submitLabel: string; onSubmit: (d: GarmentDraft) => void; onCancel?: () => void }) {
  const [d, setD] = useState<GarmentDraft>(initial)
  const CATEGORIES = categoriesFor(useStore((s) => s.settings.gender))
  const [err, setErr] = useState('')
  const set = <K extends keyof GarmentDraft>(k: K, v: GarmentDraft[K]) => setD((p) => ({ ...p, [k]: v }))

  const submit = () => {
    const name = d.name.trim() || `${CATEGORIES.find((c) => c.id === d.category)?.label.replace(/s$/, '') ?? 'Pièce'} ${colorName(d.color).toLowerCase()}`
    if (!d.category) return setErr('Choisis une catégorie.')
    onSubmit({ ...d, name })
  }

  return (
    <div>
      <GarmentThumb garment={{ ...d, name: d.name || 'Aperçu' }} className="mx-auto mb-7 aspect-[4/5] w-[62%] rounded-maison shadow-depth" />

      <Field label="Nom">
        <input className="field" value={d.name} onChange={(e) => set('name', e.target.value)} placeholder="Chemise Oxford blanche" />
      </Field>

      <Field label="Catégorie">
        <div className="no-scrollbar -mx-6 flex gap-2 overflow-x-auto px-6">
          {CATEGORIES.map((c) => (
            <button key={c.id} type="button" onClick={() => set('category', c.id as CategoryId)} className={cx('chip', d.category === c.id && 'chip-on')}>
              {c.label}
            </button>
          ))}
        </div>
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Sous-catégorie">
          <input className="field" value={d.subcategory} onChange={(e) => set('subcategory', e.target.value)} placeholder="Oxford, chino…" />
        </Field>
        <Field label="Marque">
          <input className="field" value={d.brand} onChange={(e) => set('brand', e.target.value)} placeholder="Ralph Lauren" />
        </Field>
      </div>

      <Field label={`Couleur principale — ${colorName(d.color)}`}>
        <div className="flex flex-wrap items-center gap-3">
          {NAMED_COLORS.map((c) => (
            <button key={c.hex} type="button" onClick={() => set('color', c.hex)} aria-label={c.name}>
              <ColorDot color={c.hex} size={26} ring={d.color.toLowerCase() === c.hex.toLowerCase()} />
            </button>
          ))}
          <label className="relative flex h-[26px] w-[26px] cursor-pointer items-center justify-center rounded-full border border-dashed border-champagne/60 text-[14px] text-champagne">
            +
            <input type="color" value={d.color} onChange={(e) => set('color', e.target.value)} className="absolute inset-0 cursor-pointer opacity-0" />
          </label>
        </div>
      </Field>

      <Field label="Couleurs secondaires">
        <div className="flex flex-wrap items-center gap-3">
          {NAMED_COLORS.map((c) => (
            <button key={c.hex} type="button" onClick={() => set('secondaryColors', toggle(d.secondaryColors, c.hex))} aria-label={c.name}>
              <ColorDot color={c.hex} size={20} ring={d.secondaryColors.includes(c.hex)} />
            </button>
          ))}
        </div>
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Matière">
          <select className="field appearance-none" value={d.material} onChange={(e) => set('material', e.target.value)}>
            {MATERIALS.map((m) => <option key={m}>{m}</option>)}
          </select>
        </Field>
        <Field label="Taille">
          <input className="field" value={d.size} onChange={(e) => set('size', e.target.value)} placeholder="M, 42, 32…" />
        </Field>
      </div>

      <Field label="Saisons">
        <div className="flex flex-wrap gap-2">
          {SEASONS.map((s) => (
            <button key={s.id} type="button" onClick={() => set('seasons', toggle(d.seasons, s.id as Season))} className={cx('chip', d.seasons.includes(s.id) && 'chip-on')}>
              {s.label}
            </button>
          ))}
        </div>
      </Field>

      <Field label="Style">
        <div className="flex flex-wrap gap-2">
          {STYLES.map((s) => (
            <button key={s} type="button" onClick={() => set('styles', toggle(d.styles, s as Style))} className={cx('chip', d.styles.includes(s) && 'chip-on')}>
              {s}
            </button>
          ))}
        </div>
      </Field>

      <Field label={`Formalité — ${FORMALITY_LABEL[d.formality]}`}>
        <input type="range" min={1} max={5} step={1} value={d.formality} onChange={(e) => set('formality', Number(e.target.value) as GarmentDraft['formality'])} />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Date d’achat">
          <input type="date" className="field" value={d.purchaseDate} onChange={(e) => set('purchaseDate', e.target.value)} />
        </Field>
        <Field label="Prix (facultatif)">
          <input
            type="number" inputMode="decimal" min={0} className="field" placeholder="€"
            value={d.price ?? ''} onChange={(e) => set('price', e.target.value === '' ? null : Math.max(0, Number(e.target.value)))}
          />
        </Field>
      </div>

      <Field label="Notes personnelles">
        <textarea className="field min-h-[84px]" value={d.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Coupe, occasion, entretien…" />
      </Field>

      {err && <p className="mb-4 text-[12px] text-red-300/80">{err}</p>}
      <div className="flex gap-3">
        {onCancel && <button type="button" onClick={onCancel} className="btn-ghost flex-1">Annuler</button>}
        <button type="button" onClick={submit} className="btn-gold flex-[2]">{submitLabel}</button>
      </div>
    </div>
  )
}
