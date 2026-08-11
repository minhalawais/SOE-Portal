/**
 * Secretary Command Centre — Phase 15.
 * Exception-first aggregation over portfolio domain + early-warning outputs.
 * Ranking thresholds are provisional prototype rules.
 */
import {
  ALERT_SEVERITY,
  ASSET_TYPE,
  COMPLIANCE_STATUS,
  DECLARATION_STATUS,
  DEMO_AS_OF_DATE,
  MODULE,
  PENDING_DECISION_STATUS,
  ROLE,
  SUBMISSION_STATUS,
  type RoleId,
} from '@/constants'
import { db } from '@/mock-data'
import { paginate } from '@/mock-services/_helpers'
import { applyEarlyWarningEvaluation } from '@/mock-services/earlyWarning.service'
import type {
  Escalation,
  ListQuery,
  PagedResult,
  PendingDecision,
} from '@/types/domain'
import { AppError, formatCurrencyPkr, simulateLatency, simulateMutation } from '@/utils'
import { daysUntil, resolveBoardExpiryBand } from '@/workflow/boardExpiry'
import { BOARD_EXPIRY_BAND } from '@/constants'

export type SecretarySeverity = 'critical' | 'attention' | 'information'

export interface SecretaryPriorityItem {
  id: string
  organizationId: string
  organizationLabel: string
  issue: string
  severity: SecretarySeverity
  ageDays: number
  dueDate?: string
  owner: string
  nextAction: string
  category:
    | 'critical_matter'
    | 'pending_decision'
    | 'obligation'
    | 'compliance'
    | 'finance'
    | 'board'
    | 'audit'
    | 'litigation'
    | 'submission'
    | 'escalation'
  route: string
  linkedRecordType?: string
  linkedRecordId?: string
}

export interface SecretaryCommandSummary {
  critical: number
  attention: number
  pendingDecision: number
  overdue: number
  escalated: number
  asOf: string
}

export interface SecretaryObligationItem {
  id: string
  organizationId: string
  organizationLabel: string
  obligationType: string
  dueDate: string
  daysUntilDue: number
  owner: string
  severity: SecretarySeverity
  route: string
  window: '7' | '30' | '60' | '90' | 'overdue'
}

export interface SecretaryFinancialConcern {
  id: string
  organizationId: string
  organizationLabel: string
  indicator: string
  detail: string
  severity: SecretarySeverity
  route: string
}

export interface SecretaryBoardItem {
  id: string
  organizationId: string
  organizationLabel: string
  issue: string
  band: string
  memberName?: string
  route: string
  severity: SecretarySeverity
}

export interface SecretaryAuditItem {
  id: string
  organizationId: string
  organizationLabel: string
  title: string
  amountInvolved: number
  ageDays: number
  status: string
  recoveryOutstanding: number
  route: string
  severity: SecretarySeverity
}

export interface SecretaryLitigationItem {
  id: string
  organizationId: string
  organizationLabel: string
  title: string
  amountInvolved: number
  nextHearing?: string
  linkedAsset: boolean
  route: string
  severity: SecretarySeverity
}

export interface SecretarySubmissionRow {
  organizationId: string
  organizationLabel: string
  status: string
  dueBucket: 'due' | 'overdue' | 'under_review_long' | 'clarification_overdue' | 'approved'
  ageDays: number
  route: string
}

export interface SecretaryComplianceDelay {
  id: string
  organizationId: string
  organizationLabel: string
  requirement: string
  dueDate: string
  daysOverdue: number
  responsibleFunction: string
  currentResponse: string
  escalationStatus: string
  route: string
}

const HIGH_AUDIT_PKR = 50_000_000
const HIGH_LITIGATION_PKR = 100_000_000
/** Provisional: under review longer than this is a Secretary attention item */
const REVIEW_LONG_DAYS = 14

function orgLabel(id: string): string {
  return db.organizations.find((o) => o.id === id)?.abbreviation ?? id
}

function asOf() {
  return DEMO_AS_OF_DATE
}

function severityRank(s: SecretarySeverity): number {
  if (s === 'critical') return 0
  if (s === 'attention') return 1
  return 2
}

function buildPriorityFromAlerts(): SecretaryPriorityItem[] {
  applyEarlyWarningEvaluation()
  return db.alerts
    .filter((a) => a.status === 'open')
    .filter(
      (a) =>
        a.severity === ALERT_SEVERITY.CRITICAL || a.severity === ALERT_SEVERITY.ATTENTION,
    )
    .map((a) => {
      const generated = (a.generatedAt ?? `${asOf()}T00:00:00Z`).slice(0, 10)
      const ageDays = Math.max(0, -daysUntil(generated, asOf()))
      return {
        id: `prio-alert-${a.id}`,
        organizationId: a.organizationId ?? '',
        organizationLabel: orgLabel(a.organizationId ?? ''),
        issue: a.title,
        severity: (a.severity === 'critical' ? 'critical' : 'attention') as SecretarySeverity,
        ageDays,
        dueDate: undefined,
        owner: a.recommendedAction ? 'SOE / MoIP Wing' : 'MoIP Wing',
        nextAction: a.recommendedAction ?? 'Inspect alert',
        category: 'critical_matter' as const,
        route: a.route ?? `/secretary/alerts/${a.id}`,
        linkedRecordType: a.linkedRecordType,
        linkedRecordId: a.linkedRecordId,
      }
    })
}

function buildPriorityFromEscalations(): SecretaryPriorityItem[] {
  return db.escalations
    .filter((e) => e.status === 'open')
    .map((e) => ({
      id: `prio-esc-${e.id}`,
      organizationId: e.organizationId,
      organizationLabel: orgLabel(e.organizationId),
      issue: e.reason,
      severity: (e.severity === 'critical' ? 'critical' : 'attention') as SecretarySeverity,
      ageDays: Math.max(0, -daysUntil(e.createdAt.slice(0, 10), asOf())),
      dueDate: e.dueDate,
      owner: e.ownerRole,
      nextAction: 'Review escalation history',
      category: 'escalation' as const,
      route: `/secretary/escalations/${e.id}`,
      linkedRecordType: 'escalation',
      linkedRecordId: e.id,
    }))
}

function buildPriorityFromDecisions(): SecretaryPriorityItem[] {
  return db.pendingDecisions
    .filter((d) => d.status === 'open' || d.status === 'under_consideration')
    .map((d) => ({
      id: `prio-dec-${d.id}`,
      organizationId: d.organizationId,
      organizationLabel: orgLabel(d.organizationId),
      issue: d.matter,
      severity: d.urgency,
      ageDays: Math.max(0, -daysUntil(d.dateRaised, asOf())),
      dueDate: undefined,
      owner: d.responsibleWing,
      nextAction: d.assignedTo ? `Assigned: ${d.assignedTo}` : 'Review recommendation',
      category: 'pending_decision' as const,
      route: `/secretary/decisions/${d.id}`,
      linkedRecordType: d.linkedRecordType,
      linkedRecordId: d.linkedRecordId,
    }))
}

export interface SecretaryPortalService {
  getCommandSummary(): Promise<SecretaryCommandSummary>
  getPriorityQueue(query?: ListQuery & {
    severity?: string
    category?: string
    organizationId?: string
  }): Promise<PagedResult<SecretaryPriorityItem>>
  getCriticalMatters(): Promise<SecretaryPriorityItem[]>
  getPendingDecisions(query?: ListQuery & { status?: string }): Promise<PagedResult<PendingDecision>>
  getPendingDecision(id: string): Promise<PendingDecision>
  acknowledgeDecision(id: string, role: RoleId): Promise<PendingDecision>
  assignDecision(id: string, role: RoleId, assignee: string): Promise<PendingDecision>
  escalateDecisionToMinister(id: string, role: RoleId, note?: string): Promise<Escalation>
  getUpcomingObligations(windowDays?: 7 | 30 | 60 | 90): Promise<SecretaryObligationItem[]>
  getDelayedCompliance(): Promise<SecretaryComplianceDelay[]>
  getFinancialConcerns(): Promise<SecretaryFinancialConcern[]>
  getBoardGovernance(): Promise<SecretaryBoardItem[]>
  getAuditExposure(): Promise<SecretaryAuditItem[]>
  getMajorLitigation(): Promise<SecretaryLitigationItem[]>
  getSubmissionCompliance(): Promise<SecretarySubmissionRow[]>
  getEscalationQueue(): Promise<Escalation[]>
}

export const mockSecretaryPortalService: SecretaryPortalService = {
  async getCommandSummary() {
    applyEarlyWarningEvaluation()
    const criticalAlerts = db.alerts.filter(
      (a) => a.status === 'open' && a.severity === ALERT_SEVERITY.CRITICAL,
    ).length
    const attentionAlerts = db.alerts.filter(
      (a) => a.status === 'open' && a.severity === ALERT_SEVERITY.ATTENTION,
    ).length
    const pendingDecision = db.pendingDecisions.filter(
      (d) => d.status === 'open' || d.status === 'under_consideration',
    ).length
    const overdueTasks = db.tasks.filter((t) => {
      if (t.status === 'done' || t.status === 'cancelled') return false
      return daysUntil(t.dueDate, asOf()) < 0
    }).length
    const overdueCompliance = db.compliance.filter(
      (c) => c.status === COMPLIANCE_STATUS.OVERDUE || daysUntil(c.dueDate, asOf()) < 0,
    ).length
    const escalated = db.escalations.filter((e) => e.status === 'open').length

    return simulateLatency({
      critical: criticalAlerts,
      attention: attentionAlerts,
      pendingDecision,
      overdue: overdueTasks + overdueCompliance,
      escalated,
      asOf: asOf(),
    } satisfies SecretaryCommandSummary)
  },

  async getPriorityQueue(query) {
    applyEarlyWarningEvaluation()
    let items = [
      ...buildPriorityFromAlerts(),
      ...buildPriorityFromEscalations(),
      ...buildPriorityFromDecisions(),
    ]
    if (query?.severity) items = items.filter((i) => i.severity === query.severity)
    if (query?.category) items = items.filter((i) => i.category === query.category)
    if (query?.organizationId) {
      items = items.filter((i) => i.organizationId === query.organizationId)
    }
    if (query?.search) {
      const q = query.search.toLowerCase()
      items = items.filter(
        (i) =>
          i.issue.toLowerCase().includes(q) ||
          i.organizationLabel.toLowerCase().includes(q),
      )
    }
    items.sort((a, b) => {
      const sr = severityRank(a.severity) - severityRank(b.severity)
      if (sr !== 0) return sr
      return b.ageDays - a.ageDays
    })
    return simulateLatency(paginate(items, query))
  },

  async getCriticalMatters() {
    const page = await mockSecretaryPortalService.getPriorityQueue({
      severity: 'critical',
      pageSize: 50,
    })
    return page.items
  },

  async getPendingDecisions(query) {
    let items = [...db.pendingDecisions]
    if (query?.status) items = items.filter((d) => d.status === query.status)
    if (query?.search) {
      const q = query.search.toLowerCase()
      items = items.filter(
        (d) =>
          d.matter.toLowerCase().includes(q) ||
          orgLabel(d.organizationId).toLowerCase().includes(q),
      )
    }
    items.sort((a, b) => {
      const urg = (a.urgency === 'critical' ? 0 : 1) - (b.urgency === 'critical' ? 0 : 1)
      if (urg !== 0) return urg
      return b.dateRaised.localeCompare(a.dateRaised)
    })
    return simulateLatency(paginate(items, query))
  },

  async getPendingDecision(id) {
    const row = db.pendingDecisions.find((d) => d.id === id)
    if (!row) throw new AppError('Pending decision not found', 'NOT_FOUND')
    return simulateLatency(row)
  },

  async acknowledgeDecision(id, role) {
    if (role !== ROLE.SECRETARY && role !== ROLE.MOIP_SUPERVISOR) {
      throw new AppError('Permission denied', 'PERMISSION')
    }
    const idx = db.pendingDecisions.findIndex((d) => d.id === id)
    if (idx < 0) throw new AppError('Pending decision not found', 'NOT_FOUND')
    db.pendingDecisions[idx] = {
      ...db.pendingDecisions[idx],
      status: PENDING_DECISION_STATUS.UNDER_CONSIDERATION,
      acknowledgedAt: new Date().toISOString(),
    }
    return simulateMutation(db.pendingDecisions[idx])
  },

  async assignDecision(id, role, assignee) {
    if (role !== ROLE.SECRETARY && role !== ROLE.MOIP_SUPERVISOR) {
      throw new AppError('Permission denied', 'PERMISSION')
    }
    const idx = db.pendingDecisions.findIndex((d) => d.id === id)
    if (idx < 0) throw new AppError('Pending decision not found', 'NOT_FOUND')
    db.pendingDecisions[idx] = {
      ...db.pendingDecisions[idx],
      assignedTo: assignee,
      status: PENDING_DECISION_STATUS.UNDER_CONSIDERATION,
    }
    db.tasks.push({
      id: `task-dec-assign-${id}-${Date.now()}`,
      organizationId: db.pendingDecisions[idx].organizationId,
      title: `Follow up decision: ${db.pendingDecisions[idx].matter}`,
      type: 'pending_decision',
      sourceModule: db.pendingDecisions[idx].originatingModule,
      dueDate: '2026-08-20',
      priority: db.pendingDecisions[idx].urgency === 'critical' ? 'critical' : 'high',
      status: 'open',
      ownerRole: ROLE.MOIP_SUPERVISOR,
      assignedRole: ROLE.MOIP_SUPERVISOR,
      createdAt: new Date().toISOString(),
      nextAction: `Assigned to ${assignee}`,
      linkedRecordType: 'pending_decision',
      linkedRecordId: id,
      route: `/secretary/decisions/${id}`,
    })
    return simulateMutation(db.pendingDecisions[idx])
  },

  async escalateDecisionToMinister(id, role, note) {
    if (role !== ROLE.SECRETARY) {
      throw new AppError('Only Secretary can escalate decisions to Minister (prototype)', 'PERMISSION')
    }
    const decision = db.pendingDecisions.find((d) => d.id === id)
    if (!decision) throw new AppError('Pending decision not found', 'NOT_FOUND')
    const esc: Escalation = {
      id: `esc-dec-${id}-${Date.now()}`,
      organizationId: decision.organizationId,
      reason: note ?? `Minister attention: ${decision.matter}`,
      reasonCode: 'other',
      severity: decision.urgency,
      ownerRole: ROLE.MINISTER,
      dueDate: '2026-08-25',
      status: 'open',
      createdAt: new Date().toISOString(),
      createdByRole: role,
      escalationLevel: 3,
      escalatedBy: role,
      historyNote: 'Escalated from Secretary pending decision',
      history: [
        {
          at: new Date().toISOString(),
          note: 'Escalated to Minister (prototype governance action)',
          actor: role,
        },
      ],
      isDummyDemonstrationData: true,
    }
    db.escalations.push(esc)
    const idx = db.pendingDecisions.findIndex((d) => d.id === id)
    db.pendingDecisions[idx] = {
      ...db.pendingDecisions[idx],
      status: PENDING_DECISION_STATUS.DEFERRED,
    }
    return simulateMutation(esc)
  },

  async getUpcomingObligations(windowDays = 90) {
    applyEarlyWarningEvaluation()
    const items: SecretaryObligationItem[] = []

    for (const b of db.boardMembers) {
      if (b.isVacancySlot) continue
      const d = daysUntil(b.expiryDate, asOf())
      if (d < 0 || d > windowDays) continue
      const window =
        d <= 7 ? '7' : d <= 30 ? '30' : d <= 60 ? '60' : ('90' as const)
      items.push({
        id: `obl-board-${b.id}`,
        organizationId: b.organizationId,
        organizationLabel: orgLabel(b.organizationId),
        obligationType: 'Board expiry',
        dueDate: b.expiryDate,
        daysUntilDue: d,
        owner: 'Company Secretary',
        severity: d <= 30 ? 'critical' : 'attention',
        route: '/secretary/governance',
        window,
      })
    }

    for (const loan of db.loans) {
      const d = daysUntil(loan.nextDueDate, asOf())
      if (loan.repaymentStatus === 'overdue') {
        items.push({
          id: `obl-loan-${loan.id}`,
          organizationId: loan.organizationId,
          organizationLabel: orgLabel(loan.organizationId),
          obligationType: 'Loan repayment (overdue)',
          dueDate: loan.nextDueDate,
          daysUntilDue: d,
          owner: 'Finance',
          severity: 'critical',
          route: '/secretary/finance',
          window: 'overdue',
        })
        continue
      }
      if (d < 0 || d > windowDays) continue
      items.push({
        id: `obl-loan-${loan.id}`,
        organizationId: loan.organizationId,
        organizationLabel: orgLabel(loan.organizationId),
        obligationType: 'Loan repayment',
        dueDate: loan.nextDueDate,
        daysUntilDue: d,
        owner: 'Finance',
        severity: d <= 30 ? 'attention' : 'information',
        route: '/secretary/finance',
        window: d <= 7 ? '7' : d <= 30 ? '30' : d <= 60 ? '60' : '90',
      })
    }

    for (const c of db.compliance) {
      const d = daysUntil(c.dueDate, asOf())
      if (d < 0 || d > windowDays) continue
      items.push({
        id: `obl-comp-${c.id}`,
        organizationId: c.organizationId,
        organizationLabel: orgLabel(c.organizationId),
        obligationType: `Compliance — ${c.area}`,
        dueDate: c.dueDate,
        daysUntilDue: d,
        owner: c.responsibleFunction,
        severity: d <= 14 ? 'attention' : 'information',
        route: '/secretary/compliance',
        window: d <= 7 ? '7' : d <= 30 ? '30' : d <= 60 ? '60' : '90',
      })
    }

    for (const lit of db.litigation) {
      if (!lit.nextHearing) continue
      const d = daysUntil(lit.nextHearing, asOf())
      if (d < 0 || d > windowDays) continue
      items.push({
        id: `obl-lit-${lit.id}`,
        organizationId: lit.organizationId,
        organizationLabel: orgLabel(lit.organizationId),
        obligationType: 'Litigation hearing',
        dueDate: lit.nextHearing,
        daysUntilDue: d,
        owner: 'Legal',
        severity: d <= 30 ? 'attention' : 'information',
        route: '/secretary/audit-legal',
        window: d <= 7 ? '7' : d <= 30 ? '30' : d <= 60 ? '60' : '90',
      })
    }

    for (const s of db.submissions) {
      if (s.module !== MODULE.FINANCE || s.reportingPeriodId !== 'period-fy2027') continue
      if (
        ![
          SUBMISSION_STATUS.DRAFT,
          SUBMISSION_STATUS.IN_PROGRESS,
          SUBMISSION_STATUS.CERTIFIED,
          SUBMISSION_STATUS.READY_FOR_CERTIFICATION,
        ].includes(s.status as never)
      ) {
        continue
      }
      items.push({
        id: `obl-sub-${s.id}`,
        organizationId: s.organizationId,
        organizationLabel: orgLabel(s.organizationId),
        obligationType: 'Finance reporting deadline',
        dueDate: '2026-08-31',
        daysUntilDue: daysUntil('2026-08-31', asOf()),
        owner: 'SOE Focal / Finance',
        severity: s.status === SUBMISSION_STATUS.CERTIFIED ? 'critical' : 'attention',
        route: '/secretary/compliance',
        window: '30',
      })
    }

    items.sort((a, b) => a.daysUntilDue - b.daysUntilDue)
    return simulateLatency(items)
  },

  async getDelayedCompliance() {
    const rows: SecretaryComplianceDelay[] = db.compliance
      .filter((c) => c.status === COMPLIANCE_STATUS.OVERDUE || daysUntil(c.dueDate, asOf()) < 0)
      .map((c) => {
        const daysOverdue = Math.max(0, -daysUntil(c.dueDate, asOf()))
        const esc = db.escalations.find(
          (e) => e.organizationId === c.organizationId && e.status === 'open',
        )
        return {
          id: c.id,
          organizationId: c.organizationId,
          organizationLabel: orgLabel(c.organizationId),
          requirement: c.area,
          dueDate: c.dueDate,
          daysOverdue,
          responsibleFunction: c.responsibleFunction,
          currentResponse: c.comments ?? (c.evidenceAvailable ? 'Evidence on file' : 'No response noted'),
          escalationStatus: esc ? esc.status : 'none',
          route: '/secretary/compliance',
        }
      })
    rows.sort((a, b) => b.daysOverdue - a.daysOverdue)
    return simulateLatency(rows)
  },

  async getFinancialConcerns() {
    const concerns: SecretaryFinancialConcern[] = []
    for (const org of db.organizations) {
      const fin = db.financialMetrics.find(
        (f) => f.organizationId === org.id && f.reportingPeriodId === 'period-fy2027',
      )
      const prev = db.financialMetrics.find(
        (f) => f.organizationId === org.id && f.reportingPeriodId === 'period-fy2026',
      )
      if (fin && fin.profitOrLoss < 0) {
        concerns.push({
          id: `fin-loss-${org.id}`,
          organizationId: org.id,
          organizationLabel: org.abbreviation,
          indicator: 'Persistent / current loss',
          detail: `P/L ${formatCurrencyPkr(fin.profitOrLoss)} (FY2027 draft/locked metric)`,
          severity: Math.abs(fin.profitOrLoss) > 1_000_000_000 ? 'critical' : 'attention',
          route: '/secretary/finance',
        })
      }
      if (fin && prev && prev.subsidies > 0) {
        const change = (fin.subsidies - prev.subsidies) / prev.subsidies
        if (change >= 0.25) {
          concerns.push({
            id: `fin-sub-${org.id}`,
            organizationId: org.id,
            organizationLabel: org.abbreviation,
            indicator: 'Material subsidy increase',
            detail: `Subsidy YoY +${Math.round(change * 100)}% (prototype 25% threshold)`,
            severity: 'attention',
            route: '/secretary/finance',
          })
        }
      }
      const loans = db.loans.filter((l) => l.organizationId === org.id)
      const overdue = loans.filter((l) => l.repaymentStatus === 'overdue')
      if (overdue.length) {
        concerns.push({
          id: `fin-loan-${org.id}`,
          organizationId: org.id,
          organizationLabel: org.abbreviation,
          indicator: 'Overdue loan repayment',
          detail: `${overdue.length} loan(s) overdue`,
          severity: 'critical',
          route: '/secretary/finance',
        })
      }
      const debt = loans.reduce((s, l) => s + (l.outstanding ?? 0), 0)
      if (debt >= 5_000_000_000) {
        concerns.push({
          id: `fin-debt-${org.id}`,
          organizationId: org.id,
          organizationLabel: org.abbreviation,
          indicator: 'High debt exposure',
          detail: `Outstanding loans ${formatCurrencyPkr(debt)} (prototype threshold)`,
          severity: 'attention',
          route: '/secretary/finance',
        })
      }
    }
    concerns.sort((a, b) => severityRank(a.severity) - severityRank(b.severity))
    return simulateLatency(concerns)
  },

  async getBoardGovernance() {
    const items: SecretaryBoardItem[] = []
    for (const b of db.boardMembers) {
      if (b.isVacancySlot) {
        items.push({
          id: `bg-vac-${b.id}`,
          organizationId: b.organizationId,
          organizationLabel: orgLabel(b.organizationId),
          issue: 'Board vacancy slot',
          band: BOARD_EXPIRY_BAND.VACANCY,
          memberName: b.name,
          route: '/secretary/governance',
          severity: 'attention',
        })
        continue
      }
      const band = resolveBoardExpiryBand(b, asOf())
      if (
        band === BOARD_EXPIRY_BAND.WITHIN_30 ||
        band === BOARD_EXPIRY_BAND.EXPIRED ||
        band === BOARD_EXPIRY_BAND.WITHIN_90
      ) {
        items.push({
          id: `bg-exp-${b.id}`,
          organizationId: b.organizationId,
          organizationLabel: orgLabel(b.organizationId),
          issue:
            band === BOARD_EXPIRY_BAND.EXPIRED
              ? 'Expired appointment'
              : `Tenure expiry (${band.replaceAll('_', ' ')})`,
          band,
          memberName: b.name,
          route: '/secretary/governance',
          severity:
            band === BOARD_EXPIRY_BAND.WITHIN_30 || band === BOARD_EXPIRY_BAND.EXPIRED
              ? 'critical'
              : 'attention',
        })
      }
      if (
        b.conflictDeclarationStatus === DECLARATION_STATUS.OVERDUE ||
        b.conflictDeclarationStatus === DECLARATION_STATUS.PENDING ||
        b.assetDeclarationStatus === DECLARATION_STATUS.OVERDUE ||
        b.assetDeclarationStatus === DECLARATION_STATUS.PENDING
      ) {
        items.push({
          id: `bg-decl-${b.id}`,
          organizationId: b.organizationId,
          organizationLabel: orgLabel(b.organizationId),
          issue: 'Missing / overdue declaration',
          band: 'declaration',
          memberName: b.name,
          route: '/secretary/governance',
          severity: 'attention',
        })
      }
    }
    return simulateLatency(items)
  },

  async getAuditExposure() {
    const items: SecretaryAuditItem[] = db.auditParas
      .filter((p) => p.status !== 'closed' && p.status !== 'settled')
      .map((p) => {
        const ageDays = Math.max(0, -daysUntil(p.dateRaised, asOf()))
        const recoveryOutstanding = Math.max(0, p.amountInvolved - (p.amountRecovered ?? 0))
        const high = p.amountInvolved >= HIGH_AUDIT_PKR || ageDays >= 180
        return {
          id: p.id,
          organizationId: p.organizationId,
          organizationLabel: orgLabel(p.organizationId),
          title: p.title,
          amountInvolved: p.amountInvolved,
          ageDays,
          status: p.status,
          recoveryOutstanding,
          route: '/secretary/audit-legal',
          severity: (high ? 'critical' : 'attention') as SecretarySeverity,
        }
      })
      .filter((p) => p.amountInvolved >= HIGH_AUDIT_PKR || p.ageDays >= 90)
    items.sort((a, b) => b.amountInvolved - a.amountInvolved)
    return simulateLatency(items)
  },

  async getMajorLitigation() {
    const items: SecretaryLitigationItem[] = db.litigation
      .filter(
        (l) =>
          (l.amountInvolved ?? 0) >= HIGH_LITIGATION_PKR ||
          Boolean(l.relatedAssetId) ||
          Boolean(l.nextHearing),
      )
      .map((l) => ({
        id: l.id,
        organizationId: l.organizationId,
        organizationLabel: orgLabel(l.organizationId),
        title: `${l.nature} — ${l.caseNumber}`,
        amountInvolved: l.amountInvolved ?? 0,
        nextHearing: l.nextHearing,
        linkedAsset: Boolean(l.relatedAssetId),
        route: '/secretary/audit-legal',
        severity: (
          (l.amountInvolved ?? 0) >= HIGH_LITIGATION_PKR ? 'critical' : 'attention'
        ) as SecretarySeverity,
      }))
    items.sort((a, b) => b.amountInvolved - a.amountInvolved)
    return simulateLatency(items)
  },

  async getSubmissionCompliance() {
    const rows: SecretarySubmissionRow[] = []
    for (const org of db.organizations) {
      const sub = db.submissions.find(
        (s) =>
          s.organizationId === org.id &&
          s.module === MODULE.FINANCE &&
          s.reportingPeriodId === 'period-fy2027',
      )
      if (!sub) continue
      const ageDays = Math.max(0, -daysUntil((sub.submittedAt ?? sub.updatedAt).slice(0, 10), asOf()))
      let dueBucket: SecretarySubmissionRow['dueBucket'] = 'due'
      if (sub.status === SUBMISSION_STATUS.APPROVED || sub.status === SUBMISSION_STATUS.LOCKED) {
        dueBucket = 'approved'
      } else if (sub.status === SUBMISSION_STATUS.CLARIFICATION_REQUESTED && ageDays > 7) {
        dueBucket = 'clarification_overdue'
      } else if (sub.status === SUBMISSION_STATUS.UNDER_REVIEW && ageDays > REVIEW_LONG_DAYS) {
        dueBucket = 'under_review_long'
      } else if (
        [
          SUBMISSION_STATUS.DRAFT,
          SUBMISSION_STATUS.IN_PROGRESS,
          SUBMISSION_STATUS.CERTIFIED,
          SUBMISSION_STATUS.RETURNED,
        ].includes(sub.status as never)
      ) {
        dueBucket = ageDays > 20 ? 'overdue' : 'due'
      }
      rows.push({
        organizationId: org.id,
        organizationLabel: org.abbreviation,
        status: sub.status,
        dueBucket,
        ageDays,
        route: '/secretary/compliance',
      })
    }
    return simulateLatency(rows)
  },

  async getEscalationQueue() {
    applyEarlyWarningEvaluation()
    const items = [...db.escalations].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    return simulateLatency(items)
  },
}

// Keep ASSET_TYPE available for future land-linked litigation filters
void ASSET_TYPE
