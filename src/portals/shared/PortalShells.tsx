import { useLocation } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { Alert, Card, KpiGrid, KpiValue, StatusBadge } from '@/design-system'
import {
  findNavTrail,
  flattenNavigation,
  getPortalDefinition,
} from '@/app/config/navigation'
import { useActivePortal, useSessionStore } from '@/state/session'
import { useQuery } from '@tanstack/react-query'
import { mockFinanceService, mockOrganizationService } from '@/mock-services'

export function FeatureNotEnabledPage() {
  return (
    <div>
      <PageHeader title="Feature not enabled" subtitle="Prototype scope control" />
      <Alert tone="warning" title="This module is feature-flagged off">
        The route exists for information architecture, but the feature is not enabled for
        stakeholder review yet.
      </Alert>
    </div>
  )
}

export function ModulePlaceholderPage({
  title,
  intent,
  bullets,
}: {
  title?: string
  intent?: string
  bullets?: string[]
}) {
  const location = useLocation()
  const portal = useActivePortal()
  const definition = getPortalDefinition(portal)
  const trail = findNavTrail(definition.navigation, location.pathname)
  const leaf = trail?.[trail.length - 1]
  const organizationId = useSessionStore((s) => s.organizationId)
  const reportingPeriodId = useSessionStore((s) => s.reportingPeriodId)

  const orgQuery = useQuery({
    queryKey: ['organization', organizationId],
    queryFn: () => mockOrganizationService.getOrganization(organizationId),
  })
  const periodsQuery = useQuery({
    queryKey: ['reporting-periods'],
    queryFn: () => mockFinanceService.getReportingPeriods(),
  })
  const period = periodsQuery.data?.find((p) => p.id === reportingPeriodId)

  if (leaf?.enabled === false) {
    return <FeatureNotEnabledPage />
  }

  const heading = title ?? leaf?.label ?? 'Module shell'
  const question = intent ?? definition.primaryQuestion

  return (
    <div className="space-y-4">
      <PageHeader
        title={heading}
        subtitle={question}
        actions={
          <div className="flex flex-wrap gap-2">
            <StatusBadge status="in_progress" family="reporting" />
            {!definition.allowsOperationalEdit ? (
              <StatusBadge status="verified" family="dataQuality" label="Read-only portal" />
            ) : null}
          </div>
        }
      />

      <div className="flex flex-wrap gap-2 text-xs text-soe-slate">
        <span className="rounded-control border border-soe-border bg-white px-2 py-1">
          Org: {orgQuery.data?.abbreviation ?? '—'}
        </span>
        <span className="rounded-control border border-soe-border bg-white px-2 py-1">
          Period: {period?.label ?? '—'}
        </span>
        <span className="rounded-control border border-soe-border bg-white px-2 py-1">
          Portal: {definition.name}
        </span>
      </div>

      <Alert tone="info" title="Phase 3 portal shell">
        This is a navigable placeholder for later domain implementation. Context selectors and
        role-aware navigation are active; deep module content arrives in later phases.
      </Alert>

      <Card title="Shell intent" subtitle="What this area will support">
        <ul className="list-disc space-y-1 pl-5 text-sm text-soe-ink">
          {(bullets ?? [
            'Structured records and evidence linkage',
            'Role-appropriate actions (edit / review / read-only)',
            'Period-aware reporting where applicable',
          ]).map((b) => (
            <li key={b}>{b}</li>
          ))}
        </ul>
      </Card>
    </div>
  )
}

export function PortalLandingShell({
  kpis,
  sections,
}: {
  kpis: Array<{ label: string; value: string }>
  sections: Array<{ title: string; body: string }>
}) {
  const portal = useActivePortal()
  const definition = getPortalDefinition(portal)
  const enabledCount = flattenNavigation(definition.navigation).length

  return (
    <div className="space-y-4">
      <PageHeader title={definition.name} subtitle={definition.primaryQuestion} />
      <KpiGrid>
        {kpis.map((k) => (
          <KpiValue key={k.label} label={k.label} value={k.value} />
        ))}
        <KpiValue label="Nav destinations" value={String(enabledCount)} period="Configured" />
      </KpiGrid>
      <div className="grid gap-3 md:grid-cols-2">
        {sections.map((s) => (
          <Card key={s.title} title={s.title}>
            <p className="text-sm text-soe-ink">{s.body}</p>
          </Card>
        ))}
      </div>
      {!definition.allowsOperationalEdit ? (
        <Alert tone="info" title="Executive / oversight mode">
          Operational edit controls are not exposed in this portal shell.
        </Alert>
      ) : null}
    </div>
  )
}
