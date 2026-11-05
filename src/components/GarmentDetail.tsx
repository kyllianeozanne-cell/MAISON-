import { useState } from 'react'
import { emptyDraft, GarmentForm } from './GarmentForm'
import { GarmentThumb } from './GarmentThumb'
import { ColorDot, Icon, Sheet, toast } from './ui'
import { CAT_BY_ID, FORMALITY_LABEL } from '../lib/constants'
import { colorName } from '../lib/colors'
import { useStore } from '../lib/store'
import { daysBetween, eur, parseYmd, ymd } from '../lib/utils'
import type { Garment } from '../types'

const Row = ({ k, v }: { k: string; v: string }) =>
  v ? (
    <div className="flex items-baseline justify-between border-b border-white/[0.05] py-3.5">
      <span className="caps">{k}</span>
      <span className="max-w-[60%] text-right text-[13.5px] text-ivoire">{v}</span>
    </div>
  ) : null

export function GarmentDetail({ garment, onClose, onTry }: { garment: Garment | null; onClose: () => void; onTry: (g: Garment) => void }) {
  const { updateGarment, removeGarment, setStatus, logOutfit } = useStore()
  const [editing, setEditing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const close = () => { setEditing(false); setConfirmDelete(false); onClose() }
  const g = garment
  const last = g && g.wornDates.length ? g.wornDates.reduce((a, b) => (a > b ? a : b)) : null
  const wears = g?.wornDates.length ?? 0
  const perWear = g && g.price && wears > 0 ? g.price / wears : null

  return (
    <Sheet open={!!g} onClose={close} title={editing ? 'Modifier la pièce' : undefined} tall>
      {g && (editing ? (
        <GarmentForm
          initial={emptyDraft({ ...g })}
          submitLabel="Enregistrer"
          onCancel={() => setEditing(false)}
          onSubmit={(d) => { updateGarment(g.id, d); setEditing(false); toast('Pièce mise à jour') }}
        />
      ) : (
        <div>
          <GarmentThumb garment={g} className="mx-auto mb-6 aspect-[4/5] w-[70%] rounded-maison shadow-depth" />
          <div className="mb-1 flex items-center justify-center gap-2">
            <ColorDot color={g.color} />
            <span className="caps">{CAT_BY_ID[g.category].label}{g.subcategory ? ` · ${g.subcategory}` : ''}</span>
          </div>
          <h2 className="title-serif mb-1 text-center text-[32px]">{g.name}</h2>
          {g.status !== 'available' && (
            <p className="mb-2 text-center text-[11px] uppercase tracking-[0.2em] text-champagne">
              {g.status === 'laundry' ? 'Au lavage — non proposée par le styliste' : 'Archivée'}
            </p>
          )}

          <div className="mb-7 mt-6">
            <Row k="Marque" v={g.brand} />
            <Row k="Couleur" v={colorName(g.color) + (g.secondaryColors.length ? ' + ' + g.secondaryColors.map(colorName).join(', ') : '')} />
            <Row k="Matière" v={g.material} />
            <Row k="Taille" v={g.size} />
            <Row k="Saisons" v={g.seasons.length === 4 ? 'Toutes saisons' : g.seasons.join(', ')} />
            <Row k="Style" v={g.styles.join(', ')} />
            <Row k="Formalité" v={FORMALITY_LABEL[g.formality]} />
            <Row k="Achat" v={g.purchaseDate ? parseYmd(g.purchaseDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : ''} />
            <Row k="Prix" v={g.price != null ? eur(g.price) : ''} />
            <Row k="Portée" v={wears === 0 ? 'Jamais' : `${wears} fois`} />
            <Row k="Dernier port" v={last ? `il y a ${Math.max(0, daysBetween(parseYmd(last), new Date()))} j` : ''} />
            <Row k="Prix par port" v={perWear != null ? eur(Math.round(perWear * 100) / 100) : ''} />
            <Row k="Notes" v={g.notes} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button className="btn-gold col-span-2" onClick={() => { onTry(g); close() }}>
              <Icon name="layers" size={16} /> Ajouter au look
            </button>
            <button className="btn-ghost" onClick={() => { logOutfit(ymd(), Array.from(new Set([...(useStore.getState().calendar.find((e) => e.date === ymd() && !e.planned)?.itemIds ?? []), g.id]))); toast('Ajoutée à la tenue du jour') }}>
              <Icon name="check" size={16} /> Portée aujourd’hui
            </button>
            <button className="btn-ghost" onClick={() => setEditing(true)}><Icon name="edit" size={16} /> Modifier</button>
            <button className="btn-ghost" onClick={() => { setStatus(g.id, g.status === 'laundry' ? 'available' : 'laundry'); toast(g.status === 'laundry' ? 'De nouveau disponible' : 'Marquée au lavage') }}>
              <Icon name="drop" size={16} /> {g.status === 'laundry' ? 'Disponible' : 'Au lavage'}
            </button>
            <button className="btn-ghost" onClick={() => { setStatus(g.id, g.status === 'archived' ? 'available' : 'archived'); toast(g.status === 'archived' ? 'Pièce restaurée' : 'Pièce archivée'); close() }}>
              <Icon name="archive" size={16} /> {g.status === 'archived' ? 'Restaurer' : 'Archiver'}
            </button>
            <button className="btn-ghost col-span-2" onClick={() => updateGarment(g.id, { favorite: !g.favorite })}><Icon name="heart" size={16} className={g.favorite ? 'fill-champagne' : ''} /> {g.favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}</button>
            {confirmDelete ? (
              <button className="btn col-span-2 border border-red-300/40 text-red-200" onClick={() => { removeGarment(g.id); toast('Pièce supprimée'); close() }}>
                Confirmer la suppression
              </button>
            ) : (
              <button className="btn col-span-2 text-creme/45" onClick={() => setConfirmDelete(true)}><Icon name="trash" size={16} /> Supprimer</button>
            )}
          </div>
        </div>
      ))}
    </Sheet>
  )
}
