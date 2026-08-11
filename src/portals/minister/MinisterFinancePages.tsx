import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/design-system/components/Card'
import { KpiCard } from '@/design-system/components/KpiCard'
import { EmptyState, ErrorState, LoadingBlock } from '@/design-system/components/Feedback'
import { RequirePermission } from '@/app/router/guards'
import { PERMISSION } from '@/permissions'
import { mockFinanceWorkflowService, mockOrganizationService } from '@/mock-services'
import { formatCurrencyPkr } from '@/utils'

export { MinisterExecutiveOverviewPage as MinisterDashboardPage } from '@/portals/minister/MinisterStrategicWorkspacePages'

export function MinisterFinanceDrillPage() {
  return (
    <RequirePermission permission={PERMISSION.EXECUTIVE_DASHBOARD_READ}>
      <DrillContent />
    </RequirePermission>
  )
}

function DrillContent() {
  const { organizationId = '' } = useParams()
  const search = new URLSearchParams(window.location.search)
  const kpiId = search.get('kpi')

  const org = useQuery({
    queryKey: ['organization', organizationId],
    queryFn: () => mockOrganizationService.getOrganization(organizationId),
  })

  const kpis = useQuery({
    queryKey: ['approved-finance-kpis', organizationId],
    queryFn: () => mockFinanceWorkflowService.getApprovedKpis(organizationId),
  })

  const selectedId = kpiId ?? kpis.data?.[0]?.id
  const detail = useQuery({
    queryKey: ['approved-kpi-detail', selectedId],
    enabled: !!selectedId,
    queryFn: () => mockFinanceWorkflowService.getApprovedKpiDetail(selectedId!),
  })

  if (org.isLoading || kpis.isLoading) return <LoadingBlock />
  if (!selectedId) {
    return (
      <EmptyState
        title="No approved finance record for this SOE"
        hint="Draft values are excluded from executive intelligence."
        action={
          <Link className="text-sm text-soe-blue underline" to="/minister/dashboard">
            Back to overview
          </Link>
        }
      />
    )
  }

  if (detail.isLoading) return <LoadingBlock />
  if (detail.isError || !detail.data) {
    return <ErrorState title="Unable to load approved source record" />
  }

  const { kpi, financial, evidence, timeline, versions } = detail.data

  return (
    <div>
      <PageHeader
        title={`Approved finance · ${org.data?.abbreviation ?? organizationId}`}
        subtitle={`Trace: approved KPI → locked record → evidence → history · v${kpi.version}`}
        actions={
          <Link className="text-sm text-soe-blue underline" to="/minister/dashboard">
            Overview
          </Link>
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <KpiCard label="Revenue" value={formatCurrencyPkr(kpi.revenue)} />
        <KpiCard label="Profit / Loss" value={formatCurrencyPkr(kpi.profitOrLoss)} />
        <KpiCard label="Subsidies" value={formatCurrencyPkr(kpi.subsidies)} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Source financial record">
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-soe-slate">Status</dt>
              <dd>{financial.status}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-soe-slate">Approved by</dt>
              <dd>{kpi.approvedBy}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-soe-slate">Approved at</dt>
              <dd>{new Date(kpi.approvedAt).toLocaleString()}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-soe-slate">CAPEX</dt>
              <dd>{formatCurrencyPkr(financial.capex)}</dd>
            </div>
          </dl>
        </Card>
        <Card title="Evidence">
          <ul className="space-y-1 text-sm">
            {evidence.map((d) => (
              <li key={d.id}>
                {d.title} · v{d.version}
              </li>
            ))}
          </ul>
          {!evidence.length ? <p className="text-sm text-soe-slate">No evidence metadata.</p> : null}
        </Card>
        <Card title="Version history">
          <ul className="space-y-2 text-sm">
            {versions.map((v) => (
              <li key={v.id}>
                {v.version} · {v.reason}
              </li>
            ))}
          </ul>
        </Card>
        <Card title="Timeline">
          <ul className="space-y-2 text-sm">
            {timeline.slice(0, 8).map((t) => (
              <li key={t.id}>
                {t.title}
                <span className="block text-xs text-soe-slate">
                  {new Date(t.occurredAt).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  )
}
