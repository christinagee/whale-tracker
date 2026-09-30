export interface Point {
  latitude: number
  longitude: number
}

const R = 6371 // km

export function distanceKm(a: Point, b: Point): number {
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(b.latitude - a.latitude)
  const dLng = toRad(b.longitude - a.longitude)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

/** Compass direction of `to` as seen from `from`, e.g. "north" or "southwest". */
export function compassFrom(from: Point, to: Point): string {
  const toRad = (d: number) => (d * Math.PI) / 180
  const y = Math.sin(toRad(to.longitude - from.longitude)) * Math.cos(toRad(to.latitude))
  const x =
    Math.cos(toRad(from.latitude)) * Math.sin(toRad(to.latitude)) -
    Math.sin(toRad(from.latitude)) * Math.cos(toRad(to.latitude)) * Math.cos(toRad(to.longitude - from.longitude))
  const bearing = ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360
  const names = ['north', 'northeast', 'east', 'southeast', 'south', 'southwest', 'west', 'northwest']
  return names[Math.round(bearing / 45) % 8]
}
