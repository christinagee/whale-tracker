import type { Sighting } from '../api/acartia'
import { PODS, type PodKey } from '../lib/species'
import { timeAgo } from '../lib/format'
import '../styles/PodGuide.css'

const ORDER: PodKey[] = ['J', 'K', 'L', 'Biggs']

interface Props {
  sightings: Sighting[]
  onSelect: (id: string) => void
}

export function PodGuide({ sightings, onSelect }: Props) {
  return (
    <div className="pod-guide">
      <p className="pod-intro">
        Two kinds of orca live in the Salish Sea. The <strong>Southern Residents</strong> (J, K and L pods) eat salmon.{' '}
        <strong>Bigg's killer whales</strong> hunt marine mammals.
      </p>
      {ORDER.map((key) => {
        const pod = PODS[key]
        const latest = sightings.find((s) => s.pods.includes(key))
        return (
          <section key={key} className={`pod-card pod-card-${key}`}>
            <header>
              <span className={`pod-letter pod-${key}`}>{pod.short}</span>
              <h3>{pod.name}</h3>
            </header>
            <p>{pod.blurb}</p>
            {latest ? (
              <button className="pod-latest" onClick={() => onSelect(latest.id)}>
                Last reported {timeAgo(latest.time)} → show on map
              </button>
            ) : (
              <p className="pod-none">No recent reports in the current feed.</p>
            )}
          </section>
        )
      })}
      <p className="pod-links">
        Learn more at the <a href="https://www.whaleresearch.com/" target="_blank" rel="noreferrer">Center for Whale Research</a>{' '}
        and <a href="https://www.orcanetwork.org/" target="_blank" rel="noreferrer">Orca Network</a>.
      </p>
    </div>
  )
}
