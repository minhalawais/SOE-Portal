import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/design-system/components/Card'
import { TextField } from '@/design-system/components/TextField'
import { Button } from '@/design-system/components/Button'
import { ErrorState, LoadingBlock } from '@/design-system/components/Feedback'
import { StatusBadge } from '@/design-system/components/StatusBadge'
import { RequirePermission } from '@/app/router/guards'
import { PERMISSION } from '@/permissions'
import { mockFinanceService } from '@/mock-services'
import { useSessionStore } from '@/state/session'
import { useUiStore } from '@/state/ui'
import { formatCurrencyPkr, AppError } from '@/utils'

const schema = z.object({
  revenue: z.coerce.number().min(0, 'Revenue cannot be negative'),
  operatingExpenses: z.coerce.number().min(0, 'Operating expenses cannot be negative'),
  capex: z.coerce.number().min(0, 'CAPEX cannot be negative'),
  profitOrLoss: z.coerce.number(),
  subsidies: z.coerce.number().min(0, 'Subsidies cannot be negative'),
})

type FormValues = z.infer<typeof schema>

export function FinancePrototypePage() {
  return (
    <RequirePermission permission={PERMISSION.FINANCE_READ}>
      <FinanceContent />
    </RequirePermission>
  )
}

function FinanceContent() {
  const organizationId = useSessionStore((s) => s.organizationId)
  const reportingPeriodId = useSessionStore((s) => s.reportingPeriodId)
  const queryClient = useQueryClient()
  const pushToast = useUiStore((s) => s.pushToast)

  const query = useQuery({
    queryKey: ['finance', organizationId, reportingPeriodId],
    queryFn: () =>
      mockFinanceService.getFinancialMetric(organizationId, reportingPeriodId),
  })

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      revenue: 0,
      operatingExpenses: 0,
      capex: 0,
      profitOrLoss: 0,
      subsidies: 0,
    },
  })

  useEffect(() => {
    if (query.data) {
      form.reset({
        revenue: query.data.revenue,
        operatingExpenses: query.data.operatingExpenses,
        capex: query.data.capex,
        profitOrLoss: query.data.profitOrLoss,
        subsidies: query.data.subsidies,
      })
    }
  }, [query.data, form])

  const mutation = useMutation({
    mutationFn: (values: FormValues) => {
      if (!query.data) throw new AppError('No financial record', 'NOT_FOUND')
      return mockFinanceService.updateFinancialMetric(query.data.id, values)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['finance', organizationId, reportingPeriodId],
      })
      pushToast({ title: 'Financial draft saved.', tone: 'success' })
    },
    onError: (err: unknown) => {
      pushToast({
        title: err instanceof AppError ? err.message : 'Save failed',
        tone: 'critical',
      })
    },
  })

  if (query.isLoading) return <LoadingBlock label="Loading financials" />
  if (query.isError || !query.data) {
    return (
      <ErrorState
        title="Financial metric not found for this context"
        detail="Select an organization/period that has fixture data, or switch to PSM / PIDC + FY2027."
      />
    )
  }

  return (
    <div>
      <PageHeader
        title="Finance Prototype"
        subtitle="Representative validated form over mockFinanceService"
        actions={<StatusBadge status={query.data.status} />}
      />
      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <Card title="Period financials">
          <form
            className="grid gap-3 md:grid-cols-2"
            onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
          >
            <TextField
              label="Revenue"
              type="number"
              error={form.formState.errors.revenue?.message}
              {...form.register('revenue')}
            />
            <TextField
              label="Operating expenses"
              type="number"
              error={form.formState.errors.operatingExpenses?.message}
              {...form.register('operatingExpenses')}
            />
            <TextField
              label="CAPEX"
              type="number"
              error={form.formState.errors.capex?.message}
              {...form.register('capex')}
            />
            <TextField
              label="Profit / loss"
              type="number"
              error={form.formState.errors.profitOrLoss?.message}
              {...form.register('profitOrLoss')}
            />
            <TextField
              label="Subsidies"
              type="number"
              error={form.formState.errors.subsidies?.message}
              {...form.register('subsidies')}
            />
            <div className="md:col-span-2 flex gap-2">
              <Button type="submit" disabled={mutation.isPending}>
                Save draft
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => query.data && form.reset({
                  revenue: query.data.revenue,
                  operatingExpenses: query.data.operatingExpenses,
                  capex: query.data.capex,
                  profitOrLoss: query.data.profitOrLoss,
                  subsidies: query.data.subsidies,
                })}
              >
                Cancel
              </Button>
            </div>
          </form>
        </Card>
        <Card title="Computed preview" subtitle="Display only">
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-soe-slate">Revenue</dt>
              <dd>{formatCurrencyPkr(form.watch('revenue') || 0, { mode: 'exact' })}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-soe-slate">OPEX</dt>
              <dd>{formatCurrencyPkr(form.watch('operatingExpenses') || 0, { mode: 'exact' })}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-soe-slate">Net</dt>
              <dd>{formatCurrencyPkr(form.watch('profitOrLoss') || 0, { mode: 'exact' })}</dd>
            </div>
          </dl>
        </Card>
      </div>
    </div>
  )
}
