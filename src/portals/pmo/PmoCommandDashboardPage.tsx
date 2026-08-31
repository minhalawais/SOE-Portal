import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  Banknote,
  Building2,
  Car,
  Check,
  Cog,
  FileText,
  Fuel,
  Globe,
  Globe2,
  HandCoins,
  HeartHandshake,
  HeartPulse,
  Home,
  Import,
  Laptop,
  LandPlot,
  Landmark,
  Layers3,
  MapPinned,
  Minus,
  Package,
  Phone,
  Plane,
  Venus,
  ShieldCheck,
  Smartphone,
  TrendingUp,
  Users,
  Wifi,
  Wrench,
  X,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { RequirePermission } from '@/app/router/guards'
import { ErrorState, LoadingBlock } from '@/design-system/components/Feedback'
import {
  ASSET_LITIGATION_STATUS,
  ASSET_TYPE,
  ASSET_TYPE_LABEL,
  ASSET_UTILIZATION,
  COMPLIANCE_STATUS,
  DIRECTOR_TYPE,
  DIRECTOR_TYPE_LABEL,
  DOCUMENT_EVIDENCE_STATUS,
  ENCROACHMENT_STATUS,
  LEGAL_STATUS_LABEL,
  SOE_STATUS_LABEL,
  type AssetType,
  type SoeStatus,
} from '@/constants'
import {
  mockAssetService,
  mockAuditService,
  mockBoardService,
  mockComplianceService,
  mockDocumentService,
  mockExecutiveDashboardService,
  mockFinanceService,
  mockGisService,
  mockLitigationService,
  mockMinisterPortalService,
  mockOrganizationService,
  mockPmoPortalService,
  mockSecretaryPortalService,
  mockWorkforceService,
} from '@/mock-services'
import type { ExecutiveTone, SecretaryDashboardData } from '@/mock-services/executiveDashboard.service'
import type { PmoFilter } from '@/mock-services/pmoPortal.service'
import { ExecutiveLitigationExposureSection } from '@/portals/shared/LitigationDashboardSections'
import { ExecutiveReportsStrip } from '@/portals/pmo/ExecutiveReportsStrip'
import { RankedBars, ToneBadge } from '@/portals/executive/ExecutiveDashboardComponents'
import { PERMISSION } from '@/permissions'
import { useSessionStore } from '@/state/session'
import { cn, formatCurrencyPkr } from '@/utils'
import type {
  Asset,
  BoardMember,
  BoardMemberAssignedFacilities,
  OfficialVehicleAssignment,
} from '@/types/domain'

const PANEL = 'border border-soe-border bg-white shadow-[var(--shadow-xs)]'
const STATUS_COLOR = {
  healthy: '#2e7d5a',
  watch: '#c58a19',
  concern: '#b84242',
} as const

function useCommandFilter(): [PmoFilter, (patch: Partial<PmoFilter>) => void] {
  const reportingPeriodId = useSessionStore((s) => s.reportingPeriodId)
  const setReportingPeriodId = useSessionStore((s) => s.setReportingPeriodId)
  const [params, setParams] = useSearchParams()
  const filter: PmoFilter = {
    reportingPeriodId: params.get('period') ?? reportingPeriodId,
    sector: params.get('sector') ?? '',
    province: params.get('province') ?? '',
  }
  const setFilter = (patch: Partial<PmoFilter>) => {
    const nextFilter = { ...filter, ...patch }
    const next = new URLSearchParams(params)
    if (nextFilter.reportingPeriodId) {
      next.set('period', nextFilter.reportingPeriodId)
      setReportingPeriodId(nextFilter.reportingPeriodId)
    }
    if (nextFilter.sector) next.set('sector', nextFilter.sector)
    else next.delete('sector')
    if (nextFilter.province) next.set('province', nextFilter.province)
    else next.delete('province')
    setParams(next)
  }
  return [filter, setFilter]
}

function compactNumber(value: number) {
  return new Intl.NumberFormat('en-PK', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value)
}

function compactCurrency(value: number) {
  if (!Number.isFinite(value)) return 'PKR —'
  return formatCurrencyPkr(value)
}

function compactAcres(value: number) {
  return `${compactNumber(value)} ac`
}

function chartPkrAxis(value: number) {
  return formatCurrencyPkr(value).replace('PKR ', '')
}

function niceCurrencyAxisMax(maxValue: number) {
  if (maxValue <= 0) return 1_000_000
  const magnitude = 10 ** Math.floor(Math.log10(maxValue))
  const normalized = maxValue / magnitude
  const nice =
    normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 3 ? 3 : normalized <= 5 ? 5 : 10
  return nice * magnitude
}

function percent(value: number | null, digits = 1) {
  return value == null || !Number.isFinite(value) ? '—' : `${value.toFixed(digits)}%`
}

function femaleWorkforcePct(genderCounts: Record<string, number>): number | null {
  const total = Object.values(genderCounts).reduce((sum, count) => sum + count, 0)
  if (total === 0) return null
  return ((genderCounts.female ?? 0) / total) * 100
}

function Panel({
  title,
  action,
  className,
  children,
}: {
  title: string
  action?: React.ReactNode
  className?: string
  children: React.ReactNode
}) {
  return (
    <section className={cn(PANEL, 'min-w-0 overflow-hidden rounded-[6px]', className)}>
      <header className="flex min-h-11 items-center justify-between gap-3 border-b border-soe-border px-4 py-2.5">
        <h2 className="text-sm font-semibold text-soe-navy">{title}</h2>
        {action}
      </header>
      {children}
    </section>
  )
}

function SectionHeader({
  id,
  title,
  meta,
}: {
  id: string
  title: string
  meta?: string
}) {
  return (
    <div id={id} className="scroll-mt-24 border-b border-soe-border pb-2 pt-2">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h2 className="text-lg font-semibold text-soe-navy">{title}</h2>
        {meta ? <p className="text-xs text-soe-slate">{meta}</p> : null}
      </div>
    </div>
  )
}

type HealthRow = {
  organizationId: string
  abbreviation: string
  name: string
  sector: string
  province: string
  legalStatus: string
  status: SoeStatus
  healthBand: 'healthy' | 'watch' | 'concern'
  boardVacancies: number
  profitOrLoss: number | null
  warningCount: number
}

const ASSET_MODULE_DEFS: Array<{
  id: string
  label: string
  icon: LucideIcon
  types?: AssetType[]
  kind: 'registry' | 'type' | 'map'
}> = [
  { id: 'registry', label: 'Asset Registry', icon: Layers3, kind: 'registry' },
  { id: 'land', label: 'Land', icon: LandPlot, types: [ASSET_TYPE.LAND], kind: 'type' },
  { id: 'buildings', label: 'Buildings', icon: Building2, types: [ASSET_TYPE.BUILDING], kind: 'type' },
  { id: 'machinery', label: 'Machinery', icon: Cog, types: [ASSET_TYPE.MACHINERY], kind: 'type' },
  { id: 'vehicles', label: 'Vehicles', icon: Car, types: [ASSET_TYPE.VEHICLE], kind: 'type' },
  {
    id: 'equipment',
    label: 'Other Equipment',
    icon: Wrench,
    types: [ASSET_TYPE.OTHER_EQUIPMENT, ASSET_TYPE.IT_EQUIPMENT],
    kind: 'type',
  },
  { id: 'map', label: 'National Asset Map', icon: MapPinned, kind: 'map' },
]

function boardStatusLabel(member: BoardMember) {
  if (member.isVacancySlot || member.status === 'vacant') return 'Vacant'
  if (member.status === 'expired') return 'Expired'
  return 'Active'
}

function boardInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

function ExplorerStatCard({
  label,
  value,
  tone,
}: {
  label: string
  value: number | string
  tone: 'success' | 'critical' | 'warning' | 'neutral'
}) {
  const toneStyles = {
    success: 'bg-gradient-to-br from-[#12665d] to-[#16877A]',
    critical: 'bg-gradient-to-br from-[#8f3333] to-[#b84242]',
    warning: 'bg-gradient-to-br from-[#9a6b12] to-[#C58A19]',
    neutral: 'bg-gradient-to-br from-[#12304a] to-[#1d5d8f]',
  }[tone]

  return (
    <div className={cn('overflow-hidden rounded-lg px-2 py-1.5 text-center', toneStyles)}>
      <p className="text-lg font-semibold tabular-nums leading-none text-white">{value}</p>
      <p className="mt-0.5 truncate text-[9px] font-semibold uppercase tracking-wide text-white/75">
        {label}
      </p>
    </div>
  )
}

function DashboardMetricCard({
  label,
  value,
  icon: Icon,
  tone = 'neutral',
}: {
  label: string
  value: string
  icon: LucideIcon
  tone?: 'neutral' | 'info' | 'success' | 'warning' | 'critical'
}) {
  const toneStyles = {
    neutral: {
      icon: 'text-soe-blue',
      iconBg: 'bg-[var(--color-surface-selected)] ring-soe-blue/10',
      border: 'border-l-soe-blue/35',
    },
    info: {
      icon: 'text-soe-blue',
      iconBg: 'bg-[#e8f2fa] ring-soe-blue/15',
      border: 'border-l-soe-blue',
    },
    success: {
      icon: 'text-soe-success',
      iconBg: 'bg-[var(--color-success-soft)] ring-soe-success/15',
      border: 'border-l-soe-success',
    },
    warning: {
      icon: 'text-soe-warning',
      iconBg: 'bg-[var(--color-warning-soft)] ring-soe-warning/15',
      border: 'border-l-soe-warning',
    },
    critical: {
      icon: 'text-soe-critical',
      iconBg: 'bg-[var(--color-critical-soft)] ring-soe-critical/15',
      border: 'border-l-soe-critical',
    },
  }[tone]

  return (
    <div
      className={cn(
        'relative rounded-card border border-soe-border border-l-[3px] bg-white p-4 shadow-[var(--shadow-sm)]',
        toneStyles.border,
      )}
    >
      <div
        className={cn(
          'absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-md ring-1',
          toneStyles.iconBg,
        )}
      >
        <Icon className={cn('h-3.5 w-3.5', toneStyles.icon)} strokeWidth={1.75} aria-hidden="true" />
      </div>
      <p className="pr-9 text-[10px] font-semibold uppercase tracking-wide text-soe-slate">{label}</p>
      <p className="mt-1.5 text-[26px] font-semibold leading-none tabular-nums text-soe-navy">{value}</p>
    </div>
  )
}

type AssuranceCheckDefinition = {
  id: string
  label: string
  kind: 'status' | 'file'
  complianceArea?: string
  documentCategory?: string
  fileSlug?: string
}

const ASSURANCE_CHECKS: AssuranceCheckDefinition[] = [
  { id: 'soe-act', label: 'SOE Act', kind: 'status', complianceArea: 'SOE Act' },
  { id: 'companies-act', label: 'Companies Act', kind: 'status', complianceArea: 'Companies Act' },
  { id: 'ppra', label: 'PPRA', kind: 'status', complianceArea: 'PPRA' },
  { id: 'secp-filings', label: 'SECP Filings', kind: 'status', complianceArea: 'SECP Filings' },
  { id: 'tax-returns', label: 'Tax Returns', kind: 'status', complianceArea: 'Tax Returns' },
  { id: 'eobi', label: 'EOBI', kind: 'status', complianceArea: 'EOBI' },
  { id: 'essi', label: 'ESSI', kind: 'status', complianceArea: 'ESSI' },
  { id: 'environmental', label: 'Environmental', kind: 'status', complianceArea: 'Environmental' },
  { id: 'labour-laws', label: 'Labour Laws', kind: 'status', complianceArea: 'Labour Laws' },
  { id: 'board-evaluation', label: 'Board Evaluation', kind: 'status', complianceArea: 'Board Evaluation' },
  { id: 'annual-report-file', label: 'Annual Report', kind: 'file', documentCategory: 'annual_reports', fileSlug: 'Annual-Report-FY2026' },
  { id: 'strategic-plan-file', label: 'Strategic Plan', kind: 'file', fileSlug: 'Strategic-Plan-2026-29' },
  { id: 'risk-register-file', label: 'Risk Register', kind: 'file', fileSlug: 'Risk-Register-Q4-FY2026' },
  { id: 'internal-audit-file', label: 'Internal Audit', kind: 'file', fileSlug: 'Internal-Audit-FY2026' },
  { id: 'memorandum', label: 'Memorandum', kind: 'file', documentCategory: 'memorandum', fileSlug: 'Memorandum' },
  { id: 'articles', label: 'Articles', kind: 'file', documentCategory: 'articles', fileSlug: 'Articles' },
  { id: 'board-minutes', label: 'Board Minutes', kind: 'file', documentCategory: 'board_minutes', fileSlug: 'Board-Minutes-Jul-2026' },
  { id: 'financial-statements', label: 'Financial Statements', kind: 'file', documentCategory: 'financial_statements', fileSlug: 'Financial-Statements-FY2026' },
  { id: 'audit-reports', label: 'Audit Reports', kind: 'file', documentCategory: 'audit_reports', fileSlug: 'Audit-Report-FY2026' },
  { id: 'property-documents', label: 'Property Documents', kind: 'file', documentCategory: 'property_documents', fileSlug: 'Property-Documents' },
  { id: 'lease-agreements', label: 'Lease Agreements', kind: 'file', documentCategory: 'lease_agreements', fileSlug: 'Lease-Agreements' },
  { id: 'cabinet-decisions', label: 'Cabinet Decisions', kind: 'file', documentCategory: 'cabinet_decisions', fileSlug: 'Cabinet-Decisions' },
]

type AssuranceCheckValue = 'yes' | 'no' | 'not_applicable'
type AssuranceFileValue = {
  fileName: string
  evidence: 'uploaded' | 'dummy'
}
type AssuranceCellValue =
  | { kind: 'status'; value: AssuranceCheckValue }
  | { kind: 'file'; value: AssuranceFileValue }

type ComplianceRepositoryRow = {
  organizationId: string
  abbreviation: string
  name: string
  logoSrc?: string
  checks: Record<string, AssuranceCellValue>
  noCount: number
}

function AssuranceCheckCell({ value, label }: { value: AssuranceCheckValue; label: string }) {
  const config = {
    yes: {
      text: 'Yes',
      Icon: Check,
      className: 'bg-[var(--color-success-soft)] text-soe-success ring-soe-success/20',
    },
    no: {
      text: 'No',
      Icon: X,
      className: 'bg-[var(--color-critical-soft)] text-soe-critical ring-soe-critical/20',
    },
    not_applicable: {
      text: 'N/A',
      Icon: Minus,
      className: 'bg-soe-canvas text-soe-slate ring-soe-border',
    },
  }[value]

  return (
    <span
      className={cn(
        'mx-auto inline-flex min-w-[54px] items-center justify-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold ring-1',
        config.className,
      )}
      aria-label={`${label}: ${config.text}`}
      title={`${label}: ${config.text}`}
    >
      <config.Icon className="h-3 w-3" strokeWidth={2} aria-hidden="true" />
      {config.text}
    </span>
  )
}

function dummyAssuranceFileName(abbreviation: string, check: AssuranceCheckDefinition) {
  return `${abbreviation.toUpperCase()}-${check.fileSlug ?? check.label.replace(/\s+/g, '-')}.pdf`
}

function seedFrom(value: string) {
  return value.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0)
}

const CORE_FILE_CHECKS = new Set([
  'annual-report-file',
  'financial-statements',
  'audit-reports',
  'memorandum',
  'articles',
  'board-minutes',
])

const RARE_FILE_CHECKS = new Set([
  'lease-agreements',
  'cabinet-decisions',
  'property-documents',
  'strategic-plan-file',
  'risk-register-file',
])

function resolveAssuranceFileCell(
  organizationId: string,
  abbreviation: string,
  check: AssuranceCheckDefinition,
  document?: { fileName?: string },
): AssuranceCellValue {
  const seed = seedFrom(`${organizationId}:${check.id}`)
  const sparseSoe = seedFrom(organizationId) % 3 === 0
  const notApplicable = RARE_FILE_CHECKS.has(check.id)
    ? seed % 5 > 1
    : CORE_FILE_CHECKS.has(check.id)
      ? seed % 6 === 0 || (sparseSoe && seed % 4 === 0)
      : seed % 3 !== 0 || sparseSoe

  if (notApplicable && (!document || RARE_FILE_CHECKS.has(check.id) || sparseSoe)) {
    return { kind: 'status', value: 'not_applicable' }
  }

  return {
    kind: 'file',
    value: {
      fileName: document?.fileName ?? dummyAssuranceFileName(abbreviation, check),
      evidence: document ? 'uploaded' : 'dummy',
    },
  }
}

function fallbackAssuranceStatus(organizationId: string, checkId: string): AssuranceCheckValue {
  const seed = `${organizationId}-${checkId}`.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0)
  if (checkId === 'environmental' && seed % 6 === 0) return 'not_applicable'
  if (['eobi', 'essi'].includes(checkId) && seed % 7 === 0) return 'not_applicable'
  return seed % 5 === 0 || seed % 11 === 0 ? 'no' : 'yes'
}

function displayAssuranceStatus(
  organizationId: string,
  checkId: string,
  status?: string,
): AssuranceCheckValue {
  if (status === COMPLIANCE_STATUS.NOT_APPLICABLE) return 'not_applicable'
  if (status === COMPLIANCE_STATUS.COMPLIANT) return 'yes'

  const fallback = fallbackAssuranceStatus(organizationId, checkId)
  if (!status) return fallback

  const seed = `${checkId}-${organizationId}-${status}`
    .split('')
    .reduce((sum, char) => sum + char.charCodeAt(0), 0)

  if (
    status === COMPLIANCE_STATUS.OVERDUE ||
    status === COMPLIANCE_STATUS.NON_COMPLIANT
  ) {
    return seed % 4 === 0 ? 'yes' : 'no'
  }

  if (
    status === COMPLIANCE_STATUS.PARTIALLY_COMPLIANT ||
    status === COMPLIANCE_STATUS.PENDING_VERIFICATION
  ) {
    return seed % 4 === 0 ? 'no' : fallback === 'not_applicable' ? 'yes' : fallback
  }

  return fallback
}

function AssuranceFileCell({ value, label }: { value: AssuranceFileValue; label: string }) {
  return (
    <span
      className={cn(
        'mx-auto flex min-h-9 w-full min-w-0 max-w-[172px] items-center gap-2 rounded-md border px-2 py-1.5 text-left shadow-[0_1px_1px_rgba(18,48,74,0.03)]',
        value.evidence === 'uploaded'
          ? 'border-soe-success/20 bg-[var(--color-success-soft)]'
          : 'border-soe-blue/15 bg-[#edf6fc]',
      )}
      aria-label={`${label}: ${value.fileName}`}
      title={`${label}: ${value.fileName}`}
    >
      <span
        className={cn(
          'flex h-6 w-6 shrink-0 items-center justify-center rounded bg-white ring-1',
          value.evidence === 'uploaded' ? 'text-soe-success ring-soe-success/20' : 'text-soe-blue ring-soe-blue/20',
        )}
      >
        <FileText className="h-3.5 w-3.5" strokeWidth={1.8} aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[10px] font-semibold leading-4 text-soe-navy">
          {value.fileName}
        </span>
        <span className="block text-[8px] font-semibold uppercase leading-3 text-soe-slate">
          {value.evidence === 'uploaded' ? 'Uploaded PDF' : 'Dummy PDF'}
        </span>
      </span>
    </span>
  )
}

function AssuranceTableCell({ cell, label }: { cell: AssuranceCellValue; label: string }) {
  return cell.kind === 'file' ? (
    <AssuranceFileCell value={cell.value} label={label} />
  ) : (
    <AssuranceCheckCell value={cell.value} label={label} />
  )
}

function ComplianceRepositoryTable({ rows }: { rows: ComplianceRepositoryRow[] }) {
  return (
    <div className="max-h-[536px] overflow-auto">
      <table className="w-full min-w-[3240px] table-fixed text-left text-[11px]">
        <caption className="sr-only">Cross-SOE compliance checks and document files</caption>
        <colgroup>
          <col className="w-[260px]" />
          {ASSURANCE_CHECKS.map((check) => (
            <col key={check.id} className={check.kind === 'file' ? 'w-[178px]' : 'w-[112px]'} />
          ))}
        </colgroup>
        <thead className="sticky top-0 z-30">
          <tr className="border-b border-soe-border bg-[#eef5f7] text-[10px] font-semibold uppercase tracking-wide text-soe-slate">
            <th className="sticky left-0 z-20 bg-[#eef5f7] px-4 py-3">SOE</th>
            {ASSURANCE_CHECKS.map((check) => (
              <th key={check.id} className="border-l border-soe-border/60 px-2 py-3 text-center">
                <span className="mx-auto block max-w-[150px] whitespace-normal text-[9px] leading-4">
                  {check.label}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-soe-border/80">
          {rows.map((row) => (
            <tr key={row.organizationId} className="group align-middle hover:bg-[#f8fbfc]">
              <td className="sticky left-0 z-10 bg-white px-4 py-3 group-hover:bg-[#f8fbfc]">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-md bg-white text-[10px] font-bold text-soe-blue ring-1 ring-soe-blue/15">
                    {row.logoSrc ? (
                      <img
                        src={row.logoSrc}
                        alt={`${row.name} logo`}
                        className="h-full w-full object-contain p-1"
                        loading="lazy"
                      />
                    ) : (
                      row.abbreviation.slice(0, 4)
                    )}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-soe-navy">{row.abbreviation}</p>
                    <p className="mt-0.5 truncate text-[9px] text-soe-slate" title={row.name}>
                      {row.name}
                    </p>
                  </div>
                </div>
              </td>
              {ASSURANCE_CHECKS.map((check) => (
                <td key={check.id} className="border-l border-soe-border/50 px-2 py-3 text-center">
                  <AssuranceTableCell
                    cell={row.checks[check.id] ?? { kind: 'status', value: 'no' }}
                    label={check.label}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

type SectorTradeChartRow = {
  sector: string
  domesticSales: number
  exports: number
  imports: number
  soeNames: string[]
}

function SectorTradeTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ name?: string; value?: number; color?: string; payload?: SectorTradeChartRow }>
  label?: string
}) {
  if (!active || !payload?.length) return null

  const soeNames = payload[0]?.payload?.soeNames ?? []

  return (
    <div className="max-w-xs rounded-md border border-soe-border bg-white px-3 py-2 text-xs shadow-[var(--shadow-sm)]">
      <p className="font-semibold text-soe-navy">{label}</p>
      <div className="mt-1.5 space-y-0.5">
        {payload.map((entry) => (
          <p key={entry.name} className="tabular-nums text-soe-slate">
            <span className="font-medium" style={{ color: entry.color }}>
              {entry.name}
            </span>
            : {formatCurrencyPkr(Number(entry.value))}
          </p>
        ))}
      </div>
      {soeNames.length ? (
        <div className="mt-2 border-t border-soe-border pt-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-soe-slate">
            SOEs ({soeNames.length})
          </p>
          <ul className="mt-1 max-h-28 space-y-0.5 overflow-y-auto text-soe-navy">
            {soeNames.map((name) => (
              <li key={name}>{name}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}

function BoardCompositionStatCard({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone: 'success' | 'critical' | 'warning'
}) {
  return <ExplorerStatCard label={label} value={value} tone={tone} />
}

function BoardMemberMetricBadge({
  label,
  value,
  variant = 'neutral',
  onDark = false,
}: {
  label: string
  value: string
  variant?: 'success' | 'warning' | 'critical' | 'neutral'
  onDark?: boolean
}) {
  return (
    <div
      className={cn(
        'flex min-h-[34px] min-w-[72px] flex-col items-center justify-center rounded-md px-2 py-1 text-center',
        onDark
          ? 'bg-white/15 ring-1 ring-white/20'
          : variant === 'success'
            ? 'bg-soe-success/12 ring-1 ring-soe-success/25'
            : variant === 'warning'
              ? 'bg-soe-warning/12 ring-1 ring-soe-warning/25'
              : variant === 'critical'
                ? 'bg-soe-critical/12 ring-1 ring-soe-critical/25'
                : 'bg-soe-canvas ring-1 ring-soe-border',
      )}
    >
      <p className={cn('text-[8px] font-medium leading-none', onDark ? 'text-white/70' : 'text-soe-slate')}>
        {label}
      </p>
      <p
        className={cn(
          'mt-0.5 text-[10px] font-semibold tabular-nums leading-none',
          onDark
            ? 'text-white'
            : variant === 'success'
              ? 'text-soe-success'
              : variant === 'warning'
                ? 'text-soe-warning'
                : variant === 'critical'
                  ? 'text-soe-critical'
                  : 'text-soe-navy',
        )}
      >
        {value}
      </p>
    </div>
  )
}

function boardStatusBadgeVariant(
  status: string,
): 'success' | 'warning' | 'critical' {
  if (status === 'Active') return 'success'
  if (status === 'Expired') return 'warning'
  return 'critical'
}

function officialVehicleLabel(assignment: OfficialVehicleAssignment) {
  if (assignment === 'dedicated') return 'Dedicated'
  if (assignment === 'pool') return 'Pool'
  return 'None'
}

function facilityFuelLabel(value: string) {
  return value.replace('/month', '/mo')
}

function facilityMedicalLabel(value: string) {
  return value.replace(/^Yes · /, '').replace('hospitalization', 'Hosp.').replace('dependents', 'dep.')
}

function facilityAllowanceLabel(value: string) {
  return value.replace('/month', '/mo')
}

function hashFacilitySeed(seed: string): number {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function shuffleSeeded<T>(items: T[], seed: string): T[] {
  const next = [...items]
  let h = hashFacilitySeed(seed)
  for (let i = next.length - 1; i > 0; i--) {
    h = (Math.imul(h, 1664525) + 1013904223) >>> 0
    const j = h % (i + 1)
    ;[next[i], next[j]] = [next[j], next[i]]
  }
  return next
}

interface BoardFacilityDisplayItem {
  kind: string
  label: string
  value: string
  icon: LucideIcon
  assigned: boolean
}

function catalogBoardFacilities(facilities: BoardMemberAssignedFacilities): BoardFacilityDisplayItem[] {
  const fuel = facilityFuelLabel(facilities.fuelAllowance)
  const medical = facilityMedicalLabel(facilities.medicalFacility)
  const comm = facilityAllowanceLabel(facilities.communicationAllowance)
  return [
    {
      kind: 'vehicle',
      label: 'Vehicle',
      value: officialVehicleLabel(facilities.officialVehicle),
      icon: Car,
      assigned: facilities.officialVehicle !== 'none',
    },
    {
      kind: 'fuel',
      label: 'Fuel',
      value: fuel,
      icon: Fuel,
      assigned: fuel !== 'None',
    },
    {
      kind: 'residence',
      label: 'Residence',
      value: facilities.officialResidence ? 'Yes' : 'No',
      icon: Home,
      assigned: facilities.officialResidence,
    },
    {
      kind: 'office',
      label: 'Office',
      value: facilities.officeSecretariat ? 'Yes' : 'No',
      icon: Building2,
      assigned: facilities.officeSecretariat,
    },
    {
      kind: 'laptop',
      label: 'Laptop',
      value: facilities.laptopComputer ? 'Yes' : 'No',
      icon: Laptop,
      assigned: facilities.laptopComputer,
    },
    {
      kind: 'mobile',
      label: 'Mobile',
      value: facilities.mobileHandset ? 'Yes' : 'No',
      icon: Smartphone,
      assigned: facilities.mobileHandset,
    },
    {
      kind: 'comm',
      label: 'Allowance',
      value: comm,
      icon: Phone,
      assigned: comm !== 'None',
    },
    {
      kind: 'internet',
      label: 'Internet',
      value: facilities.internetFacility ? 'Yes' : 'No',
      icon: Wifi,
      assigned: facilities.internetFacility,
    },
    {
      kind: 'travel',
      label: 'Travel',
      value: facilities.travelFacility,
      icon: Plane,
      assigned: facilities.travelFacility !== 'None',
    },
    {
      kind: 'medical',
      label: 'Medical',
      value: medical === 'No' ? 'No' : medical,
      icon: HeartPulse,
      assigned: medical !== 'No',
    },
    {
      kind: 'security',
      label: 'Security',
      value: facilities.securityVehicle === 'authorized' ? 'Authorized' : 'None',
      icon: ShieldCheck,
      assigned: facilities.securityVehicle === 'authorized',
    },
    {
      kind: 'other',
      label: 'Other',
      value: facilities.otherAssignedAsset,
      icon: Package,
      assigned: facilities.otherAssignedAsset !== 'None',
    },
  ]
}

function pickBoardFacilityDisplayItems(
  memberId: string,
  facilities: BoardMemberAssignedFacilities,
): BoardFacilityDisplayItem[] {
  const catalog = catalogBoardFacilities(facilities)
  const assigned = shuffleSeeded(
    catalog.filter((item) => item.assigned),
    `${memberId}-assigned`,
  )
  const unassigned = shuffleSeeded(
    catalog.filter((item) => !item.assigned),
    `${memberId}-unassigned`,
  )
  const wantAssigned = 2 + (hashFacilitySeed(memberId) % 3)
  const selected: BoardFacilityDisplayItem[] = assigned.slice(0, wantAssigned)
  for (const item of unassigned) {
    if (selected.length >= 4) break
    selected.push(item)
  }
  for (const item of assigned) {
    if (selected.length >= 4) break
    if (!selected.some((row) => row.kind === item.kind)) selected.push(item)
  }
  return shuffleSeeded(selected, `${memberId}-order`).slice(0, 4)
}

function BoardFacilityStripCell({
  icon: Icon,
  label,
  value,
  iconClassName,
  surfaceClassName,
  valueClassName,
}: {
  icon: LucideIcon
  label: string
  value: string
  iconClassName: string
  surfaceClassName: string
  valueClassName?: string
}) {
  return (
    <div className={cn('flex min-w-0 flex-col items-center px-1 py-1.5 text-center', surfaceClassName)}>
      <Icon className={cn('h-3.5 w-3.5', iconClassName)} strokeWidth={1.75} aria-hidden="true" />
      <p className="mt-0.5 text-[8px] font-medium text-soe-slate">{label}</p>
      <p
        className={cn('mt-0.5 w-full truncate text-[10px] font-semibold text-soe-navy', valueClassName)}
        title={value}
      >
        {value}
      </p>
    </div>
  )
}

function BoardMemberFacilitiesStrip({
  memberId,
  facilities,
}: {
  memberId: string
  facilities: NonNullable<BoardMember['assignedFacilities']>
}) {
  const items = pickBoardFacilityDisplayItems(memberId, facilities)
  return (
    <div
      className="grid grid-cols-4 divide-x divide-[#16877A]/20 border-t border-[#16877A]/20 bg-gradient-to-r from-[#12665d]/12 to-[#16877A]/8"
      aria-label="Assigned facilities"
    >
      {items.map((item) => (
        <BoardFacilityStripCell
          key={item.kind}
          icon={item.icon}
          label={item.label}
          value={item.value}
          iconClassName="text-[#16877A]"
          surfaceClassName="bg-transparent"
          valueClassName={item.assigned ? 'text-[#0f4f48]' : 'text-soe-slate'}
        />
      ))}
    </div>
  )
}

function assetCategoryInsights(
  modId: string,
  typed: Asset[],
  orgAssets: Asset[],
  mappedCount: number,
  totalMarket: number,
) {
  const marketValue = typed.reduce((sum, item) => sum + (item.marketValue ?? 0), 0)
  const bookValue = typed.reduce((sum, item) => sum + (item.bookValue ?? 0), 0)
  const sharePct = totalMarket > 0 ? Math.round((marketValue / totalMarket) * 100) : 0

  if (modId === 'map') {
    const geoAssets = orgAssets.filter(
      (item) => item.latitude != null && item.longitude != null,
    )
    const mappedPct = orgAssets.length ? Math.round((mappedCount / orgAssets.length) * 100) : 0
    return {
      focusValue: undefined as string | undefined,
      focusUnit: undefined as string | undefined,
      focusLabel: undefined as string | undefined,
      bookValue: geoAssets.reduce((sum, item) => sum + (item.bookValue ?? 0), 0),
      sharePct: mappedPct,
    }
  }

  if (modId === 'land') {
    const acres = typed.reduce((sum, item) => sum + (item.areaAcres ?? 0), 0)
    return {
      focusValue: acres > 0 ? compactNumber(acres) : undefined,
      focusUnit: acres > 0 ? 'ac' : undefined,
      focusLabel: acres > 0 ? 'total area' : undefined,
      bookValue,
      sharePct,
    }
  }

  if (modId === 'buildings') {
    const floorArea = typed.reduce((sum, item) => sum + (item.floorAreaSqFt ?? 0), 0)
    return {
      focusValue: floorArea > 0 ? compactNumber(floorArea) : undefined,
      focusUnit: floorArea > 0 ? 'sqft' : undefined,
      focusLabel: undefined as string | undefined,
      bookValue,
      sharePct,
    }
  }

  return {
    focusValue: undefined as string | undefined,
    focusUnit: undefined as string | undefined,
    focusLabel: undefined as string | undefined,
    bookValue,
    sharePct,
  }
}

function AssetModuleCard({
  icon: Icon,
  label,
  focusValue,
  focusUnit,
  focusLabel,
  count,
  value,
  bookValue,
  sharePct,
}: {
  icon: LucideIcon
  label: string
  focusValue?: string
  focusUnit?: string
  focusLabel?: string
  count: number
  value: number
  bookValue: number
  sharePct: number
}) {
  return (
    <article className="flex h-full min-h-0 flex-col overflow-hidden rounded-lg border border-[#009FDA]/20 bg-white shadow-[0_4px_12px_rgba(18,48,74,0.08)]">
      <div className="flex shrink-0 items-center gap-1.5 bg-[#0369a1] px-2 py-1.5">
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-white/15">
          <Icon className="h-3.5 w-3.5 text-white" strokeWidth={1.75} aria-hidden="true" />
        </div>
        <p className="min-w-0 flex-1 truncate text-[11px] font-semibold text-white">{label}</p>
        <p className="shrink-0 text-sm font-semibold tabular-nums leading-none text-white">{count}</p>
      </div>
      <div className="flex min-h-0 flex-1 items-start justify-between gap-1.5 px-2 py-1.5">
        {focusValue ? (
          <p className="min-w-0 truncate leading-none">
            <span className="text-sm font-semibold tabular-nums tracking-tight text-[#08698e]">
              {focusValue}
            </span>
            {focusUnit ? (
              <span className="ml-1 text-[10px] font-semibold text-[#08698e]">{focusUnit}</span>
            ) : null}
            {focusLabel ? (
              <span className="ml-1 text-[9px] font-medium text-soe-slate">{focusLabel}</span>
            ) : null}
          </p>
        ) : (
          <span />
        )}
        <div className="shrink-0 text-right">
          <p className="text-[10px] font-semibold tabular-nums text-[#08698e]">{formatCurrencyPkr(value)}</p>
          {bookValue > 0 ? (
            <p className="mt-0.5 text-[8px] tabular-nums text-soe-slate">
              Book {formatCurrencyPkr(bookValue)}
            </p>
          ) : null}
        </div>
      </div>
      <div className="shrink-0 px-2 pb-1.5">
        <p className="mb-0.5 text-[9px] font-semibold tabular-nums leading-none text-[#08698e]">
          {sharePct}%
        </p>
        <div className="h-1.5 overflow-hidden rounded-full bg-[#c5ebf5]">
          <div
            className="h-full rounded-full bg-[#009FDA]"
            style={{ width: `${Math.max(0, Math.min(100, sharePct))}%` }}
          />
        </div>
      </div>
    </article>
  )
}

const EXPLORER_BODY_H = 'h-[420px]'

function ExplorerColumnHeader({
  icon: Icon,
  title,
  badge,
  tone,
}: {
  icon: LucideIcon
  title: string
  badge?: string
  tone: 'soes' | 'board' | 'assets'
}) {
  const toneStyles = {
    soes: {
      shell: 'bg-gradient-to-r from-[#12304a] to-[#1d5d8f]',
      icon: 'bg-white/15 text-white',
      title: 'text-white',
      badge: 'bg-white/15 text-white ring-white/20',
    },
    board: {
      shell: 'bg-gradient-to-r from-[#12665d] to-[#16877A]',
      icon: 'bg-white/15 text-white',
      title: 'text-white',
      badge: 'bg-white/15 text-white ring-white/20',
    },
    assets: {
      shell: 'bg-gradient-to-r from-[#0369a1] to-[#12304a]',
      icon: 'bg-white/15 text-white',
      title: 'text-white',
      badge: 'bg-white/15 text-white ring-white/20',
    },
  }[tone]

  return (
    <div
      className={cn(
        'flex h-10 shrink-0 items-center justify-between gap-2 px-3',
        toneStyles.shell,
      )}
    >
      <div className="flex min-w-0 items-center gap-2">
        <span
          className={cn(
            'flex h-6 w-6 shrink-0 items-center justify-center rounded-md',
            toneStyles.icon,
          )}
        >
          <Icon className="h-3.5 w-3.5" strokeWidth={1.8} aria-hidden="true" />
        </span>
        <p className={cn('truncate text-[10px] font-semibold uppercase tracking-wide', toneStyles.title)}>
          {title}
        </p>
      </div>
      {badge ? (
        <span
          className={cn(
            'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium tabular-nums ring-1',
            toneStyles.badge,
          )}
        >
          {badge}
        </span>
      ) : null}
    </div>
  )
}

/** Filenames under /public/images — keyed by organization abbreviation. */
const SOE_LOGO_BY_ABBREV: Record<string, string> = {
  PIDC: '/images/pidc.jpg',
  USC: '/images/utility.jpg',
  PECO: '/images/peco.png',
  NFML: '/images/nfml.jpg',
  PASDEC: '/images/pasdec.png',
  TUSDEC: '/images/tusdec.png',
  SMEDA: '/images/smeda.jpg',
  PITAC: '/images/pitac.png',
  NFC: '/images/nfc.png',
  PSM: '/images/psm.png',
}

function soeLogoSrc(abbreviation: string) {
  return SOE_LOGO_BY_ABBREV[abbreviation.toUpperCase()]
}

type BoardDisplayProfile = {
  name: string
  role: string
  photoUrl?: string
  photoKind?: 'public' | 'synthetic'
}

const SYNTHETIC_BOARD_AVATARS = [
  '/images/board-members/nfc-synthetic-board-03.png',
  '/images/board-members/nfc-synthetic-board-01.png',
  '/images/board-members/nfc-synthetic-board-04.png',
  '/images/board-members/nfc-synthetic-board-02.png',
] as const

const SYNTHETIC_WOMAN_BOARD_AVATAR = '/images/board-members/synthetic-board-female-01.png'

const NFC_BOARD_PROFILES: BoardDisplayProfile[] = [
  {
    name: 'Tanveer Ashraf Kaira',
    role: 'Chairman',
    photoUrl: 'https://moip.gov.pk/SiteImage/NewsEvents/Meeting%20with%20Chairman%20NFC1.jpeg',
    photoKind: 'public',
  },
  { name: 'Abdul Qayyum Malik', role: 'Director' },
  { name: 'Ahmad Baksh Tarar', role: 'Director' },
  {
    name: 'Rana Tariq Mehmood',
    role: 'Director',
    photoUrl: 'https://ghpl.com.pk/wp-content/uploads/2026/01/Mr.-Rana-Tariq-Mehmood.png',
    photoKind: 'public',
  },
  { name: 'Qabool Muhammad', role: 'Director' },
  { name: 'Irshad Ilahi', role: 'Director' },
  { name: 'Adeel Durrani', role: 'Director' },
]

function hashBoardAvatarSeed(seed: string) {
  return Array.from(seed).reduce((hash, char) => (hash * 31 + char.charCodeAt(0)) >>> 0, 0)
}

function syntheticBoardAvatarSrc(member: BoardMember) {
  if (member.memberType === DIRECTOR_TYPE.WOMAN_DIRECTOR) return SYNTHETIC_WOMAN_BOARD_AVATAR
  return SYNTHETIC_BOARD_AVATARS[
    hashBoardAvatarSeed(`${member.organizationId}:${member.id}:${member.name}`) %
      SYNTHETIC_BOARD_AVATARS.length
  ]
}

function boardDisplayProfile(member: BoardMember, organizationId: string | undefined, index: number) {
  if (boardStatusLabel(member) === 'Vacant') return undefined
  const nfcProfile = organizationId === 'org-nfc' ? NFC_BOARD_PROFILES[index] : undefined

  return {
    name: nfcProfile?.name ?? member.name,
    role: nfcProfile?.role ?? member.role,
    photoUrl: nfcProfile?.photoUrl ?? syntheticBoardAvatarSrc(member),
    photoKind: nfcProfile?.photoKind ?? 'synthetic',
  } satisfies BoardDisplayProfile
}

function boardDisplayStatus(member: BoardMember) {
  return boardStatusLabel(member)
}

function SoeLogoMark({
  abbreviation,
  name,
  active,
}: {
  abbreviation: string
  name: string
  active?: boolean
}) {
  const [failed, setFailed] = useState(false)
  const src = soeLogoSrc(abbreviation)

  return (
    <div
      className={cn(
        'relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-[12px] border bg-white p-1.5',
        active
          ? 'border-white/50 shadow-[0_6px_14px_rgba(0,0,0,0.22)] ring-2 ring-white/30'
          : 'border-soe-blue/15 shadow-[0_4px_10px_rgba(18,48,74,0.10)] ring-1 ring-soe-blue/10',
      )}
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(145deg,rgba(255,255,255,0.95)_0%,rgba(232,242,250,0.7)_100%)]"
        aria-hidden
      />
      {src && !failed ? (
        <img
          src={src}
          alt={`${name} logo`}
          className="relative z-[1] h-full w-full object-contain"
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="relative z-[1] text-[11px] font-semibold tracking-wide text-soe-navy">
          {abbreviation.slice(0, 3)}
        </span>
      )}
    </div>
  )
}

function soeStatusPillClass(status: SoeStatus, active: boolean) {
  if (active) return 'bg-white/15 text-white ring-white/25'
  if (status === 'active') return 'bg-soe-success/15 text-soe-success ring-soe-success/25'
  if (status === 'dormant' || status === 'under_privatization') {
    return 'bg-soe-warning/15 text-soe-warning ring-soe-warning/25'
  }
  return 'bg-soe-critical/15 text-soe-critical ring-soe-critical/25'
}

function SoePortfolioCard({
  soe,
  active,
  onSelect,
}: {
  soe: HealthRow
  active: boolean
  onSelect: (id: string) => void
}) {
  const legalStatus = LEGAL_STATUS_LABEL[soe.legalStatus as keyof typeof LEGAL_STATUS_LABEL] ?? soe.legalStatus
  const soeStatus = SOE_STATUS_LABEL[soe.status] ?? soe.status

  return (
    <button
      type="button"
      onClick={() => onSelect(soe.organizationId)}
      className={cn(
        'relative w-full overflow-hidden rounded-[12px] p-2.5 text-left shadow-[0_4px_12px_rgba(18,48,74,0.08)] transition-transform',
        active
          ? 'bg-gradient-to-br from-[#12304a] via-[#164a6e] to-[#1d5d8f] text-white shadow-[0_8px_18px_rgba(18,48,74,0.22)]'
          : 'bg-gradient-to-br from-[#d4e4f2] to-[#c3d7ea] ring-1 ring-soe-blue/15 hover:-translate-y-px hover:shadow-[0_8px_16px_rgba(18,48,74,0.12)]',
      )}
    >
      {active ? (
        <span className="pointer-events-none absolute -right-6 -top-8 h-16 w-16 rounded-full bg-white/10" aria-hidden />
      ) : null}
      <div className="flex items-start gap-2.5">
        <SoeLogoMark abbreviation={soe.abbreviation} name={soe.name} active={active} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className={cn('min-w-0 truncate text-xs font-semibold', active ? 'text-white' : 'text-soe-navy')}>
              {soe.abbreviation}
            </p>
            <span
              className={cn(
                'max-w-[7.5rem] shrink-0 rounded-full px-1.5 py-0.5 text-right text-[8px] font-semibold leading-tight ring-1',
                soeStatusPillClass(soe.status, active),
              )}
            >
              {soeStatus}
            </span>
          </div>
          <p className={cn('mt-0.5 text-[10px] leading-snug', active ? 'text-white/70' : 'text-[#3d5a73]')}>
            {soe.name}
          </p>
          <div className="mt-2 flex items-start justify-between gap-2">
            <span
              className={cn(
                'inline-flex min-w-0 items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-medium ring-1',
                active ? 'bg-white/12 text-white/80 ring-white/20' : 'bg-white/70 text-soe-blue ring-soe-blue/20',
              )}
            >
              <MapPinned className="h-2.5 w-2.5 shrink-0" strokeWidth={2} aria-hidden />
              <span>{soe.province || '—'}</span>
            </span>
            <span
              className={cn(
                'max-w-[58%] text-right text-[9px] font-medium leading-tight',
                active ? 'text-white/85' : 'text-soe-navy',
              )}
              title={legalStatus}
            >
              {legalStatus || '—'}
            </span>
          </div>
        </div>
      </div>
    </button>
  )
}

function BoardMemberAvatar({
  name,
  photoUrl,
  photoKind,
  statusColor,
  isVacant,
}: {
  name: string
  photoUrl?: string
  photoKind?: BoardDisplayProfile['photoKind']
  statusColor: string
  isVacant: boolean
}) {
  const [failed, setFailed] = useState(false)
  const showPhoto = Boolean(photoUrl && !failed && !isVacant)

  return (
    <div
      className={cn(
        'relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full text-[10px] font-semibold',
        isVacant
          ? 'border border-dashed border-soe-critical/40 bg-white text-soe-critical'
          : showPhoto
            ? 'border border-white bg-soe-canvas text-soe-navy ring-2'
            : 'bg-soe-navy text-white ring-2',
      )}
      style={!isVacant ? { ['--tw-ring-color' as string]: statusColor } : undefined}
    >
      {showPhoto ? (
        <img
          src={photoUrl}
          alt={photoKind === 'synthetic' ? `Synthetic placeholder avatar for ${name}` : `${name} portrait`}
          className="h-full w-full object-cover"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
        />
      ) : (
        <span aria-hidden="true">{isVacant ? '—' : boardInitials(name)}</span>
      )}
      {!isVacant ? (
        <span
          className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-white"
          style={{ backgroundColor: statusColor }}
        />
      ) : null}
    </div>
  )
}

function SoeExplorerPanel({
  soes,
  selectedId,
  onSelect,
  boardMembers,
  assets,
  mappedCount,
}: {
  soes: HealthRow[]
  selectedId?: string
  onSelect: (id: string) => void
  boardMembers: BoardMember[]
  assets: Asset[]
  mappedCount: number
}) {
  const selected = soes.find((row) => row.organizationId === selectedId) ?? soes[0]
  const members = selected
    ? boardMembers.filter((item) => item.organizationId === selected.organizationId)
    : []
  const orgAssets = selected
    ? assets.filter((item) => item.organizationId === selected.organizationId)
    : []
  const totalMarket = orgAssets.reduce((sum, item) => sum + (item.marketValue ?? 0), 0)
  const totalBook = orgAssets.reduce((sum, item) => sum + (item.bookValue ?? 0), 0)
  const registryMod = ASSET_MODULE_DEFS.find((mod) => mod.kind === 'registry')!
  const typeModules = ASSET_MODULE_DEFS.filter((mod) => mod.kind !== 'registry').map((mod) => {
    if (mod.kind === 'map') {
      const geoAssets = orgAssets.filter(
        (item) => item.latitude != null && item.longitude != null,
      )
      const insights = assetCategoryInsights('map', geoAssets, orgAssets, mappedCount, totalMarket)
      return {
        ...mod,
        count: mappedCount,
        value: geoAssets.reduce((sum, item) => sum + (item.marketValue ?? 0), 0),
        focusValue: insights.focusValue,
        focusUnit: insights.focusUnit,
        focusLabel: insights.focusLabel,
        bookValue: insights.bookValue,
        sharePct: insights.sharePct,
      }
    }
    const typed = orgAssets.filter((item) => mod.types?.includes(item.assetType))
    const insights = assetCategoryInsights(mod.id, typed, orgAssets, mappedCount, totalMarket)
    return {
      ...mod,
      count: typed.length,
      value: typed.reduce((sum, item) => sum + (item.marketValue ?? 0), 0),
      focusValue: insights.focusValue,
      focusUnit: insights.focusUnit,
      focusLabel: insights.focusLabel,
      bookValue: insights.bookValue,
      sharePct: insights.sharePct,
    }
  })
  const riskStats = [
    {
      label: 'Idle',
      value: orgAssets.filter(
        (item) =>
          item.utilizationStatus === ASSET_UTILIZATION.IDLE ||
          item.utilizationStatus === ASSET_UTILIZATION.UNUSED,
      ).length,
      tone: 'warning' as const,
    },
    {
      label: 'Encroached',
      value: orgAssets.filter(
        (item) =>
          item.assetType === ASSET_TYPE.LAND &&
          item.encroachmentStatus === ENCROACHMENT_STATUS.ENCROACHED,
      ).length,
      tone: 'critical' as const,
    },
    {
      label: 'Litigation',
      value: orgAssets.filter((item) => item.litigationStatus === ASSET_LITIGATION_STATUS.ACTIVE)
        .length,
      tone: 'critical' as const,
    },
    {
      label: 'Valuation gaps',
      value: orgAssets.filter((item) => item.marketValue == null || item.bookValue == null).length,
      tone: 'neutral' as const,
    },
  ]
  const boardRows = members.map((member, index) => ({
    member,
    profile: boardDisplayProfile(member, selected?.organizationId, index),
  }))

  return (
    <section
      className="mt-3 overflow-hidden rounded-[6px] border border-soe-border border-t-[3px] border-t-soe-blue bg-white shadow-[0_8px_24px_rgba(18,48,74,0.10)]"
      aria-label="Enterprise snapshot"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/15 bg-soe-navy px-4 py-2.5">
        <div>
          <h2 className="text-sm font-semibold text-white">Enterprise snapshot</h2>
          <p className="text-[10px] text-white/70">
            Select an SOE to view board composition and asset register
          </p>
        </div>
        {selected ? (
          <span className="rounded-control border border-white/20 bg-white/10 px-2.5 py-1 text-[11px] font-medium text-white shadow-[0_1px_2px_rgba(0,0,0,0.08)]">
            {selected.abbreviation}
            <span className="text-white/65"> · {selected.sector}</span>
          </span>
        ) : null}
      </div>

      <div className="grid lg:grid-cols-5 lg:items-stretch">
        <div className="flex flex-col border-b border-soe-blue/20 lg:col-span-1 lg:border-b-0 lg:border-r">
          <ExplorerColumnHeader icon={Building2} title={`SOEs · ${soes.length}`} tone="soes" />
          <div className={cn('scrollbar-soft space-y-1.5 overflow-y-auto bg-soe-canvas/40 p-2', EXPLORER_BODY_H)}>
            {soes.map((soe) => (
              <SoePortfolioCard
                key={soe.organizationId}
                soe={soe}
                active={soe.organizationId === selected?.organizationId}
                onSelect={onSelect}
              />
            ))}
          </div>
        </div>

        <div className="flex flex-col border-b border-[#16877A]/20 lg:col-span-2 lg:border-b-0 lg:border-r">
          <ExplorerColumnHeader
            icon={ShieldCheck}
            title="Board members"
            badge={`${members.length} seats`}
            tone="board"
          />
          <div className={cn('flex flex-col overflow-hidden bg-soe-canvas/40 p-3', EXPLORER_BODY_H)}>
            {members.length ? (
              <>
                {(() => {
                  const activeCount = boardRows.filter(
                    ({ member }) => boardDisplayStatus(member) === 'Active',
                  ).length
                  const vacantCount = boardRows.filter(
                    ({ member }) => boardDisplayStatus(member) === 'Vacant',
                  ).length
                  const expiredCount = boardRows.filter(
                    ({ member }) => boardDisplayStatus(member) === 'Expired',
                  ).length
                  return (
                    <div
                      className="mb-2 grid shrink-0 grid-cols-3 gap-1.5"
                      role="group"
                      aria-label={`Board composition: ${activeCount} active, ${vacantCount} vacant, ${expiredCount} expired`}
                    >
                      <BoardCompositionStatCard label="Active" value={activeCount} tone="success" />
                      <BoardCompositionStatCard label="Vacant" value={vacantCount} tone="critical" />
                      <BoardCompositionStatCard label="Expired" value={expiredCount} tone="warning" />
                    </div>
                  )
                })()}

                <div className="scrollbar-soft min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-0.5">
                  {boardRows.map(({ member, profile }) => {
                    const status = boardDisplayStatus(member)
                    const isVacant = status === 'Vacant'
                    const displayName = profile?.name ?? member.name
                    const displayRole = profile?.role ?? member.role
                    const committeeCount = member.committeeIds?.length ?? 0
                    const directorLabel =
                      DIRECTOR_TYPE_LABEL[member.memberType] ?? member.memberType
                    return (
                      <article
                        key={member.id}
                        className="overflow-hidden rounded-lg border border-soe-border/70 bg-white shadow-[0_4px_12px_rgba(18,48,74,0.08)]"
                      >
                        <div
                          className={cn(
                            'flex items-center gap-2 px-2 py-2',
                            isVacant && 'bg-gradient-to-r from-[#8f3333] to-[#b84242]',
                            status === 'Expired' && !isVacant && 'bg-gradient-to-r from-[#9a6b12] to-[#C58A19]',
                            status === 'Active' && 'bg-gradient-to-r from-[#12665d] to-[#16877A]',
                          )}
                        >
                          <BoardMemberAvatar
                            name={displayName}
                            photoUrl={profile?.photoUrl}
                            photoKind={profile?.photoKind}
                            statusColor="#ffffff"
                            isVacant={isVacant}
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-semibold text-white">
                              {isVacant ? 'Vacancy slot' : displayName}
                            </p>
                            <p className="truncate text-[10px] text-white/75">
                              {displayRole}
                              <span className="text-white/40"> · </span>
                              {directorLabel}
                            </p>
                          </div>
                          <div className="flex shrink-0 items-stretch gap-1">
                            <BoardMemberMetricBadge
                              label="Status"
                              value={status}
                              variant={boardStatusBadgeVariant(status)}
                              onDark
                            />
                            {!isVacant && member.attendancePct != null ? (
                              <BoardMemberMetricBadge
                                label="Attendance"
                                value={`${member.attendancePct}%`}
                                variant={member.attendancePct < 75 ? 'warning' : 'neutral'}
                                onDark
                              />
                            ) : null}
                          </div>
                        </div>

                        {isVacant ? (
                          <p className="border-t border-soe-critical/15 px-2 py-1.5 text-[10px] text-soe-critical">
                            Seat open — {directorLabel.toLowerCase()} director pending appointment.
                          </p>
                        ) : member.assignedFacilities ? (
                          <>
                            <BoardMemberFacilitiesStrip
                              memberId={member.id}
                              facilities={member.assignedFacilities}
                            />
                            {committeeCount > 0 ? (
                              <p className="border-t border-soe-border/40 px-2 py-0.5 text-[9px] text-soe-slate">
                                {committeeCount} committee{committeeCount === 1 ? '' : 's'}
                              </p>
                            ) : null}
                          </>
                        ) : null}
                      </article>
                    )
                  })}
                </div>
              </>
            ) : (
              <p className="flex flex-1 items-center justify-center rounded-md border border-dashed border-[#16877A]/25 bg-white/60 px-3 text-center text-xs text-soe-slate">
                No board records for this SOE.
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-col lg:col-span-2">
          <ExplorerColumnHeader
            icon={Layers3}
            title="Assets & Property"
            badge={`${orgAssets.length} assets`}
            tone="assets"
          />
          <div className={cn('flex flex-col overflow-hidden bg-soe-canvas/40 p-3', EXPLORER_BODY_H)}>
            <div className="mb-2 shrink-0 overflow-hidden rounded-lg bg-gradient-to-r from-[#0369a1] to-[#12304a] p-2.5 text-white shadow-[0_4px_12px_rgba(18,48,74,0.12)]">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-white/15">
                  <registryMod.icon className="h-4 w-4 text-white" strokeWidth={1.75} aria-hidden="true" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-white/70">{registryMod.label}</p>
                  <p className="text-base font-semibold tabular-nums leading-tight text-white">
                    {formatCurrencyPkr(totalMarket)}
                  </p>
                </div>
                <div className="flex shrink-0 divide-x divide-white/20 text-right">
                  <div className="px-2.5">
                    <p className="text-[9px] font-medium uppercase tracking-wide text-white/65">Registered</p>
                    <p className="mt-0.5 text-xs font-semibold tabular-nums text-white">{orgAssets.length}</p>
                  </div>
                  <div className="px-2.5">
                    <p className="text-[9px] font-medium uppercase tracking-wide text-white/65">Book</p>
                    <p className="mt-0.5 text-xs font-semibold tabular-nums text-white">
                      {formatCurrencyPkr(totalBook)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="min-h-0 flex-1">
              <div className="grid h-full grid-cols-2 grid-rows-3 gap-2">
                {typeModules.map((mod) => (
                  <AssetModuleCard
                    key={mod.id}
                    icon={mod.icon}
                    label={mod.label}
                    focusValue={mod.focusValue}
                    focusUnit={mod.focusUnit}
                    focusLabel={mod.focusLabel}
                    count={mod.count}
                    value={mod.value}
                    bookValue={mod.bookValue}
                    sharePct={mod.sharePct}
                  />
                ))}
              </div>
            </div>

            <div className="mt-2 grid shrink-0 grid-cols-4 gap-1.5">
              {riskStats.map((item) => (
                <ExplorerStatCard
                  key={item.label}
                  label={item.label}
                  value={item.value}
                  tone={item.tone}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

const BREAKDOWN_ROW_HEIGHT_REM = 1.625
const BREAKDOWN_ROW_GAP_REM = 0.25

type PulseBreakdownRow = {
  label: string
  value: string | number
  icon?: LucideIcon
  iconClassName?: string
  iconBgClassName?: string
  iconNode?: ReactNode
}

function ChinaFlagIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 30 20" className={className} aria-hidden="true">
      <rect width="30" height="20" fill="#DE2910" rx="0.5" />
      <polygon
        fill="#FFDE00"
        points="7,3.5 8.05,6.35 11.1,6.35 8.55,8.2 9.6,11.05 7,9.2 4.4,11.05 5.45,8.2 2.9,6.35 5.95,6.35"
      />
      <polygon fill="#FFDE00" points="12.8,2.2 13.15,3.05 14.05,3.05 13.35,3.55 13.7,4.4 12.8,3.85 11.9,4.4 12.25,3.55 11.55,3.05 12.45,3.05" />
      <polygon fill="#FFDE00" points="14.6,4.3 14.95,5.15 15.85,5.15 15.15,5.65 15.5,6.5 14.6,5.95 13.7,6.5 14.05,5.65 13.35,5.15 14.25,5.15" />
      <polygon fill="#FFDE00" points="14.6,7.4 14.95,8.25 15.85,8.25 15.15,8.75 15.5,9.6 14.6,9.05 13.7,9.6 14.05,8.75 13.35,8.25 14.25,8.25" />
      <polygon fill="#FFDE00" points="12.8,9.5 13.15,10.35 14.05,10.35 13.35,10.85 13.7,11.7 12.8,11.15 11.9,11.7 12.25,10.85 11.55,10.35 12.45,10.35" />
    </svg>
  )
}

function PulseMetric({
  label,
  value,
  detail,
  breakdown,
  breakdownMaxVisible,
  valueAddon,
  icon: Icon,
  tone = 'neutral',
  detailMultiline = false,
}: {
  label: string
  value: string
  detail?: string
  breakdown?: PulseBreakdownRow[]
  breakdownMaxVisible?: number
  valueAddon?: { label: string; value: string; icon?: LucideIcon }
  icon: LucideIcon
  tone?: 'neutral' | 'positive' | 'warning' | 'critical'
  detailMultiline?: boolean
}) {
  const toneClass = {
    neutral: 'text-soe-blue',
    positive: 'text-soe-success',
    warning: 'text-soe-warning',
    critical: 'text-soe-critical',
  }[tone]
  const toneValueChip = {
    neutral: 'border-soe-blue/15 bg-[var(--color-surface-selected)] text-soe-navy',
    positive: 'border-soe-success/20 bg-[var(--color-surface-teal)] text-soe-navy',
    warning: 'border-soe-warning/25 bg-[var(--color-warning-soft)] text-soe-navy',
    critical: 'border-soe-critical/20 bg-[var(--color-critical-soft)] text-soe-navy',
  }[tone]

  if (breakdown?.length) {
    const breakdownScrollable =
      breakdownMaxVisible != null && breakdown.length > breakdownMaxVisible
    const breakdownMaxHeight =
      breakdownMaxVisible != null
        ? `${breakdownMaxVisible * BREAKDOWN_ROW_HEIGHT_REM + (breakdownMaxVisible - 1) * BREAKDOWN_ROW_GAP_REM}rem`
        : undefined

    return (
      <div className="flex min-h-[176px] min-w-0 flex-col border-l border-soe-border px-3.5 py-3 first:border-l-0">
        <div className="flex items-center gap-1.5">
          <Icon className={cn('h-4 w-4 shrink-0', toneClass)} aria-hidden="true" />
          <p className="truncate text-[10px] font-medium leading-tight text-soe-slate">{label}</p>
        </div>
        <div className="mt-1.5 flex min-w-0 items-center gap-2">
          <p className="truncate text-[20px] font-semibold leading-none tabular-nums text-soe-navy">
            {value}
          </p>
          {valueAddon ? (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-soe-blue/20 bg-[var(--color-surface-selected)] px-2 py-1">
              {valueAddon.icon ? (
                <valueAddon.icon className="h-3 w-3 text-soe-blue" aria-hidden="true" />
              ) : null}
              <span className="text-[9px] font-medium leading-none text-soe-slate">{valueAddon.label}</span>
              <span className="text-[11px] font-semibold leading-none tabular-nums text-soe-blue">
                {valueAddon.value}
              </span>
            </span>
          ) : null}
        </div>
        <div className="mt-2.5 flex-1 rounded-[6px] border border-soe-border/80 bg-soe-canvas/70 p-1.5">
          <div
            className={cn(
              'space-y-1',
              breakdownScrollable &&
                'overflow-y-auto overscroll-y-contain pr-0.5 [scrollbar-color:var(--color-soe-border)_transparent] [scrollbar-width:thin]',
            )}
            style={breakdownScrollable ? { maxHeight: breakdownMaxHeight } : undefined}
            aria-label={breakdownScrollable ? `${label} breakdown` : undefined}
          >
            {breakdown.map((row) => {
              const RowIcon = row.icon
              return (
                <div
                  key={row.label}
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-1.5 rounded-[4px] bg-white/80 px-1.5 py-1"
                >
                  <span className="flex min-w-0 items-center gap-1.5">
                    {row.iconNode ? (
                      <span
                        className={cn(
                          'flex h-3.5 w-5 shrink-0 items-center justify-center overflow-hidden rounded-[2px] ring-1 ring-black/5',
                          row.iconBgClassName,
                        )}
                      >
                        {row.iconNode}
                      </span>
                    ) : RowIcon ? (
                      <span
                        className={cn(
                          'flex h-4 w-4 shrink-0 items-center justify-center rounded-[3px] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.04)]',
                          row.iconBgClassName ?? 'bg-soe-canvas',
                        )}
                      >
                        <RowIcon
                          className={cn('h-3 w-3', row.iconClassName ?? 'text-soe-slate')}
                          aria-hidden="true"
                        />
                      </span>
                    ) : null}
                    <span className="truncate text-[10px] font-medium leading-snug text-soe-ink">
                      {row.label}
                    </span>
                  </span>
                  <span
                    className={cn(
                      'min-w-[2.25rem] rounded-full border px-2 py-0.5 text-center text-[10px] font-semibold leading-none tabular-nums',
                      toneValueChip,
                    )}
                  >
                    {row.value}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-[92px] min-w-0 items-center gap-3 border-l border-soe-border px-3 first:border-l-0">
      <Icon className={cn('h-5 w-5 shrink-0', toneClass)} aria-hidden="true" />
      <div className="min-w-0">
        <p className="truncate text-[10px] font-medium text-soe-slate">{label}</p>
        <p className="mt-1 truncate text-xl font-semibold tabular-nums text-soe-navy">{value}</p>
        {detail ? (
          <p
            className={cn(
              'mt-1 text-[10px] leading-snug',
              toneClass,
              detailMultiline ? 'whitespace-normal' : 'truncate',
            )}
          >
            {detail}
          </p>
        ) : null}
      </div>
    </div>
  )
}

function executiveToneColor(tone: ExecutiveTone) {
  if (tone === 'positive') return STATUS_COLOR.healthy
  if (tone === 'warning') return STATUS_COLOR.watch
  if (tone === 'critical') return STATUS_COLOR.concern
  return '#1d5d8f'
}

function PmoToneBadge({ tone, label }: { tone: ExecutiveTone; label: string }) {
  const cls = {
    positive: 'bg-[var(--color-success-soft)] text-soe-success ring-soe-success/20',
    warning: 'bg-[var(--color-warning-soft)] text-soe-warning ring-soe-warning/25',
    critical: 'bg-[var(--color-critical-soft)] text-soe-critical ring-soe-critical/20',
    neutral: 'bg-soe-canvas text-soe-slate ring-soe-border',
  }[tone]

  return (
    <span className={cn('inline-flex rounded-full px-2 py-1 text-[10px] font-semibold capitalize ring-1', cls)}>
      {label}
    </span>
  )
}

function PmoWatchStat({
  label,
  value,
  tone = 'neutral',
}: {
  label: string
  value: string
  tone?: ExecutiveTone
}) {
  const cls = {
    positive: 'border-soe-success/20 bg-[var(--color-success-soft)]',
    warning: 'border-soe-warning/25 bg-[var(--color-warning-soft)]',
    critical: 'border-soe-critical/20 bg-[var(--color-critical-soft)]',
    neutral: 'border-soe-border bg-soe-canvas/70',
  }[tone]

  return (
    <div className={cn('rounded-md border px-3 py-2.5', cls)}>
      <p className="truncate text-[9px] font-semibold uppercase text-soe-slate">{label}</p>
      <p className="mt-1 text-sm font-semibold tabular-nums text-soe-navy">{value}</p>
    </div>
  )
}

function ObligationHorizonPanel({ data }: { data: SecretaryDashboardData }) {
  const maxBucket = Math.max(...data.obligationBuckets.map((bucket) => bucket.value), 1)
  const obligationTotal = data.obligationBuckets.reduce((sum, item) => sum + item.value, 0)

  return (
    <Panel title="90-Day Obligation Horizon" className="flex flex-col h-full">
      <div className="flex flex-1 flex-col justify-between p-4">
        <div>
          <div className="grid grid-cols-5 gap-2">
            {data.obligationBuckets.map((item) => (
              <div key={item.name} className="flex flex-col min-w-0">
                <div className="flex h-44 sm:h-48 items-end rounded-md bg-soe-canvas/80 p-2 border border-soe-border/40 shadow-inner">
                  <div
                    className="w-full rounded-t-[4px] transition-all duration-300 shadow-sm"
                    style={{
                      height: `${obligationTotal ? Math.max(10, (item.value / maxBucket) * 100) : 10}%`,
                      backgroundColor: executiveToneColor(item.tone),
                    }}
                  />
                </div>
                <p className="mt-2.5 truncate text-center text-[10px] font-medium text-soe-slate">{item.name}</p>
                <p className="text-center text-base font-bold tabular-nums text-soe-navy">{item.value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-5 border-t border-soe-border pt-3">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-soe-slate">Key Upcoming Obligations</p>
          {data.obligations.slice(0, 5).map((item) => (
            <div
              key={item.id}
              className="grid grid-cols-[82px_1fr_auto] gap-2 border-b border-soe-border/50 py-2.5 text-xs last:border-0 hover:bg-soe-canvas/40 px-1 rounded transition-colors"
            >
              <strong className="truncate font-semibold text-soe-navy">{item.organizationLabel}</strong>
              <span className="truncate text-soe-ink">{item.issue}</span>
              <span className="tabular-nums font-medium text-soe-slate">{item.dueDate}</span>
            </div>
          ))}
        </div>
      </div>
    </Panel>
  )
}

function FinancialLoanWatchPanel({ data }: { data: SecretaryDashboardData }) {
  const amountDue = data.loanRepayments.reduce((sum, item) => sum + item.amountDue, 0)
  const overdueCount = data.loanRepayments.filter((item) => item.status === 'overdue').length

  return (
    <Panel title="Financial & Loan Watch">
      <div className="grid grid-cols-2 gap-3 border-b border-soe-border p-4 lg:grid-cols-4">
        <PmoWatchStat label="Repayments in horizon" value={String(data.loanRepayments.length)} tone="warning" />
        <PmoWatchStat label="Amount due" value={formatCurrencyPkr(amountDue)} tone="warning" />
        <PmoWatchStat label="Overdue" value={String(overdueCount)} tone={overdueCount ? 'critical' : 'positive'} />
        <PmoWatchStat label="Financial concerns" value={String(data.financialConcerns.length)} tone="critical" />
    </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[620px] text-xs">
          <thead>
            <tr className="bg-soe-canvas text-left text-[10px] uppercase text-soe-slate">
              <th className="px-4 py-2 font-medium">SOE / lender</th>
              <th className="px-3 py-2 font-medium">Due date</th>
              <th className="px-3 py-2 text-right font-medium">Amount due</th>
              <th className="px-4 py-2 text-right font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {data.loanRepayments.slice(0, 8).map((item) => (
              <tr key={item.id} className="border-t border-soe-border">
                <td className="px-4 py-2.5">
                  <strong className="text-soe-navy">{item.organizationLabel}</strong>
                  <span className="ml-2 text-[10px] text-soe-slate">{item.lender}</span>
                </td>
                <td className="px-3 py-2.5 tabular-nums text-soe-slate">{item.dueDate}</td>
                <td className="px-3 py-2.5 text-right font-semibold tabular-nums text-soe-navy">
                  {formatCurrencyPkr(item.amountDue)}
                </td>
                <td className="px-4 py-2.5 text-right">
                  <PmoToneBadge tone={item.tone} label={item.status.replaceAll('_', ' ')} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  )
}

function PrivatizationPipelineSection({
  data,
}: {
  data: {
    pipelineCount: number
    blockedCount: number
    cases: Array<{
      id: string
      organizationLabel: string
      sector: string
      stage: string
      status: string
      blocker?: string
    }>
  }
}) {
  return (
    <Panel
      title="Privatization Pipeline"
      action={
        <Link to="/pmo/privatization" className="text-[11px] font-medium text-soe-blue">
          Open workspace
        </Link>
      }
    >
      <div className="p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <DashboardMetricCard
            label="In pipeline"
            value={String(data.pipelineCount)}
            icon={Layers3}
            tone="info"
          />
          <DashboardMetricCard
            label="Blocked cases"
            value={String(data.blockedCount)}
            icon={X}
            tone={data.blockedCount > 0 ? 'warning' : 'neutral'}
          />
        </div>
        <div className="mt-4 border-t border-soe-border pt-3">
          {data.cases.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-left text-xs">
                <thead className="text-[10px] uppercase text-soe-slate">
                  <tr>
                    <th className="pb-2 font-medium">SOE</th>
                    <th className="pb-2 font-medium">Sector</th>
                    <th className="pb-2 font-medium">Stage</th>
                    <th className="pb-2 font-medium">Status</th>
                    <th className="pb-2 font-medium">Blocker</th>
                  </tr>
                </thead>
                <tbody>
                  {data.cases.map((item) => (
                    <tr key={item.id} className="border-t border-soe-border">
                      <td className="py-2 font-medium text-soe-navy">{item.organizationLabel}</td>
                      <td className="py-2 text-soe-slate">{item.sector}</td>
                      <td className="py-2 capitalize text-soe-slate">{item.stage.replaceAll('_', ' ')}</td>
                      <td className="py-2 capitalize text-soe-slate">{item.status.replaceAll('_', ' ')}</td>
                      <td className={cn('py-2', item.blocker ? 'text-soe-critical' : 'text-soe-slate')}>
                        {item.blocker ?? '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
      </div>
          ) : (
            <p className="py-2 text-center text-xs text-soe-slate">No privatization cases in current filter scope.</p>
          )}
      </div>
      </div>
    </Panel>
  )
}

const ASSET_CLASS_COLORS = ['#1d5d8f', '#16877a', '#c58a19', '#7c6f64', '#b84242', '#637a8c', '#0369a1']

function AssetValueByClassSection({
  rows,
}: {
  rows: Array<{ type: string; marketValue: number }>
}) {
  return (
    <Panel title="Asset value by class">
      {rows.length ? (
        <div className="h-[280px] p-4">
        <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows} layout="vertical" margin={{ top: 0, right: 16, left: 8, bottom: 0 }}>
              <CartesianGrid stroke="#e8edf0" horizontal={false} />
              <XAxis
                type="number"
                tickFormatter={compactNumber}
                tick={{ fontSize: 10, fill: '#64748b' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="type"
                width={92}
                tick={{ fontSize: 10, fill: '#475569' }}
                axisLine={false}
                tickLine={false}
              />
              <RechartsTooltip
                formatter={(value) => formatCurrencyPkr(Number(value))}
                contentStyle={{ borderRadius: 6, borderColor: '#dde3e8', fontSize: 11 }}
              />
              <Bar dataKey="marketValue" name="Market value" radius={[0, 4, 4, 0]}>
                {rows.map((item, index) => (
                  <Cell key={item.type} fill={ASSET_CLASS_COLORS[index % ASSET_CLASS_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
        </ResponsiveContainer>
      </div>
      ) : (
        <p className="p-4 text-center text-xs text-soe-slate">No asset values in current filter scope.</p>
      )}
    </Panel>
  )
}

export function PmoCommandDashboardPage() {
  const [filter, setFilter] = useCommandFilter()
  const [selectedSoeId, setSelectedSoeId] = useState<string>()

  const query = useQuery({
    queryKey: ['pmo-command-dashboard', filter],
    queryFn: async () => {
      const ministerFilter = {
        reportingPeriodId: filter.reportingPeriodId,
        sector: filter.sector,
        province: filter.province,
      }
      const gisFilter = {
        portfolioScope: true,
        province: filter.province,
        pageSize: 500,
      }
      const [
        options,
        overview,
        capital,
        market,
        fiscal,
        land,
        industrial,
        privatization,
        loans,
        ministerOverview,
        health,
        governance,
        auditLegal,
        assetIntel,
        opportunities,
        obligations,
        delayedCompliance,
        submissions,
        boardSummary,
        boardIssues,
        boardMembers,
        portfolioAssets,
        executives,
        workforce,
        workforceLive,
        procurement,
        accountability,
        litigation,
        litigationLive,
        litigationStageSummary,
        compliance,
        financials,
        documents,
        gisAssets,
        gisSummary,
        gisQuality,
        locations,
        secretaryDashboard,
      ] = await Promise.all([
        mockPmoPortalService.getFilterOptions(),
        mockPmoPortalService.getNationalOverview(filter),
        mockPmoPortalService.getGovernmentCapital(filter),
        mockPmoPortalService.getMarketVsBook(filter),
        mockPmoPortalService.getFiscalBurden(filter),
        mockPmoPortalService.getLandBank(filter),
        mockPmoPortalService.getEmploymentIndustrial(filter),
        mockPmoPortalService.getPrivatizationPotential(filter),
        mockPmoPortalService.getLoansSummary(filter),
        mockMinisterPortalService.getExecutiveOverview(ministerFilter),
        mockMinisterPortalService.getPortfolioHealth({ ...ministerFilter, pageSize: 500 }),
        mockMinisterPortalService.getGovernanceRisk(ministerFilter),
        mockMinisterPortalService.getAuditLegalRisk(ministerFilter),
        mockMinisterPortalService.getAssetIntelligence(ministerFilter),
        mockMinisterPortalService.getStrategicOpportunities({ ...ministerFilter, pageSize: 20 }),
        mockSecretaryPortalService.getUpcomingObligations(90),
        mockSecretaryPortalService.getDelayedCompliance(),
        mockSecretaryPortalService.getSubmissionCompliance(),
        mockBoardService.getBoardSummary(undefined, true),
        mockSecretaryPortalService.getBoardGovernance(),
        mockBoardService.getBoardMembers(),
        mockAssetService.getAssets({ portfolioScope: true, pageSize: 2000 }),
        mockBoardService.getExecutives(),
        mockWorkforceService.getSummary(undefined, true),
        mockWorkforceService.getContinuousSummary(undefined, true),
        mockAuditService.getProcurement(),
        mockAuditService.getExceptionSummary(),
        mockLitigationService.getCases(),
        mockLitigationService.getContinuousSummary(),
        mockLitigationService.getStageSummary(),
        mockComplianceService.getComplianceItems(),
        mockFinanceService.getFinancials(undefined, filter.reportingPeriodId),
        mockDocumentService.getDocuments({ pageSize: 1000 }),
        mockGisService.queryAssets(gisFilter),
        mockGisService.getSummary(gisFilter),
        mockGisService.getDataQuality(gisFilter),
        mockOrganizationService.getLocations(),
        mockExecutiveDashboardService.getSecretaryDashboard(ministerFilter),
      ])
      return {
        options,
        overview,
        capital,
        market,
        fiscal,
        land,
        industrial,
        privatization,
        loans,
        ministerOverview,
        health,
        governance,
        auditLegal,
        assetIntel,
        opportunities,
        obligations,
        delayedCompliance,
        submissions,
        boardSummary,
        boardIssues,
        boardMembers,
        portfolioAssets,
        executives,
        workforce,
        workforceLive,
        procurement,
        accountability,
        litigation,
        litigationLive,
        litigationStageSummary,
        compliance,
        financials,
        documents,
        gisAssets,
        gisSummary,
        gisQuality,
        locations,
        secretaryDashboard,
      }
    },
  })

  const derived = useMemo(() => {
    if (!query.data) return null
    const d = query.data
    const orgIds = new Set(d.capital.bySoe.map((row) => row.organizationId))
    const health = d.health.items.filter((row) => orgIds.has(row.organizationId))
    const scopedCompliance = d.compliance.filter((item) => orgIds.has(item.organizationId))
    const scopedDocuments = d.documents.items.filter((item) => !item.organizationId || orgIds.has(item.organizationId))
    const gisAssets = d.gisAssets.items.filter((item) => orgIds.has(item.organizationId))
    const soesWithGisLocations = new Set(
      gisAssets
        .filter((item) => item.mapped && item.latitude != null && item.longitude != null)
        .map((item) => item.organizationId),
    ).size
    const boardMembers = d.boardMembers.filter((item) => orgIds.has(item.organizationId))
    const portfolioAssets = d.portfolioAssets.items.filter((item) => orgIds.has(item.organizationId))
    const locations = d.locations.filter((item) => orgIds.has(item.organizationId))

      return {
      health,
      compliance: scopedCompliance,
      documents: scopedDocuments,
      gisAssets,
      soesWithGisLocations,
      boardMembers,
      portfolioAssets,
      locations,
    }
  }, [query.data])

  useEffect(() => {
    if (!derived?.health.length) return
    if (!selectedSoeId || !derived.health.some((row) => row.organizationId === selectedSoeId)) {
      setSelectedSoeId(derived.health[0]!.organizationId)
    }
  }, [derived, selectedSoeId])



  if (query.isLoading) return <LoadingBlock label="Loading national SOE command dashboard…" />
  if (query.isError || !query.data || !derived) {
    return <ErrorState title="Unable to load national SOE command dashboard" />
  }

  const d = query.data
  const periodLabel = d.options.periods.find((p) => p.id === d.overview.reportingPeriodId)?.label ?? d.overview.reportingPeriodId
  const activeSoeId =
    derived.health.some((item) => item.organizationId === selectedSoeId)
      ? selectedSoeId!
      : derived.health[0]?.organizationId ?? ''

  const assetValueByClass = [...derived.portfolioAssets
    .reduce((map, asset) => {
      const type = ASSET_TYPE_LABEL[asset.assetType] ?? asset.assetType
      const item = map.get(type) ?? { type, marketValue: 0 }
      item.marketValue += asset.marketValue ?? 0
      map.set(type, item)
      return map
    }, new Map<string, { type: string; marketValue: number }>())
    .values()]
    .sort((a, b) => b.marketValue - a.marketValue)
    .slice(0, 7)
  const profitableSoes = derived.health
    .filter((row) => (row.profitOrLoss ?? 0) > 0)
    .sort((a, b) => (b.profitOrLoss ?? 0) - (a.profitOrLoss ?? 0))
    .slice(0, 5)
    .map((row) => ({
      id: row.organizationId,
      label: row.abbreviation,
      value: row.profitOrLoss ?? 0,
      secondary: row.sector,
      tone: 'positive' as const,
      route: `/minister/portfolio?soe=${row.organizationId}`,
    }))
  const lossMakingSoes = derived.health
    .filter((row) => (row.profitOrLoss ?? 0) < 0)
    .sort((a, b) => (a.profitOrLoss ?? 0) - (b.profitOrLoss ?? 0))
    .slice(0, 5)
    .map((row) => ({
      id: row.organizationId,
      label: row.abbreviation,
      value: Math.abs(row.profitOrLoss ?? 0),
      secondary: row.sector,
      tone: 'critical' as const,
      route: `/minister/portfolio?soe=${row.organizationId}`,
    }))
  const sectorSoeNames = derived.health.reduce<Map<string, string[]>>((map, row) => {
    const names = map.get(row.sector) ?? []
    names.push(row.name)
    map.set(row.sector, names)
    return map
  }, new Map())
  for (const [sector, names] of sectorSoeNames) {
    sectorSoeNames.set(
      sector,
      [...names].sort((a, b) => a.localeCompare(b)),
    )
  }
  const sectorContributionData: SectorTradeChartRow[] = d.industrial.bySector.map((row) => ({
    sector: row.sector,
    soeNames: sectorSoeNames.get(row.sector) ?? [],
    domesticSales: row.domesticSales,
    exports: row.exports,
    imports: row.imports,
  }))
  const sectorContributionMax = Math.max(
    0,
    ...sectorContributionData.flatMap((row) => [row.domesticSales, row.exports, row.imports]),
  )
  const sectorContributionAxisMax = niceCurrencyAxisMax(sectorContributionMax)
  const sectorContributionTicks = Array.from({ length: 5 }, (_, index) => (sectorContributionAxisMax / 4) * index)

  const shareholding = d.overview.soeCountByShareholding
  const shareholdingBreakdown = [
    { label: 'Government shareholding', value: shareholding.government },
    { label: 'Private shareholding', value: shareholding.private },
    { label: 'Foreign shareholding', value: shareholding.foreign },
    { label: 'Provincial Govt shareholding', value: shareholding.provincialGovernment },
  ]

  const assetRegistryBreakdown = [
    {
      label: 'Buildings',
      value: derived.portfolioAssets.filter((item) => item.assetType === ASSET_TYPE.BUILDING).length,
    },
    {
      label: 'Vehicles',
      value: derived.portfolioAssets.filter((item) => item.assetType === ASSET_TYPE.VEHICLE).length,
    },
    {
      label: 'Machinery',
      value: derived.portfolioAssets.filter((item) => item.assetType === ASSET_TYPE.MACHINERY).length,
    },
    {
      label: 'Furniture',
      value: derived.portfolioAssets.filter((item) => item.equipmentCategory === 'furniture').length,
    },
  ]

  const fiscalBreakdown = [
    { label: 'Annual budget', value: compactCurrency(d.fiscal.annualBudget) },
    { label: 'Working capital', value: compactCurrency(d.fiscal.workingCapital) },
    { label: 'Grants', value: compactCurrency(d.fiscal.grants) },
    { label: 'Payables', value: compactCurrency(d.fiscal.payables) },
    { label: 'Debt ratio', value: percent(d.fiscal.debtRatio, 0) },
    {
      label: 'Financial statements',
      value: `${d.fiscal.financialStatementsCount}/${d.overview.soeCount}`,
    },
  ]

  const landBreakdown = [
    { label: 'Vacant', value: compactAcres(d.land.vacantAcres) },
    { label: 'Industrial', value: compactAcres(d.land.industrialLandAcres) },
    { label: 'Commercial', value: compactAcres(d.land.commercialLandAcres) },
    { label: 'Residential', value: compactAcres(d.land.residentialLandAcres) },
    { label: 'Agricultural', value: compactAcres(d.land.agriculturalLandAcres) },
  ]

  const employmentBreakdown = [
    { label: 'Payroll headcount', value: compactNumber(d.industrial.workforceHeadcount) },
    { label: 'Daily wagers', value: compactNumber(d.workforce.dailyWagerCount) },
    { label: 'Consultants', value: compactNumber(d.workforce.consultantActiveCount) },
    { label: 'Pensioners', value: compactNumber(d.workforce.pensionersCount) },
  ]
  const femalePct = femaleWorkforcePct(d.workforce.genderCounts)

  const loansBreakdown: PulseBreakdownRow[] = [
    {
      label: 'Government',
      value: compactCurrency(d.loans.byLenderCategory.government),
      icon: Landmark,
      iconClassName: 'text-[#1D5D8F]',
      iconBgClassName: 'bg-[#1D5D8F]/12',
    },
    {
      label: 'Bank',
      value: compactCurrency(d.loans.byLenderCategory.bank),
      icon: Building2,
      iconClassName: 'text-[#C58A19]',
      iconBgClassName: 'bg-[#C58A19]/14',
    },
    {
      label: 'Foreign',
      value: compactCurrency(d.loans.byLenderCategory.foreign),
      icon: Globe2,
      iconClassName: 'text-[#7C3AED]',
      iconBgClassName: 'bg-[#7C3AED]/12',
    },
    {
      label: 'ADB',
      value: compactCurrency(d.loans.byLenderCategory.adb),
      icon: HeartHandshake,
      iconClassName: 'text-[#0066B3]',
      iconBgClassName: 'bg-[#0066B3]/12',
    },
    {
      label: 'World Bank',
      value: compactCurrency(d.loans.byLenderCategory.world_bank),
      icon: Globe,
      iconClassName: 'text-[#009FDA]',
      iconBgClassName: 'bg-[#009FDA]/12',
    },
    {
      label: 'China',
      value: compactCurrency(d.loans.byLenderCategory.china),
      iconNode: <ChinaFlagIcon className="h-full w-full" />,
    },
  ]
  const complianceRepositoryRows: ComplianceRepositoryRow[] = derived.health
    .map((organization) => {
      const complianceByArea = new Map(
        derived.compliance
          .filter((item) => item.organizationId === organization.organizationId)
          .map((item) => [item.area, item]),
      )
      const documentsByCategory = new Map(
        derived.documents
          .filter(
            (document) =>
              document.organizationId === organization.organizationId &&
              document.evidenceStatus !== DOCUMENT_EVIDENCE_STATUS.MISSING &&
              document.evidenceStatus !== DOCUMENT_EVIDENCE_STATUS.SUPERSEDED,
          )
          .map((document) => [document.category, document]),
      )

      const checks = Object.fromEntries(
        ASSURANCE_CHECKS.map((check) => {
          if (check.kind === 'status') {
            const item = complianceByArea.get(check.complianceArea ?? '')
            const value = displayAssuranceStatus(
              organization.organizationId,
              check.id,
              item?.status,
            )
            return [check.id, { kind: 'status', value }]
          }

          const document = check.documentCategory
            ? documentsByCategory.get(check.documentCategory)
            : undefined

          return [
            check.id,
            resolveAssuranceFileCell(
              organization.organizationId,
              organization.abbreviation,
              check,
              document,
            ),
          ]
        }),
      ) as Record<string, AssuranceCellValue>
      const noCount = Object.values(checks).filter(
        (cell) => cell.kind === 'status' && cell.value === 'no',
      ).length

      return {
        organizationId: organization.organizationId,
        abbreviation: organization.abbreviation,
        name: organization.name,
        logoSrc: soeLogoSrc(organization.abbreviation),
        checks,
        noCount,
      }
    })
    .sort(
      (first, second) =>
        second.noCount - first.noCount || first.abbreviation.localeCompare(second.abbreviation),
    )

  return (
    <RequirePermission permission={PERMISSION.EXECUTIVE_DASHBOARD_READ}>
        <header id="overview" className="scroll-mt-24">
        <div className="overflow-hidden border-b border-soe-border shadow-[var(--shadow-sm)]">
          <div
            className="relative px-4 py-4 text-white md:px-7 md:py-5"
            style={{
              background:
                'linear-gradient(115deg, #0d2438 0%, #12304a 42%, #1a4566 100%)',
            }}
          >
            <div
              className="pointer-events-none absolute inset-y-0 right-0 w-1/3 opacity-30"
              style={{
                background:
                  'radial-gradient(ellipse at 80% 20%, rgba(22,135,122,0.35), transparent 55%)',
              }}
              aria-hidden
            />
            <div className="relative flex flex-wrap items-center justify-between gap-4">
              <div className="flex min-w-0 items-center gap-3 sm:gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-control bg-white p-1.5 shadow-[var(--shadow-xs)] sm:h-16 sm:w-16">
                  <img
                    src="/images/MOIP%20Logo.png"
                    alt="Ministry of Industries and Production"
                    className="h-full w-full object-contain"
                  />
            </div>
                <div className="hidden h-12 w-px shrink-0 bg-white/20 sm:block" aria-hidden />
                <div className="min-w-0">
                  <p className="text-[11px] font-medium tracking-wide text-white/70">
                    SOE-GAIP
                  </p>
                  <h1 className="mt-0.5 text-[20px] font-semibold leading-tight tracking-tight text-white sm:text-[22px]">
                    Ministry of Industries &amp; Production
                  </h1>
                  <p className="mt-0.5 text-[11px] text-white/65">Government of Pakistan</p>
            </div>
          </div>
              <div className="flex flex-wrap items-end gap-2 sm:gap-3">
                <label className="min-w-[9rem] space-y-1">
                  <span className="block text-[10px] font-medium text-white/65">Fiscal year</span>
                  <select
                    className="h-9 w-full min-w-[10.5rem] rounded-control border border-white/25 bg-white/10 px-2.5 text-xs text-white backdrop-blur-sm focus:border-white/50 focus:outline-none focus:ring-2 focus:ring-white/20 [&>option]:bg-soe-navy [&>option]:text-white"
                    value={filter.reportingPeriodId}
              onChange={(event) => setFilter({ reportingPeriodId: event.target.value })}
                    aria-label="Fiscal year filter"
                  >
                    {d.options.periods.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="min-w-[9rem] space-y-1">
                  <span className="block text-[10px] font-medium text-white/65">Sector</span>
                  <select
                    className="h-9 w-full min-w-[10.5rem] rounded-control border border-white/25 bg-white/10 px-2.5 text-xs text-white backdrop-blur-sm focus:border-white/50 focus:outline-none focus:ring-2 focus:ring-white/20 [&>option]:bg-soe-navy [&>option]:text-white"
              value={filter.sector ?? ''}
              onChange={(event) => setFilter({ sector: event.target.value })}
                    aria-label="Sector filter"
                  >
                    <option value="">All sectors</option>
                    {d.options.sectors.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="min-w-[9rem] space-y-1">
                  <span className="block text-[10px] font-medium text-white/65">Province</span>
                  <select
                    className="h-9 w-full min-w-[10.5rem] rounded-control border border-white/25 bg-white/10 px-2.5 text-xs text-white backdrop-blur-sm focus:border-white/50 focus:outline-none focus:ring-2 focus:ring-white/20 [&>option]:bg-soe-navy [&>option]:text-white"
              value={filter.province ?? ''}
              onChange={(event) => setFilter({ province: event.target.value })}
                    aria-label="Province filter"
                  >
                    <option value="">All provinces</option>
                    {d.options.provinces.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>
          </div>
          </div>
        </header>

      <div className="p-4 md:p-7">
        <section className={cn(PANEL, 'overflow-hidden rounded-[6px]')} aria-label="National pulse">
          <div className="flex items-center justify-between border-b border-soe-border px-4 py-2">
            <div>
              <h2 className="text-sm font-semibold text-soe-navy">National Overview</h2>
              <p className="text-[10px] text-soe-slate">
                {periodLabel} · SOE strategic indicators
              </p>
            </div>
          </div>
          <div className="grid grid-cols-6">
            <PulseMetric
              label="Total SOEs"
              value={String(d.overview.soeCount)}
              breakdown={shareholdingBreakdown}
              icon={Building2}
            />
                        <PulseMetric
              label="Land bank"
              value={`${compactNumber(d.land.unencumberedAcres)} ac`}
              breakdown={landBreakdown}
              breakdownMaxVisible={4}
              valueAddon={{
                label: 'GIS shared',
                value: `${derived.soesWithGisLocations}/${d.overview.soeCount}`,
                icon: MapPinned,
              }}
              icon={LandPlot}
              tone="positive"
            />
            <PulseMetric
              label="Asset Registry"
              value={formatCurrencyPkr(d.market.aggregateMarketValue)}
              breakdown={assetRegistryBreakdown}
              icon={Layers3}
              tone="positive"
            />
                        <PulseMetric
              label="Human Resource"
              value={compactNumber(d.overview.employment)}
              breakdown={employmentBreakdown}
              valueAddon={
                femalePct == null
                  ? undefined
                  : {
                      label: 'Female',
                      value: percent(femalePct, 0),
                      icon: Venus,
                    }
              }
              icon={Users}
            />
            <PulseMetric
              label="Financials"
              value={formatCurrencyPkr(d.fiscal.subsidies + d.fiscal.grants)}
              breakdown={fiscalBreakdown}
              breakdownMaxVisible={4}
              icon={Banknote}
              tone="warning"
            />


            <PulseMetric
              label="Loans"
              value={compactCurrency(d.loans.totalOutstanding)}
              breakdown={loansBreakdown}
              breakdownMaxVisible={4}
              icon={HandCoins}
              tone="neutral"
            />
          </div>
        </section>

        <SoeExplorerPanel
          soes={derived.health}
          selectedId={activeSoeId}
          onSelect={setSelectedSoeId}
          boardMembers={derived.boardMembers}
          assets={derived.portfolioAssets}
          mappedCount={
            derived.gisAssets.filter(
              (item) =>
                item.organizationId === activeSoeId &&
                item.mapped,
            ).length
          }
        />




          <div className="mt-6 space-y-3">
          <SectionHeader id="industry" title="Industrial and Economic Contribution" meta="Capacity, trade, domestic sales and employment" />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <DashboardMetricCard
              label="Capacity utilization"
              value={percent(d.industrial.capacityUtilization)}
              icon={Cog}
              tone={(d.industrial.capacityUtilization ?? 0) < 60 ? 'warning' : 'success'}
            />
            <DashboardMetricCard
              label="Domestic sales"
              value={formatCurrencyPkr(d.industrial.domesticSales)}
              icon={Building2}
              tone="info"
            />
            <DashboardMetricCard
              label="Export"
              value={formatCurrencyPkr(d.industrial.exportContribution)}
              icon={TrendingUp}
              tone="success"
            />
            <DashboardMetricCard
              label="Imports"
              value={formatCurrencyPkr(d.industrial.imports)}
              icon={Import}
              tone="neutral"
            />
            </div>
          <Panel title="Sector trade: domestic sales, export and imports">
              <div className="overflow-x-auto">
              <div className="h-[320px] min-w-[1100px] p-3">
              <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={sectorContributionData}
                    barCategoryGap="14%"
                    barGap={2}
                    margin={{ top: 4, right: 8, left: 0, bottom: 4 }}
                  >
                    <CartesianGrid stroke="#dde3e8" strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="sector"
                      tick={{ fontSize: 10, fill: '#5c6b7a' }}
                      tickLine={false}
                      tickMargin={8}
                      height={42}
                      interval={0}
                    />
                    <YAxis
                      domain={[0, sectorContributionAxisMax]}
                      ticks={sectorContributionTicks}
                      tick={{ fontSize: 10, fill: '#5c6b7a' }}
                      tickFormatter={chartPkrAxis}
                      width={52}
                    />
                    <RechartsTooltip
                      cursor={{ fill: '#f6f8fa', fillOpacity: 0.65 }}
                      content={<SectorTradeTooltip />}
                    />
                    <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                    <Bar dataKey="domesticSales" name="Domestic sales" fill="#1d5d8f" maxBarSize={22} radius={[2, 2, 0, 0]} />
                    <Bar dataKey="exports" name="Export" fill="#16877a" maxBarSize={22} radius={[2, 2, 0, 0]} />
                    <Bar dataKey="imports" name="Imports" fill="#c58a19" maxBarSize={22} radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
              </div>
            </Panel>
              </div>
          <div className="mt-3 grid gap-3 lg:grid-cols-2">
          <Panel
            title="Highest Loss-Making SOEs"
            action={<ToneBadge tone="critical" label={`${lossMakingSoes.length} priority entities`} />}
          >
            <RankedBars items={lossMakingSoes} />
            </Panel>
          <Panel
            title="Leading Profitable SOEs"
            action={
              <Link className="text-[11px] font-medium text-soe-blue" to="/minister/portfolio">
                View portfolio
              </Link>
            }
          >
            <RankedBars items={profitableSoes} />
            </Panel>
          </div>
          <section className="mt-6 space-y-3" aria-label="Compliance and Document Assurance">
            <SectionHeader
              id="assurance"
              title="Compliance and Document Assurance"
              meta="Compliance answers and document evidence across SOEs"
            />
            <Panel
              title="SOE compliance and document register"
              action={
                <div className="flex items-center gap-3 text-[10px] font-medium">
                  <span className="inline-flex items-center gap-1 text-soe-success">
                    <Check className="h-3 w-3" aria-hidden="true" /> Yes
                  </span>
                  <span className="inline-flex items-center gap-1 text-soe-critical">
                    <X className="h-3 w-3" aria-hidden="true" /> No
                  </span>
                  <span className="inline-flex items-center gap-1 text-soe-slate">
                    <Minus className="h-3 w-3" aria-hidden="true" /> N/A
                  </span>
                  <span className="inline-flex items-center gap-1 text-soe-blue">
                    <FileText className="h-3 w-3" aria-hidden="true" /> File
                  </span>
          </div>
              }
            >
              <ComplianceRepositoryTable rows={complianceRepositoryRows} />
            </Panel>
          </section>
          <ExecutiveLitigationExposureSection
            litigation={d.litigation}
            litigationLive={d.litigationLive}
            stageSummary={d.litigationStageSummary}
          />
          <div className="mt-3 grid gap-3 xl:grid-cols-2">
            <ObligationHorizonPanel data={d.secretaryDashboard} />
            <FinancialLoanWatchPanel data={d.secretaryDashboard} />
          </div>
          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            <PrivatizationPipelineSection data={d.privatization} />
            <AssetValueByClassSection rows={assetValueByClass} />
          </div>
          <ExecutiveReportsStrip filter={filter} periodLabel={periodLabel} />
        <footer className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-soe-border pt-4 text-[10px] text-soe-slate">
          <span>Data as of {d.overview.asOf} · {periodLabel}</span>
          <span>Fiscal components shown separately · read-only PMO strategic view</span>
        </footer>
      </div>
    </RequirePermission>
  )
}
