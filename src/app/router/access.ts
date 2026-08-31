import { PORTAL, ROLE, type PortalId, type RoleId } from '@/constants'

export function canRoleAccessPortal(role: RoleId, portal: PortalId) {
  if (role === ROLE.SOE_FOCAL_PERSON) {
    return (
      portal === PORTAL.SOE_ENTRY ||
      portal === PORTAL.SOE_REVIEW ||
      portal === PORTAL.MOIP_REVIEW ||
      portal === PORTAL.MOIP_EXECUTIVE ||
      portal === PORTAL.SOE ||
      portal === PORTAL.MOIP ||
      portal === PORTAL.PMO
    )
  }

  if (
    role === ROLE.SOE_DATA_CONTRIBUTOR ||
    role === ROLE.FINANCE_OFFICER ||
    role === ROLE.HR_OFFICER ||
    role === ROLE.ASSET_OFFICER ||
    role === ROLE.COMPANY_SECRETARY ||
    role === ROLE.LEGAL_OFFICER ||
    role === ROLE.PROCUREMENT_OFFICER ||
    role === ROLE.INTERNAL_AUDIT
  ) {
    return portal === PORTAL.SOE_ENTRY || portal === PORTAL.SOE
  }
  if (
    role === ROLE.SOE_CERTIFIER ||
    role === ROLE.SOE_EXECUTIVE ||
    role === ROLE.CEO ||
    role === ROLE.CFO
  ) {
    return portal === PORTAL.SOE_REVIEW || portal === PORTAL.SOE
  }
  if (
    role === ROLE.MOIP_REVIEWER ||
    role === ROLE.MOIP_ANALYST ||
    role === ROLE.MOIP_SUPERVISOR ||
    role === ROLE.SYSTEM_ADMIN
  ) {
    return portal === PORTAL.MOIP_REVIEW || portal === PORTAL.MOIP
  }
  if (
    role === ROLE.EXECUTIVE_VIEWER ||
    role === ROLE.SECRETARY ||
    role === ROLE.MINISTER ||
    role === ROLE.PMO
  ) {
    return (
      portal === PORTAL.MOIP_EXECUTIVE ||
      portal === PORTAL.PMO ||
      portal === PORTAL.SECRETARY ||
      portal === PORTAL.MINISTER
    )
  }
  return role === ROLE.ASSURANCE_USER && portal === PORTAL.ASSURANCE
}
