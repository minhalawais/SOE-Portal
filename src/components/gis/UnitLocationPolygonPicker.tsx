import { useEffect, useMemo, useState } from 'react'
import { MapContainer, Polygon, TileLayer, Tooltip, useMap } from 'react-leaflet'
import { TextField } from '@/design-system/components/Fields'
import {
  buildParcelPolygon,
  filterUnitPlaces,
  locationPolygon,
  type UnitPlaceOption,
} from '@/components/gis/unitLocationPolygon'
import type { OrganizationLocation } from '@/types/domain'
import { cn } from '@/utils'

export type SelectedUnitPolygon = {
  label: string
  province: string
  district: string
  latitude: number
  longitude: number
  polygon: Array<[number, number]>
}

function FitPolygon({ polygon }: { polygon?: Array<[number, number]> }) {
  const map = useMap()
  useEffect(() => {
    if (!polygon?.length) {
      map.setView([30.3753, 69.3451], 5)
      return
    }
    map.fitBounds(polygon, { padding: [28, 28], maxZoom: 13, animate: true })
  }, [map, polygon])
  return null
}

export function UnitLocationPolygonPicker({
  kind,
  selectedPolygon,
  existing,
  disabled,
  onSelect,
}: {
  kind: OrganizationLocation['kind']
  selectedPolygon?: Array<[number, number]>
  existing: OrganizationLocation[]
  disabled?: boolean
  onSelect: (selection: SelectedUnitPolygon) => void
}) {
  const [query, setQuery] = useState('')
  const matches = useMemo(() => filterUnitPlaces(query), [query])
  const candidatePolygons = useMemo(
    () =>
      matches.map((place) => ({
        place,
        polygon: buildParcelPolygon(place.latitude, place.longitude, place.id, kind),
      })),
    [kind, matches],
  )

  const selectPlace = (place: UnitPlaceOption) => {
    if (disabled) return
    onSelect({
      label: place.name,
      province: place.province,
      district: place.district,
      latitude: place.latitude,
      longitude: place.longitude,
      polygon: buildParcelPolygon(place.latitude, place.longitude, place.id, kind),
    })
  }

  return (
    <div className="space-y-2">
      <TextField
        label="Search location"
        value={query}
        disabled={disabled}
        placeholder="City or district"
        hint={
          selectedPolygon?.length
            ? 'Polygon selected. Search again to change the footprint.'
            : 'Search, then click a polygon on the map. Pins are not used.'
        }
        onChange={(event) => setQuery(event.target.value)}
      />
      {matches.length ? (
        <ul className="max-h-28 overflow-y-auto rounded-md border border-soe-border bg-white text-sm">
          {matches.map((place) => (
            <li key={place.id}>
              <button
                type="button"
                disabled={disabled}
                className="flex w-full items-baseline justify-between gap-2 px-3 py-1.5 text-left hover:bg-soe-canvas"
                onClick={() => selectPlace(place)}
              >
                <span className="font-medium text-soe-navy">{place.name}</span>
                <span className="text-[11px] text-soe-slate">
                  {place.district} · {place.province}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="h-[240px] overflow-hidden rounded-md border border-soe-border">
        <MapContainer
          center={[30.3753, 69.3451]}
          zoom={5}
          className={cn('h-full w-full', disabled && 'pointer-events-none')}
          scrollWheelZoom
        >
          <TileLayer
            attribution="&copy; OpenStreetMap"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <FitPolygon polygon={selectedPolygon} />
          {existing.map((location) => (
            <Polygon
              key={location.id}
              positions={locationPolygon(location)}
              pathOptions={{ color: '#94a3b8', weight: 1, fillOpacity: 0.12 }}
            >
              <Tooltip>{location.label}</Tooltip>
            </Polygon>
          ))}
          {candidatePolygons.map(({ place, polygon }) => (
            <Polygon
              key={place.id}
              positions={polygon}
              pathOptions={{ color: '#0369a1', weight: 2, fillOpacity: 0.22 }}
              eventHandlers={{
                click: () => selectPlace(place),
              }}
            >
              <Tooltip>{place.name}</Tooltip>
            </Polygon>
          ))}
          {selectedPolygon?.length ? (
            <Polygon
              positions={selectedPolygon}
              pathOptions={{ color: '#12304a', weight: 3, fillColor: '#0369a1', fillOpacity: 0.35 }}
            />
          ) : null}
        </MapContainer>
      </div>
    </div>
  )
}
