import { useEffect, useMemo, useRef, useState } from 'react'
import { CircleMarker, MapContainer, Polygon, Polyline, TileLayer, Tooltip, useMap, useMapEvents } from 'react-leaflet'
import { DomEvent } from 'leaflet'
import { TextField } from '@/design-system/components/Fields'
import { Button } from '@/design-system/components/Button'
import {
  filterUnitPlaces,
  locationPolygon,
  nearestUnitPlace,
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

const ESRI_IMAGERY =
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
const ESRI_LABELS =
  'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}'
const ESRI_ROADS =
  'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}'

function polygonCentroid(polygon: Array<[number, number]>) {
  const latitude = polygon.reduce((sum, point) => sum + point[0], 0) / polygon.length
  const longitude = polygon.reduce((sum, point) => sum + point[1], 0) / polygon.length
  return { latitude, longitude }
}

function InitialView({
  polygon,
  existingPolygons,
}: {
  polygon?: Array<[number, number]>
  existingPolygons: Array<Array<[number, number]>>
}) {
  const map = useMap()
  const fitted = useRef(false)
  useEffect(() => {
    if (fitted.current) return
    fitted.current = true
    const target = polygon?.length ? [polygon] : existingPolygons.filter((item) => item.length >= 3)
    if (!target.length) {
      map.setView([30.3753, 69.3451], 6)
      return
    }
    map.fitBounds(target.flat(), { padding: [28, 28], maxZoom: 15 })
  }, [existingPolygons, map, polygon])
  return null
}

function FlyToPlace({ place }: { place: UnitPlaceOption | null }) {
  const map = useMap()
  useEffect(() => {
    if (!place) return
    map.setView([place.latitude, place.longitude], 16)
  }, [map, place])
  return null
}

function PolygonDrawLayer({
  disabled,
  selectedPolygon,
  onSelect,
  vertices,
  setVertices,
}: {
  disabled?: boolean
  selectedPolygon?: Array<[number, number]>
  onSelect: (selection: SelectedUnitPolygon) => void
  vertices: Array<[number, number]>
  setVertices: (next: Array<[number, number]>) => void
}) {
  const map = useMap()
  const [cursor, setCursor] = useState<[number, number] | null>(null)

  useEffect(() => {
    map.doubleClickZoom.disable()
    return () => {
      map.doubleClickZoom.enable()
    }
  }, [map])

  const commitPolygon = (ring: Array<[number, number]>) => {
    if (ring.length < 3) return
    const { latitude, longitude } = polygonCentroid(ring)
    const place = nearestUnitPlace(latitude, longitude)
    onSelect({
      label: place.name,
      province: place.province,
      district: place.district,
      latitude,
      longitude,
      polygon: ring,
    })
    setVertices([])
    setCursor(null)
  }

  useMapEvents({
    click(event) {
      if (disabled) return
      setVertices([...vertices, [event.latlng.lat, event.latlng.lng]])
    },
    mousemove(event) {
      if (disabled || vertices.length === 0) {
        setCursor(null)
        return
      }
      setCursor([event.latlng.lat, event.latlng.lng])
    },
    dblclick(event) {
      if (disabled) return
      DomEvent.stop(event.originalEvent)
      commitPolygon(vertices)
    },
  })

  const previewLine = cursor && vertices.length ? [...vertices, cursor] : vertices
  const closedRing = selectedPolygon?.length ? [...selectedPolygon, selectedPolygon[0]!] : []

  return (
    <>
      {selectedPolygon?.length && vertices.length === 0 ? (
        <Polygon
          positions={closedRing}
          pathOptions={{ color: '#f8fafc', weight: 3, fillColor: '#0ea5e9', fillOpacity: 0.35 }}
        />
      ) : null}
      {previewLine.length >= 2 ? (
        <Polyline
          positions={previewLine}
          pathOptions={{ color: '#38bdf8', weight: 2, dashArray: vertices.length >= 3 ? undefined : '6 4' }}
        />
      ) : null}
      {vertices.map((point, index) => (
        <CircleMarker
          key={`${point[0]}-${point[1]}-${index}`}
          center={point}
          radius={index === 0 ? 7 : 5}
          pathOptions={{
            color: '#f8fafc',
            weight: 2,
            fillColor: index === 0 ? '#f97316' : '#38bdf8',
            fillOpacity: 1,
          }}
          eventHandlers={{
            click: (event) => {
              DomEvent.stopPropagation(event)
              if (disabled) return
              if (index === 0 && vertices.length >= 3) commitPolygon(vertices)
            },
          }}
        >
          <Tooltip>
            {index === 0 && vertices.length >= 3
              ? 'Click to close the polygon'
              : `Point ${index + 1}`}
          </Tooltip>
        </CircleMarker>
      ))}
    </>
  )
}

export function UnitLocationPolygonPicker({
  selectedPolygon,
  existing,
  disabled,
  onSelect,
}: {
  kind?: OrganizationLocation['kind']
  selectedPolygon?: Array<[number, number]>
  existing: OrganizationLocation[]
  disabled?: boolean
  onSelect: (selection: SelectedUnitPolygon) => void
}) {
  const [query, setQuery] = useState('')
  const [focusPlace, setFocusPlace] = useState<UnitPlaceOption | null>(null)
  const [vertices, setVertices] = useState<Array<[number, number]>>([])
  const matches = useMemo(() => filterUnitPlaces(query), [query])
  const existingPolygons = useMemo(
    () => existing.map((location) => locationPolygon(location)),
    [existing],
  )

  return (
    <div className="space-y-2">
      <TextField
        label="Search location"
        value={query}
        disabled={disabled}
        placeholder="City or district"
        hint="Search moves the map. Click to add points, then double-click or click the first point to finish. Need at least 3 points."
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
                onClick={() => setFocusPlace(place)}
              >
                <span className="font-medium text-soe-navy">{place.name}</span>
                <span className="text-[11px] text-soe-slate">Go to map · {place.district}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="flex items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={disabled || vertices.length === 0}
          onClick={() => setVertices(vertices.slice(0, -1))}
        >
          Undo point
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={disabled || vertices.length < 3}
          onClick={() => {
            const { latitude, longitude } = polygonCentroid(vertices)
            const place = nearestUnitPlace(latitude, longitude)
            onSelect({
              label: place.name,
              province: place.province,
              district: place.district,
              latitude,
              longitude,
              polygon: vertices,
            })
            setVertices([])
          }}
        >
          Finish polygon
        </Button>
        <Button
          type="button"
          size="sm"
          variant="tertiary"
          disabled={disabled || vertices.length === 0}
          onClick={() => setVertices([])}
        >
          Clear
        </Button>
      </div>
      <div className="h-[320px] overflow-hidden rounded-md border border-soe-border">
        <MapContainer
          center={[30.3753, 69.3451]}
          zoom={6}
          maxZoom={19}
          className={cn('h-full w-full cursor-crosshair', disabled && 'pointer-events-none')}
          scrollWheelZoom
        >
          <TileLayer
            attribution="Tiles © Esri — Esri, Maxar, Earthstar Geographics"
            url={ESRI_IMAGERY}
            maxZoom={19}
          />
          <TileLayer url={ESRI_ROADS} maxZoom={19} />
          <TileLayer url={ESRI_LABELS} maxZoom={19} />
          <InitialView polygon={selectedPolygon} existingPolygons={existingPolygons} />
          <FlyToPlace place={focusPlace} />
          {existing.map((location) => (
            <Polygon
              key={location.id}
              positions={locationPolygon(location)}
              pathOptions={{ color: '#e2e8f0', weight: 1, fillOpacity: 0.08 }}
            >
              <Tooltip>{location.label}</Tooltip>
            </Polygon>
          ))}
          <PolygonDrawLayer
            disabled={disabled}
            selectedPolygon={selectedPolygon}
            onSelect={onSelect}
            vertices={vertices}
            setVertices={setVertices}
          />
        </MapContainer>
      </div>
    </div>
  )
}
