import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  AlertTriangle,
  BadgeCheck,
  FileWarning,
  MessageSquareWarning,
  ShieldCheck,
} from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/design-system/components/Card'
import { Button } from '@/design-system/components/Button'
import { SelectField } from '@/design-system/components/Fields'
import {
  Alert,
  EmptyState,
  ErrorState,
  LoadingBlock,
} from '@/design-system/components/Feedback'
import { FormActions } from '@/design-system/components/FormActions'
import { ConfirmDialog } from '@/design-system/components/Overlays'
import { StatusBadge } from '@/design-system/components/StatusBadge'
import { mockSoePortalService } from '@/mock-services'
import { hasPermission, PERMISSION } from '@/permissions'
import { useSessionStore } from '@/state/session'
import { useUiStore } from '@/state/ui'
import { ROLE_LABEL, SUBMISSION_STATUS_LABEL } from '@/constants'
import { REPORTING_MODULES } from '@/workflow/moduleCatalog'
import { AppError, cn } from '@/utils'

type TabId = 'overview' | 'issues' | 'clarifications' | 'submit'

const TABS: Array<{ id: TabId; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'issues', label: 'Issues' },
  { id: 'clarifications', label: 'Clarifications' },
  { id: 'submit', label: 'Submit' },
]

function tabClass(active: boolean) {
  return cn(
    'h-9 rounded-md px-3 text-sm font-medium',
    active ? 'bg-soe-navy text-white' : 'text-soe-slate hover:bg-[var(--color-pending-soft)]',
  )
}

function Kpi({
  label,
  value,
  detail,
  icon: Icon,
  tone = 'neutral',
}: {
  label: string
  value: string
  detail: string
  icon: typeof BadgeCheck
  tone?: 'neutral' | 'success' | 'warning' | 'critical'
}) {
  const colors = {
    neutral: 'border-t-soe-blue text-soe-blue',
    success: 'border-t-soe-success text-soe-success',
    warning: 'border-t-soe-warning text-soe-warning',
    critical: 'border-t-soe-critical text-soe-critical',
  }
  return (
    <div
      className={cn(
        'border border-t-[3px] border-soe-border bg-white p-4 shadow-[var(--shadow-sm)]',
        colors[tone],
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase text-soe-slate">{label}</p>
        <Icon size={17} aria-hidden />
      </div>
      <p className="mt-3 text-2xl font-semibold text-soe-navy tabular-nums">{value}</p>
      <p className="mt-1 text-xs text-soe-slate">{detail}</p>
    </div>
  )
}

function parseTab(value: string | null): TabId {
  if (value === 'issues' || value === 'clarifications' || value === 'submit') return value
  return 'overview'
}

export function SoeSubmissionsApprovalsPage() {
  const organizationId = useSessionStore((s) => s.organizationId)
  const reportingPeriodId = useSessionStore((s) => s.reportingPeriodId)
  const role = useSessionStore((s) => s.role)
  const pushToast = useUiStore((s) => s.pushToast)
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = parseTab(searchParams.get('tab'))
  const [confirmOpen, setConfirmOpen] = useState(false)
  const canSubmit = hasPermission(role, PERMISSION.SUBMISSION_SUBMIT)

  const [moduleId, setModuleId] = useState('')
  const [severity, setSeverity] = useState('')
  const [ownerRole, setOwnerRole] = useState('')

  const workspace = useQuery({
    queryKey: ['submissions-approvals', organizationId, reportingPeriodId, role],
    queryFn: () =>
      mockSoePortalService.getSubmissionsApprovalsWorkspace(
        organizationId,
        reportingPeriodId,
        role,
      ),
  })

  const submitMutation = useMutation({
    mutationFn: () =>
      mockSoePortalService.confirmPeriodSubmission(organizationId, reportingPeriodId, role),
    onSuccess: (r) => {
      setConfirmOpen(false)
      void queryClient.invalidateQueries({ queryKey: ['submissions-approvals'] })
      void queryClient.invalidateQueries({ queryKey: ['soe-dashboard'] })
      void queryClient.invalidateQueries({ queryKey: ['moip-finance-queue'] })
      pushToast({
        title: `Submitted ${r.submittedModuleIds.length} certified module(s) to MoIP.`,
        tone: 'success',
      })
    },
    onError: (err: unknown) => {
      setConfirmOpen(false)
      pushToast({
        title: err instanceof AppError ? err.message : 'Submission failed',
        tone: 'critical',
      })
    },
  })

  const ownerOptions = useMemo(() => {
    const roles = [...new Set(REPORTING_MODULES.map((m) => m.ownerRole))]
    return roles.map((r) => ({ value: r, label: ROLE_LABEL[r] }))
  }, [])

  const setTab = (next: TabId) => {
    const params = new URLSearchParams(searchParams)
    if (next === 'overview') params.delete('tab')
    else params.set('tab', next)
    setSearchParams(params, { replace: true })
  }

  if (workspace.isLoading) return <LoadingBlock label="Loading submissions and approvals…" />
  if (workspace.isError || !workspace.data) {
    return <ErrorState title="Unable to load submissions and approvals" />
  }

  const data = workspace.data
  const { summary, modules, issues, clarifications, readiness } = data

  const filteredIssues = issues.filter((issue) => {
    if (moduleId && issue.moduleId !== moduleId) return false
    if (severity && issue.severity !== severity) return false
    if (ownerRole && issue.ownerRole !== ownerRole) return false
    return true
  })

  const groupedIssues = {
    blocking: filteredIssues.filter((i) => i.severity === 'blocking'),
    warning: filteredIssues.filter((i) => i.severity === 'warning'),
    evidence: filteredIssues.filter((i) => i.severity === 'evidence'),
    incomplete: filteredIssues.filter((i) => i.severity === 'incomplete'),
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Submissions & Approvals"
        subtitle={`${data.organization.abbreviation} · ${data.period.label} · completion, validation, clarifications and MoIP submission`}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Kpi
          label="Overall completion"
          value={`${summary.overallCompletion}%`}
          detail="Average module completion"
          icon={BadgeCheck}
          tone={summary.overallCompletion >= 90 ? 'success' : 'warning'}
        />
        <Kpi
          label="Modules complete"
          value={`${summary.modulesComplete}/${summary.modulesTotal}`}
          detail="Reporting modules at 100%"
          icon={ShieldCheck}
          tone={summary.modulesComplete === summary.modulesTotal ? 'success' : 'neutral'}
        />
        <Kpi
          label="Open issues"
          value={String(summary.blockingCount + summary.evidenceGapCount)}
          detail={`${summary.blockingCount} blocking · ${summary.evidenceGapCount} evidence`}
          icon={FileWarning}
          tone={summary.blockingCount ? 'critical' : summary.evidenceGapCount ? 'warning' : 'success'}
        />
        <Kpi
          label="Clarifications"
          value={String(summary.openClarifications)}
          detail="MoIP questions awaiting response"
          icon={MessageSquareWarning}
          tone={summary.openClarifications ? 'critical' : 'success'}
        />
        <Kpi
          label="Ready to submit"
          value={summary.canSubmit ? 'Yes' : 'No'}
          detail={`${summary.certifiedCount} certified · v${summary.version}`}
          icon={AlertTriangle}
          tone={summary.canSubmit ? 'success' : 'warning'}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={tabClass(tab === item.id)}
            onClick={() => setTab(item.id)}
          >
            {item.label}
            {item.id === 'clarifications' && summary.openClarifications > 0
              ? ` (${summary.openClarifications})`
              : null}
            {item.id === 'issues' && summary.blockingCount + summary.evidenceGapCount > 0
              ? ` (${summary.blockingCount + summary.evidenceGapCount})`
              : null}
          </button>
        ))}
      </div>

      {tab === 'overview' ? (
        <Card title="Module submissions" subtitle="One row per reporting module for the selected period.">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="bg-[#f4f7fa] text-xs text-soe-navy">
                <tr>
                  <th className="border-b border-soe-border px-3 py-3 font-semibold">Module</th>
                  <th className="border-b border-soe-border px-3 py-3 font-semibold">Completion</th>
                  <th className="border-b border-soe-border px-3 py-3 font-semibold">Status</th>
                  <th className="border-b border-soe-border px-3 py-3 text-center font-semibold">Issues</th>
                  <th className="border-b border-soe-border px-3 py-3 text-center font-semibold">Evidence</th>
                  <th className="border-b border-soe-border px-3 py-3 font-semibold">Owner</th>
                  <th className="border-b border-soe-border px-3 py-3 font-semibold">Updated</th>
                  <th className="border-b border-soe-border px-3 py-3 font-semibold">Next action</th>
                </tr>
              </thead>
              <tbody>
                {modules.map((row) => (
                  <tr key={row.submission.id} className="border-b border-soe-border last:border-b-0 hover:bg-[#f8fafc]">
                    <td className="px-3 py-3">
                      <p className="font-semibold text-soe-navy">{row.def.label}</p>
                      <p className="mt-0.5 text-[11px] text-soe-slate">v{row.submission.version}</p>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-1.5 w-28 overflow-hidden rounded-full bg-soe-canvas">
                          <div
                            className="h-full rounded-full bg-soe-blue"
                            style={{ width: `${row.submission.completeness}%` }}
                          />
                        </div>
                        <span className="text-xs font-semibold text-soe-navy tabular-nums">
                          {row.submission.completeness}%
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <StatusBadge
                        status={row.submission.status}
                        label={SUBMISSION_STATUS_LABEL[row.submission.status]}
                      />
                    </td>
                    <td
                      className={cn(
                        'px-3 py-3 text-center font-semibold tabular-nums',
                        row.validationIssueCount ? 'text-soe-critical' : 'text-soe-slate',
                      )}
                    >
                      {row.validationIssueCount}
                    </td>
                    <td
                      className={cn(
                        'px-3 py-3 text-center font-semibold tabular-nums',
                        row.evidenceGapCount ? 'text-soe-warning' : 'text-soe-slate',
                      )}
                    >
                      {row.evidenceGapCount}
                    </td>
                    <td className="px-3 py-3 text-xs text-soe-slate">{ROLE_LABEL[row.def.ownerRole]}</td>
                    <td className="px-3 py-3 text-xs text-soe-slate">
                      {new Date(row.submission.updatedAt).toLocaleDateString()}
                    </td>
                    <td className="px-3 py-3">
                      <Link className="text-sm font-medium text-soe-blue hover:underline" to={row.def.route}>
                        {row.nextAction}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : null}

      {tab === 'issues' ? (
        <>
          <div className="grid gap-3 md:grid-cols-3">
            <SelectField
              label="Module"
              value={moduleId}
              options={[
                { value: '', label: 'All modules' },
                ...REPORTING_MODULES.map((m) => ({ value: m.id, label: m.label })),
              ]}
              onChange={(e) => setModuleId(e.target.value)}
            />
            <SelectField
              label="Severity"
              value={severity}
              options={[
                { value: '', label: 'All severities' },
                { value: 'blocking', label: 'Blocking' },
                { value: 'warning', label: 'Warning' },
                { value: 'evidence', label: 'Evidence missing' },
                { value: 'incomplete', label: 'Incomplete' },
              ]}
              onChange={(e) => setSeverity(e.target.value)}
            />
            <SelectField
              label="Owner"
              value={ownerRole}
              options={[{ value: '', label: 'All owners' }, ...ownerOptions]}
              onChange={(e) => setOwnerRole(e.target.value)}
            />
          </div>

          {filteredIssues.length === 0 ? (
            <EmptyState title="No validation issues for current filters" />
          ) : (
            <div className="grid gap-4">
              {(
                [
                  ['Blocking', groupedIssues.blocking],
                  ['Warnings', groupedIssues.warning],
                  ['Evidence missing', groupedIssues.evidence],
                  ['Incomplete required', groupedIssues.incomplete],
                ] as const
              ).map(([title, list]) =>
                list.length ? (
                  <Card key={title} title={`${title} (${list.length})`}>
                    <ul className="space-y-2 text-sm">
                      {list.map((issue) => (
                        <li
                          key={issue.id}
                          className="flex flex-wrap items-start justify-between gap-2 border-b border-soe-border py-1.5"
                        >
                          <span>
                            <span className="font-medium">{issue.moduleLabel}</span> — {issue.message}
                            <span className="mt-0.5 block text-xs text-soe-slate">
                              Owner: {ROLE_LABEL[issue.ownerRole]}
                            </span>
                          </span>
                          <Link className="text-soe-blue underline" to={issue.route}>
                            Open record
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </Card>
                ) : null,
              )}
            </div>
          )}
        </>
      ) : null}

      {tab === 'clarifications' ? (
        <Card title="Clarification inbox" subtitle="MoIP questions linked to module, field, and due date.">
          {clarifications.length === 0 ? (
            <EmptyState
              title="No clarifications"
              hint="Items appear when MoIP requests clarification on a submission."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-soe-border text-xs text-soe-slate">
                    <th className="py-2 font-medium">Module</th>
                    <th className="py-2 font-medium">Question</th>
                    <th className="py-2 font-medium">Field</th>
                    <th className="py-2 font-medium">Received</th>
                    <th className="py-2 font-medium">Due</th>
                    <th className="py-2 font-medium">Status</th>
                    <th className="py-2 font-medium">Assignee</th>
                    <th className="py-2 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {clarifications.map((c) => (
                    <tr key={c.id} className="border-b border-soe-border align-top">
                      <td className="py-2">{c.moduleLabel}</td>
                      <td className="max-w-xs py-2">{c.question}</td>
                      <td className="py-2">{c.affectedField ?? 'General'}</td>
                      <td className="py-2 text-xs">{new Date(c.createdAt).toLocaleDateString()}</td>
                      <td className="py-2 text-xs">{c.dueDate ?? '—'}</td>
                      <td className="py-2">
                        <StatusBadge status={c.status} family="reporting" />
                      </td>
                      <td className="py-2 text-xs">{ROLE_LABEL[c.assignedRole]}</td>
                      <td className="py-2">
                        <Link className="text-soe-blue underline" to={c.route}>
                          Respond
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      ) : null}

      {tab === 'submit' ? (
        <>
          <Alert
            className="mb-4"
            tone={readiness.canSubmit ? 'success' : 'warning'}
            title={
              readiness.canSubmit
                ? 'Ready for period submission (subject to confirmation).'
                : 'Submission disabled while blocking conditions remain.'
            }
          >
            Completion {readiness.overallCompletion}% · Modules complete {readiness.modulesComplete}/
            {readiness.modulesTotal}
          </Alert>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card title="Blocking errors">
              {readiness.blockingErrors.length === 0 ? (
                <p className="text-sm text-soe-slate">None</p>
              ) : (
                <ul className="space-y-1 text-sm">
                  {readiness.blockingErrors.map((item) => (
                    <li key={item.id}>
                      <Link className="text-soe-blue underline" to={item.route}>
                        {item.message}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
            <Card title="Missing evidence">
              {readiness.missingEvidence.length === 0 ? (
                <p className="text-sm text-soe-slate">None</p>
              ) : (
                <ul className="space-y-1 text-sm">
                  {readiness.missingEvidence.map((item) => (
                    <li key={item.id}>{item.message}</li>
                  ))}
                </ul>
              )}
            </Card>
            <Card title="Warnings (non-blocking)">
              {readiness.warnings.length === 0 ? (
                <p className="text-sm text-soe-slate">None</p>
              ) : (
                <ul className="space-y-1 text-sm">
                  {readiness.warnings.map((item) => (
                    <li key={item.id}>{item.message}</li>
                  ))}
                </ul>
              )}
            </Card>
            <Card title="Outstanding clarifications">
              {readiness.outstandingClarifications.length === 0 ? (
                <p className="text-sm text-soe-slate">None</p>
              ) : (
                <ul className="space-y-1 text-sm">
                  {readiness.outstandingClarifications.map((c) => (
                    <li key={c.id}>
                      <button
                        type="button"
                        className="text-left text-soe-blue underline"
                        onClick={() => setTab('clarifications')}
                      >
                        {c.question}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
            <Card title="Certification requirements">
              <ul className="list-disc space-y-1 pl-5 text-sm">
                {readiness.certificationRequirements.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-soe-slate">Certifiers: {readiness.certifiers.join(', ')}</p>
            </Card>
          </div>

          <FormActions className="mt-4">
            <div className="mr-auto">
              {!canSubmit ? (
                <p className="text-xs text-soe-slate">
                  Current role cannot submit. Switch to SOE Contributor or CEO.
                </p>
              ) : null}
            </div>
            <Button disabled={!canSubmit || !readiness.canSubmit} onClick={() => setConfirmOpen(true)}>
              Confirm period submission
            </Button>
          </FormActions>

          <ConfirmDialog
            open={confirmOpen}
            title="Confirm submission to MoIP"
            message={`${readiness.organization.name} · ${readiness.period.label} · version ${readiness.version}. Unresolved non-blocking warnings may remain.`}
            confirmLabel="Submit to MoIP"
            onCancel={() => setConfirmOpen(false)}
            onConfirm={() => submitMutation.mutate()}
          />
        </>
      ) : null}
    </div>
  )
}
