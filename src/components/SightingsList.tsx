import type { Sighting } from '../api/acartia'
import { SPECIES } from '../lib/species'
import { timeAgo } from '../lib/format'
import { newestSighting } from '../lib/sightings'
import { OrcaIcon } from './OrcaIcon'
import { PodBadges } from './PodBadges'
import '../styles/SightingsList.css'

// Species with their own picture in the list (the map keeps simple dots for everything but orcas).
const LIST_PICTURES: Partial<Record<Sighting['species'], string>> = {
  humpback: '/pixel/humpback-32.png',
  gray: '/pixel/gray-whale-32.png',
}

interface Props {
  sightings: Sighting[]
  onSelect: (id: string) => void
}

export function SightingsList({ sightings, onSelect }: Props) {
  const latestId = newestSighting(sightings)?.id
  if (sightings.length === 0) {
    return <p className="empty">No sightings match these filters right now. Try a longer time range.</p>
  }
  return (
    <ul className="sightings-list">
      {sightings.map((s) => (
        <li key={s.id}>
          <button className="sighting-row" onClick={() => onSelect(s.id)}>
            {s.species === 'orca' ? (
              <span className="sighting-dot sighting-dot-picture">
                <OrcaIcon size={32} />
              </span>
            ) : LIST_PICTURES[s.species] ? (
              <span className="sighting-dot sighting-dot-picture">
                <img className="pixel-art" src={LIST_PICTURES[s.species]} width={32} height={32} alt="" draggable={false} />
              </span>
            ) : (
              <span className="sighting-dot" style={{ background: SPECIES[s.species].color }} />
            )}
            <span className="sighting-main">
              <span className="sighting-title">
                {SPECIES[s.species].label}
                {s.count ? <span className="sighting-count"> × {s.count}</span> : null}
                <PodBadges pods={s.pods} />
                {s.id === latestId && <span className="latest-badge">Latest</span>}
              </span>
              {s.comments && <span className="sighting-comment">{s.comments}</span>}
              {s.source && <span className="sighting-source">via {s.source}</span>}
            </span>
            <span className="sighting-time">{timeAgo(s.time)}</span>
          </button>
        </li>
      ))}
    </ul>
  )
}
