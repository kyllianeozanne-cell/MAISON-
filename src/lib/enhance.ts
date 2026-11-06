import { cutoutDataUrl, smartCutout } from './photo'
import { useStore } from './store'

let chain: Promise<unknown> = Promise.resolve()

/** Re-détoure la photo d'une pièce (une à la fois). 'smart' : segmentation de vêtements ; 'basic' : détourage simple ; false : échec. */
export function enhanceGarment(id: string): Promise<'smart' | 'basic' | false> {
  const run = async (): Promise<'smart' | 'basic' | false> => {
    const g = useStore.getState().garments.find((x) => x.id === id)
    if (!g || !g.photo) return false
    const src = g.original ?? g.photo
    let out = await smartCutout(src, g.category)
    let kind: 'smart' | 'basic' = 'smart'
    if (!out) {
      kind = 'basic'
      out = await cutoutDataUrl(src).catch(() => null)
      if (!out || out === src) return false
    }
    useStore.getState().updateGarment(id, { photo: out, original: src })
    return kind
  }
  const p = chain.then(run, run)
  chain = p.catch(() => undefined)
  return p
}
