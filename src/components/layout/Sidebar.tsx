import { useMemo, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { APP_CONFIG } from '@/app/config/app.config'
import {
  filterNavigation,
  getPortalDefinitionForRole,
  type PortalNavigationItem,
} from '@/app/config/navigation'
import { hasPermission } from '@/permissions'
import { useActivePortal, useSessionStore } from '@/state/session'
import { cn } from '@/utils'

function NavBranch({ item, collapsed }: { item: PortalNavigationItem; collapsed: boolean }) {
  const location = useLocation()
  const childActive = item.children?.some(
    (c) => location.pathname === c.route || location.pathname.startsWith(c.route + '/'),
  )
  const [open, setOpen] = useState(Boolean(childActive))

  if (item.children?.length) {
    return (
      <div>
        <button
          type="button"
          className={cn(
            'flex w-full items-center justify-between rounded-control px-3 py-2 text-left text-sm text-white/85 hover:bg-white/10',
            childActive && 'bg-white/5',
          )}
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
        >
          <span>{collapsed ? item.label.slice(0, 1) : item.label}</span>
          {!collapsed ? (open ? <ChevronDown size={14} /> : <ChevronRight size={14} />) : null}
        </button>
        {open && !collapsed ? (
          <div className="ml-2 space-y-0.5 border-l border-white/10 pl-2">
            {item.children.map((child) => (
              <NavBranch key={child.id} item={child} collapsed={collapsed} />
            ))}
          </div>
        ) : null}
      </div>
    )
  }

  return (
    <NavLink
      to={item.route}
      className={({ isActive }) =>
        cn(
          'block rounded-control px-3 py-2 text-sm text-white/85 hover:bg-white/10',
          isActive && 'bg-soe-blue text-white',
          item.enabled === false && 'opacity-70',
        )
      }
      title={item.enabled === false ? 'Feature not enabled yet' : item.label}
    >
      {collapsed ? item.label.slice(0, 1) : item.label}
    </NavLink>
  )
}

export function Sidebar() {
  const role = useSessionStore((s) => s.role)
  const collapsed = useSessionStore((s) => s.sidebarCollapsed)
  const portal = useActivePortal()
  const definition = getPortalDefinitionForRole(portal, role)

  const items = useMemo(
    () => filterNavigation(definition.navigation, role, hasPermission),
    [definition.navigation, role],
  )

  return (
    <aside
      className={cn(
        'hidden h-full flex-col bg-soe-navy text-white transition-all md:flex',
        collapsed ? 'w-[72px]' : 'w-[260px]',
        definition.density === 'executive' && 'shadow-[inset_-1px_0_0_rgba(255,255,255,0.04)]',
      )}
    >
      <div className={cn('border-b border-white/10 py-4', collapsed ? 'px-3' : 'px-4')}>
        <div className={cn('flex items-center', collapsed ? 'justify-center' : 'gap-3')}>
          <div
            className={cn(
              'flex shrink-0 items-center justify-center overflow-hidden rounded-[6px] border border-white/15 bg-white shadow-[0_4px_12px_rgba(0,0,0,.18)]',
              collapsed ? 'h-10 w-10 p-1' : 'h-12 w-12 p-1.5',
            )}
          >
            <img
              src="/images/MOIP Logo.png"
              alt="Ministry of Industries and Production"
              className="h-full w-full object-contain"
            />
          </div>
          {!collapsed ? (
            <div className="min-w-0">
              <p className="text-[10px] font-medium uppercase leading-4 text-white/65">
                Ministry of Industries &amp; Production
              </p>
              <p className="mt-0.5 text-base font-semibold text-white">{APP_CONFIG.APP_NAME}</p>
            </div>
          ) : null}
        </div>
        {!collapsed ? (
          <p className="mt-3 text-[11px] leading-snug text-white/55">{definition.name}</p>
        ) : null}
      </div>
      <nav className="scrollbar-navy flex-1 space-y-1 overflow-y-auto p-2" aria-label="Primary">
        {items.map((item) => (
          <NavBranch key={item.id} item={item} collapsed={collapsed} />
        ))}
      </nav>
    </aside>
  )
}
