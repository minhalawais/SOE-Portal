import { useEffect, useState, type PropsWithChildren } from 'react'
import { useLocation } from 'react-router-dom'
import { Menu } from 'lucide-react'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { MobileNavDrawer } from './MobileNavDrawer'
import { PortalBreadcrumbs } from './PortalBreadcrumbs'
import { PoweredByFooter } from './PoweredByFooter'
import { RouteFocus } from './RouteFocus'
import { useUiStore } from '@/state/ui'
import { Button } from '@/design-system'
import { getPortalDefinitionForRole } from '@/app/config/navigation'
import { useActivePortal, useSessionStore } from '@/state/session'
import { cn } from '@/utils'

export function AppShell({ children }: PropsWithChildren) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const location = useLocation()
  const toasts = useUiStore((s) => s.toasts)
  const dismissToast = useUiStore((s) => s.dismissToast)
  const portal = useActivePortal()
  const role = useSessionStore((s) => s.role)
  const setSidebarCollapsed = useSessionStore((s) => s.setSidebarCollapsed)
  const definition = getPortalDefinitionForRole(portal, role)
  const isPmDashboard = location.pathname === '/pmo/dashboard'

  useEffect(() => {
    if (isPmDashboard) setSidebarCollapsed(true)
  }, [isPmDashboard, setSidebarCollapsed])

  return (
    <div className="flex h-dvh min-h-0 overflow-hidden bg-soe-canvas">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-control focus:bg-white focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-soe-navy focus:shadow-[var(--shadow-modal)]"
      >
        Skip to main content
      </a>
      <Sidebar />
      <MobileNavDrawer open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        {isPmDashboard ? (
          <button
            type="button"
            className="fixed left-3 top-3 z-50 rounded-control bg-white p-2 text-soe-navy shadow-md md:hidden"
            onClick={() => setMobileNavOpen(true)}
            aria-label="Open navigation"
          >
            <Menu size={18} />
          </button>
        ) : (
          <TopBar onOpenMobileNav={() => setMobileNavOpen(true)} />
        )}
        <main
          id="main-content"
          tabIndex={-1}
          className={cn(
            'min-h-0 flex-1 overflow-auto overscroll-y-contain p-4 outline-none md:p-6',
            definition.density === 'executive' && 'md:p-7',
            isPmDashboard && '!p-0',
          )}
        >
          <RouteFocus />
          <PortalBreadcrumbs />
          {children}
        </main>
        <PoweredByFooter />
      </div>
      <div
        className="pointer-events-none fixed bottom-4 right-4 z-[70] flex w-[min(20rem,calc(100vw-2rem))] flex-col gap-2"
        aria-live="polite"
        aria-relevant="additions"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className="pointer-events-auto rounded-card border border-soe-border bg-white p-3 shadow-[var(--shadow-card)]"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm text-soe-ink">{t.title}</p>
              <Button variant="tertiary" size="sm" onClick={() => dismissToast(t.id)}>
                Dismiss
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
