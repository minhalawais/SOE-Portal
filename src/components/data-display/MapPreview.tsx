import { MapContainer, Marker, Popup, Polygon, TileLayer } from 'react-leaflet'
import type { GeoFeature } from '@/types/domain'
import { EmptyState } from '@/design-system/components/Feedback'

interface MapPreviewProps {
  features: GeoFeature[]
  selectedId?: string
  onSelect?: (id: string) => void
}

export function MapPreview({ features, selectedId, onSelect }: MapPreviewProps) {
  if (features.length === 0) {
    return <EmptyState title="No geospatial features available." />
  }

  const first = features[0]
  const center: [number, number] =
    first.type === 'Point'
      ? [Number(first.coordinates[1]), Number(first.coordinates[0])]
      : Array.isArray(first.coordinates[0])
        ? [
            Number((first.coordinates as number[][])[0][1]),
            Number((first.coordinates as number[][])[0][0]),
          ]
        : [30.3753, 69.3451]

  return (
    <div className="h-[320px] overflow-hidden rounded-card border border-soe-border">
      <MapContainer center={center} zoom={5} className="h-full w-full" scrollWheelZoom={false}>
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {features.map((f) => {
          if (f.type === 'Point') {
            const lat = Number(f.coordinates[1])
            const lng = Number(f.coordinates[0])
            return (
              <Marker
                key={f.id}
                position={[lat, lng]}
                eventHandlers={{
                  click: () => onSelect?.(f.id),
                }}
                opacity={selectedId && selectedId !== f.id ? 0.55 : 1}
              >
                <Popup>{f.label}</Popup>
              </Marker>
            )
          }
          const positions = (f.coordinates as number[][]).map(
            (c) => [c[1], c[0]] as [number, number],
          )
          return (
            <Polygon
              key={f.id}
              positions={positions}
              pathOptions={{
                color: selectedId === f.id ? '#1a5f8a' : '#64748b',
                weight: selectedId === f.id ? 3 : 1,
                fillOpacity: selectedId === f.id ? 0.35 : 0.15,
              }}
              eventHandlers={{
                click: () => onSelect?.(f.id),
              }}
            >
              <Popup>{f.label}</Popup>
            </Polygon>
          )
        })}
      </MapContainer>
    </div>
  )
}
