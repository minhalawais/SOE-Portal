import { describe, expect, it, beforeEach } from 'vitest'
import { ROLE, SUBMISSION_STATUS } from '@/constants'
import { db, resetMockDb } from '@/mock-data'
import { resetMockRuntime } from '@/mock-data/runtime'
import { mockFinanceWorkflowService } from '@/mock-services'
import { AppError } from '@/utils'
import {
  canTransition,
  getAvailableActions,
  bumpVersion,
} from '@/workflow/submission'
import { validateFinanceDraft, hasBlockingIssues } from '@/workflow/financeValidation'

describe('Phase 5 golden finance workflow', () => {
  beforeEach(() => {
    resetMockDb()
    resetMockRuntime()
  })

  it('enforces valid transitions', () => {
    expect(canTransition(SUBMISSION_STATUS.DRAFT, SUBMISSION_STATUS.IN_PROGRESS)).toBe(true)
    expect(canTransition(SUBMISSION_STATUS.IN_PROGRESS, SUBMISSION_STATUS.APPROVED)).toBe(false)
    expect(canTransition(SUBMISSION_STATUS.UNDER_REVIEW, SUBMISSION_STATUS.CLARIFICATION_REQUESTED)).toBe(
      true,
    )
  })

  it('hides certify from finance officer', () => {
    const actions = getAvailableActions(SUBMISSION_STATUS.READY_FOR_CERTIFICATION, ROLE.FINANCE_OFFICER)
    expect(actions.some((a) => a.id === 'certify')).toBe(false)
    const cfo = getAvailableActions(SUBMISSION_STATUS.READY_FOR_CERTIFICATION, ROLE.CFO)
    expect(cfo.some((a) => a.id === 'certify')).toBe(true)
  })

  it('does not treat seeded finance packs as attached form evidence', async () => {
    const ws = await mockFinanceWorkflowService.getWorkspace(
      'org-psm',
      'period-fy2027',
      ROLE.FINANCE_OFFICER,
    )
    expect(ws.evidence).toEqual([])
    expect(ws.validation.some((issue) => issue.code === 'EVIDENCE_REQUIRED')).toBe(true)

    await mockFinanceWorkflowService.attachEvidence(
      'org-psm',
      'period-fy2027',
      { title: 'Audited statements', fileName: 'psm-fs.pdf' },
      ROLE.FINANCE_OFFICER,
    )
    const next = await mockFinanceWorkflowService.getWorkspace(
      'org-psm',
      'period-fy2027',
      ROLE.FINANCE_OFFICER,
    )
    expect(next.evidence).toHaveLength(1)
    expect(next.evidence[0]?.fileName).toBe('psm-fs.pdf')
    expect(next.validation.some((issue) => issue.code === 'EVIDENCE_REQUIRED')).toBe(false)
  })

  it('blocks completion without evidence', () => {
    const issues = validateFinanceDraft(
      {
        revenue: 1,
        operatingExpenses: 1,
        capex: 0,
        profitOrLoss: 0,
        subsidies: 0,
      },
      null,
      0,
    )
    expect(hasBlockingIssues(issues)).toBe(true)
  })

  it('runs certify → submit → review → clarify → respond → resubmit → approve', async () => {
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
      { revenue: 20_000_000_000 },
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

    // Draft must not create executive KPI
    expect(db.approvedFinanceKpis.length).toBe(0)

    await mockFinanceWorkflowService.takeUnderReview(submitted.id, ROLE.MOIP_REVIEWER)
    const clar = await mockFinanceWorkflowService.requestClarification(submitted.id, ROLE.MOIP_REVIEWER, {
      question: 'Explain subsidy drawdown',
      affectedField: 'subsidies',
    })
    await mockFinanceWorkflowService.respondClarification(clar.id, ROLE.FINANCE_OFFICER, 'Subsidy timing clarified.')
    const resubmitted = await mockFinanceWorkflowService.resubmit(
      orgId,
      periodId,
      ROLE.SOE_FOCAL_PERSON,
    )
    expect(resubmitted.version).toBe('1.1')
    expect(resubmitted.status).toBe(SUBMISSION_STATUS.UNDER_REVIEW)

    const locked = await mockFinanceWorkflowService.approve(
      resubmitted.id,
      ROLE.MOIP_REVIEWER,
      'MoIP Reviewer',
    )
    expect(locked.status).toBe(SUBMISSION_STATUS.LOCKED)
    expect(db.approvedFinanceKpis.length).toBe(1)

    await expect(
      mockFinanceWorkflowService.saveDraft(orgId, periodId, { revenue: 1 }, ROLE.FINANCE_OFFICER),
    ).rejects.toBeInstanceOf(AppError)
  })

  it('keeps Executive Viewer read-only on locked finance snapshots', async () => {
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
      { revenue: 20_000_000_000 },
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
    await mockFinanceWorkflowService.takeUnderReview(submitted.id, ROLE.MOIP_REVIEWER)
    const locked = await mockFinanceWorkflowService.approve(
      submitted.id,
      ROLE.MOIP_REVIEWER,
      'MoIP Reviewer',
    )
    expect(locked.status).toBe(SUBMISSION_STATUS.LOCKED)

    const workspace = await mockFinanceWorkflowService.getWorkspace(
      orgId,
      periodId,
      ROLE.EXECUTIVE_VIEWER,
    )
    expect(workspace.readOnly).toBe(true)

    await expect(
      mockFinanceWorkflowService.saveDraft(
        orgId,
        periodId,
        { revenue: 21_000_000_000 },
        ROLE.EXECUTIVE_VIEWER,
      ),
    ).rejects.toBeInstanceOf(AppError)
  })

  it('bumps versions correctly', () => {
    expect(bumpVersion('1.0')).toBe('1.1')
    expect(bumpVersion('1.1', 'major')).toBe('2.0')
  })

  it('rejects finance officer certify attempt', async () => {
    // Force ready for certification
    const sub = db.submissions.find(
      (s) => s.organizationId === 'org-psm' && s.module === 'finance',
    )!
    const sIdx = db.submissions.findIndex((s) => s.id === sub.id)
    db.submissions[sIdx] = {
      ...db.submissions[sIdx],
      status: SUBMISSION_STATUS.READY_FOR_CERTIFICATION,
    }
    await expect(
      mockFinanceWorkflowService.certify('org-psm', 'period-fy2027', ROLE.FINANCE_OFFICER, 'FO'),
    ).rejects.toBeInstanceOf(AppError)
  })
})
