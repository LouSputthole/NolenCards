import { memo, useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Environment, Float, Lightformer, Sparkles, useCursor } from '@react-three/drei'
import * as THREE from 'three'
import { promo } from '../content.js'
import {
  CARD_H,
  CARD_W,
  HOLO_CARDS,
  PACK_H,
  PACK_W,
  TEAR_Y,
  createBurst,
  createCanvasTexture,
  createCardGeometry,
  createCrimpGeometry,
  createHoloMaterial,
  createPillowGeometry,
  createRibTexture,
  drawCardBack,
  drawHoloFront,
  drawPackLabel,
  drawPromoFront,
  loadCanvasFonts,
  seededRandom,
} from './materials.js'

/*
 * Timeline, in seconds since the pack was clicked. Every pose below is a pure function of
 * this clock, so `autoReveal` (skip / reduced motion) just jumps it to `end`.
 */
const T = {
  squash: 0.32, // grip squash + turn to face the camera
  rip: [0.3, 0.58], // top strip hinges up from its left end
  tearBurst: 0.42, // little foil burst at the tear
  fly: [0.58, 1.35], // strip flies off, spinning
  drop: [0.35, 0.95], // pack body slides down to make room
  cardStart: 1.0, // first card starts rising…
  cardGap: 0.22, // …then one every 0.22 s
  rise: 0.5, // each card slides up out of the pack
  fan: 0.62, // then swings into its slot in the fan
  exit: [2.45, 3.2], // empty pack falls away
  focus: 3.1, // gold card heads to the front, the rest recede
  travel: 0.8,
  recede: 0.65,
  flip: [3.2, 4.0], // gold card flips to face the camera
  burst: 3.68, // sparkle burst as it comes round
  reveal: 3.8, // code readable → onRevealed()
  end: 5.2, // past every effect (burst included)
}
const TEAR_LIFE = 0.9
const BURST_LIFE = 1.4

const PROMO_INDEX = 4
// Fan slot per card (0 = far left … 4 = far right): outer cards land first, gold card last, centre.
const SLOT_OF = [0, 4, 1, 3, 2]
const FAN_R = 5
const FAN_Y = 0.15
const DROP_Y = -1.9
const HALF_W = PACK_W / 2
const CAM_FALLBACK_Z = 9
const DEFAULT_RECT = { x: 0, y: 0.18, w: 1, h: 0.64 }

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v)
const prog = (t, a, b) => clamp01((t - a) / (b - a))
const lerp = (a, b, k) => a + (b - a) * k
const easeOutCubic = (k) => 1 - (1 - k) ** 3
const easeInCubic = (k) => k * k * k
const easeInOutCubic = (k) => (k < 0.5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2)
const easeOutBack = (k, s = 1.70158) => 1 + (s + 1) * (k - 1) ** 3 + s * (k - 1) ** 2
const smooth = (a, b, t) => {
  const k = prog(t, a, b)
  return k * k * (3 - 2 * k)
}

function prefersReducedMotion() {
  return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

function updateBurst(object, burst, local, dpr) {
  const visible = local >= 0 && local <= burst.life
  object.visible = visible
  if (visible) {
    burst.material.uniforms.uT.value = local
    burst.material.uniforms.uPixelRatio.value = dpr
  }
}

// Offline "neon sign" environment for the foil reflections (no HDR download).
const NeonEnvironment = memo(function NeonEnvironment() {
  return (
    <Environment resolution={128} frames={1}>
      <Lightformer form="rect" intensity={2.2} color="#ffffff" position={[0, 5, 3]} scale={[10, 2.5, 1]} />
      <Lightformer form="rect" intensity={7} color="#ff2a3c" position={[-6, 0.5, 2.5]} scale={[1.6, 9, 1]} />
      <Lightformer form="rect" intensity={7} color="#2f6bff" position={[6, 0.5, 2.5]} scale={[1.6, 9, 1]} />
      <Lightformer form="rect" intensity={1.4} color="#ffffff" position={[0, -1.5, 9]} scale={[9, 1, 1]} />
      <Lightformer form="ring" intensity={2} color="#ffd166" position={[3, 3, 7]} scale={2.5} />
    </Environment>
  )
})

function usePackAssets() {
  const assets = useMemo(() => {
    const label = createCanvasTexture(512, 709, drawPackLabel)
    const backTexture = createCanvasTexture(384, 538, drawCardBack)
    const holoTextures = HOLO_CARDS.map((card) =>
      createCanvasTexture(384, 538, (ctx, w, h) => drawHoloFront(ctx, w, h, card)),
    )
    const promoTexture = createCanvasTexture(768, 1075, (ctx, w, h) => drawPromoFront(ctx, w, h, promo))
    const ribs = createRibTexture()

    const front = new THREE.MeshPhysicalMaterial({
      map: label,
      emissiveMap: label,
      // Animated per frame via emissive.setScalar() (neon hum + hover glow).
      emissive: new THREE.Color(0.5, 0.5, 0.5),
      emissiveIntensity: 1,
      metalness: 0.55,
      roughness: 0.28,
      clearcoat: 1,
      clearcoatRoughness: 0.15,
      iridescence: 0.9,
      iridescenceIOR: 1.6,
      iridescenceThicknessRange: [200, 700],
    })
    const back = new THREE.MeshPhysicalMaterial({
      color: '#2b2e40',
      metalness: 0.9,
      roughness: 0.32,
      clearcoat: 0.6,
      iridescence: 0.7,
      iridescenceIOR: 1.5,
      side: THREE.DoubleSide,
    })
    const crimp = new THREE.MeshPhysicalMaterial({
      color: '#8a90a6',
      metalness: 1,
      roughness: 0.42,
      bumpMap: ribs,
      bumpScale: 0.8,
      iridescence: 0.3,
      iridescenceIOR: 1.4,
    })

    const cardFronts = [
      ...HOLO_CARDS.map((card, i) => createHoloMaterial({ map: holoTextures[i], edgeColor: card.edge, edge: 0.85 })),
      createHoloMaterial({ map: promoTexture, gold: true, edgeColor: '#ffd166', edge: 1.1, art: [0.06, 0.05, 0.94, 0.95] }),
    ]
    const cardBack = createHoloMaterial({ map: backTexture, holo: 0.55, edgeColor: '#ff5a6a', edge: 0.7, art: [0.2, 0.25, 0.8, 0.75] })

    const dustCount = 40
    const dustColors = new Float32Array(dustCount * 3)
    const dustSizes = new Float32Array(dustCount)
    const palette = ['#ff2a3c', '#2f6bff', '#ffffff'].map((c) => new THREE.Color(c))
    const random = seededRandom(7)
    for (let i = 0; i < dustCount; i++) {
      const c = palette[i % palette.length]
      dustColors.set([c.r, c.g, c.b], i * 3)
      dustSizes[i] = 1 + random() * 2.5
    }

    return {
      textures: [label, backTexture, ...holoTextures, promoTexture, ribs],
      front,
      packMaterials: [front, back],
      crimp,
      cardFronts,
      cardBack,
      bodyGeo: createPillowGeometry(-1.5, TEAR_Y, 22, { jagTop: true }),
      stripGeo: createPillowGeometry(TEAR_Y, 1.5, 3, { jagBottom: true }),
      crimpTop: createCrimpGeometry(true),
      crimpBottom: createCrimpGeometry(false),
      cardGeo: createCardGeometry(),
      tear: createBurst({
        count: 28,
        radius: 1.3,
        life: TEAR_LIFE,
        size: 70,
        seed: 11,
        palette: ['#ffffff', '#ff2a3c', '#2f6bff', '#c9cede'],
      }),
      promoBurst: createBurst({
        count: 80,
        radius: 2.8,
        life: BURST_LIFE,
        size: 110,
        seed: 23,
        palette: ['#ffd166', '#ffd166', '#fff3c4', '#ffb347', '#ffffff', '#ff2a3c', '#2f6bff'],
      }),
      dustColors,
      dustSizes,
    }
  }, [])

  useEffect(() => {
    let alive = true
    // Canvases were painted with fallback fonts if the brand fonts weren't ready yet; repaint once they are.
    loadCanvasFonts().then(() => {
      if (alive) assets.textures.forEach((texture) => texture.userData.redraw?.())
    })
    return () => {
      alive = false
      const { textures, packMaterials, crimp, cardFronts, cardBack, tear, promoBurst } = assets
      ;[...textures, ...packMaterials, crimp, ...cardFronts, cardBack].forEach((d) => d.dispose())
      ;[assets.bodyGeo, assets.stripGeo, assets.crimpTop, assets.crimpBottom, assets.cardGeo].forEach((g) => g.dispose())
      ;[tear, promoBurst].forEach((b) => {
        b.geometry.dispose()
        b.material.dispose()
      })
    }
  }, [assets])

  return assets
}

/**
 * Pack-opening scene (render inside an R3F <Canvas>).
 *
 * @param {object} props
 * @param {() => void} [props.onRevealed]  fired once, when the gold card faces the camera
 * @param {boolean} [props.autoReveal]     jump straight to the final state (skip / reduced motion)
 * @param {boolean} [props.open]           start opening from outside (e.g. a keyboard-accessible button)
 * @param {() => void} [props.onOpen]      the pack was clicked/tapped in the scene
 * @param {(phase: 'focus') => void} [props.onPhase] the gold card has started heading to the front
 * @param {{ idle?: Rect, reveal?: Rect }} [props.layout] free areas of the canvas (0..1 fractions,
 *   `{ x, y, w, h }` from the top-left) where the pack should sit and where the gold card should land.
 */
export default function PackOpening({ onRevealed, autoReveal = false, open = false, onOpen, onPhase, layout }) {
  const [reduced] = useState(prefersReducedMotion)
  const [clicked, setClicked] = useState(false)
  const [hovered, setHovered] = useState(false)
  const started = clicked || open || autoReveal
  useCursor(hovered && !started)

  const assets = usePackAssets()

  const root = useRef(null)
  const floatGroup = useRef(null)
  const pack = useRef(null)
  const body = useRef(null)
  const strip = useRef(null)
  const tearBurst = useRef(null)
  const promoBurst = useRef(null)
  const glitter = useRef(null)
  const cards = useRef([])

  const timeline = useRef(-1)
  const fired = useRef({ focus: false, reveal: false })
  const pointer = useRef(new THREE.Vector2())
  const hover = useRef(0)

  // Standard R3F idiom: materials/uniforms are mutated every frame, outside React's render.
  // The compiler-style immutability rule can't tell three.js objects from React state.
  /* oxlint-disable react/immutability */
  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05)
    const time = state.clock.elapsedTime
    const motion = reduced ? 0 : 1

    if (started) timeline.current = timeline.current < 0 ? 0 : timeline.current + dt
    if (autoReveal && timeline.current < T.end) timeline.current = T.end
    const t = timeline.current

    if (t >= T.focus && !fired.current.focus) {
      fired.current.focus = true
      onPhase?.('focus')
    }
    if (t >= T.reveal && !fired.current.reveal) {
      fired.current.reveal = true
      onRevealed?.()
    }

    /* ---- layout: fit the stage to the free area the page gives us ---- */
    const { width: vw, height: vh, dpr } = state.viewport
    const camZ = state.camera.position.z || CAM_FALLBACK_Z
    const idle = layout?.idle ?? DEFAULT_RECT
    const cx = (idle.x + idle.w / 2 - 0.5) * vw
    const cy = (0.5 - (idle.y + idle.h / 2)) * vh
    const sw = idle.w * vw
    const sh = idle.h * vh
    const narrow = sw < sh * 1.05
    const spread = narrow ? 0.14 : 0.23
    const fanWidth = narrow ? 5.5 : 7.5
    // On narrow screens the outer fan cards may bleed off the edges; the pack is what has to fit.
    const s = Math.min((sh * 0.94) / 3.9, sw / (fanWidth * (narrow ? 0.8 : 0.95)), 1.25)

    pointer.current.x = THREE.MathUtils.damp(pointer.current.x, state.pointer.x, 4, dt)
    pointer.current.y = THREE.MathUtils.damp(pointer.current.y, state.pointer.y, 4, dt)
    const px = pointer.current.x * motion
    const py = pointer.current.y * motion

    const g = root.current
    g.position.set(cx, cy, 0)
    g.scale.setScalar(s)
    g.rotation.set(-py * 0.07, px * 0.12, 0)

    // Where the gold card lands (world → root-local).
    const rv = layout?.reveal ?? idle
    const zWorld = 1.6
    const kz = (camZ - zWorld) / camZ
    const pxWorld = (rv.x + rv.w / 2 - 0.5) * vw * kz
    const pyWorld = (0.5 - (rv.y + rv.h / 2)) * vh * kz
    const cardWorldH = Math.min(rv.h * vh * kz * 0.82, (rv.w * vw * kz * 0.86 * CARD_H) / CARD_W)
    const P = {
      x: (pxWorld - cx) / s,
      y: (pyWorld - cy) / s,
      z: zWorld / s,
      s: cardWorldH / CARD_H / s,
    }

    /* ---- sealed pack ---- */
    const fl = floatGroup.current
    if (started && fl) {
      // Float is disabled once opening starts; ease its last offset back to rest.
      const k = Math.exp(-10 * dt)
      fl.position.multiplyScalar(k)
      fl.rotation.set(fl.rotation.x * k, fl.rotation.y * k, fl.rotation.z * k)
      fl.updateMatrix()
    }

    hover.current = THREE.MathUtils.damp(hover.current, hovered && !started ? 1 : 0, 8, dt)
    const squash = t >= 0 ? Math.sin(Math.PI * clamp01(t / T.squash)) : 0
    const face = t >= 0 ? easeOutCubic(clamp01(t / 0.4)) : 0
    const h = hover.current
    const pk = pack.current
    pk.scale.set(1 + 0.04 * h + 0.05 * squash, 1 + 0.04 * h - 0.035 * squash, 1 + 0.04 * h)
    pk.rotation.set(0, 0.22 * (1 - face), -0.03 * (1 - face))
    assets.front.emissive.setScalar(0.5 + 0.06 * Math.sin(time * 2.1) * motion + 0.25 * h)

    const bd = body.current
    if (t < 0) {
      bd.position.set(0, 0, 0)
      bd.rotation.set(0, 0, 0)
      bd.visible = true
    } else {
      const d = easeInOutCubic(prog(t, ...T.drop))
      const e = easeInCubic(prog(t, ...T.exit))
      bd.position.set(0, DROP_Y * d - 6 * e, -0.4 * e)
      bd.rotation.set(-0.5 * e, 0, 0.12 * e)
      bd.visible = e < 1
    }

    // Top strip pivots on its left end (hinge), then gets flung off.
    const rip = easeOutBack(prog(t, ...T.rip), 2.2)
    const fly = prog(t, ...T.fly)
    const flyE = easeOutCubic(fly)
    const st = strip.current
    st.position.set(-HALF_W + 2.4 * flyE, TEAR_Y + 0.08 * rip + 5.2 * flyE, -1.2 * flyE)
    st.rotation.set(1.3 * fly, 2.6 * fly, 0.36 * rip + 1.6 * flyE)
    st.visible = fly < 1

    updateBurst(tearBurst.current, assets.tear, t - T.tearBurst, dpr)

    /* ---- cards ---- */
    const haloSpread = narrow ? 0.2 : 0.25
    const haloR = 4.2 * P.s
    for (let i = 0; i < assets.cardFronts.length; i++) {
      const card = cards.current[i]
      const mat = assets.cardFronts[i]
      if (!card) continue
      const start = T.cardStart + i * T.cardGap
      if (t < start) {
        card.visible = false
        continue
      }
      card.visible = true
      const isPromo = i === PROMO_INDEX
      const slot = SLOT_OF[i]
      const a = (slot - 2) * spread

      // Rise: from hidden inside the pack to just clear of the mouth.
      const zStack = 0.012 - i * 0.006
      const y0 = DROP_Y + TEAR_Y - 1.3
      const y1 = DROP_Y + TEAR_Y + CARD_H / 2 + 0.06
      const rise = easeOutCubic(prog(t, start, start + T.rise))
      // Fan: swing into a hand-of-cards arc *behind* the pack, each new card in front of the last.
      const fanP = prog(t, start + T.rise, start + T.rise + T.fan)
      const fanE = easeInOutCubic(fanP)
      const fanZ = easeOutCubic(fanP)
      const sx = FAN_R * Math.sin(a)
      const sy = FAN_Y + FAN_R * Math.cos(a) - FAN_R
      const sz = -0.45 + i * 0.035

      let x = sx * fanE
      let y = lerp(lerp(y0, y1, rise), sy, fanE)
      let z = lerp(zStack, sz, fanZ)
      let rx = 0
      let ry = isPromo ? Math.PI : 0 // the gold card comes out face-down
      let rz = -a * fanE
      let scale = 1
      let dim = 1
      let edge = mat.uniforms.uEdgeStrength.value

      if (t >= T.focus) {
        if (isPromo) {
          const travel = easeInOutCubic(prog(t, T.focus, T.focus + T.travel))
          const grow = easeOutBack(prog(t, T.focus, T.focus + T.travel + 0.05), 1.5)
          const flip = prog(t, ...T.flip)
          x = lerp(x, P.x, travel)
          y = lerp(y, P.y, travel) + Math.sin(Math.PI * travel) * 0.4
          z = lerp(z, P.z, travel)
          rz = 0.12 * Math.sin(Math.PI * travel)
          scale = lerp(1, P.s, grow)
          ry = Math.PI * (1 - easeOutBack(flip, 1.25))
          // Settled: tilt with the pointer so the foil catches the light.
          const idleW = smooth(T.flip[1], T.flip[1] + 0.8, t)
          ry += idleW * (px * 0.35 + Math.sin(time * 0.7) * 0.1 * motion)
          rx = idleW * (-py * 0.25 + Math.cos(time * 0.55) * 0.05 * motion)
          y += idleW * Math.sin(time * 1.1) * 0.05 * P.s * motion
          edge = 1.1 + idleW * 0.3 * Math.sin(time * 2.2) * motion
        } else {
          const recede = easeInOutCubic(prog(t, T.focus, T.focus + T.recede))
          const ha = (slot - 2) * haloSpread
          const hx = P.x + haloR * Math.sin(ha)
          const hy = P.y - 0.28 * P.s + haloR * Math.cos(ha) - haloR
          const hz = P.z - 1.1 / s - Math.abs(slot - 2) * 0.04
          x = lerp(x, hx, recede)
          y = lerp(y, hy, recede) + recede * Math.sin(time * 0.9 + i * 1.7) * 0.03 * P.s * motion
          z = lerp(z, hz, recede)
          rz = lerp(rz, -ha, recede)
          scale = lerp(1, P.s * 0.84, recede)
          dim = lerp(1, 0.42, recede)
        }
      }

      card.position.set(x, y, z)
      card.rotation.set(rx, ry, rz)
      card.scale.setScalar(scale)
      mat.uniforms.uDim.value = dim
      mat.uniforms.uEdgeStrength.value = edge
      mat.uniforms.uTime.value = time * motion
    }
    assets.cardBack.uniforms.uTime.value = time * motion

    const pb = promoBurst.current
    pb.position.set(P.x, P.y, P.z + 0.1)
    pb.scale.setScalar(P.s)
    updateBurst(pb, assets.promoBurst, t - T.burst, dpr)

    const gl = glitter.current
    gl.position.set(P.x, P.y, P.z - 0.2)
    gl.scale.setScalar(P.s)
    gl.visible = t >= T.burst
  })
  /* oxlint-enable react/immutability */

  const handleClick = (event) => {
    event.stopPropagation()
    if (started) return
    setClicked(true)
    onOpen?.()
  }

  return (
    <>
      <ambientLight intensity={0.2} />
      <directionalLight position={[2.5, 4, 6]} intensity={1.8} />
      <directionalLight position={[-6, 1.5, -2.5]} intensity={6} color="#ff2a3c" />
      <directionalLight position={[6, 1, -2.5]} intensity={6} color="#2f6bff" />
      <NeonEnvironment />

      <Sparkles
        count={40}
        scale={[12, 7, 3]}
        position={[0, 0, -2]}
        size={assets.dustSizes}
        color={assets.dustColors}
        speed={reduced ? 0 : 0.3}
        opacity={0.55}
      />

      <group ref={root}>
        <Float
          ref={floatGroup}
          enabled={!started}
          speed={1.6}
          rotationIntensity={0.8}
          floatIntensity={0.7}
          floatingRange={[-0.12, 0.12]}
        >
          <group ref={pack}>
            {!started && (
              <mesh
                visible={false}
                onClick={handleClick}
                onPointerOver={() => setHovered(true)}
                onPointerOut={() => setHovered(false)}
              >
                <planeGeometry args={[PACK_W + 0.6, PACK_H + 0.6]} />
              </mesh>
            )}
            <group ref={body}>
              <mesh geometry={assets.bodyGeo} material={assets.packMaterials} />
              <mesh geometry={assets.crimpBottom} material={assets.crimp} />
            </group>
            <group ref={strip}>
              <group position={[HALF_W, -TEAR_Y, 0]}>
                <mesh geometry={assets.stripGeo} material={assets.packMaterials} />
                <mesh geometry={assets.crimpTop} material={assets.crimp} />
              </group>
            </group>
            <group ref={tearBurst} position={[0.9, TEAR_Y, 0.15]} visible={false}>
              <points geometry={assets.tear.geometry} material={assets.tear.material} frustumCulled={false} />
            </group>
          </group>
        </Float>

        {assets.cardFronts.map((front, i) => (
          <group
            key={i}
            ref={(el) => {
              cards.current[i] = el
            }}
            visible={false}
          >
            <mesh geometry={assets.cardGeo} material={front} position={[0, 0, 0.002]} />
            <mesh geometry={assets.cardGeo} material={assets.cardBack} position={[0, 0, -0.002]} rotation={[0, Math.PI, 0]} />
          </group>
        ))}

        <group ref={promoBurst} visible={false}>
          <points geometry={assets.promoBurst.geometry} material={assets.promoBurst.material} frustumCulled={false} />
        </group>
        <group ref={glitter} visible={false}>
          <Sparkles count={36} scale={[3.4, 4.2, 1.2]} size={5} speed={reduced ? 0 : 0.4} color="#ffd166" opacity={0.9} noise={0.5} />
        </group>
      </group>
    </>
  )
}
