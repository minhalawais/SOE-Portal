import { describe, expect, it } from 'vitest'
import { filterNavigation, getPortalDefinitionForRole, portalDefinitions } from '@/app/config/navigation'
import { ROLE } from '@/constants'
import { getPortalForRole, hasPermission } from '@/permissions'

function childLabels(group: string) {
  const item = portalDefinitions.minister.navigation.find((nav) => nav.label === group)
  return item?.children?.map((child) => child.label) ?? []
}

describe('portal navigation config', () => {
  it('maps executive viewer to the merged executive portal without edit chrome', () => {
    expect(getPortalForRole(ROLE.EXECUTIVE_VIEWER)).toBe('minister')
    expect(portalDefinitions.minister.name).toBe('Executive Viewer')
    expect(portalDefinitions.minister.allowsOperationalEdit).toBe(false)
    const labels = JSON.stringify(portalDefinitions.minister.navigation)
    expect(labels).toContain('Secretary View')
    expect(labels).toContain('Minister View')
    expect(labels).toContain('PMO View')
  })

  it('exposes the final Executive Viewer sidebar lenses', () => {
    expect(childLabels('Secretary View')).toEqual([
      'Command Centre',
      'Critical Matters',
      'Pending Decisions',
      'Obligations',
      'Compliance & Submissions',
      'Financial Concerns',
      'Governance',
      'Audit & Legal',
      'Escalations',
      'Reports',
    ])
    expect(childLabels('Minister View')).toEqual([
      'Executive Overview',
      'Strategic Alerts',
      'Portfolio Performance',
      'Fiscal Exposure',
      'Asset Intelligence',
      'National Asset Map',
      'Governance Risk',
      'Audit & Legal Risk',
      'Industrial Performance',
      'Privatization & Transformation',
      'Strategic Opportunities',
      'Executive Reports',
    ])
    expect(childLabels('PMO View')).toEqual([
      'Command Dashboard',
      'National Asset Map',
      'Search & Intelligence',
      'Strategic Reports',
    ])
  })

  it('removes duplicated analyst-style pages from Secretary and Minister sidebar lenses', () => {
    expect(childLabels('Secretary View')).not.toContain('Risk Overview')
    expect(childLabels('Secretary View')).not.toContain('Search & Intelligence')
    expect(childLabels('Minister View')).not.toContain('Risk Intelligence')
    expect(childLabels('Minister View')).not.toContain('Search & Intelligence')
  })

  it('hides moip approvals from analyst without approve permission', () => {
    const nav = filterNavigation(
      portalDefinitions.moip.navigation,
      ROLE.MOIP_ANALYST,
      hasPermission,
    )
    const labels = JSON.stringify(nav)
    expect(labels).not.toContain('Approvals')
    expect(labels).toContain('Portfolio Data')
    expect(labels).not.toContain('SOE Management')
    expect(labels).not.toContain('User Management')
  })

  it('exposes one MoIP shell with review, portfolio and permission-scoped administration', () => {
    const reviewer = JSON.stringify(filterNavigation(portalDefinitions.moip.navigation, ROLE.MOIP_REVIEWER, hasPermission))
    const supervisor = JSON.stringify(filterNavigation(portalDefinitions.moip.navigation, ROLE.MOIP_SUPERVISOR, hasPermission))
    const administrator = JSON.stringify(filterNavigation(portalDefinitions.moip.navigation, ROLE.SYSTEM_ADMIN, hasPermission))
    expect(reviewer).toContain('Review & Approval')
    expect(reviewer).toContain('Portfolio Data')
    expect(reviewer).toContain('SOE Management')
    expect(reviewer).toContain('User Management')
    expect(supervisor).toContain('SOE Management')
    expect(administrator).toContain('User Management')
  })

  it('limits SOE Certifier navigation to compliance certification work', () => {
    const definition = getPortalDefinitionForRole('soe', ROLE.SOE_CERTIFIER)
    const nav = JSON.stringify(filterNavigation(definition.navigation, ROLE.SOE_CERTIFIER, hasPermission))

    expect(definition.name).toBe('SOE Compliance Certification')
    expect(nav).toContain('Compliance Data')
    expect(nav).toContain('Evidence & Documents')
    expect(nav).toContain('Submissions & Certification')
    expect(nav).not.toContain('Assets & Property')
    expect(nav).not.toContain('People & Governance')
    expect(nav).not.toContain('Financial & Fiscal')
    expect(nav).not.toContain('Industrial Performance')
    expect(nav).not.toContain('Privatization & Transformation')
  })
})
