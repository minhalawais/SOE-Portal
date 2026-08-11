/**
 * Phase 20 — Advanced Search & Intelligence Query mock service.
 * Filter-driven only; NL/AI search is future. Role scope enforced.
 */
import {
  ASSET_TYPE,
  COMPLIANCE_STATUS,
  DEMO_AS_OF_DATE,
  DOCUMENT_CATEGORY,
  SEARCH_DATASET,
  SEARCH_DATASET_LABEL,
  SEARCH_OPERATOR,
  type RoleId,
  type SearchDataset,
  type SearchOperator,
} from '@/constants'
import { deriveOrganizationMetrics } from '@/mock-data/derived'
import { db } from '@/mock-data/db'
import type { PagedResult } from '@/types/domain'
import { formatCurrencyPkr, simulateLatency } from '@/utils'
import { daysUntil } from '@/workflow/boardExpiry'
import { consecutiveLossYears } from '@/workflow/financeKpis'
import { hasPermission, PERMISSION } from '@/permissions'
import {
  getDatasetFields,
  getSavedPresetsForPortal,
  SAVED_SEARCH_PRESETS,
  type SavedSearchPreset,
  type SearchFieldDef,
} from '@/workflow/searchQueryRegistry'
import { paginate, sortByKey } from '@/mock-services/_helpers'

export type SearchPortal = 'soe' | 'moip' | 'secretary' | 'minister' | 'pmo'

export interface SearchCondition {
  field: string
  operator: SearchOperator
  value?: string | number | boolean | string[]
  valueTo?: string | number
}

export interface StructuredQuery {
  dataset: SearchDataset
  reportingPeriodId?: string
  logic?: 'and' | 'or'
  conditions: SearchCondition[]
  sortBy?: string
  sortDir?: 'asc' | 'desc'
  page?: number
  pageSize?: number
  columns?: string[]
}

export interface SearchScope {
  portal: SearchPortal
  role: RoleId
  organizationId?: string
}

export interface SearchResultRow {
  id: string
  dataset: SearchDataset
  organizationId: string
  organizationLabel: string
  title: string
  subtitle?: string
  periodLabel?: string
  status?: string
  primaryValue?: string
  /** Filterable field bag (sensitive keys omitted unless authorized) */
  fields: Record<string, string | number | boolean | null | undefined>
  href: string
}

export interface GlobalSearchHit {
  id: string
  dataset: SearchDataset
  title: string
  subtitle?: string
  organizationLabel?: string
  href: string
}

export interface QueryRunResult extends PagedResult<SearchResultRow> {
  dataset: SearchDataset
  reportingPeriodId: string
  periodLabel: string
  logic: 'and' | 'or'
  activeFilters: Array<{ field: string; operator: SearchOperator; display: string }>
  columns: string[]
  isZeroResult: boolean
  exportAvailable: false
  saveQueryAvailable: false
  note: string
}

export interface SearchService {
  globalSearch(
    q: string,
    scope: SearchScope,
    opts?: { limit?: number },
  ): Promise<GlobalSearchHit[]>
  runQuery(query: StructuredQuery, scope: SearchScope): Promise<QueryRunResult>
  getSavedPresets(portal: SearchPortal): Promise<SavedSearchPreset[]>
  getDatasetCatalogue(portal: SearchPortal): Promise<
    Array<{
      dataset: SearchDataset
      label: string
      fields: SearchFieldDef[]
    }>
  >
  getFilterOptions(scope: SearchScope): Promise<{
    organizations: Array<{ id: string; label: string }>
    sectors: string[]
    provinces: string[]
    periods: Array<{ id: string; label: string }>
  }>
}

type IndexRow = SearchResultRow & { _sort: Record<string, unknown> }

function periodLabel(id: string) {
  return db.reportingPeriods.find((p) => p.id === id)?.label ?? id
}

function annualOrder(): string[] {
  return db.reportingPeriods
    .filter((p) => p.type === 'annual')
    .sort((a, b) => a.startDate.localeCompare(b.startDate))
    .map((p) => p.id)
}

function orgLabel(orgId: string) {
  const o = db.organizations.find((x) => x.id === orgId)
  return o?.abbreviation ?? orgId
}

function scopedOrgIds(scope: SearchScope): Set<string> | null {
  if (scope.portal === 'soe') {
    return new Set([scope.organizationId ?? ''].filter(Boolean))
  }
  // Portfolio portals: all orgs (authorized portfolio in prototype)
  return null
}

function canReadSensitive(role: RoleId) {
  return (
    hasPermission(role, PERMISSION.SENSITIVE_PERSONAL_READ) ||
    hasPermission(role, PERMISSION.SENSITIVE_REMUNERATION_READ)
  )
}

function hrefFor(
  portal: SearchPortal,
  dataset: SearchDataset,
  id: string,
  organizationId: string,
): string {
  switch (portal) {
    case 'soe':
      if (dataset === SEARCH_DATASET.ASSETS) return `/soe/assets/${id}`
      if (dataset === SEARCH_DATASET.BOARD_MEMBERS) return `/soe/people/board/${id}`
      if (dataset === SEARCH_DATASET.LOANS) return `/soe/finance/loans/${id}`
      if (dataset === SEARCH_DATASET.AUDIT_PARAS)
        return `/soe/accountability/audit/paras/${id}`
      if (dataset === SEARCH_DATASET.LITIGATION)
        return `/soe/accountability/litigation/${id}`
      if (dataset === SEARCH_DATASET.COMPLIANCE) return `/soe/accountability/compliance`
      if (dataset === SEARCH_DATASET.PRIVATIZATION) return `/soe/privatization`
      if (dataset === SEARCH_DATASET.DOCUMENTS) return `/soe/documents`
      if (dataset === SEARCH_DATASET.FINANCIAL_PERFORMANCE) return `/soe/finance/performance`
      if (dataset === SEARCH_DATASET.PROCUREMENT)
        return `/soe/accountability/procurement/${id}`
      return `/soe/enterprise/profile`
    case 'moip':
      if (dataset === SEARCH_DATASET.ASSETS) return `/moip/assets/${id}`
      if (dataset === SEARCH_DATASET.BOARD_MEMBERS) return `/moip/governance`
      if (dataset === SEARCH_DATASET.AUDIT_PARAS) return `/moip/audit-compliance`
      if (dataset === SEARCH_DATASET.LITIGATION) return `/moip/audit-compliance`
      if (dataset === SEARCH_DATASET.LOANS) return `/moip/finance`
      if (dataset === SEARCH_DATASET.FINANCIAL_PERFORMANCE) return `/moip/finance`
      if (dataset === SEARCH_DATASET.PRIVATIZATION) return `/moip/privatization`
      if (dataset === SEARCH_DATASET.DOCUMENTS) return `/moip/documents`
      if (dataset === SEARCH_DATASET.ORGANIZATIONS)
        return `/moip/enterprise?soe=${organizationId}`
      return `/moip/portfolio?soe=${organizationId}`
    case 'minister':
      if (dataset === SEARCH_DATASET.ASSETS) return `/minister/assets/${id}`
      if (dataset === SEARCH_DATASET.BOARD_MEMBERS) return `/minister/governance`
      if (dataset === SEARCH_DATASET.AUDIT_PARAS || dataset === SEARCH_DATASET.LITIGATION)
        return `/minister/audit-legal`
      if (dataset === SEARCH_DATASET.FINANCIAL_PERFORMANCE || dataset === SEARCH_DATASET.LOANS)
        return `/minister/fiscal`
      if (dataset === SEARCH_DATASET.PRIVATIZATION) return `/minister/privatization`
      return `/minister/portfolio?soe=${organizationId}`
    case 'secretary':
      if (dataset === SEARCH_DATASET.BOARD_MEMBERS) return `/secretary/governance`
      if (dataset === SEARCH_DATASET.AUDIT_PARAS || dataset === SEARCH_DATASET.LITIGATION)
        return `/secretary/audit-legal`
      if (dataset === SEARCH_DATASET.LOANS || dataset === SEARCH_DATASET.FINANCIAL_PERFORMANCE)
        return `/secretary/finance`
      if (dataset === SEARCH_DATASET.COMPLIANCE) return `/secretary/compliance`
      return `/secretary/dashboard`
    case 'pmo':
      if (dataset === SEARCH_DATASET.ASSETS) return `/pmo/land-bank`
      if (dataset === SEARCH_DATASET.PRIVATIZATION) return `/pmo/privatization`
      if (dataset === SEARCH_DATASET.FINANCIAL_PERFORMANCE) return `/pmo/fiscal-burden`
      return `/pmo/dashboard`
    default:
      return '/'
  }
}

function matchCondition(
  fields: Record<string, string | number | boolean | null | undefined>,
  c: SearchCondition,
): boolean {
  const raw = fields[c.field]
  const op = c.operator

  if (op === SEARCH_OPERATOR.IS_EMPTY) {
    return raw == null || raw === ''
  }
  if (op === SEARCH_OPERATOR.IS_NOT_EMPTY) {
    return raw != null && raw !== ''
  }

  if (op === SEARCH_OPERATOR.CONTAINS) {
    return String(raw ?? '')
      .toLowerCase()
      .includes(String(c.value ?? '').toLowerCase())
  }

  if (op === SEARCH_OPERATOR.IN) {
    const list = Array.isArray(c.value)
      ? c.value.map(String)
      : String(c.value ?? '')
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
    return list.includes(String(raw))
  }

  if (op === SEARCH_OPERATOR.BETWEEN) {
    if (raw == null || c.value == null || c.valueTo == null) return false
    const n = typeof raw === 'number' ? raw : Number(raw)
    if (!Number.isNaN(n) && typeof c.value === 'number') {
      return n >= Number(c.value) && n <= Number(c.valueTo)
    }
    const s = String(raw)
    return s >= String(c.value) && s <= String(c.valueTo)
  }

  if (op === SEARCH_OPERATOR.GT || op === SEARCH_OPERATOR.LT) {
    if (raw == null || c.value == null) return false
    const n = typeof raw === 'number' ? raw : Number(raw)
    const v = Number(c.value)
    if (!Number.isNaN(n) && !Number.isNaN(v)) {
      return op === SEARCH_OPERATOR.GT ? n > v : n < v
    }
    const s = String(raw)
    const vs = String(c.value)
    return op === SEARCH_OPERATOR.GT ? s > vs : s < vs
  }

  if (op === SEARCH_OPERATOR.BEFORE || op === SEARCH_OPERATOR.AFTER) {
    if (raw == null || c.value == null) return false
    const s = String(raw)
    const vs = String(c.value)
    return op === SEARCH_OPERATOR.BEFORE ? s < vs : s > vs
  }

  if (op === SEARCH_OPERATOR.NEQ) {
    if (typeof c.value === 'boolean') return Boolean(raw) !== c.value
    return String(raw) !== String(c.value)
  }

  // eq
  if (typeof c.value === 'boolean') return Boolean(raw) === c.value
  return String(raw) === String(c.value)
}

function evaluate(
  row: IndexRow,
  conditions: SearchCondition[],
  logic: 'and' | 'or',
): boolean {
  if (conditions.length === 0) return true
  if (logic === 'or') return conditions.some((c) => matchCondition(row.fields, c))
  return conditions.every((c) => matchCondition(row.fields, c))
}

function buildOrgIndex(
  reportingPeriodId: string,
  scope: SearchScope,
): IndexRow[] {
  const orgScope = scopedOrgIds(scope)
  const order = annualOrder()
  const idx = order.indexOf(reportingPeriodId)
  const slice = idx >= 0 ? order.slice(0, idx + 1) : [reportingPeriodId]

  return db.organizations
    .filter((o) => !orgScope || orgScope.has(o.id))
    .map((o) => {
      const metrics = deriveOrganizationMetrics(o.id, reportingPeriodId)
      const losses = consecutiveLossYears(
        db.financialMetrics.filter((m) => m.organizationId === o.id),
        slice,
      )
      const missingAnnualReport = !db.documents.some(
        (d) =>
          d.organizationId === o.id && d.category === DOCUMENT_CATEGORY.ANNUAL_REPORTS,
      )
      const fields: SearchResultRow['fields'] = {
        name: o.name,
        abbreviation: o.abbreviation,
        sector: o.sector,
        status: o.status,
        consecutiveLossYears: losses,
        capacityUtilization: metrics.capacityUtilization ?? null,
        missingAnnualReport,
        overdueComplianceCount: metrics.overdueComplianceCount,
        organizationId: o.id,
      }
      return {
        id: o.id,
        dataset: SEARCH_DATASET.ORGANIZATIONS,
        organizationId: o.id,
        organizationLabel: o.abbreviation,
        title: o.name,
        subtitle: o.sector,
        status: o.status,
        primaryValue:
          losses > 0 ? `${losses} consecutive loss year(s)` : o.status,
        fields,
        href: hrefFor(scope.portal, SEARCH_DATASET.ORGANIZATIONS, o.id, o.id),
        _sort: { ...fields },
      }
    })
}

function buildAssetIndex(scope: SearchScope): IndexRow[] {
  const orgScope = scopedOrgIds(scope)
  return db.assets
    .filter((a) => !orgScope || orgScope.has(a.organizationId))
    .map((a) => {
      const fields: SearchResultRow['fields'] = {
        id: a.id,
        name: a.name,
        organizationId: a.organizationId,
        assetType: a.assetType,
        province: a.province ?? null,
        district: a.district ?? null,
        areaAcres: a.areaAcres ?? null,
        utilizationStatus: a.utilizationStatus ?? null,
        encroachmentStatus: a.encroachmentStatus ?? null,
        litigationStatus: a.litigationStatus ?? null,
        occupancyStatus: a.occupancyStatus ?? null,
        bookValue: a.bookValue ?? null,
      }
      return {
        id: a.id,
        dataset: SEARCH_DATASET.ASSETS,
        organizationId: a.organizationId,
        organizationLabel: orgLabel(a.organizationId),
        title: a.name,
        subtitle: `${a.assetType}${a.province ? ` · ${a.province}` : ''}`,
        status: a.litigationStatus ?? a.utilizationStatus,
        primaryValue:
          a.areaAcres != null ? `${a.areaAcres} acres` : a.assetType,
        fields,
        href: hrefFor(scope.portal, SEARCH_DATASET.ASSETS, a.id, a.organizationId),
        _sort: { ...fields },
      }
    })
}

function buildBoardIndex(scope: SearchScope): IndexRow[] {
  const orgScope = scopedOrgIds(scope)
  const sensitive = canReadSensitive(scope.role)
  return db.boardMembers
    .filter((b) => !orgScope || orgScope.has(b.organizationId))
    .map((b) => {
      const days = daysUntil(b.expiryDate, DEMO_AS_OF_DATE)
      const fields: SearchResultRow['fields'] = {
        name: b.name,
        role: b.role,
        organizationId: b.organizationId,
        expiryDate: b.expiryDate,
        daysToExpiry: days,
        isVacancySlot: Boolean(b.isVacancySlot),
        status: b.status,
      }
      if (sensitive) fields.cnic = b.cnic ?? null
      return {
        id: b.id,
        dataset: SEARCH_DATASET.BOARD_MEMBERS,
        organizationId: b.organizationId,
        organizationLabel: orgLabel(b.organizationId),
        title: b.isVacancySlot ? `Vacancy — ${b.role}` : b.name,
        subtitle: b.role,
        status: b.status,
        primaryValue: `Expires ${b.expiryDate} (${days}d)`,
        fields,
        href: hrefFor(
          scope.portal,
          SEARCH_DATASET.BOARD_MEMBERS,
          b.id,
          b.organizationId,
        ),
        _sort: { ...fields },
      }
    })
}

function buildFinanceIndex(reportingPeriodId: string, scope: SearchScope): IndexRow[] {
  const orgScope = scopedOrgIds(scope)
  return db.financialMetrics
    .filter(
      (f) =>
        f.reportingPeriodId === reportingPeriodId &&
        (!orgScope || orgScope.has(f.organizationId)),
    )
    .map((f) => {
      const org = db.organizations.find((o) => o.id === f.organizationId)
      const fields: SearchResultRow['fields'] = {
        organizationId: f.organizationId,
        sector: org?.sector ?? null,
        reportingPeriodId: f.reportingPeriodId,
        profitOrLoss: f.profitOrLoss,
        revenue: f.revenue,
        totalDebt: f.totalDebt ?? null,
        subsidies: f.subsidies,
        status: f.status,
      }
      return {
        id: f.id,
        dataset: SEARCH_DATASET.FINANCIAL_PERFORMANCE,
        organizationId: f.organizationId,
        organizationLabel: orgLabel(f.organizationId),
        title: `${orgLabel(f.organizationId)} — ${periodLabel(f.reportingPeriodId)}`,
        subtitle: org?.sector,
        periodLabel: periodLabel(f.reportingPeriodId),
        status: f.status,
        primaryValue: `P/L ${formatCurrencyPkr(f.profitOrLoss)}`,
        fields,
        href: hrefFor(
          scope.portal,
          SEARCH_DATASET.FINANCIAL_PERFORMANCE,
          f.id,
          f.organizationId,
        ),
        _sort: { ...fields },
      }
    })
}

function buildLoanIndex(scope: SearchScope): IndexRow[] {
  const orgScope = scopedOrgIds(scope)
  return db.loans
    .filter((l) => !orgScope || orgScope.has(l.organizationId))
    .map((l) => {
      const fields: SearchResultRow['fields'] = {
        organizationId: l.organizationId,
        lender: l.lender,
        outstanding: l.outstanding,
        repaymentStatus: l.repaymentStatus,
        nextDueDate: l.nextDueDate,
        defaultStatus: l.defaultStatus,
      }
      return {
        id: l.id,
        dataset: SEARCH_DATASET.LOANS,
        organizationId: l.organizationId,
        organizationLabel: orgLabel(l.organizationId),
        title: `${l.lender} — ${orgLabel(l.organizationId)}`,
        subtitle: l.loanType,
        status: l.repaymentStatus,
        primaryValue: `Outstanding ${formatCurrencyPkr(l.outstanding)}`,
        fields,
        href: hrefFor(scope.portal, SEARCH_DATASET.LOANS, l.id, l.organizationId),
        _sort: { ...fields },
      }
    })
}

function buildProcurementIndex(scope: SearchScope): IndexRow[] {
  const orgScope = scopedOrgIds(scope)
  return db.procurement
    .filter((p) => !orgScope || orgScope.has(p.organizationId))
    .map((p) => {
      const fields: SearchResultRow['fields'] = {
        organizationId: p.organizationId,
        title: p.title,
        estimatedValue: p.value,
        status: p.contractStatus,
      }
      return {
        id: p.id,
        dataset: SEARCH_DATASET.PROCUREMENT,
        organizationId: p.organizationId,
        organizationLabel: orgLabel(p.organizationId),
        title: p.title,
        status: p.contractStatus,
        primaryValue: formatCurrencyPkr(p.value),
        fields,
        href: hrefFor(scope.portal, SEARCH_DATASET.PROCUREMENT, p.id, p.organizationId),
        _sort: { ...fields },
      }
    })
}

function buildAuditIndex(scope: SearchScope): IndexRow[] {
  const orgScope = scopedOrgIds(scope)
  return db.auditParas
    .filter((a) => !orgScope || orgScope.has(a.organizationId))
    .map((a) => {
      const fields: SearchResultRow['fields'] = {
        id: a.id,
        organizationId: a.organizationId,
        title: a.title,
        amountInvolved: a.amountInvolved,
        status: a.status,
        dateRaised: a.dateRaised,
      }
      return {
        id: a.id,
        dataset: SEARCH_DATASET.AUDIT_PARAS,
        organizationId: a.organizationId,
        organizationLabel: orgLabel(a.organizationId),
        title: a.title,
        subtitle: a.id,
        status: a.status,
        primaryValue: formatCurrencyPkr(a.amountInvolved),
        fields,
        href: hrefFor(scope.portal, SEARCH_DATASET.AUDIT_PARAS, a.id, a.organizationId),
        _sort: { ...fields },
      }
    })
}

function buildLitigationIndex(scope: SearchScope): IndexRow[] {
  const orgScope = scopedOrgIds(scope)
  return db.litigation
    .filter((l) => !orgScope || orgScope.has(l.organizationId))
    .map((l) => {
      const title = `${l.nature} — ${l.caseNumber}`
      const fields: SearchResultRow['fields'] = {
        organizationId: l.organizationId,
        caseNumber: l.caseNumber,
        title,
        status: l.status,
        amountInvolved: l.amountInvolved ?? null,
        nextHearing: l.nextHearing ?? null,
      }
      return {
        id: l.id,
        dataset: SEARCH_DATASET.LITIGATION,
        organizationId: l.organizationId,
        organizationLabel: orgLabel(l.organizationId),
        title,
        subtitle: l.court,
        status: l.status,
        primaryValue: l.caseNumber,
        fields,
        href: hrefFor(scope.portal, SEARCH_DATASET.LITIGATION, l.id, l.organizationId),
        _sort: { ...fields },
      }
    })
}

function buildComplianceIndex(scope: SearchScope): IndexRow[] {
  const orgScope = scopedOrgIds(scope)
  return db.compliance
    .filter((c) => !orgScope || orgScope.has(c.organizationId))
    .map((c) => {
      const overdue =
        c.status === COMPLIANCE_STATUS.NON_COMPLIANT ||
        daysUntil(c.dueDate, DEMO_AS_OF_DATE) < 0
      const fields: SearchResultRow['fields'] = {
        organizationId: c.organizationId,
        title: c.area,
        status: c.status,
        dueDate: c.dueDate,
        isOverdue: overdue,
      }
      return {
        id: c.id,
        dataset: SEARCH_DATASET.COMPLIANCE,
        organizationId: c.organizationId,
        organizationLabel: orgLabel(c.organizationId),
        title: c.area,
        status: c.status,
        primaryValue: overdue ? 'Overdue' : c.status,
        fields,
        href: hrefFor(scope.portal, SEARCH_DATASET.COMPLIANCE, c.id, c.organizationId),
        _sort: { ...fields },
      }
    })
}

function buildPrivatizationIndex(scope: SearchScope): IndexRow[] {
  const orgScope = scopedOrgIds(scope)
  return db.privatizationCases
    .filter((p) => !orgScope || orgScope.has(p.organizationId))
    .map((p) => {
      const title = `${orgLabel(p.organizationId)} privatization`
      const fields: SearchResultRow['fields'] = {
        organizationId: p.organizationId,
        title,
        currentStage: p.currentStage,
        status: p.status,
      }
      return {
        id: p.id,
        dataset: SEARCH_DATASET.PRIVATIZATION,
        organizationId: p.organizationId,
        organizationLabel: orgLabel(p.organizationId),
        title,
        status: p.status,
        primaryValue: p.currentStage,
        fields,
        href: hrefFor(
          scope.portal,
          SEARCH_DATASET.PRIVATIZATION,
          p.id,
          p.organizationId,
        ),
        _sort: { ...fields },
      }
    })
}

function buildDocumentIndex(scope: SearchScope): IndexRow[] {
  const orgScope = scopedOrgIds(scope)
  return db.documents
    .filter((d) => {
      if (orgScope && !orgScope.has(d.organizationId)) return false
      // Restricted/sensitive docs: hide from global portfolio unless SOE ops with doc read
      if (d.isSensitive || d.isRestricted) {
        if (scope.portal !== 'soe') return false
      }
      return true
    })
    .map((d) => {
      const fields: SearchResultRow['fields'] = {
        organizationId: d.organizationId,
        title: d.title,
        category: d.category,
        evidenceStatus: d.evidenceStatus ?? d.status,
        reportingPeriodId: d.reportingPeriodId ?? null,
      }
      return {
        id: d.id,
        dataset: SEARCH_DATASET.DOCUMENTS,
        organizationId: d.organizationId,
        organizationLabel: orgLabel(d.organizationId),
        title: d.title,
        subtitle: d.category,
        periodLabel: d.reportingPeriodId
          ? periodLabel(d.reportingPeriodId)
          : undefined,
        status: String(d.evidenceStatus ?? d.status),
        primaryValue: d.fileName,
        fields,
        href: hrefFor(scope.portal, SEARCH_DATASET.DOCUMENTS, d.id, d.organizationId),
        _sort: { ...fields },
      }
    })
}

function indexFor(
  dataset: SearchDataset,
  reportingPeriodId: string,
  scope: SearchScope,
): IndexRow[] {
  switch (dataset) {
    case SEARCH_DATASET.ORGANIZATIONS:
      return buildOrgIndex(reportingPeriodId, scope)
    case SEARCH_DATASET.ASSETS:
      return buildAssetIndex(scope)
    case SEARCH_DATASET.BOARD_MEMBERS:
      return buildBoardIndex(scope)
    case SEARCH_DATASET.FINANCIAL_PERFORMANCE:
      return buildFinanceIndex(reportingPeriodId, scope)
    case SEARCH_DATASET.LOANS:
      return buildLoanIndex(scope)
    case SEARCH_DATASET.PROCUREMENT:
      return buildProcurementIndex(scope)
    case SEARCH_DATASET.AUDIT_PARAS:
      return buildAuditIndex(scope)
    case SEARCH_DATASET.LITIGATION:
      return buildLitigationIndex(scope)
    case SEARCH_DATASET.COMPLIANCE:
      return buildComplianceIndex(scope)
    case SEARCH_DATASET.PRIVATIZATION:
      return buildPrivatizationIndex(scope)
    case SEARCH_DATASET.DOCUMENTS:
      return buildDocumentIndex(scope)
    default:
      return []
  }
}

function stripSensitiveFromConditions(
  conditions: SearchCondition[],
  dataset: SearchDataset,
  role: RoleId,
): SearchCondition[] {
  if (canReadSensitive(role)) return conditions
  const sensitiveKeys = new Set(
    getDatasetFields(dataset).filter((f) => f.sensitive).map((f) => f.key),
  )
  return conditions.filter((c) => !sensitiveKeys.has(c.field))
}

function conditionDisplay(c: SearchCondition): string {
  const v =
    c.value === undefined
      ? ''
      : Array.isArray(c.value)
        ? c.value.join(', ')
        : String(c.value)
  const to = c.valueTo != null ? ` … ${c.valueTo}` : ''
  return `${c.field} ${c.operator} ${v}${to}`.trim()
}

export const mockSearchService: SearchService = {
  async globalSearch(q, scope, opts) {
    const term = q.trim().toLowerCase()
    if (term.length < 2) return simulateLatency([])
    const limit = opts?.limit ?? 25
    const period =
      db.reportingPeriods.find((p) => p.id === 'period-fy2027')?.id ?? 'period-fy2027'
    const datasets: SearchDataset[] = [
      SEARCH_DATASET.ORGANIZATIONS,
      SEARCH_DATASET.ASSETS,
      SEARCH_DATASET.BOARD_MEMBERS,
      SEARCH_DATASET.AUDIT_PARAS,
      SEARCH_DATASET.LITIGATION,
      SEARCH_DATASET.DOCUMENTS,
      SEARCH_DATASET.LOANS,
    ]
    const hits: GlobalSearchHit[] = []
    for (const ds of datasets) {
      const rows = indexFor(ds, period, scope)
      for (const r of rows) {
        const hay = [
          r.title,
          r.subtitle,
          r.id,
          r.organizationLabel,
          r.fields.caseNumber,
          r.fields.id,
          r.primaryValue,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        if (hay.includes(term)) {
          hits.push({
            id: r.id,
            dataset: r.dataset,
            title: r.title,
            subtitle: r.subtitle,
            organizationLabel: r.organizationLabel,
            href: r.href,
          })
        }
        if (hits.length >= limit) break
      }
      if (hits.length >= limit) break
    }
    return simulateLatency(hits.slice(0, limit))
  },

  async runQuery(query, scope) {
    const reportingPeriodId = query.reportingPeriodId ?? 'period-fy2027'
    const logic = query.logic ?? 'and'
    const conditions = stripSensitiveFromConditions(
      query.conditions ?? [],
      query.dataset,
      scope.role,
    )
    let rows = indexFor(query.dataset, reportingPeriodId, scope)
    rows = rows.filter((r) => evaluate(r, conditions, logic))

    const sortBy = query.sortBy
    if (sortBy) {
      rows = sortByKey(
        rows.map((r) => ({ ...r, ...r._sort })) as Array<Record<string, unknown> & IndexRow>,
        sortBy,
        query.sortDir ?? 'asc',
      ) as IndexRow[]
    }

    const fieldDefs = getDatasetFields(query.dataset).filter(
      (f) => !f.sensitive || canReadSensitive(scope.role),
    )
    const columns =
      query.columns?.length
        ? query.columns
        : ['organizationLabel', 'title', 'status', 'primaryValue', ...fieldDefs.slice(0, 3).map((f) => f.key)]

    const page = paginate(
      rows.map(({ _sort: _, ...rest }) => rest),
      { page: query.page ?? 1, pageSize: query.pageSize ?? 20 },
    )

    return simulateLatency({
      ...page,
      dataset: query.dataset,
      reportingPeriodId,
      periodLabel: periodLabel(reportingPeriodId),
      logic,
      activeFilters: conditions.map((c) => ({
        field: c.field,
        operator: c.operator,
        display: conditionDisplay(c),
      })),
      columns,
      isZeroResult: page.total === 0,
      exportAvailable: false,
      saveQueryAvailable: false,
      note: 'Structured filter query over prototype fixtures. Export / save-query are placeholders.',
    })
  },

  async getSavedPresets(portal) {
    return simulateLatency(getSavedPresetsForPortal(portal))
  },

  async getDatasetCatalogue(portal) {
    void portal
    const sensitiveOk = false // catalogue still lists sensitive fields but UI must gate values
    return simulateLatency(
      (Object.values(SEARCH_DATASET) as SearchDataset[]).map((dataset) => ({
        dataset,
        label: SEARCH_DATASET_LABEL[dataset],
        fields: getDatasetFields(dataset).map((f) =>
          f.sensitive && !sensitiveOk
            ? { ...f, label: `${f.label} (restricted)` }
            : f,
        ),
      })),
    )
  },

  async getFilterOptions(scope) {
    const orgScope = scopedOrgIds(scope)
    const orgs = db.organizations
      .filter((o) => !orgScope || orgScope.has(o.id))
      .map((o) => ({ id: o.id, label: o.abbreviation }))
      .sort((a, b) => a.label.localeCompare(b.label))
    const sectors = [...new Set(db.organizations.map((o) => o.sector))].sort()
    const provinces = [
      ...new Set(db.assets.map((a) => a.province).filter(Boolean) as string[]),
    ].sort()
    const periods = db.reportingPeriods
      .filter((p) => p.type === 'annual')
      .sort((a, b) => b.startDate.localeCompare(a.startDate))
      .map((p) => ({ id: p.id, label: p.label }))
    return simulateLatency({ organizations: orgs, sectors, provinces, periods })
  },
}

/** Test helper — all roadmap presets */
export function listAllSavedPresets() {
  return SAVED_SEARCH_PRESETS
}

/** Ensure land type constant available for callers */
export const SEARCH_LAND_TYPE = ASSET_TYPE.LAND
