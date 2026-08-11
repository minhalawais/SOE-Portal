import { describe, expect, it } from 'vitest'
import { DEMO_ROLES, hasPermission, getPortalForRole, PERMISSION } from '@/permissions'
import { PORTAL, ROLE } from '@/constants'
import { formatCurrencyPkr } from '@/utils'
import { canRoleAccessPortal } from '@/app/router/access'
import { normalizeRole } from '@/state/session'

describe('permissions', () => {
  it('maps finance officer permissions', () => {
    expect(hasPermission(ROLE.FINANCE_OFFICER, PERMISSION.FINANCE_EDIT)).toBe(true)
    expect(hasPermission(ROLE.FINANCE_OFFICER, PERMISSION.SUBMISSION_APPROVE)).toBe(false)
  })

  it('routes roles to portals', () => {
    expect(getPortalForRole(ROLE.MOIP_REVIEWER)).toBe('moip')
    expect(getPortalForRole(ROLE.EXECUTIVE_VIEWER)).toBe('minister')
    expect(getPortalForRole(ROLE.SOE_FOCAL_PERSON)).toBe('soe')
    expect(getPortalForRole(ROLE.SYSTEM_ADMIN)).toBe('moip')
  })

  it('gives the MoIP Reviewer review, SOE registry and identity administration permissions', () => {
    expect(hasPermission(ROLE.MOIP_REVIEWER, PERMISSION.SUBMISSION_APPROVE)).toBe(true)
    expect(hasPermission(ROLE.MOIP_REVIEWER, PERMISSION.ORGANIZATION_MANAGE)).toBe(true)
    expect(hasPermission(ROLE.MOIP_REVIEWER, PERMISSION.USER_READ)).toBe(true)
    expect(hasPermission(ROLE.MOIP_REVIEWER, PERMISSION.USER_MANAGE)).toBe(true)
    expect(hasPermission(ROLE.MOIP_REVIEWER, PERMISSION.AUDIT_LOG_READ)).toBe(true)
    expect(hasPermission(ROLE.MOIP_SUPERVISOR, PERMISSION.ORGANIZATION_MANAGE)).toBe(true)
    expect(hasPermission(ROLE.MOIP_SUPERVISOR, PERMISSION.USER_MANAGE)).toBe(false)
    expect(hasPermission(ROLE.SYSTEM_ADMIN, PERMISSION.USER_MANAGE)).toBe(true)
  })

  it('keeps Assurance User and System Administrator out of the selectable demo roles', () => {
    expect(DEMO_ROLES).toContain(ROLE.EXECUTIVE_VIEWER)
    expect(DEMO_ROLES).not.toContain(ROLE.ASSURANCE_USER)
    expect(DEMO_ROLES).not.toContain(ROLE.SYSTEM_ADMIN)
    expect(DEMO_ROLES).not.toContain(ROLE.SECRETARY)
    expect(DEMO_ROLES).not.toContain(ROLE.MINISTER)
    expect(DEMO_ROLES).not.toContain(ROLE.PMO)
  })

  it('normalizes legacy executive office roles to Executive Viewer', () => {
    expect(normalizeRole(ROLE.SECRETARY)).toBe(ROLE.EXECUTIVE_VIEWER)
    expect(normalizeRole(ROLE.MINISTER)).toBe(ROLE.EXECUTIVE_VIEWER)
    expect(normalizeRole(ROLE.PMO)).toBe(ROLE.EXECUTIVE_VIEWER)
  })

  it('normalizes Assurance User and System Administrator to MoIP Reviewer', () => {
    expect(normalizeRole(ROLE.ASSURANCE_USER)).toBe(ROLE.MOIP_REVIEWER)
    expect(normalizeRole(ROLE.SYSTEM_ADMIN)).toBe(ROLE.MOIP_REVIEWER)
  })

  it('allows Executive Viewer to access executive route namespaces', () => {
    expect(canRoleAccessPortal(ROLE.EXECUTIVE_VIEWER, PORTAL.SECRETARY)).toBe(true)
    expect(canRoleAccessPortal(ROLE.EXECUTIVE_VIEWER, PORTAL.MINISTER)).toBe(true)
    expect(canRoleAccessPortal(ROLE.EXECUTIVE_VIEWER, PORTAL.PMO)).toBe(true)
    expect(canRoleAccessPortal(ROLE.EXECUTIVE_VIEWER, PORTAL.SOE)).toBe(false)
  })

  it('keeps Executive Viewer read-only', () => {
    expect(hasPermission(ROLE.EXECUTIVE_VIEWER, PERMISSION.PORTFOLIO_READ)).toBe(true)
    expect(hasPermission(ROLE.EXECUTIVE_VIEWER, PERMISSION.EXECUTIVE_DASHBOARD_READ)).toBe(true)
    expect(hasPermission(ROLE.EXECUTIVE_VIEWER, PERMISSION.SUBMISSION_APPROVE)).toBe(false)
    expect(hasPermission(ROLE.EXECUTIVE_VIEWER, PERMISSION.SUBMISSION_CERTIFY)).toBe(false)
    expect(hasPermission(ROLE.EXECUTIVE_VIEWER, PERMISSION.SUBMISSION_SUBMIT)).toBe(false)
    expect(hasPermission(ROLE.EXECUTIVE_VIEWER, PERMISSION.FINANCE_EDIT)).toBe(false)
    expect(hasPermission(ROLE.EXECUTIVE_VIEWER, PERMISSION.ASSETS_EDIT)).toBe(false)
  })

  it('keeps legacy SOE data contributor out of the selectable demo roles', () => {
    expect(DEMO_ROLES).toContain(ROLE.SOE_FOCAL_PERSON)
    expect(DEMO_ROLES).not.toContain(ROLE.SOE_DATA_CONTRIBUTOR)
  })

  it('keeps SOE Certifier scoped to compliance certification work', () => {
    expect(hasPermission(ROLE.SOE_CERTIFIER, PERMISSION.ACCOUNTABILITY_READ)).toBe(true)
    expect(hasPermission(ROLE.SOE_CERTIFIER, PERMISSION.COMPLIANCE_EDIT)).toBe(true)
    expect(hasPermission(ROLE.SOE_CERTIFIER, PERMISSION.DOCUMENT_READ)).toBe(true)
    expect(hasPermission(ROLE.SOE_CERTIFIER, PERMISSION.SUBMISSION_CERTIFY)).toBe(true)
    expect(hasPermission(ROLE.SOE_CERTIFIER, PERMISSION.ASSETS_READ)).toBe(false)
    expect(hasPermission(ROLE.SOE_CERTIFIER, PERMISSION.FINANCE_READ)).toBe(false)
    expect(hasPermission(ROLE.SOE_CERTIFIER, PERMISSION.WORKFORCE_READ)).toBe(false)
    expect(hasPermission(ROLE.SOE_CERTIFIER, PERMISSION.SUBMISSION_SUBMIT)).toBe(false)
  })
})

describe('formatters', () => {
  it('formats PKR currency compactly by default', () => {
    expect(formatCurrencyPkr(1_000)).toBe('PKR 1K')
    expect(formatCurrencyPkr(12_400_000)).toBe('PKR 12.4M')
    expect(formatCurrencyPkr(1_800_000_000)).toBe('PKR 1.8B')
  })

  it('formats exact PKR currency when requested', () => {
    expect(formatCurrencyPkr(12_400_000, { mode: 'exact' })).toBe('PKR 12,400,000')
  })
})
