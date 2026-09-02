/**
 * SOE contributor entry form shell — fields only, no KPI/stat tiles.
 * Recipe: PageHeader → section nav → form sections → sticky FormActions.
 */
import type { PropsWithChildren, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { EntryFormActionGroup } from '@/components/soe/EntryFormShell'
import { FormDocumentPanel, type FormDocumentsConfig } from '@/components/soe/FormDocumentPanel'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/design-system/components/Button'
import type { ModuleId } from '@/constants'

export function ContributorEntryLayout({
  moduleId: _moduleId,
  title,
  actions,
  sectionNav,
  alerts,
  children,
  onSave,
  onCancel,
  saveLabel = 'Save draft',
  cancelLabel = 'Cancel',
  cancelTo,
  saving = false,
  saveDisabled = false,
  showFormActions = true,
  documents,
}: PropsWithChildren<{
  moduleId: ModuleId
  title: string
  actions?: ReactNode
  sectionNav?: ReactNode
  alerts?: ReactNode
  onSave?: () => void
  onCancel?: () => void
  saveLabel?: string
  cancelLabel?: string
  cancelTo?: string
  saving?: boolean
  saveDisabled?: boolean
  showFormActions?: boolean
  documents?: FormDocumentsConfig
}>) {
  const hasActions = showFormActions && (onSave || onCancel || cancelTo)

  const actionButtons = hasActions ? (
    <>
      {cancelTo ? (
        <Link
          to={cancelTo}
          className="inline-flex h-9 items-center justify-center rounded-control border border-soe-border px-3 text-sm font-medium text-soe-navy"
        >
          {cancelLabel}
        </Link>
      ) : onCancel ? (
        <Button type="button" variant="secondary" onClick={onCancel}>
          {cancelLabel}
        </Button>
      ) : null}
      {onSave ? (
        <Button
          type="button"
          loading={saving}
          disabled={saveDisabled}
          onClick={onSave}
        >
          {saveLabel}
        </Button>
      ) : null}
    </>
  ) : null

  return (
    <div>
      <PageHeader title={title} actions={actions} />
      {sectionNav}
      {alerts ? <div className="mb-4 space-y-2">{alerts}</div> : null}
      {documents ? (
        <div className="mb-4 grid items-start gap-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(280px,22rem)]">
          <EntryFormActionGroup className="mb-0" actions={actionButtons}>
            <div className="grid gap-3">{children}</div>
          </EntryFormActionGroup>
          <FormDocumentPanel {...documents} />
        </div>
      ) : (
        <EntryFormActionGroup actions={actionButtons}>
          <div className="grid gap-3">{children}</div>
        </EntryFormActionGroup>
      )}
    </div>
  )
}
