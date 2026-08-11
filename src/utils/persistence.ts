import { APP_CONFIG } from '@/app/config/app.config'

const PREFIX = 'soe-gaip:'

export const persistence = {
  get<T>(key: string, fallback: T): T {
    try {
      const raw = localStorage.getItem(PREFIX + key)
      if (!raw) return fallback
      return JSON.parse(raw) as T
    } catch {
      return fallback
    }
  },
  set<T>(key: string, value: T): void {
    localStorage.setItem(PREFIX + key, JSON.stringify(value))
  },
  remove(key: string): void {
    localStorage.removeItem(PREFIX + key)
  },
}

export const persistenceKeys = {
  role: 'demo-role',
  organizationId: 'organization-id',
  reportingPeriodId: 'reporting-period-id',
  sidebarCollapsed: 'sidebar-collapsed',
  authenticated: 'authenticated',
  userEmail: 'user-email',
} as const

export const defaultPersisted = {
  role: APP_CONFIG.DEFAULT_ROLE,
  organizationId: APP_CONFIG.DEFAULT_ORGANIZATION_ID,
  reportingPeriodId: APP_CONFIG.DEFAULT_REPORTING_PERIOD_ID,
}
