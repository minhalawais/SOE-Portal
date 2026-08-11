import type { ReactNode } from 'react'
import { LoadingBlock, EmptyState } from '@/design-system/components/Feedback'
import { HelperText } from '@/design-system/foundations/Layout'

interface ChartContainerProps {
  title: string
  subtitle?: string
  period?: string
  actions?: ReactNode
  children?: ReactNode
  /** Screen-reader summary of the chart insight. */
  summary?: string
  /** Optional tabular alternative for charts that are the sole data source. */
  dataTable?: ReactNode
  isLoading?: boolean
  isEmpty?: boolean
  emptyTitle?: string
}

export function ChartContainer({
  title,
  subtitle,
  period,
  actions,
  children,
  summary,
  dataTable,
  isLoading,
  isEmpty,
  emptyTitle = 'No chart data available.',
}: ChartContainerProps) {
  const a11ySummary =
    summary ??
    (!isLoading && !isEmpty
      ? `${title}${subtitle ? `. ${subtitle}` : ''}${period ? ` Period: ${period}.` : ''} Visual chart; use nearby tables or filters for full values.`
      : undefined)

  return (
    <section
      className="rounded-card border border-soe-border bg-white p-4 shadow-[var(--shadow-sm)]"
      aria-label={title}
    >
      <header className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-soe-ink">{title}</h3>
          {subtitle ? <HelperText>{subtitle}</HelperText> : null}
          {period ? <p className="mt-1 text-[11px] text-soe-slate">{period}</p> : null}
        </div>
        {actions}
      </header>
      {isLoading ? <LoadingBlock label="Loading chart" /> : null}
      {!isLoading && isEmpty ? <EmptyState title={emptyTitle} /> : null}
      {!isLoading && !isEmpty ? (
        <div className="h-[220px] sm:h-[260px]" aria-hidden={Boolean(a11ySummary || dataTable)}>
          {children}
        </div>
      ) : null}
      {a11ySummary ? <p className="sr-only">{a11ySummary}</p> : null}
      {dataTable ? (
        <div className="mt-3 overflow-auto border-t border-soe-border pt-3">
          <p className="mb-2 text-[11px] font-medium text-soe-slate">Data table</p>
          {dataTable}
        </div>
      ) : null}
    </section>
  )
}
