import type { LucideIcon } from 'lucide-react'
import { Download, ShieldCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { SOE_STATUS_LABEL, type SoeStatus } from '@/constants'
import type {
  ExecutiveDashboardFilter,
  ExecutiveFilterOptions,
  ExecutiveMetric,
  ExecutiveRankedItem,
  ExecutiveRiskRow,
  ExecutiveTone,
  SecretaryQueueItem,
} from '@/mock-services/executiveDashboard.service'
import { cn, formatCurrencyPkr } from '@/utils'

const EXECUTIVE_PANEL = 'border border-soe-border bg-white shadow-[var(--shadow-xs)]'

const toneText: Record<ExecutiveTone, string> = {
  neutral: 'text-soe-blue',
  positive: 'text-soe-success',
  warning: 'text-soe-warning',
  critical: 'text-soe-critical',
}

const toneBg: Record<ExecutiveTone, string> = {
  neutral: 'bg-soe-info/10',
  positive: 'bg-soe-success/10',
  warning: 'bg-soe-warning/10',
  critical: 'bg-soe-critical/10',
}

const toneSolid: Record<ExecutiveTone, string> = {
  neutral: 'bg-soe-blue',
  positive: 'bg-soe-success',
  warning: 'bg-soe-warning',
  critical: 'bg-soe-critical',
}

function formatExecutiveValue(metric: ExecutiveMetric) {
  if (metric.format === 'currency') return formatCurrencyPkr(metric.value)
  if (metric.format === 'percent') return `${metric.value.toFixed(1)}%`
  return new Intl.NumberFormat('en-PK').format(metric.value)
}

export function ExecutiveDashboardHeader({
  lens,
  title,
  asOf,
  periodLabel,
  confidence,
  filter,
  options,
  onFilterChange,
  showStatus = false,
}: {
  lens: string
  title: string
  asOf: string
  periodLabel: string
  confidence: number
  filter: ExecutiveDashboardFilter
  options: ExecutiveFilterOptions
  onFilterChange: (patch: Partial<ExecutiveDashboardFilter>) => void
  showStatus?: boolean
}) {
  return (
    <header className={cn(EXECUTIVE_PANEL, 'overflow-hidden rounded-[6px]')}>
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-soe-border px-4 py-4 md:px-6">
        <div>
          <p className="text-[10px] font-semibold uppercase text-soe-blue">{lens}</p>
          <h1 className="mt-1 text-2xl font-semibold text-soe-navy">{title}</h1>
          <p className="mt-1 text-xs text-soe-slate">{periodLabel} · As of {asOf} · Read-only</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="inline-flex h-9 items-center gap-2 rounded-control border border-soe-border bg-soe-canvas px-3 text-xs text-soe-slate">
            <ShieldCheck className={cn('h-4 w-4', confidence >= 80 ? 'text-soe-success' : confidence >= 60 ? 'text-soe-warning' : 'text-soe-critical')} />
            <strong className="font-semibold text-soe-navy">{confidence}%</strong> confidence
          </span>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex h-9 items-center gap-2 rounded-control border border-soe-border bg-white px-3 text-xs font-medium text-soe-blue hover:bg-soe-canvas"
          >
            <Download className="h-4 w-4" />
            Brief
          </button>
        </div>
      </div>
      <div className={cn('grid gap-2 bg-soe-canvas px-4 py-3 md:px-6', showStatus ? 'sm:grid-cols-2 xl:grid-cols-4' : 'sm:grid-cols-3')}>
        <DashboardSelect label="Reporting period" value={filter.reportingPeriodId ?? ''} onChange={(value) => onFilterChange({ reportingPeriodId: value })} options={options.periods.map((item) => ({ value: item.id, label: item.label }))} />
        <DashboardSelect label="Sector" value={filter.sector ?? ''} onChange={(value) => onFilterChange({ sector: value })} options={[{ value: '', label: 'All sectors' }, ...options.sectors.map((value) => ({ value, label: value }))]} />
        <DashboardSelect label="Province" value={filter.province ?? ''} onChange={(value) => onFilterChange({ province: value })} options={[{ value: '', label: 'All provinces' }, ...options.provinces.map((value) => ({ value, label: value }))]} />
        {showStatus ? <DashboardSelect label="SOE status" value={filter.status ?? ''} onChange={(value) => onFilterChange({ status: value as SoeStatus | '' })} options={[{ value: '', label: 'All statuses' }, ...options.statuses.map((value) => ({ value, label: SOE_STATUS_LABEL[value] ?? value }))]} /> : null}
      </div>
    </header>
  )
}

function DashboardSelect({ label, value, options, onChange }: { label: string; value: string; options: Array<{ value: string; label: string }>; onChange: (value: string) => void }) {
  return (
    <label className="space-y-1">
      <span className="block text-[10px] font-medium text-soe-slate">{label}</span>
      <select className="h-9 w-full rounded-control border border-soe-border bg-white px-2.5 text-xs text-soe-ink focus:border-soe-blue focus:outline-none" value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  )
}

export function ExecutivePanel({ title, action, className, children }: { title: string; action?: React.ReactNode; className?: string; children: React.ReactNode }) {
  return (
    <section className={cn(EXECUTIVE_PANEL, 'min-w-0 overflow-hidden rounded-[6px]', className)}>
      <header className="flex min-h-11 items-center justify-between gap-3 border-b border-soe-border px-4 py-2.5">
        <h2 className="text-sm font-semibold text-soe-navy">{title}</h2>
        {action}
      </header>
      {children}
    </section>
  )
}

export function ExecutiveMetricGrid({ metrics, icons }: { metrics: ExecutiveMetric[]; icons: Record<string, LucideIcon> }) {
  return (
    <section className={cn(EXECUTIVE_PANEL, 'mt-3 grid grid-cols-2 overflow-hidden rounded-[6px] lg:grid-cols-4 2xl:grid-cols-8')} aria-label="Executive pulse">
      {metrics.map((metric) => {
        const Icon = icons[metric.id]
        return (
          <Link key={metric.id} to={metric.route} className="group flex min-h-[104px] min-w-0 items-center gap-3 border-b border-r border-soe-border px-3 py-3 transition-colors hover:bg-soe-canvas 2xl:border-b-0">
            {Icon ? <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-control', toneBg[metric.tone], toneText[metric.tone])}><Icon className="h-4 w-4" /></span> : null}
            <div className="min-w-0">
              <p className="line-clamp-2 text-[10px] font-medium leading-tight text-soe-slate">{metric.label}</p>
              <p className="mt-1 whitespace-nowrap text-xl font-semibold tabular-nums text-soe-navy">{formatExecutiveValue(metric)}</p>
              <p className={cn('mt-1 line-clamp-2 text-[10px] leading-tight', toneText[metric.tone])}>{metric.detail}</p>
            </div>
          </Link>
        )
      })}
    </section>
  )
}

export function ToneBadge({ tone, label }: { tone: ExecutiveTone; label: string }) {
  return <span className={cn('inline-flex rounded-full px-2 py-0.5 text-[9px] font-semibold', toneBg[tone], toneText[tone])}>{label}</span>
}

export function RankedBars({ items, valueFormatter = formatCurrencyPkr, emptyLabel = 'No records in this scope' }: { items: ExecutiveRankedItem[]; valueFormatter?: (value: number) => string; emptyLabel?: string }) {
  const max = Math.max(0, ...items.map((item) => item.value))
  if (!items.length) return <p className="p-4 text-xs text-soe-slate">{emptyLabel}</p>
  return (
    <div className="space-y-3 p-4">
      {items.map((item) => (
        <Link key={item.id} to={item.route} className="group block">
          <div className="mb-1 flex items-end justify-between gap-3 text-xs">
            <span className="min-w-0 truncate font-medium text-soe-navy">{item.label}<span className="ml-2 font-normal text-soe-slate">{item.secondary}</span></span>
            <span className="shrink-0 font-semibold tabular-nums text-soe-navy">{valueFormatter(item.value)}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-soe-border/60">
            <div className={cn('h-full rounded-full', toneSolid[item.tone ?? 'neutral'])} style={{ width: `${max ? Math.max(4, (item.value / max) * 100) : 0}%` }} />
          </div>
        </Link>
      ))}
    </div>
  )
}

export function RiskMatrix({ rows, routeLabel = 'Open' }: { rows: ExecutiveRiskRow[]; routeLabel?: string }) {
  const dimensions: Array<{ key: keyof Pick<ExecutiveRiskRow, 'financial' | 'governance' | 'compliance' | 'operations' | 'auditLegal'>; label: string }> = [
    { key: 'financial', label: 'Financial' },
    { key: 'governance', label: 'Governance' },
    { key: 'compliance', label: 'Compliance' },
    { key: 'operations', label: 'Operations' },
    { key: 'auditLegal', label: 'Audit / legal' },
  ]
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[650px] border-collapse text-xs">
        <thead><tr className="bg-soe-canvas text-left text-[10px] text-soe-slate"><th className="px-4 py-2 font-medium">SOE</th>{dimensions.map((item) => <th key={item.key} className="px-2 py-2 text-center font-medium">{item.label}</th>)}<th className="px-3 py-2 text-center font-medium">Issues</th><th className="px-4 py-2" /></tr></thead>
        <tbody>{rows.map((row) => <tr key={row.id} className="border-t border-soe-border hover:bg-soe-canvas"><td className="px-4 py-2.5 font-semibold text-soe-navy">{row.label}</td>{dimensions.map((item) => <td key={item.key} className="px-2 py-2.5"><span className={cn('mx-auto block h-3 w-10 rounded-full', toneSolid[row[item.key]])} title={`${item.label}: ${row[item.key]}`} /></td>)}<td className="px-3 py-2.5 text-center font-semibold tabular-nums text-soe-navy">{row.issueCount}</td><td className="px-4 py-2.5 text-right"><Link className="text-[11px] font-medium text-soe-blue" to={row.route}>{routeLabel}</Link></td></tr>)}</tbody>
      </table>
    </div>
  )
}

export function ExecutiveQueue({ items, emptyLabel = 'No matters require attention in this scope' }: { items: SecretaryQueueItem[]; emptyLabel?: string }) {
  if (!items.length) return <p className="p-4 text-xs text-soe-slate">{emptyLabel}</p>
  return (
    <div className="divide-y divide-soe-border">
      {items.map((item) => (
        <Link key={item.id} to={item.route} className="grid gap-2 px-4 py-3 hover:bg-soe-canvas sm:grid-cols-[100px_minmax(0,1fr)_auto] sm:items-center">
          <div><p className="text-xs font-semibold text-soe-navy">{item.organizationLabel}</p><p className="mt-0.5 text-[10px] capitalize text-soe-slate">{item.category}</p></div>
          <div className="min-w-0"><p className="text-xs text-soe-ink">{item.issue}</p><p className="mt-1 text-[10px] text-soe-slate">{item.owner} · {item.dueDate ?? (item.ageDays ? `${item.ageDays} days open` : 'Current period')}</p></div>
          <div className="text-right"><ToneBadge tone={item.tone} label={item.tone === 'critical' ? 'Critical' : item.tone === 'warning' ? 'Attention' : 'Monitor'} /></div>
        </Link>
      ))}
    </div>
  )
}

export function StatCell({ label, value, tone = 'neutral' }: { label: string; value: string; tone?: ExecutiveTone }) {
  return <div className="min-w-0 border-l-2 border-soe-border pl-3"><p className="text-[10px] font-medium uppercase text-soe-slate">{label}</p><p className={cn('mt-1 text-lg font-semibold tabular-nums', toneText[tone])}>{value}</p></div>
}

export function DashboardLegend() {
  return <div className="flex flex-wrap gap-3 text-[10px] text-soe-slate"><span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-soe-success" />Healthy</span><span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-soe-warning" />Watch</span><span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-soe-critical" />Concern</span></div>
}
