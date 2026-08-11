import {
  PRIVATIZATION_STAGE_ORDER,
  PRIVATIZATION_STAGE_STATUS,
  type PrivatizationStage,
} from '@/constants'
import { db } from '@/mock-data'
import type {
  IndustrialPerformance,
  PrivatizationCase,
  PrivatizationMilestone,
  TransformationInitiative,
} from '@/types/domain'
import { AppError, simulateLatency, simulateMutation } from '@/utils'
import { calcCapacityUtilization } from '@/workflow/financeKpis'

export interface PrivatizationService {
  getCases(organizationId?: string): Promise<PrivatizationCase[]>
  getCase(id: string): Promise<PrivatizationCase>
  getMilestones(privatizationCaseId?: string): Promise<PrivatizationMilestone[]>
  updateCase(id: string, patch: Partial<PrivatizationCase>): Promise<PrivatizationCase>
  /** Advance one stage if predecessors are completed (prototype rule) */
  advanceStage(caseId: string): Promise<PrivatizationCase>
  getTransformations(organizationId?: string): Promise<TransformationInitiative[]>
  getTransformation(id: string): Promise<TransformationInitiative>
  updateTransformation(
    id: string,
    patch: Partial<TransformationInitiative>,
  ): Promise<TransformationInitiative>
}

export interface IndustrialService {
  getPerformance(
    organizationId?: string,
    reportingPeriodId?: string,
  ): Promise<IndustrialPerformance[]>
  getPerformanceRow(
    organizationId: string,
    reportingPeriodId: string,
  ): Promise<IndustrialPerformance>
  updatePerformance(
    id: string,
    patch: Partial<IndustrialPerformance>,
  ): Promise<IndustrialPerformance>
  getHistory(organizationId: string): Promise<IndustrialPerformance[]>
}

export const mockPrivatizationService: PrivatizationService = {
  async getCases(organizationId) {
    let items = [...db.privatizationCases]
    if (organizationId) items = items.filter((c) => c.organizationId === organizationId)
    return simulateLatency(items)
  },
  async getCase(id) {
    const row = db.privatizationCases.find((c) => c.id === id)
    if (!row) throw new AppError('Privatization case not found', 'NOT_FOUND')
    return simulateLatency(row)
  },
  async getMilestones(privatizationCaseId) {
    let items = [...db.privatizationMilestones]
    if (privatizationCaseId) {
      items = items.filter((m) => m.privatizationCaseId === privatizationCaseId)
    }
    const order = PRIVATIZATION_STAGE_ORDER
    items.sort(
      (a, b) =>
        order.indexOf(a.stage as PrivatizationStage) -
        order.indexOf(b.stage as PrivatizationStage),
    )
    return simulateLatency(items)
  },
  async updateCase(id, patch) {
    const idx = db.privatizationCases.findIndex((c) => c.id === id)
    if (idx < 0) throw new AppError('Privatization case not found', 'NOT_FOUND')
    db.privatizationCases[idx] = { ...db.privatizationCases[idx], ...patch, id }
    return simulateMutation(db.privatizationCases[idx])
  },
  async advanceStage(caseId) {
    const idx = db.privatizationCases.findIndex((c) => c.id === caseId)
    if (idx < 0) throw new AppError('Privatization case not found', 'NOT_FOUND')
    const current = db.privatizationCases[idx]
    const order = PRIVATIZATION_STAGE_ORDER
    const curIdx = order.indexOf(current.currentStage as PrivatizationStage)
    if (curIdx < 0 || curIdx >= order.length - 1) {
      throw new AppError('Cannot advance stage further', 'VALIDATION')
    }
    const milestones = db.privatizationMilestones.filter((m) => m.privatizationCaseId === caseId)
    for (let i = 0; i < curIdx; i++) {
      const stage = order[i]!
      const ms = milestones.find((m) => m.stage === stage)
      if (!ms || ms.status !== PRIVATIZATION_STAGE_STATUS.COMPLETED) {
        throw new AppError(`Cannot skip predecessor stage: ${stage}`, 'VALIDATION')
      }
    }
    const currentMs = milestones.find((m) => m.stage === current.currentStage)
    if (currentMs?.status === PRIVATIZATION_STAGE_STATUS.BLOCKED) {
      throw new AppError('Current stage is blocked — resolve blocker first', 'VALIDATION')
    }
    if (currentMs && currentMs.status !== PRIVATIZATION_STAGE_STATUS.COMPLETED) {
      const msIdx = db.privatizationMilestones.findIndex((m) => m.id === currentMs.id)
      if (msIdx >= 0) {
        db.privatizationMilestones[msIdx] = {
          ...db.privatizationMilestones[msIdx],
          status: PRIVATIZATION_STAGE_STATUS.COMPLETED,
          actualCompletionDate: new Date().toISOString().slice(0, 10),
        }
      }
    }
    const nextStage = order[curIdx + 1]!
    const nextMs = milestones.find((m) => m.stage === nextStage)
    if (nextMs) {
      const msIdx = db.privatizationMilestones.findIndex((m) => m.id === nextMs.id)
      if (msIdx >= 0) {
        db.privatizationMilestones[msIdx] = {
          ...db.privatizationMilestones[msIdx],
          status: PRIVATIZATION_STAGE_STATUS.IN_PROGRESS,
        }
      }
    }
    db.privatizationCases[idx] = {
      ...current,
      currentStage: nextStage,
      blocker: undefined,
      nextAction: `Progress ${nextStage} stage`,
    }
    return simulateMutation(db.privatizationCases[idx])
  },
  async getTransformations(organizationId) {
    let items = [...db.transformationInitiatives]
    if (organizationId) items = items.filter((t) => t.organizationId === organizationId)
    return simulateLatency(items)
  },
  async getTransformation(id) {
    const row = db.transformationInitiatives.find((t) => t.id === id)
    if (!row) throw new AppError('Transformation initiative not found', 'NOT_FOUND')
    return simulateLatency(row)
  },
  async updateTransformation(id, patch) {
    const idx = db.transformationInitiatives.findIndex((t) => t.id === id)
    if (idx < 0) throw new AppError('Transformation initiative not found', 'NOT_FOUND')
    db.transformationInitiatives[idx] = {
      ...db.transformationInitiatives[idx],
      ...patch,
      id,
    }
    return simulateMutation(db.transformationInitiatives[idx])
  },
}

export const mockIndustrialService: IndustrialService = {
  async getPerformance(organizationId, reportingPeriodId) {
    let items = [...db.industrialPerformance]
    if (organizationId) items = items.filter((i) => i.organizationId === organizationId)
    if (reportingPeriodId) {
      items = items.filter((i) => i.reportingPeriodId === reportingPeriodId)
    }
    return simulateLatency(items)
  },
  async getPerformanceRow(organizationId, reportingPeriodId) {
    const row = db.industrialPerformance.find(
      (i) =>
        i.organizationId === organizationId && i.reportingPeriodId === reportingPeriodId,
    )
    if (!row) throw new AppError('Industrial performance not found', 'NOT_FOUND')
    return simulateLatency(row)
  },
  async updatePerformance(id, patch) {
    const idx = db.industrialPerformance.findIndex((i) => i.id === id)
    if (idx < 0) throw new AppError('Industrial performance not found', 'NOT_FOUND')
    const nonNegativeFields: Array<[keyof IndustrialPerformance, string]> = [
      ['installedCapacity', 'Installed capacity'],
      ['actualProduction', 'Actual production'],
      ['exports', 'Exports'],
      ['imports', 'Imports'],
      ['domesticSales', 'Domestic sales'],
      ['employment', 'Employment'],
      ['energyConsumption', 'Energy consumption'],
      ['carbonEmissions', 'Carbon emissions'],
    ]
    for (const [field, label] of nonNegativeFields) {
      const value = patch[field]
      if (typeof value === 'number' && value < 0) {
        throw new AppError(`${label} cannot be negative`, 'VALIDATION')
      }
    }
    const next = { ...db.industrialPerformance[idx], ...patch, id }
    const util = calcCapacityUtilization(next)
    if (util != null) next.capacityUtilization = util
    db.industrialPerformance[idx] = next
    return simulateMutation(db.industrialPerformance[idx])
  },
  async getHistory(organizationId) {
    const order = db.reportingPeriods
      .filter((p) => p.type === 'annual')
      .sort((a, b) => a.startDate.localeCompare(b.startDate))
      .map((p) => p.id)
    return simulateLatency(
      db.industrialPerformance
        .filter((i) => i.organizationId === organizationId && order.includes(i.reportingPeriodId))
        .sort(
          (a, b) =>
            order.indexOf(a.reportingPeriodId) - order.indexOf(b.reportingPeriodId),
        ),
    )
  },
}
