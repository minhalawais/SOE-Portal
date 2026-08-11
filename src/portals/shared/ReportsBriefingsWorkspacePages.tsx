/**
 * Phase 21 — Report Centre, parameters, preview, mock export.
 * Dense catalogue → parameters → page-like preview. No production PDF engine.
 */
import { useMutation, useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { RequirePermission } from '@/app/router/guards'
import { Button } from '@/design-system/components/Button'
import { Card } from '@/design-system/components/Card'
import { SelectField } from '@/design-system/components/Fields'
import { Alert, EmptyState, ErrorState, LoadingBlock } from '@/design-system/components/Feedback'
import { KpiValue } from '@/design-system/components/KpiCard'
import {
  REPORT_DATA_STATUS_LABEL,
  REPORT_EXPORT_FORMAT,
  REPORT_ID,
  type ReportId,
} from '@/constants'
import { mockReportsService } from '@/mock-services'
import type { ReportParams, ReportSection } from '@/mock-services/reports.service'
import { PERMISSION } from '@/permissions'
import { useSessionStore } from '@/state/session'
import { useUiStore } from '@/state/ui'
import { cn } from '@/utils'
import type { ReportPortal } from '@/workflow/reportCatalogue'

const linkClass = 'text-sm text-soe-blue underline'

function permissionFor(portal: ReportPortal) {
  if (portal === 'soe') return PERMISSION.ORGANIZATION_READ
  if (portal === 'moip') return PERMISSION.PORTFOLIO_READ
  return PERMISSION.EXECUTIVE_DASHBOARD_READ
}

function SectionBlock({ section }: { section: ReportSection }) {
  return (
    <section className="break-inside-avoid border-b border-soe-border py-4 last:border-0">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold text-soe-navy">{section.title}</h3>
        {section.lineageHref ? (
          <Link className={cn(linkClass, 'text-xs print:hidden')} to={section.lineageHref}>
            Open source records
          </Link>
        ) : null}
      </div>
      {section.summary ? (
        <p className="mb-2 text-xs text-soe-slate">{section.summary}</p>
      ) : null}
      {section.empty ? (
        <p className="text-xs text-soe-slate">No data for this section under current parameters.</p>
      ) : null}
      {section.kpis?.length ? (
        <div className="mb-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {section.kpis.map((k) => (
            <div key={k.label} className="rounded-control border border-soe-border px-2.5 py-2">
              <p className="text-[11px] text-soe-slate">{k.label}</p>
              <p className="text-sm font-semibold text-soe-ink">{k.value}</p>
            </div>
          ))}
        </div>
      ) : null}
      {section.bullets?.length ? (
        <ul className="mb-2 list-disc space-y-1 pl-4 text-sm text-soe-ink">
          {section.bullets.map((b) => (
            <li key={b}>{b}</li>
          ))}
        </ul>
      ) : null}
      {section.issues?.length ? (
        <div className="space-y-3">
          {section.issues.map((issue, i) => (
            <div key={i} className="rounded-control border border-soe-border p-3 text-sm">
              <p className="font-medium text-soe-navy">{issue.keyIssue}</p>
              <p className="mt-1 text-xs text-soe-slate">
                <span className="font-medium text-soe-ink">Evidence: </span>
                {issue.evidence}
              </p>
              <p className="mt-1 text-xs text-soe-slate">
                <span className="font-medium text-soe-ink">Strategic implication: </span>
                {issue.strategicImplication}
              </p>
              <p className="mt-1 text-xs italic text-soe-slate">{issue.decisionPlaceholder}</p>
            </div>
          ))}
        </div>
      ) : null}
      {section.columns && section.rows && section.rows.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-soe-slate">
              <tr className="border-b border-soe-border">
                {section.columns.map((c) => (
                  <th key={c} className="py-1.5 pr-3 font-medium">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {section.rows.map((row, i) => (
                <tr key={i} className="border-b border-soe-border/60">
                  {section.columns!.map((c) => (
                    <td key={c} className="py-1.5 pr-3 text-soe-ink">
                      {row[c] == null
                        ? '—'
                        : typeof row[c] === 'number'
                          ? Number(row[c]).toLocaleString('en-PK')
                          : String(row[c])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  )
}

export function ReportsBriefingsWorkspace({
  portal,
  title,
}: {
  portal: ReportPortal
  title: string
}) {
  const organizationId = useSessionStore((s) => s.organizationId)
  const reportingPeriodId = useSessionStore((s) => s.reportingPeriodId)
  const setReportingPeriodId = useSessionStore((s) => s.setReportingPeriodId)
  const pushToast = useUiStore((s) => s.pushToast)
  const [searchParams, setSearchParams] = useSearchParams()

  const reportId = (searchParams.get('report') as ReportId) || ''
  const period = searchParams.get('period') ?? reportingPeriodId
  const soe =
    portal === 'soe' ? organizationId : searchParams.get('soe') ?? ''
  const sector = searchParams.get('sector') ?? ''
  const province = searchParams.get('province') ?? ''
  const approvedOnly = searchParams.get('approvedOnly') === '1'

  const params: ReportParams = {
    reportingPeriodId: period,
    organizationId: soe || undefined,
    sector: sector || undefined,
    province: province || undefined,
    approvedOnly: approvedOnly || undefined,
  }

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams)
    if (value) next.set(key, value)
    else next.delete(key)
    if (key === 'period' && value) setReportingPeriodId(value)
    setSearchParams(next)
  }

  const options = useQuery({
    queryKey: ['report-options', portal, organizationId],
    queryFn: () => mockReportsService.getFilterOptions(portal, organizationId),
  })

  const catalogue = useQuery({
    queryKey: ['report-catalogue', portal, period],
    queryFn: () =>
      mockReportsService.getCatalogueGrouped(portal, { reportingPeriodId: period }),
  })

  const preview = useQuery({
    queryKey: ['report-preview', portal, reportId, params],
    enabled: Boolean(reportId),
    queryFn: () => mockReportsService.getPreview(reportId as ReportId, portal, params),
  })

  const exportMut = useMutation({
    mutationFn: (format: 'pdf' | 'excel') =>
      mockReportsService.exportReport(
        reportId as ReportId,
        format === 'pdf' ? REPORT_EXPORT_FORMAT.PDF : REPORT_EXPORT_FORMAT.EXCEL,
        portal,
        params,
      ),
    onSuccess: (res) => {
      pushToast({ title: res.message, tone: 'info' })
    },
    onError: () => {
      pushToast({ title: 'Demo export failed.', tone: 'critical' })
    },
  })

  const selectedDef = useMemo(() => {
    if (!catalogue.data || !reportId) return undefined
    for (const g of catalogue.data) {
      const hit = g.items.find((i) => i.id === reportId)
      if (hit) return hit
    }
    return undefined
  }, [catalogue.data, reportId])

  const subtitle =
    portal === 'soe'
      ? 'Own-SOE reports · preview + mock export · not production generation'
      : portal === 'minister'
        ? 'Strategic briefs and portfolio reports · concise executive layout'
        : portal === 'pmo'
          ? 'National strategic outputs · no operational controls'
          : portal === 'secretary'
            ? 'Governance and operational briefings · exception-focused'
            : 'Portfolio report catalogue · stakeholder validation previews'

  return (
    <RequirePermission permission={permissionFor(portal)}>
      <div>
        <PageHeader
          title={title}
          subtitle={subtitle}
          actions={
            <span className="rounded-control border border-soe-border px-2 py-1 text-[11px] text-soe-slate">
              Prototype previews
            </span>
          }
        />

        <Alert tone="info" title="Frontend-only report validation" className="mb-3">
          PDF and Excel actions are available for this demo. Previews reconcile to demo fixtures with period and
          data-status labels. Not a production reporting service.
        </Alert>

        {!reportId ? (
          <>
            <Card className="mb-3 p-4">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <SelectField
                  label="Reporting period"
                  value={period}
                  onChange={(e) => setParam('period', e.target.value)}
                  options={
                    options.data?.periods.map((p) => ({ value: p.id, label: p.label })) ?? [
                      { value: period, label: period },
                    ]
                  }
                />
              </div>
            </Card>

            {catalogue.isLoading ? <LoadingBlock label="Loading report catalogue…" /> : null}
            {catalogue.isError ? <ErrorState title="Unable to load report catalogue" /> : null}
            {catalogue.data?.map((group) => (
              <Card
                key={group.group}
                title={group.label}
                subtitle={`${group.items.length} report(s)`}
                className="mb-3"
              >
                <ul className="divide-y divide-soe-border text-sm">
                  {group.items.map((item) => (
                    <li
                      key={item.id}
                      className="flex flex-wrap items-start justify-between gap-3 py-2.5"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-soe-ink">{item.name}</p>
                        <p className="text-xs text-soe-slate">{item.description}</p>
                        <p className="mt-1 text-[11px] text-soe-slate">
                          Audience: {item.audience} · Filters: {item.filterSummary} · Latest:{' '}
                          {item.latestPeriodLabel}
                        </p>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="primary"
                        onClick={() => {
                          const next = new URLSearchParams(searchParams)
                          next.set('report', item.id)
                          next.set('period', period)
                          if (portal === 'soe') next.set('soe', organizationId)
                          else if (item.requiresOrganization && !next.get('soe')) {
                            const first = options.data?.organizations[0]?.id
                            if (first) next.set('soe', first)
                          }
                          setSearchParams(next)
                        }}
                      >
                        Preview
                      </Button>
                    </li>
                  ))}
                </ul>
              </Card>
            ))}
          </>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2 print:hidden">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => {
                  const next = new URLSearchParams(searchParams)
                  next.delete('report')
                  setSearchParams(next)
                }}
              >
                Back to catalogue
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => window.print()}
              >
                Print preview
              </Button>
              <Button
                type="button"
                size="sm"
                variant="primary"
                loading={exportMut.isPending}
                onClick={() => exportMut.mutate('pdf')}
              >
                Export PDF (mock)
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                loading={exportMut.isPending}
                onClick={() => exportMut.mutate('excel')}
              >
                Export Excel (mock)
              </Button>
            </div>

            <Card title="Parameters" subtitle="Only fields meaningful to this report" className="print:hidden">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {selectedDef?.parameters.includes('reportingPeriodId') ? (
                  <SelectField
                    label="Reporting period"
                    value={period}
                    onChange={(e) => setParam('period', e.target.value)}
                    options={
                      options.data?.periods.map((p) => ({ value: p.id, label: p.label })) ?? []
                    }
                  />
                ) : null}
                {selectedDef?.parameters.includes('organizationId') && portal !== 'soe' ? (
                  <SelectField
                    label="SOE"
                    value={soe}
                    onChange={(e) => setParam('soe', e.target.value)}
                    options={[
                      {
                        value: '',
                        label: selectedDef.requiresOrganization
                          ? 'Select SOE'
                          : 'All SOEs in scope',
                      },
                      ...(options.data?.organizations.map((o) => ({
                        value: o.id,
                        label: o.label,
                      })) ?? []),
                    ]}
                  />
                ) : null}
                {selectedDef?.parameters.includes('sector') && portal !== 'soe' ? (
                  <SelectField
                    label="Sector"
                    value={sector}
                    onChange={(e) => setParam('sector', e.target.value)}
                    options={[
                      { value: '', label: 'All sectors' },
                      ...(options.data?.sectors.map((s) => ({ value: s, label: s })) ?? []),
                    ]}
                  />
                ) : null}
                {selectedDef?.parameters.includes('province') ? (
                  <SelectField
                    label="Province"
                    value={province}
                    onChange={(e) => setParam('province', e.target.value)}
                    options={[
                      { value: '', label: 'All provinces' },
                      ...(options.data?.provinces.map((p) => ({ value: p, label: p })) ?? []),
                    ]}
                  />
                ) : null}
                {selectedDef?.parameters.includes('approvedOnly') ? (
                  <SelectField
                    label="Finance data"
                    value={approvedOnly ? '1' : '0'}
                    onChange={(e) =>
                      setParam('approvedOnly', e.target.value === '1' ? '1' : '')
                    }
                    options={[
                      { value: '0', label: 'Period fixtures (labeled)' },
                      { value: '1', label: 'Approved / locked only' },
                    ]}
                  />
                ) : null}
              </div>
            </Card>

            {preview.isLoading ? <LoadingBlock label="Building report preview…" /> : null}
            {preview.isError ? (
              <ErrorState
                title="Unable to build preview"
                detail="Check portal access and parameters."
              />
            ) : null}
            {preview.data ? (
              <article className="rounded-card border border-soe-border bg-white p-5 shadow-[var(--shadow-card)] print:border-0 print:shadow-none">
                <header className="mb-4 border-b border-soe-border pb-3">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-[6px] border border-soe-border bg-white p-1.5">
                      <img
                        src="/images/MOIP Logo.png"
                        alt="Ministry of Industries and Production"
                        className="h-full w-full object-contain"
                      />
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase text-soe-slate">
                        Government of Pakistan
                      </p>
                      <p className="text-xs font-semibold text-soe-navy">
                        Ministry of Industries &amp; Production
                      </p>
                      <p className="text-[10px] text-soe-slate">SOE-GAIP</p>
                    </div>
                  </div>
                  <h2 className="text-lg font-semibold text-soe-navy">{preview.data.title}</h2>
                  <p className="text-xs text-soe-slate">
                    Audience: {preview.data.audience} · Scope: {preview.data.scopeLabel}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-3 text-xs text-soe-slate">
                    <span>Period: {preview.data.periodLabel}</span>
                    <span>Generated: {preview.data.generatedAt.slice(0, 10)}</span>
                    <span className="rounded-control border border-soe-border px-2 py-0.5 text-[11px] font-medium text-soe-ink">
                      {REPORT_DATA_STATUS_LABEL[preview.data.dataStatus]}
                    </span>
                  </div>
                  <p className="mt-2 text-[11px] text-soe-slate">{preview.data.dataStatusNote}</p>
                </header>

                <div className="mb-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4 print:hidden">
                  <KpiValue label="Period" value={preview.data.periodLabel} />
                  <KpiValue label="Scope" value={preview.data.scopeLabel} />
                  <KpiValue
                    label="Sections"
                    value={String(preview.data.sections.length)}
                  />
                  <KpiValue
                    label="Style"
                    value={preview.data.briefStyle ? 'Executive brief' : 'Full report'}
                  />
                </div>

                {preview.data.sections.map((s) => (
                  <SectionBlock key={s.id} section={s} />
                ))}

                <footer className="mt-4 border-t border-soe-border pt-3 text-[11px] text-soe-slate">
                  {preview.data.methodologyNote}
                  {reportId === REPORT_ID.CABINET_BRIEF
                    ? ' Cabinet Brief does not simulate official Cabinet process.'
                    : ''}
                </footer>
              </article>
            ) : null}

            {selectedDef?.requiresOrganization && !soe && portal !== 'soe' ? (
              <EmptyState title="Select an SOE to preview this report" />
            ) : null}
          </div>
        )}
      </div>
    </RequirePermission>
  )
}

export function SoeReportsPage() {
  return <ReportsBriefingsWorkspace portal="soe" title="Reports" />
}

export function MoipReportsPage() {
  return <ReportsBriefingsWorkspace portal="moip" title="Reports" />
}

export function SecretaryReportsPage() {
  return <ReportsBriefingsWorkspace portal="secretary" title="Reports & Briefings" />
}

export function MinisterReportsPage() {
  return <ReportsBriefingsWorkspace portal="minister" title="Executive Reports" />
}

export function PmoReportsPage() {
  return <ReportsBriefingsWorkspace portal="pmo" title="Strategic Reports" />
}
