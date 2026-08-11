import { beforeEach, describe, expect, it } from 'vitest'
import {
  REPORT_EXPORT_FORMAT,
  REPORT_ID,
} from '@/constants'
import { db, resetMockDb } from '@/mock-data'
import { resetMockRuntime } from '@/mock-data/runtime'
import { mockReportsService } from '@/mock-services'
import { formatCurrencyPkr } from '@/utils'
import { REPORT_DEFINITIONS } from '@/workflow/reportCatalogue'

describe('Phase 21 reports and executive briefings', () => {
  beforeEach(() => {
    resetMockDb()
    resetMockRuntime()
  })

  it('lists catalogue with all 12 report types for MoIP', async () => {
    const items = await mockReportsService.listCatalogue('moip')
    expect(items.length).toBe(REPORT_DEFINITIONS.filter((r) => r.portals.includes('moip')).length)
    const ids = new Set(items.map((i) => i.id))
    expect(ids.has(REPORT_ID.SOE_PROFILE)).toBe(true)
    expect(ids.has(REPORT_ID.ANNUAL_PORTFOLIO)).toBe(true)
    expect(ids.has(REPORT_ID.MINISTER_BRIEF)).toBe(true)
    expect(ids.has(REPORT_ID.CABINET_BRIEF)).toBe(true)
  })

  it('scopes SOE catalogue and profile to own organization', async () => {
    const items = await mockReportsService.listCatalogue('soe')
    expect(items.every((i) => i.portals.includes('soe'))).toBe(true)
    expect(items.some((i) => i.id === REPORT_ID.CABINET_BRIEF)).toBe(false)

    const preview = await mockReportsService.getPreview(REPORT_ID.SOE_PROFILE, 'soe', {
      organizationId: 'org-psm',
      reportingPeriodId: 'period-fy2027',
    })
    expect(preview.scopeLabel).toContain('PSM')
    expect(preview.sections.some((s) => s.id === 'identity')).toBe(true)
    const bookKpi = preview.sections
      .find((s) => s.id === 'assets')
      ?.kpis?.find((k) => k.label === 'Asset count')
    const expected = db.assets.filter((a) => a.organizationId === 'org-psm').length
    expect(bookKpi?.value).toBe(String(expected))
  })

  it('reconciles fiscal exposure debt to finance fixtures', async () => {
    const period = 'period-fy2027'
    const preview = await mockReportsService.getPreview(REPORT_ID.FISCAL_EXPOSURE, 'moip', {
      reportingPeriodId: period,
      organizationId: 'org-pasdec',
    })
    const fin = db.financialMetrics.find(
      (f) => f.organizationId === 'org-pasdec' && f.reportingPeriodId === period,
    )
    expect(fin).toBeTruthy()
    const debtKpi = preview.sections
      .find((s) => s.id === 'debt')
      ?.kpis?.find((k) => k.label === 'Total debt')
    expect(debtKpi?.value).toBe(formatCurrencyPkr(fin!.totalDebt ?? 0))
  })

  it('builds minister brief concisely with attention section', async () => {
    const preview = await mockReportsService.getPreview(REPORT_ID.MINISTER_BRIEF, 'minister', {
      reportingPeriodId: 'period-fy2027',
    })
    expect(preview.briefStyle).toBe(true)
    expect(preview.sections.map((s) => s.id)).toContain('attention')
    expect(preview.sections.length).toBeLessThanOrEqual(8)
  })

  it('builds cabinet brief with issue / evidence / implication structure', async () => {
    const preview = await mockReportsService.getPreview(REPORT_ID.CABINET_BRIEF, 'pmo', {
      reportingPeriodId: 'period-fy2027',
    })
    const block = preview.sections.find((s) => s.id === 'cabinet')
    expect(block?.issues?.length).toBeGreaterThanOrEqual(2)
    expect(block?.issues?.[0]?.decisionPlaceholder).toMatch(/placeholder/i)
    expect(preview.methodologyNote.toLowerCase()).toContain('prototype')
  })

  it('labels period and data status on every preview', async () => {
    const preview = await mockReportsService.getPreview(REPORT_ID.ANNUAL_PORTFOLIO, 'moip', {
      reportingPeriodId: 'period-fy2027',
    })
    expect(preview.periodLabel).toBeTruthy()
    expect(preview.generatedAt).toBeTruthy()
    expect(preview.dataStatus).toBeTruthy()
    expect(preview.dataStatusNote).toBeTruthy()
  })

  it('returns empty asset section for impossible province filter', async () => {
    const preview = await mockReportsService.getPreview(REPORT_ID.ASSET, 'moip', {
      province: '__none__',
    })
    const summary = preview.sections.find((s) => s.id === 'summary')
    expect(summary?.empty).toBe(true)
  })

  it('blocks report access outside portal allow-list', async () => {
    await expect(
      mockReportsService.getPreview(REPORT_ID.CABINET_BRIEF, 'soe', {
        organizationId: 'org-psm',
      }),
    ).rejects.toThrow(/not available/i)
  })

  it('simulates PDF and Excel export without real files', async () => {
    const pdf = await mockReportsService.exportReport(
      REPORT_ID.AUDIT,
      REPORT_EXPORT_FORMAT.PDF,
      'moip',
      { reportingPeriodId: 'period-fy2027' },
    )
    expect(pdf.status).toBe('completed')
    expect(pdf.fileName.endsWith('.pdf')).toBe(true)
    expect(pdf.message.toLowerCase()).toContain('mock')

    const xlsx = await mockReportsService.exportReport(
      REPORT_ID.AUDIT,
      REPORT_EXPORT_FORMAT.EXCEL,
      'secretary',
      {},
    )
    expect(xlsx.fileName.endsWith('.xlsx')).toBe(true)
  })

  it('groups catalogue by report group', async () => {
    const grouped = await mockReportsService.getCatalogueGrouped('minister')
    expect(grouped.some((g) => g.label === 'Executive')).toBe(true)
    expect(grouped.every((g) => g.items.length > 0)).toBe(true)
  })
})
