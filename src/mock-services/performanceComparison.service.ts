import { db } from '@/mock-data/db'
import type { Organization } from '@/types/domain'
import { simulateLatency } from '@/utils'

export type PerformanceScope = 'standalone' | 'consolidated'
export type PerformanceDataMode = 'approved' | 'reported'
export type PerformancePillar =
  | 'financial'
  | 'workforce'
  | 'assets'
  | 'operational'
  | 'compliance'
  | 'governance'
  | 'litigation'
  | 'fiscal'
export type PerformanceDirection = 'higher' | 'lower'
export type PerformanceTrend = 'improving' | 'stable' | 'deteriorating'
export type PerformanceMandate = 'commercial' | 'developmental'

export type PerformanceMetricId =
  | 'revenue_growth'
  | 'net_profit_margin'
  | 'return_on_assets'
  | 'current_ratio'
  | 'debt_to_assets'
  | 'support_dependence'
  | 'budget_variance'
  | 'workforce_retention'
  | 'employee_productivity'
  | 'workforce_cost_burden'
  | 'contract_workforce_dependence'
  | 'training_coverage'
  | 'asset_utilization'
  | 'idle_asset_share'
  | 'encroached_property_share'
  | 'asset_evidence_rate'
  | 'capacity_utilization'
  | 'production_growth'
  | 'export_intensity'
  | 'energy_efficiency'
  | 'compliance_rate'
  | 'audit_para_resolution'
  | 'procurement_compliance'
  | 'board_health'
  | 'board_attendance'
  | 'declaration_compliance'
  | 'litigation_exposure'
  | 'stale_case_rate'
  | 'litigation_evidence_rate'
  | 'equity_to_assets'
  | 'guarantee_debt_pressure'
  | 'overdue_obligation_rate'

export interface PerformanceMetricDefinition {
  id: PerformanceMetricId
  label: string
  shortLabel: string
  pillar: PerformancePillar
  unit: 'percent' | 'ratio' | 'currency_per_employee' | 'currency' | 'number'
  direction: PerformanceDirection
  target: number
  weight: number
  formula: string
  sourceModule: string
}

export interface PerformanceMetricValue {
  definition: PerformanceMetricDefinition
  value: number | null
  priorValue: number | null
  change: number | null
  peerMedian: number | null
  peerPercentile: number | null
  score: number | null
  sourceRoute: string
}

export interface PerformancePillarScore {
  id: PerformancePillar
  label: string
  score: number | null
  coverage: number
}

export interface PerformanceRiskFlag {
  id: string
  label: string
  detail: string
  severity: 'critical' | 'warning' | 'neutral'
  route: string
}

export interface PerformanceScorecard {
  organizationId: string
  enterpriseEntityId: string
  name: string
  abbreviation: string
  sector: string
  entityType: string
  mandate: PerformanceMandate
  peerGroup: string
  reportingPeriodId: string
  reportingPeriodLabel: string
  scope: PerformanceScope
  dataStatus: 'trusted' | 'provisional' | 'unavailable'
  overallScore: number | null
  coverage: number
  trend: PerformanceTrend
  pillarScores: PerformancePillarScore[]
  metrics: PerformanceMetricValue[]
  riskFlags: PerformanceRiskFlag[]
  context: {
    revenue: number
    profitOrLoss: number
    totalAssets: number
    totalDebt: number
    governmentSupport: number
    activeLitigationExposure: number
    idleAssetValue: number
    overdueLoans: number
    auditStatus: string
  }
}

export interface PerformancePortfolio {
  reportingPeriodId: string
  reportingPeriodLabel: string
  methodologyVersion: string
  methodologyStatus: 'provisional'
  scope: PerformanceScope
  dataMode: PerformanceDataMode
  scorecards: PerformanceScorecard[]
  summary: {
    enterprises: number
    strong: number
    watchlist: number
    critical: number
    improving: number
    deteriorating: number
    underperforming: number
    highSupportDependence: number
  }
  trend: Array<{
    reportingPeriodId: string
    label: string
    averageScore: number | null
    profitable: number
    lossMaking: number
  }>
  organizationTrends: Array<{
    organizationId: string
    abbreviation: string
    points: Array<{ reportingPeriodId: string; label: string; score: number | null }>
  }>
}

export interface PerformanceQuery {
  reportingPeriodId?: string
  scope?: PerformanceScope
  dataMode?: PerformanceDataMode
  sector?: string
  mandate?: PerformanceMandate | ''
  organizationIds?: string[]
}

const trustedStatuses = new Set(['approved', 'locked', 'certified'])
const annualPeriods = db.reportingPeriods.filter((period) => period.type === 'annual')

export const pillarLabels: Record<PerformancePillar, string> = {
  financial: 'Financial performance',
  workforce: 'Workforce stability',
  assets: 'Assets & property performance',
  operational: 'Operational performance',
  compliance: 'Compliance performance',
  governance: 'Governance health',
  litigation: 'Litigation & risk',
  fiscal: 'Fiscal sustainability',
}

export const PERFORMANCE_METRICS: PerformanceMetricDefinition[] = [
  { id: 'revenue_growth', label: 'Revenue growth', shortLabel: 'Revenue growth', pillar: 'financial', unit: 'percent', direction: 'higher', target: 5, weight: 4, formula: '(Current revenue - prior revenue) / prior revenue', sourceModule: 'finance' },
  { id: 'net_profit_margin', label: 'Net profit margin', shortLabel: 'Profit margin', pillar: 'financial', unit: 'percent', direction: 'higher', target: 8, weight: 5, formula: 'Profit or loss / revenue', sourceModule: 'finance' },
  { id: 'return_on_assets', label: 'Return on assets', shortLabel: 'ROA', pillar: 'financial', unit: 'percent', direction: 'higher', target: 5, weight: 4, formula: 'Profit or loss / average total assets', sourceModule: 'finance' },
  { id: 'current_ratio', label: 'Current ratio', shortLabel: 'Liquidity', pillar: 'financial', unit: 'ratio', direction: 'higher', target: 1.2, weight: 3, formula: 'Current assets / current liabilities', sourceModule: 'finance' },
  { id: 'debt_to_assets', label: 'Debt to total assets', shortLabel: 'Debt / assets', pillar: 'financial', unit: 'percent', direction: 'lower', target: 50, weight: 4, formula: 'Total debt / total assets', sourceModule: 'finance' },
  { id: 'support_dependence', label: 'Government-support dependence', shortLabel: 'Support dependence', pillar: 'financial', unit: 'percent', direction: 'lower', target: 10, weight: 3, formula: '(Subsidies + government support + grants) / revenue', sourceModule: 'loans' },
  { id: 'budget_variance', label: 'Absolute budget variance', shortLabel: 'Budget variance', pillar: 'financial', unit: 'percent', direction: 'lower', target: 5, weight: 2, formula: 'Sum of absolute budget variances / total budget', sourceModule: 'finance' },
  { id: 'workforce_retention', label: 'Workforce retention', shortLabel: 'Retention', pillar: 'workforce', unit: 'percent', direction: 'higher', target: 90, weight: 4, formula: 'Active, leave and deputation staff / workforce register', sourceModule: 'workforce' },
  { id: 'employee_productivity', label: 'Revenue per employee', shortLabel: 'Revenue / employee', pillar: 'workforce', unit: 'currency_per_employee', direction: 'higher', target: 4_000_000, weight: 3, formula: 'Revenue / active workforce', sourceModule: 'workforce' },
  { id: 'workforce_cost_burden', label: 'Workforce cost burden', shortLabel: 'Payroll burden', pillar: 'workforce', unit: 'percent', direction: 'lower', target: 35, weight: 2, formula: 'Salary and allowances / revenue', sourceModule: 'workforce' },
  { id: 'contract_workforce_dependence', label: 'Contract workforce dependence', shortLabel: 'Contract dependence', pillar: 'workforce', unit: 'percent', direction: 'lower', target: 20, weight: 2, formula: 'Daily wagers and consultants / total workforce footprint', sourceModule: 'workforce' },
  { id: 'training_coverage', label: 'Training coverage', shortLabel: 'Training', pillar: 'workforce', unit: 'percent', direction: 'higher', target: 60, weight: 1, formula: 'Employees with recorded training / workforce register', sourceModule: 'workforce' },
  { id: 'asset_utilization', label: 'Asset utilization', shortLabel: 'Asset use', pillar: 'assets', unit: 'percent', direction: 'higher', target: 75, weight: 4, formula: 'Average utilization and active asset posture', sourceModule: 'assets' },
  { id: 'idle_asset_share', label: 'Idle asset value share', shortLabel: 'Idle value', pillar: 'assets', unit: 'percent', direction: 'lower', target: 10, weight: 3, formula: 'Idle or underutilized asset value / total asset value', sourceModule: 'assets' },
  { id: 'encroached_property_share', label: 'Encroached or disputed property share', shortLabel: 'Property risk', pillar: 'assets', unit: 'percent', direction: 'lower', target: 5, weight: 3, formula: 'Encroached, disputed or litigation-linked assets / asset register', sourceModule: 'assets' },
  { id: 'asset_evidence_rate', label: 'Asset evidence completeness', shortLabel: 'Asset evidence', pillar: 'assets', unit: 'percent', direction: 'higher', target: 90, weight: 2, formula: 'Assets with complete evidence / asset register', sourceModule: 'assets' },
  { id: 'capacity_utilization', label: 'Capacity utilization', shortLabel: 'Capacity use', pillar: 'operational', unit: 'percent', direction: 'higher', target: 70, weight: 5, formula: 'Actual production / installed capacity', sourceModule: 'industrial' },
  { id: 'production_growth', label: 'Production growth', shortLabel: 'Output growth', pillar: 'operational', unit: 'percent', direction: 'higher', target: 5, weight: 4, formula: '(Current production - prior production) / prior production', sourceModule: 'industrial' },
  { id: 'export_intensity', label: 'Export intensity', shortLabel: 'Export share', pillar: 'operational', unit: 'percent', direction: 'higher', target: 20, weight: 3, formula: 'Exports / revenue', sourceModule: 'industrial' },
  { id: 'energy_efficiency', label: 'Energy used per output unit', shortLabel: 'Energy intensity', pillar: 'operational', unit: 'ratio', direction: 'lower', target: 15, weight: 3, formula: 'Energy consumption / actual production', sourceModule: 'industrial' },
  { id: 'compliance_rate', label: 'Statutory compliance rate', shortLabel: 'Compliance', pillar: 'compliance', unit: 'percent', direction: 'higher', target: 90, weight: 5, formula: 'Compliant obligations / obligations in scope', sourceModule: 'compliance' },
  { id: 'audit_para_resolution', label: 'Audit para resolution', shortLabel: 'Audit resolution', pillar: 'compliance', unit: 'percent', direction: 'higher', target: 80, weight: 4, formula: 'Settled or closed audit paras / audit paras', sourceModule: 'audit' },
  { id: 'procurement_compliance', label: 'Procurement compliance', shortLabel: 'Procurement', pillar: 'compliance', unit: 'percent', direction: 'higher', target: 85, weight: 3, formula: 'Compliant procurement records / procurement records', sourceModule: 'procurement' },
  { id: 'board_health', label: 'Board and committee health', shortLabel: 'Board health', pillar: 'governance', unit: 'percent', direction: 'higher', target: 90, weight: 4, formula: 'Vacancy posture plus active committee coverage', sourceModule: 'board' },
  { id: 'board_attendance', label: 'Board attendance', shortLabel: 'Attendance', pillar: 'governance', unit: 'percent', direction: 'higher', target: 80, weight: 3, formula: 'Average attendance of active board members', sourceModule: 'board' },
  { id: 'declaration_compliance', label: 'Director declaration compliance', shortLabel: 'Declarations', pillar: 'governance', unit: 'percent', direction: 'higher', target: 90, weight: 3, formula: 'Conflict and asset declarations completed / required declarations', sourceModule: 'board' },
  { id: 'litigation_exposure', label: 'Litigation exposure to revenue', shortLabel: 'Legal exposure', pillar: 'litigation', unit: 'percent', direction: 'lower', target: 5, weight: 3, formula: 'Current active litigation exposure / revenue', sourceModule: 'litigation' },
  { id: 'stale_case_rate', label: 'Stale active case rate', shortLabel: 'Stale cases', pillar: 'litigation', unit: 'percent', direction: 'lower', target: 10, weight: 3, formula: 'Active cases with no recent event / active cases', sourceModule: 'litigation' },
  { id: 'litigation_evidence_rate', label: 'Litigation evidence completeness', shortLabel: 'Case evidence', pillar: 'litigation', unit: 'percent', direction: 'higher', target: 90, weight: 2, formula: 'Active cases with evidence / active cases', sourceModule: 'litigation' },
  { id: 'equity_to_assets', label: 'Equity to assets', shortLabel: 'Equity strength', pillar: 'fiscal', unit: 'percent', direction: 'higher', target: 35, weight: 2, formula: 'Equity / total assets', sourceModule: 'finance' },
  { id: 'guarantee_debt_pressure', label: 'Government guarantee pressure', shortLabel: 'Guarantee pressure', pillar: 'fiscal', unit: 'percent', direction: 'lower', target: 20, weight: 2, formula: 'Active government guarantees / total debt', sourceModule: 'loans' },
  { id: 'overdue_obligation_rate', label: 'Overdue loan obligation rate', shortLabel: 'Overdue loans', pillar: 'fiscal', unit: 'percent', direction: 'lower', target: 5, weight: 2, formula: 'Overdue or default loan records / loan records', sourceModule: 'loans' },
]

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value))
}

function sum(values: Array<number | undefined>) {
  return values.reduce<number>((total, value) => total + (value ?? 0), 0)
}

function ratio(numerator: number, denominator: number, scale = 1): number | null {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator === 0) return null
  return (numerator / denominator) * scale
}

function pctChange(current: number, prior: number): number | null {
  if (!Number.isFinite(current) || !Number.isFinite(prior) || prior === 0) return null
  return ((current - prior) / Math.abs(prior)) * 100
}

function median(values: number[]) {
  if (!values.length) return null
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[middle]! : (sorted[middle - 1]! + sorted[middle]!) / 2
}

function mandateFor(organization: Organization): PerformanceMandate {
  const commercialSectors = new Set(['Manufacturing', 'Engineering', 'Retail', 'Fertilizer Marketing'])
  return commercialSectors.has(organization.sector) ? 'commercial' : 'developmental'
}

function peerGroupFor(mandate: PerformanceMandate) {
  return mandate === 'commercial' ? 'Commercial operators' : 'Development institutions'
}

function periodBefore(reportingPeriodId: string, offset = 1) {
  const index = annualPeriods.findIndex((period) => period.id === reportingPeriodId)
  return index >= offset ? annualPeriods[index - offset]?.id : undefined
}

function organizationScopes(scope: PerformanceScope) {
  if (scope === 'standalone') return db.organizations.map((organization) => ({ organization, organizationIds: [organization.id] }))
  return db.organizations
    .filter((organization) => organization.rootEnterpriseEntityId === organization.id)
    .map((organization) => {
      const organizationIds = db.organizations
        .filter((candidate) => candidate.id === organization.id || (candidate.rootEnterpriseEntityId === organization.id && candidate.consolidationTreatment === 'consolidated'))
        .map((candidate) => candidate.id)
      return { organization, organizationIds }
    })
}

function financeFor(organizationIds: string[], reportingPeriodId: string, dataMode: PerformanceDataMode) {
  const rows = db.financialMetrics.filter((row) => organizationIds.includes(row.organizationId) && row.reportingPeriodId === reportingPeriodId)
  const eligible = dataMode === 'approved' ? rows.filter((row) => trustedStatuses.has(row.status)) : rows
  if (!eligible.length) return null
  return {
    rows: eligible,
    revenue: sum(eligible.map((row) => row.revenue)),
    operatingExpenses: sum(eligible.map((row) => row.operatingExpenses)),
    profitOrLoss: sum(eligible.map((row) => row.profitOrLoss)),
    cashFlow: sum(eligible.map((row) => row.cashFlow)),
    currentAssets: sum(eligible.map((row) => row.currentAssets)),
    currentLiabilities: sum(eligible.map((row) => row.currentLiabilities)),
    totalAssets: sum(eligible.map((row) => row.totalAssets)),
    totalDebt: sum(eligible.map((row) => row.totalDebt)),
    equity: sum(eligible.map((row) => row.equity)),
    subsidies: sum(eligible.map((row) => row.subsidies)),
    governmentSupport: sum(eligible.map((row) => row.governmentSupport)),
    auditStatus: eligible.some((row) => row.auditStatus === 'qualified') ? 'qualified' : eligible.every((row) => row.auditStatus === 'audited') ? 'audited' : 'unaudited',
    trusted: eligible.every((row) => trustedStatuses.has(row.status)),
  }
}

function industrialFor(organizationIds: string[], reportingPeriodId: string) {
  const rows = db.industrialPerformance.filter((row) => organizationIds.includes(row.organizationId) && row.reportingPeriodId === reportingPeriodId)
  if (!rows.length) return null
  const installedCapacity = sum(rows.map((row) => row.installedCapacity))
  const actualProduction = sum(rows.map((row) => row.actualProduction))
  return {
    installedCapacity,
    actualProduction,
    capacityUtilization: ratio(actualProduction, installedCapacity, 100),
    employment: sum(rows.map((row) => row.employment)),
    exports: sum(rows.map((row) => row.exports)),
    energyConsumption: sum(rows.map((row) => row.energyConsumption)),
  }
}

function workforceFor(organizationIds: string[], revenue: number) {
  const employees = db.employees.filter((row) => organizationIds.includes(row.organizationId))
  const dailyWagers = db.dailyWagers.filter((row) => organizationIds.includes(row.organizationId))
  const consultants = db.consultants.filter((row) => organizationIds.includes(row.organizationId))
  const activeStatuses = new Set(['active', 'on_deputation', 'on_leave'])
  const activeEmployees = employees.filter((row) => activeStatuses.has(row.status ?? 'active'))
  const payroll = sum(employees.map((row) => (row.salaryPkr ?? 0) + (row.allowancesPkr ?? 0))) + sum(dailyWagers.map((row) => row.dailyRatePkr * 260)) + sum(consultants.map((row) => row.monthlyRemunerationPkr * 12))
  const contingent = dailyWagers.length + consultants.length
  const footprint = employees.length + contingent
  return {
    headcount: activeEmployees.length || employees.length,
    workforceRetention: employees.length ? (activeEmployees.length / employees.length) * 100 : null,
    employeeProductivity: activeEmployees.length ? revenue / activeEmployees.length : null,
    workforceCostBurden: ratio(payroll, revenue, 100),
    contractWorkforceDependence: footprint ? (contingent / footprint) * 100 : null,
    trainingCoverage: employees.length ? (employees.filter((row) => Boolean(row.trainingSummary)).length / employees.length) * 100 : null,
  }
}

function assetsFor(organizationIds: string[]) {
  const assets = db.assets.filter((row) => organizationIds.includes(row.organizationId) && !row.disposed)
  const totalValue = sum(assets.map((row) => row.marketValue ?? row.bookValue))
  const idleAssets = assets.filter((row) => ['idle', 'underutilized'].includes(row.utilizationStatus ?? ''))
  const idleValue = sum(idleAssets.map((row) => row.marketValue ?? row.bookValue))
  const riskyProperty = assets.filter((row) => ['encroached', 'partial_encroachment', 'disputed'].includes(row.encroachmentStatus ?? '') || row.litigationStatus === 'active' || Boolean(row.linkedLitigationId))
  const utilizationValues = assets.map((row) => row.utilizationPercent).filter((value): value is number => value != null)
  const activeShare = assets.length ? (assets.filter((row) => ['fully_utilized', 'leased'].includes(row.utilizationStatus ?? '')).length / assets.length) * 100 : null
  return {
    totalValue,
    idleValue,
    assetUtilization: utilizationValues.length ? sum(utilizationValues) / utilizationValues.length : activeShare,
    idleAssetShare: ratio(idleValue, totalValue, 100),
    encroachedPropertyShare: assets.length ? (riskyProperty.length / assets.length) * 100 : null,
    assetEvidenceRate: assets.length ? (assets.filter((row) => ['complete', 'verified'].includes(row.evidenceStatus ?? '')).length / assets.length) * 100 : null,
  }
}

function accountabilityFor(organizationIds: string[], revenue: number) {
  const board = db.boardMembers.filter((row) => organizationIds.includes(row.organizationId))
  const vacancies = board.filter((row) => row.isVacancySlot || ['vacant', 'awaiting_appointment'].includes(row.status)).length
  const vacancyPosture = board.length ? clamp(100 - (vacancies / board.length) * 100) : null
  const committees = db.boardCommittees.filter((row) => organizationIds.includes(row.organizationId))
  const committeeCoverage = committees.length ? (committees.filter((row) => row.status === 'active' && row.vacancyCount === 0).length / committees.length) * 100 : null
  const boardHealth = vacancyPosture == null ? null : vacancyPosture * 0.7 + (committeeCoverage ?? vacancyPosture) * 0.3
  const activeBoard = board.filter((row) => !row.isVacancySlot && !['vacant', 'awaiting_appointment'].includes(row.status))
  const boardAttendance = activeBoard.length ? sum(activeBoard.map((row) => row.attendancePct ?? 0)) / activeBoard.length : null
  const declarationRows = activeBoard.flatMap((row) => [row.assetDeclarationStatus, row.conflictDeclarationStatus]).filter(Boolean)
  const declarationCompliance = declarationRows.length ? (declarationRows.filter((status) => status === 'complete' || status === 'not_required').length / declarationRows.length) * 100 : null

  const compliance = db.compliance.filter((row) => organizationIds.includes(row.organizationId))
  const compliant = compliance.filter((row) => ['compliant', 'submitted', 'complete'].includes(row.status)).length
  const complianceRate = compliance.length ? (compliant / compliance.length) * 100 : null

  const auditParas = db.auditParas.filter((row) => organizationIds.includes(row.organizationId))
  const resolvedAudit = auditParas.filter((row) => ['settled', 'closed', 'resolved'].includes(row.status.toLowerCase())).length
  const auditAmount = sum(auditParas.filter((row) => !['settled', 'closed', 'resolved'].includes(row.status.toLowerCase())).map((row) => row.amountInvolved))
  const procurement = db.procurement.filter((row) => organizationIds.includes(row.organizationId))
  const procurementCompliance = procurement.length ? (procurement.filter((row) => row.ppraCompliance === 'compliant').length / procurement.length) * 100 : null
  return {
    boardHealth,
    boardAttendance,
    declarationCompliance,
    complianceRate,
    auditParaResolution: auditParas.length ? (resolvedAudit / auditParas.length) * 100 : null,
    auditAmount,
    auditExposure: ratio(auditAmount, revenue, 100),
    procurementCompliance,
  }
}

function litigationFor(organizationIds: string[], revenue: number) {
  const active = db.litigation.filter((row) => organizationIds.includes(row.organizationId) && !['closed', 'settled', 'disposed'].includes(row.status.toLowerCase()))
  const exposure = sum(active.map((row) => row.currentExposurePkr ?? row.amountInvolved))
  const stale = active.filter((row) => !row.latestEventAt && !row.lastChangedAt && !row.lastVerifiedAt).length
  return {
    activeCases: active.length,
    exposure,
    litigationExposure: ratio(exposure, revenue, 100),
    staleCaseRate: active.length ? (stale / active.length) * 100 : 0,
    litigationEvidenceRate: active.length ? (active.filter((row) => row.evidenceAvailable).length / active.length) * 100 : 100,
  }
}

function fiscalFor(organizationIds: string[], finance: NonNullable<ReturnType<typeof financeFor>>) {
  const loans = db.loans.filter((row) => organizationIds.includes(row.organizationId))
  const guarantees = db.guarantees.filter((row) => organizationIds.includes(row.organizationId) && row.status === 'active')
  const overdueLoans = loans.filter((row) => row.repaymentStatus === 'overdue' || row.defaultStatus.toLowerCase().includes('default')).length
  return {
    equityToAssets: ratio(finance.equity, finance.totalAssets, 100),
    guaranteeDebtPressure: ratio(sum(guarantees.map((row) => row.exposure)), finance.totalDebt, 100),
    overdueObligationRate: loans.length ? (overdueLoans / loans.length) * 100 : 0,
    overdueLoans,
  }
}

function budgetVarianceFor(organizationIds: string[], reportingPeriodId: string) {
  const lines = db.budgetLines.filter((row) => organizationIds.includes(row.organizationId) && row.reportingPeriodId === reportingPeriodId)
  const budget = sum(lines.map((row) => row.budget))
  if (!lines.length || budget === 0) return null
  return (sum(lines.map((row) => Math.abs(row.actual - row.budget))) / budget) * 100
}

function rawMetricValues(organizationIds: string[], reportingPeriodId: string, dataMode: PerformanceDataMode) {
  const priorPeriodId = periodBefore(reportingPeriodId)
  const finance = financeFor(organizationIds, reportingPeriodId, dataMode)
  const priorFinance = priorPeriodId ? financeFor(organizationIds, priorPeriodId, dataMode) : null
  const industrial = industrialFor(organizationIds, reportingPeriodId)
  const priorIndustrial = priorPeriodId ? industrialFor(organizationIds, priorPeriodId) : null
  if (!finance) return { values: new Map<PerformanceMetricId, number | null>(), finance, industrial }

  const averageAssets = priorFinance ? (finance.totalAssets + priorFinance.totalAssets) / 2 : finance.totalAssets
  const grants = sum(db.grants.filter((row) => organizationIds.includes(row.organizationId)).map((row) => row.amount))
  const workforce = workforceFor(organizationIds, finance.revenue)
  const assets = assetsFor(organizationIds)
  const accountability = accountabilityFor(organizationIds, finance.revenue)
  const litigation = litigationFor(organizationIds, finance.revenue)
  const fiscal = fiscalFor(organizationIds, finance)
  const values = new Map<PerformanceMetricId, number | null>([
    ['revenue_growth', priorFinance ? pctChange(finance.revenue, priorFinance.revenue) : null],
    ['net_profit_margin', ratio(finance.profitOrLoss, finance.revenue, 100)],
    ['return_on_assets', ratio(finance.profitOrLoss, averageAssets, 100)],
    ['current_ratio', ratio(finance.currentAssets, finance.currentLiabilities)],
    ['debt_to_assets', ratio(finance.totalDebt, finance.totalAssets, 100)],
    ['support_dependence', ratio(finance.subsidies + finance.governmentSupport + grants, finance.revenue, 100)],
    ['budget_variance', budgetVarianceFor(organizationIds, reportingPeriodId)],
    ['workforce_retention', workforce.workforceRetention],
    ['employee_productivity', workforce.employeeProductivity],
    ['workforce_cost_burden', workforce.workforceCostBurden],
    ['contract_workforce_dependence', workforce.contractWorkforceDependence],
    ['training_coverage', workforce.trainingCoverage],
    ['asset_utilization', assets.assetUtilization],
    ['idle_asset_share', assets.idleAssetShare],
    ['encroached_property_share', assets.encroachedPropertyShare],
    ['asset_evidence_rate', assets.assetEvidenceRate],
    ['capacity_utilization', industrial?.capacityUtilization ?? null],
    ['production_growth', industrial && priorIndustrial ? pctChange(industrial.actualProduction, priorIndustrial.actualProduction) : null],
    ['export_intensity', industrial ? ratio(industrial.exports, finance.revenue, 100) : null],
    ['energy_efficiency', industrial ? ratio(industrial.energyConsumption, industrial.actualProduction) : null],
    ['compliance_rate', accountability.complianceRate],
    ['audit_para_resolution', accountability.auditParaResolution],
    ['procurement_compliance', accountability.procurementCompliance],
    ['board_health', accountability.boardHealth],
    ['board_attendance', accountability.boardAttendance],
    ['declaration_compliance', accountability.declarationCompliance],
    ['litigation_exposure', litigation.litigationExposure],
    ['stale_case_rate', litigation.staleCaseRate],
    ['litigation_evidence_rate', litigation.litigationEvidenceRate],
    ['equity_to_assets', fiscal.equityToAssets],
    ['guarantee_debt_pressure', fiscal.guaranteeDebtPressure],
    ['overdue_obligation_rate', fiscal.overdueObligationRate],
  ])
  return { values, finance, industrial }
}

function targetScore(definition: PerformanceMetricDefinition, value: number) {
  if (definition.direction === 'higher') return definition.target === 0 ? (value >= 0 ? 100 : 0) : clamp((value / definition.target) * 100)
  if (value <= definition.target) return 100
  if (value === 0) return 100
  return clamp((definition.target / value) * 100)
}

function trendComponent(definition: PerformanceMetricDefinition, value: number, priorValue: number | null): number | null {
  if (priorValue == null) return null
  const delta = value - priorValue
  if (Math.abs(delta) < 0.01) return 50
  const improving = definition.direction === 'higher' ? delta > 0 : delta < 0
  return improving ? 100 : 0
}

function sourceRoute(definition: PerformanceMetricDefinition, organizationId: string) {
  return `/moip-review/modules/${definition.sourceModule}?organizationId=${organizationId}`
}

interface ScorecardDraft {
  organization: Organization
  organizationIds: string[]
  mandate: PerformanceMandate
  peerGroup: string
  current: ReturnType<typeof rawMetricValues>
  prior: ReturnType<typeof rawMetricValues>
}

function buildDrafts(reportingPeriodId: string, scope: PerformanceScope, dataMode: PerformanceDataMode) {
  const priorPeriodId = periodBefore(reportingPeriodId)
  return organizationScopes(scope).map(({ organization, organizationIds }): ScorecardDraft => {
    const mandate = mandateFor(organization)
    return {
      organization,
      organizationIds,
      mandate,
      peerGroup: peerGroupFor(mandate),
      current: rawMetricValues(organizationIds, reportingPeriodId, dataMode),
      prior: rawMetricValues(organizationIds, priorPeriodId ?? reportingPeriodId, dataMode),
    }
  })
}

function percentile(value: number, peerValues: number[], direction: PerformanceDirection) {
  if (peerValues.length < 3) return null
  const favorable = direction === 'higher' ? peerValues.filter((candidate) => candidate <= value).length : peerValues.filter((candidate) => candidate >= value).length
  return clamp((favorable / peerValues.length) * 100)
}

function riskFlags(draft: ScorecardDraft): PerformanceRiskFlag[] {
  const finance = draft.current.finance
  if (!finance) return []
  const flags: PerformanceRiskFlag[] = []
  const organizationId = draft.organization.id
  const loans = db.loans.filter((row) => draft.organizationIds.includes(row.organizationId))
  const overdueLoans = loans.filter((row) => row.repaymentStatus === 'overdue' || row.defaultStatus.toLowerCase().includes('default')).length
  const litigation = litigationFor(draft.organizationIds, finance.revenue)
  const assets = assetsFor(draft.organizationIds)
  const supportDependence = draft.current.values.get('support_dependence')
  const workforceRetention = draft.current.values.get('workforce_retention')
  const complianceRate = draft.current.values.get('compliance_rate')
  const boardHealth = draft.current.values.get('board_health')

  if (finance.profitOrLoss < 0) flags.push({ id: 'loss', label: 'Loss position', detail: 'Current approved result is negative.', severity: 'critical', route: `/moip-review/modules/finance?organizationId=${organizationId}` })
  if ((supportDependence ?? 0) > 20) flags.push({ id: 'support', label: 'High support dependence', detail: `${supportDependence!.toFixed(1)}% of revenue is linked to government support.`, severity: 'warning', route: `/moip-review/modules/loans?organizationId=${organizationId}` })
  if ((workforceRetention ?? 100) < 75) flags.push({ id: 'workforce', label: 'Workforce instability', detail: 'Retention is below the recommended performance band.', severity: 'warning', route: `/moip-review/modules/workforce?organizationId=${organizationId}` })
  if ((complianceRate ?? 100) < 70) flags.push({ id: 'compliance', label: 'Weak compliance posture', detail: 'Statutory and recurring obligations show material gaps.', severity: 'warning', route: `/moip-review/modules/compliance?organizationId=${organizationId}` })
  if ((boardHealth ?? 100) < 70) flags.push({ id: 'governance', label: 'Governance gaps', detail: 'Board vacancy or committee posture requires review.', severity: 'warning', route: `/moip-review/modules/board?organizationId=${organizationId}` })
  if (overdueLoans) flags.push({ id: 'loans', label: 'Overdue obligations', detail: `${overdueLoans} loan obligation${overdueLoans === 1 ? '' : 's'} require attention.`, severity: 'critical', route: `/moip-review/modules/loans?organizationId=${organizationId}` })
  if (litigation.exposure > 0) flags.push({ id: 'litigation', label: 'Legal exposure', detail: `Active litigation exposure is recorded across ${litigation.activeCases} case${litigation.activeCases === 1 ? '' : 's'}.`, severity: 'warning', route: `/moip-review/modules/litigation?organizationId=${organizationId}` })
  if (assets.idleValue > 0) flags.push({ id: 'idle-assets', label: 'Idle asset value', detail: 'Idle or underutilized assets are reducing asset productivity.', severity: 'neutral', route: `/moip-review/modules/assets?organizationId=${organizationId}` })
  if (finance.auditStatus !== 'audited') flags.push({ id: 'audit-status', label: `${finance.auditStatus} financials`, detail: 'Interpret comparative results with the stated assurance status.', severity: finance.auditStatus === 'qualified' ? 'warning' : 'neutral', route: `/moip-review/modules/finance?organizationId=${organizationId}` })
  return flags.slice(0, 6)
}

function buildScorecards(reportingPeriodId: string, scope: PerformanceScope, dataMode: PerformanceDataMode) {
  const period = db.reportingPeriods.find((row) => row.id === reportingPeriodId)
  const drafts = buildDrafts(reportingPeriodId, scope, dataMode)
  return drafts.map((draft): PerformanceScorecard => {
    const metricValues = PERFORMANCE_METRICS.map((definition): PerformanceMetricValue => {
      const value = draft.current.values.get(definition.id) ?? null
      const priorValue = draft.prior.values.get(definition.id) ?? null
      const peerValues = drafts
        .filter((candidate) => candidate.peerGroup === draft.peerGroup)
        .map((candidate) => candidate.current.values.get(definition.id))
        .filter((candidate): candidate is number => candidate != null && Number.isFinite(candidate))
      const peerPercentile = value == null ? null : percentile(value, peerValues, definition.direction)
      const trend = value == null ? null : trendComponent(definition, value, priorValue)
      const components = value == null ? [] : [
        { value: targetScore(definition, value), weight: 50 },
        ...(peerPercentile == null ? [] : [{ value: peerPercentile, weight: 30 }]),
        ...(trend == null ? [] : [{ value: trend, weight: 20 }]),
      ]
      const componentWeight = sum(components.map((component) => component.weight))
      return {
        definition,
        value,
        priorValue,
        change: value != null && priorValue != null ? value - priorValue : null,
        peerMedian: median(peerValues),
        peerPercentile,
        score: componentWeight ? sum(components.map((component) => component.value * component.weight)) / componentWeight : null,
        sourceRoute: sourceRoute(definition, draft.organization.id),
      }
    })

    const availableWeight = sum(metricValues.filter((metric) => metric.value != null).map((metric) => metric.definition.weight))
    const scoredWeight = sum(metricValues.filter((metric) => metric.score != null).map((metric) => metric.definition.weight))
    const weightedScore = scoredWeight ? sum(metricValues.filter((metric) => metric.score != null).map((metric) => metric.score! * metric.definition.weight)) / scoredWeight : null
    const totalWeight = sum(PERFORMANCE_METRICS.map((metric) => metric.weight))
    const coverage = Math.round((availableWeight / totalWeight) * 100)
    const overallScore = coverage >= 65 && weightedScore != null ? Math.round(weightedScore) : null
    const pillarScores = (Object.keys(pillarLabels) as PerformancePillar[]).map((pillar): PerformancePillarScore => {
      const metrics = metricValues.filter((metric) => metric.definition.pillar === pillar)
      const available = sum(metrics.filter((metric) => metric.value != null).map((metric) => metric.definition.weight))
      const total = sum(metrics.map((metric) => metric.definition.weight))
      const scoreWeight = sum(metrics.filter((metric) => metric.score != null).map((metric) => metric.definition.weight))
      return {
        id: pillar,
        label: pillarLabels[pillar],
        score: scoreWeight ? Math.round(sum(metrics.filter((metric) => metric.score != null).map((metric) => metric.score! * metric.definition.weight)) / scoreWeight) : null,
        coverage: total ? Math.round((available / total) * 100) : 0,
      }
    })
    const directionalTrend = metricValues
      .filter((metric) => metric.value != null && metric.priorValue != null)
      .map((metric) => trendComponent(metric.definition, metric.value!, metric.priorValue))
      .filter((value): value is number => value != null)
    const averageTrend = directionalTrend.length ? sum(directionalTrend) / directionalTrend.length : 50
    const trend: PerformanceTrend = averageTrend > 56 ? 'improving' : averageTrend < 44 ? 'deteriorating' : 'stable'
    const finance = draft.current.finance
    const organizationId = draft.organization.id
    const litigation = litigationFor(draft.organizationIds, finance?.revenue ?? 0)
    const assets = assetsFor(draft.organizationIds)
    const overdueLoans = db.loans.filter((row) => draft.organizationIds.includes(row.organizationId) && (row.repaymentStatus === 'overdue' || row.defaultStatus.toLowerCase().includes('default'))).length
    return {
      organizationId,
      enterpriseEntityId: draft.organization.enterpriseEntityId,
      name: scope === 'consolidated' && draft.organizationIds.length > 1 ? `${draft.organization.name} Group` : draft.organization.name,
      abbreviation: scope === 'consolidated' && draft.organizationIds.length > 1 ? `${draft.organization.abbreviation} Group` : draft.organization.abbreviation,
      sector: draft.organization.sector,
      entityType: draft.organization.entityType,
      mandate: draft.mandate,
      peerGroup: draft.peerGroup,
      reportingPeriodId,
      reportingPeriodLabel: period?.label ?? reportingPeriodId,
      scope,
      dataStatus: !finance ? 'unavailable' : finance.trusted ? 'trusted' : 'provisional',
      overallScore,
      coverage,
      trend,
      pillarScores,
      metrics: metricValues,
      riskFlags: riskFlags(draft),
      context: {
        revenue: finance?.revenue ?? 0,
        profitOrLoss: finance?.profitOrLoss ?? 0,
        totalAssets: finance?.totalAssets ?? 0,
        totalDebt: finance?.totalDebt ?? 0,
        governmentSupport: finance ? finance.subsidies + finance.governmentSupport : 0,
        activeLitigationExposure: litigation.exposure,
        idleAssetValue: assets.idleValue,
        overdueLoans,
        auditStatus: finance?.auditStatus ?? 'unavailable',
      },
    }
  })
}

function latestTrustedPeriodId() {
  return [...annualPeriods].reverse().find((period) => period.status !== 'open')?.id ?? annualPeriods.at(-1)?.id ?? ''
}

function portfolioFor(query: PerformanceQuery = {}): PerformancePortfolio {
  const reportingPeriodId = query.reportingPeriodId ?? latestTrustedPeriodId()
  const scope = query.scope ?? 'standalone'
  const dataMode = query.dataMode ?? 'approved'
  const period = db.reportingPeriods.find((row) => row.id === reportingPeriodId)
  const matchesQuery = (row: PerformanceScorecard) =>
    (!query.sector || row.sector === query.sector) &&
    (!query.mandate || row.mandate === query.mandate) &&
    (!query.organizationIds?.length || query.organizationIds.includes(row.organizationId))
  const scorecards = buildScorecards(reportingPeriodId, scope, dataMode).filter(matchesQuery)
  const supportMetric = (row: PerformanceScorecard) => row.metrics.find((metric) => metric.definition.id === 'support_dependence')?.value ?? 0
  const historyCards = annualPeriods.map((trendPeriod) => ({
    period: trendPeriod,
    cards: buildScorecards(trendPeriod.id, scope, dataMode).filter(matchesQuery),
  }))
  return {
    reportingPeriodId,
    reportingPeriodLabel: period?.label ?? reportingPeriodId,
    methodologyVersion: 'MOIP-SOE-PI v0.2',
    methodologyStatus: 'provisional',
    scope,
    dataMode,
    scorecards,
    summary: {
      enterprises: scorecards.length,
      strong: scorecards.filter((row) => (row.overallScore ?? 0) >= 80).length,
      watchlist: scorecards.filter((row) => row.overallScore != null && row.overallScore >= 45 && row.overallScore < 65).length,
      critical: scorecards.filter((row) => row.overallScore != null && row.overallScore < 45).length,
      improving: scorecards.filter((row) => row.trend === 'improving').length,
      deteriorating: scorecards.filter((row) => row.trend === 'deteriorating').length,
      underperforming: scorecards.filter((row) => row.overallScore != null && row.overallScore < 50).length,
      highSupportDependence: scorecards.filter((row) => supportMetric(row) > 20).length,
    },
    trend: historyCards.map(({ period: trendPeriod, cards: allCards }) => {
      const cards = allCards.filter((row) => row.overallScore != null)
      return {
        reportingPeriodId: trendPeriod.id,
        label: trendPeriod.label,
        averageScore: cards.length ? Math.round(sum(cards.map((row) => row.overallScore!)) / cards.length) : null,
        profitable: cards.filter((row) => row.context.profitOrLoss >= 0).length,
        lossMaking: cards.filter((row) => row.context.profitOrLoss < 0).length,
      }
    }),
    organizationTrends: scorecards.map((scorecard) => ({
      organizationId: scorecard.organizationId,
      abbreviation: scorecard.abbreviation,
      points: historyCards.map(({ period: trendPeriod, cards }) => ({
        reportingPeriodId: trendPeriod.id,
        label: trendPeriod.label,
        score: cards.find((row) => row.organizationId === scorecard.organizationId)?.overallScore ?? null,
      })),
    })),
  }
}

export interface PerformanceComparisonService {
  getPortfolio(query?: PerformanceQuery): Promise<PerformancePortfolio>
  getScorecard(organizationId: string, query?: Omit<PerformanceQuery, 'organizationIds'>): Promise<PerformanceScorecard | null>
  getMetricDefinitions(): Promise<PerformanceMetricDefinition[]>
}

export const mockPerformanceComparisonService: PerformanceComparisonService = {
  async getPortfolio(query) {
    return simulateLatency(portfolioFor(query))
  },
  async getScorecard(organizationId, query) {
    const result = portfolioFor({ ...query, organizationIds: [organizationId] })
    return simulateLatency(result.scorecards[0] ?? null)
  },
  async getMetricDefinitions() {
    return simulateLatency(PERFORMANCE_METRICS)
  },
}
