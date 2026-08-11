import type { ReactNode } from 'react'

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string
  subtitle?: string
  actions?: ReactNode
}) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-[22px] font-semibold text-soe-navy sm:text-[24px] outline-none" tabIndex={-1}>
          {title}
        </h1>
        {subtitle ? <p className="mt-1 text-sm text-soe-slate">{subtitle}</p> : null}
      </div>
      {actions}
    </div>
  )
}
