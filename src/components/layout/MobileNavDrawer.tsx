import { useMemo, useRef } from 'react'
import { NavLink } from 'react-router-dom'
import { X } from 'lucide-react'
import {
  filterNavigation,
  getPortalDefinitionForRole,
  type PortalNavigationItem,
} from '@/app/config/navigation'
import { hasPermission } from '@/permissions'
import { ROLE } from '@/constants'
import { useActivePortal, useSessionStore } from '@/state/session'
import { IconButton } from '@/design-system'
import { useFocusTrap } from '@/utils/focusTrap'
import { cn } from '@/utils'

function FlatLinks({
  items,
  onNavigate,
}: {
  items: PortalNavigationItem[]
  onNavigate: () => void
}) {
  return (
    <ul className="space-y-1">
      {items.map((item) => {
        if (item.children?.length) {
          return (
            <li key={item.id} className="pt-2">
              <p className="px-2 text-[11px] font-semibold uppercase tracking-wide text-white/50">
                {item.label}
              </p>
              <FlatLinks items={item.children} onNavigate={onNavigate} />
            </li>
          )
        }
        return (
          <li key={item.id}>
            <NavLink
              to={item.route}
              end
              onClick={onNavigate}
              className={({ isActive }) =>
                cn(
                  'block rounded-control px-3 py-2 text-sm text-white/90 hover:bg-white/10',
                  isActive && 'bg-soe-blue',
                )
              }
            >
              {item.label}
            </NavLink>
          </li>
        )
      })}
    </ul>
  )
}

export function MobileNavDrawer({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const role = useSessionStore((s) => s.role)
  const portal = useActivePortal()
  const definition = getPortalDefinitionForRole(portal, role)
  const panelRef = useRef<HTMLElement>(null)
  useFocusTrap(open, panelRef, onClose)
  const items = useMemo(
    () =>
      filterNavigation(
        definition.navigation,
        role,
        (currentRole, permission) =>
          currentRole === ROLE.SOE_FOCAL_PERSON || hasPermission(currentRole, permission),
      ),
    [definition.navigation, role],
  )

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      <button
        type="button"
        className="absolute inset-0 bg-soe-navy/50"
        aria-label="Close navigation"
        onClick={onClose}
        tabIndex={-1}
      />
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="mobile-nav-title"
        className="absolute left-0 top-0 flex h-full w-[min(280px,88vw)] flex-col bg-soe-navy text-white shadow-[var(--shadow-modal)]"
      >
        <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-[6px] border border-white/15 bg-white p-1 shadow-[0_4px_12px_rgba(0,0,0,.18)]">
              <img
                src="/images/MOIP Logo.png"
                alt="Ministry of Industries and Production"
                className="h-full w-full object-contain"
              />
            </div>
            <div className="min-w-0">
              <p className="text-[9px] font-medium uppercase leading-3 text-white/60">
                Ministry of Industries &amp; Production
              </p>
              <p id="mobile-nav-title" className="mt-0.5 truncate text-sm font-semibold">
                {definition.name}
              </p>
            </div>
          </div>
          <IconButton label="Close navigation" onClick={onClose} className="text-white hover:bg-white/10">
            <X size={16} />
          </IconButton>
        </div>
        <nav className="scrollbar-navy flex-1 overflow-y-auto p-3" aria-label="Portal navigation">
          <FlatLinks items={items} onNavigate={onClose} />
        </nav>
      </aside>
    </div>
  )
}
