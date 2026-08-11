import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AppProviders } from '@/app/providers/AppProviders'
import { AppRouter } from '@/app/router'
import { ROLE } from '@/constants'
import { resetMockDb } from '@/mock-data'
import { mockExecutiveDashboardService, setMockLatencyMode } from '@/mock-services'
import { useSessionStore } from '@/state/session'

vi.mock('@/components/gis/NationalAssetMapCanvas', () => ({
  NationalAssetMapCanvas: () => <div aria-label="National asset map" />,
}))

describe('Executive Viewer dashboards', () => {
  beforeEach(() => {
    resetMockDb()
    setMockLatencyMode('none')
    vi.stubGlobal(
      'ResizeObserver',
      class ResizeObserverMock {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    )
    useSessionStore.setState({ role: ROLE.EXECUTIVE_VIEWER })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    window.history.pushState({}, '', '/')
  })

  it('aggregates all Minister strategic domains', async () => {
    const dashboard = await mockExecutiveDashboardService.getMinisterDashboard({
      reportingPeriodId: 'period-fy2027',
    })

    expect(dashboard.metrics).toHaveLength(8)
    expect(dashboard.statusDistribution.reduce((sum, item) => sum + item.value, 0)).toBeGreaterThan(0)
    expect(dashboard.profitLossTrend.length).toBeGreaterThan(1)
    expect(dashboard.riskMatrix.length).toBeGreaterThan(0)
    expect(dashboard.gisAssets.length).toBeGreaterThan(0)
    expect(dashboard.confidence).toBeGreaterThanOrEqual(0)
    expect(dashboard.confidence).toBeLessThanOrEqual(100)
  })

  it('aggregates Secretary controls missing from the former command centre', async () => {
    const dashboard = await mockExecutiveDashboardService.getSecretaryDashboard({
      reportingPeriodId: 'period-fy2027',
    })

    expect(dashboard.metrics).toHaveLength(8)
    expect(dashboard.procurement.byMethod.length).toBeGreaterThan(0)
    expect(dashboard.workforce.activeConsultants).toBeGreaterThanOrEqual(0)
    expect(dashboard.workforce.criticalVacancies).toBeGreaterThanOrEqual(0)
    expect(dashboard.loanRepayments.length).toBeGreaterThan(0)
    expect(dashboard.exceptionMatrix.length).toBeGreaterThan(0)
  })

  it.each([
    {
      route: '/minister/dashboard',
      title: 'Strategic Portfolio Overview',
      sections: ['Pakistan Asset & Industrial Footprint', 'Cross-SOE Risk Matrix', 'Ministerial Decision Brief'],
    },
    {
      route: '/secretary/dashboard',
      title: 'Operational Command Centre',
      sections: ['Submission & Compliance Control', 'Cross-SOE Exception Matrix', 'Operational Intervention Queue'],
    },
  ])('renders the complete read-only dashboard at $route', async ({ route, title, sections }) => {
    window.history.pushState({}, '', route)
    render(
      <AppProviders>
        <AppRouter />
      </AppProviders>,
    )

    expect(await screen.findByRole('heading', { name: title })).toBeInTheDocument()
    sections.forEach((section) => expect(screen.getByRole('heading', { name: section })).toBeInTheDocument())
    expect(screen.queryByRole('button', { name: /approve|certify|submit|save|edit/i })).not.toBeInTheDocument()
  })
})
