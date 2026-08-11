/** Phase 4 scenario catalogue — coherent SOE narratives (dummy demonstration data). */

export const SCENARIO = {
  HEALTHY: 'healthy',
  LOSS_MAKING: 'loss_making',
  ASSET_RICH: 'asset_rich',
  GOVERNANCE_RISK: 'governance_risk',
  AUDIT_HEAVY: 'audit_heavy',
  LITIGATION_HEAVY: 'litigation_heavy',
  HIGH_SUBSIDY: 'high_subsidy',
  UNDERUTILIZED: 'underutilized_industrial',
  PRIVATIZATION: 'under_privatization',
  COMPLIANT: 'generally_compliant',
} as const

export type ScenarioId = (typeof SCENARIO)[keyof typeof SCENARIO]

export interface ScenarioDefinition {
  id: ScenarioId
  label: string
  narrative: string
}

export const scenarioCatalogue: ScenarioDefinition[] = [
  {
    id: SCENARIO.HEALTHY,
    label: 'Healthy / profitable',
    narrative: 'Profitable, complete Board, compliant, strong utilization, limited audit exposure.',
  },
  {
    id: SCENARIO.LOSS_MAKING,
    label: 'Persistent loss-making',
    narrative: 'Multi-year losses, rising debt, subsidy dependence, declining utilization.',
  },
  {
    id: SCENARIO.ASSET_RICH,
    label: 'Asset / land rich',
    narrative: 'Large land bank, high market vs book variance, underutilized parcels.',
  },
  {
    id: SCENARIO.GOVERNANCE_RISK,
    label: 'Governance risk',
    narrative: 'Board vacancies, near-expiry directors, overdue compliance declarations.',
  },
  {
    id: SCENARIO.AUDIT_HEAVY,
    label: 'Audit-heavy',
    narrative: 'Multiple open audit paras, recovery pending, PAC observations.',
  },
  {
    id: SCENARIO.LITIGATION_HEAVY,
    label: 'Litigation-heavy',
    narrative: 'Material court cases, high amounts involved, upcoming hearings.',
  },
  {
    id: SCENARIO.HIGH_SUBSIDY,
    label: 'High subsidy dependence',
    narrative: 'Ongoing government support, weak self-generated surplus.',
  },
  {
    id: SCENARIO.UNDERUTILIZED,
    label: 'Underutilized industrial',
    narrative: 'Installed capacity far above actual production; idle machinery.',
  },
  {
    id: SCENARIO.PRIVATIZATION,
    label: 'Under privatization',
    narrative: 'Active privatization milestones, valuation and transaction pipeline.',
  },
  {
    id: SCENARIO.COMPLIANT,
    label: 'Generally compliant',
    narrative: 'On-time filings, complete evidence, limited exceptions.',
  },
]
