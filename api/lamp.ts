// Vercel serverless function: GET /api/lamp?key=<LAMP_SECRET>
// Called every minute by a scheduler (cron-job.org). Checks the orca alert and sets a
// LIFX bulb's color to match: amber = watch, cyan = approaching, blue = here.
//
// Settings (Vercel → Settings → Environment Variables):
//   LIFX_TOKEN     personal access token from cloud.lifx.com (required)
//   LAMP_SECRET    any long random text; the scheduler must send it as ?key=... (required)
//   LIFX_SELECTOR  which bulb(s) to control, e.g. "label:Whale Lamp" (default: all LIFX bulbs)
//
// Testing: add &test=watch, &test=approaching, &test=here or &test=none to pretend.

import { decideLamp, LAMP_COLORS, NORMAL_COLOR, type BulbState } from '../src/lib/lamp.js'
import type { AlertState } from '../src/lib/alert.js'

const LIFX = 'https://api.lifx.com/v1/lights'
const STATES: AlertState[] = ['none', 'watch', 'approaching', 'here']

async function lifx(path: string, init: RequestInit, token: string) {
  const res = await fetch(`${LIFX}/${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(init.headers ?? {}) },
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`LIFX ${init.method ?? 'GET'} ${path} failed: HTTP ${res.status} ${text.slice(0, 200)}`)
  return text ? JSON.parse(text) : null
}

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url)
  const secret = process.env.LAMP_SECRET
  const token = process.env.LIFX_TOKEN
  if (!secret || !token) {
    return Response.json({ ok: false, error: 'LAMP_SECRET and LIFX_TOKEN must be set in Vercel' }, { status: 503 })
  }
  if (url.searchParams.get('key') !== secret) {
    return Response.json({ ok: false, error: 'Wrong or missing key' }, { status: 401 })
  }
  // keep ":" and "," as-is (e.g. label:Whale Lamp) and encode the rest, like spaces
  const selector = encodeURIComponent(process.env.LIFX_SELECTOR || 'all').replace(/%3A/gi, ':').replace(/%2C/gi, ',')
  const noStore = { 'Cache-Control': 'no-store' }

  try {
    // 1. What's the alert? (Reuses /api/alert, which the CDN caches for a minute.)
    const test = url.searchParams.get('test') as AlertState | null
    let alert: AlertState
    if (test && STATES.includes(test)) {
      alert = test
    } else {
      const res = await fetch(new URL('/api/alert', url), { headers: { Accept: 'application/json' } })
      const body = (await res.json()) as { ok?: boolean; state?: AlertState }
      if (!res.ok || body.ok === false || !body.state) {
        return Response.json({ ok: false, error: "Couldn't check the alert; leaving the bulb alone" }, { headers: noStore })
      }
      alert = body.state
    }

    // 2. What's the bulb doing?
    const lights = (await lifx(selector, { method: 'GET' }, token)) as Array<{
      label: string
      connected: boolean
      power: 'on' | 'off'
      color: { hue: number; saturation: number }
    }>
    const light = lights.find((l) => l.connected) ?? lights[0]
    if (!light) return Response.json({ ok: false, error: 'No LIFX bulb found' }, { headers: noStore })
    if (!light.connected) return Response.json({ ok: false, error: `${light.label} is offline` }, { headers: noStore })
    const bulb: BulbState = { power: light.power, hue: light.color.hue, saturation: light.color.saturation }

    // 3. Decide and act.
    const action = decideLamp(alert, bulb)
    if (action.kind === 'show') {
      const color = LAMP_COLORS[action.state].lifx
      await lifx(`${selector}/state`, { method: 'PUT', body: JSON.stringify({ power: 'on', color, duration: 1 }) }, token)
      if (action.pulse) {
        // a few gentle pulses to catch someone's eye, then it settles on the alert color
        await lifx(
          `${selector}/effects/breathe`,
          { method: 'POST', body: JSON.stringify({ color, from_color: NORMAL_COLOR, period: 2, cycles: 5, persist: false, power_on: true }) },
          token,
        )
      }
    } else if (action.kind === 'restore') {
      await lifx(
        `${selector}/state`,
        { method: 'PUT', body: JSON.stringify({ color: NORMAL_COLOR, duration: 2, ...(action.keepOff ? {} : { power: 'on' }) }) },
        token,
      )
    }

    return Response.json({ ok: true, alert, bulb: light.label, action }, { headers: noStore })
  } catch (err) {
    return Response.json({ ok: false, error: String(err instanceof Error ? err.message : err) }, { status: 502, headers: noStore })
  }
}
