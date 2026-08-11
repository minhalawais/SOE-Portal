import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { useMemo, useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AuditTimeline } from '@/components/timeline/AuditTimeline'
import { PageHeader } from '@/components/layout/PageHeader'
import { DataTable } from '@/components/tables/DataTable'
import { RequirePermission } from '@/app/router/guards'
import { Button } from '@/design-system/components/Button'
import { Card } from '@/design-system/components/Card'
import { Alert, EmptyState, ErrorState, LoadingBlock } from '@/design-system/components/Feedback'
import { KpiCard } from '@/design-system/components/KpiCard'
import { StatusBadge } from '@/design-system/components/StatusBadge'
import {
  TextField,
  SelectField,
  TextareaField,
  MockFileControl,
} from '@/design-system/components/Fields'
import {
  DOCUMENT_CATEGORY,
  DOCUMENT_CATEGORY_LABEL,
  DOCUMENT_EVIDENCE_STATUS,
  DOCUMENT_EVIDENCE_STATUS_LABEL,
} from '@/constants'
import {
  mockDocumentService,
  mockFinanceService,
  mockHistoryIntelligenceService,
  mockOrganizationService,
} from '@/mock-services'
import { hasPermission, PERMISSION } from '@/permissions'
import { useSessionStore } from '@/state/session'
import { useUiStore } from '@/state/ui'
import type {
  DocumentMeta,
  FieldChangeRecord,
  LineageNode,
  LineagePath,
  SubmissionHistoryEvent,
  TimelineEvent,
} from '@/types/domain'
import { AppError, cn } from '@/utils'
import { REPORTING_MODULES } from '@/workflow/moduleCatalog'

type PortalMode = 'soe' | 'moip' | 'assurance'

const linkClass = 'text-sm text-soe-blue underline'
const inputClass =
  'h-9 w-full rounded-md border border-soe-border bg-white px-2.5 text-sm disabled:bg-[var(--color-pending-soft)]'

const LINEAGE_KIND_LABEL: Record<LineageNode['kind'], string> = {
  kpi: 'KPI',
  record: 'Record',
  evidence: 'Evidence',
  submission: 'Submission',
  certification: 'Certification',
  review: 'Review',
}

function scopedOrg(portal: PortalMode, organizationId: string) {
  return portal === 'soe' || portal === 'assurance' ? organizationId : undefined
}

function documentListPath(portal: PortalMode) {
  if (portal === 'moip') return '/moip/documents'
  if (portal === 'assurance') return '/assurance/evidence'
  return '/soe/documents'
}

function documentDetailPath(portal: PortalMode, id: string) {
  if (portal === 'moip') return `/moip/documents/${id}`
  if (portal === 'assurance') return `/assurance/evidence/${id}`
  return `/soe/documents/${id}`
}

function moduleLabel(id?: string) {
  if (!id) return '—'
  return REPORTING_MODULES.find((m) => m.id === id)?.label ?? id
}

function periodLabel(id: string | undefined, periods: Array<{ id: string; label: string }>) {
  if (!id) return '—'
  return periods.find((p) => p.id === id)?.label ?? id
}

function evidenceBadge(status: string) {
  return (
    <StatusBadge
      status={status}
      family="evidence"
      label={DOCUMENT_EVIDENCE_STATUS_LABEL[status] ?? status}
    />
  )
}

function submissionToTimeline(events: SubmissionHistoryEvent[]): TimelineEvent[] {
  return events.map((s) => ({
    id: s.id,
    organizationId: s.organizationId,
    occurredAt: s.occurredAt,
    title: `${s.action.replaceAll('_', ' ')} · ${moduleLabel(s.module)}`,
    category: 'submission',
    actorRole: s.actorRole,
    action: s.action,
    status: s.status,
    comment: s.comment,
    relatedVersion: s.relatedVersion,
    linkedRecordType: 'submission',
    linkedRecordId: s.submissionId,
  }))
}

function DetailRow({ label, value }: { label: string; value?: ReactNode }) {
  return (
    <div className="flex justify-between gap-3 border-b border-soe-border py-1.5 text-sm">
      <dt className="text-soe-slate">{label}</dt>
      <dd className="text-right text-soe-navy">{value ?? '—'}</dd>
    </div>
  )
}

function DetailDl({ children }: { children: ReactNode }) {
  return <dl className="space-y-0">{children}</dl>
}

function DocumentsNav() {
  const tabs = [
    { to: '/soe/documents', label: 'Repository' },
    { to: '/soe/documents/submission-history', label: 'Submission history' },
    { to: '/soe/documents/enterprise-timeline', label: 'Enterprise timeline' },
    { to: '/soe/documents/lineage', label: 'Lineage' },
    { to: '/soe/documents/field-changes', label: 'Field changes' },
  ]
  return (
    <nav className="mb-4 flex flex-wrap gap-x-3 gap-y-1 text-xs" aria-label="Documents sections">
      {tabs.map((t) => (
        <Link key={t.to} className={linkClass} to={t.to}>
          {t.label}
        </Link>
      ))}
    </nav>
  )
}

export function DocumentUploadPanel({
  organizationId: orgOverride,
  linkedRecordType,
  linkedRecordId,
  onSuccess,
}: {
  organizationId?: string
  linkedRecordType?: string
  linkedRecordId?: string
  onSuccess?: () => void
}) {
  const sessionOrg = useSessionStore((s) => s.organizationId)
  const role = useSessionStore((s) => s.role)
  const reportingPeriodId = useSessionStore((s) => s.reportingPeriodId)
  const pushToast = useUiStore((s) => s.pushToast)
  const queryClient = useQueryClient()
  const organizationId = orgOverride ?? sessionOrg

  const [title, setTitle] = useState('')
  const [category, setCategory] = useState<string>(DOCUMENT_CATEGORY.FINANCIAL_STATEMENTS)
  const [fileName, setFileName] = useState('evidence.pdf')
  const [notes, setNotes] = useState('')

  const canUpload = hasPermission(role, PERMISSION.DOCUMENT_UPLOAD)

  const upload = useMutation({
    mutationFn: () =>
      mockDocumentService.createDocument({
        organizationId,
        title: title.trim(),
        category,
        fileName: fileName.trim() || 'document.pdf',
        notes: notes.trim() || undefined,
        uploadedBy: role,
        linkedRecordType,
        linkedRecordId,
        linkedModule: linkedRecordType ? category : undefined,
        reportingPeriodId,
        evidenceStatus: DOCUMENT_EVIDENCE_STATUS.PENDING_REVIEW,
        status: DOCUMENT_EVIDENCE_STATUS.PENDING_REVIEW,
        classification: 'evidence',
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['documents'] })
      setTitle('')
      setNotes('')
      pushToast({ title: 'Document uploaded.', tone: 'success' })
      onSuccess?.()
    },
    onError: (err: unknown) =>
      pushToast({
        title: err instanceof AppError ? err.message : 'Upload failed',
        tone: 'critical',
      }),
  })

  if (!canUpload) return null

  const categoryOptions = Object.values(DOCUMENT_CATEGORY).map((c) => ({
    value: c,
    label: DOCUMENT_CATEGORY_LABEL[c] ?? c,
  }))

  return (
    <Card title="Upload">
      <div className="space-y-3">
        <TextField label="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <SelectField
          label="Category"
          value={category}
          options={categoryOptions}
          onChange={(e) => setCategory(e.target.value)}
        />
        <MockFileControl label="Select file" />
        <TextField
          label="File name"
          value={fileName}
          onChange={(e) => setFileName(e.target.value)}
        />
        <TextareaField
          label="Notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
        />
        {linkedRecordType && linkedRecordId ? (
          <p className="text-xs text-soe-slate">
            Linked record: {linkedRecordType} · {linkedRecordId}
          </p>
        ) : null}
        <Button
          disabled={!title.trim()}
          loading={upload.isPending}
          onClick={() => upload.mutate()}
        >
          Upload
        </Button>
      </div>
    </Card>
  )
}

export function DocumentRepositoryWorkspace({ portal = 'soe' }: { portal?: PortalMode }) {
  return (
    <RequirePermission permission={PERMISSION.DOCUMENT_READ}>
      <DocumentRepositoryContent portal={portal} />
    </RequirePermission>
  )
}

function DocumentRepositoryContent({ portal }: { portal: PortalMode }) {
  const organizationId = useSessionStore((s) => s.organizationId)
  const role = useSessionStore((s) => s.role)
  const reportingPeriodId = useSessionStore((s) => s.reportingPeriodId)
  const scoped = scopedOrg(portal, organizationId)

  const [category, setCategory] = useState('')
  const [linkedModule, setLinkedModule] = useState('')
  const [period, setPeriod] = useState('')
  const [evidenceStatus, setEvidenceStatus] = useState('')
  const [search, setSearch] = useState('')

  const org = useQuery({
    queryKey: ['org', organizationId],
    queryFn: () => mockOrganizationService.getOrganization(organizationId),
    enabled: portal === 'soe' || portal === 'assurance',
  })
  const orgs = useQuery({
    queryKey: ['orgs-map'],
    queryFn: () => mockOrganizationService.getOrganizations({ pageSize: 200 }),
    enabled: portal === 'moip',
  })
  const periods = useQuery({
    queryKey: ['reporting-periods'],
    queryFn: () => mockFinanceService.getReportingPeriods(),
  })

  const allQ = useQuery({
    queryKey: ['documents-all', scoped ?? 'portfolio'],
    queryFn: () =>
      mockDocumentService.getDocuments({
        organizationId: scoped,
        pageSize: 500,
      }),
  })

  const filteredQ = useQuery({
    queryKey: [
      'documents-filtered',
      scoped ?? 'portfolio',
      category,
      linkedModule,
      period,
      evidenceStatus,
      search,
    ],
    queryFn: () =>
      mockDocumentService.getDocuments({
        organizationId: scoped,
        category: category || undefined,
        linkedModule: linkedModule || undefined,
        reportingPeriodId: period || undefined,
        evidenceStatus: evidenceStatus || undefined,
        search: search.trim() || undefined,
        pageSize: 100,
      }),
  })

  const orgMap = useMemo(() => {
    const m = new Map<string, string>()
    for (const o of orgs.data?.items ?? []) m.set(o.id, o.abbreviation ?? o.name)
    return m
  }, [orgs.data])

  const kpis = useMemo(() => {
    const rows = allQ.data?.items ?? []
    return {
      total: rows.length,
      missing: rows.filter((d) => d.evidenceStatus === DOCUMENT_EVIDENCE_STATUS.MISSING).length,
      pendingReview: rows.filter(
        (d) => d.evidenceStatus === DOCUMENT_EVIDENCE_STATUS.PENDING_REVIEW,
      ).length,
      verified: rows.filter((d) => d.evidenceStatus === DOCUMENT_EVIDENCE_STATUS.VERIFIED).length,
      superseded: rows.filter((d) => d.evidenceStatus === DOCUMENT_EVIDENCE_STATUS.SUPERSEDED)
        .length,
    }
  }, [allQ.data])

  const columns = useMemo<ColumnDef<DocumentMeta, unknown>[]>(
    () => {
      const cols: ColumnDef<DocumentMeta, unknown>[] = [
        {
          accessorKey: 'title',
          header: 'Title',
          cell: ({ row }) => (
            <Link className={linkClass} to={documentDetailPath(portal, row.original.id)}>
              {row.original.title}
            </Link>
          ),
        },
        {
          accessorKey: 'category',
          header: 'Category',
          cell: ({ getValue }) =>
            DOCUMENT_CATEGORY_LABEL[String(getValue())] ?? String(getValue()),
        },
      ]
      if (portal === 'moip') {
        cols.push({
          accessorKey: 'organizationId',
          header: 'SOE',
          cell: ({ getValue }) => orgMap.get(String(getValue())) ?? String(getValue()),
        })
      }
      cols.push(
        {
          accessorKey: 'linkedModule',
          header: 'Module',
          cell: ({ getValue }) => moduleLabel(getValue() as string | undefined),
        },
        {
          accessorKey: 'reportingPeriodId',
          header: 'Period',
          cell: ({ getValue }) =>
            periodLabel(getValue() as string | undefined, periods.data ?? []),
        },
        { accessorKey: 'version', header: 'Version' },
        { accessorKey: 'uploadedBy', header: 'Uploader' },
        {
          accessorKey: 'evidenceStatus',
          header: 'Evidence status',
          cell: ({ getValue }) => evidenceBadge(String(getValue())),
        },
        {
          accessorKey: 'fileType',
          header: 'File type',
          cell: ({ getValue }) => String(getValue() ?? '—'),
        },
      )
      return cols
    },
    [portal, orgMap, periods.data],
  )

  const subtitle =
    portal === 'moip'
      ? 'Portfolio document registry · dummy demonstration data'
      : portal === 'assurance'
        ? `${org.data?.abbreviation ?? 'SOE'} · read-only assurance view · demo data`
        : `${org.data?.abbreviation ?? 'SOE'} · dummy demonstration data`

  const showUpload =
    portal === 'soe' && hasPermission(role, PERMISSION.DOCUMENT_UPLOAD)

  return (
    <div>
      <PageHeader title="Documents & evidence" subtitle={subtitle} />
      {portal === 'soe' ? <DocumentsNav /> : null}

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <KpiCard label="Total" value={String(kpis.total)} />
        <KpiCard label="Missing" value={String(kpis.missing)} />
        <KpiCard label="Pending review" value={String(kpis.pendingReview)} />
        <KpiCard label="Verified" value={String(kpis.verified)} />
        <KpiCard label="Superseded" value={String(kpis.superseded)} />
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        <select
          className={cn(inputClass, 'w-auto min-w-[140px]')}
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="">All categories</option>
          {Object.values(DOCUMENT_CATEGORY).map((c) => (
            <option key={c} value={c}>
              {DOCUMENT_CATEGORY_LABEL[c] ?? c}
            </option>
          ))}
        </select>
        <select
          className={cn(inputClass, 'w-auto min-w-[140px]')}
          value={linkedModule}
          onChange={(e) => setLinkedModule(e.target.value)}
        >
          <option value="">All modules</option>
          {REPORTING_MODULES.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </select>
        <select
          className={cn(inputClass, 'w-auto min-w-[140px]')}
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
        >
          <option value="">All periods</option>
          {(periods.data ?? []).map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
        <select
          className={cn(inputClass, 'w-auto min-w-[140px]')}
          value={evidenceStatus}
          onChange={(e) => setEvidenceStatus(e.target.value)}
        >
          <option value="">All evidence statuses</option>
          {Object.values(DOCUMENT_EVIDENCE_STATUS).map((s) => (
            <option key={s} value={s}>
              {DOCUMENT_EVIDENCE_STATUS_LABEL[s] ?? s}
            </option>
          ))}
        </select>
        <input
          className={cn(inputClass, 'min-w-[180px] flex-1')}
          placeholder="Search title, file, ID…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {!period && reportingPeriodId ? (
          <span className="self-center text-xs text-soe-slate">
            Session period: {periodLabel(reportingPeriodId, periods.data ?? [])}
          </span>
        ) : null}
      </div>

      {allQ.isLoading || filteredQ.isLoading ? (
        <LoadingBlock label="Loading documents…" />
      ) : null}
      {filteredQ.isError ? <ErrorState title="Unable to load documents" /> : null}

      <div className={cn(showUpload ? 'grid gap-4 lg:grid-cols-3' : '')}>
        <div className={showUpload ? 'lg:col-span-2' : ''}>
          {filteredQ.data?.items.length ? (
            <DataTable
              data={filteredQ.data.items}
              columns={columns}
              density="compact"
              showSearch={false}
            />
          ) : filteredQ.data ? (
            <EmptyState title="No documents" hint="Adjust filters or upload evidence." />
          ) : null}
        </div>
        {showUpload ? (
          <DocumentUploadPanel organizationId={organizationId} />
        ) : null}
      </div>
    </div>
  )
}

export function EvidenceViewerWorkspace({ portal = 'soe' }: { portal?: PortalMode }) {
  return (
    <RequirePermission permission={PERMISSION.DOCUMENT_READ}>
      <EvidenceViewerContent portal={portal} />
    </RequirePermission>
  )
}

function EvidenceViewerContent({ portal }: { portal: PortalMode }) {
  const { id } = useParams<{ id: string }>()
  const role = useSessionStore((s) => s.role)
  const pushToast = useUiStore((s) => s.pushToast)
  const queryClient = useQueryClient()

  const [replaceFileName, setReplaceFileName] = useState('revised.pdf')
  const [replaceNotes, setReplaceNotes] = useState('')

  const doc = useQuery({
    queryKey: ['document', id, role],
    enabled: Boolean(id),
    queryFn: () => mockDocumentService.getDocument(id!, role),
  })

  const versions = useQuery({
    queryKey: ['document-versions', doc.data?.documentFamilyId],
    enabled: Boolean(doc.data?.documentFamilyId),
    queryFn: () => mockDocumentService.getVersions(doc.data!.documentFamilyId),
  })

  const related = useQuery({
    queryKey: ['document-related', doc.data?.linkedRecordType, doc.data?.linkedRecordId],
    enabled: Boolean(doc.data?.linkedRecordType && doc.data?.linkedRecordId),
    queryFn: () =>
      mockDocumentService.getForRecord(doc.data!.linkedRecordType!, doc.data!.linkedRecordId!),
  })

  const org = useQuery({
    queryKey: ['org', doc.data?.organizationId],
    enabled: Boolean(doc.data?.organizationId),
    queryFn: () => mockOrganizationService.getOrganization(doc.data!.organizationId),
  })

  const periods = useQuery({
    queryKey: ['reporting-periods'],
    queryFn: () => mockFinanceService.getReportingPeriods(),
  })

  const replace = useMutation({
    mutationFn: () =>
      mockDocumentService.replaceDocument(id!, {
        fileName: replaceFileName.trim() || 'revised.pdf',
        notes: replaceNotes.trim() || undefined,
        uploadedBy: role,
      }),
    onSuccess: (next) => {
      void queryClient.invalidateQueries({ queryKey: ['documents'] })
      void queryClient.invalidateQueries({ queryKey: ['document', id] })
      pushToast({ title: `Version ${next.version} uploaded.`, tone: 'success' })
    },
    onError: (err: unknown) =>
      pushToast({
        title: err instanceof AppError ? err.message : 'Replace failed',
        tone: 'critical',
      }),
  })

  const verify = useMutation({
    mutationFn: () =>
      mockDocumentService.updateEvidenceStatus(
        id!,
        DOCUMENT_EVIDENCE_STATUS.VERIFIED,
        role,
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['documents'] })
      void queryClient.invalidateQueries({ queryKey: ['document', id] })
      pushToast({ title: 'Evidence verified.', tone: 'success' })
    },
    onError: (err: unknown) =>
      pushToast({
        title: err instanceof AppError ? err.message : 'Verify failed',
        tone: 'critical',
      }),
  })

  if (doc.isLoading) return <LoadingBlock label="Loading document…" />
  if (doc.isError || !doc.data) {
    return <ErrorState title="Document not found" detail="Check the document ID." />
  }

  const d = doc.data
  const canUpload = hasPermission(role, PERMISSION.DOCUMENT_UPLOAD)
  const canVerify = hasPermission(role, PERMISSION.DOCUMENT_VERIFY)
  const relatedDocs = (related.data ?? []).filter((r) => r.id !== d.id)

  return (
    <div>
      <PageHeader
        title={d.title}
        subtitle={`${d.id} · v${d.version} · ${org.data?.abbreviation ?? d.organizationId} · demo data`}
        actions={
          <Link className={linkClass} to={documentListPath(portal)}>
            Back to repository
          </Link>
        }
      />
      {portal === 'soe' ? <DocumentsNav /> : null}

      {d.isRestricted || d.isSensitive ? (
        <Alert
          tone="warning"
          title={
            d.isSensitive
              ? 'Sensitive document — preview may be restricted'
              : 'Restricted document — preview may be restricted'
          }
          className="mb-3"
        />
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Metadata">
          <DetailDl>
            <DetailRow
              label="Category"
              value={DOCUMENT_CATEGORY_LABEL[d.category] ?? d.category}
            />
            <DetailRow label="File" value={d.fileName} />
            <DetailRow label="File type" value={d.fileType ?? '—'} />
            <DetailRow label="Module" value={moduleLabel(d.linkedModule)} />
            <DetailRow
              label="Period"
              value={periodLabel(d.reportingPeriodId, periods.data ?? [])}
            />
            <DetailRow label="Uploaded" value={d.uploadedAt.slice(0, 10)} />
            <DetailRow label="Uploader" value={d.uploadedBy} />
            <DetailRow label="Evidence status" value={evidenceBadge(d.evidenceStatus)} />
            <DetailRow label="Classification" value={d.classification ?? '—'} />
            <DetailRow label="Family ID" value={d.documentFamilyId} />
            {d.linkedRecordType ? (
              <DetailRow
                label="Linked record"
                value={`${d.linkedRecordType} · ${d.linkedRecordId ?? '—'}`}
              />
            ) : null}
            {d.notes ? <DetailRow label="Notes" value={d.notes} /> : null}
          </DetailDl>
        </Card>

        <Card title="Preview">
          {d.previewAllowed ? (
            <div className="flex min-h-[12rem] items-center justify-center rounded-md border border-dashed border-soe-border bg-[var(--color-pending-soft)] p-6 text-center text-sm text-soe-slate">
              Preview placeholder — no real file storage in this prototype.
              <br />
              <span className="text-xs">{d.fileName}</span>
            </div>
          ) : (
            <EmptyState
              title="Preview restricted"
              hint="Your role cannot preview this document. Request verify or sensitive-read access."
            />
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              variant="secondary"
              onClick={() =>
                pushToast({ title: `Download prepared: ${d.fileName}`, tone: 'info' })
              }
            >
              Download (mock)
            </Button>
            {canVerify &&
            d.evidenceStatus === DOCUMENT_EVIDENCE_STATUS.PENDING_REVIEW &&
            portal !== 'assurance' ? (
              <Button loading={verify.isPending} onClick={() => verify.mutate()}>
                Verify evidence
              </Button>
            ) : null}
          </div>
        </Card>
      </div>

      <Card title="Version history" className="mt-4">
        {versions.isLoading ? <LoadingBlock label="Loading versions…" /> : null}
        {versions.data?.length ? (
          <ul className="space-y-2 text-sm">
            {versions.data.map((v) => (
              <li
                key={v.id}
                className="flex flex-wrap items-center justify-between gap-2 border-b border-soe-border py-1.5"
              >
                <span>
                  v{v.version}{' '}
                  {v.id === d.id ? (
                    <span className="text-xs text-soe-slate">(current)</span>
                  ) : (
                    <Link className={linkClass} to={documentDetailPath(portal, v.id)}>
                      {v.fileName}
                    </Link>
                  )}
                </span>
                <span className="flex items-center gap-2 text-xs text-soe-slate">
                  {v.uploadedAt.slice(0, 10)} · {evidenceBadge(v.evidenceStatus)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="No versions" />
        )}
      </Card>

      {canUpload && portal !== 'assurance' ? (
        <Card title="Replace version" className="mt-4">
          <div className="space-y-3">
            <MockFileControl label="Select replacement file" />
            <TextField
              label="File name"
              value={replaceFileName}
              onChange={(e) => setReplaceFileName(e.target.value)}
            />
            <TextareaField
              label="Notes"
              value={replaceNotes}
              onChange={(e) => setReplaceNotes(e.target.value)}
              rows={2}
            />
            <Button loading={replace.isPending} onClick={() => replace.mutate()}>
              Upload new version
            </Button>
          </div>
        </Card>
      ) : null}

      <Card title="Related documents (same record)" className="mt-4">
        {related.isLoading ? <LoadingBlock label="Loading related…" /> : null}
        {relatedDocs.length ? (
          <ul className="space-y-2 text-sm">
            {relatedDocs.map((r) => (
              <li key={r.id} className="flex justify-between border-b border-soe-border py-1.5">
                <Link className={linkClass} to={documentDetailPath(portal, r.id)}>
                  {r.title}
                </Link>
                {evidenceBadge(r.evidenceStatus)}
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="No related documents" hint="Linked via record type and ID." />
        )}
      </Card>
    </div>
  )
}

export function RecordAttachmentsPanel({
  recordType,
  recordId,
  title = 'Attachments',
  portal = 'soe',
}: {
  recordType: string
  recordId: string
  title?: string
  portal?: PortalMode
}) {
  const role = useSessionStore((s) => s.role)
  const canRead = hasPermission(role, PERMISSION.DOCUMENT_READ)

  const docs = useQuery({
    queryKey: ['record-documents', recordType, recordId],
    enabled: canRead,
    queryFn: () => mockDocumentService.getForRecord(recordType, recordId),
  })

  if (!canRead) return null
  if (docs.isLoading) return <LoadingBlock label="Loading attachments…" />
  if (docs.isError) return <ErrorState title="Unable to load attachments" />

  return (
    <Card title={title}>
      {docs.data?.length ? (
        <ul className="space-y-2 text-sm">
          {docs.data.map((d) => (
            <li key={d.id} className="flex justify-between gap-2 border-b border-soe-border py-1.5">
              <Link className={linkClass} to={documentDetailPath(portal, d.id)}>
                {d.title}
              </Link>
              <span className="flex shrink-0 items-center gap-2 text-xs text-soe-slate">
                v{d.version} · {evidenceBadge(d.evidenceStatus)}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState title="No attachments" hint="Upload via Documents module." />
      )}
    </Card>
  )
}

export function SubmissionHistoryWorkspace() {
  return (
    <RequirePermission permission={PERMISSION.DOCUMENT_READ}>
      <SubmissionHistoryContent />
    </RequirePermission>
  )
}

function SubmissionHistoryContent() {
  const organizationId = useSessionStore((s) => s.organizationId)
  const [module, setModule] = useState('')

  const org = useQuery({
    queryKey: ['org', organizationId],
    queryFn: () => mockOrganizationService.getOrganization(organizationId),
  })

  const history = useQuery({
    queryKey: ['submission-history', organizationId, module],
    queryFn: () =>
      mockHistoryIntelligenceService.getSubmissionHistory(organizationId, {
        module: module || undefined,
      }),
  })

  const events = useMemo(
    () => submissionToTimeline(history.data ?? []),
    [history.data],
  )

  return (
    <div>
      <PageHeader
        title="Submission history"
        subtitle={`${org.data?.abbreviation ?? 'SOE'} · workflow audit trail · demo data`}
      />
      <DocumentsNav />

      <div className="mb-3 max-w-xs">
        <SelectField
          label="Module filter"
          value={module}
          options={[
            { value: '', label: 'All modules' },
            ...REPORTING_MODULES.map((m) => ({ value: m.id, label: m.label })),
          ]}
          onChange={(e) => setModule(e.target.value)}
        />
      </div>

      {history.isLoading ? <LoadingBlock label="Loading submission history…" /> : null}
      {history.isError ? <ErrorState title="Unable to load submission history" /> : null}
      {history.data ? (
        <Card title="Timeline">
          <AuditTimeline events={events} emptyTitle="No submission events for this filter." />
        </Card>
      ) : null}
    </div>
  )
}

export function EnterpriseTimelineWorkspace() {
  return (
    <RequirePermission permission={PERMISSION.DOCUMENT_READ}>
      <EnterpriseTimelineContent />
    </RequirePermission>
  )
}

type TimelineCategoryFilter = 'all' | 'enterprise' | 'finance' | 'asset' | 'governance'

function EnterpriseTimelineContent() {
  const organizationId = useSessionStore((s) => s.organizationId)
  const [category, setCategory] = useState<TimelineCategoryFilter>('all')

  const org = useQuery({
    queryKey: ['org', organizationId],
    queryFn: () => mockOrganizationService.getOrganization(organizationId),
  })

  const timeline = useQuery({
    queryKey: ['enterprise-timeline', organizationId],
    queryFn: () => mockHistoryIntelligenceService.getEnterpriseTimeline(organizationId),
  })

  const filtered = useMemo(() => {
    const items = timeline.data ?? []
    if (category === 'all') return items
    if (category === 'governance') {
      return items.filter((e) =>
        ['governance', 'privatization', 'workflow'].includes(e.category),
      )
    }
    return items.filter((e) => e.category === category)
  }, [timeline.data, category])

  const chips: Array<{ id: TimelineCategoryFilter; label: string }> = [
    { id: 'all', label: 'All' },
    { id: 'enterprise', label: 'Enterprise' },
    { id: 'finance', label: 'Finance' },
    { id: 'asset', label: 'Asset' },
    { id: 'governance', label: 'Governance' },
  ]

  return (
    <div>
      <PageHeader
        title="Enterprise timeline"
        subtitle={`${org.data?.abbreviation ?? 'SOE'} · cross-module events · demo data`}
      />
      <DocumentsNav />

      <div className="mb-3 flex flex-wrap gap-2">
        {chips.map((c) => (
          <button
            key={c.id}
            type="button"
            className={cn(
              'h-8 rounded-md border px-3 text-xs font-medium',
              category === c.id
                ? 'border-soe-blue bg-soe-blue text-white'
                : 'border-soe-border bg-white text-soe-navy',
            )}
            onClick={() => setCategory(c.id)}
          >
            {c.label}
          </button>
        ))}
      </div>

      {timeline.isLoading ? <LoadingBlock label="Loading timeline…" /> : null}
      {timeline.isError ? <ErrorState title="Unable to load enterprise timeline" /> : null}
      {timeline.data ? (
        <Card title="Events">
          <AuditTimeline events={filtered} emptyTitle="No events for this category." />
        </Card>
      ) : null}
    </div>
  )
}

export function FieldChangeComparisonWorkspace() {
  return (
    <RequirePermission permission={PERMISSION.DOCUMENT_READ}>
      <FieldChangeComparisonContent />
    </RequirePermission>
  )
}

function FieldChangeComparisonContent() {
  const organizationId = useSessionStore((s) => s.organizationId)

  const org = useQuery({
    queryKey: ['org', organizationId],
    queryFn: () => mockOrganizationService.getOrganization(organizationId),
  })

  const changes = useQuery({
    queryKey: ['field-changes', organizationId],
    queryFn: () => mockHistoryIntelligenceService.getFieldChanges(organizationId),
  })

  const columns = useMemo<ColumnDef<FieldChangeRecord, unknown>[]>(
    () => [
      { accessorKey: 'recordType', header: 'Record type' },
      { accessorKey: 'recordId', header: 'Record ID' },
      { accessorKey: 'field', header: 'Field' },
      { accessorKey: 'previousValue', header: 'Previous' },
      { accessorKey: 'currentValue', header: 'Current' },
      { accessorKey: 'changedBy', header: 'Changed by' },
      {
        accessorKey: 'changedAt',
        header: 'Date',
        cell: ({ getValue }) => String(getValue()).slice(0, 10),
      },
      { accessorKey: 'reason', header: 'Reason' },
    ],
    [],
  )

  return (
    <div>
      <PageHeader
        title="Field change comparison"
        subtitle={`${org.data?.abbreviation ?? 'SOE'} · current vs previous values · demo data`}
      />
      <DocumentsNav />

      {changes.isLoading ? <LoadingBlock label="Loading field changes…" /> : null}
      {changes.isError ? <ErrorState title="Unable to load field changes" /> : null}
      {changes.data?.length ? (
        <DataTable data={changes.data} columns={columns} density="compact" showSearch={false} />
      ) : changes.data ? (
        <EmptyState title="No field changes recorded" />
      ) : null}
    </div>
  )
}

function LineagePathDetail({ path, portal }: { path: LineagePath; portal: PortalMode }) {
  return (
    <Card title={path.title} className="mt-4">
      <p className="mb-3 text-xs text-soe-slate">
        Domain: {path.domain} · {path.nodes.length} steps
      </p>
      <ol className="space-y-0">
        {path.nodes.map((node, idx) => (
          <li key={node.id} className="relative flex gap-3 pb-4 last:pb-0">
            <div className="flex w-3 flex-col items-center">
              <span
                className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-soe-blue"
                aria-hidden
              />
              {idx < path.nodes.length - 1 ? (
                <span className="mt-1 w-px flex-1 bg-soe-border" aria-hidden />
              ) : null}
            </div>
            <div className="min-w-0 flex-1 border-b border-soe-border pb-3 last:border-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-soe-slate">
                {LINEAGE_KIND_LABEL[node.kind]}
              </p>
              <p className="text-sm font-medium text-soe-ink">
                {node.route ? (
                  <Link className={linkClass} to={node.route}>
                    {node.label}
                  </Link>
                ) : node.documentId ? (
                  <Link className={linkClass} to={documentDetailPath(portal, node.documentId)}>
                    {node.label}
                  </Link>
                ) : (
                  node.label
                )}
              </p>
              {node.detail ? (
                <p className="mt-0.5 text-xs text-soe-slate">{node.detail}</p>
              ) : null}
            </div>
          </li>
        ))}
      </ol>
    </Card>
  )
}

export function LineageExplorerWorkspace({ portal = 'soe' }: { portal?: PortalMode }) {
  return (
    <RequirePermission permission={PERMISSION.DOCUMENT_READ}>
      <LineageExplorerContent portal={portal} />
    </RequirePermission>
  )
}

function LineageExplorerContent({ portal }: { portal: PortalMode }) {
  const organizationId = useSessionStore((s) => s.organizationId)

  const org = useQuery({
    queryKey: ['org', organizationId],
    queryFn: () => mockOrganizationService.getOrganization(organizationId),
  })

  /** Provisional: show representative finance/asset/governance paths across demo SOEs */
  const paths = useQuery({
    queryKey: ['lineage-paths', 'demo-all'],
    queryFn: () => mockHistoryIntelligenceService.getLineagePaths(),
  })

  const listed = useMemo(() => (paths.data ?? []).slice(0, 3), [paths.data])
  const [selectedId, setSelectedId] = useState<string | undefined>()

  const selected = useMemo(() => {
    const id = selectedId ?? listed[0]?.id
    return listed.find((p) => p.id === id) ?? listed[0]
  }, [listed, selectedId])

  return (
    <div>
      <PageHeader
        title="Lineage explorer"
        subtitle={`${org.data?.abbreviation ?? 'SOE'} · three demo KPI→evidence paths · demo data`}
      />
      {portal === 'soe' ? <DocumentsNav /> : null}

      {paths.isLoading ? <LoadingBlock label="Loading lineage paths…" /> : null}
      {paths.isError ? <ErrorState title="Unable to load lineage paths" /> : null}

      {listed.length ? (
        <>
          <Card title="Lineage paths">
            <ul className="space-y-2 text-sm">
              {listed.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    className={cn(
                      'w-full rounded-md border px-3 py-2 text-left',
                      selected?.id === p.id
                        ? 'border-soe-blue bg-[var(--color-pending-soft)]'
                        : 'border-soe-border bg-white',
                    )}
                    onClick={() => setSelectedId(p.id)}
                  >
                    <span className="font-medium text-soe-navy">{p.title}</span>
                    <span className="mt-0.5 block text-xs text-soe-slate">
                      {p.domain} · {p.organizationId} · {p.nodes.length} nodes
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </Card>
          {selected ? <LineagePathDetail path={selected} portal={portal} /> : null}
        </>
      ) : paths.data ? (
        <EmptyState title="No lineage paths" />
      ) : null}
    </div>
  )
}

export function MoipDocumentsPage() {
  return <DocumentRepositoryWorkspace portal="moip" />
}

export function AssuranceEvidencePage() {
  return (
    <RequirePermission permission={PERMISSION.DOCUMENT_READ}>
      <AssuranceEvidenceContent />
    </RequirePermission>
  )
}

function AssuranceEvidenceContent() {
  return (
    <div>
      <DocumentRepositoryContent portal="assurance" />
      <div className="mt-4">
        <LineageExplorerContent portal="assurance" />
      </div>
    </div>
  )
}
