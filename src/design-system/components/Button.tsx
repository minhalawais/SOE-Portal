import { cn } from '@/utils'
import type { ButtonHTMLAttributes, PropsWithChildren } from 'react'

type Variant = 'primary' | 'secondary' | 'tertiary' | 'destructive' | 'teal'
type Size = 'sm' | 'md' | 'lg'

const styles: Record<Variant, string> = {
  primary: 'bg-soe-blue text-white hover:bg-[#184e78]',
  secondary: 'bg-white text-soe-blue border border-soe-blue hover:bg-soe-canvas',
  tertiary: 'bg-transparent text-soe-blue hover:bg-soe-canvas',
  destructive: 'bg-soe-critical text-white hover:bg-[#9a3838]',
  teal: 'bg-soe-teal text-white hover:bg-[#127266]',
}

const sizes: Record<Size, string> = {
  sm: 'h-8 px-2.5 text-xs',
  md: 'h-10 px-3 text-sm',
  lg: 'h-11 px-4 text-sm',
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
}

export function Button({
  children,
  className,
  variant = 'primary',
  size = 'md',
  type = 'button',
  loading,
  disabled,
  ...props
}: PropsWithChildren<ButtonProps>) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-control font-medium transition disabled:cursor-not-allowed disabled:opacity-50',
        styles[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {loading ? <span className="text-xs opacity-80">Working…</span> : children}
    </button>
  )
}

export function IconButton({
  label,
  className,
  children,
  ...props
}: PropsWithChildren<ButtonHTMLAttributes<HTMLButtonElement> & { label: string }>) {
  return (
    <button
      type="button"
      aria-label={label}
      className={cn(
        'inline-flex h-9 w-9 items-center justify-center rounded-control text-soe-navy hover:bg-soe-canvas',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}
