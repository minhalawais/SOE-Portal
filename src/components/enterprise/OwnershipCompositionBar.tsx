import { SHAREHOLDER_CATEGORY_LABEL, type ShareholderCategory } from '@/constants'
import { ownershipComposition } from '@/mock-services/organization.service'
import type { OwnershipLine } from '@/types/domain'

const barTone: Record<string, string> = {
  government: 'bg-soe-navy',
  provincial_government: 'bg-soe-blue',
  private: 'bg-soe-slate',
  foreign: 'bg-[var(--color-warning)]',
  employee: 'bg-soe-teal',
  public: 'bg-[var(--color-info)]',
  institutional: 'bg-[var(--color-success)]',
}

export function OwnershipCompositionBar({ lines }: { lines: OwnershipLine[] }) {
  const parts = ownershipComposition(lines)
  if (!parts.length) {
    return <p className="text-sm text-soe-slate">No shareholding lines on file.</p>
  }

  return (
    <div>
      <div
        className="flex h-3 overflow-hidden rounded-full border border-soe-border"
        role="img"
        aria-label="Ownership composition"
      >
        {parts.map((p) => (
          <div
            key={p.category}
            className={barTone[p.category] ?? 'bg-soe-slate'}
            style={{ width: `${p.percentage}%` }}
            title={`${SHAREHOLDER_CATEGORY_LABEL[p.category as ShareholderCategory]} ${p.percentage}%`}
          />
        ))}
      </div>
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-soe-slate">
        {parts.map((p) => (
          <li key={p.category} className="inline-flex items-center gap-1.5">
            <span
              className={`inline-block h-2 w-2 rounded-full ${barTone[p.category] ?? 'bg-soe-slate'}`}
              aria-hidden
            />
            {SHAREHOLDER_CATEGORY_LABEL[p.category as ShareholderCategory]} {p.percentage}%
          </li>
        ))}
      </ul>
    </div>
  )
}
