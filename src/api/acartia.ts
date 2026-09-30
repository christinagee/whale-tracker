import { parseSightingRows, type Sighting } from '../lib/sightings'
import { makeDemoSightings } from '../data/demoSightings'

export type { Sighting } from '../lib/sightings'

export interface SightingsResult {
  sightings: Sighting[]
  /** false when we're showing sample data because the live feed wasn't reachable. */
  live: boolean
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
    return { sightings: parseSightingRows(await res.json()), live: true }
  } catch (err) {
    console.info('Live sightings unavailable, showing sample data.', err)
    return { sightings: makeDemoSightings(), live: false }
  }
}
