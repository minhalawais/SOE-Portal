import { useQuery } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  Building2,
  Check,
  CircleDollarSign,
  Download,
  Factory,
  Gauge,
  Info,
  Landmark,
  Scale,
  Search,
  ShieldCheck,
  Users,
} from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from 'recharts'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/design-system/components/Button'
import { ChartContainer } from '@/design-system/components/ChartContainer'
import { SelectField } from '@/design-system/components/Fields'
import { ErrorState, LoadingBlock } from '@/design-system/components/Feedback'
import { organizations, reportingPeriods } from '@/mock-data'
import { mockPerformanceComparisonService } from '@/mock-services'
import type {
  PerformanceDataMode,
  PerformanceMandate,
  PerformanceMetricValue,
  PerformancePillar,
  PerformanceScope,
  PerformanceScorecard,
  PerformanceTrend,
} from '@/mock-services/performanceComparison.service'
import { pillarLabels } from '@/mock-services/performanceComparison.service'
import { cn, formatCurrencyPkr } from '@/utils'

const chartColors = ['#1f5f8b', '#138a7a', '#d17a08', '#7a5d9a', '#bf3f34']
const annualPeriods = reportingPeriods.filter((period) => period.type === 'annual')
const defaultPeriodId = [...annualPeriods].reverse().find((period) => period.status !== 'open')?.id ?? annualPeriods.at(-1)?.id ?? ''
const pillarOrder = Object.keys(pillarLabels) as PerformancePillar[]

const pillarIcons: Record<PerformancePillar, typeof Gauge> = {
  financial: CircleDollarSign,
  workforce: Users,
  assets: Building2,
  operational: Factory,
  compliance: BadgeCheck,
  governance: ShieldCheck,
  litigation: Scale,
  fiscal: Landmark,
}

const pillarAccent: Record<PerformancePillar, string> = {
  financial: 'bg-soe-blue',
  workforce: 'bg-[#697bb0]',
  assets: 'bg-[#b56f2a]',
  operational: 'bg-soe-teal',
  compliance: 'bg-[#2f855a]',
  governance: 'bg-soe-warning',
  litigation: 'bg-soe-critical',
  fiscal: 'bg-[#56616d]',
}

const statusLabel = (score: number | null) => {
  if (score == null) return 'Insufficient data'
  if (score >= 80) return 'Strong'
  if (score >= 65) return 'Stable'
  if (score >= 45) return 'Watch'
  return 'Critical'
}

function formatMetric(metric: PerformanceMetricValue, value = metric.value) {
  if (value == null || !Number.isFinite(value)) return 'Not available'
  if (metric.definition.unit === 'currency_per_employee' || metric.definition.unit === 'currency') return formatCurrencyPkr(value)
  if (metric.definition.unit === 'ratio') return `${value.toFixed(2)}x`
  if (metric.definition.unit === 'number') return value.toLocaleString()
  return `${value.toFixed(1)}%`
}

function formatScore(score: number | null) {
  return score == null ? 'N/A' : String(Math.round(score))
}

function scoreTone(score: number | null) {
  if (score == null) return 'border-soe-border bg-soe-canvas text-soe-slate'
  if (score >= 80) return 'border-[#bde2d5] bg-[#e7f5f0] text-[#0d6b57]'
  if (score >= 65) return 'border-[#b7d4eb] bg-[#eef6fb] text-soe-blue'
  if (score >= 45) return 'border-[#efd49c] bg-[#fff4dd] text-[#8a5a05]'
  return 'border-[#efc5c1] bg-[#fff0ef] text-soe-critical'
}

function trendMeta(trend: PerformanceTrend) {
  if (trend === 'improving') return { label: 'Improving', icon: ArrowUpRight, className: 'bg-[#e7f5f0] text-[#0d6b57]' }
  if (trend === 'deteriorating') return { label: 'Declining', icon: ArrowDownRight, className: 'bg-[#fff0ef] text-soe-critical' }
  return { label: 'Stable', icon: ArrowRight, className: 'bg-soe-canvas text-soe-slate' }
}

function TrendBadge({ trend }: { trend: PerformanceTrend }) {
  const meta = trendMeta(trend)
  const Icon = meta.icon
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold', meta.className)}>
      <Icon size={13} aria-hidden />
      {meta.label}
    </span>
  )
}

function ScoreBadge({ score, large = false }: { score: number | null; large?: boolean }) {
  return (
    <span className={cn('inline-flex shrink-0 items-center justify-center rounded-[6px] border font-semibold tabular-nums', large ? 'h-16 w-16 text-2xl' : 'h-9 min-w-10 px-2 text-sm', scoreTone(score))}>
      {formatScore(score)}
    </span>
  )
}

function DataBadge({ status }: { status: PerformanceScorecard['dataStatus'] }) {
  const trusted = status === 'trusted'
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold', trusted ? 'bg-[#e7f5f0] text-[#0d6b57]' : status === 'provisional' ? 'bg-[#fff4dd] text-[#8a5a05]' : 'bg-soe-canvas text-soe-slate')}>
      {trusted ? <Check size={12} aria-hidden /> : <Info size={12} aria-hidden />}
      {trusted ? 'Approved data' : status === 'provisional' ? 'Provisional data' : 'Unavailable'}
    </span>
  )
}

function ProgressTrack({ value, pillar }: { value: number | null; pillar: PerformancePillar }) {
  const clamped = Math.max(0, Math.min(100, value ?? 0))
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-[#e7edf2]" aria-hidden="true">
      <div className={cn('h-full rounded-full', pillarAccent[pillar])} style={{ width: `${clamped}%` }} />
    </div>
  )
}

function SummaryTile({ label, value, detail, icon: Icon, tone = 'blue' }: { label: string; value: string; detail: string; icon: typeof Building2; tone?: 'blue' | 'teal' | 'amber' | 'red' }) {
  const colors = {
    blue: 'border-t-soe-blue text-soe-blue',
    teal: 'border-t-soe-teal text-soe-teal',
    amber: 'border-t-soe-warning text-soe-warning',
    red: 'border-t-soe-critical text-soe-critical',
  }
  return (
    <div className={cn('min-h-[112px] border border-t-[3px] border-soe-border bg-white p-4 shadow-[var(--shadow-sm)]', colors[tone])}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase text-soe-slate">{label}</p>
        <Icon size={18} aria-hidden />
      </div>
      <p className="mt-3 text-[26px] font-semibold leading-none text-soe-navy tabular-nums">{value}</p>
      <p className="mt-2 text-xs text-soe-slate">{detail}</p>
    </div>
  )
}

function SectionHeader({ eyebrow, title, detail, action }: { eyebrow: string; title: string; detail: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 border-b border-soe-border pb-3">
      <div>
        <p className="text-[11px] font-semibold uppercase text-soe-blue">{eyebrow}</p>
        <h2 className="mt-1 text-lg font-semibold text-soe-navy">{title}</h2>
        <p className="mt-1 text-xs text-soe-slate">{detail}</p>
      </div>
      {action}
    </div>
  )
}

function MetricTooltip({ metric }: { metric: PerformanceMetricValue }) {
  return (
    <span className="group relative inline-flex">
      <Info size={13} className="text-soe-slate" aria-label={`${metric.definition.label} definition`} />
      <span className="pointer-events-none absolute bottom-full left-0 z-20 mb-2 hidden w-72 rounded-control border border-soe-border bg-soe-navy p-3 text-[11px] leading-4 text-white shadow-lg group-hover:block group-focus-within:block">
        {metric.definition.formula}. Target: {formatMetric(metric, metric.definition.target)}. Source: {metric.definition.sourceModule}.
      </span>
    </span>
  )
}

function strongestWeakest(card: PerformanceScorecard) {
  const scored = card.pillarScores.filter((pillar) => pillar.score != null)
  const sorted = [...scored].sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
  return {
    strength: sorted[0]?.label ?? 'Insufficient data',
    weakness: sorted.at(-1)?.label ?? 'Insufficient data',
  }
}

function ComparisonSelector({ rows, selected, onChange, onFocus }: { rows: PerformanceScorecard[]; selected: string[]; onChange: (ids: string[]) => void; onFocus: (id: string) => void }) {
  const [query, setQuery] = useState('')
  const filteredRows = rows.filter((row) => `${row.abbreviation} ${row.name} ${row.sector}`.toLowerCase().includes(query.toLowerCase()))
  const toggle = (id: string) => {
    if (selected.includes(id)) return onChange(selected.filter((item) => item !== id))
    if (selected.length < 5) {
      onChange([...selected, id])
      onFocus(id)
    }
  }
  return (
    <section className="border border-soe-border bg-white">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-soe-border bg-[#f8fafc] px-4 py-3">
        <div>
          <p className="text-[11px] font-semibold uppercase text-soe-blue">Select enterprises</p>
          <h2 className="mt-0.5 text-sm font-semibold text-soe-navy">Choose 2 to 5 SOEs for comparison</h2>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex h-9 w-[min(420px,calc(100vw-80px))] items-center gap-2 rounded-control border border-soe-border bg-white px-3 text-xs text-soe-navy focus-within:border-soe-blue">
            <Search size={14} className="text-soe-slate" aria-hidden />
            <span className="sr-only">Search SOEs</span>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search SOE..." className="h-full min-w-0 flex-1 bg-transparent outline-none placeholder:text-soe-slate" />
          </label>
          <span className="rounded-full bg-soe-canvas px-3 py-1 text-[11px] font-semibold text-soe-navy">{selected.length}/5 selected</span>
        </div>
      </header>
      <div className="p-3">
        <div className="flex gap-2 overflow-x-auto overflow-y-hidden pb-1">
          {filteredRows.map((row) => {
            const checked = selected.includes(row.organizationId)
            return (
              <button key={row.organizationId} type="button" onClick={() => toggle(row.organizationId)} aria-pressed={checked} disabled={!checked && selected.length >= 5} className={cn('flex h-[54px] w-[260px] shrink-0 items-center gap-2 rounded-control border px-2.5 py-2 text-left transition disabled:cursor-not-allowed disabled:opacity-45', checked ? 'border-soe-blue bg-[#eef6fb]' : 'border-soe-border bg-white hover:border-soe-blue')}>
                <span className={cn('flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] border', checked ? 'border-soe-blue bg-soe-blue text-white' : 'border-soe-border')}>{checked ? <Check size={12} /> : null}</span>
                <span className="min-w-0">
                  <span className="block text-xs font-semibold text-soe-navy">{row.abbreviation}</span>
                  <span className="block truncate text-[10px] text-soe-slate">{row.name}</span>
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </section>
  )
}

function RankingTable({ cards, onFocus }: { cards: PerformanceScorecard[]; onFocus: (id: string) => void }) {
  const ranked = [...cards].sort((a, b) => (b.overallScore ?? -1) - (a.overallScore ?? -1))
  return (
    <section className="border border-soe-border bg-white">
      <header className="border-b border-soe-border px-5 py-4">
        <h2 className="text-sm font-semibold text-soe-navy">Overall ranking for selected SOEs</h2>
        <p className="mt-1 text-xs text-soe-slate">Ranking is based on enterprise performance, not submission activity.</p>
      </header>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] text-left text-xs">
          <thead className="bg-[#f4f7fa] text-soe-navy">
            <tr>
              <th className="border-b border-soe-border px-4 py-3">Rank</th>
              <th className="border-b border-soe-border px-4 py-3">SOE</th>
              <th className="border-b border-soe-border px-4 py-3 text-center">Score</th>
              <th className="border-b border-soe-border px-4 py-3">Status</th>
              <th className="border-b border-soe-border px-4 py-3">Trend</th>
              <th className="border-b border-soe-border px-4 py-3">Strongest pillar</th>
              <th className="border-b border-soe-border px-4 py-3">Weakest pillar</th>
              <th className="border-b border-soe-border px-4 py-3">MOIP attention</th>
            </tr>
          </thead>
          <tbody>
            {ranked.map((card, index) => {
              const drivers = strongestWeakest(card)
              return (
                <tr key={card.organizationId} className="border-b border-soe-border last:border-b-0 hover:bg-[#f8fafc]">
                  <td className="px-4 py-3 font-semibold text-soe-navy">{index + 1}</td>
                  <td className="px-4 py-3">
                    <button type="button" onClick={() => onFocus(card.organizationId)} className="text-left font-semibold text-soe-navy hover:text-soe-blue">{card.abbreviation}</button>
                    <span className="block text-[11px] text-soe-slate">{card.sector}</span>
                  </td>
                  <td className="px-4 py-3 text-center"><ScoreBadge score={card.overallScore} /></td>
                  <td className="px-4 py-3"><span className={cn('rounded-full border px-2 py-1 text-[11px] font-semibold', scoreTone(card.overallScore))}>{statusLabel(card.overallScore)}</span></td>
                  <td className="px-4 py-3"><TrendBadge trend={card.trend} /></td>
                  <td className="px-4 py-3 text-[#0d6b57]">{drivers.strength}</td>
                  <td className="px-4 py-3 text-soe-critical">{drivers.weakness}</td>
                  <td className="px-4 py-3 text-soe-slate">{card.riskFlags[0]?.label ?? 'No material flag'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function PillarMatrix({ cards, onFocus }: { cards: PerformanceScorecard[]; onFocus: (id: string) => void }) {
  return (
    <section className="space-y-3">
      <SectionHeader eyebrow="Pillar matrix" title="Where each SOE is strong or weak" detail="Rows are performance pillars; columns are selected SOEs. Color bands make weak areas visible without opening another page." />
      <div className="overflow-x-auto border border-soe-border bg-white">
        <table className="w-full min-w-[980px] border-collapse text-xs">
          <thead className="bg-[#f4f7fa] text-soe-navy">
            <tr>
              <th className="sticky left-0 z-10 border-b border-r border-soe-border bg-[#f4f7fa] px-4 py-3 text-left font-semibold">Performance pillar</th>
              {cards.map((card) => (
                <th key={card.organizationId} className="border-b border-soe-border px-4 py-3 text-left">
                  <button type="button" onClick={() => onFocus(card.organizationId)} className="font-semibold text-soe-navy hover:text-soe-blue">{card.abbreviation}</button>
                  <span className="mt-0.5 block text-[10px] font-normal text-soe-slate">{card.peerGroup}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pillarOrder.map((pillar) => {
              const Icon = pillarIcons[pillar]
              return (
                <tr key={pillar} className="border-b border-soe-border last:border-b-0">
                  <td className="sticky left-0 z-10 border-r border-soe-border bg-white px-4 py-3">
                    <div className="flex items-center gap-2 font-semibold text-soe-navy"><Icon size={16} className="text-soe-blue" />{pillarLabels[pillar]}</div>
                  </td>
                  {cards.map((card) => {
                    const score = card.pillarScores.find((item) => item.id === pillar)?.score ?? null
                    const coverage = card.pillarScores.find((item) => item.id === pillar)?.coverage ?? 0
                    return (
                      <td key={card.organizationId} className="min-w-[150px] px-4 py-3">
                        <div className="flex items-center justify-between gap-3">
                          <span className={cn('rounded-full border px-2 py-1 text-[11px] font-semibold tabular-nums', scoreTone(score))}>{formatScore(score)}</span>
                          <span className="text-[10px] text-soe-slate">{coverage}% data</span>
                        </div>
                        <div className="mt-2"><ProgressTrack value={score} pillar={pillar} /></div>
                        <p className="mt-1 text-[10px] text-soe-slate">{statusLabel(score)}</p>
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function VisualComparison({ cards, portfolio }: { cards: PerformanceScorecard[]; portfolio: Awaited<ReturnType<typeof mockPerformanceComparisonService.getPortfolio>> }) {
  const radarData = pillarOrder.map((pillar) => {
    const point: Record<string, string | number> = { pillar: pillarLabels[pillar].replace(' performance', '').replace(' & property', '') }
    cards.forEach((card) => {
      point[card.abbreviation] = card.pillarScores.find((item) => item.id === pillar)?.score ?? 0
    })
    return point
  })
  const barData = pillarOrder.map((pillar) => {
    const point: Record<string, string | number> = { pillar: pillarLabels[pillar].replace(' performance', '').replace(' & property', '') }
    cards.forEach((card) => {
      point[card.abbreviation] = card.pillarScores.find((item) => item.id === pillar)?.score ?? 0
    })
    return point
  })
  const trendData = annualPeriods.map((period) => {
    const point: Record<string, string | number | null> = { label: period.label }
    cards.forEach((card) => {
      point[card.abbreviation] = portfolio.organizationTrends.find((trend) => trend.organizationId === card.organizationId)?.points.find((item) => item.reportingPeriodId === period.id)?.score ?? null
    })
    return point
  })
  const riskData = cards.map((card) => ({
    organizationId: card.organizationId,
    abbreviation: card.abbreviation,
    x: card.pillarScores.find((item) => item.id === 'financial')?.score ?? 0,
    y: card.pillarScores.find((item) => item.id === 'compliance')?.score ?? 0,
    z: Math.max(1, card.context.activeLitigationExposure + card.context.governmentSupport),
    score: card.overallScore,
  }))

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <ChartContainer title="Pillar profile" subtitle="Radar view of selected SOEs" period={portfolio.reportingPeriodLabel} summary="Radar chart comparing selected SOEs across the eight enterprise performance pillars.">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={radarData} outerRadius="72%">
            <PolarGrid stroke="#dfe7ee" />
            <PolarAngleAxis dataKey="pillar" tick={{ fontSize: 10 }} />
            <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 10 }} />
            <Tooltip />
            {cards.map((card, index) => <Radar key={card.organizationId} name={card.abbreviation} dataKey={card.abbreviation} stroke={chartColors[index]} fill={chartColors[index]} fillOpacity={0.12} strokeWidth={2} />)}
            <Legend wrapperStyle={{ fontSize: 11 }} />
          </RadarChart>
        </ResponsiveContainer>
      </ChartContainer>

      <ChartContainer title="Pillar bar comparison" subtitle="Score out of 100 by pillar" period="Selected SOEs" summary="Grouped bar chart showing pillar score differences across selected enterprises.">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={barData} margin={{ top: 10, right: 12, bottom: 0, left: -12 }}>
            <CartesianGrid stroke="#e6ebef" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="pillar" tick={{ fontSize: 10 }} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {cards.map((card, index) => <Bar key={card.organizationId} dataKey={card.abbreviation} fill={chartColors[index]} radius={[2, 2, 0, 0]} />)}
          </BarChart>
        </ResponsiveContainer>
      </ChartContainer>

      <ChartContainer title="Performance direction" subtitle="Multi-year score trend" period="Annual periods" summary="Line chart showing the performance score trend for the selected SOEs.">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={trendData} margin={{ top: 10, right: 18, bottom: 0, left: -12 }}>
            <CartesianGrid stroke="#e6ebef" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {cards.map((card, index) => <Line key={card.organizationId} type="monotone" dataKey={card.abbreviation} stroke={chartColors[index]} strokeWidth={2.5} dot={{ r: 3 }} connectNulls />)}
          </LineChart>
        </ResponsiveContainer>
      </ChartContainer>

      <ChartContainer title="Risk position" subtitle="Financial score vs compliance score" period="Bubble size: fiscal and legal exposure" summary="Scatter plot showing selected enterprises by financial and compliance pillar scores.">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 10, right: 20, bottom: 12, left: 0 }}>
            <CartesianGrid stroke="#e6ebef" strokeDasharray="3 3" />
            <XAxis type="number" dataKey="x" name="Financial score" domain={[0, 100]} tick={{ fontSize: 11 }} label={{ value: 'Financial performance', position: 'insideBottom', offset: -6, fontSize: 11 }} />
            <YAxis type="number" dataKey="y" name="Compliance score" domain={[0, 100]} tick={{ fontSize: 11 }} width={48} />
            <ZAxis type="number" dataKey="z" range={[120, 640]} />
            <ReferenceLine x={45} stroke="#bf3f34" strokeDasharray="4 4" />
            <ReferenceLine y={45} stroke="#bf3f34" strokeDasharray="4 4" />
            <Tooltip cursor={{ strokeDasharray: '3 3' }} formatter={(value, name) => name === 'z' ? formatCurrencyPkr(Number(value)) : `${Number(value).toFixed(0)}/100`} labelFormatter={(_, payload) => payload?.[0]?.payload?.abbreviation ?? ''} />
            <Scatter data={riskData} name="Selected SOEs">
              {riskData.map((point) => <Cell key={point.organizationId} fill={(point.score ?? 0) >= 65 ? '#138a7a' : (point.score ?? 0) >= 45 ? '#d17a08' : '#bf3f34'} />)}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </ChartContainer>
    </div>
  )
}

function MetricComparison({ cards }: { cards: PerformanceScorecard[] }) {
  return (
    <section className="space-y-4">
      <SectionHeader eyebrow="Metric detail" title="Source-backed performance comparison" detail="Each section uses the same selected SOEs and keeps peer median, percentile and source module visible." />
      {pillarOrder.map((pillar) => {
        const Icon = pillarIcons[pillar]
        const baseMetrics = cards[0]?.metrics.filter((metric) => metric.definition.pillar === pillar) ?? []
        return (
          <div key={pillar} className="overflow-hidden border border-soe-border bg-white">
            <header className="flex items-center gap-2 border-b border-soe-border bg-[#f8fafc] px-5 py-3">
              <Icon size={17} className="text-soe-blue" />
              <h3 className="text-sm font-semibold text-soe-navy">{pillarLabels[pillar]}</h3>
            </header>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] border-collapse text-xs">
                <thead className="bg-white">
                  <tr>
                    <th className="border-b border-soe-border px-4 py-3 text-left font-semibold text-soe-navy">Metric</th>
                    {cards.map((card) => <th key={card.organizationId} className="border-b border-soe-border px-4 py-3 text-left font-semibold text-soe-navy">{card.abbreviation}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {baseMetrics.map((baseMetric) => (
                    <tr key={baseMetric.definition.id} className="border-b border-soe-border last:border-b-0">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 font-semibold text-soe-navy">{baseMetric.definition.shortLabel}<MetricTooltip metric={baseMetric} /></div>
                        <Link to={baseMetric.sourceRoute} className="mt-1 inline-flex items-center gap-1 text-[10px] font-semibold text-soe-blue hover:underline">Open source <ArrowRight size={11} /></Link>
                      </td>
                      {cards.map((card) => {
                        const metric = card.metrics.find((item) => item.definition.id === baseMetric.definition.id)!
                        return (
                          <td key={card.organizationId} className="px-4 py-3">
                            <p className="font-semibold text-soe-navy tabular-nums">{formatMetric(metric)}</p>
                            <p className="mt-1 text-[10px] text-soe-slate">Score {formatScore(metric.score)} · median {formatMetric(metric, metric.peerMedian)}</p>
                            <p className="mt-0.5 text-[10px] text-soe-blue">{metric.peerPercentile == null ? 'Peer percentile unavailable' : `${Math.round(metric.peerPercentile)}th percentile`}</p>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      })}
    </section>
  )
}

function FocusedEnterprise({ card, portfolio }: { card: PerformanceScorecard; portfolio: Awaited<ReturnType<typeof mockPerformanceComparisonService.getPortfolio>> }) {
  const trend = portfolio.organizationTrends.find((row) => row.organizationId === card.organizationId)?.points ?? []
  const sortedPillars = [...card.pillarScores].filter((pillar) => pillar.score != null).sort((a, b) => (a.score ?? 0) - (b.score ?? 0))
  const weakest = sortedPillars.slice(0, 3)
  const strongest = sortedPillars.slice(-3).reverse()
  return (
    <section className="space-y-4">
      <SectionHeader eyebrow="Focused SOE" title={`${card.abbreviation} performance explanation`} detail="Use this area to understand why the selected SOE is performing well or poorly." action={<DataBadge status={card.dataStatus} />} />
      <div className="grid gap-4 xl:grid-cols-[0.72fr_1.28fr]">
        <div className="overflow-hidden rounded-[8px] bg-soe-navy text-white shadow-[var(--shadow-card)]">
          <div className="p-5">
            <p className="text-xs font-semibold uppercase text-white/55">{card.peerGroup}</p>
            <h2 className="mt-2 text-2xl font-semibold">{card.name}</h2>
            <p className="mt-2 text-xs text-white/60">{card.sector} · {card.reportingPeriodLabel} · {card.scope === 'consolidated' ? 'Consolidated group' : 'Standalone entity'}</p>
            <div className="mt-6 flex items-center gap-4">
              <ScoreBadge score={card.overallScore} large />
              <div>
                <p className="text-xs text-white/60">Performance status</p>
                <p className="mt-1 text-lg font-semibold">{statusLabel(card.overallScore)}</p>
                <div className="mt-2"><TrendBadge trend={card.trend} /></div>
              </div>
            </div>
          </div>
          <div className="grid border-t border-white/10 sm:grid-cols-2">
            <div className="border-b border-white/10 px-5 py-4 sm:border-r"><p className="text-[11px] text-white/55">Revenue</p><p className="mt-1 font-semibold">{formatCurrencyPkr(card.context.revenue)}</p></div>
            <div className="border-b border-white/10 px-5 py-4"><p className="text-[11px] text-white/55">Profit / loss</p><p className={cn('mt-1 font-semibold', card.context.profitOrLoss < 0 ? 'text-[#ffb4ab]' : 'text-[#a8efd9]')}>{formatCurrencyPkr(card.context.profitOrLoss)}</p></div>
            <div className="border-b border-white/10 px-5 py-4 sm:border-b-0 sm:border-r"><p className="text-[11px] text-white/55">Idle assets</p><p className="mt-1 font-semibold">{formatCurrencyPkr(card.context.idleAssetValue)}</p></div>
            <div className="px-5 py-4"><p className="text-[11px] text-white/55">Legal exposure</p><p className="mt-1 font-semibold">{formatCurrencyPkr(card.context.activeLitigationExposure)}</p></div>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <ChartContainer title="Score trend" subtitle="Annual performance score" period={card.abbreviation} summary={`Line chart showing performance score trend for ${card.name}.`}>
            <ResponsiveContainer width="100%" height="100%"><LineChart data={trend} margin={{ top: 12, right: 18, bottom: 0, left: -12 }}><CartesianGrid stroke="#e6ebef" strokeDasharray="3 3" vertical={false} /><XAxis dataKey="label" tick={{ fontSize: 11 }} /><YAxis domain={[0, 100]} tick={{ fontSize: 11 }} /><Tooltip formatter={(value) => [`${value}/100`, 'Score']} /><Line type="monotone" dataKey="score" stroke="#1f5f8b" strokeWidth={3} dot={{ r: 4 }} connectNulls /></LineChart></ResponsiveContainer>
          </ChartContainer>
          <div className="border border-soe-border bg-white">
            <header className="border-b border-soe-border px-5 py-4"><h3 className="text-sm font-semibold text-soe-navy">MOIP attention areas</h3><p className="mt-1 text-xs text-soe-slate">Weak pillars and contextual flags for review.</p></header>
            <div className="grid gap-4 p-5 md:grid-cols-2">
              <div>
                <p className="text-[11px] font-semibold uppercase text-soe-slate">Strongest</p>
                <div className="mt-3 space-y-2">{strongest.map((pillar) => <p key={pillar.id} className="flex items-center justify-between gap-3 rounded-control bg-[#e7f5f0] px-3 py-2 text-xs"><span className="font-semibold text-[#0d6b57]">{pillar.label}</span><span className="font-semibold tabular-nums">{formatScore(pillar.score)}</span></p>)}</div>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase text-soe-slate">Weakest</p>
                <div className="mt-3 space-y-2">{weakest.map((pillar) => <p key={pillar.id} className="flex items-center justify-between gap-3 rounded-control bg-[#fff4dd] px-3 py-2 text-xs"><span className="font-semibold text-[#8a5a05]">{pillar.label}</span><span className="font-semibold tabular-nums">{formatScore(pillar.score)}</span></p>)}</div>
              </div>
            </div>
            <div className="divide-y divide-soe-border border-t border-soe-border">
              {card.riskFlags.length ? card.riskFlags.map((flag) => (
                <Link key={flag.id} to={flag.route} className="flex items-start justify-between gap-4 px-5 py-3 hover:bg-soe-canvas">
                  <div className="flex items-start gap-2">
                    <AlertTriangle size={15} className={cn('mt-0.5 shrink-0', flag.severity === 'critical' ? 'text-soe-critical' : flag.severity === 'warning' ? 'text-soe-warning' : 'text-soe-blue')} />
                    <div><p className="text-xs font-semibold text-soe-navy">{flag.label}</p><p className="mt-1 text-[11px] text-soe-slate">{flag.detail}</p></div>
                  </div>
                  <ArrowRight size={15} className="mt-1 shrink-0 text-soe-slate" />
                </Link>
              )) : <div className="px-5 py-10 text-center text-xs font-semibold text-soe-navy">No material contextual flags</div>}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export function MoipPerformanceComparisonPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [reportingPeriodId, setReportingPeriodId] = useState(searchParams.get('period') ?? defaultPeriodId)
  const [scope, setScope] = useState<PerformanceScope>((searchParams.get('scope') as PerformanceScope) ?? 'standalone')
  const [dataMode, setDataMode] = useState<PerformanceDataMode>((searchParams.get('data') as PerformanceDataMode) ?? 'approved')
  const [sector, setSector] = useState(searchParams.get('sector') ?? '')
  const [mandate, setMandate] = useState<PerformanceMandate | ''>((searchParams.get('mandate') as PerformanceMandate) ?? '')
  const [selected, setSelected] = useState<string[]>([])
  const [focusedId, setFocusedId] = useState(searchParams.get('organizationId') ?? '')

  const query = useQuery({
    queryKey: ['moip-performance-comparison', reportingPeriodId, scope, dataMode, sector, mandate],
    queryFn: () => mockPerformanceComparisonService.getPortfolio({ reportingPeriodId, scope, dataMode, sector, mandate }),
  })

  const rows = useMemo(() => query.data?.scorecards ?? [], [query.data?.scorecards])
  const selectedCards = useMemo(() => selected.map((id) => rows.find((row) => row.organizationId === id)).filter((row): row is PerformanceScorecard => Boolean(row)).sort((a, b) => (b.overallScore ?? -1) - (a.overallScore ?? -1)), [rows, selected])
  const focusedCard = rows.find((row) => row.organizationId === focusedId) ?? selectedCards[0] ?? rows[0]
  const sectors = useMemo(() => [...new Set(organizations.map((organization) => organization.sector))].sort(), [])

  useEffect(() => {
    if (!rows.length) return
    setSelected((current) => {
      const retained = current.filter((id) => rows.some((row) => row.organizationId === id)).slice(0, 5)
      const deepLinked = searchParams.get('organizationId')
      const seed = deepLinked && rows.some((row) => row.organizationId === deepLinked) ? [deepLinked] : []
      const next = retained.length >= 2 ? retained : [...new Set([...seed, ...rows.slice(0, 4).map((row) => row.organizationId)])].slice(0, 4)
      return next
    })
    setFocusedId((current) => rows.some((row) => row.organizationId === current) ? current : (searchParams.get('organizationId') ?? rows[0]!.organizationId))
  }, [rows, searchParams])

  const setFocused = (organizationId: string) => {
    setFocusedId(organizationId)
    const params = new URLSearchParams(searchParams)
    params.set('organizationId', organizationId)
    params.delete('view')
    setSearchParams(params, { replace: true })
  }

  const resetFilters = () => {
    setReportingPeriodId(defaultPeriodId)
    setScope('standalone')
    setDataMode('approved')
    setSector('')
    setMandate('')
  }

  const exportComparison = () => {
    if (!query.data) return
    const exportRows = selectedCards.length >= 2 ? selectedCards : rows
    const header = ['Enterprise', 'Sector', 'Peer group', 'Overall score', 'Status', 'Trend', ...query.data.scorecards[0]?.metrics.map((metric) => metric.definition.label) ?? []]
    const body = exportRows.map((row) => [row.name, row.sector, row.peerGroup, row.overallScore ?? '', statusLabel(row.overallScore), row.trend, ...row.metrics.map((metric) => metric.value ?? '')])
    const csv = [header, ...body].map((line) => line.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(',')).join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `soe-performance-comparison-${query.data.reportingPeriodLabel.toLowerCase()}.csv`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  if (query.isLoading) return <LoadingBlock label="Loading SOE performance comparison..." />
  if (query.isError || !query.data) return <ErrorState title="Unable to load SOE performance comparison" />

  const hasComparison = selectedCards.length >= 2

  return (
    <div className="space-y-5 pb-8">
      <PageHeader title="SOE Performance Comparison" subtitle="Compare selected SOEs by enterprise performance, operating health, risk exposure and fiscal sustainability." actions={<Button variant="secondary" onClick={exportComparison}><Download size={16} /> Export CSV</Button>} />

      <section className="rounded-[8px] border border-soe-border bg-white p-4 shadow-[var(--shadow-sm)]">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-soe-border pb-3">
          <p className="text-xs font-semibold uppercase text-soe-slate">Performance filters</p>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-[#eef6fb] px-3 py-1 text-[11px] font-semibold text-soe-blue">{query.data.methodologyVersion}</span>
            <span className="rounded-full bg-[#fff4dd] px-3 py-1 text-[11px] font-semibold text-[#8a5a05]">Provisional methodology</span>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[1fr_1fr_1fr_1.2fr_1.2fr_auto] xl:items-end">
          <SelectField label="Financial year" value={reportingPeriodId} options={annualPeriods.map((period) => ({ value: period.id, label: period.label }))} onChange={(event) => setReportingPeriodId(event.target.value)} />
          <SelectField label="Entity scope" value={scope} options={[{ value: 'standalone', label: 'Standalone entities' }, { value: 'consolidated', label: 'Consolidated groups' }]} onChange={(event) => setScope(event.target.value as PerformanceScope)} />
          <SelectField label="Data eligibility" value={dataMode} options={[{ value: 'approved', label: 'Approved / locked' }, { value: 'reported', label: 'Include provisional' }]} onChange={(event) => setDataMode(event.target.value as PerformanceDataMode)} />
          <SelectField label="Peer cohort" value={mandate} options={[{ value: '', label: 'All peer cohorts' }, { value: 'commercial', label: 'Commercial operators' }, { value: 'developmental', label: 'Development institutions' }]} onChange={(event) => setMandate(event.target.value as PerformanceMandate | '')} />
          <SelectField label="Sector" value={sector} options={[{ value: '', label: 'All sectors' }, ...sectors.map((item) => ({ value: item, label: item }))]} onChange={(event) => setSector(event.target.value)} />
          <Button variant="tertiary" onClick={resetFilters}>Reset</Button>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryTile label="SOEs available" value={String(query.data.summary.enterprises)} detail="Under current filters" icon={Building2} />
        <SummaryTile label="Strong performers" value={String(query.data.summary.strong)} detail="Score 80 or above" icon={ArrowUpRight} tone="teal" />
        <SummaryTile label="Watchlist" value={String(query.data.summary.watchlist)} detail="Score between 45 and 64" icon={Gauge} tone="amber" />
        <SummaryTile label="Critical risk" value={String(query.data.summary.critical)} detail="Score below 45" icon={AlertTriangle} tone="red" />
      </div>

      <ComparisonSelector rows={rows} selected={selected} onChange={setSelected} onFocus={setFocused} />

      {!hasComparison ? (
        <div className="border border-dashed border-soe-border bg-white py-16 text-center">
          <Scale className="mx-auto text-soe-slate" />
          <p className="mt-3 text-sm font-semibold text-soe-navy">Select at least two SOEs</p>
          <p className="mt-1 text-xs text-soe-slate">The comparison matrix, charts and metric details will appear on this same page.</p>
        </div>
      ) : (
        <>
          <RankingTable cards={selectedCards} onFocus={setFocused} />
          <PillarMatrix cards={selectedCards} onFocus={setFocused} />
          <VisualComparison cards={selectedCards} portfolio={query.data} />
          <MetricComparison cards={selectedCards} />
          {focusedCard ? <FocusedEnterprise card={focusedCard} portfolio={query.data} /> : null}
        </>
      )}
    </div>
  )
}
