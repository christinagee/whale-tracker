// The intro's timeline: renderIntro(t) draws the frame for time t (in ms).
import {
  C,
  H,
  ORCAS_ICON,
  W,
  drawCaption,
  drawChairBack,
  drawChairBase,
  drawDesktop,
  drawDogBack,
  drawDogSide,
  drawOpeningWindow,
  drawPawCursor,
  drawRoom,
  drawScreens,
  px,
} from './scene'
import { drawText, textWidth } from './pixelFont'

export const DURATION = 11800

const CAPTION = "MEANWHILE, AT DANIEL'S DESK..."
const FLOOR_Y = 124 // where the dog's paws touch the rug
const SEAT_Y = 86

const ease = (p: number) => (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2)
const clamp01 = (v: number) => Math.max(0, Math.min(1, v))
const span = (t: number, a: number, b: number) => clamp01((t - a) / (b - a))
const lerp = (a: number, b: number, p: number) => a + (b - a) * p

// Static parts are drawn once and reused.
let roomCache: HTMLCanvasElement | null = null
function room(): HTMLCanvasElement {
  if (!roomCache) {
    roomCache = document.createElement('canvas')
    roomCache.width = W
    roomCache.height = H
    drawRoom(roomCache.getContext('2d')!)
  }
  return roomCache
}

const scene = document.createElement('canvas')
scene.width = W
scene.height = H
const desktop = document.createElement('canvas')
desktop.width = W
desktop.height = H

/** Draws the office scene (before zooming) into the scene canvas. */
function renderOffice(t: number) {
  const ctx = scene.getContext('2d')!
  ctx.drawImage(room(), 0, 0)

  // Caption types itself out, then fades.
  if (t < 3000) {
    const n = Math.floor(span(t, 200, 1600) * CAPTION.length)
    if (t < 2700 || Math.floor(t / 120) % 2 === 0) drawCaption(ctx, CAPTION.slice(0, n))
  }

  // Monitors wake up once the dog starts typing.
  const typingStart = 5400
  drawScreens(ctx, t > typingStart + 400 ? 1 : 0)

  drawChairBase(ctx)
  if (t >= 5100) {
    // Sitting on the chair, seen from behind, typing away.
    const typing = t > typingStart
    drawDogBack(ctx, typing ? Math.floor(t / 140) % 2 : 0)
    drawChairBack(ctx)
    if (typing && t < 7000) {
      // little "tap tap" above the dog
      const blink = Math.floor(t / 280) % 2
      drawText(ctx, 'TAP', blink ? 82 : 108, 40 + blink, '#7a8089')
    }
    if (t > typingStart + 400 && t < typingStart + 700) {
      // a flash as the screens wake
      for (let i = 0; i < 6; i++) px(ctx, 124 + i * 2 - 5, 40 - (i % 2), '#ffffff')
    }
  } else {
    drawChairBack(ctx)
    drawDogInFront(ctx, t)
  }
}

/** The dog trotting in and hopping up (drawn in front of the chair). */
function drawDogInFront(ctx: CanvasRenderingContext2D, t: number) {
  const step = Math.floor(t / 110) % 2
  if (t < 900) return
  if (t < 3500) {
    // trot in from the left
    const x = lerp(-20, 78, span(t, 900, 3500))
    drawDogSide(ctx, x, FLOOR_Y, step)
    // introduce the star: a little name tag that follows her in
    if (t > 1300 && t < 3300) {
      const tx = Math.round(x - 4)
      const ty = FLOOR_Y - 26
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(tx - 2, ty - 2, textWidth('BEAN') + 4, 9)
      ctx.fillStyle = '#ee7d2c'
      ctx.fillRect(tx - 2, ty + 7, textWidth('BEAN') + 4, 1)
      px(ctx, x, ty + 8, '#ffffff')
      drawText(ctx, 'BEAN', tx, ty, '#8a4a20')
    }
    return
  }
  if (t < 4100) {
    // first hop: not quite high enough
    const p = span(t, 3500, 4100)
    const y = FLOOR_Y - Math.sin(p * Math.PI) * 18
    drawDogSide(ctx, lerp(78, 82, p), y, 0, p > 0.1 && p < 0.9)
    return
  }
  if (t < 4500) {
    // a determined pause (with a little "!")
    drawDogSide(ctx, 82, FLOOR_Y, 0)
    if (t > 4200) drawText(ctx, '!', 96, FLOOR_Y - 22, '#e25b45')
    return
  }
  // second hop: up onto the seat
  const p = span(t, 4500, 5100)
  const x = lerp(82, 100, p)
  const y = lerp(FLOOR_Y, SEAT_Y, p) - Math.sin(p * Math.PI) * 16
  drawDogSide(ctx, x, y, 0, p > 0.05 && p < 0.95)
}

// Camera: zoom from the whole room into the middle monitor's screen.
const ZOOM_START = 7200
const ZOOM_END = 8700
const SCREEN = { x: 112, y: 46, w: 28, h: 19 }

/** Draws frame t onto a display canvas that is W*k by H*k pixels. */
export function renderIntro(out: CanvasRenderingContext2D, t: number) {
  const k = out.canvas.width / W
  out.imageSmoothingEnabled = false
  out.fillStyle = '#0b2545'
  out.fillRect(0, 0, out.canvas.width, out.canvas.height)

  if (t < ZOOM_END) {
    renderOffice(t)
    const z = ease(span(t, ZOOM_START, ZOOM_END))
    // At full zoom the screen fills the frame.
    const scale = lerp(1, W / SCREEN.w, z)
    const cx = lerp(W / 2, SCREEN.x + SCREEN.w / 2, z)
    const cy = lerp(H / 2, SCREEN.y + SCREEN.h / 2, z)
    out.setTransform(k * scale, 0, 0, k * scale, (W / 2 - cx * scale) * k, (H / 2 - cy * scale) * k)
    out.drawImage(scene, 0, 0)
    out.setTransform(1, 0, 0, 1, 0, 0)
  }

  if (t >= ZOOM_END) {
    // The desktop fades in as the zoom finishes.
    const dctx = desktop.getContext('2d')!
    const clicks = [10050, 10300]
    const selected = t > clicks[0]
    drawDesktop(dctx, selected)

    // paw cursor glides to the orcas folder and double-clicks
    const move = ease(span(t, 9000, 9900))
    const tx = ORCAS_ICON.x + ORCAS_ICON.w / 2
    const ty = ORCAS_ICON.y + 5
    const cxp = lerp(168, tx, move)
    const cyp = lerp(126, ty, move)
    const pressed = clicks.some((c) => t > c && t < c + 110)

    if (t > 10500) drawOpeningWindow(dctx, span(t, 10500, 11100))
    if (t < 10500) drawPawCursor(dctx, cxp, cyp, pressed)

    out.drawImage(desktop, 0, 0, W * k, H * k)
  }

  // A quick retro "screen flash" hides the switch from the zoomed room to the desktop.
  const flash = t < ZOOM_END ? span(t, ZOOM_END - 220, ZOOM_END) : 1 - span(t, ZOOM_END, ZOOM_END + 260)
  if (flash > 0) {
    out.fillStyle = `rgba(236, 244, 250, ${flash})`
    out.fillRect(0, 0, out.canvas.width, out.canvas.height)
  }
}

export const INTRO_BACKGROUND = C.wall
