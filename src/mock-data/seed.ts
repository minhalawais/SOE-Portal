import {
  ASSET_CONDITION,
  ASSET_EVIDENCE_STATUS,
  ASSET_HISTORY_EVENT,
  ASSET_LITIGATION_STATUS,
  ASSET_OCCUPANCY,
  ASSET_TYPE,
  ASSET_UTILIZATION,
  AUDIT_PARA_STATUS,
  AUDIT_REGISTER_STATUS,
  AUDIT_TYPE,
  BOARD_MEMBER_STATUS,
  COMMITTEE_TYPE,
  COMPLIANCE_STATUS,
  CONSULTANT_STATUS,
  DECLARATION_STATUS,
  DEMO_AS_OF_DATE,
  DOCUMENT_CATEGORY,
  DOCUMENT_EVIDENCE_STATUS,
  DIRECTOR_TYPE,
  EMPLOYMENT_TYPE,
  ENCROACHMENT_STATUS,
  ENTERPRISE_HISTORY_EVENT,
  ESCALATION_REASON,
  ESCALATION_SEVERITY,
  EXECUTIVE_ROLE,
  GENDER,
  GOVERNANCE_CALENDAR_KIND,
  LAND_USE_CLASS,
  LEASE_STATUS,
  LEGAL_STATUS,
  LEGAL_STATUS_LABEL,
  LITIGATION_STATUS,
  MACHINERY_OPERATIONAL,
  PAC_STATUS,
  PPRA_COMPLIANCE,
  PRIVATIZATION_STAGE,
  PRIVATIZATION_STAGE_LABEL,
  PRIVATIZATION_STAGE_STATUS,
  PROCUREMENT_CONTRACT_STATUS,
  PROCUREMENT_METHOD,
  RECOVERY_STATUS,
  RELATIONSHIP_STATUS,
  RELATIONSHIP_TYPE,
  REVIEW_PRIORITY,
  ROLE,
  SHAREHOLDER_CATEGORY,
  SOE_STATUS,
  SOE_STATUS_LABEL,
  SUBMISSION_STATUS,
  TRANSFORMATION_TYPE,
  type LegalStatus,
  type AssetType,
  type PrivatizationStage,
  type SubmissionStatus,
} from '@/constants'
import { SCENARIO, type ScenarioId } from '@/mock-data/scenarios'
import { buildParcelPolygon } from '@/components/gis/unitLocationPolygon'
import {
  assetDisplayName,
  auditObservation,
  auditParaTitle,
  boardMemberName,
  commercialLenderName,
  contactPersonName,
  counselName,
  documentAssetTitle,
  executivePersonName,
  grantProjectName,
  litigationParty,
  locationLabel,
  ownershipDeedTitle,
  personName,
  procurementTitle,
  vendorName,
} from '@/mock-data/displayNames'
import type {
  AccountabilityHistoryEvent,
  AlertItem,
  Asset,
  AssetHistoryEvent,
  AuditPara,
  AuditRegister,
  ApprovedFinanceKpi,
  BoardCommittee,
  BoardMember,
  BudgetLine,
  Clarification,
  ComplianceItem,
  Consultant,
  ContractRecord,
  DailyWager,
  DocumentMeta,
  DocumentEvidenceStatus,
  Employee,
  Escalation,
  FieldChangeRecord,
  LineagePath,
  SubmissionHistoryEvent,
  EnterpriseHistoryEvent,
  Executive,
  FinancialMetric,
  FinancialVersionSnapshot,
  GeoFeature,
  GovernanceCalendarEvent,
  Grant,
  Guarantee,
  IndustrialPerformance,
  LenderCategory,
  LitigationCase,
  Loan,
  LoanRepayment,
  LoanRepaymentStatus,
  LoanGuaranteeStatus,
  NotificationItem,
  Organization,
  OrganizationContact,
  OrganizationLocation,
  OrganizationRelationship,
  OwnershipLine,
  PacObservation,
  PendingDecision,
  PrivatizationCase,
  PrivatizationMilestone,
  ProcurementContract,
  ProcurementAnnualPlan,
  ReportingPeriod,
  SanctionedPost,
  Submission,
  TaskItem,
  TimelineEvent,
  TransformationInitiative,
} from '@/types/domain'

/** Deterministic pseudo-random from string seed */
function hash(seed: string): number {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function unit(seed: string): number {
  return (hash(seed) % 10_000) / 10_000
}

function pick<T>(seed: string, items: T[]): T {
  return items[hash(seed) % items.length]
}

/** Vacant board seats by scenario so Enterprise snapshot stats change per SOE. */
function boardVacantSeatCount(scenarioId: ScenarioId): number {
  switch (scenarioId) {
    case SCENARIO.GOVERNANCE_RISK:
      return 2
    case SCENARIO.PRIVATIZATION:
    case SCENARIO.LITIGATION_HEAVY:
      return 2
    case SCENARIO.ASSET_RICH:
    case SCENARIO.HIGH_SUBSIDY:
    case SCENARIO.LOSS_MAKING:
      return 1
    case SCENARIO.UNDERUTILIZED:
      return 3
    default:
      return 0
  }
}

/** Expired (non-vacant) seats. NFC/governance keeps chair expired for expiry-band tests. */
function boardExpiredSeatCount(scenarioId: ScenarioId): number {
  switch (scenarioId) {
    case SCENARIO.GOVERNANCE_RISK:
    case SCENARIO.PRIVATIZATION:
    case SCENARIO.AUDIT_HEAVY:
    case SCENARIO.HIGH_SUBSIDY:
      return 1
    case SCENARIO.LOSS_MAKING:
      return 2
    default:
      return 0
  }
}

function boardAssignedFacilities(
  orgId: string,
  i: number,
  memberType: (typeof DIRECTOR_TYPE)[keyof typeof DIRECTOR_TYPE],
) {
  const isChair = i === 0
  const isGov = memberType === DIRECTOR_TYPE.GOVERNMENT
  const u = (key: string) => unit(`${key}-${orgId}-${i}`)
  const officialVehicle =
    isChair
      ? ('dedicated' as const)
      : u('veh') > 0.55
        ? ('pool' as const)
        : u('veh') > 0.25
          ? ('dedicated' as const)
          : ('none' as const)
  const hasVehicle = officialVehicle !== 'none'

  return {
    officialVehicle,
    fuelAllowance:
      !hasVehicle && u('fuel-none') > 0.5
        ? 'None'
        : u('fuel') > 0.35
          ? `${80 + i * 12 + (hash(orgId) % 40)} L/month`
          : `PKR ${(32_000 + i * 4_000).toLocaleString('en-PK')}/month`,
    officialResidence: isChair || (isGov && u('res') > 0.35),
    medicalFacility: isChair
      ? 'Yes · OPD + hospitalization'
      : u('med') > 0.72
        ? 'No'
        : u('med') > 0.5
          ? 'Yes · OPD + dependents'
          : 'Yes · OPD only',
    officeSecretariat: isChair || isGov || u('office') > 0.42,
    laptopComputer: isChair || u('laptop') > 0.22,
    mobileHandset: isChair || u('mobile') > 0.28,
    communicationAllowance:
      isChair || u('comm') > 0.32
        ? `PKR ${(5_000 + (hash(`${orgId}-comm-${i}`) % 8) * 1_000).toLocaleString('en-PK')}/month`
        : 'None',
    internetFacility: isChair || isGov || u('net') > 0.38,
    travelFacility: isChair
      ? 'Air + official'
      : u('travel') > 0.68
        ? 'None'
        : u('travel') > 0.38
          ? 'Air ticket'
          : 'Official transport',
    securityVehicle:
      isChair && u('sec') > 0.2
        ? ('authorized' as const)
        : u('sec') > 0.88
          ? ('authorized' as const)
          : ('none' as const),
    otherAssignedAsset: isChair
      ? 'Official driver'
      : u('other') > 0.8
        ? pick(`other-${orgId}-${i}`, ['Protocol staff', 'Guest house', 'Official driver'])
        : 'None',
  }
}

function money(seed: string, base: number, spread = 0.35): number {
  const f = 1 - spread / 2 + unit(seed) * spread
  return Math.round(base * f)
}

const ORG_SPECS: Array<{
  id: string
  name: string
  abbreviation: string
  legalStatus: LegalStatus
  sector: string
  subSector: string
  natureOfBusiness: string
  status: Organization['status']
  city: string
  province: string
  lat: number
  lng: number
  scenarioId: ScenarioId
  govPct: number
  incorporation: string
  capital: { authorized: number; paidUp: number; issued: number }
  ubo: string
}> = [
  {
    id: 'org-pidc',
    name: 'Pakistan Industrial Development Corporation',
    abbreviation: 'PIDC',
    legalStatus: LEGAL_STATUS.STATUTORY_CORPORATION,
    sector: 'Industrial Development',
    subSector: 'Industrial parks',
    natureOfBusiness: 'Industrial estate development and facilitation',
    status: SOE_STATUS.ACTIVE,
    city: 'Karachi',
    province: 'Sindh',
    lat: 24.8615,
    lng: 67.0099,
    scenarioId: SCENARIO.HEALTHY,
    govPct: 100,
    incorporation: '1962-04-15',
    capital: { authorized: 5_000_000_000, paidUp: 4_200_000_000, issued: 4_200_000_000 },
    ubo: 'Government of Pakistan',
  },
  {
    id: 'org-psm',
    name: 'Pakistan Steel Mills',
    abbreviation: 'PSM',
    legalStatus: LEGAL_STATUS.WHOLLY_OWNED_SOE,
    sector: 'Manufacturing',
    subSector: 'Steel',
    natureOfBusiness: 'Integrated steel production',
    status: SOE_STATUS.UNDER_PRIVATIZATION,
    city: 'Karachi',
    province: 'Sindh',
    lat: 24.8607,
    lng: 67.0011,
    scenarioId: SCENARIO.PRIVATIZATION,
    govPct: 100,
    incorporation: '1973-07-01',
    capital: { authorized: 20_000_000_000, paidUp: 18_500_000_000, issued: 18_500_000_000 },
    ubo: 'Government of Pakistan',
  },
  {
    id: 'org-usc',
    name: 'Utility Stores Corporation',
    abbreviation: 'USC',
    legalStatus: LEGAL_STATUS.GOVERNMENT_COMPANY,
    sector: 'Retail',
    subSector: 'Essential commodities',
    natureOfBusiness: 'Subsidized retail of essential commodities',
    status: SOE_STATUS.ACTIVE,
    city: 'Islamabad',
    province: 'ICT',
    lat: 33.6844,
    lng: 73.0479,
    scenarioId: SCENARIO.ASSET_RICH,
    govPct: 100,
    incorporation: '1971-03-01',
    capital: { authorized: 2_000_000_000, paidUp: 1_500_000_000, issued: 1_500_000_000 },
    ubo: 'Government of Pakistan',
  },
  {
    id: 'org-nfc',
    name: 'National Fertilizer Corporation',
    abbreviation: 'NFC',
    legalStatus: LEGAL_STATUS.HOLDING_COMPANY,
    sector: 'Fertilizer',
    subSector: 'Holding',
    natureOfBusiness: 'Holding company for fertilizer sector entities',
    status: SOE_STATUS.ACTIVE,
    city: 'Lahore',
    province: 'Punjab',
    lat: 31.5204,
    lng: 74.3587,
    scenarioId: SCENARIO.GOVERNANCE_RISK,
    govPct: 100,
    incorporation: '1973-08-01',
    capital: { authorized: 10_000_000_000, paidUp: 8_000_000_000, issued: 8_000_000_000 },
    ubo: 'Government of Pakistan',
  },
  {
    id: 'org-peco',
    name: 'Pakistan Engineering Company',
    abbreviation: 'PECO',
    legalStatus: LEGAL_STATUS.PUBLIC_LIMITED_COMPANY,
    sector: 'Engineering',
    subSector: 'Heavy engineering',
    natureOfBusiness: 'Manufacture of engineering products',
    status: SOE_STATUS.ACTIVE,
    city: 'Lahore',
    province: 'Punjab',
    lat: 31.5497,
    lng: 74.3436,
    scenarioId: SCENARIO.AUDIT_HEAVY,
    govPct: 51,
    incorporation: '1950-06-01',
    capital: { authorized: 1_200_000_000, paidUp: 900_000_000, issued: 900_000_000 },
    ubo: 'Government of Pakistan (majority)',
  },
  {
    id: 'org-nfml',
    name: 'National Fertilizer Marketing Limited',
    abbreviation: 'NFML',
    legalStatus: LEGAL_STATUS.SUBSIDIARY,
    sector: 'Fertilizer Marketing',
    subSector: 'Distribution',
    natureOfBusiness: 'Fertilizer marketing and distribution',
    status: SOE_STATUS.ACTIVE,
    city: 'Lahore',
    province: 'Punjab',
    lat: 31.4707,
    lng: 74.2728,
    scenarioId: SCENARIO.LITIGATION_HEAVY,
    govPct: 100,
    incorporation: '1976-01-15',
    capital: { authorized: 500_000_000, paidUp: 400_000_000, issued: 400_000_000 },
    ubo: 'National Fertilizer Corporation',
  },
  {
    id: 'org-pasdec',
    name: 'Pakistan Stone Development Company',
    abbreviation: 'PASDEC',
    legalStatus: LEGAL_STATUS.SECTION_42_COMPANY,
    sector: 'Mining / Stone',
    subSector: 'Dimensional stone',
    natureOfBusiness: 'Stone sector development',
    status: SOE_STATUS.ACTIVE,
    city: 'Islamabad',
    province: 'ICT',
    lat: 33.7294,
    lng: 73.0931,
    scenarioId: SCENARIO.HIGH_SUBSIDY,
    govPct: 100,
    incorporation: '2006-09-20',
    capital: { authorized: 800_000_000, paidUp: 650_000_000, issued: 650_000_000 },
    ubo: 'Government of Pakistan',
  },
  {
    id: 'org-tusdec',
    name: 'Technology Upgradation and Skill Development Company',
    abbreviation: 'TUSDEC',
    legalStatus: LEGAL_STATUS.SECTION_42_COMPANY,
    sector: 'Skills / Industry',
    subSector: 'Technology centres',
    natureOfBusiness: 'Industrial skill and technology centres',
    status: SOE_STATUS.ACTIVE,
    city: 'Lahore',
    province: 'Punjab',
    lat: 31.4504,
    lng: 74.2667,
    scenarioId: SCENARIO.UNDERUTILIZED,
    govPct: 75,
    incorporation: '2005-05-10',
    capital: { authorized: 1_000_000_000, paidUp: 750_000_000, issued: 750_000_000 },
    ubo: 'Government of Pakistan',
  },
  {
    id: 'org-smeda',
    name: 'Small and Medium Enterprise Development Authority',
    abbreviation: 'SMEDA',
    legalStatus: LEGAL_STATUS.STATUTORY_CORPORATION,
    sector: 'SME Development',
    subSector: 'Enterprise support',
    natureOfBusiness: 'SME facilitation and policy support',
    status: SOE_STATUS.DORMANT,
    city: 'Lahore',
    province: 'Punjab',
    lat: 31.5102,
    lng: 74.3441,
    scenarioId: SCENARIO.COMPLIANT,
    govPct: 100,
    incorporation: '1998-10-12',
    capital: { authorized: 300_000_000, paidUp: 250_000_000, issued: 250_000_000 },
    ubo: 'Government of Pakistan',
  },
  {
    id: 'org-pitac',
    name: 'Pakistan Industrial Technical Assistance Centre',
    abbreviation: 'PITAC',
    legalStatus: LEGAL_STATUS.SPECIAL_PURPOSE_VEHICLE,
    sector: 'Technical Assistance',
    subSector: 'Industrial services',
    natureOfBusiness: 'Technical assistance to industry',
    status: SOE_STATUS.ACTIVE,
    city: 'Lahore',
    province: 'Punjab',
    lat: 31.4821,
    lng: 74.3032,
    scenarioId: SCENARIO.LOSS_MAKING,
    govPct: 100,
    incorporation: '1962-11-01',
    capital: { authorized: 200_000_000, paidUp: 180_000_000, issued: 180_000_000 },
    ubo: 'Government of Pakistan',
  },
]

export const reportingPeriodsSeed: ReportingPeriod[] = [
  {
    id: 'period-fy2024',
    label: 'FY2024',
    type: 'annual',
    fiscalYear: '2023-24',
    startDate: '2023-07-01',
    endDate: '2024-06-30',
    status: 'locked',
  },
  {
    id: 'period-fy2025',
    label: 'FY2025',
    type: 'annual',
    fiscalYear: '2024-25',
    startDate: '2024-07-01',
    endDate: '2025-06-30',
    status: 'closed',
  },
  {
    id: 'period-fy2026',
    label: 'FY2026',
    type: 'annual',
    fiscalYear: '2025-26',
    startDate: '2025-07-01',
    endDate: '2026-06-30',
    status: 'closed',
  },
  {
    id: 'period-fy2027',
    label: 'FY2027',
    type: 'annual',
    fiscalYear: '2026-27',
    startDate: '2026-07-01',
    endDate: '2027-06-30',
    status: 'open',
  },
  {
    id: 'period-q1-fy2027',
    label: 'Q1 FY2027',
    type: 'quarterly',
    fiscalYear: '2026-27',
    startDate: '2026-07-01',
    endDate: '2026-09-30',
    status: 'open',
  },
]

const annualPeriods = reportingPeriodsSeed.filter((p) => p.type === 'annual')

function buildOrganizations(): Organization[] {
  return ORG_SPECS.map((s) => ({
    id: s.id,
    name: s.name,
    abbreviation: s.abbreviation,
    legalStatus: s.legalStatus,
    sector: s.sector,
    subSector: s.subSector,
    natureOfBusiness: s.natureOfBusiness,
    status: s.status,
    parentMinistry: 'Ministry of Industries and Production',
    attachedDepartment: 'Industrial Development Wing',
    administrativeMinistry: 'Ministry of Industries and Production',
    operatingMinistry: 'Ministry of Industries and Production',
    companyRegistrationNo: `CRN-${s.abbreviation}-${hash(s.id) % 90000 + 10000}`,
    ntn: `${hash(s.id) % 9000000 + 1000000}-1`,
    secpRegistrationNo: `SECP-${s.abbreviation}-001`,
    strn: `STRN-${hash(s.id) % 900000 + 100000}`,
    dateOfIncorporation: s.incorporation,
    website: `https://www.${s.abbreviation.toLowerCase()}.gov.pk`,
    corporateEmail: `info@${s.abbreviation.toLowerCase()}.gov.pk`,
    headOfficeAddress: `${s.abbreviation} Head Office, ${s.city}, ${s.province}`,
    governmentOwnershipPct: s.govPct,
    authorizedCapitalPkr: s.capital.authorized,
    paidUpCapitalPkr: s.capital.paidUp,
    issuedCapitalPkr: s.capital.issued,
    ultimateBeneficialOwner: s.ubo,
    scenarioId: s.scenarioId,
    scenarioTag: s.scenarioId,
    isDummyDemonstrationData: true as const,
  }))
}

function buildOwnershipLines(): OwnershipLine[] {
  const lines: OwnershipLine[] = []

  for (const s of ORG_SPECS) {
    if (s.id === 'org-peco') {
      lines.push(
        {
          id: 'own-peco-gov',
          organizationId: s.id,
          category: SHAREHOLDER_CATEGORY.GOVERNMENT,
          holderName: 'Government of Pakistan',
          percentage: 51,
        },
        {
          id: 'own-peco-priv',
          organizationId: s.id,
          category: SHAREHOLDER_CATEGORY.PRIVATE,
          holderName: 'Private shareholders',
          percentage: 30,
        },
        {
          id: 'own-peco-pub',
          organizationId: s.id,
          category: SHAREHOLDER_CATEGORY.PUBLIC,
          holderName: 'Public float',
          percentage: 19,
        },
      )
      continue
    }
    if (s.id === 'org-tusdec') {
      lines.push(
        {
          id: 'own-tusdec-gov',
          organizationId: s.id,
          category: SHAREHOLDER_CATEGORY.GOVERNMENT,
          holderName: 'Government of Pakistan',
          percentage: 75,
        },
        {
          id: 'own-tusdec-foreign',
          organizationId: s.id,
          category: SHAREHOLDER_CATEGORY.FOREIGN,
          holderName: 'Foreign strategic partner',
          percentage: 25,
        },
      )
      continue
    }
    if (s.id === 'org-usc') {
      lines.push(
        {
          id: 'own-usc-fed',
          organizationId: s.id,
          category: SHAREHOLDER_CATEGORY.GOVERNMENT,
          holderName: 'Federal Government',
          percentage: 60,
        },
        {
          id: 'own-usc-prov',
          organizationId: s.id,
          category: SHAREHOLDER_CATEGORY.PROVINCIAL_GOVERNMENT,
          holderName: 'Provincial governments (pooled)',
          percentage: 40,
        },
      )
      continue
    }
    lines.push({
      id: `own-${s.abbreviation.toLowerCase()}-gov`,
      organizationId: s.id,
      category: SHAREHOLDER_CATEGORY.GOVERNMENT,
      holderName: 'Government of Pakistan',
      percentage: 100,
    })
  }

  return lines
}

function buildRelationships(): OrganizationRelationship[] {
  return [
    {
      id: 'rel-nfc-nfml',
      parentOrganizationId: 'org-nfc',
      relatedOrganizationId: 'org-nfml',
      relationshipType: RELATIONSHIP_TYPE.SUBSIDIARY,
      ownershipPercentage: 100,
      status: RELATIONSHIP_STATUS.ACTIVE,
    },
    {
      id: 'rel-nfml-pasdec',
      parentOrganizationId: 'org-nfml',
      relatedOrganizationId: 'org-pasdec',
      relationshipType: RELATIONSHIP_TYPE.JOINT_VENTURE,
      ownershipPercentage: 40,
      status: RELATIONSHIP_STATUS.ACTIVE,
    },
    {
      id: 'rel-pidc-tusdec',
      parentOrganizationId: 'org-pidc',
      relatedOrganizationId: 'org-tusdec',
      relationshipType: RELATIONSHIP_TYPE.ASSOCIATE,
      ownershipPercentage: 25,
      status: RELATIONSHIP_STATUS.ACTIVE,
    },
    {
      id: 'rel-pidc-pasdec',
      parentOrganizationId: 'org-pidc',
      relatedOrganizationId: 'org-pasdec',
      relationshipType: RELATIONSHIP_TYPE.JOINT_VENTURE,
      ownershipPercentage: 35,
      status: RELATIONSHIP_STATUS.ACTIVE,
    },
  ]
}

type SeedLocationProfile = {
  province: string
  city: string
  address: string
  latitude: number
  longitude: number
}

// Keep operating locations explicit. City-centre defaults make unrelated SOE units
// appear co-located and are not suitable for parcel-level map rendering.
const REGIONAL_OFFICE_BY_ORG: Record<string, SeedLocationProfile> = {
  'org-pidc': {
    province: 'Punjab',
    city: 'Lahore',
    address: 'Gulberg, Lahore',
    latitude: 31.5209,
    longitude: 74.3497,
  },
  'org-psm': {
    province: 'Punjab',
    city: 'Lahore',
    address: '42-A Zafar Ali Road, Gulberg V, Lahore',
    latitude: 31.5239,
    longitude: 74.3538,
  },
  'org-usc': {
    province: 'Sindh',
    city: 'Karachi',
    address: 'Sector 36-A, Korangi, Karachi',
    latitude: 24.838396,
    longitude: 67.10956,
  },
  'org-nfc': {
    province: 'Sindh',
    city: 'Karachi',
    address: 'Civil Lines, Karachi',
    latitude: 24.8546,
    longitude: 67.0307,
  },
  'org-peco': {
    province: 'Sindh',
    city: 'Karachi',
    address: 'Shahrah-e-Faisal, Karachi',
    latitude: 24.8653,
    longitude: 67.0502,
  },
  'org-nfml': {
    province: 'Punjab',
    city: 'Multan',
    address: 'Industrial Estate, Multan',
    latitude: 30.1984,
    longitude: 71.4687,
  },
  'org-pasdec': {
    province: 'Balochistan',
    city: 'Quetta',
    address: 'Airport Road, Quetta',
    latitude: 30.1798,
    longitude: 66.975,
  },
  'org-tusdec': {
    province: 'Khyber Pakhtunkhwa',
    city: 'Peshawar',
    address: 'Hayatabad Industrial Estate, Peshawar',
    latitude: 34.0151,
    longitude: 71.5249,
  },
  'org-smeda': {
    province: 'Sindh',
    city: 'Karachi',
    address: 'Bahria Complex II, M.T. Khan Road, Karachi',
    latitude: 24.8367,
    longitude: 67.0256,
  },
  'org-pitac': {
    province: 'Sindh',
    city: 'Karachi',
    address: 'C-24, PECHS Block 6, Shahrah-e-Faisal, Karachi',
    latitude: 24.8722,
    longitude: 67.0631,
  },
}

const INDUSTRIAL_SITE_BY_ORG: Partial<Record<string, SeedLocationProfile>> = {
  'org-psm': {
    province: 'Sindh',
    city: 'Karachi',
    address: 'Pakistan Steel, Bin Qasim, Karachi',
    latitude: 24.805247,
    longitude: 67.346582,
  },
  'org-nfc': {
    province: 'Punjab',
    city: 'Lahore',
    address: 'Sundar Industrial Estate, Lahore',
    latitude: 31.4228,
    longitude: 74.2171,
  },
  'org-pasdec': {
    province: 'Khyber Pakhtunkhwa',
    city: 'Risalpur',
    address: 'Marble City, Risalpur',
    latitude: 34.055,
    longitude: 71.984,
  },
}

function buildLocations(): OrganizationLocation[] {
  const locations: OrganizationLocation[] = []
  for (const s of ORG_SPECS) {
    const regionalOffice = REGIONAL_OFFICE_BY_ORG[s.id]!
    locations.push({
      id: `loc-${s.id}-ho`,
      organizationId: s.id,
      label: locationLabel(`loc-ho-${s.id}`, s.abbreviation, 'head_office', s.city),
      kind: 'head_office',
      province: s.province,
      district: s.city,
      address: s.city,
      latitude: s.lat,
      longitude: s.lng,
    })
    locations.push({
      id: `loc-${s.id}-prov`,
      organizationId: s.id,
      label: locationLabel(
        `loc-po-${s.id}`,
        s.abbreviation,
        'provincial_office',
        regionalOffice.city,
      ),
      kind: 'provincial_office',
      province: regionalOffice.province,
      district: regionalOffice.city,
      address: regionalOffice.address,
      latitude: regionalOffice.latitude,
      longitude: regionalOffice.longitude,
    })
    const industrialSite = INDUSTRIAL_SITE_BY_ORG[s.id]
    if (industrialSite) {
      locations.push({
        id: `loc-${s.id}-factory`,
        organizationId: s.id,
        label: locationLabel(`loc-fac-${s.id}`, s.abbreviation, 'factory', industrialSite.city),
        kind: 'factory',
        province: industrialSite.province,
        district: industrialSite.city,
        address: industrialSite.address,
        latitude: industrialSite.latitude,
        longitude: industrialSite.longitude,
      })
    }
  }
  return locations.map((location) => ({
    ...location,
    polygon: buildParcelPolygon(location.latitude, location.longitude, location.id, location.kind),
  }))
}

function buildContacts(): OrganizationContact[] {
  return ORG_SPECS.flatMap((s) => [
    {
      id: `contact-${s.id}-1`,
      organizationId: s.id,
      name: contactPersonName(s.id, 'focal'),
      designation: 'SOE Contributor',
      email: `focal@${s.abbreviation.toLowerCase()}.gov.pk`,
      phone: '+92-51-9000001',
      isPrimary: true,
    },
    {
      id: `contact-${s.id}-2`,
      organizationId: s.id,
      name: contactPersonName(s.id, 'secretary'),
      designation: 'Company Secretary',
      email: `cs@${s.abbreviation.toLowerCase()}.gov.pk`,
      phone: '+92-51-9000002',
      isPrimary: false,
    },
  ])
}

function buildEnterpriseHistory(): EnterpriseHistoryEvent[] {
  const parentIds = new Set(buildRelationships().map((rel) => rel.parentOrganizationId))
  const events: EnterpriseHistoryEvent[] = []

  for (const org of ORG_SPECS) {
    const month = String((hash(org.id) % 9) + 1).padStart(2, '0')
    const day = String((hash(`${org.id}-d`) % 27) + 1).padStart(2, '0')
    events.push(
      {
        id: `eh-${org.id}-legal`,
        organizationId: org.id,
        eventType: ENTERPRISE_HISTORY_EVENT.LEGAL_STATUS_CHANGED,
        occurredAt: org.incorporation,
        summary: `Legal status recorded as ${LEGAL_STATUS_LABEL[org.legalStatus]}`,
        newValue: org.legalStatus,
        actorLabel: 'Company Secretary',
      },
      {
        id: `eh-${org.id}-own`,
        organizationId: org.id,
        eventType: ENTERPRISE_HISTORY_EVENT.OWNERSHIP_UPDATED,
        occurredAt: `2024-${month}-${day}`,
        summary: `Government shareholding confirmed at ${org.govPct}%`,
        newValue: `${org.govPct}% Government of Pakistan`,
        actorLabel: 'Company Secretary',
      },
      {
        id: `eh-${org.id}-loc`,
        organizationId: org.id,
        eventType: ENTERPRISE_HISTORY_EVENT.LOCATIONS_UPDATED,
        occurredAt: '2025-09-18',
        summary: `Head office recorded in ${org.city}, ${org.province}`,
        newValue: org.city,
        actorLabel: 'SOE Contributor',
      },
      {
        id: `eh-${org.id}-contacts`,
        organizationId: org.id,
        eventType: ENTERPRISE_HISTORY_EVENT.CONTACTS_UPDATED,
        occurredAt: '2025-11-04',
        summary: 'Primary focal person and company secretary recorded',
        actorLabel: 'SOE Contributor',
      },
      {
        id: `eh-${org.id}-struct`,
        organizationId: org.id,
        eventType: ENTERPRISE_HISTORY_EVENT.STRUCTURE_UPDATED,
        occurredAt: '2026-02-16',
        summary: parentIds.has(org.id)
          ? 'Corporate structure updated with recorded subsidiaries'
          : 'Corporate structure reviewed — no subsidiary on file',
        actorLabel: 'Company Secretary',
      },
    )

    if (parentIds.has(org.id)) {
      events.push({
        id: `eh-${org.id}-sub`,
        organizationId: org.id,
        eventType: ENTERPRISE_HISTORY_EVENT.SUBSIDIARY_ADDED,
        occurredAt: '2023-07-01',
        summary: 'Subsidiary / related entity recorded in the corporate tree',
        actorLabel: 'MoIP Supervisory Officer',
      })
    }

    if (org.status !== SOE_STATUS.ACTIVE) {
      events.push({
        id: `eh-${org.id}-status`,
        organizationId: org.id,
        eventType: ENTERPRISE_HISTORY_EVENT.ENTERPRISE_STATUS_CHANGED,
        occurredAt: org.id === 'org-psm' ? '2024-11-12' : '2025-06-30',
        summary: `Enterprise status set to ${SOE_STATUS_LABEL[org.status]}`,
        previousValue: SOE_STATUS.ACTIVE,
        newValue: org.status,
        actorLabel: 'MoIP Supervisory Officer',
      })
    }
  }

  return events
}

function isIndustrialAssetOrg(org: (typeof ORG_SPECS)[number]) {
  return [
    'Manufacturing',
    'Engineering',
    'Fertilizer',
    'Mining / Stone',
    'Skills / Industry',
    'Technical Assistance',
    'Industrial Development',
  ].includes(org.sector)
}

function assetMixForOrg(org: (typeof ORG_SPECS)[number]) {
  const industrial = isIndustrialAssetOrg(org)
  if (org.scenarioId === SCENARIO.ASSET_RICH) {
    const buildings = industrial ? 14 : 12
    return {
      land: 16,
      buildings,
      machinery: Math.round(buildings * (industrial ? 10 : 4)),
      vehicles: Math.round(buildings * 4),
      furniture: Math.round(buildings * 6),
      otherEquipment: Math.round(buildings * 2),
    }
  }

  const scale =
    org.scenarioId === SCENARIO.UNDERUTILIZED
      ? 1.05
      : org.status === SOE_STATUS.DORMANT
        ? 0.65
        : 1
  const buildings = Math.max(3, Math.round((industrial ? 6 : 4) * scale))
  return {
    land: Math.max(3, Math.round(4 * scale)),
    buildings,
    machinery: Math.round(buildings * (industrial ? 12 : 5) * scale),
    vehicles: Math.round(buildings * (industrial ? 3 : 2) * scale),
    furniture: Math.round(buildings * (industrial ? 5 : 4) * scale),
    otherEquipment: Math.round(buildings * 1.5 * scale),
  }
}

function buildAssets(): {
  assets: Asset[]
  geo: GeoFeature[]
  history: AssetHistoryEvent[]
  documents: DocumentMeta[]
} {
  const assets: Asset[] = []
  const geo: GeoFeature[] = []
  const history: AssetHistoryEvent[] = []
  const documents: DocumentMeta[] = []

  for (const org of ORG_SPECS) {
    const mix = assetMixForOrg(org)
    const assetSpecs: Array<{ type: AssetType; forceFurniture?: boolean }> = [
      ...Array.from({ length: mix.land }, () => ({ type: ASSET_TYPE.LAND as AssetType })),
      ...Array.from({ length: mix.buildings }, () => ({ type: ASSET_TYPE.BUILDING as AssetType })),
      ...Array.from({ length: mix.machinery }, () => ({ type: ASSET_TYPE.MACHINERY as AssetType })),
      ...Array.from({ length: mix.vehicles }, () => ({ type: ASSET_TYPE.VEHICLE as AssetType })),
      ...Array.from({ length: mix.furniture }, () => ({
        type: ASSET_TYPE.OTHER_EQUIPMENT as AssetType,
        forceFurniture: true,
      })),
      ...Array.from({ length: mix.otherEquipment }, () => ({
        type: ASSET_TYPE.OTHER_EQUIPMENT as AssetType,
      })),
    ]

    let firstLandId: string | undefined
    let landIndex = 0

    for (let i = 0; i < assetSpecs.length; i++) {
      const { type, forceFurniture } = assetSpecs[i]
      const landSlot = type === ASSET_TYPE.LAND ? landIndex : -1
      const id = `asset-${org.abbreviation.toLowerCase()}-${String(i + 1).padStart(4, '0')}`
      const seed = `${id}-v`
      const book = money(seed, type === ASSET_TYPE.LAND ? 800_000_000 : 120_000_000)
      const marketMult =
        org.scenarioId === SCENARIO.ASSET_RICH
          ? 2.8
          : org.scenarioId === SCENARIO.HEALTHY
            ? 1.6
            : 1.3
      const missingValuation = i % 13 === 0
      const market = missingValuation ? undefined : Math.round(book * marketMult)
      const lat = org.lat + (unit(`${seed}-lat`) - 0.5) * 0.08
      const lng = org.lng + (unit(`${seed}-lng`) - 0.5) * 0.08

      let utilizationStatus: (typeof ASSET_UTILIZATION)[keyof typeof ASSET_UTILIZATION] =
        ASSET_UTILIZATION.UTILIZED
      let utilizationPercent = Math.round(55 + unit(seed) * 40)
      if (org.scenarioId === SCENARIO.UNDERUTILIZED || type === ASSET_TYPE.MACHINERY) {
        if (i % 4 === 0) {
          utilizationStatus = ASSET_UTILIZATION.IDLE
          utilizationPercent = Math.round(unit(seed) * 15)
        } else if (i % 3 === 0) {
          utilizationStatus = ASSET_UTILIZATION.UNDERUTILIZED
          utilizationPercent = Math.round(15 + unit(seed) * 20)
        }
      }
      if (type === ASSET_TYPE.LAND && landSlot % 9 === 0) {
        utilizationStatus = ASSET_UTILIZATION.UNUSED
        utilizationPercent = 0
      }

      const litigationStatus =
        (org.scenarioId === SCENARIO.LITIGATION_HEAVY && i % 5 === 0) ||
        (type === ASSET_TYPE.LAND && landSlot === 2)
          ? ASSET_LITIGATION_STATUS.ACTIVE
          : ASSET_LITIGATION_STATUS.CLEAR

      // Phase 20: ensure Punjabi land parcels exist with encroached status (not only ICT).
      // Avoid landSlot % 9 === 0 — those parcels are cleared for the vacant-industrial GIS demo.
      const encroachmentStatus =
        type === ASSET_TYPE.LAND &&
        ((org.scenarioId === SCENARIO.ASSET_RICH && landSlot % 7 === 0) ||
          (org.province === 'Punjab' && landSlot % 10 === 0 && landSlot % 9 !== 0) ||
          landSlot === 5)
          ? ENCROACHMENT_STATUS.ENCROACHED
          : type === ASSET_TYPE.LAND && landSlot % 11 === 0
            ? ENCROACHMENT_STATUS.SUSPECTED
            : ENCROACHMENT_STATUS.CLEAR

      const evidenceStatus =
        i % 8 === 0
          ? ASSET_EVIDENCE_STATUS.MISSING
          : i % 5 === 0
            ? ASSET_EVIDENCE_STATUS.PARTIAL
            : ASSET_EVIDENCE_STATUS.COMPLETE

      const valuationDate =
        missingValuation || i % 10 === 0
          ? '2018-06-30'
          : `202${3 + (i % 3)}-0${1 + (i % 6)}-15`

      const asset: Asset = {
        id,
        organizationId: org.id,
        assetType: type,
        name: assetDisplayName({
          seed: `${org.id}-${type}-${i}`,
          abbreviation: org.abbreviation,
          city: org.city,
          assetType: type,
          index: i,
        }),
        identifier: `${org.abbreviation}-${type.slice(0, 3).toUpperCase()}-${String(i + 1).padStart(4, '0')}`,
        bookValue: book,
        marketValue: market,
        valuationDate,
        valuationMethod: pick(seed, ['market_comparable', 'cost_approach', 'income']),
        valuationAuthority: pick(seed, ['Internal valuation', 'External valuator', 'Board approved']),
        utilizationStatus,
        utilizationPercent,
        litigationStatus,
        encroachmentStatus,
        leaseStatus:
          type === ASSET_TYPE.LAND && landSlot % 6 === 0 ? LEASE_STATUS.ACTIVE : LEASE_STATUS.NONE,
        evidenceStatus,
        linkedLitigationId:
          litigationStatus === ASSET_LITIGATION_STATUS.ACTIVE
            ? `lit-${org.abbreviation.toLowerCase()}-${String((i % 3) + 1).padStart(3, '0')}`
            : undefined,
        province: org.province,
        district: org.city,
        tehsil: `${org.city} Tehsil`,
        latitude: lat,
        longitude: lng,
        ownershipNote: 'Title with SOE (demonstration)',
        acquisitionDate: `19${70 + (i % 30)}-0${1 + (i % 9)}-01`,
        purpose: pick(seed, ['Operations', 'Investment', 'Staff housing', 'Industrial']),
        currentUse: pick(seed, ['Operational', 'Idle site', 'Leased out', 'Storage']),
        condition: pick(seed, [
          ASSET_CONDITION.GOOD,
          ASSET_CONDITION.FAIR,
          ASSET_CONDITION.POOR,
        ]),
        lastUpdated: '2026-07-15',
        disposed: false,
      }

      if (type === ASSET_TYPE.LAND) {
        if (!firstLandId) firstLandId = id
        const acres = Math.round(5 + unit(seed) * 80)
        asset.areaAcres = acres
        asset.areaKanals = acres * 8
        asset.areaSqFt = Math.round(acres * 43560)
        asset.mouza = `Mouza ${org.abbreviation}-${(i % 5) + 1}`
        asset.surveyNumber = `S-${hash(id) % 9000 + 1000}`
        asset.khasraNumber = `K-${hash(id) % 900 + 100}`
        asset.occupancyStatus =
          utilizationStatus === ASSET_UTILIZATION.UNUSED || landSlot % 9 === 0
            ? ASSET_OCCUPANCY.VACANT
            : ASSET_OCCUPANCY.OCCUPIED
        asset.useClassification = pick(seed, [
          LAND_USE_CLASS.INDUSTRIAL,
          LAND_USE_CLASS.COMMERCIAL,
          LAND_USE_CLASS.RESIDENTIAL,
          LAND_USE_CLASS.AGRICULTURAL,
          LAND_USE_CLASS.UNUSED,
        ])
        if (landSlot % 9 === 0) {
          // Phase 18 demo scenario: vacant industrial land > 20 acres, no litigation
          asset.useClassification = LAND_USE_CLASS.INDUSTRIAL
          asset.occupancyStatus = ASSET_OCCUPANCY.VACANT
          asset.utilizationStatus = ASSET_UTILIZATION.UNUSED
          asset.areaAcres = Math.max(acres, 25)
          asset.areaKanals = asset.areaAcres * 8
          asset.areaSqFt = Math.round(asset.areaAcres * 43560)
          asset.litigationStatus = ASSET_LITIGATION_STATUS.CLEAR
          asset.encroachmentStatus = ENCROACHMENT_STATUS.CLEAR
        }
        landIndex += 1
      }

      if (type === ASSET_TYPE.BUILDING) {
        asset.buildingType = pick(seed, [
          'Office',
          'Factory',
          'Warehouse',
          'Colony',
          'Training institute',
          'Guest house',
        ])
        asset.floorAreaSqFt = Math.round(2000 + unit(seed) * 40000)
        asset.buildingAgeYears = Math.round(5 + unit(seed) * 40)
        asset.replacementValue = Math.round(book * 1.4)
        asset.maintenanceCostAnnual = Math.round(book * (i % 4 === 0 ? 0.08 : 0.02))
        asset.insuranceValue = Math.round(book * 0.9)
        asset.linkedLandAssetId = firstLandId
        asset.occupancyStatus = pick(seed, [ASSET_OCCUPANCY.OCCUPIED, ASSET_OCCUPANCY.VACANT])
        if (i % 4 === 0) asset.condition = ASSET_CONDITION.POOR
      }

      if (type === ASSET_TYPE.MACHINERY) {
        asset.machineId = `M-${org.abbreviation}-${i + 1}`
        asset.manufacturer = pick(seed, ['Siemens', 'ABB', 'Local OEM', 'Hitachi'])
        asset.purchaseCost = book
        asset.purchaseDate = `201${i % 9}-03-01`
        asset.depreciation = Math.round(book * 0.35)
        asset.usefulLifeYears = 15
        asset.operationalStatus =
          utilizationStatus === ASSET_UTILIZATION.IDLE
            ? MACHINERY_OPERATIONAL.IDLE
            : MACHINERY_OPERATIONAL.RUNNING
        if (i % 12 === 0) asset.operationalStatus = MACHINERY_OPERATIONAL.SCRAP
        asset.capacity = `${Math.round(50 + unit(seed) * 500)} units/day`
        asset.maintenanceSchedule = pick(seed, ['Monthly', 'Quarterly', 'Overdue'])
      }

      if (type === ASSET_TYPE.VEHICLE) {
        asset.vehicleNumber = `${org.province.slice(0, 3).toUpperCase()}-${1000 + i}`
        asset.vehicleType = pick(seed, ['Sedan', 'Pickup', 'Bus', 'Truck', 'Motorcycle'])
        asset.purchaseYear = 2015 + (i % 10)
        asset.assignedOfficer = `Officer ${i + 1}`
        asset.mileageKm = Math.round(20000 + unit(seed) * 180000)
        asset.fuelConsumption = `${(8 + unit(seed) * 6).toFixed(1)} L/100km`
        asset.gpsAvailable = i % 3 === 0
        asset.insuranceValue = Math.round(book * 0.7)
        if (i % 11 === 0) {
          asset.disposed = true
          asset.disposalStatus = 'auctioned'
          asset.utilizationStatus = ASSET_UTILIZATION.DISPOSED
          asset.operationalStatus = undefined
        }
      }

      if (type === ASSET_TYPE.OTHER_EQUIPMENT) {
        if (forceFurniture) {
          asset.equipmentCategory = 'furniture'
          asset.name = `${org.abbreviation} furniture ${i + 1}`
        } else {
          asset.equipmentCategory = pick(seed, [
            'computers',
            'servers',
            'laboratory_equipment',
            'tools',
            'communication_equipment',
          ])
          if (i % 7 === 0) {
            asset.assetType = ASSET_TYPE.IT_EQUIPMENT
            asset.equipmentCategory = 'computers'
            asset.name = `${org.abbreviation} IT equipment ${i + 1}`
          }
        }
      }

      // Phase 18 data-quality fixtures: some assets intentionally lack coordinates
      const missingCoordinates = i % 17 === 0
      if (missingCoordinates) {
        asset.latitude = undefined
        asset.longitude = undefined
      }

      assets.push(asset)

      if (!missingCoordinates) {
        const isPolygon = type === ASSET_TYPE.LAND && (landSlot % 11 === 0 || landSlot === 1 || landSlot % 9 === 0)
        geo.push({
          id: `geo-${id}`,
          assetId: id,
          organizationId: org.id,
          type: isPolygon ? 'Polygon' : 'Point',
          coordinates: isPolygon
            ? [
                [lng - 0.01, lat - 0.01],
                [lng + 0.01, lat - 0.01],
                [lng + 0.01, lat + 0.01],
                [lng - 0.01, lat + 0.01],
                [lng - 0.01, lat - 0.01],
              ]
            : [lng, lat],
          label: asset.name,
        })
      }

      history.push({
        id: `ah-${id}-created`,
        assetId: id,
        organizationId: org.id,
        eventType: ASSET_HISTORY_EVENT.CREATED,
        occurredAt: asset.acquisitionDate ?? '2020-01-01',
        summary: 'Asset recorded in registry',
        actorLabel: 'System seed',
      })

      if (encroachmentStatus !== ENCROACHMENT_STATUS.CLEAR) {
        history.push({
          id: `ah-${id}-enc`,
          assetId: id,
          organizationId: org.id,
          eventType: ASSET_HISTORY_EVENT.ENCROACHMENT_UPDATED,
          occurredAt: '2025-04-01',
          summary: `Encroachment status set to ${encroachmentStatus}`,
          newValue: encroachmentStatus,
          actorLabel: 'Asset Officer',
        })
      }

      if (asset.disposed) {
        history.push({
          id: `ah-${id}-disp`,
          assetId: id,
          organizationId: org.id,
          eventType: ASSET_HISTORY_EVENT.DISPOSAL_RECORDED,
          occurredAt: '2025-12-01',
          summary: 'Vehicle disposal / auction recorded',
          newValue: asset.disposalStatus,
          actorLabel: 'Asset Officer',
        })
      }

      if (evidenceStatus !== ASSET_EVIDENCE_STATUS.MISSING) {
        const cats =
          type === ASSET_TYPE.LAND
            ? ['ownership', 'mutation', 'revenue_record', 'valuation_report', 'photograph']
            : ['ownership', 'valuation_report', 'photograph']
        const take = evidenceStatus === ASSET_EVIDENCE_STATUS.COMPLETE ? cats.length : 2
        cats.slice(0, take).forEach((cat, di) => {
          documents.push(
            ensureDocument({
              id: `adoc-${id}-${di}`,
              organizationId: org.id,
              title: documentAssetTitle(cat, asset.name),
              category: cat,
              fileName: `${cat}-${id}.pdf`,
              linkedRecordType: 'asset',
              linkedRecordId: id,
              linkedModule: 'assets',
              uploadedAt: '2025-08-01T10:00:00.000Z',
              uploadedBy: 'asset_officer',
              version: 1,
              status: 'available',
            }),
          )
        })
      }
    }
  }

  return { assets, geo, history, documents }
}

function buildPeople() {
  const employees: Employee[] = []
  const posts: SanctionedPost[] = []
  const dailyWagers: DailyWager[] = []
  const consultants: Consultant[] = []
  const boards: BoardMember[] = []
  const committees: BoardCommittee[] = []
  const executives: Executive[] = []
  const calendar: GovernanceCalendarEvent[] = []

  void DEMO_AS_OF_DATE

  for (const org of ORG_SPECS) {
    const highVacancy = org.scenarioId === SCENARIO.GOVERNANCE_RISK
    const fullyStaffed =
      org.scenarioId === SCENARIO.HEALTHY || org.scenarioId === SCENARIO.COMPLIANT
    const highDailyWage =
      org.scenarioId === SCENARIO.LOSS_MAKING || org.scenarioId === SCENARIO.UNDERUTILIZED
    const noConsultants = org.scenarioId === SCENARIO.COMPLIANT
    const noBoard = org.id === 'org-smeda'

    const departments = ['Operations', 'Finance', 'HR', 'Technical', 'Admin']
    departments.forEach((dept, di) => {
      const sanctioned =
        (fullyStaffed ? 18 : highVacancy ? 22 : 14) + (hash(`${org.id}-${dept}`) % 6)
      const vacancyBias = fullyStaffed ? 0.02 : highVacancy ? 0.35 : 0.1
      const filled = Math.round(sanctioned * (1 - vacancyBias))
      posts.push({
        id: `post-${org.id}-${di + 1}`,
        organizationId: org.id,
        designation: `${dept} Officer / Manager cadre`,
        payScale: `BPS-${14 + (di % 6)}`,
        sanctioned,
        filled,
        vacant: Math.max(0, sanctioned - filled),
        department: dept,
        criticality: dept === 'Finance' || dept === 'Operations' ? 'critical' : 'standard',
      })
    })

    const empCount = fullyStaffed ? 52 : highVacancy ? 36 : 45
    for (let i = 0; i < empCount; i++) {
      const employmentType = pick(`et-${org.id}-${i}`, [
        EMPLOYMENT_TYPE.REGULAR,
        EMPLOYMENT_TYPE.REGULAR,
        EMPLOYMENT_TYPE.CONTRACT,
        EMPLOYMENT_TYPE.DEPUTATION,
        EMPLOYMENT_TYPE.INTERN,
      ])
      const gender = pick(`g-${org.id}-${i}`, [
        GENDER.MALE,
        GENDER.MALE,
        GENDER.FEMALE,
        GENDER.NOT_DISCLOSED,
      ])
      employees.push({
        id: `emp-${org.abbreviation.toLowerCase()}-${String(i + 1).padStart(3, '0')}`,
        organizationId: org.id,
        employeeCode: `${org.abbreviation}-E${String(i + 1).padStart(4, '0')}`,
        name: personName(
          `emp-${org.id}-${i}`,
          gender === GENDER.FEMALE ? 'female' : gender === GENDER.MALE ? 'male' : 'any',
        ),
        designation: pick(`des-${org.id}-${i}`, [
          'Manager',
          'Officer',
          'Engineer',
          'Accountant',
          'Technician',
        ]),
        employmentType,
        payScale: `BPS-${12 + (i % 10)}`,
        posting: pick(`posting-${org.id}-${i}`, departments),
        province: org.province,
        reportingOfficer: personName(`sup-${org.id}-${i % 5}`, 'any'),
        joiningDate: `20${10 + (i % 14)}-0${1 + (i % 9)}-15`,
        retirementDate: `20${45 + (i % 10)}-06-30`,
        gender,
        disabilityFlag: i % 17 === 0,
        performanceRating: pick(`perf-${org.id}-${i}`, ['A', 'B', 'C', 'Not rated']),
        assetDeclarationStatus:
          i % 11 === 0
            ? DECLARATION_STATUS.OVERDUE
            : i % 7 === 0
              ? DECLARATION_STATUS.PENDING
              : DECLARATION_STATUS.COMPLETE,
        cnic: `${10000 + (hash(`${org.id}-cnic-${i}`) % 80000)}-${1000000 + (hash(`c2-${i}`) % 8000000)}-${1 + (i % 9)}`,
        salaryPkr: 80_000 + (i % 20) * 15_000,
        qualification: pick(`qual-${i}`, ['MBA', 'BSc Engineering', 'CA', 'MA', 'Diploma']),
        trainingSummary: 'Mandatory public-sector modules (demonstration)',
        disciplinaryOpenCases: org.scenarioId === SCENARIO.GOVERNANCE_RISK && i % 19 === 0 ? 1 : 0,
        isDummyDemonstrationData: true,
      })
    }

    const wagerCount = highDailyWage ? 28 : fullyStaffed ? 4 : 12
    for (let i = 0; i < wagerCount; i++) {
      dailyWagers.push({
        id: `dw-${org.abbreviation.toLowerCase()}-${i + 1}`,
        organizationId: org.id,
        name: personName(`dw-${org.id}-${i}`, 'any'),
        roleLabel: pick(`dw-role-${i}`, ['Helper', 'Security', 'Cleaner', 'Loader']),
        durationMonths: 3 + (i % 9),
        dailyRatePkr: 1500 + (i % 5) * 200,
        fundingSource: pick(`dw-fund-${i}`, ['Operational budget', 'Project grant', 'Contingency']),
        posting: org.city,
        isDummyDemonstrationData: true,
      })
    }

    if (!noConsultants) {
      const consultantCount = org.scenarioId === SCENARIO.AUDIT_HEAVY ? 4 : 2
      for (let i = 0; i < consultantCount; i++) {
        const endingSoon = i === 0
        consultants.push({
          id: `con-${org.abbreviation.toLowerCase()}-${i + 1}`,
          organizationId: org.id,
          name: personName(`con-${org.id}-${i}`, 'any'),
          project: pick(`cp-${i}`, ['ERP readiness', 'Asset valuation support', 'Process review']),
          contractStart: '2025-01-01',
          contractEnd: endingSoon ? '2026-08-25' : i === 1 ? '2025-12-31' : '2027-03-31',
          monthlyRemunerationPkr: 350_000 + i * 50_000,
          fundingSource: 'Project budget',
          torsSummary: 'Advisory support — demonstration TOR summary',
          deliverablesSummary: 'Monthly progress note + final report',
          status: endingSoon
            ? CONSULTANT_STATUS.EXPIRING
            : i === 1
              ? CONSULTANT_STATUS.COMPLETED
              : CONSULTANT_STATUS.ACTIVE,
          isDummyDemonstrationData: true,
        })
      }
    }

    if (!noBoard) {
      const boardSize = 7
      const vacantCount = boardVacantSeatCount(org.scenarioId)
      const expiredCount = boardExpiredSeatCount(org.scenarioId)
      for (let i = 0; i < boardSize; i++) {
        const isVacancy = i >= boardSize - vacantCount
        let expiryDate = `2027-${String((i % 9) + 3).padStart(2, '0')}-15`
        if (highVacancy && i === 0) expiryDate = '2026-07-01' // expired
        if (highVacancy && i === 1) expiryDate = '2026-09-05' // ≤30 days from 2026-08-08
        if (highVacancy && i === 2) expiryDate = '2026-10-20' // ≤90
        if (highVacancy && i === 3) expiryDate = '2027-01-20' // ≤180
        if (!highVacancy && i === 0) expiryDate = '2026-09-10'
        if (!isVacancy && !highVacancy && i < expiredCount) {
          expiryDate = i === 0 ? '2026-07-01' : '2026-06-18'
        }

        const memberType =
          i === 0
            ? DIRECTOR_TYPE.CHAIRMAN
            : i === 1 || i === 2
              ? DIRECTOR_TYPE.INDEPENDENT
              : i === 3
                ? DIRECTOR_TYPE.WOMAN_DIRECTOR
                : i === 4
                  ? DIRECTOR_TYPE.GOVERNMENT
                  : DIRECTOR_TYPE.PRIVATE

        const missingDecl = highVacancy && i === 2

        boards.push({
          id: `board-${org.abbreviation.toLowerCase()}-${i + 1}`,
          organizationId: org.id,
          name: isVacancy
            ? `Vacant seat ${i + 1}`
            : boardMemberName(`board-${org.id}-${i}`, memberType === DIRECTOR_TYPE.WOMAN_DIRECTOR),
          role: i === 0 ? 'Chairperson' : 'Director',
          memberType,
          appointmentDate: '2023-01-15',
          expiryDate,
          isVacancySlot: isVacancy,
          status: isVacancy
            ? BOARD_MEMBER_STATUS.VACANT
            : expiryDate < '2026-08-08'
              ? BOARD_MEMBER_STATUS.EXPIRED
              : BOARD_MEMBER_STATUS.ACTIVE,
          attendancePct: isVacancy ? undefined : 70 + (i % 5) * 5,
          conflictDeclarationStatus: missingDecl
            ? DECLARATION_STATUS.OVERDUE
            : DECLARATION_STATUS.COMPLETE,
          assetDeclarationStatus: missingDecl
            ? DECLARATION_STATUS.PENDING
            : DECLARATION_STATUS.COMPLETE,
          qualification: isVacancy ? undefined : 'Graduate / professional (demonstration)',
          remunerationPkr: isVacancy ? undefined : 150_000 + i * 10_000,
          sittingFeePkr: isVacancy ? undefined : 25_000,
          travelExpensePkr: isVacancy ? undefined : 40_000,
          cnic: isVacancy
            ? undefined
            : `${20000 + i}${hash(org.id) % 1000}-1234567-${i + 1}`,
          assignedFacilities: isVacancy
            ? undefined
            : boardAssignedFacilities(org.id, i, memberType),
          isDummyDemonstrationData: true,
        })
      }

      const activeIds = boards
        .filter((b) => b.organizationId === org.id && !b.isVacancySlot)
        .map((b) => b.id)

      Object.values(COMMITTEE_TYPE).forEach((ctype, ci) => {
        const members = activeIds.slice(ci, ci + 3).filter(Boolean)
        const vacancyCount = members.length < 3 ? 3 - members.length : 0
        committees.push({
          id: `comm-${org.id}-${ctype}`,
          organizationId: org.id,
          committeeType: ctype,
          chairBoardMemberId: members[0],
          memberBoardMemberIds: members,
          status: vacancyCount > 0 ? 'forming' : 'active',
          vacancyCount,
        })
      })

      boards
        .filter((b) => b.organizationId === org.id)
        .forEach((b) => {
          if (b.isVacancySlot) {
            calendar.push({
              id: `cal-vac-${b.id}`,
              organizationId: org.id,
              kind: GOVERNANCE_CALENDAR_KIND.BOARD_VACANCY,
              title: `Board vacancy — ${b.name}`,
              dueDate: '2026-08-31',
              status: 'overdue',
              relatedRecordType: 'board_member',
              relatedRecordId: b.id,
              linkPath: `/soe/people/board/${b.id}`,
            })
          } else if (b.expiryDate < '2026-08-08') {
            calendar.push({
              id: `cal-exp-${b.id}`,
              organizationId: org.id,
              kind: GOVERNANCE_CALENDAR_KIND.BOARD_EXPIRY,
              title: `Director term expired — ${b.name}`,
              dueDate: b.expiryDate,
              status: 'overdue',
              relatedRecordType: 'board_member',
              relatedRecordId: b.id,
              linkPath: `/soe/people/board/${b.id}`,
            })
          } else if (b.expiryDate <= '2027-02-08') {
            calendar.push({
              id: `cal-soon-${b.id}`,
              organizationId: org.id,
              kind: GOVERNANCE_CALENDAR_KIND.BOARD_EXPIRY,
              title: `Director term ending — ${b.name}`,
              dueDate: b.expiryDate,
              status: b.expiryDate <= '2026-09-08' ? 'due_soon' : 'upcoming',
              relatedRecordType: 'board_member',
              relatedRecordId: b.id,
              linkPath: `/soe/people/board/${b.id}`,
            })
          }
          if (
            b.conflictDeclarationStatus === DECLARATION_STATUS.OVERDUE ||
            b.assetDeclarationStatus === DECLARATION_STATUS.PENDING
          ) {
            calendar.push({
              id: `cal-decl-${b.id}`,
              organizationId: org.id,
              kind: GOVERNANCE_CALENDAR_KIND.DECLARATION_DUE,
              title: `Declaration pending — ${b.name}`,
              dueDate: '2026-08-20',
              status: 'due_soon',
              relatedRecordType: 'declaration',
              relatedRecordId: b.id,
              linkPath: `/soe/people/board/${b.id}`,
            })
          }
        })

      calendar.push({
        id: `cal-appt-${org.id}`,
        organizationId: org.id,
        kind: GOVERNANCE_CALENDAR_KIND.PENDING_APPOINTMENT,
        title: 'Pending Board appointment package',
        dueDate: '2026-09-30',
        status: 'upcoming',
        relatedRecordType: 'appointment',
        linkPath: `/soe/people/board`,
      })
    }

    executives.push(
      {
        id: `exec-${org.id}-ceo`,
        organizationId: org.id,
        name: executivePersonName(org.id, 'ceo'),
        role: EXECUTIVE_ROLE.CEO,
        appointmentDate: '2022-06-01',
        salaryPkr: 1_200_000,
        bonusPkr: org.scenarioId === SCENARIO.HEALTHY ? 300_000 : 0,
        perksSummary: 'Official vehicle; medical',
        officialResidence: true,
        vehiclesAssigned: 1,
        foreignVisitsLastYear: org.scenarioId === SCENARIO.HEALTHY ? 2 : 0,
        performanceKpiSummary:
          org.scenarioId === SCENARIO.LOSS_MAKING
            ? 'Turnaround KPIs below target (demonstration)'
            : 'Operational KPIs on track (demonstration)',
        isDummyDemonstrationData: true,
      },
      {
        id: `exec-${org.id}-cfo`,
        organizationId: org.id,
        name: executivePersonName(org.id, 'cfo'),
        role: EXECUTIVE_ROLE.CFO,
        appointmentDate: '2023-03-01',
        salaryPkr: 950_000,
        bonusPkr: 100_000,
        perksSummary: 'Official vehicle',
        officialResidence: false,
        vehiclesAssigned: 1,
        foreignVisitsLastYear: 0,
        performanceKpiSummary: 'Financial reporting timeliness (demonstration)',
        isDummyDemonstrationData: true,
      },
      {
        id: `exec-${org.id}-gm`,
        organizationId: org.id,
        name: executivePersonName(org.id, 'gm'),
        role: EXECUTIVE_ROLE.GM,
        appointmentDate: '2021-11-01',
        salaryPkr: 700_000,
        perksSummary: 'Transport allowance',
        vehiclesAssigned: 0,
        foreignVisitsLastYear: 0,
        performanceKpiSummary: 'Plant utilization (demonstration)',
        isDummyDemonstrationData: true,
      },
    )
  }

  // Attach committee memberships onto board members
  for (const b of boards) {
    b.committeeIds = committees
      .filter(
        (c) =>
          c.organizationId === b.organizationId &&
          (c.chairBoardMemberId === b.id || c.memberBoardMemberIds.includes(b.id)),
      )
      .map((c) => c.id)
  }

  return {
    employees,
    posts,
    dailyWagers,
    consultants,
    boards,
    committees,
    executives,
    calendar,
  }
}

function financeShape(scenario: ScenarioId, yearIndex: number) {
  const decline = yearIndex
  switch (scenario) {
    case SCENARIO.HEALTHY:
    case SCENARIO.COMPLIANT:
      return {
        revenue: 6_500_000_000 + yearIndex * 400_000_000,
        opex: 5_000_000_000 + yearIndex * 200_000_000,
        loss: false,
        subsidy: 0,
      }
    case SCENARIO.LOSS_MAKING:
    case SCENARIO.PRIVATIZATION:
      return {
        revenue: 22_000_000_000 - decline * 1_200_000_000,
        opex: 24_000_000_000 + decline * 700_000_000,
        loss: true,
        subsidy: 2_000_000_000 + decline * 800_000_000,
      }
    case SCENARIO.HIGH_SUBSIDY:
      return {
        revenue: 3_200_000_000,
        opex: 4_100_000_000,
        loss: true,
        subsidy: 1_800_000_000 + decline * 250_000_000,
      }
    case SCENARIO.UNDERUTILIZED:
      return {
        revenue: 2_400_000_000 - decline * 150_000_000,
        opex: 2_600_000_000,
        loss: true,
        subsidy: 400_000_000,
      }
    default:
      return {
        revenue: 4_800_000_000 + yearIndex * 100_000_000,
        opex: 4_400_000_000 + yearIndex * 120_000_000,
        loss: false,
        subsidy: 200_000_000,
      }
  }
}

function buildFinance(): FinancialMetric[] {
  const rows: FinancialMetric[] = []
  ORG_SPECS.forEach((org) => {
    annualPeriods.forEach((period, yearIndex) => {
      const shape = financeShape(org.scenarioId, yearIndex)
      const revenue = money(`${org.id}-${period.id}-rev`, shape.revenue)
      const opex = money(`${org.id}-${period.id}-opex`, shape.opex)
      const profit = shape.loss
        ? revenue - opex - money(`${org.id}-extra`, 500_000_000)
        : revenue - opex
      const status =
        period.id === 'period-fy2027'
          ? org.scenarioId === SCENARIO.COMPLIANT
            ? SUBMISSION_STATUS.READY_FOR_CERTIFICATION
            : org.scenarioId === SCENARIO.PRIVATIZATION
              ? SUBMISSION_STATUS.IN_PROGRESS
              : SUBMISSION_STATUS.DRAFT
          : SUBMISSION_STATUS.LOCKED

      const receivables = money(`${org.id}-${period.id}-ar`, 800_000_000)
      const payables = money(`${org.id}-${period.id}-ap`, 650_000_000)
      const inventory = money(`${org.id}-${period.id}-inv`, 400_000_000)
      const cashFlow = Math.round(profit * 0.6)
      const workingCapital = money(`${org.id}-${period.id}-wc`, 1_200_000_000)
      const currentAssets = receivables + inventory + Math.max(0, cashFlow)
      const currentLiabilities = payables + money(`${org.id}-${period.id}-stl`, 300_000_000)
      const totalDebt =
        org.scenarioId === SCENARIO.LOSS_MAKING || org.scenarioId === SCENARIO.PRIVATIZATION
          ? money(`${org.id}-${period.id}-debt`, 12_000_000_000)
          : money(`${org.id}-${period.id}-debt`, 4_500_000_000)
      const totalAssets = currentAssets + money(`${org.id}-${period.id}-fa`, 8_000_000_000)
      const equity = totalAssets - totalDebt - currentLiabilities * 0.4
      const annualBudget = Math.round(revenue * (0.92 + unit(`bud-${org.id}-${period.id}`) * 0.12))

      rows.push({
        id: `fin-${org.id}-${period.id}`,
        organizationId: org.id,
        reportingPeriodId: period.id,
        revenue,
        operatingExpenses: opex,
        capex: money(`${org.id}-${period.id}-capex`, 700_000_000),
        profitOrLoss: profit,
        cashFlow,
        workingCapital,
        subsidies: shape.subsidy,
        governmentSupport: Math.round(shape.subsidy * 0.35),
        annualBudget,
        receivables,
        payables,
        inventory,
        currentAssets,
        currentLiabilities,
        totalAssets,
        equity: Math.round(equity),
        totalDebt,
        auditStatus:
          status === SUBMISSION_STATUS.LOCKED
            ? org.scenarioId === SCENARIO.AUDIT_HEAVY
              ? 'qualified'
              : 'audited'
            : 'unaudited',
        status,
        version: status === SUBMISSION_STATUS.LOCKED ? '1.0' : '0.8',
      })
    })
  })
  return rows
}

function buildBudgetLines(metrics: FinancialMetric[]): BudgetLine[] {
  const lines: BudgetLine[] = []
  for (const m of metrics) {
    const cats: Array<{ category: string; budget: number; actual: number }> = [
      { category: 'Revenue', budget: m.annualBudget ?? m.revenue, actual: m.revenue },
      {
        category: 'Operating expenses',
        budget: Math.round(m.operatingExpenses * 0.95),
        actual: m.operatingExpenses,
      },
      { category: 'CAPEX', budget: Math.round(m.capex * 1.05), actual: m.capex },
      {
        category: 'Subsidies / support',
        budget: Math.round(m.subsidies * 0.9),
        actual: m.subsidies,
      },
    ]
    cats.forEach((c, i) => {
      lines.push({
        id: `bl-${m.id}-${i}`,
        organizationId: m.organizationId,
        reportingPeriodId: m.reportingPeriodId,
        category: c.category,
        budget: c.budget,
        actual: c.actual,
      })
    })
  }
  return lines
}

function buildProcurementPlans(organizations: Organization[]): ProcurementAnnualPlan[] {
  return organizations.slice(0, 12).map((org, i) => ({
    id: `pplan-${org.id}`,
    organizationId: org.id,
    fiscalYear: '2025-26',
    title: `Annual procurement plan FY2025-26`,
    category: i % 2 === 0 ? 'Goods and services' : 'Works and consultancy',
    estimatedValue: 45_000_000 + i * 8_500_000,
    method: i % 3 === 0 ? 'open_tender' : 'limited_tender',
    status: i % 4 === 0 ? 'draft' : 'approved',
    responsibleFunction: 'Procurement',
    isDummyDemonstrationData: true as const,
  }))
}

function buildIndustrial(): IndustrialPerformance[] {
  // Phase 19: SMEDA (dormant) intentionally has no industrial rows → Operations unavailable
  return ORG_SPECS.filter((org) => org.id !== 'org-smeda').flatMap((org) =>
    annualPeriods.map((period, yearIndex) => {
      const installed =
        org.scenarioId === SCENARIO.UNDERUTILIZED
          ? 1200 + (hash(org.id) % 200)
          : 1000 + (hash(org.id) % 500)
      let utilBase =
        org.scenarioId === SCENARIO.UNDERUTILIZED
          ? 0.28 - yearIndex * 0.03
          : org.scenarioId === SCENARIO.HEALTHY || org.scenarioId === SCENARIO.COMPLIANT
            ? 0.78 + yearIndex * 0.02
            : 0.55
      if (org.scenarioId === SCENARIO.LOSS_MAKING) utilBase = 0.42 - yearIndex * 0.04
      const utilization = Math.max(0.12, Math.min(0.95, utilBase))
      const actual = Math.round(installed * utilization)
      const exportBase = money(`${org.id}-${period.id}-exp`, 400_000_000)
      const exports =
        org.scenarioId === SCENARIO.UNDERUTILIZED || org.scenarioId === SCENARIO.LOSS_MAKING
          ? Math.max(50_000_000, exportBase - yearIndex * 80_000_000)
          : exportBase + yearIndex * 40_000_000
      const energy =
        org.scenarioId === SCENARIO.LOSS_MAKING
          ? 22_000 + (hash(`${org.id}-en`) % 4_000)
          : 10_000 + (hash(`${org.id}-en`) % 8_000)
      return {
        id: `ind-${org.id}-${period.id}`,
        organizationId: org.id,
        reportingPeriodId: period.id,
        installedCapacity: installed,
        actualProduction: actual,
        capacityUtilization: Math.round(utilization * 1000) / 10,
        exports,
        imports: money(`${org.id}-${period.id}-imp`, 250_000_000),
        domesticSales: money(`${org.id}-${period.id}-dom`, 900_000_000),
        employment: 800 + (hash(`${org.id}-emp`) % 1200),
        energyConsumption: energy,
        energyUnit: 'MWh',
        carbonEmissions: 4_000 + (hash(`${org.id}-co`) % 3_000),
        carbonUnit: 'tCO2e',
        capacityUnit: 'units',
      }
    }),
  )
}

function buildFiscal() {
  const loans: Loan[] = []
  const grants: Grant[] = []
  const guarantees: Guarantee[] = []
  const repayments: LoanRepayment[] = []

  const lenderCats: LenderCategory[] = [
    'government',
    'bank',
    'foreign',
    'adb',
    'world_bank',
    'china',
    'commercial',
  ]
  const lenderNames = (category: LenderCategory, seed: string): string => {
    if (category === 'government') return 'Government of Pakistan'
    if (category === 'bank' || category === 'commercial') return commercialLenderName(seed)
    if (category === 'foreign') return 'International Syndicated Facility'
    if (category === 'adb') return 'Asian Development Bank'
    if (category === 'world_bank') return 'World Bank'
    return 'China EXIM Bank'
  }

  for (const org of ORG_SPECS) {
    const loanCount =
      org.scenarioId === SCENARIO.LOSS_MAKING || org.scenarioId === SCENARIO.PRIVATIZATION ? 4 : 2
    for (let i = 0; i < loanCount; i++) {
      const principal = money(`loan-${org.id}-${i}`, 2_000_000_000)
      const outstanding = Math.round(principal * (0.4 + unit(`out-${org.id}-${i}`) * 0.5))
      const lenderCategory = lenderCats[hash(`${org.id}-lc-${i}`) % lenderCats.length]!
      const isDefault = org.scenarioId === SCENARIO.LOSS_MAKING && i === 0
      const isDueSoon = org.scenarioId === SCENARIO.HIGH_SUBSIDY && i === 0
      const repaymentStatus: LoanRepaymentStatus = isDefault
        ? 'overdue'
        : isDueSoon
          ? 'due_soon'
          : outstanding < principal * 0.05
            ? 'completed'
            : 'on_track'
      const guaranteeStatus: LoanGuaranteeStatus =
        i === 0 &&
        (org.scenarioId === SCENARIO.LOSS_MAKING || org.scenarioId === SCENARIO.PRIVATIZATION)
          ? 'full'
          : i === 1
            ? 'partial'
            : 'none'
      const loanId = `loan-${org.abbreviation.toLowerCase()}-${i + 1}`
      const guarId =
        guaranteeStatus !== 'none' ? `guar-${org.abbreviation.toLowerCase()}-${i + 1}` : undefined

      loans.push({
        id: loanId,
        organizationId: org.id,
        lender: lenderNames(lenderCategory, `${org.id}-lender-${i}`),
        lenderCategory,
        loanType: pick(`lt-${i}`, ['term', 'working_capital', 'project', 'sovereign']),
        principal,
        outstanding,
        interestRate: 8 + (hash(`${org.id}-${i}`) % 6),
        nextDueDate: isDefault ? '2026-07-15' : isDueSoon ? '2026-08-20' : '2026-11-30',
        repaymentStatus,
        guaranteeStatus,
        relatedGuaranteeId: guarId,
        defaultStatus: isDefault ? 'overdue' : 'current',
        isDummyDemonstrationData: true,
      })

      if (guarId) {
        guarantees.push({
          id: guarId,
          organizationId: org.id,
          reference: `GOP-GUAR-${org.abbreviation}-${i + 1}`,
          guarantor: 'Government of Pakistan',
          amount: Math.round(outstanding * (guaranteeStatus === 'full' ? 1 : 0.5)),
          relatedLoanId: loanId,
          status: 'active',
          exposure: Math.round(outstanding * (guaranteeStatus === 'full' ? 1 : 0.5)),
          isDummyDemonstrationData: true,
        })
      }

      for (let s = 0; s < 4; s++) {
        const dueYear = 2025 + Math.floor(s / 2)
        const dueMonth = s % 2 === 0 ? '03' : '09'
        const amountDue = Math.round(principal / 8)
        const paid =
          s === 0 || (s === 1 && !isDefault)
            ? amountDue
            : isDefault && s === 2
              ? Math.round(amountDue * 0.3)
              : 0
        repayments.push({
          id: `rep-${loanId}-${s}`,
          loanId,
          organizationId: org.id,
          dueDate: `${dueYear}-${dueMonth}-15`,
          amountDue,
          amountPaid: paid,
          status:
            paid >= amountDue
              ? 'paid'
              : paid > 0
                ? 'partial'
                : isDefault && s >= 2
                  ? 'overdue'
                  : 'pending',
        })
      }
    }

    if (org.scenarioId === SCENARIO.HIGH_SUBSIDY || org.scenarioId === SCENARIO.LOSS_MAKING) {
      grants.push({
        id: `grant-${org.id}-1`,
        organizationId: org.id,
        source: 'Federal Grant — Ministry of Finance',
        project: grantProjectName(`grant-${org.id}`, org.abbreviation),
        amount: 1_500_000_000,
        utilized: 900_000_000,
        remaining: 600_000_000,
        completionPct: 60,
        status: 'active',
        isDummyDemonstrationData: true,
      })
    }

    if (!guarantees.some((g) => g.organizationId === org.id)) {
      guarantees.push({
        id: `guar-${org.id}-standalone`,
        organizationId: org.id,
        reference: `GOP-GUAR-${org.abbreviation}-S`,
        guarantor: 'Government of Pakistan',
        amount: money(`guar-${org.id}`, 800_000_000),
        status: 'active',
        exposure: money(`guar-${org.id}`, 800_000_000),
        isDummyDemonstrationData: true,
      })
    }
  }

  return { loans, grants, guarantees, repayments }
}


function ensureDocument(
  d: Omit<DocumentMeta, 'documentFamilyId' | 'evidenceStatus' | 'isDummyDemonstrationData'> &
    Partial<Pick<DocumentMeta, 'documentFamilyId' | 'evidenceStatus' | 'fileType' | 'classification'>>,
): DocumentMeta {
  const evidenceStatus = (d.evidenceStatus ??
    (d.status as DocumentEvidenceStatus) ??
    DOCUMENT_EVIDENCE_STATUS.AVAILABLE) as DocumentEvidenceStatus
  return {
    ...d,
    documentFamilyId: d.documentFamilyId ?? d.id,
    evidenceStatus,
    status: evidenceStatus,
    fileType: d.fileType ?? 'pdf',
    classification: d.classification ?? 'evidence',
    isDummyDemonstrationData: true,
  }
}

function buildPhase12Intelligence(args: {
  organizations: Organization[]
  assets: Asset[]
  boardMembers: BoardMember[]
  submissions: Submission[]
}): {
  extraDocuments: DocumentMeta[]
  submissionHistory: SubmissionHistoryEvent[]
  fieldChanges: FieldChangeRecord[]
  lineagePaths: LineagePath[]
} {
  const extraDocuments: DocumentMeta[] = []
  const submissionHistory: SubmissionHistoryEvent[] = []
  const fieldChanges: FieldChangeRecord[] = []
  const lineagePaths: LineagePath[] = []

  // Phase 20: annual reports present for select SOEs — others surface as "missing annual report"
  for (const orgId of ['org-pidc', 'org-usc', 'org-smeda'] as const) {
    extraDocuments.push(
      ensureDocument({
        id: `doc-annual-${orgId}-fy2026`,
        organizationId: orgId,
        title: `${orgId.replace('org-', '').toUpperCase()} Annual Report FY2026`,
        category: DOCUMENT_CATEGORY.ANNUAL_REPORTS,
        fileName: `${orgId}-annual-fy2026.pdf`,
        linkedRecordType: 'organization',
        linkedRecordId: orgId,
        linkedModule: 'documents',
        reportingPeriodId: 'period-fy2026',
        uploadedAt: '2026-02-15T10:00:00Z',
        uploadedBy: 'company_secretary',
        version: 1,
        documentFamilyId: `docfam-annual-${orgId}`,
        evidenceStatus: DOCUMENT_EVIDENCE_STATUS.VERIFIED,
        status: DOCUMENT_EVIDENCE_STATUS.VERIFIED,
        classification: 'official',
      }),
    )
  }

  const financeSub = args.submissions.find((s) => s.id === 'sub-psm-finance-fy2027')
  const familyFinance = 'docfam-psm-fin-statements'
  extraDocuments.push(
    ensureDocument({
      id: `${familyFinance}-v1`,
      organizationId: 'org-psm',
      title: 'PSM Audited Financial Statements FY2026',
      category: DOCUMENT_CATEGORY.FINANCIAL_STATEMENTS,
      fileName: 'PSM-AFS-FY2026-v1.pdf',
      linkedRecordType: 'submission',
      linkedRecordId: financeSub?.id,
      linkedModule: 'finance',
      reportingPeriodId: 'period-fy2026',
      uploadedAt: '2026-03-01T10:00:00Z',
      uploadedBy: 'finance_officer',
      version: 1,
      documentFamilyId: familyFinance,
      evidenceStatus: DOCUMENT_EVIDENCE_STATUS.SUPERSEDED,
      status: DOCUMENT_EVIDENCE_STATUS.SUPERSEDED,
      classification: 'official',
    }),
    ensureDocument({
      id: `${familyFinance}-v2`,
      organizationId: 'org-psm',
      title: 'PSM Audited Financial Statements FY2026 (revised)',
      category: DOCUMENT_CATEGORY.FINANCIAL_STATEMENTS,
      fileName: 'PSM-AFS-FY2026-v2.pdf',
      linkedRecordType: 'submission',
      linkedRecordId: financeSub?.id,
      linkedModule: 'finance',
      reportingPeriodId: 'period-fy2026',
      uploadedAt: '2026-04-15T10:00:00Z',
      uploadedBy: 'finance_officer',
      version: 2,
      documentFamilyId: familyFinance,
      evidenceStatus: DOCUMENT_EVIDENCE_STATUS.VERIFIED,
      status: DOCUMENT_EVIDENCE_STATUS.VERIFIED,
      classification: 'official',
      supersedesDocumentId: `${familyFinance}-v1`,
      notes: 'Revised after clarification',
    }),
    ensureDocument({
      id: 'doc-psm-fin-missing',
      organizationId: 'org-psm',
      title: 'FY2027 audited statements (placeholder)',
      category: DOCUMENT_CATEGORY.FINANCIAL_STATEMENTS,
      fileName: 'missing-afs-fy2027.pdf',
      linkedRecordType: 'submission',
      linkedRecordId: financeSub?.id,
      linkedModule: 'finance',
      reportingPeriodId: 'period-fy2027',
      uploadedAt: '2026-08-01T10:00:00Z',
      uploadedBy: 'finance_officer',
      version: 1,
      documentFamilyId: 'docfam-psm-fin-fy2027',
      evidenceStatus: DOCUMENT_EVIDENCE_STATUS.MISSING,
      status: DOCUMENT_EVIDENCE_STATUS.MISSING,
    }),
  )

  const land = args.assets.find((a) => a.organizationId === 'org-psm' && a.assetType === ASSET_TYPE.LAND)
  if (land) {
    extraDocuments.push(
      ensureDocument({
        id: `doc-deed-${land.id}`,
        organizationId: 'org-psm',
        title: ownershipDeedTitle(land.name),
        category: DOCUMENT_CATEGORY.PROPERTY_DOCUMENTS,
        fileName: `deed-${land.id}.pdf`,
        linkedRecordType: 'asset',
        linkedRecordId: land.id,
        linkedModule: 'assets',
        uploadedAt: '2025-06-01T09:00:00Z',
        uploadedBy: 'asset_officer',
        version: 1,
        documentFamilyId: `docfam-deed-${land.id}`,
        evidenceStatus: DOCUMENT_EVIDENCE_STATUS.VERIFIED,
        status: DOCUMENT_EVIDENCE_STATUS.VERIFIED,
        classification: 'official',
      }),
    )
  }

  const board = args.boardMembers.find((b) => b.organizationId === 'org-nfc' && !b.isVacancySlot)
  if (board) {
    extraDocuments.push(
      ensureDocument({
        id: `doc-appt-${board.id}`,
        organizationId: 'org-nfc',
        title: 'Board appointment notification',
        category: DOCUMENT_CATEGORY.NOTIFICATIONS,
        fileName: `appointment-${board.id}.pdf`,
        linkedRecordType: 'board_member',
        linkedRecordId: board.id,
        linkedModule: 'board',
        uploadedAt: '2024-01-15T09:00:00Z',
        uploadedBy: 'company_secretary',
        version: 1,
        documentFamilyId: `docfam-appt-${board.id}`,
        evidenceStatus: DOCUMENT_EVIDENCE_STATUS.AVAILABLE,
        status: DOCUMENT_EVIDENCE_STATUS.AVAILABLE,
        isSensitive: true,
        isRestricted: true,
        classification: 'official',
      }),
    )
  }

  extraDocuments.push(
    ensureDocument({
      id: 'doc-peco-audit-report',
      organizationId: 'org-peco',
      title: 'Auditor General report FY2025-26',
      category: DOCUMENT_CATEGORY.AUDIT_REPORTS,
      fileName: 'PECO-AGP-FY2026.pdf',
      linkedRecordType: 'audit_register',
      linkedRecordId: 'audreg-peco-1',
      linkedModule: 'audit',
      uploadedAt: '2026-05-01T10:00:00Z',
      uploadedBy: 'internal_audit',
      version: 1,
      documentFamilyId: 'docfam-peco-agp',
      evidenceStatus: DOCUMENT_EVIDENCE_STATUS.PENDING_REVIEW,
      status: DOCUMENT_EVIDENCE_STATUS.PENDING_REVIEW,
    }),
    ensureDocument({
      id: 'doc-psm-cabinet',
      organizationId: 'org-psm',
      title: 'Cabinet decision — privatization in principle',
      category: DOCUMENT_CATEGORY.CABINET_DECISIONS,
      fileName: 'cabinet-psm-priv.pdf',
      linkedRecordType: 'privatization_case',
      linkedRecordId: 'priv-psm-1',
      linkedModule: 'privatization',
      uploadedAt: '2025-11-01T10:00:00Z',
      uploadedBy: 'demo.user',
      version: 1,
      documentFamilyId: 'docfam-psm-cabinet',
      evidenceStatus: DOCUMENT_EVIDENCE_STATUS.VERIFIED,
      status: DOCUMENT_EVIDENCE_STATUS.VERIFIED,
      classification: 'official',
      isRestricted: true,
    }),
  )

  if (financeSub) {
    const events: Array<Omit<SubmissionHistoryEvent, 'id'>> = [
      {
        organizationId: 'org-psm',
        submissionId: financeSub.id,
        reportingPeriodId: 'period-fy2027',
        module: 'finance',
        occurredAt: '2026-07-05T09:00:00Z',
        actorRole: 'finance_officer',
        action: 'draft_created',
        status: 'draft',
        relatedVersion: '0.1',
        comment: 'Draft opened for FY2027',
      },
      {
        organizationId: 'org-psm',
        submissionId: financeSub.id,
        reportingPeriodId: 'period-fy2027',
        module: 'finance',
        occurredAt: '2026-07-20T11:00:00Z',
        actorRole: 'finance_officer',
        action: 'section_complete',
        status: 'in_progress',
        relatedVersion: '0.5',
      },
      {
        organizationId: 'org-psm',
        submissionId: financeSub.id,
        reportingPeriodId: 'period-fy2026',
        module: 'finance',
        occurredAt: '2026-04-01T10:00:00Z',
        actorRole: 'cfo',
        action: 'certification',
        status: 'certified',
        relatedVersion: '0.9',
        comment: 'CFO certified FY2026 pack',
      },
      {
        organizationId: 'org-psm',
        submissionId: financeSub.id,
        reportingPeriodId: 'period-fy2026',
        module: 'finance',
        occurredAt: '2026-04-02T12:00:00Z',
        actorRole: 'ceo',
        action: 'submission',
        status: 'submitted',
        relatedVersion: '1.0',
      },
      {
        organizationId: 'org-psm',
        submissionId: financeSub.id,
        reportingPeriodId: 'period-fy2026',
        module: 'finance',
        occurredAt: '2026-04-10T09:00:00Z',
        actorRole: 'moip_reviewer',
        action: 'reviewer_action',
        status: 'under_review',
        relatedVersion: '1.0',
      },
      {
        organizationId: 'org-psm',
        submissionId: financeSub.id,
        reportingPeriodId: 'period-fy2026',
        module: 'finance',
        occurredAt: '2026-04-12T15:00:00Z',
        actorRole: 'moip_reviewer',
        action: 'clarification',
        status: 'clarification_requested',
        relatedVersion: '1.0',
        comment: 'Clarify subsidy line',
      },
      {
        organizationId: 'org-psm',
        submissionId: financeSub.id,
        reportingPeriodId: 'period-fy2026',
        module: 'finance',
        occurredAt: '2026-04-18T10:00:00Z',
        actorRole: 'finance_officer',
        action: 'resubmission',
        status: 'resubmitted',
        relatedVersion: '1.1',
      },
      {
        organizationId: 'org-psm',
        submissionId: financeSub.id,
        reportingPeriodId: 'period-fy2026',
        module: 'finance',
        occurredAt: '2026-04-25T14:00:00Z',
        actorRole: 'moip_reviewer',
        action: 'approval',
        status: 'approved',
        relatedVersion: '1.2',
      },
      {
        organizationId: 'org-psm',
        submissionId: financeSub.id,
        reportingPeriodId: 'period-fy2026',
        module: 'finance',
        occurredAt: '2026-04-25T14:05:00Z',
        actorRole: 'system',
        action: 'lock',
        status: 'locked',
        relatedVersion: '1.2',
        comment: 'Immutable snapshot',
      },
    ]
    events.forEach((e, i) => {
      submissionHistory.push({ ...e, id: `subhist-psm-fin-${i + 1}` })
    })
  }

  const tusdecOrgId = 'org-tusdec'
  const tusdecSubmissions = {
    financeFy2027: args.submissions.find((s) => s.id === 'sub-tusdec-finance-fy2027'),
    financeFy2026: args.submissions.find((s) => s.id === 'sub-tusdec-finance-fy2026'),
    enterpriseFy2027: args.submissions.find((s) => s.id === 'sub-tusdec-enterprise-fy2027'),
    assetsFy2027: args.submissions.find((s) => s.id === 'sub-tusdec-assets-fy2027'),
    documentsFy2027: args.submissions.find((s) => s.id === 'sub-tusdec-documents-fy2027'),
    complianceFy2027: args.submissions.find((s) => s.id === 'sub-tusdec-compliance-fy2027'),
    industrialFy2027: args.submissions.find((s) => s.id === 'sub-tusdec-industrial-fy2027'),
  }

  const tusdecEvents: Array<Omit<SubmissionHistoryEvent, 'id'>> = []

  if (tusdecSubmissions.financeFy2027) {
    tusdecEvents.push(
      {
        organizationId: tusdecOrgId,
        submissionId: tusdecSubmissions.financeFy2027.id,
        reportingPeriodId: 'period-fy2027',
        module: 'finance',
        occurredAt: '2026-07-02T09:00:00Z',
        actorRole: 'finance_officer',
        action: 'draft_created',
        status: 'draft',
        relatedVersion: '0.1',
        comment: 'FY2027 finance pack opened',
      },
      {
        organizationId: tusdecOrgId,
        submissionId: tusdecSubmissions.financeFy2027.id,
        reportingPeriodId: 'period-fy2027',
        module: 'finance',
        occurredAt: '2026-07-18T11:30:00Z',
        actorRole: 'finance_officer',
        action: 'section_complete',
        status: 'in_progress',
        relatedVersion: '0.6',
        comment: 'Statements and subsidy lines completed',
      },
      {
        organizationId: tusdecOrgId,
        submissionId: tusdecSubmissions.financeFy2027.id,
        reportingPeriodId: 'period-fy2027',
        module: 'finance',
        occurredAt: '2026-08-04T14:00:00Z',
        actorRole: 'cfo',
        action: 'certification',
        status: 'certified',
        relatedVersion: '1.0',
        comment: 'CFO certified — pending MoIP submission',
      },
    )
  }

  if (tusdecSubmissions.financeFy2026) {
    tusdecEvents.push(
      {
        organizationId: tusdecOrgId,
        submissionId: tusdecSubmissions.financeFy2026.id,
        reportingPeriodId: 'period-fy2026',
        module: 'finance',
        occurredAt: '2025-08-20T10:00:00Z',
        actorRole: 'finance_officer',
        action: 'draft_created',
        status: 'draft',
        relatedVersion: '0.2',
      },
      {
        organizationId: tusdecOrgId,
        submissionId: tusdecSubmissions.financeFy2026.id,
        reportingPeriodId: 'period-fy2026',
        module: 'finance',
        occurredAt: '2025-09-05T12:00:00Z',
        actorRole: 'ceo',
        action: 'submission',
        status: 'submitted',
        relatedVersion: '1.0',
      },
      {
        organizationId: tusdecOrgId,
        submissionId: tusdecSubmissions.financeFy2026.id,
        reportingPeriodId: 'period-fy2026',
        module: 'finance',
        occurredAt: '2025-09-18T09:30:00Z',
        actorRole: 'moip_reviewer',
        action: 'approval',
        status: 'approved',
        relatedVersion: '1.0',
      },
      {
        organizationId: tusdecOrgId,
        submissionId: tusdecSubmissions.financeFy2026.id,
        reportingPeriodId: 'period-fy2026',
        module: 'finance',
        occurredAt: '2025-09-18T09:35:00Z',
        actorRole: 'system',
        action: 'lock',
        status: 'locked',
        relatedVersion: '1.0',
        comment: 'Approved snapshot locked',
      },
    )
  }

  if (tusdecSubmissions.enterpriseFy2027) {
    tusdecEvents.push(
      {
        organizationId: tusdecOrgId,
        submissionId: tusdecSubmissions.enterpriseFy2027.id,
        reportingPeriodId: 'period-fy2027',
        module: 'enterprise',
        occurredAt: '2026-07-10T08:45:00Z',
        actorRole: 'company_secretary',
        action: 'draft_created',
        status: 'draft',
        relatedVersion: '0.1',
        comment: 'Enterprise profile draft started',
      },
      {
        organizationId: tusdecOrgId,
        submissionId: tusdecSubmissions.enterpriseFy2027.id,
        reportingPeriodId: 'period-fy2027',
        module: 'enterprise',
        occurredAt: '2026-07-25T16:20:00Z',
        actorRole: 'company_secretary',
        action: 'field_update',
        status: 'draft',
        relatedVersion: '0.3',
        comment: 'Ownership composition updated',
      },
    )
  }

  if (tusdecSubmissions.assetsFy2027) {
    tusdecEvents.push(
      {
        organizationId: tusdecOrgId,
        submissionId: tusdecSubmissions.assetsFy2027.id,
        reportingPeriodId: 'period-fy2027',
        module: 'assets',
        occurredAt: '2026-06-18T10:00:00Z',
        actorRole: 'asset_officer',
        action: 'draft_created',
        status: 'draft',
        relatedVersion: '0.4',
      },
      {
        organizationId: tusdecOrgId,
        submissionId: tusdecSubmissions.assetsFy2027.id,
        reportingPeriodId: 'period-fy2027',
        module: 'assets',
        occurredAt: '2026-07-03T13:00:00Z',
        actorRole: 'asset_officer',
        action: 'submission',
        status: 'submitted',
        relatedVersion: '0.9',
      },
      {
        organizationId: tusdecOrgId,
        submissionId: tusdecSubmissions.assetsFy2027.id,
        reportingPeriodId: 'period-fy2027',
        module: 'assets',
        occurredAt: '2026-07-12T11:00:00Z',
        actorRole: 'moip_reviewer',
        action: 'clarification',
        status: 'clarification_requested',
        relatedVersion: '0.9',
        comment: 'Confirm land utilization for Lahore centre',
      },
      {
        organizationId: tusdecOrgId,
        submissionId: tusdecSubmissions.assetsFy2027.id,
        reportingPeriodId: 'period-fy2027',
        module: 'assets',
        occurredAt: '2026-07-22T15:30:00Z',
        actorRole: 'asset_officer',
        action: 'resubmission',
        status: 'resubmitted',
        relatedVersion: '1.0',
      },
    )
  }

  if (tusdecSubmissions.documentsFy2027) {
    tusdecEvents.push(
      {
        organizationId: tusdecOrgId,
        submissionId: tusdecSubmissions.documentsFy2027.id,
        reportingPeriodId: 'period-fy2027',
        module: 'documents',
        occurredAt: '2026-06-05T09:00:00Z',
        actorRole: 'soe_focal_person',
        action: 'draft_created',
        status: 'draft',
        relatedVersion: '0.5',
      },
      {
        organizationId: tusdecOrgId,
        submissionId: tusdecSubmissions.documentsFy2027.id,
        reportingPeriodId: 'period-fy2027',
        module: 'documents',
        occurredAt: '2026-06-20T10:30:00Z',
        actorRole: 'soe_focal_person',
        action: 'submission',
        status: 'submitted',
        relatedVersion: '0.9',
      },
      {
        organizationId: tusdecOrgId,
        submissionId: tusdecSubmissions.documentsFy2027.id,
        reportingPeriodId: 'period-fy2027',
        module: 'documents',
        occurredAt: '2026-07-08T14:15:00Z',
        actorRole: 'moip_reviewer',
        action: 'approval',
        status: 'approved',
        relatedVersion: '1.0',
      },
      {
        organizationId: tusdecOrgId,
        submissionId: tusdecSubmissions.documentsFy2027.id,
        reportingPeriodId: 'period-fy2027',
        module: 'documents',
        occurredAt: '2026-07-08T14:20:00Z',
        actorRole: 'system',
        action: 'lock',
        status: 'locked',
        relatedVersion: '1.0',
      },
    )
  }

  if (tusdecSubmissions.complianceFy2027) {
    tusdecEvents.push(
      {
        organizationId: tusdecOrgId,
        submissionId: tusdecSubmissions.complianceFy2027.id,
        reportingPeriodId: 'period-fy2027',
        module: 'compliance',
        occurredAt: '2026-07-14T09:00:00Z',
        actorRole: 'internal_audit',
        action: 'draft_created',
        status: 'draft',
        relatedVersion: '0.7',
      },
      {
        organizationId: tusdecOrgId,
        submissionId: tusdecSubmissions.complianceFy2027.id,
        reportingPeriodId: 'period-fy2027',
        module: 'compliance',
        occurredAt: '2026-07-28T12:00:00Z',
        actorRole: 'internal_audit',
        action: 'submission',
        status: 'submitted',
        relatedVersion: '0.9',
      },
      {
        organizationId: tusdecOrgId,
        submissionId: tusdecSubmissions.complianceFy2027.id,
        reportingPeriodId: 'period-fy2027',
        module: 'compliance',
        occurredAt: '2026-08-03T10:45:00Z',
        actorRole: 'moip_reviewer',
        action: 'clarification',
        status: 'clarification_requested',
        relatedVersion: '0.9',
        comment: 'Attach board resolution for policy exception',
      },
    )
  }

  if (tusdecSubmissions.industrialFy2027) {
    tusdecEvents.push(
      {
        organizationId: tusdecOrgId,
        submissionId: tusdecSubmissions.industrialFy2027.id,
        reportingPeriodId: 'period-fy2027',
        module: 'industrial',
        occurredAt: '2026-07-06T11:00:00Z',
        actorRole: 'industrial_officer',
        action: 'draft_created',
        status: 'draft',
        relatedVersion: '0.4',
      },
      {
        organizationId: tusdecOrgId,
        submissionId: tusdecSubmissions.industrialFy2027.id,
        reportingPeriodId: 'period-fy2027',
        module: 'industrial',
        occurredAt: '2026-07-30T09:30:00Z',
        actorRole: 'moip_reviewer',
        action: 'reviewer_action',
        status: 'returned',
        relatedVersion: '0.8',
        comment: 'Capacity utilization evidence incomplete',
      },
    )
  }

  tusdecEvents.forEach((e, i) => {
    submissionHistory.push({ ...e, id: `subhist-tusdec-${i + 1}` })
  })

  fieldChanges.push(
    {
      id: 'fc-psm-rev-1',
      organizationId: 'org-psm',
      recordType: 'financial_metric',
      recordId: 'fin-org-psm-period-fy2027',
      field: 'revenue',
      previousValue: '21000000000',
      currentValue: '22000000000',
      changedBy: 'finance_officer',
      changedAt: '2026-07-22T10:00:00Z',
      reason: 'Updated draft revenue estimate',
    },
    {
      id: 'fc-psm-util-1',
      organizationId: 'org-psm',
      recordType: 'asset',
      recordId: land?.id ?? 'asset-unknown',
      field: 'utilizationPercent',
      previousValue: '35',
      currentValue: '28',
      changedBy: 'asset_officer',
      changedAt: '2026-06-01T10:00:00Z',
      reason: 'Survey update',
    },
  )

  lineagePaths.push(
    {
      id: 'lineage-psm-finance-kpi',
      title: 'Revenue KPI → finance evidence',
      domain: 'finance',
      organizationId: 'org-psm',
      nodes: [
        {
          id: 'n1',
          kind: 'kpi',
          label: 'Revenue (FY2026 approved)',
          detail: 'Executive KPI from locked finance snapshot',
          route: '/soe/finance/performance',
        },
        {
          id: 'n2',
          kind: 'record',
          label: 'Financial metric fin-org-psm-period-fy2026',
          recordType: 'financial_metric',
          recordId: 'fin-org-psm-period-fy2026',
          route: '/soe/finance',
        },
        {
          id: 'n3',
          kind: 'evidence',
          label: 'Audited Financial Statements v2',
          documentId: `${familyFinance}-v2`,
          route: `/soe/documents/${familyFinance}-v2`,
        },
        {
          id: 'n4',
          kind: 'submission',
          label: 'Finance submission FY2026',
          recordType: 'submission',
          recordId: financeSub?.id,
          route: '/soe/finance/history',
        },
        {
          id: 'n5',
          kind: 'certification',
          label: 'CFO certification',
          detail: 'Certified before MoIP submission',
        },
        {
          id: 'n6',
          kind: 'review',
          label: 'MoIP approval & lock',
          detail: 'Clarification → resubmit → approve → lock',
          route: '/soe/documents/submission-history',
        },
      ],
    },
    {
      id: 'lineage-psm-asset-kpi',
      title: 'Asset book value → deed evidence',
      domain: 'asset',
      organizationId: 'org-psm',
      nodes: [
        {
          id: 'a1',
          kind: 'kpi',
          label: 'Land book value',
          detail: 'Asset registry KPI',
          route: '/soe/assets/land',
        },
        {
          id: 'a2',
          kind: 'record',
          label: land ? `Asset ${land.name}` : 'Land asset',
          recordType: 'asset',
          recordId: land?.id,
          route: land ? `/soe/assets/${land.id}` : '/soe/assets/land',
        },
        {
          id: 'a3',
          kind: 'evidence',
          label: 'Ownership deed',
          documentId: land ? `doc-deed-${land.id}` : undefined,
          route: land ? `/soe/documents/doc-deed-${land.id}` : '/soe/documents',
        },
        {
          id: 'a4',
          kind: 'submission',
          label: 'Asset module evidence pack',
          detail: 'Linked via reporting documents',
        },
        {
          id: 'a5',
          kind: 'certification',
          label: 'SOE certification (module)',
          detail: 'Where configured for period pack',
        },
        {
          id: 'a6',
          kind: 'review',
          label: 'MoIP asset review history',
          detail: 'Trace via enterprise/asset timeline',
          route: '/soe/documents/enterprise-timeline',
        },
      ],
    },
    {
      id: 'lineage-nfc-governance-kpi',
      title: 'Board appointment → notification evidence',
      domain: 'governance',
      organizationId: 'org-nfc',
      nodes: [
        {
          id: 'g1',
          kind: 'kpi',
          label: 'Board completeness',
          detail: 'Governance KPI / vacancy signal',
          route: '/soe/people/board',
        },
        {
          id: 'g2',
          kind: 'record',
          label: board ? `Board member ${board.name}` : 'Board member',
          recordType: 'board_member',
          recordId: board?.id,
          route: board ? `/soe/people/board/${board.id}` : '/soe/people/board',
        },
        {
          id: 'g3',
          kind: 'evidence',
          label: 'Appointment notification (restricted)',
          documentId: board ? `doc-appt-${board.id}` : undefined,
          route: board ? `/soe/documents/doc-appt-${board.id}` : '/soe/documents',
        },
        {
          id: 'g4',
          kind: 'submission',
          label: 'Board governance submission',
          detail: 'Period reporting pack',
        },
        {
          id: 'g5',
          kind: 'certification',
          label: 'Company Secretary / CEO certification',
        },
        {
          id: 'g6',
          kind: 'review',
          label: 'MoIP governance review',
          route: '/soe/documents/enterprise-timeline',
        },
      ],
    },
  )

  return { extraDocuments, submissionHistory, fieldChanges, lineagePaths }
}

function buildAccountability() {
  const procurement: ProcurementContract[] = []
  const contracts: ContractRecord[] = []
  const auditRegisters: AuditRegister[] = []
  const audits: AuditPara[] = []
  const pacObservations: PacObservation[] = []
  const litigation: LitigationCase[] = []
  const compliance: ComplianceItem[] = []
  const history: AccountabilityHistoryEvent[] = []

  const complianceAreas = [
    { area: 'SOE Act', freq: 'annual' },
    { area: 'Companies Act', freq: 'annual' },
    { area: 'PPRA', freq: 'event' },
    { area: 'SECP Filings', freq: 'annual' },
    { area: 'Tax Returns', freq: 'annual' },
    { area: 'EOBI', freq: 'monthly' },
    { area: 'ESSI', freq: 'monthly' },
    { area: 'Environmental', freq: 'annual' },
    { area: 'Labour Laws', freq: 'annual' },
    { area: 'Board Evaluation', freq: 'annual' },
    { area: 'Annual Report', freq: 'annual' },
    { area: 'Strategic Plan', freq: 'annual' },
    { area: 'Risk Register', freq: 'annual' },
    { area: 'Internal Audit', freq: 'annual' },
  ]

  for (const org of ORG_SPECS) {
    for (let i = 0; i < 5; i++) {
      const method =
        i === 0 && org.scenarioId === SCENARIO.GOVERNANCE_RISK
          ? PROCUREMENT_METHOD.SINGLE_SOURCE
          : i % 2 === 0
            ? PROCUREMENT_METHOD.OPEN_TENDER
            : PROCUREMENT_METHOD.SINGLE_SOURCE
      const value =
        i === 1
          ? money(`proc-${org.id}-${i}`, 150_000_000)
          : money(`proc-${org.id}-${i}`, 50_000_000)
      const completed = method === PROCUREMENT_METHOD.OPEN_TENDER && i === 2
      const overdue = i === 3
      const missingEvidence = method === PROCUREMENT_METHOD.SINGLE_SOURCE && i === 0
      const procId = `proc-${org.abbreviation.toLowerCase()}-${i + 1}`
      const contractId = `ctr-${org.abbreviation.toLowerCase()}-${i + 1}`

      procurement.push({
        id: procId,
        organizationId: org.id,
        title: procurementTitle(`proc-title-${org.id}-${i}`),
        planReference: `APP-${org.abbreviation}-FY2027-${i + 1}`,
        vendor: vendorName(`vendor-${org.id}-${i}`),
        value,
        method,
        ppraCompliance: missingEvidence
          ? PPRA_COMPLIANCE.MISSING_EVIDENCE
          : completed
            ? PPRA_COMPLIANCE.COMPLIANT
            : pick(`ppra-${org.id}-${i}`, [
                PPRA_COMPLIANCE.COMPLIANT,
                PPRA_COMPLIANCE.PENDING,
                PPRA_COMPLIANCE.EXCEPTION,
              ]),
        contractStatus: completed
          ? PROCUREMENT_CONTRACT_STATUS.COMPLETED
          : overdue
            ? PROCUREMENT_CONTRACT_STATUS.OVERDUE
            : PROCUREMENT_CONTRACT_STATUS.ACTIVE,
        completionStatus: completed ? 'complete' : overdue ? 'overdue' : 'in_progress',
        responsibleFunction: 'Procurement',
        evidenceAvailable: !missingEvidence,
        startDate: '2025-09-01',
        endDate: completed ? '2026-03-01' : '2026-12-31',
        completionDueDate: overdue ? '2026-06-30' : '2026-12-31',
        linkedContractId: contractId,
        isDummyDemonstrationData: true,
      })

      contracts.push({
        id: contractId,
        organizationId: org.id,
        procurementId: procId,
        vendor: vendorName(`vendor-${org.id}-${i}`),
        contractValue: value,
        startDate: '2025-09-15',
        endDate: completed ? '2026-03-01' : '2026-12-31',
        completionPct: completed ? 100 : overdue ? 40 : 55 + (i % 4) * 10,
        responsibleOfficer: personName(`proc-off-${org.id}-${i}`, 'any'),
        status: completed
          ? PROCUREMENT_CONTRACT_STATUS.COMPLETED
          : overdue
            ? PROCUREMENT_CONTRACT_STATUS.OVERDUE
            : PROCUREMENT_CONTRACT_STATUS.ACTIVE,
        amendments: i === 1 ? 1 : 0,
        evidenceAvailable: !missingEvidence,
        isDummyDemonstrationData: true,
      })

      history.push({
        id: `ah-proc-${procId}`,
        organizationId: org.id,
        recordType: 'procurement',
        recordId: procId,
        occurredAt: '2025-09-01T10:00:00Z',
        title: 'Procurement record created',
        actor: 'demo.procurement',
      })
    }

    const auditRegId = `audreg-${org.abbreviation.toLowerCase()}-1`
    const paraCount = org.scenarioId === SCENARIO.AUDIT_HEAVY ? 12 : 4
    let totalAmt = 0
    const paraStatuses = [
      AUDIT_PARA_STATUS.OPEN,
      AUDIT_PARA_STATUS.RESPONSE_SUBMITTED,
      AUDIT_PARA_STATUS.UNDER_REVIEW,
      AUDIT_PARA_STATUS.ACTION_REQUIRED,
      AUDIT_PARA_STATUS.RECOVERY_IN_PROGRESS,
      AUDIT_PARA_STATUS.SETTLED,
      AUDIT_PARA_STATUS.CLOSED,
    ]

    for (let i = 0; i < paraCount; i++) {
      const amount = money(`aud-amt-${org.id}-${i}`, i === 0 ? 120_000_000 : 25_000_000)
      totalAmt += amount
      const status =
        org.scenarioId === SCENARIO.AUDIT_HEAVY && i === 0
          ? AUDIT_PARA_STATUS.RECOVERY_IN_PROGRESS
          : org.scenarioId === SCENARIO.AUDIT_HEAVY && i === 1
            ? AUDIT_PARA_STATUS.ACTION_REQUIRED
            : paraStatuses[i % paraStatuses.length]!
      const recovered =
        status === AUDIT_PARA_STATUS.SETTLED || status === AUDIT_PARA_STATUS.CLOSED
          ? amount
          : status === AUDIT_PARA_STATUS.RECOVERY_IN_PROGRESS
            ? Math.round(amount * 0.35)
            : 0
      const paraId = `para-${org.abbreviation.toLowerCase()}-${i + 1}`
      const pacId =
        org.scenarioId === SCENARIO.AUDIT_HEAVY && i < 3
          ? `pac-${org.abbreviation.toLowerCase()}-${i + 1}`
          : undefined

      audits.push({
        id: paraId,
        organizationId: org.id,
        auditId: auditRegId,
        title: auditParaTitle(`para-title-${org.id}-${i}`),
        observation: auditObservation(`para-obs-${org.id}-${i}`, org.abbreviation),
        amountInvolved: amount,
        dateRaised: `2025-${String((i % 9) + 1).padStart(2, '0')}-15`,
        responsibleFunction: 'Finance',
        responsibleOfficer: personName(`cfo-office-${org.id}`, 'any'),
        responseDueDate:
          org.scenarioId === SCENARIO.AUDIT_HEAVY && i === 1 ? '2026-07-15' : '2026-10-30',
        status,
        pacStatus: pacId
          ? i === 0
            ? PAC_STATUS.OVERDUE
            : PAC_STATUS.OPEN
          : PAC_STATUS.NONE,
        recoveryStatus:
          recovered >= amount
            ? RECOVERY_STATUS.COMPLETED
            : recovered > 0
              ? RECOVERY_STATUS.PARTIAL
              : status === AUDIT_PARA_STATUS.RECOVERY_IN_PROGRESS
                ? RECOVERY_STATUS.IN_PROGRESS
                : RECOVERY_STATUS.NOT_STARTED,
        amountRecovered: recovered,
        evidenceAvailable: status !== AUDIT_PARA_STATUS.OPEN,
        linkedPacId: pacId,
        isDummyDemonstrationData: true,
      })

      if (pacId) {
        pacObservations.push({
          id: pacId,
          organizationId: org.id,
          auditParaId: paraId,
          observation:
            i === 0
              ? 'PAC directed recovery and report back'
              : `PAC observation on para ${i + 1}`,
          observationDate: '2026-05-20',
          requiredAction: 'Submit recovery plan and evidence',
          responsibleParty: `${org.abbreviation} Management — ${personName(`pac-mgmt-${org.id}`, 'any')}`,
          dueDate: i === 0 ? '2026-07-01' : '2026-11-30',
          status: i === 0 ? PAC_STATUS.OVERDUE : PAC_STATUS.OPEN,
          evidenceAvailable: false,
          isDummyDemonstrationData: true,
        })
      }

      history.push({
        id: `ah-para-${paraId}`,
        organizationId: org.id,
        recordType: 'audit_para',
        recordId: paraId,
        occurredAt: '2025-10-01T09:00:00Z',
        title: `Para status: ${status}`,
        actor: 'demo.audit',
      })
    }

    auditRegisters.push({
      id: auditRegId,
      organizationId: org.id,
      auditType:
        org.scenarioId === SCENARIO.AUDIT_HEAVY
          ? AUDIT_TYPE.AUDITOR_GENERAL
          : pick(`at-${org.id}`, [
              AUDIT_TYPE.EXTERNAL,
              AUDIT_TYPE.INTERNAL,
              AUDIT_TYPE.SPECIAL,
            ]),
      auditPeriod: 'FY2025-26',
      auditor:
        org.scenarioId === SCENARIO.AUDIT_HEAVY
          ? 'Auditor General of Pakistan'
          : 'External Auditor (demo)',
      reportDate: '2026-04-30',
      status: AUDIT_REGISTER_STATUS.REPORT_ISSUED,
      paraCount,
      totalAmountInvolved: totalAmt,
      evidenceAvailable: true,
      isDummyDemonstrationData: true,
    })

    const caseCount = org.scenarioId === SCENARIO.LITIGATION_HEAVY ? 10 : 3
    for (let i = 0; i < caseCount; i++) {
      const litId = `lit-${org.abbreviation.toLowerCase()}-${i + 1}`
      litigation.push({
        id: litId,
        organizationId: org.id,
        court: pick(`court-${i}`, ['High Court', 'District Court', 'Supreme Court']),
        caseNumber: `${org.abbreviation}/C/${2024 + (i % 3)}/${i + 1}`,
        petitioner:
          i % 2 === 0 ? org.name : litigationParty(`pet-${org.id}-${i}`),
        respondent:
          i % 2 === 0 ? litigationParty(`res-${org.id}-${i}`) : org.name,
        nature: pick(`nat-${i}`, ['land', 'contract', 'employment', 'tax']),
        amountInvolved:
          org.scenarioId === SCENARIO.LITIGATION_HEAVY && i === 0
            ? money(`lit-amt-${org.id}-${i}`, 500_000_000)
            : money(`lit-amt-${org.id}-${i}`, 80_000_000),
        lawyer: counselName(`law-${org.id}-${i}`),
        status: pick(`lit-st-${i}`, [
          LITIGATION_STATUS.ACTIVE,
          LITIGATION_STATUS.STAYED,
          LITIGATION_STATUS.APPEALED,
        ]),
        nextHearing:
          i === 0
            ? '2026-08-15'
            : `2026-${String((i % 9) + 1).padStart(2, '0')}-20`,
        evidenceAvailable: i % 3 !== 0,
        relatedAssetId:
          org.scenarioId === SCENARIO.LITIGATION_HEAVY && i === 0
            ? undefined
            : undefined,
        relatedAuditParaId:
          org.scenarioId === SCENARIO.AUDIT_HEAVY && i === 0
            ? `para-${org.abbreviation.toLowerCase()}-1`
            : undefined,
        isDummyDemonstrationData: true,
      })
    }

    complianceAreas.forEach((item, i) => {
      const overdue =
        (org.scenarioId === SCENARIO.GOVERNANCE_RISK && i < 3) ||
        (org.scenarioId === SCENARIO.COMPLIANT ? false : i === 5 && org.scenarioId !== SCENARIO.HEALTHY)
      compliance.push({
        id: `comp-${org.id}-${i + 1}`,
        organizationId: org.id,
        area: item.area,
        reportingFrequency: item.freq,
        dueDate: overdue ? '2026-06-30' : '2026-12-31',
        responsibleFunction: i < 2 ? 'Company Secretariat' : 'Compliance',
        status: overdue
          ? COMPLIANCE_STATUS.OVERDUE
          : org.scenarioId === SCENARIO.COMPLIANT
            ? COMPLIANCE_STATUS.COMPLIANT
            : i === 4
              ? COMPLIANCE_STATUS.PARTIALLY_COMPLIANT
              : COMPLIANCE_STATUS.PENDING_VERIFICATION,
        evidenceAvailable: org.scenarioId === SCENARIO.COMPLIANT || !overdue,
        lastSubmission: org.scenarioId === SCENARIO.COMPLIANT ? '2026-06-01' : undefined,
        verificationState:
          org.scenarioId === SCENARIO.COMPLIANT ? 'verified' : 'pending',
        comments: overdue ? 'Overdue — action required' : undefined,
        isDummyDemonstrationData: true,
      })
    })
  }

  return {
    procurement,
    contracts,
    auditRegisters,
    audits,
    pacObservations,
    litigation,
    compliance,
    history,
  }
}

function buildPrivatization() {
  const cases: PrivatizationCase[] = []
  const milestones: PrivatizationMilestone[] = []
  const transformations: TransformationInitiative[] = []

  const psm: PrivatizationCase = {
    id: 'priv-psm-1',
    organizationId: 'org-psm',
    currentStage: PRIVATIZATION_STAGE.DUE_DILIGENCE,
    status: 'active',
    cabinetDecision: 'Cabinet approved in principle (demo)',
    ccopDecision: 'CCOP concurred (demo)',
    blocker: 'Due diligence incomplete — land title clarification pending',
    nextAction: 'Complete land title pack and resume due diligence',
    isDummyDemonstrationData: true,
  }
  cases.push(psm)

  const stageDefs: Array<{
    stage: PrivatizationStage
    institution: string
  }> = [
    { stage: PRIVATIZATION_STAGE.IDENTIFIED, institution: 'MoIP' },
    { stage: PRIVATIZATION_STAGE.APPROVED, institution: 'Cabinet / CCOP' },
    { stage: PRIVATIZATION_STAGE.FINANCIAL_ADVISOR, institution: 'Privatization Commission' },
    { stage: PRIVATIZATION_STAGE.DUE_DILIGENCE, institution: 'Financial Advisor' },
    { stage: PRIVATIZATION_STAGE.VALUATION, institution: 'Financial Advisor' },
    { stage: PRIVATIZATION_STAGE.EOI, institution: 'Privatization Commission' },
    { stage: PRIVATIZATION_STAGE.BIDDING, institution: 'Privatization Commission' },
    { stage: PRIVATIZATION_STAGE.TRANSACTION, institution: 'Privatization Commission' },
    { stage: PRIVATIZATION_STAGE.POST_SALE, institution: 'MoIP' },
  ]

  stageDefs.forEach((s, i) => {
    const completed = i < 3
    const current = i === 3
    milestones.push({
      id: `priv-ms-psm-${i + 1}`,
      privatizationCaseId: psm.id,
      organizationId: 'org-psm',
      stage: s.stage,
      name: PRIVATIZATION_STAGE_LABEL[s.stage],
      responsibleInstitution: s.institution,
      targetDate: `2026-${String(Math.min(i + 2, 12)).padStart(2, '0')}-01`,
      actualCompletionDate: completed ? `2026-${String(i + 1).padStart(2, '0')}-20` : undefined,
      status: completed
        ? PRIVATIZATION_STAGE_STATUS.COMPLETED
        : current
          ? PRIVATIZATION_STAGE_STATUS.BLOCKED
          : PRIVATIZATION_STAGE_STATUS.PENDING,
      blocker: current ? psm.blocker : undefined,
      approvalNote: completed && i < 2 ? 'Approved (demo)' : undefined,
      comments: current ? 'Blocked pending land title evidence' : undefined,
    })
  })

  // Progressing privatization case (USC) — no blocker
  const usc = ORG_SPECS.find((o) => o.id === 'org-usc')
  if (usc) {
    const cid = 'priv-usc-1'
    cases.push({
      id: cid,
      organizationId: usc.id,
      currentStage: PRIVATIZATION_STAGE.VALUATION,
      status: 'active',
      cabinetDecision: 'Approved (demo)',
      ccopDecision: 'Noted (demo)',
      nextAction: 'Finalize valuation report',
      isDummyDemonstrationData: true,
    })
    stageDefs.forEach((s, i) => {
      milestones.push({
        id: `priv-ms-usc-${i + 1}`,
        privatizationCaseId: cid,
        organizationId: usc.id,
        stage: s.stage,
        name: PRIVATIZATION_STAGE_LABEL[s.stage],
        responsibleInstitution: s.institution,
        targetDate: `2026-${String(Math.min(i + 2, 12)).padStart(2, '0')}-15`,
        actualCompletionDate: i < 4 ? `2026-${String(i + 1).padStart(2, '0')}-10` : undefined,
        status:
          i < 4
            ? PRIVATIZATION_STAGE_STATUS.COMPLETED
            : i === 4
              ? PRIVATIZATION_STAGE_STATUS.IN_PROGRESS
              : PRIVATIZATION_STAGE_STATUS.PENDING,
      })
    })
  }

  transformations.push({
    id: 'xform-nfc-1',
    organizationId: 'org-nfc',
    initiative: 'NFC operational restructuring',
    type: TRANSFORMATION_TYPE.RESTRUCTURING,
    rationale: 'Improve cost structure and board oversight (demo)',
    currentStage: 'Awaiting approval',
    responsibleAuthority: 'MoIP / Board',
    decisionStatus: 'awaiting_approval',
    nextAction: 'Submit restructuring proposal pack to MoIP',
    milestones: [
      {
        id: 'xf-ms-1',
        name: 'Concept note',
        targetDate: '2026-05-01',
        status: 'completed',
      },
      {
        id: 'xf-ms-2',
        name: 'Board endorsement',
        targetDate: '2026-07-01',
        status: 'completed',
      },
      {
        id: 'xf-ms-3',
        name: 'MoIP approval',
        targetDate: '2026-09-01',
        status: 'pending',
      },
    ],
    evidenceAvailable: true,
    isDummyDemonstrationData: true,
  })

  transformations.push({
    id: 'xform-smeda-1',
    organizationId: 'org-smeda',
    initiative: 'Land monetization pilot',
    type: TRANSFORMATION_TYPE.LAND_MONETIZATION,
    rationale: 'Monetize idle land parcel (demo)',
    currentStage: 'Feasibility',
    responsibleAuthority: 'SOE Board',
    decisionStatus: 'in_progress',
    nextAction: 'Complete valuation of identified parcel',
    milestones: [
      {
        id: 'xf-s-1',
        name: 'Parcel identification',
        targetDate: '2026-06-01',
        status: 'completed',
      },
      {
        id: 'xf-s-2',
        name: 'Valuation',
        targetDate: '2026-08-30',
        status: 'in_progress',
      },
    ],
    evidenceAvailable: false,
    isDummyDemonstrationData: true,
  })

  return { cases, milestones, transformations }
}

function buildWorkflow() {
  const submissions: Submission[] = []
  const clarifications: Clarification[] = []
  const documents: DocumentMeta[] = []
  const tasks: TaskItem[] = []
  const alerts: AlertItem[] = []
  const timeline: TimelineEvent[] = []

  const modules = [
    'enterprise',
    'assets',
    'workforce',
    'board',
    'executives',
    'finance',
    'loans',
    'procurement',
    'audit',
    'litigation',
    'compliance',
    'industrial',
    'privatization',
    'documents',
  ] as const
  const statusCycle = [
    SUBMISSION_STATUS.DRAFT,
    SUBMISSION_STATUS.IN_PROGRESS,
    SUBMISSION_STATUS.READY_FOR_CERTIFICATION,
    SUBMISSION_STATUS.CERTIFIED,
    SUBMISSION_STATUS.SUBMITTED,
    SUBMISSION_STATUS.UNDER_REVIEW,
    SUBMISSION_STATUS.CLARIFICATION_REQUESTED,
    SUBMISSION_STATUS.RETURNED,
    SUBMISSION_STATUS.RESUBMITTED,
    SUBMISSION_STATUS.APPROVED,
    SUBMISSION_STATUS.LOCKED,
  ]

  ORG_SPECS.forEach((org, oi) => {
    modules.forEach((module, mi) => {
      const status = statusCycle[(oi + mi) % statusCycle.length]
      const id = `sub-${org.abbreviation.toLowerCase()}-${module}-fy2027`
      submissions.push({
        id,
        organizationId: org.id,
        reportingPeriodId: 'period-fy2027',
        module,
        status,
        completeness:
          status === SUBMISSION_STATUS.APPROVED || status === SUBMISSION_STATUS.LOCKED
            ? 100
            : 40 + ((oi + mi) * 7) % 55,
        version: status === SUBMISSION_STATUS.LOCKED ? '1.0' : '0.8',
        updatedAt: '2026-08-01T10:00:00Z',
      })

      if (status === SUBMISSION_STATUS.CLARIFICATION_REQUESTED) {
        clarifications.push({
          id: `clar-${id}`,
          submissionId: id,
          organizationId: org.id,
          question: `Please clarify ${module} variance for ${org.abbreviation}.`,
          status: 'open',
          createdAt: '2026-08-02T09:00:00Z',
          affectedField: module,
          dueDate: '2026-08-20',
        })
      }

      documents.push(
        ensureDocument({
          id: `doc-${id}`,
          organizationId: org.id,
          title: `${module} evidence pack`,
          category: module,
          fileName: `${org.abbreviation}-${module}-FY2027.pdf`,
          linkedRecordType: 'submission',
          linkedRecordId: id,
          linkedModule: module,
          reportingPeriodId: 'period-fy2027',
          uploadedAt: '2026-07-20T12:00:00Z',
          uploadedBy: 'demo.user',
          version: 1,
          status: 'available',
        }),
      )
    })

    for (const year of ['2024', '2025', '2026'] as const) {
      modules.forEach((module) => {
        const id = `sub-${org.abbreviation.toLowerCase()}-${module}-fy${year}`
        submissions.push({
          id,
          organizationId: org.id,
          reportingPeriodId: `period-fy${year}`,
          module,
          status: SUBMISSION_STATUS.LOCKED,
          completeness: 100,
          version: '1.0',
          submittedAt: `${Number(year) - 1}-09-15T10:00:00Z`,
          updatedAt: `${year}-01-31T10:00:00Z`,
        })
        documents.push(
          ensureDocument({
            id: `doc-${id}`,
            organizationId: org.id,
            title: `${module} approved evidence pack FY${year}`,
            category: module,
            fileName: `${org.abbreviation}-${module}-FY${year}.pdf`,
            linkedRecordType: 'submission',
            linkedRecordId: id,
            linkedModule: module,
            reportingPeriodId: `period-fy${year}`,
            uploadedAt: `${Number(year) - 1}-09-10T12:00:00Z`,
            uploadedBy: 'soe_focal_person',
            version: 1,
            status: 'verified',
          }),
        )
      })
    }

    timeline.push({
      id: `tl-${org.id}-1`,
      organizationId: org.id,
      occurredAt: '2026-07-01T08:00:00Z',
      title: 'FY2027 reporting cycle opened',
      category: 'reporting',
    })
  })

  // Phase 5 golden path: PSM FY2027 finance starts editable (demo script)
  const psmFinanceId = 'sub-psm-finance-fy2027'
  const psmFinance = submissions.find((s) => s.id === psmFinanceId)
  if (psmFinance) {
    psmFinance.status = SUBMISSION_STATUS.IN_PROGRESS
    psmFinance.completeness = 55
    psmFinance.version = '0.8'
  }

  tasks.push(
    {
      id: 'task-board-expiry-nfc',
      organizationId: 'org-nfc',
      title: 'Board members expiring within 30 days',
      type: 'board_appointment',
      sourceModule: 'board',
      dueDate: '2026-09-15',
      priority: 'critical',
      status: 'open',
      ownerRole: 'company_secretary',
      assignedRole: 'company_secretary',
      createdAt: '2026-08-01T09:00:00Z',
      nextAction: 'Initiate appointment process',
      linkedRecordType: 'board',
      linkedRecordId: 'board-nfc-1',
      route: '/soe/people/board',
    },
    {
      id: 'task-loan-overdue-pitac',
      organizationId: 'org-pitac',
      title: 'Loan repayment overdue',
      type: 'loan_repayment',
      sourceModule: 'loans',
      dueDate: '2026-07-15',
      priority: 'critical',
      status: 'open',
      ownerRole: 'finance_officer',
      assignedRole: 'finance_officer',
      createdAt: '2026-07-10T09:00:00Z',
      nextAction: 'Record repayment or escalate',
      linkedRecordType: 'loan',
      linkedRecordId: 'loan-pitac-1',
      route: '/soe/finance/loans',
    },
    {
      id: 'task-finance-psm',
      organizationId: 'org-psm',
      title: 'Complete FY2027 financial reporting',
      type: 'finance_submission',
      sourceModule: 'finance',
      dueDate: '2026-09-30',
      priority: 'high',
      status: 'open',
      ownerRole: 'finance_officer',
      assignedRole: 'finance_officer',
      createdAt: '2026-08-01T09:00:00Z',
      nextAction: 'Complete finance form',
      linkedRecordType: 'submission',
      linkedRecordId: psmFinanceId,
      route: '/soe/finance',
    },
    {
      id: 'task-normal-smeda',
      organizationId: 'org-smeda',
      title: 'Update enterprise contact register',
      type: 'enterprise_update',
      sourceModule: 'enterprise',
      dueDate: '2026-10-15',
      priority: 'normal',
      status: 'open',
      ownerRole: 'soe_focal_person',
      assignedRole: 'soe_focal_person',
      createdAt: '2026-08-05T09:00:00Z',
      nextAction: 'Verify head office contacts',
      linkedRecordType: 'organization',
      linkedRecordId: 'org-smeda',
      route: '/soe/enterprise/profile',
    },
  )

  alerts.push(
    {
      id: 'alert-resolved-demo',
      organizationId: 'org-smeda',
      title: 'Prior compliance reminder (resolved)',
      severity: 'information',
      status: 'resolved',
      linkedRecordType: 'compliance',
      linkedRecordId: 'comp-org-smeda-1',
      ruleId: 'compliance_due_14',
      ruleLabel: 'Compliance due within 14 days',
      generatedAt: '2026-07-01T08:00:00Z',
      explanation: 'Historical resolved alert for prototype audit trail.',
      recommendedAction: 'None — resolved',
      resolutionNote: 'Return filed 2026-07-10',
      resolvedAt: '2026-07-10T12:00:00Z',
      groupKey: 'compliance_due:org-smeda',
      isPrototypeRule: true,
    },
  )

  return {
    submissions,
    clarifications,
    documents,
    tasks,
    alerts,
    timeline,
    notifications: [] as NotificationItem[],
  }
}

/** Phase 13 MoIP oversight fixtures — mutates submissions/clarifications; returns escalations */
function buildPhase13Oversight(args: {
  submissions: Submission[]
  clarifications: Clarification[]
  tasks: TaskItem[]
}): Escalation[] {
  const escalations: Escalation[] = []
  const queueStatuses: SubmissionStatus[] = [
    SUBMISSION_STATUS.SUBMITTED,
    SUBMISSION_STATUS.UNDER_REVIEW,
    SUBMISSION_STATUS.CLARIFICATION_REQUESTED,
    SUBMISSION_STATUS.RESUBMITTED,
  ]

  args.submissions.forEach((s, i) => {
    if (!queueStatuses.includes(s.status)) return
    s.submittedAt = s.submittedAt ?? `2026-07-${String(10 + (i % 18)).padStart(2, '0')}T09:00:00Z`
    if (!s.assignedReviewerRole) {
      s.assignedReviewerRole =
        i % 3 === 0 ? ROLE.MOIP_SUPERVISOR : ROLE.MOIP_REVIEWER
    }
    if (!s.priority) {
      s.priority =
        s.status === SUBMISSION_STATUS.CLARIFICATION_REQUESTED
          ? REVIEW_PRIORITY.HIGH
          : REVIEW_PRIORITY.NORMAL
    }
  })

  // Clean finance pack ready for approval (USC)
  const uscFin = args.submissions.find((s) => s.id === 'sub-usc-finance-fy2027')
  if (uscFin) {
    uscFin.status = SUBMISSION_STATUS.UNDER_REVIEW
    uscFin.completeness = 96
    uscFin.version = '1.0'
    uscFin.submittedAt = '2026-07-28T10:00:00Z'
    uscFin.assignedReviewerRole = ROLE.MOIP_REVIEWER
    uscFin.priority = REVIEW_PRIORITY.NORMAL
    uscFin.updatedAt = '2026-08-01T10:00:00Z'
  }

  // Overdue under-review with high workload signal (PECO finance)
  const pecoFin = args.submissions.find((s) => s.id === 'sub-peco-finance-fy2027')
  if (pecoFin) {
    pecoFin.status = SUBMISSION_STATUS.UNDER_REVIEW
    pecoFin.submittedAt = '2026-07-01T08:00:00Z'
    pecoFin.assignedReviewerRole = ROLE.MOIP_REVIEWER
    pecoFin.priority = REVIEW_PRIORITY.CRITICAL
    pecoFin.completeness = 78
    pecoFin.updatedAt = '2026-07-15T10:00:00Z'
  }

  // Clarification scenario with issuedByRole (NFML)
  const nfmlFin = args.submissions.find((s) => s.id === 'sub-nfml-finance-fy2027')
  if (nfmlFin) {
    nfmlFin.status = SUBMISSION_STATUS.CLARIFICATION_REQUESTED
    nfmlFin.submittedAt = '2026-07-10T09:00:00Z'
    nfmlFin.assignedReviewerRole = ROLE.MOIP_REVIEWER
    nfmlFin.priority = REVIEW_PRIORITY.HIGH
    const existing = args.clarifications.find((c) => c.submissionId === nfmlFin.id)
    if (!existing) {
      args.clarifications.push({
        id: 'clar-nfml-finance-phase13',
        submissionId: nfmlFin.id,
        organizationId: nfmlFin.organizationId,
        question: 'Explain subsidy variance versus FY2026 approved figure.',
        status: 'open',
        createdAt: '2026-07-20T09:00:00Z',
        dueDate: '2026-07-28',
        affectedField: 'subsidies',
        module: 'finance',
        issuedByRole: ROLE.MOIP_REVIEWER,
      })
    } else {
      existing.issuedByRole = ROLE.MOIP_REVIEWER
      existing.module = existing.module ?? 'finance'
      existing.createdAt = '2026-07-20T09:00:00Z'
      existing.dueDate = existing.dueDate ?? '2026-07-28'
    }
  }

  // Resubmitted version scenario (PASDEC)
  const pasdecFin = args.submissions.find((s) => s.id === 'sub-pasdec-finance-fy2027')
  if (pasdecFin) {
    pasdecFin.status = SUBMISSION_STATUS.RESUBMITTED
    pasdecFin.version = '1.1'
    pasdecFin.submittedAt = '2026-07-25T11:00:00Z'
    pasdecFin.assignedReviewerRole = ROLE.MOIP_REVIEWER
    pasdecFin.priority = REVIEW_PRIORITY.HIGH
  }

  // Locked approved (NFC finance stays locked if already in cycle — force)
  const nfcFin = args.submissions.find((s) => s.id === 'sub-nfc-finance-fy2027')
  if (nfcFin) {
    nfcFin.status = SUBMISSION_STATUS.LOCKED
    nfcFin.version = '1.0'
    nfcFin.completeness = 100
    nfcFin.submittedAt = '2026-06-15T10:00:00Z'
    nfcFin.updatedAt = '2026-07-01T10:00:00Z'
  }

  args.clarifications.forEach((c) => {
    const sub = args.submissions.find((s) => s.id === c.submissionId)
    if (sub && !c.module) c.module = sub.module
    if (!c.issuedByRole) c.issuedByRole = ROLE.MOIP_REVIEWER
  })

  escalations.push(
    {
      id: 'esc-peco-overdue-review',
      organizationId: 'org-peco',
      submissionId: pecoFin?.id,
      reason: 'Finance pack under review beyond 14-day threshold',
      reasonCode: ESCALATION_REASON.UNRESOLVED_REVIEW,
      severity: ESCALATION_SEVERITY.CRITICAL,
      ownerRole: ROLE.MOIP_SUPERVISOR,
      dueDate: '2026-08-12',
      status: 'open',
      createdAt: '2026-08-05T09:00:00Z',
      createdByRole: ROLE.MOIP_REVIEWER,
      historyNote: 'Auto-seeded Phase 13 overdue review escalation',
      isDummyDemonstrationData: true,
    },
    {
      id: 'esc-nfml-clarification',
      organizationId: 'org-nfml',
      submissionId: nfmlFin?.id,
      reason: 'SOE clarification response overdue',
      reasonCode: ESCALATION_REASON.OVERDUE_SOE_RESPONSE,
      severity: ESCALATION_SEVERITY.ATTENTION,
      ownerRole: ROLE.MOIP_REVIEWER,
      dueDate: '2026-08-10',
      status: 'open',
      createdAt: '2026-08-04T09:00:00Z',
      createdByRole: ROLE.MOIP_SUPERVISOR,
      isDummyDemonstrationData: true,
    },
  )

  args.tasks.push({
    id: 'task-esc-peco-overdue-review',
    organizationId: 'org-peco',
    title: 'Escalation: Finance pack under review beyond threshold',
    dueDate: '2026-08-12',
    priority: 'critical',
    status: 'open',
    ownerRole: ROLE.MOIP_SUPERVISOR,
    linkedRecordType: 'escalation',
    linkedRecordId: 'esc-peco-overdue-review',
  })

  return escalations
}

/** Phase 15 Secretary Command Centre fixtures */
function buildPhase15Secretary(args: {
  escalations: Escalation[]
}): PendingDecision[] {
  // Resolved escalation for balance (not permanently catastrophic)
  args.escalations.push({
    id: 'esc-resolved-demo',
    organizationId: 'org-smeda',
    reason: 'Prior submission delay closed after MoIP follow-up',
    reasonCode: 'overdue_submission',
    severity: 'attention',
    ownerRole: ROLE.MOIP_SUPERVISOR,
    dueDate: '2026-07-20',
    status: 'resolved',
    createdAt: '2026-07-01T09:00:00Z',
    createdByRole: ROLE.MOIP_REVIEWER,
    escalationLevel: 2,
    escalatedBy: 'system',
    historyNote: 'Closed — pack submitted',
    history: [
      { at: '2026-07-01T09:00:00Z', note: 'Opened', actor: 'system' },
      { at: '2026-07-18T10:00:00Z', note: 'Resolved after submission', actor: 'moip_supervisor' },
    ],
    isDummyDemonstrationData: true,
  })

  const decisions: PendingDecision[] = [
    {
      id: 'dec-psm-priv-direction',
      organizationId: 'org-psm',
      matter: 'Confirm next privatization stage direction for PSM',
      originatingModule: 'privatization',
      dateRaised: '2026-07-25',
      responsibleWing: 'Privatization Wing',
      recommendationSummary:
        'Recommend continue valuation track; Cabinet note already on file (demo).',
      urgency: 'critical',
      status: 'open',
      linkedRecordType: 'privatization_case',
      linkedRecordId: 'priv-psm-1',
      linkedEvidenceNote: 'Cabinet decision document in repository',
      route: '/secretary/decisions/dec-psm-priv-direction',
      isDummyDemonstrationData: true,
    },
    {
      id: 'dec-nfc-board-quorum',
      organizationId: 'org-nfc',
      matter: 'Board quorum risk — appointment package for Secretary concurrence',
      originatingModule: 'board',
      dateRaised: '2026-08-01',
      responsibleWing: 'Governance Wing',
      recommendationSummary: 'Fast-track appointment notifications for expiring members.',
      urgency: 'critical',
      status: 'open',
      linkedRecordType: 'board',
      linkedRecordId: 'board-nfc-1',
      route: '/secretary/decisions/dec-nfc-board-quorum',
      isDummyDemonstrationData: true,
    },
    {
      id: 'dec-peco-audit-recovery',
      organizationId: 'org-peco',
      matter: 'High-value audit recovery path requiring administrative push',
      originatingModule: 'audit',
      dateRaised: '2026-07-15',
      responsibleWing: 'Audit Wing',
      recommendationSummary: 'Seek management response deadline and PAC briefing note.',
      urgency: 'attention',
      status: 'under_consideration',
      linkedRecordType: 'audit_para',
      acknowledgedAt: '2026-08-02T10:00:00Z',
      assignedTo: 'Audit Wing — Section Officer',
      route: '/secretary/decisions/dec-peco-audit-recovery',
      isDummyDemonstrationData: true,
    },
    {
      id: 'dec-pitac-loan',
      organizationId: 'org-pitac',
      matter: 'Overdue loan repayment — fiscal exposure briefing',
      originatingModule: 'loans',
      dateRaised: '2026-07-20',
      responsibleWing: 'Finance Wing',
      recommendationSummary: 'Require repayment schedule update before next MoIP review cycle.',
      urgency: 'attention',
      status: 'open',
      linkedRecordType: 'loan',
      route: '/secretary/decisions/dec-pitac-loan',
      isDummyDemonstrationData: true,
    },
  ]
  return decisions
}

export function createSeedDataset() {
  const organizations = buildOrganizations()
  const relationships = buildRelationships()
  const locations = buildLocations()
  const ownershipLines = buildOwnershipLines()
  const contacts = buildContacts()
  const enterpriseHistory = buildEnterpriseHistory()
  const {
    assets,
    geo,
    history: assetHistory,
    documents: assetDocuments,
  } = buildAssets()
  const {
    employees,
    posts,
    dailyWagers,
    consultants,
    boards,
    committees,
    executives,
    calendar: governanceCalendar,
  } = buildPeople()
  const financialMetrics = buildFinance()
  const budgetLines = buildBudgetLines(financialMetrics)
  const procurementAnnualPlans = buildProcurementPlans(organizations)
  const industrial = buildIndustrial()
  const { loans, grants, guarantees, repayments: loanRepayments } = buildFiscal()
  const {
    procurement,
    contracts,
    auditRegisters,
    audits,
    pacObservations,
    litigation,
    compliance,
    history: accountabilityHistory,
  } = buildAccountability()
  const { cases, milestones, transformations } = buildPrivatization()
  const workflow = buildWorkflow()
  const phase12 = buildPhase12Intelligence({
    organizations,
    assets,
    boardMembers: boards,
    submissions: workflow.submissions,
  })
  const escalations = buildPhase13Oversight({
    submissions: workflow.submissions,
    clarifications: workflow.clarifications,
    tasks: workflow.tasks,
  })
  const pendingDecisions = buildPhase15Secretary({ escalations })

  // Sync finance metrics with Phase 13 submission statuses
  for (const sub of workflow.submissions) {
    if (sub.module !== 'finance') continue
    const metric = financialMetrics.find(
      (f) =>
        f.organizationId === sub.organizationId &&
        f.reportingPeriodId === sub.reportingPeriodId,
    )
    if (metric) {
      metric.status = sub.status
      metric.version = sub.version
    }
  }

  // Link major litigation to a land asset where available
  const litHeavy = litigation.find((l) => l.id.startsWith('lit-') && l.amountInvolved && l.amountInvolved >= 400_000_000)
  if (litHeavy) {
    const land = assets.find(
      (a) => a.organizationId === litHeavy.organizationId && a.assetType === ASSET_TYPE.LAND,
    )
    if (land) litHeavy.relatedAssetId = land.id
  }

  // Sync PSM FY2027 finance metric with golden-path submission status (overrides Phase 13 sync for demo script)
  const psmMetric = financialMetrics.find(
    (f) => f.organizationId === 'org-psm' && f.reportingPeriodId === 'period-fy2027',
  )
  if (psmMetric) {
    psmMetric.status = SUBMISSION_STATUS.IN_PROGRESS
    psmMetric.version = '0.8'
  }
  const psmSub = workflow.submissions.find((s) => s.id === 'sub-psm-finance-fy2027')
  if (psmSub) {
    psmSub.status = SUBMISSION_STATUS.IN_PROGRESS
    psmSub.version = '0.8'
    psmSub.completeness = 62
  }

  // Phase 14: ensure at least one certified-but-unsubmitted finance pack (missing submission rule)
  const tusdecFin = workflow.submissions.find((s) => s.id === 'sub-tusdec-finance-fy2027')
  if (tusdecFin) {
    tusdecFin.status = SUBMISSION_STATUS.CERTIFIED
    tusdecFin.completeness = 92
    tusdecFin.version = '1.0'
    const m = financialMetrics.find(
      (f) => f.organizationId === 'org-tusdec' && f.reportingPeriodId === 'period-fy2027',
    )
    if (m) {
      m.status = SUBMISSION_STATUS.CERTIFIED
      m.version = '1.0'
    }
  }

  return {
    organizations,
    relationships,
    locations,
    ownershipLines,
    contacts,
    enterpriseHistory,
    reportingPeriods: [...reportingPeriodsSeed],
    assets,
    assetHistory,
    geoFeatures: geo,
    employees,
    sanctionedPosts: posts,
    dailyWagers,
    consultants,
    boardMembers: boards,
    boardCommittees: committees,
    executives,
    governanceCalendar,
    financialMetrics,
    budgetLines,
    industrialPerformance: industrial,
    loans,
    loanRepayments,
    grants,
    guarantees,
    procurement,
    procurementAnnualPlans,
    contracts,
    auditRegisters,
    auditParas: audits,
    pacObservations,
    litigation,
    compliance,
    accountabilityHistory,
    privatizationCases: cases,
    privatizationMilestones: milestones,
    transformationInitiatives: transformations,
    financeVersions: [] as FinancialVersionSnapshot[],
    approvedFinanceKpis: [] as ApprovedFinanceKpi[],
    ...workflow,
    documents: [...workflow.documents, ...assetDocuments, ...phase12.extraDocuments].map((d) =>
      ensureDocument(d as Parameters<typeof ensureDocument>[0]),
    ),
    submissionHistory: phase12.submissionHistory,
    fieldChanges: phase12.fieldChanges,
    lineagePaths: phase12.lineagePaths,
    escalations,
    pendingDecisions,
  }
}

export type SeedDataset = ReturnType<typeof createSeedDataset>
