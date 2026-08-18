import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Building2, KeyRound, Search, ShieldCheck, UserPlus } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/design-system/components/Button'
import { Card } from '@/design-system/components/Card'
import { CheckboxField, DateField, SelectField, TextField } from '@/design-system/components/Fields'
import { EmptyState, ErrorState, LoadingBlock } from '@/design-system/components/Feedback'
import { FilterBar } from '@/design-system/components/FilterBar'
import { StatusBadge } from '@/design-system/components/StatusBadge'
import { LEGAL_STATUS, LEGAL_STATUS_LABEL, ROLE, ROLE_LABEL, SOE_STATUS_LABEL, type LegalStatus, type RoleId } from '@/constants'
import { mockAdministrationService, mockOrganizationService } from '@/mock-services'
import type { ModulePermissionGrant } from '@/mock-services/administration.service'
import { useSessionStore } from '@/state/session'
import { useUiStore } from '@/state/ui'
import { AppError } from '@/utils'
import { AdminPanel } from '@/portals/moip/AdminPanel'
import {
  CustomModulePermissionMatrix,
  emptyModulePermissionGrants,
  formatAssignedRoles,
  hasAnyModulePermission,
  mergeModulePermissionGrants,
} from '@/portals/moip/CustomModulePermissionMatrix'

const accountRoleOptions: RoleId[] = [ROLE.SOE_FOCAL_PERSON, ROLE.SOE_CERTIFIER, ROLE.SOE_EXECUTIVE, ROLE.MOIP_REVIEWER, ROLE.MOIP_ANALYST, ROLE.MOIP_SUPERVISOR, ROLE.EXECUTIVE_VIEWER]

function errorTitle(error: unknown, fallback: string) {
  return error instanceof AppError ? error.message : fallback
}

function formatDate(value?: string) {
  return value ? new Date(value).toLocaleString() : 'Never'
}

export function MoipSoeAdministrationPage() {
  const role = useSessionStore((state) => state.role)
  const pushToast = useUiStore((state) => state.pushToast)
  const queryClient = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [search, setSearch] = useState('')
  const [name, setName] = useState('')
  const [abbreviation, setAbbreviation] = useState('')
  const [legalStatus, setLegalStatus] = useState<LegalStatus>(LEGAL_STATUS.PUBLIC_LIMITED_COMPANY)
  const [sector, setSector] = useState('')
  const [subSector, setSubSector] = useState('')
  const [ministry, setMinistry] = useState('Ministry of Industries and Production')
  const [department, setDepartment] = useState('')
  const [address, setAddress] = useState('')
  const [ownership, setOwnership] = useState('100')
  const organizations = useQuery({ queryKey: ['organizations', 'administration'], queryFn: () => mockOrganizationService.getOrganizations({ pageSize: 250 }) })
  const createMutation = useMutation({
    mutationFn: () => mockAdministrationService.createOrganization(role, { name, abbreviation, legalStatus, sector, subSector: subSector || undefined, parentMinistry: ministry, attachedDepartment: department || undefined, headOfficeAddress: address, governmentOwnershipPct: Number(ownership) }),
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ['organizations'] }); setShowCreate(false); setName(''); setAbbreviation(''); setSector(''); setSubSector(''); setDepartment(''); setAddress(''); setOwnership('100'); pushToast({ title: 'SOE added to the master registry.', tone: 'success' }) },
    onError: (error) => pushToast({ title: errorTitle(error, 'Unable to add SOE.'), tone: 'critical' }),
  })
  const items = (organizations.data?.items ?? []).filter((item) => `${item.name} ${item.abbreviation} ${item.sector} ${item.parentMinistry}`.toLowerCase().includes(search.toLowerCase()))

  return <div>
    <PageHeader title="SOE management" subtitle="Master registry, reporting setup, assigned officials, lifecycle and preserved administrative history" actions={<Button size="sm" onClick={() => setShowCreate((value) => !value)}><Building2 size={16} />Add SOE</Button>} />
    {showCreate ? <Card className="mb-4" title="Register a new SOE" subtitle="Creates the administrative identity. Reporting modules, calendars and assigned users are configured from the SOE workspace."><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <TextField label="Legal name" required value={name} onChange={(e) => setName(e.target.value)} /><TextField label="Abbreviation" required value={abbreviation} onChange={(e) => setAbbreviation(e.target.value)} />
      <SelectField label="Legal status" value={legalStatus} options={Object.values(LEGAL_STATUS).map((value) => ({ value, label: LEGAL_STATUS_LABEL[value] }))} onChange={(e) => setLegalStatus(e.target.value as LegalStatus)} /><TextField label="Sector" required value={sector} onChange={(e) => setSector(e.target.value)} />
      <TextField label="Subsector" value={subSector} onChange={(e) => setSubSector(e.target.value)} /><TextField label="Parent ministry" required value={ministry} onChange={(e) => setMinistry(e.target.value)} /><TextField label="Attached department" value={department} onChange={(e) => setDepartment(e.target.value)} /><TextField label="Head office address" required value={address} onChange={(e) => setAddress(e.target.value)} />
      <TextField label="Government ownership (%)" type="number" min="0" max="100" value={ownership} onChange={(e) => setOwnership(e.target.value)} /><div className="flex items-end gap-2"><Button disabled={!name.trim() || !abbreviation.trim() || !sector.trim() || !address.trim()} loading={createMutation.isPending} onClick={() => createMutation.mutate()}>Create enterprise</Button><Button variant="tertiary" onClick={() => setShowCreate(false)}>Cancel</Button></div>
    </div></Card> : null}
    <div className="mb-4 max-w-md"><TextField label="Search registry" value={search} placeholder="Name, abbreviation, sector or ministry" onChange={(e) => setSearch(e.target.value)} /></div>
    {organizations.isLoading ? <LoadingBlock /> : organizations.isError ? <ErrorState title="Unable to load SOE registry" /> : <section className="overflow-hidden rounded-card border border-soe-border bg-white"><div className="overflow-x-auto"><table className="w-full min-w-[1100px] text-left text-sm"><thead className="bg-soe-canvas text-xs uppercase text-soe-slate"><tr><th className="px-4 py-3">SOE</th><th>Sector / subsector</th><th>Legal status</th><th>Ownership</th><th>Parent ministry</th><th>Lifecycle</th><th>Administration</th><th>Submitted data</th></tr></thead><tbody>{items.map((organization) => <tr key={organization.id} className="border-t border-soe-border"><td className="px-4 py-3"><p className="font-semibold text-soe-navy">{organization.name}</p><p className="text-xs text-soe-slate">{organization.abbreviation}</p></td><td>{organization.sector}<p className="text-xs text-soe-slate">{organization.subSector || 'Not classified'}</p></td><td>{LEGAL_STATUS_LABEL[organization.legalStatus]}</td><td>{organization.governmentOwnershipPct}%</td><td>{organization.parentMinistry}<p className="text-xs text-soe-slate">{organization.attachedDepartment || 'No attached department'}</p></td><td><StatusBadge status={organization.status} label={SOE_STATUS_LABEL[organization.status]} /></td><td><Link className="font-medium text-soe-blue hover:underline" to={`/moip/admin/soes/${organization.id}`}>Manage profile</Link></td><td><Link className="text-soe-blue hover:underline" to={`/moip/enterprise/${organization.id}/review`}>Review package</Link></td></tr>)}</tbody></table></div></section>}
  </div>
}

export function MoipUserManagementPage() {
  const role = useSessionStore((state) => state.role)
  const pushToast = useUiStore((state) => state.pushToast)
  const queryClient = useQueryClient()
  const [showInvite, setShowInvite] = useState(false)
  const [search, setSearch] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [roles, setRoles] = useState<RoleId[]>([ROLE.MOIP_REVIEWER])
  const [customRoleEnabled, setCustomRoleEnabled] = useState(false)
  const [modulePermissions, setModulePermissions] = useState<ModulePermissionGrant[]>(emptyModulePermissionGrants)
  const [organizationIds, setOrganizationIds] = useState<string[]>([])
  const [ministry, setMinistry] = useState('Ministry of Industries and Production')
  const [department, setDepartment] = useState('')
  const [temporaryAccessUntil, setTemporaryAccessUntil] = useState('')
  const users = useQuery({ queryKey: ['admin-users'], queryFn: () => mockAdministrationService.listUsers(role) })
  const organizations = useQuery({ queryKey: ['organizations', 'user-admin'], queryFn: () => mockOrganizationService.getOrganizations({ pageSize: 250 }) })
  const inviteMutation = useMutation({
    mutationFn: () => mockAdministrationService.inviteUser(role, {
      name,
      email,
      roles,
      customRoleEnabled,
      modulePermissions: customRoleEnabled ? modulePermissions : [],
      organizationIds,
      ministryScopes: ministry ? [ministry] : [],
      departmentScopes: department ? [department] : [],
      temporaryAccessUntil: temporaryAccessUntil ? new Date(`${temporaryAccessUntil}T23:59:59Z`).toISOString() : undefined,
    }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      setShowInvite(false)
      setName('')
      setEmail('')
      setRoles([ROLE.MOIP_REVIEWER])
      setCustomRoleEnabled(false)
      setModulePermissions(emptyModulePermissionGrants())
      setOrganizationIds([])
      setDepartment('')
      setTemporaryAccessUntil('')
      pushToast({ title: 'One-time secure activation invitation sent.', tone: 'success' })
    },
    onError: (error) => pushToast({ title: errorTitle(error, 'Unable to invite user.'), tone: 'critical' }),
  })
  const resetMutation = useMutation({ mutationFn: (id: string) => mockAdministrationService.sendPasswordReset(role, id), onSuccess: () => pushToast({ title: 'Secure password-reset link sent. Passwords are never displayed.', tone: 'success' }), onError: (error) => pushToast({ title: errorTitle(error, 'Unable to send reset link.'), tone: 'critical' }) })
  const items = (users.data ?? []).filter((item) => `${item.name} ${item.email} ${item.roles.join(' ')} ${item.customRoleEnabled ? 'custom' : ''} ${item.status}`.toLowerCase().includes(search.toLowerCase()))
  const orgName = (id: string) => organizations.data?.items.find((item) => item.id === id)?.abbreviation ?? id
  const canInvite =
    name.trim() &&
    email.includes('@') &&
    (roles.length > 0 || (customRoleEnabled && hasAnyModulePermission(modulePermissions)))

  return (
    <div>
      <PageHeader
        title="User management"
        subtitle="Roles, access scope, MFA and invitations. Passwords are never shown."
        actions={
          <Button size="sm" onClick={() => setShowInvite((value) => !value)}>
            <UserPlus size={16} />
            Invite user
          </Button>
        }
      />

      {showInvite ? (
        <AdminPanel
          className="mb-4"
          title="Invite user"
          subtitle="One-time activation link. Assign roles and optional module permissions."
        >
          <div className="grid gap-4 xl:grid-cols-2">
            <div className="grid gap-3 sm:grid-cols-2">
              <TextField label="Full name" required value={name} onChange={(e) => setName(e.target.value)} />
              <TextField label="Official email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
              <TextField label="Ministry scope" value={ministry} onChange={(e) => setMinistry(e.target.value)} />
              <TextField label="Department scope" value={department} onChange={(e) => setDepartment(e.target.value)} />
              <DateField label="Temporary access expiry" value={temporaryAccessUntil} onChange={(e) => setTemporaryAccessUntil(e.target.value)} />
            </div>
            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-soe-navy">Roles</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {accountRoleOptions.map((item) => (
                  <CheckboxField
                    key={item}
                    label={ROLE_LABEL[item]}
                    checked={roles.includes(item)}
                    onChange={() =>
                      setRoles((current) =>
                        current.includes(item) ? current.filter((value) => value !== item) : [...current, item],
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
            </div>
            {customRoleEnabled ? (
              <div className="xl:col-span-2">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-soe-navy">
                  Custom module permissions
                </p>
                <CustomModulePermissionMatrix value={modulePermissions} onChange={setModulePermissions} />
              </div>
            ) : null}
            <div className="xl:col-span-2">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-soe-navy">SOE scope</p>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {organizations.data?.items.map((item) => (
                  <CheckboxField
                    key={item.id}
                    label={`${item.abbreviation} · ${item.name}`}
                    checked={organizationIds.includes(item.id)}
                    onChange={() =>
                      setOrganizationIds((current) =>
                        current.includes(item.id) ? current.filter((value) => value !== item.id) : [...current, item.id],
                      )
                    }
                  />
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <Button disabled={!canInvite} loading={inviteMutation.isPending} onClick={() => inviteMutation.mutate()}>
                Send activation link
              </Button>
              <Button variant="tertiary" onClick={() => setShowInvite(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </AdminPanel>
      ) : null}

      <FilterBar
        className="mb-3"
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Name, email, role or status"
      />

      {users.isLoading ? (
        <LoadingBlock />
      ) : users.isError ? (
        <ErrorState title="Unable to load users" />
      ) : items.length ? (
        <AdminPanel title="Users" subtitle={`${items.length} account${items.length === 1 ? '' : 's'}`} padding={false}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1420px] text-left text-sm">
              <thead className="bg-[#e8eef3] text-[11px] font-semibold uppercase tracking-wide text-soe-navy">
                <tr>
                  <th className="px-4 py-2.5">User</th>
                  <th>Roles</th>
                  <th>SOE / portfolio</th>
                  <th>Ministry / department</th>
                  <th>Status</th>
                  <th>MFA</th>
                  <th>Last login</th>
                  <th>Failed</th>
                  <th>Sessions</th>
                  <th>Invitation</th>
                  <th className="pr-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((user) => (
                  <tr key={user.id} className="border-t border-soe-border align-top hover:bg-[#f4f7fa]">
                    <td className="px-4 py-2.5">
                      <Link className="font-semibold text-soe-navy hover:text-soe-blue hover:underline" to={`/moip/admin/users/${user.id}`}>
                        {user.name}
                      </Link>
                      <p className="text-xs text-soe-slate">{user.email}</p>
                    </td>
                    <td className="py-2.5 pr-3">
                      {formatAssignedRoles(user.roles, user.customRoleEnabled, (item) => ROLE_LABEL[item as RoleId] ?? item)}
                    </td>
                    <td className="py-2.5 pr-3">
                      {user.organizationIds.length ? user.organizationIds.map(orgName).join(', ') : 'Portfolio'}
                    </td>
                    <td className="py-2.5 pr-3">
                      {user.ministryScopes.join(', ') || '—'}
                      <p className="text-xs text-soe-slate">{user.departmentScopes.join(', ') || 'No department'}</p>
                    </td>
                    <td className="py-2.5 pr-3">
                      <StatusBadge status={user.status} label={user.status.replaceAll('_', ' ')} />
                    </td>
                    <td className="py-2.5 pr-3">
                      {user.mfaEnabled ? (
                        <span className="inline-flex items-center gap-1 text-soe-teal">
                          <ShieldCheck size={14} />
                          Enabled
                        </span>
                      ) : (
                        <span className="text-soe-slate">Not enrolled</span>
                      )}
                    </td>
                    <td className="py-2.5 pr-3 text-xs text-soe-slate">{formatDate(user.lastLoginAt)}</td>
                    <td className="py-2.5 pr-3">{user.failedLoginCount}</td>
                    <td className="py-2.5 pr-3">{user.activeSessions.length}</td>
                    <td className="py-2.5 pr-3 capitalize">
                      {user.invitationStatus}
                      <p className="text-xs text-soe-slate">{formatDate(user.invitationExpiresAt)}</p>
                    </td>
                    <td className="py-2.5 pr-4">
                      <div className="flex gap-1">
                        <Link
                          className="inline-flex h-8 items-center gap-1 rounded-control px-2.5 text-xs font-medium text-soe-blue hover:bg-soe-canvas"
                          to={`/moip/admin/users/${user.id}`}
                        >
                          <Search size={14} />
                          Manage
                        </Link>
                        <Button
                          variant="tertiary"
                          size="sm"
                          title="Send secure password-reset link"
                          onClick={() => resetMutation.mutate(user.id)}
                        >
                          <KeyRound size={14} />
                          Reset
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </AdminPanel>
      ) : (
        <EmptyState title="No matching user accounts" />
      )}
    </div>
  )
}

export function MoipAdministrationAuditPage() {
  const role = useSessionStore((state) => state.role)
  const [search, setSearch] = useState('')
  const query = useQuery({
    queryKey: ['administration-audit'],
    queryFn: () => mockAdministrationService.listAuditEvents(role),
  })
  const items = (query.data ?? []).filter((event) =>
    `${event.action} ${event.detail} ${event.targetType} ${event.targetId} ${event.actorRole}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  )

  return (
    <div>
      <PageHeader
        title="Account activity"
        subtitle="Invitations, access changes, MFA and SOE administration events"
      />
      <FilterBar
        className="mb-3"
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Action, user, SOE or actor"
      />
      {query.isLoading ? (
        <LoadingBlock />
      ) : query.isError ? (
        <ErrorState title="Unable to load account activity" />
      ) : items.length ? (
        <AdminPanel title="Activity log" subtitle={`${items.length} event${items.length === 1 ? '' : 's'}`} padding={false}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] text-left text-sm">
              <thead className="bg-[#e8eef3] text-[11px] font-semibold uppercase tracking-wide text-soe-navy">
                <tr>
                  <th className="px-4 py-2.5">When</th>
                  <th>Action</th>
                  <th>Target</th>
                  <th>Detail</th>
                  <th className="pr-4">Actor</th>
                </tr>
              </thead>
              <tbody>
                {items.map((event) => (
                  <tr key={event.id} className="border-t border-soe-border hover:bg-[#f4f7fa]">
                    <td className="whitespace-nowrap px-4 py-2.5 text-xs text-soe-slate">
                      {formatDate(event.occurredAt)}
                    </td>
                    <td className="py-2.5 pr-3 font-medium capitalize text-soe-navy">
                      {event.action.replaceAll('_', ' ')}
                    </td>
                    <td className="py-2.5 pr-3 capitalize text-soe-slate">{event.targetType}</td>
                    <td className="py-2.5 pr-3">{event.detail}</td>
                    <td className="py-2.5 pr-4 text-xs text-soe-slate">{ROLE_LABEL[event.actorRole]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </AdminPanel>
      ) : (
        <EmptyState title="No matching activity" />
      )}
    </div>
  )
}
