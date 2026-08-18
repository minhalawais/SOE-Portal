import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useLocation, useNavigate } from 'react-router-dom'
import { Bell, LogOut, Menu, ScrollText, User } from 'lucide-react'
import { getPortalDefinitionForRole, roleAllowsOrgSwitch } from '@/app/config/navigation'
import { ROLE, ROLE_LABEL } from '@/constants'
import { DEMO_ROLES, getHomeForRole } from '@/permissions'
import { mockFinanceService, mockOrganizationService } from '@/mock-services'
import { useActivePortal, useSessionStore } from '@/state/session'
import { useUiStore } from '@/state/ui'
import { getValidationRound } from '@/mock-data/validationRounds'
import { IconButton } from '@/design-system'
import { cn } from '@/utils'

function userInitials(email?: string) {
  if (!email) return '?'
  const local = email.split('@')[0] ?? ''
  const parts = local.split(/[._-]+/).filter(Boolean)
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase()
  }
  return local.slice(0, 2).toUpperCase() || '?'
}

function displayNameFromEmail(email?: string) {
  if (!email) return 'Signed-in user'
  const local = email.split('@')[0] ?? email
  return local
    .split(/[._-]+/)
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(' ')
}

function logsRoute(portal: ReturnType<typeof useActivePortal>) {
  if (portal === 'moip') return '/moip/logs'
  return '/soe/logs'
}

function alertsRoute(portal: ReturnType<typeof useActivePortal>) {
  if (portal === 'moip') return '/moip/logs'
  if (portal === 'minister') return '/minister/alerts'
  if (portal === 'secretary') return '/secretary/critical'
  return '/soe/alerts'
}

export function TopBar({ onOpenMobileNav }: { onOpenMobileNav: () => void }) {
  const navigate = useNavigate()
  const location = useLocation()
  const {
    role,
    userEmail,
    organizationId,
    reportingPeriodId,
    setRole,
    setOrganizationId,
    setReportingPeriodId,
    toggleSidebar,
    signOut,
  } = useSessionStore()
  const portal = useActivePortal()
  const definition = getPortalDefinitionForRole(portal, role)
  const canSwitchOrg = roleAllowsOrgSwitch(role)
  const presentationMode = useUiStore((s) => s.presentationMode)
  const activeRoundId = useUiStore((s) => s.activeValidationRoundId)
  const activeRound = activeRoundId ? getValidationRound(activeRoundId) : undefined
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)

  const orgsQuery = useQuery({
    queryKey: ['organizations'],
    queryFn: () => mockOrganizationService.getOrganizations({ pageSize: 50 }),
    enabled: portal === 'soe' || canSwitchOrg || role === ROLE.EXECUTIVE_VIEWER,
  })
  const periodsQuery = useQuery({
    queryKey: ['reporting-periods'],
    queryFn: () => mockFinanceService.getReportingPeriods(),
  })

  const currentOrg = orgsQuery.data?.items.find((o) => o.id === organizationId)

  const isExecutiveViewer =
    role === ROLE.EXECUTIVE_VIEWER ||
    portal === 'minister' ||
    portal === 'secretary' ||
    portal === 'pmo'

  const topBarSubtitle = isExecutiveViewer
    ? 'Portfolio and SOE oversight workspace'
    : definition.primaryQuestion

  const logsHref = logsRoute(portal)
  const alertsHref = alertsRoute(portal)
  const logsActive =
    location.pathname.startsWith('/soe/logs') || location.pathname.startsWith('/moip/logs')
  const alertsActive =
    location.pathname.startsWith('/soe/alerts') ||
    location.pathname.startsWith('/secretary/critical') ||
    location.pathname.startsWith('/minister/alerts')

  const initials = useMemo(() => userInitials(userEmail), [userEmail])
  const displayName = useMemo(() => displayNameFromEmail(userEmail), [userEmail])

  useEffect(() => {
    if (!userMenuOpen) return
    function onPointerDown(event: MouseEvent) {
      if (!userMenuRef.current?.contains(event.target as Node)) setUserMenuOpen(false)
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setUserMenuOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [userMenuOpen])

  function handleSignOut() {
    setUserMenuOpen(false)
    signOut()
    navigate('/login', { replace: true })
  }

  return (
    <header className="flex min-h-14 flex-wrap items-center gap-3 border-b border-soe-border bg-white px-4 py-2">
      <button
        type="button"
        className="rounded-control p-2 text-soe-navy hover:bg-soe-canvas md:hidden"
        onClick={onOpenMobileNav}
        aria-label="Open navigation"
      >
        <Menu size={18} />
      </button>
      <button
        type="button"
        className="hidden rounded-control p-2 text-soe-navy hover:bg-soe-canvas md:inline-flex"
        onClick={toggleSidebar}
        aria-label="Toggle sidebar"
      >
        <Menu size={18} />
      </button>

      <div className="hidden min-w-0 flex-col md:flex">
        <p className="truncate text-sm font-semibold text-soe-navy">{definition.name}</p>
        <p className="truncate text-xs text-soe-slate">{topBarSubtitle}</p>
      </div>

      <div className="ml-auto flex flex-wrap items-center gap-1.5">
        {portal === 'moip' ? null : canSwitchOrg ? (
          <label className="flex items-center gap-1 text-xs text-soe-slate">
            Organization
            <select
              className="h-9 rounded-control border border-soe-border bg-white px-2 text-sm text-soe-ink"
              value={organizationId}
              onChange={(e) => setOrganizationId(e.target.value)}
            >
              {(orgsQuery.data?.items ?? []).map((o) => (
                <option key={o.id} value={o.id}>
                  {o.abbreviation} — {o.name}
                </option>
              ))}
            </select>
          </label>
        ) : portal === 'soe' || role === ROLE.EXECUTIVE_VIEWER ? (
          <span className="rounded-control border border-soe-border bg-white px-2.5 py-1.5 text-xs font-medium text-soe-navy">
            {currentOrg ? currentOrg.abbreviation : 'Organization'}
          </span>
        ) : null}

        {!isExecutiveViewer ? (
          <label className="flex items-center gap-1 text-xs text-soe-slate">
            Period
            <select
              className="h-9 rounded-control border border-soe-border bg-white px-2 text-sm text-soe-ink"
              value={reportingPeriodId}
              onChange={(e) => setReportingPeriodId(e.target.value)}
            >
              {(periodsQuery.data ?? []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        {!isExecutiveViewer ? (
          <label className="flex items-center gap-1 text-xs text-soe-slate">
            Workspace view
            <select
              className="h-9 min-w-[160px] rounded-control border border-soe-border bg-white px-2 text-sm text-soe-ink"
              value={role}
              onChange={(e) => {
                const next = e.target.value as typeof role
                setRole(next)
                navigate(getHomeForRole(next))
              }}
            >
              {DEMO_ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABEL[r]}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        {isExecutiveViewer ? (
          <>
            <IconButton
              label="Activity logs"
              className={cn(logsActive && 'bg-soe-canvas ring-1 ring-soe-border')}
              onClick={() => navigate(logsHref)}
            >
              <ScrollText size={16} />
            </IconButton>
            <IconButton
              label="Alerts"
              className={cn(alertsActive && 'bg-soe-canvas ring-1 ring-soe-border')}
              onClick={() => navigate(alertsHref)}
            >
              <Bell size={16} />
            </IconButton>
          </>
        ) : (
          <>
            <IconButton label="Activity logs" onClick={() => navigate('/soe/logs')}>
              <ScrollText size={16} />
            </IconButton>
            <IconButton label="Notifications" onClick={() => navigate('/soe/notifications')}>
              <Bell size={16} />
            </IconButton>
          </>
        )}

        <div ref={userMenuRef} className="relative">
          <button
            type="button"
            aria-label="Account menu"
            aria-expanded={userMenuOpen}
            aria-haspopup="menu"
            onClick={() => setUserMenuOpen((open) => !open)}
            className={cn(
              'inline-flex h-9 w-9 items-center justify-center rounded-full border border-soe-border bg-soe-navy text-xs font-semibold text-white hover:opacity-90',
              userMenuOpen && 'ring-2 ring-soe-blue/30',
            )}
          >
            {initials !== '?' ? initials : <User size={16} aria-hidden />}
          </button>
          {userMenuOpen ? (
            <div
              role="menu"
              className="absolute right-0 top-full z-50 mt-1.5 w-56 rounded-card border border-soe-border bg-white py-1 shadow-[var(--shadow-modal)]"
            >
              <div className="border-b border-soe-border px-3 py-2.5">
                <p className="truncate text-sm font-medium text-soe-navy">{displayName}</p>
                <p className="truncate text-xs text-soe-slate">{userEmail ?? 'Demo session'}</p>
                <p className="mt-0.5 text-[11px] text-soe-slate">{ROLE_LABEL[role] ?? role}</p>
              </div>
              <button
                type="button"
                role="menuitem"
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-soe-ink hover:bg-soe-canvas"
                onClick={handleSignOut}
              >
                <LogOut size={15} aria-hidden />
                Sign out
              </button>
            </div>
          ) : null}
        </div>

        {presentationMode ? (
          <span className="rounded-control bg-[var(--color-surface-teal)] px-2 py-1 text-[11px] font-medium text-soe-teal">
            {activeRound
              ? `Validation R${activeRound.roundNumber}`
              : 'Presentation mode'}
          </span>
        ) : null}
      </div>
    </header>
  )
}
