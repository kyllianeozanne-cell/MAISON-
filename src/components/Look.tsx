import { motion } from 'framer-motion'
import { useMemo } from 'react'
import { GarmentThumb } from './GarmentThumb'
import { Icon } from './ui'
import { slotOf } from '../lib/constants'
import { cx } from '../lib/utils'
import type { Garment, Look } from '../types'

const ORDER = ['outer', 'suit', 'top', 'bottom', 'shoes', 'accessory'] as const

export function orderItems(items: Garment[]): Garment[] {
  return [...items].sort((a, b) => ORDER.indexOf(slotOf(a.category) as never) - ORDER.indexOf(slotOf(b.category) as never))
}

/** Représentation visuelle d'une tenue : collage des pièces sur fond neutre. */
export function OutfitCollage({ items, className }: { items: Garment[]; className?: string }) {
  const shown = orderItems(items).slice(0, 6)
  const cols = shown.length <= 1 ? 1 : shown.length <= 4 ? 2 : 3
  return (
    <div
      className={cx('grid gap-px overflow-hidden rounded-maison bg-brun', className)}
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
    >
      {shown.map((g) => (
        <GarmentThumb key={g.id} garment={g} className="aspect-[4/5]" />
      ))}
    </div>
  )
}

export function CompatBadge({ score }: { score: number }) {
  const label = score >= 80 ? 'Très adaptée' : score >= 60 ? 'Adaptée' : score >= 40 ? 'Moyenne' : 'Peu adaptée'
  return (
    <div className="flex items-center gap-2.5">
      <div className="h-[3px] w-14 overflow-hidden rounded-full bg-white/10">
        <motion.div
          className="h-full bg-champagne"
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.9, ease: 'easeOut' }}
        />
      </div>
      <span className="text-[10px] uppercase tracking-[0.16em] text-creme/55">Météo · {label} ({score})</span>
    </div>
  )
}

export function LookCard({
  look, garments, onTry, hasWeather, wide = false,
}: { look: Look; garments: Garment[]; onTry: (l: Look) => void; hasWeather: boolean; wide?: boolean }) {
  const items = useMemo(
    () => look.itemIds.map((id) => garments.find((g) => g.id === id)).filter((g): g is Garment => !!g),
    [look, garments],
  )
  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className={cx('card shrink-0 overflow-hidden', wide ? 'w-full' : 'w-[78%] max-w-[320px] snap-start')}
    >
      <OutfitCollage items={items} className="rounded-none" />
      <div className="p-5">
        <div className="caps mb-2">{look.title || 'Sélection'}</div>
        <p className="mb-3 line-clamp-1 text-[13px] text-ivoire">{orderItems(items).map((g) => g.name).join(' · ')}</p>
        <p className="mb-4 text-[12.5px] leading-relaxed text-creme/60">{look.reason}</p>
        {hasWeather && <CompatBadge score={look.score} />}
        <button onClick={() => onTry(look)} className="btn-ghost mt-5 w-full">
          <Icon name="avatar" size={16} /> Essayer sur mon avatar
        </button>
      </div>
    </motion.article>
  )
}

export function LookRow({ look, garments, onTry, temp }: { look: Look; garments: Garment[]; onTry: (l: Look) => void; temp?: number | null }) {
  const items = useMemo(
    () => orderItems(look.itemIds.map((id) => garments.find((g) => g.id === id)).filter((g): g is Garment => !!g)),
    [look, garments],
  )
  return (
    <motion.button whileTap={{ scale: 0.985 }} onClick={() => onTry(look)} className="card flex w-full items-stretch gap-4 p-3 text-left">
      <OutfitCollage items={items} className="w-[36%] shrink-0" />
      <div className="flex min-w-0 flex-1 flex-col justify-center">
        <div className="font-serif text-[22px] leading-tight text-ivoire">{look.title}</div>
        {temp != null && <div className="mt-1 text-[12px] text-creme/55">{temp}°C · compatibilité {look.score} %</div>}
        <p className="mt-2 line-clamp-3 text-[11.5px] leading-snug text-creme/50">{look.reason}</p>
      </div>
      <Icon name="chevron" size={18} className="self-center text-champagne" />
    </motion.button>
  )
}
