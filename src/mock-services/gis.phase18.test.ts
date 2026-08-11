import { beforeEach, describe, expect, it } from 'vitest'
import {
  ASSET_LITIGATION_STATUS,
  ASSET_TYPE,
  ASSET_UTILIZATION,
  LAND_USE_CLASS,
} from '@/constants'
import { db, resetMockDb } from '@/mock-data'
import { resetMockRuntime } from '@/mock-data/runtime'
import { mockGisService } from '@/mock-services'

describe('Phase 18 GIS national industrial asset map', () => {
  beforeEach(() => {
    resetMockDb()
    resetMockRuntime()
  })

  it('supports vacant industrial land > 20 acres with no litigation preset', async () => {
    const page = await mockGisService.queryAssets({
      portfolioScope: true,
      assetType: ASSET_TYPE.LAND,
      utilization: ASSET_UTILIZATION.UNUSED,
      useClassification: LAND_USE_CLASS.INDUSTRIAL,
      litigation: ASSET_LITIGATION_STATUS.CLEAR,
      minAcres: 20,
      pageSize: 200,
    })
    expect(page.items.length).toBeGreaterThan(0)
    page.items.forEach((i) => {
      expect(i.assetType).toBe(ASSET_TYPE.LAND)
      expect(i.areaAcres ?? 0).toBeGreaterThanOrEqual(20)
      expect(i.litigation).toBe(ASSET_LITIGATION_STATUS.CLEAR)
      expect(i.opportunityStatus).toBe('available_land')
    })
  })

  it('filters by province and SOE together', async () => {
    const sample = db.assets.find((a) => a.province && a.latitude != null)
    expect(sample).toBeTruthy()
    const page = await mockGisService.queryAssets({
      portfolioScope: true,
      organizationId: sample!.organizationId,
      province: sample!.province,
      pageSize: 100,
    })
    expect(page.items.length).toBeGreaterThan(0)
    page.items.forEach((i) => {
      expect(i.organizationId).toBe(sample!.organizationId)
      expect(i.province).toBe(sample!.province)
    })
  })

  it('scopes SOE portal to one organization', async () => {
    const page = await mockGisService.queryAssets({
      portfolioScope: false,
      scopedOrganizationId: 'org-psm',
      pageSize: 500,
    })
    expect(page.items.length).toBeGreaterThan(0)
    page.items.forEach((i) => expect(i.organizationId).toBe('org-psm'))
  })

  it('reports non-mapped assets in summary and data quality', async () => {
    const summary = await mockGisService.getSummary({ portfolioScope: true })
    expect(summary.assetsInView).toBe(db.assets.length)
    expect(summary.mappedCount + summary.nonMappedCount).toBe(summary.assetsInView)
    expect(summary.nonMappedCount).toBeGreaterThan(0)

    const quality = await mockGisService.getDataQuality({ portfolioScope: true })
    expect(quality.missingCoordinates).toBe(summary.nonMappedCount)
    expect(quality.warnings.some((w) => w.code === 'missing_coordinates')).toBe(true)
  })

  it('exposes saved demo presets including core scenario', async () => {
    const presets = await mockGisService.getPresets()
    expect(presets.some((p) => p.id === 'vacant-industrial-20')).toBe(true)
    expect(presets.length).toBeGreaterThanOrEqual(4)
  })

  it('returns asset detail with opportunity and documents field', async () => {
    const page = await mockGisService.queryAssets({
      portfolioScope: true,
      mappedOnly: true,
      pageSize: 5,
    })
    const id = page.items[0]!.assetId
    const detail = await mockGisService.getAssetDetail(id)
    expect(detail.item.assetId).toBe(id)
    expect(detail.item.markerRole).toBeTruthy()
    expect(Array.isArray(detail.documents)).toBe(true)
  })

  it('returns zero results for impossible filter combination', async () => {
    const page = await mockGisService.queryAssets({
      portfolioScope: true,
      province: '__no_such_province__',
      pageSize: 20,
    })
    expect(page.items.length).toBe(0)
    const summary = await mockGisService.getSummary({
      portfolioScope: true,
      province: '__no_such_province__',
    })
    expect(summary.assetsInView).toBe(0)
  })

  it('keeps getFeatures backward compatible', async () => {
    const features = await mockGisService.getFeatures()
    expect(features.length).toBe(db.geoFeatures.length)
  })
})
