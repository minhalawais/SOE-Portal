import type { TimelineEvent } from '@/types/domain'
import { EmptyState } from '@/design-system/components/Feedback'
import { cn } from '@/utils'

export function AuditTimeline({
  events,
  emptyTitle = 'No timeline events',
  className,
}: {
  events: TimelineEvent[]
  emptyTitle?: string
  className?: string
}) {
  if (!events.length) return <EmptyState title={emptyTitle} />

  return (
    <ol className={cn('space-y-0', className)} aria-label="Timeline">
      {events.map((e, idx) => (
        <li key={e.id} className="relative flex gap-3 pb-4 last:pb-0">
          <div className="flex w-3 flex-col items-center">
            <span
              className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-soe-blue"
              aria-hidden
            />
            {idx < events.length - 1 ? (
              <span className="mt-1 w-px flex-1 bg-soe-border" aria-hidden />
            ) : null}
          </div>
          <div className="min-w-0 flex-1 border-b border-soe-border pb-3 last:border-0">
            <p className="text-sm font-medium text-soe-ink">{e.title}</p>
            <p className="mt-0.5 text-xs text-soe-slate">
              {new Date(e.occurredAt).toLocaleString()}
              {e.category ? ` · ${e.category}` : ''}
              {e.actorRole ? ` · ${e.actorRole}` : ''}
              {e.status ? ` · ${e.status}` : ''}
              {e.relatedVersion ? ` · ${e.relatedVersion}` : ''}
            </p>
            {e.comment ? <p className="mt-1 text-xs text-soe-slate">{e.comment}</p> : null}
          </div>
        </li>
      ))}
    </ol>
  )
}
