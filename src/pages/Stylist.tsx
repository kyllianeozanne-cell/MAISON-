import { useEffect, useMemo, useRef, useState } from 'react'
import { LookCard } from '../components/Look'
import { Header, Icon, Spinner, toast } from '../components/ui'
import { aiConfigured, askStylist } from '../lib/ai'
import { colorAdvice, missingForOutfit, parseIntent, suggest, weatherCompat, wardrobeInsights } from '../lib/stylist'
import { useStore } from '../lib/store'
import { useWeather } from '../lib/weatherStore'
import { cx, uid } from '../lib/utils'
import type { Look } from '../types'

interface Msg { id: string; role: 'user' | 'assistant'; text: string; look?: Look }

const PROMPTS = [
  'Habille-moi pour aujourd’hui',
  'Propose-moi une tenue pour un rendez-vous',
  'Fais-moi une tenue old money',
  'Propose quelque chose de plus décontracté',
  'Je veux être élégant sans être trop habillé',
  'Que porter avec mon pantalon beige ?',
  'Quelles couleurs vont avec mon pull marine ?',
  'Analyse mon dressing',
]

export function Stylist({ tryLook }: { tryLook: (l: { itemIds: string[] }) => void }) {
  const garments = useStore((s) => s.garments)
  const settings = useStore((s) => s.settings)
  const saveOutfit = useStore((s) => s.saveOutfit)
  const weather = useWeather((s) => s.weather)
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const end = useRef<HTMLDivElement>(null)
  const useAi = aiConfigured && settings.aiEnabled

  useEffect(() => { end.current?.scrollIntoView({ behavior: 'smooth' }) }, [msgs, busy])
  const history = useMemo(() => msgs.map((m) => ({ role: m.role, content: m.text })), [msgs])

  const ask = async (text: string, avoid: string[] = []) => {
    const t = text.trim()
    if (!t || busy) return
    setInput('')
    setMsgs((m) => [...m, { id: uid(), role: 'user', text: t }])
    const lower = t.toLowerCase()
    const advice = colorAdvice(t, garments)
    if (advice || /analyse|bilan|am[ée]liorer mon style/.test(lower)) {
      setMsgs((m) => [...m, { id: uid(), role: 'assistant', text: advice ?? wardrobeInsights(garments) }])
      return
    }
    const miss = missingForOutfit(garments)
    if (miss.length) {
      setMsgs((m) => [...m, { id: uid(), role: 'assistant', text: `Je ne peux composer une tenue qu’avec tes pièces, et il me manque ${miss.join(' et ')}. Ajoute-les à ton dressing et je m’en occupe.` }])
      return
    }
    setBusy(true)
    try {
      if (useAi) {
        try {
          const a = await askStylist(t, garments, weather, history)
          if (a.itemIds.length >= 2) {
            const score = weatherCompat(a.itemIds.map((id) => garments.find((g) => g.id === id)!), weather, { context: 'quotidien', tone: 'default', mustInclude: [] })
            setMsgs((m) => [...m, { id: uid(), role: 'assistant', text: a.message, look: { id: uid(), title: a.title, itemIds: a.itemIds, reason: '', score, context: 'quotidien' } }])
            setBusy(false)
            return
          }
        } catch {
          toast('IA indisponible : analyse locale')
        }
      }
      const intent = parseIntent(t, garments)
      const look = suggest(garments, weather, { context: intent.context, tone: intent.tone, mustInclude: intent.mustInclude, avoidIds: avoid, count: 1, prefs: { styles: settings.favStyles ?? [], colors: settings.favColors ?? [] } })[0]
      setMsgs((m) => [...m, look
        ? { id: uid(), role: 'assistant', text: 'Voici ma sélection, composée uniquement de tes pièces.', look: { ...look, title: intent.label } }
        : { id: uid(), role: 'assistant', text: 'Je n’ai pas trouvé de combinaison disponible. Une pièce est peut-être au lavage ?' }])
    } finally {
      setBusy(false)
    }
  }

  const lastUser = [...msgs].reverse().find((m) => m.role === 'user')?.text

  return (
    <div className="flex min-h-full flex-col pb-28">
      <Header eyebrow="Des tenues pensées pour toi, avec tes vêtements." title="Mon styliste" />
      <div className="flex-1 px-6">
        {msgs.length === 0 ? (
          <div>
            <p className="mb-6 max-w-[320px] font-serif text-[22px] italic leading-snug text-creme/70">
              Je connais ton dressing. Dis-moi l’occasion, je compose avec ce que tu possèdes.
            </p>
            <div className="flex flex-col gap-2.5">
              {PROMPTS.map((p) => (
                <button key={p} onClick={() => ask(p)} className="flex items-center justify-between rounded-xl border border-white/[0.07] px-4 py-3.5 text-left text-[13.5px] text-ivoire transition active:scale-[0.99]">
                  {p}<Icon name="chevron" size={15} className="text-champagne" />
                </button>
              ))}
            </div>
            <p className="mt-6 text-[11px] text-creme/35">{useAi ? 'Styliste IA actif.' : 'Analyse locale : règles de style, météo et couleurs. Aucune pièce inventée.'}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            {msgs.map((m) => (
              <div key={m.id} className={cx('flex flex-col', m.role === 'user' ? 'items-end' : 'items-start')}>
                <div className={cx('max-w-[88%] rounded-2xl px-4 py-3 text-[13.5px] leading-relaxed', m.role === 'user' ? 'bg-champagne text-noir' : 'bg-anthracite text-ivoire')}>{m.text}</div>
                {m.look && (
                  <div className="mt-3 w-full">
                    <LookCard look={m.look} garments={garments} onTry={tryLook} hasWeather={!!weather} wide />
                    <div className="mt-3 flex gap-2">
                      <button className="btn-ghost flex-1 !px-3" onClick={() => { saveOutfit(m.look!.title || 'Sélection du styliste', m.look!.itemIds, m.look!.context); toast('Tenue enregistrée') }}>Enregistrer</button>
                      <button className="btn-ghost flex-1 !px-3" onClick={() => lastUser && ask(lastUser, m.look!.itemIds)}>Autre idée</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {busy && <div className="flex"><Spinner /></div>}
            <div ref={end} />
          </div>
        )}
      </div>
      <form onSubmit={(e) => { e.preventDefault(); ask(input) }} className="sticky bottom-[72px] mt-6 flex gap-2 bg-gradient-to-t from-noir via-noir to-transparent px-6 pb-3 pt-4">
        <input className="field" placeholder="Que veux-tu porter ?" value={input} onChange={(e) => setInput(e.target.value)} />
        <button type="submit" className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-full bg-champagne text-noir" aria-label="Envoyer"><Icon name="send" size={18} /></button>
      </form>
    </div>
  )
}
