import { describe, expect, it, beforeEach } from 'vitest'
import {
  ASSET_TYPE,
  ASSET_UTILIZATION,
  ENCROACHMENT_STATUS,
  ASSET_LITIGATION_STATUS,
  ASSET_EVIDENCE_STATUS,
  ASSET_OCCUPANCY,
  LAND_USE_CLASS,
} from '@/constants'
import { db, resetMockDb } from '@/mock-data'
import { resetMockRuntime } from '@/mock-data/runtime'
import { mockAssetService, valuationVariance } from '@/mock-services/asset.service'
import {
  assetDraftToPayload,
  emptyAssetDraft,
  isAssetDraftValid,
} from '@/portals/shared/assetEntryForm'

describe('Phase 8 asset intelligence', () => {
  beforeEach(() => {
    resetMockDb()
    resetMockRuntime()
  })

  it('seeds all primary asset classes with controlled statuses', () => {
    const types = new Set(db.assets.map((a) => a.assetType))
    expect(types.has(ASSET_TYPE.LAND)).toBe(true)
    expect(types.has(ASSET_TYPE.BUILDING)).toBe(true)
    expect(types.has(ASSET_TYPE.MACHINERY)).toBe(true)
    expect(types.has(ASSET_TYPE.VEHICLE)).toBe(true)
    expect(types.has(ASSET_TYPE.OTHER_EQUIPMENT) || types.has(ASSET_TYPE.IT_EQUIPMENT)).toBe(true)

    const land = db.assets.find((a) => a.assetType === ASSET_TYPE.LAND)!
    expect(land.occupancyStatus).toBeTruthy()
    expect(land.useClassification).toBeTruthy()
    expect(land.utilizationStatus).toBeTruthy()
  })

  it('includes Phase 8 scenario fixtures', () => {
    expect(
      db.assets.some(
        (a) =>
          a.assetType === ASSET_TYPE.LAND &&
          a.occupancyStatus === 'vacant' &&
          a.useClassification === 'industrial',
      ),
    ).toBe(true)
    expect(
      db.assets.some((a) => a.encroachmentStatus === ENCROACHMENT_STATUS.ENCROACHED),
    ).toBe(true)
    expect(
      db.assets.some((a) => a.litigationStatus === ASSET_LITIGATION_STATUS.ACTIVE),
    ).toBe(true)
    expect(db.assets.some((a) => a.marketValue == null)).toBe(true)
    expect(
      db.assets.some((a) => a.utilizationStatus === ASSET_UTILIZATION.IDLE),
    ).toBe(true)
    expect(db.assets.some((a) => a.disposed)).toBe(true)
    expect(
      db.assets.some((a) => a.evidenceStatus === ASSET_EVIDENCE_STATUS.MISSING),
    ).toBe(true)
  })

  it('filters registry and summarizes with drill-down counts', async () => {
    const summary = await mockAssetService.getSummary({
      organizationId: 'org-usc',
      portfolioScope: false,
    })
    expect(summary.totalCount).toBeGreaterThan(0)
    expect(summary.encroachedLandCount).toBeGreaterThanOrEqual(0)

    const encroached = await mockAssetService.getAssets({
      organizationId: 'org-usc',
      assetType: ASSET_TYPE.LAND,
      encroachment: ENCROACHMENT_STATUS.ENCROACHED,
      pageSize: 50,
    })
    expect(encroached.items.every((a) => a.encroachmentStatus === ENCROACHMENT_STATUS.ENCROACHED)).toBe(
      true,
    )
  })

  it('computes valuation variance without inventing quality scores', () => {
    const asset = db.assets.find((a) => a.bookValue && a.marketValue)!
    const v = valuationVariance(asset)
    expect(v).not.toBeNull()
    expect(typeof v).toBe('number')
  })

  it('updates utilization and appends history', async () => {
    const asset = db.assets.find((a) => !a.disposed)!
    await mockAssetService.updateAsset(asset.id, {
      utilizationStatus: ASSET_UTILIZATION.IDLE,
    })
    const history = await mockAssetService.getHistory(asset.id)
    expect(history.some((h) => h.eventType === 'utilization_changed')).toBe(true)
  })

  it('simulates import and expands registry', async () => {
    const before = db.assets.filter((a) => a.organizationId === 'org-psm').length
    const result = await mockAssetService.simulateImport('org-psm', 'assets-ok.xlsx')
    expect(result.accepted).toBeGreaterThan(0)
    expect(result.createdIds.length).toBe(result.accepted)
    const after = db.assets.filter((a) => a.organizationId === 'org-psm').length
    expect(after).toBe(before + result.accepted)
  })

  it('keeps land occupancy/use/utilization as separate fields', () => {
    const land = db.assets.find(
      (a) =>
        a.assetType === ASSET_TYPE.LAND &&
        a.occupancyStatus === 'vacant' &&
        a.useClassification === 'industrial',
    )
    expect(land?.utilizationStatus).toBeDefined()
    expect(land?.occupancyStatus).not.toBe(land?.utilizationStatus)
  })

  it('links geo features and evidence documents to assets', async () => {
    const withDocs = db.documents.find((d) => d.linkedRecordType === 'asset')
    expect(withDocs).toBeTruthy()
    const docs = await mockAssetService.getDocuments(withDocs!.linkedRecordId!)
    expect(docs.length).toBeGreaterThan(0)
    const geo = await mockAssetService.getGeoForAsset(withDocs!.linkedRecordId!)
    expect(geo?.assetId).toBe(withDocs!.linkedRecordId)
  })

  it('creates land asset with Module 3 land fields from entry draft', async () => {
    const draft = emptyAssetDraft(ASSET_TYPE.LAND)
    draft.name = 'Test industrial plot'
    draft.identifier = 'LAND-TEST-001'
    draft.province = 'Punjab'
    draft.district = 'Lahore'
    draft.tehsil = 'Model Town'
    draft.mouza = 'Demo Mouza'
    draft.khasraNumber = 'K-42'
    draft.areaAcres = 5
    draft.areaKanals = 40
    draft.areaSqFt = 217800
    draft.occupancyStatus = ASSET_OCCUPANCY.VACANT
    draft.useClassification = LAND_USE_CLASS.INDUSTRIAL
    draft.bookValue = 50_000_000
    draft.marketValue = 65_000_000
    draft.encroachmentStatus = ENCROACHMENT_STATUS.CLEAR
    draft.litigationStatus = ASSET_LITIGATION_STATUS.CLEAR

    expect(isAssetDraftValid(draft, 'org-nfc')).toBe(true)

    const created = await mockAssetService.createAsset(
      assetDraftToPayload(draft, 'org-nfc'),
    )
    expect(created.assetType).toBe(ASSET_TYPE.LAND)
    expect(created.mouza).toBe('Demo Mouza')
    expect(created.areaAcres).toBe(5)
    expect(created.useClassification).toBe(LAND_USE_CLASS.INDUSTRIAL)
  })

  it('creates building asset with type-specific fields from entry draft', async () => {
    const draft = emptyAssetDraft(ASSET_TYPE.BUILDING)
    draft.name = 'Admin block'
    draft.buildingType = 'Office'
    draft.floorAreaSqFt = 12000
    draft.buildingAgeYears = 18
    draft.replacementValue = 90_000_000
    draft.occupancyStatus = ASSET_OCCUPANCY.OCCUPIED

    const created = await mockAssetService.createAsset(
      assetDraftToPayload(draft, 'org-nfc'),
    )
    expect(created.buildingType).toBe('Office')
    expect(created.floorAreaSqFt).toBe(12000)
  })
})
