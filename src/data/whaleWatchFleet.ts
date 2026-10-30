// Whale-watching boats we track by their AIS ID (MMSI). Curated by hand from
// public vessel-tracking listings; add or remove a line to change the fleet.
// "confidence: 'check'" marks entries whose MMSI comes from a single source.

export interface FleetBoat {
  mmsi: string
  name: string
  operator: string
  homePort: string
  confidence: 'confirmed' | 'check'
}

export const WHALE_WATCH_FLEET: FleetBoat[] = [
  { mmsi: '369264000', name: 'Island Explorer 5', operator: 'Island Adventures', homePort: 'Anacortes', confidence: 'confirmed' },
  { mmsi: '368023510', name: 'Saratoga', operator: 'Puget Sound Express', homePort: 'Port Townsend', confidence: 'confirmed' },
  { mmsi: '368026630', name: 'Western Explorer II', operator: 'Western Prince', homePort: 'Friday Harbor', confidence: 'confirmed' },
  { mmsi: '368616000', name: 'Blackfish VI', operator: 'Blackfish Tours', homePort: 'Anacortes', confidence: 'confirmed' },
  { mmsi: '316018618', name: 'Orca Spirit II', operator: 'Orca Spirit Adventures', homePort: 'Victoria', confidence: 'confirmed' },
  { mmsi: '316008331', name: 'Ocean Magic II', operator: 'Prince of Whales', homePort: 'Victoria', confidence: 'confirmed' },
  { mmsi: '316008046', name: 'Explorathor II', operator: 'Vancouver Whale Watch', homePort: 'Steveston', confidence: 'confirmed' },
  { mmsi: '316034816', name: 'Wild 4 Whales', operator: 'Eagle Wing Tours', homePort: 'Victoria', confidence: 'confirmed' },
  { mmsi: '338519000', name: 'Swiftsure', operator: 'Puget Sound Express', homePort: 'Edmonds', confidence: 'check' },
  { mmsi: '367121000', name: 'Glacier Spirit', operator: 'Puget Sound Express', homePort: 'Edmonds', confidence: 'check' },
  { mmsi: '366902890', name: 'San Juan Clipper', operator: 'FRS Clipper', homePort: 'Seattle', confidence: 'check' },
]

/** Harbors the fleet sails from. A slow boat this close to one counts as "in harbor". */
export const HARBORS: { name: string; latitude: number; longitude: number }[] = [
  { name: 'Friday Harbor', latitude: 48.5355, longitude: -123.0145 },
  { name: 'Roche Harbor', latitude: 48.6100, longitude: -123.1560 },
  { name: 'Anacortes', latitude: 48.5070, longitude: -122.6060 },
  { name: 'Anacortes (Skyline)', latitude: 48.4930, longitude: -122.6790 },
  { name: 'Port Townsend', latitude: 48.1170, longitude: -122.7520 },
  { name: 'Edmonds', latitude: 47.8130, longitude: -122.3880 },
  { name: 'Everett', latitude: 47.9970, longitude: -122.2220 },
  { name: 'Seattle (Pier 69)', latitude: 47.6140, longitude: -122.3540 },
  { name: 'Bellingham', latitude: 48.7200, longitude: -122.5110 },
  { name: 'Victoria Inner Harbour', latitude: 48.4230, longitude: -123.3720 },
  { name: 'Sidney', latitude: 48.6490, longitude: -123.3960 },
  { name: 'Steveston', latitude: 49.1240, longitude: -123.1840 },
  { name: 'Campbell River', latitude: 50.0310, longitude: -125.2450 },
]

/** Well-known spots, used only to describe where something is ("2 km west of Lime Kiln"). Approximate. */
export const LANDMARKS: { name: string; latitude: number; longitude: number }[] = [
  { name: 'Lime Kiln Lighthouse', latitude: 48.516, longitude: -123.152 },
  { name: 'Cattle Point', latitude: 48.452, longitude: -122.963 },
  { name: 'Eagle Point', latitude: 48.460, longitude: -123.030 },
  { name: 'Turn Point (Stuart Island)', latitude: 48.689, longitude: -123.237 },
  { name: 'East Point (Saturna)', latitude: 48.783, longitude: -123.045 },
  { name: 'Race Rocks', latitude: 48.298, longitude: -123.531 },
  { name: 'Admiralty Head', latitude: 48.160, longitude: -122.681 },
  { name: 'Point No Point', latitude: 47.912, longitude: -122.527 },
  { name: 'Possession Point', latitude: 47.904, longitude: -122.383 },
  { name: 'Alki Point', latitude: 47.576, longitude: -122.420 },
  { name: 'Point Robinson', latitude: 47.388, longitude: -122.375 },
]
