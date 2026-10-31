import { useMemo, useState } from 'react'
import { useSightings } from './hooks/useSightings'
import { useDetections, useHydrophones } from './hooks/useHydrophones'
import { useLiveAudio } from './hooks/useLiveAudio'
import { ListenPanel } from './components/ListenPanel'
import { HeadphonesIcon } from './components/HeadphonesIcon'
import { isRecent, latestWhaleDetection } from './lib/hydrophones'
import { computeAlert } from './lib/alert'
import { useBoats } from './hooks/useBoats'
import { describePlace, findGatherings } from './lib/boats'
import { BoatDetail } from './components/BoatDetail'
import { BoatIcon } from './components/BoatIcon'
import { Intro } from './intro/Intro'
import { AlertBanner } from './components/AlertBanner'
import { Map } from './components/Map'
import { SightingsList } from './components/SightingsList'
import { SightingDetail } from './components/SightingDetail'
import { PodGuide } from './components/PodGuide'
import { OrcaIcon } from './components/OrcaIcon'
import { timeAgo } from './lib/format'
import type { PodKey } from './lib/species'

type SpeciesFilter = 'all' | 'orca' | PodKey
type Tab = 'sightings' | 'listen' | 'pods'

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

// Intro animation: plays automatically on the first visit (remembered in this browser).
// ?intro=1 always plays it, ?intro=0 never does (handy for sharing preview links),
// and ?introAt=8000 freezes it at that moment (in ms), for checking single frames.
const INTRO_SEEN_KEY = 'whale-tracker:intro-seen'

function introFromUrl(): { show: boolean; freezeAt: number | null } {
  try {
    const q = new URLSearchParams(window.location.search)
    const at = q.get('introAt')
    if (at !== null) return { show: true, freezeAt: Number(at) }
    if (q.get('intro') === '0') return { show: false, freezeAt: null }
    if (q.has('intro')) return { show: true, freezeAt: null }
  } catch {
    // fall through
  }
  let seen = false
  try {
    seen = localStorage.getItem(INTRO_SEEN_KEY) === 'yes'
  } catch {
    // storage unavailable: play it
  }
  return { show: !seen, freezeAt: null }
}

function rememberIntroSeen() {
  try {
    localStorage.setItem(INTRO_SEEN_KEY, 'yes')
  } catch {
    // storage unavailable: it will play again next time
  }
}

export default function App() {
  const [intro, setIntro] = useState(introFromUrl)
  const { data, isLoading, dataUpdatedAt } = useSightings()
  const [filter, setFilter] = useState<SpeciesFilter>('all')
  const [rangeHours, setRangeHours] = useState(72)
  const [tab, setTab] = useState<Tab>('sightings')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [focusedHydrophoneId, setFocusedHydrophoneId] = useState<string | null>(null)
  const hydrophonesQuery = useHydrophones()
  const detectionsQuery = useDetections()
  const audio = useLiveAudio()
  const hydrophones = hydrophonesQuery.data ?? []
  const detections = detectionsQuery.data ?? []

  const all = data?.sightings ?? []

  const { boats } = useBoats()
  const gatherings = useMemo(() => findGatherings(boats), [boats])
  const [showBoats, setShowBoats] = useState(() => {
    try {
      return localStorage.getItem('whale-tracker:show-boats') !== 'off'
    } catch {
      return true
    }
  })
  const toggleBoats = () => {
    setShowBoats((on) => {
      try {
        localStorage.setItem('whale-tracker:show-boats', on ? 'off' : 'on')
      } catch {
        // remember for this visit only
      }
      return !on
    })
  }
  const [selectedBoatId, setSelectedBoatId] = useState<string | null>(null)
  const [selectedGatheringId, setSelectedGatheringId] = useState<string | null>(null)
  const selectedBoat = boats.find((b) => b.mmsi === selectedBoatId) ?? null
  const selectedGathering = gatherings.find((g) => g.id === selectedGatheringId) ?? null
  const latestGathering = [...gatherings].sort((a, b) => b.time.localeCompare(a.time))[0]

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

  // The most recent hydrophone with whale sounds reported in the last couple of hours.
  const hotHydrophone = hydrophones
    .map((h) => ({ h, d: latestWhaleDetection(detections, h.id) }))
    .filter((x) => isRecent(x.d))
    .sort((a, b) => b.d!.time.getTime() - a.d!.time.getTime())[0]

  // Same logic as /api/alert (what the whale lamp shows). Sample data never triggers it.
  const alert = useMemo(
    () => computeAlert(data?.live ? all : [], detections, hydrophones),
    [data?.live, all, detections, hydrophones],
  )

  const openHydrophone = (id: string) => {
    setFocusedHydrophoneId(id)
    setTab('listen')
  }

  // On phones the page scrolls; bring the map back into view when something is picked from the list.
  const showMapOnPhone = () => {
    if (window.matchMedia('(max-width: 760px)').matches && window.scrollY > 0) {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const select = (id: string) => {
    showMapOnPhone()
    setSelectedId(id)
    setSelectedBoatId(null)
    setSelectedGatheringId(null)
    setTab('sightings')
  }

  const selectBoat = (mmsi: string) => {
    showMapOnPhone()
    setSelectedBoatId(mmsi)
    setSelectedGatheringId(null)
    setSelectedId(null)
    setTab('sightings')
  }

  const selectGathering = (id: string) => {
    showMapOnPhone()
    setSelectedGatheringId(id)
    setSelectedBoatId(null)
    setSelectedId(null)
    setTab('sightings')
  }

  const clearBoat = () => {
    setSelectedBoatId(null)
    setSelectedGatheringId(null)
  }

  return (
    <div className="app">
      {intro.show && (
        <Intro
          freezeAt={intro.freezeAt}
          onDone={() => {
            rememberIntroSeen()
            setIntro({ show: false, freezeAt: null })
          }}
        />
      )}
      <header className="app-header">
        <div className="brand">
          <button
            className="brand-icon"
            onClick={() => setIntro({ show: true, freezeAt: null })}
            aria-label="Replay the intro"
            title="Replay the intro"
          >
            <OrcaIcon size={40} />
          </button>
          <div>
            <h1>Whale Tracker</h1>
            <p className="tagline">Salish Sea sightings</p>
          </div>
        </div>
        <div className={`status ${data?.live ? 'status-live' : 'status-sample'}`}>
          {isLoading ? 'Loading…' : data?.live ? `Live · updated ${timeAgo(new Date(dataUpdatedAt))}` : 'Sample data'}
        </div>
      </header>

      <AlertBanner
        alert={alert}
        onOpen={() => {
          if (alert.sightingId) {
            setRangeHours(Infinity)
            setFilter('all')
            select(alert.sightingId)
          } else if (alert.hydrophoneId) openHydrophone(alert.hydrophoneId)
        }}
      />

      <main className="app-body">
        <section className="map-pane">
          <Map
            sightings={visible}
            selectedId={selectedId}
            onSelect={select}
            hydrophones={hydrophones}
            detections={detections}
            playingHydrophoneId={audio.playingId}
            onSelectHydrophone={openHydrophone}
            boats={boats}
            gatherings={gatherings}
            showBoats={showBoats}
            onToggleBoats={toggleBoats}
            selectedBoatId={selectedBoatId}
            onSelectBoat={selectBoat}
            onSelectGathering={selectGathering}
          />
        </section>

        <aside className="side-pane">
          <div className="tabs" role="tablist">
            <button role="tab" aria-selected={tab === 'sightings'} onClick={() => setTab('sightings')}>
              Sightings <span className="tab-count">{visible.length}</span>
            </button>
            <button role="tab" aria-selected={tab === 'listen'} onClick={() => setTab('listen')}>
              Listen live {audio.playingId && <span className="live-dot tab-live" />}
            </button>
            <button role="tab" aria-selected={tab === 'pods'} onClick={() => setTab('pods')}>
              Pods
            </button>
          </div>

          {tab === 'listen' ? (
            <ListenPanel
              hydrophones={hydrophonesQuery.data}
              detections={detections}
              loading={hydrophonesQuery.isLoading}
              failed={hydrophonesQuery.isError}
              focusedId={focusedHydrophoneId}
              audio={audio}
            />
          ) : tab === 'pods' ? (
            <PodGuide sightings={all} onSelect={select} />
          ) : selectedBoat || selectedGathering ? (
            <BoatDetail boat={selectedBoat} gathering={selectedGathering} onSelectBoat={selectBoat} onBack={clearBoat} />
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
              {hotHydrophone && (
                <button className="heard-callout" onClick={() => openHydrophone(hotHydrophone.h.id)}>
                  <HeadphonesIcon size={16} />
                  <span>
                    Whale sounds heard at <strong>{hotHydrophone.h.name}</strong> {timeAgo(hotHydrophone.d!.time)}. Listen live →
                  </span>
                </button>
              )}
              {showBoats && latestGathering && (
                <button className="boats-callout" onClick={() => selectGathering(latestGathering.id)}>
                  <BoatIcon size={22} color="#ea580c" />
                  <span>
                    <strong>{latestGathering.boats.length} whale-watch boats gathered</strong>{' '}
                    {describePlace(latestGathering)}, {timeAgo(new Date(latestGathering.time))}. Whales likely nearby →
                  </span>
                </button>
              )}
              {orcaCount > 0 && filter === 'all' && (
                <p className="orca-callout">
                  <OrcaIcon size={22} /> {orcaCount} orca {orcaCount === 1 ? 'sighting' : 'sightings'} in this period
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
