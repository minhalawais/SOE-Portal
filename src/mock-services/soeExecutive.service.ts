import { ASSET_TYPE_LABEL, DEMO_AS_OF_DATE, type AssetType } from '@/constants'
import { db } from '@/mock-data'
import { REPORTING_MODULES } from '@/workflow/moduleCatalog'
import { AppError, simulateLatency } from '@/utils'

export type ExecutiveTone = 'healthy' | 'attention' | 'critical' | 'neutral'

export interface ExecutiveAttentionItem {
  id: string
  title: string
  detail: string
  severity: 'critical' | 'high' | 'medium'
  domain: string
  route: string
}

export interface SoeExecutiveDashboard {
  organization: { id: string; name: string; abbreviation: string; sector: string; status: string }
  period: { id: string; label: string; status: string }
  asOf: string
  score: number
  scoreTone: ExecutiveTone
  scoreComponents: Array<{ domain: string; score: number; route: string }>
  headline: {
    revenue: number
    profitOrLoss: number
    cashFlow: number
    totalDebt: number
    governmentSupport: number
    capacityUtilization: number
    revenueChangePct: number | null
    profitChange: number | null
  }
  financial: {
    trend: Array<{ period: string; revenue: number; expenses: number; profit: number }>
    budget: number
    actual: number
    workingCapital: number
    currentRatio: number | null
    debtRatio: number | null
    receivables: number
    payables: number
    subsidies: number
    grants: number
    guarantees: number
    outstandingLoans: number
    repaymentsDue: number
    overdueLoans: number
  }
  operations: {
    trend: Array<{ period: string; utilization: number; production: number }>
    installedCapacity: number
    actualProduction: number
    exports: number
    domesticSales: number
    employment: number
    energyConsumption: number
    carbonEmissions: number
  }
  assets: {
    count: number
    bookValue: number
    marketValue: number
    valuationGap: number
    averageUtilization: number
    idleCount: number
    idleValue: number
    encroachedCount: number
    underLitigationCount: number
    missingValuationCount: number
    byType: Array<{ type: string; count: number; bookValue: number; marketValue: number }>
    byProvince: Array<{ province: string; count: number; value: number }>
  }
  people: {
    employees: number
    sanctionedPosts: number
    filledPosts: number
    criticalVacancies: number
    vacancyRate: number
    consultants: number
    dailyWagers: number
    boardMembers: number
    boardVacancies: number
    womenDirectors: number
    independentDirectors: number
    termsExpiring: number
    committeeCoverage: number
    leadershipPositions: number
  }
  accountability: {
    procurementValue: number
    procurementExceptions: number
    delayedContracts: number
    vendorConcentrationPct: number
    openAuditParas: number
    auditExposure: number
    auditRecovered: number
    pacOpen: number
    activeLitigation: number
    litigationExposure: number
    complianceRate: number
    overdueCompliance: number
  }
  transformation: {
    privatizationStage: string
    privatizationStatus: string
    blockedMilestones: number
    transformationInitiatives: number
    subsidiaryCount: number
    subsidiaries: Array<{ name: string; ownershipPct: number; status: string }>
  }
  dataTrust: {
    submissionStatus: string
    version: string
    completion: number
    approvedModules: number
    totalModules: number
    verifiedDocuments: number
    missingDocuments: number
    openClarifications: number
    latestUpdate: string
  }
  modulePulse: Array<{
    id: string
    label: string
    completion: number
    status: string
    issueCount: number
    route: string
  }>
  attention: ExecutiveAttentionItem[]
}

const sum = <T,>(rows: T[], read: (row: T) => number | undefined) =>
  rows.reduce((total, row) => total + (read(row) ?? 0), 0)

const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value)))

const pctChange = (current: number, previous?: number) =>
  previous == null || previous === 0 ? null : ((current - previous) / Math.abs(previous)) * 100

const lower = (value?: string) => (value ?? '').toLowerCase()

function daysUntil(date: string) {
  return Math.ceil((new Date(date).getTime() - new Date(DEMO_AS_OF_DATE).getTime()) / 86_400_000)
}

function toneForScore(score: number): ExecutiveTone {
  if (score >= 75) return 'healthy'
  if (score >= 55) return 'attention'
  return 'critical'
}

export const mockSoeExecutiveService = {
  async getDashboard(
    organizationId: string,
    reportingPeriodId: string,
  ): Promise<SoeExecutiveDashboard> {
    const organization = db.organizations.find((row) => row.id === organizationId)
    const period = db.reportingPeriods.find((row) => row.id === reportingPeriodId)
    if (!organization || !period) throw new AppError('Executive dashboard context not found', 'NOT_FOUND')

    const periodOrder = new Map(db.reportingPeriods.map((row) => [row.id, row.startDate]))
    const financeRows = db.financialMetrics
      .filter((row) => row.organizationId === organizationId)
      .sort((a, b) => (periodOrder.get(a.reportingPeriodId) ?? '').localeCompare(periodOrder.get(b.reportingPeriodId) ?? ''))
    const currentFinance =
      financeRows.find((row) => row.reportingPeriodId === reportingPeriodId) ?? financeRows.at(-1)
    const currentFinanceIndex = currentFinance ? financeRows.indexOf(currentFinance) : -1
    const priorFinance = currentFinanceIndex > 0 ? financeRows[currentFinanceIndex - 1] : undefined

    const industrialRows = db.industrialPerformance
      .filter((row) => row.organizationId === organizationId)
      .sort((a, b) => (periodOrder.get(a.reportingPeriodId) ?? '').localeCompare(periodOrder.get(b.reportingPeriodId) ?? ''))
    const currentIndustrial =
      industrialRows.find((row) => row.reportingPeriodId === reportingPeriodId) ?? industrialRows.at(-1)

    const assets = db.assets.filter((row) => row.organizationId === organizationId && !row.disposed)
    const employees = db.employees.filter((row) => row.organizationId === organizationId)
    const posts = db.sanctionedPosts.filter((row) => row.organizationId === organizationId)
    const consultants = db.consultants.filter(
      (row) => row.organizationId === organizationId && lower(row.status) === 'active',
    )
    const dailyWagers = db.dailyWagers.filter((row) => row.organizationId === organizationId)
    const board = db.boardMembers.filter((row) => row.organizationId === organizationId)
    const committees = db.boardCommittees.filter((row) => row.organizationId === organizationId)
    const executives = db.executives.filter((row) => row.organizationId === organizationId)
    const loans = db.loans.filter((row) => row.organizationId === organizationId)
    const repayments = db.loanRepayments.filter((row) => row.organizationId === organizationId)
    const grants = db.grants.filter((row) => row.organizationId === organizationId)
    const guarantees = db.guarantees.filter((row) => row.organizationId === organizationId)
    const procurement = db.procurement.filter((row) => row.organizationId === organizationId)
    const contracts = db.contracts.filter((row) => row.organizationId === organizationId)
    const auditParas = db.auditParas.filter((row) => row.organizationId === organizationId)
    const pac = db.pacObservations.filter((row) => row.organizationId === organizationId)
    const litigation = db.litigation.filter((row) => row.organizationId === organizationId)
    const compliance = db.compliance.filter((row) => row.organizationId === organizationId)
    const submissions = db.submissions.filter(
      (row) => row.organizationId === organizationId && row.reportingPeriodId === reportingPeriodId,
    )
    const documents = db.documents.filter((row) => row.organizationId === organizationId)
    const clarifications = db.clarifications.filter(
      (row) => row.organizationId === organizationId && row.status === 'open',
    )

    const revenue = currentFinance?.revenue ?? 0
    const profit = currentFinance?.profitOrLoss ?? 0
    const cashFlow = currentFinance?.cashFlow ?? 0
    const totalDebt = currentFinance?.totalDebt ?? sum(loans, (row) => row.outstanding)
    const currentRatio =
      currentFinance?.currentAssets != null && currentFinance.currentLiabilities
        ? currentFinance.currentAssets / currentFinance.currentLiabilities
        : null
    const debtRatio =
      currentFinance?.totalAssets ? totalDebt / currentFinance.totalAssets : null

    const budgetLines = db.budgetLines.filter(
      (row) => row.organizationId === organizationId && row.reportingPeriodId === reportingPeriodId,
    )
    const assetBookValue = sum(assets, (row) => row.bookValue)
    const assetMarketValue = sum(assets, (row) => row.marketValue)
    const utilizedAssets = assets.filter((row) => row.utilizationPercent != null)
    const averageUtilization = utilizedAssets.length
      ? sum(utilizedAssets, (row) => row.utilizationPercent) / utilizedAssets.length
      : 0
    const idleAssets = assets.filter(
      (row) => lower(row.utilizationStatus).includes('idle') || lower(row.utilizationStatus).includes('unused') || (row.utilizationPercent ?? 100) < 40,
    )
    const encroached = assets.filter((row) => {
      const status = lower(row.encroachmentStatus)
      return status && status !== 'none' && status !== 'clear'
    })
    const assetLitigation = assets.filter((row) => {
      const status = lower(row.litigationStatus)
      return status && status !== 'none' && status !== 'clear'
    })

    const assetTypes = new Map<string, { type: string; count: number; bookValue: number; marketValue: number }>()
    assets.forEach((asset) => {
      const label = ASSET_TYPE_LABEL[asset.assetType as AssetType] ?? asset.assetType
      const item = assetTypes.get(label) ?? { type: label, count: 0, bookValue: 0, marketValue: 0 }
      item.count += 1
      item.bookValue += asset.bookValue ?? 0
      item.marketValue += asset.marketValue ?? 0
      assetTypes.set(label, item)
    })
    const provinces = new Map<string, { province: string; count: number; value: number }>()
    assets.forEach((asset) => {
      const province = asset.province ?? 'Unspecified'
      const item = provinces.get(province) ?? { province, count: 0, value: 0 }
      item.count += 1
      item.value += asset.marketValue ?? asset.bookValue ?? 0
      provinces.set(province, item)
    })

    const sanctioned = sum(posts, (row) => row.sanctioned)
    const filled = sum(posts, (row) => row.filled)
    const boardVacancies = board.filter((row) => row.isVacancySlot || lower(row.status).includes('vacan')).length
    const activeBoard = board.filter((row) => !row.isVacancySlot && !lower(row.status).includes('expired'))
    const termsExpiring = activeBoard.filter((row) => {
      const days = daysUntil(row.expiryDate)
      return days >= 0 && days <= 180
    }).length
    const committeeCoverage = committees.length
      ? (committees.filter((row) => row.status === 'active' && row.vacancyCount === 0).length / committees.length) * 100
      : 0

    const openAudit = auditParas.filter((row) => !['settled', 'closed', 'resolved'].some((value) => lower(row.status).includes(value)))
    const activeCases = litigation.filter((row) => !['closed', 'disposed', 'settled'].some((value) => lower(row.status).includes(value)))
    const isCompliant = (status: string) =>
      ['compliant', 'submitted', 'complete'].some((value) => lower(status).includes(value))
    const compliant = compliance.filter((row) => isCompliant(row.status))
    const overdueCompliance = compliance.filter(
      (row) => lower(row.status).includes('overdue') || (!isCompliant(row.status) && daysUntil(row.dueDate) < 0),
    )
    const procurementExceptions = procurement.filter(
      (row) => lower(row.method).includes('single') || ['non-compliant', 'exception'].some((value) => lower(row.ppraCompliance).includes(value)),
    )
    const delayedContracts = contracts.filter(
      (row) => lower(row.status).includes('delay') || (row.completionPct < 100 && daysUntil(row.endDate) < 0),
    )
    const procurementValue = sum(procurement, (row) => row.value)
    const vendorValues = new Map<string, number>()
    procurement.forEach((row) => vendorValues.set(row.vendor, (vendorValues.get(row.vendor) ?? 0) + row.value))
    const largestVendor = Math.max(0, ...vendorValues.values())

    const financialScore = clamp(
      50 + (profit >= 0 ? 18 : -18) + (cashFlow >= 0 ? 12 : -12) + (currentRatio == null ? 0 : currentRatio >= 1 ? 10 : -10) + (debtRatio == null ? 0 : debtRatio <= 0.6 ? 10 : -10),
    )
    const operationsScore = clamp((currentIndustrial?.capacityUtilization ?? averageUtilization) || 0)
    const assetScore = clamp(averageUtilization - idleAssets.length * 3 - encroached.length * 5)
    const governanceScore = clamp(100 - boardVacancies * 12 - termsExpiring * 4 + Math.min(10, committeeCoverage / 10))
    const complianceScore = compliance.length ? clamp((compliant.length / compliance.length) * 100) : 0
    const scoreComponents = [
      { domain: 'Financial', score: financialScore, route: '/soe/finance' },
      { domain: 'Operations', score: operationsScore, route: '/soe/industrial' },
      { domain: 'Assets', score: assetScore, route: '/soe/assets/registry' },
      { domain: 'Governance', score: governanceScore, route: '/soe/people/board' },
      { domain: 'Compliance', score: complianceScore, route: '/soe/accountability/compliance' },
    ]
    const score = clamp(
      financialScore * 0.3 + operationsScore * 0.25 + assetScore * 0.15 + governanceScore * 0.15 + complianceScore * 0.15,
    )

    const attention: ExecutiveAttentionItem[] = []
    const addAttention = (item: ExecutiveAttentionItem) => attention.push(item)
    if (profit < 0) addAttention({ id: 'loss', title: 'Loss position requires intervention', detail: 'Operating performance is producing a negative bottom line for the selected period.', severity: 'critical', domain: 'Finance', route: '/soe/finance/performance' })
    if (cashFlow < 0) addAttention({ id: 'cash', title: 'Negative cash flow', detail: 'Liquidity pressure may affect operations and upcoming obligations.', severity: 'critical', domain: 'Finance', route: '/soe/finance/exposure' })
    const overdueLoans = loans.filter((row) => lower(row.repaymentStatus).includes('overdue') || lower(row.defaultStatus).includes('default'))
    if (overdueLoans.length) addAttention({ id: 'debt', title: `${overdueLoans.length} loan obligation${overdueLoans.length > 1 ? 's' : ''} overdue`, detail: 'Repayment or default status requires executive review.', severity: 'critical', domain: 'Fiscal exposure', route: '/soe/finance/loans' })
    if (currentIndustrial && currentIndustrial.capacityUtilization < 60) addAttention({ id: 'capacity', title: 'Capacity utilization below 60%', detail: 'Installed capacity is not translating into expected production output.', severity: 'high', domain: 'Operations', route: '/soe/industrial' })
    if (idleAssets.length) addAttention({ id: 'idle-assets', title: `${idleAssets.length} idle or underutilized assets`, detail: 'Review redeployment, lease, disposal, or monetization options.', severity: 'high', domain: 'Assets', route: '/soe/assets/registry' })
    if (boardVacancies) addAttention({ id: 'board', title: `${boardVacancies} board vacanc${boardVacancies === 1 ? 'y' : 'ies'}`, detail: 'Vacancies may affect quorum, committees, and governance effectiveness.', severity: 'high', domain: 'Governance', route: '/soe/people/board' })
    if (openAudit.length) addAttention({ id: 'audit', title: `${openAudit.length} audit paras remain open`, detail: 'Outstanding observations carry financial and accountability exposure.', severity: 'high', domain: 'Audit', route: '/soe/accountability/audit' })
    if (overdueCompliance.length) addAttention({ id: 'compliance', title: `${overdueCompliance.length} compliance obligations overdue`, detail: 'Statutory or governance deadlines have passed without closure.', severity: 'high', domain: 'Compliance', route: '/soe/accountability/compliance' })
    if (activeCases.length) addAttention({ id: 'litigation', title: `${activeCases.length} active litigation cases`, detail: 'Review material exposure, hearing dates, and evidence readiness.', severity: 'medium', domain: 'Legal', route: '/soe/accountability/litigation' })
    attention.sort((a, b) => ({ critical: 0, high: 1, medium: 2 }[a.severity] - ({ critical: 0, high: 1, medium: 2 }[b.severity])))

    const modulePulse = REPORTING_MODULES.map((definition) => {
      const submission = submissions.find((row) => row.module === definition.id)
      const moduleDocs = documents.filter((row) => row.linkedModule === definition.id || row.category === definition.id)
      return {
        id: definition.id,
        label: definition.label,
        completion: submission?.completeness ?? 0,
        status: submission?.status ?? 'not_started',
        issueCount: (submission && submission.completeness < 100 ? 1 : 0) + (moduleDocs.length === 0 ? 1 : 0),
        route: definition.route,
      }
    })

    const financeSubmission = submissions.find((row) => row.module === 'finance')
    const approvedStatuses = new Set(['approved', 'locked', 'certified'])
    const relationshipRows = db.relationships.filter((row) => row.parentOrganizationId === organizationId)
    const privatization = db.privatizationCases.find((row) => row.organizationId === organizationId)
    const milestones = db.privatizationMilestones.filter((row) => row.organizationId === organizationId)
    const transformations = db.transformationInitiatives.filter((row) => row.organizationId === organizationId)
    const latestUpdate = submissions.map((row) => row.updatedAt).sort().at(-1) ?? DEMO_AS_OF_DATE

    return simulateLatency({
      organization: { id: organization.id, name: organization.name, abbreviation: organization.abbreviation, sector: organization.sector, status: organization.status },
      period: { id: period.id, label: period.label, status: period.status },
      asOf: DEMO_AS_OF_DATE,
      score,
      scoreTone: toneForScore(score),
      scoreComponents,
      headline: {
        revenue,
        profitOrLoss: profit,
        cashFlow,
        totalDebt,
        governmentSupport: (currentFinance?.subsidies ?? 0) + (currentFinance?.governmentSupport ?? 0) + sum(grants, (row) => row.amount),
        capacityUtilization: currentIndustrial?.capacityUtilization ?? averageUtilization,
        revenueChangePct: pctChange(revenue, priorFinance?.revenue),
        profitChange: priorFinance ? profit - priorFinance.profitOrLoss : null,
      },
      financial: {
        trend: financeRows.map((row) => ({ period: db.reportingPeriods.find((item) => item.id === row.reportingPeriodId)?.label ?? row.reportingPeriodId, revenue: row.revenue, expenses: row.operatingExpenses, profit: row.profitOrLoss })),
        budget: sum(budgetLines, (row) => row.budget),
        actual: sum(budgetLines, (row) => row.actual),
        workingCapital: currentFinance?.workingCapital ?? 0,
        currentRatio,
        debtRatio,
        receivables: currentFinance?.receivables ?? 0,
        payables: currentFinance?.payables ?? 0,
        subsidies: currentFinance?.subsidies ?? 0,
        grants: sum(grants, (row) => row.amount),
        guarantees: sum(guarantees, (row) => row.exposure),
        outstandingLoans: sum(loans, (row) => row.outstanding),
        repaymentsDue: sum(repayments.filter((row) => row.status !== 'paid'), (row) => row.amountDue - row.amountPaid),
        overdueLoans: overdueLoans.length,
      },
      operations: {
        trend: industrialRows.map((row) => ({ period: db.reportingPeriods.find((item) => item.id === row.reportingPeriodId)?.label ?? row.reportingPeriodId, utilization: row.capacityUtilization, production: row.actualProduction })),
        installedCapacity: currentIndustrial?.installedCapacity ?? 0,
        actualProduction: currentIndustrial?.actualProduction ?? 0,
        exports: currentIndustrial?.exports ?? 0,
        domesticSales: currentIndustrial?.domesticSales ?? 0,
        employment: currentIndustrial?.employment ?? employees.length,
        energyConsumption: currentIndustrial?.energyConsumption ?? 0,
        carbonEmissions: currentIndustrial?.carbonEmissions ?? 0,
      },
      assets: {
        count: assets.length,
        bookValue: assetBookValue,
        marketValue: assetMarketValue,
        valuationGap: assetMarketValue - assetBookValue,
        averageUtilization,
        idleCount: idleAssets.length,
        idleValue: sum(idleAssets, (row) => row.marketValue ?? row.bookValue),
        encroachedCount: encroached.length,
        underLitigationCount: assetLitigation.length,
        missingValuationCount: assets.filter((row) => row.marketValue == null).length,
        byType: [...assetTypes.values()].sort((a, b) => b.marketValue - a.marketValue),
        byProvince: [...provinces.values()].sort((a, b) => b.value - a.value),
      },
      people: {
        employees: employees.length,
        sanctionedPosts: sanctioned,
        filledPosts: filled,
        criticalVacancies: sum(posts.filter((row) => row.criticality === 'critical'), (row) => row.vacant),
        vacancyRate: sanctioned ? ((sanctioned - filled) / sanctioned) * 100 : 0,
        consultants: consultants.length,
        dailyWagers: dailyWagers.length,
        boardMembers: activeBoard.length,
        boardVacancies,
        womenDirectors: activeBoard.filter((row) => lower(row.memberType).includes('women') || lower(row.role).includes('woman')).length,
        independentDirectors: activeBoard.filter((row) => lower(row.memberType).includes('independent')).length,
        termsExpiring,
        committeeCoverage,
        leadershipPositions: executives.length,
      },
      accountability: {
        procurementValue,
        procurementExceptions: procurementExceptions.length,
        delayedContracts: delayedContracts.length,
        vendorConcentrationPct: procurementValue ? (largestVendor / procurementValue) * 100 : 0,
        openAuditParas: openAudit.length,
        auditExposure: sum(openAudit, (row) => row.amountInvolved),
        auditRecovered: sum(auditParas, (row) => row.amountRecovered),
        pacOpen: pac.filter((row) => !['closed', 'settled', 'complete'].some((value) => lower(row.status).includes(value))).length,
        activeLitigation: activeCases.length,
        litigationExposure: sum(activeCases, (row) => row.amountInvolved),
        complianceRate: compliance.length ? (compliant.length / compliance.length) * 100 : 0,
        overdueCompliance: overdueCompliance.length,
      },
      transformation: {
        privatizationStage: privatization?.currentStage ?? 'Not in pipeline',
        privatizationStatus: privatization?.status ?? 'Not applicable',
        blockedMilestones: milestones.filter((row) => row.blocker || lower(row.status).includes('block')).length,
        transformationInitiatives: transformations.length,
        subsidiaryCount: relationshipRows.length,
        subsidiaries: relationshipRows.map((row) => {
          const related = db.organizations.find((item) => item.id === row.relatedOrganizationId)
          return { name: related?.name ?? row.relatedOrganizationId, ownershipPct: row.ownershipPercentage, status: related?.status ?? row.status }
        }),
      },
      dataTrust: {
        submissionStatus: financeSubmission?.status ?? currentFinance?.status ?? 'not_started',
        version: financeSubmission?.version ?? currentFinance?.version ?? '—',
        completion: submissions.length ? sum(submissions, (row) => row.completeness) / submissions.length : 0,
        approvedModules: submissions.filter((row) => approvedStatuses.has(row.status)).length,
        totalModules: REPORTING_MODULES.length,
        verifiedDocuments: documents.filter((row) => row.evidenceStatus === 'verified').length,
        missingDocuments: documents.filter((row) => row.evidenceStatus === 'missing').length,
        openClarifications: clarifications.length,
        latestUpdate,
      },
      modulePulse,
      attention: attention.slice(0, 8),
    } satisfies SoeExecutiveDashboard)
  },
}
