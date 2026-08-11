import { describe, expect, it } from 'vitest'
import {
  calcBudgetVariance,
  calcCapacityUtilization,
  calcCurrentRatio,
  calcDebtRatio,
  calcRoa,
  calcRoe,
  calcYoyChange,
  consecutiveLossYears,
  KPI_DEFINITIONS,
} from '@/workflow/financeKpis'

describe('Phase 10 finance KPIs', () => {
  it('defines required provisional KPIs', () => {
    const ids = new Set(KPI_DEFINITIONS.map((k) => k.id))
    expect(ids.has('kpi-current-ratio')).toBe(true)
    expect(ids.has('kpi-debt-ratio')).toBe(true)
    expect(ids.has('kpi-roa')).toBe(true)
    expect(ids.has('kpi-roe')).toBe(true)
    expect(ids.has('kpi-capacity-utilization')).toBe(true)
    expect(ids.has('kpi-budget-variance')).toBe(true)
    expect(ids.has('kpi-yoy-change')).toBe(true)
    expect(KPI_DEFINITIONS.every((k) => k.provisional === true)).toBe(true)
  })

  it('computes ratios and null-safe divisions', () => {
    expect(calcCurrentRatio({ currentAssets: 200, currentLiabilities: 100 })).toBe(2)
    expect(calcCurrentRatio({ currentAssets: 200, currentLiabilities: 0 })).toBeNull()
    expect(calcDebtRatio({ totalDebt: 40, totalAssets: 100 })).toBe(40)
    expect(calcRoa({ profitOrLoss: 10, totalAssets: 100 })).toBe(10)
    expect(calcRoe({ profitOrLoss: 20, equity: 100 })).toBe(20)
    expect(calcCapacityUtilization({ actualProduction: 50, installedCapacity: 0 })).toBeNull()
    expect(calcCapacityUtilization({ actualProduction: 50, installedCapacity: 100 })).toBe(50)
  })

  it('computes budget variance and YoY', () => {
    expect(calcBudgetVariance(100, 120)).toEqual({ variance: 20, variancePct: 20 })
    expect(calcBudgetVariance(0, 10).variancePct).toBeNull()
    expect(calcYoyChange(120, 100)).toBe(20)
    expect(calcYoyChange(100, 0)).toBeNull()
  })

  it('counts consecutive loss years from latest', () => {
    const order = ['a', 'b', 'c']
    const metrics = [
      { reportingPeriodId: 'a', profitOrLoss: -1 },
      { reportingPeriodId: 'b', profitOrLoss: -2 },
      { reportingPeriodId: 'c', profitOrLoss: -3 },
    ]
    expect(consecutiveLossYears(metrics, order)).toBe(3)
    expect(
      consecutiveLossYears(
        [
          { reportingPeriodId: 'a', profitOrLoss: -1 },
          { reportingPeriodId: 'b', profitOrLoss: 5 },
          { reportingPeriodId: 'c', profitOrLoss: -3 },
        ],
        order,
      ),
    ).toBe(1)
  })
})
