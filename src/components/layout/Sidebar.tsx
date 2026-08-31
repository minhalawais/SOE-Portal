import { useEffect, useMemo, useRef, useState, type ComponentType } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  Activity,
  BarChart3,
  Bell,
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  Factory,
  FileBarChart,
  FileText,
  FolderOpen,
  GitBranch,
  LayoutDashboard,
  LayoutGrid,
  MapPin,
  MessageSquareWarning,
  Scale,
  ScrollText,
  Search,
  ShieldCheck,
  Users,
  Wallet,
  Warehouse,
} from 'lucide-react'
import { APP_CONFIG } from '@/app/config/app.config'
import {
  filterNavigation,
  getPortalDefinitionForRole,
  type PortalNavigationItem,
} from '@/app/config/navigation'
import { hasPermission } from '@/permissions'
import { ROLE } from '@/constants'
import { useActivePortal, useSessionStore } from '@/state/session'
import { cn } from '@/utils'

const NAV_ICONS: Record<string, ComponentType<{ size?: number; className?: string }>> = {
  // Dashboards
  'pmo-command': LayoutDashboard,
  'soe-dashboard': LayoutDashboard,
  'soe-review-dashboard': LayoutDashboard,
  'soe-executive-dashboard': LayoutDashboard,
  'moip-dashboard': LayoutDashboard,
  'moip-exec-dashboard': LayoutDashboard,
  'secretary-dashboard': LayoutDashboard,
  'minister-dashboard': LayoutDashboard,
  'pmo-dashboard': LayoutDashboard,
  'assurance-dashboard': LayoutDashboard,

  // Submissions & Review
  'soe-submissions': ClipboardCheck,
  'soe-review-submissions': ClipboardCheck,
  'soe-cert-submissions': ClipboardCheck,
  'moip-review': ClipboardCheck,
  'moip-queue': ClipboardCheck,
  'moip-review-packages': FolderOpen,
  'moip-clarifications': MessageSquareWarning,
  'moip-approvals': CheckCircle2,

  // Portfolio & Enterprise
  'soe-enterprise': Building2,
  'moip-portfolio': Building2,
  'moip-portfolio-data': Building2,
  'moip-soe-management': Building2,
  'moip-soe-registry': Building2,
  'moip-module-enterprise': Building2,

  // Assets & GIS Map
  'soe-assets': Warehouse,
  'moip-module-assets': Warehouse,
  'moip-asset-map': MapPin,
  'moip-exec-map': MapPin,

  // People & Workforce & Board
  'soe-people': Users,
  'moip-module-workforce': Users,
  'moip-module-board': Users,
  'moip-module-executives': Users,
  'moip-user-admin': Users,
  'moip-users': Users,

  // Finance & Fiscal
  'soe-finance': Wallet,
  'moip-module-finance': Wallet,
  'moip-module-loans': Wallet,

  // Compliance, Accountability, Audit
  'soe-accountability': Scale,
  'moip-module-procurement': Scale,
  'moip-module-audit': Scale,
  'moip-module-litigation': Scale,
  'moip-module-compliance': ShieldCheck,
  'moip-administration': ShieldCheck,
  'soe-cert-compliance': ShieldCheck,

  // Industrial & Privatization
  'soe-industrial': Factory,
  'moip-module-industrial': Factory,
  'soe-privatization': GitBranch,
  'moip-module-privatization': GitBranch,

  // Reports & Analytics
  'soe-reports': FileBarChart,
  'soe-executive-reports': FileBarChart,
  'moip-reports': FileBarChart,
  'moip-exec-reports': FileBarChart,
  'moip-performance-comparison': BarChart3,
  'moip-dq': CheckCircle2,
  'moip-intelligence': Activity,

  // Search
  'soe-search': Search,
  'soe-executive-search': Search,
  'moip-search': Search,
  'moip-exec-search': Search,

  // Documents
  'soe-documents': FolderOpen,
  'soe-cert-documents': FileText,
  'moip-module-documents': FolderOpen,

  // Logs & Alerts
  'soe-logs-alerts': ScrollText,
  'soe-logs-centre': ScrollText,
  'soe-alerts': Bell,
  'soe-review-alerts': ScrollText,
  'soe-review-logs': ScrollText,
  'soe-review-alert-list': Bell,
  'soe-cert-logs-alerts': ScrollText,
  'soe-cert-logs-centre': ScrollText,
  'soe-cert-alerts': Bell,
  'moip-logs': ScrollText,
  'moip-access-audit': ScrollText,
}

function navIcon(id: string) {
  if (NAV_ICONS[id]) return NAV_ICONS[id]
  const lower = id.toLowerCase()
  if (lower.includes('dashboard')) return LayoutDashboard
  if (lower.includes('submission') || lower.includes('review') || lower.includes('queue')) return ClipboardCheck
  if (lower.includes('alert')) return Bell
  if (lower.includes('log') || lower.includes('activity')) return ScrollText
  if (lower.includes('search')) return Search
  if (lower.includes('asset') || lower.includes('land') || lower.includes('building')) return Warehouse
  if (lower.includes('map')) return MapPin
  if (lower.includes('people') || lower.includes('user') || lower.includes('workforce') || lower.includes('board')) return Users
  if (lower.includes('finance') || lower.includes('loan') || lower.includes('fiscal')) return Wallet
  if (lower.includes('report')) return FileBarChart
  if (lower.includes('document')) return FolderOpen
  if (lower.includes('industrial') || lower.includes('factory')) return Factory
  if (lower.includes('privatization') || lower.includes('branch')) return GitBranch
  if (lower.includes('accountability') || lower.includes('audit') || lower.includes('legal') || lower.includes('litigation') || lower.includes('procurement')) return Scale
  if (lower.includes('compliance') || lower.includes('admin') || lower.includes('security')) return ShieldCheck
  if (lower.includes('enterprise') || lower.includes('portfolio') || lower.includes('soe') || lower.includes('registry')) return Building2
  return LayoutGrid
}

function matchesRoute(
  pathname: string,
  route: string,
  siblings: PortalNavigationItem[] = [],
): boolean {
  if (pathname === route) return true
  if (!pathname.startsWith(`${route}/`)) return false
  const moreSpecific = siblings.some(
    (peer) =>
      peer.route !== route &&
      peer.route.length > route.length &&
      (pathname === peer.route || pathname.startsWith(`${peer.route}/`)),
  )
  return !moreSpecific
}

function isBranchActive(pathname: string, item: PortalNavigationItem, siblings: PortalNavigationItem[] = []): boolean {
  if (item.children?.length) {
    return item.children.some((child) => isBranchActive(pathname, child, item.children!))
  }
  return matchesRoute(pathname, item.route, siblings)
}

function FlyoutLinks({
  items,
  depth = 0,
  onNavigate,
}: {
  items: PortalNavigationItem[]
  depth?: number
  onNavigate: () => void
}) {
  return (
    <ul className={cn('space-y-0.5', depth > 0 && 'ml-2 border-l border-soe-border pl-2')}>
      {items.map((item) => {
        if (item.children?.length) {
          return (
            <li key={item.id} className="pt-1">
              <p
                className={cn(
                  'px-2 py-1 font-medium text-soe-ink',
                  depth === 0 ? 'text-xs' : 'text-[11px] text-soe-slate',
                )}
              >
                {item.label}
              </p>
              <FlyoutLinks
                items={item.children}
                depth={depth + 1}
                onNavigate={onNavigate}
              />
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
                  'block rounded-control px-2 py-1.5 text-sm text-soe-ink hover:bg-soe-canvas',
                  isActive && 'bg-soe-canvas font-medium text-soe-blue',
                  item.enabled === false && 'opacity-70',
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

function CollapsedNavItem({
  item,
  siblings,
  open,
  onToggle,
  onClose,
}: {
  item: PortalNavigationItem
  siblings: PortalNavigationItem[]
  open: boolean
  onToggle: () => void
  onClose: () => void
}) {
  const location = useLocation()
  const rootRef = useRef<HTMLDivElement>(null)
  const Icon = navIcon(item.id)
  const active = isBranchActive(location.pathname, item, siblings)

  useEffect(() => {
    if (!open) return
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) onClose()
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open, onClose])

  const iconCell = (
    <span
      className={cn(
        'flex h-10 w-10 items-center justify-center rounded-control transition-colors',
        active ? 'bg-soe-blue text-white' : 'text-white/85 hover:bg-white/10',
      )}
    >
      <Icon size={18} aria-hidden />
    </span>
  )

  if (item.children?.length) {
    return (
      <div ref={rootRef} className="relative flex justify-center">
        <button
          type="button"
          className={cn(
            'relative flex items-center justify-center rounded-control',
            active && 'before:absolute before:-left-2 before:top-1 before:h-8 before:w-0.5 before:rounded-full before:bg-soe-blue',
          )}
          aria-expanded={open}
          aria-haspopup="true"
          title={item.label}
          onClick={onToggle}
        >
          {iconCell}
        </button>
        {open ? (
          <div
            role="menu"
            aria-label={item.label}
            className="absolute left-full top-0 z-50 ml-2 w-56 rounded-card border border-soe-border bg-white p-2 shadow-[var(--shadow-modal)]"
          >
            <p className="mb-1 border-b border-soe-border px-2 pb-2 text-xs font-semibold text-soe-navy">
              {item.label}
            </p>
            <FlyoutLinks items={item.children} onNavigate={onClose} />
          </div>
        ) : null}
      </div>
    )
  }

  return (
    <div className="relative flex justify-center">
      <NavLink
        to={item.route}
        end
        title={item.enabled === false ? 'Feature not enabled yet' : item.label}
        onClick={onClose}
        className={({ isActive }) =>
          cn(
            'relative flex items-center justify-center rounded-control',
            (isActive || active) &&
              'before:absolute before:-left-2 before:top-1 before:h-8 before:w-0.5 before:rounded-full before:bg-soe-blue',
          )
        }
      >
        {({ isActive }) => (
          <span
            className={cn(
              'flex h-10 w-10 items-center justify-center rounded-control transition-colors',
              isActive || active ? 'bg-soe-blue text-white' : 'text-white/85 hover:bg-white/10',
              item.enabled === false && 'opacity-70',
            )}
          >
            <Icon size={18} aria-hidden />
          </span>
        )}
      </NavLink>
    </div>
  )
}

function CollapsedNavRail({ items }: { items: PortalNavigationItem[] }) {
  const location = useLocation()
  const [openId, setOpenId] = useState<string | null>(null)

  useEffect(() => {
    setOpenId(null)
  }, [location.pathname])

  return (
    <div className="flex flex-col items-center gap-1">
      {items.map((item) => (
        <CollapsedNavItem
          key={item.id}
          item={item}
          siblings={items}
          open={openId === item.id}
          onToggle={() => setOpenId((current) => (current === item.id ? null : item.id))}
          onClose={() => setOpenId(null)}
        />
      ))}
    </div>
  )
}

function NavBranch({ item }: { item: PortalNavigationItem }) {
  const location = useLocation()
  const childActive = item.children?.some((child) =>
    isBranchActive(location.pathname, child, item.children!),
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
          <span>{item.label}</span>
          {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>
        {open ? (
          <div className="ml-2 space-y-0.5 border-l border-white/10 pl-2">
            {item.children.map((child) => (
              <NavBranch key={child.id} item={child} />
            ))}
          </div>
        ) : null}
      </div>
    )
  }

  return (
    <NavLink
      to={item.route}
      end
      className={({ isActive }) =>
        cn(
          'block rounded-control px-3 py-2 text-sm text-white/85 hover:bg-white/10',
          isActive && 'bg-soe-blue text-white',
          item.enabled === false && 'opacity-70',
        )
      }
      title={item.enabled === false ? 'Feature not enabled yet' : item.label}
    >
      {item.label}
    </NavLink>
  )
}

export function Sidebar() {
  const role = useSessionStore((s) => s.role)
  const collapsed = useSessionStore((s) => s.sidebarCollapsed)
  const setSidebarCollapsed = useSessionStore((s) => s.setSidebarCollapsed)
  const portal = useActivePortal()
  const definition = getPortalDefinitionForRole(portal, role)

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

  return (
    <aside
      className={cn(
        'hidden h-full flex-col bg-soe-navy text-white transition-all md:flex',
        collapsed ? 'w-16' : 'w-[260px]',
        definition.density === 'executive' && 'shadow-[inset_-1px_0_0_rgba(255,255,255,0.04)]',
      )}
    >
      <div className={cn('border-b border-white/10 py-4', collapsed ? 'px-2' : 'px-4')}>
        <div className={cn('flex items-center', collapsed ? 'justify-center' : 'gap-3')}>
          {collapsed ? (
            <button
              type="button"
              onClick={() => setSidebarCollapsed(false)}
              aria-label="Expand sidebar"
              title="Expand sidebar"
              className={cn(
                'flex shrink-0 items-center justify-center overflow-hidden rounded-[6px] border border-white/15 bg-white shadow-[0_4px_12px_rgba(0,0,0,.18)] transition-opacity hover:opacity-90',
                'h-9 w-9 p-1',
              )}
            >
              <img
                src="/images/MOIP Logo.png"
                alt="Ministry of Industries and Production"
                className="h-full w-full object-contain"
              />
            </button>
          ) : (
            <div
              className={cn(
                'flex shrink-0 items-center justify-center overflow-hidden rounded-[6px] border border-white/15 bg-white shadow-[0_4px_12px_rgba(0,0,0,.18)]',
                'h-12 w-12 p-1.5',
              )}
            >
              <img
                src="/images/MOIP Logo.png"
                alt="Ministry of Industries and Production"
                className="h-full w-full object-contain"
              />
            </div>
          )}
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
      <nav className="scrollbar-navy flex-1 overflow-y-auto p-2" aria-label="Primary">
        {collapsed ? (
          <CollapsedNavRail items={items} />
        ) : (
          items.map((item) => <NavBranch key={item.id} item={item} />)
        )}
      </nav>
    </aside>
  )
}
