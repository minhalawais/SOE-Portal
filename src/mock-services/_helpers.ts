import type { ListQuery, PagedResult } from '@/types/domain'

export function paginate<T>(items: T[], query?: ListQuery): PagedResult<T> {
  const page = query?.page ?? 1
  const pageSize = query?.pageSize ?? 20
  const start = (page - 1) * pageSize
  return {
    items: items.slice(start, start + pageSize),
    total: items.length,
    page,
    pageSize,
  }
}

export function sortByKey<T extends Record<string, unknown>>(
  items: T[],
  sortBy?: string,
  sortDir: 'asc' | 'desc' = 'asc',
): T[] {
  if (!sortBy) return items
  const dir = sortDir === 'desc' ? -1 : 1
  return [...items].sort((a, b) => {
    const av = a[sortBy]
    const bv = b[sortBy]
    if (av === bv) return 0
    if (av == null) return 1
    if (bv == null) return -1
    return av > bv ? dir : -dir
  })
}
