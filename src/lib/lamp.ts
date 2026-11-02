// Decides what the whale lamp (a LIFX bulb) should do for the current orca alert.
// Kept free of network calls so it can be tested on its own; api/lamp.ts does the calls.
// Imports use .js extensions so Node can run this inside the Vercel function.
import type { AlertState } from './alert.js'

/** Lamp colors for each alert level (hue in degrees, LIFX style). */
export const LAMP_COLORS: Record<Exclude<AlertState, 'none'>, { hue: number; name: string; lifx: string }> = {
  watch: { hue: 35, name: 'amber', lifx: 'hue:35 saturation:1.0' },
  approaching: { hue: 185, name: 'cyan', lifx: 'hue:185 saturation:1.0' },
  here: { hue: 225, name: 'blue', lifx: 'hue:225 saturation:1.0' },
}
/** What the bulb goes back to when the alert ends. */
export const NORMAL_COLOR = 'kelvin:2700 saturation:0'

const LEVEL: Record<AlertState, number> = { none: 0, watch: 1, approaching: 2, here: 3 }

export interface BulbState {
  power: 'on' | 'off'
  hue: number
  saturation: number
}

export type LampAction =
  | { kind: 'nothing'; reason: string }
  | { kind: 'show'; state: Exclude<AlertState, 'none'>; pulse: boolean; reason: string }
  | { kind: 'restore'; keepOff: boolean; reason: string }

/** Which alert color (if any) the bulb is showing right now. */
export function alertColorOnBulb(bulb: BulbState): Exclude<AlertState, 'none'> | null {
  if (bulb.saturation < 0.8) return null
  for (const [state, c] of Object.entries(LAMP_COLORS)) {
    const diff = Math.abs(((bulb.hue - c.hue + 540) % 360) - 180)
    if (diff <= 6) return state as Exclude<AlertState, 'none'>
  }
  return null
}

/**
 * The bulb's own color tells us whether we're the ones who colored it, so this works without
 * storing anything between checks:
 *  - Alert on, bulb not showing an alert color: show it (and pulse to get attention).
 *  - Alert on, bulb showing a different alert color: switch (pulse if it got more urgent).
 *  - Alert on, bulb switched off while showing this alert's color: someone turned it off, leave it.
 *  - Alert over, bulb still showing an alert color: back to warm white (staying off if it's off).
 *  - Otherwise leave the bulb alone, so normal use (e.g. "Hey Google") isn't overridden.
 */
export function decideLamp(alert: AlertState, bulb: BulbState): LampAction {
  const showing = alertColorOnBulb(bulb)
  if (alert === 'none') {
    if (showing) return { kind: 'restore', keepOff: bulb.power === 'off', reason: 'Alert ended; back to warm white' }
    return { kind: 'nothing', reason: 'No alert, and the bulb is in normal use' }
  }
  if (showing === alert) {
    if (bulb.power === 'off') return { kind: 'nothing', reason: 'Turned off during this alert; leaving it off' }
    return { kind: 'nothing', reason: `Already showing ${LAMP_COLORS[alert].name}` }
  }
  const moreUrgent = !showing || LEVEL[alert] > LEVEL[showing]
  return {
    kind: 'show',
    state: alert,
    pulse: moreUrgent,
    reason: showing ? `Alert changed from ${showing} to ${alert}` : `New alert: ${alert}`,
  }
}
