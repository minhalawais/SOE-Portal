import { db } from '@/mock-data'
import { ROLE_LABEL, type RoleId } from '@/constants'
import { simulateLatency } from '@/utils'
import { REPORTING_MODULES } from '@/workflow/moduleCatalog'

export type LogLevel = 'info' | 'success' | 'warning' | 'security' | 'error'

export type LogCategory =
  | 'auth'
  | 'data_entry'
  | 'submission'
  | 'document'
  | 'review'
  | 'export'
  | 'system'

export interface ActivityLogEntry {
  id: string
  occurredAt: string
  level: LogLevel
  category: LogCategory
  actor: string
  actorRole: RoleId | string
  organizationId?: string
  module?: string
  action: string
  detail: string
  ipAddress?: string
  recordRef?: string
}

export interface LogsSummary {
  today: number
  thisWeek: number
  warnings: number
  security: number
}

export interface LogsQueryResult {
  items: ActivityLogEntry[]
  total: number
  page: number
  pageSize: number
}

export interface LogsQuery {
  organizationId?: string
  portfolio?: boolean
  level?: LogLevel
  category?: LogCategory
  module?: string
  search?: string
  quick?: 'all' | 'today' | 'data_entry' | 'submissions' | 'security'
  page?: number
  pageSize?: number
}

const DEMO_LOGS: ActivityLogEntry[] = [
  {
    id: 'log-001',
    occurredAt: '2026-08-18T08:02:11Z',
    level: 'auth',
    category: 'auth',
    actor: 'Ayesha Khan',
    actorRole: 'executive_viewer',
    organizationId: 'org-tusdec',
    action: 'Signed in',
    detail: 'Successful login via MFA from Lahore office network',
    ipAddress: '103.47.18.42',
  },
  {
    id: 'log-002',
    occurredAt: '2026-08-18T07:55:03Z',
    level: 'info',
    category: 'system',
    actor: 'System',
    actorRole: 'system',
    organizationId: 'org-tusdec',
    action: 'Reporting period active',
    detail: 'FY2027 reporting cycle context applied to workspace',
  },
  {
    id: 'log-003',
    occurredAt: '2026-08-17T16:40:22Z',
    level: 'success',
    category: 'data_entry',
    actor: 'Imran Siddiqui',
    actorRole: 'finance_officer',
    organizationId: 'org-tusdec',
    module: 'finance',
    action: 'Draft saved',
    detail: 'Financial & Fiscal module draft v0.6 saved with 4 sections complete',
    ipAddress: '103.47.18.51',
    recordRef: 'sub-tusdec-finance-fy2027',
  },
  {
    id: 'log-004',
    occurredAt: '2026-08-17T15:18:44Z',
    level: 'success',
    category: 'document',
    actor: 'Sara Malik',
    actorRole: 'soe_focal_person',
    organizationId: 'org-tusdec',
    module: 'documents',
    action: 'Evidence attached',
    detail: 'Audited statements FY2026 attached to finance submission pack',
    recordRef: 'doc-tusdec-finance-evidence',
  },
  {
    id: 'log-005',
    occurredAt: '2026-08-17T14:02:09Z',
    level: 'warning',
    category: 'submission',
    actor: 'System',
    actorRole: 'system',
    organizationId: 'org-tusdec',
    module: 'compliance',
    action: 'Validation warning',
    detail: 'Compliance attestation missing board resolution reference',
    recordRef: 'sub-tusdec-compliance-fy2027',
  },
  {
    id: 'log-006',
    occurredAt: '2026-08-17T11:30:00Z',
    level: 'info',
    category: 'data_entry',
    actor: 'Hassan Raza',
    actorRole: 'asset_officer',
    organizationId: 'org-tusdec',
    module: 'assets',
    action: 'Record updated',
    detail: 'Land parcel utilization revised from 35% to 28% after site survey',
    recordRef: 'asset-tusdec-land-1',
  },
  {
    id: 'log-007',
    occurredAt: '2026-08-16T17:05:33Z',
    level: 'success',
    category: 'submission',
    actor: 'Imran Siddiqui',
    actorRole: 'cfo',
    organizationId: 'org-tusdec',
    module: 'finance',
    action: 'Pack certified',
    detail: 'FY2027 finance pack certified — awaiting MoIP submission',
    recordRef: 'sub-tusdec-finance-fy2027',
  },
  {
    id: 'log-008',
    occurredAt: '2026-08-16T10:12:18Z',
    level: 'security',
    category: 'auth',
    actor: 'Unknown',
    actorRole: 'unknown',
    organizationId: 'org-tusdec',
    action: 'Failed login attempt',
    detail: 'Three consecutive failed password attempts — account temporarily locked',
    ipAddress: '185.220.101.14',
  },
  {
    id: 'log-009',
    occurredAt: '2026-08-15T13:44:55Z',
    level: 'info',
    category: 'export',
    actor: 'Ayesha Khan',
    actorRole: 'executive_viewer',
    organizationId: 'org-tusdec',
    action: 'Report exported',
    detail: 'Executive summary PDF generated for board review',
  },
  {
    id: 'log-010',
    occurredAt: '2026-08-15T09:20:01Z',
    level: 'info',
    category: 'data_entry',
    actor: 'Nadia Hussain',
    actorRole: 'company_secretary',
    organizationId: 'org-tusdec',
    module: 'enterprise',
    action: 'Profile updated',
    detail: 'Ownership composition and registered address fields updated',
    recordRef: 'org-tusdec',
  },
  {
    id: 'log-011',
    occurredAt: '2026-08-14T16:08:40Z',
    level: 'success',
    category: 'review',
    actor: 'MoIP Reviewer',
    actorRole: 'moip_reviewer',
    organizationId: 'org-tusdec',
    module: 'documents',
    action: 'Evidence verified',
    detail: 'FY2026 annual report marked verified in document repository',
    recordRef: 'doc-tusdec-annual-fy2026',
  },
  {
    id: 'log-012',
    occurredAt: '2026-08-14T08:01:00Z',
    level: 'error',
    category: 'system',
    actor: 'System',
    actorRole: 'system',
    organizationId: 'org-tusdec',
    action: 'Import rejected',
    detail: 'Bulk asset import failed — 2 rows missing province code',
  },
  {
    id: 'log-013',
    occurredAt: '2026-08-13T15:22:17Z',
    level: 'info',
    category: 'data_entry',
    actor: 'Omar Farooq',
    actorRole: 'industrial_officer',
    organizationId: 'org-tusdec',
    module: 'industrial',
    action: 'Metrics saved',
    detail: 'Capacity utilization and production output updated for Q2',
  },
  {
    id: 'log-014',
    occurredAt: '2026-08-12T12:00:00Z',
    level: 'warning',
    category: 'submission',
    actor: 'System',
    actorRole: 'system',
    organizationId: 'org-tusdec',
    module: 'finance',
    action: 'Deadline reminder',
    detail: 'FY2027 finance submission due in 49 days — pack certified but not submitted',
  },
  {
    id: 'log-015',
    occurredAt: '2026-08-11T09:45:30Z',
    level: 'security',
    category: 'auth',
    actor: 'Sara Malik',
    actorRole: 'soe_focal_person',
    organizationId: 'org-tusdec',
    action: 'MFA enrolled',
    detail: 'Authenticator app registered for account',
    ipAddress: '103.47.18.60',
  },
  {
    id: 'log-016',
    occurredAt: '2026-08-10T18:30:12Z',
    level: 'success',
    category: 'submission',
    actor: 'Hassan Raza',
    actorRole: 'asset_officer',
    organizationId: 'org-tusdec',
    module: 'assets',
    action: 'Section submitted',
    detail: 'Assets & Property module resubmitted after clarification on land utilization',
    recordRef: 'sub-tusdec-assets-fy2027',
  },
  {
    id: 'log-017',
    occurredAt: '2026-08-09T11:15:00Z',
    level: 'info',
    category: 'data_entry',
    actor: 'Nadia Hussain',
    actorRole: 'company_secretary',
    organizationId: 'org-tusdec',
    module: 'board',
    action: 'Board record added',
    detail: 'Independent director appointment recorded with tenure end date',
  },
  {
    id: 'log-018',
    occurredAt: '2026-08-08T07:00:00Z',
    level: 'info',
    category: 'system',
    actor: 'System',
    actorRole: 'system',
    organizationId: 'org-tusdec',
    action: 'Scheduled backup',
    detail: 'Nightly configuration snapshot completed successfully',
  },
  // Portfolio-wide entries (MoIP / executive portfolio view)
  {
    id: 'log-p001',
    occurredAt: '2026-08-18T06:30:00Z',
    level: 'info',
    category: 'review',
    actor: 'Portfolio Analyst',
    actorRole: 'moip_reviewer',
    organizationId: 'org-psm',
    action: 'Queue opened',
    detail: 'PSM FY2027 finance pack taken under review',
    recordRef: 'sub-psm-finance-fy2027',
  },
  {
    id: 'log-p002',
    occurredAt: '2026-08-17T20:10:00Z',
    level: 'warning',
    category: 'submission',
    actor: 'System',
    actorRole: 'system',
    organizationId: 'org-nfc',
    action: 'Governance alert',
    detail: 'Board member tenure expiring within 30 days — appointment action required',
  },
  {
    id: 'log-p003',
    occurredAt: '2026-08-17T18:00:00Z',
    level: 'success',
    category: 'submission',
    actor: 'USC Focal',
    actorRole: 'soe_focal_person',
    organizationId: 'org-usc',
    module: 'finance',
    action: 'Pack submitted',
    detail: 'FY2027 finance pack submitted to MoIP for review',
  },
  {
    id: 'log-p004',
    occurredAt: '2026-08-16T14:22:00Z',
    level: 'security',
    category: 'auth',
    actor: 'Admin',
    actorRole: 'system_admin',
    action: 'Role changed',
    detail: 'Custom module permissions updated for PECO certifier account',
    organizationId: 'org-peco',
  },
  {
    id: 'log-p005',
    occurredAt: '2026-08-15T10:00:00Z',
    level: 'info',
    category: 'export',
    actor: 'PMO Analyst',
    actorRole: 'pmo',
    action: 'Dashboard export',
    detail: 'National portfolio snapshot exported for cabinet briefing',
  },
]

function startOfTodayIso() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

function startOfWeekIso() {
  const d = new Date()
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

function matchesQuick(entry: ActivityLogEntry, quick: LogsQuery['quick']) {
  if (!quick || quick === 'all') return true
  if (quick === 'today') return entry.occurredAt >= startOfTodayIso()
  if (quick === 'data_entry') return entry.category === 'data_entry'
  if (quick === 'submissions') return entry.category === 'submission' || entry.category === 'review'
  if (quick === 'security') return entry.level === 'security' || entry.category === 'auth'
  return true
}

function buildLogs(): ActivityLogEntry[] {
  const fromHistory = db.submissionHistory.slice(0, 12).map(
    (e, i): ActivityLogEntry => ({
      id: `log-hist-${e.id}`,
      occurredAt: e.occurredAt,
      level: e.action === 'lock' || e.action === 'approval' ? 'success' : 'info',
      category: e.action === 'clarification' ? 'review' : 'submission',
      actor: ROLE_LABEL[e.actorRole as RoleId] ?? e.actorRole,
      actorRole: e.actorRole,
      organizationId: e.organizationId,
      module: e.module,
      action: e.action.replaceAll('_', ' '),
      detail: e.comment ?? `${e.module} submission ${e.status}`,
      recordRef: e.submissionId,
    }),
  )

  return [...DEMO_LOGS, ...fromHistory].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
}

let cachedLogs: ActivityLogEntry[] | null = null

function allLogs() {
  if (!cachedLogs) cachedLogs = buildLogs()
  return cachedLogs
}

export function resetLogsCache() {
  cachedLogs = null
}

export const mockLogsService = {
  async getSummary(query: Pick<LogsQuery, 'organizationId' | 'portfolio'>): Promise<LogsSummary> {
    let items = allLogs()
    if (query.portfolio) {
      // portfolio view — all orgs
    } else if (query.organizationId) {
      items = items.filter((e) => e.organizationId === query.organizationId)
    }
    const todayStart = startOfTodayIso()
    const weekStart = startOfWeekIso()
    const summary: LogsSummary = {
      today: items.filter((e) => e.occurredAt >= todayStart).length,
      thisWeek: items.filter((e) => e.occurredAt >= weekStart).length,
      warnings: items.filter((e) => e.level === 'warning' || e.level === 'error').length,
      security: items.filter((e) => e.level === 'security').length,
    }
    return simulateLatency(summary)
  },

  async getLogs(query: LogsQuery): Promise<LogsQueryResult> {
    let items = allLogs()
    if (!query.portfolio && query.organizationId) {
      items = items.filter((e) => e.organizationId === query.organizationId)
    }
    if (query.level) items = items.filter((e) => e.level === query.level)
    if (query.category) items = items.filter((e) => e.category === query.category)
    if (query.module) items = items.filter((e) => e.module === query.module)
    if (query.quick) items = items.filter((e) => matchesQuick(e, query.quick))
    if (query.search?.trim()) {
      const q = query.search.trim().toLowerCase()
      items = items.filter(
        (e) =>
          e.action.toLowerCase().includes(q) ||
          e.detail.toLowerCase().includes(q) ||
          e.actor.toLowerCase().includes(q) ||
          (e.recordRef?.toLowerCase().includes(q) ?? false),
      )
    }

    const page = query.page ?? 1
    const pageSize = query.pageSize ?? 20
    const start = (page - 1) * pageSize
    const slice = items.slice(start, start + pageSize)

    return simulateLatency({
      items: slice,
      total: items.length,
      page,
      pageSize,
    })
  },

  getModuleOptions() {
    return REPORTING_MODULES.map((m) => ({ value: m.id, label: m.label }))
  },
}
