import { Link } from 'react-router-dom'
import {
  LEGAL_STATUS_LABEL,
  SOE_STATUS_LABEL,
  type LegalStatus,
  type SoeStatus,
} from '@/constants'
import { StatusBadge } from '@/design-system/components/StatusBadge'
import type { Organization } from '@/types/domain'

interface EnterpriseHeaderProps {
  organization: Organization
  reportingPeriodLabel?: string
  detailBasePath?: string
}

export function EnterpriseHeader({
  organization,
  reportingPeriodLabel,
  detailBasePath,
}: EnterpriseHeaderProps) {
  const legalLabel =
    LEGAL_STATUS_LABEL[organization.legalStatus as LegalStatus] ?? organization.legalStatus
  const statusLabel =
    SOE_STATUS_LABEL[organization.status as SoeStatus] ?? organization.status

  return (
    <header className="mb-4 rounded-card border border-soe-border bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-soe-slate">
            {organization.abbreviation}
          </p>
          <h2 className="text-lg font-semibold text-soe-navy">
            {detailBasePath ? (
              <Link className="hover:underline" to={detailBasePath}>
                {organization.name}
              </Link>
            ) : (
              organization.name
            )}
          </h2>
          <p className="mt-1 text-sm text-soe-slate">
            {organization.sector}
            {organization.subSector ? ` · ${organization.subSector}` : ''}
            {reportingPeriodLabel ? ` · Period ${reportingPeriodLabel}` : ''}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={organization.status} label={statusLabel} />
          <span className="rounded-full bg-[var(--color-pending-soft)] px-2.5 py-0.5 text-[11px] font-semibold text-soe-slate">
            {legalLabel}
          </span>
          <span className="rounded-full bg-[var(--color-info-soft)] px-2.5 py-0.5 text-[11px] font-semibold text-soe-info">
            Gov ownership {organization.governmentOwnershipPct}%
          </span>
        </div>
      </div>
    </header>
  )
}
