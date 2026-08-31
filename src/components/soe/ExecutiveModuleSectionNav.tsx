import type { ReactNode } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  MODULE_SECTIONS,
  isModuleSectionTabActive,
  type ModuleSectionId,
  type ModuleSectionTab,
} from '@/app/config/moduleSections'
import { ROLE } from '@/constants'
import { useActivePortal, useSessionStore } from '@/state/session'
import { cn } from '@/utils'

export function useShowExecutiveModuleSectionNav(): boolean {
  const portal = useActivePortal()
  const role = useSessionStore((s) => s.role)
  return (
    portal === 'soe_entry' ||
    (portal === 'minister' || portal === 'pmo') &&
    (role === ROLE.EXECUTIVE_VIEWER || role === ROLE.PMO)
  )
}

function portalTabPath(path: string, portal: ReturnType<typeof useActivePortal>) {
  if (portal === 'soe_entry') return path.replace(/^\/soe(?=\/|$)/, '/soe-entry')
  if (portal === 'soe_review') return path.replace(/^\/soe(?=\/|$)/, '/soe-review')
  return path
}

function tabClassName(active: boolean) {
  return cn(
    'rounded-md px-3 py-1.5 text-sm font-medium',
    active ? 'bg-[#12304a] text-white' : 'text-soe-navy hover:bg-white/80',
  )
}

export function ModuleSectionNav({
  tabs,
  ariaLabel,
}: {
  tabs: readonly ModuleSectionTab[]
  ariaLabel: string
}) {
  const { pathname } = useLocation()
  const portal = useActivePortal()

  return (
    <nav
      className="mb-4 inline-flex max-w-full flex-wrap gap-0.5 rounded-lg bg-[#e8eef3] p-0.5"
      aria-label={ariaLabel}
    >
      {tabs.map((tab) => {
        const active = isModuleSectionTabActive(tab, pathname, tabs)
        return (
          <NavLink
            key={tab.to}
            to={portalTabPath(tab.to, portal)}
            end={tab.end}
            className={() => tabClassName(active)}
            aria-current={active ? 'page' : undefined}
          >
            {tab.label}
          </NavLink>
        )
      })}
    </nav>
  )
}

export function ExecutiveModuleSectionNav({ moduleId }: { moduleId: ModuleSectionId }) {
  const show = useShowExecutiveModuleSectionNav()
  if (!show) return null

  return (
    <ModuleSectionNav
      tabs={MODULE_SECTIONS[moduleId]}
      ariaLabel={`${moduleId.replace('soe-', '').replace('-', ' ')} sections`}
    />
  )
}

/** Level 1: Executive / Board Member / Workforce. Level 2 (optional): workforce registry tabs. */
export function ExecutivePeopleSectionNav({ workforceTabs }: { workforceTabs?: ReactNode }) {
  const show = useShowExecutiveModuleSectionNav()

  if (!show && !workforceTabs) return null

  return (
    <>
      {show ? (
        <ModuleSectionNav
          tabs={MODULE_SECTIONS['soe-people']}
          ariaLabel="People & Governance sections"
        />
      ) : null}
      {workforceTabs ? (
        <nav className="mb-4 border-b border-soe-border pb-2" aria-label="Workforce forms">
          {workforceTabs}
        </nav>
      ) : null}
    </>
  )
}
