import {
  ALERT_SEVERITY,
  DEMO_AS_OF_DATE,
  ROLE,
  TASK_STATUS,
  type RoleId,
} from '@/constants'
import { db } from '@/mock-data'
import { paginate } from '@/mock-services/_helpers'
import type {
  AlertItem,
  Escalation,
  ListQuery,
  NotificationItem,
  PagedResult,
  TaskItem,
} from '@/types/domain'
import { AppError, simulateLatency, simulateMutation } from '@/utils'
import {
  evaluateEarlyWarningRules,
  listRuleCatalogue,
} from '@/workflow/earlyWarningRules'
import { daysUntil } from '@/workflow/boardExpiry'

export type TaskDisplayStatus = 'open' | 'in_progress' | 'done' | 'cancelled' | 'overdue'

export interface TaskRow extends TaskItem {
  displayStatus: TaskDisplayStatus
  daysUntilDue: number
}

export interface AlertGroup {
  groupKey: string
  title: string
  severity: string
  count: number
  organizationIds: string[]
  alertIds: string[]
  sampleExplanation?: string
}

function asOfDate() {
  return DEMO_AS_OF_DATE
}

export function deriveTaskDisplayStatus(task: TaskItem, asOf = asOfDate()): TaskDisplayStatus {
  if (task.status === 'done') return 'done'
  if (task.status === 'cancelled') return 'cancelled'
  const days = daysUntil(task.dueDate, asOf)
  if (days < 0) return 'overdue'
  return task.status
}

function enrichTask(task: TaskItem): TaskRow {
  return {
    ...task,
    displayStatus: deriveTaskDisplayStatus(task),
    daysUntilDue: daysUntil(task.dueDate, asOfDate()),
  }
}

/** Merge rule hits into db without duplicating resolved/manual records. */
export function applyEarlyWarningEvaluation(): {
  alertsUpserted: number
  tasksUpserted: number
  escalationsUpserted: number
} {
  const hits = evaluateEarlyWarningRules({
    asOf: asOfDate(),
    boardMembers: db.boardMembers,
    loans: db.loans,
    submissions: db.submissions,
    clarifications: db.clarifications,
    compliance: db.compliance,
    auditParas: db.auditParas,
    assets: db.assets,
    organizations: db.organizations.map((o) => ({
      id: o.id,
      abbreviation: o.abbreviation,
    })),
  })

  let alertsUpserted = 0
  let tasksUpserted = 0
  let escalationsUpserted = 0

  for (const hit of hits) {
    const existingAlert = db.alerts.find((a) => a.id === hit.alert.id)
    if (!existingAlert) {
      db.alerts.push(hit.alert)
      alertsUpserted += 1
    } else if (existingAlert.status === 'open') {
      db.alerts[db.alerts.indexOf(existingAlert)] = {
        ...hit.alert,
        status: existingAlert.status,
        resolutionNote: existingAlert.resolutionNote,
      }
      alertsUpserted += 1
    }

    if (hit.task) {
      const existingTask = db.tasks.find((t) => t.id === hit.task!.id)
      if (!existingTask) {
        db.tasks.push(hit.task)
        tasksUpserted += 1
      } else if (existingTask.status === 'open' || existingTask.status === 'in_progress') {
        const idx = db.tasks.indexOf(existingTask)
        db.tasks[idx] = {
          ...hit.task,
          status: existingTask.status,
          completedAt: existingTask.completedAt,
          resolutionNote: existingTask.resolutionNote,
          history: existingTask.history ?? hit.task.history,
        }
        tasksUpserted += 1
      }
    }

    if (hit.escalation) {
      const existing = db.escalations.find((e) => e.id === hit.escalation!.id)
      if (!existing) {
        db.escalations.push(hit.escalation)
        escalationsUpserted += 1
      }
    }
  }

  return { alertsUpserted, tasksUpserted, escalationsUpserted }
}

function roleSeesOperationalNoise(role: RoleId): boolean {
  return (
    role !== ROLE.MINISTER &&
    role !== ROLE.PMO &&
    role !== ROLE.SECRETARY &&
    role !== ROLE.ASSURANCE_USER
  )
}

function filterAlertsForRole(alerts: AlertItem[], role: RoleId): AlertItem[] {
  if (role === ROLE.MINISTER || role === ROLE.PMO) {
    return alerts.filter(
      (a) =>
        a.severity === ALERT_SEVERITY.CRITICAL &&
        (a.ruleId === 'finance_submission_missing' ||
          a.ruleId === 'loan_repayment_overdue' ||
          a.ruleId === 'board_expiry_30' ||
          a.groupKey?.startsWith('finance_missing') ||
          a.groupKey?.startsWith('loan_overdue')),
    )
  }
  if (role === ROLE.SECRETARY) {
    return alerts.filter(
      (a) =>
        a.severity === ALERT_SEVERITY.CRITICAL ||
        a.severity === ALERT_SEVERITY.ATTENTION,
    )
  }
  return alerts
}

function filterTasksForRole(
  tasks: TaskItem[],
  role: RoleId,
  opts?: { assignedToMe?: boolean; organizationId?: string },
): TaskItem[] {
  let items = [...tasks]
  if (opts?.organizationId) {
    items = items.filter((t) => t.organizationId === opts.organizationId)
  }
  if (role === ROLE.MINISTER || role === ROLE.PMO) {
    return [] // senior portals: no operational task noise
  }
  if (role === ROLE.SECRETARY) {
    return items.filter(
      (t) =>
        t.priority === 'critical' ||
        t.ownerRole === ROLE.MOIP_SUPERVISOR ||
        t.ownerRole === ROLE.SECRETARY,
    )
  }
  if (opts?.assignedToMe) {
    items = items.filter((t) => t.ownerRole === role || t.assignedRole === role)
  }
  return items
}

export interface EarlyWarningService {
  refreshRules(): Promise<ReturnType<typeof applyEarlyWarningEvaluation>>
  getTasks(query?: ListQuery & {
    role?: RoleId
    assignedToMe?: boolean
    status?: string
    priority?: string
    module?: string
    view?: 'mine' | 'team' | 'overdue' | 'due_soon' | 'completed'
  }): Promise<PagedResult<TaskRow>>
  getTask(id: string): Promise<TaskRow>
  completeTask(id: string, role: RoleId, note?: string): Promise<TaskRow>
  startTask(id: string, role: RoleId): Promise<TaskRow>
  getAlerts(query?: ListQuery & {
    role?: RoleId
    severity?: string
    status?: string
    grouped?: boolean
  }): Promise<PagedResult<AlertItem>>
  getAlertGroups(role: RoleId, organizationId?: string): Promise<AlertGroup[]>
  getAlert(id: string): Promise<AlertItem>
  resolveAlert(id: string, role: RoleId, note?: string): Promise<AlertItem>
  acknowledgeAlert(id: string, role: RoleId): Promise<AlertItem>
  getNotifications(query?: ListQuery & { role?: RoleId }): Promise<PagedResult<NotificationItem>>
  markNotificationRead(id: string): Promise<NotificationItem>
  getEscalations(query?: { role?: RoleId; status?: string }): Promise<Escalation[]>
  getEscalation(id: string): Promise<Escalation>
  getRuleCatalogue(): Promise<ReturnType<typeof listRuleCatalogue>>
  getQueueSummary(role: RoleId, organizationId?: string): Promise<{
    myOpenTasks: number
    overdueTasks: number
    dueSoonTasks: number
    criticalAlerts: number
    attentionAlerts: number
    openEscalations: number
    unreadNotifications: number
  }>
}

export const mockEarlyWarningService: EarlyWarningService = {
  async refreshRules() {
    return simulateMutation(applyEarlyWarningEvaluation())
  },

  async getTasks(query) {
    applyEarlyWarningEvaluation()
    const role = query?.role ?? ROLE.SOE_FOCAL_PERSON
    let items = filterTasksForRole(db.tasks, role, {
      assignedToMe: query?.assignedToMe || query?.view === 'mine',
      organizationId: query?.organizationId,
    }).map(enrichTask)

    if (query?.view === 'overdue') {
      items = items.filter((t) => t.displayStatus === 'overdue')
    } else if (query?.view === 'due_soon') {
      items = items.filter(
        (t) =>
          t.displayStatus !== 'done' &&
          t.displayStatus !== 'cancelled' &&
          t.daysUntilDue >= 0 &&
          t.daysUntilDue <= 14,
      )
    } else if (query?.view === 'completed') {
      items = items.filter((t) => t.displayStatus === 'done')
    } else if (query?.view === 'team') {
      // team = org-scoped without assignedToMe filter (already applied)
    }

    if (query?.status === 'overdue') {
      items = items.filter((t) => t.displayStatus === 'overdue')
    } else if (query?.status) {
      items = items.filter((t) => t.status === query.status)
    }
    if (query?.priority) items = items.filter((t) => t.priority === query.priority)
    if (query?.module) items = items.filter((t) => t.sourceModule === query.module)
    if (query?.search) {
      const q = query.search.toLowerCase()
      items = items.filter((t) => t.title.toLowerCase().includes(q) || t.id.includes(q))
    }

    items.sort((a, b) => {
      const rank = { overdue: 0, open: 1, in_progress: 2, done: 3, cancelled: 4 }
      const dr = rank[a.displayStatus] - rank[b.displayStatus]
      if (dr !== 0) return dr
      return a.dueDate.localeCompare(b.dueDate)
    })

    return simulateLatency(paginate(items, query))
  },

  async getTask(id) {
    applyEarlyWarningEvaluation()
    const row = db.tasks.find((t) => t.id === id)
    if (!row) throw new AppError('Task not found', 'NOT_FOUND')
    return simulateLatency(enrichTask(row))
  },

  async completeTask(id, role, note) {
    const idx = db.tasks.findIndex((t) => t.id === id)
    if (idx < 0) throw new AppError('Task not found', 'NOT_FOUND')
    const now = new Date().toISOString()
    const prev = db.tasks[idx]
    db.tasks[idx] = {
      ...prev,
      status: TASK_STATUS.DONE,
      completedAt: now,
      resolutionNote: note,
      history: [
        ...(prev.history ?? []),
        { at: now, note: note ? `Completed: ${note}` : 'Marked complete', actorRole: role },
      ],
    }
    if (prev.sourceAlertId) {
      const aIdx = db.alerts.findIndex((a) => a.id === prev.sourceAlertId)
      if (aIdx >= 0 && db.alerts[aIdx].status === 'open') {
        db.alerts[aIdx] = {
          ...db.alerts[aIdx],
          status: 'resolved',
          resolvedAt: now,
          resolutionNote: note ?? 'Resolved via linked task completion',
        }
      }
    }
    return simulateMutation(enrichTask(db.tasks[idx]))
  },

  async startTask(id, role) {
    const idx = db.tasks.findIndex((t) => t.id === id)
    if (idx < 0) throw new AppError('Task not found', 'NOT_FOUND')
    const now = new Date().toISOString()
    db.tasks[idx] = {
      ...db.tasks[idx],
      status: TASK_STATUS.IN_PROGRESS,
      history: [
        ...(db.tasks[idx].history ?? []),
        { at: now, note: 'Moved to in progress', actorRole: role },
      ],
    }
    return simulateMutation(enrichTask(db.tasks[idx]))
  },

  async getAlerts(query) {
    applyEarlyWarningEvaluation()
    const role = query?.role ?? ROLE.SOE_FOCAL_PERSON
    let items = filterAlertsForRole(db.alerts, role)
    if (query?.organizationId) {
      items = items.filter((a) => a.organizationId === query.organizationId)
    }
    if (query?.severity) items = items.filter((a) => a.severity === query.severity)
    if (query?.status) items = items.filter((a) => a.status === query.status)
    if (query?.search) {
      const q = query.search.toLowerCase()
      items = items.filter((a) => a.title.toLowerCase().includes(q))
    }
    items.sort((a, b) => {
      const sev = { critical: 0, attention: 1, information: 2 }
      const sa = sev[a.severity as keyof typeof sev] ?? 3
      const sb = sev[b.severity as keyof typeof sev] ?? 3
      if (sa !== sb) return sa - sb
      return (b.generatedAt ?? '').localeCompare(a.generatedAt ?? '')
    })
    return simulateLatency(paginate(items, query))
  },

  async getAlertGroups(role, organizationId) {
    applyEarlyWarningEvaluation()
    let items = filterAlertsForRole(db.alerts, role).filter((a) => a.status === 'open')
    if (organizationId) items = items.filter((a) => a.organizationId === organizationId)
    const map = new Map<string, AlertGroup>()
    for (const a of items) {
      const key = a.groupKey ?? a.id
      const existing = map.get(key)
      if (!existing) {
        map.set(key, {
          groupKey: key,
          title: a.ruleLabel ?? a.title,
          severity: a.severity,
          count: 1,
          organizationIds: a.organizationId ? [a.organizationId] : [],
          alertIds: [a.id],
          sampleExplanation: a.explanation,
        })
      } else {
        existing.count += 1
        existing.alertIds.push(a.id)
        if (a.organizationId && !existing.organizationIds.includes(a.organizationId)) {
          existing.organizationIds.push(a.organizationId)
        }
        if (a.severity === ALERT_SEVERITY.CRITICAL) existing.severity = ALERT_SEVERITY.CRITICAL
      }
    }
    return simulateLatency([...map.values()].sort((a, b) => b.count - a.count))
  },

  async getAlert(id) {
    applyEarlyWarningEvaluation()
    const row = db.alerts.find((a) => a.id === id)
    if (!row) throw new AppError('Alert not found', 'NOT_FOUND')
    return simulateLatency(row)
  },

  async resolveAlert(id, role, note) {
    const idx = db.alerts.findIndex((a) => a.id === id)
    if (idx < 0) throw new AppError('Alert not found', 'NOT_FOUND')
    const now = new Date().toISOString()
    db.alerts[idx] = {
      ...db.alerts[idx],
      status: 'resolved',
      resolvedAt: now,
      resolutionNote: note ?? `Resolved by ${role}`,
    }
    return simulateMutation(db.alerts[idx])
  },

  async acknowledgeAlert(id, _role) {
    const idx = db.alerts.findIndex((a) => a.id === id)
    if (idx < 0) throw new AppError('Alert not found', 'NOT_FOUND')
    db.alerts[idx] = { ...db.alerts[idx], status: 'acknowledged' }
    return simulateMutation(db.alerts[idx])
  },

  async getNotifications(query) {
    let items = [...db.notifications]
    if (query?.organizationId) {
      items = items.filter((n) => n.organizationId === query.organizationId)
    }
    const role = query?.role
    if (role === ROLE.MINISTER || role === ROLE.PMO) {
      items = items.filter(
        (n) =>
          n.title.toLowerCase().includes('approval') ||
          n.title.toLowerCase().includes('escalat'),
      )
    }
    if (query?.search) {
      const q = query.search.toLowerCase()
      items = items.filter((n) => n.title.toLowerCase().includes(q) || n.body.toLowerCase().includes(q))
    }
    items.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    return simulateLatency(paginate(items, query))
  },

  async markNotificationRead(id) {
    const idx = db.notifications.findIndex((n) => n.id === id)
    if (idx < 0) throw new AppError('Notification not found', 'NOT_FOUND')
    db.notifications[idx] = { ...db.notifications[idx], status: 'read' }
    return simulateMutation(db.notifications[idx])
  },

  async getEscalations(query) {
    applyEarlyWarningEvaluation()
    let items = [...db.escalations]
    if (query?.status) items = items.filter((e) => e.status === query.status)
    const role = query?.role
    if (role === ROLE.MINISTER || role === ROLE.PMO) {
      items = items.filter((e) => e.severity === 'critical' && (e.escalationLevel ?? 1) >= 2)
    } else if (role === ROLE.SECRETARY) {
      items = items.filter((e) => e.status === 'open')
    }
    items.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    return simulateLatency(items)
  },

  async getEscalation(id) {
    const row = db.escalations.find((e) => e.id === id)
    if (!row) throw new AppError('Escalation not found', 'NOT_FOUND')
    return simulateLatency(row)
  },

  async getRuleCatalogue() {
    return simulateLatency(listRuleCatalogue())
  },

  async getQueueSummary(role, organizationId) {
    applyEarlyWarningEvaluation()
    const tasks = (
      await mockEarlyWarningService.getTasks({
        role,
        organizationId,
        pageSize: 200,
        assignedToMe: roleSeesOperationalNoise(role),
      })
    ).items
    const alerts = (
      await mockEarlyWarningService.getAlerts({
        role,
        organizationId,
        status: 'open',
        pageSize: 200,
      })
    ).items
    const escalations = await mockEarlyWarningService.getEscalations({ role, status: 'open' })
    const notifs = (
      await mockEarlyWarningService.getNotifications({
        role,
        organizationId,
        pageSize: 100,
      })
    ).items

    return simulateLatency({
      myOpenTasks: tasks.filter((t) => t.displayStatus === 'open' || t.displayStatus === 'in_progress')
        .length,
      overdueTasks: tasks.filter((t) => t.displayStatus === 'overdue').length,
      dueSoonTasks: tasks.filter(
        (t) =>
          t.displayStatus !== 'overdue' &&
          t.displayStatus !== 'done' &&
          t.daysUntilDue >= 0 &&
          t.daysUntilDue <= 14,
      ).length,
      criticalAlerts: alerts.filter((a) => a.severity === ALERT_SEVERITY.CRITICAL).length,
      attentionAlerts: alerts.filter((a) => a.severity === ALERT_SEVERITY.ATTENTION).length,
      openEscalations: escalations.length,
      unreadNotifications: notifs.filter((n) => n.status === 'unread').length,
    })
  },
}

// Keep legacy thin wrappers delegating to early warning service
export { mockEarlyWarningService as mockTaskCentreService }
