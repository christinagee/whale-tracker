// Turns aisstream.io messages into simple boat position reports.
// Shared by api/boats.ts (server) and tests, so imports use .js extensions.

export interface BoatReport {
  mmsi: string
  name: string | null
  latitude: number
  longitude: number
  /** Speed over ground in knots (null if not available). */
  speedKnots: number | null
  /** Course over ground in degrees (null if not available). */
  courseDeg: number | null
  time: string // ISO
}

type Json = Record<string, unknown>

const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null)

/** aisstream times look like "2025-01-31 18:22:32.318353 +0000 UTC". */
export function parseAisTime(value: unknown): Date | null {
  if (typeof value !== 'string') return null
  const m = value.match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})(\.\d+)?/)
  if (!m) {
    const d = new Date(value)
    return Number.isNaN(d.getTime()) ? null : d
  }
  const ms = m[3] ? m[3].slice(0, 4) : ''
  const d = new Date(`${m[1]}T${m[2]}${ms}Z`)
  return Number.isNaN(d.getTime()) ? null : d
}

const POSITION_TYPES = ['PositionReport', 'StandardClassBPositionReport', 'ExtendedClassBPositionReport']

/** Returns a position report, a name-only update, or null for anything else. */
export function parseAisMessage(raw: unknown, receivedAt = new Date()):
  | { kind: 'position'; report: BoatReport }
  | { kind: 'name'; mmsi: string; name: string }
  | null {
  if (!raw || typeof raw !== 'object') return null
  const msg = raw as Json
  const type = String(msg.MessageType ?? '')
  const meta = (msg.MetaData ?? msg.Metadata ?? {}) as Json
  const body = ((msg.Message ?? {}) as Json)[type] as Json | undefined
  const mmsi = String(meta.MMSI ?? body?.UserID ?? '').trim()
  if (!/^\d{9}$/.test(mmsi)) return null
  const name = typeof meta.ShipName === 'string' && meta.ShipName.trim() ? meta.ShipName.trim() : null

  if (type === 'ShipStaticData' || type === 'StaticDataReport') {
    const staticName =
      (typeof body?.Name === 'string' && body.Name.trim()) ||
      (typeof (body?.ReportA as Json | undefined)?.Name === 'string' && String((body?.ReportA as Json).Name).trim()) ||
      name
    return staticName ? { kind: 'name', mmsi, name: staticName.replace(/@+$/, '').trim() } : null
  }
  if (!POSITION_TYPES.includes(type) || !body) return null

  const latitude = num(meta.latitude ?? meta.Latitude) ?? num(body.Latitude)
  const longitude = num(meta.longitude ?? meta.Longitude) ?? num(body.Longitude)
  // AIS uses 91/181 for "not available".
  if (latitude === null || longitude === null || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null

  const sog = num(body.Sog)
  const cog = num(body.Cog)
  const heading = num(body.TrueHeading)
  const time = parseAisTime(meta.time_utc) ?? receivedAt

  return {
    kind: 'position',
    report: {
      mmsi,
      name,
      latitude,
      longitude,
      speedKnots: sog !== null && sog < 102.3 ? sog : null,
      courseDeg: cog !== null && cog < 360 ? cog : heading !== null && heading < 360 ? heading : null,
      time: time.toISOString(),
    },
  }
}
