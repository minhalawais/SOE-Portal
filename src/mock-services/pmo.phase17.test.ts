import { beforeEach, describe, expect, it } from 'vitest'
import { ASSET_TYPE, ROLE } from '@/constants'
import { db, resetMockDb } from '@/mock-data'
import { resetMockRuntime } from '@/mock-data/runtime'
import { mockPmoPortalService } from '@/mock-services'
import { hasPermission, PERMISSION } from '@/permissions'

describe('Phase 17 PMO strategic government view', () => {
  beforeEach(() => {
    resetMockDb()
    resetMockRuntime()
  })

  it('builds national overview reconciled to fixture counts', async () => {
    const overview = await mockPmoPortalService.getNationalOverview({
      reportingPeriodId: 'period-fy2027',
    })
    expect(overview.soeCount).toBe(db.organizations.length)
    expect(overview.governmentCapitalEmployed).toBeGreaterThan(0)
    expect(overview.isPrototypeMethodology).toBe(true)
    expect(overview.governmentCapitalDefinition).toMatch(/provisional/i)
    expect(overview.fiscalBurdenNote).toMatch(/separately/i)
  })

  it('reconciles asset book/market totals to fixtures', async () => {
    const market = await mockPmoPortalService.getMarketVsBook({
      reportingPeriodId: 'period-fy2027',
    })
    const expectedBook = db.assets.reduce((s, a) => s + (a.bookValue ?? 0), 0)
    const expectedMarket = db.assets.reduce((s, a) => s + (a.marketValue ?? 0), 0)
    expect(market.aggregateBookValue).toBe(expectedBook)
    expect(market.aggregateMarketValue).toBe(expectedMarket)
    expect(market.variance).toBe(expectedMarket - expectedBook)
  })

  it('reconciles land bank acres to land asset fixtures', async () => {
    const land = await mockPmoPortalService.getLandBank({
      reportingPeriodId: 'period-fy2027',
    })
    const expectedAcres = db.assets
      .filter((a) => a.assetType === ASSET_TYPE.LAND)
      .reduce((s, a) => s + (a.areaAcres ?? 0), 0)
    expect(land.totalLandAreaAcres).toBe(expectedAcres)
    expect(land.parcelCount).toBe(
      db.assets.filter((a) => a.assetType === ASSET_TYPE.LAND).length,
    )
  })

  it('reconciles employment headcount to workforce fixtures', async () => {
    const emp = await mockPmoPortalService.getEmploymentIndustrial({
      reportingPeriodId: 'period-fy2027',
    })
    expect(emp.workforceHeadcount).toBe(db.employees.length)
    expect(emp.totalEmployment).toBeGreaterThanOrEqual(emp.workforceHeadcount)
    expect(emp.imports).toBe(
      db.industrialPerformance
        .filter((row) => row.reportingPeriodId === 'period-fy2027')
        .reduce((sum, row) => sum + row.imports, 0),
    )
  })

  it('filters by sector and period', async () => {
    const sector = db.organizations[0]!.sector
    const overview = await mockPmoPortalService.getNationalOverview({
      reportingPeriodId: 'period-fy2027',
      sector,
    })
    const expected = db.organizations.filter((o) => o.sector === sector).length
    expect(overview.soeCount).toBe(expected)

    const capital = await mockPmoPortalService.getGovernmentCapital({
      reportingPeriodId: 'period-fy2026',
      sector,
    })
    capital.bySoe.forEach((r) => expect(r.sector).toBe(sector))
  })

  it('keeps fiscal burden components separate', async () => {
    const burden = await mockPmoPortalService.getFiscalBurden({
      reportingPeriodId: 'period-fy2027',
    })
    expect(burden.isCombinedOfficialNumber).toBe(false)
    expect(burden.subsidies + burden.debt + burden.guarantees + burden.losses).toBeGreaterThan(0)

    const contingent = await mockPmoPortalService.getContingentLiabilities({
      reportingPeriodId: 'period-fy2027',
    })
    expect(contingent.distinctionNote).toMatch(/contingent/i)
  })

  it('lists privatization potential without authoritative proceeds', async () => {
    const priv = await mockPmoPortalService.getPrivatizationPotential({
      reportingPeriodId: 'period-fy2027',
    })
    expect(priv.cases.length).toBeGreaterThan(0)
    expect(priv.potentialValueNote).toMatch(/prototype|not authoritative|speculative/i)
  })

  it('returns strategic indicators with definitions and drill routes', async () => {
    const indicators = await mockPmoPortalService.getStrategicIndicators({
      reportingPeriodId: 'period-fy2027',
    })
    expect(indicators.length).toBeGreaterThanOrEqual(6)
    indicators.forEach((i) => {
      expect(i.definition.length).toBeGreaterThan(10)
      expect(i.route.startsWith('/pmo/')).toBe(true)
    })
  })

  it('PMO remains read-only without operational permissions', () => {
    expect(hasPermission(ROLE.PMO, PERMISSION.EXECUTIVE_DASHBOARD_READ)).toBe(true)
    expect(hasPermission(ROLE.PMO, PERMISSION.PORTFOLIO_READ)).toBe(true)
    expect(hasPermission(ROLE.PMO, PERMISSION.FINANCE_EDIT)).toBe(false)
    expect(hasPermission(ROLE.PMO, PERMISSION.SUBMISSION_REVIEW)).toBe(false)
    expect(hasPermission(ROLE.PMO, PERMISSION.SUBMISSION_APPROVE)).toBe(false)
  })
})
