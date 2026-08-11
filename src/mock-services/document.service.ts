import { DOCUMENT_EVIDENCE_STATUS } from '@/constants'
import { db } from '@/mock-data'
import { paginate } from '@/mock-services/_helpers'
import type {
  DocumentEvidenceStatus,
  DocumentMeta,
  ListQuery,
  PagedResult,
} from '@/types/domain'
import { AppError, simulateLatency, simulateMutation } from '@/utils'
import type { RoleId } from '@/constants'
import { hasPermission, PERMISSION } from '@/permissions'

export type DocumentQuery = ListQuery & {
  linkedRecordId?: string
  linkedRecordType?: string
  category?: string
  linkedModule?: string
  reportingPeriodId?: string
  evidenceStatus?: string
  uploadedBy?: string
  documentFamilyId?: string
}

function normalizeDoc(row: DocumentMeta): DocumentMeta {
  const evidenceStatus =
    (row.evidenceStatus as DocumentEvidenceStatus) ||
    (row.status as DocumentEvidenceStatus) ||
    DOCUMENT_EVIDENCE_STATUS.AVAILABLE
  return {
    ...row,
    documentFamilyId: row.documentFamilyId || row.id,
    evidenceStatus,
    status: evidenceStatus,
    fileType: row.fileType ?? guessFileType(row.fileName),
    isDummyDemonstrationData: true,
  }
}

function guessFileType(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase()
  if (ext === 'pdf') return 'pdf'
  if (ext === 'xlsx' || ext === 'xls') return 'spreadsheet'
  if (ext === 'docx' || ext === 'doc') return 'document'
  if (ext === 'png' || ext === 'jpg' || ext === 'jpeg') return 'image'
  return 'other'
}

function canPreview(doc: DocumentMeta, role: RoleId): boolean {
  if (!doc.isRestricted && !doc.isSensitive) return true
  if (hasPermission(role, PERMISSION.DOCUMENT_VERIFY)) return true
  if (hasPermission(role, PERMISSION.SENSITIVE_PERSONAL_READ) && doc.isSensitive) return true
  return false
}

export interface DocumentService {
  getDocuments(query?: DocumentQuery): Promise<PagedResult<DocumentMeta>>
  getDocument(id: string, role?: RoleId): Promise<DocumentMeta & { previewAllowed: boolean }>
  getVersions(documentFamilyId: string): Promise<DocumentMeta[]>
  getForRecord(recordType: string, recordId: string): Promise<DocumentMeta[]>
  createDocument(
    payload: Omit<
      DocumentMeta,
      'id' | 'version' | 'documentFamilyId' | 'isDummyDemonstrationData' | 'uploadedAt'
    > & {
      id?: string
      documentFamilyId?: string
      version?: number
      uploadedAt?: string
    },
  ): Promise<DocumentMeta>
  replaceDocument(
    previousId: string,
    payload: { title?: string; fileName: string; notes?: string; uploadedBy: string },
  ): Promise<DocumentMeta>
  updateEvidenceStatus(
    id: string,
    evidenceStatus: DocumentEvidenceStatus,
    role: RoleId,
  ): Promise<DocumentMeta>
}

export const mockDocumentService: DocumentService = {
  async getDocuments(query) {
    let items = db.documents.map(normalizeDoc)
    if (query?.organizationId) {
      items = items.filter((d) => d.organizationId === query.organizationId)
    }
    if (query?.linkedRecordId) {
      items = items.filter((d) => d.linkedRecordId === query.linkedRecordId)
    }
    if (query?.linkedRecordType) {
      items = items.filter((d) => d.linkedRecordType === query.linkedRecordType)
    }
    if (query?.category) items = items.filter((d) => d.category === query.category)
    if (query?.linkedModule) items = items.filter((d) => d.linkedModule === query.linkedModule)
    if (query?.reportingPeriodId) {
      items = items.filter((d) => d.reportingPeriodId === query.reportingPeriodId)
    }
    if (query?.evidenceStatus) {
      items = items.filter((d) => d.evidenceStatus === query.evidenceStatus)
    }
    if (query?.uploadedBy) items = items.filter((d) => d.uploadedBy === query.uploadedBy)
    if (query?.documentFamilyId) {
      items = items.filter((d) => d.documentFamilyId === query.documentFamilyId)
    }
    if (query?.search) {
      const q = query.search.toLowerCase()
      items = items.filter(
        (d) =>
          d.title.toLowerCase().includes(q) ||
          d.fileName.toLowerCase().includes(q) ||
          d.category.toLowerCase().includes(q) ||
          (d.linkedRecordId ?? '').toLowerCase().includes(q) ||
          d.id.toLowerCase().includes(q),
      )
    }
    items.sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt))
    return simulateLatency(paginate(items, query))
  },
  async getDocument(id, role) {
    const row = db.documents.find((d) => d.id === id)
    if (!row) throw new AppError('Document not found', 'NOT_FOUND')
    const doc = normalizeDoc(row)
    const previewAllowed = role ? canPreview(doc, role) : !doc.isRestricted
    return simulateLatency({ ...doc, previewAllowed })
  },
  async getVersions(documentFamilyId) {
    return simulateLatency(
      db.documents
        .map(normalizeDoc)
        .filter((d) => d.documentFamilyId === documentFamilyId)
        .sort((a, b) => a.version - b.version),
    )
  },
  async getForRecord(recordType, recordId) {
    return simulateLatency(
      db.documents
        .map(normalizeDoc)
        .filter((d) => d.linkedRecordType === recordType && d.linkedRecordId === recordId)
        .sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt)),
    )
  },
  async createDocument(payload) {
    const id = payload.id ?? `doc-${Date.now()}`
    const family = payload.documentFamilyId ?? id
    const evidenceStatus =
      (payload.evidenceStatus as DocumentEvidenceStatus) ||
      DOCUMENT_EVIDENCE_STATUS.AVAILABLE
    const row: DocumentMeta = {
      ...payload,
      id,
      documentFamilyId: family,
      version: payload.version ?? 1,
      uploadedAt: payload.uploadedAt ?? new Date().toISOString(),
      evidenceStatus,
      status: evidenceStatus,
      fileType: payload.fileType ?? guessFileType(payload.fileName),
      isDummyDemonstrationData: true,
    }
    db.documents.push(row)
    db.timeline.push({
      id: `tl-doc-${id}`,
      organizationId: row.organizationId,
      occurredAt: row.uploadedAt,
      title: `Document uploaded: ${row.title}`,
      category: 'evidence',
      actorRole: row.uploadedBy,
      action: 'upload',
      status: evidenceStatus,
      linkedRecordType: row.linkedRecordType,
      linkedRecordId: row.linkedRecordId,
    })
    return simulateMutation(normalizeDoc(row))
  },
  async replaceDocument(previousId, payload) {
    const prevIdx = db.documents.findIndex((d) => d.id === previousId)
    if (prevIdx < 0) throw new AppError('Document not found', 'NOT_FOUND')
    const prev = normalizeDoc(db.documents[prevIdx])
    db.documents[prevIdx] = {
      ...prev,
      evidenceStatus: DOCUMENT_EVIDENCE_STATUS.SUPERSEDED,
      status: DOCUMENT_EVIDENCE_STATUS.SUPERSEDED,
    }
    const nextVersion = prev.version + 1
    const id = `doc-${prev.documentFamilyId}-v${nextVersion}-${Date.now()}`
    const row: DocumentMeta = {
      ...prev,
      id,
      title: payload.title ?? prev.title,
      fileName: payload.fileName,
      uploadedAt: new Date().toISOString(),
      uploadedBy: payload.uploadedBy,
      version: nextVersion,
      documentFamilyId: prev.documentFamilyId,
      evidenceStatus: DOCUMENT_EVIDENCE_STATUS.PENDING_REVIEW,
      status: DOCUMENT_EVIDENCE_STATUS.PENDING_REVIEW,
      notes: payload.notes,
      supersedesDocumentId: previousId,
      isDummyDemonstrationData: true,
    }
    db.documents.push(row)
    return simulateMutation(normalizeDoc(row))
  },
  async updateEvidenceStatus(id, evidenceStatus, role) {
    if (
      evidenceStatus === DOCUMENT_EVIDENCE_STATUS.VERIFIED &&
      !hasPermission(role, PERMISSION.DOCUMENT_VERIFY)
    ) {
      throw new AppError('Permission denied to verify evidence', 'PERMISSION')
    }
    const idx = db.documents.findIndex((d) => d.id === id)
    if (idx < 0) throw new AppError('Document not found', 'NOT_FOUND')
    db.documents[idx] = {
      ...normalizeDoc(db.documents[idx]),
      evidenceStatus,
      status: evidenceStatus,
    }
    return simulateMutation(db.documents[idx])
  },
}
