/**
 * Map canvas for National Industrial Asset Map.
 * Standard mode keeps the operational basemap; executive mode renders a
 * projection-stable SVG intelligence graphic for PMO portfolio dashboards.
 */
import { useEffect, useMemo, useState } from 'react'
import { geoMercator, geoPath } from 'd3-geo'
import {
  CircleMarker,
  MapContainer,
  Polygon,
  TileLayer,
  Tooltip,
  useMap,
} from 'react-leaflet'
import type { Feature, FeatureCollection, Geometry } from 'geojson'
import type { GisAssetItem, GisMarkerRole } from '@/mock-services/gis.service'
import { GIS_NATIONAL_VIEW } from '@/mock-services/gis.service'
import { EmptyState } from '@/design-system/components/Feedback'
import { GIS_ROLE_COLOR } from '@/components/gis/GisMapLegend'
import { cn, formatCurrencyPkr } from '@/utils'

const ROLE_COLOR = GIS_ROLE_COLOR
const EXECUTIVE_PROVINCE_GEOJSON = '/geo/pakistan-provinces.geojson'
const EXECUTIVE_SVG_WIDTH = 1280
const EXECUTIVE_SVG_HEIGHT = 520
const CITY_LABELS = [
  { name: 'Peshawar', coordinates: [71.5249, 34.0151] as [number, number], dx: -58, dy: -8 },
  { name: 'Islamabad', coordinates: [73.0479, 33.6844] as [number, number], dx: 8, dy: 6 },
  { name: 'Lahore', coordinates: [74.3587, 31.5204] as [number, number], dx: 8, dy: 4 },
  { name: 'Faisalabad', coordinates: [73.135, 31.4504] as [number, number], dx: -68, dy: -2 },
  { name: 'Multan', coordinates: [71.5249, 30.1575] as [number, number], dx: -14, dy: 18 },
  { name: 'Quetta', coordinates: [66.975, 30.1798] as [number, number], dx: -54, dy: 8 },
  { name: 'Karachi', coordinates: [67.0011, 24.8607] as [number, number], dx: 10, dy: 8 },
]

const EXECUTIVE_CALLOUTS = [
  {
    province: 'Khyber Pakhtunkhwa',
    // Keep left of map fitExtent ([360,44]–[908,498]) so the card does not cover KPK.
    cardBox: { x: 48, y: 56, width: 268, height: 102 },
    borderSide: 'left',
  },
  {
    province: 'Islamabad',
    cardBox: { x: 940, y: 72, width: 268, height: 102 },
    borderSide: 'right',
  },
  {
    province: 'Punjab',
    cardBox: { x: 940, y: 210, width: 268, height: 102 },
    borderSide: 'right',
  },
  {
    province: 'Sindh',
    cardBox: { x: 940, y: 348, width: 268, height: 102 },
    borderSide: 'right',
  },
  {
    province: 'Balochistan',
    cardBox: { x: 48, y: 300, width: 268, height: 102 },
    borderSide: 'left',
  },
] as const

type ExecutiveCallout = (typeof EXECUTIVE_CALLOUTS)[number]

function normalizeProvinceName(province?: string) {
  if (!province) return ''
  if (province === 'ICT') return 'Islamabad'
  if (province === 'KP' || province === 'KPK') return 'Khyber Pakhtunkhwa'
  return province
}

function FitOrFly({
  items,
  selectedId,
  scopeCenter,
  scopeZoom,
}: {
  items: GisAssetItem[]
  selectedId?: string
  scopeCenter?: [number, number]
  scopeZoom?: number
}) {
  const map = useMap()
  useEffect(() => {
    if (scopeCenter) {
      map.setView(scopeCenter, scopeZoom ?? 7)
      return
    }
    const selected = items.find((i) => i.assetId === selectedId && i.mapped)
    if (selected?.latitude != null && selected.longitude != null) {
      map.setView([selected.latitude, selected.longitude], Math.max(map.getZoom(), 10))
      return
    }
    const mapped = items.filter(
      (i) => i.mapped && i.latitude != null && i.longitude != null,
    )
    if (mapped.length === 0) {
      map.setView(GIS_NATIONAL_VIEW.center, GIS_NATIONAL_VIEW.zoom)
      return
    }
    if (mapped.length === 1) {
      map.setView([mapped[0]!.latitude!, mapped[0]!.longitude!], 9)
      return
    }
    const lats = mapped.map((m) => m.latitude!)
    const lngs = mapped.map((m) => m.longitude!)
    map.fitBounds(
      [
        [Math.min(...lats), Math.min(...lngs)],
        [Math.max(...lats), Math.max(...lngs)],
      ],
      { padding: [28, 28], maxZoom: 10 },
    )
  }, [items, selectedId, scopeCenter, scopeZoom, map])
  return null
}

function ZoomTracker({ onZoom }: { onZoom: (z: number) => void }) {
  const map = useMap()
  useEffect(() => {
    const handler = () => onZoom(map.getZoom())
    handler()
    map.on('zoomend', handler)
    return () => {
      map.off('zoomend', handler)
    }
  }, [map, onZoom])
  return null
}

function useExecutiveGeoJson() {
  const [geoJson, setGeoJson] = useState<FeatureCollection | null>(null)
  useEffect(() => {
    let cancelled = false
    fetch(EXECUTIVE_PROVINCE_GEOJSON)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: FeatureCollection | null) => {
        if (!cancelled) {
          const filtered = data
            ? {
                ...data,
                features: data.features.filter(
                  (feature) => feature.properties?.NAME !== 'Indian Occupied Kashmir',
                ),
              }
            : null
          setGeoJson(filtered)
        }
      })
      .catch(() => {
        if (!cancelled) setGeoJson(null)
      })
    return () => {
      cancelled = true
    }
  }, [])
  return geoJson
}

type ProvinceTone = 'standard' | 'opportunity' | 'attention' | 'critical' | 'unavailable'

interface ProvinceStat {
  province: string
  soeIds: Set<string>
  value: number
  assetCount: number
  mappedCount: number
  normalCount: number
  opportunityCount: number
  attentionCount: number
  criticalCount: number
  tone: ProvinceTone
}

const PROVINCE_FILL: Record<ProvinceTone, { fill: string; stroke: string; soft: string }> = {
  standard: { fill: '#dcecf8', stroke: ROLE_COLOR.standard, soft: 'rgba(29, 93, 143, 0.1)' },
  opportunity: { fill: '#cdeee8', stroke: ROLE_COLOR.opportunity, soft: 'rgba(20, 143, 119, 0.12)' },
  attention: { fill: '#fde8bf', stroke: ROLE_COLOR.attention, soft: 'rgba(217, 119, 6, 0.12)' },
  critical: { fill: '#f5c9c4', stroke: ROLE_COLOR.critical, soft: 'rgba(192, 57, 43, 0.12)' },
  unavailable: { fill: '#f5f8fb', stroke: '#cbd7e2', soft: 'rgba(148, 163, 184, 0.12)' },
}

function emptyProvinceStat(province: string): ProvinceStat {
  return {
    province,
    soeIds: new Set<string>(),
    value: 0,
    assetCount: 0,
    mappedCount: 0,
    normalCount: 0,
    opportunityCount: 0,
    attentionCount: 0,
    criticalCount: 0,
    tone: 'unavailable',
  }
}

function resolveProvinceTone(stat: ProvinceStat): ProvinceTone {
  if (stat.criticalCount > 0) return 'critical'
  if (stat.attentionCount > 0) return 'attention'
  if (stat.opportunityCount > 0) return 'opportunity'
  if (stat.assetCount > 0) return 'standard'
  return 'unavailable'
}

function provinceStats(items: GisAssetItem[]) {
  const stats = new Map<string, ProvinceStat>()
  for (const item of items) {
    if (!item.province) continue
    const province = normalizeProvinceName(item.province)
    const existing = stats.get(province) ?? emptyProvinceStat(province)
    existing.soeIds.add(item.organizationId)
    existing.value += item.marketValue ?? item.bookValue ?? 0
    existing.assetCount += 1
    if (item.mapped) existing.mappedCount += 1
    if (item.markerRole === 'critical') existing.criticalCount += 1
    else if (item.markerRole === 'attention') existing.attentionCount += 1
    else if (item.markerRole === 'opportunity') existing.opportunityCount += 1
    else existing.normalCount += 1
    existing.tone = resolveProvinceTone(existing)
    stats.set(province, existing)
  }
  return stats
}

function ExecutiveStatusLegend() {
  const items: Array<{ role: GisMarkerRole; label: string }> = [
    { role: 'standard', label: 'Normal' },
    { role: 'opportunity', label: 'Opportunity' },
    { role: 'attention', label: 'Attention' },
    { role: 'critical', label: 'Critical' },
  ]
  return (
    <div className="absolute left-5 top-4 z-[470] flex flex-wrap gap-x-6 gap-y-2 text-xs font-medium text-slate-500">
      {items.map((item) => (
        <span key={item.role} className="inline-flex items-center gap-2">
          <span
            className="h-3.5 w-3.5 rounded-full shadow-sm ring-2 ring-white"
            style={{ backgroundColor: ROLE_COLOR[item.role] }}
            aria-hidden="true"
          />
          {item.label}
        </span>
      ))}
    </div>
  )
}

function calloutAnchor(
  callout: ExecutiveCallout,
  bounds: [[number, number], [number, number]],
): [number, number] {
  const [[x0, y0], [x1, y1]] = bounds
  const midY = y0 + (y1 - y0) * 0.52
  if (callout.borderSide === 'left') return [x0, midY]
  return [x1, midY]
}

function cardLineAnchor(callout: ExecutiveCallout): [number, number] {
  const { x, y, width, height } = callout.cardBox
  const edgeInset = 8
  const midY = y + height * 0.5
  if (callout.borderSide === 'left') return [x + width - edgeInset, midY]
  return [x + edgeInset, midY]
}

function ExecutiveProvinceCard({
  callout,
  stat,
}: {
  callout: ExecutiveCallout
  stat: ProvinceStat
}) {
  const colors = PROVINCE_FILL[stat.tone]
  const statusLabel =
    stat.tone === 'standard' ? 'normal' : stat.tone === 'unavailable' ? 'N/A' : stat.tone
  return (
    <foreignObject
      x={callout.cardBox.x}
      y={callout.cardBox.y}
      width={callout.cardBox.width}
      height={callout.cardBox.height}
    >
      <div className="h-full overflow-hidden rounded-md border border-slate-200 bg-white/95 shadow-[0_2px_8px_rgba(18,48,74,0.08)] backdrop-blur">
        <div className="h-1" style={{ backgroundColor: colors.stroke }} />
        <div className="border-b border-slate-200 px-2.5 py-1.5">
          <div className="flex items-center justify-between gap-2">
            <p
              className="truncate text-[11px] font-semibold leading-4 text-slate-800"
              title={callout.province}
            >
              {callout.province}
            </p>
            <span
              className="shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-semibold capitalize leading-3"
              style={{ backgroundColor: colors.soft, color: colors.stroke }}
            >
              {statusLabel}
            </span>
          </div>
        </div>
        <div className="space-y-1.5 px-2.5 py-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[9px] font-medium uppercase tracking-wide text-slate-400">
              Asset value
            </span>
            <b className="text-[12px] font-semibold tabular-nums leading-4 text-slate-900">
              {formatCurrencyPkr(stat.value)}
            </b>
          </div>
          <div className="grid grid-cols-2 gap-x-3 border-t border-slate-100 pt-1.5">
            {[
              ['SOEs', stat.soeIds.size],
              ['Assets', stat.assetCount],
            ].map(([label, value]) => (
              <div key={String(label)} className="flex min-w-0 items-center justify-between gap-1.5">
                <span className="text-[9px] font-medium uppercase tracking-wide text-slate-400">
                  {label}
                </span>
                <span className="text-[11px] font-semibold tabular-nums text-slate-700">{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </foreignObject>
  )
}

function ExecutiveSvgMap({
  geoJson,
  stats,
}: {
  geoJson: FeatureCollection
  stats: Map<string, ProvinceStat>
}) {
  const projection = useMemo(
    () =>
      geoMercator().fitExtent(
        [
          [360, 44],
          [908, 498],
        ],
        geoJson,
      ),
    [geoJson],
  )
  const path = useMemo(() => geoPath(projection), [projection])
  const features = geoJson.features as Array<Feature<Geometry, { NAME?: string }>>
  const featureByProvince = useMemo(() => {
    const entries: Array<[string, Feature<Geometry, { NAME?: string }>]> = features.map(
      (feature) => [normalizeProvinceName(String(feature.properties?.NAME ?? '')), feature],
    )
    return new Map<string, Feature<Geometry, { NAME?: string }>>(entries)
  }, [features])

  return (
    <svg
      className="absolute inset-0 z-[420] h-full w-full"
      viewBox={`0 0 ${EXECUTIVE_SVG_WIDTH} ${EXECUTIVE_SVG_HEIGHT}`}
      role="img"
      aria-label="Pakistan province asset footprint map"
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <filter id="executive-region-shadow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#12304a" floodOpacity="0.08" />
        </filter>
        <filter id="executive-line-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodColor="#12304a" floodOpacity="0.12" />
        </filter>
        <linearGradient id="executive-map-wash" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#f8fbfd" />
          <stop offset="100%" stopColor="#eef5f9" />
        </linearGradient>
      </defs>

      <rect x="290" y="26" width="700" height="486" rx="28" fill="url(#executive-map-wash)" opacity="0.36" />

      <g filter="url(#executive-region-shadow)">
        {features.map((feature) => {
          const province = normalizeProvinceName(String(feature.properties?.NAME ?? ''))
          const tone = stats.get(province)?.tone ?? 'unavailable'
          const colors = PROVINCE_FILL[tone]
          const d = path(feature)
          if (!d) return null
          return (
            <path
              key={province}
              d={d}
              fill={colors.fill}
              fillOpacity={tone === 'unavailable' ? 0.62 : 0.82}
              stroke={colors.stroke}
              strokeOpacity={tone === 'unavailable' ? 0.72 : 0.98}
              strokeWidth={tone === 'unavailable' ? 1.25 : 2.2}
              vectorEffect="non-scaling-stroke"
            />
          )
        })}
      </g>

      {EXECUTIVE_CALLOUTS.map((callout) => {
        const feature = featureByProvince.get(callout.province)
        if (!feature) return null
        const tone = stats.get(callout.province)?.tone ?? 'unavailable'
        const color = PROVINCE_FILL[tone].stroke
        const [x1, y1] = calloutAnchor(callout, path.bounds(feature as Feature))
        const [x2, y2] = cardLineAnchor(callout)
        return (
          <line
            key={callout.province}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke={color}
            strokeLinecap="round"
            strokeWidth={1.15}
            opacity={tone === 'unavailable' ? 0.18 : 0.48}
            vectorEffect="non-scaling-stroke"
            filter="url(#executive-line-glow)"
          />
        )
      })}

      {CITY_LABELS.map((city) => {
        const point = projection(city.coordinates)
        if (!point) return null
        const [x, y] = point
        return (
          <text
            key={city.name}
            x={x + city.dx}
            y={y + city.dy}
            className="fill-slate-700 text-[12px] font-semibold"
            paintOrder="stroke"
            stroke="#ffffff"
            strokeWidth={3}
            strokeLinejoin="round"
          >
            {city.name}
          </text>
        )
      })}

      {EXECUTIVE_CALLOUTS.map((callout) => (
        <ExecutiveProvinceCard
          key={callout.province}
          callout={callout}
          stat={stats.get(callout.province) ?? emptyProvinceStat(callout.province)}
        />
      ))}
    </svg>
  )
}

function ExecutiveAssetMap({
  items,
  className,
  onViewList,
}: {
  items: GisAssetItem[]
  selectedId?: string
  onSelect?: (assetId: string) => void
  className?: string
  onViewList?: () => void
}) {
  const geoJson = useExecutiveGeoJson()
  const stats = useMemo(
    () => provinceStats(items),
    [items],
  )
  const hasProvinceData = useMemo(
    () => [...stats.values()].some((stat) => stat.assetCount > 0),
    [stats],
  )
  const geoJsonKey = useMemo(
    () =>
      [...stats.entries()]
        .map(([province, stat]) => `${province}:${stat.tone}:${stat.assetCount}:${stat.value}`)
        .join('|'),
    [stats],
  )

  if (!hasProvinceData) {
    return (
      <div className={className}>
        <EmptyState
          title="No mapped assets in current filters"
          hint="Clear filters or review non-mapped assets in the list."
        />
      </div>
    )
  }

  return (
    <div className={cn('relative overflow-hidden bg-white', className)}>
      {onViewList ? (
        <button
          type="button"
          className="absolute right-5 top-4 z-[480] text-xs font-semibold text-soe-blue underline-offset-2 hover:underline focus:outline-none focus:ring-2 focus:ring-soe-blue/30"
          onClick={onViewList}
        >
          View as list
        </button>
      ) : null}
      <ExecutiveStatusLegend />
      {geoJson ? <ExecutiveSvgMap key={geoJsonKey} geoJson={geoJson} stats={stats} /> : null}
    </div>
  )
}

interface ClusterBucket {
  id: string
  lat: number
  lng: number
  count: number
  role: GisMarkerRole
  assetIds: string[]
}

function clusterMapped(items: GisAssetItem[], zoom: number): {
  singles: GisAssetItem[]
  clusters: ClusterBucket[]
} {
  const mapped = items.filter((i) => i.mapped && i.latitude != null && i.longitude != null)
  if (zoom >= 8 || mapped.length <= 35) {
    return { singles: mapped, clusters: [] }
  }
  const cell = zoom < 6 ? 1.2 : 0.55
  const buckets = new Map<string, ClusterBucket>()
  for (const item of mapped) {
    const lat = Math.round(item.latitude! / cell) * cell
    const lng = Math.round(item.longitude! / cell) * cell
    const key = `${lat}_${lng}`
    const existing = buckets.get(key)
    if (!existing) {
      buckets.set(key, {
        id: key,
        lat,
        lng,
        count: 1,
        role: item.markerRole,
        assetIds: [item.assetId],
      })
    } else {
      existing.count += 1
      existing.assetIds.push(item.assetId)
      if (item.markerRole === 'critical') existing.role = 'critical'
      else if (item.markerRole === 'attention' && existing.role !== 'critical') {
        existing.role = 'attention'
      } else if (item.markerRole === 'opportunity' && existing.role === 'standard') {
        existing.role = 'opportunity'
      }
    }
  }
  const clusters: ClusterBucket[] = []
  const singles: GisAssetItem[] = []
  const singleIds = new Set<string>()
  for (const b of buckets.values()) {
    if (b.count === 1) {
      const item = mapped.find((m) => m.assetId === b.assetIds[0])
      if (item) {
        singles.push(item)
        singleIds.add(item.assetId)
      }
    } else {
      clusters.push(b)
    }
  }
  return { singles, clusters }
}

export function NationalAssetMapCanvas({
  items,
  selectedId,
  onSelect,
  scopeCenter,
  scopeZoom,
  zoom,
  onZoomChange,
  className,
  variant = 'standard',
  onViewList,
}: {
  items: GisAssetItem[]
  selectedId?: string
  onSelect?: (assetId: string) => void
  scopeCenter?: [number, number]
  scopeZoom?: number
  zoom: number
  onZoomChange: (z: number) => void
  className?: string
  variant?: 'standard' | 'executive'
  onViewList?: () => void
}) {
  const mapped = useMemo(
    () => items.filter((i) => i.mapped && i.latitude != null && i.longitude != null),
    [items],
  )
  const { singles, clusters } = useMemo(
    () => clusterMapped(mapped, zoom),
    [mapped, zoom],
  )
  const polygons = useMemo(
    () =>
      mapped.filter(
        (i) => i.geometryType === 'Polygon' && Array.isArray(i.coordinates?.[0]),
      ),
    [mapped],
  )

  if (variant === 'executive') {
    return (
      <ExecutiveAssetMap
        className={className}
        items={items}
        selectedId={selectedId}
        onSelect={onSelect}
        onViewList={onViewList}
      />
    )
  }

  if (mapped.length === 0) {
    return (
      <div className={className}>
        <EmptyState
          title="No mapped assets in current filters"
          hint="Clear filters or review non-mapped assets in the list."
        />
      </div>
    )
  }

  return (
    <div className={className}>
      <MapContainer
        center={GIS_NATIONAL_VIEW.center}
        zoom={GIS_NATIONAL_VIEW.zoom}
        className="h-full w-full"
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />
        <FitOrFly
          items={mapped}
          selectedId={selectedId}
          scopeCenter={scopeCenter}
          scopeZoom={scopeZoom}
        />
        <ZoomTracker onZoom={onZoomChange} />

        {polygons.map((f) => {
          const positions = (f.coordinates as number[][]).map(
            (c) => [c[1], c[0]] as [number, number],
          )
          const selected = selectedId === f.assetId
          return (
            <Polygon
              key={`poly-${f.assetId}`}
              positions={positions}
              pathOptions={{
                color: selected ? ROLE_COLOR.opportunity : ROLE_COLOR[f.markerRole],
                weight: selected ? 3 : 1.5,
                fillColor: selected ? ROLE_COLOR.opportunity : ROLE_COLOR[f.markerRole],
                fillOpacity: selected ? 0.35 : 0.18,
              }}
              eventHandlers={{
                click: () => onSelect?.(f.assetId),
              }}
            >
              <Tooltip sticky>
                {f.name}
                {f.geometryIllustrative ? ' · illustrative parcel' : ''}
              </Tooltip>
            </Polygon>
          )
        })}

        {clusters.map((c) => (
          <CircleMarker
            key={`cluster-${c.id}`}
            center={[c.lat, c.lng]}
            radius={Math.min(22, 10 + c.count)}
            pathOptions={{
              color: ROLE_COLOR[c.role],
              fillColor: ROLE_COLOR[c.role],
              fillOpacity: 0.75,
              weight: 2,
            }}
            eventHandlers={{
              click: () => {
                if (c.assetIds[0]) onSelect?.(c.assetIds[0])
              },
            }}
          >
            <Tooltip permanent direction="center" className="gis-cluster-tooltip">
              {c.count}
            </Tooltip>
          </CircleMarker>
        ))}

        {singles.map((f) => {
          if (f.geometryType === 'Polygon') return null
          const selected = selectedId === f.assetId
          return (
            <CircleMarker
              key={`pt-${f.assetId}`}
              center={[f.latitude!, f.longitude!]}
              radius={selected ? 9 : 6}
              pathOptions={{
                color: selected ? ROLE_COLOR.opportunity : ROLE_COLOR[f.markerRole],
                fillColor: selected ? ROLE_COLOR.opportunity : ROLE_COLOR[f.markerRole],
                fillOpacity: selected ? 0.95 : 0.8,
                weight: selected ? 3 : 1,
              }}
              eventHandlers={{
                click: () => onSelect?.(f.assetId),
              }}
            >
              <Tooltip>
                {f.organizationLabel} · {f.name}
              </Tooltip>
            </CircleMarker>
          )
        })}
      </MapContainer>
    </div>
  )
}
