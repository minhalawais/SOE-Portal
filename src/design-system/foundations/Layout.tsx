import type { PropsWithChildren } from 'react'
import { cn } from '@/utils'

export function Stack({
  children,
  gap = 'md',
  className,
}: PropsWithChildren<{ gap?: 'sm' | 'md' | 'lg'; className?: string }>) {
  const gaps = { sm: 'gap-2', md: 'gap-4', lg: 'gap-6' }
  return <div className={cn('flex flex-col', gaps[gap], className)}>{children}</div>
}

export function Inline({
  children,
  gap = 'md',
  className,
}: PropsWithChildren<{ gap?: 'sm' | 'md' | 'lg'; className?: string }>) {
  const gaps = { sm: 'gap-2', md: 'gap-3', lg: 'gap-4' }
  return <div className={cn('flex flex-wrap items-center', gaps[gap], className)}>{children}</div>
}

export function Surface({
  children,
  level = 'section',
  className,
}: PropsWithChildren<{
  level?: 'page' | 'section' | 'elevated'
  className?: string
}>) {
  const levels = {
    page: 'bg-soe-canvas',
    section: 'rounded-card border border-soe-border bg-soe-surface',
    elevated: 'rounded-card border border-soe-border bg-soe-surface shadow-[var(--shadow-card)]',
  }
  return <div className={cn(levels[level], className)}>{children}</div>
}

export function PageTitle({ children }: PropsWithChildren) {
  return <h1 className="text-[24px] font-semibold leading-tight text-soe-navy">{children}</h1>
}

export function SectionTitle({ children }: PropsWithChildren) {
  return <h2 className="text-lg font-semibold text-soe-navy">{children}</h2>
}

export function CardTitle({ children }: PropsWithChildren) {
  return <h3 className="text-sm font-semibold text-soe-navy">{children}</h3>
}

export function HelperText({
  children,
  id,
}: PropsWithChildren<{ id?: string }>) {
  return (
    <p id={id} className="text-xs text-soe-slate">
      {children}
    </p>
  )
}

export function LabelText({ children }: PropsWithChildren) {
  return <span className="text-xs font-semibold text-soe-navy">{children}</span>
}
