import { describe, expect, it } from 'vitest'
import { resolveStatus, statusCatalog } from '@/design-system/tokens/status'

describe('status catalog', () => {
  it('resolves approval statuses with labels', () => {
    expect(resolveStatus('approved', 'approval').label).toBe('Approved')
    expect(resolveStatus('locked', 'approval').tone).toBe('success')
  })

  it('covers required government families', () => {
    expect(Object.keys(statusCatalog)).toEqual(
      expect.arrayContaining([
        'approval',
        'certification',
        'reporting',
        'risk',
        'compliance',
        'dataQuality',
        'evidence',
        'deadline',
      ]),
    )
  })
})
