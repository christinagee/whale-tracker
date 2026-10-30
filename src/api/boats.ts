import type { BoatReport } from '../lib/ais'

export interface BoatPosition extends BoatReport {
  operator: string | null
  homePort: string | null
}

export interface BoatsResponse {
  ok: boolean
  error: string | null
  boats: BoatPosition[]
}

/** Whale-watch boat positions from our /api/boats function (see api/boats.ts). */
export async function fetchBoats(): Promise<BoatsResponse> {
  const res = await fetch('/api/boats', { headers: { Accept: 'application/json' } })
  const body = (await res.json().catch(() => null)) as BoatsResponse | null
  if (!body || !Array.isArray(body.boats)) throw new Error(`Boat positions unavailable (HTTP ${res.status})`)
  return body
}
