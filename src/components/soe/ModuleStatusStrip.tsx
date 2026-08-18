/**
 * SOE contributor module status strip — operational context only (no KPI tiles).
 * Recipe: submission status · completion % · owner · next action · reporting link.
 */
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { StatusBadge } from '@/design-system/components/StatusBadge'
import { ErrorState, LoadingBlock } from '@/design-system/components/Feedback'
import { ROLE_LABEL, SUBMISSION_STATUS_LABEL, type ModuleId } from '@/constants'
import { mockSoePortalService } from '@/mock-services'
import { useSessionStore } from '@/state/session'

export function ModuleStatusStrip({
  moduleId,
  workspaceLink = '/soe/reporting',
  workspaceLabel = 'Reporting',
}: {
  moduleId: ModuleId
  workspaceLink?: string
  workspaceLabel?: string
}) {
  const organizationId = useSessionStore((s) => s.organizationId)
  const reportingPeriodId = useSessionStore((s) => s.reportingPeriodId)

  const header = useQuery({
    queryKey: ['module-header', organizationId, reportingPeriodId, moduleId],
    queryFn: () =>
      mockSoePortalService.getModuleHeader(organizationId, reportingPeriodId, moduleId),
  })

  if (header.isLoading) return <LoadingBlock label="Loading module status…" />
  if (header.isError || !header.data) {
    return <ErrorState title="Unable to load module status" />
  }

  const row = header.data

  return (
    <div className="mb-4 flex flex-wrap items-center gap-3 rounded-card border border-soe-border bg-white px-4 py-3 text-sm">
      <StatusBadge
        status={row.submission.status}
        label={SUBMISSION_STATUS_LABEL[row.submission.status]}
      />
      <span className="text-soe-slate">Completion {row.submission.completeness}%</span>
      <span className="text-soe-slate">Owner: {ROLE_LABEL[row.def.ownerRole]}</span>
      <span className="text-soe-slate">Next: {row.nextAction}</span>
      <Link className="ml-auto text-soe-blue underline" to={workspaceLink}>
        {workspaceLabel}
      </Link>
    </div>
  )
}
