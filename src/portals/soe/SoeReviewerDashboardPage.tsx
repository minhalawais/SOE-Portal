import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowRight,
  CheckCircle2,
  MessageSquareWarning,
  RotateCcw,
  Send,
  ShieldCheck,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/design-system/components/Card'
import { ErrorState, LoadingBlock } from '@/design-system/components/Feedback'
import { StatusBadge } from '@/design-system/components/StatusBadge'
import { mockSoePortalService } from '@/mock-services'
import { useSessionStore } from '@/state/session'
import {
  SUBMISSION_STATUS,
  SUBMISSION_STATUS_LABEL,
  type SubmissionStatus,
} from '@/constants'
import { cn } from '@/utils'

const DATA_ENTRY_STATUSES = new Set<SubmissionStatus>([
  SUBMISSION_STATUS.DRAFT,
  SUBMISSION_STATUS.IN_PROGRESS,
  SUBMISSION_STATUS.READY_FOR_REVIEW,
])

const SUBMISSION_PIPELINE_GROUPS = [
  {
    id: 'awaiting_decision',
    label: 'Awaiting your decision',
    color: '#16877a',
    statuses: [SUBMISSION_STATUS.READY_FOR_CERTIFICATION],
  },
  {
    id: 'returned',
    label: 'Returned for correction',
    color: '#b84242',
    statuses: [SUBMISSION_STATUS.RETURNED],
  },
  {
    id: 'clarification',
    label: 'Clarification open',
    color: '#d97706',
    statuses: [SUBMISSION_STATUS.CLARIFICATION_REQUESTED],
  },
  {
    id: 'certified',
    label: 'Certified for MOIP',
    color: '#2f9d70',
    statuses: [SUBMISSION_STATUS.CERTIFIED],
  },
  {
    id: 'with_moip',
    label: 'With MOIP',
    color: '#7c3aed',
    statuses: [
      SUBMISSION_STATUS.SUBMITTED,
      SUBMISSION_STATUS.UNDER_REVIEW,
      SUBMISSION_STATUS.RESUBMITTED,
    ],
  },
  {
    id: 'approved',
    label: 'Approved by MOIP',
    color: '#475569',
    statuses: [SUBMISSION_STATUS.APPROVED, SUBMISSION_STATUS.LOCKED],
  },
] as const

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' })
}

function daysUntil(value: string) {
  const due = new Date(value)
  if (Number.isNaN(due.getTime())) return null
  const today = new Date()
  return Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

function Kpi({
  label,
  value,
  detail,
  icon: Icon,
  tone = 'neutral',
  to,
}: {
  label: string
  value: string
  detail: string
  icon: LucideIcon
  tone?: 'neutral' | 'success' | 'warning' | 'critical'
  to?: string
}) {
  const colors = {
    neutral: 'border-t-soe-blue text-soe-blue',
    success: 'border-t-soe-success text-soe-success',
    warning: 'border-t-soe-warning text-soe-warning',
    critical: 'border-t-soe-critical text-soe-critical',
  }
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase text-soe-slate">{label}</p>
        <Icon size={17} aria-hidden />
      </div>
      <p className="mt-3 text-2xl font-semibold text-soe-navy tabular-nums">{value}</p>
      <p className="mt-1 text-xs text-soe-slate">{detail}</p>
    </>
  )
  if (!to) {
    return (
      <div
        className={cn(
          'border border-t-[3px] border-soe-border bg-white p-4 shadow-[var(--shadow-sm)]',
          colors[tone],
        )}
      >
        {body}
      </div>
    )
  }
  return (
    <Link
      to={to}
      className={cn(
        'block border border-t-[3px] border-soe-border bg-white p-4 shadow-[var(--shadow-sm)] hover:border-soe-blue',
        colors[tone],
      )}
    >
      {body}
    </Link>
  )
}

export function SoeReviewerDashboardPage() {
  const organizationId = useSessionStore((s) => s.organizationId)
  const reportingPeriodId = useSessionStore((s) => s.reportingPeriodId)
  const role = useSessionStore((s) => s.role)

  const query = useQuery({
    queryKey: ['soe-dashboard', organizationId, reportingPeriodId, role],
    queryFn: () => mockSoePortalService.getDashboard(organizationId, reportingPeriodId, role),
  })

  if (query.isLoading) return <LoadingBlock label="Loading reviewer dashboard…" />
  if (query.isError || !query.data) {
    return <ErrorState title="Unable to load reviewer dashboard" />
  }

  const d = query.data
  const submissionsRoute = '/soe-review/submissions'
  const pipelineModules = d.modules.filter(
    (module) => !DATA_ENTRY_STATUSES.has(module.submission.status as SubmissionStatus),
  )
  const inPipelineCount = pipelineModules.length
  const awaitingDecision = pipelineModules.filter(
    (m) => m.submission.status === SUBMISSION_STATUS.READY_FOR_CERTIFICATION,
  ).length
  const returnedCount = pipelineModules.filter(
    (m) => m.submission.status === SUBMISSION_STATUS.RETURNED,
  ).length
  const clarificationCount = pipelineModules.filter(
    (m) => m.submission.status === SUBMISSION_STATUS.CLARIFICATION_REQUESTED,
  ).length
  const certifiedCount = pipelineModules.filter(
    (m) => m.submission.status === SUBMISSION_STATUS.CERTIFIED,
  ).length
  const withMoipCount = pipelineModules.filter((m) =>
    [
      SUBMISSION_STATUS.SUBMITTED,
      SUBMISSION_STATUS.UNDER_REVIEW,
      SUBMISSION_STATUS.RESUBMITTED,
    ].includes(m.submission.status as never),
  ).length
  const approvedCount = pipelineModules.filter((m) =>
    [SUBMISSION_STATUS.APPROVED, SUBMISSION_STATUS.LOCKED].includes(m.submission.status as never),
  ).length
  const submissionProgress = inPipelineCount
    ? Math.round(((certifiedCount + withMoipCount + approvedCount) / inPipelineCount) * 100)
    : 0
  const daysRemaining = daysUntil(d.deadline)
  const canRenderCharts = typeof ResizeObserver !== 'undefined'

  const statusMix = SUBMISSION_PIPELINE_GROUPS.map((group) => ({
    id: group.id,
    label: group.label,
    color: group.color,
    count: pipelineModules.filter((m) =>
      group.statuses.includes(m.submission.status as never),
    ).length,
  }))
  const chartStatusMix = statusMix.filter((item) => item.count > 0)
  const barData = statusMix.filter((item) => item.count > 0)

  const actionQueue = pipelineModules
    .filter((m) =>
      [
        SUBMISSION_STATUS.READY_FOR_CERTIFICATION,
        SUBMISSION_STATUS.RETURNED,
        SUBMISSION_STATUS.CLARIFICATION_REQUESTED,
      ].includes(m.submission.status as never),
    )
    .sort((a, b) => {
      const rank: Record<string, number> = {
        [SUBMISSION_STATUS.RETURNED]: 0,
        [SUBMISSION_STATUS.CLARIFICATION_REQUESTED]: 1,
        [SUBMISSION_STATUS.READY_FOR_CERTIFICATION]: 2,
      }
      return (
        (rank[a.submission.status] ?? 9) - (rank[b.submission.status] ?? 9) ||
        b.submission.updatedAt.localeCompare(a.submission.updatedAt)
      )
    })

  const returnsAndClarifications = pipelineModules
    .filter((m) =>
      [SUBMISSION_STATUS.RETURNED, SUBMISSION_STATUS.CLARIFICATION_REQUESTED].includes(
        m.submission.status as never,
      ),
    )
    .sort((a, b) => b.submission.updatedAt.localeCompare(a.submission.updatedAt))
    .slice(0, 6)

  const progressTone =
    returnedCount || clarificationCount
      ? 'critical'
      : awaitingDecision
        ? 'warning'
        : 'success'

  return (
    <div className="space-y-5 pb-6">
      <PageHeader
        title="Submissions & Returns"
        subtitle={`${d.organization.abbreviation} · ${d.period.label} · certification decisions, returns and MoIP submission posture`}
      />

      <section className="overflow-hidden rounded-[8px] border border-soe-border bg-[#102c42] text-white shadow-[0_18px_40px_rgba(18,48,74,.14)]">
        <div className="grid items-center gap-5 p-4 lg:grid-cols-[1fr_360px] lg:px-6 lg:py-5">
          <div className="flex min-h-[130px] items-center">
            <div className="flex min-w-0 flex-wrap items-center gap-4 sm:flex-nowrap">
              <div className="flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-[8px] bg-white p-2 shadow-[var(--shadow-sm)] sm:h-20 sm:w-20 sm:p-2.5">
                <img
                  src="/images/tusdec.png"
                  alt={`${d.organization.abbreviation} logo`}
                  className="h-full w-full object-contain"
                />
              </div>
              <div className="hidden h-14 w-px shrink-0 bg-white/20 sm:block" aria-hidden="true" />
              <div className="min-w-0">
                <h2 className="text-[22px] font-semibold leading-tight text-white">{d.organization.name}</h2>
                <p className="mt-2 max-w-3xl text-sm leading-5 text-white/68">
                  Review submitted modules, record certification decisions and track returns awaiting SOE
                  correction before period submission to MOIP.
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-[8px] border border-white/10 bg-white/8 p-4">
            <p className="text-xs font-semibold uppercase text-white/55">Submission progress</p>
            <p className="mt-2 text-4xl font-semibold leading-none text-white tabular-nums">
              {submissionProgress}%
            </p>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/12">
              <div
                className={cn(
                  'h-full rounded-full',
                  progressTone === 'critical'
                    ? 'bg-red-300'
                    : progressTone === 'warning'
                      ? 'bg-amber-300'
                      : 'bg-emerald-300',
                )}
                style={{ width: `${submissionProgress}%` }}
              />
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3 text-xs">
              <div>
                <p className="text-white/45">In pipeline</p>
                <p className="mt-1 font-semibold text-white">{inPipelineCount}</p>
              </div>
              <div>
                <p className="text-white/45">Awaiting decision</p>
                <p className="mt-1 font-semibold text-white">{awaitingDecision}</p>
              </div>
              <div>
                <p className="text-white/45">MOIP deadline</p>
                <p className="mt-1 font-semibold text-white">{formatDate(d.deadline)}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Kpi
          label="Awaiting decision"
          value={String(awaitingDecision)}
          detail="Ready for certification review"
          icon={ShieldCheck}
          tone={awaitingDecision ? 'warning' : 'neutral'}
          to={submissionsRoute}
        />
        <Kpi
          label="Returned"
          value={String(returnedCount)}
          detail="Modules sent back for correction"
          icon={RotateCcw}
          tone={returnedCount ? 'critical' : 'success'}
          to={submissionsRoute}
        />
        <Kpi
          label="Clarifications"
          value={String(clarificationCount)}
          detail="Open questions on submissions"
          icon={MessageSquareWarning}
          tone={clarificationCount ? 'critical' : 'success'}
          to={submissionsRoute}
        />
        <Kpi
          label="Certified"
          value={String(certifiedCount)}
          detail="Ready for period submission"
          icon={CheckCircle2}
          tone={certifiedCount ? 'success' : 'neutral'}
          to={submissionsRoute}
        />
        <Kpi
          label="With MOIP"
          value={String(withMoipCount + approvedCount)}
          detail={`${withMoipCount} in review · ${approvedCount} approved`}
          icon={Send}
          tone={withMoipCount ? 'neutral' : 'success'}
          to={submissionsRoute}
        />
      </div>

      <section className="grid items-stretch gap-4 xl:grid-cols-[1.15fr_.85fr]">
        <Card
          title="Submission & return pipeline"
          subtitle="Modules that have entered certification or MoIP workflow"
          actions={
            <Link className="text-xs font-semibold text-soe-blue hover:underline" to={submissionsRoute}>
              Open submissions
            </Link>
          }
          className="flex h-full flex-col"
        >
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-5 sm:flex-row">
            <div className="h-[150px] w-[150px] shrink-0">
              {canRenderCharts && chartStatusMix.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartStatusMix}
                      dataKey="count"
                      nameKey="label"
                      innerRadius={44}
                      outerRadius={68}
                      paddingAngle={2}
                    >
                      {chartStatusMix.map((item) => (
                        <Cell key={item.id} fill={item.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => [`${value} modules`, 'Count']}
                      contentStyle={{ borderRadius: 6, borderColor: '#dde3e8', fontSize: 11 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center rounded-[6px] bg-soe-canvas text-xs text-soe-slate">
                  {inPipelineCount ? `${inPipelineCount} in pipeline` : 'No modules in pipeline yet'}
                </div>
              )}
            </div>
            <div className="w-full max-w-[320px] space-y-1.5">
              {statusMix.map((item) => (
                <div
                  key={item.id}
                  className="grid grid-cols-[1fr_auto] gap-3 rounded-[6px] px-2 py-1.5 text-xs hover:bg-soe-canvas"
                >
                  <span className="min-w-0 text-soe-slate">
                    <span className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="truncate font-medium text-soe-navy">{item.label}</span>
                    </span>
                  </span>
                  <span className="font-semibold text-soe-navy tabular-nums">{item.count}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card title="Returns & clarifications" subtitle="Most recent items needing attention" className="flex h-full flex-col">
          <div className="flex flex-1 flex-col space-y-2">
            {returnsAndClarifications.length ? (
              returnsAndClarifications.map((module) => (
                <Link
                  key={module.submission.id}
                  to={`/soe-review/submissions/${module.submission.id}`}
                  className="group block rounded-[6px] border border-soe-border p-3 hover:border-soe-blue"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-soe-navy">{module.def.label}</p>
                      <p className="mt-1 text-xs text-soe-slate">
                        {formatDate(module.submission.updatedAt)} · v{module.submission.version}
                      </p>
                    </div>
                    <StatusBadge
                      status={module.submission.status}
                      label={SUBMISSION_STATUS_LABEL[module.submission.status]}
                    />
                  </div>
                </Link>
              ))
            ) : (
              <div className="rounded-[6px] border border-soe-border p-3">
                <p className="text-sm font-medium text-soe-navy">No returns or clarifications</p>
                <p className="mt-1 text-xs text-soe-slate">All pipeline modules are clear.</p>
              </div>
            )}
          </div>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <Card
          title="Reviewer action queue"
          subtitle="Certification decisions and correction follow-up"
          actions={
            <Link className="text-xs font-semibold text-soe-blue hover:underline" to={submissionsRoute}>
              View all
            </Link>
          }
        >
          {actionQueue.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="bg-[#f4f7fa] text-xs text-soe-navy">
                  <tr>
                    <th className="border-b border-soe-border px-3 py-3 font-semibold">Module</th>
                    <th className="border-b border-soe-border px-3 py-3 font-semibold">Status</th>
                    <th className="border-b border-soe-border px-3 py-3 font-semibold">Updated</th>
                    <th className="border-b border-soe-border px-3 py-3 font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {actionQueue.map((module) => (
                    <tr key={module.submission.id} className="border-b border-soe-border last:border-b-0">
                      <td className="px-3 py-3 font-semibold text-soe-navy">{module.def.label}</td>
                      <td className="px-3 py-3">
                        <StatusBadge
                          status={module.submission.status}
                          label={SUBMISSION_STATUS_LABEL[module.submission.status]}
                        />
                      </td>
                      <td className="px-3 py-3 text-xs text-soe-slate">
                        {formatDate(module.submission.updatedAt)}
                      </td>
                      <td className="px-3 py-3">
                        <Link
                          className="inline-flex items-center gap-1 text-sm font-medium text-soe-blue hover:underline"
                          to={`/soe-review/submissions/${module.submission.id}`}
                        >
                          Review
                          <ArrowRight size={14} aria-hidden />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-soe-slate">No modules awaiting reviewer action.</p>
          )}
        </Card>

        <Card title="Deadline & posture" subtitle="Reporting cycle context">
          <div className="space-y-3">
            <div className="rounded-[6px] border border-soe-border bg-soe-canvas px-3 py-3">
              <p className="text-[11px] font-semibold uppercase text-soe-slate">MOIP submission deadline</p>
              <p className="mt-1 text-lg font-semibold text-soe-navy">{formatDate(d.deadline)}</p>
              <p className="mt-1 text-xs text-soe-slate">
                {daysRemaining == null
                  ? 'Deadline date not set'
                  : daysRemaining < 0
                    ? `${Math.abs(daysRemaining)} days overdue`
                    : `${daysRemaining} days remaining`}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-[6px] border border-soe-border px-3 py-2.5">
                <p className="text-[11px] font-semibold uppercase text-soe-slate">Open clarifications</p>
                <p className="mt-1 text-xl font-semibold tabular-nums text-soe-navy">{d.openClarifications}</p>
              </div>
              <div className="rounded-[6px] border border-soe-border px-3 py-2.5">
                <p className="text-[11px] font-semibold uppercase text-soe-slate">Still in data entry</p>
                <p className="mt-1 text-xl font-semibold tabular-nums text-soe-navy">
                  {d.modules.length - inPipelineCount}
                </p>
              </div>
            </div>
            <Link
              to={submissionsRoute}
              className="flex items-center justify-between rounded-[6px] border border-soe-border px-3 py-2.5 text-sm font-medium text-soe-blue hover:border-soe-blue"
            >
              Open submissions & approvals
              <ArrowRight size={14} aria-hidden />
            </Link>
          </div>
        </Card>
      </section>

      <Card
        title="Modules by submission stage"
        subtitle="Count of modules in each certification or MoIP stage"
        actions={
          <Link className="text-xs font-semibold text-soe-blue hover:underline" to={submissionsRoute}>
            Open all
          </Link>
        }
      >
        <div className="h-[260px]">
          {canRenderCharts && barData.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} layout="vertical" margin={{ top: 4, right: 6, left: 8, bottom: 4 }}>
                <CartesianGrid stroke="#e8edf0" horizontal={false} />
                <XAxis
                  type="number"
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="label"
                  width={148}
                  tick={{ fontSize: 11, fill: '#475569' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  formatter={(value) => [`${value} modules`, 'Count']}
                  contentStyle={{ borderRadius: 6, borderColor: '#dde3e8', fontSize: 11 }}
                />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {barData.map((item) => (
                    <Cell key={item.id} fill={item.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center rounded-[6px] bg-soe-canvas text-xs text-soe-slate">
              No submission-stage data yet
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
