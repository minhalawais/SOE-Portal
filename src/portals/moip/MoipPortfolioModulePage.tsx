import { useQuery } from '@tanstack/react-query'
import { BarChart3, Database, FileCheck2, Filter } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/design-system/components/Card'
import { SelectField, TextField } from '@/design-system/components/Fields'
import { EmptyState, ErrorState, LoadingBlock } from '@/design-system/components/Feedback'
import { KpiCard } from '@/design-system/components/KpiCard'
import { StatusBadge } from '@/design-system/components/StatusBadge'
import { SUBMISSION_STATUS_LABEL, type ModuleId, type SubmissionStatus } from '@/constants'
import { mockModuleReviewService, mockOrganizationService } from '@/mock-services'
import { reportingPeriods } from '@/mock-data'
import { REPORTING_MODULES } from '@/workflow/moduleCatalog'

export function MoipPortfolioModulePage() {
  const { moduleId = '' } = useParams()
  const moduleDef = REPORTING_MODULES.find((item) => item.id === moduleId)
  const [organizationId, setOrganizationId] = useState('')
  const [reportingPeriodId, setReportingPeriodId] = useState('period-fy2027')
  const [dataState, setDataState] = useState<'approved' | 'submitted' | 'all'>('approved')
  const [search, setSearch] = useState('')

  const organizations = useQuery({
    queryKey: ['organizations', 'moip-module-filters'],
    queryFn: () => mockOrganizationService.getOrganizations({ pageSize: 200 }),
  })
  const query = useQuery({
    queryKey: ['moip-portfolio-module', moduleId, organizationId, reportingPeriodId, dataState],
    queryFn: () => mockModuleReviewService.getPortfolioModule({
      moduleId: moduleId as ModuleId,
      organizationId: organizationId || undefined,
      reportingPeriodId: reportingPeriodId || undefined,
      dataState,
    }),
    enabled: Boolean(moduleDef),
  })

  const visibleRecords = useMemo(() => {
    const needle = search.trim().toLowerCase()
    if (!needle) return query.data?.records ?? []
    return (query.data?.records ?? []).filter((record) =>
      [record.organization.name, record.organization.abbreviation, record.section, record.title, ...record.fields.map((field) => `${field.label} ${field.value}`)]
        .join(' ')
        .toLowerCase()
        .includes(needle),
    )
  }, [query.data?.records, search])

  if (!moduleDef) return <ErrorState title="Unknown reporting module" />

  const totalEvidence = (query.data?.rows ?? []).reduce((sum, row) => sum + row.evidenceCount, 0)
  const totalBlocking = (query.data?.rows ?? []).reduce((sum, row) => sum + row.blocking, 0)

  return (
    <div>
      <PageHeader
        title={`${moduleDef.label} portfolio`}
        subtitle="Collective submitted data across all SOEs with financial-year and approval-state control"
      />

      <section className="mb-4 border-y border-soe-border bg-white px-4 py-3">
        <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase text-soe-slate"><Filter size={14} />Portfolio scope</div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <SelectField
            label="SOE"
            value={organizationId}
            options={[{ value: '', label: 'All SOEs' }, ...(organizations.data?.items ?? []).map((organization) => ({ value: organization.id, label: `${organization.abbreviation} · ${organization.name}` }))]}
            onChange={(event) => setOrganizationId(event.target.value)}
          />
          <SelectField
            label="Financial year"
            value={reportingPeriodId}
            options={[{ value: '', label: 'All financial years' }, ...reportingPeriods.filter((period) => period.type === 'annual').map((period) => ({ value: period.id, label: period.label }))]}
            onChange={(event) => setReportingPeriodId(event.target.value)}
          />
          <SelectField
            label="Data state"
            value={dataState}
            options={[
              { value: 'approved', label: 'Approved / locked only' },
              { value: 'submitted', label: 'All submitted states' },
              { value: 'all', label: 'All submitted versions' },
            ]}
            onChange={(event) => setDataState(event.target.value as typeof dataState)}
          />
          <TextField label="Search submitted records" value={search} placeholder="Record, field or SOE" onChange={(event) => setSearch(event.target.value)} />
        </div>
      </section>

      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="SOE submissions" value={String(query.data?.rows.length ?? 0)} />
        <KpiCard label="Submitted records" value={String(query.data?.records.length ?? 0)} />
        <KpiCard label="Evidence items" value={String(totalEvidence)} />
        <KpiCard label="Blocking findings" value={String(totalBlocking)} />
      </div>

      {query.isLoading ? <LoadingBlock label={`Loading ${moduleDef.label.toLowerCase()} portfolio…`} /> : query.isError ? <ErrorState title="Unable to load portfolio data" /> : (
        <div className="space-y-4">
          <Card title="SOE submission coverage" actions={<BarChart3 size={18} className="text-soe-blue" />}>
            {query.data?.rows.length ? <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead><tr className="border-b border-soe-border text-xs uppercase text-soe-slate"><th className="py-2">SOE</th><th>Status</th><th>Period</th><th>Completeness</th><th>Records</th><th>Evidence</th><th>Review</th></tr></thead><tbody>{query.data.rows.map((row) => <tr key={row.submission.id} className="border-b border-soe-border last:border-0"><td className="py-2.5"><p className="font-medium text-soe-navy">{row.organization.abbreviation}</p><p className="text-xs text-soe-slate">{row.organization.name}</p></td><td><StatusBadge status={row.submission.status} family="reporting" label={SUBMISSION_STATUS_LABEL[row.submission.status as SubmissionStatus]} /></td><td>{reportingPeriods.find((period) => period.id === row.submission.reportingPeriodId)?.label ?? row.submission.reportingPeriodId}</td><td>{row.submission.completeness}%</td><td>{row.recordCount}</td><td>{row.evidenceCount}</td><td><Link className="text-soe-blue hover:underline" to={`/moip/submissions/${row.submission.id}`}>Open submission</Link></td></tr>)}</tbody></table></div> : <EmptyState title="No submissions match this scope" hint="Change the data-state or financial-year filter to inspect other submissions." />}
          </Card>

          <Card title="Submitted records" actions={<Database size={18} className="text-soe-teal" />}>
            {visibleRecords.length ? <div className="divide-y divide-soe-border">{visibleRecords.map((record) => <details key={`${record.submissionId}-${record.section}-${record.id}`} className="group py-1"><summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 text-sm"><div><span className="font-semibold text-soe-navy">{record.organization.abbreviation}</span><span className="mx-2 text-soe-border">|</span><span>{record.title}</span><span className="ml-2 text-xs text-soe-slate">{record.section}</span></div><FileCheck2 size={16} className="shrink-0 text-soe-slate" /></summary><dl className="grid bg-soe-canvas sm:grid-cols-2 lg:grid-cols-4">{record.fields.map((field) => <div key={field.key} className="border-b border-r border-soe-border px-3 py-2"><dt className="text-[10px] font-semibold uppercase text-soe-slate">{field.label}</dt><dd className="mt-1 break-words text-xs text-soe-ink">{field.value}</dd></div>)}</dl></details>)}</div> : <EmptyState title="No records match the current filters" />}
          </Card>
        </div>
      )}
    </div>
  )
}
