import {
  MODULE,
  ROLE,
  SOE_STATUS,
  type LegalStatus,
  type ModuleId,
  type RoleId,
  type SoeStatus,
} from '@/constants'
import { db, SCENARIO } from '@/mock-data'
import { hasPermission, PERMISSION } from '@/permissions'
import type {
  Organization,
  OrganizationLocation,
  OrganizationRelationship,
  ReportingPeriod,
  Submission,
} from '@/types/domain'
import { AppError, simulateLatency, simulateMutation } from '@/utils'
import { REPORTING_MODULES } from '@/workflow/moduleCatalog'

export type UserAccountStatus = 'invited' | 'active' | 'suspended' | 'locked' | 'revoked'
export type InvitationStatus = 'pending' | 'accepted' | 'expired' | 'cancelled'
export type OrganizationAccessStatus = 'active' | 'suspended' | 'archived'
export type ReportingFrequency = 'annual' | 'quarterly' | 'monthly' | 'event_based'

export interface UserSession {
  id: string
  createdAt: string
  lastActiveAt: string
  device: string
  location: string
  ipAddress: string
  current: boolean
}

export interface UserActivityEvent {
  id: string
  occurredAt: string
  action: string
  detail: string
  actorRole?: RoleId
}

export interface ModulePermissionGrant {
  moduleId: ModuleId
  view: boolean
  create: boolean
  edit: boolean
  delete: boolean
}

export interface UserAccount {
  id: string
  name: string
  email: string
  role: RoleId
  roles: RoleId[]
  customRoleEnabled: boolean
  modulePermissions: ModulePermissionGrant[]
  organizationId?: string
  organizationIds: string[]
  ministryScopes: string[]
  departmentScopes: string[]
  status: UserAccountStatus
  mfaEnabled: boolean
  requirePasswordChange: boolean
  failedLoginCount: number
  activeSessions: UserSession[]
  invitedAt: string
  invitationStatus: InvitationStatus
  invitationExpiresAt?: string
  temporaryAccessUntil?: string
  lockedReason?: string
  lastLoginAt?: string
  createdAt: string
  updatedAt: string
  activity: UserActivityEvent[]
}

export interface ReportingCalendarEntry {
  id: string
  reportingPeriodId: string
  module: ModuleId
  dueDate: string
  status: 'open' | 'closed'
}

export interface OrganizationAdminSettings {
  organizationId: string
  accessStatus: OrganizationAccessStatus
  reportingFrequency: ReportingFrequency
  requiredModules: ModuleId[]
  reportingPeriodIds: string[]
  reportingCalendar: ReportingCalendarEntry[]
  focalUserId?: string
  certifierUserId?: string
  mergedIntoOrganizationId?: string
  archivedAt?: string
  archivedReason?: string
  updatedAt: string
}

export interface OrganizationAdministrationProfile {
  organization: Organization
  settings: OrganizationAdminSettings
  relationships: OrganizationRelationship[]
  locations: OrganizationLocation[]
  reportingPeriods: ReportingPeriod[]
  users: UserAccount[]
  submissions: Submission[]
  history: AdministrationAuditEvent[]
}

export interface AdministrationAuditEvent {
  id: string
  occurredAt: string
  actorRole: RoleId
  action: string
  targetType: 'user' | 'organization'
  targetId: string
  detail: string
}

const now = '2026-08-10T12:00:00Z'
const defaultSessions = (userId: string): UserSession[] => [
  {
    id: `session-${userId}-web`,
    createdAt: '2026-08-08T07:30:00Z',
    lastActiveAt: '2026-08-10T11:45:00Z',
    device: 'Windows · Chrome',
    location: 'Islamabad, Pakistan',
    ipAddress: '192.0.2.24',
    current: true,
  },
]

function seedUser(input: Partial<UserAccount> & Pick<UserAccount, 'id' | 'name' | 'email' | 'role'>): UserAccount {
  const createdAt = input.createdAt ?? input.invitedAt ?? '2026-01-10T09:00:00Z'
  return {
    id: input.id,
    name: input.name,
    email: input.email,
    role: input.role,
    roles: input.roles ?? [input.role],
    customRoleEnabled: input.customRoleEnabled ?? false,
    modulePermissions: input.modulePermissions ?? [],
    organizationId: input.organizationId,
    organizationIds: input.organizationIds ?? (input.organizationId ? [input.organizationId] : []),
    ministryScopes: input.ministryScopes ?? (input.organizationId ? [] : ['Ministry of Industries and Production']),
    departmentScopes: input.departmentScopes ?? [],
    status: input.status ?? 'active',
    mfaEnabled: input.mfaEnabled ?? true,
    requirePasswordChange: input.requirePasswordChange ?? false,
    failedLoginCount: input.failedLoginCount ?? 0,
    activeSessions: input.activeSessions ?? (input.status === 'suspended' ? [] : defaultSessions(input.id)),
    invitedAt: input.invitedAt ?? createdAt,
    invitationStatus: input.invitationStatus ?? 'accepted',
    invitationExpiresAt: input.invitationExpiresAt,
    temporaryAccessUntil: input.temporaryAccessUntil,
    lockedReason: input.lockedReason,
    lastLoginAt: input.lastLoginAt,
    createdAt,
    updatedAt: input.updatedAt ?? now,
    activity: input.activity ?? [],
  }
}

function assertAccessAssignment(roles: RoleId[], customRoleEnabled: boolean, modulePermissions: ModulePermissionGrant[]) {
  if (!roles.length && !customRoleEnabled) {
    throw new AppError('Assign at least one role or enable custom permissions.', 'VALIDATION')
  }
  if (customRoleEnabled) {
    const hasGrant = modulePermissions.some(
      (grant) => grant.view || grant.create || grant.edit || grant.delete,
    )
    if (!hasGrant) {
      throw new AppError('Select at least one module permission for the custom role.', 'VALIDATION')
    }
  }
}

function normalizeModulePermissions(grants: ModulePermissionGrant[] | undefined, enabled: boolean) {
  if (!enabled) return []
  return (grants ?? []).filter((grant) => grant.view || grant.create || grant.edit || grant.delete)
}

const users: UserAccount[] = [
  seedUser({ id: 'usr-moip-reviewer', name: 'Ayesha Khan', email: 'ayesha.khan@moip.gov.pk', role: ROLE.MOIP_REVIEWER, lastLoginAt: '2026-08-08T08:15:00Z' }),
  seedUser({ id: 'usr-moip-supervisor', name: 'Faisal Mahmood', email: 'faisal.mahmood@moip.gov.pk', role: ROLE.MOIP_SUPERVISOR, lastLoginAt: '2026-08-08T07:45:00Z' }),
  seedUser({ id: 'usr-pidc-focal', name: 'Sara Ahmed', email: 'focal@pidc.gov.pk', role: ROLE.SOE_FOCAL_PERSON, organizationId: 'org-pidc', lastLoginAt: '2026-08-07T12:05:00Z' }),
  seedUser({ id: 'usr-pidc-certifier', name: 'Usman Raza', email: 'certifier@pidc.gov.pk', role: ROLE.SOE_CERTIFIER, organizationId: 'org-pidc', lastLoginAt: '2026-08-06T11:00:00Z' }),
  seedUser({ id: 'usr-psm-certifier', name: 'Kamran Ali', email: 'certifier@psm.gov.pk', role: ROLE.SOE_CERTIFIER, organizationId: 'org-psm', mfaEnabled: false, failedLoginCount: 2, lastLoginAt: '2026-08-06T10:30:00Z' }),
  seedUser({ id: 'usr-audit', name: 'Nadia Iqbal', email: 'assurance@audit.gov.pk', role: ROLE.ASSURANCE_USER, status: 'suspended', activeSessions: [] }),
]

const auditEvents: AdministrationAuditEvent[] = [
  { id: 'admin-audit-seed-01', occurredAt: '2026-08-17T14:22:00Z', actorRole: ROLE.MOIP_SUPERVISOR, action: 'password_reset_sent', targetType: 'user', targetId: 'usr-psm-certifier', detail: 'Password-reset link sent to Kamran Ali.' },
  { id: 'admin-audit-seed-02', occurredAt: '2026-08-16T11:05:00Z', actorRole: ROLE.MOIP_SUPERVISOR, action: 'user_suspended', targetType: 'user', targetId: 'usr-audit', detail: 'Nadia Iqbal suspended after unused assurance access.' },
  { id: 'admin-audit-seed-03', occurredAt: '2026-08-15T09:40:00Z', actorRole: ROLE.MOIP_REVIEWER, action: 'access_updated', targetType: 'user', targetId: 'usr-pidc-focal', detail: 'Sara Ahmed scoped to PIDC only.' },
  { id: 'admin-audit-seed-04', occurredAt: '2026-08-14T16:18:00Z', actorRole: ROLE.MOIP_SUPERVISOR, action: 'mfa_reset', targetType: 'user', targetId: 'usr-psm-certifier', detail: 'MFA enrolment reset for Kamran Ali.' },
  { id: 'admin-audit-seed-05', occurredAt: '2026-08-13T08:12:00Z', actorRole: ROLE.MOIP_REVIEWER, action: 'session_terminated', targetType: 'user', targetId: 'usr-moip-reviewer', detail: 'Stale Islamabad session closed for Ayesha Khan.' },
  { id: 'admin-audit-seed-06', occurredAt: '2026-08-12T10:30:00Z', actorRole: ROLE.MOIP_SUPERVISOR, action: 'user_invited', targetType: 'user', targetId: 'usr-pidc-certifier', detail: 'Activation link issued to Usman Raza (SOE Certifier).' },
  { id: 'admin-audit-seed-07', occurredAt: '2026-08-11T13:55:00Z', actorRole: ROLE.MOIP_REVIEWER, action: 'roles_updated', targetType: 'user', targetId: 'usr-moip-reviewer', detail: 'Ayesha Khan retained MoIP Reviewer role.' },
  { id: 'admin-audit-seed-08', occurredAt: '2026-08-10T07:20:00Z', actorRole: ROLE.MOIP_SUPERVISOR, action: 'organization_access_changed', targetType: 'organization', targetId: 'org-psm', detail: 'PSM portal access confirmed active.' },
  { id: 'admin-audit-seed-09', occurredAt: '2026-08-09T15:02:00Z', actorRole: ROLE.MOIP_REVIEWER, action: 'invitation_resent', targetType: 'user', targetId: 'usr-pidc-focal', detail: 'Activation reminder sent to Sara Ahmed.' },
  { id: 'admin-audit-seed-10', occurredAt: '2026-08-08T09:44:00Z', actorRole: ROLE.MOIP_SUPERVISOR, action: 'user_activated', targetType: 'user', targetId: 'usr-moip-supervisor', detail: 'Faisal Mahmood accepted invitation and enrolled MFA.' },
]

for (const event of auditEvents) {
  if (event.targetType !== 'user') continue
  const user = users.find((item) => item.id === event.targetId)
  if (!user) continue
  user.activity.push({
    id: event.id,
    occurredAt: event.occurredAt,
    action: event.action,
    detail: event.detail,
    actorRole: event.actorRole,
  })
}
for (const user of users) {
  user.activity.sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
}
const organizationSettings = new Map<string, OrganizationAdminSettings>()

function requirePermission(role: RoleId, permission: (typeof PERMISSION)[keyof typeof PERMISSION]) {
  if (!hasPermission(role, permission)) throw new AppError('Permission denied', 'PERMISSION')
}

function addDays(iso: string, days: number) {
  const value = new Date(iso)
  value.setUTCDate(value.getUTCDate() + days)
  return value.toISOString()
}

function record(actorRole: RoleId, action: string, targetType: AdministrationAuditEvent['targetType'], targetId: string, detail: string) {
  const event = { id: `admin-audit-${Date.now()}-${auditEvents.length}`, occurredAt: new Date().toISOString(), actorRole, action, targetType, targetId, detail }
  auditEvents.unshift(event)
  if (targetType === 'user') {
    const user = users.find((item) => item.id === targetId)
    user?.activity.unshift({ id: event.id, occurredAt: event.occurredAt, action, detail, actorRole })
    if (user) user.updatedAt = event.occurredAt
  }
}

function getUser(userId: string) {
  const user = users.find((item) => item.id === userId)
  if (!user) throw new AppError('User not found', 'NOT_FOUND')
  return user
}

function getOrganization(organizationId: string) {
  const organization = db.organizations.find((item) => item.id === organizationId)
  if (!organization) throw new AppError('SOE not found', 'NOT_FOUND')
  return organization
}

function defaultOrganizationSettings(organizationId: string): OrganizationAdminSettings {
  const existing = organizationSettings.get(organizationId)
  if (existing) return existing
  const assignedUsers = users.filter((user) => user.organizationIds.includes(organizationId))
  const settings: OrganizationAdminSettings = {
    organizationId,
    accessStatus: 'active',
    reportingFrequency: 'annual',
    requiredModules: REPORTING_MODULES.map((module) => module.id),
    reportingPeriodIds: db.reportingPeriods.filter((period) => period.type === 'annual').map((period) => period.id),
    reportingCalendar: REPORTING_MODULES.map((module, index) => ({
      id: `calendar-${organizationId}-${module.id}`,
      reportingPeriodId: 'period-fy2027',
      module: module.id,
      dueDate: `2027-${String(1 + Math.floor(index / 5)).padStart(2, '0')}-${String(15 + (index % 5)).padStart(2, '0')}`,
      status: 'open',
    })),
    focalUserId: assignedUsers.find((user) => user.roles.includes(ROLE.SOE_FOCAL_PERSON))?.id,
    certifierUserId: assignedUsers.find((user) => user.roles.includes(ROLE.SOE_CERTIFIER))?.id,
    updatedAt: now,
  }
  organizationSettings.set(organizationId, settings)
  return settings
}

function ensureOrganizationIsMutable(settings: OrganizationAdminSettings) {
  if (settings.accessStatus === 'archived') throw new AppError('Archived SOEs cannot be modified.', 'VALIDATION')
}

export const mockAdministrationService = {
  async listUsers(role: RoleId) {
    requirePermission(role, PERMISSION.USER_READ)
    return simulateLatency([...users].sort((a, b) => a.name.localeCompare(b.name)))
  },

  async getUser(role: RoleId, userId: string) {
    requirePermission(role, PERMISSION.USER_READ)
    return simulateLatency(structuredClone(getUser(userId)))
  },

  async inviteUser(role: RoleId, input: {
    name: string
    email: string
    roles: RoleId[]
    customRoleEnabled?: boolean
    modulePermissions?: ModulePermissionGrant[]
    organizationIds?: string[]
    ministryScopes?: string[]
    departmentScopes?: string[]
    temporaryAccessUntil?: string
  }) {
    requirePermission(role, PERMISSION.USER_MANAGE)
    if (users.some((user) => user.email.toLowerCase() === input.email.toLowerCase())) throw new AppError('A user with this email already exists.', 'VALIDATION')
    const customRoleEnabled = Boolean(input.customRoleEnabled)
    const modulePermissions = normalizeModulePermissions(input.modulePermissions, customRoleEnabled)
    assertAccessAssignment(input.roles, customRoleEnabled, modulePermissions)
    const invitedAt = new Date().toISOString()
    const primaryRole = input.roles[0] ?? ROLE.MOIP_ANALYST
    const user = seedUser({
      id: `usr-${Date.now()}`,
      name: input.name.trim(),
      email: input.email.trim().toLowerCase(),
      role: primaryRole,
      roles: [...new Set(input.roles)],
      customRoleEnabled,
      modulePermissions,
      organizationId: input.organizationIds?.[0],
      organizationIds: input.organizationIds ?? [],
      ministryScopes: input.ministryScopes ?? [],
      departmentScopes: input.departmentScopes ?? [],
      status: 'invited',
      mfaEnabled: false,
      requirePasswordChange: true,
      activeSessions: [],
      invitedAt,
      invitationStatus: 'pending',
      invitationExpiresAt: addDays(invitedAt, 7),
      temporaryAccessUntil: input.temporaryAccessUntil,
      createdAt: invitedAt,
    })
    users.unshift(user)
    record(
      role,
      'user_invited',
      'user',
      user.id,
      `${user.email} invited with ${user.roles.length} role(s)${customRoleEnabled ? ' · custom module permissions' : ''}`,
    )
    return simulateMutation(structuredClone(user))
  },

  async resendInvitation(role: RoleId, userId: string) {
    requirePermission(role, PERMISSION.USER_MANAGE)
    const user = getUser(userId)
    if (user.invitationStatus === 'accepted') throw new AppError('This invitation has already been accepted.', 'VALIDATION')
    user.status = 'invited'
    user.invitationStatus = 'pending'
    user.invitedAt = new Date().toISOString()
    user.invitationExpiresAt = addDays(user.invitedAt, 7)
    record(role, 'invitation_resent', 'user', user.id, `Activation invitation reissued to ${user.email}`)
    return simulateMutation(structuredClone(user))
  },

  async cancelInvitation(role: RoleId, userId: string) {
    requirePermission(role, PERMISSION.USER_MANAGE)
    const user = getUser(userId)
    if (user.invitationStatus !== 'pending') throw new AppError('Only pending invitations can be cancelled.', 'VALIDATION')
    user.invitationStatus = 'cancelled'
    user.status = 'revoked'
    record(role, 'invitation_cancelled', 'user', user.id, `Invitation for ${user.email} cancelled`)
    return simulateMutation(structuredClone(user))
  },

  async updateUserAccess(role: RoleId, userId: string, input: {
    roles: RoleId[]
    customRoleEnabled?: boolean
    modulePermissions?: ModulePermissionGrant[]
    organizationIds: string[]
    ministryScopes: string[]
    departmentScopes: string[]
    temporaryAccessUntil?: string
  }) {
    requirePermission(role, PERMISSION.USER_MANAGE)
    const customRoleEnabled = Boolean(input.customRoleEnabled)
    const modulePermissions = normalizeModulePermissions(input.modulePermissions, customRoleEnabled)
    assertAccessAssignment(input.roles, customRoleEnabled, modulePermissions)
    const user = getUser(userId)
    user.roles = [...new Set(input.roles)]
    user.role = user.roles[0] ?? ROLE.MOIP_ANALYST
    user.customRoleEnabled = customRoleEnabled
    user.modulePermissions = modulePermissions
    user.organizationIds = [...new Set(input.organizationIds)]
    user.organizationId = user.organizationIds[0]
    user.ministryScopes = [...new Set(input.ministryScopes.filter(Boolean))]
    user.departmentScopes = [...new Set(input.departmentScopes.filter(Boolean))]
    user.temporaryAccessUntil = input.temporaryAccessUntil || undefined
    record(
      role,
      'user_access_updated',
      'user',
      user.id,
      customRoleEnabled
        ? 'Roles, custom module permissions and access scopes updated'
        : 'Roles, organization and ministry scopes updated',
    )
    return simulateMutation(structuredClone(user))
  },

  async setUserStatus(role: RoleId, userId: string, status: UserAccountStatus, reason?: string) {
    requirePermission(role, PERMISSION.USER_MANAGE)
    const user = getUser(userId)
    user.status = status
    user.lockedReason = status === 'locked' ? reason || 'Locked by MoIP Reviewer' : undefined
    if (status === 'revoked' || status === 'suspended' || status === 'locked') user.activeSessions = []
    record(role, 'user_status_changed', 'user', user.id, `${user.email} changed to ${status}${reason ? `: ${reason}` : ''}`)
    return simulateMutation(structuredClone(user))
  },

  async terminateSession(role: RoleId, userId: string, sessionId?: string) {
    requirePermission(role, PERMISSION.USER_MANAGE)
    const user = getUser(userId)
    const before = user.activeSessions.length
    user.activeSessions = sessionId ? user.activeSessions.filter((session) => session.id !== sessionId) : []
    record(role, 'sessions_terminated', 'user', user.id, sessionId ? 'One active session terminated' : `${before} active session(s) terminated`)
    return simulateMutation(structuredClone(user))
  },

  async sendPasswordReset(role: RoleId, userId: string) {
    requirePermission(role, PERMISSION.USER_MANAGE)
    const user = getUser(userId)
    record(role, 'password_reset_sent', 'user', user.id, `Secure reset link issued to ${user.email}`)
    return simulateMutation({ delivered: true })
  },

  async requirePasswordChange(role: RoleId, userId: string, required: boolean) {
    requirePermission(role, PERMISSION.USER_MANAGE)
    const user = getUser(userId)
    user.requirePasswordChange = required
    record(role, 'password_change_policy_updated', 'user', user.id, required ? 'Password change required at next login' : 'Password change requirement cleared')
    return simulateMutation(structuredClone(user))
  },

  async resetMfa(role: RoleId, userId: string) {
    requirePermission(role, PERMISSION.USER_MANAGE)
    const user = getUser(userId)
    user.mfaEnabled = false
    user.activeSessions = []
    record(role, 'mfa_reset', 'user', user.id, 'MFA enrollment reset; active sessions terminated')
    return simulateMutation(structuredClone(user))
  },

  async createOrganization(role: RoleId, input: {
    name: string
    abbreviation: string
    legalStatus: LegalStatus
    sector: string
    subSector?: string
    parentMinistry: string
    attachedDepartment?: string
    headOfficeAddress: string
    governmentOwnershipPct: number
  }) {
    requirePermission(role, PERMISSION.ORGANIZATION_MANAGE)
    if (db.organizations.some((organization) => organization.abbreviation.toLowerCase() === input.abbreviation.toLowerCase())) throw new AppError('An SOE with this abbreviation already exists.', 'VALIDATION')
    const organization: Organization = {
      id: `org-${input.abbreviation.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      name: input.name.trim(), abbreviation: input.abbreviation.trim().toUpperCase(), legalStatus: input.legalStatus,
      sector: input.sector.trim(), subSector: input.subSector?.trim(), status: SOE_STATUS.ACTIVE,
      parentMinistry: input.parentMinistry.trim(), attachedDepartment: input.attachedDepartment?.trim(),
      administrativeMinistry: input.parentMinistry.trim(), headOfficeAddress: input.headOfficeAddress.trim(),
      governmentOwnershipPct: input.governmentOwnershipPct, scenarioId: SCENARIO.HEALTHY,
      scenarioTag: SCENARIO.HEALTHY, isDummyDemonstrationData: true,
    }
    db.organizations.push(organization)
    defaultOrganizationSettings(organization.id)
    record(role, 'organization_created', 'organization', organization.id, `${organization.name} added to the SOE registry`)
    return simulateMutation(organization)
  },

  async getOrganizationProfile(role: RoleId, organizationId: string): Promise<OrganizationAdministrationProfile> {
    requirePermission(role, PERMISSION.ORGANIZATION_MANAGE)
    const organization = getOrganization(organizationId)
    const settings = defaultOrganizationSettings(organizationId)
    return simulateLatency({
      organization: structuredClone(organization), settings: structuredClone(settings),
      relationships: structuredClone(db.relationships.filter((item) => item.parentOrganizationId === organizationId || item.relatedOrganizationId === organizationId)),
      locations: structuredClone(db.locations.filter((item) => item.organizationId === organizationId)),
      reportingPeriods: structuredClone(db.reportingPeriods.filter((period) => settings.reportingPeriodIds.includes(period.id))),
      users: structuredClone(users.filter((user) => user.organizationIds.includes(organizationId))),
      submissions: structuredClone(db.submissions.filter((submission) => submission.organizationId === organizationId)),
      history: structuredClone(auditEvents.filter((event) => event.targetType === 'organization' && event.targetId === organizationId)),
    })
  },

  async listReportingPeriods(role: RoleId) {
    requirePermission(role, PERMISSION.ORGANIZATION_MANAGE)
    return simulateLatency(structuredClone(db.reportingPeriods))
  },

  async updateOrganizationIdentity(role: RoleId, organizationId: string, patch: Partial<Pick<Organization, 'name' | 'abbreviation' | 'legalStatus' | 'sector' | 'subSector' | 'parentMinistry' | 'attachedDepartment' | 'headOfficeAddress' | 'governmentOwnershipPct' | 'companyRegistrationNo' | 'ntn' | 'secpRegistrationNo' | 'strn' | 'website' | 'corporateEmail'>>) {
    requirePermission(role, PERMISSION.ORGANIZATION_MANAGE)
    const organization = getOrganization(organizationId)
    ensureOrganizationIsMutable(defaultOrganizationSettings(organizationId))
    Object.assign(organization, patch, { id: organizationId })
    record(role, 'organization_identity_updated', 'organization', organizationId, 'Legal, registration or enterprise identity updated')
    return simulateMutation(structuredClone(organization))
  },

  async updateReportingConfiguration(role: RoleId, organizationId: string, input: { reportingFrequency: ReportingFrequency; requiredModules: ModuleId[]; reportingPeriodIds: string[]; defaultDueDate: string }) {
    requirePermission(role, PERMISSION.ORGANIZATION_MANAGE)
    const settings = defaultOrganizationSettings(organizationId)
    ensureOrganizationIsMutable(settings)
    settings.reportingFrequency = input.reportingFrequency
    settings.requiredModules = [...new Set(input.requiredModules)]
    settings.reportingPeriodIds = [...new Set(input.reportingPeriodIds)]
    settings.reportingCalendar = settings.requiredModules.map((module) => ({ id: `calendar-${organizationId}-${module}`, reportingPeriodId: input.reportingPeriodIds.at(-1) ?? 'period-fy2027', module, dueDate: input.defaultDueDate, status: 'open' }))
    settings.updatedAt = new Date().toISOString()
    record(role, 'reporting_configuration_updated', 'organization', organizationId, `${settings.requiredModules.length} required modules configured`)
    return simulateMutation(structuredClone(settings))
  },

  async assignOrganizationUsers(role: RoleId, organizationId: string, focalUserId?: string, certifierUserId?: string) {
    requirePermission(role, PERMISSION.ORGANIZATION_MANAGE)
    const settings = defaultOrganizationSettings(organizationId)
    ensureOrganizationIsMutable(settings)
    settings.focalUserId = focalUserId || undefined
    settings.certifierUserId = certifierUserId || undefined
    for (const userId of [focalUserId, certifierUserId].filter(Boolean) as string[]) {
      const user = getUser(userId)
      if (!user.organizationIds.includes(organizationId)) user.organizationIds.push(organizationId)
      user.organizationId ??= organizationId
    }
    record(role, 'organization_users_assigned', 'organization', organizationId, 'Focal person and certifier assignments updated')
    return simulateMutation(structuredClone(settings))
  },

  async setOrganizationAccess(role: RoleId, organizationId: string, accessStatus: OrganizationAccessStatus, reason?: string) {
    requirePermission(role, PERMISSION.ORGANIZATION_MANAGE)
    const settings = defaultOrganizationSettings(organizationId)
    settings.accessStatus = accessStatus
    if (accessStatus === 'archived') { settings.archivedAt = new Date().toISOString(); settings.archivedReason = reason }
    record(role, 'organization_access_changed', 'organization', organizationId, `SOE access changed to ${accessStatus}${reason ? `: ${reason}` : ''}`)
    return simulateMutation(structuredClone(settings))
  },

  async changeOrganizationLifecycle(role: RoleId, organizationId: string, status: SoeStatus, reason: string) {
    requirePermission(role, PERMISSION.ORGANIZATION_MANAGE)
    const organization = getOrganization(organizationId)
    ensureOrganizationIsMutable(defaultOrganizationSettings(organizationId))
    organization.status = status
    record(role, 'organization_lifecycle_changed', 'organization', organizationId, `Lifecycle changed to ${status}: ${reason}`)
    return simulateMutation(structuredClone(organization))
  },

  async transferOrganization(role: RoleId, organizationId: string, ministry: string, attachedDepartment?: string) {
    requirePermission(role, PERMISSION.ORGANIZATION_MANAGE)
    const organization = getOrganization(organizationId)
    ensureOrganizationIsMutable(defaultOrganizationSettings(organizationId))
    organization.parentMinistry = ministry.trim()
    organization.administrativeMinistry = ministry.trim()
    organization.attachedDepartment = attachedDepartment?.trim() || undefined
    record(role, 'organization_transferred', 'organization', organizationId, `Transferred to ${ministry}`)
    return simulateMutation(structuredClone(organization))
  },

  async mergeOrganization(role: RoleId, sourceOrganizationId: string, targetOrganizationId: string, reason: string) {
    requirePermission(role, PERMISSION.ORGANIZATION_MANAGE)
    if (sourceOrganizationId === targetOrganizationId) throw new AppError('Select a different target SOE.', 'VALIDATION')
    const source = getOrganization(sourceOrganizationId)
    const target = getOrganization(targetOrganizationId)
    const settings = defaultOrganizationSettings(sourceOrganizationId)
    source.status = SOE_STATUS.MERGED
    settings.accessStatus = 'archived'
    settings.mergedIntoOrganizationId = targetOrganizationId
    settings.archivedAt = new Date().toISOString()
    settings.archivedReason = reason
    record(role, 'organization_merged', 'organization', sourceOrganizationId, `${source.name} merged into ${target.name}: ${reason}. Historical submissions preserved.`)
    return simulateMutation(structuredClone(settings))
  },

  async addOrganizationLocation(role: RoleId, organizationId: string, input: Omit<OrganizationLocation, 'id' | 'organizationId'>) {
    requirePermission(role, PERMISSION.ORGANIZATION_MANAGE)
    ensureOrganizationIsMutable(defaultOrganizationSettings(organizationId))
    const location: OrganizationLocation = { ...input, id: `loc-${organizationId}-${Date.now()}`, organizationId }
    db.locations.push(location)
    record(role, 'organization_location_added', 'organization', organizationId, `${location.kind} added in ${location.district}`)
    return simulateMutation(structuredClone(location))
  },

  async addOrganizationRelationship(role: RoleId, organizationId: string, input: Omit<OrganizationRelationship, 'id' | 'parentOrganizationId'>) {
    requirePermission(role, PERMISSION.ORGANIZATION_MANAGE)
    ensureOrganizationIsMutable(defaultOrganizationSettings(organizationId))
    getOrganization(input.relatedOrganizationId)
    if (input.relatedOrganizationId === organizationId) throw new AppError('An SOE cannot be its own subsidiary or related enterprise.', 'VALIDATION')
    const relationship: OrganizationRelationship = {
      ...input,
      id: `rel-${organizationId}-${input.relatedOrganizationId}-${Date.now()}`,
      parentOrganizationId: organizationId,
    }
    db.relationships.push(relationship)
    record(role, 'organization_relationship_added', 'organization', organizationId, `Corporate relationship added for ${getOrganization(input.relatedOrganizationId).name}`)
    return simulateMutation(structuredClone(relationship))
  },

  async listAuditEvents(role: RoleId, targetId?: string) {
    requirePermission(role, PERMISSION.AUDIT_LOG_READ)
    const events = targetId ? auditEvents.filter((event) => event.targetId === targetId) : auditEvents
    return simulateLatency(structuredClone(events))
  },
}

export const ADMINISTRATION_MODULES = Object.values(MODULE)
