import { beforeEach, describe, expect, it } from 'vitest'
import { db, resetMockDb } from '@/mock-data'
import { mockGisService, setMockLatencyMode } from '@/mock-services'
import { buildSoeFootprintUnits } from '@/components/gis/soeFootprint'

describe('SOE footprint unit aggregation', () => {
  beforeEach(() => {
    resetMockDb()
    setMockLatencyMode('none')
  })

  it('groups every SOE asset into the nearest registered operating unit', async () => {
    const organization = db.organizations.find((item) => item.id === 'org-nfc')!
    const result = await mockGisService.queryAssets({
      organizationId: organization.id,
      portfolioScope: true,
      pageSize: 500,
    })

    const units = buildSoeFootprintUnits(db.locations, result.items, {
      organizationId: organization.id,
      abbreviation: organization.abbreviation,
    })

    expect(units).toHaveLength(3)
    expect(units[0]?.kind).toBe('head_office')
    expect(units.map((unit) => unit.name)).toContain('NFC Regional Office - Karachi')
    expect(units.find((unit) => unit.kind === 'factory')?.operatingStatus).toBe('industrial')
    expect(units.find((unit) => unit.kind === 'provincial_office')?.operatingStatus).toBe('commercial')
    expect(units.find((unit) => unit.name === 'NFC Regional Office - Karachi')).toMatchObject({
      province: 'Sindh',
      district: 'Karachi',
      latitude: 24.8546,
      longitude: 67.0307,
    })
    expect(units.reduce((sum, unit) => sum + unit.assetCount, 0)).toBe(result.items.length)
    expect(units.reduce((sum, unit) => sum + unit.marketValue, 0)).toBe(
      result.items.reduce((sum, asset) => sum + (asset.marketValue ?? 0), 0),
    )
  })

  it('does not leak units or assets from another SOE', async () => {
    const organization = db.organizations.find((item) => item.id === 'org-psm')!
    const result = await mockGisService.queryAssets({ portfolioScope: true, pageSize: 500 })

    const units = buildSoeFootprintUnits(db.locations, result.items, {
      organizationId: organization.id,
      abbreviation: organization.abbreviation,
    })

    expect(units.every((unit) => unit.organizationId === organization.id)).toBe(true)
    expect(units.reduce((sum, unit) => sum + unit.assetCount, 0)).toBe(
      result.items.filter((asset) => asset.organizationId === organization.id).length,
    )
  })

  it('keeps operating units on unique registered coordinates', () => {
    const coordinateKeys = db.locations.map(
      (location) => `${location.latitude.toFixed(6)},${location.longitude.toFixed(6)}`,
    )
    const pakistanSteel = db.locations.find(
      (location) => location.organizationId === 'org-psm' && location.kind === 'factory',
    )
    const smedaKarachi = db.locations.find(
      (location) => location.organizationId === 'org-smeda' && location.kind === 'provincial_office',
    )

    expect(new Set(coordinateKeys).size).toBe(coordinateKeys.length)
    expect(pakistanSteel).toMatchObject({
      district: 'Karachi',
      address: 'Pakistan Steel, Bin Qasim, Karachi',
      latitude: 24.805247,
      longitude: 67.346582,
    })
    expect(smedaKarachi).toMatchObject({
      address: 'Bahria Complex II, M.T. Khan Road, Karachi',
      latitude: 24.8367,
      longitude: 67.0256,
    })
  })
})
