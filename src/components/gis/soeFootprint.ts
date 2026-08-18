import {
  ASSET_LITIGATION_STATUS,
  ASSET_TYPE_LABEL,
  ASSET_UTILIZATION,
  ENCROACHMENT_STATUS,
  LAND_USE_CLASS,
} from '@/constants'
import type { GisAssetItem } from '@/mock-services/gis.service'
import type { OrganizationLocation } from '@/types/domain'

export const OPERATING_STATUS = {
  industrial: { color: '#1d5d8f', soft: '#e9f1f7', label: 'Industrial' },
  agricultural: { color: '#2e7d5a', soft: '#eaf4ef', label: 'Agricultural' },
  commercial: { color: '#16877a', soft: '#e8f5f2', label: 'Commercial' },
  residential: { color: '#c58a19', soft: '#fbf3e3', label: 'Residential' },
  vacant: { color: '#b84242', soft: '#faecec', label: 'Vacant' },
  mixed: { color: '#64748b', soft: '#eef1f4', label: 'Mixed use' },
} as const

export type UnitOperatingStatus = keyof typeof OPERATING_STATUS

export interface FootprintSoe {
  organizationId: string
  abbreviation: string
  name: string
  sector: string
}

export interface SoeFootprintUnit {
  id: string
  organizationId: string
  name: string
  kind: OrganizationLocation['kind']
  province: string
  district: string
  address?: string
  latitude: number
  longitude: number
  assetCount: number
  bookValue: number
  marketValue: number
  landAreaAcres: number
  underutilizedCount: number
  riskCount: number
  operatingStatus: UnitOperatingStatus
  assetTypes: string[]
}

function distanceSquared(
  first: { latitude: number; longitude: number },
  second: { latitude?: number; longitude?: number },
) {
  if (second.latitude == null || second.longitude == null) return Number.POSITIVE_INFINITY
  const lat = first.latitude - second.latitude
  const lng = first.longitude - second.longitude
  return lat * lat + lng * lng
}

function unitName(location: OrganizationLocation, abbreviation: string) {
  const kind = {
    head_office: 'Head Office',
    factory: 'Industrial Unit',
    warehouse: 'Warehouse',
    regional_office: 'Regional Office',
    provincial_office: 'Regional Office',
  }[location.kind]
  return `${abbreviation} ${kind} - ${location.district}`
}

function assetHasAttention(item: GisAssetItem) {
  return (
    item.utilization === ASSET_UTILIZATION.IDLE ||
    item.utilization === ASSET_UTILIZATION.UNDERUTILIZED ||
    item.utilization === ASSET_UTILIZATION.UNUSED ||
    item.encroachment === ENCROACHMENT_STATUS.ENCROACHED ||
    item.encroachment === ENCROACHMENT_STATUS.SUSPECTED
  )
}

function resolveOperatingStatus(
  location: OrganizationLocation,
  assets: GisAssetItem[],
): UnitOperatingStatus {
  const classifications = new Map<UnitOperatingStatus, number>()
  for (const asset of assets) {
    const classification: UnitOperatingStatus | undefined =
      asset.opportunityStatus === 'available_land' || asset.useClassification === LAND_USE_CLASS.UNUSED
        ? 'vacant'
        : asset.useClassification === LAND_USE_CLASS.INDUSTRIAL
          ? 'industrial'
          : asset.useClassification === LAND_USE_CLASS.AGRICULTURAL
            ? 'agricultural'
            : asset.useClassification === LAND_USE_CLASS.COMMERCIAL
              ? 'commercial'
              : asset.useClassification === LAND_USE_CLASS.RESIDENTIAL
                ? 'residential'
                : undefined
    if (classification) {
      classifications.set(classification, (classifications.get(classification) ?? 0) + 1)
    }
  }

  const ranked = [...classifications.entries()].sort((a, b) => b[1] - a[1])
  if (ranked.length > 1 && ranked[0]?.[1] === ranked[1]?.[1]) return 'mixed'
  if (ranked[0]) return ranked[0][0]
  if (location.kind === 'factory' || location.kind === 'warehouse') return 'industrial'
  return 'commercial'
}

export function buildSoeFootprintUnits(
  locations: OrganizationLocation[],
  assets: GisAssetItem[],
  soe: Pick<FootprintSoe, 'organizationId' | 'abbreviation'>,
): SoeFootprintUnit[] {
  const scopedLocations = locations.filter(
    (location) =>
      location.organizationId === soe.organizationId &&
      Number.isFinite(location.latitude) &&
      Number.isFinite(location.longitude),
  )
  if (!scopedLocations.length) return []

  const assetsByUnit = new Map<string, GisAssetItem[]>(
    scopedLocations.map((location) => [location.id, []]),
  )
  const fallback =
    scopedLocations.find((location) => location.kind === 'head_office') ?? scopedLocations[0]!

  for (const asset of assets.filter((item) => item.organizationId === soe.organizationId)) {
    const nearest =
      asset.latitude == null || asset.longitude == null
        ? fallback
        : scopedLocations.reduce((best, location) =>
            distanceSquared(location, asset) < distanceSquared(best, asset) ? location : best,
          )
    assetsByUnit.get(nearest.id)?.push(asset)
  }

  return scopedLocations
    .map((location) => {
      const unitAssets = assetsByUnit.get(location.id) ?? []
      const criticalCount = unitAssets.filter(
        (asset) => asset.litigation === ASSET_LITIGATION_STATUS.ACTIVE,
      ).length
      const attentionCount = unitAssets.filter(assetHasAttention).length
      const assetTypes = [...new Set(unitAssets.map((asset) => ASSET_TYPE_LABEL[asset.assetType]))]

      return {
        id: location.id,
        organizationId: location.organizationId,
        name: unitName(location, soe.abbreviation),
        kind: location.kind,
        province: location.province,
        district: location.district,
        address: location.address,
        latitude: location.latitude,
        longitude: location.longitude,
        assetCount: unitAssets.length,
        bookValue: unitAssets.reduce((sum, asset) => sum + (asset.bookValue ?? 0), 0),
        marketValue: unitAssets.reduce((sum, asset) => sum + (asset.marketValue ?? 0), 0),
        landAreaAcres: unitAssets.reduce((sum, asset) => sum + (asset.areaAcres ?? 0), 0),
        underutilizedCount: attentionCount,
        riskCount: criticalCount,
        operatingStatus: resolveOperatingStatus(location, unitAssets),
        assetTypes,
      }
    })
    .sort((a, b) => {
      const kindOrder = {
        head_office: 0,
        factory: 1,
        warehouse: 2,
        regional_office: 3,
        provincial_office: 3,
      }
      return kindOrder[a.kind] - kindOrder[b.kind] || a.name.localeCompare(b.name)
    })
}
