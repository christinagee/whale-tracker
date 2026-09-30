import { classifySpecies, detectPods, type PodKey, type SpeciesKey } from '../lib/species'
import { makeDemoSightings } from '../data/demoSightings'

export interface Sighting {
  id: string
  species: SpeciesKey
  speciesLabel: string
  pods: PodKey[]
  latitude: number
  longitude: number
  count: number | null
  time: Date
  comments: string
  source: string
  photoUrl: string | null
}

export interface SightingsResult {
  sightings: Sighting[]
  /** false when we're showing sample data because the live feed wasn't reachable. */
  live: boolean
}

type RawSighting = Record<string, unknown>

const str = (v: unknown) => (typeof v === 'string' ? v : typeof v === 'number' ? String(v) : '')
const num = (v: unknown) => {
  const n = typeof v === 'number' ? v : parseFloat(str(v))
  return Number.isFinite(n) ? n : null
}

/** Acartia sends times like "2025-02-14 21:49:00" in UTC, with no time zone marker. */
function parseTime(value: unknown): Date {
  const text = str(value).trim()
  const iso = /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/.test(text) ? `${text.replace(' ', 'T')}Z` : text
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? new Date() : date
}

export function normalizeSighting(raw: RawSighting, index: number): Sighting | null {
  const latitude = num(raw.latitude ?? raw.lat)
  const longitude = num(raw.longitude ?? raw.lon ?? raw.lng)
  if (latitude === null || longitude === null) return null

  const speciesLabel = str(raw.type ?? raw.species) || 'Unknown'
  let comments = str(raw.data_source_comments ?? raw.comments).trim()
  // Comments often start with the reporting organization in brackets, e.g. "[Orca Network] J pod, northbound".
  const bracketed = comments.match(/^\[([^\]]+)\]\s*/)
  if (bracketed) comments = comments.slice(bracketed[0].length)
  const profile = raw.profile as { name?: unknown } | undefined

  const pods = detectPods(`${speciesLabel} ${comments}`)
  const species = pods.length > 0 ? 'orca' : classifySpecies(`${speciesLabel} ${comments}`)

  return {
    id: str(raw.entry_id ?? raw.ssemmi_id ?? raw.id) || `sighting-${index}`,
    species,
    speciesLabel,
    pods,
    latitude,
    longitude,
    count: num(raw.no_sighted),
    time: parseTime(raw.created),
    comments,
    source: bracketed?.[1] || str(raw.data_source_entity) || str(profile?.name) || str(raw.data_source_name),
    photoUrl: str(raw.photo_url) || null,
  }
}

/**
 * Sightings come through our own /api/sightings function (see api/sightings.ts),
 * which holds the Acartia token and avoids browser CORS problems. If that isn't
 * available (e.g. running `npm run dev` locally) we fall back to sample data.
 */
export async function fetchSightings(): Promise<SightingsResult> {
  try {
    const res = await fetch('/api/sightings', { headers: { Accept: 'application/json' } })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const body: unknown = await res.json()
    const rows = Array.isArray(body) ? body : (body as { data?: unknown }).data
    if (!Array.isArray(rows)) throw new Error('Unexpected response shape')

    const sightings = rows
      .map((row, i) => normalizeSighting(row as RawSighting, i))
      .filter((s): s is Sighting => s !== null)
      .sort((a, b) => b.time.getTime() - a.time.getTime())
    return { sightings, live: true }
  } catch (err) {
    console.info('Live sightings unavailable, showing sample data.', err)
    return { sightings: makeDemoSightings(), live: false }
  }
}
