/** Central status vocabulary — Phase 0 blueprint §9. Do not invent local synonyms. */

export const SUBMISSION_STATUS = {
  DRAFT: 'draft',
  IN_PROGRESS: 'in_progress',
  READY_FOR_REVIEW: 'ready_for_review',
  READY_FOR_CERTIFICATION: 'ready_for_certification',
  CERTIFIED: 'certified',
  SUBMITTED: 'submitted',
  UNDER_REVIEW: 'under_review',
  CLARIFICATION_REQUESTED: 'clarification_requested',
  RETURNED: 'returned',
  RESUBMITTED: 'resubmitted',
  APPROVED: 'approved',
  LOCKED: 'locked',
} as const

export type SubmissionStatus =
  (typeof SUBMISSION_STATUS)[keyof typeof SUBMISSION_STATUS]

export const SUBMISSION_STATUS_LABEL: Record<SubmissionStatus, string> = {
  draft: 'Draft',
  in_progress: 'In Progress',
  ready_for_review: 'Ready for Review',
  ready_for_certification: 'Ready for Certification',
  certified: 'Certified',
  submitted: 'Submitted',
  under_review: 'Under Review',
  clarification_requested: 'Clarification Requested',
  returned: 'Returned',
  resubmitted: 'Resubmitted',
  approved: 'Approved',
  locked: 'Locked',
}

export const RISK_STATUS = {
  LOW: 'low',
  MODERATE: 'moderate',
  HIGH: 'high',
  CRITICAL: 'critical',
} as const

export type RiskStatus = (typeof RISK_STATUS)[keyof typeof RISK_STATUS]

export const RISK_STATUS_LABEL: Record<RiskStatus, string> = {
  low: 'Low',
  moderate: 'Moderate',
  high: 'High',
  critical: 'Critical',
}

/** Phase 19 scorecard dimensions — prototype methodology */
export const SCORECARD_DIMENSION = {
  FINANCIAL: 'financial',
  GOVERNANCE: 'governance',
  COMPLIANCE: 'compliance',
  OPERATIONS: 'operations',
  ASSET_EFFICIENCY: 'asset_efficiency',
  STRATEGIC_CONTRIBUTION: 'strategic_contribution',
} as const

export type ScorecardDimension =
  (typeof SCORECARD_DIMENSION)[keyof typeof SCORECARD_DIMENSION]

export const SCORECARD_DIMENSION_LABEL: Record<ScorecardDimension, string> = {
  financial: 'Financial',
  governance: 'Governance',
  compliance: 'Compliance',
  operations: 'Operations',
  asset_efficiency: 'Asset Efficiency',
  strategic_contribution: 'Strategic Contribution',
}

/** Phase 19 risk matrix dimensions */
export const RISK_DIMENSION = {
  FINANCIAL: 'financial',
  GOVERNANCE: 'governance',
  LEGAL: 'legal',
  AUDIT: 'audit',
  COMPLIANCE: 'compliance',
  ASSET: 'asset',
} as const

export type RiskDimension = (typeof RISK_DIMENSION)[keyof typeof RISK_DIMENSION]

export const RISK_DIMENSION_LABEL: Record<RiskDimension, string> = {
  financial: 'Financial Risk',
  governance: 'Governance Risk',
  legal: 'Legal Risk',
  audit: 'Audit Risk',
  compliance: 'Compliance Risk',
  asset: 'Asset Risk',
}

/**
 * Phase 19 metric data availability — missing data must not auto-score good/bad.
 */
export const INTEL_DATA_STATUS = {
  AVAILABLE: 'available',
  UNAVAILABLE: 'unavailable',
  INSUFFICIENT_HISTORY: 'insufficient_history',
  PENDING_VERIFICATION: 'pending_verification',
} as const

export type IntelDataStatus =
  (typeof INTEL_DATA_STATUS)[keyof typeof INTEL_DATA_STATUS]

export const INTEL_DATA_STATUS_LABEL: Record<IntelDataStatus, string> = {
  available: 'Available',
  unavailable: 'Data Unavailable',
  insufficient_history: 'Insufficient History',
  pending_verification: 'Pending Verification',
}

/** Phase 19 trend direction for deterioration views */
export const INTEL_TREND = {
  IMPROVING: 'improving',
  STABLE: 'stable',
  DETERIORATING: 'deteriorating',
  UNKNOWN: 'unknown',
} as const

export type IntelTrend = (typeof INTEL_TREND)[keyof typeof INTEL_TREND]

export const INTEL_TREND_LABEL: Record<IntelTrend, string> = {
  improving: 'Improving',
  stable: 'Stable',
  deteriorating: 'Deteriorating',
  unknown: 'Unknown',
}

/** Phase 19 benchmarking metrics (prototype set) */
export const BENCHMARK_METRIC = {
  PROFITABILITY: 'profitability',
  SUBSIDY_DEPENDENCE: 'subsidy_dependence',
  ROA: 'roa',
  DEBT: 'debt',
  CAPACITY_UTILIZATION: 'capacity_utilization',
  GOVERNANCE: 'governance',
  ASSET_EFFICIENCY: 'asset_efficiency',
} as const

export type BenchmarkMetric =
  (typeof BENCHMARK_METRIC)[keyof typeof BENCHMARK_METRIC]

export const BENCHMARK_METRIC_LABEL: Record<BenchmarkMetric, string> = {
  profitability: 'Profitability (margin %)',
  subsidy_dependence: 'Subsidy dependence %',
  roa: 'ROA %',
  debt: 'Debt ratio %',
  capacity_utilization: 'Capacity utilization %',
  governance: 'Governance score',
  asset_efficiency: 'Asset efficiency score',
}

export const ALERT_SEVERITY = {
  INFORMATION: 'information',
  ATTENTION: 'attention',
  CRITICAL: 'critical',
} as const

export type AlertSeverity = (typeof ALERT_SEVERITY)[keyof typeof ALERT_SEVERITY]

export const ALERT_SEVERITY_LABEL: Record<AlertSeverity, string> = {
  information: 'Information',
  attention: 'Attention',
  critical: 'Critical',
}

/** Phase 15 Secretary pending decisions — provisional statuses */
export const PENDING_DECISION_STATUS = {
  OPEN: 'open',
  UNDER_CONSIDERATION: 'under_consideration',
  DEFERRED: 'deferred',
  CLOSED: 'closed',
} as const

export type PendingDecisionStatus =
  (typeof PENDING_DECISION_STATUS)[keyof typeof PENDING_DECISION_STATUS]

export const PENDING_DECISION_STATUS_LABEL: Record<string, string> = {
  open: 'Open',
  under_consideration: 'Under consideration',
  deferred: 'Deferred',
  closed: 'Closed',
}

/** Phase 14 task lifecycle — overdue is derived when open/in_progress past due */
export const TASK_STATUS = {
  OPEN: 'open',
  IN_PROGRESS: 'in_progress',
  DONE: 'done',
  CANCELLED: 'cancelled',
} as const

export type TaskStatus = (typeof TASK_STATUS)[keyof typeof TASK_STATUS]

export const TASK_STATUS_LABEL: Record<string, string> = {
  open: 'Open',
  in_progress: 'In Progress',
  done: 'Completed',
  cancelled: 'Cancelled',
  overdue: 'Overdue',
}

export const TASK_PRIORITY = {
  NORMAL: 'normal',
  HIGH: 'high',
  CRITICAL: 'critical',
} as const

export const TASK_PRIORITY_LABEL: Record<string, string> = {
  normal: 'Normal',
  high: 'High',
  critical: 'Critical',
}

/** Prototype early-warning rule catalogue — thresholds provisional */
export const EARLY_WARNING_RULE = {
  BOARD_EXPIRY_90: 'board_expiry_90',
  BOARD_EXPIRY_30: 'board_expiry_30',
  LOAN_REPAYMENT_OVERDUE: 'loan_repayment_overdue',
  FINANCE_SUBMISSION_MISSING: 'finance_submission_missing',
  COMPLIANCE_DUE_14: 'compliance_due_14',
  AUDIT_PARA_OVERDUE: 'audit_para_overdue',
  PROPERTY_VALUATION_MISSING: 'property_valuation_missing',
  CLARIFICATION_OVERDUE: 'clarification_overdue',
} as const

export type EarlyWarningRuleId =
  (typeof EARLY_WARNING_RULE)[keyof typeof EARLY_WARNING_RULE]

export const EARLY_WARNING_RULE_META: Record<
  EarlyWarningRuleId,
  {
    label: string
    thresholdNote: string
    severity: AlertSeverity
    createsTask: boolean
    createsEscalation?: boolean
    provisional: true
  }
> = {
  board_expiry_90: {
    label: 'Board expiry within 90 days',
    thresholdNote: 'Attention when remaining tenure ≤ 90 days (prototype).',
    severity: 'attention',
    createsTask: false,
    provisional: true,
  },
  board_expiry_30: {
    label: 'Board expiry within 30 days',
    thresholdNote: 'Critical when remaining tenure ≤ 30 days (prototype).',
    severity: 'critical',
    createsTask: true,
    provisional: true,
  },
  loan_repayment_overdue: {
    label: 'Loan repayment overdue',
    thresholdNote: 'Critical when repayment status is overdue (prototype).',
    severity: 'critical',
    createsTask: true,
    provisional: true,
  },
  finance_submission_missing: {
    label: 'Financial submission missing',
    thresholdNote: 'Escalation when finance pack not submitted for open period (prototype).',
    severity: 'critical',
    createsTask: true,
    createsEscalation: true,
    provisional: true,
  },
  compliance_due_14: {
    label: 'Compliance due within 14 days',
    thresholdNote: 'Attention when compliance due date ≤ 14 days (prototype).',
    severity: 'attention',
    createsTask: true,
    provisional: true,
  },
  audit_para_overdue: {
    label: 'Audit para overdue',
    thresholdNote: 'Attention when open para age exceeds demo threshold (prototype).',
    severity: 'attention',
    createsTask: true,
    provisional: true,
  },
  property_valuation_missing: {
    label: 'Property valuation missing',
    thresholdNote: 'Attention when land asset lacks valuation evidence (prototype).',
    severity: 'attention',
    createsTask: true,
    provisional: true,
  },
  clarification_overdue: {
    label: 'Clarification response overdue',
    thresholdNote: 'Attention when clarification open beyond 7 days (prototype).',
    severity: 'attention',
    createsTask: true,
    provisional: true,
  },
}

export const COMPLIANCE_STATUS = {
  COMPLIANT: 'compliant',
  PARTIALLY_COMPLIANT: 'partially_compliant',
  NON_COMPLIANT: 'non_compliant',
  NOT_APPLICABLE: 'not_applicable',
  PENDING_VERIFICATION: 'pending_verification',
  OVERDUE: 'overdue',
} as const

export type ComplianceStatus =
  (typeof COMPLIANCE_STATUS)[keyof typeof COMPLIANCE_STATUS]

export const COMPLIANCE_STATUS_LABEL: Record<ComplianceStatus, string> = {
  compliant: 'Compliant',
  partially_compliant: 'Partially Compliant',
  non_compliant: 'Non-Compliant',
  not_applicable: 'Not Applicable',
  pending_verification: 'Pending Verification',
  overdue: 'Overdue',
}

/** Phase 11 — procurement methods (provisional taxonomy) */
export const PROCUREMENT_METHOD = {
  OPEN_TENDER: 'open_tender',
  SINGLE_SOURCE: 'single_source',
} as const

export type ProcurementMethod =
  (typeof PROCUREMENT_METHOD)[keyof typeof PROCUREMENT_METHOD]

export const PROCUREMENT_METHOD_LABEL: Record<ProcurementMethod, string> = {
  open_tender: 'Open Tender',
  single_source: 'Single Source',
}

export const PPRA_COMPLIANCE = {
  COMPLIANT: 'compliant',
  PENDING: 'pending',
  EXCEPTION: 'exception',
  MISSING_EVIDENCE: 'missing_evidence',
} as const

export const PPRA_COMPLIANCE_LABEL: Record<string, string> = {
  compliant: 'Compliant',
  pending: 'Pending',
  exception: 'Exception',
  missing_evidence: 'Missing evidence',
}

export const PROCUREMENT_CONTRACT_STATUS = {
  DRAFT: 'draft',
  ACTIVE: 'active',
  COMPLETED: 'completed',
  TERMINATED: 'terminated',
  OVERDUE: 'overdue',
} as const

/** Prototype high-value procurement alert threshold (PKR) */
export const PROCUREMENT_HIGH_VALUE_THRESHOLD_PKR = 100_000_000

export const AUDIT_TYPE = {
  EXTERNAL: 'external',
  INTERNAL: 'internal',
  AUDITOR_GENERAL: 'auditor_general',
  SPECIAL: 'special',
} as const

export type AuditType = (typeof AUDIT_TYPE)[keyof typeof AUDIT_TYPE]

export const AUDIT_TYPE_LABEL: Record<AuditType, string> = {
  external: 'External Audit',
  internal: 'Internal Audit',
  auditor_general: 'Auditor General',
  special: 'Special Audit',
}

export const AUDIT_REGISTER_STATUS = {
  PLANNED: 'planned',
  IN_PROGRESS: 'in_progress',
  REPORT_ISSUED: 'report_issued',
  CLOSED: 'closed',
} as const

/** Provisional audit para lifecycle — pending stakeholder confirmation */
export const AUDIT_PARA_STATUS = {
  OPEN: 'open',
  RESPONSE_SUBMITTED: 'response_submitted',
  UNDER_REVIEW: 'under_review',
  ACTION_REQUIRED: 'action_required',
  RECOVERY_IN_PROGRESS: 'recovery_in_progress',
  SETTLED: 'settled',
  CLOSED: 'closed',
} as const

export type AuditParaStatus =
  (typeof AUDIT_PARA_STATUS)[keyof typeof AUDIT_PARA_STATUS]

export const AUDIT_PARA_STATUS_LABEL: Record<AuditParaStatus, string> = {
  open: 'Open',
  response_submitted: 'Response Submitted',
  under_review: 'Under Review',
  action_required: 'Action Required',
  recovery_in_progress: 'Recovery In Progress',
  settled: 'Settled',
  closed: 'Closed',
}

export const PAC_STATUS = {
  NONE: 'none',
  OPEN: 'open',
  OVERDUE: 'overdue',
  ACTIONED: 'actioned',
  CLOSED: 'closed',
} as const

export const RECOVERY_STATUS = {
  NOT_STARTED: 'not_started',
  IN_PROGRESS: 'in_progress',
  PARTIAL: 'partial',
  COMPLETED: 'completed',
  WRITTEN_OFF: 'written_off',
} as const

export const LITIGATION_STATUS = {
  ACTIVE: 'active',
  STAYED: 'stayed',
  APPEALED: 'appealed',
  DISPOSED: 'disposed',
} as const

export const LITIGATION_STATUS_LABEL: Record<string, string> = {
  active: 'Active',
  stayed: 'Stayed',
  appealed: 'Appealed',
  disposed: 'Disposed',
}

export const LITIGATION_STAGE = {
  INTAKE: 'intake',
  FILING: 'filing',
  PLEADINGS: 'pleadings',
  HEARINGS: 'hearings',
  INTERIM_ORDERS: 'interim_orders',
  EVIDENCE_ARGUMENTS: 'evidence_arguments',
  JUDGMENT: 'judgment',
  APPEAL_REVIEW: 'appeal_review',
  SETTLEMENT: 'settlement',
  CLOSURE: 'closure',
} as const

export type LitigationStageId =
  (typeof LITIGATION_STAGE)[keyof typeof LITIGATION_STAGE]

export const LITIGATION_STAGE_ORDER: LitigationStageId[] = [
  'intake',
  'filing',
  'pleadings',
  'hearings',
  'interim_orders',
  'evidence_arguments',
  'judgment',
  'appeal_review',
  'settlement',
  'closure',
]

export const LITIGATION_STAGE_LABEL: Record<LitigationStageId, string> = {
  intake: 'Intake',
  filing: 'Filing',
  pleadings: 'Pleadings',
  hearings: 'Hearings',
  interim_orders: 'Interim Orders',
  evidence_arguments: 'Evidence & Arguments',
  judgment: 'Judgment',
  appeal_review: 'Appeal Review',
  settlement: 'Settlement',
  closure: 'Closure',
}

export const LITIGATION_STAGE_STATUS = {
  NOT_STARTED: 'not_started',
  IN_PROGRESS: 'in_progress',
  SUBMITTED: 'submitted',
  VERIFIED: 'verified',
  RETURNED: 'returned',
} as const

export type LitigationStageStatus =
  (typeof LITIGATION_STAGE_STATUS)[keyof typeof LITIGATION_STAGE_STATUS]

export const LITIGATION_STAGE_STATUS_LABEL: Record<LitigationStageStatus, string> = {
  not_started: 'Not started',
  in_progress: 'In progress',
  submitted: 'SOE review',
  verified: 'Verified',
  returned: 'Returned',
}

export const PRIVATIZATION_STAGE = {
  IDENTIFIED: 'identified',
  APPROVED: 'approved',
  FINANCIAL_ADVISOR: 'financial_advisor',
  DUE_DILIGENCE: 'due_diligence',
  VALUATION: 'valuation',
  EOI: 'eoi',
  BIDDING: 'bidding',
  TRANSACTION: 'transaction',
  POST_SALE: 'post_sale',
} as const

export type PrivatizationStage =
  (typeof PRIVATIZATION_STAGE)[keyof typeof PRIVATIZATION_STAGE]

export const PRIVATIZATION_STAGE_ORDER: PrivatizationStage[] = [
  'identified',
  'approved',
  'financial_advisor',
  'due_diligence',
  'valuation',
  'eoi',
  'bidding',
  'transaction',
  'post_sale',
]

export const PRIVATIZATION_STAGE_LABEL: Record<PrivatizationStage, string> = {
  identified: 'Identified',
  approved: 'Approved',
  financial_advisor: 'Financial Advisor',
  due_diligence: 'Due Diligence',
  valuation: 'Valuation',
  eoi: 'EOI',
  bidding: 'Bidding',
  transaction: 'Transaction',
  post_sale: 'Post-Sale',
}

export const PRIVATIZATION_STAGE_STATUS = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  BLOCKED: 'blocked',
} as const

export const TRANSFORMATION_TYPE = {
  RESTRUCTURING: 'restructuring',
  MERGER: 'merger',
  CLOSURE: 'closure',
  REHABILITATION: 'rehabilitation',
  LAND_MONETIZATION: 'land_monetization',
  OTHER: 'other',
} as const

export type TransformationType =
  (typeof TRANSFORMATION_TYPE)[keyof typeof TRANSFORMATION_TYPE]

export const TRANSFORMATION_TYPE_LABEL: Record<TransformationType, string> = {
  restructuring: 'Restructuring',
  merger: 'Merger',
  closure: 'Closure',
  rehabilitation: 'Rehabilitation',
  land_monetization: 'Land Monetization',
  other: 'Other',
}

export const DATA_QUALITY_STATUS = {
  COMPLETE: 'complete',
  INCOMPLETE: 'incomplete',
  VALIDATION_ISSUE: 'validation_issue',
  EVIDENCE_MISSING: 'evidence_missing',
  VERIFIED: 'verified',
} as const

export type DataQualityStatus =
  (typeof DATA_QUALITY_STATUS)[keyof typeof DATA_QUALITY_STATUS]

export const SOE_STATUS = {
  ACTIVE: 'active',
  DORMANT: 'dormant',
  UNDER_LIQUIDATION: 'under_liquidation',
  UNDER_PRIVATIZATION: 'under_privatization',
  MERGED: 'merged',
  CLOSED: 'closed',
} as const

export type SoeStatus = (typeof SOE_STATUS)[keyof typeof SOE_STATUS]

export const SOE_STATUS_LABEL: Record<SoeStatus, string> = {
  active: 'Active',
  dormant: 'Dormant',
  under_liquidation: 'Under Liquidation',
  under_privatization: 'Under Privatization',
  merged: 'Merged',
  closed: 'Closed',
}

/**
 * Phase 16 Minister portfolio health — provisional composite band.
 * Always show component indicators; do not treat as sole score.
 */
export const PORTFOLIO_HEALTH = {
  HEALTHY: 'healthy',
  WATCH: 'watch',
  CONCERN: 'concern',
} as const

export type PortfolioHealthBand =
  (typeof PORTFOLIO_HEALTH)[keyof typeof PORTFOLIO_HEALTH]

export const PORTFOLIO_HEALTH_LABEL: Record<PortfolioHealthBand, string> = {
  healthy: 'Healthy',
  watch: 'Watch',
  concern: 'Concern',
}

/** Phase 16 strategic opportunity kinds — prototype decision-support signals */
export const STRATEGIC_OPPORTUNITY_KIND = {
  VACANT_INDUSTRIAL_LAND: 'vacant_industrial_land',
  IDLE_FACTORY: 'idle_factory',
  UNDERUTILIZED_MACHINERY: 'underutilized_machinery',
  HIGH_MARKET_BOOK_VARIANCE: 'high_market_book_variance',
  RESTRUCTURING_CANDIDATE: 'restructuring_candidate',
  PRIVATIZATION_MILESTONE: 'privatization_milestone',
  STRONG_PERFORMER: 'strong_performer',
} as const

export type StrategicOpportunityKind =
  (typeof STRATEGIC_OPPORTUNITY_KIND)[keyof typeof STRATEGIC_OPPORTUNITY_KIND]

export const STRATEGIC_OPPORTUNITY_KIND_LABEL: Record<StrategicOpportunityKind, string> = {
  vacant_industrial_land: 'Vacant industrial land',
  idle_factory: 'Idle factory',
  underutilized_machinery: 'Underutilized machinery',
  high_market_book_variance: 'High market/book variance',
  restructuring_candidate: 'Restructuring candidate',
  privatization_milestone: 'Privatization milestone',
  strong_performer: 'Strong-performing SOE',
}

/** Controlled legal-status vocabulary — Phase 7. */
export const LEGAL_STATUS = {
  COMPANIES_ACT_COMPANY: 'companies_act_company',
  STATUTORY_CORPORATION: 'statutory_corporation',
  PUBLIC_LIMITED_COMPANY: 'public_limited_company',
  SECTION_42_COMPANY: 'section_42_company',
  GOVERNMENT_COMPANY: 'government_company',
  WHOLLY_OWNED_SOE: 'wholly_owned_soe',
  JOINT_VENTURE: 'joint_venture',
  SUBSIDIARY: 'subsidiary',
  HOLDING_COMPANY: 'holding_company',
  SPECIAL_PURPOSE_VEHICLE: 'special_purpose_vehicle',
} as const

export type LegalStatus = (typeof LEGAL_STATUS)[keyof typeof LEGAL_STATUS]

export const LEGAL_STATUS_LABEL: Record<LegalStatus, string> = {
  companies_act_company: 'Companies Act company',
  statutory_corporation: 'Statutory Corporation',
  public_limited_company: 'Public Limited Company',
  section_42_company: 'Section 42 Company',
  government_company: 'Government Company',
  wholly_owned_soe: 'Wholly Owned SOE',
  joint_venture: 'Joint Venture',
  subsidiary: 'Subsidiary',
  holding_company: 'Holding Company',
  special_purpose_vehicle: 'Special Purpose Vehicle',
}

export const RELATIONSHIP_TYPE = {
  HOLDING: 'holding',
  SUBSIDIARY: 'subsidiary',
  ASSOCIATE: 'associate',
  JOINT_VENTURE: 'joint_venture',
} as const

export type RelationshipType =
  (typeof RELATIONSHIP_TYPE)[keyof typeof RELATIONSHIP_TYPE]

export const RELATIONSHIP_TYPE_LABEL: Record<RelationshipType, string> = {
  holding: 'Holding Company',
  subsidiary: 'Subsidiary',
  associate: 'Associate',
  joint_venture: 'Joint Venture',
}

export const ENTERPRISE_ENTITY_TYPE = {
  PARENT_SOE: 'parent_soe',
  SUBSIDIARY: 'subsidiary',
  ASSOCIATE: 'associate',
  JOINT_VENTURE: 'joint_venture',
  INDEPENDENT_ENTERPRISE: 'independent_enterprise',
} as const

export type EnterpriseEntityType =
  (typeof ENTERPRISE_ENTITY_TYPE)[keyof typeof ENTERPRISE_ENTITY_TYPE]

export const ENTERPRISE_ENTITY_TYPE_LABEL: Record<EnterpriseEntityType, string> = {
  parent_soe: 'Parent SOE',
  subsidiary: 'Subsidiary enterprise',
  associate: 'Associate enterprise',
  joint_venture: 'Joint venture enterprise',
  independent_enterprise: 'Independent enterprise',
}

export const ENTERPRISE_CONTROL_TYPE = {
  DIRECT_CONTROL: 'direct_control',
  INDIRECT_CONTROL: 'indirect_control',
  SIGNIFICANT_INFLUENCE: 'significant_influence',
  JOINT_CONTROL: 'joint_control',
  MINISTRY_CONTROLLED: 'ministry_controlled',
} as const

export type EnterpriseControlType =
  (typeof ENTERPRISE_CONTROL_TYPE)[keyof typeof ENTERPRISE_CONTROL_TYPE]

export const ENTERPRISE_CONSOLIDATION_TREATMENT = {
  CONSOLIDATED: 'consolidated',
  EQUITY_ACCOUNTED: 'equity_accounted',
  DISCLOSURE_ONLY: 'disclosure_only',
  STANDALONE: 'standalone',
} as const

export type EnterpriseConsolidationTreatment =
  (typeof ENTERPRISE_CONSOLIDATION_TREATMENT)[keyof typeof ENTERPRISE_CONSOLIDATION_TREATMENT]

export const ENTERPRISE_REPORTING_OBLIGATION = {
  FULL_REPORTING: 'full_reporting',
  CONTROLLED_ENTITY_REPORTING: 'controlled_entity_reporting',
  SUMMARY_REPORTING: 'summary_reporting',
} as const

export type EnterpriseReportingObligation =
  (typeof ENTERPRISE_REPORTING_OBLIGATION)[keyof typeof ENTERPRISE_REPORTING_OBLIGATION]

export const RELATIONSHIP_STATUS = {
  ACTIVE: 'active',
  DORMANT: 'dormant',
  UNDER_PRIVATIZATION: 'under_privatization',
  CLOSED: 'closed',
} as const

export type RelationshipStatus =
  (typeof RELATIONSHIP_STATUS)[keyof typeof RELATIONSHIP_STATUS]

export const SHAREHOLDER_CATEGORY = {
  GOVERNMENT: 'government',
  PRIVATE: 'private',
  FOREIGN: 'foreign',
  PROVINCIAL_GOVERNMENT: 'provincial_government',
  EMPLOYEE: 'employee',
  PUBLIC: 'public',
  INSTITUTIONAL: 'institutional',
} as const

export type ShareholderCategory =
  (typeof SHAREHOLDER_CATEGORY)[keyof typeof SHAREHOLDER_CATEGORY]

export const SHAREHOLDER_CATEGORY_LABEL: Record<ShareholderCategory, string> = {
  government: 'Government',
  private: 'Private',
  foreign: 'Foreign',
  provincial_government: 'Provincial Government',
  employee: 'Employee shares',
  public: 'Public shares',
  institutional: 'Institutional',
}

export const OWNERSHIP_BAND = {
  WHOLLY: 'wholly',
  MAJORITY: 'majority',
  MINORITY: 'minority',
  NONE: 'none',
} as const

export type OwnershipBand = (typeof OWNERSHIP_BAND)[keyof typeof OWNERSHIP_BAND]

export const OWNERSHIP_BAND_LABEL: Record<OwnershipBand, string> = {
  wholly: '100% government',
  majority: 'Majority (≥50%)',
  minority: 'Minority (<50%)',
  none: 'No government share',
}

export const ENTERPRISE_HISTORY_EVENT = {
  LEGAL_STATUS_CHANGED: 'legal_status_changed',
  OWNERSHIP_UPDATED: 'ownership_updated',
  SUBSIDIARY_ADDED: 'subsidiary_added',
  STRUCTURE_UPDATED: 'structure_updated',
  LOCATIONS_UPDATED: 'locations_updated',
  CONTACTS_UPDATED: 'contacts_updated',
  ENTERPRISE_RENAMED: 'enterprise_renamed',
  ENTERPRISE_STATUS_CHANGED: 'enterprise_status_changed',
} as const

export type EnterpriseHistoryEventType =
  (typeof ENTERPRISE_HISTORY_EVENT)[keyof typeof ENTERPRISE_HISTORY_EVENT]

export const ASSET_TYPE = {
  LAND: 'land',
  BUILDING: 'building',
  MACHINERY: 'machinery',
  VEHICLE: 'vehicle',
  IT_EQUIPMENT: 'it_equipment',
  OTHER_EQUIPMENT: 'other_equipment',
} as const

export type AssetType = (typeof ASSET_TYPE)[keyof typeof ASSET_TYPE]

export const ASSET_TYPE_LABEL: Record<AssetType, string> = {
  land: 'Land',
  building: 'Building',
  machinery: 'Machinery',
  vehicle: 'Vehicle',
  it_equipment: 'IT Equipment',
  other_equipment: 'Other Equipment',
}

/** Utilization status — distinct from occupancy and land-use classification (Phase 8). */
export const ASSET_UTILIZATION = {
  UTILIZED: 'utilized',
  UNDERUTILIZED: 'underutilized',
  IDLE: 'idle',
  UNUSED: 'unused',
  DISPOSED: 'disposed',
} as const

export type AssetUtilization =
  (typeof ASSET_UTILIZATION)[keyof typeof ASSET_UTILIZATION]

export const ASSET_UTILIZATION_LABEL: Record<AssetUtilization, string> = {
  utilized: 'Utilized',
  underutilized: 'Underutilized',
  idle: 'Idle',
  unused: 'Unused',
  disposed: 'Disposed',
}

/** Occupancy status (land / building) — not merged with utilization. */
export const ASSET_OCCUPANCY = {
  VACANT: 'vacant',
  OCCUPIED: 'occupied',
} as const

export type AssetOccupancy = (typeof ASSET_OCCUPANCY)[keyof typeof ASSET_OCCUPANCY]

export const ASSET_OCCUPANCY_LABEL: Record<AssetOccupancy, string> = {
  vacant: 'Vacant',
  occupied: 'Occupied',
}

/** Land use classification — separate from occupancy and utilization. */
export const LAND_USE_CLASS = {
  INDUSTRIAL: 'industrial',
  COMMERCIAL: 'commercial',
  RESIDENTIAL: 'residential',
  AGRICULTURAL: 'agricultural',
  UNUSED: 'unused',
} as const

export type LandUseClass = (typeof LAND_USE_CLASS)[keyof typeof LAND_USE_CLASS]

export const LAND_USE_CLASS_LABEL: Record<LandUseClass, string> = {
  industrial: 'Industrial',
  commercial: 'Commercial',
  residential: 'Residential',
  agricultural: 'Agricultural',
  unused: 'Unused',
}

export const ENCROACHMENT_STATUS = {
  CLEAR: 'clear',
  ENCROACHED: 'encroached',
  SUSPECTED: 'suspected',
} as const

export type EncroachmentStatus =
  (typeof ENCROACHMENT_STATUS)[keyof typeof ENCROACHMENT_STATUS]

export const ENCROACHMENT_STATUS_LABEL: Record<EncroachmentStatus, string> = {
  clear: 'Clear',
  encroached: 'Encroached',
  suspected: 'Suspected',
}

export const ASSET_LITIGATION_STATUS = {
  CLEAR: 'clear',
  ACTIVE: 'active',
} as const

export type AssetLitigationStatus =
  (typeof ASSET_LITIGATION_STATUS)[keyof typeof ASSET_LITIGATION_STATUS]

export const ASSET_LITIGATION_STATUS_LABEL: Record<AssetLitigationStatus, string> = {
  clear: 'Clear',
  active: 'Under litigation',
}

export const LEASE_STATUS = {
  NONE: 'none',
  ACTIVE: 'active',
  EXPIRED: 'expired',
} as const

export type LeaseStatus = (typeof LEASE_STATUS)[keyof typeof LEASE_STATUS]

export const LEASE_STATUS_LABEL: Record<LeaseStatus, string> = {
  none: 'No lease',
  active: 'Active lease',
  expired: 'Expired lease',
}

export const ASSET_EVIDENCE_STATUS = {
  COMPLETE: 'complete',
  PARTIAL: 'partial',
  MISSING: 'missing',
} as const

export type AssetEvidenceStatus =
  (typeof ASSET_EVIDENCE_STATUS)[keyof typeof ASSET_EVIDENCE_STATUS]

export const ASSET_EVIDENCE_STATUS_LABEL: Record<AssetEvidenceStatus, string> = {
  complete: 'Evidence complete',
  partial: 'Evidence partial',
  missing: 'Evidence missing',
}

/** Physical condition — distinct from operational status. */
export const ASSET_CONDITION = {
  GOOD: 'good',
  FAIR: 'fair',
  POOR: 'poor',
  CRITICAL: 'critical',
} as const

export type AssetCondition = (typeof ASSET_CONDITION)[keyof typeof ASSET_CONDITION]

export const MACHINERY_OPERATIONAL = {
  RUNNING: 'running',
  IDLE: 'idle',
  SCRAP: 'scrap',
  DISPOSED: 'disposed',
} as const

export type MachineryOperational =
  (typeof MACHINERY_OPERATIONAL)[keyof typeof MACHINERY_OPERATIONAL]

export const MACHINERY_OPERATIONAL_LABEL: Record<MachineryOperational, string> = {
  running: 'Running',
  idle: 'Idle',
  scrap: 'Scrap',
  disposed: 'Disposed',
}

export const ASSET_HISTORY_EVENT = {
  CREATED: 'created',
  VALUATION_CHANGED: 'valuation_changed',
  STATUS_CHANGED: 'status_changed',
  UTILIZATION_CHANGED: 'utilization_changed',
  ENCROACHMENT_UPDATED: 'encroachment_updated',
  EVIDENCE_ADDED: 'evidence_added',
  DISPOSAL_RECORDED: 'disposal_recorded',
} as const

export type AssetHistoryEventType =
  (typeof ASSET_HISTORY_EVENT)[keyof typeof ASSET_HISTORY_EVENT]

/** Provisional underutilized threshold until stakeholder-approved (Phase 8). */
export const ASSET_UNDERUTILIZED_THRESHOLD_PCT = 40

/** Provisional prototype “today” for expiry/deadline calculations (Phase 9). */
export const DEMO_AS_OF_DATE = '2026-08-08'

export const EMPLOYMENT_TYPE = {
  REGULAR: 'regular',
  CONTRACT: 'contract',
  DEPUTATION: 'deputation',
  INTERN: 'intern',
} as const

export type EmploymentType = (typeof EMPLOYMENT_TYPE)[keyof typeof EMPLOYMENT_TYPE]

export const EMPLOYMENT_TYPE_LABEL: Record<EmploymentType, string> = {
  regular: 'Regular',
  contract: 'Contract',
  deputation: 'Deputation',
  intern: 'Intern',
}

export const GENDER = {
  MALE: 'male',
  FEMALE: 'female',
  OTHER: 'other',
  NOT_DISCLOSED: 'not_disclosed',
} as const

export type Gender = (typeof GENDER)[keyof typeof GENDER]

export const DECLARATION_STATUS = {
  COMPLETE: 'complete',
  PENDING: 'pending',
  OVERDUE: 'overdue',
  NOT_REQUIRED: 'not_required',
} as const

export type DeclarationStatus =
  (typeof DECLARATION_STATUS)[keyof typeof DECLARATION_STATUS]

export const DECLARATION_STATUS_LABEL: Record<DeclarationStatus, string> = {
  complete: 'Complete',
  pending: 'Pending',
  overdue: 'Overdue',
  not_required: 'Not required',
}

export const DIRECTOR_TYPE = {
  CHAIRMAN: 'chairman',
  INDEPENDENT: 'independent',
  GOVERNMENT: 'government',
  PRIVATE: 'private',
  WOMAN_DIRECTOR: 'woman_director',
} as const

export type DirectorType = (typeof DIRECTOR_TYPE)[keyof typeof DIRECTOR_TYPE]

export const DIRECTOR_TYPE_LABEL: Record<DirectorType, string> = {
  chairman: 'Chairman',
  independent: 'Independent',
  government: 'Government',
  private: 'Private',
  woman_director: 'Woman director',
}

export const BOARD_MEMBER_STATUS = {
  ACTIVE: 'active',
  EXPIRED: 'expired',
  VACANT: 'vacant',
  RESIGNED: 'resigned',
  REMOVED: 'removed',
  DECEASED: 'deceased',
  AWAITING_APPOINTMENT: 'awaiting_appointment',
  REAPPOINTED: 'reappointed',
  SUPERSEDED: 'superseded',
} as const

export type BoardMemberStatus =
  (typeof BOARD_MEMBER_STATUS)[keyof typeof BOARD_MEMBER_STATUS]

export const BOARD_MEMBER_STATUS_LABEL: Record<BoardMemberStatus, string> = {
  active: 'Active',
  expired: 'Expired',
  vacant: 'Vacant position',
  resigned: 'Resigned',
  removed: 'Removed',
  deceased: 'Deceased',
  awaiting_appointment: 'Awaiting appointment',
  reappointed: 'Reappointed',
  superseded: 'Superseded',
}

export const WORKFORCE_STATUS = {
  ACTIVE: 'active',
  ON_DEPUTATION: 'on_deputation',
  ON_LEAVE: 'on_leave',
  SUSPENDED: 'suspended',
  RETIRED: 'retired',
  RESIGNED: 'resigned',
  TERMINATED: 'terminated',
  DECEASED: 'deceased',
  CONTRACT_ENDED: 'contract_ended',
  TRANSFERRED_OUT: 'transferred_out',
} as const

export type WorkforceStatus =
  (typeof WORKFORCE_STATUS)[keyof typeof WORKFORCE_STATUS]

export const WORKFORCE_STATUS_LABEL: Record<WorkforceStatus, string> = {
  active: 'Active',
  on_deputation: 'On deputation',
  on_leave: 'On leave',
  suspended: 'Suspended',
  retired: 'Retired',
  resigned: 'Resigned',
  terminated: 'Terminated',
  deceased: 'Deceased',
  contract_ended: 'Contract ended',
  transferred_out: 'Transferred out',
}

export const BOARD_EXPIRY_BAND = {
  EXPIRED: 'expired',
  WITHIN_30: 'within_30',
  WITHIN_90: 'within_90',
  WITHIN_180: 'within_180',
  OK: 'ok',
  VACANCY: 'vacancy',
} as const

export type BoardExpiryBand =
  (typeof BOARD_EXPIRY_BAND)[keyof typeof BOARD_EXPIRY_BAND]

export const BOARD_EXPIRY_BAND_LABEL: Record<BoardExpiryBand, string> = {
  expired: 'Expired',
  within_30: 'Expires ≤30 days',
  within_90: 'Expires ≤90 days',
  within_180: 'Expires ≤180 days',
  ok: 'On track',
  vacancy: 'Vacancy',
}

export const COMMITTEE_TYPE = {
  AUDIT: 'audit',
  HR: 'hr',
  RISK: 'risk',
  PROCUREMENT: 'procurement',
} as const

export type CommitteeType = (typeof COMMITTEE_TYPE)[keyof typeof COMMITTEE_TYPE]

export const COMMITTEE_TYPE_LABEL: Record<CommitteeType, string> = {
  audit: 'Audit Committee',
  hr: 'HR Committee',
  risk: 'Risk Committee',
  procurement: 'Procurement Committee',
}

export const CONSULTANT_STATUS = {
  ACTIVE: 'active',
  COMPLETED: 'completed',
  EXPIRING: 'expiring',
} as const

export type ConsultantStatus =
  (typeof CONSULTANT_STATUS)[keyof typeof CONSULTANT_STATUS]

export const GOVERNANCE_CALENDAR_KIND = {
  BOARD_EXPIRY: 'board_expiry',
  BOARD_VACANCY: 'board_vacancy',
  COMMITTEE_REQUIREMENT: 'committee_requirement',
  DECLARATION_DUE: 'declaration_due',
  PENDING_APPOINTMENT: 'pending_appointment',
  GOVERNANCE_DEADLINE: 'governance_deadline',
} as const

export type GovernanceCalendarKind =
  (typeof GOVERNANCE_CALENDAR_KIND)[keyof typeof GOVERNANCE_CALENDAR_KIND]

export const EXECUTIVE_ROLE = {
  CEO: 'CEO',
  MD: 'MD',
  GM: 'GM',
  DIRECTOR: 'Director',
  CFO: 'CFO',
} as const

export type ExecutiveRole = (typeof EXECUTIVE_ROLE)[keyof typeof EXECUTIVE_ROLE]

export const REPORTING_PERIOD_TYPE = {
  ANNUAL: 'annual',
  QUARTERLY: 'quarterly',
  MONTHLY: 'monthly',
  EVENT_BASED: 'event_based',
  SPECIAL: 'special',
} as const

export type ReportingPeriodType =
  (typeof REPORTING_PERIOD_TYPE)[keyof typeof REPORTING_PERIOD_TYPE]

export const PORTAL = {
  SOE_ENTRY: 'soe_entry',
  SOE_REVIEW: 'soe_review',
  MOIP_REVIEW: 'moip_review',
  MOIP_EXECUTIVE: 'moip_executive',
  /** Legacy namespace retained only for redirects/backward-compatible route aliases. */
  SOE: 'soe',
  /** Legacy namespace retained only for redirects/backward-compatible route aliases. */
  MOIP: 'moip',
  /** Legacy executive lens retained for hidden compatibility routes. */
  SECRETARY: 'secretary',
  /** Legacy executive lens retained for hidden compatibility routes. */
  MINISTER: 'minister',
  /** Legacy executive lens retained for hidden compatibility routes. */
  PMO: 'pmo',
  ASSURANCE: 'assurance',
} as const

export type PortalId = (typeof PORTAL)[keyof typeof PORTAL]

export const ROLE = {
  SOE_FOCAL_PERSON: 'soe_focal_person',
  SOE_DATA_CONTRIBUTOR: 'soe_data_contributor',
  SOE_CERTIFIER: 'soe_certifier',
  SOE_EXECUTIVE: 'soe_executive',
  FINANCE_OFFICER: 'finance_officer',
  HR_OFFICER: 'hr_officer',
  ASSET_OFFICER: 'asset_officer',
  COMPANY_SECRETARY: 'company_secretary',
  LEGAL_OFFICER: 'legal_officer',
  PROCUREMENT_OFFICER: 'procurement_officer',
  INTERNAL_AUDIT: 'internal_audit',
  CEO: 'ceo',
  CFO: 'cfo',
  MOIP_REVIEWER: 'moip_reviewer',
  MOIP_ANALYST: 'moip_analyst',
  MOIP_SUPERVISOR: 'moip_supervisor',
  EXECUTIVE_VIEWER: 'executive_viewer',
  SECRETARY: 'secretary',
  MINISTER: 'minister',
  PMO: 'pmo',
  ASSURANCE_USER: 'assurance_user',
  SYSTEM_ADMIN: 'system_admin',
} as const

export type RoleId = (typeof ROLE)[keyof typeof ROLE]

export const ROLE_LABEL: Record<RoleId, string> = {
  soe_focal_person: 'SOE Contributor',
  soe_data_contributor: 'SOE Contributor',
  soe_certifier: 'SOE Certifier',
  soe_executive: 'SOE Executive',
  finance_officer: 'Finance Officer',
  hr_officer: 'HR Officer',
  asset_officer: 'Asset Officer',
  company_secretary: 'Company Secretary',
  legal_officer: 'Legal Officer',
  procurement_officer: 'Procurement Officer',
  internal_audit: 'Internal Audit',
  ceo: 'CEO',
  cfo: 'CFO',
  moip_reviewer: 'MoIP Reviewer',
  moip_analyst: 'MoIP Analyst',
  moip_supervisor: 'MoIP Supervisory Officer',
  executive_viewer: 'Executive Viewer',
  secretary: 'Secretary',
  minister: 'Minister',
  pmo: 'PMO',
  assurance_user: 'Assurance User',
  system_admin: 'System Administrator',
}

export const MODULE = {
  ENTERPRISE: 'enterprise',
  ASSETS: 'assets',
  WORKFORCE: 'workforce',
  BOARD: 'board',
  EXECUTIVES: 'executives',
  FINANCE: 'finance',
  LOANS: 'loans',
  PROCUREMENT: 'procurement',
  AUDIT: 'audit',
  LITIGATION: 'litigation',
  COMPLIANCE: 'compliance',
  INDUSTRIAL: 'industrial',
  PRIVATIZATION: 'privatization',
  DOCUMENTS: 'documents',
  SUBMISSIONS: 'submissions',
  INTELLIGENCE: 'intelligence',
} as const

export type ModuleId = (typeof MODULE)[keyof typeof MODULE]

/** Phase 12 document categories — provisional taxonomy */
export const DOCUMENT_CATEGORY = {
  MEMORANDUM: 'memorandum',
  ARTICLES: 'articles',
  ANNUAL_REPORTS: 'annual_reports',
  BOARD_MINUTES: 'board_minutes',
  FINANCIAL_STATEMENTS: 'financial_statements',
  AUDIT_REPORTS: 'audit_reports',
  PROPERTY_DOCUMENTS: 'property_documents',
  LEASE_AGREEMENTS: 'lease_agreements',
  HR_RULES: 'hr_rules',
  SERVICE_RULES: 'service_rules',
  NOTIFICATIONS: 'notifications',
  CABINET_DECISIONS: 'cabinet_decisions',
  COURT_ORDERS: 'court_orders',
  PRIVATIZATION_DOCUMENTS: 'privatization_documents',
  /** Legacy/module seed categories retained for transitional fixtures */
  OTHER: 'other',
} as const

export type DocumentCategory =
  (typeof DOCUMENT_CATEGORY)[keyof typeof DOCUMENT_CATEGORY]

export const DOCUMENT_CATEGORY_LABEL: Record<string, string> = {
  memorandum: 'Memorandum',
  articles: 'Articles',
  annual_reports: 'Annual Reports',
  board_minutes: 'Board Minutes',
  financial_statements: 'Financial Statements',
  audit_reports: 'Audit Reports',
  property_documents: 'Property Documents',
  lease_agreements: 'Lease Agreements',
  hr_rules: 'HR Rules',
  service_rules: 'Service Rules',
  notifications: 'Notifications',
  cabinet_decisions: 'Cabinet Decisions',
  court_orders: 'Court Orders',
  privatization_documents: 'Privatization Documents',
  other: 'Other',
  ownership: 'Ownership',
  mutation: 'Mutation',
  revenue_record: 'Revenue Record',
  valuation_report: 'Valuation Report',
  photograph: 'Photograph',
  finance: 'Finance',
  enterprise: 'Enterprise',
  assets: 'Assets',
  workforce: 'Workforce',
  board: 'Board',
  executives: 'Executives',
  loans: 'Loans',
  procurement: 'Procurement',
  audit: 'Audit',
  litigation: 'Litigation',
  compliance: 'Compliance',
  industrial: 'Industrial',
  privatization: 'Privatization',
  documents: 'Documents',
}

export const DOCUMENT_EVIDENCE_STATUS = {
  AVAILABLE: 'available',
  MISSING: 'missing',
  PENDING_REVIEW: 'pending_review',
  VERIFIED: 'verified',
  SUPERSEDED: 'superseded',
} as const

export type DocumentEvidenceStatusConst =
  (typeof DOCUMENT_EVIDENCE_STATUS)[keyof typeof DOCUMENT_EVIDENCE_STATUS]

export const DOCUMENT_EVIDENCE_STATUS_LABEL: Record<string, string> = {
  available: 'Available',
  missing: 'Missing',
  pending_review: 'Pending Review',
  verified: 'Verified',
  superseded: 'Superseded',
}

/** Phase 13 MoIP escalation — provisional taxonomy */
export const ESCALATION_REASON = {
  OVERDUE_SOE_RESPONSE: 'overdue_soe_response',
  OVERDUE_SUBMISSION: 'overdue_submission',
  HIGH_VALUE_AUDIT_LEGAL: 'high_value_audit_legal',
  UNRESOLVED_REVIEW: 'unresolved_review',
  MISSING_SUBMISSION: 'missing_submission',
  OTHER: 'other',
} as const

export type EscalationReason =
  (typeof ESCALATION_REASON)[keyof typeof ESCALATION_REASON]

export const ESCALATION_REASON_LABEL: Record<string, string> = {
  overdue_soe_response: 'Overdue SOE response',
  overdue_submission: 'Overdue submission',
  high_value_audit_legal: 'High-value audit/legal',
  unresolved_review: 'Unresolved review',
  missing_submission: 'Missing submission',
  other: 'Other',
}

export const ESCALATION_SEVERITY = {
  ATTENTION: 'attention',
  CRITICAL: 'critical',
} as const

export const ESCALATION_SEVERITY_LABEL: Record<string, string> = {
  attention: 'Attention',
  critical: 'Critical',
}

export const REVIEW_PRIORITY = {
  NORMAL: 'normal',
  HIGH: 'high',
  CRITICAL: 'critical',
} as const

export const REVIEW_PRIORITY_LABEL: Record<string, string> = {
  normal: 'Normal',
  high: 'High',
  critical: 'Critical',
}

/** Prototype comparison rules (Phase 13) — provisional until stakeholder confirmation */
export const MOIP_COMPARISON_RULES = {
  materialYoYPct: 25,
  reviewAgeOverdueDays: 14,
  clarificationResponseOverdueDays: 7,
  note: 'Material change = |YoY| ≥ 25%. Review overdue after 14 days under review. Clarification overdue after 7 days.',
} as const

/** Phase 10 lender taxonomy — provisional until stakeholder confirmation */
export const LENDER_CATEGORY = {
  GOVERNMENT: 'government',
  BANK: 'bank',
  FOREIGN: 'foreign',
  ADB: 'adb',
  WORLD_BANK: 'world_bank',
  CHINA: 'china',
  COMMERCIAL: 'commercial',
} as const

export type LenderCategoryConst = (typeof LENDER_CATEGORY)[keyof typeof LENDER_CATEGORY]

export const LENDER_CATEGORY_LABEL: Record<LenderCategoryConst, string> = {
  government: 'Government',
  bank: 'Bank',
  foreign: 'Foreign',
  adb: 'ADB',
  world_bank: 'World Bank',
  china: 'China',
  commercial: 'Commercial',
}

export const LOAN_REPAYMENT_STATUS = {
  ON_TRACK: 'on_track',
  DUE_SOON: 'due_soon',
  OVERDUE: 'overdue',
  COMPLETED: 'completed',
} as const

/** Phase 20 — searchable datasets for intelligence query */
export const SEARCH_DATASET = {
  ORGANIZATIONS: 'organizations',
  ASSETS: 'assets',
  BOARD_MEMBERS: 'board_members',
  FINANCIAL_PERFORMANCE: 'financial_performance',
  LOANS: 'loans',
  PROCUREMENT: 'procurement',
  AUDIT_PARAS: 'audit_paras',
  LITIGATION: 'litigation',
  COMPLIANCE: 'compliance',
  PRIVATIZATION: 'privatization',
  DOCUMENTS: 'documents',
} as const

export type SearchDataset = (typeof SEARCH_DATASET)[keyof typeof SEARCH_DATASET]

export const SEARCH_DATASET_LABEL: Record<SearchDataset, string> = {
  organizations: 'SOEs',
  assets: 'Assets',
  board_members: 'Board Members',
  financial_performance: 'Financial Performance',
  loans: 'Loans',
  procurement: 'Procurement',
  audit_paras: 'Audit Paras',
  litigation: 'Litigation',
  compliance: 'Compliance',
  privatization: 'Privatization',
  documents: 'Documents',
}

export const SEARCH_OPERATOR = {
  EQ: 'eq',
  NEQ: 'neq',
  CONTAINS: 'contains',
  GT: 'gt',
  LT: 'lt',
  BETWEEN: 'between',
  IN: 'in',
  BEFORE: 'before',
  AFTER: 'after',
  IS_EMPTY: 'is_empty',
  IS_NOT_EMPTY: 'is_not_empty',
} as const

export type SearchOperator = (typeof SEARCH_OPERATOR)[keyof typeof SEARCH_OPERATOR]

export const SEARCH_OPERATOR_LABEL: Record<SearchOperator, string> = {
  eq: 'Equals',
  neq: 'Not equals',
  contains: 'Contains',
  gt: 'Greater than',
  lt: 'Less than',
  between: 'Between',
  in: 'In',
  before: 'Before',
  after: 'After',
  is_empty: 'Is empty',
  is_not_empty: 'Is not empty',
}

export const SEARCH_FIELD_TYPE = {
  TEXT: 'text',
  SELECT: 'select',
  MULTI_SELECT: 'multi_select',
  NUMBER: 'number',
  DATE: 'date',
  BOOLEAN: 'boolean',
  STATUS: 'status',
  PERIOD: 'period',
  ORGANIZATION: 'organization',
  SECTOR: 'sector',
  PROVINCE: 'province',
} as const

export type SearchFieldType =
  (typeof SEARCH_FIELD_TYPE)[keyof typeof SEARCH_FIELD_TYPE]

/** Phase 21 — report catalogue groups */
export const REPORT_GROUP = {
  ENTERPRISE: 'enterprise',
  GOVERNANCE: 'governance',
  FINANCIAL: 'financial',
  ASSETS: 'assets',
  ACCOUNTABILITY: 'accountability',
  EXECUTIVE: 'executive',
} as const

export type ReportGroup = (typeof REPORT_GROUP)[keyof typeof REPORT_GROUP]

export const REPORT_GROUP_LABEL: Record<ReportGroup, string> = {
  enterprise: 'Enterprise',
  governance: 'Governance',
  financial: 'Financial',
  assets: 'Assets',
  accountability: 'Accountability',
  executive: 'Executive',
}

export const REPORT_ID = {
  SOE_PROFILE: 'soe_profile',
  ANNUAL_PORTFOLIO: 'annual_portfolio',
  ASSET: 'asset',
  FISCAL_EXPOSURE: 'fiscal_exposure',
  BOARD_GOVERNANCE: 'board_governance',
  AUDIT: 'audit',
  LITIGATION: 'litigation',
  COMPLIANCE: 'compliance',
  PRIVATIZATION: 'privatization',
  INDUSTRIAL: 'industrial',
  MINISTER_BRIEF: 'minister_brief',
  CABINET_BRIEF: 'cabinet_brief',
} as const

export type ReportId = (typeof REPORT_ID)[keyof typeof REPORT_ID]

export const REPORT_DATA_STATUS = {
  APPROVED: 'approved',
  PROTOTYPE: 'prototype',
  PROTOTYPE_MIXED: 'prototype_mixed',
} as const

export type ReportDataStatus =
  (typeof REPORT_DATA_STATUS)[keyof typeof REPORT_DATA_STATUS]

export const REPORT_DATA_STATUS_LABEL: Record<ReportDataStatus, string> = {
  approved: 'Approved / Locked source data',
  prototype: 'Prototype methodology',
  prototype_mixed: 'Mixed — some rows not approved/locked',
}

export const REPORT_EXPORT_FORMAT = {
  PDF: 'pdf',
  EXCEL: 'excel',
} as const

export type ReportExportFormat =
  (typeof REPORT_EXPORT_FORMAT)[keyof typeof REPORT_EXPORT_FORMAT]

export const LOAN_REPAYMENT_STATUS_LABEL: Record<string, string> = {
  on_track: 'On track',
  due_soon: 'Due soon',
  overdue: 'Overdue',
  completed: 'Completed',
}

export const LOAN_GUARANTEE_STATUS = {
  NONE: 'none',
  PARTIAL: 'partial',
  FULL: 'full',
} as const

export const LOAN_GUARANTEE_STATUS_LABEL: Record<string, string> = {
  none: 'None',
  partial: 'Partial',
  full: 'Full',
}

export const AUDIT_STATUS_LABEL: Record<string, string> = {
  audited: 'Audited',
  unaudited: 'Unaudited',
  qualified: 'Qualified',
}
