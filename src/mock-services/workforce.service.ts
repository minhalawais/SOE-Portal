import {
  DEMO_AS_OF_DATE,
  EMPLOYMENT_TYPE,
  MODULE,
  ROLE,
  WORKFORCE_STATUS,
  type EmploymentType,
} from '@/constants'
import { db, getMockRuntime } from '@/mock-data'
import { paginate } from '@/mock-services/_helpers'
import type {
  Consultant,
  ContinuousRegisterEvent,
  ContinuousRegisterSummary,
  DailyWager,
  Employee,
  ListQuery,
  PagedResult,
  SanctionedPost,
  WorkforceSummary,
} from '@/types/domain'
import { AppError, simulateLatency, simulateMutation } from '@/utils'
import { vacancyRate } from '@/workflow/boardExpiry'
import {
  validateConsultant,
  validateDailyWager,
  validateEmployee,
} from '@/workflow/peopleValidation'

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
  getSanctionedPost(id: string): Promise<SanctionedPost>
  createSanctionedPost(payload: Omit<SanctionedPost, 'id' | 'vacant'> & { id?: string }): Promise<SanctionedPost>
  updateSanctionedPost(id: string, patch: Partial<SanctionedPost>): Promise<SanctionedPost>
  getDailyWagers(organizationId?: string): Promise<DailyWager[]>
  getConsultants(organizationId?: string, status?: string): Promise<Consultant[]>
  getSummary(organizationId?: string, portfolioScope?: boolean): Promise<WorkforceSummary>
  createEmployee(payload: Omit<Employee, 'id'> & { id?: string }): Promise<Employee>
  updateEmployee(id: string, patch: Partial<Employee>): Promise<Employee>
  getDailyWager(id: string): Promise<DailyWager>
  createDailyWager(payload: Omit<DailyWager, 'id'> & { id?: string }): Promise<DailyWager>
  updateDailyWager(id: string, patch: Partial<DailyWager>): Promise<DailyWager>
  getConsultant(id: string): Promise<Consultant>
  createConsultant(payload: Omit<Consultant, 'id'> & { id?: string }): Promise<Consultant>
  updateConsultant(id: string, patch: Partial<Consultant>): Promise<Consultant>
  getContinuousSummary(organizationId?: string, portfolioScope?: boolean): Promise<ContinuousRegisterSummary>
  getEmployeeEvents(employeeId: string): Promise<ContinuousRegisterEvent[]>
}

const workforceEvents = new Map<string, ContinuousRegisterEvent[]>()

function eventDate(offsetDays: number) {
  const date = new Date(`${DEMO_AS_OF_DATE}T00:00:00.000Z`)
  date.setUTCDate(date.getUTCDate() + offsetDays)
  return date.toISOString().slice(0, 10)
}

function daysBetween(from: string | undefined, to = DEMO_AS_OF_DATE) {
  if (!from) return 999
  const start = Date.parse(from)
  const end = Date.parse(to)
  if (Number.isNaN(start) || Number.isNaN(end)) return 999
  return Math.floor((end - start) / 86_400_000)
}

function employeeMetadata(
  row: Employee,
  override?: Partial<Employee>,
): Pick<Employee, 'effectiveFrom' | 'lastChangedAt' | 'lastSubmittedAt' | 'lastVerifiedAt' | 'assuranceState' | 'version'> {
  const version = override?.version ?? ((row.version ?? 1) + (override ? 1 : 0))
  const changedAt = override?.lastChangedAt ?? row.lastChangedAt ?? eventDate(-Math.max(1, version * 2))
  const submittedAt = override?.lastSubmittedAt ?? row.lastSubmittedAt ?? changedAt
  return {
    effectiveFrom: override?.effectiveFrom ?? row.effectiveFrom ?? row.joiningDate ?? changedAt,
    lastChangedAt: changedAt,
    lastSubmittedAt: submittedAt,
    lastVerifiedAt: override?.lastVerifiedAt ?? row.lastVerifiedAt,
    assuranceState: override?.assuranceState ?? row.assuranceState ?? 'submitted',
    version,
  }
}

function employeeStatus(employee: Employee) {
  return employee.status ?? WORKFORCE_STATUS.ACTIVE
}

function isCurrentWorkforce(employee: Employee) {
  const status = employeeStatus(employee)
  return (
    status === WORKFORCE_STATUS.ACTIVE ||
    status === WORKFORCE_STATUS.ON_DEPUTATION ||
    status === WORKFORCE_STATUS.ON_LEAVE
  )
}

function ensureEmployeeEvents(employee: Employee) {
  const existing = workforceEvents.get(employee.id)
  if (existing && existing[0]?.occurredAt === (employee.lastChangedAt ?? employee.joiningDate)) {
    return existing
  }
  const baseDate = employee.joiningDate ?? eventDate(-45)
  const events: ContinuousRegisterEvent[] = [
    {
      id: `wf-${employee.id}-created`,
      recordId: employee.id,
      organizationId: employee.organizationId,
      moduleId: MODULE.WORKFORCE,
      occurredAt: baseDate,
      effectiveAt: employee.effectiveFrom ?? baseDate,
      actorRole: ROLE.HR_OFFICER,
      actorName: 'SOE HR Officer',
      eventType: 'employment_record_created',
      title: 'Employee record opened',
      detail: `${employee.designation} recorded as ${employeeStatus(employee).replaceAll('_', ' ')} in the live workforce register.`,
      assuranceState: employee.assuranceState ?? 'submitted',
      isMaterial: true,
      isDummyDemonstrationData: true,
    },
  ]
  if (employee.lastVerifiedAt) {
    events.unshift({
      id: `wf-${employee.id}-verified`,
      recordId: employee.id,
      organizationId: employee.organizationId,
      moduleId: MODULE.WORKFORCE,
      occurredAt: employee.lastVerifiedAt,
      effectiveAt: employee.lastVerifiedAt,
      actorRole: ROLE.SOE_CERTIFIER,
      actorName: 'SOE Reviewer',
      eventType: 'soe_verified',
      title: 'SOE reviewer verified workforce change',
      assuranceState: employee.assuranceState ?? 'soe_verified',
      isDummyDemonstrationData: true,
    })
  }
  workforceEvents.set(employee.id, events)
  return events
}

function appendEmployeeEvent(employee: Employee, title: string, detail?: string) {
  const events = ensureEmployeeEvents(employee)
  events.unshift({
    id: `wf-${employee.id}-${Date.now()}`,
    recordId: employee.id,
    organizationId: employee.organizationId,
    moduleId: MODULE.WORKFORCE,
    occurredAt: employee.lastChangedAt ?? DEMO_AS_OF_DATE,
    effectiveAt: employee.effectiveFrom ?? employee.lastChangedAt,
    actorRole: ROLE.HR_OFFICER,
    actorName: 'SOE HR Officer',
    eventType: 'workforce_change',
    title,
    detail,
    assuranceState: employee.assuranceState ?? 'submitted',
    isMaterial: true,
    isDummyDemonstrationData: true,
  })
}

function hydrateEmployee(employee: Employee, index = 0): Employee {
  return {
    ...employee,
    status: employee.status ?? WORKFORCE_STATUS.ACTIVE,
    statusEffectiveDate: employee.statusEffectiveDate ?? employee.joiningDate ?? employee.effectiveFrom,
    ...employeeMetadata(employee, {
      lastChangedAt: employee.lastChangedAt ?? eventDate(-((index % 9) + 2)),
      lastSubmittedAt: employee.lastSubmittedAt ?? eventDate(-((index % 9) + 1)),
      lastVerifiedAt:
        employee.lastVerifiedAt ?? (index % 4 === 0 ? undefined : eventDate(-Math.max(1, index % 7))),
      assuranceState:
        employee.assuranceState ??
        (index % 6 === 0 ? 'clarification_open' : index % 4 === 0 ? 'submitted' : 'soe_verified'),
      version: employee.version ?? 1,
    }),
  }
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

function pensionRatioForOrg(organizationId: string): number {
  let hash = 0
  for (let i = 0; i < organizationId.length; i += 1) {
    hash = (hash * 31 + organizationId.charCodeAt(i)) | 0
  }
  return 0.14 + (Math.abs(hash) % 18) / 100
}

function pensionersForPosts(posts: SanctionedPost[]): number {
  const filledByOrg = new Map<string, number>()
  for (const post of posts) {
    filledByOrg.set(post.organizationId, (filledByOrg.get(post.organizationId) ?? 0) + post.filled)
  }
  return [...filledByOrg.entries()].reduce(
    (sum, [organizationId, filled]) =>
      sum + Math.round(filled * pensionRatioForOrg(organizationId)),
    0,
  )
}

export const mockWorkforceService: WorkforceService = {
  async getEmployees(query) {
    return simulateLatency(
      paginate(
        filterEmployees(query).map((employee, index) => hydrateEmployee(employee, index)),
        query,
      ),
    )
  },

  async getEmployee(id) {
    const row = db.employees.find((e) => e.id === id)
    if (!row) throw new AppError('Employee not found', 'NOT_FOUND')
    const hydrated = {
      ...row,
      status: row.status ?? WORKFORCE_STATUS.ACTIVE,
      statusEffectiveDate: row.statusEffectiveDate ?? row.joiningDate ?? row.effectiveFrom,
      ...employeeMetadata(row, { version: row.version ?? 1 }),
    }
    ensureEmployeeEvents(hydrated)
    return simulateLatency(hydrated)
  },

  async getSanctionedPosts(organizationId) {
    let items = [...db.sanctionedPosts]
    if (organizationId) items = items.filter((p) => p.organizationId === organizationId)
    return simulateLatency(items)
  },

  async getSanctionedPost(id) {
    const row = db.sanctionedPosts.find((p) => p.id === id)
    if (!row) throw new AppError('Sanctioned post not found', 'NOT_FOUND')
    return simulateLatency(row)
  },

  async createSanctionedPost(payload) {
    const id = payload.id ?? `post-new-${Date.now()}`
    if (!payload.designation?.trim()) throw new AppError('Designation is required', 'VALIDATION')
    if (payload.sanctioned < 0 || payload.filled < 0) {
      throw new AppError('Sanctioned and filled counts cannot be negative', 'VALIDATION')
    }
    if (payload.filled > payload.sanctioned) {
      throw new AppError('Filled cannot exceed sanctioned', 'VALIDATION')
    }
    const next: SanctionedPost = {
      ...payload,
      id,
      vacant: payload.sanctioned - payload.filled,
    }
    db.sanctionedPosts.push(next)
    return simulateMutation(next)
  },

  async updateSanctionedPost(id, patch) {
    const idx = db.sanctionedPosts.findIndex((p) => p.id === id)
    if (idx < 0) throw new AppError('Sanctioned post not found', 'NOT_FOUND')
    const current = db.sanctionedPosts[idx]
    const sanctioned = patch.sanctioned ?? current.sanctioned
    const filled = patch.filled ?? current.filled
    if (sanctioned < 0 || filled < 0) {
      throw new AppError('Sanctioned and filled counts cannot be negative', 'VALIDATION')
    }
    if (filled > sanctioned) {
      throw new AppError('Filled cannot exceed sanctioned', 'VALIDATION')
    }
    db.sanctionedPosts[idx] = {
      ...current,
      ...patch,
      id,
      vacant: sanctioned - filled,
    }
    return simulateMutation(db.sanctionedPosts[idx])
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
      pensionersCount: pensionersForPosts(posts),
    })
  },

  async createEmployee(payload) {
    const id = payload.id ?? `emp-new-${Date.now()}`
    const org = db.organizations.find((o) => o.id === payload.organizationId)
    const codePrefix = org?.abbreviation ?? 'SOE'
    const employeeCode =
      payload.employeeCode?.trim() ||
      `${codePrefix}-E${String(db.employees.filter((e) => e.organizationId === payload.organizationId).length + 1).padStart(4, '0')}`
    const next: Employee = {
      ...payload,
      id,
      employeeCode,
      status: payload.status ?? WORKFORCE_STATUS.ACTIVE,
      statusEffectiveDate: payload.statusEffectiveDate ?? payload.joiningDate ?? DEMO_AS_OF_DATE,
      ...employeeMetadata(payload as Employee, {
        lastChangedAt: DEMO_AS_OF_DATE,
        lastSubmittedAt: DEMO_AS_OF_DATE,
        assuranceState: 'submitted',
        version: 1,
      }),
      isDummyDemonstrationData: true,
    }
    const errors = validateEmployee(next).filter((i) => i.severity === 'error')
    if (errors.length) throw new AppError(errors.map((i) => i.message).join(' '), 'VALIDATION')
    db.employees.push(next)
    appendEmployeeEvent(next, 'Workforce record submitted', 'New workforce record submitted for SOE review.')
    return simulateMutation(next)
  },

  async updateEmployee(id, patch) {
    const idx = db.employees.findIndex((e) => e.id === id)
    if (idx < 0) throw new AppError('Employee not found', 'NOT_FOUND')
    const current = db.employees[idx]
    const statusChanged = patch.status !== undefined && patch.status !== current.status
    const next = {
      ...current,
      ...patch,
      id,
      status: patch.status ?? current.status ?? WORKFORCE_STATUS.ACTIVE,
      statusEffectiveDate:
        patch.statusEffectiveDate ??
        (statusChanged ? DEMO_AS_OF_DATE : current.statusEffectiveDate ?? current.joiningDate),
      ...employeeMetadata(current, {
        ...patch,
        lastChangedAt: DEMO_AS_OF_DATE,
        lastSubmittedAt: DEMO_AS_OF_DATE,
        assuranceState: 'submitted',
      }),
    }
    const errors = validateEmployee(next).filter((i) => i.severity === 'error')
    if (errors.length) throw new AppError(errors.map((i) => i.message).join(' '), 'VALIDATION')
    db.employees[idx] = next
    appendEmployeeEvent(
      next,
      statusChanged ? 'Workforce status change submitted' : 'Workforce change submitted',
      statusChanged
        ? `Status changed to ${employeeStatus(next).replaceAll('_', ' ')} effective ${next.statusEffectiveDate ?? DEMO_AS_OF_DATE}.`
        : 'Effective-dated change is awaiting SOE reviewer verification.',
    )
    return simulateMutation(next)
  },

  async getDailyWager(id) {
    const row = db.dailyWagers.find((d) => d.id === id)
    if (!row) throw new AppError('Daily wager not found', 'NOT_FOUND')
    return simulateLatency(row)
  },

  async createDailyWager(payload) {
    const id = payload.id ?? `dw-new-${Date.now()}`
    const next: DailyWager = { ...payload, id, isDummyDemonstrationData: true }
    const errors = validateDailyWager(next).filter((i) => i.severity === 'error')
    if (errors.length) throw new AppError(errors.map((i) => i.message).join(' '), 'VALIDATION')
    db.dailyWagers.push(next)
    return simulateMutation(next)
  },

  async updateDailyWager(id, patch) {
    const idx = db.dailyWagers.findIndex((d) => d.id === id)
    if (idx < 0) throw new AppError('Daily wager not found', 'NOT_FOUND')
    const next = { ...db.dailyWagers[idx], ...patch, id }
    const errors = validateDailyWager(next).filter((i) => i.severity === 'error')
    if (errors.length) throw new AppError(errors.map((i) => i.message).join(' '), 'VALIDATION')
    db.dailyWagers[idx] = next
    return simulateMutation(next)
  },

  async getConsultant(id) {
    const row = db.consultants.find((c) => c.id === id)
    if (!row) throw new AppError('Consultant not found', 'NOT_FOUND')
    return simulateLatency(row)
  },

  async createConsultant(payload) {
    const id = payload.id ?? `con-new-${Date.now()}`
    const next: Consultant = { ...payload, id, isDummyDemonstrationData: true }
    const errors = validateConsultant(next).filter((i) => i.severity === 'error')
    if (errors.length) throw new AppError(errors.map((i) => i.message).join(' '), 'VALIDATION')
    db.consultants.push(next)
    return simulateMutation(next)
  },

  async updateConsultant(id, patch) {
    const idx = db.consultants.findIndex((c) => c.id === id)
    if (idx < 0) throw new AppError('Consultant not found', 'NOT_FOUND')
    const next = { ...db.consultants[idx], ...patch, id }
    const errors = validateConsultant(next).filter((i) => i.severity === 'error')
    if (errors.length) throw new AppError(errors.map((i) => i.message).join(' '), 'VALIDATION')
    db.consultants[idx] = next
    return simulateMutation(next)
  },

  async getContinuousSummary(organizationId, portfolioScope) {
    const employees = filterEmployees({
      organizationId: portfolioScope ? undefined : organizationId,
      portfolioScope,
      scopedOrganizationId: portfolioScope ? undefined : organizationId,
    }).map((employee, index) => hydrateEmployee(employee, index))
    const currentEmployees = employees.filter(isCurrentWorkforce)
    const pendingSoeReview = employees.filter((e) => e.assuranceState === 'submitted').length
    const clarificationOpen = employees.filter((e) => e.assuranceState === 'clarification_open').length
    const staleRecords = employees.filter((e) => daysBetween(e.lastSubmittedAt) > 30 && e.assuranceState !== 'soe_verified').length
    const materialChanges30d = employees.filter((e) => daysBetween(e.lastChangedAt) <= 30).length
    const lastVerifiedAt = employees
      .map((e) => e.lastVerifiedAt)
      .filter(Boolean)
      .sort()
      .at(-1)
    return simulateLatency({
      moduleId: MODULE.WORKFORCE,
      cadence: 'continuous',
      activeRecords: currentEmployees.length,
      pendingSoeReview,
      pendingMoipAcknowledgement: 0,
      clarificationOpen,
      staleRecords,
      materialChanges30d,
      dueSoon: db.consultants.filter(
        (c) =>
          (portfolioScope || !organizationId || c.organizationId === organizationId) &&
          c.contractEnd <= eventDate(30),
      ).length,
      lastVerifiedAt,
      snapshotPeriodLabel: 'FY2027 certified snapshot generated from live register',
      asOfDate: DEMO_AS_OF_DATE,
    })
  },

  async getEmployeeEvents(employeeId) {
    const row = db.employees.find((e) => e.id === employeeId)
    if (!row) throw new AppError('Employee not found', 'NOT_FOUND')
    return simulateLatency(ensureEmployeeEvents(hydrateEmployee(row)))
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
