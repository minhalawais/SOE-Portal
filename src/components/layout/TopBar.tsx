import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Bell, ListTodo, LogOut, Menu } from 'lucide-react'
import { getPortalDefinitionForRole, roleAllowsOrgSwitch } from '@/app/config/navigation'
import { ROLE, ROLE_LABEL } from '@/constants'
import { DEMO_ROLES, getHomeForRole } from '@/permissions'
import { mockFinanceService, mockOrganizationService } from '@/mock-services'
import { useActivePortal, useSessionStore } from '@/state/session'
import { useUiStore } from '@/state/ui'
import { getValidationRound } from '@/mock-data/validationRounds'
import { IconButton } from '@/design-system'

export function TopBar({ onOpenMobileNav }: { onOpenMobileNav: () => void }) {
  const navigate = useNavigate()
  const {
    role,
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

  const orgsQuery = useQuery({
    queryKey: ['organizations'],
    queryFn: () => mockOrganizationService.getOrganizations({ pageSize: 50 }),
    enabled: portal === 'soe' || canSwitchOrg,
  })
  const periodsQuery = useQuery({
    queryKey: ['reporting-periods'],
    queryFn: () => mockFinanceService.getReportingPeriods(),
  })

  const currentOrg = orgsQuery.data?.items.find((o) => o.id === organizationId)

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

      <div className="hidden min-w-0 flex-col lg:flex">
        <p className="truncate text-xs font-medium text-soe-navy">{definition.name}</p>
        <p className="truncate text-[11px] text-soe-slate">{definition.primaryQuestion}</p>
      </div>

      <div className="ml-auto flex flex-wrap items-center gap-2">
        {portal === 'moip' || role === ROLE.EXECUTIVE_VIEWER ? null : canSwitchOrg ? (
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
        ) : portal === 'soe' ? (
          <span className="rounded-control border border-soe-border bg-soe-canvas px-2 py-1.5 text-xs text-soe-ink">
            {currentOrg ? `${currentOrg.abbreviation}` : 'Organization'}
          </span>
        ) : null}

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

        <IconButton label="Tasks">
          <ListTodo size={16} />
        </IconButton>
        <IconButton label="Notifications">
          <Bell size={16} />
        </IconButton>
        <IconButton label="Sign out" onClick={() => { signOut(); navigate('/login', { replace: true }) }}>
          <LogOut size={16} />
        </IconButton>

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
