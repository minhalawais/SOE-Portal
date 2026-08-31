import { beforeEach, describe, expect, it } from 'vitest'
import { MODULE, ROLE, SUBMISSION_STATUS } from '@/constants'
import { db, resetMockDb } from '@/mock-data'
import { mockIntelligentImportService } from '@/mock-services/intelligentImport.service'

describe('frontend intelligent data import', () => {
  beforeEach(() => resetMockDb())

  it('extracts candidate rows without inserting before user approval', async () => {
    const documentCount = db.documents.length
    const timelineCount = db.timeline.length
    const batch = await mockIntelligentImportService.processFiles(
      [new File(['dummy pdf content'], 'TUSDEC_financial_statement.pdf', { type: 'application/pdf' })],
      {
        portal: 'soe_entry',
        organizationId: 'org-tusdec',
        reportingPeriodId: 'period-fy2027',
        role: ROLE.SOE_FOCAL_PERSON,
      },
    )

    expect(batch.status).toBe('review')
    expect(batch.rows.length).toBeGreaterThan(0)
    expect(batch.rows.every((row) => row.organizationId === 'org-tusdec')).toBe(true)
    expect(batch.rows.every((row) => row.module === MODULE.FINANCE)).toBe(true)
    expect(db.documents).toHaveLength(documentCount)
    expect(db.timeline).toHaveLength(timelineCount)
  })

  it('approves selected rows, registers source evidence and updates editable submission readiness', async () => {
    const submission = db.submissions.find((item) =>
      item.organizationId === 'org-tusdec'
      && item.reportingPeriodId === 'period-fy2027'
      && item.module === MODULE.WORKFORCE)
    expect(submission).toBeDefined()
    if (!submission) return
    submission.status = SUBMISSION_STATUS.IN_PROGRESS
    submission.completeness = 45
    const initialCompleteness = submission.completeness

    const batch = await mockIntelligentImportService.processFiles(
      [new File(['employee,total\nPermanent,842'], 'TUSDEC_workforce.csv', { type: 'text/csv' })],
      {
        portal: 'soe_entry',
        organizationId: 'org-tusdec',
        reportingPeriodId: 'period-fy2027',
        role: ROLE.SOE_FOCAL_PERSON,
      },
    )
    batch.rows.forEach((row) => { row.selected = true })
    const approved = await mockIntelligentImportService.approveBatch(batch, ROLE.SOE_FOCAL_PERSON)

    expect(approved.status).toBe('approved')
    expect(approved.insertedRows).toBeGreaterThan(0)
    expect(submission.completeness).toBeGreaterThan(initialCompleteness)
    expect(db.documents.some((item) => item.linkedRecordId === batch.id)).toBe(true)
    expect(db.timeline.some((item) => item.action === 'ai_import_approved')).toBe(true)
  })

  it('detects a named SOE for a MOIP cross-enterprise import', async () => {
    const batch = await mockIntelligentImportService.processFiles(
      [new File(['workbook'], 'PSM_asset_register.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })],
      {
        portal: 'moip_review',
        organizationId: 'org-tusdec',
        reportingPeriodId: 'period-fy2027',
        role: ROLE.MOIP_REVIEWER,
      },
    )

    expect(batch.rows.every((row) => row.organizationLabel === 'PSM')).toBe(true)
    expect(batch.rows.every((row) => row.module === MODULE.ASSETS)).toBe(true)
  })

  it('rejects unsupported file types', async () => {
    await expect(mockIntelligentImportService.processFiles(
      [new File(['text'], 'notes.txt', { type: 'text/plain' })],
      {
        portal: 'soe_entry',
        organizationId: 'org-tusdec',
        reportingPeriodId: 'period-fy2027',
        role: ROLE.SOE_FOCAL_PERSON,
      },
    )).rejects.toThrow('not a supported Excel, CSV or PDF file')
  })
})
