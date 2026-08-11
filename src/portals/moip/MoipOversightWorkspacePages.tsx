import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { AlertTriangle, Building2, CheckCircle2, Clock3, FileCheck2, Gauge, Landmark, ShieldAlert } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { PageHeader } from '@/components/layout/PageHeader'
import { WorkflowChrome } from '@/components/workflow/WorkflowChrome'
import { DataTable } from '@/components/tables/DataTable'
import { Button } from '@/design-system/components/Button'
import { Card } from '@/design-system/components/Card'
import { TextareaField, SelectField, TextField } from '@/design-system/components/Fields'
import { Alert, EmptyState, ErrorState, LoadingBlock } from '@/design-system/components/Feedback'
import { KpiCard } from '@/design-system/components/KpiCard'
import { ConfirmDialog } from '@/design-system/components/Overlays'
import { StatusBadge } from '@/design-system/components/StatusBadge'
import { RequirePermission } from '@/app/router/guards'
import {
  ESCALATION_REASON,
  ESCALATION_REASON_LABEL,
  ESCALATION_SEVERITY,
  ESCALATION_SEVERITY_LABEL,
  MODULE,
  MOIP_COMPARISON_RULES,
  REVIEW_PRIORITY_LABEL,
  ROLE,
  ROLE_LABEL,
  SUBMISSION_STATUS,
  SUBMISSION_STATUS_LABEL,
  type RoleId,
  type SubmissionStatus,
} from '@/constants'
import { mockAdministrationService, mockFinanceWorkflowService, mockMoipPortalService } from '@/mock-services'
import type {
  MoipClarificationRow,
  MoipComparisonHighlight,
  MoipPortfolioRow,
  MoipQueueRow,
} from '@/mock-services/moipPortal.service'
import { hasPermission, PERMISSION } from '@/permissions'
import { useSessionStore } from '@/state/session'
import { useUiStore } from '@/state/ui'
import type { Escalation } from '@/types/domain'
import { AppError, cn, formatCurrencyPkr } from '@/utils'
import { REPORTING_MODULES } from '@/workflow/moduleCatalog'
import { reportingPeriods } from '@/mock-data'

const linkClass = 'text-sm text-soe-blue underline'

const REVIEWER_ROLE_OPTIONS: { value: RoleId; label: string }[] = [
  { value: ROLE.MOIP_REVIEWER, label: ROLE_LABEL[ROLE.MOIP_REVIEWER] },
  { value: ROLE.MOIP_SUPERVISOR, label: ROLE_LABEL[ROLE.MOIP_SUPERVISOR] },
]

type ReviewTab = 'issues' | 'evidence' | 'comparison' | 'history' | 'actions'

function submissionStatusLabel(status: SubmissionStatus | 'not_started') {
  if (status === 'not_started') return 'Not started'
  return SUBMISSION_STATUS_LABEL[status]
}

function moduleLabel(moduleId: string) {
  return REPORTING_MODULES.find((m) => m.id === moduleId)?.label ?? moduleId
}

const DASHBOARD_COLORS = { blue: '#1f5f8b', teal: '#138a7a', amber: '#d17a08', red: '#bf3f34', navy: '#17324d', muted: '#8da2b8', grid: '#e6ebef' }

function CommandMetric({ label, value, detail, to, tone = 'blue', icon }: { label: string; value: string; detail: string; to: string; tone?: 'blue' | 'teal' | 'amber' | 'red'; icon: ReactNode }) {
  const tones = { blue: 'border-t-soe-blue', teal: 'border-t-soe-teal', amber: 'border-t-soe-warning', red: 'border-t-soe-critical' }
  return <Link to={to} className={cn('min-h-[126px] border border-t-4 border-soe-border bg-white p-4 shadow-[var(--shadow-card)] transition hover:border-soe-blue', tones[tone])}><div className="flex items-start justify-between gap-3"><p className="text-[11px] font-semibold uppercase text-soe-slate">{label}</p><span className="text-soe-slate">{icon}</span></div><p className="mt-2 text-2xl font-bold text-soe-navy">{value}</p><p className="mt-1 text-xs text-soe-slate">{detail}</p></Link>
}

function DashboardSectionTitle({ title, action }: { title: string; action?: ReactNode }) {
  return <div className="mb-3 flex items-center justify-between border-b border-soe-border pb-2"><h2 className="text-sm font-bold text-soe-navy">{title}</h2>{action}</div>
}

function useReviewPermissions() {
  const role = useSessionStore((s) => s.role)
  return {
    role,
    canReview: hasPermission(role, PERMISSION.SUBMISSION_REVIEW),
    canApprove: hasPermission(role, PERMISSION.SUBMISSION_APPROVE),
    canClarify: hasPermission(role, PERMISSION.CLARIFICATION_CREATE),
    canEscalate: hasPermission(role, PERMISSION.ESCALATION_CREATE),
  }
}

export function MoipOversightDashboardPage() {
  const role = useSessionStore((s) => s.role)
  const reportingPeriodId = useSessionStore((s) => s.reportingPeriodId)
  const setReportingPeriodId = useSessionStore((s) => s.setReportingPeriodId)
  const dashboard = useQuery({
    queryKey: ['moip-command-dashboard', reportingPeriodId],
    queryFn: () => mockMoipPortalService.getCommandDashboard(reportingPeriodId),
  })
  const workload = useQuery({
    queryKey: ['moip-workload', role],
    queryFn: () => mockMoipPortalService.getWorkload(role),
  })
  const userPosture = useQuery({ queryKey: ['admin-users', 'dashboard-posture'], queryFn: () => mockAdministrationService.listUsers(role), enabled: hasPermission(role, PERMISSION.USER_READ) })

  if (dashboard.isLoading) return <LoadingBlock label="Loading oversight dashboard…" />
  if (dashboard.isError || !dashboard.data) {
    return <ErrorState title="Unable to load oversight dashboard" />
  }

  const d = dashboard.data
  const w = workload.data
  const userRisk = userPosture.data ? { total: userPosture.data.length, mfaMissing: userPosture.data.filter((item) => !item.mfaEnabled && item.status === 'active').length, locked: userPosture.data.filter((item) => item.status === 'locked' || item.status === 'suspended').length, invitations: userPosture.data.filter((item) => item.invitationStatus === 'pending').length } : null

  return (
    <div className="space-y-5">
      <div className="border-b border-soe-border bg-white px-5 py-4">
        <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-semibold uppercase text-soe-blue">Ministry of Industries and Production</p><h1 className="mt-1 text-2xl font-bold text-soe-navy">Review & Portfolio Command</h1><p className="mt-1 text-sm text-soe-slate">Submission control, quality assurance and cross-SOE oversight · as of {new Date(d.asOf).toLocaleString()} · {ROLE_LABEL[role]}</p></div><div className="w-48"><SelectField label="Financial year" value={reportingPeriodId} options={reportingPeriods.filter((period) => period.type === 'annual').map((period) => ({ value: period.id, label: period.label }))} onChange={(event) => setReportingPeriodId(event.target.value)} /></div></div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
        <CommandMetric label="SOEs in portfolio" value={String(d.summary.totalSoes)} detail={`${d.summary.expectedModules} module returns expected`} to="/moip/portfolio" icon={<Building2 size={18} />} />
        <CommandMetric label="Returns received" value={String(d.summary.received)} detail={`${Math.round((d.summary.received / Math.max(1, d.summary.expectedModules)) * 100)}% portfolio coverage`} to="/moip/submissions" tone="teal" icon={<FileCheck2 size={18} />} />
        <CommandMetric label="Under review" value={String(d.summary.underReview)} detail={w ? `${w.assignedReviews} assigned to your queue` : 'Active review queue'} to="/moip/submissions?status=under_review" icon={<Clock3 size={18} />} />
        <CommandMetric label="Clarifications" value={String(d.summary.clarificationPending)} detail="Awaiting SOE response" to="/moip/clarifications" tone="amber" icon={<AlertTriangle size={18} />} />
        <CommandMetric label="SLA breaches" value={String(d.summary.overdue)} detail="Overdue reviews or responses" to="/moip/submissions" tone="red" icon={<ShieldAlert size={18} />} />
        <CommandMetric label="Approved returns" value={String(d.summary.approved)} detail={`${d.periodLabel} locked or approved`} to="/moip/approvals" tone="teal" icon={<CheckCircle2 size={18} />} />
        <CommandMetric label="Average completion" value={`${d.summary.averageCompleteness}%`} detail="Across all submitted modules" to="/moip/data-quality" tone={d.summary.averageCompleteness < 80 ? 'amber' : 'teal'} icon={<Gauge size={18} />} />
        <CommandMetric label="Quality exceptions" value={String(d.quality.blocking + d.quality.warnings + d.quality.evidenceGaps)} detail={`${d.quality.affectedSoes} SOEs affected`} to="/moip/data-quality" tone="red" icon={<Landmark size={18} />} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.35fr_0.65fr]">
        <Card><DashboardSectionTitle title="Submission pipeline" action={<Link className={linkClass} to="/moip/submissions">Open review queue</Link>} /><div className="h-[260px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={d.workflow} margin={{ top: 8, right: 10, left: -16, bottom: 30 }}><CartesianGrid stroke={DASHBOARD_COLORS.grid} vertical={false} /><XAxis dataKey="label" angle={-25} textAnchor="end" interval={0} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} /><YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} /><Tooltip contentStyle={{ borderRadius: 4, borderColor: DASHBOARD_COLORS.grid, fontSize: 11 }} /><Bar dataKey="count" name="Returns" radius={[3, 3, 0, 0]}>{d.workflow.map((item) => <Cell key={item.status} fill={item.status === 'clarification_requested' ? DASHBOARD_COLORS.amber : item.status === 'approved' || item.status === 'locked' ? DASHBOARD_COLORS.teal : DASHBOARD_COLORS.blue} />)}</Bar></BarChart></ResponsiveContainer></div></Card>
        <Card><DashboardSectionTitle title="Reviewer workload & quality" action={<Link className={linkClass} to="/moip/tasks">Tasks</Link>} /><div className="grid grid-cols-2 gap-x-5 gap-y-4">{w ? <><div><p className="text-xs text-soe-slate">Assigned reviews</p><p className="text-xl font-bold text-soe-navy">{w.assignedReviews}</p></div><div><p className="text-xs text-soe-slate">Due soon</p><p className="text-xl font-bold text-soe-navy">{w.dueSoon}</p></div><div><p className="text-xs text-soe-slate">Overdue</p><p className="text-xl font-bold text-soe-critical">{w.overdue}</p></div><div><p className="text-xs text-soe-slate">Approvals pending</p><p className="text-xl font-bold text-soe-navy">{w.approvalsPending}</p></div></> : null}<div><p className="text-xs text-soe-slate">Blocking checks</p><p className="text-xl font-bold text-soe-critical">{d.quality.blocking}</p></div><div><p className="text-xs text-soe-slate">Evidence gaps</p><p className="text-xl font-bold text-soe-warning">{d.quality.evidenceGaps}</p></div></div><div className="mt-5 border-t border-soe-border pt-4"><div className="flex justify-between text-xs"><span>Portfolio completion</span><strong>{d.summary.averageCompleteness}%</strong></div><div className="mt-2 h-2 bg-soe-canvas"><div className="h-full bg-soe-teal" style={{ width: `${d.summary.averageCompleteness}%` }} /></div></div></Card>
      </div>

      <Card><DashboardSectionTitle title="Module submission coverage and review quality" action={<Link className={linkClass} to="/moip/modules/enterprise">Explore portfolio data</Link>} /><div className="overflow-x-auto"><table className="w-full min-w-[980px] text-left text-sm"><thead className="text-[11px] uppercase text-soe-slate"><tr><th className="py-2">Module</th><th>Coverage</th><th>Received</th><th>Approved</th><th>Completion</th><th>Review issues</th><th>Evidence gaps</th><th></th></tr></thead><tbody>{d.moduleCoverage.map((item) => <tr key={item.module} className="border-t border-soe-border"><td className="py-2.5 font-medium text-soe-navy">{item.label}</td><td className="w-48"><div className="h-1.5 bg-soe-canvas"><div className="h-full bg-soe-blue" style={{ width: `${Math.round((item.received / Math.max(1, item.expected)) * 100)}%` }} /></div></td><td>{item.received} / {item.expected}</td><td>{item.approved}</td><td>{item.averageCompleteness}%</td><td className={item.issues ? 'font-semibold text-soe-critical' : ''}>{item.issues}</td><td className={item.evidenceGaps ? 'font-semibold text-soe-warning' : ''}>{item.evidenceGaps}</td><td><Link className={linkClass} to={`/moip/modules/${item.module}`}>Inspect</Link></td></tr>)}</tbody></table></div></Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card><DashboardSectionTitle title="Fiscal exposure & portfolio result" action={<Link className={linkClass} to="/moip/modules/finance">Financials</Link>} /><div className="grid grid-cols-2 gap-4 sm:grid-cols-4"><div><p className="text-xs text-soe-slate">Asset value</p><p className="mt-1 text-lg font-bold text-soe-navy">{formatCurrencyPkr(d.fiscal.assetValue)}</p></div><div><p className="text-xs text-soe-slate">Total debt</p><p className="mt-1 text-lg font-bold text-soe-navy">{formatCurrencyPkr(d.fiscal.debt)}</p></div><div><p className="text-xs text-soe-slate">Guarantees</p><p className="mt-1 text-lg font-bold text-soe-navy">{formatCurrencyPkr(d.fiscal.guarantees)}</p></div><div><p className="text-xs text-soe-slate">Subsidies & support</p><p className="mt-1 text-lg font-bold text-soe-navy">{formatCurrencyPkr(d.fiscal.subsidies)}</p></div></div><div className="mt-5 grid grid-cols-3 border-t border-soe-border pt-4"><div><p className="text-xs text-soe-slate">Net result</p><p className={cn('text-xl font-bold', d.fiscal.netPortfolioResult < 0 ? 'text-soe-critical' : 'text-soe-teal')}>{formatCurrencyPkr(d.fiscal.netPortfolioResult)}</p></div><div><p className="text-xs text-soe-slate">Profitable</p><p className="text-xl font-bold text-soe-teal">{d.fiscal.profitable}</p></div><div><p className="text-xs text-soe-slate">Loss-making</p><p className="text-xl font-bold text-soe-critical">{d.fiscal.lossMaking}</p></div></div></Card>
        <Card><DashboardSectionTitle title="Governance, accountability & operational risk" /><div className="grid grid-cols-2 gap-x-5 gap-y-4 sm:grid-cols-4"><div><p className="text-xs text-soe-slate">Board vacancies</p><p className="text-xl font-bold text-soe-navy">{d.risk.boardVacancies}</p></div><div><p className="text-xs text-soe-slate">Open audit paras</p><p className="text-xl font-bold text-soe-critical">{d.risk.openAuditParas}</p><p className="text-[11px] text-soe-slate">{formatCurrencyPkr(d.risk.auditExposure)}</p></div><div><p className="text-xs text-soe-slate">Active litigation</p><p className="text-xl font-bold text-soe-critical">{d.risk.activeLitigation}</p><p className="text-[11px] text-soe-slate">{formatCurrencyPkr(d.risk.litigationExposure)}</p></div><div><p className="text-xs text-soe-slate">Overdue loans</p><p className="text-xl font-bold text-soe-warning">{d.risk.overdueLoans}</p></div><div><p className="text-xs text-soe-slate">Non-compliance</p><p className="text-xl font-bold text-soe-critical">{d.risk.nonCompliantObligations}</p></div><div><p className="text-xs text-soe-slate">Capacity utilization</p><p className="text-xl font-bold text-soe-navy">{d.risk.averageCapacityUtilization}%</p></div>{userRisk ? <><div><p className="text-xs text-soe-slate">MFA gaps</p><p className="text-xl font-bold text-soe-warning">{userRisk.mfaMissing}</p></div><div><p className="text-xs text-soe-slate">Restricted users</p><p className="text-xl font-bold text-soe-navy">{userRisk.locked}</p></div></> : null}</div></Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <Card><DashboardSectionTitle title="Sector performance" action={<Link className={linkClass} to="/moip/industrial">Industrial performance</Link>} /><div className="h-[290px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={d.sectors.slice(0, 8)} layout="vertical" margin={{ left: 40, right: 14 }}><CartesianGrid stroke={DASHBOARD_COLORS.grid} horizontal={false} /><XAxis type="number" tickFormatter={(value) => formatCurrencyPkr(Number(value)).replace('PKR ', '')} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} /><YAxis type="category" dataKey="sector" width={120} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} /><Tooltip formatter={(value) => formatCurrencyPkr(Number(value))} contentStyle={{ borderRadius: 4, borderColor: DASHBOARD_COLORS.grid, fontSize: 11 }} /><Bar dataKey="revenue" name="Revenue" fill={DASHBOARD_COLORS.blue} radius={[0, 3, 3, 0]} /><Bar dataKey="profitOrLoss" name="Profit / loss" radius={[0, 3, 3, 0]}>{d.sectors.slice(0, 8).map((item) => <Cell key={item.sector} fill={item.profitOrLoss < 0 ? DASHBOARD_COLORS.red : DASHBOARD_COLORS.teal} />)}</Bar></BarChart></ResponsiveContainer></div></Card>
        <Card><DashboardSectionTitle title="Historical submission trend" /><div className="h-[290px]"><ResponsiveContainer width="100%" height="100%"><LineChart data={d.trend} margin={{ top: 10, right: 14, left: -15, bottom: 5 }}><CartesianGrid stroke={DASHBOARD_COLORS.grid} vertical={false} /><XAxis dataKey="period" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} /><YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} /><Tooltip contentStyle={{ borderRadius: 4, borderColor: DASHBOARD_COLORS.grid, fontSize: 11 }} /><Line type="monotone" dataKey="received" name="Received" stroke={DASHBOARD_COLORS.blue} strokeWidth={2.5} dot={{ r: 3 }} /><Line type="monotone" dataKey="approved" name="Approved" stroke={DASHBOARD_COLORS.teal} strokeWidth={2.5} dot={{ r: 3 }} /></LineChart></ResponsiveContainer></div></Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card><DashboardSectionTitle title="Priority review queue" action={<Link className={linkClass} to="/moip/submissions">View all</Link>} /><div className="overflow-x-auto"><table className="w-full min-w-[650px] text-left text-sm"><thead className="text-[11px] uppercase text-soe-slate"><tr><th className="py-2">SOE / module</th><th>Priority</th><th>Issues</th><th>Age</th><th>Status</th><th></th></tr></thead><tbody>{d.priorityQueue.map((item) => <tr key={item.submission.id} className="border-t border-soe-border"><td className="py-2"><p className="font-medium text-soe-navy">{item.organization.abbreviation}</p><p className="text-xs capitalize text-soe-slate">{moduleLabel(item.submission.module)}</p></td><td><StatusBadge status={item.priority} family="risk" label={item.priority} /></td><td>{item.validationIssues + item.evidenceGaps}</td><td>{item.ageDays}d</td><td><StatusBadge status={item.submission.status} family="reporting" label={SUBMISSION_STATUS_LABEL[item.submission.status]} /></td><td><Link className={linkClass} to={`/moip/submissions/${item.submission.id}`}>Review</Link></td></tr>)}</tbody></table></div></Card>
        <Card><DashboardSectionTitle title="SOEs requiring attention" action={<Link className={linkClass} to="/moip/portfolio?riskOnly=true">Portfolio risk</Link>} /><div className="overflow-x-auto"><table className="w-full min-w-[650px] text-left text-sm"><thead className="text-[11px] uppercase text-soe-slate"><tr><th className="py-2">SOE</th><th>Completion</th><th>Exceptions</th><th>Board</th><th>Audit</th><th>Legal</th><th>Loans</th></tr></thead><tbody>{d.organizationsAtRisk.map((item) => <tr key={item.organizationId} className="border-t border-soe-border"><td className="py-2"><Link className="font-medium text-soe-blue" to={`/moip/enterprise/${item.organizationId}/review?period=${reportingPeriodId}`}>{item.abbreviation}</Link><p className="text-xs text-soe-slate">{item.sector}</p></td><td>{item.completion}%</td><td className="font-semibold text-soe-critical">{item.warnings}</td><td>{item.boardVacancies}</td><td>{item.openAuditParas}</td><td>{item.activeLitigation}</td><td>{item.overdueLoans}</td></tr>)}</tbody></table></div></Card>
      </div>
    </div>
  )
}

export function MoipPortfolioPage() {
  return (
    <RequirePermission permission={PERMISSION.PORTFOLIO_READ}>
      <MoipPortfolioContent />
    </RequirePermission>
  )
}

function MoipPortfolioContent() {
  const reportingPeriodId = useSessionStore((s) => s.reportingPeriodId)
  const setReportingPeriodId = useSessionStore((s) => s.setReportingPeriodId)
  const [sector, setSector] = useState('')
  const [status, setStatus] = useState('')
  const [submissionStatus, setSubmissionStatus] = useState('')
  const [reviewer, setReviewer] = useState('')
  const [riskOnly, setRiskOnly] = useState(false)
  const [overdueOnly, setOverdueOnly] = useState(false)
  const [search, setSearch] = useState('')

  const query = useQuery({
    queryKey: [
      'moip-portfolio',
      sector,
      status,
      submissionStatus,
      reviewer,
      riskOnly,
      overdueOnly,
      search,
      reportingPeriodId,
    ],
    queryFn: () =>
      mockMoipPortalService.getPortfolio({
        pageSize: 100,
        sector: sector || undefined,
        status: status || undefined,
        submissionStatus: submissionStatus || undefined,
        reviewer: reviewer || undefined,
        riskOnly: riskOnly || undefined,
        overdueOnly: overdueOnly || undefined,
        search: search || undefined,
        reportingPeriodId,
      }),
  })

  const sectors = useMemo(() => {
    const items = query.data?.items ?? []
    return [...new Set(items.map((r) => r.sector))].sort()
  }, [query.data?.items])

  const columns = useMemo<ColumnDef<MoipPortfolioRow, unknown>[]>(
    () => [
      {
        accessorFn: (r) => r.organization.abbreviation,
        id: 'soe',
        header: 'SOE',
        cell: ({ row }) => (
          <Link className={linkClass} to={`/moip/enterprise/${row.original.organization.id}/review?period=${reportingPeriodId}`}>
            {row.original.organization.abbreviation}
          </Link>
        ),
      },
      { accessorFn: (r) => r.sector, id: 'sector', header: 'Sector' },
      {
        accessorFn: (r) => r.status,
        id: 'status',
        header: 'Status',
        cell: ({ getValue }) => (
          <StatusBadge status={String(getValue())} family="reporting" />
        ),
      },
      { accessorFn: (r) => r.activePeriodId, id: 'period', header: 'Period' },
      {
        accessorFn: (r) => r.submissionStatus,
        id: 'submissionStatus',
        header: 'Submission',
        cell: ({ row }) => {
          const st = row.original.submissionStatus
          return (
            <Link
              className={linkClass}
              to={
                st === SUBMISSION_STATUS.UNDER_REVIEW ||
                st === SUBMISSION_STATUS.SUBMITTED ||
                st === SUBMISSION_STATUS.RESUBMITTED
                  ? `/moip/submissions?status=${st}`
                  : '/moip/submissions'
              }
            >
              <StatusBadge
                status={st === 'not_started' ? 'draft' : st}
                family="reporting"
                label={submissionStatusLabel(st)}
              />
            </Link>
          )
        },
      },
      {
        accessorFn: (r) => r.completion,
        id: 'completion',
        header: 'Completion %',
        cell: ({ getValue }) => `${getValue()}%`,
      },
      {
        accessorFn: (r) => r.dataQuality,
        id: 'dataQuality',
        header: 'Data quality',
        cell: ({ getValue }) => (
          <StatusBadge status={String(getValue())} family="risk" />
        ),
      },
      {
        accessorFn: (r) => r.majorWarnings.join('; '),
        id: 'warnings',
        header: 'Warnings',
        cell: ({ row }) =>
          row.original.majorWarnings.length ? (
            <span className="text-xs text-soe-slate">{row.original.majorWarnings.join(' · ')}</span>
          ) : (
            '—'
          ),
      },
      {
        accessorFn: (r) => r.assignedReviewerRole,
        id: 'reviewer',
        header: 'Reviewer',
        cell: ({ getValue }) =>
          getValue() ? ROLE_LABEL[getValue() as RoleId] : '—',
      },
      {
        accessorFn: (r) => r.lastActivityAt,
        id: 'lastActivity',
        header: 'Last activity',
        cell: ({ getValue }) => new Date(String(getValue())).toLocaleDateString(),
      },
    ],
    [reportingPeriodId],
  )

  if (query.isError) return <ErrorState title="Unable to load portfolio" />

  return (
    <div>
      <PageHeader
        title="SOE portfolio"
        subtitle="Submission posture and cross-module review packages by enterprise and financial year"
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
        <SelectField
          label="Financial year"
          value={reportingPeriodId}
          options={reportingPeriods
            .filter((period) => period.type === 'annual')
            .map((period) => ({ value: period.id, label: period.label }))}
          onChange={(e) => setReportingPeriodId(e.target.value)}
        />
        <SelectField
          label="Sector"
          value={sector}
          options={[{ value: '', label: 'All sectors' }, ...sectors.map((s) => ({ value: s, label: s }))]}
          onChange={(e) => setSector(e.target.value)}
        />
        <SelectField
          label="Org status"
          value={status}
          options={[
            { value: '', label: 'All' },
            { value: 'active', label: 'Active' },
            { value: 'inactive', label: 'Inactive' },
          ]}
          onChange={(e) => setStatus(e.target.value)}
        />
        <SelectField
          label="Submission status"
          value={submissionStatus}
          options={[
            { value: '', label: 'All' },
            ...Object.values(SUBMISSION_STATUS).map((s) => ({
              value: s,
              label: SUBMISSION_STATUS_LABEL[s],
            })),
            { value: 'not_started', label: 'Not started' },
          ]}
          onChange={(e) => setSubmissionStatus(e.target.value)}
        />
        <SelectField
          label="Reviewer"
          value={reviewer}
          options={[
            { value: '', label: 'Any' },
            ...REVIEWER_ROLE_OPTIONS,
          ]}
          onChange={(e) => setReviewer(e.target.value)}
        />
        <TextField
          label="Search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Name or abbreviation"
        />
        <label className="flex items-end gap-2 pb-2 text-sm">
          <input
            type="checkbox"
            checked={riskOnly}
            onChange={(e) => setRiskOnly(e.target.checked)}
          />
          Risk only
        </label>
        <label className="flex items-end gap-2 pb-2 text-sm">
          <input
            type="checkbox"
            checked={overdueOnly}
            onChange={(e) => setOverdueOnly(e.target.checked)}
          />
          Overdue only
        </label>
      </div>

      <DataTable
        data={query.data?.items ?? []}
        columns={columns}
        isLoading={query.isLoading}
        density="compact"
        searchPlaceholder="Filter portfolio…"
      />
    </div>
  )
}

export function MoipSubmissionQueueWorkspace() {
  return (
    <RequirePermission permission={PERMISSION.PORTFOLIO_READ}>
      <MoipSubmissionQueueContent />
    </RequirePermission>
  )
}

function MoipSubmissionQueueContent() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { role, canReview } = useReviewPermissions()
  const pushToast = useUiStore((s) => s.pushToast)
  const queryClient = useQueryClient()

  const [status, setStatus] = useState(searchParams.get('status') ?? '')
  const [moduleFilter, setModuleFilter] = useState('')
  const [reviewer, setReviewer] = useState('')
  const [priority, setPriority] = useState('')
  const [sortBy, setSortBy] = useState<'age' | 'priority'>('priority')
  const [assignRole, setAssignRole] = useState<RoleId>(ROLE.MOIP_REVIEWER)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [assignTarget, setAssignTarget] = useState('')

  const query = useQuery({
    queryKey: ['moip-submission-queue', status, moduleFilter, reviewer, priority, sortBy],
    queryFn: () =>
      mockMoipPortalService.getSubmissionQueue({
        pageSize: 200,
        status: status || undefined,
        module: moduleFilter || undefined,
        reviewer: reviewer || undefined,
        priority: priority || undefined,
        sortBy,
      }),
  })

  const assignMutation = useMutation({
    mutationFn: (submissionId: string) =>
      mockMoipPortalService.assignReviewer(submissionId, assignRole, role),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['moip-submission-queue'] })
      pushToast({ title: 'Reviewer assigned.', tone: 'success' })
      setAssignTarget('')
    },
    onError: (err: unknown) =>
      pushToast({
        title: err instanceof AppError ? err.message : 'Assignment failed',
        tone: 'critical',
      }),
  })

  const bulkMutation = useMutation({
    mutationFn: () =>
      mockMoipPortalService.bulkAssignPlaceholder([...selected], assignRole, role),
    onSuccess: (res) => {
      void queryClient.invalidateQueries({ queryKey: ['moip-submission-queue'] })
      setSelected(new Set())
      pushToast({ title: `${res.assigned} assigned.`, tone: 'success' })
    },
    onError: (err: unknown) =>
      pushToast({
        title: err instanceof AppError ? err.message : 'Bulk assign failed',
        tone: 'critical',
      }),
  })

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const columns = useMemo<ColumnDef<MoipQueueRow, unknown>[]>(
    () => [
      ...(canReview
        ? [
            {
              id: 'select',
              header: '',
              cell: ({ row }: { row: { original: MoipQueueRow } }) => (
                <input
                  type="checkbox"
                  checked={selected.has(row.original.submission.id)}
                  onChange={() => toggleSelect(row.original.submission.id)}
                  aria-label={`Select ${row.original.submission.id}`}
                />
              ),
            } satisfies ColumnDef<MoipQueueRow, unknown>,
          ]
        : []),
      { accessorFn: (r) => r.submission.id, id: 'id', header: 'ID' },
      {
        accessorFn: (r) => r.organization.abbreviation,
        id: 'soe',
        header: 'SOE',
      },
      {
        accessorFn: (r) => r.submission.reportingPeriodId,
        id: 'period',
        header: 'Period',
      },
      {
        accessorFn: (r) => r.submission.module,
        id: 'module',
        header: 'Module',
        cell: ({ getValue }) => moduleLabel(String(getValue())),
      },
      {
        accessorFn: (r) => r.submission.submittedAt,
        id: 'submitted',
        header: 'Submitted',
        cell: ({ getValue }) =>
          getValue() ? new Date(String(getValue())).toLocaleDateString() : '—',
      },
      {
        accessorFn: (r) => r.submission.status,
        id: 'status',
        header: 'Status',
        cell: ({ getValue }) => (
          <StatusBadge
            status={String(getValue())}
            family="reporting"
            label={SUBMISSION_STATUS_LABEL[getValue() as SubmissionStatus]}
          />
        ),
      },
      { accessorFn: (r) => r.validationIssues, id: 'validation', header: 'Validation' },
      { accessorFn: (r) => r.evidenceGaps, id: 'evidence', header: 'Evidence gaps' },
      {
        accessorFn: (r) => r.submission.assignedReviewerRole,
        id: 'reviewer',
        header: 'Reviewer',
        cell: ({ getValue }) =>
          getValue() ? ROLE_LABEL[getValue() as RoleId] : '—',
      },
      { accessorFn: (r) => r.ageDays, id: 'age', header: 'Age (d)' },
      {
        accessorFn: (r) => r.priority,
        id: 'priority',
        header: 'Priority',
        cell: ({ getValue }) => (
          <StatusBadge
            status={String(getValue())}
            family="risk"
            label={REVIEW_PRIORITY_LABEL[String(getValue())] ?? String(getValue())}
          />
        ),
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) =>
          canReview ? (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => navigate(`/moip/submissions/${row.original.submission.id}`)}
            >
              Review
            </Button>
          ) : (
            <Link className={linkClass} to={`/moip/enterprise/${row.original.organization.id}`}>
              View SOE
            </Link>
          ),
      },
    ],
    [canReview, navigate, selected],
  )

  if (query.isError) return <ErrorState title="Unable to load submission queue" />

  return (
    <div>
      <PageHeader
        title="Submission queue"
        subtitle="Cross-module submissions awaiting MoIP review · read-only source data"
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <SelectField
          label="Status"
          value={status}
          options={[
            { value: '', label: 'All queue statuses' },
            { value: SUBMISSION_STATUS.SUBMITTED, label: SUBMISSION_STATUS_LABEL.submitted },
            { value: SUBMISSION_STATUS.UNDER_REVIEW, label: SUBMISSION_STATUS_LABEL.under_review },
            {
              value: SUBMISSION_STATUS.CLARIFICATION_REQUESTED,
              label: SUBMISSION_STATUS_LABEL.clarification_requested,
            },
            { value: SUBMISSION_STATUS.RESUBMITTED, label: SUBMISSION_STATUS_LABEL.resubmitted },
          ]}
          onChange={(e) => setStatus(e.target.value)}
        />
        <SelectField
          label="Module"
          value={moduleFilter}
          options={[
            { value: '', label: 'All modules' },
            ...REPORTING_MODULES.map((m) => ({ value: m.id, label: m.label })),
          ]}
          onChange={(e) => setModuleFilter(e.target.value)}
        />
        <SelectField
          label="Reviewer"
          value={reviewer}
          options={[{ value: '', label: 'Any' }, ...REVIEWER_ROLE_OPTIONS]}
          onChange={(e) => setReviewer(e.target.value)}
        />
        <SelectField
          label="Priority"
          value={priority}
          options={[
            { value: '', label: 'Any' },
            { value: 'normal', label: REVIEW_PRIORITY_LABEL.normal },
            { value: 'high', label: REVIEW_PRIORITY_LABEL.high },
            { value: 'critical', label: REVIEW_PRIORITY_LABEL.critical },
          ]}
          onChange={(e) => setPriority(e.target.value)}
        />
        <SelectField
          label="Sort by"
          value={sortBy}
          options={[
            { value: 'priority', label: 'Priority' },
            { value: 'age', label: 'Age' },
          ]}
          onChange={(e) => setSortBy(e.target.value as 'age' | 'priority')}
        />
      </div>

      {canReview ? (
        <div className="mb-4 flex flex-wrap items-end gap-3">
          <SelectField
            label="Assign reviewer"
            value={assignRole}
            options={REVIEWER_ROLE_OPTIONS}
            onChange={(e) => setAssignRole(e.target.value as RoleId)}
          />
          <SelectField
            label="Submission"
            value={assignTarget}
            options={[
              { value: '', label: 'Select row…' },
              ...(query.data?.items ?? []).map((r) => ({
                value: r.submission.id,
                label: `${r.organization.abbreviation} · ${r.submission.module}`,
              })),
            ]}
            onChange={(e) => setAssignTarget(e.target.value)}
          />
          <Button
            variant="secondary"
            disabled={!assignTarget || assignMutation.isPending}
            loading={assignMutation.isPending}
            onClick={() => assignMutation.mutate(assignTarget)}
          >
            Assign
          </Button>
          <Button
            variant="tertiary"
            disabled={selected.size === 0 || bulkMutation.isPending}
            loading={bulkMutation.isPending}
            onClick={() => bulkMutation.mutate()}
          >
            Bulk assign
          </Button>
        </div>
      ) : null}

      <DataTable
        data={query.data?.items ?? []}
        columns={columns}
        isLoading={query.isLoading}
        density="compact"
        emptyTitle="No submissions in review queue."
      />
    </div>
  )
}

export function MoipSoeReviewLinks({ organizationId }: { organizationId: string }) {
  return (
    <Card title="SOE review links">
      <ul className="grid gap-1 text-sm sm:grid-cols-2">
        <li>
          <Link className={linkClass} to={`/moip/enterprise/${organizationId}`}>
            Enterprise profile
          </Link>
        </li>
        <li>
          <Link className={linkClass} to="/moip/assets">
            Assets & property
          </Link>
        </li>
        <li>
          <Link className={linkClass} to="/moip/governance">
            Governance
          </Link>
        </li>
        <li>
          <Link className={linkClass} to="/moip/finance">
            Financial & fiscal
          </Link>
        </li>
        <li>
          <Link className={linkClass} to="/moip/audit-compliance">
            Audit & compliance
          </Link>
        </li>
        <li>
          <Link className={linkClass} to="/moip/documents">
            Documents & evidence
          </Link>
        </li>
        <li>
          <Link className={linkClass} to="/moip/submissions">
            Submissions (filtered in queue)
          </Link>
        </li>
      </ul>
    </Card>
  )
}

export function MoipSoeDetailHubPage() {
  const { organizationId = '' } = useParams()
  if (!organizationId) {
    return <ErrorState title="Organization not specified" />
  }
  return (
    <div>
      <PageHeader title="SOE review hub" subtitle="Cross-module review entry points" />
      <MoipSoeReviewLinks organizationId={organizationId} />
    </div>
  )
}

export function MoipReviewerWorkspacePage() {
  return (
    <RequirePermission permission={PERMISSION.PORTFOLIO_READ}>
      <MoipReviewerWorkspaceContent />
    </RequirePermission>
  )
}

function MoipReviewerWorkspaceContent() {
  const { submissionId = '' } = useParams()
  const { role, canReview, canApprove, canClarify, canEscalate } = useReviewPermissions()
  const setOrganizationId = useSessionStore((s) => s.setOrganizationId)
  const pushToast = useUiStore((s) => s.pushToast)
  const queryClient = useQueryClient()

  const [tab, setTab] = useState<ReviewTab>('issues')
  const [question, setQuestion] = useState('')
  const [affectedField, setAffectedField] = useState('revenue')
  const [returnReason, setReturnReason] = useState('')
  const [returnItem, setReturnItem] = useState('')
  const [returnDue, setReturnDue] = useState('2026-08-25')
  const [escReason, setEscReason] = useState('')
  const [escReasonCode, setEscReasonCode] = useState<Escalation['reasonCode']>(
    ESCALATION_REASON.UNRESOLVED_REVIEW,
  )
  const [escSeverity, setEscSeverity] = useState<Escalation['severity']>(
    ESCALATION_SEVERITY.ATTENTION,
  )
  const [escDue, setEscDue] = useState('2026-08-20')
  const [approvalStatement, setApprovalStatement] = useState('')
  const [confirmApprove, setConfirmApprove] = useState(false)
  const [approvedBanner, setApprovedBanner] = useState<{
    by: string
    at: string
    version: string
  } | null>(null)

  const queue = useQuery({
    queryKey: ['moip-submission-queue'],
    queryFn: () => mockMoipPortalService.getSubmissionQueue({ pageSize: 200 }),
  })

  const row = queue.data?.items.find((r) => r.submission.id === submissionId)
  const isFinance = row?.submission.module === MODULE.FINANCE

  const workspace = useQuery({
    queryKey: [
      'finance-workspace',
      row?.submission.organizationId,
      row?.submission.reportingPeriodId,
      role,
    ],
    enabled: !!row && isFinance,
    queryFn: () =>
      mockFinanceWorkflowService.getWorkspace(
        row!.submission.organizationId,
        row!.submission.reportingPeriodId,
        role,
      ),
  })

  const modules = useQuery({
    queryKey: ['moip-module-summaries', row?.submission.organizationId, row?.submission.reportingPeriodId],
    enabled: !!row,
    queryFn: () =>
      mockMoipPortalService.getModuleSummaries(
        row!.submission.organizationId,
        row!.submission.reportingPeriodId,
      ),
  })

  const comparison = useQuery({
    queryKey: ['moip-comparison', submissionId],
    enabled: !!row,
    queryFn: () => mockMoipPortalService.getComparison(submissionId),
  })

  const dataQuality = useQuery({
    queryKey: ['moip-data-quality', row?.submission.organizationId],
    enabled: !!row,
    queryFn: () => mockMoipPortalService.getDataQuality(row!.submission.organizationId),
  })

  const takeMutation = useMutation({
    mutationFn: () => mockFinanceWorkflowService.takeUnderReview(submissionId, role),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['moip-submission-queue'] })
      void queryClient.invalidateQueries({ queryKey: ['finance-workspace'] })
      pushToast({ title: 'Taken under review.', tone: 'success' })
    },
    onError: (err: unknown) =>
      pushToast({
        title: err instanceof AppError ? err.message : 'Failed',
        tone: 'critical',
      }),
  })

  const clarifyMutation = useMutation({
    mutationFn: () =>
      mockFinanceWorkflowService.requestClarification(submissionId, role, {
        question,
        affectedField,
        dueDate: '2026-08-20',
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['moip-submission-queue'] })
      void queryClient.invalidateQueries({ queryKey: ['finance-workspace'] })
      setQuestion('')
      pushToast({ title: 'Clarification requested.', tone: 'success' })
    },
    onError: (err: unknown) =>
      pushToast({
        title: err instanceof AppError ? err.message : 'Failed',
        tone: 'critical',
      }),
  })

  const returnMutation = useMutation({
    mutationFn: () =>
      mockMoipPortalService.returnSubmission(submissionId, role, {
        reason: returnReason,
        affectedItem: returnItem || undefined,
        dueDate: returnDue,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['moip-submission-queue'] })
      pushToast({ title: 'Returned to SOE.', tone: 'success' })
      setReturnReason('')
    },
    onError: (err: unknown) =>
      pushToast({
        title: err instanceof AppError ? err.message : 'Return failed',
        tone: 'critical',
      }),
  })

  const approveMutation = useMutation({
    mutationFn: () =>
      mockFinanceWorkflowService.approve(submissionId, role, ROLE_LABEL[role]),
    onSuccess: (sub) => {
      void queryClient.invalidateQueries({ queryKey: ['moip-submission-queue'] })
      void queryClient.invalidateQueries({ queryKey: ['finance-workspace'] })
      void queryClient.invalidateQueries({ queryKey: ['approved-finance-kpis'] })
      setConfirmApprove(false)
      setApprovedBanner({
        by: ROLE_LABEL[role],
        at: new Date().toISOString(),
        version: sub.version,
      })
      pushToast({ title: 'Approved and locked.', tone: 'success' })
    },
    onError: (err: unknown) => {
      setConfirmApprove(false)
      pushToast({
        title: err instanceof AppError ? err.message : 'Approval failed',
        tone: 'critical',
      })
    },
  })

  const escalateMutation = useMutation({
    mutationFn: () =>
      mockMoipPortalService.createEscalation(role, {
        organizationId: row!.submission.organizationId,
        submissionId,
        reason: escReason,
        reasonCode: escReasonCode,
        severity: escSeverity,
        ownerRole: ROLE.MOIP_SUPERVISOR,
        dueDate: escDue,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['moip-escalations'] })
      setEscReason('')
      pushToast({ title: 'Escalation created.', tone: 'success' })
    },
    onError: (err: unknown) =>
      pushToast({
        title: err instanceof AppError ? err.message : 'Escalation failed',
        tone: 'critical',
      }),
  })

  useEffect(() => {
    if (row?.organization.id) setOrganizationId(row.organization.id)
  }, [row?.organization.id, setOrganizationId])

  if (queue.isLoading || (isFinance && row && workspace.isLoading)) {
    return <LoadingBlock label="Loading review workspace…" />
  }

  if (!row) {
    return (
      <ErrorState
        title="Submission not found"
        detail="It may be outside the active review queue or already locked."
      />
    )
  }

  const ws = workspace.data
  const dq = dataQuality.data?.[0]
  const unresolvedBlocking = dq?.blocking ?? row.validationIssues
  const unresolvedWarnings = dq?.warnings ?? 0
  const evidenceGaps = dq?.evidenceGaps ?? row.evidenceGaps

  const approveChecklist = [
    `Organization: ${row.organization.abbreviation}`,
    `Period: ${row.submission.reportingPeriodId}`,
    `Version: ${row.submission.version}`,
    `Unresolved blocking: ${unresolvedBlocking}`,
    `Warnings: ${unresolvedWarnings}`,
    `Evidence gaps: ${evidenceGaps}`,
    `Reviewer: ${ROLE_LABEL[role]}`,
    approvalStatement.trim()
      ? `Statement: ${approvalStatement.trim()}`
      : 'Statement: (none entered)',
  ].join('\n')

  const tabs: { id: ReviewTab; label: string }[] = [
    { id: 'issues', label: 'Issues' },
    { id: 'evidence', label: 'Evidence' },
    { id: 'comparison', label: 'Comparison' },
    { id: 'history', label: 'History' },
    { id: 'actions', label: 'Actions' },
  ]

  return (
    <div>
      <PageHeader
        title={`${row.organization.name} · ${row.submission.reportingPeriodId}`}
        subtitle={`${moduleLabel(row.submission.module)} · ${submissionStatusLabel(row.submission.status)} · MoIP read-only review`}
        actions={
          <Link className={linkClass} to="/moip/submissions">
            Queue
          </Link>
        }
      />

      <Alert className="mb-4" tone="info" title="Read-only review">
        MoIP cannot edit source values in this workspace. Use clarify, return, approve, or escalate
        actions only.
      </Alert>

      {approvedBanner ? (
        <Alert
          className="mb-4"
          tone="success"
          title={`Approved by ${approvedBanner.by} · ${new Date(approvedBanner.at).toLocaleString()} · version ${approvedBanner.version}`}
        />
      ) : null}

      {ws && isFinance ? (
        <WorkflowChrome
          status={ws.submission.status}
          actionOwner={ws.actionOwner}
          nextActionHint={ws.nextActionHint}
          actions={ws.availableActions.filter((a) =>
            ['take_under_review', 'request_clarification', 'approve'].includes(a.id),
          )}
          onAction={(a) => {
            if (!canReview) return
            if (a.id === 'take_under_review') takeMutation.mutate()
            if (a.id === 'approve' && canApprove) setConfirmApprove(true)
          }}
        />
      ) : null}

      <Card title="Module summary" className="mb-4">
        {modules.isLoading ? (
          <LoadingBlock />
        ) : (
          <ul className="space-y-1 text-sm">
            {(modules.data ?? []).map((m) => (
              <li
                key={m.module}
                className="flex flex-wrap items-center justify-between gap-2 border-b border-soe-border py-1.5"
              >
                <span>
                  {m.label} · {submissionStatusLabel(m.status)} · {m.issueCount} issue(s)
                </span>
                {m.submissionId && m.module === MODULE.FINANCE ? (
                  <Link className={linkClass} to={`/moip/submissions/${m.submissionId}`}>
                    Finance review
                  </Link>
                ) : m.submissionId ? (
                  <Link className={linkClass} to={`/moip/submissions/${m.submissionId}`}>
                    Open
                  </Link>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <MoipSoeReviewLinks organizationId={row.organization.id} />

      <div className="mb-3 mt-4 flex flex-wrap gap-2">
        {tabs.map((t) => (
          <Button
            key={t.id}
            size="sm"
            variant={tab === t.id ? 'primary' : 'secondary'}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </Button>
        ))}
      </div>

      {tab === 'issues' ? (
        <Card title="Data quality">
          {dq ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <KpiCard label="Blocking" value={String(dq.blocking)} />
              <KpiCard label="Warnings" value={String(dq.warnings)} />
              <KpiCard label="Evidence gaps" value={String(dq.evidenceGaps)} />
              <KpiCard label="Incomplete modules" value={String(dq.incompleteModules)} />
            </div>
          ) : (
            <LoadingBlock />
          )}
          {ws?.validation?.length ? (
            <ul className="mt-3 space-y-2 text-sm">
              {ws.validation.map((v) => (
                <li key={v.message}>
                  <StatusBadge status={v.severity} family="risk" label={v.message} />
                </li>
              ))}
            </ul>
          ) : null}
        </Card>
      ) : null}

      {tab === 'evidence' ? (
        <Card title="Evidence">
          {ws?.evidence?.length ? (
            <ul className="space-y-1 text-sm">
              {ws.evidence.map((d) => (
                <li key={d.id} className="border-b border-soe-border py-1.5">
                  <Link className={linkClass} to={`/moip/documents/${d.id}`}>
                    {d.title}
                  </Link>{' '}
                  · v{d.version}
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="No linked evidence" hint="Open documents workspace for attachments." />
          )}
        </Card>
      ) : null}

      {tab === 'comparison' ? (
        <Card title="Period comparison">
          {comparison.isLoading ? (
            <LoadingBlock />
          ) : comparison.data ? (
            <>
              <p className="mb-2 text-xs text-soe-slate">{comparison.data.rulesNote}</p>
              <ComparisonTable highlights={comparison.data.highlights} finance={ws} />
            </>
          ) : (
            <ErrorState title="Comparison unavailable" />
          )}
        </Card>
      ) : null}

      {tab === 'history' ? (
        <Card title="Review history">
          {ws?.timeline?.length ? (
            <ul className="space-y-2 text-sm">
              {ws.timeline.map((e) => (
                <li key={e.id} className="border-b border-soe-border py-1.5">
                  <p className="font-medium">{e.title}</p>
                  <p className="text-xs text-soe-slate">
                    {e.category} · {new Date(e.occurredAt).toLocaleString()}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="No timeline events" hint="Finance workflow history appears when available." />
          )}
        </Card>
      ) : null}

      {tab === 'actions' && canReview ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {isFinance ? (
            <>
              <Card title="Take under review">
                <p className="mb-3 text-sm text-soe-slate">
                  Marks finance pack under MoIP review (finance module only).
                </p>
                <Button loading={takeMutation.isPending} onClick={() => takeMutation.mutate()}>
                  Take under review
                </Button>
              </Card>

              {canClarify ? (
                <Card title="Request clarification">
                  <div className="space-y-3">
                    <SelectField
                      label="Affected field"
                      value={affectedField}
                      options={[
                        { value: 'revenue', label: 'Revenue' },
                        { value: 'subsidies', label: 'Subsidies' },
                        { value: 'profitOrLoss', label: 'Profit / Loss' },
                        { value: 'general', label: 'General' },
                      ]}
                      onChange={(e) => setAffectedField(e.target.value)}
                    />
                    <TextareaField
                      label="Question"
                      value={question}
                      onChange={(e) => setQuestion(e.target.value)}
                      rows={3}
                    />
                    <Button
                      disabled={!question.trim()}
                      loading={clarifyMutation.isPending}
                      onClick={() => clarifyMutation.mutate()}
                    >
                      Request clarification
                    </Button>
                  </div>
                </Card>
              ) : null}

              {canApprove ? (
                <Card title="Approve">
                  <TextareaField
                    label="Approval statement"
                    value={approvalStatement}
                    onChange={(e) => setApprovalStatement(e.target.value)}
                    rows={2}
                    placeholder="Optional approval note for audit trail"
                  />
                  <Button className="mt-3" onClick={() => setConfirmApprove(true)}>
                    Approve and lock
                  </Button>
                </Card>
              ) : null}
            </>
          ) : null}

          <Card title="Return to SOE">
            <div className="space-y-3">
              <TextareaField
                label="Reason"
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
                rows={2}
              />
              <TextField
                label="Affected item"
                value={returnItem}
                onChange={(e) => setReturnItem(e.target.value)}
              />
              <TextField
                label="Due date"
                value={returnDue}
                onChange={(e) => setReturnDue(e.target.value)}
              />
              <Button
                variant="secondary"
                disabled={!returnReason.trim()}
                loading={returnMutation.isPending}
                onClick={() => returnMutation.mutate()}
              >
                Return submission
              </Button>
            </div>
          </Card>

          {canEscalate ? (
            <Card title="Escalate">
              <div className="space-y-3">
                <SelectField
                  label="Reason code"
                  value={escReasonCode}
                  options={Object.values(ESCALATION_REASON).map((c) => ({
                    value: c,
                    label: ESCALATION_REASON_LABEL[c] ?? c,
                  }))}
                  onChange={(e) => setEscReasonCode(e.target.value as Escalation['reasonCode'])}
                />
                <SelectField
                  label="Severity"
                  value={escSeverity}
                  options={Object.values(ESCALATION_SEVERITY).map((s) => ({
                    value: s,
                    label: ESCALATION_SEVERITY_LABEL[s] ?? s,
                  }))}
                  onChange={(e) => setEscSeverity(e.target.value as Escalation['severity'])}
                />
                <TextareaField
                  label="Reason detail"
                  value={escReason}
                  onChange={(e) => setEscReason(e.target.value)}
                  rows={2}
                />
                <TextField label="Due date" value={escDue} onChange={(e) => setEscDue(e.target.value)} />
                <Button
                  variant="destructive"
                  disabled={!escReason.trim()}
                  loading={escalateMutation.isPending}
                  onClick={() => escalateMutation.mutate()}
                >
                  Create escalation
                </Button>
              </div>
            </Card>
          ) : null}
        </div>
      ) : tab === 'actions' ? (
        <Alert tone="warning" title="Review actions require submission.review permission." />
      ) : null}

      <ConfirmDialog
        open={confirmApprove}
        title="Approve and lock"
        message={`Confirm approval checklist:\n\n${approveChecklist}\n\nApproval creates an immutable snapshot.`}
        confirmLabel="Approve and lock"
        onCancel={() => setConfirmApprove(false)}
        onConfirm={() => approveMutation.mutate()}
      />
    </div>
  )
}

function ComparisonTable({
  highlights,
  finance,
}: {
  highlights: MoipComparisonHighlight[]
  finance?: Awaited<ReturnType<typeof mockFinanceWorkflowService.getWorkspace>>
}) {
  return (
    <>
      {finance ? (
        <table className="mb-4 w-full text-left text-sm">
          <thead>
            <tr className="border-b border-soe-border text-xs text-soe-slate">
              <th className="py-1.5">Metric</th>
              <th className="py-1.5">Previous</th>
              <th className="py-1.5">Current</th>
              <th className="py-1.5">Δ %</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-soe-border">
              <td className="py-1.5">Revenue</td>
              <td className="py-1.5">
                {finance.previous ? formatCurrencyPkr(finance.previous.revenue) : '—'}
              </td>
              <td className="py-1.5">{formatCurrencyPkr(finance.current.revenue)}</td>
              <td className="py-1.5">
                {finance.percentChange.revenue === null ? '—' : `${finance.percentChange.revenue}%`}
              </td>
            </tr>
            <tr className="border-b border-soe-border">
              <td className="py-1.5">P/L</td>
              <td className="py-1.5">
                {finance.previous ? formatCurrencyPkr(finance.previous.profitOrLoss) : '—'}
              </td>
              <td className="py-1.5">{formatCurrencyPkr(finance.current.profitOrLoss)}</td>
              <td className="py-1.5">
                {finance.percentChange.profitOrLoss === null
                  ? '—'
                  : `${finance.percentChange.profitOrLoss}%`}
              </td>
            </tr>
          </tbody>
        </table>
      ) : null}
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-soe-border text-xs text-soe-slate">
            <th className="py-1.5">Field</th>
            <th className="py-1.5">Previous</th>
            <th className="py-1.5">Current</th>
            <th className="py-1.5">Note</th>
          </tr>
        </thead>
        <tbody>
          {highlights.length === 0 ? (
            <tr>
              <td colSpan={4} className="py-3 text-soe-slate">
                No material highlights ({MOIP_COMPARISON_RULES.materialYoYPct}% YoY threshold).
              </td>
            </tr>
          ) : (
            highlights.map((h) => (
              <tr key={`${h.field}-${h.kind}`} className="border-b border-soe-border">
                <td className="py-1.5">{h.field}</td>
                <td className="py-1.5">{h.previousValue}</td>
                <td className="py-1.5">{h.currentValue}</td>
                <td className="py-1.5 text-xs text-soe-slate">{h.note}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </>
  )
}

export function MoipClarificationQueuePage() {
  return (
    <RequirePermission permission={PERMISSION.PORTFOLIO_READ}>
      <MoipClarificationQueueContent />
    </RequirePermission>
  )
}

function MoipClarificationQueueContent() {
  const [status, setStatus] = useState('open')
  const query = useQuery({
    queryKey: ['moip-clarifications', status],
    queryFn: () =>
      mockMoipPortalService.getClarificationQueue({
        pageSize: 100,
        status: status || undefined,
      }),
  })

  const columns = useMemo<ColumnDef<MoipClarificationRow, unknown>[]>(
    () => [
      {
        accessorFn: (r) => r.organization.abbreviation,
        id: 'soe',
        header: 'SOE',
      },
      {
        accessorFn: (r) => r.clarification.question,
        id: 'question',
        header: 'Question',
      },
      {
        accessorFn: (r) => r.clarification.status,
        id: 'status',
        header: 'Status',
        cell: ({ getValue }) => <StatusBadge status={String(getValue())} family="approval" />,
      },
      { accessorFn: (r) => r.ageDays, id: 'age', header: 'Age (d)' },
      {
        accessorFn: (r) => r.overdue,
        id: 'overdue',
        header: 'Overdue',
        cell: ({ getValue }) => (getValue() ? 'Yes' : '—'),
      },
      {
        id: 'action',
        header: '',
        cell: ({ row }) => (
          <Link className={linkClass} to={`/moip/submissions/${row.original.submission.id}`}>
            Review
          </Link>
        ),
      },
    ],
    [],
  )

  if (query.isError) return <ErrorState title="Unable to load clarifications" />

  return (
    <div>
      <PageHeader title="Clarifications" subtitle="Open reviewer questions awaiting SOE response" />
      <div className="mb-4 max-w-xs">
        <SelectField
          label="Status"
          value={status}
          options={[
            { value: 'open', label: 'Open' },
            { value: 'responded', label: 'Responded' },
            { value: 'closed', label: 'Closed' },
          ]}
          onChange={(e) => setStatus(e.target.value)}
        />
      </div>
      <DataTable
        data={query.data?.items ?? []}
        columns={columns}
        isLoading={query.isLoading}
        density="compact"
      />
    </div>
  )
}

export function MoipApprovalsPage() {
  return (
    <RequirePermission permission={PERMISSION.PORTFOLIO_READ}>
      <MoipApprovalsContent />
    </RequirePermission>
  )
}

function MoipApprovalsContent() {
  const { canReview } = useReviewPermissions()
  const query = useQuery({
    queryKey: ['moip-approvals'],
    queryFn: () => mockMoipPortalService.getApprovalsQueue(),
  })

  const columns = useMemo<ColumnDef<MoipQueueRow, unknown>[]>(
    () => [
      {
        accessorFn: (r) => r.organization.abbreviation,
        id: 'soe',
        header: 'SOE',
      },
      {
        accessorFn: (r) => r.submission.reportingPeriodId,
        id: 'period',
        header: 'Period',
      },
      {
        accessorFn: (r) => r.submission.version,
        id: 'version',
        header: 'Version',
      },
      {
        accessorFn: (r) => r.submission.status,
        id: 'status',
        header: 'Status',
        cell: ({ getValue }) => (
          <StatusBadge
            status={String(getValue())}
            family="approval"
            label={SUBMISSION_STATUS_LABEL[getValue() as SubmissionStatus]}
          />
        ),
      },
      {
        id: 'action',
        header: '',
        cell: ({ row }) =>
          canReview ? (
            <Link className={linkClass} to={`/moip/submissions/${row.original.submission.id}`}>
              Open review
            </Link>
          ) : (
            '—'
          ),
      },
    ],
    [canReview],
  )

  if (query.isError) return <ErrorState title="Unable to load approvals queue" />

  return (
    <div>
      <PageHeader title="Approvals" subtitle="Finance packs cleared for final approval" />
      <Alert className="mb-4" tone="info" title="Pre-approval check">
        Confirm comparison, evidence, and clarifications before approve-and-lock. Dummy data only.
      </Alert>
      <DataTable
        data={query.data ?? []}
        columns={columns}
        isLoading={query.isLoading}
        density="compact"
        emptyTitle="No submissions ready for approval."
      />
    </div>
  )
}

export function MoipTasksEscalationsPage() {
  return (
    <RequirePermission permission={PERMISSION.PORTFOLIO_READ}>
      <MoipTasksEscalationsContent />
    </RequirePermission>
  )
}

function MoipTasksEscalationsContent() {
  const { role, canEscalate } = useReviewPermissions()
  const pushToast = useUiStore((s) => s.pushToast)
  const queryClient = useQueryClient()

  const workload = useQuery({
    queryKey: ['moip-workload', role],
    queryFn: () => mockMoipPortalService.getWorkload(role),
  })
  const escalations = useQuery({
    queryKey: ['moip-escalations'],
    queryFn: () => mockMoipPortalService.getEscalations({ status: 'open' }),
  })
  const portfolio = useQuery({
    queryKey: ['moip-portfolio-orgs'],
    queryFn: () => mockMoipPortalService.getPortfolio({ pageSize: 200 }),
  })

  const [orgId, setOrgId] = useState('')
  const [reasonCode, setReasonCode] = useState<Escalation['reasonCode']>(
    ESCALATION_REASON.OVERDUE_SUBMISSION,
  )
  const [severity, setSeverity] = useState<Escalation['severity']>(ESCALATION_SEVERITY.ATTENTION)
  const [ownerRole, setOwnerRole] = useState<RoleId>(ROLE.MOIP_SUPERVISOR)
  const [dueDate, setDueDate] = useState('2026-08-25')
  const [reasonDetail, setReasonDetail] = useState('')

  const createMutation = useMutation({
    mutationFn: () =>
      mockMoipPortalService.createEscalation(role, {
        organizationId: orgId,
        reason: reasonDetail,
        reasonCode,
        severity,
        ownerRole,
        dueDate,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['moip-escalations'] })
      setReasonDetail('')
      pushToast({ title: 'Escalation created.', tone: 'success' })
    },
    onError: (err: unknown) =>
      pushToast({
        title: err instanceof AppError ? err.message : 'Failed',
        tone: 'critical',
      }),
  })

  const resolveMutation = useMutation({
    mutationFn: (id: string) => mockMoipPortalService.resolveEscalation(id, role),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['moip-escalations'] })
      pushToast({ title: 'Escalation resolved.', tone: 'success' })
    },
    onError: (err: unknown) =>
      pushToast({
        title: err instanceof AppError ? err.message : 'Failed',
        tone: 'critical',
      }),
  })

  const escColumns = useMemo<ColumnDef<Escalation, unknown>[]>(
    () => [
      { accessorKey: 'id', header: 'ID' },
      { accessorKey: 'organizationId', header: 'Organization' },
      {
        accessorKey: 'reasonCode',
        header: 'Reason',
        cell: ({ getValue }) => ESCALATION_REASON_LABEL[String(getValue())] ?? String(getValue()),
      },
      {
        accessorKey: 'severity',
        header: 'Severity',
        cell: ({ getValue }) => (
          <StatusBadge
            status={String(getValue())}
            family="risk"
            label={ESCALATION_SEVERITY_LABEL[String(getValue())]}
          />
        ),
      },
      { accessorKey: 'dueDate', header: 'Due' },
      {
        accessorKey: 'ownerRole',
        header: 'Owner',
        cell: ({ getValue }) => ROLE_LABEL[getValue() as RoleId],
      },
      {
        id: 'action',
        header: '',
        cell: ({ row }) =>
          canEscalate ? (
            <Button size="sm" variant="secondary" onClick={() => resolveMutation.mutate(row.original.id)}>
              Resolve
            </Button>
          ) : null,
      },
    ],
    [canEscalate, resolveMutation],
  )

  const w = workload.data

  return (
    <div>
      <PageHeader title="Tasks & escalations" subtitle="Workload and open escalations · demo data" />

      {workload.isLoading ? (
        <LoadingBlock />
      ) : w ? (
        <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <KpiCard label="Assigned reviews" value={String(w.assignedReviews)} />
          <KpiCard label="Due soon" value={String(w.dueSoon)} />
          <KpiCard label="Overdue" value={String(w.overdue)} />
          <KpiCard label="Clarifications" value={String(w.clarificationsWaiting)} />
          <KpiCard label="Approvals pending" value={String(w.approvalsPending)} />
        </div>
      ) : null}

      <Card title="Open escalations" className="mb-4">
        {escalations.isError ? (
          <ErrorState title="Unable to load escalations" />
        ) : (
          <DataTable
            data={escalations.data ?? []}
            columns={escColumns}
            isLoading={escalations.isLoading}
            density="compact"
            showSearch={false}
            emptyTitle="No open escalations."
          />
        )}
      </Card>

      {canEscalate ? (
        <Card title="Create escalation">
          <div className="grid gap-3 sm:grid-cols-2">
            <SelectField
              label="Organization"
              value={orgId}
              options={[
                { value: '', label: 'Select SOE…' },
                ...(portfolio.data?.items ?? []).map((r) => ({
                  value: r.organization.id,
                  label: r.organization.abbreviation,
                })),
              ]}
              onChange={(e) => setOrgId(e.target.value)}
            />
            <SelectField
              label="Reason"
              value={reasonCode}
              options={Object.values(ESCALATION_REASON).map((c) => ({
                value: c,
                label: ESCALATION_REASON_LABEL[c] ?? c,
              }))}
              onChange={(e) => setReasonCode(e.target.value as Escalation['reasonCode'])}
            />
            <SelectField
              label="Severity"
              value={severity}
              options={Object.values(ESCALATION_SEVERITY).map((s) => ({
                value: s,
                label: ESCALATION_SEVERITY_LABEL[s] ?? s,
              }))}
              onChange={(e) => setSeverity(e.target.value as Escalation['severity'])}
            />
            <SelectField
              label="Owner"
              value={ownerRole}
              options={REVIEWER_ROLE_OPTIONS}
              onChange={(e) => setOwnerRole(e.target.value as RoleId)}
            />
            <TextField label="Due date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            <TextareaField
              label="Detail"
              value={reasonDetail}
              onChange={(e) => setReasonDetail(e.target.value)}
              rows={2}
            />
          </div>
          <Button
            className="mt-3"
            disabled={!orgId || !reasonDetail.trim()}
            loading={createMutation.isPending}
            onClick={() => createMutation.mutate()}
          >
            Create escalation
          </Button>
        </Card>
      ) : null}
    </div>
  )
}

export function MoipDataQualityPage() {
  return (
    <RequirePermission permission={PERMISSION.PORTFOLIO_READ}>
      <MoipDataQualityContent />
    </RequirePermission>
  )
}

function MoipDataQualityContent() {
  const query = useQuery({
    queryKey: ['moip-data-quality'],
    queryFn: () => mockMoipPortalService.getDataQuality(),
  })

  const columns = useMemo<
    ColumnDef<
      Awaited<ReturnType<typeof mockMoipPortalService.getDataQuality>>[number],
      unknown
    >[]
  >(
    () => [
      { accessorKey: 'abbreviation', header: 'SOE' },
      { accessorKey: 'blocking', header: 'Blocking' },
      { accessorKey: 'warnings', header: 'Warnings' },
      { accessorKey: 'evidenceGaps', header: 'Evidence gaps' },
      { accessorKey: 'incompleteModules', header: 'Incomplete modules' },
      {
        id: 'action',
        header: '',
        cell: ({ row }) =>
          row.original.submissionId ? (
            <Link className={linkClass} to={`/moip/submissions/${row.original.submissionId}`}>
              Review
            </Link>
          ) : (
            '—'
          ),
      },
    ],
    [],
  )

  if (query.isError) return <ErrorState title="Unable to load data quality" />

  return (
    <div>
      <PageHeader title="Data quality" subtitle="Blocking issues, warnings, and evidence gaps by SOE" />
      <DataTable
        data={query.data ?? []}
        columns={columns}
        isLoading={query.isLoading}
        density="compact"
      />
    </div>
  )
}
