// Links sighting reports that are probably the same group of whales, so the map
// can draw their path. Two reports are linked when they are the same species,
// the pods (if named) don't conflict, and the gap in time and distance is one
// a whale could actually swim.
import { distanceKm, type Point } from './geo.js'
import type { PodKey } from './species.js'
import type { Sighting } from './sightings.js'

/** Reports more than this far apart in time start a new track. */
const MAX_GAP_MIN = 4 * 60
/** Fastest believable travel speed, plus some slack for imprecise positions. */
const MAX_SPEED_KMH = 15
const POSITION_SLACK_KM = 4

export interface Track {
  id: string
  /** Oldest first. */
  points: Sighting[]
  species: Sighting['species']
  pods: PodKey[]
}

const RESIDENT: PodKey[] = ['J', 'K', 'L', 'SRKW']

function podsCompatible(a: PodKey[], b: PodKey[]): boolean {
  if (a.length === 0 || b.length === 0) return true
  // Southern Residents and Bigg's never travel together.
  const aBiggs = a.includes('Biggs')
  const bBiggs = b.includes('Biggs')
  if (aBiggs !== bBiggs) return false
  if (aBiggs) return true
  // "Southern Residents" matches any of J/K/L; otherwise they need a pod in common.
  if (a.includes('SRKW') || b.includes('SRKW')) return true
  return a.some((p) => RESIDENT.includes(p) && b.includes(p))
}

export function buildTracks(sightings: Sighting[]): Track[] {
  const tracks: Track[] = []
  const oldestFirst = [...sightings].sort((a, b) => a.time.getTime() - b.time.getTime())

  for (const s of oldestFirst) {
    let best: Track | null = null
    let bestKm = Infinity
    for (const t of tracks) {
      const last = t.points[t.points.length - 1]
      if (last.species !== s.species) continue
      const gapMin = (s.time.getTime() - last.time.getTime()) / 60_000
      if (gapMin <= 0 || gapMin > MAX_GAP_MIN) continue
      if (!podsCompatible(t.pods, s.pods)) continue
      const km = distanceKm(last, s)
      if (km > (MAX_SPEED_KMH * gapMin) / 60 + POSITION_SLACK_KM) continue
      if (km < bestKm) {
        best = t
        bestKm = km
      }
    }
    if (best) {
      best.points.push(s)
      for (const p of s.pods) if (!best.pods.includes(p)) best.pods.push(p)
    } else {
      tracks.push({ id: `track-${s.id}`, points: [s], species: s.species, pods: [...s.pods] })
    }
  }
  return tracks
}

/** Compass bearing in degrees (0 = north) from a to b. */
export function bearingDeg(a: Point, b: Point): number {
  const toRad = (d: number) => (d * Math.PI) / 180
  const y = Math.sin(toRad(b.longitude - a.longitude)) * Math.cos(toRad(b.latitude))
  const x =
    Math.cos(toRad(a.latitude)) * Math.sin(toRad(b.latitude)) -
    Math.sin(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.cos(toRad(b.longitude - a.longitude))
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360
}

/** 1 for a brand-new report, fading to 0.3 for reports a day or more old. */
export function freshness(time: Date, now = Date.now()): number {
  const hours = (now - time.getTime()) / 3_600_000
  return Math.max(0.3, Math.min(1, 1 - (hours / 24) * 0.7))
}
