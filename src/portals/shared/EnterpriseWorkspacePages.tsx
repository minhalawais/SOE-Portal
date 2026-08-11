import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { EnterpriseHeader } from '@/components/enterprise/EnterpriseHeader'
import {
  MoipEnterpriseNav,
  SoeEnterpriseNav,
} from '@/components/enterprise/EnterpriseSectionNav'
import { flattenHierarchy, HierarchyTree } from '@/components/enterprise/HierarchyTree'
import { OwnershipCompositionBar } from '@/components/enterprise/OwnershipCompositionBar'
import { MapPreview } from '@/components/data-display/MapPreview'
import { PageHeader } from '@/components/layout/PageHeader'
import { DataTable } from '@/components/tables/DataTable'
import { Button } from '@/design-system/components/Button'
import { EmptyState, ErrorState, LoadingBlock } from '@/design-system/components/Feedback'
import { StatusBadge } from '@/design-system/components/StatusBadge'
import {
  ENTERPRISE_HISTORY_EVENT,
  LEGAL_STATUS,
  LEGAL_STATUS_LABEL,
  RELATIONSHIP_TYPE,
  RELATIONSHIP_TYPE_LABEL,
  SHAREHOLDER_CATEGORY,
  SHAREHOLDER_CATEGORY_LABEL,
  SOE_STATUS,
  SOE_STATUS_LABEL,
  type LegalStatus,
  type ShareholderCategory,
  type SoeStatus,
} from '@/constants'
import { mockOrganizationService } from '@/mock-services'
import { hasPermission, PERMISSION } from '@/permissions'
import { useSessionStore } from '@/state/session'
import { useUiStore } from '@/state/ui'
import type {
  EnterpriseHistoryEvent,
  GeoFeature,
  Organization,
  OrganizationContact,
  OrganizationLocation,
  OrganizationRelationship,
  OwnershipLine,
  SubsidiaryDetail,
} from '@/types/domain'
import { AppError, formatCurrencyPkr } from '@/utils'
import { validateOwnershipLines } from '@/workflow/enterpriseValidation'
import { reportingPeriodsSeed } from '@/mock-data/seed'

type Mode = 'edit' | 'readonly'

function useEnterpriseContext(portal: 'soe' | 'moip', explicitOrgId?: string) {
  const sessionOrg = useSessionStore((s) => s.organizationId)
  const role = useSessionStore((s) => s.role)
  const reportingPeriodId = useSessionStore((s) => s.reportingPeriodId)
  const organizationId = explicitOrgId ?? sessionOrg
  const canEdit = portal === 'soe' && hasPermission(role, PERMISSION.ORGANIZATION_EDIT)
  const mode: Mode = canEdit ? 'edit' : 'readonly'

  const periods = useQuery({
    queryKey: ['reporting-periods-label', reportingPeriodId],
    queryFn: async () =>
      reportingPeriodsSeed.find((p) => p.id === reportingPeriodId)?.label ?? reportingPeriodId,
  })

  return {
    organizationId,
    role,
    mode,
    periodLabel: periods.data,
  }
}

function Field({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-xs font-semibold text-soe-slate">{label}</span>
      {children}
    </label>
  )
}

const inputClass =
  'h-10 w-full rounded-md border border-soe-border bg-white px-3 text-sm disabled:bg-[var(--color-pending-soft)]'

export function EnterpriseProfileWorkspace({
  portal,
  organizationId: propOrgId,
}: {
  portal: 'soe' | 'moip'
  organizationId?: string
}) {
  const { organizationId, mode, periodLabel } = useEnterpriseContext(portal, propOrgId)
  const pushToast = useUiStore((s) => s.pushToast)
  const queryClient = useQueryClient()

  const orgQuery = useQuery({
    queryKey: ['organization', organizationId],
    queryFn: () => mockOrganizationService.getOrganization(organizationId),
  })

  const [draft, setDraft] = useState<Organization | null>(null)
  useEffect(() => {
    if (orgQuery.data) setDraft(orgQuery.data)
  }, [orgQuery.data])

  const save = useMutation({
    mutationFn: () => {
      if (!draft) throw new AppError('Nothing to save', 'VALIDATION')
      return mockOrganizationService.updateOrganization(organizationId, draft)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['organization', organizationId] })
      void queryClient.invalidateQueries({ queryKey: ['enterprise-history', organizationId] })
      void queryClient.invalidateQueries({ queryKey: ['enterprise-registry'] })
      pushToast({ title: 'Enterprise profile saved.', tone: 'success' })
    },
    onError: (err: unknown) => {
      pushToast({
        title: err instanceof AppError ? err.message : 'Save failed',
        tone: 'critical',
      })
    },
  })

  if (orgQuery.isLoading || !draft) return <LoadingBlock />
  if (orgQuery.isError) {
    return <ErrorState title="Unable to load enterprise" detail="Mock service error." />
  }

  const readOnly = mode === 'readonly'

  return (
    <div>
      <PageHeader
        title="Enterprise profile"
        subtitle={portal === 'moip' ? 'Read-only oversight view' : 'Identity and administrative relationship'}
        actions={
          !readOnly ? (
            <Button size="sm" onClick={() => save.mutate()} disabled={save.isPending}>
              Save draft
            </Button>
          ) : null
        }
      />
      {portal === 'soe' ? <SoeEnterpriseNav /> : <MoipEnterpriseNav organizationId={organizationId} />}
      <EnterpriseHeader organization={draft} reportingPeriodLabel={periodLabel} />

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-card border border-soe-border bg-white p-4">
          <h3 className="mb-3 text-sm font-semibold text-soe-navy">Basic information</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="SOE name">
              <input
                className={inputClass}
                disabled={readOnly}
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              />
            </Field>
            <Field label="Abbreviation">
              <input className={inputClass} disabled value={draft.abbreviation} />
            </Field>
            <Field label="Company registration">
              <input
                className={inputClass}
                disabled={readOnly}
                value={draft.companyRegistrationNo ?? ''}
                onChange={(e) => setDraft({ ...draft, companyRegistrationNo: e.target.value })}
              />
            </Field>
            <Field label="SECP registration">
              <input
                className={inputClass}
                disabled={readOnly}
                value={draft.secpRegistrationNo ?? ''}
                onChange={(e) => setDraft({ ...draft, secpRegistrationNo: e.target.value })}
              />
            </Field>
            <Field label="NTN">
              <input
                className={inputClass}
                disabled={readOnly}
                value={draft.ntn ?? ''}
                onChange={(e) => setDraft({ ...draft, ntn: e.target.value })}
              />
            </Field>
            <Field label="STRN">
              <input
                className={inputClass}
                disabled={readOnly}
                value={draft.strn ?? ''}
                onChange={(e) => setDraft({ ...draft, strn: e.target.value })}
              />
            </Field>
            <Field label="Date of incorporation">
              <input
                type="date"
                className={inputClass}
                disabled={readOnly}
                value={draft.dateOfIncorporation ?? ''}
                onChange={(e) => setDraft({ ...draft, dateOfIncorporation: e.target.value })}
              />
            </Field>
            <Field label="Legal status">
              <select
                className={inputClass}
                disabled={readOnly}
                value={draft.legalStatus}
                onChange={(e) =>
                  setDraft({ ...draft, legalStatus: e.target.value as LegalStatus })
                }
              >
                {Object.values(LEGAL_STATUS).map((s) => (
                  <option key={s} value={s}>
                    {LEGAL_STATUS_LABEL[s]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Sector">
              <input
                className={inputClass}
                disabled={readOnly}
                value={draft.sector}
                onChange={(e) => setDraft({ ...draft, sector: e.target.value })}
              />
            </Field>
            <Field label="Sub-sector">
              <input
                className={inputClass}
                disabled={readOnly}
                value={draft.subSector ?? ''}
                onChange={(e) => setDraft({ ...draft, subSector: e.target.value })}
              />
            </Field>
            <Field label="Nature of business">
              <input
                className={inputClass}
                disabled={readOnly}
                value={draft.natureOfBusiness ?? ''}
                onChange={(e) => setDraft({ ...draft, natureOfBusiness: e.target.value })}
              />
            </Field>
            <Field label="Enterprise status">
              <select
                className={inputClass}
                disabled={readOnly}
                value={draft.status}
                onChange={(e) => setDraft({ ...draft, status: e.target.value as SoeStatus })}
              >
                {Object.values(SOE_STATUS).map((s) => (
                  <option key={s} value={s}>
                    {SOE_STATUS_LABEL[s]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Website">
              <input
                className={inputClass}
                disabled={readOnly}
                value={draft.website ?? ''}
                onChange={(e) => setDraft({ ...draft, website: e.target.value })}
              />
            </Field>
            <Field label="Corporate email">
              <input
                className={inputClass}
                disabled={readOnly}
                value={draft.corporateEmail ?? ''}
                onChange={(e) => setDraft({ ...draft, corporateEmail: e.target.value })}
              />
            </Field>
          </div>
        </section>

        <section className="rounded-card border border-soe-border bg-white p-4">
          <h3 className="mb-3 text-sm font-semibold text-soe-navy">Administrative relationship</h3>
          <div className="grid gap-3">
            <Field label="Parent ministry">
              <input
                className={inputClass}
                disabled={readOnly}
                value={draft.parentMinistry}
                onChange={(e) => setDraft({ ...draft, parentMinistry: e.target.value })}
              />
            </Field>
            <Field label="Attached department">
              <input
                className={inputClass}
                disabled={readOnly}
                value={draft.attachedDepartment ?? ''}
                onChange={(e) => setDraft({ ...draft, attachedDepartment: e.target.value })}
              />
            </Field>
            <Field label="Administrative ministry">
              <input
                className={inputClass}
                disabled={readOnly}
                value={draft.administrativeMinistry ?? ''}
                onChange={(e) => setDraft({ ...draft, administrativeMinistry: e.target.value })}
              />
            </Field>
            <Field label="Operating ministry">
              <input
                className={inputClass}
                disabled={readOnly}
                value={draft.operatingMinistry ?? ''}
                onChange={(e) => setDraft({ ...draft, operatingMinistry: e.target.value })}
              />
            </Field>
            <Field label="Head office address">
              <input
                className={inputClass}
                disabled={readOnly}
                value={draft.headOfficeAddress}
                onChange={(e) => setDraft({ ...draft, headOfficeAddress: e.target.value })}
              />
            </Field>
          </div>
        </section>
      </div>
    </div>
  )
}

export function EnterpriseOwnershipWorkspace({
  portal,
  organizationId: propOrgId,
}: {
  portal: 'soe' | 'moip'
  organizationId?: string
}) {
  const { organizationId, mode, periodLabel } = useEnterpriseContext(portal, propOrgId)
  const pushToast = useUiStore((s) => s.pushToast)
  const queryClient = useQueryClient()

  const orgQuery = useQuery({
    queryKey: ['organization', organizationId],
    queryFn: () => mockOrganizationService.getOrganization(organizationId),
  })
  const linesQuery = useQuery({
    queryKey: ['ownership-lines', organizationId],
    queryFn: () => mockOrganizationService.getOwnershipLines(organizationId),
  })

  const [lines, setLines] = useState<OwnershipLine[]>([])
  useEffect(() => {
    if (linesQuery.data) setLines(linesQuery.data)
  }, [linesQuery.data])

  const warnings = useMemo(() => validateOwnershipLines(lines), [lines])

  const save = useMutation({
    mutationFn: () => mockOrganizationService.updateOwnershipLines(organizationId, lines),
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: ['ownership-lines', organizationId] })
      void queryClient.invalidateQueries({ queryKey: ['organization', organizationId] })
      void queryClient.invalidateQueries({ queryKey: ['enterprise-history', organizationId] })
      void queryClient.invalidateQueries({ queryKey: ['enterprise-registry'] })
      if (result.warnings.length) {
        pushToast({ title: result.warnings[0], tone: 'warning' })
      } else {
        pushToast({ title: 'Ownership saved.', tone: 'success' })
      }
    },
    onError: (err: unknown) => {
      pushToast({
        title: err instanceof AppError ? err.message : 'Save failed',
        tone: 'critical',
      })
    },
  })

  if (orgQuery.isLoading || linesQuery.isLoading) return <LoadingBlock />
  if (orgQuery.isError || !orgQuery.data) {
    return <ErrorState title="Unable to load ownership" detail="Mock service error." />
  }

  const readOnly = mode === 'readonly'
  const org = orgQuery.data

  return (
    <div>
      <PageHeader
        title="Ownership & shareholding"
        subtitle="Government and other share classes"
        actions={
          !readOnly ? (
            <Button size="sm" onClick={() => save.mutate()} disabled={save.isPending}>
              Save ownership
            </Button>
          ) : null
        }
      />
      {portal === 'soe' ? <SoeEnterpriseNav /> : <MoipEnterpriseNav organizationId={organizationId} />}
      <EnterpriseHeader organization={org} reportingPeriodLabel={periodLabel} />

      <div className="mb-4 grid gap-4 lg:grid-cols-3">
        <div className="rounded-card border border-soe-border bg-white p-4 text-sm">
          <p className="text-xs text-soe-slate">Authorized capital</p>
          <p className="text-lg font-semibold text-soe-navy">
            {formatCurrencyPkr(org.authorizedCapitalPkr ?? 0)}
          </p>
        </div>
        <div className="rounded-card border border-soe-border bg-white p-4 text-sm">
          <p className="text-xs text-soe-slate">Paid-up capital</p>
          <p className="text-lg font-semibold text-soe-navy">
            {formatCurrencyPkr(org.paidUpCapitalPkr ?? 0)}
          </p>
        </div>
        <div className="rounded-card border border-soe-border bg-white p-4 text-sm">
          <p className="text-xs text-soe-slate">Ultimate beneficial owner</p>
          <p className="text-sm font-semibold text-soe-navy">{org.ultimateBeneficialOwner}</p>
        </div>
      </div>

      <section className="mb-4 rounded-card border border-soe-border bg-white p-4">
        <h3 className="mb-2 text-sm font-semibold text-soe-navy">Composition</h3>
        <OwnershipCompositionBar lines={lines} />
        <p className="mt-2 text-xs text-soe-slate">
          Calculated government share (federal + provincial):{' '}
          <strong>{org.governmentOwnershipPct}%</strong>
        </p>
      </section>

      {warnings.length ? (
        <ul className="mb-3 space-y-1 text-sm text-[#8a6414]">
          {warnings.map((w) => (
            <li key={`${w.field}-${w.message}`}>{w.message}</li>
          ))}
        </ul>
      ) : null}

      {!readOnly ? (
        <div className="mb-3 flex justify-end">
          <Button
            size="sm"
            variant="secondary"
            onClick={() =>
              setLines([
                ...lines,
                {
                  id: `own-${organizationId}-${Date.now()}`,
                  organizationId,
                  category: SHAREHOLDER_CATEGORY.PUBLIC,
                  holderName: 'New shareholder',
                  percentage: 0,
                },
              ])
            }
          >
            Add shareholder
          </Button>
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-card border border-soe-border bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-[var(--color-pending-soft)] text-left text-xs uppercase text-soe-slate">
            <tr>
              <th className="px-3 py-2">Category</th>
              <th className="px-3 py-2">Holder</th>
              <th className="px-3 py-2">%</th>
              {!readOnly ? <th className="px-3 py-2">Action</th> : null}
            </tr>
          </thead>
          <tbody>
            {lines.map((line, idx) => (
              <tr key={line.id} className="border-t border-soe-border">
                <td className="px-3 py-2">
                  {readOnly ? (
                    SHAREHOLDER_CATEGORY_LABEL[line.category]
                  ) : (
                    <select
                      className={inputClass}
                      value={line.category}
                      onChange={(e) => {
                        const next = [...lines]
                        next[idx] = {
                          ...line,
                          category: e.target.value as ShareholderCategory,
                        }
                        setLines(next)
                      }}
                    >
                      {Object.values(SHAREHOLDER_CATEGORY).map((c) => (
                        <option key={c} value={c}>
                          {SHAREHOLDER_CATEGORY_LABEL[c]}
                        </option>
                      ))}
                    </select>
                  )}
                </td>
                <td className="px-3 py-2">
                  {readOnly ? (
                    line.holderName
                  ) : (
                    <input
                      className={inputClass}
                      value={line.holderName}
                      onChange={(e) => {
                        const next = [...lines]
                        next[idx] = { ...line, holderName: e.target.value }
                        setLines(next)
                      }}
                    />
                  )}
                </td>
                <td className="px-3 py-2 w-28">
                  {readOnly ? (
                    `${line.percentage}%`
                  ) : (
                    <input
                      type="number"
                      min={0}
                      max={100}
                      className={inputClass}
                      value={line.percentage}
                      onChange={(e) => {
                        const next = [...lines]
                        next[idx] = { ...line, percentage: Number(e.target.value) }
                        setLines(next)
                      }}
                    />
                  )}
                </td>
                {!readOnly ? (
                  <td className="px-3 py-2">
                    <Button
                      size="sm"
                      variant="tertiary"
                      onClick={() => setLines(lines.filter((item) => item.id !== line.id))}
                    >
                      Remove
                    </Button>
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function EnterpriseStructureWorkspace({
  portal,
  organizationId: propOrgId,
}: {
  portal: 'soe' | 'moip'
  organizationId?: string
}) {
  const { organizationId, mode, periodLabel } = useEnterpriseContext(portal, propOrgId)
  const [selectedRelatedId, setSelectedRelatedId] = useState<string | null>(null)
  const [relTypeFilter, setRelTypeFilter] = useState('')
  const pushToast = useUiStore((s) => s.pushToast)
  const queryClient = useQueryClient()

  const orgQuery = useQuery({
    queryKey: ['organization', organizationId],
    queryFn: () => mockOrganizationService.getOrganization(organizationId),
  })
  const relQuery = useQuery({
    queryKey: ['org-rel', organizationId],
    queryFn: () => mockOrganizationService.getRelationships(organizationId),
  })
  const hierarchyQuery = useQuery({
    queryKey: ['hierarchy', organizationId],
    queryFn: () => mockOrganizationService.getHierarchy(organizationId),
  })
  const detailQuery = useQuery({
    queryKey: ['subsidiary-detail', organizationId, selectedRelatedId],
    queryFn: () =>
      mockOrganizationService.getSubsidiaryDetail(organizationId, selectedRelatedId!),
    enabled: Boolean(selectedRelatedId),
  })

  const orgListQuery = useQuery({
    queryKey: ['organizations', 'structure-index'],
    queryFn: () => mockOrganizationService.getOrganizations({ pageSize: 100 }),
  })
  const [relDraft, setRelDraft] = useState<OrganizationRelationship[]>([])
  useEffect(() => {
    if (relQuery.data) setRelDraft(relQuery.data)
  }, [relQuery.data])
  const save = useMutation({
    mutationFn: () => mockOrganizationService.updateRelationships(organizationId, relDraft),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['org-rel', organizationId] })
      void queryClient.invalidateQueries({ queryKey: ['hierarchy', organizationId] })
      void queryClient.invalidateQueries({ queryKey: ['enterprise-history', organizationId] })
      pushToast({ title: 'Corporate structure saved.', tone: 'success' })
    },
    onError: (err: unknown) => {
      pushToast({
        title: err instanceof AppError ? err.message : 'Structure save failed',
        tone: 'critical',
      })
    },
  })

  const orgIndex = useMemo(() => {
    const map = new Map((orgListQuery.data?.items ?? []).map((o) => [o.id, o]))
    return map
  }, [orgListQuery.data])

  const relationships = useMemo(() => {
    let items = relDraft.filter((r) => r.parentOrganizationId === organizationId)
    if (relTypeFilter) items = items.filter((r) => r.relationshipType === relTypeFilter)
    return items
  }, [relDraft, organizationId, relTypeFilter])

  const flatRows = useMemo(
    () => (hierarchyQuery.data ? flattenHierarchy(hierarchyQuery.data) : []),
    [hierarchyQuery.data],
  )

  const relColumns = useMemo<ColumnDef<OrganizationRelationship, unknown>[]>(
    () => [
      {
        id: 'related',
        header: 'Related entity',
        cell: ({ row }) => {
          const related = orgIndex.get(row.original.relatedOrganizationId)
          return related ? `${related.abbreviation} — ${related.name}` : row.original.relatedOrganizationId
        },
      },
      {
        id: 'type',
        header: 'Type',
        cell: ({ row }) => RELATIONSHIP_TYPE_LABEL[row.original.relationshipType],
      },
      {
        accessorKey: 'ownershipPercentage',
        header: 'Ownership %',
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ getValue }) => <StatusBadge status={String(getValue())} />,
      },
      {
        id: 'open',
        header: '',
        cell: ({ row }) => (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setSelectedRelatedId(row.original.relatedOrganizationId)}
          >
            Detail
          </Button>
        ),
      },
    ],
    [orgIndex],
  )

  if (orgQuery.isLoading || hierarchyQuery.isLoading) return <LoadingBlock />
  if (orgQuery.isError || !orgQuery.data) {
    return <ErrorState title="Unable to load structure" detail="Mock service error." />
  }

  const linkBase = portal === 'moip' ? '/moip/enterprise' : undefined

  return (
    <div>
      <PageHeader
        title="Corporate structure"
        subtitle="Hierarchy, subsidiaries, associates and JVs"
        actions={
          mode === 'edit' ? (
            <Button size="sm" loading={save.isPending} onClick={() => save.mutate()}>
              Save structure
            </Button>
          ) : null
        }
      />
      {portal === 'soe' ? <SoeEnterpriseNav /> : <MoipEnterpriseNav organizationId={organizationId} />}
      <EnterpriseHeader organization={orgQuery.data} reportingPeriodLabel={periodLabel} />

      <section className="mb-4 rounded-card border border-soe-border bg-white p-4">
        <h3 className="mb-2 text-sm font-semibold text-soe-navy">Hierarchy</h3>
        {hierarchyQuery.data ? (
          <ul>
            <HierarchyTree node={hierarchyQuery.data} linkBase={linkBase} />
          </ul>
        ) : null}
      </section>

      <section className="mb-4 rounded-card border border-soe-border bg-white p-4">
        <h3 className="mb-2 text-sm font-semibold text-soe-navy">Hierarchy table</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-[var(--color-pending-soft)] text-left text-xs uppercase text-soe-slate">
              <tr>
                <th className="px-3 py-2">Level</th>
                <th className="px-3 py-2">Entity</th>
                <th className="px-3 py-2">Relationship</th>
                <th className="px-3 py-2">%</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {flatRows.map((r) => (
                <tr key={`${r.organizationId}-${r.level}-${r.relationshipType}`} className="border-t border-soe-border">
                  <td className="px-3 py-2">{r.level}</td>
                  <td className="px-3 py-2">
                    {linkBase ? (
                      <Link className="text-soe-navy hover:underline" to={`${linkBase}/${r.organizationId}`}>
                        {r.abbreviation} — {r.name}
                      </Link>
                    ) : (
                      `${r.abbreviation} — ${r.name}`
                    )}
                  </td>
                  <td className="px-3 py-2">{r.relationshipType}</td>
                  <td className="px-3 py-2">{r.ownershipPercentage ?? '—'}</td>
                  <td className="px-3 py-2">
                    <StatusBadge status={r.status} label={SOE_STATUS_LABEL[r.status as SoeStatus]} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="mb-3 flex items-center gap-2">
        <label className="text-xs font-semibold text-soe-slate">Relationship type</label>
        <select
          className="h-9 rounded-md border border-soe-border px-2 text-sm"
          value={relTypeFilter}
          onChange={(e) => setRelTypeFilter(e.target.value)}
        >
          <option value="">All</option>
          {Object.values(RELATIONSHIP_TYPE).map((t) => (
            <option key={t} value={t}>
              {RELATIONSHIP_TYPE_LABEL[t]}
            </option>
          ))}
        </select>
      </div>

      {mode === 'edit' ? (
        <section className="mb-4 rounded-card border border-soe-border bg-white p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-soe-navy">Modify current data</h3>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                const related = orgListQuery.data?.items.find((o) => o.id !== organizationId)
                if (!related) return
                setRelDraft([
                  ...relDraft,
                  {
                    id: `rel-${organizationId}-${Date.now()}`,
                    parentOrganizationId: organizationId,
                    relatedOrganizationId: related.id,
                    relationshipType: RELATIONSHIP_TYPE.SUBSIDIARY,
                    ownershipPercentage: 100,
                    status: 'active',
                  },
                ])
              }}
            >
              Add relationship
            </Button>
          </div>
          <div className="space-y-2">
            {relDraft
              .filter((r) => r.parentOrganizationId === organizationId)
              .map((rel) => (
                <div key={rel.id} className="grid gap-2 rounded-md border border-soe-border p-3 sm:grid-cols-5">
                  <select
                    className={inputClass}
                    value={rel.relatedOrganizationId}
                    onChange={(e) => {
                      const next = [...relDraft]
                      const idx = next.findIndex((r) => r.id === rel.id)
                      next[idx] = { ...rel, relatedOrganizationId: e.target.value }
                      setRelDraft(next)
                    }}
                  >
                    {(orgListQuery.data?.items ?? []).filter((o) => o.id !== organizationId).map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.abbreviation} - {o.name}
                      </option>
                    ))}
                  </select>
                  <select
                    className={inputClass}
                    value={rel.relationshipType}
                    onChange={(e) => {
                      const next = [...relDraft]
                      const idx = next.findIndex((r) => r.id === rel.id)
                      next[idx] = { ...rel, relationshipType: e.target.value as OrganizationRelationship['relationshipType'] }
                      setRelDraft(next)
                    }}
                  >
                    {Object.values(RELATIONSHIP_TYPE).map((t) => (
                      <option key={t} value={t}>
                        {RELATIONSHIP_TYPE_LABEL[t]}
                      </option>
                    ))}
                  </select>
                  <input
                    className={inputClass}
                    min={0}
                    max={100}
                    type="number"
                    value={rel.ownershipPercentage}
                    onChange={(e) => {
                      const next = [...relDraft]
                      const idx = next.findIndex((r) => r.id === rel.id)
                      next[idx] = { ...rel, ownershipPercentage: Number(e.target.value) }
                      setRelDraft(next)
                    }}
                  />
                  <input
                    className={inputClass}
                    value={rel.status}
                    onChange={(e) => {
                      const next = [...relDraft]
                      const idx = next.findIndex((r) => r.id === rel.id)
                      next[idx] = { ...rel, status: e.target.value as typeof rel.status }
                      setRelDraft(next)
                    }}
                  />
                  <Button
                    size="sm"
                    variant="tertiary"
                    onClick={() => setRelDraft(relDraft.filter((r) => r.id !== rel.id))}
                  >
                    Remove
                  </Button>
                </div>
              ))}
          </div>
        </section>
      ) : null}

      {!relationships.length ? (
        <EmptyState title="No direct subsidiaries or related entities." hint="This SOE has no child relationships on file." />
      ) : (
        <DataTable data={relationships} columns={relColumns} searchPlaceholder="Filter relationships…" />
      )}

      {selectedRelatedId && detailQuery.data ? (
        <SubsidiaryDetailPanel detail={detailQuery.data} onClose={() => setSelectedRelatedId(null)} />
      ) : null}
    </div>
  )
}

function SubsidiaryDetailPanel({
  detail,
  onClose,
}: {
  detail: SubsidiaryDetail
  onClose: () => void
}) {
  return (
    <section className="mt-4 rounded-card border border-soe-border bg-white p-4">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-soe-navy">
            {detail.organization.abbreviation} — {detail.organization.name}
          </h3>
          <p className="text-xs text-soe-slate">
            {RELATIONSHIP_TYPE_LABEL[detail.relationship.relationshipType]} ·{' '}
            {detail.relationship.ownershipPercentage}%
          </p>
        </div>
        <Button size="sm" variant="secondary" onClick={onClose}>
          Close
        </Button>
      </div>
      <dl className="grid gap-2 text-sm sm:grid-cols-2">
        <div className="flex justify-between gap-2">
          <dt className="text-soe-slate">Status</dt>
          <dd>
            <StatusBadge
              status={detail.organization.status}
              label={SOE_STATUS_LABEL[detail.organization.status]}
            />
          </dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-soe-slate">Financial statements</dt>
          <dd>{detail.financialStatementAvailable ? 'Available' : 'Not on file'}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-soe-slate">Revenue (latest)</dt>
          <dd>
            {detail.performanceSnapshot.revenue != null
              ? formatCurrencyPkr(detail.performanceSnapshot.revenue)
              : '—'}
          </dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-soe-slate">Net profit (latest)</dt>
          <dd>
            {detail.performanceSnapshot.netProfit != null
              ? formatCurrencyPkr(detail.performanceSnapshot.netProfit)
              : '—'}
          </dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-soe-slate">Capacity utilization</dt>
          <dd>
            {detail.performanceSnapshot.capacityUtilization != null
              ? `${detail.performanceSnapshot.capacityUtilization}%`
              : '—'}
          </dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-soe-slate">Board</dt>
          <dd>
            {detail.boardMemberCount} members · {detail.boardVacancyCount} vacancies
          </dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-soe-slate">Assets</dt>
          <dd>
            {detail.assetsSummary.count} · {formatCurrencyPkr(detail.assetsSummary.bookValueTotal)} book
          </dd>
        </div>
        <div className="flex justify-between gap-2 sm:col-span-2">
          <dt className="text-soe-slate">Liabilities</dt>
          <dd>{detail.liabilitiesNote}</dd>
        </div>
      </dl>
    </section>
  )
}

export function EnterpriseLocationsWorkspace({
  portal,
  organizationId: propOrgId,
}: {
  portal: 'soe' | 'moip'
  organizationId?: string
}) {
  const { organizationId, mode, periodLabel } = useEnterpriseContext(portal, propOrgId)
  const pushToast = useUiStore((s) => s.pushToast)
  const queryClient = useQueryClient()

  const orgQuery = useQuery({
    queryKey: ['organization', organizationId],
    queryFn: () => mockOrganizationService.getOrganization(organizationId),
  })
  const locQuery = useQuery({
    queryKey: ['org-loc', organizationId],
    queryFn: () => mockOrganizationService.getLocations(organizationId),
  })
  const contactQuery = useQuery({
    queryKey: ['org-contacts', organizationId],
    queryFn: () => mockOrganizationService.getContacts(organizationId),
  })
  const [locationDraft, setLocationDraft] = useState<OrganizationLocation[]>([])
  const [contactDraft, setContactDraft] = useState<OrganizationContact[]>([])
  useEffect(() => {
    if (locQuery.data) setLocationDraft(locQuery.data)
  }, [locQuery.data])
  useEffect(() => {
    if (contactQuery.data) setContactDraft(contactQuery.data)
  }, [contactQuery.data])
  const saveLocations = useMutation({
    mutationFn: () => mockOrganizationService.updateLocations(organizationId, locationDraft),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['org-loc', organizationId] })
      void queryClient.invalidateQueries({ queryKey: ['enterprise-history', organizationId] })
      pushToast({ title: 'Locations saved.', tone: 'success' })
    },
    onError: (err: unknown) => {
      pushToast({
        title: err instanceof AppError ? err.message : 'Location save failed',
        tone: 'critical',
      })
    },
  })
  const saveContacts = useMutation({
    mutationFn: () => mockOrganizationService.updateContacts(organizationId, contactDraft),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['org-contacts', organizationId] })
      void queryClient.invalidateQueries({ queryKey: ['enterprise-history', organizationId] })
      pushToast({ title: 'Contacts saved.', tone: 'success' })
    },
    onError: (err: unknown) => {
      pushToast({
        title: err instanceof AppError ? err.message : 'Contact save failed',
        tone: 'critical',
      })
    },
  })

  const features: GeoFeature[] = useMemo(
    () =>
      locationDraft.map((l) => ({
        id: l.id,
        assetId: l.id,
        organizationId: l.organizationId,
        type: 'Point' as const,
        coordinates: [l.longitude, l.latitude],
        label: l.label,
      })),
    [locationDraft],
  )

  if (orgQuery.isLoading) return <LoadingBlock />
  if (orgQuery.isError || !orgQuery.data) {
    return <ErrorState title="Unable to load locations" detail="Mock service error." />
  }

  return (
    <div>
      <PageHeader
        title="Locations & contacts"
        subtitle="Head office, provincial offices and plants"
        actions={
          mode === 'edit' ? (
            <div className="flex flex-wrap gap-2">
              <Button size="sm" loading={saveLocations.isPending} onClick={() => saveLocations.mutate()}>
                Save locations
              </Button>
              <Button size="sm" variant="secondary" loading={saveContacts.isPending} onClick={() => saveContacts.mutate()}>
                Save contacts
              </Button>
            </div>
          ) : null
        }
      />
      {portal === 'soe' ? <SoeEnterpriseNav /> : <MoipEnterpriseNav organizationId={organizationId} />}
      <EnterpriseHeader organization={orgQuery.data} reportingPeriodLabel={periodLabel} />

      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <section className="rounded-card border border-soe-border bg-white p-4">
          <h3 className="mb-2 text-sm font-semibold text-soe-navy">Locations</h3>
          <ul className="space-y-2 text-sm">
            {locationDraft.map((l) => (
              <li key={l.id} className="border-b border-soe-border pb-2 last:border-0">
                <p className="font-medium text-soe-navy">{l.label}</p>
                <p className="text-xs text-soe-slate">
                  {l.kind.replaceAll('_', ' ')} · {l.district}, {l.province}
                  {l.address ? ` · ${l.address}` : ''}
                </p>
                <p className="text-xs text-soe-slate">
                  {l.latitude.toFixed(4)}, {l.longitude.toFixed(4)}
                </p>
              </li>
            ))}
          </ul>
          {mode === 'edit' ? (
            <div className="mt-4 space-y-2">
              <div className="flex justify-between gap-2">
                <h4 className="text-xs font-semibold text-soe-slate">Modify current data</h4>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() =>
                    setLocationDraft([
                      ...locationDraft,
                      {
                        id: `loc-${organizationId}-${Date.now()}`,
                        organizationId,
                        label: 'New location',
                        kind: 'regional_office',
                        province: '',
                        district: '',
                        address: '',
                        latitude: 0,
                        longitude: 0,
                      },
                    ])
                  }
                >
                  Add location
                </Button>
              </div>
              {locationDraft.map((l) => (
                <div key={l.id} className="grid gap-2 rounded-md border border-soe-border p-3 sm:grid-cols-2">
                  <input className={inputClass} value={l.label} onChange={(e) => setLocationDraft(locationDraft.map((row) => row.id === l.id ? { ...row, label: e.target.value } : row))} />
                  <select className={inputClass} value={l.kind} onChange={(e) => setLocationDraft(locationDraft.map((row) => row.id === l.id ? { ...row, kind: e.target.value as OrganizationLocation['kind'] } : row))}>
                    {['head_office', 'factory', 'warehouse', 'regional_office', 'provincial_office'].map((kind) => (
                      <option key={kind} value={kind}>{kind.replaceAll('_', ' ')}</option>
                    ))}
                  </select>
                  <input className={inputClass} placeholder="Province" value={l.province} onChange={(e) => setLocationDraft(locationDraft.map((row) => row.id === l.id ? { ...row, province: e.target.value } : row))} />
                  <input className={inputClass} placeholder="District" value={l.district} onChange={(e) => setLocationDraft(locationDraft.map((row) => row.id === l.id ? { ...row, district: e.target.value } : row))} />
                  <input className={inputClass} placeholder="Address" value={l.address ?? ''} onChange={(e) => setLocationDraft(locationDraft.map((row) => row.id === l.id ? { ...row, address: e.target.value } : row))} />
                  <Button size="sm" variant="tertiary" onClick={() => setLocationDraft(locationDraft.filter((row) => row.id !== l.id))}>
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          ) : null}
        </section>
        <section className="rounded-card border border-soe-border bg-white p-4">
          <h3 className="mb-2 text-sm font-semibold text-soe-navy">Contacts</h3>
          <ul className="space-y-2 text-sm">
            {contactDraft.map((c) => (
              <li key={c.id}>
                <p className="font-medium text-soe-navy">
                  {c.name}
                  {c.isPrimary ? ' (primary)' : ''}
                </p>
                <p className="text-xs text-soe-slate">
                  {c.designation} · {c.email} · {c.phone}
                </p>
              </li>
            ))}
          </ul>
          {mode === 'edit' ? (
            <div className="mt-4 space-y-2">
              <div className="flex justify-between gap-2">
                <h4 className="text-xs font-semibold text-soe-slate">Modify current data</h4>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() =>
                    setContactDraft([
                      ...contactDraft,
                      {
                        id: `contact-${organizationId}-${Date.now()}`,
                        organizationId,
                        name: 'New contact',
                        designation: '',
                        email: '',
                        phone: '',
                        isPrimary: false,
                      },
                    ])
                  }
                >
                  Add contact
                </Button>
              </div>
              {contactDraft.map((c) => (
                <div key={c.id} className="grid gap-2 rounded-md border border-soe-border p-3 sm:grid-cols-2">
                  <input className={inputClass} value={c.name} onChange={(e) => setContactDraft(contactDraft.map((row) => row.id === c.id ? { ...row, name: e.target.value } : row))} />
                  <input className={inputClass} placeholder="Designation" value={c.designation} onChange={(e) => setContactDraft(contactDraft.map((row) => row.id === c.id ? { ...row, designation: e.target.value } : row))} />
                  <input className={inputClass} placeholder="Email" value={c.email} onChange={(e) => setContactDraft(contactDraft.map((row) => row.id === c.id ? { ...row, email: e.target.value } : row))} />
                  <input className={inputClass} placeholder="Phone" value={c.phone} onChange={(e) => setContactDraft(contactDraft.map((row) => row.id === c.id ? { ...row, phone: e.target.value } : row))} />
                  <label className="flex items-center gap-2 text-sm text-soe-slate">
                    <input type="checkbox" checked={c.isPrimary} onChange={(e) => setContactDraft(contactDraft.map((row) => row.id === c.id ? { ...row, isPrimary: e.target.checked } : row))} />
                    Primary contact
                  </label>
                  <Button size="sm" variant="tertiary" onClick={() => setContactDraft(contactDraft.filter((row) => row.id !== c.id))}>
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          ) : null}
        </section>
      </div>

      <section className="rounded-card border border-soe-border bg-white p-4">
        <h3 className="mb-2 text-sm font-semibold text-soe-navy">Map preview</h3>
        <MapPreview features={features} />
      </section>
    </div>
  )
}

export function EnterpriseHistoryWorkspace({
  portal,
  organizationId: propOrgId,
}: {
  portal: 'soe' | 'moip'
  organizationId?: string
}) {
  const { organizationId, periodLabel } = useEnterpriseContext(portal, propOrgId)

  const orgQuery = useQuery({
    queryKey: ['organization', organizationId],
    queryFn: () => mockOrganizationService.getOrganization(organizationId),
  })
  const historyQuery = useQuery({
    queryKey: ['enterprise-history', organizationId],
    queryFn: () => mockOrganizationService.getHistory(organizationId),
  })

  const columns = useMemo<ColumnDef<EnterpriseHistoryEvent, unknown>[]>(
    () => [
      { accessorKey: 'occurredAt', header: 'Date' },
      {
        accessorKey: 'eventType',
        header: 'Event',
        cell: ({ getValue }) => String(getValue()).replaceAll('_', ' '),
      },
      { accessorKey: 'summary', header: 'Summary' },
      { accessorKey: 'actorLabel', header: 'Actor' },
    ],
    [],
  )

  if (orgQuery.isLoading) return <LoadingBlock />
  if (orgQuery.isError || !orgQuery.data) {
    return <ErrorState title="Unable to load history" detail="Mock service error." />
  }

  return (
    <div>
      <PageHeader
        title="Enterprise history"
        subtitle="Representative master-data events (Phase 12 deepens evidence)"
      />
      {portal === 'soe' ? <SoeEnterpriseNav /> : <MoipEnterpriseNav organizationId={organizationId} />}
      <EnterpriseHeader organization={orgQuery.data} reportingPeriodLabel={periodLabel} />
      <DataTable
        data={historyQuery.data ?? []}
        columns={columns}
        isLoading={historyQuery.isLoading}
        searchPlaceholder="Search history…"
      />
      <p className="mt-2 text-xs text-soe-slate">
        Event types: {Object.values(ENTERPRISE_HISTORY_EVENT).join(', ').replaceAll('_', ' ')}
      </p>
    </div>
  )
}

export function MoipEnterpriseHubPage() {
  const organizationId = useSessionStore((s) => s.organizationId)
  return <EnterpriseProfileWorkspace portal="moip" organizationId={organizationId} />
}

export function MoipEnterpriseProfilePage() {
  const { organizationId = '' } = useParams()
  return <EnterpriseProfileWorkspace portal="moip" organizationId={organizationId} />
}

export function MoipEnterpriseOwnershipPage() {
  const { organizationId = '' } = useParams()
  return <EnterpriseOwnershipWorkspace portal="moip" organizationId={organizationId} />
}

export function MoipEnterpriseStructurePage() {
  const { organizationId = '' } = useParams()
  return <EnterpriseStructureWorkspace portal="moip" organizationId={organizationId} />
}

export function MoipEnterpriseLocationsPage() {
  const { organizationId = '' } = useParams()
  return <EnterpriseLocationsWorkspace portal="moip" organizationId={organizationId} />
}

export function MoipEnterpriseHistoryPage() {
  const { organizationId = '' } = useParams()
  return <EnterpriseHistoryWorkspace portal="moip" organizationId={organizationId} />
}
