import { MODULE, ROLE, type ModuleId, type RoleId } from '@/constants'
import type { ReportingCadence } from '@/types/domain'

export interface ReportingModuleDef {
  id: ModuleId
  label: string
  route: string
  ownerRole: RoleId
  supportsImport?: boolean
  cadence: ReportingCadence
  liveRegister?: boolean
  snapshotLabel?: string
}

/** Phase 6 reporting workspace catalogue — ownership follows practical rollout personas. */
export const REPORTING_MODULES: ReportingModuleDef[] = [
  {
    id: MODULE.ENTERPRISE,
    label: 'Enterprise Profile',
    route: '/soe/enterprise/profile',
    ownerRole: ROLE.SOE_FOCAL_PERSON,
    cadence: 'annual',
  },
  {
    id: MODULE.ASSETS,
    label: 'Assets',
    route: '/soe/assets/land',
    ownerRole: ROLE.SOE_FOCAL_PERSON,
    supportsImport: true,
    cadence: 'annual',
  },
  {
    id: MODULE.WORKFORCE,
    label: 'Human Resources',
    route: '/soe/people/workforce',
    ownerRole: ROLE.SOE_FOCAL_PERSON,
    supportsImport: true,
    cadence: 'continuous',
    liveRegister: true,
    snapshotLabel: 'FY-end workforce snapshot',
  },
  {
    id: MODULE.BOARD,
    label: 'Board Governance',
    route: '/soe/people/board',
    ownerRole: ROLE.SOE_FOCAL_PERSON,
    cadence: 'annual',
  },
  {
    id: MODULE.EXECUTIVES,
    label: 'Executive Management',
    route: '/soe/people/executives',
    ownerRole: ROLE.SOE_FOCAL_PERSON,
    cadence: 'annual',
  },
  {
    id: MODULE.FINANCE,
    label: 'Financials',
    route: '/soe/finance',
    ownerRole: ROLE.SOE_FOCAL_PERSON,
    cadence: 'annual',
  },
  {
    id: MODULE.LOANS,
    label: 'Loans & Grants',
    route: '/soe/finance/loans',
    ownerRole: ROLE.SOE_FOCAL_PERSON,
    cadence: 'annual',
  },
  {
    id: MODULE.PROCUREMENT,
    label: 'Procurement',
    route: '/soe/accountability/procurement',
    ownerRole: ROLE.SOE_FOCAL_PERSON,
    cadence: 'annual',
  },
  {
    id: MODULE.AUDIT,
    label: 'Audit',
    route: '/soe/accountability/audit',
    ownerRole: ROLE.SOE_FOCAL_PERSON,
    cadence: 'annual',
  },
  {
    id: MODULE.LITIGATION,
    label: 'Litigation',
    route: '/soe/accountability/litigation',
    ownerRole: ROLE.SOE_FOCAL_PERSON,
    cadence: 'event_based',
    liveRegister: true,
    snapshotLabel: 'FY-end litigation schedule',
  },
  {
    id: MODULE.COMPLIANCE,
    label: 'Compliance',
    route: '/soe/accountability/compliance',
    ownerRole: ROLE.SOE_FOCAL_PERSON,
    cadence: 'annual',
  },
  {
    id: MODULE.INDUSTRIAL,
    label: 'Industrial Performance',
    route: '/soe/industrial',
    ownerRole: ROLE.SOE_FOCAL_PERSON,
    cadence: 'annual',
  },
  {
    id: MODULE.PRIVATIZATION,
    label: 'Privatization',
    route: '/soe/privatization',
    ownerRole: ROLE.SOE_FOCAL_PERSON,
    cadence: 'annual',
  },
  {
    id: MODULE.DOCUMENTS,
    label: 'Documents',
    route: '/soe/documents',
    ownerRole: ROLE.SOE_FOCAL_PERSON,
    cadence: 'annual',
  },
]

export function getModuleDef(id: ModuleId): ReportingModuleDef | undefined {
  return REPORTING_MODULES.find((m) => m.id === id)
}

export function modulesForRole(role: RoleId): ReportingModuleDef[] {
  if (
    role === ROLE.SOE_FOCAL_PERSON ||
    role === ROLE.SOE_DATA_CONTRIBUTOR ||
    role === ROLE.SOE_EXECUTIVE ||
    role === ROLE.CEO ||
    role === ROLE.CFO ||
    role === ROLE.SYSTEM_ADMIN
  ) {
    return REPORTING_MODULES
  }
  if (role === ROLE.SOE_CERTIFIER) {
    return REPORTING_MODULES.filter((m) => m.id === MODULE.COMPLIANCE || m.id === MODULE.DOCUMENTS)
  }
  const owned = REPORTING_MODULES.filter((m) => m.ownerRole === role)
  return owned.length ? owned : REPORTING_MODULES
}
