import { create } from 'zustand'
import { useLocation } from 'react-router-dom'
import { APP_CONFIG } from '@/app/config/app.config'
import { PORTAL, ROLE, type PortalId, type RoleId } from '@/constants'
import { getPortalForRole } from '@/permissions'
import { defaultPersisted, persistence, persistenceKeys } from '@/utils/persistence'

interface SessionState {
  isAuthenticated: boolean
  userEmail?: string
  role: RoleId
  enterpriseEntityId: string
  organizationId: string
  reportingPeriodId: string
  sidebarCollapsed: boolean
  setRole: (role: RoleId) => void
  setEnterpriseEntityId: (id: string) => void
  setOrganizationId: (id: string) => void
  setReportingPeriodId: (id: string) => void
  setSidebarCollapsed: (collapsed: boolean) => void
  toggleSidebar: () => void
  signIn: (email: string) => void
  signOut: () => void
}

export function normalizeRole(role: RoleId): RoleId {
  if (role === ROLE.SOE_DATA_CONTRIBUTOR) {
    return ROLE.SOE_FOCAL_PERSON
  }
  if (role === ROLE.ASSURANCE_USER) {
    return ROLE.MOIP_REVIEWER
  }
  return role
}

const initialRole = normalizeRole(
  persistence.get(persistenceKeys.role, defaultPersisted.role as RoleId),
)
persistence.set(persistenceKeys.role, initialRole)

const CLOSED_REPORTING_PERIODS = new Set([
  'period-fy2024',
  'period-fy2025',
  'period-fy2026',
])

function resolveReportingPeriodId(stored: string) {
  if (!stored || CLOSED_REPORTING_PERIODS.has(stored)) {
    return APP_CONFIG.DEFAULT_REPORTING_PERIOD_ID
  }
  return stored
}

const initialReportingPeriodId = resolveReportingPeriodId(
  persistence.get(persistenceKeys.reportingPeriodId, APP_CONFIG.DEFAULT_REPORTING_PERIOD_ID),
)
persistence.set(persistenceKeys.reportingPeriodId, initialReportingPeriodId)

export const useSessionStore = create<SessionState>((set) => ({
  isAuthenticated: import.meta.env.MODE === 'test'
    ? true
    : persistence.get(persistenceKeys.authenticated, false),
  userEmail: persistence.get<string | undefined>(persistenceKeys.userEmail, undefined),
  role: initialRole,
  enterpriseEntityId: persistence.get(
    persistenceKeys.enterpriseEntityId,
    defaultPersisted.enterpriseEntityId,
  ),
  organizationId: persistence.get(
    persistenceKeys.organizationId,
    APP_CONFIG.DEFAULT_ORGANIZATION_ID,
  ),
  reportingPeriodId: initialReportingPeriodId,
  sidebarCollapsed: persistence.get(persistenceKeys.sidebarCollapsed, false),
  setRole: (role) => {
    const next = normalizeRole(role)
    persistence.set(persistenceKeys.role, next)
    set({ role: next })
  },
  setEnterpriseEntityId: (enterpriseEntityId) => {
    persistence.set(persistenceKeys.enterpriseEntityId, enterpriseEntityId)
    persistence.set(persistenceKeys.organizationId, enterpriseEntityId)
    set({ enterpriseEntityId, organizationId: enterpriseEntityId })
  },
  setOrganizationId: (organizationId) => {
    persistence.set(persistenceKeys.enterpriseEntityId, organizationId)
    persistence.set(persistenceKeys.organizationId, organizationId)
    set({ organizationId, enterpriseEntityId: organizationId })
  },
  setReportingPeriodId: (reportingPeriodId) => {
    persistence.set(persistenceKeys.reportingPeriodId, reportingPeriodId)
    set({ reportingPeriodId })
  },
  setSidebarCollapsed: (sidebarCollapsed) => {
    persistence.set(persistenceKeys.sidebarCollapsed, sidebarCollapsed)
    set({ sidebarCollapsed })
  },
  toggleSidebar: () =>
    set((s) => {
      const sidebarCollapsed = !s.sidebarCollapsed
      persistence.set(persistenceKeys.sidebarCollapsed, sidebarCollapsed)
      return { sidebarCollapsed }
    }),
  signIn: (email) => {
    const normalizedEmail = email.trim().toLowerCase()
    let role: RoleId = ROLE.EXECUTIVE_VIEWER
    let matchedSpecificRole = false
    if (normalizedEmail.includes('certifier')) {
      role = ROLE.SOE_CERTIFIER
      matchedSpecificRole = true
    }
    if (normalizedEmail.includes('soe.executive')) {
      role = ROLE.SOE_EXECUTIVE
      matchedSpecificRole = true
    }
    if (normalizedEmail.includes('focal') || normalizedEmail.includes('contributor')) {
      role = ROLE.SOE_FOCAL_PERSON
      matchedSpecificRole = true
    }
    if (normalizedEmail.includes('executive.viewer')) {
      role = ROLE.EXECUTIVE_VIEWER
      matchedSpecificRole = true
    }
    if (normalizedEmail.includes('secretary')) {
      role = ROLE.SECRETARY
      matchedSpecificRole = true
    }
    if (normalizedEmail.includes('minister')) {
      role = ROLE.MINISTER
      matchedSpecificRole = true
    }
    if (normalizedEmail.includes('pmo')) {
      role = ROLE.PMO
      matchedSpecificRole = true
    }
    if (normalizedEmail.endsWith('@moip.gov.pk') && !matchedSpecificRole) role = ROLE.MOIP_REVIEWER
    const enterpriseEntityId = inferEnterpriseEntityId(normalizedEmail)
    persistence.set(persistenceKeys.authenticated, true)
    persistence.set(persistenceKeys.userEmail, normalizedEmail)
    persistence.set(persistenceKeys.role, role)
    persistence.set(persistenceKeys.enterpriseEntityId, enterpriseEntityId)
    persistence.set(persistenceKeys.organizationId, enterpriseEntityId)
    set({ isAuthenticated: true, userEmail: normalizedEmail, role, enterpriseEntityId, organizationId: enterpriseEntityId })
  },
  signOut: () => {
    persistence.remove(persistenceKeys.authenticated)
    persistence.remove(persistenceKeys.userEmail)
    set({ isAuthenticated: false, userEmail: undefined })
  },
}))

function inferEnterpriseEntityId(email: string) {
  if (email === 'focal@pidc.gov.pk') return 'org-tusdec'
  if (email.includes('tusdec')) return 'org-tusdec'
  if (email.includes('pidc')) return 'org-pidc'
  if (email.includes('psm')) return 'org-psm'
  if (email.includes('usc')) return 'org-usc'
  if (email.includes('nfc')) return 'org-nfc'
  if (email.includes('peco')) return 'org-peco'
  if (email.includes('nfml')) return 'org-nfml'
  if (email.includes('pasdec')) return 'org-pasdec'
  if (email.includes('smeda')) return 'org-smeda'
  if (email.includes('pitac')) return 'org-pitac'
  return APP_CONFIG.DEFAULT_ORGANIZATION_ID
}

export function useActivePortal() {
  const location = useLocation()
  const role = useSessionStore((s) => s.role)
  const routePortal = getPortalFromPath(location.pathname)
  if (routePortal) return routePortal
  return getPortalForRole(role)
}

export function getPortalFromPath(pathname: string): PortalId | null {
  if (pathname === '/soe-entry' || pathname.startsWith('/soe-entry/')) return PORTAL.SOE_ENTRY
  if (pathname === '/soe-review' || pathname.startsWith('/soe-review/')) return PORTAL.SOE_REVIEW
  if (pathname === '/moip-review' || pathname.startsWith('/moip-review/')) return PORTAL.MOIP_REVIEW
  if (pathname === '/moip-executive' || pathname.startsWith('/moip-executive/')) return PORTAL.MOIP_EXECUTIVE
  if (pathname === '/soe' || pathname.startsWith('/soe/')) return PORTAL.SOE
  if (pathname === '/moip' || pathname.startsWith('/moip/')) return PORTAL.MOIP
  if (pathname === '/secretary' || pathname.startsWith('/secretary/')) return PORTAL.SECRETARY
  if (pathname === '/minister' || pathname.startsWith('/minister/')) return PORTAL.MINISTER
  if (pathname === '/pmo' || pathname.startsWith('/pmo/')) return PORTAL.PMO
  if (pathname === '/assurance' || pathname.startsWith('/assurance/')) return PORTAL.ASSURANCE
  return null
}
