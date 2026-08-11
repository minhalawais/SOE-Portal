import { beforeEach, describe, expect, it } from 'vitest'
import { ROLE, SOE_STATUS } from '@/constants'
import { db, resetMockDb } from '@/mock-data'
import { resetMockRuntime } from '@/mock-data/runtime'
import { mockMinisterPortalService } from '@/mock-services'
import { hasPermission, PERMISSION } from '@/permissions'

describe('Phase 16 Minister strategic intelligence', () => {
  beforeEach(() => {
    resetMockDb()
    resetMockRuntime()
  })

  it('builds executive overview with reconciled portfolio summary', async () => {
    const overview = await mockMinisterPortalService.getExecutiveOverview({
      reportingPeriodId: 'period-fy2027',
    })
    const s = overview.summary
    const orgCount = Object.values(s.soeCountByStatus).reduce((a, b) => a + b, 0)
    expect(orgCount).toBe(db.organizations.length)
    expect(s.profitableCount + s.lossMakingCount).toBeGreaterThan(0)
    expect(s.aggregateAssetBookValue).toBeGreaterThan(0)
    expect(s.isPrototypeMethodology).toBe(true)
    expect(overview.majorRisks.length).toBeGreaterThan(0)
    expect(overview.opportunities.length).toBeGreaterThan(0)
  })

  it('reconciles asset book value to fixture sum', async () => {
    const intel = await mockMinisterPortalService.getAssetIntelligence({
      reportingPeriodId: 'period-fy2027',
    })
    const expected = db.assets.reduce((s, a) => s + (a.bookValue ?? 0), 0)
    expect(intel.totalBookValue).toBe(expected)
  })

  it('filters portfolio health by sector and status', async () => {
    const sector = db.organizations[0]!.sector
    const page = await mockMinisterPortalService.getPortfolioHealth({
      reportingPeriodId: 'period-fy2027',
      sector,
      pageSize: 50,
    })
    expect(page.items.length).toBeGreaterThan(0)
    page.items.forEach((r) => expect(r.sector).toBe(sector))

    const statusPage = await mockMinisterPortalService.getPortfolioHealth({
      reportingPeriodId: 'period-fy2027',
      status: SOE_STATUS.UNDER_PRIVATIZATION,
      pageSize: 50,
    })
    statusPage.items.forEach((r) => expect(r.status).toBe(SOE_STATUS.UNDER_PRIVATIZATION))
  })

  it('sorts health concern before healthy', async () => {
    const page = await mockMinisterPortalService.getPortfolioHealth({
      reportingPeriodId: 'period-fy2027',
      pageSize: 50,
    })
    const order = { concern: 0, watch: 1, healthy: 2 }
    for (let i = 1; i < page.items.length; i++) {
      expect(order[page.items[i - 1]!.healthBand]).toBeLessThanOrEqual(
        order[page.items[i]!.healthBand],
      )
    }
  })

  it('returns fiscal trend and SOE breakdown', async () => {
    const fiscal = await mockMinisterPortalService.getFiscalExposure({
      reportingPeriodId: 'period-fy2027',
    })
    expect(fiscal.bySoe.length).toBe(db.organizations.length)
    expect(fiscal.trend.length).toBeGreaterThan(0)
    const debtSum = fiscal.bySoe.reduce((s, r) => s + r.debt, 0)
    expect(debtSum).toBe(fiscal.summary.aggregateDebt)
  })

  it('surfaces governance, audit/legal, privatization, industrial summaries', async () => {
    const gov = await mockMinisterPortalService.getGovernanceRisk({
      reportingPeriodId: 'period-fy2027',
    })
    expect(gov.boardVacancies + gov.expiringWithin90 + gov.expiredAppointments).toBeGreaterThanOrEqual(0)

    const audit = await mockMinisterPortalService.getAuditLegalRisk({
      reportingPeriodId: 'period-fy2027',
    })
    expect(audit.openParaCount).toBeGreaterThanOrEqual(0)

    const priv = await mockMinisterPortalService.getPrivatizationSummary({
      reportingPeriodId: 'period-fy2027',
    })
    expect(priv.cases.length).toBeGreaterThan(0)
    expect(priv.cases[0]!.potentialValueNote).toMatch(/prototype/i)

    const industrial = await mockMinisterPortalService.getIndustrialSummary({
      reportingPeriodId: 'period-fy2027',
    })
    expect(industrial.employment).toBeGreaterThanOrEqual(0)
  })

  it('lists strategic opportunities with prototype flag', async () => {
    const page = await mockMinisterPortalService.getStrategicOpportunities({
      reportingPeriodId: 'period-fy2027',
      pageSize: 50,
    })
    expect(page.items.length).toBeGreaterThan(0)
    page.items.forEach((o) => expect(o.isPrototypeSignal).toBe(true))
  })

  it('provides lineage drill links for an SOE', async () => {
    const links = await mockMinisterPortalService.getLineageLinks('org-psm')
    expect(links.length).toBeGreaterThan(0)
    expect(links.some((l) => l.route.includes('/minister/'))).toBe(true)
  })

  it('Minister remains read-only without edit/approve permissions', () => {
    expect(hasPermission(ROLE.MINISTER, PERMISSION.EXECUTIVE_DASHBOARD_READ)).toBe(true)
    expect(hasPermission(ROLE.MINISTER, PERMISSION.PORTFOLIO_READ)).toBe(true)
    expect(hasPermission(ROLE.MINISTER, PERMISSION.FINANCE_EDIT)).toBe(false)
    expect(hasPermission(ROLE.MINISTER, PERMISSION.SUBMISSION_APPROVE)).toBe(false)
  })
})
