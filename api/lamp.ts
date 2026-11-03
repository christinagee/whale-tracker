// Vercel serverless function: GET /api/lamp?key=<LAMP_SECRET>
// Called every minute by a scheduler (cron-job.org). When orcas get within about 30 minutes of
// Seattle, it turns a LIFX bulb blue for 30 minutes, then puts it back exactly as it was.
//
// Settings (Vercel → Settings → Environment Variables):
//   LIFX_TOKEN     personal access token from cloud.lifx.com (required)
//   LAMP_SECRET    any long random text; the scheduler must send it as ?key=... (required)
//   LIFX_SELECTOR  which bulb(s) to control, e.g. "label:Japandi lamp" (default: all LIFX bulbs)
//   KV_REST_API_URL / KV_REST_API_TOKEN  the lamp's memory: a free Upstash Redis store, added
//                  automatically when you connect one under Vercel → Storage
//                  (UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN also work)
//
// Testing: &test=blue (or approaching/here) turns it blue now; &test=normal (or none) puts it back.
// &minutes=2 shortens the blue time while testing.

import { BLUE_COLOR, colorString, decideLamp, isBlue, wantsBlue, type BulbState, type LampMemory } from '../src/lib/lamp.js'
import type { Alert } from '../src/lib/alert.js'

const LIFX = 'https://api.lifx.com/v1/lights'

async function lifx(path: string, init: RequestInit, token: string) {
  const res = await fetch(`${LIFX}/${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(init.headers ?? {}) },
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`LIFX ${init.method ?? 'GET'} ${path} failed: HTTP ${res.status} ${text.slice(0, 200)}`)
  return text ? JSON.parse(text) : null
}

/** One Redis command over Upstash's REST API. */
async function redis(command: (string | number)[]): Promise<unknown> {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) throw new Error('The lamp needs its memory: connect a free Upstash Redis store under Vercel → Storage, then redeploy')
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(command),
  })
  const body = (await res.json().catch(() => ({}))) as { result?: unknown; error?: string }
  if (!res.ok || body.error) throw new Error(`Lamp memory (Redis) failed: ${body.error ?? `HTTP ${res.status}`}`)
  return body.result
}

const TEST_BLUE = ['blue', 'approaching', 'here']
const TEST_NORMAL = ['normal', 'none', 'off']

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
  const rawSelector = process.env.LIFX_SELECTOR || 'all'
  // keep ":" and "," as-is (e.g. label:Japandi lamp) and encode the rest, like spaces
  const selector = encodeURIComponent(rawSelector).replace(/%3A/gi, ':').replace(/%2C/gi, ',')
  const memoryKey = `lamp:${rawSelector}`
  const noStore = { 'Cache-Control': 'no-store' }

  const testParam = (url.searchParams.get('test') ?? '').toLowerCase()
  const test = TEST_BLUE.includes(testParam) ? 'blue' : TEST_NORMAL.includes(testParam) ? 'normal' : undefined
  const testMinutes = Number(url.searchParams.get('minutes'))
  const holdMinutes = test === 'blue' && testMinutes >= 1 && testMinutes <= 30 ? testMinutes : undefined

  try {
    // 1. Are orcas within about 30 minutes? (Reuses /api/alert, which the CDN caches for a minute.)
    let trigger = false
    let alertInfo: Pick<Alert, 'state' | 'etaMinutes' | 'title'> | null = null
    if (!test) {
      const res = await fetch(new URL('/api/alert', url), { headers: { Accept: 'application/json' } })
      const body = (await res.json()) as Partial<Alert> & { ok?: boolean }
      if (!res.ok || body.ok === false || !body.state) {
        return Response.json({ ok: false, error: "Couldn't check the alert; leaving the lamp alone" }, { headers: noStore })
      }
      alertInfo = { state: body.state, etaMinutes: body.etaMinutes ?? null, title: body.title ?? '' }
      trigger = wantsBlue(alertInfo)
    }

    // 2. What's the bulb doing?
    const lights = (await lifx(selector, { method: 'GET' }, token)) as Array<{
      label: string
      connected: boolean
      power: 'on' | 'off'
      brightness: number
      color: { hue: number; saturation: number; kelvin: number }
    }>
    const light = lights.find((l) => l.connected) ?? lights[0]
    if (!light) return Response.json({ ok: false, error: `No LIFX bulb found for "${rawSelector}"` }, { headers: noStore })
    if (!light.connected) return Response.json({ ok: false, error: `${light.label} is offline` }, { headers: noStore })
    const bulb: BulbState = {
      power: light.power,
      hue: light.color.hue,
      saturation: light.color.saturation,
      kelvin: light.color.kelvin,
      brightness: light.brightness,
    }

    // 3. The lamp's memory is only needed when something could happen (keeps Redis use tiny).
    let memory: LampMemory | null = null
    if (test || trigger || isBlue(bulb)) {
      const saved = await redis(['GET', memoryKey])
      memory = typeof saved === 'string' ? (JSON.parse(saved) as LampMemory) : null
    }

    // 4. Decide and act.
    const action = decideLamp(trigger, bulb, memory, new Date(), { test, holdMinutes })
    const save = (m: LampMemory) => redis(['SET', memoryKey, JSON.stringify(m), 'EX', 3 * 24 * 3600])
    if (action.kind === 'blue') {
      await save(action.memory) // remember the current setting first, so it can always be put back
      await lifx(`${selector}/state`, { method: 'PUT', body: JSON.stringify({ power: 'on', color: BLUE_COLOR, duration: 2 }) }, token)
    } else if (action.kind === 'restore') {
      const state: Record<string, unknown> = { color: colorString(action.to), duration: 3 }
      if (!action.keepOff) state.power = action.to.power
      await lifx(`${selector}/state`, { method: 'PUT', body: JSON.stringify(state) }, token)
      await save(action.memory)
    } else if (action.kind === 'remember') {
      await save(action.memory)
    } else if (action.kind === 'forget') {
      await redis(['DEL', memoryKey])
    }

    return Response.json(
      {
        ok: true,
        lamp: light.label,
        did: action.kind,
        why: action.reason,
        ...(alertInfo ? { alert: alertInfo } : {}),
        ...('memory' in action && !action.memory.done ? { blueUntil: action.memory.until } : {}),
      },
      { headers: noStore },
    )
  } catch (err) {
    return Response.json({ ok: false, error: String(err instanceof Error ? err.message : err) }, { status: 502, headers: noStore })
  }
}
