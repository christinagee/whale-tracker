export type SpeciesKey = 'orca' | 'humpback' | 'gray' | 'minke' | 'fin' | 'dolphin' | 'porpoise' | 'other'

export interface SpeciesInfo {
  key: SpeciesKey
  label: string
  color: string
}

export const SPECIES: Record<SpeciesKey, SpeciesInfo> = {
  orca: { key: 'orca', label: 'Orca', color: '#0f172a' },
  humpback: { key: 'humpback', label: 'Humpback', color: '#2563eb' },
  gray: { key: 'gray', label: 'Gray whale', color: '#64748b' },
  minke: { key: 'minke', label: 'Minke', color: '#0d9488' },
  fin: { key: 'fin', label: 'Fin whale', color: '#7c3aed' },
  dolphin: { key: 'dolphin', label: 'Dolphin', color: '#db2777' },
  porpoise: { key: 'porpoise', label: 'Porpoise', color: '#ea580c' },
  other: { key: 'other', label: 'Other', color: '#a16207' },
}

export function classifySpecies(raw: string): SpeciesKey {
  const s = raw.toLowerCase()
  if (/orca|killer whale|southern resident|bigg|transient|\b[jkl][ -]?pod\b|srkw/.test(s)) return 'orca'
  if (/humpback/.test(s)) return 'humpback'
  if (/gr[ae]y whale/.test(s)) return 'gray'
  if (/minke/.test(s)) return 'minke'
  if (/fin whale|\bfin\b/.test(s)) return 'fin'
  if (/dolphin/.test(s)) return 'dolphin'
  if (/porpoise/.test(s)) return 'porpoise'
  return 'other'
}

export type PodKey = 'J' | 'K' | 'L' | 'SRKW' | 'Biggs'

export interface PodInfo {
  key: PodKey
  name: string
  short: string
  blurb: string
}

export const PODS: Record<PodKey, PodInfo> = {
  J: {
    key: 'J',
    name: 'J pod',
    short: 'J',
    blurb:
      'The Southern Resident pod seen most often in the Salish Sea, often year-round. Famous members include J2 "Granny", thought to have lived to around 100, and J35 Tahlequah.',
  },
  K: {
    key: 'K',
    name: 'K pod',
    short: 'K',
    blurb:
      'The smallest Southern Resident pod. They travel widely along the outer coast and usually come into the inland waters in summer, often together with L pod.',
  },
  L: {
    key: 'L',
    name: 'L pod',
    short: 'L',
    blurb:
      'The largest Southern Resident pod, made up of several matrilines. They spend a lot of time on the outer coast and arrive in the San Juans in late spring and summer.',
  },
  SRKW: {
    key: 'SRKW',
    name: 'Southern Residents',
    short: 'SR',
    blurb:
      'J, K and L pods together form the endangered Southern Resident killer whales. They eat fish, mainly Chinook salmon, and are recognized by their calls.',
  },
  Biggs: {
    key: 'Biggs',
    name: "Bigg's killer whales",
    short: 'T',
    blurb:
      'Also called transients. They hunt seals, sea lions and porpoises and travel in small family groups identified by "T" numbers (for example T65A). These days they are the orcas seen most often in the Salish Sea.',
  },
}

/** Picks out which pods a sighting mentions, e.g. "J pod", "Js", "J35", "KL pods", "T65A", "Bigg's". */
export function detectPods(text: string): PodKey[] {
  const found = new Set<PodKey>()
  const t = ` ${text} `
  const residentPod = (letter: 'J' | 'K' | 'L') =>
    new RegExp(`[^A-Za-z]${letter}(?:[ -]?pods?\\b|s\\b|'s\\b|\\d{1,3}\\b)`, 'i').test(t)
  for (const letter of ['J', 'K', 'L'] as const) {
    if (residentPod(letter)) found.add(letter)
  }
  // Combined forms like "KL pods" or "JKL pods".
  for (const m of t.matchAll(/\b([JKL]{2,3})[ -]?pods?\b/gi)) {
    for (const letter of m[1].toUpperCase()) found.add(letter as 'J' | 'K' | 'L')
  }
  if (/southern resident|\bsrkw|\bresidents?\b/i.test(t) && found.size === 0) found.add('SRKW')
  if (/bigg'?s|transient/i.test(t) || /\bT\d{1,3}[A-Z]?\d?s?\b/.test(t)) found.add('Biggs')
  return [...found]
}
