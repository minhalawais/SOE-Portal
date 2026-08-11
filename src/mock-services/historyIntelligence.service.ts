import { db } from '@/mock-data'
import type {
  FieldChangeRecord,
  LineagePath,
  SubmissionHistoryEvent,
  TimelineEvent,
} from '@/types/domain'
import { AppError, simulateLatency } from '@/utils'

export interface HistoryIntelligenceService {
  getSubmissionHistory(
    organizationId: string,
    opts?: { submissionId?: string; module?: string },
  ): Promise<SubmissionHistoryEvent[]>
  getFieldChanges(
    organizationId: string,
    recordType?: string,
    recordId?: string,
  ): Promise<FieldChangeRecord[]>
  getUnifiedTimeline(
    organizationId: string,
    opts?: { category?: string; limit?: number },
  ): Promise<TimelineEvent[]>
  getEnterpriseTimeline(organizationId: string): Promise<TimelineEvent[]>
  getLineagePaths(organizationId?: string): Promise<LineagePath[]>
  getLineagePath(id: string): Promise<LineagePath>
}

function mapEnterpriseToTimeline(): TimelineEvent[] {
  return db.enterpriseHistory.map((e) => ({
    id: `ent-tl-${e.id}`,
    organizationId: e.organizationId,
    occurredAt: e.occurredAt.includes('T') ? e.occurredAt : `${e.occurredAt}T00:00:00Z`,
    title: e.summary,
    category: 'enterprise',
    action: e.eventType,
    linkedRecordType: 'organization',
    linkedRecordId: e.organizationId,
  }))
}

function mapAssetHistory(): TimelineEvent[] {
  return db.assetHistory.slice(0, 80).map((e) => ({
    id: `asset-tl-${e.id}`,
    organizationId: e.organizationId,
    occurredAt: e.occurredAt.includes('T') ? e.occurredAt : `${e.occurredAt}T00:00:00Z`,
    title: e.summary,
    category: 'asset',
    action: e.eventType,
    actorRole: e.actorLabel,
    linkedRecordType: 'asset',
    linkedRecordId: e.assetId,
  }))
}

function mapAccountabilityHistory(): TimelineEvent[] {
  return db.accountabilityHistory.map((e) => ({
    id: `acc-tl-${e.id}`,
    organizationId: e.organizationId,
    occurredAt: e.occurredAt,
    title: e.title,
    category: e.recordType,
    actorRole: e.actor,
    linkedRecordType: e.recordType,
    linkedRecordId: e.recordId,
  }))
}

export const mockHistoryIntelligenceService: HistoryIntelligenceService = {
  async getSubmissionHistory(organizationId, opts) {
    let items = [...db.submissionHistory]
    items = items.filter((e) => e.organizationId === organizationId)
    if (opts?.submissionId) items = items.filter((e) => e.submissionId === opts.submissionId)
    if (opts?.module) items = items.filter((e) => e.module === opts.module)
    items.sort((a, b) => a.occurredAt.localeCompare(b.occurredAt))
    return simulateLatency(items)
  },
  async getFieldChanges(organizationId, recordType, recordId) {
    let items = db.fieldChanges.filter((f) => f.organizationId === organizationId)
    if (recordType) items = items.filter((f) => f.recordType === recordType)
    if (recordId) items = items.filter((f) => f.recordId === recordId)
    items.sort((a, b) => b.changedAt.localeCompare(a.changedAt))
    return simulateLatency(items)
  },
  async getUnifiedTimeline(organizationId, opts) {
    let items = [
      ...db.timeline.filter((t) => t.organizationId === organizationId),
      ...db.submissionHistory
        .filter((s) => s.organizationId === organizationId)
        .map(
          (s): TimelineEvent => ({
            id: `subhist-${s.id}`,
            organizationId: s.organizationId,
            occurredAt: s.occurredAt,
            title: `${s.action}: ${s.module}`,
            category: 'submission',
            actorRole: s.actorRole,
            action: s.action,
            status: s.status,
            comment: s.comment,
            relatedVersion: s.relatedVersion,
            linkedRecordType: 'submission',
            linkedRecordId: s.submissionId,
          }),
        ),
      ...mapAccountabilityHistory().filter((t) => t.organizationId === organizationId),
    ]
    if (opts?.category) items = items.filter((t) => t.category === opts.category)
    items.sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
    if (opts?.limit) items = items.slice(0, opts.limit)
    return simulateLatency(items)
  },
  async getEnterpriseTimeline(organizationId) {
    const significantAsset = mapAssetHistory()
      .filter((t) => t.organizationId === organizationId)
      .filter((t) => /litigation|disposal|valuation|encroach/i.test(t.title))
    const items = [
      ...mapEnterpriseToTimeline().filter((t) => t.organizationId === organizationId),
      ...db.timeline.filter(
        (t) =>
          t.organizationId === organizationId &&
          ['workflow', 'evidence', 'governance', 'privatization'].includes(t.category),
      ),
      ...significantAsset.slice(0, 8),
      ...db.submissionHistory
        .filter(
          (s) =>
            s.organizationId === organizationId &&
            (s.action === 'approval' || s.action === 'lock' || s.action === 'certification'),
        )
        .map(
          (s): TimelineEvent => ({
            id: `ent-sub-${s.id}`,
            organizationId: s.organizationId,
            occurredAt: s.occurredAt,
            title: `Financial submission ${s.action}`,
            category: 'finance',
            actorRole: s.actorRole,
            status: s.status,
            relatedVersion: s.relatedVersion,
          }),
        ),
    ]
    // Dedupe by id
    const seen = new Set<string>()
    const unique = items.filter((i) => {
      if (seen.has(i.id)) return false
      seen.add(i.id)
      return true
    })
    unique.sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
    return simulateLatency(unique)
  },
  async getLineagePaths(organizationId) {
    let items = [...db.lineagePaths]
    if (organizationId) items = items.filter((p) => p.organizationId === organizationId)
    return simulateLatency(items)
  },
  async getLineagePath(id) {
    const row = db.lineagePaths.find((p) => p.id === id)
    if (!row) throw new AppError('Lineage path not found', 'NOT_FOUND')
    return simulateLatency(row)
  },
}
