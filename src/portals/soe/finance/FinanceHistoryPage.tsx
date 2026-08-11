import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { AuditTimeline } from '@/components/timeline/AuditTimeline'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/design-system/components/Card'
import { EmptyState, ErrorState, LoadingBlock } from '@/design-system/components/Feedback'
import { RequirePermission } from '@/app/router/guards'
import { PERMISSION } from '@/permissions'
import {
  mockFinanceWorkflowService,
  mockHistoryIntelligenceService,
} from '@/mock-services'
import { RecordAttachmentsPanel } from '@/portals/shared/DocumentsEvidenceWorkspacePages'
import { useSessionStore } from '@/state/session'
import { formatCurrencyPkr } from '@/utils'

export function FinanceHistoryPage() {
  return (
    <RequirePermission permission={PERMISSION.FINANCE_READ}>
      <Content />
    </RequirePermission>
  )
}

function Content() {
  const organizationId = useSessionStore((s) => s.organizationId)
  const reportingPeriodId = useSessionStore((s) => s.reportingPeriodId)
  const role = useSessionStore((s) => s.role)

  const query = useQuery({
    queryKey: ['finance-workspace', organizationId, reportingPeriodId, role],
    queryFn: () =>
      mockFinanceWorkflowService.getWorkspace(organizationId, reportingPeriodId, role),
  })

  const submissionHistory = useQuery({
    queryKey: ['finance-submission-history', organizationId],
    queryFn: () =>
      mockHistoryIntelligenceService.getSubmissionHistory(organizationId, {
        module: 'finance',
      }),
  })

  if (query.isLoading) return <LoadingBlock />
  if (query.isError || !query.data) return <ErrorState title="Unable to load history" />

  const ws = query.data
  const submissionId = ws.submission?.id

  const timelineEvents =
    submissionHistory.data?.map((s) => ({
      id: s.id,
      organizationId: s.organizationId,
      occurredAt: s.occurredAt,
      title: `${s.action.replaceAll('_', ' ')}`,
      category: 'submission',
      actorRole: s.actorRole,
      status: s.status,
      comment: s.comment,
      relatedVersion: s.relatedVersion,
    })) ??
    ws.timeline.map((e) => ({
      id: e.id,
      organizationId,
      occurredAt: e.occurredAt,
      title: e.title,
      category: e.category,
    }))

  return (
    <div>
      <PageHeader
        title="Finance history"
        subtitle="Saves, certification, submission, clarification, approval"
        actions={
          <Link className="text-sm text-soe-blue underline" to="/soe/finance">
            Overview
          </Link>
        }
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Activity timeline">
          {submissionHistory.isLoading ? (
            <LoadingBlock label="Loading timeline…" />
          ) : (
            <AuditTimeline events={timelineEvents} emptyTitle="No timeline events yet" />
          )}
        </Card>

        <Card title="Version snapshots">
          {ws.versions.length === 0 ? (
            <EmptyState
              title="No version snapshots yet"
              hint="Snapshots are captured on certify, resubmit, and approve."
            />
          ) : (
            <ul className="space-y-3">
              {[...ws.versions].reverse().map((v) => (
                <li key={v.id} className="border-b border-soe-border pb-2 text-sm">
                  <p className="font-medium">
                    {v.version} · {v.reason}
                  </p>
                  <p className="text-xs text-soe-slate">
                    {new Date(v.capturedAt).toLocaleString()} · Revenue{' '}
                    {formatCurrencyPkr(v.values.revenue)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {submissionId ? (
          <div className="lg:col-span-2">
            <RecordAttachmentsPanel
              recordType="submission"
              recordId={submissionId}
              title="Submission evidence"
            />
          </div>
        ) : null}
      </div>
    </div>
  )
}
