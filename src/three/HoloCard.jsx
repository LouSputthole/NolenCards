// Rip Lab "Card Viewer": one holographic trading card the visitor can drag to tilt.
// Reuses the hero's holo shader and card-back art from materials.js; the face is drawn
// procedurally per card (name, Nashville skyline, NOLENSVILLE, rarity badge).
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Float, PresentationControls, Sparkles } from '@react-three/drei'
import * as THREE from 'three'
import {
  createCanvasTexture,
  createCardGeometry,
  createHoloMaterial,
  drawCardBack,
  loadCanvasFonts,
} from './materials.js'
import { RARITY_BY_ID } from '../riplab/rarity.js'

const CARD_W = 2.5
const CARD_H = 3.5
const CORNER = 0.16
const DEPTH = 0.03
const TEX_W = 512
const TEX_H = 717 // 512 * 3.5 / 2.5

// Art window in canvas px, and the same box in UVs (v runs bottom→top) for the shader's
// stronger foil mask.
const ART = { x: 36, y: 104, w: 440, h: 330 }
const ART_UV = [ART.x / TEX_W, 1 - (ART.y + ART.h) / TEX_H, (ART.x + ART.w) / TEX_W, 1 - ART.y / TEX_H]

// How much foil each tier gets in 3D. Every card shimmers a little; holo and gold go all in.
const FOIL = {
  common: { holo: 0.22, edge: 0.5 },
  uncommon: { holo: 0.38, edge: 0.7 },
  rare: { holo: 0.6, edge: 0.85 },
  holo: { holo: 1, edge: 0.95 },
  gold: { holo: 1, edge: 1.15, gold: true },
}

const DPR = [1, 1.5]
const CAMERA = { position: [0, 0, 8.6], fov: 35, near: 0.1, far: 40 }
const GL = { antialias: true, alpha: true, powerPreference: 'high-performance' }
const CANVAS_STYLE = { touchAction: 'pan-y' } // horizontal swipes turn the card, vertical ones still scroll

const DISPLAY = '"Bebas Neue", Oswald, Impact, sans-serif'
const SANS = 'Inter, system-ui, sans-serif'

/* ------------------------------------------------------------------ */
/* Card face artwork                                                   */
/* ------------------------------------------------------------------ */

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

function starPath(ctx, cx, cy, r, inset = 0.45) {
  ctx.beginPath()
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 === 0 ? r : r * inset
    const a = -Math.PI / 2 + (i * Math.PI) / 5
    ctx.lineTo(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad)
  }
  ctx.closePath()
}

/** Shrinks the font until `text` fits `maxWidth`; returns the width it ends up at. */
function fitText(ctx, text, weight, size, family, maxWidth, spacing = 0) {
  ctx.letterSpacing = `${spacing}px`
  ctx.font = `${weight} ${size}px ${family}`
  let width = ctx.measureText(text).width
  if (width > maxWidth) {
    ctx.font = `${weight} ${Math.floor((size * maxWidth) / width)}px ${family}`
    width = ctx.measureText(text).width
  }
  return width
}

function hashOf(text) {
  let h = 2166136261
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619)
  return h >>> 0
}

// Stylised Nashville skyline: [x%, width%, height px, kind]. The twin-spired tower is the hero.
const SKYLINE = [
  [0, 8, 52], [7, 6, 78], [12, 8, 60, 'stepped'], [19, 6, 104, 'point'], [24.5, 8, 70], [32, 5, 88],
  [36.5, 15, 128, 'spires'], [51, 7, 82], [57.5, 9, 112, 'stepped'], [66, 6, 64], [71.5, 8, 96, 'point'],
  [79, 7, 58], [85.5, 8, 76], [93, 7, 48],
]

function skylinePath(ctx, x0, base, width) {
  ctx.beginPath()
  for (const [bx, bw, bh, kind] of SKYLINE) {
    const x = x0 + (bx / 100) * width
    const w = (bw / 100) * width
    const top = base - bh
    ctx.moveTo(x, base)
    if (kind === 'spires') {
      ctx.lineTo(x, top)
      ctx.lineTo(x + w * 0.1, top - 44)
      ctx.lineTo(x + w * 0.24, top)
      ctx.lineTo(x + w * 0.76, top)
      ctx.lineTo(x + w * 0.9, top - 44)
      ctx.lineTo(x + w, top)
    } else if (kind === 'point') {
      ctx.lineTo(x, top)
      ctx.lineTo(x + w / 2, top - 26)
      ctx.lineTo(x + w, top)
    } else if (kind === 'stepped') {
      ctx.lineTo(x, top + 16)
      ctx.lineTo(x + w * 0.2, top + 16)
      ctx.lineTo(x + w * 0.2, top)
      ctx.lineTo(x + w * 0.8, top)
      ctx.lineTo(x + w * 0.8, top + 16)
      ctx.lineTo(x + w, top + 16)
    } else {
      ctx.lineTo(x, top)
      ctx.lineTo(x + w, top)
    }
    ctx.lineTo(x + w, base)
    ctx.closePath()
  }
}

function drawSkyline(ctx, x0, base, width, color, windows) {
  ctx.save()
  ctx.fillStyle = color
  ctx.shadowColor = color
  ctx.shadowBlur = 26
  skylinePath(ctx, x0, base, width)
  ctx.fill()
  ctx.shadowBlur = 0
  ctx.fillStyle = windows
  for (const [bx, bw, bh] of SKYLINE) {
    const x = x0 + (bx / 100) * width
    const w = (bw / 100) * width
    for (let y = base - bh + 10; y < base - 6; y += 10) {
      ctx.fillRect(x + w * 0.22, y, w * 0.16, 4)
      ctx.fillRect(x + w * 0.6, y, w * 0.16, 4)
    }
  }
  ctx.restore()
}

function triStar(ctx, cx, cy, r, ring) {
  ctx.save()
  ctx.fillStyle = ring
  ctx.shadowColor = ring
  ctx.shadowBlur = 14
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.fill()
  ctx.shadowBlur = 0
  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  ctx.arc(cx, cy, r * 0.8, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = ring
  ctx.beginPath()
  ctx.arc(cx, cy, r * 0.7, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#ffffff'
  for (let i = 0; i < 3; i++) {
    const a = -Math.PI / 2 + (i * Math.PI * 2) / 3
    starPath(ctx, cx + Math.cos(a) * r * 0.36, cy + Math.sin(a) * r * 0.36, r * 0.25)
    ctx.fill()
  }
  ctx.restore()
}

function drawArt(ctx, card, tier, gold) {
  const { x, y, w, h } = ART
  const { hue } = card
  const sat = tier.sat
  const base = y + h - 72

  ctx.save()
  roundRect(ctx, x, y, w, h, 12)
  ctx.clip()

  const sky = ctx.createLinearGradient(0, y, 0, y + h)
  sky.addColorStop(0, `hsl(${hue} ${sat}% 12%)`)
  sky.addColorStop(0.66, `hsl(${hue} ${sat}% 30%)`)
  sky.addColorStop(0.67, `hsl(${hue} ${sat}% 9%)`)
  sky.addColorStop(1, `hsl(${hue} ${sat}% 5%)`)
  ctx.fillStyle = sky
  ctx.fillRect(x, y, w, h)

  // Sunburst from the horizon.
  ctx.save()
  ctx.translate(256, base)
  for (let i = 0; i < 26; i++) {
    ctx.rotate((Math.PI * 2) / 26)
    ctx.fillStyle = i % 2 ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.015)'
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.lineTo(420, -34)
    ctx.lineTo(420, 34)
    ctx.closePath()
    ctx.fill()
  }
  ctx.restore()

  const glow = ctx.createRadialGradient(256, base - 40, 10, 256, base - 40, 220)
  glow.addColorStop(0, `hsla(${hue} 95% 60% / 0.55)`)
  glow.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = glow
  ctx.fillRect(x, y, w, h)

  // Night-sky stars, placed from the card name so each card is stable.
  let seed = hashOf(card.name)
  ctx.fillStyle = 'rgba(255,255,255,0.85)'
  for (let i = 0; i < 26; i++) {
    seed = Math.imul(seed ^ (seed >>> 13), 1274126177) >>> 0
    const sx = x + 10 + (seed % (w - 20))
    const sy = y + 10 + ((seed >>> 9) % 120)
    ctx.fillRect(sx, sy, 2, 2)
  }

  // The sign's white neon ring behind the skyline.
  ctx.save()
  ctx.lineWidth = 5
  ctx.strokeStyle = '#ffffff'
  ctx.shadowColor = 'rgba(255,255,255,0.9)'
  ctx.shadowBlur = 18
  ctx.beginPath()
  ctx.arc(256, base + 30, 170, Math.PI * 1.1, Math.PI * 1.9)
  ctx.stroke()
  ctx.restore()

  const skyline = gold ? '#ffd166' : '#ff2a3c'
  const windows = gold ? 'rgba(80,48,0,0.5)' : 'rgba(40,0,8,0.55)'
  drawSkyline(ctx, x + 18, base, w - 36, skyline, windows)

  // Reflection in the river.
  ctx.save()
  ctx.beginPath()
  ctx.rect(x, base, w, h)
  ctx.clip()
  ctx.globalAlpha = 0.28
  ctx.translate(0, base * 2)
  ctx.scale(1, -1)
  drawSkyline(ctx, x + 18, base, w - 36, skyline, windows)
  ctx.restore()
  ctx.fillStyle = 'rgba(255,255,255,0.18)'
  for (let i = 0; i < 6; i++) ctx.fillRect(x + 40 + ((i * 97) % 300), base + 14 + i * 9, 60 + (i % 3) * 30, 2)
  ctx.fillStyle = gold ? '#ffe9a8' : '#ff6a78'
  ctx.fillRect(x, base - 2, w, 4)

  triStar(ctx, x + w - 40, y + 40, 24, '#2f6bff')
  ctx.restore()

  ctx.save()
  ctx.lineWidth = 4
  ctx.strokeStyle = 'rgba(255,255,255,0.7)'
  roundRect(ctx, x, y, w, h, 12)
  ctx.stroke()
  ctx.restore()
}

function drawFace(ctx, width, height, card) {
  const tier = RARITY_BY_ID[card.rarity] ?? RARITY_BY_ID.common
  const gold = card.rarity === 'gold'
  const k = width / TEX_W
  const H = height / k
  ctx.scale(k, k)

  const frame = ctx.createLinearGradient(0, 0, TEX_W, H)
  tier.frame.forEach((c, i, all) => frame.addColorStop(i / (all.length - 1), c))
  ctx.fillStyle = frame
  ctx.fillRect(0, 0, TEX_W, H)

  roundRect(ctx, 16, 16, 480, H - 32, 20)
  ctx.fillStyle = gold ? '#140e04' : '#0b0b14'
  ctx.fill()

  // Rarity badge (top right), then the name gets whatever room is left.
  ctx.save()
  const label = tier.label.toUpperCase()
  const pillW = fitText(ctx, label, 600, 15, SANS, 190, 2) + 26
  roundRect(ctx, 472 - pillW, 46, pillW, 32, 16)
  ctx.fillStyle = tier.accent
  ctx.shadowColor = tier.accent
  ctx.shadowBlur = 12
  ctx.fill()
  ctx.shadowBlur = 0
  ctx.fillStyle = card.rarity === 'common' || gold ? '#0b0b14' : '#ffffff'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(label, 472 - pillW / 2 + 1, 63)
  ctx.restore()

  ctx.save()
  fitText(ctx, card.name.toUpperCase(), 400, 46, DISPLAY, 472 - pillW - 56, 2)
  ctx.textBaseline = 'middle'
  ctx.fillStyle = gold ? '#ffe9a8' : '#ffffff'
  ctx.fillText(card.name.toUpperCase(), 40, 64)
  ctx.restore()

  drawArt(ctx, card, tier, gold)

  ctx.save()
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  fitText(ctx, 'NOLENSVILLE', 400, 60, DISPLAY, 420, 12)
  ctx.fillStyle = gold ? '#fff3c4' : '#eef2ff'
  ctx.shadowColor = gold ? '#ffb000' : '#2f6bff'
  ctx.shadowBlur = 20
  ctx.fillText('NOLENSVILLE', 262, 482)
  ctx.shadowBlur = 0
  fitText(ctx, 'RIP LAB · SERIES ONE', 600, 14, SANS, 400, 4)
  ctx.fillStyle = 'rgba(255,255,255,0.55)'
  ctx.fillText('RIP LAB · SERIES ONE', 258, 520)
  ctx.restore()

  // Stat bars, derived from the name so a card always reads the same.
  const h = hashOf(card.name)
  const stats = [
    ['HYPE', 0.25 + tier.rank * 0.18],
    ['SHINE', 0.35 + (h % 45) / 100],
  ]
  stats.forEach(([name, value], i) => {
    const y = 562 + i * 38
    ctx.save()
    ctx.font = `400 26px ${DISPLAY}`
    ctx.letterSpacing = '3px'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = '#ffffff'
    ctx.fillText(name, 48, y + 1)
    roundRect(ctx, 140, y - 8, 324, 16, 8)
    ctx.fillStyle = 'rgba(255,255,255,0.12)'
    ctx.fill()
    roundRect(ctx, 140, y - 8, 324 * Math.min(value, 1), 16, 8)
    ctx.fillStyle = tier.accent
    ctx.fill()
    ctx.restore()
  })

  ctx.fillStyle = 'rgba(255,255,255,0.14)'
  ctx.fillRect(40, 634, 432, 2)

  // Footer: rarity pips + card number.
  ctx.save()
  ctx.fillStyle = tier.accent
  ctx.shadowColor = tier.accent
  ctx.shadowBlur = 8
  for (let i = 0; i <= tier.rank; i++) {
    starPath(ctx, 54 + i * 28, 668, 10)
    ctx.fill()
  }
  ctx.shadowBlur = 0
  ctx.font = `600 14px ${SANS}`
  ctx.letterSpacing = '3px'
  ctx.textAlign = 'right'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = 'rgba(255,255,255,0.55)'
  ctx.fillText(`PRETTY COOL · No. ${String((h % 120) + 1).padStart(3, '0')}`, 470, 668)
  ctx.restore()
}

/* ------------------------------------------------------------------ */
/* Scene                                                               */
/* ------------------------------------------------------------------ */

/** Rounded slab between the two faces so the card has a lit edge. Corners match createCardGeometry. */
function createSlabGeometry() {
  const x = -CARD_W / 2
  const y = -CARD_H / 2
  const r = CORNER
  const s = new THREE.Shape()
  s.moveTo(x + r, y)
  s.lineTo(x + CARD_W - r, y)
  s.quadraticCurveTo(x + CARD_W, y, x + CARD_W, y + r)
  s.lineTo(x + CARD_W, y + CARD_H - r)
  s.quadraticCurveTo(x + CARD_W, y + CARD_H, x + CARD_W - r, y + CARD_H)
  s.lineTo(x + r, y + CARD_H)
  s.quadraticCurveTo(x, y + CARD_H, x, y + CARD_H - r)
  s.lineTo(x, y + r)
  s.quadraticCurveTo(x, y, x + r, y)
  const geo = new THREE.ExtrudeGeometry(s, { depth: DEPTH, bevelEnabled: false, curveSegments: 4 })
  geo.translate(0, 0, -DEPTH / 2)
  return geo
}

function useCardAssets() {
  const assets = useMemo(() => {
    const backMap = createCanvasTexture(384, 538, drawCardBack)
    const glowMap = createCanvasTexture(128, 128, (ctx, w, h) => {
      const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2)
      g.addColorStop(0, 'rgba(255,255,255,0.9)')
      g.addColorStop(0.4, 'rgba(255,255,255,0.25)')
      g.addColorStop(1, 'rgba(255,255,255,0)')
      ctx.fillStyle = g
      ctx.fillRect(0, 0, w, h)
    })
    return {
      backMap,
      glowMap,
      front: createHoloMaterial({ map: backMap, art: ART_UV }),
      back: createHoloMaterial({ map: backMap, holo: 0.55, edgeColor: '#ff5a6a', edge: 0.7, art: [0.2, 0.25, 0.8, 0.75] }),
      slab: new THREE.MeshStandardMaterial({ color: '#1b1b28', metalness: 0.85, roughness: 0.28 }),
      glow: new THREE.MeshBasicMaterial({
        map: glowMap,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        opacity: 0.5,
      }),
      faceGeo: createCardGeometry(CARD_W, CARD_H, CORNER),
      slabGeo: createSlabGeometry(),
    }
  }, [])

  useEffect(() => {
    let alive = true
    loadCanvasFonts().then(() => {
      if (alive) assets.backMap.userData.redraw?.()
    })
    return () => {
      alive = false
      const { backMap, glowMap, front, back, slab, glow, faceGeo, slabGeo } = assets
      ;[backMap, glowMap, front, back, slab, glow, faceGeo, slabGeo].forEach((d) => d.dispose())
    }
  }, [assets])

  return assets
}

const easeOutBack = (k, s = 1.4) => 1 + (s + 1) * (k - 1) ** 3 + s * (k - 1) ** 2

function Card({ card, reduced }) {
  const assets = useCardAssets()
  const spinner = useRef(null)
  const twirl = useRef(-1) // seconds since the card was swapped; -1 = idle
  const tier = RARITY_BY_ID[card.rarity] ?? RARITY_BY_ID.common
  const sparkle = card.rarity === 'holo' || card.rarity === 'gold'

  const faceMap = useMemo(
    () => createCanvasTexture(TEX_W, TEX_H, (ctx, w, h) => drawFace(ctx, w, h, card)),
    [card],
  )

  // Standard R3F idiom (same as PackOpening): three.js materials/uniforms are mutated in
  // effects and per frame. The immutability rule can't tell them apart from React state.
  /* oxlint-disable react/immutability */
  // Point the shared materials at the new card.
  useLayoutEffect(() => {
    const foil = FOIL[card.rarity] ?? FOIL.common
    const u = assets.front.uniforms
    u.uMap.value = faceMap
    u.uHolo.value = foil.holo
    u.uGold.value = foil.gold ? 1 : 0
    u.uEdgeStrength.value = foil.edge
    u.uEdgeColor.value.set(tier.accent)
    assets.slab.color.set(card.rarity === 'gold' ? '#6b4a10' : '#1b1b28')
    assets.glow.color.set(tier.accent)
    if (!reduced) twirl.current = 0 // one spin to present each newly loaded card

    let alive = true
    loadCanvasFonts().then(() => {
      if (alive) faceMap.userData.redraw?.()
    })
    return () => {
      alive = false
      faceMap.dispose()
    }
  }, [assets, faceMap, card, tier, reduced])

  useFrame((state, delta) => {
    const time = reduced ? 0 : state.clock.elapsedTime
    assets.front.uniforms.uTime.value = time
    assets.back.uniforms.uTime.value = time
    const g = spinner.current
    if (!g) return
    if (twirl.current >= 0) {
      twirl.current += Math.min(delta, 0.05)
      const k = Math.min(twirl.current / 0.95, 1)
      g.rotation.y = Math.PI * 2 * (1 - easeOutBack(k))
      if (k >= 1) twirl.current = -1
    } else {
      g.rotation.y = 0
    }
  })
  /* oxlint-enable react/immutability */

  return (
    <>
      <mesh material={assets.glow} position={[0, 0, -1.4]} scale={[7.5, 8.5, 1]}>
        <planeGeometry args={[1, 1]} />
      </mesh>
      {sparkle && (
        <Sparkles
          count={30}
          scale={[4.2, 5, 1.5]}
          size={4}
          speed={reduced ? 0 : 0.35}
          color={tier.accent}
          opacity={0.85}
        />
      )}
      <PresentationControls
        global
        snap
        speed={1.4}
        polar={[-0.35, 0.35]}
        azimuth={[-0.85, 0.85]}
        damping={0.2}
      >
        <Float enabled={!reduced} speed={1.4} rotationIntensity={0.55} floatIntensity={0.8} floatingRange={[-0.08, 0.08]}>
          <group ref={spinner}>
            <mesh geometry={assets.slabGeo} material={assets.slab} />
            <mesh geometry={assets.faceGeo} material={assets.front} position={[0, 0, DEPTH / 2 + 0.001]} />
            <mesh
              geometry={assets.faceGeo}
              material={assets.back}
              position={[0, 0, -DEPTH / 2 - 0.001]}
              rotation={[0, Math.PI, 0]}
            />
          </group>
        </Float>
      </PresentationControls>
    </>
  )
}

/**
 * @param {object} props
 * @param {{ name: string, rarity: string, hue: number }} props.card  card to show
 * @param {boolean} [props.active]   render frames (false pauses the loop while off-screen)
 * @param {boolean} [props.reduced]  prefers-reduced-motion: no float, twirl or foil drift
 */
export default function HoloCard({ card, active = true, reduced = false }) {
  return (
    <Canvas dpr={DPR} camera={CAMERA} gl={GL} frameloop={active ? 'always' : 'never'} style={CANVAS_STYLE}>
      <ambientLight intensity={0.25} />
      <directionalLight position={[2.5, 4, 6]} intensity={1.8} />
      <directionalLight position={[-6, 1.5, -2.5]} intensity={6} color="#ff2a3c" />
      <directionalLight position={[6, 1, -2.5]} intensity={6} color="#2f6bff" />
      <Card card={card} reduced={reduced} />
    </Canvas>
  )
}
