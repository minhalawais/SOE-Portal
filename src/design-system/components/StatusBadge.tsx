import { AlertTriangle, Check, Circle, Clock3, Info, X } from 'lucide-react'
import {
  resolveStatus,
  statusCatalog,
  toneClass,
  type StatusFamily,
} from '@/design-system/tokens/status'
import { cn } from '@/utils'

const icons = {
  dot: Circle,
  check: Check,
  alert: AlertTriangle,
  x: X,
  info: Info,
  clock: Clock3,
}

interface StatusBadgeProps {
  status: string
  family?: StatusFamily
  label?: string
  className?: string
}

export function StatusBadge({ status, family, label, className }: StatusBadgeProps) {
  const def = resolveStatus(status, family)
  const Icon = icons[def.icon]
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold',
        toneClass[def.tone],
        className,
      )}
    >
      <Icon size={12} aria-hidden />
      <span>{label ?? def.label}</span>
    </span>
  )
}

export function StatusLegend({ family }: { family: StatusFamily }) {
  return (
    <div className="flex flex-wrap gap-2">
      {statusCatalog[family].map((s) => (
        <StatusBadge key={s.value} status={s.value} family={family} />
      ))}
    </div>
  )
}
