import { db } from '@/mock-data'
import {
  applyEarlyWarningEvaluation,
  mockEarlyWarningService,
} from '@/mock-services/earlyWarning.service'
import type { AlertItem, TaskItem } from '@/types/domain'
import { AppError, simulateLatency, simulateMutation } from '@/utils'

/** Legacy thin API — Phase 14 prefers mockEarlyWarningService */
export interface TaskService {
  getTasks(organizationId?: string): Promise<TaskItem[]>
  getTask(id: string): Promise<TaskItem>
  updateTask(id: string, patch: Partial<TaskItem>): Promise<TaskItem>
}

export interface NotificationService {
  getAlerts(organizationId?: string): Promise<AlertItem[]>
  acknowledgeAlert(id: string): Promise<AlertItem>
}

export const mockTaskService: TaskService = {
  async getTasks(organizationId) {
    applyEarlyWarningEvaluation()
    let items = [...db.tasks]
    if (organizationId) items = items.filter((t) => t.organizationId === organizationId)
    return simulateLatency(items)
  },
  async getTask(id) {
    return mockEarlyWarningService.getTask(id)
  },
  async updateTask(id, patch) {
    const idx = db.tasks.findIndex((t) => t.id === id)
    if (idx < 0) throw new AppError('Task not found', 'NOT_FOUND')
    db.tasks[idx] = { ...db.tasks[idx], ...patch, id }
    return simulateMutation(db.tasks[idx])
  },
}

export const mockNotificationService: NotificationService = {
  async getAlerts(organizationId) {
    applyEarlyWarningEvaluation()
    let items = [...db.alerts]
    if (organizationId) items = items.filter((a) => a.organizationId === organizationId)
    return simulateLatency(items)
  },
  async acknowledgeAlert(id) {
    return mockEarlyWarningService.acknowledgeAlert(id, 'moip_reviewer')
  },
}
