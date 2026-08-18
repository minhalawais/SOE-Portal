import {
  AUDIT_PARA_STATUS,
  DEMO_AS_OF_DATE,
  PROCUREMENT_HIGH_VALUE_THRESHOLD_PKR,
  RECOVERY_STATUS,
} from '@/constants'
import { db } from '@/mock-data'
import type {
  AccountabilityHistoryEvent,
  AuditPara,
  AuditRegister,
  ComplianceItem,
  ContractRecord,
  ListQuery,
  LitigationCase,
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
    let items = [...db.litigation]
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
    const row = db.litigation.find((c) => c.id === id)
    if (!row) throw new AppError('Litigation case not found', 'NOT_FOUND')
    return simulateLatency(row)
  },
  async createCase(payload) {
    const id = payload.id ?? `lit-new-${Date.now()}`
    if (!payload.caseNumber?.trim()) throw new AppError('Case number is required', 'VALIDATION')
    if (!payload.court?.trim()) throw new AppError('Court is required', 'VALIDATION')
    if (payload.amountInvolved != null && payload.amountInvolved < 0) {
      throw new AppError('Amount cannot be negative', 'VALIDATION')
    }
    const next: LitigationCase = { ...payload, id, isDummyDemonstrationData: true }
    db.litigation.push(next)
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
    db.litigation[idx] = { ...db.litigation[idx], ...patch, id }
    return simulateMutation(db.litigation[idx])
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
