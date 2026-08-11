import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  Banknote,
  Building2,
  ChevronRight,
  CircleDollarSign,
  Database,
  Download,
  FileCheck2,
  Gauge,
  Landmark,
  Layers3,
  ShieldCheck,
  TrendingUp,
  Users,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { NationalAssetMapCanvas } from '@/components/gis/NationalAssetMapCanvas'
import { RequirePermission } from '@/app/router/guards'
import { ErrorState, LoadingBlock } from '@/design-system/components/Feedback'
import {
  mockAuditService,
  mockBoardService,
  mockComplianceService,
  mockDocumentService,
  mockFinanceService,
  mockGisService,
  mockLitigationService,
  mockMinisterPortalService,
  mockPmoPortalService,
  mockSecretaryPortalService,
  mockWorkforceService,
} from '@/mock-services'
import type { PmoFilter } from '@/mock-services/pmoPortal.service'
import { PERMISSION } from '@/permissions'
import { useSessionStore } from '@/state/session'
import { cn, formatCurrencyPkr } from '@/utils'

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

function percent(value: number | null, digits = 1) {
  return value == null || !Number.isFinite(value) ? '—' : `${value.toFixed(digits)}%`
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

function PulseMetric({
  label,
  value,
  detail,
  icon: Icon,
  tone = 'neutral',
}: {
  label: string
  value: string
  detail?: string
  icon: LucideIcon
  tone?: 'neutral' | 'positive' | 'warning' | 'critical'
}) {
  const toneClass = {
    neutral: 'text-soe-blue',
    positive: 'text-soe-success',
    warning: 'text-soe-warning',
    critical: 'text-soe-critical',
  }[tone]
  return (
    <div className="flex min-h-[92px] min-w-0 items-center gap-3 border-l border-soe-border px-3 first:border-l-0">
      <Icon className={cn('h-5 w-5 shrink-0', toneClass)} aria-hidden="true" />
      <div className="min-w-0">
        <p className="truncate text-[10px] font-medium text-soe-slate">{label}</p>
        <p className="mt-1 truncate text-xl font-semibold tabular-nums text-soe-navy">{value}</p>
        {detail ? <p className={cn('mt-1 truncate text-[10px]', toneClass)}>{detail}</p> : null}
      </div>
    </div>
  )
}

function MiniStat({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="min-w-0 border-l-2 border-soe-border pl-3">
      <p className="text-[10px] font-medium uppercase text-soe-slate">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums text-soe-navy">{value}</p>
      {detail ? <p className="mt-0.5 text-[11px] text-soe-slate">{detail}</p> : null}
    </div>
  )
}

function SeverityDot({ severity }: { severity: string }) {
  const cls =
    severity === 'critical'
      ? 'bg-soe-critical'
      : severity === 'attention' || severity === 'high'
        ? 'bg-soe-warning'
        : 'bg-soe-info'
  return <span className={cn('inline-block h-2 w-2 shrink-0 rounded-full', cls)} aria-hidden="true" />
}

function MetricLegend() {
  return (
    <div className="flex flex-wrap items-center gap-3 text-[10px] text-soe-slate">
      <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-soe-success" />Healthy</span>
      <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-soe-warning" />Watch</span>
      <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-soe-critical" />Concern</span>
    </div>
  )
}

function RiskDimension({
  label,
  count,
  total,
  values,
}: {
  label: string
  count: number
  total: number
  values: number[]
}) {
  const points = values.map((value, index) => ({ index, value }))
  const ratio = total ? count / total : 0
  const tone = ratio >= 0.45 ? 'concern' : ratio >= 0.2 ? 'watch' : 'healthy'
  return (
    <div className="min-w-0 border-l border-soe-border px-3 first:border-l-0">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[11px] font-semibold text-soe-navy">{label}</p>
          <p className="mt-1 text-[10px] text-soe-slate">High-risk SOEs</p>
        </div>
        <span className="text-sm font-semibold tabular-nums" style={{ color: STATUS_COLOR[tone] }}>
          {count}/{total}
        </span>
      </div>
      <div className="mt-2 flex gap-1" aria-label={`${label}: ${count} high-risk SOEs out of ${total}`}>
        {Array.from({ length: 7 }, (_, index) => (
          <span
            key={index}
            className={cn(
              'h-2 w-2 rounded-full',
              index < Math.ceil(ratio * 7)
                ? tone === 'concern'
                  ? 'bg-soe-critical'
                  : tone === 'watch'
                    ? 'bg-soe-warning'
                    : 'bg-soe-success'
                : 'bg-soe-border',
            )}
          />
        ))}
      </div>
      <div className="mt-2 h-10" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points}>
            <Line type="monotone" dataKey="value" stroke="#1d5d8f" strokeWidth={1.5} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

export function PmoCommandDashboardPage() {
  const [filter, setFilter] = useCommandFilter()
  const navigate = useNavigate()
  const [mapZoom, setMapZoom] = useState(5)
  const [selectedAssetId, setSelectedAssetId] = useState<string>()

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
        executives,
        workforce,
        procurement,
        accountability,
        litigation,
        compliance,
        financials,
        documents,
        gisAssets,
        gisSummary,
        gisQuality,
      ] = await Promise.all([
        mockPmoPortalService.getFilterOptions(),
        mockPmoPortalService.getNationalOverview(filter),
        mockPmoPortalService.getGovernmentCapital(filter),
        mockPmoPortalService.getMarketVsBook(filter),
        mockPmoPortalService.getFiscalBurden(filter),
        mockPmoPortalService.getLandBank(filter),
        mockPmoPortalService.getEmploymentIndustrial(filter),
        mockPmoPortalService.getPrivatizationPotential(filter),
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
        mockBoardService.getExecutives(),
        mockWorkforceService.getSummary(undefined, true),
        mockAuditService.getProcurement(),
        mockAuditService.getExceptionSummary(),
        mockLitigationService.getCases(),
        mockComplianceService.getComplianceItems(),
        mockFinanceService.getFinancials(undefined, filter.reportingPeriodId),
        mockDocumentService.getDocuments({ pageSize: 1000 }),
        mockGisService.queryAssets(gisFilter),
        mockGisService.getSummary(gisFilter),
        mockGisService.getDataQuality(gisFilter),
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
        executives,
        workforce,
        procurement,
        accountability,
        litigation,
        compliance,
        financials,
        documents,
        gisAssets,
        gisSummary,
        gisQuality,
      }
    },
  })

  const derived = useMemo(() => {
    if (!query.data) return null
    const d = query.data
    const orgIds = new Set(d.capital.bySoe.map((row) => row.organizationId))
    const health = d.health.items.filter((row) => orgIds.has(row.organizationId))
    const financials = d.financials.filter((row) => orgIds.has(row.organizationId))
    const revenue = financials.reduce((sum, row) => sum + row.revenue, 0)
    const profitOrLoss = financials.reduce((sum, row) => sum + row.profitOrLoss, 0)
    const support = d.fiscal.subsidies + d.fiscal.grants
    const fiscalDependence = revenue > 0 ? (support / revenue) * 100 : 0

    const positions = health.map((row) => {
      const capitalRow = d.capital.bySoe.find((item) => item.organizationId === row.organizationId)
      const employed = capitalRow?.governmentCapital ?? 0
      const returnPct = employed > 0 && row.profitOrLoss != null ? (row.profitOrLoss / employed) * 100 : 0
      const exposure = row.subsidies + row.debt
      const dependencePct = employed > 0 ? Math.min(70, (exposure / employed) * 100) : exposure > 0 ? 70 : 0
      return {
        name: row.abbreviation,
        x: Math.max(0, dependencePct),
        y: Math.max(-30, Math.min(30, returnPct)),
        z: Math.max(40, Math.min(600, Math.sqrt(Math.max(employed, 1)) / 1200)),
        band: row.healthBand,
      }
    })

    const scopedBoardIssues = d.boardIssues.filter((item) => orgIds.has(item.organizationId))
    const scopedDelayed = d.delayedCompliance.filter((item) => orgIds.has(item.organizationId))
    const scopedSubmissions = d.submissions.filter((item) => orgIds.has(item.organizationId))
    const scopedProcurement = d.procurement.filter((item) => orgIds.has(item.organizationId))
    const scopedLitigation = d.litigation.filter((item) => orgIds.has(item.organizationId))
    const scopedCompliance = d.compliance.filter((item) => orgIds.has(item.organizationId))
    const scopedDocuments = d.documents.items.filter((item) => !item.organizationId || orgIds.has(item.organizationId))
    const gisAssets = d.gisAssets.items.filter((item) => orgIds.has(item.organizationId))
    const mappedAssets = gisAssets.filter((item) => item.mapped)
    const gisSummary = {
      assetsInView: gisAssets.length,
      mappedCount: mappedAssets.length,
      nonMappedCount: gisAssets.length - mappedAssets.length,
      totalAreaAcres: gisAssets.reduce((sum, item) => sum + (item.areaAcres ?? 0), 0),
      totalMarketValue: gisAssets.reduce((sum, item) => sum + (item.marketValue ?? 0), 0),
    }
    const gisMissingValuation = gisAssets.filter((item) => item.bookValue == null || item.marketValue == null).length

    const approvedSubmissions = scopedSubmissions.filter((row) => row.dueBucket === 'approved').length
    const evidenceItems = [
      ...scopedProcurement.map((row) => row.evidenceAvailable),
      ...scopedCompliance.map((row) => row.evidenceAvailable),
      ...scopedLitigation.map((row) => row.evidenceAvailable),
    ]
    const evidenceCoverage = evidenceItems.length
      ? (evidenceItems.filter(Boolean).length / evidenceItems.length) * 100
      : 100
    const submissionCoverage = scopedSubmissions.length
      ? (approvedSubmissions / scopedSubmissions.length) * 100
      : 0
    const mappingCoverage = gisSummary.assetsInView
      ? (gisSummary.mappedCount / gisSummary.assetsInView) * 100
      : 0
    const valuationCoverage = gisSummary.assetsInView
      ? ((gisSummary.assetsInView - gisMissingValuation) / gisSummary.assetsInView) * 100
      : 0
    const confidence = (submissionCoverage + evidenceCoverage + mappingCoverage + valuationCoverage) / 4

    const procurementValue = scopedProcurement.reduce((sum, item) => sum + item.value, 0)
    const vendorTotals = new Map<string, number>()
    for (const item of scopedProcurement) {
      vendorTotals.set(item.vendor, (vendorTotals.get(item.vendor) ?? 0) + item.value)
    }
    const vendorConcentration = procurementValue
      ? (Math.max(0, ...vendorTotals.values()) / procurementValue) * 100
      : 0

    const riskDimensions = [
      {
        label: 'Financial health',
        count: health.filter((row) => row.financialPosition === 'persistent_loss' || row.financialPosition === 'loss').length,
      },
      {
        label: 'Governance',
        count: health.filter((row) => row.governanceCondition !== 'ok').length,
      },
      {
        label: 'Compliance',
        count: new Set(scopedDelayed.map((row) => row.organizationId)).size,
      },
      {
        label: 'Operations',
        count: health.filter((row) => row.capacityUtilization != null && row.capacityUtilization < 50).length,
      },
      {
        label: 'Assets',
        count: Math.min(health.length, d.assetIntel.underutilizedCount + d.assetIntel.encroachedLandCount + d.assetIntel.underLitigationCount),
      },
      {
        label: 'Audit / legal',
        count: Math.min(health.length, d.auditLegal.majorParas.length + d.auditLegal.majorLitigation.length),
      },
      {
        label: 'Data reliability',
        count: Math.min(health.length, scopedSubmissions.length - approvedSubmissions + gisSummary.nonMappedCount),
      },
    ]
    const riskIndex = health.length
      ? Math.round(riskDimensions.reduce((sum, item) => sum + item.count / health.length, 0) / riskDimensions.length * 100)
      : 0

    return {
      orgIds,
      health,
      revenue,
      profitOrLoss,
      support,
      fiscalDependence,
      positions,
      boardIssues: scopedBoardIssues,
      delayedCompliance: scopedDelayed,
      submissions: scopedSubmissions,
      procurement: scopedProcurement,
      litigation: scopedLitigation,
      compliance: scopedCompliance,
      documents: scopedDocuments,
      gisAssets,
      gisSummary,
      gisMissingValuation,
      obligations: d.obligations.filter((item) => orgIds.has(item.organizationId)),
      opportunities: d.opportunities.items.filter((item) => orgIds.has(item.organizationId)),
      evidenceCoverage,
      submissionCoverage,
      mappingCoverage,
      valuationCoverage,
      confidence,
      procurementValue,
      vendorConcentration,
      riskDimensions,
      riskIndex,
    }
  }, [query.data])

  if (query.isLoading) return <LoadingBlock label="Loading national SOE command dashboard…" />
  if (query.isError || !query.data || !derived) {
    return <ErrorState title="Unable to load national SOE command dashboard" />
  }

  const d = query.data
  const periodLabel = d.options.periods.find((p) => p.id === d.overview.reportingPeriodId)?.label ?? d.overview.reportingPeriodId
  const selectedAsset = derived.gisAssets.find((item) => item.assetId === selectedAssetId)

  const statusRows = Object.entries(d.ministerOverview.summary.soeCountByStatus)
  const statusTotal = statusRows.reduce((sum, [, value]) => sum + value, 0)
  const submissionApproved = derived.submissions.filter((row) => row.dueBucket === 'approved').length
  const procurementExceptions = derived.procurement.filter((row) => row.ppraCompliance !== 'compliant').length
  const delayedContracts = derived.procurement.filter((row) => row.completionStatus === 'overdue').length
  const overdueCompliance = derived.compliance.filter((row) => row.status === 'overdue').length

  return (
    <RequirePermission permission={PERMISSION.EXECUTIVE_DASHBOARD_READ}>
      <div className="min-w-0 pb-10">
        <header id="overview" className="scroll-mt-24">
          <div className="-mx-4 overflow-hidden rounded-card border border-soe-border shadow-[var(--shadow-sm)] md:-mx-7 md:rounded-none">
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
                      Prime Minister&apos;s Office
                    </p>
                    <h1 className="mt-0.5 text-[20px] font-semibold leading-tight tracking-tight text-white sm:text-[22px]">
                      Ministry of Industries &amp; Production
                    </h1>
                    <p className="mt-0.5 text-[11px] text-white/65">Government of Pakistan</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  <p className="mr-1 text-[11px] tabular-nums text-white/70">
                    As of {d.overview.asOf}
                  </p>
                  <button
                    type="button"
                    className="inline-flex h-8 items-center gap-1.5 rounded-control border border-white/30 bg-white/10 px-2.5 text-xs font-medium text-white hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/60"
                    onClick={() => navigate('/pmo/reports')}
                  >
                    <Download className="h-3.5 w-3.5" /> Executive brief
                  </button>
                  <button
                    type="button"
                    className="inline-flex h-8 items-center gap-1.5 rounded-control border border-white/30 bg-white/10 px-2.5 text-xs font-medium text-white hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/60"
                    onClick={() => navigate('/pmo/search')}
                  >
                    <Database className="h-3.5 w-3.5" /> Data dictionary
                  </button>
                </div>
              </div>
            </div>

            <div
              className="flex flex-wrap items-end gap-3 border-t border-soe-border bg-soe-canvas px-4 py-2.5 md:px-7"
              role="search"
              aria-label="Dashboard scope filters"
            >
              <p className="mb-2 hidden text-[10px] font-semibold uppercase tracking-wide text-soe-slate sm:block">
                Scope
              </p>
              <label className="min-w-[9.5rem] flex-1 space-y-1">
                <span className="block text-[10px] font-medium text-soe-slate">Reporting period</span>
                <select
                  className="h-9 w-full rounded-control border border-soe-border bg-white px-2.5 text-xs text-soe-ink focus:border-soe-blue focus:shadow-[var(--shadow-focus)] focus:outline-none"
                  value={filter.reportingPeriodId ?? ''}
                  onChange={(event) => setFilter({ reportingPeriodId: event.target.value })}
                >
                  {d.options.periods.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="min-w-[9.5rem] flex-1 space-y-1">
                <span className="block text-[10px] font-medium text-soe-slate">Sector</span>
                <select
                  className="h-9 w-full rounded-control border border-soe-border bg-white px-2.5 text-xs text-soe-ink focus:border-soe-blue focus:shadow-[var(--shadow-focus)] focus:outline-none"
                  value={filter.sector ?? ''}
                  onChange={(event) => setFilter({ sector: event.target.value })}
                >
                  <option value="">All sectors</option>
                  {d.options.sectors.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>
              <label className="min-w-[9.5rem] flex-1 space-y-1">
                <span className="block text-[10px] font-medium text-soe-slate">Province</span>
                <select
                  className="h-9 w-full rounded-control border border-soe-border bg-white px-2.5 text-xs text-soe-ink focus:border-soe-blue focus:shadow-[var(--shadow-focus)] focus:outline-none"
                  value={filter.province ?? ''}
                  onChange={(event) => setFilter({ province: event.target.value })}
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
        </header>

        <section className={cn(PANEL, 'mt-4 overflow-hidden rounded-[6px]')} aria-label="National pulse">
          <div className="flex items-center justify-between border-b border-soe-border px-4 py-2">
            <div>
              <h2 className="text-sm font-semibold text-soe-navy">National Pulse</h2>
              <p className="text-[10px] text-soe-slate">{periodLabel} · approved and current reporting scope</p>
            </div>
            <span className="inline-flex items-center gap-1.5 text-[10px] text-soe-success"><ShieldCheck className="h-3.5 w-3.5" />{percent(derived.confidence)} data confidence</span>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-8">
            <PulseMetric label="Total SOEs" value={String(d.overview.soeCount)} detail={`${statusRows.length} status groups`} icon={Building2} />
            <PulseMetric label="Total assets" value={formatCurrencyPkr(d.market.aggregateMarketValue)} detail={`${formatCurrencyPkr(d.market.variance)} valuation gap`} icon={Layers3} tone="positive" />
            <PulseMetric label="Revenue" value={formatCurrencyPkr(derived.revenue)} detail={`${d.ministerOverview.summary.profitableCount} profitable`} icon={TrendingUp} tone="positive" />
            <PulseMetric label="Net profit / loss" value={formatCurrencyPkr(derived.profitOrLoss)} detail={`${d.ministerOverview.summary.lossMakingCount} loss-making`} icon={CircleDollarSign} tone={derived.profitOrLoss < 0 ? 'critical' : 'positive'} />
            <PulseMetric label="Government support" value={formatCurrencyPkr(derived.support)} detail="Subsidies and grants" icon={Landmark} tone="warning" />
            <PulseMetric label="Fiscal dependence" value={percent(derived.fiscalDependence)} detail={`${formatCurrencyPkr(d.fiscal.guarantees)} guarantees`} icon={Banknote} tone="warning" />
            <PulseMetric label="Capacity utilization" value={percent(d.industrial.capacityUtilization, 0)} detail={`${d.industrial.bySector.length} sectors reporting`} icon={Gauge} />
            <PulseMetric label="Employment" value={compactNumber(d.overview.employment)} detail={`${formatCurrencyPkr(d.overview.exportContribution)} exports`} icon={Users} />
          </div>
        </section>

        <div className="mt-3 grid gap-3">
          <Panel
            title="Pakistan Asset & Industrial Footprint"
            action={<Link to="/pmo/map" className="text-[11px] font-medium text-soe-blue">Open full map</Link>}
          >
            <div className="relative h-[520px] bg-white">
              <NationalAssetMapCanvas
                items={derived.gisAssets}
                selectedId={selectedAssetId}
                onSelect={setSelectedAssetId}
                zoom={mapZoom}
                onZoomChange={setMapZoom}
                className="h-full"
                variant="executive"
                onViewList={() => navigate('/pmo/map')}
              />
              {selectedAsset ? (
                <div className="absolute bottom-3 left-1/2 z-[480] w-[min(520px,calc(100%-1.5rem))] -translate-x-1/2 rounded-md border border-soe-border bg-white/95 p-3 shadow-[var(--shadow-card)]">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold text-soe-navy">{selectedAsset.organizationLabel} · {selectedAsset.name}</p>
                      <p className="mt-1 text-[10px] text-soe-slate">{selectedAsset.province || 'Province not recorded'} · {formatCurrencyPkr(selectedAsset.marketValue ?? 0)} market value</p>
                    </div>
                    <button type="button" className="text-xs text-soe-blue" onClick={() => setSelectedAssetId(undefined)}>Close</button>
                  </div>
                </div>
              ) : null}
            </div>
            <div className="grid grid-cols-4 divide-x divide-soe-border border-t border-soe-border py-3">
              <div className="px-3 text-center"><p className="text-[10px] text-soe-slate">Assets in view</p><p className="text-base font-semibold text-soe-navy">{derived.gisSummary.assetsInView}</p></div>
              <div className="px-3 text-center"><p className="text-[10px] text-soe-slate">Mapped</p><p className="text-base font-semibold text-soe-navy">{derived.gisSummary.mappedCount}</p></div>
              <div className="px-3 text-center"><p className="text-[10px] text-soe-slate">Land area</p><p className="text-base font-semibold text-soe-navy">{compactNumber(derived.gisSummary.totalAreaAcres)} ac</p></div>
              <div className="px-3 text-center"><p className="text-[10px] text-soe-slate">Market value</p><p className="text-base font-semibold text-soe-navy">{formatCurrencyPkr(derived.gisSummary.totalMarketValue)}</p></div>
            </div>
          </Panel>
        </div>

        <Panel title="Cross-SOE Risk Heatmap & Trends" action={<MetricLegend />} className="mt-3">
          <div className="grid gap-y-4 py-4 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-[repeat(7,minmax(0,1fr))_150px]">
            {derived.riskDimensions.map((item, index) => (
              <RiskDimension
                key={item.label}
                label={item.label}
                count={item.count}
                total={Math.max(derived.health.length, 1)}
                values={[4, 6, 5, 7, 6, 8, 7].map((value) => Math.max(0, value + item.count / 4 - index / 2))}
              />
            ))}
            <div className="border-l border-soe-border px-4 text-center">
              <p className="text-[10px] font-medium uppercase text-soe-slate">Portfolio risk index</p>
              <p className={cn('mt-3 text-3xl font-semibold tabular-nums', derived.riskIndex >= 45 ? 'text-soe-critical' : derived.riskIndex >= 25 ? 'text-soe-warning' : 'text-soe-success')}>{derived.riskIndex}<span className="text-base text-soe-slate"> / 100</span></p>
              <p className="mt-2 text-xs font-medium text-soe-slate">Multi-dimensional view</p>
            </div>
          </div>
        </Panel>

        <div className="mt-6 space-y-6">
          <SectionHeader id="fiscal" title="Financial and Fiscal Position" meta="Capital, profitability, debt, guarantees, subsidies and grants" />
          <div className="grid gap-3 lg:grid-cols-4">
            <MiniStat label="Government capital" value={formatCurrencyPkr(d.capital.governmentCapitalEmployed)} detail={percent(d.capital.returnOnCapitalPct) + ' return on capital'} />
            <MiniStat label="Aggregate debt" value={formatCurrencyPkr(d.fiscal.debt)} detail={`${formatCurrencyPkr(d.fiscal.guarantees)} guarantees`} />
            <MiniStat label="Subsidies" value={formatCurrencyPkr(d.fiscal.subsidies)} detail={`${formatCurrencyPkr(d.fiscal.grants)} grants`} />
            <MiniStat label="Loss exposure" value={formatCurrencyPkr(d.fiscal.losses)} detail={`${d.ministerOverview.summary.lossMakingCount} loss-making SOEs`} />
          </div>
          <div className="grid gap-3 xl:grid-cols-[1.2fr_0.8fr]">
            <Panel title="Five-year fiscal trend">
              <div className="h-[280px] p-3">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={d.fiscal.trend}>
                    <CartesianGrid stroke="#dde3e8" strokeDasharray="3 3" />
                    <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={compactNumber} />
                    <RechartsTooltip formatter={(value) => formatCurrencyPkr(Number(value))} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Line type="monotone" dataKey="debt" stroke="#12304a" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="subsidies" stroke="#c58a19" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="guarantees" stroke="#1d5d8f" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="losses" stroke="#b84242" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Panel>
            <Panel title="Highest fiscal exposure">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-soe-canvas text-[10px] uppercase text-soe-slate"><tr><th className="px-3 py-2">SOE</th><th className="px-3 py-2 text-right">Debt</th><th className="px-3 py-2 text-right">Guarantees</th><th className="px-3 py-2 text-right">P/L</th></tr></thead>
                  <tbody className="divide-y divide-soe-border">{d.capital.bySoe.slice(0, 8).map((row) => <tr key={row.organizationId}><td className="px-3 py-2 font-medium text-soe-navy">{row.abbreviation}</td><td className="px-3 py-2 text-right tabular-nums">{formatCurrencyPkr(row.debt)}</td><td className="px-3 py-2 text-right tabular-nums">{formatCurrencyPkr(row.guarantees)}</td><td className={cn('px-3 py-2 text-right tabular-nums', row.profitOrLoss < 0 && 'text-soe-critical')}>{formatCurrencyPkr(row.profitOrLoss)}</td></tr>)}</tbody>
                </table>
              </div>
            </Panel>
          </div>

          <SectionHeader id="industry" title="Industrial and Economic Contribution" meta="Production, utilization, domestic sales, exports and employment" />
          <div className="grid gap-3 lg:grid-cols-4">
            <MiniStat label="Industrial production" value={compactNumber(d.industrial.industrialProduction)} />
            <MiniStat label="Capacity utilization" value={percent(d.industrial.capacityUtilization)} />
            <MiniStat label="Domestic sales" value={formatCurrencyPkr(d.industrial.domesticSales)} />
            <MiniStat label="Exports" value={formatCurrencyPkr(d.industrial.exportContribution)} detail={`${compactNumber(d.industrial.totalEmployment)} jobs`} />
          </div>
          <Panel title="Sector contribution and capacity utilization">
            <div className="h-[300px] p-3">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={d.industrial.bySector}>
                  <CartesianGrid stroke="#dde3e8" strokeDasharray="3 3" />
                  <XAxis dataKey="sector" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={compactNumber} />
                  <RechartsTooltip formatter={(value) => compactNumber(Number(value))} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="production" name="Production" fill="#1d5d8f" />
                  <Bar dataKey="exports" name="Exports" fill="#16877a" />
                  <Bar dataKey="employment" name="Employment" fill="#64748b" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Panel>

          <SectionHeader id="assets" title="National Assets and Land Intelligence" meta="Valuation, utilization, geographic concentration and opportunity" />
          <div className="grid gap-3 lg:grid-cols-5">
            <MiniStat label="Market value" value={formatCurrencyPkr(d.market.aggregateMarketValue)} />
            <MiniStat label="Book value" value={formatCurrencyPkr(d.market.aggregateBookValue)} />
            <MiniStat label="Valuation gap" value={formatCurrencyPkr(d.market.variance)} />
            <MiniStat label="Vacant / unused" value={String(d.assetIntel.vacantUnusedCount)} />
            <MiniStat label="Encroached / litigated" value={String(d.assetIntel.encroachedLandCount + d.assetIntel.underLitigationCount)} />
          </div>
          <div className="grid gap-3 xl:grid-cols-[1fr_0.8fr]">
            <Panel title="Land bank by province">
              <div className="h-[280px] p-3">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={d.land.byProvince} layout="vertical" margin={{ left: 24 }}>
                    <CartesianGrid stroke="#dde3e8" strokeDasharray="3 3" />
                    <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={compactNumber} />
                    <YAxis type="category" dataKey="province" tick={{ fontSize: 10 }} width={90} />
                    <RechartsTooltip formatter={(value) => `${Number(value).toLocaleString('en-PK')} acres`} />
                    <Bar dataKey="acres" fill="#16877a" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Panel>
            <Panel title="Asset opportunity and control signals">
              <div className="grid grid-cols-2 gap-5 p-4">
                <MiniStat label="Industrial land" value={`${compactNumber(d.land.industrialLandAcres)} ac`} />
                <MiniStat label="Unencumbered" value={`${compactNumber(d.land.unencumberedAcres)} ac`} />
                <MiniStat label="Idle factories" value={String(d.assetIntel.idleFactoryCount)} />
                <MiniStat label="Underutilized assets" value={String(d.assetIntel.underutilizedCount)} />
                <MiniStat label="Missing valuations" value={String(d.market.assetsWithoutValuation)} />
                <MiniStat label="Land market value" value={formatCurrencyPkr(d.land.marketValue)} />
              </div>
            </Panel>
          </div>

          <SectionHeader id="governance" title="Governance, Leadership and Workforce" meta="Enterprise status, board continuity, executive leadership and workforce capacity" />
          <div className="grid gap-3 lg:grid-cols-6">
            <MiniStat label="Board vacancies" value={String(d.boardSummary.vacancies)} />
            <MiniStat label="Terms expiring" value={String(d.boardSummary.upcomingExpiries)} />
            <MiniStat label="Missing declarations" value={String(d.boardSummary.missingDeclarations)} />
            <MiniStat label="Executives recorded" value={String(d.executives.length)} />
            <MiniStat label="Workforce vacancies" value={String(d.workforce.vacant)} detail={percent(d.workforce.vacancyRatePct)} />
            <MiniStat label="Active consultants" value={String(d.workforce.consultantActiveCount)} />
          </div>
          <div className="grid gap-3 xl:grid-cols-[0.72fr_1.28fr]">
            <Panel title="Enterprise portfolio status">
              <div className="space-y-3 p-4">{statusRows.map(([status, value]) => <div key={status}><div className="flex justify-between text-xs"><span className="capitalize text-soe-slate">{status.replaceAll('_', ' ')}</span><span className="font-semibold tabular-nums text-soe-navy">{value}</span></div><div className="mt-1 h-2 overflow-hidden rounded-full bg-soe-canvas"><div className="h-full bg-soe-blue" style={{ width: `${statusTotal ? value / statusTotal * 100 : 0}%` }} /></div></div>)}</div>
            </Panel>
            <Panel title="Priority governance events">
              <div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead className="bg-soe-canvas text-[10px] uppercase text-soe-slate"><tr><th className="px-3 py-2">SOE</th><th className="px-3 py-2">Issue</th><th className="px-3 py-2">Member / position</th><th className="px-3 py-2">Severity</th></tr></thead><tbody className="divide-y divide-soe-border">{derived.boardIssues.slice(0, 10).map((item) => <tr key={item.id}><td className="px-3 py-2 font-medium text-soe-navy">{item.organizationLabel}</td><td className="px-3 py-2">{item.issue}</td><td className="px-3 py-2 text-soe-slate">{item.memberName ?? '—'}</td><td className="px-3 py-2"><span className="inline-flex items-center gap-1 capitalize"><SeverityDot severity={item.severity} />{item.severity}</span></td></tr>)}</tbody></table></div>
            </Panel>
          </div>

          <SectionHeader id="accountability" title="Accountability, Legal and Compliance" meta="Procurement, audit/PAC, litigation, compliance and obligations" />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
            <MiniStat label="Open audit paras" value={String(d.auditLegal.openParaCount)} />
            <MiniStat label="Audit exposure" value={formatCurrencyPkr(d.auditLegal.totalAuditExposure)} />
            <MiniStat label="Litigation exposure" value={formatCurrencyPkr(d.auditLegal.litigationExposure)} />
            <MiniStat label="Upcoming hearings" value={String(d.accountability.upcomingHearings)} />
            <MiniStat label="Procurement exceptions" value={String(procurementExceptions)} />
            <MiniStat label="Delayed contracts" value={String(delayedContracts)} />
            <MiniStat label="Vendor concentration" value={percent(derived.vendorConcentration)} />
            <MiniStat label="Overdue compliance" value={String(overdueCompliance)} />
          </div>
          <div className="grid gap-3 xl:grid-cols-2">
            <Panel title="Major audit and litigation exposure">
              <div className="divide-y divide-soe-border">{[...d.auditLegal.majorParas.map((item) => ({ ...item, kind: 'Audit para' })), ...d.auditLegal.majorLitigation.map((item) => ({ ...item, kind: 'Litigation' }))].sort((a, b) => b.amountInvolved - a.amountInvolved).slice(0, 8).map((item) => <div key={`${item.kind}-${item.id}`} className="grid grid-cols-[86px_1fr_auto] gap-3 px-4 py-2.5 text-xs"><span className="text-soe-slate">{item.kind}</span><div><p className="font-medium text-soe-navy">{item.organizationLabel}</p><p className="mt-0.5 text-[11px] text-soe-slate">{item.title}</p></div><span className="tabular-nums text-soe-critical">{formatCurrencyPkr(item.amountInvolved)}</span></div>)}</div>
            </Panel>
            <Panel title="30 / 60 / 90 day obligations">
              <div className="grid divide-y divide-soe-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">{(['30', '60', '90'] as const).map((window) => <div key={window} className="p-4"><p className="text-xs font-semibold text-soe-navy">{window} days</p><div className="mt-3 space-y-3">{derived.obligations.filter((item) => item.window === window || (window === '30' && item.window === '7')).slice(0, 4).map((item) => <div key={item.id}><p className="text-[11px] font-medium text-soe-ink">{item.organizationLabel}</p><p className="mt-0.5 text-[10px] leading-4 text-soe-slate">{item.obligationType} · {item.dueDate}</p></div>)}</div></div>)}</div>
            </Panel>
          </div>

          <SectionHeader id="transformation" title="Privatization and Transformation" meta="Pipeline stages, blockers, milestones and strategic opportunities" />
          <div className="grid gap-3 lg:grid-cols-3">
            <MiniStat label="In pipeline" value={String(d.privatization.pipelineCount)} />
            <MiniStat label="Blocked cases" value={String(d.privatization.blockedCount)} />
            <MiniStat label="Completed milestones" value={String(d.privatization.completedMilestones)} />
          </div>
          <div className="grid gap-3 xl:grid-cols-2">
            <Panel title="Privatization pipeline">
              <div className="divide-y divide-soe-border">{d.privatization.cases.map((item) => <div key={item.id} className="grid grid-cols-[1fr_110px_90px] gap-3 px-4 py-3 text-xs"><div><p className="font-medium text-soe-navy">{item.organizationLabel}</p>{item.blocker ? <p className="mt-1 text-[10px] text-soe-critical">{item.blocker}</p> : null}</div><span className="capitalize text-soe-slate">{item.stage}</span><span className="capitalize text-soe-slate">{item.status}</span></div>)}</div>
            </Panel>
            <Panel title="Strategic opportunities">
              <div className="divide-y divide-soe-border">{derived.opportunities.slice(0, 8).map((item) => <div key={item.id} className="flex items-start justify-between gap-3 px-4 py-3"><div><p className="text-xs font-medium text-soe-navy">{item.organizationLabel} · {item.title}</p><p className="mt-1 text-[11px] leading-4 text-soe-slate">{item.detail}</p></div><ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-soe-blue" /></div>)}</div>
            </Panel>
          </div>

          <SectionHeader id="confidence" title="Reporting Integrity and Data Confidence" meta="Submission coverage, evidence, valuation and geospatial completeness" />
          <div className="grid gap-3 lg:grid-cols-[0.7fr_1.3fr]">
            <Panel title="Overall confidence">
              <div className="flex min-h-[250px] flex-col items-center justify-center p-5 text-center">
                <FileCheck2 className="h-8 w-8 text-soe-teal" />
                <p className="mt-3 text-4xl font-semibold tabular-nums text-soe-navy">{percent(derived.confidence, 0)}</p>
                <p className="mt-2 text-xs text-soe-slate">Weighted reporting, evidence, valuation and mapping coverage</p>
                <p className="mt-5 text-[11px] text-soe-slate">{derived.documents.length} supporting documents in current scope</p>
              </div>
            </Panel>
            <Panel title="Confidence by dimension">
              <div className="grid gap-5 p-5 sm:grid-cols-2">
                {[
                  ['Approved submissions', derived.submissionCoverage, `${submissionApproved}/${derived.submissions.length} approved`],
                  ['Evidence coverage', derived.evidenceCoverage, `${derived.documents.length} documents indexed`],
                  ['Geospatial coverage', derived.mappingCoverage, `${derived.gisSummary.mappedCount}/${derived.gisSummary.assetsInView} mapped`],
                  ['Valuation coverage', derived.valuationCoverage, `${derived.gisMissingValuation} missing valuations`],
                ].map(([label, value, detail]) => <div key={String(label)}><div className="flex justify-between text-xs"><span className="font-medium text-soe-navy">{label}</span><span className="font-semibold tabular-nums text-soe-teal">{percent(Number(value), 0)}</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-soe-canvas"><div className="h-full bg-soe-teal" style={{ width: `${Math.max(0, Math.min(100, Number(value)))}%` }} /></div><p className="mt-1.5 text-[10px] text-soe-slate">{detail}</p></div>)}
              </div>
            </Panel>
          </div>
        </div>

        <footer className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-soe-border pt-4 text-[10px] text-soe-slate">
          <span>Data as of {d.overview.asOf} · {periodLabel}</span>
          <span>Fiscal components shown separately · read-only PMO strategic view</span>
        </footer>
      </div>
    </RequirePermission>
  )
}
