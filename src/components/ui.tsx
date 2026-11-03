import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState, type ReactNode } from 'react'
import { create } from 'zustand'
import { cx } from '../lib/utils'

/* ---------- Icônes fines ---------- */

const PATHS: Record<string, ReactNode> = {
  home: <><path d="M3.5 11 12 4l8.5 7" /><path d="M5.5 9.8V20h13V9.8" /><path d="M10 20v-5h4v5" /></>,
  hanger: <><path d="M12 7.5a2 2 0 1 0-2-2" /><path d="M12 7.5v1.8L3.2 15.4a1.2 1.2 0 0 0 .7 2.2h16.2a1.2 1.2 0 0 0 .7-2.2L12 9.3" /></>,
  avatar: <><circle cx="12" cy="6.5" r="2.8" /><path d="M7 20.5v-6.2a5 5 0 0 1 10 0v6.2" /><path d="M9.5 20.5V16m5 4.5V16" /></>,
  sparkle: <><path d="M12 3.5v5M12 15.5v5M3.5 12h5M15.5 12h5" /><path d="m6.5 6.5 2.5 2.5m6 6 2.5 2.5m0-11L15 9m-6 6-2.5 2.5" opacity=".45" /></>,
  profile: <><circle cx="12" cy="8.5" r="3.5" /><path d="M5 20c.8-3.6 3.6-5.5 7-5.5s6.2 1.9 7 5.5" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  camera: <><path d="M4 8.5h3l1.5-2h7l1.5 2h3V19H4z" /><circle cx="12" cy="13.5" r="3.4" /></>,
  image: <><rect x="4" y="5" width="16" height="14" rx="1.5" /><circle cx="9" cy="10" r="1.4" /><path d="m5 17 4.5-4.5 3.5 3.5 2.5-2.5L19 17" /></>,
  search: <><circle cx="10.5" cy="10.5" r="6" /><path d="m15 15 5 5" /></>,
  filter: <path d="M4 7h16M7 12h10M10 17h4" />,
  heart: <path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.4a4.3 4.3 0 0 1 7.5 2.4C19.5 15.4 12 20 12 20Z" />,
  share: <><path d="M12 15V4m0 0L8 8m4-4 4 4" /><path d="M5 12v7h14v-7" /></>,
  shuffle: <><path d="M4 7h3.5c4 0 5 10 9 10H20m0 0-2.5-2.5M20 17l-2.5 2.5" /><path d="M4 17h3.5c1.4 0 2.4-1.2 3.3-2.6M20 7h-3.5c-1.4 0-2.4 1.2-3.3 2.6M20 7l-2.5-2.5M20 7l-2.5 2.5" /></>,
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  x: <path d="M6 6l12 12M18 6 6 18" />,
  chevron: <path d="m9 5 7 7-7 7" />,
  chevronL: <path d="m15 5-7 7 7 7" />,
  trash: <><path d="M5 7h14M10 7V4.5h4V7M7 7l.8 12.5h8.4L17 7" /></>,
  archive: <><rect x="4" y="5" width="16" height="4" rx="1" /><path d="M5.5 9v10h13V9M10 13h4" /></>,
  drop: <path d="M12 3.5s6 6.2 6 10.5a6 6 0 0 1-12 0C6 9.700 12 3.500 12 3.500Z" />,
  calendar: <><rect x="4" y="5.5" width="16" height="14" rx="1.5" /><path d="M4 10h16M8.5 4v3M15.500 4v3" /></>,
  bag: <><path d="M5 8h14l-1 11.500H6z" /><path d="M9 10V7a3 3 0 0 1 6 0v3" /></>,
  star: <path d="m12 4 2.4 5 5.4.7-4 3.800 1 5.400L12 16.200 7.200 18.900l1-5.400-4-3.800 5.400-.7z" />,
  wind: <><path d="M3.500 9.500h10a2.500 2.500 0 1 0-2.500-2.500" /><path d="M3.500 14h14a2.500 2.500 0 1 1-2.500 2.500" /></>,
  rain: <><path d="M7 15.500a4 4 0 0 1-.4-8 5.500 5.500 0 0 1 10.500 1.200A3.400 3.400 0 0 1 17 15.500z" /><path d="m9 18.500-.8 2m4-2-.8 2m4-2-.8 2" /></>,
  sun: <><circle cx="12" cy="12" r="3.800" /><path d="M12 3.500v2M12 18.500v2M3.500 12h2M18.500 12h2M6 6l1.400 1.400M16.600 16.600 18 18M18 6l-1.400 1.400M7.400 16.600 6 18" /></>,
  cloud: <path d="M7 18a4.500 4.500 0 0 1-.5-9 6 6 0 0 1 11.500 1.500A3.800 3.800 0 0 1 17.500 18z" />,
  edit: <><path d="m4.500 19.500 1-4.200L16 4.800a1.800 1.800 0 0 1 2.600 0l.6.6a1.800 1.800 0 0 1 0 2.600L8.700 18.500z" /><path d="m14.500 6.500 3 3" /></>,
  rotate: <><path d="M20 12a8 8 0 1 1-2.500-5.800" /><path d="M20 4.500v4h-4" /></>,
  undo: <><path d="M8 8H4V4" /><path d="M4.500 8a8 8 0 1 1-1 6" /></>,
  pin: <><path d="M12 21s6.500-5.800 6.500-11a6.500 6.500 0 0 0-13 0C5.500 15.200 12 21 12 21Z" /><circle cx="12" cy="10" r="2.300" /></>,
  send: <path d="m4 12 16-7-6 15-2.500-6.200z" />,
  layers: <><path d="m12 4 8.500 4.500L12 13 3.500 8.500z" /><path d="m3.500 12.500 8.500 4.500 8.500-4.500M3.500 16.500 12 21l8.500-4.500" opacity=".5" /></>,
  bell: <><path d="M6 17V11a6 6 0 0 1 12 0v6l1.500 1.500h-15z" /><path d="M10 20.500h4" /></>,
  list: <><path d="M9 7h11M9 12h11M9 17h11" /><circle cx="4.800" cy="7" r=".6" /><circle cx="4.800" cy="12" r=".6" /><circle cx="4.800" cy="17" r=".6" /></>,
  suitcase: <><rect x="4" y="8" width="16" height="11" rx="1.500" /><path d="M9 8V5.500h6V8M4 13h16" /></>,
  chart: <path d="M4 19.500h16M7 16v-5m5 5V6m5 10v-8" />,
  palette: <><path d="M12 4a8 8 0 1 0 0 16c1.400 0 1.800-1 1.300-1.900-.6-1 .1-2.100 1.200-2.100H16a4 4 0 0 0 4-4c0-4-3.600-8-8-8Z" /><circle cx="8" cy="11" r=".7" /><circle cx="11" cy="7.500" r=".7" /><circle cx="15" cy="8" r=".7" /></>,
  download: <><path d="M12 4v11m0 0-4-4m4 4 4-4" /><path d="M5 19.500h14" /></>,
  upload: <><path d="M12 15V4m0 0L8 8m4-4 4 4" /><path d="M5 19.500h14" /></>,
  more: <><circle cx="6" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="18" cy="12" r="1" /></>,
}

export function Icon({ name, size = 22, className, stroke = 1.2 }: { name: keyof typeof PATHS | string; size?: number; className?: string; stroke?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      {PATHS[name] ?? null}
    </svg>
  )
}

/* ---------- Toasts ---------- */

interface ToastState {
  items: { id: number; text: string }[]
  push: (text: string) => void
}
let toastId = 0
export const useToasts = create<ToastState>((set) => ({
  items: [],
  push: (text) => {
    const id = ++toastId
    set((s) => ({ items: [...s.items, { id, text }] }))
    setTimeout(() => set((s) => ({ items: s.items.filter((t) => t.id !== id) })), 2400)
  },
}))
export const toast = (text: string) => useToasts.getState().push(text)

export function ToastHost() {
  const items = useToasts((s) => s.items)
  return (
    <div
      className="pointer-events-none fixed inset-x-0 z-[90] flex flex-col items-center gap-2 px-6"
      style={{ bottom: 'calc(var(--safe-bottom) + 96px)' }}
    >
      <AnimatePresence>
        {items.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="rounded-full border border-champagne/30 bg-brun/95 px-5 py-2.5 text-[12px] tracking-wide text-ivoire shadow-depth backdrop-blur"
          >
            {t.text}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

/* ---------- Feuille modale (bottom sheet) ---------- */

export function Sheet({
  open, onClose, title, children, tall = false,
}: { open: boolean; onClose: () => void; title?: string; children: ReactNode; tall?: boolean }) {
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [open])

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[80]">
          <motion.div
            className="absolute inset-0 bg-black/70 backdrop-blur-[2px]"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className={cx(
              'absolute inset-x-0 bottom-0 mx-auto flex max-w-[560px] flex-col rounded-t-[22px] border-t border-champagne/20 bg-anthracite shadow-depth',
              tall ? 'h-[92%]' : 'max-h-[88%]',
            )}
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 320 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.5 }}
            onDragEnd={(_, info) => { if (info.offset.y > 120 || info.velocity.y > 600) onClose() }}
          >
            <div className="flex shrink-0 flex-col items-center pt-2.5">
              <div className="h-[3px] w-9 rounded-full bg-champagne/30" />
              {title && (
                <div className="flex w-full items-center justify-between px-6 pb-2 pt-4">
                  <h2 className="title-serif text-[26px]">{title}</h2>
                  <button onClick={onClose} className="-mr-2 p-2 text-creme/60" aria-label="Fermer"><Icon name="x" size={20} /></button>
                </div>
              )}
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 pb-[calc(var(--safe-bottom)+24px)] pt-2 no-scrollbar">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

/* ---------- Divers ---------- */

export function Empty({ icon, title, text, action }: { icon: string; title: string; text: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-8 py-14 text-center">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full border border-champagne/25 text-champagne">
        <Icon name={icon} size={26} stroke={1} />
      </div>
      <h3 className="title-serif mb-2 text-[26px]">{title}</h3>
      <p className="mb-7 max-w-[280px] text-[13px] leading-relaxed text-creme/55">{text}</p>
      {action}
    </div>
  )
}

export function Header({ eyebrow, title, right }: { eyebrow?: string; title: string; right?: ReactNode }) {
  return (
    <div className="flex items-end justify-between px-6 pb-4 pt-[calc(var(--safe-top)+28px)]">
      <div>
        {eyebrow && <div className="caps mb-2">{eyebrow}</div>}
        <h1 className="title-serif text-[38px]">{title}</h1>
      </div>
      {right}
    </div>
  )
}

export function Section({ title, action, children, className }: { title: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cx('mt-9', className)}>
      <div className="mb-4 flex items-baseline justify-between px-6">
        <h2 className="title-serif text-[24px]">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}

export function Splash({ label = 'MAISON' }: { label?: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center bg-noir">
      <motion.div
        initial={{ opacity: 0, letterSpacing: '0.2em' }}
        animate={{ opacity: 1, letterSpacing: '0.55em' }}
        transition={{ duration: 1.4, ease: 'easeOut' }}
        className="font-serif text-[30px] font-light text-ivoire"
      >
        {label}
      </motion.div>
      <motion.div className="mt-6 h-px bg-champagne/60" initial={{ width: 0 }} animate={{ width: 64 }} transition={{ duration: 1.2, delay: 0.3 }} />
    </div>
  )
}

export function Spinner() {
  return <div className="h-5 w-5 animate-spin rounded-full border border-champagne/30 border-t-champagne" />
}

export function Segmented<T extends string>({
  value, onChange, options,
}: { value: T; onChange: (v: T) => void; options: { id: T; label: string }[] }) {
  return (
    <div className="no-scrollbar -mx-6 flex gap-2 overflow-x-auto px-6">
      {options.map((o) => (
        <button key={o.id} onClick={() => onChange(o.id)} className={cx('chip', value === o.id && 'chip-on')}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="mb-5 block">
      <span className="caps mb-2 block">{label}</span>
      {children}
    </label>
  )
}

export function ColorDot({ color, size = 14, ring = false }: { color: string; size?: number; ring?: boolean }) {
  return (
    <span
      className={cx('inline-block shrink-0 rounded-full', ring ? 'ring-1 ring-champagne/60 ring-offset-2 ring-offset-anthracite' : 'ring-1 ring-white/15')}
      style={{ width: size, height: size, background: color }}
    />
  )
}

export function useDebounced<T>(value: T, ms = 200): T {
  const [v, setV] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return v
}

export const ease = [0.22, 1, 0.36, 1] as const
