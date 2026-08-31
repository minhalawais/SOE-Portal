import {
  ESCALATION_SEVERITY,
  MOIP_COMPARISON_RULES,
  MODULE,
  ROLE,
  SUBMISSION_STATUS,
  type RoleId,
  type SubmissionStatus,
} from '@/constants'
import { db } from '@/mock-data'
import { paginate } from '@/mock-services/_helpers'
import { hasPermission, PERMISSION } from '@/permissions'
import type {
  Clarification,
  Escalation,
  ListQuery,
  Organization,
  PagedResult,
  Submission,
} from '@/types/domain'
import { AppError, simulateLatency, simulateMutation } from '@/utils'
import { validateFinanceDraft } from '@/workflow/financeValidation'
import { canTransition } from '@/workflow/submission'
import { REPORTING_MODULES } from '@/workflow/moduleCatalog'

const QUEUE_STATUSES: SubmissionStatus[] = [
  SUBMISSION_STATUS.SUBMITTED,
  SUBMISSION_STATUS.UNDER_REVIEW,
  SUBMISSION_STATUS.CLARIFICATION_REQUESTED,
  SUBMISSION_STATUS.RESUBMITTED,
]

const DEMO_AS_OF = '2026-08-08T12:00:00Z'

function requirePerm(role: RoleId, permission: (typeof PERMISSION)[keyof typeof PERMISSION]) {
  if (!hasPermission(role, permission)) {
    throw new AppError('Permission denied', 'PERMISSION')
  }
}

function ageDays(iso?: string, asOf = DEMO_AS_OF): number {
  if (!iso) return 0
  const a = new Date(iso).getTime()
  const b = new Date(asOf).getTime()
  return Math.max(0, Math.floor((b - a) / (24 * 60 * 60 * 1000)))
}

function orgOf(id: string): Organization | undefined {
  return db.organizations.find((o) => o.id === id)
}

function validationCounts(submission: Submission): {
  blocking: number
  warnings: number
  evidenceGaps: number
} {
  if (submission.module !== MODULE.FINANCE) {
    const evidence = db.documents.filter((d) => d.linkedRecordId === submission.id)
    const missing = evidence.filter((d) => d.evidenceStatus === 'missing').length
    const incomplete = submission.completeness < 80 ? 1 : 0
    return {
      blocking: incomplete,
      warnings: Math.max(0, Math.round((100 - submission.completeness) / 25)),
      evidenceGaps: missing || (evidence.length === 0 ? 1 : 0),
    }
  }
  const current = db.financialMetrics.find(
    (f) =>
      f.organizationId === submission.organizationId &&
      f.reportingPeriodId === submission.reportingPeriodId,
  )
  if (!current) return { blocking: 1, warnings: 0, evidenceGaps: 1 }
  const previous = db.financialMetrics.find(
    (f) =>
      f.organizationId === submission.organizationId &&
      f.reportingPeriodId === 'period-fy2026',
  )
  const evidence = db.documents.filter(
    (d) =>
      d.organizationId === submission.organizationId &&
      (d.linkedRecordId === submission.id || d.category === 'finance' || d.linkedModule === 'finance'),
  )
  const v = validateFinanceDraft(current, previous ?? null, evidence.length)
  return {
    blocking: v.filter((i) => i.severity === 'blocking').length,
    warnings: v.filter((i) => i.severity === 'warning').length,
    evidenceGaps: evidence.filter((e) => e.evidenceStatus === 'missing').length,
  }
}

function dataQualityLabel(blocking: number, warnings: number, completeness: number): string {
  if (blocking > 0) return 'validation_issue'
  if (completeness < 70) return 'incomplete'
  if (warnings > 0) return 'incomplete'
  return 'complete'
}

export interface MoipDashboardSummary {
  totalSoes: number
  submissionsDue: number
  submissionsReceived: number
  overdueSubmissions: number
  underReview: number
  clarificationPending: number
  approved: number
  highPriorityExceptions: number
  reviewWorkload: number
  upcomingDeadlines: number
  asOf: string
}

export interface MoipCommandDashboard {
  reportingPeriodId: string
  periodLabel: string
  asOf: string
  summary: {
    totalSoes: number
    expectedModules: number
    received: number
    underReview: number
    clarificationPending: number
    approved: number
    overdue: number
    averageCompleteness: number
  }
  workflow: Array<{ status: string; label: string; count: number }>
  moduleCoverage: Array<{
    module: string
    label: string
    expected: number
    received: number
    approved: number
    averageCompleteness: number
    issues: number
    evidenceGaps: number
  }>
  quality: { blocking: number; warnings: number; evidenceGaps: number; affectedSoes: number }
  fiscal: {
    assetValue: number
    debt: number
    guarantees: number
    subsidies: number
    profitable: number
    lossMaking: number
    netPortfolioResult: number
  }
  risk: {
    boardVacancies: number
    openAuditParas: number
    auditExposure: number
    activeLitigation: number
    litigationExposure: number
    overdueLoans: number
    nonCompliantObligations: number
    averageCapacityUtilization: number
  }
  sectors: Array<{
    sector: string
    soes: number
    revenue: number
    profitOrLoss: number
    debt: number
    capacityUtilization: number
  }>
  trend: Array<{ periodId: string; period: string; received: number; approved: number; averageCompleteness: number }>
  priorityQueue: MoipQueueRow[]
  organizationsAtRisk: Array<{
    organizationId: string
    abbreviation: string
    sector: string
    completion: number
    warnings: number
    boardVacancies: number
    openAuditParas: number
    activeLitigation: number
    overdueLoans: number
  }>
}

export interface MoipPortfolioRow {
  organization: Organization
  sector: string
  status: string
  activePeriodId: string
  submissionStatus: SubmissionStatus | 'not_started'
  completion: number
  dataQuality: string
  majorWarnings: string[]
  assignedReviewerRole?: RoleId
  lastActivityAt: string
  overdue: boolean
}

export interface MoipQueueRow {
  submission: Submission
  organization: Organization
  validationIssues: number
  evidenceGaps: number
  ageDays: number
  priority: 'normal' | 'high' | 'critical'
  overdue: boolean
}

export interface MoipClarificationRow {
  clarification: Clarification
  organization: Organization
  submission: Submission
  ageDays: number
  responseReceived: boolean
  overdue: boolean
}

export interface MoipModuleSummary {
  module: string
  label: string
  status: SubmissionStatus | 'not_started'
  issueCount: number
  submissionId?: string
}

export interface MoipComparisonHighlight {
  field: string
  kind: 'material_change' | 'missing' | 'status_change' | 'version'
  previousValue: string
  currentValue: string
  note: string
}

export interface MoipComparisonResult {
  organizationId: string
  reportingPeriodId: string
  previousPeriodId?: string
  currentVersion: string
  previousVersion?: string
  highlights: MoipComparisonHighlight[]
  rulesNote: string
}

export interface MoipWorkloadSummary {
  assignedReviews: number
  dueSoon: number
  overdue: number
  clarificationsWaiting: number
  approvalsPending: number
}

export interface MoipPortalService {
  getDashboard(): Promise<MoipDashboardSummary>
  getCommandDashboard(reportingPeriodId?: string): Promise<MoipCommandDashboard>
  getPortfolio(query?: ListQuery & {
    sector?: string
    status?: string
    submissionStatus?: string
    reviewer?: string
    riskOnly?: boolean
    overdueOnly?: boolean
    reportingPeriodId?: string
  }): Promise<PagedResult<MoipPortfolioRow>>
  getSubmissionQueue(query?: ListQuery & {
    status?: string
    module?: string
    reviewer?: string
    priority?: string
    sortBy?: 'age' | 'priority' | 'updatedAt'
  }): Promise<PagedResult<MoipQueueRow>>
  assignReviewer(
    submissionId: string,
    reviewerRole: RoleId,
    actorRole: RoleId,
  ): Promise<Submission>
  bulkAssignPlaceholder(submissionIds: string[], reviewerRole: RoleId, actorRole: RoleId): Promise<{
    assigned: number
    note: string
  }>
  getClarificationQueue(query?: ListQuery & { status?: string }): Promise<PagedResult<MoipClarificationRow>>
  getApprovalsQueue(): Promise<MoipQueueRow[]>
  getWorkload(role: RoleId): Promise<MoipWorkloadSummary>
  getModuleSummaries(organizationId: string, reportingPeriodId: string): Promise<MoipModuleSummary[]>
  getComparison(submissionId: string): Promise<MoipComparisonResult>
  getDataQuality(organizationId?: string): Promise<
    Array<{
      organizationId: string
      abbreviation: string
      blocking: number
      warnings: number
      evidenceGaps: number
      incompleteModules: number
      submissionId?: string
    }>
  >
  returnSubmission(
    submissionId: string,
    role: RoleId,
    payload: { reason: string; affectedItem?: string; dueDate?: string },
  ): Promise<Submission>
  createEscalation(
    role: RoleId,
    payload: {
      organizationId: string
      submissionId?: string
      reason: string
      reasonCode: Escalation['reasonCode']
      severity: Escalation['severity']
      ownerRole: RoleId
      dueDate: string
    },
  ): Promise<Escalation>
  getEscalations(query?: { status?: string }): Promise<Escalation[]>
  resolveEscalation(id: string, role: RoleId): Promise<Escalation>
}

function buildQueueRow(submission: Submission): MoipQueueRow | null {
  const organization = orgOf(submission.organizationId)
  if (!organization) return null
  const counts = validationCounts(submission)
  const age = ageDays(submission.submittedAt ?? submission.updatedAt)
  const priority = submission.priority ?? (counts.blocking > 0 || age > MOIP_COMPARISON_RULES.reviewAgeOverdueDays ? 'high' : 'normal')
  const overdue =
    (submission.status === SUBMISSION_STATUS.UNDER_REVIEW &&
      age > MOIP_COMPARISON_RULES.reviewAgeOverdueDays) ||
    (submission.status === SUBMISSION_STATUS.CLARIFICATION_REQUESTED &&
      age > MOIP_COMPARISON_RULES.clarificationResponseOverdueDays) ||
    priority === 'critical'
  return {
    submission,
    organization,
    validationIssues: counts.blocking + counts.warnings,
    evidenceGaps: counts.evidenceGaps,
    ageDays: age,
    priority,
    overdue,
  }
}

export const mockMoipPortalService: MoipPortalService = {
  async getDashboard() {
    const orgs = db.organizations
    const periodId = 'period-fy2027'
    const financeSubs = db.submissions.filter(
      (s) => s.reportingPeriodId === periodId && s.module === MODULE.FINANCE,
    )
    const queue = db.submissions.filter((s) => QUEUE_STATUSES.includes(s.status))
    const overdue = queue
      .map(buildQueueRow)
      .filter((r): r is MoipQueueRow => Boolean(r && r.overdue))
    const clarOpen = db.clarifications.filter((c) => c.status === 'open')
    const approved = financeSubs.filter(
      (s) =>
        s.status === SUBMISSION_STATUS.APPROVED || s.status === SUBMISSION_STATUS.LOCKED,
    )
    const underReview = queue.filter((s) => s.status === SUBMISSION_STATUS.UNDER_REVIEW)
    const receivedStatuses: SubmissionStatus[] = [
      SUBMISSION_STATUS.SUBMITTED,
      SUBMISSION_STATUS.UNDER_REVIEW,
      SUBMISSION_STATUS.CLARIFICATION_REQUESTED,
      SUBMISSION_STATUS.RESUBMITTED,
      SUBMISSION_STATUS.APPROVED,
      SUBMISSION_STATUS.LOCKED,
    ]
    const dueStatuses: SubmissionStatus[] = [
      SUBMISSION_STATUS.DRAFT,
      SUBMISSION_STATUS.IN_PROGRESS,
      SUBMISSION_STATUS.READY_FOR_REVIEW,
      SUBMISSION_STATUS.READY_FOR_CERTIFICATION,
      SUBMISSION_STATUS.CERTIFIED,
      SUBMISSION_STATUS.RETURNED,
    ]
    const received = financeSubs.filter((s) => receivedStatuses.includes(s.status))
    const due = financeSubs.filter((s) => dueStatuses.includes(s.status))
    const escalations = (db.escalations ?? []).filter((e) => e.status === 'open')
    const upcoming = clarOpen.filter((c) => c.dueDate && c.dueDate <= '2026-08-20').length

    return simulateLatency({
      totalSoes: orgs.length,
      submissionsDue: due.length,
      submissionsReceived: received.length,
      overdueSubmissions: overdue.length,
      underReview: underReview.length,
      clarificationPending: clarOpen.length,
      approved: approved.length,
      highPriorityExceptions: escalations.length + overdue.filter((o) => o.priority === 'critical').length,
      reviewWorkload: underReview.length + clarOpen.length,
      upcomingDeadlines: upcoming,
      asOf: DEMO_AS_OF,
    } satisfies MoipDashboardSummary)
  },

  async getCommandDashboard(reportingPeriodId = 'period-fy2027') {
    const organizations = db.organizations
    const submissions = db.submissions.filter((item) => item.reportingPeriodId === reportingPeriodId)
    const receivedStatuses: SubmissionStatus[] = [SUBMISSION_STATUS.SUBMITTED, SUBMISSION_STATUS.UNDER_REVIEW, SUBMISSION_STATUS.CLARIFICATION_REQUESTED, SUBMISSION_STATUS.RESUBMITTED, SUBMISSION_STATUS.APPROVED, SUBMISSION_STATUS.LOCKED]
    const approvedStatuses: SubmissionStatus[] = [SUBMISSION_STATUS.APPROVED, SUBMISSION_STATUS.LOCKED]
    const received = submissions.filter((item) => receivedStatuses.includes(item.status))
    const approved = submissions.filter((item) => approvedStatuses.includes(item.status))
    const queue = submissions.map(buildQueueRow).filter((item): item is MoipQueueRow => Boolean(item)).sort((a, b) => Number(b.overdue) - Number(a.overdue) || ({ critical: 3, high: 2, normal: 1 }[b.priority] - { critical: 3, high: 2, normal: 1 }[a.priority]) || b.ageDays - a.ageDays)
    const openClarifications = db.clarifications.filter((item) => item.status === 'open' && submissions.some((submission) => submission.id === item.submissionId))
    const qualityBySubmission = submissions.map((submission) => ({ submission, ...validationCounts(submission) }))
    const period = db.reportingPeriods.find((item) => item.id === reportingPeriodId)

    const workflowOrder: SubmissionStatus[] = [SUBMISSION_STATUS.DRAFT, SUBMISSION_STATUS.IN_PROGRESS, SUBMISSION_STATUS.READY_FOR_REVIEW, SUBMISSION_STATUS.CERTIFIED, SUBMISSION_STATUS.SUBMITTED, SUBMISSION_STATUS.UNDER_REVIEW, SUBMISSION_STATUS.CLARIFICATION_REQUESTED, SUBMISSION_STATUS.RESUBMITTED, SUBMISSION_STATUS.APPROVED, SUBMISSION_STATUS.LOCKED]
    const workflow = workflowOrder.map((status) => ({ status, label: status.replaceAll('_', ' '), count: submissions.filter((item) => item.status === status).length })).filter((item) => item.count > 0)
    const moduleCoverage = REPORTING_MODULES.map((module) => {
      const rows = submissions.filter((item) => item.module === module.id)
      const checks = rows.map((item) => validationCounts(item))
      return {
        module: module.id,
        label: module.label,
        expected: organizations.length,
        received: rows.filter((item) => receivedStatuses.includes(item.status)).length,
        approved: rows.filter((item) => approvedStatuses.includes(item.status)).length,
        averageCompleteness: rows.length ? Math.round(rows.reduce((sum, item) => sum + item.completeness, 0) / rows.length) : 0,
        issues: checks.reduce((sum, item) => sum + item.blocking + item.warnings, 0),
        evidenceGaps: checks.reduce((sum, item) => sum + item.evidenceGaps, 0),
      }
    })

    const financials = db.financialMetrics.filter((item) => item.reportingPeriodId === reportingPeriodId)
    const guarantees = db.guarantees.reduce((sum, item) => sum + item.exposure, 0)
    const fiscal = {
      assetValue: financials.reduce((sum, item) => sum + (item.totalAssets ?? 0), 0),
      debt: financials.reduce((sum, item) => sum + (item.totalDebt ?? 0), 0),
      guarantees,
      subsidies: financials.reduce((sum, item) => sum + item.subsidies + (item.governmentSupport ?? 0), 0),
      profitable: financials.filter((item) => item.profitOrLoss > 0).length,
      lossMaking: financials.filter((item) => item.profitOrLoss < 0).length,
      netPortfolioResult: financials.reduce((sum, item) => sum + item.profitOrLoss, 0),
    }
    const openAudit = db.auditParas.filter((item) => item.status !== 'settled')
    const activeLitigation = db.litigation.filter((item) => item.status === 'active')
    const industrial = db.industrialPerformance.filter((item) => item.reportingPeriodId === reportingPeriodId)
    const risk = {
      boardVacancies: db.boardMembers.filter((item) => item.isVacancySlot).length,
      openAuditParas: openAudit.length,
      auditExposure: openAudit.reduce((sum, item) => sum + item.amountInvolved, 0),
      activeLitigation: activeLitigation.length,
      litigationExposure: activeLitigation.reduce((sum, item) => sum + (item.amountInvolved ?? 0), 0),
      overdueLoans: db.loans.filter((item) => item.defaultStatus === 'overdue' || item.repaymentStatus === 'overdue').length,
      nonCompliantObligations: db.compliance.filter((item) => item.status === 'non_compliant').length,
      averageCapacityUtilization: industrial.length ? Math.round(industrial.reduce((sum, item) => sum + item.capacityUtilization, 0) / industrial.length) : 0,
    }

    const sectorNames = [...new Set(organizations.map((item) => item.sector))]
    const sectors = sectorNames.map((sector) => {
      const orgIds = organizations.filter((item) => item.sector === sector).map((item) => item.id)
      const financeRows = financials.filter((item) => orgIds.includes(item.organizationId))
      const industrialRows = industrial.filter((item) => orgIds.includes(item.organizationId))
      return {
        sector,
        soes: orgIds.length,
        revenue: financeRows.reduce((sum, item) => sum + item.revenue, 0),
        profitOrLoss: financeRows.reduce((sum, item) => sum + item.profitOrLoss, 0),
        debt: financeRows.reduce((sum, item) => sum + (item.totalDebt ?? 0), 0),
        capacityUtilization: industrialRows.length ? Math.round(industrialRows.reduce((sum, item) => sum + item.capacityUtilization, 0) / industrialRows.length) : 0,
      }
    }).sort((a, b) => Math.abs(b.profitOrLoss) - Math.abs(a.profitOrLoss))

    const trend = db.reportingPeriods.filter((item) => item.type === 'annual').map((item) => {
      const rows = db.submissions.filter((submission) => submission.reportingPeriodId === item.id)
      return {
        periodId: item.id,
        period: item.label,
        received: rows.filter((submission) => receivedStatuses.includes(submission.status)).length,
        approved: rows.filter((submission) => approvedStatuses.includes(submission.status)).length,
        averageCompleteness: rows.length ? Math.round(rows.reduce((sum, submission) => sum + submission.completeness, 0) / rows.length) : 0,
      }
    })
    const organizationsAtRisk = organizations.map((organization) => {
      const rows = submissions.filter((item) => item.organizationId === organization.id)
      const openAuditParas = openAudit.filter((item) => item.organizationId === organization.id).length
      const activeCases = activeLitigation.filter((item) => item.organizationId === organization.id).length
      const overdueLoans = db.loans.filter((item) => item.organizationId === organization.id && (item.defaultStatus === 'overdue' || item.repaymentStatus === 'overdue')).length
      const boardVacancies = db.boardMembers.filter((item) => item.organizationId === organization.id && item.isVacancySlot).length
      const warnings = qualityBySubmission.filter((item) => item.submission.organizationId === organization.id).reduce((sum, item) => sum + item.blocking + item.warnings + item.evidenceGaps, 0) + openAuditParas + activeCases + overdueLoans + boardVacancies
      return { organizationId: organization.id, abbreviation: organization.abbreviation, sector: organization.sector, completion: rows.length ? Math.round(rows.reduce((sum, item) => sum + item.completeness, 0) / rows.length) : 0, warnings, boardVacancies, openAuditParas, activeLitigation: activeCases, overdueLoans }
    }).sort((a, b) => b.warnings - a.warnings)

    return simulateLatency({
      reportingPeriodId,
      periodLabel: period?.label ?? reportingPeriodId,
      asOf: DEMO_AS_OF,
      summary: {
        totalSoes: organizations.length,
        expectedModules: organizations.length * REPORTING_MODULES.length,
        received: received.length,
        underReview: submissions.filter((item) => item.status === SUBMISSION_STATUS.UNDER_REVIEW).length,
        clarificationPending: openClarifications.length,
        approved: approved.length,
        overdue: queue.filter((item) => item.overdue).length,
        averageCompleteness: submissions.length ? Math.round(submissions.reduce((sum, item) => sum + item.completeness, 0) / submissions.length) : 0,
      },
      workflow,
      moduleCoverage,
      quality: {
        blocking: qualityBySubmission.reduce((sum, item) => sum + item.blocking, 0),
        warnings: qualityBySubmission.reduce((sum, item) => sum + item.warnings, 0),
        evidenceGaps: qualityBySubmission.reduce((sum, item) => sum + item.evidenceGaps, 0),
        affectedSoes: new Set(qualityBySubmission.filter((item) => item.blocking + item.warnings + item.evidenceGaps > 0).map((item) => item.submission.organizationId)).size,
      },
      fiscal,
      risk,
      sectors,
      trend,
      priorityQueue: queue.slice(0, 8),
      organizationsAtRisk: organizationsAtRisk.slice(0, 8),
    })
  },

  async getPortfolio(query) {
    const periodId = query?.reportingPeriodId ?? 'period-fy2027'
    let rows: MoipPortfolioRow[] = db.organizations.map((organization) => {
      const finance =
        db.submissions.find(
          (s) =>
            s.organizationId === organization.id &&
            s.reportingPeriodId === periodId &&
            s.module === MODULE.FINANCE,
        ) ?? null
      const orgSubs = db.submissions.filter(
        (s) => s.organizationId === organization.id && s.reportingPeriodId === periodId,
      )
      const completion = orgSubs.length
        ? Math.round(orgSubs.reduce((a, s) => a + s.completeness, 0) / orgSubs.length)
        : 0
      const counts = finance
        ? validationCounts(finance)
        : { blocking: 0, warnings: 0, evidenceGaps: 0 }
      const warnings: string[] = []
      if (counts.blocking) warnings.push(`${counts.blocking} blocking`)
      if (counts.evidenceGaps) warnings.push('Evidence gaps')
      if (finance?.status === SUBMISSION_STATUS.CLARIFICATION_REQUESTED) {
        warnings.push('Clarification open')
      }
      const last = orgSubs
        .map((s) => s.updatedAt)
        .sort()
        .at(-1) ?? DEMO_AS_OF
      const rowAge = ageDays(finance?.submittedAt ?? finance?.updatedAt)
      const overdue =
        Boolean(finance) &&
        QUEUE_STATUSES.includes(finance!.status) &&
        rowAge > MOIP_COMPARISON_RULES.reviewAgeOverdueDays

      return {
        organization,
        sector: organization.sector,
        status: organization.status,
        activePeriodId: periodId,
        submissionStatus: finance?.status ?? 'not_started',
        completion,
        dataQuality: dataQualityLabel(counts.blocking, counts.warnings, completion),
        majorWarnings: warnings,
        assignedReviewerRole: finance?.assignedReviewerRole,
        lastActivityAt: last,
        overdue,
      }
    })

    if (query?.sector) rows = rows.filter((r) => r.sector === query.sector)
    if (query?.status) rows = rows.filter((r) => r.status === query.status)
    if (query?.submissionStatus) {
      rows = rows.filter((r) => r.submissionStatus === query.submissionStatus)
    }
    if (query?.reviewer) {
      rows = rows.filter((r) => r.assignedReviewerRole === query.reviewer)
    }
    if (query?.riskOnly) rows = rows.filter((r) => r.majorWarnings.length > 0 || r.overdue)
    if (query?.overdueOnly) rows = rows.filter((r) => r.overdue)
    if (query?.search) {
      const q = query.search.toLowerCase()
      rows = rows.filter(
        (r) =>
          r.organization.name.toLowerCase().includes(q) ||
          r.organization.abbreviation.toLowerCase().includes(q),
      )
    }
    rows.sort((a, b) => a.organization.abbreviation.localeCompare(b.organization.abbreviation))
    return simulateLatency(paginate(rows, query))
  },

  async getSubmissionQueue(query) {
    let rows = db.submissions
      .filter((s) => QUEUE_STATUSES.includes(s.status))
      .map(buildQueueRow)
      .filter((r): r is MoipQueueRow => Boolean(r))

    if (query?.status) rows = rows.filter((r) => r.submission.status === query.status)
    if (query?.module) rows = rows.filter((r) => r.submission.module === query.module)
    if (query?.reviewer) {
      rows = rows.filter((r) => r.submission.assignedReviewerRole === query.reviewer)
    }
    if (query?.priority) rows = rows.filter((r) => r.priority === query.priority)
    if (query?.search) {
      const q = query.search.toLowerCase()
      rows = rows.filter(
        (r) =>
          r.submission.id.toLowerCase().includes(q) ||
          r.organization.abbreviation.toLowerCase().includes(q),
      )
    }

    const sortBy = query?.sortBy ?? 'priority'
    const priRank = { critical: 0, high: 1, normal: 2 }
    rows.sort((a, b) => {
      if (sortBy === 'age') return b.ageDays - a.ageDays
      if (sortBy === 'updatedAt') {
        return b.submission.updatedAt.localeCompare(a.submission.updatedAt)
      }
      const pr = priRank[a.priority] - priRank[b.priority]
      if (pr !== 0) return pr
      return b.ageDays - a.ageDays
    })

    return simulateLatency(paginate(rows, query))
  },

  async assignReviewer(submissionId, reviewerRole, actorRole) {
    requirePerm(actorRole, PERMISSION.SUBMISSION_REVIEW)
    const idx = db.submissions.findIndex((s) => s.id === submissionId)
    if (idx < 0) throw new AppError('Submission not found', 'NOT_FOUND')
    db.submissions[idx] = {
      ...db.submissions[idx],
      assignedReviewerRole: reviewerRole,
      updatedAt: new Date().toISOString(),
    }
    db.timeline.push({
      id: `tl-assign-${submissionId}-${Date.now()}`,
      organizationId: db.submissions[idx].organizationId,
      occurredAt: new Date().toISOString(),
      title: `Reviewer assigned: ${reviewerRole}`,
      category: 'review',
      actorRole,
      linkedRecordType: 'submission',
      linkedRecordId: submissionId,
    })
    return simulateMutation(db.submissions[idx])
  },

  async bulkAssignPlaceholder(submissionIds, reviewerRole, actorRole) {
    requirePerm(actorRole, PERMISSION.SUBMISSION_REVIEW)
    let assigned = 0
    for (const id of submissionIds) {
      try {
        await mockMoipPortalService.assignReviewer(id, reviewerRole, actorRole)
        assigned += 1
      } catch {
        /* skip invalid */
      }
    }
    return simulateMutation({
      assigned,
      note: 'Bulk assignment is available in this demo — production assignment rules are provisional.',
    })
  },

  async getClarificationQueue(query) {
    let rows: MoipClarificationRow[] = db.clarifications.map((clarification) => {
      const organization = orgOf(clarification.organizationId)!
      const submission = db.submissions.find((s) => s.id === clarification.submissionId)!
      const age = ageDays(clarification.createdAt)
      const overdue =
        clarification.status === 'open' &&
        age > MOIP_COMPARISON_RULES.clarificationResponseOverdueDays
      return {
        clarification,
        organization,
        submission,
        ageDays: age,
        responseReceived: Boolean(clarification.response),
        overdue,
      }
    })
    if (query?.status) rows = rows.filter((r) => r.clarification.status === query.status)
    if (query?.search) {
      const q = query.search.toLowerCase()
      rows = rows.filter(
        (r) =>
          r.organization.abbreviation.toLowerCase().includes(q) ||
          r.clarification.question.toLowerCase().includes(q),
      )
    }
    rows.sort((a, b) => b.ageDays - a.ageDays)
    return simulateLatency(paginate(rows, query))
  },

  async getApprovalsQueue() {
    const rows = db.submissions
      .filter(
        (s) =>
          (s.status === SUBMISSION_STATUS.UNDER_REVIEW ||
            s.status === SUBMISSION_STATUS.RESUBMITTED),
      )
      .map(buildQueueRow)
      .filter((r): r is MoipQueueRow => r != null && r.validationIssues === 0)
    return simulateLatency(rows)
  },

  async getWorkload(role) {
    const assigned = db.submissions.filter(
      (s) =>
        QUEUE_STATUSES.includes(s.status) &&
        (s.assignedReviewerRole === role || !s.assignedReviewerRole),
    )
    const rows = assigned.map(buildQueueRow).filter((r): r is MoipQueueRow => Boolean(r))
    const clarWaiting = db.clarifications.filter((c) => c.status === 'open').length
    const approvals = rows.filter(
      (r) =>
        r.submission.status === SUBMISSION_STATUS.UNDER_REVIEW && r.validationIssues === 0,
    ).length
    return simulateLatency({
      assignedReviews: rows.length,
      dueSoon: rows.filter((r) => r.ageDays >= 7 && r.ageDays <= MOIP_COMPARISON_RULES.reviewAgeOverdueDays)
        .length,
      overdue: rows.filter((r) => r.overdue).length,
      clarificationsWaiting: clarWaiting,
      approvalsPending: approvals,
    } satisfies MoipWorkloadSummary)
  },

  async getModuleSummaries(organizationId, reportingPeriodId) {
    const summaries: MoipModuleSummary[] = REPORTING_MODULES.map((m) => {
      const sub = db.submissions.find(
        (s) =>
          s.organizationId === organizationId &&
          s.reportingPeriodId === reportingPeriodId &&
          s.module === m.id,
      )
      const counts = sub ? validationCounts(sub) : { blocking: 0, warnings: 0, evidenceGaps: 0 }
      return {
        module: m.id,
        label: m.label,
        status: sub?.status ?? 'not_started',
        issueCount: counts.blocking + counts.warnings + counts.evidenceGaps,
        submissionId: sub?.id,
      }
    })
    return simulateLatency(summaries)
  },

  async getComparison(submissionId) {
    const submission = db.submissions.find((s) => s.id === submissionId)
    if (!submission) throw new AppError('Submission not found', 'NOT_FOUND')
    const highlights: MoipComparisonHighlight[] = []
    const current = db.financialMetrics.find(
      (f) =>
        f.organizationId === submission.organizationId &&
        f.reportingPeriodId === submission.reportingPeriodId,
    )
    const previous = db.financialMetrics.find(
      (f) =>
        f.organizationId === submission.organizationId &&
        f.reportingPeriodId === 'period-fy2026',
    )
    const pct = (cur?: number, prev?: number) => {
      if (cur == null || prev == null || prev === 0) return null
      return ((cur - prev) / Math.abs(prev)) * 100
    }

    if (current && previous) {
      ;(['revenue', 'operatingExpenses', 'profitOrLoss', 'subsidies'] as const).forEach((field) => {
        const cur = current[field]
        const prev = previous[field]
        if ((cur == null || Number.isNaN(cur)) && prev != null) {
          highlights.push({
            field,
            kind: 'missing',
            previousValue: String(prev),
            currentValue: '—',
            note: 'Value present in previous approved period; missing in current.',
          })
          return
        }
        const change = pct(cur, prev)
        if (change != null && Math.abs(change) >= MOIP_COMPARISON_RULES.materialYoYPct) {
          highlights.push({
            field,
            kind: 'material_change',
            previousValue: String(prev),
            currentValue: String(cur),
            note: `YoY ${change.toFixed(1)}% (≥ ${MOIP_COMPARISON_RULES.materialYoYPct}% threshold).`,
          })
        }
      })
      if (previous.status !== current.status) {
        highlights.push({
          field: 'status',
          kind: 'status_change',
          previousValue: previous.status,
          currentValue: current.status,
          note: 'Reporting status changed versus prior period metric.',
        })
      }
    }

    const versions = current
      ? db.financeVersions
          .filter((v) => v.financialMetricId === current.id)
          .sort((a, b) => a.capturedAt.localeCompare(b.capturedAt))
      : []
    if (versions.length >= 2) {
      const prevV = versions[versions.length - 2]!
      const curV = versions[versions.length - 1]!
      highlights.push({
        field: 'version',
        kind: 'version',
        previousValue: prevV.version,
        currentValue: curV.version,
        note: `Submitted vs revised: ${prevV.reason} → ${curV.reason}`,
      })
    }

    return simulateLatency({
      organizationId: submission.organizationId,
      reportingPeriodId: submission.reportingPeriodId,
      previousPeriodId: previous ? 'period-fy2026' : undefined,
      currentVersion: submission.version,
      previousVersion: versions.at(-2)?.version,
      highlights,
      rulesNote: MOIP_COMPARISON_RULES.note,
    } satisfies MoipComparisonResult)
  },

  async getDataQuality(organizationId) {
    const orgs = organizationId
      ? db.organizations.filter((o) => o.id === organizationId)
      : db.organizations
    const rows = orgs.map((o) => {
      const finance = db.submissions.find(
        (s) =>
          s.organizationId === o.id &&
          s.reportingPeriodId === 'period-fy2027' &&
          s.module === MODULE.FINANCE,
      )
      const counts = finance
        ? validationCounts(finance)
        : { blocking: 0, warnings: 0, evidenceGaps: 0 }
      const incompleteModules = db.submissions.filter(
        (s) =>
          s.organizationId === o.id &&
          s.reportingPeriodId === 'period-fy2027' &&
          s.completeness < 80,
      ).length
      return {
        organizationId: o.id,
        abbreviation: o.abbreviation,
        blocking: counts.blocking,
        warnings: counts.warnings,
        evidenceGaps: counts.evidenceGaps,
        incompleteModules,
        submissionId: finance?.id,
      }
    })
    return simulateLatency(rows)
  },

  async returnSubmission(submissionId, role, payload) {
    requirePerm(role, PERMISSION.SUBMISSION_REVIEW)
    const idx = db.submissions.findIndex((s) => s.id === submissionId)
    if (idx < 0) throw new AppError('Submission not found', 'NOT_FOUND')
    const submission = db.submissions[idx]
    if (!canTransition(submission.status, SUBMISSION_STATUS.RETURNED)) {
      throw new AppError('Return only allowed from under review', 'VALIDATION')
    }
    db.submissions[idx] = {
      ...submission,
      status: SUBMISSION_STATUS.RETURNED,
      updatedAt: new Date().toISOString(),
    }
    if (submission.module === MODULE.FINANCE) {
      const fIdx = db.financialMetrics.findIndex(
        (f) =>
          f.organizationId === submission.organizationId &&
          f.reportingPeriodId === submission.reportingPeriodId,
      )
      if (fIdx >= 0) {
        db.financialMetrics[fIdx] = {
          ...db.financialMetrics[fIdx],
          status: SUBMISSION_STATUS.RETURNED,
        }
      }
    }
    const due = payload.dueDate ?? '2026-08-25'
    db.tasks.push({
      id: `task-return-${submissionId}-${Date.now()}`,
      organizationId: submission.organizationId,
      title: `Rework returned item: ${payload.affectedItem ?? submission.module}`,
      dueDate: due,
      priority: 'high',
      status: 'open',
      ownerRole: ROLE.SOE_FOCAL_PERSON,
      linkedRecordType: 'submission',
      linkedRecordId: submissionId,
    })
    db.timeline.push({
      id: `tl-return-${submissionId}-${Date.now()}`,
      organizationId: submission.organizationId,
      occurredAt: new Date().toISOString(),
      title: `Returned to SOE: ${payload.reason}`,
      category: 'review',
      actorRole: role,
      comment: payload.affectedItem,
      linkedRecordType: 'submission',
      linkedRecordId: submissionId,
    })
    db.notifications.unshift({
      id: `notif-return-${Date.now()}`,
      organizationId: submission.organizationId,
      title: 'Submission returned',
      body: payload.reason,
      linkRoute: '/soe/submissions',
      createdAt: new Date().toISOString(),
      status: 'unread',
      linkedRecordType: 'submission',
      linkedRecordId: submissionId,
    })
    return simulateMutation(db.submissions[idx])
  },

  async createEscalation(role, payload) {
    requirePerm(role, PERMISSION.ESCALATION_CREATE)
    const escalation: Escalation = {
      id: `esc-${Date.now()}`,
      organizationId: payload.organizationId,
      submissionId: payload.submissionId,
      reason: payload.reason,
      reasonCode: payload.reasonCode,
      severity: payload.severity,
      ownerRole: payload.ownerRole,
      dueDate: payload.dueDate,
      status: 'open',
      createdAt: new Date().toISOString(),
      createdByRole: role,
      historyNote: 'Escalation opened from MoIP oversight',
      isDummyDemonstrationData: true,
    }
    db.escalations.push(escalation)
    db.tasks.push({
      id: `task-esc-${escalation.id}`,
      organizationId: payload.organizationId,
      title: `Escalation: ${payload.reason}`,
      dueDate: payload.dueDate,
      priority: payload.severity === ESCALATION_SEVERITY.CRITICAL ? 'critical' : 'high',
      status: 'open',
      ownerRole: payload.ownerRole,
      linkedRecordType: 'escalation',
      linkedRecordId: escalation.id,
    })
    db.timeline.push({
      id: `tl-esc-${escalation.id}`,
      organizationId: payload.organizationId,
      occurredAt: escalation.createdAt,
      title: `Escalated (${payload.severity}): ${payload.reason}`,
      category: 'escalation',
      actorRole: role,
      linkedRecordType: 'escalation',
      linkedRecordId: escalation.id,
    })
    return simulateMutation(escalation)
  },

  async getEscalations(query) {
    let items = [...(db.escalations ?? [])]
    if (query?.status) items = items.filter((e) => e.status === query.status)
    items.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    return simulateLatency(items)
  },

  async resolveEscalation(id, role) {
    requirePerm(role, PERMISSION.ESCALATION_CREATE)
    const idx = db.escalations.findIndex((e) => e.id === id)
    if (idx < 0) throw new AppError('Escalation not found', 'NOT_FOUND')
    db.escalations[idx] = { ...db.escalations[idx], status: 'resolved' }
    const task = db.tasks.find((t) => t.linkedRecordId === id)
    if (task) {
      const tIdx = db.tasks.findIndex((t) => t.id === task.id)
      db.tasks[tIdx] = { ...db.tasks[tIdx], status: 'done' }
    }
    return simulateMutation(db.escalations[idx])
  },
}
