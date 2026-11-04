import { useEffect, useRef, useState } from 'react'
import { Silhouette } from './GarmentThumb'
import { cutoutDataUrl } from '../lib/photo'
import { slotOf } from '../lib/constants'
import { clamp, cx } from '../lib/utils'
import type { AvatarConfig, Garment, Slot } from '../types'

export type Fit = { x: number; y: number; s: number }

const DEFAULT_FIT: Partial<Record<Slot, Fit>> = {
  top: { x: 0.5, y: 0.17, s: 0.44 },
  outer: { x: 0.5, y: 0.15, s: 0.54 },
  suit: { x: 0.5, y: 0.15, s: 0.54 },
  bottom: { x: 0.5, y: 0.46, s: 0.36 },
  shoes: { x: 0.5, y: 0.88, s: 0.34 },
}
export const fitOf = (fit: AvatarConfig['fit'] | undefined, slot: Slot): Fit => fit?.[slot] ?? DEFAULT_FIT[slot] ?? { x: 0.5, y: 0.5, s: 0.3 }
const Z: Record<string, number> = { bottom: 1, shoes: 2, top: 3, suit: 4, outer: 5 }

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

export function PhotoAvatar({
  photo, items, fit, selected, onFit,
}: { photo: string; items: Garment[]; fit: AvatarConfig['fit'] | undefined; selected?: Slot | null; onFit?: (slot: Slot, f: Fit) => void }) {
  const box = useRef<HTMLDivElement>(null)
  const drag = useRef<{ slot: Slot; px: number; py: number; f: Fit } | null>(null)
  const [ratio, setRatio] = useState(0.6)
  const cut = useCutouts(items)
  const layers = items
    .filter((g) => slotOf(g.category) !== 'accessory')
    .sort((a, b) => (Z[slotOf(a.category)] ?? 0) - (Z[slotOf(b.category)] ?? 0))

  const down = (e: React.PointerEvent, slot: Slot) => {
    if (!onFit || selected !== slot) return
    ;(e.currentTarget as Element).setPointerCapture?.(e.pointerId)
    drag.current = { slot, px: e.clientX, py: e.clientY, f: fitOf(fit, slot) }
  }
  const move = (e: React.PointerEvent) => {
    const d = drag.current
    const el = box.current
    if (!d || !el || !onFit) return
    const r = el.getBoundingClientRect()
    onFit(d.slot, { ...d.f, x: clamp(d.f.x + (e.clientX - d.px) / r.width, 0, 1), y: clamp(d.f.y + (e.clientY - d.py) / r.height, -0.2, 1) })
  }
  const up = () => { drag.current = null }

  return (
    <div className="flex h-full items-center justify-center">
      <div ref={box} className="relative h-full select-none overflow-hidden" style={{ aspectRatio: String(ratio) }} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
        <img src={photo} alt="Ma photo" draggable={false} className="block h-full w-full object-cover" onLoad={(e) => setRatio(e.currentTarget.naturalWidth / e.currentTarget.naturalHeight)} />
        {layers.map((g) => {
          const slot = slotOf(g.category)
          const f = fitOf(fit, slot)
          const src = cut(g)
          return (
            <div
              key={g.id}
              onPointerDown={(e) => down(e, slot)}
              className={cx('absolute', selected === slot && 'outline-dashed outline-1 outline-champagne')}
              style={{ left: `${f.x * 100}%`, top: `${f.y * 100}%`, width: `${f.s * 100}%`, transform: 'translateX(-50%)', zIndex: Z[slot] ?? 1, touchAction: selected === slot ? 'none' : 'auto', filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.35))' }}
            >
              {g.photo ? (src ? <img src={src} alt="" draggable={false} className="pointer-events-none block w-full" /> : null) : <Silhouette category={g.category} color={g.color} className="block w-full" />}
            </div>
          )
        })}
      </div>
    </div>
  )
}
