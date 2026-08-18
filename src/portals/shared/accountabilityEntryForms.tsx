import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState, type ReactNode } from 'react'
import { EntryFormSection, EntryFormShell, useScrollToEntryOnSelect } from '@/components/soe'
import { SelectField, CurrencyField, TextField } from '@/design-system/components/Fields'
import { ErrorState, LoadingBlock } from '@/design-system/components/Feedback'
import {
  AUDIT_PARA_STATUS,
  AUDIT_PARA_STATUS_LABEL,
  AUDIT_TYPE,
  AUDIT_TYPE_LABEL,
  COMPLIANCE_STATUS,
  COMPLIANCE_STATUS_LABEL,
  DEMO_AS_OF_DATE,
  LITIGATION_STATUS,
  LITIGATION_STATUS_LABEL,
  PAC_STATUS,
  PPRA_COMPLIANCE,
  PPRA_COMPLIANCE_LABEL,
  PROCUREMENT_CONTRACT_STATUS,
  PROCUREMENT_METHOD,
  PROCUREMENT_METHOD_LABEL,
  PRIVATIZATION_STAGE,
  PRIVATIZATION_STAGE_LABEL,
  RECOVERY_STATUS,
  TRANSFORMATION_TYPE,
  TRANSFORMATION_TYPE_LABEL,
  type AuditType,
  type ComplianceStatus,
} from '@/constants'
import {
  mockAuditService,
  mockComplianceService,
  mockLitigationService,
  mockPrivatizationService,
} from '@/mock-services'
import { hasPermission, PERMISSION } from '@/permissions'
import { useSessionStore } from '@/state/session'
import { useUiStore } from '@/state/ui'
import type {
  AuditPara,
  AuditRegister,
  ComplianceItem,
  LitigationCase,
  PacObservation,
  PrivatizationCase,
  ProcurementAnnualPlan,
  ProcurementContract,
  TransformationInitiative,
} from '@/types/domain'
import { AppError } from '@/utils'

const CONTRACT_STATUS_LABEL: Record<string, string> = {
  draft: 'Draft',
  active: 'Active',
  completed: 'Completed',
  terminated: 'Terminated',
  overdue: 'Overdue',
}

export interface EntryHookResult {
  entry: ReactNode
  onSave: (() => void) | undefined
  onCancel: (() => void) | undefined
  saving: boolean
  saveDisabled: boolean
  showFormActions: boolean
  saveLabel: string
}

function emptyProcurement(organizationId: string): ProcurementContract {
  return {
    id: '',
    organizationId,
    title: '',
    planReference: '',
    vendor: '',
    value: 0,
    method: PROCUREMENT_METHOD.OPEN_TENDER,
    ppraCompliance: PPRA_COMPLIANCE.PENDING,
    contractStatus: PROCUREMENT_CONTRACT_STATUS.ACTIVE,
    completionStatus: 'in_progress',
    responsibleFunction: 'Procurement',
    evidenceAvailable: false,
    isDummyDemonstrationData: true,
  }
}

function emptyAuditRegister(organizationId: string): AuditRegister {
  return {
    id: '',
    organizationId,
    auditType: AUDIT_TYPE.INTERNAL,
    auditPeriod: '',
    auditor: '',
    status: 'open',
    paraCount: 0,
    totalAmountInvolved: 0,
    evidenceAvailable: false,
    isDummyDemonstrationData: true,
  }
}

function emptyLitigationCase(organizationId: string): LitigationCase {
  return {
    id: '',
    organizationId,
    court: '',
    caseNumber: '',
    petitioner: '',
    respondent: '',
    nature: '',
    lawyer: '',
    status: LITIGATION_STATUS.ACTIVE,
    evidenceAvailable: false,
    isDummyDemonstrationData: true,
  }
}

function emptyPrivatizationCase(organizationId: string): PrivatizationCase {
  return {
    id: '',
    organizationId,
    currentStage: PRIVATIZATION_STAGE.IDENTIFIED,
    status: 'active',
    nextAction: 'Complete identification stage',
    isDummyDemonstrationData: true,
  }
}

export function useProcurementEntry(
  procurementId: string | null,
  organizationId: string,
  onRecordSaved: (id: string) => void,
): EntryHookResult {
  const role = useSessionStore((s) => s.role)
  const canEdit = hasPermission(role, PERMISSION.PROCUREMENT_EDIT)
  const qc = useQueryClient()
  const pushToast = useUiStore((s) => s.pushToast)
  const isCreate = !procurementId
  const query = useQuery({
    queryKey: ['procurement', procurementId],
    queryFn: () => mockAuditService.getProcurementById(procurementId!),
    enabled: Boolean(procurementId),
  })
  const [draft, setDraft] = useState<ProcurementContract | null>(null)

  useEffect(() => {
    if (procurementId && query.data) setDraft(query.data)
    else if (!procurementId && canEdit) setDraft(emptyProcurement(organizationId))
    else setDraft(null)
  }, [procurementId, query.data, organizationId, canEdit])

  useScrollToEntryOnSelect(procurementId)

  const save = useMutation({
    mutationFn: () => {
      if (!draft) throw new AppError('Nothing to save', 'VALIDATION')
      if (isCreate) {
        const { id: _id, ...payload } = draft
        return mockAuditService.createProcurement(payload)
      }
      return mockAuditService.updateProcurement(draft.id, draft)
    },
    onSuccess: (next) => {
      void qc.invalidateQueries({ queryKey: ['procurement'] })
      void qc.invalidateQueries({ queryKey: ['procurement-all'] })
      void qc.invalidateQueries({ queryKey: ['procurement-paged'] })
      setDraft(next)
      onRecordSaved(next.id)
      pushToast({
        title: isCreate ? 'Procurement record added.' : 'Procurement record saved.',
        tone: 'success',
      })
    },
    onError: (err: unknown) => {
      pushToast({
        title: err instanceof AppError ? err.message : 'Procurement save failed',
        tone: 'critical',
      })
    },
  })

  let entry: ReactNode
  if (procurementId && query.isLoading) {
    entry = <LoadingBlock label="Loading procurement…" />
  } else if (procurementId && (query.isError || !draft)) {
    entry = <ErrorState title="Procurement not found" detail="Choose another row from the registry." />
  } else if (!draft) {
    entry = (
      <EntryFormShell title="Procurement" mode="view">
        <p className="col-span-full text-sm text-soe-slate">Read-only for current role.</p>
      </EntryFormShell>
    )
  } else {
    entry = (
      <EntryFormShell
        title={isCreate ? 'Procurement' : 'Procurement record'}
        meta={isCreate ? undefined : draft.id}
        subtitle={isCreate ? 'New contract entry' : draft.title || draft.vendor}
        mode={isCreate ? 'create' : 'edit'}
      >
        <EntryFormSection title="Contract" />
          <TextField
            label="Title"
            value={draft.title}
            disabled={!canEdit}
            required
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
          />
          <TextField
            label="Plan reference"
            value={draft.planReference}
            disabled={!canEdit}
            onChange={(e) => setDraft({ ...draft, planReference: e.target.value })}
          />
          <TextField
            label="Vendor"
            value={draft.vendor}
            disabled={!canEdit}
            required
            onChange={(e) => setDraft({ ...draft, vendor: e.target.value })}
          />
          <CurrencyField
            label="Value PKR"
            value={draft.value}
            disabled={!canEdit}
            onChange={(e) => setDraft({ ...draft, value: Number(e.target.value) })}
          />
          <SelectField
            label="Method"
            value={draft.method}
            disabled={!canEdit}
            options={Object.values(PROCUREMENT_METHOD).map((m) => ({
              value: m,
              label: PROCUREMENT_METHOD_LABEL[m],
            }))}
            onChange={(e) => setDraft({ ...draft, method: e.target.value })}
          />
          <SelectField
            label="PPRA compliance"
            value={draft.ppraCompliance}
            disabled={!canEdit}
            options={Object.values(PPRA_COMPLIANCE).map((v) => ({
              value: v,
              label: PPRA_COMPLIANCE_LABEL[v] ?? v,
            }))}
            onChange={(e) => setDraft({ ...draft, ppraCompliance: e.target.value })}
          />
          <SelectField
            label="Contract status"
            value={draft.contractStatus}
            disabled={!canEdit}
            options={Object.entries(CONTRACT_STATUS_LABEL).map(([k, v]) => ({ value: k, label: v }))}
            onChange={(e) => setDraft({ ...draft, contractStatus: e.target.value })}
          />
          <TextField
            label="Responsible function"
            value={draft.responsibleFunction}
            disabled={!canEdit}
            onChange={(e) => setDraft({ ...draft, responsibleFunction: e.target.value })}
          />
        <EntryFormSection title="Dates" />
          <TextField
            label="Start date"
            type="date"
            value={draft.startDate ?? ''}
            disabled={!canEdit}
            onChange={(e) => setDraft({ ...draft, startDate: e.target.value })}
          />
          <TextField
            label="Completion due"
            type="date"
            value={draft.completionDueDate ?? ''}
            disabled={!canEdit}
            onChange={(e) => setDraft({ ...draft, completionDueDate: e.target.value })}
          />
      </EntryFormShell>
    )
  }

  return {
    entry,
    onSave: canEdit && draft ? () => save.mutate() : undefined,
    onCancel: isCreate && canEdit ? () => setDraft(emptyProcurement(organizationId)) : undefined,
    saving: save.isPending,
    saveDisabled: !draft || !draft.title.trim() || !draft.vendor.trim(),
    showFormActions: Boolean(canEdit && draft),
    saveLabel: isCreate ? 'Add procurement' : 'Save procurement',
  }
}

export function useAuditRegisterEntry(
  registerId: string | null,
  organizationId: string,
  onRecordSaved: (id: string) => void,
): EntryHookResult {
  const role = useSessionStore((s) => s.role)
  const canEdit = hasPermission(role, PERMISSION.AUDIT_EDIT)
  const qc = useQueryClient()
  const pushToast = useUiStore((s) => s.pushToast)
  const isCreate = !registerId
  const query = useQuery({
    queryKey: ['audit-register', registerId],
    queryFn: () => mockAuditService.getAuditRegister(registerId!),
    enabled: Boolean(registerId),
  })
  const [draft, setDraft] = useState<AuditRegister | null>(null)

  useEffect(() => {
    if (registerId && query.data) setDraft(query.data)
    else if (!registerId && canEdit) setDraft(emptyAuditRegister(organizationId))
    else setDraft(null)
  }, [registerId, query.data, organizationId, canEdit])

  useScrollToEntryOnSelect(registerId)

  const save = useMutation({
    mutationFn: () => {
      if (!draft) throw new AppError('Nothing to save', 'VALIDATION')
      if (isCreate) {
        const { id: _id, ...payload } = draft
        return mockAuditService.createAuditRegister(payload)
      }
      throw new AppError('Audit register update not supported in prototype', 'VALIDATION')
    },
    onSuccess: (next) => {
      void qc.invalidateQueries({ queryKey: ['audit-registers'] })
      setDraft(next)
      onRecordSaved(next.id)
      pushToast({ title: 'Audit register entry added.', tone: 'success' })
    },
    onError: (err: unknown) => {
      pushToast({
        title: err instanceof AppError ? err.message : 'Audit register save failed',
        tone: 'critical',
      })
    },
  })

  let entry: ReactNode
  if (registerId && query.isLoading) {
    entry = <LoadingBlock label="Loading audit register…" />
  } else if (registerId && (query.isError || !draft)) {
    entry = <ErrorState title="Audit register not found" />
  } else if (!draft) {
    entry = (
      <EntryFormShell title="Audit register" mode="view">
        <p className="col-span-full text-sm text-soe-slate">Read-only for current role.</p>
      </EntryFormShell>
    )
  } else {
    entry = (
      <EntryFormShell
        title="Audit register"
        subtitle={isCreate ? 'New register entry' : draft.auditPeriod}
        meta={isCreate ? undefined : draft.id}
        mode={isCreate ? 'create' : 'view'}
        footer={
          !isCreate ? (
            <p className="text-xs text-soe-slate">Existing registers are view-only in prototype.</p>
          ) : undefined
        }
      >
        <EntryFormSection title="Audit details" />
          <SelectField
            label="Audit type"
            value={draft.auditType}
            disabled={!canEdit || !isCreate}
            options={Object.values(AUDIT_TYPE).map((t) => ({
              value: t,
              label: AUDIT_TYPE_LABEL[t as AuditType],
            }))}
            onChange={(e) => setDraft({ ...draft, auditType: e.target.value })}
          />
          <TextField
            label="Audit period"
            value={draft.auditPeriod}
            disabled={!canEdit || !isCreate}
            required
            onChange={(e) => setDraft({ ...draft, auditPeriod: e.target.value })}
          />
          <TextField
            label="Auditor"
            value={draft.auditor}
            disabled={!canEdit || !isCreate}
            required
            onChange={(e) => setDraft({ ...draft, auditor: e.target.value })}
          />
          <TextField
            label="Report date"
            type="date"
            value={draft.reportDate ?? ''}
            disabled={!canEdit || !isCreate}
            onChange={(e) => setDraft({ ...draft, reportDate: e.target.value })}
          />
          <TextField
            label="Para count"
            type="number"
            value={draft.paraCount}
            disabled={!canEdit || !isCreate}
            onChange={(e) => setDraft({ ...draft, paraCount: Number(e.target.value) })}
          />
          <CurrencyField
            label="Amount involved PKR"
            value={draft.totalAmountInvolved}
            disabled={!canEdit || !isCreate}
            onChange={(e) => setDraft({ ...draft, totalAmountInvolved: Number(e.target.value) })}
          />
          <TextField
            label="Status"
            value={draft.status}
            disabled={!canEdit || !isCreate}
            onChange={(e) => setDraft({ ...draft, status: e.target.value })}
          />
      </EntryFormShell>
    )
  }

  return {
    entry,
    onSave: canEdit && draft && isCreate ? () => save.mutate() : undefined,
    onCancel: isCreate && canEdit ? () => setDraft(emptyAuditRegister(organizationId)) : undefined,
    saving: save.isPending,
    saveDisabled: !draft || !draft.auditPeriod.trim() || !draft.auditor.trim(),
    showFormActions: Boolean(canEdit && draft && isCreate),
    saveLabel: 'Add audit register',
  }
}

export function useLitigationEntry(
  caseId: string | null,
  organizationId: string,
  onRecordSaved: (id: string) => void,
): EntryHookResult {
  const role = useSessionStore((s) => s.role)
  const canEdit = hasPermission(role, PERMISSION.LITIGATION_EDIT)
  const qc = useQueryClient()
  const pushToast = useUiStore((s) => s.pushToast)
  const isCreate = !caseId
  const query = useQuery({
    queryKey: ['litigation-case', caseId],
    queryFn: () => mockLitigationService.getCase(caseId!),
    enabled: Boolean(caseId),
  })
  const [draft, setDraft] = useState<LitigationCase | null>(null)

  useEffect(() => {
    if (caseId && query.data) setDraft(query.data)
    else if (!caseId && canEdit) setDraft(emptyLitigationCase(organizationId))
    else setDraft(null)
  }, [caseId, query.data, organizationId, canEdit])

  useScrollToEntryOnSelect(caseId)

  const save = useMutation({
    mutationFn: () => {
      if (!draft) throw new AppError('Nothing to save', 'VALIDATION')
      if (isCreate) {
        const { id: _id, ...payload } = draft
        return mockLitigationService.createCase(payload)
      }
      return mockLitigationService.updateCase(draft.id, draft)
    },
    onSuccess: (next) => {
      void qc.invalidateQueries({ queryKey: ['litigation-case', next.id] })
      void qc.invalidateQueries({ queryKey: ['litigation'] })
      setDraft(next)
      onRecordSaved(next.id)
      pushToast({
        title: isCreate ? 'Litigation case added.' : 'Litigation case saved.',
        tone: 'success',
      })
    },
    onError: (err: unknown) => {
      pushToast({
        title: err instanceof AppError ? err.message : 'Litigation save failed',
        tone: 'critical',
      })
    },
  })

  let entry: ReactNode
  if (caseId && query.isLoading) {
    entry = <LoadingBlock label="Loading case…" />
  } else if (caseId && (query.isError || !draft)) {
    entry = <ErrorState title="Case not found" detail="Choose another row from the registry." />
  } else if (!draft) {
    entry = (
      <EntryFormShell title="Litigation" mode="view">
        <p className="col-span-full text-sm text-soe-slate">Read-only for current role.</p>
      </EntryFormShell>
    )
  } else {
    entry = (
      <EntryFormShell
        title="Litigation case"
        subtitle={isCreate ? 'New case entry' : draft.caseNumber}
        meta={isCreate ? undefined : draft.id}
        mode={isCreate ? 'create' : 'edit'}
      >
        <EntryFormSection title="Case" />
          <TextField
            label="Case number"
            value={draft.caseNumber}
            disabled={!canEdit}
            required
            onChange={(e) => setDraft({ ...draft, caseNumber: e.target.value })}
          />
          <TextField
            label="Court"
            value={draft.court}
            disabled={!canEdit}
            required
            onChange={(e) => setDraft({ ...draft, court: e.target.value })}
          />
          <TextField
            label="Petitioner"
            value={draft.petitioner}
            disabled={!canEdit}
            onChange={(e) => setDraft({ ...draft, petitioner: e.target.value })}
          />
          <TextField
            label="Respondent"
            value={draft.respondent}
            disabled={!canEdit}
            onChange={(e) => setDraft({ ...draft, respondent: e.target.value })}
          />
        <EntryFormSection title="Parties & schedule" />
          <TextField
            label="Nature"
            value={draft.nature}
            disabled={!canEdit}
            onChange={(e) => setDraft({ ...draft, nature: e.target.value })}
          />
          <CurrencyField
            label="Amount involved PKR"
            value={draft.amountInvolved ?? 0}
            disabled={!canEdit}
            onChange={(e) => setDraft({ ...draft, amountInvolved: Number(e.target.value) })}
          />
          <TextField
            label="Lawyer"
            value={draft.lawyer}
            disabled={!canEdit}
            onChange={(e) => setDraft({ ...draft, lawyer: e.target.value })}
          />
          <SelectField
            label="Status"
            value={draft.status}
            disabled={!canEdit}
            options={Object.entries(LITIGATION_STATUS_LABEL).map(([k, v]) => ({ value: k, label: v }))}
            onChange={(e) => setDraft({ ...draft, status: e.target.value })}
          />
          <TextField
            label="Next hearing"
            type="date"
            value={draft.nextHearing ?? ''}
            disabled={!canEdit}
            onChange={(e) => setDraft({ ...draft, nextHearing: e.target.value })}
          />
      </EntryFormShell>
    )
  }

  return {
    entry,
    onSave: canEdit && draft ? () => save.mutate() : undefined,
    onCancel: isCreate && canEdit ? () => setDraft(emptyLitigationCase(organizationId)) : undefined,
    saving: save.isPending,
    saveDisabled: !draft || !draft.caseNumber.trim() || !draft.court.trim(),
    showFormActions: Boolean(canEdit && draft),
    saveLabel: isCreate ? 'Add case' : 'Save case',
  }
}

export function usePrivatizationCaseEntry(
  createMode: boolean,
  organizationId: string,
  onRecordSaved: (id: string) => void,
): EntryHookResult {
  const role = useSessionStore((s) => s.role)
  const canEdit = hasPermission(role, PERMISSION.PRIVATIZATION_EDIT)
  const qc = useQueryClient()
  const pushToast = useUiStore((s) => s.pushToast)
  const [draft, setDraft] = useState<PrivatizationCase | null>(null)

  useEffect(() => {
    if (createMode && canEdit) setDraft(emptyPrivatizationCase(organizationId))
    else setDraft(null)
  }, [createMode, organizationId, canEdit])

  const save = useMutation({
    mutationFn: () => {
      if (!draft) throw new AppError('Nothing to save', 'VALIDATION')
      const { id: _id, ...payload } = draft
      return mockPrivatizationService.createCase(payload)
    },
    onSuccess: (next) => {
      void qc.invalidateQueries({ queryKey: ['priv-cases'] })
      void qc.invalidateQueries({ queryKey: ['priv-case'] })
      void qc.invalidateQueries({ queryKey: ['priv-ms'] })
      setDraft(null)
      onRecordSaved(next.id)
      pushToast({ title: 'Privatization case added.', tone: 'success' })
    },
    onError: (err: unknown) => {
      pushToast({
        title: err instanceof AppError ? err.message : 'Case creation failed',
        tone: 'critical',
      })
    },
  })

  if (!createMode || !canEdit) {
    return {
      entry: null,
      onSave: undefined,
      onCancel: undefined,
      saving: false,
      saveDisabled: true,
      showFormActions: false,
      saveLabel: 'Add case',
    }
  }

  if (!draft) {
    return {
      entry: null,
      onSave: undefined,
      onCancel: undefined,
      saving: false,
      saveDisabled: true,
      showFormActions: false,
      saveLabel: 'Add case',
    }
  }

  const entry = (
    <EntryFormShell
      title="Privatization case"
      subtitle={`Starting stage · ${DEMO_AS_OF_DATE}`}
      mode="create"
    >
      <EntryFormSection title="Case setup" />
        <SelectField
          label="Initial stage"
          value={draft.currentStage}
          disabled
          options={Object.values(PRIVATIZATION_STAGE).map((s) => ({
            value: s,
            label: PRIVATIZATION_STAGE_LABEL[s],
          }))}
          onChange={() => undefined}
        />
        <TextField
          label="Cabinet decision"
          value={draft.cabinetDecision ?? ''}
          onChange={(e) => setDraft({ ...draft, cabinetDecision: e.target.value })}
        />
        <TextField
          label="CCOP decision"
          value={draft.ccopDecision ?? ''}
          onChange={(e) => setDraft({ ...draft, ccopDecision: e.target.value })}
        />
        <TextField
          label="Next action"
          value={draft.nextAction ?? ''}
          onChange={(e) => setDraft({ ...draft, nextAction: e.target.value })}
        />
        <TextField
          label="Financial advisor"
          value={draft.financialAdvisor ?? ''}
          onChange={(e) => setDraft({ ...draft, financialAdvisor: e.target.value })}
        />
        <CurrencyField
          label="Valuation PKR"
          value={draft.valuationAmountPkr ?? 0}
          onChange={(e) => setDraft({ ...draft, valuationAmountPkr: Number(e.target.value) })}
        />
        <TextField
          label="Transaction structure"
          value={draft.transactionStructure ?? ''}
          onChange={(e) => setDraft({ ...draft, transactionStructure: e.target.value })}
        />
    </EntryFormShell>
  )

  return {
    entry,
    onSave: () => save.mutate(),
    onCancel: () => setDraft(emptyPrivatizationCase(organizationId)),
    saving: save.isPending,
    saveDisabled: false,
    showFormActions: true,
    saveLabel: 'Add case',
  }
}

function emptyAuditPara(organizationId: string): AuditPara {
  return {
    id: '',
    organizationId,
    auditId: '',
    title: '',
    amountInvolved: 0,
    dateRaised: DEMO_AS_OF_DATE,
    responsibleFunction: '',
    responsibleOfficer: '',
    responseDueDate: DEMO_AS_OF_DATE,
    status: AUDIT_PARA_STATUS.OPEN,
    pacStatus: PAC_STATUS.NONE,
    recoveryStatus: RECOVERY_STATUS.NOT_STARTED,
    amountRecovered: 0,
    evidenceAvailable: false,
    isDummyDemonstrationData: true,
  }
}

export function useAuditParaEntry(
  paraId: string | null,
  organizationId: string,
  onRecordSaved: (id: string) => void,
): EntryHookResult {
  const role = useSessionStore((s) => s.role)
  const canEdit = hasPermission(role, PERMISSION.AUDIT_EDIT)
  const qc = useQueryClient()
  const pushToast = useUiStore((s) => s.pushToast)
  const isCreate = !paraId
  const query = useQuery({
    queryKey: ['audit-para-entry', paraId],
    queryFn: () => mockAuditService.getAuditPara(paraId!),
    enabled: Boolean(paraId),
  })
  const [draft, setDraft] = useState<AuditPara | null>(null)

  useEffect(() => {
    if (paraId && query.data) setDraft(query.data)
    else if (!paraId && canEdit) setDraft(emptyAuditPara(organizationId))
    else setDraft(null)
  }, [paraId, query.data, organizationId, canEdit])

  useScrollToEntryOnSelect(paraId)

  const save = useMutation({
    mutationFn: () => {
      if (!draft) throw new AppError('Nothing to save', 'VALIDATION')
      if (isCreate) {
        const { id: _id, ...payload } = draft
        return mockAuditService.createAuditPara(payload)
      }
      return mockAuditService.updateAuditPara(draft.id, draft)
    },
    onSuccess: (next) => {
      void qc.invalidateQueries({ queryKey: ['audit-para-entry', next.id] })
      void qc.invalidateQueries({ queryKey: ['audit-paras'] })
      void qc.invalidateQueries({ queryKey: ['audit-para', next.id] })
      setDraft(next)
      onRecordSaved(next.id)
      pushToast({
        title: isCreate ? 'Audit para added.' : 'Audit para saved.',
        tone: 'success',
      })
    },
    onError: (err: unknown) => {
      pushToast({
        title: err instanceof AppError ? err.message : 'Audit para save failed',
        tone: 'critical',
      })
    },
  })

  let entry: ReactNode
  if (paraId && query.isLoading) {
    entry = <LoadingBlock label="Loading audit para…" />
  } else if (paraId && (query.isError || !draft)) {
    entry = <ErrorState title="Audit para not found" detail="Choose another row from the registry." />
  } else if (!draft) {
    entry = (
      <EntryFormShell title="Audit para" mode="view">
        <p className="col-span-full text-sm text-soe-slate">Read-only for current role.</p>
      </EntryFormShell>
    )
  } else {
    entry = (
      <EntryFormShell
        title="Audit para"
        subtitle={isCreate ? 'New audit para' : draft.title}
        meta={isCreate ? undefined : draft.id}
        mode={isCreate ? 'create' : 'edit'}
      >
        <EntryFormSection title="Observation" />
        <TextField
          label="Title"
          value={draft.title}
          disabled={!canEdit}
          required
          onChange={(e) => setDraft({ ...draft, title: e.target.value })}
        />
        <TextField
          label="Audit register ID"
          value={draft.auditId}
          disabled={!canEdit}
          required
          onChange={(e) => setDraft({ ...draft, auditId: e.target.value })}
        />
        <CurrencyField
          label="Amount involved PKR"
          value={draft.amountInvolved}
          disabled={!canEdit}
          onChange={(e) => setDraft({ ...draft, amountInvolved: Number(e.target.value) })}
        />
        <TextField
          label="Date raised"
          type="date"
          value={draft.dateRaised}
          disabled={!canEdit}
          onChange={(e) => setDraft({ ...draft, dateRaised: e.target.value })}
        />
        <EntryFormSection title="Response" />
        <TextField
          label="Responsible function"
          value={draft.responsibleFunction}
          disabled={!canEdit}
          onChange={(e) => setDraft({ ...draft, responsibleFunction: e.target.value })}
        />
        <TextField
          label="Responsible officer"
          value={draft.responsibleOfficer}
          disabled={!canEdit}
          onChange={(e) => setDraft({ ...draft, responsibleOfficer: e.target.value })}
        />
        <TextField
          label="Response due"
          type="date"
          value={draft.responseDueDate}
          disabled={!canEdit}
          onChange={(e) => setDraft({ ...draft, responseDueDate: e.target.value })}
        />
        <SelectField
          label="Status"
          value={draft.status}
          disabled={!canEdit}
          options={Object.entries(AUDIT_PARA_STATUS_LABEL).map(([k, v]) => ({ value: k, label: v }))}
          onChange={(e) => setDraft({ ...draft, status: e.target.value })}
        />
        <CurrencyField
          label="Amount recovered PKR"
          value={draft.amountRecovered}
          disabled={!canEdit}
          onChange={(e) => setDraft({ ...draft, amountRecovered: Number(e.target.value) })}
        />
      </EntryFormShell>
    )
  }

  return {
    entry,
    onSave: canEdit && draft ? () => save.mutate() : undefined,
    onCancel: isCreate && canEdit ? () => setDraft(emptyAuditPara(organizationId)) : undefined,
    saving: save.isPending,
    saveDisabled: !draft || !draft.title.trim() || !draft.auditId.trim(),
    showFormActions: Boolean(canEdit && draft),
    saveLabel: isCreate ? 'Add para' : 'Save para',
  }
}

function emptyPacObservation(organizationId: string): PacObservation {
  return {
    id: '',
    organizationId,
    auditParaId: '',
    observation: '',
    observationDate: DEMO_AS_OF_DATE,
    requiredAction: '',
    responsibleParty: '',
    dueDate: DEMO_AS_OF_DATE,
    status: PAC_STATUS.OPEN,
    evidenceAvailable: false,
    isDummyDemonstrationData: true,
  }
}

export function usePacObservationEntry(
  pacId: string | null,
  organizationId: string,
  onRecordSaved: (id: string) => void,
): EntryHookResult {
  const role = useSessionStore((s) => s.role)
  const canEdit = hasPermission(role, PERMISSION.AUDIT_EDIT)
  const qc = useQueryClient()
  const pushToast = useUiStore((s) => s.pushToast)
  const isCreate = !pacId
  const query = useQuery({
    queryKey: ['pac-entry', pacId],
    queryFn: () => mockAuditService.getPacObservation(pacId!),
    enabled: Boolean(pacId),
  })
  const [draft, setDraft] = useState<PacObservation | null>(null)

  useEffect(() => {
    if (pacId && query.data) setDraft(query.data)
    else if (!pacId && canEdit) setDraft(emptyPacObservation(organizationId))
    else setDraft(null)
  }, [pacId, query.data, organizationId, canEdit])

  useScrollToEntryOnSelect(pacId)

  const save = useMutation({
    mutationFn: () => {
      if (!draft) throw new AppError('Nothing to save', 'VALIDATION')
      if (isCreate) {
        const { id: _id, ...payload } = draft
        return mockAuditService.createPacObservation(payload)
      }
      return mockAuditService.updatePacObservation(draft.id, draft)
    },
    onSuccess: (next) => {
      void qc.invalidateQueries({ queryKey: ['pac-entry', next.id] })
      void qc.invalidateQueries({ queryKey: ['pac-observations'] })
      setDraft(next)
      onRecordSaved(next.id)
      pushToast({
        title: isCreate ? 'PAC observation added.' : 'PAC observation saved.',
        tone: 'success',
      })
    },
    onError: (err: unknown) => {
      pushToast({
        title: err instanceof AppError ? err.message : 'PAC save failed',
        tone: 'critical',
      })
    },
  })

  let entry: ReactNode
  if (pacId && query.isLoading) {
    entry = <LoadingBlock label="Loading PAC observation…" />
  } else if (pacId && (query.isError || !draft)) {
    entry = <ErrorState title="PAC observation not found" detail="Choose another row from the registry." />
  } else if (!draft) {
    entry = (
      <EntryFormShell title="PAC observation" mode="view">
        <p className="col-span-full text-sm text-soe-slate">Read-only for current role.</p>
      </EntryFormShell>
    )
  } else {
    entry = (
      <EntryFormShell
        title="PAC observation"
        subtitle={isCreate ? 'New PAC observation' : draft.observation.slice(0, 48)}
        meta={isCreate ? undefined : draft.id}
        mode={isCreate ? 'create' : 'edit'}
      >
        <EntryFormSection title="Observation" />
        <TextField
          label="Observation"
          value={draft.observation}
          disabled={!canEdit}
          required
          onChange={(e) => setDraft({ ...draft, observation: e.target.value })}
        />
        <TextField
          label="Linked audit para ID"
          value={draft.auditParaId}
          disabled={!canEdit}
          required
          onChange={(e) => setDraft({ ...draft, auditParaId: e.target.value })}
        />
        <TextField
          label="Observation date"
          type="date"
          value={draft.observationDate}
          disabled={!canEdit}
          onChange={(e) => setDraft({ ...draft, observationDate: e.target.value })}
        />
        <EntryFormSection title="Action" />
        <TextField
          label="Required action"
          value={draft.requiredAction}
          disabled={!canEdit}
          onChange={(e) => setDraft({ ...draft, requiredAction: e.target.value })}
        />
        <TextField
          label="Responsible party"
          value={draft.responsibleParty}
          disabled={!canEdit}
          onChange={(e) => setDraft({ ...draft, responsibleParty: e.target.value })}
        />
        <TextField
          label="Due date"
          type="date"
          value={draft.dueDate}
          disabled={!canEdit}
          onChange={(e) => setDraft({ ...draft, dueDate: e.target.value })}
        />
        <SelectField
          label="Status"
          value={draft.status}
          disabled={!canEdit}
          options={Object.entries(PAC_STATUS).map(([k, v]) => ({ value: v, label: k.replace(/_/g, ' ') }))}
          onChange={(e) => setDraft({ ...draft, status: e.target.value })}
        />
      </EntryFormShell>
    )
  }

  return {
    entry,
    onSave: canEdit && draft ? () => save.mutate() : undefined,
    onCancel: isCreate && canEdit ? () => setDraft(emptyPacObservation(organizationId)) : undefined,
    saving: save.isPending,
    saveDisabled: !draft || !draft.observation.trim() || !draft.auditParaId.trim(),
    showFormActions: Boolean(canEdit && draft),
    saveLabel: isCreate ? 'Add observation' : 'Save observation',
  }
}

function emptyComplianceItem(organizationId: string): ComplianceItem {
  return {
    id: '',
    organizationId,
    area: '',
    reportingFrequency: 'quarterly',
    dueDate: DEMO_AS_OF_DATE,
    responsibleFunction: '',
    status: COMPLIANCE_STATUS.PENDING_VERIFICATION,
    evidenceAvailable: false,
    verificationState: 'pending',
    isDummyDemonstrationData: true,
  }
}

export function useComplianceItemEntry(
  itemId: string | null,
  organizationId: string,
  onRecordSaved: (id: string) => void,
): EntryHookResult {
  const role = useSessionStore((s) => s.role)
  const canEdit = hasPermission(role, PERMISSION.COMPLIANCE_EDIT)
  const qc = useQueryClient()
  const pushToast = useUiStore((s) => s.pushToast)
  const isCreate = !itemId
  const query = useQuery({
    queryKey: ['compliance-entry', itemId],
    queryFn: () => mockComplianceService.getComplianceItem(itemId!),
    enabled: Boolean(itemId),
  })
  const [draft, setDraft] = useState<ComplianceItem | null>(null)

  useEffect(() => {
    if (itemId && query.data) setDraft(query.data)
    else if (!itemId && canEdit) setDraft(emptyComplianceItem(organizationId))
    else setDraft(null)
  }, [itemId, query.data, organizationId, canEdit])

  useScrollToEntryOnSelect(itemId)

  const save = useMutation({
    mutationFn: () => {
      if (!draft) throw new AppError('Nothing to save', 'VALIDATION')
      if (isCreate) {
        const { id: _id, ...payload } = draft
        return mockComplianceService.createComplianceItem(payload)
      }
      return mockComplianceService.updateComplianceItem(draft.id, draft)
    },
    onSuccess: (next) => {
      void qc.invalidateQueries({ queryKey: ['compliance-entry', next.id] })
      void qc.invalidateQueries({ queryKey: ['compliance-matrix'] })
      setDraft(next)
      onRecordSaved(next.id)
      pushToast({
        title: isCreate ? 'Compliance obligation added.' : 'Compliance obligation saved.',
        tone: 'success',
      })
    },
    onError: (err: unknown) => {
      pushToast({
        title: err instanceof AppError ? err.message : 'Compliance save failed',
        tone: 'critical',
      })
    },
  })

  let entry: ReactNode
  if (itemId && query.isLoading) {
    entry = <LoadingBlock label="Loading obligation…" />
  } else if (itemId && (query.isError || !draft)) {
    entry = <ErrorState title="Obligation not found" detail="Choose another row from the matrix." />
  } else if (!draft) {
    entry = (
      <EntryFormShell title="Compliance obligation" mode="view">
        <p className="col-span-full text-sm text-soe-slate">Read-only for current role.</p>
      </EntryFormShell>
    )
  } else {
    entry = (
      <EntryFormShell
        title="Compliance obligation"
        subtitle={isCreate ? 'New obligation' : draft.area}
        meta={isCreate ? undefined : draft.id}
        mode={isCreate ? 'create' : 'edit'}
      >
        <EntryFormSection title="Obligation" />
        <TextField
          label="Area"
          value={draft.area}
          disabled={!canEdit}
          required
          onChange={(e) => setDraft({ ...draft, area: e.target.value })}
        />

        <TextField
          label="Due date"
          type="date"
          value={draft.dueDate}
          disabled={!canEdit}
          required
          onChange={(e) => setDraft({ ...draft, dueDate: e.target.value })}
        />
        <TextField
          label="Responsible function"
          value={draft.responsibleFunction}
          disabled={!canEdit}
          onChange={(e) => setDraft({ ...draft, responsibleFunction: e.target.value })}
        />
        <SelectField
          label="Status"
          value={draft.status}
          disabled={!canEdit}
          options={Object.entries(COMPLIANCE_STATUS_LABEL).map(([k, v]) => ({ value: k, label: v }))}
          onChange={(e) => setDraft({ ...draft, status: e.target.value as ComplianceStatus })}
        />
        <TextField
          label="Comments"
          value={draft.comments ?? ''}
          disabled={!canEdit}
          onChange={(e) => setDraft({ ...draft, comments: e.target.value })}
        />
      </EntryFormShell>
    )
  }

  return {
    entry,
    onSave: canEdit && draft ? () => save.mutate() : undefined,
    onCancel: isCreate && canEdit ? () => setDraft(emptyComplianceItem(organizationId)) : undefined,
    saving: save.isPending,
    saveDisabled: !draft || !draft.area.trim() || !draft.dueDate.trim(),
    showFormActions: Boolean(canEdit && draft),
    saveLabel: isCreate ? 'Add obligation' : 'Save obligation',
  }
}

function emptyTransformation(organizationId: string): TransformationInitiative {
  return {
    id: '',
    organizationId,
    initiative: '',
    type: TRANSFORMATION_TYPE.RESTRUCTURING,
    rationale: '',
    currentStage: 'identified',
    responsibleAuthority: '',
    decisionStatus: 'pending',
    nextAction: '',
    milestones: [],
    evidenceAvailable: false,
    isDummyDemonstrationData: true,
  }
}

export function useTransformationEntry(
  initiativeId: string | null,
  organizationId: string,
  onRecordSaved: (id: string) => void,
): EntryHookResult {
  const role = useSessionStore((s) => s.role)
  const canEdit = hasPermission(role, PERMISSION.PRIVATIZATION_EDIT)
  const qc = useQueryClient()
  const pushToast = useUiStore((s) => s.pushToast)
  const isCreate = !initiativeId
  const query = useQuery({
    queryKey: ['transformation-entry', initiativeId],
    queryFn: () => mockPrivatizationService.getTransformation(initiativeId!),
    enabled: Boolean(initiativeId),
  })
  const [draft, setDraft] = useState<TransformationInitiative | null>(null)

  useEffect(() => {
    if (initiativeId && query.data) setDraft(query.data)
    else if (!initiativeId && canEdit) setDraft(emptyTransformation(organizationId))
    else setDraft(null)
  }, [initiativeId, query.data, organizationId, canEdit])

  useScrollToEntryOnSelect(initiativeId)

  const save = useMutation({
    mutationFn: () => {
      if (!draft) throw new AppError('Nothing to save', 'VALIDATION')
      if (isCreate) {
        const { id: _id, ...payload } = draft
        return mockPrivatizationService.createTransformation(payload)
      }
      return mockPrivatizationService.updateTransformation(draft.id, draft)
    },
    onSuccess: (next) => {
      void qc.invalidateQueries({ queryKey: ['transformation-entry', next.id] })
      void qc.invalidateQueries({ queryKey: ['transformations'] })
      setDraft(next)
      onRecordSaved(next.id)
      pushToast({
        title: isCreate ? 'Transformation initiative added.' : 'Transformation initiative saved.',
        tone: 'success',
      })
    },
    onError: (err: unknown) => {
      pushToast({
        title: err instanceof AppError ? err.message : 'Transformation save failed',
        tone: 'critical',
      })
    },
  })

  let entry: ReactNode
  if (initiativeId && query.isLoading) {
    entry = <LoadingBlock label="Loading initiative…" />
  } else if (initiativeId && (query.isError || !draft)) {
    entry = <ErrorState title="Initiative not found" detail="Choose another row from the tracker." />
  } else if (!draft) {
    entry = (
      <EntryFormShell title="Transformation initiative" mode="view">
        <p className="col-span-full text-sm text-soe-slate">Read-only for current role.</p>
      </EntryFormShell>
    )
  } else {
    entry = (
      <EntryFormShell
        title="Transformation initiative"
        subtitle={isCreate ? 'New initiative' : draft.initiative}
        meta={isCreate ? undefined : draft.id}
        mode={isCreate ? 'create' : 'edit'}
      >
        <EntryFormSection title="Initiative" />
        <TextField
          label="Initiative"
          value={draft.initiative}
          disabled={!canEdit}
          required
          onChange={(e) => setDraft({ ...draft, initiative: e.target.value })}
        />
        <SelectField
          label="Type"
          value={draft.type}
          disabled={!canEdit}
          options={Object.entries(TRANSFORMATION_TYPE_LABEL).map(([k, v]) => ({ value: k, label: v }))}
          onChange={(e) => setDraft({ ...draft, type: e.target.value })}
        />
        <TextField
          label="Rationale"
          value={draft.rationale}
          disabled={!canEdit}
          onChange={(e) => setDraft({ ...draft, rationale: e.target.value })}
        />
        <TextField
          label="Current stage"
          value={draft.currentStage}
          disabled={!canEdit}
          onChange={(e) => setDraft({ ...draft, currentStage: e.target.value })}
        />
        <EntryFormSection title="Governance" />
        <TextField
          label="Responsible authority"
          value={draft.responsibleAuthority}
          disabled={!canEdit}
          onChange={(e) => setDraft({ ...draft, responsibleAuthority: e.target.value })}
        />
        <TextField
          label="Decision status"
          value={draft.decisionStatus}
          disabled={!canEdit}
          onChange={(e) => setDraft({ ...draft, decisionStatus: e.target.value })}
        />
        <TextField
          label="Next action"
          value={draft.nextAction}
          disabled={!canEdit}
          onChange={(e) => setDraft({ ...draft, nextAction: e.target.value })}
        />
      </EntryFormShell>
    )
  }

  return {
    entry,
    onSave: canEdit && draft ? () => save.mutate() : undefined,
    onCancel: isCreate && canEdit ? () => setDraft(emptyTransformation(organizationId)) : undefined,
    saving: save.isPending,
    saveDisabled: !draft || !draft.initiative.trim(),
    showFormActions: Boolean(canEdit && draft),
    saveLabel: isCreate ? 'Add initiative' : 'Save initiative',
  }
}

function emptyProcurementPlan(organizationId: string): ProcurementAnnualPlan {
  return {
    id: '',
    organizationId,
    fiscalYear: '2025-26',
    title: '',
    category: 'Goods and services',
    estimatedValue: 0,
    method: PROCUREMENT_METHOD.OPEN_TENDER,
    status: 'draft',
    responsibleFunction: 'Procurement',
    isDummyDemonstrationData: true,
  }
}

export function useProcurementPlanEntry(
  planId: string | null,
  organizationId: string,
  onRecordSaved: (id: string) => void,
): EntryHookResult {
  const role = useSessionStore((s) => s.role)
  const canEdit = hasPermission(role, PERMISSION.PROCUREMENT_EDIT)
  const qc = useQueryClient()
  const pushToast = useUiStore((s) => s.pushToast)
  const isCreate = !planId
  const query = useQuery({
    queryKey: ['procurement-plan-entry', planId],
    queryFn: () => mockAuditService.getProcurementAnnualPlan(planId!),
    enabled: Boolean(planId),
  })
  const [draft, setDraft] = useState<ProcurementAnnualPlan | null>(null)

  useEffect(() => {
    if (planId && query.data) setDraft(query.data)
    else if (!planId && canEdit) setDraft(emptyProcurementPlan(organizationId))
    else setDraft(null)
  }, [planId, query.data, organizationId, canEdit])

  useScrollToEntryOnSelect(planId)

  const save = useMutation({
    mutationFn: () => {
      if (!draft) throw new AppError('Nothing to save', 'VALIDATION')
      if (isCreate) {
        const { id: _id, ...payload } = draft
        return mockAuditService.createProcurementAnnualPlan(payload)
      }
      return mockAuditService.updateProcurementAnnualPlan(draft.id, draft)
    },
    onSuccess: (next) => {
      void qc.invalidateQueries({ queryKey: ['procurement-plan-entry', next.id] })
      void qc.invalidateQueries({ queryKey: ['procurement-plans'] })
      setDraft(next)
      onRecordSaved(next.id)
      pushToast({
        title: isCreate ? 'Annual plan added.' : 'Annual plan saved.',
        tone: 'success',
      })
    },
    onError: (err: unknown) => {
      pushToast({
        title: err instanceof AppError ? err.message : 'Plan save failed',
        tone: 'critical',
      })
    },
  })

  let entry: ReactNode
  if (planId && query.isLoading) {
    entry = <LoadingBlock label="Loading plan…" />
  } else if (planId && (query.isError || !draft)) {
    entry = <ErrorState title="Plan not found" detail="Choose another row from the registry." />
  } else if (!draft) {
    entry = (
      <EntryFormShell title="Annual procurement plan" mode="view">
        <p className="col-span-full text-sm text-soe-slate">Read-only for current role.</p>
      </EntryFormShell>
    )
  } else {
    entry = (
      <EntryFormShell
        title="Annual procurement plan"
        subtitle={isCreate ? 'New plan entry' : draft.title}
        meta={isCreate ? undefined : draft.id}
        mode={isCreate ? 'create' : 'edit'}
      >
        <EntryFormSection title="Plan" />
        <TextField
          label="Title"
          value={draft.title}
          disabled={!canEdit}
          required
          onChange={(e) => setDraft({ ...draft, title: e.target.value })}
        />
        <TextField
          label="Fiscal year"
          value={draft.fiscalYear}
          disabled={!canEdit}
          onChange={(e) => setDraft({ ...draft, fiscalYear: e.target.value })}
        />
        <TextField
          label="Category"
          value={draft.category}
          disabled={!canEdit}
          onChange={(e) => setDraft({ ...draft, category: e.target.value })}
        />
        <CurrencyField
          label="Estimated value PKR"
          value={draft.estimatedValue}
          disabled={!canEdit}
          onChange={(e) => setDraft({ ...draft, estimatedValue: Number(e.target.value) })}
        />
        <SelectField
          label="Method"
          value={draft.method}
          disabled={!canEdit}
          options={Object.entries(PROCUREMENT_METHOD_LABEL).map(([k, v]) => ({ value: k, label: v }))}
          onChange={(e) => setDraft({ ...draft, method: e.target.value })}
        />
        <TextField
          label="Status"
          value={draft.status}
          disabled={!canEdit}
          onChange={(e) => setDraft({ ...draft, status: e.target.value })}
        />
        <TextField
          label="Responsible function"
          value={draft.responsibleFunction}
          disabled={!canEdit}
          onChange={(e) => setDraft({ ...draft, responsibleFunction: e.target.value })}
        />
      </EntryFormShell>
    )
  }

  return {
    entry,
    onSave: canEdit && draft ? () => save.mutate() : undefined,
    onCancel: isCreate && canEdit ? () => setDraft(emptyProcurementPlan(organizationId)) : undefined,
    saving: save.isPending,
    saveDisabled: !draft || !draft.title.trim(),
    showFormActions: Boolean(canEdit && draft),
    saveLabel: isCreate ? 'Add plan' : 'Save plan',
  }
}
