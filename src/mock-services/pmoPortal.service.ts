/**
 * PMO / Strategic Government View — Phase 17.
 * National aggregates only. Read-only. No operational workflow controls.
 * Government capital employed and fiscal components are provisional definitions.
 */
import {
  ASSET_OCCUPANCY,
  ASSET_TYPE,
  DEMO_AS_OF_DATE,
  ENCROACHMENT_STATUS,
  LAND_USE_CLASS,
  ASSET_LITIGATION_STATUS,
  LENDER_CATEGORY,
  SHAREHOLDER_CATEGORY,
} from '@/constants'
import { db } from '@/mock-data'
import { formatCurrencyPkr, simulateLatency } from '@/utils'
import { calcDebtRatio } from '@/workflow/financeKpis'

export interface PmoFilter {
  reportingPeriodId?: string
  sector?: string
  province?: string
}

export interface PmoShareholdingCounts {
  government: number
  private: number
  foreign: number
  provincialGovernment: number
}

export interface PmoNationalOverview {
  asOf: string
  reportingPeriodId: string
  soeCount: number
  soeCountByShareholding: PmoShareholdingCounts
  governmentCapitalEmployed: number
  aggregateAssetBookValue: number
  aggregateAssetMarketValue: number
  fiscalBurdenComponents: {
    subsidies: number
    guarantees: number
    losses: number
    debt: number
  }
  employment: number
  industrialOutput: number
  exportContribution: number
  privatizationPipelineCount: number
  governmentCapitalDefinition: string
  fiscalBurdenNote: string
  isPrototypeMethodology: true
}

export interface PmoSectorRow {
  sector: string
  soeCount: number
  governmentCapital: number
  debt: number
  subsidies: number
  employment: number
  exports: number
  assetBookValue: number
}

export interface PmoSoeRow {
  organizationId: string
  abbreviation: string
  name: string
  sector: string
  province: string
  governmentCapital: number
  profitOrLoss: number
  debt: number
  subsidies: number
  guarantees: number
  employment: number
  exports: number
  route: string
}

export interface PmoCapitalView {
  governmentCapitalEmployed: number
  definition: string
  returnOnCapitalPct: number | null
  returnDefinition: string
  trend: Array<{ periodId: string; label: string; capital: number; profitOrLoss: number }>
  bySector: PmoSectorRow[]
  bySoe: PmoSoeRow[]
}

export interface PmoMarketBookView {
  aggregateBookValue: number
  aggregateMarketValue: number
  variance: number
  assetsWithoutValuation: number
  landBookValue: number
  landMarketValue: number
  bySector: Array<{
    sector: string
    bookValue: number
    marketValue: number
    variance: number
  }>
}

export interface PmoFiscalBurdenView {
  subsidies: number
  guarantees: number
  losses: number
  debt: number
  grants: number
  annualBudget: number
  workingCapital: number
  payables: number
  debtRatio: number | null
  financialStatementsCount: number
  note: string
  isCombinedOfficialNumber: false
  trend: Array<{
    periodId: string
    label: string
    subsidies: number
    debt: number
    losses: number
    guarantees: number
  }>
  bySector: Array<{
    sector: string
    subsidies: number
    debt: number
    losses: number
    guarantees: number
  }>
}

export interface PmoContingentLiabilitiesView {
  guaranteeExposure: number
  otherModeledExposure: number
  actualExpenditureProxy: number
  debt: number
  distinctionNote: string
  bySoe: Array<{
    organizationId: string
    abbreviation: string
    guarantees: number
    debt: number
    subsidies: number
  }>
}

export interface PmoLandBankView {
  totalLandAreaAcres: number
  vacantAcres: number
  occupiedAcres: number
  industrialLandAcres: number
  commercialLandAcres: number
  residentialLandAcres: number
  agriculturalLandAcres: number
  vacantUnusedAcres: number
  unencumberedAcres: number
  marketValue: number
  bookValue: number
  parcelCount: number
  byProvince: Array<{
    province: string
    acres: number
    marketValue: number
    parcelCount: number
  }>
  unencumberedDefinition: string
  gisNote: string
}

export interface PmoEmploymentIndustrialView {
  totalEmployment: number
  workforceHeadcount: number
  industrialEmployment: number
  industrialProduction: number
  capacityUtilization: number | null
  exportContribution: number
  domesticSales: number
  imports: number
  bySector: Array<{
    sector: string
    employment: number
    production: number
    exports: number
    domesticSales: number
    imports: number
    capacityUtilization: number | null
  }>
}

export interface PmoPrivatizationPotentialView {
  pipelineCount: number
  blockedCount: number
  completedMilestones: number
  cases: Array<{
    id: string
    organizationLabel: string
    sector: string
    stage: string
    status: string
    blocker?: string
    potentialValueNote: string
  }>
  potentialValueNote: string
}

export interface PmoLoansView {
  totalOutstanding: number
  loanCount: number
  byLenderCategory: Record<
    | typeof LENDER_CATEGORY.GOVERNMENT
    | typeof LENDER_CATEGORY.BANK
    | typeof LENDER_CATEGORY.FOREIGN
    | typeof LENDER_CATEGORY.ADB
    | typeof LENDER_CATEGORY.WORLD_BANK
    | typeof LENDER_CATEGORY.CHINA,
    number
  >
}

export interface PmoStrategicIndicator {
  id: string
  label: string
  value: string
  period: string
  trendLabel: string
  trendDirection: 'up' | 'down' | 'flat'
  definition: string
  route: string
}

function periodId(filter?: PmoFilter) {
  return filter?.reportingPeriodId ?? 'period-fy2027'
}

function orgProvince(orgId: string): string {
  return (
    db.locations.find((l) => l.organizationId === orgId && l.kind === 'head_office')
      ?.province ??
    db.locations.find((l) => l.organizationId === orgId)?.province ??
    ''
  )
}

function filterOrgs(filter?: PmoFilter) {
  let orgs = [...db.organizations]
  if (filter?.sector) orgs = orgs.filter((o) => o.sector === filter.sector)
  if (filter?.province) {
    orgs = orgs.filter((o) => orgProvince(o.id) === filter.province)
  }
  return orgs
}

/** Provisional: paid-up capital × government ownership % */
function governmentCapital(org: { paidUpCapitalPkr?: number; governmentOwnershipPct: number }) {
  return (org.paidUpCapitalPkr ?? 0) * (org.governmentOwnershipPct / 100)
}

function financeFor(orgId: string, reportingPeriodId: string) {
  return db.financialMetrics.find(
    (f) => f.organizationId === orgId && f.reportingPeriodId === reportingPeriodId,
  )
}

function industrialFor(orgId: string, reportingPeriodId: string) {
  return db.industrialPerformance.find(
    (i) => i.organizationId === orgId && i.reportingPeriodId === reportingPeriodId,
  )
}

function workforceCount(orgId: string) {
  return db.employees.filter((e) => e.organizationId === orgId).length
}

function soeCountByShareholding(orgIds: Set<string>): PmoShareholdingCounts {
  const withGovernment = new Set<string>()
  const withPrivate = new Set<string>()
  const withForeign = new Set<string>()
  const withProvincial = new Set<string>()

  for (const line of db.ownershipLines) {
    if (!orgIds.has(line.organizationId) || line.percentage <= 0) continue
    if (line.category === SHAREHOLDER_CATEGORY.GOVERNMENT) withGovernment.add(line.organizationId)
    if (line.category === SHAREHOLDER_CATEGORY.PRIVATE) withPrivate.add(line.organizationId)
    if (line.category === SHAREHOLDER_CATEGORY.FOREIGN) withForeign.add(line.organizationId)
    if (line.category === SHAREHOLDER_CATEGORY.PROVINCIAL_GOVERNMENT) {
      withProvincial.add(line.organizationId)
    }
  }

  return {
    government: withGovernment.size,
    private: withPrivate.size,
    foreign: withForeign.size,
    provincialGovernment: withProvincial.size,
  }
}

const CAPITAL_DEFINITION =
  'Government capital employed (provisional) = sum of SOE paid-up capital × government ownership %. Formal MoF definition pending stakeholder confirmation.'

const FISCAL_NOTE =
  'Fiscal burden components shown separately. Not combined into one official figure — methodology provisional.'

export interface PmoPortalService {
  getFilterOptions(): Promise<{
    sectors: string[]
    provinces: string[]
    periods: Array<{ id: string; label: string }>
  }>
  getNationalOverview(filter?: PmoFilter): Promise<PmoNationalOverview>
  getGovernmentCapital(filter?: PmoFilter): Promise<PmoCapitalView>
  getMarketVsBook(filter?: PmoFilter): Promise<PmoMarketBookView>
  getFiscalBurden(filter?: PmoFilter): Promise<PmoFiscalBurdenView>
  getContingentLiabilities(filter?: PmoFilter): Promise<PmoContingentLiabilitiesView>
  getLandBank(filter?: PmoFilter): Promise<PmoLandBankView>
  getEmploymentIndustrial(filter?: PmoFilter): Promise<PmoEmploymentIndustrialView>
  getPrivatizationPotential(filter?: PmoFilter): Promise<PmoPrivatizationPotentialView>
  getLoansSummary(filter?: PmoFilter): Promise<PmoLoansView>
  getStrategicIndicators(filter?: PmoFilter): Promise<PmoStrategicIndicator[]>
}

export const mockPmoPortalService: PmoPortalService = {
  async getFilterOptions() {
    const sectors = [...new Set(db.organizations.map((o) => o.sector))].sort()
    const provinces = [...new Set(db.locations.map((l) => l.province).filter(Boolean))].sort()
    const periods = db.reportingPeriods
      .filter((p) => p.type === 'annual')
      .sort((a, b) => a.startDate.localeCompare(b.startDate))
      .map((p) => ({ id: p.id, label: p.label }))
    return simulateLatency({ sectors, provinces, periods })
  },

  async getNationalOverview(filter) {
    const reportingPeriodId = periodId(filter)
    const orgs = filterOrgs(filter)
    const orgIds = new Set(orgs.map((o) => o.id))

    let governmentCapitalEmployed = 0
    let subsidies = 0
    let losses = 0
    let debt = 0
    let industrialOutput = 0
    let exportContribution = 0
    let industrialEmployment = 0

    for (const org of orgs) {
      governmentCapitalEmployed += governmentCapital(org)
      const fin = financeFor(org.id, reportingPeriodId)
      subsidies += fin?.subsidies ?? 0
      debt += fin?.totalDebt ?? 0
      if (fin && fin.profitOrLoss < 0) losses += Math.abs(fin.profitOrLoss)
      const ind = industrialFor(org.id, reportingPeriodId)
      industrialOutput += ind?.actualProduction ?? 0
      exportContribution += ind?.exports ?? 0
      industrialEmployment += ind?.employment ?? 0
    }

    let guarantees = 0
    for (const g of db.guarantees) {
      if (orgIds.has(g.organizationId)) guarantees += g.exposure
    }

    const assets = db.assets.filter((a) => orgIds.has(a.organizationId))
    const workforceHeadcount = db.employees.filter((e) => orgIds.has(e.organizationId)).length
    const employment = Math.max(workforceHeadcount, industrialEmployment)

    const pipelineCount = db.privatizationCases.filter(
      (c) => orgIds.has(c.organizationId) && c.status !== 'completed',
    ).length

    return simulateLatency({
      asOf: DEMO_AS_OF_DATE,
      reportingPeriodId,
      soeCount: orgs.length,
      soeCountByShareholding: soeCountByShareholding(orgIds),
      governmentCapitalEmployed,
      aggregateAssetBookValue: assets.reduce((s, a) => s + (a.bookValue ?? 0), 0),
      aggregateAssetMarketValue: assets.reduce((s, a) => s + (a.marketValue ?? 0), 0),
      fiscalBurdenComponents: { subsidies, guarantees, losses, debt },
      employment,
      industrialOutput,
      exportContribution,
      privatizationPipelineCount: pipelineCount,
      governmentCapitalDefinition: CAPITAL_DEFINITION,
      fiscalBurdenNote: FISCAL_NOTE,
      isPrototypeMethodology: true,
    } satisfies PmoNationalOverview)
  },

  async getGovernmentCapital(filter) {
    const reportingPeriodId = periodId(filter)
    const orgs = filterOrgs(filter)
    let governmentCapitalEmployed = 0
    let profitOrLoss = 0
    const bySoe: PmoSoeRow[] = []
    const sectorMap = new Map<string, PmoSectorRow>()

    for (const org of orgs) {
      const cap = governmentCapital(org)
      governmentCapitalEmployed += cap
      const fin = financeFor(org.id, reportingPeriodId)
      const ind = industrialFor(org.id, reportingPeriodId)
      const pl = fin?.profitOrLoss ?? 0
      profitOrLoss += pl
      const guarantees = db.guarantees
        .filter((g) => g.organizationId === org.id)
        .reduce((s, g) => s + g.exposure, 0)
      const assetsBook = db.assets
        .filter((a) => a.organizationId === org.id)
        .reduce((s, a) => s + (a.bookValue ?? 0), 0)
      const emp = ind?.employment ?? workforceCount(org.id)
      const exports = ind?.exports ?? 0

      bySoe.push({
        organizationId: org.id,
        abbreviation: org.abbreviation,
        name: org.name,
        sector: org.sector,
        province: orgProvince(org.id),
        governmentCapital: cap,
        profitOrLoss: pl,
        debt: fin?.totalDebt ?? 0,
        subsidies: fin?.subsidies ?? 0,
        guarantees,
        employment: emp,
        exports,
        route: `/pmo/capital?soe=${org.id}`,
      })

      const sector = sectorMap.get(org.sector) ?? {
        sector: org.sector,
        soeCount: 0,
        governmentCapital: 0,
        debt: 0,
        subsidies: 0,
        employment: 0,
        exports: 0,
        assetBookValue: 0,
      }
      sector.soeCount += 1
      sector.governmentCapital += cap
      sector.debt += fin?.totalDebt ?? 0
      sector.subsidies += fin?.subsidies ?? 0
      sector.employment += emp
      sector.exports += exports
      sector.assetBookValue += assetsBook
      sectorMap.set(org.sector, sector)
    }

    const periods = db.reportingPeriods
      .filter((p) => p.type === 'annual')
      .sort((a, b) => a.startDate.localeCompare(b.startDate))
      .slice(-5)

    const trend = periods.map((p) => {
      let capital = 0
      let pl = 0
      for (const org of orgs) {
        capital += governmentCapital(org)
        pl += financeFor(org.id, p.id)?.profitOrLoss ?? 0
      }
      return { periodId: p.id, label: p.label, capital, profitOrLoss: pl }
    })

    const returnOnCapitalPct =
      governmentCapitalEmployed > 0
        ? (profitOrLoss / governmentCapitalEmployed) * 100
        : null

    bySoe.sort((a, b) => b.governmentCapital - a.governmentCapital)

    return simulateLatency({
      governmentCapitalEmployed,
      definition: CAPITAL_DEFINITION,
      returnOnCapitalPct,
      returnDefinition:
        'Return indicator (provisional) = period portfolio P/L ÷ government capital employed. Not a statutory ROE.',
      trend,
      bySector: [...sectorMap.values()].sort((a, b) => b.governmentCapital - a.governmentCapital),
      bySoe,
    } satisfies PmoCapitalView)
  },

  async getMarketVsBook(filter) {
    const orgs = filterOrgs(filter)
    const orgIds = new Set(orgs.map((o) => o.id))
    const assets = db.assets.filter((a) => orgIds.has(a.organizationId))
    const aggregateBookValue = assets.reduce((s, a) => s + (a.bookValue ?? 0), 0)
    const aggregateMarketValue = assets.reduce((s, a) => s + (a.marketValue ?? 0), 0)
    const assetsWithoutValuation = assets.filter(
      (a) => a.bookValue == null || a.marketValue == null,
    ).length
    const land = assets.filter((a) => a.assetType === ASSET_TYPE.LAND)

    const sectorMap = new Map<string, { bookValue: number; marketValue: number }>()
    for (const org of orgs) {
      const orgAssets = assets.filter((a) => a.organizationId === org.id)
      const row = sectorMap.get(org.sector) ?? { bookValue: 0, marketValue: 0 }
      row.bookValue += orgAssets.reduce((s, a) => s + (a.bookValue ?? 0), 0)
      row.marketValue += orgAssets.reduce((s, a) => s + (a.marketValue ?? 0), 0)
      sectorMap.set(org.sector, row)
    }

    return simulateLatency({
      aggregateBookValue,
      aggregateMarketValue,
      variance: aggregateMarketValue - aggregateBookValue,
      assetsWithoutValuation,
      landBookValue: land.reduce((s, a) => s + (a.bookValue ?? 0), 0),
      landMarketValue: land.reduce((s, a) => s + (a.marketValue ?? 0), 0),
      bySector: [...sectorMap.entries()]
        .map(([sector, v]) => ({
          sector,
          bookValue: v.bookValue,
          marketValue: v.marketValue,
          variance: v.marketValue - v.bookValue,
        }))
        .sort((a, b) => b.variance - a.variance),
    } satisfies PmoMarketBookView)
  },

  async getFiscalBurden(filter) {
    const reportingPeriodId = periodId(filter)
    const orgs = filterOrgs(filter)
    const orgIds = new Set(orgs.map((o) => o.id))
    let subsidies = 0
    let losses = 0
    let debt = 0
    let grants = 0
    let guarantees = 0
    let annualBudget = 0
    let workingCapital = 0
    let payables = 0
    let totalAssets = 0
    let financialStatementsCount = 0
    const sectorMap = new Map<
      string,
      { subsidies: number; debt: number; losses: number; guarantees: number }
    >()

    for (const org of orgs) {
      const fin = financeFor(org.id, reportingPeriodId)
      const g = db.guarantees
        .filter((x) => x.organizationId === org.id)
        .reduce((s, x) => s + x.exposure, 0)
      const sub = fin?.subsidies ?? 0
      const d = fin?.totalDebt ?? 0
      const loss = fin && fin.profitOrLoss < 0 ? Math.abs(fin.profitOrLoss) : 0
      subsidies += sub
      debt += d
      losses += loss
      guarantees += g
      if (fin) financialStatementsCount += 1
      annualBudget += fin?.annualBudget ?? 0
      workingCapital += fin?.workingCapital ?? 0
      payables += fin?.payables ?? 0
      totalAssets += fin?.totalAssets ?? 0
      grants += db.grants
        .filter((x) => x.organizationId === org.id)
        .reduce((s, x) => s + x.amount, 0)

      const row = sectorMap.get(org.sector) ?? {
        subsidies: 0,
        debt: 0,
        losses: 0,
        guarantees: 0,
      }
      row.subsidies += sub
      row.debt += d
      row.losses += loss
      row.guarantees += g
      sectorMap.set(org.sector, row)
    }

    void orgIds
    const periods = db.reportingPeriods
      .filter((p) => p.type === 'annual')
      .sort((a, b) => a.startDate.localeCompare(b.startDate))
      .slice(-5)

    const trend = periods.map((p) => {
      let s = 0
      let d = 0
      let l = 0
      let g = 0
      for (const org of orgs) {
        const fin = financeFor(org.id, p.id)
        s += fin?.subsidies ?? 0
        d += fin?.totalDebt ?? 0
        if (fin && fin.profitOrLoss < 0) l += Math.abs(fin.profitOrLoss)
        g += db.guarantees
          .filter((x) => x.organizationId === org.id)
          .reduce((sum, x) => sum + x.exposure, 0)
      }
      return { periodId: p.id, label: p.label, subsidies: s, debt: d, losses: l, guarantees: g }
    })

    return simulateLatency({
      subsidies,
      guarantees,
      losses,
      debt,
      grants,
      annualBudget,
      workingCapital,
      payables,
      debtRatio: calcDebtRatio({ totalDebt: debt, totalAssets }),
      financialStatementsCount,
      note: FISCAL_NOTE,
      isCombinedOfficialNumber: false,
      trend,
      bySector: [...sectorMap.entries()]
        .map(([sector, v]) => ({ sector, ...v }))
        .sort((a, b) => b.subsidies + b.debt - (a.subsidies + a.debt)),
    } satisfies PmoFiscalBurdenView)
  },

  async getContingentLiabilities(filter) {
    const reportingPeriodId = periodId(filter)
    const orgs = filterOrgs(filter)
    let guaranteeExposure = 0
    let debt = 0
    let actualExpenditureProxy = 0
    const bySoe = orgs.map((org) => {
      const g = db.guarantees
        .filter((x) => x.organizationId === org.id)
        .reduce((s, x) => s + x.exposure, 0)
      const fin = financeFor(org.id, reportingPeriodId)
      guaranteeExposure += g
      debt += fin?.totalDebt ?? 0
      actualExpenditureProxy += fin?.subsidies ?? 0
      return {
        organizationId: org.id,
        abbreviation: org.abbreviation,
        guarantees: g,
        debt: fin?.totalDebt ?? 0,
        subsidies: fin?.subsidies ?? 0,
      }
    })
    bySoe.sort((a, b) => b.guarantees - a.guarantees)

    return simulateLatency({
      guaranteeExposure,
      otherModeledExposure: 0,
      actualExpenditureProxy,
      debt,
      distinctionNote:
        'Guarantees = contingent exposure. Subsidies = actual expenditure proxy. Debt = outstanding borrowings. Shown separately (provisional).',
      bySoe: bySoe.filter((r) => r.guarantees > 0 || r.debt > 0),
    } satisfies PmoContingentLiabilitiesView)
  },

  async getLandBank(filter) {
    const orgs = filterOrgs(filter)
    const orgIds = new Set(orgs.map((o) => o.id))
    let land = db.assets.filter(
      (a) => orgIds.has(a.organizationId) && a.assetType === ASSET_TYPE.LAND,
    )
    if (filter?.province) {
      land = land.filter((a) => a.province === filter.province)
    }

    const sumAcres = (rows: typeof land) =>
      rows.reduce((s, a) => s + (a.areaAcres ?? 0), 0)

    const industrial = land.filter(
      (a) => a.useClassification === LAND_USE_CLASS.INDUSTRIAL,
    )
    const commercial = land.filter(
      (a) => a.useClassification === LAND_USE_CLASS.COMMERCIAL,
    )
    const residential = land.filter(
      (a) => a.useClassification === LAND_USE_CLASS.RESIDENTIAL,
    )
    const agricultural = land.filter(
      (a) => a.useClassification === LAND_USE_CLASS.AGRICULTURAL,
    )
    const vacantByOccupancy = land.filter(
      (a) => a.occupancyStatus === ASSET_OCCUPANCY.VACANT,
    )
    const occupiedByOccupancy = land.filter(
      (a) => a.occupancyStatus === ASSET_OCCUPANCY.OCCUPIED,
    )
    const vacant = land.filter(
      (a) =>
        a.occupancyStatus === ASSET_OCCUPANCY.VACANT ||
        a.useClassification === LAND_USE_CLASS.UNUSED,
    )
    /** Provisional: clear encroachment + not under active litigation */
    const unencumbered = land.filter(
      (a) =>
        (a.encroachmentStatus === ENCROACHMENT_STATUS.CLEAR || !a.encroachmentStatus) &&
        a.litigationStatus !== ASSET_LITIGATION_STATUS.ACTIVE,
    )

    const byProvinceMap = new Map<
      string,
      { acres: number; marketValue: number; parcelCount: number }
    >()
    for (const a of land) {
      const prov = a.province || 'Unspecified'
      const row = byProvinceMap.get(prov) ?? { acres: 0, marketValue: 0, parcelCount: 0 }
      row.acres += a.areaAcres ?? 0
      row.marketValue += a.marketValue ?? 0
      row.parcelCount += 1
      byProvinceMap.set(prov, row)
    }

    return simulateLatency({
      totalLandAreaAcres: sumAcres(land),
      vacantAcres: sumAcres(vacantByOccupancy),
      occupiedAcres: sumAcres(occupiedByOccupancy),
      industrialLandAcres: sumAcres(industrial),
      commercialLandAcres: sumAcres(commercial),
      residentialLandAcres: sumAcres(residential),
      agriculturalLandAcres: sumAcres(agricultural),
      vacantUnusedAcres: sumAcres(vacant),
      unencumberedAcres: sumAcres(unencumbered),
      marketValue: land.reduce((s, a) => s + (a.marketValue ?? 0), 0),
      bookValue: land.reduce((s, a) => s + (a.bookValue ?? 0), 0),
      parcelCount: land.length,
      byProvince: [...byProvinceMap.entries()]
        .map(([province, v]) => ({ province, ...v }))
        .sort((a, b) => b.acres - a.acres),
      unencumberedDefinition:
        'Unencumbered (provisional) = land parcels without active litigation and without encroached/suspected status.',
      gisNote:
        'Open National Asset Map (/pmo/map) for geographic decision-support. Province totals below remain the aggregate land-bank view.',
    } satisfies PmoLandBankView)
  },

  async getEmploymentIndustrial(filter) {
    const reportingPeriodId = periodId(filter)
    const orgs = filterOrgs(filter)
    const orgIds = new Set(orgs.map((o) => o.id))
    const workforceHeadcount = db.employees.filter((e) => orgIds.has(e.organizationId)).length

    let industrialEmployment = 0
    let industrialProduction = 0
    let exportContribution = 0
    let domesticSales = 0
    let imports = 0
    let utilSum = 0
    let utilN = 0
    const sectorMap = new Map<
      string,
      {
        employment: number
        production: number
        exports: number
        domesticSales: number
        imports: number
        utilSum: number
        utilN: number
      }
    >()

    for (const org of orgs) {
      const ind = industrialFor(org.id, reportingPeriodId)
      const emp = ind?.employment ?? workforceCount(org.id)
      const prod = ind?.actualProduction ?? 0
      const exp = ind?.exports ?? 0
      const dom = ind?.domesticSales ?? 0
      const imp = ind?.imports ?? 0
      industrialEmployment += ind?.employment ?? 0
      industrialProduction += prod
      exportContribution += exp
      domesticSales += dom
      imports += imp
      if (ind?.capacityUtilization != null) {
        utilSum += ind.capacityUtilization
        utilN += 1
      }
      const row = sectorMap.get(org.sector) ?? {
        employment: 0,
        production: 0,
        exports: 0,
        domesticSales: 0,
        imports: 0,
        utilSum: 0,
        utilN: 0,
      }
      row.employment += emp
      row.production += prod
      row.exports += exp
      row.domesticSales += dom
      row.imports += imp
      if (ind?.capacityUtilization != null) {
        row.utilSum += ind.capacityUtilization
        row.utilN += 1
      }
      sectorMap.set(org.sector, row)
    }

    return simulateLatency({
      totalEmployment: Math.max(workforceHeadcount, industrialEmployment),
      workforceHeadcount,
      industrialEmployment,
      industrialProduction,
      capacityUtilization: utilN ? utilSum / utilN : null,
      exportContribution,
      domesticSales,
      imports,
      bySector: [...sectorMap.entries()]
        .map(([sector, v]) => ({
          sector,
          employment: v.employment,
          production: v.production,
          exports: v.exports,
          domesticSales: v.domesticSales,
          imports: v.imports,
          capacityUtilization: v.utilN ? v.utilSum / v.utilN : null,
        }))
        .sort((a, b) => b.domesticSales - a.domesticSales),
    } satisfies PmoEmploymentIndustrialView)
  },

  async getPrivatizationPotential(filter) {
    const orgs = filterOrgs(filter)
    const orgIds = new Set(orgs.map((o) => o.id))
    const orgById = new Map(orgs.map((o) => [o.id, o]))
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
        organizationLabel: orgById.get(c.organizationId)?.abbreviation ?? c.organizationId,
        sector: orgById.get(c.organizationId)?.sector ?? '—',
        stage: c.currentStage,
        status: c.status,
        blocker: c.blocker,
        potentialValueNote:
          'Potential proceeds not authoritative — prototype placeholder only',
      })),
      potentialValueNote:
        'No speculative transaction proceeds are presented as official. Dummy pipeline staging only.',
    } satisfies PmoPrivatizationPotentialView)
  },

  async getLoansSummary(filter) {
    const orgs = filterOrgs(filter)
    const orgIds = new Set(orgs.map((o) => o.id))
    const loans = db.loans.filter((loan) => orgIds.has(loan.organizationId))
    const byLenderCategory = {
      [LENDER_CATEGORY.GOVERNMENT]: 0,
      [LENDER_CATEGORY.BANK]: 0,
      [LENDER_CATEGORY.FOREIGN]: 0,
      [LENDER_CATEGORY.ADB]: 0,
      [LENDER_CATEGORY.WORLD_BANK]: 0,
      [LENDER_CATEGORY.CHINA]: 0,
    }

    let totalOutstanding = 0
    for (const loan of loans) {
      totalOutstanding += loan.outstanding
      if (loan.lenderCategory in byLenderCategory) {
        byLenderCategory[loan.lenderCategory as keyof typeof byLenderCategory] +=
          loan.outstanding
      }
    }

    return simulateLatency({
      totalOutstanding,
      loanCount: loans.length,
      byLenderCategory,
    } satisfies PmoLoansView)
  },

  async getStrategicIndicators(filter) {
    const overview = await mockPmoPortalService.getNationalOverview(filter)
    const capital = await mockPmoPortalService.getGovernmentCapital(filter)
    const market = await mockPmoPortalService.getMarketVsBook(filter)
    const land = await mockPmoPortalService.getLandBank(filter)
    const industrial = await mockPmoPortalService.getEmploymentIndustrial(filter)
    const priv = await mockPmoPortalService.getPrivatizationPotential(filter)
    const periodLabel =
      db.reportingPeriods.find((p) => p.id === overview.reportingPeriodId)?.label ??
      overview.reportingPeriodId

    const prior = capital.trend.length >= 2 ? capital.trend[capital.trend.length - 2] : null
    const latest = capital.trend[capital.trend.length - 1]
    const capitalTrend =
      !prior || !latest
        ? { label: 'No prior period', direction: 'flat' as const }
        : latest.capital === prior.capital
          ? { label: 'Flat vs prior year', direction: 'flat' as const }
          : latest.capital > prior.capital
            ? { label: 'Up vs prior year', direction: 'up' as const }
            : { label: 'Down vs prior year', direction: 'down' as const }

    const burdenTotal =
      overview.fiscalBurdenComponents.subsidies +
      overview.fiscalBurdenComponents.debt +
      overview.fiscalBurdenComponents.guarantees

    const fmt = (n: number) => n.toLocaleString('en-PK', { maximumFractionDigits: 0 })

    const indicators: PmoStrategicIndicator[] = [
      {
        id: 'ind-soes',
        label: 'SOEs in portfolio',
        value: String(overview.soeCount),
        period: periodLabel,
        trendLabel: 'Stock count',
        trendDirection: 'flat',
        definition: 'Count of SOEs in the MoIP portfolio under current filters.',
        route: '/pmo/capital',
      },
      {
        id: 'ind-capital',
        label: 'Government capital employed',
        value: formatCurrencyPkr(overview.governmentCapitalEmployed),
        period: periodLabel,
        trendLabel: capitalTrend.label,
        trendDirection: capitalTrend.direction,
        definition: overview.governmentCapitalDefinition,
        route: '/pmo/capital',
      },
      {
        id: 'ind-assets',
        label: 'Aggregate asset market value',
        value: formatCurrencyPkr(market.aggregateMarketValue),
        period: periodLabel,
        trendLabel: `Variance ${formatCurrencyPkr(market.variance)}`,
        trendDirection: market.variance >= 0 ? 'up' : 'down',
        definition: 'Sum of asset market values from asset fixtures. Book value shown on land/asset view.',
        route: '/pmo/land-bank',
      },
      {
        id: 'ind-fiscal',
        label: 'Fiscal components (not combined)',
        value: formatCurrencyPkr(burdenTotal),
        period: periodLabel,
        trendLabel: 'Subsidies + debt + guarantees',
        trendDirection: 'flat',
        definition: overview.fiscalBurdenNote,
        route: '/pmo/fiscal-burden',
      },
      {
        id: 'ind-employment',
        label: 'Employment',
        value: fmt(overview.employment),
        period: periodLabel,
        trendLabel: 'Workforce / industrial',
        trendDirection: 'flat',
        definition:
          'Max of workforce headcount and industrial employment reported for the period (provisional dual-source).',
        route: '/pmo/employment-exports',
      },
      {
        id: 'ind-exports',
        label: 'Export contribution',
        value: formatCurrencyPkr(overview.exportContribution),
        period: periodLabel,
        trendLabel:
          industrial.capacityUtilization == null
            ? 'Capacity n/a'
            : `Cap. util. ${industrial.capacityUtilization.toFixed(0)}%`,
        trendDirection: 'flat',
        definition: 'Sum of industrial export values for the reporting period.',
        route: '/pmo/employment-exports',
      },
      {
        id: 'ind-land',
        label: 'Land bank area',
        value: `${land.totalLandAreaAcres.toFixed(0)} acres`,
        period: periodLabel,
        trendLabel: `${land.parcelCount} parcels`,
        trendDirection: 'flat',
        definition: 'Sum of land asset areaAcres in portfolio fixtures.',
        route: '/pmo/land-bank',
      },
      {
        id: 'ind-priv',
        label: 'Privatization pipeline',
        value: String(priv.pipelineCount),
        period: periodLabel,
        trendLabel: `${priv.blockedCount} blocked`,
        trendDirection: priv.blockedCount > 0 ? 'down' : 'flat',
        definition: priv.potentialValueNote,
        route: '/pmo/privatization',
      },
    ]

    return simulateLatency(indicators)
  },
}
