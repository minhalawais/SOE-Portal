import { beforeEach, describe, expect, it } from 'vitest'
import {
  ALERT_SEVERITY,
  EARLY_WARNING_RULE,
  ROLE,
  TASK_STATUS,
} from '@/constants'
import { resetMockDb } from '@/mock-data'
import { resetMockRuntime } from '@/mock-data/runtime'
import { mockEarlyWarningService } from '@/mock-services'
import { deriveTaskDisplayStatus } from '@/mock-services/earlyWarning.service'
import { evaluateEarlyWarningRules, listRuleCatalogue } from '@/workflow/earlyWarningRules'
import { db } from '@/mock-data'

describe('Phase 14 early warning & task centre', () => {
  beforeEach(() => {
    resetMockDb()
    resetMockRuntime()
  })

  it('exposes prototype rule catalogue with required rules', () => {
    const rules = listRuleCatalogue()
    const ids = new Set(rules.map((r) => r.id))
    expect(ids.has(EARLY_WARNING_RULE.BOARD_EXPIRY_30)).toBe(true)
    expect(ids.has(EARLY_WARNING_RULE.BOARD_EXPIRY_90)).toBe(true)
    expect(ids.has(EARLY_WARNING_RULE.LOAN_REPAYMENT_OVERDUE)).toBe(true)
    expect(ids.has(EARLY_WARNING_RULE.FINANCE_SUBMISSION_MISSING)).toBe(true)
    expect(rules.every((r) => r.provisional)).toBe(true)
  })

  it('evaluates board expiry and certified-missing finance into alerts/tasks', async () => {
    const result = await mockEarlyWarningService.refreshRules()
    expect(result.alertsUpserted + result.tasksUpserted).toBeGreaterThan(0)

    const alerts = await mockEarlyWarningService.getAlerts({
      role: ROLE.SOE_FOCAL_PERSON,
      pageSize: 200,
    })
    expect(alerts.items.some((a) => a.ruleId === EARLY_WARNING_RULE.BOARD_EXPIRY_30)).toBe(true)
    expect(
      alerts.items.some((a) => a.ruleId === EARLY_WARNING_RULE.FINANCE_SUBMISSION_MISSING),
    ).toBe(true)

    const criticalBoard = alerts.items.find(
      (a) => a.ruleId === EARLY_WARNING_RULE.BOARD_EXPIRY_30 && a.status === 'open',
    )
    expect(criticalBoard?.createsTask).toBe(true)
    expect(criticalBoard?.linkedTaskId).toBeTruthy()
    expect(criticalBoard?.isPrototypeRule).toBe(true)
  })

  it('derives overdue display status from due date', () => {
    expect(
      deriveTaskDisplayStatus({
        id: 't1',
        title: 'Overdue demo',
        dueDate: '2026-07-01',
        priority: 'high',
        status: TASK_STATUS.OPEN,
        ownerRole: ROLE.FINANCE_OFFICER,
      }),
    ).toBe('overdue')
    expect(
      deriveTaskDisplayStatus({
        id: 't2',
        title: 'Done demo',
        dueDate: '2026-07-01',
        priority: 'high',
        status: TASK_STATUS.DONE,
        ownerRole: ROLE.FINANCE_OFFICER,
      }),
    ).toBe('done')
  })

  it('groups alerts for deduplication UX', async () => {
    await mockEarlyWarningService.refreshRules()
    const groups = await mockEarlyWarningService.getAlertGroups(ROLE.MOIP_REVIEWER)
    expect(groups.length).toBeGreaterThan(0)
    expect(groups.some((g) => g.count >= 1 && g.groupKey.length > 0)).toBe(true)
  })

  it('completes task and can resolve linked alert', async () => {
    await mockEarlyWarningService.refreshRules()
    const tasks = await mockEarlyWarningService.getTasks({
      role: ROLE.SOE_FOCAL_PERSON,
      pageSize: 100,
      view: 'mine',
    })
    const withAlert = tasks.items.find((t) => t.sourceAlertId && t.displayStatus !== 'done')
    expect(withAlert).toBeTruthy()

    const done = await mockEarlyWarningService.completeTask(
      withAlert!.id,
      ROLE.SOE_FOCAL_PERSON,
      'Appointment process initiated',
    )
    expect(done.status).toBe(TASK_STATUS.DONE)
    expect(done.resolutionNote).toContain('Appointment')

    const alert = await mockEarlyWarningService.getAlert(withAlert!.sourceAlertId!)
    expect(alert.status).toBe('resolved')
  })

  it('filters senior roles away from operational noise', async () => {
    await mockEarlyWarningService.refreshRules()
    const ministerAlerts = await mockEarlyWarningService.getAlerts({
      role: ROLE.MINISTER,
      pageSize: 100,
      status: 'open',
    })
    expect(ministerAlerts.items.every((a) => a.severity === ALERT_SEVERITY.CRITICAL)).toBe(true)

    const ministerTasks = await mockEarlyWarningService.getTasks({
      role: ROLE.MINISTER,
      pageSize: 50,
    })
    expect(ministerTasks.items.length).toBe(0)

    const secretaryEsc = await mockEarlyWarningService.getEscalations({
      role: ROLE.SECRETARY,
      status: 'open',
    })
    expect(secretaryEsc.length).toBeGreaterThan(0)
  })

  it('resolves alert with note and keeps historical resolved fixture', async () => {
    const resolvedSeed = db.alerts.find((a) => a.id === 'alert-resolved-demo')
    expect(resolvedSeed?.status).toBe('resolved')

    await mockEarlyWarningService.refreshRules()
    const open = (
      await mockEarlyWarningService.getAlerts({
        role: ROLE.SOE_FOCAL_PERSON,
        status: 'open',
        pageSize: 20,
      })
    ).items[0]
    expect(open).toBeTruthy()
    const resolved = await mockEarlyWarningService.resolveAlert(
      open!.id,
      ROLE.SOE_FOCAL_PERSON,
      'Reviewed and closed',
    )
    expect(resolved.status).toBe('resolved')
    expect(resolved.resolutionNote).toContain('Reviewed')
  })

  it('evaluator returns hits without throwing on seed domain data', () => {
    const hits = evaluateEarlyWarningRules({
      boardMembers: db.boardMembers,
      loans: db.loans,
      submissions: db.submissions,
      clarifications: db.clarifications,
      compliance: db.compliance,
      auditParas: db.auditParas,
      assets: db.assets,
      organizations: db.organizations.map((o) => ({
        id: o.id,
        abbreviation: o.abbreviation,
      })),
    })
    expect(Array.isArray(hits)).toBe(true)
    expect(hits.some((h) => h.ruleId === EARLY_WARNING_RULE.BOARD_EXPIRY_30 || h.task)).toBe(true)
  })
})
