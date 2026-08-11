import { db, resetMockDb, getSeedSnapshot } from '@/mock-data/db'

export { scenarioCatalogue, SCENARIO } from '@/mock-data/scenarios'
export type { ScenarioId, ScenarioDefinition } from '@/mock-data/scenarios'
export {
  FIXTURE_VERSION,
  RELEASE_CANDIDATE_ID,
  QA_ENVIRONMENT,
  createQaBaseline,
} from '@/mock-data/qaBaseline'
export type { QaBaselineRecord, QaEnvironment } from '@/mock-data/qaBaseline'
export {
  validationRounds,
  VALIDATION_ROUND,
  getValidationRound,
} from '@/mock-data/validationRounds'
export { personName, assetDisplayName } from '@/mock-data/displayNames'
export type {
  ValidationRoundId,
  ValidationRoundDefinition,
  DemoScriptStep,
} from '@/mock-data/validationRounds'
export { createSeedDataset } from '@/mock-data/seed'
export type { SeedDataset } from '@/mock-data/seed'
export {
  getMockRuntime,
  setMockLatencyMode,
  setMockErrorMode,
  setMockScenarioFilter,
  resetMockRuntime,
  withMockRuntime,
} from '@/mock-data/runtime'
export type { MockLatencyMode, MockErrorMode } from '@/mock-data/runtime'
export { deriveOrganizationMetrics, derivePortfolioMetrics } from '@/mock-data/derived'
export { db, resetMockDb, getSeedSnapshot }

/** Snapshot accessors for screens that still import named collections */
export const organizations = db.organizations
export const reportingPeriods = db.reportingPeriods
export const assets = db.assets
export const geoFeatures = db.geoFeatures
export const financialMetrics = db.financialMetrics
export const submissions = db.submissions
