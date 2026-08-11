import {
  EMPLOYMENT_TYPE,
  type EmploymentType,
} from '@/constants'
import { db, getMockRuntime } from '@/mock-data'
import { paginate } from '@/mock-services/_helpers'
import type {
  Consultant,
  DailyWager,
  Employee,
  ListQuery,
  PagedResult,
  SanctionedPost,
  WorkforceSummary,
} from '@/types/domain'
import { AppError, simulateLatency, simulateMutation } from '@/utils'
import { vacancyRate } from '@/workflow/boardExpiry'
import { validateEmployee } from '@/workflow/peopleValidation'

export interface WorkforceQuery extends ListQuery {
  employmentType?: EmploymentType
  province?: string
  declarationStatus?: string
  portfolioScope?: boolean
  scopedOrganizationId?: string
}

export interface WorkforceService {
  getEmployees(query?: WorkforceQuery): Promise<PagedResult<Employee>>
  getEmployee(id: string): Promise<Employee>
  getSanctionedPosts(organizationId?: string): Promise<SanctionedPost[]>
  getDailyWagers(organizationId?: string): Promise<DailyWager[]>
  getConsultants(organizationId?: string, status?: string): Promise<Consultant[]>
  getSummary(organizationId?: string, portfolioScope?: boolean): Promise<WorkforceSummary>
  updateEmployee(id: string, patch: Partial<Employee>): Promise<Employee>
}

function filterEmployees(query?: WorkforceQuery): Employee[] {
  let items = [...db.employees]
  const scenarioFilter = getMockRuntime().scenarioFilter
  if (scenarioFilter !== 'all') {
    const orgIds = new Set(
      db.organizations.filter((o) => o.scenarioId === scenarioFilter).map((o) => o.id),
    )
    items = items.filter((e) => orgIds.has(e.organizationId))
  }
  if (!query?.portfolioScope && query?.scopedOrganizationId) {
    items = items.filter((e) => e.organizationId === query.scopedOrganizationId)
  } else if (query?.organizationId) {
    items = items.filter((e) => e.organizationId === query.organizationId)
  }
  if (query?.employmentType) {
    items = items.filter((e) => e.employmentType === query.employmentType)
  }
  if (query?.province) items = items.filter((e) => e.province === query.province)
  if (query?.declarationStatus) {
    items = items.filter((e) => e.assetDeclarationStatus === query.declarationStatus)
  }
  if (query?.search) {
    const q = query.search.toLowerCase()
    items = items.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.employeeCode.toLowerCase().includes(q) ||
        e.designation.toLowerCase().includes(q),
    )
  }
  return items
}

export const mockWorkforceService: WorkforceService = {
  async getEmployees(query) {
    return simulateLatency(paginate(filterEmployees(query), query))
  },

  async getEmployee(id) {
    const row = db.employees.find((e) => e.id === id)
    if (!row) throw new AppError('Employee not found', 'NOT_FOUND')
    return simulateLatency(row)
  },

  async getSanctionedPosts(organizationId) {
    let items = [...db.sanctionedPosts]
    if (organizationId) items = items.filter((p) => p.organizationId === organizationId)
    return simulateLatency(items)
  },

  async getDailyWagers(organizationId) {
    let items = [...db.dailyWagers]
    if (organizationId) items = items.filter((d) => d.organizationId === organizationId)
    return simulateLatency(items)
  },

  async getConsultants(organizationId, status) {
    let items = [...db.consultants]
    if (organizationId) items = items.filter((c) => c.organizationId === organizationId)
    if (status) items = items.filter((c) => c.status === status)
    return simulateLatency(items)
  },

  async getSummary(organizationId, portfolioScope) {
    const employees = filterEmployees({
      organizationId: portfolioScope ? undefined : organizationId,
      portfolioScope,
      scopedOrganizationId: portfolioScope ? undefined : organizationId,
    })
    const posts = db.sanctionedPosts.filter(
      (p) => portfolioScope || !organizationId || p.organizationId === organizationId,
    )
    const daily = db.dailyWagers.filter(
      (d) => portfolioScope || !organizationId || d.organizationId === organizationId,
    )
    const consultants = db.consultants.filter(
      (c) =>
        (portfolioScope || !organizationId || c.organizationId === organizationId) &&
        c.status !== 'completed',
    )

    const sanctioned = posts.reduce((s, p) => s + p.sanctioned, 0)
    const filled = posts.reduce((s, p) => s + p.filled, 0)
    const vacant = posts.reduce((s, p) => s + p.vacant, 0)

    const byEmploymentType: Record<string, number> = {}
    for (const t of Object.values(EMPLOYMENT_TYPE)) byEmploymentType[t] = 0
    const genderCounts: Record<string, number> = {}
    const byProvince: Record<string, number> = {}
    let disabilityCount = 0

    for (const e of employees) {
      byEmploymentType[e.employmentType] = (byEmploymentType[e.employmentType] ?? 0) + 1
      if (e.gender) genderCounts[e.gender] = (genderCounts[e.gender] ?? 0) + 1
      if (e.province) byProvince[e.province] = (byProvince[e.province] ?? 0) + 1
      if (e.disabilityFlag) disabilityCount += 1
    }

    return simulateLatency({
      organizationId,
      sanctioned,
      filled,
      vacant,
      vacancyRatePct: vacancyRate(sanctioned, vacant),
      byEmploymentType,
      genderCounts,
      disabilityCount,
      byProvince,
      dailyWagerCount: daily.length,
      consultantActiveCount: consultants.length,
    })
  },

  async updateEmployee(id, patch) {
    const idx = db.employees.findIndex((e) => e.id === id)
    if (idx < 0) throw new AppError('Employee not found', 'NOT_FOUND')
    const next = { ...db.employees[idx], ...patch, id }
    const errors = validateEmployee(next).filter((i) => i.severity === 'error')
    if (errors.length) throw new AppError(errors.map((i) => i.message).join(' '), 'VALIDATION')
    db.employees[idx] = next
    return simulateMutation(next)
  },
}

export function stripSensitiveEmployee(
  emp: Employee,
  opts: { personal: boolean; remuneration: boolean },
): Employee {
  return {
    ...emp,
    cnic: opts.personal ? emp.cnic : undefined,
    salaryPkr: opts.remuneration ? emp.salaryPkr : undefined,
    disciplinaryOpenCases: opts.personal ? emp.disciplinaryOpenCases : undefined,
  }
}
