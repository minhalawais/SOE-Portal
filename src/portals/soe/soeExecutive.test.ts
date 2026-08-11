import { describe, expect, it } from 'vitest'
import { getPortalDefinitionForRole } from '@/app/config/navigation'
import { PORTAL, ROLE } from '@/constants'
import { getHomeForRole, hasPermission, PERMISSION } from '@/permissions'
import { mockSoeExecutiveService } from '@/mock-services/soeExecutive.service'
import { REPORTING_MODULES } from '@/workflow/moduleCatalog'

describe('SOE Executive intelligence', () => {
  it('uses a dedicated organization-scoped, read-only experience', () => {
    expect(getHomeForRole(ROLE.SOE_EXECUTIVE)).toBe('/soe/executive')
    expect(hasPermission(ROLE.SOE_EXECUTIVE, PERMISSION.EXECUTIVE_DASHBOARD_READ)).toBe(true)
    expect(hasPermission(ROLE.SOE_EXECUTIVE, PERMISSION.FINANCE_READ)).toBe(true)
    expect(hasPermission(ROLE.SOE_EXECUTIVE, PERMISSION.FINANCE_EDIT)).toBe(false)
    expect(hasPermission(ROLE.SOE_EXECUTIVE, PERMISSION.SUBMISSION_CERTIFY)).toBe(false)
    expect(hasPermission(ROLE.SOE_EXECUTIVE, PERMISSION.SENSITIVE_PERSONAL_READ)).toBe(false)

    const definition = getPortalDefinitionForRole(PORTAL.SOE, ROLE.SOE_EXECUTIVE)
    expect(definition.homeRoute).toBe('/soe/executive')
    expect(definition.density).toBe('executive')
    expect(definition.allowsOperationalEdit).toBe(false)
    expect(definition.navigation.map((item) => item.label)).toEqual([
      'Executive Dashboard',
      'Alerts & Decisions',
      'Executive Reports',
      'Search & Intelligence',
    ])
  })

  it('aggregates every reporting module without exposing personal records', async () => {
    const dashboard = await mockSoeExecutiveService.getDashboard('org-psm', 'period-fy2027')

    expect(dashboard.organization.id).toBe('org-psm')
    expect(dashboard.modulePulse).toHaveLength(REPORTING_MODULES.length)
    expect(new Set(dashboard.modulePulse.map((module) => module.id))).toEqual(
      new Set(REPORTING_MODULES.map((module) => module.id)),
    )
    expect(dashboard.scoreComponents).toHaveLength(5)
    expect(dashboard.score).toBeGreaterThanOrEqual(0)
    expect(dashboard.score).toBeLessThanOrEqual(100)
    expect(dashboard.people).not.toHaveProperty('employeesList')
    expect(dashboard.people).not.toHaveProperty('salary')
  })
})
