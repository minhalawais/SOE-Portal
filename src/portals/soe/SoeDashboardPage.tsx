import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  CalendarClock,
  ClipboardCheck,
  FileWarning,
  Gauge,
  MessageSquareWarning,
  ShieldCheck,
} from 'lucide-react'
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
import { Card } from '@/design-system/components/Card'
import { ErrorState, LoadingBlock } from '@/design-system/components/Feedback'
import { mockSoePortalService } from '@/mock-services'
import { useSessionStore } from '@/state/session'
import { ROLE, SUBMISSION_STATUS, SUBMISSION_STATUS_LABEL } from '@/constants'
import { cn } from '@/utils'

const STATUS_GROUPS = [
  {
    id: 'drafting',
    label: 'Draft / in progress',
    color: '#1d5d8f',
    statuses: [SUBMISSION_STATUS.DRAFT, SUBMISSION_STATUS.IN_PROGRESS],
  },
  {
    id: 'ready',
    label: 'Ready for SOE action',
    color: '#16877a',
    statuses: [
      SUBMISSION_STATUS.READY_FOR_REVIEW,
      SUBMISSION_STATUS.READY_FOR_CERTIFICATION,
      SUBMISSION_STATUS.CERTIFIED,
    ],
  },
  {
    id: 'moip_review',
    label: 'Submitted / MoIP review',
    color: '#7c3aed',
    statuses: [
      SUBMISSION_STATUS.SUBMITTED,
      SUBMISSION_STATUS.UNDER_REVIEW,
      SUBMISSION_STATUS.RESUBMITTED,
    ],
  },
  {
    id: 'returned',
    label: 'Returned / clarification',
    color: '#b84242',
    statuses: [SUBMISSION_STATUS.RETURNED, SUBMISSION_STATUS.CLARIFICATION_REQUESTED],
  },
  {
    id: 'closed',
    label: 'Approved / locked',
    color: '#475569',
    statuses: [SUBMISSION_STATUS.APPROVED, SUBMISSION_STATUS.LOCKED],
  },
] as const

const ACTION_TONE: Record<string, string> = {
  critical: 'border-red-200 bg-red-50 text-soe-critical',
  high: 'border-amber-200 bg-amber-50 text-soe-warning',
  normal: 'border-blue-200 bg-blue-50 text-soe-blue',
}

type DashboardAction = {
  id: string
  title: string
  route: string
  priority: string
  detail?: string
}

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

function PulseTile({
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
  icon: typeof Gauge
  tone?: 'neutral' | 'success' | 'warning' | 'critical'
  to?: string
}) {
  const toneClass = {
    neutral: 'text-soe-navy bg-slate-50',
    success: 'text-soe-success bg-emerald-50',
    warning: 'text-soe-warning bg-amber-50',
    critical: 'text-soe-critical bg-red-50',
  }[tone]
  const content = (
    <>
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase text-soe-slate">{label}</p>
        <span className={cn('flex h-8 w-8 items-center justify-center rounded-[6px]', toneClass)}>
          <Icon size={17} aria-hidden="true" />
        </span>
      </div>
      <p className="mt-3 text-2xl font-semibold leading-none text-soe-navy tabular-nums">{value}</p>
      <p className="mt-2 text-xs text-soe-slate">{detail}</p>
    </>
  )
  if (!to) {
    return <div className="min-h-[116px] rounded-[8px] border border-soe-border bg-white p-4 shadow-[var(--shadow-sm)]">{content}</div>
  }
  return (
    <Link to={to} className="group min-h-[116px] rounded-[8px] border border-soe-border bg-white p-4 shadow-[var(--shadow-sm)] hover:border-soe-blue">
      {content}
    </Link>
  )
}

function MiniStat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="border-l-2 border-soe-border pl-3">
      <p className="text-[11px] font-semibold uppercase text-soe-slate">{label}</p>
      <p className={cn('mt-1 text-lg font-semibold text-soe-navy tabular-nums', tone)}>{value}</p>
    </div>
  )
}

function ChartFallback({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-full min-h-[140px] items-center justify-center rounded-[6px] bg-soe-canvas text-xs text-soe-slate">
      {children}
    </div>
  )
}

export function SoeDashboardPage() {
  const organizationId = useSessionStore((s) => s.organizationId)
  const reportingPeriodId = useSessionStore((s) => s.reportingPeriodId)
  const role = useSessionStore((s) => s.role)

  const query = useQuery({
    queryKey: ['soe-dashboard', organizationId, reportingPeriodId, role],
    queryFn: () =>
      mockSoePortalService.getDashboard(organizationId, reportingPeriodId, role),
  })

  if (query.isLoading) return <LoadingBlock label="Loading SOE dashboard..." />
  if (query.isError || !query.data) {
    return <ErrorState title="Unable to load SOE dashboard" />
  }

  const d = query.data
  const isSenior = role === ROLE.SOE_CERTIFIER || role === ROLE.CEO || role === ROLE.CFO
  const isFocal = role === ROLE.SOE_FOCAL_PERSON || role === ROLE.SOE_DATA_CONTRIBUTOR
  const totalModules = d.modulesComplete + d.modulesIncomplete
  const readyForCertification = d.modules.filter((m) => m.submission.status === SUBMISSION_STATUS.READY_FOR_CERTIFICATION).length
  const submittedOrBeyond = d.modules.filter((m) =>
    [
      SUBMISSION_STATUS.SUBMITTED,
      SUBMISSION_STATUS.UNDER_REVIEW,
      SUBMISSION_STATUS.APPROVED,
      SUBMISSION_STATUS.LOCKED,
      SUBMISSION_STATUS.RESUBMITTED,
    ].includes(m.submission.status as never),
  ).length
  const returnedOrClarification = d.modules.filter((m) =>
    [SUBMISSION_STATUS.RETURNED, SUBMISSION_STATUS.CLARIFICATION_REQUESTED].includes(m.submission.status as never),
  ).length
  const daysRemaining = daysUntil(d.deadline)
  const statusMix = STATUS_GROUPS.map((group) => ({
      id: group.id,
      label: group.label,
      color: group.color,
      count: d.modules.filter((m) => group.statuses.includes(m.submission.status as never)).length,
      detail: group.statuses
        .map((status) => {
          const count = d.modules.filter((m) => m.submission.status === status).length
          return count ? `${SUBMISSION_STATUS_LABEL[status]} ${count}` : ''
        })
        .filter(Boolean)
        .join(' · '),
    }))
  const chartStatusMix = statusMix.filter((item) => item.count > 0)
  const moduleBars = d.modules
    .map((m) => ({
      label: m.def.label.replace('Enterprise Profile', 'Enterprise').replace('Industrial Performance', 'Industrial'),
      completion: m.submission.completeness,
      route: m.def.route,
      status: m.submission.status,
    }))
    .sort((a, b) => a.completion - b.completion)
    .slice(0, 8)
  const urgentActions: DashboardAction[] = d.pendingActions.map((action) => ({ ...action })).sort((a, b) => {
    const rank = { critical: 0, high: 1, normal: 2 }
    return (rank[a.priority as keyof typeof rank] ?? 3) - (rank[b.priority as keyof typeof rank] ?? 3)
  })
  const readinessTone = d.blockingCount || returnedOrClarification ? 'critical' : d.evidenceGapCount || d.warningCount ? 'warning' : 'success'
  const canRenderResponsiveCharts = typeof ResizeObserver !== 'undefined'
  const derivedActions: DashboardAction[] = [
    ...(d.openClarifications
      ? [{
          id: 'derived-clarifications',
          title: `Respond to ${d.openClarifications} open MoIP clarification${d.openClarifications > 1 ? 's' : ''}`,
          route: '/soe/clarifications',
          priority: 'critical',
          detail: 'Reviewer questions must be closed before the package is considered clean.',
        }]
      : []),
    ...(daysRemaining != null && daysRemaining < 0
      ? [{
          id: 'derived-overdue-deadline',
          title: `Review overdue submission deadline (${Math.abs(daysRemaining)} days)`,
          route: '/soe/readiness',
          priority: 'critical',
          detail: `${d.period.label} deadline was ${formatDate(d.deadline)}.`,
        }]
      : []),
    ...(readyForCertification
      ? [{
          id: 'derived-certification',
          title: `${readyForCertification} module${readyForCertification > 1 ? 's' : ''} awaiting certification`,
          route: isSenior ? '/soe/finance/certify' : '/soe/reporting',
          priority: 'high',
          detail: isSenior ? 'Senior sign-off can move these modules toward submission.' : 'Track certifier sign-off from the reporting workspace.',
        }]
      : []),
    ...(d.evidenceGapCount
      ? [{
          id: 'derived-evidence',
          title: `Attach missing evidence for ${d.evidenceGapCount} module${d.evidenceGapCount > 1 ? 's' : ''}`,
          route: '/soe/documents',
          priority: 'high',
          detail: 'Evidence gaps can trigger return or clarification during MoIP review.',
        }]
      : []),
    ...(d.modulesIncomplete
      ? [{
          id: 'derived-incomplete',
          title: `Complete ${d.modulesIncomplete} remaining reporting module${d.modulesIncomplete > 1 ? 's' : ''}`,
          route: '/soe/reporting',
          priority: 'high',
          detail: 'Lowest-readiness modules are shown below for quick follow-up.',
        }]
      : [{
          id: 'derived-readiness-review',
          title: 'Review locked package and submission evidence',
          route: '/soe/readiness',
          priority: 'normal',
          detail: 'All modules are complete; keep evidence, clarifications and deadline posture visible.',
        }]),
  ]
  const displayActions = urgentActions.length ? urgentActions : derivedActions

  return (
    <div className="mx-auto max-w-[1500px] space-y-5 pb-6">
      <section className="overflow-hidden rounded-[8px] border border-soe-border bg-[#102c42] text-white shadow-[0_18px_40px_rgba(18,48,74,.14)]">
        <div className="grid items-center gap-5 p-4 lg:grid-cols-[1fr_360px] lg:px-6 lg:py-5">
          <div className="flex min-h-[150px] items-center">
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
                  A focused cockpit for the SOE team: finish incomplete modules, resolve review returns, close evidence gaps and move the reporting package toward MoIP submission.
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-[8px] border border-white/10 bg-white/8 p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase text-white/55">Submission readiness</p>
                <p className="mt-2 text-4xl font-semibold leading-none text-white tabular-nums">{d.overallCompletion}%</p>
              </div>
              <div className="flex h-[86px] w-[86px] items-center justify-center rounded-full border-[8px] border-white/15">
                <Gauge size={34} className="text-white/85" aria-hidden="true" />
              </div>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/12">
              <div className={cn('h-full rounded-full', readinessTone === 'critical' ? 'bg-red-300' : readinessTone === 'warning' ? 'bg-amber-300' : 'bg-emerald-300')} style={{ width: `${d.overallCompletion}%` }} />
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3 text-xs">
              <div><p className="text-white/45">Complete</p><p className="mt-1 font-semibold text-white">{d.modulesComplete}/{totalModules}</p></div>
              <div><p className="text-white/45">Submitted</p><p className="mt-1 font-semibold text-white">{submittedOrBeyond}</p></div>
              <div><p className="text-white/45">Deadline</p><p className="mt-1 font-semibold text-white">{formatDate(d.deadline)}</p></div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <PulseTile label="Modules complete" value={`${d.modulesComplete}/${totalModules}`} detail="Reporting modules ready" icon={BadgeCheck} tone={d.modulesIncomplete ? 'warning' : 'success'} to="/soe/reporting" />
        <PulseTile label="Blocking issues" value={String(d.blockingCount)} detail="Must clear before submission" icon={AlertTriangle} tone={d.blockingCount ? 'critical' : 'success'} to="/soe/validation" />
        <PulseTile label="Evidence gaps" value={String(d.evidenceGapCount)} detail="Documents still required" icon={FileWarning} tone={d.evidenceGapCount ? 'warning' : 'success'} to="/soe/documents" />
        <PulseTile label="Clarifications" value={String(d.openClarifications)} detail="Open MoIP questions" icon={MessageSquareWarning} tone={d.openClarifications ? 'critical' : 'success'} to="/soe/clarifications" />
        <PulseTile label="Certification" value={String(readyForCertification)} detail="Modules awaiting sign-off" icon={ShieldCheck} tone={readyForCertification ? 'warning' : 'neutral'} to={isSenior ? '/soe/finance/certify' : '/soe/reporting'} />
        <PulseTile label="Days remaining" value={daysRemaining == null ? '-' : String(daysRemaining)} detail="Until period deadline" icon={CalendarClock} tone={daysRemaining != null && daysRemaining < 15 ? 'critical' : daysRemaining != null && daysRemaining < 45 ? 'warning' : 'neutral'} to="/soe/readiness" />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.15fr_.85fr]">
        <Card title={isSenior ? 'Certification and priority actions' : 'Priority actions'} subtitle="Highest-impact work to move the package forward">
          {displayActions.length === 0 ? (
            <p className="text-sm text-soe-slate">No open actions for this role.</p>
          ) : (
            <div className="divide-y divide-soe-border">
              {displayActions.slice(0, 6).map((a, index) => (
                <Link key={a.id} to={a.route} className="group grid gap-3 py-3 first:pt-0 last:pb-0 sm:grid-cols-[34px_1fr_auto] sm:items-center">
                  <span className={cn('flex h-8 w-8 items-center justify-center rounded-full border text-xs font-semibold', ACTION_TONE[a.priority] ?? ACTION_TONE.normal)}>
                    {index + 1}
                  </span>
                  <span>
                    <span className="block text-sm font-medium text-soe-ink">{a.title}</span>
                    <span className="mt-1 block text-[11px] font-semibold uppercase text-soe-slate">{a.priority} priority</span>
                    {a.detail ? <span className="mt-1 block text-xs text-soe-slate">{a.detail}</span> : null}
                  </span>
                  <ArrowRight size={16} className="hidden text-soe-slate group-hover:text-soe-blue sm:block" />
                </Link>
              ))}
            </div>
          )}
        </Card>

        <Card title="Submission status mix" subtitle="Where each module currently sits" className="min-h-[298px]">
          <div className="flex min-h-[190px] flex-col items-center justify-center gap-5 sm:flex-row">
            <div className="h-[150px] w-[150px] shrink-0">
              {canRenderResponsiveCharts ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={chartStatusMix} dataKey="count" nameKey="label" innerRadius={44} outerRadius={68} paddingAngle={2}>
                      {chartStatusMix.map((item) => <Cell key={item.id} fill={item.color} />)}
                    </Pie>
                    <Tooltip formatter={(value) => [`${value} modules`, 'Count']} contentStyle={{ borderRadius: 6, borderColor: '#dde3e8', fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <ChartFallback>{totalModules} modules</ChartFallback>
              )}
            </div>
            <div className="w-full max-w-[320px] space-y-2">
              {statusMix.map((item) => (
                <div key={item.id} className="grid grid-cols-[1fr_auto] gap-3 rounded-[6px] px-2 py-1.5 text-xs hover:bg-soe-canvas">
                  <span className="min-w-0 text-soe-slate">
                    <span className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="truncate font-medium text-soe-navy">{item.label}</span>
                    </span>
                    <span className="mt-0.5 block truncate pl-4 text-[11px] text-soe-slate">
                      {item.detail || 'No modules in this stage'}
                    </span>
                  </span>
                  <span className="font-semibold text-soe-navy tabular-nums">{item.count}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-4 border-t border-soe-border pt-4">
            <MiniStat label="Warnings" value={String(d.warningCount)} tone={d.warningCount ? 'text-soe-warning' : ''} />
            <MiniStat label="Returned" value={String(returnedOrClarification)} tone={returnedOrClarification ? 'text-soe-critical' : ''} />
            <MiniStat label="Ready" value={String(readyForCertification)} tone={readyForCertification ? 'text-soe-success' : ''} />
          </div>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <Card
          title={isFocal ? 'Weakest module readiness' : 'Assigned module readiness'}
          subtitle="Lowest completion modules first"
          actions={<Link className="text-xs font-medium text-soe-blue" to="/soe/reporting">Open all</Link>}
          className="pl-3 pr-4"
        >
          <div className="h-[260px]">
            {canRenderResponsiveCharts ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={moduleBars} layout="vertical" margin={{ top: 4, right: 6, left: -18, bottom: 4 }}>
                  <CartesianGrid stroke="#e8edf0" horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} tickFormatter={(value) => `${value}%`} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="label" width={116} tick={{ fontSize: 11, fill: '#475569' }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(value) => [`${value}%`, 'Completion']} contentStyle={{ borderRadius: 6, borderColor: '#dde3e8', fontSize: 11 }} />
                  <Bar dataKey="completion" radius={[0, 4, 4, 0]}>
                    {moduleBars.map((item) => <Cell key={item.label} fill={item.completion >= 100 ? '#16877a' : item.status === SUBMISSION_STATUS.RETURNED ? '#b84242' : item.completion >= 70 ? '#1d5d8f' : '#d97706'} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <ChartFallback>Module readiness chart</ChartFallback>
            )}
          </div>
        </Card>

        <Card title="Upcoming deadlines" subtitle="Near-term governance and reporting dates">
          <div className="space-y-3">
            {d.deadlines.map((dl) => {
              const remaining = daysUntil(dl.dueDate)
              return (
                <Link key={dl.id} to={dl.route} className="group block rounded-[6px] border border-soe-border p-3 hover:border-soe-blue">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-soe-navy">{dl.title}</p>
                      <p className="mt-1 text-xs text-soe-slate">{formatDate(dl.dueDate)}</p>
                    </div>
                    <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold', remaining != null && remaining < 0 ? 'bg-red-50 text-soe-critical' : remaining != null && remaining < 30 ? 'bg-amber-50 text-soe-warning' : 'bg-slate-100 text-soe-slate')}>
                      {remaining == null ? 'Scheduled' : remaining < 0 ? `${Math.abs(remaining)}d overdue` : `${remaining}d`}
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-[.9fr_1.1fr]">
        <Card title="Operational shortcuts" subtitle="Most-used SOE reporting work areas">
          <div className="grid gap-2 sm:grid-cols-2">
            {[
              { label: 'Validation centre', route: '/soe/validation', icon: ClipboardCheck },
              { label: 'Clarification inbox', route: '/soe/clarifications', icon: MessageSquareWarning },
              { label: 'Evidence repository', route: '/soe/documents', icon: FileWarning },
              { label: 'Submission readiness', route: '/soe/readiness', icon: BadgeCheck },
            ].map((item) => (
              <Link key={item.route} to={item.route} className="group flex items-center justify-between rounded-[6px] border border-soe-border px-3 py-3 text-sm font-medium text-soe-navy hover:border-soe-blue">
                <span className="flex items-center gap-2"><item.icon size={16} className="text-soe-slate" />{item.label}</span>
                <ArrowRight size={15} className="text-soe-slate group-hover:text-soe-blue" />
              </Link>
            ))}
          </div>
        </Card>

        <Card title="Recent activity" subtitle="Latest changes across this SOE workspace">
          {d.recentActivity.length === 0 ? (
            <p className="text-sm text-soe-slate">No recent activity.</p>
          ) : (
            <div className="divide-y divide-soe-border">
              {d.recentActivity.slice(0, 6).map((event) => (
                <div key={event.id} className="grid gap-2 py-2.5 first:pt-0 last:pb-0 sm:grid-cols-[1fr_auto]">
                  <div>
                    <p className="text-sm font-medium text-soe-ink">{event.title}</p>
                    <p className="mt-1 text-[11px] uppercase text-soe-slate">{event.category}</p>
                  </div>
                  <p className="text-xs text-soe-slate tabular-nums">{formatDate(event.occurredAt)}</p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </section>
    </div>
  )
}
