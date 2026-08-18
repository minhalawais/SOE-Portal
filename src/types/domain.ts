import type {
  AssetCondition,
  AssetEvidenceStatus,
  AssetHistoryEventType,
  AssetLitigationStatus,
  AssetOccupancy,
  AssetType,
  AssetUtilization,
  BoardMemberStatus,
  CommitteeType,
  ComplianceStatus,
  ConsultantStatus,
  DeclarationStatus,
  DirectorType,
  EmploymentType,
  EncroachmentStatus,
  EnterpriseHistoryEventType,
  ExecutiveRole,
  Gender,
  GovernanceCalendarKind,
  LandUseClass,
  LeaseStatus,
  LegalStatus,
  MachineryOperational,
  ModuleId,
  RelationshipStatus,
  RelationshipType,
  ReportingPeriodType,
  RoleId,
  ShareholderCategory,
  SoeStatus,
  SubmissionStatus,
} from '@/constants'
import type { ScenarioId } from '@/mock-data/scenarios'

export interface Organization {
  id: string
  name: string
  abbreviation: string
  legalStatus: LegalStatus
  sector: string
  subSector?: string
  natureOfBusiness?: string
  status: SoeStatus
  parentMinistry: string
  attachedDepartment?: string
  administrativeMinistry?: string
  operatingMinistry?: string
  companyRegistrationNo?: string
  ntn?: string
  secpRegistrationNo?: string
  strn?: string
  dateOfIncorporation?: string
  website?: string
  corporateEmail?: string
  headOfficeAddress: string
  governmentOwnershipPct: number
  authorizedCapitalPkr?: number
  paidUpCapitalPkr?: number
  issuedCapitalPkr?: number
  ultimateBeneficialOwner?: string
  scenarioId: ScenarioId
  /** @deprecated use scenarioId — retained for older screens */
  scenarioTag: string
  isDummyDemonstrationData: true
}

export interface OrganizationRelationship {
  id: string
  parentOrganizationId: string
  relatedOrganizationId: string
  relationshipType: RelationshipType
  ownershipPercentage: number
  status: RelationshipStatus
  reportingContact?: string
  performanceNotes?: string
  revenueReported?: number
  netProfitReported?: number
  capacityUtilizationReported?: number
}

export interface OwnershipLine {
  id: string
  organizationId: string
  category: ShareholderCategory
  holderName: string
  percentage: number
}

export interface OrganizationContact {
  id: string
  organizationId: string
  name: string
  designation: string
  email: string
  phone: string
  isPrimary: boolean
}

export interface EnterpriseHistoryEvent {
  id: string
  organizationId: string
  eventType: EnterpriseHistoryEventType
  occurredAt: string
  summary: string
  previousValue?: string
  newValue?: string
  actorLabel?: string
}

export interface OrganizationLocation {
  id: string
  organizationId: string
  label: string
  kind: 'head_office' | 'factory' | 'warehouse' | 'regional_office' | 'provincial_office'
  province: string
  district: string
  address?: string
  latitude: number
  longitude: number
  /** Closed unit footprint as [latitude, longitude] vertices */
  polygon?: Array<[number, number]>
}

export interface HierarchyNode {
  organizationId: string
  name: string
  abbreviation: string
  relationshipType?: RelationshipType
  ownershipPercentage?: number
  status: SoeStatus
  children: HierarchyNode[]
}

export interface SubsidiaryDetail {
  organization: Organization
  relationship: OrganizationRelationship
  performanceSnapshot: {
    revenue?: number
    netProfit?: number
    capacityUtilization?: number
  }
  financialStatementAvailable: boolean
  boardMemberCount: number
  boardVacancyCount: number
  assetsSummary: { count: number; bookValueTotal: number }
  liabilitiesNote: string
}

export interface RegistryRow {
  organization: Organization
  headOffice: string
  parentAdministrative: string
  reportingStatus?: SubmissionStatus | 'not_started'
}

export interface ReportingPeriod {
  id: string
  label: string
  type: ReportingPeriodType
  fiscalYear: string
  startDate: string
  endDate: string
  status: 'open' | 'closed' | 'locked'
}

export interface Asset {
  id: string
  organizationId: string
  assetType: AssetType
  name: string
  identifier?: string
  bookValue?: number
  marketValue?: number
  valuationDate?: string
  valuationMethod?: string
  valuationAuthority?: string
  utilizationStatus?: AssetUtilization
  utilizationPercent?: number
  litigationStatus?: AssetLitigationStatus
  encroachmentStatus?: EncroachmentStatus
  leaseStatus?: LeaseStatus
  evidenceStatus?: AssetEvidenceStatus
  linkedLitigationId?: string
  province?: string
  district?: string
  tehsil?: string
  latitude?: number
  longitude?: number
  ownershipNote?: string
  acquisitionDate?: string
  purpose?: string
  currentUse?: string
  condition?: AssetCondition
  lastUpdated?: string
  disposed?: boolean
  /** Land */
  mouza?: string
  surveyNumber?: string
  khasraNumber?: string
  areaAcres?: number
  areaKanals?: number
  areaSqFt?: number
  occupancyStatus?: AssetOccupancy
  useClassification?: LandUseClass
  /** Building */
  buildingType?: string
  floorAreaSqFt?: number
  buildingAgeYears?: number
  replacementValue?: number
  maintenanceCostAnnual?: number
  insuranceValue?: number
  linkedLandAssetId?: string
  documentReference?: string
  mutationReference?: string
  photoReference?: string
  /** Machinery */
  machineId?: string
  manufacturer?: string
  purchaseCost?: number
  purchaseDate?: string
  depreciation?: number
  usefulLifeYears?: number
  operationalStatus?: MachineryOperational
  capacity?: string
  maintenanceSchedule?: string
  /** Vehicle */
  vehicleNumber?: string
  vehicleType?: string
  purchaseYear?: number
  assignedOfficer?: string
  mileageKm?: number
  fuelConsumption?: string
  gpsAvailable?: boolean
  disposalStatus?: string
  /** Other / IT equipment */
  equipmentCategory?: string
}

export interface AssetHistoryEvent {
  id: string
  assetId: string
  organizationId: string
  eventType: AssetHistoryEventType
  occurredAt: string
  summary: string
  previousValue?: string
  newValue?: string
  actorLabel?: string
}

export interface AssetSummary {
  organizationId?: string
  totalCount: number
  totalBookValue: number
  totalMarketValue: number
  countByType: Record<string, number>
  idleOrUnusedCount: number
  encroachedLandCount: number
  underLitigationCount: number
  missingValuationCount: number
  missingEvidenceCount: number
}

export interface GeoFeature {
  id: string
  assetId: string
  organizationId: string
  type: 'Point' | 'Polygon'
  coordinates: number[] | number[][]
  label: string
}

export interface SanctionedPost {
  id: string
  organizationId: string
  designation: string
  payScale: string
  sanctioned: number
  filled: number
  vacant: number
  department: string
  criticality?: 'critical' | 'standard'
}

export interface Employee {
  id: string
  organizationId: string
  employeeCode: string
  name: string
  designation: string
  employmentType: EmploymentType
  payScale?: string
  posting?: string
  province?: string
  reportingOfficer?: string
  joiningDate?: string
  retirementDate?: string
  gender?: Gender
  disabilityFlag?: boolean
  performanceRating?: string
  assetDeclarationStatus?: DeclarationStatus
  /** Fictional CNIC — mask in normal views */
  cnic?: string
  /** Sensitive — role-gated */
  salaryPkr?: number
  qualification?: string
  trainingSummary?: string
  allowancesPkr?: number
  benefitsSummary?: string
  pensionScheme?: string
  disciplinaryOpenCases?: number
  isDummyDemonstrationData: true
}

export interface DailyWager {
  id: string
  organizationId: string
  name: string
  roleLabel: string
  durationMonths: number
  dailyRatePkr: number
  fundingSource: string
  posting?: string
  isDummyDemonstrationData: true
}

export interface Consultant {
  id: string
  organizationId: string
  name: string
  project: string
  contractStart: string
  contractEnd: string
  monthlyRemunerationPkr: number
  fundingSource: string
  torsSummary: string
  deliverablesSummary: string
  status: ConsultantStatus
  isDummyDemonstrationData: true
}

export interface BoardMember {
  id: string
  organizationId: string
  name: string
  role: string
  memberType: DirectorType
  appointmentDate: string
  expiryDate: string
  isVacancySlot?: boolean
  status: BoardMemberStatus
  attendancePct?: number
  committeeIds?: string[]
  conflictDeclarationStatus?: DeclarationStatus
  assetDeclarationStatus?: DeclarationStatus
  qualification?: string
  /** Sensitive — role-gated */
  remunerationPkr?: number
  sittingFeePkr?: number
  travelExpensePkr?: number
  /** Fictional CNIC — mask in list views */
  cnic?: string
  /** Assigned SOE / government facilities and perks */
  assignedFacilities?: BoardMemberAssignedFacilities
  isDummyDemonstrationData: true
}

export type OfficialVehicleAssignment = 'dedicated' | 'pool' | 'none'
export type SecurityVehicleAssignment = 'authorized' | 'none'

export interface BoardMemberAssignedFacilities {
  officialVehicle: OfficialVehicleAssignment
  fuelAllowance: string
  officialResidence: boolean
  medicalFacility: string
  officeSecretariat: boolean
  laptopComputer: boolean
  mobileHandset: boolean
  communicationAllowance: string
  internetFacility: boolean
  travelFacility: string
  securityVehicle: SecurityVehicleAssignment
  otherAssignedAsset: string
}

export interface BoardCommittee {
  id: string
  organizationId: string
  committeeType: CommitteeType
  chairBoardMemberId?: string
  memberBoardMemberIds: string[]
  status: 'active' | 'inactive' | 'forming'
  vacancyCount: number
}

export interface Executive {
  id: string
  organizationId: string
  name: string
  role: ExecutiveRole
  appointmentDate: string
  /** Sensitive — role-gated */
  salaryPkr?: number
  bonusPkr?: number
  perksSummary?: string
  officialResidence?: boolean
  vehiclesAssigned?: number
  foreignVisitsLastYear?: number
  performanceKpiSummary?: string
  isDummyDemonstrationData: true
}

export interface GovernanceCalendarEvent {
  id: string
  organizationId: string
  kind: GovernanceCalendarKind
  title: string
  dueDate: string
  status: 'upcoming' | 'overdue' | 'due_soon'
  relatedRecordType: 'board_member' | 'committee' | 'executive' | 'declaration' | 'appointment'
  relatedRecordId?: string
  linkPath?: string
}

export interface WorkforceSummary {
  organizationId?: string
  sanctioned: number
  filled: number
  vacant: number
  vacancyRatePct: number
  byEmploymentType: Record<string, number>
  genderCounts: Record<string, number>
  disabilityCount: number
  byProvince: Record<string, number>
  dailyWagerCount: number
  consultantActiveCount: number
  pensionersCount: number
}

export interface BoardSummary {
  organizationId?: string
  boardSize: number
  activeMembers: number
  vacancies: number
  womenDirectors: number
  independentDirectors: number
  governmentDirectors: number
  privateDirectors: number
  upcomingExpiries: number
  expiredCount: number
  missingDeclarations: number
  committeeCoverage: number
  boardStatus: 'complete' | 'vacancies' | 'expiry_risk' | 'no_board'
}

export interface FinancialMetric {
  id: string
  organizationId: string
  reportingPeriodId: string
  revenue: number
  operatingExpenses: number
  capex: number
  profitOrLoss: number
  cashFlow?: number
  workingCapital?: number
  subsidies: number
  /** Provisional: government support distinct from subsidies (demo field) */
  governmentSupport?: number
  annualBudget?: number
  receivables?: number
  payables?: number
  inventory?: number
  currentAssets?: number
  currentLiabilities?: number
  totalAssets?: number
  equity?: number
  totalDebt?: number
  auditStatus?: 'audited' | 'unaudited' | 'qualified'
  status: SubmissionStatus
  version?: string
  certifiedBy?: string
  certifiedAt?: string
  approvedBy?: string
  approvedAt?: string
}

export interface BudgetLine {
  id: string
  organizationId: string
  reportingPeriodId: string
  category: string
  budget: number
  actual: number
}

export interface FinancialVersionSnapshot {
  id: string
  financialMetricId: string
  organizationId: string
  reportingPeriodId: string
  version: string
  capturedAt: string
  reason: string
  values: Pick<
    FinancialMetric,
    | 'revenue'
    | 'operatingExpenses'
    | 'capex'
    | 'profitOrLoss'
    | 'cashFlow'
    | 'workingCapital'
    | 'subsidies'
    | 'governmentSupport'
  >
}

/** Executive intelligence — only populated from approved/locked finance */
export interface ApprovedFinanceKpi {
  id: string
  organizationId: string
  reportingPeriodId: string
  financialMetricId: string
  submissionId: string
  version: string
  revenue: number
  profitOrLoss: number
  subsidies: number
  approvedAt: string
  approvedBy: string
}

export interface NotificationItem {
  id: string
  organizationId?: string
  title: string
  body: string
  createdAt: string
  status: 'unread' | 'read'
  linkRoute: string
  linkedRecordType?: string
  linkedRecordId?: string
}

export interface Loan {
  id: string
  organizationId: string
  lender: string
  lenderCategory: LenderCategory
  loanType: string
  principal: number
  outstanding: number
  interestRate: number
  nextDueDate: string
  repaymentStatus: LoanRepaymentStatus
  guaranteeStatus: LoanGuaranteeStatus
  relatedGuaranteeId?: string
  defaultStatus: string
  repaymentScheduleNote?: string
  isDummyDemonstrationData: true
}

export type LenderCategory =
  | 'government'
  | 'bank'
  | 'foreign'
  | 'adb'
  | 'world_bank'
  | 'china'
  | 'commercial'

export type LoanRepaymentStatus = 'on_track' | 'due_soon' | 'overdue' | 'completed'
export type LoanGuaranteeStatus = 'none' | 'partial' | 'full'

export interface LoanRepayment {
  id: string
  loanId: string
  organizationId: string
  dueDate: string
  amountDue: number
  amountPaid: number
  status: 'pending' | 'paid' | 'overdue' | 'partial'
}

export interface Grant {
  id: string
  organizationId: string
  source: string
  project?: string
  amount: number
  utilized: number
  remaining: number
  completionPct?: number
  completionTargetDate?: string
  status: string
  isDummyDemonstrationData: true
}

export interface Guarantee {
  id: string
  organizationId: string
  reference: string
  guarantor: string
  amount: number
  relatedLoanId?: string
  status: string
  exposure: number
  isDummyDemonstrationData: true
}

export interface GovernmentExposureSummary {
  organizationId?: string
  totalBorrowings: number
  outstandingLoans: number
  guarantees: number
  subsidies: number
  grants: number
  persistentLossYears: number
  /** Prototype methodology — not formally approved */
  isPrototypeMethodology: true
}

export interface ProcurementContract {
  id: string
  organizationId: string
  title: string
  planReference: string
  vendor: string
  value: number
  method: string
  ppraCompliance: string
  contractStatus: string
  completionStatus: string
  responsibleFunction: string
  evidenceAvailable: boolean
  startDate?: string
  endDate?: string
  completionDueDate?: string
  linkedContractId?: string
  isDummyDemonstrationData: true
}

export interface ContractRecord {
  id: string
  organizationId: string
  procurementId: string
  vendor: string
  contractValue: number
  startDate: string
  endDate: string
  completionPct: number
  responsibleOfficer: string
  status: string
  amendments: number
  evidenceAvailable: boolean
  isDummyDemonstrationData: true
}

export interface AuditRegister {
  id: string
  organizationId: string
  auditType: string
  auditPeriod: string
  auditor: string
  reportDate?: string
  status: string
  paraCount: number
  totalAmountInvolved: number
  evidenceAvailable: boolean
  isDummyDemonstrationData: true
}

export interface AuditPara {
  id: string
  organizationId: string
  auditId: string
  title: string
  /** @deprecated use title — retained for transitional reads */
  observation?: string
  amountInvolved: number
  dateRaised: string
  responsibleFunction: string
  responsibleOfficer: string
  responseDueDate: string
  status: string
  pacStatus: string
  recoveryStatus: string
  amountRecovered: number
  evidenceAvailable: boolean
  linkedPacId?: string
  isDummyDemonstrationData: true
}

export interface PacObservation {
  id: string
  organizationId: string
  auditParaId: string
  observation: string
  observationDate: string
  requiredAction: string
  responsibleParty: string
  dueDate: string
  status: string
  evidenceAvailable: boolean
  isDummyDemonstrationData: true
}

export interface LitigationCase {
  id: string
  organizationId: string
  court: string
  caseNumber: string
  petitioner: string
  respondent: string
  nature: string
  amountInvolved?: number
  lawyer: string
  status: string
  nextHearing?: string
  evidenceAvailable: boolean
  relatedAssetId?: string
  relatedAuditParaId?: string
  isDummyDemonstrationData: true
}

export interface ComplianceItem {
  id: string
  organizationId: string
  area: string
  reportingFrequency: string
  dueDate: string
  responsibleFunction: string
  status: ComplianceStatus
  evidenceAvailable: boolean
  lastSubmission?: string
  verificationState: string
  comments?: string
  isDummyDemonstrationData: true
}

export interface PrivatizationCase {
  id: string
  organizationId: string
  currentStage: string
  status: string
  cabinetDecision?: string
  ccopDecision?: string
  financialAdvisor?: string
  valuationAmountPkr?: number
  transactionStructure?: string
  blocker?: string
  nextAction?: string
  isDummyDemonstrationData: true
}

export interface ProcurementAnnualPlan {
  id: string
  organizationId: string
  fiscalYear: string
  title: string
  category: string
  estimatedValue: number
  method: string
  status: string
  responsibleFunction: string
  isDummyDemonstrationData: true
}

export interface PrivatizationMilestone {
  id: string
  privatizationCaseId: string
  organizationId: string
  stage: string
  name: string
  responsibleInstitution: string
  targetDate: string
  actualCompletionDate?: string
  status: string
  blocker?: string
  approvalNote?: string
  comments?: string
}

export interface TransformationInitiative {
  id: string
  organizationId: string
  initiative: string
  type: string
  rationale: string
  currentStage: string
  responsibleAuthority: string
  decisionStatus: string
  nextAction: string
  milestones: Array<{
    id: string
    name: string
    targetDate: string
    status: string
  }>
  evidenceAvailable: boolean
  isDummyDemonstrationData: true
}

export interface AccountabilityHistoryEvent {
  id: string
  organizationId: string
  recordType: string
  recordId: string
  occurredAt: string
  title: string
  actor: string
}

export interface IndustrialPerformance {
  id: string
  organizationId: string
  reportingPeriodId: string
  installedCapacity: number
  actualProduction: number
  capacityUtilization: number
  exports: number
  imports: number
  domesticSales: number
  employment: number
  energyConsumption: number
  /** Unit: MWh (provisional) */
  energyUnit: string
  carbonEmissions: number
  /** Unit: tCO2e (provisional) — not Scope 1/2/3 */
  carbonUnit: string
  capacityUnit: string
}

export interface KpiDefinition {
  id: string
  name: string
  unit: string
  formula: string
  sourceFields: string[]
  format: 'currency' | 'ratio' | 'percent' | 'number'
  nullHandling: string
  formulaNote: string
  /** Prototype until stakeholder-approved */
  provisional: true
}

export interface DocumentMeta {
  id: string
  organizationId: string
  title: string
  category: string
  fileName: string
  fileType?: string
  linkedRecordType?: string
  linkedRecordId?: string
  linkedModule?: string
  reportingPeriodId?: string
  uploadedAt: string
  uploadedBy: string
  /** Integer document version within a family */
  version: number
  /** Groups versions of the same logical document */
  documentFamilyId: string
  /** Controlled evidence lifecycle status */
  evidenceStatus: DocumentEvidenceStatus
  /** @deprecated prefer evidenceStatus — kept synced for transitional callers */
  status: string
  classification?: 'evidence' | 'official'
  isSensitive?: boolean
  isRestricted?: boolean
  notes?: string
  supersedesDocumentId?: string
  isDummyDemonstrationData: true
}

export type DocumentEvidenceStatus =
  | 'available'
  | 'missing'
  | 'pending_review'
  | 'verified'
  | 'superseded'

export interface FieldChangeRecord {
  id: string
  organizationId: string
  recordType: string
  recordId: string
  field: string
  previousValue: string
  currentValue: string
  changedBy: string
  changedAt: string
  reason?: string
}

export interface SubmissionHistoryEvent {
  id: string
  organizationId: string
  submissionId: string
  reportingPeriodId: string
  module: string
  occurredAt: string
  actorRole: string
  action: string
  status: string
  comment?: string
  relatedVersion?: string
}

export interface LineageNode {
  id: string
  kind:
    | 'kpi'
    | 'record'
    | 'evidence'
    | 'submission'
    | 'certification'
    | 'review'
  label: string
  detail?: string
  route?: string
  documentId?: string
  recordType?: string
  recordId?: string
}

export interface LineagePath {
  id: string
  title: string
  domain: 'finance' | 'asset' | 'governance'
  organizationId: string
  nodes: LineageNode[]
}

export interface TimelineEvent {
  id: string
  organizationId: string
  occurredAt: string
  title: string
  category: string
  actorRole?: string
  action?: string
  status?: string
  comment?: string
  relatedVersion?: string
  linkedRecordType?: string
  linkedRecordId?: string
}

export interface Submission {
  id: string
  organizationId: string
  reportingPeriodId: string
  module: ModuleId
  status: SubmissionStatus
  completeness: number
  version: string
  updatedAt: string
  /** ISO timestamp when pack entered MoIP queue */
  submittedAt?: string
  /** Provisional assignment — RoleId of MoIP reviewer */
  assignedReviewerRole?: RoleId
  /** Operational priority for queue sorting */
  priority?: 'normal' | 'high' | 'critical'
}

export interface Clarification {
  id: string
  submissionId: string
  organizationId: string
  question: string
  status: 'open' | 'responded' | 'closed'
  createdAt: string
  affectedField?: string
  dueDate?: string
  response?: string
  respondedAt?: string
  reviewerComment?: string
  /** Module of related submission — denormalized for MoIP queue */
  module?: ModuleId
  issuedByRole?: RoleId
}

export interface PendingDecision {
  id: string
  organizationId: string
  matter: string
  originatingModule: ModuleId | string
  dateRaised: string
  responsibleWing: string
  recommendationSummary: string
  urgency: 'attention' | 'critical'
  status: 'open' | 'under_consideration' | 'deferred' | 'closed'
  linkedRecordType?: string
  linkedRecordId?: string
  linkedEvidenceNote?: string
  route?: string
  acknowledgedAt?: string
  assignedTo?: string
  isDummyDemonstrationData: true
}

export interface Escalation {
  id: string
  organizationId: string
  submissionId?: string
  originatingAlertId?: string
  originatingTaskId?: string
  reason: string
  reasonCode:
    | 'overdue_soe_response'
    | 'overdue_submission'
    | 'high_value_audit_legal'
    | 'unresolved_review'
    | 'missing_submission'
    | 'other'
  severity: 'attention' | 'critical'
  ownerRole: RoleId
  dueDate: string
  status: 'open' | 'acknowledged' | 'resolved'
  createdAt: string
  createdByRole: RoleId
  /** Provisional escalation ladder: 1 MoIP → 2 Supervisor → 3 Secretary */
  escalationLevel?: 1 | 2 | 3
  escalatedBy?: RoleId | 'system'
  historyNote?: string
  history?: Array<{ at: string; note: string; actor?: string }>
  isDummyDemonstrationData: true
}

export interface TaskHistoryEvent {
  at: string
  note: string
  actorRole?: RoleId
}

export interface TaskItem {
  id: string
  organizationId?: string
  title: string
  /** Controlled task type */
  type?: string
  sourceModule?: ModuleId | string
  linkedRecordType?: string
  linkedRecordId?: string
  assignedRole?: RoleId
  ownerRole: RoleId
  createdAt?: string
  dueDate: string
  priority: string
  /** Stored lifecycle — overdue derived from dueDate when still open */
  status: 'open' | 'in_progress' | 'done' | 'cancelled'
  nextAction?: string
  completedAt?: string
  resolutionNote?: string
  history?: TaskHistoryEvent[]
  /** Link to generating alert when alert-to-task applied */
  sourceAlertId?: string
  route?: string
}

export interface AlertItem {
  id: string
  organizationId?: string
  title: string
  severity: string
  status: 'open' | 'acknowledged' | 'resolved'
  linkedRecordType?: string
  linkedRecordId?: string
  ruleId?: string
  ruleLabel?: string
  generatedAt?: string
  explanation?: string
  recommendedAction?: string
  resolutionNote?: string
  resolvedAt?: string
  /** Grouping key for deduplication summaries */
  groupKey?: string
  createsTask?: boolean
  linkedTaskId?: string
  route?: string
  isPrototypeRule?: boolean
}

export interface ListQuery {
  page?: number
  pageSize?: number
  search?: string
  organizationId?: string
  sortBy?: string
  sortDir?: 'asc' | 'desc'
}

export interface PagedResult<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}
