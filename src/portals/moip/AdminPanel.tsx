import type { PropsWithChildren, ReactNode } from 'react'
import { cn } from '@/utils'

export function AdminPanel({
  title,
  subtitle,
  actions,
  children,
  className,
  padding = true,
}: PropsWithChildren<{
  title: string
  subtitle?: string
  actions?: ReactNode
  className?: string
  padding?: boolean
}>) {
  return (
    <section
      className={cn(
        'overflow-hidden rounded-card border border-soe-border bg-white shadow-[var(--shadow-xs)]',
        className,
      )}
    >
      <header className="flex flex-wrap items-start justify-between gap-3 bg-[#12304a] px-4 py-2.5">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-white">{title}</h3>
          {subtitle ? <p className="mt-0.5 text-xs text-white/70">{subtitle}</p> : null}
        </div>
        {actions}
      </header>
      <div className={cn(padding && 'p-4')}>{children}</div>
    </section>
  )
}

export function AdminMetricStrip({
  items,
}: {
  items: Array<{ label: string; value: string | number }>
}) {
  return (
    <dl className="grid gap-3 rounded-card border border-soe-border bg-white px-4 py-3 sm:grid-cols-2 lg:grid-cols-5">
      {items.map((item) => (
        <div key={item.label}>
          <dt className="text-[11px] font-semibold uppercase tracking-wide text-soe-slate">{item.label}</dt>
          <dd className="mt-0.5 text-sm font-semibold capitalize text-soe-navy">{item.value}</dd>
        </div>
      ))}
    </dl>
  )
}
