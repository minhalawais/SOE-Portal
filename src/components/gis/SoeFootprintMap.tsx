import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  Building2,
  Factory,
  LocateFixed,
  MapPin,
  Warehouse,
  X,
} from 'lucide-react'
import { MapContainer, Polygon, TileLayer, Tooltip, useMap } from 'react-leaflet'
import type { GisAssetItem } from '@/mock-services/gis.service'
import type { OrganizationLocation } from '@/types/domain'
import { cn, formatCurrencyPkr } from '@/utils'
import {
  buildSoeFootprintUnits,
  OPERATING_STATUS,
  type FootprintSoe,
  type SoeFootprintUnit,
  type UnitOperatingStatus,
} from '@/components/gis/soeFootprint'

export const ALL_SOE_FOOTPRINTS = 'all'

function polygonSeed(value: string) {
  let seed = 0
  for (let index = 0; index < value.length; index += 1) {
    seed = (seed * 31 + value.charCodeAt(index)) >>> 0
  }
  return seed
}

function unitPolygon(unit: SoeFootprintUnit): Array<[number, number]> {
  const fallbackRadius = {
    head_office: 0.0025,
    factory: 0.012,
    warehouse: 0.007,
    regional_office: 0.0022,
    provincial_office: 0.0022,
  }[unit.kind]
  const areaRadius = unit.landAreaAcres
    ? Math.sqrt((unit.landAreaAcres * 0.00404686) / Math.PI) / 111
    : 0
  const radius = Math.min(Math.max(fallbackRadius, areaRadius), 0.045)
  const aspect = unit.kind === 'factory' ? 1.65 : unit.kind === 'warehouse' ? 1.4 : 1.15
  const angle = ((polygonSeed(unit.id) % 44) - 22) * (Math.PI / 180)
  const longitudeCorrection = Math.max(Math.cos(unit.latitude * (Math.PI / 180)), 0.65)
  const parcel = [
    [-0.95, -0.48],
    [-0.42, -0.92],
    [0.58, -0.78],
    [1, -0.14],
    [0.72, 0.74],
    [-0.18, 0.98],
    [-0.88, 0.5],
  ] as const

  return parcel.map(([x, y]) => {
    const stretchedX = x * aspect
    const rotatedX = stretchedX * Math.cos(angle) - y * Math.sin(angle)
    const rotatedY = stretchedX * Math.sin(angle) + y * Math.cos(angle)
    return [
      unit.latitude + rotatedY * radius,
      unit.longitude + (rotatedX * radius) / longitudeCorrection,
    ]
  })
}

function FitFootprint({ units }: { units: SoeFootprintUnit[] }) {
  const map = useMap()
  useEffect(() => {
    if (!units.length) return
    if (units.length === 1) {
      map.setView([units[0]!.latitude, units[0]!.longitude], 10, { animate: true })
      return
    }
    map.fitBounds(
      units.map((unit) => [unit.latitude, unit.longitude] as [number, number]),
      { paddingTopLeft: [48, 72], paddingBottomRight: [380, 96], maxZoom: 9, animate: true },
    )
  }, [map, units])
  return null
}

function RefitButton({ units }: { units: SoeFootprintUnit[] }) {
  const map = useMap()
  return (
    <button
      type="button"
      title="Fit all units"
      aria-label="Fit all SOE units on map"
      className="absolute left-3 top-[86px] z-[500] flex h-8 w-8 items-center justify-center rounded-[4px] border border-slate-300 bg-white text-soe-navy shadow-sm transition-colors hover:bg-soe-canvas focus:outline-none focus:ring-2 focus:ring-soe-blue/30"
      onClick={() => {
        if (units.length === 1) {
          map.setView([units[0]!.latitude, units[0]!.longitude], 10, { animate: true })
        } else if (units.length > 1) {
          map.fitBounds(
            units.map((unit) => [unit.latitude, unit.longitude] as [number, number]),
            { padding: [52, 52], maxZoom: 9, animate: true },
          )
        }
      }}
    >
      <LocateFixed size={15} />
    </button>
  )
}

function FootprintUnitPolygon({
  unit,
  selected,
  onSelect,
}: {
  unit: SoeFootprintUnit
  selected: boolean
  onSelect: () => void
}) {
  const map = useMap()
  const tone = OPERATING_STATUS[unit.operatingStatus]
  const selectAndZoom = () => {
    onSelect()
    map.flyTo(
      [unit.latitude, unit.longitude],
      Math.max(map.getZoom(), 12),
      { animate: true, duration: 0.55 },
    )
  }

  return (
    <Polygon
      positions={unitPolygon(unit)}
      pathOptions={{
        color: selected ? '#12304a' : tone.color,
        fillColor: tone.color,
        fillOpacity: selected ? 0.82 : 0.58,
        opacity: 1,
        weight: selected ? 3 : 1.75,
      }}
      eventHandlers={{ click: selectAndZoom }}
    >
      <Tooltip
        permanent
        interactive
        direction="top"
        offset={[0, -9]}
        opacity={1}
        className="soe-unit-label"
        eventHandlers={{ click: selectAndZoom }}
      >
        {unit.name}
      </Tooltip>
    </Polygon>
  )
}

function UnitKindIcon({ kind }: { kind: OrganizationLocation['kind'] }) {
  const Icon =
    kind === 'factory'
      ? Factory
      : kind === 'warehouse'
        ? Warehouse
        : kind === 'head_office'
          ? Building2
          : MapPin
  return <Icon size={16} aria-hidden="true" />
}

function UnitDetail({ unit, onClose }: { unit: SoeFootprintUnit; onClose: () => void }) {
  const status = OPERATING_STATUS[unit.operatingStatus]
  return (
    <aside
      className="absolute bottom-3 right-3 z-[500] w-[340px] max-w-[calc(100%-1.5rem)] overflow-hidden rounded-[6px] border border-soe-border bg-white shadow-[0_12px_30px_rgba(18,48,74,0.18)]"
      aria-label={`${unit.name} details`}
    >
      <div className="flex items-start justify-between gap-3 border-b border-soe-border px-4 py-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-soe-blue">
            <UnitKindIcon kind={unit.kind} />
            <span className="text-[10px] font-semibold uppercase text-soe-slate">
              {unit.kind.replaceAll('_', ' ')}
            </span>
          </div>
          <h3 className="mt-1 truncate text-sm font-semibold text-soe-navy" title={unit.name}>
            {unit.name}
          </h3>
          <p className="mt-1 flex items-center gap-1 text-[11px] text-soe-slate">
            <MapPin size={12} aria-hidden="true" />
            {unit.district}, {unit.province}
          </p>
        </div>
        <button
          type="button"
          title="Close unit details"
          aria-label="Close unit details"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[4px] text-soe-slate hover:bg-soe-canvas hover:text-soe-navy"
          onClick={onClose}
        >
          <X size={15} />
        </button>
      </div>

      <div className="grid grid-cols-2 divide-x divide-y divide-soe-border">
        <div className="p-3">
          <p className="text-[10px] text-soe-slate">Registered assets</p>
          <p className="mt-0.5 text-base font-semibold tabular-nums text-soe-navy">{unit.assetCount}</p>
        </div>
        <div className="p-3">
          <p className="text-[10px] text-soe-slate">Market value</p>
          <p className="mt-0.5 text-sm font-semibold tabular-nums text-soe-navy">
            {unit.marketValue ? formatCurrencyPkr(unit.marketValue) : 'Not recorded'}
          </p>
        </div>
        {unit.landAreaAcres > 0 ? (
          <div className="p-3">
            <p className="text-[10px] text-soe-slate">Land footprint</p>
            <p className="mt-0.5 text-sm font-semibold tabular-nums text-soe-navy">
              {new Intl.NumberFormat('en-PK').format(unit.landAreaAcres)} ac
            </p>
          </div>
        ) : null}
        <div className="p-3">
          <p className="text-[10px] text-soe-slate">Operating status</p>
          <span
            className="mt-1 inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold"
            style={{ backgroundColor: status.soft, color: status.color }}
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: status.color }} />
            {status.label}
          </span>
        </div>
      </div>

      <div className="space-y-2 border-t border-soe-border px-4 py-3">
        <div className="flex items-start justify-between gap-3 text-[11px]">
          <span className="text-soe-slate">Asset mix</span>
          <span className="max-w-[210px] text-right font-medium text-soe-navy">
            {unit.assetTypes.length ? unit.assetTypes.join(', ') : 'No assets assigned'}
          </span>
        </div>
        <div className="flex items-start justify-between gap-3 text-[11px]">
          <span className="text-soe-slate">Registry flags</span>
          <span className={cn('text-right font-medium', unit.riskCount ? 'text-soe-critical' : unit.underutilizedCount ? 'text-soe-warning' : 'text-soe-success')}>
            {unit.riskCount
              ? `${unit.riskCount} litigation ${unit.riskCount === 1 ? 'case' : 'cases'}`
              : unit.underutilizedCount
                ? `${unit.underutilizedCount} attention ${unit.underutilizedCount === 1 ? 'item' : 'items'}`
                : 'No active flags'}
          </span>
        </div>
        {unit.address ? <p className="border-t border-soe-border pt-2 text-[10px] leading-4 text-soe-slate">{unit.address}</p> : null}
      </div>
    </aside>
  )
}

export function SoeFootprintMap({
  soes,
  locations,
  assets,
  selectedSoeId,
  onSelectSoe,
}: {
  soes: FootprintSoe[]
  locations: OrganizationLocation[]
  assets: GisAssetItem[]
  selectedSoeId: string
  onSelectSoe: (organizationId: string) => void
}) {
  const selectedSoe = soes.find((soe) => soe.organizationId === selectedSoeId)
  const showAllSoes = selectedSoeId === ALL_SOE_FOOTPRINTS || !selectedSoe
  const units = useMemo(
    () =>
      showAllSoes
        ? soes.flatMap((soe) => buildSoeFootprintUnits(locations, assets, soe))
        : selectedSoe
          ? buildSoeFootprintUnits(locations, assets, selectedSoe)
          : [],
    [assets, locations, selectedSoe, showAllSoes, soes],
  )
  const [selectedUnitId, setSelectedUnitId] = useState<string>()

  useEffect(() => {
    setSelectedUnitId(undefined)
  }, [selectedSoeId])

  const selectedUnit = units.find((unit) => unit.id === selectedUnitId)
  const provinceCount = new Set(units.map((unit) => unit.province)).size
  const soeCount = new Set(units.map((unit) => unit.organizationId)).size
  const totalValue = units.reduce((sum, unit) => sum + unit.marketValue, 0)

  if (!units.length) {
    return (
      <div className="flex h-[560px] items-center justify-center bg-soe-canvas p-6 text-center">
        <div>
          <MapPin className="mx-auto text-soe-slate" size={24} />
          <p className="mt-2 text-sm font-semibold text-soe-navy">No mapped units available</p>
          <p className="mt-1 text-xs text-soe-slate">Select another SOE or complete its location register.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative h-[560px] min-h-[460px] overflow-hidden bg-[#eef3f5] sm:h-[600px] lg:h-[560px]">
      <MapContainer
        center={[30.3753, 69.3451]}
        zoom={5}
        minZoom={4}
        maxZoom={17}
        maxBounds={[[20, 58], [38, 82]]}
        className="h-full w-full"
        scrollWheelZoom
        zoomControl
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; CARTO'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />
        <FitFootprint units={units} />
        <RefitButton units={units} />
        {units.map((unit) => (
          <FootprintUnitPolygon
            key={unit.id}
            unit={unit}
            selected={unit.id === selectedUnitId}
            onSelect={() => setSelectedUnitId(unit.id)}
          />
        ))}
      </MapContainer>

      <div className="absolute right-3 top-3 z-[500] w-[320px] max-w-[calc(100%-4.25rem)] rounded-[6px] border border-soe-border bg-white/95 p-3 shadow-[0_8px_24px_rgba(18,48,74,0.14)] backdrop-blur-sm">
        <label htmlFor="footprint-soe" className="text-[10px] font-semibold uppercase text-soe-slate">
          SOE footprint
        </label>
        <select
          id="footprint-soe"
          className="mt-1 h-9 w-full rounded-[4px] border border-soe-border bg-white px-2.5 text-xs font-semibold text-soe-navy focus:border-soe-blue focus:outline-none focus:ring-2 focus:ring-soe-blue/15"
          value={showAllSoes ? ALL_SOE_FOOTPRINTS : selectedSoe?.organizationId}
          onChange={(event) => onSelectSoe(event.target.value)}
        >
          <option value={ALL_SOE_FOOTPRINTS}>All SOEs</option>
          {soes.map((soe) => (
            <option key={soe.organizationId} value={soe.organizationId}>
              {soe.abbreviation} - {soe.name}
            </option>
          ))}
        </select>
        <div className="mt-2 flex items-center justify-between gap-3 text-[10px] text-soe-slate">
          <span>
            {units.length} units · {soeCount} {soeCount === 1 ? 'SOE' : 'SOEs'} · {provinceCount}{' '}
            {provinceCount === 1 ? 'region' : 'regions'}
          </span>
          <strong className="font-semibold text-soe-navy">{formatCurrencyPkr(totalValue)}</strong>
        </div>
      </div>

      <div className="absolute bottom-3 left-3 z-[490] rounded-[6px] border border-soe-border bg-white/95 px-3 py-2 shadow-sm backdrop-blur-sm">
        <p className="mb-1.5 text-[9px] font-semibold uppercase text-soe-slate">Operating status</p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px] text-soe-slate">
          {(Object.keys(OPERATING_STATUS) as UnitOperatingStatus[]).map((key) => (
            <span key={key} className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: OPERATING_STATUS[key].color }} />
              {OPERATING_STATUS[key].label}
            </span>
          ))}
        </div>
      </div>

      {selectedUnit ? <UnitDetail unit={selectedUnit} onClose={() => setSelectedUnitId(undefined)} /> : null}

      <div className="pointer-events-none absolute left-1/2 top-3 z-[480] hidden -translate-x-1/2 items-center gap-1.5 rounded-[4px] bg-white/90 px-2.5 py-1 text-[10px] font-medium text-soe-slate shadow-sm lg:flex">
        <AlertTriangle size={12} className="text-soe-warning" />
        Select a unit for registry details
      </div>
    </div>
  )
}
