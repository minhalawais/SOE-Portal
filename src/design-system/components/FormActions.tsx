import type { ReactNode } from 'react'
import { cn } from '@/utils'

/**
 * Phase 22 — sticky form action bar for long entry/review forms.
 * Keeps primary actions reachable on scroll without redesigning page chrome.
 */
export function FormActions({
  children,
  className,
  sticky = true,
}: {
  children: ReactNode
  className?: string
  sticky?: boolean
}) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-end gap-2 border-t border-soe-border bg-white/95 px-1 py-3 backdrop-blur-sm',
        sticky && 'sticky bottom-0 z-[25]',
        className,
      )}
    >
      {children}
    </div>
  )
}
