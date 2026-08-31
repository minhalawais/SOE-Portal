import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState, type ReactNode } from 'react'
import { EntryFormSection, EntryFormShell, useScrollToEntryOnSelect } from '@/components/soe'
import { Button } from '@/design-system/components/Button'
import { SelectField, CurrencyField, TextField } from '@/design-system/components/Fields'
import { ErrorState, LoadingBlock } from '@/design-system/components/Feedback'
import { StatusBadge } from '@/design-system/components/StatusBadge'
import {
  AUDIT_PARA_STATUS,
  AUDIT_PARA_STATUS_LABEL,
  AUDIT_TYPE,
  AUDIT_TYPE_LABEL,
  COMPLIANCE_STATUS,
  COMPLIANCE_STATUS_LABEL,
  DEMO_AS_OF_DATE,
  DOCUMENT_CATEGORY,
  DOCUMENT_EVIDENCE_STATUS,
  LITIGATION_STAGE,
  LITIGATION_STAGE_LABEL,
  LITIGATION_STAGE_ORDER,
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
  type LitigationStageId,
} from '@/constants'
import {
  mockAuditService,
  mockComplianceService,
  mockDocumentService,
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
  LitigationCaseEvent,
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
    caseStage: LITIGATION_STAGE_LABEL[LITIGATION_STAGE.INTAKE],
    filedDate: '',
    receivedDate: '',
    legalOwner: 'SOE Legal Cell',
    currentExposurePkr: 0,
    bestCaseExposurePkr: 0,
    worstCaseExposurePkr: 0,
    probabilityOfLoss: 'possible',
    accountingTreatment: 'disclosed',
    confidentiality: 'sensitive',
    nextAction: '',
    actionDueDate: '',
    evidenceAvailable: false,
    isDummyDemonstrationData: true,
  }
}

interface LitigationProgressDraft {
  stage: LitigationStageId
  occurredAt: string
  title: string
  detail: string
  referenceNumber: string
  nextHearing: string
  actionOwner: string
  actionDueDate: string
  exposureDeltaPkr: number
  financialImpactPkr: number
  stageOutcome: string
  stageDecision: string
  complianceRequired: string
  appealDeadline: string
  appellateForum: string
  settlementTerms: string
  approvedAuthority: string
  paymentSchedule: string
  closureReason: string
  evidenceAvailable: boolean
  evidenceTitle: string
  evidenceFileName: string
  evidenceNotes: string
  evidenceFiles: { name: string; title: string; notes: string }[]
  amendmentOfEventId?: string
}

const LITIGATION_PROGRESS_STAGE_OPTIONS = LITIGATION_STAGE_ORDER.filter(
  (stage) => stage !== LITIGATION_STAGE.INTAKE,
)

function emptyLitigationProgressDraft(): LitigationProgressDraft {
  return {
    stage: LITIGATION_STAGE.HEARINGS,
    occurredAt: DEMO_AS_OF_DATE,
    title: '',
    detail: '',
    referenceNumber: '',
    nextHearing: '',
    actionOwner: 'SOE Legal Cell',
    actionDueDate: '',
    exposureDeltaPkr: 0,
    financialImpactPkr: 0,
    stageOutcome: '',
    stageDecision: '',
    complianceRequired: '',
    appealDeadline: '',
    appellateForum: '',
    settlementTerms: '',
    approvedAuthority: '',
    paymentSchedule: '',
    closureReason: '',
    evidenceAvailable: false,
    evidenceTitle: '',
    evidenceFileName: '',
    evidenceNotes: '',
    evidenceFiles: [],
  }
}

function correctionDraftFromEvent(event: LitigationCaseEvent): LitigationProgressDraft {
  return {
    ...emptyLitigationProgressDraft(),
    stage: event.stage ?? LITIGATION_STAGE.HEARINGS,
    occurredAt: DEMO_AS_OF_DATE,
    title: `Correction: ${event.title}`,
    detail: event.detail ?? '',
    nextHearing: event.nextHearing ?? '',
    exposureDeltaPkr: event.exposureDeltaPkr ?? 0,
    evidenceAvailable: true,
    amendmentOfEventId: event.id,
  }
}

function litigationEventTypeForStage(stage: LitigationStageId): LitigationCaseEvent['eventType'] {
  if (stage === LITIGATION_STAGE.FILING) return 'case_filed'
  if (stage === LITIGATION_STAGE.PLEADINGS) return 'notice_received'
  if (stage === LITIGATION_STAGE.HEARINGS) return 'hearing'
  if (stage === LITIGATION_STAGE.INTERIM_ORDERS) return 'order'
  if (stage === LITIGATION_STAGE.EVIDENCE_ARGUMENTS) return 'evidence'
  if (stage === LITIGATION_STAGE.JUDGMENT) return 'judgment'
  if (stage === LITIGATION_STAGE.APPEAL_REVIEW) return 'appeal'
  if (stage === LITIGATION_STAGE.SETTLEMENT) return 'settlement'
  if (stage === LITIGATION_STAGE.CLOSURE) return 'closure'
  return 'correction'
}

function litigationProgressPayload(progress: LitigationProgressDraft) {
  return {
    referenceNumber: progress.referenceNumber || undefined,
    actionOwner: progress.actionOwner || undefined,
    actionDueDate: progress.actionDueDate || undefined,
    financialImpactPkr: progress.financialImpactPkr || undefined,
    stageOutcome: progress.stageOutcome || undefined,
    stageDecision: progress.stageDecision || undefined,
    complianceRequired: progress.complianceRequired || undefined,
    appealDeadline: progress.appealDeadline || undefined,
    appellateForum: progress.appellateForum || undefined,
    settlementTerms: progress.settlementTerms || undefined,
    approvedAuthority: progress.approvedAuthority || undefined,
    paymentSchedule: progress.paymentSchedule || undefined,
    closureReason: progress.closureReason || undefined,
    evidenceAvailable: progress.evidenceAvailable,
    evidenceFiles: progress.evidenceFiles.map((file) => file.name).join(', ') || undefined,
    amendmentOfEventId: progress.amendmentOfEventId,
  }
}

function litigationStagePayload(draft: LitigationCase, stage: LitigationStageId) {
  if (stage === LITIGATION_STAGE.INTAKE) {
    return {
      receivedDate: draft.receivedDate,
      legalOwner: draft.legalOwner,
      petitioner: draft.petitioner,
      respondent: draft.respondent,
      nature: draft.nature,
      confidentiality: draft.confidentiality,
    }
  }
  if (stage === LITIGATION_STAGE.FILING) {
    return {
      filedDate: draft.filedDate,
      court: draft.court,
      caseNumber: draft.caseNumber,
      lawyer: draft.lawyer,
    }
  }
  if (stage === LITIGATION_STAGE.PLEADINGS) {
    return {
      petitioner: draft.petitioner,
      respondent: draft.respondent,
      nextAction: draft.nextAction,
      actionDueDate: draft.actionDueDate,
    }
  }
  if (stage === LITIGATION_STAGE.HEARINGS) {
    return {
      nextHearing: draft.nextHearing,
      nextAction: draft.nextAction,
      actionDueDate: draft.actionDueDate,
    }
  }
  if (stage === LITIGATION_STAGE.EVIDENCE_ARGUMENTS) {
    return {
      evidenceAvailable: draft.evidenceAvailable,
      relatedAssetId: draft.relatedAssetId,
      relatedAuditParaId: draft.relatedAuditParaId,
    }
  }
  if (stage === LITIGATION_STAGE.JUDGMENT || stage === LITIGATION_STAGE.SETTLEMENT) {
    return {
      currentExposurePkr: draft.currentExposurePkr,
      bestCaseExposurePkr: draft.bestCaseExposurePkr,
      worstCaseExposurePkr: draft.worstCaseExposurePkr,
      probabilityOfLoss: draft.probabilityOfLoss,
      accountingTreatment: draft.accountingTreatment,
    }
  }
  if (stage === LITIGATION_STAGE.CLOSURE) {
    return {
      status: draft.status,
      nextAction: draft.nextAction,
      actionDueDate: draft.actionDueDate,
    }
  }
  return {
    nextAction: draft.nextAction,
    actionDueDate: draft.actionDueDate,
    currentExposurePkr: draft.currentExposurePkr,
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
        void _id
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
        void _id
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
  const [progressDraft, setProgressDraft] = useState<LitigationProgressDraft | null>(null)
  const query = useQuery({
    queryKey: ['litigation-case', caseId],
    queryFn: () => mockLitigationService.getCase(caseId!),
    enabled: Boolean(caseId),
  })
  const stages = useQuery({
    queryKey: ['litigation-case-stages', caseId],
    queryFn: () => mockLitigationService.getCaseStages(caseId!),
    enabled: Boolean(caseId),
  })
  const events = useQuery({
    queryKey: ['litigation-case-events', caseId],
    queryFn: () => mockLitigationService.getCaseEvents(caseId!),
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
    mutationFn: async () => {
      if (!draft) throw new AppError('Nothing to save', 'VALIDATION')
      let next: LitigationCase
      if (isCreate) {
        const { id: _id, ...payload } = draft
        void _id
        next = await mockLitigationService.createCase(payload)
      } else {
        next = await mockLitigationService.updateCase(draft.id, draft)
      }
      if (!progressDraft) return next

      const uploadedEvidence = await Promise.all(
        progressDraft.evidenceFiles.map((file) =>
          mockDocumentService.createDocument({
            organizationId,
            title: file.title || file.name,
            category: DOCUMENT_CATEGORY.COURT_ORDERS,
            fileName: file.name,
            notes: file.notes || undefined,
            uploadedBy: role,
            linkedRecordType: 'litigation_case',
            linkedRecordId: next.id,
            linkedModule: 'litigation',
            evidenceStatus: DOCUMENT_EVIDENCE_STATUS.PENDING_REVIEW,
            status: DOCUMENT_EVIDENCE_STATUS.PENDING_REVIEW,
            classification: 'evidence',
            isRestricted: next.confidentiality === 'privileged',
            isSensitive: next.confidentiality !== 'official',
          }),
        ),
      )
      const evidenceRefs = uploadedEvidence.map((doc) => `${doc.title} (${doc.id})`)
      await mockLitigationService.addCaseEvent(next.id, {
        occurredAt: progressDraft.occurredAt,
        effectiveAt: progressDraft.occurredAt,
        actorRole: role,
        actorName: 'SOE Legal Officer',
        eventType: progressDraft.amendmentOfEventId ? 'correction' : litigationEventTypeForStage(progressDraft.stage),
        stage: progressDraft.stage,
        title: progressDraft.title || `${LITIGATION_STAGE_LABEL[progressDraft.stage]} update`,
        detail: [
          progressDraft.detail,
          evidenceRefs.length ? `Evidence uploaded: ${evidenceRefs.join(', ')}` : '',
        ]
          .filter(Boolean)
          .join(' | ') || undefined,
        nextHearing: progressDraft.nextHearing || undefined,
        exposureDeltaPkr: progressDraft.exposureDeltaPkr || undefined,
        amendmentOfEventId: progressDraft.amendmentOfEventId,
        supersedesEventId: progressDraft.amendmentOfEventId,
        stagePayload: {
          ...litigationProgressPayload(progressDraft),
          evidenceDocumentIds: uploadedEvidence.map((doc) => doc.id).join(', ') || undefined,
          evidenceDocumentTitles: uploadedEvidence.map((doc) => doc.title).join(', ') || undefined,
        },
      })
      await mockLitigationService.saveCaseStage(next.id, progressDraft.stage, {
        ...litigationStagePayload(next, progressDraft.stage),
        latestProgressTitle: progressDraft.title,
        latestProgressDetail: progressDraft.detail,
        occurredAt: progressDraft.occurredAt,
        nextHearing: progressDraft.nextHearing || next.nextHearing,
        exposureDeltaPkr: progressDraft.exposureDeltaPkr || undefined,
        ...litigationProgressPayload(progressDraft),
        evidenceDocumentIds: uploadedEvidence.map((doc) => doc.id).join(', ') || undefined,
        evidenceDocumentTitles: uploadedEvidence.map((doc) => doc.title).join(', ') || undefined,
      })
      await mockLitigationService.submitCaseStage(next.id, progressDraft.stage)
      return mockLitigationService.getCase(next.id)
    },
    onSuccess: (next) => {
      void qc.invalidateQueries({ queryKey: ['litigation-case', next.id] })
      void qc.invalidateQueries({ queryKey: ['litigation-case-stages', next.id] })
      void qc.invalidateQueries({ queryKey: ['litigation-case-events', next.id] })
      void qc.invalidateQueries({ queryKey: ['litigation'] })
      void qc.invalidateQueries({ queryKey: ['litigation-continuous-summary'] })
      setDraft(next)
      setProgressDraft(null)
      onRecordSaved(next.id)
      pushToast({
        title: progressDraft ? 'Litigation progress submitted.' : isCreate ? 'Litigation case added.' : 'Litigation case saved.',
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
    const visibleStages =
      stages.data?.filter((stage) => stage.status !== 'not_started') ?? []
    const progressEvents = events.data ?? []
    entry = (
      <>
        <EntryFormShell
          title="Litigation case header"
          subtitle={isCreate ? 'Intake fields open the case. Later stages are added from Progress timeline.' : draft.caseNumber}
          meta={isCreate ? undefined : draft.id}
          mode={isCreate ? 'create' : 'edit'}
        >
          <EntryFormSection title="Case identity (intake)" />
          <TextField label="Case number" value={draft.caseNumber} disabled={!canEdit} required onChange={(e) => setDraft({ ...draft, caseNumber: e.target.value })} />
          <TextField label="Court" value={draft.court} disabled={!canEdit} required onChange={(e) => setDraft({ ...draft, court: e.target.value })} />
          <TextField label="Petitioner" value={draft.petitioner} disabled={!canEdit} onChange={(e) => setDraft({ ...draft, petitioner: e.target.value })} />
          <TextField label="Respondent" value={draft.respondent} disabled={!canEdit} onChange={(e) => setDraft({ ...draft, respondent: e.target.value })} />
          <EntryFormSection title="Current posture" />
          <TextField label="Nature" value={draft.nature} disabled={!canEdit} onChange={(e) => setDraft({ ...draft, nature: e.target.value })} />
          <TextField label="Current stage" value={draft.caseStage ?? ''} disabled onChange={() => undefined} />
          <SelectField label="Status" value={draft.status} disabled={!canEdit} options={Object.entries(LITIGATION_STATUS_LABEL).map(([k, v]) => ({ value: k, label: v }))} onChange={(e) => setDraft({ ...draft, status: e.target.value })} />
          <TextField label="Legal owner" value={draft.legalOwner ?? ''} disabled={!canEdit} onChange={(e) => setDraft({ ...draft, legalOwner: e.target.value })} />
          <TextField label="Next hearing" type="date" value={draft.nextHearing ?? ''} disabled={!canEdit} onChange={(e) => setDraft({ ...draft, nextHearing: e.target.value })} />
          <TextField label="Next action" value={draft.nextAction ?? ''} disabled={!canEdit} onChange={(e) => setDraft({ ...draft, nextAction: e.target.value })} />
          <CurrencyField label="Current exposure PKR" value={draft.currentExposurePkr ?? draft.amountInvolved ?? 0} disabled={!canEdit} onChange={(e) => setDraft({ ...draft, currentExposurePkr: Number(e.target.value), amountInvolved: Number(e.target.value) })} />
          <SelectField label="Confidentiality" value={draft.confidentiality ?? 'sensitive'} disabled={!canEdit} options={[{ value: 'official', label: 'Official' }, { value: 'sensitive', label: 'Sensitive' }, { value: 'privileged', label: 'Privileged' }]} onChange={(e) => setDraft({ ...draft, confidentiality: e.target.value as LitigationCase['confidentiality'] })} />
        </EntryFormShell>
        <EntryFormShell title="Progress timeline" subtitle="Add only the stage that has actually happened" mode="edit">
          <div className="col-span-full">
            {visibleStages.length ? (
              <div className="mb-3 flex flex-wrap gap-2">
                {visibleStages.map((stage) => (
                  <StatusBadge key={stage.id} status={stage.status} family="reporting" label={`${LITIGATION_STAGE_LABEL[stage.stage]} · ${stage.status.replaceAll('_', ' ')}`} />
                ))}
              </div>
            ) : null}
            {events.isLoading ? (
              <LoadingBlock label="Loading progress timeline..." />
            ) : progressEvents.length ? (
              <div className="divide-y divide-soe-border rounded-card border border-soe-border bg-white">
                {progressEvents.slice(0, 5).map((event) => (
                  <div key={event.id} className="grid gap-2 px-3 py-2 text-sm md:grid-cols-[7rem_1fr_auto]">
                    <span className="font-medium tabular-nums text-soe-navy">{event.occurredAt}</span>
                    <div>
                      <p className="font-semibold text-soe-navy">{event.title}</p>
                      <p className="text-xs text-soe-slate">
                        {event.stage ? LITIGATION_STAGE_LABEL[event.stage] : event.eventType.replaceAll('_', ' ')}
                        {event.supersedesEventId ? ' · correction' : ''}
                      </p>
                      {event.detail ? <p className="mt-1 text-xs text-soe-ink">{event.detail}</p> : null}
                      {event.stagePayload ? (
                        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-soe-slate">
                          {Object.entries(event.stagePayload)
                            .filter(([, value]) => value !== undefined && value !== '' && value !== false)
                            .slice(0, 4)
                            .map(([key, value]) => (
                              <span key={key}>{key.replaceAll(/([A-Z])/g, ' $1').replaceAll('_', ' ')}: {String(value)}</span>
                            ))}
                        </div>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap items-start justify-end gap-2">
                      <StatusBadge status={event.assuranceState} family="reporting" label={event.assuranceState.replaceAll('_', ' ')} />
                      {canEdit && event.assuranceState !== 'draft' ? (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => setProgressDraft(correctionDraftFromEvent(event))}
                        >
                          Add correction
                        </Button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="rounded-card border border-dashed border-soe-border bg-soe-canvas px-3 py-4 text-sm text-soe-slate">
                No progress stages added yet.
              </p>
            )}
            {canEdit && !progressDraft ? (
              <Button className="mt-3" size="sm" onClick={() => setProgressDraft(emptyLitigationProgressDraft())}>
                Add progress stage
              </Button>
            ) : null}
          </div>
          {progressDraft ? (
            <>
              <EntryFormSection title="New progress stage" />
              <SelectField
                label="Stage"
                value={progressDraft.stage}
                disabled={!canEdit}
                options={LITIGATION_PROGRESS_STAGE_OPTIONS.map((stage) => ({ value: stage, label: LITIGATION_STAGE_LABEL[stage] }))}
                onChange={(e) => setProgressDraft({ ...progressDraft, stage: e.target.value as LitigationStageId })}
              />
              <TextField label="Progress date" type="date" value={progressDraft.occurredAt} disabled={!canEdit} onChange={(e) => setProgressDraft({ ...progressDraft, occurredAt: e.target.value })} />
              <TextField label="Progress title" value={progressDraft.title} disabled={!canEdit} onChange={(e) => setProgressDraft({ ...progressDraft, title: e.target.value })} />
              <TextField label="Details / outcome" value={progressDraft.detail} disabled={!canEdit} onChange={(e) => setProgressDraft({ ...progressDraft, detail: e.target.value })} />
              <TextField label="Court / reference number" value={progressDraft.referenceNumber} disabled={!canEdit} onChange={(e) => setProgressDraft({ ...progressDraft, referenceNumber: e.target.value })} />
              <TextField label="Action owner" value={progressDraft.actionOwner} disabled={!canEdit} onChange={(e) => setProgressDraft({ ...progressDraft, actionOwner: e.target.value })} />
              <TextField label="Action due date" type="date" value={progressDraft.actionDueDate} disabled={!canEdit} onChange={(e) => setProgressDraft({ ...progressDraft, actionDueDate: e.target.value })} />
              {progressDraft.stage === LITIGATION_STAGE.FILING ? (
                <>
                  <TextField label="Filed date" type="date" value={draft.filedDate ?? ''} disabled={!canEdit} onChange={(e) => setDraft({ ...draft, filedDate: e.target.value })} />
                  <TextField label="Counsel" value={draft.lawyer} disabled={!canEdit} onChange={(e) => setDraft({ ...draft, lawyer: e.target.value })} />
                </>
              ) : null}
              {progressDraft.stage === LITIGATION_STAGE.PLEADINGS ? (
                <>
                  <TextField label="Pleadings filed / received" value={progressDraft.stageOutcome} disabled={!canEdit} onChange={(e) => setProgressDraft({ ...progressDraft, stageOutcome: e.target.value })} />
                  <TextField label="Response due date" type="date" value={progressDraft.actionDueDate} disabled={!canEdit} onChange={(e) => setProgressDraft({ ...progressDraft, actionDueDate: e.target.value })} />
                  <TextField label="Counterparty position" value={progressDraft.complianceRequired} disabled={!canEdit} onChange={(e) => setProgressDraft({ ...progressDraft, complianceRequired: e.target.value })} />
                </>
              ) : null}
              {progressDraft.stage === LITIGATION_STAGE.HEARINGS ? (
                <>
                  <TextField label="Hearing outcome" value={progressDraft.stageOutcome} disabled={!canEdit} onChange={(e) => setProgressDraft({ ...progressDraft, stageOutcome: e.target.value })} />
                  <TextField label="Next hearing" type="date" value={progressDraft.nextHearing} disabled={!canEdit} onChange={(e) => setProgressDraft({ ...progressDraft, nextHearing: e.target.value })} />
                </>
              ) : null}
              {progressDraft.stage === LITIGATION_STAGE.INTERIM_ORDERS ? (
                <>
                  <TextField label="Order decision" value={progressDraft.stageDecision} disabled={!canEdit} onChange={(e) => setProgressDraft({ ...progressDraft, stageDecision: e.target.value })} />
                  <TextField label="Compliance required" value={progressDraft.complianceRequired} disabled={!canEdit} onChange={(e) => setProgressDraft({ ...progressDraft, complianceRequired: e.target.value })} />
                  <TextField label="Next hearing" type="date" value={progressDraft.nextHearing} disabled={!canEdit} onChange={(e) => setProgressDraft({ ...progressDraft, nextHearing: e.target.value })} />
                </>
              ) : null}
              {progressDraft.stage === LITIGATION_STAGE.EVIDENCE_ARGUMENTS ? (
                <>
                  <TextField label="Evidence / argument status" value={progressDraft.stageOutcome} disabled={!canEdit} onChange={(e) => setProgressDraft({ ...progressDraft, stageOutcome: e.target.value })} />
                  <TextField label="Missing documents" value={progressDraft.complianceRequired} disabled={!canEdit} onChange={(e) => setProgressDraft({ ...progressDraft, complianceRequired: e.target.value })} />
                </>
              ) : null}
              {progressDraft.stage === LITIGATION_STAGE.JUDGMENT ? (
                <>
                  <TextField label="Judgment decision" value={progressDraft.stageDecision} disabled={!canEdit} onChange={(e) => setProgressDraft({ ...progressDraft, stageDecision: e.target.value })} />
                  <CurrencyField label="Financial impact PKR" value={progressDraft.financialImpactPkr} disabled={!canEdit} onChange={(e) => setProgressDraft({ ...progressDraft, financialImpactPkr: Number(e.target.value) })} />
                  <TextField label="Appeal deadline" type="date" value={progressDraft.appealDeadline} disabled={!canEdit} onChange={(e) => setProgressDraft({ ...progressDraft, appealDeadline: e.target.value })} />
                </>
              ) : null}
              {progressDraft.stage === LITIGATION_STAGE.APPEAL_REVIEW ? (
                <>
                  <TextField label="Appellate forum" value={progressDraft.appellateForum} disabled={!canEdit} onChange={(e) => setProgressDraft({ ...progressDraft, appellateForum: e.target.value })} />
                  <TextField label="Appeal deadline / filed date" type="date" value={progressDraft.appealDeadline} disabled={!canEdit} onChange={(e) => setProgressDraft({ ...progressDraft, appealDeadline: e.target.value })} />
                  <TextField label="Next hearing" type="date" value={progressDraft.nextHearing} disabled={!canEdit} onChange={(e) => setProgressDraft({ ...progressDraft, nextHearing: e.target.value })} />
                </>
              ) : null}
              {progressDraft.stage === LITIGATION_STAGE.SETTLEMENT ? (
                <>
                  <TextField label="Settlement terms" value={progressDraft.settlementTerms} disabled={!canEdit} onChange={(e) => setProgressDraft({ ...progressDraft, settlementTerms: e.target.value })} />
                  <TextField label="Approving authority" value={progressDraft.approvedAuthority} disabled={!canEdit} onChange={(e) => setProgressDraft({ ...progressDraft, approvedAuthority: e.target.value })} />
                  <TextField label="Payment schedule" value={progressDraft.paymentSchedule} disabled={!canEdit} onChange={(e) => setProgressDraft({ ...progressDraft, paymentSchedule: e.target.value })} />
                  <CurrencyField label="Exposure change PKR" value={progressDraft.exposureDeltaPkr} disabled={!canEdit} onChange={(e) => setProgressDraft({ ...progressDraft, exposureDeltaPkr: Number(e.target.value) })} />
                </>
              ) : null}
              {progressDraft.stage === LITIGATION_STAGE.CLOSURE ? (
                <>
                  <TextField label="Closure reason" value={progressDraft.closureReason} disabled={!canEdit} onChange={(e) => setProgressDraft({ ...progressDraft, closureReason: e.target.value })} />
                  <CurrencyField label="Final financial impact PKR" value={progressDraft.financialImpactPkr} disabled={!canEdit} onChange={(e) => setProgressDraft({ ...progressDraft, financialImpactPkr: Number(e.target.value) })} />
                </>
              ) : null}
              <SelectField label="Evidence for this stage" value={progressDraft.evidenceAvailable ? 'yes' : 'no'} disabled={!canEdit} options={[{ value: 'no', label: 'Pending' }, { value: 'yes', label: 'Available' }]} onChange={(e) => setProgressDraft({ ...progressDraft, evidenceAvailable: e.target.value === 'yes' })} />
              <EntryFormSection title="Stage evidence upload" />
              <TextField label="Evidence title" value={progressDraft.evidenceTitle} disabled={!canEdit} onChange={(e) => setProgressDraft({ ...progressDraft, evidenceTitle: e.target.value })} />
              <TextField label="Evidence notes" value={progressDraft.evidenceNotes} disabled={!canEdit} onChange={(e) => setProgressDraft({ ...progressDraft, evidenceNotes: e.target.value })} />
              <div className="field col-span-full">
                <label className="mb-1 block text-xs font-semibold text-soe-navy">
                  Upload document
                </label>
                <input
                  type="file"
                  disabled={!canEdit}
                  className="block w-full rounded-md border border-soe-border bg-white px-3 py-2 text-sm text-soe-ink file:mr-3 file:rounded-control file:border-0 file:bg-soe-blue file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white disabled:bg-[var(--color-pending-soft)]"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    setProgressDraft({
                      ...progressDraft,
                      evidenceAvailable: true,
                      evidenceFileName: file.name,
                      evidenceFiles: [
                        ...progressDraft.evidenceFiles,
                        {
                          name: file.name,
                          title: progressDraft.evidenceTitle || file.name,
                          notes: progressDraft.evidenceNotes,
                        },
                      ],
                      evidenceTitle: '',
                      evidenceNotes: '',
                    })
                    e.target.value = ''
                  }}
                />
              </div>
              {progressDraft.evidenceFiles.length ? (
                <div className="col-span-full rounded-card border border-soe-border bg-soe-canvas px-3 py-2">
                  <p className="mb-2 text-xs font-semibold uppercase text-soe-slate">Attached evidence</p>
                  <div className="space-y-2">
                    {progressDraft.evidenceFiles.map((file, index) => (
                      <div key={`${file.name}-${index}`} className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-white px-3 py-2 text-sm">
                        <div>
                          <p className="font-medium text-soe-navy">{file.title}</p>
                          <p className="text-xs text-soe-slate">{file.name}{file.notes ? ` · ${file.notes}` : ''}</p>
                        </div>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() =>
                            setProgressDraft({
                              ...progressDraft,
                              evidenceFiles: progressDraft.evidenceFiles.filter((_, i) => i !== index),
                              evidenceAvailable: progressDraft.evidenceFiles.length > 1,
                            })
                          }
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
              <div className="col-span-full">
                <Button size="sm" variant="secondary" onClick={() => setProgressDraft(null)}>
                  Cancel progress stage
                </Button>
              </div>
            </>
          ) : null}
        </EntryFormShell>
      </>
    )
  }

  return {
    entry,
    onSave: canEdit && draft ? () => save.mutate() : undefined,
    onCancel: isCreate && canEdit ? () => setDraft(emptyLitigationCase(organizationId)) : undefined,
    saving: save.isPending,
    saveDisabled: !draft || !draft.caseNumber.trim() || !draft.court.trim(),
    showFormActions: Boolean(canEdit && draft),
    saveLabel: progressDraft ? `Submit ${LITIGATION_STAGE_LABEL[progressDraft.stage]} progress` : isCreate ? 'Add case' : 'Save case',
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
        void _id
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
        void _id
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
        void _id
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
        void _id
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
        void _id
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
        void _id
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
