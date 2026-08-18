/**
 * Phase 20 — Advanced Search & Intelligence Query Builder.
 * Filter-driven; no NL/AI search. Role/org scope via SearchService.
 */
import { useQuery } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { DataTable } from '@/components/tables/DataTable'
import { RequirePermission } from '@/app/router/guards'
import { Button } from '@/design-system/components/Button'
import { Card } from '@/design-system/components/Card'
import { SelectField, TextField } from '@/design-system/components/Fields'
import { Alert, EmptyState, ErrorState, LoadingBlock } from '@/design-system/components/Feedback'
import { KpiValue } from '@/design-system/components/KpiCard'
import {
  SEARCH_DATASET,
  SEARCH_DATASET_LABEL,
  SEARCH_OPERATOR,
  SEARCH_OPERATOR_LABEL,
  type SearchDataset,
  type SearchOperator,
} from '@/constants'
import { mockSearchService } from '@/mock-services'
import type {
  SearchCondition,
  SearchPortal,
  SearchResultRow,
  StructuredQuery,
} from '@/mock-services/search.service'
import { PERMISSION } from '@/permissions'
import { useSessionStore } from '@/state/session'
import { cn } from '@/utils'
import type { SearchFieldDef } from '@/workflow/searchQueryRegistry'

const linkClass = 'text-sm text-soe-blue underline'

type Mode = 'global' | 'builder'

function permissionFor(portal: SearchPortal) {
  if (portal === 'soe') return PERMISSION.ORGANIZATION_READ
  if (portal === 'moip') return PERMISSION.PORTFOLIO_READ
  return PERMISSION.EXECUTIVE_DASHBOARD_READ
}

function emptyCondition(): SearchCondition {
  return { field: '', operator: SEARCH_OPERATOR.EQ, value: '' }
}

function useDebounced(value: string, ms = 300) {
  const [v, setV] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return v
}

export function AdvancedSearchWorkspace({
  portal,
  title,
}: {
  portal: SearchPortal
  title: string
}) {
  const role = useSessionStore((s) => s.role)
  const organizationId = useSessionStore((s) => s.organizationId)
  const reportingPeriodId = useSessionStore((s) => s.reportingPeriodId)
  const setReportingPeriodId = useSessionStore((s) => s.setReportingPeriodId)
  const [searchParams, setSearchParams] = useSearchParams()

  const mode = (searchParams.get('mode') as Mode) || 'builder'
  const presetId = searchParams.get('preset') ?? ''

  const [globalQ, setGlobalQ] = useState(searchParams.get('q') ?? '')
  const debouncedQ = useDebounced(globalQ, 300)

  const [dataset, setDataset] = useState<SearchDataset>(
    (searchParams.get('dataset') as SearchDataset) || SEARCH_DATASET.ORGANIZATIONS,
  )
  const [logic, setLogic] = useState<'and' | 'or'>(
    (searchParams.get('logic') as 'and' | 'or') || 'and',
  )
  const [period, setPeriod] = useState(searchParams.get('period') ?? reportingPeriodId)
  const [conditions, setConditions] = useState<SearchCondition[]>([emptyCondition()])
  const [sortBy, setSortBy] = useState(searchParams.get('sortBy') ?? '')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>(
    (searchParams.get('sortDir') as 'asc' | 'desc') || 'asc',
  )
  const [page, setPage] = useState(1)
  const [runKey, setRunKey] = useState(0)

  const scope = useMemo(
    () => ({
      portal,
      role,
      organizationId: portal === 'soe' ? organizationId : undefined,
    }),
    [portal, role, organizationId],
  )

  const options = useQuery({
    queryKey: ['search-options', portal, organizationId],
    queryFn: () => mockSearchService.getFilterOptions(scope),
  })
  const catalogue = useQuery({
    queryKey: ['search-catalogue', portal],
    queryFn: () => mockSearchService.getDatasetCatalogue(portal),
  })
  const presets = useQuery({
    queryKey: ['search-presets', portal],
    queryFn: () => mockSearchService.getSavedPresets(portal),
  })

  const fields: SearchFieldDef[] =
    catalogue.data?.find((d) => d.dataset === dataset)?.fields ?? []

  const globalHits = useQuery({
    queryKey: ['search-global', portal, organizationId, debouncedQ],
    enabled: mode === 'global' && debouncedQ.trim().length >= 2,
    queryFn: () => mockSearchService.globalSearch(debouncedQ, scope, { limit: 40 }),
  })

  const structured: StructuredQuery = {
    dataset,
    reportingPeriodId: period,
    logic,
    conditions: conditions.filter((c) => c.field && c.operator),
    sortBy: sortBy || undefined,
    sortDir,
    page,
    pageSize: 20,
  }

  const results = useQuery({
    queryKey: ['search-run', portal, organizationId, structured, runKey],
    enabled: mode === 'builder' && runKey > 0,
    queryFn: () => mockSearchService.runQuery(structured, scope),
  })

  // Apply preset from URL once catalogue/presets load
  useEffect(() => {
    if (!presetId || !presets.data) return
    const preset = presets.data.find((p) => p.id === presetId)
    if (!preset) return
    setDataset(preset.dataset)
    setLogic(preset.logic)
    setConditions(
      preset.conditions.length
        ? preset.conditions.map((c) => ({ ...c }))
        : [emptyCondition()],
    )
    setSortBy(preset.sortBy ?? '')
    setSortDir(preset.sortDir ?? 'asc')
    setPage(1)
    setRunKey((k) => k + 1)
    // consume preset param so re-renders don't re-fire
    const next = new URLSearchParams(searchParams)
    next.delete('preset')
    next.set('mode', 'builder')
    setSearchParams(next, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presetId, presets.data])

  const setMode = (m: Mode) => {
    const next = new URLSearchParams(searchParams)
    next.set('mode', m)
    setSearchParams(next)
  }

  const updateCondition = (index: number, patch: Partial<SearchCondition>) => {
    setConditions((prev) =>
      prev.map((c, i) => {
        if (i !== index) return c
        const next = { ...c, ...patch }
        if (patch.field) {
          const def = fields.find((f) => f.key === patch.field)
          if (def && !def.operators.includes(next.operator)) {
            next.operator = def.operators[0] ?? SEARCH_OPERATOR.EQ
          }
        }
        return next
      }),
    )
  }

  const runQuery = () => {
    setPage(1)
    setRunKey((k) => k + 1)
  }

  const clearFilters = () => {
    setConditions([emptyCondition()])
    setLogic('and')
    setSortBy('')
    setPage(1)
    setRunKey(0)
  }

  const columns = useMemo<ColumnDef<SearchResultRow, unknown>[]>(
    () => [
      {
        accessorKey: 'organizationLabel',
        header: 'SOE',
      },
      {
        accessorKey: 'title',
        header: 'Record',
        cell: ({ row }) => (
          <Link className={linkClass} to={row.original.href}>
            {row.original.title}
          </Link>
        ),
      },
      {
        accessorKey: 'subtitle',
        header: 'Detail',
        cell: ({ getValue }) => (getValue() as string) || '—',
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ getValue }) => (getValue() as string) || '—',
      },
      {
        accessorKey: 'primaryValue',
        header: 'Value',
        cell: ({ getValue }) => (getValue() as string) || '—',
      },
      {
        id: 'open',
        header: 'Open',
        cell: ({ row }) => (
          <Link className={linkClass} to={row.original.href}>
            Drill-down
          </Link>
        ),
      },
    ],
    [],
  )

  return (
    <RequirePermission permission={permissionFor(portal)}>
      <div>
        <PageHeader title={title} />

        <div className="mb-3 flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant={mode === 'builder' ? 'primary' : 'secondary'}
            onClick={() => setMode('builder')}
          >
            Search by filters
          </Button>
          <Button
            type="button"
            size="sm"
            variant={mode === 'global' ? 'primary' : 'secondary'}
            onClick={() => setMode('global')}
          >
            Search by Keyword
          </Button>
        </div>

        {mode === 'global' ? (
          <Card title="Search by keyword">
            <TextField
              label="Search text"
              value={globalQ}
              onChange={(e) => setGlobalQ(e.target.value)}
              placeholder="Type at least 2 characters…"
            />
            <div className="mt-3">
              {debouncedQ.trim().length < 2 ? (
                <p className="text-sm text-soe-slate">Enter at least 2 characters.</p>
              ) : globalHits.isLoading ? (
                <LoadingBlock label="Searching…" />
              ) : globalHits.isError ? (
                <ErrorState title="Search failed" />
              ) : (globalHits.data?.length ?? 0) === 0 ? (
                <EmptyState
                  title="No results match the selected filters."
                  hint="Try adjusting the search text."
                />
              ) : (
                <ul className="divide-y divide-soe-border text-sm">
                  {globalHits.data!.map((h) => (
                    <li
                      key={`${h.dataset}-${h.id}`}
                      className="flex flex-wrap items-center justify-between gap-2 py-2"
                    >
                      <div>
                        <span className="text-[11px] uppercase text-soe-slate">
                          {SEARCH_DATASET_LABEL[h.dataset]}
                          {h.organizationLabel ? ` · ${h.organizationLabel}` : ''}
                        </span>
                        <p className="font-medium">{h.title}</p>
                        {h.subtitle ? (
                          <p className="text-xs text-soe-slate">{h.subtitle}</p>
                        ) : null}
                      </div>
                      <Link className={linkClass} to={h.href}>
                        Open
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Card>
        ) : null}

        {mode === 'builder' ? (
          <div className="space-y-3">
            <Card title="Filters">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <SelectField
                  label="Select Module"
                  value={dataset}
                  onChange={(e) => {
                    setDataset(e.target.value as SearchDataset)
                    setConditions([emptyCondition()])
                    setRunKey(0)
                  }}
                  options={(catalogue.data ?? Object.values(SEARCH_DATASET).map((d) => ({
                    dataset: d,
                    label: SEARCH_DATASET_LABEL[d],
                  }))).map((d) => ({
                    value: d.dataset,
                    label: d.label,
                  }))}
                />
                <SelectField
                  label="Reporting period"
                  value={period}
                  onChange={(e) => {
                    setPeriod(e.target.value)
                    setReportingPeriodId(e.target.value)
                  }}
                  options={
                    options.data?.periods.map((p) => ({ value: p.id, label: p.label })) ?? [
                      { value: period, label: period },
                    ]
                  }
                />
                <SelectField
                  label="Sort by"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  options={[
                    { value: '', label: 'Default' },
                    ...fields.map((f) => ({ value: f.key, label: f.label })),
                  ]}
                />
              </div>

              <div className="mt-3 space-y-2">
                <p className="text-xs font-medium text-soe-slate">Filter rules</p>
                {conditions.map((c, i) => {
                  const def = fields.find((f) => f.key === c.field)
                  const ops = def?.operators ?? Object.values(SEARCH_OPERATOR)
                  const needsValue =
                    c.operator !== SEARCH_OPERATOR.IS_EMPTY &&
                    c.operator !== SEARCH_OPERATOR.IS_NOT_EMPTY
                  return (
                    <div
                      key={i}
                      className="grid gap-2 rounded-control border border-soe-border p-2 sm:grid-cols-4"
                    >
                      <SelectField
                        label="What to search"
                        value={c.field}
                        onChange={(e) => updateCondition(i, { field: e.target.value })}
                        options={[
                          { value: '', label: 'Choose a field' },
                          ...fields.map((f) => ({ value: f.key, label: f.label })),
                        ]}
                      />
                      <SelectField
                        label="How to match"
                        value={c.operator}
                        onChange={(e) =>
                          updateCondition(i, { operator: e.target.value as SearchOperator })
                        }
                        options={ops.map((o) => ({
                          value: o,
                          label: SEARCH_OPERATOR_LABEL[o],
                        }))}
                      />
                      {needsValue ? (
                        def?.type === 'boolean' ? (
                          <SelectField
                            label="Enter value"
                            value={String(c.value ?? '')}
                            onChange={(e) =>
                              updateCondition(i, {
                                value: e.target.value === 'true',
                              })
                            }
                            options={[
                              { value: '', label: 'Choose yes or no' },
                              { value: 'true', label: 'Yes' },
                              { value: 'false', label: 'No' },
                            ]}
                          />
                        ) : def?.type === 'organization' ? (
                          <SelectField
                            label="Enter value"
                            value={String(c.value ?? '')}
                            onChange={(e) => updateCondition(i, { value: e.target.value })}
                            options={[
                              { value: '', label: 'Choose SOE' },
                              ...(options.data?.organizations.map((o) => ({
                                value: o.id,
                                label: o.label,
                              })) ?? []),
                            ]}
                          />
                        ) : def?.type === 'province' ? (
                          <SelectField
                            label="Enter value"
                            value={String(c.value ?? '')}
                            onChange={(e) => updateCondition(i, { value: e.target.value })}
                            options={[
                              { value: '', label: 'Choose province' },
                              ...(options.data?.provinces.map((p) => ({
                                value: p,
                                label: p,
                              })) ?? []),
                            ]}
                          />
                        ) : def?.options?.length ? (
                          <SelectField
                            label="Enter value"
                            value={String(c.value ?? '')}
                            onChange={(e) => updateCondition(i, { value: e.target.value })}
                            options={[
                              { value: '', label: 'Choose a value' },
                              ...def.options,
                            ]}
                          />
                        ) : (
                          <TextField
                            label={c.operator === SEARCH_OPERATOR.BETWEEN ? 'From value' : 'Enter value'}
                            value={String(c.value ?? '')}
                            onChange={(e) => {
                              const raw = e.target.value
                              const num = Number(raw)
                              updateCondition(i, {
                                value:
                                  def?.type === 'number' && raw !== '' && !Number.isNaN(num)
                                    ? num
                                    : raw,
                              })
                            }}
                          />
                        )
                      ) : (
                        <div className="text-xs text-soe-slate self-end pb-2">No value needed</div>
                      )}
                      {c.operator === SEARCH_OPERATOR.BETWEEN ? (
                        <TextField
                          label="To value"
                          value={String(c.valueTo ?? '')}
                          onChange={(e) => {
                            const raw = e.target.value
                            const num = Number(raw)
                            updateCondition(i, {
                              valueTo:
                                def?.type === 'number' && raw !== '' && !Number.isNaN(num)
                                  ? num
                                  : raw,
                            })
                          }}
                        />
                      ) : (
                        <div className="flex items-end gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="tertiary"
                            onClick={() =>
                              setConditions((prev) => prev.filter((_, j) => j !== i))
                            }
                            disabled={conditions.length <= 1}
                          >
                            Remove
                          </Button>
                        </div>
                      )}
                    </div>
                  )
                })}
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => setConditions((prev) => [...prev, emptyCondition()])}
                  >
                    Add filter
                  </Button>
                  <Button type="button" size="sm" variant="primary" onClick={runQuery}>
                    Search
                  </Button>
                  <Button type="button" size="sm" variant="tertiary" onClick={clearFilters}>
                    Clear filters
                  </Button>
                </div>
              </div>
            </Card>

            {runKey > 0 ? (
              <>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <KpiValue
                    label="Dataset"
                    value={SEARCH_DATASET_LABEL[dataset]}
                    period={results.data?.periodLabel ?? period}
                  />
                  <KpiValue
                    label="Results"
                    value={String(results.data?.total ?? '—')}
                    period={`${logic.toUpperCase()} logic`}
                  />
                  <KpiValue
                    label="Active filters"
                    value={String(results.data?.activeFilters.length ?? 0)}
                    period={portal === 'soe' ? 'SOE-scoped' : 'Portfolio'}
                  />
                  <KpiValue label="Page" value={String(page)} period="20 per page" />
                </div>

                <Card
                  title="Active query"
                  subtitle="Period + dataset + filters — avoid ambiguous cross-period results"
                >
                  {results.data ? (
                    <ul className="flex flex-wrap gap-2 text-xs">
                      <li className="rounded-control bg-soe-canvas px-2 py-1">
                        Period: {results.data.periodLabel}
                      </li>
                      <li className="rounded-control bg-soe-canvas px-2 py-1">
                        {SEARCH_DATASET_LABEL[results.data.dataset]}
                      </li>
                      {results.data.activeFilters.map((f, i) => (
                        <li key={i} className="rounded-control bg-soe-canvas px-2 py-1">
                          {f.display}
                        </li>
                      ))}
                      {results.data.activeFilters.length === 0 ? (
                        <li className="text-soe-slate">No field filters (full dataset in scope)</li>
                      ) : null}
                    </ul>
                  ) : null}
                </Card>

                <Card title="Results" subtitle="Drill-down respects portal routes">
                  {results.isLoading ? <LoadingBlock label="Running query…" /> : null}
                  {results.isError ? <ErrorState title="Unable to run query" /> : null}
                  {results.data?.isZeroResult ? (
                    <EmptyState
                      title="No results match the selected filters."
                      hint="Try adjusting the filter rules."
                    />
                  ) : null}
                  {results.data && !results.data.isZeroResult ? (
                    <>
                      <DataTable columns={columns} data={results.data.items} density="compact" />
                      <div className="mt-3 flex items-center justify-between text-xs text-soe-slate">
                        <span>
                          Showing page {results.data.page} of{' '}
                          {Math.max(1, Math.ceil(results.data.total / results.data.pageSize))} (
                          {results.data.total} total)
                        </span>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            disabled={page <= 1}
                            onClick={() => {
                              setPage((p) => Math.max(1, p - 1))
                              setRunKey((k) => k + 1)
                            }}
                          >
                            Previous
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            disabled={
                              page * (results.data.pageSize || 20) >= results.data.total
                            }
                            onClick={() => {
                              setPage((p) => p + 1)
                              setRunKey((k) => k + 1)
                            }}
                          >
                            Next
                          </Button>
                        </div>
                      </div>
                      <Alert
                        tone="info"
                        title="Prototype search index"
                        className={cn('mt-3')}
                      >
                        {results.data.note}
                      </Alert>
                    </>
                  ) : null}
                </Card>
              </>
            ) : (
              <EmptyState
                title="Set filters and search"
                hint="Choose a module, add filter rules, then select Search."
              />
            )}
          </div>
        ) : null}
      </div>
    </RequirePermission>
  )
}

export function SoeAdvancedSearchPage() {
  return <AdvancedSearchWorkspace portal="soe" title="Search & Intelligence Query" />
}

export function MoipAdvancedSearchPage() {
  return (
    <AdvancedSearchWorkspace portal="moip" title="Intelligence Query" />
  )
}

export function SecretaryAdvancedSearchPage() {
  return (
    <AdvancedSearchWorkspace portal="secretary" title="Portfolio Search" />
  )
}

export function MinisterAdvancedSearchPage() {
  return (
    <AdvancedSearchWorkspace portal="minister" title="Strategic Search" />
  )
}

export function PmoAdvancedSearchPage() {
  return <AdvancedSearchWorkspace portal="pmo" title="National Query" />
}
