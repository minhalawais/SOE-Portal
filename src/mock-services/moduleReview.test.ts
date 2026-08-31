import { beforeEach, describe, expect, it } from 'vitest'
import { MODULE, ROLE, SUBMISSION_STATUS } from '@/constants'
import { db, resetMockDb } from '@/mock-data'
import { mockAdministrationService } from '@/mock-services/administration.service'
import { mockModuleReviewService } from '@/mock-services/moduleReview.service'
import { REPORTING_MODULES } from '@/workflow/moduleCatalog'

describe('generic MoIP module review', () => {
  beforeEach(() => resetMockDb())

  it('builds a complete 14-module SOE review package', async () => {
    const result = await mockModuleReviewService.getPackage('org-pidc', 'period-fy2027')
    expect(result.modules).toHaveLength(REPORTING_MODULES.length)
    expect(result.modules.map((module) => module.id)).toEqual(REPORTING_MODULES.map((module) => module.id))
  })

  it('keeps approved historical packages available for every annual reporting year', async () => {
    for (const periodId of ['period-fy2024', 'period-fy2025', 'period-fy2026']) {
      const result = await mockModuleReviewService.getPackage('org-pidc', periodId)
      expect(result.submitted).toBe(REPORTING_MODULES.length)
      expect(result.approved).toBe(REPORTING_MODULES.length)
      expect(result.modules.every((module) => module.submission?.status === SUBMISSION_STATUS.LOCKED)).toBe(true)
    }
  })

  it('renders submitted records for non-finance modules without sensitive workforce fields', async () => {
    const asset = db.submissions.find((submission) => submission.organizationId === 'org-pidc' && submission.reportingPeriodId === 'period-fy2026' && submission.module === MODULE.ASSETS)!
    const assets = await mockModuleReviewService.getReview(asset.id)
    expect(assets.records.length).toBeGreaterThan(0)
    expect(assets.records[0]?.section).toBe('Asset register')

    const workforce = db.submissions.find((submission) => submission.organizationId === 'org-pidc' && submission.reportingPeriodId === 'period-fy2026' && submission.module === MODULE.WORKFORCE)!
    const workforceReview = await mockModuleReviewService.getReview(workforce.id)
    const fieldKeys = workforceReview.records.flatMap((record) => record.fields.map((field) => field.key))
    expect(fieldKeys).not.toContain('cnic')
    expect(fieldKeys).not.toContain('salaryPkr')
  })

  it('filters collective module data by SOE, year and approved state', async () => {
    const submission = db.submissions.find((item) => item.organizationId === 'org-pidc' && item.module === MODULE.ASSETS)!
    submission.status = SUBMISSION_STATUS.LOCKED
    const result = await mockModuleReviewService.getPortfolioModule({ moduleId: MODULE.ASSETS, organizationId: 'org-pidc', reportingPeriodId: 'period-fy2027', dataState: 'approved' })
    expect(result.rows).toHaveLength(1)
    expect(result.rows[0]?.organization.id).toBe('org-pidc')
    expect(result.records.every((record) => record.organization.id === 'org-pidc')).toBe(true)
  })

  it('enforces review before approval and locks the submitted version', async () => {
    const submission = db.submissions.find((item) => item.organizationId === 'org-pidc' && item.module === MODULE.ASSETS)!
    submission.status = SUBMISSION_STATUS.SUBMITTED
    submission.completeness = 95
    await expect(mockModuleReviewService.approveSubmission(submission.id, ROLE.MOIP_REVIEWER, 'Reviewed')).rejects.toThrow('under review')
    await mockModuleReviewService.takeUnderReview(submission.id, ROLE.MOIP_REVIEWER)
    const approved = await mockModuleReviewService.approveSubmission(submission.id, ROLE.MOIP_REVIEWER, 'Evidence and records reviewed')
    expect(approved.status).toBe(SUBMISSION_STATUS.LOCKED)
    expect(approved.version).toBe('1.0')
    expect(db.submissionHistory.some((event) => event.submissionId === submission.id && event.action === 'approved_and_locked')).toBe(true)
  })

  it('prevents a portfolio analyst from making review decisions', async () => {
    const submission = db.submissions.find((item) => item.module === MODULE.ASSETS)!
    submission.status = SUBMISSION_STATUS.SUBMITTED
    await expect(mockModuleReviewService.takeUnderReview(submission.id, ROLE.MOIP_ANALYST)).rejects.toThrow('Permission denied')
  })
})

describe('SOE internal module review', () => {
  beforeEach(() => resetMockDb())

  it('shows ready-for-certification modules in the SOE reviewer workspace', async () => {
    const submission = db.submissions.find(
      (item) =>
        item.organizationId === 'org-pidc' &&
        item.reportingPeriodId === 'period-fy2027' &&
        item.module === MODULE.ASSETS,
    )!
    submission.status = SUBMISSION_STATUS.READY_FOR_CERTIFICATION
    submission.completeness = 96

    const result = await mockModuleReviewService.getSoeReview(submission.id, ROLE.SOE_CERTIFIER)
    expect(result.submission.id).toBe(submission.id)
    expect(result.records.length).toBeGreaterThan(0)
  })

  it('allows SOE reviewer approve, clarify and return actions on internal submissions', async () => {
    const submission = db.submissions.find(
      (item) =>
        item.organizationId === 'org-pidc' &&
        item.reportingPeriodId === 'period-fy2027' &&
        item.module === MODULE.WORKFORCE,
    )!
    submission.status = SUBMISSION_STATUS.READY_FOR_CERTIFICATION
    submission.completeness = 100

    const approved = await mockModuleReviewService.approveSoeSubmission(
      submission.id,
      ROLE.SOE_CERTIFIER,
      'Reviewed and ready for period submission',
    )
    expect(approved.status).toBe(SUBMISSION_STATUS.CERTIFIED)

    submission.status = SUBMISSION_STATUS.READY_FOR_CERTIFICATION
    const clarification = await mockModuleReviewService.requestSoeClarification(
      submission.id,
      ROLE.SOE_CERTIFIER,
      'general',
      'Please explain the workforce movement.',
    )
    expect(clarification.submissionId).toBe(submission.id)
    expect(submission.status).toBe(SUBMISSION_STATUS.CLARIFICATION_REQUESTED)

    const returned = await mockModuleReviewService.returnSoeSubmission(
      submission.id,
      ROLE.SOE_CERTIFIER,
      'Board-approved evidence is still missing.',
    )
    expect(returned.status).toBe(SUBMISSION_STATUS.RETURNED)
  })
})

describe('MoIP administration', () => {
  beforeEach(() => resetMockDb())

  it('allows the MoIP Reviewer to register and fully configure an SOE', async () => {
    const organization = await mockAdministrationService.createOrganization(ROLE.MOIP_REVIEWER, {
      name: 'National Industrial Services Company',
      abbreviation: `NISC${Date.now()}`,
      legalStatus: 'government_company',
      sector: 'Industrial Services',
      parentMinistry: 'Ministry of Industries and Production',
      headOfficeAddress: 'Islamabad',
      governmentOwnershipPct: 100,
    })
    expect(db.organizations.some((item) => item.id === organization.id)).toBe(true)
    const settings = await mockAdministrationService.updateReportingConfiguration(ROLE.MOIP_REVIEWER, organization.id, {
      reportingFrequency: 'quarterly',
      requiredModules: [MODULE.ENTERPRISE, MODULE.ASSETS, MODULE.FINANCE],
      reportingPeriodIds: [db.reportingPeriods[0]!.id],
      defaultDueDate: '2026-09-30',
    })
    expect(settings.reportingFrequency).toBe('quarterly')
    expect(settings.requiredModules).toEqual([MODULE.ENTERPRISE, MODULE.ASSETS, MODULE.FINANCE])
    await expect(mockAdministrationService.setOrganizationAccess(ROLE.MOIP_REVIEWER, organization.id, 'suspended', 'Reporting hold')).resolves.toMatchObject({ accessStatus: 'suspended' })
    await expect(mockAdministrationService.setOrganizationAccess(ROLE.MOIP_REVIEWER, organization.id, 'active')).resolves.toMatchObject({ accessStatus: 'active' })
  })

  it('uses invitations and reset links instead of exposing passwords', async () => {
    const email = `reviewer-${Date.now()}@moip.gov.pk`
    const user = await mockAdministrationService.inviteUser(ROLE.MOIP_REVIEWER, {
      name: 'New Reviewer',
      email,
      roles: [ROLE.MOIP_REVIEWER, ROLE.MOIP_ANALYST],
      ministryScopes: ['Ministry of Industries and Production'],
      temporaryAccessUntil: '2026-12-31T23:59:59Z',
    })
    expect(user.status).toBe('invited')
    expect(user.roles).toEqual([ROLE.MOIP_REVIEWER, ROLE.MOIP_ANALYST])
    expect(user.invitationStatus).toBe('pending')
    expect('password' in user).toBe(false)
    await expect(mockAdministrationService.resendInvitation(ROLE.MOIP_REVIEWER, user.id)).resolves.toMatchObject({ invitationStatus: 'pending' })
    await expect(mockAdministrationService.requirePasswordChange(ROLE.MOIP_REVIEWER, user.id, true)).resolves.toMatchObject({ requirePasswordChange: true })
    await expect(mockAdministrationService.resetMfa(ROLE.MOIP_REVIEWER, user.id)).resolves.toMatchObject({ mfaEnabled: false })
    await expect(mockAdministrationService.sendPasswordReset(ROLE.MOIP_REVIEWER, user.id)).resolves.toEqual({ delivered: true })
    await expect(mockAdministrationService.setUserStatus(ROLE.MOIP_REVIEWER, user.id, 'locked', 'Suspicious login attempts')).resolves.toMatchObject({ status: 'locked' })
    await expect(mockAdministrationService.setUserStatus(ROLE.MOIP_REVIEWER, user.id, 'active')).resolves.toMatchObject({ status: 'active' })
  })
})
