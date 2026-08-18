/**
 * SOE contributor registry shell — filters + table only, no KPI/stat tiles.
 * Recipe: PageHeader → status strip → section nav → FilterBar/filters → DataTable.
 */
import type { PropsWithChildren, ReactNode } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { ModuleStatusStrip } from '@/components/soe/ModuleStatusStrip'
import type { ModuleId } from '@/constants'

export function ContributorRegistryLayout({
  moduleId,
  title,
  subtitle,
  actions,
  sectionNav,
  filters,
  footer,
  children,
}: PropsWithChildren<{
  moduleId: ModuleId
  title: string
  subtitle?: string
  actions?: ReactNode
  sectionNav?: ReactNode
  filters?: ReactNode
  footer?: ReactNode
}>) {
  return (
    <div>
      <PageHeader title={title} subtitle={subtitle} actions={actions} />
      <ModuleStatusStrip moduleId={moduleId} />
      {sectionNav}
      {filters ? <div className="mb-3">{filters}</div> : null}
      {children}
      {footer ? <div className="mt-4">{footer}</div> : null}
    </div>
  )
}
