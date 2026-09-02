import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  BadgeDollarSign,
  BriefcaseBusiness,
  Building2,
  ClipboardCheck,
  Factory,
  Files,
  Gauge,
  HandCoins,
  Landmark,
  Scale,
  ShieldCheck,
  ShoppingCart,
  UserRoundCog,
  Users,
  WalletCards,
  type LucideIcon,
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
import { MODULE, ROLE, SUBMISSION_STATUS, type ModuleId } from '@/constants'
import { cn } from '@/utils'

const ENTRY_STATUS_GROUPS = [
  {
    id: 'drafting',
    label: 'Being prepared by SOE',
    color: '#1d5d8f',
    statuses: [
      SUBMISSION_STATUS.DRAFT,
      SUBMISSION_STATUS.IN_PROGRESS,
      SUBMISSION_STATUS.READY_FOR_REVIEW,
      SUBMISSION_STATUS.CERTIFIED,
    ],
  },
  {
    id: 'soe_reviewer',
    label: 'Awaiting SOE Reviewer Response',
    color: '#16877a',
    statuses: [SUBMISSION_STATUS.READY_FOR_CERTIFICATION],
  },
  {
    id: 'moip_review',
    label: 'Submitted to MoIP',
    color: '#7c3aed',
    statuses: [
      SUBMISSION_STATUS.SUBMITTED,
      SUBMISSION_STATUS.UNDER_REVIEW,
      SUBMISSION_STATUS.RESUBMITTED,
    ],
  },
  {
    id: 'soe_action_required',
    label: 'SOE response or correction required',
    color: '#b84242',
    statuses: [SUBMISSION_STATUS.RETURNED, SUBMISSION_STATUS.CLARIFICATION_REQUESTED],
  },
  {
    id: 'moip_approved',
    label: 'Approved by MoIP',
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

const MODULE_CARD_STYLES: Partial<Record<ModuleId, { icon: LucideIcon; accent: string; iconBg: string }>> = {
  [MODULE.ENTERPRISE]: { icon: Building2, accent: '#1d5d8f', iconBg: 'bg-[#eef6fc] text-soe-blue' },
  [MODULE.ASSETS]: { icon: BriefcaseBusiness, accent: '#0f766e', iconBg: 'bg-[#eef8f6] text-teal-700' },
  [MODULE.WORKFORCE]: { icon: Users, accent: '#475569', iconBg: 'bg-slate-100 text-slate-700' },
  [MODULE.BOARD]: { icon: Landmark, accent: '#b45309', iconBg: 'bg-[#fff7e6] text-amber-700' },
  [MODULE.EXECUTIVES]: { icon: UserRoundCog, accent: '#475569', iconBg: 'bg-slate-100 text-slate-700' },
  [MODULE.FINANCE]: { icon: WalletCards, accent: '#047857', iconBg: 'bg-[#effaf4] text-emerald-700' },
  [MODULE.LOANS]: { icon: HandCoins, accent: '#1d5d8f', iconBg: 'bg-[#eef6fc] text-soe-blue' },
  [MODULE.PROCUREMENT]: { icon: ShoppingCart, accent: '#c2410c', iconBg: 'bg-[#fff4ed] text-orange-700' },
  [MODULE.AUDIT]: { icon: ClipboardCheck, accent: '#475569', iconBg: 'bg-slate-100 text-slate-700' },
  [MODULE.LITIGATION]: { icon: Scale, accent: '#991b1b', iconBg: 'bg-[#fff1f1] text-red-700' },
  [MODULE.COMPLIANCE]: { icon: ShieldCheck, accent: '#15803d', iconBg: 'bg-[#f0f8f2] text-green-700' },
  [MODULE.INDUSTRIAL]: { icon: Factory, accent: '#0e7490', iconBg: 'bg-[#ecfbff] text-cyan-700' },
  [MODULE.PRIVATIZATION]: { icon: BadgeDollarSign, accent: '#a16207', iconBg: 'bg-[#fff9e8] text-yellow-700' },
  [MODULE.DOCUMENTS]: { icon: Files, accent: '#475569', iconBg: 'bg-slate-100 text-slate-700' },
}

const MODULE_REPORTING_PERIOD: Partial<Record<ModuleId, 'Annually' | 'Monthly' | 'Quarterly' | 'Open'>> = {
  [MODULE.ENTERPRISE]: 'Annually',
  [MODULE.ASSETS]: 'Annually',
  [MODULE.WORKFORCE]: 'Monthly',
  [MODULE.BOARD]: 'Monthly',
  [MODULE.EXECUTIVES]: 'Monthly',
  [MODULE.FINANCE]: 'Quarterly',
  [MODULE.LOANS]: 'Quarterly',
  [MODULE.PROCUREMENT]: 'Quarterly',
  [MODULE.AUDIT]: 'Annually',
  [MODULE.LITIGATION]: 'Open',
  [MODULE.COMPLIANCE]: 'Annually',
  [MODULE.INDUSTRIAL]: 'Quarterly',
  [MODULE.PRIVATIZATION]: 'Quarterly',
  [MODULE.DOCUMENTS]: 'Open',
}

function ModuleCompletionCard({
  label,
  completion,
  moduleId,
  route,
}: {
  label: string
  completion: number
  moduleId: ModuleId
  route: string
}) {
  const style = MODULE_CARD_STYLES[moduleId] ?? MODULE_CARD_STYLES[MODULE.DOCUMENTS]!
  const Icon = style.icon
  const reportingPeriodLabel = MODULE_REPORTING_PERIOD[moduleId] ?? 'Annually'

  return (
    <Link
      to={route}
      className="group flex min-h-[132px] min-w-0 flex-col items-center justify-between overflow-hidden rounded-[8px] border border-soe-border bg-white px-3 py-3 text-center shadow-[0_4px_14px_rgba(15,23,42,0.055)] transition-colors hover:border-[#8bb8dd] hover:bg-[#fbfdff]"
    >
      <span className="flex flex-col items-center gap-2">
        <span className={cn('flex h-9 w-9 items-center justify-center rounded-[8px] ring-1 ring-black/5', style.iconBg)}>
          <Icon size={19} strokeWidth={1.9} aria-hidden="true" />
        </span>
        <span className="flex min-h-10 items-center text-balance text-[13px] font-semibold leading-[18px] text-soe-navy">
          {label}
        </span>
      </span>
      <span className="w-full">
        <span className="block text-[24px] font-semibold leading-none text-soe-navy tabular-nums">{completion}%</span>
        <span className="mt-1 block text-[11px] font-medium text-soe-slate">{reportingPeriodLabel}</span>
        <span className="mt-2 block h-1 overflow-hidden rounded-full bg-[#e8eef4]">
          <span className="block h-full rounded-full" style={{ width: `${completion}%`, backgroundColor: style.accent }} />
        </span>
      </span>
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
  const submissionsRoute = '/soe-entry/submissions'
  const statusMix = ENTRY_STATUS_GROUPS.map((group) => ({
    id: group.id,
    label: group.label,
    color: group.color,
    count: d.modules.filter((m) => group.statuses.includes(m.submission.status as never)).length,
    detail: '',
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
  const returnedModuleCards = d.modules
    .filter((module) =>
      [SUBMISSION_STATUS.RETURNED, SUBMISSION_STATUS.CLARIFICATION_REQUESTED].includes(
        module.submission.status as never,
      ),
    )
    .sort((a, b) => {
      if (a.submission.status !== b.submission.status) {
        return a.submission.status === SUBMISSION_STATUS.RETURNED ? -1 : 1
      }
      return b.submission.updatedAt.localeCompare(a.submission.updatedAt)
    })
    .map((module) => ({
      id: module.def.id,
      label: module.def.label,
      count: d.modules.filter(
        (item) =>
          item.def.id === module.def.id &&
          [SUBMISSION_STATUS.RETURNED, SUBMISSION_STATUS.CLARIFICATION_REQUESTED].includes(
            item.submission.status as never,
          ),
      ).length,
      returnedAt: module.submission.updatedAt,
    }))
    .slice(0, 3)
  const readinessTone = d.blockingCount || returnedOrClarification ? 'critical' : d.evidenceGapCount || d.warningCount ? 'warning' : 'success'
  const canRenderResponsiveCharts = typeof ResizeObserver !== 'undefined'

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
                  Complete required data, correct returned modules, attach missing evidence and prepare the reporting package for submission to MOIP.
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-[8px] border border-white/10 bg-white/8 p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase text-white/55">
                  Annual reporting package readiness
                </p>
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
              <div><p className="text-white/45">Data entry completed</p><p className="mt-1 font-semibold text-white">{d.modulesComplete}/{totalModules}</p></div>
              <div><p className="text-white/45">Sent to MOIP</p><p className="mt-1 font-semibold text-white">{submittedOrBeyond}</p></div>
              <div><p className="text-white/45">MOIP deadline</p><p className="mt-1 font-semibold text-white">{formatDate(d.deadline)}</p></div>
            </div>
          </div>
        </div>
      </section>

      <section aria-label="Data entry module completion">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-7">
          {d.modules.map((module) => (
            <ModuleCompletionCard
              key={module.def.id}
              label={module.def.label}
              completion={module.submission.completeness}
              moduleId={module.def.id}
              route={module.def.route}
            />
          ))}
        </div>
      </section>

      <section className="grid items-stretch gap-4 md:grid-cols-2 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,.85fr)_minmax(0,.85fr)]">
        <Card
          title="Module submission and review stages"
          subtitle="Current workflow position of every reporting module"
          className="flex h-full flex-col md:col-span-2 lg:col-span-1"
        >
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-5 lg:flex-row">
            <div className="h-[188px] w-[188px] shrink-0">
              {canRenderResponsiveCharts ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartStatusMix}
                      dataKey="count"
                      nameKey="label"
                      innerRadius={56}
                      outerRadius={86}
                      paddingAngle={2}
                    >
                      {chartStatusMix.map((item) => <Cell key={item.id} fill={item.color} />)}
                    </Pie>
                    <Tooltip formatter={(value) => [`${value} modules`, 'Count']} contentStyle={{ borderRadius: 6, borderColor: '#dde3e8', fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <ChartFallback>{totalModules} modules</ChartFallback>
              )}
            </div>
            <div className="w-full max-w-[320px] space-y-1.5">
              {statusMix.map((item) => (
                <div key={item.id} className="grid grid-cols-[1fr_auto] gap-3 rounded-[6px] px-2 py-1.5 text-xs hover:bg-soe-canvas">
                  <span className="min-w-0 text-soe-slate">
                    <span className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="truncate font-medium text-soe-navy">{item.label}</span>
                    </span>
                    {item.count === 0 || item.detail ? (
                      <span className="mt-0.5 block truncate pl-4 text-[11px] text-soe-slate">
                        {item.detail || 'No modules in this stage'}
                      </span>
                    ) : null}
                  </span>
                  <span className="font-semibold text-soe-navy tabular-nums">{item.count}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-auto grid grid-cols-3 gap-4 border-t border-soe-border pt-4">
            <MiniStat label="Validation warnings" value={String(d.warningCount)} tone={d.warningCount ? 'text-soe-warning' : ''} />
            <MiniStat label="SOE action required" value={String(returnedOrClarification)} tone={returnedOrClarification ? 'text-soe-critical' : ''} />
            <MiniStat label="Awaiting certification" value={String(readyForCertification)} tone={readyForCertification ? 'text-soe-success' : ''} />
          </div>
        </Card>

            <Card title="Upcoming deadlines" subtitle="Near-term governance and reporting dates" className="flex h-full flex-col">
              <div className="flex flex-1 flex-col space-y-2">
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

            <Card title="Returns" className="flex h-full flex-col">
              <div className="flex flex-1 flex-col space-y-2">
                {returnedModuleCards.length ? (
                  returnedModuleCards.map((module) => (
                    <Link
                      key={module.id}
                      to="/soe-entry/submissions?tab=issues"
                      className="group block rounded-[6px] border border-soe-border p-3 hover:border-soe-blue"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-soe-navy">
                            {module.label}
                          </p>
                          <p className="mt-1 text-xs text-soe-slate">{formatDate(module.returnedAt)}</p>
                        </div>
                        <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-soe-critical">
                          {module.count}
                        </span>
                      </div>
                    </Link>
                  ))
                ) : (
                  <div className="rounded-[6px] border border-soe-border p-3">
                    <p className="text-sm font-medium text-soe-navy">No returns pending</p>
                  </div>
                )}
              </div>
            </Card>
      </section>

      <section className="grid gap-4">
        <Card
          title={isFocal ? 'Modules with lowest data completion' : 'Assigned module data completion'}
          subtitle="Modules requiring the most data-entry work"
          actions={<Link className="text-xs font-medium text-soe-blue" to={submissionsRoute}>Open all</Link>}
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
      </section>

    </div>
  )
}
