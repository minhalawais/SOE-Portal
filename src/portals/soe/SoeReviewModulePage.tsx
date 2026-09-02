import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  MessageSquareWarning,
  RotateCcw,
} from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { EvidenceRepositoryPanel } from '@/components/soe'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/design-system/components/Button'
import { SelectField, TextareaField } from '@/design-system/components/Fields'
import { Alert, EmptyState, ErrorState, LoadingBlock } from '@/design-system/components/Feedback'
import { KpiGrid, KpiValue } from '@/design-system/components/KpiCard'
import { Modal } from '@/design-system/components/Overlays'
import { StatusBadge } from '@/design-system/components/StatusBadge'
import { ROLE, ROLE_LABEL, SUBMISSION_STATUS, SUBMISSION_STATUS_LABEL, type RoleId } from '@/constants'
import { latestReturnReviewerComment, mockModuleReviewService } from '@/mock-services'
import { useSessionStore } from '@/state/session'
import { useUiStore } from '@/state/ui'
import { AppError, cn } from '@/utils'

function invalidateSoeReview(
  queryClient: ReturnType<typeof useQueryClient>,
  organizationId: string,
  reportingPeriodId: string,
  role: RoleId,
) {
  void queryClient.invalidateQueries({ queryKey: ['soe-review-module', organizationId, reportingPeriodId] })
  void queryClient.invalidateQueries({
    queryKey: ['soe-review-submissions', organizationId, reportingPeriodId, role],
  })
  void queryClient.invalidateQueries({
    queryKey: ['soe-review-readiness-summary', organizationId, reportingPeriodId],
  })
  void queryClient.invalidateQueries({ queryKey: ['soe-dashboard', organizationId, reportingPeriodId, role] })
}

export function SoeReviewModulePage() {
  const { submissionId = '' } = useParams()
  const role = useSessionStore((state) => state.role)
  const pushToast = useUiStore((state) => state.pushToast)
  const queryClient = useQueryClient()
  const [field, setField] = useState('general')
  const [question, setQuestion] = useState('')
  const [returnReason, setReturnReason] = useState('')
  const [approvalStatement, setApprovalStatement] = useState('')
  const [actionModal, setActionModal] = useState<'clarify' | 'return' | 'approve' | null>(null)

  const review = useQuery({
    queryKey: ['soe-review-module', submissionId, role],
    queryFn: () => mockModuleReviewService.getSoeReview(submissionId, role),
    enabled: Boolean(submissionId),
  })

  const mutationOptions = {
    onSuccess: () => {
      const data = review.data
      if (data) {
        invalidateSoeReview(
          queryClient,
          data.organization.id,
          data.submission.reportingPeriodId,
          role,
        )
      }
    },
    onError: (error: unknown) =>
      pushToast({
        title: error instanceof AppError ? error.message : 'Reviewer action failed.',
        tone: 'critical',
      }),
  }

  const clarifyMutation = useMutation({
    mutationFn: () => mockModuleReviewService.requestSoeClarification(submissionId, role, field, question),
    ...mutationOptions,
    onSuccess: () => {
      mutationOptions.onSuccess()
      setQuestion('')
      pushToast({ title: 'Clarification sent to the SOE data-entry team.', tone: 'success' })
    },
  })

  const returnMutation = useMutation({
    mutationFn: () => mockModuleReviewService.returnSoeSubmission(submissionId, role, returnReason),
    ...mutationOptions,
    onSuccess: () => {
      mutationOptions.onSuccess()
      setReturnReason('')
      pushToast({ title: 'Module returned to the SOE data-entry team.', tone: 'success' })
    },
  })

  const approveMutation = useMutation({
    mutationFn: () => mockModuleReviewService.approveSoeSubmission(submissionId, role, approvalStatement),
    ...mutationOptions,
    onSuccess: () => {
      mutationOptions.onSuccess()
      setActionModal(null)
      pushToast({ title: 'Module approved for period submission.', tone: 'success' })
    },
  })

  if (review.isLoading) return <LoadingBlock label="Loading submitted module data..." />
  if (review.isError || !review.data) return <ErrorState title="Unable to load reviewer module view" />

  const data = review.data
  const showDecisionBar = role !== ROLE.SOE_EXECUTIVE
  const findingCount =
    data.validation.blocking + data.validation.warnings + data.validation.evidenceGaps
  const returnComment =
    data.submission.status === SUBMISSION_STATUS.RETURNED
      ? latestReturnReviewerComment(data.history)
      : undefined
  const fieldOptions = [
    { value: 'general', label: 'General module clarification' },
    ...data.records
      .flatMap((record) =>
        record.fields.map((item) => ({
          value: `${record.id}.${item.key}`,
          label: `${record.title} · ${item.label}`,
        })),
      )
      .slice(0, 200),
  ]
  const statusHint =
    data.submission.status === SUBMISSION_STATUS.CERTIFIED
      ? 'This module is already approved at SOE reviewer level and is ready for period submission.'
      : data.submission.status === SUBMISSION_STATUS.CLARIFICATION_REQUESTED
        ? 'An internal clarification has already been sent to the SOE data-entry team.'
        : data.submission.status === SUBMISSION_STATUS.RETURNED
          ? 'This module was returned for correction and will come back after resubmission.'
          : 'Review the submitted data, evidence and findings before taking a decision.'

  return (
    <div className="pb-24">
      <PageHeader
        title={`${data.moduleLabel} review`}
        subtitle={`${data.organization.abbreviation} · ${data.periodLabel} · submitted version ${data.submission.version}`}
        actions={
          <Link className="text-sm text-soe-blue hover:underline" to="/soe-review/submissions">
            Back to submissions
          </Link>
        }
      />

      <div className="mb-4 overflow-hidden rounded-card border border-soe-border bg-white shadow-[var(--shadow-sm)]">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-soe-border bg-[linear-gradient(180deg,#f8fbff_0%,#ffffff_100%)] px-4 py-3">
          <StatusBadge
            status={data.submission.status}
            family="reporting"
            label={SUBMISSION_STATUS_LABEL[data.submission.status]}
          />
          <div className="flex min-w-[160px] flex-1 items-center gap-2">
            <span className="text-xs font-medium text-soe-slate">Completion</span>
            <div className="h-1.5 max-w-40 flex-1 overflow-hidden rounded-full bg-soe-canvas">
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
          <span className="text-xs text-soe-slate">{data.evidence.length} evidence files</span>
          <span className="text-xs text-soe-slate">Reviewer {ROLE_LABEL[role]}</span>
        </div>

        <div className="p-4">
          <KpiGrid>
            <KpiValue label="Submitted records" value={String(data.records.length)} />
            <KpiValue label="Evidence files" value={String(data.evidence.length)} />
            <KpiValue label="Validation findings" value={String(findingCount)} />
            <KpiValue label="Blocking issues" value={String(data.validation.blocking)} />
          </KpiGrid>
        </div>
      </div>

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(280px,22rem)]">
        <div className="space-y-4">
          {returnComment ? (
            <div className="rounded-card border border-[#fde68a] bg-[#fffbeb] px-4 py-3 shadow-[var(--shadow-xs)]">
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
            tone={data.submission.status === SUBMISSION_STATUS.CERTIFIED ? 'success' : 'info'}
            title={statusHint}
          />

          <section className="overflow-hidden rounded-card border border-soe-border bg-white shadow-[var(--shadow-xs)]">
            <header className="flex items-center justify-between border-b border-soe-border px-4 py-3">
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
                    open={data.records.length <= 6}
                  >
                    <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-4 py-2.5 hover:bg-[#f8fafc]">
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
                          className="min-h-14 border-b border-r border-soe-border px-4 py-2.5 last:border-r-0"
                        >
                          <dt className="text-[11px] font-semibold uppercase text-soe-slate">{item.label}</dt>
                          <dd className="mt-1 break-words text-sm text-soe-ink">{item.value}</dd>
                        </div>
                      ))}
                    </dl>
                  </details>
                ))
              ) : (
                <div className="p-4">
                  <EmptyState title="No submitted records" hint="Nothing was captured in this module snapshot." />
                </div>
              )}
            </div>
          </section>

          <section className="overflow-hidden rounded-card border border-soe-border bg-white shadow-[var(--shadow-xs)]">
            <header className="flex items-center gap-2 border-b border-soe-border px-4 py-3">
              <AlertTriangle size={16} className="text-[#c76b00]" aria-hidden />
              <div>
                <h2 className="text-sm font-semibold text-soe-navy">Validation findings</h2>
                <p className="mt-0.5 text-xs text-soe-slate">
                  {data.validation.blocking} blocking · {data.validation.warnings} warnings ·{' '}
                  {data.validation.evidenceGaps} evidence gaps
                </p>
              </div>
            </header>
            <div className="p-4">
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
            <header className="border-b border-soe-border px-4 py-3">
              <h2 className="text-sm font-semibold text-soe-navy">Review history</h2>
            </header>
            {data.history.length ? (
              <ol className="divide-y divide-soe-border">
                {data.history.map((event) => (
                  <li key={event.id} className="px-4 py-3 text-sm">
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
              <div className="p-4">
                <EmptyState title="No review events yet" />
              </div>
            )}
          </section>
        </div>

        <aside className="xl:sticky xl:top-4">
          <EvidenceRepositoryPanel
            documents={data.evidence}
            subtitle={`${data.moduleLabel} evidence · ${data.periodLabel}`}
            emptyHint="No evidence files linked to this submission."
          />
        </aside>
      </div>

      {showDecisionBar ? (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-soe-border bg-white/95 px-4 py-3 shadow-[0_-10px_30px_rgba(15,23,42,0.10)] backdrop-blur">
          <div className="mx-auto flex max-w-[1400px] flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 pr-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-soe-slate">
                Reviewer actions
              </p>
              <p className="text-sm font-medium text-soe-ink">
                Record one decision after reviewing the submitted data and evidence.
              </p>
            </div>
            <div className="flex flex-wrap gap-2.5 sm:flex-nowrap">
              <Button
                variant="tertiary"
                className={cn(
                  'h-10 rounded-full border border-[#b8cee2] bg-white px-4 font-semibold text-soe-blue',
                  'hover:border-soe-blue hover:bg-[#f5faff]',
                )}
                onClick={() => setActionModal('clarify')}
              >
                <MessageSquareWarning size={16} className="text-soe-blue" />
                Request clarification
              </Button>
              <Button
                variant="tertiary"
                className={cn(
                  'h-10 rounded-full border border-[#ebc4c4] bg-[#fff5f5] px-4 font-semibold text-soe-critical',
                  'hover:border-soe-critical hover:bg-[#ffecec]',
                )}
                onClick={() => setActionModal('return')}
              >
                <RotateCcw size={16} className="text-soe-critical" />
                Reject / return
              </Button>
              <Button
                variant="teal"
                className="h-10 rounded-full px-4 font-semibold shadow-md shadow-[#7cc7bd]/25"
                onClick={() => setActionModal('approve')}
              >
                <CheckCircle2 size={16} />
                Approve module
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <Modal
        open={actionModal === 'clarify'}
        title="Request clarification"
        onClose={() => setActionModal(null)}
        footer={
          <>
            <Button variant="tertiary" onClick={() => setActionModal(null)}>
              Cancel
            </Button>
            <Button
              variant="secondary"
              disabled={!question.trim()}
              loading={clarifyMutation.isPending}
              onClick={() => clarifyMutation.mutate()}
            >
              Send clarification
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="rounded-control border border-[#f3d7a7] bg-[#fff8eb] px-3 py-2 text-sm text-soe-ink">
            Ask for a precise correction so the SOE data-entry team knows exactly what to fix.
          </div>
          <SelectField
            label="Affected field or record"
            value={field}
            options={fieldOptions}
            onChange={(event) => setField(event.target.value)}
          />
          <TextareaField
            label="Clarification required from SOE data entry"
            value={question}
            rows={5}
            onChange={(event) => setQuestion(event.target.value)}
          />
        </div>
      </Modal>

      <Modal
        open={actionModal === 'return'}
        title="Reject / return module"
        onClose={() => setActionModal(null)}
        footer={
          <>
            <Button variant="tertiary" onClick={() => setActionModal(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={!returnReason.trim()}
              loading={returnMutation.isPending}
              onClick={() => returnMutation.mutate()}
            >
              Reject and return
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="rounded-control border border-[#f1c9c9] bg-[#fff4f4] px-3 py-2 text-sm text-soe-ink">
            Use return only when the module needs correction before it can proceed further.
          </div>
          <TextareaField
            label="Correction instructions"
            value={returnReason}
            rows={6}
            onChange={(event) => setReturnReason(event.target.value)}
          />
        </div>
      </Modal>

      <Modal
        open={actionModal === 'approve'}
        title="Approve for submission"
        onClose={() => setActionModal(null)}
        footer={
          <>
            <Button variant="tertiary" onClick={() => setActionModal(null)}>
              Cancel
            </Button>
            <Button variant="teal" loading={approveMutation.isPending} onClick={() => approveMutation.mutate()}>
              Approve module
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="rounded-control border border-[#bfe5db] bg-[#effaf7] px-3 py-2 text-sm text-soe-ink">
            This moves the module into certified status for period submission.
          </div>
          <TextareaField
            label="Approval note"
            value={approvalStatement}
            rows={4}
            onChange={(event) => setApprovalStatement(event.target.value)}
            hint="Capture the reviewer rationale or any conditions already satisfied."
          />
        </div>
      </Modal>
    </div>
  )
}
