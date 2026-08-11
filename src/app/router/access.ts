import { PORTAL, ROLE, type PortalId, type RoleId } from '@/constants'

const executivePortals: PortalId[] = [PORTAL.SECRETARY, PORTAL.MINISTER, PORTAL.PMO]

export function canRoleAccessPortal(role: RoleId, portal: PortalId) {
  if (role === ROLE.EXECUTIVE_VIEWER && executivePortals.includes(portal)) return true
  return role === ROLE.SYSTEM_ADMIN && portal === PORTAL.MOIP
}
