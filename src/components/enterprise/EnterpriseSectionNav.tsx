import { NavLink } from 'react-router-dom'
import { MODULE_SECTIONS } from '@/app/config/moduleSections'
import { ModuleSectionNav } from '@/components/soe/ExecutiveModuleSectionNav'
import { cn } from '@/utils'

const tabClassName = (isActive: boolean) =>
  cn(
    'rounded-md px-3 py-1.5 text-sm font-medium',
    isActive ? 'bg-[#12304a] text-white' : 'text-soe-navy hover:bg-white/80',
  )

export function SoeEnterpriseNav() {
  return (
    <ModuleSectionNav
      tabs={MODULE_SECTIONS['soe-enterprise']}
      ariaLabel="Enterprise sections"
    />
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
    <nav
      className="mb-4 inline-flex max-w-full flex-wrap gap-0.5 rounded-lg bg-[#e8eef3] p-0.5"
      aria-label="Enterprise sections"
    >
      {tabs.map((t) => (
        <NavLink key={t.to} to={t.to} end={t.end} className={({ isActive }) => tabClassName(isActive)}>
          {t.label}
        </NavLink>
      ))}
    </nav>
  )
}
