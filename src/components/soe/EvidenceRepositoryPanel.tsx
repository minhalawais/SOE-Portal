import { FileText, Image as ImageIcon } from 'lucide-react'
import type { DocumentMeta } from '@/types/domain'
import { cn } from '@/utils'

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

export function EvidenceRepositoryPanel({
  documents,
  subtitle,
  title = 'Documents',
  emptyHint = 'No evidence files linked to this submission.',
}: {
  documents: DocumentMeta[]
  subtitle: string
  title?: string
  emptyHint?: string
}) {
  const pdf = documents.filter((doc) => fileKind(doc) === 'pdf').length
  const image = documents.filter((doc) => fileKind(doc) === 'image').length

  return (
    <section className="overflow-hidden rounded-card border border-soe-border bg-white shadow-[var(--shadow-xs)]">
      <header className="flex items-start justify-between gap-3 bg-[#12304a] px-4 py-2.5">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-white">{title}</h3>
          <p className="mt-0.5 text-xs text-white/70">{subtitle}</p>
        </div>
        <span className="rounded-full bg-white/15 px-2 py-0.5 text-[11px] font-semibold text-white ring-1 ring-white/20">
          {documents.length}
        </span>
      </header>

      <div className="border-b border-soe-border px-4 py-2 text-[11px] text-soe-slate">
        {pdf} PDF · {image} image
      </div>

      <ul className="max-h-[min(420px,calc(100vh-16rem))] space-y-2 overflow-y-auto p-3">
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
                  {doc.fileName}
                  {doc.version ? ` · v${doc.version}` : ''} · {formatUploadedAt(doc.uploadedAt)}
                </span>
              </span>
            </li>
          )
        })}
        {!documents.length ? (
          <li className="rounded-[8px] border border-dashed border-soe-border p-3 text-sm text-soe-slate">
            {emptyHint}
          </li>
        ) : null}
      </ul>
    </section>
  )
}
