import { beforeEach, describe, expect, it } from 'vitest'
import { DOCUMENT_EVIDENCE_STATUS, ROLE } from '@/constants'
import { resetMockDb } from '@/mock-data'
import { resetMockRuntime } from '@/mock-data/runtime'
import { mockDocumentService, mockHistoryIntelligenceService } from '@/mock-services'
import { hasPermission, PERMISSION } from '@/permissions'

describe('Phase 12 documents & historical intelligence', () => {
  beforeEach(() => {
    resetMockDb()
    resetMockRuntime()
  })

  it('lists documents with filters and version family order', async () => {
    const page = await mockDocumentService.getDocuments({
      organizationId: 'org-psm',
      pageSize: 50,
    })
    expect(page.items.length).toBeGreaterThan(0)

    const family = page.items.find((d) => d.documentFamilyId?.includes('fin-statements'))
    expect(family).toBeTruthy()
    const versions = await mockDocumentService.getVersions(family!.documentFamilyId)
    expect(versions.length).toBeGreaterThanOrEqual(2)
    expect(versions[0]!.version).toBeLessThanOrEqual(versions[versions.length - 1]!.version)
    expect(versions.some((v) => v.evidenceStatus === DOCUMENT_EVIDENCE_STATUS.SUPERSEDED)).toBe(
      true,
    )
  })

  it('resolves record-linked attachments and missing evidence', async () => {
    const landDocs = await mockDocumentService.getDocuments({
      organizationId: 'org-psm',
      linkedRecordType: 'asset',
      pageSize: 100,
    })
    expect(landDocs.items.some((d) => d.linkedRecordType === 'asset')).toBe(true)

    const missing = (
      await mockDocumentService.getDocuments({
        evidenceStatus: DOCUMENT_EVIDENCE_STATUS.MISSING,
        pageSize: 20,
      })
    ).items[0]
    expect(missing).toBeTruthy()

    if (missing?.linkedRecordType && missing.linkedRecordId) {
      const forRecord = await mockDocumentService.getForRecord(
        missing.linkedRecordType,
        missing.linkedRecordId,
      )
      expect(forRecord.some((d) => d.id === missing.id)).toBe(true)
    }
  })

  it('supports mock replace and verify flows', async () => {
    const pending = (
      await mockDocumentService.getDocuments({
        evidenceStatus: DOCUMENT_EVIDENCE_STATUS.PENDING_REVIEW,
        pageSize: 20,
      })
    ).items[0]
    expect(pending).toBeTruthy()

    const replaced = await mockDocumentService.replaceDocument(pending!.id, {
      fileName: 'replaced-evidence-v2.pdf',
      notes: 'Clarification revision',
      uploadedBy: ROLE.SOE_FOCAL_PERSON,
    })
    expect(replaced.version).toBeGreaterThan(pending!.version)
    expect(replaced.documentFamilyId).toBe(pending!.documentFamilyId)

    const verified = await mockDocumentService.updateEvidenceStatus(
      replaced.id,
      DOCUMENT_EVIDENCE_STATUS.VERIFIED,
      ROLE.MOIP_REVIEWER,
    )
    expect(verified.evidenceStatus).toBe(DOCUMENT_EVIDENCE_STATUS.VERIFIED)
  })

  it('orders submission history and exposes enterprise timeline', async () => {
    const hist = await mockHistoryIntelligenceService.getSubmissionHistory('org-psm', {
      module: 'finance',
    })
    expect(hist.length).toBeGreaterThan(3)
    const times = hist.map((h) => h.occurredAt)
    expect(times).toEqual([...times].sort((a, b) => a.localeCompare(b)))

    const ent = await mockHistoryIntelligenceService.getEnterpriseTimeline('org-psm')
    expect(ent.length).toBeGreaterThan(0)
  })

  it('provides three KPI lineage paths across domains', async () => {
    const paths = await mockHistoryIntelligenceService.getLineagePaths()
    expect(paths.length).toBeGreaterThanOrEqual(3)
    const domains = new Set(paths.map((p) => p.domain))
    expect(domains.has('finance')).toBe(true)
    expect(domains.has('asset')).toBe(true)
    expect(domains.has('governance')).toBe(true)
    const kinds = new Set(paths.flatMap((p) => p.nodes.map((n) => n.kind)))
    expect(kinds.has('kpi')).toBe(true)
    expect(kinds.has('evidence')).toBe(true)
    expect(kinds.has('submission')).toBe(true)
  })

  it('respects document verify permission for MoIP vs SOE focal', () => {
    expect(hasPermission(ROLE.MOIP_REVIEWER, PERMISSION.DOCUMENT_VERIFY)).toBe(true)
    expect(hasPermission(ROLE.SOE_FOCAL_PERSON, PERMISSION.DOCUMENT_VERIFY)).toBe(false)
    expect(hasPermission(ROLE.SOE_FOCAL_PERSON, PERMISSION.DOCUMENT_UPLOAD)).toBe(true)
    expect(hasPermission(ROLE.ASSURANCE_USER, PERMISSION.DOCUMENT_READ)).toBe(true)
    expect(hasPermission(ROLE.ASSURANCE_USER, PERMISSION.DOCUMENT_UPLOAD)).toBe(false)
  })

  it('restricts sensitive document preview for non-privileged roles', async () => {
    const cabinet = await mockDocumentService.getDocument('doc-psm-cabinet', ROLE.SOE_FOCAL_PERSON)
    expect(cabinet.isRestricted).toBe(true)
    expect(cabinet.previewAllowed).toBe(false)

    const asVerifier = await mockDocumentService.getDocument(
      'doc-psm-cabinet',
      ROLE.MOIP_REVIEWER,
    )
    expect(asVerifier.previewAllowed).toBe(true)
  })
})
