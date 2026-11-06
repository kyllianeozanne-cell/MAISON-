import { readableOn } from '../lib/colors'
import { cx } from '../lib/utils'
import type { CategoryId, Garment } from '../types'

type Shape = 'dress' | 'skirt' | 'jumpsuit' | 'heel' | 'tee' | 'shirt' | 'knit' | 'coat' | 'jacket' | 'pants' | 'shorts' | 'shoe' | 'boot' | 'belt' | 'watch' | 'bag' | 'misc'

const SHAPE: Record<CategoryId, Shape> = {
  tshirt: 'tee', polo: 'tee', chemise: 'shirt', pull: 'knit', sweat: 'knit',
  veste: 'jacket', manteau: 'coat', blouson: 'jacket', costume: 'jacket',
  pantalon: 'pants', jean: 'pants', short: 'shorts',
  chaussures: 'shoe', baskets: 'shoe', bottines: 'boot',
  ceinture: 'belt', montre: 'watch', sac: 'bag', accessoire: 'misc', autre: 'misc',
  blouse: 'shirt', robe: 'dress', jupe: 'skirt', combinaison: 'jumpsuit', ensemble: 'jacket', escarpins: 'heel', ballerines: 'shoe',
}

const D: Record<Shape, string> = {
  tee: 'M33 18 20 24 8 44l12 7 6-8v58h48V43l6 8 12-7-12-20-13-6c-2 7-8 10-17 10s-15-3-17-10Z',
  shirt: 'M34 16 18 24 6 66l11 4 9-26v66h48V44l9 26 11-4-12-42-16-8-8 7-8-5-8 5Z',
  knit: 'M34 16 17 24 5 70l12 4 9-28v66h48V46l9 28 12-4-12-46-17-8c-2 6-8 9-16 9s-14-3-16-9Z',
  coat: 'M36 14 18 22 6 74l11 4 8-26 2 60h46l2-60 8 26 11-4-12-52-18-8-14 14Z',
  jacket: 'M36 14 18 22 7 68l11 4 8-22v62h48V50l8 22 11-4-11-46-18-8-14 16Z',
  pants: 'M28 12h44l6 100H55L50 46l-5 66H22Z',
  shorts: 'M26 30h48l7 46H55l-5-24-5 24H19Z',
  shoe: 'M8 70c0-8 4-14 10-14l14 6c8 4 14-2 18-8l12 4c10 3 20 8 20 18v6H8Z',
  boot: 'M24 20h24v36c0 6 6 10 16 14 12 4 18 8 18 16v6H16V20Z',
  belt: 'M6 54h88v12H6Z M52 50h14v20H52Z',
  watch: 'M40 14h20l3 24H37Z M40 106h20l3-24H37Z M32 38h36v44H32Z',
  bag: 'M18 44h64l6 62H12Z M34 44V32a16 16 0 0 1 32 0v12',
  misc: 'M50 22l22 22-22 54-22-54Z',
  dress: 'M38 10 34 34l-14 76h60L66 34 62 10l-12 8Z',
  skirt: 'M30 30h40l16 80H14Z',
  jumpsuit: 'M34 12h32l4 30-6 4 8 66H56L50 62l-6 50H28l8-66-6-4Z',
  heel: 'M10 64c0-6 4-10 10-8l14 10c10 6 22 4 30-4l8-6c4 8 4 18 0 26l-4 8H62L58 76c-8 4-18 4-26 0v28H22V72c-6 0-12-2-12-8Z',
}

export function Silhouette({ category, color, className }: { category: CategoryId; color: string; className?: string }) {
  const shape = SHAPE[category]
  return (
    <svg viewBox="0 0 100 120" className={className} aria-hidden>
      <path d={D[shape]} fill={color} stroke="rgba(245,241,233,0.22)" strokeWidth="0.8" strokeLinejoin="round" />
      {(shape === 'shirt' || shape === 'jacket' || shape === 'coat') && (
        <path d="M50 30v84" stroke="rgba(0,0,0,0.28)" strokeWidth="0.8" fill="none" />
      )}
      {shape === 'watch' && <circle cx="50" cy="60" r="11" fill="none" stroke={readableOn(color)} strokeOpacity=".5" strokeWidth="1" />}
    </svg>
  )
}

/** Photo du vêtement si elle existe, sinon silhouette colorée. Fond neutre dans les deux cas. */
export function GarmentThumb({
  garment, className, contain = true,
}: { garment: Pick<Garment, 'photo' | 'category' | 'color' | 'name'>; className?: string; contain?: boolean }) {
  return (
    <div className={cx('relative overflow-hidden bg-creme', className)}>
      {garment.photo ? (
        <img
          src={garment.photo}
          alt={garment.name}
          loading="lazy"
          draggable={false}
          className={cx('h-full w-full', contain ? 'object-contain' : 'object-cover')}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center p-[14%]">
          <Silhouette category={garment.category} color={garment.color} className="h-full w-full drop-shadow-[0_6px_10px_rgba(0,0,0,0.25)]" />
        </div>
      )}
    </div>
  )
}
