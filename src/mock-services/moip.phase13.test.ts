import { beforeEach, describe, expect, it } from 'vitest'
import {
  ESCALATION_REASON,
  ESCALATION_SEVERITY,
  ROLE,
  SUBMISSION_STATUS,
} from '@/constants'
import { resetMockDb } from '@/mock-data'
import { resetMockRuntime } from '@/mock-data/runtime'
import { mockFinanceWorkflowService, mockMoipPortalService } from '@/mock-services'
import { hasPermission, PERMISSION } from '@/permissions'

describe('Phase 13 MoIP oversight portal', () => {
  beforeEach(() => {
    resetMockDb()
    resetMockRuntime()
  })

  it('builds oversight dashboard with drill-down counts', async () => {
    const dash = await mockMoipPortalService.getDashboard()
    expect(dash.totalSoes).toBe(10)
    expect(dash.underReview + dash.clarificationPending + dash.submissionsReceived).toBeGreaterThan(0)
    expect(dash.asOf).toBeTruthy()
  })

  it('builds the consolidated reviewer command dashboard from every oversight domain', async () => {
    const dashboard = await mockMoipPortalService.getCommandDashboard('period-fy2027')
    expect(dashboard.summary.totalSoes).toBe(10)
    expect(dashboard.moduleCoverage).toHaveLength(14)
    expect(dashboard.workflow.length).toBeGreaterThan(1)
    expect(dashboard.sectors.length).toBeGreaterThan(1)
    expect(dashboard.trend.length).toBeGreaterThan(1)
    expect(dashboard.priorityQueue.length).toBeGreaterThan(0)
    expect(dashboard.organizationsAtRisk.length).toBeGreaterThan(0)
    expect(dashboard.fiscal.assetValue).toBeGreaterThan(0)
    expect(dashboard.risk.openAuditParas + dashboard.risk.activeLitigation).toBeGreaterThan(0)
  })

  it('filters portfolio by submission status and risk', async () => {
    const page = await mockMoipPortalService.getPortfolio({
      pageSize: 50,
      riskOnly: true,
    })
    expect(page.items.length).toBeGreaterThan(0)
    page.items.forEach((r) => {
      expect(r.majorWarnings.length > 0 || r.overdue).toBe(true)
    })
  })

  it('lists queue with assignment and sorts by priority/age', async () => {
    const queue = await mockMoipPortalService.getSubmissionQueue({
      pageSize: 100,
      sortBy: 'priority',
    })
    expect(queue.items.length).toBeGreaterThan(0)
    expect(queue.items.some((r) => r.submission.assignedReviewerRole)).toBe(true)

    const target = queue.items[0]!
    const assigned = await mockMoipPortalService.assignReviewer(
      target.submission.id,
      ROLE.MOIP_SUPERVISOR,
      ROLE.MOIP_REVIEWER,
    )
    expect(assigned.assignedReviewerRole).toBe(ROLE.MOIP_SUPERVISOR)
  })

  it('supports clarification queue and comparison highlights', async () => {
    const clar = await mockMoipPortalService.getClarificationQueue({ pageSize: 50 })
    expect(clar.items.length).toBeGreaterThan(0)

    const underReview = (
      await mockMoipPortalService.getSubmissionQueue({
        status: SUBMISSION_STATUS.UNDER_REVIEW,
        module: 'finance',
        pageSize: 20,
      })
    ).items[0]
    expect(underReview).toBeTruthy()
    const cmp = await mockMoipPortalService.getComparison(underReview!.submission.id)
    expect(cmp.rulesNote).toContain('25%')
  })

  it('returns submission and creates escalation with task', async () => {
    const under = (
      await mockMoipPortalService.getSubmissionQueue({
        status: SUBMISSION_STATUS.UNDER_REVIEW,
        pageSize: 20,
      })
    ).items.find((r) => r.submission.module === 'finance')
    expect(under).toBeTruthy()

    const returned = await mockMoipPortalService.returnSubmission(
      under!.submission.id,
      ROLE.MOIP_REVIEWER,
      {
        reason: 'Correct subsidy classification',
        affectedItem: 'subsidies',
        dueDate: '2026-08-25',
      },
    )
    expect(returned.status).toBe(SUBMISSION_STATUS.RETURNED)

    const esc = await mockMoipPortalService.createEscalation(ROLE.MOIP_SUPERVISOR, {
      organizationId: 'org-peco',
      reason: 'Test escalation',
      reasonCode: ESCALATION_REASON.OVERDUE_SUBMISSION,
      severity: ESCALATION_SEVERITY.ATTENTION,
      ownerRole: ROLE.MOIP_REVIEWER,
      dueDate: '2026-08-20',
    })
    expect(esc.status).toBe('open')
    const list = await mockMoipPortalService.getEscalations({ status: 'open' })
    expect(list.some((e) => e.id === esc.id)).toBe(true)
  })

  it('exposes reviewer workload and module summaries', async () => {
    const wl = await mockMoipPortalService.getWorkload(ROLE.MOIP_REVIEWER)
    expect(wl.assignedReviews).toBeGreaterThan(0)
    const modules = await mockMoipPortalService.getModuleSummaries('org-usc', 'period-fy2027')
    expect(modules.length).toBeGreaterThan(5)
    expect(modules.some((m) => m.module === 'finance')).toBe(true)
  })

  it('keeps MoIP analyst read-only for review/approve/escalate', () => {
    expect(hasPermission(ROLE.MOIP_ANALYST, PERMISSION.SUBMISSION_REVIEW)).toBe(false)
    expect(hasPermission(ROLE.MOIP_ANALYST, PERMISSION.SUBMISSION_APPROVE)).toBe(false)
    expect(hasPermission(ROLE.MOIP_ANALYST, PERMISSION.ESCALATION_CREATE)).toBe(false)
    expect(hasPermission(ROLE.MOIP_ANALYST, PERMISSION.PORTFOLIO_READ)).toBe(true)
    expect(hasPermission(ROLE.MOIP_REVIEWER, PERMISSION.ESCALATION_CREATE)).toBe(true)
  })

  it('still supports finance golden-path take under review on eligible packs', async () => {
    // Submit PSM if needed is heavy — use PASDEC resubmitted pack
    const row = (
      await mockMoipPortalService.getSubmissionQueue({
        status: SUBMISSION_STATUS.RESUBMITTED,
        module: 'finance',
        pageSize: 10,
      })
    ).items[0]
    expect(row).toBeTruthy()
    const taken = await mockFinanceWorkflowService.takeUnderReview(
      row!.submission.id,
      ROLE.MOIP_REVIEWER,
    )
    expect(taken.status).toBe(SUBMISSION_STATUS.UNDER_REVIEW)
  })
})
