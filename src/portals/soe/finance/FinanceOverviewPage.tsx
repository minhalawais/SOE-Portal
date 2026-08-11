import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { PageHeader } from '@/components/layout/PageHeader'
import { WorkflowChrome } from '@/components/workflow/WorkflowChrome'
import { Card } from '@/design-system/components/Card'
import { KpiCard } from '@/design-system/components/KpiCard'
import { Alert, ErrorState, LoadingBlock } from '@/design-system/components/Feedback'
import { RequirePermission } from '@/app/router/guards'
import { PERMISSION } from '@/permissions'
import { mockFinanceWorkflowService } from '@/mock-services'
import { useSessionStore } from '@/state/session'
import { cn, formatCurrencyPkr } from '@/utils'

const linkBtn =
  'inline-flex h-8 items-center justify-center rounded-control px-2.5 text-xs font-medium'

export function FinanceOverviewPage() {
  return (
    <RequirePermission permission={PERMISSION.FINANCE_READ}>
      <FinanceOverviewContent />
    </RequirePermission>
  )
}

function FinanceOverviewContent() {
  const organizationId = useSessionStore((s) => s.organizationId)
  const reportingPeriodId = useSessionStore((s) => s.reportingPeriodId)
  const role = useSessionStore((s) => s.role)

  const query = useQuery({
    queryKey: ['finance-workspace', organizationId, reportingPeriodId, role],
    queryFn: () =>
      mockFinanceWorkflowService.getWorkspace(organizationId, reportingPeriodId, role),
  })

  if (query.isLoading) return <LoadingBlock label="Loading finance workspace…" />
  if (query.isError || !query.data) {
    return (
      <ErrorState
        title="Unable to load finance workspace"
        detail="Check organization and reporting period context."
      />
    )
  }

  const ws = query.data
  const blocking = ws.validation.filter((v) => v.severity === 'blocking')
  const warnings = ws.validation.filter((v) => v.severity === 'warning')

  return (
    <div>
      <PageHeader
        title="Financial Reporting"
        subtitle={`${ws.organization.abbreviation} · ${ws.period.label} · dummy demonstration data`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              to="/soe/finance/history"
              className={cn(linkBtn, 'border border-soe-blue text-soe-blue')}
            >
              History
            </Link>
            <Link to="/soe/finance/form" className={cn(linkBtn, 'bg-soe-blue text-white')}>
              Open form
            </Link>
          </div>
        }
      />

      <WorkflowChrome
        status={ws.submission.status}
        actionOwner={ws.actionOwner}
        nextActionHint={ws.nextActionHint}
        actions={ws.availableActions}
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Revenue" value={formatCurrencyPkr(ws.current.revenue)} />
        <KpiCard
          label="Operating expenses"
          value={formatCurrencyPkr(ws.current.operatingExpenses)}
        />
        <KpiCard label="Profit / Loss" value={formatCurrencyPkr(ws.current.profitOrLoss)} />
        <KpiCard
          label="Completion"
          value={`${ws.submission.completeness}%`}
          period={`Version ${ws.submission.version}`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Validation">
          {blocking.length === 0 && warnings.length === 0 ? (
            <p className="text-sm text-soe-slate">No validation issues.</p>
          ) : (
            <div className="space-y-2">
              {blocking.map((i) => (
                <Alert key={i.code + i.message} tone="critical" title={i.message} />
              ))}
              {warnings.map((i) => (
                <Alert key={i.code + i.message} tone="warning" title={i.message} />
              ))}
            </div>
          )}
        </Card>

        <Card title="Evidence">
          <p className="mb-2 text-sm text-soe-slate">
            {ws.evidence.length} document(s) linked ·{' '}
            {ws.evidence.length ? 'Attached' : 'Missing mandatory evidence'}
          </p>
          <ul className="space-y-1 text-sm">
            {ws.evidence.slice(0, 5).map((d) => (
              <li
                key={d.id}
                className="flex justify-between gap-2 border-b border-soe-border py-1.5"
              >
                <span>{d.title}</span>
                <span className="text-xs text-soe-slate">v{d.version}</span>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex flex-wrap gap-3 text-sm">
            <Link className="text-soe-blue underline" to="/soe/finance/performance">
              Performance
            </Link>
            <Link className="text-soe-blue underline" to="/soe/finance/budget">
              Budget
            </Link>
            <Link className="text-soe-blue underline" to="/soe/finance/exposure">
              Exposure
            </Link>
            <Link className="text-soe-blue underline" to="/soe/finance/compare">
              Compare
            </Link>
            <Link className="text-soe-blue underline" to="/soe/finance/form">
              Edit values & evidence
            </Link>
            <Link className="text-soe-blue underline" to="/soe/finance/review">
              Internal review
            </Link>
            <Link className="text-soe-blue underline" to="/soe/finance/certify">
              Certification
            </Link>
            <Link className="text-soe-blue underline" to="/soe/finance/clarification">
              Clarification
            </Link>
          </div>
        </Card>

        <Card title="Previous period comparison">
          {ws.previous && ws.previousPeriod ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-soe-border text-xs text-soe-slate">
                    <th className="py-1.5 font-medium">Metric</th>
                    <th className="py-1.5 font-medium">{ws.previousPeriod.label}</th>
                    <th className="py-1.5 font-medium">{ws.period.label}</th>
                    <th className="py-1.5 font-medium">Δ %</th>
                  </tr>
                </thead>
                <tbody>
                  {(
                    [
                      ['Revenue', ws.previous.revenue, ws.current.revenue, ws.percentChange.revenue],
                      [
                        'OPEX',
                        ws.previous.operatingExpenses,
                        ws.current.operatingExpenses,
                        ws.percentChange.operatingExpenses,
                      ],
                      [
                        'P/L',
                        ws.previous.profitOrLoss,
                        ws.current.profitOrLoss,
                        ws.percentChange.profitOrLoss,
                      ],
                      [
                        'Subsidies',
                        ws.previous.subsidies,
                        ws.current.subsidies,
                        ws.percentChange.subsidies,
                      ],
                    ] as const
                  ).map(([label, prev, curr, pct]) => (
                    <tr key={label} className="border-b border-soe-border">
                      <td className="py-1.5">{label}</td>
                      <td className="py-1.5">{formatCurrencyPkr(prev)}</td>
                      <td className="py-1.5">{formatCurrencyPkr(curr)}</td>
                      <td className="py-1.5">{pct === null ? '—' : `${pct}%`}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-soe-slate">No prior annual period for comparison.</p>
          )}
        </Card>
      </div>
    </div>
  )
}
