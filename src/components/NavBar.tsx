import { motion } from 'framer-motion'
import { Icon } from './ui'
import { cx } from '../lib/utils'

export type Tab = 'home' | 'wardrobe' | 'tryon' | 'stylist' | 'profile'

const ITEMS: { id: Tab; label: string; icon: string }[] = [
  { id: 'home', label: 'Home', icon: 'home' },
  { id: 'wardrobe', label: 'Wardrobe', icon: 'hanger' },
  { id: 'tryon', label: 'Try on', icon: 'avatar' },
  { id: 'stylist', label: 'Stylist', icon: 'sparkle' },
  { id: 'profile', label: 'Profile', icon: 'profile' },
]

export function NavBar({ tab, onChange }: { tab: Tab; onChange: (t: Tab) => void }) {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 border-t border-champagne/15 bg-noir/85 backdrop-blur-xl"
      style={{ paddingBottom: 'var(--safe-bottom)' }}
    >
      <div className="mx-auto flex max-w-[560px] items-stretch justify-around px-2">
        {ITEMS.map((it) => {
          const on = tab === it.id
          return (
            <button
              key={it.id}
              onClick={() => onChange(it.id)}
              className={cx('relative flex flex-1 flex-col items-center gap-1.5 pb-3 pt-3.5 transition-colors', on ? 'text-champagne' : 'text-creme/40')}
              aria-current={on ? 'page' : undefined}
            >
              {on && (
                <motion.span
                  layoutId="nav-indicator"
                  className="absolute inset-x-6 top-0 h-px bg-champagne"
                  transition={{ type: 'spring', stiffness: 400, damping: 36 }}
                />
              )}
              <Icon name={it.icon} size={21} stroke={on ? 1.3 : 1.1} />
              <span className="text-[9px] uppercase tracking-[0.2em]">{it.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
