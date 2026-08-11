/**
 * Phase 22 — move keyboard focus to page heading after client-side navigation.
 */
import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

export function RouteFocus() {
  const location = useLocation()

  useEffect(() => {
    const heading = document.querySelector<HTMLElement>('main h1')
    if (heading) {
      if (!heading.hasAttribute('tabindex')) heading.tabIndex = -1
      heading.focus({ preventScroll: true })
      return
    }
    const main = document.getElementById('main-content')
    main?.focus({ preventScroll: true })
  }, [location.pathname, location.search])

  return null
}
