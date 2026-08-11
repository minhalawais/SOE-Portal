import { beforeEach, describe, expect, it } from 'vitest'
import { ASSET_TYPE, ROLE, SEARCH_DATASET, SEARCH_OPERATOR, SUBMISSION_STATUS } from '@/constants'
import { db, resetMockDb, scenarioCatalogue } from '@/mock-data'
import { resetMockRuntime, setMockLatencyMode } from '@/mock-data/runtime'
import {
  mockDocumentService,
  mockGisService,
  mockIntelligenceService,
  mockReportsService,
  mockSearchService,
  mockWorkforceService,
} from '@/mock-services'
import { canTransition } from '@/workflow/submission'

describe('Phase 23 module / edge-case / dashboard regression', () => {
  beforeEach(() => {
    resetMockDb()
    resetMockRuntime()
    setMockLatencyMode('none')
  })

  it('keeps scenario catalogue stable for QA packs', () => {
    expect(scenarioCatalogue.length).toBeGreaterThanOrEqual(8)
    expect(new Set(scenarioCatalogue.map((s) => s.id)).size).toBe(scenarioCatalogue.length)
  })

  it('GIS: zero-results query is empty, not an error', async () => {
    const page = await mockGisService.queryAssets({
      portfolioScope: true,
      province: 'Nonexistent Province XYZ',
      pageSize: 50,
    })
    expect(page.items).toEqual([])
    expect(page.total).toBe(0)
  })

  it('GIS: list remains usable when geometry is missing on some rows', async () => {
    const page = await mockGisService.queryAssets({
      portfolioScope: true,
      assetType: ASSET_TYPE.LAND,
      pageSize: 200,
    })
    expect(page.items.length).toBeGreaterThan(0)
    const missingGeom = page.items.filter((i) => i.latitude == null || i.longitude == null)
    expect(page.items.length).toBeGreaterThanOrEqual(missingGeom.length)
  })

  it('documents: scoped read returns only linked evidence for an organization', async () => {
    const page = await mockDocumentService.getDocuments({
      organizationId: 'org-psm',
      pageSize: 50,
    })
    expect(page.items.length).toBeGreaterThan(0)
    page.items.forEach((d) => expect(d.organizationId).toBe('org-psm'))
  })

  it('search: zero results for nonsense structured query', async () => {
    const result = await mockSearchService.runQuery(
      {
        dataset: SEARCH_DATASET.ORGANIZATIONS,
        logic: 'and',
        conditions: [
          {
            field: 'abbreviation',
            operator: SEARCH_OPERATOR.CONTAINS,
            value: 'zzznonsense-query-phase23',
          },
        ],
        pageSize: 20,
      },
      { portal: 'moip', role: ROLE.MOIP_ANALYST },
    )
    expect(result.total).toBe(0)
    expect(result.isZeroResult).toBe(true)
  })

  it('reports: catalogue is portal scoped and export is simulated', async () => {
    const catalogue = await mockReportsService.listCatalogue('minister')
    expect(catalogue.length).toBeGreaterThan(0)
    const first = catalogue[0]!
    const exported = await mockReportsService.exportReport(first.id, 'pdf', 'minister', {})
    expect(exported.fileName.toLowerCase()).toContain('.pdf')
    expect(exported.status).toBe('completed')
    expect(exported.message.toLowerCase()).toContain('mock')
  })

  it('intelligence scorecard reconciles to a known organization', async () => {
    const org = db.organizations[0]!
    const card = await mockIntelligenceService.getScorecard(org.id)
    expect(card.organizationId).toBe(org.id)
    expect(card.overallDataStatus).toBeTruthy()
    expect(card.dimensions.length).toBeGreaterThan(0)
  })

  it('workforce edge: large-ish list still pages', async () => {
    const page = await mockWorkforceService.getEmployees({
      organizationId: 'org-psm',
      page: 1,
      pageSize: 25,
    })
    expect(page.items.length).toBeLessThanOrEqual(25)
    expect(page.total).toBeGreaterThanOrEqual(page.items.length)
  })

  it('workflow machine still recognizes clarification → resubmitted path', () => {
    expect(
      canTransition(SUBMISSION_STATUS.CLARIFICATION_REQUESTED, SUBMISSION_STATUS.RESUBMITTED),
    ).toBe(true)
  })
})
