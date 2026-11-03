import { Canvas } from '@react-three/fiber'
import { ContactShadows, OrbitControls } from '@react-three/drei'
import { Component, Suspense, useMemo, type ReactNode } from 'react'
import { slotOf } from '../lib/constants'
import type { AvatarConfig, Garment } from '../types'

/* ------------------------------------------------------------------ */
/*  Avatar paramétrique en volumes simples.                           */
/*  Les vêtements sont des « coques » colorées posées sur le corps :   */
/*  ils donnent une idée des couleurs et des volumes, PAS de la coupe  */
/*  réelle (aucune donnée de patron ni simulation textile).            */
/* ------------------------------------------------------------------ */

function roughOf(g?: Garment): number {
  const m = g?.material.toLowerCase()
  if (m === 'cuir') return 0.38
  if (m === 'soie') return 0.3
  if (m === 'denim') return 0.85
  if (m === 'laine' || m === 'lin' || m === 'flanelle') return 0.95
  if (m === 'cachemire' || m === 'maille' || m === 'velours') return 0.98
  return 0.82
}

interface Dims {
  k: number; H: number; wS: number; hipY: number; torsoLen: number; shY: number; sh: number
  waistR: number; chestR: number; upper: number; fore: number; neck: number; headR: number
  thigh: number; calf: number; legX: number; ankle: number; armR: number
}

function dims(c: AvatarConfig): Dims {
  const k = c.height / 180
  const H = c.height / 100
  const wS = 1 + c.build * 0.42
  const hipY = H * (0.5 + c.legs * 0.04)
  const torsoLen = H * 0.3
  const ankle = 0.07 * k
  const thigh = hipY * 0.5
  return {
    k, H, wS, hipY, torsoLen,
    shY: hipY + torsoLen,
    sh: (0.165 + c.shoulders * 0.055) * k * (0.92 + c.build * 0.18),
    waistR: (0.105 + c.waist * 0.045) * k * wS,
    chestR: (0.165 + c.shoulders * 0.055) * k * (0.92 + c.build * 0.18) * 0.95,
    upper: H * 0.17, fore: H * 0.15, neck: H * 0.03, headR: H * 0.062,
    thigh, calf: hipY * 0.5 - ankle, legX: 0.085 * k * wS, ankle, armR: 0.04 * k * wS,
  }
}

function M({ color, rough = 0.85, metal = 0, opacity = 1 }: { color: string; rough?: number; metal?: number; opacity?: number }) {
  return <meshStandardMaterial color={color} roughness={rough} metalness={metal} transparent={opacity < 1} opacity={opacity} />
}

function Limb({ len, r1, r2, color, rough = 0.85 }: { len: number; r1: number; r2: number; color: string; rough?: number }) {
  return (
    <mesh position={[0, -len / 2, 0]} castShadow>
      <cylinderGeometry args={[r1, r2, len, 20]} />
      <M color={color} rough={rough} />
    </mesh>
  )
}

/* ---------- Couches de vêtements ---------- */

interface TorsoShell { color: string; rough: number; e: number; hem: number; collar?: boolean }
interface ArmShell { color: string; rough: number; e: number; upperFrac: number; foreFrac: number }
interface LegShell { color: string; rough: number; e: number; thighFrac: number; calfFrac: number }

function layersFrom(top?: Garment, outer?: Garment, bottom?: Garment, suit?: Garment) {
  const torso: TorsoShell[] = []
  const arms: ArmShell[] = []
  const legs: LegShell[] = []

  if (top) {
    const c = top.category
    const long = c === 'chemise' || c === 'pull' || c === 'sweat'
    const thick = c === 'pull' || c === 'sweat' ? 0.016 : 0.009
    torso.push({ color: top.color, rough: roughOf(top), e: thick, hem: c === 'pull' || c === 'sweat' ? 0.03 : 0.02, collar: c === 'polo' || c === 'chemise' })
    arms.push({ color: top.color, rough: roughOf(top), e: thick, upperFrac: long ? 1 : 0.5, foreFrac: long ? 0.97 : 0 })
  }
  if (suit) {
    torso.push({ color: suit.color, rough: roughOf(suit), e: 0.026, hem: 0.1 })
    arms.push({ color: suit.color, rough: roughOf(suit), e: 0.026, upperFrac: 1, foreFrac: 0.98 })
    legs.push({ color: suit.color, rough: roughOf(suit), e: 0.014, thighFrac: 1, calfFrac: 0.97 })
  }
  if (outer) {
    const coat = outer.category === 'manteau'
    const blouson = outer.category === 'blouson'
    torso.push({ color: outer.color, rough: roughOf(outer), e: coat ? 0.04 : 0.03, hem: coat ? 0.52 : blouson ? 0 : 0.12 })
    arms.push({ color: outer.color, rough: roughOf(outer), e: coat ? 0.036 : 0.028, upperFrac: 1, foreFrac: 0.98 })
  }
  if (bottom) {
    const short = bottom.category === 'short'
    legs.push({ color: bottom.color, rough: roughOf(bottom), e: 0.012, thighFrac: short ? 0.74 : 1, calfFrac: short ? 0 : 0.97 })
  }
  return { torso, arms, legs }
}

function Torso({ d, color, shells, under }: { d: Dims; color: string; shells: TorsoShell[]; under: string }) {
  return (
    <group>
      {/* tronc */}
      <group position={[0, d.hipY + d.torsoLen / 2, 0]} scale={[1, 1, 0.64]}>
        <mesh castShadow>
          <cylinderGeometry args={[d.chestR, d.waistR, d.torsoLen, 28]} />
          <M color={color} rough={0.7} />
        </mesh>
      </group>
      {/* épaules */}
      <mesh position={[0, d.shY - 0.01, 0]} scale={[1, 0.34, 0.64]}>
        <sphereGeometry args={[d.chestR * 1.02, 24, 12]} />
        <M color={color} rough={0.7} />
      </mesh>
      {/* bassin + sous-vêtement */}
      <mesh position={[0, d.hipY, 0]} scale={[1, 0.58, 0.68]} castShadow>
        <sphereGeometry args={[d.waistR * 1.14, 24, 16]} />
        <M color={under} rough={0.9} />
      </mesh>
      {/* cou */}
      <mesh position={[0, d.shY + d.neck / 2, 0]}>
        <cylinderGeometry args={[0.046 * d.k * d.wS, 0.05 * d.k * d.wS, d.neck + 0.03, 16]} />
        <M color={color} rough={0.7} />
      </mesh>

      {shells.map((s, i) => {
        const h = d.torsoLen + s.hem + 0.012
        const cy = d.shY + 0.012 - h / 2
        return (
          <group key={i}>
            <group position={[0, cy, 0]} scale={[1, 1, 0.66]}>
              <mesh castShadow>
                <cylinderGeometry args={[d.chestR + s.e, d.waistR + s.e + s.hem * 0.22, h, 28]} />
                <M color={s.color} rough={s.rough} />
              </mesh>
            </group>
            <mesh position={[0, d.shY - 0.01, 0]} scale={[1, 0.36, 0.66]}>
              <sphereGeometry args={[d.chestR + s.e + 0.002, 24, 12]} />
              <M color={s.color} rough={s.rough} />
            </mesh>
            {s.collar && (
              <mesh position={[0, d.shY + 0.012, 0]} rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[0.052 * d.k * d.wS + s.e, 0.011 * d.k, 8, 28]} />
                <M color={s.color} rough={s.rough} />
              </mesh>
            )}
          </group>
        )
      })}
    </group>
  )
}

function Arm({ d, side, skin, shells, watch }: { d: Dims; side: 1 | -1; skin: string; shells: ArmShell[]; watch?: Garment }) {
  return (
    <group position={[side * d.sh, d.shY - 0.03 * d.k, 0]} rotation={[0, 0, side * 0.1]}>
      <mesh>
        <sphereGeometry args={[d.armR * 1.18, 16, 12]} />
        <M color={skin} />
      </mesh>
      <Limb len={d.upper} r1={d.armR} r2={d.armR * 0.84} color={skin} />
      {shells.filter((s) => s.upperFrac > 0).map((s, i) => (
        <group key={`u${i}`}>
          <mesh position={[0, 0, 0]}>
            <sphereGeometry args={[d.armR * 1.18 + s.e, 16, 12]} />
            <M color={s.color} rough={s.rough} />
          </mesh>
          <Limb len={d.upper * s.upperFrac} r1={d.armR + s.e} r2={d.armR * 0.84 + s.e} color={s.color} rough={s.rough} />
        </group>
      ))}
      <group position={[0, -d.upper, 0]} rotation={[-0.16, 0, 0]}>
        <Limb len={d.fore} r1={d.armR * 0.82} r2={d.armR * 0.62} color={skin} />
        {shells.filter((s) => s.foreFrac > 0).map((s, i) => (
          <Limb key={`f${i}`} len={d.fore * s.foreFrac} r1={d.armR * 0.82 + s.e} r2={d.armR * 0.62 + s.e} color={s.color} rough={s.rough} />
        ))}
        <mesh position={[0, -d.fore - 0.02 * d.k, 0]} scale={[0.85, 1.2, 0.6]}>
          <sphereGeometry args={[0.032 * d.k * d.wS, 14, 12]} />
          <M color={skin} />
        </mesh>
        {watch && side === 1 && (
          <group position={[0, -d.fore * 0.9, 0]}>
            <mesh>
              <cylinderGeometry args={[d.armR * 0.66 + 0.006, d.armR * 0.66 + 0.006, 0.022 * d.k, 20]} />
              <M color={watch.color} rough={0.35} metal={0.5} />
            </mesh>
            <mesh position={[0, 0, d.armR * 0.7]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.02 * d.k, 0.02 * d.k, 0.008 * d.k, 20]} />
              <M color="#e8dfd0" rough={0.2} metal={0.3} />
            </mesh>
          </group>
        )}
      </group>
    </group>
  )
}

function Leg({ d, side, skin, shells, shoe }: { d: Dims; side: 1 | -1; skin: string; shells: LegShell[]; shoe?: Garment }) {
  const r = (v: number) => v * d.k * d.wS
  const footL = 0.27 * d.k
  const footH = 0.085 * d.k
  const footW = 0.095 * d.k
  const bootie = shoe?.category === 'bottines'
  return (
    <group position={[side * d.legX, d.hipY, 0]}>
      <Limb len={d.thigh} r1={r(0.074)} r2={r(0.054)} color={skin} />
      {shells.filter((s) => s.thighFrac > 0).map((s, i) => (
        <Limb key={`t${i}`} len={d.thigh * s.thighFrac} r1={r(0.074) + s.e} r2={r(0.054) + s.e * (s.thighFrac < 1 ? 1.4 : 1)} color={s.color} rough={s.rough} />
      ))}
      <group position={[0, -d.thigh, 0]}>
        <Limb len={d.calf} r1={r(0.052)} r2={r(0.036)} color={skin} />
        {shells.filter((s) => s.calfFrac > 0).map((s, i) => (
          <Limb key={`c${i}`} len={d.calf * s.calfFrac} r1={r(0.052) + s.e} r2={r(0.036) + s.e} color={s.color} rough={s.rough} />
        ))}
        <group position={[0, -d.calf, 0]}>
          {/* pied nu */}
          <mesh position={[0, -d.ankle + footH / 2 - 0.004, footL * 0.2]} castShadow>
            <boxGeometry args={[footW * 0.9, footH * 0.85, footL * 0.92]} />
            <M color={skin} />
          </mesh>
          {shoe && (
            <group position={[0, -d.ankle, footL * 0.2]}>
              <mesh position={[0, footH / 2 + 0.006, 0]} castShadow>
                <boxGeometry args={[footW, footH, footL]} />
                <M color={shoe.color} rough={roughOf(shoe)} metal={shoe.material.toLowerCase() === 'cuir' ? 0.08 : 0} />
              </mesh>
              <mesh position={[0, 0.006, 0]}>
                <boxGeometry args={[footW + 0.006, 0.014 * d.k, footL + 0.008]} />
                <M color={shoe.category === 'baskets' ? '#f2efe8' : '#1a1512'} rough={0.7} />
              </mesh>
              {bootie && (
                <mesh position={[0, footH + 0.05 * d.k, -footL * 0.18]}>
                  <cylinderGeometry args={[r(0.04) + 0.012, r(0.046) + 0.012, 0.12 * d.k, 18]} />
                  <M color={shoe.color} rough={roughOf(shoe)} />
                </mesh>
              )}
            </group>
          )}
        </group>
      </group>
    </group>
  )
}

function Head({ d, c }: { d: Dims; c: AvatarConfig }) {
  const R = d.headR
  const y = d.shY + d.neck + R * 1.02
  const hair = c.hair
  return (
    <group position={[0, y, 0]}>
      <mesh scale={[0.88, 1.12, 1]} castShadow>
        <sphereGeometry args={[R, 28, 20]} />
        <M color={c.skin} rough={0.6} />
      </mesh>
      {/* nez : repère de face */}
      <mesh position={[0, -R * 0.08, R * 0.96]} scale={[0.7, 1, 1]}>
        <sphereGeometry args={[R * 0.1, 12, 10]} />
        <M color={c.skin} rough={0.6} />
      </mesh>
      {hair !== 'none' && (
        <group>
          <mesh position={[0, R * 0.04, -R * 0.03]} rotation={[-0.25, 0, 0]} scale={[0.92, hair === 'short' ? 1.1 : 1.16, 1.05]} castShadow>
            <sphereGeometry args={[R * 1.05, 28, 18, 0, Math.PI * 2, 0, hair === 'short' ? Math.PI * 0.5 : Math.PI * 0.6]} />
            <M color={c.hairColor} rough={0.9} />
          </mesh>
          {(hair === 'medium' || hair === 'long' || hair === 'wavy') && (
            <mesh position={[0, -R * (hair === 'long' ? 0.55 : 0.3), -R * 0.42]} scale={[0.92, 1, 0.7]}>
              <capsuleGeometry args={[R * 0.82, R * (hair === 'long' ? 1.3 : 0.55), 8, 16]} />
              <M color={c.hairColor} rough={0.9} />
            </mesh>
          )}
          {hair === 'wavy' && [-1, 1].map((s) => (
            <mesh key={s} position={[s * R * 0.78, R * 0.05, -R * 0.05]}>
              <sphereGeometry args={[R * 0.3, 12, 10]} />
              <M color={c.hairColor} rough={0.9} />
            </mesh>
          ))}
        </group>
      )}
      {c.beard !== 'none' && (
        <mesh position={[0, -R * 0.06, R * 0.02]} scale={[0.9, 1.14, 1.03]}>
          <sphereGeometry args={[R * (c.beard === 'full' ? 1.06 : 1.02), 24, 14, 0, Math.PI * 2, Math.PI * (c.beard === 'full' ? 0.5 : 0.62), Math.PI * 0.4]} />
          <M color={c.beard === 'stubble' ? c.hairColor : c.hairColor} rough={0.95} opacity={c.beard === 'stubble' ? 0.38 : 1} />
        </mesh>
      )}
    </group>
  )
}

function Figure({ config, items }: { config: AvatarConfig; items: Garment[] }) {
  const d = useMemo(() => dims(config), [config])
  const sel = useMemo(() => {
    const by = (s: string) => items.find((g) => slotOf(g.category) === s)
    return {
      top: by('top'), bottom: by('bottom'), outer: by('outer'), suit: by('suit'), shoes: by('shoes'),
      acc: items.filter((g) => slotOf(g.category) === 'accessory'),
    }
  }, [items])
  const layers = useMemo(() => layersFrom(sel.top, sel.outer, sel.bottom, sel.suit), [sel])
  const under = config.underwear === 'beige' ? '#cdb994' : '#1b1a19'
  const belt = sel.acc.find((g) => g.category === 'ceinture')
  const watch = sel.acc.find((g) => g.category === 'montre')
  const bag = sel.acc.find((g) => g.category === 'sac')

  return (
    <group>
      <Torso d={d} color={config.skin} shells={layers.torso} under={under} />
      <Head d={d} c={config} />
      <Arm d={d} side={1} skin={config.skin} shells={layers.arms} watch={watch} />
      <Arm d={d} side={-1} skin={config.skin} shells={layers.arms} />
      <Leg d={d} side={1} skin={config.skin} shells={layers.legs} shoe={sel.shoes} />
      <Leg d={d} side={-1} skin={config.skin} shells={layers.legs} shoe={sel.shoes} />

      {/* sous-vêtement : haut de cuisse */}
      {[1, -1].map((s) => (
        <mesh key={s} position={[s * d.legX, d.hipY - d.thigh * 0.12, 0]}>
          <cylinderGeometry args={[0.076 * d.k * d.wS + 0.005, 0.07 * d.k * d.wS + 0.005, d.thigh * 0.28, 20]} />
          <M color={under} rough={0.9} />
        </mesh>
      ))}

      {belt && (
        <group position={[0, d.hipY + 0.035 * d.k, 0]} scale={[1, 1, 0.68]}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[d.waistR + 0.03 * d.k, 0.011 * d.k, 8, 36]} />
            <M color={belt.color} rough={0.4} />
          </mesh>
          <mesh position={[0, 0, d.waistR + 0.04 * d.k]}>
            <boxGeometry args={[0.03 * d.k, 0.026 * d.k, 0.008]} />
            <M color="#c5ad83" rough={0.25} metal={0.7} />
          </mesh>
        </group>
      )}
      {bag && (
        <group position={[-(d.sh + 0.09 * d.k), d.shY - d.upper - d.fore * 0.95, 0.02]}>
          <mesh castShadow>
            <boxGeometry args={[0.2 * d.k, 0.26 * d.k, 0.09 * d.k]} />
            <M color={bag.color} rough={roughOf(bag)} />
          </mesh>
        </group>
      )}
    </group>
  )
}

/* ---------- Fallback WebGL absent : 2D en couches ---------- */

function webglAvailable(): boolean {
  try {
    const c = document.createElement('canvas')
    return !!(c.getContext('webgl2') || c.getContext('webgl'))
  } catch {
    return false
  }
}

function Avatar2D({ config, items }: { config: AvatarConfig; items: Garment[] }) {
  const by = (s: string) => items.find((g) => slotOf(g.category) === s)
  const top = by('top') ?? by('suit')
  const bottom = by('bottom') ?? by('suit')
  const outer = by('outer')
  const shoes = by('shoes')
  const wid = 1 + config.build * 0.3
  return (
    <svg viewBox="0 0 200 400" className="h-full w-full" role="img" aria-label="Avatar en 2D">
      <ellipse cx="100" cy="385" rx="52" ry="6" fill="#000" opacity=".35" />
      <g fill={config.skin}>
        <circle cx="100" cy="46" r="24" />
        <rect x="92" y="66" width="16" height="16" />
        <rect x={100 - 50 * wid} y="82" width={100 * wid} height="130" rx="22" />
        <rect x={100 - 66 * wid} y="88" width="16" height="118" rx="8" />
        <rect x={100 + 50 * wid} y="88" width="16" height="118" rx="8" />
        <rect x="76" y="208" width="22" height="160" rx="10" />
        <rect x="102" y="208" width="22" height="160" rx="10" />
      </g>
      <rect x="74" y="200" width="52" height="30" rx="8" fill={config.underwear === 'beige' ? '#cdb994' : '#1b1a19'} />
      {config.hair !== 'none' && <path d="M76 44a24 24 0 0 1 48 0c-8-9-40-9-48 0Z" fill={config.hairColor} />}
      {bottom && <><rect x="74" y="200" width="26" height={bottom.category === 'short' ? 70 : 168} rx="8" fill={bottom.color} /><rect x="100" y="200" width="26" height={bottom.category === 'short' ? 70 : 168} rx="8" fill={bottom.color} /></>}
      {top && <rect x={100 - 52 * wid} y="82" width={104 * wid} height="132" rx="22" fill={top.color} />}
      {outer && <rect x={100 - 56 * wid} y="80" width={112 * wid} height="150" rx="20" fill={outer.color} opacity=".95" />}
      {shoes && <><rect x="70" y="366" width="32" height="14" rx="6" fill={shoes.color} /><rect x="98" y="366" width="32" height="14" rx="6" fill={shoes.color} /></>}
    </svg>
  )
}

class Boundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() { return this.state.failed ? this.props.fallback : this.props.children }
}

export function AvatarView({
  config, items, autoRotate = false,
}: { config: AvatarConfig; items: Garment[]; autoRotate?: boolean }) {
  const d = useMemo(() => dims(config), [config])
  const gl = useMemo(webglAvailable, [])
  const fallback = <Avatar2D config={config} items={items} />
  if (!gl) return fallback
  return (
    <Boundary fallback={fallback}>
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position: [0, d.H * 0.52, d.H * 2.1], fov: 30 }}
        gl={{ antialias: true, alpha: true }}
        style={{ touchAction: 'pan-y' }}
      >
        <ambientLight intensity={0.75} />
        <directionalLight position={[2.5, 4, 3]} intensity={1.5} castShadow shadow-mapSize={[1024, 1024]} />
        <directionalLight position={[-3, 2, -2]} intensity={0.6} color="#c5ad83" />
        <Suspense fallback={null}>
          <Figure config={config} items={items} />
          <ContactShadows position={[0, 0.001, 0]} opacity={0.55} scale={4} blur={2.4} far={2} />
        </Suspense>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 0]}>
          <ringGeometry args={[0.52, 0.525, 64]} />
          <meshBasicMaterial color="#c5ad83" transparent opacity={0.45} />
        </mesh>
        <OrbitControls
          target={[0, d.H * 0.5, 0]}
          enablePan={false}
          enableZoom={false}
          minPolarAngle={Math.PI / 2}
          maxPolarAngle={Math.PI / 2}
          autoRotate={autoRotate}
          autoRotateSpeed={2.2}
          rotateSpeed={0.9}
          enableDamping
        />
      </Canvas>
    </Boundary>
  )
}
