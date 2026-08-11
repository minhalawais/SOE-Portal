import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { WorkflowChrome } from '@/components/workflow/WorkflowChrome'
import { Card } from '@/design-system/components/Card'
import { Alert, ErrorState, LoadingBlock } from '@/design-system/components/Feedback'
import { ConfirmDialog } from '@/design-system/components/Overlays'
import { RequirePermission } from '@/app/router/guards'
import { PERMISSION, hasPermission } from '@/permissions'
import { mockFinanceWorkflowService } from '@/mock-services'
import { useSessionStore } from '@/state/session'
import { useUiStore } from '@/state/ui'
import { AppError, formatCurrencyPkr } from '@/utils'
import { ROLE_LABEL } from '@/constants'

export function FinanceCertifyPage() {
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
  const [open, setOpen] = useState(false)
  const canCertify = hasPermission(role, PERMISSION.SUBMISSION_CERTIFY)
  const canSubmit = hasPermission(role, PERMISSION.SUBMISSION_SUBMIT)

  const query = useQuery({
    queryKey: ['finance-workspace', organizationId, reportingPeriodId, role],
    queryFn: () =>
      mockFinanceWorkflowService.getWorkspace(organizationId, reportingPeriodId, role),
  })

  const certifyMutation = useMutation({
    mutationFn: () =>
      mockFinanceWorkflowService.certify(
        organizationId,
        reportingPeriodId,
        role,
        ROLE_LABEL[role],
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['finance-workspace'] })
      setOpen(false)
      pushToast({ title: 'Certified.', tone: 'success' })
    },
    onError: (err: unknown) => {
      setOpen(false)
      pushToast({
        title: err instanceof AppError ? err.message : 'Certification failed',
        tone: 'critical',
      })
    },
  })

  const submitMutation = useMutation({
    mutationFn: () =>
      mockFinanceWorkflowService.submitToMoip(organizationId, reportingPeriodId, role),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['finance-workspace'] })
      pushToast({ title: 'Submitted to MoIP.', tone: 'success' })
    },
    onError: (err: unknown) => {
      pushToast({
        title: err instanceof AppError ? err.message : 'Submit failed',
        tone: 'critical',
      })
    },
  })

  if (query.isLoading) return <LoadingBlock />
  if (query.isError || !query.data) return <ErrorState title="Unable to load certification" />

  const ws = query.data
  const warnings = ws.validation.filter((v) => v.severity === 'warning')

  return (
    <div>
      <PageHeader
        title="Certification"
        subtitle={`${ws.organization.name} · ${ws.period.label}`}
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
        actions={ws.availableActions.filter((a) => a.id === 'certify' || a.id === 'submit')}
        onAction={(a) => {
          if (a.id === 'certify') setOpen(true)
          if (a.id === 'submit') submitMutation.mutate()
        }}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Summary metrics">
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-2">
              <dt className="text-soe-slate">Revenue</dt>
              <dd>{formatCurrencyPkr(ws.current.revenue, { mode: 'exact' })}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-soe-slate">OPEX</dt>
              <dd>{formatCurrencyPkr(ws.current.operatingExpenses, { mode: 'exact' })}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-soe-slate">P/L</dt>
              <dd>{formatCurrencyPkr(ws.current.profitOrLoss, { mode: 'exact' })}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-soe-slate">Subsidies</dt>
              <dd>{formatCurrencyPkr(ws.current.subsidies, { mode: 'exact' })}</dd>
            </div>
          </dl>
        </Card>
        <Card title="Certification statement">
          <p className="text-sm text-soe-ink">
            I certify that the financial figures for {ws.period.label} are complete to the best of
            my knowledge, supported by attached evidence, and ready for MoIP submission. This is a
            demo certification — not a production digital signature.
          </p>
          <p className="mt-3 text-xs text-soe-slate">Certifier role: {ROLE_LABEL[role]}</p>
          {!canCertify && !canSubmit ? (
            <Alert
              className="mt-3"
              tone="info"
              title="Current role cannot certify or submit."
            />
          ) : null}
          {warnings.length ? (
            <div className="mt-3 space-y-2">
              {warnings.map((w) => (
                <Alert key={w.message} tone="warning" title={w.message} />
              ))}
            </div>
          ) : null}
        </Card>
      </div>

      <ConfirmDialog
        open={open}
        title="Confirm certification"
        message="Certification is a governance-significant action. Continue with demo certification?"
        confirmLabel="Certify"
        onCancel={() => setOpen(false)}
        onConfirm={() => certifyMutation.mutate()}
      />
    </div>
  )
}
