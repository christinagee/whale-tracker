// Vercel serverless function: GET /api/boats
// Listens to aisstream.io's live AIS feed for the whale-watch fleet for up to
// ~25 seconds and returns the latest position of every boat heard. The API key
// (AISSTREAM_API_KEY) stays on the server. The CDN caches the answer for a
// minute so the feed is opened at most about once a minute.

import { parseAisMessage, type BoatReport } from '../src/lib/ais.js'
import { WHALE_WATCH_FLEET } from '../src/data/whaleWatchFleet.js'

const STREAM_URL = process.env.AISSTREAM_URL || 'wss://stream.aisstream.io/v0/stream'
const LISTEN_MS = 25_000
// Salish Sea and approaches: [south-west, north-east] corners as [lat, lng].
const FLEET_MMSIS = new Set(WHALE_WATCH_FLEET.map((b) => b.mmsi))
const BOUNDING_BOX = [
  [46.9, -125.6],
  [50.3, -122.0],
]

function listen(apiKey: string): Promise<{ boats: Map<string, BoatReport>; error: string | null }> {
  return new Promise((resolve) => {
    const boats = new Map<string, BoatReport>()
    const names = new Map<string, string>()
    let error: string | null = null
    let done = false
    let socket: WebSocket

    const finish = () => {
      if (done) return
      done = true
      clearTimeout(timer)
      try {
        socket.close()
      } catch {
        // already closed
      }
      for (const [mmsi, name] of names) {
        const b = boats.get(mmsi)
        if (b && !b.name) b.name = name
      }
      resolve({ boats, error })
    }
    const timer = setTimeout(finish, LISTEN_MS)

    try {
      socket = new WebSocket(STREAM_URL)
    } catch (err) {
      error = `Couldn't connect: ${err}`
      return finish()
    }

    socket.addEventListener('open', () => {
      socket.send(
        JSON.stringify({
          APIKey: apiKey,
          BoundingBoxes: [BOUNDING_BOX],
          FiltersShipMMSI: WHALE_WATCH_FLEET.map((b) => b.mmsi),
          FilterMessageTypes: ['PositionReport', 'StandardClassBPositionReport', 'ExtendedClassBPositionReport', 'ShipStaticData', 'StaticDataReport'],
        }),
      )
    })
    socket.addEventListener('message', async (event) => {
      try {
        const data = event.data
        const text = typeof data === 'string' ? data : data instanceof Blob ? await data.text() : new TextDecoder().decode(data as ArrayBuffer)
        const parsed: unknown = JSON.parse(text)
        if (parsed && typeof parsed === 'object' && 'error' in parsed) {
          error = String((parsed as { error: unknown }).error)
          return finish()
        }
        const result = parseAisMessage(parsed)
        if (result?.kind === 'name') names.set(result.mmsi, result.name)
        if (result?.kind === 'position' && FLEET_MMSIS.has(result.report.mmsi)) {
          const prev = boats.get(result.report.mmsi)
          if (!prev || prev.time <= result.report.time) boats.set(result.report.mmsi, { ...result.report, name: result.report.name ?? prev?.name ?? null })
          if (boats.size >= WHALE_WATCH_FLEET.length) finish() // heard everyone
        }
      } catch {
        // ignore malformed messages
      }
    })
    socket.addEventListener('error', () => {
      error = error ?? 'Connection error'
      finish()
    })
    socket.addEventListener('close', (event) => {
      if (!done && event.code !== 1000) error = error ?? `Connection closed (${event.code}${event.reason ? `: ${event.reason}` : ''})`
      finish()
    })
  })
}

export async function GET(): Promise<Response> {
  const apiKey = process.env.AISSTREAM_API_KEY
  if (!apiKey) {
    return Response.json({ ok: false, error: 'AISSTREAM_API_KEY is not set', boats: [] }, { status: 503 })
  }
  const started = Date.now()
  const { boats, error } = await listen(apiKey)
  const fleet = new Map(WHALE_WATCH_FLEET.map((b) => [b.mmsi, b]))
  return Response.json(
    {
      ok: !error || boats.size > 0,
      error,
      listenedSeconds: Math.round((Date.now() - started) / 1000),
      boats: [...boats.values()].map((b) => {
        const f = fleet.get(b.mmsi)
        return { ...b, name: f?.name ?? b.name, operator: f?.operator ?? null, homePort: f?.homePort ?? null }
      }),
    },
    {
      headers: {
        // Serve the saved answer instantly while a fresh one is fetched in the background.
        'Cache-Control': error && boats.size === 0 ? 'no-store' : 's-maxage=60, stale-while-revalidate=300',
      },
    },
  )
}
