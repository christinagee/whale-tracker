// Decides what the whale lamp (a LIFX bulb) should do. Kept free of network calls so it can be
// tested on its own; api/lamp.ts reads the bulb and the lamp's memory, then carries out the action.
// Imports use .js extensions so Node can run this inside the Vercel function.
//
// The rule: when orcas get within about 45 minutes of Seattle, the lamp turns blue for 45 minutes,
// then goes back to exactly what it was showing before (e.g. the LIFX "Natural" white).
import type { Alert } from './alert.js'

export const LAMP_CONFIG = {
  /** Turn blue once the estimated arrival is this close (or the orcas are already here). */
  triggerEtaMinutes: 45,
  /** How long the lamp stays blue. */
  holdMinutes: 45,
  /** The same orcas keep the alert going for a while; only light up again after this long without one. */
  rearmAfterQuietMinutes: 60,
  /** LIFX's "blue" (hue in degrees). Brightness is left as it was. */
  blueHue: 240,
}

export const BLUE_COLOR = `hue:${LAMP_CONFIG.blueHue} saturation:1.0`

export interface BulbState {
  power: 'on' | 'off'
  hue: number
  saturation: number
  kelvin: number
  brightness: number
}

/** What the lamp remembers between checks (kept in Redis). */
export interface LampMemory {
  /** When it turned blue. */
  startedAt: string
  /** When it goes back. */
  until: string
  /** The last time the alert called for blue (to tell new orcas from the same ones). */
  lastTriggerAt: string
  /** What the bulb looked like before it turned blue. */
  previous: BulbState
  /** True once it has gone back (or someone changed the lamp themselves). */
  done: boolean
}

export type LampAction =
  | { kind: 'nothing'; reason: string }
  | { kind: 'blue'; memory: LampMemory; reason: string }
  | { kind: 'restore'; to: BulbState; keepOff: boolean; memory: LampMemory; reason: string }
  | { kind: 'remember'; memory: LampMemory; reason: string }
  | { kind: 'forget'; reason: string }

/** Does this alert call for blue? Orcas about 45 minutes out, or already here. */
export function wantsBlue(alert: Pick<Alert, 'state' | 'etaMinutes'>, config = LAMP_CONFIG): boolean {
  if (alert.state === 'here') return true
  return alert.state === 'approaching' && alert.etaMinutes !== null && alert.etaMinutes <= config.triggerEtaMinutes
}

/** Is the bulb showing the lamp's blue? (Color only; it may have been switched off.) */
export function isBlue(bulb: Pick<BulbState, 'hue' | 'saturation'>, config = LAMP_CONFIG): boolean {
  const diff = Math.abs(((bulb.hue - config.blueHue + 540) % 360) - 180)
  return bulb.saturation >= 0.9 && diff <= 8
}

/** The LIFX color string that puts the bulb back exactly as it was. */
export function colorString(b: BulbState): string {
  const r = (n: number, d: number) => Number(n.toFixed(d))
  return `hue:${r(b.hue, 2)} saturation:${r(b.saturation, 4)} kelvin:${Math.round(b.kelvin)} brightness:${r(b.brightness, 4)}`
}

const minutes = (n: number) => n * 60_000

export interface DecideOptions {
  /** 'blue' starts (or restarts) the blue time now; 'normal' goes back now. Used for testing. */
  test?: 'blue' | 'normal'
  /** Override the hold time (testing). */
  holdMinutes?: number
  /** Someone pressed "Back to Natural" on the website. */
  revert?: boolean
}

/**
 * - Orcas within ~45 minutes: turn blue (remembering the current setting), unless this lamp
 *   already lit up for these orcas.
 * - 45 minutes later: go back to the remembered setting. If someone switched the lamp off in the
 *   meantime, the setting comes back but it stays off.
 * - If someone changes the color while it's blue, it's theirs again: nothing is undone later.
 * - "Back to Natural" on the website (revert) ends the blue early; the same orcas won't relight it.
 * - Otherwise the lamp is left alone, so normal use (the LIFX app, Google Home) is never overridden.
 */
export function decideLamp(
  trigger: boolean,
  bulb: BulbState,
  memory: LampMemory | null,
  now: Date,
  options: DecideOptions = {},
  config = LAMP_CONFIG,
): LampAction {
  const t = now.getTime()
  const iso = now.toISOString()
  const hold = minutes(options.holdMinutes ?? config.holdMinutes)
  const active = memory && !memory.done ? memory : null
  const seen = (m: LampMemory): LampMemory => (trigger ? { ...m, lastTriggerAt: iso } : m)

  if (options.revert) {
    // Back to normal now. The memory is kept, so the same orcas won't turn it blue again.
    if (active && isBlue(bulb)) {
      return { kind: 'restore', to: active.previous, keepOff: bulb.power === 'off', memory: { ...active, done: true }, reason: 'Back to normal' }
    }
    if (active) return { kind: 'remember', memory: { ...active, done: true }, reason: 'The lamp was already changed by hand' }
    return { kind: 'nothing', reason: 'The lamp is already on its normal setting' }
  }

  if (options.test === 'normal') {
    if (active && isBlue(bulb)) {
      return { kind: 'restore', to: active.previous, keepOff: bulb.power === 'off', memory: { ...active, done: true }, reason: 'Test: back to normal' }
    }
    return { kind: 'forget', reason: 'Test: lamp memory cleared (it was not blue)' }
  }

  if (options.test === 'blue') {
    const previous = active && isBlue(bulb) ? active.previous : bulb
    return {
      kind: 'blue',
      memory: { startedAt: iso, until: new Date(t + hold).toISOString(), lastTriggerAt: iso, previous, done: false },
      reason: `Test: blue for ${Math.round(hold / 60_000)} min`,
    }
  }

  if (active) {
    if (!isBlue(bulb)) {
      return { kind: 'remember', memory: seen({ ...active, done: true }), reason: 'Someone changed the lamp while it was blue; leaving it be' }
    }
    if (t >= new Date(active.until).getTime()) {
      const keepOff = bulb.power === 'off'
      return {
        kind: 'restore',
        to: active.previous,
        keepOff,
        memory: seen({ ...active, done: true }),
        reason: keepOff ? `${config.holdMinutes} minutes are up; setting restored (lamp stays off)` : `${config.holdMinutes} minutes are up; back to normal`,
      }
    }
    const left = Math.ceil((new Date(active.until).getTime() - t) / 60_000)
    if (trigger) return { kind: 'remember', memory: seen(active), reason: `Blue for ${left} more min` }
    return { kind: 'nothing', reason: `Blue for ${left} more min` }
  }

  if (!trigger) return { kind: 'nothing', reason: `No orcas within ${config.triggerEtaMinutes} minutes of Seattle` }

  if (memory && t - new Date(memory.lastTriggerAt).getTime() < minutes(config.rearmAfterQuietMinutes)) {
    return { kind: 'remember', memory: seen(memory), reason: 'Already lit up for these orcas' }
  }

  return {
    kind: 'blue',
    memory: { startedAt: iso, until: new Date(t + hold).toISOString(), lastTriggerAt: iso, previous: bulb, done: false },
    reason: `Orcas within ${config.triggerEtaMinutes} minutes of Seattle: blue for ${Math.round(hold / 60_000)} min`,
  }
}
