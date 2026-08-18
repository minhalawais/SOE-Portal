import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { portalHome } from '@/app/config/navigation'
import { useActivePortal, useSessionStore } from '@/state/session'
import { getHomeForRole, hasPermission, type Permission } from '@/permissions'
import { ErrorState } from '@/design-system/components/Feedback'
import { Component, useLayoutEffect, type ErrorInfo, type ReactNode } from 'react'
import { canRoleAccessPortal } from '@/app/router/access'
import { PORTAL, ROLE } from '@/constants'

export function PortalLayout() {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  )
}

export function RequireAuthentication() {
  const isAuthenticated = useSessionStore((state) => state.isAuthenticated)
  const location = useLocation()
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: `${location.pathname}${location.search}` }} />
  }
  return <PortalLayout />
}

export function RequirePortal({ portal }: { portal: keyof typeof portalHome }) {
  const active = useActivePortal()
  const role = useSessionStore((s) => s.role)
  if (canRoleAccessPortal(role, portal)) {
    return <Outlet />
  }
  if (active !== portal) {
    return <Navigate to={getHomeForRole(role)} replace />
  }
  return <Outlet />
}

export function RequirePermission({
  permission,
  children,
}: {
  permission: Permission
  children: ReactNode
}) {
  const role = useSessionStore((s) => s.role)
  if (!hasPermission(role, permission)) {
    return (
      <ErrorState
        title="Access denied"
        detail="Your current demo role does not include this permission."
      />
    )
  }
  return children
}

export function RoleHomeRedirect() {
  const isAuthenticated = useSessionStore((s) => s.isAuthenticated)
  const role = useSessionStore((s) => s.role)
  const setRole = useSessionStore((s) => s.setRole)

  useLayoutEffect(() => {
    if (isAuthenticated && !canRoleAccessPortal(role, PORTAL.PMO)) {
      setRole(ROLE.EXECUTIVE_VIEWER)
    }
  }, [isAuthenticated, role, setRole])

  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (!canRoleAccessPortal(role, PORTAL.PMO)) return null
  return <Navigate to="/pmo/dashboard" replace />
}

/** Authenticated app entry — always PM Dashboard. */
export function AuthenticatedEntryRedirect() {
  return <Navigate to="/pmo/dashboard" replace />
}

interface BoundaryState {
  hasError: boolean
  message?: string
}

export class AppErrorBoundary extends Component<
  { children: ReactNode },
  BoundaryState
> {
  state: BoundaryState = { hasError: false }

  static getDerivedStateFromError(error: Error): BoundaryState {
    return { hasError: true, message: error.message }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('SOE-GAIP boundary', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8">
          <ErrorState
            title="Application error"
            detail={this.state.message ?? 'An unexpected error occurred.'}
          />
        </div>
      )
    }
    return this.props.children
  }
}

export function NotFoundPage() {
  const location = useLocation()
  const isAuthenticated = useSessionStore((state) => state.isAuthenticated)
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return (
    <AppShell>
      <ErrorState title="Page not found" detail={`No route for ${location.pathname}`} />
    </AppShell>
  )
}
