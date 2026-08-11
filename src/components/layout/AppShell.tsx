import { useState, type PropsWithChildren } from 'react'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { MobileNavDrawer } from './MobileNavDrawer'
import { PortalBreadcrumbs } from './PortalBreadcrumbs'
import { RouteFocus } from './RouteFocus'
import { useUiStore } from '@/state/ui'
import { Button } from '@/design-system'
import { getPortalDefinitionForRole } from '@/app/config/navigation'
import { useActivePortal, useSessionStore } from '@/state/session'
import { cn } from '@/utils'

export function AppShell({ children }: PropsWithChildren) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const toasts = useUiStore((s) => s.toasts)
  const dismissToast = useUiStore((s) => s.dismissToast)
  const portal = useActivePortal()
  const role = useSessionStore((s) => s.role)
  const definition = getPortalDefinitionForRole(portal, role)

  return (
    <div className="flex h-screen overflow-hidden bg-soe-canvas">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-control focus:bg-white focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-soe-navy focus:shadow-[var(--shadow-modal)]"
      >
        Skip to main content
      </a>
      <Sidebar />
      <MobileNavDrawer open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar onOpenMobileNav={() => setMobileNavOpen(true)} />
        <main
          id="main-content"
          tabIndex={-1}
          className={cn(
            'flex-1 overflow-auto p-4 md:p-6 outline-none',
            definition.density === 'executive' && 'md:p-7',
          )}
        >
          <RouteFocus />
          <PortalBreadcrumbs />
          {children}
        </main>
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
