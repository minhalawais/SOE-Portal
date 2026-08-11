import {
  ASSET_HISTORY_EVENT,
  ASSET_TYPE,
  ASSET_UNDERUTILIZED_THRESHOLD_PCT,
  ASSET_UTILIZATION,
  ENCROACHMENT_STATUS,
  ASSET_EVIDENCE_STATUS,
  ASSET_LITIGATION_STATUS,
  type AssetType,
  type AssetUtilization,
  type EncroachmentStatus,
  type AssetEvidenceStatus,
  type AssetLitigationStatus,
} from '@/constants'
import { db, getMockRuntime } from '@/mock-data'
import { paginate, sortByKey } from '@/mock-services/_helpers'
import type {
  Asset,
  AssetHistoryEvent,
  AssetSummary,
  DocumentMeta,
  GeoFeature,
  ListQuery,
  PagedResult,
} from '@/types/domain'
import { AppError, simulateLatency, simulateMutation } from '@/utils'
import { validateAssetDraft } from '@/workflow/assetValidation'

export interface AssetQuery extends ListQuery {
  assetType?: AssetType | AssetType[]
  province?: string
  district?: string
  utilization?: AssetUtilization
  encroachment?: EncroachmentStatus
  litigation?: AssetLitigationStatus
  evidenceStatus?: AssetEvidenceStatus
  missingValuation?: boolean
  portfolioScope?: boolean
  scopedOrganizationId?: string
}

export interface AssetImportResult {
  accepted: number
  warnings: number
  rejected: number
  message: string
  createdIds: string[]
}

export interface AssetService {
  getAssets(query?: AssetQuery): Promise<PagedResult<Asset>>
  getAsset(id: string): Promise<Asset>
  getSummary(query?: { organizationId?: string; portfolioScope?: boolean }): Promise<AssetSummary>
  createAsset(payload: Omit<Asset, 'id'> & { id?: string }): Promise<Asset>
  updateAsset(id: string, patch: Partial<Asset>): Promise<Asset>
  getHistory(assetId: string): Promise<AssetHistoryEvent[]>
  getDocuments(assetId: string): Promise<DocumentMeta[]>
  getGeoForAsset(assetId: string): Promise<GeoFeature | undefined>
  getGeoForOrganization(organizationId: string): Promise<GeoFeature[]>
  simulateImport(organizationId: string, fileName: string): Promise<AssetImportResult>
  validateDraft(draft: Partial<Asset>): ReturnType<typeof validateAssetDraft>
}

function filterAssets(query?: AssetQuery): Asset[] {
  let items = [...db.assets]
  const scenarioFilter = getMockRuntime().scenarioFilter
  if (scenarioFilter !== 'all') {
    const orgIds = new Set(
      db.organizations.filter((o) => o.scenarioId === scenarioFilter).map((o) => o.id),
    )
    items = items.filter((a) => orgIds.has(a.organizationId))
  }

  if (!query?.portfolioScope && query?.scopedOrganizationId) {
    items = items.filter((a) => a.organizationId === query.scopedOrganizationId)
  } else if (query?.organizationId) {
    items = items.filter((a) => a.organizationId === query.organizationId)
  }

  if (query?.assetType) {
    const types = Array.isArray(query.assetType) ? query.assetType : [query.assetType]
    items = items.filter((a) => types.includes(a.assetType))
  }
  if (query?.province) items = items.filter((a) => a.province === query.province)
  if (query?.district) items = items.filter((a) => a.district === query.district)
  if (query?.utilization) items = items.filter((a) => a.utilizationStatus === query.utilization)
  if (query?.encroachment) {
    items = items.filter((a) => a.encroachmentStatus === query.encroachment)
  }
  if (query?.litigation) items = items.filter((a) => a.litigationStatus === query.litigation)
  if (query?.evidenceStatus) {
    items = items.filter((a) => a.evidenceStatus === query.evidenceStatus)
  }
  if (query?.missingValuation) {
    items = items.filter((a) => a.marketValue == null || a.bookValue == null)
  }
  if (query?.search) {
    const q = query.search.toLowerCase()
    items = items.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.id.toLowerCase().includes(q) ||
        (a.identifier?.toLowerCase().includes(q) ?? false),
    )
  }
  return items
}

function summarize(items: Asset[], organizationId?: string): AssetSummary {
  const countByType: Record<string, number> = {}
  for (const t of Object.values(ASSET_TYPE)) countByType[t] = 0
  let totalBookValue = 0
  let totalMarketValue = 0
  let idleOrUnusedCount = 0
  let encroachedLandCount = 0
  let underLitigationCount = 0
  let missingValuationCount = 0
  let missingEvidenceCount = 0

  for (const a of items) {
    countByType[a.assetType] = (countByType[a.assetType] ?? 0) + 1
    totalBookValue += a.bookValue ?? 0
    totalMarketValue += a.marketValue ?? 0
    if (
      a.utilizationStatus === ASSET_UTILIZATION.IDLE ||
      a.utilizationStatus === ASSET_UTILIZATION.UNUSED
    ) {
      idleOrUnusedCount += 1
    }
    if (
      a.assetType === ASSET_TYPE.LAND &&
      a.encroachmentStatus === ENCROACHMENT_STATUS.ENCROACHED
    ) {
      encroachedLandCount += 1
    }
    if (a.litigationStatus === ASSET_LITIGATION_STATUS.ACTIVE) underLitigationCount += 1
    if (a.marketValue == null || a.bookValue == null) missingValuationCount += 1
    if (a.evidenceStatus === ASSET_EVIDENCE_STATUS.MISSING) missingEvidenceCount += 1
  }

  return {
    organizationId,
    totalCount: items.length,
    totalBookValue,
    totalMarketValue,
    countByType,
    idleOrUnusedCount,
    encroachedLandCount,
    underLitigationCount,
    missingValuationCount,
    missingEvidenceCount,
  }
}

function pushHistory(
  assetId: string,
  organizationId: string,
  eventType: AssetHistoryEvent['eventType'],
  summary: string,
  previousValue?: string,
  newValue?: string,
) {
  db.assetHistory.unshift({
    id: `ah-${assetId}-${Date.now()}`,
    assetId,
    organizationId,
    eventType,
    occurredAt: new Date().toISOString().slice(0, 10),
    summary,
    previousValue,
    newValue,
    actorLabel: 'Asset Officer',
  })
}

export const mockAssetService: AssetService = {
  async getAssets(query) {
    const filtered = filterAssets(query)
    const sorted = sortByKey(
      filtered as unknown as Array<Record<string, unknown>>,
      query?.sortBy ?? 'name',
      query?.sortDir ?? 'asc',
    ) as unknown as Asset[]
    return simulateLatency(paginate(sorted, query))
  },

  async getAsset(id) {
    const asset = db.assets.find((a) => a.id === id)
    if (!asset) throw new AppError('Asset not found', 'NOT_FOUND')
    return simulateLatency(asset)
  },

  async getSummary(query) {
    const items = filterAssets({
      organizationId: query?.organizationId,
      portfolioScope: query?.portfolioScope,
      scopedOrganizationId: query?.portfolioScope ? undefined : query?.organizationId,
    })
    return simulateLatency(summarize(items, query?.organizationId))
  },

  async createAsset(payload) {
    const issues = validateAssetDraft(payload).filter((i) => i.severity === 'error')
    if (issues.length) throw new AppError(issues.map((i) => i.message).join(' '), 'VALIDATION')

    const id = payload.id ?? `asset-new-${Date.now()}`
    const row: Asset = {
      ...payload,
      id,
      lastUpdated: new Date().toISOString().slice(0, 10),
      evidenceStatus: payload.evidenceStatus ?? ASSET_EVIDENCE_STATUS.MISSING,
    }
    db.assets.push(row)
    if (row.latitude != null && row.longitude != null) {
      db.geoFeatures.push({
        id: `geo-${id}`,
        assetId: id,
        organizationId: row.organizationId,
        type: 'Point',
        coordinates: [row.longitude, row.latitude],
        label: row.name,
      })
    }
    pushHistory(id, row.organizationId, ASSET_HISTORY_EVENT.CREATED, 'Asset created')
    return simulateMutation(row)
  },

  async updateAsset(id, patch) {
    const idx = db.assets.findIndex((a) => a.id === id)
    if (idx < 0) throw new AppError('Asset not found', 'NOT_FOUND')
    const previous = db.assets[idx]
    const next = {
      ...previous,
      ...patch,
      id,
      lastUpdated: new Date().toISOString().slice(0, 10),
    }
    const issues = validateAssetDraft(next).filter((i) => i.severity === 'error')
    if (issues.length) throw new AppError(issues.map((i) => i.message).join(' '), 'VALIDATION')
    db.assets[idx] = next

    if (patch.marketValue != null && patch.marketValue !== previous.marketValue) {
      pushHistory(
        id,
        next.organizationId,
        ASSET_HISTORY_EVENT.VALUATION_CHANGED,
        'Market valuation updated',
        String(previous.marketValue ?? ''),
        String(patch.marketValue),
      )
    }
    if (patch.utilizationStatus && patch.utilizationStatus !== previous.utilizationStatus) {
      pushHistory(
        id,
        next.organizationId,
        ASSET_HISTORY_EVENT.UTILIZATION_CHANGED,
        'Utilization status changed',
        previous.utilizationStatus,
        patch.utilizationStatus,
      )
    }
    if (patch.encroachmentStatus && patch.encroachmentStatus !== previous.encroachmentStatus) {
      pushHistory(
        id,
        next.organizationId,
        ASSET_HISTORY_EVENT.ENCROACHMENT_UPDATED,
        'Encroachment status updated',
        previous.encroachmentStatus,
        patch.encroachmentStatus,
      )
    }
    if (patch.disposed && !previous.disposed) {
      pushHistory(
        id,
        next.organizationId,
        ASSET_HISTORY_EVENT.DISPOSAL_RECORDED,
        'Disposal recorded',
        undefined,
        patch.disposalStatus,
      )
    }

    return simulateMutation(db.assets[idx])
  },

  async getHistory(assetId) {
    const items = db.assetHistory
      .filter((h) => h.assetId === assetId)
      .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
    return simulateLatency(items)
  },

  async getDocuments(assetId) {
    const items = db.documents.filter(
      (d) => d.linkedRecordType === 'asset' && d.linkedRecordId === assetId,
    )
    return simulateLatency(items)
  },

  async getGeoForAsset(assetId) {
    return simulateLatency(db.geoFeatures.find((g) => g.assetId === assetId))
  },

  async getGeoForOrganization(organizationId) {
    return simulateLatency(db.geoFeatures.filter((g) => g.organizationId === organizationId))
  },

  async simulateImport(organizationId, fileName) {
    await new Promise((r) => setTimeout(r, 700))
    const accepted = 4 + (fileName.length % 5)
    const warnings = 1 + (fileName.length % 2)
    const rejected = fileName.toLowerCase().includes('bad') ? 2 : 0
    const createdIds: string[] = []

    for (let i = 0; i < accepted; i++) {
      const id = `asset-imp-${Date.now()}-${i}`
      createdIds.push(id)
      const org = db.organizations.find((o) => o.id === organizationId)
      db.assets.push({
        id,
        organizationId,
        assetType: ASSET_TYPE.OTHER_EQUIPMENT,
        name: `Imported asset ${i + 1} (${fileName})`,
        identifier: `IMP-${i + 1}`,
        bookValue: 1_000_000 * (i + 1),
        marketValue: 1_100_000 * (i + 1),
        utilizationStatus: ASSET_UTILIZATION.UTILIZED,
        utilizationPercent: 70,
        litigationStatus: ASSET_LITIGATION_STATUS.CLEAR,
        encroachmentStatus: ENCROACHMENT_STATUS.CLEAR,
        evidenceStatus: ASSET_EVIDENCE_STATUS.PARTIAL,
        province: org?.headOfficeAddress.includes('Karachi') ? 'Sindh' : 'Punjab',
        district: 'Import staging',
        equipmentCategory: 'tools',
        lastUpdated: new Date().toISOString().slice(0, 10),
      })
      pushHistory(id, organizationId, ASSET_HISTORY_EVENT.CREATED, 'Created via mock import')
    }

    db.timeline.push({
      id: `tl-asset-imp-${Date.now()}`,
      organizationId,
      occurredAt: new Date().toISOString(),
      title: `Asset import checked: ${fileName} (+${accepted})`,
      category: 'import',
    })

    return simulateMutation({
      accepted,
      warnings,
      rejected,
      createdIds,
      message:
        'Demo validation only — no real Excel parsing. Accepted rows appended to registry.',
    })
  },

  validateDraft(draft) {
    return validateAssetDraft(draft)
  },
}

export function valuationVariance(asset: Asset): number | null {
  if (asset.bookValue == null || asset.marketValue == null || asset.bookValue === 0) return null
  return Math.round(((asset.marketValue - asset.bookValue) / asset.bookValue) * 1000) / 10
}

export function isUnderutilizedByThreshold(asset: Asset): boolean {
  if (asset.utilizationStatus === ASSET_UTILIZATION.UNDERUTILIZED) return true
  if (asset.utilizationPercent == null) return false
  return asset.utilizationPercent < ASSET_UNDERUTILIZED_THRESHOLD_PCT
}
