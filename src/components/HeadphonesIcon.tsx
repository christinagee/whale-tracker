import { PixelIcon } from './PixelIcon'

const ROWS = [
  '...####...',
  '..#....#..',
  '.#......#.',
  '#........#',
  '#........#',
  '##......##',
  '##......##',
  '##......##',
  '.#......#.',
]

export function HeadphonesIcon({ size = 16 }: { size?: number }) {
  return <PixelIcon rows={ROWS} colors={{ '#': 'currentColor' }} size={size} />
}
