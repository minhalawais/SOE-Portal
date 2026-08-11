import type { FinancialMetric } from '@/types/domain'

export interface ValidationIssue {
  code: string
  field?: string
  message: string
  severity: 'blocking' | 'warning'
}

/**
 * Demonstration validation rules (provisional thresholds — not formally approved policy).
 * - Required numeric fields
 * - Non-negative values
 * - YoY revenue change > 25% → warning
 * - Missing mandatory evidence → blocking (caller supplies evidence count)
 */
export function validateFinanceDraft(
  current: Partial<FinancialMetric>,
  previous?: FinancialMetric | null,
  evidenceCount = 0,
): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  const required: Array<keyof FinancialMetric> = [
    'revenue',
    'operatingExpenses',
    'capex',
    'profitOrLoss',
    'subsidies',
  ]

  for (const field of required) {
    const v = current[field]
    if (v === undefined || v === null || Number.isNaN(Number(v))) {
      issues.push({
        code: 'REQUIRED',
        field,
        message: `${String(field)} is required.`,
        severity: 'blocking',
      })
    }
  }

  for (const field of ['revenue', 'operatingExpenses', 'capex', 'subsidies', 'governmentSupport'] as const) {
    const v = current[field]
    if (v !== undefined && Number(v) < 0) {
      issues.push({
        code: 'NON_NEGATIVE',
        field,
        message: `${field} cannot be negative.`,
        severity: 'blocking',
      })
    }
  }

  if (evidenceCount < 1) {
    issues.push({
      code: 'EVIDENCE_REQUIRED',
      message: 'At least one evidence document is required before completion.',
      severity: 'blocking',
    })
  }

  if (previous && current.revenue !== undefined && previous.revenue > 0) {
    const change = Math.abs(current.revenue - previous.revenue) / previous.revenue
    if (change > 0.25) {
      issues.push({
        code: 'YOY_MATERIAL_CHANGE',
        field: 'revenue',
        message: `Revenue changed by ${Math.round(change * 100)}% vs previous period (demo threshold 25%).`,
        severity: 'warning',
      })
    }
  }

  if (
    current.revenue !== undefined &&
    current.operatingExpenses !== undefined &&
    current.profitOrLoss !== undefined
  ) {
    const implied = current.revenue - current.operatingExpenses
    const drift = Math.abs(implied - current.profitOrLoss)
    if (drift > Math.max(1_000_000, Math.abs(implied) * 0.15)) {
      issues.push({
        code: 'P_L_RECONCILE',
        field: 'profitOrLoss',
        message: 'Profit/Loss differs materially from Revenue − Operating expenses (demo check).',
        severity: 'warning',
      })
    }
  }

  return issues
}

export function hasBlockingIssues(issues: ValidationIssue[]): boolean {
  return issues.some((i) => i.severity === 'blocking')
}
