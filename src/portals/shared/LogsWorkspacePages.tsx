import { useQuery } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  CheckCircle2,
  FileText,
  Lock,
  ScrollText,
  Shield,
} from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { DataTable } from '@/components/tables/DataTable'
import { AdminMetricStrip, AdminPanel } from '@/portals/moip/AdminPanel'
import { RequirePermission } from '@/app/router/guards'
import { Button } from '@/design-system/components/Button'
import { SelectField } from '@/design-system/components/Fields'
import { EmptyState, ErrorState, LoadingBlock } from '@/design-system/components/Feedback'
import { FilterBar } from '@/design-system/components/FilterBar'
import { StatusBadge } from '@/design-system/components/StatusBadge'
import { DEMO_AS_OF_DATE, ROLE_LABEL, type RoleId } from '@/constants'
import { mockLogsService, mockOrganizationService } from '@/mock-services'
import type {
  ActivityLogEntry,
  LogCategory,
  LogLevel,
  LogsQuery,
} from '@/mock-services/logs.service'
import { PERMISSION } from '@/permissions'
import { useSessionStore } from '@/state/session'
import { cn } from '@/utils'
import { REPORTING_MODULES } from '@/workflow/moduleCatalog'

type LogsPortal = 'soe' | 'moip'

type QuickFilter = NonNullable<LogsQuery['quick']>

const linkClass = 'text-sm text-soe-blue underline'

const LEVEL_LABEL: Record<LogLevel, string> = {
  info: 'Info',
  success: 'Success',
  warning: 'Warning',
  security: 'Security',
  error: 'Error',
}

const CATEGORY_LABEL: Record<LogCategory, string> = {
  auth: 'Authentication',
  data_entry: 'Data entry',
  submission: 'Submission',
  document: 'Documents',
  review: 'Review',
  export: 'Export',
  system: 'System',
}

const QUICK_FILTERS: Array<{ id: QuickFilter; label: string; icon?: typeof ScrollText }> = [
  { id: 'all', label: 'All activity' },
  { id: 'today', label: 'Today' },
  { id: 'data_entry', label: 'Data entry' },
  { id: 'submissions', label: 'Submissions' },
  { id: 'security', label: 'Security' },
]

function quickTabClass(active: boolean) {
  return cn(
    'inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-sm font-medium transition-colors',
    active
      ? 'bg-soe-navy text-white'
      : 'border border-soe-border bg-white text-soe-slate hover:bg-soe-canvas',
  )
}

function levelBadge(level: LogLevel) {
  if (level === 'success') {
    return <StatusBadge status="complete" family="reporting" label={LEVEL_LABEL.success} />
  }
  if (level === 'warning') {
    return <StatusBadge status="high" family="risk" label={LEVEL_LABEL.warning} />
  }
  if (level === 'error') {
    return <StatusBadge status="critical" family="risk" label={LEVEL_LABEL.error} />
  }
  if (level === 'security') {
    return <StatusBadge status="critical" family="risk" label={LEVEL_LABEL.security} />
  }
  return <StatusBadge status="in_progress" family="reporting" label={LEVEL_LABEL.info} />
}

function categoryIcon(category: LogCategory) {
  if (category === 'auth') return Shield
  if (category === 'document') return FileText
  if (category === 'submission' || category === 'review') return CheckCircle2
  if (category === 'system') return AlertTriangle
  return ScrollText
}

function moduleLabel(id?: string) {
  if (!id) return '—'
  return REPORTING_MODULES.find((m) => m.id === id)?.label ?? id
}

function formatTimestamp(iso: string) {
  const d = new Date(iso)
  return {
    date: d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' }),
    time: d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
  }
}

export function LogsAlertsNav() {
  return (
    <nav className="mb-4 flex flex-wrap gap-x-3 gap-y-1 text-xs" aria-label="Logs sections">
      <Link className={linkClass} to="/soe/logs">
        Logs
      </Link>
      <Link className={linkClass} to="/soe/notifications">
        Notifications
      </Link>
      <Link className={linkClass} to="/soe/alerts">
        Alerts
      </Link>
    </nav>
  )
}

export function LogsCentreWorkspace({
  portal,
  embedded = false,
}: {
  portal: LogsPortal
  embedded?: boolean
}) {
  const organizationId = useSessionStore((s) => s.organizationId)
  const portfolio = portal === 'moip'

  const [quick, setQuick] = useState<QuickFilter>('all')
  const [level, setLevel] = useState<LogLevel | ''>('')
  const [category, setCategory] = useState<LogCategory | ''>('')
  const [module, setModule] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const org = useQuery({
    queryKey: ['org', organizationId],
    queryFn: () => mockOrganizationService.getOrganization(organizationId),
    enabled: !portfolio,
  })

  const summary = useQuery({
    queryKey: ['logs-summary', portal, organizationId],
    queryFn: () =>
      mockLogsService.getSummary({
        organizationId: portfolio ? undefined : organizationId,
        portfolio,
      }),
  })

  const logs = useQuery({
    queryKey: ['logs', portal, organizationId, quick, level, category, module, search, page],
    queryFn: () =>
      mockLogsService.getLogs({
        organizationId: portfolio ? undefined : organizationId,
        portfolio,
        quick,
        level: level || undefined,
        category: category || undefined,
        module: module || undefined,
        search: search || undefined,
        page,
        pageSize: 20,
      }),
  })

  const showOrg = portfolio

  const columns = useMemo<ColumnDef<ActivityLogEntry, unknown>[]>(
    () => [
      {
        id: 'timestamp',
        header: 'When',
        cell: ({ row }) => {
          const { date, time } = formatTimestamp(row.original.occurredAt)
          return (
            <div className="whitespace-nowrap">
              <p className="text-sm font-medium text-soe-ink">{date}</p>
              <p className="font-mono text-[11px] text-soe-slate">{time}</p>
            </div>
          )
        },
      },
      {
        id: 'level',
        header: 'Level',
        cell: ({ row }) => levelBadge(row.original.level),
      },
      {
        id: 'category',
        header: 'Category',
        cell: ({ row }) => {
          const Icon = categoryIcon(row.original.category)
          return (
            <span className="inline-flex items-center gap-1.5 text-sm text-soe-ink">
              <Icon size={14} className="shrink-0 text-soe-slate" aria-hidden />
              {CATEGORY_LABEL[row.original.category]}
            </span>
          )
        },
      },
      {
        accessorKey: 'actor',
        header: 'Actor',
        cell: ({ row }) => (
          <div>
            <p className="text-sm font-medium text-soe-ink">{row.original.actor}</p>
            <p className="text-[11px] text-soe-slate">
              {ROLE_LABEL[row.original.actorRole as RoleId] ??
                String(row.original.actorRole).replaceAll('_', ' ')}
            </p>
          </div>
        ),
      },
      {
        accessorKey: 'action',
        header: 'Action',
        cell: ({ getValue }) => (
          <span className="text-sm font-medium capitalize text-soe-navy">{String(getValue())}</span>
        ),
      },
      {
        accessorKey: 'detail',
        header: 'Detail',
        cell: ({ row }) => (
          <div className="max-w-md">
            <p className="text-sm text-soe-slate">{row.original.detail}</p>
            {row.original.recordRef ? (
              <p className="mt-0.5 font-mono text-[10px] text-soe-slate/80">{row.original.recordRef}</p>
            ) : null}
          </div>
        ),
      },
      ...(showOrg
        ? [
            {
              accessorKey: 'organizationId',
              header: 'SOE',
              cell: ({ getValue }: { getValue: () => unknown }) => {
                const id = String(getValue() ?? '')
                const orgItem = dbOrgAbbrev(id)
                return <span className="text-sm text-soe-ink">{orgItem}</span>
              },
            } as ColumnDef<ActivityLogEntry, unknown>,
          ]
        : []),
      {
        accessorKey: 'module',
        header: 'Module',
        cell: ({ getValue }) => (
          <span className="text-sm text-soe-slate">{moduleLabel(String(getValue() ?? ''))}</span>
        ),
      },
      {
        accessorKey: 'ipAddress',
        header: 'IP',
        cell: ({ getValue }) => (
          <span className="font-mono text-[11px] text-soe-slate">{String(getValue() ?? '—')}</span>
        ),
      },
    ],
    [showOrg],
  )

  const totalPages = Math.max(1, Math.ceil((logs.data?.total ?? 0) / (logs.data?.pageSize ?? 20)))

  return (
    <div>
      {!embedded ? (
        <PageHeader
          title="Activity logs"
          subtitle={
            portfolio
              ? 'Portfolio-wide audit trail · demo data'
              : `${org.data?.abbreviation ?? 'SOE'} · org-scoped · as of ${DEMO_AS_OF_DATE}`
          }
        />
      ) : null}

      {summary.isLoading ? (
        <LoadingBlock label="Loading summary…" />
      ) : summary.data ? (
        <AdminMetricStrip
          items={[
            { label: 'Today', value: summary.data.today },
            { label: 'This week', value: summary.data.thisWeek },
            { label: 'Warnings', value: summary.data.warnings },
            { label: 'Security', value: summary.data.security },
            {
              label: 'Scope',
              value: portfolio ? 'Portfolio' : org.data?.abbreviation ?? 'SOE',
            },
          ]}
        />
      ) : null}

      <div className="my-4 flex flex-wrap gap-2">
        {QUICK_FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            className={quickTabClass(quick === f.id)}
            onClick={() => {
              setQuick(f.id)
              setPage(1)
            }}
          >
            {f.id === 'security' ? <Lock size={14} aria-hidden /> : null}
            {f.label}
          </button>
        ))}
      </div>

      <FilterBar
        className="mb-3"
        search={search}
        onSearchChange={(v) => {
          setSearch(v)
          setPage(1)
        }}
        searchPlaceholder="Action, detail, actor or record ID"
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <SelectField
          label="Level"
          value={level}
          onChange={(e) => {
            setLevel(e.target.value as LogLevel | '')
            setPage(1)
          }}
          options={[
            { value: '', label: 'All levels' },
            ...Object.entries(LEVEL_LABEL).map(([value, label]) => ({ value, label })),
          ]}
        />
        <SelectField
          label="Category"
          value={category}
          onChange={(e) => {
            setCategory(e.target.value as LogCategory | '')
            setPage(1)
          }}
          options={[
            { value: '', label: 'All categories' },
            ...Object.entries(CATEGORY_LABEL).map(([value, label]) => ({ value, label })),
          ]}
        />
        <SelectField
          label="Module"
          value={module}
          onChange={(e) => {
            setModule(e.target.value)
            setPage(1)
          }}
          options={[
            { value: '', label: 'All modules' },
            ...mockLogsService.getModuleOptions(),
          ]}
        />
      </div>

      {logs.isLoading ? <LoadingBlock label="Loading activity logs…" /> : null}
      {logs.isError ? <ErrorState title="Unable to load activity logs" /> : null}

      {logs.data ? (
        <AdminPanel
          title="Event log"
          subtitle={`${logs.data.total} event${logs.data.total === 1 ? '' : 's'} · newest first`}
          padding={false}
        >
          {logs.data.items.length ? (
            <>
              <DataTable
                data={logs.data.items}
                columns={columns}
                density="compact"
                showSearch={false}
              />
              <div className="flex items-center justify-between border-t border-soe-border px-4 py-3 text-xs text-soe-slate">
                <span>
                  Page {logs.data.page} of {totalPages} ({logs.data.total} total)
                </span>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    Previous
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="p-6">
              <EmptyState
                title="No log entries match filters"
                hint="Try clearing filters or selecting a different quick view."
              />
            </div>
          )}
        </AdminPanel>
      ) : null}
    </div>
  )
}

function dbOrgAbbrev(orgId: string) {
  const map: Record<string, string> = {
    'org-tusdec': 'TUSDEC',
    'org-psm': 'PSM',
    'org-nfc': 'NFC',
    'org-usc': 'USC',
    'org-peco': 'PECO',
    'org-pidc': 'PIDC',
  }
  return map[orgId] ?? orgId.replace('org-', '').toUpperCase()
}

export function SoeLogsPage() {
  return (
    <RequirePermission permission={PERMISSION.ORGANIZATION_READ}>
      <LogsAlertsNav />
      <LogsCentreWorkspace portal="soe" />
    </RequirePermission>
  )
}

export function MoipLogsWorkspace() {
  return (
    <RequirePermission permission={PERMISSION.PORTFOLIO_READ}>
      <LogsCentreWorkspace portal="moip" embedded />
    </RequirePermission>
  )
}
