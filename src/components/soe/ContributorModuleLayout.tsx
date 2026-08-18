/**
 * SOE contributor module page — entry form first, registry table below.
 * Recipe: PageHeader → section nav → entry form + actions → registry block.
 */
import type { PropsWithChildren, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { EntryFormActionGroup } from '@/components/soe/EntryFormShell'
import { Button } from '@/design-system/components/Button'
import type { ModuleId } from '@/constants'

export function ContributorModuleLayout({
  moduleId: _moduleId,
  title,
  actions,
  sectionNav,
  alerts,
  entry,
  registryTitle = 'Registry',
  registry,
  filters,
  footer,
  onSave,
  onCancel,
  saveLabel = 'Save draft',
  cancelLabel = 'Cancel',
  cancelTo,
  saving = false,
  saveDisabled = false,
  showFormActions = true,
  showRegistryDivider = true,
}: PropsWithChildren<{
  moduleId: ModuleId
  title: string
  actions?: ReactNode
  sectionNav?: ReactNode
  alerts?: ReactNode
  /** Period-scoped or record entry form — rendered above the registry */
  entry?: ReactNode
  registryTitle?: string
  /** Filters + data table block below the entry form */
  registry?: ReactNode
  filters?: ReactNode
  footer?: ReactNode
  onSave?: () => void
  onCancel?: () => void
  saveLabel?: string
  cancelLabel?: string
  cancelTo?: string
  saving?: boolean
  saveDisabled?: boolean
  showFormActions?: boolean
  showRegistryDivider?: boolean
}>) {
  const hasActions = showFormActions && entry && (onSave || onCancel || cancelTo)

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

      {entry ? (
        <EntryFormActionGroup actions={actionButtons}>{entry}</EntryFormActionGroup>
      ) : null}

      {registry ? (
        <section className="space-y-3">
          {showRegistryDivider ? (
            <h2 className="border-t border-soe-border pt-4 text-sm font-semibold text-soe-navy">
              {registryTitle}
            </h2>
          ) : null}
          {filters ? <div>{filters}</div> : null}
          {registry}
          {footer ? <div>{footer}</div> : null}
        </section>
      ) : null}
    </div>
  )
}
