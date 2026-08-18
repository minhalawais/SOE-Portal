import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AppProviders } from '@/app/providers/AppProviders'
import { AppRouter } from '@/app/router'

describe('AppRouter smoke', () => {
  it('mounts without React Router child-type errors', async () => {
    render(
      <AppProviders>
        <AppRouter />
      </AppProviders>,
    )

    expect(
      await screen.findByRole('heading', { name: 'National Overview' }),
    ).toBeInTheDocument()
  })
})
