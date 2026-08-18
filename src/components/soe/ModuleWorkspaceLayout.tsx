import type { PropsWithChildren, ReactNode } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { ModuleStatusStrip } from '@/components/soe/ModuleStatusStrip'
import { Card } from '@/design-system/components/Card'
import { ROLE_LABEL, type ModuleId } from '@/constants'
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

      <ModuleStatusStrip moduleId={moduleId} workspaceLabel="Workspace" />

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
