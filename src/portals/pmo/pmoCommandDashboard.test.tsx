import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AppProviders } from '@/app/providers/AppProviders'
import { AppRouter } from '@/app/router'
import { ROLE } from '@/constants'
import { setMockLatencyMode } from '@/mock-services'
import { useSessionStore } from '@/state/session'

vi.mock('@/components/gis/NationalAssetMapCanvas', () => ({
  NationalAssetMapCanvas: () => <div aria-label="National asset map" />,
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

    expect(await screen.findByRole('heading', { name: 'Portfolio Observatory' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Financial and Fiscal Position' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Industrial and Economic Contribution' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'National Assets and Land Intelligence' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Governance, Leadership and Workforce' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Accountability, Legal and Compliance' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Privatization and Transformation' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Reporting Integrity and Data Confidence' })).toBeInTheDocument()
  })
})
