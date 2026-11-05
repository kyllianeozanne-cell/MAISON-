import { slotOf } from './constants'
import { readableOn } from './colors'
import type { Garment } from '../types'

const load = (src: string) => new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src })

function cover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number) {
  const s = Math.max(w / img.width, h / img.height)
  const sw = w / s, sh = h / s
  ctx.drawImage(img, (img.width - sw) / 2, Math.max(0, (img.height - sh) * 0.35), sw, sh, x, y, w, h)
}

/** Dessine la planche lookbook d'une tenue en image PNG (1080×1350) avec titre et date. */
export async function lookImage(items: Garment[], title: string): Promise<Blob> {
  const W = 1080, H = 1350
  const c = document.createElement('canvas'); c.width = W; c.height = H
  const ctx = c.getContext('2d')!
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#ece4d6'); g.addColorStop(1, '#d8cdb9')
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H)
  const by = (s: string) => items.filter((x) => slotOf(x.category) === s)
  const left = [...by('outer'), ...by('suit'), ...by('top')].slice(0, 2)
  const right = [...by('bottom'), ...by('shoes')].slice(0, 2)
  const acc = by('accessory').slice(0, 3)
  const pad = 60, top = 150, gap = 24
  const bottomH = acc.length ? 230 : 0
  const areaH = H - top - pad - (acc.length ? bottomH + gap : 0)
  const colW = (W - pad * 2 - gap) / 2
  const tiles: { g: Garment; x: number; y: number; w: number; h: number }[] = []
  const col = (list: Garment[], x: number) => {
    const weights = list.map((_, i) => (i === 0 && list.length > 1 ? 1.4 : 1))
    const tot = weights.reduce((a, b) => a + b, 0)
    let y = top
    list.forEach((it, i) => { const h = (areaH - gap * (list.length - 1)) * (weights[i] / tot); tiles.push({ g: it, x, y, w: colW, h }); y += h + gap })
  }
  if (left.length && right.length) { col(left, pad); col(right, pad + colW + gap) } else col([...left, ...right], pad)
  acc.forEach((it, i) => { const w = (W - pad * 2 - gap * (acc.length - 1)) / acc.length; tiles.push({ g: it, x: pad + i * (w + gap), y: H - pad - bottomH, w, h: bottomH }) })
  for (const t of tiles) {
    ctx.save()
    ctx.shadowColor = 'rgba(40,30,20,0.3)'; ctx.shadowBlur = 28; ctx.shadowOffsetY = 10
    ctx.beginPath(); ctx.roundRect(t.x, t.y, t.w, t.h, 20); ctx.fillStyle = t.g.color; ctx.fill()
    ctx.restore()
    ctx.save(); ctx.beginPath(); ctx.roundRect(t.x, t.y, t.w, t.h, 20); ctx.clip()
    if (t.g.photo) { try { cover(ctx, await load(t.g.photo), t.x, t.y, t.w, t.h) } catch { /* image illisible */ } }
    else { ctx.fillStyle = readableOn(t.g.color); ctx.font = 'italic 34px Georgia, serif'; ctx.textAlign = 'center'; ctx.fillText(t.g.name.slice(0, 22), t.x + t.w / 2, t.y + t.h / 2) }
    ctx.restore()
  }
  ctx.fillStyle = '#10100f'; ctx.textAlign = 'left'
  ctx.font = '300 62px Georgia, serif'; ctx.fillText(title.slice(0, 28), pad, 105)
  ctx.textAlign = 'right'; ctx.fillStyle = '#9c8458'; ctx.font = '26px Helvetica, Arial, sans-serif'; ctx.fillText('MAISON', W - pad, 100)
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('image'))), 'image/png'))
}
