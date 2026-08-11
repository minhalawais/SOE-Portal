import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/design-system/components/Card'
import { StatusBadge } from '@/design-system/components/StatusBadge'
import { ErrorState, LoadingBlock } from '@/design-system/components/Feedback'
import { mockSoePortalService } from '@/mock-services'
import { useSessionStore } from '@/state/session'
import { ROLE_LABEL, SUBMISSION_STATUS_LABEL } from '@/constants'

export function ReportingWorkspacePage() {
  const organizationId = useSessionStore((s) => s.organizationId)
  const reportingPeriodId = useSessionStore((s) => s.reportingPeriodId)
  const role = useSessionStore((s) => s.role)

  const query = useQuery({
    queryKey: ['reporting-workspace', organizationId, reportingPeriodId, role],
    queryFn: () =>
      mockSoePortalService.getReportingWorkspace(organizationId, reportingPeriodId, role),
  })

  if (query.isLoading) return <LoadingBlock />
  if (query.isError || !query.data) {
    return <ErrorState title="Unable to load reporting workspace" />
  }

  const { modules, overallCompletion } = query.data

  return (
    <div>
      <PageHeader
        title="Reporting workspace"
        subtitle={`Overall completion ${overallCompletion}% · task-first module list`}
        actions={
          <div className="flex flex-wrap gap-3 text-sm">
            <Link className="text-soe-blue underline" to="/soe/validation">
              Validation
            </Link>
            <Link className="text-soe-blue underline" to="/soe/readiness">
              Readiness
            </Link>
          </div>
        }
      />

      <Card title="Modules">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-soe-border text-xs text-soe-slate">
                <th className="py-2 font-medium">Module</th>
                <th className="py-2 font-medium">Completion</th>
                <th className="py-2 font-medium">Status</th>
                <th className="py-2 font-medium">Validation</th>
                <th className="py-2 font-medium">Evidence gaps</th>
                <th className="py-2 font-medium">Owner</th>
                <th className="py-2 font-medium">Updated</th>
                <th className="py-2 font-medium">Next action</th>
              </tr>
            </thead>
            <tbody>
              {modules.map((m) => (
                <tr key={m.def.id} className="border-b border-soe-border">
                  <td className="py-2 font-medium">{m.def.label}</td>
                  <td className="py-2">{m.submission.completeness}%</td>
                  <td className="py-2">
                    <StatusBadge
                      status={m.submission.status}
                      label={SUBMISSION_STATUS_LABEL[m.submission.status]}
                    />
                  </td>
                  <td className="py-2">{m.validationIssueCount}</td>
                  <td className="py-2">{m.evidenceGapCount}</td>
                  <td className="py-2 text-xs">{ROLE_LABEL[m.def.ownerRole]}</td>
                  <td className="py-2 text-xs text-soe-slate">
                    {new Date(m.submission.updatedAt).toLocaleDateString()}
                  </td>
                  <td className="py-2">
                    <Link className="text-soe-blue underline" to={m.def.route}>
                      {m.nextAction}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
