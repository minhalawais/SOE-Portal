import {
  LEGAL_STATUS,
  SOE_STATUS,
  SHAREHOLDER_CATEGORY,
  type LegalStatus,
  type SoeStatus,
} from '@/constants'
import type { Organization, OwnershipLine } from '@/types/domain'

export interface EnterpriseValidationIssue {
  field: string
  message: string
  severity: 'error' | 'warning'
}

const legalValues = new Set<string>(Object.values(LEGAL_STATUS))
const statusValues = new Set<string>(Object.values(SOE_STATUS))

export function governmentShareFromLines(lines: OwnershipLine[]): number {
  return lines
    .filter(
      (l) =>
        l.category === SHAREHOLDER_CATEGORY.GOVERNMENT ||
        l.category === SHAREHOLDER_CATEGORY.PROVINCIAL_GOVERNMENT,
    )
    .reduce((s, l) => s + l.percentage, 0)
}

export function validateOwnershipLines(lines: OwnershipLine[]): EnterpriseValidationIssue[] {
  const issues: EnterpriseValidationIssue[] = []
  let total = 0

  for (const line of lines) {
    if (line.percentage < 0 || line.percentage > 100) {
      issues.push({
        field: line.id,
        message: `${line.holderName}: percentage must be between 0 and 100.`,
        severity: 'error',
      })
    }
    total += line.percentage
  }

  if (Math.abs(total - 100) > 0.01) {
    issues.push({
      field: 'composition',
      message: `Ownership composition totals ${total.toFixed(1)}% (expected 100%).`,
      severity: 'warning',
    })
  }

  return issues
}

export function validateEnterpriseProfile(
  org: Partial<Organization>,
): EnterpriseValidationIssue[] {
  const issues: EnterpriseValidationIssue[] = []

  if (!org.name?.trim()) {
    issues.push({ field: 'name', message: 'Enterprise name is required.', severity: 'error' })
  }

  if (org.legalStatus && !legalValues.has(org.legalStatus)) {
    issues.push({
      field: 'legalStatus',
      message: 'Legal status must use a controlled value.',
      severity: 'error',
    })
  }

  if (org.status && !statusValues.has(org.status)) {
    issues.push({
      field: 'status',
      message: 'Enterprise status must use a controlled value.',
      severity: 'error',
    })
  }

  if (org.dateOfIncorporation) {
    const d = new Date(org.dateOfIncorporation)
    if (Number.isNaN(d.getTime()) || d > new Date()) {
      issues.push({
        field: 'dateOfIncorporation',
        message: 'Incorporation date must be a valid past date.',
        severity: 'error',
      })
    }
  }

  if (
    org.governmentOwnershipPct != null &&
    (org.governmentOwnershipPct < 0 || org.governmentOwnershipPct > 100)
  ) {
    issues.push({
      field: 'governmentOwnershipPct',
      message: 'Government ownership must be between 0 and 100.',
      severity: 'error',
    })
  }

  return issues
}

export function isLegalStatus(value: string): value is LegalStatus {
  return legalValues.has(value)
}

export function isSoeStatus(value: string): value is SoeStatus {
  return statusValues.has(value)
}
