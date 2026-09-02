import { useMemo, useRef } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FilePlus, FileText, Image as ImageIcon, Files } from 'lucide-react'
import { Button } from '@/design-system/components/Button'
import { DOCUMENT_EVIDENCE_STATUS } from '@/constants'
import { mockDocumentService } from '@/mock-services'
import { useSessionStore } from '@/state/session'
import { useUiStore } from '@/state/ui'
import type { DocumentMeta } from '@/types/domain'
import { AppError, cn } from '@/utils'

export const FORM_DOCS_RECORD_TYPE = 'form_docs'

export function formDocumentRecordId(organizationId: string, packId: string) {
  return `form-docs-${organizationId}-${packId}`
}

export type FormDocumentsConfig = {
  packId: string
  subtitle: string
  linkedModule: string
  bulkUpload?: boolean
  linkedRecordType?: string
  recordId?: string
}

function fileKind(doc: DocumentMeta) {
  const ext = (doc.fileType || doc.fileName.split('.').pop() || '').toLowerCase()
  if (ext === 'image' || ['png', 'jpg', 'jpeg'].includes(ext)) return 'image'
  if (ext === 'spreadsheet' || ['xlsx', 'xls'].includes(ext)) return 'sheet'
  return 'pdf'
}

function formatUploadedAt(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value.slice(0, 10)
  return date.toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function FormDocumentPanel({
  packId,
  subtitle,
  linkedModule,
  bulkUpload = false,
  linkedRecordType = FORM_DOCS_RECORD_TYPE,
  recordId: recordIdProp,
}: FormDocumentsConfig) {
  const organizationId = useSessionStore((s) => s.organizationId)
  const role = useSessionStore((s) => s.role)
  const pushToast = useUiStore((s) => s.pushToast)
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const bulkInputRef = useRef<HTMLInputElement>(null)
  const recordId = recordIdProp ?? formDocumentRecordId(organizationId, packId)
  const queryKey = ['form-documents', linkedRecordType, recordId]

  const docsQuery = useQuery({
    queryKey,
    queryFn: () => mockDocumentService.getForRecord(linkedRecordType, recordId),
  })

  const upload = useMutation({
    mutationFn: async (fileNames: string[]) => {
      for (const fileName of fileNames) {
        await mockDocumentService.createDocument({
          organizationId,
          title: fileName.replace(/\.[^.]+$/, '').replaceAll('-', ' '),
          category: 'ownership',
          fileName,
          uploadedBy: role,
          linkedRecordType,
          linkedRecordId: recordId,
          linkedModule,
          evidenceStatus: DOCUMENT_EVIDENCE_STATUS.AVAILABLE,
          status: DOCUMENT_EVIDENCE_STATUS.AVAILABLE,
          classification: 'evidence',
        })
      }
      return fileNames.length
    },
    onSuccess: (count) => {
      void queryClient.invalidateQueries({ queryKey })
      pushToast({
        title: count > 1 ? `${count} documents added.` : 'Document added.',
        tone: 'success',
      })
    },
    onError: (err: unknown) => {
      pushToast({
        title: err instanceof AppError ? err.message : 'Upload failed',
        tone: 'critical',
      })
    },
  })

  const documents = docsQuery.data ?? []

  const counts = useMemo(() => {
    const pdf = documents.filter((doc) => fileKind(doc) === 'pdf').length
    const image = documents.filter((doc) => fileKind(doc) === 'image').length
    return { pdf, image }
  }, [documents])

  return (
    <section className="overflow-hidden rounded-card border border-soe-border bg-white shadow-[var(--shadow-xs)]">
      <header className="flex items-start justify-between gap-3 bg-[#12304a] px-4 py-2.5">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-white">Documents</h3>
          <p className="mt-0.5 text-xs text-white/70">{subtitle}</p>
        </div>
        <span className="rounded-full bg-white/15 px-2 py-0.5 text-[11px] font-semibold text-white ring-1 ring-white/20">
          {documents.length}
        </span>
      </header>

      <div className="border-b border-soe-border px-4 py-2 text-[11px] text-soe-slate">
        {counts.pdf} PDF · {counts.image} image
      </div>

      <ul className="max-h-[420px] space-y-2 overflow-y-auto p-3">
        {documents.map((doc) => {
          const kind = fileKind(doc)
          return (
            <li
              key={doc.id}
              className="flex items-start gap-3 rounded-[8px] border border-soe-border bg-[#fbfdff] p-3"
            >
              <span
                className={cn(
                  'flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px]',
                  kind === 'image' ? 'bg-[#fff7e6] text-amber-700' : 'bg-[#eef6fc] text-soe-blue',
                )}
              >
                {kind === 'image' ? <ImageIcon size={16} /> : <FileText size={16} />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-soe-navy">{doc.title}</span>
                <span className="mt-1 block truncate text-[11px] text-soe-slate">
                  {doc.fileName} · {formatUploadedAt(doc.uploadedAt)}
                </span>
              </span>
            </li>
          )
        })}
        {!documents.length && !docsQuery.isLoading ? (
          <li className="rounded-[8px] border border-dashed border-soe-border p-3 text-sm text-soe-slate">
            No files in this pack yet.
          </li>
        ) : null}
      </ul>

      <div className="space-y-2 border-t border-soe-border bg-soe-canvas px-3 py-3">
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (file) upload.mutate([file.name])
            event.target.value = ''
          }}
        />
        {bulkUpload ? (
          <input
            ref={bulkInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(event) => {
              const names = Array.from(event.target.files ?? []).map((file) => file.name)
              if (names.length) upload.mutate(names)
              event.target.value = ''
            }}
          />
        ) : null}
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="w-full"
          loading={upload.isPending}
          onClick={() => fileInputRef.current?.click()}
        >
          <FilePlus size={14} />
          Add document
        </Button>
        {bulkUpload ? (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="w-full"
            loading={upload.isPending}
            onClick={() => bulkInputRef.current?.click()}
          >
            <Files size={14} />
            Bulk upload
          </Button>
        ) : null}
      </div>
    </section>
  )
}
