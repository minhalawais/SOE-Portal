import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, KeyRound, LockKeyhole, LogOut, MailPlus, MapPin, Save, ShieldCheck, UserCheck, UserX } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/design-system/components/Button'
import { Card } from '@/design-system/components/Card'
import { AdminMetricStrip, AdminPanel } from '@/portals/moip/AdminPanel'
import { CheckboxField, DateField, SelectField, TextareaField, TextField } from '@/design-system/components/Fields'
import { EmptyState, ErrorState, LoadingBlock } from '@/design-system/components/Feedback'
import { StatusBadge } from '@/design-system/components/StatusBadge'
import {
  LEGAL_STATUS,
  LEGAL_STATUS_LABEL,
  RELATIONSHIP_TYPE,
  RELATIONSHIP_TYPE_LABEL,
  ROLE,
  ROLE_LABEL,
  SOE_STATUS_LABEL,
  type LegalStatus,
  type RoleId,
} from '@/constants'
import { mockAdministrationService, mockOrganizationService } from '@/mock-services'
import type { ModulePermissionGrant, UserAccountStatus } from '@/mock-services/administration.service'
import { useSessionStore } from '@/state/session'
import { useUiStore } from '@/state/ui'
import { AppError } from '@/utils'
import {
  CustomModulePermissionMatrix,
  hasAnyModulePermission,
  mergeModulePermissionGrants,
} from '@/portals/moip/CustomModulePermissionMatrix'

const assignableRoles: RoleId[] = [
  ROLE.SOE_FOCAL_PERSON,
  ROLE.SOE_CERTIFIER,
  ROLE.SOE_EXECUTIVE,
  ROLE.MOIP_REVIEWER,
  ROLE.MOIP_ANALYST,
  ROLE.MOIP_SUPERVISOR,
  ROLE.EXECUTIVE_VIEWER,
]

function message(error: unknown, fallback: string) {
  return error instanceof AppError ? error.message : fallback
}

function formatDate(value?: string) {
  return value ? new Date(value).toLocaleString() : 'Never'
}

function csv(value: string) {
  return value.split(',').map((item) => item.trim()).filter(Boolean)
}

function moipAdministrationRole(role: RoleId): RoleId {
  return role === ROLE.SOE_FOCAL_PERSON ? ROLE.MOIP_REVIEWER : role
}

function DetailMetric({ label, value }: { label: string; value: string | number }) {
  return <div><p className="text-[11px] font-semibold uppercase text-soe-slate">{label}</p><p className="mt-1 text-sm font-semibold text-soe-navy">{value}</p></div>
}

export function MoipSoeAdministrationDetailPage() {
  const { organizationId = '' } = useParams()
  const role = useSessionStore((state) => state.role)
  const administrationRole = moipAdministrationRole(role)
  const pushToast = useUiStore((state) => state.pushToast)
  const queryClient = useQueryClient()
  const profile = useQuery({ queryKey: ['admin-soe', organizationId], queryFn: () => mockAdministrationService.getOrganizationProfile(administrationRole, organizationId), enabled: Boolean(organizationId) })
  const organizations = useQuery({ queryKey: ['organizations', 'administration-detail'], queryFn: () => mockOrganizationService.getOrganizations({ pageSize: 250 }) })
  const periods = useQuery({ queryKey: ['admin-reporting-periods'], queryFn: () => mockAdministrationService.listReportingPeriods(administrationRole) })
  const [identity, setIdentity] = useState({ name: '', abbreviation: '', legalStatus: LEGAL_STATUS.PUBLIC_LIMITED_COMPANY as LegalStatus, sector: '', subSector: '', parentMinistry: '', attachedDepartment: '', headOfficeAddress: '', ownership: '100', companyRegistrationNo: '', ntn: '', secpRegistrationNo: '', strn: '', website: '', corporateEmail: '' })

  useEffect(() => {
    if (!profile.data) return
    const { organization } = profile.data
    setIdentity({
      name: organization.name, abbreviation: organization.abbreviation, legalStatus: organization.legalStatus,
      sector: organization.sector, subSector: organization.subSector ?? '', parentMinistry: organization.parentMinistry,
      attachedDepartment: organization.attachedDepartment ?? '', headOfficeAddress: organization.headOfficeAddress,
      ownership: String(organization.governmentOwnershipPct), companyRegistrationNo: organization.companyRegistrationNo ?? '',
      ntn: organization.ntn ?? '', secpRegistrationNo: organization.secpRegistrationNo ?? '', strn: organization.strn ?? '',
      website: organization.website ?? '', corporateEmail: organization.corporateEmail ?? '',
    })
  }, [profile.data])

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['admin-soe', organizationId] })
  const mutation = useMutation({
    mutationFn: (work: () => Promise<unknown>) => work(),
    onSuccess: () => { void refresh(); void queryClient.invalidateQueries({ queryKey: ['organizations'] }); pushToast({ title: 'SOE administration record updated.', tone: 'success' }) },
    onError: (error) => pushToast({ title: message(error, 'Unable to update the SOE.'), tone: 'critical' }),
  })

  if (profile.isLoading) return <LoadingBlock />
  if (profile.isError || !profile.data) return <ErrorState title="Unable to load SOE administration profile" />
  const data = profile.data
  const organizationOptions = (organizations.data?.items ?? []).filter((item) => item.id !== organizationId).map((item) => ({ value: item.id, label: `${item.abbreviation} — ${item.name}` }))

  const submitIdentity = (event: FormEvent) => {
    event.preventDefault()
    mutation.mutate(() => mockAdministrationService.updateOrganizationIdentity(administrationRole, organizationId, {
      ...identity,
      governmentOwnershipPct: Number(identity.ownership),
      subSector: identity.subSector || undefined,
      attachedDepartment: identity.attachedDepartment || undefined,
      companyRegistrationNo: identity.companyRegistrationNo || undefined,
      ntn: identity.ntn || undefined,
      secpRegistrationNo: identity.secpRegistrationNo || undefined,
      strn: identity.strn || undefined,
      website: identity.website || undefined,
      corporateEmail: identity.corporateEmail || undefined,
    }))
  }

  const addLocation = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    mutation.mutate(() => mockAdministrationService.addOrganizationLocation(administrationRole, organizationId, {
      label: String(form.get('label')), kind: String(form.get('kind')) as 'head_office' | 'factory' | 'warehouse' | 'regional_office' | 'provincial_office',
      province: String(form.get('province')), district: String(form.get('district')), address: String(form.get('address')) || undefined,
      latitude: Number(form.get('latitude')), longitude: Number(form.get('longitude')),
    }))
    event.currentTarget.reset()
  }

  const addRelationship = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    mutation.mutate(() => mockAdministrationService.addOrganizationRelationship(administrationRole, organizationId, {
      relatedOrganizationId: String(form.get('relatedOrganizationId')),
      relationshipType: String(form.get('relationshipType')) as 'holding' | 'subsidiary' | 'associate' | 'joint_venture',
      ownershipPercentage: Number(form.get('ownershipPercentage')),
      status: 'active',
    }))
    event.currentTarget.reset()
  }

  return <div className="space-y-4">
    <Link to="/moip-review/admin/soes" className="inline-flex items-center gap-1 text-sm font-medium text-soe-blue"><ArrowLeft size={15} />SOE registry</Link>
    <PageHeader title={`${data.organization.abbreviation} administration`} subtitle="Legal identity, corporate structure, operational footprint and preserved history" />
    <div className="grid gap-3 sm:grid-cols-3">
      <Card><DetailMetric label="Lifecycle" value={SOE_STATUS_LABEL[data.organization.status]} /></Card>
      <Card><DetailMetric label="Portal access" value={data.settings.accessStatus.replaceAll('_', ' ')} /></Card>
      <Card><DetailMetric label="Historical submissions" value={data.submissions.length} /></Card>
    </div>

    <form onSubmit={submitIdentity}><Card title="Legal and registry identity" subtitle="Authoritative SOE identity and administrative ownership" actions={<Button size="sm" type="submit" loading={mutation.isPending}><Save size={15} />Save identity</Button>}>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <TextField label="Legal name" required value={identity.name} onChange={(e) => setIdentity({ ...identity, name: e.target.value })} />
        <TextField label="Abbreviation" required value={identity.abbreviation} onChange={(e) => setIdentity({ ...identity, abbreviation: e.target.value })} />
        <SelectField label="Legal status" value={identity.legalStatus} options={Object.values(LEGAL_STATUS).map((value) => ({ value, label: LEGAL_STATUS_LABEL[value] }))} onChange={(e) => setIdentity({ ...identity, legalStatus: e.target.value as LegalStatus })} />
        <TextField label="Government ownership (%)" type="number" min="0" max="100" value={identity.ownership} onChange={(e) => setIdentity({ ...identity, ownership: e.target.value })} />
        <TextField label="Company registration no." value={identity.companyRegistrationNo} onChange={(e) => setIdentity({ ...identity, companyRegistrationNo: e.target.value })} />
        <TextField label="SECP registration no." value={identity.secpRegistrationNo} onChange={(e) => setIdentity({ ...identity, secpRegistrationNo: e.target.value })} />
        <TextField label="NTN" value={identity.ntn} onChange={(e) => setIdentity({ ...identity, ntn: e.target.value })} />
        <TextField label="STRN" value={identity.strn} onChange={(e) => setIdentity({ ...identity, strn: e.target.value })} />
        <TextField label="Sector" value={identity.sector} onChange={(e) => setIdentity({ ...identity, sector: e.target.value })} />
        <TextField label="Subsector" value={identity.subSector} onChange={(e) => setIdentity({ ...identity, subSector: e.target.value })} />
        <TextField label="Parent ministry" value={identity.parentMinistry} onChange={(e) => setIdentity({ ...identity, parentMinistry: e.target.value })} />
        <TextField label="Attached department" value={identity.attachedDepartment} onChange={(e) => setIdentity({ ...identity, attachedDepartment: e.target.value })} />
        <TextField label="Official email" type="email" value={identity.corporateEmail} onChange={(e) => setIdentity({ ...identity, corporateEmail: e.target.value })} />
        <TextField label="Website" value={identity.website} onChange={(e) => setIdentity({ ...identity, website: e.target.value })} />
        <div className="sm:col-span-2"><TextField label="Head office address" value={identity.headOfficeAddress} onChange={(e) => setIdentity({ ...identity, headOfficeAddress: e.target.value })} /></div>
      </div>
    </Card></form>

    <div className="grid gap-4 xl:grid-cols-2">
      <Card title="Corporate structure" subtitle="Ownership links, subsidiaries, associates and joint ventures">
        <div className="mb-4 divide-y divide-soe-border">{data.relationships.length ? data.relationships.map((item) => <div key={item.id} className="flex justify-between py-2 text-sm"><span>{organizations.data?.items.find((org) => org.id === item.relatedOrganizationId)?.name ?? item.relatedOrganizationId}</span><span className="font-medium text-soe-navy">{RELATIONSHIP_TYPE_LABEL[item.relationshipType]} · {item.ownershipPercentage}%</span></div>) : <p className="pb-3 text-sm text-soe-slate">No corporate relationships registered.</p>}</div>
        <form onSubmit={addRelationship} className="grid gap-3 sm:grid-cols-3">
          <SelectField name="relatedOrganizationId" label="Related SOE" required options={organizationOptions} />
          <SelectField name="relationshipType" label="Relationship" options={Object.values(RELATIONSHIP_TYPE).map((value) => ({ value, label: RELATIONSHIP_TYPE_LABEL[value] }))} />
          <TextField name="ownershipPercentage" label="Ownership (%)" type="number" min="0" max="100" defaultValue="100" />
          <Button size="sm" type="submit">Add relationship</Button>
        </form>
      </Card>
      <Card title="Operational footprint" subtitle="Head office, factories, warehouses and field offices">
        <div className="mb-4 grid gap-2 sm:grid-cols-2">{data.locations.map((item) => <div key={item.id} className="rounded-control border border-soe-border p-3 text-sm"><p className="flex items-center gap-1 font-semibold text-soe-navy"><MapPin size={14} />{item.label}</p><p className="text-soe-slate">{item.kind.replaceAll('_', ' ')} · {item.district}, {item.province}</p></div>)}</div>
        <form onSubmit={addLocation} className="grid gap-3 sm:grid-cols-3">
          <TextField name="label" label="Location name" required />
          <SelectField name="kind" label="Type" options={['head_office', 'factory', 'warehouse', 'regional_office', 'provincial_office'].map((value) => ({ value, label: value.replaceAll('_', ' ') }))} />
          <TextField name="province" label="Province / territory" required />
          <TextField name="district" label="District" required />
          <TextField name="address" label="Address" />
          <div className="grid grid-cols-2 gap-2"><TextField name="latitude" label="Latitude" type="number" step="any" required /><TextField name="longitude" label="Longitude" type="number" step="any" required /></div>
          <Button size="sm" type="submit">Add location</Button>
        </form>
      </Card>
    </div>

    <div className="grid gap-4 xl:grid-cols-2">
      <Card title="Submission and approval history" subtitle="Historical packages remain attached after transfer, merge or archive">
        {data.submissions.length ? <div className="max-h-72 overflow-auto divide-y divide-soe-border">{data.submissions.map((item) => <div key={item.id} className="grid grid-cols-[1fr_auto] gap-2 py-2 text-sm"><div><p className="font-medium capitalize text-soe-navy">{item.module.replaceAll('_', ' ')}</p><p className="text-xs text-soe-slate">{periods.data?.find((period) => period.id === item.reportingPeriodId)?.label ?? item.reportingPeriodId} · version {item.version}</p></div><StatusBadge status={item.status} label={item.status.replaceAll('_', ' ')} /></div>)}</div> : <EmptyState title="No submissions recorded" />}
      </Card>
      <Card title="Administrative change history" subtitle="Who changed access, identity, reporting or lifecycle settings">
        {data.history.length ? <ol className="max-h-72 overflow-auto divide-y divide-soe-border">{data.history.map((item) => <li key={item.id} className="py-2 text-sm"><p className="font-medium capitalize text-soe-navy">{item.action.replaceAll('_', ' ')}</p><p>{item.detail}</p><p className="text-xs text-soe-slate">{formatDate(item.occurredAt)} · {ROLE_LABEL[item.actorRole]}</p></li>)}</ol> : <EmptyState title="No administrative changes recorded" />}
      </Card>
    </div>
  </div>
}

export function MoipUserAdministrationDetailPage() {
  const { userId = '' } = useParams()
  const role = useSessionStore((state) => state.role)
  const administrationRole = moipAdministrationRole(role)
  const pushToast = useUiStore((state) => state.pushToast)
  const queryClient = useQueryClient()
  const user = useQuery({ queryKey: ['admin-user', userId], queryFn: () => mockAdministrationService.getUser(administrationRole, userId), enabled: Boolean(userId) })
  const organizations = useQuery({ queryKey: ['organizations', 'user-detail'], queryFn: () => mockOrganizationService.getOrganizations({ pageSize: 250 }) })
  const [roles, setRoles] = useState<RoleId[]>([])
  const [customRoleEnabled, setCustomRoleEnabled] = useState(false)
  const [modulePermissions, setModulePermissions] = useState<ModulePermissionGrant[]>([])
  const [organizationIds, setOrganizationIds] = useState<string[]>([])
  const [ministries, setMinistries] = useState('')
  const [departments, setDepartments] = useState('')
  const [temporaryAccessUntil, setTemporaryAccessUntil] = useState('')
  const [lockReason, setLockReason] = useState('')

  useEffect(() => {
    if (!user.data) return
    setRoles(user.data.roles)
    setCustomRoleEnabled(user.data.customRoleEnabled)
    setModulePermissions(mergeModulePermissionGrants(user.data.modulePermissions))
    setOrganizationIds(user.data.organizationIds)
    setMinistries(user.data.ministryScopes.join(', '))
    setDepartments(user.data.departmentScopes.join(', '))
    setTemporaryAccessUntil(user.data.temporaryAccessUntil?.slice(0, 10) ?? '')
  }, [user.data])

  const refresh = () => { void queryClient.invalidateQueries({ queryKey: ['admin-user', userId] }); void queryClient.invalidateQueries({ queryKey: ['admin-users'] }) }
  const mutation = useMutation({
    mutationFn: (work: () => Promise<unknown>) => work(),
    onSuccess: () => { refresh(); pushToast({ title: 'User account updated.', tone: 'success' }) },
    onError: (error) => pushToast({ title: message(error, 'Unable to update the user.'), tone: 'critical' }),
  })
  if (user.isLoading) return <LoadingBlock />
  if (user.isError || !user.data) return <ErrorState title="Unable to load user account" />
  const account = user.data
  const statusAction = (status: UserAccountStatus) => mutation.mutate(() => mockAdministrationService.setUserStatus(administrationRole, userId, status, lockReason))
  const canSaveAccess =
    roles.length > 0 || (customRoleEnabled && hasAnyModulePermission(modulePermissions))

  return <div className="space-y-4">
    <Link to="/moip-review/admin/users" className="inline-flex items-center gap-1 text-sm font-medium text-soe-blue"><ArrowLeft size={15} />Users & access</Link>
    <PageHeader title={account.name} subtitle={account.email} />
    <AdminMetricStrip
      items={[
        { label: 'Status', value: account.status.replaceAll('_', ' ') },
        { label: 'MFA', value: account.mfaEnabled ? 'Enrolled' : 'Not enrolled' },
        { label: 'Failed logins', value: account.failedLoginCount },
        { label: 'Sessions', value: account.activeSessions.length },
        { label: 'Last login', value: formatDate(account.lastLoginAt) },
      ]}
    />

    <AdminPanel
      title="Roles and access"
      subtitle="Roles, SOE scope and time-bound access"
      actions={
        <Button
          size="sm"
          variant="secondary"
          disabled={!canSaveAccess}
          loading={mutation.isPending}
          onClick={() =>
            mutation.mutate(() =>
              mockAdministrationService.updateUserAccess(administrationRole, userId, {
                roles,
                customRoleEnabled,
                modulePermissions: customRoleEnabled ? modulePermissions : [],
                organizationIds,
                ministryScopes: csv(ministries),
                departmentScopes: csv(departments),
                temporaryAccessUntil: temporaryAccessUntil
                  ? new Date(`${temporaryAccessUntil}T23:59:59Z`).toISOString()
                  : undefined,
              }),
            )
          }
        >
          <Save size={15} />
          Save access
        </Button>
      }
    >
      <div className="grid gap-5 xl:grid-cols-2">
        <fieldset>
          <legend className="mb-2 text-xs font-semibold uppercase text-soe-slate">Assigned roles</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {assignableRoles.map((item) => (
              <CheckboxField
                key={item}
                label={ROLE_LABEL[item]}
                checked={roles.includes(item)}
                onChange={() =>
                  setRoles((current) =>
                    current.includes(item)
                      ? current.filter((value) => value !== item)
                      : [...current, item],
                  )
                }
              />
            ))}
            <CheckboxField
              label="Custom"
              checked={customRoleEnabled}
              onChange={() => {
                setCustomRoleEnabled((current) => {
                  const next = !current
                  if (next) setModulePermissions((grants) => mergeModulePermissionGrants(grants))
                  return next
                })
              }}
            />
          </div>
        </fieldset>
        <div className="space-y-3">
          <TextField
            label="Ministry scope(s)"
            hint="Comma-separated official ministry names"
            value={ministries}
            onChange={(e) => setMinistries(e.target.value)}
          />
          <TextField
            label="Department scope(s)"
            hint="Comma-separated attached departments"
            value={departments}
            onChange={(e) => setDepartments(e.target.value)}
          />
          <DateField
            label="Temporary access expiry"
            value={temporaryAccessUntil}
            onChange={(e) => setTemporaryAccessUntil(e.target.value)}
          />
        </div>
      </div>
      {customRoleEnabled ? (
        <div className="mt-5">
          <p className="mb-2 text-xs font-semibold uppercase text-soe-slate">Custom module permissions</p>
          <CustomModulePermissionMatrix value={modulePermissions} onChange={setModulePermissions} />
        </div>
      ) : null}
      <fieldset className="mt-5">
        <legend className="mb-2 text-xs font-semibold uppercase text-soe-slate">SOE / portfolio scope</legend>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {organizations.data?.items.map((item) => (
            <CheckboxField
              key={item.id}
              label={`${item.abbreviation} · ${item.name}`}
              checked={organizationIds.includes(item.id)}
              onChange={() =>
                setOrganizationIds((current) =>
                  current.includes(item.id)
                    ? current.filter((value) => value !== item.id)
                    : [...current, item.id],
                )
              }
            />
          ))}
        </div>
        {!organizationIds.length ? (
          <p className="mt-2 text-xs text-soe-slate">No SOE selected: ministry or portfolio scope applies.</p>
        ) : null}
      </fieldset>
    </AdminPanel>

    <div className="grid gap-4 xl:grid-cols-2">
      <AdminPanel title="Authentication" subtitle="Passwords are never shown">
        <div className="grid gap-3 sm:grid-cols-2">
          <DetailMetric label="Invitation" value={account.invitationStatus} />
          <DetailMetric label="Invitation expiry" value={formatDate(account.invitationExpiresAt)} />
          <DetailMetric label="Created" value={formatDate(account.createdAt)} />
          <DetailMetric label="Last modified" value={formatDate(account.updatedAt)} />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {account.invitationStatus === 'pending' ? (
            <>
              <Button size="sm" variant="secondary" onClick={() => mutation.mutate(() => mockAdministrationService.resendInvitation(administrationRole, userId))}>
                <MailPlus size={14} />
                Resend invitation
              </Button>
              <Button size="sm" variant="destructive" onClick={() => mutation.mutate(() => mockAdministrationService.cancelInvitation(administrationRole, userId))}>
                Cancel invitation
              </Button>
            </>
          ) : null}
          <Button size="sm" variant="secondary" onClick={() => mutation.mutate(() => mockAdministrationService.sendPasswordReset(administrationRole, userId))}>
            <KeyRound size={14} />
            Send reset link
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() =>
              mutation.mutate(() =>
                mockAdministrationService.requirePasswordChange(administrationRole, userId, !account.requirePasswordChange),
              )
            }
          >
            {account.requirePasswordChange ? 'Clear password-change requirement' : 'Require password change'}
          </Button>
          <Button size="sm" variant="secondary" onClick={() => mutation.mutate(() => mockAdministrationService.resetMfa(administrationRole, userId))}>
            <ShieldCheck size={14} />
            Reset MFA
          </Button>
        </div>
      </AdminPanel>
      <AdminPanel title="Account state" subtitle="Lock or revoke ends active sessions">
        <TextareaField label="Reason for lock or restriction" value={lockReason} onChange={(e) => setLockReason(e.target.value)} />
        <div className="mt-3 flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" onClick={() => statusAction('active')}>
            <UserCheck size={14} />
            Reactivate
          </Button>
          <Button size="sm" variant="secondary" onClick={() => statusAction('suspended')}>
            <UserX size={14} />
            Suspend
          </Button>
          <Button size="sm" variant="destructive" disabled={!lockReason.trim()} onClick={() => statusAction('locked')}>
            <LockKeyhole size={14} />
            Lock account
          </Button>
          <Button size="sm" variant="destructive" onClick={() => statusAction('revoked')}>
            Revoke account
          </Button>
        </div>
        {account.lockedReason ? <p className="mt-3 text-sm text-soe-critical">Lock reason: {account.lockedReason}</p> : null}
      </AdminPanel>
    </div>

    <AdminPanel
      title="Active sessions"
      subtitle="End one session or sign the user out everywhere"
      actions={
        account.activeSessions.length ? (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => mutation.mutate(() => mockAdministrationService.terminateSession(administrationRole, userId))}
          >
            <LogOut size={14} />
            Terminate all
          </Button>
        ) : undefined
      }
      padding={false}
    >
      {account.activeSessions.length ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-[#e8eef3] text-[11px] font-semibold uppercase tracking-wide text-soe-navy">
              <tr>
                <th className="px-4 py-2.5">Device</th>
                <th>Location / IP</th>
                <th>Started</th>
                <th>Last active</th>
                <th className="pr-4" />
              </tr>
            </thead>
            <tbody>
              {account.activeSessions.map((session) => (
                <tr key={session.id} className="border-t border-soe-border hover:bg-[#f4f7fa]">
                  <td className="px-4 py-2.5 font-medium text-soe-navy">
                    {session.device}
                    {session.current ? ' · current' : ''}
                  </td>
                  <td className="py-2.5 pr-3">
                    {session.location} · {session.ipAddress}
                  </td>
                  <td className="py-2.5 pr-3 text-xs text-soe-slate">{formatDate(session.createdAt)}</td>
                  <td className="py-2.5 pr-3 text-xs text-soe-slate">{formatDate(session.lastActiveAt)}</td>
                  <td className="py-2.5 pr-4 text-right">
                    <Button
                      size="sm"
                      variant="tertiary"
                      onClick={() => mutation.mutate(() => mockAdministrationService.terminateSession(administrationRole, userId, session.id))}
                    >
                      Terminate
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="p-4">
          <EmptyState title="No active sessions" />
        </div>
      )}
    </AdminPanel>

    <AdminPanel title="Account activity" subtitle="Invitation, access and status history" padding={false}>
      {account.activity.length ? (
        <ol className="divide-y divide-soe-border">
          {account.activity.map((item) => (
            <li key={item.id} className="grid gap-1 px-4 py-2.5 text-sm sm:grid-cols-[160px_1fr_auto]">
              <p className="font-medium capitalize text-soe-navy">{item.action.replaceAll('_', ' ')}</p>
              <p>{item.detail}</p>
              <p className="text-xs text-soe-slate">
                {formatDate(item.occurredAt)}
                {item.actorRole ? ` · ${ROLE_LABEL[item.actorRole]}` : ''}
              </p>
            </li>
          ))}
        </ol>
      ) : (
        <div className="p-4">
          <EmptyState title="No account activity recorded" />
        </div>
      )}
    </AdminPanel>
  </div>
}
