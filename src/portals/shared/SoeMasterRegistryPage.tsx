import { useQuery } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { DataTable } from '@/components/tables/DataTable'
import { Button } from '@/design-system/components/Button'
import { EmptyState, ErrorState, LoadingBlock } from '@/design-system/components/Feedback'
import { StatusBadge } from '@/design-system/components/StatusBadge'
import {
  LEGAL_STATUS,
  LEGAL_STATUS_LABEL,
  OWNERSHIP_BAND,
  OWNERSHIP_BAND_LABEL,
  SOE_STATUS,
  SOE_STATUS_LABEL,
  SUBMISSION_STATUS_LABEL,
  type LegalStatus,
  type OwnershipBand,
  type SoeStatus,
  type SubmissionStatus,
} from '@/constants'
import { mockOrganizationService } from '@/mock-services'
import { hasPermission, PERMISSION } from '@/permissions'
import { useSessionStore } from '@/state/session'
import { useUiStore } from '@/state/ui'
import type { RegistryRow } from '@/types/domain'

interface RegistryPageProps {
  portfolioScope: boolean
  detailPath: (organizationId: string) => string
  title?: string
  subtitle?: string
}

export function SoeMasterRegistryPage({
  portfolioScope,
  detailPath,
  title = 'SOE Master Registry',
  subtitle = 'Portfolio identity, legal status and ownership',
}: RegistryPageProps) {
  const role = useSessionStore((s) => s.role)
  const organizationId = useSessionStore((s) => s.organizationId)
  const reportingPeriodId = useSessionStore((s) => s.reportingPeriodId)
  const pushToast = useUiStore((s) => s.pushToast)

  const [search, setSearch] = useState('')
  const [sector, setSector] = useState('')
  const [status, setStatus] = useState<SoeStatus | ''>('')
  const [legalStatus, setLegalStatus] = useState<LegalStatus | ''>('')
  const [ownershipBand, setOwnershipBand] = useState<OwnershipBand | ''>('')

  const hasPortfolio = portfolioScope && hasPermission(role, PERMISSION.PORTFOLIO_READ)

  const allOrgs = useQuery({
    queryKey: ['organizations', 'registry-filters'],
    queryFn: () => mockOrganizationService.getOrganizations({ pageSize: 100 }),
  })

  const query = useQuery({
    queryKey: [
      'enterprise-registry',
      hasPortfolio,
      organizationId,
      search,
      sector,
      status,
      legalStatus,
      ownershipBand,
      reportingPeriodId,
    ],
    queryFn: () =>
      mockOrganizationService.getRegistry({
        pageSize: 50,
        search: search || undefined,
        sector: sector || undefined,
        status: status || undefined,
        legalStatus: legalStatus || undefined,
        ownershipBand: ownershipBand || undefined,
        portfolioScope: hasPortfolio,
        scopedOrganizationId: hasPortfolio ? undefined : organizationId,
        reportingPeriodId,
        sortBy: 'name',
      }),
  })

  const sectors = useMemo(
    () => [...new Set((allOrgs.data?.items ?? []).map((o) => o.sector))].sort(),
    [allOrgs.data],
  )

  const columns = useMemo<ColumnDef<RegistryRow, unknown>[]>(
    () => [
      {
        id: 'name',
        header: 'SOE',
        cell: ({ row }) => (
          <div>
            <Link
              className="font-medium text-soe-navy hover:underline"
              to={detailPath(row.original.organization.id)}
            >
              {row.original.organization.name}
            </Link>
            <p className="text-xs text-soe-slate">{row.original.organization.abbreviation}</p>
          </div>
        ),
      },
      {
        id: 'sector',
        header: 'Sector',
        cell: ({ row }) => row.original.organization.sector,
      },
      {
        id: 'legal',
        header: 'Legal status',
        cell: ({ row }) =>
          LEGAL_STATUS_LABEL[row.original.organization.legalStatus] ??
          row.original.organization.legalStatus,
      },
      {
        id: 'gov',
        header: 'Gov %',
        cell: ({ row }) => `${row.original.organization.governmentOwnershipPct}%`,
      },
      {
        id: 'status',
        header: 'Status',
        cell: ({ row }) => (
          <StatusBadge
            status={row.original.organization.status}
            label={SOE_STATUS_LABEL[row.original.organization.status]}
          />
        ),
      },
      {
        id: 'admin',
        header: 'Administrative',
        cell: ({ row }) => (
          <span className="text-xs">{row.original.parentAdministrative}</span>
        ),
      },
      {
        id: 'ho',
        header: 'Head office',
        cell: ({ row }) => <span className="text-xs">{row.original.headOffice}</span>,
      },
      {
        id: 'reporting',
        header: 'Reporting',
        cell: ({ row }) => {
          const s = row.original.reportingStatus
          if (!s || s === 'not_started') {
            return <span className="text-xs text-soe-slate">Not started</span>
          }
          return (
            <StatusBadge
              status={s}
              family="approval"
              label={SUBMISSION_STATUS_LABEL[s as SubmissionStatus] ?? s}
            />
          )
        },
      },
    ],
    [detailPath],
  )

  if (query.isError) {
    return <ErrorState title="Unable to load registry" detail="Mock service error." />
  }

  return (
    <div>
      <PageHeader
        title={title}
        subtitle={subtitle}
        actions={
          <Button
            variant="secondary"
            size="sm"
            onClick={() =>
              pushToast({
                title: 'Export placeholder — not connected in prototype.',
                tone: 'info',
              })
            }
          >
            Export
          </Button>
        }
      />

      {!hasPortfolio ? (
        <p className="mb-3 text-xs text-soe-slate">
          Scoped to your organization. Portfolio browse requires MoIP portfolio permission.
        </p>
      ) : null}

      <div className="mb-4 flex flex-wrap gap-2">
        <input
          className="h-9 rounded-md border border-soe-border px-3 text-sm"
          placeholder="Search name or code…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="h-9 rounded-md border border-soe-border px-2 text-sm"
          value={sector}
          onChange={(e) => setSector(e.target.value)}
        >
          <option value="">All sectors</option>
          {sectors.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          className="h-9 rounded-md border border-soe-border px-2 text-sm"
          value={status}
          onChange={(e) => setStatus(e.target.value as SoeStatus | '')}
        >
          <option value="">All statuses</option>
          {Object.values(SOE_STATUS).map((s) => (
            <option key={s} value={s}>
              {SOE_STATUS_LABEL[s]}
            </option>
          ))}
        </select>
        <select
          className="h-9 rounded-md border border-soe-border px-2 text-sm"
          value={legalStatus}
          onChange={(e) => setLegalStatus(e.target.value as LegalStatus | '')}
        >
          <option value="">All legal statuses</option>
          {Object.values(LEGAL_STATUS).map((s) => (
            <option key={s} value={s}>
              {LEGAL_STATUS_LABEL[s]}
            </option>
          ))}
        </select>
        <select
          className="h-9 rounded-md border border-soe-border px-2 text-sm"
          value={ownershipBand}
          onChange={(e) => setOwnershipBand(e.target.value as OwnershipBand | '')}
        >
          <option value="">All ownership bands</option>
          {Object.values(OWNERSHIP_BAND).map((b) => (
            <option key={b} value={b}>
              {OWNERSHIP_BAND_LABEL[b]}
            </option>
          ))}
        </select>
      </div>

      {query.isLoading ? (
        <LoadingBlock />
      ) : !query.data?.items.length ? (
        <EmptyState title="No enterprises match filters." hint="Adjust filters or reset search." />
      ) : (
        <DataTable
          data={query.data.items}
          columns={columns}
          isLoading={false}
          searchPlaceholder="Filter table…"
        />
      )}
    </div>
  )
}
