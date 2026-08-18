import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  Banknote,
  BriefcaseBusiness,
  Building2,
  CalendarClock,
  CircleDollarSign,
  Factory,
  FileCheck2,
  Gauge,
  Landmark,
  MapPinned,
  ShieldCheck,
  TrendingUp,
  Users,
} from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { ErrorState, LoadingBlock } from '@/design-system/components/Feedback'
import { mockSoeExecutiveService, type SoeExecutiveDashboard } from '@/mock-services/soeExecutive.service'
import { useSessionStore } from '@/state/session'
import { cn, formatCurrencyPkr } from '@/utils'
import pidcLogo from '../../../images/PIDC Logo.png'

const chartColors = ['#1d5d8f', '#16877a', '#c58a19', '#7c6f64', '#b84242', '#637a8c']

function shortNumber(value: number) {
  const abs = Math.abs(value)
  if (abs >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(abs >= 100_000_000_000 ? 0 : 1)}B`
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(abs >= 100_000_000 ? 0 : 1)}M`
  if (abs >= 1_000) return `${(value / 1_000).toFixed(abs >= 100_000 ? 0 : 1)}K`
  return value.toLocaleString('en-PK', { maximumFractionDigits: 0 })
}

function formatDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' })
}

function ExecutiveScore({ data }: { data: SoeExecutiveDashboard }) {
  const radius = 48
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (data.score / 100) * circumference
  const stroke = data.scoreTone === 'healthy' ? '#46b991' : data.scoreTone === 'attention' ? '#e2ac42' : '#e16a6a'

  return (
    <div className="flex min-w-0 items-center gap-4">
      <div className="relative h-[116px] w-[116px] shrink-0" aria-label={`Enterprise score ${data.score} out of 100`}>
        <svg viewBox="0 0 116 116" className="h-full w-full -rotate-90" role="img">
          <circle cx="58" cy="58" r={radius} fill="none" stroke="rgba(255,255,255,.14)" strokeWidth="9" />
          <circle
            cx="58"
            cy="58"
            r={radius}
            fill="none"
            stroke={stroke}
            strokeWidth="9"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[30px] font-semibold leading-none text-white tabular-nums">{data.score}</span>
          <span className="mt-1 text-[10px] uppercase text-white/60">of 100</span>
        </div>
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase text-white/60">Enterprise performance</p>
        <p className="mt-1 text-xl font-semibold text-white">
          {data.scoreTone === 'healthy' ? 'Performing well' : data.scoreTone === 'attention' ? 'Executive attention' : 'Material intervention'}
        </p>
        <p className="mt-2 max-w-[28rem] text-xs leading-5 text-white/65">
          Weighted view of financial health, operations, assets, governance and compliance.
        </p>
      </div>
    </div>
  )
}

function MetricTile({
  label,
  value,
  detail,
  icon: Icon,
  tone = 'neutral',
}: {
  label: string
  value: string
  detail: string
  icon: typeof TrendingUp
  tone?: 'positive' | 'negative' | 'neutral' | 'warning'
}) {
  const toneClass = {
    positive: 'text-soe-success',
    negative: 'text-soe-critical',
    warning: 'text-soe-warning',
    neutral: 'text-soe-navy',
  }[tone]
  return (
    <div className="min-h-[118px] border-b border-soe-border bg-white p-4 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase text-soe-slate">{label}</p>
        <Icon size={17} className="text-soe-slate" aria-hidden="true" />
      </div>
      <p className={cn('mt-4 text-[25px] font-semibold leading-none tabular-nums', toneClass)}>{value}</p>
      <p className="mt-2 text-xs text-soe-slate">{detail}</p>
    </div>
  )
}

function SectionHeading({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="mb-4">
      <p className="text-[11px] font-semibold uppercase text-soe-blue">{eyebrow}</p>
      <h2 className="mt-1 text-lg font-semibold text-soe-navy">{title}</h2>
    </div>
  )
}

function ChartPanel({ title, subtitle, children, className }: { title: string; subtitle: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn('overflow-hidden rounded-[8px] border border-soe-border bg-white', className)}>
      <header className="border-b border-soe-border px-5 py-4">
        <h3 className="text-sm font-semibold text-soe-navy">{title}</h3>
        <p className="mt-1 text-xs text-soe-slate">{subtitle}</p>
      </header>
      <div className="p-5">{children}</div>
    </section>
  )
}

function MiniStat({ label, value, detail, tone }: { label: string; value: string; detail?: string; tone?: string }) {
  return (
    <div className="border-l-2 border-soe-border pl-3">
      <p className="text-[11px] font-medium text-soe-slate">{label}</p>
      <p className={cn('mt-1 text-lg font-semibold text-soe-navy tabular-nums', tone)}>{value}</p>
      {detail ? <p className="mt-1 text-[11px] text-soe-slate">{detail}</p> : null}
    </div>
  )
}

function ProgressBar({ value, tone = 'bg-soe-blue' }: { value: number; tone?: string }) {
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-soe-canvas" aria-hidden="true">
      <div className={cn('h-full rounded-full', tone)} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  )
}

export function SoeExecutiveDashboardPage() {
  const organizationId = useSessionStore((state) => state.organizationId)
  const reportingPeriodId = useSessionStore((state) => state.reportingPeriodId)
  const query = useQuery({
    queryKey: ['soe-executive-dashboard', organizationId, reportingPeriodId],
    queryFn: () => mockSoeExecutiveService.getDashboard(organizationId, reportingPeriodId),
  })

  if (query.isLoading) return <LoadingBlock label="Loading executive intelligence…" />
  if (query.isError || !query.data) return <ErrorState title="Unable to load executive dashboard" />
  const d = query.data
  const profitTone = d.headline.profitOrLoss >= 0 ? 'positive' : 'negative'
  const revenueTrend = d.headline.revenueChangePct
  const trusted = ['approved', 'locked', 'certified'].includes(d.dataTrust.submissionStatus)

  return (
    <div className="mx-auto max-w-[1680px] space-y-8 pb-8">
      <section className="overflow-hidden rounded-[8px] bg-[#102c42] text-white shadow-[0_18px_40px_rgba(18,48,74,.16)]">
        <div className="flex flex-wrap items-start justify-between gap-5 border-b border-white/10 px-5 py-5 lg:px-7">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-medium uppercase text-white/55">
              <span>{d.organization.sector}</span>
              <span aria-hidden="true">/</span>
              <span>{d.period.label}</span>
              <span className={cn('rounded-full px-2 py-0.5 normal-case', trusted ? 'bg-emerald-400/15 text-emerald-200' : 'bg-amber-300/15 text-amber-200')}>
                {trusted ? 'Certified data' : 'Latest available data'}
              </span>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-4 sm:flex-nowrap">
              <div className="flex h-[54px] w-[154px] shrink-0 items-center justify-center overflow-hidden rounded-[6px] border border-white/15 bg-white px-2.5 py-1.5 shadow-[0_5px_16px_rgba(0,0,0,.14)] sm:h-[60px] sm:w-[178px]">
                <img
                  src={pidcLogo}
                  alt="PIDC logo"
                  className="h-full w-full object-contain"
                />
              </div>
              <div className="min-w-0">
                <h1 className="text-2xl font-semibold text-white sm:text-[28px]">{d.organization.name}</h1>
                <p className="mt-1 text-sm text-white/60">Executive intelligence and enterprise performance control room</p>
              </div>
            </div>
          </div>
          <div className="text-right text-xs text-white/55">
            <div>
              <p>Data as of</p>
              <p className="mt-1 font-medium text-white">{formatDate(d.asOf)}</p>
            </div>
          </div>
        </div>
        <div className="grid gap-7 px-5 py-6 lg:grid-cols-[minmax(360px,.85fr)_1.15fr] lg:px-7">
          <ExecutiveScore data={d} />
          <div className="grid grid-cols-2 gap-x-5 gap-y-3 sm:grid-cols-5">
            {d.scoreComponents.map((item) => (
              <Link key={item.domain} to={item.route} className="group min-w-0 border-l border-white/10 pl-3 hover:border-white/30">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-[11px] text-white/55">{item.domain}</span>
                  <ArrowRight size={12} className="text-white/30 group-hover:text-white/70" />
                </div>
                <p className="mt-2 text-xl font-semibold text-white tabular-nums">{item.score}</p>
                <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/10">
                  <div className={cn('h-full rounded-full', item.score >= 75 ? 'bg-emerald-400' : item.score >= 55 ? 'bg-amber-300' : 'bg-red-400')} style={{ width: `${item.score}%` }} />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section aria-label="Executive key performance indicators" className="overflow-hidden rounded-[8px] border border-soe-border shadow-[var(--shadow-sm)]">
        <div className="grid sm:grid-cols-2 xl:grid-cols-6">
          <MetricTile label="Revenue" value={formatCurrencyPkr(d.headline.revenue)} detail={revenueTrend == null ? 'No prior comparison' : `${revenueTrend >= 0 ? '+' : ''}${revenueTrend.toFixed(1)}% vs prior period`} icon={TrendingUp} tone={revenueTrend != null && revenueTrend < 0 ? 'warning' : 'positive'} />
          <MetricTile label="Profit / loss" value={formatCurrencyPkr(d.headline.profitOrLoss)} detail={d.headline.profitChange == null ? 'Current reported result' : `${formatCurrencyPkr(Math.abs(d.headline.profitChange))} movement`} icon={CircleDollarSign} tone={profitTone} />
          <MetricTile label="Operating cash flow" value={formatCurrencyPkr(d.headline.cashFlow)} detail={d.headline.cashFlow >= 0 ? 'Positive cash generation' : 'Liquidity pressure'} icon={Banknote} tone={d.headline.cashFlow >= 0 ? 'positive' : 'negative'} />
          <MetricTile label="Debt exposure" value={formatCurrencyPkr(d.headline.totalDebt)} detail={`${d.financial.overdueLoans} overdue obligations`} icon={Landmark} tone={d.financial.overdueLoans ? 'negative' : 'neutral'} />
          <MetricTile label="Government support" value={formatCurrencyPkr(d.headline.governmentSupport)} detail="Subsidies, support and grants" icon={Building2} tone="warning" />
          <MetricTile label="Capacity utilization" value={`${d.headline.capacityUtilization.toFixed(0)}%`} detail={`${shortNumber(d.operations.actualProduction)} actual production`} icon={Gauge} tone={d.headline.capacityUtilization >= 70 ? 'positive' : 'warning'} />
        </div>
      </section>

      <section>
        <SectionHeading eyebrow="Executive agenda" title="Matters requiring attention" />
        <div className="grid gap-4 xl:grid-cols-[1.35fr_.65fr]">
          <div className="overflow-hidden rounded-[8px] border border-soe-border bg-white">
            {d.attention.length ? d.attention.slice(0, 6).map((item, index) => (
              <Link key={item.id} to={item.route} className="group grid gap-3 border-b border-soe-border px-4 py-3 last:border-b-0 hover:bg-soe-canvas sm:grid-cols-[32px_1fr_auto] sm:items-center">
                <div className={cn('flex h-8 w-8 items-center justify-center rounded-full', item.severity === 'critical' ? 'bg-[var(--color-critical-soft)] text-soe-critical' : item.severity === 'high' ? 'bg-[var(--color-warning-soft)] text-soe-warning' : 'bg-[var(--color-info-soft)] text-soe-info')}>
                  {index + 1}
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium text-soe-ink">{item.title}</p>
                    <span className="text-[10px] uppercase text-soe-slate">{item.domain}</span>
                  </div>
                  <p className="mt-1 text-xs text-soe-slate">{item.detail}</p>
                </div>
                <ArrowRight size={16} className="hidden text-soe-slate group-hover:text-soe-blue sm:block" />
              </Link>
            )) : <p className="p-5 text-sm text-soe-slate">No material executive alerts for this reporting period.</p>}
          </div>
          <div className="rounded-[8px] border border-soe-border bg-[#f0f5f6] p-5">
            <div className="flex items-center gap-2 text-soe-navy"><BadgeCheck size={18} /><h3 className="text-sm font-semibold">Data confidence</h3></div>
            <p className="mt-4 text-3xl font-semibold text-soe-navy tabular-nums">{d.dataTrust.completion.toFixed(0)}%</p>
            <p className="mt-1 text-xs text-soe-slate">Reporting completeness across all modules</p>
            <div className="mt-4"><ProgressBar value={d.dataTrust.completion} tone={d.dataTrust.completion >= 80 ? 'bg-soe-teal' : 'bg-soe-warning'} /></div>
            <dl className="mt-5 grid grid-cols-2 gap-4 text-xs">
              <div><dt className="text-soe-slate">Approved modules</dt><dd className="mt-1 font-semibold text-soe-navy">{d.dataTrust.approvedModules}/{d.dataTrust.totalModules}</dd></div>
              <div><dt className="text-soe-slate">Verified evidence</dt><dd className="mt-1 font-semibold text-soe-navy">{d.dataTrust.verifiedDocuments}</dd></div>
              <div><dt className="text-soe-slate">Missing evidence</dt><dd className="mt-1 font-semibold text-soe-critical">{d.dataTrust.missingDocuments}</dd></div>
              <div><dt className="text-soe-slate">Clarifications</dt><dd className="mt-1 font-semibold text-soe-warning">{d.dataTrust.openClarifications}</dd></div>
            </dl>
          </div>
        </div>
      </section>

      <section>
        <SectionHeading eyebrow="Financial health" title="Performance, liquidity and fiscal exposure" />
        <div className="grid gap-4 xl:grid-cols-[1.35fr_.65fr]">
          <ChartPanel title="Financial performance" subtitle="Revenue, operating expenses and profit/loss by reporting period">
            <div className="h-[310px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={d.financial.trend} margin={{ top: 12, right: 10, left: 4, bottom: 0 }}>
                  <CartesianGrid stroke="#e8edf0" vertical={false} />
                  <XAxis dataKey="period" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={shortNumber} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} width={48} />
                  <Tooltip formatter={(value) => formatCurrencyPkr(Number(value))} contentStyle={{ borderRadius: 8, border: '1px solid #dde3e8', fontSize: 12 }} />
                  <Bar dataKey="revenue" name="Revenue" fill="#1d5d8f" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="expenses" name="Operating expenses" fill="#b9c8d3" radius={[3, 3, 0, 0]} />
                  <Line type="monotone" dataKey="profit" name="Profit / loss" stroke="#16877a" strokeWidth={3} dot={{ r: 3, fill: '#16877a' }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </ChartPanel>
          <ChartPanel title="Balance-sheet signals" subtitle="Key exposures and immediate liquidity indicators">
            <div className="grid grid-cols-2 gap-x-4 gap-y-6">
              <MiniStat label="Working capital" value={formatCurrencyPkr(d.financial.workingCapital)} tone={d.financial.workingCapital < 0 ? 'text-soe-critical' : 'text-soe-success'} />
              <MiniStat label="Current ratio" value={d.financial.currentRatio == null ? '—' : `${d.financial.currentRatio.toFixed(2)}x`} detail="Liquidity coverage" />
              <MiniStat label="Debt ratio" value={d.financial.debtRatio == null ? '—' : `${(d.financial.debtRatio * 100).toFixed(0)}%`} detail="Debt / total assets" />
              <MiniStat label="Repayments due" value={formatCurrencyPkr(d.financial.repaymentsDue)} />
              <MiniStat label="Receivables" value={formatCurrencyPkr(d.financial.receivables)} />
              <MiniStat label="Payables" value={formatCurrencyPkr(d.financial.payables)} />
            </div>
            <div className="mt-7 border-t border-soe-border pt-5">
              <div className="flex justify-between text-xs"><span className="text-soe-slate">Budget utilization</span><span className="font-medium text-soe-navy">{d.financial.budget ? ((d.financial.actual / d.financial.budget) * 100).toFixed(0) : 0}%</span></div>
              <div className="mt-2"><ProgressBar value={d.financial.budget ? (d.financial.actual / d.financial.budget) * 100 : 0} tone="bg-soe-blue" /></div>
            </div>
          </ChartPanel>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MiniStat label="Outstanding loans" value={formatCurrencyPkr(d.financial.outstandingLoans)} detail={`${d.financial.overdueLoans} overdue`} />
          <MiniStat label="Guarantee exposure" value={formatCurrencyPkr(d.financial.guarantees)} />
          <MiniStat label="Subsidies" value={formatCurrencyPkr(d.financial.subsidies)} />
          <MiniStat label="Grants received" value={formatCurrencyPkr(d.financial.grants)} />
        </div>
      </section>

      <section>
        <SectionHeading eyebrow="Operations and assets" title="Production capacity and enterprise value" />
        <div className="grid gap-4 xl:grid-cols-2">
          <ChartPanel title="Industrial performance" subtitle="Capacity utilization and actual production trend">
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={d.operations.trend} margin={{ top: 10, right: 6, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="#e8edf0" vertical={false} />
                  <XAxis dataKey="period" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="left" tickFormatter={shortNumber} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} width={45} />
                  <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} width={38} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #dde3e8', fontSize: 12 }} />
                  <Bar yAxisId="left" dataKey="production" name="Actual production" fill="#16877a" radius={[3, 3, 0, 0]} />
                  <Line yAxisId="right" type="monotone" dataKey="utilization" name="Capacity utilization %" stroke="#c58a19" strokeWidth={3} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-4 border-t border-soe-border pt-4 sm:grid-cols-4">
              <MiniStat label="Installed capacity" value={shortNumber(d.operations.installedCapacity)} />
              <MiniStat label="Exports" value={formatCurrencyPkr(d.operations.exports)} />
              <MiniStat label="Domestic sales" value={formatCurrencyPkr(d.operations.domesticSales)} />
              <MiniStat label="Employment" value={d.operations.employment.toLocaleString('en-PK')} />
            </div>
          </ChartPanel>
          <ChartPanel title="Asset value by class" subtitle="Market value composition across the active asset registry">
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={d.assets.byType.slice(0, 7)} layout="vertical" margin={{ top: 0, right: 16, left: 15, bottom: 0 }}>
                  <CartesianGrid stroke="#e8edf0" horizontal={false} />
                  <XAxis type="number" tickFormatter={shortNumber} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="type" width={92} tick={{ fontSize: 11, fill: '#475569' }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(value) => formatCurrencyPkr(Number(value))} contentStyle={{ borderRadius: 8, border: '1px solid #dde3e8', fontSize: 12 }} />
                  <Bar dataKey="marketValue" name="Market value" radius={[0, 4, 4, 0]}>
                    {d.assets.byType.slice(0, 7).map((item, index) => <Cell key={item.type} fill={chartColors[index % chartColors.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-4 border-t border-soe-border pt-4 sm:grid-cols-4">
              <MiniStat label="Market value" value={formatCurrencyPkr(d.assets.marketValue)} />
              <MiniStat label="Valuation uplift" value={formatCurrencyPkr(d.assets.valuationGap)} />
              <MiniStat label="Idle asset value" value={formatCurrencyPkr(d.assets.idleValue)} tone="text-soe-warning" />
              <MiniStat label="Average utilization" value={`${d.assets.averageUtilization.toFixed(0)}%`} />
            </div>
          </ChartPanel>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <MiniStat label="Registered assets" value={d.assets.count.toLocaleString('en-PK')} />
          <MiniStat label="Missing valuations" value={String(d.assets.missingValuationCount)} tone={d.assets.missingValuationCount ? 'text-soe-warning' : ''} />
          <MiniStat label="Idle / underutilized" value={String(d.assets.idleCount)} tone={d.assets.idleCount ? 'text-soe-warning' : ''} />
          <MiniStat label="Encroachment cases" value={String(d.assets.encroachedCount)} tone={d.assets.encroachedCount ? 'text-soe-critical' : ''} />
          <MiniStat label="Assets in litigation" value={String(d.assets.underLitigationCount)} tone={d.assets.underLitigationCount ? 'text-soe-critical' : ''} />
        </div>
      </section>

      <section>
        <SectionHeading eyebrow="Leadership and governance" title="Workforce capacity, board effectiveness and continuity" />
        <div className="grid gap-4 lg:grid-cols-3">
          <ChartPanel title="Workforce capacity" subtitle="Posts, vacancies and employment structure">
            <div className="flex items-center gap-5">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full border-[7px] border-soe-blue/15 text-xl font-semibold text-soe-navy">{(100 - d.people.vacancyRate).toFixed(0)}%</div>
              <div><p className="text-sm font-medium text-soe-navy">Posts filled</p><p className="mt-1 text-xs text-soe-slate">{d.people.filledPosts.toLocaleString('en-PK')} of {d.people.sanctionedPosts.toLocaleString('en-PK')} sanctioned</p></div>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-5"><MiniStat label="Critical vacancies" value={String(d.people.criticalVacancies)} tone={d.people.criticalVacancies ? 'text-soe-critical' : ''} /><MiniStat label="Employees recorded" value={d.people.employees.toLocaleString('en-PK')} /><MiniStat label="Active consultants" value={String(d.people.consultants)} /><MiniStat label="Daily wagers" value={String(d.people.dailyWagers)} /></div>
          </ChartPanel>
          <ChartPanel title="Board effectiveness" subtitle="Composition, committee coverage and term risk">
            <div className="flex items-center justify-between"><div><p className="text-3xl font-semibold text-soe-navy">{d.people.committeeCoverage.toFixed(0)}%</p><p className="mt-1 text-xs text-soe-slate">Committee coverage</p></div><ShieldCheck size={42} className="text-soe-teal" /></div>
            <div className="mt-5"><ProgressBar value={d.people.committeeCoverage} tone="bg-soe-teal" /></div>
            <div className="mt-6 grid grid-cols-2 gap-5"><MiniStat label="Active members" value={String(d.people.boardMembers)} /><MiniStat label="Vacancies" value={String(d.people.boardVacancies)} tone={d.people.boardVacancies ? 'text-soe-critical' : ''} /><MiniStat label="Independent directors" value={String(d.people.independentDirectors)} /><MiniStat label="Terms expiring" value={String(d.people.termsExpiring)} tone={d.people.termsExpiring ? 'text-soe-warning' : ''} /></div>
          </ChartPanel>
          <ChartPanel title="Leadership continuity" subtitle="Executive positions and near-term governance events">
            <div className="flex items-center gap-4 rounded-[6px] bg-soe-canvas p-4"><BriefcaseBusiness size={28} className="text-soe-blue" /><div><p className="text-2xl font-semibold text-soe-navy">{d.people.leadershipPositions}</p><p className="text-xs text-soe-slate">Executive positions recorded</p></div></div>
            <div className="mt-5 space-y-4">
              <div className="flex items-center justify-between border-b border-soe-border pb-3"><span className="flex items-center gap-2 text-xs text-soe-slate"><CalendarClock size={15} /> Board terms expiring</span><span className="font-semibold text-soe-navy">{d.people.termsExpiring}</span></div>
              <div className="flex items-center justify-between border-b border-soe-border pb-3"><span className="flex items-center gap-2 text-xs text-soe-slate"><Users size={15} /> Critical workforce gaps</span><span className="font-semibold text-soe-navy">{d.people.criticalVacancies}</span></div>
              <Link to="/soe/people/executives" className="inline-flex items-center gap-1 text-xs font-medium text-soe-blue">Open executives <ArrowRight size={13} /></Link>
            </div>
          </ChartPanel>
        </div>
      </section>

      <section>
        <SectionHeading eyebrow="Accountability and risk" title="Financial exposure behind governance obligations" />
        <div className="grid gap-4 xl:grid-cols-[.9fr_1.1fr]">
          <ChartPanel title="Exposure overview" subtitle="Open financial exposure by accountability domain">
            <div className="space-y-5">
              {[
                { label: 'Audit observations', value: d.accountability.auditExposure, count: d.accountability.openAuditParas, route: '/soe/accountability/audit', color: 'bg-soe-critical' },
                { label: 'Active litigation', value: d.accountability.litigationExposure, count: d.accountability.activeLitigation, route: '/soe/accountability/litigation', color: 'bg-soe-warning' },
                { label: 'Procurement portfolio', value: d.accountability.procurementValue, count: d.accountability.procurementExceptions, route: '/soe/accountability/procurement', color: 'bg-soe-blue' },
              ].map((item) => {
                const max = Math.max(d.accountability.auditExposure, d.accountability.litigationExposure, d.accountability.procurementValue, 1)
                return <Link key={item.label} to={item.route} className="group block"><div className="mb-2 flex items-end justify-between gap-3"><div><p className="text-sm font-medium text-soe-navy">{item.label}</p><p className="mt-0.5 text-[11px] text-soe-slate">{item.count} open or exceptional records</p></div><p className="text-sm font-semibold text-soe-navy">{formatCurrencyPkr(item.value)}</p></div><ProgressBar value={(item.value / max) * 100} tone={item.color} /></Link>
              })}
            </div>
            <div className="mt-7 grid grid-cols-2 gap-4 border-t border-soe-border pt-5"><MiniStat label="Audit recovery" value={formatCurrencyPkr(d.accountability.auditRecovered)} /><MiniStat label="Open PAC matters" value={String(d.accountability.pacOpen)} /></div>
          </ChartPanel>
          <div className="grid gap-4 sm:grid-cols-2">
            <ChartPanel title="Compliance posture" subtitle="Statutory and governance obligations">
              <div className="flex items-center justify-between"><div><p className="text-3xl font-semibold text-soe-navy">{d.accountability.complianceRate.toFixed(0)}%</p><p className="mt-1 text-xs text-soe-slate">Obligations compliant</p></div><FileCheck2 size={38} className="text-soe-teal" /></div>
              <div className="mt-5"><ProgressBar value={d.accountability.complianceRate} tone={d.accountability.complianceRate >= 80 ? 'bg-soe-teal' : 'bg-soe-warning'} /></div>
              <p className="mt-5 text-xs"><span className="font-semibold text-soe-critical">{d.accountability.overdueCompliance}</span> <span className="text-soe-slate">obligations overdue</span></p>
            </ChartPanel>
            <ChartPanel title="Procurement control" subtitle="Exceptions, delivery and concentration">
              <div className="grid grid-cols-2 gap-5"><MiniStat label="PPRA / method exceptions" value={String(d.accountability.procurementExceptions)} tone={d.accountability.procurementExceptions ? 'text-soe-warning' : ''} /><MiniStat label="Delayed contracts" value={String(d.accountability.delayedContracts)} tone={d.accountability.delayedContracts ? 'text-soe-critical' : ''} /><MiniStat label="Vendor concentration" value={`${d.accountability.vendorConcentrationPct.toFixed(0)}%`} detail="Largest vendor share" /><MiniStat label="Portfolio value" value={formatCurrencyPkr(d.accountability.procurementValue)} /></div>
            </ChartPanel>
            <ChartPanel title="Risk matrix" subtitle="Current executive signals by severity" className="sm:col-span-2">
              <div className="grid grid-cols-3 gap-2">
                {(['critical', 'high', 'medium'] as const).map((severity) => {
                  const count = d.attention.filter((item) => item.severity === severity).length
                  return <div key={severity} className={cn('rounded-[6px] border p-4', severity === 'critical' ? 'border-red-200 bg-red-50' : severity === 'high' ? 'border-amber-200 bg-amber-50' : 'border-blue-200 bg-blue-50')}><p className="text-[10px] font-semibold uppercase text-soe-slate">{severity}</p><p className="mt-2 text-2xl font-semibold text-soe-navy">{count}</p><p className="mt-1 text-[11px] text-soe-slate">active signals</p></div>
                })}
              </div>
            </ChartPanel>
          </div>
        </div>
      </section>

      <section>
        <SectionHeading eyebrow="Strategic direction" title="Transformation, subsidiaries and geographic footprint" />
        <div className="grid gap-4 lg:grid-cols-3">
          <ChartPanel title="Privatization and transformation" subtitle="Current strategic pipeline position">
            <div className="flex items-start gap-3"><Factory size={22} className="mt-0.5 text-soe-blue" /><div><p className="text-xs text-soe-slate">Current stage</p><p className="mt-1 text-lg font-semibold text-soe-navy">{d.transformation.privatizationStage}</p><p className="mt-1 text-xs text-soe-slate">{d.transformation.privatizationStatus}</p></div></div>
            <div className="mt-6 grid grid-cols-2 gap-5"><MiniStat label="Transformation initiatives" value={String(d.transformation.transformationInitiatives)} /><MiniStat label="Blocked milestones" value={String(d.transformation.blockedMilestones)} tone={d.transformation.blockedMilestones ? 'text-soe-critical' : ''} /></div>
            <Link to="/soe/privatization" className="mt-6 inline-flex items-center gap-1 text-xs font-medium text-soe-blue">Open transformation pipeline <ArrowRight size={13} /></Link>
          </ChartPanel>
          <ChartPanel title="Subsidiary portfolio" subtitle="Controlled entities and ownership position">
            <p className="text-3xl font-semibold text-soe-navy">{d.transformation.subsidiaryCount}</p><p className="mt-1 text-xs text-soe-slate">subsidiaries and related entities</p>
            <div className="mt-5 space-y-3">{d.transformation.subsidiaries.slice(0, 4).map((item) => <div key={item.name} className="flex items-center justify-between gap-3 border-b border-soe-border pb-2"><div className="min-w-0"><p className="truncate text-xs font-medium text-soe-navy">{item.name}</p><p className="text-[11px] text-soe-slate">{item.status}</p></div><span className="text-xs font-semibold text-soe-blue">{item.ownershipPct}%</span></div>)}{!d.transformation.subsidiaries.length ? <p className="text-xs text-soe-slate">No subsidiary relationships recorded.</p> : null}</div>
          </ChartPanel>
          <ChartPanel title="Asset geography" subtitle="Value concentration by province">
            <div className="space-y-4">{d.assets.byProvince.slice(0, 6).map((item) => <div key={item.province}><div className="mb-1.5 flex items-center justify-between gap-3"><span className="flex items-center gap-2 text-xs text-soe-navy"><MapPinned size={13} className="text-soe-slate" />{item.province}</span><span className="text-xs font-medium text-soe-navy">{formatCurrencyPkr(item.value)}</span></div><ProgressBar value={d.assets.marketValue ? (item.value / d.assets.marketValue) * 100 : 0} tone="bg-soe-blue" /></div>)}</div>
            <Link to="/soe/assets/land" className="mt-6 inline-flex items-center gap-1 text-xs font-medium text-soe-blue">Open land assets <ArrowRight size={13} /></Link>
          </ChartPanel>
        </div>
      </section>

      <section>
        <SectionHeading eyebrow="Complete reporting estate" title="Module pulse and data readiness" />
        <div className="grid gap-px overflow-hidden rounded-[8px] border border-soe-border bg-soe-border sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {d.modulePulse.map((module) => {
            const complete = module.completion >= 100
            return <Link key={module.id} to={module.route} className="group min-h-[116px] bg-white p-4 hover:bg-soe-canvas"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold text-soe-navy">{module.label}</p><p className="mt-1 text-[11px] capitalize text-soe-slate">{module.status.replaceAll('_', ' ')}</p></div>{complete ? <BadgeCheck size={17} className="text-soe-success" /> : module.issueCount ? <AlertTriangle size={17} className="text-soe-warning" /> : <ArrowRight size={16} className="text-soe-slate" />}</div><div className="mt-5 flex items-center justify-between text-[11px]"><span className="text-soe-slate">Readiness</span><span className="font-semibold text-soe-navy">{module.completion}%</span></div><div className="mt-2"><ProgressBar value={module.completion} tone={complete ? 'bg-soe-success' : module.completion >= 70 ? 'bg-soe-blue' : 'bg-soe-warning'} /></div></Link>
          })}
        </div>
      </section>

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-soe-border pt-4 text-[11px] text-soe-slate">
        <p>Executive indicators are derived from the selected reporting period. Open any indicator to review its underlying records.</p>
        <div className="flex gap-4"><Link to="/soe/reports" className="font-medium text-soe-blue">Executive reports</Link><Link to="/soe/search" className="font-medium text-soe-blue">Search intelligence</Link></div>
      </footer>
    </div>
  )
}
