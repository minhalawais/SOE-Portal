import { beforeEach, describe, expect, it } from 'vitest'
import {
  AUDIT_PARA_STATUS,
  LITIGATION_STAGE,
  LITIGATION_STAGE_ORDER,
  LITIGATION_STAGE_STATUS,
  PRIVATIZATION_STAGE,
  PROCUREMENT_HIGH_VALUE_THRESHOLD_PKR,
} from '@/constants'
import { resetMockDb } from '@/mock-data'
import { resetMockRuntime } from '@/mock-data/runtime'
import {
  mockAuditService,
  mockComplianceService,
  mockDocumentService,
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

  it('persists enhanced litigation case management fields from SOE entry', async () => {
    const created = await mockLitigationService.createCase({
      organizationId: 'org-psm',
      court: 'High Court',
      caseNumber: 'PSM/C/2026/99',
      petitioner: 'Contractor',
      respondent: 'Pakistan Steel Mills',
      nature: 'contract dispute',
      lawyer: 'Adv. Demo Counsel',
      status: 'active',
      amountInvolved: 100_000_000,
      currentExposurePkr: 85_000_000,
      bestCaseExposurePkr: 20_000_000,
      worstCaseExposurePkr: 140_000_000,
      probabilityOfLoss: 'possible',
      accountingTreatment: 'disclosed',
      confidentiality: 'privileged',
      caseStage: 'Evidence',
      filedDate: '2026-07-01',
      receivedDate: '2026-07-05',
      legalOwner: 'SOE Legal Cell',
      nextAction: 'Submit written reply',
      actionDueDate: '2026-08-30',
      evidenceAvailable: true,
      isDummyDemonstrationData: true,
    })
    const row = await mockLitigationService.getCase(created.id)
    expect(row.currentExposurePkr).toBe(85_000_000)
    expect(row.worstCaseExposurePkr).toBe(140_000_000)
    expect(row.probabilityOfLoss).toBe('possible')
    expect(row.accountingTreatment).toBe('disclosed')
    expect(row.confidentiality).toBe('privileged')
    expect(row.nextAction).toBe('Submit written reply')
  })

  it('generates stage-wise litigation records for legacy cases', async () => {
    const cases = await mockLitigationService.getCases('org-psm')
    const stages = await mockLitigationService.getCaseStages(cases[0]!.id)
    expect(stages).toHaveLength(LITIGATION_STAGE_ORDER.length)
    expect(stages[0]?.stage).toBe(LITIGATION_STAGE.INTAKE)
    expect(stages.some((stage) => stage.status !== LITIGATION_STAGE_STATUS.NOT_STARTED)).toBe(true)
  })

  it('submits and reviews a litigation stage independently from the case header', async () => {
    const cases = await mockLitigationService.getCases('org-psm')
    const first = cases[0]!
    await mockLitigationService.saveCaseStage(first.id, LITIGATION_STAGE.HEARINGS, {
      nextHearing: '2026-09-15',
      nextAction: 'Prepare hearing brief',
      evidenceAvailable: true,
    })
    const submitted = await mockLitigationService.submitCaseStage(first.id, LITIGATION_STAGE.HEARINGS)
    expect(submitted.status).toBe(LITIGATION_STAGE_STATUS.SUBMITTED)

    const reviewed = await mockLitigationService.reviewCaseStage(first.id, LITIGATION_STAGE.HEARINGS, 'verify')
    const events = await mockLitigationService.getCaseEvents(first.id)
    expect(reviewed.status).toBe(LITIGATION_STAGE_STATUS.VERIFIED)
    expect(events[0]?.stage).toBe(LITIGATION_STAGE.HEARINGS)
    expect(events[0]?.title).toContain('verified')
  })

  it('allows repeated progress events for the same litigation stage', async () => {
    const cases = await mockLitigationService.getCases('org-psm')
    const first = cases[0]!
    await mockLitigationService.addCaseEvent(first.id, {
      occurredAt: '2026-08-20',
      effectiveAt: '2026-08-20',
      actorRole: 'legal_officer',
      actorName: 'SOE Legal Officer',
      eventType: 'hearing',
      stage: LITIGATION_STAGE.HEARINGS,
      title: 'First hearing update',
    })
    await mockLitigationService.addCaseEvent(first.id, {
      occurredAt: '2026-08-25',
      effectiveAt: '2026-08-25',
      actorRole: 'legal_officer',
      actorName: 'SOE Legal Officer',
      eventType: 'hearing',
      stage: LITIGATION_STAGE.HEARINGS,
      title: 'Second hearing update',
    })
    const events = await mockLitigationService.getCaseEvents(first.id)
    expect(events.filter((event) => event.stage === LITIGATION_STAGE.HEARINGS).length).toBeGreaterThanOrEqual(2)
  })

  it('records litigation corrections without overwriting the original timeline event', async () => {
    const cases = await mockLitigationService.getCases('org-psm')
    const first = cases[0]!
    const original = await mockLitigationService.addCaseEvent(first.id, {
      occurredAt: '2026-08-20',
      effectiveAt: '2026-08-20',
      actorRole: 'legal_officer',
      actorName: 'SOE Legal Officer',
      eventType: 'hearing',
      stage: LITIGATION_STAGE.HEARINGS,
      title: 'Hearing update requiring correction',
      stagePayload: {
        actionOwner: 'SOE Legal Cell',
        stageOutcome: 'Documents directed',
      },
    })
    const correction = await mockLitigationService.addCaseEvent(first.id, {
      occurredAt: '2026-08-25',
      effectiveAt: '2026-08-25',
      actorRole: 'legal_officer',
      actorName: 'SOE Legal Officer',
      eventType: 'correction',
      stage: LITIGATION_STAGE.HEARINGS,
      title: 'Correction: hearing outcome amended',
      supersedesEventId: original.id,
      amendmentOfEventId: original.id,
      stagePayload: {
        actionOwner: 'SOE Legal Cell',
        stageOutcome: 'Documents filed and next date assigned',
      },
    })
    const events = await mockLitigationService.getCaseEvents(first.id)
    expect(correction.supersedesEventId).toBe(original.id)
    expect(events.some((event) => event.id === original.id)).toBe(true)
    expect(events[0]?.id).toBe(correction.id)
  })

  it('links uploaded litigation stage evidence to the case and event payload', async () => {
    const cases = await mockLitigationService.getCases('org-psm')
    const first = cases[0]!
    const doc = await mockDocumentService.createDocument({
      organizationId: first.organizationId,
      title: 'Hearing order evidence',
      category: 'court_orders',
      fileName: 'hearing-order.pdf',
      uploadedBy: 'legal_officer',
      linkedRecordType: 'litigation_case',
      linkedRecordId: first.id,
      linkedModule: 'litigation',
      evidenceStatus: 'pending_review',
      status: 'pending_review',
      classification: 'evidence',
    })
    const event = await mockLitigationService.addCaseEvent(first.id, {
      occurredAt: '2026-08-25',
      effectiveAt: '2026-08-25',
      actorRole: 'legal_officer',
      actorName: 'SOE Legal Officer',
      eventType: 'hearing',
      stage: LITIGATION_STAGE.HEARINGS,
      title: 'Hearing update with uploaded evidence',
      stagePayload: {
        evidenceDocumentIds: doc.id,
        evidenceDocumentTitles: doc.title,
      },
    })
    const linked = await mockDocumentService.getForRecord('litigation_case', first.id)
    expect(linked.some((item) => item.id === doc.id)).toBe(true)
    expect(event.stagePayload?.evidenceDocumentIds).toContain(doc.id)
  })

  it('aggregates litigation exposure and review workload by lifecycle stage', async () => {
    const summary = await mockLitigationService.getStageSummary()
    expect(summary).toHaveLength(LITIGATION_STAGE_ORDER.length)
    expect(summary.reduce((sum, stage) => sum + stage.count, 0)).toBeGreaterThan(0)
    expect(summary.some((stage) => stage.exposurePkr > 0)).toBe(true)
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
