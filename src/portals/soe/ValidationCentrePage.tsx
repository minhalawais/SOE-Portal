import { Link } from 'react-router-dom'
import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/design-system/components/Card'
import { SelectField } from '@/design-system/components/Fields'
import { EmptyState, ErrorState, LoadingBlock } from '@/design-system/components/Feedback'
import { mockSoePortalService } from '@/mock-services'
import { useSessionStore } from '@/state/session'
import { ROLE_LABEL } from '@/constants'
import { REPORTING_MODULES } from '@/workflow/moduleCatalog'
import type { ValidationSeverity } from '@/mock-services/soePortal.service'

export function ValidationCentrePage() {
  const organizationId = useSessionStore((s) => s.organizationId)
  const reportingPeriodId = useSessionStore((s) => s.reportingPeriodId)
  const [moduleId, setModuleId] = useState('')
  const [severity, setSeverity] = useState('')
  const [ownerRole, setOwnerRole] = useState('')

  const query = useQuery({
    queryKey: [
      'validation-centre',
      organizationId,
      reportingPeriodId,
      moduleId,
      severity,
      ownerRole,
    ],
    queryFn: () =>
      mockSoePortalService.getValidationCentre(organizationId, reportingPeriodId, {
        moduleId: moduleId ? (moduleId as never) : undefined,
        severity: severity ? (severity as ValidationSeverity) : undefined,
        ownerRole: ownerRole ? (ownerRole as never) : undefined,
      }),
  })

  const ownerOptions = useMemo(() => {
    const roles = [...new Set(REPORTING_MODULES.map((m) => m.ownerRole))]
    return roles.map((r) => ({ value: r, label: ROLE_LABEL[r] }))
  }, [])

  if (query.isLoading) return <LoadingBlock />
  if (query.isError) return <ErrorState title="Unable to load validation centre" />

  const issues = query.data ?? []
  const grouped = {
    blocking: issues.filter((i) => i.severity === 'blocking'),
    warning: issues.filter((i) => i.severity === 'warning'),
    evidence: issues.filter((i) => i.severity === 'evidence'),
    incomplete: issues.filter((i) => i.severity === 'incomplete'),
  }

  return (
    <div>
      <PageHeader
        title="Validation centre"
        subtitle="Blocking · warnings · evidence missing · incomplete fields"
      />

      <div className="mb-4 grid gap-3 md:grid-cols-3">
        <SelectField
          label="Module"
          value={moduleId}
          options={[
            { value: '', label: 'All modules' },
            ...REPORTING_MODULES.map((m) => ({ value: m.id, label: m.label })),
          ]}
          onChange={(e) => setModuleId(e.target.value)}
        />
        <SelectField
          label="Severity"
          value={severity}
          options={[
            { value: '', label: 'All severities' },
            { value: 'blocking', label: 'Blocking' },
            { value: 'warning', label: 'Warning' },
            { value: 'evidence', label: 'Evidence missing' },
            { value: 'incomplete', label: 'Incomplete' },
          ]}
          onChange={(e) => setSeverity(e.target.value)}
        />
        <SelectField
          label="Owner"
          value={ownerRole}
          options={[{ value: '', label: 'All owners' }, ...ownerOptions]}
          onChange={(e) => setOwnerRole(e.target.value)}
        />
      </div>

      {issues.length === 0 ? (
        <EmptyState title="No validation issues for current filters" />
      ) : (
        <div className="grid gap-4">
          {(
            [
              ['Blocking', grouped.blocking],
              ['Warnings', grouped.warning],
              ['Evidence missing', grouped.evidence],
              ['Incomplete required', grouped.incomplete],
            ] as const
          ).map(([title, list]) =>
            list.length ? (
              <Card key={title} title={`${title} (${list.length})`}>
                <ul className="space-y-2 text-sm">
                  {list.map((i) => (
                    <li
                      key={i.id}
                      className="flex flex-wrap items-start justify-between gap-2 border-b border-soe-border py-1.5"
                    >
                      <span>
                        <span className="font-medium">{i.moduleLabel}</span> — {i.message}
                        <span className="mt-0.5 block text-xs text-soe-slate">
                          Owner: {ROLE_LABEL[i.ownerRole]}
                        </span>
                      </span>
                      <Link className="text-soe-blue underline" to={i.route}>
                        Open record
                      </Link>
                    </li>
                  ))}
                </ul>
              </Card>
            ) : null,
          )}
        </div>
      )}
    </div>
  )
}
