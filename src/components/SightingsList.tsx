import type { Sighting } from '../api/acartia'
import { SPECIES } from '../lib/species'
import { timeAgo } from '../lib/format'
import { OrcaIcon } from './OrcaIcon'
import { PodBadges } from './PodBadges'
import '../styles/SightingsList.css'

interface Props {
  sightings: Sighting[]
  onSelect: (id: string) => void
}

export function SightingsList({ sightings, onSelect }: Props) {
  if (sightings.length === 0) {
    return <p className="empty">No sightings match these filters right now. Try a longer time range.</p>
  }
  return (
    <ul className="sightings-list">
      {sightings.map((s) => (
        <li key={s.id}>
          <button className="sighting-row" onClick={() => onSelect(s.id)}>
            <span className="sighting-dot" style={{ background: SPECIES[s.species].color }}>
              {s.species === 'orca' && <OrcaIcon size={16} />}
            </span>
            <span className="sighting-main">
              <span className="sighting-title">
                {SPECIES[s.species].label}
                {s.count ? <span className="sighting-count"> × {s.count}</span> : null}
                <PodBadges pods={s.pods} />
              </span>
              {s.comments && <span className="sighting-comment">{s.comments}</span>}
            </span>
            <span className="sighting-time">{timeAgo(s.time)}</span>
          </button>
        </li>
      ))}
    </ul>
  )
}
