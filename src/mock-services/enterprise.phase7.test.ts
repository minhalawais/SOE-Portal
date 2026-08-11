import { describe, expect, it, beforeEach } from 'vitest'
import { SHAREHOLDER_CATEGORY, SOE_STATUS } from '@/constants'
import { db, resetMockDb } from '@/mock-data'
import { mockOrganizationService } from '@/mock-services'
import { resetMockRuntime } from '@/mock-data/runtime'
import {
  governmentShareFromLines,
  validateOwnershipLines,
} from '@/workflow/enterpriseValidation'

describe('Phase 7 enterprise ownership & hierarchy', () => {
  beforeEach(() => {
    resetMockDb()
    resetMockRuntime()
  })

  it('keeps ownership lines totaling 100% for seeded SOEs', () => {
    const byOrg = new Map<string, number>()
    for (const line of db.ownershipLines) {
      byOrg.set(line.organizationId, (byOrg.get(line.organizationId) ?? 0) + line.percentage)
    }
    for (const [orgId, total] of byOrg) {
      expect(total, orgId).toBe(100)
    }
  })

  it('warns when ownership composition does not reconcile', () => {
    const issues = validateOwnershipLines([
      {
        id: 'a',
        organizationId: 'org-peco',
        category: SHAREHOLDER_CATEGORY.GOVERNMENT,
        holderName: 'GoP',
        percentage: 40,
      },
      {
        id: 'b',
        organizationId: 'org-peco',
        category: SHAREHOLDER_CATEGORY.PRIVATE,
        holderName: 'Private',
        percentage: 40,
      },
    ])
    expect(issues.some((i) => i.severity === 'warning')).toBe(true)
  })

  it('rejects ownership percentages outside 0–100', () => {
    const issues = validateOwnershipLines([
      {
        id: 'a',
        organizationId: 'org-peco',
        category: SHAREHOLDER_CATEGORY.GOVERNMENT,
        holderName: 'GoP',
        percentage: 120,
      },
    ])
    expect(issues.some((i) => i.severity === 'error')).toBe(true)
  })

  it('calculates government share including provincial lines', () => {
    const usc = db.ownershipLines.filter((l) => l.organizationId === 'org-usc')
    expect(governmentShareFromLines(usc)).toBe(100)
  })

  it('builds multi-level hierarchy for NFC → NFML → PASDEC', async () => {
    const tree = await mockOrganizationService.getHierarchy('org-nfc')
    expect(tree.organizationId).toBe('org-nfc')
    expect(tree.children[0]?.organizationId).toBe('org-nfml')
    expect(tree.children[0]?.children[0]?.organizationId).toBe('org-pasdec')
  })

  it('scopes registry without portfolio permission to one SOE', async () => {
    const page = await mockOrganizationService.getRegistry({
      portfolioScope: false,
      scopedOrganizationId: 'org-psm',
      pageSize: 50,
    })
    expect(page.items).toHaveLength(1)
    expect(page.items[0].organization.id).toBe('org-psm')
  })

  it('includes dormant and under-privatization entities in portfolio registry', async () => {
    const page = await mockOrganizationService.getRegistry({
      portfolioScope: true,
      pageSize: 50,
    })
    const statuses = new Set(page.items.map((r) => r.organization.status))
    expect(statuses.has(SOE_STATUS.DORMANT)).toBe(true)
    expect(statuses.has(SOE_STATUS.UNDER_PRIVATIZATION)).toBe(true)
  })

  it('updates ownership and recalculates government %', async () => {
    const result = await mockOrganizationService.updateOwnershipLines('org-peco', [
      {
        id: 'own-peco-gov',
        organizationId: 'org-peco',
        category: SHAREHOLDER_CATEGORY.GOVERNMENT,
        holderName: 'Government of Pakistan',
        percentage: 60,
      },
      {
        id: 'own-peco-priv',
        organizationId: 'org-peco',
        category: SHAREHOLDER_CATEGORY.PRIVATE,
        holderName: 'Private shareholders',
        percentage: 40,
      },
    ])
    expect(result.warnings).toHaveLength(0)
    const org = await mockOrganizationService.getOrganization('org-peco')
    expect(org.governmentOwnershipPct).toBe(60)
  })

  it('returns empty child relationships for PECO (no-subsidiary case)', async () => {
    const rels = await mockOrganizationService.getRelationships('org-peco')
    const children = rels.filter((r) => r.parentOrganizationId === 'org-peco')
    expect(children).toHaveLength(0)
  })
})
