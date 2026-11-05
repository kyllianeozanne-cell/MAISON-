import { colorFamily, hexToHsl, harmony, isNeutral } from '../lib/colors'

/** Mini-roue chromatique : place chaque couleur de la tenue selon sa teinte et explique l'accord. */
export function ColorWheel({ colors }: { colors: string[] }) {
  const cs = [...new Set(colors)].slice(0, 6)
  if (cs.length < 2) return null
  const pts = cs.map((c, i) => {
    const h = hexToHsl(c)
    const neutral = isNeutral(c)
    const r = neutral ? 0 : 20 + h.s * 14
    const a = ((h.h - 90) * Math.PI) / 180
    return { c, x: 40 + r * Math.cos(a) + (neutral ? (i - cs.length / 2) * 6 : 0), y: 40 + r * Math.sin(a) + (neutral ? 0 : 0) }
  })
  let sum = 0, n = 0
  for (let i = 0; i < cs.length; i++) for (let j = i + 1; j < cs.length; j++) { sum += harmony(cs[i], cs[j]); n++ }
  const avg = sum / n
  const neutrals = cs.filter(isNeutral).length
  const fams = new Set(cs.filter((c) => !isNeutral(c)).map(colorFamily))
  const text = neutrals === cs.length ? 'Palette 100 % neutre : sobre, tout s’accorde.'
    : fams.size <= 1 ? 'Une seule famille de couleurs : un camaïeu élégant, posé sur des neutres.'
    : avg >= 0.85 ? 'Tons proches et neutres : une harmonie douce, sans contraste agressif.'
    : 'Un contraste assumé : garde les autres pièces neutres pour qu’il reste élégant.'
  return (
    <div className="flex items-center gap-4">
      <svg viewBox="0 0 80 80" className="h-[72px] w-[72px] shrink-0" aria-hidden>
        <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(197,173,131,0.25)" />
        <circle cx="40" cy="40" r="17" fill="none" stroke="rgba(197,173,131,0.12)" />
        {pts.slice(1).map((p, i) => <line key={i} x1={pts[0].x} y1={pts[0].y} x2={p.x} y2={p.y} stroke="rgba(197,173,131,0.35)" strokeWidth="0.6" />)}
        {pts.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="5.5" fill={p.c} stroke="rgba(245,241,233,0.5)" strokeWidth="0.8" />)}
      </svg>
      <p className="text-[12px] leading-relaxed text-creme/60">{text}</p>
    </div>
  )
}
