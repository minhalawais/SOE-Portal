import { describe, expect, it, beforeEach } from 'vitest'
import { ENTERPRISE_ENTITY_TYPE, ROLE, SHAREHOLDER_CATEGORY, SOE_STATUS } from '@/constants'
import { db, resetMockDb } from '@/mock-data'
import { mockAdministrationService, mockOrganizationService } from '@/mock-services'
import { resetMockRuntime } from '@/mock-data/runtime'
import { AppError } from '@/utils'
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

  it('exposes enterprise entity metadata without changing the seeded registry size', async () => {
    const entities = await mockOrganizationService.getEnterpriseEntities({ pageSize: 50 })
    expect(entities.items).toHaveLength(db.organizations.length)

    const tusdec = entities.items.find((organization) => organization.id === 'org-tusdec')
    expect(tusdec?.enterpriseEntityId).toBe('org-tusdec')
    expect(tusdec?.parentEntityId).toBe('org-pidc')
    expect(tusdec?.rootEnterpriseEntityId).toBe('org-pidc')
    expect(tusdec?.entityType).toBe(ENTERPRISE_ENTITY_TYPE.ASSOCIATE)
  })

  it('filters enterprise entities by root SOE hierarchy', async () => {
    const nfcGroup = await mockOrganizationService.getEnterpriseEntities({
      rootEnterpriseEntityId: 'org-nfc',
      pageSize: 50,
    })
    expect(nfcGroup.items.map((organization) => organization.id).sort()).toEqual(['org-nfc', 'org-nfml', 'org-pasdec'])
  })

  it('keeps one focal person assigned to each enterprise entity', async () => {
    const users = await mockAdministrationService.listUsers(ROLE.MOIP_REVIEWER)
    const focalUsers = users.filter((user) => user.roles.includes(ROLE.SOE_FOCAL_PERSON))
    const focalByEntity = new Map<string, string>()

    for (const user of focalUsers) {
      expect(user.enterpriseEntityId).toBeTruthy()
      expect(user.organizationIds).toEqual([user.enterpriseEntityId])
      expect(focalByEntity.has(user.enterpriseEntityId!)).toBe(false)
      focalByEntity.set(user.enterpriseEntityId!, user.id)
    }

    expect(focalByEntity.size).toBe(db.organizations.length)
    expect(focalByEntity.get('org-tusdec')).toBe('usr-tusdec-focal')
  })

  it('rejects duplicate or multi-enterprise focal assignments', async () => {
    await expect(
      mockAdministrationService.inviteUser(ROLE.MOIP_REVIEWER, {
        name: 'Duplicate TUSDEC Focal',
        email: 'duplicate.tusdec@pidc.gov.pk',
        roles: [ROLE.SOE_FOCAL_PERSON],
        organizationIds: ['org-tusdec'],
      }),
    ).rejects.toBeInstanceOf(AppError)

    await expect(
      mockAdministrationService.updateUserAccess(ROLE.MOIP_REVIEWER, 'usr-tusdec-focal', {
        roles: [ROLE.SOE_FOCAL_PERSON],
        organizationIds: ['org-tusdec', 'org-pidc'],
        ministryScopes: [],
        departmentScopes: [],
      }),
    ).rejects.toBeInstanceOf(AppError)
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
