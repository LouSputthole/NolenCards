// Procedural assets for the hero pack-opening scene: canvas-drawn textures,
// the holographic card shader, and the pack / card geometry builders.
// Everything is generated at runtime — no image files, no network.
import * as THREE from 'three'

export const CARD_W = 2.0
export const CARD_H = 2.8
export const PACK_W = 2.6
export const PACK_H = 3.6

const HALF_W = PACK_W / 2
// The soft "pillow" part of the pack spans y ∈ [-1.5, 1.5]; flat crimped seals cover the rest.
const BODY_HALF = 1.5
// Where the top strip tears away from the body.
export const TEAR_Y = 1.25

const RED = '#ff2a3c'
const BLUE = '#2f6bff'
const DISPLAY = '"Bebas Neue", Oswald, Impact, sans-serif'
const SCRIPT = 'Pacifico, "Brush Script MT", "Segoe Script", cursive'
const SANS = 'Inter, system-ui, sans-serif'
const MONO = 'ui-monospace, "SF Mono", Menlo, Consolas, monospace'

/** Small seeded PRNG (mulberry32) so particle layouts are deterministic. */
export function seededRandom(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/* ------------------------------------------------------------------ */
/* Canvas helpers                                                      */
/* ------------------------------------------------------------------ */

function roundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

function radialGlow(ctx, x, y, r, color) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r)
  g.addColorStop(0, color)
  g.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = g
  ctx.fillRect(x - r, y - r, r * 2, r * 2)
}

function setSpacing(ctx, px) {
  // Canvas letterSpacing is widely supported now; older engines just ignore the property.
  ctx.letterSpacing = `${px}px`
}

function fitFont(ctx, text, weight, size, family, maxWidth) {
  ctx.font = `${weight} ${size}px ${family}`
  const width = ctx.measureText(text).width
  if (width > maxWidth) {
    size = Math.floor((size * maxWidth) / width)
    ctx.font = `${weight} ${size}px ${family}`
  }
  return size
}

function starPath(ctx, cx, cy, r, points = 5, inset = 0.45) {
  ctx.beginPath()
  for (let i = 0; i < points * 2; i++) {
    const rad = i % 2 === 0 ? r : r * inset
    const a = -Math.PI / 2 + (i * Math.PI) / points
    ctx.lineTo(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad)
  }
  ctx.closePath()
}

// A generic Nashville-ish skyline, with one twin-spired tower as the focal point.
const SKYLINE = [
  [0, 7, 30], [6, 6, 50], [12, 8, 38], [19, 5, 64], [24, 9, 44], [33, 6, 72], [39, 4, 52],
  [43, 14, 96, 'spires'], [57, 6, 58], [63, 9, 80], [72, 5, 46], [77, 8, 66], [85, 6, 40], [91, 9, 54],
]

function skylinePath(ctx, x0, base, width) {
  ctx.beginPath()
  for (const [bx, bw, bh, kind] of SKYLINE) {
    const x = x0 + (bx / 100) * width
    const w = (bw / 100) * width
    if (kind === 'spires') {
      ctx.moveTo(x, base)
      ctx.lineTo(x, base - bh)
      ctx.lineTo(x + w * 0.1, base - bh - 46)
      ctx.lineTo(x + w * 0.24, base - bh)
      ctx.lineTo(x + w * 0.76, base - bh)
      ctx.lineTo(x + w * 0.9, base - bh - 46)
      ctx.lineTo(x + w, base - bh)
      ctx.lineTo(x + w, base)
      ctx.closePath()
    } else {
      ctx.rect(x, base - bh, w, bh)
    }
  }
}

function skylineWindows(ctx, x0, base, width) {
  ctx.fillStyle = 'rgba(40, 0, 8, 0.55)'
  for (const [bx, bw, bh] of SKYLINE) {
    const x = x0 + (bx / 100) * width
    const w = (bw / 100) * width
    if (w < 14) continue
    for (let y = base - bh + 8; y < base - 6; y += 9) {
      ctx.fillRect(x + w * 0.22, y, w * 0.18, 4)
      ctx.fillRect(x + w * 0.6, y, w * 0.18, 4)
    }
  }
}

function footballPath(ctx, cx, cy, w, h) {
  ctx.beginPath()
  ctx.moveTo(cx - w / 2, cy)
  ctx.quadraticCurveTo(cx, cy - h, cx + w / 2, cy)
  ctx.quadraticCurveTo(cx, cy + h, cx - w / 2, cy)
  ctx.closePath()
}

function triStarBadge(ctx, cx, cy, r, ring = BLUE) {
  ctx.save()
  ctx.fillStyle = ring
  ctx.shadowColor = ring
  ctx.shadowBlur = 16
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.fill()
  ctx.shadowBlur = 0
  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  ctx.arc(cx, cy, r * 0.78, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = ring
  ctx.beginPath()
  ctx.arc(cx, cy, r * 0.68, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#ffffff'
  for (let i = 0; i < 3; i++) {
    const a = -Math.PI / 2 + (i * Math.PI * 2) / 3
    starPath(ctx, cx + Math.cos(a) * r * 0.36, cy + Math.sin(a) * r * 0.36, r * 0.24)
    ctx.fill()
  }
  ctx.restore()
}

function neonScript(ctx, text, x, y, maxWidth, size, rotation = -0.09) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(rotation)
  fitFont(ctx, text, 400, size, SCRIPT, maxWidth)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.lineJoin = 'round'
  ctx.lineWidth = 14
  ctx.strokeStyle = '#07070b'
  ctx.strokeText(text, 0, 0)
  ctx.shadowColor = 'rgba(255,255,255,0.95)'
  ctx.shadowBlur = 22
  ctx.fillStyle = '#ffffff'
  ctx.fillText(text, 0, 0)
  ctx.shadowBlur = 8
  ctx.fillText(text, 0, 0)
  ctx.restore()
}

/* ------------------------------------------------------------------ */
/* Texture factory                                                     */
/* ------------------------------------------------------------------ */

/**
 * Draws into a fresh canvas and wraps it in a CanvasTexture. `texture.userData.redraw()`
 * repaints it (used once the web fonts finish loading).
 */
export function createCanvasTexture(width, height, draw) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 4
  const paint = () => {
    ctx.save()
    ctx.clearRect(0, 0, width, height)
    draw(ctx, width, height)
    ctx.restore()
    texture.needsUpdate = true
  }
  paint()
  texture.userData.redraw = paint
  return texture
}

/** Resolves when the brand fonts used on the canvases are available (or failed offline). */
export function loadCanvasFonts() {
  if (typeof document === 'undefined' || !document.fonts?.load) return Promise.resolve()
  return Promise.allSettled([
    document.fonts.load('400 64px "Pacifico"'),
    document.fonts.load('400 64px "Bebas Neue"'),
    document.fonts.load('600 16px "Inter"'),
  ])
}

/* ------------------------------------------------------------------ */
/* Artwork                                                             */
/* ------------------------------------------------------------------ */

/** Front of the sealed pack. Laid out over the full 2.6 x 3.6 pack; crimps hide the top/bottom bands. */
export function drawPackLabel(ctx, w, h) {
  const k = w / 512
  const H = h / k
  ctx.scale(k, k)

  const bg = ctx.createLinearGradient(0, 0, 512, H)
  bg.addColorStop(0, '#1a1a30')
  bg.addColorStop(0.5, '#0e0e1c')
  bg.addColorStop(1, '#1b1640')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, 512, H)

  // Wood-slat wall, like the one behind the real neon sign.
  ctx.fillStyle = 'rgba(255,255,255,0.035)'
  for (let x = 10; x < 512; x += 38) ctx.fillRect(x, 0, 3, H)
  radialGlow(ctx, 150, 250, 260, 'rgba(255,42,60,0.32)')
  radialGlow(ctx, 360, 540, 260, 'rgba(47,107,255,0.36)')

  const yStripTop = H * (0.3 / PACK_H)
  const yTear = H * ((PACK_H / 2 - TEAR_Y) / PACK_H)

  // Tear strip + perforation line.
  ctx.fillStyle = 'rgba(255,255,255,0.07)'
  ctx.fillRect(0, yStripTop, 512, yTear - yStripTop)
  ctx.save()
  ctx.setLineDash([10, 8])
  ctx.lineWidth = 2
  ctx.strokeStyle = 'rgba(255,255,255,0.65)'
  ctx.beginPath()
  ctx.moveTo(14, yTear)
  ctx.lineTo(498, yTear)
  ctx.stroke()
  ctx.restore()
  ctx.save()
  ctx.font = `400 24px ${DISPLAY}`
  setSpacing(ctx, 8)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = 'rgba(255,255,255,0.85)'
  ctx.fillText('TEAR TO OPEN', 260, (yStripTop + yTear) / 2 + 2)
  ctx.restore()

  // White neon ring arc behind the skyline (the sign's circle).
  ctx.save()
  ctx.lineWidth = 5
  ctx.strokeStyle = '#ffffff'
  ctx.shadowColor = 'rgba(255,255,255,0.9)'
  ctx.shadowBlur = 16
  ctx.beginPath()
  ctx.arc(256, 390, 212, Math.PI * 1.08, Math.PI * 1.92)
  ctx.stroke()
  ctx.restore()

  // Red skyline silhouette.
  ctx.save()
  ctx.fillStyle = RED
  ctx.shadowColor = RED
  ctx.shadowBlur = 28
  skylinePath(ctx, 70, 300, 372)
  ctx.fill()
  ctx.shadowBlur = 0
  skylineWindows(ctx, 70, 300, 372)
  ctx.fillStyle = '#ff6a78'
  ctx.fillRect(52, 298, 408, 5)
  ctx.restore()

  neonScript(ctx, 'PrettyCool', 256, 368, 440, 96)

  // "CARDS" banner, dark text on a white skewed plate like the sign.
  ctx.save()
  ctx.translate(196, 452)
  ctx.transform(1, 0, -0.25, 1, 0, 0)
  roundedRect(ctx, -84, -25, 168, 50, 8)
  ctx.fillStyle = '#f4f4f8'
  ctx.shadowColor = 'rgba(255,255,255,0.7)'
  ctx.shadowBlur = 16
  ctx.fill()
  ctx.shadowBlur = 0
  ctx.fillStyle = '#0b0b14'
  ctx.font = `400 48px ${DISPLAY}`
  setSpacing(ctx, 8)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('CARDS', 4, 3)
  ctx.restore()

  // Blue band with a neon football.
  const band = ctx.createLinearGradient(0, 0, 512, 0)
  band.addColorStop(0, 'rgba(47,107,255,0)')
  band.addColorStop(0.5, 'rgba(47,107,255,0.6)')
  band.addColorStop(1, 'rgba(47,107,255,0)')
  ctx.fillStyle = band
  ctx.fillRect(0, 500, 512, 64)
  ctx.save()
  ctx.lineWidth = 5
  ctx.strokeStyle = '#86a8ff'
  ctx.shadowColor = BLUE
  ctx.shadowBlur = 24
  footballPath(ctx, 286, 532, 250, 70)
  ctx.fillStyle = 'rgba(47,107,255,0.35)'
  ctx.fill()
  ctx.stroke()
  ctx.lineWidth = 4
  ctx.strokeStyle = '#ffffff'
  ctx.shadowColor = '#ffffff'
  ctx.shadowBlur = 10
  ctx.beginPath()
  ctx.moveTo(236, 532)
  ctx.lineTo(336, 532)
  for (let i = 0; i < 6; i++) {
    const x = 246 + i * 16
    ctx.moveTo(x, 522)
    ctx.lineTo(x, 542)
  }
  ctx.stroke()
  ctx.restore()
  triStarBadge(ctx, 446, 518, 24)

  ctx.save()
  ctx.font = `400 46px ${DISPLAY}`
  setSpacing(ctx, 8)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = '#eef2ff'
  ctx.shadowColor = BLUE
  ctx.shadowBlur = 20
  ctx.fillText('NOLENSVILLE', 260, 596)
  ctx.restore()

  ctx.save()
  ctx.font = `600 14px ${SANS}`
  setSpacing(ctx, 4)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = 'rgba(255,255,255,0.62)'
  ctx.fillText('BOOSTER PACK · 5 CARDS · 1 GOLD CHASE', 258, 632)
  ctx.restore()

  // Foil gloss streak.
  const gloss = ctx.createLinearGradient(0, 0, 512, H)
  gloss.addColorStop(0.18, 'rgba(255,255,255,0)')
  gloss.addColorStop(0.3, 'rgba(255,255,255,0.08)')
  gloss.addColorStop(0.42, 'rgba(255,255,255,0)')
  ctx.fillStyle = gloss
  ctx.fillRect(0, 0, 512, H)
}

/** Shared card back: dark field, red→blue neon frame, script emblem. */
export function drawCardBack(ctx, w, h) {
  const k = w / 512
  const H = h / k
  ctx.scale(k, k)
  ctx.fillStyle = '#0b0b14'
  ctx.fillRect(0, 0, 512, H)

  const field = ctx.createRadialGradient(256, H / 2, 20, 256, H / 2, 440)
  field.addColorStop(0, '#231a52')
  field.addColorStop(0.6, '#0f0c26')
  field.addColorStop(1, '#07070b')
  roundedRect(ctx, 22, 22, 468, H - 44, 22)
  ctx.fillStyle = field
  ctx.fill()

  ctx.save()
  roundedRect(ctx, 22, 22, 468, H - 44, 22)
  ctx.clip()
  ctx.translate(256, H / 2)
  for (let i = 0; i < 36; i++) {
    ctx.rotate((Math.PI * 2) / 36)
    ctx.fillStyle = i % 2 ? 'rgba(255,42,60,0.12)' : 'rgba(47,107,255,0.12)'
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.lineTo(620, -28)
    ctx.lineTo(620, 28)
    ctx.closePath()
    ctx.fill()
  }
  ctx.restore()

  ctx.save()
  const frame = ctx.createLinearGradient(0, 0, 512, H)
  frame.addColorStop(0, RED)
  frame.addColorStop(1, BLUE)
  ctx.lineWidth = 7
  ctx.strokeStyle = frame
  ctx.shadowColor = 'rgba(255,255,255,0.6)'
  ctx.shadowBlur = 16
  roundedRect(ctx, 22, 22, 468, H - 44, 22)
  ctx.stroke()
  ctx.restore()

  ctx.save()
  ctx.lineWidth = 8
  ctx.strokeStyle = '#ffffff'
  ctx.shadowColor = '#ffffff'
  ctx.shadowBlur = 20
  ctx.beginPath()
  ctx.arc(256, H / 2, 150, 0, Math.PI * 2)
  ctx.stroke()
  ctx.lineWidth = 4
  ctx.strokeStyle = RED
  ctx.shadowColor = RED
  ctx.beginPath()
  ctx.arc(256, H / 2, 170, 0, Math.PI * 2)
  ctx.stroke()
  ctx.strokeStyle = BLUE
  ctx.shadowColor = BLUE
  ctx.beginPath()
  ctx.arc(256, H / 2, 130, 0, Math.PI * 2)
  ctx.stroke()
  ctx.restore()

  neonScript(ctx, 'PrettyCool', 256, H / 2 - 8, 360, 84)

  ctx.save()
  ctx.font = `400 36px ${DISPLAY}`
  setSpacing(ctx, 12)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = '#cfd6ff'
  ctx.fillText('CARDS', 262, H / 2 + 76)
  ctx.restore()

  ctx.fillStyle = 'rgba(255,255,255,0.8)'
  for (const [x, y] of [[62, 62], [450, 62], [62, H - 62], [450, H - 62]]) {
    starPath(ctx, x, y, 13)
    ctx.fill()
  }
}

/** The four holo pulls. Invented names and shapes only — no real-world card art. */
export const HOLO_CARDS = [
  { name: 'Neon Rookie', kind: 'Neon · Holo Rare', a: '#ff2a3c', b: '#3d0718', glyph: 'star', edge: '#ff5a6a', no: 1 },
  { name: 'Volt', kind: 'Spark · Holo Rare', a: '#2f6bff', b: '#081640', glyph: 'bolt', edge: '#7aa2ff', no: 2 },
  { name: 'Hot Streak', kind: 'Flame · Holo Rare', a: '#ff8a2a', b: '#3e1205', glyph: 'flame', edge: '#ffb066', no: 3 },
  { name: 'Tri-Star', kind: 'Hometown · Holo Rare', a: '#9a63ff', b: '#1a0b45', glyph: 'tristar', edge: '#be98ff', no: 4 },
]

function drawGlyph(ctx, glyph, cx, cy, r, color) {
  ctx.save()
  ctx.fillStyle = '#ffffff'
  ctx.shadowColor = color
  ctx.shadowBlur = 40
  if (glyph === 'star') {
    starPath(ctx, cx, cy, r, 5, 0.46)
    ctx.fill()
  } else if (glyph === 'bolt') {
    ctx.beginPath()
    ctx.moveTo(cx + r * 0.2, cy - r)
    ctx.lineTo(cx - r * 0.55, cy + r * 0.12)
    ctx.lineTo(cx - r * 0.02, cy + r * 0.12)
    ctx.lineTo(cx - r * 0.25, cy + r)
    ctx.lineTo(cx + r * 0.58, cy - r * 0.18)
    ctx.lineTo(cx + r * 0.05, cy - r * 0.18)
    ctx.closePath()
    ctx.fill()
  } else if (glyph === 'flame') {
    ctx.beginPath()
    ctx.moveTo(cx, cy - r)
    ctx.bezierCurveTo(cx + r * 0.2, cy - r * 0.45, cx + r * 0.85, cy - r * 0.25, cx + r * 0.62, cy + r * 0.45)
    ctx.bezierCurveTo(cx + r * 0.48, cy + r * 0.92, cx - r * 0.48, cy + r * 0.92, cx - r * 0.62, cy + r * 0.45)
    ctx.bezierCurveTo(cx - r * 0.78, cy - r * 0.05, cx - r * 0.3, cy - r * 0.2, cx - r * 0.18, cy - r * 0.62)
    ctx.bezierCurveTo(cx - r * 0.05, cy - r * 0.4, cx + r * 0.05, cy - r * 0.7, cx, cy - r)
    ctx.closePath()
    ctx.fill()
  } else {
    ctx.restore()
    triStarBadge(ctx, cx, cy, r * 0.9, color)
    return
  }
  ctx.restore()
}

export function drawHoloFront(ctx, w, h, card) {
  const k = w / 512
  const H = h / k
  ctx.scale(k, k)

  const frame = ctx.createLinearGradient(0, 0, 512, H)
  frame.addColorStop(0, '#eef0f6')
  frame.addColorStop(0.35, '#8e93a6')
  frame.addColorStop(0.62, '#f4f5fa')
  frame.addColorStop(1, '#7c8197')
  ctx.fillStyle = frame
  ctx.fillRect(0, 0, 512, H)

  roundedRect(ctx, 18, 18, 476, H - 36, 18)
  ctx.fillStyle = '#0d0d18'
  ctx.fill()

  // Name bar.
  ctx.save()
  ctx.font = `400 46px ${DISPLAY}`
  setSpacing(ctx, 3)
  ctx.textBaseline = 'middle'
  ctx.fillStyle = '#ffffff'
  ctx.fillText(card.name.toUpperCase(), 42, 60)
  ctx.textAlign = 'right'
  ctx.font = `600 16px ${SANS}`
  setSpacing(ctx, 3)
  ctx.fillStyle = card.edge
  ctx.fillText('HOLO ★', 470, 62)
  ctx.restore()

  // Art window: sunburst + glyph.
  ctx.save()
  roundedRect(ctx, 38, 96, 436, 330, 12)
  ctx.clip()
  const art = ctx.createRadialGradient(256, 262, 10, 256, 262, 300)
  art.addColorStop(0, card.a)
  art.addColorStop(0.55, card.b)
  art.addColorStop(1, '#05050a')
  ctx.fillStyle = art
  ctx.fillRect(38, 96, 436, 330)
  ctx.translate(256, 262)
  for (let i = 0; i < 28; i++) {
    ctx.rotate((Math.PI * 2) / 28)
    ctx.fillStyle = i % 2 ? 'rgba(255,255,255,0.09)' : 'rgba(255,255,255,0.02)'
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.lineTo(400, -38)
    ctx.lineTo(400, 38)
    ctx.closePath()
    ctx.fill()
  }
  ctx.restore()
  drawGlyph(ctx, card.glyph, 256, 262, 104, card.a)
  ctx.save()
  ctx.lineWidth = 4
  ctx.strokeStyle = 'rgba(255,255,255,0.75)'
  roundedRect(ctx, 38, 96, 436, 330, 12)
  ctx.stroke()
  ctx.restore()

  // Info panel.
  ctx.save()
  ctx.font = `600 17px ${SANS}`
  setSpacing(ctx, 3)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = 'rgba(255,255,255,0.7)'
  ctx.fillText(card.kind.toUpperCase(), 256, 452)
  ctx.restore()

  const stats = [['FLEX', 0.62 + card.no * 0.07], ['SHINE', 0.92 - card.no * 0.06], ['HYPE', 0.5 + card.no * 0.1]]
  stats.forEach(([label, value], i) => {
    const y = 494 + i * 40
    ctx.font = `400 26px ${DISPLAY}`
    setSpacing(ctx, 3)
    ctx.textBaseline = 'middle'
    ctx.textAlign = 'left'
    ctx.fillStyle = '#ffffff'
    ctx.fillText(label, 48, y + 1)
    roundedRect(ctx, 140, y - 8, 320, 16, 8)
    ctx.fillStyle = 'rgba(255,255,255,0.12)'
    ctx.fill()
    roundedRect(ctx, 140, y - 8, 320 * Math.min(value, 1), 16, 8)
    ctx.fillStyle = card.a
    ctx.fill()
  })

  ctx.font = `600 14px ${SANS}`
  setSpacing(ctx, 2)
  ctx.textBaseline = 'middle'
  ctx.textAlign = 'left'
  ctx.fillStyle = 'rgba(255,255,255,0.5)'
  ctx.fillText('PRETTY COOL CARDS · NOLENSVILLE', 48, H - 52)
  ctx.textAlign = 'right'
  ctx.fillText(`0${card.no}/05`, 464, H - 52)
}

/** The gold chase card carrying the promo code. */
export function drawPromoFront(ctx, w, h, { percent, code }) {
  const k = w / 512
  const H = h / k
  ctx.scale(k, k)

  const gold = ctx.createLinearGradient(0, 0, 512, H)
  gold.addColorStop(0, '#7a5312')
  gold.addColorStop(0.22, '#f8d77e')
  gold.addColorStop(0.45, '#b5832a')
  gold.addColorStop(0.7, '#ffe9a8')
  gold.addColorStop(1, '#8a6116')
  ctx.fillStyle = gold
  ctx.fillRect(0, 0, 512, H)

  const inner = ctx.createRadialGradient(256, H * 0.42, 20, 256, H * 0.42, 420)
  inner.addColorStop(0, '#3a2808')
  inner.addColorStop(0.6, '#1a1205')
  inner.addColorStop(1, '#0c0803')
  roundedRect(ctx, 22, 22, 468, H - 44, 20)
  ctx.fillStyle = inner
  ctx.fill()

  ctx.save()
  roundedRect(ctx, 22, 22, 468, H - 44, 20)
  ctx.clip()
  ctx.translate(256, H * 0.4)
  for (let i = 0; i < 32; i++) {
    ctx.rotate((Math.PI * 2) / 32)
    ctx.fillStyle = i % 2 ? 'rgba(255,209,102,0.10)' : 'rgba(255,209,102,0.03)'
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.lineTo(620, -40)
    ctx.lineTo(620, 40)
    ctx.closePath()
    ctx.fill()
  }
  ctx.restore()

  ctx.save()
  ctx.lineWidth = 3
  ctx.strokeStyle = 'rgba(255,233,168,0.85)'
  roundedRect(ctx, 34, 34, 444, H - 68, 14)
  ctx.stroke()
  ctx.restore()

  const center = (text, font, spacing, y, fill, blur = 0, glowColor = '#ffb000') => {
    ctx.save()
    ctx.font = font
    setSpacing(ctx, spacing)
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = fill
    if (blur) {
      ctx.shadowColor = glowColor
      ctx.shadowBlur = blur
    }
    ctx.fillText(text, 256 + spacing / 2, y)
    ctx.restore()
  }

  center('PRETTY COOL CARDS', `400 34px ${DISPLAY}`, 8, 78, '#f8d77e')
  center('★  GOLD CHASE  ★', `600 15px ${SANS}`, 5, 112, 'rgba(255,233,168,0.85)')

  const numberFill = ctx.createLinearGradient(0, 160, 0, 380)
  numberFill.addColorStop(0, '#fff3c4')
  numberFill.addColorStop(0.5, '#ffd166')
  numberFill.addColorStop(1, '#c48a1c')
  center(`${percent}%`, `400 236px ${DISPLAY}`, 0, 278, numberFill, 36)
  center('OFF', `400 112px ${DISPLAY}`, 10, 430, '#ffe39a', 24)

  // Code plate.
  ctx.save()
  roundedRect(ctx, 58, 512, 396, 96, 16)
  ctx.fillStyle = 'rgba(0,0,0,0.6)'
  ctx.fill()
  ctx.setLineDash([12, 8])
  ctx.lineWidth = 3
  ctx.strokeStyle = '#ffd166'
  ctx.stroke()
  ctx.restore()
  ctx.save()
  fitFont(ctx, code, 700, 50, MONO, 340)
  setSpacing(ctx, 3)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = '#fff6dd'
  ctx.shadowColor = '#ffb000'
  ctx.shadowBlur = 14
  ctx.fillText(code, 258, 562)
  ctx.restore()

  center('SHOW AT THE REGISTER', `600 15px ${SANS}`, 5, H - 74, 'rgba(255,233,168,0.8)')

  ctx.fillStyle = '#fff3c4'
  for (const [x, y, r] of [[70, 170, 12], [446, 200, 9], [84, 400, 8], [438, 410, 13]]) {
    starPath(ctx, x, y, r, 4, 0.3)
    ctx.fill()
  }
}

/** Fine vertical ribs for the crimped seals (used as a bump map). */
export function createRibTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 64
  canvas.height = 4
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#808080'
  ctx.fillRect(0, 0, 64, 4)
  for (let x = 0; x < 64; x += 8) {
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(x, 0, 3, 4)
    ctx.fillStyle = '#404040'
    ctx.fillRect(x + 4, 0, 2, 4)
  }
  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(1.5, 1)
  return texture
}

/* ------------------------------------------------------------------ */
/* Holographic card shader                                             */
/* ------------------------------------------------------------------ */

const holoVertex = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vN;
  varying vec3 vV;
  void main() {
    vUv = uv;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vN = normalize(normalMatrix * normal);
    vV = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`

const holoFragment = /* glsl */ `
  uniform sampler2D uMap;
  uniform float uTime;
  uniform float uHolo;
  uniform float uGold;
  uniform float uDim;
  uniform float uEdgeStrength;
  uniform vec3 uEdgeColor;
  uniform vec4 uArt;
  uniform float uAspect;
  varying vec2 vUv;
  varying vec3 vN;
  varying vec3 vV;

  vec3 spectrum(float h) {
    return clamp(abs(fract(h + vec3(0.0, 0.6667, 0.3333)) * 6.0 - 3.0) - 1.0, 0.0, 1.0);
  }

  float sdRoundRect(vec2 p, vec2 b, float r) {
    vec2 q = abs(p) - b + r;
    return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
  }

  void main() {
    vec3 base = texture2D(uMap, vUv).rgb;
    vec3 N = normalize(vN);
    vec3 V = normalize(vV);
    vec3 R = reflect(-V, N);
    float facing = clamp(dot(N, V), 0.0, 1.0);

    // Stronger foil inside the art window, a lighter "reverse holo" on the frame.
    vec2 lo = smoothstep(uArt.xy - 0.01, uArt.xy + 0.01, vUv);
    vec2 hi = 1.0 - smoothstep(uArt.zw - 0.01, uArt.zw + 0.01, vUv);
    float art = lo.x * lo.y * hi.x * hi.y;
    float mask = uHolo * mix(0.3, 1.0, art);

    // Rainbow bands slide with the view-dependent reflection vector.
    float band = vUv.x * 0.8 + vUv.y * 1.2 + R.x * 1.8 + R.y * 1.2 + uTime * 0.05;
    vec3 rainbow = spectrum(band);
    vec3 goldTint = vec3(1.0, 0.78, 0.36);
    vec3 sheen = mix(rainbow, goldTint * (0.55 + 0.6 * rainbow.r), uGold);

    float lines = pow(0.5 + 0.5 * sin((vUv.x - vUv.y) * 120.0 + R.x * 14.0), 10.0);
    float lum = dot(base, vec3(0.299, 0.587, 0.114));

    vec3 col = base;
    col += sheen * mask * (0.16 + 0.34 * lines) * (0.55 + lum);

    // A glare stripe that sweeps across as the card tilts.
    float g = (vUv.x + vUv.y * 0.6) - 0.8 - R.x * 1.6 + R.y * 0.6;
    col += exp(-g * g * 40.0) * 0.3 * mix(vec3(1.0), goldTint, uGold) * uHolo;

    // Grazing-angle sheen.
    col += pow(1.0 - facing, 3.0) * sheen * 0.6 * uHolo;

    // Emissive neon edge.
    vec2 p = (vUv - 0.5) * vec2(uAspect, 1.0);
    float d = sdRoundRect(p, vec2(0.5 * uAspect, 0.5), 0.04);
    float rim = smoothstep(0.022, 0.0, -d);
    col += uEdgeColor * rim * uEdgeStrength;

    col *= uDim;
    gl_FragColor = vec4(col, 1.0);
    #include <colorspace_fragment>
  }
`

/**
 * Holographic card material. Self-lit (the cards should read clearly on a dark stage),
 * with a rainbow sheen that shifts with view angle, a glare sweep and an emissive edge.
 */
export function createHoloMaterial({
  map,
  gold = false,
  holo = 1,
  edgeColor = '#ffffff',
  edge = 0.9,
  art = [0.074, 0.406, 0.926, 0.866],
}) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uMap: { value: map },
      uTime: { value: 0 },
      uHolo: { value: holo },
      uGold: { value: gold ? 1 : 0 },
      uDim: { value: 1 },
      uEdgeStrength: { value: edge },
      uEdgeColor: { value: new THREE.Color(edgeColor) },
      uArt: { value: new THREE.Vector4(...art) },
      uAspect: { value: CARD_W / CARD_H },
    },
    vertexShader: holoVertex,
    fragmentShader: holoFragment,
  })
}

/* ------------------------------------------------------------------ */
/* Geometry                                                            */
/* ------------------------------------------------------------------ */

/** Rounded-rectangle card face with 0..1 UVs. */
export function createCardGeometry(w = CARD_W, h = CARD_H, r = 0.11) {
  const x = -w / 2
  const y = -h / 2
  const s = new THREE.Shape()
  s.moveTo(x + r, y)
  s.lineTo(x + w - r, y)
  s.quadraticCurveTo(x + w, y, x + w, y + r)
  s.lineTo(x + w, y + h - r)
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  s.lineTo(x + r, y + h)
  s.quadraticCurveTo(x, y + h, x, y + h - r)
  s.lineTo(x, y + r)
  s.quadraticCurveTo(x, y, x + r, y)
  const geo = new THREE.ShapeGeometry(s, 4)
  const pos = geo.attributes.position
  const uv = geo.attributes.uv
  for (let i = 0; i < pos.count; i++) uv.setXY(i, (pos.getX(i) + w / 2) / w, (pos.getY(i) + h / 2) / h)
  uv.needsUpdate = true
  return geo
}

// Pillow profile: full in the middle, pinched to a thin seal at every edge.
function packThickness(x, y) {
  const fx = 1 - Math.pow(Math.min(Math.abs(x) / HALF_W, 1), 6)
  const fy = 1 - Math.pow(Math.min(Math.abs(y) / BODY_HALF, 1), 4)
  return 0.006 + 0.12 * fx * fy
}

// Jagged tear line shared by the body's top edge and the strip's bottom edge so they match.
function tearJag(x) {
  return 0.03 * Math.sin(x * 23.0) * Math.sin(x * 7.3 + 1.1) + 0.012 * Math.sin(x * 51.0)
}

/**
 * A slice of the pillowed pack between yMin and yMax. Group 0 = front (label), group 1 = back.
 * UVs map the whole 2.6 x 3.6 pack so the body and the strip share one label texture.
 */
export function createPillowGeometry(yMin, yMax, segY, { jagTop = false, jagBottom = false } = {}) {
  const segX = 18
  const cols = segX + 1
  const rows = segY + 1
  const positions = new Float32Array(cols * rows * 2 * 3)
  const uvs = new Float32Array(cols * rows * 2 * 2)
  let p = 0
  let q = 0
  for (let side = 0; side < 2; side++) {
    const sign = side === 0 ? 1 : -1
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        const x = -HALF_W + (PACK_W * i) / segX
        let y = yMin + ((yMax - yMin) * j) / segY
        if (j === 0 && jagBottom) y += tearJag(x)
        if (j === segY && jagTop) y += tearJag(x)
        positions[p++] = x
        positions[p++] = y
        positions[p++] = sign * packThickness(x, y)
        const u = (x + HALF_W) / PACK_W
        uvs[q++] = side === 0 ? u : 1 - u
        uvs[q++] = (y + PACK_H / 2) / PACK_H
      }
    }
  }
  const indices = []
  const perSide = cols * rows
  for (let side = 0; side < 2; side++) {
    const o = side * perSide
    for (let j = 0; j < segY; j++) {
      for (let i = 0; i < segX; i++) {
        const a = o + j * cols + i
        const b = a + 1
        const d = a + cols
        const c = d + 1
        if (side === 0) indices.push(a, b, d, b, c, d)
        else indices.push(a, d, b, b, d, c)
      }
    }
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2))
  geo.setIndex(indices)
  const half = segX * segY * 6
  geo.addGroup(0, half, 0)
  geo.addGroup(half, half, 1)
  geo.computeVertexNormals()
  return geo
}

/** Flat crimped seal with a serrated outer edge (top or bottom of the pack). */
export function createCrimpGeometry(top) {
  const teeth = 26
  const depth = 0.05
  const dir = top ? 1 : -1
  const inner = dir * BODY_HALF
  const outer = dir * (PACK_H / 2)
  const s = new THREE.Shape()
  s.moveTo(-HALF_W, inner)
  s.lineTo(HALF_W, inner)
  for (let i = 0; i <= teeth * 2; i++) {
    const x = HALF_W - (PACK_W * i) / (teeth * 2)
    s.lineTo(x, outer - dir * (i % 2 === 0 ? depth : 0))
  }
  s.closePath()
  const geo = new THREE.ExtrudeGeometry(s, { depth: 0.016, bevelEnabled: false, curveSegments: 1 })
  geo.translate(0, 0, -0.008)
  return geo
}

/* ------------------------------------------------------------------ */
/* Sparkle burst                                                       */
/* ------------------------------------------------------------------ */

const burstVertex = /* glsl */ `
  uniform float uT;
  uniform float uLife;
  uniform float uPixelRatio;
  uniform float uSize;
  attribute float aSize;
  attribute float aSeed;
  attribute vec3 aColor;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    float t = uT;
    float k = 1.0 - exp(-3.5 * t);
    vec3 p = position * k;
    p.y -= 0.25 * t * t;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    float fade = 1.0 - smoothstep(uLife * 0.4, uLife, t);
    vAlpha = fade * (0.65 + 0.35 * sin(t * 18.0 + aSeed * 40.0));
    vColor = aColor;
    gl_PointSize = aSize * uSize * uPixelRatio * (0.6 + 0.4 * fade) / -mv.z;
  }
`

const burstFragment = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c);
    float core = exp(-d * d * 60.0);
    float flare = exp(-abs(c.x) * 28.0) * exp(-abs(c.y) * 5.0) + exp(-abs(c.y) * 28.0) * exp(-abs(c.x) * 5.0);
    float a = (core + flare * 0.55) * vAlpha;
    if (a < 0.01) discard;
    gl_FragColor = vec4(vColor * a, a);
    #include <colorspace_fragment>
  }
`

/** One-shot additive sparkle burst; drive `uniforms.uT` (seconds since the burst) per frame. */
export function createBurst({ count, radius, life, size, palette, seed = 1 }) {
  const random = seededRandom(seed)
  const pos = new Float32Array(count * 3)
  const col = new Float32Array(count * 3)
  const sizes = new Float32Array(count)
  const seeds = new Float32Array(count)
  const c = new THREE.Color()
  for (let i = 0; i < count; i++) {
    const theta = random() * Math.PI * 2
    const u = random() * 2 - 1
    const ring = Math.sqrt(1 - u * u)
    const speed = radius * (0.35 + 0.65 * Math.pow(random(), 0.6))
    pos[i * 3] = Math.cos(theta) * ring * speed
    pos[i * 3 + 1] = Math.sin(theta) * ring * speed
    pos[i * 3 + 2] = u * 0.35 * speed
    c.set(palette[i % palette.length])
    col[i * 3] = c.r
    col[i * 3 + 1] = c.g
    col[i * 3 + 2] = c.b
    sizes[i] = 0.6 + random()
    seeds[i] = random()
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  geometry.setAttribute('aColor', new THREE.BufferAttribute(col, 3))
  geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1))
  geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1))
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uT: { value: 0 },
      uLife: { value: life },
      uPixelRatio: { value: 1 },
      uSize: { value: size },
    },
    vertexShader: burstVertex,
    fragmentShader: burstFragment,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  })
  return { geometry, material, life }
}
