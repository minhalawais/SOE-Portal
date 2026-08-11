import { cn } from '@/utils'
import type { PropsWithChildren, ReactNode } from 'react'
import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react'

type AlertTone = 'info' | 'success' | 'warning' | 'critical'

const toneStyles: Record<AlertTone, string> = {
  info: 'border-soe-info/30 bg-[var(--color-info-soft)] text-soe-ink',
  success: 'border-soe-success/30 bg-[var(--color-success-soft)] text-soe-ink',
  warning: 'border-soe-warning/30 bg-[var(--color-warning-soft)] text-soe-ink',
  critical: 'border-soe-critical/30 bg-[var(--color-critical-soft)] text-soe-ink',
}

const icons = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  critical: XCircle,
}

export function Alert({
  tone = 'info',
  title,
  children,
  className,
}: PropsWithChildren<{ tone?: AlertTone; title: string; className?: string }>) {
  const Icon = icons[tone]
  return (
    <div className={cn('flex gap-3 rounded-card border px-3 py-3', toneStyles[tone], className)} role="status">
      <Icon size={16} className="mt-0.5 shrink-0" aria-hidden />
      <div>
        <p className="text-sm font-medium">{title}</p>
        {children ? <div className="mt-1 text-xs text-soe-slate">{children}</div> : null}
      </div>
    </div>
  )
}

export function EmptyState({
  title,
  hint,
  action,
}: {
  title: string
  hint?: string
  action?: ReactNode
}) {
  return (
    <div className="rounded-card border border-dashed border-soe-border bg-white px-4 py-8 text-center">
      <p className="text-sm text-soe-ink">{title}</p>
      {hint ? <p className="mt-1 text-xs text-soe-slate">{hint}</p> : null}
      {action ? <div className="mt-3 flex justify-center">{action}</div> : null}
    </div>
  )
}

export function LoadingBlock({ label = 'Loading…' }: { label?: string }) {
  return (
    <div
      className="animate-pulse rounded-card border border-soe-border bg-white p-4"
      role="status"
      aria-live="polite"
    >
      <div className="mb-3 h-4 w-40 rounded bg-soe-canvas" />
      <div className="mb-2 h-3 w-full rounded bg-soe-canvas" />
      <div className="h-3 w-2/3 rounded bg-soe-canvas" />
      <span className="sr-only">{label}</span>
    </div>
  )
}

export function SkeletonTable({ rows = 4 }: { rows?: number }) {
  return (
    <div className="overflow-hidden rounded-card border border-soe-border bg-white" role="status">
      <div className="h-11 bg-soe-canvas" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-3 border-t border-soe-border px-3 py-3">
          <div className="h-3 w-1/4 animate-pulse rounded bg-soe-canvas" />
          <div className="h-3 w-1/3 animate-pulse rounded bg-soe-canvas" />
          <div className="h-3 w-1/5 animate-pulse rounded bg-soe-canvas" />
        </div>
      ))}
      <span className="sr-only">Loading table</span>
    </div>
  )
}

export function ErrorState({
  title,
  detail,
}: {
  title: string
  detail?: string
}) {
  return (
    <div className="rounded-card border border-soe-critical/30 bg-[var(--color-critical-soft)] px-4 py-3">
      <p className="text-sm font-medium text-soe-critical">{title}</p>
      {detail ? <p className="mt-1 text-xs text-soe-ink">{detail}</p> : null}
    </div>
  )
}
