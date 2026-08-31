import { beforeEach, describe, expect, it } from 'vitest'
import { resetMockDb } from '@/mock-data/db'
import {
  mockPerformanceComparisonService,
  PERFORMANCE_METRICS,
} from '@/mock-services/performanceComparison.service'

describe('SOE performance comparison service', () => {
  beforeEach(() => resetMockDb())

  it('builds a trusted, multi-pillar scorecard from the latest closed period', async () => {
    const portfolio = await mockPerformanceComparisonService.getPortfolio()
    expect(portfolio.reportingPeriodLabel).toBe('FY2026')
    expect(portfolio.scorecards).toHaveLength(10)
    expect(PERFORMANCE_METRICS).toHaveLength(32)
    expect(portfolio.scorecards.every((row) => row.metrics.length === 32)).toBe(true)
    expect(portfolio.scorecards.every((row) => row.pillarScores.length === 8)).toBe(true)
    expect(portfolio.scorecards.every((row) => row.dataStatus === 'trusted')).toBe(true)
    expect(portfolio.scorecards.every((row) => row.coverage >= 65)).toBe(true)
  })

  it('includes workforce, assets, compliance, governance, litigation and fiscal performance pillars', () => {
    expect(new Set(PERFORMANCE_METRICS.map((metric) => metric.pillar))).toEqual(new Set([
      'financial',
      'workforce',
      'assets',
      'operational',
      'compliance',
      'governance',
      'litigation',
      'fiscal',
    ]))
    expect(PERFORMANCE_METRICS.map((metric) => metric.id)).toEqual(expect.arrayContaining([
      'workforce_retention',
      'asset_utilization',
      'compliance_rate',
      'board_health',
      'litigation_exposure',
      'overdue_obligation_rate',
    ]))
  })

  it('keeps submission completeness outside enterprise performance metrics', () => {
    expect(PERFORMANCE_METRICS.map((metric) => metric.id)).not.toContain('submission_completeness')
    expect(PERFORMANCE_METRICS.map((metric) => metric.label).join(' ').toLowerCase()).not.toContain('data entry')
  })

  it('uses peer cohorts and exposes peer medians without cross-cohort ranking', async () => {
    const portfolio = await mockPerformanceComparisonService.getPortfolio()
    const commercial = portfolio.scorecards.filter((row) => row.mandate === 'commercial')
    expect(commercial.length).toBeGreaterThanOrEqual(3)
    expect(commercial[0]?.metrics.some((metric) => metric.peerMedian != null)).toBe(true)
    expect(new Set(commercial.map((row) => row.peerGroup))).toEqual(new Set(['Commercial operators']))
  })

  it('does not double count consolidated subsidiaries', async () => {
    const standalone = await mockPerformanceComparisonService.getPortfolio({ scope: 'standalone' })
    const consolidated = await mockPerformanceComparisonService.getPortfolio({ scope: 'consolidated' })
    expect(consolidated.scorecards.length).toBeLessThan(standalone.scorecards.length)
    expect(consolidated.scorecards.some((row) => row.abbreviation === 'NFC Group')).toBe(true)
    expect(consolidated.scorecards.some((row) => row.abbreviation === 'NFML')).toBe(false)
  })

  it('marks open-period results provisional when reported data is requested', async () => {
    const portfolio = await mockPerformanceComparisonService.getPortfolio({
      reportingPeriodId: 'period-fy2027',
      dataMode: 'reported',
    })
    expect(portfolio.scorecards.some((row) => row.dataStatus === 'provisional')).toBe(true)
  })
})
