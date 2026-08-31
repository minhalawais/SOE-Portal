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
    expect(getPortalForRole(ROLE.MOIP_REVIEWER)).toBe('moip_review')
    expect(getPortalForRole(ROLE.EXECUTIVE_VIEWER)).toBe('moip_executive')
    expect(getPortalForRole(ROLE.SOE_FOCAL_PERSON)).toBe('soe_entry')
    expect(getPortalForRole(ROLE.SYSTEM_ADMIN)).toBe('moip_review')
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
    expect(DEMO_ROLES).toContain(ROLE.SECRETARY)
    expect(DEMO_ROLES).toContain(ROLE.MINISTER)
    expect(DEMO_ROLES).toContain(ROLE.PMO)
  })

  it('keeps executive office roles distinct for portal routing', () => {
    expect(normalizeRole(ROLE.SECRETARY)).toBe(ROLE.SECRETARY)
    expect(normalizeRole(ROLE.MINISTER)).toBe(ROLE.MINISTER)
    expect(normalizeRole(ROLE.PMO)).toBe(ROLE.PMO)
  })

  it('normalizes Assurance User but preserves System Administrator', () => {
    expect(normalizeRole(ROLE.ASSURANCE_USER)).toBe(ROLE.MOIP_REVIEWER)
    expect(normalizeRole(ROLE.SYSTEM_ADMIN)).toBe(ROLE.SYSTEM_ADMIN)
  })

  it('keeps Executive Viewer inside executive dashboard namespaces', () => {
    expect(canRoleAccessPortal(ROLE.EXECUTIVE_VIEWER, PORTAL.MOIP_EXECUTIVE)).toBe(true)
    expect(canRoleAccessPortal(ROLE.EXECUTIVE_VIEWER, PORTAL.SECRETARY)).toBe(true)
    expect(canRoleAccessPortal(ROLE.EXECUTIVE_VIEWER, PORTAL.MINISTER)).toBe(true)
    expect(canRoleAccessPortal(ROLE.EXECUTIVE_VIEWER, PORTAL.PMO)).toBe(true)
    expect(canRoleAccessPortal(ROLE.EXECUTIVE_VIEWER, PORTAL.SOE_ENTRY)).toBe(false)
    expect(canRoleAccessPortal(ROLE.EXECUTIVE_VIEWER, PORTAL.SOE_REVIEW)).toBe(false)
    expect(canRoleAccessPortal(ROLE.EXECUTIVE_VIEWER, PORTAL.MOIP_REVIEW)).toBe(false)
    expect(canRoleAccessPortal(ROLE.EXECUTIVE_VIEWER, PORTAL.SOE)).toBe(false)
    expect(canRoleAccessPortal(ROLE.EXECUTIVE_VIEWER, PORTAL.MOIP)).toBe(false)
  })

  it('allows SOE Focal Person demo account to open all separated portal links', () => {
    expect(canRoleAccessPortal(ROLE.SOE_FOCAL_PERSON, PORTAL.SOE_ENTRY)).toBe(true)
    expect(canRoleAccessPortal(ROLE.SOE_FOCAL_PERSON, PORTAL.SOE_REVIEW)).toBe(true)
    expect(canRoleAccessPortal(ROLE.SOE_FOCAL_PERSON, PORTAL.MOIP_REVIEW)).toBe(true)
    expect(canRoleAccessPortal(ROLE.SOE_FOCAL_PERSON, PORTAL.MOIP_EXECUTIVE)).toBe(true)
  })

  it('keeps Executive Viewer read-only', () => {
    expect(hasPermission(ROLE.EXECUTIVE_VIEWER, PERMISSION.PORTFOLIO_READ)).toBe(true)
    expect(hasPermission(ROLE.EXECUTIVE_VIEWER, PERMISSION.EXECUTIVE_DASHBOARD_READ)).toBe(true)
    expect(hasPermission(ROLE.EXECUTIVE_VIEWER, PERMISSION.SUBMISSION_SUBMIT)).toBe(false)
    expect(hasPermission(ROLE.EXECUTIVE_VIEWER, PERMISSION.SUBMISSION_CERTIFY)).toBe(false)
    expect(hasPermission(ROLE.EXECUTIVE_VIEWER, PERMISSION.FINANCE_EDIT)).toBe(false)
    expect(hasPermission(ROLE.EXECUTIVE_VIEWER, PERMISSION.ASSETS_EDIT)).toBe(false)
    expect(hasPermission(ROLE.EXECUTIVE_VIEWER, PERMISSION.COMPLIANCE_EDIT)).toBe(false)
    expect(hasPermission(ROLE.EXECUTIVE_VIEWER, PERMISSION.DOCUMENT_UPLOAD)).toBe(false)
    expect(hasPermission(ROLE.EXECUTIVE_VIEWER, PERMISSION.USER_READ)).toBe(false)
    expect(hasPermission(ROLE.EXECUTIVE_VIEWER, PERMISSION.USER_MANAGE)).toBe(false)
    expect(hasPermission(ROLE.EXECUTIVE_VIEWER, PERMISSION.AUDIT_LOG_READ)).toBe(false)
  })

  it('exposes performance comparison to MoIP roles and the cross-portal focal demo account', () => {
    expect(hasPermission(ROLE.MOIP_REVIEWER, PERMISSION.PERFORMANCE_COMPARISON_READ)).toBe(true)
    expect(hasPermission(ROLE.MOIP_ANALYST, PERMISSION.PERFORMANCE_COMPARISON_READ)).toBe(true)
    expect(hasPermission(ROLE.MOIP_SUPERVISOR, PERMISSION.PERFORMANCE_COMPARISON_READ)).toBe(true)
    expect(hasPermission(ROLE.SOE_FOCAL_PERSON, PERMISSION.PERFORMANCE_COMPARISON_READ)).toBe(true)
    expect(hasPermission(ROLE.EXECUTIVE_VIEWER, PERMISSION.PERFORMANCE_COMPARISON_READ)).toBe(false)
  })

  it('allows controlled AI import for SOE entry and MOIP review roles only', () => {
    expect(hasPermission(ROLE.SOE_FOCAL_PERSON, PERMISSION.AI_IMPORT_USE)).toBe(true)
    expect(hasPermission(ROLE.FINANCE_OFFICER, PERMISSION.AI_IMPORT_USE)).toBe(true)
    expect(hasPermission(ROLE.MOIP_REVIEWER, PERMISSION.AI_IMPORT_USE)).toBe(true)
    expect(hasPermission(ROLE.MOIP_SUPERVISOR, PERMISSION.AI_IMPORT_USE)).toBe(true)
    expect(hasPermission(ROLE.MOIP_ANALYST, PERMISSION.AI_IMPORT_USE)).toBe(false)
    expect(hasPermission(ROLE.EXECUTIVE_VIEWER, PERMISSION.AI_IMPORT_USE)).toBe(false)
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
