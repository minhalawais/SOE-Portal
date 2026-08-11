import { beforeEach, describe, expect, it } from 'vitest'
import { ROLE } from '@/constants'
import { resetMockDb, validationRounds, VALIDATION_ROUND } from '@/mock-data'
import { resetMockRuntime } from '@/mock-data/runtime'
import {
  getFixtureVersion,
  getReleaseCandidateId,
  mockStakeholderValidationService,
} from '@/mock-services'
import { implementedRoutes } from '@/app/router/implementedRoutes'

describe('Phase 24 stakeholder validation pack', () => {
  beforeEach(() => {
    resetMockDb()
    resetMockRuntime()
  })

  it('defines seven validation rounds with scripts and decisions', () => {
    expect(validationRounds).toHaveLength(7)
    validationRounds.forEach((r) => {
      expect(r.steps.length).toBeGreaterThan(0)
      expect(r.decisionsRequired.length).toBeGreaterThan(0)
      expect(r.startRoute.startsWith('/')).toBe(true)
    })
  })

  it('covers golden SOE → MoIP → executive path in R2', () => {
    const r2 = validationRounds.find((r) => r.id === VALIDATION_ROUND.R2_SOE_WORKFLOW)!
    const roles = new Set(r2.steps.map((s) => s.role))
    expect(roles.has(ROLE.SOE_FOCAL_PERSON)).toBe(true)
    expect(roles.has(ROLE.SOE_CERTIFIER)).toBe(true)
    expect(roles.has(ROLE.MOIP_REVIEWER)).toBe(true)
    expect(r2.steps.some((s) => s.route.includes('/moip/'))).toBe(true)
  })

  it('does not assign certify/approve workflow actions to PMO or Minister', () => {
    const actions = validationRounds
      .flatMap((r) => r.steps)
      .filter((s) => s.role === ROLE.PMO || s.role === ROLE.MINISTER)
      .map((s) => s.action.toLowerCase())
    expect(actions.some((a) => a.startsWith('certify') || a.startsWith('approve'))).toBe(
      false,
    )
    expect(actions.some((a) => a.includes('submit to moip'))).toBe(false)
  })

  it('prepareRound resets fixtures and returns baseline metadata', async () => {
    const prep = await mockStakeholderValidationService.prepareRound(
      VALIDATION_ROUND.R1_SHELL,
    )
    expect(prep.fixtureVersion).toBe(getFixtureVersion())
    expect(prep.releaseCandidate).toBe(getReleaseCandidateId())
    expect(prep.startRole).toBe(ROLE.SOE_FOCAL_PERSON)
    expect(prep.organizationId).toBe('org-psm')
    expect(prep.baselineLine).toContain('r1_shell')
  })

  it('registers facilitator route as implemented', () => {
    expect(implementedRoutes.has('/soe/stakeholder-validation')).toBe(true)
  })
})
