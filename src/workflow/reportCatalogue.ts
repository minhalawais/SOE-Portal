/**
 * Phase 21 — report catalogue definitions (prototype validation).
 * Not production report generation.
 */
import {
  REPORT_GROUP,
  REPORT_ID,
  type ReportGroup,
  type ReportId,
} from '@/constants'

export type ReportPortal = 'soe' | 'moip' | 'secretary' | 'minister' | 'pmo'

export type ReportParamKey =
  | 'reportingPeriodId'
  | 'organizationId'
  | 'sector'
  | 'province'
  | 'approvedOnly'

export interface ReportDefinition {
  id: ReportId
  name: string
  group: ReportGroup
  audience: string
  description: string
  /** Parameters meaningful to this report */
  parameters: ReportParamKey[]
  /** Portals that may open this report */
  portals: ReportPortal[]
  /** Prefer single-SOE scope */
  requiresOrganization?: boolean
  /** Executive brief — concise layout */
  briefStyle?: boolean
  isPrototype: true
}

export const REPORT_DEFINITIONS: ReportDefinition[] = [
  {
    id: REPORT_ID.SOE_PROFILE,
    name: 'SOE Profile Report',
    group: REPORT_GROUP.ENTERPRISE,
    audience: 'SOE / MoIP',
    description: 'Identity, ownership, assets, workforce, board, finance, accountability snapshot.',
    parameters: ['reportingPeriodId', 'organizationId', 'approvedOnly'],
    portals: ['soe', 'moip', 'secretary'],
    requiresOrganization: true,
    isPrototype: true,
  },
  {
    id: REPORT_ID.ANNUAL_PORTFOLIO,
    name: 'Annual Portfolio Report',
    group: REPORT_GROUP.ENTERPRISE,
    audience: 'MoIP / Minister / PMO',
    description: 'Portfolio composition, finance, assets, governance, fiscal and strategic highlights.',
    parameters: ['reportingPeriodId', 'sector', 'approvedOnly'],
    portals: ['moip', 'minister', 'pmo', 'secretary'],
    isPrototype: true,
  },
  {
    id: REPORT_ID.ASSET,
    name: 'Asset Report',
    group: REPORT_GROUP.ASSETS,
    audience: 'SOE / MoIP / Minister',
    description: 'Counts, values, land, utilization, valuation, encroachment, litigation, geography.',
    parameters: ['reportingPeriodId', 'organizationId', 'sector', 'province'],
    portals: ['soe', 'moip', 'minister', 'pmo'],
    isPrototype: true,
  },
  {
    id: REPORT_ID.FISCAL_EXPOSURE,
    name: 'Fiscal Exposure Report',
    group: REPORT_GROUP.FINANCIAL,
    audience: 'MoIP / Secretary / Minister / PMO',
    description: 'Debt, loans, guarantees, subsidies, grants, losses and trend — definitions labeled.',
    parameters: ['reportingPeriodId', 'organizationId', 'sector', 'approvedOnly'],
    portals: ['moip', 'secretary', 'minister', 'pmo', 'soe'],
    isPrototype: true,
  },
  {
    id: REPORT_ID.BOARD_GOVERNANCE,
    name: 'Board Governance Report',
    group: REPORT_GROUP.GOVERNANCE,
    audience: 'SOE / MoIP / Secretary',
    description: 'Composition, vacancies, expiries, committees, declarations, attendance summary.',
    parameters: ['reportingPeriodId', 'organizationId'],
    portals: ['soe', 'moip', 'secretary', 'minister'],
    isPrototype: true,
  },
  {
    id: REPORT_ID.AUDIT,
    name: 'Audit Report',
    group: REPORT_GROUP.ACCOUNTABILITY,
    audience: 'MoIP / Secretary / Minister',
    description: 'Audits, open paras, amounts, recovery, PAC observations, aged issues.',
    parameters: ['reportingPeriodId', 'organizationId', 'sector'],
    portals: ['soe', 'moip', 'secretary', 'minister'],
    isPrototype: true,
  },
  {
    id: REPORT_ID.LITIGATION,
    name: 'Litigation Report',
    group: REPORT_GROUP.ACCOUNTABILITY,
    audience: 'MoIP / Secretary / Minister',
    description: 'Active cases, exposure, hearings, high-value matters, status breakdown.',
    parameters: ['reportingPeriodId', 'organizationId', 'sector'],
    portals: ['soe', 'moip', 'secretary', 'minister'],
    isPrototype: true,
  },
  {
    id: REPORT_ID.COMPLIANCE,
    name: 'Compliance Report',
    group: REPORT_GROUP.ACCOUNTABILITY,
    audience: 'SOE / MoIP / Secretary',
    description: 'Status by SOE, overdue requirements, evidence gaps.',
    parameters: ['reportingPeriodId', 'organizationId', 'sector'],
    portals: ['soe', 'moip', 'secretary'],
    isPrototype: true,
  },
  {
    id: REPORT_ID.PRIVATIZATION,
    name: 'Privatization Report',
    group: REPORT_GROUP.ENTERPRISE,
    audience: 'MoIP / Minister / PMO',
    description: 'Pipeline entities, stages, blockers, milestones, next actions.',
    parameters: ['reportingPeriodId', 'organizationId', 'sector'],
    portals: ['moip', 'minister', 'pmo', 'secretary', 'soe'],
    isPrototype: true,
  },
  {
    id: REPORT_ID.INDUSTRIAL,
    name: 'Industrial Performance Report',
    group: REPORT_GROUP.FINANCIAL,
    audience: 'SOE / MoIP / Minister / PMO',
    description: 'Production, capacity, utilization, trade, employment, energy, carbon.',
    parameters: ['reportingPeriodId', 'organizationId', 'sector'],
    portals: ['soe', 'moip', 'minister', 'pmo'],
    isPrototype: true,
  },
  {
    id: REPORT_ID.MINISTER_BRIEF,
    name: 'Minister Brief',
    group: REPORT_GROUP.EXECUTIVE,
    audience: 'Minister',
    description:
      'Concise portfolio health, financial risks, governance, assets, audit/legal, privatization, attention items.',
    parameters: ['reportingPeriodId', 'sector', 'approvedOnly'],
    portals: ['minister', 'moip', 'secretary'],
    briefStyle: true,
    isPrototype: true,
  },
  {
    id: REPORT_ID.CABINET_BRIEF,
    name: 'Cabinet Brief',
    group: REPORT_GROUP.EXECUTIVE,
    audience: 'PMO / Cabinet-level review (prototype structure)',
    description:
      'High-level issues with evidence, strategic implication, and decision/attention placeholders. Not official Cabinet wording.',
    parameters: ['reportingPeriodId', 'sector', 'approvedOnly'],
    portals: ['pmo', 'minister', 'moip'],
    briefStyle: true,
    isPrototype: true,
  },
]

export function getReportDefinition(id: ReportId): ReportDefinition | undefined {
  return REPORT_DEFINITIONS.find((r) => r.id === id)
}

export function listReportsForPortal(portal: ReportPortal): ReportDefinition[] {
  return REPORT_DEFINITIONS.filter((r) => r.portals.includes(portal))
}

export function reportsByGroup(
  reports: ReportDefinition[],
): Array<{ group: ReportGroup; label: string; items: ReportDefinition[] }> {
  const order = Object.values(REPORT_GROUP)
  return order
    .map((group) => ({
      group,
      label:
        group === 'enterprise'
          ? 'Enterprise'
          : group === 'governance'
            ? 'Governance'
            : group === 'financial'
              ? 'Financial'
              : group === 'assets'
                ? 'Assets'
                : group === 'accountability'
                  ? 'Accountability'
                  : 'Executive',
      items: reports.filter((r) => r.group === group),
    }))
    .filter((g) => g.items.length > 0)
}
