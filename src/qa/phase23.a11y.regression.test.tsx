import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TextField } from '@/design-system/components/Fields'
import { ChartContainer } from '@/design-system/components/ChartContainer'
import { StatusBadge } from '@/design-system/components/StatusBadge'
import { getFocusableElements } from '@/utils/focusTrap'

/** Phase 23 — accessibility regression against Phase 22 hardening. */
describe('Phase 23 accessibility regression', () => {
  it('keeps form error association', () => {
    render(<TextField label="Revenue" name="revenue" error="Enter a valid amount" />)
    const input = screen.getByLabelText(/Revenue/)
    expect(input).toHaveAttribute('aria-invalid', 'true')
    const described = input.getAttribute('aria-describedby')
    expect(document.getElementById(described!)).toHaveTextContent('Enter a valid amount')
  })

  it('keeps chart screen-reader summary', () => {
    render(
      <ChartContainer title="Portfolio losses">
        <div>chart</div>
      </ChartContainer>,
    )
    expect(screen.getByText(/Visual chart/i)).toBeInTheDocument()
  })

  it('keeps status text (not color-only)', () => {
    render(<StatusBadge status="critical" family="risk" />)
    expect(screen.getByText(/Critical/i)).toBeInTheDocument()
  })

  it('focus trap helper still finds interactive controls', () => {
    const root = document.createElement('div')
    root.innerHTML = `<button type="button">Close</button><input type="text" />`
    document.body.appendChild(root)
    expect(getFocusableElements(root).length).toBe(2)
    root.remove()
  })
})
