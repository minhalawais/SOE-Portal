/** In-page section tabs for executive viewer modules (sidebar shows one item per module). */

export type ModuleSectionTab = {
  to: string
  label: string
  end?: boolean
  isActive?: (pathname: string) => boolean
}

export type ModuleSectionId =
  | 'soe-enterprise'
  | 'soe-assets'
  | 'soe-people'
  | 'soe-finance'
  | 'soe-accountability'
  | 'soe-privatization'
  | 'soe-documents'

export const MODULE_SECTIONS: Record<ModuleSectionId, readonly ModuleSectionTab[]> = {
  'soe-enterprise': [
    { to: '/soe/enterprise/profile', label: 'Profile', end: true },
    { to: '/soe/enterprise/ownership', label: 'Ownership' },
    { to: '/soe/enterprise/structure', label: 'Corporate Structure' },
    { to: '/soe/enterprise/locations', label: 'Locations' },
    { to: '/soe/enterprise/history', label: 'History' },
  ],
  'soe-assets': [
    { to: '/soe/assets/land', label: 'Land', end: true },
    { to: '/soe/assets/buildings', label: 'Buildings' },
    { to: '/soe/assets/machinery', label: 'Machinery' },
    { to: '/soe/assets/vehicles', label: 'Vehicles' },
    { to: '/soe/assets/equipment', label: 'Other Equipment' },
  ],
  'soe-people': [
    { to: '/soe/people/executives', label: 'Executive', end: true },
    { to: '/soe/people/board', label: 'Board Member' },
    { to: '/soe/people/workforce', label: 'Workforce' },
  ],
  'soe-finance': [
    { to: '/soe/finance', label: 'Financial reporting', end: true },
    { to: '/soe/finance/loans', label: 'Loans & Grants' },
  ],
  'soe-accountability': [
    { to: '/soe/accountability/procurement', label: 'Procurement', end: true },
    { to: '/soe/accountability/audit', label: 'Audit' },
    { to: '/soe/accountability/audit/pac', label: 'PAC Observations' },
    { to: '/soe/accountability/litigation', label: 'Litigation' },
    { to: '/soe/accountability/compliance', label: 'Compliance', end: true },
  ],
  'soe-privatization': [
    {
      to: '/soe/privatization',
      label: 'Pipeline',
      end: true,
      isActive: (pathname) =>
        pathname === '/soe/privatization' ||
        (pathname.startsWith('/soe/privatization/') &&
          !pathname.startsWith('/soe/privatization/transformation')),
    },
    { to: '/soe/privatization/transformation', label: 'Transformation' },
  ],
  'soe-documents': [
    { to: '/soe/documents', label: 'Repository', end: true },
    { to: '/soe/documents/submission-history', label: 'Audit Trail & History' },
  ],
}

export function isModuleSectionTabActive(
  tab: ModuleSectionTab,
  pathname: string,
  tabs: readonly ModuleSectionTab[] = [],
) {
  const comparablePath = pathname
    .replace(/^\/soe-entry(?=\/|$)/, '/soe')
    .replace(/^\/soe-review(?=\/|$)/, '/soe')
  if (tab.isActive) return tab.isActive(comparablePath)
  if (comparablePath === tab.to) return true
  if (tab.end || !comparablePath.startsWith(`${tab.to}/`)) return false
  return !tabs.some(
    (peer) =>
      peer.to !== tab.to &&
      peer.to.length > tab.to.length &&
      (comparablePath === peer.to || comparablePath.startsWith(`${peer.to}/`)),
  )
}

export const EXECUTIVE_FLAT_SIDEBAR_MODULE_IDS = new Set<ModuleSectionId>([
  'soe-enterprise',
  'soe-assets',
  'soe-people',
  'soe-finance',
  'soe-accountability',
  'soe-privatization',
  'soe-documents',
])
