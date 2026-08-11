import {
  MODULE,
  ROLE_LABEL,
  SUBMISSION_STATUS,
  type ModuleId,
  type RoleId,
  type SubmissionStatus,
} from '@/constants'
import { db } from '@/mock-data'
import { hasPermission, PERMISSION } from '@/permissions'
import type { Clarification, DocumentMeta, Organization, Submission } from '@/types/domain'
import { AppError, simulateLatency, simulateMutation } from '@/utils'
import { REPORTING_MODULES } from '@/workflow/moduleCatalog'

export interface ReviewField {
  key: string
  label: string
  value: string
  rawValue: unknown
  previousValue?: string
  changed?: boolean
}

export interface ReviewRecord {
  id: string
  title: string
  section: string
  fields: ReviewField[]
}

export interface ModuleReviewSnapshot {
  submission: Submission
  organization: Organization
  moduleLabel: string
  periodLabel: string
  records: ReviewRecord[]
  evidence: DocumentMeta[]
  validation: {
    blocking: number
    warnings: number
    evidenceGaps: number
    messages: string[]
  }
  history: Array<{
    id: string
    occurredAt: string
    title: string
    actor?: string
    comment?: string
  }>
}

export interface ReviewPackageModule {
  id: ModuleId
  label: string
  submission?: Submission
  blocking: number
  warnings: number
  evidenceGaps: number
}

export interface ReviewPackage {
  organization: Organization
  reportingPeriodId: string
  periodLabel: string
  modules: ReviewPackageModule[]
  submitted: number
  approved: number
  returned: number
  completeness: number
}

export interface PortfolioModuleRow {
  submission: Submission
  organization: Organization
  recordCount: number
  evidenceCount: number
  blocking: number
}

export interface PortfolioModuleResult {
  moduleId: ModuleId
  moduleLabel: string
  rows: PortfolioModuleRow[]
  records: Array<ReviewRecord & { organization: Organization; submissionId: string }>
}

const HIDDEN_FIELDS = new Set([
  'id',
  'organizationId',
  'reportingPeriodId',
  'isDummyDemonstrationData',
  'scenarioId',
  'scenarioTag',
  'cnic',
  'salaryPkr',
  'remunerationPkr',
  'sittingFeePkr',
  'travelExpensePkr',
  'bonusPkr',
  'monthlyRemunerationPkr',
])

const submittedStatuses = new Set<SubmissionStatus>([
  SUBMISSION_STATUS.SUBMITTED,
  SUBMISSION_STATUS.UNDER_REVIEW,
  SUBMISSION_STATUS.CLARIFICATION_REQUESTED,
  SUBMISSION_STATUS.RETURNED,
  SUBMISSION_STATUS.RESUBMITTED,
  SUBMISSION_STATUS.APPROVED,
  SUBMISSION_STATUS.LOCKED,
])

const approvedStatuses = new Set<SubmissionStatus>([
  SUBMISSION_STATUS.APPROVED,
  SUBMISSION_STATUS.LOCKED,
])

const snapshots = new Map<string, ReviewRecord[]>()

function assertPermission(role: RoleId, permission: (typeof PERMISSION)[keyof typeof PERMISSION]) {
  if (!hasPermission(role, permission)) throw new AppError('Permission denied', 'PERMISSION')
}

function humanize(key: string) {
  return key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/Pkr$/i, '(PKR)')
    .replace(/^./, (value) => value.toUpperCase())
}

function formatValue(key: string, value: unknown): string {
  if (value == null || value === '') return 'Not provided'
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (typeof value === 'number') {
    if (/pkr|value|amount|revenue|expense|capex|subsid|asset|debt|capital|budget|actual/i.test(key)) {
      return `PKR ${new Intl.NumberFormat('en-PK', { maximumFractionDigits: 0 }).format(value)}`
    }
    if (/pct|percent|utilization|rate/i.test(key)) return `${value.toLocaleString('en-PK')}%`
    return value.toLocaleString('en-PK')
  }
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === 'object' ? JSON.stringify(item) : String(item)))
      .join(', ')
  }
  return String(value).replaceAll('_', ' ')
}

function titleOf(record: Record<string, unknown>, fallback: string) {
  const candidate =
    record.name ??
    record.title ??
    record.designation ??
    record.area ??
    record.caseNumber ??
    record.reference ??
    record.initiative ??
    record.category ??
    record.id
  return candidate ? String(candidate) : fallback
}

function recordRows(section: string, records: unknown[]): ReviewRecord[] {
  return records.map((item, index) => {
    const row = item as Record<string, unknown>
    return {
      id: String(row.id ?? `${section}-${index}`),
      title: titleOf(row, `${section} ${index + 1}`),
      section,
      fields: Object.entries(row)
        .filter(([key]) => !HIDDEN_FIELDS.has(key))
        .map(([key, value]) => ({
          key,
          label: humanize(key),
          value: formatValue(key, value),
          rawValue: value,
        })),
    }
  })
}

function byOrg<T extends { organizationId: string }>(rows: T[], organizationId: string) {
  return rows.filter((row) => row.organizationId === organizationId)
}

function byPeriod<T extends { reportingPeriodId: string }>(rows: T[], reportingPeriodId: string) {
  return rows.filter((row) => row.reportingPeriodId === reportingPeriodId)
}

function sourceRecords(submission: Submission): ReviewRecord[] {
  const orgId = submission.organizationId
  const periodId = submission.reportingPeriodId
  switch (submission.module) {
    case MODULE.ENTERPRISE:
      return [
        ...recordRows('Enterprise profile', db.organizations.filter((o) => o.id === orgId)),
        ...recordRows('Ownership', byOrg(db.ownershipLines, orgId)),
        ...recordRows('Locations', byOrg(db.locations, orgId)),
        ...recordRows('Contacts', byOrg(db.contacts, orgId)),
        ...recordRows(
          'Corporate structure',
          db.relationships.filter(
            (r) => r.parentOrganizationId === orgId || r.relatedOrganizationId === orgId,
          ),
        ),
      ]
    case MODULE.ASSETS:
      return recordRows('Asset register', byOrg(db.assets, orgId))
    case MODULE.WORKFORCE:
      return [
        ...recordRows('Employees', byOrg(db.employees, orgId)),
        ...recordRows('Sanctioned posts', byOrg(db.sanctionedPosts, orgId)),
        ...recordRows('Daily wagers', byOrg(db.dailyWagers, orgId)),
        ...recordRows('Consultants', byOrg(db.consultants, orgId)),
      ]
    case MODULE.BOARD:
      return [
        ...recordRows('Board members', byOrg(db.boardMembers, orgId)),
        ...recordRows('Committees', byOrg(db.boardCommittees, orgId)),
        ...recordRows('Governance calendar', byOrg(db.governanceCalendar, orgId)),
      ]
    case MODULE.EXECUTIVES:
      return recordRows('Executive management', byOrg(db.executives, orgId))
    case MODULE.FINANCE:
      return [
        ...recordRows('Financial metrics', byPeriod(byOrg(db.financialMetrics, orgId), periodId)),
        ...recordRows('Budget lines', byPeriod(byOrg(db.budgetLines, orgId), periodId)),
      ]
    case MODULE.LOANS:
      return [
        ...recordRows('Loans', byOrg(db.loans, orgId)),
        ...recordRows('Repayments', byOrg(db.loanRepayments, orgId)),
        ...recordRows('Grants', byOrg(db.grants, orgId)),
        ...recordRows('Guarantees', byOrg(db.guarantees, orgId)),
      ]
    case MODULE.PROCUREMENT:
      return [
        ...recordRows('Procurements', byOrg(db.procurement, orgId)),
        ...recordRows('Contracts', byOrg(db.contracts, orgId)),
      ]
    case MODULE.AUDIT:
      return [
        ...recordRows('Audit register', byOrg(db.auditRegisters, orgId)),
        ...recordRows('Audit paras', byOrg(db.auditParas, orgId)),
        ...recordRows('PAC observations', byOrg(db.pacObservations, orgId)),
      ]
    case MODULE.LITIGATION:
      return recordRows('Litigation cases', byOrg(db.litigation, orgId))
    case MODULE.COMPLIANCE:
      return recordRows('Compliance obligations', byOrg(db.compliance, orgId))
    case MODULE.INDUSTRIAL:
      return recordRows(
        'Industrial performance',
        byPeriod(byOrg(db.industrialPerformance, orgId), periodId),
      )
    case MODULE.PRIVATIZATION:
      return [
        ...recordRows('Privatization cases', byOrg(db.privatizationCases, orgId)),
        ...recordRows('Milestones', byOrg(db.privatizationMilestones, orgId)),
        ...recordRows('Transformation initiatives', byOrg(db.transformationInitiatives, orgId)),
      ]
    case MODULE.DOCUMENTS:
      return recordRows(
        'Document register',
        db.documents.filter(
          (d) =>
            d.organizationId === orgId &&
            (!d.reportingPeriodId || d.reportingPeriodId === periodId),
        ),
      )
    default:
      return []
  }
}

function evidenceFor(submission: Submission) {
  return db.documents.filter(
    (document) =>
      document.organizationId === submission.organizationId &&
      (!document.reportingPeriodId || document.reportingPeriodId === submission.reportingPeriodId) &&
      (document.linkedRecordId === submission.id ||
        document.linkedModule === submission.module ||
        document.category === submission.module),
  )
}

function validationFor(submission: Submission, records: ReviewRecord[], evidence: DocumentMeta[]) {
  const messages: string[] = []
  let blocking = 0
  let warnings = 0
  if (submission.completeness < 80) {
    blocking += 1
    messages.push(`Submission completeness is ${submission.completeness}%; at least 80% is required.`)
  } else if (submission.completeness < 100) {
    warnings += 1
    messages.push(`Submission is ${submission.completeness}% complete.`)
  }
  if (records.length === 0) {
    blocking += 1
    messages.push('No submitted records were found for this module and reporting period.')
  }
  const evidenceGaps = evidence.length === 0 ? 1 : evidence.filter((d) => d.evidenceStatus === 'missing').length
  if (evidenceGaps) messages.push(`${evidenceGaps} evidence gap(s) require review.`)
  return { blocking, warnings, evidenceGaps, messages }
}

function submissionById(id: string) {
  const submission = db.submissions.find((item) => item.id === id)
  if (!submission) throw new AppError('Submission not found', 'NOT_FOUND')
  return submission
}

function capture(submission: Submission) {
  const snapshotKey = `${submission.id}:${submission.version}`
  const existing = snapshots.get(snapshotKey)
  if (existing) return structuredClone(existing)
  const records = sourceRecords(submission)
  snapshots.set(snapshotKey, structuredClone(records))
  return records
}

function writeHistory(submission: Submission, role: RoleId, action: string, comment?: string) {
  const occurredAt = new Date().toISOString()
  db.submissionHistory.unshift({
    id: `review-${submission.id}-${Date.now()}`,
    organizationId: submission.organizationId,
    submissionId: submission.id,
    reportingPeriodId: submission.reportingPeriodId,
    module: submission.module,
    occurredAt,
    actorRole: role,
    action,
    status: submission.status,
    comment,
    relatedVersion: submission.version,
  })
  db.timeline.unshift({
    id: `timeline-${submission.id}-${Date.now()}`,
    organizationId: submission.organizationId,
    occurredAt,
    title: `${REPORTING_MODULES.find((m) => m.id === submission.module)?.label ?? submission.module}: ${action.replaceAll('_', ' ')}`,
    category: 'review',
    actorRole: role,
    action,
    status: submission.status,
    comment,
    relatedVersion: submission.version,
  })
}

function updateStatus(submission: Submission, status: SubmissionStatus) {
  submission.status = status
  submission.updatedAt = new Date().toISOString()
  if (status === SUBMISSION_STATUS.LOCKED) submission.version = '1.0'
}

export const mockModuleReviewService = {
  async getReview(submissionId: string): Promise<ModuleReviewSnapshot> {
    const submission = submissionById(submissionId)
    if (!submittedStatuses.has(submission.status)) {
      throw new AppError('This module has not been submitted to MoIP for review.', 'VALIDATION')
    }
    const organization = db.organizations.find((org) => org.id === submission.organizationId)
    if (!organization) throw new AppError('Organization not found', 'NOT_FOUND')
    const records = capture(submission)
    const evidence = evidenceFor(submission)
    const periodLabel = db.reportingPeriods.find((p) => p.id === submission.reportingPeriodId)?.label ?? submission.reportingPeriodId
    const history = [
      ...db.submissionHistory
        .filter((event) => event.submissionId === submission.id)
        .map((event) => ({
          id: event.id,
          occurredAt: event.occurredAt,
          title: event.action.replaceAll('_', ' '),
          actor: event.actorRole,
          comment: event.comment,
        })),
      ...db.timeline
        .filter((event) => event.linkedRecordId === submission.id)
        .map((event) => ({
          id: event.id,
          occurredAt: event.occurredAt,
          title: event.title,
          actor: event.actorRole,
          comment: event.comment,
        })),
    ].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
    return simulateLatency({
      submission,
      organization,
      moduleLabel: REPORTING_MODULES.find((m) => m.id === submission.module)?.label ?? submission.module,
      periodLabel,
      records,
      evidence,
      validation: validationFor(submission, records, evidence),
      history,
    })
  },

  async getPackage(organizationId: string, reportingPeriodId: string): Promise<ReviewPackage> {
    const organization = db.organizations.find((org) => org.id === organizationId)
    if (!organization) throw new AppError('Organization not found', 'NOT_FOUND')
    const modules: ReviewPackageModule[] = REPORTING_MODULES.map((definition) => {
      const submission = db.submissions.find(
        (item) =>
          item.organizationId === organizationId &&
          item.reportingPeriodId === reportingPeriodId &&
          item.module === definition.id,
      )
      if (!submission || !submittedStatuses.has(submission.status)) {
        return { id: definition.id, label: definition.label, blocking: 0, warnings: 0, evidenceGaps: 0 }
      }
      const records = capture(submission)
      const validation = validationFor(submission, records, evidenceFor(submission))
      return {
        id: definition.id,
        label: definition.label,
        submission,
        blocking: validation.blocking,
        warnings: validation.warnings,
        evidenceGaps: validation.evidenceGaps,
      }
    })
    const submitted = modules.filter((item) => item.submission && submittedStatuses.has(item.submission.status)).length
    const approved = modules.filter((item) => item.submission && approvedStatuses.has(item.submission.status)).length
    const returned = modules.filter((item) => item.submission?.status === SUBMISSION_STATUS.RETURNED).length
    return simulateLatency({
      organization,
      reportingPeriodId,
      periodLabel: db.reportingPeriods.find((p) => p.id === reportingPeriodId)?.label ?? reportingPeriodId,
      modules,
      submitted,
      approved,
      returned,
      completeness: modules.length ? Math.round(modules.reduce((sum, item) => sum + (item.submission?.completeness ?? 0), 0) / modules.length) : 0,
    })
  },

  async getPortfolioModule(args: {
    moduleId: ModuleId
    organizationId?: string
    reportingPeriodId?: string
    dataState?: 'approved' | 'submitted' | 'all'
  }): Promise<PortfolioModuleResult> {
    const dataState = args.dataState ?? 'approved'
    let submissions = db.submissions.filter((item) => item.module === args.moduleId)
    if (args.organizationId) submissions = submissions.filter((item) => item.organizationId === args.organizationId)
    if (args.reportingPeriodId) submissions = submissions.filter((item) => item.reportingPeriodId === args.reportingPeriodId)
    if (dataState === 'approved') submissions = submissions.filter((item) => approvedStatuses.has(item.status))
    else submissions = submissions.filter((item) => submittedStatuses.has(item.status))
    const rows: PortfolioModuleRow[] = []
    const records: PortfolioModuleResult['records'] = []
    for (const submission of submissions) {
      const organization = db.organizations.find((org) => org.id === submission.organizationId)
      if (!organization) continue
      const reviewRecords = capture(submission)
      const evidence = evidenceFor(submission)
      const validation = validationFor(submission, reviewRecords, evidence)
      rows.push({
        submission,
        organization,
        recordCount: reviewRecords.length,
        evidenceCount: evidence.length,
        blocking: validation.blocking,
      })
      records.push(...reviewRecords.map((record) => ({ ...record, organization, submissionId: submission.id })))
    }
    return simulateLatency({
      moduleId: args.moduleId,
      moduleLabel: REPORTING_MODULES.find((m) => m.id === args.moduleId)?.label ?? args.moduleId,
      rows,
      records,
    })
  },

  async takeUnderReview(submissionId: string, role: RoleId) {
    assertPermission(role, PERMISSION.SUBMISSION_REVIEW)
    const submission = submissionById(submissionId)
    if (
      submission.status !== SUBMISSION_STATUS.SUBMITTED &&
      submission.status !== SUBMISSION_STATUS.RESUBMITTED
    ) {
      throw new AppError('Only submitted or resubmitted modules can enter review.', 'VALIDATION')
    }
    capture(submission)
    updateStatus(submission, SUBMISSION_STATUS.UNDER_REVIEW)
    writeHistory(submission, role, 'taken_under_review')
    return simulateMutation(submission)
  },

  async requestClarification(submissionId: string, role: RoleId, field: string, question: string) {
    assertPermission(role, PERMISSION.CLARIFICATION_CREATE)
    const submission = submissionById(submissionId)
    if (submission.status !== SUBMISSION_STATUS.UNDER_REVIEW) {
      throw new AppError('Take the module under review before requesting clarification.', 'VALIDATION')
    }
    const clarification: Clarification = {
      id: `clar-${submissionId}-${Date.now()}`,
      submissionId,
      organizationId: submission.organizationId,
      module: submission.module,
      question,
      affectedField: field,
      status: 'open',
      createdAt: new Date().toISOString(),
      issuedByRole: role,
    }
    db.clarifications.unshift(clarification)
    updateStatus(submission, SUBMISSION_STATUS.CLARIFICATION_REQUESTED)
    writeHistory(submission, role, 'clarification_requested', `${field}: ${question}`)
    return simulateMutation(clarification)
  },

  async returnSubmission(submissionId: string, role: RoleId, reason: string) {
    assertPermission(role, PERMISSION.SUBMISSION_REVIEW)
    const submission = submissionById(submissionId)
    if (
      submission.status !== SUBMISSION_STATUS.UNDER_REVIEW &&
      submission.status !== SUBMISSION_STATUS.RESUBMITTED &&
      submission.status !== SUBMISSION_STATUS.CLARIFICATION_REQUESTED
    ) {
      throw new AppError('This module is not eligible to be returned.', 'VALIDATION')
    }
    updateStatus(submission, SUBMISSION_STATUS.RETURNED)
    writeHistory(submission, role, 'returned_to_soe', reason)
    return simulateMutation(submission)
  },

  async approveSubmission(submissionId: string, role: RoleId, statement: string) {
    assertPermission(role, PERMISSION.SUBMISSION_APPROVE)
    const submission = submissionById(submissionId)
    if (submission.status !== SUBMISSION_STATUS.UNDER_REVIEW) {
      throw new AppError('The module must be under review before approval.', 'VALIDATION')
    }
    const records = capture(submission)
    const validation = validationFor(submission, records, evidenceFor(submission))
    if (validation.blocking > 0) {
      throw new AppError('Resolve blocking validation findings before approval.', 'VALIDATION')
    }
    updateStatus(submission, SUBMISSION_STATUS.LOCKED)
    writeHistory(submission, role, 'approved_and_locked', statement || `Approved by ${ROLE_LABEL[role]}`)
    return simulateMutation(submission)
  },
}
