import { describe, expect, it } from 'vitest'
import { MODULE_SECTIONS, isModuleSectionTabActive } from '@/app/config/moduleSections'
import { filterNavigation, getPortalDefinitionForRole, portalDefinitions } from '@/app/config/navigation'
import { ROLE } from '@/constants'
import { getPortalForRole, hasPermission } from '@/permissions'

describe('portal navigation config', () => {
  it('maps Executive Viewer to the MOIP Executive Dashboard Portal without operational modules', () => {
    expect(getPortalForRole(ROLE.EXECUTIVE_VIEWER)).toBe('moip_executive')
    expect(portalDefinitions.moip_executive.name).toBe('MOIP Executive Dashboard Portal')
    expect(portalDefinitions.moip_executive.allowsOperationalEdit).toBe(false)

    const definition = getPortalDefinitionForRole('moip_executive', ROLE.EXECUTIVE_VIEWER)
    const nav = filterNavigation(definition.navigation, ROLE.EXECUTIVE_VIEWER, hasPermission)

    expect(definition.homeRoute).toBe('/moip-executive/dashboard')
    expect(nav.map((item) => item.label)).toEqual([
      'National Dashboard',
      'Search & Intelligence',
    ])

    const labels = JSON.stringify(nav)
    expect(labels).not.toContain('Data Entry')
    expect(labels).not.toContain('User Management')
    expect(labels).not.toContain('SOE Management')
    expect(labels).not.toContain('Logs & Alerts')
  })

  it('keeps SOE Data Entry Portal focused on unchanged reporting forms', () => {
    const nav = filterNavigation(portalDefinitions.soe_entry.navigation, ROLE.SOE_FOCAL_PERSON, hasPermission)
    const labels = JSON.stringify(nav)

    expect(portalDefinitions.soe_entry.name).toBe('SOE Data Entry Portal')
    expect(portalDefinitions.soe_entry.homeRoute).toBe('/soe-entry/dashboard')
    expect(labels).toContain('Submissions & Returns')
    expect(labels).toContain('AI Data Hub')
    expect(labels).not.toContain('Reporting Workspace')
    expect(labels).toContain('Enterprise')
    expect(labels).toContain('Assets & Property')
    expect(labels).toContain('People & Governance')
    expect(labels).toContain('Financial & Fiscal')
    expect(labels).toContain('Accountability & Compliance')
    expect(labels).toContain('Industrial Performance')
    expect(labels).toContain('Privatization & Transformation')
    expect(labels).not.toContain('/soe-entry/finance/form')
    expect(nav.map((item) => item.label).slice(0, 3)).toEqual([
      'Dashboard',
      'Data Entry',
      'AI Data Hub',
    ])
    expect(nav.at(-1)?.label).toBe('Early Warning System')
    expect(nav.find((item) => item.id === 'soe-early-warning')?.children).toBeUndefined()
    expect(labels).not.toContain('Logs & Alerts')

    for (const id of [
      'soe-submissions',
      'soe-enterprise',
      'soe-assets',
      'soe-people',
      'soe-finance',
      'soe-accountability',
      'soe-privatization',
      'soe-documents',
    ]) {
      expect(nav.find((item) => item.id === id)?.children).toBeUndefined()
    }

    expect(MODULE_SECTIONS['soe-assets'].map((tab) => tab.label)).toEqual([
      'Land',
      'Buildings',
      'Machinery',
      'Vehicles',
      'Other Equipment',
    ])
    expect(MODULE_SECTIONS['soe-people'].map((tab) => tab.label)).toEqual([
      'Executive',
      'Board Member',
      'Workforce',
    ])
  })

  it('keeps SOE Reviewer Portal focused on dashboard, approvals and alerts only', () => {
    const definition = getPortalDefinitionForRole('soe_review', ROLE.SOE_CERTIFIER)
    const nav = JSON.stringify(filterNavigation(definition.navigation, ROLE.SOE_CERTIFIER, hasPermission))

    expect(definition.name).toBe('SOE Reviewer Portal')
    expect(definition.homeRoute).toBe('/soe-review/dashboard')
    expect(nav).toContain('Dashboard')
    expect(nav).toContain('Submissions & Approvals')
    expect(nav).toContain('Logs & Alerts')
    expect(nav).not.toContain('SOE Executive Review')
    expect(nav).not.toContain('Certification & Readiness')
    expect(nav).not.toContain('Clarifications')
    expect(nav).not.toContain('Evidence & Documents')
    expect(nav).not.toContain('Reports')
    expect(nav).not.toContain('Assets & Property')
    expect(nav).not.toContain('People & Governance')
    expect(nav).not.toContain('Industrial Performance')
    expect(nav).not.toContain('Privatization & Transformation')
  })

  it('keeps MoIP analyst navigation focused on read/review surfaces only', () => {
    const nav = filterNavigation(
      portalDefinitions.moip_review.navigation,
      ROLE.MOIP_ANALYST,
      hasPermission,
    )
    const labels = JSON.stringify(nav)
    expect(labels).not.toContain('Approvals')
    expect(labels).not.toContain('Portfolio Data')
    expect(labels).not.toContain('SOE Management')
    expect(labels).not.toContain('User Management')
    expect(labels).not.toContain('Users & Access')
    expect(labels).toContain('Oversight Dashboard')
    expect(labels).toContain('SOE Performance Comparison')
    expect(labels).toContain('Search & Intelligence')
    expect(labels).toContain('Logs & Alerts')
  })

  it('exposes a focused MoIP Review shell with submissions, administration and intelligence', () => {
    const reviewerNav = filterNavigation(portalDefinitions.moip_review.navigation, ROLE.MOIP_REVIEWER, hasPermission)
    const supervisorNav = filterNavigation(portalDefinitions.moip_review.navigation, ROLE.MOIP_SUPERVISOR, hasPermission)
    const administratorNav = filterNavigation(portalDefinitions.moip_review.navigation, ROLE.SYSTEM_ADMIN, hasPermission)
    const reviewer = JSON.stringify(reviewerNav)
    const supervisor = JSON.stringify(supervisorNav)
    const administrator = JSON.stringify(administratorNav)
    const soeManagement = reviewerNav.find((item) => item.label === 'SOE Management')

    expect(reviewerNav.map((item) => item.label)).toEqual([
      'Oversight Dashboard',
      'Submissions & Approvals',
      'SOE Management',
      'SOE Performance Comparison',
      'Search & Intelligence',
      'AI Data Hub',
      'Logs & Alerts',
    ])
    expect(soeManagement?.children?.map((item) => item.label)).toEqual([
      'SOE Registry',
      'Users & Access',
      'Account Activity',
    ])
    expect(reviewer).not.toContain('User Management')
    expect(reviewer).not.toContain('Portfolio Data')
    expect(reviewer).not.toContain('Validation & Readiness')
    expect(reviewer).not.toContain('Risk & Benchmarking')
    expect(reviewer).not.toContain('National Asset Map')
    expect(reviewer).not.toContain('Reports')
    expect(supervisor).toContain('SOE Management')
    expect(supervisor).toContain('SOE Performance Comparison')
    expect(supervisor).toContain('SOE Registry')
    expect(supervisor).not.toContain('Users & Access')
    expect(administrator).toContain('SOE Management')
    expect(administrator).toContain('Users & Access')
    expect(administrator).not.toContain('User Management')
  })

  it('highlights only PAC Observations when that section is open under legacy or split SOE routes', () => {
    const tabs = MODULE_SECTIONS['soe-accountability']
    const legacyActive = tabs
      .filter((tab) => isModuleSectionTabActive(tab, '/soe/accountability/audit/pac', tabs))
      .map((tab) => tab.label)
    const splitActive = tabs
      .filter((tab) => isModuleSectionTabActive(tab, '/soe-entry/accountability/audit/pac', tabs))
      .map((tab) => tab.label)
    expect(legacyActive).toEqual(['PAC Observations'])
    expect(splitActive).toEqual(['PAC Observations'])
  })
})
