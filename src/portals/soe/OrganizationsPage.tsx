import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { useMemo } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { DataTable } from '@/components/tables/DataTable'
import { StatusBadge } from '@/design-system/components/StatusBadge'
import { Button } from '@/design-system/components/Button'
import { ErrorState } from '@/design-system/components/Feedback'
import { RequirePermission } from '@/app/router/guards'
import { PERMISSION } from '@/permissions'
import { mockOrganizationService } from '@/mock-services'
import type { Organization } from '@/types/domain'
import { useUiStore } from '@/state/ui'
import { AppError } from '@/utils'

export function OrganizationsPage() {
  return (
    <RequirePermission permission={PERMISSION.ORGANIZATION_READ}>
      <OrganizationsContent />
    </RequirePermission>
  )
}

function OrganizationsContent() {
  const queryClient = useQueryClient()
  const pushToast = useUiStore((s) => s.pushToast)
  const query = useQuery({
    queryKey: ['organizations'],
    queryFn: () => mockOrganizationService.getOrganizations({ pageSize: 50 }),
  })

  const mutation = useMutation({
    mutationFn: (org: Organization) =>
      mockOrganizationService.updateOrganization(org.id, {
        headOfficeAddress: `${org.headOfficeAddress} · verified`,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] })
      pushToast({ title: 'Organization updated.', tone: 'success' })
    },
    onError: (err: unknown) => {
      const message = err instanceof AppError ? err.message : 'Update failed'
      pushToast({ title: message, tone: 'critical' })
    },
  })

  const columns = useMemo<ColumnDef<Organization, unknown>[]>(
    () => [
      { accessorKey: 'abbreviation', header: 'Code' },
      { accessorKey: 'name', header: 'SOE' },
      { accessorKey: 'sector', header: 'Sector' },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ getValue }) => <StatusBadge status={String(getValue())} />,
      },
      { accessorKey: 'scenarioId', header: 'Scenario' },
      {
        id: 'actions',
        header: 'Action',
        cell: ({ row }) => (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => mutation.mutate(row.original)}
          >
            Simulate update
          </Button>
        ),
      },
    ],
    [mutation],
  )

  if (query.isError) {
    return <ErrorState title="Unable to load organizations" detail="Mock service error." />
  }

  return (
    <div>
      <PageHeader
        title="Organizations (demo)"
        subtitle="Prototype tool — prefer Enterprise / MoIP Master Registry for Phase 7 identity views"
      />
      <DataTable
        data={query.data?.items ?? []}
        columns={columns}
        isLoading={query.isLoading}
        searchPlaceholder="Search SOEs…"
      />
    </div>
  )
}
