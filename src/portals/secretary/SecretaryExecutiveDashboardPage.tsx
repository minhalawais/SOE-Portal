import { useQuery } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  AlertTriangle,
  Banknote,
  BriefcaseBusiness,
  CalendarClock,
  ClipboardCheck,
  FileWarning,
  Scale,
  UserRoundX,
} from 'lucide-react'
import { RequirePermission } from '@/app/router/guards'
import { ErrorState, LoadingBlock } from '@/design-system/components/Feedback'
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
  ExecutiveQueue,
  RankedBars,
  RiskMatrix,
  StatCell,
  ToneBadge,
} from '@/portals/executive/ExecutiveDashboardComponents'

const COLORS = {
  navy: '#12304a',
  blue: '#1d5d8f',
  teal: '#16877a',
  success: '#2e7d5a',
  warning: '#c58a19',
  critical: '#b84242',
  grid: '#e8edf1',
}

const metricIcons = {
  critical: AlertTriangle,
  submissions: FileWarning,
  compliance: ClipboardCheck,
  decisions: BriefcaseBusiness,
  escalations: CalendarClock,
  vacancies: UserRoundX,
  loans: Banknote,
  audit: Scale,
}

function useSecretaryDashboardFilter(): [ExecutiveDashboardFilter, (patch: Partial<ExecutiveDashboardFilter>) => void] {
  const reportingPeriodId = useSessionStore((state) => state.reportingPeriodId)
  const setReportingPeriodId = useSessionStore((state) => state.setReportingPeriodId)
  const [params, setParams] = useSearchParams()
  const filter: ExecutiveDashboardFilter = {
    reportingPeriodId: params.get('period') ?? reportingPeriodId,
    sector: params.get('sector') ?? '',
    province: params.get('province') ?? '',
  }
  const setFilter = (patch: Partial<ExecutiveDashboardFilter>) => {
    const nextFilter = { ...filter, ...patch }
    const next = new URLSearchParams(params)
    if (nextFilter.reportingPeriodId) {
      next.set('period', nextFilter.reportingPeriodId)
      setReportingPeriodId(nextFilter.reportingPeriodId)
    }
    for (const key of ['sector', 'province'] as const) {
      if (nextFilter[key]) next.set(key, String(nextFilter[key]))
      else next.delete(key)
    }
    setParams(next)
  }
  return [filter, setFilter]
}

function toneColor(tone: ExecutiveTone) {
  if (tone === 'positive') return COLORS.success
  if (tone === 'warning') return COLORS.warning
  if (tone === 'critical') return COLORS.critical
  return COLORS.blue
}

export function SecretaryExecutiveDashboardPage() {
  const [filter, setFilter] = useSecretaryDashboardFilter()
  const query = useQuery({
    queryKey: ['secretary-executive-dashboard-v2', filter],
    queryFn: () => mockExecutiveDashboardService.getSecretaryDashboard(filter),
  })

  if (query.isLoading) return <LoadingBlock label="Loading Secretary command dashboard…" />
  if (query.isError || !query.data) return <ErrorState title="Unable to load Secretary dashboard" />

  const data = query.data
  const periodLabel = data.options.periods.find((period) => period.id === data.reportingPeriodId)?.label ?? data.reportingPeriodId
  const submissionTotal = data.submissions.reduce((sum, item) => sum + item.value, 0)
  const obligationTotal = data.obligationBuckets.reduce((sum, item) => sum + item.value, 0)

  return (
    <RequirePermission permission={PERMISSION.EXECUTIVE_DASHBOARD_READ}>
      <div className="min-w-0 pb-8">
        <ExecutiveDashboardHeader lens="Secretary View" title="Operational Command Centre" asOf={data.asOf} periodLabel={periodLabel} confidence={data.confidence} filter={filter} options={data.options} onFilterChange={setFilter} />
        <ExecutiveMetricGrid metrics={data.metrics} icons={metricIcons} />

        <div className="mt-3 grid gap-3 xl:grid-cols-[1.05fr_1.45fr]">
          <ExecutivePanel title="Submission & Compliance Control" action={<Link to="/secretary/compliance" className="text-[11px] font-medium text-soe-blue">Open compliance</Link>}>
            <div className="flex items-center gap-5 border-b border-soe-border p-4">
              <div className="relative flex h-24 w-24 shrink-0 items-center justify-center rounded-full" style={{ background: `conic-gradient(${COLORS.success} ${data.submissionCoverage * 3.6}deg, #e8edf1 0deg)` }}>
                <div className="flex h-[74px] w-[74px] flex-col items-center justify-center rounded-full bg-white"><strong className="text-xl tabular-nums text-soe-navy">{data.submissionCoverage}%</strong><span className="text-[9px] text-soe-slate">accepted</span></div>
              </div>
              <div className="min-w-0 flex-1 space-y-2">{data.submissions.map((item) => <div key={item.name}><div className="mb-1 flex justify-between text-[10px]"><span className="text-soe-slate">{item.name}</span><strong className="tabular-nums text-soe-navy">{item.value}</strong></div><div className="h-1.5 overflow-hidden rounded-full bg-soe-border/60"><div className="h-full rounded-full" style={{ width: `${submissionTotal ? Math.max(4, (item.value / submissionTotal) * 100) : 0}%`, backgroundColor: toneColor(item.tone) }} /></div></div>)}</div>
            </div>
            <div className="grid grid-cols-3 gap-4 p-4"><StatCell label="In scope" value={String(submissionTotal)} /><StatCell label="Accepted" value={String(data.submissions.find((item) => item.name === 'Approved')?.value ?? 0)} tone="positive" /><StatCell label="Needs action" value={String(data.submissions.filter((item) => item.tone === 'critical').reduce((sum, item) => sum + item.value, 0))} tone="critical" /></div>
          </ExecutivePanel>

          <ExecutivePanel title="90-Day Obligation Horizon" action={<Link to="/secretary/obligations" className="text-[11px] font-medium text-soe-blue">All obligations</Link>}>
            <div className="p-4">
              <div className="grid grid-cols-5 gap-1">{data.obligationBuckets.map((item) => <div key={item.name} className="min-w-0"><div className="flex h-24 items-end rounded-[4px] bg-soe-canvas px-2 pt-2"><div className="w-full rounded-t-[3px]" style={{ height: `${obligationTotal ? Math.max(8, (item.value / Math.max(...data.obligationBuckets.map((bucket) => bucket.value), 1)) * 100) : 8}%`, backgroundColor: toneColor(item.tone) }} /></div><p className="mt-2 truncate text-center text-[9px] text-soe-slate">{item.name}</p><p className="text-center text-sm font-semibold tabular-nums text-soe-navy">{item.value}</p></div>)}</div>
              <div className="mt-4 border-t border-soe-border pt-3">{data.obligations.slice(0, 4).map((item) => <Link key={item.id} to={item.route} className="grid grid-cols-[80px_1fr_auto] gap-2 border-b border-soe-border py-2 text-[10px] last:border-0"><strong className="text-soe-navy">{item.organizationLabel}</strong><span className="truncate text-soe-ink">{item.issue}</span><span className="tabular-nums text-soe-slate">{item.dueDate}</span></Link>)}</div>
            </div>
          </ExecutivePanel>
        </div>

        <ExecutivePanel title="Cross-SOE Exception Matrix" className="mt-3" action={<DashboardLegend />}><RiskMatrix rows={data.exceptionMatrix} routeLabel="Inspect" /></ExecutivePanel>

        <div className="mt-3 grid gap-3 xl:grid-cols-[1.15fr_1fr]">
          <ExecutivePanel title="Financial & Loan Watch" action={<Link to="/secretary/finance" className="text-[11px] font-medium text-soe-blue">Financial concerns</Link>}>
            <div className="grid grid-cols-2 gap-5 border-b border-soe-border p-4 lg:grid-cols-4">
              <StatCell label="Repayments in horizon" value={String(data.loanRepayments.length)} tone="warning" />
              <StatCell label="Amount due" value={formatCurrencyPkr(data.loanRepayments.reduce((sum, item) => sum + item.amountDue, 0))} tone="warning" />
              <StatCell label="Overdue" value={String(data.loanRepayments.filter((item) => item.status === 'overdue').length)} tone="critical" />
              <StatCell label="Financial concerns" value={String(data.financialConcerns.length)} tone="critical" />
            </div>
            <div className="overflow-x-auto"><table className="w-full min-w-[620px] text-xs"><thead><tr className="bg-soe-canvas text-left text-[10px] text-soe-slate"><th className="px-4 py-2 font-medium">SOE / lender</th><th className="px-3 py-2 font-medium">Due date</th><th className="px-3 py-2 text-right font-medium">Amount due</th><th className="px-4 py-2 text-right font-medium">Status</th></tr></thead><tbody>{data.loanRepayments.slice(0, 8).map((item) => <tr key={item.id} className="border-t border-soe-border"><td className="px-4 py-2.5"><strong className="text-soe-navy">{item.organizationLabel}</strong><span className="ml-2 text-[10px] text-soe-slate">{item.lender}</span></td><td className="px-3 py-2.5 tabular-nums text-soe-slate">{item.dueDate}</td><td className="px-3 py-2.5 text-right font-semibold tabular-nums text-soe-navy">{formatCurrencyPkr(item.amountDue)}</td><td className="px-4 py-2.5 text-right"><ToneBadge tone={item.tone} label={item.status.replaceAll('_', ' ')} /></td></tr>)}</tbody></table></div>
          </ExecutivePanel>
          <ExecutivePanel title="Priority Financial Concerns"><ExecutiveQueue items={data.financialConcerns} /></ExecutivePanel>
        </div>

        <div className="mt-3 grid gap-3 xl:grid-cols-2">
          <ExecutivePanel title="Procurement Oversight" action={<Link to="/secretary/audit-legal" className="text-[11px] font-medium text-soe-blue">Audit & legal</Link>}>
            <div className="grid grid-cols-2 gap-5 border-b border-soe-border p-4 sm:grid-cols-3"><StatCell label="Above threshold" value={String(data.procurement.aboveThreshold)} tone="warning" /><StatCell label="Value above threshold" value={formatCurrencyPkr(data.procurement.aboveThresholdValue)} tone="warning" /><StatCell label="Single source" value={String(data.procurement.singleSource)} tone="warning" /><StatCell label="Overdue" value={String(data.procurement.overdue)} tone="critical" /><StatCell label="Missing evidence" value={String(data.procurement.missingEvidence)} tone="critical" /><StatCell label="Top vendor share" value={`${data.procurement.vendorConcentration}%`} tone={data.procurement.vendorConcentration > 40 ? 'warning' : 'positive'} /></div>
            <div className="h-[220px] p-3"><ResponsiveContainer width="100%" height="100%"><BarChart data={data.procurement.byMethod} layout="vertical" margin={{ left: 35, right: 18 }}><CartesianGrid stroke={COLORS.grid} horizontal={false} /><XAxis type="number" allowDecimals={false} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} /><YAxis type="category" dataKey="name" width={105} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} /><Tooltip contentStyle={{ borderRadius: 6, borderColor: '#dde3e8', fontSize: 11 }} /><Bar dataKey="value" name="Contracts" fill={COLORS.blue} radius={[0, 3, 3, 0]} /></BarChart></ResponsiveContainer></div>
          </ExecutivePanel>

          <ExecutivePanel title="Governance & Critical Workforce">
            <div className="grid grid-cols-2 gap-5 border-b border-soe-border p-4 lg:grid-cols-4"><StatCell label="Board vacancies" value={String(data.governance.boardVacancies)} tone="critical" /><StatCell label="Expired appointments" value={String(data.governance.expiredAppointments)} tone="critical" /><StatCell label="Critical vacancies" value={String(data.workforce.criticalVacancies)} tone="critical" /><StatCell label="Consultants expiring" value={String(data.workforce.consultantsExpiring90)} tone="warning" /></div>
            <RankedBars items={data.workforce.vacantPosts} valueFormatter={(value) => `${value} vacant`} emptyLabel="No critical vacancies in this scope" />
            <div className="grid grid-cols-3 border-t border-soe-border p-4"><StatCell label="Total vacancies" value={String(data.workforce.totalVacancies)} /><StatCell label="Active consultants" value={String(data.workforce.activeConsultants)} /><StatCell label="Board decisions" value={String(data.governance.pendingBoardDecisions)} tone="warning" /></div>
            <Link to="/secretary/governance" className="block border-t border-soe-border px-4 py-2.5 text-[11px] font-medium text-soe-blue">Open governance monitoring</Link>
          </ExecutivePanel>
        </div>

        <div className="mt-3 grid gap-3 xl:grid-cols-[1fr_1.35fr]">
          <ExecutivePanel title="Audit & Legal Action Exposure">
            <div className="grid grid-cols-2 gap-5 p-4"><StatCell label="Open audit paras" value={String(data.auditLegal.openParas)} tone="critical" /><StatCell label="Audit exposure" value={formatCurrencyPkr(data.auditLegal.auditExposure)} tone="critical" /><StatCell label="Recovery outstanding" value={formatCurrencyPkr(data.auditLegal.recoveryOutstanding)} tone="warning" /><StatCell label="Overdue PAC" value={String(data.auditLegal.overduePac)} tone="critical" /><StatCell label="Litigation exposure" value={formatCurrencyPkr(data.auditLegal.litigationExposure)} tone="warning" /><StatCell label="Hearings in 30 days" value={String(data.auditLegal.upcomingHearings)} tone="warning" /></div>
            <Link to="/secretary/audit-legal" className="block border-t border-soe-border px-4 py-2.5 text-[11px] font-medium text-soe-blue">Open audit and legal monitoring</Link>
          </ExecutivePanel>
          <ExecutivePanel title="Operational Intervention Queue" action={<ToneBadge tone={data.queue.some((item) => item.tone === 'critical') ? 'critical' : 'warning'} label={`${data.queue.length} ranked matters`} />}><ExecutiveQueue items={data.queue} /></ExecutivePanel>
        </div>

        <ExecutivePanel title="Control Coverage by Obligation Window" className="mt-3">
          <div className="h-[210px] p-3"><ResponsiveContainer width="100%" height="100%"><BarChart data={data.obligationBuckets} margin={{ top: 8, right: 18, left: 0, bottom: 2 }}><CartesianGrid stroke={COLORS.grid} vertical={false} /><XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} axisLine={false} /><YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} axisLine={false} /><Tooltip contentStyle={{ borderRadius: 6, borderColor: '#dde3e8', fontSize: 11 }} /><Bar dataKey="value" name="Obligations" radius={[3, 3, 0, 0]}>{data.obligationBuckets.map((item) => <Cell key={item.name} fill={toneColor(item.tone)} />)}</Bar></BarChart></ResponsiveContainer></div>
        </ExecutivePanel>
      </div>
    </RequirePermission>
  )
}
