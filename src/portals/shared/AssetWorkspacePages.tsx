import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { useMemo, useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { MapPreview } from '@/components/data-display/MapPreview'
import { ContributorModuleLayout, ExecutiveModuleSectionNav } from '@/components/soe'
import { AssetFormDocumentPanel } from '@/components/soe/AssetFormDocumentPanel'
import { PageHeader } from '@/components/layout/PageHeader'
import { DataTable } from '@/components/tables/DataTable'
import { Button } from '@/design-system/components/Button'
import { PkrAmountInput } from '@/design-system/components/Fields'
import { EmptyState, ErrorState, LoadingBlock } from '@/design-system/components/Feedback'
import { StatusBadge } from '@/design-system/components/StatusBadge'
import { MockFileControl } from '@/design-system/components/Fields'
import {
  ASSET_CONDITION,
  ASSET_EVIDENCE_STATUS,
  ASSET_EVIDENCE_STATUS_LABEL,
  ASSET_LITIGATION_STATUS,
  ASSET_LITIGATION_STATUS_LABEL,
  ASSET_OCCUPANCY,
  ASSET_OCCUPANCY_LABEL,
  ASSET_TYPE,
  ASSET_TYPE_LABEL,
  ASSET_UNDERUTILIZED_THRESHOLD_PCT,
  ASSET_UTILIZATION,
  ASSET_UTILIZATION_LABEL,
  ENCROACHMENT_STATUS,
  ENCROACHMENT_STATUS_LABEL,
  LAND_USE_CLASS,
  LAND_USE_CLASS_LABEL,
  LEASE_STATUS,
  LEASE_STATUS_LABEL,
  MACHINERY_OPERATIONAL,
  MACHINERY_OPERATIONAL_LABEL,
  MODULE,
  type AssetEvidenceStatus,
  type AssetLitigationStatus,
  type AssetType,
  type AssetUtilization,
  type EncroachmentStatus,
} from '@/constants'
import { mockAssetService, valuationVariance } from '@/mock-services/asset.service'
import { mockOrganizationService } from '@/mock-services'
import { RecordAttachmentsPanel } from '@/portals/shared/DocumentsEvidenceWorkspacePages'
import {
  AssetEntryForm,
  assetAddLabel,
  assetDraftToPayload,
  emptyAssetDraft,
  isAssetDraftValid,
  resolveFixedAssetType,
} from '@/portals/shared/assetEntryForm'
import { hasPermission, PERMISSION } from '@/permissions'
import { useSessionStore } from '@/state/session'
import { useUiStore } from '@/state/ui'
import type { Asset, AssetHistoryEvent, AssetSummary } from '@/types/domain'
import { AppError, cn, formatCurrencyPkr } from '@/utils'

type PortalMode = 'soe' | 'moip' | 'minister'

function detailPath(portal: PortalMode, id: string) {
  if (portal === 'moip') return `/moip/assets/${id}`
  if (portal === 'minister') return `/minister/assets/${id}`
  return `/soe/assets/${id}`
}

function registryPath(portal: PortalMode) {
  if (portal === 'moip') return '/moip/assets'
  if (portal === 'minister') return '/minister/assets'
  return '/soe/assets/land'
}

const inputClass =
  'h-10 w-full rounded-md border border-soe-border bg-white px-3 text-sm disabled:bg-[var(--color-pending-soft)]'

function SummaryCards({
  summary,
  portal,
  onFilter,
}: {
  summary: AssetSummary
  portal: PortalMode
  onFilter: (params: Record<string, string>) => void
}) {
  const cards = [
    { label: 'Assets', value: String(summary.totalCount), action: () => onFilter({}) },
    {
      label: 'Book value',
      value: formatCurrencyPkr(summary.totalBookValue),
      action: () => onFilter({}),
    },
    {
      label: 'Market value',
      value: formatCurrencyPkr(summary.totalMarketValue),
      action: () => onFilter({}),
    },
    {
      label: 'Idle / unused',
      value: String(summary.idleOrUnusedCount),
      action: () => onFilter({ utilization: ASSET_UTILIZATION.IDLE }),
    },
    {
      label: 'Encroached land',
      value: String(summary.encroachedLandCount),
      action: () =>
        onFilter({
          assetType: ASSET_TYPE.LAND,
          encroachment: ENCROACHMENT_STATUS.ENCROACHED,
        }),
    },
    {
      label: 'Under litigation',
      value: String(summary.underLitigationCount),
      action: () => onFilter({ litigation: ASSET_LITIGATION_STATUS.ACTIVE }),
    },
    {
      label: 'Missing valuation',
      value: String(summary.missingValuationCount),
      action: () => onFilter({ missingValuation: '1' }),
    },
    {
      label: 'Missing evidence',
      value: String(summary.missingEvidenceCount),
      action: () => onFilter({ evidenceStatus: ASSET_EVIDENCE_STATUS.MISSING }),
    },
  ]

  return (
    <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((c) => (
        <button
          key={c.label}
          type="button"
          onClick={c.action}
          className="rounded-card border border-soe-border bg-white p-4 text-left hover:border-soe-blue"
        >
          <p className="text-[11px] font-semibold uppercase tracking-wide text-soe-slate">
            {c.label}
          </p>
          <p className="mt-1 text-2xl font-semibold text-soe-navy">{c.value}</p>
          <p className="mt-1 text-xs text-soe-blue">Open filtered registry</p>
        </button>
      ))}
      <div className="rounded-card border border-soe-border bg-white p-4 sm:col-span-2 lg:col-span-4">
        <p className="mb-2 text-xs font-semibold uppercase text-soe-slate">Count by type</p>
        <div className="flex flex-wrap gap-3 text-sm">
          {Object.entries(summary.countByType).map(([type, n]) => (
            <Link
              key={type}
              className="text-soe-navy hover:underline"
              to={`${registryPath(portal)}?assetType=${type}`}
            >
              {ASSET_TYPE_LABEL[type as AssetType] ?? type}: {n}
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

export function AssetRegistryWorkspace({
  portal,
  fixedType,
  title,
}: {
  portal: PortalMode
  fixedType?: AssetType | AssetType[]
  title?: string
}) {
  const role = useSessionStore((s) => s.role)
  const organizationId = useSessionStore((s) => s.organizationId)
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const pushToast = useUiStore((s) => s.pushToast)
  const queryClient = useQueryClient()

  const portfolioScope = portal !== 'soe'
  const canEdit = portal === 'soe' && hasPermission(role, PERMISSION.ASSETS_EDIT)
  const canCreate = portal === 'soe' && hasPermission(role, PERMISSION.ASSETS_CREATE)

  const search = searchParams.get('search') ?? ''
  const assetTypeParam = searchParams.get('assetType') as AssetType | null
  const province = searchParams.get('province') ?? ''
  const utilization = (searchParams.get('utilization') ?? '') as AssetUtilization | ''
  const encroachment = (searchParams.get('encroachment') ?? '') as EncroachmentStatus | ''
  const litigation = (searchParams.get('litigation') ?? '') as AssetLitigationStatus | ''
  const evidenceStatus = (searchParams.get('evidenceStatus') ?? '') as AssetEvidenceStatus | ''
  const missingValuation = searchParams.get('missingValuation') === '1'

  const resolvedType = fixedType ?? assetTypeParam ?? undefined

  const summaryQuery = useQuery({
    queryKey: ['asset-summary', portal, organizationId, portfolioScope],
    queryFn: () =>
      mockAssetService.getSummary({
        organizationId: portfolioScope ? undefined : organizationId,
        portfolioScope,
      }),
  })

  const assetsQuery = useQuery({
    queryKey: [
      'assets',
      portal,
      organizationId,
      search,
      resolvedType,
      province,
      utilization,
      encroachment,
      litigation,
      evidenceStatus,
      missingValuation,
    ],
    queryFn: () =>
      mockAssetService.getAssets({
        pageSize: 50,
        search: search || undefined,
        assetType: resolvedType,
        province: province || undefined,
        utilization: utilization || undefined,
        encroachment: encroachment || undefined,
        litigation: litigation || undefined,
        evidenceStatus: evidenceStatus || undefined,
        missingValuation: missingValuation || undefined,
        portfolioScope,
        scopedOrganizationId: portfolioScope ? undefined : organizationId,
        organizationId: portfolioScope ? undefined : organizationId,
        sortBy: 'name',
      }),
  })

  const orgsQuery = useQuery({
    queryKey: ['organizations', 'asset-registry'],
    queryFn: () => mockOrganizationService.getOrganizations({ pageSize: 100 }),
    enabled: portfolioScope,
  })

  const orgName = useMemo(() => {
    const map = new Map((orgsQuery.data?.items ?? []).map((o) => [o.id, o.abbreviation]))
    return (id: string) => map.get(id) ?? id
  }, [orgsQuery.data])

  const setFilter = (params: Record<string, string>) => {
    const next = new URLSearchParams()
    Object.entries(params).forEach(([k, v]) => {
      if (v) next.set(k, v)
    })
    setSearchParams(next)
  }

  const importMutation = useMutation({
    mutationFn: (fileName: string) => mockAssetService.simulateImport(organizationId, fileName),
    onSuccess: (r) => {
      void queryClient.invalidateQueries({ queryKey: ['assets'] })
      void queryClient.invalidateQueries({ queryKey: ['asset-summary'] })
      pushToast({
        title: `Import checked: ${r.accepted} accepted, ${r.warnings} warnings, ${r.rejected} rejected.`,
        tone: 'success',
      })
    },
    onError: (err: unknown) => {
      pushToast({
        title: err instanceof AppError ? err.message : 'Import failed',
        tone: 'critical',
      })
    },
  })

  const columns = useMemo<ColumnDef<Asset, unknown>[]>(
    () => [
      {
        id: 'id',
        header: 'Asset ID',
        cell: ({ row }) => (
          <Link className="font-medium text-soe-navy hover:underline" to={detailPath(portal, row.original.id)}>
            {row.original.identifier ?? row.original.id}
          </Link>
        ),
      },
      { accessorKey: 'name', header: 'Name' },
      {
        id: 'type',
        header: 'Type',
        cell: ({ row }) => ASSET_TYPE_LABEL[row.original.assetType],
      },
      ...(portfolioScope
        ? [
            {
              id: 'soe',
              header: 'SOE',
              cell: ({ row }: { row: { original: Asset } }) => orgName(row.original.organizationId),
            } as ColumnDef<Asset, unknown>,
          ]
        : []),
      {
        id: 'loc',
        header: 'Location',
        cell: ({ row }) => (
          <span className="text-xs">
            {row.original.district}, {row.original.province}
          </span>
        ),
      },
      {
        id: 'book',
        header: 'Book',
        cell: ({ row }) => formatCurrencyPkr(row.original.bookValue ?? 0),
      },
      {
        id: 'market',
        header: 'Market',
        cell: ({ row }) =>
          row.original.marketValue != null ? formatCurrencyPkr(row.original.marketValue) : '—',
      },
      {
        id: 'util',
        header: 'Utilization',
        cell: ({ row }) =>
          row.original.utilizationStatus
            ? ASSET_UTILIZATION_LABEL[row.original.utilizationStatus]
            : '—',
      },
      {
        id: 'legal',
        header: 'Legal',
        cell: ({ row }) => {
          const enc = row.original.encroachmentStatus
          const lit = row.original.litigationStatus
          if (lit === ASSET_LITIGATION_STATUS.ACTIVE) {
            return <StatusBadge status="critical" label="Litigation" />
          }
          if (enc === ENCROACHMENT_STATUS.ENCROACHED) {
            return <StatusBadge status="warning" label="Encroached" />
          }
          if (enc === ENCROACHMENT_STATUS.SUSPECTED) {
            return <StatusBadge status="warning" label="Suspected" />
          }
          return <span className="text-xs text-soe-slate">Clear</span>
        },
      },
      {
        id: 'evidence',
        header: 'Evidence',
        cell: ({ row }) =>
          row.original.evidenceStatus
            ? ASSET_EVIDENCE_STATUS_LABEL[row.original.evidenceStatus]
            : '—',
      },
      {
        accessorKey: 'lastUpdated',
        header: 'Updated',
      },
    ],
    [portal, portfolioScope, orgName],
  )

  const [importFile, setImportFile] = useState('assets-template.xlsx')
  const [assetDraft, setAssetDraft] = useState(() => emptyAssetDraft(fixedType))

  const resetAssetDraft = () => setAssetDraft(emptyAssetDraft(fixedType))

  const createAsset = useMutation({
    mutationFn: () => mockAssetService.createAsset(assetDraftToPayload(assetDraft, organizationId)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['assets'] })
      void queryClient.invalidateQueries({ queryKey: ['asset-summary'] })
      pushToast({ title: 'Asset registered.', tone: 'success' })
      resetAssetDraft()
    },
    onError: (err: unknown) => {
      pushToast({
        title: err instanceof AppError ? err.message : 'Create failed',
        tone: 'critical',
      })
    },
  })

  if (assetsQuery.isError) {
    return <ErrorState title="Unable to load assets" detail="Mock service error." />
  }

  const registryTitle = title ?? (portal === 'soe' ? 'Asset registry' : 'Asset intelligence')
  const registrySubtitle =
    portal === 'soe'
      ? 'Register, filter and inspect SOE assets'
      : portal === 'minister'
        ? 'Portfolio asset intelligence (read-only)'
        : 'Portfolio asset review (read-only)'
  const registryActions =
    portal !== 'soe' && canCreate ? (
      <Button size="sm" onClick={() => navigate('/soe/assets/new')}>
        Register asset
      </Button>
    ) : null

  const assetEntryForm = canCreate ? (
    <AssetEntryForm draft={assetDraft} onChange={setAssetDraft} fixedType={fixedType} />
  ) : null

  const filterBar = (
    <div className="flex flex-wrap gap-2">
      <input
        className="h-9 rounded-md border border-soe-border px-3 text-sm"
        placeholder="Search ID or name…"
        value={search}
        onChange={(e) => {
          const next = new URLSearchParams(searchParams)
          if (e.target.value) next.set('search', e.target.value)
          else next.delete('search')
          setSearchParams(next)
        }}
      />
      {!fixedType ? (
        <select
          className="h-9 rounded-md border border-soe-border px-2 text-sm"
          value={assetTypeParam ?? ''}
          onChange={(e) => {
            const next = new URLSearchParams(searchParams)
            if (e.target.value) next.set('assetType', e.target.value)
            else next.delete('assetType')
            setSearchParams(next)
          }}
        >
          <option value="">All types</option>
          {Object.values(ASSET_TYPE).map((t) => (
            <option key={t} value={t}>
              {ASSET_TYPE_LABEL[t]}
            </option>
          ))}
        </select>
      ) : null}
      <select
        className="h-9 rounded-md border border-soe-border px-2 text-sm"
        value={utilization}
        onChange={(e) => {
          const next = new URLSearchParams(searchParams)
          if (e.target.value) next.set('utilization', e.target.value)
          else next.delete('utilization')
          setSearchParams(next)
        }}
      >
        <option value="">All utilization</option>
        {Object.values(ASSET_UTILIZATION).map((u) => (
          <option key={u} value={u}>
            {ASSET_UTILIZATION_LABEL[u]}
          </option>
        ))}
      </select>
      <select
        className="h-9 rounded-md border border-soe-border px-2 text-sm"
        value={encroachment}
        onChange={(e) => {
          const next = new URLSearchParams(searchParams)
          if (e.target.value) next.set('encroachment', e.target.value)
          else next.delete('encroachment')
          setSearchParams(next)
        }}
      >
        <option value="">All encroachment</option>
        {Object.values(ENCROACHMENT_STATUS).map((u) => (
          <option key={u} value={u}>
            {ENCROACHMENT_STATUS_LABEL[u]}
          </option>
        ))}
      </select>
      <select
        className="h-9 rounded-md border border-soe-border px-2 text-sm"
        value={litigation}
        onChange={(e) => {
          const next = new URLSearchParams(searchParams)
          if (e.target.value) next.set('litigation', e.target.value)
          else next.delete('litigation')
          setSearchParams(next)
        }}
      >
        <option value="">All litigation</option>
        {Object.values(ASSET_LITIGATION_STATUS).map((u) => (
          <option key={u} value={u}>
            {ASSET_LITIGATION_STATUS_LABEL[u]}
          </option>
        ))}
      </select>
      <select
        className="h-9 rounded-md border border-soe-border px-2 text-sm"
        value={evidenceStatus}
        onChange={(e) => {
          const next = new URLSearchParams(searchParams)
          if (e.target.value) next.set('evidenceStatus', e.target.value)
          else next.delete('evidenceStatus')
          setSearchParams(next)
        }}
      >
        <option value="">All evidence</option>
        {Object.values(ASSET_EVIDENCE_STATUS).map((u) => (
          <option key={u} value={u}>
            {ASSET_EVIDENCE_STATUS_LABEL[u]}
          </option>
        ))}
      </select>
      <label className="inline-flex items-center gap-1.5 text-xs text-soe-slate">
        <input
          type="checkbox"
          checked={missingValuation}
          onChange={(e) => {
            const next = new URLSearchParams(searchParams)
            if (e.target.checked) next.set('missingValuation', '1')
            else next.delete('missingValuation')
            setSearchParams(next)
          }}
        />
        Missing valuation
      </label>
    </div>
  )

  const tableBlock = (
    <>
      <p className="mb-2 text-xs text-soe-slate">
        Underutilized threshold (provisional): utilization &lt; {ASSET_UNDERUTILIZED_THRESHOLD_PCT}%
      </p>
      {assetsQuery.isLoading ? (
        <LoadingBlock />
      ) : !assetsQuery.data?.items.length ? (
        <EmptyState title="No assets match filters." hint="Adjust filters or register an asset." />
      ) : (
        <DataTable
          data={assetsQuery.data.items}
          columns={columns}
          isLoading={false}
          searchPlaceholder="Filter table…"
        />
      )}
    </>
  )

  const importPanel = canEdit ? (
    <section className="rounded-card border border-soe-border bg-white p-4">
      <h3 className="mb-2 text-sm font-semibold text-soe-navy">Bulk import</h3>
      <div className="flex flex-wrap items-end gap-3">
        <Button
          size="sm"
          variant="secondary"
          onClick={() => pushToast({ title: 'Template download prepared.', tone: 'info' })}
        >
          Download template
        </Button>
        <MockFileControl label="Select mock file" />
        <input
          className={cn(inputClass, 'max-w-xs')}
          value={importFile}
          onChange={(e) => setImportFile(e.target.value)}
        />
        <Button
          size="sm"
          loading={importMutation.isPending}
          onClick={() => importMutation.mutate(importFile)}
        >
          Validate & confirm
        </Button>
      </div>
    </section>
  ) : null

  if (portal === 'soe') {
    return (
      <ContributorModuleLayout
        moduleId={MODULE.ASSETS}
        title={registryTitle}
        sectionNav={<ExecutiveModuleSectionNav moduleId="soe-assets" />}
        entry={assetEntryForm ?? undefined}
        onSave={canCreate ? () => createAsset.mutate() : undefined}
        onCancel={canCreate ? resetAssetDraft : undefined}
        saving={createAsset.isPending}
        saveDisabled={!isAssetDraftValid(assetDraft, organizationId)}
        saveLabel={assetAddLabel(fixedType)}
        cancelLabel="Clear form"
        showFormActions={canCreate}
        aside={
          canCreate ? (
            <AssetFormDocumentPanel assetType={resolveFixedAssetType(fixedType)} />
          ) : undefined
        }
        registryTitle="Asset registry"
        filters={filterBar}
        registry={tableBlock}
        footer={importPanel}
      />
    )
  }

  return (
    <div>
      <PageHeader title={registryTitle} subtitle={registrySubtitle} actions={registryActions} />
      {summaryQuery.data ? (
        <SummaryCards
          summary={summaryQuery.data}
          portal={portal}
          onFilter={(p) => setFilter(p)}
        />
      ) : (
        <LoadingBlock />
      )}

      <div className="mb-3">{filterBar}</div>
      {tableBlock}
      {importPanel ? <div className="mt-4">{importPanel}</div> : null}
    </div>
  )
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-md px-3 py-1.5 text-sm font-medium',
        active ? 'bg-[var(--color-info-soft)] text-soe-navy' : 'text-soe-slate hover:bg-[var(--color-pending-soft)]',
      )}
    >
      {children}
    </button>
  )
}

function DlRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex justify-between gap-3 border-b border-soe-border py-1.5 text-sm last:border-0">
      <dt className="text-soe-slate">{label}</dt>
      <dd className="text-right text-soe-navy">{value ?? '—'}</dd>
    </div>
  )
}

export function AssetDetailWorkspace({ portal }: { portal: PortalMode }) {
  const { assetId = '' } = useParams()
  const role = useSessionStore((s) => s.role)
  const canEdit = portal === 'soe' && hasPermission(role, PERMISSION.ASSETS_EDIT)
  const [tab, setTab] = useState('overview')
  const pushToast = useUiStore((s) => s.pushToast)
  const queryClient = useQueryClient()

  const assetQuery = useQuery({
    queryKey: ['asset', assetId],
    queryFn: () => mockAssetService.getAsset(assetId),
    enabled: Boolean(assetId),
  })
  const historyQuery = useQuery({
    queryKey: ['asset-history', assetId],
    queryFn: () => mockAssetService.getHistory(assetId),
    enabled: Boolean(assetId),
  })
  const geoQuery = useQuery({
    queryKey: ['asset-geo', assetId],
    queryFn: () => mockAssetService.getGeoForAsset(assetId),
    enabled: Boolean(assetId),
  })

  const saveUtil = useMutation({
    mutationFn: (utilizationStatus: AssetUtilization) =>
      mockAssetService.updateAsset(assetId, { utilizationStatus }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['asset', assetId] })
      void queryClient.invalidateQueries({ queryKey: ['asset-history', assetId] })
      void queryClient.invalidateQueries({ queryKey: ['asset-summary'] })
      pushToast({ title: 'Utilization updated.', tone: 'success' })
    },
  })

  if (assetQuery.isLoading) return <LoadingBlock />
  if (assetQuery.isError || !assetQuery.data) {
    return <ErrorState title="Asset not found" detail="Check the asset ID or return to the registry." />
  }

  const a = assetQuery.data
  const variance = valuationVariance(a)
  const features = geoQuery.data ? [geoQuery.data] : []

  return (
    <div>
      <PageHeader
        title={a.name}
        subtitle={`${ASSET_TYPE_LABEL[a.assetType]} · ${a.identifier ?? a.id}`}
        actions={
          <Link className="text-sm text-soe-blue hover:underline" to={registryPath(portal)}>
            Back to registry
          </Link>
        }
      />

      <div className="mb-3 flex flex-wrap gap-2">
        {a.utilizationStatus ? (
          <StatusBadge status={a.utilizationStatus} label={ASSET_UTILIZATION_LABEL[a.utilizationStatus]} />
        ) : null}
        {a.litigationStatus === ASSET_LITIGATION_STATUS.ACTIVE ? (
          <StatusBadge status="critical" label="Under litigation" />
        ) : null}
        {a.encroachmentStatus && a.encroachmentStatus !== ENCROACHMENT_STATUS.CLEAR ? (
          <StatusBadge
            status="warning"
            label={ENCROACHMENT_STATUS_LABEL[a.encroachmentStatus]}
          />
        ) : null}
        {a.evidenceStatus ? (
          <StatusBadge status={a.evidenceStatus} label={ASSET_EVIDENCE_STATUS_LABEL[a.evidenceStatus]} />
        ) : null}
      </div>

      <div className="mb-4 flex flex-wrap gap-1 border-b border-soe-border pb-2">
        {[
          'overview',
          'ownership',
          'valuation',
          'utilization',
          'location',
          'documents',
          'legal',
          'history',
        ].map((t) => (
          <TabButton key={t} active={tab === t} onClick={() => setTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </TabButton>
        ))}
      </div>

      {tab === 'overview' ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <section className="rounded-card border border-soe-border bg-white p-4">
            <h3 className="mb-2 text-sm font-semibold text-soe-navy">Overview</h3>
            <dl>
              <DlRow label="Type" value={ASSET_TYPE_LABEL[a.assetType]} />
              <DlRow label="Condition" value={a.condition} />
              <DlRow label="Purpose" value={a.purpose} />
              <DlRow label="Current use" value={a.currentUse} />
              <DlRow label="Acquisition" value={a.acquisitionDate} />
              <DlRow label="Last updated" value={a.lastUpdated} />
            </dl>
          </section>
          <SubtypeFields asset={a} />
        </div>
      ) : null}

      {tab === 'ownership' ? (
        <section className="rounded-card border border-soe-border bg-white p-4">
          <dl>
            <DlRow label="Ownership note" value={a.ownershipNote} />
            <DlRow label="Linked land" value={a.linkedLandAssetId ?? '—'} />
            <DlRow label="Lease" value={a.leaseStatus ? LEASE_STATUS_LABEL[a.leaseStatus] : '—'} />
          </dl>
        </section>
      ) : null}

      {tab === 'valuation' ? (
        <section className="rounded-card border border-soe-border bg-white p-4">
          <dl>
            <DlRow label="Book value" value={formatCurrencyPkr(a.bookValue ?? 0)} />
            <DlRow
              label="Market value"
              value={a.marketValue != null ? formatCurrencyPkr(a.marketValue) : 'Missing'}
            />
            <DlRow
              label="Market / book variance"
              value={variance != null ? `${variance}%` : '—'}
            />
            <DlRow label="Valuation date" value={a.valuationDate} />
            <DlRow label="Method" value={a.valuationMethod} />
            <DlRow label="Authority" value={a.valuationAuthority} />
          </dl>
          {a.valuationDate && a.valuationDate < '2020-01-01' ? (
            <p className="mt-3 text-sm text-[#8a6414]">Valuation date is outdated — confirm evidence.</p>
          ) : null}
        </section>
      ) : null}

      {tab === 'utilization' ? (
        <section className="rounded-card border border-soe-border bg-white p-4">
          <dl>
            <DlRow
              label="Utilization status"
              value={
                a.utilizationStatus ? ASSET_UTILIZATION_LABEL[a.utilizationStatus] : '—'
              }
            />
            <DlRow label="Utilization %" value={a.utilizationPercent != null ? `${a.utilizationPercent}%` : '—'} />
            <DlRow
              label="Occupancy (land/building)"
              value={a.occupancyStatus ? ASSET_OCCUPANCY_LABEL[a.occupancyStatus] : '—'}
            />
            <DlRow
              label="Use classification (land)"
              value={a.useClassification ? LAND_USE_CLASS_LABEL[a.useClassification] : '—'}
            />
            <DlRow
              label="Machinery operational"
              value={
                a.operationalStatus ? MACHINERY_OPERATIONAL_LABEL[a.operationalStatus] : '—'
              }
            />
            <DlRow label="Capacity" value={a.capacity} />
            <DlRow label="Disposed" value={a.disposed ? a.disposalStatus ?? 'Yes' : 'No'} />
          </dl>
          {canEdit && !a.disposed ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {Object.values(ASSET_UTILIZATION)
                .filter((u) => u !== ASSET_UTILIZATION.DISPOSED)
                .map((u) => (
                  <Button
                    key={u}
                    size="sm"
                    variant="secondary"
                    onClick={() => saveUtil.mutate(u)}
                  >
                    Set {ASSET_UTILIZATION_LABEL[u]}
                  </Button>
                ))}
            </div>
          ) : null}
        </section>
      ) : null}

      {tab === 'location' ? (
        <section className="space-y-3">
          <div className="rounded-card border border-soe-border bg-white p-4">
            <dl>
              <DlRow label="Province" value={a.province} />
              <DlRow label="District" value={a.district} />
              <DlRow label="Tehsil" value={a.tehsil} />
              <DlRow label="Coordinates" value={a.latitude != null ? `${a.latitude}, ${a.longitude}` : '—'} />
            </dl>
          </div>
          <MapPreview features={features} selectedId={geoQuery.data?.id} />
        </section>
      ) : null}

      {tab === 'documents' ? (
        <RecordAttachmentsPanel
          recordType="asset"
          recordId={assetId}
          title="Evidence attachments"
          portal={portal === 'minister' ? 'moip' : portal === 'moip' ? 'moip' : 'soe'}
        />
      ) : null}

      {tab === 'legal' ? (
        <section className="rounded-card border border-soe-border bg-white p-4">
          <dl>
            <DlRow
              label="Encroachment"
              value={
                a.encroachmentStatus
                  ? ENCROACHMENT_STATUS_LABEL[a.encroachmentStatus]
                  : '—'
              }
            />
            <DlRow
              label="Litigation"
              value={
                a.litigationStatus
                  ? ASSET_LITIGATION_STATUS_LABEL[a.litigationStatus]
                  : '—'
              }
            />
            <DlRow label="Linked litigation ID" value={a.linkedLitigationId ?? '—'} />
            <DlRow label="Lease" value={a.leaseStatus ? LEASE_STATUS_LABEL[a.leaseStatus] : '—'} />
            <DlRow
              label="Evidence completeness"
              value={
                a.evidenceStatus ? ASSET_EVIDENCE_STATUS_LABEL[a.evidenceStatus] : '—'
              }
            />
          </dl>
          <p className="mt-3 text-xs text-soe-slate">
            Legal indicators are informational — they do not constitute a legal conclusion.
          </p>
        </section>
      ) : null}

      {tab === 'history' ? (
        <HistoryPanel events={historyQuery.data ?? []} loading={historyQuery.isLoading} />
      ) : null}
    </div>
  )
}

function SubtypeFields({ asset: a }: { asset: Asset }) {
  if (a.assetType === ASSET_TYPE.LAND) {
    return (
      <section className="rounded-card border border-soe-border bg-white p-4">
        <h3 className="mb-2 text-sm font-semibold text-soe-navy">Land details</h3>
        <dl>
          <DlRow label="Mouza" value={a.mouza} />
          <DlRow label="Survey no." value={a.surveyNumber} />
          <DlRow label="Khasra" value={a.khasraNumber} />
          <DlRow label="Acres" value={a.areaAcres} />
          <DlRow label="Kanals" value={a.areaKanals} />
          <DlRow label="Sq ft" value={a.areaSqFt?.toLocaleString()} />
          <DlRow
            label="Occupancy"
            value={a.occupancyStatus ? ASSET_OCCUPANCY_LABEL[a.occupancyStatus] : '—'}
          />
          <DlRow
            label="Use class"
            value={a.useClassification ? LAND_USE_CLASS_LABEL[a.useClassification] : '—'}
          />
        </dl>
      </section>
    )
  }
  if (a.assetType === ASSET_TYPE.BUILDING) {
    return (
      <section className="rounded-card border border-soe-border bg-white p-4">
        <h3 className="mb-2 text-sm font-semibold text-soe-navy">Building details</h3>
        <dl>
          <DlRow label="Building type" value={a.buildingType} />
          <DlRow label="Floor area (sq ft)" value={a.floorAreaSqFt?.toLocaleString()} />
          <DlRow label="Age (years)" value={a.buildingAgeYears} />
          <DlRow
            label="Replacement value"
            value={a.replacementValue != null ? formatCurrencyPkr(a.replacementValue) : '—'}
          />
          <DlRow
            label="Annual maintenance"
            value={
              a.maintenanceCostAnnual != null
                ? formatCurrencyPkr(a.maintenanceCostAnnual)
                : '—'
            }
          />
          <DlRow
            label="Insurance"
            value={a.insuranceValue != null ? formatCurrencyPkr(a.insuranceValue) : '—'}
          />
        </dl>
      </section>
    )
  }
  if (a.assetType === ASSET_TYPE.MACHINERY) {
    return (
      <section className="rounded-card border border-soe-border bg-white p-4">
        <h3 className="mb-2 text-sm font-semibold text-soe-navy">Machinery details</h3>
        <dl>
          <DlRow label="Machine ID" value={a.machineId} />
          <DlRow label="Manufacturer" value={a.manufacturer} />
          <DlRow label="Purchase date" value={a.purchaseDate} />
          <DlRow label="Useful life" value={a.usefulLifeYears} />
          <DlRow
            label="Operational status"
            value={
              a.operationalStatus ? MACHINERY_OPERATIONAL_LABEL[a.operationalStatus] : '—'
            }
          />
          <DlRow label="Maintenance" value={a.maintenanceSchedule} />
        </dl>
      </section>
    )
  }
  if (a.assetType === ASSET_TYPE.VEHICLE) {
    return (
      <section className="rounded-card border border-soe-border bg-white p-4">
        <h3 className="mb-2 text-sm font-semibold text-soe-navy">Vehicle details</h3>
        <dl>
          <DlRow label="Number" value={a.vehicleNumber} />
          <DlRow label="Type" value={a.vehicleType} />
          <DlRow label="Purchase year" value={a.purchaseYear} />
          <DlRow label="Assigned officer" value={a.assignedOfficer} />
          <DlRow label="Mileage (km)" value={a.mileageKm?.toLocaleString()} />
          <DlRow label="Fuel" value={a.fuelConsumption} />
          <DlRow label="GPS" value={a.gpsAvailable ? 'Available' : 'Not available'} />
        </dl>
      </section>
    )
  }
  return (
    <section className="rounded-card border border-soe-border bg-white p-4">
      <h3 className="mb-2 text-sm font-semibold text-soe-navy">Equipment details</h3>
      <dl>
        <DlRow label="Category" value={a.equipmentCategory?.replaceAll('_', ' ')} />
        <DlRow label="Condition" value={a.condition} />
      </dl>
    </section>
  )
}

function HistoryPanel({
  events,
  loading,
}: {
  events: AssetHistoryEvent[]
  loading: boolean
}) {
  if (loading) return <LoadingBlock />
  if (!events.length) return <EmptyState title="No history events." />
  return (
    <ul className="space-y-2 rounded-card border border-soe-border bg-white p-4 text-sm">
      {events.map((e) => (
        <li key={e.id} className="border-b border-soe-border pb-2 last:border-0">
          <p className="font-medium text-soe-navy">{e.summary}</p>
          <p className="text-xs text-soe-slate">
            {e.occurredAt} · {e.eventType.replaceAll('_', ' ')} · {e.actorLabel}
          </p>
        </li>
      ))}
    </ul>
  )
}

export function AssetMapWorkspace({ portal }: { portal: PortalMode }) {
  const organizationId = useSessionStore((s) => s.organizationId)
  const [selectedGeoId, setSelectedGeoId] = useState<string | undefined>()

  const geoQuery = useQuery({
    queryKey: ['asset-geo-org', organizationId, portal],
    queryFn: () =>
      portal === 'soe'
        ? mockAssetService.getGeoForOrganization(organizationId)
        : mockAssetService.getGeoForOrganization(organizationId),
  })
  const assetsQuery = useQuery({
    queryKey: ['assets', 'map', organizationId],
    queryFn: () =>
      mockAssetService.getAssets({
        organizationId,
        pageSize: 100,
        scopedOrganizationId: organizationId,
      }),
  })

  const selectedAsset = useMemo(() => {
    const geo = geoQuery.data?.find((g) => g.id === selectedGeoId)
    if (!geo) return null
    return assetsQuery.data?.items.find((a) => a.id === geo.assetId) ?? null
  }, [geoQuery.data, selectedGeoId, assetsQuery.data])

  return (
    <div>
      <PageHeader title="Asset map" subtitle="Point and land polygon preview — list synchronized" />
      <div className="grid gap-4 lg:grid-cols-2">
        <MapPreview
          features={geoQuery.data ?? []}
          selectedId={selectedGeoId}
          onSelect={setSelectedGeoId}
        />
        <section className="rounded-card border border-soe-border bg-white p-4">
          <h3 className="mb-2 text-sm font-semibold text-soe-navy">Selection</h3>
          {selectedAsset ? (
            <div className="text-sm">
              <p className="font-medium text-soe-navy">{selectedAsset.name}</p>
              <p className="text-xs text-soe-slate">
                {ASSET_TYPE_LABEL[selectedAsset.assetType]} · {selectedAsset.district}
              </p>
              <Link
                className="mt-2 inline-block text-soe-blue hover:underline"
                to={detailPath(portal, selectedAsset.id)}
              >
                Open detail
              </Link>
            </div>
          ) : (
            <p className="text-sm text-soe-slate">Select a marker or polygon on the map.</p>
          )}
          <ul className="mt-4 max-h-64 space-y-1 overflow-auto text-sm">
            {(assetsQuery.data?.items ?? []).slice(0, 40).map((a) => {
              const geo = geoQuery.data?.find((g) => g.assetId === a.id)
              return (
                <li key={a.id}>
                  <button
                    type="button"
                    className="text-left text-soe-navy hover:underline"
                    onClick={() => geo && setSelectedGeoId(geo.id)}
                  >
                    {a.identifier ?? a.id} — {a.name}
                  </button>
                </li>
              )
            })}
          </ul>
        </section>
      </div>
    </div>
  )
}

export function AssetCreateWorkspace() {
  const organizationId = useSessionStore((s) => s.organizationId)
  const role = useSessionStore((s) => s.role)
  const navigate = useNavigate()
  const pushToast = useUiStore((s) => s.pushToast)
  const queryClient = useQueryClient()
  const [step, setStep] = useState(0)
  const [draft, setDraft] = useState<Partial<Asset>>({
    organizationId,
    assetType: ASSET_TYPE.LAND,
    utilizationStatus: ASSET_UTILIZATION.UTILIZED,
    litigationStatus: ASSET_LITIGATION_STATUS.CLEAR,
    encroachmentStatus: ENCROACHMENT_STATUS.CLEAR,
    leaseStatus: LEASE_STATUS.NONE,
    evidenceStatus: ASSET_EVIDENCE_STATUS.MISSING,
    condition: ASSET_CONDITION.FAIR,
    occupancyStatus: ASSET_OCCUPANCY.VACANT,
    useClassification: LAND_USE_CLASS.INDUSTRIAL,
  })

  const steps = [
    'Asset type',
    'Basic information',
    'Type-specific',
    'Ownership / location',
    'Valuation',
    'Legal / utilization',
    'Evidence',
    'Review',
  ]

  const save = useMutation({
    mutationFn: () =>
      mockAssetService.createAsset({
        ...(draft as Omit<Asset, 'id'>),
        name: draft.name!,
        assetType: draft.assetType!,
        organizationId,
      }),
    onSuccess: (row) => {
      void queryClient.invalidateQueries({ queryKey: ['assets'] })
      void queryClient.invalidateQueries({ queryKey: ['asset-summary'] })
      pushToast({ title: 'Asset registered.', tone: 'success' })
      navigate(`/soe/assets/${row.id}`)
    },
    onError: (err: unknown) => {
      pushToast({
        title: err instanceof AppError ? err.message : 'Create failed',
        tone: 'critical',
      })
    },
  })

  if (!hasPermission(role, PERMISSION.ASSETS_CREATE)) {
    return <ErrorState title="Permission denied" detail="Asset create requires Asset Officer (or equivalent)." />
  }

  return (
    <div>
      <PageHeader title="Register asset" subtitle="Staged create in demo environment" />
      <ol className="mb-4 flex flex-wrap gap-2 text-xs">
        {steps.map((s, i) => (
          <li
            key={s}
            className={cn(
              'rounded-full px-2.5 py-1',
              i === step ? 'bg-[var(--color-info-soft)] font-semibold text-soe-navy' : 'bg-[var(--color-pending-soft)] text-soe-slate',
            )}
          >
            {i + 1}. {s}
          </li>
        ))}
      </ol>

      <section className="mb-4 rounded-card border border-soe-border bg-white p-4">
        {step === 0 ? (
          <label className="block text-sm">
            <span className="mb-1 block text-xs font-semibold text-soe-slate">Asset type</span>
            <select
              className={inputClass}
              value={draft.assetType}
              onChange={(e) => setDraft({ ...draft, assetType: e.target.value as AssetType })}
            >
              {Object.values(ASSET_TYPE).map((t) => (
                <option key={t} value={t}>
                  {ASSET_TYPE_LABEL[t]}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        {step === 1 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Name">
              <input
                className={inputClass}
                value={draft.name ?? ''}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              />
            </Field>
            <Field label="Identifier">
              <input
                className={inputClass}
                value={draft.identifier ?? ''}
                onChange={(e) => setDraft({ ...draft, identifier: e.target.value })}
              />
            </Field>
            <Field label="Purpose">
              <input
                className={inputClass}
                value={draft.purpose ?? ''}
                onChange={(e) => setDraft({ ...draft, purpose: e.target.value })}
              />
            </Field>
            <Field label="Acquisition date">
              <input
                type="date"
                className={inputClass}
                value={draft.acquisitionDate ?? ''}
                onChange={(e) => setDraft({ ...draft, acquisitionDate: e.target.value })}
              />
            </Field>
          </div>
        ) : null}

        {step === 2 && draft.assetType === ASSET_TYPE.LAND ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Acres">
              <input
                type="number"
                className={inputClass}
                value={draft.areaAcres === 0 ? '' : draft.areaAcres ?? ''}
                onChange={(e) => {
                  const acres = Number(e.target.value)
                  setDraft({
                    ...draft,
                    areaAcres: acres,
                    areaKanals: acres * 8,
                    areaSqFt: Math.round(acres * 43560),
                  })
                }}
              />
            </Field>
            <Field label="Kanals (derived)">
              <input className={inputClass} disabled value={draft.areaKanals ?? ''} />
            </Field>
            <Field label="Occupancy">
              <select
                className={inputClass}
                value={draft.occupancyStatus}
                onChange={(e) =>
                  setDraft({ ...draft, occupancyStatus: e.target.value as typeof ASSET_OCCUPANCY.VACANT })
                }
              >
                {Object.values(ASSET_OCCUPANCY).map((o) => (
                  <option key={o} value={o}>
                    {ASSET_OCCUPANCY_LABEL[o]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Use classification">
              <select
                className={inputClass}
                value={draft.useClassification}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    useClassification: e.target.value as typeof LAND_USE_CLASS.INDUSTRIAL,
                  })
                }
              >
                {Object.values(LAND_USE_CLASS).map((o) => (
                  <option key={o} value={o}>
                    {LAND_USE_CLASS_LABEL[o]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Khasra">
              <input
                className={inputClass}
                value={draft.khasraNumber ?? ''}
                onChange={(e) => setDraft({ ...draft, khasraNumber: e.target.value })}
              />
            </Field>
          </div>
        ) : null}

        {step === 2 && draft.assetType === ASSET_TYPE.MACHINERY ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Machine ID">
              <input
                className={inputClass}
                value={draft.machineId ?? ''}
                onChange={(e) => setDraft({ ...draft, machineId: e.target.value })}
              />
            </Field>
            <Field label="Operational status">
              <select
                className={inputClass}
                value={draft.operationalStatus ?? MACHINERY_OPERATIONAL.RUNNING}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    operationalStatus: e.target.value as typeof MACHINERY_OPERATIONAL.RUNNING,
                  })
                }
              >
                {Object.values(MACHINERY_OPERATIONAL).map((o) => (
                  <option key={o} value={o}>
                    {MACHINERY_OPERATIONAL_LABEL[o]}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        ) : null}

        {step === 2 &&
        draft.assetType !== ASSET_TYPE.LAND &&
        draft.assetType !== ASSET_TYPE.MACHINERY ? (
          <p className="text-sm text-soe-slate">
            Type-specific fields can be completed after registration on the detail screen.
          </p>
        ) : null}

        {step === 3 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Province">
              <input
                className={inputClass}
                value={draft.province ?? ''}
                onChange={(e) => setDraft({ ...draft, province: e.target.value })}
              />
            </Field>
            <Field label="District">
              <input
                className={inputClass}
                value={draft.district ?? ''}
                onChange={(e) => setDraft({ ...draft, district: e.target.value })}
              />
            </Field>
            <Field label="Latitude">
              <input
                type="number"
                className={inputClass}
                value={draft.latitude ?? ''}
                onChange={(e) => setDraft({ ...draft, latitude: Number(e.target.value) })}
              />
            </Field>
            <Field label="Longitude">
              <input
                type="number"
                className={inputClass}
                value={draft.longitude ?? ''}
                onChange={(e) => setDraft({ ...draft, longitude: Number(e.target.value) })}
              />
            </Field>
            <Field label="Ownership note">
              <input
                className={inputClass}
                value={draft.ownershipNote ?? ''}
                onChange={(e) => setDraft({ ...draft, ownershipNote: e.target.value })}
              />
            </Field>
          </div>
        ) : null}

        {step === 4 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Book value (PKR)">
              <PkrAmountInput
                value={draft.bookValue ?? ''}
                onChange={(e) => setDraft({ ...draft, bookValue: Number(e.target.value) })}
              />
            </Field>
            <Field label="Market value (PKR)">
              <PkrAmountInput
                value={draft.marketValue ?? ''}
                onChange={(e) => setDraft({ ...draft, marketValue: Number(e.target.value) })}
              />
            </Field>
            <Field label="Valuation date">
              <input
                type="date"
                className={inputClass}
                value={draft.valuationDate ?? ''}
                onChange={(e) => setDraft({ ...draft, valuationDate: e.target.value })}
              />
            </Field>
          </div>
        ) : null}

        {step === 5 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Utilization">
              <select
                className={inputClass}
                value={draft.utilizationStatus}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    utilizationStatus: e.target.value as AssetUtilization,
                  })
                }
              >
                {Object.values(ASSET_UTILIZATION).map((u) => (
                  <option key={u} value={u}>
                    {ASSET_UTILIZATION_LABEL[u]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Encroachment">
              <select
                className={inputClass}
                value={draft.encroachmentStatus}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    encroachmentStatus: e.target.value as EncroachmentStatus,
                  })
                }
              >
                {Object.values(ENCROACHMENT_STATUS).map((u) => (
                  <option key={u} value={u}>
                    {ENCROACHMENT_STATUS_LABEL[u]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Litigation">
              <select
                className={inputClass}
                value={draft.litigationStatus}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    litigationStatus: e.target.value as AssetLitigationStatus,
                  })
                }
              >
                {Object.values(ASSET_LITIGATION_STATUS).map((u) => (
                  <option key={u} value={u}>
                    {ASSET_LITIGATION_STATUS_LABEL[u]}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        ) : null}

        {step === 6 ? (
          <Field label="Evidence status">
            <select
              className={inputClass}
              value={draft.evidenceStatus}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  evidenceStatus: e.target.value as AssetEvidenceStatus,
                })
              }
            >
              {Object.values(ASSET_EVIDENCE_STATUS).map((u) => (
                <option key={u} value={u}>
                  {ASSET_EVIDENCE_STATUS_LABEL[u]}
                </option>
              ))}
            </select>
          </Field>
        ) : null}

        {step === 7 ? (
          <dl className="text-sm">
            <DlRow label="Type" value={draft.assetType ? ASSET_TYPE_LABEL[draft.assetType] : '—'} />
            <DlRow label="Name" value={draft.name} />
            <DlRow label="Book" value={draft.bookValue != null ? formatCurrencyPkr(draft.bookValue) : '—'} />
            <DlRow label="Location" value={`${draft.district ?? '—'}, ${draft.province ?? '—'}`} />
          </dl>
        ) : null}
      </section>

      <div className="flex gap-2">
        <Button
          size="sm"
          variant="secondary"
          disabled={step === 0}
          onClick={() => setStep((s) => Math.max(0, s - 1))}
        >
          Back
        </Button>
        {step < steps.length - 1 ? (
          <Button size="sm" onClick={() => setStep((s) => Math.min(steps.length - 1, s + 1))}>
            Continue
          </Button>
        ) : (
          <Button size="sm" loading={save.isPending} onClick={() => save.mutate()}>
            Confirm register
          </Button>
        )}
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-xs font-semibold text-soe-slate">{label}</span>
      {children}
    </label>
  )
}

export function SoeAssetRegistryPage() {
  return <AssetRegistryWorkspace portal="soe" />
}
export function SoeLandAssetsPage() {
  return <AssetRegistryWorkspace portal="soe" fixedType={ASSET_TYPE.LAND} title="Land assets" />
}
export function SoeBuildingAssetsPage() {
  return (
    <AssetRegistryWorkspace portal="soe" fixedType={ASSET_TYPE.BUILDING} title="Buildings" />
  )
}
export function SoeMachineryAssetsPage() {
  return (
    <AssetRegistryWorkspace portal="soe" fixedType={ASSET_TYPE.MACHINERY} title="Machinery" />
  )
}
export function SoeVehicleAssetsPage() {
  return (
    <AssetRegistryWorkspace portal="soe" fixedType={ASSET_TYPE.VEHICLE} title="Vehicles" />
  )
}
export function SoeEquipmentAssetsPage() {
  return (
    <AssetRegistryWorkspace
      portal="soe"
      fixedType={[ASSET_TYPE.OTHER_EQUIPMENT, ASSET_TYPE.IT_EQUIPMENT]}
      title="Other equipment"
    />
  )
}
export function SoeAssetDetailPage() {
  return <AssetDetailWorkspace portal="soe" />
}
export { SoeNationalAssetMapPage as SoeAssetMapPage } from '@/portals/shared/NationalIndustrialAssetMapPages'
export function MoipAssetsPage() {
  return <AssetRegistryWorkspace portal="moip" title="Assets & property" />
}
export function MoipAssetDetailPage() {
  return <AssetDetailWorkspace portal="moip" />
}
export function MinisterAssetsPage() {
  return <AssetRegistryWorkspace portal="minister" title="Asset intelligence" />
}
export function MinisterAssetDetailPage() {
  return <AssetDetailWorkspace portal="minister" />
}
