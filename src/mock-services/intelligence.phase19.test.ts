import { beforeEach, describe, expect, it } from 'vitest'
import {
  BENCHMARK_METRIC,
  INTEL_DATA_STATUS,
  RISK_STATUS,
  SCORECARD_DIMENSION,
} from '@/constants'
import { db, resetMockDb } from '@/mock-data'
import { resetMockRuntime } from '@/mock-data/runtime'
import { mockIntelligenceService } from '@/mock-services'
import { SCORECARD_DIMENSION_ORDER } from '@/workflow/intelligenceRegistry'

describe('Phase 19 intelligence, risk and benchmarking', () => {
  beforeEach(() => {
    resetMockDb()
    resetMockRuntime()
  })

  it('builds scorecard with six dimensions and prototype methodology', async () => {
    const card = await mockIntelligenceService.getScorecard('org-pidc')
    expect(card.isPrototypeMethodology).toBe(true)
    expect(card.dimensions).toHaveLength(SCORECARD_DIMENSION_ORDER.length)
    expect(card.dimensions.map((d) => d.dimension).sort()).toEqual(
      [...SCORECARD_DIMENSION_ORDER].sort(),
    )
    expect(card.overallScore == null || card.overallScore >= 0).toBe(true)
    const financial = card.dimensions.find(
      (d) => d.dimension === SCORECARD_DIMENSION.FINANCIAL,
    )
    expect(financial?.components.length).toBeGreaterThanOrEqual(3)
  })

  it('marks SMEDA operations as unavailable (insufficient industrial data)', async () => {
    const card = await mockIntelligenceService.getScorecard('org-smeda')
    const ops = card.dimensions.find((d) => d.dimension === SCORECARD_DIMENSION.OPERATIONS)
    expect(ops?.dataStatus).toBe(INTEL_DATA_STATUS.UNAVAILABLE)
    expect(ops?.score).toBeNull()
    // Composite excludes unavailable — may still score from other dims
    expect(card.overallDataStatus).not.toBe(INTEL_DATA_STATUS.AVAILABLE)
  })

  it('assigns elevated financial risk to loss-making SOE with explainability', async () => {
    const risk = await mockIntelligenceService.getRiskProfile('org-pitac')
    const financial = risk.cells.find((c) => c.dimension === 'financial')
    expect(financial).toBeTruthy()
    expect([RISK_STATUS.HIGH, RISK_STATUS.CRITICAL]).toContain(financial!.level)
    expect(financial!.reasons.length).toBeGreaterThan(0)
    expect(financial!.drivers[0]?.href).toContain('/moip/finance')
  })

  it('surfaces governance risk for NFC', async () => {
    const risk = await mockIntelligenceService.getRiskProfile('org-nfc')
    const gov = risk.cells.find((c) => c.dimension === 'governance')
    expect(gov).toBeTruthy()
    expect([RISK_STATUS.HIGH, RISK_STATUS.CRITICAL]).toContain(gov!.level)
  })

  it('builds heat map sorted by concern with all risk dimensions', async () => {
    const heat = await mockIntelligenceService.getHeatMap()
    expect(heat.length).toBe(db.organizations.length)
    for (let i = 1; i < heat.length; i++) {
      expect(heat[i - 1]!.concernRank).toBeGreaterThanOrEqual(heat[i]!.concernRank)
    }
    const row = heat[0]!
    expect(Object.keys(row.levels).length).toBe(6)
  })

  it('ranks benchmark metric and excludes unavailable from rank', async () => {
    const rows = await mockIntelligenceService.getBenchmark({
      metric: BENCHMARK_METRIC.ROA,
    })
    expect(rows.length).toBe(db.organizations.length)
    const ranked = rows.filter((r) => r.rank != null)
    expect(ranked.length).toBeGreaterThan(0)
    const ranks = ranked.map((r) => r.rank as number).sort((a, b) => a - b)
    expect(ranks[0]).toBe(1)
  })

  it('filters benchmark by sector peer group', async () => {
    const sector = db.organizations[0]!.sector
    const rows = await mockIntelligenceService.getBenchmark({
      peerGroup: 'sector',
      sector,
      metric: BENCHMARK_METRIC.DEBT,
    })
    expect(rows.length).toBeGreaterThan(0)
    rows.forEach((r) => expect(r.sector).toBe(sector))
  })

  it('emits early-warning consecutive-loss signals for loss-making SOEs', async () => {
    const signals = await mockIntelligenceService.getEarlyWarnings()
    expect(signals.some((s) => s.signalCode === 'consecutive_losses')).toBe(true)
    expect(signals.every((s) => s.isPrototypeRule)).toBe(true)
  })

  it('builds trend view without claiming causation', async () => {
    const trends = await mockIntelligenceService.getTrendView('org-tusdec')
    expect(trends.caveat.toLowerCase()).toContain('causation')
    const total =
      trends.deteriorating.length + trends.improving.length + trends.stable.length
    expect(total).toBeGreaterThan(0)
  })

  it('exposes indicator registry with provisional status', async () => {
    const registry = await mockIntelligenceService.getIndicatorRegistry()
    expect(registry.length).toBeGreaterThanOrEqual(6)
    expect(registry.every((i) => i.status === 'provisional')).toBe(true)
  })

  it('reconciles scorecard financial raw values to finance fixtures', async () => {
    const orgId = 'org-pasdec'
    const period = 'period-fy2027'
    const fin = db.financialMetrics.find(
      (f) => f.organizationId === orgId && f.reportingPeriodId === period,
    )
    expect(fin).toBeTruthy()
    const card = await mockIntelligenceService.getScorecard(orgId, {
      reportingPeriodId: period,
    })
    const subsidy = card.dimensions
      .find((d) => d.dimension === SCORECARD_DIMENSION.FINANCIAL)
      ?.components.find((c) => c.id === 'fin-subsidy')
    expect(subsidy?.rawDisplay).not.toBe('—')
    const expected = ((fin!.subsidies / fin!.revenue) * 100).toFixed(1) + '%'
    expect(subsidy?.rawDisplay).toBe(expected)
  })
})
