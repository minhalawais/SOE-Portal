import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { resetMockDb } from '@/mock-data/db'
import { ROLE } from '@/constants'
import { useSessionStore } from '@/state/session'
import { SoeSubmissionsApprovalsPage } from '@/portals/soe/SoeSubmissionsApprovalsPage'

function renderPage(initialEntry = '/soe-entry/submissions') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <SoeSubmissionsApprovalsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('SOE Data Entry submissions and approvals', () => {
  beforeEach(() => {
    resetMockDb()
    useSessionStore.setState({ role: ROLE.SOE_FOCAL_PERSON })
  })

  it('renders unified workspace with overview tab by default', async () => {
    renderPage()

    expect(await screen.findByRole('heading', { name: 'Submissions & Approvals' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Overview' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Issues/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Clarifications/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Submit' })).toBeInTheDocument()
    expect(screen.getByText('Module submissions')).toBeInTheDocument()
  })

  it('opens issues tab from query param', async () => {
    renderPage('/soe-entry/submissions?tab=issues')

    expect(await screen.findByLabelText('Module')).toBeInTheDocument()
    expect(screen.getByLabelText('Severity')).toBeInTheDocument()
    expect(screen.getByLabelText('Owner')).toBeInTheDocument()
  })

  it('opens submit tab from query param', async () => {
    renderPage('/soe-entry/submissions?tab=submit')

    expect(await screen.findByRole('button', { name: 'Confirm period submission' })).toBeInTheDocument()
  })

  it('switches to clarifications tab on click', async () => {
    renderPage()

    await screen.findByRole('heading', { name: 'Submissions & Approvals' })
    fireEvent.click(screen.getByRole('button', { name: /^Clarifications/ }))

    expect(await screen.findByText('Clarification inbox')).toBeInTheDocument()
  })
})
