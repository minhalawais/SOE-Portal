import {
  OWNERSHIP_BAND,
  SHAREHOLDER_CATEGORY,
  type OwnershipBand,
  type RelationshipType,
  type SoeStatus,
} from '@/constants'
import { db, getMockRuntime } from '@/mock-data'
import { deriveOrganizationMetrics } from '@/mock-data/derived'
import { paginate, sortByKey } from '@/mock-services/_helpers'
import type {
  EnterpriseHistoryEvent,
  HierarchyNode,
  ListQuery,
  Organization,
  OrganizationContact,
  OrganizationLocation,
  OrganizationRelationship,
  OwnershipLine,
  PagedResult,
  RegistryRow,
  SubsidiaryDetail,
} from '@/types/domain'
import { AppError, simulateLatency, simulateMutation } from '@/utils'
import {
  governmentShareFromLines,
  validateEnterpriseProfile,
  validateOwnershipLines,
} from '@/workflow/enterpriseValidation'

export interface RegistryQuery extends ListQuery {
  sector?: string
  subSector?: string
  status?: SoeStatus
  legalStatus?: string
  ownershipBand?: OwnershipBand
  relationshipType?: RelationshipType
  /** When set without portfolio scope, limits results to this org */
  scopedOrganizationId?: string
  portfolioScope?: boolean
  reportingPeriodId?: string
}

export interface OrganizationService {
  getOrganizations(query?: ListQuery): Promise<PagedResult<Organization>>
  getRegistry(query?: RegistryQuery): Promise<PagedResult<RegistryRow>>
  getOrganization(id: string): Promise<Organization>
  updateOrganization(id: string, patch: Partial<Organization>): Promise<Organization>
  getRelationships(organizationId?: string): Promise<OrganizationRelationship[]>
  updateRelationships(
    organizationId: string,
    relationships: OrganizationRelationship[],
  ): Promise<OrganizationRelationship[]>
  getLocations(organizationId?: string): Promise<OrganizationLocation[]>
  updateLocations(
    organizationId: string,
    locations: OrganizationLocation[],
  ): Promise<OrganizationLocation[]>
  getOwnershipLines(organizationId: string): Promise<OwnershipLine[]>
  updateOwnershipLines(
    organizationId: string,
    lines: OwnershipLine[],
  ): Promise<{ lines: OwnershipLine[]; warnings: string[] }>
  getContacts(organizationId: string): Promise<OrganizationContact[]>
  updateContacts(
    organizationId: string,
    contacts: OrganizationContact[],
  ): Promise<OrganizationContact[]>
  getHistory(organizationId: string): Promise<EnterpriseHistoryEvent[]>
  getHierarchy(organizationId: string): Promise<HierarchyNode>
  getSubsidiaryDetail(
    parentOrganizationId: string,
    relatedOrganizationId: string,
  ): Promise<SubsidiaryDetail>
  getDerivedMetrics(
    organizationId: string,
    reportingPeriodId?: string,
  ): Promise<ReturnType<typeof deriveOrganizationMetrics>>
  validateProfile(org: Partial<Organization>): ReturnType<typeof validateEnterpriseProfile>
}

function ownershipBandOf(pct: number): OwnershipBand {
  if (pct >= 99.5) return OWNERSHIP_BAND.WHOLLY
  if (pct >= 50) return OWNERSHIP_BAND.MAJORITY
  if (pct > 0) return OWNERSHIP_BAND.MINORITY
  return OWNERSHIP_BAND.NONE
}

function applyOrgQuery(items: Organization[], query?: ListQuery): Organization[] {
  let filtered = items
  const scenarioFilter = getMockRuntime().scenarioFilter
  if (scenarioFilter !== 'all') {
    filtered = filtered.filter((o) => o.scenarioId === scenarioFilter)
  }
  if (query?.search) {
    const q = query.search.toLowerCase()
    filtered = filtered.filter(
      (o) =>
        o.name.toLowerCase().includes(q) ||
        o.abbreviation.toLowerCase().includes(q) ||
        o.sector.toLowerCase().includes(q),
    )
  }
  if (query?.organizationId) {
    filtered = filtered.filter((o) => o.id === query.organizationId)
  }
  return filtered
}

function reportingStatusFor(
  organizationId: string,
  reportingPeriodId?: string,
): RegistryRow['reportingStatus'] {
  const periodId = reportingPeriodId ?? 'period-fy2027'
  const sub = db.submissions.find(
    (s) =>
      s.organizationId === organizationId &&
      s.reportingPeriodId === periodId &&
      s.module === 'finance',
  )
  return sub?.status ?? 'not_started'
}

function buildHierarchyNode(
  organizationId: string,
  relationshipType?: RelationshipType,
  ownershipPercentage?: number,
  visited = new Set<string>(),
): HierarchyNode {
  if (visited.has(organizationId)) {
    const org = db.organizations.find((o) => o.id === organizationId)!
    return {
      organizationId,
      name: org?.name ?? organizationId,
      abbreviation: org?.abbreviation ?? '—',
      relationshipType,
      ownershipPercentage,
      status: org?.status ?? 'active',
      children: [],
    }
  }
  visited.add(organizationId)
  const org = db.organizations.find((o) => o.id === organizationId)
  if (!org) {
    throw new AppError('Organization not found', 'NOT_FOUND')
  }
  const childRels = db.relationships.filter((r) => r.parentOrganizationId === organizationId)
  return {
    organizationId: org.id,
    name: org.name,
    abbreviation: org.abbreviation,
    relationshipType,
    ownershipPercentage,
    status: org.status,
    children: childRels.map((r) =>
      buildHierarchyNode(
        r.relatedOrganizationId,
        r.relationshipType,
        r.ownershipPercentage,
        new Set(visited),
      ),
    ),
  }
}

export const mockOrganizationService: OrganizationService = {
  async getOrganizations(query) {
    const filtered = applyOrgQuery(db.organizations, query)
    return simulateLatency(paginate(filtered, query))
  },

  async getRegistry(query) {
    let orgs = applyOrgQuery(db.organizations, query)
    if (!query?.portfolioScope && query?.scopedOrganizationId) {
      orgs = orgs.filter((o) => o.id === query.scopedOrganizationId)
    }
    if (query?.sector) orgs = orgs.filter((o) => o.sector === query.sector)
    if (query?.subSector) orgs = orgs.filter((o) => o.subSector === query.subSector)
    if (query?.status) orgs = orgs.filter((o) => o.status === query.status)
    if (query?.legalStatus) orgs = orgs.filter((o) => o.legalStatus === query.legalStatus)
    if (query?.ownershipBand) {
      orgs = orgs.filter((o) => ownershipBandOf(o.governmentOwnershipPct) === query.ownershipBand)
    }
    if (query?.relationshipType) {
      const ids = new Set(
        db.relationships
          .filter((r) => r.relationshipType === query.relationshipType)
          .flatMap((r) => [r.parentOrganizationId, r.relatedOrganizationId]),
      )
      orgs = orgs.filter((o) => ids.has(o.id))
    }

    const sorted = sortByKey(
      orgs as unknown as Array<Record<string, unknown>>,
      query?.sortBy ?? 'name',
      query?.sortDir ?? 'asc',
    ) as unknown as Organization[]

    const rows: RegistryRow[] = sorted.map((organization) => ({
      organization,
      headOffice: organization.headOfficeAddress,
      parentAdministrative: organization.administrativeMinistry ?? organization.parentMinistry,
      reportingStatus: reportingStatusFor(organization.id, query?.reportingPeriodId),
    }))

    return simulateLatency(paginate(rows, query))
  },

  async getOrganization(id) {
    const org = db.organizations.find((o) => o.id === id)
    if (!org) throw new AppError('Organization not found', 'NOT_FOUND')
    return simulateLatency(org)
  },

  async updateOrganization(id, patch) {
    const idx = db.organizations.findIndex((o) => o.id === id)
    if (idx < 0) throw new AppError('Organization not found', 'NOT_FOUND')
    const previous = db.organizations[idx]
    const next = { ...previous, ...patch, id }
    const issues = validateEnterpriseProfile(next).filter((i) => i.severity === 'error')
    if (issues.length) {
      throw new AppError(issues.map((i) => i.message).join(' '), 'VALIDATION')
    }
    db.organizations[idx] = next

    if (patch.name && patch.name !== previous.name) {
      db.enterpriseHistory.unshift({
        id: `eh-${id}-${Date.now()}`,
        organizationId: id,
        eventType: 'enterprise_renamed',
        occurredAt: new Date().toISOString().slice(0, 10),
        summary: `Enterprise renamed to ${patch.name}`,
        previousValue: previous.name,
        newValue: patch.name,
        actorLabel: 'SOE editor',
      })
    } else if (patch.status && patch.status !== previous.status) {
      db.enterpriseHistory.unshift({
        id: `eh-${id}-${Date.now()}`,
        organizationId: id,
        eventType: 'enterprise_status_changed',
        occurredAt: new Date().toISOString().slice(0, 10),
        summary: `Enterprise status updated to ${patch.status}`,
        previousValue: previous.status,
        newValue: patch.status,
        actorLabel: 'SOE editor',
      })
    } else if (patch.legalStatus && patch.legalStatus !== previous.legalStatus) {
      db.enterpriseHistory.unshift({
        id: `eh-${id}-${Date.now()}`,
        organizationId: id,
        eventType: 'legal_status_changed',
        occurredAt: new Date().toISOString().slice(0, 10),
        summary: `Legal status updated to ${patch.legalStatus}`,
        previousValue: previous.legalStatus,
        newValue: patch.legalStatus,
        actorLabel: 'SOE editor',
      })
    }

    return simulateMutation(db.organizations[idx])
  },

  async getRelationships(organizationId) {
    let items = [...db.relationships]
    if (organizationId) {
      items = items.filter(
        (r) =>
          r.parentOrganizationId === organizationId ||
          r.relatedOrganizationId === organizationId,
      )
    }
    return simulateLatency(items)
  },

  async updateRelationships(organizationId, relationships) {
    const org = db.organizations.find((o) => o.id === organizationId)
    if (!org) throw new AppError('Organization not found', 'NOT_FOUND')
    for (const rel of relationships) {
      if (rel.ownershipPercentage < 0 || rel.ownershipPercentage > 100) {
        throw new AppError('Relationship ownership must be between 0 and 100', 'VALIDATION')
      }
    }
    db.relationships = [
      ...db.relationships.filter(
        (r) => r.parentOrganizationId !== organizationId && r.relatedOrganizationId !== organizationId,
      ),
      ...relationships.map((r) => ({
        ...r,
        parentOrganizationId: r.parentOrganizationId || organizationId,
      })),
    ]
    db.enterpriseHistory.unshift({
      id: `eh-rel-${organizationId}-${Date.now()}`,
      organizationId,
      eventType: 'structure_updated',
      occurredAt: new Date().toISOString().slice(0, 10),
      summary: 'Corporate structure relationships saved',
      actorLabel: 'SOE editor',
    })
    return simulateMutation(
      db.relationships.filter(
        (r) => r.parentOrganizationId === organizationId || r.relatedOrganizationId === organizationId,
      ),
    )
  },

  async getLocations(organizationId) {
    let items = [...db.locations]
    if (organizationId) items = items.filter((l) => l.organizationId === organizationId)
    return simulateLatency(items)
  },

  async updateLocations(organizationId, locations) {
    const org = db.organizations.find((o) => o.id === organizationId)
    if (!org) throw new AppError('Organization not found', 'NOT_FOUND')
    for (const loc of locations) {
      if (!loc.label || !loc.province || !loc.district) {
        throw new AppError('Location label, province and district are required', 'VALIDATION')
      }
    }
    db.locations = [
      ...db.locations.filter((l) => l.organizationId !== organizationId),
      ...locations.map((l) => ({ ...l, organizationId })),
    ]
    db.enterpriseHistory.unshift({
      id: `eh-loc-${organizationId}-${Date.now()}`,
      organizationId,
      eventType: 'locations_updated',
      occurredAt: new Date().toISOString().slice(0, 10),
      summary: 'Locations saved',
      actorLabel: 'SOE editor',
    })
    return simulateMutation(db.locations.filter((l) => l.organizationId === organizationId))
  },

  async getOwnershipLines(organizationId) {
    return simulateLatency(db.ownershipLines.filter((l) => l.organizationId === organizationId))
  },

  async updateOwnershipLines(organizationId, lines) {
    const orgIdx = db.organizations.findIndex((o) => o.id === organizationId)
    if (orgIdx < 0) throw new AppError('Organization not found', 'NOT_FOUND')

    const issues = validateOwnershipLines(lines)
    const errors = issues.filter((i) => i.severity === 'error')
    if (errors.length) {
      throw new AppError(errors.map((i) => i.message).join(' '), 'VALIDATION')
    }

    db.ownershipLines = [
      ...db.ownershipLines.filter((l) => l.organizationId !== organizationId),
      ...lines.map((l) => ({ ...l, organizationId })),
    ]

    const govPct = governmentShareFromLines(lines)
    db.organizations[orgIdx] = {
      ...db.organizations[orgIdx],
      governmentOwnershipPct: govPct,
    }

    db.enterpriseHistory.unshift({
      id: `eh-own-${organizationId}-${Date.now()}`,
      organizationId,
      eventType: 'ownership_updated',
      occurredAt: new Date().toISOString().slice(0, 10),
      summary: `Ownership composition saved (gov ${govPct}%)`,
      newValue: `${govPct}% government`,
      actorLabel: 'SOE editor',
    })

    return simulateMutation({
      lines: db.ownershipLines.filter((l) => l.organizationId === organizationId),
      warnings: issues.filter((i) => i.severity === 'warning').map((i) => i.message),
    })
  },

  async getContacts(organizationId) {
    return simulateLatency(db.contacts.filter((c) => c.organizationId === organizationId))
  },

  async updateContacts(organizationId, contacts) {
    const org = db.organizations.find((o) => o.id === organizationId)
    if (!org) throw new AppError('Organization not found', 'NOT_FOUND')
    for (const contact of contacts) {
      if (!contact.name || !contact.email || !contact.phone) {
        throw new AppError('Contact name, email and phone are required', 'VALIDATION')
      }
    }
    db.contacts = [
      ...db.contacts.filter((c) => c.organizationId !== organizationId),
      ...contacts.map((c) => ({ ...c, organizationId })),
    ]
    db.enterpriseHistory.unshift({
      id: `eh-contact-${organizationId}-${Date.now()}`,
      organizationId,
      eventType: 'contacts_updated',
      occurredAt: new Date().toISOString().slice(0, 10),
      summary: 'Contacts saved',
      actorLabel: 'SOE editor',
    })
    return simulateMutation(db.contacts.filter((c) => c.organizationId === organizationId))
  },

  async getHistory(organizationId) {
    const items = db.enterpriseHistory
      .filter((e) => e.organizationId === organizationId)
      .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
    return simulateLatency(items)
  },

  async getHierarchy(organizationId) {
    return simulateLatency(buildHierarchyNode(organizationId))
  },

  async getSubsidiaryDetail(parentOrganizationId, relatedOrganizationId) {
    const relationship = db.relationships.find(
      (r) =>
        r.parentOrganizationId === parentOrganizationId &&
        r.relatedOrganizationId === relatedOrganizationId,
    )
    if (!relationship) throw new AppError('Relationship not found', 'NOT_FOUND')
    const organization = db.organizations.find((o) => o.id === relatedOrganizationId)
    if (!organization) throw new AppError('Related organization not found', 'NOT_FOUND')

    const metrics = db.financialMetrics
      .filter((f) => f.organizationId === relatedOrganizationId)
      .sort((a, b) => b.reportingPeriodId.localeCompare(a.reportingPeriodId))[0]
    const industrial = db.industrialPerformance.find(
      (i) => i.organizationId === relatedOrganizationId,
    )
    const boards = db.boardMembers.filter((b) => b.organizationId === relatedOrganizationId)
    const assets = db.assets.filter((a) => a.organizationId === relatedOrganizationId)
    const bookValueTotal = assets.reduce((s, a) => s + (a.bookValue ?? 0), 0)

    const detail: SubsidiaryDetail = {
      organization,
      relationship,
      performanceSnapshot: {
        revenue: metrics?.revenue,
        netProfit: metrics?.profitOrLoss,
        capacityUtilization: industrial?.capacityUtilization,
      },
      financialStatementAvailable: Boolean(metrics),
      boardMemberCount: boards.length,
      boardVacancyCount: Math.max(0, 7 - boards.length),
      assetsSummary: { count: assets.length, bookValueTotal },
      liabilitiesNote: 'Detailed liabilities available in Financial module (later periods).',
    }
    return simulateLatency(detail)
  },

  async getDerivedMetrics(organizationId, reportingPeriodId) {
    return simulateLatency(deriveOrganizationMetrics(organizationId, reportingPeriodId))
  },

  validateProfile(org) {
    return validateEnterpriseProfile(org)
  },
}

/** Convenience: composition totals for UI bars */
export function ownershipComposition(lines: OwnershipLine[]) {
  const buckets = Object.values(SHAREHOLDER_CATEGORY).map((category) => ({
    category,
    percentage: lines
      .filter((l) => l.category === category)
      .reduce((s, l) => s + l.percentage, 0),
  }))
  return buckets.filter((b) => b.percentage > 0)
}

export function resolveOwnershipBand(pct: number): OwnershipBand {
  return ownershipBandOf(pct)
}
