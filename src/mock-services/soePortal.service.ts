import {
  ROLE,
  ROLE_LABEL,
  SUBMISSION_STATUS,
  type ModuleId,
  type RoleId,
  type SubmissionStatus,
} from '@/constants'
import { db } from '@/mock-data'
import type {
  Clarification,
  DocumentMeta,
  Organization,
  ReportingPeriod,
  Submission,
  TaskItem,
  TimelineEvent,
} from '@/types/domain'
import { AppError, simulateLatency, simulateMutation } from '@/utils'
import {
  REPORTING_MODULES,
  getModuleDef,
  modulesForRole,
  type ReportingModuleDef,
} from '@/workflow/moduleCatalog'
import { hasPermission, PERMISSION } from '@/permissions'

export type ValidationSeverity = 'blocking' | 'warning' | 'evidence' | 'incomplete'

export interface ModuleValidationIssue {
  id: string
  moduleId: ModuleId
  moduleLabel: string
  severity: ValidationSeverity
  message: string
  ownerRole: RoleId
  status: SubmissionStatus
  route: string
  submissionId: string
}

export interface ModuleWorkspaceRow {
  def: ReportingModuleDef
  submission: Submission
  validationIssueCount: number
  evidenceGapCount: number
  nextAction: string
  isOwnedByRole: boolean
}

export interface SoePortalDashboard {
  organization: Organization
  period: ReportingPeriod
  deadline: string
  overallCompletion: number
  modulesComplete: number
  modulesIncomplete: number
  overallStatus: SubmissionStatus | 'mixed'
  blockingCount: number
  warningCount: number
  evidenceGapCount: number
  modules: ModuleWorkspaceRow[]
  pendingActions: Array<{ id: string; title: string; route: string; priority: string }>
  deadlines: Array<{ id: string; title: string; dueDate: string; route: string }>
  recentActivity: TimelineEvent[]
  openClarifications: number
  certificationReadyCount: number
}

export interface SubmissionReadiness {
  organization: Organization
  period: ReportingPeriod
  version: string
  overallCompletion: number
  modulesComplete: number
  modulesTotal: number
  blockingErrors: ModuleValidationIssue[]
  warnings: ModuleValidationIssue[]
  missingEvidence: ModuleValidationIssue[]
  outstandingClarifications: Clarification[]
  certificationRequirements: string[]
  canSubmit: boolean
  certifiers: string[]
}

function findPeriod(reportingPeriodId: string): ReportingPeriod {
  const period = db.reportingPeriods.find((p) => p.id === reportingPeriodId)
  if (!period) throw new AppError('Reporting period not found', 'NOT_FOUND')
  return period
}

function findOrg(organizationId: string): Organization {
  const org = db.organizations.find((o) => o.id === organizationId)
  if (!org) throw new AppError('Organization not found', 'NOT_FOUND')
  return org
}

function ensureSubmission(
  organizationId: string,
  reportingPeriodId: string,
  moduleId: ModuleId,
): Submission {
  const existing = db.submissions.find(
    (s) =>
      s.organizationId === organizationId &&
      s.reportingPeriodId === reportingPeriodId &&
      s.module === moduleId,
  )
  if (existing) return existing

  // Fallback for periods without seeded module rows (e.g. quarterly)
  const org = findOrg(organizationId)
  const row: Submission = {
    id: `sub-${org.abbreviation.toLowerCase()}-${moduleId}-${reportingPeriodId}`,
    organizationId,
    reportingPeriodId,
    module: moduleId,
    status: SUBMISSION_STATUS.DRAFT,
    completeness: 0,
    version: '0.1',
    updatedAt: new Date().toISOString(),
  }
  db.submissions.push(row)
  return row
}

function evidenceCount(submissionId: string, organizationId: string, moduleId: ModuleId): number {
  return db.documents.filter(
    (d) =>
      d.linkedRecordId === submissionId ||
      (d.organizationId === organizationId && d.category === moduleId),
  ).length
}

function nextActionFor(status: SubmissionStatus, completeness: number): string {
  switch (status) {
    case SUBMISSION_STATUS.DRAFT:
      return completeness === 0 ? 'Start module' : 'Continue draft'
    case SUBMISSION_STATUS.IN_PROGRESS:
      return 'Continue / resolve issues'
    case SUBMISSION_STATUS.READY_FOR_REVIEW:
      return 'Send for certification'
    case SUBMISSION_STATUS.READY_FOR_CERTIFICATION:
      return 'Certify'
    case SUBMISSION_STATUS.CERTIFIED:
      return 'Submit to MoIP'
    case SUBMISSION_STATUS.RETURNED:
      return 'Correct returned items'
    case SUBMISSION_STATUS.CLARIFICATION_REQUESTED:
      return 'Respond to clarification'
    case SUBMISSION_STATUS.RESUBMITTED:
      return 'Resubmit to MoIP'
    case SUBMISSION_STATUS.LOCKED:
    case SUBMISSION_STATUS.APPROVED:
      return 'View locked snapshot'
    default:
      return 'Review status'
  }
}

function buildIssuesForModule(
  def: ReportingModuleDef,
  submission: Submission,
): ModuleValidationIssue[] {
  const issues: ModuleValidationIssue[] = []
  const evidence = evidenceCount(submission.id, submission.organizationId, def.id)

  if (submission.completeness < 100 && submission.status !== SUBMISSION_STATUS.LOCKED) {
    issues.push({
      id: `inc-${submission.id}`,
      moduleId: def.id,
      moduleLabel: def.label,
      severity: 'incomplete',
      message: `${def.label} is ${submission.completeness}% complete.`,
      ownerRole: def.ownerRole,
      status: submission.status,
      route: def.route,
      submissionId: submission.id,
    })
  }

  if (
    evidence < 1 &&
    submission.status !== SUBMISSION_STATUS.LOCKED &&
    submission.status !== SUBMISSION_STATUS.DRAFT
  ) {
    issues.push({
      id: `ev-${submission.id}`,
      moduleId: def.id,
      moduleLabel: def.label,
      severity: 'evidence',
      message: `${def.label} is missing mandatory evidence.`,
      ownerRole: def.ownerRole,
      status: submission.status,
      route: def.route,
      submissionId: submission.id,
    })
  }

  if (submission.status === SUBMISSION_STATUS.RETURNED) {
    issues.push({
      id: `ret-${submission.id}`,
      moduleId: def.id,
      moduleLabel: def.label,
      severity: 'blocking',
      message: `${def.label} was returned by MoIP.`,
      ownerRole: def.ownerRole,
      status: submission.status,
      route: def.route,
      submissionId: submission.id,
    })
  }

  if (
    submission.status === SUBMISSION_STATUS.CLARIFICATION_REQUESTED ||
    (submission.completeness < 40 && submission.status === SUBMISSION_STATUS.IN_PROGRESS)
  ) {
    issues.push({
      id: `warn-${submission.id}`,
      moduleId: def.id,
      moduleLabel: def.label,
      severity: 'warning',
      message:
        submission.status === SUBMISSION_STATUS.CLARIFICATION_REQUESTED
          ? `${def.label} has an open clarification.`
          : `${def.label} has low completion for the reporting cycle.`,
      ownerRole: def.ownerRole,
      status: submission.status,
      route: def.route,
      submissionId: submission.id,
    })
  }

  return issues
}

function buildModuleRows(
  organizationId: string,
  reportingPeriodId: string,
  role: RoleId,
): ModuleWorkspaceRow[] {
  return REPORTING_MODULES.map((def) => {
    const submission = ensureSubmission(organizationId, reportingPeriodId, def.id)
    const issues = buildIssuesForModule(def, submission)
    const evidenceGaps = issues.filter((i) => i.severity === 'evidence').length
    return {
      def,
      submission,
      validationIssueCount: issues.filter((i) => i.severity !== 'incomplete').length,
      evidenceGapCount: evidenceGaps,
      nextAction: nextActionFor(submission.status, submission.completeness),
      isOwnedByRole:
        def.ownerRole === role ||
        role === ROLE.SOE_FOCAL_PERSON ||
        role === ROLE.SOE_DATA_CONTRIBUTOR ||
        role === ROLE.SOE_CERTIFIER ||
        role === ROLE.CEO ||
        role === ROLE.CFO ||
        role === ROLE.SYSTEM_ADMIN,
    }
  })
}

export interface SoePortalService {
  getDashboard(
    organizationId: string,
    reportingPeriodId: string,
    role: RoleId,
  ): Promise<SoePortalDashboard>
  getReportingWorkspace(
    organizationId: string,
    reportingPeriodId: string,
    role: RoleId,
  ): Promise<{ modules: ModuleWorkspaceRow[]; overallCompletion: number }>
  getValidationCentre(
    organizationId: string,
    reportingPeriodId: string,
    filters?: {
      moduleId?: ModuleId
      ownerRole?: RoleId
      severity?: ValidationSeverity
    },
  ): Promise<ModuleValidationIssue[]>
  getClarificationInbox(organizationId: string): Promise<
    Array<
      Clarification & {
        moduleId: ModuleId
        moduleLabel: string
        route: string
        assignedRole: RoleId
      }
    >
  >
  getSubmissionReadiness(
    organizationId: string,
    reportingPeriodId: string,
  ): Promise<SubmissionReadiness>
  confirmPeriodSubmission(
    organizationId: string,
    reportingPeriodId: string,
    role: RoleId,
  ): Promise<{ submittedModuleIds: ModuleId[] }>
  search(
    organizationId: string,
    query: string,
  ): Promise<Array<{ type: string; title: string; route: string }>>
  simulateImport(
    organizationId: string,
    moduleId: ModuleId,
    fileName: string,
  ): Promise<{
    accepted: number
    warnings: number
    rejected: number
    message: string
  }>
  uploadDocument(
    organizationId: string,
    payload: {
      title: string
      category: string
      fileName: string
      linkedRecordType?: string
      linkedRecordId?: string
      notes?: string
    },
    role: RoleId,
  ): Promise<DocumentMeta>
  getModuleHeader(
    organizationId: string,
    reportingPeriodId: string,
    moduleId: ModuleId,
  ): Promise<ModuleWorkspaceRow>
}

export const mockSoePortalService: SoePortalService = {
  async getDashboard(organizationId, reportingPeriodId, role) {
    const organization = findOrg(organizationId)
    const period = findPeriod(reportingPeriodId)
    const allModules = buildModuleRows(organizationId, reportingPeriodId, role)
    const visibleDefs = modulesForRole(role)
    const modules =
      role === ROLE.SOE_FOCAL_PERSON ||
      role === ROLE.SOE_DATA_CONTRIBUTOR ||
      role === ROLE.CEO ||
      role === ROLE.CFO ||
      role === ROLE.SYSTEM_ADMIN
        ? allModules
        : allModules.filter((m) => visibleDefs.some((d) => d.id === m.def.id))

    // Department users: owned first
    modules.sort((a, b) => Number(b.isOwnedByRole) - Number(a.isOwnedByRole))

    const overallCompletion =
      modules.length === 0
        ? 0
        : Math.round(
            modules.reduce((s, m) => s + m.submission.completeness, 0) / modules.length,
          )
    const modulesComplete = modules.filter((m) => m.submission.completeness >= 100).length
    const issues = modules.flatMap((m) => buildIssuesForModule(m.def, m.submission))
    const blockingCount = issues.filter((i) => i.severity === 'blocking').length
    const warningCount = issues.filter((i) => i.severity === 'warning').length
    const evidenceGapCount = issues.filter((i) => i.severity === 'evidence').length

    const statuses = new Set(modules.map((m) => m.submission.status))
    const overallStatus =
      statuses.size === 1 ? ([...statuses][0] as SubmissionStatus) : ('mixed' as const)

    const openClars = db.clarifications.filter(
      (c) => c.organizationId === organizationId && c.status === 'open',
    )
    const certificationReadyCount = modules.filter(
      (m) => m.submission.status === SUBMISSION_STATUS.READY_FOR_CERTIFICATION,
    ).length

    const pendingActions: SoePortalDashboard['pendingActions'] = []
    modules.forEach((m) => {
      if (
        m.submission.status === SUBMISSION_STATUS.IN_PROGRESS ||
        m.submission.status === SUBMISSION_STATUS.DRAFT ||
        m.submission.status === SUBMISSION_STATUS.RETURNED
      ) {
        pendingActions.push({
          id: `pa-${m.submission.id}`,
          title: `${m.nextAction}: ${m.def.label}`,
          route: m.def.route,
          priority: m.submission.status === SUBMISSION_STATUS.RETURNED ? 'critical' : 'high',
        })
      }
      if (m.submission.status === SUBMISSION_STATUS.CLARIFICATION_REQUESTED) {
        pendingActions.push({
          id: `pa-clar-${m.submission.id}`,
          title: `Respond to clarification: ${m.def.label}`,
          route: '/soe/clarifications',
          priority: 'critical',
        })
      }
      if (
        (role === ROLE.SOE_CERTIFIER || role === ROLE.CEO || role === ROLE.CFO) &&
        m.submission.status === SUBMISSION_STATUS.READY_FOR_CERTIFICATION
      ) {
        pendingActions.push({
          id: `pa-cert-${m.submission.id}`,
          title: `Certify: ${m.def.label}`,
          route: m.def.id === 'finance' ? '/soe/finance/certify' : m.def.route,
          priority: 'high',
        })
      }
    })

    const tasks = db.tasks.filter(
      (t) => t.organizationId === organizationId && t.status !== 'done',
    )
    tasks.slice(0, 5).forEach((t: TaskItem) => {
      pendingActions.push({
        id: t.id,
        title: t.title,
        route:
          t.linkedRecordType === 'clarification'
            ? '/soe/clarifications'
            : t.linkedRecordType === 'submission'
              ? '/soe/finance'
              : '/soe/logs',
        priority: t.priority,
      })
    })

    const deadlines = [
      {
        id: 'dl-annual',
        title: `${period.label} annual submission`,
        dueDate: period.endDate,
        route: '/soe/readiness',
      },
      {
        id: 'dl-board',
        title: 'Board update / declaration',
        dueDate: '2026-09-15',
        route: '/soe/people/board',
      },
      {
        id: 'dl-compliance',
        title: 'Compliance obligation filing',
        dueDate: '2026-12-31',
        route: '/soe/accountability/compliance',
      },
    ]

    const recentActivity = db.timeline
      .filter((t) => t.organizationId === organizationId)
      .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
      .slice(0, 8)

    return simulateLatency({
      organization,
      period,
      deadline: period.endDate,
      overallCompletion,
      modulesComplete,
      modulesIncomplete: modules.length - modulesComplete,
      overallStatus,
      blockingCount,
      warningCount,
      evidenceGapCount,
      modules,
      pendingActions: pendingActions.slice(0, 10),
      deadlines,
      recentActivity,
      openClarifications: openClars.length,
      certificationReadyCount,
    })
  },

  async getReportingWorkspace(organizationId, reportingPeriodId, role) {
    const modules = buildModuleRows(organizationId, reportingPeriodId, role)
    const visible = modulesForRole(role)
    const filtered =
      role === ROLE.SOE_FOCAL_PERSON ||
      role === ROLE.SOE_DATA_CONTRIBUTOR ||
      role === ROLE.CEO ||
      role === ROLE.CFO ||
      role === ROLE.SYSTEM_ADMIN
        ? modules
        : modules.filter((m) => visible.some((d) => d.id === m.def.id))
    const overallCompletion =
      filtered.length === 0
        ? 0
        : Math.round(
            filtered.reduce((s, m) => s + m.submission.completeness, 0) / filtered.length,
          )
    return simulateLatency({ modules: filtered, overallCompletion })
  },

  async getValidationCentre(organizationId, reportingPeriodId, filters) {
    const modules = buildModuleRows(organizationId, reportingPeriodId, ROLE.SOE_FOCAL_PERSON)
    let issues = modules.flatMap((m) => buildIssuesForModule(m.def, m.submission))
    if (filters?.moduleId) issues = issues.filter((i) => i.moduleId === filters.moduleId)
    if (filters?.ownerRole) issues = issues.filter((i) => i.ownerRole === filters.ownerRole)
    if (filters?.severity) issues = issues.filter((i) => i.severity === filters.severity)
    return simulateLatency(issues)
  },

  async getClarificationInbox(organizationId) {
    const items = db.clarifications
      .filter((c) => c.organizationId === organizationId)
      .map((c) => {
        const sub = db.submissions.find((s) => s.id === c.submissionId)
        const def = sub ? getModuleDef(sub.module) : undefined
        return {
          ...c,
          moduleId: (sub?.module ?? 'finance') as ModuleId,
          moduleLabel: def?.label ?? 'Module',
          route:
            sub?.module === 'finance'
              ? '/soe/finance/clarification'
              : (def?.route ?? '/soe/clarifications'),
          assignedRole: def?.ownerRole ?? ROLE.SOE_FOCAL_PERSON,
        }
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    return simulateLatency(items)
  },

  async getSubmissionReadiness(organizationId, reportingPeriodId) {
    const organization = findOrg(organizationId)
    const period = findPeriod(reportingPeriodId)
    const modules = buildModuleRows(organizationId, reportingPeriodId, ROLE.SOE_FOCAL_PERSON)
    const issues = modules.flatMap((m) => buildIssuesForModule(m.def, m.submission))
    const blockingErrors = issues.filter((i) => i.severity === 'blocking')
    const warnings = issues.filter((i) => i.severity === 'warning')
    const missingEvidence = issues.filter((i) => i.severity === 'evidence')
    const outstandingClarifications = db.clarifications.filter(
      (c) => c.organizationId === organizationId && c.status === 'open',
    )
    const modulesComplete = modules.filter((m) => m.submission.completeness >= 100).length
    const overallCompletion = Math.round(
      modules.reduce((s, m) => s + m.submission.completeness, 0) / modules.length,
    )
    const allCertifiedOrBeyond = modules.every((m) =>
      [
        SUBMISSION_STATUS.CERTIFIED,
        SUBMISSION_STATUS.SUBMITTED,
        SUBMISSION_STATUS.UNDER_REVIEW,
        SUBMISSION_STATUS.APPROVED,
        SUBMISSION_STATUS.LOCKED,
        SUBMISSION_STATUS.RESUBMITTED,
      ].includes(m.submission.status as never),
    )
    const canSubmit =
      blockingErrors.length === 0 &&
      outstandingClarifications.length === 0 &&
      missingEvidence.length === 0 &&
      allCertifiedOrBeyond

    const finance = modules.find((m) => m.def.id === 'finance')
    return simulateLatency({
      organization,
      period,
      version: finance?.submission.version ?? '0.8',
      overallCompletion,
      modulesComplete,
      modulesTotal: modules.length,
      blockingErrors,
      warnings,
      missingEvidence,
      outstandingClarifications,
      certificationRequirements: [
        'SOE Certifier certification on finance (and other configured modules)',
        'No open clarifications',
        'Mandatory evidence attached',
        'No blocking returned items',
      ],
      canSubmit,
      certifiers: [ROLE_LABEL[ROLE.SOE_CERTIFIER]],
    })
  },

  async confirmPeriodSubmission(organizationId, reportingPeriodId, role) {
    if (!hasPermission(role, PERMISSION.SUBMISSION_SUBMIT)) {
      throw new AppError('Permission denied', 'PERMISSION')
    }
    const readiness = await mockSoePortalService.getSubmissionReadiness(
      organizationId,
      reportingPeriodId,
    )
    if (!readiness.canSubmit) {
      throw new AppError('Submission blocked by readiness rules', 'VALIDATION')
    }
    const submitted: ModuleId[] = []
    db.submissions.forEach((s, idx) => {
      if (
        s.organizationId === organizationId &&
        s.reportingPeriodId === reportingPeriodId &&
        s.status === SUBMISSION_STATUS.CERTIFIED
      ) {
        db.submissions[idx] = {
          ...s,
          status: SUBMISSION_STATUS.SUBMITTED,
          updatedAt: new Date().toISOString(),
        }
        submitted.push(s.module)
      }
    })
    db.timeline.push({
      id: `tl-submit-period-${Date.now()}`,
      organizationId,
      occurredAt: new Date().toISOString(),
      title: `Period submission confirmed (${submitted.length} modules)`,
      category: 'submission',
    })
    db.notifications.unshift({
      id: `notif-period-${Date.now()}`,
      organizationId,
      title: 'Period submission confirmed',
      body: `${readiness.organization.abbreviation} ${readiness.period.label} submitted to MoIP.`,
      createdAt: new Date().toISOString(),
      status: 'unread',
      linkRoute: '/moip/submissions',
    })
    return simulateMutation({ submittedModuleIds: submitted })
  },

  async search(organizationId, query) {
    const q = query.trim().toLowerCase()
    if (!q) return simulateLatency([])
    const results: Array<{ type: string; title: string; route: string }> = []
    REPORTING_MODULES.forEach((m) => {
      if (m.label.toLowerCase().includes(q) || m.id.includes(q)) {
        results.push({ type: 'module', title: m.label, route: m.route })
      }
    })
    db.assets
      .filter((a) => a.organizationId === organizationId && a.name.toLowerCase().includes(q))
      .slice(0, 5)
      .forEach((a) =>
        results.push({ type: 'record', title: a.name, route: '/soe/assets/land' }),
      )
    db.documents
      .filter(
        (d) =>
          d.organizationId === organizationId &&
          (d.title.toLowerCase().includes(q) || d.fileName.toLowerCase().includes(q)),
      )
      .slice(0, 5)
      .forEach((d) =>
        results.push({ type: 'document', title: d.title, route: '/soe/documents' }),
      )
    return simulateLatency(results.slice(0, 20))
  },

  async simulateImport(organizationId, moduleId, fileName) {
    await new Promise((r) => setTimeout(r, 600))
    const accepted = 18 + (fileName.length % 7)
    const warnings = 2 + (fileName.length % 3)
    const rejected = fileName.toLowerCase().includes('bad') ? 3 : 1
    db.timeline.push({
      id: `tl-import-${Date.now()}`,
      organizationId,
      occurredAt: new Date().toISOString(),
      title: `Import checked for ${moduleId}: ${fileName}`,
      category: 'import',
    })
    return simulateMutation({
      accepted,
      warnings,
      rejected,
      message: 'Demo validation only — no real file parsing in this environment.',
    })
  },

  async uploadDocument(organizationId, payload, role) {
    if (!hasPermission(role, PERMISSION.DOCUMENT_UPLOAD)) {
      throw new AppError('Permission denied', 'PERMISSION')
    }
    const doc: DocumentMeta = {
      id: `doc-up-${Date.now()}`,
      organizationId,
      title: payload.title,
      category: payload.category,
      fileName: payload.fileName,
      linkedRecordType: payload.linkedRecordType,
      linkedRecordId: payload.linkedRecordId,
      linkedModule: payload.category,
      uploadedAt: new Date().toISOString(),
      uploadedBy: role,
      version: 1,
      documentFamilyId: `docfam-up-${Date.now()}`,
      evidenceStatus: 'pending_review',
      status: 'pending_review',
      notes: payload.notes,
      classification: 'evidence',
      isDummyDemonstrationData: true,
    }
    db.documents.push(doc)
    db.timeline.push({
      id: `tl-doc-${Date.now()}`,
      organizationId,
      occurredAt: new Date().toISOString(),
      title: `Document uploaded: ${payload.title}`,
      category: 'evidence',
    })
    return simulateMutation(doc)
  },

  async getModuleHeader(organizationId, reportingPeriodId, moduleId) {
    const rows = buildModuleRows(organizationId, reportingPeriodId, ROLE.SOE_FOCAL_PERSON)
    const row = rows.find((r) => r.def.id === moduleId)
    if (!row) throw new AppError('Module not found', 'NOT_FOUND')
    return simulateLatency(row)
  },
}
