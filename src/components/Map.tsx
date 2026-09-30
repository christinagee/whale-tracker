import { useEffect, useMemo, useRef } from 'react'
import MapGL, { Layer, Marker, NavigationControl, Source, type MapRef } from 'react-map-gl/maplibre'
import type { Sighting } from '../api/acartia'
import type { Detection, Hydrophone } from '../api/orcasound'
import { isRecent, latestWhaleDetection } from '../lib/hydrophones'
import { HeadphonesIcon } from './HeadphonesIcon'
import { ALERT_CONFIG } from '../lib/alert'
import { SPECIES } from '../lib/species'
import { bearingDeg, buildTracks, freshness, type Track } from '../lib/tracks'
import { OrcaIcon } from './OrcaIcon'
import { timeAgo } from '../lib/format'
import { newestSighting } from '../lib/sightings'
import '../styles/Map.css'

const STYLE_URL = import.meta.env.VITE_MAP_STYLE_URL || 'https://tiles.openfreemap.org/styles/liberty'

// From the San Juan Islands down to Seattle and Tacoma.
const INITIAL_VIEW = {
  bounds: [
    [-123.35, 47.25],
    [-122.2, 48.75],
  ] as [[number, number], [number, number]],
  fitBoundsOptions: { padding: 20 },
}

const POD_COLORS: Record<string, string> = { J: '#0369a1', K: '#7c3aed', L: '#047857', SRKW: '#0f766e', Biggs: '#b45309' }

function trackColor(t: Track): string {
  return t.pods.length > 0 ? POD_COLORS[t.pods[0]] : SPECIES[t.species].color
}

interface Props {
  sightings: Sighting[]
  selectedId: string | null
  onSelect: (id: string) => void
  hydrophones: Hydrophone[]
  detections: Detection[]
  playingHydrophoneId: string | null
  onSelectHydrophone: (id: string) => void
}

export function Map({ sightings, selectedId, onSelect, hydrophones, detections, playingHydrophoneId, onSelectHydrophone }: Props) {
  const mapRef = useRef<MapRef>(null)
  const selected = sightings.find((s) => s.id === selectedId)

  useEffect(() => {
    if (selected) {
      mapRef.current?.flyTo({
        center: [selected.longitude, selected.latitude],
        zoom: Math.max(mapRef.current.getZoom(), 9.5),
        duration: 900,
      })
    }
  }, [selected])

  const now = Date.now()
  const tracks = useMemo(() => buildTracks(sightings), [sightings])

  // Earlier reports in a path are drawn as small trail dots; the newest gets the full marker.
  const trailIds = useMemo(() => {
    const ids = new Set<string>()
    for (const t of tracks) t.points.slice(0, -1).forEach((p) => ids.add(p.id))
    return ids
  }, [tracks])

  const paths = useMemo(
    () => ({
      type: 'FeatureCollection' as const,
      features: tracks
        .filter((t) => t.points.length > 1)
        .map((t) => ({
          type: 'Feature' as const,
          properties: { color: trackColor(t), opacity: freshness(t.points[t.points.length - 1].time, now) },
          geometry: { type: 'LineString' as const, coordinates: t.points.map((p) => [p.longitude, p.latitude]) },
        })),
    }),
    [tracks, now],
  )

  const latest = newestSighting(sightings)

  // Draw oldest first so the newest sightings sit on top.
  const ordered = [...sightings].reverse()

  return (
    <div className="map-wrap">
      <MapGL ref={mapRef} initialViewState={INITIAL_VIEW} mapStyle={STYLE_URL} style={{ width: '100%', height: '100%' }}>
        <NavigationControl position="top-right" showCompass={false} />
        <Source id="paths" type="geojson" data={paths}>
          <Layer
            id="paths-line"
            type="line"
            layout={{ 'line-cap': 'round', 'line-join': 'round' }}
            paint={{
              'line-color': ['get', 'color'],
              'line-opacity': ['get', 'opacity'],
              'line-width': 3,
              'line-dasharray': [2, 1.5],
            }}
          />
        </Source>
        {tracks
          .filter((t) => t.points.length > 1)
          .flatMap((t) =>
            t.points.slice(1).map((b, i) => {
              const a = t.points[i]
              return (
                <Marker
                  key={`arrow-${b.id}`}
                  latitude={(a.latitude + b.latitude) / 2}
                  longitude={(a.longitude + b.longitude) / 2}
                  anchor="center"
                  rotation={bearingDeg(a, b)}
                  rotationAlignment="map"
                  style={{ pointerEvents: 'none' }}
                >
                  <span className="path-arrow" style={{ borderBottomColor: trackColor(t), opacity: freshness(b.time, now) }} />
                </Marker>
              )
            }),
          )}
        <Marker latitude={ALERT_CONFIG.home.latitude} longitude={ALERT_CONFIG.home.longitude} anchor="center">
          <span className="home-marker" title={`${ALERT_CONFIG.home.name}: the alert measures distance from here`}>
            ★ {ALERT_CONFIG.home.name}
          </span>
        </Marker>
        {hydrophones.map((h) => {
          const hot = isRecent(latestWhaleDetection(detections, h.id))
          const on = h.id === playingHydrophoneId
          return (
            <Marker
              key={h.id}
              latitude={h.latitude}
              longitude={h.longitude}
              anchor="center"
              style={{ zIndex: 4 }}
              onClick={(e) => {
                e.originalEvent.stopPropagation()
                onSelectHydrophone(h.id)
              }}
            >
              <button
                className={`hydro-marker ${hot ? 'hydro-marker-hot' : ''} ${on ? 'hydro-marker-on' : ''}`}
                aria-label={`${h.name} hydrophone`}
                title={`${h.name} hydrophone: tap to listen`}
              >
                <HeadphonesIcon size={14} />
              </button>
            </Marker>
          )
        })}
        {ordered.map((s) => {
          const isOrca = s.species === 'orca'
          const isSelected = s.id === selectedId
          const isLatest = s.id === latest?.id
          const isTrail = trailIds.has(s.id) && !isSelected && !isLatest
          const opacity = isSelected || isLatest ? 1 : freshness(s.time, now)
          return (
            <Marker
              key={s.id}
              latitude={s.latitude}
              longitude={s.longitude}
              anchor="center"
              style={{ zIndex: isSelected ? 4 : isLatest ? 3 : isTrail ? 0 : isOrca ? 2 : 1 }}
              onClick={(e) => {
                e.originalEvent.stopPropagation()
                onSelect(s.id)
              }}
            >
              {isTrail ? (
                <button
                  className="marker-trail"
                  style={{ background: SPECIES[s.species].color, opacity }}
                  aria-label={`Earlier ${s.speciesLabel} sighting`}
                />
              ) : (
                <button
                  className={`marker ${isOrca ? 'marker-orca' : ''} ${isSelected ? 'marker-selected' : ''} ${isLatest ? 'marker-latest' : ''}`}
                  style={{ background: SPECIES[s.species].color, opacity }}
                  aria-label={`${s.speciesLabel} sighting`}
                >
                  {isOrca ? <OrcaIcon size={20} /> : null}
                  {isOrca && s.pods.length > 0 && (
                    <span className="marker-pod">
                      {s.pods.map((p) => (p === 'Biggs' ? 'T' : p === 'SRKW' ? 'SR' : p)).join('')}
                    </span>
                  )}
                  {isLatest && <span className="latest-label">Latest · {timeAgo(s.time)}</span>}
                </button>
              )}
            </Marker>
          )
        })}
      </MapGL>
      {latest && (
        <button className="latest-button" onClick={() => onSelect(latest.id)}>
          <span className="latest-dot" /> Latest sighting
        </button>
      )}
      <div className="map-key">
        <span><span className="key-fade" /> Faded = older report</span>
        <span><span className="key-path" /> Path of the same group</span>
      </div>
    </div>
  )
}
