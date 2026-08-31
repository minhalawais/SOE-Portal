import { useQuery } from '@tanstack/react-query'
import { ArrowRight, BadgeCheck, Building2, FileWarning, ShieldCheck } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/design-system/components/Button'
import { Card } from '@/design-system/components/Card'
import { SelectField, TextField } from '@/design-system/components/Fields'
import { ErrorState, LoadingBlock } from '@/design-system/components/Feedback'
import { StatusBadge } from '@/design-system/components/StatusBadge'
import { MODULE, SUBMISSION_STATUS, SUBMISSION_STATUS_LABEL, type SubmissionStatus } from '@/constants'
import { mockModuleReviewService, mockMoipPortalService } from '@/mock-services'
import type { MoipPortfolioRow } from '@/mock-services/moipPortal.service'
import { useSessionStore } from '@/state/session'
import { cn } from '@/utils'
import { reportingPeriods } from '@/mock-data'

const REVIEWABLE_STATUSES = new Set<SubmissionStatus>([
  SUBMISSION_STATUS.SUBMITTED,
  SUBMISSION_STATUS.UNDER_REVIEW,
  SUBMISSION_STATUS.CLARIFICATION_REQUESTED,
  SUBMISSION_STATUS.RESUBMITTED,
  SUBMISSION_STATUS.APPROVED,
  SUBMISSION_STATUS.LOCKED,
  SUBMISSION_STATUS.RETURNED,
])

const ACTIVE_REVIEW_STATUSES: SubmissionStatus[] = [
  SUBMISSION_STATUS.SUBMITTED,
  SUBMISSION_STATUS.UNDER_REVIEW,
  SUBMISSION_STATUS.RESUBMITTED,
]

const RESPONSE_REQUIRED_STATUSES: SubmissionStatus[] = [
  SUBMISSION_STATUS.CLARIFICATION_REQUESTED,
  SUBMISSION_STATUS.RETURNED,
]

const APPROVED_STATUSES: SubmissionStatus[] = [
  SUBMISSION_STATUS.APPROVED,
  SUBMISSION_STATUS.LOCKED,
]

function moduleAction(submission?: { id: string; status: SubmissionStatus }) {
  if (!submission) return { label: 'Awaiting SOE', route: '', tone: 'neutral' as const }
  if (!REVIEWABLE_STATUSES.has(submission.status)) {
    return { label: 'Not submitted', route: '', tone: 'neutral' as const }
  }
  if (submission.status === SUBMISSION_STATUS.APPROVED || submission.status === SUBMISSION_STATUS.LOCKED) {
    return { label: 'View approved', route: `/moip-review/submissions/${submission.id}`, tone: 'success' as const }
  }
  if (submission.status === SUBMISSION_STATUS.CLARIFICATION_REQUESTED) {
    return { label: 'Clarification open', route: `/moip-review/submissions/${submission.id}`, tone: 'warning' as const }
  }
  if (submission.status === SUBMISSION_STATUS.RETURNED) {
    return { label: 'Returned to SOE', route: `/moip-review/submissions/${submission.id}`, tone: 'critical' as const }
  }
  return { label: 'Review module', route: `/moip-review/submissions/${submission.id}`, tone: 'primary' as const }
}

function aggregateTone(status: MoipPortfolioRow['submissionStatus']) {
  if (status === SUBMISSION_STATUS.LOCKED || status === SUBMISSION_STATUS.APPROVED) return 'success'
  if (status === SUBMISSION_STATUS.CLARIFICATION_REQUESTED || status === SUBMISSION_STATUS.RETURNED) return 'warning'
  if (status === SUBMISSION_STATUS.SUBMITTED || status === SUBMISSION_STATUS.UNDER_REVIEW || status === SUBMISSION_STATUS.RESUBMITTED) return 'info'
  return 'neutral'
}

function compactPackageStatus(status: MoipPortfolioRow['submissionStatus']) {
  if (status === 'not_started') return 'Not submitted'
  if (status === SUBMISSION_STATUS.CLARIFICATION_REQUESTED) return 'Clarification'
  if (status === SUBMISSION_STATUS.UNDER_REVIEW) return 'Under review'
  return SUBMISSION_STATUS_LABEL[status]
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
    <div className={cn('border border-t-[3px] border-soe-border bg-white p-4 shadow-[var(--shadow-sm)]', colors[tone])}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase text-soe-slate">{label}</p>
        <Icon size={17} aria-hidden />
      </div>
      <p className="mt-3 text-2xl font-semibold text-soe-navy tabular-nums">{value}</p>
      <p className="mt-1 text-xs text-soe-slate">{detail}</p>
    </div>
  )
}

export function MoipSubmissionsApprovalsPage() {
  const reportingPeriodId = useSessionStore((state) => state.reportingPeriodId)
  const setReportingPeriodId = useSessionStore((state) => state.setReportingPeriodId)
  const [searchParams, setSearchParams] = useSearchParams()
  const selectedOrganizationId = searchParams.get('organizationId') ?? ''
  const status = searchParams.get('status') ?? ''
  const sector = searchParams.get('sector') ?? ''
  const search = searchParams.get('q') ?? ''

  const portfolio = useQuery({
    queryKey: ['moip-soe-submission-packages', reportingPeriodId, status, sector, search],
    queryFn: () =>
      mockMoipPortalService.getPortfolio({
        pageSize: 200,
        reportingPeriodId,
        submissionStatus: status || undefined,
        sector: sector || undefined,
        search: search || undefined,
      }),
  })

  const rows = portfolio.data?.items ?? []
  const selected = rows.find((row) => row.organization.id === selectedOrganizationId) ?? rows[0]
  const selectedId = selected?.organization.id

  const selectedPackage = useQuery({
    queryKey: ['moip-soe-submission-package', selectedId, reportingPeriodId],
    queryFn: () => mockModuleReviewService.getPackage(selectedId!, reportingPeriodId),
    enabled: Boolean(selectedId),
  })

  if (portfolio.isLoading) return <LoadingBlock label="Loading SOE submissions and approvals..." />
  if (portfolio.isError) return <ErrorState title="Unable to load MOIP submissions and approvals" />

  const sectors = [...new Set(rows.map((row) => row.sector))].sort()
  const submittedSoes = rows.filter((row) => row.submissionStatus !== 'not_started').length
  const underReview = rows.filter((row) =>
    row.submissionStatus !== 'not_started' &&
    ACTIVE_REVIEW_STATUSES.includes(row.submissionStatus),
  ).length
  const needsResponse = rows.filter((row) =>
    row.submissionStatus !== 'not_started' &&
    RESPONSE_REQUIRED_STATUSES.includes(row.submissionStatus),
  ).length
  const approved = rows.filter((row) =>
    row.submissionStatus !== 'not_started' &&
    APPROVED_STATUSES.includes(row.submissionStatus),
  ).length
  const packageData = selectedPackage.data
  const moduleRows = packageData?.modules ?? []

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams)
    if (value) next.set(key, value)
    else next.delete(key)
    if (key !== 'organizationId') next.delete('organizationId')
    setSearchParams(next)
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Submissions & Approvals"
        subtitle="SOE-wise submitted packages, module review status and MoIP approval decisions"
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="SOEs in view" value={String(rows.length)} detail="Current filters" icon={Building2} />
        <Kpi label="Submitted SOEs" value={String(submittedSoes)} detail="At least one module received" icon={BadgeCheck} tone={submittedSoes ? 'success' : 'neutral'} />
        <Kpi label="Under MoIP review" value={String(underReview)} detail="Submitted, resubmitted or active review" icon={ShieldCheck} tone={underReview ? 'warning' : 'neutral'} />
        <Kpi label="Needs SOE response" value={String(needsResponse)} detail={`${approved} approved or locked`} icon={FileWarning} tone={needsResponse ? 'critical' : 'success'} />
      </div>

      <Card title="Filter SOE submissions" subtitle="Select an SOE to inspect its submitted module package.">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <SelectField
            label="Financial year"
            value={reportingPeriodId}
            options={reportingPeriods.filter((period) => period.type === 'annual').map((period) => ({ value: period.id, label: period.label }))}
            onChange={(event) => setReportingPeriodId(event.target.value)}
          />
          <SelectField
            label="Submission status"
            value={status}
            options={[
              { value: '', label: 'All statuses' },
              { value: SUBMISSION_STATUS.SUBMITTED, label: SUBMISSION_STATUS_LABEL.submitted },
              { value: SUBMISSION_STATUS.UNDER_REVIEW, label: SUBMISSION_STATUS_LABEL.under_review },
              { value: SUBMISSION_STATUS.CLARIFICATION_REQUESTED, label: SUBMISSION_STATUS_LABEL.clarification_requested },
              { value: SUBMISSION_STATUS.RESUBMITTED, label: SUBMISSION_STATUS_LABEL.resubmitted },
              { value: SUBMISSION_STATUS.APPROVED, label: SUBMISSION_STATUS_LABEL.approved },
              { value: SUBMISSION_STATUS.LOCKED, label: SUBMISSION_STATUS_LABEL.locked },
              { value: 'not_started', label: 'Not submitted' },
            ]}
            onChange={(event) => setParam('status', event.target.value)}
          />
          <SelectField
            label="Sector"
            value={sector}
            options={[{ value: '', label: 'All sectors' }, ...sectors.map((item) => ({ value: item, label: item }))]}
            onChange={(event) => setParam('sector', event.target.value)}
          />
          <TextField
            label="Search SOE"
            value={search}
            placeholder="Name or abbreviation"
            onChange={(event) => setParam('q', event.target.value)}
          />
          <div className="flex items-end">
            <Button variant="tertiary" onClick={() => setSearchParams(new URLSearchParams())}>
              Reset filters
            </Button>
          </div>
        </div>
      </Card>

      <div className="grid items-stretch gap-4 xl:grid-cols-[410px_minmax(0,1fr)]">
        <Card
          className="flex h-full flex-col overflow-hidden"
          title="SOEs that submitted data"
          subtitle="Choose one enterprise package for module-level review."
        >
          <div className="min-h-0 flex-1 overflow-y-auto pr-1">
            {rows.length ? (
              <div className="space-y-2">
                {rows.map((row) => {
                  const active = selected?.organization.id === row.organization.id
                  const warnings = row.majorWarnings.length
                  return (
                    <button
                      key={row.organization.id}
                      type="button"
                      className={cn(
                        'w-full rounded-[10px] border p-3 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-soe-blue',
                        active
                          ? 'border-soe-blue bg-[#eef6fc] shadow-[0_8px_18px_rgba(0,86,153,0.10)]'
                          : 'border-soe-border bg-white hover:border-[#8bb8dd] hover:bg-[#f8fbfd]',
                      )}
                      onClick={() => setParam('organizationId', row.organization.id)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 pr-1">
                          <p className="truncate text-sm font-semibold text-soe-navy">
                            {row.organization.abbreviation}
                          </p>
                          <p className="mt-0.5 truncate text-xs text-soe-slate" title={row.organization.name}>
                            {row.organization.name}
                          </p>
                        </div>
                        <StatusBadge
                          status={row.submissionStatus === 'not_started' ? 'draft' : row.submissionStatus}
                          family="reporting"
                          label={compactPackageStatus(row.submissionStatus)}
                          className="shrink-0 whitespace-nowrap"
                        />
                      </div>
                      <div className="mt-3 flex items-center gap-2">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#e7eef4]">
                          <div
                            className={cn(
                              'h-full rounded-full',
                              row.completion >= 90
                                ? 'bg-soe-teal'
                                : row.completion >= 70
                                  ? 'bg-soe-blue'
                                  : 'bg-soe-warning',
                            )}
                            style={{ width: `${row.completion}%` }}
                          />
                        </div>
                        <span className="w-10 text-right text-xs font-semibold text-soe-navy tabular-nums">
                          {row.completion}%
                        </span>
                      </div>
                      <div className="mt-2 flex items-center justify-between gap-2 text-xs">
                        <span className="min-w-0 truncate text-soe-slate" title={row.sector}>
                          {row.sector}
                        </span>
                        <span
                          className={cn(
                            'shrink-0 rounded-full px-2 py-0.5 font-semibold',
                            warnings
                              ? 'bg-[#fff4dd] text-[#8a5a05]'
                              : aggregateTone(row.submissionStatus) === 'success'
                                ? 'bg-[#e7f5f0] text-[#0d6b57]'
                                : 'bg-[#edf3f8] text-soe-slate',
                          )}
                        >
                          {warnings} warning{warnings === 1 ? '' : 's'}
                        </span>
                      </div>
                    </button>
                  )
                })}
              </div>
            ) : (
              <div className="rounded-[8px] border border-dashed border-soe-border p-6 text-sm text-soe-slate">
                No SOEs match the current filters.
              </div>
            )}
          </div>
        </Card>

        <Card
          className="flex h-full flex-col"
          title={selected ? `${selected.organization.abbreviation} submission package` : 'Submission package'}
          subtitle={
            packageData
              ? `${packageData.periodLabel} · ${packageData.submitted}/${packageData.modules.length} modules submitted · ${packageData.approved} approved`
              : 'Select an SOE to inspect module status.'
          }
          actions={
            selected ? (
              <Link className="text-xs font-semibold text-soe-blue hover:underline" to={`/moip-review/enterprise/${selected.organization.id}/review?period=${reportingPeriodId}`}>
                Open SOE profile
              </Link>
            ) : null
          }
        >
          {selectedPackage.isLoading ? <LoadingBlock label="Loading selected SOE package..." /> : null}
          {selectedPackage.isError ? <ErrorState title="Unable to load selected SOE package" /> : null}
          {packageData ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[920px] text-left text-sm">
                <thead className="bg-[#f4f7fa] text-xs text-soe-navy">
                  <tr>
                    <th className="border-b border-soe-border px-3 py-3 font-semibold">Module</th>
                    <th className="border-b border-soe-border px-3 py-3 font-semibold">Completion</th>
                    <th className="border-b border-soe-border px-3 py-3 font-semibold">Status</th>
                    <th className="border-b border-soe-border px-3 py-3 text-center font-semibold">Issues</th>
                    <th className="border-b border-soe-border px-3 py-3 text-center font-semibold">Evidence</th>
                    <th className="border-b border-soe-border px-3 py-3 font-semibold">Updated</th>
                    <th className="border-b border-soe-border px-3 py-3 font-semibold">Next action</th>
                  </tr>
                </thead>
                <tbody>
                  {moduleRows.map((row) => {
                    const action = moduleAction(row.submission)
                    return (
                      <tr key={row.id} className="border-b border-soe-border last:border-b-0 hover:bg-[#f8fafc]">
                        <td className="px-3 py-3">
                          <p className="font-semibold text-soe-navy">{row.label}</p>
                          <p className="mt-0.5 text-[11px] text-soe-slate">
                            {row.id === MODULE.LITIGATION || row.id === MODULE.WORKFORCE ? 'Continuous / event based' : 'Annual reporting'}
                          </p>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-3">
                            <div className="h-1.5 w-28 overflow-hidden rounded-full bg-soe-canvas">
                              <div className="h-full rounded-full bg-soe-blue" style={{ width: `${row.submission?.completeness ?? 0}%` }} />
                            </div>
                            <span className="text-xs font-semibold text-soe-navy tabular-nums">{row.submission?.completeness ?? 0}%</span>
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          {row.submission ? (
                            <StatusBadge status={row.submission.status} family="reporting" label={SUBMISSION_STATUS_LABEL[row.submission.status]} />
                          ) : (
                            <span className="text-xs text-soe-slate">Not submitted</span>
                          )}
                        </td>
                        <td className={cn('px-3 py-3 text-center font-semibold tabular-nums', row.blocking + row.warnings ? 'text-soe-critical' : 'text-soe-slate')}>
                          {row.blocking + row.warnings}
                        </td>
                        <td className={cn('px-3 py-3 text-center font-semibold tabular-nums', row.evidenceGaps ? 'text-soe-warning' : 'text-soe-slate')}>
                          {row.evidenceGaps}
                        </td>
                        <td className="px-3 py-3 text-xs text-soe-slate">
                          {row.submission ? new Date(row.submission.updatedAt).toLocaleDateString() : '-'}
                        </td>
                        <td className="px-3 py-3">
                          {action.route ? (
                            <Link
                              className={cn(
                                'inline-flex items-center gap-1 rounded-control px-2.5 py-1.5 text-xs font-semibold',
                                action.tone === 'primary' ? 'bg-soe-blue text-white' : action.tone === 'critical' ? 'bg-[#fff0ef] text-soe-critical' : action.tone === 'warning' ? 'bg-[#fff4dd] text-[#8a5a05]' : action.tone === 'success' ? 'bg-[#e7f5f0] text-[#0d6b57]' : 'bg-soe-canvas text-soe-navy',
                              )}
                              to={action.route}
                            >
                              {action.label}
                              <ArrowRight size={13} aria-hidden />
                            </Link>
                          ) : (
                            <span className="text-xs text-soe-slate">{action.label}</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : null}
        </Card>
      </div>
    </div>
  )
}
