/**
 * Phase 24 — Stakeholder validation facilitation service (mock).
 * Prepares round context; does not invent product domain behaviour.
 */
import type { QueryClient } from '@tanstack/react-query'
import {
  getValidationRound,
  validationRounds,
  type ValidationRoundDefinition,
  type ValidationRoundId,
} from '@/mock-data/validationRounds'
import {
  beginQaCycle,
  getFixtureVersion,
  getReleaseCandidateId,
  setMockLatencyMode,
  setMockScenarioFilter,
} from '@/mock-services/demo.service'
import { QA_ENVIRONMENT } from '@/mock-data/qaBaseline'
import type { RoleId } from '@/constants'

export interface ValidationRoundPreparation {
  round: ValidationRoundDefinition
  baselineLine: string
  releaseCandidate: string
  fixtureVersion: string
  organizationId: string
  reportingPeriodId: string
  startRole: RoleId
  startRoute: string
}

export interface StakeholderValidationService {
  listRounds(): Promise<ValidationRoundDefinition[]>
  getRound(id: ValidationRoundId): Promise<ValidationRoundDefinition>
  prepareRound(
    id: ValidationRoundId,
    options?: { queryClient?: QueryClient },
  ): Promise<ValidationRoundPreparation>
}

export const mockStakeholderValidationService: StakeholderValidationService = {
  async listRounds() {
    return [...validationRounds]
  },

  async getRound(id) {
    const round = getValidationRound(id)
    if (!round) throw new Error(`Unknown validation round: ${id}`)
    return round
  },

  async prepareRound(id, options) {
    const round = await this.getRound(id)
    setMockLatencyMode('none')
    setMockScenarioFilter(round.scenarioFilter)
    const baseline = beginQaCycle({
      reportingPeriodId: round.reportingPeriodId,
      organizationId: round.organizationId,
      role: round.startRole,
      environment: QA_ENVIRONMENT.STAKEHOLDER_UAT,
      queryClient: options?.queryClient,
    })
    return {
      round,
      baselineLine: `${baseline.releaseCandidate} · ${baseline.fixtureVersion} · ${round.id} · ${baseline.role} · ${baseline.organizationId} · ${baseline.reportingPeriodId}`,
      releaseCandidate: getReleaseCandidateId(),
      fixtureVersion: getFixtureVersion(),
      organizationId: round.organizationId,
      reportingPeriodId: round.reportingPeriodId,
      startRole: round.startRole,
      startRoute: round.startRoute,
    }
  },
}
