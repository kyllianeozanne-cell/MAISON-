export interface HSL { h: number; s: number; l: number }

export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h
  const n = parseInt(full || '000000', 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

export function hexToHsl(hex: string): HSL {
  const [r0, g0, b0] = hexToRgb(hex)
  const r = r0 / 255, g = g0 / 255, b = b0 / 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  const l = (max + min) / 2
  let h = 0, s = 0
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0)
    else if (max === g) h = (b - r) / d + 2
    else h = (r - g) / d + 4
    h *= 60
  }
  return { h, s, l }
}

export const NAMED_COLORS: { name: string; hex: string }[] = [
  { name: 'Noir', hex: '#161616' },
  { name: 'Anthracite', hex: '#3a3b3d' },
  { name: 'Gris', hex: '#8b8b8b' },
  { name: 'Gris clair', hex: '#c9c9c7' },
  { name: 'Blanc', hex: '#f6f4ee' },
  { name: 'Écru', hex: '#e9e0cc' },
  { name: 'Beige', hex: '#cdb994' },
  { name: 'Camel', hex: '#b58a56' },
  { name: 'Marron', hex: '#5e4331' },
  { name: 'Chocolat', hex: '#3a2a20' },
  { name: 'Marine', hex: '#1c2b4a' },
  { name: 'Bleu', hex: '#3e6ba8' },
  { name: 'Bleu ciel', hex: '#a9c4e0' },
  { name: 'Vert', hex: '#3f6b4c' },
  { name: 'Kaki', hex: '#6b6a46' },
  { name: 'Olive', hex: '#4a4e2c' },
  { name: 'Bordeaux', hex: '#5a1f2a' },
  { name: 'Rouge', hex: '#a52a2a' },
  { name: 'Rose', hex: '#d9a3a8' },
  { name: 'Orange', hex: '#c8692e' },
  { name: 'Jaune', hex: '#d9b548' },
  { name: 'Violet', hex: '#5b4474' },
]

function dist(a: string, b: string) {
  const [r1, g1, b1] = hexToRgb(a)
  const [r2, g2, b2] = hexToRgb(b)
  return (r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2
}

export function colorName(hex: string): string {
  let best = NAMED_COLORS[0]
  let bd = Infinity
  for (const c of NAMED_COLORS) {
    const d = dist(hex, c.hex)
    if (d < bd) { bd = d; best = c }
  }
  return best.name
}

export type ColorFamily = 'neutral' | 'earth' | 'cool' | 'warm' | 'green'

export function isNeutral(hex: string): boolean {
  const { s, l } = hexToHsl(hex)
  return s < 0.12 || l < 0.1 || l > 0.92
}

export function colorFamily(hex: string): ColorFamily {
  const { h, s, l } = hexToHsl(hex)
  if (s < 0.14 || l < 0.1 || l > 0.93) return 'neutral'
  if (h >= 20 && h < 50 && s < 0.6) return 'earth'
  if (h >= 50 && h < 70 && s < 0.5) return 'earth'
  if (h < 20 || h >= 330) return 'warm'
  if (h >= 50 && h < 170) return 'green'
  if (h >= 170 && h < 270) return 'cool'
  return 'warm'
}

/**
 * Score d'harmonie entre deux couleurs, 0..1.
 * Heuristiques classiques de la mode masculine : neutres entre eux, marine + beige,
 * camel + bleu, tons terreux ensemble ; on pénalise les contrastes de saturation forts.
 */
export function harmony(a: string, b: string): number {
  const A = hexToHsl(a)
  const B = hexToHsl(b)
  const na = isNeutral(a), nb = isNeutral(b)
  if (na && nb) return 0.92
  if (na || nb) {
    const c = na ? B : A
    return c.s > 0.7 ? 0.62 : 0.86
  }
  const fa = colorFamily(a), fb = colorFamily(b)
  // marine / bleu + beige / camel : l'association de référence
  const navyLike = (x: HSL) => x.h >= 200 && x.h <= 250 && x.l < 0.35
  const sand = (h: string) => colorFamily(h) === 'earth'
  if ((navyLike(A) && sand(b)) || (navyLike(B) && sand(a))) return 0.95
  if (fa === 'earth' && fb === 'earth') return 0.9
  if (fa === 'green' && fb === 'earth') return 0.88
  if (fb === 'green' && fa === 'earth') return 0.88
  let dh = Math.abs(A.h - B.h)
  if (dh > 180) dh = 360 - dh
  if (dh < 25) return 0.84 // monochrome
  if (dh > 150 && dh < 210) return A.s < 0.45 && B.s < 0.45 ? 0.72 : 0.52 // complémentaires
  if (fa === fb) return 0.78
  return 0.58
}

export function paletteHarmony(colors: string[]): number {
  if (colors.length < 2) return 0.85
  let sum = 0, n = 0
  for (let i = 0; i < colors.length; i++) {
    for (let j = i + 1; j < colors.length; j++) {
      sum += harmony(colors[i], colors[j])
      n++
    }
  }
  const avg = sum / n
  // trop de couleurs vives : on réduit
  const vivid = colors.filter((c) => hexToHsl(c).s > 0.55 && !isNeutral(c)).length
  return Math.max(0, avg - Math.max(0, vivid - 1) * 0.12)
}

/** Suggère, à partir d'une couleur, les couleurs du dressing qui lui vont le mieux. */
export function bestMatches(base: string, pool: string[], limit = 5): string[] {
  const seen = new Set<string>()
  return pool
    .map((c) => ({ c, s: harmony(base, c) }))
    .sort((x, y) => y.s - x.s)
    .filter((x) => (seen.has(x.c) ? false : (seen.add(x.c), true)))
    .slice(0, limit)
    .map((x) => x.c)
}

export function readableOn(hex: string): string {
  return hexToHsl(hex).l > 0.55 ? '#10100F' : '#F5F1E9'
}
