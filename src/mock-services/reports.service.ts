/**
 * Phase 21 — Reports & Executive Briefings mock service.
 * Preview content reconciles to fixtures; PDF/Excel are simulated only.
 */
import {
  ASSET_LITIGATION_STATUS,
  ASSET_TYPE,
  ASSET_UTILIZATION,
  COMPLIANCE_STATUS,
  DECLARATION_STATUS,
  DEMO_AS_OF_DATE,
  ENCROACHMENT_STATUS,
  REPORT_DATA_STATUS,
  REPORT_EXPORT_FORMAT,
  REPORT_GROUP_LABEL,
  REPORT_ID,
  SUBMISSION_STATUS,
  type ReportDataStatus,
  type ReportExportFormat,
  type ReportId,
} from '@/constants'
import { deriveOrganizationMetrics } from '@/mock-data/derived'
import { db } from '@/mock-data/db'
import { formatCurrencyPkr, simulateLatency, simulateMutation } from '@/utils'
import { daysUntil } from '@/workflow/boardExpiry'
import { isImmutableStatus } from '@/workflow/submission'
import {
  getReportDefinition,
  listReportsForPortal,
  reportsByGroup,
  type ReportDefinition,
  type ReportPortal,
} from '@/workflow/reportCatalogue'

export interface ReportParams {
  reportingPeriodId?: string
  organizationId?: string
  sector?: string
  province?: string
  /** When true, finance figures prefer approved/locked only */
  approvedOnly?: boolean
}

export interface ReportCatalogueItem extends ReportDefinition {
  groupLabel: string
  latestPeriodLabel: string
  filterSummary: string
}

export interface ReportSection {
  id: string
  title: string
  summary?: string
  kpis?: Array<{ label: string; value: string; href?: string }>
  columns?: string[]
  rows?: Array<Record<string, string | number>>
  bullets?: string[]
  /** Cabinet-style narrative blocks */
  issues?: Array<{
    keyIssue: string
    evidence: string
    strategicImplication: string
    decisionPlaceholder: string
  }>
  empty?: boolean
  lineageHref?: string
}

export interface ReportPreview {
  reportId: ReportId
  title: string
  audience: string
  generatedAt: string
  reportingPeriodId: string
  periodLabel: string
  scopeLabel: string
  dataStatus: ReportDataStatus
  dataStatusNote: string
  sections: ReportSection[]
  briefStyle: boolean
  isPrototype: true
  methodologyNote: string
}

export interface MockExportResult {
  jobId: string
  format: ReportExportFormat
  fileName: string
  status: 'completed'
  message: string
  generatedAt: string
}

export interface ReportsService {
  listCatalogue(portal: ReportPortal, params?: ReportParams): Promise<ReportCatalogueItem[]>
  getCatalogueGrouped(portal: ReportPortal, params?: ReportParams): Promise<
    Array<{ group: string; label: string; items: ReportCatalogueItem[] }>
  >
  getPreview(
    reportId: ReportId,
    portal: ReportPortal,
    params?: ReportParams,
  ): Promise<ReportPreview>
  exportReport(
    reportId: ReportId,
    format: ReportExportFormat,
    portal: ReportPortal,
    params?: ReportParams,
  ): Promise<MockExportResult>
  getFilterOptions(portal: ReportPortal, organizationId?: string): Promise<{
    periods: Array<{ id: string; label: string }>
    organizations: Array<{ id: string; label: string }>
    sectors: string[]
    provinces: string[]
  }>
}

const METHODOLOGY =
  'Prototype report preview for stakeholder validation — not a production reporting service.'

function periodId(p?: ReportParams) {
  return p?.reportingPeriodId ?? 'period-fy2027'
}

function periodLabel(id: string) {
  return db.reportingPeriods.find((x) => x.id === id)?.label ?? id
}

function orgLabel(id: string) {
  return db.organizations.find((o) => o.id === id)?.abbreviation ?? id
}

function filterOrgs(params?: ReportParams, portal?: ReportPortal, forceOrg?: string) {
  let orgs = [...db.organizations]
  if (portal === 'soe' || forceOrg) {
    const oid = forceOrg ?? params?.organizationId
    orgs = orgs.filter((o) => o.id === oid)
  } else {
    if (params?.organizationId) orgs = orgs.filter((o) => o.id === params.organizationId)
    if (params?.sector) orgs = orgs.filter((o) => o.sector === params.sector)
  }
  return orgs
}

function financeFor(orgId: string, reportingPeriodId: string, approvedOnly?: boolean) {
  const row = db.financialMetrics.find(
    (f) => f.organizationId === orgId && f.reportingPeriodId === reportingPeriodId,
  )
  if (!row) return undefined
  if (approvedOnly && !isImmutableStatus(row.status as typeof SUBMISSION_STATUS.APPROVED)) {
    return undefined
  }
  return row
}

function scopeLabel(params: ReportParams | undefined, portal: ReportPortal, orgs: { abbreviation: string }[]) {
  if (portal === 'soe' || params?.organizationId) {
    return params?.organizationId
      ? `SOE · ${orgLabel(params.organizationId)}`
      : 'SOE · current organization'
  }
  if (params?.sector) return `Sector · ${params.sector}`
  if (params?.province) return `Province · ${params.province}`
  return `Portfolio · ${orgs.length} SOE(s)`
}

function dataStatusFor(
  orgs: { id: string }[],
  reportingPeriodId: string,
  approvedOnly?: boolean,
): { status: ReportDataStatus; note: string } {
  const fins = orgs
    .map((o) =>
      db.financialMetrics.find(
        (f) => f.organizationId === o.id && f.reportingPeriodId === reportingPeriodId,
      ),
    )
    .filter(Boolean)
  if (fins.length === 0) {
    return {
      status: REPORT_DATA_STATUS.PROTOTYPE,
      note: 'No finance rows in scope for this period — other domains from fixtures.',
    }
  }
  const approved = fins.filter((f) =>
    isImmutableStatus(f!.status as typeof SUBMISSION_STATUS.APPROVED),
  ).length
  if (approvedOnly) {
    return {
      status: REPORT_DATA_STATUS.APPROVED,
      note: 'Finance figures limited to approved/locked submissions where available.',
    }
  }
  if (approved === fins.length) {
    return {
      status: REPORT_DATA_STATUS.APPROVED,
      note: 'All finance rows in scope are approved or locked.',
    }
  }
  if (approved === 0) {
    return {
      status: REPORT_DATA_STATUS.PROTOTYPE,
      note: 'Finance rows in scope are not yet approved/locked — labeled prototype.',
    }
  }
  return {
    status: REPORT_DATA_STATUS.PROTOTYPE_MIXED,
    note: `${approved}/${fins.length} finance rows approved/locked; remainder shown as prototype.`,
  }
}

function sectionEmpty(title: string, id: string, summary: string): ReportSection {
  return { id, title, summary, empty: true, bullets: [summary] }
}

function buildSoeProfile(
  orgId: string,
  reportingPeriodId: string,
  approvedOnly?: boolean,
): ReportSection[] {
  const org = db.organizations.find((o) => o.id === orgId)
  if (!org) return [sectionEmpty('Identity', 'id', 'Organization not found.')]
  const m = deriveOrganizationMetrics(orgId, reportingPeriodId)
  const fin = financeFor(orgId, reportingPeriodId, approvedOnly)
  const industrial = db.industrialPerformance.find(
    (i) => i.organizationId === orgId && i.reportingPeriodId === reportingPeriodId,
  )
  const ownership = db.ownershipLines.filter((o) => o.organizationId === orgId)
  const board = db.boardMembers.filter((b) => b.organizationId === orgId && !b.isVacancySlot)
  const priv = db.privatizationCases.find((p) => p.organizationId === orgId)
  const workforce = db.employees.filter((e) => e.organizationId === orgId).length

  return [
    {
      id: 'identity',
      title: 'Identity',
      kpis: [
        { label: 'Legal status', value: org.legalStatus },
        { label: 'Sector', value: org.sector },
        { label: 'Status', value: org.status },
        { label: 'Gov. ownership', value: `${org.governmentOwnershipPct ?? '—'}%` },
      ],
      lineageHref: `/moip/enterprise?soe=${orgId}`,
    },
    {
      id: 'ownership',
      title: 'Ownership',
      columns: ['Shareholder', 'Category', '%'],
      rows: ownership.slice(0, 12).map((o) => ({
        Shareholder: o.holderName,
        Category: o.category,
        '%': o.percentage,
      })),
      empty: ownership.length === 0,
      summary: ownership.length === 0 ? 'No ownership rows.' : undefined,
    },
    {
      id: 'assets',
      title: 'Assets summary',
      kpis: [
        { label: 'Asset count', value: String(m.assetCount) },
        { label: 'Book value', value: formatCurrencyPkr(m.totalBookValue) },
        { label: 'Market value', value: formatCurrencyPkr(m.totalMarketValue) },
      ],
      lineageHref: `/moip/assets?soe=${orgId}`,
    },
    {
      id: 'workforce',
      title: 'Workforce',
      kpis: [{ label: 'Headcount (fixtures)', value: String(workforce) }],
    },
    {
      id: 'board',
      title: 'Board',
      kpis: [
        { label: 'Sitting members', value: String(board.length) },
        { label: 'Vacancies', value: String(m.boardVacancies) },
        { label: 'Expiring ≤90d', value: String(m.boardExpiringSoon) },
      ],
      lineageHref: `/moip/governance?soe=${orgId}`,
    },
    {
      id: 'finance',
      title: 'Financial snapshot',
      summary: fin
        ? `Submission status: ${fin.status}`
        : 'No eligible finance row for parameters.',
      empty: !fin,
      kpis: fin
        ? [
            { label: 'Revenue', value: formatCurrencyPkr(fin.revenue) },
            { label: 'Profit / Loss', value: formatCurrencyPkr(fin.profitOrLoss) },
            { label: 'Debt', value: formatCurrencyPkr(fin.totalDebt ?? 0) },
            { label: 'Subsidies', value: formatCurrencyPkr(fin.subsidies) },
          ]
        : undefined,
      lineageHref: `/moip/finance?soe=${orgId}`,
    },
    {
      id: 'audit-legal',
      title: 'Audit / Legal',
      kpis: [
        { label: 'Open audit paras', value: String(m.openAuditCount) },
        { label: 'Active litigation', value: String(m.activeLitigationCount) },
      ],
    },
    {
      id: 'compliance',
      title: 'Compliance',
      kpis: [
        { label: 'Overdue / non-compliant', value: String(m.overdueComplianceCount) },
      ],
    },
    {
      id: 'industrial',
      title: 'Industrial performance',
      empty: !industrial,
      summary: industrial ? undefined : 'No industrial row for period.',
      kpis: industrial
        ? [
            { label: 'Capacity utilization', value: `${industrial.capacityUtilization}%` },
            { label: 'Exports', value: formatCurrencyPkr(industrial.exports) },
            { label: 'Employment', value: String(industrial.employment) },
          ]
        : undefined,
    },
    {
      id: 'privatization',
      title: 'Privatization status',
      empty: !priv,
      summary: priv ? undefined : 'Not in privatization pipeline.',
      kpis: priv
        ? [
            { label: 'Stage', value: priv.currentStage },
            { label: 'Status', value: priv.status },
            { label: 'Next action', value: priv.nextAction ?? '—' },
          ]
        : undefined,
    },
  ]
}

function buildPortfolio(orgIds: string[], reportingPeriodId: string, approvedOnly?: boolean): ReportSection[] {
  const orgs = db.organizations.filter((o) => orgIds.includes(o.id))
  let revenue = 0
  let pl = 0
  let subsidies = 0
  let debt = 0
  let approvedCount = 0
  for (const o of orgs) {
    const fin = financeFor(o.id, reportingPeriodId, approvedOnly)
    if (!fin) continue
    if (isImmutableStatus(fin.status as typeof SUBMISSION_STATUS.APPROVED)) approvedCount += 1
    revenue += fin.revenue
    pl += fin.profitOrLoss
    subsidies += fin.subsidies
    debt += fin.totalDebt ?? 0
  }
  const metrics = orgs.map((o) => deriveOrganizationMetrics(o.id, reportingPeriodId))
  const assets = metrics.reduce((s, m) => s + m.assetCount, 0)
  const book = metrics.reduce((s, m) => s + m.totalBookValue, 0)
  const openAudit = metrics.reduce((s, m) => s + m.openAuditCount, 0)
  const litigation = metrics.reduce((s, m) => s + m.activeLitigationCount, 0)
  const vacancies = metrics.reduce((s, m) => s + m.boardVacancies, 0)

  return [
    {
      id: 'composition',
      title: 'Portfolio composition',
      kpis: [
        { label: 'SOEs in scope', value: String(orgs.length) },
        { label: 'Sectors', value: String(new Set(orgs.map((o) => o.sector)).size) },
        {
          label: 'Under privatization',
          value: String(orgs.filter((o) => o.status === 'under_privatization').length),
        },
      ],
      columns: ['SOE', 'Sector', 'Status'],
      rows: orgs.map((o) => ({
        SOE: o.abbreviation,
        Sector: o.sector,
        Status: o.status,
      })),
    },
    {
      id: 'finance',
      title: 'Financial performance',
      summary: `Finance rows used: ${approvedOnly ? 'approved/locked only' : 'period fixtures'}; ${approvedCount} approved/locked.`,
      kpis: [
        { label: 'Revenue', value: formatCurrencyPkr(revenue) },
        { label: 'Profit / Loss', value: formatCurrencyPkr(pl) },
        { label: 'Subsidies', value: formatCurrencyPkr(subsidies) },
        { label: 'Debt', value: formatCurrencyPkr(debt) },
      ],
    },
    {
      id: 'assets',
      title: 'Assets',
      kpis: [
        { label: 'Asset count', value: String(assets) },
        { label: 'Book value', value: formatCurrencyPkr(book) },
      ],
    },
    {
      id: 'governance',
      title: 'Governance',
      kpis: [{ label: 'Board vacancies (sum)', value: String(vacancies) }],
    },
    {
      id: 'fiscal',
      title: 'Fiscal exposure',
      kpis: [
        { label: 'Subsidies', value: formatCurrencyPkr(subsidies) },
        { label: 'Debt', value: formatCurrencyPkr(debt) },
      ],
      bullets: [
        'Subsidy = period financialMetrics.subsidies (prototype aggregation).',
        'Debt = period financialMetrics.totalDebt.',
      ],
    },
    {
      id: 'industrial',
      title: 'Industrial performance',
      kpis: [
        {
          label: 'SOEs with industrial rows',
          value: String(
            orgs.filter((o) =>
              db.industrialPerformance.some(
                (i) =>
                  i.organizationId === o.id && i.reportingPeriodId === reportingPeriodId,
              ),
            ).length,
          ),
        },
      ],
    },
    {
      id: 'accountability',
      title: 'Accountability issues',
      kpis: [
        { label: 'Open audit paras', value: String(openAudit) },
        { label: 'Active litigation', value: String(litigation) },
      ],
    },
    {
      id: 'highlights',
      title: 'Strategic highlights',
      bullets: [
        pl < 0
          ? 'Portfolio period P/L is negative — review loss-making SOEs.'
          : 'Portfolio period P/L is non-negative under selected parameters.',
        openAudit > 0
          ? `${openAudit} open audit paras require attention.`
          : 'No open audit paras in scope.',
        'Highlights are prototype decision-support signals, not official ratings.',
      ],
    },
  ]
}

function buildAssetReport(
  orgIds: string[],
  province?: string,
): ReportSection[] {
  let assets = db.assets.filter((a) => orgIds.includes(a.organizationId))
  if (province) assets = assets.filter((a) => a.province === province)
  const land = assets.filter((a) => a.assetType === ASSET_TYPE.LAND)
  const book = assets.reduce((s, a) => s + (a.bookValue ?? 0), 0)
  const market = assets.reduce((s, a) => s + (a.marketValue ?? 0), 0)
  const unused = assets.filter(
    (a) =>
      a.utilizationStatus === ASSET_UTILIZATION.UNUSED ||
      a.utilizationStatus === ASSET_UTILIZATION.IDLE,
  ).length
  const encroached = assets.filter(
    (a) => a.encroachmentStatus === ENCROACHMENT_STATUS.ENCROACHED,
  ).length
  const litigated = assets.filter(
    (a) => a.litigationStatus === ASSET_LITIGATION_STATUS.ACTIVE,
  ).length
  const byProvince = new Map<string, number>()
  for (const a of assets) {
    const p = a.province ?? 'Unknown'
    byProvince.set(p, (byProvince.get(p) ?? 0) + 1)
  }

  return [
    {
      id: 'summary',
      title: 'Asset count / value',
      empty: assets.length === 0,
      summary: assets.length === 0 ? 'No assets in filter.' : undefined,
      kpis: [
        { label: 'Assets', value: String(assets.length) },
        { label: 'Book value', value: formatCurrencyPkr(book) },
        { label: 'Market value', value: formatCurrencyPkr(market) },
      ],
    },
    {
      id: 'land',
      title: 'Land',
      kpis: [
        { label: 'Land parcels', value: String(land.length) },
        {
          label: 'Land acres',
          value: land.reduce((s, a) => s + (a.areaAcres ?? 0), 0).toFixed(0),
        },
      ],
    },
    {
      id: 'utilization',
      title: 'Utilization',
      kpis: [{ label: 'Unused / idle', value: String(unused) }],
    },
    {
      id: 'valuation',
      title: 'Valuation',
      kpis: [
        {
          label: 'Missing market value',
          value: String(assets.filter((a) => a.marketValue == null).length),
        },
      ],
    },
    {
      id: 'encroachment',
      title: 'Encroachment',
      kpis: [{ label: 'Encroached', value: String(encroached) }],
    },
    {
      id: 'litigation',
      title: 'Litigation',
      kpis: [{ label: 'Under litigation', value: String(litigated) }],
    },
    {
      id: 'geo',
      title: 'Geographic distribution',
      columns: ['Province', 'Assets'],
      rows: [...byProvince.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([Province, Assets]) => ({ Province, Assets })),
      empty: byProvince.size === 0,
    },
  ]
}

function buildFiscal(
  orgIds: string[],
  reportingPeriodId: string,
  approvedOnly?: boolean,
): ReportSection[] {
  let debt = 0
  let subsidies = 0
  let losses = 0
  let lossCount = 0
  for (const id of orgIds) {
    const fin = financeFor(id, reportingPeriodId, approvedOnly)
    if (!fin) continue
    debt += fin.totalDebt ?? 0
    subsidies += fin.subsidies
    if (fin.profitOrLoss < 0) {
      losses += Math.abs(fin.profitOrLoss)
      lossCount += 1
    }
  }
  const loans = db.loans.filter((l) => orgIds.includes(l.organizationId))
  const guarantees = db.guarantees.filter((g) => orgIds.includes(g.organizationId))
  const grants = db.grants.filter((g) => orgIds.includes(g.organizationId))
  const priorId = db.reportingPeriods
    .filter((p) => p.type === 'annual')
    .sort((a, b) => a.startDate.localeCompare(b.startDate))
    .map((p) => p.id)
  const idx = priorId.indexOf(reportingPeriodId)
  const prev = idx > 0 ? priorId[idx - 1] : undefined
  let prevSubsidies = 0
  if (prev) {
    for (const id of orgIds) {
      const fin = financeFor(id, prev, approvedOnly)
      if (fin) prevSubsidies += fin.subsidies
    }
  }

  return [
    {
      id: 'defs',
      title: 'Definitions (prototype)',
      bullets: [
        'Debt — sum of financialMetrics.totalDebt for period.',
        'Loans — loan register outstanding balances.',
        'Guarantees — guarantee register (fixture amounts).',
        'Subsidies — financialMetrics.subsidies for period.',
        'Grants — grant register totals.',
        'Losses — absolute value of negative profitOrLoss rows.',
      ],
    },
    {
      id: 'debt',
      title: 'Debt',
      kpis: [{ label: 'Total debt', value: formatCurrencyPkr(debt) }],
    },
    {
      id: 'loans',
      title: 'Loans',
      kpis: [
        { label: 'Loan count', value: String(loans.length) },
        {
          label: 'Outstanding',
          value: formatCurrencyPkr(loans.reduce((s, l) => s + l.outstanding, 0)),
        },
        {
          label: 'Overdue',
          value: String(loans.filter((l) => l.repaymentStatus === 'overdue').length),
        },
      ],
    },
    {
      id: 'guarantees',
      title: 'Guarantees',
      kpis: [
        { label: 'Count', value: String(guarantees.length) },
        {
          label: 'Amount',
          value: formatCurrencyPkr(guarantees.reduce((s, g) => s + g.amount, 0)),
        },
      ],
    },
    {
      id: 'subsidies',
      title: 'Subsidies',
      kpis: [{ label: 'Period subsidies', value: formatCurrencyPkr(subsidies) }],
    },
    {
      id: 'grants',
      title: 'Grants',
      kpis: [
        { label: 'Count', value: String(grants.length) },
        {
          label: 'Amount',
          value: formatCurrencyPkr(grants.reduce((s, g) => s + (g.amount ?? 0), 0)),
        },
      ],
    },
    {
      id: 'losses',
      title: 'Losses',
      kpis: [
        { label: 'Loss-making SOEs', value: String(lossCount) },
        { label: 'Aggregate loss amount', value: formatCurrencyPkr(losses) },
      ],
    },
    {
      id: 'trend',
      title: 'Trend',
      summary: prev
        ? `Subsidies ${periodLabel(prev)} → ${periodLabel(reportingPeriodId)}`
        : 'Insufficient history for subsidy trend.',
      kpis: prev
        ? [
            { label: 'Prior subsidies', value: formatCurrencyPkr(prevSubsidies) },
            { label: 'Current subsidies', value: formatCurrencyPkr(subsidies) },
          ]
        : undefined,
      empty: !prev,
    },
  ]
}

function buildBoard(orgIds: string[]): ReportSection[] {
  const members = db.boardMembers.filter((b) => orgIds.includes(b.organizationId))
  const sitting = members.filter((b) => !b.isVacancySlot)
  const vacancies = members.filter((b) => b.isVacancySlot)
  const expiring = sitting.filter(
    (b) =>
      daysUntil(b.expiryDate, DEMO_AS_OF_DATE) <= 90 &&
      daysUntil(b.expiryDate, DEMO_AS_OF_DATE) >= 0,
  )
  const committees = db.boardCommittees.filter((c) => orgIds.includes(c.organizationId))
  const missingDecl = sitting.filter(
    (b) =>
      b.conflictDeclarationStatus === DECLARATION_STATUS.PENDING ||
      b.conflictDeclarationStatus === DECLARATION_STATUS.OVERDUE ||
      b.assetDeclarationStatus === DECLARATION_STATUS.PENDING ||
      b.assetDeclarationStatus === DECLARATION_STATUS.OVERDUE,
  )

  return [
    {
      id: 'composition',
      title: 'Board composition',
      columns: ['SOE', 'Name', 'Role', 'Expiry'],
      rows: sitting.slice(0, 40).map((b) => ({
        SOE: orgLabel(b.organizationId),
        Name: b.name,
        Role: b.role,
        Expiry: b.expiryDate,
      })),
      empty: sitting.length === 0,
    },
    {
      id: 'vacancies',
      title: 'Vacancies',
      kpis: [{ label: 'Vacancy slots', value: String(vacancies.length) }],
    },
    {
      id: 'expiries',
      title: 'Expiries',
      kpis: [{ label: 'Expiring ≤90 days', value: String(expiring.length) }],
      columns: ['SOE', 'Name', 'Days'],
      rows: expiring.slice(0, 20).map((b) => ({
        SOE: orgLabel(b.organizationId),
        Name: b.name,
        Days: daysUntil(b.expiryDate, DEMO_AS_OF_DATE),
      })),
    },
    {
      id: 'committees',
      title: 'Committees',
      kpis: [{ label: 'Committee records', value: String(committees.length) }],
      summary: 'Committee composition is illustrative in fixtures.',
    },
    {
      id: 'declarations',
      title: 'Declarations',
      kpis: [
        { label: 'Pending / overdue declarations', value: String(missingDecl.length) },
      ],
    },
    {
      id: 'attendance',
      title: 'Attendance summary',
      kpis: [
        {
          label: 'Avg attendance % (where recorded)',
          value: (() => {
            const withAtt = sitting.filter((b) => b.attendancePct != null)
            if (!withAtt.length) return '—'
            return (
              withAtt.reduce((s, b) => s + (b.attendancePct ?? 0), 0) / withAtt.length
            ).toFixed(0)
          })(),
        },
      ],
    },
  ]
}

function buildAudit(orgIds: string[]): ReportSection[] {
  const paras = db.auditParas.filter((a) => orgIds.includes(a.organizationId))
  const open = paras.filter((a) => a.status !== 'settled')
  const pac = db.pacObservations.filter((p) => orgIds.includes(p.organizationId))
  const amount = open.reduce((s, a) => s + a.amountInvolved, 0)
  const recovered = paras.reduce((s, a) => s + a.amountRecovered, 0)
  const aged = open.filter((a) => a.dateRaised < '2025-01-01')

  return [
    {
      id: 'audits',
      title: 'Audits / paras',
      kpis: [
        { label: 'Total paras', value: String(paras.length) },
        { label: 'Open', value: String(open.length) },
      ],
    },
    {
      id: 'amounts',
      title: 'Amount involved',
      kpis: [
        { label: 'Open amount', value: formatCurrencyPkr(amount) },
        { label: 'Recovered (all)', value: formatCurrencyPkr(recovered) },
      ],
    },
    {
      id: 'recovery',
      title: 'Recovery',
      columns: ['SOE', 'Para', 'Status', 'Amount'],
      rows: open.slice(0, 25).map((a) => ({
        SOE: orgLabel(a.organizationId),
        Para: a.id,
        Status: a.recoveryStatus,
        Amount: a.amountInvolved,
      })),
      empty: open.length === 0,
    },
    {
      id: 'pac',
      title: 'PAC observations',
      kpis: [{ label: 'PAC records', value: String(pac.length) }],
    },
    {
      id: 'aged',
      title: 'Aged issues',
      kpis: [{ label: 'Open paras raised before 2025', value: String(aged.length) }],
    },
  ]
}

function buildLitigation(orgIds: string[]): ReportSection[] {
  const cases = db.litigation.filter((l) => orgIds.includes(l.organizationId))
  const active = cases.filter((l) => l.status === 'active')
  const exposure = active.reduce((s, l) => s + (l.amountInvolved ?? 0), 0)
  const hearings = active
    .filter((l) => l.nextHearing)
    .sort((a, b) => (a.nextHearing ?? '').localeCompare(b.nextHearing ?? ''))
  const high = active.filter((l) => (l.amountInvolved ?? 0) >= 50_000_000)
  const byStatus = new Map<string, number>()
  for (const c of cases) byStatus.set(c.status, (byStatus.get(c.status) ?? 0) + 1)

  return [
    {
      id: 'active',
      title: 'Active cases',
      kpis: [{ label: 'Active', value: String(active.length) }],
    },
    {
      id: 'exposure',
      title: 'Financial exposure',
      kpis: [{ label: 'Active amount involved', value: formatCurrencyPkr(exposure) }],
    },
    {
      id: 'hearings',
      title: 'Upcoming hearings',
      columns: ['SOE', 'Case', 'Hearing'],
      rows: hearings.slice(0, 20).map((l) => ({
        SOE: orgLabel(l.organizationId),
        Case: l.caseNumber,
        Hearing: l.nextHearing ?? '—',
      })),
      empty: hearings.length === 0,
    },
    {
      id: 'high',
      title: 'High-value matters',
      summary: 'Prototype threshold: amount ≥ PKR 50 million.',
      kpis: [{ label: 'High-value active', value: String(high.length) }],
    },
    {
      id: 'status',
      title: 'Status breakdown',
      columns: ['Status', 'Count'],
      rows: [...byStatus.entries()].map(([Status, Count]) => ({ Status, Count })),
    },
  ]
}

function buildCompliance(orgIds: string[]): ReportSection[] {
  const items = db.compliance.filter((c) => orgIds.includes(c.organizationId))
  const overdue = items.filter(
    (c) =>
      c.status === COMPLIANCE_STATUS.NON_COMPLIANT ||
      daysUntil(c.dueDate, DEMO_AS_OF_DATE) < 0,
  )
  const evidenceGaps = items.filter((c) => !c.evidenceAvailable)
  const bySoe = orgIds.map((id) => {
    const rows = items.filter((c) => c.organizationId === id)
    const od = rows.filter(
      (c) =>
        c.status === COMPLIANCE_STATUS.NON_COMPLIANT ||
        daysUntil(c.dueDate, DEMO_AS_OF_DATE) < 0,
    ).length
    return { SOE: orgLabel(id), Obligations: rows.length, Overdue: od }
  })

  return [
    {
      id: 'by-soe',
      title: 'Compliance status by SOE',
      columns: ['SOE', 'Obligations', 'Overdue'],
      rows: bySoe,
      empty: bySoe.length === 0,
    },
    {
      id: 'overdue',
      title: 'Overdue requirements',
      kpis: [{ label: 'Overdue / non-compliant', value: String(overdue.length) }],
      columns: ['SOE', 'Area', 'Due', 'Status'],
      rows: overdue.slice(0, 30).map((c) => ({
        SOE: orgLabel(c.organizationId),
        Area: c.area,
        Due: c.dueDate,
        Status: c.status,
      })),
      empty: overdue.length === 0,
      summary: overdue.length === 0 ? 'No overdue obligations in scope.' : undefined,
    },
    {
      id: 'evidence',
      title: 'Evidence gaps',
      kpis: [{ label: 'Missing evidence flag', value: String(evidenceGaps.length) }],
    },
    {
      id: 'trend',
      title: 'Comparison note',
      bullets: [
        'Period comparison of compliance rates is provisional in this prototype.',
        'Use Compliance Matrix module for operational follow-up.',
      ],
    },
  ]
}

function buildPrivatization(orgIds: string[]): ReportSection[] {
  const cases = db.privatizationCases.filter((p) => orgIds.includes(p.organizationId))
  const milestones = db.privatizationMilestones.filter((m) =>
    orgIds.includes(m.organizationId),
  )

  return [
    {
      id: 'pipeline',
      title: 'Entities in pipeline',
      empty: cases.length === 0,
      summary: cases.length === 0 ? 'No privatization cases in scope.' : undefined,
      columns: ['SOE', 'Stage', 'Status', 'Blocker', 'Next action'],
      rows: cases.map((p) => ({
        SOE: orgLabel(p.organizationId),
        Stage: p.currentStage,
        Status: p.status,
        Blocker: p.blocker ?? '—',
        'Next action': p.nextAction ?? '—',
      })),
    },
    {
      id: 'milestones',
      title: 'Milestones',
      kpis: [{ label: 'Milestone records', value: String(milestones.length) }],
      columns: ['SOE', 'Milestone', 'Target', 'Status'],
      rows: milestones.slice(0, 25).map((m) => ({
        SOE: orgLabel(m.organizationId),
        Milestone: m.name,
        Target: m.targetDate,
        Status: m.status,
      })),
      empty: milestones.length === 0,
    },
  ]
}

function buildIndustrial(orgIds: string[], reportingPeriodId: string): ReportSection[] {
  const rows = db.industrialPerformance.filter(
    (i) => orgIds.includes(i.organizationId) && i.reportingPeriodId === reportingPeriodId,
  )
  const sum = (fn: (r: (typeof rows)[0]) => number) => rows.reduce((s, r) => s + fn(r), 0)

  return [
    {
      id: 'production',
      title: 'Production / capacity',
      empty: rows.length === 0,
      summary: rows.length === 0 ? 'No industrial rows for period.' : undefined,
      kpis: [
        { label: 'Installed capacity (sum)', value: String(sum((r) => r.installedCapacity)) },
        { label: 'Actual production (sum)', value: String(sum((r) => r.actualProduction)) },
        {
          label: 'Avg utilization %',
          value: rows.length
            ? (
                rows.reduce((s, r) => s + r.capacityUtilization, 0) / rows.length
              ).toFixed(1)
            : '—',
        },
      ],
    },
    {
      id: 'trade',
      title: 'Trade',
      kpis: [
        { label: 'Exports', value: formatCurrencyPkr(sum((r) => r.exports)) },
        { label: 'Imports', value: formatCurrencyPkr(sum((r) => r.imports)) },
        {
          label: 'Domestic sales',
          value: formatCurrencyPkr(sum((r) => r.domesticSales)),
        },
      ],
    },
    {
      id: 'employment',
      title: 'Employment contribution',
      kpis: [{ label: 'Employment (sum)', value: String(sum((r) => r.employment)) }],
    },
    {
      id: 'energy-carbon',
      title: 'Energy / carbon indicators',
      kpis: [
        {
          label: 'Energy consumption',
          value: `${sum((r) => r.energyConsumption).toLocaleString('en-PK')} (mixed units)`,
        },
        {
          label: 'Carbon emissions',
          value: `${sum((r) => r.carbonEmissions).toLocaleString('en-PK')} (tCO2e)`,
        },
      ],
      bullets: ['Energy/carbon aggregates are prototype fixtures — units may differ by SOE.'],
    },
    {
      id: 'detail',
      title: 'By SOE',
      columns: ['SOE', 'Utilization %', 'Exports', 'Employment'],
      rows: rows.map((r) => ({
        SOE: orgLabel(r.organizationId),
        'Utilization %': r.capacityUtilization,
        Exports: r.exports,
        Employment: r.employment,
      })),
      empty: rows.length === 0,
    },
  ]
}

function buildMinisterBrief(
  orgIds: string[],
  reportingPeriodId: string,
  approvedOnly?: boolean,
): ReportSection[] {
  const metrics = orgIds.map((id) => deriveOrganizationMetrics(id, reportingPeriodId))
  let lossMakers = 0
  let subsidies = 0
  for (const id of orgIds) {
    const fin = financeFor(id, reportingPeriodId, approvedOnly)
    if (fin && fin.profitOrLoss < 0) lossMakers += 1
    if (fin) subsidies += fin.subsidies
  }
  const vacancies = metrics.reduce((s, m) => s + m.boardVacancies, 0)
  const audit = metrics.reduce((s, m) => s + m.openAuditCount, 0)
  const lit = metrics.reduce((s, m) => s + m.activeLitigationCount, 0)
  const priv = db.privatizationCases.filter((p) => orgIds.includes(p.organizationId))

  return [
    {
      id: 'health',
      title: 'Portfolio Health',
      bullets: [
        `${orgIds.length} SOEs in scope for ${periodLabel(reportingPeriodId)}.`,
        `${lossMakers} with period loss under selected finance rules.`,
        'Health signals are prototype — see Risk & Benchmarking for scorecards.',
      ],
    },
    {
      id: 'financial',
      title: 'Major Financial Risks',
      bullets: [
        `Period subsidies in scope: ${formatCurrencyPkr(subsidies)}.`,
        `${lossMakers} loss-making SOE(s).`,
        'Drill: Fiscal Exposure Report / Financial & Fiscal module.',
      ],
      lineageHref: '/minister/fiscal',
    },
    {
      id: 'governance',
      title: 'Governance Issues',
      bullets: [
        `${vacancies} board vacancy slot(s) across scope.`,
        'Drill: Governance Risk / Board Governance Report.',
      ],
      lineageHref: '/minister/governance',
    },
    {
      id: 'assets',
      title: 'Asset Opportunities',
      bullets: [
        'Review National Asset Map for vacant industrial land and underutilized assets.',
        'Drill: Asset Intelligence / Asset Report.',
      ],
      lineageHref: '/minister/assets',
    },
    {
      id: 'audit-legal',
      title: 'Audit / Legal Exposure',
      bullets: [
        `${audit} open audit para(s); ${lit} active litigation case(s).`,
        'Drill: Audit & Legal Risk.',
      ],
      lineageHref: '/minister/audit-legal',
    },
    {
      id: 'privatization',
      title: 'Privatization',
      bullets: [
        `${priv.length} case(s) in pipeline.`,
        priv[0]
          ? `Example: ${orgLabel(priv[0].organizationId)} — ${priv[0].currentStage}.`
          : 'No active pipeline cases in scope.',
      ],
      lineageHref: '/minister/privatization',
    },
    {
      id: 'attention',
      title: 'Decisions / Attention Required',
      bullets: [
        lossMakers > 0 ? 'Review loss-making SOEs for fiscal attention.' : 'No period losses in scope.',
        vacancies > 0 ? 'Board vacancy concentration may need appointment action.' : 'No board vacancies flagged.',
        audit > 0 ? 'Open audit paras require management response tracking.' : 'No open audit paras.',
        'Attention list is a prototype briefing aid — not an official decision register.',
      ],
    },
  ]
}

function buildCabinetBrief(
  orgIds: string[],
  reportingPeriodId: string,
  approvedOnly?: boolean,
): ReportSection[] {
  const metrics = orgIds.map((id) => deriveOrganizationMetrics(id, reportingPeriodId))
  const audit = metrics.reduce((s, m) => s + m.openAuditCount, 0)
  const lit = metrics.reduce((s, m) => s + m.activeLitigationCount, 0)
  let subsidies = 0
  let lossMakers = 0
  for (const id of orgIds) {
    const fin = financeFor(id, reportingPeriodId, approvedOnly)
    if (fin) {
      subsidies += fin.subsidies
      if (fin.profitOrLoss < 0) lossMakers += 1
    }
  }
  const priv = db.privatizationCases.filter((p) => orgIds.includes(p.organizationId))

  return [
    {
      id: 'cabinet',
      title: 'Cabinet-level issues (prototype structure)',
      summary:
        'Not official Cabinet wording or approval process. Structure for stakeholder validation only.',
      issues: [
        {
          keyIssue: 'Fiscal burden from subsidies and losses',
          evidence: `${formatCurrencyPkr(subsidies)} subsidies; ${lossMakers} loss-making SOE(s) in ${periodLabel(reportingPeriodId)}.`,
          strategicImplication:
            'Sustained support requirements may constrain industrial and fiscal policy space.',
          decisionPlaceholder: '[Attention / decision placeholder — stakeholder to define]',
        },
        {
          keyIssue: 'Accountability exposure',
          evidence: `${audit} open audit paras; ${lit} active litigation cases.`,
          strategicImplication:
            'Unresolved exposure may affect governance credibility and privatization readiness.',
          decisionPlaceholder: '[Attention / decision placeholder — stakeholder to define]',
        },
        {
          keyIssue: 'Privatization pipeline status',
          evidence: `${priv.length} entit(y/ies) in pipeline under selected scope.`,
          strategicImplication:
            'Stage progress and blockers affect asset realization and reform sequencing.',
          decisionPlaceholder: '[Attention / decision placeholder — stakeholder to define]',
        },
      ],
    },
  ]
}

function assertPortalAccess(reportId: ReportId, portal: ReportPortal) {
  const def = getReportDefinition(reportId)
  if (!def) throw new Error('Unknown report')
  if (!def.portals.includes(portal)) {
    throw new Error('Report not available for this portal')
  }
  return def
}

function resolveOrgIds(
  def: ReportDefinition,
  portal: ReportPortal,
  params?: ReportParams,
): string[] {
  if (portal === 'soe') {
    if (!params?.organizationId) throw new Error('SOE organization required')
    return [params.organizationId]
  }
  if (def.requiresOrganization && !params?.organizationId) {
    // default first org for preview convenience — UI should prompt
    const fallback = db.organizations[0]?.id
    return fallback ? [fallback] : []
  }
  return filterOrgs(params, portal).map((o) => o.id)
}

function buildSections(
  reportId: ReportId,
  orgIds: string[],
  reportingPeriodId: string,
  params?: ReportParams,
): ReportSection[] {
  switch (reportId) {
    case REPORT_ID.SOE_PROFILE:
      return buildSoeProfile(orgIds[0]!, reportingPeriodId, params?.approvedOnly)
    case REPORT_ID.ANNUAL_PORTFOLIO:
      return buildPortfolio(orgIds, reportingPeriodId, params?.approvedOnly)
    case REPORT_ID.ASSET:
      return buildAssetReport(orgIds, params?.province)
    case REPORT_ID.FISCAL_EXPOSURE:
      return buildFiscal(orgIds, reportingPeriodId, params?.approvedOnly)
    case REPORT_ID.BOARD_GOVERNANCE:
      return buildBoard(orgIds)
    case REPORT_ID.AUDIT:
      return buildAudit(orgIds)
    case REPORT_ID.LITIGATION:
      return buildLitigation(orgIds)
    case REPORT_ID.COMPLIANCE:
      return buildCompliance(orgIds)
    case REPORT_ID.PRIVATIZATION:
      return buildPrivatization(orgIds)
    case REPORT_ID.INDUSTRIAL:
      return buildIndustrial(orgIds, reportingPeriodId)
    case REPORT_ID.MINISTER_BRIEF:
      return buildMinisterBrief(orgIds, reportingPeriodId, params?.approvedOnly)
    case REPORT_ID.CABINET_BRIEF:
      return buildCabinetBrief(orgIds, reportingPeriodId, params?.approvedOnly)
    default:
      return []
  }
}

export const mockReportsService: ReportsService = {
  async listCatalogue(portal, params) {
    const latest = periodLabel(periodId(params))
    const items = listReportsForPortal(portal).map((r) => ({
      ...r,
      groupLabel: REPORT_GROUP_LABEL[r.group],
      latestPeriodLabel: latest,
      filterSummary: r.parameters.join(', '),
    }))
    return simulateLatency(items)
  },

  async getCatalogueGrouped(portal, params) {
    const items = await this.listCatalogue(portal, params)
    const grouped = reportsByGroup(items).map((g) => ({
      group: g.group,
      label: g.label,
      items: g.items as ReportCatalogueItem[],
    }))
    return simulateLatency(grouped)
  },

  async getPreview(reportId, portal, params) {
    const def = assertPortalAccess(reportId, portal)
    const reportingPeriodId = periodId(params)
    const orgIds = resolveOrgIds(def, portal, {
      ...params,
      organizationId:
        portal === 'soe' ? params?.organizationId : params?.organizationId,
    })
    const orgs = db.organizations.filter((o) => orgIds.includes(o.id))
    const ds = dataStatusFor(orgs, reportingPeriodId, params?.approvedOnly)
    const preview: ReportPreview = {
      reportId,
      title: def.name,
      audience: def.audience,
      generatedAt: `${DEMO_AS_OF_DATE}T12:00:00Z`,
      reportingPeriodId,
      periodLabel: periodLabel(reportingPeriodId),
      scopeLabel: scopeLabel(params, portal, orgs),
      dataStatus: ds.status,
      dataStatusNote: ds.note,
      sections: buildSections(reportId, orgIds, reportingPeriodId, params),
      briefStyle: Boolean(def.briefStyle),
      isPrototype: true,
      methodologyNote: METHODOLOGY,
    }
    return simulateLatency(preview)
  },

  async exportReport(reportId, format, portal, params) {
    assertPortalAccess(reportId, portal)
    const def = getReportDefinition(reportId)!
    const pid = periodId(params)
    const ext = format === REPORT_EXPORT_FORMAT.PDF ? 'pdf' : 'xlsx'
    const result: MockExportResult = {
      jobId: `export-${reportId}-${Date.now()}`,
      format,
      fileName: `${def.id}-${periodLabel(pid).replace(/\s+/g, '')}.${ext}`,
      status: 'completed',
      message:
        format === REPORT_EXPORT_FORMAT.PDF
          ? 'Mock PDF export completed (no real file generated).'
          : 'Mock Excel export completed (no real file generated).',
      generatedAt: new Date().toISOString(),
    }
    return simulateMutation(result)
  },

  async getFilterOptions(portal, organizationId) {
    const orgs =
      portal === 'soe' && organizationId
        ? db.organizations.filter((o) => o.id === organizationId)
        : [...db.organizations]
    return simulateLatency({
      periods: db.reportingPeriods
        .filter((p) => p.type === 'annual')
        .sort((a, b) => b.startDate.localeCompare(a.startDate))
        .map((p) => ({ id: p.id, label: p.label })),
      organizations: orgs
        .map((o) => ({ id: o.id, label: o.abbreviation }))
        .sort((a, b) => a.label.localeCompare(b.label)),
      sectors: [...new Set(db.organizations.map((o) => o.sector))].sort(),
      provinces: [
        ...new Set(db.assets.map((a) => a.province).filter(Boolean) as string[]),
      ].sort(),
    })
  },
}
