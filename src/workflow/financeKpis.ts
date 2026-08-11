/**
 * Central provisional KPI definitions for Phase 10.
 * Formulas are prototype methodology — not stakeholder-approved official definitions.
 */
import type { FinancialMetric, IndustrialPerformance, KpiDefinition } from '@/types/domain'

export const KPI_IDS = {
  CURRENT_RATIO: 'kpi-current-ratio',
  DEBT_RATIO: 'kpi-debt-ratio',
  ROA: 'kpi-roa',
  ROE: 'kpi-roe',
  CAPACITY_UTILIZATION: 'kpi-capacity-utilization',
  BUDGET_VARIANCE: 'kpi-budget-variance',
  YOY_CHANGE: 'kpi-yoy-change',
  PROFIT_MARGIN: 'kpi-profit-margin',
} as const

export const KPI_DEFINITIONS: KpiDefinition[] = [
  {
    id: KPI_IDS.CURRENT_RATIO,
    name: 'Current Ratio',
    unit: 'x',
    formula: 'Current Assets / Current Liabilities',
    sourceFields: ['currentAssets', 'currentLiabilities'],
    format: 'ratio',
    nullHandling: 'Return null when current liabilities is missing or zero',
    formulaNote: 'Provisional liquidity ratio for prototype comparison',
    provisional: true,
  },
  {
    id: KPI_IDS.DEBT_RATIO,
    name: 'Debt Ratio',
    unit: '%',
    formula: 'Total Debt / Total Assets × 100',
    sourceFields: ['totalDebt', 'totalAssets'],
    format: 'percent',
    nullHandling: 'Return null when total assets is missing or zero',
    formulaNote: 'Provisional leverage indicator',
    provisional: true,
  },
  {
    id: KPI_IDS.ROA,
    name: 'Return on Assets (ROA)',
    unit: '%',
    formula: 'Profit or Loss / Total Assets × 100',
    sourceFields: ['profitOrLoss', 'totalAssets'],
    format: 'percent',
    nullHandling: 'Return null when total assets is missing or zero',
    formulaNote: 'Provisional profitability vs asset base',
    provisional: true,
  },
  {
    id: KPI_IDS.ROE,
    name: 'Return on Equity (ROE)',
    unit: '%',
    formula: 'Profit or Loss / Equity × 100',
    sourceFields: ['profitOrLoss', 'equity'],
    format: 'percent',
    nullHandling: 'Return null when equity is missing or zero',
    formulaNote: 'Provisional return on equity',
    provisional: true,
  },
  {
    id: KPI_IDS.CAPACITY_UTILIZATION,
    name: 'Capacity Utilization',
    unit: '%',
    formula: 'Actual Production / Installed Capacity × 100',
    sourceFields: ['actualProduction', 'installedCapacity'],
    format: 'percent',
    nullHandling: 'Return null when installed capacity is zero or missing',
    formulaNote: 'Aligned with industrial performance field; zero capacity is not a ratio',
    provisional: true,
  },
  {
    id: KPI_IDS.BUDGET_VARIANCE,
    name: 'Budget Variance',
    unit: 'PKR / %',
    formula: 'Actual − Budget; Variance % = (Actual − Budget) / Budget × 100',
    sourceFields: ['actual', 'budget'],
    format: 'percent',
    nullHandling: 'Return null variance % when budget is zero',
    formulaNote: 'Positive variance means actual above budget',
    provisional: true,
  },
  {
    id: KPI_IDS.YOY_CHANGE,
    name: 'Year-over-Year Change',
    unit: '%',
    formula: '(Current − Previous) / |Previous| × 100',
    sourceFields: ['currentValue', 'previousValue'],
    format: 'percent',
    nullHandling: 'Return null when previous value is zero or missing',
    formulaNote: 'Uses absolute previous for sign-stable percent change',
    provisional: true,
  },
  {
    id: KPI_IDS.PROFIT_MARGIN,
    name: 'Profit Margin',
    unit: '%',
    formula: 'Profit or Loss / Revenue × 100',
    sourceFields: ['profitOrLoss', 'revenue'],
    format: 'percent',
    nullHandling: 'Return null when revenue is zero or missing',
    formulaNote: 'Provisional margin for trend views',
    provisional: true,
  },
]

export function getKpiDefinition(id: string): KpiDefinition | undefined {
  return KPI_DEFINITIONS.find((k) => k.id === id)
}

function safeDiv(numerator: number, denominator: number): number | null {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator === 0) {
    return null
  }
  return numerator / denominator
}

export function calcCurrentRatio(m: Pick<FinancialMetric, 'currentAssets' | 'currentLiabilities'>): number | null {
  if (m.currentAssets == null || m.currentLiabilities == null) return null
  return safeDiv(m.currentAssets, m.currentLiabilities)
}

export function calcDebtRatio(m: Pick<FinancialMetric, 'totalDebt' | 'totalAssets'>): number | null {
  if (m.totalDebt == null || m.totalAssets == null) return null
  const r = safeDiv(m.totalDebt, m.totalAssets)
  return r == null ? null : r * 100
}

export function calcRoa(m: Pick<FinancialMetric, 'profitOrLoss' | 'totalAssets'>): number | null {
  if (m.totalAssets == null) return null
  const r = safeDiv(m.profitOrLoss, m.totalAssets)
  return r == null ? null : r * 100
}

export function calcRoe(m: Pick<FinancialMetric, 'profitOrLoss' | 'equity'>): number | null {
  if (m.equity == null) return null
  const r = safeDiv(m.profitOrLoss, m.equity)
  return r == null ? null : r * 100
}

export function calcProfitMargin(m: Pick<FinancialMetric, 'profitOrLoss' | 'revenue'>): number | null {
  const r = safeDiv(m.profitOrLoss, m.revenue)
  return r == null ? null : r * 100
}

export function calcCapacityUtilization(
  row: Pick<IndustrialPerformance, 'actualProduction' | 'installedCapacity'>,
): number | null {
  const r = safeDiv(row.actualProduction, row.installedCapacity)
  return r == null ? null : Math.round(r * 1000) / 10
}

export function calcBudgetVariance(budget: number, actual: number): {
  variance: number
  variancePct: number | null
} {
  const variance = actual - budget
  return {
    variance,
    variancePct: budget === 0 ? null : (variance / budget) * 100,
  }
}

export function calcYoyChange(current: number, previous: number | null | undefined): number | null {
  if (previous == null || previous === 0) return null
  return ((current - previous) / Math.abs(previous)) * 100
}

export function formatRatio(value: number | null, digits = 2): string {
  if (value == null || !Number.isFinite(value)) return '—'
  return value.toFixed(digits)
}

export function formatPct(value: number | null, digits = 1): string {
  if (value == null || !Number.isFinite(value)) return '—'
  return `${value.toFixed(digits)}%`
}

export function consecutiveLossYears(
  metrics: Array<Pick<FinancialMetric, 'reportingPeriodId' | 'profitOrLoss'>>,
  periodOrder: string[],
): number {
  let streak = 0
  for (let i = periodOrder.length - 1; i >= 0; i--) {
    const pid = periodOrder[i]
    const row = metrics.find((m) => m.reportingPeriodId === pid)
    if (!row || row.profitOrLoss >= 0) break
    streak += 1
  }
  return streak
}

export function computeFinancialRatios(m: FinancialMetric) {
  return {
    currentRatio: calcCurrentRatio(m),
    debtRatio: calcDebtRatio(m),
    roa: calcRoa(m),
    roe: calcRoe(m),
    profitMargin: calcProfitMargin(m),
  }
}
