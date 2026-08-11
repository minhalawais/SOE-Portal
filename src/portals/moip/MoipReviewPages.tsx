import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  FileCheck2,
  MessageSquareWarning,
  RotateCcw,
  SearchCheck,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/design-system/components/Button'
import { Card } from '@/design-system/components/Card'
import { SelectField, TextareaField } from '@/design-system/components/Fields'
import { Alert, EmptyState, ErrorState, LoadingBlock } from '@/design-system/components/Feedback'
import { KpiCard } from '@/design-system/components/KpiCard'
import { ConfirmDialog } from '@/design-system/components/Overlays'
import { StatusBadge } from '@/design-system/components/StatusBadge'
import { ROLE_LABEL, SUBMISSION_STATUS, SUBMISSION_STATUS_LABEL, type SubmissionStatus } from '@/constants'
import { mockModuleReviewService } from '@/mock-services'
import { useSessionStore } from '@/state/session'
import { useUiStore } from '@/state/ui'
import { AppError, cn } from '@/utils'

type WorkspaceTab = 'data' | 'evidence' | 'findings' | 'history' | 'decision'

function statusLabel(status?: SubmissionStatus) {
  return status ? SUBMISSION_STATUS_LABEL[status] : 'Not submitted'
}

function invalidateReview(queryClient: ReturnType<typeof useQueryClient>, organizationId: string, periodId: string) {
  void queryClient.invalidateQueries({ queryKey: ['moip-module-review'] })
  void queryClient.invalidateQueries({ queryKey: ['moip-review-package', organizationId, periodId] })
  void queryClient.invalidateQueries({ queryKey: ['moip-submission-queue'] })
  void queryClient.invalidateQueries({ queryKey: ['moip-portfolio-module'] })
}

export function MoipReviewPackagePage() {
  const { organizationId = '' } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const periods = useSessionStore((state) => state.reportingPeriodId)
  const periodId = searchParams.get('period') ?? periods
  const query = useQuery({
    queryKey: ['moip-review-package', organizationId, periodId],
    queryFn: () => mockModuleReviewService.getPackage(organizationId, periodId),
    enabled: Boolean(organizationId && periodId),
  })
  const reportingPeriods = useMemo(
    () => [
      { value: 'period-fy2027', label: 'FY2027' },
      { value: 'period-fy2026', label: 'FY2026' },
      { value: 'period-fy2025', label: 'FY2025' },
      { value: 'period-fy2024', label: 'FY2024' },
    ],
    [],
  )

  if (query.isLoading) return <LoadingBlock label="Loading SOE review package…" />
  if (query.isError || !query.data) return <ErrorState title="Unable to load SOE review package" />
  const reviewPackage = query.data

  return (
    <div>
      <PageHeader
        title={`${reviewPackage.organization.name} review package`}
        subtitle={`${reviewPackage.periodLabel} · cross-module submission review and approval`}
        actions={<Link className="text-sm text-soe-blue hover:underline" to="/moip/portfolio">SOE portfolio</Link>}
      />

      <div className="mb-4 max-w-56">
        <SelectField
          label="Financial year"
          value={periodId}
          options={reportingPeriods}
          onChange={(event) => setSearchParams({ period: event.target.value })}
        />
      </div>

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <KpiCard label="Modules submitted" value={`${reviewPackage.submitted} / ${reviewPackage.modules.length}`} />
        <KpiCard label="Approved" value={String(reviewPackage.approved)} />
        <KpiCard label="Returned" value={String(reviewPackage.returned)} />
        <KpiCard label="Package completeness" value={`${reviewPackage.completeness}%`} />
        <KpiCard
          label="Review progress"
          value={`${Math.round((reviewPackage.approved / reviewPackage.modules.length) * 100)}%`}
        />
      </div>

      <section className="overflow-x-auto rounded-card border border-soe-border bg-white">
        <div className="grid grid-cols-[minmax(220px,1fr)_150px_120px_100px_44px] gap-x-4 border-b border-soe-border bg-soe-canvas px-4 py-2 text-xs font-semibold uppercase text-soe-slate">
          <span>Reporting module</span><span>Status</span><span>Completeness</span><span>Findings</span><span />
        </div>
        {reviewPackage.modules.map((module) => {
          const findingCount = module.blocking + module.warnings + module.evidenceGaps
          return (
            <div
              key={module.id}
              className="grid min-h-14 grid-cols-[minmax(220px,1fr)_150px_120px_100px_44px] items-center gap-x-4 border-b border-soe-border px-4 text-sm last:border-b-0"
            >
              <div>
                <p className="font-medium text-soe-navy">{module.label}</p>
                <p className="text-xs text-soe-slate">{module.submission?.version ? `Version ${module.submission.version}` : 'Awaiting SOE submission'}</p>
              </div>
              {module.submission ? (
                <StatusBadge status={module.submission.status} family="reporting" label={statusLabel(module.submission.status)} />
              ) : <span className="text-xs text-soe-slate">Not submitted</span>}
              <span>{module.submission?.completeness ?? 0}%</span>
              <span className={cn('font-medium', findingCount ? 'text-soe-critical' : 'text-soe-teal')}>{findingCount}</span>
              {module.submission ? (
                <Link
                  aria-label={`Review ${module.label}`}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-control text-soe-blue hover:bg-soe-canvas"
                  to={`/moip/submissions/${module.submission.id}`}
                ><ChevronRight size={18} /></Link>
              ) : null}
            </div>
          )
        })}
      </section>
    </div>
  )
}

export function MoipModuleReviewPage() {
  const { submissionId = '' } = useParams()
  const role = useSessionStore((state) => state.role)
  const pushToast = useUiStore((state) => state.pushToast)
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<WorkspaceTab>('data')
  const [field, setField] = useState('general')
  const [question, setQuestion] = useState('')
  const [returnReason, setReturnReason] = useState('')
  const [approvalStatement, setApprovalStatement] = useState('')
  const [confirmApprove, setConfirmApprove] = useState(false)

  const review = useQuery({
    queryKey: ['moip-module-review', submissionId],
    queryFn: () => mockModuleReviewService.getReview(submissionId),
    enabled: Boolean(submissionId),
  })
  const reviewPackage = useQuery({
    queryKey: ['moip-review-package', review.data?.submission.organizationId, review.data?.submission.reportingPeriodId],
    queryFn: () => mockModuleReviewService.getPackage(review.data!.submission.organizationId, review.data!.submission.reportingPeriodId),
    enabled: Boolean(review.data),
  })

  const mutationOptions = {
    onSuccess: () => {
      const data = review.data
      if (data) invalidateReview(queryClient, data.submission.organizationId, data.submission.reportingPeriodId)
    },
    onError: (error: unknown) => pushToast({
      title: error instanceof AppError ? error.message : 'Review action failed.',
      tone: 'critical' as const,
    }),
  }
  const takeMutation = useMutation({
    mutationFn: () => mockModuleReviewService.takeUnderReview(submissionId, role),
    ...mutationOptions,
    onSuccess: () => {
      mutationOptions.onSuccess()
      pushToast({ title: 'Module is now under review.', tone: 'success' })
    },
  })
  const clarifyMutation = useMutation({
    mutationFn: () => mockModuleReviewService.requestClarification(submissionId, role, field, question),
    ...mutationOptions,
    onSuccess: () => {
      mutationOptions.onSuccess()
      setQuestion('')
      pushToast({ title: 'Clarification sent to the SOE.', tone: 'success' })
    },
  })
  const returnMutation = useMutation({
    mutationFn: () => mockModuleReviewService.returnSubmission(submissionId, role, returnReason),
    ...mutationOptions,
    onSuccess: () => {
      mutationOptions.onSuccess()
      setReturnReason('')
      pushToast({ title: 'Module returned to the SOE.', tone: 'success' })
    },
  })
  const approveMutation = useMutation({
    mutationFn: () => mockModuleReviewService.approveSubmission(submissionId, role, approvalStatement),
    ...mutationOptions,
    onSuccess: () => {
      mutationOptions.onSuccess()
      setConfirmApprove(false)
      pushToast({ title: 'Module approved and locked.', tone: 'success' })
    },
  })

  if (review.isLoading) return <LoadingBlock label="Loading submitted module data…" />
  if (review.isError || !review.data) return <ErrorState title="Unable to load submitted module" />
  const data = review.data
  const status = data.submission.status
  const canStart = status === SUBMISSION_STATUS.SUBMITTED || status === SUBMISSION_STATUS.RESUBMITTED
  const canDecide = status === SUBMISSION_STATUS.UNDER_REVIEW
  const fieldOptions = [
    { value: 'general', label: 'General module finding' },
    ...data.records.flatMap((record) => record.fields.map((item) => ({ value: `${record.id}.${item.key}`, label: `${record.title} · ${item.label}` }))).slice(0, 200),
  ]
  const tabs: Array<{ id: WorkspaceTab; label: string }> = [
    { id: 'data', label: 'Submitted data' },
    { id: 'evidence', label: `Evidence (${data.evidence.length})` },
    { id: 'findings', label: `Validation (${data.validation.blocking + data.validation.warnings + data.validation.evidenceGaps})` },
    { id: 'history', label: 'History' },
    { id: 'decision', label: 'Review decision' },
  ]

  return (
    <div>
      <PageHeader
        title={`${data.organization.abbreviation} · ${data.moduleLabel}`}
        subtitle={`${data.periodLabel} · submitted version ${data.submission.version} · source values are read-only`}
        actions={<Link className="text-sm text-soe-blue hover:underline" to={`/moip/enterprise/${data.organization.id}/review?period=${data.submission.reportingPeriodId}`}>Review package</Link>}
      />

      <div className="mb-4 flex flex-wrap items-center gap-3 border-y border-soe-border bg-white px-4 py-3">
        <StatusBadge status={status} family="reporting" label={statusLabel(status)} />
        <span className="text-sm text-soe-slate">Completeness {data.submission.completeness}%</span>
        <span className="text-sm text-soe-slate">{data.records.length} submitted records</span>
        <span className="text-sm text-soe-slate">Reviewer {data.submission.assignedReviewerRole ? ROLE_LABEL[data.submission.assignedReviewerRole] : 'unassigned'}</span>
        {canStart ? <Button className="ml-auto" size="sm" loading={takeMutation.isPending} onClick={() => takeMutation.mutate()}><SearchCheck size={15} />Take under review</Button> : null}
      </div>

      <div className="grid gap-4 xl:grid-cols-[230px_minmax(0,1fr)]">
        <aside className="self-start overflow-hidden rounded-card border border-soe-border bg-white xl:sticky xl:top-4">
          <div className="border-b border-soe-border px-3 py-2 text-xs font-semibold uppercase text-soe-slate">Package modules</div>
          {(reviewPackage.data?.modules ?? []).map((module) => (
            module.submission ? (
              <Link
                key={module.id}
                className={cn('flex min-h-11 items-center justify-between border-b border-soe-border px-3 text-xs hover:bg-soe-canvas', module.submission.id === submissionId && 'bg-[#eaf3f9] font-semibold text-soe-blue')}
                to={`/moip/submissions/${module.submission.id}`}
              ><span>{module.label}</span><span className="text-soe-slate">{module.submission.completeness}%</span></Link>
            ) : <div key={module.id} className="flex min-h-11 items-center justify-between border-b border-soe-border px-3 text-xs text-soe-slate"><span>{module.label}</span><span>Missing</span></div>
          ))}
        </aside>

        <div className="min-w-0">
          <div className="mb-3 flex flex-wrap gap-1 border-b border-soe-border">
            {tabs.map((item) => (
              <button key={item.id} type="button" className={cn('min-h-10 border-b-2 px-3 text-sm font-medium', tab === item.id ? 'border-soe-blue text-soe-blue' : 'border-transparent text-soe-slate hover:text-soe-navy')} onClick={() => setTab(item.id)}>{item.label}</button>
            ))}
          </div>

          {tab === 'data' ? (
            <div className="space-y-3">
              {data.records.length ? data.records.map((record) => (
                <details key={`${record.section}-${record.id}`} className="group rounded-card border border-soe-border bg-white" open={data.records.length <= 8}>
                  <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between px-4 text-sm font-semibold text-soe-navy">
                    <span>{record.title}<span className="ml-2 text-xs font-normal text-soe-slate">{record.section}</span></span><ChevronRight className="transition group-open:rotate-90" size={17} />
                  </summary>
                  <dl className="grid border-t border-soe-border sm:grid-cols-2 lg:grid-cols-3">
                    {record.fields.map((item) => (
                      <div key={item.key} className="min-h-16 border-b border-r border-soe-border px-4 py-2.5">
                        <dt className="text-[11px] font-semibold uppercase text-soe-slate">{item.label}</dt>
                        <dd className="mt-1 break-words text-sm text-soe-ink">{item.value}</dd>
                      </div>
                    ))}
                  </dl>
                </details>
              )) : <EmptyState title="No submitted records" hint="Return this module if records are expected for the reporting period." />}
            </div>
          ) : null}

          {tab === 'evidence' ? (
            <Card title="Submitted evidence">
              {data.evidence.length ? <div className="divide-y divide-soe-border">{data.evidence.map((document) => (
                <div key={document.id} className="flex min-h-12 items-center justify-between gap-3 py-2 text-sm">
                  <div><p className="font-medium text-soe-navy">{document.title}</p><p className="text-xs text-soe-slate">{document.fileName} · version {document.version}</p></div>
                  <Link className="text-soe-blue hover:underline" to={`/moip/documents/${document.id}`}>Inspect</Link>
                </div>
              ))}</div> : <EmptyState title="No evidence linked" hint="A missing evidence finding will block approval where evidence is required." />}
            </Card>
          ) : null}

          {tab === 'findings' ? (
            <Card title="Automated validation">
              <div className="mb-4 grid gap-3 sm:grid-cols-3">
                <KpiCard label="Blocking" value={String(data.validation.blocking)} />
                <KpiCard label="Warnings" value={String(data.validation.warnings)} />
                <KpiCard label="Evidence gaps" value={String(data.validation.evidenceGaps)} />
              </div>
              {data.validation.messages.length ? <ul className="space-y-2">{data.validation.messages.map((message) => <li key={message} className="flex gap-2 rounded-control bg-[#fff7ed] px-3 py-2 text-sm text-soe-ink"><AlertTriangle className="mt-0.5 shrink-0 text-[#c76b00]" size={16} />{message}</li>)}</ul> : <Alert tone="success" title="No automated findings">The module is ready for reviewer judgment.</Alert>}
            </Card>
          ) : null}

          {tab === 'history' ? (
            <Card title="Submission and review history">
              {data.history.length ? <ol className="divide-y divide-soe-border">{data.history.map((event) => <li key={event.id} className="py-3 text-sm"><p className="font-medium capitalize text-soe-navy">{event.title}</p><p className="text-xs text-soe-slate">{new Date(event.occurredAt).toLocaleString()} · {event.actor?.replaceAll('_', ' ') ?? 'System'}</p>{event.comment ? <p className="mt-1 text-soe-ink">{event.comment}</p> : null}</li>)}</ol> : <EmptyState title="No review events yet" />}
            </Card>
          ) : null}

          {tab === 'decision' ? (
            <div className="grid gap-4 lg:grid-cols-2">
              <Card title="Request clarification" actions={<MessageSquareWarning size={18} className="text-[#c76b00]" />}>
                <div className="space-y-3"><SelectField label="Affected field or record" value={field} options={fieldOptions} onChange={(event) => setField(event.target.value)} /><TextareaField label="Question for the SOE" value={question} rows={3} onChange={(event) => setQuestion(event.target.value)} /><Button variant="secondary" disabled={!canDecide || !question.trim()} loading={clarifyMutation.isPending} onClick={() => clarifyMutation.mutate()}>Send clarification</Button></div>
              </Card>
              <Card title="Return module" actions={<RotateCcw size={18} className="text-soe-critical" />}>
                <div className="space-y-3"><TextareaField label="Required corrections" value={returnReason} rows={4} onChange={(event) => setReturnReason(event.target.value)} /><Button variant="destructive" disabled={!canDecide || !returnReason.trim()} loading={returnMutation.isPending} onClick={() => returnMutation.mutate()}>Return to SOE</Button></div>
              </Card>
              <Card className="lg:col-span-2" title="Approve submitted version" actions={<FileCheck2 size={18} className="text-soe-teal" />}>
                <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-end"><TextareaField label="Approval statement" value={approvalStatement} rows={2} onChange={(event) => setApprovalStatement(event.target.value)} hint="The approved submitted version becomes immutable." /><Button variant="teal" disabled={!canDecide || data.validation.blocking > 0} onClick={() => setConfirmApprove(true)}><CheckCircle2 size={16} />Approve and lock</Button></div>
              </Card>
            </div>
          ) : null}
        </div>
      </div>

      <ConfirmDialog open={confirmApprove} title="Approve submitted module" message={`Approve and lock ${data.organization.abbreviation} ${data.moduleLabel}, ${data.periodLabel}, version ${data.submission.version}? This decision is recorded in the audit history.`} confirmLabel="Approve and lock" onConfirm={() => approveMutation.mutate()} onCancel={() => setConfirmApprove(false)} />
    </div>
  )
}
