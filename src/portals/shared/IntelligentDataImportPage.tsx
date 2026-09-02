import { useMemo, useRef, useState, type DragEvent } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  FileSpreadsheet,
  FileText,
  LoaderCircle,
  Sparkles,
  Tag,
  Trash2,
  UploadCloud,
} from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button, IconButton } from '@/design-system/components/Button'
import { Alert, EmptyState } from '@/design-system/components/Feedback'
import { Modal } from '@/design-system/components/Overlays'
import type { ModuleId } from '@/constants'
import { organizations } from '@/mock-data'
import {
  intelligentImportLimits,
  mockIntelligentImportService,
  type IntelligentImportBatch,
  type IntelligentImportPortal,
  type IntelligentImportRow,
} from '@/mock-services'
import { useSessionStore } from '@/state/session'
import { useUiStore } from '@/state/ui'
import { AppError, cn } from '@/utils'
import { REPORTING_MODULES } from '@/workflow/moduleCatalog'

const processingStages = [
  'Scanning files and document structure',
  'Detecting SOEs, reporting periods and modules',
  'Extracting fields, tables and values',
  'Running confidence and validation checks',
]

type DocumentValidationStatus = 'validated' | 'wrong_document' | 'pending'

type DummyRepositoryDocument = {
  id: string
  title: string
  category: string
  organization: string
  moduleLabel: string
  uploadedAt: string
  status: DocumentValidationStatus
  summary?: string
}

const DUMMY_REPOSITORY_DOCUMENTS: DummyRepositoryDocument[] = [
  {
    id: 'doc-val-1',
    title: 'Audited financial statements FY2025',
    category: 'Report',
    organization: 'TUSDEC',
    moduleLabel: 'Financial & Fiscal',
    uploadedAt: '2026-03-12',
    status: 'validated',
  },
  {
    id: 'doc-val-2',
    title: 'Board composition register',
    category: 'Register',
    organization: 'TUSDEC',
    moduleLabel: 'People & Governance',
    uploadedAt: '2026-04-02',
    status: 'validated',
  },
  {
    id: 'doc-val-3',
    title: 'Fixed asset register — plant & machinery',
    category: 'Register',
    organization: 'TUSDEC',
    moduleLabel: 'Assets & Property',
    uploadedAt: '2026-04-18',
    status: 'wrong_document',
    summary: 'Vendor quotation attached instead of the fixed asset register.',
  },
  {
    id: 'doc-val-4',
    title: 'Annual performance report',
    category: 'Report',
    organization: 'TUSDEC',
    moduleLabel: 'Industrial Performance',
    uploadedAt: '2026-05-01',
    status: 'wrong_document',
    summary: 'Quarterly output sheet does not match the annual performance template.',
  },
  {
    id: 'doc-val-5',
    title: 'Compliance checklist — PEFA',
    category: 'Checklist',
    organization: 'TUSDEC',
    moduleLabel: 'Accountability & Compliance',
    uploadedAt: '2026-05-09',
    status: 'validated',
  },
  {
    id: 'doc-val-6',
    title: 'Privatization readiness brief',
    category: 'Brief',
    organization: 'TUSDEC',
    moduleLabel: 'Privatization & Transformation',
    uploadedAt: '2026-05-14',
    status: 'wrong_document',
    summary: 'Organization chart uploaded; privatization readiness brief expected.',
  },
  {
    id: 'doc-val-7',
    title: 'Enterprise profile pack',
    category: 'Profile',
    organization: 'TUSDEC',
    moduleLabel: 'Enterprise',
    uploadedAt: '2026-05-20',
    status: 'pending',
  },
  {
    id: 'doc-val-8',
    title: 'Land ownership deed extract',
    category: 'Deed',
    organization: 'TUSDEC',
    moduleLabel: 'Assets & Property',
    uploadedAt: '2026-05-22',
    status: 'validated',
  },
]

const documentCardGridStyle = {
  backgroundColor: '#EAF2FC',
  backgroundImage:
    'linear-gradient(to right, rgba(37, 99, 235, 0.09) 1px, transparent 1px), linear-gradient(to bottom, rgba(37, 99, 235, 0.09) 1px, transparent 1px)',
  backgroundSize: '14px 14px',
} as const

function formatDisplayDate(value: string) {
  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('en-GB')
}

function formatBytes(value: number) {
  if (value < 1024) return `${value} B`
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`
  return `${(value / (1024 * 1024)).toFixed(1)} MB`
}

function validationStyle(state: IntelligentImportRow['validation']) {
  if (state === 'ready') return 'border-emerald-200 bg-emerald-50 text-soe-success'
  if (state === 'review') return 'border-amber-200 bg-amber-50 text-soe-warning'
  return 'border-red-200 bg-red-50 text-soe-critical'
}

function documentStatusStyle(status: DocumentValidationStatus) {
  if (status === 'validated') return 'border-emerald-200 bg-emerald-50 text-soe-success'
  if (status === 'wrong_document') return 'border-red-200 bg-red-50 text-soe-critical'
  return 'border-amber-200 bg-amber-50 text-soe-warning'
}

function documentStatusLabel(status: DocumentValidationStatus) {
  if (status === 'validated') return 'Validated'
  if (status === 'wrong_document') return 'Wrong document'
  return 'Pending check'
}

function moduleRoute(portal: IntelligentImportPortal, module: ModuleId) {
  if (portal === 'moip_review') return `/moip-review/modules/${module}`
  return REPORTING_MODULES.find((item) => item.id === module)?.route.replace('/soe/', '/soe-entry/')
    ?? '/soe-entry/submissions'
}

export function IntelligentDataImportPage({ portal }: { portal: IntelligentImportPortal }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const queryClient = useQueryClient()
  const pushToast = useUiStore((state) => state.pushToast)
  const organizationId = useSessionStore((state) => state.organizationId)
  const reportingPeriodId = useSessionStore((state) => state.reportingPeriodId)
  const role = useSessionStore((state) => state.role)
  const [files, setFiles] = useState<File[]>([])
  const [batch, setBatch] = useState<IntelligentImportBatch | null>(null)
  const [processing, setProcessing] = useState(false)
  const [processingStage, setProcessingStage] = useState(0)
  const [filter, setFilter] = useState<'all' | 'review' | 'selected'>('all')
  const [validatorFilter, setValidatorFilter] = useState<'all' | DocumentValidationStatus>('all')
  const [approvalOpen, setApprovalOpen] = useState(false)
  const [declarationAccepted, setDeclarationAccepted] = useState(false)
  const [approving, setApproving] = useState(false)
  const isMoip = portal === 'moip_review'

  const history = useQuery({
    queryKey: ['intelligent-import-history', portal, organizationId],
    queryFn: () => mockIntelligentImportService.listHistory(portal, isMoip ? undefined : organizationId),
  })

  const addFiles = (nextFiles: File[]) => {
    const merged = [...files]
    for (const file of nextFiles) {
      if (!merged.some((item) => item.name === file.name && item.size === file.size)) merged.push(file)
    }
    if (merged.length > intelligentImportLimits.maxFiles) {
      pushToast({ title: `Select no more than ${intelligentImportLimits.maxFiles} files per batch.`, tone: 'critical' })
      return
    }
    setFiles(merged)
    setBatch(null)
  }

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    addFiles(Array.from(event.dataTransfer.files))
  }

  const processFiles = async () => {
    setProcessing(true)
    setProcessingStage(0)
    try {
      for (let stage = 0; stage < processingStages.length; stage += 1) {
        setProcessingStage(stage)
        await new Promise((resolve) => setTimeout(resolve, 220))
      }
      const result = await mockIntelligentImportService.processFiles(files, {
        portal,
        organizationId,
        reportingPeriodId,
        role,
      })
      setBatch(result)
      void queryClient.invalidateQueries({ queryKey: ['intelligent-import-history'] })
      pushToast({ title: `${result.rows.length} candidate fields extracted for review.`, tone: 'success' })
    } catch (error) {
      pushToast({ title: error instanceof AppError ? error.message : 'Unable to process files.', tone: 'critical' })
    } finally {
      setProcessing(false)
    }
  }

  const updateRow = (rowId: string, patch: Partial<IntelligentImportRow>) => {
    if (!batch) return
    setBatch({
      ...batch,
      rows: batch.rows.map((row) => {
        if (row.id !== rowId) return row
        const next = { ...row, ...patch }
        const organization = organizations.find((item) => item.id === next.organizationId)
        const module = REPORTING_MODULES.find((item) => item.id === next.module)
        next.organizationLabel = organization?.abbreviation ?? 'Unmapped'
        next.moduleLabel = module?.label ?? next.module
        if (!next.organizationId || !next.module || !next.value.trim()) {
          next.validation = 'blocked'
          next.validationMessage = 'SOE, module and value are required.'
          next.selected = false
        } else if (next.validation === 'blocked' || patch.organizationId || patch.module || patch.value != null) {
          next.validation = next.confidence < 0.9 ? 'review' : 'ready'
          next.validationMessage = next.confidence < 0.9
            ? 'User-adjusted mapping; confirm before approval.'
            : 'Ready for user approval.'
        }
        return next
      }),
    })
  }

  const selectedRows = batch?.rows.filter((row) => row.selected && row.validation !== 'blocked') ?? []
  const summary = useMemo(() => {
    const rows = batch?.rows ?? []
    return {
      ready: rows.filter((row) => row.validation === 'ready').length,
      review: rows.filter((row) => row.validation === 'review').length,
      blocked: rows.filter((row) => row.validation === 'blocked').length,
      organizations: new Set(rows.map((row) => row.organizationId).filter(Boolean)).size,
      modules: new Set(rows.map((row) => `${row.organizationId}:${row.module}`)).size,
    }
  }, [batch])

  const validatorSummary = useMemo(() => ({
    validated: DUMMY_REPOSITORY_DOCUMENTS.filter((item) => item.status === 'validated').length,
    wrong: DUMMY_REPOSITORY_DOCUMENTS.filter((item) => item.status === 'wrong_document').length,
    pending: DUMMY_REPOSITORY_DOCUMENTS.filter((item) => item.status === 'pending').length,
  }), [])

  const visibleValidatorDocs = DUMMY_REPOSITORY_DOCUMENTS.filter((item) =>
    validatorFilter === 'all' ? true : item.status === validatorFilter,
  )

  const visibleRows = (batch?.rows ?? []).filter((row) =>
    filter === 'all' ? true : filter === 'review' ? row.validation !== 'ready' : row.selected,
  )

  const approve = async () => {
    if (!batch || !declarationAccepted) return
    setApproving(true)
    try {
      const approved = await mockIntelligentImportService.approveBatch(batch, role)
      setBatch(approved)
      setApprovalOpen(false)
      setDeclarationAccepted(false)
      void queryClient.invalidateQueries({ queryKey: ['intelligent-import-history'] })
      void queryClient.invalidateQueries({ queryKey: ['soe-dashboard'] })
      void queryClient.invalidateQueries({ queryKey: ['reporting-workspace'] })
      void queryClient.invalidateQueries({ queryKey: ['moip-command-dashboard'] })
      pushToast({ title: `${approved.insertedRows} approved fields inserted into the mock workspace.`, tone: 'success' })
    } catch (error) {
      pushToast({ title: error instanceof AppError ? error.message : 'Approval failed.', tone: 'critical' })
    } finally {
      setApproving(false)
    }
  }

  const reset = () => {
    setFiles([])
    setBatch(null)
    setFilter('all')
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className="mx-auto max-w-[1540px] space-y-5 pb-8">
      <PageHeader
        title="AI Data Hub"
        subtitle={isMoip
          ? 'Extract source data and validate repository documents across SOEs before controlled insertion.'
          : 'Extract source data and validate repository documents before controlled insertion.'}
      />

      <section className="grid gap-4 xl:grid-cols-2">
        {/* Data Extractor */}
        <div className="overflow-hidden rounded-[8px] border border-soe-border bg-white shadow-[var(--shadow-sm)]">
          <div className="border-b border-soe-border px-4 py-3">
            <h2 className="text-base font-semibold text-soe-navy">Data Extractor</h2>
            <p className="mt-1 text-xs text-soe-slate">
              Upload Excel or PDF files, extract fields with AI, then approve insertion.
            </p>
          </div>
          <div className="space-y-4 p-4">
            <div
              className="flex min-h-[140px] cursor-pointer flex-col items-center justify-center border-2 border-dashed border-soe-border bg-soe-canvas px-4 py-6 text-center transition hover:border-soe-blue hover:bg-blue-50/40"
              onClick={() => inputRef.current?.click()}
              onDragOver={(event) => event.preventDefault()}
              onDrop={handleDrop}
              role="button"
              tabIndex={0}
              onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') inputRef.current?.click() }}
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-soe-blue">
                <UploadCloud size={20} />
              </span>
              <p className="mt-2 text-sm font-semibold text-soe-navy">Drop Excel or PDF files here</p>
              <p className="mt-1 text-xs text-soe-slate">PDF, XLSX, XLS, XLSM, XLSB or CSV · up to 10 files · 20 MB each</p>
              <input
                ref={inputRef}
                className="sr-only"
                type="file"
                multiple
                accept=".pdf,.xlsx,.xls,.xlsm,.xlsb,.csv,application/pdf,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                onChange={(event) => addFiles(Array.from(event.target.files ?? []))}
              />
            </div>

            {files.length ? (
              <div className="divide-y divide-soe-border border border-soe-border">
                {files.map((file, index) => {
                  const isPdf = file.name.toLowerCase().endsWith('.pdf')
                  const FileIcon = isPdf ? FileText : FileSpreadsheet
                  return (
                    <div key={`${file.name}-${file.size}`} className="flex items-center gap-3 px-3 py-2.5">
                      <FileIcon size={18} className={isPdf ? 'text-soe-critical' : 'text-soe-success'} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-soe-navy">{file.name}</p>
                        <p className="text-xs text-soe-slate">{formatBytes(file.size)}</p>
                      </div>
                      <IconButton
                        label={`Remove ${file.name}`}
                        onClick={() => {
                          setFiles(files.filter((_, itemIndex) => itemIndex !== index))
                          setBatch(null)
                        }}
                      >
                        <Trash2 size={16} />
                      </IconButton>
                    </div>
                  )
                })}
              </div>
            ) : null}

            <div className="border border-soe-border bg-soe-canvas px-3 py-3">
              <p className="text-[11px] font-semibold uppercase text-soe-slate">Processing steps</p>
              <ol className="mt-2 space-y-2">
                {processingStages.map((stage, index) => {
                  const complete = batch != null || (processing && index < processingStage)
                  const active = processing && index === processingStage
                  return (
                    <li key={stage} className="flex gap-2">
                      <span
                        className={cn(
                          'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-semibold',
                          complete
                            ? 'border-emerald-300 bg-emerald-100 text-soe-success'
                            : active
                              ? 'border-soe-blue bg-blue-50 text-soe-blue'
                              : 'border-soe-border text-soe-slate',
                        )}
                      >
                        {complete ? <Check size={12} /> : active ? <LoaderCircle size={12} className="animate-spin" /> : index + 1}
                      </span>
                      <span className={cn('text-xs leading-5', active || complete ? 'text-soe-navy' : 'text-soe-slate')}>
                        {stage}
                      </span>
                    </li>
                  )
                })}
              </ol>
            </div>

            <div className="flex flex-wrap justify-end gap-2">
              {files.length ? <Button variant="tertiary" onClick={reset}>Clear batch</Button> : null}
              <Button disabled={!files.length || processing} loading={processing} onClick={processFiles}>
                <Sparkles size={16} />
                Process with AI
              </Button>
            </div>
          </div>
        </div>

        {/* AI Document Validator */}
        <div className="overflow-hidden rounded-[8px] border border-soe-border bg-white shadow-[var(--shadow-sm)]">
          <div className="border-b border-soe-border px-4 py-3">
            <h2 className="text-base font-semibold text-soe-navy">AI Document Validator</h2>
            <p className="mt-1 text-xs text-soe-slate">
              Checks documents in the module repository for correct attachment and content fit.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-px border-b border-soe-border bg-soe-border">
            {[
              ['Validated', validatorSummary.validated, 'text-soe-success'],
              ['Wrong document', validatorSummary.wrong, 'text-soe-critical'],
              ['Pending', validatorSummary.pending, 'text-soe-warning'],
            ].map(([label, value, tone]) => (
              <div key={String(label)} className="bg-white px-3 py-3">
                <p className="text-[11px] font-semibold uppercase text-soe-slate">{label}</p>
                <p className={cn('mt-1 text-2xl font-semibold tabular-nums', String(tone))}>{value}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-1 border-b border-soe-border bg-soe-canvas p-2">
            {([
              ['all', 'All'],
              ['validated', 'Validated'],
              ['wrong_document', 'Wrong document'],
              ['pending', 'Pending'],
            ] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setValidatorFilter(value)}
                className={cn(
                  'h-8 px-3 text-xs font-medium',
                  validatorFilter === value
                    ? 'rounded-[5px] bg-soe-navy text-white'
                    : 'text-soe-slate hover:text-soe-navy',
                )}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="max-h-[520px] space-y-3 overflow-y-auto bg-soe-canvas p-3">
            {visibleValidatorDocs.map((doc) => (
              <article
                key={doc.id}
                className="overflow-hidden rounded-2xl border border-[#d7e4f5] bg-white shadow-[0_6px_18px_rgba(37,99,235,0.08)]"
              >
                <div className="p-4" style={documentCardGridStyle}>
                  <div className="flex items-start justify-between gap-3">
                    <FileText size={22} strokeWidth={1.75} className="shrink-0 text-[#2B59C3]" />
                    <span className="inline-flex rounded-full bg-white px-2.5 py-0.5 text-xs font-medium text-[#2B59C3] shadow-sm">
                      {doc.category}
                    </span>
                  </div>
                  <h3 className="mt-3 text-sm font-semibold leading-5 text-[#2B59C3]">{doc.title}</h3>
                  <p className="mt-2 flex items-center gap-1.5 text-xs text-[#2B59C3]">
                    <Building2 size={14} strokeWidth={1.75} className="shrink-0" />
                    <span className="truncate">{doc.organization}</span>
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span
                      className={cn(
                        'inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold',
                        documentStatusStyle(doc.status),
                      )}
                    >
                      {documentStatusLabel(doc.status)}
                    </span>
                    {doc.status === 'wrong_document' && doc.summary ? (
                      <p className="text-xs leading-4 text-soe-critical">{doc.summary}</p>
                    ) : null}
                  </div>
                </div>
                <div className="flex items-center justify-between gap-3 border-t border-[#e8eef7] bg-white px-4 py-2.5 text-xs text-[#2B59C3]">
                  <span className="flex min-w-0 items-center gap-1.5">
                    <Tag size={14} strokeWidth={1.75} className="shrink-0" />
                    <span className="truncate">{doc.moduleLabel}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-1.5">
                    <Calendar size={14} strokeWidth={1.75} />
                    {formatDisplayDate(doc.uploadedAt)}
                  </span>
                </div>
              </article>
            ))}
            {!visibleValidatorDocs.length ? (
              <div className="rounded-[8px] border border-soe-border bg-white p-6">
                <EmptyState title="No documents match this filter" />
              </div>
            ) : null}
          </div>
        </div>
      </section>

      {batch ? (
        <section className="space-y-4">
          {batch.status === 'approved' ? (
            <Alert tone="success" title="Import approved and inserted">
              {batch.insertedRows} fields were inserted across {batch.affectedOrganizations} SOE{batch.affectedOrganizations === 1 ? '' : 's'} and {batch.affectedModules} module target{batch.affectedModules === 1 ? '' : 's'}.
            </Alert>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {[
              ['Extracted fields', batch.rows.length, 'text-soe-navy'],
              ['Ready to approve', summary.ready, 'text-soe-success'],
              ['Needs user review', summary.review, 'text-soe-warning'],
              ['Blocked', summary.blocked, 'text-soe-critical'],
              [isMoip ? 'Detected SOEs' : 'Target modules', isMoip ? summary.organizations : summary.modules, 'text-soe-blue'],
            ].map(([label, value, tone]) => (
              <div key={String(label)} className="border border-soe-border bg-white p-4 shadow-[var(--shadow-sm)]">
                <p className="text-[11px] font-semibold uppercase text-soe-slate">{label}</p>
                <p className={cn('mt-2 text-2xl font-semibold tabular-nums', String(tone))}>{value}</p>
              </div>
            ))}
          </div>

          <div className="overflow-hidden rounded-[8px] border border-soe-border bg-white shadow-[var(--shadow-sm)]">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-soe-border px-4 py-3">
              <div>
                <h2 className="text-base font-semibold text-soe-navy">Review AI-extracted data</h2>
                <p className="mt-1 text-xs text-soe-slate">Correct mappings and values before selecting them for insertion.</p>
              </div>
              <div className="flex items-center gap-1 rounded-[6px] bg-soe-canvas p-1">
                {(['all', 'review', 'selected'] as const).map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setFilter(item)}
                    className={cn(
                      'h-8 px-3 text-xs font-medium capitalize',
                      filter === item ? 'rounded-[5px] bg-soe-navy text-white' : 'text-soe-slate hover:text-soe-navy',
                    )}
                  >
                    {item === 'review' ? 'Needs review' : item}
                  </button>
                ))}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1320px] text-left text-sm">
                <thead className="bg-soe-canvas text-[11px] uppercase text-soe-slate">
                  <tr>
                    <th className="w-12 px-3 py-3">Use</th>
                    <th>Source</th>
                    <th>Detected SOE</th>
                    <th>Target module</th>
                    <th>Field</th>
                    <th>Extracted value</th>
                    <th>Confidence</th>
                    <th className="pr-3">Validation</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleRows.map((row) => (
                    <tr key={row.id} className="border-t border-soe-border align-top">
                      <td className="px-3 py-3">
                        <input
                          type="checkbox"
                          aria-label={`Use ${row.fieldLabel}`}
                          checked={row.selected}
                          disabled={batch.status === 'approved' || row.validation === 'blocked'}
                          onChange={(event) => updateRow(row.id, { selected: event.target.checked })}
                          className="h-4 w-4 accent-[#1d5d8f]"
                        />
                      </td>
                      <td className="max-w-[190px] py-3">
                        <p className="truncate font-medium text-soe-navy">{row.fileName}</p>
                        <p className="mt-1 text-xs text-soe-slate">{row.sourceReference}</p>
                      </td>
                      <td className="py-3 pr-3">
                        <select
                          aria-label="Detected SOE"
                          value={row.organizationId}
                          disabled={!isMoip || batch.status === 'approved'}
                          onChange={(event) => updateRow(row.id, { organizationId: event.target.value })}
                          className="h-9 w-44 border border-soe-border bg-[#f7f9fb] px-2 text-sm text-soe-ink disabled:opacity-70"
                        >
                          {organizations.map((item) => (
                            <option key={item.id} value={item.id}>{item.abbreviation}</option>
                          ))}
                        </select>
                      </td>
                      <td className="py-3 pr-3">
                        <select
                          aria-label="Target module"
                          value={row.module}
                          disabled={batch.status === 'approved'}
                          onChange={(event) => updateRow(row.id, { module: event.target.value as ModuleId })}
                          className="h-9 w-48 border border-soe-border bg-[#f7f9fb] px-2 text-sm text-soe-ink disabled:opacity-70"
                        >
                          {REPORTING_MODULES.map((item) => (
                            <option key={item.id} value={item.id}>{item.label}</option>
                          ))}
                        </select>
                      </td>
                      <td className="py-3 pr-3">
                        <input
                          aria-label="Target field"
                          value={row.fieldLabel}
                          disabled={batch.status === 'approved'}
                          onChange={(event) => updateRow(row.id, {
                            fieldLabel: event.target.value,
                            fieldKey: event.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '_'),
                          })}
                          className="h-9 w-48 border border-soe-border bg-[#f7f9fb] px-2 text-sm disabled:opacity-70"
                        />
                      </td>
                      <td className="py-3 pr-3">
                        <input
                          aria-label="Extracted value"
                          value={row.value}
                          disabled={batch.status === 'approved'}
                          onChange={(event) => updateRow(row.id, { value: event.target.value })}
                          className="h-9 w-52 border border-soe-border bg-[#f7f9fb] px-2 text-sm disabled:opacity-70"
                        />
                      </td>
                      <td className="py-3 pr-3">
                        <span
                          className={cn(
                            'font-semibold tabular-nums',
                            row.confidence >= 0.9
                              ? 'text-soe-success'
                              : row.confidence >= 0.78
                                ? 'text-soe-warning'
                                : 'text-soe-critical',
                          )}
                        >
                          {Math.round(row.confidence * 100)}%
                        </span>
                      </td>
                      <td className="py-3 pr-3">
                        <span className={cn('inline-flex rounded-full border px-2 py-1 text-[11px] font-semibold', validationStyle(row.validation))}>
                          {row.validation === 'ready'
                            ? 'Ready for approval'
                            : row.validation === 'review'
                              ? 'User review required'
                              : 'Blocked'}
                        </span>
                        <p className="mt-1 max-w-[220px] text-xs text-soe-slate">{row.validationMessage}</p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!visibleRows.length ? (
                <div className="p-6">
                  <EmptyState title="No extracted rows match this filter" />
                </div>
              ) : null}
            </div>
            <div className="sticky bottom-0 flex flex-wrap items-center justify-between gap-3 border-t border-soe-border bg-white px-4 py-3 shadow-[0_-8px_20px_rgba(16,44,66,.08)]">
              <p className="text-sm text-soe-slate">
                <strong className="text-soe-navy">{selectedRows.length}</strong> valid field{selectedRows.length === 1 ? '' : 's'} selected for insertion
              </p>
              {batch.status === 'approved' ? (
                <div className="flex flex-wrap gap-2">
                  {[...new Map(selectedRows.map((row) => [`${row.organizationId}:${row.module}`, row])).values()]
                    .slice(0, 4)
                    .map((row) => (
                      <a
                        key={`${row.organizationId}:${row.module}`}
                        className="text-sm font-medium text-soe-blue hover:underline"
                        href={moduleRoute(portal, row.module)}
                      >
                        Open {row.organizationLabel} {row.moduleLabel}
                      </a>
                    ))}
                </div>
              ) : (
                <Button variant="teal" disabled={!selectedRows.length} onClick={() => setApprovalOpen(true)}>
                  <CheckCircle2 size={16} />
                  Review and approve insertion
                </Button>
              )}
            </div>
          </div>
        </section>
      ) : null}

      <section className="overflow-hidden rounded-[8px] border border-soe-border bg-white shadow-[var(--shadow-sm)]">
        <div className="border-b border-soe-border px-4 py-3">
          <h2 className="text-base font-semibold text-soe-navy">Import history</h2>
          <p className="mt-1 text-xs text-soe-slate">Processed and approved frontend demonstration batches.</p>
        </div>
        {(history.data ?? []).length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-soe-canvas text-[11px] uppercase text-soe-slate">
                <tr>
                  <th className="px-4 py-3">Batch</th>
                  <th>Files</th>
                  <th>Extracted</th>
                  <th>Inserted</th>
                  <th>Status</th>
                  <th>Processed</th>
                </tr>
              </thead>
              <tbody>
                {history.data?.map((item) => (
                  <tr key={item.id} className="border-t border-soe-border">
                    <td className="px-4 py-3 font-medium text-soe-navy">{item.id.replace('ai-batch-', 'Batch ')}</td>
                    <td>{item.files.length}</td>
                    <td>{item.rows.length}</td>
                    <td>{item.insertedRows ?? '—'}</td>
                    <td>
                      <span
                        className={cn(
                          'inline-flex rounded-full px-2 py-1 text-[11px] font-semibold',
                          item.status === 'approved' ? 'bg-emerald-50 text-soe-success' : 'bg-amber-50 text-soe-warning',
                        )}
                      >
                        {item.status === 'approved' ? 'User approved and inserted' : 'Awaiting user approval'}
                      </span>
                    </td>
                    <td>{new Date(item.createdAt).toLocaleString('en-PK')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-6">
            <EmptyState title="No AI import batches yet" hint="Processed batches will appear here." />
          </div>
        )}
      </section>

      <Modal
        open={approvalOpen}
        title="Approve AI-assisted data insertion"
        onClose={() => { setApprovalOpen(false); setDeclarationAccepted(false) }}
        footer={(
          <>
            <Button variant="tertiary" onClick={() => { setApprovalOpen(false); setDeclarationAccepted(false) }}>
              Cancel
            </Button>
            <Button variant="teal" loading={approving} disabled={!declarationAccepted} onClick={approve}>
              Approve and insert {selectedRows.length} fields
            </Button>
          </>
        )}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3 bg-soe-canvas p-3 text-center">
            <div>
              <p className="text-xl font-semibold text-soe-navy">{selectedRows.length}</p>
              <p className="text-xs text-soe-slate">Fields</p>
            </div>
            <div>
              <p className="text-xl font-semibold text-soe-navy">{new Set(selectedRows.map((row) => row.organizationId)).size}</p>
              <p className="text-xs text-soe-slate">SOEs</p>
            </div>
            <div>
              <p className="text-xl font-semibold text-soe-navy">{new Set(selectedRows.map((row) => `${row.organizationId}:${row.module}`)).size}</p>
              <p className="text-xs text-soe-slate">Module targets</p>
            </div>
          </div>
          {summary.review ? (
            <div className="flex gap-2 border border-amber-200 bg-amber-50 p-3 text-sm text-soe-warning">
              <AlertTriangle size={17} className="mt-0.5 shrink-0" />
              <p>
                {selectedRows.filter((row) => row.validation === 'review').length} selected fields have medium AI confidence. Confirm that you reviewed their mappings and values.
              </p>
            </div>
          ) : null}
          <label className="flex cursor-pointer items-start gap-3 border border-soe-border p-3">
            <input
              type="checkbox"
              checked={declarationAccepted}
              onChange={(event) => setDeclarationAccepted(event.target.checked)}
              className="mt-1 h-4 w-4 accent-[#16877a]"
            />
            <span>
              <span className="font-medium text-soe-navy">I approve these mappings and values</span>
              <span className="mt-1 block text-xs leading-5 text-soe-slate">
                I understand this is a frontend demonstration. The approved rows will update mock submission readiness, register source documents and create audit events.
              </span>
            </span>
          </label>
        </div>
      </Modal>
    </div>
  )
}
