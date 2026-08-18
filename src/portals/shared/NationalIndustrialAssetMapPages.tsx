/**
 * National Industrial Asset Map — Phase 18 flagship GIS workspace.
 * Map/list sync, filters, presets, detail drawer, data-quality warnings.
 */
import { useQuery } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { ExecutiveModuleSectionNav } from '@/components/soe'
import { GisMapLegend } from '@/components/gis/GisMapLegend'
import { DataTable } from '@/components/tables/DataTable'
import { Button } from '@/design-system/components/Button'
import { Card } from '@/design-system/components/Card'
import { SelectField, TextField } from '@/design-system/components/Fields'
import { Alert, EmptyState, ErrorState, LoadingBlock } from '@/design-system/components/Feedback'
import { KpiValue } from '@/design-system/components/KpiCard'
import { Drawer } from '@/design-system/components/Overlays'
import { StatusBadge } from '@/design-system/components/StatusBadge'
import { RequirePermission } from '@/app/router/guards'
import {
  ASSET_LITIGATION_STATUS_LABEL,
  ASSET_TYPE_LABEL,
  ASSET_UTILIZATION_LABEL,
  ENCROACHMENT_STATUS_LABEL,
  LAND_USE_CLASS_LABEL,
  OWNERSHIP_BAND_LABEL,
  type AssetType,
  type AssetUtilization,
  type EncroachmentStatus,
  type LandUseClass,
  type OwnershipBand,
  ASSET_TYPE,
  ASSET_UTILIZATION,
  ASSET_LITIGATION_STATUS,
  ENCROACHMENT_STATUS,
  LAND_USE_CLASS,
  OWNERSHIP_BAND,
} from '@/constants'
import {
  GIS_PROVINCE_BOUNDS,
  mockGisService,
  type GisAssetItem,
  type GisQuery,
} from '@/mock-services/gis.service'
import { PERMISSION } from '@/permissions'
import { useSessionStore } from '@/state/session'
import { cn, formatCurrencyPkr } from '@/utils'

const NationalAssetMapCanvas = lazy(() =>
  import('@/components/gis/NationalAssetMapCanvas').then((m) => ({
    default: m.NationalAssetMapCanvas,
  })),
)

type GisPortal = 'soe' | 'moip' | 'minister' | 'pmo'

function detailPath(portal: GisPortal, id: string) {
  if (portal === 'moip') return `/moip/assets/${id}`
  if (portal === 'minister') return `/minister/assets/${id}`
  if (portal === 'pmo') return `/pmo/land-bank`
  return `/soe/assets/${id}`
}

const linkClass = 'text-sm text-soe-blue underline'

const OPP_LABEL: Record<string, string> = {
  available_land: 'Available land',
  underutilized: 'Underutilized',
  idle: 'Idle',
  encroached: 'Encroached',
  litigation: 'Litigation',
  standard: 'Standard',
}

function queryFromSearch(params: URLSearchParams, soeOrgId?: string): GisQuery {
  const minAcres = params.get('minAcres')
  const maxAcres = params.get('maxAcres')
  const minMarket = params.get('minMarket')
  const maxMarket = params.get('maxMarket')
  return {
    organizationId: params.get('soe') || soeOrgId || undefined,
    assetType: (params.get('assetType') as AssetType) || undefined,
    province: params.get('province') || undefined,
    district: params.get('district') || undefined,
    utilization: (params.get('utilization') as AssetUtilization) || undefined,
    encroachment: (params.get('encroachment') as EncroachmentStatus) || undefined,
    litigation: (params.get('litigation') as typeof ASSET_LITIGATION_STATUS.CLEAR) || undefined,
    ownershipBand: (params.get('ownership') as OwnershipBand) || undefined,
    minAcres: minAcres ? Number(minAcres) : undefined,
    maxAcres: maxAcres ? Number(maxAcres) : undefined,
    hasMarketValue: params.get('hasMarket') === '1' || undefined,
    minMarketValue: minMarket ? Number(minMarket) : undefined,
    maxMarketValue: maxMarket ? Number(maxMarket) : undefined,
    useClassification: (params.get('useClass') as LandUseClass) || undefined,
    evidenceStatus: params.get('evidence') || undefined,
    currentUse: params.get('currentUse') || undefined,
    search: params.get('q') || undefined,
    mappedOnly: params.get('mappedOnly') === '1' || undefined,
  }
}

export function NationalIndustrialAssetMapWorkspace({
  portal,
  title = 'National Industrial Asset Map',
}: {
  portal: GisPortal
  title?: string
}) {
  const organizationId = useSessionStore((s) => s.organizationId)
  const soeScoped = portal === 'soe'
  const [searchParams, setSearchParams] = useSearchParams()
  const [selectedId, setSelectedId] = useState<string | undefined>(
    searchParams.get('asset') ?? undefined,
  )
  const [drawerOpen, setDrawerOpen] = useState(Boolean(searchParams.get('asset')))
  const [listOnly, setListOnly] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(max-width: 1023px)').matches : false,
  )
  const [listOnlyUserSet, setListOnlyUserSet] = useState(false)
  const [zoom, setZoom] = useState(5)
  const [scopeCenter, setScopeCenter] = useState<[number, number] | undefined>()
  const [scopeZoom, setScopeZoom] = useState<number | undefined>()

  // Phase 22: below lg, prefer list-first unless the user toggled explicitly
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1023px)')
    const sync = () => {
      if (!listOnlyUserSet) setListOnly(mq.matches)
    }
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [listOnlyUserSet])

  const baseQuery: GisQuery = {
    ...queryFromSearch(searchParams, soeScoped ? organizationId : undefined),
    portfolioScope: !soeScoped,
    scopedOrganizationId: soeScoped ? organizationId : undefined,
    pageSize: 500,
  }

  // SOE isolation: force org
  if (soeScoped) baseQuery.organizationId = organizationId

  const options = useQuery({
    queryKey: ['gis-filter-options', portal, organizationId],
    queryFn: () =>
      mockGisService.getFilterOptions({
        portfolioScope: !soeScoped,
        scopedOrganizationId: soeScoped ? organizationId : undefined,
      }),
  })
  const presets = useQuery({
    queryKey: ['gis-presets'],
    queryFn: () => mockGisService.getPresets(),
  })
  const results = useQuery({
    queryKey: ['gis-query', portal, baseQuery],
    queryFn: () => mockGisService.queryAssets(baseQuery),
  })
  const summary = useQuery({
    queryKey: ['gis-summary', portal, baseQuery],
    queryFn: () => mockGisService.getSummary(baseQuery),
  })
  const quality = useQuery({
    queryKey: ['gis-quality', portal, baseQuery],
    queryFn: () => mockGisService.getDataQuality(baseQuery),
  })
  const detail = useQuery({
    queryKey: ['gis-detail', selectedId],
    enabled: Boolean(selectedId) && drawerOpen,
    queryFn: () => mockGisService.getAssetDetail(selectedId!),
  })

  const items = results.data?.items ?? []
  const province = searchParams.get('province') ?? ''
  const district = searchParams.get('district') ?? ''

  const setParam = useCallback(
    (key: string, value: string) => {
      const next = new URLSearchParams(searchParams)
      if (value) next.set(key, value)
      else next.delete(key)
      setSearchParams(next)
    },
    [searchParams, setSearchParams],
  )

  const applyPreset = (presetId: string) => {
    const preset = presets.data?.find((p) => p.id === presetId)
    if (!preset) return
    const next = new URLSearchParams()
    if (soeScoped) next.set('soe', organizationId)
    const q = preset.query
    if (q.assetType) next.set('assetType', q.assetType)
    if (q.utilization) next.set('utilization', q.utilization)
    if (q.useClassification) next.set('useClass', q.useClassification)
    if (q.litigation) next.set('litigation', q.litigation)
    if (q.encroachment) next.set('encroachment', q.encroachment)
    if (q.minAcres != null) next.set('minAcres', String(q.minAcres))
    if (q.hasMarketValue) next.set('hasMarket', '1')
    if (q.currentUse) next.set('currentUse', q.currentUse)
    next.set('preset', presetId)
    setSearchParams(next)
    setScopeCenter(undefined)
  }

  const clearFilters = () => {
    const next = new URLSearchParams()
    if (soeScoped) next.set('soe', organizationId)
    setSearchParams(next)
    setScopeCenter(undefined)
    setSelectedId(undefined)
    setDrawerOpen(false)
  }

  const selectAsset = useCallback(
    (assetId: string) => {
      setSelectedId(assetId)
      setDrawerOpen(true)
      const next = new URLSearchParams(searchParams)
      next.set('asset', assetId)
      setSearchParams(next)
      setScopeCenter(undefined)
    },
    [searchParams, setSearchParams],
  )

  useEffect(() => {
    if (province && GIS_PROVINCE_BOUNDS[province]) {
      setScopeCenter(GIS_PROVINCE_BOUNDS[province].center)
      setScopeZoom(GIS_PROVINCE_BOUNDS[province].zoom)
    }
  }, [province])

  const columns = useMemo<ColumnDef<GisAssetItem, unknown>[]>(
    () => [
      {
        accessorKey: 'organizationLabel',
        header: 'SOE',
      },
      {
        accessorKey: 'name',
        header: 'Asset',
        cell: ({ row }) => (
          <button type="button" className={linkClass} onClick={() => selectAsset(row.original.assetId)}>
            {row.original.name}
          </button>
        ),
      },
      {
        accessorKey: 'assetType',
        header: 'Type',
        cell: ({ getValue }) => ASSET_TYPE_LABEL[getValue() as AssetType] ?? String(getValue()),
      },
      { accessorKey: 'province', header: 'Province' },
      { accessorKey: 'district', header: 'District' },
      {
        accessorKey: 'areaAcres',
        header: 'Acres',
        cell: ({ getValue }) => (getValue() == null ? '—' : Number(getValue()).toFixed(0)),
      },
      {
        accessorKey: 'opportunityStatus',
        header: 'Opportunity',
        cell: ({ getValue }) => OPP_LABEL[String(getValue())] ?? String(getValue()),
      },
      {
        accessorKey: 'mapped',
        header: 'Mapped',
        cell: ({ getValue }) => (getValue() ? 'Yes' : 'No'),
      },
    ],
    [selectAsset],
  )

  const geoLabel = district
    ? `District · ${district}`
    : province
      ? `Province · ${province}`
      : 'National'

  if (results.isLoading || options.isLoading) {
    return <LoadingBlock label="Loading national asset map…" />
  }
  if (results.isError || options.isError) {
    return <ErrorState title="Unable to load GIS workspace" />
  }

  return (
    <RequirePermission permission={PERMISSION.ASSETS_READ}>
      <div>
        <PageHeader
          title={title}
          subtitle={`${geoLabel} · decision-support GIS${soeScoped ? ' · SOE-scoped' : ''}`}
          actions={
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant={listOnly ? 'secondary' : 'primary'}
                onClick={() => {
                  setListOnlyUserSet(true)
                  setListOnly(false)
                }}
              >
                Map
              </Button>
              <Button
                type="button"
                size="sm"
                variant={listOnly ? 'primary' : 'secondary'}
                onClick={() => {
                  setListOnlyUserSet(true)
                  setListOnly(true)
                }}
              >
                List only
              </Button>
              <Button type="button" size="sm" variant="tertiary" onClick={clearFilters}>
                Clear filters
              </Button>
            </div>
          }
        />

        {portal === 'soe' ? <ExecutiveModuleSectionNav moduleId="soe-assets" /> : null}

        <p className="mb-2 text-xs text-soe-slate">
          Scope: {geoLabel}
          {searchParams.get('preset')
            ? ` · Preset: ${presets.data?.find((p) => p.id === searchParams.get('preset'))?.label ?? searchParams.get('preset')}`
            : ''}
          {' · '}
          {summary.data?.assetsInView ?? 0} results
          {summary.data && summary.data.nonMappedCount > 0
            ? ` · ${summary.data.nonMappedCount} non-mapped`
            : ''}
        </p>

        {presets.data?.length ? (
          <div className="mb-3 flex flex-wrap gap-2">
            {presets.data.map((p) => (
              <Button
                key={p.id}
                type="button"
                size="sm"
                variant={searchParams.get('preset') === p.id ? 'teal' : 'secondary'}
                onClick={() => applyPreset(p.id)}
                title={p.description}
              >
                {p.label}
              </Button>
            ))}
          </div>
        ) : null}

        <Card title="Filters" className="mb-3">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {!soeScoped ? (
              <SelectField
                label="SOE"
                value={searchParams.get('soe') ?? ''}
                onChange={(e) => setParam('soe', e.target.value)}
                options={[
                  { value: '', label: 'All SOEs' },
                  ...(options.data?.organizations.map((o) => ({
                    value: o.id,
                    label: o.label,
                  })) ?? []),
                ]}
              />
            ) : null}
            <SelectField
              label="Asset type"
              value={searchParams.get('assetType') ?? ''}
              onChange={(e) => setParam('assetType', e.target.value)}
              options={[
                { value: '', label: 'All types' },
                ...Object.values(ASSET_TYPE).map((t) => ({
                  value: t,
                  label: ASSET_TYPE_LABEL[t],
                })),
              ]}
            />
            <SelectField
              label="Province"
              value={province}
              onChange={(e) => {
                const next = new URLSearchParams(searchParams)
                const v = e.target.value
                if (v) next.set('province', v)
                else next.delete('province')
                next.delete('district')
                setSearchParams(next)
              }}
              options={[
                { value: '', label: 'National' },
                ...(options.data?.provinces.map((p) => ({ value: p, label: p })) ?? []),
              ]}
            />
            <SelectField
              label="District"
              value={district}
              onChange={(e) => setParam('district', e.target.value)}
              options={[
                { value: '', label: 'All districts' },
                ...(
                  province
                    ? (options.data?.districtsByProvince[province] ?? [])
                    : (options.data?.districts ?? [])
                ).map((d) => ({ value: d, label: d })),
              ]}
            />
            <SelectField
              label="Utilization"
              value={searchParams.get('utilization') ?? ''}
              onChange={(e) => setParam('utilization', e.target.value)}
              options={[
                { value: '', label: 'All' },
                ...Object.values(ASSET_UTILIZATION).map((u) => ({
                  value: u,
                  label: ASSET_UTILIZATION_LABEL[u],
                })),
              ]}
            />
            <SelectField
              label="Encroachment"
              value={searchParams.get('encroachment') ?? ''}
              onChange={(e) => setParam('encroachment', e.target.value)}
              options={[
                { value: '', label: 'All' },
                ...Object.values(ENCROACHMENT_STATUS).map((u) => ({
                  value: u,
                  label: ENCROACHMENT_STATUS_LABEL[u],
                })),
              ]}
            />
            <SelectField
              label="Litigation"
              value={searchParams.get('litigation') ?? ''}
              onChange={(e) => setParam('litigation', e.target.value)}
              options={[
                { value: '', label: 'All' },
                ...Object.values(ASSET_LITIGATION_STATUS).map((u) => ({
                  value: u,
                  label: ASSET_LITIGATION_STATUS_LABEL[u],
                })),
              ]}
            />
            <SelectField
              label="Ownership"
              value={searchParams.get('ownership') ?? ''}
              onChange={(e) => setParam('ownership', e.target.value)}
              options={[
                { value: '', label: 'All bands' },
                ...Object.values(OWNERSHIP_BAND).map((u) => ({
                  value: u,
                  label: OWNERSHIP_BAND_LABEL[u],
                })),
              ]}
            />
            <SelectField
              label="Land use"
              value={searchParams.get('useClass') ?? ''}
              onChange={(e) => setParam('useClass', e.target.value)}
              options={[
                { value: '', label: 'All' },
                ...Object.values(LAND_USE_CLASS).map((u) => ({
                  value: u,
                  label: LAND_USE_CLASS_LABEL[u],
                })),
              ]}
            />
            <TextField
              label="Min acres"
              type="number"
              value={searchParams.get('minAcres') ?? ''}
              onChange={(e) => setParam('minAcres', e.target.value)}
            />
            <TextField
              label="Max acres"
              type="number"
              value={searchParams.get('maxAcres') ?? ''}
              onChange={(e) => setParam('maxAcres', e.target.value)}
            />
            <TextField
              label="Min market value"
              type="number"
              value={searchParams.get('minMarket') ?? ''}
              onChange={(e) => setParam('minMarket', e.target.value)}
            />
            <TextField
              label="Search"
              value={searchParams.get('q') ?? ''}
              onChange={(e) => setParam('q', e.target.value)}
              placeholder="Name or SOE"
            />
          </div>
        </Card>

        {summary.data ? (
          <div className="mb-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <KpiValue label="In view" value={String(summary.data.assetsInView)} className="p-3 [&_p:nth-child(2)]:text-xl" />
            <KpiValue
              label="Total area"
              value={`${summary.data.totalAreaAcres.toFixed(0)} ac`}
              className="p-3 [&_p:nth-child(2)]:text-xl"
            />
            <KpiValue
              label="Market value"
              value={formatCurrencyPkr(summary.data.totalMarketValue)}
              className="p-3 [&_p:nth-child(2)]:text-xl"
            />
            <KpiValue
              label="Vacant / unused"
              value={String(summary.data.vacantUnusedCount)}
              className="p-3 [&_p:nth-child(2)]:text-xl"
            />
            <KpiValue
              label="Litigation"
              value={String(summary.data.litigationCount)}
              className="p-3 [&_p:nth-child(2)]:text-xl"
            />
            <KpiValue
              label="Encroachment"
              value={String(summary.data.encroachmentCount)}
              className="p-3 [&_p:nth-child(2)]:text-xl"
            />
          </div>
        ) : null}

        {quality.data?.warnings.length ? (
          <Alert
            tone="warning"
            title="GIS data quality"
            className="mb-3"
          >
            <ul className="mt-1 list-disc pl-4 text-xs">
              {quality.data.warnings.map((w) => (
                <li key={w.code}>
                  {w.message}: {w.count}
                </li>
              ))}
            </ul>
          </Alert>
        ) : null}

        <div
          className={cn(
            'grid gap-3',
            listOnly ? 'grid-cols-1' : 'lg:grid-cols-[1.45fr_0.9fr]',
          )}
        >
          {!listOnly ? (
            <Card
              title="Map"
              subtitle="Carto light basemap · polygons illustrative · not cadastral"
              actions={<GisMapLegend />}
              padding={false}
            >
              <div className="h-[min(62vh,560px)] min-h-[320px] p-2">
                <Suspense fallback={<LoadingBlock label="Loading map module…" />}>
                  <NationalAssetMapCanvas
                    className="h-full overflow-hidden rounded-md border border-soe-border"
                    items={items}
                    selectedId={selectedId}
                    onSelect={selectAsset}
                    scopeCenter={scopeCenter}
                    scopeZoom={scopeZoom}
                    zoom={zoom}
                    onZoomChange={setZoom}
                  />
                </Suspense>
              </div>
            </Card>
          ) : null}

          <Card
            title="Results"
            subtitle="Accessible list alternative · select to sync map"
          >
            {items.length ? (
              <DataTable
                data={items}
                columns={columns}
                density="compact"
                showSearch={false}
              />
            ) : (
              <EmptyState
                title="No assets match filters"
                hint="Try the vacant industrial land preset or clear filters."
              />
            )}
          </Card>
        </div>

        <Drawer
          open={drawerOpen && Boolean(selectedId)}
          title={detail.data?.item.name ?? 'Asset detail'}
          onClose={() => {
            setDrawerOpen(false)
            const next = new URLSearchParams(searchParams)
            next.delete('asset')
            setSearchParams(next)
          }}
        >
          {detail.isLoading ? <LoadingBlock label="Loading asset…" /> : null}
          {detail.isError ? <ErrorState title="Unable to load asset detail" /> : null}
          {detail.data ? (
            <div className="space-y-3">
              <dl className="grid grid-cols-2 gap-2 text-sm">
                <dt className="text-soe-slate">SOE</dt>
                <dd className="font-medium">{detail.data.item.organizationLabel}</dd>
                <dt className="text-soe-slate">Type</dt>
                <dd>{ASSET_TYPE_LABEL[detail.data.item.assetType]}</dd>
                <dt className="text-soe-slate">Land area</dt>
                <dd>
                  {detail.data.item.areaAcres != null
                    ? `${detail.data.item.areaAcres.toFixed(0)} acres`
                    : '—'}
                </dd>
                <dt className="text-soe-slate">Current use</dt>
                <dd>{detail.data.item.currentUse ?? '—'}</dd>
                <dt className="text-soe-slate">Market value</dt>
                <dd>
                  {detail.data.item.marketValue != null
                    ? formatCurrencyPkr(detail.data.item.marketValue)
                    : '—'}
                </dd>
                <dt className="text-soe-slate">Book value</dt>
                <dd>
                  {detail.data.item.bookValue != null
                    ? formatCurrencyPkr(detail.data.item.bookValue)
                    : '—'}
                </dd>
                <dt className="text-soe-slate">Ownership</dt>
                <dd>
                  {OWNERSHIP_BAND_LABEL[detail.data.item.ownershipBand]}
                  {detail.data.item.ownershipNote
                    ? ` · ${detail.data.item.ownershipNote}`
                    : ''}
                </dd>
                <dt className="text-soe-slate">Utilization</dt>
                <dd>
                  {detail.data.item.utilization
                    ? ASSET_UTILIZATION_LABEL[
                        detail.data.item.utilization as AssetUtilization
                      ] ?? detail.data.item.utilization
                    : '—'}
                </dd>
                <dt className="text-soe-slate">Encroachment</dt>
                <dd>
                  {detail.data.item.encroachment ? (
                    <StatusBadge
                      status={
                        detail.data.item.encroachment === 'clear' ? 'low' : 'warning'
                      }
                      family="risk"
                      label={
                        ENCROACHMENT_STATUS_LABEL[
                          detail.data.item.encroachment as EncroachmentStatus
                        ]
                      }
                    />
                  ) : (
                    '—'
                  )}
                </dd>
                <dt className="text-soe-slate">Litigation</dt>
                <dd>
                  {detail.data.item.litigation ? (
                    <StatusBadge
                      status={
                        detail.data.item.litigation === 'active' ? 'critical' : 'low'
                      }
                      family="risk"
                      label={
                        ASSET_LITIGATION_STATUS_LABEL[
                          detail.data.item.litigation as keyof typeof ASSET_LITIGATION_STATUS_LABEL
                        ]
                      }
                    />
                  ) : (
                    '—'
                  )}
                </dd>
                <dt className="text-soe-slate">Opportunity</dt>
                <dd>{OPP_LABEL[detail.data.item.opportunityStatus]}</dd>
                <dt className="text-soe-slate">Mapped</dt>
                <dd>
                  {detail.data.item.mapped
                    ? detail.data.item.geometryIllustrative
                      ? 'Yes · illustrative polygon'
                      : 'Yes'
                    : 'No coordinates'}
                </dd>
              </dl>

              <div>
                <h3 className="mb-1 text-xs font-semibold uppercase text-soe-slate">
                  Documents
                </h3>
                {detail.data.documents.length ? (
                  <ul className="space-y-1 text-sm">
                    {detail.data.documents.map((d) => (
                      <li key={d.id}>
                        {d.title} · v{d.version}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-soe-slate">No linked document metadata.</p>
                )}
              </div>

              {portal !== 'pmo' ? (
                <Link className={linkClass} to={detailPath(portal, detail.data.item.assetId)}>
                  View asset record
                </Link>
              ) : (
                <p className="text-xs text-soe-slate">
                  PMO view is summary-level. Asset registry drill-down remains in MoIP / SOE
                  portals.
                </p>
              )}
            </div>
          ) : null}
        </Drawer>
      </div>
    </RequirePermission>
  )
}

export function SoeNationalAssetMapPage() {
  return <NationalIndustrialAssetMapWorkspace portal="soe" title="SOE asset map" />
}

export function MoipNationalAssetMapPage() {
  return (
    <NationalIndustrialAssetMapWorkspace
      portal="moip"
      title="National Industrial Asset Map"
    />
  )
}

export function MinisterNationalAssetMapPage() {
  return (
    <NationalIndustrialAssetMapWorkspace
      portal="minister"
      title="National Industrial Asset Map"
    />
  )
}

export function PmoNationalAssetMapPage() {
  return (
    <NationalIndustrialAssetMapWorkspace
      portal="pmo"
      title="National Industrial Asset Map"
    />
  )
}
