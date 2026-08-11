import {
  DEMO_AS_OF_DATE,
  PROCUREMENT_HIGH_VALUE_THRESHOLD_PKR,
  type SoeStatus,
} from '@/constants'
import { db } from '@/mock-data'
import { mockGisService } from '@/mock-services/gis.service'
import {
  mockMinisterPortalService,
  type MinisterFilter,
} from '@/mock-services/ministerPortal.service'
import { mockPmoPortalService } from '@/mock-services/pmoPortal.service'
import { mockSecretaryPortalService } from '@/mock-services/secretaryPortal.service'
import type { GisAssetItem } from '@/mock-services/gis.service'
import { simulateLatency } from '@/utils'

export interface ExecutiveDashboardFilter {
  reportingPeriodId?: string
  sector?: string
  province?: string
  status?: SoeStatus | ''
}

export interface ExecutiveFilterOptions {
  periods: Array<{ id: string; label: string }>
  sectors: string[]
  provinces: string[]
  statuses: SoeStatus[]
}

export type ExecutiveTone = 'neutral' | 'positive' | 'warning' | 'critical'

export interface ExecutiveMetric {
  id: string
  label: string
  value: number
  format: 'number' | 'currency' | 'percent'
  detail: string
  tone: ExecutiveTone
  route: string
}

export interface ExecutiveRankedItem {
  id: string
  label: string
  value: number
  secondary?: string
  tone?: ExecutiveTone
  route: string
}

export interface ExecutiveRiskRow {
  id: string
  label: string
  financial: ExecutiveTone
  governance: ExecutiveTone
  compliance: ExecutiveTone
  operations: ExecutiveTone
  auditLegal: ExecutiveTone
  issueCount: number
  route: string
}

export interface MinisterDashboardData {
  asOf: string
  reportingPeriodId: string
  options: ExecutiveFilterOptions
  metrics: ExecutiveMetric[]
  statusDistribution: Array<{ name: string; value: number }>
  healthDistribution: Array<{ name: string; value: number; tone: ExecutiveTone }>
  profitLossTrend: Array<{ label: string; profitLoss: number; debt: number; subsidies: number }>
  profitable: ExecutiveRankedItem[]
  lossMaking: ExecutiveRankedItem[]
  fiscalExposure: ExecutiveRankedItem[]
  fiscal: Awaited<ReturnType<typeof mockMinisterPortalService.getFiscalExposure>>
  assets: Awaited<ReturnType<typeof mockMinisterPortalService.getAssetIntelligence>>
  market: Awaited<ReturnType<typeof mockPmoPortalService.getMarketVsBook>>
  land: Awaited<ReturnType<typeof mockPmoPortalService.getLandBank>>
  gisAssets: GisAssetItem[]
  governance: Awaited<ReturnType<typeof mockMinisterPortalService.getGovernanceRisk>>
  auditLegal: Awaited<ReturnType<typeof mockMinisterPortalService.getAuditLegalRisk>>
  industrial: Awaited<ReturnType<typeof mockMinisterPortalService.getIndustrialSummary>>
  industrialBySector: Awaited<ReturnType<typeof mockPmoPortalService.getEmploymentIndustrial>>['bySector']
  privatization: Awaited<ReturnType<typeof mockMinisterPortalService.getPrivatizationSummary>>
  risks: Awaited<ReturnType<typeof mockMinisterPortalService.getExecutiveOverview>>['majorRisks']
  decisions: Awaited<ReturnType<typeof mockMinisterPortalService.getExecutiveOverview>>['attention']
  opportunities: Awaited<ReturnType<typeof mockMinisterPortalService.getStrategicOpportunities>>['items']
  riskMatrix: ExecutiveRiskRow[]
  confidence: number
}

export interface SecretaryQueueItem {
  id: string
  organizationLabel: string
  issue: string
  category: string
  owner: string
  ageDays: number
  dueDate?: string
  tone: ExecutiveTone
  route: string
}

export interface SecretaryDashboardData {
  asOf: string
  reportingPeriodId: string
  options: ExecutiveFilterOptions
  metrics: ExecutiveMetric[]
  submissions: Array<{ name: string; value: number; tone: ExecutiveTone }>
  submissionCoverage: number
  obligationBuckets: Array<{ name: string; value: number; tone: ExecutiveTone }>
  obligations: SecretaryQueueItem[]
  exceptionMatrix: ExecutiveRiskRow[]
  financialConcerns: SecretaryQueueItem[]
  loanRepayments: Array<{
    id: string
    organizationLabel: string
    lender: string
    dueDate: string
    amountDue: number
    status: string
    tone: ExecutiveTone
  }>
  procurement: {
    aboveThreshold: number
    aboveThresholdValue: number
    singleSource: number
    overdue: number
    missingEvidence: number
    vendorConcentration: number
    byMethod: Array<{ name: string; value: number }>
  }
  workforce: {
    criticalVacancies: number
    totalVacancies: number
    activeConsultants: number
    consultantsExpiring90: number
    vacantPosts: ExecutiveRankedItem[]
  }
  governance: {
    boardVacancies: number
    expiredAppointments: number
    expiringAppointments: number
    pendingBoardDecisions: number
  }
  auditLegal: {
    openParas: number
    auditExposure: number
    recoveryOutstanding: number
    overduePac: number
    litigationExposure: number
    upcomingHearings: number
  }
  queue: SecretaryQueueItem[]
  confidence: number
}

function organizationProvince(organizationId: string) {
  return (
    db.locations.find((item) => item.organizationId === organizationId && item.kind === 'head_office')
      ?.province ?? db.locations.find((item) => item.organizationId === organizationId)?.province ?? ''
  )
}

function organizationsFor(filter?: ExecutiveDashboardFilter) {
  return db.organizations.filter((organization) => {
    if (filter?.sector && organization.sector !== filter.sector) return false
    if (filter?.status && organization.status !== filter.status) return false
    if (filter?.province && organizationProvince(organization.id) !== filter.province) return false
    return true
  })
}

function filterOptions(): ExecutiveFilterOptions {
  return {
    periods: db.reportingPeriods
      .filter((period) => period.type === 'annual')
      .sort((a, b) => a.startDate.localeCompare(b.startDate))
      .map((period) => ({ id: period.id, label: period.label })),
    sectors: [...new Set(db.organizations.map((organization) => organization.sector))].sort(),
    provinces: [...new Set(db.locations.map((location) => location.province).filter(Boolean))].sort(),
    statuses: [...new Set(db.organizations.map((organization) => organization.status))] as SoeStatus[],
  }
}

function organizationLabel(organizationId: string) {
  return db.organizations.find((organization) => organization.id === organizationId)?.abbreviation ?? organizationId
}

function daysFromAsOf(date: string) {
  return Math.round((Date.parse(date) - Date.parse(DEMO_AS_OF_DATE)) / 86_400_000)
}

function issueTone(count: number, warningAt = 1, criticalAt = 3): ExecutiveTone {
  if (count >= criticalAt) return 'critical'
  if (count >= warningAt) return 'warning'
  return 'positive'
}

function confidenceScore(orgIds: Set<string>, reportingPeriodId: string) {
  if (!orgIds.size) return 100
  const submissions = db.submissions.filter(
    (submission) => orgIds.has(submission.organizationId) && submission.reportingPeriodId === reportingPeriodId,
  )
  const accepted = submissions.filter((submission) =>
    ['approved', 'locked', 'submitted', 'under_review'].includes(submission.status),
  ).length
  const submissionScore = submissions.length ? (accepted / submissions.length) * 100 : 0
  const evidenceRows = [
    ...db.procurement.filter((item) => orgIds.has(item.organizationId)),
    ...db.compliance.filter((item) => orgIds.has(item.organizationId)),
    ...db.auditParas.filter((item) => orgIds.has(item.organizationId)),
  ]
  const evidenceScore = evidenceRows.length
    ? (evidenceRows.filter((item) => item.evidenceAvailable).length / evidenceRows.length) * 100
    : 100
  const assets = db.assets.filter((asset) => orgIds.has(asset.organizationId))
  const valuationScore = assets.length
    ? (assets.filter((asset) => asset.bookValue != null && asset.marketValue != null).length / assets.length) * 100
    : 100
  return Math.round((submissionScore + evidenceScore + valuationScore) / 3)
}

export const mockExecutiveDashboardService = {
  async getMinisterDashboard(filter?: ExecutiveDashboardFilter): Promise<MinisterDashboardData> {
    const ministerFilter: MinisterFilter = { ...filter }
    const pmoFilter = {
      reportingPeriodId: filter?.reportingPeriodId,
      sector: filter?.sector,
      province: filter?.province,
    }
    const orgs = organizationsFor(filter)
    const orgIds = new Set(orgs.map((organization) => organization.id))
    const reportingPeriodId = filter?.reportingPeriodId ?? 'period-fy2027'
    const [overview, healthPage, fiscal, assets, market, land, governance, auditLegal, industrial, industrialView, privatization, opportunityPage, gisPage] =
      await Promise.all([
        mockMinisterPortalService.getExecutiveOverview(ministerFilter),
        mockMinisterPortalService.getPortfolioHealth({ ...ministerFilter, pageSize: 500 }),
        mockMinisterPortalService.getFiscalExposure(ministerFilter),
        mockMinisterPortalService.getAssetIntelligence(ministerFilter),
        mockPmoPortalService.getMarketVsBook(pmoFilter),
        mockPmoPortalService.getLandBank(pmoFilter),
        mockMinisterPortalService.getGovernanceRisk(ministerFilter),
        mockMinisterPortalService.getAuditLegalRisk(ministerFilter),
        mockMinisterPortalService.getIndustrialSummary(ministerFilter),
        mockPmoPortalService.getEmploymentIndustrial(pmoFilter),
        mockMinisterPortalService.getPrivatizationSummary(ministerFilter),
        mockMinisterPortalService.getStrategicOpportunities({ ...ministerFilter, pageSize: 20 }),
        mockGisService.queryAssets({ portfolioScope: true, province: filter?.province, pageSize: 500 }),
      ])

    const health = healthPage.items
    const financials = db.financialMetrics.filter(
      (financial) => orgIds.has(financial.organizationId) && financial.reportingPeriodId === reportingPeriodId,
    )
    const revenue = financials.reduce((sum, row) => sum + row.revenue, 0)
    const profitLoss = financials.reduce((sum, row) => sum + row.profitOrLoss, 0)
    const support = overview.summary.aggregateSubsidies + overview.summary.aggregateGrants
    const totalSoe = Object.values(overview.summary.soeCountByStatus).reduce((sum, value) => sum + value, 0)

    const metrics: ExecutiveMetric[] = [
      { id: 'soes', label: 'SOEs in scope', value: totalSoe, format: 'number', detail: `${overview.summary.lossMakingCount} loss-making`, tone: overview.summary.lossMakingCount ? 'warning' : 'positive', route: '/minister/portfolio' },
      { id: 'investment', label: 'Government investment', value: overview.summary.aggregateGovernmentInvestment, format: 'currency', detail: 'Capital committed', tone: 'neutral', route: '/minister/fiscal' },
      { id: 'assets', label: 'Asset value', value: market.aggregateMarketValue || overview.summary.aggregateAssetBookValue, format: 'currency', detail: `${market.assetsWithoutValuation} awaiting valuation`, tone: market.assetsWithoutValuation ? 'warning' : 'positive', route: '/minister/assets' },
      { id: 'revenue', label: 'Revenue', value: revenue, format: 'currency', detail: `${overview.summary.profitableCount} profitable SOEs`, tone: 'positive', route: '/minister/portfolio' },
      { id: 'profit-loss', label: 'Net profit / loss', value: profitLoss, format: 'currency', detail: profitLoss < 0 ? 'Portfolio loss' : 'Portfolio surplus', tone: profitLoss < 0 ? 'critical' : 'positive', route: '/minister/portfolio' },
      { id: 'debt', label: 'Debt + guarantees', value: overview.summary.aggregateDebt + overview.summary.aggregateGuarantees, format: 'currency', detail: 'Direct and contingent exposure', tone: 'warning', route: '/minister/fiscal' },
      { id: 'support', label: 'Subsidies + grants', value: support, format: 'currency', detail: revenue ? `${((support / revenue) * 100).toFixed(1)}% of revenue` : 'No revenue baseline', tone: support > 0 ? 'warning' : 'positive', route: '/minister/fiscal' },
      { id: 'capacity', label: 'Capacity utilization', value: industrial.capacityUtilization ?? 0, format: 'percent', detail: `${industrial.underutilizedOrgCount} underutilized SOEs`, tone: (industrial.capacityUtilization ?? 0) < 50 ? 'critical' : (industrial.capacityUtilization ?? 0) < 70 ? 'warning' : 'positive', route: '/minister/industrial' },
    ]

    const profitable = health
      .filter((row) => (row.profitOrLoss ?? 0) > 0)
      .sort((a, b) => (b.profitOrLoss ?? 0) - (a.profitOrLoss ?? 0))
      .slice(0, 5)
      .map((row) => ({ id: row.organizationId, label: row.abbreviation, value: row.profitOrLoss ?? 0, secondary: row.sector, tone: 'positive' as const, route: `/minister/portfolio?soe=${row.organizationId}` }))
    const lossMaking = health
      .filter((row) => (row.profitOrLoss ?? 0) < 0)
      .sort((a, b) => (a.profitOrLoss ?? 0) - (b.profitOrLoss ?? 0))
      .slice(0, 5)
      .map((row) => ({ id: row.organizationId, label: row.abbreviation, value: Math.abs(row.profitOrLoss ?? 0), secondary: row.sector, tone: 'critical' as const, route: `/minister/portfolio?soe=${row.organizationId}` }))

    const riskMatrix: ExecutiveRiskRow[] = health.slice(0, 10).map((row) => {
      const complianceCount = db.compliance.filter((item) => orgIds.has(item.organizationId) && item.organizationId === row.organizationId && item.status === 'overdue').length
      const auditCount = db.auditParas.filter((item) => item.organizationId === row.organizationId && !['closed', 'settled'].includes(item.status)).length
      const litigationCount = db.litigation.filter((item) => item.organizationId === row.organizationId && item.status !== 'closed').length
      const operationsConcern = row.capacityUtilization != null && row.capacityUtilization < 50
      return {
        id: row.organizationId,
        label: row.abbreviation,
        financial: row.financialPosition === 'persistent_loss' ? 'critical' : row.financialPosition === 'loss' ? 'warning' : row.financialPosition === 'profitable' ? 'positive' : 'neutral',
        governance: row.governanceCondition === 'critical' ? 'critical' : row.governanceCondition === 'attention' ? 'warning' : 'positive',
        compliance: issueTone(complianceCount, 1, 2),
        operations: operationsConcern ? 'critical' : row.capacityUtilization == null ? 'neutral' : row.capacityUtilization < 70 ? 'warning' : 'positive',
        auditLegal: issueTone(auditCount + litigationCount, 1, 3),
        issueCount: row.warningCount + complianceCount + auditCount + litigationCount,
        route: `/minister/portfolio?soe=${row.organizationId}`,
      }
    })

    return simulateLatency({
      asOf: overview.summary.asOf,
      reportingPeriodId,
      options: filterOptions(),
      metrics,
      statusDistribution: Object.entries(overview.summary.soeCountByStatus).map(([name, value]) => ({ name, value })),
      healthDistribution: [
        { name: 'Healthy', value: health.filter((row) => row.healthBand === 'healthy').length, tone: 'positive' },
        { name: 'Watch', value: health.filter((row) => row.healthBand === 'watch').length, tone: 'warning' },
        { name: 'Concern', value: health.filter((row) => row.healthBand === 'concern').length, tone: 'critical' },
      ],
      profitLossTrend: fiscal.trend.map((row) => ({ label: row.label, profitLoss: row.pl, debt: row.debt, subsidies: row.subsidies })),
      profitable,
      lossMaking,
      fiscalExposure: fiscal.bySoe.slice(0, 6).map((row) => ({ id: row.organizationId, label: row.abbreviation, value: row.debt + row.guarantees + row.subsidies, secondary: 'Debt, guarantees and support', tone: row.losses > 0 ? 'critical' : 'warning', route: row.route })),
      fiscal,
      assets,
      market,
      land,
      gisAssets: gisPage.items.filter((item) => orgIds.has(item.organizationId)),
      governance,
      auditLegal,
      industrial,
      industrialBySector: industrialView.bySector,
      privatization,
      risks: overview.majorRisks,
      decisions: overview.attention,
      opportunities: opportunityPage.items,
      riskMatrix,
      confidence: confidenceScore(orgIds, reportingPeriodId),
    } satisfies MinisterDashboardData)
  },

  async getSecretaryDashboard(filter?: ExecutiveDashboardFilter): Promise<SecretaryDashboardData> {
    const orgs = organizationsFor(filter)
    const orgIds = new Set(orgs.map((organization) => organization.id))
    const reportingPeriodId = filter?.reportingPeriodId ?? 'period-fy2027'
    const [priorityPage, obligations, concerns, boardIssues, submissionRows, escalations] = await Promise.all([
      mockSecretaryPortalService.getPriorityQueue({ pageSize: 100 }),
      mockSecretaryPortalService.getUpcomingObligations(90),
      mockSecretaryPortalService.getFinancialConcerns(),
      mockSecretaryPortalService.getBoardGovernance(),
      mockSecretaryPortalService.getSubmissionCompliance(),
      mockSecretaryPortalService.getEscalationQueue(),
    ])

    const inScope = <T extends { organizationId: string }>(items: T[]) => items.filter((item) => orgIds.has(item.organizationId))
    const priorities = inScope(priorityPage.items)
    const scopedObligations = inScope(obligations)
    const scopedConcerns = inScope(concerns)
    const scopedBoard = inScope(boardIssues)
    const scopedSubmissions = inScope(submissionRows).filter((row) => {
      const source = db.submissions.find((submission) => submission.organizationId === row.organizationId && submission.module === 'finance')
      return !source || source.reportingPeriodId === reportingPeriodId
    })
    const scopedEscalations = inScope(escalations)
    const procurement = db.procurement.filter((item) => orgIds.has(item.organizationId))
    const aboveThreshold = procurement.filter((item) => item.value >= PROCUREMENT_HIGH_VALUE_THRESHOLD_PKR)
    const procurementValue = procurement.reduce((sum, item) => sum + item.value, 0)
    const vendorTotals = new Map<string, number>()
    procurement.forEach((item) => vendorTotals.set(item.vendor, (vendorTotals.get(item.vendor) ?? 0) + item.value))
    const methodCounts = new Map<string, number>()
    procurement.forEach((item) => methodCounts.set(item.method, (methodCounts.get(item.method) ?? 0) + 1))

    const sanctionedPosts = db.sanctionedPosts.filter((item) => orgIds.has(item.organizationId))
    const criticalPosts = sanctionedPosts.filter((item) => item.criticality === 'critical' && item.vacant > 0)
    const consultants = db.consultants.filter((item) => orgIds.has(item.organizationId) && item.status !== 'completed')
    const loans = db.loans.filter((item) => orgIds.has(item.organizationId))
    const loanById = new Map(loans.map((loan) => [loan.id, loan]))
    const repayments = db.loanRepayments
      .filter((item) => orgIds.has(item.organizationId) && item.status !== 'paid')
      .filter((item) => daysFromAsOf(item.dueDate) <= 90)
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    const auditParas = db.auditParas.filter((item) => orgIds.has(item.organizationId) && !['closed', 'settled'].includes(item.status))
    const pac = db.pacObservations.filter((item) => orgIds.has(item.organizationId) && item.status === 'overdue')
    const litigation = db.litigation.filter((item) => orgIds.has(item.organizationId) && item.status !== 'closed')
    const boardVacancies = db.boardMembers.filter((item) => orgIds.has(item.organizationId) && item.isVacancySlot).length
    const expiredAppointments = db.boardMembers.filter((item) => orgIds.has(item.organizationId) && !item.isVacancySlot && daysFromAsOf(item.expiryDate) < 0).length
    const expiringAppointments = db.boardMembers.filter((item) => orgIds.has(item.organizationId) && !item.isVacancySlot && daysFromAsOf(item.expiryDate) >= 0 && daysFromAsOf(item.expiryDate) <= 90).length
    const pendingBoardDecisions = db.pendingDecisions.filter((item) => orgIds.has(item.organizationId) && item.originatingModule === 'board' && !['closed', 'deferred'].includes(item.status)).length
    const overdueCompliance = db.compliance.filter((item) => orgIds.has(item.organizationId) && (item.status === 'overdue' || daysFromAsOf(item.dueDate) < 0)).length
    const acceptedSubmissions = scopedSubmissions.filter((item) => item.dueBucket === 'approved').length
    const submissionCoverage = scopedSubmissions.length ? Math.round((acceptedSubmissions / scopedSubmissions.length) * 100) : 0

    const metricData: ExecutiveMetric[] = [
      { id: 'critical', label: 'Critical matters', value: priorities.filter((item) => item.severity === 'critical').length, format: 'number', detail: 'Immediate review', tone: 'critical', route: '/secretary/critical' },
      { id: 'submissions', label: 'Overdue submissions', value: scopedSubmissions.filter((item) => item.dueBucket === 'overdue' || item.dueBucket === 'clarification_overdue').length, format: 'number', detail: `${submissionCoverage}% accepted`, tone: 'warning', route: '/secretary/compliance' },
      { id: 'compliance', label: 'Delayed compliance', value: overdueCompliance, format: 'number', detail: 'Across current scope', tone: issueTone(overdueCompliance, 1, 4), route: '/secretary/compliance' },
      { id: 'decisions', label: 'Pending decisions', value: priorities.filter((item) => item.category === 'pending_decision').length, format: 'number', detail: `${pendingBoardDecisions} board-related`, tone: 'warning', route: '/secretary/decisions' },
      { id: 'escalations', label: 'Open escalations', value: scopedEscalations.filter((item) => item.status === 'open').length, format: 'number', detail: 'Awaiting resolution', tone: 'critical', route: '/secretary/escalations' },
      { id: 'vacancies', label: 'Critical vacancies', value: criticalPosts.reduce((sum, item) => sum + item.vacant, 0), format: 'number', detail: `${sanctionedPosts.reduce((sum, item) => sum + item.vacant, 0)} total vacancies`, tone: issueTone(criticalPosts.length, 1, 3), route: '/secretary/governance' },
      { id: 'loans', label: 'Repayments due', value: repayments.reduce((sum, item) => sum + Math.max(0, item.amountDue - item.amountPaid), 0), format: 'currency', detail: `${repayments.length} due within 90 days`, tone: repayments.some((item) => item.status === 'overdue' || daysFromAsOf(item.dueDate) < 0) ? 'critical' : 'warning', route: '/secretary/finance' },
      { id: 'audit', label: 'Audit paras requiring action', value: auditParas.length, format: 'number', detail: `${pac.length} overdue PAC observations`, tone: issueTone(auditParas.length, 1, 5), route: '/secretary/audit-legal' },
    ]

    const submissionMap = new Map<string, number>()
    scopedSubmissions.forEach((row) => {
      const name = row.dueBucket === 'approved' ? 'Approved' : row.dueBucket === 'under_review_long' ? 'Under review' : row.dueBucket === 'clarification_overdue' ? 'Clarification overdue' : row.dueBucket === 'overdue' ? 'Overdue' : 'Due'
      submissionMap.set(name, (submissionMap.get(name) ?? 0) + 1)
    })
    const submissionTone: Record<string, ExecutiveTone> = { Approved: 'positive', 'Under review': 'warning', 'Clarification overdue': 'critical', Overdue: 'critical', Due: 'neutral' }

    const bucketDefinitions = [
      { name: 'Overdue', match: (days: number) => days < 0, tone: 'critical' as const },
      { name: '0-7 days', match: (days: number) => days >= 0 && days <= 7, tone: 'critical' as const },
      { name: '8-30 days', match: (days: number) => days > 7 && days <= 30, tone: 'warning' as const },
      { name: '31-60 days', match: (days: number) => days > 30 && days <= 60, tone: 'neutral' as const },
      { name: '61-90 days', match: (days: number) => days > 60 && days <= 90, tone: 'positive' as const },
    ]

    const organizationRisks = orgs.map((organization) => {
      const orgFinancial = scopedConcerns.filter((item) => item.organizationId === organization.id).length
      const orgBoard = scopedBoard.filter((item) => item.organizationId === organization.id).length
      const orgCompliance = db.compliance.filter((item) => item.organizationId === organization.id && item.status === 'overdue').length
      const orgOperations = db.tasks.filter((item) => item.organizationId === organization.id && item.status !== 'done' && daysFromAsOf(item.dueDate) < 0).length
      const orgAudit = auditParas.filter((item) => item.organizationId === organization.id).length + litigation.filter((item) => item.organizationId === organization.id).length
      return {
        id: organization.id,
        label: organization.abbreviation,
        financial: issueTone(orgFinancial, 1, 2),
        governance: issueTone(orgBoard, 1, 3),
        compliance: issueTone(orgCompliance, 1, 3),
        operations: issueTone(orgOperations, 1, 3),
        auditLegal: issueTone(orgAudit, 1, 4),
        issueCount: orgFinancial + orgBoard + orgCompliance + orgOperations + orgAudit,
        route: `/secretary/critical?q=${organization.abbreviation}`,
      }
    }).sort((a, b) => b.issueCount - a.issueCount)

    const queueFromPriority: SecretaryQueueItem[] = priorities.map((item) => ({
      id: item.id,
      organizationLabel: item.organizationLabel,
      issue: item.issue,
      category: item.category.replaceAll('_', ' '),
      owner: item.owner,
      ageDays: item.ageDays,
      dueDate: item.dueDate,
      tone: item.severity === 'critical' ? 'critical' : 'warning',
      route: item.route,
    }))

    return simulateLatency({
      asOf: DEMO_AS_OF_DATE,
      reportingPeriodId,
      options: filterOptions(),
      metrics: metricData,
      submissions: [...submissionMap.entries()].map(([name, value]) => ({ name, value, tone: submissionTone[name] ?? 'neutral' })),
      submissionCoverage,
      obligationBuckets: bucketDefinitions.map((bucket) => ({ name: bucket.name, value: scopedObligations.filter((item) => bucket.match(item.daysUntilDue)).length + repayments.filter((item) => bucket.match(daysFromAsOf(item.dueDate))).length, tone: bucket.tone })),
      obligations: scopedObligations.slice(0, 10).map((item) => ({ id: item.id, organizationLabel: item.organizationLabel, issue: item.obligationType, category: 'obligation', owner: item.owner, ageDays: Math.max(0, -item.daysUntilDue), dueDate: item.dueDate, tone: item.severity === 'critical' ? 'critical' : item.severity === 'attention' ? 'warning' : 'neutral', route: item.route })),
      exceptionMatrix: organizationRisks.slice(0, 10),
      financialConcerns: scopedConcerns.slice(0, 8).map((item) => ({ id: item.id, organizationLabel: item.organizationLabel, issue: `${item.indicator}: ${item.detail}`, category: 'financial', owner: 'Finance Wing', ageDays: 0, tone: item.severity === 'critical' ? 'critical' : 'warning', route: item.route })),
      loanRepayments: repayments.map((item) => {
        const status = daysFromAsOf(item.dueDate) < 0 ? 'overdue' : item.status
        return { id: item.id, organizationLabel: organizationLabel(item.organizationId), lender: loanById.get(item.loanId)?.lender ?? 'Lender', dueDate: item.dueDate, amountDue: Math.max(0, item.amountDue - item.amountPaid), status, tone: status === 'overdue' ? 'critical' : status === 'partial' ? 'warning' : 'neutral' }
      }),
      procurement: {
        aboveThreshold: aboveThreshold.length,
        aboveThresholdValue: aboveThreshold.reduce((sum, item) => sum + item.value, 0),
        singleSource: procurement.filter((item) => item.method === 'single_source').length,
        overdue: procurement.filter((item) => item.completionStatus === 'overdue' || item.contractStatus === 'overdue').length,
        missingEvidence: procurement.filter((item) => !item.evidenceAvailable).length,
        vendorConcentration: procurementValue ? Math.round((Math.max(0, ...vendorTotals.values()) / procurementValue) * 100) : 0,
        byMethod: [...methodCounts.entries()].map(([name, value]) => ({ name: name.replaceAll('_', ' '), value })),
      },
      workforce: {
        criticalVacancies: criticalPosts.reduce((sum, item) => sum + item.vacant, 0),
        totalVacancies: sanctionedPosts.reduce((sum, item) => sum + item.vacant, 0),
        activeConsultants: consultants.length,
        consultantsExpiring90: consultants.filter((item) => daysFromAsOf(item.contractEnd) >= 0 && daysFromAsOf(item.contractEnd) <= 90).length,
        vacantPosts: criticalPosts.sort((a, b) => b.vacant - a.vacant).slice(0, 6).map((item) => ({ id: item.id, label: `${organizationLabel(item.organizationId)} · ${item.designation}`, value: item.vacant, secondary: item.department, tone: 'critical', route: '/secretary/governance' })),
      },
      governance: { boardVacancies, expiredAppointments, expiringAppointments, pendingBoardDecisions },
      auditLegal: {
        openParas: auditParas.length,
        auditExposure: auditParas.reduce((sum, item) => sum + item.amountInvolved, 0),
        recoveryOutstanding: auditParas.reduce((sum, item) => sum + Math.max(0, item.amountInvolved - item.amountRecovered), 0),
        overduePac: pac.length,
        litigationExposure: litigation.reduce((sum, item) => sum + (item.amountInvolved ?? 0), 0),
        upcomingHearings: litigation.filter((item) => item.nextHearing && daysFromAsOf(item.nextHearing) >= 0 && daysFromAsOf(item.nextHearing) <= 30).length,
      },
      queue: [...queueFromPriority, ...scopedObligations.map((item) => ({ id: item.id, organizationLabel: item.organizationLabel, issue: item.obligationType, category: 'obligation', owner: item.owner, ageDays: Math.max(0, -item.daysUntilDue), dueDate: item.dueDate, tone: item.severity === 'critical' ? 'critical' as const : 'warning' as const, route: item.route }))].sort((a, b) => (a.tone === 'critical' ? -1 : 1) - (b.tone === 'critical' ? -1 : 1) || b.ageDays - a.ageDays).slice(0, 12),
      confidence: confidenceScore(orgIds, reportingPeriodId),
    } satisfies SecretaryDashboardData)
  },
}
