import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AppProviders } from '@/app/providers/AppProviders'
import { AppRouter } from '@/app/router'
import { ROLE } from '@/constants'
import { setMockLatencyMode } from '@/mock-services'
import { useSessionStore } from '@/state/session'

vi.mock('@/components/gis/SoeFootprintMap', () => ({
  ALL_SOE_FOOTPRINTS: 'all',
  SoeFootprintMap: ({ selectedSoeId }: { selectedSoeId: string }) => (
    <div aria-label="Interactive SOE footprint map" data-selected-soe={selectedSoeId} />
  ),
}))

describe('PMO National SOE Command Dashboard', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'ResizeObserver',
      class ResizeObserverMock {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    )
    setMockLatencyMode('none')
    useSessionStore.setState({ role: ROLE.EXECUTIVE_VIEWER })
    window.history.pushState({}, '', '/pmo/dashboard')
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    window.history.pushState({}, '', '/')
  })

  it('renders the consolidated command view and all analytical domains', async () => {
    render(
      <AppProviders>
        <AppRouter />
      </AppProviders>,
    )

    expect(await screen.findByRole('heading', { name: 'Ministry of Industries & Production' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Enterprise snapshot' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'SOE Land and Asset Footprint' })).toBeInTheDocument()
    expect(screen.getByLabelText('Interactive SOE footprint map')).toHaveAttribute('data-selected-soe', 'all')
    expect(screen.getByRole('heading', { name: 'Highest Loss-Making SOEs' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Leading Profitable SOEs' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Industrial and Economic Contribution' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Sector trade: domestic sales, export and imports' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Compliance and Documentation Due Diligence' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'National litigation exposure' })).toBeInTheDocument()
    expect(screen.queryByText('Overall Yes rate')).not.toBeInTheDocument()
    expect(screen.queryByRole('columnheader', { name: 'Yes total' })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'SOE compliance and document register' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'SOE Act' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Memorandum' })).toBeInTheDocument()
    expect(screen.queryByRole('columnheader', { name: 'Service Rules' })).not.toBeInTheDocument()
    expect(screen.queryByRole('columnheader', { name: 'Notifications' })).not.toBeInTheDocument()
    expect(screen.queryByRole('columnheader', { name: 'Court Orders' })).not.toBeInTheDocument()
    expect(screen.queryByRole('columnheader', { name: 'Privatization Documents' })).not.toBeInTheDocument()
    expect(screen.getAllByText(/Dummy PDF|Uploaded PDF/).length).toBeGreaterThan(0)
    expect(screen.getAllByText('Yes').length).toBeGreaterThan(10)
    expect(screen.getAllByText('No').length).toBeGreaterThan(10)
    expect(screen.getByRole('heading', { name: '90-Day Obligation Horizon' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Financial & Loan Watch' })).toBeInTheDocument()
    expect(screen.getByText('Repayments in horizon')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Financial and Fiscal Position' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Cross-SOE Risk Heatmap & Trends' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'National Assets and Land Intelligence' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Governance, Leadership and Workforce' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Accountability, Legal and Compliance' })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Privatization Pipeline' })).toBeInTheDocument()
    expect(screen.queryByText('Completed milestones')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Asset value by class' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Pipeline cases' })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Executive Reports' })).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: 'Preview' }).length).toBeGreaterThanOrEqual(5)
    expect(screen.queryByRole('heading', { name: 'Privatization and Transformation' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Reporting Integrity and Data Confidence' })).not.toBeInTheDocument()
  })
})
