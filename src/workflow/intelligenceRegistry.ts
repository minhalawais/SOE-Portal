/**
 * Phase 19 — centralized scorecard / risk / indicator registry.
 * Prototype methodology only — not an official government rating.
 */
import {
  BENCHMARK_METRIC,
  INTEL_DATA_STATUS,
  RISK_DIMENSION,
  RISK_STATUS,
  SCORECARD_DIMENSION,
  type BenchmarkMetric,
  type IntelDataStatus,
  type RiskDimension,
  type RiskStatus,
  type ScorecardDimension,
} from '@/constants'

export const INTEL_METHODOLOGY_NOTE =
  'Prototype methodology — not an official government rating. Thresholds and weights are provisional pending stakeholder validation.'

export interface IndicatorDefinition {
  id: string
  name: string
  domain: ScorecardDimension | RiskDimension | 'benchmark' | 'early_warning'
  formulaOrRule: string
  period: string
  threshold?: string
  weight?: number
  outputType: 'score_0_100' | 'risk_level' | 'percent' | 'ratio' | 'count' | 'signal'
  status: 'provisional'
  methodologyNote: string
  nullHandling: string
}

export interface ScoreComponentDef {
  id: string
  name: string
  weight: number
  /** Higher raw value better for scoring when true */
  higherIsBetter: boolean
  thresholdNote: string
  dataSource: string
  missingBehavior: IntelDataStatus
}

export interface ScoreDimensionDef {
  dimension: ScorecardDimension
  label: string
  components: ScoreComponentDef[]
  weightInComposite: number
}

export const SCORE_DIMENSION_DEFS: ScoreDimensionDef[] = [
  {
    dimension: SCORECARD_DIMENSION.FINANCIAL,
    label: 'Financial',
    weightInComposite: 0.25,
    components: [
      {
        id: 'fin-profitability',
        name: 'Profitability',
        weight: 0.3,
        higherIsBetter: true,
        thresholdNote: 'Margin ≥10% → strong; loss → weak',
        dataSource: 'financialMetrics.profitOrLoss / revenue',
        missingBehavior: INTEL_DATA_STATUS.UNAVAILABLE,
      },
      {
        id: 'fin-debt',
        name: 'Debt',
        weight: 0.25,
        higherIsBetter: false,
        thresholdNote: 'Debt/assets ≤40% preferred',
        dataSource: 'financialMetrics.totalDebt / totalAssets',
        missingBehavior: INTEL_DATA_STATUS.UNAVAILABLE,
      },
      {
        id: 'fin-subsidy',
        name: 'Subsidy Dependence',
        weight: 0.25,
        higherIsBetter: false,
        thresholdNote: 'Subsidies/revenue ≤15% preferred',
        dataSource: 'financialMetrics.subsidies / revenue',
        missingBehavior: INTEL_DATA_STATUS.UNAVAILABLE,
      },
      {
        id: 'fin-liquidity',
        name: 'Liquidity',
        weight: 0.2,
        higherIsBetter: true,
        thresholdNote: 'Current ratio ≥1.2 preferred',
        dataSource: 'financialMetrics current assets/liabilities',
        missingBehavior: INTEL_DATA_STATUS.UNAVAILABLE,
      },
    ],
  },
  {
    dimension: SCORECARD_DIMENSION.GOVERNANCE,
    label: 'Governance',
    weightInComposite: 0.2,
    components: [
      {
        id: 'gov-vacancies',
        name: 'Board Completeness',
        weight: 0.55,
        higherIsBetter: true,
        thresholdNote: '0 vacancies preferred',
        dataSource: 'boardMembers vacancy slots',
        missingBehavior: INTEL_DATA_STATUS.UNAVAILABLE,
      },
      {
        id: 'gov-expiry',
        name: 'Board Tenure Stability',
        weight: 0.45,
        higherIsBetter: true,
        thresholdNote: 'Few expiries within 90 days preferred',
        dataSource: 'boardMembers.expiryDate',
        missingBehavior: INTEL_DATA_STATUS.UNAVAILABLE,
      },
    ],
  },
  {
    dimension: SCORECARD_DIMENSION.COMPLIANCE,
    label: 'Compliance',
    weightInComposite: 0.15,
    components: [
      {
        id: 'comp-overdue',
        name: 'Obligation Timeliness',
        weight: 1,
        higherIsBetter: true,
        thresholdNote: '0 overdue / non-compliant preferred',
        dataSource: 'compliance status + dueDate',
        missingBehavior: INTEL_DATA_STATUS.UNAVAILABLE,
      },
    ],
  },
  {
    dimension: SCORECARD_DIMENSION.OPERATIONS,
    label: 'Operations',
    weightInComposite: 0.15,
    components: [
      {
        id: 'ops-capacity',
        name: 'Capacity Utilization',
        weight: 1,
        higherIsBetter: true,
        thresholdNote: '≥70% preferred; <40% weak',
        dataSource: 'industrialPerformance.capacityUtilization',
        missingBehavior: INTEL_DATA_STATUS.UNAVAILABLE,
      },
    ],
  },
  {
    dimension: SCORECARD_DIMENSION.ASSET_EFFICIENCY,
    label: 'Asset Efficiency',
    weightInComposite: 0.15,
    components: [
      {
        id: 'asset-util',
        name: 'Asset Utilization',
        weight: 1,
        higherIsBetter: true,
        thresholdNote: 'Low share of unused/idle assets preferred',
        dataSource: 'assets.utilizationStatus / occupancyStatus',
        missingBehavior: INTEL_DATA_STATUS.UNAVAILABLE,
      },
    ],
  },
  {
    dimension: SCORECARD_DIMENSION.STRATEGIC_CONTRIBUTION,
    label: 'Strategic Contribution',
    weightInComposite: 0.1,
    components: [
      {
        id: 'strat-industrial',
        name: 'Industrial Output Signal',
        weight: 1,
        higherIsBetter: true,
        thresholdNote: 'Production/export activity vs portfolio median (prototype)',
        dataSource: 'industrialPerformance actualProduction + exports',
        missingBehavior: INTEL_DATA_STATUS.UNAVAILABLE,
      },
    ],
  },
]

export const RISK_DIMENSION_ORDER: RiskDimension[] = [
  RISK_DIMENSION.FINANCIAL,
  RISK_DIMENSION.GOVERNANCE,
  RISK_DIMENSION.LEGAL,
  RISK_DIMENSION.AUDIT,
  RISK_DIMENSION.COMPLIANCE,
  RISK_DIMENSION.ASSET,
]

export const SCORECARD_DIMENSION_ORDER: ScorecardDimension[] = [
  SCORECARD_DIMENSION.FINANCIAL,
  SCORECARD_DIMENSION.GOVERNANCE,
  SCORECARD_DIMENSION.COMPLIANCE,
  SCORECARD_DIMENSION.OPERATIONS,
  SCORECARD_DIMENSION.ASSET_EFFICIENCY,
  SCORECARD_DIMENSION.STRATEGIC_CONTRIBUTION,
]

export const INDICATOR_REGISTRY: IndicatorDefinition[] = [
  {
    id: 'ind-profit-margin',
    name: 'Profit Margin',
    domain: SCORECARD_DIMENSION.FINANCIAL,
    formulaOrRule: 'profitOrLoss / revenue × 100',
    period: 'reporting period',
    threshold: '≥10 strong; <0 weak',
    weight: 0.3,
    outputType: 'percent',
    status: 'provisional',
    methodologyNote: INTEL_METHODOLOGY_NOTE,
    nullHandling: 'Unavailable when revenue missing or zero',
  },
  {
    id: 'ind-debt-ratio',
    name: 'Debt Ratio',
    domain: SCORECARD_DIMENSION.FINANCIAL,
    formulaOrRule: 'totalDebt / totalAssets × 100',
    period: 'reporting period',
    threshold: '≤40 preferred',
    weight: 0.25,
    outputType: 'percent',
    status: 'provisional',
    methodologyNote: INTEL_METHODOLOGY_NOTE,
    nullHandling: 'Unavailable when total assets missing or zero',
  },
  {
    id: 'ind-subsidy-dep',
    name: 'Subsidy Dependence',
    domain: SCORECARD_DIMENSION.FINANCIAL,
    formulaOrRule: 'subsidies / revenue × 100',
    period: 'reporting period',
    threshold: '≤15 preferred',
    weight: 0.25,
    outputType: 'percent',
    status: 'provisional',
    methodologyNote: INTEL_METHODOLOGY_NOTE,
    nullHandling: 'Unavailable when revenue missing or zero',
  },
  {
    id: 'ind-current-ratio',
    name: 'Current Ratio',
    domain: SCORECARD_DIMENSION.FINANCIAL,
    formulaOrRule: 'currentAssets / currentLiabilities',
    period: 'reporting period',
    threshold: '≥1.2 preferred',
    weight: 0.2,
    outputType: 'ratio',
    status: 'provisional',
    methodologyNote: INTEL_METHODOLOGY_NOTE,
    nullHandling: 'Unavailable when liabilities missing or zero',
  },
  {
    id: 'ind-board-vacancy',
    name: 'Board Vacancies',
    domain: SCORECARD_DIMENSION.GOVERNANCE,
    formulaOrRule: 'count of vacancy slots',
    period: 'as-of demo date',
    threshold: '0 preferred; ≥2 high governance risk',
    outputType: 'count',
    status: 'provisional',
    methodologyNote: INTEL_METHODOLOGY_NOTE,
    nullHandling: 'Unavailable when board register empty',
  },
  {
    id: 'ind-capacity',
    name: 'Capacity Utilization',
    domain: SCORECARD_DIMENSION.OPERATIONS,
    formulaOrRule: 'actualProduction / installedCapacity × 100',
    period: 'reporting period',
    threshold: '≥70 preferred; <40 weak',
    outputType: 'percent',
    status: 'provisional',
    methodologyNote: INTEL_METHODOLOGY_NOTE,
    nullHandling: 'Unavailable when no industrial row',
  },
  {
    id: 'ind-risk-financial',
    name: 'Financial Risk Level',
    domain: RISK_DIMENSION.FINANCIAL,
    formulaOrRule:
      'Consecutive losses, debt ratio, subsidy dependence, overdue loans → risk band',
    period: 'reporting period + history',
    threshold: 'Critical if ≥3 loss years or overdue loans with high debt',
    outputType: 'risk_level',
    status: 'provisional',
    methodologyNote: INTEL_METHODOLOGY_NOTE,
    nullHandling: 'Pending verification when finance not approved/locked',
  },
  {
    id: 'ind-ew-consecutive-loss',
    name: 'Consecutive Losses',
    domain: 'early_warning',
    formulaOrRule: 'Count trailing annual periods with profitOrLoss < 0',
    period: 'multi-year',
    threshold: 'Signal when ≥2; critical attention at ≥3',
    outputType: 'signal',
    status: 'provisional',
    methodologyNote: INTEL_METHODOLOGY_NOTE,
    nullHandling: 'Insufficient history when <2 annual periods',
  },
  {
    id: 'ind-bench-roa',
    name: 'ROA (benchmark)',
    domain: 'benchmark',
    formulaOrRule: 'profitOrLoss / totalAssets × 100',
    period: 'reporting period',
    outputType: 'percent',
    status: 'provisional',
    methodologyNote: INTEL_METHODOLOGY_NOTE,
    nullHandling: 'Excluded from rank when unavailable',
  },
]

export function getIndicatorDefinition(id: string): IndicatorDefinition | undefined {
  return INDICATOR_REGISTRY.find((i) => i.id === id)
}

export function getScoreDimensionDef(
  dimension: ScorecardDimension,
): ScoreDimensionDef | undefined {
  return SCORE_DIMENSION_DEFS.find((d) => d.dimension === dimension)
}

/** Map 0–100 score to risk-like band for display (higher score = lower risk) */
export function scoreToBand(score: number | null): RiskStatus | null {
  if (score == null || !Number.isFinite(score)) return null
  if (score >= 75) return RISK_STATUS.LOW
  if (score >= 55) return RISK_STATUS.MODERATE
  if (score >= 35) return RISK_STATUS.HIGH
  return RISK_STATUS.CRITICAL
}

export function clampScore(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)))
}

export function riskRank(level: RiskStatus): number {
  switch (level) {
    case RISK_STATUS.CRITICAL:
      return 4
    case RISK_STATUS.HIGH:
      return 3
    case RISK_STATUS.MODERATE:
      return 2
    default:
      return 1
  }
}

export function maxRisk(...levels: Array<RiskStatus | null | undefined>): RiskStatus {
  let best: RiskStatus = RISK_STATUS.LOW
  for (const l of levels) {
    if (l && riskRank(l) > riskRank(best)) best = l
  }
  return best
}

export const BENCHMARK_METRIC_META: Record<
  BenchmarkMetric,
  { higherIsBetter: boolean; unit: string }
> = {
  [BENCHMARK_METRIC.PROFITABILITY]: { higherIsBetter: true, unit: '%' },
  [BENCHMARK_METRIC.SUBSIDY_DEPENDENCE]: { higherIsBetter: false, unit: '%' },
  [BENCHMARK_METRIC.ROA]: { higherIsBetter: true, unit: '%' },
  [BENCHMARK_METRIC.DEBT]: { higherIsBetter: false, unit: '%' },
  [BENCHMARK_METRIC.CAPACITY_UTILIZATION]: { higherIsBetter: true, unit: '%' },
  [BENCHMARK_METRIC.GOVERNANCE]: { higherIsBetter: true, unit: 'score' },
  [BENCHMARK_METRIC.ASSET_EFFICIENCY]: { higherIsBetter: true, unit: 'score' },
}
