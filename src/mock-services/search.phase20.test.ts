import { beforeEach, describe, expect, it } from 'vitest'
import {
  ASSET_LITIGATION_STATUS,
  ASSET_TYPE,
  DOCUMENT_CATEGORY,
  ENCROACHMENT_STATUS,
  LOAN_REPAYMENT_STATUS,
  ROLE,
  SEARCH_DATASET,
  SEARCH_OPERATOR,
} from '@/constants'
import { db, resetMockDb } from '@/mock-data'
import { resetMockRuntime } from '@/mock-data/runtime'
import { mockSearchService } from '@/mock-services'
import { SAVED_SEARCH_PRESETS } from '@/workflow/searchQueryRegistry'

const moipScope = {
  portal: 'moip' as const,
  role: ROLE.MOIP_ANALYST,
}

const soeScope = {
  portal: 'soe' as const,
  role: ROLE.SOE_FOCAL_PERSON,
  organizationId: 'org-psm',
}

describe('Phase 20 advanced search and intelligence query', () => {
  beforeEach(() => {
    resetMockDb()
    resetMockRuntime()
  })

  it('runs consecutive losses ≥3 saved query with results', async () => {
    const preset = SAVED_SEARCH_PRESETS.find((p) => p.id === 'consecutive-losses-3')!
    const result = await mockSearchService.runQuery(
      {
        dataset: preset.dataset,
        logic: preset.logic,
        conditions: preset.conditions,
        sortBy: preset.sortBy,
        sortDir: preset.sortDir,
        pageSize: 50,
      },
      moipScope,
    )
    expect(result.total).toBeGreaterThan(0)
    result.items.forEach((row) => {
      expect(Number(row.fields.consecutiveLossYears)).toBeGreaterThan(2)
    })
  })

  it('finds encroached land in Punjab', async () => {
    const result = await mockSearchService.runQuery(
      {
        dataset: SEARCH_DATASET.ASSETS,
        logic: 'and',
        conditions: [
          { field: 'assetType', operator: SEARCH_OPERATOR.EQ, value: ASSET_TYPE.LAND },
          { field: 'province', operator: SEARCH_OPERATOR.EQ, value: 'Punjab' },
          {
            field: 'encroachmentStatus',
            operator: SEARCH_OPERATOR.EQ,
            value: ENCROACHMENT_STATUS.ENCROACHED,
          },
        ],
        pageSize: 100,
      },
      moipScope,
    )
    expect(result.total).toBeGreaterThan(0)
    result.items.forEach((r) => {
      expect(r.fields.province).toBe('Punjab')
      expect(r.fields.encroachmentStatus).toBe(ENCROACHMENT_STATUS.ENCROACHED)
    })
  })

  it('lists board members expiring within 90 days', async () => {
    const preset = SAVED_SEARCH_PRESETS.find((p) => p.id === 'board-expiry-watch')!
    const result = await mockSearchService.runQuery(
      {
        dataset: preset.dataset,
        logic: preset.logic,
        conditions: preset.conditions,
        pageSize: 100,
      },
      moipScope,
    )
    expect(result.total).toBeGreaterThan(0)
    result.items.forEach((r) => {
      const d = Number(r.fields.daysToExpiry)
      expect(d).toBeLessThan(91)
      expect(d).toBeGreaterThan(-1)
      expect(r.fields.isVacancySlot).toBe(false)
    })
  })

  it('filters audit paras above PKR 100 million', async () => {
    const result = await mockSearchService.runQuery(
      {
        dataset: SEARCH_DATASET.AUDIT_PARAS,
        conditions: [
          { field: 'amountInvolved', operator: SEARCH_OPERATOR.GT, value: 100_000_000 },
        ],
        pageSize: 100,
      },
      moipScope,
    )
    expect(result.total).toBeGreaterThan(0)
    result.items.forEach((r) => {
      expect(Number(r.fields.amountInvolved)).toBeGreaterThan(100_000_000)
    })
  })

  it('finds SOEs with capacity utilization below 40%', async () => {
    const result = await mockSearchService.runQuery(
      {
        dataset: SEARCH_DATASET.ORGANIZATIONS,
        logic: 'and',
        conditions: [
          { field: 'capacityUtilization', operator: SEARCH_OPERATOR.LT, value: 40 },
          { field: 'capacityUtilization', operator: SEARCH_OPERATOR.IS_NOT_EMPTY },
        ],
        pageSize: 50,
      },
      moipScope,
    )
    expect(result.total).toBeGreaterThan(0)
    result.items.forEach((r) => {
      expect(Number(r.fields.capacityUtilization)).toBeLessThan(40)
    })
  })

  it('lists overdue loan repayments', async () => {
    const result = await mockSearchService.runQuery(
      {
        dataset: SEARCH_DATASET.LOANS,
        conditions: [
          {
            field: 'repaymentStatus',
            operator: SEARCH_OPERATOR.EQ,
            value: LOAN_REPAYMENT_STATUS.OVERDUE,
          },
        ],
        pageSize: 50,
      },
      moipScope,
    )
    expect(result.total).toBeGreaterThan(0)
  })

  it('identifies SOEs missing annual reports', async () => {
    const withReport = new Set(
      db.documents
        .filter((d) => d.category === DOCUMENT_CATEGORY.ANNUAL_REPORTS)
        .map((d) => d.organizationId),
    )
    expect(withReport.size).toBeGreaterThan(0)

    const result = await mockSearchService.runQuery(
      {
        dataset: SEARCH_DATASET.ORGANIZATIONS,
        conditions: [
          { field: 'missingAnnualReport', operator: SEARCH_OPERATOR.EQ, value: true },
        ],
        pageSize: 50,
      },
      moipScope,
    )
    expect(result.total).toBeGreaterThan(0)
    result.items.forEach((r) => {
      expect(withReport.has(r.organizationId)).toBe(false)
    })
  })

  it('finds land assets under litigation', async () => {
    const result = await mockSearchService.runQuery(
      {
        dataset: SEARCH_DATASET.ASSETS,
        logic: 'and',
        conditions: [
          { field: 'assetType', operator: SEARCH_OPERATOR.EQ, value: ASSET_TYPE.LAND },
          {
            field: 'litigationStatus',
            operator: SEARCH_OPERATOR.EQ,
            value: ASSET_LITIGATION_STATUS.ACTIVE,
          },
        ],
        pageSize: 100,
      },
      moipScope,
    )
    expect(result.total).toBeGreaterThan(0)
  })

  it('scopes SOE portal to own organization only', async () => {
    const result = await mockSearchService.runQuery(
      {
        dataset: SEARCH_DATASET.ASSETS,
        conditions: [],
        pageSize: 500,
      },
      soeScope,
    )
    expect(result.total).toBeGreaterThan(0)
    result.items.forEach((r) => expect(r.organizationId).toBe('org-psm'))
  })

  it('does not expose CNIC in board results for unauthorized roles', async () => {
    const result = await mockSearchService.runQuery(
      {
        dataset: SEARCH_DATASET.BOARD_MEMBERS,
        conditions: [{ field: 'isVacancySlot', operator: SEARCH_OPERATOR.EQ, value: false }],
        pageSize: 5,
      },
      moipScope,
    )
    expect(result.items.length).toBeGreaterThan(0)
    result.items.forEach((r) => {
      expect(r.fields.cnic).toBeUndefined()
    })
  })

  it('returns clear zero-result state for impossible filter', async () => {
    const result = await mockSearchService.runQuery(
      {
        dataset: SEARCH_DATASET.ASSETS,
        conditions: [
          { field: 'province', operator: SEARCH_OPERATOR.EQ, value: '__no_province__' },
        ],
      },
      moipScope,
    )
    expect(result.total).toBe(0)
    expect(result.isZeroResult).toBe(true)
    expect(result.activeFilters.length).toBe(1)
  })

  it('supports OR logic across utilization statuses', async () => {
    const result = await mockSearchService.runQuery(
      {
        dataset: SEARCH_DATASET.ASSETS,
        logic: 'or',
        conditions: [
          { field: 'utilizationStatus', operator: SEARCH_OPERATOR.EQ, value: 'underutilized' },
          { field: 'utilizationStatus', operator: SEARCH_OPERATOR.EQ, value: 'idle' },
        ],
        pageSize: 200,
      },
      moipScope,
    )
    expect(result.total).toBeGreaterThan(0)
  })

  it('global search finds by text across datasets', async () => {
    const hits = await mockSearchService.globalSearch('PSM', moipScope, { limit: 20 })
    expect(hits.length).toBeGreaterThan(0)
  })

  it('exposes all roadmap saved presets', async () => {
    const presets = await mockSearchService.getSavedPresets('moip')
    const ids = presets.map((p) => p.id)
    expect(ids).toContain('consecutive-losses-3')
    expect(ids).toContain('encroached-land-punjab')
    expect(ids).toContain('board-expiry-watch')
    expect(ids).toContain('high-value-audit-paras')
    expect(ids).toContain('low-capacity-utilization')
    expect(ids).toContain('overdue-loan-repayments')
    expect(ids).toContain('missing-annual-reports')
    expect(ids).toContain('land-under-litigation')
  })
})
