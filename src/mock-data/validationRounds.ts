/**
 * Phase 24 — Stakeholder validation rounds and demo scripts.
 * Facilitation data only; not a product domain module.
 */
import { ROLE, type RoleId } from '@/constants'

export const VALIDATION_ROUND = {
  R1_SHELL: 'r1_shell',
  R2_SOE_WORKFLOW: 'r2_soe_workflow',
  R3_MODULES: 'r3_modules',
  R4_MOIP_REVIEW: 'r4_moip_review',
  R5_EXECUTIVE: 'r5_executive',
  R6_INTELLIGENCE: 'r6_intelligence',
  R7_ACCEPTANCE: 'r7_acceptance',
} as const

export type ValidationRoundId = (typeof VALIDATION_ROUND)[keyof typeof VALIDATION_ROUND]

export interface DemoScriptStep {
  order: number
  role: RoleId
  route: string
  action: string
  expected: string
}

export interface ValidationRoundDefinition {
  id: ValidationRoundId
  roundNumber: 1 | 2 | 3 | 4 | 5 | 6 | 7
  title: string
  objective: string
  targetRoles: RoleId[]
  organizationId: string
  reportingPeriodId: string
  scenarioFilter: string | 'all'
  startRoute: string
  startRole: RoleId
  decisionsRequired: string[]
  scriptId: string
  steps: DemoScriptStep[]
}

export const validationRounds: ValidationRoundDefinition[] = [
  {
    id: VALIDATION_ROUND.R1_SHELL,
    roundNumber: 1,
    title: 'Product shell, portals and navigation',
    objective: 'Confirm portal architecture, roles, terminology, and org/period context.',
    targetRoles: [
      ROLE.SOE_FOCAL_PERSON,
      ROLE.MOIP_REVIEWER,
      ROLE.SECRETARY,
      ROLE.MINISTER,
      ROLE.PMO,
    ],
    organizationId: 'org-psm',
    reportingPeriodId: 'period-fy2027',
    scenarioFilter: 'all',
    startRoute: '/soe/dashboard',
    startRole: ROLE.SOE_FOCAL_PERSON,
    decisionsRequired: [
      'Portal set is correct for MoIP operating model',
      'Role labels and navigation terminology are acceptable',
      'Organization and reporting-period context is clear',
    ],
    scriptId: 'script-r1-shell',
    steps: [
      {
        order: 1,
        role: ROLE.SOE_FOCAL_PERSON,
        route: '/soe/dashboard',
        action: 'Open SOE dashboard; note task-first psychology',
        expected: 'Stakeholder can state where SOE work happens',
      },
      {
        order: 2,
        role: ROLE.MOIP_REVIEWER,
        route: '/moip/dashboard',
        action: 'Switch demo role → MoIP Oversight',
        expected: 'Review/queue language; no SOE data-entry chrome',
      },
      {
        order: 3,
        role: ROLE.SECRETARY,
        route: '/secretary/critical',
        action: 'Open Critical Attention',
        expected: 'Exception-first layout',
      },
      {
        order: 4,
        role: ROLE.MINISTER,
        route: '/minister/dashboard',
        action: 'Open Minister dashboard',
        expected: 'Strategy-first; read-only badge visible',
      },
      {
        order: 5,
        role: ROLE.PMO,
        route: '/pmo/dashboard',
        action: 'Open PMO national summary',
        expected: 'No operational workflow controls',
      },
    ],
  },
  {
    id: VALIDATION_ROUND.R2_SOE_WORKFLOW,
    roundNumber: 2,
    title: 'SOE submission workflow',
    objective: 'Validate data entry → certify → submit → clarification → resubmit.',
    targetRoles: [
      ROLE.SOE_FOCAL_PERSON,
      ROLE.SOE_FOCAL_PERSON,
      ROLE.SOE_CERTIFIER,
      ROLE.MOIP_REVIEWER,
    ],
    organizationId: 'org-psm',
    reportingPeriodId: 'period-fy2027',
    scenarioFilter: 'all',
    startRoute: '/soe/finance',
    startRole: ROLE.SOE_FOCAL_PERSON,
    decisionsRequired: [
      'Certification actors match expected procedure',
      'Clarification loop is realistic',
      'Draft values must not appear on executive KPIs',
    ],
    scriptId: 'script-r2-finance-golden',
    steps: [
      {
        order: 1,
        role: ROLE.SOE_FOCAL_PERSON,
        route: '/soe/finance/form',
        action: 'Edit FY2027 figures; save draft; attach evidence',
        expected: 'Draft saved; contributor cannot certify',
      },
      {
        order: 2,
        role: ROLE.SOE_FOCAL_PERSON,
        route: '/soe/finance/review',
        action: 'Send for certification',
        expected: 'Ready for certification',
      },
      {
        order: 3,
        role: ROLE.SOE_CERTIFIER,
        route: '/soe/finance/certify',
        action: 'Certify',
        expected: 'Certified; not a production digital signature',
      },
      {
        order: 4,
        role: ROLE.SOE_FOCAL_PERSON,
        route: '/soe/readiness',
        action: 'Submit to MoIP',
        expected: 'Appears in MoIP queue',
      },
      {
        order: 5,
        role: ROLE.MOIP_REVIEWER,
        route: '/moip/submissions',
        action: 'Request clarification → SOE responds → resubmit',
        expected: 'Version bump; under review again',
      },
    ],
  },
  {
    id: VALIDATION_ROUND.R3_MODULES,
    roundNumber: 3,
    title: 'Core business modules',
    objective: 'Confirm enterprise, assets, people, finance, accountability, documents coverage.',
    targetRoles: [
      ROLE.SOE_FOCAL_PERSON,
      ROLE.SOE_FOCAL_PERSON,
    ],
    organizationId: 'org-psm',
    reportingPeriodId: 'period-fy2027',
    scenarioFilter: 'all',
    startRoute: '/soe/enterprise/profile',
    startRole: ROLE.SOE_FOCAL_PERSON,
    decisionsRequired: [
      'Required module information is represented',
      'Sensitive HR fields remain role-gated',
      'Evidence linkage is understandable',
    ],
    scriptId: 'script-r3-modules',
    steps: [
      {
        order: 1,
        role: ROLE.SOE_FOCAL_PERSON,
        route: '/soe/enterprise/profile',
        action: 'Walk enterprise identity / ownership',
        expected: 'SOE identity fields present',
      },
      {
        order: 2,
        role: ROLE.SOE_FOCAL_PERSON,
        route: '/soe/assets/registry',
        action: 'Open asset registry; open one land record',
        expected: 'Evidence link visible',
      },
      {
        order: 3,
        role: ROLE.SOE_FOCAL_PERSON,
        route: '/soe/people/workforce',
        action: 'Open workforce; confirm sensitive gating for other roles later',
        expected: 'Operational HR table usable',
      },
      {
        order: 4,
        role: ROLE.SOE_FOCAL_PERSON,
        route: '/soe/people/board',
        action: 'Board / compliance surfaces',
        expected: 'Governance calendar / board completeness visible',
      },
      {
        order: 5,
        role: ROLE.SOE_FOCAL_PERSON,
        route: '/soe/documents',
        action: 'Documents repository + lineage',
        expected: 'Evidence version narrative clear',
      },
    ],
  },
  {
    id: VALIDATION_ROUND.R4_MOIP_REVIEW,
    roundNumber: 4,
    title: 'MoIP review workflow',
    objective: 'Validate queue, comparison, clarification, approval, escalation.',
    targetRoles: [ROLE.MOIP_REVIEWER, ROLE.MOIP_SUPERVISOR],
    organizationId: 'org-psm',
    reportingPeriodId: 'period-fy2027',
    scenarioFilter: 'all',
    startRoute: '/moip/submissions',
    startRole: ROLE.MOIP_REVIEWER,
    decisionsRequired: [
      'Queue prioritisation is usable',
      'Analyst cannot approve',
      'Escalation path is appropriate',
    ],
    scriptId: 'script-r4-moip',
    steps: [
      {
        order: 1,
        role: ROLE.MOIP_REVIEWER,
        route: '/moip/submissions',
        action: 'Open submission queue; filter by status',
        expected: 'Exception-oriented queue',
      },
      {
        order: 2,
        role: ROLE.MOIP_REVIEWER,
        route: '/moip/portfolio',
        action: 'Portfolio / compare; confirm reviewer workflow controls',
        expected: 'Review/analyse with working-level controls',
      },
      {
        order: 3,
        role: ROLE.MOIP_REVIEWER,
        route: '/moip/approvals',
        action: 'Approve or escalate a reviewed item',
        expected: 'Lock consequence updates approved KPI store',
      },
      {
        order: 4,
        role: ROLE.MOIP_SUPERVISOR,
        route: '/moip/tasks',
        action: 'Review tasks / early warning',
        expected: 'Escalations/tasks visible',
      },
    ],
  },
  {
    id: VALIDATION_ROUND.R5_EXECUTIVE,
    roundNumber: 5,
    title: 'Secretary and Minister dashboards',
    objective: 'Validate priorities, KPIs, risks, drill-down, executive density.',
    targetRoles: [ROLE.SECRETARY, ROLE.MINISTER],
    organizationId: 'org-psm',
    reportingPeriodId: 'period-fy2027',
    scenarioFilter: 'all',
    startRoute: '/secretary/dashboard',
    startRole: ROLE.SECRETARY,
    decisionsRequired: [
      'Secretary view answers “what requires attention?”',
      'Minister density is acceptable (not widget zoo)',
      'Drill-down reaches approved evidence trail',
    ],
    scriptId: 'script-r5-executive',
    steps: [
      {
        order: 1,
        role: ROLE.SECRETARY,
        route: '/secretary/dashboard',
        action: 'Review critical / decisions / obligations',
        expected: 'Attention items first',
      },
      {
        order: 2,
        role: ROLE.MINISTER,
        route: '/minister/dashboard',
        action: 'Review strategic KPIs; open portfolio drill-down',
        expected: 'Strategy-first; no certify/approve',
      },
      {
        order: 3,
        role: ROLE.MINISTER,
        route: '/minister/portfolio',
        action: 'Drill to SOE; check lineage/report link',
        expected: 'Traceable to approved period data',
      },
    ],
  },
  {
    id: VALIDATION_ROUND.R6_INTELLIGENCE,
    roundNumber: 6,
    title: 'GIS, scorecards, risk and intelligence',
    objective: 'Validate map filters, scorecards, benchmarking, search, reports.',
    targetRoles: [
      ROLE.MOIP_REVIEWER,
      ROLE.EXECUTIVE_VIEWER,
      ROLE.MINISTER,
      ROLE.PMO,
      ROLE.SOE_FOCAL_PERSON,
    ],
    organizationId: 'org-psm',
    reportingPeriodId: 'period-fy2027',
    scenarioFilter: 'all',
    startRoute: '/moip/assets/map',
    startRole: ROLE.MOIP_REVIEWER,
    decisionsRequired: [
      'GIS filters support real decision questions',
      'Scorecards/risk methodology acceptable as prototype',
      'Reports catalogue sufficient for validation',
    ],
    scriptId: 'script-r6-intelligence',
    steps: [
      {
        order: 1,
        role: ROLE.MOIP_REVIEWER,
        route: '/moip/assets/map',
        action: 'Apply land/utilization filters; use list alternative',
        expected: 'Map/list sync; zero-result empty state',
      },
      {
        order: 2,
        role: ROLE.MOIP_REVIEWER,
        route: '/moip/intelligence',
        action: 'Open scorecard / risk / benchmark',
        expected: 'Prototype methodology noted; bands with text',
      },
      {
        order: 3,
        role: ROLE.MOIP_REVIEWER,
        route: '/moip/search',
        action: 'Run a saved structured query',
        expected: 'Filter-driven results; role scope held',
      },
      {
        order: 4,
        role: ROLE.MINISTER,
        route: '/minister/reports',
        action: 'Preview a strategic report; mock export',
        expected: 'Period labels correct; demo export',
      },
      {
        order: 5,
        role: ROLE.PMO,
        route: '/pmo/indicators',
        action: 'National indicators summary only',
        expected: 'No operational workflow controls',
      },
    ],
  },
  {
    id: VALIDATION_ROUND.R7_ACCEPTANCE,
    roundNumber: 7,
    title: 'Full-system acceptance',
    objective: 'Complete role journeys, terminology, coverage, major reports, final gaps.',
    targetRoles: [
      ROLE.SOE_FOCAL_PERSON,
      ROLE.MOIP_REVIEWER,
      ROLE.SECRETARY,
      ROLE.MINISTER,
      ROLE.PMO,
    ],
    organizationId: 'org-psm',
    reportingPeriodId: 'period-fy2027',
    scenarioFilter: 'all',
    startRoute: '/soe/dashboard',
    startRole: ROLE.SOE_FOCAL_PERSON,
    decisionsRequired: [
      'Golden Workflow approved for freeze',
      'Unresolved items classified (Accepted / Change / Future)',
      'Frontend product definition accepted for Phase 25 freeze',
    ],
    scriptId: 'script-r7-acceptance',
    steps: [
      {
        order: 1,
        role: ROLE.SOE_FOCAL_PERSON,
        route: '/soe/readiness',
        action: 'Confirm SOE end-to-end path still coherent',
        expected: 'Task-first completion model affirmed',
      },
      {
        order: 2,
        role: ROLE.MOIP_REVIEWER,
        route: '/moip/approvals',
        action: 'Confirm MoIP review/approve model',
        expected: 'Operating chain accepted',
      },
      {
        order: 3,
        role: ROLE.MINISTER,
        route: '/minister/dashboard',
        action: 'Confirm executive questions answered',
        expected: 'Density and drill-down accepted',
      },
      {
        order: 4,
        role: ROLE.PMO,
        route: '/pmo/reports',
        action: 'Confirm national summary/reports',
        expected: 'Strategic-only scope accepted',
      },
    ],
  },
]

export function getValidationRound(id: ValidationRoundId): ValidationRoundDefinition | undefined {
  return validationRounds.find((r) => r.id === id)
}
