import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { DataTable } from '@/components/tables/DataTable'
import { Button } from '@/design-system/components/Button'
import { Card } from '@/design-system/components/Card'
import { Alert, EmptyState, ErrorState, LoadingBlock } from '@/design-system/components/Feedback'
import { KpiCard } from '@/design-system/components/KpiCard'
import { StatusBadge } from '@/design-system/components/StatusBadge'
import { RequirePermission } from '@/app/router/guards'
import {
  AUDIT_PARA_STATUS,
  AUDIT_PARA_STATUS_LABEL,
  AUDIT_TYPE_LABEL,
  COMPLIANCE_STATUS,
  COMPLIANCE_STATUS_LABEL,
  LITIGATION_STATUS_LABEL,
  PPRA_COMPLIANCE_LABEL,
  PROCUREMENT_HIGH_VALUE_THRESHOLD_PKR,
  PROCUREMENT_METHOD,
  PROCUREMENT_METHOD_LABEL,
  PRIVATIZATION_STAGE_LABEL,
  PRIVATIZATION_STAGE_ORDER,
  PRIVATIZATION_STAGE_STATUS,
  TRANSFORMATION_TYPE_LABEL,
  type AuditType,
  type ComplianceStatus,
  type PrivatizationStage,
} from '@/constants'
import {
  mockAuditService,
  mockComplianceService,
  mockLitigationService,
  mockOrganizationService,
  mockPrivatizationService,
} from '@/mock-services'
import {
  auditParaAgeDays,
  procurementAlerts,
  recoveryPct,
} from '@/mock-services/accountability.service'
import { hasPermission, PERMISSION } from '@/permissions'
import { useSessionStore } from '@/state/session'
import { useUiStore } from '@/state/ui'
import type {
  AuditPara,
  AuditRegister,
  ComplianceItem,
  LitigationCase,
  PacObservation,
  PrivatizationMilestone,
  ProcurementContract,
  TransformationInitiative,
} from '@/types/domain'
import { AppError, cn, formatCurrencyPkr } from '@/utils'

type PortalMode = 'soe' | 'moip' | 'minister' | 'secretary'

const linkClass = 'text-sm text-soe-blue underline'
const inputClass =
  'h-9 w-full rounded-md border border-soe-border bg-white px-2.5 text-sm disabled:bg-[var(--color-pending-soft)]'

const RECOVERY_STATUS_LABEL: Record<string, string> = {
  not_started: 'Not started',
  in_progress: 'In progress',
  partial: 'Partial',
  completed: 'Completed',
  written_off: 'Written off',
}

const PAC_STATUS_LABEL: Record<string, string> = {
  none: 'None',
  open: 'Open',
  overdue: 'Overdue',
  actioned: 'Actioned',
  closed: 'Closed',
}

const CONTRACT_STATUS_LABEL: Record<string, string> = {
  draft: 'Draft',
  active: 'Active',
  completed: 'Completed',
  terminated: 'Terminated',
  overdue: 'Overdue',
}

function scopedOrg(portal: PortalMode, organizationId: string) {
  return portal === 'soe' ? organizationId : undefined
}

function procurementPath(portal: PortalMode, id: string) {
  if (portal === 'soe') return `/soe/accountability/procurement/${id}`
  return `/soe/accountability/procurement/${id}`
}

function contractPath(_portal: PortalMode, id: string) {
  return `/soe/accountability/contracts/${id}`
}

function auditParaPath(_portal: PortalMode, id: string) {
  return `/soe/accountability/audit/paras/${id}`
}

function litigationPath(_portal: PortalMode, id: string) {
  return `/soe/accountability/litigation/${id}`
}

function privatizationDetailPath(_portal: PortalMode, caseId: string) {
  return `/soe/privatization/${caseId}`
}

function MoneyCell({ value }: { value: number | null | undefined }) {
  return <span className="tabular-nums">{formatCurrencyPkr(Number(value ?? 0))}</span>
}

function DetailRow({ label, value }: { label: string; value?: ReactNode }) {
  return (
    <div className="flex justify-between gap-3 border-b border-soe-border py-1.5 text-sm">
      <dt className="text-soe-slate">{label}</dt>
      <dd className="text-right text-soe-navy">{value ?? '—'}</dd>
    </div>
  )
}

function DetailDl({ children }: { children: ReactNode }) {
  return <dl className="space-y-0">{children}</dl>
}

function EditText({
  label,
  value,
  onChange,
  type = 'text',
}: {
  label: string
  value: string
  onChange: (value: string) => void
  type?: 'text' | 'date'
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-xs font-semibold text-soe-slate">{label}</span>
      <input className={inputClass} type={type} value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  )
}

function EditNumber({
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
        className={inputClass}
        min={0}
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  )
}

function EditSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: { value: string; label: string }[]
  onChange: (value: string) => void
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-xs font-semibold text-soe-slate">{label}</span>
      <select className={inputClass} value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
}

function AccountabilityNav({ portal }: { portal: PortalMode }) {
  if (portal !== 'soe') return null
  const tabs = [
    { to: '/soe/accountability/procurement', label: 'Procurement' },
    { to: '/soe/accountability/audit', label: 'Audit' },
    { to: '/soe/accountability/audit/pac', label: 'PAC' },
    { to: '/soe/accountability/litigation', label: 'Litigation' },
    { to: '/soe/accountability/compliance', label: 'Compliance' },
    { to: '/soe/privatization', label: 'Privatization' },
    { to: '/soe/privatization/transformation', label: 'Transformation' },
  ]
  return (
    <nav className="mb-4 flex flex-wrap gap-x-3 gap-y-1 text-xs" aria-label="Accountability sections">
      {tabs.map((t) => (
        <Link key={t.to} className={linkClass} to={t.to}>
          {t.label}
        </Link>
      ))}
    </nav>
  )
}

function HistoryList({ recordType, recordId }: { recordType: string; recordId: string }) {
  const history = useQuery({
    queryKey: ['accountability-history', recordType, recordId],
    queryFn: () => mockAuditService.getHistory(recordType, recordId),
  })
  if (history.isLoading) return <LoadingBlock label="Loading history…" />
  if (!history.data?.length) return <EmptyState title="No history" hint="Dummy demonstration data." />
  return (
    <ul className="space-y-1 text-sm">
      {history.data.map((h) => (
        <li key={h.id} className="flex justify-between border-b border-soe-border py-1.5">
          <span>{h.title}</span>
          <span className="text-xs text-soe-slate">
            {h.occurredAt.slice(0, 10)} · {h.actor}
          </span>
        </li>
      ))}
    </ul>
  )
}

export function AccountabilityExceptionsBanner({
  portal = 'soe',
  organizationId: orgOverride,
}: {
  portal?: PortalMode
  organizationId?: string
}) {
  const sessionOrg = useSessionStore((s) => s.organizationId)
  const organizationId = orgOverride ?? scopedOrg(portal, sessionOrg)
  const summary = useQuery({
    queryKey: ['accountability-exceptions', organizationId ?? 'portfolio'],
    queryFn: () => mockAuditService.getExceptionSummary(organizationId),
  })

  if (summary.isLoading) return <LoadingBlock label="Loading exceptions…" />
  if (summary.isError || !summary.data) return null

  const s = summary.data
  const items = [
    { label: 'Overdue procurement', count: s.overdueProcurement, tone: 'critical' as const },
    { label: 'Open audit paras', count: s.openAuditParas, tone: 'warning' as const },
    { label: 'Overdue PAC', count: s.overduePac, tone: 'critical' as const },
    { label: 'Upcoming hearings (7d)', count: s.upcomingHearings, tone: 'info' as const },
    { label: 'Overdue compliance', count: s.overdueCompliance, tone: 'critical' as const },
    { label: 'Blocked privatization', count: s.blockedPrivatization, tone: 'warning' as const },
    { label: 'Transformation pending approval', count: s.awaitingTransformationApproval, tone: 'info' as const },
  ].filter((i) => i.count > 0)

  if (!items.length) {
    return (
      <Alert tone="success" title="No open accountability exceptions" className="mb-3">
        Dummy data · thresholds provisional
      </Alert>
    )
  }

  return (
    <div className="mb-3 space-y-2">
      {items.map((i) => (
        <Alert key={i.label} tone={i.tone} title={`${i.count} · ${i.label}`} />
      ))}
    </div>
  )
}

export function ProcurementRegistryWorkspace({ portal = 'soe' }: { portal?: PortalMode }) {
  const organizationId = useSessionStore((s) => s.organizationId)
  const scoped = scopedOrg(portal, organizationId)
  const [searchParams, setSearchParams] = useSearchParams()
  const method = searchParams.get('method') ?? ''
  const status = searchParams.get('status') ?? ''

  const allQ = useQuery({
    queryKey: ['procurement-all', scoped ?? 'portfolio'],
    queryFn: () => mockAuditService.getProcurement(scoped),
  })
  const filteredQ = useQuery({
    queryKey: ['procurement-paged', scoped, method, status],
    queryFn: () =>
      mockAuditService.getProcurementPaged(scoped, {
        method: method || undefined,
        status: status || undefined,
      }),
  })
  const org = useQuery({
    queryKey: ['org', organizationId],
    queryFn: () => mockOrganizationService.getOrganization(organizationId),
    enabled: portal === 'soe',
  })

  const kpis = useMemo(() => {
    const rows = allQ.data ?? []
    return {
      overdue: rows.filter((p) => p.completionStatus === 'overdue' || p.contractStatus === 'overdue').length,
      highValue: rows.filter((p) => p.value >= PROCUREMENT_HIGH_VALUE_THRESHOLD_PKR).length,
      missingEvidence: rows.filter((p) => !p.evidenceAvailable || p.ppraCompliance === 'missing_evidence').length,
      total: rows.length,
    }
  }, [allQ.data])

  const columns = useMemo<ColumnDef<ProcurementContract, unknown>[]>(
    () => [
      {
        accessorKey: 'title',
        header: 'Title',
        cell: ({ row }) => (
          <Link className={linkClass} to={procurementPath(portal, row.original.id)}>
            {row.original.title}
          </Link>
        ),
      },
      { accessorKey: 'vendor', header: 'Vendor' },
      {
        accessorKey: 'method',
        header: 'Method',
        cell: ({ getValue }) =>
          PROCUREMENT_METHOD_LABEL[getValue() as keyof typeof PROCUREMENT_METHOD_LABEL] ?? String(getValue()),
      },
      { accessorKey: 'value', header: 'Value', cell: ({ getValue }) => <MoneyCell value={Number(getValue())} /> },
      {
        accessorKey: 'contractStatus',
        header: 'Status',
        cell: ({ getValue }) => (
          <StatusBadge
            status={String(getValue())}
            family="reporting"
            label={CONTRACT_STATUS_LABEL[String(getValue())] ?? String(getValue())}
          />
        ),
      },
      {
        id: 'alerts',
        header: 'Alerts',
        cell: ({ row }) => {
          const alerts = procurementAlerts(row.original)
          if (!alerts.length) return <span className="text-xs text-soe-slate">—</span>
          return (
            <span className="text-xs text-soe-warning">
              {alerts.length} alert{alerts.length > 1 ? 's' : ''}
            </span>
          )
        },
      },
    ],
    [portal],
  )

  return (
    <RequirePermission permission={PERMISSION.ACCOUNTABILITY_READ}>
      <div>
        <PageHeader
          title="Procurement register"
          subtitle={`${org.data?.abbreviation ?? 'Portfolio'} · exception-first · demo data · high-value ≥ ${formatCurrencyPkr(PROCUREMENT_HIGH_VALUE_THRESHOLD_PKR)} (provisional)`}
        />
        <AccountabilityNav portal={portal} />
        <AccountabilityExceptionsBanner portal={portal} />

        <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard label="Overdue" value={String(kpis.overdue)} />
          <KpiCard label="High value" value={String(kpis.highValue)} />
          <KpiCard label="Missing evidence" value={String(kpis.missingEvidence)} />
          <KpiCard label="Total records" value={String(kpis.total)} />
        </div>

        <div className="mb-3 flex flex-wrap gap-2">
          <select
            className={cn(inputClass, 'w-auto min-w-[140px]')}
            value={method}
            onChange={(e) => {
              const next = new URLSearchParams(searchParams)
              if (e.target.value) next.set('method', e.target.value)
              else next.delete('method')
              setSearchParams(next)
            }}
          >
            <option value="">All methods</option>
            {Object.values(PROCUREMENT_METHOD).map((m) => (
              <option key={m} value={m}>
                {PROCUREMENT_METHOD_LABEL[m]}
              </option>
            ))}
          </select>
          <select
            className={cn(inputClass, 'w-auto min-w-[140px]')}
            value={status}
            onChange={(e) => {
              const next = new URLSearchParams(searchParams)
              if (e.target.value) next.set('status', e.target.value)
              else next.delete('status')
              setSearchParams(next)
            }}
          >
            <option value="">All statuses</option>
            {Object.entries(CONTRACT_STATUS_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>

        {filteredQ.isLoading ? <LoadingBlock label="Loading procurement…" /> : null}
        {filteredQ.isError ? <ErrorState title="Unable to load procurement" /> : null}
        {filteredQ.data?.items.length ? (
          <DataTable data={filteredQ.data.items} columns={columns} density="compact" />
        ) : filteredQ.data ? (
          <EmptyState title="No procurement records" hint="Adjust filters or seed data." />
        ) : null}
      </div>
    </RequirePermission>
  )
}

export function ProcurementDetailWorkspace({ portal = 'soe' }: { portal?: PortalMode }) {
  const { id } = useParams<{ id: string }>()
  const role = useSessionStore((s) => s.role)
  const canEdit = portal === 'soe' && hasPermission(role, PERMISSION.PROCUREMENT_EDIT)
  const qc = useQueryClient()
  const pushToast = useUiStore((s) => s.pushToast)
  const row = useQuery({
    queryKey: ['procurement', id],
    enabled: Boolean(id),
    queryFn: () => mockAuditService.getProcurementById(id!),
  })
  const contract = useQuery({
    queryKey: ['procurement-contract', row.data?.linkedContractId],
    enabled: Boolean(row.data?.linkedContractId),
    queryFn: () => mockAuditService.getContract(row.data!.linkedContractId!),
  })
  const [draft, setDraft] = useState<ProcurementContract | null>(null)
  useEffect(() => {
    if (row.data) setDraft(row.data)
  }, [row.data])
  const save = useMutation({
    mutationFn: () => {
      if (!draft) throw new AppError('Nothing to save', 'VALIDATION')
      return mockAuditService.updateProcurement(draft.id, draft)
    },
    onSuccess: (next) => {
      void qc.invalidateQueries({ queryKey: ['procurement', id] })
      void qc.invalidateQueries({ queryKey: ['procurement-all'] })
      void qc.invalidateQueries({ queryKey: ['procurement-paged'] })
      setDraft(next)
      pushToast({ title: 'Procurement record saved.', tone: 'success' })
    },
    onError: (err: unknown) => {
      pushToast({
        title: err instanceof AppError ? err.message : 'Procurement update failed',
        tone: 'critical',
      })
    },
  })

  if (row.isLoading) return <LoadingBlock label="Loading procurement…" />
  if (row.isError || !row.data) {
    return <ErrorState title="Procurement not found" detail="Check the record ID." />
  }

  const p = row.data
  const alerts = procurementAlerts(p)

  return (
    <RequirePermission permission={PERMISSION.ACCOUNTABILITY_READ}>
      <div>
        <PageHeader
          title={p.title}
          subtitle={`${p.id} · dummy demonstration data`}
          actions={
            <Link className={linkClass} to="/soe/accountability/procurement">
              Back to register
            </Link>
          }
        />
        {portal === 'soe' ? <AccountabilityNav portal={portal} /> : null}

        {alerts.map((a) => (
          <Alert
            key={a.code}
            tone={a.severity === 'critical' ? 'critical' : 'warning'}
            title={a.message}
            className="mb-2"
          />
        ))}

        {canEdit && draft ? (
          <Card title="Modify current data" className="mb-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <EditText label="Title" value={draft.title} onChange={(title) => setDraft({ ...draft, title })} />
              <EditText label="Vendor" value={draft.vendor} onChange={(vendor) => setDraft({ ...draft, vendor })} />
              <EditText label="Plan reference" value={draft.planReference} onChange={(planReference) => setDraft({ ...draft, planReference })} />
              <EditText label="Responsible function" value={draft.responsibleFunction} onChange={(responsibleFunction) => setDraft({ ...draft, responsibleFunction })} />
              <EditNumber label="Value PKR" value={draft.value} onChange={(value) => setDraft({ ...draft, value })} />
              <EditSelect
                label="Method"
                value={draft.method}
                options={Object.entries(PROCUREMENT_METHOD_LABEL).map(([value, label]) => ({ value, label }))}
                onChange={(method) => setDraft({ ...draft, method })}
              />
              <EditSelect
                label="PPRA compliance"
                value={draft.ppraCompliance}
                options={Object.entries(PPRA_COMPLIANCE_LABEL).map(([value, label]) => ({ value, label }))}
                onChange={(ppraCompliance) => setDraft({ ...draft, ppraCompliance })}
              />
              <EditSelect
                label="Contract status"
                value={draft.contractStatus}
                options={Object.entries(CONTRACT_STATUS_LABEL).map(([value, label]) => ({ value, label }))}
                onChange={(contractStatus) => setDraft({ ...draft, contractStatus })}
              />
              <EditText label="Start date" type="date" value={draft.startDate ?? ''} onChange={(startDate) => setDraft({ ...draft, startDate })} />
              <EditText label="End date" type="date" value={draft.endDate ?? ''} onChange={(endDate) => setDraft({ ...draft, endDate })} />
              <EditText label="Completion due" type="date" value={draft.completionDueDate ?? ''} onChange={(completionDueDate) => setDraft({ ...draft, completionDueDate })} />
              <EditSelect
                label="Evidence"
                value={draft.evidenceAvailable ? 'yes' : 'no'}
                options={[
                  { value: 'yes', label: 'Available' },
                  { value: 'no', label: 'Missing' },
                ]}
                onChange={(value) => setDraft({ ...draft, evidenceAvailable: value === 'yes' })}
              />
            </div>
            <Button className="mt-3" size="sm" loading={save.isPending} onClick={() => save.mutate()}>
              Save procurement
            </Button>
          </Card>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-2">
          <Card title="Basic">
            <DetailDl>
              <DetailRow label="Plan reference" value={p.planReference} />
              <DetailRow label="Responsible function" value={p.responsibleFunction} />
              <DetailRow
                label="Evidence"
                value={p.evidenceAvailable ? 'Available' : 'Missing'}
              />
            </DetailDl>
          </Card>
          <Card title="Method & vendor">
            <DetailDl>
              <DetailRow
                label="Method"
                value={PROCUREMENT_METHOD_LABEL[p.method as keyof typeof PROCUREMENT_METHOD_LABEL] ?? p.method}
              />
              <DetailRow label="Vendor" value={p.vendor} />
              <DetailRow
                label="PPRA compliance"
                value={PPRA_COMPLIANCE_LABEL[p.ppraCompliance] ?? p.ppraCompliance}
              />
            </DetailDl>
          </Card>
          <Card title="Value & timeline">
            <DetailDl>
              <DetailRow label="Value" value={<MoneyCell value={p.value} />} />
              <DetailRow label="Start" value={p.startDate} />
              <DetailRow label="End" value={p.endDate} />
              <DetailRow label="Completion due" value={p.completionDueDate} />
              <DetailRow
                label="Completion status"
                value={
                  <StatusBadge status={p.completionStatus} family="reporting" label={p.completionStatus} />
                }
              />
            </DetailDl>
          </Card>
          <Card title="Compliance & contract">
            <DetailDl>
              <DetailRow
                label="Contract status"
                value={
                  <StatusBadge
                    status={p.contractStatus}
                    family="reporting"
                    label={CONTRACT_STATUS_LABEL[p.contractStatus] ?? p.contractStatus}
                  />
                }
              />
              <DetailRow
                label="Linked contract"
                value={
                  p.linkedContractId ? (
                    <Link className={linkClass} to={contractPath(portal, p.linkedContractId)}>
                      {p.linkedContractId}
                    </Link>
                  ) : (
                    '—'
                  )
                }
              />
            </DetailDl>
          </Card>
        </div>

        <Card title="Evidence" className="mt-4">
          <p className="text-sm text-soe-slate">
            Document metadata placeholder — evidence linked via Documents module in later phases.
          </p>
        </Card>

        <Card title="History" className="mt-4">
          <HistoryList recordType="procurement" recordId={p.id} />
        </Card>

        {contract.data ? (
          <Card title="Contract summary" className="mt-4">
            <DetailDl>
              <DetailRow label="Vendor" value={contract.data.vendor} />
              <DetailRow label="Value" value={<MoneyCell value={contract.data.contractValue} />} />
              <DetailRow label="Completion" value={`${contract.data.completionPct}%`} />
            </DetailDl>
          </Card>
        ) : null}
      </div>
    </RequirePermission>
  )
}

export function ContractDetailWorkspace({ portal = 'soe' }: { portal?: PortalMode }) {
  const { id } = useParams<{ id: string }>()
  const contract = useQuery({
    queryKey: ['contract', id],
    enabled: Boolean(id),
    queryFn: () => mockAuditService.getContract(id!),
  })
  const procurement = useQuery({
    queryKey: ['contract-proc', contract.data?.procurementId],
    enabled: Boolean(contract.data?.procurementId),
    queryFn: () => mockAuditService.getProcurementById(contract.data!.procurementId),
  })

  if (contract.isLoading) return <LoadingBlock label="Loading contract…" />
  if (contract.isError || !contract.data) {
    return <ErrorState title="Contract not found" />
  }

  const c = contract.data
  return (
    <RequirePermission permission={PERMISSION.ACCOUNTABILITY_READ}>
      <div>
        <PageHeader
          title={`Contract ${c.id}`}
          subtitle="Dummy demonstration data"
          actions={
            procurement.data ? (
              <Link className={linkClass} to={procurementPath(portal, procurement.data.id)}>
                View procurement
              </Link>
            ) : undefined
          }
        />
        <Card>
          <DetailDl>
            <DetailRow label="Procurement" value={c.procurementId} />
            <DetailRow label="Vendor" value={c.vendor} />
            <DetailRow label="Contract value" value={<MoneyCell value={c.contractValue} />} />
            <DetailRow label="Period" value={`${c.startDate} – ${c.endDate}`} />
            <DetailRow label="Completion" value={`${c.completionPct}%`} />
            <DetailRow label="Responsible officer" value={c.responsibleOfficer} />
            <DetailRow
              label="Status"
              value={
                <StatusBadge
                  status={c.status}
                  family="reporting"
                  label={CONTRACT_STATUS_LABEL[c.status] ?? c.status}
                />
              }
            />
            <DetailRow label="Amendments" value={String(c.amendments)} />
            <DetailRow label="Evidence" value={c.evidenceAvailable ? 'Available' : 'Missing'} />
          </DetailDl>
        </Card>
      </div>
    </RequirePermission>
  )
}

export function AuditRegisterWorkspace({ portal = 'soe' }: { portal?: PortalMode }) {
  const organizationId = useSessionStore((s) => s.organizationId)
  const scoped = scopedOrg(portal, organizationId)
  const registers = useQuery({
    queryKey: ['audit-registers', scoped ?? 'portfolio'],
    queryFn: () => mockAuditService.getAuditRegisters(scoped),
  })

  const columns = useMemo<ColumnDef<AuditRegister, unknown>[]>(
    () => [
      { accessorKey: 'id', header: 'Register ID' },
      {
        accessorKey: 'auditType',
        header: 'Type',
        cell: ({ getValue }) => AUDIT_TYPE_LABEL[getValue() as AuditType] ?? String(getValue()),
      },
      { accessorKey: 'auditPeriod', header: 'Period' },
      { accessorKey: 'auditor', header: 'Auditor' },
      { accessorKey: 'paraCount', header: 'Paras' },
      {
        accessorKey: 'totalAmountInvolved',
        header: 'Amount involved',
        cell: ({ getValue }) => <MoneyCell value={Number(getValue())} />,
      },
      { accessorKey: 'status', header: 'Status' },
    ],
    [],
  )

  return (
    <RequirePermission permission={PERMISSION.ACCOUNTABILITY_READ}>
      <div>
        <PageHeader title="Audit register" subtitle="Register entries · demo data · lifecycle provisional" />
        <AccountabilityNav portal={portal} />
        <div className="mb-3">
          <Link className={linkClass} to="/soe/accountability/audit/paras">
            Open audit para registry →
          </Link>
        </div>
        {registers.isLoading ? <LoadingBlock /> : null}
        {registers.isError ? <ErrorState title="Unable to load audit register" /> : null}
        {registers.data?.length ? (
          <DataTable data={registers.data} columns={columns} density="compact" />
        ) : registers.data ? (
          <EmptyState title="No audit registers" />
        ) : null}
      </div>
    </RequirePermission>
  )
}

export function AuditParaRegistryWorkspace({ portal = 'soe' }: { portal?: PortalMode }) {
  const organizationId = useSessionStore((s) => s.organizationId)
  const scoped = scopedOrg(portal, organizationId)
  const paras = useQuery({
    queryKey: ['audit-paras', scoped ?? 'portfolio'],
    queryFn: () => mockAuditService.getAuditParas(scoped),
  })

  const columns = useMemo<ColumnDef<AuditPara, unknown>[]>(
    () => [
      {
        accessorKey: 'title',
        header: 'Para',
        cell: ({ row }) => (
          <Link className={linkClass} to={auditParaPath(portal, row.original.id)}>
            {row.original.title || row.original.observation}
          </Link>
        ),
      },
      { accessorKey: 'auditId', header: 'Audit' },
      {
        accessorKey: 'amountInvolved',
        header: 'Amount',
        cell: ({ getValue }) => <MoneyCell value={Number(getValue())} />,
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ getValue }) => (
          <StatusBadge
            status={String(getValue())}
            family="reporting"
            label={AUDIT_PARA_STATUS_LABEL[String(getValue()) as keyof typeof AUDIT_PARA_STATUS_LABEL] ?? String(getValue())}
          />
        ),
      },
      {
        accessorKey: 'pacStatus',
        header: 'PAC',
        cell: ({ getValue }) => PAC_STATUS_LABEL[String(getValue())] ?? String(getValue()),
      },
      {
        id: 'recovery',
        header: 'Recovery %',
        cell: ({ row }) => `${recoveryPct(row.original.amountInvolved, row.original.amountRecovered)}%`,
      },
      {
        id: 'age',
        header: 'Age (days)',
        cell: ({ row }) => String(auditParaAgeDays(row.original.dateRaised)),
      },
    ],
    [portal],
  )

  return (
    <RequirePermission permission={PERMISSION.ACCOUNTABILITY_READ}>
      <div>
        <PageHeader title="Audit paras" subtitle="Recovery and PAC linkage · demo data" />
        <AccountabilityNav portal={portal} />
        {paras.isLoading ? <LoadingBlock /> : null}
        {paras.data?.length ? (
          <DataTable data={paras.data} columns={columns} density="compact" />
        ) : paras.data ? (
          <EmptyState title="No audit paras" />
        ) : null}
      </div>
    </RequirePermission>
  )
}

export function AuditParaDetailWorkspace({ portal = 'soe' }: { portal?: PortalMode }) {
  const { id } = useParams<{ id: string }>()
  const role = useSessionStore((s) => s.role)
  const canEdit = portal === 'soe' && hasPermission(role, PERMISSION.AUDIT_EDIT)
  const pushToast = useUiStore((s) => s.pushToast)
  const qc = useQueryClient()

  const para = useQuery({
    queryKey: ['audit-para', id],
    enabled: Boolean(id),
    queryFn: () => mockAuditService.getAuditPara(id!),
  })
  const pac = useQuery({
    queryKey: ['audit-para-pac', para.data?.linkedPacId],
    enabled: Boolean(para.data?.linkedPacId),
    queryFn: () => mockAuditService.getPacObservation(para.data!.linkedPacId!),
  })

  const [statusDraft, setStatusDraft] = useState<string | null>(null)
  const [recoveryDraft, setRecoveryDraft] = useState<number | null>(null)

  const save = useMutation({
    mutationFn: () => {
      if (!para.data) throw new AppError('Nothing to save', 'VALIDATION')
      return mockAuditService.updateAuditPara(para.data.id, {
        ...(statusDraft ? { status: statusDraft } : {}),
        ...(recoveryDraft != null ? { amountRecovered: recoveryDraft } : {}),
      })
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['audit-para', id] })
      void qc.invalidateQueries({ queryKey: ['audit-paras'] })
      pushToast({ title: 'Audit para updated.', tone: 'success' })
      setStatusDraft(null)
      setRecoveryDraft(null)
    },
    onError: (err: unknown) => {
      pushToast({
        title: err instanceof AppError ? err.message : 'Update failed',
        tone: 'critical',
      })
    },
  })

  if (para.isLoading) return <LoadingBlock />
  if (para.isError || !para.data) return <ErrorState title="Audit para not found" />

  const p = para.data
  const pct = recoveryPct(p.amountInvolved, p.amountRecovered)

  return (
    <RequirePermission permission={PERMISSION.ACCOUNTABILITY_READ}>
      <div>
        <PageHeader
          title={p.title || p.observation || p.id}
          subtitle={`${p.auditId} · demo data`}
          actions={
            <Link className={linkClass} to="/soe/accountability/audit">
              Back to audit
            </Link>
          }
        />

        <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard label="Amount involved" value={formatCurrencyPkr(p.amountInvolved)} />
          <KpiCard label="Recovered" value={formatCurrencyPkr(p.amountRecovered)} />
          <KpiCard label="Recovery %" value={`${pct}%`} />
          <KpiCard label="Age (days)" value={String(auditParaAgeDays(p.dateRaised))} />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card title="Para details">
            <DetailDl>
              <DetailRow label="Date raised" value={p.dateRaised} />
              <DetailRow label="Response due" value={p.responseDueDate} />
              <DetailRow label="Responsible function" value={p.responsibleFunction} />
              <DetailRow label="Responsible officer" value={p.responsibleOfficer} />
              <DetailRow
                label="Status"
                value={
                  <StatusBadge
                    status={p.status}
                    family="reporting"
                    label={AUDIT_PARA_STATUS_LABEL[p.status as keyof typeof AUDIT_PARA_STATUS_LABEL] ?? p.status}
                  />
                }
              />
              <DetailRow
                label="Recovery status"
                value={RECOVERY_STATUS_LABEL[p.recoveryStatus] ?? p.recoveryStatus}
              />
              <DetailRow label="Evidence" value={p.evidenceAvailable ? 'Available' : 'Missing'} />
            </DetailDl>
          </Card>
          <Card title="PAC linkage">
            {pac.data ? (
              <DetailDl>
                <DetailRow label="Observation" value={pac.data.observation} />
                <DetailRow label="Due" value={pac.data.dueDate} />
                <DetailRow
                  label="PAC status"
                  value={PAC_STATUS_LABEL[pac.data.status] ?? pac.data.status}
                />
                <DetailRow
                  label="View PAC"
                  value={
                    <Link className={linkClass} to="/soe/accountability/audit/pac">
                      Open PAC register
                    </Link>
                  }
                />
              </DetailDl>
            ) : (
              <EmptyState title="No linked PAC observation" />
            )}
          </Card>
        </div>

        {canEdit ? (
          <Card title="Update status / recovery" className="mt-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-xs font-medium text-soe-slate">
                Status
                <select
                  className={cn(inputClass, 'mt-1')}
                  value={statusDraft ?? p.status}
                  onChange={(e) => setStatusDraft(e.target.value)}
                >
                  {Object.values(AUDIT_PARA_STATUS).map((s) => (
                    <option key={s} value={s}>
                      {AUDIT_PARA_STATUS_LABEL[s]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs font-medium text-soe-slate">
                Amount recovered (PKR)
                <input
                  type="number"
                  min={0}
                  className={cn(inputClass, 'mt-1')}
                  value={recoveryDraft ?? p.amountRecovered}
                  onChange={(e) => setRecoveryDraft(Number(e.target.value))}
                />
              </label>
            </div>
            <div className="mt-3">
              <Button
                disabled={save.isPending || (statusDraft == null && recoveryDraft == null)}
                onClick={() => save.mutate()}
              >
                Save update
              </Button>
            </div>
          </Card>
        ) : null}

        <Card title="History" className="mt-4">
          <HistoryList recordType="audit_para" recordId={p.id} />
        </Card>
      </div>
    </RequirePermission>
  )
}

export function PacObservationsWorkspace({ portal = 'soe' }: { portal?: PortalMode }) {
  const organizationId = useSessionStore((s) => s.organizationId)
  const scoped = scopedOrg(portal, organizationId)
  const rows = useQuery({
    queryKey: ['pac-observations', scoped ?? 'portfolio'],
    queryFn: () => mockAuditService.getPacObservations(scoped),
  })

  const columns = useMemo<ColumnDef<PacObservation, unknown>[]>(
    () => [
      { accessorKey: 'observation', header: 'Observation' },
      { accessorKey: 'observationDate', header: 'Date' },
      { accessorKey: 'dueDate', header: 'Due' },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ getValue }) => (
          <StatusBadge status={String(getValue())} family="reporting" label={PAC_STATUS_LABEL[String(getValue())] ?? String(getValue())} />
        ),
      },
      {
        accessorKey: 'auditParaId',
        header: 'Audit para',
        cell: ({ row }) => (
          <Link className={linkClass} to={auditParaPath(portal, row.original.auditParaId)}>
            {row.original.auditParaId}
          </Link>
        ),
      },
    ],
    [portal],
  )

  return (
    <RequirePermission permission={PERMISSION.ACCOUNTABILITY_READ}>
      <div>
        <PageHeader title="PAC observations" subtitle="Linked to audit paras · demo data" />
        <AccountabilityNav portal={portal} />
        {rows.isLoading ? <LoadingBlock /> : null}
        {rows.data?.length ? (
          <DataTable data={rows.data} columns={columns} density="compact" />
        ) : rows.data ? (
          <EmptyState title="No PAC observations" />
        ) : null}
      </div>
    </RequirePermission>
  )
}

export function LitigationRegistryWorkspace({ portal = 'soe' }: { portal?: PortalMode }) {
  const organizationId = useSessionStore((s) => s.organizationId)
  const scoped = scopedOrg(portal, organizationId)
  const [searchParams, setSearchParams] = useSearchParams()
  const court = searchParams.get('court') ?? ''
  const status = searchParams.get('status') ?? ''

  const cases = useQuery({
    queryKey: ['litigation', scoped, court, status],
    queryFn: () =>
      mockLitigationService.getCases(scoped, {
        court: court || undefined,
        status: status || undefined,
      }),
  })

  const courts = useMemo(() => {
    const set = new Set((cases.data ?? []).map((c) => c.court))
    return [...set].sort()
  }, [cases.data])

  const columns = useMemo<ColumnDef<LitigationCase, unknown>[]>(
    () => [
      {
        accessorKey: 'caseNumber',
        header: 'Case',
        cell: ({ row }) => (
          <Link className={linkClass} to={litigationPath(portal, row.original.id)}>
            {row.original.caseNumber}
          </Link>
        ),
      },
      { accessorKey: 'court', header: 'Court' },
      { accessorKey: 'nature', header: 'Nature' },
      {
        accessorKey: 'amountInvolved',
        header: 'Exposure',
        cell: ({ getValue }) => <MoneyCell value={Number(getValue() ?? 0)} />,
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ getValue }) => LITIGATION_STATUS_LABEL[String(getValue())] ?? String(getValue()),
      },
      { accessorKey: 'nextHearing', header: 'Next hearing' },
    ],
    [portal],
  )

  return (
    <RequirePermission permission={PERMISSION.ACCOUNTABILITY_READ}>
      <div>
        <PageHeader title="Litigation register" subtitle="Sorted by next hearing · demo data" />
        <AccountabilityNav portal={portal} />
        <div className="mb-3 flex flex-wrap gap-2">
          <select
            className={cn(inputClass, 'w-auto min-w-[140px]')}
            value={court}
            onChange={(e) => {
              const next = new URLSearchParams(searchParams)
              if (e.target.value) next.set('court', e.target.value)
              else next.delete('court')
              setSearchParams(next)
            }}
          >
            <option value="">All courts</option>
            {courts.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <select
            className={cn(inputClass, 'w-auto min-w-[140px]')}
            value={status}
            onChange={(e) => {
              const next = new URLSearchParams(searchParams)
              if (e.target.value) next.set('status', e.target.value)
              else next.delete('status')
              setSearchParams(next)
            }}
          >
            <option value="">All statuses</option>
            {Object.entries(LITIGATION_STATUS_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
        {cases.isLoading ? <LoadingBlock /> : null}
        {cases.data?.length ? (
          <DataTable data={cases.data} columns={columns} density="compact" />
        ) : cases.data ? (
          <EmptyState title="No litigation cases" />
        ) : null}
      </div>
    </RequirePermission>
  )
}

export function LitigationDetailWorkspace({ portal = 'soe' }: { portal?: PortalMode }) {
  const { id } = useParams<{ id: string }>()
  const role = useSessionStore((s) => s.role)
  const canEdit = portal === 'soe' && hasPermission(role, PERMISSION.LITIGATION_EDIT)
  const qc = useQueryClient()
  const pushToast = useUiStore((s) => s.pushToast)
  const row = useQuery({
    queryKey: ['litigation-case', id],
    enabled: Boolean(id),
    queryFn: () => mockLitigationService.getCase(id!),
  })
  const [draft, setDraft] = useState<LitigationCase | null>(null)
  useEffect(() => {
    if (row.data) setDraft(row.data)
  }, [row.data])
  const save = useMutation({
    mutationFn: () => {
      if (!draft) throw new AppError('Nothing to save', 'VALIDATION')
      return mockLitigationService.updateCase(draft.id, draft)
    },
    onSuccess: (next) => {
      void qc.invalidateQueries({ queryKey: ['litigation-case', id] })
      void qc.invalidateQueries({ queryKey: ['litigation'] })
      setDraft(next)
      pushToast({ title: 'Litigation case saved.', tone: 'success' })
    },
    onError: (err: unknown) => {
      pushToast({
        title: err instanceof AppError ? err.message : 'Litigation update failed',
        tone: 'critical',
      })
    },
  })

  if (row.isLoading) return <LoadingBlock />
  if (row.isError || !row.data) return <ErrorState title="Case not found" />

  const c = row.data
  return (
    <RequirePermission permission={PERMISSION.ACCOUNTABILITY_READ}>
      <div>
        <PageHeader
          title={c.caseNumber}
          subtitle={`${c.court} · demo data`}
          actions={
            <Link className={linkClass} to="/soe/accountability/litigation">
              Back to register
            </Link>
          }
        />
        {canEdit && draft ? (
          <Card title="Modify current data" className="mb-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <EditText label="Case number" value={draft.caseNumber} onChange={(caseNumber) => setDraft({ ...draft, caseNumber })} />
              <EditText label="Court" value={draft.court} onChange={(court) => setDraft({ ...draft, court })} />
              <EditText label="Petitioner" value={draft.petitioner} onChange={(petitioner) => setDraft({ ...draft, petitioner })} />
              <EditText label="Respondent" value={draft.respondent} onChange={(respondent) => setDraft({ ...draft, respondent })} />
              <EditText label="Nature" value={draft.nature} onChange={(nature) => setDraft({ ...draft, nature })} />
              <EditText label="Counsel" value={draft.lawyer} onChange={(lawyer) => setDraft({ ...draft, lawyer })} />
              <EditNumber label="Exposure PKR" value={draft.amountInvolved ?? 0} onChange={(amountInvolved) => setDraft({ ...draft, amountInvolved })} />
              <EditText label="Next hearing" type="date" value={draft.nextHearing ?? ''} onChange={(nextHearing) => setDraft({ ...draft, nextHearing })} />
              <EditSelect
                label="Status"
                value={draft.status}
                options={Object.entries(LITIGATION_STATUS_LABEL).map(([value, label]) => ({ value, label }))}
                onChange={(status) => setDraft({ ...draft, status })}
              />
              <EditSelect
                label="Evidence"
                value={draft.evidenceAvailable ? 'yes' : 'no'}
                options={[
                  { value: 'yes', label: 'Available' },
                  { value: 'no', label: 'Missing' },
                ]}
                onChange={(value) => setDraft({ ...draft, evidenceAvailable: value === 'yes' })}
              />
            </div>
            <Button className="mt-3" size="sm" loading={save.isPending} onClick={() => save.mutate()}>
              Save litigation
            </Button>
          </Card>
        ) : null}
        <div className="grid gap-4 lg:grid-cols-2">
          <Card title="Parties">
            <DetailDl>
              <DetailRow label="Petitioner" value={c.petitioner} />
              <DetailRow label="Respondent" value={c.respondent} />
              <DetailRow label="Nature" value={c.nature} />
            </DetailDl>
          </Card>
          <Card title="Exposure & counsel">
            <DetailDl>
              <DetailRow label="Amount involved" value={<MoneyCell value={c.amountInvolved} />} />
              <DetailRow label="Counsel" value={c.lawyer} />
              <DetailRow
                label="Status"
                value={LITIGATION_STATUS_LABEL[c.status] ?? c.status}
              />
              <DetailRow label="Next hearing" value={c.nextHearing} />
            </DetailDl>
          </Card>
          <Card title="Related records">
            <DetailDl>
              <DetailRow
                label="Related asset"
                value={
                  c.relatedAssetId ? (
                    <Link className={linkClass} to={`/soe/assets/${c.relatedAssetId}`}>
                      {c.relatedAssetId}
                    </Link>
                  ) : (
                    '—'
                  )
                }
              />
              <DetailRow
                label="Related audit para"
                value={
                  c.relatedAuditParaId ? (
                    <Link className={linkClass} to={auditParaPath(portal, c.relatedAuditParaId)}>
                      {c.relatedAuditParaId}
                    </Link>
                  ) : (
                    '—'
                  )
                }
              />
            </DetailDl>
          </Card>
        </div>
      </div>
    </RequirePermission>
  )
}

export function ComplianceMatrixWorkspace({ portal = 'soe' }: { portal?: PortalMode }) {
  const organizationId = useSessionStore((s) => s.organizationId)
  const role = useSessionStore((s) => s.role)
  const scoped = scopedOrg(portal, organizationId)
  const canEdit = portal === 'soe' && hasPermission(role, PERMISSION.COMPLIANCE_EDIT)
  const pushToast = useUiStore((s) => s.pushToast)
  const qc = useQueryClient()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [statusDraft, setStatusDraft] = useState<ComplianceStatus | ''>('')

  const items = useQuery({
    queryKey: ['compliance-matrix', scoped ?? 'portfolio'],
    queryFn: () => mockComplianceService.getComplianceItems(scoped),
  })

  const save = useMutation({
    mutationFn: ({ id, status }: { id: string; status: ComplianceStatus }) =>
      mockComplianceService.updateComplianceItem(id, { status }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['compliance-matrix'] })
      pushToast({ title: 'Compliance status updated.', tone: 'success' })
      setEditingId(null)
      setStatusDraft('')
    },
    onError: (err: unknown) => {
      pushToast({
        title: err instanceof AppError ? err.message : 'Update failed',
        tone: 'critical',
      })
    },
  })

  const columns = useMemo<ColumnDef<ComplianceItem, unknown>[]>(
    () => [
      { accessorKey: 'area', header: 'Area' },
      { accessorKey: 'reportingFrequency', header: 'Frequency' },
      { accessorKey: 'dueDate', header: 'Due date' },
      { accessorKey: 'responsibleFunction', header: 'Owner' },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => {
          const item = row.original
          if (canEdit && editingId === item.id) {
            return (
              <div className="flex items-center gap-2">
                <select
                  className={cn(inputClass, 'h-8 w-auto')}
                  value={statusDraft || item.status}
                  onChange={(e) => setStatusDraft(e.target.value as ComplianceStatus)}
                >
                  {Object.values(COMPLIANCE_STATUS).map((s) => (
                    <option key={s} value={s}>
                      {COMPLIANCE_STATUS_LABEL[s]}
                    </option>
                  ))}
                </select>
                <Button
                  className="h-8"
                  disabled={save.isPending}
                  onClick={() =>
                    save.mutate({
                      id: item.id,
                      status: (statusDraft || item.status) as ComplianceStatus,
                    })
                  }
                >
                  Save
                </Button>
              </div>
            )
          }
          return (
            <StatusBadge
              status={item.status}
              family="reporting"
              label={COMPLIANCE_STATUS_LABEL[item.status]}
            />
          )
        },
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) =>
          canEdit ? (
            <button
              type="button"
              className="text-xs text-soe-blue underline"
              onClick={() => {
                setEditingId(row.original.id)
                setStatusDraft(row.original.status)
              }}
            >
              Edit
            </button>
          ) : null,
      },
    ],
    [canEdit, editingId, save.isPending, statusDraft],
  )

  return (
    <RequirePermission permission={PERMISSION.ACCOUNTABILITY_READ}>
      <div>
        <PageHeader title="Compliance matrix" subtitle="Obligations by area · demo data" />
        <AccountabilityNav portal={portal} />
        {items.isLoading ? <LoadingBlock /> : null}
        {items.data?.length ? (
          <DataTable data={items.data} columns={columns} density="compact" showSearch={false} />
        ) : items.data ? (
          <EmptyState title="No compliance items" />
        ) : null}
      </div>
    </RequirePermission>
  )
}

export function PrivatizationPipelineWorkspace({ portal = 'soe' }: { portal?: PortalMode }) {
  const organizationId = useSessionStore((s) => s.organizationId)
  const role = useSessionStore((s) => s.role)
  const scoped = scopedOrg(portal, organizationId)
  const canEdit = portal === 'soe' && hasPermission(role, PERMISSION.PRIVATIZATION_EDIT)
  const pushToast = useUiStore((s) => s.pushToast)
  const qc = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const selectedId = searchParams.get('caseId')

  const casesQ = useQuery({
    queryKey: ['priv-cases', scoped ?? 'portfolio'],
    queryFn: () => mockPrivatizationService.getCases(scoped),
  })

  const activeCaseId = selectedId ?? casesQ.data?.[0]?.id
  const caseQ = useQuery({
    queryKey: ['priv-case', activeCaseId],
    enabled: Boolean(activeCaseId),
    queryFn: () => mockPrivatizationService.getCase(activeCaseId!),
  })
  const milestonesQ = useQuery({
    queryKey: ['priv-ms', activeCaseId],
    enabled: Boolean(activeCaseId),
    queryFn: () => mockPrivatizationService.getMilestones(activeCaseId),
  })

  const advance = useMutation({
    mutationFn: () => mockPrivatizationService.advanceStage(activeCaseId!),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['priv-case'] })
      void qc.invalidateQueries({ queryKey: ['priv-ms'] })
      void qc.invalidateQueries({ queryKey: ['priv-cases'] })
      pushToast({ title: 'Stage advanced.', tone: 'success' })
    },
    onError: (err: unknown) => {
      pushToast({
        title: err instanceof AppError ? err.message : 'Cannot advance stage',
        tone: 'critical',
      })
    },
  })

  const msColumns = useMemo<ColumnDef<PrivatizationMilestone, unknown>[]>(
    () => [
      {
        accessorKey: 'stage',
        header: 'Stage',
        cell: ({ getValue }) =>
          PRIVATIZATION_STAGE_LABEL[getValue() as PrivatizationStage] ?? String(getValue()),
      },
      { accessorKey: 'name', header: 'Milestone' },
      { accessorKey: 'targetDate', header: 'Target' },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ getValue }) => (
          <StatusBadge status={String(getValue())} family="reporting" label={String(getValue())} />
        ),
      },
    ],
    [],
  )

  return (
    <RequirePermission permission={PERMISSION.ACCOUNTABILITY_READ}>
      <div>
        <PageHeader title="Privatization pipeline" subtitle="Stage model provisional · demo data" />
        <AccountabilityNav portal={portal} />

        {casesQ.isLoading ? <LoadingBlock /> : null}
        {casesQ.data?.length ? (
          <Card title="Cases" className="mb-4">
            <ul className="space-y-1 text-sm">
              {casesQ.data.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    className={cn(
                      'w-full rounded px-2 py-1.5 text-left hover:bg-[var(--color-pending-soft)]',
                      activeCaseId === c.id && 'bg-[var(--color-pending-soft)] font-medium',
                    )}
                    onClick={() => {
                      const next = new URLSearchParams(searchParams)
                      next.set('caseId', c.id)
                      setSearchParams(next)
                    }}
                  >
                    {c.id} · {PRIVATIZATION_STAGE_LABEL[c.currentStage as PrivatizationStage] ?? c.currentStage} · {c.status}
                  </button>
                </li>
              ))}
            </ul>
          </Card>
        ) : casesQ.data ? (
          <EmptyState title="No privatization cases" />
        ) : null}

        {caseQ.data ? (
          <>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm">
                Current stage:{' '}
                <strong>
                  {PRIVATIZATION_STAGE_LABEL[caseQ.data.currentStage as PrivatizationStage] ??
                    caseQ.data.currentStage}
                </strong>
                {caseQ.data.blocker ? (
                  <span className="ml-2 text-soe-warning">Blocker: {caseQ.data.blocker}</span>
                ) : null}
              </p>
              {canEdit ? (
                <Button disabled={advance.isPending} onClick={() => advance.mutate()}>
                  Advance stage
                </Button>
              ) : null}
            </div>

            <div className="mb-4 flex flex-wrap gap-1">
              {PRIVATIZATION_STAGE_ORDER.map((stage, i) => {
                const curIdx = PRIVATIZATION_STAGE_ORDER.indexOf(
                  caseQ.data!.currentStage as PrivatizationStage,
                )
                const ms = milestonesQ.data?.find((m) => m.stage === stage)
                const blocked = ms?.status === PRIVATIZATION_STAGE_STATUS.BLOCKED
                return (
                  <div
                    key={stage}
                    className={cn(
                      'rounded border px-2 py-1 text-xs',
                      i <= curIdx ? 'border-soe-blue bg-[var(--color-info-soft)]' : 'border-soe-border',
                      blocked && 'border-soe-warning',
                    )}
                  >
                    {PRIVATIZATION_STAGE_LABEL[stage]}
                  </div>
                )
              })}
            </div>

            {milestonesQ.data?.length ? (
              <DataTable data={milestonesQ.data} columns={msColumns} density="compact" showSearch={false} />
            ) : null}

            {activeCaseId ? (
              <div className="mt-3">
                <Link className={linkClass} to={privatizationDetailPath(portal, activeCaseId)}>
                  Open case detail →
                </Link>
              </div>
            ) : null}
          </>
        ) : null}
      </div>
    </RequirePermission>
  )
}

export function PrivatizationDetailWorkspace({ portal: _portal = 'soe' }: { portal?: PortalMode }) {
  const { caseId } = useParams<{ caseId: string }>()
  const caseQ = useQuery({
    queryKey: ['priv-case-detail', caseId],
    enabled: Boolean(caseId),
    queryFn: () => mockPrivatizationService.getCase(caseId!),
  })
  const milestonesQ = useQuery({
    queryKey: ['priv-ms-detail', caseId],
    enabled: Boolean(caseId),
    queryFn: () => mockPrivatizationService.getMilestones(caseId),
  })

  const msColumns = useMemo<ColumnDef<PrivatizationMilestone, unknown>[]>(
    () => [
      { accessorKey: 'name', header: 'Milestone' },
      { accessorKey: 'responsibleInstitution', header: 'Institution' },
      { accessorKey: 'targetDate', header: 'Target' },
      { accessorKey: 'status', header: 'Status' },
    ],
    [],
  )

  if (caseQ.isLoading) return <LoadingBlock />
  if (caseQ.isError || !caseQ.data) return <ErrorState title="Case not found" />

  const c = caseQ.data

  return (
    <RequirePermission permission={PERMISSION.ACCOUNTABILITY_READ}>
      <div>
        <PageHeader
          title={`Privatization ${c.id}`}
          subtitle="Dummy demonstration data"
          actions={
            <Link className={linkClass} to="/soe/privatization">
              Back to pipeline
            </Link>
          }
        />
        <Card title="Overview" className="mb-4">
          <DetailDl>
            <DetailRow
              label="Stage"
              value={
                PRIVATIZATION_STAGE_LABEL[c.currentStage as PrivatizationStage] ?? c.currentStage
              }
            />
            <DetailRow label="Status" value={c.status} />
            <DetailRow label="Next action" value={c.nextAction} />
            <DetailRow label="Blocker" value={c.blocker} />
          </DetailDl>
        </Card>
        <Card title="Cabinet / CCOP" className="mb-4">
          <DetailDl>
            <DetailRow label="Cabinet decision" value={c.cabinetDecision} />
            <DetailRow label="CCOP decision" value={c.ccopDecision} />
          </DetailDl>
        </Card>
        {milestonesQ.data?.length ? (
          <Card title="Milestones" className="mb-4">
            <DataTable data={milestonesQ.data} columns={msColumns} density="compact" showSearch={false} />
          </Card>
        ) : null}
        <Card title="Evidence & history">
          <p className="text-sm text-soe-slate">
            Evidence and formal history placeholders — linked in later phases.
          </p>
        </Card>
      </div>
    </RequirePermission>
  )
}

export function TransformationTrackerWorkspace({ portal = 'soe' }: { portal?: PortalMode }) {
  const organizationId = useSessionStore((s) => s.organizationId)
  const scoped = scopedOrg(portal, organizationId)
  const rows = useQuery({
    queryKey: ['transformations', scoped ?? 'portfolio'],
    queryFn: () => mockPrivatizationService.getTransformations(scoped),
  })

  const columns = useMemo<ColumnDef<TransformationInitiative, unknown>[]>(
    () => [
      { accessorKey: 'initiative', header: 'Initiative' },
      {
        accessorKey: 'type',
        header: 'Type',
        cell: ({ getValue }) =>
          TRANSFORMATION_TYPE_LABEL[getValue() as keyof typeof TRANSFORMATION_TYPE_LABEL] ??
          String(getValue()),
      },
      { accessorKey: 'currentStage', header: 'Stage' },
      { accessorKey: 'decisionStatus', header: 'Decision' },
      { accessorKey: 'nextAction', header: 'Next action' },
      {
        id: 'milestones',
        header: 'Milestones',
        cell: ({ row }) => {
          const ms = row.original.milestones
          if (!ms.length) return '—'
          return (
            <span className="text-xs text-soe-slate">
              {ms.filter((m) => m.status !== 'completed').length} open / {ms.length} total
            </span>
          )
        },
      },
    ],
    [],
  )

  return (
    <RequirePermission permission={PERMISSION.ACCOUNTABILITY_READ}>
      <div>
        <PageHeader title="Transformation tracker" subtitle="Initiatives and milestones · demo data" />
        <AccountabilityNav portal={portal} />
        {rows.isLoading ? <LoadingBlock /> : null}
        {rows.data?.length ? (
          <DataTable data={rows.data} columns={columns} density="compact" />
        ) : rows.data ? (
          <EmptyState title="No transformation initiatives" />
        ) : null}
      </div>
    </RequirePermission>
  )
}

export function MoipAuditCompliancePage() {
  const summary = useQuery({
    queryKey: ['moip-accountability-summary'],
    queryFn: () => mockAuditService.getExceptionSummary(),
  })
  const paras = useQuery({
    queryKey: ['moip-open-paras'],
    queryFn: () => mockAuditService.getAuditParas(),
  })
  const compliance = useQuery({
    queryKey: ['moip-overdue-compliance'],
    queryFn: () => mockComplianceService.getComplianceItems(),
  })

  const openParas = useMemo(
    () =>
      (paras.data ?? [])
        .filter(
          (p) =>
            p.status !== AUDIT_PARA_STATUS.SETTLED && p.status !== AUDIT_PARA_STATUS.CLOSED,
        )
        .sort((a, b) => b.amountInvolved - a.amountInvolved)
        .slice(0, 8),
    [paras.data],
  )
  const overdueCompliance = useMemo(
    () => (compliance.data ?? []).filter((c) => c.status === COMPLIANCE_STATUS.OVERDUE).slice(0, 8),
    [compliance.data],
  )

  const paraCols = useMemo<ColumnDef<AuditPara, unknown>[]>(
    () => [
      { accessorKey: 'title', header: 'Para' },
      {
        accessorKey: 'amountInvolved',
        header: 'Amount',
        cell: ({ getValue }) => <MoneyCell value={Number(getValue())} />,
      },
      { accessorKey: 'status', header: 'Status' },
      { accessorKey: 'organizationId', header: 'SOE' },
    ],
    [],
  )
  const compCols = useMemo<ColumnDef<ComplianceItem, unknown>[]>(
    () => [
      { accessorKey: 'area', header: 'Area' },
      { accessorKey: 'dueDate', header: 'Due' },
      { accessorKey: 'organizationId', header: 'SOE' },
    ],
    [],
  )

  return (
    <RequirePermission permission={PERMISSION.ACCOUNTABILITY_READ}>
      <div>
        <PageHeader
          title="Audit & compliance oversight"
          subtitle="Portfolio exceptions · dummy demonstration data"
        />
        <AccountabilityExceptionsBanner portal="moip" organizationId={undefined} />

        {summary.data ? (
          <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <KpiCard label="Open paras" value={String(summary.data.openAuditParas)} />
            <KpiCard label="Overdue PAC" value={String(summary.data.overduePac)} />
            <KpiCard label="Overdue compliance" value={String(summary.data.overdueCompliance)} />
            <KpiCard label="Overdue procurement" value={String(summary.data.overdueProcurement)} />
            <KpiCard label="Upcoming hearings" value={String(summary.data.upcomingHearings)} />
          </div>
        ) : null}

        <Card title="Top open audit paras (by amount)" className="mb-4">
          {paras.isLoading ? <LoadingBlock /> : null}
          {openParas.length ? (
            <DataTable data={openParas} columns={paraCols} density="compact" showSearch={false} />
          ) : (
            <EmptyState title="No open paras" />
          )}
        </Card>

        <Card title="Overdue compliance">
          {compliance.isLoading ? <LoadingBlock /> : null}
          {overdueCompliance.length ? (
            <DataTable data={overdueCompliance} columns={compCols} density="compact" showSearch={false} />
          ) : (
            <EmptyState title="No overdue compliance items" />
          )}
        </Card>
      </div>
    </RequirePermission>
  )
}

export function MinisterAuditLegalPage() {
  const summary = useQuery({
    queryKey: ['minister-accountability-summary'],
    queryFn: () => mockAuditService.getExceptionSummary(),
  })
  const litigation = useQuery({
    queryKey: ['minister-litigation'],
    queryFn: () => mockLitigationService.getCases(),
  })
  const privatCases = useQuery({
    queryKey: ['minister-priv-blocked'],
    queryFn: () => mockPrivatizationService.getCases(),
  })

  const highValueLit = useMemo(
    () =>
      [...(litigation.data ?? [])]
        .filter((c) => (c.amountInvolved ?? 0) >= PROCUREMENT_HIGH_VALUE_THRESHOLD_PKR)
        .sort((a, b) => (b.amountInvolved ?? 0) - (a.amountInvolved ?? 0))
        .slice(0, 6),
    [litigation.data],
  )
  const blockedCases = useMemo(
    () => (privatCases.data ?? []).filter((c) => c.blocker),
    [privatCases.data],
  )

  const litCols = useMemo<ColumnDef<LitigationCase, unknown>[]>(
    () => [
      { accessorKey: 'caseNumber', header: 'Case' },
      { accessorKey: 'court', header: 'Court' },
      {
        accessorKey: 'amountInvolved',
        header: 'Exposure',
        cell: ({ getValue }) => <MoneyCell value={Number(getValue() ?? 0)} />,
      },
      { accessorKey: 'nextHearing', header: 'Hearing' },
    ],
    [],
  )

  const totalExposure = useMemo(
    () => (litigation.data ?? []).reduce((s, c) => s + (c.amountInvolved ?? 0), 0),
    [litigation.data],
  )

  return (
    <RequirePermission permission={PERMISSION.ACCOUNTABILITY_READ}>
      <div>
        <PageHeader
          title="Audit & legal exposure"
          subtitle="Strategic portfolio view · thresholds provisional · demo data"
        />

        <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard label="Total litigation exposure" value={formatCurrencyPkr(totalExposure)} />
          <KpiCard label="Open audit paras" value={String(summary.data?.openAuditParas ?? '—')} />
          <KpiCard label="Overdue PAC" value={String(summary.data?.overduePac ?? '—')} />
          <KpiCard label="Blocked privatization" value={String(blockedCases.length)} />
        </div>

        <Card title="High-value litigation" className="mb-4">
          {highValueLit.length ? (
            <DataTable data={highValueLit} columns={litCols} density="compact" showSearch={false} />
          ) : (
            <EmptyState title="No high-value cases" hint={`Threshold ≥ ${formatCurrencyPkr(PROCUREMENT_HIGH_VALUE_THRESHOLD_PKR)} (provisional)`} />
          )}
        </Card>

        <Card title="Blocked privatization cases">
          {blockedCases.length ? (
            <ul className="space-y-1 text-sm">
              {blockedCases.map((c) => (
                <li key={c.id} className="flex justify-between border-b border-soe-border py-1.5">
                  <span>{c.id}</span>
                  <span className="text-soe-warning">{c.blocker}</span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="No blocked cases" />
          )}
        </Card>
      </div>
    </RequirePermission>
  )
}

export function SecretaryCompliancePage() {
  const compliance = useQuery({
    queryKey: ['secretary-compliance'],
    queryFn: () => mockComplianceService.getComplianceItems(),
  })
  const pac = useQuery({
    queryKey: ['secretary-pac-overdue'],
    queryFn: () => mockAuditService.getPacObservations(),
  })

  const overdueCompliance = useMemo(
    () => (compliance.data ?? []).filter((c) => c.status === COMPLIANCE_STATUS.OVERDUE),
    [compliance.data],
  )
  const overduePac = useMemo(
    () => (pac.data ?? []).filter((p) => p.status === 'overdue'),
    [pac.data],
  )

  const compCols = useMemo<ColumnDef<ComplianceItem, unknown>[]>(
    () => [
      { accessorKey: 'area', header: 'Area' },
      { accessorKey: 'dueDate', header: 'Due' },
      { accessorKey: 'responsibleFunction', header: 'Owner' },
      { accessorKey: 'organizationId', header: 'SOE' },
    ],
    [],
  )
  const pacCols = useMemo<ColumnDef<PacObservation, unknown>[]>(
    () => [
      { accessorKey: 'observation', header: 'Observation' },
      { accessorKey: 'dueDate', header: 'Due' },
      { accessorKey: 'organizationId', header: 'SOE' },
    ],
    [],
  )

  return (
    <RequirePermission permission={PERMISSION.ACCOUNTABILITY_READ}>
      <div>
        <PageHeader
          title="Compliance exceptions"
          subtitle="Overdue obligations and PAC · demo data"
        />

        <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard label="Overdue compliance" value={String(overdueCompliance.length)} />
          <KpiCard label="Overdue PAC" value={String(overduePac.length)} />
          <KpiCard label="Total obligations" value={String(compliance.data?.length ?? '—')} />
          <KpiCard label="PAC observations" value={String(pac.data?.length ?? '—')} />
        </div>

        <Card title="Overdue compliance" className="mb-4">
          {overdueCompliance.length ? (
            <DataTable data={overdueCompliance} columns={compCols} density="compact" showSearch={false} />
          ) : (
            <EmptyState title="No overdue compliance" />
          )}
        </Card>

        <Card title="Overdue PAC observations">
          {overduePac.length ? (
            <DataTable data={overduePac} columns={pacCols} density="compact" showSearch={false} />
          ) : (
            <EmptyState title="No overdue PAC items" />
          )}
        </Card>
      </div>
    </RequirePermission>
  )
}
