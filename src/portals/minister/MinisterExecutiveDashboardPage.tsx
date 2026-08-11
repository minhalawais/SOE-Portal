import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  Banknote,
  Building2,
  CircleDollarSign,
  Gauge,
  Landmark,
  Layers3,
  TrendingUp,
} from 'lucide-react'
import { NationalAssetMapCanvas } from '@/components/gis/NationalAssetMapCanvas'
import { RequirePermission } from '@/app/router/guards'
import { ErrorState, LoadingBlock } from '@/design-system/components/Feedback'
import { SOE_STATUS_LABEL, type SoeStatus } from '@/constants'
import { mockExecutiveDashboardService } from '@/mock-services'
import type { ExecutiveDashboardFilter, ExecutiveTone } from '@/mock-services/executiveDashboard.service'
import { PERMISSION } from '@/permissions'
import { useSessionStore } from '@/state/session'
import { formatCurrencyPkr } from '@/utils'
import {
  DashboardLegend,
  ExecutiveDashboardHeader,
  ExecutiveMetricGrid,
  ExecutivePanel,
  RankedBars,
  RiskMatrix,
  StatCell,
  ToneBadge,
} from '@/portals/executive/ExecutiveDashboardComponents'

const CHART_COLORS = {
  navy: '#12304a',
  blue: '#1d5d8f',
  teal: '#16877a',
  success: '#2e7d5a',
  warning: '#c58a19',
  critical: '#b84242',
  grid: '#e8edf1',
}

const metricIcons = {
  soes: Building2,
  investment: Landmark,
  assets: Layers3,
  revenue: TrendingUp,
  'profit-loss': CircleDollarSign,
  debt: Banknote,
  support: Landmark,
  capacity: Gauge,
}

function useMinisterDashboardFilter(): [ExecutiveDashboardFilter, (patch: Partial<ExecutiveDashboardFilter>) => void] {
  const reportingPeriodId = useSessionStore((state) => state.reportingPeriodId)
  const setReportingPeriodId = useSessionStore((state) => state.setReportingPeriodId)
  const [params, setParams] = useSearchParams()
  const filter: ExecutiveDashboardFilter = {
    reportingPeriodId: params.get('period') ?? reportingPeriodId,
    sector: params.get('sector') ?? '',
    province: params.get('province') ?? '',
    status: (params.get('status') as SoeStatus) ?? '',
  }
  const setFilter = (patch: Partial<ExecutiveDashboardFilter>) => {
    const nextFilter = { ...filter, ...patch }
    const next = new URLSearchParams(params)
    if (nextFilter.reportingPeriodId) {
      next.set('period', nextFilter.reportingPeriodId)
      setReportingPeriodId(nextFilter.reportingPeriodId)
    }
    for (const key of ['sector', 'province', 'status'] as const) {
      if (nextFilter[key]) next.set(key, String(nextFilter[key]))
      else next.delete(key)
    }
    setParams(next)
  }
  return [filter, setFilter]
}

function toneColor(tone: ExecutiveTone) {
  if (tone === 'positive') return CHART_COLORS.success
  if (tone === 'warning') return CHART_COLORS.warning
  if (tone === 'critical') return CHART_COLORS.critical
  return CHART_COLORS.blue
}

function axisCurrency(value: number) {
  return new Intl.NumberFormat('en-PK', { notation: 'compact', maximumFractionDigits: 0 }).format(value)
}

export function MinisterExecutiveDashboardPage() {
  const [filter, setFilter] = useMinisterDashboardFilter()
  const navigate = useNavigate()
  const [selectedAssetId, setSelectedAssetId] = useState<string>()
  const [mapZoom, setMapZoom] = useState(5)
  const query = useQuery({
    queryKey: ['minister-executive-dashboard-v2', filter],
    queryFn: () => mockExecutiveDashboardService.getMinisterDashboard(filter),
  })

  if (query.isLoading) return <LoadingBlock label="Loading Minister strategic dashboard…" />
  if (query.isError || !query.data) return <ErrorState title="Unable to load Minister dashboard" />

  const data = query.data
  const periodLabel = data.options.periods.find((period) => period.id === data.reportingPeriodId)?.label ?? data.reportingPeriodId
  const selectedAsset = data.gisAssets.find((asset) => asset.assetId === selectedAssetId)
  const statusTotal = data.statusDistribution.reduce((sum, item) => sum + item.value, 0)
  const stageCounts = new Map<string, number>()
  data.privatization.cases.forEach((item) => stageCounts.set(item.stage, (stageCounts.get(item.stage) ?? 0) + 1))

  return (
    <RequirePermission permission={PERMISSION.EXECUTIVE_DASHBOARD_READ}>
      <div className="min-w-0 pb-8">
        <ExecutiveDashboardHeader lens="Minister View" title="Strategic Portfolio Overview" asOf={data.asOf} periodLabel={periodLabel} confidence={data.confidence} filter={filter} options={data.options} onFilterChange={setFilter} showStatus />
        <ExecutiveMetricGrid metrics={data.metrics} icons={metricIcons} />

        <div className="mt-3 grid gap-3 xl:grid-cols-[1.05fr_1.45fr]">
          <ExecutivePanel title="Portfolio Position" action={<DashboardLegend />}>
            <div className="border-b border-soe-border p-4">
              <p className="mb-2 text-[10px] font-medium uppercase text-soe-slate">SOE status</p>
              <div className="flex h-3 overflow-hidden rounded-full bg-soe-border/60">
                {data.statusDistribution.map((item, index) => (
                  <div key={item.name} title={`${SOE_STATUS_LABEL[item.name as SoeStatus] ?? item.name}: ${item.value}`} style={{ width: `${statusTotal ? (item.value / statusTotal) * 100 : 0}%`, backgroundColor: [CHART_COLORS.blue, CHART_COLORS.teal, CHART_COLORS.warning, CHART_COLORS.critical][index % 4] }} />
                ))}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {data.statusDistribution.map((item) => <div key={item.name}><p className="text-[10px] text-soe-slate">{SOE_STATUS_LABEL[item.name as SoeStatus] ?? item.name.replaceAll('_', ' ')}</p><p className="text-base font-semibold tabular-nums text-soe-navy">{item.value}</p></div>)}
              </div>
            </div>
            <div className="grid grid-cols-3 divide-x divide-soe-border p-4">
              {data.healthDistribution.map((item) => <div key={item.name} className="px-3 first:pl-0"><div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: toneColor(item.tone) }} /><p className="text-[10px] text-soe-slate">{item.name}</p></div><p className="mt-1 text-xl font-semibold tabular-nums text-soe-navy">{item.value}</p></div>)}
            </div>
          </ExecutivePanel>

          <ExecutivePanel title="Five-Year Portfolio Financial Direction" action={<Link className="text-[11px] font-medium text-soe-blue" to="/minister/fiscal">Fiscal exposure</Link>}>
            <div className="h-[250px] p-3">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.profitLossTrend} margin={{ top: 8, right: 14, bottom: 2, left: 0 }}>
                  <CartesianGrid stroke={CHART_COLORS.grid} vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} axisLine={false} />
                  <YAxis tickFormatter={axisCurrency} tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} axisLine={false} width={58} />
                  <Tooltip formatter={(value) => formatCurrencyPkr(Number(value))} contentStyle={{ borderRadius: 6, borderColor: '#dde3e8', fontSize: 11 }} />
                  <Line type="monotone" dataKey="profitLoss" name="Profit / loss" stroke={CHART_COLORS.teal} strokeWidth={2.5} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="debt" name="Debt" stroke={CHART_COLORS.critical} strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="subsidies" name="Subsidies" stroke={CHART_COLORS.warning} strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap gap-4 border-t border-soe-border px-4 py-2 text-[10px] text-soe-slate"><span className="flex items-center gap-1"><span className="h-0.5 w-5 bg-soe-teal" />Profit / loss</span><span className="flex items-center gap-1"><span className="h-0.5 w-5 bg-soe-critical" />Debt</span><span className="flex items-center gap-1"><span className="h-0.5 w-5 bg-soe-warning" />Subsidies</span></div>
          </ExecutivePanel>
        </div>

        <div className="mt-3 grid gap-3 xl:grid-cols-2">
          <ExecutivePanel title="Leading Profitable SOEs" action={<Link className="text-[11px] font-medium text-soe-blue" to="/minister/portfolio">View portfolio</Link>}><RankedBars items={data.profitable} /></ExecutivePanel>
          <ExecutivePanel title="Highest Loss-Making SOEs" action={<ToneBadge tone="critical" label={`${data.lossMaking.length} priority entities`} />}><RankedBars items={data.lossMaking} /></ExecutivePanel>
        </div>

        <div className="mt-3 grid gap-3 xl:grid-cols-[1.25fr_1fr]">
          <ExecutivePanel title="Fiscal Exposure Trend">
            <div className="h-[285px] p-3">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.fiscal.trend} margin={{ top: 8, right: 12, left: 2, bottom: 2 }}>
                  <CartesianGrid stroke={CHART_COLORS.grid} vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} axisLine={false} />
                  <YAxis tickFormatter={axisCurrency} tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} axisLine={false} width={58} />
                  <Tooltip formatter={(value) => formatCurrencyPkr(Number(value))} contentStyle={{ borderRadius: 6, borderColor: '#dde3e8', fontSize: 11 }} />
                  <Bar dataKey="debt" name="Debt" stackId="exposure" fill={CHART_COLORS.navy} radius={[2, 2, 0, 0]} />
                  <Bar dataKey="subsidies" name="Subsidies" stackId="exposure" fill={CHART_COLORS.warning} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ExecutivePanel>
          <ExecutivePanel title="Highest Government Exposure" action={<Link className="text-[11px] font-medium text-soe-blue" to="/minister/fiscal">Open analysis</Link>}><RankedBars items={data.fiscalExposure} /></ExecutivePanel>
        </div>

        <ExecutivePanel title="Pakistan Asset & Industrial Footprint" className="mt-3" action={<Link to="/minister/assets/map" className="text-[11px] font-medium text-soe-blue">Open full map</Link>}>
          <div className="relative h-[520px] bg-white">
            <NationalAssetMapCanvas items={data.gisAssets} selectedId={selectedAssetId} onSelect={setSelectedAssetId} zoom={mapZoom} onZoomChange={setMapZoom} className="h-full" variant="executive" onViewList={() => navigate('/minister/assets/map')} />
            {selectedAsset ? <div className="absolute bottom-3 left-1/2 z-[20] w-[min(480px,calc(100%-1.5rem))] -translate-x-1/2 rounded-[6px] border border-soe-border bg-white/95 p-3 shadow-[var(--shadow-card)]"><div className="flex justify-between gap-3"><div><p className="text-xs font-semibold text-soe-navy">{selectedAsset.organizationLabel} · {selectedAsset.name}</p><p className="mt-1 text-[10px] text-soe-slate">{selectedAsset.province || 'Province unavailable'} · {formatCurrencyPkr(selectedAsset.marketValue ?? 0)}</p></div><button type="button" className="text-xs text-soe-blue" onClick={() => setSelectedAssetId(undefined)}>Close</button></div></div> : null}
          </div>
          <div className="grid gap-4 border-t border-soe-border p-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
            <StatCell label="Market value" value={formatCurrencyPkr(data.market.aggregateMarketValue)} tone="positive" />
            <StatCell label="Book value" value={formatCurrencyPkr(data.market.aggregateBookValue)} />
            <StatCell label="Valuation gap" value={formatCurrencyPkr(data.market.variance)} tone={data.market.variance >= 0 ? 'positive' : 'warning'} />
            <StatCell label="Land bank" value={`${new Intl.NumberFormat('en-PK', { notation: 'compact' }).format(data.land.totalLandAreaAcres)} ac`} />
            <StatCell label="Underutilized" value={String(data.assets.underutilizedCount)} tone="warning" />
            <StatCell label="Encroached" value={String(data.assets.encroachedLandCount)} tone="critical" />
            <StatCell label="Litigated" value={String(data.assets.underLitigationCount)} tone="critical" />
            <StatCell label="Idle factories" value={String(data.assets.idleFactoryCount)} tone="warning" />
          </div>
        </ExecutivePanel>

        <ExecutivePanel title="Cross-SOE Risk Matrix" className="mt-3" action={<DashboardLegend />}><RiskMatrix rows={data.riskMatrix} /></ExecutivePanel>

        <div className="mt-3 grid gap-3 xl:grid-cols-3">
          <ExecutivePanel title="Governance Risk">
            <div className="grid grid-cols-2 gap-5 p-4"><StatCell label="Board vacancies" value={String(data.governance.boardVacancies)} tone="critical" /><StatCell label="Expiring in 90 days" value={String(data.governance.expiringWithin90)} tone="warning" /><StatCell label="Expired appointments" value={String(data.governance.expiredAppointments)} tone="critical" /><StatCell label="Overdue compliance" value={String(data.governance.overdueCompliance)} tone="warning" /></div>
            <Link to="/minister/governance" className="block border-t border-soe-border px-4 py-2.5 text-[11px] font-medium text-soe-blue">Open governance analysis</Link>
          </ExecutivePanel>
          <ExecutivePanel title="Audit & Legal Exposure">
            <div className="grid grid-cols-2 gap-5 p-4"><StatCell label="Open audit paras" value={String(data.auditLegal.openParaCount)} tone="critical" /><StatCell label="Audit exposure" value={formatCurrencyPkr(data.auditLegal.totalAuditExposure)} tone="critical" /><StatCell label="Litigation exposure" value={formatCurrencyPkr(data.auditLegal.litigationExposure)} tone="warning" /><StatCell label="Major cases" value={String(data.auditLegal.majorLitigation.length)} tone="warning" /></div>
            <Link to="/minister/audit-legal" className="block border-t border-soe-border px-4 py-2.5 text-[11px] font-medium text-soe-blue">Open audit and legal analysis</Link>
          </ExecutivePanel>
          <ExecutivePanel title="Industrial Contribution">
            <div className="grid grid-cols-2 gap-5 p-4"><StatCell label="Capacity utilization" value={`${(data.industrial.capacityUtilization ?? 0).toFixed(1)}%`} tone={(data.industrial.capacityUtilization ?? 0) < 50 ? 'critical' : 'positive'} /><StatCell label="Actual production" value={new Intl.NumberFormat('en-PK', { notation: 'compact' }).format(data.industrial.actualProduction)} /><StatCell label="Exports" value={formatCurrencyPkr(data.industrial.exportContribution)} tone="positive" /><StatCell label="Employment" value={new Intl.NumberFormat('en-PK').format(data.industrial.employment)} /></div>
            <Link to="/minister/industrial" className="block border-t border-soe-border px-4 py-2.5 text-[11px] font-medium text-soe-blue">Open industrial performance</Link>
          </ExecutivePanel>
        </div>

        <div className="mt-3 grid gap-3 xl:grid-cols-[1.2fr_1fr]">
          <ExecutivePanel title="Capacity Utilization by Sector">
            <div className="h-[280px] p-3"><ResponsiveContainer width="100%" height="100%"><BarChart data={data.industrialBySector} layout="vertical" margin={{ left: 28, right: 22 }}><CartesianGrid stroke={CHART_COLORS.grid} horizontal={false} /><XAxis type="number" domain={[0, 100]} tickFormatter={(value) => `${value}%`} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} /><YAxis type="category" dataKey="sector" width={110} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} /><Tooltip formatter={(value) => `${Number(value).toFixed(1)}%`} contentStyle={{ borderRadius: 6, borderColor: '#dde3e8', fontSize: 11 }} /><Bar dataKey="capacityUtilization" name="Capacity utilization" radius={[0, 3, 3, 0]}>{data.industrialBySector.map((row) => <Cell key={row.sector} fill={(row.capacityUtilization ?? 0) < 50 ? CHART_COLORS.critical : (row.capacityUtilization ?? 0) < 70 ? CHART_COLORS.warning : CHART_COLORS.teal} />)}</Bar></BarChart></ResponsiveContainer></div>
          </ExecutivePanel>
          <ExecutivePanel title="Privatization & Transformation Pipeline" action={<ToneBadge tone={data.privatization.blockedCount ? 'critical' : 'positive'} label={`${data.privatization.blockedCount} blocked`} />}>
            <div className="grid grid-cols-3 gap-4 border-b border-soe-border p-4"><StatCell label="Pipeline" value={String(data.privatization.pipelineCount)} /><StatCell label="Blocked" value={String(data.privatization.blockedCount)} tone="critical" /><StatCell label="Milestones done" value={String(data.privatization.completedMilestones)} tone="positive" /></div>
            <div className="space-y-3 p-4">{[...stageCounts.entries()].map(([stage, count], index) => <div key={stage} className="flex items-center gap-3"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-soe-navy text-[10px] font-semibold text-white">{index + 1}</span><span className="min-w-0 flex-1 truncate text-xs capitalize text-soe-ink">{stage.replaceAll('_', ' ')}</span><strong className="text-xs tabular-nums text-soe-navy">{count}</strong></div>)}</div>
            <Link to="/minister/privatization" className="block border-t border-soe-border px-4 py-2.5 text-[11px] font-medium text-soe-blue">Open pipeline</Link>
          </ExecutivePanel>
        </div>

        <div className="mt-3 grid gap-3 xl:grid-cols-2">
          <ExecutivePanel title="Strategic Opportunities" action={<Link className="text-[11px] font-medium text-soe-blue" to="/minister/opportunities">View all</Link>}>
            <div className="divide-y divide-soe-border">{data.opportunities.slice(0, 6).map((item) => <Link key={item.id} to={item.route} className="flex items-start justify-between gap-3 px-4 py-3 hover:bg-soe-canvas"><div><p className="text-xs font-semibold text-soe-navy">{item.organizationLabel} · {item.title}</p><p className="mt-1 line-clamp-2 text-[10px] text-soe-slate">{item.detail}</p></div><ToneBadge tone="positive" label={item.kind.replaceAll('_', ' ')} /></Link>)}</div>
          </ExecutivePanel>
          <ExecutivePanel title="Ministerial Decision Brief" action={<ToneBadge tone={data.decisions.some((item) => item.urgency === 'critical') ? 'critical' : 'warning'} label={`${data.decisions.length} matters`} />}>
            <div className="divide-y divide-soe-border">{data.decisions.slice(0, 7).map((item) => <Link key={item.id} to={item.route} className="grid gap-2 px-4 py-3 hover:bg-soe-canvas sm:grid-cols-[90px_1fr_auto] sm:items-center"><span className="text-xs font-semibold text-soe-navy">{item.organizationLabel}</span><div><p className="text-xs text-soe-ink">{item.matter}</p><p className="mt-0.5 text-[10px] capitalize text-soe-slate">{item.source.replaceAll('_', ' ')}</p></div><ToneBadge tone={item.urgency === 'critical' ? 'critical' : 'warning'} label={item.urgency === 'critical' ? 'Critical' : 'Attention'} /></Link>)}</div>
          </ExecutivePanel>
        </div>
      </div>
    </RequirePermission>
  )
}
