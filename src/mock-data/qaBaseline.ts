/**
 * Phase 23 — reproducible QA cycle baseline metadata.
 * Record fixture version, environment, scenario, period, and role before each cycle.
 */
import { getMockRuntime } from '@/mock-data/runtime'
import type { RoleId } from '@/constants'
import type { ScenarioId } from '@/mock-data/scenarios'

/** Bump when seed shape or narrative packs change in a QA-visible way. */
export const FIXTURE_VERSION = 'seed-2026.08.10-rc1-names'

export const QA_ENVIRONMENT = {
  LOCAL_DEV: 'local_development',
  SHARED_QA: 'shared_qa_demo',
  STAKEHOLDER_UAT: 'stakeholder_uat',
} as const

export type QaEnvironment = (typeof QA_ENVIRONMENT)[keyof typeof QA_ENVIRONMENT]

export interface QaBaselineRecord {
  fixtureVersion: string
  environment: QaEnvironment
  reportingPeriodId: string
  organizationId: string
  role: RoleId
  scenarioFilter: ScenarioId | 'all'
  latencyMode: string
  errorMode: string
  recordedAt: string
  releaseCandidate: string
}

export const RELEASE_CANDIDATE_ID = 'SOE-GAIP-Frontend-RC1'

export function createQaBaseline(partial: {
  environment?: QaEnvironment
  reportingPeriodId: string
  organizationId: string
  role: RoleId
  releaseCandidate?: string
}): QaBaselineRecord {
  const runtime = getMockRuntime()
  return {
    fixtureVersion: FIXTURE_VERSION,
    environment: partial.environment ?? QA_ENVIRONMENT.LOCAL_DEV,
    reportingPeriodId: partial.reportingPeriodId,
    organizationId: partial.organizationId,
    role: partial.role,
    scenarioFilter: (runtime.scenarioFilter as ScenarioId | 'all') ?? 'all',
    latencyMode: runtime.latencyMode,
    errorMode: runtime.errorMode,
    recordedAt: new Date().toISOString(),
    releaseCandidate: partial.releaseCandidate ?? RELEASE_CANDIDATE_ID,
  }
}
