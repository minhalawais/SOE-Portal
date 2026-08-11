/**
 * Phase 20 — field catalogue and saved intelligence-query presets.
 * Natural-language AI search is out of scope (future).
 */
import {
  ASSET_LITIGATION_STATUS,
  ASSET_TYPE,
  ASSET_UTILIZATION,
  COMPLIANCE_STATUS,
  ENCROACHMENT_STATUS,
  LOAN_REPAYMENT_STATUS,
  SEARCH_DATASET,
  SEARCH_FIELD_TYPE,
  SEARCH_OPERATOR,
  type SearchDataset,
  type SearchFieldType,
  type SearchOperator,
} from '@/constants'

export interface SearchFieldDef {
  key: string
  label: string
  type: SearchFieldType
  operators: SearchOperator[]
  /** Select options when type is select/status */
  options?: Array<{ value: string; label: string }>
  sensitive?: boolean
  /** Virtual/computed field */
  computed?: boolean
}

export interface SavedSearchPreset {
  id: string
  label: string
  description: string
  dataset: SearchDataset
  logic: 'and' | 'or'
  conditions: Array<{
    field: string
    operator: SearchOperator
    value?: string | number | boolean
    valueTo?: string | number
  }>
  sortBy?: string
  sortDir?: 'asc' | 'desc'
  /** Portals that should surface this preset prominently */
  portals?: Array<'soe' | 'moip' | 'secretary' | 'minister' | 'pmo'>
  isPrototype: true
}

const textOps: SearchOperator[] = [
  SEARCH_OPERATOR.EQ,
  SEARCH_OPERATOR.NEQ,
  SEARCH_OPERATOR.CONTAINS,
  SEARCH_OPERATOR.IS_EMPTY,
  SEARCH_OPERATOR.IS_NOT_EMPTY,
]
const numOps: SearchOperator[] = [
  SEARCH_OPERATOR.EQ,
  SEARCH_OPERATOR.NEQ,
  SEARCH_OPERATOR.GT,
  SEARCH_OPERATOR.LT,
  SEARCH_OPERATOR.BETWEEN,
  SEARCH_OPERATOR.IS_EMPTY,
  SEARCH_OPERATOR.IS_NOT_EMPTY,
]
const selectOps: SearchOperator[] = [
  SEARCH_OPERATOR.EQ,
  SEARCH_OPERATOR.NEQ,
  SEARCH_OPERATOR.IN,
]
const dateOps: SearchOperator[] = [
  SEARCH_OPERATOR.EQ,
  SEARCH_OPERATOR.BEFORE,
  SEARCH_OPERATOR.AFTER,
  SEARCH_OPERATOR.BETWEEN,
  SEARCH_OPERATOR.IS_EMPTY,
  SEARCH_OPERATOR.IS_NOT_EMPTY,
]
const boolOps: SearchOperator[] = [SEARCH_OPERATOR.EQ]

const commonOrg: SearchFieldDef = {
  key: 'organizationId',
  label: 'SOE',
  type: SEARCH_FIELD_TYPE.ORGANIZATION,
  operators: selectOps,
}
const commonSector: SearchFieldDef = {
  key: 'sector',
  label: 'Sector',
  type: SEARCH_FIELD_TYPE.SECTOR,
  operators: selectOps,
}

export const DATASET_FIELDS: Record<SearchDataset, SearchFieldDef[]> = {
  [SEARCH_DATASET.ORGANIZATIONS]: [
    { key: 'name', label: 'Name', type: SEARCH_FIELD_TYPE.TEXT, operators: textOps },
    { key: 'abbreviation', label: 'Abbreviation', type: SEARCH_FIELD_TYPE.TEXT, operators: textOps },
    commonSector,
    {
      key: 'status',
      label: 'Status',
      type: SEARCH_FIELD_TYPE.STATUS,
      operators: selectOps,
      options: [
        { value: 'active', label: 'Active' },
        { value: 'dormant', label: 'Dormant' },
        { value: 'under_privatization', label: 'Under Privatization' },
      ],
    },
    {
      key: 'consecutiveLossYears',
      label: 'Consecutive loss years',
      type: SEARCH_FIELD_TYPE.NUMBER,
      operators: numOps,
      computed: true,
    },
    {
      key: 'capacityUtilization',
      label: 'Capacity utilization %',
      type: SEARCH_FIELD_TYPE.NUMBER,
      operators: numOps,
      computed: true,
    },
    {
      key: 'missingAnnualReport',
      label: 'Missing annual report',
      type: SEARCH_FIELD_TYPE.BOOLEAN,
      operators: boolOps,
      computed: true,
    },
    {
      key: 'overdueComplianceCount',
      label: 'Overdue compliance count',
      type: SEARCH_FIELD_TYPE.NUMBER,
      operators: numOps,
      computed: true,
    },
  ],
  [SEARCH_DATASET.ASSETS]: [
    commonOrg,
    { key: 'name', label: 'Asset name', type: SEARCH_FIELD_TYPE.TEXT, operators: textOps },
    { key: 'id', label: 'Asset ID', type: SEARCH_FIELD_TYPE.TEXT, operators: textOps },
    {
      key: 'assetType',
      label: 'Asset type',
      type: SEARCH_FIELD_TYPE.SELECT,
      operators: selectOps,
      options: Object.values(ASSET_TYPE).map((v) => ({ value: v, label: v })),
    },
    {
      key: 'province',
      label: 'Province',
      type: SEARCH_FIELD_TYPE.PROVINCE,
      operators: selectOps,
    },
    { key: 'district', label: 'District', type: SEARCH_FIELD_TYPE.TEXT, operators: textOps },
    {
      key: 'areaAcres',
      label: 'Area (acres)',
      type: SEARCH_FIELD_TYPE.NUMBER,
      operators: numOps,
    },
    {
      key: 'utilizationStatus',
      label: 'Utilization',
      type: SEARCH_FIELD_TYPE.STATUS,
      operators: selectOps,
      options: Object.values(ASSET_UTILIZATION).map((v) => ({ value: v, label: v })),
    },
    {
      key: 'encroachmentStatus',
      label: 'Encroachment',
      type: SEARCH_FIELD_TYPE.STATUS,
      operators: selectOps,
      options: Object.values(ENCROACHMENT_STATUS).map((v) => ({ value: v, label: v })),
    },
    {
      key: 'litigationStatus',
      label: 'Litigation',
      type: SEARCH_FIELD_TYPE.STATUS,
      operators: selectOps,
      options: Object.values(ASSET_LITIGATION_STATUS).map((v) => ({ value: v, label: v })),
    },
    {
      key: 'occupancyStatus',
      label: 'Occupancy / current use',
      type: SEARCH_FIELD_TYPE.STATUS,
      operators: selectOps,
    },
    {
      key: 'bookValue',
      label: 'Book value',
      type: SEARCH_FIELD_TYPE.NUMBER,
      operators: numOps,
    },
  ],
  [SEARCH_DATASET.BOARD_MEMBERS]: [
    commonOrg,
    { key: 'name', label: 'Member name', type: SEARCH_FIELD_TYPE.TEXT, operators: textOps },
    { key: 'role', label: 'Role', type: SEARCH_FIELD_TYPE.TEXT, operators: textOps },
    {
      key: 'expiryDate',
      label: 'Expiry date',
      type: SEARCH_FIELD_TYPE.DATE,
      operators: dateOps,
    },
    {
      key: 'daysToExpiry',
      label: 'Days to expiry',
      type: SEARCH_FIELD_TYPE.NUMBER,
      operators: numOps,
      computed: true,
    },
    {
      key: 'isVacancySlot',
      label: 'Vacancy slot',
      type: SEARCH_FIELD_TYPE.BOOLEAN,
      operators: boolOps,
    },
    {
      key: 'cnic',
      label: 'CNIC',
      type: SEARCH_FIELD_TYPE.TEXT,
      operators: textOps,
      sensitive: true,
    },
  ],
  [SEARCH_DATASET.FINANCIAL_PERFORMANCE]: [
    commonOrg,
    commonSector,
    {
      key: 'reportingPeriodId',
      label: 'Reporting period',
      type: SEARCH_FIELD_TYPE.PERIOD,
      operators: selectOps,
    },
    {
      key: 'profitOrLoss',
      label: 'Profit / Loss',
      type: SEARCH_FIELD_TYPE.NUMBER,
      operators: numOps,
    },
    { key: 'revenue', label: 'Revenue', type: SEARCH_FIELD_TYPE.NUMBER, operators: numOps },
    { key: 'totalDebt', label: 'Total debt', type: SEARCH_FIELD_TYPE.NUMBER, operators: numOps },
    { key: 'subsidies', label: 'Subsidies', type: SEARCH_FIELD_TYPE.NUMBER, operators: numOps },
    {
      key: 'status',
      label: 'Submission status',
      type: SEARCH_FIELD_TYPE.STATUS,
      operators: selectOps,
    },
  ],
  [SEARCH_DATASET.LOANS]: [
    commonOrg,
    { key: 'lender', label: 'Lender', type: SEARCH_FIELD_TYPE.TEXT, operators: textOps },
    {
      key: 'outstanding',
      label: 'Outstanding',
      type: SEARCH_FIELD_TYPE.NUMBER,
      operators: numOps,
    },
    {
      key: 'repaymentStatus',
      label: 'Repayment status',
      type: SEARCH_FIELD_TYPE.STATUS,
      operators: selectOps,
      options: Object.values(LOAN_REPAYMENT_STATUS).map((v) => ({ value: v, label: v })),
    },
    {
      key: 'nextDueDate',
      label: 'Next due date',
      type: SEARCH_FIELD_TYPE.DATE,
      operators: dateOps,
    },
  ],
  [SEARCH_DATASET.PROCUREMENT]: [
    commonOrg,
    { key: 'title', label: 'Title', type: SEARCH_FIELD_TYPE.TEXT, operators: textOps },
    {
      key: 'estimatedValue',
      label: 'Estimated value',
      type: SEARCH_FIELD_TYPE.NUMBER,
      operators: numOps,
    },
    {
      key: 'status',
      label: 'Status',
      type: SEARCH_FIELD_TYPE.STATUS,
      operators: selectOps,
    },
  ],
  [SEARCH_DATASET.AUDIT_PARAS]: [
    commonOrg,
    { key: 'id', label: 'Audit para ID', type: SEARCH_FIELD_TYPE.TEXT, operators: textOps },
    { key: 'title', label: 'Title', type: SEARCH_FIELD_TYPE.TEXT, operators: textOps },
    {
      key: 'amountInvolved',
      label: 'Amount involved',
      type: SEARCH_FIELD_TYPE.NUMBER,
      operators: numOps,
    },
    {
      key: 'status',
      label: 'Status',
      type: SEARCH_FIELD_TYPE.STATUS,
      operators: selectOps,
    },
    {
      key: 'dateRaised',
      label: 'Date raised',
      type: SEARCH_FIELD_TYPE.DATE,
      operators: dateOps,
    },
  ],
  [SEARCH_DATASET.LITIGATION]: [
    commonOrg,
    {
      key: 'caseNumber',
      label: 'Case number',
      type: SEARCH_FIELD_TYPE.TEXT,
      operators: textOps,
    },
    { key: 'title', label: 'Title', type: SEARCH_FIELD_TYPE.TEXT, operators: textOps },
    {
      key: 'status',
      label: 'Status',
      type: SEARCH_FIELD_TYPE.STATUS,
      operators: selectOps,
    },
    {
      key: 'amountInvolved',
      label: 'Amount involved',
      type: SEARCH_FIELD_TYPE.NUMBER,
      operators: numOps,
    },
    {
      key: 'nextHearing',
      label: 'Next hearing',
      type: SEARCH_FIELD_TYPE.DATE,
      operators: dateOps,
    },
  ],
  [SEARCH_DATASET.COMPLIANCE]: [
    commonOrg,
    { key: 'title', label: 'Obligation', type: SEARCH_FIELD_TYPE.TEXT, operators: textOps },
    {
      key: 'status',
      label: 'Status',
      type: SEARCH_FIELD_TYPE.STATUS,
      operators: selectOps,
      options: Object.values(COMPLIANCE_STATUS).map((v) => ({ value: v, label: v })),
    },
    { key: 'dueDate', label: 'Due date', type: SEARCH_FIELD_TYPE.DATE, operators: dateOps },
    {
      key: 'isOverdue',
      label: 'Overdue',
      type: SEARCH_FIELD_TYPE.BOOLEAN,
      operators: boolOps,
      computed: true,
    },
  ],
  [SEARCH_DATASET.PRIVATIZATION]: [
    commonOrg,
    { key: 'title', label: 'Case title', type: SEARCH_FIELD_TYPE.TEXT, operators: textOps },
    {
      key: 'currentStage',
      label: 'Stage',
      type: SEARCH_FIELD_TYPE.STATUS,
      operators: selectOps,
    },
    {
      key: 'status',
      label: 'Status',
      type: SEARCH_FIELD_TYPE.STATUS,
      operators: selectOps,
    },
  ],
  [SEARCH_DATASET.DOCUMENTS]: [
    commonOrg,
    { key: 'title', label: 'Title', type: SEARCH_FIELD_TYPE.TEXT, operators: textOps },
    {
      key: 'category',
      label: 'Category',
      type: SEARCH_FIELD_TYPE.SELECT,
      operators: selectOps,
    },
    {
      key: 'evidenceStatus',
      label: 'Evidence status',
      type: SEARCH_FIELD_TYPE.STATUS,
      operators: selectOps,
    },
    {
      key: 'reportingPeriodId',
      label: 'Reporting period',
      type: SEARCH_FIELD_TYPE.PERIOD,
      operators: selectOps,
    },
  ],
}

export function getDatasetFields(dataset: SearchDataset): SearchFieldDef[] {
  return DATASET_FIELDS[dataset] ?? []
}

export function operatorsForField(field: SearchFieldDef): SearchOperator[] {
  return field.operators
}

/** Roadmap example queries + role-useful presets */
export const SAVED_SEARCH_PRESETS: SavedSearchPreset[] = [
  {
    id: 'consecutive-losses-3',
    label: 'SOEs — 3 consecutive loss years',
    description: 'Organizations with losses for three consecutive annual periods.',
    dataset: SEARCH_DATASET.ORGANIZATIONS,
    logic: 'and',
    conditions: [
      { field: 'consecutiveLossYears', operator: SEARCH_OPERATOR.GT, value: 2 },
    ],
    sortBy: 'consecutiveLossYears',
    sortDir: 'desc',
    portals: ['moip', 'secretary', 'minister', 'pmo'],
    isPrototype: true,
  },
  {
    id: 'encroached-land-punjab',
    label: 'Encroached land in Punjab',
    description: 'Land assets in Punjab with encroached status.',
    dataset: SEARCH_DATASET.ASSETS,
    logic: 'and',
    conditions: [
      { field: 'assetType', operator: SEARCH_OPERATOR.EQ, value: ASSET_TYPE.LAND },
      { field: 'province', operator: SEARCH_OPERATOR.EQ, value: 'Punjab' },
      {
        field: 'encroachmentStatus',
        operator: SEARCH_OPERATOR.EQ,
        value: ENCROACHMENT_STATUS.ENCROACHED,
      },
    ],
    portals: ['moip', 'minister', 'soe'],
    isPrototype: true,
  },
  {
    id: 'board-expiry-watch',
    label: 'Board Expiry Watch',
    description: 'Board members expiring within 90 days (non-vacancy).',
    dataset: SEARCH_DATASET.BOARD_MEMBERS,
    logic: 'and',
    conditions: [
      { field: 'daysToExpiry', operator: SEARCH_OPERATOR.LT, value: 91 },
      { field: 'daysToExpiry', operator: SEARCH_OPERATOR.GT, value: -1 },
      { field: 'isVacancySlot', operator: SEARCH_OPERATOR.EQ, value: false },
    ],
    sortBy: 'daysToExpiry',
    sortDir: 'asc',
    portals: ['moip', 'secretary', 'minister', 'soe'],
    isPrototype: true,
  },
  {
    id: 'high-value-audit-paras',
    label: 'High-Value Audit Paras',
    description: 'Audit paras with amount involved above PKR 100 million.',
    dataset: SEARCH_DATASET.AUDIT_PARAS,
    logic: 'and',
    conditions: [
      { field: 'amountInvolved', operator: SEARCH_OPERATOR.GT, value: 100_000_000 },
    ],
    sortBy: 'amountInvolved',
    sortDir: 'desc',
    portals: ['moip', 'secretary', 'minister'],
    isPrototype: true,
  },
  {
    id: 'low-capacity-utilization',
    label: 'Capacity utilization below 40%',
    description: 'SOEs with industrial capacity utilization under 40%.',
    dataset: SEARCH_DATASET.ORGANIZATIONS,
    logic: 'and',
    conditions: [
      { field: 'capacityUtilization', operator: SEARCH_OPERATOR.LT, value: 40 },
      { field: 'capacityUtilization', operator: SEARCH_OPERATOR.IS_NOT_EMPTY },
    ],
    sortBy: 'capacityUtilization',
    sortDir: 'asc',
    portals: ['moip', 'minister', 'pmo'],
    isPrototype: true,
  },
  {
    id: 'overdue-loan-repayments',
    label: 'Overdue Loan Repayments',
    description: 'Loans with overdue repayment status.',
    dataset: SEARCH_DATASET.LOANS,
    logic: 'and',
    conditions: [
      {
        field: 'repaymentStatus',
        operator: SEARCH_OPERATOR.EQ,
        value: LOAN_REPAYMENT_STATUS.OVERDUE,
      },
    ],
    portals: ['moip', 'secretary', 'soe'],
    isPrototype: true,
  },
  {
    id: 'missing-annual-reports',
    label: 'SOEs with missing annual reports',
    description: 'No annual-report document on file for the organization.',
    dataset: SEARCH_DATASET.ORGANIZATIONS,
    logic: 'and',
    conditions: [
      { field: 'missingAnnualReport', operator: SEARCH_OPERATOR.EQ, value: true },
    ],
    portals: ['moip', 'secretary', 'minister'],
    isPrototype: true,
  },
  {
    id: 'land-under-litigation',
    label: 'Land assets under litigation',
    description: 'Land with active litigation status.',
    dataset: SEARCH_DATASET.ASSETS,
    logic: 'and',
    conditions: [
      { field: 'assetType', operator: SEARCH_OPERATOR.EQ, value: ASSET_TYPE.LAND },
      {
        field: 'litigationStatus',
        operator: SEARCH_OPERATOR.EQ,
        value: ASSET_LITIGATION_STATUS.ACTIVE,
      },
    ],
    portals: ['moip', 'minister', 'soe', 'pmo'],
    isPrototype: true,
  },
  {
    id: 'underutilized-assets',
    label: 'Underutilized Assets',
    description: 'Assets marked underutilized or idle.',
    dataset: SEARCH_DATASET.ASSETS,
    logic: 'or',
    conditions: [
      {
        field: 'utilizationStatus',
        operator: SEARCH_OPERATOR.EQ,
        value: ASSET_UTILIZATION.UNDERUTILIZED,
      },
      {
        field: 'utilizationStatus',
        operator: SEARCH_OPERATOR.EQ,
        value: ASSET_UTILIZATION.IDLE,
      },
    ],
    portals: ['moip', 'minister', 'soe'],
    isPrototype: true,
  },
  {
    id: 'non-compliant-soes',
    label: 'Non-Compliant SOEs',
    description: 'SOEs with at least one overdue / non-compliant obligation.',
    dataset: SEARCH_DATASET.ORGANIZATIONS,
    logic: 'and',
    conditions: [
      { field: 'overdueComplianceCount', operator: SEARCH_OPERATOR.GT, value: 0 },
    ],
    sortBy: 'overdueComplianceCount',
    sortDir: 'desc',
    portals: ['moip', 'secretary'],
    isPrototype: true,
  },
  {
    id: 'privatization-pipeline',
    label: 'Privatization Pipeline',
    description: 'All privatization cases in the register.',
    dataset: SEARCH_DATASET.PRIVATIZATION,
    logic: 'and',
    conditions: [],
    portals: ['moip', 'minister', 'pmo', 'secretary'],
    isPrototype: true,
  },
]

export function getSavedPresetsForPortal(
  portal: 'soe' | 'moip' | 'secretary' | 'minister' | 'pmo',
): SavedSearchPreset[] {
  return SAVED_SEARCH_PRESETS.filter((p) => !p.portals || p.portals.includes(portal))
}
