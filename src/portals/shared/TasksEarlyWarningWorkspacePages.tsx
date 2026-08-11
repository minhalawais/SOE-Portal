import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { useMemo, useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AuditTimeline } from '@/components/timeline/AuditTimeline'
import { PageHeader } from '@/components/layout/PageHeader'
import { DataTable } from '@/components/tables/DataTable'
import { RequirePermission } from '@/app/router/guards'
import { Button } from '@/design-system/components/Button'
import { Card } from '@/design-system/components/Card'
import { Alert, EmptyState, ErrorState, LoadingBlock } from '@/design-system/components/Feedback'
import { KpiCard } from '@/design-system/components/KpiCard'
import { StatusBadge } from '@/design-system/components/StatusBadge'
import { SelectField, TextField, TextareaField } from '@/design-system/components/Fields'
import { Modal } from '@/design-system/components/Overlays'
import {
  ALERT_SEVERITY,
  ALERT_SEVERITY_LABEL,
  DEMO_AS_OF_DATE,
  EARLY_WARNING_RULE_META,
  ESCALATION_REASON_LABEL,
  ESCALATION_SEVERITY_LABEL,
  MODULE,
  type EarlyWarningRuleId,
  type RoleId,
  ROLE_LABEL,
  TASK_PRIORITY_LABEL,
  TASK_STATUS_LABEL,
} from '@/constants'
import { mockEarlyWarningService, mockOrganizationService } from '@/mock-services'
import type { AlertGroup, TaskRow } from '@/mock-services/earlyWarning.service'
import { PERMISSION } from '@/permissions'
import { useSessionStore } from '@/state/session'
import { useUiStore } from '@/state/ui'
import type { AlertItem, Escalation, NotificationItem, TimelineEvent } from '@/types/domain'
import { AppError, cn } from '@/utils'
import { REPORTING_MODULES } from '@/workflow/moduleCatalog'

type TaskPortal = 'soe' | 'moip' | 'secretary'
type AlertPortal = 'soe' | 'moip' | 'secretary' | 'minister'
type EscalationPortal = 'moip' | 'secretary'
type NotificationPortal = 'soe' | 'moip'

type TaskView = 'mine' | 'team' | 'overdue' | 'due_soon' | 'completed'

const linkClass = 'text-sm text-soe-blue underline'
const tabClass = (active: boolean) =>
  cn(
    'h-9 rounded-md px-3 text-sm font-medium',
    active ? 'bg-soe-navy text-white' : 'text-soe-slate hover:bg-[var(--color-pending-soft)]',
  )

function scopedOrg(portal: TaskPortal | AlertPortal | NotificationPortal, organizationId: string) {
  return portal === 'soe' ? organizationId : undefined
}

function moduleLabel(id?: string) {
  if (!id) return '—'
  return REPORTING_MODULES.find((m) => m.id === id)?.label ?? id
}

function taskListPath(portal: TaskPortal) {
  if (portal === 'moip') return '/moip/tasks'
  if (portal === 'secretary') return '/secretary/obligations'
  return '/soe/tasks'
}

function taskDetailPath(portal: TaskPortal, id: string) {
  if (portal === 'moip') return `/moip/tasks/${id}`
  if (portal === 'secretary') return `/secretary/obligations/${id}`
  return `/soe/tasks/${id}`
}

function alertListPath(portal: AlertPortal) {
  if (portal === 'moip') return '/moip/tasks'
  if (portal === 'secretary') return '/secretary/critical'
  if (portal === 'minister') return '/minister/alerts'
  return '/soe/alerts'
}

function alertDetailPath(portal: AlertPortal, id: string) {
  if (portal === 'moip') return `/moip/alerts/${id}`
  if (portal === 'secretary') return `/secretary/alerts/${id}`
  if (portal === 'minister') return `/minister/alerts/${id}`
  return `/soe/alerts/${id}`
}

function escalationDetailPath(portal: EscalationPortal, id: string) {
  return portal === 'moip' ? `/moip/escalations/${id}` : `/secretary/escalations/${id}`
}

function taskStatusBadge(displayStatus: string) {
  if (displayStatus === 'overdue') {
    return (
      <StatusBadge
        status="overdue"
        family="deadline"
        label={TASK_STATUS_LABEL.overdue}
      />
    )
  }
  if (displayStatus === 'done') {
    return (
      <StatusBadge status="complete" family="reporting" label={TASK_STATUS_LABEL.done} />
    )
  }
  if (displayStatus === 'in_progress') {
    return (
      <StatusBadge
        status="in_progress"
        family="reporting"
        label={TASK_STATUS_LABEL.in_progress}
      />
    )
  }
  if (displayStatus === 'cancelled') {
    return (
      <StatusBadge status="draft" family="approval" label={TASK_STATUS_LABEL.cancelled} />
    )
  }
  return <StatusBadge status="not_started" family="reporting" label={TASK_STATUS_LABEL.open} />
}

function alertSeverityBadge(severity: string) {
  if (severity === ALERT_SEVERITY.CRITICAL) {
    return (
      <StatusBadge
        status="critical"
        family="risk"
        label={ALERT_SEVERITY_LABEL.critical}
      />
    )
  }
  if (severity === ALERT_SEVERITY.ATTENTION) {
    return (
      <StatusBadge status="high" family="risk" label={ALERT_SEVERITY_LABEL.attention} />
    )
  }
  return (
    <StatusBadge status="low" family="risk" label={ALERT_SEVERITY_LABEL.information} />
  )
}

function priorityBadge(priority: string) {
  const status =
    priority === 'critical' ? 'critical' : priority === 'high' ? 'high' : 'low'
  return (
    <StatusBadge
      status={status}
      family="risk"
      label={TASK_PRIORITY_LABEL[priority] ?? priority}
    />
  )
}

function linkedRecordPath(task: { route?: string; linkedRecordType?: string; linkedRecordId?: string }) {
  if (task.route) return task.route
  if (task.linkedRecordType === 'submission') return '/soe/finance'
  if (task.linkedRecordType === 'clarification') return '/soe/clarifications'
  if (task.linkedRecordType === 'loan') return '/soe/finance/loans'
  if (task.linkedRecordType === 'compliance') return '/soe/accountability/compliance'
  if (task.linkedRecordType === 'audit_para' && task.linkedRecordId) {
    return `/soe/accountability/audit/${task.linkedRecordId}`
  }
  if (task.linkedRecordType === 'asset' && task.linkedRecordId) {
    return `/soe/assets/${task.linkedRecordId}`
  }
  if (task.linkedRecordType === 'board_member') return '/soe/people/board'
  return undefined
}

function DetailRow({ label, value }: { label: string; value?: ReactNode }) {
  return (
    <div className="flex justify-between gap-3 border-b border-soe-border py-1.5 text-sm">
      <dt className="text-soe-slate">{label}</dt>
      <dd className="text-right text-soe-navy">{value ?? '—'}</dd>
    </div>
  )
}

function DetailDl({ children }: { children: ReactNode }) {
  return <dl className="space-y-0">{children}</dl>
}

function useOrgAbbrevMap() {
  const orgs = useQuery({
    queryKey: ['organizations-abbrev'],
    queryFn: () => mockOrganizationService.getOrganizations({ pageSize: 200 }),
  })
  return useMemo(() => {
    const map = new Map<string, string>()
    for (const o of orgs.data?.items ?? []) map.set(o.id, o.abbreviation)
    return map
  }, [orgs.data?.items])
}

function portalSubtitle(portal: TaskPortal | AlertPortal) {
  if (portal === 'soe') return `Org-scoped · as of ${DEMO_AS_OF_DATE}`
  if (portal === 'moip') return 'Portfolio review queue · demo data'
  if (portal === 'secretary') return 'Critical escalations and obligations · demo data'
  return 'Material strategic alerts only · demo data'
}

export function TaskCentreWorkspace({
  portal,
  defaultView = 'mine',
  embedded = false,
}: {
  portal: TaskPortal
  defaultView?: TaskView
  embedded?: boolean
}) {
  const role = useSessionStore((s) => s.role)
  const organizationId = useSessionStore((s) => s.organizationId)
  const orgScope = scopedOrg(portal, organizationId)
  const orgAbbrev = useOrgAbbrevMap()

  const [view, setView] = useState<TaskView>(defaultView)
  const [status, setStatus] = useState('')
  const [priority, setPriority] = useState('')
  const [module, setModule] = useState('')
  const [search, setSearch] = useState('')

  const summary = useQuery({
    queryKey: ['task-queue-summary', portal, role, orgScope],
    queryFn: () => mockEarlyWarningService.getQueueSummary(role, orgScope),
  })

  const tasks = useQuery({
    queryKey: ['tasks', portal, role, orgScope, view, status, priority, module, search],
    queryFn: () =>
      mockEarlyWarningService.getTasks({
        role,
        organizationId: orgScope,
        view,
        status: status || undefined,
        priority: priority || undefined,
        module: module || undefined,
        search: search || undefined,
        pageSize: 100,
      }),
  })

  const views: Array<{ id: TaskView; label: string }> = [
    { id: 'mine', label: 'Mine' },
    { id: 'team', label: 'Team' },
    { id: 'overdue', label: 'Overdue' },
    { id: 'due_soon', label: 'Due soon' },
    { id: 'completed', label: 'Completed' },
  ]

  const showOrg = portal === 'moip' || portal === 'secretary'

  const columns = useMemo<ColumnDef<TaskRow, unknown>[]>(
    () => [
      {
        accessorKey: 'title',
        header: 'Title',
        cell: ({ row }) => (
          <Link className={linkClass} to={taskDetailPath(portal, row.original.id)}>
            {row.original.title}
          </Link>
        ),
      },
      {
        accessorKey: 'sourceModule',
        header: 'Module',
        cell: ({ getValue }) => moduleLabel(String(getValue() ?? '')),
      },
      ...(showOrg
        ? [
            {
              accessorKey: 'organizationId',
              header: 'Org',
              cell: ({ getValue }: { getValue: () => unknown }) =>
                orgAbbrev.get(String(getValue() ?? '')) ?? String(getValue() ?? '—'),
            } as ColumnDef<TaskRow, unknown>,
          ]
        : []),
      { accessorKey: 'dueDate', header: 'Due' },
      {
        id: 'displayStatus',
        header: 'Status',
        cell: ({ row }) => taskStatusBadge(row.original.displayStatus),
      },
      {
        accessorKey: 'priority',
        header: 'Priority',
        cell: ({ getValue }) => priorityBadge(String(getValue())),
      },
      {
        accessorKey: 'nextAction',
        header: 'Next action',
        cell: ({ getValue }) => (
          <span className="text-soe-slate">{String(getValue() ?? '—')}</span>
        ),
      },
      {
        id: 'link',
        header: '',
        cell: ({ row }) => {
          const path = linkedRecordPath(row.original)
          return path ? (
            <Link className="text-xs text-soe-blue underline" to={path}>
              Record
            </Link>
          ) : null
        },
      },
    ],
    [portal, showOrg, orgAbbrev],
  )

  const moduleOptions = useMemo(
    () =>
      Object.values(MODULE).map((id) => ({
        value: id,
        label: moduleLabel(id),
      })),
    [],
  )

  return (
    <div>
      {!embedded ? (
        <PageHeader
          title={portal === 'secretary' ? 'Overdue obligations' : 'Task centre'}
          subtitle={portalSubtitle(portal)}
        />
      ) : null}

      {summary.isLoading ? (
        <LoadingBlock label="Loading summary…" />
      ) : summary.data ? (
        <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard label="My open" value={String(summary.data.myOpenTasks)} />
          <KpiCard label="Overdue" value={String(summary.data.overdueTasks)} />
          <KpiCard label="Due soon (14d)" value={String(summary.data.dueSoonTasks)} />
          <KpiCard label="Critical alerts" value={String(summary.data.criticalAlerts)} />
        </div>
      ) : null}

      <div className="mb-3 flex flex-wrap gap-2">
        {views.map((v) => (
          <button key={v.id} type="button" className={tabClass(view === v.id)} onClick={() => setView(v.id)}>
            {v.label}
          </button>
        ))}
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SelectField
          label="Status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          options={[
            { value: '', label: 'All' },
            { value: 'open', label: TASK_STATUS_LABEL.open },
            { value: 'in_progress', label: TASK_STATUS_LABEL.in_progress },
            { value: 'done', label: TASK_STATUS_LABEL.done },
            { value: 'overdue', label: TASK_STATUS_LABEL.overdue },
          ]}
        />
        <SelectField
          label="Priority"
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
          options={[
            { value: '', label: 'All' },
            { value: 'normal', label: TASK_PRIORITY_LABEL.normal },
            { value: 'high', label: TASK_PRIORITY_LABEL.high },
            { value: 'critical', label: TASK_PRIORITY_LABEL.critical },
          ]}
        />
        <SelectField
          label="Module"
          value={module}
          onChange={(e) => setModule(e.target.value)}
          options={[{ value: '', label: 'All' }, ...moduleOptions]}
        />
        <TextField
          label="Search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Title or ID"
        />
      </div>

      <Card title="Tasks">
        {tasks.isError ? (
          <ErrorState title="Unable to load tasks" />
        ) : (
          <DataTable
            data={tasks.data?.items ?? []}
            columns={columns}
            isLoading={tasks.isLoading}
            density="compact"
            emptyTitle="No tasks match filters."
            showSearch={false}
          />
        )}
      </Card>
    </div>
  )
}

export function TaskDetailWorkspace({ portal }: { portal: TaskPortal }) {
  const { taskId } = useParams<{ taskId: string }>()
  const role = useSessionStore((s) => s.role)
  const pushToast = useUiStore((s) => s.pushToast)
  const queryClient = useQueryClient()
  const orgAbbrev = useOrgAbbrevMap()

  const [completeOpen, setCompleteOpen] = useState(false)
  const [note, setNote] = useState('')

  const task = useQuery({
    queryKey: ['task', taskId],
    queryFn: () => mockEarlyWarningService.getTask(taskId!),
    enabled: Boolean(taskId),
  })

  const sourceAlert = useQuery({
    queryKey: ['alert', task.data?.sourceAlertId],
    queryFn: () => mockEarlyWarningService.getAlert(task.data!.sourceAlertId!),
    enabled: Boolean(task.data?.sourceAlertId),
  })

  const startMutation = useMutation({
    mutationFn: () => mockEarlyWarningService.startTask(taskId!, role),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['task', taskId] })
      void queryClient.invalidateQueries({ queryKey: ['tasks'] })
      pushToast({ title: 'Task started.', tone: 'success' })
    },
    onError: (err: unknown) =>
      pushToast({ title: err instanceof AppError ? err.message : 'Failed', tone: 'critical' }),
  })

  const completeMutation = useMutation({
    mutationFn: () => mockEarlyWarningService.completeTask(taskId!, role, note || undefined),
    onSuccess: () => {
      setCompleteOpen(false)
      setNote('')
      void queryClient.invalidateQueries({ queryKey: ['task', taskId] })
      void queryClient.invalidateQueries({ queryKey: ['tasks'] })
      pushToast({ title: 'Task completed.', tone: 'success' })
    },
    onError: (err: unknown) =>
      pushToast({ title: err instanceof AppError ? err.message : 'Failed', tone: 'critical' }),
  })

  if (!taskId) return <ErrorState title="Task ID missing" />
  if (task.isLoading) return <LoadingBlock label="Loading task…" />
  if (task.isError || !task.data) return <ErrorState title="Task not found" />

  const t = task.data
  const recordPath = linkedRecordPath(t)
  const ruleMeta =
    sourceAlert.data?.ruleId &&
    EARLY_WARNING_RULE_META[sourceAlert.data.ruleId as EarlyWarningRuleId]

  return (
    <div>
      <PageHeader
        title={t.title}
        subtitle={`${TASK_STATUS_LABEL[t.displayStatus] ?? t.displayStatus} · due ${t.dueDate}`}
        actions={
          <Link className={linkClass} to={taskListPath(portal)}>
            Back to tasks
          </Link>
        }
      />

      <div className="mb-4 grid gap-4 lg:grid-cols-3">
        <Card title="Details" className="lg:col-span-2">
          <DetailDl>
            <DetailRow label="ID" value={t.id} />
            <DetailRow label="Module" value={moduleLabel(t.sourceModule)} />
            {t.organizationId ? (
              <DetailRow
                label="Organization"
                value={orgAbbrev.get(t.organizationId) ?? t.organizationId}
              />
            ) : null}
            <DetailRow label="Owner" value={ROLE_LABEL[t.ownerRole as RoleId] ?? t.ownerRole} />
            {t.assignedRole ? (
              <DetailRow
                label="Assigned"
                value={ROLE_LABEL[t.assignedRole as RoleId] ?? t.assignedRole}
              />
            ) : null}
            <DetailRow label="Priority" value={priorityBadge(t.priority)} />
            <DetailRow label="Next action" value={t.nextAction} />
            {recordPath ? (
              <DetailRow
                label="Linked record"
                value={
                  <Link className={linkClass} to={recordPath}>
                    Open record
                  </Link>
                }
              />
            ) : null}
            {t.sourceAlertId ? (
              <DetailRow
                label="Source alert"
                value={
                  <Link className={linkClass} to={alertDetailPath(portal as AlertPortal, t.sourceAlertId)}>
                    {t.sourceAlertId}
                  </Link>
                }
              />
            ) : null}
          </DetailDl>

          {t.status === 'open' ? (
            <div className="mt-4">
              <Button size="sm" onClick={() => startMutation.mutate()} disabled={startMutation.isPending}>
                Start
              </Button>
            </div>
          ) : null}
          {t.status === 'open' || t.status === 'in_progress' ? (
            <div className="mt-2">
              <Button size="sm" variant="secondary" onClick={() => setCompleteOpen(true)}>
                Complete
              </Button>
            </div>
          ) : null}
        </Card>

        {ruleMeta ? (
          <Card title="Rule metadata">
            <DetailDl>
              <DetailRow label="Rule" value={ruleMeta.label} />
              <DetailRow label="Threshold" value={ruleMeta.thresholdNote} />
              <DetailRow label="Severity" value={alertSeverityBadge(ruleMeta.severity)} />
            </DetailDl>
          </Card>
        ) : null}
      </div>

      <Card title="History" className="mb-4">
        {!t.history?.length ? (
          <EmptyState title="No history" />
        ) : (
          <ul className="space-y-1 text-sm">
            {t.history.map((h, i) => (
              <li key={`${h.at}-${i}`} className="border-b border-soe-border py-1.5">
                <span className="text-soe-ink">{h.note}</span>
                <span className="ml-2 text-xs text-soe-slate">
                  {h.at.slice(0, 16)}
                  {h.actorRole ? ` · ${ROLE_LABEL[h.actorRole as RoleId] ?? h.actorRole}` : ''}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Modal
        open={completeOpen}
        title="Complete task"
        onClose={() => setCompleteOpen(false)}
        footer={
          <>
            <Button variant="tertiary" onClick={() => setCompleteOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => completeMutation.mutate()} disabled={completeMutation.isPending}>
              Complete
            </Button>
          </>
        }
      >
        <TextareaField
          label="Completion note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
        />
      </Modal>
    </div>
  )
}

export function NotificationCentreWorkspace({
  portal,
  embedded = false,
}: {
  portal: NotificationPortal
  embedded?: boolean
}) {
  const role = useSessionStore((s) => s.role)
  const organizationId = useSessionStore((s) => s.organizationId)
  const orgScope = scopedOrg(portal, organizationId)
  const pushToast = useUiStore((s) => s.pushToast)
  const queryClient = useQueryClient()

  const notifications = useQuery({
    queryKey: ['notifications', portal, role, orgScope],
    queryFn: () =>
      mockEarlyWarningService.getNotifications({
        role,
        organizationId: orgScope,
        pageSize: 100,
      }),
  })

  const markRead = useMutation({
    mutationFn: (id: string) => mockEarlyWarningService.markNotificationRead(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications'] })
      pushToast({ title: 'Marked read.', tone: 'success' })
    },
    onError: (err: unknown) =>
      pushToast({ title: err instanceof AppError ? err.message : 'Failed', tone: 'critical' }),
  })

  const columns = useMemo<ColumnDef<NotificationItem, unknown>[]>(
    () => [
      {
        accessorKey: 'title',
        header: 'Title',
        cell: ({ row }) => (
          <div>
            <p className="font-medium">{row.original.title}</p>
            <p className="text-xs text-soe-slate">{row.original.body}</p>
          </div>
        ),
      },
      {
        accessorKey: 'createdAt',
        header: 'When',
        cell: ({ getValue }) => String(getValue()).slice(0, 16),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ getValue }) => (
          <StatusBadge
            status={String(getValue())}
            family="evidence"
            label={String(getValue()) === 'unread' ? 'Unread' : 'Read'}
          />
        ),
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <div className="flex gap-2">
            <Link className="text-xs text-soe-blue underline" to={row.original.linkRoute}>
              Open
            </Link>
            {row.original.status === 'unread' ? (
              <button
                type="button"
                className="text-xs text-soe-blue underline"
                onClick={() => markRead.mutate(row.original.id)}
              >
                Mark read
              </button>
            ) : null}
          </div>
        ),
      },
    ],
    [markRead],
  )

  return (
    <div>
      {!embedded ? <PageHeader title="Notifications" subtitle={portalSubtitle(portal)} /> : null}
      <Card title="Inbox">
        {notifications.isError ? (
          <ErrorState title="Unable to load notifications" />
        ) : !notifications.isLoading && !(notifications.data?.items.length ?? 0) ? (
          <EmptyState title="No notifications" hint="Workflow events appear here when triggered." />
        ) : (
          <DataTable
            data={notifications.data?.items ?? []}
            columns={columns}
            isLoading={notifications.isLoading}
            density="compact"
            showSearch={false}
            emptyTitle="No notifications."
          />
        )}
      </Card>
    </div>
  )
}

export function AlertCentreWorkspace({
  portal,
  embedded = false,
}: {
  portal: AlertPortal
  embedded?: boolean
}) {
  const role = useSessionStore((s) => s.role)
  const organizationId = useSessionStore((s) => s.organizationId)
  const orgScope = portal === 'soe' ? organizationId : undefined
  const orgAbbrev = useOrgAbbrevMap()

  const [severity, setSeverity] = useState('')
  const [status, setStatus] = useState('open')
  const [groupKey, setGroupKey] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const groups = useQuery({
    queryKey: ['alert-groups', portal, role, orgScope],
    queryFn: () => mockEarlyWarningService.getAlertGroups(role, orgScope),
  })

  const alerts = useQuery({
    queryKey: ['alerts', portal, role, orgScope, severity, status, groupKey, search],
    queryFn: async () => {
      const result = await mockEarlyWarningService.getAlerts({
        role,
        organizationId: orgScope,
        severity: severity || undefined,
        status: status || undefined,
        search: search || undefined,
        pageSize: 200,
      })
      if (groupKey) {
        return {
          ...result,
          items: result.items.filter((a) => (a.groupKey ?? a.id) === groupKey),
        }
      }
      return result
    },
  })

  const columns = useMemo<ColumnDef<AlertItem, unknown>[]>(
    () => [
      {
        accessorKey: 'title',
        header: 'Alert',
        cell: ({ row }) => (
          <Link className={linkClass} to={alertDetailPath(portal, row.original.id)}>
            {row.original.title}
          </Link>
        ),
      },
      {
        id: 'severity',
        header: 'Severity',
        cell: ({ row }) => alertSeverityBadge(row.original.severity),
      },
      {
        accessorKey: 'ruleLabel',
        header: 'Rule',
        cell: ({ row }) => (
          <div>
            <span>{row.original.ruleLabel ?? row.original.ruleId ?? '—'}</span>
            {row.original.isPrototypeRule !== false ? (
              <span className="ml-1 text-xs text-soe-slate">· Prototype rule</span>
            ) : null}
          </div>
        ),
      },
      ...(portal !== 'soe'
        ? [
            {
              accessorKey: 'organizationId',
              header: 'Org',
              cell: ({ getValue }: { getValue: () => unknown }) =>
                orgAbbrev.get(String(getValue() ?? '')) ?? String(getValue() ?? '—'),
            } as ColumnDef<AlertItem, unknown>,
          ]
        : []),
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ getValue }) => (
          <StatusBadge status={String(getValue())} family="approval" label={String(getValue())} />
        ),
      },
      {
        accessorKey: 'generatedAt',
        header: 'Generated',
        cell: ({ getValue }) => String(getValue() ?? '').slice(0, 10),
      },
    ],
    [portal, orgAbbrev],
  )

  return (
    <div>
      {!embedded ? <PageHeader title="Alert centre" subtitle={portalSubtitle(portal)} /> : null}

      {groups.isLoading ? (
        <LoadingBlock label="Loading groups…" />
      ) : groups.data?.length ? (
        <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {groups.data.map((g: AlertGroup) => (
            <button
              key={g.groupKey}
              type="button"
              className={cn(
                'rounded-md border p-4 text-left',
                groupKey === g.groupKey
                  ? 'border-soe-blue bg-[var(--color-info-soft)]'
                  : 'border-soe-border bg-white',
              )}
              onClick={() => setGroupKey(groupKey === g.groupKey ? null : g.groupKey)}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-soe-ink">{g.title}</span>
                {alertSeverityBadge(g.severity)}
              </div>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-soe-navy">{g.count}</p>
              {g.sampleExplanation ? (
                <p className="mt-1 line-clamp-2 text-xs text-soe-slate">{g.sampleExplanation}</p>
              ) : null}
            </button>
          ))}
        </div>
      ) : null}

      <div className="mb-4">
        <div>
          <div className="mb-3 grid gap-3 sm:grid-cols-3">
            <SelectField
              label="Severity"
              value={severity}
              onChange={(e) => setSeverity(e.target.value)}
              options={[
                { value: '', label: 'All' },
                { value: ALERT_SEVERITY.CRITICAL, label: ALERT_SEVERITY_LABEL.critical },
                { value: ALERT_SEVERITY.ATTENTION, label: ALERT_SEVERITY_LABEL.attention },
                { value: ALERT_SEVERITY.INFORMATION, label: ALERT_SEVERITY_LABEL.information },
              ]}
            />
            <SelectField
              label="Status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              options={[
                { value: '', label: 'All' },
                { value: 'open', label: 'Open' },
                { value: 'acknowledged', label: 'Acknowledged' },
                { value: 'resolved', label: 'Resolved' },
              ]}
            />
            <TextField
              label="Search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Alert title"
            />
          </div>

          {groupKey ? (
            <Alert tone="info" title={`Filtered to group: ${groupKey}`} className="mb-3">
              <button type="button" className="text-xs underline" onClick={() => setGroupKey(null)}>
                Clear filter
              </button>
            </Alert>
          ) : null}

          <Card title="Alerts">
            {alerts.isError ? (
              <ErrorState title="Unable to load alerts" />
            ) : (
              <DataTable
                data={alerts.data?.items ?? []}
                columns={columns}
                isLoading={alerts.isLoading}
                density="compact"
                emptyTitle="No alerts match filters."
                showSearch={false}
              />
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}

export function AlertDetailWorkspace({ portal }: { portal: AlertPortal }) {
  const { alertId } = useParams<{ alertId: string }>()
  const role = useSessionStore((s) => s.role)
  const pushToast = useUiStore((s) => s.pushToast)
  const queryClient = useQueryClient()
  const orgAbbrev = useOrgAbbrevMap()

  const [resolveOpen, setResolveOpen] = useState(false)
  const [note, setNote] = useState('')

  const alert = useQuery({
    queryKey: ['alert', alertId],
    queryFn: () => mockEarlyWarningService.getAlert(alertId!),
    enabled: Boolean(alertId),
  })

  const ruleMeta =
    alert.data?.ruleId && EARLY_WARNING_RULE_META[alert.data.ruleId as EarlyWarningRuleId]

  const ackMutation = useMutation({
    mutationFn: () => mockEarlyWarningService.acknowledgeAlert(alertId!, role),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['alert', alertId] })
      void queryClient.invalidateQueries({ queryKey: ['alerts'] })
      pushToast({ title: 'Alert acknowledged.', tone: 'success' })
    },
    onError: (err: unknown) =>
      pushToast({ title: err instanceof AppError ? err.message : 'Failed', tone: 'critical' }),
  })

  const resolveMutation = useMutation({
    mutationFn: () => mockEarlyWarningService.resolveAlert(alertId!, role, note || undefined),
    onSuccess: () => {
      setResolveOpen(false)
      setNote('')
      void queryClient.invalidateQueries({ queryKey: ['alert', alertId] })
      void queryClient.invalidateQueries({ queryKey: ['alerts'] })
      pushToast({ title: 'Alert resolved.', tone: 'success' })
    },
    onError: (err: unknown) =>
      pushToast({ title: err instanceof AppError ? err.message : 'Failed', tone: 'critical' }),
  })

  if (!alertId) return <ErrorState title="Alert ID missing" />
  if (alert.isLoading) return <LoadingBlock label="Loading alert…" />
  if (alert.isError || !alert.data) return <ErrorState title="Alert not found" />

  const a = alert.data
  const recordPath = a.route ?? linkedRecordPath(a)

  return (
    <div>
      <PageHeader
        title={a.title}
        subtitle={`${ALERT_SEVERITY_LABEL[a.severity as keyof typeof ALERT_SEVERITY_LABEL] ?? a.severity} · ${a.status}`}
        actions={
          <Link className={linkClass} to={alertListPath(portal)}>
            Back to alerts
          </Link>
        }
      />

      <div className="mb-4 grid gap-4 lg:grid-cols-3">
        <Card title="Explanation" className="lg:col-span-2">
          <p className="text-sm text-soe-ink">{a.explanation ?? 'No explanation recorded.'}</p>
          {a.recommendedAction ? (
            <div className="mt-3 border-t border-soe-border pt-3">
              <p className="text-xs font-semibold uppercase text-soe-slate">Recommended action</p>
              <p className="mt-1 text-sm">{a.recommendedAction}</p>
            </div>
          ) : null}
        </Card>

        {ruleMeta ? (
          <Card title="Rule metadata">
            <DetailDl>
              <DetailRow label="Rule" value={ruleMeta.label} />
              <DetailRow label="Threshold" value={ruleMeta.thresholdNote} />
              <DetailRow label="Severity" value={alertSeverityBadge(ruleMeta.severity)} />
              <DetailRow label="Type" value="Prototype rule" />
            </DetailDl>
          </Card>
        ) : null}
      </div>

      <Card title="Details" className="mb-4">
        <DetailDl>
          <DetailRow label="ID" value={a.id} />
          {a.organizationId ? (
            <DetailRow
              label="Organization"
              value={orgAbbrev.get(a.organizationId) ?? a.organizationId}
            />
          ) : null}
          <DetailRow label="Generated" value={a.generatedAt?.slice(0, 16)} />
          {recordPath ? (
            <DetailRow
              label="Linked record"
              value={
                <Link className={linkClass} to={recordPath}>
                  Open record
                </Link>
              }
            />
          ) : null}
          {a.linkedTaskId ? (
            <DetailRow
              label="Linked task"
              value={
                <Link
                  className={linkClass}
                  to={
                    portal === 'minister'
                      ? `/moip/tasks/${a.linkedTaskId}`
                      : taskDetailPath(portal as TaskPortal, a.linkedTaskId)
                  }
                >
                  {a.linkedTaskId}
                </Link>
              }
            />
          ) : null}
        </DetailDl>

        {a.status === 'open' ? (
          <div className="mt-4 flex gap-2">
            <Button size="sm" variant="secondary" onClick={() => ackMutation.mutate()}>
              Acknowledge
            </Button>
            <Button size="sm" onClick={() => setResolveOpen(true)}>
              Resolve
            </Button>
          </div>
        ) : null}
      </Card>

      <Modal
        open={resolveOpen}
        title="Resolve alert"
        onClose={() => setResolveOpen(false)}
        footer={
          <>
            <Button variant="tertiary" onClick={() => setResolveOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => resolveMutation.mutate()} disabled={resolveMutation.isPending}>
              Resolve
            </Button>
          </>
        }
      >
        <TextareaField
          label="Resolution note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
        />
      </Modal>
    </div>
  )
}

export function EscalationCentreWorkspace({
  portal,
  embedded = false,
}: {
  portal: EscalationPortal
  embedded?: boolean
}) {
  const role = useSessionStore((s) => s.role)
  const orgAbbrev = useOrgAbbrevMap()
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const escalations = useQuery({
    queryKey: ['escalations', portal, role],
    queryFn: () => mockEarlyWarningService.getEscalations({ role, status: 'open' }),
  })

  const columns = useMemo<ColumnDef<Escalation, unknown>[]>(
    () => [
      {
        accessorKey: 'id',
        header: 'ID',
        cell: ({ row }) => (
          <Link className={linkClass} to={escalationDetailPath(portal, row.original.id)}>
            {row.original.id}
          </Link>
        ),
      },
      {
        accessorKey: 'organizationId',
        header: 'Org',
        cell: ({ getValue }) => orgAbbrev.get(String(getValue())) ?? String(getValue()),
      },
      {
        accessorKey: 'escalationLevel',
        header: 'Level',
        cell: ({ getValue }) => String(getValue() ?? '—'),
      },
      {
        accessorKey: 'severity',
        header: 'Severity',
        cell: ({ getValue }) => (
          <StatusBadge
            status={String(getValue())}
            family="risk"
            label={ESCALATION_SEVERITY_LABEL[String(getValue())] ?? String(getValue())}
          />
        ),
      },
      {
        accessorKey: 'reasonCode',
        header: 'Reason',
        cell: ({ getValue }) => ESCALATION_REASON_LABEL[String(getValue())] ?? String(getValue()),
      },
      { accessorKey: 'dueDate', header: 'Due' },
      {
        id: 'origins',
        header: 'Origins',
        cell: ({ row }) => (
          <div className="flex flex-col gap-0.5 text-xs">
            {row.original.originatingAlertId ? (
              <Link className={linkClass} to={alertDetailPath(portal, row.original.originatingAlertId)}>
                Alert {row.original.originatingAlertId}
              </Link>
            ) : null}
            {row.original.originatingTaskId ? (
              <Link className={linkClass} to={taskDetailPath(portal, row.original.originatingTaskId)}>
                Task {row.original.originatingTaskId}
              </Link>
            ) : null}
          </div>
        ),
      },
      {
        id: 'expand',
        header: '',
        cell: ({ row }) => (
          <button
            type="button"
            className="text-xs text-soe-blue underline"
            onClick={() =>
              setExpandedId(expandedId === row.original.id ? null : row.original.id)
            }
          >
            {expandedId === row.original.id ? 'Hide' : 'History'}
          </button>
        ),
      },
    ],
    [portal, orgAbbrev, expandedId],
  )

  const expanded = escalations.data?.find((e) => e.id === expandedId)

  return (
    <div>
      {!embedded ? <PageHeader title="Escalations" subtitle={portalSubtitle(portal)} /> : null}
      <Card title="Open escalations">
        {escalations.isError ? (
          <ErrorState title="Unable to load escalations" />
        ) : (
          <>
            <DataTable
              data={escalations.data ?? []}
              columns={columns}
              isLoading={escalations.isLoading}
              density="compact"
              showSearch={false}
              emptyTitle="No open escalations."
            />
            {expanded ? (
              <div className="mt-4 border-t border-soe-border pt-3">
                <p className="mb-2 text-xs font-semibold uppercase text-soe-slate">
                  History · {expanded.id}
                </p>
                {expanded.historyNote ? (
                  <p className="mb-2 text-sm text-soe-slate">{expanded.historyNote}</p>
                ) : null}
                {expanded.history?.length ? (
                  <ul className="space-y-1 text-sm">
                    {expanded.history.map((h, i) => (
                      <li key={`${h.at}-${i}`} className="text-soe-slate">
                        {h.at.slice(0, 16)} · {h.note}
                        {h.actor ? ` · ${h.actor}` : ''}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <EmptyState title="No history entries" />
                )}
              </div>
            ) : null}
          </>
        )}
      </Card>
    </div>
  )
}

function escalationToTimeline(e: Escalation): TimelineEvent[] {
  const events: TimelineEvent[] = [
    {
      id: `${e.id}-created`,
      organizationId: e.organizationId,
      occurredAt: e.createdAt,
      title: `Escalation created · ${ESCALATION_REASON_LABEL[e.reasonCode] ?? e.reasonCode}`,
      category: 'escalation',
      actorRole: e.createdByRole,
      status: e.status,
      comment: e.reason,
    },
  ]
  for (const [i, h] of (e.history ?? []).entries()) {
    events.push({
      id: `${e.id}-h-${i}`,
      organizationId: e.organizationId,
      occurredAt: h.at,
      title: h.note,
      category: 'escalation',
      actorRole: h.actor,
      comment: h.note,
    })
  }
  return events.sort((a, b) => a.occurredAt.localeCompare(b.occurredAt))
}

export function EscalationDetailWorkspace({ portal }: { portal: EscalationPortal }) {
  const { id } = useParams<{ id: string }>()
  const orgAbbrev = useOrgAbbrevMap()

  const escalation = useQuery({
    queryKey: ['escalation', id],
    queryFn: () => mockEarlyWarningService.getEscalation(id!),
    enabled: Boolean(id),
  })

  if (!id) return <ErrorState title="Escalation ID missing" />
  if (escalation.isLoading) return <LoadingBlock label="Loading escalation…" />
  if (escalation.isError || !escalation.data) return <ErrorState title="Escalation not found" />

  const e = escalation.data
  const timeline = escalationToTimeline(e)

  return (
    <div>
      <PageHeader
        title={`Escalation ${e.id}`}
        subtitle={`Level ${e.escalationLevel ?? '—'} · ${ESCALATION_SEVERITY_LABEL[e.severity]}`}
        actions={
          <Link className={linkClass} to={portal === 'moip' ? '/moip/tasks' : '/secretary/critical'}>
            Back
          </Link>
        }
      />

      <Card title="Details" className="mb-4">
        <DetailDl>
          <DetailRow
            label="Organization"
            value={orgAbbrev.get(e.organizationId) ?? e.organizationId}
          />
          <DetailRow
            label="Reason"
            value={ESCALATION_REASON_LABEL[e.reasonCode] ?? e.reasonCode}
          />
          <DetailRow label="Severity" value={ESCALATION_SEVERITY_LABEL[e.severity]} />
          <DetailRow label="Level" value={e.escalationLevel} />
          <DetailRow label="Owner" value={ROLE_LABEL[e.ownerRole]} />
          <DetailRow label="Due" value={e.dueDate} />
          <DetailRow label="Status" value={e.status} />
          {e.originatingAlertId ? (
            <DetailRow
              label="Originating alert"
              value={
                <Link className={linkClass} to={alertDetailPath(portal, e.originatingAlertId)}>
                  {e.originatingAlertId}
                </Link>
              }
            />
          ) : null}
          {e.originatingTaskId ? (
            <DetailRow
              label="Originating task"
              value={
                <Link className={linkClass} to={taskDetailPath(portal, e.originatingTaskId)}>
                  {e.originatingTaskId}
                </Link>
              }
            />
          ) : null}
        </DetailDl>
      </Card>

      <Card title="Timeline">
        <AuditTimeline events={timeline} emptyTitle="No escalation history." />
      </Card>
    </div>
  )
}

function SoeTaskNav() {
  return (
    <nav className="mb-4 flex flex-wrap gap-x-3 gap-y-1 text-xs" aria-label="Task sections">
      <Link className={linkClass} to="/soe/tasks">
        Tasks
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

export function SoeTasksCentrePage() {
  return (
    <RequirePermission permission={PERMISSION.ORGANIZATION_READ}>
      <SoeTaskNav />
      <TaskCentreWorkspace portal="soe" />
    </RequirePermission>
  )
}

export function SoeNotificationsPage() {
  return (
    <RequirePermission permission={PERMISSION.ORGANIZATION_READ}>
      <SoeTaskNav />
      <NotificationCentreWorkspace portal="soe" />
    </RequirePermission>
  )
}

export function SoeAlertsPage() {
  return (
    <RequirePermission permission={PERMISSION.ORGANIZATION_READ}>
      <SoeTaskNav />
      <AlertCentreWorkspace portal="soe" />
    </RequirePermission>
  )
}

type MoipEwTab = 'tasks' | 'alerts' | 'escalations' | 'notifications'

export function MoipTasksEarlyWarningPage() {
  const [tab, setTab] = useState<MoipEwTab>('tasks')
  const tabs: Array<{ id: MoipEwTab; label: string }> = [
    { id: 'tasks', label: 'Tasks' },
    { id: 'alerts', label: 'Alerts' },
    { id: 'escalations', label: 'Escalations' },
    { id: 'notifications', label: 'Notifications' },
  ]

  return (
    <RequirePermission permission={PERMISSION.PORTFOLIO_READ}>
      <PageHeader title="Early warning" subtitle="Tasks, alerts, escalations · portfolio scope" />
      <div className="mb-4 flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button key={t.id} type="button" className={tabClass(tab === t.id)} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'tasks' ? <TaskCentreWorkspace portal="moip" defaultView="team" embedded /> : null}
      {tab === 'alerts' ? <AlertCentreWorkspace portal="moip" embedded /> : null}
      {tab === 'escalations' ? <EscalationCentreWorkspace portal="moip" embedded /> : null}
      {tab === 'notifications' ? <NotificationCentreWorkspace portal="moip" embedded /> : null}
    </RequirePermission>
  )
}

export function SecretaryCriticalPage() {
  return (
    <RequirePermission permission={PERMISSION.EXECUTIVE_DASHBOARD_READ}>
      <PageHeader title="Critical matters" subtitle={portalSubtitle('secretary')} />
      <div className="space-y-6">
        <AlertCentreWorkspace portal="secretary" embedded />
        <EscalationCentreWorkspace portal="secretary" embedded />
      </div>
    </RequirePermission>
  )
}

export function SecretaryObligationsPage() {
  return (
    <RequirePermission permission={PERMISSION.EXECUTIVE_DASHBOARD_READ}>
      <TaskCentreWorkspace portal="secretary" defaultView="overdue" />
    </RequirePermission>
  )
}

export function MinisterAlertsPage() {
  return (
    <RequirePermission permission={PERMISSION.EXECUTIVE_DASHBOARD_READ}>
      <AlertCentreWorkspace portal="minister" />
    </RequirePermission>
  )
}
