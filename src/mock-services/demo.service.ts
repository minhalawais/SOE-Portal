import { resetMockDb, resetMockRuntime } from '@/mock-data'
import {
  createQaBaseline,
  FIXTURE_VERSION,
  RELEASE_CANDIDATE_ID,
  type QaBaselineRecord,
  type QaEnvironment,
} from '@/mock-data/qaBaseline'
import type { RoleId } from '@/constants'
import type { QueryClient } from '@tanstack/react-query'

/** Reset seed data + runtime simulation knobs; optionally clear React Query caches */
export function resetDemoData(queryClient?: QueryClient): void {
  resetMockDb()
  resetMockRuntime()
  queryClient?.clear()
}

/**
 * Phase 23 — start a reproducible QA cycle:
 * reset fixtures, then return a baseline record for the execution log.
 */
export function beginQaCycle(args: {
  reportingPeriodId: string
  organizationId: string
  role: RoleId
  environment?: QaEnvironment
  queryClient?: QueryClient
}): QaBaselineRecord {
  resetDemoData(args.queryClient)
  return createQaBaseline({
    environment: args.environment,
    reportingPeriodId: args.reportingPeriodId,
    organizationId: args.organizationId,
    role: args.role,
  })
}

export function getFixtureVersion(): string {
  return FIXTURE_VERSION
}

export function getReleaseCandidateId(): string {
  return RELEASE_CANDIDATE_ID
}

export {
  getMockRuntime,
  setMockLatencyMode,
  setMockErrorMode,
  setMockScenarioFilter,
  resetMockRuntime,
} from '@/mock-data/runtime'
