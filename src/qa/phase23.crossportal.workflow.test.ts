import { beforeEach, describe, expect, it } from 'vitest'
import { ROLE, SUBMISSION_STATUS } from '@/constants'
import { db, resetMockDb } from '@/mock-data'
import { resetMockRuntime } from '@/mock-data/runtime'
import {
  beginQaCycle,
  getFixtureVersion,
  mockFinanceWorkflowService,
  mockIntelligenceService,
  mockMoipPortalService,
} from '@/mock-services'
import { canTransition } from '@/workflow/submission'
import { AppError } from '@/utils'

describe('Phase 23 cross-portal workflow consequences', () => {
  beforeEach(() => {
    resetMockDb()
    resetMockRuntime()
  })

  it('records a reproducible QA baseline on cycle start', () => {
    const baseline = beginQaCycle({
      reportingPeriodId: 'period-fy2027',
      organizationId: 'org-psm',
      role: ROLE.SOE_FOCAL_PERSON,
    })
    expect(baseline.fixtureVersion).toBe(getFixtureVersion())
    expect(baseline.role).toBe(ROLE.SOE_FOCAL_PERSON)
    expect(baseline.releaseCandidate).toContain('RC1')
  })

  it('blocks invalid golden-path transitions', () => {
    expect(canTransition(SUBMISSION_STATUS.DRAFT, SUBMISSION_STATUS.LOCKED)).toBe(false)
    expect(canTransition(SUBMISSION_STATUS.SUBMITTED, SUBMISSION_STATUS.CERTIFIED)).toBe(false)
    expect(canTransition(SUBMISSION_STATUS.APPROVED, SUBMISSION_STATUS.LOCKED)).toBe(true)
  })

  it('keeps draft finance changes out of approved executive KPI store', async () => {
    const orgId = 'org-psm'
    const periodId = 'period-fy2027'
    const before = db.approvedFinanceKpis.length

    await mockFinanceWorkflowService.attachEvidence(
      orgId,
      periodId,
      { title: 'Draft pack', fileName: 'draft.pdf' },
      ROLE.FINANCE_OFFICER,
    )
    await mockFinanceWorkflowService.saveDraft(
      orgId,
      periodId,
      { revenue: 11_000_000_000 },
      ROLE.FINANCE_OFFICER,
    )

    expect(db.approvedFinanceKpis.length).toBe(before)

    const queue = await mockMoipPortalService.getSubmissionQueue({
      module: 'finance',
      status: SUBMISSION_STATUS.SUBMITTED,
    })
    // MoIP queue must not treat an in-progress draft as submitted for this org/period.
    const draftAsSubmitted = queue.items.some(
      (r) =>
        r.submission.organizationId === orgId &&
        r.submission.reportingPeriodId === periodId &&
        r.submission.status === SUBMISSION_STATUS.SUBMITTED,
    )
    expect(draftAsSubmitted).toBe(false)
  })

  it('surfaces approved finance to MoIP queue and locked KPI after full golden path', async () => {
    const orgId = 'org-psm'
    const periodId = 'period-fy2027'

    await mockFinanceWorkflowService.attachEvidence(
      orgId,
      periodId,
      { title: 'Statements', fileName: 'fs.pdf' },
      ROLE.FINANCE_OFFICER,
    )
    await mockFinanceWorkflowService.saveDraft(
      orgId,
      periodId,
      { revenue: 22_000_000_000 },
      ROLE.FINANCE_OFFICER,
    )
    await mockFinanceWorkflowService.markComplete(orgId, periodId, ROLE.FINANCE_OFFICER)
    await mockFinanceWorkflowService.sendForCertification(orgId, periodId, ROLE.SOE_FOCAL_PERSON)
    await mockFinanceWorkflowService.certify(orgId, periodId, ROLE.CFO, 'CFO')
    const submitted = await mockFinanceWorkflowService.submitToMoip(
      orgId,
      periodId,
      ROLE.SOE_FOCAL_PERSON,
    )
    expect(submitted.status).toBe(SUBMISSION_STATUS.SUBMITTED)

    await mockFinanceWorkflowService.takeUnderReview(submitted.id, ROLE.MOIP_REVIEWER)
    const locked = await mockFinanceWorkflowService.approve(
      submitted.id,
      ROLE.MOIP_REVIEWER,
      'MoIP Reviewer',
    )
    expect(locked.status).toBe(SUBMISSION_STATUS.LOCKED)
    expect(db.approvedFinanceKpis.some((k) => k.organizationId === orgId)).toBe(true)

    // Intelligence scorecard remains readable after lock (executive / MoIP consequence).
    const card = await mockIntelligenceService.getScorecard(orgId)
    expect(card.organizationId).toBe(orgId)
  })

  it('rejects MoIP analyst approve attempts (permission boundary)', async () => {
    const sub = db.submissions.find(
      (s) => s.organizationId === 'org-psm' && s.module === 'finance',
    )!
    const idx = db.submissions.findIndex((s) => s.id === sub.id)
    db.submissions[idx] = { ...db.submissions[idx], status: SUBMISSION_STATUS.UNDER_REVIEW }

    await expect(
      mockFinanceWorkflowService.approve(sub.id, ROLE.MOIP_ANALYST, 'Analyst'),
    ).rejects.toBeInstanceOf(AppError)
  })
})
