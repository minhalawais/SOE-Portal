import { describe, expect, it, beforeEach } from 'vitest'
import {
  BOARD_EXPIRY_BAND,
  BOARD_MEMBER_STATUS,
  DECLARATION_STATUS,
  DEMO_AS_OF_DATE,
  ROLE,
  WORKFORCE_STATUS,
} from '@/constants'
import { db, resetMockDb, SCENARIO } from '@/mock-data'
import { resetMockRuntime } from '@/mock-data/runtime'
import { mockBoardService } from '@/mock-services/board.service'
import { mockWorkforceService } from '@/mock-services/workforce.service'
import { hasPermission, PERMISSION } from '@/permissions'
import { resolveBoardExpiryBand, maskCnic } from '@/workflow/boardExpiry'

describe('Phase 9 people & governance', () => {
  beforeEach(() => {
    resetMockDb()
    resetMockRuntime()
  })

  it('computes vacancy rate from sanctioned posts', async () => {
    const nfc = db.organizations.find((o) => o.scenarioId === SCENARIO.GOVERNANCE_RISK)!
    const summary = await mockWorkforceService.getSummary(nfc.id)
    expect(summary.sanctioned).toBeGreaterThan(0)
    expect(summary.vacant).toBeGreaterThan(0)
    expect(summary.vacancyRatePct).toBeGreaterThan(0)
  })

  it('keeps daily wagers and consultants separate from employees', () => {
    expect(db.dailyWagers.length).toBeGreaterThan(0)
    expect(db.consultants.some((c) => c.status === 'expiring')).toBe(true)
    const compliant = db.organizations.find((o) => o.scenarioId === SCENARIO.COMPLIANT)!
    expect(db.consultants.filter((c) => c.organizationId === compliant.id)).toHaveLength(0)
  })

  it('applies board expiry bands including 30/90/180/expired/vacancy', () => {
    const nfc = db.organizations.find((o) => o.scenarioId === SCENARIO.GOVERNANCE_RISK)!
    const bands = new Set(
      db.boardMembers
        .filter((b) => b.organizationId === nfc.id)
        .map((b) => resolveBoardExpiryBand(b, DEMO_AS_OF_DATE)),
    )
    expect(bands.has(BOARD_EXPIRY_BAND.EXPIRED)).toBe(true)
    expect(bands.has(BOARD_EXPIRY_BAND.WITHIN_30)).toBe(true)
    expect(bands.has(BOARD_EXPIRY_BAND.WITHIN_90)).toBe(true)
    expect(bands.has(BOARD_EXPIRY_BAND.VACANCY)).toBe(true)
  })

  it('supports no-board scenario for SMEDA', async () => {
    const summary = await mockBoardService.getBoardSummary('org-smeda')
    expect(summary.boardStatus).toBe('no_board')
    expect(summary.boardSize).toBe(0)
  })

  it('surfaces missing declarations and committees', async () => {
    const nfc = db.organizations.find((o) => o.scenarioId === SCENARIO.GOVERNANCE_RISK)!
    const summary = await mockBoardService.getBoardSummary(nfc.id)
    expect(summary.missingDeclarations).toBeGreaterThan(0)
    const committees = await mockBoardService.getCommittees(nfc.id)
    expect(committees.length).toBeGreaterThan(0)
  })

  it('builds actionable governance calendar with deep links', async () => {
    const nfc = db.organizations.find((o) => o.scenarioId === SCENARIO.GOVERNANCE_RISK)!
    const cal = await mockBoardService.getCalendar(nfc.id, 'all')
    expect(cal.length).toBeGreaterThan(0)
    expect(cal.some((e) => e.status === 'overdue')).toBe(true)
    expect(cal.some((e) => e.linkPath?.includes('/soe/people/board'))).toBe(true)
  })

  it('masks CNIC and gates sensitive permissions', () => {
    expect(maskCnic('12345-1234567-1')).toContain('*******')
    expect(hasPermission(ROLE.HR_OFFICER, PERMISSION.WORKFORCE_EDIT)).toBe(true)
    expect(hasPermission(ROLE.HR_OFFICER, PERMISSION.SENSITIVE_PERSONAL_READ)).toBe(true)
    expect(hasPermission(ROLE.COMPANY_SECRETARY, PERMISSION.BOARD_EDIT)).toBe(true)
    expect(hasPermission(ROLE.SOE_FOCAL_PERSON, PERMISSION.SENSITIVE_PERSONAL_READ)).toBe(true)
    expect(hasPermission(ROLE.MOIP_REVIEWER, PERMISSION.BOARD_READ)).toBe(true)
  })

  it('rejects board appointment after expiry', async () => {
    const member = db.boardMembers.find((b) => !b.isVacancySlot)!
    await expect(
      mockBoardService.updateBoardMember(member.id, {
        appointmentDate: '2028-01-01',
        expiryDate: '2027-01-01',
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION' })
  })

  it('flags overdue employee declarations as warnings via seed data', () => {
    expect(
      db.employees.some((e) => e.assetDeclarationStatus === DECLARATION_STATUS.OVERDUE),
    ).toBe(true)
  })

  it('excludes separated workforce statuses from current live headcount', async () => {
    const employee = db.employees.find((e) => e.organizationId === 'org-psm')!
    const before = await mockWorkforceService.getContinuousSummary('org-psm')
    await mockWorkforceService.updateEmployee(employee.id, {
      status: WORKFORCE_STATUS.RESIGNED,
      statusEffectiveDate: '2026-08-20',
      statusChangeReason: 'Resignation accepted by competent authority',
    })
    const after = await mockWorkforceService.getContinuousSummary('org-psm')
    const updated = await mockWorkforceService.getEmployee(employee.id)
    expect(updated.status).toBe(WORKFORCE_STATUS.RESIGNED)
    expect(updated.statusEffectiveDate).toBe('2026-08-20')
    expect(after.activeRecords).toBe(before.activeRecords - 1)
  })

  it('persists board member status changes with effective date and reason', async () => {
    const member = db.boardMembers.find((b) => b.organizationId === 'org-psm' && !b.isVacancySlot)!
    const updated = await mockBoardService.updateBoardMember(member.id, {
      status: BOARD_MEMBER_STATUS.RESIGNED,
      statusEffectiveDate: '2026-08-18',
      statusChangeReason: 'Resignation tendered and accepted',
    })
    const summary = await mockBoardService.getBoardSummary('org-psm')
    expect(updated.status).toBe(BOARD_MEMBER_STATUS.RESIGNED)
    expect(updated.statusEffectiveDate).toBe('2026-08-18')
    expect(updated.statusChangeReason).toContain('Resignation')
    expect(summary.activeMembers).toBeLessThan(summary.boardSize)
  })
})
