// Turns raw Acartia sighting records into a consistent shape. Shared by the
// website and the /api/alert function, so imports use .js extensions (needed
// by Node when Vercel runs the function).
import { classifySpecies, detectPods, stripOrganizations, type PodKey, type SpeciesKey } from './species.js'

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

export type RawSighting = Record<string, unknown>

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

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' }

/** Some sources send HTML in their notes ("...south.<br><br>Submitted by..."). Turn it into plain text. */
export function htmlToText(text: string): string {
  return text
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li)>/gi, '\n')
    .replace(/<\/?[a-zA-Z][^<>]*>/g, '')
    .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, code: string) => {
      if (code[0] === '#') {
        const n = code[1].toLowerCase() === 'x' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10)
        return Number.isFinite(n) && n > 0 && n < 0x110000 ? String.fromCodePoint(n) : m
      }
      return ENTITIES[code.toLowerCase()] ?? m
    })
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{2,}/g, '\n')
    .trim()
}

/** Whale Alert adds a credit line to every report; we already show the source separately. */
export function stripBoilerplate(text: string): string {
  return text.replace(/\s*Submitted (by|via) (a |an |the )?Whale Alert[\s\S]*$/i, '').trim()
}

/**
 * Orca Network notes end with the observers' names in brackets, e.g.
 * "Humpback milling (Jennifer Fulton Carpenter)". We show the organization instead,
 * so remove trailing brackets that look like people's names. Brackets with whale
 * IDs, pods or numbers ("(J35)", "(Ts and Ks)") are kept.
 */
export function stripObserverNames(text: string): string {
  let out = text.trim()
  for (;;) {
    const m = out.match(/\s*\(([^()]*)\)\s*[.!]?$/)
    if (!m) return out
    const inside = m[1].trim()
    const words = inside.split(/[\s,&/+-]+/).filter(Boolean)
    const isOrganization = /^(orca\s*network|orcasound|whale alert|conserve\.io|the whale museum|whale museum)$/i.test(inside)
    const looksLikeNames =
      inside.length > 0 &&
      !/\d/.test(inside) &&
      !/\b(pod|pods|orcas?|whales?|humpbacks?|gr[ae]ys?|minkes?|srkw|bigg'?s|residents?|transients?|calf|calves)\b/i.test(inside) &&
      !/\b[JKLT]s?\b/.test(inside) &&
      words.length <= 12 &&
      words.every((w) =>
        /^(and|via|per|from|by|with|et|al\.?|thanks|to|credit|sighting|sightings|confirmed|photo|photos|video|report|reported|relayed|observed|seen|[A-Z][\p{L}'.]*)$/u.test(w),
      ) &&
      words.some((w) => /^[A-Z]/.test(w))
    if (!looksLikeNames && !isOrganization) return out
    out = out.slice(0, out.length - m[0].length).trim()
  }
}

export function normalizeSighting(raw: RawSighting, index: number): Sighting | null {
  const latitude = num(raw.latitude ?? raw.lat)
  const longitude = num(raw.longitude ?? raw.lon ?? raw.lng)
  if (latitude === null || longitude === null) return null

  const speciesLabel = str(raw.type ?? raw.species) || 'Unknown'
  let comments = stripBoilerplate(htmlToText(str(raw.data_source_comments ?? raw.comments)))
  // Comments often start with the reporting organization in brackets, e.g. "[Orca Network] J pod, northbound"
  // (sometimes mistyped as "[Orca Network[").
  const bracketed = comments.match(/^\[([^[\]]+)[\][]\s*/)
  if (bracketed) comments = comments.slice(bracketed[0].length)
  comments = stripObserverNames(comments)
  const profile = raw.profile as { name?: unknown } | undefined

  // Trust the reported species; only read the comments when it's vague ("Unknown", "Whale", ...).
  // Organization names like "Orca Network" are removed first so they don't count as an orca.
  const notes = stripOrganizations(comments)
  let species = classifySpecies(speciesLabel)
  if (species === 'other') {
    species = classifySpecies(notes)
    if (species === 'other' && detectPods(notes).length > 0) species = 'orca'
  }
  const pods = species === 'orca' ? detectPods(`${speciesLabel} ${notes}`) : []

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

export function parseSightingRows(body: unknown): Sighting[] {
  const rows = Array.isArray(body) ? body : (body as { data?: unknown } | null)?.data
  if (!Array.isArray(rows)) throw new Error('Unexpected response shape')
  return rows
    .map((row, i) => normalizeSighting(row as RawSighting, i))
    .filter((s): s is Sighting => s !== null)
    .sort((a, b) => b.time.getTime() - a.time.getTime())
}

/** The most recent report, whatever order the list is in. */
export function newestSighting<T extends { time: Date }>(sightings: T[]): T | undefined {
  return sightings.reduce<T | undefined>((best, s) => (!best || s.time > best.time ? s : best), undefined)
}
