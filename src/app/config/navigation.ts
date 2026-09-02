import type { PortalId, RoleId } from '@/constants'
import { PORTAL, ROLE } from '@/constants'
import type { Permission } from '@/permissions'
import { PERMISSION } from '@/permissions'
import { APP_CONFIG } from '@/app/config/app.config'
import { EXECUTIVE_FLAT_SIDEBAR_MODULE_IDS, MODULE_SECTIONS, type ModuleSectionId } from '@/app/config/moduleSections'

export interface PortalNavigationItem {
  id: string
  label: string
  route: string
  permission?: Permission
  enabled?: boolean
  children?: PortalNavigationItem[]
  defaultOpen?: boolean
  /** Hide from executive-facing chrome when true (operational tools) */
  operationalOnly?: boolean
}

export interface PortalDefinition {
  id: PortalId
  name: string
  primaryQuestion: string
  density: 'operational' | 'executive'
  allowsOrganizationSwitch: boolean
  allowsOperationalEdit: boolean
  featureFlag?: boolean
  navigation: PortalNavigationItem[]
  homeRoute: string
}

const soeFinanceModuleChildren: PortalNavigationItem[] = [
  { id: 'soe-finance-overview', label: 'Financial reporting', route: '/soe/finance', permission: PERMISSION.FINANCE_READ },
  { id: 'soe-finance-form', label: 'Financial form', route: '/soe/finance/form', permission: PERMISSION.FINANCE_READ },
  { id: 'soe-finance-review', label: 'Internal Review', route: '/soe/finance/review', permission: PERMISSION.FINANCE_READ },
  { id: 'soe-finance-certify', label: 'Certification', route: '/soe/finance/certify', permission: PERMISSION.FINANCE_READ },
  { id: 'soe-finance-clar', label: 'Clarification', route: '/soe/finance/clarification', permission: PERMISSION.FINANCE_READ },
  { id: 'soe-finance-history', label: 'History', route: '/soe/finance/history', permission: PERMISSION.FINANCE_READ },
  { id: 'soe-finance-loans', label: 'Loans & Grants', route: '/soe/finance/loans', permission: PERMISSION.FINANCE_READ },
]

const EXECUTIVE_FINANCE_NAV_EXCLUDE = new Set([
  'soe-finance-form',
  'soe-finance-review',
  'soe-finance-certify',
  'soe-finance-clar',
  'soe-finance-history',
])

const soeFinanceExecutiveChildren = soeFinanceModuleChildren.filter(
  (item) => !EXECUTIVE_FINANCE_NAV_EXCLUDE.has(item.id),
)

/** Executive viewer sidebar — one item per entry module; sections move in-page. */
function flattenExecutiveSidebarModules(items: PortalNavigationItem[]): PortalNavigationItem[] {
  return items.map((item) => {
    let next = item
    if (item.id === 'soe-finance' && item.children?.length) {
      next = { ...item, children: soeFinanceExecutiveChildren }
    }
    if (EXECUTIVE_FLAT_SIDEBAR_MODULE_IDS.has(item.id as ModuleSectionId) && next.children?.length) {
      const sectionId = item.id as ModuleSectionId
      const defaultRoute = MODULE_SECTIONS[sectionId][0]?.to ?? next.route
      const rest = { ...next }
      delete rest.children
      return { ...rest, route: defaultRoute }
    }
    if (next.children?.length) {
      return { ...next, children: flattenExecutiveSidebarModules(next.children) }
    }
    return next
  })
}

function rebaseNavigation(
  items: PortalNavigationItem[],
  fromPrefix: string,
  toPrefix: string,
): PortalNavigationItem[] {
  return items.map((item) => ({
    ...item,
    route:
      item.route === fromPrefix || item.route.startsWith(`${fromPrefix}/`)
        ? item.route.replace(fromPrefix, toPrefix)
        : item.route,
    children: item.children
      ? rebaseNavigation(item.children, fromPrefix, toPrefix)
      : undefined,
  }))
}

const soeContributorModuleNavigation: PortalNavigationItem[] = [
  {
    id: 'soe-submissions',
    label: 'Submissions & Returns',
    route: '/soe/submissions',
  },
  {
    id: 'soe-search',
    label: 'Search & Intelligence',
    route: '/soe/search',
  },
      {
        id: 'soe-enterprise',
        label: 'Enterprise',
        route: '/soe/enterprise',
        children: [
          { id: 'soe-profile', label: 'Profile', route: '/soe/enterprise/profile' },
          { id: 'soe-ownership', label: 'Ownership', route: '/soe/enterprise/ownership' },
          {
            id: 'soe-structure',
            label: 'Corporate Structure',
            route: '/soe/enterprise/structure',
          },
          { id: 'soe-locations', label: 'Locations', route: '/soe/enterprise/locations' },
          { id: 'soe-ent-history', label: 'History', route: '/soe/enterprise/history' },
        ],
      },
      {
        id: 'soe-assets',
        label: 'Assets & Property',
        route: '/soe/assets/land',
        permission: PERMISSION.ASSETS_READ,
        children: [
          { id: 'soe-land', label: 'Land', route: '/soe/assets/land', permission: PERMISSION.ASSETS_READ },
          {
            id: 'soe-buildings',
            label: 'Buildings',
            route: '/soe/assets/buildings',
            permission: PERMISSION.ASSETS_READ,
          },
          {
            id: 'soe-machinery',
            label: 'Machinery',
            route: '/soe/assets/machinery',
            permission: PERMISSION.ASSETS_READ,
          },
          {
            id: 'soe-vehicles',
            label: 'Vehicles',
            route: '/soe/assets/vehicles',
            permission: PERMISSION.ASSETS_READ,
          },
          {
            id: 'soe-equipment',
            label: 'Other Equipment',
            route: '/soe/assets/equipment',
            permission: PERMISSION.ASSETS_READ,
          },
        ],
      },
      {
        id: 'soe-people',
        label: 'People & Governance',
        route: '/soe/people/executives',
        children: [
          { id: 'soe-executives', label: 'Executive', route: '/soe/people/executives' },
          { id: 'soe-board', label: 'Board Member', route: '/soe/people/board' },
          { id: 'soe-workforce', label: 'Workforce', route: '/soe/people/workforce' },
        ],
      },
      {
        id: 'soe-finance',
        label: 'Financial & Fiscal',
        route: '/soe/finance',
        permission: PERMISSION.FINANCE_READ,
        children: soeFinanceModuleChildren,
      },
      {
        id: 'soe-accountability',
        label: 'Accountability & Compliance',
        route: '/soe/accountability',
        children: [
          { id: 'soe-procurement', label: 'Procurement', route: '/soe/accountability/procurement', permission: PERMISSION.ACCOUNTABILITY_READ },
          { id: 'soe-audit', label: 'Audit', route: '/soe/accountability/audit', permission: PERMISSION.ACCOUNTABILITY_READ },
          { id: 'soe-pac', label: 'PAC Observations', route: '/soe/accountability/audit/pac', permission: PERMISSION.ACCOUNTABILITY_READ },
          { id: 'soe-litigation', label: 'Litigation', route: '/soe/accountability/litigation', permission: PERMISSION.ACCOUNTABILITY_READ },
          { id: 'soe-compliance', label: 'Compliance', route: '/soe/accountability/compliance', permission: PERMISSION.ACCOUNTABILITY_READ },
        ],
      },
      {
        id: 'soe-industrial',
        label: 'Industrial Performance',
        route: '/soe/industrial',
      },
      {
        id: 'soe-privatization',
        label: 'Privatization & Transformation',
        route: '/soe/privatization',
        children: [
          { id: 'soe-priv-pipeline', label: 'Pipeline', route: '/soe/privatization', permission: PERMISSION.ACCOUNTABILITY_READ },
          { id: 'soe-priv-xform', label: 'Transformation', route: '/soe/privatization/transformation', permission: PERMISSION.ACCOUNTABILITY_READ },
        ],
      },
      {
        id: 'soe-documents',
        label: 'Documents',
        route: '/soe/documents',
        children: [
          { id: 'soe-docs-repo', label: 'Repository', route: '/soe/documents' },
          {
            id: 'soe-docs-subhist',
            label: 'Audit Trail & History',
            route: '/soe/documents/submission-history',
          },
        ],
      },
      {
        id: 'soe-logs-alerts',
        label: 'Logs & Alerts',
        route: '/soe/logs',
        children: [
          { id: 'soe-logs-centre', label: 'Logs', route: '/soe/logs' },
          { id: 'soe-alerts', label: 'Alerts', route: '/soe/alerts' },
        ],
      },
]

/** Executive viewer extras — reserved for modules not covered by contributor flattening */
const soeExecutiveViewerExtras: PortalNavigationItem[] = []

/** MoIP user administration — reused in executive viewer sidebar */
const executiveUserManagementModule: PortalNavigationItem = {
  id: 'exec-user-admin',
  label: 'User Management',
  route: '/moip/admin/users',
  permission: PERMISSION.USER_READ,
  children: [
    { id: 'exec-users', label: 'Users', route: '/moip/admin/users' },
    {
      id: 'exec-access-audit',
      label: 'Account Activity',
      route: '/moip/admin/audit-log',
      permission: PERMISSION.AUDIT_LOG_READ,
    },
  ],
}

const EXECUTIVE_DATA_ENTRY_FLAT_MODULE_IDS = new Set([
  'soe-enterprise',
  'soe-assets',
  'soe-people',
  'soe-finance',
  'soe-accountability',
  'soe-industrial',
  'soe-privatization',
  'soe-documents',
])

/** PM command dashboard plus SOE contributor and certifier modules (routes remain under /soe/*) */
const pmDashboardNavigation: PortalNavigationItem[] = (() => {
  const withoutReportsAndTasks = soeContributorModuleNavigation.filter(
    (item) => item.id !== 'soe-logs-alerts',
  )
  const logsAlerts = soeContributorModuleNavigation.find((item) => item.id === 'soe-logs-alerts')
  const submissionsModule = withoutReportsAndTasks.find((item) => item.id === 'soe-submissions')

  const dataEntryModules: PortalNavigationItem[] = [
    ...flattenExecutiveSidebarModules([
      ...withoutReportsAndTasks.filter((item) =>
        EXECUTIVE_DATA_ENTRY_FLAT_MODULE_IDS.has(item.id),
      ),
      ...soeExecutiveViewerExtras.filter((item) =>
        EXECUTIVE_DATA_ENTRY_FLAT_MODULE_IDS.has(item.id),
      ),
    ]),
    ...(submissionsModule ? [submissionsModule] : []),
  ]
  const shellModules = withoutReportsAndTasks.filter(
    (item) =>
      item.id !== 'soe-submissions' && !EXECUTIVE_DATA_ENTRY_FLAT_MODULE_IDS.has(item.id),
  )

  const dataEntryGroup: PortalNavigationItem = {
    id: 'exec-data-entry',
    label: 'Data Entry',
    route: dataEntryModules[0]?.route ?? '/soe/enterprise/profile',
    children: dataEntryModules,
  }

  return [
    { id: 'pmo-command', label: 'National Dashboard', route: '/pmo/dashboard' },
    ...shellModules,
    dataEntryGroup,
    executiveUserManagementModule,
    ...(logsAlerts ? [logsAlerts] : []),
  ]
})()

const soeEntrySidebarModules = flattenExecutiveSidebarModules(soeContributorModuleNavigation)
const soeEntrySubmissionsModule = soeEntrySidebarModules.find((item) => item.id === 'soe-submissions')
const SOE_ENTRY_DATA_ENTRY_MODULE_IDS = new Set([
  'soe-enterprise',
  'soe-assets',
  'soe-people',
  'soe-finance',
  'soe-accountability',
  'soe-industrial',
  'soe-privatization',
  'soe-documents',
])
const soeEntryDataEntryModules = soeEntrySidebarModules.filter((item) =>
  SOE_ENTRY_DATA_ENTRY_MODULE_IDS.has(item.id),
)
const soeEntryOtherModules = soeEntrySidebarModules.filter(
  (item) =>
    item.id !== 'soe-submissions' &&
    item.id !== 'soe-logs-alerts' &&
    item.id !== 'soe-reports' &&
    !SOE_ENTRY_DATA_ENTRY_MODULE_IDS.has(item.id),
)

const soeEntryNavigation = rebaseNavigation(
  [
    { id: 'soe-dashboard', label: 'Dashboard', route: '/soe/dashboard' },
    {
      id: 'soe-data-entry',
      label: 'Data Entry',
      route: soeEntryDataEntryModules[0]?.route ?? '/soe/enterprise/profile',
      children: soeEntryDataEntryModules,
      defaultOpen: true,
    },
    {
      id: 'soe-ai-import',
      label: 'AI Data Hub',
      route: '/soe/ai-import',
      permission: PERMISSION.AI_IMPORT_USE,
    },
    ...(soeEntrySubmissionsModule ? [soeEntrySubmissionsModule] : []),
    ...soeEntryOtherModules,
    {
      id: 'soe-early-warning',
      label: 'Early Warning System',
      route: '/soe/early-warning',
    },
  ],
  '/soe',
  '/soe-entry',
)

const soeReviewNavigation: PortalNavigationItem[] = rebaseNavigation(
  [
    { id: 'soe-review-dashboard', label: 'Dashboard', route: '/soe/dashboard' },
    { id: 'soe-review-submissions', label: 'Submissions & Approvals', route: '/soe/submissions' },
    {
      id: 'soe-review-alerts',
      label: 'Logs & Alerts',
      route: '/soe/logs',
      children: [
        { id: 'soe-review-logs', label: 'Logs', route: '/soe/logs' },
        { id: 'soe-review-alert-list', label: 'Alerts', route: '/soe/alerts' },
      ],
    },
  ],
  '/soe',
  '/soe-review',
)

const moipReviewNavigation = rebaseNavigation(
  [
    { id: 'moip-dashboard', label: 'Oversight Dashboard', route: '/moip/dashboard' },
    {
      id: 'moip-review',
      label: 'Submissions & Approvals',
      route: '/moip/submissions',
      permission: PERMISSION.SUBMISSION_REVIEW,
    },
    {
      id: 'moip-soe-management',
      label: 'SOE Management',
      route: '/moip/admin/soes',
      children: [
        {
          id: 'moip-soe-registry',
          label: 'SOE Registry',
          route: '/moip/admin/soes',
          permission: PERMISSION.ORGANIZATION_MANAGE,
        },
        {
          id: 'moip-users',
          label: 'Users & Access',
          route: '/moip/admin/users',
          permission: PERMISSION.USER_READ,
        },
        {
          id: 'moip-access-audit',
          label: 'Account Activity',
          route: '/moip/admin/audit-log',
          permission: PERMISSION.AUDIT_LOG_READ,
        },
      ],
    },
    {
      id: 'moip-performance-comparison',
      label: 'SOE Performance Comparison',
      route: '/moip/performance-comparison',
      permission: PERMISSION.PERFORMANCE_COMPARISON_READ,
    },
    { id: 'moip-search', label: 'Search & Intelligence', route: '/moip/search', permission: PERMISSION.PORTFOLIO_READ },
    {
      id: 'moip-ai-import',
      label: 'AI Data Hub',
      route: '/moip/ai-import',
      permission: PERMISSION.AI_IMPORT_USE,
    },
    {
      id: 'moip-logs',
      label: 'Logs & Alerts',
      route: '/moip/logs',
      children: [
        { id: 'moip-log-list', label: 'Logs', route: '/moip/logs' },
        { id: 'moip-alerts', label: 'Alerts', route: '/moip/alerts' },
      ],
    },
  ],
  '/moip',
  '/moip-review',
)

const moipExecutiveNavigation: PortalNavigationItem[] = [
  { id: 'moip-exec-dashboard', label: 'National Dashboard', route: '/moip-executive/dashboard' },
  { id: 'moip-exec-search', label: 'Search & Intelligence', route: '/moip-executive/search', permission: PERMISSION.EXECUTIVE_DASHBOARD_READ },
]

export const portalDefinitions: Record<PortalId, PortalDefinition> = {
  [PORTAL.SOE_ENTRY]: {
    id: PORTAL.SOE_ENTRY,
    name: 'SOE Data Entry Portal',
    primaryQuestion: 'What do I need to complete, review, certify or submit?',
    density: 'operational',
    allowsOrganizationSwitch: false,
    allowsOperationalEdit: true,
    homeRoute: '/soe-entry/dashboard',
    navigation: soeEntryNavigation,
  },

  [PORTAL.SOE_REVIEW]: {
    id: PORTAL.SOE_REVIEW,
    name: 'SOE Reviewer Portal',
    primaryQuestion: 'What needs internal review, certification, clarification or executive attention?',
    density: 'operational',
    allowsOrganizationSwitch: false,
    allowsOperationalEdit: false,
    homeRoute: '/soe-review/dashboard',
    navigation: soeReviewNavigation,
  },

  [PORTAL.MOIP_REVIEW]: {
    id: PORTAL.MOIP_REVIEW,
    name: 'MOIP Review Portal',
    primaryQuestion: 'What has been submitted, what requires a decision, and what does the national SOE portfolio show?',
    density: 'operational',
    allowsOrganizationSwitch: true,
    allowsOperationalEdit: false,
    homeRoute: '/moip-review/dashboard',
    navigation: moipReviewNavigation,
  },

  [PORTAL.MOIP_EXECUTIVE]: {
    id: PORTAL.MOIP_EXECUTIVE,
    name: 'MOIP Executive Dashboard Portal',
    primaryQuestion: 'What matters nationally and where is intervention required?',
    density: 'executive',
    allowsOrganizationSwitch: false,
    allowsOperationalEdit: false,
    featureFlag: APP_CONFIG.ENABLE_PMO_PORTAL,
    homeRoute: '/moip-executive/dashboard',
    navigation: moipExecutiveNavigation,
  },

  [PORTAL.SOE]: {
    id: PORTAL.SOE,
    name: 'SOE Management & Submission',
    primaryQuestion: 'Legacy route alias for SOE portal.',
    density: 'operational',
    allowsOrganizationSwitch: false,
    allowsOperationalEdit: true,
    homeRoute: '/soe/dashboard',
    navigation: [
      { id: 'soe-dashboard', label: 'Dashboard', route: '/soe/dashboard' },
      ...soeContributorModuleNavigation,
    ],
  },

  [PORTAL.MOIP]: {
    id: PORTAL.MOIP,
    name: 'MoIP Oversight & Review',
    primaryQuestion: 'Legacy route alias for MoIP review portal.',
    density: 'operational',
    allowsOrganizationSwitch: true,
    allowsOperationalEdit: false,
    homeRoute: '/moip/dashboard',
    navigation: [
      { id: 'moip-dashboard', label: 'Oversight Dashboard', route: '/moip/dashboard' },
      {
        id: 'moip-review',
        label: 'Review & Approval',
        route: '/moip/submissions',
        children: [
          {
            id: 'moip-queue',
            label: 'Submission Queue',
            route: '/moip/submissions',
            permission: PERMISSION.SUBMISSION_REVIEW,
          },
          {
            id: 'moip-review-packages',
            label: 'SOE Review Packages',
            route: '/moip/portfolio',
            permission: PERMISSION.PORTFOLIO_READ,
          },
          {
            id: 'moip-clarifications',
            label: 'Clarifications',
            route: '/moip/clarifications',
            permission: PERMISSION.CLARIFICATION_CREATE,
          },
          {
            id: 'moip-approvals',
            label: 'Approvals',
            route: '/moip/approvals',
            permission: PERMISSION.SUBMISSION_APPROVE,
          },
        ],
      },
      {
        id: 'moip-portfolio-data',
        label: 'Portfolio Data',
        route: '/moip/modules/enterprise',
        permission: PERMISSION.PORTFOLIO_READ,
        children: [
          { id: 'moip-module-enterprise', label: 'Enterprise Profile', route: '/moip/modules/enterprise' },
          { id: 'moip-module-assets', label: 'Assets', route: '/moip/modules/assets' },
          { id: 'moip-module-workforce', label: 'Workforce', route: '/moip/modules/workforce' },
          { id: 'moip-module-board', label: 'Board Governance', route: '/moip/modules/board' },
          { id: 'moip-module-executives', label: 'Executive Management', route: '/moip/modules/executives' },
          { id: 'moip-module-finance', label: 'Financials', route: '/moip/modules/finance' },
          { id: 'moip-module-loans', label: 'Loans & Grants', route: '/moip/modules/loans' },
          { id: 'moip-module-procurement', label: 'Procurement', route: '/moip/modules/procurement' },
          { id: 'moip-module-audit', label: 'Audit', route: '/moip/modules/audit' },
          { id: 'moip-module-litigation', label: 'Litigation', route: '/moip/modules/litigation' },
          { id: 'moip-module-compliance', label: 'Compliance', route: '/moip/modules/compliance' },
          { id: 'moip-module-industrial', label: 'Industrial Performance', route: '/moip/modules/industrial' },
          { id: 'moip-module-privatization', label: 'Privatization', route: '/moip/modules/privatization' },
          { id: 'moip-module-documents', label: 'Documents', route: '/moip/modules/documents' },
        ],
      },
      {
        id: 'moip-soe-management',
        label: 'SOE Management',
        route: '/moip/admin/soes',
        children: [
          {
            id: 'moip-soe-registry',
            label: 'SOE Registry',
            route: '/moip/admin/soes',
            permission: PERMISSION.ORGANIZATION_MANAGE,
          },
          {
            id: 'moip-users',
            label: 'Users & Access',
            route: '/moip/admin/users',
            permission: PERMISSION.USER_READ,
          },
          {
            id: 'moip-access-audit',
            label: 'Account Activity',
            route: '/moip/admin/audit-log',
            permission: PERMISSION.AUDIT_LOG_READ,
          },
        ],
      },
      {
        id: 'moip-performance-comparison',
        label: 'SOE Performance Comparison',
        route: '/moip/performance-comparison',
        permission: PERMISSION.PERFORMANCE_COMPARISON_READ,
      },
      { id: 'moip-logs', label: 'Logs & Escalations', route: '/moip/logs' },
      { id: 'moip-dq', label: 'Validation & Readiness', route: '/moip/data-quality', permission: PERMISSION.PORTFOLIO_READ },
      { id: 'moip-intelligence', label: 'Risk & Benchmarking', route: '/moip/intelligence', permission: PERMISSION.PORTFOLIO_READ },
      { id: 'moip-asset-map', label: 'National Asset Map', route: '/moip/assets/map', permission: PERMISSION.ASSETS_READ },
      { id: 'moip-search', label: 'Search & Intelligence', route: '/moip/search', permission: PERMISSION.PORTFOLIO_READ },
    ],
  },

  [PORTAL.SECRETARY]: {
    id: PORTAL.SECRETARY,
    name: 'Executive Viewer',
    primaryQuestion: 'Secretary View · What requires operational attention?',
    density: 'executive',
    allowsOrganizationSwitch: false,
    allowsOperationalEdit: false,
    homeRoute: '/secretary/dashboard',
    navigation: [
      { id: 'sec-home', label: 'Command Centre', route: '/secretary/dashboard' },
      { id: 'sec-critical', label: 'Critical Matters', route: '/secretary/critical' },
      { id: 'sec-decisions', label: 'Pending Decisions', route: '/secretary/decisions' },
      { id: 'sec-obligations', label: 'Obligations', route: '/secretary/obligations' },
      {
        id: 'sec-compliance',
        label: 'Compliance & Submissions',
        route: '/secretary/compliance',
      },
      { id: 'sec-finance', label: 'Financial Concerns', route: '/secretary/finance' },
      { id: 'sec-governance', label: 'Governance', route: '/secretary/governance' },
      { id: 'sec-audit', label: 'Audit & Legal', route: '/secretary/audit-legal' },
      { id: 'sec-escalations', label: 'Escalations', route: '/secretary/escalations' },
    ],
  },

  [PORTAL.MINISTER]: {
    id: PORTAL.MINISTER,
    name: 'Executive Viewer',
    primaryQuestion: 'Which executive lens do I need for portfolio decisions?',
    density: 'executive',
    allowsOrganizationSwitch: false,
    allowsOperationalEdit: false,
    homeRoute: '/minister/dashboard',
    navigation: [
      {
        id: 'exec-secretary-view',
        label: 'Secretary View',
        route: '/secretary/dashboard',
        permission: PERMISSION.EXECUTIVE_DASHBOARD_READ,
        children: [
          { id: 'exec-sec-home', label: 'Command Centre', route: '/secretary/dashboard' },
          { id: 'exec-sec-critical', label: 'Critical Matters', route: '/secretary/critical' },
          { id: 'exec-sec-decisions', label: 'Pending Decisions', route: '/secretary/decisions' },
          { id: 'exec-sec-obligations', label: 'Obligations', route: '/secretary/obligations' },
          { id: 'exec-sec-compliance', label: 'Compliance & Submissions', route: '/secretary/compliance' },
          { id: 'exec-sec-finance', label: 'Financial Concerns', route: '/secretary/finance' },
          { id: 'exec-sec-governance', label: 'Governance', route: '/secretary/governance' },
          { id: 'exec-sec-audit', label: 'Audit & Legal', route: '/secretary/audit-legal' },
          { id: 'exec-sec-escalations', label: 'Escalations', route: '/secretary/escalations' },
        ],
      },
      {
        id: 'exec-minister-view',
        label: 'Minister View',
        route: '/minister/dashboard',
        permission: PERMISSION.EXECUTIVE_DASHBOARD_READ,
        children: [
          { id: 'min-overview', label: 'Executive Overview', route: '/minister/dashboard' },
          { id: 'min-alerts', label: 'Strategic Alerts', route: '/minister/alerts' },
          { id: 'min-portfolio', label: 'Portfolio Performance', route: '/minister/portfolio' },
          { id: 'min-fiscal', label: 'Fiscal Exposure', route: '/minister/fiscal' },
          { id: 'min-assets', label: 'Asset Intelligence', route: '/minister/assets' },
          {
            id: 'min-asset-map',
            label: 'National Asset Map',
            route: '/minister/assets/map',
            permission: PERMISSION.ASSETS_READ,
          },
          { id: 'min-gov', label: 'Governance Risk', route: '/minister/governance' },
          { id: 'min-audit', label: 'Audit & Legal Risk', route: '/minister/audit-legal' },
          { id: 'min-industrial', label: 'Industrial Performance', route: '/minister/industrial' },
          { id: 'min-privatization', label: 'Privatization & Transformation', route: '/minister/privatization' },
          {
            id: 'min-opportunities',
            label: 'Strategic Opportunities',
            route: '/minister/opportunities',
          },
        ],
      },
      {
        id: 'exec-pmo-view',
        label: 'PMO View',
        route: '/pmo/dashboard',
        permission: PERMISSION.EXECUTIVE_DASHBOARD_READ,
        children: [
          { id: 'exec-pmo-command', label: 'Command Dashboard', route: '/pmo/dashboard' },
          {
            id: 'exec-pmo-map',
            label: 'National Asset Map',
            route: '/pmo/map',
            permission: PERMISSION.ASSETS_READ,
          },
          {
            id: 'exec-pmo-search',
            label: 'Search & Intelligence',
            route: '/pmo/search',
            permission: PERMISSION.EXECUTIVE_DASHBOARD_READ,
          },
        ],
      },
    ],
  },

  [PORTAL.PMO]: {
    id: PORTAL.PMO,
    name: 'Executive Viewer',
    primaryQuestion: 'PMO View · What matters nationally and where is intervention required?',
    density: 'executive',
    allowsOrganizationSwitch: false,
    allowsOperationalEdit: false,
    featureFlag: APP_CONFIG.ENABLE_PMO_PORTAL,
    homeRoute: '/pmo/dashboard',
    navigation: pmDashboardNavigation,
  },

  [PORTAL.ASSURANCE]: {
    id: PORTAL.ASSURANCE,
    name: 'Authorized Assurance View',
    primaryQuestion: 'What approved evidence and history can I inspect within authorized scope?',
    density: 'executive',
    allowsOrganizationSwitch: true,
    allowsOperationalEdit: false,
    featureFlag: APP_CONFIG.ENABLE_ASSURANCE_PORTAL,
    homeRoute: '/assurance/dashboard',
    navigation: [
      { id: 'ass-overview', label: 'Authorized Overview', route: '/assurance/dashboard' },
      { id: 'ass-search', label: 'Approved Records', route: '/assurance/records' },
      { id: 'ass-evidence', label: 'Evidence & Timeline', route: '/assurance/evidence' },
    ],
  },
}

const soeExecutiveNavigation: PortalNavigationItem[] = [
  { id: 'soe-executive-dashboard', label: 'Executive Dashboard', route: '/soe/executive' },
  { id: 'soe-executive-alerts', label: 'Alerts & Decisions', route: '/soe/alerts' },
  { id: 'soe-executive-search', label: 'Search & Intelligence', route: '/soe/search' },
]

export function getPortalDefinitionForRole(portal: PortalId, role: RoleId): PortalDefinition {
  const definition = portalDefinitions[portal]

  if (portal !== PORTAL.SOE && portal !== PORTAL.SOE_REVIEW) return definition

  if (role === ROLE.SOE_CERTIFIER) {
    return {
      ...definition,
      id: PORTAL.SOE_REVIEW,
      name: 'SOE Reviewer Portal',
      primaryQuestion: 'What compliance data, evidence or certification action needs attention?',
      homeRoute: '/soe-review/dashboard',
      navigation: soeReviewNavigation,
    }
  }

  if (role !== ROLE.SOE_EXECUTIVE) return definition

  return {
    ...definition,
    id: PORTAL.SOE_REVIEW,
    name: 'SOE Reviewer Portal',
    primaryQuestion: 'Where is performance changing, value at risk, or executive action required?',
    density: 'executive',
    allowsOperationalEdit: false,
    homeRoute: '/soe-review/executive',
    navigation: rebaseNavigation(soeExecutiveNavigation, '/soe', '/soe-review'),
  }
}

export const portalHome: Record<PortalId, string> = {
  soe_entry: portalDefinitions.soe_entry.homeRoute,
  soe_review: portalDefinitions.soe_review.homeRoute,
  moip_review: portalDefinitions.moip_review.homeRoute,
  moip_executive: portalDefinitions.moip_executive.homeRoute,
  soe: portalDefinitions.soe.homeRoute,
  moip: portalDefinitions.moip.homeRoute,
  secretary: portalDefinitions.secretary.homeRoute,
  minister: portalDefinitions.minister.homeRoute,
  pmo: portalDefinitions.pmo.homeRoute,
  assurance: portalDefinitions.assurance.homeRoute,
}

/** @deprecated use portalDefinitions — kept for gradual migration */
export const portalNav: Record<PortalId, { label: string; to: string; permission?: Permission }[]> =
  Object.fromEntries(
    Object.values(portalDefinitions).map((p) => [
      p.id,
      flattenNavigation(p.navigation).map((i) => ({
        label: i.label,
        to: i.route,
        permission: i.permission,
      })),
    ]),
  ) as Record<PortalId, { label: string; to: string; permission?: Permission }[]>

export function flattenNavigation(
  items: PortalNavigationItem[],
  acc: PortalNavigationItem[] = [],
): PortalNavigationItem[] {
  for (const item of items) {
    if (item.children?.length) {
      flattenNavigation(item.children, acc)
    } else {
      acc.push(item)
    }
  }
  return acc
}

export function findNavTrail(
  items: PortalNavigationItem[],
  pathname: string,
  trail: PortalNavigationItem[] = [],
): PortalNavigationItem[] | null {
  for (const item of items) {
    const next = [...trail, item]
    if (item.route === pathname) return next
    if (item.children) {
      const found = findNavTrail(item.children, pathname, next)
      if (found) return found
    }
    if (pathname.startsWith(item.route + '/') && !item.children) return next
  }
  return null
}

export function isNavItemVisible(
  item: PortalNavigationItem,
  role: RoleId,
  hasPermission: (role: RoleId, permission: Permission) => boolean,
): boolean {
  if (item.enabled === false) return true // still listed but opens not-enabled state
  if (item.permission && !hasPermission(role, item.permission)) return false
  if (item.children?.length) {
    return item.children.some((child) => isNavItemVisible(child, role, hasPermission))
  }
  return true
}

export function filterNavigation(
  items: PortalNavigationItem[],
  role: RoleId,
  hasPermission: (role: RoleId, permission: Permission) => boolean,
): PortalNavigationItem[] {
  return items
    .map((item) => {
      if (item.permission && !hasPermission(role, item.permission)) return null
      if (item.children?.length) {
        const children = filterNavigation(item.children, role, hasPermission)
        if (children.length === 0) return null
        return { ...item, children }
      }
      if (!isNavItemVisible(item, role, hasPermission)) return null
      return item
    })
    .filter(Boolean) as PortalNavigationItem[]
}

export function getPortalDefinition(portal: PortalId): PortalDefinition {
  return portalDefinitions[portal]
}

export function roleAllowsOrgSwitch(role: RoleId): boolean {
  return (
    role === ROLE.MOIP_REVIEWER ||
    role === ROLE.MOIP_ANALYST ||
    role === ROLE.MOIP_SUPERVISOR ||
    role === ROLE.ASSURANCE_USER ||
    role === ROLE.SYSTEM_ADMIN
  )
}

export function roleIsExecutive(role: RoleId): boolean {
  return (
    role === ROLE.EXECUTIVE_VIEWER ||
    role === ROLE.SOE_EXECUTIVE ||
    role === ROLE.SECRETARY ||
    role === ROLE.MINISTER ||
    role === ROLE.PMO
  )
}
