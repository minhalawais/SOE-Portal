import {
  BOARD_MEMBER_STATUS,
  DECLARATION_STATUS,
  DEMO_AS_OF_DATE,
  DIRECTOR_TYPE,
} from '@/constants'
import { db, getMockRuntime } from '@/mock-data'
import { paginate } from '@/mock-services/_helpers'
import type {
  BoardCommittee,
  BoardMember,
  BoardSummary,
  Executive,
  GovernanceCalendarEvent,
  ListQuery,
  PagedResult,
} from '@/types/domain'
import { AppError, simulateLatency, simulateMutation } from '@/utils'
import { daysUntil, resolveBoardExpiryBand } from '@/workflow/boardExpiry'

export interface BoardQuery extends ListQuery {
  directorType?: string
  expiryBand?: string
  declarationMissing?: boolean
  portfolioScope?: boolean
  scopedOrganizationId?: string
}

export interface BoardService {
  /** Legacy: returns full array for an organization */
  getBoardMembers(organizationId?: string): Promise<BoardMember[]>
  listBoardMembers(query?: BoardQuery): Promise<PagedResult<BoardMember>>
  getBoardMember(id: string): Promise<BoardMember>
  getCommittees(organizationId?: string): Promise<BoardCommittee[]>
  getExecutives(organizationId?: string): Promise<Executive[]>
  getExecutive(id: string): Promise<Executive>
  createExecutive(payload: Omit<Executive, 'id'> & { id?: string }): Promise<Executive>
  updateExecutive(id: string, patch: Partial<Executive>): Promise<Executive>
  getBoardSummary(organizationId?: string, portfolioScope?: boolean): Promise<BoardSummary>
  getCalendar(
    organizationId?: string,
    view?: 'upcoming' | 'overdue' | 'all',
  ): Promise<GovernanceCalendarEvent[]>
  getCalendarEvent(id: string): Promise<GovernanceCalendarEvent>
  createCalendarEvent(
    payload: Omit<GovernanceCalendarEvent, 'id'> & { id?: string },
  ): Promise<GovernanceCalendarEvent>
  updateCalendarEvent(
    id: string,
    patch: Partial<GovernanceCalendarEvent>,
  ): Promise<GovernanceCalendarEvent>
  createBoardMember(payload: Omit<BoardMember, 'id'> & { id?: string }): Promise<BoardMember>
  updateBoardMember(id: string, patch: Partial<BoardMember>): Promise<BoardMember>
}

function filterBoard(query?: BoardQuery): BoardMember[] {
  let items = db.boardMembers.map(hydrateBoardMember)
  const scenarioFilter = getMockRuntime().scenarioFilter
  if (scenarioFilter !== 'all') {
    const orgIds = new Set(
      db.organizations.filter((o) => o.scenarioId === scenarioFilter).map((o) => o.id),
    )
    items = items.filter((b) => orgIds.has(b.organizationId))
  }
  if (!query?.portfolioScope && query?.scopedOrganizationId) {
    items = items.filter((b) => b.organizationId === query.scopedOrganizationId)
  } else if (query?.organizationId) {
    items = items.filter((b) => b.organizationId === query.organizationId)
  }
  if (query?.directorType) items = items.filter((b) => b.memberType === query.directorType)
  if (query?.declarationMissing) {
    items = items.filter(
      (b) =>
        b.conflictDeclarationStatus === DECLARATION_STATUS.OVERDUE ||
        b.conflictDeclarationStatus === DECLARATION_STATUS.PENDING ||
        b.assetDeclarationStatus === DECLARATION_STATUS.OVERDUE ||
        b.assetDeclarationStatus === DECLARATION_STATUS.PENDING,
    )
  }
  if (query?.expiryBand) {
    items = items.filter(
      (b) =>
        resolveBoardExpiryBand({
          isVacancySlot: b.isVacancySlot,
          expiryDate: b.expiryDate,
        }) === query.expiryBand,
    )
  }
  if (query?.search) {
    const q = query.search.toLowerCase()
    items = items.filter((b) => b.name.toLowerCase().includes(q))
  }
  return items
}

function hydrateBoardMember(member: BoardMember): BoardMember {
  const isPastExpiry =
    !member.isVacancySlot && daysUntil(member.expiryDate, DEMO_AS_OF_DATE) < 0
  const seededStatus =
    member.status ??
    (member.isVacancySlot
      ? BOARD_MEMBER_STATUS.VACANT
      : isPastExpiry
        ? BOARD_MEMBER_STATUS.EXPIRED
        : BOARD_MEMBER_STATUS.ACTIVE)
  const status =
    seededStatus === BOARD_MEMBER_STATUS.ACTIVE && isPastExpiry
      ? BOARD_MEMBER_STATUS.EXPIRED
      : seededStatus
  return {
    ...member,
    status,
    statusEffectiveDate:
      member.statusEffectiveDate ??
      (status === BOARD_MEMBER_STATUS.ACTIVE
        ? member.appointmentDate
        : status === BOARD_MEMBER_STATUS.EXPIRED
          ? member.expiryDate
          : DEMO_AS_OF_DATE),
  }
}

function isActiveBoardMember(member: BoardMember) {
  return (
    !member.isVacancySlot &&
    member.status !== BOARD_MEMBER_STATUS.EXPIRED &&
    member.status !== BOARD_MEMBER_STATUS.RESIGNED &&
    member.status !== BOARD_MEMBER_STATUS.REMOVED &&
    member.status !== BOARD_MEMBER_STATUS.DECEASED &&
    member.status !== BOARD_MEMBER_STATUS.SUPERSEDED
  )
}

function summarizeBoard(items: BoardMember[], organizationId?: string): BoardSummary {
  const hydrated = items.map(hydrateBoardMember)
  const active = hydrated.filter(isActiveBoardMember)
  const vacancies = hydrated.filter(
    (b) =>
      b.isVacancySlot ||
      b.status === BOARD_MEMBER_STATUS.VACANT ||
      b.status === BOARD_MEMBER_STATUS.AWAITING_APPOINTMENT,
  ).length
  const expiredCount = hydrated.filter(
    (b) => !b.isVacancySlot && daysUntil(b.expiryDate, DEMO_AS_OF_DATE) < 0,
  ).length
  const upcomingExpiries = hydrated.filter((b) => {
    if (b.isVacancySlot) return false
    const d = daysUntil(b.expiryDate, DEMO_AS_OF_DATE)
    return d >= 0 && d <= 180
  }).length
  const missingDeclarations = hydrated.filter(
    (b) =>
      !b.isVacancySlot &&
      (b.conflictDeclarationStatus === DECLARATION_STATUS.OVERDUE ||
        b.conflictDeclarationStatus === DECLARATION_STATUS.PENDING ||
        b.assetDeclarationStatus === DECLARATION_STATUS.OVERDUE ||
        b.assetDeclarationStatus === DECLARATION_STATUS.PENDING),
  ).length

  const committees = db.boardCommittees.filter(
    (c) => !organizationId || c.organizationId === organizationId,
  )
  const committeeCoverage = committees.filter((c) => c.status === 'active').length

  let boardStatus: BoardSummary['boardStatus'] = 'complete'
  if (hydrated.length === 0) boardStatus = 'no_board'
  else if (vacancies > 0) boardStatus = 'vacancies'
  else if (upcomingExpiries > 0 || expiredCount > 0) boardStatus = 'expiry_risk'

  return {
    organizationId,
    boardSize: hydrated.length,
    activeMembers: active.length,
    vacancies,
    womenDirectors: hydrated.filter((b) => b.memberType === DIRECTOR_TYPE.WOMAN_DIRECTOR).length,
    independentDirectors: hydrated.filter((b) => b.memberType === DIRECTOR_TYPE.INDEPENDENT).length,
    governmentDirectors: hydrated.filter((b) => b.memberType === DIRECTOR_TYPE.GOVERNMENT).length,
    privateDirectors: hydrated.filter((b) => b.memberType === DIRECTOR_TYPE.PRIVATE).length,
    upcomingExpiries,
    expiredCount,
    missingDeclarations,
    committeeCoverage,
    boardStatus,
  }
}

export const mockBoardService: BoardService = {
  async getBoardMembers(organizationId) {
    let items = db.boardMembers.map(hydrateBoardMember)
    if (organizationId) items = items.filter((b) => b.organizationId === organizationId)
    return simulateLatency(items)
  },

  async listBoardMembers(query) {
    return simulateLatency(paginate(filterBoard(query), query))
  },

  async getBoardMember(id) {
    const row = db.boardMembers.find((b) => b.id === id)
    if (!row) throw new AppError('Board member not found', 'NOT_FOUND')
    return simulateLatency(hydrateBoardMember(row))
  },

  async getCommittees(organizationId) {
    let items = [...db.boardCommittees]
    if (organizationId) items = items.filter((c) => c.organizationId === organizationId)
    return simulateLatency(items)
  },

  async getExecutives(organizationId) {
    let items = [...db.executives]
    if (organizationId) items = items.filter((e) => e.organizationId === organizationId)
    return simulateLatency(items)
  },

  async getExecutive(id) {
    const row = db.executives.find((e) => e.id === id)
    if (!row) throw new AppError('Executive not found', 'NOT_FOUND')
    return simulateLatency(row)
  },

  async createExecutive(payload) {
    const id = payload.id ?? `exec-new-${Date.now()}`
    const next: Executive = { ...payload, id, isDummyDemonstrationData: true }
    if (next.salaryPkr != null && next.salaryPkr < 0) {
      throw new AppError('Salary cannot be negative', 'VALIDATION')
    }
    if (next.bonusPkr != null && next.bonusPkr < 0) {
      throw new AppError('Bonus cannot be negative', 'VALIDATION')
    }
    if (!next.name?.trim()) throw new AppError('Executive name is required.', 'VALIDATION')
    db.executives.push(next)
    return simulateMutation(next)
  },

  async updateExecutive(id, patch) {
    const idx = db.executives.findIndex((e) => e.id === id)
    if (idx < 0) throw new AppError('Executive not found', 'NOT_FOUND')
    if (patch.salaryPkr !== undefined && patch.salaryPkr < 0) {
      throw new AppError('Salary cannot be negative', 'VALIDATION')
    }
    if (patch.bonusPkr !== undefined && patch.bonusPkr < 0) {
      throw new AppError('Bonus cannot be negative', 'VALIDATION')
    }
    db.executives[idx] = { ...db.executives[idx], ...patch, id }
    return simulateMutation(db.executives[idx])
  },

  async getBoardSummary(organizationId, portfolioScope) {
    const items = filterBoard({
      organizationId: portfolioScope ? undefined : organizationId,
      portfolioScope,
      scopedOrganizationId: portfolioScope ? undefined : organizationId,
      pageSize: 500,
    })
    return simulateLatency(summarizeBoard(items, organizationId))
  },

  async getCalendar(organizationId, view = 'all') {
    let items = [...db.governanceCalendar]
    if (organizationId) items = items.filter((e) => e.organizationId === organizationId)
    if (view === 'overdue') items = items.filter((e) => e.status === 'overdue')
    if (view === 'upcoming') {
      items = items.filter((e) => e.status === 'upcoming' || e.status === 'due_soon')
    }
    items.sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    return simulateLatency(items)
  },

  async getCalendarEvent(id) {
    const row = db.governanceCalendar.find((e) => e.id === id)
    if (!row) throw new AppError('Calendar event not found', 'NOT_FOUND')
    return simulateLatency(row)
  },

  async createCalendarEvent(payload) {
    const id = payload.id ?? `gcal-new-${Date.now()}`
    if (!payload.title?.trim()) throw new AppError('Calendar item title is required.', 'VALIDATION')
    if (!payload.dueDate?.trim()) throw new AppError('Due date is required.', 'VALIDATION')
    const status =
      payload.status ??
      (daysUntil(payload.dueDate, DEMO_AS_OF_DATE) < 0
        ? 'overdue'
        : daysUntil(payload.dueDate, DEMO_AS_OF_DATE) <= 30
          ? 'due_soon'
          : 'upcoming')
    const next: GovernanceCalendarEvent = { ...payload, id, status }
    db.governanceCalendar.push(next)
    return simulateMutation(next)
  },

  async updateCalendarEvent(id, patch) {
    const idx = db.governanceCalendar.findIndex((e) => e.id === id)
    if (idx < 0) throw new AppError('Calendar event not found', 'NOT_FOUND')
    const merged = { ...db.governanceCalendar[idx], ...patch, id }
    if (merged.dueDate) {
      merged.status =
        daysUntil(merged.dueDate, DEMO_AS_OF_DATE) < 0
          ? 'overdue'
          : daysUntil(merged.dueDate, DEMO_AS_OF_DATE) <= 30
            ? 'due_soon'
            : 'upcoming'
    }
    db.governanceCalendar[idx] = merged
    return simulateMutation(merged)
  },

  async createBoardMember(payload) {
    const id = payload.id ?? `board-new-${Date.now()}`
    const next: BoardMember = hydrateBoardMember({
      ...payload,
      id,
      status: payload.status ?? BOARD_MEMBER_STATUS.ACTIVE,
      statusEffectiveDate: payload.statusEffectiveDate ?? payload.appointmentDate,
      isDummyDemonstrationData: true,
    })
    if (!next.name?.trim()) throw new AppError('Board member name is required.', 'VALIDATION')
    if (new Date(next.appointmentDate) > new Date(next.expiryDate)) {
      throw new AppError('Appointment date must be before expiry', 'VALIDATION')
    }
    db.boardMembers.push(next)
    return simulateMutation(next)
  },

  async updateBoardMember(id, patch) {
    const idx = db.boardMembers.findIndex((b) => b.id === id)
    if (idx < 0) throw new AppError('Board member not found', 'NOT_FOUND')
    const current = hydrateBoardMember(db.boardMembers[idx])
    const statusChanged = patch.status !== undefined && patch.status !== current.status
    const next = hydrateBoardMember({
      ...current,
      ...patch,
      id,
      statusEffectiveDate:
        patch.statusEffectiveDate ??
        (statusChanged ? DEMO_AS_OF_DATE : current.statusEffectiveDate),
    })
    if (new Date(next.appointmentDate) > new Date(next.expiryDate)) {
      throw new AppError('Appointment date must be before expiry', 'VALIDATION')
    }
    db.boardMembers[idx] = next
    return simulateMutation(next)
  },
}
