import { SUBMISSION_STATUS } from '@/constants'
import { db } from '@/mock-data'
import type {
  BudgetLine,
  FinancialMetric,
  GovernmentExposureSummary,
  ReportingPeriod,
  Submission,
} from '@/types/domain'
import { AppError, simulateLatency, simulateMutation } from '@/utils'
import {
  calcYoyChange,
  computeFinancialRatios,
  consecutiveLossYears,
} from '@/workflow/financeKpis'

export interface PeriodComparisonRow {
  metric: string
  values: Record<string, number | null>
  changePct: number | null
}

export interface FinanceIntelligenceBundle {
  current: FinancialMetric
  previous: FinancialMetric | null
  history: FinancialMetric[]
  periods: ReportingPeriod[]
  ratios: ReturnType<typeof computeFinancialRatios>
  previousRatios: ReturnType<typeof computeFinancialRatios> | null
  yoy: {
    revenue: number | null
    operatingExpenses: number | null
    capex: number | null
    profitOrLoss: number | null
    subsidies: number | null
  }
  consecutiveLossYears: number
  budgetLines: BudgetLine[]
}

export interface FinanceService {
  getReportingPeriods(): Promise<ReportingPeriod[]>
  getFinancials(organizationId?: string, reportingPeriodId?: string): Promise<FinancialMetric[]>
  getFinancialMetric(organizationId: string, reportingPeriodId: string): Promise<FinancialMetric>
  saveFinancialDraft(id: string, patch: Partial<FinancialMetric>): Promise<FinancialMetric>
  updateFinancialMetric(id: string, patch: Partial<FinancialMetric>): Promise<FinancialMetric>
  getSubmissions(organizationId: string): Promise<Submission[]>
  getIntelligence(
    organizationId: string,
    reportingPeriodId: string,
  ): Promise<FinanceIntelligenceBundle>
  getBudgetLines(organizationId: string, reportingPeriodId: string): Promise<BudgetLine[]>
  getComparison(
    organizationId: string,
    periodIds: string[],
  ): Promise<{ periods: ReportingPeriod[]; rows: PeriodComparisonRow[] }>
  getPortfolioFinanceSummary(reportingPeriodId: string): Promise<
    Array<{
      organizationId: string
      abbreviation: string
      revenue: number
      profitOrLoss: number
      subsidies: number
      totalDebt: number
      status: string
      consecutiveLossYears: number
    }>
  >
}

function annualPeriodOrder(): string[] {
  return db.reportingPeriods
    .filter((p) => p.type === 'annual')
    .sort((a, b) => a.startDate.localeCompare(b.startDate))
    .map((p) => p.id)
}

export const mockFinanceService: FinanceService = {
  async getReportingPeriods() {
    return simulateLatency([...db.reportingPeriods])
  },
  async getFinancials(organizationId, reportingPeriodId) {
    let items = [...db.financialMetrics]
    if (organizationId) items = items.filter((f) => f.organizationId === organizationId)
    if (reportingPeriodId) items = items.filter((f) => f.reportingPeriodId === reportingPeriodId)
    return simulateLatency(items)
  },
  async getFinancialMetric(organizationId, reportingPeriodId) {
    const row = db.financialMetrics.find(
      (f) =>
        f.organizationId === organizationId &&
        f.reportingPeriodId === reportingPeriodId,
    )
    if (!row) throw new AppError('Financial metric not found', 'NOT_FOUND')
    return simulateLatency(row)
  },
  async saveFinancialDraft(id, patch) {
    return mockFinanceService.updateFinancialMetric(id, {
      ...patch,
      status: SUBMISSION_STATUS.DRAFT,
    })
  },
  async updateFinancialMetric(id, patch) {
    const idx = db.financialMetrics.findIndex((f) => f.id === id)
    if (idx < 0) throw new AppError('Financial metric not found', 'NOT_FOUND')
    if (patch.revenue !== undefined && patch.revenue < 0) {
      throw new AppError('Revenue cannot be negative', 'VALIDATION')
    }
    if (db.financialMetrics[idx].status === SUBMISSION_STATUS.LOCKED) {
      throw new AppError('Locked financial records are immutable', 'VALIDATION')
    }
    db.financialMetrics[idx] = { ...db.financialMetrics[idx], ...patch, id }
    return simulateMutation(db.financialMetrics[idx])
  },
  async getSubmissions(organizationId) {
    return simulateLatency(
      db.submissions.filter((s) => s.organizationId === organizationId),
    )
  },
  async getIntelligence(organizationId, reportingPeriodId) {
    const order = annualPeriodOrder()
    const history = db.financialMetrics
      .filter((f) => f.organizationId === organizationId && order.includes(f.reportingPeriodId))
      .sort(
        (a, b) =>
          order.indexOf(a.reportingPeriodId) - order.indexOf(b.reportingPeriodId),
      )
    const current = history.find((f) => f.reportingPeriodId === reportingPeriodId)
    if (!current) {
      // quarterly context: fall back to matching period or throw
      const row = db.financialMetrics.find(
        (f) =>
          f.organizationId === organizationId && f.reportingPeriodId === reportingPeriodId,
      )
      if (!row) throw new AppError('Financial metric not found', 'NOT_FOUND')
      return simulateLatency({
        current: row,
        previous: null,
        history: [row],
        periods: db.reportingPeriods.filter((p) => p.id === reportingPeriodId),
        ratios: computeFinancialRatios(row),
        previousRatios: null,
        yoy: {
          revenue: null,
          operatingExpenses: null,
          capex: null,
          profitOrLoss: null,
          subsidies: null,
        },
        consecutiveLossYears: consecutiveLossYears([row], [reportingPeriodId]),
        budgetLines: db.budgetLines.filter(
          (b) =>
            b.organizationId === organizationId && b.reportingPeriodId === reportingPeriodId,
        ),
      })
    }
    const idx = order.indexOf(reportingPeriodId)
    const prevId = idx > 0 ? order[idx - 1] : null
    const previous = prevId
      ? history.find((f) => f.reportingPeriodId === prevId) ?? null
      : null
    return simulateLatency({
      current,
      previous,
      history,
      periods: db.reportingPeriods.filter((p) => order.includes(p.id)),
      ratios: computeFinancialRatios(current),
      previousRatios: previous ? computeFinancialRatios(previous) : null,
      yoy: {
        revenue: calcYoyChange(current.revenue, previous?.revenue),
        operatingExpenses: calcYoyChange(
          current.operatingExpenses,
          previous?.operatingExpenses,
        ),
        capex: calcYoyChange(current.capex, previous?.capex),
        profitOrLoss: calcYoyChange(current.profitOrLoss, previous?.profitOrLoss),
        subsidies: calcYoyChange(current.subsidies, previous?.subsidies),
      },
      consecutiveLossYears: consecutiveLossYears(history, order.slice(0, idx + 1)),
      budgetLines: db.budgetLines.filter(
        (b) =>
          b.organizationId === organizationId && b.reportingPeriodId === reportingPeriodId,
      ),
    })
  },
  async getBudgetLines(organizationId, reportingPeriodId) {
    return simulateLatency(
      db.budgetLines.filter(
        (b) =>
          b.organizationId === organizationId && b.reportingPeriodId === reportingPeriodId,
      ),
    )
  },
  async getComparison(organizationId, periodIds) {
    const periods = db.reportingPeriods.filter((p) => periodIds.includes(p.id))
    const metrics = db.financialMetrics.filter(
      (f) => f.organizationId === organizationId && periodIds.includes(f.reportingPeriodId),
    )
    const industrial = db.industrialPerformance.filter(
      (i) => i.organizationId === organizationId && periodIds.includes(i.reportingPeriodId),
    )
    const sorted = [...periodIds].sort(
      (a, b) =>
        (db.reportingPeriods.find((p) => p.id === a)?.startDate ?? '').localeCompare(
          db.reportingPeriods.find((p) => p.id === b)?.startDate ?? '',
        ),
    )
    const first = sorted[0]
    const last = sorted[sorted.length - 1]
    function valuesFor(getter: (pid: string) => number | null): Record<string, number | null> {
      const out: Record<string, number | null> = {}
      for (const pid of sorted) out[pid] = getter(pid)
      return out
    }
    const rows: PeriodComparisonRow[] = [
      {
        metric: 'Revenue',
        values: valuesFor(
          (pid) => metrics.find((m) => m.reportingPeriodId === pid)?.revenue ?? null,
        ),
        changePct: calcYoyChange(
          metrics.find((m) => m.reportingPeriodId === last)?.revenue ?? 0,
          metrics.find((m) => m.reportingPeriodId === first)?.revenue,
        ),
      },
      {
        metric: 'Profit / Loss',
        values: valuesFor(
          (pid) => metrics.find((m) => m.reportingPeriodId === pid)?.profitOrLoss ?? null,
        ),
        changePct: calcYoyChange(
          metrics.find((m) => m.reportingPeriodId === last)?.profitOrLoss ?? 0,
          metrics.find((m) => m.reportingPeriodId === first)?.profitOrLoss,
        ),
      },
      {
        metric: 'Subsidy',
        values: valuesFor(
          (pid) => metrics.find((m) => m.reportingPeriodId === pid)?.subsidies ?? null,
        ),
        changePct: calcYoyChange(
          metrics.find((m) => m.reportingPeriodId === last)?.subsidies ?? 0,
          metrics.find((m) => m.reportingPeriodId === first)?.subsidies,
        ),
      },
      {
        metric: 'Capacity Utilization %',
        values: valuesFor(
          (pid) =>
            industrial.find((i) => i.reportingPeriodId === pid)?.capacityUtilization ?? null,
        ),
        changePct: calcYoyChange(
          industrial.find((i) => i.reportingPeriodId === last)?.capacityUtilization ?? 0,
          industrial.find((i) => i.reportingPeriodId === first)?.capacityUtilization,
        ),
      },
    ]
    return simulateLatency({ periods: periods.sort((a, b) => a.startDate.localeCompare(b.startDate)), rows })
  },
  async getPortfolioFinanceSummary(reportingPeriodId) {
    const order = annualPeriodOrder()
    const idx = order.indexOf(reportingPeriodId)
    const slice = idx >= 0 ? order.slice(0, idx + 1) : [reportingPeriodId]
    const rows = db.organizations.map((org) => {
      const m = db.financialMetrics.find(
        (f) => f.organizationId === org.id && f.reportingPeriodId === reportingPeriodId,
      )
      const history = db.financialMetrics.filter(
        (f) => f.organizationId === org.id && slice.includes(f.reportingPeriodId),
      )
      return {
        organizationId: org.id,
        abbreviation: org.abbreviation,
        revenue: m?.revenue ?? 0,
        profitOrLoss: m?.profitOrLoss ?? 0,
        subsidies: m?.subsidies ?? 0,
        totalDebt: m?.totalDebt ?? 0,
        status: m?.status ?? '—',
        consecutiveLossYears: consecutiveLossYears(history, slice),
      }
    })
    return simulateLatency(rows)
  },
}

export interface FiscalExposureService {
  getExposureSummary(organizationId?: string, reportingPeriodId?: string): Promise<GovernmentExposureSummary>
  getPortfolioExposure(reportingPeriodId: string): Promise<
    Array<GovernmentExposureSummary & { organizationId: string; abbreviation: string }>
  >
}

export const mockFiscalExposureService: FiscalExposureService = {
  async getExposureSummary(organizationId, reportingPeriodId) {
    const periodId = reportingPeriodId ?? 'period-fy2027'
    const orgs = organizationId
      ? db.organizations.filter((o) => o.id === organizationId)
      : db.organizations
    let totalBorrowings = 0
    let outstandingLoans = 0
    let guarantees = 0
    let subsidies = 0
    let grants = 0
    let persistentLossYears = 0
    const order = annualPeriodOrder()

    for (const org of orgs) {
      const orgLoans = db.loans.filter((l) => l.organizationId === org.id)
      totalBorrowings += orgLoans.reduce((s, l) => s + l.principal, 0)
      outstandingLoans += orgLoans.reduce((s, l) => s + l.outstanding, 0)
      guarantees += db.guarantees
        .filter((g) => g.organizationId === org.id)
        .reduce((s, g) => s + g.exposure, 0)
      const fin = db.financialMetrics.find(
        (f) => f.organizationId === org.id && f.reportingPeriodId === periodId,
      )
      subsidies += fin?.subsidies ?? 0
      grants += db.grants
        .filter((g) => g.organizationId === org.id)
        .reduce((s, g) => s + g.amount, 0)
      const history = db.financialMetrics.filter(
        (f) => f.organizationId === org.id && order.includes(f.reportingPeriodId),
      )
      persistentLossYears = Math.max(
        persistentLossYears,
        consecutiveLossYears(history, order),
      )
    }

    return simulateLatency({
      organizationId,
      totalBorrowings,
      outstandingLoans,
      guarantees,
      subsidies,
      grants,
      persistentLossYears,
      isPrototypeMethodology: true as const,
    })
  },
  async getPortfolioExposure(reportingPeriodId) {
    const rows = await Promise.all(
      db.organizations.map(async (org) => {
        const summary = await mockFiscalExposureService.getExposureSummary(
          org.id,
          reportingPeriodId,
        )
        return { ...summary, organizationId: org.id, abbreviation: org.abbreviation }
      }),
    )
    return simulateLatency(rows)
  },
}
