/**
 * GIS / National Industrial Asset Map — Phase 18.
 * Filterable geospatial query over asset + geo fixtures. Read paths only.
 */
import {
  ASSET_LITIGATION_STATUS,
  ASSET_OCCUPANCY,
  ASSET_TYPE,
  ASSET_UTILIZATION,
  ENCROACHMENT_STATUS,
  LAND_USE_CLASS,
  OWNERSHIP_BAND,
  type AssetLitigationStatus,
  type AssetType,
  type AssetUtilization,
  type EncroachmentStatus,
  type LandUseClass,
  type OwnershipBand,
} from '@/constants'
import { db } from '@/mock-data'
import { paginate } from '@/mock-services/_helpers'
import type { Asset, DocumentMeta, GeoFeature, ListQuery, PagedResult } from '@/types/domain'
import { AppError, simulateLatency } from '@/utils'

/** Design-system map marker roles (provisional opportunity labels) */
export type GisMarkerRole =
  | 'standard'
  | 'opportunity'
  | 'attention'
  | 'critical'
  | 'unavailable'

export type GisOpportunityStatus =
  | 'available_land'
  | 'underutilized'
  | 'idle'
  | 'encroached'
  | 'litigation'
  | 'standard'

export interface GisQuery {
  organizationId?: string
  assetType?: AssetType | ''
  province?: string
  district?: string
  utilization?: AssetUtilization | ''
  encroachment?: EncroachmentStatus | ''
  litigation?: AssetLitigationStatus | ''
  ownershipBand?: OwnershipBand | ''
  minAcres?: number
  maxAcres?: number
  hasMarketValue?: boolean
  hasBookValue?: boolean
  minMarketValue?: number
  maxMarketValue?: number
  useClassification?: LandUseClass | ''
  evidenceStatus?: string
  currentUse?: string
  mappedOnly?: boolean
  search?: string
  /** Portfolio scope (MoIP/Minister/PMO) vs SOE isolation */
  portfolioScope?: boolean
  scopedOrganizationId?: string
  page?: number
  pageSize?: number
}

export interface GisAssetItem {
  assetId: string
  organizationId: string
  organizationLabel: string
  name: string
  assetType: AssetType
  latitude?: number
  longitude?: number
  geometryType?: 'Point' | 'Polygon'
  coordinates?: number[] | number[][]
  geoFeatureId?: string
  province?: string
  district?: string
  areaAcres?: number
  utilization?: string
  encroachment?: string
  litigation?: string
  ownershipNote?: string
  ownershipBand: OwnershipBand
  bookValue?: number
  marketValue?: number
  currentUse?: string
  useClassification?: string
  evidenceStatus?: string
  opportunityStatus: GisOpportunityStatus
  markerRole: GisMarkerRole
  mapped: boolean
  geometryIllustrative: boolean
}

export interface GisSummary {
  assetsInView: number
  mappedCount: number
  nonMappedCount: number
  totalAreaAcres: number
  totalMarketValue: number
  vacantUnusedCount: number
  litigationCount: number
  encroachmentCount: number
}

export interface GisDataQuality {
  missingCoordinates: number
  missingGeometry: number
  missingValuation: number
  provinceDistrictWarnings: number
  warnings: Array<{ code: string; message: string; count: number }>
}

export interface GisPreset {
  id: string
  label: string
  description: string
  query: GisQuery
}

export interface GisFilterOptions {
  organizations: Array<{ id: string; label: string }>
  provinces: string[]
  /** All districts in scope (national list). Prefer districtsByProvince when province is selected. */
  districts: string[]
  /** Province → districts present in fixtures (for cascading district filter). */
  districtsByProvince: Record<string, string[]>
  assetTypes: AssetType[]
}

/** Provisional province extents for geographic navigation (illustrative) */
export const GIS_PROVINCE_BOUNDS: Record<
  string,
  { center: [number, number]; zoom: number }
> = {
  Punjab: { center: [31.17, 72.71], zoom: 7 },
  Sindh: { center: [25.89, 68.52], zoom: 7 },
  'Khyber Pakhtunkhwa': { center: [34.25, 72.15], zoom: 7 },
  Balochistan: { center: [28.49, 65.1], zoom: 6 },
  Islamabad: { center: [33.68, 73.05], zoom: 10 },
}

export const GIS_NATIONAL_VIEW = {
  center: [30.3753, 69.3451] as [number, number],
  zoom: 5,
}

export const GIS_PRESETS: GisPreset[] = [
  {
    id: 'vacant-industrial-20',
    label: 'Vacant industrial land > 20 acres',
    description: 'Vacant industrial land greater than 20 acres with no litigation.',
    query: {
      assetType: ASSET_TYPE.LAND,
      utilization: ASSET_UTILIZATION.UNUSED,
      useClassification: LAND_USE_CLASS.INDUSTRIAL,
      litigation: ASSET_LITIGATION_STATUS.CLEAR,
      minAcres: 20,
      mappedOnly: false,
    },
  },
  {
    id: 'underutilized-machinery',
    label: 'Underutilized machinery',
    description: 'Machinery marked underutilized or idle — filter further by province.',
    query: {
      assetType: ASSET_TYPE.MACHINERY,
      utilization: ASSET_UTILIZATION.UNDERUTILIZED,
    },
  },
  {
    id: 'encroached-land',
    label: 'Encroached land',
    description: 'Land with encroached or suspected encroachment status.',
    query: {
      assetType: ASSET_TYPE.LAND,
      encroachment: ENCROACHMENT_STATUS.ENCROACHED,
    },
  },
  {
    id: 'market-missing-use',
    label: 'Market value, missing current use',
    description: 'Assets with market value but blank/unclear current use.',
    query: {
      hasMarketValue: true,
      currentUse: '__missing__',
    },
  },
  {
    id: 'idle-factories',
    label: 'Idle factories / buildings',
    description: 'Buildings with idle or unused utilization.',
    query: {
      assetType: ASSET_TYPE.BUILDING,
      utilization: ASSET_UTILIZATION.IDLE,
    },
  },
]

function ownershipBand(pct: number): OwnershipBand {
  if (pct >= 100) return OWNERSHIP_BAND.WHOLLY
  if (pct >= 50) return OWNERSHIP_BAND.MAJORITY
  if (pct > 0) return OWNERSHIP_BAND.MINORITY
  return OWNERSHIP_BAND.NONE
}

function opportunityStatus(asset: Asset): GisOpportunityStatus {
  if (asset.litigationStatus === ASSET_LITIGATION_STATUS.ACTIVE) return 'litigation'
  if (
    asset.encroachmentStatus === ENCROACHMENT_STATUS.ENCROACHED ||
    asset.encroachmentStatus === ENCROACHMENT_STATUS.SUSPECTED
  ) {
    return 'encroached'
  }
  if (
    asset.assetType === ASSET_TYPE.LAND &&
    asset.occupancyStatus === ASSET_OCCUPANCY.VACANT &&
    asset.useClassification === LAND_USE_CLASS.INDUSTRIAL &&
    (asset.areaAcres ?? 0) >= 20
  ) {
    return 'available_land'
  }
  if (
    asset.utilizationStatus === ASSET_UTILIZATION.IDLE ||
    (asset.assetType === ASSET_TYPE.BUILDING &&
      asset.utilizationStatus === ASSET_UTILIZATION.UNUSED)
  ) {
    return 'idle'
  }
  if (
    asset.utilizationStatus === ASSET_UTILIZATION.UNDERUTILIZED ||
    asset.utilizationStatus === ASSET_UTILIZATION.UNUSED
  ) {
    return 'underutilized'
  }
  return 'standard'
}

function markerRole(status: GisOpportunityStatus, evidence?: string): GisMarkerRole {
  if (status === 'litigation') return 'critical'
  if (status === 'encroached') return 'attention'
  if (status === 'available_land') return 'opportunity'
  if (evidence === 'missing') return 'unavailable'
  if (status === 'idle' || status === 'underutilized') return 'attention'
  return 'standard'
}

function buildItems(baseQuery?: { portfolioScope?: boolean; scopedOrganizationId?: string }): GisAssetItem[] {
  let assets = [...db.assets]
  if (!baseQuery?.portfolioScope && baseQuery?.scopedOrganizationId) {
    assets = assets.filter((a) => a.organizationId === baseQuery.scopedOrganizationId)
  }
  const geoByAsset = new Map(db.geoFeatures.map((g) => [g.assetId, g]))
  return assets.map((asset) => {
    const org = db.organizations.find((o) => o.id === asset.organizationId)
    const geo = geoByAsset.get(asset.id)
    const mapped = Boolean(
      geo ||
        (asset.latitude != null &&
          asset.longitude != null &&
          !Number.isNaN(asset.latitude) &&
          !Number.isNaN(asset.longitude)),
    )
    const opp = opportunityStatus(asset)
    const band = ownershipBand(org?.governmentOwnershipPct ?? 0)
    return {
      assetId: asset.id,
      organizationId: asset.organizationId,
      organizationLabel: org?.abbreviation ?? asset.organizationId,
      name: asset.name,
      assetType: asset.assetType,
      latitude: geo
        ? geo.type === 'Point'
          ? Number(geo.coordinates[1])
          : Number((geo.coordinates as number[][])[0]?.[1])
        : asset.latitude,
      longitude: geo
        ? geo.type === 'Point'
          ? Number(geo.coordinates[0])
          : Number((geo.coordinates as number[][])[0]?.[0])
        : asset.longitude,
      geometryType: geo?.type,
      coordinates: geo?.coordinates,
      geoFeatureId: geo?.id,
      province: asset.province,
      district: asset.district,
      areaAcres: asset.areaAcres,
      utilization: asset.utilizationStatus,
      encroachment: asset.encroachmentStatus,
      litigation: asset.litigationStatus,
      ownershipNote: asset.ownershipNote,
      ownershipBand: band,
      bookValue: asset.bookValue,
      marketValue: asset.marketValue,
      currentUse: asset.currentUse,
      useClassification: asset.useClassification,
      evidenceStatus: asset.evidenceStatus,
      opportunityStatus: opp,
      markerRole: markerRole(opp, asset.evidenceStatus),
      mapped,
      geometryIllustrative: geo?.type === 'Polygon',
    }
  })
}

function applyFilters(items: GisAssetItem[], query?: GisQuery): GisAssetItem[] {
  let rows = items
  if (query?.organizationId) {
    rows = rows.filter((r) => r.organizationId === query.organizationId)
  }
  if (query?.assetType) rows = rows.filter((r) => r.assetType === query.assetType)
  if (query?.province) rows = rows.filter((r) => r.province === query.province)
  if (query?.district) rows = rows.filter((r) => r.district === query.district)
  if (query?.utilization) {
    if (query.utilization === ASSET_UTILIZATION.UNDERUTILIZED) {
      // Preset convenience: include idle for machinery underutilized browse
      rows = rows.filter(
        (r) =>
          r.utilization === ASSET_UTILIZATION.UNDERUTILIZED ||
          r.utilization === ASSET_UTILIZATION.IDLE,
      )
    } else {
      rows = rows.filter((r) => r.utilization === query.utilization)
    }
  }
  if (query?.encroachment) {
    if (query.encroachment === ENCROACHMENT_STATUS.ENCROACHED) {
      rows = rows.filter(
        (r) =>
          r.encroachment === ENCROACHMENT_STATUS.ENCROACHED ||
          r.encroachment === ENCROACHMENT_STATUS.SUSPECTED,
      )
    } else {
      rows = rows.filter((r) => r.encroachment === query.encroachment)
    }
  }
  if (query?.litigation) rows = rows.filter((r) => r.litigation === query.litigation)
  if (query?.ownershipBand) {
    rows = rows.filter((r) => r.ownershipBand === query.ownershipBand)
  }
  if (query?.minAcres != null) {
    rows = rows.filter((r) => (r.areaAcres ?? 0) >= query.minAcres!)
  }
  if (query?.maxAcres != null) {
    rows = rows.filter((r) => (r.areaAcres ?? 0) <= query.maxAcres!)
  }
  if (query?.hasMarketValue) rows = rows.filter((r) => r.marketValue != null)
  if (query?.hasBookValue) rows = rows.filter((r) => r.bookValue != null)
  if (query?.minMarketValue != null) {
    rows = rows.filter((r) => (r.marketValue ?? 0) >= query.minMarketValue!)
  }
  if (query?.maxMarketValue != null) {
    rows = rows.filter((r) => (r.marketValue ?? 0) <= query.maxMarketValue!)
  }
  if (query?.useClassification) {
    rows = rows.filter((r) => r.useClassification === query.useClassification)
  }
  if (query?.evidenceStatus) {
    rows = rows.filter((r) => r.evidenceStatus === query.evidenceStatus)
  }
  if (query?.currentUse === '__missing__') {
    rows = rows.filter((r) => !r.currentUse || r.currentUse === 'Idle site')
  } else if (query?.currentUse) {
    rows = rows.filter((r) => r.currentUse === query.currentUse)
  }
  if (query?.mappedOnly) rows = rows.filter((r) => r.mapped)
  if (query?.search) {
    const q = query.search.toLowerCase()
    rows = rows.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.organizationLabel.toLowerCase().includes(q) ||
        (r.district ?? '').toLowerCase().includes(q),
    )
  }
  return rows
}

function summarize(rows: GisAssetItem[]): GisSummary {
  return {
    assetsInView: rows.length,
    mappedCount: rows.filter((r) => r.mapped).length,
    nonMappedCount: rows.filter((r) => !r.mapped).length,
    totalAreaAcres: rows.reduce((s, r) => s + (r.areaAcres ?? 0), 0),
    totalMarketValue: rows.reduce((s, r) => s + (r.marketValue ?? 0), 0),
    vacantUnusedCount: rows.filter(
      (r) =>
        r.utilization === ASSET_UTILIZATION.UNUSED ||
        r.utilization === ASSET_UTILIZATION.IDLE ||
        r.opportunityStatus === 'available_land',
    ).length,
    litigationCount: rows.filter((r) => r.litigation === ASSET_LITIGATION_STATUS.ACTIVE).length,
    encroachmentCount: rows.filter(
      (r) =>
        r.encroachment === ENCROACHMENT_STATUS.ENCROACHED ||
        r.encroachment === ENCROACHMENT_STATUS.SUSPECTED,
    ).length,
  }
}

export interface GisService {
  getFeatures(organizationId?: string): Promise<GeoFeature[]>
  getFilterOptions(args?: {
    portfolioScope?: boolean
    scopedOrganizationId?: string
  }): Promise<GisFilterOptions>
  getPresets(): Promise<GisPreset[]>
  queryAssets(query?: GisQuery): Promise<PagedResult<GisAssetItem>>
  getSummary(query?: GisQuery): Promise<GisSummary>
  getDataQuality(query?: GisQuery): Promise<GisDataQuality>
  getAssetDetail(assetId: string): Promise<{
    item: GisAssetItem
    documents: DocumentMeta[]
  }>
}

export const mockGisService: GisService = {
  async getFeatures(organizationId) {
    const items = organizationId
      ? db.geoFeatures.filter((g) => g.organizationId === organizationId)
      : [...db.geoFeatures]
    return simulateLatency(items)
  },

  async getFilterOptions(args) {
    const items = buildItems(args)
    const organizations = [
      ...new Map(
        items.map((i) => [i.organizationId, { id: i.organizationId, label: i.organizationLabel }]),
      ).values(),
    ].sort((a, b) => a.label.localeCompare(b.label))
    const provinces = [...new Set(items.map((i) => i.province).filter(Boolean) as string[])].sort()
    const districts = [...new Set(items.map((i) => i.district).filter(Boolean) as string[])].sort()
    const districtsByProvince: Record<string, string[]> = {}
    for (const i of items) {
      if (!i.province || !i.district) continue
      const list = districtsByProvince[i.province] ?? []
      if (!list.includes(i.district)) list.push(i.district)
      districtsByProvince[i.province] = list
    }
    for (const key of Object.keys(districtsByProvince)) {
      districtsByProvince[key] = districtsByProvince[key]!.sort()
    }
    const assetTypes = [...new Set(items.map((i) => i.assetType))]
    return simulateLatency({ organizations, provinces, districts, districtsByProvince, assetTypes })
  },

  async getPresets() {
    return simulateLatency(GIS_PRESETS)
  },

  async queryAssets(query) {
    const items = applyFilters(
      buildItems({
        portfolioScope: query?.portfolioScope,
        scopedOrganizationId: query?.scopedOrganizationId,
      }),
      query,
    )
    items.sort((a, b) => {
      const roleOrder = { critical: 0, attention: 1, opportunity: 2, standard: 3, unavailable: 4 }
      return roleOrder[a.markerRole] - roleOrder[b.markerRole] || a.name.localeCompare(b.name)
    })
    return simulateLatency(paginate(items, query as ListQuery))
  },

  async getSummary(query) {
    const items = applyFilters(
      buildItems({
        portfolioScope: query?.portfolioScope,
        scopedOrganizationId: query?.scopedOrganizationId,
      }),
      query,
    )
    return simulateLatency(summarize(items))
  },

  async getDataQuality(query) {
    const items = applyFilters(
      buildItems({
        portfolioScope: query?.portfolioScope,
        scopedOrganizationId: query?.scopedOrganizationId,
      }),
      { ...query, mappedOnly: false },
    )
    const missingCoordinates = items.filter((r) => !r.mapped).length
    const missingGeometry = items.filter(
      (r) => r.assetType === ASSET_TYPE.LAND && r.mapped && r.geometryType !== 'Polygon',
    ).length
    const missingValuation = items.filter(
      (r) => r.bookValue == null || r.marketValue == null,
    ).length
    /** Provisional: district equals city label from seed — flag land without tehsil-like district */
    const provinceDistrictWarnings = items.filter(
      (r) => r.mapped && (!r.province || !r.district),
    ).length

    const warnings = [
      {
        code: 'missing_coordinates',
        message: 'Assets without map coordinates (shown in list only)',
        count: missingCoordinates,
      },
      {
        code: 'missing_land_polygon',
        message: 'Mapped land without parcel polygon (point only; geometry illustrative)',
        count: missingGeometry,
      },
      {
        code: 'missing_valuation',
        message: 'Assets missing book or market valuation',
        count: missingValuation,
      },
      {
        code: 'location_incomplete',
        message: 'Mapped assets missing province or district',
        count: provinceDistrictWarnings,
      },
    ].filter((w) => w.count > 0)

    return simulateLatency({
      missingCoordinates,
      missingGeometry,
      missingValuation,
      provinceDistrictWarnings,
      warnings,
    })
  },

  async getAssetDetail(assetId) {
    const items = buildItems({ portfolioScope: true })
    const item = items.find((i) => i.assetId === assetId)
    if (!item) throw new AppError('Asset not found', 'NOT_FOUND')
    const documents = db.documents.filter(
      (d) => d.linkedRecordType === 'asset' && d.linkedRecordId === assetId,
    )
    return simulateLatency({ item, documents })
  },
}
