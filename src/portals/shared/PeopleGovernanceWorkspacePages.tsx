import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { DataTable } from '@/components/tables/DataTable'
import { Button } from '@/design-system/components/Button'
import { EmptyState, ErrorState, LoadingBlock } from '@/design-system/components/Feedback'
import { StatusBadge } from '@/design-system/components/StatusBadge'
import {
  BOARD_EXPIRY_BAND,
  BOARD_EXPIRY_BAND_LABEL,
  COMMITTEE_TYPE_LABEL,
  DECLARATION_STATUS_LABEL,
  DEMO_AS_OF_DATE,
  DIRECTOR_TYPE,
  DIRECTOR_TYPE_LABEL,
  EMPLOYMENT_TYPE,
  EMPLOYMENT_TYPE_LABEL,
  type EmploymentType,
} from '@/constants'
import { mockBoardService } from '@/mock-services/board.service'
import { mockWorkforceService } from '@/mock-services/workforce.service'
import { RecordAttachmentsPanel } from '@/portals/shared/DocumentsEvidenceWorkspacePages'
import { hasPermission, PERMISSION } from '@/permissions'
import { useSessionStore } from '@/state/session'
import { useUiStore } from '@/state/ui'
import type {
  BoardMember,
  Consultant,
  DailyWager,
  Employee,
  Executive,
  GovernanceCalendarEvent,
  SanctionedPost,
} from '@/types/domain'
import { AppError, cn, formatCurrencyPkr } from '@/utils'
import {
  daysUntil,
  maskCnic,
  resolveBoardExpiryBand,
} from '@/workflow/boardExpiry'

type PortalMode = 'soe' | 'moip' | 'minister' | 'secretary'

function PeopleNav({ portal }: { portal: PortalMode }) {
  if (portal !== 'soe') return null
  const tabs = [
    { to: '/soe/people/workforce', label: 'Workforce' },
    { to: '/soe/people/board', label: 'Board' },
    { to: '/soe/people/executives', label: 'Executives' },
    { to: '/soe/people/calendar', label: 'Calendar' },
  ]
  return (
    <nav className="mb-4 flex flex-wrap gap-1 border-b border-soe-border pb-2" aria-label="People sections">
      {tabs.map((t) => (
        <Link
          key={t.to}
          to={t.to}
          className="rounded-md px-3 py-1.5 text-sm font-medium text-soe-slate hover:bg-[var(--color-pending-soft)]"
        >
          {t.label}
        </Link>
      ))}
    </nav>
  )
}

function SummaryButton({
  label,
  value,
  onClick,
}: {
  label: string
  value: string
  onClick?: () => void
}) {
  const className =
    'rounded-card border border-soe-border bg-white p-4 text-left hover:border-soe-blue'
  if (!onClick) {
    return (
      <div className={className}>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-soe-slate">{label}</p>
        <p className="mt-1 text-2xl font-semibold text-soe-navy">{value}</p>
      </div>
    )
  }
  return (
    <button type="button" className={className} onClick={onClick}>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-soe-slate">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-soe-navy">{value}</p>
      <p className="mt-1 text-xs text-soe-blue">Open filtered view</p>
    </button>
  )
}

function DlRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex justify-between gap-3 border-b border-soe-border py-1.5 text-sm last:border-0">
      <dt className="text-soe-slate">{label}</dt>
      <dd className="text-right text-soe-navy">{value ?? '—'}</dd>
    </div>
  )
}

function FieldText({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-xs font-semibold text-soe-slate">{label}</span>
      <input
        className="h-9 w-full rounded-md border border-soe-border bg-white px-2.5 text-sm"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  )
}

function FieldNumber({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (value: number) => void
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-xs font-semibold text-soe-slate">{label}</span>
      <input
        type="number"
        className="h-9 w-full rounded-md border border-soe-border bg-white px-2.5 text-sm"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  )
}

export function WorkforceWorkspace({ portal }: { portal: PortalMode }) {
  const role = useSessionStore((s) => s.role)
  const organizationId = useSessionStore((s) => s.organizationId)
  const [searchParams, setSearchParams] = useSearchParams()
  const [tab, setTab] = useState<'employees' | 'posts' | 'wagers' | 'consultants'>('employees')

  const portfolioScope = portal !== 'soe'
  const canSeePersonal = hasPermission(role, PERMISSION.SENSITIVE_PERSONAL_READ)
  const canSeePay = hasPermission(role, PERMISSION.SENSITIVE_REMUNERATION_READ)

  const employmentType = (searchParams.get('employmentType') ?? '') as EmploymentType | ''
  const search = searchParams.get('search') ?? ''

  const summary = useQuery({
    queryKey: ['workforce-summary', portal, organizationId],
    queryFn: () =>
      mockWorkforceService.getSummary(
        portfolioScope ? undefined : organizationId,
        portfolioScope,
      ),
  })

  const employees = useQuery({
    queryKey: ['employees', portal, organizationId, employmentType, search],
    queryFn: () =>
      mockWorkforceService.getEmployees({
        pageSize: 50,
        search: search || undefined,
        employmentType: employmentType || undefined,
        organizationId: portfolioScope ? undefined : organizationId,
        portfolioScope,
        scopedOrganizationId: portfolioScope ? undefined : organizationId,
      }),
  })

  const posts = useQuery({
    queryKey: ['posts', organizationId, portfolioScope],
    queryFn: () =>
      mockWorkforceService.getSanctionedPosts(portfolioScope ? undefined : organizationId),
  })

  const wagers = useQuery({
    queryKey: ['daily-wagers', organizationId, portfolioScope],
    queryFn: () =>
      mockWorkforceService.getDailyWagers(portfolioScope ? undefined : organizationId),
  })

  const consultants = useQuery({
    queryKey: ['consultants', organizationId, portfolioScope],
    queryFn: () =>
      mockWorkforceService.getConsultants(portfolioScope ? undefined : organizationId),
  })

  const empColumns = useMemo<ColumnDef<Employee, unknown>[]>(
    () => [
      {
        id: 'code',
        header: 'Employee ID',
        cell: ({ row }) =>
          portal === 'soe' ? (
            <Link className="text-soe-navy hover:underline" to={`/soe/people/workforce/${row.original.id}`}>
              {row.original.employeeCode}
            </Link>
          ) : (
            row.original.employeeCode
          ),
      },
      { accessorKey: 'name', header: 'Name' },
      { accessorKey: 'designation', header: 'Designation' },
      { accessorKey: 'payScale', header: 'BPS' },
      {
        id: 'type',
        header: 'Type',
        cell: ({ row }) => EMPLOYMENT_TYPE_LABEL[row.original.employmentType],
      },
      { accessorKey: 'posting', header: 'Posting' },
      {
        id: 'decl',
        header: 'Asset declaration',
        cell: ({ row }) =>
          row.original.assetDeclarationStatus
            ? DECLARATION_STATUS_LABEL[row.original.assetDeclarationStatus]
            : '—',
      },
    ],
    [portal],
  )

  const postColumns = useMemo<ColumnDef<SanctionedPost, unknown>[]>(
    () => [
      { accessorKey: 'designation', header: 'Post title' },
      { accessorKey: 'payScale', header: 'BPS' },
      { accessorKey: 'department', header: 'Department' },
      { accessorKey: 'sanctioned', header: 'Sanctioned' },
      { accessorKey: 'filled', header: 'Filled' },
      { accessorKey: 'vacant', header: 'Vacant' },
      { accessorKey: 'criticality', header: 'Criticality' },
    ],
    [],
  )

  const wagerColumns = useMemo<ColumnDef<DailyWager, unknown>[]>(
    () => [
      { accessorKey: 'name', header: 'Name' },
      { accessorKey: 'roleLabel', header: 'Role' },
      { accessorKey: 'durationMonths', header: 'Duration (mo)' },
      {
        id: 'rate',
        header: 'Daily rate',
        cell: ({ row }) => formatCurrencyPkr(row.original.dailyRatePkr),
      },
      { accessorKey: 'fundingSource', header: 'Funding' },
    ],
    [],
  )

  const consultantColumns = useMemo<ColumnDef<Consultant, unknown>[]>(
    () => [
      { accessorKey: 'name', header: 'Name' },
      { accessorKey: 'project', header: 'Project' },
      { accessorKey: 'contractEnd', header: 'End date' },
      {
        id: 'rem',
        header: 'Monthly',
        cell: ({ row }) =>
          canSeePay ? formatCurrencyPkr(row.original.monthlyRemunerationPkr) : 'Restricted',
      },
      { accessorKey: 'status', header: 'Status' },
    ],
    [canSeePay],
  )

  if (summary.isError) {
    return <ErrorState title="Unable to load workforce" detail="Mock service error." />
  }

  return (
    <div>
      <PageHeader
        title={portal === 'soe' ? 'Workforce' : 'Workforce oversight'}
        subtitle={`Sanctioned vs filled · as of ${DEMO_AS_OF_DATE} · demo data`}
      />
      <PeopleNav portal={portal} />

      {summary.isLoading || !summary.data ? (
        <LoadingBlock />
      ) : (
        <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryButton label="Sanctioned" value={String(summary.data.sanctioned)} />
          <SummaryButton label="Filled" value={String(summary.data.filled)} />
          <SummaryButton
            label="Vacant"
            value={`${summary.data.vacant} (${summary.data.vacancyRatePct}%)`}
            onClick={() => setTab('posts')}
          />
          <SummaryButton
            label="Daily wagers"
            value={String(summary.data.dailyWagerCount)}
            onClick={() => setTab('wagers')}
          />
          <SummaryButton
            label="Active consultants"
            value={String(summary.data.consultantActiveCount)}
            onClick={() => setTab('consultants')}
          />
          <div className="rounded-card border border-soe-border bg-white p-4 sm:col-span-2 lg:col-span-3">
            <p className="mb-2 text-xs font-semibold uppercase text-soe-slate">Employment mix</p>
            <div className="flex flex-wrap gap-3 text-sm">
              {Object.entries(summary.data.byEmploymentType).map(([t, n]) => (
                <button
                  key={t}
                  type="button"
                  className="text-soe-navy hover:underline"
                  onClick={() => {
                    setTab('employees')
                    const next = new URLSearchParams(searchParams)
                    next.set('employmentType', t)
                    setSearchParams(next)
                  }}
                >
                  {EMPLOYMENT_TYPE_LABEL[t as EmploymentType] ?? t}: {n}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-soe-slate">
              Disability recorded: {summary.data.disabilityCount} · Gender counts aggregated
              only
              {!canSeePersonal ? ' · personal identifiers restricted' : ''}
            </p>
          </div>
        </div>
      )}

      <div className="mb-3 flex flex-wrap gap-1">
        {(
          [
            ['employees', 'Employees'],
            ['posts', 'Sanctioned posts'],
            ['wagers', 'Daily wagers'],
            ['consultants', 'Consultants'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              'rounded-md px-3 py-1.5 text-sm font-medium',
              tab === id
                ? 'bg-[var(--color-info-soft)] text-soe-navy'
                : 'text-soe-slate hover:bg-[var(--color-pending-soft)]',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'employees' ? (
        <>
          <div className="mb-3 flex flex-wrap gap-2">
            <input
              className="h-9 rounded-md border border-soe-border px-3 text-sm"
              placeholder="Search employees…"
              value={search}
              onChange={(e) => {
                const next = new URLSearchParams(searchParams)
                if (e.target.value) next.set('search', e.target.value)
                else next.delete('search')
                setSearchParams(next)
              }}
            />
            <select
              className="h-9 rounded-md border border-soe-border px-2 text-sm"
              value={employmentType}
              onChange={(e) => {
                const next = new URLSearchParams(searchParams)
                if (e.target.value) next.set('employmentType', e.target.value)
                else next.delete('employmentType')
                setSearchParams(next)
              }}
            >
              <option value="">All types</option>
              {Object.values(EMPLOYMENT_TYPE).map((t) => (
                <option key={t} value={t}>
                  {EMPLOYMENT_TYPE_LABEL[t]}
                </option>
              ))}
            </select>
          </div>
          <DataTable
            data={employees.data?.items ?? []}
            columns={empColumns}
            isLoading={employees.isLoading}
            searchPlaceholder="Filter table…"
          />
        </>
      ) : null}

      {tab === 'posts' ? (
        <DataTable
          data={posts.data ?? []}
          columns={postColumns}
          isLoading={posts.isLoading}
          searchPlaceholder="Filter posts…"
        />
      ) : null}

      {tab === 'wagers' ? (
        !(wagers.data?.length) && !wagers.isLoading ? (
          <EmptyState title="No daily wagers on file." hint="Some SOEs have few or none." />
        ) : (
          <DataTable
            data={wagers.data ?? []}
            columns={wagerColumns}
            isLoading={wagers.isLoading}
            searchPlaceholder="Filter daily wagers…"
          />
        )
      ) : null}

      {tab === 'consultants' ? (
        !(consultants.data?.length) && !consultants.isLoading ? (
          <EmptyState title="No consultants on file." hint="Compliant scenario may have none." />
        ) : (
          <DataTable
            data={consultants.data ?? []}
            columns={consultantColumns}
            isLoading={consultants.isLoading}
            searchPlaceholder="Filter consultants…"
          />
        )
      ) : null}
    </div>
  )
}

export function EmployeeDetailWorkspace() {
  const { employeeId = '' } = useParams()
  const role = useSessionStore((s) => s.role)
  const canSeePersonal = hasPermission(role, PERMISSION.SENSITIVE_PERSONAL_READ)
  const canSeePay = hasPermission(role, PERMISSION.SENSITIVE_REMUNERATION_READ)
  const canEdit = hasPermission(role, PERMISSION.WORKFORCE_EDIT)
  const qc = useQueryClient()
  const pushToast = useUiStore((s) => s.pushToast)

  const query = useQuery({
    queryKey: ['employee', employeeId],
    queryFn: () => mockWorkforceService.getEmployee(employeeId),
    enabled: Boolean(employeeId),
  })
  const [draft, setDraft] = useState<Employee | null>(null)
  useEffect(() => {
    if (query.data) setDraft(query.data)
  }, [query.data])
  const save = useMutation({
    mutationFn: () => {
      if (!draft) throw new AppError('Nothing to save', 'VALIDATION')
      return mockWorkforceService.updateEmployee(draft.id, draft)
    },
    onSuccess: (next) => {
      void qc.invalidateQueries({ queryKey: ['employee', employeeId] })
      void qc.invalidateQueries({ queryKey: ['employees'] })
      void qc.invalidateQueries({ queryKey: ['workforce-summary'] })
      setDraft(next)
      pushToast({ title: 'Employee record saved.', tone: 'success' })
    },
    onError: (err: unknown) => {
      pushToast({
        title: err instanceof AppError ? err.message : 'Employee update failed',
        tone: 'critical',
      })
    },
  })

  if (query.isLoading) return <LoadingBlock />
  if (query.isError || !query.data) {
    return <ErrorState title="Employee not found" detail="Return to workforce registry." />
  }
  const e = query.data

  return (
    <div>
      <PageHeader
        title={e.name}
        subtitle={`${e.employeeCode} · fictional demonstration record`}
        actions={
          <Link className="text-sm text-soe-blue hover:underline" to="/soe/people/workforce">
            Back
          </Link>
        }
      />
      <div className="grid gap-4 lg:grid-cols-2">
        {canEdit && draft ? (
          <section className="rounded-card border border-soe-border bg-white p-4 lg:col-span-2">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-soe-navy">Modify current data</h3>
              <Button size="sm" loading={save.isPending} onClick={() => save.mutate()}>
                Save employee
              </Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <FieldText label="Name" value={draft.name} onChange={(name) => setDraft({ ...draft, name })} />
              <FieldText label="Designation" value={draft.designation} onChange={(designation) => setDraft({ ...draft, designation })} />
              <FieldText label="BPS" value={draft.payScale ?? ''} onChange={(payScale) => setDraft({ ...draft, payScale })} />
              <FieldText label="Posting" value={draft.posting ?? ''} onChange={(posting) => setDraft({ ...draft, posting })} />
              <FieldText label="Reporting officer" value={draft.reportingOfficer ?? ''} onChange={(reportingOfficer) => setDraft({ ...draft, reportingOfficer })} />
              <FieldText label="Performance rating" value={draft.performanceRating ?? ''} onChange={(performanceRating) => setDraft({ ...draft, performanceRating })} />
              <FieldNumber label="Salary PKR" value={draft.salaryPkr ?? 0} onChange={(salaryPkr) => setDraft({ ...draft, salaryPkr })} />
              <FieldText label="Training summary" value={draft.trainingSummary ?? ''} onChange={(trainingSummary) => setDraft({ ...draft, trainingSummary })} />
            </div>
          </section>
        ) : null}
        <section className="rounded-card border border-soe-border bg-white p-4">
          <h3 className="mb-2 text-sm font-semibold text-soe-navy">Identity</h3>
          <dl>
            <DlRow label="CNIC" value={canSeePersonal ? e.cnic : maskCnic(e.cnic)} />
            <DlRow label="Gender" value={e.gender} />
            <DlRow label="Disability flag" value={e.disabilityFlag ? 'Yes' : 'No'} />
            <DlRow label="Qualification" value={e.qualification} />
          </dl>
        </section>
        <section className="rounded-card border border-soe-border bg-white p-4">
          <h3 className="mb-2 text-sm font-semibold text-soe-navy">Employment</h3>
          <dl>
            <DlRow label="Type" value={EMPLOYMENT_TYPE_LABEL[e.employmentType]} />
            <DlRow label="Designation" value={e.designation} />
            <DlRow label="BPS" value={e.payScale} />
            <DlRow label="Joining" value={e.joiningDate} />
            <DlRow label="Retirement" value={e.retirementDate} />
            <DlRow label="Reporting officer" value={e.reportingOfficer} />
          </dl>
        </section>
        <section className="rounded-card border border-soe-border bg-white p-4">
          <h3 className="mb-2 text-sm font-semibold text-soe-navy">Posting</h3>
          <dl>
            <DlRow label="Posting" value={e.posting} />
            <DlRow label="Province" value={e.province} />
          </dl>
        </section>
        <section className="rounded-card border border-soe-border bg-white p-4">
          <h3 className="mb-2 text-sm font-semibold text-soe-navy">Compensation</h3>
          <dl>
            <DlRow
              label="Salary"
              value={
                canSeePay && e.salaryPkr != null
                  ? formatCurrencyPkr(e.salaryPkr)
                  : 'Restricted'
              }
            />
          </dl>
        </section>
        <section className="rounded-card border border-soe-border bg-white p-4">
          <h3 className="mb-2 text-sm font-semibold text-soe-navy">Performance & training</h3>
          <dl>
            <DlRow label="Rating" value={e.performanceRating} />
            <DlRow label="Training" value={e.trainingSummary} />
            <DlRow
              label="Asset declaration"
              value={
                e.assetDeclarationStatus
                  ? DECLARATION_STATUS_LABEL[e.assetDeclarationStatus]
                  : '—'
              }
            />
          </dl>
        </section>
        <section className="rounded-card border border-soe-border bg-white p-4">
          <h3 className="mb-2 text-sm font-semibold text-soe-navy">Disciplinary</h3>
          {canSeePersonal ? (
            <p className="text-sm">Open cases: {e.disciplinaryOpenCases ?? 0}</p>
          ) : (
            <p className="text-sm text-soe-slate">Restricted — not shown on non-HR views.</p>
          )}
        </section>
      </div>
    </div>
  )
}

export function BoardWorkspace({ portal }: { portal: PortalMode }) {
  const role = useSessionStore((s) => s.role)
  const organizationId = useSessionStore((s) => s.organizationId)
  const [searchParams, setSearchParams] = useSearchParams()
  const portfolioScope = portal !== 'soe'
  const canSeePay = hasPermission(role, PERMISSION.SENSITIVE_REMUNERATION_READ)

  const expiryBand = searchParams.get('expiryBand') ?? ''
  const directorType = searchParams.get('directorType') ?? ''

  const summary = useQuery({
    queryKey: ['board-summary', portal, organizationId],
    queryFn: () =>
      mockBoardService.getBoardSummary(
        portfolioScope ? undefined : organizationId,
        portfolioScope,
      ),
  })

  const members = useQuery({
    queryKey: ['board-members', portal, organizationId, expiryBand, directorType],
    queryFn: () =>
      mockBoardService.listBoardMembers({
        pageSize: 50,
        organizationId: portfolioScope ? undefined : organizationId,
        portfolioScope,
        scopedOrganizationId: portfolioScope ? undefined : organizationId,
        expiryBand: expiryBand || undefined,
        directorType: directorType || undefined,
      }),
  })

  const committees = useQuery({
    queryKey: ['committees', organizationId, portfolioScope],
    queryFn: () =>
      mockBoardService.getCommittees(portfolioScope ? undefined : organizationId),
  })

  const columns = useMemo<ColumnDef<BoardMember, unknown>[]>(
    () => [
      {
        id: 'name',
        header: 'Name',
        cell: ({ row }) =>
          portal === 'soe' ? (
            <Link
              className="text-soe-navy hover:underline"
              to={`/soe/people/board/${row.original.id}`}
            >
              {row.original.name}
            </Link>
          ) : (
            row.original.name
          ),
      },
      { accessorKey: 'role', header: 'Role' },
      {
        id: 'type',
        header: 'Director type',
        cell: ({ row }) => DIRECTOR_TYPE_LABEL[row.original.memberType],
      },
      { accessorKey: 'appointmentDate', header: 'Appointed' },
      { accessorKey: 'expiryDate', header: 'Expiry' },
      {
        id: 'days',
        header: 'Days left',
        cell: ({ row }) =>
          row.original.isVacancySlot
            ? '—'
            : String(daysUntil(row.original.expiryDate, DEMO_AS_OF_DATE)),
      },
      {
        id: 'band',
        header: 'Warning',
        cell: ({ row }) => {
          const band = resolveBoardExpiryBand(row.original)
          return <StatusBadge status={band} label={BOARD_EXPIRY_BAND_LABEL[band]} />
        },
      },
      {
        id: 'att',
        header: 'Attendance',
        cell: ({ row }) =>
          row.original.attendancePct != null ? `${row.original.attendancePct}%` : '—',
      },
      {
        id: 'decl',
        header: 'Declarations',
        cell: ({ row }) =>
          row.original.conflictDeclarationStatus
            ? DECLARATION_STATUS_LABEL[row.original.conflictDeclarationStatus]
            : '—',
      },
      { accessorKey: 'status', header: 'Status' },
    ],
    [portal],
  )

  return (
    <div>
      <PageHeader
        title={portal === 'soe' ? 'Board governance' : 'Governance oversight'}
        subtitle={`Exception-first · expiry bands vs ${DEMO_AS_OF_DATE}`}
      />
      <PeopleNav portal={portal} />

      {summary.data ? (
        <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryButton label="Board size" value={String(summary.data.boardSize)} />
          <SummaryButton
            label="Vacancies"
            value={String(summary.data.vacancies)}
            onClick={() => {
              const next = new URLSearchParams()
              next.set('expiryBand', BOARD_EXPIRY_BAND.VACANCY)
              setSearchParams(next)
            }}
          />
          <SummaryButton
            label="Expiring ≤180d"
            value={String(summary.data.upcomingExpiries)}
            onClick={() => {
              const next = new URLSearchParams()
              next.set('expiryBand', BOARD_EXPIRY_BAND.WITHIN_90)
              setSearchParams(next)
            }}
          />
          <SummaryButton label="Expired" value={String(summary.data.expiredCount)} />
          <SummaryButton label="Missing declarations" value={String(summary.data.missingDeclarations)} />
          <SummaryButton label="Women directors" value={String(summary.data.womenDirectors)} />
          <SummaryButton label="Independent" value={String(summary.data.independentDirectors)} />
          <SummaryButton label="Board status" value={summary.data.boardStatus.replaceAll('_', ' ')} />
        </div>
      ) : (
        <LoadingBlock />
      )}

      {summary.data?.boardStatus === 'no_board' ? (
        <EmptyState title="No Board on file for this SOE." hint="SMEDA dormant scenario has no Board." />
      ) : (
        <>
          <div className="mb-3 flex flex-wrap gap-2">
            <select
              className="h-9 rounded-md border border-soe-border px-2 text-sm"
              value={expiryBand}
              onChange={(e) => {
                const next = new URLSearchParams(searchParams)
                if (e.target.value) next.set('expiryBand', e.target.value)
                else next.delete('expiryBand')
                setSearchParams(next)
              }}
            >
              <option value="">All expiry bands</option>
              {Object.values(BOARD_EXPIRY_BAND).map((b) => (
                <option key={b} value={b}>
                  {BOARD_EXPIRY_BAND_LABEL[b]}
                </option>
              ))}
            </select>
            <select
              className="h-9 rounded-md border border-soe-border px-2 text-sm"
              value={directorType}
              onChange={(e) => {
                const next = new URLSearchParams(searchParams)
                if (e.target.value) next.set('directorType', e.target.value)
                else next.delete('directorType')
                setSearchParams(next)
              }}
            >
              <option value="">All director types</option>
              {Object.values(DIRECTOR_TYPE).map((t) => (
                <option key={t} value={t}>
                  {DIRECTOR_TYPE_LABEL[t]}
                </option>
              ))}
            </select>
          </div>

          <DataTable
            data={members.data?.items ?? []}
            columns={columns}
            isLoading={members.isLoading}
            searchPlaceholder="Filter board…"
          />

          <section className="mt-4 rounded-card border border-soe-border bg-white p-4">
            <h3 className="mb-2 text-sm font-semibold text-soe-navy">Committees</h3>
            <ul className="space-y-2 text-sm">
              {(committees.data ?? []).map((c) => (
                <li key={c.id} className="flex flex-wrap justify-between gap-2 border-b border-soe-border pb-2">
                  <span>
                    {COMMITTEE_TYPE_LABEL[c.committeeType]} · {c.status}
                    {c.vacancyCount ? ` · ${c.vacancyCount} vacancy` : ''}
                  </span>
                  <span className="text-xs text-soe-slate">
                    Members: {c.memberBoardMemberIds.length}
                    {!canSeePay ? '' : ''}
                  </span>
                </li>
              ))}
              {!committees.data?.length ? (
                <li className="text-soe-slate">No committees on file.</li>
              ) : null}
            </ul>
            <p className="mt-2 text-xs text-soe-slate">
              Committee composition is illustrative — statutory rules not inferred.
            </p>
          </section>
        </>
      )}
    </div>
  )
}

export function BoardMemberDetailWorkspace() {
  const { memberId = '' } = useParams()
  const role = useSessionStore((s) => s.role)
  const canSeePersonal = hasPermission(role, PERMISSION.SENSITIVE_PERSONAL_READ)
  const canSeePay = hasPermission(role, PERMISSION.SENSITIVE_REMUNERATION_READ)
  const canEdit = hasPermission(role, PERMISSION.BOARD_EDIT)
  const qc = useQueryClient()
  const pushToast = useUiStore((s) => s.pushToast)

  const query = useQuery({
    queryKey: ['board-member', memberId],
    queryFn: () => mockBoardService.getBoardMember(memberId),
    enabled: Boolean(memberId),
  })
  const [draft, setDraft] = useState<BoardMember | null>(null)
  useEffect(() => {
    if (query.data) setDraft(query.data)
  }, [query.data])
  const save = useMutation({
    mutationFn: () => {
      if (!draft) throw new AppError('Nothing to save', 'VALIDATION')
      return mockBoardService.updateBoardMember(draft.id, draft)
    },
    onSuccess: (next) => {
      void qc.invalidateQueries({ queryKey: ['board-member', memberId] })
      void qc.invalidateQueries({ queryKey: ['board-members'] })
      void qc.invalidateQueries({ queryKey: ['board-summary'] })
      setDraft(next)
      pushToast({ title: 'Board member saved.', tone: 'success' })
    },
    onError: (err: unknown) => {
      pushToast({
        title: err instanceof AppError ? err.message : 'Board update failed',
        tone: 'critical',
      })
    },
  })
  const committees = useQuery({
    queryKey: ['committees-for-member', query.data?.organizationId],
    queryFn: () => mockBoardService.getCommittees(query.data!.organizationId),
    enabled: Boolean(query.data?.organizationId),
  })

  if (query.isLoading) return <LoadingBlock />
  if (query.isError || !query.data) {
    return <ErrorState title="Board member not found" detail="Return to Board registry." />
  }
  const b = query.data
  const band = resolveBoardExpiryBand(b)
  const memberCommittees = (committees.data ?? []).filter(
    (c) => b.committeeIds?.includes(c.id),
  )

  return (
    <div>
      <PageHeader
        title={b.name}
        subtitle={`${DIRECTOR_TYPE_LABEL[b.memberType]} · ${BOARD_EXPIRY_BAND_LABEL[band]}`}
        actions={
          <Link className="text-sm text-soe-blue hover:underline" to="/soe/people/board">
            Back
          </Link>
        }
      />
      <div className="mb-3">
        <StatusBadge status={band} label={BOARD_EXPIRY_BAND_LABEL[band]} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {canEdit && draft ? (
          <section className="rounded-card border border-soe-border bg-white p-4 lg:col-span-2">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-soe-navy">Modify current data</h3>
              <Button size="sm" loading={save.isPending} onClick={() => save.mutate()}>
                Save board member
              </Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <FieldText label="Name" value={draft.name} onChange={(name) => setDraft({ ...draft, name })} />
              <FieldText label="Role" value={draft.role} onChange={(memberRole) => setDraft({ ...draft, role: memberRole })} />
              <FieldText label="Qualification" value={draft.qualification ?? ''} onChange={(qualification) => setDraft({ ...draft, qualification })} />
              <FieldText label="Appointment date" value={draft.appointmentDate} onChange={(appointmentDate) => setDraft({ ...draft, appointmentDate })} />
              <FieldText label="Expiry date" value={draft.expiryDate} onChange={(expiryDate) => setDraft({ ...draft, expiryDate })} />
              <FieldNumber label="Attendance %" value={draft.attendancePct ?? 0} onChange={(attendancePct) => setDraft({ ...draft, attendancePct })} />
              <FieldNumber label="Remuneration PKR" value={draft.remunerationPkr ?? 0} onChange={(remunerationPkr) => setDraft({ ...draft, remunerationPkr })} />
              <FieldNumber label="Sitting fee PKR" value={draft.sittingFeePkr ?? 0} onChange={(sittingFeePkr) => setDraft({ ...draft, sittingFeePkr })} />
            </div>
          </section>
        ) : null}
        <section className="rounded-card border border-soe-border bg-white p-4">
          <h3 className="mb-2 text-sm font-semibold text-soe-navy">Profile</h3>
          <dl>
            <DlRow label="CNIC" value={canSeePersonal ? b.cnic : maskCnic(b.cnic)} />
            <DlRow label="Role" value={b.role} />
            <DlRow label="Qualification" value={b.qualification} />
            <DlRow label="Status" value={b.status} />
          </dl>
        </section>
        <section className="rounded-card border border-soe-border bg-white p-4">
          <h3 className="mb-2 text-sm font-semibold text-soe-navy">Appointment</h3>
          <dl>
            <DlRow label="Appointed" value={b.appointmentDate} />
            <DlRow label="Expiry" value={b.expiryDate} />
            <DlRow label="Days remaining" value={String(daysUntil(b.expiryDate))} />
            <DlRow
              label="Attendance"
              value={b.attendancePct != null ? `${b.attendancePct}%` : '—'}
            />
          </dl>
        </section>
        <section className="rounded-card border border-soe-border bg-white p-4">
          <h3 className="mb-2 text-sm font-semibold text-soe-navy">Declarations</h3>
          <dl>
            <DlRow
              label="Conflict of interest"
              value={
                b.conflictDeclarationStatus
                  ? DECLARATION_STATUS_LABEL[b.conflictDeclarationStatus]
                  : '—'
              }
            />
            <DlRow
              label="Asset declaration"
              value={
                b.assetDeclarationStatus
                  ? DECLARATION_STATUS_LABEL[b.assetDeclarationStatus]
                  : '—'
              }
            />
          </dl>
        </section>
        <section className="rounded-card border border-soe-border bg-white p-4">
          <h3 className="mb-2 text-sm font-semibold text-soe-navy">Remuneration</h3>
          {canSeePay ? (
            <dl>
              <DlRow
                label="Remuneration"
                value={b.remunerationPkr != null ? formatCurrencyPkr(b.remunerationPkr) : '—'}
              />
              <DlRow
                label="Sitting fee"
                value={b.sittingFeePkr != null ? formatCurrencyPkr(b.sittingFeePkr) : '—'}
              />
              <DlRow
                label="Travel"
                value={b.travelExpensePkr != null ? formatCurrencyPkr(b.travelExpensePkr) : '—'}
              />
            </dl>
          ) : (
            <p className="text-sm text-soe-slate">Restricted.</p>
          )}
        </section>
        <section className="rounded-card border border-soe-border bg-white p-4 lg:col-span-2">
          <h3 className="mb-2 text-sm font-semibold text-soe-navy">Committees</h3>
          <ul className="text-sm">
            {memberCommittees.map((c) => (
              <li key={c.id}>{COMMITTEE_TYPE_LABEL[c.committeeType]}</li>
            ))}
            {!memberCommittees.length ? <li className="text-soe-slate">None</li> : null}
          </ul>
          <p className="mt-2 text-xs text-soe-slate">Committee composition is illustrative.</p>
        </section>
        <div className="lg:col-span-2">
          <RecordAttachmentsPanel
            recordType="board_member"
            recordId={b.id}
            title="Appointment evidence"
          />
        </div>
      </div>
    </div>
  )
}

export function ExecutivesWorkspace({ portal }: { portal: PortalMode }) {
  const role = useSessionStore((s) => s.role)
  const organizationId = useSessionStore((s) => s.organizationId)
  const portfolioScope = portal !== 'soe'
  const canSeePay = hasPermission(role, PERMISSION.SENSITIVE_REMUNERATION_READ)

  const query = useQuery({
    queryKey: ['executives', organizationId, portfolioScope],
    queryFn: () =>
      mockBoardService.getExecutives(portfolioScope ? undefined : organizationId),
  })

  const columns = useMemo<ColumnDef<Executive, unknown>[]>(
    () => [
      {
        id: 'name',
        header: 'Name',
        cell: ({ row }) =>
          portal === 'soe' ? (
            <Link
              className="text-soe-navy hover:underline"
              to={`/soe/people/executives/${row.original.id}`}
            >
              {row.original.name}
            </Link>
          ) : (
            row.original.name
          ),
      },
      { accessorKey: 'role', header: 'Role' },
      { accessorKey: 'appointmentDate', header: 'Appointed' },
      {
        id: 'kpi',
        header: 'KPI summary',
        cell: ({ row }) => (
          <span className="text-xs">{row.original.performanceKpiSummary ?? '—'}</span>
        ),
      },
      {
        id: 'pay',
        header: 'Salary',
        cell: ({ row }) =>
          canSeePay && row.original.salaryPkr != null
            ? formatCurrencyPkr(row.original.salaryPkr)
            : 'Restricted',
      },
    ],
    [portal, canSeePay],
  )

  return (
    <div>
      <PageHeader
        title="Executive management"
        subtitle="CEO / MD / GM / Directors — remuneration role-gated"
      />
      <PeopleNav portal={portal} />
      <DataTable
        data={query.data ?? []}
        columns={columns}
        isLoading={query.isLoading}
        searchPlaceholder="Filter executives…"
      />
    </div>
  )
}

export function ExecutiveDetailWorkspace() {
  const { executiveId = '' } = useParams()
  const role = useSessionStore((s) => s.role)
  const canSeePay = hasPermission(role, PERMISSION.SENSITIVE_REMUNERATION_READ)
  const canEdit = hasPermission(role, PERMISSION.BOARD_EDIT)
  const qc = useQueryClient()
  const pushToast = useUiStore((s) => s.pushToast)

  const query = useQuery({
    queryKey: ['executive', executiveId],
    queryFn: () => mockBoardService.getExecutive(executiveId),
    enabled: Boolean(executiveId),
  })
  const [draft, setDraft] = useState<Executive | null>(null)
  useEffect(() => {
    if (query.data) setDraft(query.data)
  }, [query.data])
  const save = useMutation({
    mutationFn: () => {
      if (!draft) throw new AppError('Nothing to save', 'VALIDATION')
      return mockBoardService.updateExecutive(draft.id, draft)
    },
    onSuccess: (next) => {
      void qc.invalidateQueries({ queryKey: ['executive', executiveId] })
      void qc.invalidateQueries({ queryKey: ['executives'] })
      setDraft(next)
      pushToast({ title: 'Executive record saved.', tone: 'success' })
    },
    onError: (err: unknown) => {
      pushToast({
        title: err instanceof AppError ? err.message : 'Executive update failed',
        tone: 'critical',
      })
    },
  })

  if (query.isLoading) return <LoadingBlock />
  if (query.isError || !query.data) {
    return <ErrorState title="Executive not found" detail="Return to executives list." />
  }
  const e = query.data

  return (
    <div>
      <PageHeader
        title={e.name}
        subtitle={e.role}
        actions={
          <Link className="text-sm text-soe-blue hover:underline" to="/soe/people/executives">
            Back
          </Link>
        }
      />
      <div className="grid gap-4 lg:grid-cols-2">
        {canEdit && draft ? (
          <section className="rounded-card border border-soe-border bg-white p-4 lg:col-span-2">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-soe-navy">Modify current data</h3>
              <Button size="sm" loading={save.isPending} onClick={() => save.mutate()}>
                Save executive
              </Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <FieldText label="Name" value={draft.name} onChange={(name) => setDraft({ ...draft, name })} />
              <FieldText label="Appointment date" value={draft.appointmentDate} onChange={(appointmentDate) => setDraft({ ...draft, appointmentDate })} />
              <FieldText label="KPI summary" value={draft.performanceKpiSummary ?? ''} onChange={(performanceKpiSummary) => setDraft({ ...draft, performanceKpiSummary })} />
              <FieldText label="Perks" value={draft.perksSummary ?? ''} onChange={(perksSummary) => setDraft({ ...draft, perksSummary })} />
              <FieldNumber label="Salary PKR" value={draft.salaryPkr ?? 0} onChange={(salaryPkr) => setDraft({ ...draft, salaryPkr })} />
              <FieldNumber label="Bonus PKR" value={draft.bonusPkr ?? 0} onChange={(bonusPkr) => setDraft({ ...draft, bonusPkr })} />
              <FieldNumber label="Vehicles assigned" value={draft.vehiclesAssigned ?? 0} onChange={(vehiclesAssigned) => setDraft({ ...draft, vehiclesAssigned })} />
              <FieldNumber label="Foreign visits" value={draft.foreignVisitsLastYear ?? 0} onChange={(foreignVisitsLastYear) => setDraft({ ...draft, foreignVisitsLastYear })} />
            </div>
          </section>
        ) : null}
        <section className="rounded-card border border-soe-border bg-white p-4">
          <dl>
            <DlRow label="Appointed" value={e.appointmentDate} />
            <DlRow label="KPI summary" value={e.performanceKpiSummary} />
            <DlRow label="Perks" value={e.perksSummary} />
            <DlRow label="Official residence" value={e.officialResidence ? 'Yes' : 'No'} />
            <DlRow label="Vehicles" value={e.vehiclesAssigned} />
            <DlRow label="Foreign visits (last year)" value={e.foreignVisitsLastYear} />
          </dl>
        </section>
        <section className="rounded-card border border-soe-border bg-white p-4">
          <h3 className="mb-2 text-sm font-semibold text-soe-navy">Remuneration</h3>
          {canSeePay ? (
            <dl>
              <DlRow
                label="Salary"
                value={e.salaryPkr != null ? formatCurrencyPkr(e.salaryPkr) : '—'}
              />
              <DlRow
                label="Bonus"
                value={e.bonusPkr != null ? formatCurrencyPkr(e.bonusPkr) : '—'}
              />
            </dl>
          ) : (
            <p className="text-sm text-soe-slate">Restricted.</p>
          )}
        </section>
      </div>
    </div>
  )
}

export function GovernanceCalendarWorkspace({ portal }: { portal: PortalMode }) {
  const organizationId = useSessionStore((s) => s.organizationId)
  const portfolioScope = portal !== 'soe'
  const [view, setView] = useState<'all' | 'upcoming' | 'overdue'>('all')

  const query = useQuery({
    queryKey: ['gov-calendar', organizationId, portfolioScope, view],
    queryFn: () =>
      mockBoardService.getCalendar(portfolioScope ? undefined : organizationId, view),
  })

  const columns = useMemo<ColumnDef<GovernanceCalendarEvent, unknown>[]>(
    () => [
      { accessorKey: 'dueDate', header: 'Due' },
      { accessorKey: 'title', header: 'Item' },
      {
        id: 'kind',
        header: 'Kind',
        cell: ({ row }) => row.original.kind.replaceAll('_', ' '),
      },
      { accessorKey: 'status', header: 'Status' },
      {
        id: 'open',
        header: '',
        cell: ({ row }) =>
          row.original.linkPath && portal === 'soe' ? (
            <Link className="text-sm text-soe-blue hover:underline" to={row.original.linkPath}>
              Open
            </Link>
          ) : (
            '—'
          ),
      },
    ],
    [portal],
  )

  return (
    <div>
      <PageHeader
        title="Governance calendar"
        subtitle="Board expiries, vacancies, declarations and appointments"
      />
      <PeopleNav portal={portal} />
      <div className="mb-3 flex gap-1">
        {(['all', 'upcoming', 'overdue'] as const).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setView(v)}
            className={cn(
              'rounded-md px-3 py-1.5 text-sm font-medium capitalize',
              view === v
                ? 'bg-[var(--color-info-soft)] text-soe-navy'
                : 'text-soe-slate hover:bg-[var(--color-pending-soft)]',
            )}
          >
            {v}
          </button>
        ))}
      </div>
      <DataTable
        data={query.data ?? []}
        columns={columns}
        isLoading={query.isLoading}
        searchPlaceholder="Filter calendar…"
      />
    </div>
  )
}

export function MoipGovernancePage() {
  return (
    <div className="space-y-8">
      <BoardWorkspace portal="moip" />
      <WorkforceWorkspace portal="moip" />
    </div>
  )
}

export function MinisterGovernancePage() {
  return (
    <div>
      <PageHeader
        title="Governance risk"
        subtitle="Portfolio Board vacancies, expiries and declaration gaps"
      />
      <BoardWorkspace portal="minister" />
    </div>
  )
}

export function SecretaryGovernancePage() {
  return (
    <div>
      <PageHeader
        title="Governance"
        subtitle="Exception queue — vacancies, expiries and overdue declarations"
      />
      <GovernanceCalendarWorkspace portal="secretary" />
      <div className="mt-6">
        <BoardWorkspace portal="secretary" />
      </div>
    </div>
  )
}
