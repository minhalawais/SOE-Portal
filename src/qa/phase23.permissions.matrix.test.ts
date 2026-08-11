import { describe, expect, it } from 'vitest'
import { ROLE, type RoleId } from '@/constants'
import {
  DEMO_ROLES,
  getPermissionsForRole,
  getPortalForRole,
  hasPermission,
  PERMISSION,
  type Permission,
} from '@/permissions'

/** Phase 23 — formal Role × Permission matrix (core stakeholder boundaries). */
const mustHave: Partial<Record<RoleId, Permission[]>> = {
  [ROLE.SOE_FOCAL_PERSON]: [
    PERMISSION.SUBMISSION_SUBMIT,
    PERMISSION.FINANCE_EDIT,
    PERMISSION.ASSETS_EDIT,
    PERMISSION.WORKFORCE_EDIT,
    PERMISSION.BOARD_EDIT,
  ],
  [ROLE.FINANCE_OFFICER]: [PERMISSION.FINANCE_EDIT],
  [ROLE.CFO]: [PERMISSION.SUBMISSION_CERTIFY, PERMISSION.FINANCE_EDIT],
  [ROLE.CEO]: [PERMISSION.SUBMISSION_CERTIFY, PERMISSION.SUBMISSION_SUBMIT],
  [ROLE.HR_OFFICER]: [PERMISSION.SENSITIVE_PERSONAL_READ, PERMISSION.WORKFORCE_EDIT],
  [ROLE.MOIP_REVIEWER]: [
    PERMISSION.SUBMISSION_REVIEW,
    PERMISSION.SUBMISSION_APPROVE,
    PERMISSION.CLARIFICATION_CREATE,
  ],
  [ROLE.MOIP_ANALYST]: [PERMISSION.PORTFOLIO_READ, PERMISSION.FINANCE_READ],
  [ROLE.SECRETARY]: [PERMISSION.EXECUTIVE_DASHBOARD_READ, PERMISSION.PORTFOLIO_READ],
  [ROLE.MINISTER]: [PERMISSION.EXECUTIVE_DASHBOARD_READ, PERMISSION.PORTFOLIO_READ],
  [ROLE.PMO]: [PERMISSION.EXECUTIVE_DASHBOARD_READ, PERMISSION.PORTFOLIO_READ],
  [ROLE.ASSURANCE_USER]: [PERMISSION.DOCUMENT_READ, PERMISSION.ORGANIZATION_READ],
}

const mustNotHave: Partial<Record<RoleId, Permission[]>> = {
  [ROLE.FINANCE_OFFICER]: [PERMISSION.SUBMISSION_CERTIFY, PERMISSION.SUBMISSION_APPROVE],
  [ROLE.MOIP_ANALYST]: [PERMISSION.SUBMISSION_APPROVE, PERMISSION.SUBMISSION_SUBMIT],
  [ROLE.SECRETARY]: [
    PERMISSION.SUBMISSION_APPROVE,
    PERMISSION.SUBMISSION_SUBMIT,
    PERMISSION.FINANCE_EDIT,
  ],
  [ROLE.MINISTER]: [
    PERMISSION.SUBMISSION_APPROVE,
    PERMISSION.SUBMISSION_SUBMIT,
    PERMISSION.FINANCE_EDIT,
    PERMISSION.ASSETS_EDIT,
  ],
  [ROLE.PMO]: [
    PERMISSION.SUBMISSION_APPROVE,
    PERMISSION.SUBMISSION_REVIEW,
    PERMISSION.FINANCE_EDIT,
    PERMISSION.CLARIFICATION_CREATE,
  ],
  [ROLE.ASSURANCE_USER]: [
    PERMISSION.SUBMISSION_APPROVE,
    PERMISSION.FINANCE_EDIT,
    PERMISSION.DOCUMENT_UPLOAD,
  ],
  [ROLE.SOE_FOCAL_PERSON]: [PERMISSION.SUBMISSION_APPROVE],
}

describe('Phase 23 Role × Permission matrix', () => {
  it('covers every demo role with a non-empty permission set', () => {
    for (const role of DEMO_ROLES) {
      expect(getPermissionsForRole(role).length).toBeGreaterThan(0)
    }
  })

  it('enforces must-have permissions', () => {
    for (const [role, perms] of Object.entries(mustHave) as Array<[RoleId, Permission[]]>) {
      for (const p of perms) {
        expect(hasPermission(role, p), `${role} should have ${p}`).toBe(true)
      }
    }
  })

  it('enforces must-not-have permissions (role boundaries)', () => {
    for (const [role, perms] of Object.entries(mustNotHave) as Array<[RoleId, Permission[]]>) {
      for (const p of perms) {
        expect(hasPermission(role, p), `${role} must not have ${p}`).toBe(false)
      }
    }
  })

  it('maps roles to correct portals (executive vs operational)', () => {
    expect(getPortalForRole(ROLE.SOE_FOCAL_PERSON)).toBe('soe')
    expect(getPortalForRole(ROLE.CFO)).toBe('soe')
    expect(getPortalForRole(ROLE.MOIP_REVIEWER)).toBe('moip')
    expect(getPortalForRole(ROLE.MOIP_ANALYST)).toBe('moip')
    expect(getPortalForRole(ROLE.SECRETARY)).toBe('secretary')
    expect(getPortalForRole(ROLE.MINISTER)).toBe('minister')
    expect(getPortalForRole(ROLE.PMO)).toBe('pmo')
    expect(getPortalForRole(ROLE.ASSURANCE_USER)).toBe('assurance')
  })

  it('keeps sensitive personal data gated to SOE contributor / HR / company secretary paths', () => {
    expect(hasPermission(ROLE.HR_OFFICER, PERMISSION.SENSITIVE_PERSONAL_READ)).toBe(true)
    expect(hasPermission(ROLE.COMPANY_SECRETARY, PERMISSION.SENSITIVE_PERSONAL_READ)).toBe(true)
    expect(hasPermission(ROLE.SOE_FOCAL_PERSON, PERMISSION.SENSITIVE_PERSONAL_READ)).toBe(true)
    expect(hasPermission(ROLE.MOIP_REVIEWER, PERMISSION.SENSITIVE_PERSONAL_READ)).toBe(false)
    expect(hasPermission(ROLE.MINISTER, PERMISSION.SENSITIVE_PERSONAL_READ)).toBe(false)
    expect(hasPermission(ROLE.PMO, PERMISSION.SENSITIVE_PERSONAL_READ)).toBe(false)
  })
})
