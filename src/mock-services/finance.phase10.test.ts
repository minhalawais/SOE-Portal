import { beforeEach, describe, expect, it } from 'vitest'
import { resetMockDb } from '@/mock-data'
import { resetMockRuntime } from '@/mock-data/runtime'
import {
  mockFinanceService,
  mockFiscalExposureService,
  mockIndustrialService,
  mockLoanService,
} from '@/mock-services'
import { calcCapacityUtilization } from '@/workflow/financeKpis'

describe('Phase 10 financial & fiscal services', () => {
  beforeEach(() => {
    resetMockDb()
    resetMockRuntime()
  })

  it('builds intelligence with ratios and history', async () => {
    const intel = await mockFinanceService.getIntelligence('org-psm', 'period-fy2027')
    expect(intel.history.length).toBeGreaterThanOrEqual(3)
    expect(intel.ratios.currentRatio).not.toBeNull()
    expect(intel.budgetLines.length).toBeGreaterThan(0)
  })

  it('exposes repayment schedules and loan taxonomy', async () => {
    const loans = await mockLoanService.getLoans('org-psm')
    expect(loans.length).toBeGreaterThan(0)
    expect(loans[0]?.lenderCategory).toBeTruthy()
    const reps = await mockLoanService.getRepayments(loans[0]!.id)
    expect(reps.length).toBeGreaterThan(0)
  })

  it('labels government exposure as prototype methodology', async () => {
    const exp = await mockFiscalExposureService.getExposureSummary('org-psm', 'period-fy2027')
    expect(exp.isPrototypeMethodology).toBe(true)
    expect(exp.outstandingLoans).toBeGreaterThan(0)
  })

  it('recalculates capacity utilization on industrial update', async () => {
    const row = await mockIndustrialService.getPerformanceRow('org-psm', 'period-fy2027')
    const updated = await mockIndustrialService.updatePerformance(row.id, {
      installedCapacity: 1000,
      actualProduction: 250,
    })
    expect(updated.capacityUtilization).toBe(
      calcCapacityUtilization({ installedCapacity: 1000, actualProduction: 250 }),
    )
  })

  it('updates the complete industrial performance entry row', async () => {
    const row = await mockIndustrialService.getPerformanceRow('org-psm', 'period-fy2027')
    const updated = await mockIndustrialService.updatePerformance(row.id, {
      installedCapacity: 2000,
      actualProduction: 1500,
      capacityUnit: 'tons',
      exports: 123_000_000,
      imports: 45_000_000,
      domesticSales: 678_000_000,
      employment: 2400,
      energyConsumption: 32_000,
      energyUnit: 'MWh',
      carbonEmissions: 9100,
      carbonUnit: 'tCO2e',
    })

    expect(updated).toMatchObject({
      installedCapacity: 2000,
      actualProduction: 1500,
      capacityUnit: 'tons',
      exports: 123_000_000,
      imports: 45_000_000,
      domesticSales: 678_000_000,
      employment: 2400,
      energyConsumption: 32_000,
      energyUnit: 'MWh',
      carbonEmissions: 9100,
      carbonUnit: 'tCO2e',
    })
    expect(updated.capacityUtilization).toBe(
      calcCapacityUtilization({ installedCapacity: 2000, actualProduction: 1500 }),
    )
  })

  it('rejects negative industrial performance values', async () => {
    const row = await mockIndustrialService.getPerformanceRow('org-psm', 'period-fy2027')
    await expect(
      mockIndustrialService.updatePerformance(row.id, { exports: -1 }),
    ).rejects.toMatchObject({ code: 'VALIDATION' })
  })

  it('rejects negative outstanding loan updates', async () => {
    const loans = await mockLoanService.getLoans('org-psm')
    await expect(
      mockLoanService.updateLoan(loans[0]!.id, { outstanding: -1 }),
    ).rejects.toMatchObject({ code: 'VALIDATION' })
  })
})
