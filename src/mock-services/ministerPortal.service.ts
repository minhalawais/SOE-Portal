/**
 * Minister Strategic Intelligence Portal — Phase 16.
 * Strategy-first portfolio aggregates over fixtures. Read-only.
 * Health band and opportunity ranking are provisional prototype rules.
 */
import {
  ASSET_OCCUPANCY,
  ASSET_TYPE,
  ASSET_UTILIZATION,
  DEMO_AS_OF_DATE,
  ENCROACHMENT_STATUS,
  ASSET_LITIGATION_STATUS,
  LAND_USE_CLASS,
  PORTFOLIO_HEALTH,
  ROLE,
  SOE_STATUS,
  STRATEGIC_OPPORTUNITY_KIND,
  SUBMISSION_STATUS,
  type PortfolioHealthBand,
  type SoeStatus,
  type StrategicOpportunityKind,
} from '@/constants'
import { db } from '@/mock-data'
import { deriveOrganizationMetrics } from '@/mock-data/derived'
import { paginate } from '@/mock-services/_helpers'
import type { ListQuery, PagedResult } from '@/types/domain'
import { simulateLatency } from '@/utils'
import { daysUntil } from '@/workflow/boardExpiry'

/** Provisional thresholds for Minister opportunity / risk signals */
const HIGH_AUDIT_PKR = 50_000_000
const HIGH_LITIGATION_PKR = 100_000_000
const HIGH_VARIANCE_PKR = 500_000_000
const UNDERUTILIZED_CAPACITY_PCT = 50

export interface MinisterFilter {
  reportingPeriodId?: string
  sector?: string
  status?: SoeStatus | ''
  province?: string
}

export interface MinisterPortfolioSummary {
  asOf: string
  reportingPeriodId: string
  soeCountByStatus: Record<string, number>
  profitableCount: number
  lossMakingCount: number
  noApprovedFinanceCount: number
  aggregateAssetBookValue: number
  aggregateAssetMarketValue: number
  aggregateLiabilities: number
  aggregateDebt: number
  aggregateSubsidies: number
  aggregateGuarantees: number
  aggregateGrants: number
  aggregateGovernmentInvestment: number
  averageCapacityUtilization: number | null
  isPrototypeMethodology: true
  financeScopeNote: string
}

export interface MinisterRiskItem {
  id: string
  organizationId: string
  organizationLabel: string
  issue: string
  area: 'fiscal' | 'governance' | 'audit' | 'litigation' | 'privatization' | 'compliance'
  severity: 'critical' | 'attention'
  route: string
  amountPkr?: number
}

export interface MinisterOpportunityItem {
  id: string
  organizationId: string
  organizationLabel: string
  kind: StrategicOpportunityKind
  title: string
  detail: string
  route: string
  amountPkr?: number
  isPrototypeSignal: true
}

export interface MinisterAttentionItem {
  id: string
  organizationId: string
  organizationLabel: string
  matter: string
  source: 'escalation' | 'pending_decision' | 'alert'
  urgency: 'critical' | 'attention'
  route: string
}

export interface MinisterHealthRow {
  organizationId: string
  abbreviation: string
  name: string
  sector: string
  province: string
  status: SoeStatus
  financialPosition: 'profitable' | 'loss' | 'persistent_loss' | 'unavailable'
  governanceCondition: 'ok' | 'attention' | 'critical'
  healthBand: PortfolioHealthBand
  profitOrLoss: number | null
  subsidies: number
  debt: number
  boardVacancies: number
  capacityUtilization: number | null
  warningCount: number
  financeStatus: string
  route: string
}

export interface MinisterAssetIntel {
  totalBookValue: number
  totalMarketValue: number
  landBookValue: number
  landMarketValue: number
  vacantUnusedCount: number
  underutilizedCount: number
  encroachedLandCount: number
  underLitigationCount: number
  idleFactoryCount: number
}

export interface MinisterGovernanceRisk {
  boardVacancies: number
  expiringWithin90: number
  expiredAppointments: number
  overdueCompliance: number
  missingAnnualReports: number
  governanceAlerts: number
}

export interface MinisterAuditLegalRisk {
  openParaCount: number
  totalAuditExposure: number
  majorParas: Array<{
    id: string
    organizationLabel: string
    title: string
    amountInvolved: number
    route: string
  }>
  litigationExposure: number
  majorLitigation: Array<{
    id: string
    organizationLabel: string
    title: string
    amountInvolved: number
    nextHearing?: string
    route: string
  }>
}

export interface MinisterPrivatizationSummary {
  pipelineCount: number
  blockedCount: number
  completedMilestones: number
  cases: Array<{
    id: string
    organizationLabel: string
    stage: string
    status: string
    blocker?: string
    potentialValueNote: string
    route: string
  }>
}

export interface MinisterIndustrialSummary {
  installedCapacity: number
  actualProduction: number
  capacityUtilization: number | null
  exportContribution: number
  domesticSales: number
  employment: number
  underutilizedOrgCount: number
}

export interface MinisterExecutiveOverview {
  summary: MinisterPortfolioSummary
  majorRisks: MinisterRiskItem[]
  opportunities: MinisterOpportunityItem[]
  attention: MinisterAttentionItem[]
  filterOptions: {
    sectors: string[]
    provinces: string[]
    statuses: SoeStatus[]
    periods: Array<{ id: string; label: string }>
  }
}

function orgLabel(id: string): string {
  return db.organizations.find((o) => o.id === id)?.abbreviation ?? id
}

function orgProvince(orgId: string): string {
  return (
    db.locations.find((l) => l.organizationId === orgId && l.kind === 'head_office')
      ?.province ??
    db.locations.find((l) => l.organizationId === orgId)?.province ??
    ''
  )
}

function filterOrgs(filter?: MinisterFilter) {
  let orgs = [...db.organizations]
  if (filter?.sector) orgs = orgs.filter((o) => o.sector === filter.sector)
  if (filter?.status) orgs = orgs.filter((o) => o.status === filter.status)
  if (filter?.province) {
    orgs = orgs.filter((o) => orgProvince(o.id) === filter.province)
  }
  return orgs
}

function periodId(filter?: MinisterFilter) {
  return filter?.reportingPeriodId ?? 'period-fy2027'
}

function isEligibleFinanceStatus(status: string) {
  return (
    status === SUBMISSION_STATUS.APPROVED ||
    status === SUBMISSION_STATUS.LOCKED ||
    // Prototype: MoIP under-review still appears in fiscal pages — Minister overview
    // prefers approved/locked; remaining rows noted as unavailable for P/L counts.
    false
  )
}

function financeFor(orgId: string, reportingPeriodId: string) {
  return db.financialMetrics.find(
    (f) => f.organizationId === orgId && f.reportingPeriodId === reportingPeriodId,
  )
}

function consecutiveLoss(orgId: string, reportingPeriodId: string): number {
  const order = db.reportingPeriods
    .filter((p) => p.type === 'annual')
    .sort((a, b) => a.startDate.localeCompare(b.startDate))
    .map((p) => p.id)
  const idx = order.indexOf(reportingPeriodId)
  const slice = idx >= 0 ? order.slice(0, idx + 1) : [reportingPeriodId]
  let streak = 0
  for (let i = slice.length - 1; i >= 0; i--) {
    const m = financeFor(orgId, slice[i]!)
    if (m && m.profitOrLoss < 0) streak += 1
    else break
  }
  return streak
}

function classifyHealth(args: {
  financialPosition: MinisterHealthRow['financialPosition']
  governanceCondition: MinisterHealthRow['governanceCondition']
  warningCount: number
  status: SoeStatus
}): PortfolioHealthBand {
  if (
    args.financialPosition === 'persistent_loss' ||
    args.governanceCondition === 'critical' ||
    args.warningCount >= 4 ||
    args.status === SOE_STATUS.UNDER_LIQUIDATION
  ) {
    return PORTFOLIO_HEALTH.CONCERN
  }
  if (
    args.financialPosition === 'loss' ||
    args.governanceCondition === 'attention' ||
    args.warningCount >= 2 ||
    args.status === SOE_STATUS.UNDER_PRIVATIZATION ||
    args.status === SOE_STATUS.DORMANT
  ) {
    return PORTFOLIO_HEALTH.WATCH
  }
  return PORTFOLIO_HEALTH.HEALTHY
}

function buildHealthRows(filter?: MinisterFilter): MinisterHealthRow[] {
  const reportingPeriodId = periodId(filter)
  return filterOrgs(filter).map((org) => {
    const fin = financeFor(org.id, reportingPeriodId)
    const metrics = deriveOrganizationMetrics(org.id, reportingPeriodId)
    const lossYears = consecutiveLoss(org.id, reportingPeriodId)
    let financialPosition: MinisterHealthRow['financialPosition'] = 'unavailable'
    if (fin && isEligibleFinanceStatus(fin.status)) {
      if (lossYears >= 3) financialPosition = 'persistent_loss'
      else if (fin.profitOrLoss < 0) financialPosition = 'loss'
      else financialPosition = 'profitable'
    } else if (fin) {
      // Provisional: use period figure for component indicator when not approved
      if (lossYears >= 3) financialPosition = 'persistent_loss'
      else if (fin.profitOrLoss < 0) financialPosition = 'loss'
      else financialPosition = 'profitable'
    }
    const governanceCondition: MinisterHealthRow['governanceCondition'] =
      metrics.boardVacancies >= 2 || metrics.overdueComplianceCount >= 2
        ? 'critical'
        : metrics.boardVacancies > 0 || metrics.boardExpiringSoon > 0
          ? 'attention'
          : 'ok'
    const healthBand = classifyHealth({
      financialPosition,
      governanceCondition,
      warningCount: metrics.warningCount,
      status: org.status,
    })
    return {
      organizationId: org.id,
      abbreviation: org.abbreviation,
      name: org.name,
      sector: org.sector,
      province: orgProvince(org.id),
      status: org.status,
      financialPosition,
      governanceCondition,
      healthBand,
      profitOrLoss: fin?.profitOrLoss ?? null,
      subsidies: fin?.subsidies ?? 0,
      debt: fin?.totalDebt ?? 0,
      boardVacancies: metrics.boardVacancies,
      capacityUtilization: metrics.capacityUtilization ?? null,
      warningCount: metrics.warningCount,
      financeStatus: fin?.status ?? '—',
      route: `/minister/portfolio?soe=${org.id}`,
    }
  })
}

function buildAssetIntel(orgIds: Set<string>): MinisterAssetIntel {
  const assets = db.assets.filter((a) => orgIds.has(a.organizationId))
  const land = assets.filter((a) => a.assetType === ASSET_TYPE.LAND)
  return {
    totalBookValue: assets.reduce((s, a) => s + (a.bookValue ?? 0), 0),
    totalMarketValue: assets.reduce((s, a) => s + (a.marketValue ?? 0), 0),
    landBookValue: land.reduce((s, a) => s + (a.bookValue ?? 0), 0),
    landMarketValue: land.reduce((s, a) => s + (a.marketValue ?? 0), 0),
    vacantUnusedCount: assets.filter(
      (a) =>
        a.occupancyStatus === ASSET_OCCUPANCY.VACANT ||
        a.utilizationStatus === ASSET_UTILIZATION.UNUSED ||
        a.useClassification === LAND_USE_CLASS.UNUSED,
    ).length,
    underutilizedCount: assets.filter(
      (a) =>
        a.utilizationStatus === ASSET_UTILIZATION.UNDERUTILIZED ||
        a.utilizationStatus === ASSET_UTILIZATION.IDLE,
    ).length,
    encroachedLandCount: assets.filter(
      (a) =>
        a.assetType === ASSET_TYPE.LAND &&
        (a.encroachmentStatus === ENCROACHMENT_STATUS.ENCROACHED ||
          a.encroachmentStatus === ENCROACHMENT_STATUS.SUSPECTED),
    ).length,
    underLitigationCount: assets.filter(
      (a) => a.litigationStatus === ASSET_LITIGATION_STATUS.ACTIVE,
    ).length,
    idleFactoryCount: assets.filter(
      (a) =>
        (a.assetType === ASSET_TYPE.BUILDING || a.assetType === ASSET_TYPE.MACHINERY) &&
        (a.utilizationStatus === ASSET_UTILIZATION.IDLE ||
          a.utilizationStatus === ASSET_UTILIZATION.UNUSED),
    ).length,
  }
}

function buildOpportunities(filter?: MinisterFilter): MinisterOpportunityItem[] {
  const orgs = filterOrgs(filter)
  const orgIds = new Set(orgs.map((o) => o.id))
  const items: MinisterOpportunityItem[] = []
  const reportingPeriodId = periodId(filter)

  for (const a of db.assets) {
    if (!orgIds.has(a.organizationId)) continue
    if (
      a.assetType === ASSET_TYPE.LAND &&
      (a.occupancyStatus === ASSET_OCCUPANCY.VACANT ||
        a.useClassification === LAND_USE_CLASS.UNUSED) &&
      (a.marketValue ?? a.bookValue ?? 0) >= 50_000_000
    ) {
      items.push({
        id: `opp-land-${a.id}`,
        organizationId: a.organizationId,
        organizationLabel: orgLabel(a.organizationId),
        kind: STRATEGIC_OPPORTUNITY_KIND.VACANT_INDUSTRIAL_LAND,
        title: 'High-value vacant / unused land',
        detail: a.name,
        route: `/minister/assets/${a.id}`,
        amountPkr: a.marketValue ?? a.bookValue,
        isPrototypeSignal: true,
      })
    }
    if (
      (a.assetType === ASSET_TYPE.BUILDING || a.assetType === ASSET_TYPE.MACHINERY) &&
      (a.utilizationStatus === ASSET_UTILIZATION.IDLE ||
        a.utilizationStatus === ASSET_UTILIZATION.UNUSED)
    ) {
      items.push({
        id: `opp-idle-${a.id}`,
        organizationId: a.organizationId,
        organizationLabel: orgLabel(a.organizationId),
        kind:
          a.assetType === ASSET_TYPE.MACHINERY
            ? STRATEGIC_OPPORTUNITY_KIND.UNDERUTILIZED_MACHINERY
            : STRATEGIC_OPPORTUNITY_KIND.IDLE_FACTORY,
        title:
          a.assetType === ASSET_TYPE.MACHINERY
            ? 'Underutilized / idle machinery'
            : 'Idle factory / building',
        detail: a.name,
        route: `/minister/assets/${a.id}`,
        amountPkr: a.marketValue ?? a.bookValue,
        isPrototypeSignal: true,
      })
    }
    const book = a.bookValue ?? 0
    const market = a.marketValue ?? 0
    if (market - book >= HIGH_VARIANCE_PKR) {
      items.push({
        id: `opp-var-${a.id}`,
        organizationId: a.organizationId,
        organizationLabel: orgLabel(a.organizationId),
        kind: STRATEGIC_OPPORTUNITY_KIND.HIGH_MARKET_BOOK_VARIANCE,
        title: 'High market/book value variance',
        detail: a.name,
        route: `/minister/assets/${a.id}`,
        amountPkr: market - book,
        isPrototypeSignal: true,
      })
    }
  }

  for (const org of orgs) {
    const fin = financeFor(org.id, reportingPeriodId)
    if (fin && consecutiveLoss(org.id, reportingPeriodId) >= 3) {
      items.push({
        id: `opp-restruct-${org.id}`,
        organizationId: org.id,
        organizationLabel: org.abbreviation,
        kind: STRATEGIC_OPPORTUNITY_KIND.RESTRUCTURING_CANDIDATE,
        title: 'Restructuring candidate',
        detail: '3+ consecutive loss years (period metrics)',
        route: `/minister/finance/${org.id}`,
        amountPkr: Math.abs(fin.profitOrLoss),
        isPrototypeSignal: true,
      })
    }
    if (fin && fin.profitOrLoss > 0 && (fin.subsidies ?? 0) === 0 && org.status === SOE_STATUS.ACTIVE) {
      const metrics = deriveOrganizationMetrics(org.id, reportingPeriodId)
      if (metrics.warningCount === 0) {
        items.push({
          id: `opp-strong-${org.id}`,
          organizationId: org.id,
          organizationLabel: org.abbreviation,
          kind: STRATEGIC_OPPORTUNITY_KIND.STRONG_PERFORMER,
          title: 'Strong-performing SOE',
          detail: 'Profitability with low governance warnings (prototype)',
          route: `/minister/portfolio?soe=${org.id}`,
          amountPkr: fin.profitOrLoss,
          isPrototypeSignal: true,
        })
      }
    }
  }

  for (const c of db.privatizationCases) {
    if (!orgIds.has(c.organizationId)) continue
    if (c.status !== 'completed') {
      items.push({
        id: `opp-priv-${c.id}`,
        organizationId: c.organizationId,
        organizationLabel: orgLabel(c.organizationId),
        kind: STRATEGIC_OPPORTUNITY_KIND.PRIVATIZATION_MILESTONE,
        title: 'Privatization pipeline opportunity',
        detail: `Stage: ${c.currentStage}${c.blocker ? ` · Blocker: ${c.blocker}` : ''}`,
        route: '/minister/privatization',
        isPrototypeSignal: true,
      })
    }
  }

  // Deduplicate by id, prioritize higher amount
  items.sort((a, b) => (b.amountPkr ?? 0) - (a.amountPkr ?? 0))
  return items.slice(0, 24)
}

function buildMajorRisks(filter?: MinisterFilter): MinisterRiskItem[] {
  const orgs = filterOrgs(filter)
  const orgIds = new Set(orgs.map((o) => o.id))
  const risks: MinisterRiskItem[] = []
  const reportingPeriodId = periodId(filter)

  for (const org of orgs) {
    const fin = financeFor(org.id, reportingPeriodId)
    if (fin && consecutiveLoss(org.id, reportingPeriodId) >= 3) {
      risks.push({
        id: `risk-loss-${org.id}`,
        organizationId: org.id,
        organizationLabel: org.abbreviation,
        issue: 'Persistent losses (3+ years)',
        area: 'fiscal',
        severity: 'critical',
        route: '/minister/fiscal',
        amountPkr: Math.abs(fin.profitOrLoss),
      })
    }
    if (fin && fin.subsidies >= 1_000_000_000) {
      risks.push({
        id: `risk-sub-${org.id}`,
        organizationId: org.id,
        organizationLabel: org.abbreviation,
        issue: 'Material subsidy exposure',
        area: 'fiscal',
        severity: 'attention',
        route: '/minister/fiscal',
        amountPkr: fin.subsidies,
      })
    }
    const m = deriveOrganizationMetrics(org.id, reportingPeriodId)
    if (m.boardVacancies > 0) {
      risks.push({
        id: `risk-board-${org.id}`,
        organizationId: org.id,
        organizationLabel: org.abbreviation,
        issue: `Board vacancy (${m.boardVacancies})`,
        area: 'governance',
        severity: m.boardVacancies >= 2 ? 'critical' : 'attention',
        route: '/minister/governance',
      })
    }
  }

  for (const p of db.auditParas) {
    if (!orgIds.has(p.organizationId)) continue
    if (p.status === 'closed' || p.status === 'settled') continue
    if (p.amountInvolved >= HIGH_AUDIT_PKR) {
      risks.push({
        id: `risk-audit-${p.id}`,
        organizationId: p.organizationId,
        organizationLabel: orgLabel(p.organizationId),
        issue: p.title,
        area: 'audit',
        severity: 'critical',
        route: '/minister/audit-legal',
        amountPkr: p.amountInvolved,
      })
    }
  }

  for (const l of db.litigation) {
    if (!orgIds.has(l.organizationId)) continue
    if ((l.amountInvolved ?? 0) >= HIGH_LITIGATION_PKR) {
      risks.push({
        id: `risk-lit-${l.id}`,
        organizationId: l.organizationId,
        organizationLabel: orgLabel(l.organizationId),
        issue: `${l.nature} — ${l.caseNumber}`,
        area: 'litigation',
        severity: 'critical',
        route: '/minister/audit-legal',
        amountPkr: l.amountInvolved,
      })
    }
  }

  for (const c of db.privatizationCases) {
    if (!orgIds.has(c.organizationId) || !c.blocker) continue
    risks.push({
      id: `risk-priv-${c.id}`,
      organizationId: c.organizationId,
      organizationLabel: orgLabel(c.organizationId),
      issue: `Privatization blocked: ${c.blocker}`,
      area: 'privatization',
      severity: 'attention',
      route: '/minister/privatization',
    })
  }

  const rank = (s: string) => (s === 'critical' ? 0 : 1)
  risks.sort((a, b) => {
    const sr = rank(a.severity) - rank(b.severity)
    if (sr !== 0) return sr
    return (b.amountPkr ?? 0) - (a.amountPkr ?? 0)
  })
  return risks.slice(0, 12)
}

function buildAttention(filter?: MinisterFilter): MinisterAttentionItem[] {
  const orgs = filterOrgs(filter)
  const orgIds = new Set(orgs.map((o) => o.id))
  const items: MinisterAttentionItem[] = []

  for (const e of db.escalations) {
    if (!orgIds.has(e.organizationId)) continue
    if (e.status === 'resolved') continue
    if (
      e.ownerRole !== ROLE.MINISTER &&
      e.escalationLevel !== 3 &&
      e.severity !== 'critical'
    ) {
      continue
    }
    items.push({
      id: `att-esc-${e.id}`,
      organizationId: e.organizationId,
      organizationLabel: orgLabel(e.organizationId),
      matter: e.reason,
      source: 'escalation',
      urgency: e.severity === 'critical' ? 'critical' : 'attention',
      route: `/minister/alerts`,
    })
  }

  for (const d of db.pendingDecisions) {
    if (!orgIds.has(d.organizationId)) continue
    if (d.status === 'closed') continue
    if (d.urgency === 'critical' || d.status === 'deferred') {
      items.push({
        id: `att-dec-${d.id}`,
        organizationId: d.organizationId,
        organizationLabel: orgLabel(d.organizationId),
        matter: d.matter,
        source: 'pending_decision',
        urgency: d.urgency,
        route: '/minister/alerts',
      })
    }
  }

  for (const a of db.alerts) {
    if (!a.organizationId || !orgIds.has(a.organizationId)) continue
    if (a.status !== 'open' || a.severity !== 'critical') continue
    items.push({
      id: `att-alert-${a.id}`,
      organizationId: a.organizationId,
      organizationLabel: orgLabel(a.organizationId),
      matter: a.title,
      source: 'alert',
      urgency: 'critical',
      route: a.route?.startsWith('/minister') ? a.route : `/minister/alerts/${a.id}`,
    })
  }

  items.sort((a, b) => (a.urgency === 'critical' ? 0 : 1) - (b.urgency === 'critical' ? 0 : 1))
  return items.slice(0, 8)
}

function buildSummary(filter?: MinisterFilter): MinisterPortfolioSummary {
  const reportingPeriodId = periodId(filter)
  const orgs = filterOrgs(filter)
  const orgIds = new Set(orgs.map((o) => o.id))
  const soeCountByStatus: Record<string, number> = {}
  for (const o of orgs) {
    soeCountByStatus[o.status] = (soeCountByStatus[o.status] ?? 0) + 1
  }

  let profitableCount = 0
  let lossMakingCount = 0
  let noApprovedFinanceCount = 0
  let aggregateLiabilities = 0
  let aggregateDebt = 0
  let aggregateSubsidies = 0
  let aggregateGovernmentInvestment = 0

  for (const org of orgs) {
    const fin = financeFor(org.id, reportingPeriodId)
    aggregateGovernmentInvestment += org.paidUpCapitalPkr ?? 0
    if (!fin) {
      noApprovedFinanceCount += 1
      continue
    }
    if (isEligibleFinanceStatus(fin.status)) {
      if (fin.profitOrLoss >= 0) profitableCount += 1
      else lossMakingCount += 1
    } else {
      noApprovedFinanceCount += 1
      // Still count period P/L for component visibility when no approved set exists
      if (fin.profitOrLoss >= 0) profitableCount += 1
      else lossMakingCount += 1
    }
    aggregateLiabilities += fin.currentLiabilities ?? fin.totalDebt ?? 0
    aggregateDebt += fin.totalDebt ?? 0
    aggregateSubsidies += fin.subsidies ?? 0
  }

  // If approved/locked sparse, profitable/loss already used period metrics above with note
  const assets = buildAssetIntel(orgIds)
  let aggregateGuarantees = 0
  let aggregateGrants = 0
  for (const g of db.guarantees) {
    if (orgIds.has(g.organizationId)) aggregateGuarantees += g.exposure
  }
  for (const g of db.grants) {
    if (orgIds.has(g.organizationId)) aggregateGrants += g.amount
  }

  const industrial = db.industrialPerformance.filter(
    (i) => orgIds.has(i.organizationId) && i.reportingPeriodId === reportingPeriodId,
  )
  const avgUtil =
    industrial.length === 0
      ? null
      : industrial.reduce((s, i) => s + (i.capacityUtilization ?? 0), 0) / industrial.length

  return {
    asOf: DEMO_AS_OF_DATE,
    reportingPeriodId,
    soeCountByStatus,
    profitableCount,
    lossMakingCount,
    noApprovedFinanceCount,
    aggregateAssetBookValue: assets.totalBookValue,
    aggregateAssetMarketValue: assets.totalMarketValue,
    aggregateLiabilities,
    aggregateDebt,
    aggregateSubsidies,
    aggregateGuarantees,
    aggregateGrants,
    aggregateGovernmentInvestment,
    averageCapacityUtilization: avgUtil,
    isPrototypeMethodology: true,
    financeScopeNote:
      'P/L counts use period financial metrics reconciled to fixtures; approved/locked preferred when present. Government investment = paid-up capital (provisional).',
  }
}

export interface MinisterPortalService {
  getFilterOptions(): Promise<MinisterExecutiveOverview['filterOptions']>
  getExecutiveOverview(filter?: MinisterFilter): Promise<MinisterExecutiveOverview>
  getPortfolioHealth(
    filter?: MinisterFilter & ListQuery,
  ): Promise<PagedResult<MinisterHealthRow>>
  getFiscalExposure(filter?: MinisterFilter): Promise<{
    summary: MinisterPortfolioSummary
    bySoe: Array<{
      organizationId: string
      abbreviation: string
      investment: number
      debt: number
      guarantees: number
      subsidies: number
      grants: number
      losses: number
      route: string
    }>
    trend: Array<{ periodId: string; label: string; debt: number; subsidies: number; pl: number }>
  }>
  getAssetIntelligence(filter?: MinisterFilter): Promise<MinisterAssetIntel>
  getGovernanceRisk(filter?: MinisterFilter): Promise<MinisterGovernanceRisk>
  getAuditLegalRisk(filter?: MinisterFilter): Promise<MinisterAuditLegalRisk>
  getPrivatizationSummary(filter?: MinisterFilter): Promise<MinisterPrivatizationSummary>
  getIndustrialSummary(filter?: MinisterFilter): Promise<MinisterIndustrialSummary>
  getStrategicOpportunities(
    filter?: MinisterFilter & ListQuery & { kind?: string },
  ): Promise<PagedResult<MinisterOpportunityItem>>
  getLineageLinks(organizationId: string): Promise<Array<{ id: string; label: string; route: string }>>
}

export const mockMinisterPortalService: MinisterPortalService = {
  async getFilterOptions() {
    const sectors = [...new Set(db.organizations.map((o) => o.sector))].sort()
    const provinces = [
      ...new Set(db.locations.map((l) => l.province).filter(Boolean)),
    ].sort()
    const statuses = [...new Set(db.organizations.map((o) => o.status))] as SoeStatus[]
    const periods = db.reportingPeriods
      .filter((p) => p.type === 'annual')
      .sort((a, b) => a.startDate.localeCompare(b.startDate))
      .map((p) => ({ id: p.id, label: p.label }))
    return simulateLatency({ sectors, provinces, statuses, periods })
  },

  async getExecutiveOverview(filter) {
    const summary = buildSummary(filter)
    const options = await mockMinisterPortalService.getFilterOptions()
    return simulateLatency({
      summary,
      majorRisks: buildMajorRisks(filter),
      opportunities: buildOpportunities(filter).slice(0, 6),
      attention: buildAttention(filter),
      filterOptions: options,
    })
  },

  async getPortfolioHealth(filter) {
    let rows = buildHealthRows(filter)
    if (filter?.search) {
      const q = filter.search.toLowerCase()
      rows = rows.filter(
        (r) =>
          r.abbreviation.toLowerCase().includes(q) ||
          r.name.toLowerCase().includes(q) ||
          r.sector.toLowerCase().includes(q),
      )
    }
    if (filter?.organizationId) {
      rows = rows.filter((r) => r.organizationId === filter.organizationId)
    }
    rows.sort((a, b) => {
      const order = { concern: 0, watch: 1, healthy: 2 }
      return order[a.healthBand] - order[b.healthBand] || b.warningCount - a.warningCount
    })
    return simulateLatency(paginate(rows, filter))
  },

  async getFiscalExposure(filter) {
    const summary = buildSummary(filter)
    const reportingPeriodId = periodId(filter)
    const orgs = filterOrgs(filter)
    const bySoe = orgs.map((org) => {
      const fin = financeFor(org.id, reportingPeriodId)
      const guarantees = db.guarantees
        .filter((g) => g.organizationId === org.id)
        .reduce((s, g) => s + g.exposure, 0)
      const grants = db.grants
        .filter((g) => g.organizationId === org.id)
        .reduce((s, g) => s + g.amount, 0)
      return {
        organizationId: org.id,
        abbreviation: org.abbreviation,
        investment: org.paidUpCapitalPkr ?? 0,
        debt: fin?.totalDebt ?? 0,
        guarantees,
        subsidies: fin?.subsidies ?? 0,
        grants,
        losses: fin && fin.profitOrLoss < 0 ? Math.abs(fin.profitOrLoss) : 0,
        route: `/minister/finance/${org.id}`,
      }
    })
    bySoe.sort((a, b) => b.debt + b.guarantees + b.subsidies - (a.debt + a.guarantees + a.subsidies))

    const periods = db.reportingPeriods
      .filter((p) => p.type === 'annual')
      .sort((a, b) => a.startDate.localeCompare(b.startDate))
      .slice(-5)
    const orgIds = new Set(orgs.map((o) => o.id))
    const trend = periods.map((p) => {
      let debt = 0
      let subsidies = 0
      let pl = 0
      for (const org of orgs) {
        if (!orgIds.has(org.id)) continue
        const fin = financeFor(org.id, p.id)
        debt += fin?.totalDebt ?? 0
        subsidies += fin?.subsidies ?? 0
        pl += fin?.profitOrLoss ?? 0
      }
      return { periodId: p.id, label: p.label, debt, subsidies, pl }
    })

    return simulateLatency({ summary, bySoe, trend })
  },

  async getAssetIntelligence(filter) {
    const orgIds = new Set(filterOrgs(filter).map((o) => o.id))
    return simulateLatency(buildAssetIntel(orgIds))
  },

  async getGovernanceRisk(filter) {
    const orgs = filterOrgs(filter)
    const orgIds = new Set(orgs.map((o) => o.id))
    const asOf = DEMO_AS_OF_DATE
    let boardVacancies = 0
    let expiringWithin90 = 0
    let expiredAppointments = 0
    for (const b of db.boardMembers) {
      if (!orgIds.has(b.organizationId)) continue
      if (b.isVacancySlot) {
        boardVacancies += 1
        continue
      }
      const d = daysUntil(b.expiryDate, asOf)
      if (d < 0) expiredAppointments += 1
      else if (d <= 90) expiringWithin90 += 1
    }
    const overdueCompliance = db.compliance.filter(
      (c) => orgIds.has(c.organizationId) && daysUntil(c.dueDate, asOf) < 0,
    ).length
    const missingAnnualReports = db.submissions.filter(
      (s) =>
        orgIds.has(s.organizationId) &&
        s.module === 'finance' &&
        s.reportingPeriodId === periodId(filter) &&
        [SUBMISSION_STATUS.DRAFT, SUBMISSION_STATUS.IN_PROGRESS, SUBMISSION_STATUS.RETURNED].includes(
          s.status as never,
        ),
    ).length
    const governanceAlerts = db.alerts.filter(
      (a) =>
        a.organizationId &&
        orgIds.has(a.organizationId) &&
        a.status === 'open' &&
        (a.ruleId?.includes('board') || a.title.toLowerCase().includes('board')),
    ).length

    return simulateLatency({
      boardVacancies,
      expiringWithin90,
      expiredAppointments,
      overdueCompliance,
      missingAnnualReports,
      governanceAlerts,
    })
  },

  async getAuditLegalRisk(filter) {
    const orgIds = new Set(filterOrgs(filter).map((o) => o.id))
    const paras = db.auditParas.filter(
      (p) =>
        orgIds.has(p.organizationId) && p.status !== 'closed' && p.status !== 'settled',
    )
    const majorParas = [...paras]
      .filter((p) => p.amountInvolved >= HIGH_AUDIT_PKR)
      .sort((a, b) => b.amountInvolved - a.amountInvolved)
      .slice(0, 8)
      .map((p) => ({
        id: p.id,
        organizationLabel: orgLabel(p.organizationId),
        title: p.title,
        amountInvolved: p.amountInvolved,
        route: '/minister/audit-legal',
      }))
    const lits = db.litigation.filter((l) => orgIds.has(l.organizationId))
    const majorLitigation = [...lits]
      .filter((l) => (l.amountInvolved ?? 0) >= HIGH_LITIGATION_PKR || Boolean(l.nextHearing))
      .sort((a, b) => (b.amountInvolved ?? 0) - (a.amountInvolved ?? 0))
      .slice(0, 8)
      .map((l) => ({
        id: l.id,
        organizationLabel: orgLabel(l.organizationId),
        title: `${l.nature} — ${l.caseNumber}`,
        amountInvolved: l.amountInvolved ?? 0,
        nextHearing: l.nextHearing,
        route: '/minister/audit-legal',
      }))
    return simulateLatency({
      openParaCount: paras.length,
      totalAuditExposure: paras.reduce((s, p) => s + p.amountInvolved, 0),
      majorParas,
      litigationExposure: lits.reduce((s, l) => s + (l.amountInvolved ?? 0), 0),
      majorLitigation,
    })
  },

  async getPrivatizationSummary(filter) {
    const orgIds = new Set(filterOrgs(filter).map((o) => o.id))
    const cases = db.privatizationCases.filter((c) => orgIds.has(c.organizationId))
    const milestones = db.privatizationMilestones.filter((m) =>
      cases.some((c) => c.id === m.privatizationCaseId),
    )
    return simulateLatency({
      pipelineCount: cases.filter((c) => c.status !== 'completed').length,
      blockedCount: cases.filter((c) => Boolean(c.blocker)).length,
      completedMilestones: milestones.filter((m) => m.status === 'completed').length,
      cases: cases.map((c) => ({
        id: c.id,
        organizationLabel: orgLabel(c.organizationId),
        stage: c.currentStage,
        status: c.status,
        blocker: c.blocker,
        potentialValueNote:
          'Potential proceeds not authoritative — prototype placeholder only',
        route: '/minister/privatization',
      })),
    })
  },

  async getIndustrialSummary(filter) {
    const orgIds = new Set(filterOrgs(filter).map((o) => o.id))
    const rows = db.industrialPerformance.filter(
      (i) => orgIds.has(i.organizationId) && i.reportingPeriodId === periodId(filter),
    )
    const installedCapacity = rows.reduce((s, r) => s + (r.installedCapacity ?? 0), 0)
    const actualProduction = rows.reduce((s, r) => s + (r.actualProduction ?? 0), 0)
    const exportContribution = rows.reduce((s, r) => s + (r.exports ?? 0), 0)
    const domesticSales = rows.reduce((s, r) => s + (r.domesticSales ?? 0), 0)
    const employment = rows.reduce((s, r) => s + (r.employment ?? 0), 0)
    const capacityUtilization =
      rows.length === 0
        ? null
        : rows.reduce((s, r) => s + (r.capacityUtilization ?? 0), 0) / rows.length
    const underutilizedOrgCount = rows.filter(
      (r) => (r.capacityUtilization ?? 100) < UNDERUTILIZED_CAPACITY_PCT,
    ).length
    return simulateLatency({
      installedCapacity,
      actualProduction,
      capacityUtilization,
      exportContribution,
      domesticSales,
      employment,
      underutilizedOrgCount,
    })
  },

  async getStrategicOpportunities(filter) {
    let items = buildOpportunities(filter)
    if (filter?.kind) items = items.filter((i) => i.kind === filter.kind)
    if (filter?.search) {
      const q = filter.search.toLowerCase()
      items = items.filter(
        (i) =>
          i.title.toLowerCase().includes(q) ||
          i.organizationLabel.toLowerCase().includes(q) ||
          i.detail.toLowerCase().includes(q),
      )
    }
    return simulateLatency(paginate(items, filter))
  },

  async getLineageLinks(organizationId) {
    const paths = db.lineagePaths.filter((p) => p.organizationId === organizationId)
    const links = paths.map((p) => ({
      id: p.id,
      label: p.title ?? p.id,
      route: `/minister/finance/${organizationId}`,
    }))
    if (!links.length) {
      links.push({
        id: `lineage-fin-${organizationId}`,
        label: 'Approved finance trace (when available)',
        route: `/minister/finance/${organizationId}`,
      })
    }
    links.push({
      id: `lineage-assets-${organizationId}`,
      label: 'Asset intelligence',
      route: '/minister/assets',
    })
    return simulateLatency(links)
  },
}
