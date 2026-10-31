// Pixel-art drawing for the intro: Daniel's office and the dachshund.
// Everything is drawn at 192x144 and scaled up with crisp pixels.
import { drawText, textWidth } from './pixelFont'

export const W = 192
export const H = 144

export const C = {
  ceiling: '#f3f2ee',
  ceilingLine: '#dedcd5',
  wall: '#ecebe5',
  wallLeft: '#e1e0d9',
  floor: '#c99d6b',
  floorLine: '#b4875a',
  rug: '#f2f0ea',
  rugShade: '#e0ddd5',
  rugLine: '#59616d',
  deskTop: '#e6d3ab',
  deskEdge: '#cdb489',
  leg: '#a9adb3',
  legDark: '#868a90',
  monitor: '#17191e',
  bezel: '#2b2e35',
  screenOff: '#222731',
  speaker: '#1d1f24',
  mouse: '#e9eaed',
  keyboard: '#2a2d33',
  plant: '#3f7d3b',
  plantDark: '#2b5a2a',
  pot: '#b6bcc3',
  potBand: '#d8c39a',
  chair: '#1b1c20',
  chairMesh: '#2d2f35',
  chairMetal: '#3b3d43',
  shelfFrame: '#1b1b1d',
  shelfWood: '#7b5b3d',
  lampShade: '#ebe4d1',
  lampShadeDark: '#d5cbb1',
  lampPole: '#2b2b2b',
  basket: '#efebe2',
  basketLine: '#cec7b6',
  leaf: '#2e4c34',
  leafLight: '#3f6646',
  frame: '#1a1a1a',
  mat: '#c8c3c8',
  paper: '#f6f3ea',
  seal: '#c9a227',
  winFrame: '#efeee6',
  glass: '#dde8e4',
  glassLight: '#f4f8f5',
  heater: '#e3e5e7',
  bulb: '#fbfaf1',
  cord: '#e9e9e2',
  coat: '#b5652d',
  coatDark: '#8a4a20',
  ear: '#7b3f1a',
  sweater: '#8c97a8',
  sweaterLight: '#adb6c4',
  sweaterDark: '#717c8e',
  collar: '#ee7d2c',
  nose: '#1a1414',
  text: '#4a4f57',
  screenOn: '#2f6f9f',
  screenOnLight: '#4a8cbf',
  folder: '#f2c14e',
  folderDark: '#c9972c',
}

type Ctx = CanvasRenderingContext2D

export function rect(ctx: Ctx, x: number, y: number, w: number, h: number, c: string) {
  ctx.fillStyle = c
  ctx.fillRect(Math.round(x), Math.round(y), w, h)
}
export function px(ctx: Ctx, x: number, y: number, c: string) {
  ctx.fillStyle = c
  ctx.fillRect(Math.round(x), Math.round(y), 1, 1)
}

// ── Room (static) ───────────────────────────────────────────

export function drawRoom(ctx: Ctx) {
  // ceiling and walls
  rect(ctx, 0, 0, W, 12, C.ceiling)
  rect(ctx, 0, 12, W, 1, C.ceilingLine)
  rect(ctx, 0, 13, 66, 100, C.wallLeft)
  rect(ctx, 66, 13, W - 66, 100, C.wall)
  rect(ctx, 66, 13, 1, 100, C.ceilingLine) // corner

  // wood floor
  rect(ctx, 0, 112, W, 32, C.floor)
  for (let y = 116; y < H; y += 5) rect(ctx, 0, y, W, 1, C.floorLine)

  // rug with a diamond line pattern
  for (let y = 116; y < H; y++) {
    const left = Math.max(0, 30 - (y - 116) * 1.2)
    for (let x = Math.round(left); x < W; x++) {
      const line = (x + 2 * y) % 24 === 0 || (x - 2 * y + 600) % 24 === 0
      const edge = y === 116 || x === Math.round(left)
      px(ctx, x, y, line ? C.rugLine : edge ? C.rugShade : C.rug)
    }
  }

  // ceiling bulb on a draped cord
  for (let x = 96; x <= 128; x++) px(ctx, x, Math.round(2 + 6 * Math.sin(((x - 96) / 32) * Math.PI * 0.5)), C.cord)
  rect(ctx, 128, 8, 1, 14, C.cord)
  rect(ctx, 126, 22, 5, 2, C.bulb)
  rect(ctx, 125, 24, 7, 4, C.bulb)
  rect(ctx, 126, 28, 5, 1, C.bulb)

  // window with light, and a heater under it
  rect(ctx, 156, 36, 36, 68, C.winFrame)
  rect(ctx, 159, 39, 33, 62, C.glass)
  rect(ctx, 159, 68, 33, 2, C.winFrame)
  for (let i = 0; i < 18; i++) px(ctx, 163 + i, 42 + i, C.glassLight)
  for (let i = 0; i < 14; i++) px(ctx, 170 + i, 72 + i, C.glassLight)
  rect(ctx, 152, 104, 40, 8, C.heater)
  rect(ctx, 152, 104, 40, 1, C.ceilingLine)

  // framed picture (no text)
  rect(ctx, 16, 28, 42, 22, C.frame)
  rect(ctx, 18, 30, 38, 18, C.mat)
  rect(ctx, 22, 32, 13, 14, C.paper)
  rect(ctx, 39, 32, 13, 14, C.paper)
  for (let y = 35; y < 44; y += 2) {
    rect(ctx, 24, y, 9, 1, C.mat)
    rect(ctx, 41, y, 9, 1, C.mat)
  }
  rect(ctx, 44, 41, 3, 3, C.seal)

  drawShelf(ctx)
  drawDesk(ctx)

  // small trash bin
  rect(ctx, 57, 102, 8, 12, C.shelfFrame)
  rect(ctx, 56, 101, 10, 2, C.chairMetal)

  drawLampAndPlant(ctx)
}

function drawLampAndPlant(ctx: Ctx) {
  // floor lamp with a drum shade
  rect(ctx, 11, 54, 2, 58, C.lampPole)
  rect(ctx, 7, 111, 10, 2, C.lampPole)
  rect(ctx, 1, 40, 22, 14, C.lampShade)
  rect(ctx, 1, 52, 22, 2, C.lampShadeDark)
  rect(ctx, 1, 40, 22, 1, C.lampShadeDark)
  // big rubber plant in a woven basket
  const leaves: [number, number][] = [[2, 78], [10, 74], [18, 80], [6, 88], [16, 90], [24, 86], [0, 94], [12, 96], [28, 96]]
  leaves.forEach(([lx, ly], i) => {
    const c = i % 2 ? C.leaf : C.leafLight
    rect(ctx, lx, ly + 1, 7, 3, c)
    rect(ctx, lx + 1, ly, 5, 5, c)
    px(ctx, lx + 3, ly + 2, C.leaf)
  })
  rect(ctx, 9, 84, 1, 18, C.leaf)
  rect(ctx, 0, 102, 24, 24, C.basket)
  for (let y = 104; y < 126; y += 3) rect(ctx, 0, y, 24, 1, C.basketLine)
  rect(ctx, 0, 110, 24, 2, '#8d8a84')
}

function drawShelf(ctx: Ctx) {
  const x0 = 8
  const x1 = 52
  rect(ctx, x0, 56, 2, 60, C.shelfFrame)
  rect(ctx, x1, 56, 2, 60, C.shelfFrame)
  for (const y of [64, 78, 92, 106]) rect(ctx, x0 - 2, y, x1 - x0 + 6, 2, C.shelfWood)
  // top shelf: mug, small box, white pumpkin
  rect(ctx, 14, 58, 5, 6, '#f6f6f2')
  px(ctx, 19, 60, '#f6f6f2')
  px(ctx, 19, 61, '#f6f6f2')
  rect(ctx, 23, 59, 5, 5, '#24262b')
  rect(ctx, 33, 59, 7, 5, '#f4f1ea')
  px(ctx, 36, 58, '#6b5a3a')
  rect(ctx, 42, 61, 6, 3, '#3a2f28')
  // second shelf: laptop bag and pen cup
  rect(ctx, 12, 70, 28, 8, '#1f2024')
  rect(ctx, 14, 69, 24, 1, '#2c2e33')
  rect(ctx, 44, 72, 4, 6, '#f2f2ee')
  px(ctx, 45, 70, '#d64545')
  px(ctx, 46, 71, '#2e86de')
  // third shelf: colorful books
  const books = ['#c0392b', '#2e86de', '#27ae60', '#f1c40f', '#2c3e50', '#8e44ad', '#e67e22', '#16a085', '#2c3e50', '#d35400', '#1abc9c']
  let bx = 12
  books.forEach((c, i) => {
    const h = 10 + ((i * 7) % 4)
    rect(ctx, bx, 92 - h, 3, h, c)
    bx += 3
  })
  rect(ctx, 46, 86, 5, 6, '#f0e4c8')
  // bottom shelf: plaid blanket and a stack of books
  for (let y = 98; y < 106; y++) for (let x = 12; x < 32; x++) px(ctx, x, y, (x + y) % 4 === 0 ? '#c9a24b' : (x % 4 === 0 ? '#4b2e2a' : '#7a3b33'))
  rect(ctx, 34, 102, 14, 2, '#e8722c')
  rect(ctx, 35, 100, 12, 2, '#f2d8a7')
  rect(ctx, 34, 98, 13, 2, '#3b5b8c')
}

function drawDesk(ctx: Ctx) {
  // plants behind the monitors
  for (const [x, y] of [[80, 56], [84, 52], [88, 55], [92, 51], [96, 54], [104, 47], [108, 44], [112, 42]]) {
    rect(ctx, x, y, 3, 2, C.plant)
    px(ctx, x + 1, y + 2, C.plantDark)
  }
  rect(ctx, 105, 47, 1, 12, C.plantDark)

  // monitors (screens drawn separately so they can turn on)
  rect(ctx, 84, 62, 31, 20, C.monitor) // left
  rect(ctx, 98, 82, 3, 4, C.bezel)
  rect(ctx, 94, 85, 11, 1, C.bezel)
  rect(ctx, 110, 44, 32, 23, C.monitor) // middle, raised on an arm
  rect(ctx, 125, 67, 2, 19, C.chairMetal)
  rect(ctx, 138, 58, 28, 21, C.monitor) // right
  rect(ctx, 151, 79, 2, 7, C.chairMetal)
  rect(ctx, 147, 85, 10, 1, C.chairMetal)
  drawScreens(ctx, 0)

  // speakers, keyboard, mouse, orchid
  rect(ctx, 116, 78, 6, 8, C.speaker)
  rect(ctx, 144, 79, 6, 7, C.speaker)
  rect(ctx, 104, 85, 26, 1, C.keyboard)
  rect(ctx, 133, 84, 4, 2, C.mouse)
  rect(ctx, 166, 77, 10, 9, C.pot)
  rect(ctx, 166, 83, 10, 1, C.potBand)
  for (let i = 0; i < 9; i++) px(ctx, 171 - Math.round(Math.sin(i / 3) * 2), 76 - i, C.plantDark)
  rect(ctx, 168, 67, 3, 2, C.plant)

  // desk top and legs (standing desk on casters)
  rect(ctx, 76, 86, 100, 2, C.deskTop)
  rect(ctx, 76, 88, 100, 1, C.deskEdge)
  for (const lx of [88, 162]) {
    rect(ctx, lx, 89, 3, 30, C.leg)
    rect(ctx, lx + 2, 89, 1, 30, C.legDark)
    rect(ctx, lx - 8, 118, 19, 2, C.leg)
    px(ctx, lx - 8, 120, C.legDark)
    px(ctx, lx + 10, 120, C.legDark)
  }
  rect(ctx, 91, 92, 71, 2, C.legDark) // crossbar
}

/** brightness: 0 = off, 1 = fully on. */
export function drawScreens(ctx: Ctx, brightness: number) {
  const on = brightness > 0.5
  rect(ctx, 86, 64, 27, 16, on ? C.screenOnLight : C.screenOff)
  rect(ctx, 140, 60, 24, 17, on ? C.screenOnLight : C.screenOff)
  if (on) {
    // simple "code" lines on the side screens
    for (let i = 0; i < 5; i++) {
      rect(ctx, 88, 66 + i * 3, 6 + ((i * 5) % 12), 1, '#cfe3f3')
      rect(ctx, 142, 62 + i * 3, 5 + ((i * 7) % 13), 1, '#cfe3f3')
    }
  }
  drawMiniDesktop(ctx, on)
}

/** The middle monitor's screen: a tiny version of the desktop we zoom into. */
function drawMiniDesktop(ctx: Ctx, on: boolean) {
  const x = 112
  const y = 46
  if (!on) {
    rect(ctx, x, y, 28, 19, C.screenOff)
    return
  }
  rect(ctx, x, y, 28, 19, C.screenOn)
  rect(ctx, x, y, 28, 1, '#d8dde3')
  for (const iy of [4, 8, 12]) rect(ctx, x + 2, y + iy, 2, 2, '#e8eef4')
  rect(ctx, x + 13, y + 8, 3, 2, C.folder)
}

// ── Chair (drawn in two parts so the dog can sit behind the mesh back) ───

export const CHAIR_X = 100

export function drawChairBase(ctx: Ctx) {
  const cx = CHAIR_X
  rect(ctx, cx - 12, 86, 25, 4, C.chair) // seat
  rect(ctx, cx - 14, 82, 3, 7, C.chair) // armrests
  rect(ctx, cx + 12, 82, 3, 7, C.chair)
  rect(ctx, cx - 1, 90, 3, 15, C.chairMetal) // gas lift
  rect(ctx, cx - 14, 104, 29, 2, C.chair) // star base
  rect(ctx, cx - 5, 105, 11, 3, C.chair)
  for (const [dx, dy] of [[-14, 106], [-7, 108], [0, 108], [7, 108], [14, 106]]) rect(ctx, cx + dx - 1, dy, 3, 3, C.chairMetal)
}

/** The mesh backrest: a solid frame with a see-through checker mesh inside. */
export function drawChairBack(ctx: Ctx) {
  const cx = CHAIR_X
  rect(ctx, cx - 7, 59, 15, 5, C.chair) // headrest
  rect(ctx, cx - 1, 64, 3, 2, C.chair)
  const top = 66
  const bottom = 86
  for (let y = top; y < bottom; y++) {
    const half = y < top + 2 || y > bottom - 3 ? 8 : 9
    for (let x = cx - half; x <= cx + half; x++) {
      const frame = x === cx - half || x === cx + half || y === top || y === bottom - 1
      if (frame) px(ctx, x, y, C.chair)
      else if ((x + y) % 2 === 0) px(ctx, x, y, C.chairMesh)
    }
  }
}

// ── The dachshund ───────────────────────────────────────────

/**
 * Side view, facing right. (x, y) is the point between the paws on the ground.
 * step: 0 or 1 for the walk cycle; tuck: legs folded mid-jump.
 */
export function drawDogSide(ctx: Ctx, x: number, y: number, step: number, tuck = false) {
  x = Math.round(x)
  y = Math.round(y)
  const legLen = tuck ? 1 : 3
  const by = y - legLen - 6 // top of the body
  // tail
  px(ctx, x - 14, by + 1, C.coatDark)
  px(ctx, x - 15, by, C.coatDark)
  px(ctx, x - 16, by - 1, C.coatDark)
  // legs (drawn first so the body sits on top)
  const back = step === 0 ? [x - 11, x - 8] : [x - 10, x - 9]
  const front = step === 0 ? [x + 5, x + 2] : [x + 4, x + 3]
  for (const lx of [...back, ...front]) {
    rect(ctx, lx, by + 6, 2, legLen, C.coat)
    rect(ctx, lx, by + 5 + legLen, 2, 1, C.coatDark)
  }
  // body with sweater
  rect(ctx, x - 13, by + 1, 21, 5, C.coat)
  rect(ctx, x - 13, by + 5, 21, 1, C.coatDark)
  rect(ctx, x - 10, by, 16, 6, C.sweater)
  for (let i = 0; i < 16; i += 3) px(ctx, x - 10 + i, by + 1 + (i % 2) * 2, C.sweaterLight)
  rect(ctx, x - 10, by + 5, 16, 1, C.sweaterDark)
  rect(ctx, x + 5, by - 1, 1, 7, C.collar) // orange collar
  // neck and head
  rect(ctx, x + 6, by - 2, 3, 6, C.coat)
  rect(ctx, x + 7, by - 5, 6, 5, C.coat)
  rect(ctx, x + 12, by - 3, 4, 3, C.coat) // snout
  px(ctx, x + 16, by - 3, C.nose)
  px(ctx, x + 11, by - 4, C.nose) // eye
  rect(ctx, x + 7, by - 4, 2, 6, C.ear) // floppy ear
  px(ctx, x + 8, by + 2, C.ear)
}

/**
 * Standing on the seat, seen from behind, head popping up over the chair back to see the screens.
 * bob: 0/1 head bob while typing. The chair back is drawn on top, so the body shows through the mesh.
 */
export function drawDogBack(ctx: Ctx, bob: number) {
  const cx = CHAIR_X
  const hy = 50 + bob
  // sweater body (mostly behind the mesh)
  rect(ctx, cx - 5, hy + 8, 11, 26, C.sweater)
  for (let i = 0; i < 26; i += 3) px(ctx, cx - 4 + (i % 9), hy + 9 + i, C.sweaterLight)
  rect(ctx, cx - 5, hy + 7, 11, 1, C.collar)
  // head and floppy ears
  rect(ctx, cx - 4, hy, 9, 7, C.coat)
  rect(ctx, cx - 3, hy - 1, 7, 1, C.coat)
  rect(ctx, cx - 2, hy + 7, 5, 1, C.coat)
  rect(ctx, cx - 6, hy + 1, 2, 8, C.ear)
  rect(ctx, cx + 5, hy + 1, 2, 8, C.ear)
  px(ctx, cx - 6, hy + 9, C.ear)
  px(ctx, cx + 6, hy + 9, C.ear)
  px(ctx, cx, hy, C.coatDark)
  // front paws reaching for the keyboard, peeking out on each side
  rect(ctx, cx - 9, hy + 13 + bob, 3, 2, C.coat)
  rect(ctx, cx + 7, hy + 14 - bob, 3, 2, C.coat)
}

// ── The computer desktop we zoom into ───────────────────────

export const ORCAS_ICON = { x: 90, y: 58, w: 14, h: 11 }

function drawFolder(ctx: Ctx, x: number, y: number, withOrca: boolean) {
  rect(ctx, x, y + 1, 6, 2, C.folderDark)
  rect(ctx, x, y + 2, 14, 9, C.folder)
  rect(ctx, x, y + 10, 14, 1, C.folderDark)
  if (withOrca) {
    // a tiny orca on the folder
    rect(ctx, x + 3, y + 5, 8, 3, '#1b1c20')
    px(ctx, x + 7, y + 4, '#1b1c20')
    px(ctx, x + 4, y + 6, '#ffffff')
    px(ctx, x + 11, y + 4, '#1b1c20')
    rect(ctx, x + 4, y + 7, 4, 1, '#ffffff')
  }
}

export function drawDesktop(ctx: Ctx, selected: boolean) {
  // wallpaper: calm ocean bands with little waves
  const bands = ['#1d5683', '#225f8f', '#28699b', '#2e73a6']
  for (let y = 0; y < H; y++) rect(ctx, 0, y, W, 1, bands[Math.min(3, Math.floor(y / 36))])
  for (let y = 30; y < H; y += 18) for (let x = (y / 2) % 16; x < W; x += 16) rect(ctx, x, y, 4, 1, '#3d84b8')
  // menu bar
  rect(ctx, 0, 0, W, 9, '#dfe4ea')
  rect(ctx, 0, 9, W, 1, '#aab3bd')
  drawText(ctx, 'LOGGED IN: BEAN', 4, 2, '#3a414a')
  drawText(ctx, '9:41', W - textWidth('9:41') - 4, 2, '#3a414a')

  // icons down the left
  const label = (t: string, cx: number, y: number, sel = false) => {
    const w = textWidth(t)
    if (sel) rect(ctx, cx - w / 2 - 1, y - 1, w + 2, 7, '#2563eb')
    drawText(ctx, t, Math.round(cx - w / 2), y, '#ffffff')
  }
  // trash
  rect(ctx, 14, 16, 10, 12, '#cfd6dd')
  rect(ctx, 13, 15, 12, 2, '#aeb7c1')
  for (const lx of [16, 19, 22]) rect(ctx, lx, 18, 1, 9, '#9aa4ae')
  label('TRASH', 19, 31)
  // treats (a bone)
  rect(ctx, 14, 46, 10, 3, '#f5ecd9')
  for (const [bx, byy] of [[12, 45], [12, 48], [24, 45], [24, 48]]) rect(ctx, bx, byy, 3, 2, '#f5ecd9')
  label('TREATS', 19, 54)
  // naps (zzz)
  drawText(ctx, 'ZZ', 14, 67, '#e8eef4')
  drawText(ctx, 'Z', 22, 63, '#e8eef4')
  label('NAPS', 19, 76)
  // squirrels folder
  drawFolder(ctx, 12, 86, false)
  label('SQUIRRELS', 19, 99)

  // the orcas folder, front and center
  if (selected) rect(ctx, ORCAS_ICON.x - 2, ORCAS_ICON.y - 1, ORCAS_ICON.w + 4, ORCAS_ICON.h + 2, '#2563eb')
  drawFolder(ctx, ORCAS_ICON.x, ORCAS_ICON.y, true)
  label('ORCAS', ORCAS_ICON.x + ORCAS_ICON.w / 2, ORCAS_ICON.y + 14, selected)
}

/** The dog's paw as a mouse cursor; (x, y) is the toe tip that clicks. */
export function drawPawCursor(ctx: Ctx, x: number, y: number, pressed: boolean) {
  x = Math.round(x)
  y = Math.round(y) + (pressed ? 1 : 0)
  const dark = '#3b2a20'
  const pad = '#f1d7c6'
  for (const [dx, dy] of [[-3, 0], [-1, -1], [1, -1], [3, 0]]) {
    rect(ctx, x + dx - 1, y + dy, 2, 2, dark)
    px(ctx, x + dx - (dx < 0 ? 1 : 0), y + dy, pad)
  }
  rect(ctx, x - 3, y + 3, 6, 4, dark)
  rect(ctx, x - 2, y + 4, 4, 2, pad)
}

/** The orcas window opening: grows from the icon to nearly full screen (p = 0..1). */
export function drawOpeningWindow(ctx: Ctx, p: number) {
  const from = { x: ORCAS_ICON.x, y: ORCAS_ICON.y, w: ORCAS_ICON.w, h: ORCAS_ICON.h }
  const to = { x: 8, y: 14, w: W - 16, h: H - 22 }
  const e = 1 - Math.pow(1 - p, 3)
  const x = Math.round(from.x + (to.x - from.x) * e)
  const y = Math.round(from.y + (to.y - from.y) * e)
  const w = Math.round(from.w + (to.w - from.w) * e)
  const h = Math.round(from.h + (to.h - from.h) * e)
  rect(ctx, x, y, w, h, '#1b1c20')
  rect(ctx, x + 1, y + 1, w - 2, 8, '#dfe4ea')
  rect(ctx, x + 1, y + 9, w - 2, h - 10, '#a9cfe0')
  if (p > 0.6) {
    drawText(ctx, 'ORCAS', x + Math.round((w - textWidth('ORCAS')) / 2), y + 3, '#3a414a')
    rect(ctx, x + 3, y + 3, 4, 4, '#e0605a')
    // a tiny map: land and a few orcas
    rect(ctx, x + 10, y + 20, 30, 18, '#d6e6c9')
    rect(ctx, x + w - 46, y + 30, 36, 40, '#d6e6c9')
    rect(ctx, x + 30, y + h - 30, 40, 18, '#d6e6c9')
    for (const [ox, oy] of [[70, 40], [90, 64], [60, 78]]) {
      rect(ctx, x + ox, y + oy, 7, 3, '#1b1c20')
      px(ctx, x + ox + 3, y + oy - 1, '#1b1c20')
      px(ctx, x + ox + 1, y + oy + 1, '#ffffff')
    }
  }
}

export function drawCaption(ctx: Ctx, text: string) {
  drawText(ctx, text, Math.round((W - textWidth(text)) / 2), 3, C.text)
}
