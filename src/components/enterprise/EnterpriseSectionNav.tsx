import { NavLink } from 'react-router-dom'
import { cn } from '@/utils'

const soeTabs = [
  { to: '/soe/enterprise/profile', label: 'Profile' },
  { to: '/soe/enterprise/ownership', label: 'Ownership' },
  { to: '/soe/enterprise/structure', label: 'Structure' },
  { to: '/soe/enterprise/locations', label: 'Locations' },
  { to: '/soe/enterprise/history', label: 'History' },
]

export function SoeEnterpriseNav() {
  return (
    <nav className="mb-4 flex flex-wrap gap-1 border-b border-soe-border pb-2" aria-label="Enterprise sections">
      {soeTabs.map((t) => (
        <NavLink
          key={t.to}
          to={t.to}
          className={({ isActive }) =>
            cn(
              'rounded-md px-3 py-1.5 text-sm font-medium text-soe-slate hover:bg-[var(--color-pending-soft)]',
              isActive && 'bg-[var(--color-info-soft)] text-soe-navy',
            )
          }
        >
          {t.label}
        </NavLink>
      ))}
    </nav>
  )
}

export function MoipEnterpriseNav({ organizationId }: { organizationId: string }) {
  const tabs = [
    { to: `/moip/enterprise/${organizationId}`, label: 'Profile', end: true },
    { to: `/moip/enterprise/${organizationId}/ownership`, label: 'Ownership' },
    { to: `/moip/enterprise/${organizationId}/structure`, label: 'Structure' },
    { to: `/moip/enterprise/${organizationId}/locations`, label: 'Locations' },
    { to: `/moip/enterprise/${organizationId}/history`, label: 'History' },
  ]
  return (
    <nav className="mb-4 flex flex-wrap gap-1 border-b border-soe-border pb-2" aria-label="Enterprise sections">
      {tabs.map((t) => (
        <NavLink
          key={t.to}
          to={t.to}
          end={t.end}
          className={({ isActive }) =>
            cn(
              'rounded-md px-3 py-1.5 text-sm font-medium text-soe-slate hover:bg-[var(--color-pending-soft)]',
              isActive && 'bg-[var(--color-info-soft)] text-soe-navy',
            )
          }
        >
          {t.label}
        </NavLink>
      ))}
    </nav>
  )
}
