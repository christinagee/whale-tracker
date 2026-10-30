import type { Boat, Gathering } from '../lib/boats'
import { ageMinutes, boatStatus, describePlace, STALE_MIN } from '../lib/boats'
import { timeAgo } from '../lib/format'
import { BoatIcon } from './BoatIcon'
import '../styles/Boats.css'

const STATUS_TEXT = { moving: 'Under way', slow: 'Going slowly or stopped', harbor: 'In harbor' }

const COMPASS = ['north', 'northeast', 'east', 'southeast', 'south', 'southwest', 'west', 'northwest']

function BoatFacts({ boat }: { boat: Boat }) {
  const old = ageMinutes(boat.time) > STALE_MIN
  const status = boatStatus(boat)
  return (
    <dl className="boat-facts">
      <dt>Company</dt>
      <dd>{boat.operator ?? 'Unknown'}{boat.homePort ? ` · ${boat.homePort}` : ''}</dd>
      <dt>Last report</dt>
      <dd>
        {timeAgo(new Date(boat.time))}
        {old && <span className="boat-old"> (old position)</span>}
      </dd>
      <dt>Where</dt>
      <dd>{describePlace(boat)}</dd>
      <dt>Status</dt>
      <dd>{STATUS_TEXT[status]}</dd>
      {boat.speedKnots !== null && (
        <>
          <dt>Speed</dt>
          <dd>
            {boat.speedKnots.toFixed(1)} knots
            {boat.courseDeg !== null && status === 'moving' && `, heading ${COMPASS[Math.round(boat.courseDeg / 45) % 8]}`}
          </dd>
        </>
      )}
    </dl>
  )
}

interface Props {
  boat: Boat | null
  gathering: Gathering | null
  onSelectBoat: (mmsi: string) => void
  onBack: () => void
}

export function BoatDetail({ boat, gathering, onSelectBoat, onBack }: Props) {
  return (
    <article className="boat-detail">
      <button className="back" onClick={onBack}>
        ← All sightings
      </button>
      {gathering ? (
        <>
          <h2>
            <span className="boat-badge"><BoatIcon size={18} color="#ea580c" /></span>
            {gathering.boats.length} whale-watch boats gathered
          </h2>
          <p className="gathering-note">
            {describePlace(gathering)}, {timeAgo(new Date(gathering.time))}. Tour boats slowing down together away from
            harbor usually means <strong>whales nearby</strong>. By law boats keep their distance (1,000 yards from
            Southern Resident orcas), so the whales may be up to half a mile away.
          </p>
          <ul className="gathering-boats">
            {gathering.boats.map((b) => (
              <li key={b.mmsi}>
                <button onClick={() => onSelectBoat(b.mmsi)}>
                  <strong>{b.name}</strong> <span className="muted">· {b.operator}</span>
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : boat ? (
        <>
          <h2>
            <span className="boat-badge"><BoatIcon size={18} color="#ea580c" /></span>
            {boat.name ?? `Boat ${boat.mmsi}`}
          </h2>
          <p className="muted boat-kind">Whale-watching boat</p>
          <BoatFacts boat={boat} />
        </>
      ) : null}
      <p className="boat-disclaimer">
        Boat positions come from public AIS broadcasts via aisstream.io. They can be delayed, incomplete or wrong, and
        not every whale-watch boat broadcasts. Not for navigation. The fleet list is our own pick of local tour boats
        and doesn't imply any endorsement or affiliation.
      </p>
    </article>
  )
}
