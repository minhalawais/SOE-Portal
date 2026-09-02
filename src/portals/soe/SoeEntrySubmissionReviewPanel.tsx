import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { EvidenceRepositoryPanel } from '@/components/soe'
import { Alert, EmptyState, ErrorState, LoadingBlock } from '@/design-system/components/Feedback'
import { KpiGrid, KpiValue } from '@/design-system/components/KpiCard'
import { StatusBadge } from '@/design-system/components/StatusBadge'
import { ROLE_LABEL, SUBMISSION_STATUS, SUBMISSION_STATUS_LABEL, type RoleId } from '@/constants'
import { latestReturnReviewerComment, mockModuleReviewService } from '@/mock-services'
import { useSessionStore } from '@/state/session'

export function SoeEntrySubmissionReviewPanel({
  submissionId,
  moduleRoute,
  nextAction,
}: {
  submissionId: string
  moduleRoute: string
  nextAction: string
}) {
  const organizationId = useSessionStore((state) => state.organizationId)
  const role = useSessionStore((state) => state.role)

  const review = useQuery({
    queryKey: ['soe-entry-module-review', submissionId, organizationId, role],
    queryFn: () => mockModuleReviewService.getEntryModuleReview(submissionId, role, organizationId),
    enabled: Boolean(submissionId),
  })

  if (review.isLoading) return <LoadingBlock label="Loading module submission…" />
  if (review.isError || !review.data) {
    return <ErrorState title="Unable to load module submission review" />
  }

  const data = review.data
  const returnComment =
    data.submission.status === SUBMISSION_STATUS.RETURNED
      ? latestReturnReviewerComment(data.history)
      : undefined
  const findingCount =
    data.validation.blocking + data.validation.warnings + data.validation.evidenceGaps
  const statusHint =
    data.submission.status === SUBMISSION_STATUS.CERTIFIED
      ? 'This module is certified and ready for period submission.'
      : data.submission.status === SUBMISSION_STATUS.CLARIFICATION_REQUESTED
        ? 'Clarification has been requested. Respond before resubmitting.'
        : data.submission.status === SUBMISSION_STATUS.RETURNED
          ? 'This module was returned for correction.'
          : data.submission.status === SUBMISSION_STATUS.DRAFT
            ? 'Draft in progress. Continue data entry to complete this module.'
            : 'Review the submitted data, evidence and findings for this module.'

  return (
    <div className="pb-2">
      <div className="mb-4">
        <p className="text-sm font-semibold text-soe-navy">{data.moduleLabel}</p>
        <p className="mt-0.5 text-xs text-soe-slate">
          {data.organization.abbreviation} · {data.periodLabel} · version {data.submission.version}
        </p>
      </div>

      <div className="mb-4 overflow-hidden rounded-card border border-soe-border bg-white shadow-[var(--shadow-sm)]">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-soe-border bg-[linear-gradient(180deg,#f8fbff_0%,#ffffff_100%)] px-3 py-2.5">
          <StatusBadge
            status={data.submission.status}
            family="reporting"
            label={SUBMISSION_STATUS_LABEL[data.submission.status]}
          />
          <div className="flex min-w-[140px] flex-1 items-center gap-2">
            <span className="text-xs font-medium text-soe-slate">Completion</span>
            <div className="h-1.5 max-w-32 flex-1 overflow-hidden rounded-full bg-soe-canvas">
              <div
                className="h-full rounded-full bg-soe-teal"
                style={{ width: `${data.submission.completeness}%` }}
              />
            </div>
            <span className="text-xs font-semibold tabular-nums text-soe-navy">
              {data.submission.completeness}%
            </span>
          </div>
          <span className="text-xs text-soe-slate">{data.records.length} records</span>
          <span className="text-xs text-soe-slate">{data.evidence.length} evidence</span>
        </div>
        <div className="p-3">
          <KpiGrid>
            <KpiValue label="Submitted records" value={String(data.records.length)} />
            <KpiValue label="Evidence files" value={String(data.evidence.length)} />
            <KpiValue label="Validation findings" value={String(findingCount)} />
            <KpiValue label="Blocking issues" value={String(data.validation.blocking)} />
          </KpiGrid>
        </div>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.65fr)_minmax(240px,20rem)]">
        <div className="space-y-4">
          {returnComment ? (
            <div className="rounded-card border border-[#fde68a] bg-[#fffbeb] px-3 py-3 shadow-[var(--shadow-xs)]">
              <p className="text-[11px] font-semibold uppercase text-soe-slate">Reviewer comments</p>
              <p className="mt-1.5 text-sm leading-5 text-soe-ink">{returnComment.comment}</p>
              <p className="mt-2 text-xs text-soe-slate">
                {returnComment.actor
                  ? `${ROLE_LABEL[returnComment.actor as RoleId] ?? returnComment.actor} · `
                  : ''}
                {new Date(returnComment.occurredAt).toLocaleString('en-GB')}
              </p>
            </div>
          ) : null}

          <Alert
            tone={
              data.submission.status === SUBMISSION_STATUS.CERTIFIED
                ? 'success'
                : data.submission.status === SUBMISSION_STATUS.RETURNED ||
                    data.submission.status === SUBMISSION_STATUS.CLARIFICATION_REQUESTED
                  ? 'warning'
                  : 'info'
            }
            title={statusHint}
          />

          <section className="overflow-hidden rounded-card border border-soe-border bg-white shadow-[var(--shadow-xs)]">
            <header className="flex items-center justify-between border-b border-soe-border px-3 py-2.5">
              <div>
                <h2 className="text-sm font-semibold text-soe-navy">Submitted data</h2>
                <p className="mt-0.5 text-xs text-soe-slate">Expand each record to inspect field values.</p>
              </div>
              <span className="text-xs font-medium text-soe-slate">{data.records.length} records</span>
            </header>
            <div className="divide-y divide-soe-border">
              {data.records.length ? (
                data.records.map((record) => (
                  <details
                    key={`${record.section}-${record.id}`}
                    className="group"
                    open={data.records.length <= 4}
                  >
                    <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 hover:bg-[#f8fafc]">
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-soe-navy">{record.title}</span>
                        <span className="mt-0.5 block text-xs text-soe-slate">{record.section}</span>
                      </span>
                      <span className="flex shrink-0 items-center gap-2 text-xs text-soe-slate">
                        {record.fields.length} fields
                        <ChevronRight
                          size={14}
                          className="transition-transform group-open:rotate-90"
                          aria-hidden
                        />
                      </span>
                    </summary>
                    <dl className="grid border-t border-soe-border bg-[#fbfdff] sm:grid-cols-2">
                      {record.fields.map((item) => (
                        <div
                          key={item.key}
                          className="min-h-14 border-b border-r border-soe-border px-3 py-2 last:border-r-0"
                        >
                          <dt className="text-[11px] font-semibold uppercase text-soe-slate">{item.label}</dt>
                          <dd className="mt-1 break-words text-sm text-soe-ink">{item.value}</dd>
                        </div>
                      ))}
                    </dl>
                  </details>
                ))
              ) : (
                <div className="p-3">
                  <EmptyState title="No submitted records" hint="Nothing was captured in this module snapshot." />
                </div>
              )}
            </div>
          </section>

          <section className="overflow-hidden rounded-card border border-soe-border bg-white shadow-[var(--shadow-xs)]">
            <header className="flex items-center gap-2 border-b border-soe-border px-3 py-2.5">
              <AlertTriangle size={16} className="text-[#c76b00]" aria-hidden />
              <div>
                <h2 className="text-sm font-semibold text-soe-navy">Validation findings</h2>
                <p className="mt-0.5 text-xs text-soe-slate">
                  {data.validation.blocking} blocking · {data.validation.warnings} warnings ·{' '}
                  {data.validation.evidenceGaps} evidence gaps
                </p>
              </div>
            </header>
            <div className="p-3">
              {data.validation.messages.length ? (
                <ul className="space-y-2">
                  {data.validation.messages.map((message) => (
                    <li
                      key={message}
                      className="rounded-control border border-[#fde4c7] bg-[#fff7ed] px-3 py-2 text-sm text-soe-ink"
                    >
                      {message}
                    </li>
                  ))}
                </ul>
              ) : (
                <Alert tone="success" title="No automated findings" />
              )}
            </div>
          </section>

          <section className="overflow-hidden rounded-card border border-soe-border bg-white shadow-[var(--shadow-xs)]">
            <header className="border-b border-soe-border px-3 py-2.5">
              <h2 className="text-sm font-semibold text-soe-navy">Review history</h2>
            </header>
            {data.history.length ? (
              <ol className="divide-y divide-soe-border">
                {data.history.map((event) => (
                  <li key={event.id} className="px-3 py-2.5 text-sm">
                    <p className="font-medium capitalize text-soe-navy">{event.title}</p>
                    <p className="text-xs text-soe-slate">
                      {new Date(event.occurredAt).toLocaleString()} ·{' '}
                      {event.actor ? ROLE_LABEL[event.actor as RoleId] ?? event.actor : 'System'}
                    </p>
                    {event.comment ? <p className="mt-1 text-soe-ink">{event.comment}</p> : null}
                  </li>
                ))}
              </ol>
            ) : (
              <div className="p-3">
                <EmptyState title="No review events yet" />
              </div>
            )}
          </section>
        </div>

        <aside>
          <EvidenceRepositoryPanel
            documents={data.evidence}
            subtitle={`${data.moduleLabel} evidence · ${data.periodLabel}`}
            emptyHint="Attach required documents in the module workspace."
          />
        </aside>
      </div>

      <div className="sticky bottom-0 mt-4 border-t border-soe-border bg-white pt-3">
        <Link
          to={moduleRoute}
          className="inline-flex h-10 w-full items-center justify-center rounded-control border border-soe-blue bg-white text-sm font-medium text-soe-blue hover:bg-soe-canvas"
        >
          {nextAction}
        </Link>
      </div>
    </div>
  )
}
