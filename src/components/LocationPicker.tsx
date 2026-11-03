import { useState } from 'react'
import { Icon, Sheet, Spinner, toast } from './ui'
import { locate, searchCity } from '../lib/weather'
import { useStore } from '../lib/store'
import { useWeather } from '../lib/weatherStore'
import type { GeoPoint } from '../types'

export function LocationPicker({
  open, onClose, onPick,
}: { open: boolean; onClose: () => void; onPick?: (p: GeoPoint) => void }) {
  const setSettings = useStore((s) => s.setSettings)
  const load = useWeather((s) => s.load)
  const [q, setQ] = useState('')
  const [res, setRes] = useState<GeoPoint[]>([])
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const choose = (p: GeoPoint) => {
    if (onPick) onPick(p)
    else {
      setSettings({ location: p })
      setTimeout(() => load(true), 0)
      toast(`Météo : ${p.label}`)
    }
    onClose()
  }

  const gps = async () => {
    setBusy(true); setErr('')
    try { choose(await locate()) } catch (e) { setErr(e instanceof Error ? e.message : 'Erreur') }
    setBusy(false)
  }
  const search = async () => {
    setBusy(true); setErr('')
    try { const r = await searchCity(q); setRes(r); if (!r.length) setErr('Aucune ville trouvée.') }
    catch (e) { setErr(e instanceof Error ? e.message : 'Erreur') }
    setBusy(false)
  }

  return (
    <Sheet open={open} onClose={onClose} title="Localisation">
      {!onPick && (
        <button className="btn-gold mb-6 w-full" onClick={gps} disabled={busy}>
          <Icon name="pin" size={16} /> Utiliser ma position
        </button>
      )}
      <div className="flex gap-2">
        <input className="field" placeholder="Rechercher une ville" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && search()} />
        <button className="btn-ghost !px-4" onClick={search} aria-label="Chercher"><Icon name="search" size={16} /></button>
      </div>
      {busy && <div className="mt-6 flex justify-center"><Spinner /></div>}
      {err && <p className="mt-4 text-[12px] text-creme/55">{err}</p>}
      <div className="mt-4">
        {res.map((p) => (
          <button key={`${p.lat}${p.lon}`} onClick={() => choose(p)} className="flex w-full items-center justify-between border-b border-white/[0.05] py-3.5 text-left text-[14px] text-ivoire">
            {p.label}<Icon name="chevron" size={15} className="text-creme/30" />
          </button>
        ))}
      </div>
      <p className="mt-6 text-[11px] leading-relaxed text-creme/35">
        Ta position n’est utilisée que pour interroger la météo (Open-Meteo) ; elle est gardée sur cet appareil.
      </p>
    </Sheet>
  )
}
