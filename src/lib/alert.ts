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
  /** Orcas this close count as "here". */
  hereKm: 8,
  /** Orcas in Puget Sound within this distance can trigger a heads-up. */
  approachKm: 60,
  /** Typical travelling speed, used for the arrival estimate. */
  swimKmh: 7,
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

    if (dist <= config.hereKm) {
      if (age <= config.hereMaxAgeMin) {
        candidates.push({
          state: 'here',
          score: 3000 - age,
          title: `${whoLabel(s)} in ${home.name} waters!`,
          message: `${dist < 2 ? `Right off ${home.name}` : `About ${where}`}, reported ${Math.round(age)} min ago. Go look!`,
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
        const change = dist - distanceKm(home, earlier)
        if (change < -1.5) towards = true
        else if (change > 1.5) towards = false
      }
    }

    if (towards === false) continue // heading away from Seattle

    // Subtract how far they've probably already travelled since the report.
    const remaining = Math.max(dist - config.hereKm, 0) - (towards ? (config.swimKmh * age) / 60 : 0)
    if (towards) {
      const eta = roundEta(Math.max(remaining, 0) / config.swimKmh * 60)
      candidates.push({
        state: 'approaching',
        score: 2000 - dist,
        title: `${whoLabel(s)} heading toward ${home.name}`,
        message: `${heading ? `${heading[0].toUpperCase()}${heading.slice(1)}bound, ` : 'Moving closer, '}${where} (reported ${Math.round(age)} min ago). Could reach ${home.name} in about ${formatEta(eta)}.`,
        etaMinutes: eta,
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
