// Vercel serverless function: GET /api/alert
// One small answer for a lamp (or anything else) to poll: are orcas heading toward Seattle?
//
//   /api/alert                  -> JSON: { level, state, color, effect, title, message, etaMinutes, ... }
//   /api/alert?format=text      -> just the level digit: 0 none, 1 watch, 2 approaching, 3 here
//   /api/alert?test=approaching -> pretend, for testing a lamp (none | watch | approaching | here)
//
// "ok" is false when the sightings feed couldn't be reached, so a lamp can tell
// "all quiet" apart from "couldn't check".

import { computeAlert, type Alert, type AlertState } from '../src/lib/alert.js'
import { parseSightingRows, type Sighting } from '../src/lib/sightings.js'
import { fetchDetections, fetchHydrophones } from '../src/api/orcasound.js'

const ACARTIA_URL = 'https://acartia.io/api/v1/sightings/current'

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('timeout')), ms)
  })
  try {
    return await Promise.race([promise, timeout])
  } finally {
    clearTimeout(timer)
  }
}

async function fetchSightings(): Promise<Sighting[]> {
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (process.env.ACARTIA_TOKEN) headers.Authorization = `Bearer ${process.env.ACARTIA_TOKEN}`
  const res = await fetch(ACARTIA_URL, { headers })
  if (!res.ok) throw new Error(`Acartia responded with ${res.status}`)
  return parseSightingRows(await res.json())
}

const TEST_ALERTS: Record<AlertState, Partial<Alert>> = {
  none: {},
  watch: { title: 'TEST: Orcas in Puget Sound', message: 'This is a test alert.' },
  approaching: { title: 'TEST: Orcas heading toward Seattle', message: 'This is a test alert.', etaMinutes: 60 },
  here: { title: 'TEST: Orcas in Seattle waters!', message: 'This is a test alert.', etaMinutes: 0 },
}
const LEVELS: Record<AlertState, 0 | 1 | 2 | 3> = { none: 0, watch: 1, approaching: 2, here: 3 }
const COLORS: Record<AlertState, [string, Alert['effect']]> = {
  none: ['#000000', 'off'],
  watch: ['#f59e0b', 'breathe'],
  approaching: ['#06b6d4', 'pulse'],
  here: ['#3b82f6', 'solid'],
}

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url)
  const test = url.searchParams.get('test') as AlertState | null
  let alert: Alert
  let ok = true
  const problems: string[] = []

  if (test && test in LEVELS) {
    const [color, effect] = COLORS[test]
    alert = {
      ...computeAlert([]),
      ...TEST_ALERTS[test],
      level: LEVELS[test],
      state: test,
      color,
      effect,
    }
  } else {
    const [sightings, hydrophones, detections] = await Promise.allSettled([
      withTimeout(fetchSightings(), 8000),
      withTimeout(fetchHydrophones(), 8000),
      withTimeout(fetchDetections(), 8000),
    ])
    if (sightings.status === 'rejected') {
      ok = false
      problems.push(`sightings: ${sightings.reason}`)
    }
    if (hydrophones.status === 'rejected') problems.push(`hydrophones: ${hydrophones.reason}`)
    if (detections.status === 'rejected') problems.push(`detections: ${detections.reason}`)
    alert = computeAlert(
      sightings.status === 'fulfilled' ? sightings.value : [],
      detections.status === 'fulfilled' ? detections.value : [],
      hydrophones.status === 'fulfilled' ? hydrophones.value : [],
    )
  }

  const cache = test ? 'no-store' : 's-maxage=60, stale-while-revalidate=60'
  if (url.searchParams.get('format') === 'text') {
    return new Response(String(alert.level), { headers: { 'Content-Type': 'text/plain', 'Cache-Control': cache } })
  }
  const body = { ok, ...alert, ...(problems.length ? { problems } : {}) }
  return Response.json(body, {
    headers: { 'Cache-Control': cache, 'Access-Control-Allow-Origin': '*' },
  })
}
