import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { z } from 'zod'
import { PageHeader } from '@/components/layout/PageHeader'
import { WorkflowChrome } from '@/components/workflow/WorkflowChrome'
import { Card } from '@/design-system/components/Card'
import { TextField } from '@/design-system/components/TextField'
import { Button } from '@/design-system/components/Button'
import { Alert, ErrorState, LoadingBlock } from '@/design-system/components/Feedback'
import { ConfirmDialog } from '@/design-system/components/Overlays'
import { RequirePermission } from '@/app/router/guards'
import { PERMISSION, hasPermission } from '@/permissions'
import { mockFinanceWorkflowService } from '@/mock-services'
import { useSessionStore } from '@/state/session'
import { useUiStore } from '@/state/ui'
import { AppError } from '@/utils'
import type { WorkflowActionDef } from '@/workflow/submission'

const schema = z.object({
  revenue: z.coerce.number().min(0, 'Revenue cannot be negative'),
  operatingExpenses: z.coerce.number().min(0, 'Operating expenses cannot be negative'),
  capex: z.coerce.number().min(0, 'CAPEX cannot be negative'),
  profitOrLoss: z.coerce.number(),
  cashFlow: z.coerce.number(),
  workingCapital: z.coerce.number(),
  subsidies: z.coerce.number().min(0, 'Subsidies cannot be negative'),
  governmentSupport: z.coerce.number().min(0, 'Government support cannot be negative'),
  annualBudget: z.coerce.number().min(0, 'Budget cannot be negative'),
  receivables: z.coerce.number().min(0),
  payables: z.coerce.number().min(0),
  inventory: z.coerce.number().min(0),
  currentAssets: z.coerce.number().min(0),
  currentLiabilities: z.coerce.number().min(0),
  totalAssets: z.coerce.number().min(0),
  equity: z.coerce.number(),
  totalDebt: z.coerce.number().min(0),
})

type FormValues = z.infer<typeof schema>

export function FinanceFormPage() {
  return (
    <RequirePermission permission={PERMISSION.FINANCE_READ}>
      <FinanceFormContent />
    </RequirePermission>
  )
}

function FinanceFormContent() {
  const organizationId = useSessionStore((s) => s.organizationId)
  const reportingPeriodId = useSessionStore((s) => s.reportingPeriodId)
  const role = useSessionStore((s) => s.role)
  const pushToast = useUiStore((s) => s.pushToast)
  const queryClient = useQueryClient()
  const canEdit = hasPermission(role, PERMISSION.FINANCE_EDIT)
  const [confirmAction, setConfirmAction] = useState<WorkflowActionDef | null>(null)

  const query = useQuery({
    queryKey: ['finance-workspace', organizationId, reportingPeriodId, role],
    queryFn: () =>
      mockFinanceWorkflowService.getWorkspace(organizationId, reportingPeriodId, role),
  })

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      revenue: 0,
      operatingExpenses: 0,
      capex: 0,
      profitOrLoss: 0,
      cashFlow: 0,
      workingCapital: 0,
      subsidies: 0,
      governmentSupport: 0,
      annualBudget: 0,
      receivables: 0,
      payables: 0,
      inventory: 0,
      currentAssets: 0,
      currentLiabilities: 0,
      totalAssets: 0,
      equity: 0,
      totalDebt: 0,
    },
  })

  useEffect(() => {
    if (!query.data) return
    const c = query.data.current
    form.reset({
      revenue: c.revenue,
      operatingExpenses: c.operatingExpenses,
      capex: c.capex,
      profitOrLoss: c.profitOrLoss,
      cashFlow: c.cashFlow ?? 0,
      workingCapital: c.workingCapital ?? 0,
      subsidies: c.subsidies,
      governmentSupport: c.governmentSupport ?? 0,
      annualBudget: c.annualBudget ?? 0,
      receivables: c.receivables ?? 0,
      payables: c.payables ?? 0,
      inventory: c.inventory ?? 0,
      currentAssets: c.currentAssets ?? 0,
      currentLiabilities: c.currentLiabilities ?? 0,
      totalAssets: c.totalAssets ?? 0,
      equity: c.equity ?? 0,
      totalDebt: c.totalDebt ?? 0,
    })
  }, [query.data, form])

  function invalidate() {
    void queryClient.invalidateQueries({
      queryKey: ['finance-workspace', organizationId, reportingPeriodId],
    })
  }

  const saveMutation = useMutation({
    mutationFn: (values: FormValues) =>
      mockFinanceWorkflowService.saveDraft(organizationId, reportingPeriodId, values, role),
    onSuccess: () => {
      invalidate()
      pushToast({ title: 'Draft saved.', tone: 'success' })
    },
    onError: (err: unknown) => {
      pushToast({
        title: err instanceof AppError ? err.message : 'Save failed',
        tone: 'critical',
      })
    },
  })

  const evidenceMutation = useMutation({
    mutationFn: () =>
      mockFinanceWorkflowService.attachEvidence(
        organizationId,
        reportingPeriodId,
        {
          title: 'Audited financial statements (mock)',
          fileName: `finance-evidence-${Date.now()}.pdf`,
        },
        role,
      ),
    onSuccess: () => {
      invalidate()
      pushToast({ title: 'Evidence attached.', tone: 'success' })
    },
    onError: (err: unknown) => {
      pushToast({
        title: err instanceof AppError ? err.message : 'Upload failed',
        tone: 'critical',
      })
    },
  })

  const actionMutation = useMutation({
    mutationFn: async (action: WorkflowActionDef) => {
      if (action.id === 'mark_complete') {
        return mockFinanceWorkflowService.markComplete(
          organizationId,
          reportingPeriodId,
          role,
        )
      }
      throw new AppError('Action not available on this screen', 'VALIDATION')
    },
    onSuccess: () => {
      invalidate()
      setConfirmAction(null)
      pushToast({ title: 'Section marked complete.', tone: 'success' })
    },
    onError: (err: unknown) => {
      setConfirmAction(null)
      pushToast({
        title: err instanceof AppError ? err.message : 'Action failed',
        tone: 'critical',
      })
    },
  })

  if (query.isLoading) return <LoadingBlock />
  if (query.isError || !query.data) {
    return <ErrorState title="Unable to load financial form" />
  }

  const ws = query.data
  const readOnly = ws.readOnly || !canEdit

  return (
    <div>
      <PageHeader
        title="Financial form"
        subtitle={`${ws.organization.abbreviation} · ${ws.period.label}`}
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
        actions={ws.availableActions.filter((a) => a.id === 'mark_complete')}
        onAction={(a) => (a.confirm ? setConfirmAction(a) : actionMutation.mutate(a))}
        disabled={actionMutation.isPending}
      />

      {ws.validation.some((v) => v.severity === 'warning') ? (
        <div className="mb-4 space-y-2">
          {ws.validation
            .filter((v) => v.severity === 'warning')
            .map((v) => (
              <Alert key={v.message} tone="warning" title={v.message} />
            ))}
        </div>
      ) : null}

      <form
        className="grid gap-4 lg:grid-cols-2"
        onSubmit={form.handleSubmit((values) => saveMutation.mutate(values))}
      >
        <Card title="Statement values">
          <div className="grid gap-3 sm:grid-cols-2">
            {(
              [
                ['revenue', 'Revenue (PKR)'],
                ['operatingExpenses', 'Operating expenditure (PKR)'],
                ['capex', 'CAPEX (PKR)'],
                ['profitOrLoss', 'Profit / Loss (PKR)'],
                ['cashFlow', 'Cash flow (PKR)'],
                ['workingCapital', 'Working capital (PKR)'],
                ['subsidies', 'Subsidies (PKR)'],
                ['governmentSupport', 'Government support (PKR)'],
                ['annualBudget', 'Annual budget (PKR)'],
              ] as const
            ).map(([name, label]) => (
              <TextField
                key={name}
                label={label}
                type="number"
                disabled={readOnly}
                error={form.formState.errors[name]?.message}
                {...form.register(name)}
              />
            ))}
          </div>
        </Card>

        <Card title="Balance sheet indicators">
          <div className="grid gap-3 sm:grid-cols-2">
            {(
              [
                ['receivables', 'Receivables (PKR)'],
                ['payables', 'Payables (PKR)'],
                ['inventory', 'Inventory (PKR)'],
                ['currentAssets', 'Current assets (PKR)'],
                ['currentLiabilities', 'Current liabilities (PKR)'],
                ['totalAssets', 'Total assets (PKR)'],
                ['equity', 'Equity (PKR)'],
                ['totalDebt', 'Total debt (PKR)'],
              ] as const
            ).map(([name, label]) => (
              <TextField
                key={name}
                label={label}
                type="number"
                disabled={readOnly}
                error={form.formState.errors[name]?.message}
                {...form.register(name)}
              />
            ))}
          </div>
          {!readOnly ? (
            <div className="mt-4">
              <Button type="submit" loading={saveMutation.isPending}>
                Save draft
              </Button>
            </div>
          ) : (
            <p className="mt-3 text-xs text-soe-slate">Read-only for current role or status.</p>
          )}
        </Card>

        <Card title="Evidence panel">
          <ul className="mb-3 space-y-1 text-sm">
            {ws.evidence.map((d) => (
              <li key={d.id} className="border-b border-soe-border py-1.5">
                <p className="font-medium">{d.title}</p>
                <p className="text-xs text-soe-slate">
                  {d.fileName} · v{d.version} · {d.uploadedBy} · {d.status}
                </p>
              </li>
            ))}
          </ul>
          {hasPermission(role, PERMISSION.DOCUMENT_UPLOAD) && !ws.readOnly ? (
            <Button
              type="button"
              variant="secondary"
              loading={evidenceMutation.isPending}
              onClick={() => evidenceMutation.mutate()}
            >
              Attach evidence
            </Button>
          ) : null}
          {ws.validation
            .filter((v) => v.code === 'EVIDENCE_REQUIRED')
            .map((v) => (
              <Alert key={v.code} className="mt-3" tone="critical" title={v.message} />
            ))}
        </Card>
      </form>

      <ConfirmDialog
        open={!!confirmAction}
        title={confirmAction?.label ?? 'Confirm'}
        message="Mark finance section complete for internal review? Blocking validation issues must be cleared."
        confirmLabel="Mark complete"
        onCancel={() => setConfirmAction(null)}
        onConfirm={() => confirmAction && actionMutation.mutate(confirmAction)}
      />
    </div>
  )
}
