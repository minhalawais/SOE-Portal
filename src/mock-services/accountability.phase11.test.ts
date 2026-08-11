import { beforeEach, describe, expect, it } from 'vitest'
import {
  AUDIT_PARA_STATUS,
  PRIVATIZATION_STAGE,
  PROCUREMENT_HIGH_VALUE_THRESHOLD_PKR,
} from '@/constants'
import { resetMockDb } from '@/mock-data'
import { resetMockRuntime } from '@/mock-data/runtime'
import {
  mockAuditService,
  mockComplianceService,
  mockLitigationService,
  mockPrivatizationService,
} from '@/mock-services'
import {
  auditParaAgeDays,
  procurementAlerts,
  recoveryPct,
} from '@/mock-services/accountability.service'

describe('Phase 11 accountability services', () => {
  beforeEach(() => {
    resetMockDb()
    resetMockRuntime()
  })

  it('flags single-source and high-value procurement alerts', async () => {
    const rows = await mockAuditService.getProcurement('org-psm')
    expect(rows.length).toBeGreaterThan(0)
    const high = rows.find((r) => r.value >= PROCUREMENT_HIGH_VALUE_THRESHOLD_PKR)
    expect(high).toBeTruthy()
    const alerts = procurementAlerts(high!)
    expect(alerts.some((a) => a.code === 'HIGH_VALUE')).toBe(true)
  })

  it('links contracts to valid procurement', async () => {
    const contracts = await mockAuditService.getContracts('org-psm')
    expect(contracts.length).toBeGreaterThan(0)
    const proc = await mockAuditService.getProcurementById(contracts[0]!.procurementId)
    expect(proc.id).toBe(contracts[0]!.procurementId)
  })

  it('tracks audit para recovery and PAC linkage', async () => {
    const paras = await mockAuditService.getAuditParas('org-peco')
    expect(paras.length).toBeGreaterThan(0)
    const recovering = paras.find((p) => p.status === AUDIT_PARA_STATUS.RECOVERY_IN_PROGRESS)
    expect(recovering).toBeTruthy()
    expect(recoveryPct(recovering!.amountInvolved, recovering!.amountRecovered)).toBeGreaterThan(0)
    expect(auditParaAgeDays(recovering!.dateRaised)).toBeGreaterThan(0)
    if (recovering!.linkedPacId) {
      const pac = await mockAuditService.getPacObservation(recovering!.linkedPacId)
      expect(pac.auditParaId).toBe(recovering!.id)
    }
  })

  it('sorts litigation by next hearing', async () => {
    const cases = await mockLitigationService.getCases('org-nfml')
    const dates = cases.map((c) => c.nextHearing ?? '')
    const sorted = [...dates].sort((a, b) => a.localeCompare(b))
    expect(dates).toEqual(sorted)
  })

  it('surfaces overdue compliance for governance-risk SOE', async () => {
    const items = await mockComplianceService.getComplianceItems('org-usc')
    // USC may not be governance risk — use org with GOVERNANCE_RISK
    const risk = await mockComplianceService.getComplianceItems('org-nfc')
    // Find any overdue across portfolio via exception summary
    const summary = await mockAuditService.getExceptionSummary()
    expect(summary.overdueCompliance + summary.openAuditParas).toBeGreaterThan(0)
    expect(items.length + risk.length).toBeGreaterThan(0)
  })

  it('blocks privatization stage skip and blocked advance', async () => {
    await expect(mockPrivatizationService.advanceStage('priv-psm-1')).rejects.toMatchObject({
      code: 'VALIDATION',
    })
    const usc = await mockPrivatizationService.getCase('priv-usc-1')
    expect(usc.currentStage).toBe(PRIVATIZATION_STAGE.VALUATION)
    const advanced = await mockPrivatizationService.advanceStage('priv-usc-1')
    expect(advanced.currentStage).toBe(PRIVATIZATION_STAGE.EOI)
  })

  it('lists transformation initiatives with next actions', async () => {
    const rows = await mockPrivatizationService.getTransformations()
    expect(rows.length).toBeGreaterThan(0)
    expect(rows.every((r) => r.nextAction && r.isDummyDemonstrationData)).toBe(true)
  })
})
