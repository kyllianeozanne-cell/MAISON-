import { useRef, useState } from 'react'
import { emptyDraft, GarmentForm, type GarmentDraft } from './GarmentForm'
import { Icon, Sheet, Spinner, toast } from './ui'
import { colorName } from '../lib/colors'
import { dominantColor, processPhoto } from '../lib/photo'
import { useStore } from '../lib/store'
import { cx } from '../lib/utils'

interface QueueItem { photo: string; color: string }

export function AddGarmentSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const addGarment = useStore((s) => s.addGarment)
  const [queue, setQueue] = useState<QueueItem[] | null>(null)
  const [index, setIndex] = useState(0)
  const [manual, setManual] = useState(false)
  const [busy, setBusy] = useState(false)
  const [cutout, setCutout] = useState(true)
  const camRef = useRef<HTMLInputElement>(null)
  const galRef = useRef<HTMLInputElement>(null)
  const multiRef = useRef<HTMLInputElement>(null)

  const reset = () => { setQueue(null); setIndex(0); setManual(false); setBusy(false) }
  const close = () => { reset(); onClose() }

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    setBusy(true)
    try {
      const out: QueueItem[] = []
      for (const f of Array.from(files).slice(0, 20)) {
        if (!f.type.startsWith('image/')) continue
        const photo = await processPhoto(f, { cutout })
        const color = await dominantColor(photo).catch(() => '#8b8b8b')
        out.push({ photo, color })
      }
      if (out.length === 0) { toast('Aucune image valide.'); setBusy(false); return }
      setQueue(out)
      setIndex(0)
    } catch {
      toast('Impossible de lire cette photo.')
    }
    setBusy(false)
  }

  const onSubmit = (d: GarmentDraft) => {
    addGarment(d)
    if (queue && index < queue.length - 1) {
      toast(`Pièce ajoutée · ${index + 1}/${queue.length}`)
      setIndex(index + 1)
    } else {
      toast('Pièce ajoutée à ton dressing')
      close()
    }
  }

  const current = queue?.[index]
  const showForm = manual || !!current

  return (
    <Sheet open={open} onClose={close} title={showForm ? (queue && queue.length > 1 ? `Pièce ${index + 1} sur ${queue.length}` : 'Nouvelle pièce') : 'Ajouter une pièce'} tall={showForm}>
      {showForm ? (
        <GarmentForm
          key={index + (manual ? 'm' : 'p')}
          initial={emptyDraft(current ? { photo: current.photo, color: current.color, name: '', notes: `Couleur détectée : ${colorName(current.color)}` } : {})}
          submitLabel={queue && index < queue.length - 1 ? 'Enregistrer et suivante' : 'Enregistrer la pièce'}
          onSubmit={onSubmit}
          onCancel={() => (queue && index < queue.length - 1 ? setIndex(index + 1) : close())}
        />
      ) : busy ? (
        <div className="flex flex-col items-center gap-4 py-16 text-[12px] uppercase tracking-[0.2em] text-creme/50">
          <Spinner /> Préparation des photos
        </div>
      ) : (
        <div>
          <button
            onClick={() => setCutout((c) => !c)}
            className="mb-6 flex w-full items-center justify-between rounded-xl border border-white/10 px-4 py-3.5 text-left"
          >
            <span>
              <span className="block text-[13px] text-ivoire">Détourer le fond</span>
              <span className="block text-[11px] text-creme/45">Efficace sur fond uni (mur, sol). Sinon, fond neutre.</span>
            </span>
            <span className={cx('flex h-6 w-11 items-center rounded-full px-0.5 transition', cutout ? 'bg-champagne' : 'bg-white/10')}>
              <span className={cx('h-5 w-5 rounded-full bg-noir transition-transform', cutout && 'translate-x-5 bg-noir')} />
            </span>
          </button>

          {[
            { icon: 'camera', t: 'Prendre une photo', s: 'Avec l’appareil photo', on: () => camRef.current?.click() },
            { icon: 'image', t: 'Depuis la galerie', s: 'Une photo existante', on: () => galRef.current?.click() },
            { icon: 'layers', t: 'Plusieurs photos', s: 'Ajoute-en jusqu’à 20 d’un coup', on: () => multiRef.current?.click() },
            { icon: 'edit', t: 'Ajout manuel', s: 'Sans photo, avec une silhouette', on: () => setManual(true) },
          ].map((o) => (
            <button key={o.t} onClick={o.on} className="mb-3 flex w-full items-center gap-4 rounded-xl border border-white/[0.06] bg-noir/60 px-4 py-4 text-left transition active:scale-[0.99]">
              <span className="flex h-11 w-11 items-center justify-center rounded-full border border-champagne/30 text-champagne"><Icon name={o.icon} size={20} /></span>
              <span className="flex-1">
                <span className="block text-[14px] text-ivoire">{o.t}</span>
                <span className="block text-[11.5px] text-creme/45">{o.s}</span>
              </span>
              <Icon name="chevron" size={16} className="text-creme/30" />
            </button>
          ))}

          <input ref={camRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => { handleFiles(e.target.files); e.target.value = '' }} />
          <input ref={galRef} type="file" accept="image/*" hidden onChange={(e) => { handleFiles(e.target.files); e.target.value = '' }} />
          <input ref={multiRef} type="file" accept="image/*" multiple hidden onChange={(e) => { handleFiles(e.target.files); e.target.value = '' }} />
        </div>
      )}
    </Sheet>
  )
}
