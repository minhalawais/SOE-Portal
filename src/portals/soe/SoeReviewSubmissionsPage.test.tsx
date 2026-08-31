import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { resetMockDb } from '@/mock-data/db'
import { SoeReviewSubmissionsPage } from '@/portals/soe/SoeReviewSubmissionsPage'

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/soe-review/submissions']}>
        <SoeReviewSubmissionsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('SOE Reviewer submissions and approvals', () => {
  beforeEach(() => resetMockDb())

  it('renders one simple reviewer action list for submissions and approvals', async () => {
    renderPage()

    expect(await screen.findByRole('heading', { name: 'Submissions & Approvals' })).toBeInTheDocument()
    expect(screen.getByText('Reviewer action list')).toBeInTheDocument()
    expect(screen.getByText('Awaiting certification')).toBeInTheDocument()
    expect(screen.getByText('Returned / clarification')).toBeInTheDocument()
    expect(screen.queryByText('Submission rule')).not.toBeInTheDocument()
    expect(screen.queryByText('Evidence & Documents')).not.toBeInTheDocument()
    expect(screen.queryByText('Reports')).not.toBeInTheDocument()
  })
})
