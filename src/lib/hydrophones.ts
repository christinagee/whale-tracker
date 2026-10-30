import type { Detection } from '../api/orcasound'

/** Whale calls reported within this window count as "heard recently". */
export const RECENT_MS = 2 * 60 * 60 * 1000

export function latestWhaleDetection(detections: Detection[], hydrophoneId: string): Detection | undefined {
  return detections.find((d) => d.hydrophoneId === hydrophoneId && d.category === 'whale')
}

export function isRecent(d: Detection | undefined, now = Date.now()): d is Detection {
  return !!d && now - d.time.getTime() < RECENT_MS
}

export function detectionSourceLabel(d: Detection): string {
  if (d.source === 'machine') return 'AI detector'
  return d.listenerCount && d.listenerCount > 1 ? `Listener (${d.listenerCount} listening)` : 'Listener'
}
