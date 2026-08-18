import { describe, expect, it, beforeEach } from 'vitest'
import { ROLE, SUBMISSION_STATUS } from '@/constants'
import { resetMockDb } from '@/mock-data'
import { resetMockRuntime } from '@/mock-data/runtime'
import { mockSoePortalService } from '@/mock-services'
import { modulesForRole, REPORTING_MODULES } from '@/workflow/moduleCatalog'
import { getPortalDefinitionForRole } from '@/app/config/navigation'

describe('Phase 6 SOE portal', () => {
  beforeEach(() => {
    resetMockDb()
    resetMockRuntime()
  })

  it('exposes all reporting modules in the catalogue', () => {
    expect(REPORTING_MODULES.length).toBeGreaterThanOrEqual(12)
  })

  it('exposes all modules to practical SOE personas', () => {
    const contributor = modulesForRole(ROLE.SOE_FOCAL_PERSON)
    expect(contributor.length).toBe(REPORTING_MODULES.length)
    expect(contributor.every((m) => m.ownerRole === ROLE.SOE_FOCAL_PERSON)).toBe(true)
  })

  it('limits SOE Certifier reporting scope to compliance evidence work', async () => {
    const modules = modulesForRole(ROLE.SOE_CERTIFIER)
    expect(modules.map((m) => m.id)).toEqual(['compliance', 'documents'])

    const dash = await mockSoePortalService.getDashboard(
      'org-psm',
      'period-fy2027',
      ROLE.SOE_CERTIFIER,
    )
    expect(dash.modules.map((m) => m.def.id)).toEqual(['compliance', 'documents'])
  })

  it('builds a task-first dashboard with completion', async () => {
    const dash = await mockSoePortalService.getDashboard(
      'org-psm',
      'period-fy2027',
      ROLE.SOE_FOCAL_PERSON,
    )
    expect(dash.overallCompletion).toBeGreaterThanOrEqual(0)
    expect(dash.modules.length).toBe(REPORTING_MODULES.length)
    expect(dash.pendingActions.length).toBeGreaterThan(0)
    expect(dash.deadlines.length).toBeGreaterThan(0)
  })

  it('prioritizes certification actions for CFO', async () => {
    // Force one module ready for certification
    const { db } = await import('@/mock-data')
    const sub = db.submissions.find(
      (s) => s.organizationId === 'org-psm' && s.module === 'finance',
    )!
    const idx = db.submissions.findIndex((s) => s.id === sub.id)
    db.submissions[idx] = {
      ...db.submissions[idx],
      status: SUBMISSION_STATUS.READY_FOR_CERTIFICATION,
    }
    const dash = await mockSoePortalService.getDashboard(
      'org-psm',
      'period-fy2027',
      ROLE.CFO,
    )
    expect(dash.pendingActions.some((a) => a.title.startsWith('Certify'))).toBe(true)
  })

  it('blocks period submission when readiness fails', async () => {
    await expect(
      mockSoePortalService.confirmPeriodSubmission(
        'org-psm',
        'period-fy2027',
        ROLE.SOE_FOCAL_PERSON,
      ),
    ).rejects.toMatchObject({ code: 'VALIDATION' })
  })

  it('runs import simulation without real parsing', async () => {
    const result = await mockSoePortalService.simulateImport(
      'org-psm',
      'assets',
      'assets-template.xlsx',
    )
    expect(result.accepted).toBeGreaterThan(0)
    expect(result.message).toContain('Demo')
  })

  it('searches modules and documents', async () => {
    const hits = await mockSoePortalService.search('org-psm', 'finance')
    expect(hits.some((h) => h.type === 'module')).toBe(true)
  })

  it('hides finance analytics routes from contributor navigation', () => {
    const def = getPortalDefinitionForRole('soe', ROLE.SOE_FOCAL_PERSON)
    const finance = def.navigation.find((n) => n.id === 'soe-finance')
    const routes = (finance?.children ?? []).map((c) => c.route)
    expect(routes).not.toContain('/soe/finance/performance')
    expect(routes).not.toContain('/soe/finance/budget')
    expect(routes).not.toContain('/soe/finance/statements')
    expect(routes).not.toContain('/soe/finance/exposure')
    expect(routes).not.toContain('/soe/finance/compare')
    expect(routes).toContain('/soe/finance/form')
  })

  it('keeps module stats on dashboard and reporting only', async () => {
    const dash = await mockSoePortalService.getDashboard(
      'org-psm',
      'period-fy2027',
      ROLE.SOE_FOCAL_PERSON,
    )
    expect(dash.overallCompletion).toBeGreaterThanOrEqual(0)
    expect(dash.modules.every((m) => typeof m.submission.completeness === 'number')).toBe(true)
  })
})
