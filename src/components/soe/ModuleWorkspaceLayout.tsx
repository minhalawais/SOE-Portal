import { Link } from 'react-router-dom'
import type { PropsWithChildren, ReactNode } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { StatusBadge } from '@/design-system/components/StatusBadge'
import { Card } from '@/design-system/components/Card'
import { ROLE_LABEL, SUBMISSION_STATUS_LABEL, type ModuleId } from '@/constants'
import { useQuery } from '@tanstack/react-query'
import { mockSoePortalService } from '@/mock-services'
import { useSessionStore } from '@/state/session'
import { ErrorState, LoadingBlock } from '@/design-system/components/Feedback'

/** Common module page pattern (Phase 6 §17) */
export function ModuleWorkspaceLayout({
  moduleId,
  title,
  actions,
  children,
  overview,
  validation,
  evidence,
  history,
}: PropsWithChildren<{
  moduleId: ModuleId
  title?: string
  actions?: ReactNode
  overview?: ReactNode
  validation?: ReactNode
  evidence?: ReactNode
  history?: ReactNode
}>) {
  const organizationId = useSessionStore((s) => s.organizationId)
  const reportingPeriodId = useSessionStore((s) => s.reportingPeriodId)

  const header = useQuery({
    queryKey: ['module-header', organizationId, reportingPeriodId, moduleId],
    queryFn: () =>
      mockSoePortalService.getModuleHeader(organizationId, reportingPeriodId, moduleId),
  })

  if (header.isLoading) return <LoadingBlock />
  if (header.isError || !header.data) {
    return <ErrorState title="Unable to load module header" />
  }

  const row = header.data

  return (
    <div>
      <PageHeader
        title={title ?? row.def.label}
        subtitle={`${row.def.label} · ${ROLE_LABEL[row.def.ownerRole]} · period-aware`}
        actions={actions}
      />

      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-card border border-soe-border bg-white px-4 py-3 text-sm">
        <StatusBadge
          status={row.submission.status}
          label={SUBMISSION_STATUS_LABEL[row.submission.status]}
        />
        <span className="text-soe-slate">Completion {row.submission.completeness}%</span>
        <span className="text-soe-slate">Owner: {ROLE_LABEL[row.def.ownerRole]}</span>
        <span className="text-soe-slate">Next: {row.nextAction}</span>
        <Link className="ml-auto text-soe-blue underline" to="/soe/reporting">
          Workspace
        </Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {overview ? <Card title="Overview">{overview}</Card> : null}
        {validation ? <Card title="Validation">{validation}</Card> : null}
        {evidence ? <Card title="Evidence">{evidence}</Card> : null}
        {history ? <Card title="History">{history}</Card> : null}
      </div>

      <div className="mt-4">{children}</div>
    </div>
  )
}
