import { compassFrom, distanceKm, type Point } from './geo'
import { HARBORS, LANDMARKS } from '../data/whaleWatchFleet'
import type { BoatPosition } from '../api/boats'

export interface TrackPoint {
  latitude: number
  longitude: number
  time: string
  speedKnots: number | null
}

/** A boat's latest position plus where it has been recently. */
export interface Boat extends BoatPosition {
  track: TrackPoint[]
}

export type BoatStatus = 'moving' | 'slow' | 'harbor'

/** Positions older than this are shown faded as "old". */
export const STALE_MIN = 30
/** Boats not heard from for this long are hidden. */
export const HIDE_AFTER_MIN = 12 * 60
/** How much trail to keep. */
const TRACK_MIN = 3 * 60

export const ageMinutes = (time: string, now = Date.now()) => (now - new Date(time).getTime()) / 60_000

export function nearestHarbor(p: Point) {
  let best = HARBORS[0]
  let bestKm = Infinity
  for (const h of HARBORS) {
    const km = distanceKm(p, h)
    if (km < bestKm) {
      best = h
      bestKm = km
    }
  }
  return { harbor: best, km: bestKm }
}

export function boatStatus(b: BoatPosition): BoatStatus {
  const speed = b.speedKnots ?? 0
  if (speed <= 1 && nearestHarbor(b).km <= 0.8) return 'harbor'
  return speed >= 3 ? 'moving' : 'slow'
}

/** Describes a spot relative to the nearest harbor, e.g. "4 km southwest of Friday Harbor". */
export function describePlace(p: Point): string {
  let best = HARBORS[0]
  let bestKm = Infinity
  for (const place of [...HARBORS, ...LANDMARKS]) {
    const km = distanceKm(p, place)
    if (km < bestKm) {
      best = place
      bestKm = km
    }
  }
  if (bestKm < 1) return `at ${best.name}`
  return `${Math.round(bestKm)} km ${compassFrom(best, p)} of ${best.name}`
}

/** Adds the latest positions to what we already know, keeping a few hours of trail per boat. */
export function mergeBoats(previous: Boat[], latest: BoatPosition[], now = Date.now()): Boat[] {
  const byMmsi = new Map(previous.map((b) => [b.mmsi, b]))
  for (const p of latest) {
    const old = byMmsi.get(p.mmsi)
    const point: TrackPoint = { latitude: p.latitude, longitude: p.longitude, time: p.time, speedKnots: p.speedKnots }
    const track = [...(old?.track ?? [])]
    if (!track.some((t) => t.time === p.time)) track.push(point)
    track.sort((a, b) => a.time.localeCompare(b.time))
    const newest = old && old.time > p.time ? old : { ...p, track: [] }
    byMmsi.set(p.mmsi, { ...newest, name: p.name ?? old?.name ?? null, track })
  }
  return [...byMmsi.values()]
    .map((b) => ({ ...b, track: b.track.filter((t) => ageMinutes(t.time, now) <= TRACK_MIN).slice(-80) }))
    .filter((b) => ageMinutes(b.time, now) <= HIDE_AFTER_MIN)
}

export interface Gathering {
  id: string
  latitude: number
  longitude: number
  boats: Boat[]
  /** Most recent report among the boats. */
  time: string
}

/**
 * Two or more whale-watch boats going slowly close together, away from a harbor,
 * usually means they're watching whales.
 */
export function findGatherings(boats: Boat[], now = Date.now()): Gathering[] {
  const candidates = boats.filter((b) => ageMinutes(b.time, now) <= 20 && boatStatus(b) === 'slow')
  const groups: Boat[][] = []
  const used = new Set<string>()
  for (const b of candidates) {
    if (used.has(b.mmsi)) continue
    const group = [b]
    used.add(b.mmsi)
    for (let i = 0; i < group.length; i++) {
      for (const other of candidates) {
        if (!used.has(other.mmsi) && distanceKm(group[i], other) <= 2.5) {
          group.push(other)
          used.add(other.mmsi)
        }
      }
    }
    if (group.length >= 2) groups.push(group)
  }
  return groups.map((g) => ({
    id: `gathering-${g.map((b) => b.mmsi).sort().join('-')}`,
    latitude: g.reduce((s, b) => s + b.latitude, 0) / g.length,
    longitude: g.reduce((s, b) => s + b.longitude, 0) / g.length,
    boats: g,
    time: g.map((b) => b.time).sort().at(-1)!,
  }))
}
