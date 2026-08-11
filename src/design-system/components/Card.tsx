import type { PropsWithChildren, ReactNode } from 'react'
import { cn } from '@/utils'
import { CardTitle, HelperText } from '@/design-system/foundations/Layout'

export function Card({
  children,
  className,
  title,
  subtitle,
  actions,
  padding = true,
}: PropsWithChildren<{
  className?: string
  title?: string
  subtitle?: string
  actions?: ReactNode
  padding?: boolean
}>) {
  return (
    <section
      className={cn(
        'rounded-card border border-soe-border bg-soe-surface shadow-[var(--shadow-card)]',
        padding && 'p-[18px]',
        className,
      )}
    >
      {(title || subtitle || actions) && (
        <header className={cn('mb-3 flex items-start justify-between gap-3', !padding && 'px-[18px] pt-[18px]')}>
          <div className="space-y-0.5">
            {title ? <CardTitle>{title}</CardTitle> : null}
            {subtitle ? <HelperText>{subtitle}</HelperText> : null}
          </div>
          {actions}
        </header>
      )}
      {children}
    </section>
  )
}

export function Panel({
  children,
  className,
}: PropsWithChildren<{ className?: string }>) {
  return (
    <section className={cn('rounded-card border border-soe-border bg-soe-surface', className)}>
      {children}
    </section>
  )
}
