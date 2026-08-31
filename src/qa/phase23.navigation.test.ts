import { describe, expect, it } from 'vitest'
import {
  filterNavigation,
  flattenNavigation,
  portalDefinitions,
} from '@/app/config/navigation'
import { implementedRoutes } from '@/app/router/implementedRoutes'
import { ROLE, type PortalId } from '@/constants'
import { hasPermission } from '@/permissions'

const portals = Object.keys(portalDefinitions) as PortalId[]

function isParametric(route: string): boolean {
  return route.includes(':')
}

function matchesImplemented(route: string): boolean {
  if (implementedRoutes.has(route)) return true
  // Parametric catalogue entries (e.g. /soe/tasks/:taskId) cover concrete deep links.
  for (const impl of implementedRoutes) {
    if (!isParametric(impl)) continue
    const pattern = '^' + impl.replace(/:[^/]+/g, '[^/]+') + '$'
    if (new RegExp(pattern).test(route)) return true
  }
  return false
}

describe('Phase 23 navigation catalogue', () => {
  it('registers core portal homes as implemented', () => {
    for (const home of [
      '/soe-entry/dashboard',
      '/soe-review/dashboard',
      '/moip-review/dashboard',
      '/moip-executive/dashboard',
      '/assurance/dashboard',
    ]) {
      expect(implementedRoutes.has(home)).toBe(true)
    }
  })

  it('covers leaf navigation routes or documents them as placeholders', () => {
    const uncovered: string[] = []
    for (const portal of portals) {
      const leaves = flattenNavigation(portalDefinitions[portal].navigation).filter(
        (i) => !i.children?.length,
      )
      for (const item of leaves) {
        if (!matchesImplemented(item.route) && !isParametric(item.route)) {
          // Placeholder routes are allowed for unfinished nav entries; record for visibility.
          uncovered.push(item.route)
        }
      }
    }
    // Phase 23 gate: critical stakeholder routes must not be placeholders.
    const critical = [
      '/soe-entry/submissions',
      '/soe-entry/finance/form',
      '/soe-review/readiness',
      '/moip-review/submissions',
      '/moip-review/approvals',
      '/moip-executive/indicators',
      '/soe-entry/map',
      '/moip-review/search',
      '/moip-executive/reports',
    ]
    for (const route of critical) {
      expect(implementedRoutes.has(route), `critical route missing: ${route}`).toBe(true)
      expect(uncovered.includes(route)).toBe(false)
    }
  })

  it('filters MoIP approvals from analyst navigation', () => {
    const nav = filterNavigation(
      portalDefinitions.moip_review.navigation,
      ROLE.MOIP_ANALYST,
      hasPermission,
    )
    const blob = JSON.stringify(nav)
    expect(blob).not.toContain('Approvals')
  })

  it('keeps executive dashboard portals non-operational-edit', () => {
    expect(portalDefinitions.moip_executive.allowsOperationalEdit).toBe(false)
    expect(portalDefinitions.pmo.allowsOperationalEdit).toBe(false)
    expect(portalDefinitions.minister.allowsOperationalEdit).toBe(false)
    expect(portalDefinitions.secretary.allowsOperationalEdit).toBe(false)
  })

  it('keeps hidden executive compatibility routes implemented', () => {
    expect(implementedRoutes.has('/secretary/intelligence')).toBe(true)
    expect(implementedRoutes.has('/secretary/search')).toBe(true)
    expect(implementedRoutes.has('/minister/intelligence')).toBe(true)
    expect(implementedRoutes.has('/minister/search')).toBe(true)
  })

  it('exposes SOE demo controls only under SOE prototype tooling', () => {
    expect(implementedRoutes.has('/soe-entry/demo-controls')).toBe(true)
    expect(implementedRoutes.has('/moip-review/demo-controls')).toBe(false)
  })
})
