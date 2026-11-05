import { Icon } from './ui'
import { cx } from '../lib/utils'

export type Tab = 'home' | 'wardrobe' | 'tryon' | 'selection' | 'stylist' | 'profile'

const ITEMS: { id: Tab; label: string; icon: string }[] = [
  { id: 'home', label: 'Accueil', icon: 'home' },
  { id: 'wardrobe', label: 'Dressing', icon: 'hanger' },
  { id: 'tryon', label: 'Composer', icon: 'layers' },
  { id: 'selection', label: 'Sélection', icon: 'bag' },
  { id: 'stylist', label: 'Styliste', icon: 'sparkle' },
  { id: 'profile', label: 'Profil', icon: 'profile' },
]

export function NavBar({ tab, onChange }: { tab: Tab; onChange: (t: Tab) => void }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-white/[0.06] bg-noir/90 backdrop-blur-xl" style={{ paddingBottom: 'var(--safe-bottom)' }}>
      <div className="mx-auto flex max-w-[560px] items-stretch justify-around px-2 pt-2.5">
        {ITEMS.map((it) => {
          const on = tab === it.id
          return (
            <button key={it.id} onClick={() => onChange(it.id)} className="flex flex-1 flex-col items-center gap-1.5 pb-2.5" aria-current={on ? 'page' : undefined}>
              <span className={cx('flex h-8 w-11 items-center justify-center rounded-full transition-colors', on ? 'bg-champagne/15 text-ivoire' : 'text-creme/40')}>
                <Icon name={it.icon} size={21} stroke={on ? 1.5 : 1.1} />
              </span>
              <span className={cx('text-[9.5px] tracking-[0.02em]', on ? 'text-ivoire' : 'text-creme/40')}>{it.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
