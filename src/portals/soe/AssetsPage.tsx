import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { useMemo } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { DataTable } from '@/components/tables/DataTable'
import { RequirePermission } from '@/app/router/guards'
import { PERMISSION } from '@/permissions'
import { ASSET_UTILIZATION } from '@/constants'
import { mockAssetService } from '@/mock-services'
import type { Asset } from '@/types/domain'
import { formatCurrencyPkr } from '@/utils'
import { useSessionStore } from '@/state/session'
import { Button } from '@/design-system/components/Button'
import { useUiStore } from '@/state/ui'

export function AssetsPage() {
  return (
    <RequirePermission permission={PERMISSION.ASSETS_READ}>
      <AssetsContent />
    </RequirePermission>
  )
}

function AssetsContent() {
  const organizationId = useSessionStore((s) => s.organizationId)
  const queryClient = useQueryClient()
  const pushToast = useUiStore((s) => s.pushToast)

  const query = useQuery({
    queryKey: ['assets', organizationId],
    queryFn: () => mockAssetService.getAssets({ organizationId, pageSize: 50 }),
  })

  const mutation = useMutation({
    mutationFn: (asset: Asset) =>
      mockAssetService.updateAsset(asset.id, {
        utilizationStatus: ASSET_UTILIZATION.UTILIZED,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets', organizationId] })
      pushToast({ title: 'Asset utilization set to Utilized.', tone: 'success' })
    },
  })

  const columns = useMemo<ColumnDef<Asset, unknown>[]>(
    () => [
      { accessorKey: 'name', header: 'Asset' },
      { accessorKey: 'assetType', header: 'Type' },
      {
        accessorKey: 'bookValue',
        header: 'Book value',
        cell: ({ getValue }) => formatCurrencyPkr(Number(getValue() ?? 0)),
      },
      {
        accessorKey: 'marketValue',
        header: 'Market value',
        cell: ({ getValue }) => formatCurrencyPkr(Number(getValue() ?? 0)),
      },
      { accessorKey: 'utilizationStatus', header: 'Utilization' },
      {
        id: 'actions',
        header: 'Action',
        cell: ({ row }) => (
          <Button size="sm" variant="secondary" onClick={() => mutation.mutate(row.original)}>
            Set utilized
          </Button>
        ),
      },
    ],
    [mutation],
  )

  return (
    <div>
      <PageHeader
        title="Asset Registry"
        subtitle="Scoped to selected organization context"
      />
      <DataTable
        data={query.data?.items ?? []}
        columns={columns}
        isLoading={query.isLoading}
        emptyTitle="No assets for this organization."
      />
    </div>
  )
}
