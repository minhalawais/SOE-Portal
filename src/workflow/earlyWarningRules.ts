/**
 * Centralized early-warning rule evaluator (Phase 14).
 * Domain data → rule evaluator → alert/task/escalation candidates.
 * Thresholds are prototype until stakeholder confirmation.
 */
import {
  ALERT_SEVERITY,
  ASSET_TYPE,
  DEMO_AS_OF_DATE,
  EARLY_WARNING_RULE,
  EARLY_WARNING_RULE_META,
  ESCALATION_REASON,
  ESCALATION_SEVERITY,
  MODULE,
  ROLE,
  SUBMISSION_STATUS,
  TASK_PRIORITY,
  TASK_STATUS,
  type EarlyWarningRuleId,
} from '@/constants'
import type {
  AlertItem,
  Escalation,
  TaskItem,
} from '@/types/domain'
import { daysUntil, resolveBoardExpiryBand } from '@/workflow/boardExpiry'
import { BOARD_EXPIRY_BAND } from '@/constants'

export interface RuleEvaluationContext {
  asOf?: string
  boardMembers: Array<{
    id: string
    organizationId: string
    name: string
    expiryDate: string
    isVacancySlot?: boolean
  }>
  loans: Array<{
    id: string
    organizationId: string
    repaymentStatus: string
    nextDueDate: string
    reference?: string
  }>
  submissions: Array<{
    id: string
    organizationId: string
    module: string
    reportingPeriodId: string
    status: string
  }>
  clarifications: Array<{
    id: string
    organizationId: string
    submissionId: string
    status: string
    createdAt: string
    dueDate?: string
  }>
  compliance: Array<{
    id: string
    organizationId: string
    status: string
    dueDate?: string
    area?: string
  }>
  auditParas: Array<{
    id: string
    organizationId: string
    status: string
    dateRaised: string
    title?: string
  }>
  assets: Array<{
    id: string
    organizationId: string
    assetType: string
    evidenceStatus?: string
    name: string
  }>
  organizations: Array<{ id: string; abbreviation: string }>
}

export interface RuleHit {
  ruleId: EarlyWarningRuleId
  alert: Omit<AlertItem, 'id' | 'status'> & { id: string; status: AlertItem['status'] }
  task?: Omit<TaskItem, 'id'> & { id: string }
  escalation?: Omit<Escalation, 'id' | 'isDummyDemonstrationData'> & {
    id: string
    isDummyDemonstrationData: true
  }
}

function orgAbbr(
  organizations: RuleEvaluationContext['organizations'],
  organizationId: string,
): string {
  return organizations.find((o) => o.id === organizationId)?.abbreviation ?? organizationId
}

function routeFor(module: string, recordType: string, recordId: string, orgId: string): string {
  if (recordType === 'board_member' || recordType === 'board') {
    return `/soe/people/board/${recordId}`
  }
  if (recordType === 'loan') return `/soe/finance/loans/${recordId}`
  if (recordType === 'submission' && module === 'finance') {
    return `/soe/finance`
  }
  if (recordType === 'clarification') return `/soe/submissions?tab=clarifications`
  if (recordType === 'compliance') return `/soe/accountability/compliance`
  if (recordType === 'audit_para') return `/soe/accountability/audit/${recordId}`
  if (recordType === 'asset') return `/soe/assets/${recordId}`
  return `/soe/enterprise/profile?org=${orgId}`
}

/** Evaluate all prototype rules against domain snapshot. */
export function evaluateEarlyWarningRules(ctx: RuleEvaluationContext): RuleHit[] {
  const asOf = ctx.asOf ?? DEMO_AS_OF_DATE
  const hits: RuleHit[] = []
  const meta = EARLY_WARNING_RULE_META

  // Board expiry — Critical ≤30, Attention ≤90 (dedupe: critical supersedes attention per member)
  for (const b of ctx.boardMembers) {
    if (b.isVacancySlot) continue
    const band = resolveBoardExpiryBand(b, asOf)
    const days = daysUntil(b.expiryDate, asOf)
    if (band === BOARD_EXPIRY_BAND.WITHIN_30 || band === BOARD_EXPIRY_BAND.EXPIRED) {
      const ruleId = EARLY_WARNING_RULE.BOARD_EXPIRY_30
      const m = meta[ruleId]
      const alertId = `alert-rule-${ruleId}-${b.id}`
      const taskId = `task-rule-${ruleId}-${b.id}`
      hits.push({
        ruleId,
        alert: {
          id: alertId,
          organizationId: b.organizationId,
          title: `Board tenure critical — ${b.name}`,
          severity: ALERT_SEVERITY.CRITICAL,
          status: 'open',
          linkedRecordType: 'board_member',
          linkedRecordId: b.id,
          ruleId,
          ruleLabel: m.label,
          generatedAt: `${asOf}T08:00:00Z`,
          explanation: `${m.thresholdNote} ${days} day(s) remaining as of ${asOf}.`,
          recommendedAction: 'Initiate appointment / reappointment process',
          groupKey: `board_expiry:${b.organizationId}`,
          createsTask: true,
          linkedTaskId: taskId,
          route: routeFor('board', 'board_member', b.id, b.organizationId),
          isPrototypeRule: true,
        },
        task: {
          id: taskId,
          organizationId: b.organizationId,
          title: `Initiate appointment process — ${b.name}`,
          type: 'board_appointment',
          sourceModule: MODULE.BOARD,
          linkedRecordType: 'board_member',
          linkedRecordId: b.id,
          ownerRole: ROLE.SOE_FOCAL_PERSON,
          assignedRole: ROLE.SOE_FOCAL_PERSON,
          createdAt: `${asOf}T08:00:00Z`,
          dueDate: b.expiryDate,
          priority: TASK_PRIORITY.CRITICAL,
          status: TASK_STATUS.OPEN,
          nextAction: 'Prepare appointment notification pack',
          sourceAlertId: alertId,
          route: routeFor('board', 'board_member', b.id, b.organizationId),
          history: [
            {
              at: `${asOf}T08:00:00Z`,
              note: 'Task auto-created from critical board expiry rule',
              actorRole: ROLE.SOE_FOCAL_PERSON,
            },
          ],
        },
      })
    } else if (band === BOARD_EXPIRY_BAND.WITHIN_90) {
      const ruleId = EARLY_WARNING_RULE.BOARD_EXPIRY_90
      const m = meta[ruleId]
      hits.push({
        ruleId,
        alert: {
          id: `alert-rule-${ruleId}-${b.id}`,
          organizationId: b.organizationId,
          title: `Board tenure attention — ${b.name}`,
          severity: ALERT_SEVERITY.ATTENTION,
          status: 'open',
          linkedRecordType: 'board_member',
          linkedRecordId: b.id,
          ruleId,
          ruleLabel: m.label,
          generatedAt: `${asOf}T08:00:00Z`,
          explanation: `${m.thresholdNote} ${days} day(s) remaining as of ${asOf}.`,
          recommendedAction: 'Plan succession / appointment timeline',
          groupKey: `board_expiry:${b.organizationId}`,
          createsTask: false,
          route: routeFor('board', 'board_member', b.id, b.organizationId),
          isPrototypeRule: true,
        },
      })
    }
  }

  // Loan repayment overdue
  for (const loan of ctx.loans) {
    if (loan.repaymentStatus !== 'overdue') continue
    const ruleId = EARLY_WARNING_RULE.LOAN_REPAYMENT_OVERDUE
    const m = meta[ruleId]
    const alertId = `alert-rule-${ruleId}-${loan.id}`
    const taskId = `task-rule-${ruleId}-${loan.id}`
    hits.push({
      ruleId,
      alert: {
        id: alertId,
        organizationId: loan.organizationId,
        title: `Loan repayment overdue — ${orgAbbr(ctx.organizations, loan.organizationId)}`,
        severity: ALERT_SEVERITY.CRITICAL,
        status: 'open',
        linkedRecordType: 'loan',
        linkedRecordId: loan.id,
        ruleId,
        ruleLabel: m.label,
        generatedAt: `${asOf}T08:00:00Z`,
        explanation: m.thresholdNote,
        recommendedAction: 'Update repayment schedule and escalate fiscal exposure',
        groupKey: `loan_overdue:${loan.organizationId}`,
        createsTask: true,
        linkedTaskId: taskId,
        route: routeFor('loans', 'loan', loan.id, loan.organizationId),
        isPrototypeRule: true,
      },
      task: {
        id: taskId,
        organizationId: loan.organizationId,
        title: 'Resolve overdue loan repayment',
        type: 'loan_repayment',
        sourceModule: MODULE.LOANS,
        linkedRecordType: 'loan',
        linkedRecordId: loan.id,
        ownerRole: ROLE.SOE_FOCAL_PERSON,
        assignedRole: ROLE.SOE_FOCAL_PERSON,
        createdAt: `${asOf}T08:00:00Z`,
        dueDate: loan.nextDueDate,
        priority: TASK_PRIORITY.CRITICAL,
        status: TASK_STATUS.OPEN,
        nextAction: 'Record repayment or reschedule with evidence',
        sourceAlertId: alertId,
        route: routeFor('loans', 'loan', loan.id, loan.organizationId),
      },
    })
  }

  // Finance submission missing — certified but not yet submitted to MoIP
  for (const sub of ctx.submissions) {
    if (sub.module !== MODULE.FINANCE || sub.reportingPeriodId !== 'period-fy2027') continue
    if (sub.status !== SUBMISSION_STATUS.CERTIFIED) continue
    const ruleId = EARLY_WARNING_RULE.FINANCE_SUBMISSION_MISSING
    const m = meta[ruleId]
    const alertId = `alert-rule-${ruleId}-${sub.id}`
    const taskId = `task-rule-${ruleId}-${sub.id}`
    const escId = `esc-rule-${ruleId}-${sub.id}`
    hits.push({
      ruleId,
      alert: {
        id: alertId,
        organizationId: sub.organizationId,
        title: `Financial submission not received — ${orgAbbr(ctx.organizations, sub.organizationId)}`,
        severity: ALERT_SEVERITY.CRITICAL,
        status: 'open',
        linkedRecordType: 'submission',
        linkedRecordId: sub.id,
        ruleId,
        ruleLabel: m.label,
        generatedAt: `${asOf}T08:00:00Z`,
        explanation: `${m.thresholdNote} Pack is certified but not submitted.`,
        recommendedAction: 'Submit certified finance pack to MoIP',
        groupKey: `finance_missing:${sub.organizationId}`,
        createsTask: true,
        linkedTaskId: taskId,
        route: '/soe/finance',
        isPrototypeRule: true,
      },
      task: {
        id: taskId,
        organizationId: sub.organizationId,
        title: 'Submit FY2027 financial pack to MoIP',
        type: 'finance_submission',
        sourceModule: MODULE.FINANCE,
        linkedRecordType: 'submission',
        linkedRecordId: sub.id,
        ownerRole: ROLE.SOE_FOCAL_PERSON,
        assignedRole: ROLE.SOE_FOCAL_PERSON,
        createdAt: `${asOf}T08:00:00Z`,
        dueDate: '2026-08-15',
        priority: TASK_PRIORITY.CRITICAL,
        status: TASK_STATUS.OPEN,
        nextAction: 'Confirm and submit to MoIP',
        sourceAlertId: alertId,
        route: '/soe/finance',
      },
      escalation: {
        id: escId,
        organizationId: sub.organizationId,
        submissionId: sub.id,
        originatingAlertId: alertId,
        originatingTaskId: taskId,
        reason: `Financial submission missing for ${orgAbbr(ctx.organizations, sub.organizationId)}`,
        reasonCode: ESCALATION_REASON.MISSING_SUBMISSION,
        severity: ESCALATION_SEVERITY.CRITICAL,
        ownerRole: ROLE.MOIP_SUPERVISOR,
        dueDate: '2026-08-12',
        status: 'open',
        createdAt: `${asOf}T08:30:00Z`,
        createdByRole: ROLE.MOIP_REVIEWER,
        escalationLevel: 2,
        escalatedBy: 'system',
        historyNote: 'System escalation from missing finance submission rule',
        history: [
          {
            at: `${asOf}T08:30:00Z`,
            note: 'Escalated to MoIP Supervisor (prototype rule)',
            actor: 'system',
          },
        ],
        isDummyDemonstrationData: true,
      },
    })
  }

  // Clarification overdue (>7 days)
  for (const c of ctx.clarifications) {
    if (c.status !== 'open') continue
    const age = daysUntil(c.createdAt.slice(0, 10), asOf)
    // daysUntil is target - asOf; for createdAt in past, age is negative
    const daysOpen = -age
    if (daysOpen < 7) continue
    const ruleId = EARLY_WARNING_RULE.CLARIFICATION_OVERDUE
    const m = meta[ruleId]
    const alertId = `alert-rule-${ruleId}-${c.id}`
    const taskId = `task-rule-${ruleId}-${c.id}`
    hits.push({
      ruleId,
      alert: {
        id: alertId,
        organizationId: c.organizationId,
        title: 'Clarification response overdue',
        severity: ALERT_SEVERITY.ATTENTION,
        status: 'open',
        linkedRecordType: 'clarification',
        linkedRecordId: c.id,
        ruleId,
        ruleLabel: m.label,
        generatedAt: `${asOf}T08:00:00Z`,
        explanation: `${m.thresholdNote} Open ${daysOpen} day(s).`,
        recommendedAction: 'Respond to MoIP clarification',
        groupKey: `clarification_overdue:${c.organizationId}`,
        createsTask: true,
        linkedTaskId: taskId,
        route: '/soe/submissions?tab=clarifications',
        isPrototypeRule: true,
      },
      task: {
        id: taskId,
        organizationId: c.organizationId,
        title: 'Respond to overdue MoIP clarification',
        type: 'clarification_response',
        sourceModule: MODULE.FINANCE,
        linkedRecordType: 'clarification',
        linkedRecordId: c.id,
        ownerRole: ROLE.SOE_FOCAL_PERSON,
        assignedRole: ROLE.SOE_FOCAL_PERSON,
        createdAt: `${asOf}T08:00:00Z`,
        dueDate: c.dueDate ?? '2026-08-10',
        priority: TASK_PRIORITY.HIGH,
        status: TASK_STATUS.OPEN,
        nextAction: 'Provide clarification response with evidence',
        sourceAlertId: alertId,
        route: '/soe/submissions?tab=clarifications',
      },
    })
  }

  // Compliance due within 14 days or overdue
  for (const item of ctx.compliance) {
    if (!item.dueDate) continue
    if (item.status === 'compliant' || item.status === 'not_applicable') continue
    const d = daysUntil(item.dueDate, asOf)
    if (d > 14) continue
    const ruleId = EARLY_WARNING_RULE.COMPLIANCE_DUE_14
    const m = meta[ruleId]
    const alertId = `alert-rule-${ruleId}-${item.id}`
    const taskId = `task-rule-${ruleId}-${item.id}`
    hits.push({
      ruleId,
      alert: {
        id: alertId,
        organizationId: item.organizationId,
        title: item.area
          ? `Compliance due — ${item.area}`
          : 'Compliance obligation due soon',
        severity: d < 0 ? ALERT_SEVERITY.CRITICAL : ALERT_SEVERITY.ATTENTION,
        status: 'open',
        linkedRecordType: 'compliance',
        linkedRecordId: item.id,
        ruleId,
        ruleLabel: m.label,
        generatedAt: `${asOf}T08:00:00Z`,
        explanation: `${m.thresholdNote} Due ${item.dueDate} (${d} day(s) from ${asOf}).`,
        recommendedAction: 'Complete compliance return with evidence',
        groupKey: `compliance_due:${item.organizationId}`,
        createsTask: true,
        linkedTaskId: taskId,
        route: '/soe/accountability/compliance',
        isPrototypeRule: true,
      },
      task: {
        id: taskId,
        organizationId: item.organizationId,
        title: 'Complete compliance return',
        type: 'compliance_return',
        sourceModule: MODULE.COMPLIANCE,
        linkedRecordType: 'compliance',
        linkedRecordId: item.id,
        ownerRole: ROLE.SOE_FOCAL_PERSON,
        assignedRole: ROLE.SOE_FOCAL_PERSON,
        createdAt: `${asOf}T08:00:00Z`,
        dueDate: item.dueDate,
        priority: d < 0 ? TASK_PRIORITY.CRITICAL : TASK_PRIORITY.HIGH,
        status: TASK_STATUS.OPEN,
        nextAction: 'Submit compliance evidence pack',
        sourceAlertId: alertId,
        route: '/soe/accountability/compliance',
      },
    })
  }

  // Audit para overdue — open paras older than 180 days (prototype)
  for (const para of ctx.auditParas) {
    if (para.status === 'closed' || para.status === 'settled') continue
    const age = -daysUntil(para.dateRaised, asOf)
    if (age < 180) continue
    const ruleId = EARLY_WARNING_RULE.AUDIT_PARA_OVERDUE
    const m = meta[ruleId]
    const alertId = `alert-rule-${ruleId}-${para.id}`
    const taskId = `task-rule-${ruleId}-${para.id}`
    hits.push({
      ruleId,
      alert: {
        id: alertId,
        organizationId: para.organizationId,
        title: `Audit para overdue — ${para.title ?? para.id}`,
        severity: ALERT_SEVERITY.ATTENTION,
        status: 'open',
        linkedRecordType: 'audit_para',
        linkedRecordId: para.id,
        ruleId,
        ruleLabel: m.label,
        generatedAt: `${asOf}T08:00:00Z`,
        explanation: `${m.thresholdNote} Age ${age} days.`,
        recommendedAction: 'Update recovery / management response',
        groupKey: `audit_para_overdue:${para.organizationId}`,
        createsTask: true,
        linkedTaskId: taskId,
        route: `/soe/accountability/audit/${para.id}`,
        isPrototypeRule: true,
      },
      task: {
        id: taskId,
        organizationId: para.organizationId,
        title: `Resolve overdue audit para — ${para.title ?? para.id}`,
        type: 'audit_para',
        sourceModule: MODULE.AUDIT,
        linkedRecordType: 'audit_para',
        linkedRecordId: para.id,
        ownerRole: ROLE.SOE_FOCAL_PERSON,
        assignedRole: ROLE.SOE_FOCAL_PERSON,
        createdAt: `${asOf}T08:00:00Z`,
        dueDate: '2026-08-31',
        priority: TASK_PRIORITY.HIGH,
        status: TASK_STATUS.OPEN,
        nextAction: 'Record recovery progress or PAC linkage',
        sourceAlertId: alertId,
        route: `/soe/accountability/audit/${para.id}`,
      },
    })
  }

  // Property valuation missing on land
  for (const asset of ctx.assets) {
    if (asset.assetType !== ASSET_TYPE.LAND) continue
    if (asset.evidenceStatus !== 'missing' && asset.evidenceStatus !== 'partial') {
      continue
    }
    const ruleId = EARLY_WARNING_RULE.PROPERTY_VALUATION_MISSING
    const m = meta[ruleId]
    const alertId = `alert-rule-${ruleId}-${asset.id}`
    const taskId = `task-rule-${ruleId}-${asset.id}`
    hits.push({
      ruleId,
      alert: {
        id: alertId,
        organizationId: asset.organizationId,
        title: `Property valuation / evidence gap — ${asset.name}`,
        severity: ALERT_SEVERITY.ATTENTION,
        status: 'open',
        linkedRecordType: 'asset',
        linkedRecordId: asset.id,
        ruleId,
        ruleLabel: m.label,
        generatedAt: `${asOf}T08:00:00Z`,
        explanation: m.thresholdNote,
        recommendedAction: 'Upload valuation report evidence',
        groupKey: `valuation_missing:${asset.organizationId}`,
        createsTask: true,
        linkedTaskId: taskId,
        route: `/soe/assets/${asset.id}`,
        isPrototypeRule: true,
      },
      task: {
        id: taskId,
        organizationId: asset.organizationId,
        title: `Submit property valuation — ${asset.name}`,
        type: 'asset_valuation',
        sourceModule: MODULE.ASSETS,
        linkedRecordType: 'asset',
        linkedRecordId: asset.id,
        ownerRole: ROLE.SOE_FOCAL_PERSON,
        assignedRole: ROLE.SOE_FOCAL_PERSON,
        createdAt: `${asOf}T08:00:00Z`,
        dueDate: '2026-09-15',
        priority: TASK_PRIORITY.HIGH,
        status: TASK_STATUS.OPEN,
        nextAction: 'Attach valuation evidence to asset record',
        sourceAlertId: alertId,
        route: `/soe/assets/${asset.id}`,
      },
    })
  }

  return hits
}

export function listRuleCatalogue() {
  return (Object.keys(EARLY_WARNING_RULE_META) as EarlyWarningRuleId[]).map((id) => ({
    id,
    ...EARLY_WARNING_RULE_META[id],
  }))
}
