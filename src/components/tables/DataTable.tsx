import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table'
import { useState } from 'react'
import { EmptyState, LoadingBlock, SkeletonTable } from '@/design-system/components/Feedback'
import { Pagination } from '@/design-system/components/Navigation'
import { cn } from '@/utils'

interface DataTableProps<T> {
  data: T[]
  columns: ColumnDef<T, unknown>[]
  isLoading?: boolean
  emptyTitle?: string
  searchPlaceholder?: string
  density?: 'standard' | 'compact'
  showSearch?: boolean
  /** Sticky leftmost columns for horizontal scroll context (default 1). */
  stickyColumnCount?: number
  /** Highlight the row matching this id (registry edit selection). */
  selectedRowId?: string | null
  getRowId?: (row: T) => string
}

export function DataTable<T>({
  data,
  columns,
  isLoading,
  emptyTitle = 'No records found.',
  searchPlaceholder = 'Search…',
  density = 'standard',
  showSearch = true,
  stickyColumnCount = 1,
  selectedRowId,
  getRowId,
}: DataTableProps<T>) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState('')

  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  })

  if (isLoading) {
    return (
      <div className="space-y-3">
        <LoadingBlock label="Loading table" />
        <SkeletonTable />
      </div>
    )
  }

  const rowPad = density === 'compact' ? 'py-2.5' : 'py-3'

  return (
    <div className="space-y-3">
      {showSearch ? (
        <input
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          placeholder={searchPlaceholder}
          className="h-10 w-full max-w-sm rounded-control border border-soe-border px-3 text-sm"
          aria-label="Filter table"
        />
      ) : null}
      {table.getRowModel().rows.length === 0 ? (
        <EmptyState title={emptyTitle} hint="Try adjusting filters." />
      ) : (
        <div className="space-y-1.5">
          <p className="text-[11px] text-soe-slate md:hidden">
            Scroll horizontally to view all columns. Identity columns stay pinned.
          </p>
          <div className="overflow-auto rounded-card border border-soe-border bg-white">
            <table className="min-w-full text-left text-sm">
              <thead className="sticky top-0 z-[30] bg-soe-canvas text-soe-navy">
                {table.getHeaderGroups().map((hg) => (
                  <tr key={hg.id}>
                    {hg.headers.map((header, index) => {
                      const sticky = index < stickyColumnCount
                      return (
                        <th
                          key={header.id}
                          scope="col"
                          className={cn(
                            'whitespace-nowrap px-3 py-3 text-xs font-semibold',
                            sticky &&
                              'sticky left-0 z-[31] border-r border-soe-border bg-soe-canvas shadow-[2px_0_4px_rgba(18,48,74,0.06)]',
                          )}
                        >
                          {header.isPlaceholder ? null : (
                            <button
                              type="button"
                              className="inline-flex items-center gap-1"
                              onClick={header.column.getToggleSortingHandler()}
                            >
                              {flexRender(header.column.columnDef.header, header.getContext())}
                            </button>
                          )}
                        </th>
                      )
                    })}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows.map((row) => {
                  const rowKey = getRowId ? getRowId(row.original) : row.id
                  const selected = selectedRowId != null && selectedRowId === rowKey
                  return (
                  <tr
                    key={row.id}
                    className={cn(
                      'border-t border-soe-border hover:bg-[var(--color-surface-selected)]',
                      selected && 'bg-[var(--color-info-soft)]',
                    )}
                  >
                    {row.getVisibleCells().map((cell, index) => {
                      const sticky = index < stickyColumnCount
                      return (
                        <td
                          key={cell.id}
                          className={cn(
                            'whitespace-nowrap px-3 text-[13px] text-soe-ink',
                            rowPad,
                            sticky &&
                              'sticky left-0 z-[20] border-r border-soe-border bg-white shadow-[2px_0_4px_rgba(18,48,74,0.06)]',
                          )}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      )
                    })}
                  </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <Pagination
        page={table.getState().pagination.pageIndex + 1}
        pageCount={table.getPageCount() || 1}
        onPrevious={() => table.previousPage()}
        onNext={() => table.nextPage()}
      />
    </div>
  )
}
