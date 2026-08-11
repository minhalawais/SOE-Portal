import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TextField, MockFileControl } from '@/design-system/components/Fields'
import { ChartContainer } from '@/design-system/components/ChartContainer'
import { StatusBadge } from '@/design-system/components/StatusBadge'
import { DataTable } from '@/components/tables/DataTable'
import type { ColumnDef } from '@tanstack/react-table'

describe('Phase 22 a11y hardening', () => {
  it('associates field errors via aria-invalid and aria-describedby', () => {
    render(<TextField label="Entity name" name="entityName" error="Required" />)
    const input = screen.getByLabelText(/Entity name/)
    expect(input).toHaveAttribute('aria-invalid', 'true')
    const described = input.getAttribute('aria-describedby')
    expect(described).toBeTruthy()
    expect(document.getElementById(described!)).toHaveTextContent('Required')
  })

  it('labels mock file control with a stable id', () => {
    render(<MockFileControl label="Evidence file" />)
    expect(screen.getByLabelText('Evidence file')).toBeInTheDocument()
  })

  it('provides a screen-reader chart summary by default', () => {
    render(
      <ChartContainer title="Loss trend">
        <div>chart</div>
      </ChartContainer>,
    )
    expect(screen.getByRole('heading', { name: 'Loss trend' })).toBeInTheDocument()
    expect(screen.getByText(/Visual chart; use nearby tables/i)).toBeInTheDocument()
  })

  it('never renders status as color-only', () => {
    render(<StatusBadge status="critical" family="risk" />)
    expect(screen.getByText(/critical/i)).toBeInTheDocument()
  })

  it('keeps table semantics with sticky identity column', () => {
    type Row = { name: string; value: number }
    const columns: ColumnDef<Row, unknown>[] = [
      { accessorKey: 'name', header: 'SOE' },
      { accessorKey: 'value', header: 'Value' },
    ]
    render(<DataTable data={[{ name: 'ABC', value: 1 }]} columns={columns} showSearch={false} />)
    expect(screen.getByRole('columnheader', { name: 'SOE' })).toHaveClass('sticky')
    expect(screen.getByText('ABC').closest('td')).toHaveClass('sticky')
  })
})
