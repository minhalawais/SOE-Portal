import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/design-system/components/Card'
import { StatusBadge } from '@/design-system/components/StatusBadge'
import { EmptyState, ErrorState, LoadingBlock } from '@/design-system/components/Feedback'
import { mockSoePortalService } from '@/mock-services'
import { useSessionStore } from '@/state/session'
import { ROLE_LABEL } from '@/constants'

export function ClarificationInboxPage() {
  const organizationId = useSessionStore((s) => s.organizationId)

  const query = useQuery({
    queryKey: ['clarification-inbox', organizationId],
    queryFn: () => mockSoePortalService.getClarificationInbox(organizationId),
  })

  if (query.isLoading) return <LoadingBlock />
  if (query.isError) return <ErrorState title="Unable to load clarifications" />

  const items = query.data ?? []

  return (
    <div>
      <PageHeader
        title="Clarification inbox"
        subtitle="MoIP questions linked to module, field, and due date"
      />
      <Card title="Open and recent clarifications">
        {items.length === 0 ? (
          <EmptyState
            title="No clarifications"
            hint="Items appear when MoIP requests clarification on a submission."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-soe-border text-xs text-soe-slate">
                  <th className="py-2 font-medium">Module</th>
                  <th className="py-2 font-medium">Question</th>
                  <th className="py-2 font-medium">Field</th>
                  <th className="py-2 font-medium">Received</th>
                  <th className="py-2 font-medium">Due</th>
                  <th className="py-2 font-medium">Status</th>
                  <th className="py-2 font-medium">Assignee</th>
                  <th className="py-2 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {items.map((c) => (
                  <tr key={c.id} className="border-b border-soe-border align-top">
                    <td className="py-2">{c.moduleLabel}</td>
                    <td className="py-2 max-w-xs">{c.question}</td>
                    <td className="py-2">{c.affectedField ?? 'General'}</td>
                    <td className="py-2 text-xs">
                      {new Date(c.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-2 text-xs">{c.dueDate ?? '—'}</td>
                    <td className="py-2">
                      <StatusBadge status={c.status} family="reporting" />
                    </td>
                    <td className="py-2 text-xs">{ROLE_LABEL[c.assignedRole]}</td>
                    <td className="py-2">
                      <Link className="text-soe-blue underline" to={c.route}>
                        Respond
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
