import { describe, expect, it } from 'vitest'
import { MODULE_SECTIONS, isModuleSectionTabActive } from '@/app/config/moduleSections'
import { filterNavigation, getPortalDefinitionForRole, portalDefinitions } from '@/app/config/navigation'
import { ROLE } from '@/constants'
import { getPortalForRole, hasPermission } from '@/permissions'

function childLabels(group: string) {
  const item = portalDefinitions.minister.navigation.find((nav) => nav.label === group)
  return item?.children?.map((child) => child.label) ?? []
}

describe('portal navigation config', () => {
  it('maps executive viewer to the merged executive portal with operational edit on SOE modules', () => {
    expect(getPortalForRole(ROLE.EXECUTIVE_VIEWER)).toBe('minister')
    expect(portalDefinitions.minister.name).toBe('Executive Viewer')
    expect(portalDefinitions.minister.allowsOperationalEdit).toBe(false)
    const definition = getPortalDefinitionForRole('minister', ROLE.EXECUTIVE_VIEWER)
    expect(definition.allowsOperationalEdit).toBe(true)
    const labels = JSON.stringify(portalDefinitions.minister.navigation)
    expect(labels).toContain('Secretary View')
    expect(labels).toContain('Minister View')
    expect(labels).toContain('PMO View')
  })

  it('shows National Dashboard and SOE contributor modules for executive viewer', () => {
    const definition = getPortalDefinitionForRole('minister', ROLE.EXECUTIVE_VIEWER)
    const nav = filterNavigation(definition.navigation, ROLE.EXECUTIVE_VIEWER, hasPermission)
    expect(nav.map((item) => item.label)).toEqual([
      'National Dashboard',
      'Search & Intelligence',
      'Data Entry',
      'User Management',
      'Logs & Alerts',
      'Reports',
    ])
    expect(nav[0]?.route).toBe('/pmo/dashboard')
    const dataEntry = nav.find((item) => item.label === 'Data Entry')
    expect(dataEntry?.children?.map((item) => item.label)).toEqual([
      'Enterprise',
      'Assets & Property',
      'People & Governance',
      'Financial & Fiscal',
      'Accountability & Compliance',
      'Industrial Performance',
      'Privatization & Transformation',
      'Documents',
      'Submissions & Approvals',
    ])
    expect(dataEntry?.children?.find((item) => item.label === 'Enterprise')?.route).toBe(
      '/soe/enterprise/profile',
    )
    const assets = dataEntry?.children?.find((item) => item.label === 'Assets & Property')
    expect(assets?.route).toBe('/soe/assets/land')
    expect(assets?.children).toBeUndefined()
    expect(MODULE_SECTIONS['soe-assets'].map((tab) => tab.label)).toEqual([
      'Land',
      'Buildings',
      'Machinery',
      'Vehicles',
      'Other Equipment',
    ])
    const people = dataEntry?.children?.find((item) => item.label === 'People & Governance')
    expect(people?.route).toBe('/soe/people/executives')
    expect(people?.children).toBeUndefined()
    expect(MODULE_SECTIONS['soe-people'].map((tab) => tab.label)).toEqual([
      'Executive',
      'Board Member',
      'Workforce',
    ])
    expect(dataEntry?.children?.find((item) => item.label === 'Financial & Fiscal')?.children).toBeUndefined()
    expect(
      dataEntry?.children?.find((item) => item.label === 'Submissions & Approvals')?.children?.map(
        (item) => item.label,
      ),
    ).toEqual([
      'Reporting Workspace',
      'Clarifications',
      'Validation & Readiness',
      'Submission Readiness',
    ])
  })

  it('shows National Dashboard and SOE contributor modules in PMO portal sidebar', () => {
    const nav = filterNavigation(portalDefinitions.pmo.navigation, ROLE.PMO, hasPermission)
    expect(nav.map((item) => item.label)).toEqual([
      'National Dashboard',
      'Search & Intelligence',
      'Data Entry',
      'Logs & Alerts',
      'Reports',
    ])
    expect(nav.find((item) => item.label === 'Data Entry')?.children?.map((item) => item.label)).toEqual([
      'Enterprise',
      'Assets & Property',
      'People & Governance',
      'Financial & Fiscal',
      'Accountability & Compliance',
      'Industrial Performance',
      'Privatization & Transformation',
      'Documents',
      'Submissions & Approvals',
    ])
  })

  it('exposes the final Executive Viewer sidebar lenses in minister portal config', () => {
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

  it('highlights only PAC Observations when that section is open', () => {
    const tabs = MODULE_SECTIONS['soe-accountability']
    const active = tabs
      .filter((tab) => isModuleSectionTabActive(tab, '/soe/accountability/audit/pac', tabs))
      .map((tab) => tab.label)
    expect(active).toEqual(['PAC Observations'])
  })
})
