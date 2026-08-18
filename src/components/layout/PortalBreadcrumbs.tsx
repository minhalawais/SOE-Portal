import { useLocation } from 'react-router-dom'
import { Breadcrumbs } from '@/design-system'
import { findNavTrail, getPortalDefinitionForRole } from '@/app/config/navigation'
import { ROLE } from '@/constants'
import { useActivePortal, useSessionStore } from '@/state/session'

export function PortalBreadcrumbs() {
  const portal = useActivePortal()
  const role = useSessionStore((state) => state.role)
  const location = useLocation()
  const definition = getPortalDefinitionForRole(portal, role)
  const trail = findNavTrail(definition.navigation, location.pathname)

  const shellShowsPortalTitle =
    role === ROLE.EXECUTIVE_VIEWER || role === ROLE.PMO

  // PMO command dashboard uses its own branded page header.
  if (location.pathname === '/pmo/dashboard' || location.pathname === '/pmo') {
    return null
  }

  const trailItems =
    trail?.map((t, idx, arr) => ({
      label: t.label,
      to: idx === arr.length - 1 ? undefined : t.route,
    })) ?? []

  if (shellShowsPortalTitle && trailItems.length > 0) {
    return <Breadcrumbs items={trailItems} />
  }

  const items = [
    { label: definition.name, to: definition.homeRoute },
    ...trailItems,
  ]

  if (!trail || trail.length === 0) {
    return (
      <Breadcrumbs items={[{ label: definition.name }, { label: 'Overview' }]} />
    )
  }

  return <Breadcrumbs items={items} />
}
