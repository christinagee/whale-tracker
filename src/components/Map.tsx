import { useEffect, useRef } from 'react'
import MapGL, { Marker, NavigationControl, type MapRef } from 'react-map-gl/maplibre'
import type { Sighting } from '../api/acartia'
import { SPECIES } from '../lib/species'
import { OrcaIcon } from './OrcaIcon'
import '../styles/Map.css'

const STYLE_URL = import.meta.env.VITE_MAP_STYLE_URL || 'https://tiles.openfreemap.org/styles/liberty'

// Centered on the San Juan Islands.
const INITIAL_VIEW = { latitude: 48.45, longitude: -123.0, zoom: 7.6 }

interface Props {
  sightings: Sighting[]
  selectedId: string | null
  onSelect: (id: string) => void
}

export function Map({ sightings, selectedId, onSelect }: Props) {
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

  // Draw oldest first so the newest sightings sit on top.
  const ordered = [...sightings].reverse()

  return (
    <div className="map-wrap">
      <MapGL ref={mapRef} initialViewState={INITIAL_VIEW} mapStyle={STYLE_URL} style={{ width: '100%', height: '100%' }}>
        <NavigationControl position="top-right" showCompass={false} />
        {ordered.map((s) => {
          const isOrca = s.species === 'orca'
          const isSelected = s.id === selectedId
          return (
            <Marker
              key={s.id}
              latitude={s.latitude}
              longitude={s.longitude}
              anchor="center"
              style={{ zIndex: isSelected ? 3 : isOrca ? 2 : 1 }}
              onClick={(e) => {
                e.originalEvent.stopPropagation()
                onSelect(s.id)
              }}
            >
              <button
                className={`marker ${isOrca ? 'marker-orca' : ''} ${isSelected ? 'marker-selected' : ''}`}
                style={{ background: SPECIES[s.species].color }}
                aria-label={`${s.speciesLabel} sighting`}
              >
                {isOrca ? <OrcaIcon size={20} /> : null}
                {isOrca && s.pods.length > 0 && (
                  <span className="marker-pod">{s.pods.map((p) => (p === 'Biggs' ? 'T' : p === 'SRKW' ? 'SR' : p)).join('')}</span>
                )}
              </button>
            </Marker>
          )
        })}
      </MapGL>
    </div>
  )
}
