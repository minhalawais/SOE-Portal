import type { ReactNode } from 'react'
import { cn } from '@/utils'
import { StatusBadge } from '@/design-system/components/StatusBadge'
import type { StatusFamily } from '@/design-system/tokens/status'

const kpiCardClass =
  'flex h-full min-h-[6rem] flex-col rounded-card border border-soe-border bg-white p-4 text-left shadow-[var(--shadow-sm)]'

interface KpiBaseProps {
  label: string
  value: string
  unit?: string
  period?: string
  onClick?: () => void
  className?: string
}

export function KpiValue({ label, value, unit, period, onClick, className }: KpiBaseProps) {
  const Comp = onClick ? 'button' : 'div'
  return (
    <Comp
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={cn(
        kpiCardClass,
        onClick && 'hover:border-soe-blue',
        className,
      )}
    >
      <p className="text-[11px] font-semibold uppercase tracking-wide text-soe-slate">{label}</p>
      <p className="mt-2 text-[28px] font-semibold leading-none text-soe-navy tabular-nums">
        {value}
        {unit ? <span className="ml-1 text-sm font-medium text-soe-slate">{unit}</span> : null}
      </p>
      {period ? <p className="mt-auto pt-2 text-xs text-soe-slate">{period}</p> : null}
    </Comp>
  )
}

export function KpiWithTrend({
  label,
  value,
  trend,
  trendLabel,
  period,
}: KpiBaseProps & { trend: 'up' | 'down' | 'flat'; trendLabel: string }) {
  const tone =
    trend === 'up' ? 'text-soe-success' : trend === 'down' ? 'text-soe-critical' : 'text-soe-slate'
  return (
    <div className={kpiCardClass}>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-soe-slate">{label}</p>
      <p className="mt-2 text-[28px] font-semibold leading-none text-soe-navy tabular-nums">{value}</p>
      <p className={cn('mt-auto pt-2 text-xs font-medium', tone)}>
        {trendLabel}
        {period ? ` · ${period}` : ''}
      </p>
    </div>
  )
}

export function KpiWithStatus({
  label,
  value,
  status,
  family = 'risk',
  period,
}: KpiBaseProps & { status: string; family?: StatusFamily }) {
  return (
    <div className={kpiCardClass}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-soe-slate">{label}</p>
        <StatusBadge status={status} family={family} />
      </div>
      <p className="mt-2 text-[28px] font-semibold leading-none text-soe-navy tabular-nums">{value}</p>
      {period ? <p className="mt-auto pt-2 text-xs text-soe-slate">{period}</p> : null}
    </div>
  )
}

export function KpiComparison({
  label,
  value,
  comparisonLabel,
  comparisonValue,
}: KpiBaseProps & { comparisonLabel: string; comparisonValue: string }) {
  return (
    <div className={kpiCardClass}>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-soe-slate">{label}</p>
      <p className="mt-2 text-[28px] font-semibold leading-none text-soe-navy tabular-nums">{value}</p>
      <p className="mt-auto pt-2 text-xs text-soe-slate">
        {comparisonLabel}: <span className="font-medium text-soe-ink">{comparisonValue}</span>
      </p>
    </div>
  )
}

export function KpiProgress({
  label,
  value,
  percent,
  period,
}: KpiBaseProps & { percent: number }) {
  const clamped = Math.max(0, Math.min(100, percent))
  return (
    <div className={kpiCardClass}>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-soe-slate">{label}</p>
      <p className="mt-2 text-[28px] font-semibold leading-none text-soe-navy tabular-nums">{value}</p>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-soe-canvas">
        <div className="h-full rounded-full bg-soe-teal" style={{ width: `${clamped}%` }} />
      </div>
      {period ? <p className="mt-auto pt-2 text-xs text-soe-slate">{period}</p> : null}
    </div>
  )
}

export function KpiRisk({
  label,
  value,
  risk,
}: {
  label: string
  value: string
  risk: string
}) {
  return <KpiWithStatus label={label} value={value} status={risk} family="risk" />
}

/** Backward-compatible alias used in Phase 1 pages */
export function KpiCard({
  label,
  value,
  period,
  status,
}: {
  label: string
  value: string
  period?: string
  status?: string
}) {
  if (status) {
    return <KpiWithStatus label={label} value={value} period={period} status={status} family="reporting" />
  }
  return <KpiValue label={label} value={value} period={period} />
}

export function KpiGrid({ children }: { children: ReactNode }) {
  return <div className="grid items-stretch gap-3 sm:grid-cols-2 xl:grid-cols-4">{children}</div>
}
