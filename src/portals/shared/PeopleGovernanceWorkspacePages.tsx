import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link, useParams, useSearchParams, Navigate } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { ContributorModuleLayout, ContributorRegistryLayout, EntryFormSection, EntryFormShell, ExecutivePeopleSectionNav, RegistryTabBar, useScrollToEntryOnSelect } from '@/components/soe'
import { DataTable } from '@/components/tables/DataTable'
import { SelectField, CurrencyField, TextField } from '@/design-system/components/Fields'
import { Button } from '@/design-system/components/Button'
import { EmptyState, ErrorState, LoadingBlock } from '@/design-system/components/Feedback'
import { StatusBadge } from '@/design-system/components/StatusBadge'
import {
  BOARD_EXPIRY_BAND,
  BOARD_EXPIRY_BAND_LABEL,
  BOARD_MEMBER_STATUS,
  COMMITTEE_TYPE_LABEL,
  CONSULTANT_STATUS,
  DECLARATION_STATUS,
  DECLARATION_STATUS_LABEL,
  DEMO_AS_OF_DATE,
  DIRECTOR_TYPE,
  DIRECTOR_TYPE_LABEL,
  EMPLOYMENT_TYPE,
  EMPLOYMENT_TYPE_LABEL,
  EXECUTIVE_ROLE,
  GENDER,
  GOVERNANCE_CALENDAR_KIND,
  MODULE,
  type EmploymentType,
  type ExecutiveRole,
  type Gender,
} from '@/constants'
import { mockBoardService } from '@/mock-services/board.service'
import { mockWorkforceService } from '@/mock-services/workforce.service'
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
  resolveBoardExpiryBand,
} from '@/workflow/boardExpiry'

type PortalMode = 'soe' | 'moip' | 'minister' | 'secretary'

const WORKFORCE_REGISTRY_TABS = [
  { id: 'employees' as const, label: 'Employees' },
  { id: 'posts' as const, label: 'Sanctioned posts' },
  { id: 'wagers' as const, label: 'Daily wagers' },
  { id: 'consultants' as const, label: 'Consultants' },
]

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

function emptyEmployee(organizationId: string): Employee {
  return {
    id: '',
    organizationId,
    employeeCode: '',
    name: '',
    designation: '',
    employmentType: EMPLOYMENT_TYPE.REGULAR,
    assetDeclarationStatus: DECLARATION_STATUS.PENDING,
    isDummyDemonstrationData: true,
  }
}

function emptyBoardMember(organizationId: string): BoardMember {
  return {
    id: '',
    organizationId,
    name: '',
    role: '',
    memberType: DIRECTOR_TYPE.INDEPENDENT,
    appointmentDate: DEMO_AS_OF_DATE,
    expiryDate: DEMO_AS_OF_DATE,
    status: BOARD_MEMBER_STATUS.ACTIVE,
    conflictDeclarationStatus: DECLARATION_STATUS.PENDING,
    assetDeclarationStatus: DECLARATION_STATUS.PENDING,
    isDummyDemonstrationData: true,
  }
}

function emptyExecutive(organizationId: string): Executive {
  return {
    id: '',
    organizationId,
    name: '',
    role: EXECUTIVE_ROLE.CEO,
    appointmentDate: DEMO_AS_OF_DATE,
    isDummyDemonstrationData: true,
  }
}

function emptyCalendarEvent(organizationId: string): GovernanceCalendarEvent {
  return {
    id: '',
    organizationId,
    kind: GOVERNANCE_CALENDAR_KIND.GOVERNANCE_DEADLINE,
    title: '',
    dueDate: DEMO_AS_OF_DATE,
    status: 'upcoming',
    relatedRecordType: 'appointment',
  }
}

function emptyDailyWager(organizationId: string): DailyWager {
  return {
    id: '',
    organizationId,
    name: '',
    roleLabel: '',
    durationMonths: 6,
    dailyRatePkr: 1500,
    fundingSource: 'Operational budget',
    isDummyDemonstrationData: true,
  }
}

function emptyConsultant(organizationId: string): Consultant {
  return {
    id: '',
    organizationId,
    name: '',
    project: '',
    contractStart: DEMO_AS_OF_DATE,
    contractEnd: DEMO_AS_OF_DATE,
    monthlyRemunerationPkr: 0,
    fundingSource: 'Project budget',
    torsSummary: '',
    deliverablesSummary: '',
    status: CONSULTANT_STATUS.ACTIVE,
    isDummyDemonstrationData: true,
  }
}

function useWorkforceEmployeeEntry(
  employeeId: string | null,
  organizationId: string,
  onRecordSaved: (id: string) => void,
) {
  const role = useSessionStore((s) => s.role)
  const canEdit = hasPermission(role, PERMISSION.WORKFORCE_EDIT)
  const qc = useQueryClient()
  const pushToast = useUiStore((s) => s.pushToast)
  const isCreate = !employeeId
  const query = useQuery({
    queryKey: ['employee', employeeId],
    queryFn: () => mockWorkforceService.getEmployee(employeeId!),
    enabled: Boolean(employeeId),
  })
  const [draft, setDraft] = useState<Employee | null>(null)

  useEffect(() => {
    if (employeeId && query.data) setDraft(query.data)
    else if (!employeeId && canEdit) setDraft(emptyEmployee(organizationId))
    else setDraft(null)
  }, [employeeId, query.data, organizationId, canEdit])

  useScrollToEntryOnSelect(employeeId)

  const save = useMutation({
    mutationFn: () => {
      if (!draft) throw new AppError('Nothing to save', 'VALIDATION')
      if (isCreate) {
        const { id: _id, ...payload } = draft
        return mockWorkforceService.createEmployee(payload)
      }
      return mockWorkforceService.updateEmployee(draft.id, draft)
    },
    onSuccess: (next) => {
      void qc.invalidateQueries({ queryKey: ['employee', next.id] })
      void qc.invalidateQueries({ queryKey: ['employees'] })
      void qc.invalidateQueries({ queryKey: ['workforce-summary'] })
      setDraft(next)
      onRecordSaved(next.id)
      pushToast({
        title: isCreate ? 'Employee added.' : 'Employee record saved.',
        tone: 'success',
      })
    },
    onError: (err: unknown) => {
      pushToast({
        title: err instanceof AppError ? err.message : 'Employee save failed',
        tone: 'critical',
      })
    },
  })

  const resetCreate = () => setDraft(emptyEmployee(organizationId))

  let entry: ReactNode
  if (employeeId && query.isLoading) {
    entry = <LoadingBlock label="Loading employee…" />
  } else if (employeeId && (query.isError || !draft)) {
    entry = (
      <ErrorState title="Employee not found" detail="Choose another row from the registry." />
    )
  } else if (!draft) {
    entry = (
      <EntryFormShell title="Employee" mode="view">
        <p className="col-span-full text-sm text-soe-slate">Read-only for current role.</p>
      </EntryFormShell>
    )
  } else {
    entry = (
      <EntryFormShell
        title="Employee"
        subtitle={isCreate ? 'New workforce record' : draft.name}
        meta={isCreate ? undefined : draft.employeeCode}
        mode={isCreate ? 'create' : canEdit ? 'edit' : 'view'}
        footer={
          !canEdit ? (
            <p className="text-xs text-soe-slate">Read-only for current role.</p>
          ) : undefined
        }
      >
        <EntryFormSection title="Identity" />
          <TextField
            label="Name"
            value={draft.name}
            disabled={!canEdit}
            required
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          />
          <TextField
            label="Employee ID"
            value={draft.employeeCode}
            disabled={!canEdit || !isCreate}
            hint={isCreate ? 'Leave blank to auto-generate' : undefined}
            onChange={(e) => setDraft({ ...draft, employeeCode: e.target.value })}
          />
          <TextField
            label="Designation"
            value={draft.designation}
            disabled={!canEdit}
            onChange={(e) => setDraft({ ...draft, designation: e.target.value })}
          />
          <SelectField
            label="Employment type"
            value={draft.employmentType}
            disabled={!canEdit}
            options={Object.values(EMPLOYMENT_TYPE).map((t) => ({
              value: t,
              label: EMPLOYMENT_TYPE_LABEL[t],
            }))}
            onChange={(e) =>
              setDraft({ ...draft, employmentType: e.target.value as EmploymentType })
            }
          />
        <EntryFormSection title="Posting" />
          <TextField
            label="BPS"
            value={draft.payScale ?? ''}
            disabled={!canEdit}
            onChange={(e) => setDraft({ ...draft, payScale: e.target.value })}
          />
          <TextField
            label="Posting"
            value={draft.posting ?? ''}
            disabled={!canEdit}
            onChange={(e) => setDraft({ ...draft, posting: e.target.value })}
          />
          <TextField
            label="Province"
            value={draft.province ?? ''}
            disabled={!canEdit}
            onChange={(e) => setDraft({ ...draft, province: e.target.value })}
          />
          <TextField
            label="Reporting officer"
            value={draft.reportingOfficer ?? ''}
            disabled={!canEdit}
            onChange={(e) => setDraft({ ...draft, reportingOfficer: e.target.value })}
          />
        <EntryFormSection title="Profile & dates" />
          <SelectField
            label="Gender"
            value={draft.gender ?? ''}
            disabled={!canEdit}
            options={[
              { value: '', label: '—' },
              ...Object.values(GENDER).map((g) => ({ value: g, label: g })),
            ]}
            onChange={(e) =>
              setDraft({ ...draft, gender: (e.target.value || undefined) as Gender | undefined })
            }
          />
          <TextField
            label="Joining date"
            type="date"
            value={draft.joiningDate ?? ''}
            disabled={!canEdit}
            onChange={(e) => setDraft({ ...draft, joiningDate: e.target.value })}
          />
          <TextField
            label="Retirement date"
            type="date"
            value={draft.retirementDate ?? ''}
            disabled={!canEdit}
            onChange={(e) => setDraft({ ...draft, retirementDate: e.target.value })}
          />
          <TextField
            label="Qualification"
            value={draft.qualification ?? ''}
            disabled={!canEdit}
            onChange={(e) => setDraft({ ...draft, qualification: e.target.value })}
          />
          <SelectField
            label="Disability flag"
            value={draft.disabilityFlag ? 'yes' : 'no'}
            disabled={!canEdit}
            options={[
              { value: 'no', label: 'No' },
              { value: 'yes', label: 'Yes' },
            ]}
            onChange={(e) => setDraft({ ...draft, disabilityFlag: e.target.value === 'yes' })}
          />
        <EntryFormSection title="Compliance" />
          <TextField
            label="CNIC"
            value={draft.cnic ?? ''}
            disabled={!canEdit}
            onChange={(e) => setDraft({ ...draft, cnic: e.target.value })}
          />
          <SelectField
            label="Asset declaration"
            value={draft.assetDeclarationStatus ?? DECLARATION_STATUS.PENDING}
            disabled={!canEdit}
            options={Object.values(DECLARATION_STATUS).map((s) => ({
              value: s,
              label: DECLARATION_STATUS_LABEL[s],
            }))}
            onChange={(e) =>
              setDraft({
                ...draft,
                assetDeclarationStatus: e.target.value as Employee['assetDeclarationStatus'],
              })
            }
          />
          <TextField
            label="Disciplinary cases"
            type="number"
            value={draft.disciplinaryOpenCases ?? 0}
            disabled={!canEdit}
            onChange={(e) =>
              setDraft({ ...draft, disciplinaryOpenCases: Number(e.target.value) })
            }
          />
        <EntryFormSection title="Compensation & performance" />
          <TextField
            label="Performance rating"
            value={draft.performanceRating ?? ''}
            disabled={!canEdit}
            onChange={(e) => setDraft({ ...draft, performanceRating: e.target.value })}
          />
          <CurrencyField
            label="Salary PKR"
            value={draft.salaryPkr ?? 0}
            disabled={!canEdit}
            onChange={(e) => setDraft({ ...draft, salaryPkr: Number(e.target.value) })}
          />
          <CurrencyField
            label="Allowances PKR"
            value={draft.allowancesPkr ?? 0}
            disabled={!canEdit}
            onChange={(e) => setDraft({ ...draft, allowancesPkr: Number(e.target.value) })}
          />
          <TextField
            label="Benefits summary"
            value={draft.benefitsSummary ?? ''}
            disabled={!canEdit}
            onChange={(e) => setDraft({ ...draft, benefitsSummary: e.target.value })}
          />
          <TextField
            label="Pension scheme"
            value={draft.pensionScheme ?? ''}
            disabled={!canEdit}
            onChange={(e) => setDraft({ ...draft, pensionScheme: e.target.value })}
          />
          <TextField
            label="Training summary"
            value={draft.trainingSummary ?? ''}
            disabled={!canEdit}
            onChange={(e) => setDraft({ ...draft, trainingSummary: e.target.value })}
          />
      </EntryFormShell>
    )
  }

  return {
    entry,
    onSave: canEdit && draft ? () => save.mutate() : undefined,
    onCancel: isCreate && canEdit ? resetCreate : undefined,
    saving: save.isPending,
    saveDisabled: !draft || !draft.name.trim(),
    showFormActions: Boolean(canEdit && draft),
    saveLabel: isCreate ? 'Add employee' : 'Save employee',
  }
}

function useBoardMemberEntry(
  memberId: string | null,
  organizationId: string,
  onRecordSaved: (id: string) => void,
) {
  const role = useSessionStore((s) => s.role)
  const canEdit = hasPermission(role, PERMISSION.BOARD_EDIT)
  const qc = useQueryClient()
  const pushToast = useUiStore((s) => s.pushToast)
  const isCreate = !memberId
  const query = useQuery({
    queryKey: ['board-member', memberId],
    queryFn: () => mockBoardService.getBoardMember(memberId!),
    enabled: Boolean(memberId),
  })
  const [draft, setDraft] = useState<BoardMember | null>(null)

  useEffect(() => {
    if (memberId && query.data) setDraft(query.data)
    else if (!memberId && canEdit) setDraft(emptyBoardMember(organizationId))
    else setDraft(null)
  }, [memberId, query.data, organizationId, canEdit])

  useScrollToEntryOnSelect(memberId)

  const save = useMutation({
    mutationFn: () => {
      if (!draft) throw new AppError('Nothing to save', 'VALIDATION')
      if (isCreate) {
        const { id: _id, ...payload } = draft
        return mockBoardService.createBoardMember(payload)
      }
      return mockBoardService.updateBoardMember(draft.id, draft)
    },
    onSuccess: (next) => {
      void qc.invalidateQueries({ queryKey: ['board-member', next.id] })
      void qc.invalidateQueries({ queryKey: ['board-members'] })
      void qc.invalidateQueries({ queryKey: ['board-summary'] })
      setDraft(next)
      onRecordSaved(next.id)
      pushToast({
        title: isCreate ? 'Board member added.' : 'Board member saved.',
        tone: 'success',
      })
    },
    onError: (err: unknown) => {
      pushToast({
        title: err instanceof AppError ? err.message : 'Board member save failed',
        tone: 'critical',
      })
    },
  })

  let entry: ReactNode
  if (memberId && query.isLoading) {
    entry = <LoadingBlock label="Loading board member…" />
  } else if (memberId && (query.isError || !draft)) {
    entry = (
      <ErrorState title="Board member not found" detail="Choose another row from the registry." />
    )
  } else if (!draft) {
    entry = (
      <EntryFormShell title="Board member" mode="view">
        <p className="col-span-full text-sm text-soe-slate">Read-only for current role.</p>
      </EntryFormShell>
    )
  } else {
    entry = (
      <EntryFormShell
        title="Board member"
        subtitle={isCreate ? 'New board appointment' : draft.name}
        meta={isCreate ? undefined : draft.role}
        mode={isCreate ? 'create' : 'edit'}
      >
        <EntryFormSection title="Identity" />
          <TextField label="Name" value={draft.name} disabled={!canEdit} required onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          <TextField label="Role" value={draft.role} disabled={!canEdit} onChange={(e) => setDraft({ ...draft, role: e.target.value })} />
          <SelectField label="Director type" value={draft.memberType} disabled={!canEdit} options={Object.values(DIRECTOR_TYPE).map((t) => ({ value: t, label: DIRECTOR_TYPE_LABEL[t] }))} onChange={(e) => setDraft({ ...draft, memberType: e.target.value as BoardMember['memberType'] })} />
          <TextField label="CNIC" value={draft.cnic ?? ''} disabled={!canEdit} onChange={(e) => setDraft({ ...draft, cnic: e.target.value })} />
        <EntryFormSection title="Term" />
          <TextField label="Appointment date" type="date" value={draft.appointmentDate} disabled={!canEdit} onChange={(e) => setDraft({ ...draft, appointmentDate: e.target.value })} />
          <TextField label="Expiry date" type="date" value={draft.expiryDate} disabled={!canEdit} onChange={(e) => setDraft({ ...draft, expiryDate: e.target.value })} />
          <TextField label="Attendance %" type="number" value={draft.attendancePct ?? 0} disabled={!canEdit} onChange={(e) => setDraft({ ...draft, attendancePct: Number(e.target.value) })} />
          <TextField label="Qualification" value={draft.qualification ?? ''} disabled={!canEdit} onChange={(e) => setDraft({ ...draft, qualification: e.target.value })} />
        <EntryFormSection title="Declarations" />
          <SelectField label="Conflict declaration" value={draft.conflictDeclarationStatus ?? DECLARATION_STATUS.PENDING} disabled={!canEdit} options={Object.values(DECLARATION_STATUS).map((s) => ({ value: s, label: DECLARATION_STATUS_LABEL[s] }))} onChange={(e) => setDraft({ ...draft, conflictDeclarationStatus: e.target.value as BoardMember['conflictDeclarationStatus'] })} />
          <SelectField label="Asset declaration" value={draft.assetDeclarationStatus ?? DECLARATION_STATUS.PENDING} disabled={!canEdit} options={Object.values(DECLARATION_STATUS).map((s) => ({ value: s, label: DECLARATION_STATUS_LABEL[s] }))} onChange={(e) => setDraft({ ...draft, assetDeclarationStatus: e.target.value as BoardMember['assetDeclarationStatus'] })} />
          <TextField label="Committee IDs" value={(draft.committeeIds ?? []).join(', ')} disabled={!canEdit} hint="Comma-separated committee IDs" onChange={(e) => setDraft({ ...draft, committeeIds: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })} />
        <EntryFormSection title="Remuneration" />
          <CurrencyField label="Remuneration PKR" value={draft.remunerationPkr ?? 0} disabled={!canEdit} onChange={(e) => setDraft({ ...draft, remunerationPkr: Number(e.target.value) })} />
          <CurrencyField label="Sitting fee PKR" value={draft.sittingFeePkr ?? 0} disabled={!canEdit} onChange={(e) => setDraft({ ...draft, sittingFeePkr: Number(e.target.value) })} />
          <CurrencyField label="Travel expense PKR" value={draft.travelExpensePkr ?? 0} disabled={!canEdit} onChange={(e) => setDraft({ ...draft, travelExpensePkr: Number(e.target.value) })} />
      </EntryFormShell>
    )
  }

  return {
    entry,
    onSave: canEdit && draft ? () => save.mutate() : undefined,
    onCancel: isCreate && canEdit ? () => setDraft(emptyBoardMember(organizationId)) : undefined,
    saving: save.isPending,
    saveDisabled: !draft || !draft.name.trim(),
    showFormActions: Boolean(canEdit && draft),
    saveLabel: isCreate ? 'Add board member' : 'Save board member',
  }
}

function useExecutiveEntry(
  executiveId: string | null,
  organizationId: string,
  onRecordSaved: (id: string) => void,
) {
  const role = useSessionStore((s) => s.role)
  const canEdit = hasPermission(role, PERMISSION.BOARD_EDIT)
  const qc = useQueryClient()
  const pushToast = useUiStore((s) => s.pushToast)
  const isCreate = !executiveId
  const query = useQuery({
    queryKey: ['executive', executiveId],
    queryFn: () => mockBoardService.getExecutive(executiveId!),
    enabled: Boolean(executiveId),
  })
  const [draft, setDraft] = useState<Executive | null>(null)

  useEffect(() => {
    if (executiveId && query.data) setDraft(query.data)
    else if (!executiveId && canEdit) setDraft(emptyExecutive(organizationId))
    else setDraft(null)
  }, [executiveId, query.data, organizationId, canEdit])

  useScrollToEntryOnSelect(executiveId)

  const save = useMutation({
    mutationFn: () => {
      if (!draft) throw new AppError('Nothing to save', 'VALIDATION')
      if (isCreate) {
        const { id: _id, ...payload } = draft
        return mockBoardService.createExecutive(payload)
      }
      return mockBoardService.updateExecutive(draft.id, draft)
    },
    onSuccess: (next) => {
      void qc.invalidateQueries({ queryKey: ['executive', next.id] })
      void qc.invalidateQueries({ queryKey: ['executives'] })
      setDraft(next)
      onRecordSaved(next.id)
      pushToast({
        title: isCreate ? 'Executive added.' : 'Executive record saved.',
        tone: 'success',
      })
    },
    onError: (err: unknown) => {
      pushToast({
        title: err instanceof AppError ? err.message : 'Executive save failed',
        tone: 'critical',
      })
    },
  })

  let entry: ReactNode
  if (executiveId && query.isLoading) {
    entry = <LoadingBlock label="Loading executive…" />
  } else if (executiveId && (query.isError || !draft)) {
    entry = (
      <ErrorState title="Executive not found" detail="Choose another row from the registry." />
    )
  } else if (!draft) {
    entry = (
      <EntryFormShell title="Executive" mode="view">
        <p className="col-span-full text-sm text-soe-slate">Read-only for current role.</p>
      </EntryFormShell>
    )
  } else {
    entry = (
      <EntryFormShell
        title="Executive"
        subtitle={isCreate ? 'New executive record' : draft.name}
        meta={isCreate ? undefined : draft.role}
        mode={isCreate ? 'create' : 'edit'}
      >
        <EntryFormSection title="Identity" />
          <TextField label="Name" value={draft.name} disabled={!canEdit} required onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          <SelectField label="Role" value={draft.role} disabled={!canEdit} options={Object.values(EXECUTIVE_ROLE).map((r) => ({ value: r, label: r }))} onChange={(e) => setDraft({ ...draft, role: e.target.value as ExecutiveRole })} />
          <TextField label="Appointment date" type="date" value={draft.appointmentDate} disabled={!canEdit} onChange={(e) => setDraft({ ...draft, appointmentDate: e.target.value })} />
        <EntryFormSection title="Performance" />
          <TextField label="KPI summary" value={draft.performanceKpiSummary ?? ''} disabled={!canEdit} onChange={(e) => setDraft({ ...draft, performanceKpiSummary: e.target.value })} />
          <TextField label="Perks" value={draft.perksSummary ?? ''} disabled={!canEdit} onChange={(e) => setDraft({ ...draft, perksSummary: e.target.value })} />
          <TextField label="Foreign visits (last year)" type="number" value={draft.foreignVisitsLastYear ?? 0} disabled={!canEdit} onChange={(e) => setDraft({ ...draft, foreignVisitsLastYear: Number(e.target.value) })} />
        <EntryFormSection title="Compensation & benefits" />
          <CurrencyField label="Salary PKR" value={draft.salaryPkr ?? 0} disabled={!canEdit} onChange={(e) => setDraft({ ...draft, salaryPkr: Number(e.target.value) })} />
          <CurrencyField label="Bonus PKR" value={draft.bonusPkr ?? 0} disabled={!canEdit} onChange={(e) => setDraft({ ...draft, bonusPkr: Number(e.target.value) })} />
          <TextField label="Vehicles assigned" type="number" value={draft.vehiclesAssigned ?? 0} disabled={!canEdit} onChange={(e) => setDraft({ ...draft, vehiclesAssigned: Number(e.target.value) })} />
          <SelectField label="Official residence" value={draft.officialResidence ? 'yes' : 'no'} disabled={!canEdit} options={[{ value: 'no', label: 'No' }, { value: 'yes', label: 'Yes' }]} onChange={(e) => setDraft({ ...draft, officialResidence: e.target.value === 'yes' })} />
      </EntryFormShell>
    )
  }

  return {
    entry,
    onSave: canEdit && draft ? () => save.mutate() : undefined,
    onCancel: isCreate && canEdit ? () => setDraft(emptyExecutive(organizationId)) : undefined,
    saving: save.isPending,
    saveDisabled: !draft || !draft.name.trim(),
    showFormActions: Boolean(canEdit && draft),
    saveLabel: isCreate ? 'Add executive' : 'Save executive',
  }
}

function useCalendarEventEntry(
  eventId: string | null,
  organizationId: string,
  onRecordSaved: (id: string) => void,
) {
  const role = useSessionStore((s) => s.role)
  const canEdit = hasPermission(role, PERMISSION.BOARD_EDIT)
  const qc = useQueryClient()
  const pushToast = useUiStore((s) => s.pushToast)
  const isCreate = !eventId
  const query = useQuery({
    queryKey: ['gov-calendar-event', eventId],
    queryFn: () => mockBoardService.getCalendarEvent(eventId!),
    enabled: Boolean(eventId),
  })
  const [draft, setDraft] = useState<GovernanceCalendarEvent | null>(null)

  useEffect(() => {
    if (eventId && query.data) setDraft(query.data)
    else if (!eventId && canEdit) setDraft(emptyCalendarEvent(organizationId))
    else setDraft(null)
  }, [eventId, query.data, organizationId, canEdit])

  useScrollToEntryOnSelect(eventId)

  const save = useMutation({
    mutationFn: () => {
      if (!draft) throw new AppError('Nothing to save', 'VALIDATION')
      if (isCreate) {
        const { id: _id, ...payload } = draft
        return mockBoardService.createCalendarEvent(payload)
      }
      return mockBoardService.updateCalendarEvent(draft.id, draft)
    },
    onSuccess: (next) => {
      void qc.invalidateQueries({ queryKey: ['gov-calendar-event', next.id] })
      void qc.invalidateQueries({ queryKey: ['gov-calendar'] })
      setDraft(next)
      onRecordSaved(next.id)
      pushToast({
        title: isCreate ? 'Calendar item added.' : 'Calendar item saved.',
        tone: 'success',
      })
    },
    onError: (err: unknown) => {
      pushToast({
        title: err instanceof AppError ? err.message : 'Calendar save failed',
        tone: 'critical',
      })
    },
  })

  const kindOptions = Object.values(GOVERNANCE_CALENDAR_KIND).map((k) => ({
    value: k,
    label: k.replaceAll('_', ' '),
  }))

  let entry: ReactNode
  if (eventId && query.isLoading) {
    entry = <LoadingBlock label="Loading calendar item…" />
  } else if (eventId && (query.isError || !draft)) {
    entry = (
      <ErrorState title="Calendar item not found" detail="Choose another row from the registry." />
    )
  } else if (!draft) {
    entry = (
      <EntryFormShell title="Calendar item" mode="view">
        <p className="col-span-full text-sm text-soe-slate">Read-only for current role.</p>
      </EntryFormShell>
    )
  } else {
    entry = (
      <EntryFormShell
        title="Calendar item"
        subtitle={isCreate ? 'New governance calendar item' : draft.title}
        meta={isCreate ? undefined : draft.kind.replaceAll('_', ' ')}
        mode={isCreate ? 'create' : 'edit'}
      >
        <EntryFormSection title="Details" />
          <TextField label="Title" value={draft.title} disabled={!canEdit} required onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
          <SelectField label="Kind" value={draft.kind} disabled={!canEdit} options={kindOptions} onChange={(e) => setDraft({ ...draft, kind: e.target.value as GovernanceCalendarEvent['kind'] })} />
          <TextField label="Due date" type="date" value={draft.dueDate} disabled={!canEdit} onChange={(e) => setDraft({ ...draft, dueDate: e.target.value })} />
      </EntryFormShell>
    )
  }

  return {
    entry,
    onSave: canEdit && draft ? () => save.mutate() : undefined,
    onCancel: isCreate && canEdit ? () => setDraft(emptyCalendarEvent(organizationId)) : undefined,
    saving: save.isPending,
    saveDisabled: !draft || !draft.title.trim() || !draft.dueDate,
    showFormActions: Boolean(canEdit && draft),
    saveLabel: isCreate ? 'Add calendar item' : 'Save calendar item',
  }
}

function useDailyWagerEntry(
  wagerId: string | null,
  organizationId: string,
  onRecordSaved: (id: string) => void,
) {
  const role = useSessionStore((s) => s.role)
  const canEdit = hasPermission(role, PERMISSION.WORKFORCE_EDIT)
  const qc = useQueryClient()
  const pushToast = useUiStore((s) => s.pushToast)
  const isCreate = !wagerId
  const query = useQuery({
    queryKey: ['daily-wager', wagerId],
    queryFn: () => mockWorkforceService.getDailyWager(wagerId!),
    enabled: Boolean(wagerId),
  })
  const [draft, setDraft] = useState<DailyWager | null>(null)

  useEffect(() => {
    if (wagerId && query.data) setDraft(query.data)
    else if (!wagerId && canEdit) setDraft(emptyDailyWager(organizationId))
    else setDraft(null)
  }, [wagerId, query.data, organizationId, canEdit])

  useScrollToEntryOnSelect(wagerId)

  const save = useMutation({
    mutationFn: () => {
      if (!draft) throw new AppError('Nothing to save', 'VALIDATION')
      if (isCreate) {
        const { id: _id, ...payload } = draft
        return mockWorkforceService.createDailyWager(payload)
      }
      return mockWorkforceService.updateDailyWager(draft.id, draft)
    },
    onSuccess: (next) => {
      void qc.invalidateQueries({ queryKey: ['daily-wager', next.id] })
      void qc.invalidateQueries({ queryKey: ['daily-wagers'] })
      void qc.invalidateQueries({ queryKey: ['workforce-summary'] })
      setDraft(next)
      onRecordSaved(next.id)
      pushToast({
        title: isCreate ? 'Daily wager added.' : 'Daily wager saved.',
        tone: 'success',
      })
    },
    onError: (err: unknown) => {
      pushToast({
        title: err instanceof AppError ? err.message : 'Daily wager save failed',
        tone: 'critical',
      })
    },
  })

  let entry: ReactNode
  if (wagerId && query.isLoading) {
    entry = <LoadingBlock label="Loading daily wager…" />
  } else if (wagerId && (query.isError || !draft)) {
    entry = <ErrorState title="Daily wager not found" detail="Choose another row from the registry." />
  } else if (!draft) {
    entry = (
      <EntryFormShell title="Daily wager" mode="view">
        <p className="col-span-full text-sm text-soe-slate">Read-only for current role.</p>
      </EntryFormShell>
    )
  } else {
    entry = (
      <EntryFormShell
        title="Daily wager"
        subtitle={isCreate ? 'New daily wager record' : draft.name}
        meta={isCreate ? undefined : draft.roleLabel}
        mode={isCreate ? 'create' : 'edit'}
      >
        <EntryFormSection title="Identity" />
          <TextField label="Name" value={draft.name} disabled={!canEdit} required onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          <TextField label="Role" value={draft.roleLabel} disabled={!canEdit} required onChange={(e) => setDraft({ ...draft, roleLabel: e.target.value })} />
          <TextField label="Posting" value={draft.posting ?? ''} disabled={!canEdit} onChange={(e) => setDraft({ ...draft, posting: e.target.value })} />
        <EntryFormSection title="Contract & funding" />
          <TextField label="Duration (months)" type="number" value={draft.durationMonths} disabled={!canEdit} onChange={(e) => setDraft({ ...draft, durationMonths: Number(e.target.value) })} />
          <CurrencyField label="Daily rate PKR" value={draft.dailyRatePkr} disabled={!canEdit} onChange={(e) => setDraft({ ...draft, dailyRatePkr: Number(e.target.value) })} />
          <TextField label="Funding source" value={draft.fundingSource} disabled={!canEdit} onChange={(e) => setDraft({ ...draft, fundingSource: e.target.value })} />
      </EntryFormShell>
    )
  }

  return {
    entry,
    onSave: canEdit && draft ? () => save.mutate() : undefined,
    onCancel: isCreate && canEdit ? () => setDraft(emptyDailyWager(organizationId)) : undefined,
    saving: save.isPending,
    saveDisabled: !draft || !draft.name.trim() || !draft.roleLabel.trim(),
    showFormActions: Boolean(canEdit && draft),
    saveLabel: isCreate ? 'Add daily wager' : 'Save daily wager',
  }
}

function useConsultantEntry(
  consultantId: string | null,
  organizationId: string,
  onRecordSaved: (id: string) => void,
) {
  const role = useSessionStore((s) => s.role)
  const canEdit = hasPermission(role, PERMISSION.WORKFORCE_EDIT)
  const qc = useQueryClient()
  const pushToast = useUiStore((s) => s.pushToast)
  const isCreate = !consultantId
  const query = useQuery({
    queryKey: ['consultant', consultantId],
    queryFn: () => mockWorkforceService.getConsultant(consultantId!),
    enabled: Boolean(consultantId),
  })
  const [draft, setDraft] = useState<Consultant | null>(null)

  useEffect(() => {
    if (consultantId && query.data) setDraft(query.data)
    else if (!consultantId && canEdit) setDraft(emptyConsultant(organizationId))
    else setDraft(null)
  }, [consultantId, query.data, organizationId, canEdit])

  useScrollToEntryOnSelect(consultantId)

  const save = useMutation({
    mutationFn: () => {
      if (!draft) throw new AppError('Nothing to save', 'VALIDATION')
      if (isCreate) {
        const { id: _id, ...payload } = draft
        return mockWorkforceService.createConsultant(payload)
      }
      return mockWorkforceService.updateConsultant(draft.id, draft)
    },
    onSuccess: (next) => {
      void qc.invalidateQueries({ queryKey: ['consultant', next.id] })
      void qc.invalidateQueries({ queryKey: ['consultants'] })
      void qc.invalidateQueries({ queryKey: ['workforce-summary'] })
      setDraft(next)
      onRecordSaved(next.id)
      pushToast({
        title: isCreate ? 'Consultant added.' : 'Consultant saved.',
        tone: 'success',
      })
    },
    onError: (err: unknown) => {
      pushToast({
        title: err instanceof AppError ? err.message : 'Consultant save failed',
        tone: 'critical',
      })
    },
  })

  let entry: ReactNode
  if (consultantId && query.isLoading) {
    entry = <LoadingBlock label="Loading consultant…" />
  } else if (consultantId && (query.isError || !draft)) {
    entry = <ErrorState title="Consultant not found" detail="Choose another row from the registry." />
  } else if (!draft) {
    entry = (
      <EntryFormShell title="Consultant" mode="view">
        <p className="col-span-full text-sm text-soe-slate">Read-only for current role.</p>
      </EntryFormShell>
    )
  } else {
    entry = (
      <EntryFormShell
        title="Consultant"
        subtitle={isCreate ? 'New consultant record' : draft.name}
        meta={isCreate ? undefined : draft.project}
        mode={isCreate ? 'create' : 'edit'}
      >
        <EntryFormSection title="Identity" />
          <TextField label="Name" value={draft.name} disabled={!canEdit} required onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          <TextField label="Project" value={draft.project} disabled={!canEdit} required onChange={(e) => setDraft({ ...draft, project: e.target.value })} />
          <SelectField label="Status" value={draft.status} disabled={!canEdit} options={Object.values(CONSULTANT_STATUS).map((s) => ({ value: s, label: s }))} onChange={(e) => setDraft({ ...draft, status: e.target.value as Consultant['status'] })} />
        <EntryFormSection title="Contract" />
          <TextField label="Contract start" type="date" value={draft.contractStart} disabled={!canEdit} onChange={(e) => setDraft({ ...draft, contractStart: e.target.value })} />
          <TextField label="Contract end" type="date" value={draft.contractEnd} disabled={!canEdit} onChange={(e) => setDraft({ ...draft, contractEnd: e.target.value })} />
          <CurrencyField label="Monthly remuneration PKR" value={draft.monthlyRemunerationPkr} disabled={!canEdit} onChange={(e) => setDraft({ ...draft, monthlyRemunerationPkr: Number(e.target.value) })} />
          <TextField label="Funding source" value={draft.fundingSource} disabled={!canEdit} onChange={(e) => setDraft({ ...draft, fundingSource: e.target.value })} />
        <EntryFormSection title="Scope" />
          <TextField label="TOR summary" value={draft.torsSummary} disabled={!canEdit} onChange={(e) => setDraft({ ...draft, torsSummary: e.target.value })} />
          <TextField label="Deliverables summary" value={draft.deliverablesSummary} disabled={!canEdit} onChange={(e) => setDraft({ ...draft, deliverablesSummary: e.target.value })} />
      </EntryFormShell>
    )
  }

  return {
    entry,
    onSave: canEdit && draft ? () => save.mutate() : undefined,
    onCancel: isCreate && canEdit ? () => setDraft(emptyConsultant(organizationId)) : undefined,
    saving: save.isPending,
    saveDisabled: !draft || !draft.name.trim() || !draft.project.trim(),
    showFormActions: Boolean(canEdit && draft),
    saveLabel: isCreate ? 'Add consultant' : 'Save consultant',
  }
}

function emptySanctionedPost(organizationId: string): SanctionedPost {
  return {
    id: '',
    organizationId,
    designation: '',
    payScale: '',
    sanctioned: 0,
    filled: 0,
    vacant: 0,
    department: '',
    criticality: 'standard',
  }
}

function useSanctionedPostEntry(
  postId: string | null,
  organizationId: string,
  onRecordSaved: (id: string) => void,
) {
  const role = useSessionStore((s) => s.role)
  const canEdit = hasPermission(role, PERMISSION.WORKFORCE_EDIT)
  const qc = useQueryClient()
  const pushToast = useUiStore((s) => s.pushToast)
  const isCreate = !postId
  const query = useQuery({
    queryKey: ['sanctioned-post', postId],
    queryFn: () => mockWorkforceService.getSanctionedPost(postId!),
    enabled: Boolean(postId),
  })
  const [draft, setDraft] = useState<SanctionedPost | null>(null)

  useEffect(() => {
    if (postId && query.data) setDraft(query.data)
    else if (!postId && canEdit) setDraft(emptySanctionedPost(organizationId))
    else setDraft(null)
  }, [postId, query.data, organizationId, canEdit])

  useScrollToEntryOnSelect(postId)

  const save = useMutation({
    mutationFn: () => {
      if (!draft) throw new AppError('Nothing to save', 'VALIDATION')
      if (isCreate) {
        const { id: _id, vacant: _v, ...payload } = draft
        return mockWorkforceService.createSanctionedPost(payload)
      }
      return mockWorkforceService.updateSanctionedPost(draft.id, draft)
    },
    onSuccess: (next) => {
      void qc.invalidateQueries({ queryKey: ['sanctioned-post', next.id] })
      void qc.invalidateQueries({ queryKey: ['posts'] })
      void qc.invalidateQueries({ queryKey: ['workforce-summary'] })
      setDraft(next)
      onRecordSaved(next.id)
      pushToast({
        title: isCreate ? 'Sanctioned post added.' : 'Sanctioned post saved.',
        tone: 'success',
      })
    },
    onError: (err: unknown) => {
      pushToast({
        title: err instanceof AppError ? err.message : 'Post save failed',
        tone: 'critical',
      })
    },
  })

  let entry: ReactNode
  if (postId && query.isLoading) {
    entry = <LoadingBlock label="Loading post…" />
  } else if (postId && (query.isError || !draft)) {
    entry = <ErrorState title="Post not found" detail="Choose another row from the registry." />
  } else if (!draft) {
    entry = (
      <EntryFormShell title="Sanctioned post" mode="view">
        <p className="col-span-full text-sm text-soe-slate">Read-only for current role.</p>
      </EntryFormShell>
    )
  } else {
    entry = (
      <EntryFormShell
        title="Sanctioned post"
        subtitle={isCreate ? 'New sanctioned post' : draft.designation}
        meta={isCreate ? undefined : draft.payScale}
        mode={isCreate ? 'create' : 'edit'}
      >
        <EntryFormSection title="Post" />
        <TextField
          label="Designation"
          value={draft.designation}
          disabled={!canEdit}
          required
          onChange={(e) => setDraft({ ...draft, designation: e.target.value })}
        />
        <TextField
          label="Pay scale (BPS)"
          value={draft.payScale}
          disabled={!canEdit}
          onChange={(e) => setDraft({ ...draft, payScale: e.target.value })}
        />
        <TextField
          label="Department"
          value={draft.department}
          disabled={!canEdit}
          onChange={(e) => setDraft({ ...draft, department: e.target.value })}
        />
        <SelectField
          label="Criticality"
          value={draft.criticality ?? 'standard'}
          disabled={!canEdit}
          options={[
            { value: 'standard', label: 'Standard' },
            { value: 'critical', label: 'Critical' },
          ]}
          onChange={(e) =>
            setDraft({ ...draft, criticality: e.target.value as SanctionedPost['criticality'] })
          }
        />
        <EntryFormSection title="Strength" />
        <TextField
          label="Sanctioned"
          type="number"
          value={draft.sanctioned}
          disabled={!canEdit}
          onChange={(e) => {
            const sanctioned = Number(e.target.value)
            setDraft({ ...draft, sanctioned, vacant: sanctioned - draft.filled })
          }}
        />
        <TextField
          label="Filled"
          type="number"
          value={draft.filled}
          disabled={!canEdit}
          onChange={(e) => {
            const filled = Number(e.target.value)
            setDraft({ ...draft, filled, vacant: draft.sanctioned - filled })
          }}
        />
        <TextField label="Vacant" type="number" value={draft.vacant} disabled />
      </EntryFormShell>
    )
  }

  return {
    entry,
    onSave: canEdit && draft ? () => save.mutate() : undefined,
    onCancel: isCreate && canEdit ? () => setDraft(emptySanctionedPost(organizationId)) : undefined,
    saving: save.isPending,
    saveDisabled: !draft || !draft.designation.trim(),
    showFormActions: Boolean(canEdit && draft),
    saveLabel: isCreate ? 'Add post' : 'Save post',
  }
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
  const employeeId = searchParams.get('employeeId')
  const postId = searchParams.get('postId')
  const wagerId = searchParams.get('wagerId')
  const consultantId = searchParams.get('consultantId')
  const selectRecord = (param: string, id: string | null) => {
    const next = new URLSearchParams(searchParams)
    if (id) next.set(param, id)
    else next.delete(param)
    setSearchParams(next)
  }
  const employeeEntry = useWorkforceEmployeeEntry(
    portal === 'soe' && tab === 'employees' ? employeeId : null,
    organizationId,
    (id) => selectRecord('employeeId', id),
  )
  const wagerEntry = useDailyWagerEntry(
    portal === 'soe' && tab === 'wagers' ? wagerId : null,
    organizationId,
    (id) => selectRecord('wagerId', id),
  )
  const consultantEntry = useConsultantEntry(
    portal === 'soe' && tab === 'consultants' ? consultantId : null,
    organizationId,
    (id) => selectRecord('consultantId', id),
  )
  const postEntry = useSanctionedPostEntry(
    portal === 'soe' && tab === 'posts' ? postId : null,
    organizationId,
    (id) => selectRecord('postId', id),
  )

  const selectEmployee = (id: string) => selectRecord('employeeId', id)
  const selectPost = (id: string) => selectRecord('postId', id)
  const selectWager = (id: string) => selectRecord('wagerId', id)
  const selectConsultant = (id: string) => selectRecord('consultantId', id)
  const startNewEmployee = () => selectRecord('employeeId', null)
  const startNewPost = () => selectRecord('postId', null)
  const startNewWager = () => selectRecord('wagerId', null)
  const startNewConsultant = () => selectRecord('consultantId', null)

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
            <button
              type="button"
              className="text-soe-navy hover:underline"
              onClick={() => selectEmployee(row.original.id)}
            >
              {row.original.employeeCode}
            </button>
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
    [portal, selectEmployee],
  )

  const postColumns = useMemo<ColumnDef<SanctionedPost, unknown>[]>(
    () => [
      {
        accessorKey: 'designation',
        header: 'Post title',
        cell: ({ row }) =>
          portal === 'soe' ? (
            <button
              type="button"
              className="text-soe-navy hover:underline"
              onClick={() => selectPost(row.original.id)}
            >
              {row.original.designation}
            </button>
          ) : (
            row.original.designation
          ),
      },
      { accessorKey: 'payScale', header: 'BPS' },
      { accessorKey: 'department', header: 'Department' },
      { accessorKey: 'sanctioned', header: 'Sanctioned' },
      { accessorKey: 'filled', header: 'Filled' },
      { accessorKey: 'vacant', header: 'Vacant' },
      { accessorKey: 'criticality', header: 'Criticality' },
    ],
    [portal, selectPost],
  )

  const wagerColumns = useMemo<ColumnDef<DailyWager, unknown>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Name',
        cell: ({ row }) =>
          portal === 'soe' ? (
            <button
              type="button"
              className="text-soe-navy hover:underline"
              onClick={() => selectWager(row.original.id)}
            >
              {row.original.name}
            </button>
          ) : (
            row.original.name
          ),
      },
      { accessorKey: 'roleLabel', header: 'Role' },
      { accessorKey: 'durationMonths', header: 'Duration (mo)' },
      {
        id: 'rate',
        header: 'Daily rate',
        cell: ({ row }) => formatCurrencyPkr(row.original.dailyRatePkr),
      },
      { accessorKey: 'fundingSource', header: 'Funding' },
    ],
    [portal, selectWager],
  )

  const consultantColumns = useMemo<ColumnDef<Consultant, unknown>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Name',
        cell: ({ row }) =>
          portal === 'soe' ? (
            <button
              type="button"
              className="text-soe-navy hover:underline"
              onClick={() => selectConsultant(row.original.id)}
            >
              {row.original.name}
            </button>
          ) : (
            row.original.name
          ),
      },
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
    [portal, selectConsultant, canSeePay],
  )

  if (summary.isError) {
    return <ErrorState title="Unable to load workforce" detail="Mock service error." />
  }

  const workforceTitle = portal === 'soe' ? 'Workforce' : 'Workforce oversight'
  const workforceSubtitle = `Sanctioned vs filled · as of ${DEMO_AS_OF_DATE} · demo data`

  const workforceBody = (
    <>
      {portal !== 'soe' && summary.isLoading ? <LoadingBlock /> : null}
      {portal !== 'soe' && summary.data ? (
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
              Disability recorded: {summary.data.disabilityCount} · Gender counts aggregated only
              {!canSeePersonal ? ' · personal identifiers restricted' : ''}
            </p>
          </div>
        </div>
      ) : null}

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
            selectedRowId={portal === 'soe' ? employeeId : null}
            getRowId={(r) => r.id}
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
            selectedRowId={portal === 'soe' ? wagerId : null}
            getRowId={(r) => r.id}
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
            selectedRowId={portal === 'soe' ? consultantId : null}
            getRowId={(r) => r.id}
          />
        )
      ) : null}
    </>
  )

  if (portal === 'soe') {
    const registryFilters =
      tab === 'employees' ? (
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
      ) : null

    const registryBody = (
      <>
        {tab === 'employees' ? (
          <DataTable
            data={employees.data?.items ?? []}
            columns={empColumns}
            isLoading={employees.isLoading}
            searchPlaceholder="Filter employees…"
            selectedRowId={employeeId}
            getRowId={(r) => r.id}
          />
        ) : null}
        {tab === 'posts' ? (
          <DataTable
            data={posts.data ?? []}
            columns={postColumns}
            isLoading={posts.isLoading}
            searchPlaceholder="Filter posts…"
            selectedRowId={postId}
            getRowId={(r) => r.id}
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
              selectedRowId={wagerId}
              getRowId={(r) => r.id}
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
              selectedRowId={consultantId}
              getRowId={(r) => r.id}
            />
          )
        ) : null}
      </>
    )

    return (
      <ContributorModuleLayout
        moduleId={MODULE.WORKFORCE}
        title={workforceTitle}
        sectionNav={
          <ExecutivePeopleSectionNav
            workforceTabs={
              <RegistryTabBar tabs={WORKFORCE_REGISTRY_TABS} active={tab} onChange={setTab} />
            }
          />
        }
        entry={
          tab === 'employees'
            ? employeeEntry.entry
            : tab === 'posts'
              ? postEntry.entry
            : tab === 'wagers'
              ? wagerEntry.entry
              : tab === 'consultants'
                ? consultantEntry.entry
                : undefined
        }
        onSave={
          tab === 'employees'
            ? employeeEntry.onSave
            : tab === 'posts'
              ? postEntry.onSave
            : tab === 'wagers'
              ? wagerEntry.onSave
              : tab === 'consultants'
                ? consultantEntry.onSave
                : undefined
        }
        onCancel={
          tab === 'employees'
            ? employeeEntry.onCancel
            : tab === 'posts'
              ? postEntry.onCancel
            : tab === 'wagers'
              ? wagerEntry.onCancel
              : tab === 'consultants'
                ? consultantEntry.onCancel
                : undefined
        }
        saving={
          tab === 'employees'
            ? employeeEntry.saving
            : tab === 'posts'
              ? postEntry.saving
            : tab === 'wagers'
              ? wagerEntry.saving
              : tab === 'consultants'
                ? consultantEntry.saving
                : false
        }
        saveDisabled={
          tab === 'employees'
            ? employeeEntry.saveDisabled
            : tab === 'posts'
              ? postEntry.saveDisabled
            : tab === 'wagers'
              ? wagerEntry.saveDisabled
              : tab === 'consultants'
                ? consultantEntry.saveDisabled
                : true
        }
        showFormActions={
          tab === 'employees'
            ? employeeEntry.showFormActions
            : tab === 'posts'
              ? postEntry.showFormActions
            : tab === 'wagers'
              ? wagerEntry.showFormActions
              : tab === 'consultants'
                ? consultantEntry.showFormActions
                : false
        }
        saveLabel={
          tab === 'employees'
            ? employeeEntry.saveLabel
            : tab === 'posts'
              ? postEntry.saveLabel
            : tab === 'wagers'
              ? wagerEntry.saveLabel
              : tab === 'consultants'
                ? consultantEntry.saveLabel
                : undefined
        }
        cancelLabel="Clear form"
        actions={
          tab === 'employees' && employeeId ? (
            <Button size="sm" variant="secondary" onClick={startNewEmployee}>
              Add new
            </Button>
          ) : tab === 'posts' && postId ? (
            <Button size="sm" variant="secondary" onClick={startNewPost}>
              Add new
            </Button>
          ) : tab === 'wagers' && wagerId ? (
            <Button size="sm" variant="secondary" onClick={startNewWager}>
              Add new
            </Button>
          ) : tab === 'consultants' && consultantId ? (
            <Button size="sm" variant="secondary" onClick={startNewConsultant}>
              Add new
            </Button>
          ) : null
        }
        registryTitle="Workforce registry"
        filters={registryFilters}
        registry={registryBody}
      />
    )
  }

  return (
    <div>
      <PageHeader title={workforceTitle} subtitle={workforceSubtitle} />
      <RegistryTabBar tabs={WORKFORCE_REGISTRY_TABS} active={tab} onChange={setTab} />
      {workforceBody}
    </div>
  )
}

export function EmployeeDetailWorkspace() {
  const { employeeId = '' } = useParams()
  return <Navigate to={`/soe/people/workforce?employeeId=${employeeId}`} replace />
}

export function BoardWorkspace({ portal }: { portal: PortalMode }) {
  const role = useSessionStore((s) => s.role)
  const organizationId = useSessionStore((s) => s.organizationId)
  const [searchParams, setSearchParams] = useSearchParams()
  const portfolioScope = portal !== 'soe'
  const canSeePay = hasPermission(role, PERMISSION.SENSITIVE_REMUNERATION_READ)

  const expiryBand = searchParams.get('expiryBand') ?? ''
  const directorType = searchParams.get('directorType') ?? ''
  const memberId = searchParams.get('memberId')

  const selectRecord = (id: string | null) => {
    const next = new URLSearchParams(searchParams)
    if (id) next.set('memberId', id)
    else next.delete('memberId')
    setSearchParams(next)
  }
  const memberEntry = useBoardMemberEntry(
    portal === 'soe' ? memberId : null,
    organizationId,
    selectRecord,
  )

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
            <button
              type="button"
              className="text-soe-navy hover:underline"
              onClick={() => selectRecord(row.original.id)}
            >
              {row.original.name}
            </button>
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
    [portal, selectRecord],
  )

  const boardFilters = (
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
  )

  const boardRegistry = (
    <>
      {summary.data?.boardStatus === 'no_board' ? (
        <EmptyState title="No Board on file for this SOE." hint="SMEDA dormant scenario has no Board." />
      ) : (
        <>
          <DataTable
            data={members.data?.items ?? []}
            columns={columns}
            isLoading={members.isLoading}
            searchPlaceholder="Filter board…"
            selectedRowId={portal === 'soe' ? memberId : null}
            getRowId={(r) => r.id}
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
    </>
  )

  if (portal === 'soe') {
    return (
      <ContributorModuleLayout
        moduleId={MODULE.BOARD}
        title="Board governance"
        sectionNav={<ExecutivePeopleSectionNav />}
        entry={memberEntry.entry}
        onSave={memberEntry.onSave}
        onCancel={memberEntry.onCancel}
        saving={memberEntry.saving}
        saveDisabled={memberEntry.saveDisabled}
        showFormActions={memberEntry.showFormActions}
        saveLabel={memberEntry.saveLabel}
        cancelLabel="Clear form"
        actions={
          memberId ? (
            <Button size="sm" variant="secondary" onClick={() => selectRecord(null)}>
              Add new
            </Button>
          ) : null
        }
        registryTitle="Board registry"
        filters={boardFilters}
        registry={boardRegistry}
      />
    )
  }

  return (
    <ContributorRegistryLayout
      moduleId={MODULE.BOARD}
      title="Governance oversight"
      subtitle={`Exception-first · expiry bands vs ${DEMO_AS_OF_DATE}`}
    >
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

      {boardFilters}
      {boardRegistry}
    </ContributorRegistryLayout>
  )
}

export function BoardMemberDetailWorkspace() {
  const { memberId = '' } = useParams()
  return <Navigate to={`/soe/people/board?memberId=${memberId}`} replace />
}

export function ExecutivesWorkspace({ portal }: { portal: PortalMode }) {
  const role = useSessionStore((s) => s.role)
  const organizationId = useSessionStore((s) => s.organizationId)
  const [searchParams, setSearchParams] = useSearchParams()
  const portfolioScope = portal !== 'soe'
  const canSeePay = hasPermission(role, PERMISSION.SENSITIVE_REMUNERATION_READ)
  const executiveId = searchParams.get('executiveId')

  const selectRecord = (id: string | null) => {
    const next = new URLSearchParams(searchParams)
    if (id) next.set('executiveId', id)
    else next.delete('executiveId')
    setSearchParams(next)
  }
  const executiveEntry = useExecutiveEntry(
    portal === 'soe' ? executiveId : null,
    organizationId,
    selectRecord,
  )

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
            <button
              type="button"
              className="text-soe-navy hover:underline"
              onClick={() => selectRecord(row.original.id)}
            >
              {row.original.name}
            </button>
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
    [portal, canSeePay, selectRecord],
  )

  if (portal === 'soe') {
    return (
      <ContributorModuleLayout
        moduleId={MODULE.EXECUTIVES}
        title="Executive management"
        sectionNav={<ExecutivePeopleSectionNav />}
        entry={executiveEntry.entry}
        onSave={executiveEntry.onSave}
        onCancel={executiveEntry.onCancel}
        saving={executiveEntry.saving}
        saveDisabled={executiveEntry.saveDisabled}
        showFormActions={executiveEntry.showFormActions}
        saveLabel={executiveEntry.saveLabel}
        cancelLabel="Clear form"
        actions={
          executiveId ? (
            <Button size="sm" variant="secondary" onClick={() => selectRecord(null)}>
              Add new
            </Button>
          ) : null
        }
        registryTitle="Executive registry"
        registry={
          <DataTable
            data={query.data ?? []}
            columns={columns}
            isLoading={query.isLoading}
            searchPlaceholder="Filter executives…"
            selectedRowId={executiveId}
            getRowId={(r) => r.id}
          />
        }
      />
    )
  }

  return (
    <div>
      <PageHeader
        title="Executive management"
        subtitle="CEO / MD / GM / Directors — remuneration role-gated"
      />
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
  return <Navigate to={`/soe/people/executives?executiveId=${executiveId}`} replace />
}

export function GovernanceCalendarWorkspace({ portal }: { portal: PortalMode }) {
  const organizationId = useSessionStore((s) => s.organizationId)
  const portfolioScope = portal !== 'soe'
  const [searchParams, setSearchParams] = useSearchParams()
  const [view, setView] = useState<'all' | 'upcoming' | 'overdue'>('all')
  const eventId = searchParams.get('eventId')

  const selectRecord = (id: string | null) => {
    const next = new URLSearchParams(searchParams)
    if (id) next.set('eventId', id)
    else next.delete('eventId')
    setSearchParams(next)
  }
  const calendarEntry = useCalendarEventEntry(
    portal === 'soe' ? eventId : null,
    organizationId,
    selectRecord,
  )

  const query = useQuery({
    queryKey: ['gov-calendar', organizationId, portfolioScope, view],
    queryFn: () =>
      mockBoardService.getCalendar(portfolioScope ? undefined : organizationId, view),
  })

  const columns = useMemo<ColumnDef<GovernanceCalendarEvent, unknown>[]>(
    () => [
      {
        id: 'due',
        header: 'Due',
        cell: ({ row }) =>
          portal === 'soe' ? (
            <button
              type="button"
              className="text-soe-navy hover:underline"
              onClick={() => selectRecord(row.original.id)}
            >
              {row.original.dueDate}
            </button>
          ) : (
            row.original.dueDate
          ),
      },
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
    [portal, selectRecord],
  )

  const viewFilters = (
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
  )

  if (portal === 'soe') {
    return (
      <ContributorModuleLayout
        moduleId={MODULE.BOARD}
        title="Governance calendar"
        sectionNav={<ExecutivePeopleSectionNav />}
        entry={calendarEntry.entry}
        onSave={calendarEntry.onSave}
        onCancel={calendarEntry.onCancel}
        saving={calendarEntry.saving}
        saveDisabled={calendarEntry.saveDisabled}
        showFormActions={calendarEntry.showFormActions}
        saveLabel={calendarEntry.saveLabel}
        cancelLabel="Clear form"
        actions={
          eventId ? (
            <Button size="sm" variant="secondary" onClick={() => selectRecord(null)}>
              Add new
            </Button>
          ) : null
        }
        registryTitle="Calendar registry"
        filters={viewFilters}
        registry={
          <DataTable
            data={query.data ?? []}
            columns={columns}
            isLoading={query.isLoading}
            searchPlaceholder="Filter calendar…"
            selectedRowId={eventId}
            getRowId={(r) => r.id}
          />
        }
      />
    )
  }

  return (
    <div>
      <PageHeader
        title="Governance calendar"
        subtitle="Board expiries, vacancies, declarations and appointments"
      />
      {viewFilters}
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
