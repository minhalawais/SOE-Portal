import { act, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ROLE } from '@/constants'
import { LoginPage } from '@/portals/auth/LoginPage'
import { useSessionStore } from '@/state/session'

describe('LoginPage', () => {
  beforeEach(() => {
    useSessionStore.setState({ isAuthenticated: false, userEmail: undefined, role: ROLE.SOE_FOCAL_PERSON })
  })

  it('presents a role-neutral institutional sign-in screen', () => {
    render(<MemoryRouter initialEntries={['/login']}><LoginPage /></MemoryRouter>)
    expect(screen.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /State-Owned Enterprises\s*Governance and Intelligence Portal/i })).toBeInTheDocument()
    expect(screen.getByLabelText('Official email address')).toHaveAttribute('autocomplete', 'username')
    expect(screen.queryByText(/select role|demo persona/i)).not.toBeInTheDocument()
  })

  it('uses a generic credential error and supports account recovery', () => {
    render(<MemoryRouter initialEntries={['/login']}><LoginPage /></MemoryRouter>)
    fireEvent.click(screen.getByRole('button', { name: 'Sign in securely' }))
    expect(screen.getByRole('alert')).toHaveTextContent('We could not sign you in')
    fireEvent.click(screen.getByRole('button', { name: 'Forgot password?' }))
    expect(screen.getByRole('heading', { name: 'Reset your password' })).toBeInTheDocument()
  })

  it('opens the PM Dashboard even when login was triggered from an SOE route', async () => {
    vi.useFakeTimers()
    render(
      <MemoryRouter initialEntries={[{ pathname: '/login', state: { from: '/soe/dashboard' } }]}>
        <LoginPage />
      </MemoryRouter>,
    )
    fireEvent.change(screen.getByLabelText('Official email address'), { target: { value: 'focal.person@pidc.gov.pk' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'OfficialPortalPassword' } })
    fireEvent.click(screen.getByRole('button', { name: 'Sign in securely' }))
    fireEvent.change(screen.getByLabelText('Verification code'), { target: { value: '123456' } })
    fireEvent.click(screen.getByRole('button', { name: 'Verify and continue' }))
    await act(async () => { vi.advanceTimersByTime(500) })
    expect(useSessionStore.getState().role).toBe(ROLE.EXECUTIVE_VIEWER)
    vi.useRealTimers()
  })
})
