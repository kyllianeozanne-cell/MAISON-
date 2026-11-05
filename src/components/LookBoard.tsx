import { readableOn } from '../lib/colors'
import { slotOf } from '../lib/constants'
import { cx } from '../lib/utils'
import type { Garment } from '../types'

/** Tuile d'une pièce : sa photo, ou un aplat de sa couleur avec son nom. */
function Tile({ g, className }: { g: Garment; className?: string }) {
  return (
    <div className={cx('relative min-h-0 overflow-hidden rounded-[10px] bg-[#f3eee4] shadow-[0_6px_14px_rgba(40,30,20,0.22)]', className)}>
      {g.photo ? (
        <img src={g.photo} alt={g.name} draggable={false} loading="lazy" className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: 'center 35%' }} />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center p-2 text-center font-serif text-[13px] italic leading-tight" style={{ background: g.color, color: readableOn(g.color) }}>
          {g.name}
        </div>
      )}
    </div>
  )
}

/** Planche façon lookbook : pièces rangées en deux colonnes, sans chevauchement. */
export function LookBoard({ items, className }: { items: Garment[]; className?: string }) {
  const by = (s: string) => items.filter((g) => slotOf(g.category) === s)
  const left = [...by('outer'), ...by('suit'), ...by('top')].slice(0, 2)
  const right = [...by('bottom'), ...by('shoes')].slice(0, 2)
  const acc = by('accessory').slice(0, 3)
  const rest = items.filter((g) => !left.includes(g) && !right.includes(g) && !acc.includes(g)).slice(0, 2)
  const l = left.length ? left : rest
  const r = right.length ? right : left.length ? rest : []
  return (
    <div className={cx('relative flex aspect-[4/5] flex-col gap-[2.5%] overflow-hidden rounded-maison bg-gradient-to-b from-[#ece4d6] to-[#d8cdb9] p-[4%]', className)}>
      <div className="flex min-h-0 flex-1 gap-[3%]">
        {l.length > 0 && <div className="flex min-w-0 flex-1 flex-col gap-[3%]">{l.map((g, i) => <Tile key={g.id} g={g} className={cx('flex-1', i === 0 && l.length > 1 && 'flex-[1.25]')} />)}</div>}
        {r.length > 0 && <div className="flex min-w-0 flex-1 flex-col gap-[3%]">{r.map((g, i) => <Tile key={g.id} g={g} className={cx('flex-1', i === 0 && r.length > 1 && 'flex-[2]')} />)}</div>}
      </div>
      {acc.length > 0 && <div className="flex h-[19%] shrink-0 gap-[3%]">{acc.map((g) => <Tile key={g.id} g={g} className="flex-1" />)}</div>}
    </div>
  )
}
