import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { useEffect, useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
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
import { PageHeader } from '@/components/layout/PageHeader'
import { ContributorModuleLayout, EntryFormSection, EntryFormShell, ExecutiveModuleSectionNav, RegistryTabBar } from '@/components/soe'
import { DataTable } from '@/components/tables/DataTable'
import { Button } from '@/design-system/components/Button'
import { Card } from '@/design-system/components/Card'
import { ChartContainer } from '@/design-system/components/ChartContainer'
import { EmptyState, ErrorState, LoadingBlock, Alert } from '@/design-system/components/Feedback'
import { CurrencyField, PkrAmountInput, TextField } from '@/design-system/components/Fields'
import { KpiCard } from '@/design-system/components/KpiCard'
import { StatusBadge } from '@/design-system/components/StatusBadge'
import { RequirePermission } from '@/app/router/guards'
import {
  AUDIT_STATUS_LABEL,
  LENDER_CATEGORY_LABEL,
  LOAN_GUARANTEE_STATUS_LABEL,
  LOAN_REPAYMENT_STATUS_LABEL,
  MODULE,
  type LenderCategoryConst,
} from '@/constants'
import {
  mockFinanceService,
  mockFiscalExposureService,
  mockGrantService,
  mockIndustrialService,
  mockLoanService,
  mockOrganizationService,
} from '@/mock-services'
import { hasPermission, PERMISSION } from '@/permissions'
import { useSessionStore } from '@/state/session'
import { useUiStore } from '@/state/ui'
import type {
  BudgetLine,
  Grant,
  Guarantee,
  IndustrialPerformance,
  Loan,
  LoanRepayment,
} from '@/types/domain'
import { AppError, cn, formatCurrencyPkr } from '@/utils'
import { useGrantEntry, useBudgetLineEntry, useLoanEntry } from '@/portals/shared/financeEntryForms'
import {
  calcBudgetVariance,
  formatPct,
  formatRatio,
  getKpiDefinition,
  KPI_IDS,
} from '@/workflow/financeKpis'

type PortalMode = 'soe' | 'moip' | 'minister'

type IndustrialDraft = Pick<
  IndustrialPerformance,
  | 'installedCapacity'
  | 'actualProduction'
  | 'exports'
  | 'imports'
  | 'domesticSales'
  | 'employment'
  | 'energyConsumption'
  | 'energyUnit'
  | 'carbonEmissions'
  | 'carbonUnit'
  | 'capacityUnit'
>

const linkClass = 'text-sm text-soe-blue underline'
const inputClass =
  'h-9 w-full rounded-md border border-soe-border bg-white px-2.5 text-sm disabled:bg-[var(--color-pending-soft)]'

function periodLabel(id: string, periods: Array<{ id: string; label: string }>) {
  return periods.find((p) => p.id === id)?.label ?? id
}

export function FinancePerformancePage() {
  return (
    <RequirePermission permission={PERMISSION.FINANCE_READ}>
      <FinancePerformanceContent />
    </RequirePermission>
  )
}

function FinancePerformanceContent() {
  const organizationId = useSessionStore((s) => s.organizationId)
  const reportingPeriodId = useSessionStore((s) => s.reportingPeriodId)
  const query = useQuery({
    queryKey: ['finance-intel', organizationId, reportingPeriodId],
    queryFn: () => mockFinanceService.getIntelligence(organizationId, reportingPeriodId),
  })
  const org = useQuery({
    queryKey: ['org', organizationId],
    queryFn: () => mockOrganizationService.getOrganization(organizationId),
  })

  if (query.isLoading) return <LoadingBlock label="Loading financial performance…" />
  if (query.isError || !query.data) {
    return (
      <ErrorState
        title="Unable to load performance"
        detail="Check organization and reporting period. Quarterly periods may lack annual ratios."
      />
    )
  }

  const { current, history, periods, ratios, yoy, consecutiveLossYears } = query.data
  const chartData = history.map((h) => ({
    period: periodLabel(h.reportingPeriodId, periods),
    revenue: h.revenue,
    opex: h.operatingExpenses,
    capex: h.capex,
    profit: h.profitOrLoss,
    subsidy: h.subsidies,
  }))

  return (
    <div>
      <PageHeader
        title="Financial performance"
        subtitle={`${org.data?.abbreviation ?? 'SOE'} · dummy demonstration data · ratios provisional`}
      />
      {consecutiveLossYears >= 3 ? (
        <Alert
          tone="critical"
          title={`${consecutiveLossYears} consecutive loss years (through selected period)`}
          className="mb-3"
        />
      ) : consecutiveLossYears > 0 ? (
        <Alert
          tone="warning"
          title={`${consecutiveLossYears} consecutive loss year(s)`}
          className="mb-3"
        />
      ) : null}

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <KpiCard
          label="Annual budget"
          value={formatCurrencyPkr(current.annualBudget ?? 0)}
          period={yoy.revenue == null ? undefined : `Revenue YoY ${formatPct(yoy.revenue)}`}
        />
        <KpiCard
          label="Revenue"
          value={formatCurrencyPkr(current.revenue)}
          period={yoy.revenue == null ? undefined : `YoY ${formatPct(yoy.revenue)}`}
        />
        <KpiCard label="OPEX" value={formatCurrencyPkr(current.operatingExpenses)} />
        <KpiCard label="CAPEX" value={formatCurrencyPkr(current.capex)} />
        <KpiCard label="Profit / Loss" value={formatCurrencyPkr(current.profitOrLoss)} />
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <KpiCard label="Cash flow" value={formatCurrencyPkr(current.cashFlow ?? 0)} />
        <KpiCard label="Working capital" value={formatCurrencyPkr(current.workingCapital ?? 0)} />
        <KpiCard label="Receivables" value={formatCurrencyPkr(current.receivables ?? 0)} />
        <KpiCard label="Payables" value={formatCurrencyPkr(current.payables ?? 0)} />
        <KpiCard label="Inventory" value={formatCurrencyPkr(current.inventory ?? 0)} />
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <KpiCard
          label="Current ratio"
          value={formatRatio(ratios.currentRatio)}
          period={getKpiDefinition(KPI_IDS.CURRENT_RATIO)?.formula}
        />
        <KpiCard
          label="Debt ratio"
          value={formatPct(ratios.debtRatio)}
          period={getKpiDefinition(KPI_IDS.DEBT_RATIO)?.formula}
        />
        <KpiCard
          label="ROA"
          value={formatPct(ratios.roa)}
          period={getKpiDefinition(KPI_IDS.ROA)?.formula}
        />
        <KpiCard
          label="ROE"
          value={formatPct(ratios.roe)}
          period={getKpiDefinition(KPI_IDS.ROE)?.formula}
        />
        <KpiCard
          label="Audit status"
          value={AUDIT_STATUS_LABEL[current.auditStatus ?? 'unaudited'] ?? '—'}
        />
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <KpiCard label="Subsidies" value={formatCurrencyPkr(current.subsidies)} />
        <KpiCard
          label="Government support"
          value={formatCurrencyPkr(current.governmentSupport ?? 0)}
        />
        <KpiCard label="Total debt (BS)" value={formatCurrencyPkr(current.totalDebt ?? 0)} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartContainer
          title="Revenue trend"
          subtitle="Available annual history (not a full five years in seed)"
          period="Annual periods"
          isEmpty={chartData.length === 0}
          summary="Line chart of revenue over annual periods"
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid stroke="#DDE3E8" vertical={false} />
              <XAxis dataKey="period" tick={{ fill: '#64748B', fontSize: 11 }} />
              <YAxis tick={{ fill: '#64748B', fontSize: 11 }} width={64} />
              <RechartsTooltip />
              <Line type="monotone" dataKey="revenue" stroke="#1D5D8F" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>

        <ChartContainer
          title="Operating expenditure vs revenue"
          period="Annual periods"
          isEmpty={chartData.length === 0}
          summary="Bar comparison of revenue and operating expenses"
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid stroke="#DDE3E8" vertical={false} />
              <XAxis dataKey="period" tick={{ fill: '#64748B', fontSize: 11 }} />
              <YAxis tick={{ fill: '#64748B', fontSize: 11 }} width={64} />
              <RechartsTooltip />
              <Legend />
              <Bar dataKey="revenue" fill="#1D5D8F" name="Revenue" radius={[2, 2, 0, 0]} />
              <Bar dataKey="opex" fill="#64748B" name="OPEX" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>

        <ChartContainer
          title="CAPEX trend"
          period="Annual periods"
          isEmpty={chartData.length === 0}
          summary="Line chart of CAPEX"
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid stroke="#DDE3E8" vertical={false} />
              <XAxis dataKey="period" tick={{ fill: '#64748B', fontSize: 11 }} />
              <YAxis tick={{ fill: '#64748B', fontSize: 11 }} width={64} />
              <RechartsTooltip />
              <Line type="monotone" dataKey="capex" stroke="#0F766E" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>

        <ChartContainer
          title="Subsidy vs profitability"
          subtitle="Analytical comparison — not causal"
          period="Annual periods"
          isEmpty={chartData.length === 0}
          summary="Subsidy and profit/loss trends"
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid stroke="#DDE3E8" vertical={false} />
              <XAxis dataKey="period" tick={{ fill: '#64748B', fontSize: 11 }} />
              <YAxis tick={{ fill: '#64748B', fontSize: 11 }} width={64} />
              <RechartsTooltip />
              <Legend />
              <Line type="monotone" dataKey="subsidy" stroke="#B45309" name="Subsidy" strokeWidth={2} />
              <Line type="monotone" dataKey="profit" stroke="#1D5D8F" name="P/L" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>
      </div>
    </div>
  )
}

export function FinanceBudgetPage() {
  return (
    <RequirePermission permission={PERMISSION.FINANCE_READ}>
      <FinanceBudgetContent />
    </RequirePermission>
  )
}

function FinanceBudgetContent() {
  const organizationId = useSessionStore((s) => s.organizationId)
  const reportingPeriodId = useSessionStore((s) => s.reportingPeriodId)
  const [searchParams, setSearchParams] = useSearchParams()
  const budgetLineId = searchParams.get('budgetLineId')

  const selectLine = (id: string | null) => {
    const next = new URLSearchParams(searchParams)
    if (id) next.set('budgetLineId', id)
    else next.delete('budgetLineId')
    setSearchParams(next)
  }
  const budgetEntry = useBudgetLineEntry(budgetLineId, organizationId, reportingPeriodId, selectLine)

  const query = useQuery({
    queryKey: ['budget-lines', organizationId, reportingPeriodId],
    queryFn: () => mockFinanceService.getBudgetLines(organizationId, reportingPeriodId),
  })

  const columns = useMemo<ColumnDef<BudgetLine, unknown>[]>(
    () => [
      {
        accessorKey: 'category',
        header: 'Category',
        cell: ({ row }) => (
          <button
            type="button"
            className="text-soe-navy hover:underline"
            onClick={() => selectLine(row.original.id)}
          >
            {row.original.category}
          </button>
        ),
      },
      {
        accessorKey: 'budget',
        header: 'Budget',
        cell: ({ getValue }) => formatCurrencyPkr(Number(getValue())),
      },
      {
        accessorKey: 'actual',
        header: 'Actual',
        cell: ({ getValue }) => formatCurrencyPkr(Number(getValue())),
      },
      {
        id: 'variance',
        header: 'Variance',
        cell: ({ row }) => {
          const { variance, variancePct } = calcBudgetVariance(row.original.budget, row.original.actual)
          return (
            <span>
              {formatCurrencyPkr(variance)}
              <span className="ml-1 text-xs text-soe-slate">({formatPct(variancePct)})</span>
            </span>
          )
        },
      },
    ],
    [selectLine],
  )

  const chartData =
    query.data?.map((r) => ({
      category: r.category,
      budget: r.budget,
      actual: r.actual,
    })) ?? []

  const registryBody = (
    <>
      {query.isLoading ? <LoadingBlock /> : null}
      {query.isError ? <ErrorState title="Unable to load budget lines" /> : null}
      {query.data && query.data.length === 0 ? (
        <EmptyState title="No budget lines for this period" />
      ) : null}
      {query.data && query.data.length > 0 ? (
        <>
          <DataTable
            data={query.data}
            columns={columns}
            density="compact"
            showSearch={false}
            selectedRowId={budgetLineId}
            getRowId={(r) => r.id}
          />
          <ChartContainer
            title="Budget vs actual"
            isEmpty={chartData.length === 0}
            summary="Bar chart comparing budget and actual by category"
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid stroke="#DDE3E8" vertical={false} />
                <XAxis dataKey="category" tick={{ fill: '#64748B', fontSize: 10 }} />
                <YAxis tick={{ fill: '#64748B', fontSize: 11 }} width={64} />
                <RechartsTooltip />
                <Legend />
                <Bar dataKey="budget" fill="#64748B" name="Budget" radius={[2, 2, 0, 0]} />
                <Bar dataKey="actual" fill="#1D5D8F" name="Actual" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </>
      ) : null}
    </>
  )

  return (
    <ContributorModuleLayout
      moduleId={MODULE.FINANCE}
      title="Annual budget"
      entry={budgetEntry.entry}
      onSave={budgetEntry.onSave}
      onCancel={budgetEntry.onCancel}
      saving={budgetEntry.saving}
      saveDisabled={budgetEntry.saveDisabled}
      showFormActions={budgetEntry.showFormActions}
      saveLabel={budgetEntry.saveLabel}
      cancelLabel="Clear form"
      actions={
        budgetLineId ? (
          <Button size="sm" variant="secondary" onClick={() => selectLine(null)}>
            Add new
          </Button>
        ) : null
      }
      registryTitle="Budget lines"
      registry={registryBody}
    />
  )
}

export function FinanceStatementsPage() {
  return (
    <RequirePermission permission={PERMISSION.FINANCE_READ}>
      <div>
        <PageHeader
          title="Financial statement evidence"
          subtitle="Metadata placeholders — no real file storage"
        />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            'Balance Sheet',
            'Income Statement',
            'Cash Flow Statement',
            'Notes to Accounts',
            'Audit Report',
          ].map((title) => (
            <Card key={title} title={title}>
              <p className="text-sm text-soe-slate">Status: placeholder metadata</p>
              <p className="mt-1 text-xs text-soe-slate">Upload handled through reporting form evidence.</p>
              <Link className={cn(linkClass, 'mt-2 inline-block')} to="/soe/finance/form">
                Open financial form
              </Link>
            </Card>
          ))}
        </div>
      </div>
    </RequirePermission>
  )
}

export function FinanceExposurePage() {
  return (
    <RequirePermission permission={PERMISSION.FINANCE_READ}>
      <FinanceExposureContent portal="soe" />
    </RequirePermission>
  )
}

function FinanceExposureContent({ portal }: { portal: PortalMode }) {
  const organizationId = useSessionStore((s) => s.organizationId)
  const reportingPeriodId = useSessionStore((s) => s.reportingPeriodId)
  const scopedOrg = portal === 'soe' ? organizationId : undefined

  const exposure = useQuery({
    queryKey: ['fiscal-exposure', scopedOrg, reportingPeriodId],
    queryFn: () =>
      mockFiscalExposureService.getExposureSummary(scopedOrg, reportingPeriodId),
  })
  const loans = useQuery({
    queryKey: ['loans', scopedOrg ?? 'all'],
    queryFn: () => mockLoanService.getLoans(scopedOrg),
  })
  const grants = useQuery({
    queryKey: ['grants', scopedOrg ?? 'all'],
    queryFn: () => mockGrantService.getGrants(scopedOrg),
  })
  const guarantees = useQuery({
    queryKey: ['guarantees', scopedOrg ?? 'all'],
    queryFn: () => mockGrantService.getGuarantees(scopedOrg),
  })

  if (exposure.isLoading) return <LoadingBlock label="Loading exposure…" />
  if (exposure.isError || !exposure.data) {
    return <ErrorState title="Unable to load government exposure" />
  }

  const e = exposure.data

  return (
    <div>
      <PageHeader
        title={portal === 'soe' ? 'Government exposure' : 'Fiscal exposure'}
        subtitle="Prototype aggregation — methodology not formally approved · demo data"
      />
      <Alert tone="info" title="Prototype aggregation — not formally approved methodology" className="mb-3" />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <KpiCard label="Total borrowings" value={formatCurrencyPkr(e.totalBorrowings)} />
        <KpiCard label="Outstanding loans" value={formatCurrencyPkr(e.outstandingLoans)} />
        <KpiCard label="Guarantees (exposure)" value={formatCurrencyPkr(e.guarantees)} />
        <KpiCard label="Subsidies (period)" value={formatCurrencyPkr(e.subsidies)} />
        <KpiCard label="Grants (committed)" value={formatCurrencyPkr(e.grants)} />
        <KpiCard
          label="Persistent loss years (max)"
          value={String(e.persistentLossYears)}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Guarantees">
          {guarantees.data?.length ? (
            <ul className="space-y-2 text-sm">
              {guarantees.data.slice(0, 8).map((g: Guarantee) => (
                <li key={g.id} className="flex justify-between gap-2 border-b border-soe-border py-1.5">
                  <span>
                    {g.reference}
                    {g.relatedLoanId ? (
                      <span className="block text-xs text-soe-slate">Loan {g.relatedLoanId}</span>
                    ) : null}
                  </span>
                  <span>{formatCurrencyPkr(g.exposure)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="No guarantees" />
          )}
        </Card>
        <Card title="Grants">
          {grants.data?.length ? (
            <ul className="space-y-2 text-sm">
              {grants.data.map((g: Grant) => (
                <li key={g.id} className="border-b border-soe-border py-1.5">
                  <div className="flex justify-between gap-2">
                    <span>{g.source}</span>
                    <span>{formatCurrencyPkr(g.amount)}</span>
                  </div>
                  <p className="text-xs text-soe-slate">
                    {g.project ?? '—'} · Utilized {formatCurrencyPkr(g.utilized)} · Remaining{' '}
                    {formatCurrencyPkr(g.remaining)}
                    {g.completionPct != null ? ` · ${g.completionPct}% complete` : ''}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="No grants for this SOE" />
          )}
        </Card>
      </div>

      {portal === 'soe' && loans.data ? (
        <p className="mt-3 text-sm">
          <Link className={linkClass} to="/soe/finance/loans">
            Open loan registry ({loans.data.length})
          </Link>
        </p>
      ) : null}
    </div>
  )
}

export function FinanceComparePage() {
  return (
    <RequirePermission permission={PERMISSION.FINANCE_READ}>
      <FinanceCompareContent />
    </RequirePermission>
  )
}

function FinanceCompareContent() {
  const organizationId = useSessionStore((s) => s.organizationId)
  const periodsQ = useQuery({
    queryKey: ['reporting-periods'],
    queryFn: () => mockFinanceService.getReportingPeriods(),
  })
  const annualIds =
    periodsQ.data?.filter((p) => p.type === 'annual').map((p) => p.id) ?? []

  const compare = useQuery({
    queryKey: ['finance-compare', organizationId, annualIds.join(',')],
    enabled: annualIds.length >= 2,
    queryFn: () => mockFinanceService.getComparison(organizationId, annualIds),
  })

  return (
    <div>
      <PageHeader
        title="Period comparison"
        subtitle="Cross-period metrics · dummy demonstration data"
      />
      {compare.isLoading || periodsQ.isLoading ? <LoadingBlock /> : null}
      {compare.isError ? <ErrorState title="Unable to build comparison" /> : null}
      {compare.data ? (
        <div className="overflow-x-auto rounded-card border border-soe-border bg-white">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-soe-border text-xs text-soe-slate">
                <th className="px-3 py-2 font-medium">Metric</th>
                {compare.data.periods.map((p) => (
                  <th key={p.id} className="px-3 py-2 font-medium">
                    {p.label}
                  </th>
                ))}
                <th className="px-3 py-2 font-medium">Change</th>
              </tr>
            </thead>
            <tbody>
              {compare.data.rows.map((row) => (
                <tr key={row.metric} className="border-b border-soe-border">
                  <td className="px-3 py-2">{row.metric}</td>
                  {compare.data.periods.map((p) => {
                    const v = row.values[p.id]
                    const isUtil = row.metric.includes('Utilization')
                    return (
                      <td key={p.id} className="px-3 py-2 tabular-nums">
                        {v == null ? '—' : isUtil ? formatPct(v) : formatCurrencyPkr(v)}
                      </td>
                    )
                  })}
                  <td className="px-3 py-2 tabular-nums">{formatPct(row.changePct)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  )
}

export function LoansRegistryWorkspace({ portal = 'soe' }: { portal?: PortalMode }) {
  const organizationId = useSessionStore((s) => s.organizationId)
  const scoped = portal === 'soe' ? organizationId : undefined
  const [searchParams, setSearchParams] = useSearchParams()
  const registryTab = (searchParams.get('tab') ?? 'loans') as 'loans' | 'grants'
  const loanId = searchParams.get('loanId')
  const grantId = searchParams.get('grantId')

  const selectRecord = (param: string, id: string | null) => {
    const next = new URLSearchParams(searchParams)
    if (id) next.set(param, id)
    else next.delete(param)
    setSearchParams(next)
  }
  const loanEntry = useLoanEntry(
    portal === 'soe' && registryTab === 'loans' ? loanId : null,
    organizationId,
    (id) => selectRecord('loanId', id),
  )
  const grantEntry = useGrantEntry(
    portal === 'soe' && registryTab === 'grants' ? grantId : null,
    organizationId,
    (id) => selectRecord('grantId', id),
  )

  const loans = useQuery({
    queryKey: ['loans-registry', scoped ?? 'all'],
    queryFn: () => mockLoanService.getLoans(scoped),
  })
  const grants = useQuery({
    queryKey: ['grants-registry', scoped ?? 'all'],
    queryFn: () => mockGrantService.getGrants(scoped),
  })

  const detailBase =
    portal === 'moip' ? '/moip/finance/loans' : portal === 'minister' ? '/minister/fiscal/loans' : '/soe/finance/loans'

  const selectLoan = (id: string) => selectRecord('loanId', id)
  const selectGrant = (id: string) => selectRecord('grantId', id)

  const columns = useMemo<ColumnDef<Loan, unknown>[]>(
    () => [
      {
        accessorKey: 'id',
        header: 'Loan ID',
        cell: ({ row }) =>
          portal === 'soe' ? (
            <button
              type="button"
              className="text-soe-navy hover:underline"
              onClick={() => selectLoan(row.original.id)}
            >
              {row.original.id}
            </button>
          ) : (
            <Link className={linkClass} to={`${detailBase}/${row.original.id}`}>
              {row.original.id}
            </Link>
          ),
      },
      { accessorKey: 'lender', header: 'Lender' },
      {
        accessorKey: 'lenderCategory',
        header: 'Category',
        cell: ({ getValue }) =>
          LENDER_CATEGORY_LABEL[getValue() as LenderCategoryConst] ?? String(getValue()),
      },
      { accessorKey: 'loanType', header: 'Type' },
      {
        accessorKey: 'principal',
        header: 'Amount',
        cell: ({ getValue }) => formatCurrencyPkr(Number(getValue())),
      },
      {
        accessorKey: 'interestRate',
        header: 'Interest %',
        cell: ({ getValue }) => `${getValue()}%`,
      },
      {
        accessorKey: 'outstanding',
        header: 'Outstanding',
        cell: ({ getValue }) => formatCurrencyPkr(Number(getValue())),
      },
      { accessorKey: 'nextDueDate', header: 'Next repayment' },
      {
        accessorKey: 'repaymentStatus',
        header: 'Repayment',
        cell: ({ getValue }) => (
          <StatusBadge
            status={String(getValue()) === 'overdue' ? 'overdue' : 'in_progress'}
            family="reporting"
            label={LOAN_REPAYMENT_STATUS_LABEL[String(getValue())] ?? String(getValue())}
          />
        ),
      },
      {
        accessorKey: 'guaranteeStatus',
        header: 'Guarantee',
        cell: ({ getValue }) =>
          LOAN_GUARANTEE_STATUS_LABEL[String(getValue())] ?? String(getValue()),
      },
      { accessorKey: 'defaultStatus', header: 'Default' },
    ],
    [detailBase, portal, selectLoan],
  )

  const grantColumns = useMemo<ColumnDef<Grant, unknown>[]>(
    () => [
      {
        accessorKey: 'source',
        header: 'Source',
        cell: ({ row }) =>
          portal === 'soe' ? (
            <button
              type="button"
              className="text-soe-navy hover:underline"
              onClick={() => selectGrant(row.original.id)}
            >
              {row.original.source}
            </button>
          ) : (
            row.original.source
          ),
      },
      { accessorKey: 'project', header: 'Project' },
      {
        accessorKey: 'amount',
        header: 'Amount',
        cell: ({ getValue }) => formatCurrencyPkr(Number(getValue())),
      },
      {
        accessorKey: 'utilized',
        header: 'Utilized',
        cell: ({ getValue }) => formatCurrencyPkr(Number(getValue())),
      },
      { accessorKey: 'status', header: 'Status' },
    ],
    [portal, selectGrant],
  )

  const tabFilters = (
    <RegistryTabBar
      tabs={[
        { id: 'loans' as const, label: 'Loans' },
        { id: 'grants' as const, label: 'Grants & subsidies' },
      ]}
      active={registryTab}
      onChange={(id) => {
        const next = new URLSearchParams(searchParams)
        next.set('tab', id)
        next.delete('loanId')
        next.delete('grantId')
        setSearchParams(next)
      }}
    />
  )

  const loansRegistry = (
    <>
      {loans.isLoading ? <LoadingBlock label="Loading loans…" /> : null}
      {loans.isError ? <ErrorState title="Unable to load loans" /> : null}
      {loans.data?.length ? (
        <DataTable
          data={loans.data}
          columns={columns}
          density="compact"
          selectedRowId={portal === 'soe' ? loanId : null}
          getRowId={(r) => r.id}
        />
      ) : loans.data ? (
        <EmptyState title="No loans" />
      ) : null}
    </>
  )

  const grantsRegistry = (
    <>
      {grants.isLoading ? <LoadingBlock label="Loading grants…" /> : null}
      {grants.data?.length ? (
        <DataTable
          data={grants.data}
          columns={grantColumns}
          density="compact"
          selectedRowId={portal === 'soe' ? grantId : null}
          getRowId={(r) => r.id}
        />
      ) : grants.data ? (
        <EmptyState title="No grants" />
      ) : null}
    </>
  )

  if (portal === 'soe') {
    const activeEntry = registryTab === 'grants' ? grantEntry : loanEntry
    return (
      <RequirePermission permission={PERMISSION.FINANCE_READ}>
        <ContributorModuleLayout
          moduleId={MODULE.LOANS}
          title="Loans & grants"
          sectionNav={<ExecutiveModuleSectionNav moduleId="soe-finance" />}
          entry={activeEntry.entry}
          onSave={activeEntry.onSave}
          onCancel={activeEntry.onCancel}
          saving={activeEntry.saving}
          saveDisabled={activeEntry.saveDisabled}
          showFormActions={activeEntry.showFormActions}
          saveLabel={activeEntry.saveLabel}
          cancelLabel="Clear form"
          actions={
            registryTab === 'loans' && loanId ? (
              <Button size="sm" variant="secondary" onClick={() => selectRecord('loanId', null)}>
                Add new
              </Button>
            ) : registryTab === 'grants' && grantId ? (
              <Button size="sm" variant="secondary" onClick={() => selectRecord('grantId', null)}>
                Add new
              </Button>
            ) : null
          }
          registryTitle={registryTab === 'grants' ? 'Grants registry' : 'Loans registry'}
          filters={tabFilters}
          registry={registryTab === 'grants' ? grantsRegistry : loansRegistry}
        />
      </RequirePermission>
    )
  }

  return (
    <RequirePermission permission={PERMISSION.FINANCE_READ}>
      <div>
        <PageHeader
          title="Loans & grants"
          subtitle="Debt registry · dummy demonstration data"
        />
        {loans.isLoading ? <LoadingBlock label="Loading loans…" /> : null}
        {loans.isError ? <ErrorState title="Unable to load loans" /> : null}
        {loans.data ? (
          <DataTable data={loans.data} columns={columns} density="compact" />
        ) : null}

        <Card title="Grants & subsidies" className="mt-4">
          {grants.data?.length ? (
            <ul className="space-y-2 text-sm">
              {grants.data.map((g) => (
                <li key={g.id} className="flex flex-wrap justify-between gap-2 border-b border-soe-border py-1.5">
                  <span>
                    {g.source}
                    {g.project ? <span className="block text-xs text-soe-slate">{g.project}</span> : null}
                  </span>
                  <span className="tabular-nums">
                    {formatCurrencyPkr(g.utilized)} / {formatCurrencyPkr(g.amount)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="No grants" />
          )}
        </Card>
      </div>
    </RequirePermission>
  )
}

export function LoanDetailWorkspace({ portal = 'soe' }: { portal?: PortalMode }) {
  const { loanId } = useParams<{ loanId: string }>()
  const role = useSessionStore((s) => s.role)
  const canEdit = portal === 'soe' && hasPermission(role, PERMISSION.FINANCE_EDIT)
  const qc = useQueryClient()
  const pushToast = useUiStore((s) => s.pushToast)
  const back =
    portal === 'moip'
      ? '/moip/finance'
      : portal === 'minister'
        ? '/minister/fiscal'
        : '/soe/finance/loans'

  const loan = useQuery({
    queryKey: ['loan', loanId],
    enabled: Boolean(loanId),
    queryFn: () => mockLoanService.getLoan(loanId!),
  })
  const repayments = useQuery({
    queryKey: ['loan-repay', loanId],
    enabled: Boolean(loanId),
    queryFn: () => mockLoanService.getRepayments(loanId!),
  })
  const guarantees = useQuery({
    queryKey: ['loan-guar', loan.data?.organizationId],
    enabled: Boolean(loan.data),
    queryFn: () => mockGrantService.getGuarantees(loan.data!.organizationId),
  })
  const [draft, setDraft] = useState<Loan | null>(null)
  useEffect(() => {
    if (loan.data) setDraft(loan.data)
  }, [loan.data])
  const save = useMutation({
    mutationFn: () => {
      if (!draft) throw new AppError('Nothing to save', 'VALIDATION')
      return mockLoanService.updateLoan(draft.id, draft)
    },
    onSuccess: (next) => {
      void qc.invalidateQueries({ queryKey: ['loan', loanId] })
      void qc.invalidateQueries({ queryKey: ['loans-registry'] })
      setDraft(next)
      pushToast({ title: 'Loan record saved.', tone: 'success' })
    },
    onError: (err: unknown) => {
      pushToast({
        title: err instanceof AppError ? err.message : 'Loan update failed',
        tone: 'critical',
      })
    },
  })

  const repayCols = useMemo<ColumnDef<LoanRepayment, unknown>[]>(
    () => [
      { accessorKey: 'dueDate', header: 'Due date' },
      {
        accessorKey: 'amountDue',
        header: 'Amount due',
        cell: ({ getValue }) => formatCurrencyPkr(Number(getValue())),
      },
      {
        accessorKey: 'amountPaid',
        header: 'Paid',
        cell: ({ getValue }) => formatCurrencyPkr(Number(getValue())),
      },
      { accessorKey: 'status', header: 'Status' },
    ],
    [],
  )

  if (loan.isLoading) return <LoadingBlock label="Loading loan…" />
  if (loan.isError || !loan.data) {
    return <ErrorState title="Loan not found" detail="Check the loan identifier." />
  }

  const l = loan.data
  const linkedGuar = guarantees.data?.find((g) => g.id === l.relatedGuaranteeId)

  return (
    <RequirePermission permission={PERMISSION.FINANCE_READ}>
      <div>
        <PageHeader
          title={l.id}
          subtitle={`${l.lender} · ${LENDER_CATEGORY_LABEL[l.lenderCategory]} · demo data`}
          actions={
            <Link className={cn('text-sm text-soe-blue underline')} to={back}>
              Back to registry
            </Link>
          }
        />

        {portal !== 'soe' ? (
          <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard label="Principal" value={formatCurrencyPkr(l.principal)} />
            <KpiCard label="Outstanding" value={formatCurrencyPkr(l.outstanding)} />
            <KpiCard label="Interest" value={`${l.interestRate}%`} />
            <KpiCard label="Next due" value={l.nextDueDate} />
          </div>
        ) : null}

        {canEdit && draft ? (
          <Card title="Modify current data" className="mb-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <label className="block text-sm">
                <span className="mb-1 block text-xs font-semibold text-soe-slate">Lender</span>
                <input className={inputClass} value={draft.lender} onChange={(e) => setDraft({ ...draft, lender: e.target.value })} />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-xs font-semibold text-soe-slate">Loan type</span>
                <input className={inputClass} value={draft.loanType} onChange={(e) => setDraft({ ...draft, loanType: e.target.value })} />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-xs font-semibold text-soe-slate">Principal PKR</span>
                <PkrAmountInput className={inputClass} min={0} value={draft.principal} onChange={(e) => setDraft({ ...draft, principal: Number(e.target.value) })} />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-xs font-semibold text-soe-slate">Outstanding PKR</span>
                <PkrAmountInput className={inputClass} min={0} value={draft.outstanding} onChange={(e) => setDraft({ ...draft, outstanding: Number(e.target.value) })} />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-xs font-semibold text-soe-slate">Interest %</span>
                <input
                  className={inputClass}
                  min={0}
                  type="number"
                  value={draft.interestRate === 0 ? '' : draft.interestRate}
                  onChange={(e) => setDraft({ ...draft, interestRate: Number(e.target.value) })}
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-xs font-semibold text-soe-slate">Next due</span>
                <input className={inputClass} type="date" value={draft.nextDueDate} onChange={(e) => setDraft({ ...draft, nextDueDate: e.target.value })} />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-xs font-semibold text-soe-slate">Repayment status</span>
                <select className={inputClass} value={draft.repaymentStatus} onChange={(e) => setDraft({ ...draft, repaymentStatus: e.target.value as Loan['repaymentStatus'] })}>
                  {Object.entries(LOAN_REPAYMENT_STATUS_LABEL).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-xs font-semibold text-soe-slate">Default status</span>
                <input className={inputClass} value={draft.defaultStatus} onChange={(e) => setDraft({ ...draft, defaultStatus: e.target.value })} />
              </label>
            </div>
            <Button className="mt-3" size="sm" loading={save.isPending} onClick={() => save.mutate()}>
              Save loan
            </Button>
          </Card>
        ) : null}

        <div className="mb-4 grid gap-4 lg:grid-cols-2">
          <Card title="Terms">
            <dl className="space-y-1 text-sm">
              <div className="flex justify-between">
                <dt>Type</dt>
                <dd>{l.loanType}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Repayment status</dt>
                <dd>{LOAN_REPAYMENT_STATUS_LABEL[l.repaymentStatus]}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Default</dt>
                <dd>{l.defaultStatus}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Guarantee</dt>
                <dd>{LOAN_GUARANTEE_STATUS_LABEL[l.guaranteeStatus]}</dd>
              </div>
            </dl>
          </Card>
          <Card title="Guarantee & documents">
            {linkedGuar ? (
              <dl className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <dt>Reference</dt>
                  <dd>{linkedGuar.reference}</dd>
                </div>
                <div className="flex justify-between">
                  <dt>Exposure</dt>
                  <dd>{formatCurrencyPkr(linkedGuar.exposure)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt>Guarantor</dt>
                  <dd>{linkedGuar.guarantor}</dd>
                </div>
              </dl>
            ) : (
              <p className="text-sm text-soe-slate">No linked guarantee.</p>
            )}
            <p className="mt-3 text-xs text-soe-slate">
              Document metadata placeholder — evidence linked via Documents module in later phases.
            </p>
          </Card>
        </div>

        <Card title="Repayment schedule">
          {repayments.isLoading ? <LoadingBlock /> : null}
          {repayments.data ? (
            <DataTable data={repayments.data} columns={repayCols} density="compact" showSearch={false} />
          ) : null}
        </Card>
      </div>
    </RequirePermission>
  )
}

export function IndustrialWorkspacePage({ portal = 'soe' }: { portal?: PortalMode }) {
  const organizationId = useSessionStore((s) => s.organizationId)
  const reportingPeriodId = useSessionStore((s) => s.reportingPeriodId)
  const role = useSessionStore((s) => s.role)
  const canEdit = portal === 'soe' && hasPermission(role, PERMISSION.INDUSTRIAL_EDIT)
  const pushToast = useUiStore((s) => s.pushToast)
  const qc = useQueryClient()

  const rowQ = useQuery({
    queryKey: ['industrial-row', organizationId, reportingPeriodId],
    queryFn: () => mockIndustrialService.getPerformanceRow(organizationId, reportingPeriodId),
  })
  const histQ = useQuery({
    queryKey: ['industrial-hist', organizationId],
    queryFn: () => mockIndustrialService.getHistory(organizationId),
  })
  const finQ = useQuery({
    queryKey: ['finance-intel-cross', organizationId, reportingPeriodId],
    queryFn: () => mockFinanceService.getIntelligence(organizationId, reportingPeriodId),
  })

  const [draft, setDraft] = useState<IndustrialDraft | null>(null)

  const save = useMutation({
    mutationFn: () => {
      if (!rowQ.data || !draft) throw new AppError('Nothing to save', 'VALIDATION')
      return mockIndustrialService.updatePerformance(rowQ.data.id, draft)
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['industrial-row'] })
      void qc.invalidateQueries({ queryKey: ['industrial-hist'] })
      pushToast({ title: 'Industrial draft saved.', tone: 'success' })
      setDraft(null)
    },
    onError: (err: unknown) => {
      pushToast({
        title: err instanceof AppError ? err.message : 'Save failed',
        tone: 'critical',
      })
    },
  })

  if (rowQ.isLoading) return <LoadingBlock label="Loading industrial performance…" />
  if (rowQ.isError || !rowQ.data) {
    return (
      <ErrorState
        title="Industrial data unavailable"
        detail="Select an annual reporting period with industrial fixtures."
      />
    )
  }

  const row = rowQ.data
  const edit: IndustrialDraft = draft ?? (canEdit ? {
    installedCapacity: 0,
    actualProduction: 0,
    exports: 0,
    imports: 0,
    domesticSales: 0,
    employment: 0,
    energyConsumption: 0,
    energyUnit: 'MWh',
    carbonEmissions: 0,
    carbonUnit: 'MT',
    capacityUnit: 'Units',
  } : {
    installedCapacity: row.installedCapacity,
    actualProduction: row.actualProduction,
    exports: row.exports,
    imports: row.imports,
    domesticSales: row.domesticSales,
    employment: row.employment,
    energyConsumption: row.energyConsumption,
    energyUnit: row.energyUnit,
    carbonEmissions: row.carbonEmissions,
    carbonUnit: row.carbonUnit,
    capacityUnit: row.capacityUnit,
  })

  const chartData =
    histQ.data?.map((h) => {
      const fin = finQ.data?.history.find((f) => f.reportingPeriodId === h.reportingPeriodId)
      return {
        period: h.reportingPeriodId.replace('period-', ''),
        utilization: h.capacityUtilization,
        exports: h.exports,
        revenue: fin?.revenue ?? 0,
        profit: fin?.profitOrLoss ?? 0,
      }
    }) ?? []

  if (portal === 'soe') {
    return (
      <RequirePermission permission={PERMISSION.FINANCE_READ}>
        <ContributorModuleLayout
          moduleId={MODULE.INDUSTRIAL}
          title="Industrial performance"
          onSave={canEdit ? () => save.mutate() : undefined}
          saveDisabled={!draft || save.isPending}
          saving={save.isPending}
          saveLabel="Save industrial data"
          showFormActions={canEdit}
          entry={
            <EntryFormShell
              title="Industrial performance"
              subtitle="Period-scoped production, trade and environment data"
              mode={canEdit ? 'edit' : 'view'}
              columns={3}
            >
              <EntryFormSection title="Production" />
                <TextField label="Installed capacity" type="number" min={0} value={edit.installedCapacity} disabled={!canEdit} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDraft({ ...edit, installedCapacity: Number(e.target.value) })} />
                <TextField label="Capacity unit" value={edit.capacityUnit} disabled={!canEdit} onChange={(e) => setDraft({ ...edit, capacityUnit: e.target.value })} />
                <TextField label="Actual production" type="number" min={0} value={edit.actualProduction} disabled={!canEdit} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDraft({ ...edit, actualProduction: Number(e.target.value) })} />
                <TextField label="Employment" type="number" min={0} value={edit.employment} disabled={!canEdit} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDraft({ ...edit, employment: Number(e.target.value) })} />
              <EntryFormSection title="Trade" />
                <CurrencyField label="Exports (PKR)" min={0} value={edit.exports} disabled={!canEdit} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDraft({ ...edit, exports: Number(e.target.value) })} />
                <CurrencyField label="Imports (PKR)" min={0} value={edit.imports} disabled={!canEdit} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDraft({ ...edit, imports: Number(e.target.value) })} />
                <CurrencyField label="Domestic sales (PKR)" min={0} value={edit.domesticSales} disabled={!canEdit} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDraft({ ...edit, domesticSales: Number(e.target.value) })} />
              <EntryFormSection title="Energy & environment" />
                <TextField label="Energy consumption" type="number" min={0} value={edit.energyConsumption} disabled={!canEdit} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDraft({ ...edit, energyConsumption: Number(e.target.value) })} />
                <TextField label="Energy unit" value={edit.energyUnit} disabled={!canEdit} onChange={(e) => setDraft({ ...edit, energyUnit: e.target.value })} />
                <TextField label="Carbon emissions" type="number" min={0} value={edit.carbonEmissions} disabled={!canEdit} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDraft({ ...edit, carbonEmissions: Number(e.target.value) })} />
                <TextField label="Carbon unit" value={edit.carbonUnit} disabled={!canEdit} onChange={(e) => setDraft({ ...edit, carbonUnit: e.target.value })} />
            </EntryFormShell>
          }
        />
      </RequirePermission>
    )
  }

  return (
    <RequirePermission permission={PERMISSION.FINANCE_READ}>
      <div>
        <PageHeader
          title="Industrial performance"
          subtitle="Production, trade, energy · units shown · demo data"
        />

        <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <KpiCard
            label="Installed capacity"
            value={`${row.installedCapacity} ${row.capacityUnit}`}
          />
          <KpiCard
            label="Actual production"
            value={`${row.actualProduction} ${row.capacityUnit}`}
          />
          <KpiCard label="Capacity utilization" value={`${row.capacityUtilization}%`} />
          <KpiCard label="Employment" value={String(row.employment)} />
          <KpiCard
            label="Energy"
            value={`${row.energyConsumption} ${row.energyUnit}`}
          />
        </div>

        <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard label="Exports" value={formatCurrencyPkr(row.exports)} />
          <KpiCard label="Imports" value={formatCurrencyPkr(row.imports)} />
          <KpiCard label="Domestic sales" value={formatCurrencyPkr(row.domesticSales)} />
          <KpiCard
            label="Carbon"
            value={`${row.carbonEmissions} ${row.carbonUnit}`}
            period="Not Scope 1/2/3"
          />
        </div>

        {canEdit ? (
          <Card title="Industrial data entry" subtitle="Save draft · period-scoped">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <label className="text-xs font-medium text-soe-slate">
                Installed capacity
                <input
                  className={cn(inputClass, 'mt-1')}
                  type="number"
                  min={0}
                  value={edit.installedCapacity}
                  onChange={(e) =>
                    setDraft({
                      ...edit,
                      installedCapacity: Number(e.target.value),
                    })
                  }
                />
              </label>
              <label className="text-xs font-medium text-soe-slate">
                Capacity unit
                <input
                  className={cn(inputClass, 'mt-1')}
                  value={edit.capacityUnit}
                  onChange={(e) =>
                    setDraft({
                      ...edit,
                      capacityUnit: e.target.value,
                    })
                  }
                />
              </label>
              <label className="text-xs font-medium text-soe-slate">
                Actual production
                <input
                  className={cn(inputClass, 'mt-1')}
                  type="number"
                  min={0}
                  value={edit.actualProduction}
                  onChange={(e) =>
                    setDraft({
                      ...edit,
                      actualProduction: Number(e.target.value),
                    })
                  }
                />
              </label>
              <label className="text-xs font-medium text-soe-slate">
                Exports
                <PkrAmountInput
                  className={cn(inputClass, 'mt-1')}
                  min={0}
                  value={edit.exports}
                  onChange={(e) =>
                    setDraft({
                      ...edit,
                      exports: Number(e.target.value),
                    })
                  }
                />
              </label>
              <label className="text-xs font-medium text-soe-slate">
                Imports
                <PkrAmountInput
                  className={cn(inputClass, 'mt-1')}
                  min={0}
                  value={edit.imports}
                  onChange={(e) =>
                    setDraft({
                      ...edit,
                      imports: Number(e.target.value),
                    })
                  }
                />
              </label>
              <label className="text-xs font-medium text-soe-slate">
                Domestic sales
                <PkrAmountInput
                  className={cn(inputClass, 'mt-1')}
                  min={0}
                  value={edit.domesticSales}
                  onChange={(e) =>
                    setDraft({
                      ...edit,
                      domesticSales: Number(e.target.value),
                    })
                  }
                />
              </label>
              <label className="text-xs font-medium text-soe-slate">
                Employment
                <input
                  className={cn(inputClass, 'mt-1')}
                  type="number"
                  min={0}
                  value={edit.employment}
                  onChange={(e) =>
                    setDraft({
                      ...edit,
                      employment: Number(e.target.value),
                    })
                  }
                />
              </label>
              <label className="text-xs font-medium text-soe-slate">
                Energy consumption
                <input
                  className={cn(inputClass, 'mt-1')}
                  type="number"
                  min={0}
                  value={edit.energyConsumption}
                  onChange={(e) =>
                    setDraft({
                      ...edit,
                      energyConsumption: Number(e.target.value),
                    })
                  }
                />
              </label>
              <label className="text-xs font-medium text-soe-slate">
                Energy unit
                <input
                  className={cn(inputClass, 'mt-1')}
                  value={edit.energyUnit}
                  onChange={(e) =>
                    setDraft({
                      ...edit,
                      energyUnit: e.target.value,
                    })
                  }
                />
              </label>
              <label className="text-xs font-medium text-soe-slate">
                Carbon emissions
                <input
                  className={cn(inputClass, 'mt-1')}
                  type="number"
                  min={0}
                  value={edit.carbonEmissions}
                  onChange={(e) =>
                    setDraft({
                      ...edit,
                      carbonEmissions: Number(e.target.value),
                    })
                  }
                />
              </label>
              <label className="text-xs font-medium text-soe-slate">
                Carbon unit
                <input
                  className={cn(inputClass, 'mt-1')}
                  value={edit.carbonUnit}
                  onChange={(e) =>
                    setDraft({
                      ...edit,
                      carbonUnit: e.target.value,
                    })
                  }
                />
              </label>
            </div>
            <div className="mt-3">
              <Button
                disabled={save.isPending || !draft}
                onClick={() => save.mutate()}
              >
                Save draft
              </Button>
            </div>
          </Card>
        ) : null}

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <ChartContainer
            title="Capacity vs financial performance"
            subtitle="Analytical comparison — not causal"
            isEmpty={chartData.length === 0}
            summary="Utilization and revenue trends"
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid stroke="#DDE3E8" vertical={false} />
                <XAxis dataKey="period" tick={{ fill: '#64748B', fontSize: 11 }} />
                <YAxis tick={{ fill: '#64748B', fontSize: 11 }} width={56} />
                <RechartsTooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="utilization"
                  name="Utilization %"
                  stroke="#0F766E"
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  name="Revenue"
                  stroke="#1D5D8F"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>

          <ChartContainer
            title="Exports trend"
            isEmpty={chartData.length === 0}
            summary="Exports over annual periods"
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid stroke="#DDE3E8" vertical={false} />
                <XAxis dataKey="period" tick={{ fill: '#64748B', fontSize: 11 }} />
                <YAxis tick={{ fill: '#64748B', fontSize: 11 }} width={56} />
                <RechartsTooltip />
                <Bar dataKey="exports" fill="#1D5D8F" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>

        <p className="mt-3 text-xs text-soe-slate">
          Workforce contribution shown as aggregate employment only — HR detail remains under People
          & Governance.
        </p>
      </div>
    </RequirePermission>
  )
}

export function MoipFinanceIntelligencePage() {
  return (
    <RequirePermission permission={PERMISSION.FINANCE_READ}>
      <MoipFinanceContent />
    </RequirePermission>
  )
}

function MoipFinanceContent() {
  const reportingPeriodId = useSessionStore((s) => s.reportingPeriodId)
  const summary = useQuery({
    queryKey: ['moip-finance-summary', reportingPeriodId],
    queryFn: () => mockFinanceService.getPortfolioFinanceSummary(reportingPeriodId),
  })
  const exposure = useQuery({
    queryKey: ['moip-exposure', reportingPeriodId],
    queryFn: () => mockFiscalExposureService.getPortfolioExposure(reportingPeriodId),
  })

  const columns = useMemo<
    ColumnDef<{
      organizationId: string
      abbreviation: string
      revenue: number
      profitOrLoss: number
      subsidies: number
      totalDebt: number
      status: string
      consecutiveLossYears: number
    }>[]
  >(
    () => [
      { accessorKey: 'abbreviation', header: 'SOE' },
      {
        accessorKey: 'revenue',
        header: 'Revenue',
        cell: ({ getValue }) => formatCurrencyPkr(Number(getValue())),
      },
      {
        accessorKey: 'profitOrLoss',
        header: 'P/L',
        cell: ({ getValue }) => formatCurrencyPkr(Number(getValue())),
      },
      {
        accessorKey: 'subsidies',
        header: 'Subsidy',
        cell: ({ getValue }) => formatCurrencyPkr(Number(getValue())),
      },
      {
        accessorKey: 'totalDebt',
        header: 'Debt',
        cell: ({ getValue }) => formatCurrencyPkr(Number(getValue())),
      },
      {
        accessorKey: 'consecutiveLossYears',
        header: 'Loss yrs',
      },
      { accessorKey: 'status', header: 'Status' },
    ],
    [],
  )

  const lossHeavy = summary.data?.filter((r) => r.consecutiveLossYears >= 3) ?? []
  const highSubsidy = [...(summary.data ?? [])].sort((a, b) => b.subsidies - a.subsidies).slice(0, 5)

  return (
    <div>
      <PageHeader
        title="Financial & fiscal oversight"
        subtitle="Portfolio compare · exception-first · dummy demonstration data"
      />

      {lossHeavy.length ? (
        <Alert
          tone="critical"
          title={`${lossHeavy.length} SOE(s) with 3+ consecutive loss years`}
          className="mb-3"
        />
      ) : null}

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Portfolio subsidies"
          value={formatCurrencyPkr(
            summary.data?.reduce((s, r) => s + r.subsidies, 0) ?? 0,
          )}
        />
        <KpiCard
          label="Portfolio debt"
          value={formatCurrencyPkr(summary.data?.reduce((s, r) => s + r.totalDebt, 0) ?? 0)}
        />
        <KpiCard
          label="Guarantee exposure"
          value={formatCurrencyPkr(
            exposure.data?.reduce((s, r) => s + r.guarantees, 0) ?? 0,
          )}
          period="Prototype methodology"
        />
        <KpiCard label="Loss exceptions" value={String(lossHeavy.length)} />
      </div>

      <Card title="High subsidy (top 5)" className="mb-4">
        <ul className="space-y-1 text-sm">
          {highSubsidy.map((r) => (
            <li key={r.organizationId} className="flex justify-between border-b border-soe-border py-1.5">
              <span>{r.abbreviation}</span>
              <span>{formatCurrencyPkr(r.subsidies)}</span>
            </li>
          ))}
        </ul>
      </Card>

      {summary.isLoading ? <LoadingBlock /> : null}
      {summary.data ? (
        <DataTable data={summary.data} columns={columns} density="compact" />
      ) : null}
    </div>
  )
}

export function MinisterFiscalPage() {
  return (
    <RequirePermission permission={PERMISSION.FINANCE_READ}>
      <MinisterFiscalContent />
    </RequirePermission>
  )
}

function MinisterFiscalContent() {
  const reportingPeriodId = useSessionStore((s) => s.reportingPeriodId)
  const portfolio = useQuery({
    queryKey: ['minister-exposure', reportingPeriodId],
    queryFn: () => mockFiscalExposureService.getPortfolioExposure(reportingPeriodId),
  })
  const summary = useQuery({
    queryKey: ['minister-finance', reportingPeriodId],
    queryFn: () => mockFinanceService.getPortfolioFinanceSummary(reportingPeriodId),
  })

  const chartData =
    portfolio.data
      ?.map((r) => ({
        name: r.abbreviation,
        outstanding: r.outstandingLoans,
        guarantees: r.guarantees,
        subsidies: r.subsidies,
      }))
      .sort((a, b) => b.outstanding + b.guarantees - (a.outstanding + a.guarantees))
      .slice(0, 8) ?? []

  return (
    <div>
      <PageHeader
        title="Fiscal exposure"
        subtitle="Strategic portfolio view · prototype methodology · demo data"
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Outstanding loans"
          value={formatCurrencyPkr(
            portfolio.data?.reduce((s, r) => s + r.outstandingLoans, 0) ?? 0,
          )}
        />
        <KpiCard
          label="Guarantees"
          value={formatCurrencyPkr(portfolio.data?.reduce((s, r) => s + r.guarantees, 0) ?? 0)}
        />
        <KpiCard
          label="Subsidies"
          value={formatCurrencyPkr(portfolio.data?.reduce((s, r) => s + r.subsidies, 0) ?? 0)}
        />
        <KpiCard
          label="Persistent loss SOEs"
          value={String(summary.data?.filter((r) => r.consecutiveLossYears >= 3).length ?? 0)}
        />
      </div>

      <ChartContainer
        title="Fiscal burden by SOE (top 8)"
        subtitle="Outstanding loans and guarantees"
        isEmpty={chartData.length === 0}
        summary="Horizontal comparison of fiscal exposure"
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} layout="vertical" margin={{ left: 40 }}>
            <CartesianGrid stroke="#DDE3E8" horizontal={false} />
            <XAxis type="number" tick={{ fill: '#64748B', fontSize: 11 }} />
            <YAxis
              type="category"
              dataKey="name"
              width={48}
              tick={{ fill: '#64748B', fontSize: 11 }}
            />
            <RechartsTooltip />
            <Legend />
            <Bar dataKey="outstanding" name="Outstanding" fill="#1D5D8F" stackId="a" />
            <Bar dataKey="guarantees" name="Guarantees" fill="#64748B" stackId="a" />
          </BarChart>
        </ResponsiveContainer>
      </ChartContainer>
    </div>
  )
}

export function MinisterIndustrialPage() {
  return (
    <RequirePermission permission={PERMISSION.FINANCE_READ}>
      <MinisterIndustrialContent />
    </RequirePermission>
  )
}

function MinisterIndustrialContent() {
  const reportingPeriodId = useSessionStore((s) => s.reportingPeriodId)
  const rows = useQuery({
    queryKey: ['minister-industrial', reportingPeriodId],
    queryFn: async () => {
      const orgs = await mockOrganizationService.getOrganizations({ pageSize: 50 })
      const perf = await mockIndustrialService.getPerformance(undefined, reportingPeriodId)
      return orgs.items.map((o) => {
        const p = perf.find((i) => i.organizationId === o.id)
        return {
          abbreviation: o.abbreviation,
          utilization: p?.capacityUtilization ?? 0,
          exports: p?.exports ?? 0,
          employment: p?.employment ?? 0,
        }
      })
    },
  })

  const columns = useMemo<
    ColumnDef<{
      abbreviation: string
      utilization: number
      exports: number
      employment: number
    }>[]
  >(
    () => [
      { accessorKey: 'abbreviation', header: 'SOE' },
      {
        accessorKey: 'utilization',
        header: 'Utilization %',
        cell: ({ getValue }) => formatPct(Number(getValue())),
      },
      {
        accessorKey: 'exports',
        header: 'Exports',
        cell: ({ getValue }) => formatCurrencyPkr(Number(getValue())),
      },
      { accessorKey: 'employment', header: 'Employment' },
    ],
    [],
  )

  return (
    <div>
      <PageHeader
        title="Industrial performance"
        subtitle="Portfolio capacity and trade · demo data"
      />
      {rows.isLoading ? <LoadingBlock /> : null}
      {rows.data ? <DataTable data={rows.data} columns={columns} density="compact" /> : null}
    </div>
  )
}
