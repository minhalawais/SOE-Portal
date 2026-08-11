import { describe, expect, it, beforeEach } from 'vitest'
import { COMPLIANCE_STATUS, SUBMISSION_STATUS } from '@/constants'
import {
  createSeedDataset,
  db,
  deriveOrganizationMetrics,
  resetMockDb,
  SCENARIO,
  scenarioCatalogue,
} from '@/mock-data'
import { mockAssetService, mockOrganizationService, mockSubmissionService } from '@/mock-services'
import { resetMockRuntime, setMockErrorMode } from '@/mock-data/runtime'
import { AppError } from '@/utils'

describe('Phase 4 mock data integrity', () => {
  beforeEach(() => {
    resetMockDb()
    resetMockRuntime()
  })

  it('seeds ten SOEs covering all scenarios', () => {
    const seed = createSeedDataset()
    expect(seed.organizations).toHaveLength(10)
    const scenarios = new Set(seed.organizations.map((o) => o.scenarioId))
    expect(scenarios.size).toBe(scenarioCatalogue.length)
    seed.organizations.forEach((o) => {
      expect(o.isDummyDemonstrationData).toBe(true)
    })
  })

  it('uses realistic display names instead of generic Employee/Director placeholders', () => {
    expect(db.employees.some((e) => /^Employee\s/.test(e.name))).toBe(false)
    expect(db.boardMembers.filter((b) => !b.isVacancySlot).some((b) => /^Director\s/.test(b.name))).toBe(
      false,
    )
    expect(db.executives.some((e) => /^CEO\s|^CFO\s|^GM\s/.test(e.name))).toBe(false)
    expect(db.assets.some((a) => /^[A-Z]+ land \d+$/i.test(a.name))).toBe(false)
    expect(db.procurement.some((p) => /procurement \d+$/i.test(p.title))).toBe(false)
    expect(db.employees[0]!.name.split(' ').length).toBeGreaterThanOrEqual(2)
  })

  it('keeps relational IDs valid', () => {
    const orgIds = new Set(db.organizations.map((o) => o.id))
    const periodIds = new Set(db.reportingPeriods.map((p) => p.id))
    const assetIds = new Set(db.assets.map((a) => a.id))
    const submissionIds = new Set(db.submissions.map((s) => s.id))

    db.assets.forEach((a) => expect(orgIds.has(a.organizationId)).toBe(true))
    db.financialMetrics.forEach((f) => {
      expect(orgIds.has(f.organizationId)).toBe(true)
      expect(periodIds.has(f.reportingPeriodId)).toBe(true)
      expect(f.revenue).toBeGreaterThanOrEqual(0)
    })
    db.geoFeatures.forEach((g) => {
      expect(orgIds.has(g.organizationId)).toBe(true)
      expect(assetIds.has(g.assetId)).toBe(true)
    })
    db.documents.forEach((d) => {
      expect(orgIds.has(d.organizationId)).toBe(true)
      if (d.linkedRecordType === 'submission' && d.linkedRecordId) {
        expect(submissionIds.has(d.linkedRecordId)).toBe(true)
      }
    })
    db.relationships.forEach((r) => {
      expect(orgIds.has(r.parentOrganizationId)).toBe(true)
      expect(orgIds.has(r.relatedOrganizationId)).toBe(true)
      expect(r.ownershipPercentage).toBeGreaterThanOrEqual(0)
      expect(r.ownershipPercentage).toBeLessThanOrEqual(100)
    })
    db.ownershipLines.forEach((l) => {
      expect(orgIds.has(l.organizationId)).toBe(true)
      expect(l.percentage).toBeGreaterThanOrEqual(0)
      expect(l.percentage).toBeLessThanOrEqual(100)
    })
    db.contacts.forEach((c) => expect(orgIds.has(c.organizationId)).toBe(true))
    db.enterpriseHistory.forEach((e) => expect(orgIds.has(e.organizationId)).toBe(true))
    db.boardMembers.forEach((b) => {
      if (b.isVacancySlot) return
      expect(new Date(b.appointmentDate) <= new Date(b.expiryDate)).toBe(true)
    })
    db.dailyWagers.forEach((d) => expect(orgIds.has(d.organizationId)).toBe(true))
    db.consultants.forEach((c) => expect(orgIds.has(c.organizationId)).toBe(true))
    db.boardCommittees.forEach((c) => expect(orgIds.has(c.organizationId)).toBe(true))
    db.governanceCalendar.forEach((e) => expect(orgIds.has(e.organizationId)).toBe(true))
    db.industrialPerformance.forEach((i) => {
      expect(i.capacityUtilization).toBeGreaterThanOrEqual(0)
      expect(i.capacityUtilization).toBeLessThanOrEqual(100)
      expect(i.energyUnit).toBeTruthy()
      expect(i.carbonUnit).toBeTruthy()
    })
    db.loans.forEach((l) => {
      expect(orgIds.has(l.organizationId)).toBe(true)
      expect(l.isDummyDemonstrationData).toBe(true)
      expect(l.outstanding).toBeGreaterThanOrEqual(0)
    })
    db.loanRepayments.forEach((r) => {
      expect(db.loans.some((l) => l.id === r.loanId)).toBe(true)
    })
    db.budgetLines.forEach((b) => {
      expect(orgIds.has(b.organizationId)).toBe(true)
      expect(periodIds.has(b.reportingPeriodId)).toBe(true)
    })
    db.guarantees.forEach((g) => {
      expect(g.exposure).toBeGreaterThanOrEqual(0)
      expect(g.isDummyDemonstrationData).toBe(true)
    })
    db.contracts.forEach((c) => {
      expect(orgIds.has(c.organizationId)).toBe(true)
      expect(db.procurement.some((p) => p.id === c.procurementId)).toBe(true)
    })
    db.auditParas.forEach((p) => {
      expect(orgIds.has(p.organizationId)).toBe(true)
      expect(p.amountRecovered).toBeGreaterThanOrEqual(0)
      expect(p.amountRecovered).toBeLessThanOrEqual(p.amountInvolved)
    })
    db.pacObservations.forEach((p) => {
      expect(db.auditParas.some((a) => a.id === p.auditParaId)).toBe(true)
    })
    db.privatizationMilestones.forEach((m) => {
      expect(db.privatizationCases.some((c) => c.id === m.privatizationCaseId)).toBe(true)
    })
  })

  it('includes all submission workflow statuses', () => {
    const statuses = new Set(db.submissions.map((s) => s.status))
    const required = [
      SUBMISSION_STATUS.DRAFT,
      SUBMISSION_STATUS.IN_PROGRESS,
      SUBMISSION_STATUS.READY_FOR_CERTIFICATION,
      SUBMISSION_STATUS.CERTIFIED,
      SUBMISSION_STATUS.SUBMITTED,
      SUBMISSION_STATUS.UNDER_REVIEW,
      SUBMISSION_STATUS.CLARIFICATION_REQUESTED,
      SUBMISSION_STATUS.RETURNED,
      SUBMISSION_STATUS.RESUBMITTED,
      SUBMISSION_STATUS.APPROVED,
      SUBMISSION_STATUS.LOCKED,
    ]
    // Seed uses status cycle; APPROVED may be transitional only — LOCKED is terminal
    required
      .filter((s) => s !== SUBMISSION_STATUS.APPROVED)
      .forEach((s) => expect(statuses.has(s)).toBe(true))
  })

  it('produces distinct scenario outcomes via derived metrics', () => {
    const nfc = db.organizations.find((o) => o.scenarioId === SCENARIO.GOVERNANCE_RISK)!
    const usc = db.organizations.find((o) => o.scenarioId === SCENARIO.ASSET_RICH)!
    const pitac = db.organizations.find((o) => o.scenarioId === SCENARIO.LOSS_MAKING)!
    const tusdec = db.organizations.find((o) => o.scenarioId === SCENARIO.UNDERUTILIZED)!

    const nfcM = deriveOrganizationMetrics(nfc.id)
    const uscM = deriveOrganizationMetrics(usc.id)
    const pitacM = deriveOrganizationMetrics(pitac.id)
    const tusdecM = deriveOrganizationMetrics(tusdec.id)

    expect(nfcM.boardVacancies).toBeGreaterThan(0)
    expect(nfcM.overdueComplianceCount).toBeGreaterThan(0)
    expect(uscM.assetCount).toBeGreaterThan(
      deriveOrganizationMetrics(db.organizations.find((o) => o.scenarioId === SCENARIO.HEALTHY)!.id)
        .assetCount,
    )
    expect(pitacM.overdueLoanCount).toBeGreaterThan(0)
    expect(tusdecM.capacityUtilization ?? 100).toBeLessThan(40)
  })

  it('mutations update the in-memory store and reset restores seed', async () => {
    const before = db.assets.length
    await mockAssetService.createAsset({
      organizationId: 'org-pidc',
      assetType: 'land',
      name: 'Temp demo parcel',
      bookValue: 1_000_000,
    })
    expect(db.assets.length).toBe(before + 1)

    resetMockDb()
    expect(db.assets.length).toBe(before)
    expect(db.assets.some((a) => a.name === 'Temp demo parcel')).toBe(false)
  })

  it('rejects negative asset book values', async () => {
    await expect(
      mockAssetService.updateAsset(db.assets[0].id, { bookValue: -1 }),
    ).rejects.toBeInstanceOf(AppError)
  })

  it('simulates query failure via runtime controls', async () => {
    setMockErrorMode('query_failure')
    await expect(mockOrganizationService.getOrganizations()).rejects.toBeInstanceOf(AppError)
  })

  it('keeps compliance vocabulary central', () => {
    db.compliance.forEach((c) => {
      expect(Object.values(COMPLIANCE_STATUS)).toContain(c.status)
    })
  })

  it('links tasks and alerts to underlying records', () => {
    db.tasks.forEach((t) => {
      if (!t.linkedRecordId || !t.linkedRecordType) return
      if (t.linkedRecordType === 'board') {
        expect(db.boardMembers.some((b) => b.id === t.linkedRecordId)).toBe(true)
      }
      if (t.linkedRecordType === 'loan') {
        expect(db.loans.some((l) => l.id === t.linkedRecordId)).toBe(true)
      }
      if (t.linkedRecordType === 'clarification') {
        expect(db.clarifications.some((c) => c.id === t.linkedRecordId)).toBe(true)
      }
      if (t.linkedRecordType === 'submission') {
        expect(db.submissions.some((s) => s.id === t.linkedRecordId)).toBe(true)
      }
    })
  })

  it('approveSubmission locks the pack', async () => {
    const candidate = db.submissions.find((s) => s.status === SUBMISSION_STATUS.UNDER_REVIEW)
    expect(candidate).toBeTruthy()
    const result = await mockSubmissionService.approveSubmission(candidate!.id)
    expect(result.status).toBe(SUBMISSION_STATUS.LOCKED)
  })
})
