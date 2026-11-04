// Vercel serverless function: /api/lamp
//
//   GET  /api/lamp?key=<LAMP_SECRET>   called every minute by a scheduler (cron-job.org). When orcas
//        get within about 45 minutes of Seattle, it turns a LIFX bulb blue for 45 minutes, then puts
//        it back exactly as it was.
//   POST /api/lamp  {"password": "..."}  the website's "Back to Natural" button: ends the blue early.
//        Needs LAMP_PASSWORD; after 10 wrong tries in an hour it stops accepting tries for that hour.
//
// Settings (Vercel → Settings → Environment Variables):
//   LIFX_TOKEN     personal access token from cloud.lifx.com (required)
//   LAMP_SECRET    any long random text; the scheduler must send it as ?key=... (required)
//   LAMP_PASSWORD  password for the website's "Back to Natural" button (optional)
//   LIFX_SELECTOR  which bulb(s) to control, e.g. "label:Japandi lamp" (default: all LIFX bulbs)
//   KV_REST_API_URL / KV_REST_API_TOKEN  the lamp's memory (any prefix works): a free Upstash Redis
//                  store, added automatically when you connect one under Vercel → Storage
//
// Testing: &test=blue (or approaching/here) turns it blue now; &test=normal (or none) puts it back.
// &minutes=2 shortens the blue time while testing.

import { createHash, timingSafeEqual } from 'node:crypto'
import { BLUE_COLOR, colorString, decideLamp, isBlue, wantsBlue, type BulbState, type DecideOptions, type LampMemory } from '../src/lib/lamp.js'
import type { Alert } from '../src/lib/alert.js'

const LIFX = 'https://api.lifx.com/v1/lights'
const MAX_WRONG_PASSWORDS = 10 // per hour
const noStore = { 'Cache-Control': 'no-store' }

/** A hiccup in someone else's service (timeout, outage, rate limit): skip this minute, try again next. */
class Transient extends Error {}

// cron-job.org gives up after 30 s, so the whole check has to finish well before that.
const BUDGET_MS = 22_000
let deadline = Date.now() + BUDGET_MS
const timeLeft = (cap: number) => Math.max(500, Math.min(cap, deadline - Date.now()))

/** fetch with a time limit; network errors and timeouts count as transient. */
async function fetchSoon(url: string | URL, init: RequestInit, capMs: number): Promise<Response> {
  try {
    return await fetch(url, { ...init, signal: AbortSignal.timeout(timeLeft(capMs)) })
  } catch (err) {
    throw new Transient(`${new URL(url).host} didn't answer in time (${err instanceof Error ? err.name : 'error'})`)
  }
}

async function lifx(path: string, init: RequestInit, token: string) {
  const req: RequestInit = { ...init, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(init.headers ?? {}) } }
  for (let attempt = 1; ; attempt++) {
    let res: Response
    try {
      res = await fetchSoon(`${LIFX}/${path}`, req, 7000)
    } catch (err) {
      if (attempt < 2 && deadline - Date.now() > 8000) continue // one quick retry (setting a color is safe to repeat)
      throw err
    }
    const text = await res.text()
    if (res.ok) return text ? JSON.parse(text) : null
    const msg = `LIFX ${init.method ?? 'GET'} ${path} failed: HTTP ${res.status} ${text.slice(0, 200)}`
    const temporary = res.status === 429 || res.status >= 500
    if (temporary && attempt < 2 && deadline - Date.now() > 8000) {
      await new Promise((r) => setTimeout(r, 800))
      continue
    }
    throw temporary ? new Transient(msg) : new Error(msg) // 401 (bad token) or 404 (no such bulb) are real problems
  }
}

/** Upstash settings: KV_REST_API_URL etc., or the same with any other prefix chosen when connecting. */
function redisEnv(suffix: string, fallback: string): string | undefined {
  const env = process.env
  if (env[`KV${suffix}`]) return env[`KV${suffix}`]
  if (env[fallback]) return env[fallback]
  const key = Object.keys(env).find((k) => k.endsWith(suffix) && !k.includes('READ_ONLY') && env[k])
  return key ? env[key] : undefined
}

/** One Redis command over Upstash's REST API. */
async function redis(command: (string | number)[]): Promise<unknown> {
  const url = redisEnv('_REST_API_URL', 'UPSTASH_REDIS_REST_URL')
  const token = redisEnv('_REST_API_TOKEN', 'UPSTASH_REDIS_REST_TOKEN')
  if (!url || !token) throw new Error('The lamp needs its memory: connect a free Upstash Redis store under Vercel → Storage, then redeploy')
  const res = await fetchSoon(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(command),
  }, 5000)
  const body = (await res.json().catch(() => ({}))) as { result?: unknown; error?: string }
  if (res.status === 429 || res.status >= 500) throw new Transient(`Lamp memory (Redis) is busy: HTTP ${res.status}`)
  if (!res.ok || body.error) throw new Error(`Lamp memory (Redis) failed: ${body.error ?? `HTTP ${res.status}`}`)
  return body.result
}

function selectorInfo() {
  const raw = process.env.LIFX_SELECTOR || 'all'
  // keep ":" and "," as-is (e.g. label:Japandi lamp) and encode the rest, like spaces
  const selector = encodeURIComponent(raw).replace(/%3A/gi, ':').replace(/%2C/gi, ',')
  return { raw, selector, memoryKey: `lamp:${raw}`, failsKey: `lamp-password-fails:${raw}` }
}

type Outcome = { ok: true; lamp: string; did: string; why: string; blueUntil?: string } | { ok: false; error: string }

/** Reads the bulb (and memory when needed), decides, and acts. */
async function runLamp(token: string, trigger: boolean, options: DecideOptions): Promise<Outcome> {
  const { raw, selector, memoryKey } = selectorInfo()
  const lights = (await lifx(selector, { method: 'GET' }, token)) as Array<{
    label: string
    connected: boolean
    power: 'on' | 'off'
    brightness: number
    color: { hue: number; saturation: number; kelvin: number }
  }>
  const light = lights.find((l) => l.connected) ?? lights[0]
  if (!light) return { ok: false, error: `No LIFX bulb found for "${raw}"` }
  if (!light.connected) return { ok: false, error: `${light.label} is offline` }
  const bulb: BulbState = {
    power: light.power,
    hue: light.color.hue,
    saturation: light.color.saturation,
    kelvin: light.color.kelvin,
    brightness: light.brightness,
  }

  // The lamp's memory is only needed when something could happen (keeps Redis use tiny).
  let memory: LampMemory | null = null
  if (options.test || trigger || isBlue(bulb)) {
    const saved = await redis(['GET', memoryKey])
    memory = typeof saved === 'string' ? (JSON.parse(saved) as LampMemory) : null
  }

  const action = decideLamp(trigger, bulb, memory, new Date(), options)
  const save = (m: LampMemory) => redis(['SET', memoryKey, JSON.stringify(m), 'EX', 3 * 24 * 3600])
  if (action.kind === 'blue') {
    await save(action.memory) // remember the current setting first, so it can always be put back
    try {
      await lifx(`${selector}/state`, { method: 'PUT', body: JSON.stringify({ power: 'on', color: BLUE_COLOR, duration: 2 }) }, token)
    } catch (err) {
      // the bulb didn't change: undo the memory so the next minute's check tries again
      await (memory ? save(memory) : redis(['DEL', memoryKey])).catch(() => {})
      throw err
    }
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
  return {
    ok: true,
    lamp: light.label,
    did: action.kind,
    why: action.reason,
    ...('memory' in action && !action.memory.done ? { blueUntil: action.memory.until } : {}),
  }
}

const TEST_BLUE = ['blue', 'approaching', 'here']
const TEST_NORMAL = ['normal', 'none', 'off']

/** The every-minute check (and tests). */
export async function GET(request: Request): Promise<Response> {
  deadline = Date.now() + BUDGET_MS
  const url = new URL(request.url)
  const secret = process.env.LAMP_SECRET
  const token = process.env.LIFX_TOKEN
  if (!secret || !token) {
    return Response.json({ ok: false, error: 'LAMP_SECRET and LIFX_TOKEN must be set in Vercel' }, { status: 503 })
  }
  if (url.searchParams.get('key') !== secret) {
    return Response.json({ ok: false, error: 'Wrong or missing key' }, { status: 401 })
  }

  const testParam = (url.searchParams.get('test') ?? '').toLowerCase()
  const test = TEST_BLUE.includes(testParam) ? 'blue' : TEST_NORMAL.includes(testParam) ? 'normal' : undefined
  const testMinutes = Number(url.searchParams.get('minutes'))
  const holdMinutes = test === 'blue' && testMinutes >= 1 && testMinutes <= 60 ? testMinutes : undefined

  try {
    // Are orcas within about 45 minutes? (Reuses /api/alert, which the CDN caches for a minute.)
    let trigger = false
    let alertInfo: Pick<Alert, 'state' | 'etaMinutes' | 'title'> | null = null
    if (!test) {
      let res: Response | null = null
      let body: Partial<Alert> & { ok?: boolean } = {}
      try {
        res = await fetchSoon(new URL('/api/alert', url), { headers: { Accept: 'application/json' } }, 12_000)
        body = (await res.json()) as Partial<Alert> & { ok?: boolean }
      } catch {
        res = null
      }
      if (!res) return Response.json({ ok: false, skipped: true, error: "Couldn't check the alert this minute; leaving the lamp alone" }, { headers: noStore })
      if (!res.ok || body.ok === false || !body.state) {
        return Response.json({ ok: false, error: "Couldn't check the alert; leaving the lamp alone" }, { headers: noStore })
      }
      alertInfo = { state: body.state, etaMinutes: body.etaMinutes ?? null, title: body.title ?? '' }
      trigger = wantsBlue(alertInfo)
    }
    const outcome = await runLamp(token, trigger, { test, holdMinutes })
    return Response.json({ ...outcome, ...(alertInfo ? { alert: alertInfo } : {}) }, { headers: noStore })
  } catch (err) {
    // A brief outage elsewhere isn't worth an email: report it, and the next minute's check tries again.
    if (err instanceof Transient) return Response.json({ ok: false, skipped: true, error: err.message }, { headers: noStore })
    return Response.json({ ok: false, error: String(err instanceof Error ? err.message : err) }, { status: 502, headers: noStore })
  }
}

function samePassword(given: string, expected: string): boolean {
  const a = createHash('sha256').update(given).digest()
  const b = createHash('sha256').update(expected).digest()
  return timingSafeEqual(a, b)
}

/** The website's "Back to Natural" button. */
export async function POST(request: Request): Promise<Response> {
  deadline = Date.now() + BUDGET_MS
  const password = process.env.LAMP_PASSWORD
  const token = process.env.LIFX_TOKEN
  if (!password || !token) {
    return Response.json({ ok: false, error: 'The lamp button is not set up yet (LAMP_PASSWORD in Vercel)' }, { status: 503, headers: noStore })
  }
  const body = (await request.json().catch(() => ({}))) as { password?: unknown }
  const given = typeof body.password === 'string' ? body.password : ''

  try {
    const { failsKey } = selectorInfo()
    const fails = Number(await redis(['GET', failsKey])) || 0
    if (fails >= MAX_WRONG_PASSWORDS) {
      return Response.json({ ok: false, error: 'Too many wrong tries. Try again in an hour.' }, { status: 429, headers: noStore })
    }
    if (!given || !samePassword(given, password)) {
      const count = Number(await redis(['INCR', failsKey]))
      if (count === 1) await redis(['EXPIRE', failsKey, 3600])
      return Response.json({ ok: false, error: 'Wrong password' }, { status: 401, headers: noStore })
    }
    const outcome = await runLamp(token, false, { revert: true })
    return Response.json(outcome, { status: outcome.ok ? 200 : 502, headers: noStore })
  } catch (err) {
    return Response.json({ ok: false, error: String(err instanceof Error ? err.message : err) }, { status: 502, headers: noStore })
  }
}
