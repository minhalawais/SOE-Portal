import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { resetMockDb } from '@/mock-data/db'
import { MoipPerformanceComparisonPage } from '@/portals/moip/MoipPerformanceComparisonPage'

function renderPage(initialEntry = '/moip-review/performance-comparison') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <MoipPerformanceComparisonPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('MoIP SOE Performance Comparison page', () => {
  beforeEach(() => resetMockDb())

  it('renders the single-page comparison workspace using approved data by default', async () => {
    renderPage()
    expect(await screen.findByRole('heading', { name: 'SOE Performance Comparison' })).toBeInTheDocument()
    expect(await screen.findByText('Choose 2 to 5 SOEs for comparison')).toBeInTheDocument()
    expect(await screen.findByText('Where each SOE is strong or weak')).toBeInTheDocument()
    expect(screen.getByText('Performance filters')).toBeInTheDocument()
    expect(screen.getByText('MOIP attention')).toBeInTheDocument()
    expect(screen.getByText('Approved / locked')).toBeInTheDocument()
    expect(screen.queryByText(/MOIP performance intelligence/i)).not.toBeInTheDocument()
    expect(screen.queryByText('Selected comparison set')).not.toBeInTheDocument()
    expect(screen.queryByText(/^Best:/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/^Weak:/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Portfolio overview/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Compare SOEs/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /SOE scorecard/i })).not.toBeInTheDocument()
  })

  it('filters selectable SOEs and compares the selected enterprises in-place', async () => {
    renderPage()
    const search = await screen.findByPlaceholderText('Search SOE...')
    fireEvent.change(search, { target: { value: 'steel' } })
    expect((await screen.findAllByText('PSM')).length).toBeGreaterThan(0)
    expect(screen.getByText('Pillar profile')).toBeInTheDocument()
    expect(screen.getByText('Source-backed performance comparison')).toBeInTheDocument()
  })

  it('supports deep-linking directly to a focused enterprise', async () => {
    renderPage('/moip-review/performance-comparison?view=scorecard&organizationId=org-psm')
    expect(await screen.findByText('PSM performance explanation')).toBeInTheDocument()
    expect(screen.getAllByText('Pakistan Steel Mills').length).toBeGreaterThan(0)
    expect(screen.getByText('MOIP attention areas')).toBeInTheDocument()
  })
})
