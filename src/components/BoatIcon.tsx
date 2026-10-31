import { PixelIcon } from './PixelIcon'

// A small boat seen from above, bow pointing up (rotate it to show the course).
const ROWS = [
  '....oo....',
  '...o##o...',
  '..o####o..',
  '..o####o..',
  '.o######o.',
  '.o##ww##o.',
  '.o##ww##o.',
  '.o##ww##o.',
  '.o######o.',
  '.o######o.',
  '..oooooo..',
]

export function BoatIcon({ size = 18, color = 'currentColor' }: { size?: number; color?: string }) {
  return <PixelIcon rows={ROWS} colors={{ '#': color, w: '#ffffff', o: '#ffffff' }} size={size} />
}
