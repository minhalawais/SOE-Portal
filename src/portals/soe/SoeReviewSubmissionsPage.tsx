import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { AlertTriangle, ArrowRight, BadgeCheck, FileWarning, ShieldCheck } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/design-system/components/Card'
import { StatusBadge } from '@/design-system/components/StatusBadge'
import { ErrorState, LoadingBlock } from '@/design-system/components/Feedback'
import { mockSoePortalService } from '@/mock-services'
import { useSessionStore } from '@/state/session'
import { SUBMISSION_STATUS, SUBMISSION_STATUS_LABEL } from '@/constants'
import { cn } from '@/utils'

function actionFor(row: Awaited<ReturnType<typeof mockSoePortalService.getReportingWorkspace>>['modules'][number]) {
  if (row.submission.status === SUBMISSION_STATUS.READY_FOR_CERTIFICATION) {
    return {
      label: row.def.id === 'finance' ? 'Certify finance pack' : 'Review submission',
      route:
        row.def.id === 'finance'
          ? '/soe-review/finance/certify'
          : `/soe-review/submissions/${row.submission.id}`,
      tone: 'primary' as const,
    }
  }
  if (row.submission.status === SUBMISSION_STATUS.CLARIFICATION_REQUESTED) {
    return {
      label: 'Clarification requested',
      route: `/soe-review/submissions/${row.submission.id}`,
      tone: 'critical' as const,
    }
  }
  if (row.submission.status === SUBMISSION_STATUS.RETURNED) {
    return {
      label: 'Returned to SOE team',
      route: `/soe-review/submissions/${row.submission.id}`,
      tone: 'critical' as const,
    }
  }
  if (row.submission.status === SUBMISSION_STATUS.CERTIFIED) {
    return {
      label: 'Approved for submission',
      route: `/soe-review/submissions/${row.submission.id}`,
      tone: 'success' as const,
    }
  }
  if (row.evidenceGapCount > 0 || row.validationIssueCount > 0) {
    return {
      label: 'Needs correction',
      route: `/soe-review/submissions/${row.submission.id}`,
      tone: 'warning' as const,
    }
  }
  return {
    label: 'Review submission',
    route: `/soe-review/submissions/${row.submission.id}`,
    tone: 'primary' as const,
  }
}

function Kpi({ label, value, detail, icon: Icon, tone = 'neutral' }: { label: string; value: string; detail: string; icon: typeof BadgeCheck; tone?: 'neutral' | 'success' | 'warning' | 'critical' }) {
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

export function SoeReviewSubmissionsPage() {
  const organizationId = useSessionStore((s) => s.organizationId)
  const reportingPeriodId = useSessionStore((s) => s.reportingPeriodId)
  const role = useSessionStore((s) => s.role)

  const workspace = useQuery({
    queryKey: ['soe-review-submissions', organizationId, reportingPeriodId, role],
    queryFn: () => mockSoePortalService.getReportingWorkspace(organizationId, reportingPeriodId, role),
  })
  const readiness = useQuery({
    queryKey: ['soe-review-readiness-summary', organizationId, reportingPeriodId],
    queryFn: () => mockSoePortalService.getSubmissionReadiness(organizationId, reportingPeriodId),
  })

  if (workspace.isLoading || readiness.isLoading) return <LoadingBlock label="Loading submissions and approvals..." />
  if (workspace.isError || readiness.isError || !workspace.data || !readiness.data) {
    return <ErrorState title="Unable to load submissions and approvals" />
  }

  const rows = workspace.data.modules
  const readyForCertification = rows.filter((row) => row.submission.status === SUBMISSION_STATUS.READY_FOR_CERTIFICATION).length
  const certified = rows.filter((row) => row.submission.status === SUBMISSION_STATUS.CERTIFIED).length
  const returned = rows.filter((row) => [SUBMISSION_STATUS.RETURNED, SUBMISSION_STATUS.CLARIFICATION_REQUESTED].includes(row.submission.status as never)).length
  const evidence = readiness.data.missingEvidence.length

  return (
    <div className="space-y-5">
      <PageHeader
        title="Submissions & Approvals"
        subtitle={`${readiness.data.organization.abbreviation} · ${readiness.data.period.label} · internal review, certification and submission readiness`}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Kpi label="Overall readiness" value={`${workspace.data.overallCompletion}%`} detail="Average module completion" icon={BadgeCheck} tone={workspace.data.overallCompletion >= 90 ? 'success' : 'warning'} />
        <Kpi label="Awaiting certification" value={String(readyForCertification)} detail="Modules ready for reviewer sign-off" icon={ShieldCheck} tone={readyForCertification ? 'warning' : 'neutral'} />
        <Kpi label="Certified" value={String(certified)} detail="Ready for period submission" icon={BadgeCheck} tone={certified ? 'success' : 'neutral'} />
        <Kpi label="Returned / clarification" value={String(returned)} detail="Needs SOE team response" icon={AlertTriangle} tone={returned ? 'critical' : 'success'} />
        <Kpi label="Evidence gaps" value={String(evidence)} detail="Must be cleared before submission" icon={FileWarning} tone={evidence ? 'warning' : 'success'} />
      </div>

      <Card
        title="Reviewer action list"
        subtitle="One row per submission module; use the next action only when the row is ready for that step."
        actions={<Link className="text-xs font-semibold text-soe-blue hover:underline" to="/soe-review/logs">Open logs</Link>}
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
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
              {rows.map((row) => {
                const action = actionFor(row)
                return (
                  <tr key={row.submission.id} className="border-b border-soe-border last:border-b-0 hover:bg-[#f8fafc]">
                    <td className="px-3 py-3">
                      <p className="font-semibold text-soe-navy">{row.def.label}</p>
                      <p className="mt-0.5 text-[11px] text-soe-slate">v{row.submission.version}</p>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-1.5 w-28 overflow-hidden rounded-full bg-soe-canvas">
                          <div className="h-full rounded-full bg-soe-blue" style={{ width: `${row.submission.completeness}%` }} />
                        </div>
                        <span className="text-xs font-semibold text-soe-navy tabular-nums">{row.submission.completeness}%</span>
                      </div>
                    </td>
                    <td className="px-3 py-3"><StatusBadge status={row.submission.status} label={SUBMISSION_STATUS_LABEL[row.submission.status]} /></td>
                    <td className={cn('px-3 py-3 text-center font-semibold tabular-nums', row.validationIssueCount ? 'text-soe-critical' : 'text-soe-slate')}>{row.validationIssueCount}</td>
                    <td className={cn('px-3 py-3 text-center font-semibold tabular-nums', row.evidenceGapCount ? 'text-soe-warning' : 'text-soe-slate')}>{row.evidenceGapCount}</td>
                    <td className="px-3 py-3 text-xs text-soe-slate">{new Date(row.submission.updatedAt).toLocaleDateString()}</td>
                    <td className="px-3 py-3">
                      <Link className={cn('inline-flex items-center gap-1 rounded-control px-2.5 py-1.5 text-xs font-semibold', action.tone === 'primary' ? 'bg-soe-blue text-white' : action.tone === 'critical' ? 'bg-[#fff0ef] text-soe-critical' : action.tone === 'warning' ? 'bg-[#fff4dd] text-[#8a5a05]' : action.tone === 'success' ? 'bg-[#e7f5f0] text-[#0d6b57]' : 'bg-soe-canvas text-soe-navy')} to={action.route}>
                        {action.label}
                        <ArrowRight size={13} aria-hidden />
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
