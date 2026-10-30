import { useEffect, useRef } from 'react'
import type { Detection, Hydrophone } from '../api/orcasound'
import type { AudioStatus } from '../hooks/useLiveAudio'
import { detectionSourceLabel, isRecent, latestWhaleDetection } from '../lib/hydrophones'
import { timeAgo } from '../lib/format'
import { HeadphonesIcon } from './HeadphonesIcon'
import '../styles/ListenPanel.css'

interface Props {
  hydrophones: Hydrophone[] | undefined
  detections: Detection[]
  loading: boolean
  failed: boolean
  focusedId: string | null
  audio: { playingId: string | null; status: AudioStatus; error: string | null; play: (h: Hydrophone) => void; stop: () => void }
}

export function ListenPanel({ hydrophones, detections, loading, failed, focusedId, audio }: Props) {
  const cardRefs = useRef<Record<string, HTMLElement | null>>({})

  useEffect(() => {
    if (focusedId) cardRefs.current[focusedId]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [focusedId])

  const byId = new Map((hydrophones ?? []).map((h) => [h.id, h]))
  const recentWhale = detections.filter((d) => d.category === 'whale' && byId.has(d.hydrophoneId)).slice(0, 8)

  return (
    <div className="listen">
      <p className="listen-intro">
        Underwater microphones from <a href="https://www.orcasound.net/" target="_blank" rel="noreferrer">Orcasound</a>{' '}
        stream the sea live, 24/7. Orca calls sound like squeaky whistles and squeals. Headphones help!
      </p>

      {loading && <p className="listen-note">Loading hydrophones…</p>}
      {failed && (
        <p className="listen-note">
          Couldn't reach Orcasound just now. You can still listen at{' '}
          <a href="https://live.orcasound.net/" target="_blank" rel="noreferrer">live.orcasound.net</a>.
        </p>
      )}

      {hydrophones?.map((h) => {
        const latest = latestWhaleDetection(detections, h.id)
        const hot = isRecent(latest)
        const isThis = audio.playingId === h.id
        const isActive = isThis && audio.status !== 'error'
        return (
          <section
            key={h.id}
            ref={(el) => (cardRefs.current[h.id] = el)}
            className={`hydro-card ${hot ? 'hydro-hot' : ''} ${focusedId === h.id ? 'hydro-focused' : ''}`}
          >
            <div className="hydro-head">
              <span className="hydro-icon"><HeadphonesIcon size={18} /></span>
              <div className="hydro-name">
                <h3>{h.name}</h3>
                {latest ? (
                  <span className={`hydro-heard ${hot ? 'hydro-heard-hot' : ''}`}>
                    {hot ? '🐋 Whales heard ' : 'Whales last heard '}
                    {timeAgo(latest.time)}
                  </span>
                ) : (
                  <span className="hydro-heard">No recent whale reports</span>
                )}
              </div>
              <button
                className={`play ${isActive ? 'play-on' : ''}`}
                onClick={() => (isActive ? audio.stop() : audio.play(h))}
                aria-label={isActive ? `Stop ${h.name}` : `Listen to ${h.name}`}
              >
                {isActive ? (audio.status === 'loading' ? '…' : '■') : '▶'}
              </button>
            </div>
            {isThis && audio.status === 'playing' && (
              <p className="hydro-live">
                <span className="live-dot" /> Listening live
              </p>
            )}
            {isThis && audio.status === 'error' && (
              <p className="hydro-error">
                {audio.error}{' '}
                <a href={h.listenUrl} target="_blank" rel="noreferrer">Try on Orcasound →</a>
              </p>
            )}
            <a className="hydro-link" href={h.listenUrl} target="_blank" rel="noreferrer">
              Open on Orcasound ↗
            </a>
          </section>
        )
      })}

      {recentWhale.length > 0 && (
        <>
          <h4 className="listen-sub">Recent whale sounds reported</h4>
          <ul className="detections">
            {recentWhale.map((d) => (
              <li key={d.id}>
                <strong>{byId.get(d.hydrophoneId)?.name}</strong>
                <span className="muted"> · {timeAgo(d.time)} · {detectionSourceLabel(d)}</span>
                {d.description && <div className="detection-desc">“{d.description}”</div>}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
