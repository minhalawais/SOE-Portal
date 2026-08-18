import { Children, isValidElement, useEffect, type ReactElement, type ReactNode } from 'react'
import { cn } from '@/utils'

export const ENTRY_FORM_ANCHOR_ID = 'contributor-entry-form'

export type EntryFormMode = 'create' | 'edit' | 'view'

export function entryFormModeLabel(mode: EntryFormMode): string {
  if (mode === 'create') return 'New record'
  if (mode === 'edit') return 'Editing'
  return 'View only'
}

export function scrollToEntryForm() {
  requestAnimationFrame(() => {
    document.getElementById(ENTRY_FORM_ANCHOR_ID)?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    })
  })
}

/** Scroll entry form into view when a registry row is selected for edit. */
export function useScrollToEntryOnSelect(selectedId: string | null | undefined) {
  useEffect(() => {
    if (selectedId) scrollToEntryForm()
  }, [selectedId])
}

export function EntryFormSection({
  title,
  children,
}: {
  title: string
  children?: ReactNode
}) {
  return (
    <>
      <h4 className="col-span-full border-b border-soe-border pb-1.5 text-[11px] font-semibold uppercase tracking-wide text-soe-navy">
        {title}
      </h4>
      {children}
    </>
  )
}

type SectionGroup = { title: string | null; fields: ReactNode[] }

function isEntryFormSection(child: ReactNode): child is ReactElement<{ title: string; children?: ReactNode }> {
  return isValidElement(child) && child.type === EntryFormSection
}

function groupEntryFormChildren(children: ReactNode): SectionGroup[] {
  const groups: SectionGroup[] = []
  let current: SectionGroup = { title: null, fields: [] }

  const flush = () => {
    if (current.title != null || current.fields.length) groups.push(current)
    current = { title: null, fields: [] }
  }

  Children.forEach(Children.toArray(children), (child) => {
    if (isEntryFormSection(child)) {
      flush()
      current = {
        title: child.props.title,
        fields: child.props.children ? Children.toArray(child.props.children) : [],
      }
      return
    }
    current.fields.push(child)
  })
  flush()
  return groups
}

export function EntryFormShell({
  title,
  subtitle,
  meta,
  mode = 'create',
  columns = 2,
  children,
  footer,
  className,
}: {
  title: string
  subtitle?: string
  meta?: string
  mode?: EntryFormMode
  columns?: 2 | 3
  children: ReactNode
  footer?: ReactNode
  className?: string
}) {
  const groups = groupEntryFormChildren(children)
  const fieldGrid = columns === 3 ? 'sm:grid-cols-2 lg:grid-cols-3' : 'sm:grid-cols-2'

  return (
    <section
      className={cn(
        'entry-form-shell overflow-hidden rounded-card border border-soe-border bg-soe-canvas shadow-[var(--shadow-xs)]',
        className,
      )}
    >
      <header className="flex flex-wrap items-start justify-between gap-3 bg-[#12304a] px-4 py-2.5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-white">{title}</h3>
            <span className="rounded-full bg-white/15 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-white ring-1 ring-white/20">
              {entryFormModeLabel(mode)}
            </span>
          </div>
          {subtitle ? <p className="mt-0.5 text-xs text-white/70">{subtitle}</p> : null}
          {meta ? <p className="mt-0.5 font-mono text-xs text-white/55">{meta}</p> : null}
        </div>
      </header>
      <div className="space-y-5 bg-white p-4">
        {groups.map((group, index) => (
          <div key={group.title ?? `fields-${index}`}>
            {group.title ? (
              <h4 className="mb-3 border-b border-soe-border pb-1.5 text-[11px] font-semibold uppercase tracking-wide text-soe-navy">
                {group.title}
              </h4>
            ) : null}
            <div className={cn('grid gap-3', fieldGrid)}>{group.fields}</div>
          </div>
        ))}
      </div>
      {footer ? <div className="border-t border-soe-border bg-white px-4 py-2">{footer}</div> : null}
    </section>
  )
}

/** Groups entry fields with a compact action row in one card. */
export function EntryFormActionGroup({
  id = ENTRY_FORM_ANCHOR_ID,
  children,
  actions,
  className,
}: {
  id?: string
  children: ReactNode
  actions?: ReactNode
  className?: string
}) {
  if (!actions) {
    return (
      <div id={id} className={cn('mb-4 scroll-mt-4 grid gap-3', className)}>
        {children}
      </div>
    )
  }

  return (
    <div
      id={id}
      className={cn(
        'entry-form-action-group mb-4 scroll-mt-4 overflow-hidden rounded-card border border-soe-border bg-soe-canvas shadow-[var(--shadow-xs)]',
        className,
      )}
    >
      <div className="space-y-3 [&_.entry-form-shell]:rounded-none [&_.entry-form-shell]:border-0 [&_.entry-form-shell]:shadow-none">
        {children}
      </div>
      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-soe-border bg-white px-4 py-2">
        {actions}
      </div>
    </div>
  )
}

export function RegistryTabBar<T extends string>({
  tabs,
  active,
  onChange,
}: {
  tabs: readonly { id: T; label: string }[]
  active: T
  onChange: (id: T) => void
}) {
  return (
    <div className="mb-3 inline-flex max-w-full flex-wrap gap-0.5 rounded-lg bg-[#e8eef3] p-0.5">
      {tabs.map(({ id, label }) => (
        <button
          key={id}
          type="button"
          onClick={() => onChange(id)}
          className={cn(
            'rounded-md px-3 py-1.5 text-sm font-medium',
            active === id
              ? 'bg-[#12304a] text-white'
              : 'text-soe-navy hover:bg-white/80',
          )}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
