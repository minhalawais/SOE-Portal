import { SUBMISSION_STATUS } from '@/constants'
import { db } from '@/mock-data'
import type { Clarification, Submission, TimelineEvent } from '@/types/domain'
import { AppError, simulateLatency, simulateMutation } from '@/utils'

export interface SubmissionService {
  getSubmissions(organizationId?: string, reportingPeriodId?: string): Promise<Submission[]>
  getSubmission(id: string): Promise<Submission>
  certifySubmission(id: string): Promise<Submission>
  submitReportingPeriod(id: string): Promise<Submission>
  requestClarification(id: string, question: string): Promise<Clarification>
  respondClarification(clarificationId: string): Promise<Clarification>
  approveSubmission(id: string): Promise<Submission>
  getClarifications(organizationId?: string): Promise<Clarification[]>
  getTimeline(organizationId?: string): Promise<TimelineEvent[]>
}

function findSubmission(id: string) {
  const idx = db.submissions.findIndex((s) => s.id === id)
  if (idx < 0) throw new AppError('Submission not found', 'NOT_FOUND')
  return idx
}

function touch(idx: number, patch: Partial<Submission>) {
  const current = db.submissions[idx]
  if (current.status === SUBMISSION_STATUS.LOCKED) {
    throw new AppError('Locked submissions are immutable', 'VALIDATION')
  }
  db.submissions[idx] = {
    ...current,
    ...patch,
    id: current.id,
    updatedAt: new Date().toISOString(),
  }
  return db.submissions[idx]
}

export const mockSubmissionService: SubmissionService = {
  async getSubmissions(organizationId, reportingPeriodId) {
    let items = [...db.submissions]
    if (organizationId) items = items.filter((s) => s.organizationId === organizationId)
    if (reportingPeriodId) {
      items = items.filter((s) => s.reportingPeriodId === reportingPeriodId)
    }
    return simulateLatency(items)
  },
  async getSubmission(id) {
    const row = db.submissions.find((s) => s.id === id)
    if (!row) throw new AppError('Submission not found', 'NOT_FOUND')
    return simulateLatency(row)
  },
  async certifySubmission(id) {
    const idx = findSubmission(id)
    const current = db.submissions[idx]
    if (
      current.status !== SUBMISSION_STATUS.READY_FOR_CERTIFICATION &&
      current.status !== SUBMISSION_STATUS.READY_FOR_REVIEW
    ) {
      throw new AppError('Submission is not ready for certification', 'VALIDATION')
    }
    return simulateMutation(touch(idx, { status: SUBMISSION_STATUS.CERTIFIED }))
  },
  async submitReportingPeriod(id) {
    const idx = findSubmission(id)
    const current = db.submissions[idx]
    if (
      current.status !== SUBMISSION_STATUS.CERTIFIED &&
      current.status !== SUBMISSION_STATUS.RESUBMITTED
    ) {
      throw new AppError('Only certified or resubmitted packs can be submitted', 'VALIDATION')
    }
    return simulateMutation(touch(idx, { status: SUBMISSION_STATUS.SUBMITTED }))
  },
  async requestClarification(id, question) {
    const idx = findSubmission(id)
    touch(idx, { status: SUBMISSION_STATUS.CLARIFICATION_REQUESTED })
    const clarification: Clarification = {
      id: `clar-${id}-${Date.now()}`,
      submissionId: id,
      organizationId: db.submissions[idx].organizationId,
      question,
      status: 'open',
      createdAt: new Date().toISOString(),
    }
    db.clarifications.push(clarification)
    db.tasks.push({
      id: `task-clar-${clarification.id}`,
      organizationId: clarification.organizationId,
      title: 'Respond to MoIP clarification',
      dueDate: '2026-08-20',
      priority: 'high',
      status: 'open',
      ownerRole: 'soe_focal_person',
      linkedRecordType: 'clarification',
      linkedRecordId: clarification.id,
    })
    return simulateMutation(clarification)
  },
  async respondClarification(clarificationId) {
    const idx = db.clarifications.findIndex((c) => c.id === clarificationId)
    if (idx < 0) throw new AppError('Clarification not found', 'NOT_FOUND')
    db.clarifications[idx] = { ...db.clarifications[idx], status: 'responded' }
    const subIdx = findSubmission(db.clarifications[idx].submissionId)
    const currentVersion = Number.parseFloat(db.submissions[subIdx].version || '0.0')
    touch(subIdx, {
      status: SUBMISSION_STATUS.RESUBMITTED,
      version: Number.isFinite(currentVersion) ? (currentVersion + 0.1).toFixed(1) : '1.1',
    })
    return simulateMutation(db.clarifications[idx])
  },
  async approveSubmission(id) {
    const idx = findSubmission(id)
    const current = db.submissions[idx]
    if (
      current.status !== SUBMISSION_STATUS.SUBMITTED &&
      current.status !== SUBMISSION_STATUS.UNDER_REVIEW &&
      current.status !== SUBMISSION_STATUS.RESUBMITTED
    ) {
      throw new AppError('Submission is not eligible for approval', 'VALIDATION')
    }
    // Approve then lock as immutable snapshot in one write (prototype consequence)
    db.submissions[idx] = {
      ...current,
      status: SUBMISSION_STATUS.LOCKED,
      version: '1.0',
      updatedAt: new Date().toISOString(),
    }
    db.timeline.push({
      id: `tl-approve-${id}-${Date.now()}`,
      organizationId: current.organizationId,
      occurredAt: new Date().toISOString(),
      title: `Submission ${id} approved and locked`,
      category: 'workflow',
    })
    return simulateMutation(db.submissions[idx])
  },
  async getClarifications(organizationId) {
    let items = [...db.clarifications]
    if (organizationId) items = items.filter((c) => c.organizationId === organizationId)
    return simulateLatency(items)
  },
  async getTimeline(organizationId) {
    let items = [...db.timeline]
    if (organizationId) items = items.filter((t) => t.organizationId === organizationId)
    return simulateLatency(items)
  },
}
