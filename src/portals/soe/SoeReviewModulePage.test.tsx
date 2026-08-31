import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { MODULE, ROLE, SUBMISSION_STATUS } from '@/constants'
import { db, resetMockDb } from '@/mock-data'
import { SoeReviewModulePage } from '@/portals/soe/SoeReviewModulePage'
import { useSessionStore } from '@/state/session'

function renderPage(submissionId: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/soe-review/submissions/${submissionId}`]}>
        <Routes>
          <Route path="/soe-review/submissions/:submissionId" element={<SoeReviewModulePage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('SOE reviewer module page', () => {
  beforeEach(() => {
    resetMockDb()
    useSessionStore.setState({ role: ROLE.SOE_CERTIFIER })
  })

  it('shows submitted module data and reviewer decision actions', async () => {
    const submission = db.submissions.find(
      (item) =>
        item.organizationId === 'org-pidc' &&
        item.reportingPeriodId === 'period-fy2027' &&
        item.module === MODULE.ASSETS,
    )!
    submission.status = SUBMISSION_STATUS.READY_FOR_CERTIFICATION
    submission.completeness = 96

    renderPage(submission.id)

    expect(await screen.findByRole('heading', { name: 'Assets review' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Request clarification' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reject / return' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Approve module' })).toBeInTheDocument()
  })
})
