/** Government status families — Phase 2 §13. Color + text required. */

export type StatusTone = 'neutral' | 'info' | 'success' | 'warning' | 'critical'

export interface StatusDefinition {
  value: string
  label: string
  tone: StatusTone
  icon: 'dot' | 'check' | 'alert' | 'x' | 'info' | 'clock'
}

export const approvalStatus: StatusDefinition[] = [
  { value: 'draft', label: 'Draft', tone: 'neutral', icon: 'dot' },
  { value: 'under_review', label: 'Under Review', tone: 'info', icon: 'info' },
  { value: 'returned', label: 'Returned', tone: 'warning', icon: 'alert' },
  { value: 'approved', label: 'Approved', tone: 'success', icon: 'check' },
  { value: 'locked', label: 'Locked', tone: 'success', icon: 'check' },
]

export const certificationStatus: StatusDefinition[] = [
  { value: 'not_ready', label: 'Not Ready', tone: 'neutral', icon: 'dot' },
  { value: 'ready', label: 'Ready', tone: 'info', icon: 'info' },
  { value: 'certified', label: 'Certified', tone: 'success', icon: 'check' },
]

export const reportingStatus: StatusDefinition[] = [
  { value: 'not_started', label: 'Not Started', tone: 'neutral', icon: 'dot' },
  { value: 'in_progress', label: 'In Progress', tone: 'info', icon: 'info' },
  { value: 'complete', label: 'Complete', tone: 'success', icon: 'check' },
  { value: 'submitted', label: 'Submitted', tone: 'info', icon: 'check' },
  { value: 'overdue', label: 'Overdue', tone: 'critical', icon: 'x' },
]

export const riskStatusDefs: StatusDefinition[] = [
  { value: 'low', label: 'Low', tone: 'success', icon: 'dot' },
  { value: 'moderate', label: 'Moderate', tone: 'warning', icon: 'alert' },
  { value: 'high', label: 'High', tone: 'warning', icon: 'alert' },
  { value: 'critical', label: 'Critical', tone: 'critical', icon: 'x' },
]

export const complianceStatusDefs: StatusDefinition[] = [
  { value: 'compliant', label: 'Compliant', tone: 'success', icon: 'check' },
  { value: 'partially_compliant', label: 'Partially Compliant', tone: 'warning', icon: 'alert' },
  { value: 'non_compliant', label: 'Non-Compliant', tone: 'critical', icon: 'x' },
  { value: 'pending_verification', label: 'Pending Verification', tone: 'info', icon: 'clock' },
  { value: 'not_applicable', label: 'Not Applicable', tone: 'neutral', icon: 'dot' },
]

export const dataQualityStatusDefs: StatusDefinition[] = [
  { value: 'complete', label: 'Complete', tone: 'success', icon: 'check' },
  { value: 'incomplete', label: 'Incomplete', tone: 'warning', icon: 'alert' },
  { value: 'validation_issue', label: 'Validation Issue', tone: 'critical', icon: 'x' },
  { value: 'evidence_missing', label: 'Evidence Missing', tone: 'warning', icon: 'alert' },
  { value: 'verified', label: 'Verified', tone: 'success', icon: 'check' },
]

export const evidenceStatusDefs: StatusDefinition[] = [
  { value: 'available', label: 'Available', tone: 'success', icon: 'check' },
  { value: 'missing', label: 'Missing', tone: 'critical', icon: 'x' },
  { value: 'pending_review', label: 'Pending Review', tone: 'info', icon: 'clock' },
  { value: 'verified', label: 'Verified', tone: 'success', icon: 'check' },
  { value: 'superseded', label: 'Superseded', tone: 'neutral', icon: 'dot' },
]

export const deadlineStatusDefs: StatusDefinition[] = [
  { value: 'normal', label: 'On Track', tone: 'success', icon: 'dot' },
  { value: 'due_soon', label: 'Due Soon', tone: 'warning', icon: 'clock' },
  { value: 'overdue', label: 'Overdue', tone: 'critical', icon: 'x' },
]

export const statusCatalog = {
  approval: approvalStatus,
  certification: certificationStatus,
  reporting: reportingStatus,
  risk: riskStatusDefs,
  compliance: complianceStatusDefs,
  dataQuality: dataQualityStatusDefs,
  evidence: evidenceStatusDefs,
  deadline: deadlineStatusDefs,
} as const

export type StatusFamily = keyof typeof statusCatalog

const allDefs = Object.values(statusCatalog).flat()

export function resolveStatus(value: string, family?: StatusFamily): StatusDefinition {
  if (family) {
    const found = statusCatalog[family].find((s) => s.value === value)
    if (found) return found
  }
  const found = allDefs.find((s) => s.value === value)
  if (found) return found
  return {
    value,
    label: value.replaceAll('_', ' '),
    tone: 'neutral',
    icon: 'dot',
  }
}

export const toneClass: Record<StatusTone, string> = {
  neutral: 'bg-[var(--color-pending-soft)] text-soe-slate',
  info: 'bg-[var(--color-info-soft)] text-soe-info',
  success: 'bg-[var(--color-success-soft)] text-soe-success',
  warning: 'bg-[var(--color-warning-soft)] text-[#8a6414]',
  critical: 'bg-[var(--color-critical-soft)] text-soe-critical',
}
