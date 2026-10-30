// Orcasound (https://live.orcasound.net) streams underwater microphones
// (hydrophones) around Puget Sound and the San Juan Islands. Its JSON:API is
// public and allows cross-origin requests, so the browser calls it directly.

const API = 'https://live.orcasound.net/api/json'
const HEADERS = { Accept: 'application/vnd.api+json' }

export interface Hydrophone {
  id: string
  name: string
  slug: string
  nodeName: string
  bucket: string
  latitude: number
  longitude: number
  imageUrl: string | null
  listenUrl: string
}

export type DetectionCategory = 'whale' | 'vessel' | 'other'

export interface Detection {
  id: string
  hydrophoneId: string
  time: Date
  category: DetectionCategory | null
  /** "human" = a listener pressed "I hear something"; "machine" = Orcasound's AI detector. */
  source: 'human' | 'machine' | string
  description: string
  listenerCount: number | null
}

interface JsonApiResource {
  id: string
  type: string
  attributes?: Record<string, unknown>
  relationships?: Record<string, { data?: { id: string } | null }>
}

async function getJson(url: string): Promise<{ data: JsonApiResource[] }> {
  const res = await fetch(url, { headers: HEADERS })
  if (!res.ok) throw new Error(`Orcasound responded with ${res.status}`)
  const body = await res.json()
  if (!Array.isArray(body?.data)) throw new Error('Unexpected Orcasound response')
  return body
}

/** Location may come back as {lat, lng}, a GeoJSON point, or a "lat,lng" string. */
function readLocation(attrs: Record<string, unknown>): [number, number] | null {
  const latLng = attrs.lat_lng as { lat?: number; lng?: number } | undefined
  if (latLng && typeof latLng.lat === 'number' && typeof latLng.lng === 'number') return [latLng.lat, latLng.lng]

  const point = attrs.location_point as { coordinates?: [number, number] } | string | undefined
  if (point && typeof point === 'object' && Array.isArray(point.coordinates)) {
    const [lng, lat] = point.coordinates
    return [lat, lng]
  }
  const text = typeof point === 'string' ? point : typeof attrs.lat_lng_string === 'string' ? attrs.lat_lng_string : ''
  const wkt = text.match(/POINT\s*\(\s*(-?[\d.]+)\s+(-?[\d.]+)\s*\)/i)
  if (wkt) return [parseFloat(wkt[2]), parseFloat(wkt[1])]
  const pair = text.match(/^\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*$/)
  if (pair) return [parseFloat(pair[1]), parseFloat(pair[2])]
  return null
}

function toHydrophone(r: JsonApiResource): Hydrophone | null {
  const a = r.attributes ?? {}
  if (a.visible === false) return null
  const location = readLocation(a)
  const slug = String(a.slug ?? '')
  if (!location || !a.node_name || !a.bucket) return null
  return {
    id: r.id,
    name: String(a.name ?? slug),
    slug,
    nodeName: String(a.node_name),
    bucket: String(a.bucket),
    latitude: location[0],
    longitude: location[1],
    imageUrl: typeof a.image_url === 'string' && a.image_url ? a.image_url : null,
    listenUrl: `https://live.orcasound.net/listen/${slug}`,
  }
}

export async function fetchHydrophones(): Promise<Hydrophone[]> {
  const fields = 'name,slug,node_name,bucket,visible,image_url,location_point,lat_lng'
  let body: { data: JsonApiResource[] }
  try {
    body = await getJson(`${API}/feeds?fields[feed]=${fields}`)
  } catch {
    // Fall back to the default field set if the field list is rejected.
    body = await getJson(`${API}/feeds`)
  }
  return body.data
    .map(toHydrophone)
    .filter((h): h is Hydrophone => h !== null)
    .sort((a, b) => b.latitude - a.latitude)
}

export async function fetchDetections(): Promise<Detection[]> {
  const body = await getJson(`${API}/detections?include=feed&page[limit]=200`)
  return body.data
    .map((r): Detection | null => {
      const a = r.attributes ?? {}
      const hydrophoneId = r.relationships?.feed?.data?.id ?? (typeof a.feed_id === 'string' ? a.feed_id : '')
      const time = new Date(String(a.timestamp ?? a.inserted_at ?? ''))
      if (!hydrophoneId || Number.isNaN(time.getTime())) return null
      return {
        id: r.id,
        hydrophoneId,
        time,
        category: (a.category as DetectionCategory | null) ?? null,
        source: String(a.source ?? 'human'),
        description: typeof a.description === 'string' ? a.description.trim() : '',
        listenerCount: typeof a.listener_count === 'number' ? a.listener_count : null,
      }
    })
    .filter((d): d is Detection => d !== null)
    .sort((a, b) => b.time.getTime() - a.time.getTime())
}

/** The live stream is HLS: latest.txt holds the current stream's start time. */
export async function getLiveStreamUrl(h: Hydrophone): Promise<string> {
  const base = `https://${h.bucket}.s3.amazonaws.com/${h.nodeName}`
  const res = await fetch(`${base}/latest.txt`, { cache: 'no-store' })
  if (!res.ok) throw new Error('This hydrophone seems to be offline')
  const timestamp = (await res.text()).trim()
  if (!/^\d+$/.test(timestamp)) throw new Error('This hydrophone seems to be offline')
  return `${base}/hls/${timestamp}/live.m3u8`
}
