import {
  ASSET_TYPE,
  type AssetType,
} from '@/constants'
import type { Asset } from '@/types/domain'

export interface AssetValidationIssue {
  field: string
  message: string
  severity: 'error' | 'warning'
}

export function validateAssetDraft(draft: Partial<Asset>): AssetValidationIssue[] {
  const issues: AssetValidationIssue[] = []

  if (!draft.name?.trim()) {
    issues.push({ field: 'name', message: 'Asset name is required.', severity: 'error' })
  }
  if (!draft.assetType) {
    issues.push({ field: 'assetType', message: 'Asset type is required.', severity: 'error' })
  } else if (!(Object.values(ASSET_TYPE) as string[]).includes(draft.assetType)) {
    issues.push({
      field: 'assetType',
      message: 'Asset type must use a controlled value.',
      severity: 'error',
    })
  }
  if (!draft.organizationId) {
    issues.push({
      field: 'organizationId',
      message: 'Organization is required.',
      severity: 'error',
    })
  }
  if (draft.bookValue != null && draft.bookValue < 0) {
    issues.push({ field: 'bookValue', message: 'Book value cannot be negative.', severity: 'error' })
  }
  if (draft.marketValue != null && draft.marketValue < 0) {
    issues.push({
      field: 'marketValue',
      message: 'Market value cannot be negative.',
      severity: 'error',
    })
  }
  if (
    draft.utilizationPercent != null &&
    (draft.utilizationPercent < 0 || draft.utilizationPercent > 100)
  ) {
    issues.push({
      field: 'utilizationPercent',
      message: 'Utilization % must be between 0 and 100.',
      severity: 'error',
    })
  }

  if (draft.assetType === ('land' satisfies AssetType)) {
    if (draft.areaAcres != null && draft.areaAcres < 0) {
      issues.push({ field: 'areaAcres', message: 'Area (acres) cannot be negative.', severity: 'error' })
    }
  }

  if (
    draft.bookValue != null &&
    draft.marketValue != null &&
    draft.bookValue > 0 &&
    Math.abs(draft.marketValue - draft.bookValue) / draft.bookValue > 5
  ) {
    issues.push({
      field: 'marketValue',
      message: 'Market/book variance exceeds 500% — confirm valuation evidence.',
      severity: 'warning',
    })
  }

  return issues
}
