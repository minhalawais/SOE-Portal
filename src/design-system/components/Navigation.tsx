import { Link } from 'react-router-dom'
import { cn } from '@/utils'

export function Tabs({
  items,
  value,
  onChange,
}: {
  items: Array<{ id: string; label: string }>
  value: string
  onChange: (id: string) => void
}) {
  return (
    <div className="border-b border-soe-border" role="tablist" aria-label="Sections">
      <div className="flex gap-4">
        {items.map((item) => {
          const active = item.id === value
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={active}
              className={cn(
                'border-b-2 px-1 pb-2 text-sm font-medium transition',
                active
                  ? 'border-soe-blue text-soe-navy'
                  : 'border-transparent text-soe-slate hover:text-soe-ink',
              )}
              onClick={() => onChange(item.id)}
            >
              {item.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function Breadcrumbs({
  items,
}: {
  items: Array<{ label: string; to?: string }>
}) {
  return (
    <nav aria-label="Breadcrumb" className="mb-3 text-xs text-soe-slate">
      <ol className="flex flex-wrap items-center gap-1">
        {items.map((item, idx) => (
          <li key={`${item.label}-${idx}`} className="flex items-center gap-1">
            {idx > 0 ? <span aria-hidden>/</span> : null}
            {item.to ? (
              <Link to={item.to} className="text-soe-blue hover:underline">
                {item.label}
              </Link>
            ) : (
              <span className="text-soe-ink">{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}

export function Pagination({
  page,
  pageCount,
  onPrevious,
  onNext,
}: {
  page: number
  pageCount: number
  onPrevious: () => void
  onNext: () => void
}) {
  return (
    <div className="flex items-center gap-2 text-xs text-soe-slate">
      <button
        type="button"
        className="rounded-control border border-soe-border px-2 py-1 disabled:opacity-50"
        onClick={onPrevious}
        disabled={page <= 1}
      >
        Previous
      </button>
      <span>
        Page {page} of {Math.max(pageCount, 1)}
      </span>
      <button
        type="button"
        className="rounded-control border border-soe-border px-2 py-1 disabled:opacity-50"
        onClick={onNext}
        disabled={page >= pageCount}
      >
        Next
      </button>
    </div>
  )
}
