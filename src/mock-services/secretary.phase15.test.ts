import { beforeEach, describe, expect, it } from 'vitest'
import { ROLE } from '@/constants'
import { db, resetMockDb } from '@/mock-data'
import { resetMockRuntime } from '@/mock-data/runtime'
import { mockSecretaryPortalService } from '@/mock-services'
import { hasPermission, PERMISSION } from '@/permissions'

describe('Phase 15 Secretary Command Centre', () => {
  beforeEach(() => {
    resetMockDb()
    resetMockRuntime()
  })

  it('builds command summary answering attention counts', async () => {
    const summary = await mockSecretaryPortalService.getCommandSummary()
    expect(summary.asOf).toBeTruthy()
    expect(summary.critical + summary.attention + summary.pendingDecision).toBeGreaterThan(0)
    expect(summary.escalated).toBeGreaterThanOrEqual(0)
  })

  it('sorts priority queue by severity then age', async () => {
    const page = await mockSecretaryPortalService.getPriorityQueue({ pageSize: 100 })
    expect(page.items.length).toBeGreaterThan(0)
    const rank = (s: string) => (s === 'critical' ? 0 : s === 'attention' ? 1 : 2)
    for (let i = 1; i < page.items.length; i++) {
      const prev = page.items[i - 1]!
      const cur = page.items[i]!
      const sr = rank(prev.severity) - rank(cur.severity)
      expect(sr).toBeLessThanOrEqual(0)
      if (sr === 0) expect(prev.ageDays).toBeGreaterThanOrEqual(cur.ageDays)
    }
  })

  it('exposes critical matters and empty-critical path is stable', async () => {
    const critical = await mockSecretaryPortalService.getCriticalMatters()
    expect(Array.isArray(critical)).toBe(true)
    critical.forEach((c) => expect(c.severity).toBe('critical'))
  })

  it('lists pending decisions and supports acknowledge/assign/escalate', async () => {
    const list = await mockSecretaryPortalService.getPendingDecisions({ pageSize: 20 })
    expect(list.items.length).toBeGreaterThanOrEqual(2)
    const open = list.items.find((d) => d.status === 'open')
    expect(open).toBeTruthy()

    const ack = await mockSecretaryPortalService.acknowledgeDecision(open!.id, ROLE.SECRETARY)
    expect(ack.status).toBe('under_consideration')
    expect(ack.acknowledgedAt).toBeTruthy()

    const assigned = await mockSecretaryPortalService.assignDecision(
      open!.id,
      ROLE.SECRETARY,
      'Finance Wing — SO',
    )
    expect(assigned.assignedTo).toBe('Finance Wing — SO')
    expect(db.tasks.some((t) => t.linkedRecordId === open!.id)).toBe(true)

    const esc = await mockSecretaryPortalService.escalateDecisionToMinister(
      open!.id,
      ROLE.SECRETARY,
      'Needs Minister view',
    )
    expect(esc.ownerRole).toBe(ROLE.MINISTER)
    expect(esc.escalationLevel).toBe(3)
    const decision = await mockSecretaryPortalService.getPendingDecision(open!.id)
    expect(decision.status).toBe('deferred')
  })

  it('blocks non-secretary from escalating decisions to Minister', async () => {
    const open = (await mockSecretaryPortalService.getPendingDecisions({ pageSize: 5 })).items.find(
      (d) => d.status === 'open',
    )
    expect(open).toBeTruthy()
    await expect(
      mockSecretaryPortalService.escalateDecisionToMinister(open!.id, ROLE.MOIP_REVIEWER),
    ).rejects.toMatchObject({ code: 'PERMISSION' })
  })

  it('builds obligations, delayed compliance, finance, board, audit, litigation', async () => {
    const obl = await mockSecretaryPortalService.getUpcomingObligations(90)
    expect(obl.length).toBeGreaterThan(0)

    const delayed = await mockSecretaryPortalService.getDelayedCompliance()
    expect(Array.isArray(delayed)).toBe(true)

    const finance = await mockSecretaryPortalService.getFinancialConcerns()
    expect(finance.length).toBeGreaterThan(0)

    const board = await mockSecretaryPortalService.getBoardGovernance()
    expect(board.length).toBeGreaterThan(0)

    const audit = await mockSecretaryPortalService.getAuditExposure()
    expect(Array.isArray(audit)).toBe(true)

    const lit = await mockSecretaryPortalService.getMajorLitigation()
    expect(Array.isArray(lit)).toBe(true)

    const subs = await mockSecretaryPortalService.getSubmissionCompliance()
    expect(subs.length).toBeGreaterThan(0)
  })

  it('includes resolved escalation for balance fixtures', async () => {
    const queue = await mockSecretaryPortalService.getEscalationQueue()
    expect(queue.some((e) => e.status === 'resolved')).toBe(true)
    expect(queue.some((e) => e.status === 'open')).toBe(true)
  })

  it('Secretary role remains read-scoped without operational edit permission', () => {
    expect(hasPermission(ROLE.SECRETARY, PERMISSION.EXECUTIVE_DASHBOARD_READ)).toBe(true)
    expect(hasPermission(ROLE.SECRETARY, PERMISSION.SUBMISSION_APPROVE)).toBe(false)
    expect(hasPermission(ROLE.SECRETARY, PERMISSION.FINANCE_EDIT)).toBe(false)
  })
})
