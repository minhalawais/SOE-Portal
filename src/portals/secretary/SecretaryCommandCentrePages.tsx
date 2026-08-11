/**
 * Secretary Command Centre — Phase 15.
 * Exception-first: "What requires my attention?"
 * Governance actions only (acknowledge / assign / escalate). No SOE source edits.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { DataTable } from '@/components/tables/DataTable'
import { Button } from '@/design-system/components/Button'
import { Card } from '@/design-system/components/Card'
import { SelectField, TextField } from '@/design-system/components/Fields'
import { EmptyState, ErrorState, LoadingBlock } from '@/design-system/components/Feedback'
import { KpiValue } from '@/design-system/components/KpiCard'
import { ConfirmDialog } from '@/design-system/components/Overlays'
import { StatusBadge } from '@/design-system/components/StatusBadge'
import { RequirePermission } from '@/app/router/guards'
import {
  ALERT_SEVERITY_LABEL,
  PENDING_DECISION_STATUS_LABEL,
  ROLE,
  ROLE_LABEL,
  SUBMISSION_STATUS_LABEL,
  type SubmissionStatus,
} from '@/constants'
import { mockSecretaryPortalService } from '@/mock-services'
import type {
  SecretaryAuditItem,
  SecretaryBoardItem,
  SecretaryComplianceDelay,
  SecretaryFinancialConcern,
  SecretaryLitigationItem,
  SecretaryObligationItem,
  SecretaryPriorityItem,
  SecretarySubmissionRow,
} from '@/mock-services/secretaryPortal.service'
import { hasPermission, PERMISSION } from '@/permissions'
import { useSessionStore } from '@/state/session'
import { useUiStore } from '@/state/ui'
import type { Escalation, PendingDecision } from '@/types/domain'
import { AppError, cn, formatCurrencyPkr } from '@/utils'
import {
  EscalationCentreWorkspace,
  TaskCentreWorkspace,
} from '@/portals/shared/TasksEarlyWarningWorkspacePages'
import { BoardWorkspace, GovernanceCalendarWorkspace } from '@/portals/shared/PeopleGovernanceWorkspacePages'

const linkClass = 'text-sm text-soe-blue underline'

function KpiLink({
  to,
  label,
  value,
  period,
}: {
  to: string
  label: string
  value: string
  period?: string
}) {
  return (
    <Link to={to} className="block">
      <KpiValue label={label} value={value} period={period} className="p-3 [&_p:nth-child(2)]:text-xl" />
    </Link>
  )
}

function SeverityBadge({ severity }: { severity: string }) {
  return (
    <StatusBadge
      status={severity === 'attention' ? 'warning' : severity}
      family="risk"
      label={ALERT_SEVERITY_LABEL[severity as keyof typeof ALERT_SEVERITY_LABEL] ?? severity}
    />
  )
}

function PriorityTable({
  items,
  emptyTitle = 'No items requiring attention',
}: {
  items: SecretaryPriorityItem[]
  emptyTitle?: string
}) {
  const columns = useMemo<ColumnDef<SecretaryPriorityItem, unknown>[]>(
    () => [
      {
        accessorKey: 'organizationLabel',
        header: 'SOE',
        cell: ({ getValue }) => <span className="font-medium">{String(getValue())}</span>,
      },
      { accessorKey: 'issue', header: 'Issue' },
      {
        accessorKey: 'severity',
        header: 'Severity',
        cell: ({ getValue }) => <SeverityBadge severity={String(getValue())} />,
      },
      { accessorKey: 'ageDays', header: 'Age (d)' },
      {
        accessorKey: 'dueDate',
        header: 'Due',
        cell: ({ getValue }) => String(getValue() ?? '—'),
      },
      { accessorKey: 'owner', header: 'Owner' },
      { accessorKey: 'nextAction', header: 'Next action' },
      {
        id: 'open',
        header: '',
        cell: ({ row }) => (
          <Link className={linkClass} to={row.original.route}>
            Open
          </Link>
        ),
      },
    ],
    [],
  )
  if (!items.length) return <EmptyState title={emptyTitle} />
  return <DataTable data={items} columns={columns} density="compact" showSearch={false} />
}

export function SecretaryCommandCentrePage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const severity = searchParams.get('severity') ?? ''
  const category = searchParams.get('category') ?? ''
  const search = searchParams.get('q') ?? ''

  const summary = useQuery({
    queryKey: ['secretary-command-summary'],
    queryFn: () => mockSecretaryPortalService.getCommandSummary(),
  })
  const queue = useQuery({
    queryKey: ['secretary-priority-queue', severity, category, search],
    queryFn: () =>
      mockSecretaryPortalService.getPriorityQueue({
        pageSize: 25,
        severity: severity || undefined,
        category: category || undefined,
        search: search || undefined,
      }),
  })
  const obligations = useQuery({
    queryKey: ['secretary-obligations-home'],
    queryFn: () => mockSecretaryPortalService.getUpcomingObligations(90),
  })

  if (summary.isLoading || queue.isLoading) {
    return <LoadingBlock label="Loading command centre…" />
  }
  if (summary.isError || !summary.data || queue.isError || !queue.data) {
    return <ErrorState title="Unable to load command centre" />
  }

  const s = summary.data
  const obl = obligations.data ?? []
  const obl30 = obl.filter((o) => o.window === '7' || o.window === '30').slice(0, 8)
  const obl60 = obl.filter((o) => o.window === '60').slice(0, 5)
  const obl90 = obl.filter((o) => o.window === '90').slice(0, 5)

  return (
    <RequirePermission permission={PERMISSION.EXECUTIVE_DASHBOARD_READ}>
      <div>
        <PageHeader
          title="Secretary Command Centre"
          subtitle={`What requires my attention? · Dummy data · as of ${s.asOf}`}
        />

        <div className="mb-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <KpiLink to="/secretary/critical" label="Critical" value={String(s.critical)} />
          <KpiLink
            to="/secretary/critical?severity=attention"
            label="Attention"
            value={String(s.attention)}
          />
          <KpiLink
            to="/secretary/decisions"
            label="Pending decisions"
            value={String(s.pendingDecision)}
          />
          <KpiLink to="/secretary/compliance" label="Overdue" value={String(s.overdue)} />
          <KpiLink to="/secretary/escalations" label="Escalated" value={String(s.escalated)} />
        </div>

        <Card
          title="Priority queue"
          className="mb-4"
          actions={
            <p className="text-xs text-soe-slate">
              Provisional ranking: severity then age
            </p>
          }
        >
          <div className="mb-3 grid gap-2 sm:grid-cols-3">
            <SelectField
              label="Severity"
              value={severity}
              onChange={(e) => {
                const next = new URLSearchParams(searchParams)
                if (e.target.value) next.set('severity', e.target.value)
                else next.delete('severity')
                setSearchParams(next)
              }}
              options={[
                { value: '', label: 'All' },
                { value: 'critical', label: 'Critical' },
                { value: 'attention', label: 'Attention' },
              ]}
            />
            <SelectField
              label="Category"
              value={category}
              onChange={(e) => {
                const next = new URLSearchParams(searchParams)
                if (e.target.value) next.set('category', e.target.value)
                else next.delete('category')
                setSearchParams(next)
              }}
              options={[
                { value: '', label: 'All' },
                { value: 'critical_matter', label: 'Critical matter' },
                { value: 'pending_decision', label: 'Pending decision' },
                { value: 'escalation', label: 'Escalation' },
              ]}
            />
            <TextField
              label="Search"
              value={search}
              onChange={(e) => {
                const next = new URLSearchParams(searchParams)
                if (e.target.value) next.set('q', e.target.value)
                else next.delete('q')
                setSearchParams(next)
              }}
              placeholder="SOE or issue"
            />
          </div>
          <PriorityTable
            items={queue.data.items}
            emptyTitle="No critical matters"
          />
        </Card>

        <div className="grid gap-4 lg:grid-cols-3">
          <Card title="Due in 30 days">
            {obl30.length ? (
              <ul className="space-y-2 text-sm">
                {obl30.map((o) => (
                  <li key={o.id} className="flex justify-between gap-2 border-b border-soe-border pb-2">
                    <span>
                      <span className="font-medium">{o.organizationLabel}</span>
                      {' · '}
                      {o.obligationType}
                    </span>
                    <Link className={linkClass} to={o.route}>
                      {o.dueDate}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState title="No obligations in 30 days" />
            )}
            <Link className={cn(linkClass, 'mt-3 inline-block')} to="/secretary/obligations">
              All obligations
            </Link>
          </Card>
          <Card title="Due in 60 days">
            {obl60.length ? (
              <ul className="space-y-2 text-sm">
                {obl60.map((o) => (
                  <li key={o.id} className="border-b border-soe-border pb-2">
                    <span className="font-medium">{o.organizationLabel}</span> · {o.obligationType} ·{' '}
                    {o.dueDate}
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState title="None in 31–60 days" />
            )}
          </Card>
          <Card title="Due in 90 days">
            {obl90.length ? (
              <ul className="space-y-2 text-sm">
                {obl90.map((o) => (
                  <li key={o.id} className="border-b border-soe-border pb-2">
                    <span className="font-medium">{o.organizationLabel}</span> · {o.obligationType} ·{' '}
                    {o.dueDate}
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState title="None in 61–90 days" />
            )}
          </Card>
        </div>
      </div>
    </RequirePermission>
  )
}

export function SecretaryCriticalMattersPage() {
  const [searchParams] = useSearchParams()
  const severityFilter = searchParams.get('severity') ?? 'critical'
  const critical = useQuery({
    queryKey: ['secretary-critical', severityFilter],
    queryFn: () =>
      severityFilter === 'critical'
        ? mockSecretaryPortalService.getCriticalMatters()
        : mockSecretaryPortalService
            .getPriorityQueue({ severity: severityFilter, pageSize: 50 })
            .then((p) => p.items),
  })

  return (
    <RequirePermission permission={PERMISSION.EXECUTIVE_DASHBOARD_READ}>
      <div>
        <PageHeader
          title="Critical matters"
          subtitle="Ranked exceptions from alerts, escalations and pending decisions"
        />
        {critical.isLoading ? <LoadingBlock label="Loading critical matters…" /> : null}
        {critical.isError ? <ErrorState title="Unable to load critical matters" /> : null}
        {critical.data ? (
          <Card title={severityFilter === 'critical' ? 'Critical queue' : 'Attention queue'} className="mb-4">
            <PriorityTable
              items={critical.data}
              emptyTitle={
                severityFilter === 'critical' ? 'No critical matters' : 'No attention matters'
              }
            />
          </Card>
        ) : null}
        <EscalationCentreWorkspace portal="secretary" embedded />
      </div>
    </RequirePermission>
  )
}

export function SecretaryPendingDecisionsPage() {
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')
  const list = useQuery({
    queryKey: ['secretary-decisions', status, search],
    queryFn: () =>
      mockSecretaryPortalService.getPendingDecisions({
        pageSize: 50,
        status: status || undefined,
        search: search || undefined,
      }),
  })

  const columns = useMemo<ColumnDef<PendingDecision, unknown>[]>(
    () => [
      { accessorKey: 'id', header: 'Decision ID' },
      {
        id: 'soe',
        header: 'SOE',
        cell: ({ row }) => row.original.organizationId.replace('org-', '').toUpperCase(),
      },
      { accessorKey: 'matter', header: 'Matter' },
      { accessorKey: 'originatingModule', header: 'Module' },
      { accessorKey: 'dateRaised', header: 'Raised' },
      { accessorKey: 'responsibleWing', header: 'Wing' },
      {
        accessorKey: 'urgency',
        header: 'Urgency',
        cell: ({ getValue }) => <SeverityBadge severity={String(getValue())} />,
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ getValue }) => (
          <StatusBadge
            status={String(getValue())}
            label={PENDING_DECISION_STATUS_LABEL[String(getValue())] ?? String(getValue())}
          />
        ),
      },
      {
        id: 'open',
        header: '',
        cell: ({ row }) => (
          <Link className={linkClass} to={`/secretary/decisions/${row.original.id}`}>
            Open
          </Link>
        ),
      },
    ],
    [],
  )

  return (
    <RequirePermission permission={PERMISSION.EXECUTIVE_DASHBOARD_READ}>
      <div>
        <PageHeader
          title="Pending decisions"
          subtitle="Senior administrative matters · governance actions only"
        />
        <div className="mb-3 grid gap-2 sm:grid-cols-2">
          <SelectField
            label="Status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            options={[
              { value: '', label: 'All open states' },
              { value: 'open', label: 'Open' },
              { value: 'under_consideration', label: 'Under consideration' },
              { value: 'deferred', label: 'Deferred' },
              { value: 'closed', label: 'Closed' },
            ]}
          />
          <TextField
            label="Search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Matter or SOE"
          />
        </div>
        {list.isLoading ? <LoadingBlock label="Loading decisions…" /> : null}
        {list.isError ? <ErrorState title="Unable to load decisions" /> : null}
        {list.data ? (
          list.data.items.length ? (
            <DataTable data={list.data.items} columns={columns} density="compact" showSearch={false} />
          ) : (
            <EmptyState title="No pending decisions" />
          )
        ) : null}
      </div>
    </RequirePermission>
  )
}

export function SecretaryDecisionDetailPage() {
  const { decisionId = '' } = useParams()
  const role = useSessionStore((s) => s.role)
  const pushToast = useUiStore((s) => s.pushToast)
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [assignTo, setAssignTo] = useState('Governance Wing — Section Officer')
  const [confirmEsc, setConfirmEsc] = useState(false)

  const decision = useQuery({
    queryKey: ['secretary-decision', decisionId],
    queryFn: () => mockSecretaryPortalService.getPendingDecision(decisionId),
    enabled: Boolean(decisionId),
  })

  const acknowledge = useMutation({
    mutationFn: () => mockSecretaryPortalService.acknowledgeDecision(decisionId, role),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['secretary-decision'] })
      void qc.invalidateQueries({ queryKey: ['secretary-decisions'] })
      void qc.invalidateQueries({ queryKey: ['secretary-priority-queue'] })
      void qc.invalidateQueries({ queryKey: ['secretary-command-summary'] })
      pushToast({ tone: 'success', title: 'Decision acknowledged (prototype)' })
    },
    onError: (e) =>
      pushToast({
        tone: 'critical',
        title: e instanceof AppError ? e.message : 'Acknowledge failed',
      }),
  })

  const assign = useMutation({
    mutationFn: () => mockSecretaryPortalService.assignDecision(decisionId, role, assignTo),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['secretary-decision'] })
      void qc.invalidateQueries({ queryKey: ['secretary-decisions'] })
      void qc.invalidateQueries({ queryKey: ['tasks'] })
      pushToast({ tone: 'success', title: 'Assigned — follow-up task created' })
    },
    onError: (e) =>
      pushToast({
        tone: 'critical',
        title: e instanceof AppError ? e.message : 'Assign failed',
      }),
  })

  const escalate = useMutation({
    mutationFn: () =>
      mockSecretaryPortalService.escalateDecisionToMinister(
        decisionId,
        role,
        'Escalated for Minister attention (prototype)',
      ),
    onSuccess: (esc) => {
      void qc.invalidateQueries({ queryKey: ['secretary-decision'] })
      void qc.invalidateQueries({ queryKey: ['secretary-escalations'] })
      void qc.invalidateQueries({ queryKey: ['secretary-command-summary'] })
      pushToast({ tone: 'success', title: 'Escalated to Minister queue' })
      navigate(`/secretary/escalations/${esc.id}`)
    },
    onError: (e) =>
      pushToast({
        tone: 'critical',
        title: e instanceof AppError ? e.message : 'Escalate failed',
      }),
  })

  const canAct =
    role === ROLE.SECRETARY ||
    (hasPermission(role, PERMISSION.EXECUTIVE_DASHBOARD_READ) && role === ROLE.MOIP_SUPERVISOR)

  if (decision.isLoading) return <LoadingBlock label="Loading decision…" />
  if (decision.isError || !decision.data) {
    return <ErrorState title="Pending decision not found" />
  }

  const d = decision.data

  return (
    <RequirePermission permission={PERMISSION.EXECUTIVE_DASHBOARD_READ}>
      <div>
        <PageHeader
          title={d.matter}
          subtitle={`${d.id} · ${ROLE_LABEL[role]} · no SOE source edit`}
        />
        <div className="mb-3">
          <Link className={linkClass} to="/secretary/decisions">
            Back to decisions
          </Link>
        </div>

        <div className="mb-4 grid gap-3 lg:grid-cols-2">
          <Card title="Matter">
            <dl className="grid grid-cols-2 gap-2 text-sm">
              <dt className="text-soe-slate">SOE</dt>
              <dd className="font-medium">{d.organizationId.replace('org-', '').toUpperCase()}</dd>
              <dt className="text-soe-slate">Module</dt>
              <dd>{d.originatingModule}</dd>
              <dt className="text-soe-slate">Raised</dt>
              <dd>{d.dateRaised}</dd>
              <dt className="text-soe-slate">Wing</dt>
              <dd>{d.responsibleWing}</dd>
              <dt className="text-soe-slate">Urgency</dt>
              <dd>
                <SeverityBadge severity={d.urgency} />
              </dd>
              <dt className="text-soe-slate">Status</dt>
              <dd>
                <StatusBadge
                  status={d.status}
                  label={PENDING_DECISION_STATUS_LABEL[d.status] ?? d.status}
                />
              </dd>
              <dt className="text-soe-slate">Assigned</dt>
              <dd>{d.assignedTo ?? '—'}</dd>
            </dl>
          </Card>
          <Card title="Recommendation">
            <p className="text-sm">{d.recommendationSummary}</p>
            {d.linkedEvidenceNote ? (
              <p className="mt-3 text-xs text-soe-slate">Evidence: {d.linkedEvidenceNote}</p>
            ) : null}
            {d.linkedRecordType ? (
              <p className="mt-2 text-xs text-soe-slate">
                Linked: {d.linkedRecordType}
                {d.linkedRecordId ? ` · ${d.linkedRecordId}` : ''}
              </p>
            ) : null}
          </Card>
        </div>

        {canAct && d.status !== 'closed' ? (
          <Card title="Governance actions">
            <div className="flex flex-wrap items-end gap-3">
              <Button
                type="button"
                variant="secondary"
                disabled={acknowledge.isPending || d.status === 'under_consideration'}
                onClick={() => acknowledge.mutate()}
              >
                Acknowledge
              </Button>
              <TextField
                label="Assign to"
                value={assignTo}
                onChange={(e) => setAssignTo(e.target.value)}
                className="min-w-[240px]"
              />
              <Button
                type="button"
                variant="secondary"
                disabled={assign.isPending || !assignTo.trim()}
                onClick={() => assign.mutate()}
              >
                Assign
              </Button>
              {role === ROLE.SECRETARY ? (
                <Button type="button" onClick={() => setConfirmEsc(true)}>
                  Escalate to Minister
                </Button>
              ) : null}
            </div>
          </Card>
        ) : null}

        <ConfirmDialog
          open={confirmEsc}
          title="Escalate to Minister?"
          message="Creates a level-3 escalation. Does not change SOE source records."
          confirmLabel="Escalate"
          onConfirm={() => {
            setConfirmEsc(false)
            escalate.mutate()
          }}
          onCancel={() => setConfirmEsc(false)}
        />
      </div>
    </RequirePermission>
  )
}

export function SecretaryObligationsLookaheadPage() {
  const [windowDays, setWindowDays] = useState<7 | 30 | 60 | 90>(90)
  const obl = useQuery({
    queryKey: ['secretary-obligations', windowDays],
    queryFn: () => mockSecretaryPortalService.getUpcomingObligations(windowDays),
  })

  const columns = useMemo<ColumnDef<SecretaryObligationItem, unknown>[]>(
    () => [
      { accessorKey: 'organizationLabel', header: 'SOE' },
      { accessorKey: 'obligationType', header: 'Type' },
      { accessorKey: 'dueDate', header: 'Due' },
      { accessorKey: 'daysUntilDue', header: 'Days' },
      { accessorKey: 'owner', header: 'Owner' },
      {
        accessorKey: 'severity',
        header: 'Severity',
        cell: ({ getValue }) => <SeverityBadge severity={String(getValue())} />,
      },
      {
        id: 'open',
        header: '',
        cell: ({ row }) => (
          <Link className={linkClass} to={row.original.route}>
            Open
          </Link>
        ),
      },
    ],
    [],
  )

  return (
    <RequirePermission permission={PERMISSION.EXECUTIVE_DASHBOARD_READ}>
      <div>
        <PageHeader
          title="Upcoming obligations"
          subtitle="Board, loans, compliance, hearings, reporting · look-ahead"
        />
        <div className="mb-3 max-w-xs">
          <SelectField
            label="Window"
            value={String(windowDays)}
            onChange={(e) => setWindowDays(Number(e.target.value) as 7 | 30 | 60 | 90)}
            options={[
              { value: '7', label: '7 days' },
              { value: '30', label: '30 days' },
              { value: '60', label: '60 days' },
              { value: '90', label: '90 days' },
            ]}
          />
        </div>
        {obl.isLoading ? <LoadingBlock label="Loading obligations…" /> : null}
        {obl.isError ? <ErrorState title="Unable to load obligations" /> : null}
        {obl.data ? (
          <Card title="Look-ahead list" className="mb-4">
            {obl.data.length ? (
              <DataTable data={obl.data} columns={columns} density="compact" showSearch={false} />
            ) : (
              <EmptyState title="No upcoming obligations in this window" />
            )}
          </Card>
        ) : null}
        <Card title="Overdue tasks">
          <TaskCentreWorkspace portal="secretary" defaultView="overdue" embedded />
        </Card>
      </div>
    </RequirePermission>
  )
}

export function SecretaryComplianceSubmissionsPage() {
  const delayed = useQuery({
    queryKey: ['secretary-delayed-compliance'],
    queryFn: () => mockSecretaryPortalService.getDelayedCompliance(),
  })
  const submissions = useQuery({
    queryKey: ['secretary-submission-compliance'],
    queryFn: () => mockSecretaryPortalService.getSubmissionCompliance(),
  })

  const delayCols = useMemo<ColumnDef<SecretaryComplianceDelay, unknown>[]>(
    () => [
      { accessorKey: 'organizationLabel', header: 'SOE' },
      { accessorKey: 'requirement', header: 'Requirement' },
      { accessorKey: 'dueDate', header: 'Due' },
      { accessorKey: 'daysOverdue', header: 'Days overdue' },
      { accessorKey: 'responsibleFunction', header: 'Owner' },
      { accessorKey: 'currentResponse', header: 'Response' },
      { accessorKey: 'escalationStatus', header: 'Escalation' },
    ],
    [],
  )

  const subCols = useMemo<ColumnDef<SecretarySubmissionRow, unknown>[]>(
    () => [
      { accessorKey: 'organizationLabel', header: 'SOE' },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ getValue }) => (
          <StatusBadge
            status={String(getValue())}
            family="reporting"
            label={
              SUBMISSION_STATUS_LABEL[getValue() as SubmissionStatus] ?? String(getValue())
            }
          />
        ),
      },
      {
        accessorKey: 'dueBucket',
        header: 'Bucket',
        cell: ({ getValue }) => String(getValue()).replaceAll('_', ' '),
      },
      { accessorKey: 'ageDays', header: 'Age (d)' },
    ],
    [],
  )

  return (
    <RequirePermission permission={PERMISSION.ACCOUNTABILITY_READ}>
      <div>
        <PageHeader
          title="Compliance & submissions"
          subtitle="Delayed obligations and finance submission posture across SOEs"
        />
        {delayed.isLoading || submissions.isLoading ? (
          <LoadingBlock label="Loading compliance…" />
        ) : null}
        {delayed.isError || submissions.isError ? (
          <ErrorState title="Unable to load compliance view" />
        ) : null}

        <Card title="Delayed compliance" className="mb-4">
          {delayed.data?.length ? (
            <DataTable data={delayed.data} columns={delayCols} density="compact" showSearch={false} />
          ) : (
            <EmptyState title="No delayed compliance" />
          )}
        </Card>

        <Card title="Submission compliance (finance FY2027)">
          {submissions.data?.length ? (
            <DataTable
              data={submissions.data}
              columns={subCols}
              density="compact"
              showSearch={false}
            />
          ) : (
            <EmptyState title="No submission rows" />
          )}
        </Card>
      </div>
    </RequirePermission>
  )
}

export function SecretaryFinancialConcernsPage() {
  const concerns = useQuery({
    queryKey: ['secretary-finance-concerns'],
    queryFn: () => mockSecretaryPortalService.getFinancialConcerns(),
  })

  const columns = useMemo<ColumnDef<SecretaryFinancialConcern, unknown>[]>(
    () => [
      { accessorKey: 'organizationLabel', header: 'SOE' },
      { accessorKey: 'indicator', header: 'Indicator' },
      { accessorKey: 'detail', header: 'Detail' },
      {
        accessorKey: 'severity',
        header: 'Severity',
        cell: ({ getValue }) => <SeverityBadge severity={String(getValue())} />,
      },
    ],
    [],
  )

  return (
    <RequirePermission permission={PERMISSION.FINANCE_READ}>
      <div>
        <PageHeader
          title="Financial concerns"
          subtitle="Exception indicators only · not full statements · provisional thresholds"
        />
        {concerns.isLoading ? <LoadingBlock label="Loading financial concerns…" /> : null}
        {concerns.isError ? <ErrorState title="Unable to load financial concerns" /> : null}
        {concerns.data ? (
          concerns.data.length ? (
            <DataTable data={concerns.data} columns={columns} density="compact" showSearch={false} />
          ) : (
            <EmptyState title="No financial concerns flagged" />
          )
        ) : null}
      </div>
    </RequirePermission>
  )
}

export function SecretaryGovernanceCommandPage() {
  const board = useQuery({
    queryKey: ['secretary-board-governance'],
    queryFn: () => mockSecretaryPortalService.getBoardGovernance(),
  })

  const columns = useMemo<ColumnDef<SecretaryBoardItem, unknown>[]>(
    () => [
      { accessorKey: 'organizationLabel', header: 'SOE' },
      { accessorKey: 'issue', header: 'Issue' },
      { accessorKey: 'memberName', header: 'Member' },
      { accessorKey: 'band', header: 'Band' },
      {
        accessorKey: 'severity',
        header: 'Severity',
        cell: ({ getValue }) => <SeverityBadge severity={String(getValue())} />,
      },
    ],
    [],
  )

  return (
    <RequirePermission permission={PERMISSION.BOARD_READ}>
      <div>
        <PageHeader
          title="Governance"
          subtitle="Board vacancies, expiries and missing declarations"
        />
        <Card title="Board exceptions" className="mb-4">
          {board.isLoading ? <LoadingBlock label="Loading board exceptions…" /> : null}
          {board.isError ? <ErrorState title="Unable to load board exceptions" /> : null}
          {board.data?.length ? (
            <DataTable data={board.data} columns={columns} density="compact" showSearch={false} />
          ) : board.data ? (
            <EmptyState title="No board exceptions" />
          ) : null}
        </Card>
        <GovernanceCalendarWorkspace portal="secretary" />
        <div className="mt-6">
          <BoardWorkspace portal="secretary" />
        </div>
      </div>
    </RequirePermission>
  )
}

export function SecretaryAuditLegalCommandPage() {
  const audit = useQuery({
    queryKey: ['secretary-audit-exposure'],
    queryFn: () => mockSecretaryPortalService.getAuditExposure(),
  })
  const litigation = useQuery({
    queryKey: ['secretary-major-litigation'],
    queryFn: () => mockSecretaryPortalService.getMajorLitigation(),
  })

  const auditCols = useMemo<ColumnDef<SecretaryAuditItem, unknown>[]>(
    () => [
      { accessorKey: 'organizationLabel', header: 'SOE' },
      { accessorKey: 'title', header: 'Para' },
      {
        accessorKey: 'amountInvolved',
        header: 'Amount',
        cell: ({ getValue }) => formatCurrencyPkr(Number(getValue())),
      },
      { accessorKey: 'ageDays', header: 'Age (d)' },
      { accessorKey: 'status', header: 'Status' },
      {
        accessorKey: 'recoveryOutstanding',
        header: 'Recovery outstanding',
        cell: ({ getValue }) => formatCurrencyPkr(Number(getValue())),
      },
      {
        accessorKey: 'severity',
        header: 'Severity',
        cell: ({ getValue }) => <SeverityBadge severity={String(getValue())} />,
      },
    ],
    [],
  )

  const litCols = useMemo<ColumnDef<SecretaryLitigationItem, unknown>[]>(
    () => [
      { accessorKey: 'organizationLabel', header: 'SOE' },
      { accessorKey: 'title', header: 'Case' },
      {
        accessorKey: 'amountInvolved',
        header: 'Amount',
        cell: ({ getValue }) => formatCurrencyPkr(Number(getValue())),
      },
      {
        accessorKey: 'nextHearing',
        header: 'Next hearing',
        cell: ({ getValue }) => String(getValue() ?? '—'),
      },
      {
        accessorKey: 'linkedAsset',
        header: 'Asset-linked',
        cell: ({ getValue }) => (getValue() ? 'Yes' : 'No'),
      },
      {
        accessorKey: 'severity',
        header: 'Severity',
        cell: ({ getValue }) => <SeverityBadge severity={String(getValue())} />,
      },
    ],
    [],
  )

  return (
    <RequirePermission permission={PERMISSION.ACCOUNTABILITY_READ}>
      <div>
        <PageHeader
          title="Audit & legal"
          subtitle="High-value audit exposure and major litigation · provisional thresholds"
        />
        <Card title="Audit exposure" className="mb-4">
          {audit.isLoading ? <LoadingBlock label="Loading audit…" /> : null}
          {audit.isError ? <ErrorState title="Unable to load audit exposure" /> : null}
          {audit.data?.length ? (
            <DataTable data={audit.data} columns={auditCols} density="compact" showSearch={false} />
          ) : audit.data ? (
            <EmptyState title="No high-value audit exposure" />
          ) : null}
        </Card>
        <Card title="Major litigation">
          {litigation.isLoading ? <LoadingBlock label="Loading litigation…" /> : null}
          {litigation.isError ? <ErrorState title="Unable to load litigation" /> : null}
          {litigation.data?.length ? (
            <DataTable
              data={litigation.data}
              columns={litCols}
              density="compact"
              showSearch={false}
            />
          ) : litigation.data ? (
            <EmptyState title="No major litigation flagged" />
          ) : null}
        </Card>
      </div>
    </RequirePermission>
  )
}

export function SecretaryEscalationQueuePage() {
  const list = useQuery({
    queryKey: ['secretary-escalations'],
    queryFn: () => mockSecretaryPortalService.getEscalationQueue(),
  })

  const columns = useMemo<ColumnDef<Escalation, unknown>[]>(
    () => [
      {
        id: 'soe',
        header: 'SOE',
        cell: ({ row }) => row.original.organizationId.replace('org-', '').toUpperCase(),
      },
      { accessorKey: 'reason', header: 'Source issue' },
      {
        accessorKey: 'escalationLevel',
        header: 'Level',
        cell: ({ getValue }) => String(getValue() ?? '—'),
      },
      {
        accessorKey: 'ownerRole',
        header: 'Owner',
        cell: ({ getValue }) => ROLE_LABEL[getValue() as keyof typeof ROLE_LABEL] ?? String(getValue()),
      },
      {
        id: 'age',
        header: 'Age',
        cell: ({ row }) => row.original.createdAt.slice(0, 10),
      },
      { accessorKey: 'dueDate', header: 'Due' },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ getValue }) => <StatusBadge status={String(getValue())} />,
      },
      {
        accessorKey: 'severity',
        header: 'Severity',
        cell: ({ getValue }) => <SeverityBadge severity={String(getValue())} />,
      },
      {
        id: 'open',
        header: '',
        cell: ({ row }) => (
          <Link className={linkClass} to={`/secretary/escalations/${row.original.id}`}>
            History
          </Link>
        ),
      },
    ],
    [],
  )

  return (
    <RequirePermission permission={PERMISSION.EXECUTIVE_DASHBOARD_READ}>
      <div>
        <PageHeader
          title="Escalation queue"
          subtitle="Source issue · level · owner · status · drill to history"
        />
        {list.isLoading ? <LoadingBlock label="Loading escalations…" /> : null}
        {list.isError ? <ErrorState title="Unable to load escalations" /> : null}
        {list.data ? (
          list.data.length ? (
            <DataTable data={list.data} columns={columns} density="compact" showSearch={false} />
          ) : (
            <EmptyState title="No escalations" />
          )
        ) : null}
      </div>
    </RequirePermission>
  )
}
