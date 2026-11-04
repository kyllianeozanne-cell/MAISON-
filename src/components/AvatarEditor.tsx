import { useRef } from 'react'
import { Field, Sheet, ColorDot, Icon, toast } from './ui'
import { processBodyPhoto } from '../lib/photo'
import { HAIR_COLORS, SKIN_TONES } from '../lib/constants'
import { DEFAULT_AVATAR, useStore } from '../lib/store'
import { cx } from '../lib/utils'
import type { AvatarConfig } from '../types'

const HAIR: { id: AvatarConfig['hair']; label: string }[] = [
  { id: 'none', label: 'Aucune' }, { id: 'short', label: 'Courte' }, { id: 'medium', label: 'Mi-longue' },
  { id: 'long', label: 'Longue' }, { id: 'wavy', label: 'Ondulée' },
]
const BEARD: { id: AvatarConfig['beard']; label: string }[] = [
  { id: 'none', label: 'Aucune' }, { id: 'stubble', label: '3 jours' }, { id: 'short', label: 'Courte' }, { id: 'full', label: 'Fournie' },
]

function Slider({ label, value, min, max, step, onChange, format }: { label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void; format: (v: number) => string }) {
  return (
    <Field label={`${label} — ${format(value)}`}>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </Field>
  )
}

export function AvatarEditor({ open, onClose }: { open: boolean; onClose: () => void }) {
  const avatar = useStore((s) => s.avatar)
  const setAvatar = useStore((s) => s.setAvatar)
  const fileRef = useRef<HTMLInputElement>(null)
  const pct = (v: number) => `${Math.round(v * 100)} %`
  return (
    <Sheet open={open} onClose={onClose} title="Mon avatar" tall>
      <p className="mb-6 text-[12.5px] leading-relaxed text-creme/55">
        Règle ces curseurs pour que l’avatar te ressemble. Il sert à visualiser les couleurs, les volumes et l’ensemble d’une tenue.
      </p>
      <Field label="Ma photo">
        <div className="flex items-center gap-4">
          {avatar.photo ? <img src={avatar.photo} alt="" className="h-28 w-20 rounded-xl object-cover" /> : <div className="flex h-28 w-20 items-center justify-center rounded-xl border border-dashed border-champagne/40 text-champagne"><Icon name="avatar" size={24} /></div>}
          <div className="flex-1">
            <p className="mb-3 text-[11.5px] leading-relaxed text-creme/50">Une photo de toi en pied, debout, face à l’appareil, sur un fond simple. Elle reste sur cet appareil.</p>
            <div className="flex gap-2">
              <button className="btn-gold !px-4 !py-2.5" onClick={() => fileRef.current?.click()}>{avatar.photo ? 'Remplacer' : 'Importer'}</button>
              {avatar.photo && <button className="btn-ghost !px-4 !py-2.5" onClick={() => setAvatar({ photo: '', fit: {} })}>Retirer</button>}
            </div>
          </div>
        </div>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={async (e) => { const f = e.target.files?.[0]; e.target.value = ''; if (!f) return; try { setAvatar({ photo: await processBodyPhoto(f), fit: {} }); toast('Photo enregistrée') } catch { toast('Photo illisible') } }} />
      </Field>
      <p className="mb-5 text-[11px] text-creme/35">Les réglages ci-dessous servent à l’avatar 3D, utilisé quand aucune photo n’est importée.</p>
      <Slider label="Taille" value={avatar.height} min={150} max={205} step={1} onChange={(v) => setAvatar({ height: v })} format={(v) => `${v} cm`} />
      <Slider label="Morphologie" value={avatar.build} min={0} max={1} step={0.01} onChange={(v) => setAvatar({ build: v })} format={(v) => (v < 0.25 ? 'Fine' : v < 0.55 ? 'Équilibrée' : v < 0.8 ? 'Athlétique' : 'Forte')} />
      <Slider label="Épaules" value={avatar.shoulders} min={0} max={1} step={0.01} onChange={(v) => setAvatar({ shoulders: v })} format={pct} />
      <Slider label="Taille (tour)" value={avatar.waist} min={0} max={1} step={0.01} onChange={(v) => setAvatar({ waist: v })} format={pct} />
      <Slider label="Longueur de jambes" value={avatar.legs} min={0} max={1} step={0.01} onChange={(v) => setAvatar({ legs: v })} format={pct} />

      <Field label="Teint">
        <div className="flex gap-3.5">
          {SKIN_TONES.map((c) => (
            <button key={c} onClick={() => setAvatar({ skin: c })} aria-label={`Teint ${c}`}><ColorDot color={c} size={30} ring={avatar.skin === c} /></button>
          ))}
        </div>
      </Field>

      <Field label="Coiffure">
        <div className="flex flex-wrap gap-2">
          {HAIR.map((h) => <button key={h.id} onClick={() => setAvatar({ hair: h.id })} className={cx('chip', avatar.hair === h.id && 'chip-on')}>{h.label}</button>)}
        </div>
      </Field>
      <Field label="Couleur des cheveux et de la barbe">
        <div className="flex gap-3.5">
          {HAIR_COLORS.map((c) => (
            <button key={c} onClick={() => setAvatar({ hairColor: c })} aria-label={`Cheveux ${c}`}><ColorDot color={c} size={26} ring={avatar.hairColor === c} /></button>
          ))}
        </div>
      </Field>
      <Field label="Barbe">
        <div className="flex flex-wrap gap-2">
          {BEARD.map((b) => <button key={b.id} onClick={() => setAvatar({ beard: b.id })} className={cx('chip', avatar.beard === b.id && 'chip-on')}>{b.label}</button>)}
        </div>
      </Field>
      <Field label="Sous-vêtements">
        <div className="flex gap-2">
          {(['noir', 'beige'] as const).map((u) => <button key={u} onClick={() => setAvatar({ underwear: u })} className={cx('chip', avatar.underwear === u && 'chip-on')}>{u}</button>)}
        </div>
      </Field>

      <div className="mt-2 flex gap-3">
        <button className="btn-ghost flex-1" onClick={() => setAvatar({ ...DEFAULT_AVATAR, photo: avatar.photo, fit: avatar.fit })}>Réinitialiser</button>
        <button className="btn-gold flex-[2]" onClick={onClose}>Terminé</button>
      </div>
    </Sheet>
  )
}
