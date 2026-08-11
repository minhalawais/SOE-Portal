import { COMPLIANCE_STATUS, DEMO_AS_OF_DATE } from '@/constants'
import { db } from '@/mock-data/db'
import type { Organization } from '@/types/domain'
import { daysUntil } from '@/workflow/boardExpiry'

export interface OrganizationDerivedMetrics {
  organizationId: string
  assetCount: number
  totalBookValue: number
  totalMarketValue: number
  marketBookVariance: number
  boardVacancies: number
  boardExpiringSoon: number
  overdueComplianceCount: number
  openAuditCount: number
  activeLitigationCount: number
  overdueLoanCount: number
  submissionCompletionPct: number
  capacityUtilization?: number
  warningCount: number
}

export function deriveOrganizationMetrics(
  organizationId: string,
  reportingPeriodId = 'period-fy2027',
): OrganizationDerivedMetrics {
  const orgAssets = db.assets.filter((a) => a.organizationId === organizationId)
  const totalBookValue = orgAssets.reduce((s, a) => s + (a.bookValue ?? 0), 0)
  const totalMarketValue = orgAssets.reduce((s, a) => s + (a.marketValue ?? 0), 0)

  const board = db.boardMembers.filter((b) => b.organizationId === organizationId)
  const boardVacancies = board.filter((b) => b.isVacancySlot).length
  const boardExpiringSoon = board.filter(
    (b) =>
      !b.isVacancySlot &&
      daysUntil(b.expiryDate, DEMO_AS_OF_DATE) <= 90 &&
      daysUntil(b.expiryDate, DEMO_AS_OF_DATE) >= 0,
  ).length

  const overdueComplianceCount = db.compliance.filter(
    (c) =>
      c.organizationId === organizationId &&
      (c.status === COMPLIANCE_STATUS.NON_COMPLIANT ||
        daysUntil(c.dueDate, DEMO_AS_OF_DATE) < 0),
  ).length

  const openAuditCount = db.auditParas.filter(
    (a) => a.organizationId === organizationId && a.status !== 'settled',
  ).length

  const activeLitigationCount = db.litigation.filter(
    (l) => l.organizationId === organizationId && l.status === 'active',
  ).length

  const overdueLoanCount = db.loans.filter(
    (l) => l.organizationId === organizationId && l.defaultStatus === 'overdue',
  ).length

  const subs = db.submissions.filter(
    (s) =>
      s.organizationId === organizationId && s.reportingPeriodId === reportingPeriodId,
  )
  const submissionCompletionPct =
    subs.length === 0
      ? 0
      : Math.round(subs.reduce((s, x) => s + x.completeness, 0) / subs.length)

  const industrial = db.industrialPerformance.find(
    (i) =>
      i.organizationId === organizationId && i.reportingPeriodId === reportingPeriodId,
  )

  const warningCount =
    boardVacancies +
    boardExpiringSoon +
    overdueComplianceCount +
    (overdueLoanCount > 0 ? 1 : 0) +
    (openAuditCount > 3 ? 1 : 0)

  return {
    organizationId,
    assetCount: orgAssets.length,
    totalBookValue,
    totalMarketValue,
    marketBookVariance: totalMarketValue - totalBookValue,
    boardVacancies,
    boardExpiringSoon,
    overdueComplianceCount,
    openAuditCount,
    activeLitigationCount,
    overdueLoanCount,
    submissionCompletionPct: Math.min(100, Math.max(0, submissionCompletionPct)),
    capacityUtilization: industrial?.capacityUtilization,
    warningCount,
  }
}

export function derivePortfolioMetrics(orgs?: Organization[]) {
  const list = orgs ?? db.organizations
  return list.map((o) => deriveOrganizationMetrics(o.id))
}
