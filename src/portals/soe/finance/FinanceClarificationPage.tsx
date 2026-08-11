import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { WorkflowChrome } from '@/components/workflow/WorkflowChrome'
import { Card } from '@/design-system/components/Card'
import { TextareaField, MockFileControl } from '@/design-system/components/Fields'
import { Button } from '@/design-system/components/Button'
import { EmptyState, ErrorState, LoadingBlock } from '@/design-system/components/Feedback'
import { ConfirmDialog } from '@/design-system/components/Overlays'
import { RequirePermission } from '@/app/router/guards'
import { PERMISSION } from '@/permissions'
import { mockFinanceWorkflowService } from '@/mock-services'
import { useSessionStore } from '@/state/session'
import { useUiStore } from '@/state/ui'
import { AppError } from '@/utils'

export function FinanceClarificationPage() {
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
  const pushToast = useUiStore((s) => s.pushToast)
  const queryClient = useQueryClient()
  const [response, setResponse] = useState('')
  const [confirmResubmit, setConfirmResubmit] = useState(false)

  const query = useQuery({
    queryKey: ['finance-workspace', organizationId, reportingPeriodId, role],
    queryFn: () =>
      mockFinanceWorkflowService.getWorkspace(organizationId, reportingPeriodId, role),
  })

  const openClar = query.data?.clarifications.find((c) => c.status === 'open')
  const latest = query.data?.clarifications[0]

  const respondMutation = useMutation({
    mutationFn: () => {
      if (!openClar) throw new AppError('No open clarification', 'VALIDATION')
      return mockFinanceWorkflowService.respondClarification(openClar.id, role, response)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['finance-workspace'] })
      setResponse('')
      pushToast({ title: 'Clarification response saved.', tone: 'success' })
    },
    onError: (err: unknown) => {
      pushToast({
        title: err instanceof AppError ? err.message : 'Response failed',
        tone: 'critical',
      })
    },
  })

  const resubmitMutation = useMutation({
    mutationFn: () =>
      mockFinanceWorkflowService.resubmit(organizationId, reportingPeriodId, role),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['finance-workspace'] })
      setConfirmResubmit(false)
      pushToast({ title: 'Resubmitted to MoIP.', tone: 'success' })
    },
    onError: (err: unknown) => {
      setConfirmResubmit(false)
      pushToast({
        title: err instanceof AppError ? err.message : 'Resubmit failed',
        tone: 'critical',
      })
    },
  })

  if (query.isLoading) return <LoadingBlock />
  if (query.isError || !query.data) return <ErrorState title="Unable to load clarification" />

  const ws = query.data
  const clar = openClar ?? latest

  return (
    <div>
      <PageHeader
        title="Clarification"
        subtitle="MoIP question → SOE response → resubmit"
        actions={
          <Link className="text-sm text-soe-blue underline" to="/soe/finance">
            Overview
          </Link>
        }
      />
      <WorkflowChrome
        status={ws.submission.status}
        actionOwner={ws.actionOwner}
        nextActionHint={ws.nextActionHint}
        actions={ws.availableActions.filter(
          (a) => a.id === 'respond_clarification' || a.id === 'resubmit',
        )}
        onAction={(a) => {
          if (a.id === 'resubmit') setConfirmResubmit(true)
          if (a.id === 'respond_clarification') respondMutation.mutate()
        }}
      />

      {!clar ? (
        <EmptyState
          title="No clarification on this finance pack"
          hint="Clarifications appear after MoIP requests them from the review queue."
        />
      ) : (
        <Card title="Clarification detail">
          <dl className="mb-4 space-y-2 text-sm">
            <div>
              <dt className="text-xs text-soe-slate">Question</dt>
              <dd>{clar.question}</dd>
            </div>
            <div className="flex flex-wrap gap-4">
              <div>
                <dt className="text-xs text-soe-slate">Affected field / section</dt>
                <dd>{clar.affectedField ?? 'General'}</dd>
              </div>
              <div>
                <dt className="text-xs text-soe-slate">Due date</dt>
                <dd>{clar.dueDate ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-xs text-soe-slate">Status</dt>
                <dd>{clar.status}</dd>
              </div>
            </div>
          </dl>

          {clar.status === 'open' ? (
            <div className="space-y-3">
              <TextareaField
                label="Response"
                value={response}
                onChange={(e) => setResponse(e.target.value)}
                rows={4}
              />
              <MockFileControl label="Attachment placeholder" />
              <Button
                disabled={!response.trim()}
                loading={respondMutation.isPending}
                onClick={() => respondMutation.mutate()}
              >
                Save response
              </Button>
            </div>
          ) : (
            <div className="text-sm">
              <p className="text-xs text-soe-slate">Recorded response</p>
              <p>{clar.response}</p>
            </div>
          )}
        </Card>
      )}

      <ConfirmDialog
        open={confirmResubmit}
        title="Resubmit to MoIP"
        message="Resubmission increments version (e.g. 1.0 → 1.1) and returns the pack to MoIP review."
        confirmLabel="Resubmit"
        onCancel={() => setConfirmResubmit(false)}
        onConfirm={() => resubmitMutation.mutate()}
      />
    </div>
  )
}
