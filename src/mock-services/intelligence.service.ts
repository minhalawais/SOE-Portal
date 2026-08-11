/**
 * Phase 19 — Intelligence, Risk and Benchmarking mock service.
 * All scores/risks reconcile to fixtures via centralized registry rules.
 */
import {
  ASSET_LITIGATION_STATUS,
  ASSET_OCCUPANCY,
  ASSET_UTILIZATION,
  BENCHMARK_METRIC,
  INTEL_DATA_STATUS,
  INTEL_TREND,
  RISK_DIMENSION,
  RISK_DIMENSION_LABEL,
  RISK_STATUS,
  SCORECARD_DIMENSION,
  SCORECARD_DIMENSION_LABEL,
  SUBMISSION_STATUS,
  type BenchmarkMetric,
  type IntelDataStatus,
  type IntelTrend,
  type RiskDimension,
  type RiskStatus,
  type ScorecardDimension,
  type SoeStatus,
} from '@/constants'
import { deriveOrganizationMetrics } from '@/mock-data/derived'
import { db } from '@/mock-data/db'
import type { FinancialMetric, Organization } from '@/types/domain'
import { simulateLatency } from '@/utils'
import {
  calcCurrentRatio,
  calcDebtRatio,
  calcProfitMargin,
  calcRoa,
  calcYoyChange,
  consecutiveLossYears,
} from '@/workflow/financeKpis'
import {
  BENCHMARK_METRIC_META,
  INDICATOR_REGISTRY,
  INTEL_METHODOLOGY_NOTE,
  RISK_DIMENSION_ORDER,
  SCORE_DIMENSION_DEFS,
  SCORECARD_DIMENSION_ORDER,
  clampScore,
  maxRisk,
  riskRank,
  scoreToBand,
  type IndicatorDefinition,
} from '@/workflow/intelligenceRegistry'

export interface IntelligenceFilter {
  reportingPeriodId?: string
  sector?: string
  organizationId?: string
  /** Comma-separated org ids for selected peer group */
  selectedOrganizationIds?: string[]
  peerGroup?: 'all' | 'sector' | 'selected'
  metric?: BenchmarkMetric
}

export interface ExplainDriver {
  id: string
  label: string
  detail: string
  href: string
}

export interface ScoreComponentResult {
  id: string
  name: string
  score: number | null
  dataStatus: IntelDataStatus
  rawDisplay: string
  weight: number
  definition: string
  drillHref: string
}

export interface DimensionScoreResult {
  dimension: ScorecardDimension
  label: string
  score: number | null
  band: RiskStatus | null
  dataStatus: IntelDataStatus
  trend: IntelTrend
  periodLabel: string
  components: ScoreComponentResult[]
  definition: string
  drillHref: string
}

export interface SoeScorecard {
  organizationId: string
  abbreviation: string
  name: string
  sector: string
  status: SoeStatus
  reportingPeriodId: string
  periodLabel: string
  /** Composite of available dimensions only — prototype */
  overallScore: number | null
  overallBand: RiskStatus | null
  overallDataStatus: IntelDataStatus
  dimensions: DimensionScoreResult[]
  isPrototypeMethodology: true
  methodologyNote: string
}

export interface RiskCell {
  dimension: RiskDimension
  label: string
  level: RiskStatus
  dataStatus: IntelDataStatus
  trend: IntelTrend
  reasons: string[]
  drivers: ExplainDriver[]
  lastEvaluatedPeriod: string
}

export interface SoeRiskProfile {
  organizationId: string
  abbreviation: string
  name: string
  sector: string
  reportingPeriodId: string
  overallLevel: RiskStatus
  cells: RiskCell[]
  isPrototypeMethodology: true
  methodologyNote: string
}

export interface HeatMapRow {
  organizationId: string
  abbreviation: string
  name: string
  sector: string
  levels: Record<RiskDimension, RiskStatus>
  dataStatuses: Record<RiskDimension, IntelDataStatus>
  maxLevel: RiskStatus
  concernRank: number
  route: string
}

export interface BenchmarkRow {
  organizationId: string
  abbreviation: string
  name: string
  sector: string
  metric: BenchmarkMetric
  currentValue: number | null
  priorValue: number | null
  change: number | null
  rank: number | null
  dataStatus: IntelDataStatus
  statusBand: RiskStatus | null
  drillHref: string
}

export interface EarlyWarningSignal {
  id: string
  organizationId: string
  abbreviation: string
  name: string
  sector: string
  signalCode: string
  title: string
  detail: string
  level: RiskStatus
  trend: IntelTrend
  periodLabel: string
  href: string
  isPrototypeRule: true
}

export interface TrendItem {
  indicator: string
  direction: IntelTrend
  magnitudeDisplay: string
  periodSpan: string
  note: string
  href: string
}

export interface SoeTrendView {
  organizationId: string
  abbreviation: string
  name: string
  reportingPeriodId: string
  deteriorating: TrendItem[]
  improving: TrendItem[]
  stable: TrendItem[]
  caveat: string
}

export interface IntelligenceService {
  getScorecard(organizationId: string, filter?: IntelligenceFilter): Promise<SoeScorecard>
  listScorecards(filter?: IntelligenceFilter): Promise<SoeScorecard[]>
  getRiskProfile(organizationId: string, filter?: IntelligenceFilter): Promise<SoeRiskProfile>
  getHeatMap(filter?: IntelligenceFilter): Promise<HeatMapRow[]>
  getBenchmark(filter?: IntelligenceFilter): Promise<BenchmarkRow[]>
  getEarlyWarnings(filter?: IntelligenceFilter): Promise<EarlyWarningSignal[]>
  getTrendView(organizationId: string, filter?: IntelligenceFilter): Promise<SoeTrendView>
  getIndicatorRegistry(): Promise<IndicatorDefinition[]>
  getFilterOptions(): Promise<{
    sectors: string[]
    organizations: Array<{ id: string; label: string; sector: string }>
    periods: Array<{ id: string; label: string }>
  }>
}

function periodId(filter?: IntelligenceFilter) {
  return filter?.reportingPeriodId ?? 'period-fy2027'
}

function periodLabel(id: string) {
  return db.reportingPeriods.find((p) => p.id === id)?.label ?? id
}

function annualPeriodOrder(): string[] {
  return db.reportingPeriods
    .filter((p) => p.type === 'annual')
    .sort((a, b) => a.startDate.localeCompare(b.startDate))
    .map((p) => p.id)
}

function priorPeriodId(current: string): string | undefined {
  const order = annualPeriodOrder()
  const idx = order.indexOf(current)
  return idx > 0 ? order[idx - 1] : undefined
}

function filterOrgs(filter?: IntelligenceFilter): Organization[] {
  let orgs = [...db.organizations]
  if (filter?.organizationId) {
    orgs = orgs.filter((o) => o.id === filter.organizationId)
  }
  if (filter?.sector) orgs = orgs.filter((o) => o.sector === filter.sector)
  if (filter?.peerGroup === 'selected' && filter.selectedOrganizationIds?.length) {
    const set = new Set(filter.selectedOrganizationIds)
    orgs = orgs.filter((o) => set.has(o.id))
  }
  if (filter?.peerGroup === 'sector' && filter.sector) {
    orgs = orgs.filter((o) => o.sector === filter.sector)
  }
  return orgs
}

function financeFor(orgId: string, reportingPeriodId: string): FinancialMetric | undefined {
  return db.financialMetrics.find(
    (f) => f.organizationId === orgId && f.reportingPeriodId === reportingPeriodId,
  )
}

function financePending(fin?: FinancialMetric): boolean {
  if (!fin) return false
  return !(
    fin.status === SUBMISSION_STATUS.APPROVED ||
    fin.status === SUBMISSION_STATUS.LOCKED
  )
}

function industrialFor(orgId: string, reportingPeriodId: string) {
  return db.industrialPerformance.find(
    (i) => i.organizationId === orgId && i.reportingPeriodId === reportingPeriodId,
  )
}

function lossYears(orgId: string, reportingPeriodId: string): number {
  const order = annualPeriodOrder()
  const idx = order.indexOf(reportingPeriodId)
  const slice = idx >= 0 ? order.slice(0, idx + 1) : [reportingPeriodId]
  return consecutiveLossYears(
    db.financialMetrics.filter((m) => m.organizationId === orgId),
    slice,
  )
}

function portalBase(filter?: IntelligenceFilter): string {
  // Drill links prefer MoIP analyst paths; executive portals deep-link via query.
  void filter
  return '/moip'
}

function scoreFromMargin(margin: number | null): number | null {
  if (margin == null) return null
  if (margin >= 15) return 95
  if (margin >= 10) return 85
  if (margin >= 5) return 70
  if (margin >= 0) return 55
  if (margin >= -10) return 35
  return 15
}

function scoreFromDebt(debtPct: number | null): number | null {
  if (debtPct == null) return null
  if (debtPct <= 30) return 90
  if (debtPct <= 40) return 75
  if (debtPct <= 55) return 55
  if (debtPct <= 70) return 35
  return 15
}

function scoreFromSubsidy(dep: number | null): number | null {
  if (dep == null) return null
  if (dep <= 5) return 95
  if (dep <= 15) return 75
  if (dep <= 30) return 50
  if (dep <= 50) return 30
  return 10
}

function scoreFromCurrentRatio(r: number | null): number | null {
  if (r == null) return null
  if (r >= 1.5) return 90
  if (r >= 1.2) return 75
  if (r >= 1) return 55
  if (r >= 0.7) return 35
  return 15
}

function weightedAverage(
  parts: Array<{ score: number | null; weight: number }>,
): { score: number | null; dataStatus: IntelDataStatus } {
  const available = parts.filter((p) => p.score != null)
  if (available.length === 0) {
    return { score: null, dataStatus: INTEL_DATA_STATUS.UNAVAILABLE }
  }
  const wSum = available.reduce((s, p) => s + p.weight, 0)
  if (wSum <= 0) return { score: null, dataStatus: INTEL_DATA_STATUS.UNAVAILABLE }
  const score = clampScore(
    available.reduce((s, p) => s + (p.score as number) * p.weight, 0) / wSum,
  )
  return {
    score,
    dataStatus:
      available.length < parts.length
        ? INTEL_DATA_STATUS.PENDING_VERIFICATION
        : INTEL_DATA_STATUS.AVAILABLE,
  }
}

function trendFromDelta(
  current: number | null,
  prior: number | null,
  higherIsBetter: boolean,
  epsilon = 0.5,
): IntelTrend {
  if (current == null || prior == null) return INTEL_TREND.UNKNOWN
  const delta = current - prior
  if (Math.abs(delta) < epsilon) return INTEL_TREND.STABLE
  const improved = higherIsBetter ? delta > 0 : delta < 0
  return improved ? INTEL_TREND.IMPROVING : INTEL_TREND.DETERIORATING
}

function buildScorecard(org: Organization, reportingPeriodId: string): SoeScorecard {
  const fin = financeFor(org.id, reportingPeriodId)
  const priorId = priorPeriodId(reportingPeriodId)
  const priorFin = priorId ? financeFor(org.id, priorId) : undefined
  const industrial = industrialFor(org.id, reportingPeriodId)
  const priorIndustrial = priorId ? industrialFor(org.id, priorId) : undefined
  const metrics = deriveOrganizationMetrics(org.id, reportingPeriodId)
  const base = portalBase()
  const label = periodLabel(reportingPeriodId)
  const pending = financePending(fin)

  const margin = fin ? calcProfitMargin(fin) : null
  const debt = fin ? calcDebtRatio(fin) : null
  const subsidyDep =
    fin && fin.revenue > 0 ? (fin.subsidies / fin.revenue) * 100 : fin ? null : null
  const currentRatio = fin ? calcCurrentRatio(fin) : null
  const priorMargin = priorFin ? calcProfitMargin(priorFin) : null

  const finComponents: ScoreComponentResult[] = [
    {
      id: 'fin-profitability',
      name: 'Profitability',
      score: scoreFromMargin(margin),
      dataStatus: fin
        ? pending
          ? INTEL_DATA_STATUS.PENDING_VERIFICATION
          : INTEL_DATA_STATUS.AVAILABLE
        : INTEL_DATA_STATUS.UNAVAILABLE,
      rawDisplay: margin == null ? '—' : `${margin.toFixed(1)}%`,
      weight: 0.3,
      definition: 'Profit or loss ÷ revenue',
      drillHref: `${base}/finance?soe=${org.id}`,
    },
    {
      id: 'fin-debt',
      name: 'Debt',
      score: scoreFromDebt(debt),
      dataStatus: fin
        ? pending
          ? INTEL_DATA_STATUS.PENDING_VERIFICATION
          : INTEL_DATA_STATUS.AVAILABLE
        : INTEL_DATA_STATUS.UNAVAILABLE,
      rawDisplay: debt == null ? '—' : `${debt.toFixed(1)}%`,
      weight: 0.25,
      definition: 'Total debt ÷ total assets',
      drillHref: `${base}/finance?soe=${org.id}`,
    },
    {
      id: 'fin-subsidy',
      name: 'Subsidy Dependence',
      score: scoreFromSubsidy(subsidyDep),
      dataStatus: fin
        ? pending
          ? INTEL_DATA_STATUS.PENDING_VERIFICATION
          : INTEL_DATA_STATUS.AVAILABLE
        : INTEL_DATA_STATUS.UNAVAILABLE,
      rawDisplay: subsidyDep == null ? '—' : `${subsidyDep.toFixed(1)}%`,
      weight: 0.25,
      definition: 'Subsidies ÷ revenue',
      drillHref: `${base}/finance?soe=${org.id}`,
    },
    {
      id: 'fin-liquidity',
      name: 'Liquidity',
      score: scoreFromCurrentRatio(currentRatio),
      dataStatus: fin
        ? pending
          ? INTEL_DATA_STATUS.PENDING_VERIFICATION
          : INTEL_DATA_STATUS.AVAILABLE
        : INTEL_DATA_STATUS.UNAVAILABLE,
      rawDisplay: currentRatio == null ? '—' : currentRatio.toFixed(2),
      weight: 0.2,
      definition: 'Current assets ÷ current liabilities',
      drillHref: `${base}/finance?soe=${org.id}`,
    },
  ]
  const finAgg = weightedAverage(finComponents)

  const vacancyScore =
    metrics.boardVacancies === 0 ? 95 : metrics.boardVacancies === 1 ? 60 : 25
  const expiryScore =
    metrics.boardExpiringSoon === 0 ? 90 : metrics.boardExpiringSoon === 1 ? 65 : 35
  const boardEmpty =
    db.boardMembers.filter((b) => b.organizationId === org.id).length === 0
  const govComponents: ScoreComponentResult[] = [
    {
      id: 'gov-vacancies',
      name: 'Board Completeness',
      score: boardEmpty ? null : vacancyScore,
      dataStatus: boardEmpty
        ? INTEL_DATA_STATUS.UNAVAILABLE
        : INTEL_DATA_STATUS.AVAILABLE,
      rawDisplay: boardEmpty ? '—' : `${metrics.boardVacancies} vacancies`,
      weight: 0.55,
      definition: 'Vacancy slots on board register',
      drillHref: `${base}/governance?soe=${org.id}`,
    },
    {
      id: 'gov-expiry',
      name: 'Board Tenure Stability',
      score: boardEmpty ? null : expiryScore,
      dataStatus: boardEmpty
        ? INTEL_DATA_STATUS.UNAVAILABLE
        : INTEL_DATA_STATUS.AVAILABLE,
      rawDisplay: boardEmpty ? '—' : `${metrics.boardExpiringSoon} expiring ≤90d`,
      weight: 0.45,
      definition: 'Members expiring within 90 days',
      drillHref: `${base}/governance?soe=${org.id}`,
    },
  ]
  const govAgg = weightedAverage(govComponents)

  const overdue = metrics.overdueComplianceCount
  const compScore = overdue === 0 ? 95 : overdue === 1 ? 60 : overdue === 2 ? 40 : 20
  const compComponents: ScoreComponentResult[] = [
    {
      id: 'comp-overdue',
      name: 'Obligation Timeliness',
      score: compScore,
      dataStatus: INTEL_DATA_STATUS.AVAILABLE,
      rawDisplay: `${overdue} overdue / non-compliant`,
      weight: 1,
      definition: 'Overdue or non-compliant obligations',
      drillHref: `${base}/audit-compliance?soe=${org.id}`,
    },
  ]
  const compAgg = weightedAverage(compComponents)

  const util = industrial?.capacityUtilization ?? null
  const opsScore =
    util == null ? null : util >= 70 ? 90 : util >= 55 ? 70 : util >= 40 ? 45 : 20
  const opsComponents: ScoreComponentResult[] = [
    {
      id: 'ops-capacity',
      name: 'Capacity Utilization',
      score: opsScore,
      dataStatus:
        util == null ? INTEL_DATA_STATUS.UNAVAILABLE : INTEL_DATA_STATUS.AVAILABLE,
      rawDisplay: util == null ? '—' : `${util.toFixed(1)}%`,
      weight: 1,
      definition: 'Actual production ÷ installed capacity',
      drillHref: `${base}/industrial?soe=${org.id}`,
    },
  ]
  const opsAgg = weightedAverage(opsComponents)

  const orgAssets = db.assets.filter((a) => a.organizationId === org.id)
  const idleUnused =
    orgAssets.length === 0
      ? null
      : orgAssets.filter(
          (a) =>
            a.utilizationStatus === ASSET_UTILIZATION.UNUSED ||
            a.utilizationStatus === ASSET_UTILIZATION.IDLE ||
            a.occupancyStatus === ASSET_OCCUPANCY.VACANT,
        ).length / orgAssets.length
  const assetScore =
    idleUnused == null
      ? null
      : idleUnused <= 0.1
        ? 90
        : idleUnused <= 0.25
          ? 70
          : idleUnused <= 0.4
            ? 45
            : 25
  const assetComponents: ScoreComponentResult[] = [
    {
      id: 'asset-util',
      name: 'Asset Utilization',
      score: assetScore,
      dataStatus:
        orgAssets.length === 0
          ? INTEL_DATA_STATUS.UNAVAILABLE
          : INTEL_DATA_STATUS.AVAILABLE,
      rawDisplay:
        idleUnused == null ? '—' : `${(idleUnused * 100).toFixed(0)}% unused/idle/vacant`,
      weight: 1,
      definition: 'Share of unused, idle or vacant assets',
      drillHref: `${base}/assets?soe=${org.id}`,
    },
  ]
  const assetAgg = weightedAverage(assetComponents)

  const stratScore =
    industrial == null
      ? null
      : industrial.capacityUtilization >= 70 && industrial.exports > 200_000_000
        ? 85
        : industrial.capacityUtilization >= 50
          ? 65
          : 35
  const stratComponents: ScoreComponentResult[] = [
    {
      id: 'strat-industrial',
      name: 'Industrial Output Signal',
      score: stratScore,
      dataStatus:
        industrial == null
          ? INTEL_DATA_STATUS.UNAVAILABLE
          : INTEL_DATA_STATUS.AVAILABLE,
      rawDisplay:
        industrial == null
          ? '—'
          : `Util ${industrial.capacityUtilization}% · exports ${Math.round(industrial.exports / 1e6)}m`,
      weight: 1,
      definition: 'Prototype industrial contribution signal',
      drillHref: `${base}/industrial?soe=${org.id}`,
    },
  ]
  const stratAgg = weightedAverage(stratComponents)

  const dimResults: DimensionScoreResult[] = [
    {
      dimension: SCORECARD_DIMENSION.FINANCIAL,
      label: SCORECARD_DIMENSION_LABEL.financial,
      score: finAgg.score,
      band: scoreToBand(finAgg.score),
      dataStatus: !fin
        ? INTEL_DATA_STATUS.UNAVAILABLE
        : pending
          ? INTEL_DATA_STATUS.PENDING_VERIFICATION
          : finAgg.dataStatus,
      trend: trendFromDelta(margin, priorMargin, true, 1),
      periodLabel: label,
      components: finComponents,
      definition: SCORE_DIMENSION_DEFS.find((d) => d.dimension === 'financial')!
        .components.map((c) => c.name)
        .join(', '),
      drillHref: `${base}/finance?soe=${org.id}`,
    },
    {
      dimension: SCORECARD_DIMENSION.GOVERNANCE,
      label: SCORECARD_DIMENSION_LABEL.governance,
      score: govAgg.score,
      band: scoreToBand(govAgg.score),
      dataStatus: govAgg.dataStatus,
      trend: INTEL_TREND.STABLE,
      periodLabel: label,
      components: govComponents,
      definition: 'Board completeness and tenure stability',
      drillHref: `${base}/governance?soe=${org.id}`,
    },
    {
      dimension: SCORECARD_DIMENSION.COMPLIANCE,
      label: SCORECARD_DIMENSION_LABEL.compliance,
      score: compAgg.score,
      band: scoreToBand(compAgg.score),
      dataStatus: INTEL_DATA_STATUS.AVAILABLE,
      trend: INTEL_TREND.STABLE,
      periodLabel: label,
      components: compComponents,
      definition: 'Obligation timeliness',
      drillHref: `${base}/audit-compliance?soe=${org.id}`,
    },
    {
      dimension: SCORECARD_DIMENSION.OPERATIONS,
      label: SCORECARD_DIMENSION_LABEL.operations,
      score: opsAgg.score,
      band: scoreToBand(opsAgg.score),
      dataStatus: opsAgg.dataStatus,
      trend: trendFromDelta(
        util,
        priorIndustrial?.capacityUtilization ?? null,
        true,
        1,
      ),
      periodLabel: label,
      components: opsComponents,
      definition: 'Capacity utilization',
      drillHref: `${base}/industrial?soe=${org.id}`,
    },
    {
      dimension: SCORECARD_DIMENSION.ASSET_EFFICIENCY,
      label: SCORECARD_DIMENSION_LABEL.asset_efficiency,
      score: assetAgg.score,
      band: scoreToBand(assetAgg.score),
      dataStatus: assetAgg.dataStatus,
      trend: INTEL_TREND.UNKNOWN,
      periodLabel: label,
      components: assetComponents,
      definition: 'Asset utilization share',
      drillHref: `${base}/assets?soe=${org.id}`,
    },
    {
      dimension: SCORECARD_DIMENSION.STRATEGIC_CONTRIBUTION,
      label: SCORECARD_DIMENSION_LABEL.strategic_contribution,
      score: stratAgg.score,
      band: scoreToBand(stratAgg.score),
      dataStatus: stratAgg.dataStatus,
      trend: trendFromDelta(
        util,
        priorIndustrial?.capacityUtilization ?? null,
        true,
        1,
      ),
      periodLabel: label,
      components: stratComponents,
      definition: 'Prototype industrial contribution',
      drillHref: `${base}/industrial?soe=${org.id}`,
    },
  ]

  // Composite: weighted average of available dimensions only (exclude unavailable)
  const compositeParts = dimResults
    .filter((d) => d.score != null && d.dataStatus !== INTEL_DATA_STATUS.UNAVAILABLE)
    .map((d) => {
      const def = SCORE_DIMENSION_DEFS.find((x) => x.dimension === d.dimension)!
      return { score: d.score, weight: def.weightInComposite }
    })
  const composite = weightedAverage(compositeParts)

  return {
    organizationId: org.id,
    abbreviation: org.abbreviation,
    name: org.name,
    sector: org.sector,
    status: org.status,
    reportingPeriodId,
    periodLabel: label,
    overallScore: composite.score,
    overallBand: scoreToBand(composite.score),
    overallDataStatus:
      compositeParts.length === 0
        ? INTEL_DATA_STATUS.UNAVAILABLE
        : compositeParts.length < SCORECARD_DIMENSION_ORDER.length
          ? INTEL_DATA_STATUS.PENDING_VERIFICATION
          : INTEL_DATA_STATUS.AVAILABLE,
    dimensions: dimResults,
    isPrototypeMethodology: true,
    methodologyNote: INTEL_METHODOLOGY_NOTE,
  }
}

function buildRiskProfile(org: Organization, reportingPeriodId: string): SoeRiskProfile {
  const scorecard = buildScorecard(org, reportingPeriodId)
  const fin = financeFor(org.id, reportingPeriodId)
  const metrics = deriveOrganizationMetrics(org.id, reportingPeriodId)
  const label = periodLabel(reportingPeriodId)
  const base = portalBase()
  const losses = lossYears(org.id, reportingPeriodId)
  const debt = fin ? calcDebtRatio(fin) : null
  const subsidyDep =
    fin && fin.revenue > 0 ? (fin.subsidies / fin.revenue) * 100 : null
  const pending = financePending(fin)

  const financialLevel: RiskStatus = (() => {
    if (!fin) return RISK_STATUS.MODERATE
    if (losses >= 3 || metrics.overdueLoanCount > 0) return RISK_STATUS.CRITICAL
    if (losses >= 2 || (debt != null && debt > 70) || (subsidyDep != null && subsidyDep > 40))
      return RISK_STATUS.HIGH
    if (fin.profitOrLoss < 0 || (debt != null && debt > 55) || (subsidyDep != null && subsidyDep > 20))
      return RISK_STATUS.MODERATE
    return RISK_STATUS.LOW
  })()

  const governanceLevel: RiskStatus =
    metrics.boardVacancies >= 2 || metrics.boardExpiringSoon >= 3
      ? RISK_STATUS.CRITICAL
      : metrics.boardVacancies >= 1 || metrics.boardExpiringSoon >= 1
        ? RISK_STATUS.HIGH
        : RISK_STATUS.LOW

  const legalLevel: RiskStatus =
    metrics.activeLitigationCount >= 5
      ? RISK_STATUS.CRITICAL
      : metrics.activeLitigationCount >= 2
        ? RISK_STATUS.HIGH
        : metrics.activeLitigationCount === 1
          ? RISK_STATUS.MODERATE
          : RISK_STATUS.LOW

  const auditLevel: RiskStatus =
    metrics.openAuditCount >= 8
      ? RISK_STATUS.CRITICAL
      : metrics.openAuditCount >= 4
        ? RISK_STATUS.HIGH
        : metrics.openAuditCount >= 1
          ? RISK_STATUS.MODERATE
          : RISK_STATUS.LOW

  const complianceLevel: RiskStatus =
    metrics.overdueComplianceCount >= 3
      ? RISK_STATUS.CRITICAL
      : metrics.overdueComplianceCount >= 1
        ? RISK_STATUS.HIGH
        : RISK_STATUS.LOW

  const idleShare =
    db.assets.filter((a) => a.organizationId === org.id).length === 0
      ? 0
      : db.assets.filter(
          (a) =>
            a.organizationId === org.id &&
            (a.utilizationStatus === ASSET_UTILIZATION.UNUSED ||
              a.utilizationStatus === ASSET_UTILIZATION.IDLE ||
              a.litigationStatus === ASSET_LITIGATION_STATUS.ACTIVE),
        ).length / db.assets.filter((a) => a.organizationId === org.id).length

  const litigatedAssets = db.assets.filter(
    (a) =>
      a.organizationId === org.id &&
      a.litigationStatus === ASSET_LITIGATION_STATUS.ACTIVE,
  ).length

  const assetLevel: RiskStatus =
    litigatedAssets >= 2 || idleShare >= 0.4
      ? RISK_STATUS.HIGH
      : idleShare >= 0.25 || litigatedAssets >= 1
        ? RISK_STATUS.MODERATE
        : RISK_STATUS.LOW

  const cells: RiskCell[] = [
    {
      dimension: RISK_DIMENSION.FINANCIAL,
      label: RISK_DIMENSION_LABEL.financial,
      level: financialLevel,
      dataStatus: !fin
        ? INTEL_DATA_STATUS.UNAVAILABLE
        : pending
          ? INTEL_DATA_STATUS.PENDING_VERIFICATION
          : INTEL_DATA_STATUS.AVAILABLE,
      trend: scorecard.dimensions.find((d) => d.dimension === 'financial')?.trend ?? INTEL_TREND.UNKNOWN,
      reasons: [
        losses >= 2 ? `Losses for ${losses} consecutive years` : null,
        fin && fin.profitOrLoss < 0 ? 'Current period loss' : null,
        debt != null && debt > 55 ? `Debt ratio ${debt.toFixed(0)}%` : null,
        subsidyDep != null && subsidyDep > 20
          ? `Subsidy dependence ${subsidyDep.toFixed(0)}%`
          : null,
        metrics.overdueLoanCount > 0 ? `${metrics.overdueLoanCount} overdue loan(s)` : null,
      ].filter(Boolean) as string[],
      drivers: [
        {
          id: 'fin-stmt',
          label: 'Financial performance',
          detail: fin
            ? `P/L ${fin.profitOrLoss.toLocaleString('en-PK')}`
            : 'No finance row',
          href: `${base}/finance?soe=${org.id}`,
        },
      ],
      lastEvaluatedPeriod: label,
    },
    {
      dimension: RISK_DIMENSION.GOVERNANCE,
      label: RISK_DIMENSION_LABEL.governance,
      level: governanceLevel,
      dataStatus: INTEL_DATA_STATUS.AVAILABLE,
      trend: INTEL_TREND.STABLE,
      reasons: [
        metrics.boardVacancies > 0 ? `${metrics.boardVacancies} board vacancy slot(s)` : null,
        metrics.boardExpiringSoon > 0
          ? `${metrics.boardExpiringSoon} membership(s) expiring ≤90 days`
          : null,
      ].filter(Boolean) as string[],
      drivers: [
        {
          id: 'gov-board',
          label: 'Board register',
          detail: 'Vacancies and tenure',
          href: `${base}/governance?soe=${org.id}`,
        },
      ],
      lastEvaluatedPeriod: label,
    },
    {
      dimension: RISK_DIMENSION.LEGAL,
      label: RISK_DIMENSION_LABEL.legal,
      level: legalLevel,
      dataStatus: INTEL_DATA_STATUS.AVAILABLE,
      trend: INTEL_TREND.STABLE,
      reasons:
        metrics.activeLitigationCount > 0
          ? [`${metrics.activeLitigationCount} active litigation case(s)`]
          : ['No active litigation in fixtures'],
      drivers: [
        {
          id: 'legal',
          label: 'Litigation register',
          detail: 'Active cases',
          href: `${base}/audit-compliance?soe=${org.id}`,
        },
      ],
      lastEvaluatedPeriod: label,
    },
    {
      dimension: RISK_DIMENSION.AUDIT,
      label: RISK_DIMENSION_LABEL.audit,
      level: auditLevel,
      dataStatus: INTEL_DATA_STATUS.AVAILABLE,
      trend: INTEL_TREND.STABLE,
      reasons:
        metrics.openAuditCount > 0
          ? [`${metrics.openAuditCount} open audit para(s)`]
          : ['No open audit paras'],
      drivers: [
        {
          id: 'audit',
          label: 'Audit paras',
          detail: 'Open exposure',
          href: `${base}/audit-compliance?soe=${org.id}`,
        },
      ],
      lastEvaluatedPeriod: label,
    },
    {
      dimension: RISK_DIMENSION.COMPLIANCE,
      label: RISK_DIMENSION_LABEL.compliance,
      level: complianceLevel,
      dataStatus: INTEL_DATA_STATUS.AVAILABLE,
      trend: INTEL_TREND.STABLE,
      reasons:
        metrics.overdueComplianceCount > 0
          ? [`${metrics.overdueComplianceCount} overdue / non-compliant obligation(s)`]
          : ['No overdue compliance obligations'],
      drivers: [
        {
          id: 'comp',
          label: 'Compliance matrix',
          detail: 'Obligation status',
          href: `${base}/audit-compliance?soe=${org.id}`,
        },
      ],
      lastEvaluatedPeriod: label,
    },
    {
      dimension: RISK_DIMENSION.ASSET,
      label: RISK_DIMENSION_LABEL.asset,
      level: assetLevel,
      dataStatus:
        db.assets.some((a) => a.organizationId === org.id)
          ? INTEL_DATA_STATUS.AVAILABLE
          : INTEL_DATA_STATUS.UNAVAILABLE,
      trend: INTEL_TREND.UNKNOWN,
      reasons: [
        idleShare >= 0.25 ? `${(idleShare * 100).toFixed(0)}% unused/idle/litigated assets` : null,
        litigatedAssets > 0 ? `${litigatedAssets} asset(s) with active litigation` : null,
      ].filter(Boolean) as string[],
      drivers: [
        {
          id: 'assets',
          label: 'Asset registry',
          detail: 'Utilization and litigation flags',
          href: `${base}/assets?soe=${org.id}`,
        },
      ],
      lastEvaluatedPeriod: label,
    },
  ]

  // Ensure empty reasons still explain Low
  for (const cell of cells) {
    if (cell.reasons.length === 0 && cell.level === RISK_STATUS.LOW) {
      cell.reasons.push('No material triggers under prototype rules')
    }
  }

  const overallLevel = maxRisk(...cells.map((c) => c.level))

  return {
    organizationId: org.id,
    abbreviation: org.abbreviation,
    name: org.name,
    sector: org.sector,
    reportingPeriodId,
    overallLevel,
    cells,
    isPrototypeMethodology: true,
    methodologyNote: INTEL_METHODOLOGY_NOTE,
  }
}

function metricValue(
  org: Organization,
  reportingPeriodId: string,
  metric: BenchmarkMetric,
): { value: number | null; dataStatus: IntelDataStatus } {
  const fin = financeFor(org.id, reportingPeriodId)
  const industrial = industrialFor(org.id, reportingPeriodId)
  const scorecard = buildScorecard(org, reportingPeriodId)
  switch (metric) {
    case BENCHMARK_METRIC.PROFITABILITY: {
      const v = fin ? calcProfitMargin(fin) : null
      return {
        value: v,
        dataStatus: v == null ? INTEL_DATA_STATUS.UNAVAILABLE : INTEL_DATA_STATUS.AVAILABLE,
      }
    }
    case BENCHMARK_METRIC.SUBSIDY_DEPENDENCE: {
      const v = fin && fin.revenue > 0 ? (fin.subsidies / fin.revenue) * 100 : null
      return {
        value: v,
        dataStatus: v == null ? INTEL_DATA_STATUS.UNAVAILABLE : INTEL_DATA_STATUS.AVAILABLE,
      }
    }
    case BENCHMARK_METRIC.ROA: {
      const v = fin ? calcRoa(fin) : null
      return {
        value: v,
        dataStatus: v == null ? INTEL_DATA_STATUS.UNAVAILABLE : INTEL_DATA_STATUS.AVAILABLE,
      }
    }
    case BENCHMARK_METRIC.DEBT: {
      const v = fin ? calcDebtRatio(fin) : null
      return {
        value: v,
        dataStatus: v == null ? INTEL_DATA_STATUS.UNAVAILABLE : INTEL_DATA_STATUS.AVAILABLE,
      }
    }
    case BENCHMARK_METRIC.CAPACITY_UTILIZATION: {
      const v = industrial?.capacityUtilization ?? null
      return {
        value: v,
        dataStatus: v == null ? INTEL_DATA_STATUS.UNAVAILABLE : INTEL_DATA_STATUS.AVAILABLE,
      }
    }
    case BENCHMARK_METRIC.GOVERNANCE: {
      const d = scorecard.dimensions.find((x) => x.dimension === 'governance')
      return {
        value: d?.score ?? null,
        dataStatus: d?.dataStatus ?? INTEL_DATA_STATUS.UNAVAILABLE,
      }
    }
    case BENCHMARK_METRIC.ASSET_EFFICIENCY: {
      const d = scorecard.dimensions.find((x) => x.dimension === 'asset_efficiency')
      return {
        value: d?.score ?? null,
        dataStatus: d?.dataStatus ?? INTEL_DATA_STATUS.UNAVAILABLE,
      }
    }
    default:
      return { value: null, dataStatus: INTEL_DATA_STATUS.UNAVAILABLE }
  }
}

function buildEarlyWarnings(
  orgs: Organization[],
  reportingPeriodId: string,
): EarlyWarningSignal[] {
  const label = periodLabel(reportingPeriodId)
  const priorId = priorPeriodId(reportingPeriodId)
  const signals: EarlyWarningSignal[] = []
  const base = portalBase()

  for (const org of orgs) {
    const fin = financeFor(org.id, reportingPeriodId)
    const prior = priorId ? financeFor(org.id, priorId) : undefined
    const industrial = industrialFor(org.id, reportingPeriodId)
    const priorInd = priorId ? industrialFor(org.id, priorId) : undefined
    const metrics = deriveOrganizationMetrics(org.id, reportingPeriodId)
    const losses = lossYears(org.id, reportingPeriodId)

    if (losses >= 2) {
      signals.push({
        id: `ew-loss-${org.id}`,
        organizationId: org.id,
        abbreviation: org.abbreviation,
        name: org.name,
        sector: org.sector,
        signalCode: 'consecutive_losses',
        title: 'Consecutive losses',
        detail: `${losses} consecutive annual loss years (prototype rule).`,
        level: losses >= 3 ? RISK_STATUS.CRITICAL : RISK_STATUS.HIGH,
        trend: INTEL_TREND.DETERIORATING,
        periodLabel: label,
        href: `${base}/finance?soe=${org.id}`,
        isPrototypeRule: true,
      })
    }

    if (fin && prior) {
      const revChange = calcYoyChange(fin.revenue, prior.revenue)
      if (revChange != null && revChange <= -10) {
        signals.push({
          id: `ew-rev-${org.id}`,
          organizationId: org.id,
          abbreviation: org.abbreviation,
          name: org.name,
          sector: org.sector,
          signalCode: 'declining_revenue',
          title: 'Declining revenue',
          detail: `Revenue change ${revChange.toFixed(1)}% vs prior period.`,
          level: revChange <= -20 ? RISK_STATUS.HIGH : RISK_STATUS.MODERATE,
          trend: INTEL_TREND.DETERIORATING,
          periodLabel: label,
          href: `${base}/finance?soe=${org.id}`,
          isPrototypeRule: true,
        })
      }
      const subNow = fin.revenue > 0 ? (fin.subsidies / fin.revenue) * 100 : null
      const subPrior = prior.revenue > 0 ? (prior.subsidies / prior.revenue) * 100 : null
      if (subNow != null && subPrior != null && subNow - subPrior >= 5) {
        signals.push({
          id: `ew-sub-${org.id}`,
          organizationId: org.id,
          abbreviation: org.abbreviation,
          name: org.name,
          sector: org.sector,
          signalCode: 'rising_subsidy',
          title: 'Increasing subsidy dependence',
          detail: `Dependence ${subPrior.toFixed(0)}% → ${subNow.toFixed(0)}%.`,
          level: subNow >= 30 ? RISK_STATUS.HIGH : RISK_STATUS.MODERATE,
          trend: INTEL_TREND.DETERIORATING,
          periodLabel: label,
          href: `${base}/finance?soe=${org.id}`,
          isPrototypeRule: true,
        })
      }
      const debtNow = calcDebtRatio(fin)
      const debtPrior = calcDebtRatio(prior)
      if (debtNow != null && debtPrior != null && debtNow - debtPrior >= 5) {
        signals.push({
          id: `ew-debt-${org.id}`,
          organizationId: org.id,
          abbreviation: org.abbreviation,
          name: org.name,
          sector: org.sector,
          signalCode: 'rising_debt',
          title: 'Increasing debt',
          detail: `Debt ratio ${debtPrior.toFixed(0)}% → ${debtNow.toFixed(0)}%.`,
          level: debtNow >= 70 ? RISK_STATUS.HIGH : RISK_STATUS.MODERATE,
          trend: INTEL_TREND.DETERIORATING,
          periodLabel: label,
          href: `${base}/finance?soe=${org.id}`,
          isPrototypeRule: true,
        })
      }
    } else if (!priorId) {
      // earliest period — insufficient history noted once per org for finance trends
      signals.push({
        id: `ew-hist-${org.id}`,
        organizationId: org.id,
        abbreviation: org.abbreviation,
        name: org.name,
        sector: org.sector,
        signalCode: 'insufficient_history',
        title: 'Insufficient history for trend signals',
        detail: 'YoY deterioration rules require a prior annual period.',
        level: RISK_STATUS.LOW,
        trend: INTEL_TREND.UNKNOWN,
        periodLabel: label,
        href: `${base}/intelligence?view=definitions`,
        isPrototypeRule: true,
      })
    }

    if (
      industrial &&
      priorInd &&
      industrial.capacityUtilization - priorInd.capacityUtilization <= -5
    ) {
      signals.push({
        id: `ew-cap-${org.id}`,
        organizationId: org.id,
        abbreviation: org.abbreviation,
        name: org.name,
        sector: org.sector,
        signalCode: 'falling_capacity',
        title: 'Falling capacity utilization',
        detail: `${priorInd.capacityUtilization}% → ${industrial.capacityUtilization}%.`,
        level:
          industrial.capacityUtilization < 40 ? RISK_STATUS.HIGH : RISK_STATUS.MODERATE,
        trend: INTEL_TREND.DETERIORATING,
        periodLabel: label,
        href: `${base}/industrial?soe=${org.id}`,
        isPrototypeRule: true,
      })
    }

    if (metrics.overdueComplianceCount >= 2) {
      signals.push({
        id: `ew-comp-${org.id}`,
        organizationId: org.id,
        abbreviation: org.abbreviation,
        name: org.name,
        sector: org.sector,
        signalCode: 'compliance_delay',
        title: 'Repeated compliance delay',
        detail: `${metrics.overdueComplianceCount} overdue / non-compliant obligations.`,
        level: RISK_STATUS.HIGH,
        trend: INTEL_TREND.DETERIORATING,
        periodLabel: label,
        href: `${base}/audit-compliance?soe=${org.id}`,
        isPrototypeRule: true,
      })
    }

    if (metrics.boardExpiringSoon >= 2) {
      signals.push({
        id: `ew-board-${org.id}`,
        organizationId: org.id,
        abbreviation: org.abbreviation,
        name: org.name,
        sector: org.sector,
        signalCode: 'board_expiry',
        title: 'Board expiry concentration',
        detail: `${metrics.boardExpiringSoon} membership(s) expiring within 90 days.`,
        level: RISK_STATUS.HIGH,
        trend: INTEL_TREND.STABLE,
        periodLabel: label,
        href: `${base}/governance?soe=${org.id}`,
        isPrototypeRule: true,
      })
    }

    if (metrics.openAuditCount >= 4) {
      signals.push({
        id: `ew-audit-${org.id}`,
        organizationId: org.id,
        abbreviation: org.abbreviation,
        name: org.name,
        sector: org.sector,
        signalCode: 'audit_exposure',
        title: 'Unresolved audit exposure',
        detail: `${metrics.openAuditCount} open audit paras.`,
        level: metrics.openAuditCount >= 8 ? RISK_STATUS.CRITICAL : RISK_STATUS.HIGH,
        trend: INTEL_TREND.STABLE,
        periodLabel: label,
        href: `${base}/audit-compliance?soe=${org.id}`,
        isPrototypeRule: true,
      })
    }

    if (metrics.activeLitigationCount >= 2) {
      signals.push({
        id: `ew-lit-${org.id}`,
        organizationId: org.id,
        abbreviation: org.abbreviation,
        name: org.name,
        sector: org.sector,
        signalCode: 'litigation_exposure',
        title: 'Increasing litigation exposure',
        detail: `${metrics.activeLitigationCount} active litigation cases.`,
        level:
          metrics.activeLitigationCount >= 5 ? RISK_STATUS.CRITICAL : RISK_STATUS.HIGH,
        trend: INTEL_TREND.STABLE,
        periodLabel: label,
        href: `${base}/audit-compliance?soe=${org.id}`,
        isPrototypeRule: true,
      })
    }
  }

  return signals.sort((a, b) => riskRank(b.level) - riskRank(a.level))
}

function buildTrendView(org: Organization, reportingPeriodId: string): SoeTrendView {
  const priorId = priorPeriodId(reportingPeriodId)
  const fin = financeFor(org.id, reportingPeriodId)
  const prior = priorId ? financeFor(org.id, priorId) : undefined
  const industrial = industrialFor(org.id, reportingPeriodId)
  const priorInd = priorId ? industrialFor(org.id, priorId) : undefined
  const base = portalBase()
  const span = priorId
    ? `${periodLabel(priorId)} → ${periodLabel(reportingPeriodId)}`
    : periodLabel(reportingPeriodId)

  const deteriorating: TrendItem[] = []
  const improving: TrendItem[] = []
  const stable: TrendItem[] = []

  const push = (
    indicator: string,
    current: number | null,
    prev: number | null,
    higherIsBetter: boolean,
    href: string,
    format: (n: number) => string,
  ) => {
    const dir = trendFromDelta(current, prev, higherIsBetter)
    const magnitude =
      current == null || prev == null
        ? '—'
        : `${format(prev)} → ${format(current)}`
    const item: TrendItem = {
      indicator,
      direction: dir,
      magnitudeDisplay: magnitude,
      periodSpan: span,
      note: 'Association only — causation not claimed.',
      href,
    }
    if (dir === INTEL_TREND.DETERIORATING) deteriorating.push(item)
    else if (dir === INTEL_TREND.IMPROVING) improving.push(item)
    else if (dir === INTEL_TREND.STABLE) stable.push(item)
  }

  if (fin && prior) {
    push(
      'Revenue',
      fin.revenue,
      prior.revenue,
      true,
      `${base}/finance?soe=${org.id}`,
      (n) => `${Math.round(n / 1e6)}m`,
    )
    push(
      'Profit / Loss',
      fin.profitOrLoss,
      prior.profitOrLoss,
      true,
      `${base}/finance?soe=${org.id}`,
      (n) => `${Math.round(n / 1e6)}m`,
    )
    push(
      'Debt ratio',
      calcDebtRatio(fin),
      calcDebtRatio(prior),
      false,
      `${base}/finance?soe=${org.id}`,
      (n) => `${n.toFixed(1)}%`,
    )
    const subNow = fin.revenue > 0 ? (fin.subsidies / fin.revenue) * 100 : null
    const subPrior = prior.revenue > 0 ? (prior.subsidies / prior.revenue) * 100 : null
    push(
      'Subsidy dependence',
      subNow,
      subPrior,
      false,
      `${base}/finance?soe=${org.id}`,
      (n) => `${n.toFixed(1)}%`,
    )
  }

  if (industrial && priorInd) {
    push(
      'Capacity utilization',
      industrial.capacityUtilization,
      priorInd.capacityUtilization,
      true,
      `${base}/industrial?soe=${org.id}`,
      (n) => `${n.toFixed(1)}%`,
    )
  }

  return {
    organizationId: org.id,
    abbreviation: org.abbreviation,
    name: org.name,
    reportingPeriodId,
    deteriorating,
    improving,
    stable,
    caveat:
      priorId == null
        ? 'Insufficient history for period-over-period comparison.'
        : 'Trends show direction and magnitude only; do not imply causation.',
  }
}

export const mockIntelligenceService: IntelligenceService = {
  async getScorecard(organizationId, filter) {
    const org = db.organizations.find((o) => o.id === organizationId)
    if (!org) throw new Error('Organization not found')
    return simulateLatency(buildScorecard(org, periodId(filter)))
  },

  async listScorecards(filter) {
    const pid = periodId(filter)
    return simulateLatency(filterOrgs(filter).map((o) => buildScorecard(o, pid)))
  },

  async getRiskProfile(organizationId, filter) {
    const org = db.organizations.find((o) => o.id === organizationId)
    if (!org) throw new Error('Organization not found')
    return simulateLatency(buildRiskProfile(org, periodId(filter)))
  },

  async getHeatMap(filter) {
    const pid = periodId(filter)
    const rows = filterOrgs(filter).map((org) => {
      const profile = buildRiskProfile(org, pid)
      const levels = {} as Record<RiskDimension, RiskStatus>
      const dataStatuses = {} as Record<RiskDimension, IntelDataStatus>
      for (const dim of RISK_DIMENSION_ORDER) {
        const cell = profile.cells.find((c) => c.dimension === dim)!
        levels[dim] = cell.level
        dataStatuses[dim] = cell.dataStatus
      }
      return {
        organizationId: org.id,
        abbreviation: org.abbreviation,
        name: org.name,
        sector: org.sector,
        levels,
        dataStatuses,
        maxLevel: profile.overallLevel,
        concernRank: riskRank(profile.overallLevel),
        route: `/moip/intelligence?view=scorecard&soe=${org.id}`,
      } satisfies HeatMapRow
    })
    rows.sort((a, b) => b.concernRank - a.concernRank || a.abbreviation.localeCompare(b.abbreviation))
    return simulateLatency(rows)
  },

  async getBenchmark(filter) {
    const pid = periodId(filter)
    const priorId = priorPeriodId(pid)
    const metric = filter?.metric ?? BENCHMARK_METRIC.ROA
    const meta = BENCHMARK_METRIC_META[metric]
    const orgs = filterOrgs(filter)

    const raw = orgs.map((org) => {
      const cur = metricValue(org, pid, metric)
      const prior = priorId
        ? metricValue(org, priorId, metric)
        : { value: null as number | null, dataStatus: INTEL_DATA_STATUS.INSUFFICIENT_HISTORY }
      const change =
        cur.value != null && prior.value != null ? cur.value - prior.value : null
      return {
        organizationId: org.id,
        abbreviation: org.abbreviation,
        name: org.name,
        sector: org.sector,
        metric,
        currentValue: cur.value,
        priorValue: prior.value,
        change,
        dataStatus:
          cur.dataStatus === INTEL_DATA_STATUS.UNAVAILABLE
            ? INTEL_DATA_STATUS.UNAVAILABLE
            : priorId
              ? cur.dataStatus
              : INTEL_DATA_STATUS.INSUFFICIENT_HISTORY,
        drillHref: `/moip/intelligence?view=scorecard&soe=${org.id}`,
      }
    })

    const ranked = [...raw]
      .filter((r) => r.currentValue != null)
      .sort((a, b) =>
        meta.higherIsBetter
          ? (b.currentValue as number) - (a.currentValue as number)
          : (a.currentValue as number) - (b.currentValue as number),
      )

    const rankMap = new Map<string, number>()
    ranked.forEach((r, i) => rankMap.set(r.organizationId, i + 1))

    const rows: BenchmarkRow[] = raw.map((r) => ({
      ...r,
      rank: rankMap.get(r.organizationId) ?? null,
      statusBand:
        r.currentValue == null
          ? null
          : scoreToBand(
              meta.higherIsBetter
                ? // normalize loosely for band display
                  Math.max(0, Math.min(100, 50 + r.currentValue))
                : Math.max(0, Math.min(100, 100 - r.currentValue)),
            ),
    }))

    rows.sort((a, b) => {
      if (a.rank == null && b.rank == null) return a.abbreviation.localeCompare(b.abbreviation)
      if (a.rank == null) return 1
      if (b.rank == null) return -1
      return a.rank - b.rank
    })

    return simulateLatency(rows)
  },

  async getEarlyWarnings(filter) {
    return simulateLatency(buildEarlyWarnings(filterOrgs(filter), periodId(filter)))
  },

  async getTrendView(organizationId, filter) {
    const org = db.organizations.find((o) => o.id === organizationId)
    if (!org) throw new Error('Organization not found')
    return simulateLatency(buildTrendView(org, periodId(filter)))
  },

  async getIndicatorRegistry() {
    return simulateLatency([...INDICATOR_REGISTRY])
  },

  async getFilterOptions() {
    const sectors = [...new Set(db.organizations.map((o) => o.sector))].sort()
    const organizations = db.organizations
      .map((o) => ({ id: o.id, label: o.abbreviation, sector: o.sector }))
      .sort((a, b) => a.label.localeCompare(b.label))
    const periods = db.reportingPeriods
      .filter((p) => p.type === 'annual')
      .sort((a, b) => b.startDate.localeCompare(a.startDate))
      .map((p) => ({ id: p.id, label: p.label }))
    return simulateLatency({ sectors, organizations, periods })
  },
}
