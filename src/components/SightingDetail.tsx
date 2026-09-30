import type { Sighting } from '../api/acartia'
import { PODS, SPECIES } from '../lib/species'
import { formatDateTime, timeAgo } from '../lib/format'
import { PodBadges } from './PodBadges'
import '../styles/SightingDetail.css'

interface Props {
  sighting: Sighting
  onBack: () => void
}

export function SightingDetail({ sighting: s, onBack }: Props) {
  return (
    <article className="detail">
      <button className="back" onClick={onBack}>
        ← All sightings
      </button>
      <h2>
        <span className="detail-dot" style={{ background: SPECIES[s.species].color }} />
        {s.speciesLabel}
      </h2>
      <PodBadges pods={s.pods} />
      <dl>
        <dt>When</dt>
        <dd>
          {formatDateTime(s.time)} <span className="muted">({timeAgo(s.time)})</span>
        </dd>
        {s.count ? (
          <>
            <dt>How many</dt>
            <dd>{s.count}</dd>
          </>
        ) : null}
        <dt>Where</dt>
        <dd>
          {s.latitude.toFixed(3)}, {s.longitude.toFixed(3)}
        </dd>
        {s.source && (
          <>
            <dt>Reported by</dt>
            <dd>{s.source}</dd>
          </>
        )}
      </dl>
      {s.comments && <p className="detail-comments">“{s.comments}”</p>}
      {s.photoUrl && <img className="detail-photo" src={s.photoUrl} alt={`${s.speciesLabel} sighting`} />}
      {s.pods.map((p) => (
        <aside key={p} className="detail-pod">
          <strong>About {PODS[p].name}</strong>
          <p>{PODS[p].blurb}</p>
        </aside>
      ))}
    </article>
  )
}
