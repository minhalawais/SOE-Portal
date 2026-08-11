import { MODULE, ROLE, SUBMISSION_STATUS, type RoleId, type SubmissionStatus } from '@/constants'
import { db } from '@/mock-data'
import type {
  ApprovedFinanceKpi,
  Clarification,
  DocumentMeta,
  FinancialMetric,
  FinancialVersionSnapshot,
  NotificationItem,
  Organization,
  ReportingPeriod,
  Submission,
  TimelineEvent,
} from '@/types/domain'
import { AppError, simulateLatency, simulateMutation } from '@/utils'
import {
  bumpVersion,
  canTransition,
  getActionOwnerLabel,
  getAvailableActions,
  getNextActionHint,
  isImmutableStatus,
  type WorkflowActionDef,
} from '@/workflow/submission'
import {
  hasBlockingIssues,
  validateFinanceDraft,
  type ValidationIssue,
} from '@/workflow/financeValidation'
import { hasPermission, PERMISSION } from '@/permissions'

const FINANCE_SUB_ID = (orgAbbr: string) =>
  `sub-${orgAbbr.toLowerCase()}-finance-fy2027`

export interface FinanceWorkspace {
  organization: Organization
  period: ReportingPeriod
  previousPeriod: ReportingPeriod | null
  current: FinancialMetric
  previous: FinancialMetric | null
  submission: Submission
  evidence: DocumentMeta[]
  clarifications: Clarification[]
  timeline: TimelineEvent[]
  versions: FinancialVersionSnapshot[]
  validation: ValidationIssue[]
  availableActions: WorkflowActionDef[]
  nextActionHint: string
  actionOwner: string
  readOnly: boolean
  percentChange: {
    revenue: number | null
    operatingExpenses: number | null
    profitOrLoss: number | null
    subsidies: number | null
  }
}

function orgAbbr(organizationId: string): string {
  const org = db.organizations.find((o) => o.id === organizationId)
  if (!org) throw new AppError('Organization not found', 'NOT_FOUND')
  return org.abbreviation
}

function findFinanceSubmission(organizationId: string, reportingPeriodId: string): Submission {
  const row = db.submissions.find(
    (s) =>
      s.organizationId === organizationId &&
      s.reportingPeriodId === reportingPeriodId &&
      s.module === MODULE.FINANCE,
  )
  if (!row) throw new AppError('Finance submission not found', 'NOT_FOUND')
  return row
}

function syncStatuses(submissionId: string, financialId: string, status: Submission['status']) {
  const sIdx = db.submissions.findIndex((s) => s.id === submissionId)
  const fIdx = db.financialMetrics.findIndex((f) => f.id === financialId)
  if (sIdx >= 0) {
    if (db.submissions[sIdx].status === SUBMISSION_STATUS.LOCKED) {
      throw new AppError('Locked submissions are immutable', 'VALIDATION')
    }
    db.submissions[sIdx] = {
      ...db.submissions[sIdx],
      status,
      updatedAt: new Date().toISOString(),
    }
  }
  if (fIdx >= 0) {
    if (db.financialMetrics[fIdx].status === SUBMISSION_STATUS.LOCKED) {
      throw new AppError('Locked financial records are immutable', 'VALIDATION')
    }
    db.financialMetrics[fIdx] = { ...db.financialMetrics[fIdx], status }
  }
}

function pushTimeline(
  organizationId: string,
  title: string,
  category: string,
): void {
  db.timeline.push({
    id: `tl-${organizationId}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    organizationId,
    occurredAt: new Date().toISOString(),
    title,
    category,
  })
}

function pushNotification(n: Omit<NotificationItem, 'id' | 'createdAt' | 'status'>): void {
  db.notifications.unshift({
    ...n,
    id: `notif-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    createdAt: new Date().toISOString(),
    status: 'unread',
  })
}

function captureVersion(
  metric: FinancialMetric,
  reason: string,
  version: string,
): void {
  db.financeVersions.push({
    id: `fver-${metric.id}-${version}-${Date.now()}`,
    financialMetricId: metric.id,
    organizationId: metric.organizationId,
    reportingPeriodId: metric.reportingPeriodId,
    version,
    capturedAt: new Date().toISOString(),
    reason,
    values: {
      revenue: metric.revenue,
      operatingExpenses: metric.operatingExpenses,
      capex: metric.capex,
      profitOrLoss: metric.profitOrLoss,
      cashFlow: metric.cashFlow,
      workingCapital: metric.workingCapital,
      subsidies: metric.subsidies,
      governmentSupport: metric.governmentSupport,
    },
  })
}

function pctChange(current: number, previous: number | undefined): number | null {
  if (previous === undefined || previous === 0) return null
  return Math.round(((current - previous) / Math.abs(previous)) * 1000) / 10
}

function requireRolePermission(role: RoleId, permission: typeof PERMISSION[keyof typeof PERMISSION]) {
  if (!hasPermission(role, permission)) {
    throw new AppError('Permission denied for this workflow action', 'PERMISSION')
  }
}

export interface FinanceWorkflowService {
  getWorkspace(
    organizationId: string,
    reportingPeriodId: string,
    role: RoleId,
  ): Promise<FinanceWorkspace>
  saveDraft(
    organizationId: string,
    reportingPeriodId: string,
    patch: Partial<FinancialMetric>,
    role: RoleId,
  ): Promise<FinancialMetric>
  attachEvidence(
    organizationId: string,
    reportingPeriodId: string,
    payload: { title: string; fileName: string },
    role: RoleId,
  ): Promise<DocumentMeta>
  markComplete(organizationId: string, reportingPeriodId: string, role: RoleId): Promise<Submission>
  sendForCertification(
    organizationId: string,
    reportingPeriodId: string,
    role: RoleId,
  ): Promise<Submission>
  certify(
    organizationId: string,
    reportingPeriodId: string,
    role: RoleId,
    certifierName: string,
  ): Promise<Submission>
  submitToMoip(organizationId: string, reportingPeriodId: string, role: RoleId): Promise<Submission>
  takeUnderReview(submissionId: string, role: RoleId): Promise<Submission>
  requestClarification(
    submissionId: string,
    role: RoleId,
    payload: { question: string; affectedField?: string; dueDate?: string },
  ): Promise<Clarification>
  respondClarification(
    clarificationId: string,
    role: RoleId,
    response: string,
  ): Promise<Clarification>
  resubmit(organizationId: string, reportingPeriodId: string, role: RoleId): Promise<Submission>
  approve(submissionId: string, role: RoleId, approvedBy: string): Promise<Submission>
  getReviewQueue(): Promise<
    Array<{
      submission: Submission
      organization: Organization
      financial: FinancialMetric | null
    }>
  >
  getApprovedKpis(organizationId?: string): Promise<ApprovedFinanceKpi[]>
  getApprovedKpiDetail(kpiId: string): Promise<{
    kpi: ApprovedFinanceKpi
    financial: FinancialMetric
    evidence: DocumentMeta[]
    timeline: TimelineEvent[]
    versions: FinancialVersionSnapshot[]
  }>
  getNotifications(organizationId?: string): Promise<NotificationItem[]>
}

export const mockFinanceWorkflowService: FinanceWorkflowService = {
  async getWorkspace(organizationId, reportingPeriodId, role) {
    const organization = db.organizations.find((o) => o.id === organizationId)
    if (!organization) throw new AppError('Organization not found', 'NOT_FOUND')
    const period = db.reportingPeriods.find((p) => p.id === reportingPeriodId)
    if (!period) throw new AppError('Reporting period not found', 'NOT_FOUND')

    const current = db.financialMetrics.find(
      (f) => f.organizationId === organizationId && f.reportingPeriodId === reportingPeriodId,
    )
    if (!current) throw new AppError('Financial metric not found', 'NOT_FOUND')

    const annual = db.reportingPeriods
      .filter((p) => p.type === 'annual')
      .sort((a, b) => a.startDate.localeCompare(b.startDate))
    const idx = annual.findIndex((p) => p.id === reportingPeriodId)
    const previousPeriod = idx > 0 ? annual[idx - 1] : null
    const previous = previousPeriod
      ? db.financialMetrics.find(
          (f) =>
            f.organizationId === organizationId &&
            f.reportingPeriodId === previousPeriod.id,
        ) ?? null
      : null

    const submission = findFinanceSubmission(organizationId, reportingPeriodId)
    const evidence = db.documents.filter(
      (d) =>
        d.organizationId === organizationId &&
        (d.linkedRecordId === submission.id || d.category === 'finance'),
    )
    const clarifications = db.clarifications.filter((c) => c.submissionId === submission.id)
    const timeline = db.timeline
      .filter((t) => t.organizationId === organizationId)
      .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
    const versions = db.financeVersions.filter((v) => v.financialMetricId === current.id)
    const validation = validateFinanceDraft(current, previous, evidence.length)

    return simulateLatency({
      organization,
      period,
      previousPeriod,
      current,
      previous,
      submission,
      evidence,
      clarifications,
      timeline,
      versions,
      validation,
      availableActions: getAvailableActions(submission.status, role),
      nextActionHint: getNextActionHint(submission.status),
      actionOwner: getActionOwnerLabel(submission.status),
      readOnly: isImmutableStatus(submission.status) || !hasPermission(role, PERMISSION.FINANCE_EDIT),
      percentChange: {
        revenue: pctChange(current.revenue, previous?.revenue),
        operatingExpenses: pctChange(current.operatingExpenses, previous?.operatingExpenses),
        profitOrLoss: pctChange(current.profitOrLoss, previous?.profitOrLoss),
        subsidies: pctChange(current.subsidies, previous?.subsidies),
      },
    })
  },

  async saveDraft(organizationId, reportingPeriodId, patch, role) {
    requireRolePermission(role, PERMISSION.FINANCE_EDIT)
    const current = db.financialMetrics.find(
      (f) => f.organizationId === organizationId && f.reportingPeriodId === reportingPeriodId,
    )
    if (!current) throw new AppError('Financial metric not found', 'NOT_FOUND')
    if (isImmutableStatus(current.status)) {
      throw new AppError('Locked financial records are immutable', 'VALIDATION')
    }
    const submission = findFinanceSubmission(organizationId, reportingPeriodId)
    if (
      submission.status !== SUBMISSION_STATUS.DRAFT &&
      submission.status !== SUBMISSION_STATUS.IN_PROGRESS &&
      submission.status !== SUBMISSION_STATUS.READY_FOR_REVIEW &&
      submission.status !== SUBMISSION_STATUS.RETURNED &&
      submission.status !== SUBMISSION_STATUS.CLARIFICATION_REQUESTED
    ) {
      throw new AppError('Finance pack is not editable in current status', 'VALIDATION')
    }

    const nextStatus =
      submission.status === SUBMISSION_STATUS.DRAFT ||
      submission.status === SUBMISSION_STATUS.RETURNED
        ? SUBMISSION_STATUS.IN_PROGRESS
        : submission.status === SUBMISSION_STATUS.READY_FOR_REVIEW
          ? SUBMISSION_STATUS.IN_PROGRESS
          : submission.status

    const idx = db.financialMetrics.findIndex((f) => f.id === current.id)
    db.financialMetrics[idx] = {
      ...current,
      ...patch,
      id: current.id,
      organizationId,
      reportingPeriodId,
      status: nextStatus,
      profitOrLoss:
        patch.profitOrLoss ??
        (patch.revenue !== undefined || patch.operatingExpenses !== undefined
          ? (patch.revenue ?? current.revenue) - (patch.operatingExpenses ?? current.operatingExpenses)
          : current.profitOrLoss),
    }
    syncStatuses(submission.id, current.id, nextStatus)
    const sIdx = db.submissions.findIndex((s) => s.id === submission.id)
    db.submissions[sIdx] = {
      ...db.submissions[sIdx],
      completeness: Math.min(95, db.submissions[sIdx].completeness + 5),
    }
    pushTimeline(organizationId, 'Financial draft saved', 'finance')
    return simulateMutation(db.financialMetrics[idx])
  },

  async attachEvidence(organizationId, reportingPeriodId, payload, role) {
    requireRolePermission(role, PERMISSION.DOCUMENT_UPLOAD)
    const submission = findFinanceSubmission(organizationId, reportingPeriodId)
    const doc: DocumentMeta = {
      id: `doc-ev-${Date.now()}`,
      organizationId,
      title: payload.title,
      category: 'finance',
      fileName: payload.fileName,
      linkedRecordType: 'submission',
      linkedRecordId: submission.id,
      linkedModule: 'finance',
      uploadedAt: new Date().toISOString(),
      uploadedBy: role,
      version: 1,
      documentFamilyId: `docfam-ev-${Date.now()}`,
      evidenceStatus: 'available',
      status: 'available',
      isDummyDemonstrationData: true,
    }
    db.documents.push(doc)
    pushTimeline(organizationId, `Evidence attached: ${payload.title}`, 'evidence')
    return simulateMutation(doc)
  },

  async markComplete(organizationId, reportingPeriodId, role) {
    requireRolePermission(role, PERMISSION.FINANCE_EDIT)
    const ws = await mockFinanceWorkflowService.getWorkspace(
      organizationId,
      reportingPeriodId,
      role,
    )
    if (hasBlockingIssues(ws.validation)) {
      throw new AppError('Resolve blocking validation issues before completion', 'VALIDATION')
    }
    if (!canTransition(ws.submission.status, SUBMISSION_STATUS.READY_FOR_REVIEW)) {
      throw new AppError('Cannot mark complete from current status', 'VALIDATION')
    }
    syncStatuses(ws.submission.id, ws.current.id, SUBMISSION_STATUS.READY_FOR_REVIEW)
    const sIdx = db.submissions.findIndex((s) => s.id === ws.submission.id)
    db.submissions[sIdx] = { ...db.submissions[sIdx], completeness: 100 }
    pushTimeline(organizationId, 'Finance section marked complete', 'workflow')
    pushNotification({
      organizationId,
      title: 'Finance ready for internal review',
      body: `${ws.organization.abbreviation} finance pack is ready for SOE Contributor review.`,
      linkRoute: '/soe/finance/review',
      linkedRecordType: 'submission',
      linkedRecordId: ws.submission.id,
    })
    return simulateMutation(db.submissions[sIdx])
  },

  async sendForCertification(organizationId, reportingPeriodId, role) {
    requireRolePermission(role, PERMISSION.SUBMISSION_SUBMIT)
    const submission = findFinanceSubmission(organizationId, reportingPeriodId)
    if (!canTransition(submission.status, SUBMISSION_STATUS.READY_FOR_CERTIFICATION)) {
      throw new AppError('Pack is not ready for certification', 'VALIDATION')
    }
    const metric = db.financialMetrics.find(
      (f) => f.organizationId === organizationId && f.reportingPeriodId === reportingPeriodId,
    )!
    syncStatuses(submission.id, metric.id, SUBMISSION_STATUS.READY_FOR_CERTIFICATION)
    pushTimeline(organizationId, 'Sent for SOE Certifier review', 'workflow')
    pushNotification({
      organizationId,
      title: 'Certification requested',
      body: 'Finance pack awaits SOE Certifier certification.',
      linkRoute: '/soe/finance/certify',
      linkedRecordType: 'submission',
      linkedRecordId: submission.id,
    })
    return simulateMutation(db.submissions.find((s) => s.id === submission.id)!)
  },

  async certify(organizationId, reportingPeriodId, role, certifierName) {
    requireRolePermission(role, PERMISSION.SUBMISSION_CERTIFY)
    if (
      role !== ROLE.SOE_CERTIFIER &&
      role !== ROLE.CEO &&
      role !== ROLE.CFO &&
      role !== ROLE.SYSTEM_ADMIN
    ) {
      throw new AppError('Only SOE Certifier may certify', 'PERMISSION')
    }
    const submission = findFinanceSubmission(organizationId, reportingPeriodId)
    if (!canTransition(submission.status, SUBMISSION_STATUS.CERTIFIED)) {
      throw new AppError('Pack is not ready for certification', 'VALIDATION')
    }
    const metric = db.financialMetrics.find(
      (f) => f.organizationId === organizationId && f.reportingPeriodId === reportingPeriodId,
    )!
    syncStatuses(submission.id, metric.id, SUBMISSION_STATUS.CERTIFIED)
    const fIdx = db.financialMetrics.findIndex((f) => f.id === metric.id)
    db.financialMetrics[fIdx] = {
      ...db.financialMetrics[fIdx],
      certifiedBy: certifierName,
      certifiedAt: new Date().toISOString(),
      version: '1.0',
    }
    const sIdx = db.submissions.findIndex((s) => s.id === submission.id)
    db.submissions[sIdx] = { ...db.submissions[sIdx], version: '1.0' }
    captureVersion(db.financialMetrics[fIdx], 'Certified v1.0', '1.0')
    pushTimeline(organizationId, `Certified by ${certifierName}`, 'certification')
    return simulateMutation(db.submissions[sIdx])
  },

  async submitToMoip(organizationId, reportingPeriodId, role) {
    requireRolePermission(role, PERMISSION.SUBMISSION_SUBMIT)
    const submission = findFinanceSubmission(organizationId, reportingPeriodId)
    if (!canTransition(submission.status, SUBMISSION_STATUS.SUBMITTED)) {
      throw new AppError('Only certified packs can be submitted', 'VALIDATION')
    }
    const metric = db.financialMetrics.find(
      (f) => f.organizationId === organizationId && f.reportingPeriodId === reportingPeriodId,
    )!
    syncStatuses(submission.id, metric.id, SUBMISSION_STATUS.SUBMITTED)
    pushTimeline(organizationId, 'Submitted to MoIP', 'submission')
    pushNotification({
      organizationId,
      title: 'Submission received (MoIP)',
      body: `${orgAbbr(organizationId)} finance submission is in MoIP queue.`,
      linkRoute: `/moip/submissions/${submission.id}`,
      linkedRecordType: 'submission',
      linkedRecordId: submission.id,
    })
    return simulateMutation(db.submissions.find((s) => s.id === submission.id)!)
  },

  async takeUnderReview(submissionId, role) {
    requireRolePermission(role, PERMISSION.SUBMISSION_REVIEW)
    const submission = db.submissions.find((s) => s.id === submissionId)
    if (!submission) throw new AppError('Submission not found', 'NOT_FOUND')
    const from =
      submission.status === SUBMISSION_STATUS.RESUBMITTED
        ? SUBMISSION_STATUS.RESUBMITTED
        : submission.status
    if (
      from !== SUBMISSION_STATUS.SUBMITTED &&
      from !== SUBMISSION_STATUS.RESUBMITTED
    ) {
      if (!canTransition(submission.status, SUBMISSION_STATUS.UNDER_REVIEW)) {
        throw new AppError('Cannot take under review from current status', 'VALIDATION')
      }
    }
    const metric = db.financialMetrics.find(
      (f) =>
        f.organizationId === submission.organizationId &&
        f.reportingPeriodId === submission.reportingPeriodId,
    )!
    // Allow RESUBMITTED → UNDER_REVIEW
    const sIdx = db.submissions.findIndex((s) => s.id === submissionId)
    db.submissions[sIdx] = {
      ...db.submissions[sIdx],
      status: SUBMISSION_STATUS.UNDER_REVIEW,
      updatedAt: new Date().toISOString(),
    }
    const fIdx = db.financialMetrics.findIndex((f) => f.id === metric.id)
    db.financialMetrics[fIdx] = {
      ...db.financialMetrics[fIdx],
      status: SUBMISSION_STATUS.UNDER_REVIEW,
    }
    pushTimeline(submission.organizationId, 'MoIP took pack under review', 'review')
    return simulateMutation(db.submissions[sIdx])
  },

  async requestClarification(submissionId, role, payload) {
    requireRolePermission(role, PERMISSION.CLARIFICATION_CREATE)
    const submission = db.submissions.find((s) => s.id === submissionId)
    if (!submission) throw new AppError('Submission not found', 'NOT_FOUND')
    if (!canTransition(submission.status, SUBMISSION_STATUS.CLARIFICATION_REQUESTED)) {
      throw new AppError('Clarification only allowed under review', 'VALIDATION')
    }
    const metric = db.financialMetrics.find(
      (f) =>
        f.organizationId === submission.organizationId &&
        f.reportingPeriodId === submission.reportingPeriodId,
    )!
    syncStatuses(submissionId, metric.id, SUBMISSION_STATUS.CLARIFICATION_REQUESTED)
    const clarification: Clarification = {
      id: `clar-${submissionId}-${Date.now()}`,
      submissionId,
      organizationId: submission.organizationId,
      question: payload.question,
      affectedField: payload.affectedField,
      dueDate: payload.dueDate ?? '2026-08-20',
      status: 'open',
      createdAt: new Date().toISOString(),
    }
    db.clarifications.push(clarification)
    db.tasks.push({
      id: `task-clar-${clarification.id}`,
      organizationId: submission.organizationId,
      title: 'Respond to MoIP clarification',
      dueDate: clarification.dueDate!,
      priority: 'high',
      status: 'open',
      ownerRole: ROLE.SOE_FOCAL_PERSON,
      linkedRecordType: 'clarification',
      linkedRecordId: clarification.id,
    })
    pushTimeline(submission.organizationId, 'Clarification requested by MoIP', 'clarification')
    pushNotification({
      organizationId: submission.organizationId,
      title: 'Clarification requested',
      body: payload.question,
      linkRoute: '/soe/finance/clarification',
      linkedRecordType: 'clarification',
      linkedRecordId: clarification.id,
    })
    return simulateMutation(clarification)
  },

  async respondClarification(clarificationId, role, response) {
    requireRolePermission(role, PERMISSION.FINANCE_EDIT)
    const idx = db.clarifications.findIndex((c) => c.id === clarificationId)
    if (idx < 0) throw new AppError('Clarification not found', 'NOT_FOUND')
    const clarification = db.clarifications[idx]
    db.clarifications[idx] = {
      ...clarification,
      response,
      respondedAt: new Date().toISOString(),
      status: 'responded',
    }
    const submission = db.submissions.find((s) => s.id === clarification.submissionId)!
    const metric = db.financialMetrics.find(
      (f) =>
        f.organizationId === submission.organizationId &&
        f.reportingPeriodId === submission.reportingPeriodId,
    )!
    syncStatuses(submission.id, metric.id, SUBMISSION_STATUS.RESUBMITTED)
    const task = db.tasks.find((t) => t.linkedRecordId === clarificationId)
    if (task) {
      const tIdx = db.tasks.findIndex((t) => t.id === task.id)
      db.tasks[tIdx] = { ...db.tasks[tIdx], status: 'done' }
    }
    pushTimeline(submission.organizationId, 'Clarification response recorded', 'clarification')
    return simulateMutation(db.clarifications[idx])
  },

  async resubmit(organizationId, reportingPeriodId, role) {
    requireRolePermission(role, PERMISSION.SUBMISSION_SUBMIT)
    const submission = findFinanceSubmission(organizationId, reportingPeriodId)
    if (submission.status !== SUBMISSION_STATUS.RESUBMITTED) {
      throw new AppError('Pack must be in Resubmitted status', 'VALIDATION')
    }
    const metric = db.financialMetrics.find(
      (f) => f.organizationId === organizationId && f.reportingPeriodId === reportingPeriodId,
    )!
    const nextVersion = bumpVersion(submission.version || '1.0', 'minor')
    const sIdx = db.submissions.findIndex((s) => s.id === submission.id)
    db.submissions[sIdx] = {
      ...db.submissions[sIdx],
      status: SUBMISSION_STATUS.UNDER_REVIEW,
      version: nextVersion,
      updatedAt: new Date().toISOString(),
    }
    const fIdx = db.financialMetrics.findIndex((f) => f.id === metric.id)
    db.financialMetrics[fIdx] = {
      ...db.financialMetrics[fIdx],
      status: SUBMISSION_STATUS.UNDER_REVIEW,
      version: nextVersion,
    }
    captureVersion(db.financialMetrics[fIdx], `Resubmitted ${nextVersion}`, nextVersion)
    pushTimeline(organizationId, `Resubmitted as ${nextVersion}`, 'submission')
    pushNotification({
      organizationId,
      title: 'Resubmission received',
      body: `Finance pack ${nextVersion} returned to MoIP review.`,
      linkRoute: `/moip/submissions/${submission.id}`,
      linkedRecordType: 'submission',
      linkedRecordId: submission.id,
    })
    return simulateMutation(db.submissions[sIdx])
  },

  async approve(submissionId, role, approvedBy) {
    requireRolePermission(role, PERMISSION.SUBMISSION_APPROVE)
    const submission = db.submissions.find((s) => s.id === submissionId)
    if (!submission) throw new AppError('Submission not found', 'NOT_FOUND')
    if (
      submission.status !== SUBMISSION_STATUS.UNDER_REVIEW &&
      submission.status !== SUBMISSION_STATUS.SUBMITTED
    ) {
      throw new AppError('Submission is not eligible for approval', 'VALIDATION')
    }
    const metric = db.financialMetrics.find(
      (f) =>
        f.organizationId === submission.organizationId &&
        f.reportingPeriodId === submission.reportingPeriodId,
    )!
    const version = submission.version || '1.0'
    const now = new Date().toISOString()

    // APPROVED then LOCKED
    const sIdx = db.submissions.findIndex((s) => s.id === submissionId)
    db.submissions[sIdx] = {
      ...db.submissions[sIdx],
      status: SUBMISSION_STATUS.LOCKED,
      version,
      updatedAt: now,
    }
    const fIdx = db.financialMetrics.findIndex((f) => f.id === metric.id)
    db.financialMetrics[fIdx] = {
      ...db.financialMetrics[fIdx],
      status: SUBMISSION_STATUS.LOCKED,
      version,
      approvedBy,
      approvedAt: now,
    }
    captureVersion(db.financialMetrics[fIdx], `Approved ${version}`, version)

    const kpi: ApprovedFinanceKpi = {
      id: `kpi-${metric.id}-${version}`,
      organizationId: metric.organizationId,
      reportingPeriodId: metric.reportingPeriodId,
      financialMetricId: metric.id,
      submissionId,
      version,
      revenue: metric.revenue,
      profitOrLoss: metric.profitOrLoss,
      subsidies: metric.subsidies,
      approvedAt: now,
      approvedBy,
    }
    // Replace prior approved KPI for same org/period
    db.approvedFinanceKpis = db.approvedFinanceKpis.filter(
      (k) =>
        !(
          k.organizationId === kpi.organizationId &&
          k.reportingPeriodId === kpi.reportingPeriodId
        ),
    )
    db.approvedFinanceKpis.push(kpi)

    pushTimeline(
      submission.organizationId,
      `Approved by ${approvedBy} · locked ${version}`,
      'approval',
    )
    pushNotification({
      organizationId: submission.organizationId,
      title: 'Approval complete',
      body: `Finance ${version} approved and locked. Executive KPI updated.`,
      linkRoute: `/minister/finance/${submission.organizationId}`,
      linkedRecordType: 'approved_kpi',
      linkedRecordId: kpi.id,
    })
    return simulateMutation(db.submissions[sIdx])
  },

  async getReviewQueue() {
    const statuses: SubmissionStatus[] = [
      SUBMISSION_STATUS.SUBMITTED,
      SUBMISSION_STATUS.UNDER_REVIEW,
      SUBMISSION_STATUS.CLARIFICATION_REQUESTED,
      SUBMISSION_STATUS.RESUBMITTED,
    ]
    const items = db.submissions
      .filter((s) => s.module === MODULE.FINANCE && statuses.includes(s.status))
      .map((submission) => {
        const organization = db.organizations.find((o) => o.id === submission.organizationId)!
        const financial =
          db.financialMetrics.find(
            (f) =>
              f.organizationId === submission.organizationId &&
              f.reportingPeriodId === submission.reportingPeriodId,
          ) ?? null
        return { submission, organization, financial }
      })
    return simulateLatency(items)
  },

  async getApprovedKpis(organizationId) {
    let items = [...db.approvedFinanceKpis]
    if (organizationId) items = items.filter((k) => k.organizationId === organizationId)
    return simulateLatency(items)
  },

  async getApprovedKpiDetail(kpiId) {
    const kpi = db.approvedFinanceKpis.find((k) => k.id === kpiId)
    if (!kpi) throw new AppError('Approved KPI not found', 'NOT_FOUND')
    const financial = db.financialMetrics.find((f) => f.id === kpi.financialMetricId)
    if (!financial) throw new AppError('Source financial record not found', 'NOT_FOUND')
    const evidence = db.documents.filter(
      (d) =>
        d.linkedRecordId === kpi.submissionId ||
        (d.organizationId === kpi.organizationId && d.category === 'finance'),
    )
    const timeline = db.timeline.filter((t) => t.organizationId === kpi.organizationId)
    const versions = db.financeVersions.filter((v) => v.financialMetricId === financial.id)
    return simulateLatency({ kpi, financial, evidence, timeline, versions })
  },

  async getNotifications(organizationId) {
    let items = [...db.notifications]
    if (organizationId) {
      items = items.filter((n) => !n.organizationId || n.organizationId === organizationId)
    }
    return simulateLatency(items)
  },
}

// silence unused helper warning in some TS configs
void FINANCE_SUB_ID
