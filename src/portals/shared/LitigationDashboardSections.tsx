import { useQuery } from '@tanstack/react-query'
import { ArrowRight, FileWarning, Gavel, Scale, ShieldAlert } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Card } from '@/design-system/components/Card'
import { KpiCard } from '@/design-system/components/KpiCard'
import { LoadingBlock } from '@/design-system/components/Feedback'
import { StatusBadge } from '@/design-system/components/StatusBadge'
import {
  LITIGATION_STAGE,
  type LitigationStageId,
} from '@/constants'
import { mockLitigationService, mockOrganizationService } from '@/mock-services'
import type { ContinuousRegisterSummary, LitigationCase, LitigationStageSummary } from '@/types/domain'
import { formatCurrencyPkr } from '@/utils'

const linkClass = 'text-sm font-medium text-soe-blue hover:underline'

const REVIEW_STAGE_FOCUS: LitigationStageId[] = [
  LITIGATION_STAGE.HEARINGS,
  LITIGATION_STAGE.INTERIM_ORDERS,
  LITIGATION_STAGE.JUDGMENT,
  LITIGATION_STAGE.APPEAL_REVIEW,
  LITIGATION_STAGE.SETTLEMENT,
]

const ASSURANCE_LABEL: Record<string, string> = {
  draft: 'Draft',
  submitted: 'SOE review',
  returned: 'Returned',
  soe_verified: 'SOE verified',
  published_to_moip: 'MoIP queue',
  moip_acknowledged: 'MoIP acknowledged',
  clarification_open: 'Clarification',
}

const CHART_COLORS = { blue: '#1f5f8b', grid: '#e6ebef' }

function needsMoipAction(item: LitigationCase) {
  const state = item.assuranceState ?? 'draft'
  return state === 'published_to_moip' || state === 'clarification_open'
}

function totalExposure(cases: LitigationCase[]) {
  return cases.reduce((sum, item) => sum + (item.currentExposurePkr ?? item.amountInvolved ?? 0), 0)
}

function SectionTitle({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between border-b border-soe-border pb-2">
      <h2 className="text-sm font-bold text-soe-navy">{title}</h2>
      {action}
    </div>
  )
}

export function MoipLitigationRegisterSection() {
  const summary = useQuery({
    queryKey: ['moip-litigation-continuous-summary'],
    queryFn: () => mockLitigationService.getContinuousSummary(),
  })
  const stages = useQuery({
    queryKey: ['moip-litigation-stage-summary'],
    queryFn: () => mockLitigationService.getStageSummary(),
  })
  const cases = useQuery({
    queryKey: ['moip-litigation-cases-action'],
    queryFn: () => mockLitigationService.getCases(),
  })
  const organizations = useQuery({
    queryKey: ['organizations', 'litigation-dashboard'],
    queryFn: () => mockOrganizationService.getOrganizations({ pageSize: 200 }),
  })

  if (summary.isLoading || stages.isLoading || cases.isLoading) {
    return <LoadingBlock label="Loading litigation register…" />
  }

  const live = summary.data
  const stageRows = stages.data ?? []
  const orgById = new Map((organizations.data?.items ?? []).map((org) => [org.id, org]))
  const actionCases = (cases.data ?? [])
    .filter(needsMoipAction)
    .sort((a, b) => (b.currentExposurePkr ?? b.amountInvolved ?? 0) - (a.currentExposurePkr ?? a.amountInvolved ?? 0))
    .slice(0, 10)
  const exposure = totalExposure((cases.data ?? []).filter((item) => item.status !== 'closed' && item.status !== 'disposed'))

  const focusStages = stageRows.filter((item) => REVIEW_STAGE_FOCUS.includes(item.stage))

  return (
    <Card>
      <SectionTitle
        title="Litigation register (live)"
        action={
          <Link className={linkClass} to="/moip-review/modules/litigation">
            Open full portfolio
          </Link>
        }
      />
      <p className="mb-4 text-xs text-soe-slate">
        Continuous case progress and stage assurance · not FY-bound · as of {live?.asOfDate ?? '—'}
      </p>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <KpiCard label="Active cases" value={String(live?.activeRecords ?? 0)} />
        <KpiCard label="MoIP queue" value={String(live?.pendingMoipAcknowledgement ?? 0)} />
        <KpiCard label="Hearings (30 days)" value={String(live?.dueSoon ?? 0)} />
        <KpiCard label="Stale updates" value={String(live?.staleRecords ?? 0)} />
        <KpiCard label="Total exposure" value={formatCurrencyPkr(exposure).replace('PKR ', 'PKR ')} />
      </div>

      {focusStages.length ? (
        <div className="mt-4 grid gap-2 md:grid-cols-5">
          {focusStages.map((stage) => (
            <Link
              key={stage.stage}
              to={`/moip-review/accountability/litigation?stage=${stage.stage}`}
              className="rounded-card border border-soe-border bg-soe-canvas px-3 py-2 transition hover:border-soe-blue"
            >
              <p className="text-[11px] font-semibold uppercase text-soe-slate">{stage.label}</p>
              <p className="mt-1 text-lg font-semibold text-soe-navy tabular-nums">{stage.count}</p>
              <p className="text-[11px] text-soe-slate">
                {stage.pendingReview} review · {stage.stale} stale
              </p>
            </Link>
          ))}
        </div>
      ) : null}

      <div className="mt-4 overflow-x-auto">
        <p className="mb-2 text-xs font-semibold uppercase text-soe-slate">Cases requiring MoIP action</p>
        {actionCases.length ? (
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="text-[11px] uppercase text-soe-slate">
              <tr>
                <th className="py-2">SOE</th>
                <th>Case</th>
                <th>Stage</th>
                <th>Exposure</th>
                <th>Updated</th>
                <th>Assurance</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {actionCases.map((item) => {
                const org = orgById.get(item.organizationId)
                return (
                  <tr key={item.id} className="border-t border-soe-border">
                    <td className="py-2 font-medium text-soe-navy">{org?.abbreviation ?? item.organizationId}</td>
                    <td>{item.caseNumber}</td>
                    <td>{item.caseStage ?? '—'}</td>
                    <td className="tabular-nums">{formatCurrencyPkr(item.currentExposurePkr ?? item.amountInvolved ?? 0)}</td>
                    <td className="text-xs text-soe-slate">{item.lastChangedAt ?? '—'}</td>
                    <td>
                      <StatusBadge
                        status={item.assuranceState ?? 'submitted'}
                        family="reporting"
                        label={ASSURANCE_LABEL[item.assuranceState ?? 'submitted'] ?? item.assuranceState}
                      />
                    </td>
                    <td>
                      <Link
                        className="inline-flex items-center gap-1 rounded-control bg-soe-blue px-2.5 py-1.5 text-xs font-semibold text-white"
                        to={`/moip-review/accountability/litigation/${item.id}`}
                      >
                        Review case
                        <ArrowRight size={13} aria-hidden />
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        ) : (
          <p className="text-sm text-soe-slate">No cases in MoIP queue or clarification state.</p>
        )}
      </div>
    </Card>
  )
}

export function ExecutiveLitigationExposureSection({
  litigation,
  litigationLive,
  stageSummary,
}: {
  litigation: LitigationCase[]
  litigationLive: ContinuousRegisterSummary
  stageSummary: LitigationStageSummary[]
}) {
  const organizations = useQuery({
    queryKey: ['organizations', 'executive-litigation'],
    queryFn: () => mockOrganizationService.getOrganizations({ pageSize: 200 }),
  })

  const orgById = new Map((organizations.data?.items ?? []).map((org) => [org.id, org]))
  const active = litigation.filter((item) => item.status !== 'closed' && item.status !== 'disposed')
  const exposure = totalExposure(active)
  const soesWithCases = new Set(active.map((item) => item.organizationId)).size
  const chartData = stageSummary
    .filter((item) => item.exposurePkr > 0)
    .sort((a, b) => b.exposurePkr - a.exposurePkr)
    .slice(0, 8)
    .map((item) => ({ stage: item.label, exposure: item.exposurePkr }))
  const topCases = [...active]
    .sort((a, b) => (b.currentExposurePkr ?? b.amountInvolved ?? 0) - (a.currentExposurePkr ?? a.amountInvolved ?? 0))
    .slice(0, 8)

  return (
    <section className="mt-6 space-y-3" aria-label="National litigation exposure">
      <div id="legal-risk" className="scroll-mt-24 border-b border-soe-border pb-2">
        <h2 className="text-base font-semibold text-soe-navy">National litigation exposure</h2>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-card border border-soe-border bg-white p-4 shadow-[var(--shadow-sm)]">
          <div className="flex items-start justify-between gap-2">
            <p className="text-[11px] font-semibold uppercase text-soe-slate">Active cases</p>
            <Scale size={16} className="text-soe-blue" aria-hidden />
          </div>
          <p className="mt-2 text-2xl font-semibold text-soe-navy tabular-nums">{litigationLive.activeRecords}</p>
          <p className="mt-1 text-xs text-soe-slate">National portfolio</p>
        </div>
        <div className="rounded-card border border-soe-border bg-white p-4 shadow-[var(--shadow-sm)]">
          <div className="flex items-start justify-between gap-2">
            <p className="text-[11px] font-semibold uppercase text-soe-slate">Total exposure</p>
            <Gavel size={16} className="text-soe-blue" aria-hidden />
          </div>
          <p className="mt-2 text-2xl font-semibold text-soe-navy">{formatCurrencyPkr(exposure)}</p>
          <p className="mt-1 text-xs text-soe-slate">Current case exposure</p>
        </div>
        <div className="rounded-card border border-soe-border bg-white p-4 shadow-[var(--shadow-sm)]">
          <div className="flex items-start justify-between gap-2">
            <p className="text-[11px] font-semibold uppercase text-soe-slate">Cases updated (30 days)</p>
            <FileWarning size={16} className="text-soe-warning" aria-hidden />
          </div>
          <p className="mt-2 text-2xl font-semibold text-soe-navy tabular-nums">{litigationLive.materialChanges30d}</p>
          <p className="mt-1 text-xs text-soe-slate">Last changed on the register</p>
        </div>
        <div className="rounded-card border border-soe-border bg-white p-4 shadow-[var(--shadow-sm)]">
          <div className="flex items-start justify-between gap-2">
            <p className="text-[11px] font-semibold uppercase text-soe-slate">SOEs with active cases</p>
            <ShieldAlert size={16} className="text-soe-slate" aria-hidden />
          </div>
          <p className="mt-2 text-2xl font-semibold text-soe-navy tabular-nums">{soesWithCases}</p>
          <p className="mt-1 text-xs text-soe-slate">Concentration across portfolio</p>
        </div>
      </div>

      <div className="grid gap-3 xl:grid-cols-2">
        <Card title="Exposure by lifecycle stage" padding>
          {chartData.length ? (
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 12 }}>
                  <CartesianGrid stroke={CHART_COLORS.grid} horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 10, fill: '#64748b' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(value) => formatCurrencyPkr(Number(value)).replace('PKR ', '')}
                  />
                  <YAxis
                    type="category"
                    dataKey="stage"
                    width={110}
                    tick={{ fontSize: 10, fill: '#64748b' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip formatter={(value) => formatCurrencyPkr(Number(value))} />
                  <Bar dataKey="exposure" name="Exposure" fill={CHART_COLORS.blue} radius={[0, 3, 3, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm text-soe-slate">No staged exposure recorded.</p>
          )}
        </Card>

        <Card title="Highest-exposure cases" padding>
          {topCases.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-[11px] uppercase text-soe-slate">
                  <tr>
                    <th className="py-2">SOE</th>
                    <th>Case</th>
                    <th>Stage</th>
                    <th>Exposure</th>
                    <th>Next hearing</th>
                  </tr>
                </thead>
                <tbody>
                  {topCases.map((item) => (
                    <tr key={item.id} className="border-t border-soe-border">
                      <td className="py-2 font-medium text-soe-navy">
                        {orgById.get(item.organizationId)?.abbreviation ?? item.organizationId}
                      </td>
                      <td>{item.caseNumber}</td>
                      <td className="text-xs">{item.caseStage ?? '—'}</td>
                      <td className="tabular-nums">{formatCurrencyPkr(item.currentExposurePkr ?? item.amountInvolved ?? 0)}</td>
                      <td className="text-xs text-soe-slate">{item.nextHearing ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-soe-slate">No active litigation cases.</p>
          )}
        </Card>
      </div>
    </section>
  )
}
