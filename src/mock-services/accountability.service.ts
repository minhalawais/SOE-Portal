import {
  AUDIT_PARA_STATUS,
  DEMO_AS_OF_DATE,
  LITIGATION_STAGE,
  LITIGATION_STAGE_LABEL,
  LITIGATION_STAGE_ORDER,
  LITIGATION_STAGE_STATUS,
  type LitigationStageId,
  MODULE,
  PROCUREMENT_HIGH_VALUE_THRESHOLD_PKR,
  RECOVERY_STATUS,
  ROLE,
} from '@/constants'
import { db } from '@/mock-data'
import type {
  AccountabilityHistoryEvent,
  AuditPara,
  AuditRegister,
  ComplianceItem,
  ContinuousRegisterSummary,
  ContractRecord,
  ListQuery,
  LitigationCase,
  LitigationCaseEvent,
  LitigationStageRecord,
  LitigationStageSummary,
  PacObservation,
  PagedResult,
  ProcurementAnnualPlan,
  ProcurementContract,
} from '@/types/domain'
import { AppError, formatCurrencyPkr, simulateLatency, simulateMutation } from '@/utils'

function pageSlice<T>(items: T[], query?: ListQuery): PagedResult<T> {
  const page = query?.page ?? 1
  const pageSize = query?.pageSize ?? 50
  const start = (page - 1) * pageSize
  return {
    items: items.slice(start, start + pageSize),
    total: items.length,
    page,
    pageSize,
  }
}

function daysBetween(from: string, to: string): number {
  const a = new Date(from).getTime()
  const b = new Date(to).getTime()
  return Math.max(0, Math.round((b - a) / (24 * 60 * 60 * 1000)))
}

export function recoveryPct(amountInvolved: number, amountRecovered: number): number {
  if (amountInvolved <= 0) return 0
  return Math.round((amountRecovered / amountInvolved) * 1000) / 10
}

export function auditParaAgeDays(dateRaised: string, asOf = DEMO_AS_OF_DATE): number {
  return daysBetween(dateRaised, asOf)
}

export interface ProcurementAlert {
  code: string
  message: string
  severity: 'warning' | 'critical'
}

export function procurementAlerts(row: ProcurementContract): ProcurementAlert[] {
  const alerts: ProcurementAlert[] = []
  if (!row.evidenceAvailable || row.ppraCompliance === 'missing_evidence') {
    alerts.push({
      code: 'PPRA_EVIDENCE',
      message: 'Missing PPRA evidence',
      severity: 'critical',
    })
  }
  if (row.completionStatus === 'overdue' || row.contractStatus === 'overdue') {
    alerts.push({
      code: 'OVERDUE',
      message: 'Procurement completion overdue',
      severity: 'critical',
    })
  }
  if (row.value >= PROCUREMENT_HIGH_VALUE_THRESHOLD_PKR) {
    alerts.push({
      code: 'HIGH_VALUE',
      message: `Value at or above demonstration threshold (${formatCurrencyPkr(PROCUREMENT_HIGH_VALUE_THRESHOLD_PKR)})`,
      severity: 'warning',
    })
  }
  if (row.method === 'single_source' && row.ppraCompliance !== 'compliant') {
    alerts.push({
      code: 'SINGLE_SOURCE',
      message: 'Single-source procurement requires compliance attention',
      severity: 'warning',
    })
  }
  if (!row.title || !row.vendor) {
    alerts.push({
      code: 'INCOMPLETE',
      message: 'Incomplete procurement record',
      severity: 'warning',
    })
  }
  return alerts
}

export interface AccountabilityExceptionSummary {
  overdueProcurement: number
  openAuditParas: number
  overduePac: number
  upcomingHearings: number
  overdueCompliance: number
  blockedPrivatization: number
  awaitingTransformationApproval: number
}

export interface AuditService {
  getAuditRegisters(organizationId?: string): Promise<AuditRegister[]>
  getAuditRegister(id: string): Promise<AuditRegister>
  getAuditParas(organizationId?: string): Promise<AuditPara[]>
  getAuditPara(id: string): Promise<AuditPara>
  createAuditPara(payload: Omit<AuditPara, 'id'> & { id?: string }): Promise<AuditPara>
  updateAuditPara(id: string, patch: Partial<AuditPara>): Promise<AuditPara>
  getPacObservations(organizationId?: string): Promise<PacObservation[]>
  getPacObservation(id: string): Promise<PacObservation>
  createPacObservation(payload: Omit<PacObservation, 'id'> & { id?: string }): Promise<PacObservation>
  updatePacObservation(id: string, patch: Partial<PacObservation>): Promise<PacObservation>
  getProcurementAnnualPlans(organizationId?: string): Promise<ProcurementAnnualPlan[]>
  getProcurementAnnualPlan(id: string): Promise<ProcurementAnnualPlan>
  createProcurementAnnualPlan(
    payload: Omit<ProcurementAnnualPlan, 'id'> & { id?: string },
  ): Promise<ProcurementAnnualPlan>
  updateProcurementAnnualPlan(
    id: string,
    patch: Partial<ProcurementAnnualPlan>,
  ): Promise<ProcurementAnnualPlan>
  getProcurement(organizationId?: string): Promise<ProcurementContract[]>
  getProcurementPaged(
    organizationId: string | undefined,
    query?: ListQuery & { method?: string; status?: string },
  ): Promise<PagedResult<ProcurementContract>>
  getProcurementById(id: string): Promise<ProcurementContract>
  createProcurement(payload: Omit<ProcurementContract, 'id'> & { id?: string }): Promise<ProcurementContract>
  updateProcurement(id: string, patch: Partial<ProcurementContract>): Promise<ProcurementContract>
  createAuditRegister(payload: Omit<AuditRegister, 'id'> & { id?: string }): Promise<AuditRegister>
  getContracts(organizationId?: string): Promise<ContractRecord[]>
  getContract(id: string): Promise<ContractRecord>
  getHistory(recordType: string, recordId: string): Promise<AccountabilityHistoryEvent[]>
  getExceptionSummary(organizationId?: string): Promise<AccountabilityExceptionSummary>
}

export interface LitigationService {
  getCases(
    organizationId?: string,
    filters?: { court?: string; status?: string; search?: string },
  ): Promise<LitigationCase[]>
  getCase(id: string): Promise<LitigationCase>
  createCase(payload: Omit<LitigationCase, 'id'> & { id?: string }): Promise<LitigationCase>
  updateCase(id: string, patch: Partial<LitigationCase>): Promise<LitigationCase>
  addCaseEvent(caseId: string, payload: Omit<LitigationCaseEvent, 'id' | 'recordId' | 'organizationId' | 'moduleId' | 'caseId' | 'assuranceState' | 'isDummyDemonstrationData'>): Promise<LitigationCaseEvent>
  getCaseEvents(caseId: string): Promise<LitigationCaseEvent[]>
  getCaseStages(caseId: string): Promise<LitigationStageRecord[]>
  saveCaseStage(
    caseId: string,
    stage: LitigationStageId,
    payload: Record<string, string | number | boolean | undefined>,
  ): Promise<LitigationStageRecord>
  submitCaseStage(caseId: string, stage: LitigationStageId): Promise<LitigationStageRecord>
  reviewCaseStage(
    caseId: string,
    stage: LitigationStageId,
    decision: 'verify' | 'return',
    comments?: string,
  ): Promise<LitigationStageRecord>
  getStageSummary(organizationId?: string): Promise<LitigationStageSummary[]>
  getContinuousSummary(organizationId?: string): Promise<ContinuousRegisterSummary>
}

const litigationEvents = new Map<string, LitigationCaseEvent[]>()
const litigationStages = new Map<string, LitigationStageRecord[]>()

function eventDate(offsetDays: number) {
  const date = new Date(`${DEMO_AS_OF_DATE}T00:00:00.000Z`)
  date.setUTCDate(date.getUTCDate() + offsetDays)
  return date.toISOString().slice(0, 10)
}

function daysSince(from: string | undefined) {
  if (!from) return 999
  const parsed = Date.parse(from)
  const today = Date.parse(DEMO_AS_OF_DATE)
  if (Number.isNaN(parsed) || Number.isNaN(today)) return 999
  return Math.floor((today - parsed) / 86_400_000)
}

function caseAssuranceSeed(index: number): LitigationCase['assuranceState'] {
  if (index % 7 === 0) return 'clarification_open'
  if (index % 5 === 0) return 'published_to_moip'
  if (index % 3 === 0) return 'submitted'
  return 'moip_acknowledged'
}

function normalizeLitigationStage(value: string | undefined): LitigationStageId {
  const normalized = (value ?? '').toLowerCase().replaceAll('&', ' ').replaceAll('-', ' ').replaceAll(' ', '_')
  if (LITIGATION_STAGE_ORDER.includes(normalized as LitigationStageId)) {
    return normalized as LitigationStageId
  }
  if (normalized.includes('appeal')) return LITIGATION_STAGE.APPEAL_REVIEW
  if (normalized.includes('judg')) return LITIGATION_STAGE.JUDGMENT
  if (normalized.includes('settle')) return LITIGATION_STAGE.SETTLEMENT
  if (normalized.includes('evidence') || normalized.includes('argument')) return LITIGATION_STAGE.EVIDENCE_ARGUMENTS
  if (normalized.includes('order') || normalized.includes('stay')) return LITIGATION_STAGE.INTERIM_ORDERS
  if (normalized.includes('hearing') || normalized === 'active' || normalized === 'stayed') return LITIGATION_STAGE.HEARINGS
  if (normalized.includes('plead')) return LITIGATION_STAGE.PLEADINGS
  if (normalized.includes('file')) return LITIGATION_STAGE.FILING
  if (normalized.includes('closed') || normalized.includes('disposed')) return LITIGATION_STAGE.CLOSURE
  return LITIGATION_STAGE.INTAKE
}

function hydrateCase(row: LitigationCase, index = 0): LitigationCase {
  const changedAt = row.lastChangedAt ?? eventDate(-((index % 12) + 1))
  const submittedAt = row.lastSubmittedAt ?? changedAt
  const verifiedAt = row.lastVerifiedAt ?? (index % 3 === 0 ? undefined : eventDate(-(index % 8)))
  return {
    ...row,
    caseStage: row.caseStage ?? LITIGATION_STAGE_LABEL[normalizeLitigationStage(row.status)],
    filedDate: row.filedDate ?? eventDate(-180 - index * 3),
    receivedDate: row.receivedDate ?? eventDate(-175 - index * 3),
    legalOwner: row.legalOwner ?? 'SOE Legal Cell',
    currentExposurePkr: row.currentExposurePkr ?? row.amountInvolved ?? 0,
    bestCaseExposurePkr: row.bestCaseExposurePkr ?? Math.round((row.amountInvolved ?? 0) * 0.35),
    worstCaseExposurePkr: row.worstCaseExposurePkr ?? Math.round((row.amountInvolved ?? 0) * 1.25),
    probabilityOfLoss: row.probabilityOfLoss ?? (index % 4 === 0 ? 'probable' : 'possible'),
    accountingTreatment: row.accountingTreatment ?? (index % 4 === 0 ? 'provisioned' : 'disclosed'),
    confidentiality: row.confidentiality ?? 'sensitive',
    nextAction: row.nextAction ?? (row.nextHearing ? 'Prepare hearing brief' : 'Await court order'),
    actionDueDate: row.actionDueDate ?? row.nextHearing,
    latestEventTitle: row.latestEventTitle ?? (row.nextHearing ? 'Next hearing scheduled' : 'Case status updated'),
    latestEventAt: row.latestEventAt ?? changedAt,
    lastChangedAt: changedAt,
    lastSubmittedAt: submittedAt,
    lastVerifiedAt: verifiedAt,
    assuranceState: row.assuranceState ?? caseAssuranceSeed(index),
    version: row.version ?? index + 1,
  }
}

function caseStagePayload(row: LitigationCase, stage: LitigationStageId) {
  if (stage === LITIGATION_STAGE.INTAKE) {
    return {
      noticeReceivedAt: row.receivedDate,
      legalOwner: row.legalOwner,
      petitioner: row.petitioner,
      respondent: row.respondent,
      nature: row.nature,
      confidentiality: row.confidentiality,
    }
  }
  if (stage === LITIGATION_STAGE.FILING) {
    return {
      filedAt: row.filedDate,
      court: row.court,
      caseNumber: row.caseNumber,
      counsel: row.lawyer,
    }
  }
  if (stage === LITIGATION_STAGE.HEARINGS) {
    return {
      nextHearing: row.nextHearing,
      nextAction: row.nextAction,
      actionDueDate: row.actionDueDate,
    }
  }
  if (stage === LITIGATION_STAGE.EVIDENCE_ARGUMENTS) {
    return {
      evidenceAvailable: row.evidenceAvailable,
      relatedAssetId: row.relatedAssetId,
      relatedAuditParaId: row.relatedAuditParaId,
    }
  }
  if (stage === LITIGATION_STAGE.JUDGMENT || stage === LITIGATION_STAGE.SETTLEMENT) {
    return {
      currentExposurePkr: row.currentExposurePkr,
      bestCaseExposurePkr: row.bestCaseExposurePkr,
      worstCaseExposurePkr: row.worstCaseExposurePkr,
      accountingTreatment: row.accountingTreatment,
      probabilityOfLoss: row.probabilityOfLoss,
    }
  }
  if (stage === LITIGATION_STAGE.CLOSURE) {
    return {
      status: row.status,
      completedAt: row.status === 'disposed' ? row.lastChangedAt : undefined,
    }
  }
  return {
    nextAction: row.nextAction,
    actionDueDate: row.actionDueDate,
    currentExposurePkr: row.currentExposurePkr,
  }
}

function ensureCaseStages(row: LitigationCase, index = 0) {
  const existing = litigationStages.get(row.id)
  if (existing?.length === LITIGATION_STAGE_ORDER.length) return existing

  const c = hydrateCase(row, index)
  const activeStage = normalizeLitigationStage(c.caseStage ?? c.status)
  const activeIndex = LITIGATION_STAGE_ORDER.indexOf(activeStage)
  const records = LITIGATION_STAGE_ORDER.map((stage, stageIndex): LitigationStageRecord => {
    const isPast = stageIndex < activeIndex
    const isActive = stageIndex === activeIndex
    return {
      id: `lit-stage-${c.id}-${stage}`,
      caseId: c.id,
      organizationId: c.organizationId,
      stage,
      status: isPast
        ? LITIGATION_STAGE_STATUS.VERIFIED
        : isActive
          ? c.assuranceState === 'returned'
            ? LITIGATION_STAGE_STATUS.RETURNED
            : c.assuranceState === 'moip_acknowledged'
              ? LITIGATION_STAGE_STATUS.VERIFIED
              : LITIGATION_STAGE_STATUS.SUBMITTED
          : LITIGATION_STAGE_STATUS.NOT_STARTED,
      startedAt: isPast || isActive ? c.filedDate ?? c.receivedDate ?? c.lastChangedAt : undefined,
      completedAt: isPast ? c.lastVerifiedAt ?? c.lastSubmittedAt : undefined,
      updatedAt: isPast || isActive ? c.lastChangedAt ?? DEMO_AS_OF_DATE : DEMO_AS_OF_DATE,
      submittedAt: isActive ? c.lastSubmittedAt : isPast ? c.lastVerifiedAt ?? c.lastSubmittedAt : undefined,
      verifiedAt: isPast || c.assuranceState === 'moip_acknowledged' ? c.lastVerifiedAt : undefined,
      evidenceComplete: stage === LITIGATION_STAGE.EVIDENCE_ARGUMENTS ? c.evidenceAvailable : stageIndex <= activeIndex,
      payload: caseStagePayload(c, stage),
      isDummyDemonstrationData: true,
    }
  })
  litigationStages.set(c.id, records)
  return records
}

function ensureCaseEvents(row: LitigationCase) {
  const existing = litigationEvents.get(row.id)
  if (existing && existing[0]?.title === row.latestEventTitle) {
    return existing
  }
  const c = hydrateCase(row)
  const events: LitigationCaseEvent[] = [
    {
      id: `lit-${c.id}-latest`,
      recordId: c.id,
      caseId: c.id,
      organizationId: c.organizationId,
      moduleId: MODULE.LITIGATION,
      occurredAt: c.latestEventAt ?? c.lastChangedAt ?? DEMO_AS_OF_DATE,
      effectiveAt: c.latestEventAt ?? c.lastChangedAt,
      actorRole: ROLE.LEGAL_OFFICER,
      actorName: 'SOE Legal Officer',
      eventType: c.nextHearing ? 'hearing' : 'correction',
      stage: normalizeLitigationStage(c.caseStage ?? c.status),
      title: c.latestEventTitle ?? 'Case updated',
      detail: c.nextAction,
      nextHearing: c.nextHearing,
      assuranceState: c.assuranceState ?? 'submitted',
      isMaterial: true,
      isDummyDemonstrationData: true,
    },
    {
      id: `lit-${c.id}-created`,
      recordId: c.id,
      caseId: c.id,
      organizationId: c.organizationId,
      moduleId: MODULE.LITIGATION,
      occurredAt: c.filedDate ?? eventDate(-180),
      effectiveAt: c.filedDate,
      actorRole: ROLE.LEGAL_OFFICER,
      actorName: 'SOE Legal Officer',
      eventType: 'case_filed',
      stage: LITIGATION_STAGE.FILING,
      title: 'Case opened in litigation register',
      detail: `${c.petitioner} vs ${c.respondent}`,
      assuranceState: 'submitted',
      isMaterial: true,
      isDummyDemonstrationData: true,
    },
  ]
  litigationEvents.set(c.id, events)
  return events
}

export interface ComplianceService {
  getComplianceItems(organizationId?: string): Promise<ComplianceItem[]>
  getComplianceItem(id: string): Promise<ComplianceItem>
  createComplianceItem(payload: Omit<ComplianceItem, 'id'> & { id?: string }): Promise<ComplianceItem>
  updateComplianceItem(id: string, patch: Partial<ComplianceItem>): Promise<ComplianceItem>
}

export const mockAuditService: AuditService = {
  async getAuditRegisters(organizationId) {
    let items = [...db.auditRegisters]
    if (organizationId) items = items.filter((a) => a.organizationId === organizationId)
    return simulateLatency(items)
  },
  async getAuditRegister(id) {
    const row = db.auditRegisters.find((a) => a.id === id)
    if (!row) throw new AppError('Audit register not found', 'NOT_FOUND')
    return simulateLatency(row)
  },
  async createAuditRegister(payload) {
    const id = payload.id ?? `audreg-new-${Date.now()}`
    if (!payload.auditPeriod?.trim()) throw new AppError('Audit period is required', 'VALIDATION')
    if (!payload.auditor?.trim()) throw new AppError('Auditor is required', 'VALIDATION')
    if (payload.totalAmountInvolved != null && payload.totalAmountInvolved < 0) {
      throw new AppError('Amount cannot be negative', 'VALIDATION')
    }
    const next: AuditRegister = { ...payload, id, isDummyDemonstrationData: true }
    db.auditRegisters.push(next)
    return simulateMutation(next)
  },
  async getAuditParas(organizationId) {
    let items = [...db.auditParas]
    if (organizationId) items = items.filter((a) => a.organizationId === organizationId)
    return simulateLatency(items)
  },
  async getAuditPara(id) {
    const row = db.auditParas.find((a) => a.id === id)
    if (!row) throw new AppError('Audit para not found', 'NOT_FOUND')
    return simulateLatency(row)
  },
  async updateAuditPara(id, patch) {
    const idx = db.auditParas.findIndex((a) => a.id === id)
    if (idx < 0) throw new AppError('Audit para not found', 'NOT_FOUND')
    const current = db.auditParas[idx]
    if (patch.amountRecovered !== undefined && patch.amountRecovered < 0) {
      throw new AppError('Recovery cannot be negative', 'VALIDATION')
    }
    if (
      patch.amountRecovered !== undefined &&
      patch.amountRecovered > current.amountInvolved
    ) {
      throw new AppError(
        'Recovery exceeds amount involved — explicit override not configured in prototype',
        'VALIDATION',
      )
    }
    if (
      (patch.status === AUDIT_PARA_STATUS.SETTLED ||
        patch.status === AUDIT_PARA_STATUS.CLOSED) &&
      !(patch.evidenceAvailable ?? current.evidenceAvailable)
    ) {
      throw new AppError('Settlement/closure requires evidence', 'VALIDATION')
    }
    const next = { ...current, ...patch, id }
    if (patch.amountRecovered !== undefined) {
      if (next.amountRecovered >= next.amountInvolved) {
        next.recoveryStatus = RECOVERY_STATUS.COMPLETED
      } else if (next.amountRecovered > 0) {
        next.recoveryStatus = RECOVERY_STATUS.PARTIAL
      }
    }
    db.auditParas[idx] = next
    db.accountabilityHistory.push({
      id: `ah-${id}-${Date.now()}`,
      organizationId: next.organizationId,
      recordType: 'audit_para',
      recordId: id,
      occurredAt: new Date().toISOString(),
      title: `Para updated (${patch.status ?? next.status})`,
      actor: 'demo.user',
    })
    return simulateMutation(db.auditParas[idx])
  },
  async createAuditPara(payload) {
    const id = payload.id ?? `para-new-${Date.now()}`
    if (!payload.title?.trim()) throw new AppError('Title is required', 'VALIDATION')
    if (!payload.auditId?.trim()) throw new AppError('Audit register reference is required', 'VALIDATION')
    if (payload.amountInvolved != null && payload.amountInvolved < 0) {
      throw new AppError('Amount cannot be negative', 'VALIDATION')
    }
    const next: AuditPara = {
      ...payload,
      id,
      title: payload.title.trim(),
      amountRecovered: payload.amountRecovered ?? 0,
      evidenceAvailable: payload.evidenceAvailable ?? false,
      isDummyDemonstrationData: true,
    }
    db.auditParas.push(next)
    db.accountabilityHistory.push({
      id: `ah-${id}-${Date.now()}`,
      organizationId: next.organizationId,
      recordType: 'audit_para',
      recordId: id,
      occurredAt: new Date().toISOString(),
      title: 'Audit para created',
      actor: 'demo.user',
    })
    return simulateMutation(next)
  },
  async getPacObservations(organizationId) {
    let items = [...db.pacObservations]
    if (organizationId) items = items.filter((p) => p.organizationId === organizationId)
    return simulateLatency(items)
  },
  async getPacObservation(id) {
    const row = db.pacObservations.find((p) => p.id === id)
    if (!row) throw new AppError('PAC observation not found', 'NOT_FOUND')
    return simulateLatency(row)
  },
  async createPacObservation(payload) {
    const id = payload.id ?? `pac-new-${Date.now()}`
    if (!payload.observation?.trim()) throw new AppError('Observation is required', 'VALIDATION')
    if (!payload.auditParaId?.trim()) throw new AppError('Audit para link is required', 'VALIDATION')
    const next: PacObservation = {
      ...payload,
      id,
      evidenceAvailable: payload.evidenceAvailable ?? false,
      isDummyDemonstrationData: true,
    }
    db.pacObservations.push(next)
    return simulateMutation(next)
  },
  async updatePacObservation(id, patch) {
    const idx = db.pacObservations.findIndex((p) => p.id === id)
    if (idx < 0) throw new AppError('PAC observation not found', 'NOT_FOUND')
    db.pacObservations[idx] = { ...db.pacObservations[idx], ...patch, id }
    return simulateMutation(db.pacObservations[idx])
  },
  async getProcurementAnnualPlans(organizationId) {
    let items = [...db.procurementAnnualPlans]
    if (organizationId) items = items.filter((p) => p.organizationId === organizationId)
    return simulateLatency(items)
  },
  async getProcurementAnnualPlan(id) {
    const row = db.procurementAnnualPlans.find((p) => p.id === id)
    if (!row) throw new AppError('Procurement plan not found', 'NOT_FOUND')
    return simulateLatency(row)
  },
  async createProcurementAnnualPlan(payload) {
    const id = payload.id ?? `pplan-new-${Date.now()}`
    if (!payload.title?.trim()) throw new AppError('Title is required', 'VALIDATION')
    if (payload.estimatedValue != null && payload.estimatedValue < 0) {
      throw new AppError('Estimated value cannot be negative', 'VALIDATION')
    }
    const next: ProcurementAnnualPlan = { ...payload, id, isDummyDemonstrationData: true }
    db.procurementAnnualPlans.push(next)
    return simulateMutation(next)
  },
  async updateProcurementAnnualPlan(id, patch) {
    const idx = db.procurementAnnualPlans.findIndex((p) => p.id === id)
    if (idx < 0) throw new AppError('Procurement plan not found', 'NOT_FOUND')
    db.procurementAnnualPlans[idx] = { ...db.procurementAnnualPlans[idx], ...patch, id }
    return simulateMutation(db.procurementAnnualPlans[idx])
  },
  async getProcurement(organizationId) {
    let items = [...db.procurement]
    if (organizationId) items = items.filter((p) => p.organizationId === organizationId)
    return simulateLatency(items)
  },
  async getProcurementPaged(organizationId, query) {
    let items = [...db.procurement]
    if (organizationId) items = items.filter((p) => p.organizationId === organizationId)
    if (query?.method) items = items.filter((p) => p.method === query.method)
    if (query?.status) items = items.filter((p) => p.contractStatus === query.status)
    if (query?.search) {
      const q = query.search.toLowerCase()
      items = items.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.vendor.toLowerCase().includes(q) ||
          p.id.toLowerCase().includes(q),
      )
    }
    return simulateLatency(pageSlice(items, query))
  },
  async getProcurementById(id) {
    const row = db.procurement.find((p) => p.id === id)
    if (!row) throw new AppError('Procurement not found', 'NOT_FOUND')
    return simulateLatency(row)
  },
  async createProcurement(payload) {
    const id = payload.id ?? `proc-new-${Date.now()}`
    if (!payload.title?.trim()) throw new AppError('Title is required', 'VALIDATION')
    if (!payload.vendor?.trim()) throw new AppError('Vendor is required', 'VALIDATION')
    if (payload.value != null && payload.value < 0) {
      throw new AppError('Value cannot be negative', 'VALIDATION')
    }
    const next: ProcurementContract = { ...payload, id, isDummyDemonstrationData: true }
    db.procurement.push(next)
    db.accountabilityHistory.push({
      id: `ah-proc-${id}-${Date.now()}`,
      organizationId: next.organizationId,
      recordType: 'procurement',
      recordId: id,
      occurredAt: new Date().toISOString(),
      title: 'Procurement record created',
      actor: 'demo.user',
    })
    return simulateMutation(next)
  },
  async updateProcurement(id, patch) {
    const idx = db.procurement.findIndex((p) => p.id === id)
    if (idx < 0) throw new AppError('Procurement not found', 'NOT_FOUND')
    if (patch.value !== undefined && patch.value < 0) {
      throw new AppError('Value cannot be negative', 'VALIDATION')
    }
    db.procurement[idx] = { ...db.procurement[idx], ...patch, id }
    return simulateMutation(db.procurement[idx])
  },
  async getContracts(organizationId) {
    let items = [...db.contracts]
    if (organizationId) items = items.filter((c) => c.organizationId === organizationId)
    return simulateLatency(items)
  },
  async getContract(id) {
    const row = db.contracts.find((c) => c.id === id)
    if (!row) throw new AppError('Contract not found', 'NOT_FOUND')
    return simulateLatency(row)
  },
  async getHistory(recordType, recordId) {
    return simulateLatency(
      db.accountabilityHistory
        .filter((h) => h.recordType === recordType && h.recordId === recordId)
        .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)),
    )
  },
  async getExceptionSummary(organizationId) {
    const orgFilter = (oid: string) => !organizationId || oid === organizationId
    const upcomingCutoff = '2026-09-08'
    return simulateLatency({
      overdueProcurement: db.procurement.filter(
        (p) => orgFilter(p.organizationId) && p.completionStatus === 'overdue',
      ).length,
      openAuditParas: db.auditParas.filter(
        (p) =>
          orgFilter(p.organizationId) &&
          p.status !== AUDIT_PARA_STATUS.SETTLED &&
          p.status !== AUDIT_PARA_STATUS.CLOSED,
      ).length,
      overduePac: db.pacObservations.filter(
        (p) => orgFilter(p.organizationId) && p.status === 'overdue',
      ).length,
      upcomingHearings: db.litigation.filter(
        (c) =>
          orgFilter(c.organizationId) &&
          c.nextHearing &&
          c.nextHearing >= DEMO_AS_OF_DATE &&
          c.nextHearing <= upcomingCutoff,
      ).length,
      overdueCompliance: db.compliance.filter(
        (c) => orgFilter(c.organizationId) && c.status === 'overdue',
      ).length,
      blockedPrivatization: db.privatizationMilestones.filter(
        (m) => orgFilter(m.organizationId) && m.status === 'blocked',
      ).length,
      awaitingTransformationApproval: db.transformationInitiatives.filter(
        (t) =>
          orgFilter(t.organizationId) && t.decisionStatus === 'awaiting_approval',
      ).length,
    })
  },
}

export const mockLitigationService: LitigationService = {
  async getCases(organizationId, filters) {
    let items = db.litigation.map((item, index) => hydrateCase(item, index))
    if (organizationId) items = items.filter((c) => c.organizationId === organizationId)
    if (filters?.court) items = items.filter((c) => c.court === filters.court)
    if (filters?.status) items = items.filter((c) => c.status === filters.status)
    if (filters?.search) {
      const q = filters.search.toLowerCase()
      items = items.filter(
        (c) =>
          c.caseNumber.toLowerCase().includes(q) ||
          c.petitioner.toLowerCase().includes(q) ||
          c.respondent.toLowerCase().includes(q),
      )
    }
    items.sort((a, b) => (a.nextHearing ?? '').localeCompare(b.nextHearing ?? ''))
    return simulateLatency(items)
  },
  async getCase(id) {
    const idx = db.litigation.findIndex((c) => c.id === id)
    const row = idx >= 0 ? db.litigation[idx] : undefined
    if (!row) throw new AppError('Litigation case not found', 'NOT_FOUND')
    const hydrated = hydrateCase(row, idx)
    ensureCaseEvents(hydrated)
    return simulateLatency(hydrated)
  },
  async createCase(payload) {
    const id = payload.id ?? `lit-new-${Date.now()}`
    if (!payload.caseNumber?.trim()) throw new AppError('Case number is required', 'VALIDATION')
    if (!payload.court?.trim()) throw new AppError('Court is required', 'VALIDATION')
    if (payload.amountInvolved != null && payload.amountInvolved < 0) {
      throw new AppError('Amount cannot be negative', 'VALIDATION')
    }
    const next: LitigationCase = hydrateCase(
      {
        ...payload,
        id,
        lastChangedAt: DEMO_AS_OF_DATE,
        lastSubmittedAt: DEMO_AS_OF_DATE,
        latestEventAt: DEMO_AS_OF_DATE,
        latestEventTitle: 'Case submitted to SOE reviewer',
        assuranceState: 'submitted',
        version: 1,
        isDummyDemonstrationData: true,
      },
      db.litigation.length,
    )
    db.litigation.push(next)
    ensureCaseEvents(next)
    ensureCaseStages(next, db.litigation.length - 1)
    return simulateMutation(next)
  },
  async updateCase(id, patch) {
    const idx = db.litigation.findIndex((c) => c.id === id)
    if (idx < 0) throw new AppError('Litigation case not found', 'NOT_FOUND')
    if (patch.amountInvolved !== undefined && patch.amountInvolved < 0) {
      throw new AppError('Amount cannot be negative', 'VALIDATION')
    }
    if (patch.nextHearing && Number.isNaN(Date.parse(patch.nextHearing))) {
      throw new AppError('Invalid hearing date', 'VALIDATION')
    }
    const current = hydrateCase(db.litigation[idx], idx)
    const next = hydrateCase(
      {
        ...current,
        ...patch,
        id,
        currentExposurePkr: patch.currentExposurePkr ?? patch.amountInvolved ?? current.currentExposurePkr,
        latestEventAt: DEMO_AS_OF_DATE,
        latestEventTitle: 'Case update submitted to SOE reviewer',
        lastChangedAt: DEMO_AS_OF_DATE,
        lastSubmittedAt: DEMO_AS_OF_DATE,
        assuranceState: 'submitted',
        version: (current.version ?? 1) + 1,
      },
      idx,
    )
    db.litigation[idx] = next
    const events = ensureCaseEvents(next)
    ensureCaseStages(next, idx)
    events.unshift({
      id: `lit-${id}-${Date.now()}`,
      recordId: id,
      caseId: id,
      organizationId: next.organizationId,
      moduleId: MODULE.LITIGATION,
      occurredAt: DEMO_AS_OF_DATE,
      effectiveAt: DEMO_AS_OF_DATE,
      actorRole: ROLE.LEGAL_OFFICER,
      actorName: 'SOE Legal Officer',
      eventType: 'correction',
      stage: normalizeLitigationStage(next.caseStage ?? next.status),
      title: 'Case update submitted',
      detail: 'Continuous litigation update awaiting SOE reviewer verification.',
      nextHearing: next.nextHearing,
      exposureDeltaPkr:
        next.currentExposurePkr != null && current.currentExposurePkr != null
          ? next.currentExposurePkr - current.currentExposurePkr
          : undefined,
      assuranceState: 'submitted',
      isMaterial: true,
      isDummyDemonstrationData: true,
    })
    return simulateMutation(db.litigation[idx])
  },
  async addCaseEvent(caseId, payload) {
    const idx = db.litigation.findIndex((c) => c.id === caseId)
    if (idx < 0) throw new AppError('Litigation case not found', 'NOT_FOUND')
    const current = hydrateCase(db.litigation[idx], idx)
    const next: LitigationCaseEvent = {
      ...payload,
      id: `lit-event-${caseId}-${Date.now()}`,
      recordId: caseId,
      caseId,
      organizationId: current.organizationId,
      moduleId: MODULE.LITIGATION,
      assuranceState: 'submitted',
      isMaterial: payload.isMaterial ?? true,
      isDummyDemonstrationData: true,
    }
    const events = ensureCaseEvents(current)
    events.unshift(next)
    db.litigation[idx] = hydrateCase(
      {
        ...current,
        nextHearing: payload.nextHearing ?? current.nextHearing,
        latestEventAt: payload.occurredAt,
        latestEventTitle: payload.title,
        lastChangedAt: payload.occurredAt,
        lastSubmittedAt: payload.occurredAt,
        assuranceState: 'submitted',
        version: (current.version ?? 1) + 1,
      },
      idx,
    )
    ensureCaseStages(db.litigation[idx], idx)
    return simulateMutation(next)
  },
  async getCaseEvents(caseId) {
    const idx = db.litigation.findIndex((c) => c.id === caseId)
    if (idx < 0) throw new AppError('Litigation case not found', 'NOT_FOUND')
    return simulateLatency(ensureCaseEvents(hydrateCase(db.litigation[idx], idx)))
  },
  async getCaseStages(caseId) {
    const idx = db.litigation.findIndex((c) => c.id === caseId)
    if (idx < 0) throw new AppError('Litigation case not found', 'NOT_FOUND')
    return simulateLatency(ensureCaseStages(db.litigation[idx], idx))
  },
  async saveCaseStage(caseId, stage, payload) {
    const idx = db.litigation.findIndex((c) => c.id === caseId)
    if (idx < 0) throw new AppError('Litigation case not found', 'NOT_FOUND')
    const caseRow = hydrateCase(db.litigation[idx], idx)
    const stages = ensureCaseStages(caseRow, idx)
    const current = stages.find((item) => item.stage === stage)
    if (!current) throw new AppError('Litigation stage not found', 'NOT_FOUND')
    const next: LitigationStageRecord = {
      ...current,
      status:
        current.status === LITIGATION_STAGE_STATUS.VERIFIED
          ? LITIGATION_STAGE_STATUS.IN_PROGRESS
          : current.status,
      startedAt: current.startedAt ?? DEMO_AS_OF_DATE,
      updatedAt: DEMO_AS_OF_DATE,
      evidenceComplete: Boolean(payload.evidenceAvailable ?? current.evidenceComplete),
      payload: {
        ...current.payload,
        ...payload,
      },
    }
    litigationStages.set(
      caseId,
      stages.map((item) => (item.stage === stage ? next : item)),
    )
    db.litigation[idx] = hydrateCase(
      {
        ...caseRow,
        caseStage: LITIGATION_STAGE_LABEL[stage],
        lastChangedAt: DEMO_AS_OF_DATE,
        latestEventAt: DEMO_AS_OF_DATE,
        latestEventTitle: `${LITIGATION_STAGE_LABEL[stage]} stage updated`,
        assuranceState: 'draft',
        version: (caseRow.version ?? 1) + 1,
      },
      idx,
    )
    return simulateMutation(next)
  },
  async submitCaseStage(caseId, stage) {
    const idx = db.litigation.findIndex((c) => c.id === caseId)
    if (idx < 0) throw new AppError('Litigation case not found', 'NOT_FOUND')
    const caseRow = hydrateCase(db.litigation[idx], idx)
    const stages = ensureCaseStages(caseRow, idx)
    const current = stages.find((item) => item.stage === stage)
    if (!current) throw new AppError('Litigation stage not found', 'NOT_FOUND')
    const next: LitigationStageRecord = {
      ...current,
      status: LITIGATION_STAGE_STATUS.SUBMITTED,
      updatedAt: DEMO_AS_OF_DATE,
      submittedAt: DEMO_AS_OF_DATE,
    }
    litigationStages.set(caseId, stages.map((item) => (item.stage === stage ? next : item)))
    const events = ensureCaseEvents(caseRow)
    events.unshift({
      id: `lit-stage-submit-${caseId}-${stage}-${Date.now()}`,
      recordId: caseId,
      caseId,
      organizationId: caseRow.organizationId,
      moduleId: MODULE.LITIGATION,
      occurredAt: DEMO_AS_OF_DATE,
      effectiveAt: DEMO_AS_OF_DATE,
      actorRole: ROLE.LEGAL_OFFICER,
      actorName: 'SOE Legal Officer',
      eventType: 'correction',
      stage,
      title: `${LITIGATION_STAGE_LABEL[stage]} stage submitted`,
      detail: 'Stage-wise litigation update awaiting SOE reviewer verification.',
      assuranceState: 'submitted',
      isMaterial: true,
      isDummyDemonstrationData: true,
    })
    db.litigation[idx] = hydrateCase(
      {
        ...caseRow,
        caseStage: LITIGATION_STAGE_LABEL[stage],
        lastChangedAt: DEMO_AS_OF_DATE,
        lastSubmittedAt: DEMO_AS_OF_DATE,
        latestEventAt: DEMO_AS_OF_DATE,
        latestEventTitle: `${LITIGATION_STAGE_LABEL[stage]} stage submitted`,
        assuranceState: 'submitted',
        version: (caseRow.version ?? 1) + 1,
      },
      idx,
    )
    return simulateMutation(next)
  },
  async reviewCaseStage(caseId, stage, decision, comments) {
    const idx = db.litigation.findIndex((c) => c.id === caseId)
    if (idx < 0) throw new AppError('Litigation case not found', 'NOT_FOUND')
    const caseRow = hydrateCase(db.litigation[idx], idx)
    const stages = ensureCaseStages(caseRow, idx)
    const current = stages.find((item) => item.stage === stage)
    if (!current) throw new AppError('Litigation stage not found', 'NOT_FOUND')
    const verified = decision === 'verify'
    const next: LitigationStageRecord = {
      ...current,
      status: verified ? LITIGATION_STAGE_STATUS.VERIFIED : LITIGATION_STAGE_STATUS.RETURNED,
      updatedAt: DEMO_AS_OF_DATE,
      verifiedAt: verified ? DEMO_AS_OF_DATE : current.verifiedAt,
      reviewerComments: comments,
    }
    litigationStages.set(caseId, stages.map((item) => (item.stage === stage ? next : item)))
    const events = ensureCaseEvents(caseRow)
    events.unshift({
      id: `lit-stage-review-${caseId}-${stage}-${Date.now()}`,
      recordId: caseId,
      caseId,
      organizationId: caseRow.organizationId,
      moduleId: MODULE.LITIGATION,
      occurredAt: DEMO_AS_OF_DATE,
      effectiveAt: DEMO_AS_OF_DATE,
      actorRole: ROLE.SOE_CERTIFIER,
      actorName: 'SOE Reviewer',
      eventType: verified ? 'legal_opinion' : 'correction',
      stage,
      title: `${LITIGATION_STAGE_LABEL[stage]} stage ${verified ? 'verified' : 'returned'}`,
      detail: comments,
      assuranceState: verified ? 'soe_verified' : 'returned',
      isMaterial: true,
      isDummyDemonstrationData: true,
    })
    db.litigation[idx] = hydrateCase(
      {
        ...caseRow,
        caseStage: LITIGATION_STAGE_LABEL[stage],
        lastChangedAt: DEMO_AS_OF_DATE,
        lastVerifiedAt: verified ? DEMO_AS_OF_DATE : caseRow.lastVerifiedAt,
        latestEventAt: DEMO_AS_OF_DATE,
        latestEventTitle: `${LITIGATION_STAGE_LABEL[stage]} stage ${verified ? 'verified' : 'returned'}`,
        assuranceState: verified ? 'soe_verified' : 'returned',
        version: (caseRow.version ?? 1) + 1,
      },
      idx,
    )
    return simulateMutation(next)
  },
  async getStageSummary(organizationId) {
    const cases = db.litigation
      .map((item, index) => hydrateCase(item, index))
      .filter((item) => !organizationId || item.organizationId === organizationId)
    const summaries = LITIGATION_STAGE_ORDER.map((stage): LitigationStageSummary => {
      const stageCases = cases.filter((item) => normalizeLitigationStage(item.caseStage ?? item.status) === stage)
      const records = cases.flatMap((item, index) => ensureCaseStages(item, index)).filter((item) => item.stage === stage)
      return {
        stage,
        label: LITIGATION_STAGE_LABEL[stage],
        count: stageCases.length,
        exposurePkr: stageCases.reduce((sum, item) => sum + (item.currentExposurePkr ?? item.amountInvolved ?? 0), 0),
        stale: records.filter((item) => daysSince(item.submittedAt ?? item.updatedAt) > 15 && item.status !== LITIGATION_STAGE_STATUS.VERIFIED).length,
        pendingReview: records.filter((item) => item.status === LITIGATION_STAGE_STATUS.SUBMITTED).length,
      }
    })
    return simulateLatency(summaries)
  },
  async getContinuousSummary(organizationId) {
    const cases = db.litigation
      .map((item, index) => hydrateCase(item, index))
      .filter((item) => !organizationId || item.organizationId === organizationId)
    const active = cases.filter((item) => item.status !== 'closed')
    const upcomingCutoff = eventDate(30)
    const exposureDeltas = [...litigationEvents.values()]
      .flat()
      .filter((event) => !organizationId || event.organizationId === organizationId)
      .filter((event) => daysSince(event.occurredAt) <= 30)
      .reduce((sum, event) => sum + Math.abs(event.exposureDeltaPkr ?? 0), 0)
    const lastVerifiedAt = cases
      .map((item) => item.lastVerifiedAt)
      .filter(Boolean)
      .sort()
      .at(-1)
    const stageCounts = cases.reduce<NonNullable<ContinuousRegisterSummary['stageCounts']>>((acc, item) => {
      const stage = normalizeLitigationStage(item.caseStage ?? item.status)
      acc[stage] = (acc[stage] ?? 0) + 1
      return acc
    }, {})
    return simulateLatency({
      moduleId: MODULE.LITIGATION,
      cadence: 'event_based',
      activeRecords: active.filter((item) => item.status !== 'disposed').length,
      pendingSoeReview: cases.filter((item) => item.assuranceState === 'submitted').length,
      pendingMoipAcknowledgement: cases.filter((item) => item.assuranceState === 'published_to_moip').length,
      clarificationOpen: cases.filter((item) => item.assuranceState === 'clarification_open').length,
      staleRecords: cases.filter((item) => daysSince(item.lastSubmittedAt) > 15 && item.assuranceState !== 'moip_acknowledged').length,
      materialChanges30d: cases.filter((item) => daysSince(item.lastChangedAt) <= 30).length,
      dueSoon: cases.filter(
        (item) =>
          item.nextHearing &&
          item.nextHearing >= DEMO_AS_OF_DATE &&
          item.nextHearing <= upcomingCutoff,
      ).length,
      lastVerifiedAt,
      snapshotPeriodLabel: `FY2027 litigation schedule generated from live register · exposure delta ${formatCurrencyPkr(exposureDeltas)}`,
      asOfDate: DEMO_AS_OF_DATE,
      stageCounts,
    })
  },
}

export const mockComplianceService: ComplianceService = {
  async getComplianceItems(organizationId) {
    let items = [...db.compliance]
    if (organizationId) items = items.filter((c) => c.organizationId === organizationId)
    items.sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    return simulateLatency(items)
  },
  async getComplianceItem(id) {
    const row = db.compliance.find((c) => c.id === id)
    if (!row) throw new AppError('Compliance item not found', 'NOT_FOUND')
    return simulateLatency(row)
  },
  async createComplianceItem(payload) {
    const id = payload.id ?? `comp-new-${Date.now()}`
    if (!payload.area?.trim()) throw new AppError('Area is required', 'VALIDATION')
    if (!payload.dueDate?.trim()) throw new AppError('Due date is required', 'VALIDATION')
    const next: ComplianceItem = {
      ...payload,
      id,
      evidenceAvailable: payload.evidenceAvailable ?? false,
      verificationState: payload.verificationState ?? 'pending',
      isDummyDemonstrationData: true,
    }
    db.compliance.push(next)
    return simulateMutation(next)
  },
  async updateComplianceItem(id, patch) {
    const idx = db.compliance.findIndex((c) => c.id === id)
    if (idx < 0) throw new AppError('Compliance item not found', 'NOT_FOUND')
    if (patch.dueDate === '') {
      throw new AppError('Due date required for recurring obligations', 'VALIDATION')
    }
    db.compliance[idx] = { ...db.compliance[idx], ...patch, id }
    return simulateMutation(db.compliance[idx])
  },
}
