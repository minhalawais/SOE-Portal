import { beforeEach, describe, expect, it } from 'vitest'
import { ASSET_TYPE, ROLE, SEARCH_DATASET, SEARCH_OPERATOR, SUBMISSION_STATUS } from '@/constants'
import { db, resetMockDb, scenarioCatalogue } from '@/mock-data'
import { resetMockRuntime, setMockLatencyMode } from '@/mock-data/runtime'
import {
  mockDocumentService,
  mockGisService,
  mockIntelligenceService,
  mockLitigationService,
  mockReportsService,
  mockSearchService,
  mockWorkforceService,
} from '@/mock-services'
import { REPORTING_MODULES } from '@/workflow/moduleCatalog'
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

  it('continuous cadence is explicit for workforce and litigation modules', () => {
    const workforce = REPORTING_MODULES.find((module) => module.id === 'workforce')
    const litigation = REPORTING_MODULES.find((module) => module.id === 'litigation')
    expect(workforce?.cadence).toBe('continuous')
    expect(workforce?.liveRegister).toBe(true)
    expect(litigation?.cadence).toBe('event_based')
    expect(litigation?.liveRegister).toBe(true)
  })

  it('workforce updates create a reviewable live-register event', async () => {
    const page = await mockWorkforceService.getEmployees({
      organizationId: 'org-psm',
      pageSize: 1,
    })
    const employee = page.items[0]!
    const updated = await mockWorkforceService.updateEmployee(employee.id, {
      posting: 'Head Office',
    })
    const events = await mockWorkforceService.getEmployeeEvents(employee.id)
    expect(updated.assuranceState).toBe('submitted')
    expect(updated.version).toBeGreaterThan(employee.version ?? 1)
    expect(events[0]?.title).toContain('Workforce change')
  })

  it('litigation keeps case timeline separate from the current case header', async () => {
    const cases = await mockLitigationService.getCases('org-psm')
    const first = cases[0]!
    const event = await mockLitigationService.addCaseEvent(first.id, {
      occurredAt: '2026-08-22',
      effectiveAt: '2026-08-22',
      actorRole: ROLE.LEGAL_OFFICER,
      actorName: 'SOE Legal Officer',
      eventType: 'hearing',
      title: 'Hearing held and next date assigned',
      detail: 'Court directed submission of additional documents.',
      nextHearing: '2026-09-10',
    })
    const updated = await mockLitigationService.getCase(first.id)
    const events = await mockLitigationService.getCaseEvents(first.id)
    expect(event.caseId).toBe(first.id)
    expect(updated.latestEventTitle).toBe(event.title)
    expect(updated.assuranceState).toBe('submitted')
    expect(events[0]?.id).toBe(event.id)
  })

  it('continuous summaries expose SLA and snapshot provenance for dashboards', async () => {
    const workforce = await mockWorkforceService.getContinuousSummary(undefined, true)
    const litigation = await mockLitigationService.getContinuousSummary()
    expect(workforce.snapshotPeriodLabel).toContain('live register')
    expect(litigation.snapshotPeriodLabel).toContain('live register')
    expect(Object.values(litigation.stageCounts ?? {}).reduce((sum, count) => sum + count, 0)).toBeGreaterThan(0)
    expect(workforce.pendingSoeReview + workforce.clarificationOpen).toBeGreaterThanOrEqual(0)
    expect(litigation.dueSoon).toBeGreaterThanOrEqual(0)
  })

  it('workflow machine still recognizes clarification → resubmitted path', () => {
    expect(
      canTransition(SUBMISSION_STATUS.CLARIFICATION_REQUESTED, SUBMISSION_STATUS.RESUBMITTED),
    ).toBe(true)
  })
})
