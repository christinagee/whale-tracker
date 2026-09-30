import { useMemo, useState } from 'react'
import { useSightings } from './hooks/useSightings'
import { Map } from './components/Map'
import { SightingsList } from './components/SightingsList'
import { SightingDetail } from './components/SightingDetail'
import { PodGuide } from './components/PodGuide'
import { OrcaIcon } from './components/OrcaIcon'
import { timeAgo } from './lib/format'
import type { PodKey } from './lib/species'

type SpeciesFilter = 'all' | 'orca' | PodKey
type Tab = 'sightings' | 'pods'

const RANGES = [
  { label: '24 hrs', hours: 24 },
  { label: '3 days', hours: 72 },
  { label: '7 days', hours: 168 },
  { label: 'All', hours: Infinity },
]

const FILTERS: { key: SpeciesFilter; label: string }[] = [
  { key: 'all', label: 'All whales' },
  { key: 'orca', label: 'Orcas' },
  { key: 'J', label: 'J pod' },
  { key: 'K', label: 'K pod' },
  { key: 'L', label: 'L pod' },
  { key: 'Biggs', label: "Bigg's" },
]

export default function App() {
  const { data, isLoading, dataUpdatedAt } = useSightings()
  const [filter, setFilter] = useState<SpeciesFilter>('all')
  const [rangeHours, setRangeHours] = useState(72)
  const [tab, setTab] = useState<Tab>('sightings')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const all = data?.sightings ?? []

  const visible = useMemo(() => {
    const cutoff = Date.now() - rangeHours * 60 * 60 * 1000
    return all.filter((s) => {
      if (s.time.getTime() < cutoff) return false
      if (filter === 'all') return true
      if (filter === 'orca') return s.species === 'orca'
      return s.pods.includes(filter)
    })
  }, [all, filter, rangeHours])

  const selected = all.find((s) => s.id === selectedId) ?? null
  const orcaCount = visible.filter((s) => s.species === 'orca').length

  const select = (id: string) => {
    setSelectedId(id)
    setTab('sightings')
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="brand">
          <span className="brand-icon">
            <OrcaIcon size={26} />
          </span>
          <div>
            <h1>Whale Tracker</h1>
            <p className="tagline">Salish Sea sightings</p>
          </div>
        </div>
        <div className={`status ${data?.live ? 'status-live' : 'status-sample'}`}>
          {isLoading ? 'Loading…' : data?.live ? `Live · updated ${timeAgo(new Date(dataUpdatedAt))}` : 'Sample data'}
        </div>
      </header>

      <main className="app-body">
        <section className="map-pane">
          <Map sightings={visible} selectedId={selectedId} onSelect={select} />
        </section>

        <aside className="side-pane">
          <div className="tabs" role="tablist">
            <button role="tab" aria-selected={tab === 'sightings'} onClick={() => setTab('sightings')}>
              Sightings <span className="tab-count">{visible.length}</span>
            </button>
            <button role="tab" aria-selected={tab === 'pods'} onClick={() => setTab('pods')}>
              Meet the pods
            </button>
          </div>

          {tab === 'pods' ? (
            <PodGuide sightings={all} onSelect={select} />
          ) : selected ? (
            <SightingDetail sighting={selected} onBack={() => setSelectedId(null)} />
          ) : (
            <>
              <div className="filters">
                <div className="chips">
                  {FILTERS.map((f) => (
                    <button
                      key={f.key}
                      className={`chip ${filter === f.key ? 'chip-on' : ''}`}
                      onClick={() => setFilter(f.key)}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
                <div className="chips chips-small">
                  {RANGES.map((r) => (
                    <button
                      key={r.label}
                      className={`chip ${rangeHours === r.hours ? 'chip-on' : ''}`}
                      onClick={() => setRangeHours(r.hours)}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>
              {orcaCount > 0 && filter === 'all' && (
                <p className="orca-callout">
                  <OrcaIcon size={16} /> {orcaCount} orca {orcaCount === 1 ? 'sighting' : 'sightings'} in this period
                </p>
              )}
              {!data?.live && !isLoading && (
                <p className="sample-note">
                  Showing sample sightings. Live sightings appear on the deployed site (they can't load when running locally).
                </p>
              )}
              <SightingsList sightings={visible} onSelect={select} />
            </>
          )}
        </aside>
      </main>
    </div>
  )
}
