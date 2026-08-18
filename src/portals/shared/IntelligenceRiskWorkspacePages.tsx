/**
 * Phase 19 — Intelligence, Risk and Benchmarking workspaces.
 * Portal modes: analyst (MoIP), executive (Secretary/Minister), portfolio (PMO), soe (own).
 */
import { useQuery } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { PageHeader } from '@/components/layout/PageHeader'
import { DataTable } from '@/components/tables/DataTable'
import { RequirePermission } from '@/app/router/guards'
import { Button } from '@/design-system/components/Button'
import { Card } from '@/design-system/components/Card'
import { ChartContainer } from '@/design-system/components/ChartContainer'
import { SelectField } from '@/design-system/components/Fields'
import { Alert, EmptyState, ErrorState, LoadingBlock } from '@/design-system/components/Feedback'
import { KpiValue } from '@/design-system/components/KpiCard'
import { StatusBadge } from '@/design-system/components/StatusBadge'
import {
  BENCHMARK_METRIC,
  BENCHMARK_METRIC_LABEL,
  INTEL_DATA_STATUS_LABEL,
  INTEL_TREND_LABEL,
  RISK_DIMENSION_LABEL,
  RISK_STATUS_LABEL,
  SCORECARD_DIMENSION_LABEL,
  type BenchmarkMetric,
  type RiskDimension,
  type RiskStatus,
} from '@/constants'
import { mockIntelligenceService } from '@/mock-services'
import type {
  BenchmarkRow,
  EarlyWarningSignal,
  HeatMapRow,
  IntelligenceFilter,
} from '@/mock-services/intelligence.service'
import { PERMISSION } from '@/permissions'
import { useSessionStore } from '@/state/session'
import { cn } from '@/utils'
import { RISK_DIMENSION_ORDER } from '@/workflow/intelligenceRegistry'

type IntelPortal = 'soe' | 'moip' | 'secretary' | 'minister' | 'pmo'
type IntelView =
  | 'overview'
  | 'scorecard'
  | 'heatmap'
  | 'benchmark'
  | 'early-warning'
  | 'definitions'

const linkClass = 'text-sm text-soe-blue underline'

function viewsFor(portal: IntelPortal): Array<{ id: IntelView; label: string }> {
  if (portal === 'pmo') {
    return [
      { id: 'heatmap', label: 'Portfolio heat map' },
      { id: 'benchmark', label: 'Sector benchmark' },
      { id: 'definitions', label: 'Definitions' },
    ]
  }
  if (portal === 'secretary' || portal === 'minister') {
    return [
      { id: 'overview', label: 'Top risks' },
      { id: 'heatmap', label: 'Heat map' },
      { id: 'early-warning', label: 'Early warning' },
      { id: 'scorecard', label: 'Scorecard drill' },
    ]
  }
  if (portal === 'soe') {
    return [
      { id: 'scorecard', label: 'Scorecard' },
      { id: 'early-warning', label: 'Early warning' },
      { id: 'definitions', label: 'Definitions' },
    ]
  }
  return [
    { id: 'overview', label: 'Overview' },
    { id: 'scorecard', label: 'Scorecard' },
    { id: 'heatmap', label: 'Heat map' },
    { id: 'benchmark', label: 'Benchmarking' },
    { id: 'early-warning', label: 'Early warning' },
    { id: 'definitions', label: 'Definitions' },
  ]
}

function defaultView(portal: IntelPortal): IntelView {
  if (portal === 'pmo') return 'heatmap'
  if (portal === 'soe') return 'scorecard'
  return 'overview'
}

function permissionFor(portal: IntelPortal) {
  if (portal === 'soe') return PERMISSION.FINANCE_READ
  if (portal === 'minister' || portal === 'pmo' || portal === 'secretary') {
    return PERMISSION.EXECUTIVE_DASHBOARD_READ
  }
  return PERMISSION.PORTFOLIO_READ
}

function RiskText({ level }: { level: RiskStatus }) {
  return <StatusBadge status={level} family="risk" label={RISK_STATUS_LABEL[level]} />
}

export function IntelligenceRiskWorkspace({
  portal,
  title,
}: {
  portal: IntelPortal
  title: string
}) {
  const organizationId = useSessionStore((s) => s.organizationId)
  const reportingPeriodId = useSessionStore((s) => s.reportingPeriodId)
  const setReportingPeriodId = useSessionStore((s) => s.setReportingPeriodId)
  const [searchParams, setSearchParams] = useSearchParams()

  const viewList = viewsFor(portal)
  const view = (searchParams.get('view') as IntelView) || defaultView(portal)
  const activeView = viewList.some((v) => v.id === view) ? view : defaultView(portal)

  const soeParam = searchParams.get('soe') ?? (portal === 'soe' ? organizationId : '')
  const sector = searchParams.get('sector') ?? ''
  const metric = (searchParams.get('metric') as BenchmarkMetric) || BENCHMARK_METRIC.ROA
  const peerGroup = (searchParams.get('peer') as IntelligenceFilter['peerGroup']) || 'all'
  const period = searchParams.get('period') ?? reportingPeriodId

  const filter: IntelligenceFilter = {
    reportingPeriodId: period,
    sector: sector || undefined,
    organizationId: portal === 'soe' ? organizationId : soeParam || undefined,
    peerGroup: peerGroup === 'sector' && sector ? 'sector' : peerGroup === 'selected' ? 'selected' : 'all',
    selectedOrganizationIds: searchParams.get('peers')?.split(',').filter(Boolean),
    metric,
  }

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams)
    if (value) next.set(key, value)
    else next.delete(key)
    if (key === 'period' && value) setReportingPeriodId(value)
    setSearchParams(next)
  }

  const options = useQuery({
    queryKey: ['intel-options'],
    queryFn: () => mockIntelligenceService.getFilterOptions(),
  })

  const heat = useQuery({
    queryKey: ['intel-heat', filter],
    queryFn: () => mockIntelligenceService.getHeatMap({ ...filter, organizationId: undefined }),
    enabled: activeView === 'heatmap' || activeView === 'overview',
  })

  const warnings = useQuery({
    queryKey: ['intel-ew', filter],
    queryFn: () =>
      mockIntelligenceService.getEarlyWarnings({
        ...filter,
        organizationId: portal === 'soe' ? organizationId : undefined,
      }),
    enabled: activeView === 'early-warning' || activeView === 'overview',
  })

  const scorecard = useQuery({
    queryKey: ['intel-scorecard', soeParam || organizationId, period],
    queryFn: () =>
      mockIntelligenceService.getScorecard(soeParam || organizationId, { reportingPeriodId: period }),
    enabled:
      (activeView === 'scorecard' || activeView === 'overview') &&
      Boolean(soeParam || (portal === 'soe' && organizationId)),
  })

  const riskProfile = useQuery({
    queryKey: ['intel-risk', soeParam || organizationId, period],
    queryFn: () =>
      mockIntelligenceService.getRiskProfile(soeParam || organizationId, {
        reportingPeriodId: period,
      }),
    enabled:
      activeView === 'scorecard' && Boolean(soeParam || (portal === 'soe' && organizationId)),
  })

  const trends = useQuery({
    queryKey: ['intel-trend', soeParam || organizationId, period],
    queryFn: () =>
      mockIntelligenceService.getTrendView(soeParam || organizationId, {
        reportingPeriodId: period,
      }),
    enabled:
      activeView === 'scorecard' && Boolean(soeParam || (portal === 'soe' && organizationId)),
  })

  const benchmark = useQuery({
    queryKey: ['intel-bench', filter],
    queryFn: () =>
      mockIntelligenceService.getBenchmark({
        ...filter,
        organizationId: undefined,
        peerGroup: peerGroup === 'sector' && sector ? 'sector' : 'all',
        sector: sector || undefined,
        metric,
      }),
    enabled: activeView === 'benchmark',
  })

  const registry = useQuery({
    queryKey: ['intel-registry'],
    queryFn: () => mockIntelligenceService.getIndicatorRegistry(),
    enabled: activeView === 'definitions',
  })

  const heatColumns = useMemo<ColumnDef<HeatMapRow, unknown>[]>(
    () => [
      {
        accessorKey: 'abbreviation',
        header: 'SOE',
        cell: ({ row }) => (
          <Link
            className={linkClass}
            to={`?view=scorecard&soe=${row.original.organizationId}&period=${period}`}
          >
            {row.original.abbreviation}
          </Link>
        ),
      },
      { accessorKey: 'sector', header: 'Sector' },
      ...RISK_DIMENSION_ORDER.map(
        (dim) =>
          ({
            id: dim,
            header: RISK_DIMENSION_LABEL[dim].replace(' Risk', ''),
            cell: ({ row }) => <RiskText level={row.original.levels[dim]} />,
          }) satisfies ColumnDef<HeatMapRow, unknown>,
      ),
      {
        accessorKey: 'maxLevel',
        header: 'Max',
        cell: ({ getValue }) => <RiskText level={getValue() as RiskStatus} />,
      },
    ],
    [period],
  )

  const benchColumns = useMemo<ColumnDef<BenchmarkRow, unknown>[]>(
    () => [
      {
        accessorKey: 'rank',
        header: 'Rank',
        cell: ({ getValue }) => (getValue() == null ? '—' : String(getValue())),
      },
      {
        accessorKey: 'abbreviation',
        header: 'SOE',
        cell: ({ row }) => (
          <Link className={linkClass} to={row.original.drillHref}>
            {row.original.abbreviation}
          </Link>
        ),
      },
      { accessorKey: 'sector', header: 'Sector' },
      {
        accessorKey: 'priorValue',
        header: 'Prior',
        cell: ({ getValue }) =>
          getValue() == null ? '—' : Number(getValue()).toFixed(1),
      },
      {
        accessorKey: 'currentValue',
        header: 'Current',
        cell: ({ getValue }) =>
          getValue() == null ? '—' : Number(getValue()).toFixed(1),
      },
      {
        accessorKey: 'change',
        header: 'Change',
        cell: ({ getValue }) =>
          getValue() == null ? '—' : Number(getValue()).toFixed(1),
      },
      {
        accessorKey: 'dataStatus',
        header: 'Data',
        cell: ({ getValue }) =>
          INTEL_DATA_STATUS_LABEL[getValue() as keyof typeof INTEL_DATA_STATUS_LABEL] ??
          String(getValue()),
      },
    ],
    [],
  )

  const warningColumns = useMemo<ColumnDef<EarlyWarningSignal, unknown>[]>(
    () => [
      {
        accessorKey: 'abbreviation',
        header: 'SOE',
        cell: ({ row }) => (
          <Link
            className={linkClass}
            to={`?view=scorecard&soe=${row.original.organizationId}&period=${period}`}
          >
            {row.original.abbreviation}
          </Link>
        ),
      },
      { accessorKey: 'title', header: 'Signal' },
      { accessorKey: 'detail', header: 'Detail' },
      {
        accessorKey: 'level',
        header: 'Level',
        cell: ({ getValue }) => <RiskText level={getValue() as RiskStatus} />,
      },
      {
        accessorKey: 'trend',
        header: 'Trend',
        cell: ({ getValue }) =>
          INTEL_TREND_LABEL[getValue() as keyof typeof INTEL_TREND_LABEL] ?? String(getValue()),
      },
      {
        id: 'open',
        header: 'Open',
        cell: ({ row }) => (
          <Link className={linkClass} to={row.original.href}>
            View
          </Link>
        ),
      },
    ],
    [period],
  )

  const chartData = useMemo(() => {
    if (!benchmark.data) return []
    return benchmark.data
      .filter((r) => r.currentValue != null)
      .slice(0, 12)
      .map((r) => ({
        name: r.abbreviation,
        value: Number(r.currentValue!.toFixed(1)),
      }))
  }, [benchmark.data])

  const topRisks = useMemo(() => {
    const rows = heat.data ?? []
    return rows.filter((r) => r.concernRank >= 3).slice(0, portal === 'moip' ? 8 : 5)
  }, [heat.data, portal])

  const subtitle =
    portal === 'pmo'
      ? 'Portfolio / sector view · prototype methodology · no operational controls'
      : portal === 'soe'
        ? 'Own SOE scorecard · prototype methodology'
        : portal === 'secretary' || portal === 'minister'
          ? 'Concise risks and drivers · drill for detail · prototype methodology'
          : 'Analyst scorecards, heat map, benchmarking · prototype methodology'

  return (
    <RequirePermission permission={permissionFor(portal)}>
      <div>
        <PageHeader
          title={title}
          subtitle={subtitle}
          actions={
            <span className="rounded-control border border-soe-teal/40 bg-soe-teal/5 px-2 py-1 text-[11px] font-medium text-soe-teal">
              Prototype Methodology
            </span>
          }
        />

        <Alert
          tone="info"
          title="Prototype methodology"
          className="mb-3"
        >
          Scores and risk bands are provisional demonstration rules. Missing data is shown as
          Unavailable / Insufficient History / Pending Verification — not scored as good or bad.
        </Alert>

        <div className="mb-3 flex flex-wrap gap-2">
          {viewList.map((v) => (
            <Button
              key={v.id}
              type="button"
              size="sm"
              variant={activeView === v.id ? 'primary' : 'secondary'}
              onClick={() => setParam('view', v.id)}
            >
              {v.label}
            </Button>
          ))}
        </div>

        <Card className="mb-3 p-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <SelectField
              label="Reporting period"
              value={period}
              onChange={(e) => setParam('period', e.target.value)}
              options={
                options.data?.periods.map((p) => ({ value: p.id, label: p.label })) ?? [
                  { value: period, label: period },
                ]
              }
            />
            {portal !== 'soe' && activeView !== 'definitions' ? (
              <SelectField
                label="Sector"
                value={sector}
                onChange={(e) => setParam('sector', e.target.value)}
                options={[
                  { value: '', label: 'All sectors' },
                  ...(options.data?.sectors.map((s) => ({ value: s, label: s })) ?? []),
                ]}
              />
            ) : null}
            {(activeView === 'scorecard' ||
              (activeView === 'overview' && portal === 'moip')) &&
            portal !== 'soe' ? (
              <SelectField
                label="SOE"
                value={soeParam}
                onChange={(e) => setParam('soe', e.target.value)}
                options={[
                  { value: '', label: 'Select SOE' },
                  ...(options.data?.organizations
                    .filter((o) => !sector || o.sector === sector)
                    .map((o) => ({ value: o.id, label: o.label })) ?? []),
                ]}
              />
            ) : null}
            {activeView === 'benchmark' ? (
              <SelectField
                label="Metric"
                value={metric}
                onChange={(e) => setParam('metric', e.target.value)}
                options={Object.values(BENCHMARK_METRIC).map((m) => ({
                  value: m,
                  label: BENCHMARK_METRIC_LABEL[m],
                }))}
              />
            ) : null}
          </div>
        </Card>

        {activeView === 'overview' ? (
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <KpiValue
                label="SOEs in view"
                value={String(heat.data?.length ?? '—')}
                period={period}
              />
              <KpiValue
                label="High / critical"
                value={String(topRisks.length)}
                period="Max risk ≥ High"
              />
              <KpiValue
                label="Early-warning signals"
                value={String(warnings.data?.length ?? '—')}
                period="Prototype rules"
              />
              <KpiValue
                label="Methodology"
                value="Prototype"
                period="Not official rating"
              />
            </div>

            <Card title="Highest concern" subtitle="Sorted by max risk · text labels required">
              {heat.isLoading ? <LoadingBlock label="Loading heat map…" /> : null}
              {heat.isError ? <ErrorState title="Unable to load portfolio risks" /> : null}
              {topRisks.length ? (
                <ul className="divide-y divide-soe-border text-sm">
                  {topRisks.map((r) => (
                    <li key={r.organizationId} className="flex flex-wrap items-center gap-3 py-2">
                      <Link
                        className={linkClass}
                        to={`?view=scorecard&soe=${r.organizationId}&period=${period}`}
                      >
                        {r.abbreviation}
                      </Link>
                      <span className="text-soe-slate">{r.sector}</span>
                      <RiskText level={r.maxLevel} />
                      <span className="text-xs text-soe-slate">
                        Drivers:{' '}
                        {RISK_DIMENSION_ORDER.filter(
                          (d) =>
                            r.levels[d] === 'high' || r.levels[d] === 'critical',
                        )
                          .map((d) => RISK_DIMENSION_LABEL[d].replace(' Risk', ''))
                          .join(', ') || '—'}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : heat.data ? (
                <EmptyState title="No high or critical portfolio risks in filter" />
              ) : null}
            </Card>

            {(portal === 'secretary' || portal === 'minister') && warnings.data ? (
              <Card title="Top early-warning signals" subtitle="Change-focused · provisional">
                <ul className="divide-y divide-soe-border text-sm">
                  {warnings.data.slice(0, 6).map((w) => (
                    <li key={w.id} className="flex flex-wrap items-center gap-2 py-2">
                      <span className="font-medium">{w.abbreviation}</span>
                      <span>{w.title}</span>
                      <RiskText level={w.level} />
                      <Link className={linkClass} to={w.href}>
                        Open
                      </Link>
                    </li>
                  ))}
                </ul>
              </Card>
            ) : null}
          </div>
        ) : null}

        {activeView === 'heatmap' ? (
          <Card title="Portfolio risk heat map" subtitle="Status text + badge · accessible table">
            {heat.isLoading ? <LoadingBlock label="Loading heat map…" /> : null}
            {heat.isError ? <ErrorState title="Unable to load heat map" /> : null}
            {heat.data?.length ? (
              <DataTable columns={heatColumns} data={heat.data} />
            ) : heat.data ? (
              <EmptyState title="No SOEs in filter" />
            ) : null}
          </Card>
        ) : null}

        {activeView === 'benchmark' ? (
          <div className="space-y-3">
            <Card
              title="Cross-SOE benchmarking"
              subtitle={`${BENCHMARK_METRIC_LABEL[metric]} · peer group: ${sector || 'all SOEs'}`}
            >
              {benchmark.isLoading ? <LoadingBlock label="Loading benchmark…" /> : null}
              {benchmark.isError ? <ErrorState title="Unable to load benchmark" /> : null}
              {chartData.length ? (
                <div className="mb-3">
                  <ChartContainer
                    title="Ranked comparison (top 12)"
                    summary={
                      chartData.length
                        ? `Top ${chartData.length} SOEs by ${BENCHMARK_METRIC_LABEL[metric]}: ${chartData
                            .slice(0, 5)
                            .map((d) => `${d.name} ${d.value}`)
                            .join('; ')}${chartData.length > 5 ? '; remaining ranks in table below.' : '.'}`
                        : undefined
                    }
                  >
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Bar dataKey="value" fill="#1D5D8F" name="Value" />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </div>
              ) : null}
              {benchmark.data?.length ? (
                <DataTable columns={benchColumns} data={benchmark.data} />
              ) : benchmark.data ? (
                <EmptyState title="No benchmark rows" />
              ) : null}
            </Card>
          </div>
        ) : null}

        {activeView === 'early-warning' ? (
          <Card
            title="Early warning — deterioration signals"
            subtitle="Demonstration rules unless formally approved"
          >
            {warnings.isLoading ? <LoadingBlock label="Loading signals…" /> : null}
            {warnings.isError ? <ErrorState title="Unable to load early warnings" /> : null}
            {warnings.data?.length ? (
              <DataTable columns={warningColumns} data={warnings.data} />
            ) : warnings.data ? (
              <EmptyState title="No early-warning signals for filter" />
            ) : null}
          </Card>
        ) : null}

        {activeView === 'definitions' ? (
          <Card title="Indicator definition registry" subtitle="Feeds future backend KPI dictionary">
            {registry.isLoading ? <LoadingBlock label="Loading registry…" /> : null}
            {registry.isError ? <ErrorState title="Unable to load definitions" /> : null}
            {registry.data?.length ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-xs text-soe-slate">
                    <tr className="border-b border-soe-border">
                      <th className="py-2 pr-3 font-medium">Indicator</th>
                      <th className="py-2 pr-3 font-medium">Domain</th>
                      <th className="py-2 pr-3 font-medium">Rule / formula</th>
                      <th className="py-2 pr-3 font-medium">Threshold</th>
                      <th className="py-2 font-medium">Null handling</th>
                    </tr>
                  </thead>
                  <tbody>
                    {registry.data.map((row) => (
                      <tr key={row.id} className="border-b border-soe-border/70 align-top">
                        <td className="py-2 pr-3 font-medium">{row.name}</td>
                        <td className="py-2 pr-3 text-soe-slate">{row.domain}</td>
                        <td className="py-2 pr-3">{row.formulaOrRule}</td>
                        <td className="py-2 pr-3">{row.threshold ?? '—'}</td>
                        <td className="py-2 text-soe-slate">{row.nullHandling}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </Card>
        ) : null}

        {activeView === 'scorecard' ? (
          <div className="space-y-3">
            {!soeParam && portal !== 'soe' ? (
              <EmptyState title="Select an SOE to open the scorecard" />
            ) : null}
            {scorecard.isLoading ? <LoadingBlock label="Loading scorecard…" /> : null}
            {scorecard.isError ? <ErrorState title="Unable to load scorecard" /> : null}
            {scorecard.data ? (
              <>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <KpiValue
                    label="Overall (prototype)"
                    value={
                      scorecard.data.overallScore == null
                        ? '—'
                        : String(scorecard.data.overallScore)
                    }
                    period={scorecard.data.periodLabel}
                  />
                  <div className="rounded-control border border-soe-border bg-white p-3">
                    <p className="text-xs text-soe-slate">Overall band</p>
                    <div className="mt-1">
                      {scorecard.data.overallBand ? (
                        <RiskText level={scorecard.data.overallBand} />
                      ) : (
                        <span className="text-sm">—</span>
                      )}
                    </div>
                  </div>
                  <KpiValue
                    label="Data status"
                    value={INTEL_DATA_STATUS_LABEL[scorecard.data.overallDataStatus]}
                    period={scorecard.data.abbreviation}
                  />
                  <KpiValue
                    label="Sector"
                    value={scorecard.data.sector}
                    period={scorecard.data.name}
                  />
                </div>

                <Card
                  title={`${scorecard.data.abbreviation} performance scorecard`}
                  subtitle="Component scores always shown · composite does not hide them"
                >
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {scorecard.data.dimensions.map((dim) => (
                      <div
                        key={dim.dimension}
                        className="rounded-control border border-soe-border p-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-medium">
                              {SCORECARD_DIMENSION_LABEL[dim.dimension]}
                            </p>
                            <p className="text-xs text-soe-slate">
                              {INTEL_TREND_LABEL[dim.trend]} · {dim.periodLabel}
                            </p>
                          </div>
                          {dim.band ? <RiskText level={dim.band} /> : null}
                        </div>
                        <p className="mt-2 text-2xl font-semibold text-soe-navy">
                          {dim.score == null ? '—' : dim.score}
                        </p>
                        <p className="text-xs text-soe-slate">
                          {INTEL_DATA_STATUS_LABEL[dim.dataStatus]}
                        </p>
                        <ul className="mt-2 space-y-1 text-xs text-soe-slate">
                          {dim.components.map((c) => (
                            <li key={c.id} className="flex justify-between gap-2">
                              <span>
                                {c.name}: {c.rawDisplay}
                              </span>
                              <span>{c.score == null ? '—' : c.score}</span>
                            </li>
                          ))}
                        </ul>
                        <Link className={cn(linkClass, 'mt-2 inline-block text-xs')} to={dim.drillHref}>
                          Drill-down
                        </Link>
                      </div>
                    ))}
                  </div>
                </Card>

                {riskProfile.data ? (
                  <Card title="Risk matrix" subtitle="Why is this status shown?">
                    <div className="grid gap-3 md:grid-cols-2">
                      {riskProfile.data.cells.map((cell) => (
                        <div
                          key={cell.dimension}
                          className="rounded-control border border-soe-border p-3"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-medium">
                              {RISK_DIMENSION_LABEL[cell.dimension as RiskDimension]}
                            </p>
                            <RiskText level={cell.level} />
                          </div>
                          <p className="mt-1 text-xs text-soe-slate">
                            {INTEL_DATA_STATUS_LABEL[cell.dataStatus]} ·{' '}
                            {INTEL_TREND_LABEL[cell.trend]} · {cell.lastEvaluatedPeriod}
                          </p>
                          <ul className="mt-2 list-disc pl-4 text-xs text-soe-ink">
                            {cell.reasons.map((r) => (
                              <li key={r}>{r}</li>
                            ))}
                          </ul>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {cell.drivers.map((d) => (
                              <Link key={d.id} className={cn(linkClass, 'text-xs')} to={d.href}>
                                {d.label}
                              </Link>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                ) : null}

                {trends.data ? (
                  <Card
                    title="Trend deterioration view"
                    subtitle={trends.data.caveat}
                  >
                    <div className="grid gap-3 md:grid-cols-3">
                      {(
                        [
                          ['Deteriorating', trends.data.deteriorating],
                          ['Improving', trends.data.improving],
                          ['Stable', trends.data.stable],
                        ] as const
                      ).map(([label, items]) => (
                        <div key={label}>
                          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-soe-slate">
                            {label}
                          </p>
                          {items.length ? (
                            <ul className="space-y-2 text-sm">
                              {items.map((t) => (
                                <li key={t.indicator}>
                                  <Link className={linkClass} to={t.href}>
                                    {t.indicator}
                                  </Link>
                                  <span className="block text-xs text-soe-slate">
                                    {t.magnitudeDisplay}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-xs text-soe-slate">None in span</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </Card>
                ) : null}
              </>
            ) : null}
          </div>
        ) : null}
      </div>
    </RequirePermission>
  )
}

export function MoipIntelligencePage() {
  return (
    <IntelligenceRiskWorkspace
      portal="moip"
      title="Intelligence, Risk & Benchmarking"
    />
  )
}

export function SecretaryIntelligencePage() {
  return (
    <IntelligenceRiskWorkspace portal="secretary" title="Risk Overview" />
  )
}

export function MinisterIntelligencePage() {
  return (
    <IntelligenceRiskWorkspace portal="minister" title="Risk Intelligence" />
  )
}

export function PmoIntelligencePage() {
  return (
    <IntelligenceRiskWorkspace portal="pmo" title="Portfolio Risk Heat Map" />
  )
}
