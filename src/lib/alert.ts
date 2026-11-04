// Decides whether orcas are approaching Seattle. Used by the website (the alert
// banner) and by api/alert.ts, which a lamp or other device can poll.
// Imports use .js extensions so Node can run this inside the Vercel function.
import { compassFrom, distanceKm, type Point } from './geo.js'
import { PODS } from './species.js'
import type { Sighting } from './sightings.js'
import type { Detection, Hydrophone } from '../api/orcasound.js'

export const ALERT_CONFIG = {
  /** The spot we measure from: Elliott Bay, between Alki and Discovery Park. */
  home: { name: 'Seattle', latitude: 47.605, longitude: -122.4 },
  /**
   * Places to go watch from. Orcas within spotKm of any of them count as "here", and arrival
   * estimates are to the nearest one. North to south along Seattle's shoreline.
   */
  spots: [
    { name: 'Richmond Beach', latitude: 47.7656, longitude: -122.3856 },
    { name: 'Carkeek Park', latitude: 47.7118, longitude: -122.3795 },
    { name: 'Golden Gardens', latitude: 47.6905, longitude: -122.403 },
    { name: 'Discovery Park', latitude: 47.6619, longitude: -122.4356 },
    { name: 'Elliott Bay', latitude: 47.605, longitude: -122.4 },
    { name: 'Alki', latitude: 47.5763, longitude: -122.4206 },
    { name: 'Lincoln Park', latitude: 47.531, longitude: -122.396 },
  ],
  /** Orcas this close to a spot are in view from it. */
  spotKm: 5,
  /** Orcas in Puget Sound within this distance can trigger a heads-up. */
  approachKm: 60,
  /** Typical travelling speed, used for the arrival estimate when the pod's own pace isn't known. */
  swimKmh: 7,
  /** Used instead when the report says they're going slowly (foraging, milling, resting). */
  slowSwimKmh: 4,
  /** The pod's measured pace is kept within this range, so one odd report can't throw it off. */
  paceMinKmh: 1.5,
  paceMaxKmh: 10,
  /** Ignore sightings older than this (orcas move on quickly). */
  sightingMaxAgeMin: 120,
  hereMaxAgeMin: 90,
  hydrophoneMaxAgeMin: 60,
}

export type AlertState = 'none' | 'watch' | 'approaching' | 'here'

export interface Alert {
  /** 0 = nothing, 1 = watch, 2 = approaching, 3 = here. */
  level: 0 | 1 | 2 | 3
  state: AlertState
  /** Suggested lamp color and effect. */
  color: string
  effect: 'off' | 'breathe' | 'pulse' | 'solid'
  title: string
  message: string
  /** Rough minutes until the whales could reach Seattle (approaching only). */
  etaMinutes: number | null
  /** Speed toward Seattle used for the estimate (km/h), and whether it was measured from the pod's own sightings. */
  paceKmh?: number | null
  paceMeasured?: boolean
  distanceKm: number | null
  sightingId: string | null
  hydrophoneId: string | null
  updatedAt: string
}

const LOOK: Record<AlertState, Pick<Alert, 'level' | 'color' | 'effect'>> = {
  none: { level: 0, color: '#000000', effect: 'off' },
  watch: { level: 1, color: '#f59e0b', effect: 'breathe' },
  approaching: { level: 2, color: '#06b6d4', effect: 'pulse' },
  here: { level: 3, color: '#3b82f6', effect: 'solid' },
}

/** Rough outline of Hood Canal (and Sinclair/Dyes Inlets): whales there aren't on their way to Seattle. */
function inSeattleCorridor(p: Point): boolean {
  return !(p.longitude < -122.62 && p.latitude < 47.93)
}

type Heading = 'north' | 'south' | null

export function headingFromText(text: string): Heading {
  const south = /\bsouth[\s-]?bound\b|\b(heading|headed|travel+ing|moving|going|swimming)\s+south\b|\bSB\b/i.test(text)
  const north = /\bnorth[\s-]?bound\b|\b(heading|headed|travel+ing|moving|going|swimming)\s+north\b|\bNB\b/i.test(text)
  if (south && !north) return 'south'
  if (north && !south) return 'north'
  return null
}

function whoLabel(s: Sighting): string {
  const pods = s.pods.filter((p) => p !== 'SRKW')
  return pods.length > 0 ? `Orcas (${pods.map((p) => PODS[p].name).join(', ')})` : 'Orcas'
}

type Spot = (typeof ALERT_CONFIG)['spots'][number]

/** How far outside the watching zone this point is (km; 0 or less = inside), and the nearest spot. */
export function zoneDistance(p: Point, config = ALERT_CONFIG): { km: number; spot: Spot } {
  let best = { km: Infinity, spot: config.spots[0] }
  for (const spot of config.spots) {
    const km = distanceKm(spot, p) - config.spotKm
    if (km < best.km) best = { km, spot }
  }
  return best
}

const SLOW_WORDS = /\b(slow(ly)?|forag\w*|mill\w*|meander\w*|resting|logging|lingering)\b/i

/**
 * How fast this group is actually closing in on the watching spots (km/h), from its earlier sightings:
 * reports 20 min to 2.5 hr before this one, within 15 km of it. Uses the median, so one odd
 * report doesn't throw it off, and keeps it within a sensible range. null if there's nothing to go on.
 */
export function measuredPace(s: Sighting, orcas: Sighting[], config = ALERT_CONFIG): number | null {
  const zone = (p: Point) => zoneDistance(p, config).km
  const dist = zone(s)
  const speeds = orcas
    .filter((o) => {
      const gap = (s.time.getTime() - o.time.getTime()) / 60_000
      return o.id !== s.id && gap >= 20 && gap <= 150 && distanceKm(o, s) <= 15
    })
    .map((o) => (zone(o) - dist) / ((s.time.getTime() - o.time.getTime()) / 3_600_000))
    .sort((a, b) => a - b)
  if (speeds.length === 0) return null
  const mid = speeds.length / 2
  const median = speeds.length % 2 ? speeds[Math.floor(mid)] : (speeds[mid - 1] + speeds[mid]) / 2
  return Math.min(config.paceMaxKmh, Math.max(config.paceMinKmh, median))
}

function paceWords(kmh: number): string {
  const n = kmh < 3 ? kmh.toFixed(1).replace(/\.0$/, '') : String(Math.round(kmh))
  if (kmh < 2) return `Barely getting closer (about ${n} km/h)`
  if (kmh < 4.5) return `Moving slowly (about ${n} km/h)`
  if (kmh > 8.5) return `Moving fast (about ${n} km/h)`
  return `Travelling about ${n} km/h`
}

function roundEta(minutes: number): number {
  return minutes < 60 ? Math.max(5, Math.round(minutes / 5) * 5) : Math.round(minutes / 15) * 15
}

export function formatEta(minutes: number): string {
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m === 0 ? `${h} hr` : `${h} hr ${m} min`
}

interface Candidate {
  paceKmh?: number | null
  paceMeasured?: boolean
  state: AlertState
  score: number
  title: string
  message: string
  etaMinutes: number | null
  distanceKm: number | null
  sightingId: string | null
  hydrophoneId: string | null
}

export function computeAlert(
  sightings: Sighting[],
  detections: Detection[] = [],
  hydrophones: Hydrophone[] = [],
  now: Date = new Date(),
  config = ALERT_CONFIG,
): Alert {
  const home = config.home
  const ageMin = (d: Date) => (now.getTime() - d.getTime()) / 60_000
  const candidates: Candidate[] = []

  const orcas = sightings.filter((s) => s.species === 'orca' && ageMin(s.time) >= -10)

  for (const s of orcas) {
    const age = ageMin(s.time)
    if (age > config.sightingMaxAgeMin) continue
    const dist = distanceKm(home, s)
    const where = `${Math.round(dist)} km ${compassFrom(home, s)} of ${home.name}`

    const zone = zoneDistance(s, config)
    if (zone.km <= 0) {
      if (age <= config.hereMaxAgeMin) {
        candidates.push({
          state: 'here',
          score: 3000 - age,
          title: `${whoLabel(s)} near ${zone.spot.name}!`,
          message: `${where}, reported ${Math.round(age)} min ago. Go look!`,
          etaMinutes: 0,
          distanceKm: dist,
          sightingId: s.id,
          hydrophoneId: null,
        })
      }
      continue
    }
    if (dist > config.approachKm || !inSeattleCorridor(s)) continue

    // Which way are they going? Prefer what the reporter wrote, then compare with earlier sightings nearby.
    let towards: boolean | null = null
    const heading = headingFromText(s.comments)
    if (heading) {
      towards = (s.latitude > home.latitude && heading === 'south') || (s.latitude < home.latitude && heading === 'north')
    } else {
      const earlier = orcas.find((o) => {
        const gap = (s.time.getTime() - o.time.getTime()) / 60_000
        return o.id !== s.id && gap >= 15 && gap <= 180 && distanceKm(o, s) <= 15
      })
      if (earlier) {
        const change = zone.km - zoneDistance(earlier, config).km
        if (change < -1.5) towards = true
        else if (change > 1.5) towards = false
      }
    }

    if (towards === false) continue // heading away from Seattle

    // Their pace: measured from this group's own recent sightings when possible, otherwise a typical speed.
    const measured = towards ? measuredPace(s, orcas, config) : null
    const pace = measured ?? (SLOW_WORDS.test(s.comments) ? config.slowSwimKmh : config.swimKmh)
    // Subtract how far they've probably already travelled since the report.
    const remaining = Math.max(zone.km, 0) - (towards ? (pace * age) / 60 : 0)
    if (towards) {
      const eta = roundEta(Math.max(remaining, 0) / pace * 60)
      candidates.push({
        state: 'approaching',
        score: 2000 - dist,
        title: `${whoLabel(s)} heading toward ${home.name}`,
        message: `${heading ? `${heading[0].toUpperCase()}${heading.slice(1)}bound, ` : 'Moving closer, '}${where} (reported ${Math.round(age)} min ago). ${measured !== null ? `${paceWords(measured)}, so they` : 'They'} could reach ${zone.spot.name} in about ${formatEta(eta)}.`,
        etaMinutes: eta,
        paceKmh: Math.round(pace * 10) / 10,
        paceMeasured: measured !== null,
        distanceKm: dist,
        sightingId: s.id,
        hydrophoneId: null,
      })
    } else {
      candidates.push({
        state: 'watch',
        score: 1000 - dist,
        title: `${whoLabel(s)} in Puget Sound`,
        message: `${where} (reported ${Math.round(age)} min ago). Direction unknown, so keep an eye out.`,
        etaMinutes: null,
        distanceKm: dist,
        sightingId: s.id,
        hydrophoneId: null,
      })
    }
  }

  // Whale sounds on a nearby hydrophone: an early hint, but no direction.
  for (const h of hydrophones) {
    const dist = distanceKm(home, h)
    if (dist > config.approachKm || !inSeattleCorridor(h)) continue
    const d = detections.find((x) => x.hydrophoneId === h.id && x.category === 'whale')
    if (!d || ageMin(d.time) > config.hydrophoneMaxAgeMin) continue
    candidates.push({
      state: 'watch',
      score: 1000 - dist + 0.5,
      title: `Whale sounds heard at ${h.name}`,
      message: `${Math.round(dist)} km ${compassFrom(home, h)} of ${home.name}, ${Math.round(ageMin(d.time))} min ago. Listen live to check.`,
      etaMinutes: null,
      distanceKm: dist,
      sightingId: null,
      hydrophoneId: h.id,
    })
  }

  const rank: Record<AlertState, number> = { none: 0, watch: 1, approaching: 2, here: 3 }
  const best = candidates.sort((a, b) => rank[b.state] - rank[a.state] || b.score - a.score)[0]

  if (!best) {
    return {
      ...LOOK.none,
      state: 'none',
      title: 'All quiet',
      message: `No orcas heading toward ${home.name} right now.`,
      etaMinutes: null,
      distanceKm: null,
      sightingId: null,
      hydrophoneId: null,
      updatedAt: now.toISOString(),
    }
  }
  const { score: _score, ...rest } = best
  const km = rest.distanceKm === null ? null : Math.round(rest.distanceKm * 10) / 10
  return { ...LOOK[best.state], ...rest, distanceKm: km, updatedAt: now.toISOString() }
}
