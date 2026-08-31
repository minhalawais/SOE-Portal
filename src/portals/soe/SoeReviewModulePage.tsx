import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle,
  CheckCircle2,
  FileCheck2,
  MessageSquareWarning,
  RotateCcw,
} from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/design-system/components/Button'
import { Card } from '@/design-system/components/Card'
import { SelectField, TextareaField } from '@/design-system/components/Fields'
import { Alert, EmptyState, ErrorState, LoadingBlock } from '@/design-system/components/Feedback'
import { KpiCard } from '@/design-system/components/KpiCard'
import { Modal } from '@/design-system/components/Overlays'
import { StatusBadge } from '@/design-system/components/StatusBadge'
import { ROLE, ROLE_LABEL, SUBMISSION_STATUS, SUBMISSION_STATUS_LABEL, type RoleId } from '@/constants'
import { mockModuleReviewService } from '@/mock-services'
import { useSessionStore } from '@/state/session'
import { useUiStore } from '@/state/ui'
import { AppError } from '@/utils'

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
  const canDecide =
    role !== ROLE.SOE_EXECUTIVE && data.submission.status === SUBMISSION_STATUS.READY_FOR_CERTIFICATION
  const findingCount =
    data.validation.blocking + data.validation.warnings + data.validation.evidenceGaps
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
    <div className="space-y-5 pb-24">
      <PageHeader
        title={`${data.moduleLabel} review`}
        subtitle={`${data.organization.abbreviation} · ${data.periodLabel} · submitted version ${data.submission.version}`}
        actions={
          <Link className="text-sm text-soe-blue hover:underline" to="/soe-review/submissions">
            Back to submissions
          </Link>
        }
      />

      <div className="flex flex-wrap items-center gap-3 border-y border-soe-border bg-white px-4 py-3">
        <StatusBadge
          status={data.submission.status}
          family="reporting"
          label={SUBMISSION_STATUS_LABEL[data.submission.status]}
        />
        <span className="text-sm text-soe-slate">Completion {data.submission.completeness}%</span>
        <span className="text-sm text-soe-slate">{data.records.length} submitted records</span>
        <span className="text-sm text-soe-slate">{data.evidence.length} evidence files</span>
        <span className="text-sm text-soe-slate">Reviewer {ROLE_LABEL[role]}</span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Submitted records" value={String(data.records.length)} />
        <KpiCard label="Evidence files" value={String(data.evidence.length)} />
        <KpiCard label="Validation findings" value={String(findingCount)} />
        <KpiCard label="Blocking issues" value={String(data.validation.blocking)} />
      </div>

      <Alert
        tone={canDecide ? 'info' : data.submission.status === SUBMISSION_STATUS.CERTIFIED ? 'success' : 'warning'}
        title={statusHint}
      />

      <div className="space-y-3">
        {data.records.length ? (
          data.records.map((record) => (
            <details
              key={`${record.section}-${record.id}`}
              className="group rounded-card border border-soe-border bg-white"
              open={data.records.length <= 6}
            >
              <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between px-4 text-sm font-semibold text-soe-navy">
                <span>
                  {record.title}
                  <span className="ml-2 text-xs font-normal text-soe-slate">{record.section}</span>
                </span>
                <span className="text-xs text-soe-slate">{record.fields.length} fields</span>
              </summary>
              <dl className="grid border-t border-soe-border sm:grid-cols-2 xl:grid-cols-3">
                {record.fields.map((item) => (
                  <div key={item.key} className="min-h-16 border-b border-r border-soe-border px-4 py-2.5">
                    <dt className="text-[11px] font-semibold uppercase text-soe-slate">{item.label}</dt>
                    <dd className="mt-1 break-words text-sm text-soe-ink">{item.value}</dd>
                  </div>
                ))}
              </dl>
            </details>
          ))
        ) : (
          <EmptyState title="No submitted records" hint="Nothing was captured in this module snapshot." />
        )}
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Card title="Evidence attached" actions={<FileCheck2 size={18} className="text-soe-blue" />}>
          {data.evidence.length ? (
            <div className="divide-y divide-soe-border">
              {data.evidence.map((document) => (
                <div key={document.id} className="flex min-h-12 items-center justify-between gap-3 py-2 text-sm">
                  <div className="min-w-0">
                    <p className="font-medium text-soe-navy">{document.title}</p>
                    <p className="truncate text-xs text-soe-slate">
                      {document.fileName} · version {document.version}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-soe-slate">Filed</span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="No evidence linked" hint="Missing evidence should usually trigger clarification or return." />
          )}
        </Card>

        <Card
          title="Reviewer findings"
          actions={<AlertTriangle size={18} className="text-[#c76b00]" />}
        >
          <div className="mb-4 grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
            <KpiCard label="Blocking" value={String(data.validation.blocking)} />
            <KpiCard label="Warnings" value={String(data.validation.warnings)} />
            <KpiCard label="Evidence gaps" value={String(data.validation.evidenceGaps)} />
          </div>
          {data.validation.messages.length ? (
            <ul className="space-y-2">
              {data.validation.messages.map((message) => (
                <li
                  key={message}
                  className="rounded-control bg-[#fff7ed] px-3 py-2 text-sm text-soe-ink"
                >
                  {message}
                </li>
              ))}
            </ul>
          ) : (
            <Alert tone="success" title="No automated findings" />
          )}
        </Card>
      </div>

      <Card title="Review history">
        {data.history.length ? (
          <ol className="divide-y divide-soe-border">
            {data.history.map((event) => (
              <li key={event.id} className="py-3 text-sm">
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
          <EmptyState title="No review events yet" />
        )}
      </Card>

      {canDecide ? (
        <div className="fixed bottom-6 left-1/2 z-[45] w-[min(1080px,calc(100vw-1.5rem))] -translate-x-1/2 px-2">
          <div className="flex flex-col gap-3 rounded-[16px] border border-soe-border bg-white/96 px-4 py-3 shadow-[0_18px_40px_rgba(15,23,42,0.12)] backdrop-blur sm:flex-row sm:items-center sm:justify-between">
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
                className="h-10 rounded-full border border-[#b8cee2] bg-white px-4 font-semibold text-soe-blue hover:border-soe-blue hover:bg-[#f5faff]"
                onClick={() => setActionModal('clarify')}
              >
                <MessageSquareWarning size={16} className="text-soe-blue" />
                Request clarification
              </Button>
              <Button
                variant="tertiary"
                className="h-10 rounded-full border border-[#ebc4c4] bg-[#fff5f5] px-4 font-semibold text-soe-critical hover:border-soe-critical hover:bg-[#ffecec]"
                onClick={() => setActionModal('return')}
              >
                <RotateCcw size={16} className="text-soe-critical" />
                Reject / return
              </Button>
              <Button
                variant="teal"
                className="h-10 rounded-full px-4 font-semibold shadow-md shadow-[#7cc7bd]/25 disabled:opacity-50"
                disabled={data.validation.blocking > 0}
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
              disabled={!canDecide || !question.trim()}
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
              disabled={!canDecide || !returnReason.trim()}
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
            <Button
              variant="teal"
              disabled={!canDecide || data.validation.blocking > 0}
              loading={approveMutation.isPending}
              onClick={() => approveMutation.mutate()}
            >
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
