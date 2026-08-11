/**
 * Minister Strategic Intelligence Portal — Phase 16.
 * Strategy-first: portfolio intelligence first; detail on demand. Read-only.
 */
import { useQuery } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { PageHeader } from '@/components/layout/PageHeader'
import { DataTable } from '@/components/tables/DataTable'
import { Card } from '@/design-system/components/Card'
import { SelectField, TextField } from '@/design-system/components/Fields'
import { EmptyState, ErrorState, LoadingBlock } from '@/design-system/components/Feedback'
import { KpiValue } from '@/design-system/components/KpiCard'
import { StatusBadge } from '@/design-system/components/StatusBadge'
import { ChartContainer } from '@/design-system/components/ChartContainer'
import { RequirePermission } from '@/app/router/guards'
import {
  PORTFOLIO_HEALTH_LABEL,
  SOE_STATUS_LABEL,
  STRATEGIC_OPPORTUNITY_KIND_LABEL,
  type PortfolioHealthBand,
  type SoeStatus,
  type StrategicOpportunityKind,
} from '@/constants'
import { mockMinisterPortalService } from '@/mock-services'
import type {
  MinisterAttentionItem,
  MinisterFilter,
  MinisterHealthRow,
  MinisterOpportunityItem,
} from '@/mock-services/ministerPortal.service'
import { PERMISSION } from '@/permissions'
import { useSessionStore } from '@/state/session'
import { cn, formatCurrencyPkr } from '@/utils'
import { BoardWorkspace } from '@/portals/shared/PeopleGovernanceWorkspacePages'
import { AssetRegistryWorkspace } from '@/portals/shared/AssetWorkspacePages'
import { PrivatizationPipelineWorkspace } from '@/portals/shared/AccountabilityWorkspacePages'

const linkClass = 'text-sm text-soe-blue underline'

function KpiLink({
  to,
  label,
  value,
  period,
}: {
  to: string
  label: string
  value: string
  period?: string
}) {
  return (
    <Link to={to} className="block">
      <KpiValue label={label} value={value} period={period} className="p-3 [&_p:nth-child(2)]:text-xl" />
    </Link>
  )
}

function useMinisterFilter(): [MinisterFilter, (patch: Partial<MinisterFilter>) => void] {
  const reportingPeriodId = useSessionStore((s) => s.reportingPeriodId)
  const setReportingPeriodId = useSessionStore((s) => s.setReportingPeriodId)
  const [searchParams, setSearchParams] = useSearchParams()
  const filter: MinisterFilter = {
    reportingPeriodId: searchParams.get('period') ?? reportingPeriodId,
    sector: searchParams.get('sector') ?? '',
    status: (searchParams.get('status') as SoeStatus) || '',
    province: searchParams.get('province') ?? '',
  }
  const setFilter = (patch: Partial<MinisterFilter>) => {
    const next = new URLSearchParams(searchParams)
    const merged = { ...filter, ...patch }
    if (merged.reportingPeriodId) {
      next.set('period', merged.reportingPeriodId)
      setReportingPeriodId(merged.reportingPeriodId)
    }
    if (merged.sector) next.set('sector', merged.sector)
    else next.delete('sector')
    if (merged.status) next.set('status', merged.status)
    else next.delete('status')
    if (merged.province) next.set('province', merged.province)
    else next.delete('province')
    setSearchParams(next)
  }
  return [filter, setFilter]
}

function ExecutiveFilters({
  filter,
  setFilter,
  options,
}: {
  filter: MinisterFilter
  setFilter: (patch: Partial<MinisterFilter>) => void
  options: {
    sectors: string[]
    provinces: string[]
    statuses: SoeStatus[]
    periods: Array<{ id: string; label: string }>
  }
}) {
  return (
    <div className="mb-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
      <SelectField
        label="Reporting period"
        value={filter.reportingPeriodId ?? ''}
        onChange={(e) => setFilter({ reportingPeriodId: e.target.value })}
        options={options.periods.map((p) => ({ value: p.id, label: p.label }))}
      />
      <SelectField
        label="Sector"
        value={filter.sector ?? ''}
        onChange={(e) => setFilter({ sector: e.target.value })}
        options={[
          { value: '', label: 'All sectors' },
          ...options.sectors.map((s) => ({ value: s, label: s })),
        ]}
      />
      <SelectField
        label="Enterprise status"
        value={filter.status ?? ''}
        onChange={(e) => setFilter({ status: e.target.value as SoeStatus | '' })}
        options={[
          { value: '', label: 'All statuses' },
          ...options.statuses.map((s) => ({
            value: s,
            label: SOE_STATUS_LABEL[s] ?? s,
          })),
        ]}
      />
      <SelectField
        label="Province"
        value={filter.province ?? ''}
        onChange={(e) => setFilter({ province: e.target.value })}
        options={[
          { value: '', label: 'All provinces' },
          ...options.provinces.map((p) => ({ value: p, label: p })),
        ]}
      />
    </div>
  )
}

function SeverityBadge({ severity }: { severity: string }) {
  return (
    <StatusBadge
      status={severity === 'attention' ? 'warning' : severity}
      family="risk"
      label={severity === 'critical' ? 'Critical' : severity === 'attention' ? 'Attention' : severity}
    />
  )
}

export function MinisterExecutiveOverviewPage() {
  const [filter, setFilter] = useMinisterFilter()
  const overview = useQuery({
    queryKey: ['minister-overview', filter],
    queryFn: () => mockMinisterPortalService.getExecutiveOverview(filter),
  })

  if (overview.isLoading) return <LoadingBlock label="Loading strategic overview…" />
  if (overview.isError || !overview.data) {
    return <ErrorState title="Unable to load strategic overview" />
  }

  const { summary: s, majorRisks, opportunities, attention, filterOptions } = overview.data
  const periodLabel =
    filterOptions.periods.find((p) => p.id === s.reportingPeriodId)?.label ?? s.reportingPeriodId
  const util =
    s.averageCapacityUtilization == null
      ? '—'
      : `${s.averageCapacityUtilization.toFixed(0)}%`

  return (
    <RequirePermission permission={PERMISSION.EXECUTIVE_DASHBOARD_READ}>
      <div>
        <PageHeader
          title="Executive overview"
          subtitle={`Strategic portfolio intelligence · ${periodLabel} · as of ${s.asOf} · read-only`}
        />
        <ExecutiveFilters filter={filter} setFilter={setFilter} options={filterOptions} />

        <div className="mb-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <KpiLink
            to="/minister/portfolio"
            label="SOEs"
            value={String(
              Object.values(s.soeCountByStatus).reduce((a, b) => a + b, 0),
            )}
            period={Object.entries(s.soeCountByStatus)
              .map(([k, v]) => `${SOE_STATUS_LABEL[k as SoeStatus] ?? k}: ${v}`)
              .slice(0, 2)
              .join(' · ')}
          />
          <KpiLink
            to="/minister/portfolio"
            label="Profit / loss"
            value={`${s.profitableCount} / ${s.lossMakingCount}`}
            period="Profitable · loss-making"
          />
          <KpiLink
            to="/minister/assets"
            label="Asset book value"
            value={formatCurrencyPkr(s.aggregateAssetBookValue)}
          />
          <KpiLink
            to="/minister/fiscal"
            label="Debt + guarantees"
            value={formatCurrencyPkr(s.aggregateDebt + s.aggregateGuarantees)}
            period="Prototype methodology"
          />
          <KpiLink
            to="/minister/fiscal"
            label="Subsidies"
            value={formatCurrencyPkr(s.aggregateSubsidies)}
          />
          <KpiLink
            to="/minister/industrial"
            label="Capacity utilization"
            value={util}
            period="Portfolio average"
          />
        </div>
        <p className="mb-4 text-xs text-soe-slate">{s.financeScopeNote}</p>

        <div className="mb-4 grid gap-4 lg:grid-cols-2">
          <Card title="Major risks">
            {majorRisks.length ? (
              <ul className="space-y-2 text-sm">
                {majorRisks.slice(0, 6).map((r) => (
                  <li
                    key={r.id}
                    className="flex items-start justify-between gap-2 border-b border-soe-border pb-2"
                  >
                    <span>
                      <span className="font-medium">{r.organizationLabel}</span>
                      {' · '}
                      {r.issue}
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      <SeverityBadge severity={r.severity} />
                      <Link className={linkClass} to={r.route}>
                        Open
                      </Link>
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState title="No major risks in filter" />
            )}
          </Card>

          <Card title="Strategic opportunities">
            <p className="mb-2 text-xs text-soe-slate">
              Prototype decision-support signals — not formal recommendations
            </p>
            {opportunities.length ? (
              <ul className="space-y-2 text-sm">
                {opportunities.map((o) => (
                  <li
                    key={o.id}
                    className="flex items-start justify-between gap-2 border-b border-soe-border pb-2"
                  >
                    <span>
                      <span className="font-medium">{o.organizationLabel}</span>
                      {' · '}
                      {o.title}
                    </span>
                    <Link className={linkClass} to={o.route}>
                      Open
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState title="No opportunities in filter" />
            )}
            <Link className={cn(linkClass, 'mt-3 inline-block')} to="/minister/opportunities">
              All opportunities
            </Link>
          </Card>
        </div>

        <Card title="Decisions / attention">
          {attention.length ? (
            <AttentionTable items={attention} />
          ) : (
            <EmptyState title="No strategic attention items" />
          )}
          <Link className={cn(linkClass, 'mt-3 inline-block')} to="/minister/alerts">
            Strategic alerts
          </Link>
        </Card>
      </div>
    </RequirePermission>
  )
}

function AttentionTable({ items }: { items: MinisterAttentionItem[] }) {
  const columns = useMemo<ColumnDef<MinisterAttentionItem, unknown>[]>(
    () => [
      { accessorKey: 'organizationLabel', header: 'SOE' },
      { accessorKey: 'matter', header: 'Matter' },
      {
        accessorKey: 'source',
        header: 'Source',
        cell: ({ getValue }) => String(getValue()).replaceAll('_', ' '),
      },
      {
        accessorKey: 'urgency',
        header: 'Urgency',
        cell: ({ getValue }) => <SeverityBadge severity={String(getValue())} />,
      },
      {
        id: 'open',
        header: '',
        cell: ({ row }) => (
          <Link className={linkClass} to={row.original.route}>
            Open
          </Link>
        ),
      },
    ],
    [],
  )
  return <DataTable data={items} columns={columns} density="compact" showSearch={false} />
}

export function MinisterPortfolioHealthPage() {
  const [filter, setFilter] = useMinisterFilter()
  const [searchParams] = useSearchParams()
  const soe = searchParams.get('soe') ?? ''
  const [search, setSearch] = useState('')
  const options = useQuery({
    queryKey: ['minister-filter-options'],
    queryFn: () => mockMinisterPortalService.getFilterOptions(),
  })
  const health = useQuery({
    queryKey: ['minister-portfolio-health', filter, search, soe],
    queryFn: () =>
      mockMinisterPortalService.getPortfolioHealth({
        ...filter,
        search: search || undefined,
        organizationId: soe || undefined,
        pageSize: 50,
      }),
  })
  const lineage = useQuery({
    queryKey: ['minister-lineage', soe],
    enabled: Boolean(soe),
    queryFn: () => mockMinisterPortalService.getLineageLinks(soe),
  })

  const columns = useMemo<ColumnDef<MinisterHealthRow, unknown>[]>(
    () => [
      {
        accessorKey: 'abbreviation',
        header: 'SOE',
        cell: ({ row }) => (
          <Link className={linkClass} to={`/minister/portfolio?soe=${row.original.organizationId}`}>
            {row.original.abbreviation}
          </Link>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ getValue }) => SOE_STATUS_LABEL[getValue() as SoeStatus] ?? String(getValue()),
      },
      {
        accessorKey: 'financialPosition',
        header: 'Financial',
        cell: ({ getValue }) => String(getValue()).replaceAll('_', ' '),
      },
      {
        accessorKey: 'governanceCondition',
        header: 'Governance',
      },
      {
        accessorKey: 'healthBand',
        header: 'Health (prov.)',
        cell: ({ getValue }) => (
          <StatusBadge
            status={
              getValue() === 'concern'
                ? 'critical'
                : getValue() === 'watch'
                  ? 'warning'
                  : 'low'
            }
            family="risk"
            label={PORTFOLIO_HEALTH_LABEL[getValue() as PortfolioHealthBand]}
          />
        ),
      },
      {
        accessorKey: 'profitOrLoss',
        header: 'P/L',
        cell: ({ getValue }) =>
          getValue() == null ? '—' : formatCurrencyPkr(Number(getValue())),
      },
      {
        accessorKey: 'capacityUtilization',
        header: 'Cap. util.',
        cell: ({ getValue }) =>
          getValue() == null ? '—' : `${Number(getValue()).toFixed(0)}%`,
      },
      { accessorKey: 'warningCount', header: 'Warnings' },
    ],
    [],
  )

  return (
    <RequirePermission permission={PERMISSION.PORTFOLIO_READ}>
      <div>
        <PageHeader
          title="Portfolio health"
          subtitle="Component indicators · provisional health band · not a sole score"
        />
        {options.data ? (
          <ExecutiveFilters filter={filter} setFilter={setFilter} options={options.data} />
        ) : null}
        <div className="mb-3 max-w-sm">
          <TextField
            label="Search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="SOE or sector"
          />
        </div>
        {health.isLoading ? <LoadingBlock label="Loading portfolio health…" /> : null}
        {health.isError ? <ErrorState title="Unable to load portfolio health" /> : null}
        {health.data ? (
          health.data.items.length ? (
            <DataTable data={health.data.items} columns={columns} density="compact" showSearch={false} />
          ) : (
            <EmptyState title="No SOEs match filters" />
          )
        ) : null}

        {soe && lineage.data ? (
          <Card title={`Drill-down · ${soe.replace('org-', '').toUpperCase()}`} className="mt-4">
            <ul className="space-y-2 text-sm">
              {lineage.data.map((l) => (
                <li key={l.id}>
                  <Link className={linkClass} to={l.route}>
                    {l.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link className={linkClass} to="/minister/governance">
                  Governance risk
                </Link>
              </li>
              <li>
                <Link className={linkClass} to="/minister/audit-legal">
                  Audit & legal
                </Link>
              </li>
            </ul>
          </Card>
        ) : null}
      </div>
    </RequirePermission>
  )
}

export function MinisterStrategicOpportunitiesPage() {
  const [filter, setFilter] = useMinisterFilter()
  const [kind, setKind] = useState('')
  const [search, setSearch] = useState('')
  const options = useQuery({
    queryKey: ['minister-filter-options'],
    queryFn: () => mockMinisterPortalService.getFilterOptions(),
  })
  const list = useQuery({
    queryKey: ['minister-opportunities', filter, kind, search],
    queryFn: () =>
      mockMinisterPortalService.getStrategicOpportunities({
        ...filter,
        kind: kind || undefined,
        search: search || undefined,
        pageSize: 50,
      }),
  })

  const columns = useMemo<ColumnDef<MinisterOpportunityItem, unknown>[]>(
    () => [
      { accessorKey: 'organizationLabel', header: 'SOE' },
      {
        accessorKey: 'kind',
        header: 'Kind',
        cell: ({ getValue }) =>
          STRATEGIC_OPPORTUNITY_KIND_LABEL[getValue() as StrategicOpportunityKind] ??
          String(getValue()),
      },
      { accessorKey: 'title', header: 'Opportunity' },
      { accessorKey: 'detail', header: 'Detail' },
      {
        accessorKey: 'amountPkr',
        header: 'Value (ind.)',
        cell: ({ getValue }) =>
          getValue() == null ? '—' : formatCurrencyPkr(Number(getValue())),
      },
      {
        id: 'open',
        header: '',
        cell: ({ row }) => (
          <Link className={linkClass} to={row.original.route}>
            Open
          </Link>
        ),
      },
    ],
    [],
  )

  return (
    <RequirePermission permission={PERMISSION.EXECUTIVE_DASHBOARD_READ}>
      <div>
        <PageHeader
          title="Strategic opportunities"
          subtitle="Prototype signals only · not formal recommendations"
        />
        {options.data ? (
          <ExecutiveFilters filter={filter} setFilter={setFilter} options={options.data} />
        ) : null}
        <div className="mb-3 grid gap-2 sm:grid-cols-2">
          <SelectField
            label="Kind"
            value={kind}
            onChange={(e) => setKind(e.target.value)}
            options={[
              { value: '', label: 'All kinds' },
              ...Object.entries(STRATEGIC_OPPORTUNITY_KIND_LABEL).map(([value, label]) => ({
                value,
                label,
              })),
            ]}
          />
          <TextField
            label="Search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="SOE or opportunity"
          />
        </div>
        {list.isLoading ? <LoadingBlock label="Loading opportunities…" /> : null}
        {list.isError ? <ErrorState title="Unable to load opportunities" /> : null}
        {list.data ? (
          list.data.items.length ? (
            <DataTable data={list.data.items} columns={columns} density="compact" showSearch={false} />
          ) : (
            <EmptyState title="No strategic opportunities in filter" />
          )
        ) : null}
      </div>
    </RequirePermission>
  )
}

/** Enhanced fiscal page: wraps shared chart view with Minister service reconciliation strip */
export function MinisterFiscalExposurePage() {
  const [filter, setFilter] = useMinisterFilter()
  const options = useQuery({
    queryKey: ['minister-filter-options'],
    queryFn: () => mockMinisterPortalService.getFilterOptions(),
  })
  const fiscal = useQuery({
    queryKey: ['minister-fiscal-intel', filter],
    queryFn: () => mockMinisterPortalService.getFiscalExposure(filter),
  })

  const trend = fiscal.data?.trend ?? []

  return (
    <RequirePermission permission={PERMISSION.FINANCE_READ}>
      <div>
        <PageHeader
          title="Fiscal exposure"
          subtitle="Investment, debt, guarantees, subsidies · prototype methodology"
        />
        {options.data ? (
          <ExecutiveFilters filter={filter} setFilter={setFilter} options={options.data} />
        ) : null}
        {fiscal.isLoading ? <LoadingBlock label="Loading fiscal exposure…" /> : null}
        {fiscal.isError ? <ErrorState title="Unable to load fiscal exposure" /> : null}
        {fiscal.data ? (
          <>
            <div className="mb-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <KpiValue
                label="Gov. investment"
                value={formatCurrencyPkr(fiscal.data.summary.aggregateGovernmentInvestment)}
                period="Paid-up capital (provisional)"
                className="p-3 [&_p:nth-child(2)]:text-xl"
              />
              <KpiValue
                label="Aggregate debt"
                value={formatCurrencyPkr(fiscal.data.summary.aggregateDebt)}
                className="p-3 [&_p:nth-child(2)]:text-xl"
              />
              <KpiValue
                label="Guarantees"
                value={formatCurrencyPkr(fiscal.data.summary.aggregateGuarantees)}
                className="p-3 [&_p:nth-child(2)]:text-xl"
              />
              <KpiValue
                label="Subsidies + grants"
                value={formatCurrencyPkr(
                  fiscal.data.summary.aggregateSubsidies + fiscal.data.summary.aggregateGrants,
                )}
                className="p-3 [&_p:nth-child(2)]:text-xl"
              />
            </div>
            <ChartContainer
              title="Five-year fiscal trend"
              subtitle="Debt, subsidies and portfolio P/L"
              isEmpty={trend.length === 0}
              summary="Answers: how has fiscal burden moved?"
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="debt" name="Debt" stroke="#1B4F72" strokeWidth={2} />
                  <Line
                    type="monotone"
                    dataKey="subsidies"
                    name="Subsidies"
                    stroke="#148F77"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
            <Card title="SOE breakdown" className="mt-4">
              <FiscalBreakdownTable rows={fiscal.data.bySoe} />
            </Card>
            <p className="mt-3 text-xs text-soe-slate">
              Drill to approved finance trace via SOE row links when available.
            </p>
          </>
        ) : null}
      </div>
    </RequirePermission>
  )
}

function FiscalBreakdownTable({
  rows,
}: {
  rows: Array<{
    organizationId: string
    abbreviation: string
    investment: number
    debt: number
    guarantees: number
    subsidies: number
    grants: number
    losses: number
    route: string
  }>
}) {
  const columns = useMemo<ColumnDef<(typeof rows)[0], unknown>[]>(
    () => [
      {
        accessorKey: 'abbreviation',
        header: 'SOE',
        cell: ({ row }) => (
          <Link className={linkClass} to={row.original.route}>
            {row.original.abbreviation}
          </Link>
        ),
      },
      {
        accessorKey: 'investment',
        header: 'Investment',
        cell: ({ getValue }) => formatCurrencyPkr(Number(getValue())),
      },
      {
        accessorKey: 'debt',
        header: 'Debt',
        cell: ({ getValue }) => formatCurrencyPkr(Number(getValue())),
      },
      {
        accessorKey: 'guarantees',
        header: 'Guarantees',
        cell: ({ getValue }) => formatCurrencyPkr(Number(getValue())),
      },
      {
        accessorKey: 'subsidies',
        header: 'Subsidies',
        cell: ({ getValue }) => formatCurrencyPkr(Number(getValue())),
      },
      {
        accessorKey: 'losses',
        header: 'Losses',
        cell: ({ getValue }) => formatCurrencyPkr(Number(getValue())),
      },
    ],
    [],
  )
  return <DataTable data={rows} columns={columns} density="compact" showSearch={false} />
}

export function MinisterAssetIntelligencePage() {
  const [filter, setFilter] = useMinisterFilter()
  const options = useQuery({
    queryKey: ['minister-filter-options'],
    queryFn: () => mockMinisterPortalService.getFilterOptions(),
  })
  const intel = useQuery({
    queryKey: ['minister-asset-intel', filter],
    queryFn: () => mockMinisterPortalService.getAssetIntelligence(filter),
  })

  return (
    <RequirePermission permission={PERMISSION.ASSETS_READ}>
      <div>
        <PageHeader
          title="Asset intelligence"
          subtitle="Aggregate values · vacant / underutilized · GIS drill-down"
        />
        {options.data ? (
          <ExecutiveFilters filter={filter} setFilter={setFilter} options={options.data} />
        ) : null}
        {intel.isLoading ? <LoadingBlock label="Loading asset intelligence…" /> : null}
        {intel.isError ? <ErrorState title="Unable to load asset intelligence" /> : null}
        {intel.data ? (
          <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <KpiValue
              label="Book value"
              value={formatCurrencyPkr(intel.data.totalBookValue)}
              className="p-3 [&_p:nth-child(2)]:text-xl"
            />
            <KpiValue
              label="Market value"
              value={formatCurrencyPkr(intel.data.totalMarketValue)}
              className="p-3 [&_p:nth-child(2)]:text-xl"
            />
            <KpiValue
              label="Land market value"
              value={formatCurrencyPkr(intel.data.landMarketValue)}
              className="p-3 [&_p:nth-child(2)]:text-xl"
            />
            <KpiValue
              label="Vacant / unused"
              value={String(intel.data.vacantUnusedCount)}
              period={`Underutilized ${intel.data.underutilizedCount} · Encroached ${intel.data.encroachedLandCount} · Litigation ${intel.data.underLitigationCount}`}
              className="p-3 [&_p:nth-child(2)]:text-xl"
            />
          </div>
        ) : null}
        <AssetRegistryWorkspace portal="minister" title="Asset registry" />
      </div>
    </RequirePermission>
  )
}

export function MinisterGovernanceRiskPage() {
  const [filter, setFilter] = useMinisterFilter()
  const options = useQuery({
    queryKey: ['minister-filter-options'],
    queryFn: () => mockMinisterPortalService.getFilterOptions(),
  })
  const gov = useQuery({
    queryKey: ['minister-governance-risk', filter],
    queryFn: () => mockMinisterPortalService.getGovernanceRisk(filter),
  })

  return (
    <RequirePermission permission={PERMISSION.BOARD_READ}>
      <div>
        <PageHeader
          title="Governance risk"
          subtitle="Board vacancies, expiries, compliance gaps · summary-level"
        />
        {options.data ? (
          <ExecutiveFilters filter={filter} setFilter={setFilter} options={options.data} />
        ) : null}
        {gov.isLoading ? <LoadingBlock label="Loading governance risk…" /> : null}
        {gov.isError ? <ErrorState title="Unable to load governance risk" /> : null}
        {gov.data ? (
          <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <KpiValue label="Board vacancies" value={String(gov.data.boardVacancies)} className="p-3 [&_p:nth-child(2)]:text-xl" />
            <KpiValue label="Expiring ≤90d" value={String(gov.data.expiringWithin90)} className="p-3 [&_p:nth-child(2)]:text-xl" />
            <KpiValue label="Expired" value={String(gov.data.expiredAppointments)} className="p-3 [&_p:nth-child(2)]:text-xl" />
            <KpiValue label="Overdue compliance" value={String(gov.data.overdueCompliance)} className="p-3 [&_p:nth-child(2)]:text-xl" />
            <KpiValue label="Missing annual reports" value={String(gov.data.missingAnnualReports)} className="p-3 [&_p:nth-child(2)]:text-xl" />
            <KpiValue label="Governance alerts" value={String(gov.data.governanceAlerts)} className="p-3 [&_p:nth-child(2)]:text-xl" />
          </div>
        ) : null}
        <BoardWorkspace portal="minister" />
      </div>
    </RequirePermission>
  )
}

export function MinisterAuditLegalRiskPage() {
  const [filter, setFilter] = useMinisterFilter()
  const options = useQuery({
    queryKey: ['minister-filter-options'],
    queryFn: () => mockMinisterPortalService.getFilterOptions(),
  })
  const risk = useQuery({
    queryKey: ['minister-audit-legal', filter],
    queryFn: () => mockMinisterPortalService.getAuditLegalRisk(filter),
  })

  return (
    <RequirePermission permission={PERMISSION.ACCOUNTABILITY_READ}>
      <div>
        <PageHeader
          title="Audit & legal risk"
          subtitle="Major open paras and litigation · provisional thresholds"
        />
        {options.data ? (
          <ExecutiveFilters filter={filter} setFilter={setFilter} options={options.data} />
        ) : null}
        {risk.isLoading ? <LoadingBlock label="Loading audit & legal risk…" /> : null}
        {risk.isError ? <ErrorState title="Unable to load audit & legal risk" /> : null}
        {risk.data ? (
          <>
            <div className="mb-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <KpiValue label="Open audit paras" value={String(risk.data.openParaCount)} className="p-3 [&_p:nth-child(2)]:text-xl" />
              <KpiValue
                label="Audit exposure"
                value={formatCurrencyPkr(risk.data.totalAuditExposure)}
                className="p-3 [&_p:nth-child(2)]:text-xl"
              />
              <KpiValue
                label="Litigation exposure"
                value={formatCurrencyPkr(risk.data.litigationExposure)}
                className="p-3 [&_p:nth-child(2)]:text-xl"
              />
              <KpiValue
                label="Major cases"
                value={String(risk.data.majorLitigation.length)}
                className="p-3 [&_p:nth-child(2)]:text-xl"
              />
            </div>
            <div className="mb-4 grid gap-4 lg:grid-cols-2">
              <Card title="Major open audit paras">
                {risk.data.majorParas.length ? (
                  <ul className="space-y-2 text-sm">
                    {risk.data.majorParas.map((p) => (
                      <li key={p.id} className="flex justify-between gap-2 border-b border-soe-border pb-2">
                        <span>
                          <span className="font-medium">{p.organizationLabel}</span> · {p.title}
                        </span>
                        <span>{formatCurrencyPkr(p.amountInvolved)}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <EmptyState title="No major audit paras" />
                )}
              </Card>
              <Card title="Major litigation">
                {risk.data.majorLitigation.length ? (
                  <ul className="space-y-2 text-sm">
                    {risk.data.majorLitigation.map((l) => (
                      <li key={l.id} className="flex justify-between gap-2 border-b border-soe-border pb-2">
                        <span>
                          <span className="font-medium">{l.organizationLabel}</span> · {l.title}
                          {l.nextHearing ? (
                            <span className="block text-xs text-soe-slate">Hearing {l.nextHearing}</span>
                          ) : null}
                        </span>
                        <span>{formatCurrencyPkr(l.amountInvolved)}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <EmptyState title="No major litigation" />
                )}
              </Card>
            </div>
          </>
        ) : null}
      </div>
    </RequirePermission>
  )
}

export function MinisterPrivatizationPage() {
  const [filter, setFilter] = useMinisterFilter()
  const options = useQuery({
    queryKey: ['minister-filter-options'],
    queryFn: () => mockMinisterPortalService.getFilterOptions(),
  })
  const priv = useQuery({
    queryKey: ['minister-privatization', filter],
    queryFn: () => mockMinisterPortalService.getPrivatizationSummary(filter),
  })

  return (
    <RequirePermission permission={PERMISSION.ACCOUNTABILITY_READ}>
      <div>
        <PageHeader
          title="Privatization & Transformation"
          subtitle="Pipeline stages · blocked cases · potential value placeholder"
        />
        {options.data ? (
          <ExecutiveFilters filter={filter} setFilter={setFilter} options={options.data} />
        ) : null}
        {priv.isLoading ? <LoadingBlock label="Loading privatization…" /> : null}
        {priv.data ? (
          <div className="mb-4 grid gap-3 sm:grid-cols-3">
            <KpiValue label="In pipeline" value={String(priv.data.pipelineCount)} className="p-3 [&_p:nth-child(2)]:text-xl" />
            <KpiValue label="Blocked" value={String(priv.data.blockedCount)} className="p-3 [&_p:nth-child(2)]:text-xl" />
            <KpiValue label="Completed milestones" value={String(priv.data.completedMilestones)} className="p-3 [&_p:nth-child(2)]:text-xl" />
          </div>
        ) : null}
        {priv.data?.cases.length ? (
          <Card title="Cases" className="mb-4">
            <ul className="space-y-2 text-sm">
              {priv.data.cases.map((c) => (
                <li key={c.id} className="border-b border-soe-border pb-2">
                  <span className="font-medium">{c.organizationLabel}</span> · {c.stage} · {c.status}
                  {c.blocker ? <span className="text-soe-warning"> · {c.blocker}</span> : null}
                  <span className="block text-xs text-soe-slate">{c.potentialValueNote}</span>
                </li>
              ))}
            </ul>
          </Card>
        ) : null}
        <PrivatizationPipelineWorkspace portal="minister" />
      </div>
    </RequirePermission>
  )
}

export function MinisterIndustrialPerformancePage() {
  const [filter, setFilter] = useMinisterFilter()
  const options = useQuery({
    queryKey: ['minister-filter-options'],
    queryFn: () => mockMinisterPortalService.getFilterOptions(),
  })
  const industrial = useQuery({
    queryKey: ['minister-industrial', filter],
    queryFn: () => mockMinisterPortalService.getIndustrialSummary(filter),
  })

  const chartData = industrial.data
    ? [
        { name: 'Installed', value: industrial.data.installedCapacity },
        { name: 'Actual', value: industrial.data.actualProduction },
      ]
    : []

  return (
    <RequirePermission permission={PERMISSION.FINANCE_READ}>
      <div>
        <PageHeader
          title="Industrial performance"
          subtitle="Capacity, production, exports, employment · period-scoped"
        />
        {options.data ? (
          <ExecutiveFilters filter={filter} setFilter={setFilter} options={options.data} />
        ) : null}
        {industrial.isLoading ? <LoadingBlock label="Loading industrial performance…" /> : null}
        {industrial.data ? (
          <>
            <div className="mb-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <KpiValue
                label="Capacity utilization"
                value={
                  industrial.data.capacityUtilization == null
                    ? '—'
                    : `${industrial.data.capacityUtilization.toFixed(0)}%`
                }
                className="p-3 [&_p:nth-child(2)]:text-xl"
              />
              <KpiValue
                label="Exports"
                value={formatCurrencyPkr(industrial.data.exportContribution)}
                className="p-3 [&_p:nth-child(2)]:text-xl"
              />
              <KpiValue
                label="Domestic sales"
                value={formatCurrencyPkr(industrial.data.domesticSales)}
                className="p-3 [&_p:nth-child(2)]:text-xl"
              />
              <KpiValue
                label="Employment"
                value={industrial.data.employment.toLocaleString('en-PK')}
                period={`Underutilized orgs: ${industrial.data.underutilizedOrgCount}`}
                className="p-3 [&_p:nth-child(2)]:text-xl"
              />
            </div>
            <ChartContainer
              title="Installed vs actual production"
              subtitle="Answers: how much capacity is used?"
              isEmpty={chartData.every((d) => d.value === 0)}
              summary="Aggregate production vs installed capacity"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#1B4F72" />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </>
        ) : null}
      </div>
    </RequirePermission>
  )
}
