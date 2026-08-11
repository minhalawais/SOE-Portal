import { withMockRuntime } from '@/mock-data/runtime'

export class AppError extends Error {
  code: 'NOT_FOUND' | 'VALIDATION' | 'PERMISSION' | 'UNKNOWN'
  constructor(
    message: string,
    code: 'NOT_FOUND' | 'VALIDATION' | 'PERMISSION' | 'UNKNOWN' = 'UNKNOWN',
  ) {
    super(message)
    this.code = code
    this.name = 'AppError'
  }
}

/** @deprecated Prefer withMockRuntime — kept for existing call sites */
export async function simulateLatency<T>(value: T, _ms?: number): Promise<T> {
  return withMockRuntime(value)
}

export async function simulateMutation<T>(value: T): Promise<T> {
  return withMockRuntime(value, { mutation: true })
}

type CurrencyFormatMode = 'compact' | 'exact'

const exactPkrFormatter = new Intl.NumberFormat('en-PK', {
  maximumFractionDigits: 0,
})

const compactPkrUnits = [
  { threshold: 1_000_000_000_000, suffix: 'T' },
  { threshold: 1_000_000_000, suffix: 'B' },
  { threshold: 1_000_000, suffix: 'M' },
  { threshold: 1_000, suffix: 'K' },
] as const

function formatCompactValue(value: number): string {
  const abs = Math.abs(value)
  const unit = compactPkrUnits.find((u) => abs >= u.threshold)
  if (!unit) return exactPkrFormatter.format(value)

  const scaled = value / unit.threshold
  const maximumFractionDigits = Math.abs(scaled) >= 100 ? 0 : 1
  return `${scaled.toLocaleString('en-PK', {
    maximumFractionDigits,
    minimumFractionDigits: 0,
  })}${unit.suffix}`
}

export function formatCurrencyPkr(
  value: number,
  options: { mode?: CurrencyFormatMode } = {},
): string {
  if (!Number.isFinite(value)) return 'PKR —'
  if (options.mode === 'exact') return `PKR ${exactPkrFormatter.format(value)}`
  return `PKR ${formatCompactValue(value)}`
}

export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}
