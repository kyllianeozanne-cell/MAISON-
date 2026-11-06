import type { CategoryId } from '../types'
import { hexToRgb } from './colors'

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Image illisible'))
    img.src = src
  })
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result))
    r.onerror = () => reject(new Error('Lecture du fichier impossible'))
    r.readAsDataURL(file)
  })
}

/**
 * Redimensionne la photo (côté max 900 px), la place sur un fond neutre crème
 * et, si demandé, supprime le fond uni par détourage par couleur de bordure.
 * Ce détourage est volontairement simple : il fonctionne bien sur un vêtement
 * photographié sur un mur ou un sol uni, pas sur un fond chargé.
 */
export async function processPhoto(file: File, opts: { cutout: boolean }): Promise<string> {
  const src = await fileToDataUrl(file)
  const img = await loadImage(src)
  const max = 900
  const scale = Math.min(1, max / Math.max(img.width, img.height))
  const w = Math.round(img.width * scale)
  const h = Math.round(img.height * scale)

  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d', { willReadFrequently: true })!
  ctx.drawImage(img, 0, 0, w, h)

  if (opts.cutout) {
    const data = ctx.getImageData(0, 0, w, h)
    removeBackground(data)
    ctx.putImageData(data, 0, 0)
  }

  // composition finale sur fond neutre
  const out = document.createElement('canvas')
  out.width = w
  out.height = h
  const octx = out.getContext('2d')!
  octx.fillStyle = '#E8DFD0'
  octx.fillRect(0, 0, w, h)
  octx.drawImage(c, 0, 0)
  return out.toDataURL('image/jpeg', 0.85)
}

function removeBackground(img: ImageData) {
  const { data, width: w, height: h } = img
  // couleur de fond estimée : médiane des pixels de bordure
  const samples: [number, number, number][] = []
  const push = (x: number, y: number) => {
    const i = (y * w + x) * 4
    samples.push([data[i], data[i + 1], data[i + 2]])
  }
  for (let x = 0; x < w; x += 4) { push(x, 0); push(x, h - 1) }
  for (let y = 0; y < h; y += 4) { push(0, y); push(w - 1, y) }
  const med = (k: 0 | 1 | 2) => {
    const v = samples.map((s) => s[k]).sort((a, b) => a - b)
    return v[Math.floor(v.length / 2)]
  }
  const bg: [number, number, number] = [med(0), med(1), med(2)]
  const dev = samples.reduce((a, s) => a + Math.abs(s[0] - bg[0]) + Math.abs(s[1] - bg[1]) + Math.abs(s[2] - bg[2]), 0) / (samples.length * 3)
  const tol = Math.max(30, Math.min(70, 26 + dev * 2.2)) // tolérance adaptée à l'uniformité du fond
  const dist = (i: number) =>
    Math.sqrt((data[i] - bg[0]) ** 2 + (data[i + 1] - bg[1]) ** 2 + (data[i + 2] - bg[2]) ** 2)

  // remplissage par les bords : on ne supprime que le fond connecté au cadre
  const visited = new Uint8Array(w * h)
  const stack: number[] = []
  const seed = (x: number, y: number) => {
    const p = y * w + x
    if (!visited[p] && dist(p * 4) < tol) { visited[p] = 1; stack.push(p) }
  }
  for (let x = 0; x < w; x++) { seed(x, 0); seed(x, h - 1) }
  for (let y = 0; y < h; y++) { seed(0, y); seed(w - 1, y) }
  while (stack.length) {
    const p = stack.pop()!
    const x = p % w
    const y = (p - x) / w
    if (x > 0) seed(x - 1, y)
    if (x < w - 1) seed(x + 1, y)
    if (y > 0) seed(x, y - 1)
    if (y < h - 1) seed(x, y + 1)
  }
  // sécurité : si plus de 92 % de l'image est supprimée, le détourage a échoué
  let removed = 0
  for (let p = 0; p < w * h; p++) if (visited[p]) removed++
  if (removed / (w * h) > 0.92) return
  for (let p = 0; p < w * h; p++) if (visited[p]) data[p * 4 + 3] = 0
  // lissage léger du contour : on adoucit les pixels adjacents au fond supprimé
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const p = y * w + x
      if (visited[p]) continue
      if (visited[p - 1] || visited[p + 1] || visited[p - w] || visited[p + w]) data[p * 4 + 3] = 170
    }
  }
}

/** Couleur dominante du vêtement (hors fond crème / bords), au format hex. */
export async function dominantColor(dataUrl: string): Promise<string> {
  const img = await loadImage(dataUrl)
  const s = 48
  const c = document.createElement('canvas')
  c.width = s
  c.height = s
  const ctx = c.getContext('2d', { willReadFrequently: true })!
  ctx.drawImage(img, 0, 0, s, s)
  const { data } = ctx.getImageData(0, 0, s, s)
  const [bgR, bgG, bgB] = hexToRgb('#E8DFD0')
  const buckets = new Map<string, { n: number; r: number; g: number; b: number }>()
  // on ignore les 18 % extérieurs (fond) et les pixels proches du fond crème
  const m = Math.floor(s * 0.18)
  for (let y = m; y < s - m; y++) {
    for (let x = m; x < s - m; x++) {
      const i = (y * s + x) * 4
      const r = data[i], g = data[i + 1], b = data[i + 2]
      if (Math.abs(r - bgR) + Math.abs(g - bgG) + Math.abs(b - bgB) < 36) continue
      const key = `${r >> 5}-${g >> 5}-${b >> 5}`
      const e = buckets.get(key) ?? { n: 0, r: 0, g: 0, b: 0 }
      e.n++; e.r += r; e.g += g; e.b += b
      buckets.set(key, e)
    }
  }
  let best: { n: number; r: number; g: number; b: number } | null = null
  for (const e of buckets.values()) if (!best || e.n > best.n) best = e
  if (!best) return '#8b8b8b'
  const hx = (v: number) => Math.round(v / best!.n).toString(16).padStart(2, '0')
  return `#${hx(best.r)}${hx(best.g)}${hx(best.b)}`
}

/** Photo en pied de l'utilisateur : réduite (1400 px max) et recompressée. Reste sur l'appareil. */
export async function processBodyPhoto(file: File): Promise<string> {
  const src = await fileToDataUrl(file)
  const img = await loadImage(src)
  const scale = Math.min(1, 1400 / Math.max(img.width, img.height))
  const c = document.createElement('canvas')
  c.width = Math.round(img.width * scale)
  c.height = Math.round(img.height * scale)
  c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height)
  return c.toDataURL('image/jpeg', 0.88)
}

/** Détoure une photo de vêtement (fond uni) et recadre sur la pièce. PNG transparent. */
export async function cutoutDataUrl(src: string): Promise<string> {
  const img = await loadImage(src)
  const w = img.width
  const h = img.height
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d', { willReadFrequently: true })!
  ctx.drawImage(img, 0, 0)
  const data = ctx.getImageData(0, 0, w, h)
  removeBackground(data)
  let x0 = w, y0 = h, x1 = 0, y1 = 0
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (data.data[(y * w + x) * 4 + 3] > 40) {
        if (x < x0) x0 = x
        if (x > x1) x1 = x
        if (y < y0) y0 = y
        if (y > y1) y1 = y
      }
    }
  }
  if (x1 <= x0 || y1 <= y0) return src
  ctx.putImageData(data, 0, 0)
  const bw = x1 - x0 + 1
  const bh = y1 - y0 + 1
  const o = document.createElement('canvas')
  o.width = bw
  o.height = bh
  o.getContext('2d')!.drawImage(c, x0, y0, bw, bh, 0, 0, bw, bh)
  return o.toDataURL('image/png')
}

/* ---------- Détourage intelligent (segmentation de vêtements, dans le navigateur) ---------- */

const SEG_LABELS: Partial<Record<CategoryId, string[]>> = {
  tshirt: ['upper-clothes'], polo: ['upper-clothes'], chemise: ['upper-clothes'], pull: ['upper-clothes'], sweat: ['upper-clothes'], blouse: ['upper-clothes'],
  veste: ['upper-clothes'], manteau: ['upper-clothes'], blouson: ['upper-clothes'],
  pantalon: ['pants'], jean: ['pants'], short: ['pants'], jupe: ['skirt'],
  costume: ['upper-clothes', 'pants', 'skirt', 'dress'], robe: ['dress', 'upper-clothes', 'skirt'], combinaison: ['upper-clothes', 'pants', 'dress'], ensemble: ['upper-clothes', 'pants', 'skirt', 'dress'],
  chaussures: ['left-shoe', 'right-shoe'], baskets: ['left-shoe', 'right-shoe'], bottines: ['left-shoe', 'right-shoe'], escarpins: ['left-shoe', 'right-shoe'], ballerines: ['left-shoe', 'right-shoe'],
  sac: ['bag'], ceinture: ['belt'],
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let segPromise: Promise<any> | null = null
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getSegmenter(): Promise<any> {
  segPromise ??= (async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tf = (await import('@huggingface/transformers')) as any
    tf.env.allowLocalModels = false
    return tf.pipeline('image-segmentation', 'Xenova/segformer_b2_clothes', { dtype: 'q8' })
  })().catch((e) => { segPromise = null; throw e })
  return segPromise
}

/**
 * Isole le vêtement (même porté) avec un modèle de segmentation, puis le place sur fond crème, recadré.
 * Retourne null si le modèle est indisponible ou ne trouve pas la pièce : l'appelant utilise alors le détourage simple.
 */
export async function smartCutout(src: string, category: CategoryId): Promise<string | null> {
  const labels = SEG_LABELS[category]
  if (!labels) return null
  try {
    const seg = await getSegmenter()
    const res: { label: string; mask: { data: ArrayLike<number>; width: number; height: number; channels?: number } }[] = await seg(src)
    const picked = res.filter((r) => labels.includes(String(r.label).toLowerCase()))
    if (!picked.length) return null
    const mw = picked[0].mask.width, mh = picked[0].mask.height, ch = picked[0].mask.channels ?? 1
    const mc = document.createElement('canvas')
    mc.width = mw; mc.height = mh
    const mctx = mc.getContext('2d')!
    const md = mctx.createImageData(mw, mh)
    for (let i = 0; i < mw * mh; i++) {
      let v = 0
      for (const r of picked) v = Math.max(v, r.mask.data[i * ch])
      md.data[i * 4] = 255; md.data[i * 4 + 1] = 255; md.data[i * 4 + 2] = 255
      md.data[i * 4 + 3] = v > 128 ? 255 : 0
    }
    mctx.putImageData(md, 0, 0)

    const img = await loadImage(src)
    const scale = Math.min(1, 900 / Math.max(img.width, img.height))
    const w = Math.round(img.width * scale), h = Math.round(img.height * scale)
    const c = document.createElement('canvas')
    c.width = w; c.height = h
    const ctx = c.getContext('2d', { willReadFrequently: true })!
    ctx.drawImage(img, 0, 0, w, h)
    ctx.globalCompositeOperation = 'destination-in'
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(mc, 0, 0, w, h)

    const px = ctx.getImageData(0, 0, w, h).data
    let x0 = w, y0 = h, x1 = 0, y1 = 0, n = 0
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (px[(y * w + x) * 4 + 3] > 100) { n++; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y }
    }
    const cover = n / (w * h)
    if (cover < 0.02 || x1 <= x0 || y1 <= y0) return null

    const bw = x1 - x0 + 1, bh = y1 - y0 + 1
    const OW = 800, OH = 1000, pad = 0.08
    const out = document.createElement('canvas')
    out.width = OW; out.height = OH
    const octx = out.getContext('2d')!
    octx.fillStyle = '#f3eee4'
    octx.fillRect(0, 0, OW, OH)
    const s = Math.min((OW * (1 - 2 * pad)) / bw, (OH * (1 - 2 * pad)) / bh)
    octx.imageSmoothingQuality = 'high'
    octx.drawImage(c, x0, y0, bw, bh, (OW - bw * s) / 2, (OH - bh * s) / 2, bw * s, bh * s)
    return out.toDataURL('image/jpeg', 0.9)
  } catch {
    return null
  }
}
