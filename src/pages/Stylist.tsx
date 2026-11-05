import { useEffect, useRef, useState } from 'react'
import { orderItems } from '../components/Look'
import { LookBoard } from '../components/LookBoard'
import { GarmentThumb } from '../components/GarmentThumb'
import { ColorDot, Icon, Spinner, toast } from '../components/ui'
import { aiMode, askStylist } from '../lib/ai'
import { colorAdvice, missingForOutfit, parseIntent, prefsOf, resolveRef, suggest, wardrobeInsights, weatherCompat } from '../lib/stylist'
import { useStore } from '../lib/store'
import { useWeather } from '../lib/weatherStore'
import { cx, uid } from '../lib/utils'
import type { Garment, Look } from '../types'

interface Msg { id: string; role: 'user' | 'assistant'; text?: string; bullets?: string[]; looks?: Look[]; choices?: Garment[]; source?: 'local' | 'ai' }

const SUGGESTIONS = [
  'Comment m’habiller aujourd’hui ?',
  'Compose une tenue élégante',
  'Propose un look old money',
  'Que porter avec cette veste ?',
  'Prépare une tenue pour ce soir',
  'Améliore mon style',
]
const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

export function Stylist({ tryLook }: { tryLook: (l: { itemIds: string[] }) => void }) {
  const garments = useStore((s) => s.garments)
  const settings = useStore((s) => s.settings)
  const saveOutfit = useStore((s) => s.saveOutfit)
  const weather = useWeather((s) => s.weather)
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [lastAsk, setLastAsk] = useState('')
  const end = useRef<HTMLDivElement>(null)
  const mode = aiMode(settings)

  useEffect(() => { end.current?.scrollIntoView({ behavior: 'smooth' }) }, [msgs, busy])

  const push = (m: Omit<Msg, 'id' | 'role'>) => setMsgs((x) => [...x, { id: uid(), role: 'assistant', ...m }])

  const ask = async (text: string, opts: { mustInclude?: string[]; avoid?: string[] } = {}) => {
    const t = text.trim()
    if (!t || busy) return
    setInput('')
    setLastAsk(t)
    setMsgs((m) => [...m, { id: uid(), role: 'user', text: t }])
    const low = norm(t)

    if (/analyse|bilan|ameliore\w* mon style/.test(low)) {
      push({ text: 'Voici mon analyse de ton dressing :', bullets: wardrobeInsights(garments), source: 'local' })
      return
    }
    const advice = colorAdvice(t, garments)
    if (advice) { push({ text: advice, source: 'local' }); return }
    const miss = missingForOutfit(garments)
    if (miss.length) {
      push({ text: `Je ne compose qu’avec tes pièces, et il me manque ${miss.join(' et ')}. Ajoute-les à ton dressing et je m’en occupe.` })
      return
    }
    let must = opts.mustInclude ?? []
    if (!must.length) {
      const ref = resolveRef(t, garments)
      if (ref.kind === 'none') { push({ text: ref.message }); return }
      if (ref.kind === 'choose') { push({ text: ref.message, choices: ref.options }); return }
      if (ref.kind === 'one') must = [ref.garment.id]
    }

    setBusy(true)
    try {
      if (mode) {
        try {
          const history = msgs.filter((m) => m.text).map((m) => ({ role: m.role, content: m.text as string }))
          const a = await askStylist(t, garments, weather, history, { apiKey: settings.aiKey, prefs: settings, mustInclude: must, avoid: opts.avoid })
          if (a.itemIds.length >= 2) {
            const items = a.itemIds.map((id) => garments.find((g) => g.id === id)).filter((g): g is Garment => !!g)
            const score = weatherCompat(items, weather, { context: 'quotidien', tone: 'default', mustInclude: [] })
            push({ text: a.message, looks: [{ id: uid(), title: a.title, itemIds: a.itemIds, reason: '', score, context: 'quotidien' }], source: 'ai' })
            return
          }
        } catch {
          toast('IA indisponible : moteur local utilisé')
        }
      }
      const intent = parseIntent(t, garments)
      const looks = suggest(garments, weather, { context: intent.context, tone: intent.tone, mustInclude: must.length ? must : intent.mustInclude, avoidIds: opts.avoid, count: 2, prefs: prefsOf(settings) })
      if (!looks.length) { push({ text: 'Je n’ai pas trouvé de combinaison disponible. Une pièce est peut-être au lavage ?' }); return }
      push({
        text: looks.length > 1 ? 'Voici deux propositions, composées uniquement de tes pièces.' : 'Voici ma proposition, composée uniquement de tes pièces.',
        looks: looks.map((l, i) => ({ ...l, title: i === 0 ? intent.label : 'Alternative' })),
        source: 'local',
      })
    } finally {
      setBusy(false)
    }
  }

  const save = (l: Look, favorite: boolean) => {
    saveOutfit(l.title || 'Sélection du styliste', l.itemIds, l.context, favorite)
    toast(favorite ? 'Ajoutée aux favoris' : 'Ajoutée au lookbook')
  }

  const LookBlock = ({ look }: { look: Look }) => {
    const items = orderItems(look.itemIds.map((id) => garments.find((g) => g.id === id)).filter((g): g is Garment => !!g))
    const bullets = look.reason ? look.reason.split(/(?<=\.)\s+/).filter(Boolean) : []
    return (
      <div className="card mt-3 w-full overflow-hidden">
        <LookBoard items={items} className="rounded-none" />
        <div className="p-5">
          <div className="caps mb-3">{look.title}</div>
          <ul className="mb-4 space-y-1.5">
            {items.map((g) => <li key={g.id} className="flex items-center gap-2.5 text-[13px] text-ivoire"><ColorDot color={g.color} size={10} />{g.name}</li>)}
          </ul>
          {bullets.length > 0 && <ul className="mb-4 space-y-1.5 border-t border-white/[0.06] pt-4">{bullets.map((b) => <li key={b} className="text-[12.5px] leading-relaxed text-creme/60">{b}</li>)}</ul>}
          {look.match != null && <p className="mb-4 text-[11px] uppercase tracking-[0.14em] text-creme/45">Compatibilité {look.match} %{weather ? ` · météo ${look.score} %` : ''} · harmonie {look.harmony ?? '—'} %</p>}
          <div className="grid grid-cols-2 gap-2.5">
            <button className="btn-gold col-span-2" onClick={() => tryLook(look)}><Icon name="layers" size={15} /> Composer ce look</button>
            <button className="btn-ghost !px-3" onClick={() => save(look, true)}><Icon name="heart" size={15} /> Favori</button>
            <button className="btn-ghost !px-3" onClick={() => save(look, false)}><Icon name="check" size={15} /> Lookbook</button>
            <button className="btn-ghost col-span-2 !px-3" onClick={() => lastAsk && ask(lastAsk, { avoid: look.itemIds })}><Icon name="shuffle" size={15} /> Une autre idée</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-full flex-col pb-28">
      <div className="px-6 pt-[calc(var(--safe-top)+28px)]">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-champagne/40 font-serif text-[28px] text-champagne">M</div>
          <div>
            <h1 className="title-serif text-[32px]">Mon styliste</h1>
            <p className="text-[12.5px] text-creme/55">Il compose avec ce que tu possèdes.</p>
          </div>
        </div>
        <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/10 px-3.5 py-1.5 text-[10.5px] uppercase tracking-[0.14em] text-creme/60">
          <span className={cx('h-1.5 w-1.5 rounded-full', mode ? 'bg-champagne' : 'bg-creme/40')} />
          {mode === 'direct' ? 'IA Claude · clé personnelle' : mode === 'server' ? 'IA · serveur' : 'Moteur de style local · sans IA'}
        </div>
      </div>

      <div className="flex-1 px-6">
        {msgs.length === 0 ? (
          <div className="mt-8">
            <p className="mb-6 max-w-[330px] font-serif text-[22px] italic leading-snug text-creme/70">Couleurs, matières, météo, occasion : dis-moi ce dont tu as besoin.</p>
            <div className="flex flex-col gap-2.5">
              {SUGGESTIONS.map((p) => (
                <button key={p} onClick={() => ask(p)} className="flex items-center justify-between rounded-xl border border-white/[0.07] px-4 py-3.5 text-left text-[14px] text-ivoire transition active:scale-[0.99]">
                  {p}<Icon name="chevron" size={15} className="text-champagne" />
                </button>
              ))}
            </div>
            {!mode && <p className="mt-6 text-[11px] leading-relaxed text-creme/35">Ce moteur applique des règles de couleurs, de formalité, de météo et de saison : ce n’est pas une IA. Pour une vraie IA, ajoute ta clé dans Profil → Réglages.</p>}
          </div>
        ) : (
          <div className="mt-6 flex flex-col gap-5">
            {msgs.map((m) => (
              <div key={m.id} className={cx('flex flex-col', m.role === 'user' ? 'items-end' : 'items-start')}>
                {m.text && <div className={cx('max-w-[90%] rounded-2xl px-4 py-3 text-[14px] leading-relaxed', m.role === 'user' ? 'bg-champagne text-noir' : 'bg-anthracite text-ivoire')}>{m.text}</div>}
                {m.bullets && <ul className="mt-3 w-full space-y-2 rounded-2xl bg-anthracite p-4">{m.bullets.map((b) => <li key={b} className="flex gap-3 text-[13px] leading-relaxed text-creme/75"><span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-champagne" />{b}</li>)}</ul>}
                {m.choices && (
                  <div className="no-scrollbar mt-3 flex w-full gap-3 overflow-x-auto">
                    {m.choices.map((g) => (
                      <button key={g.id} onClick={() => ask(`Que porter avec ${g.name} ?`, { mustInclude: [g.id] })} className="w-24 shrink-0 text-left">
                        <GarmentThumb garment={g} className="aspect-[4/5] rounded-xl" />
                        <div className="mt-1.5 line-clamp-2 text-[11px] leading-tight text-creme/70">{g.name}</div>
                      </button>
                    ))}
                  </div>
                )}
                {m.looks?.map((l) => <LookBlock key={l.id} look={l} />)}
                {m.role === 'assistant' && m.source && <span className="mt-2 text-[9.5px] uppercase tracking-[0.16em] text-creme/30">{m.source === 'ai' ? 'Généré par IA' : 'Moteur de style local'}</span>}
              </div>
            ))}
            {busy && <div className="flex"><Spinner /></div>}
            <div ref={end} />
          </div>
        )}
      </div>

      {msgs.length > 0 && (
        <div className="no-scrollbar mt-4 flex gap-2 overflow-x-auto px-6">
          {SUGGESTIONS.map((p) => <button key={p} onClick={() => ask(p)} className="chip">{p}</button>)}
        </div>
      )}
      <form onSubmit={(e) => { e.preventDefault(); ask(input) }} className="sticky bottom-[72px] mt-4 flex gap-2 bg-gradient-to-t from-noir via-noir to-transparent px-6 pb-3 pt-4">
        <input className="field" placeholder="Que veux-tu porter ?" value={input} onChange={(e) => setInput(e.target.value)} />
        <button type="submit" className="flex h-[48px] w-[48px] shrink-0 items-center justify-center rounded-full bg-champagne text-noir" aria-label="Envoyer"><Icon name="send" size={18} /></button>
      </form>
    </div>
  )
}
