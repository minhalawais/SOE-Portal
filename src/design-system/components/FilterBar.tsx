import { X } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from '@/design-system/components/Button'
import { cn } from '@/utils'

export interface FilterChip {
  id: string
  label: string
}

export function FilterBar({
  search,
  onSearchChange,
  searchPlaceholder = 'Search…',
  filters,
  chips,
  onClearChip,
  onClearAll,
  actions,
  className,
}: {
  search?: string
  onSearchChange?: (value: string) => void
  searchPlaceholder?: string
  filters?: ReactNode
  chips?: FilterChip[]
  onClearChip?: (id: string) => void
  onClearAll?: () => void
  actions?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('space-y-2 rounded-card border border-soe-border bg-white p-3', className)}>
      <div className="flex flex-wrap items-end gap-2">
        {onSearchChange ? (
          <label className="min-w-[200px] flex-1 space-y-1 text-xs text-soe-slate">
            Search
            <input
              value={search ?? ''}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              className="h-10 w-full rounded-control border border-soe-border px-3 text-sm text-soe-ink"
            />
          </label>
        ) : null}
        {filters}
        <div className="ml-auto flex items-center gap-2">{actions}</div>
      </div>
      {chips && chips.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          {chips.map((chip) => (
            <button
              key={chip.id}
              type="button"
              className="inline-flex items-center gap-1 rounded-full bg-soe-canvas px-2.5 py-1 text-[11px] font-medium text-soe-ink"
              onClick={() => onClearChip?.(chip.id)}
            >
              {chip.label}
              <X size={12} aria-hidden />
            </button>
          ))}
          {onClearAll ? (
            <Button size="sm" variant="tertiary" onClick={onClearAll}>
              Clear all
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
