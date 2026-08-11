/**
 * PMO / Strategic Government View — Phase 17.
 * National strategic summary only. No operational workflow controls.
 */
import { useQuery } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { PageHeader } from '@/components/layout/PageHeader'
import { DataTable } from '@/components/tables/DataTable'
import { Card } from '@/design-system/components/Card'
import { ChartContainer } from '@/design-system/components/ChartContainer'
import { SelectField } from '@/design-system/components/Fields'
import { EmptyState, ErrorState, LoadingBlock } from '@/design-system/components/Feedback'
import { KpiValue } from '@/design-system/components/KpiCard'
import { Tooltip } from '@/design-system/components/Overlays'
import { RequirePermission } from '@/app/router/guards'
import { mockPmoPortalService } from '@/mock-services'
import type { PmoFilter, PmoStrategicIndicator } from '@/mock-services/pmoPortal.service'
import { PERMISSION } from '@/permissions'
import { useSessionStore } from '@/state/session'
import { cn, formatCurrencyPkr } from '@/utils'

const linkClass = 'text-sm text-soe-blue underline'

function KpiLink({
  to,
  label,
  value,
  period,
}: {
  to: string
  label: string
  value: string
  period?: string
}) {
  return (
    <Link to={to} className="block">
      <KpiValue label={label} value={value} period={period} className="p-3 [&_p:nth-child(2)]:text-xl" />
    </Link>
  )
}

function usePmoFilter(): [PmoFilter, (patch: Partial<PmoFilter>) => void] {
  const reportingPeriodId = useSessionStore((s) => s.reportingPeriodId)
  const setReportingPeriodId = useSessionStore((s) => s.setReportingPeriodId)
  const [searchParams, setSearchParams] = useSearchParams()
  const filter: PmoFilter = {
    reportingPeriodId: searchParams.get('period') ?? reportingPeriodId,
    sector: searchParams.get('sector') ?? '',
    province: searchParams.get('province') ?? '',
  }
  const setFilter = (patch: Partial<PmoFilter>) => {
    const next = new URLSearchParams(searchParams)
    const merged = { ...filter, ...patch }
    if (merged.reportingPeriodId) {
      next.set('period', merged.reportingPeriodId)
      setReportingPeriodId(merged.reportingPeriodId)
    }
    if (merged.sector) next.set('sector', merged.sector)
    else next.delete('sector')
    if (merged.province) next.set('province', merged.province)
    else next.delete('province')
    setSearchParams(next)
  }
  return [filter, setFilter]
}

function PmoFilters({
  filter,
  setFilter,
  options,
}: {
  filter: PmoFilter
  setFilter: (patch: Partial<PmoFilter>) => void
  options: {
    sectors: string[]
    provinces: string[]
    periods: Array<{ id: string; label: string }>
  }
}) {
  return (
    <div className="mb-3 grid gap-2 sm:grid-cols-3">
      <SelectField
        label="Reporting period"
        value={filter.reportingPeriodId ?? ''}
        onChange={(e) => setFilter({ reportingPeriodId: e.target.value })}
        options={options.periods.map((p) => ({ value: p.id, label: p.label }))}
      />
      <SelectField
        label="Sector"
        value={filter.sector ?? ''}
        onChange={(e) => setFilter({ sector: e.target.value })}
        options={[
          { value: '', label: 'All sectors' },
          ...options.sectors.map((s) => ({ value: s, label: s })),
        ]}
      />
      <SelectField
        label="Province"
        value={filter.province ?? ''}
        onChange={(e) => setFilter({ province: e.target.value })}
        options={[
          { value: '', label: 'All provinces' },
          ...options.provinces.map((p) => ({ value: p, label: p })),
        ]}
      />
    </div>
  )
}

function IndicatorCard({ item }: { item: PmoStrategicIndicator }) {
  return (
    <div className="rounded-card border border-soe-border bg-white p-4 shadow-[var(--shadow-sm)]">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-soe-slate">
          {item.label}
        </p>
        <Tooltip content={item.definition}>
          <button
            type="button"
            className="text-[11px] text-soe-blue underline"
            aria-label={`Definition: ${item.label}`}
          >
            Def.
          </button>
        </Tooltip>
      </div>
      <p className="mt-2 text-[28px] font-semibold leading-none text-soe-navy tabular-nums">
        {item.value}
      </p>
      <p className="mt-2 text-xs text-soe-slate">
        {item.period} · {item.trendLabel}
      </p>
      <Link className={cn(linkClass, 'mt-2 inline-block')} to={item.route}>
        Drill down
      </Link>
    </div>
  )
}

export function PmoNationalOverviewPage() {
  const [filter, setFilter] = usePmoFilter()
  const options = useQuery({
    queryKey: ['pmo-filter-options'],
    queryFn: () => mockPmoPortalService.getFilterOptions(),
  })
  const overview = useQuery({
    queryKey: ['pmo-overview', filter],
    queryFn: () => mockPmoPortalService.getNationalOverview(filter),
  })
  const indicators = useQuery({
    queryKey: ['pmo-indicators-home', filter],
    queryFn: () => mockPmoPortalService.getStrategicIndicators(filter),
  })

  if (overview.isLoading || options.isLoading) {
    return <LoadingBlock label="Loading national overview…" />
  }
  if (overview.isError || !overview.data || !options.data) {
    return <ErrorState title="Unable to load national overview" />
  }

  const o = overview.data
  const periodLabel =
    options.data.periods.find((p) => p.id === o.reportingPeriodId)?.label ?? o.reportingPeriodId

  return (
    <RequirePermission permission={PERMISSION.EXECUTIVE_DASHBOARD_READ}>
      <div>
        <PageHeader
          title="National overview"
          subtitle={`PMO strategic government view · ${periodLabel} · as of ${o.asOf} · read-only`}
        />
        <PmoFilters filter={filter} setFilter={setFilter} options={options.data} />

        <div className="mb-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <KpiLink to="/pmo/capital" label="SOEs" value={String(o.soeCount)} />
          <KpiLink
            to="/pmo/capital"
            label="Gov. capital employed"
            value={formatCurrencyPkr(o.governmentCapitalEmployed)}
            period="Provisional definition"
          />
          <KpiLink
            to="/pmo/land-bank"
            label="Aggregate assets (market)"
            value={formatCurrencyPkr(o.aggregateAssetMarketValue)}
          />
          <KpiLink
            to="/pmo/fiscal-burden"
            label="Debt (component)"
            value={formatCurrencyPkr(o.fiscalBurdenComponents.debt)}
            period="Not a combined fiscal score"
          />
        </div>
        <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <KpiLink
            to="/pmo/employment-exports"
            label="Employment"
            value={o.employment.toLocaleString('en-PK')}
          />
          <KpiLink
            to="/pmo/industrial"
            label="Industrial output"
            value={o.industrialOutput.toLocaleString('en-PK')}
            period="Actual production units"
          />
          <KpiLink
            to="/pmo/employment-exports"
            label="Export contribution"
            value={formatCurrencyPkr(o.exportContribution)}
          />
          <KpiLink
            to="/pmo/privatization"
            label="Privatization pipeline"
            value={String(o.privatizationPipelineCount)}
          />
        </div>

        <p className="mb-2 text-xs text-soe-slate">{o.governmentCapitalDefinition}</p>
        <p className="mb-4 text-xs text-soe-slate">{o.fiscalBurdenNote}</p>

        <Card title="Strategic indicators" subtitle="Limited set · definition on each card">
          {indicators.isLoading ? <LoadingBlock label="Loading indicators…" /> : null}
          {indicators.data ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {indicators.data.slice(0, 8).map((item) => (
                <IndicatorCard key={item.id} item={item} />
              ))}
            </div>
          ) : null}
          <Link className={cn(linkClass, 'mt-3 inline-block')} to="/pmo/indicators">
            All strategic indicators
          </Link>
        </Card>
      </div>
    </RequirePermission>
  )
}

export function PmoGovernmentCapitalPage() {
  const [filter, setFilter] = usePmoFilter()
  const [searchParams] = useSearchParams()
  const soe = searchParams.get('soe')
  const options = useQuery({
    queryKey: ['pmo-filter-options'],
    queryFn: () => mockPmoPortalService.getFilterOptions(),
  })
  const capital = useQuery({
    queryKey: ['pmo-capital', filter],
    queryFn: () => mockPmoPortalService.getGovernmentCapital(filter),
  })

  const soeCols = useMemo<
    ColumnDef<
      {
        abbreviation: string
        sector: string
        governmentCapital: number
        profitOrLoss: number
        debt: number
        route: string
      },
      unknown
    >[]
  >(
    () => [
      {
        accessorKey: 'abbreviation',
        header: 'SOE',
        cell: ({ row }) => (
          <Link className={linkClass} to={row.original.route}>
            {row.original.abbreviation}
          </Link>
        ),
      },
      { accessorKey: 'sector', header: 'Sector' },
      {
        accessorKey: 'governmentCapital',
        header: 'Gov. capital',
        cell: ({ getValue }) => formatCurrencyPkr(Number(getValue())),
      },
      {
        accessorKey: 'profitOrLoss',
        header: 'P/L',
        cell: ({ getValue }) => formatCurrencyPkr(Number(getValue())),
      },
      {
        accessorKey: 'debt',
        header: 'Debt',
        cell: ({ getValue }) => formatCurrencyPkr(Number(getValue())),
      },
    ],
    [],
  )

  return (
    <RequirePermission permission={PERMISSION.PORTFOLIO_READ}>
      <div>
        <PageHeader
          title="Government capital"
          subtitle="National capital employed · sector / SOE breakdown · provisional definition"
        />
        {options.data ? (
          <PmoFilters filter={filter} setFilter={setFilter} options={options.data} />
        ) : null}
        {capital.isLoading ? <LoadingBlock label="Loading government capital…" /> : null}
        {capital.isError ? <ErrorState title="Unable to load government capital" /> : null}
        {capital.data ? (
          <>
            <div className="mb-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <KpiValue
                label="Gov. capital employed"
                value={formatCurrencyPkr(capital.data.governmentCapitalEmployed)}
                period="Provisional"
                className="p-3 [&_p:nth-child(2)]:text-xl"
              />
              <KpiValue
                label="Return on capital"
                value={
                  capital.data.returnOnCapitalPct == null
                    ? '—'
                    : `${capital.data.returnOnCapitalPct.toFixed(1)}%`
                }
                period="Provisional P/L ÷ capital"
                className="p-3 [&_p:nth-child(2)]:text-xl"
              />
              <KpiValue
                label="Sectors"
                value={String(capital.data.bySector.length)}
                className="p-3 [&_p:nth-child(2)]:text-xl"
              />
            </div>
            <p className="mb-3 text-xs text-soe-slate">{capital.data.definition}</p>
            <p className="mb-4 text-xs text-soe-slate">{capital.data.returnDefinition}</p>

            <ChartContainer
              title="Capital and P/L trend"
              subtitle="Answers: how has national capital posture moved?"
              isEmpty={capital.data.trend.length === 0}
              summary="Five-year capital stock vs portfolio P/L"
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={capital.data.trend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <RechartsTooltip />
                  <Line
                    type="monotone"
                    dataKey="capital"
                    name="Capital"
                    stroke="#1B4F72"
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="profitOrLoss"
                    name="P/L"
                    stroke="#148F77"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>

            <Card title="By sector" className="mt-4 mb-4">
              <DataTable
                data={capital.data.bySector}
                columns={[
                  { accessorKey: 'sector', header: 'Sector' },
                  { accessorKey: 'soeCount', header: 'SOEs' },
                  {
                    accessorKey: 'governmentCapital',
                    header: 'Gov. capital',
                    cell: ({ getValue }) => formatCurrencyPkr(Number(getValue())),
                  },
                  {
                    accessorKey: 'debt',
                    header: 'Debt',
                    cell: ({ getValue }) => formatCurrencyPkr(Number(getValue())),
                  },
                ]}
                density="compact"
                showSearch={false}
              />
            </Card>

            <Card title="By SOE">
              <DataTable
                data={
                  soe
                    ? capital.data.bySoe.filter((r) => r.organizationId === soe)
                    : capital.data.bySoe
                }
                columns={soeCols}
                density="compact"
                showSearch={false}
              />
            </Card>
          </>
        ) : null}
      </div>
    </RequirePermission>
  )
}

export function PmoFiscalBurdenPage() {
  const [filter, setFilter] = usePmoFilter()
  const options = useQuery({
    queryKey: ['pmo-filter-options'],
    queryFn: () => mockPmoPortalService.getFilterOptions(),
  })
  const burden = useQuery({
    queryKey: ['pmo-fiscal-burden', filter],
    queryFn: () => mockPmoPortalService.getFiscalBurden(filter),
  })
  const contingent = useQuery({
    queryKey: ['pmo-contingent', filter],
    queryFn: () => mockPmoPortalService.getContingentLiabilities(filter),
  })

  return (
    <RequirePermission permission={PERMISSION.FINANCE_READ}>
      <div>
        <PageHeader
          title="Fiscal burden"
          subtitle="Separate components · contingent liabilities distinct · provisional"
        />
        {options.data ? (
          <PmoFilters filter={filter} setFilter={setFilter} options={options.data} />
        ) : null}
        {burden.isLoading ? <LoadingBlock label="Loading fiscal burden…" /> : null}
        {burden.data ? (
          <>
            <div className="mb-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <KpiValue
                label="Subsidies"
                value={formatCurrencyPkr(burden.data.subsidies)}
                period="Actual expenditure proxy"
                className="p-3 [&_p:nth-child(2)]:text-xl"
              />
              <KpiValue
                label="Debt"
                value={formatCurrencyPkr(burden.data.debt)}
                className="p-3 [&_p:nth-child(2)]:text-xl"
              />
              <KpiValue
                label="Guarantees"
                value={formatCurrencyPkr(burden.data.guarantees)}
                period="Contingent"
                className="p-3 [&_p:nth-child(2)]:text-xl"
              />
              <KpiValue
                label="Losses"
                value={formatCurrencyPkr(burden.data.losses)}
                className="p-3 [&_p:nth-child(2)]:text-xl"
              />
            </div>
            <p className="mb-4 text-xs text-soe-slate">{burden.data.note}</p>

            <ChartContainer
              title="Fiscal component trend"
              subtitle="Answers: which burden components are rising?"
              isEmpty={burden.data.trend.length === 0}
              summary="Subsidies, debt, losses, guarantees over time"
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={burden.data.trend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <RechartsTooltip />
                  <Line type="monotone" dataKey="subsidies" name="Subsidies" stroke="#1B4F72" />
                  <Line type="monotone" dataKey="debt" name="Debt" stroke="#C0392B" />
                  <Line type="monotone" dataKey="guarantees" name="Guarantees" stroke="#148F77" />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>

            <Card title="By sector" className="mt-4 mb-4">
              <DataTable
                data={burden.data.bySector}
                columns={[
                  { accessorKey: 'sector', header: 'Sector' },
                  {
                    accessorKey: 'subsidies',
                    header: 'Subsidies',
                    cell: ({ getValue }) => formatCurrencyPkr(Number(getValue())),
                  },
                  {
                    accessorKey: 'debt',
                    header: 'Debt',
                    cell: ({ getValue }) => formatCurrencyPkr(Number(getValue())),
                  },
                  {
                    accessorKey: 'guarantees',
                    header: 'Guarantees',
                    cell: ({ getValue }) => formatCurrencyPkr(Number(getValue())),
                  },
                  {
                    accessorKey: 'losses',
                    header: 'Losses',
                    cell: ({ getValue }) => formatCurrencyPkr(Number(getValue())),
                  },
                ]}
                density="compact"
                showSearch={false}
              />
            </Card>
          </>
        ) : null}

        <Card title="Contingent liabilities">
          {contingent.isLoading ? <LoadingBlock label="Loading contingent liabilities…" /> : null}
          {contingent.data ? (
            <>
              <div className="mb-3 grid gap-3 sm:grid-cols-3">
                <KpiValue
                  label="Guarantee exposure"
                  value={formatCurrencyPkr(contingent.data.guaranteeExposure)}
                  className="p-3 [&_p:nth-child(2)]:text-xl"
                />
                <KpiValue
                  label="Debt (separate)"
                  value={formatCurrencyPkr(contingent.data.debt)}
                  className="p-3 [&_p:nth-child(2)]:text-xl"
                />
                <KpiValue
                  label="Subsidies (expenditure)"
                  value={formatCurrencyPkr(contingent.data.actualExpenditureProxy)}
                  className="p-3 [&_p:nth-child(2)]:text-xl"
                />
              </div>
              <p className="mb-3 text-xs text-soe-slate">{contingent.data.distinctionNote}</p>
              {contingent.data.bySoe.length ? (
                <DataTable
                  data={contingent.data.bySoe}
                  columns={[
                    { accessorKey: 'abbreviation', header: 'SOE' },
                    {
                      accessorKey: 'guarantees',
                      header: 'Guarantees',
                      cell: ({ getValue }) => formatCurrencyPkr(Number(getValue())),
                    },
                    {
                      accessorKey: 'debt',
                      header: 'Debt',
                      cell: ({ getValue }) => formatCurrencyPkr(Number(getValue())),
                    },
                    {
                      accessorKey: 'subsidies',
                      header: 'Subsidies',
                      cell: ({ getValue }) => formatCurrencyPkr(Number(getValue())),
                    },
                  ]}
                  density="compact"
                  showSearch={false}
                />
              ) : (
                <EmptyState title="No contingent exposure in filter" />
              )}
            </>
          ) : null}
        </Card>
      </div>
    </RequirePermission>
  )
}

export function PmoLandBankPage() {
  const [filter, setFilter] = usePmoFilter()
  const options = useQuery({
    queryKey: ['pmo-filter-options'],
    queryFn: () => mockPmoPortalService.getFilterOptions(),
  })
  const land = useQuery({
    queryKey: ['pmo-land-bank', filter],
    queryFn: () => mockPmoPortalService.getLandBank(filter),
  })
  const market = useQuery({
    queryKey: ['pmo-market-book', filter],
    queryFn: () => mockPmoPortalService.getMarketVsBook(filter),
  })

  return (
    <RequirePermission permission={PERMISSION.ASSETS_READ}>
      <div>
        <PageHeader
          title="Asset & land bank"
          subtitle="National land bank · market vs book · GIS decision-support map"
          actions={
            <Link className="text-sm text-soe-blue underline" to="/pmo/map">
              Open National Asset Map
            </Link>
          }
        />
        {options.data ? (
          <PmoFilters filter={filter} setFilter={setFilter} options={options.data} />
        ) : null}
        {land.isLoading || market.isLoading ? (
          <LoadingBlock label="Loading land bank…" />
        ) : null}
        {land.data ? (
          <>
            <div className="mb-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <KpiValue
                label="Total land area"
                value={`${land.data.totalLandAreaAcres.toFixed(0)} ac`}
                period={`${land.data.parcelCount} parcels`}
                className="p-3 [&_p:nth-child(2)]:text-xl"
              />
              <KpiValue
                label="Industrial land"
                value={`${land.data.industrialLandAcres.toFixed(0)} ac`}
                className="p-3 [&_p:nth-child(2)]:text-xl"
              />
              <KpiValue
                label="Vacant / unused"
                value={`${land.data.vacantUnusedAcres.toFixed(0)} ac`}
                className="p-3 [&_p:nth-child(2)]:text-xl"
              />
              <KpiValue
                label="Unencumbered (prov.)"
                value={`${land.data.unencumberedAcres.toFixed(0)} ac`}
                className="p-3 [&_p:nth-child(2)]:text-xl"
              />
            </div>
            <p className="mb-2 text-xs text-soe-slate">{land.data.unencumberedDefinition}</p>
            <p className="mb-4 text-xs text-soe-slate">{land.data.gisNote}</p>

            <Card title="Market value vs book value" className="mb-4">
              {market.data ? (
                <>
                  <div className="mb-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <KpiValue
                      label="Book value"
                      value={formatCurrencyPkr(market.data.aggregateBookValue)}
                      className="p-3 [&_p:nth-child(2)]:text-xl"
                    />
                    <KpiValue
                      label="Market value"
                      value={formatCurrencyPkr(market.data.aggregateMarketValue)}
                      className="p-3 [&_p:nth-child(2)]:text-xl"
                    />
                    <KpiValue
                      label="Variance"
                      value={formatCurrencyPkr(market.data.variance)}
                      className="p-3 [&_p:nth-child(2)]:text-xl"
                    />
                    <KpiValue
                      label="Missing valuation"
                      value={String(market.data.assetsWithoutValuation)}
                      className="p-3 [&_p:nth-child(2)]:text-xl"
                    />
                  </div>
                  <DataTable
                    data={market.data.bySector}
                    columns={[
                      { accessorKey: 'sector', header: 'Sector' },
                      {
                        accessorKey: 'bookValue',
                        header: 'Book',
                        cell: ({ getValue }) => formatCurrencyPkr(Number(getValue())),
                      },
                      {
                        accessorKey: 'marketValue',
                        header: 'Market',
                        cell: ({ getValue }) => formatCurrencyPkr(Number(getValue())),
                      },
                      {
                        accessorKey: 'variance',
                        header: 'Variance',
                        cell: ({ getValue }) => formatCurrencyPkr(Number(getValue())),
                      },
                    ]}
                    density="compact"
                    showSearch={false}
                  />
                </>
              ) : null}
            </Card>

            <Card title="Land by province">
              {land.data.byProvince.length ? (
                <>
                  <ChartContainer
                    title="Province land area"
                    subtitle="Answers: where is the land bank concentrated?"
                    isEmpty={land.data.byProvince.length === 0}
                    summary="Acres by province"
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={land.data.byProvince.slice(0, 8)}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="province" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <RechartsTooltip />
                        <Bar dataKey="acres" name="Acres" fill="#1B4F72" />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                  <DataTable
                    data={land.data.byProvince}
                    columns={[
                      { accessorKey: 'province', header: 'Province' },
                      {
                        accessorKey: 'acres',
                        header: 'Acres',
                        cell: ({ getValue }) => Number(getValue()).toFixed(0),
                      },
                      { accessorKey: 'parcelCount', header: 'Parcels' },
                      {
                        accessorKey: 'marketValue',
                        header: 'Market value',
                        cell: ({ getValue }) => formatCurrencyPkr(Number(getValue())),
                      },
                    ]}
                    density="compact"
                    showSearch={false}
                  />
                </>
              ) : (
                <EmptyState title="No land parcels in filter" />
              )}
            </Card>
          </>
        ) : null}
      </div>
    </RequirePermission>
  )
}

export function PmoIndustrialContributionPage() {
  const [filter, setFilter] = usePmoFilter()
  const options = useQuery({
    queryKey: ['pmo-filter-options'],
    queryFn: () => mockPmoPortalService.getFilterOptions(),
  })
  const industrial = useQuery({
    queryKey: ['pmo-industrial', filter],
    queryFn: () => mockPmoPortalService.getEmploymentIndustrial(filter),
  })

  return (
    <RequirePermission permission={PERMISSION.FINANCE_READ}>
      <div>
        <PageHeader
          title="Industrial contribution"
          subtitle="National production and capacity · sector breakdown"
        />
        {options.data ? (
          <PmoFilters filter={filter} setFilter={setFilter} options={options.data} />
        ) : null}
        {industrial.isLoading ? <LoadingBlock label="Loading industrial contribution…" /> : null}
        {industrial.data ? (
          <>
            <div className="mb-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <KpiValue
                label="Industrial production"
                value={industrial.data.industrialProduction.toLocaleString('en-PK')}
                className="p-3 [&_p:nth-child(2)]:text-xl"
              />
              <KpiValue
                label="Capacity utilization"
                value={
                  industrial.data.capacityUtilization == null
                    ? '—'
                    : `${industrial.data.capacityUtilization.toFixed(0)}%`
                }
                className="p-3 [&_p:nth-child(2)]:text-xl"
              />
              <KpiValue
                label="Domestic sales"
                value={formatCurrencyPkr(industrial.data.domesticSales)}
                className="p-3 [&_p:nth-child(2)]:text-xl"
              />
              <KpiValue
                label="Exports"
                value={formatCurrencyPkr(industrial.data.exportContribution)}
                className="p-3 [&_p:nth-child(2)]:text-xl"
              />
            </div>
            <ChartContainer
              title="Production by sector"
              subtitle="Answers: which sectors drive output?"
              isEmpty={industrial.data.bySector.length === 0}
              summary="Actual production by sector"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={industrial.data.bySector.slice(0, 8)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="sector" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <RechartsTooltip />
                  <Bar dataKey="production" name="Production" fill="#1B4F72" />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
            <Card title="Sector breakdown" className="mt-4">
              <DataTable
                data={industrial.data.bySector}
                columns={[
                  { accessorKey: 'sector', header: 'Sector' },
                  {
                    accessorKey: 'production',
                    header: 'Production',
                    cell: ({ getValue }) => Number(getValue()).toLocaleString('en-PK'),
                  },
                  {
                    accessorKey: 'exports',
                    header: 'Exports',
                    cell: ({ getValue }) => formatCurrencyPkr(Number(getValue())),
                  },
                  {
                    accessorKey: 'capacityUtilization',
                    header: 'Cap. util.',
                    cell: ({ getValue }) =>
                      getValue() == null ? '—' : `${Number(getValue()).toFixed(0)}%`,
                  },
                ]}
                density="compact"
                showSearch={false}
              />
            </Card>
          </>
        ) : null}
      </div>
    </RequirePermission>
  )
}

export function PmoEmploymentExportsPage() {
  const [filter, setFilter] = usePmoFilter()
  const options = useQuery({
    queryKey: ['pmo-filter-options'],
    queryFn: () => mockPmoPortalService.getFilterOptions(),
  })
  const data = useQuery({
    queryKey: ['pmo-employment-exports', filter],
    queryFn: () => mockPmoPortalService.getEmploymentIndustrial(filter),
  })

  return (
    <RequirePermission permission={PERMISSION.EXECUTIVE_DASHBOARD_READ}>
      <div>
        <PageHeader
          title="Employment & exports"
          subtitle="National employment and export contribution"
        />
        {options.data ? (
          <PmoFilters filter={filter} setFilter={setFilter} options={options.data} />
        ) : null}
        {data.isLoading ? <LoadingBlock label="Loading employment & exports…" /> : null}
        {data.isError ? <ErrorState title="Unable to load employment & exports" /> : null}
        {data.data ? (
          <>
            <div className="mb-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <KpiValue
                label="Total employment"
                value={data.data.totalEmployment.toLocaleString('en-PK')}
                period="Workforce / industrial max"
                className="p-3 [&_p:nth-child(2)]:text-xl"
              />
              <KpiValue
                label="Workforce headcount"
                value={data.data.workforceHeadcount.toLocaleString('en-PK')}
                className="p-3 [&_p:nth-child(2)]:text-xl"
              />
              <KpiValue
                label="Industrial employment"
                value={data.data.industrialEmployment.toLocaleString('en-PK')}
                className="p-3 [&_p:nth-child(2)]:text-xl"
              />
              <KpiValue
                label="Export contribution"
                value={formatCurrencyPkr(data.data.exportContribution)}
                className="p-3 [&_p:nth-child(2)]:text-xl"
              />
            </div>
            <Card title="By sector">
              <DataTable
                data={data.data.bySector}
                columns={[
                  { accessorKey: 'sector', header: 'Sector' },
                  {
                    accessorKey: 'employment',
                    header: 'Employment',
                    cell: ({ getValue }) => Number(getValue()).toLocaleString('en-PK'),
                  },
                  {
                    accessorKey: 'exports',
                    header: 'Exports',
                    cell: ({ getValue }) => formatCurrencyPkr(Number(getValue())),
                  },
                ]}
                density="compact"
                showSearch={false}
              />
            </Card>
          </>
        ) : null}
      </div>
    </RequirePermission>
  )
}

export function PmoPrivatizationPotentialPage() {
  const [filter, setFilter] = usePmoFilter()
  const options = useQuery({
    queryKey: ['pmo-filter-options'],
    queryFn: () => mockPmoPortalService.getFilterOptions(),
  })
  const priv = useQuery({
    queryKey: ['pmo-privatization', filter],
    queryFn: () => mockPmoPortalService.getPrivatizationPotential(filter),
  })

  return (
    <RequirePermission permission={PERMISSION.ACCOUNTABILITY_READ}>
      <div>
        <PageHeader
          title="Privatization potential"
          subtitle="Pipeline stages · blocked cases · no speculative proceeds"
        />
        {options.data ? (
          <PmoFilters filter={filter} setFilter={setFilter} options={options.data} />
        ) : null}
        {priv.isLoading ? <LoadingBlock label="Loading privatization potential…" /> : null}
        {priv.data ? (
          <>
            <div className="mb-3 grid gap-3 sm:grid-cols-3">
              <KpiValue
                label="In pipeline"
                value={String(priv.data.pipelineCount)}
                className="p-3 [&_p:nth-child(2)]:text-xl"
              />
              <KpiValue
                label="Blocked"
                value={String(priv.data.blockedCount)}
                className="p-3 [&_p:nth-child(2)]:text-xl"
              />
              <KpiValue
                label="Completed milestones"
                value={String(priv.data.completedMilestones)}
                className="p-3 [&_p:nth-child(2)]:text-xl"
              />
            </div>
            <p className="mb-4 text-xs text-soe-slate">{priv.data.potentialValueNote}</p>
            <Card title="Pipeline cases">
              {priv.data.cases.length ? (
                <DataTable
                  data={priv.data.cases}
                  columns={[
                    { accessorKey: 'organizationLabel', header: 'SOE' },
                    { accessorKey: 'sector', header: 'Sector' },
                    { accessorKey: 'stage', header: 'Stage' },
                    { accessorKey: 'status', header: 'Status' },
                    {
                      accessorKey: 'blocker',
                      header: 'Blocker',
                      cell: ({ getValue }) => String(getValue() ?? '—'),
                    },
                  ]}
                  density="compact"
                  showSearch={false}
                />
              ) : (
                <EmptyState title="No privatization cases in filter" />
              )}
            </Card>
          </>
        ) : null}
      </div>
    </RequirePermission>
  )
}

export function PmoStrategicIndicatorsPage() {
  const [filter, setFilter] = usePmoFilter()
  const options = useQuery({
    queryKey: ['pmo-filter-options'],
    queryFn: () => mockPmoPortalService.getFilterOptions(),
  })
  const indicators = useQuery({
    queryKey: ['pmo-indicators', filter],
    queryFn: () => mockPmoPortalService.getStrategicIndicators(filter),
  })

  return (
    <RequirePermission permission={PERMISSION.EXECUTIVE_DASHBOARD_READ}>
      <div>
        <PageHeader
          title="Strategic indicators"
          subtitle="National cards · definition · period · trend · drill-down"
        />
        {options.data ? (
          <PmoFilters filter={filter} setFilter={setFilter} options={options.data} />
        ) : null}
        {indicators.isLoading ? <LoadingBlock label="Loading indicators…" /> : null}
        {indicators.isError ? <ErrorState title="Unable to load strategic indicators" /> : null}
        {indicators.data?.length ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {indicators.data.map((item) => (
              <IndicatorCard key={item.id} item={item} />
            ))}
          </div>
        ) : indicators.data ? (
          <EmptyState title="No indicators for filter" />
        ) : null}
      </div>
    </RequirePermission>
  )
}
