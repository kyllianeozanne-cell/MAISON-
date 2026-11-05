import { useEffect, useMemo, useState } from 'react'
import { Silhouette } from './GarmentThumb'
import { cutoutDataUrl } from '../lib/photo'
import { slotOf } from '../lib/constants'
import { cx } from '../lib/utils'
import type { Garment } from '../types'

const results = new Map<string, string>()
const pending = new Map<string, Promise<void>>()
const keyOf = (g: Garment) => `${g.id}:${g.photo.length}`

function useCutouts(items: Garment[]) {
  const [, force] = useState(0)
  useEffect(() => {
    let alive = true
    items.forEach((g) => {
      if (!g.photo) return
      const key = keyOf(g)
      if (results.has(key)) return
      let p = pending.get(key)
      if (!p) {
        p = cutoutDataUrl(g.photo).catch(() => g.photo).then((u) => { results.set(key, u) })
        pending.set(key, p)
      }
      p.then(() => { if (alive) force((n) => n + 1) })
    })
    return () => { alive = false }
  }, [items])
  return (g: Garment) => (g.photo ? results.get(keyOf(g)) ?? '' : '')
}

interface Box { l: number; t: number; w: number; h: number }
interface Placed { g: Garment; b: Box; z: number }

/** Disposition « flat lay » éditoriale, recentrée et agrandie selon les pièces présentes. */
function layout(items: Garment[]): Placed[] {
  const by = (s: string) => items.filter((g) => slotOf(g.category) === s)
  const outer = [...by('outer'), ...by('suit')][0]
  const top = by('top')[0]
  const bottom = by('bottom')[0]
  const shoes = by('shoes')[0]
  const acc = by('accessory').slice(0, 4)
  const raw: Placed[] = []
  if (outer) raw.push({ g: outer, b: { l: 3, t: 3, w: 52, h: 46 }, z: 2 })
  if (top) raw.push({ g: top, b: outer ? { l: 6, t: 46, w: 42, h: 28 } : { l: 4, t: 4, w: 50, h: 44 }, z: 1 })
  if (bottom) raw.push({ g: bottom, b: { l: 48, t: 4, w: 48, h: 62 }, z: 1 })
  if (shoes) raw.push({ g: shoes, b: outer || top ? { l: 6, t: 76, w: 44, h: 20 } : { l: 6, t: 60, w: 44, h: 30 }, z: 1 })
  acc.forEach((g, i) => raw.push({ g, b: { l: 54 + (i % 2) * 22, t: 70 + Math.floor(i / 2) * 14, w: 20, h: 14 }, z: 3 }))
  if (raw.length === 0) return []
  const minL = Math.min(...raw.map((p) => p.b.l))
  const minT = Math.min(...raw.map((p) => p.b.t))
  const bw = Math.max(...raw.map((p) => p.b.l + p.b.w)) - minL
  const bh = Math.max(...raw.map((p) => p.b.t + p.b.h)) - minT
  const s = Math.min(92 / bw, 92 / bh, 1.7)
  const ox = 4 + (92 - bw * s) / 2
  const oy = 4 + (92 - bh * s) / 2
  return raw.map((p) => ({ ...p, b: { l: ox + (p.b.l - minL) * s, t: oy + (p.b.t - minT) * s, w: p.b.w * s, h: p.b.h * s } }))
}

export function LookBoard({ items, className }: { items: Garment[]; className?: string }) {
  const cut = useCutouts(items)
  const placed = useMemo(() => layout(items), [items])
  return (
    <div className={cx('relative aspect-[4/5] overflow-hidden rounded-maison bg-gradient-to-b from-[#ece4d6] to-[#d8cdb9]', className)}>
      <div className="absolute inset-x-[10%] bottom-[4%] h-[3%] rounded-[50%] bg-black/10 blur-xl" />
      {placed.map(({ g, b, z }) => {
        const src = cut(g) || g.photo
        return (
          <div key={g.id} className="absolute" style={{ left: `${b.l}%`, top: `${b.t}%`, width: `${b.w}%`, height: `${b.h}%`, zIndex: z }}>
            {g.photo ? (
              <img src={src} alt={g.name} draggable={false} className="h-full w-full object-contain" style={{ filter: 'drop-shadow(0 8px 10px rgba(40,30,20,0.28))' }} />
            ) : (
              <Silhouette category={g.category} color={g.color} className="h-full w-full drop-shadow-[0_8px_10px_rgba(40,30,20,0.28)]" />
            )}
          </div>
        )
      })}
    </div>
  )
}
