import { create } from 'zustand'
import { APP_CONFIG } from '@/app/config/app.config'
import { ROLE, type RoleId } from '@/constants'
import { getPortalForRole } from '@/permissions'
import { defaultPersisted, persistence, persistenceKeys } from '@/utils/persistence'

interface SessionState {
  isAuthenticated: boolean
  userEmail?: string
  role: RoleId
  organizationId: string
  reportingPeriodId: string
  sidebarCollapsed: boolean
  setRole: (role: RoleId) => void
  setOrganizationId: (id: string) => void
  setReportingPeriodId: (id: string) => void
  toggleSidebar: () => void
  signIn: (email: string) => void
  signOut: () => void
}

export function normalizeRole(role: RoleId): RoleId {
  if (role === ROLE.SECRETARY || role === ROLE.MINISTER || role === ROLE.PMO) {
    return ROLE.EXECUTIVE_VIEWER
  }
  if (role === ROLE.SOE_DATA_CONTRIBUTOR) {
    return ROLE.SOE_FOCAL_PERSON
  }
  if (role === ROLE.ASSURANCE_USER || role === ROLE.SYSTEM_ADMIN) {
    return ROLE.MOIP_REVIEWER
  }
  return role
}

const initialRole = normalizeRole(
  persistence.get(persistenceKeys.role, defaultPersisted.role as RoleId),
)
persistence.set(persistenceKeys.role, initialRole)

export const useSessionStore = create<SessionState>((set) => ({
  isAuthenticated: import.meta.env.MODE === 'test'
    ? true
    : persistence.get(persistenceKeys.authenticated, false),
  userEmail: persistence.get<string | undefined>(persistenceKeys.userEmail, undefined),
  role: initialRole,
  organizationId: persistence.get(
    persistenceKeys.organizationId,
    APP_CONFIG.DEFAULT_ORGANIZATION_ID,
  ),
  reportingPeriodId: persistence.get(
    persistenceKeys.reportingPeriodId,
    APP_CONFIG.DEFAULT_REPORTING_PERIOD_ID,
  ),
  sidebarCollapsed: persistence.get(persistenceKeys.sidebarCollapsed, false),
  setRole: (role) => {
    const next = normalizeRole(role)
    persistence.set(persistenceKeys.role, next)
    set({ role: next })
  },
  setOrganizationId: (organizationId) => {
    persistence.set(persistenceKeys.organizationId, organizationId)
    set({ organizationId })
  },
  setReportingPeriodId: (reportingPeriodId) => {
    persistence.set(persistenceKeys.reportingPeriodId, reportingPeriodId)
    set({ reportingPeriodId })
  },
  toggleSidebar: () =>
    set((s) => {
      const sidebarCollapsed = !s.sidebarCollapsed
      persistence.set(persistenceKeys.sidebarCollapsed, sidebarCollapsed)
      return { sidebarCollapsed }
    }),
  signIn: (email) => {
    const normalizedEmail = email.trim().toLowerCase()
    let role: RoleId = ROLE.SOE_FOCAL_PERSON
    if (normalizedEmail.includes('certifier')) role = ROLE.SOE_CERTIFIER
    if (normalizedEmail.includes('soe.executive')) role = ROLE.SOE_EXECUTIVE
    if (normalizedEmail.includes('executive.viewer')) role = ROLE.EXECUTIVE_VIEWER
    if (normalizedEmail.endsWith('@moip.gov.pk')) role = ROLE.MOIP_REVIEWER
    persistence.set(persistenceKeys.authenticated, true)
    persistence.set(persistenceKeys.userEmail, normalizedEmail)
    persistence.set(persistenceKeys.role, role)
    set({ isAuthenticated: true, userEmail: normalizedEmail, role })
  },
  signOut: () => {
    persistence.remove(persistenceKeys.authenticated)
    persistence.remove(persistenceKeys.userEmail)
    set({ isAuthenticated: false, userEmail: undefined })
  },
}))

export function useActivePortal() {
  const role = useSessionStore((s) => s.role)
  return getPortalForRole(role)
}
