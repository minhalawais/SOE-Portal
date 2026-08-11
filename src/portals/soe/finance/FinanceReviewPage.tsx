import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { WorkflowChrome } from '@/components/workflow/WorkflowChrome'
import { Card } from '@/design-system/components/Card'
import { Alert, ErrorState, LoadingBlock } from '@/design-system/components/Feedback'
import { ConfirmDialog } from '@/design-system/components/Overlays'
import { RequirePermission } from '@/app/router/guards'
import { PERMISSION } from '@/permissions'
import { mockFinanceWorkflowService } from '@/mock-services'
import { useSessionStore } from '@/state/session'
import { useUiStore } from '@/state/ui'
import { AppError, formatCurrencyPkr } from '@/utils'
import type { WorkflowActionDef } from '@/workflow/submission'

export function FinanceReviewPage() {
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
  const [confirm, setConfirm] = useState<WorkflowActionDef | null>(null)

  const query = useQuery({
    queryKey: ['finance-workspace', organizationId, reportingPeriodId, role],
    queryFn: () =>
      mockFinanceWorkflowService.getWorkspace(organizationId, reportingPeriodId, role),
  })

  const mutation = useMutation({
    mutationFn: (action: WorkflowActionDef) => {
      if (action.id === 'send_to_certification') {
        return mockFinanceWorkflowService.sendForCertification(
          organizationId,
          reportingPeriodId,
          role,
        )
      }
      throw new AppError('Action not available', 'VALIDATION')
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['finance-workspace'] })
      setConfirm(null)
      pushToast({ title: 'Sent for certification.', tone: 'success' })
    },
    onError: (err: unknown) => {
      setConfirm(null)
      pushToast({
        title: err instanceof AppError ? err.message : 'Action failed',
        tone: 'critical',
      })
    },
  })

  if (query.isLoading) return <LoadingBlock />
  if (query.isError || !query.data) return <ErrorState title="Unable to load internal review" />

  const ws = query.data
  const material = ws.percentChange.revenue !== null && Math.abs(ws.percentChange.revenue) > 25

  return (
    <div>
      <PageHeader
        title="Internal review"
        subtitle="Completeness, warnings, material changes, evidence gaps"
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
        actions={ws.availableActions.filter((a) => a.id === 'send_to_certification')}
        onAction={(a) => setConfirm(a)}
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Completeness">
          <p className="text-sm">Module completion: {ws.submission.completeness}%</p>
          <p className="mt-1 text-sm text-soe-slate">Version {ws.submission.version}</p>
        </Card>
        <Card title="Evidence gaps">
          {ws.evidence.length ? (
            <p className="text-sm">{ws.evidence.length} evidence item(s) attached.</p>
          ) : (
            <Alert tone="critical" title="Mandatory evidence missing." />
          )}
        </Card>
        <Card title="Material changes">
          {material ? (
            <Alert
              tone="warning"
              title={`Revenue YoY change ${ws.percentChange.revenue}% exceeds demo 25% threshold.`}
            />
          ) : (
            <p className="text-sm text-soe-slate">No material YoY warning on revenue.</p>
          )}
          <p className="mt-2 text-sm">
            P/L: {formatCurrencyPkr(ws.current.profitOrLoss)}
          </p>
        </Card>
        <Card title="Reviewer comments">
          <p className="text-sm text-soe-slate">
            Prototype comment field — SOE Contributor confirms readiness before certification.
          </p>
        </Card>
      </div>
      <ConfirmDialog
        open={!!confirm}
        title="Send for certification"
        message="Confirm completeness and send this pack to CEO/CFO certification."
        confirmLabel="Send for certification"
        onCancel={() => setConfirm(null)}
        onConfirm={() => confirm && mutation.mutate(confirm)}
      />
    </div>
  )
}
