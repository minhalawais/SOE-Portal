import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { EnterpriseHeader } from '@/components/enterprise/EnterpriseHeader'
import { ContributorEntryLayout, ContributorModuleLayout, EntryFormSection, EntryFormShell, ExecutiveModuleSectionNav, useScrollToEntryOnSelect } from '@/components/soe'
import {
  MoipEnterpriseNav,
} from '@/components/enterprise/EnterpriseSectionNav'
import { flattenHierarchy, HierarchyTree } from '@/components/enterprise/HierarchyTree'
import { UnitLocationPolygonPicker } from '@/components/gis/UnitLocationPolygonPicker'
import { PageHeader } from '@/components/layout/PageHeader'
import { DataTable } from '@/components/tables/DataTable'
import { Button } from '@/design-system/components/Button'
import { EmptyState, ErrorState, LoadingBlock } from '@/design-system/components/Feedback'
import { SelectField, CurrencyField, TextField } from '@/design-system/components/Fields'
import { StatusBadge } from '@/design-system/components/StatusBadge'
import {
  ENTERPRISE_HISTORY_EVENT,
  LEGAL_STATUS,
  LEGAL_STATUS_LABEL,
  MODULE,
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
import { cn } from '@/utils'
import type {
  EnterpriseHistoryEvent,
  Organization,
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

const inputClass =
  'h-10 w-full rounded-md border border-soe-border bg-white px-3 text-sm disabled:bg-[var(--color-pending-soft)]'

function EnterpriseEntryShell({
  portal,
  title,
  subtitle,
  sectionNav,
  onSave,
  saving,
  readOnly,
  saveLabel = 'Save draft',
  children,
}: {
  portal: 'soe' | 'moip'
  title: string
  subtitle: string
  sectionNav?: ReactNode
  onSave?: () => void
  saving?: boolean
  readOnly: boolean
  saveLabel?: string
  children: ReactNode
}) {
  if (portal === 'soe') {
    return (
      <ContributorEntryLayout
        moduleId={MODULE.ENTERPRISE}
        title={title}
        sectionNav={sectionNav}
        onSave={!readOnly ? onSave : undefined}
        saving={saving}
        saveLabel={saveLabel}
        showFormActions={!readOnly}
      >
        {children}
      </ContributorEntryLayout>
    )
  }

  return (
    <div>
      <PageHeader
        title={title}
        subtitle={subtitle}
        actions={
          !readOnly && onSave ? (
            <Button size="sm" onClick={onSave} disabled={saving}>
              {saveLabel}
            </Button>
          ) : null
        }
      />
      {sectionNav}
      {children}
    </div>
  )
}

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
    if (orgQuery.data) {
      if (mode === 'readonly') {
        setDraft(orgQuery.data)
      } else {
        setDraft({
          ...orgQuery.data,
          name: '',
          abbreviation: '',
          companyRegistrationNo: '',
          secpRegistrationNo: '',
          ntn: '',
          strn: '',
          dateOfIncorporation: '',
          sector: '',
          subSector: '',
          natureOfBusiness: '',
          website: '',
          corporateEmail: '',
          parentMinistry: '',
          attachedDepartment: '',
          administrativeMinistry: '',
          operatingMinistry: '',
          headOfficeAddress: '',
        })
      }
    }
  }, [orgQuery.data, mode])

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
  const sectionNav =
    portal === 'moip' ? (
      <MoipEnterpriseNav organizationId={organizationId} />
    ) : (
      <ExecutiveModuleSectionNav moduleId="soe-enterprise" />
    )

  return (
    <EnterpriseEntryShell
      portal={portal}
      title="Enterprise profile"
      subtitle={
        portal === 'moip' ? 'Read-only oversight view' : 'Identity and administrative relationship'
      }
      sectionNav={sectionNav}
      onSave={() => save.mutate()}
      saving={save.isPending}
      readOnly={readOnly}
    >
      <EnterpriseHeader organization={draft} reportingPeriodLabel={periodLabel} />

      <EntryFormShell
        title="Enterprise profile"
        subtitle={readOnly ? (draft.name || orgQuery.data?.name) : (draft.name || 'New Profile')}
        meta={readOnly ? (draft.abbreviation || orgQuery.data?.abbreviation) : draft.abbreviation}
        mode={readOnly ? 'view' : 'edit'}
      >
        <EntryFormSection title="Basic information" />
          <TextField
            label="SOE name"
            disabled={readOnly}
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          />
          <TextField
            label="Abbreviation"
            disabled={readOnly}
            value={draft.abbreviation}
            onChange={(e) => setDraft({ ...draft, abbreviation: e.target.value })}
          />
          <TextField
            label="Company registration"
            disabled={readOnly}
            value={draft.companyRegistrationNo ?? ''}
            onChange={(e) => setDraft({ ...draft, companyRegistrationNo: e.target.value })}
          />
          <TextField
            label="SECP registration"
            disabled={readOnly}
            value={draft.secpRegistrationNo ?? ''}
            onChange={(e) => setDraft({ ...draft, secpRegistrationNo: e.target.value })}
          />
          <TextField
            label="NTN"
            disabled={readOnly}
            value={draft.ntn ?? ''}
            onChange={(e) => setDraft({ ...draft, ntn: e.target.value })}
          />
          <TextField
            label="STRN"
            disabled={readOnly}
            value={draft.strn ?? ''}
            onChange={(e) => setDraft({ ...draft, strn: e.target.value })}
          />
          <TextField
            label="Date of incorporation"
            type="date"
            disabled={readOnly}
            value={draft.dateOfIncorporation ?? ''}
            onChange={(e) => setDraft({ ...draft, dateOfIncorporation: e.target.value })}
          />
          <SelectField
            label="Legal status"
            disabled={readOnly}
            value={draft.legalStatus}
            options={Object.values(LEGAL_STATUS).map((s) => ({
              value: s,
              label: LEGAL_STATUS_LABEL[s],
            }))}
            onChange={(e) =>
              setDraft({ ...draft, legalStatus: e.target.value as LegalStatus })
            }
          />
          <TextField
            label="Sector"
            disabled={readOnly}
            value={draft.sector}
            onChange={(e) => setDraft({ ...draft, sector: e.target.value })}
          />
          <TextField
            label="Sub-sector"
            disabled={readOnly}
            value={draft.subSector ?? ''}
            onChange={(e) => setDraft({ ...draft, subSector: e.target.value })}
          />
          <TextField
            label="Nature of business"
            disabled={readOnly}
            value={draft.natureOfBusiness ?? ''}
            onChange={(e) => setDraft({ ...draft, natureOfBusiness: e.target.value })}
          />
          <SelectField
            label="Enterprise status"
            disabled={readOnly}
            value={draft.status}
            options={Object.values(SOE_STATUS).map((s) => ({
              value: s,
              label: SOE_STATUS_LABEL[s],
            }))}
            onChange={(e) => setDraft({ ...draft, status: e.target.value as SoeStatus })}
          />
          <TextField
            label="Website"
            disabled={readOnly}
            value={draft.website ?? ''}
            onChange={(e) => setDraft({ ...draft, website: e.target.value })}
          />
          <TextField
            label="Corporate email"
            disabled={readOnly}
            value={draft.corporateEmail ?? ''}
            onChange={(e) => setDraft({ ...draft, corporateEmail: e.target.value })}
          />
        <EntryFormSection title="Administrative relationship" />
          <TextField
            label="Parent ministry"
            disabled={readOnly}
            value={draft.parentMinistry}
            onChange={(e) => setDraft({ ...draft, parentMinistry: e.target.value })}
          />
          <TextField
            label="Attached department"
            disabled={readOnly}
            value={draft.attachedDepartment ?? ''}
            onChange={(e) => setDraft({ ...draft, attachedDepartment: e.target.value })}
          />
          <TextField
            label="Administrative ministry"
            disabled={readOnly}
            value={draft.administrativeMinistry ?? ''}
            onChange={(e) => setDraft({ ...draft, administrativeMinistry: e.target.value })}
          />
          <TextField
            label="Operating ministry"
            disabled={readOnly}
            value={draft.operatingMinistry ?? ''}
            onChange={(e) => setDraft({ ...draft, operatingMinistry: e.target.value })}
          />
          <TextField
            label="Head office address"
            disabled={readOnly}
            value={draft.headOfficeAddress}
            onChange={(e) => setDraft({ ...draft, headOfficeAddress: e.target.value })}
          />
      </EntryFormShell>
    </EnterpriseEntryShell>
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
  const sectionNav =
    portal === 'moip' ? (
      <MoipEnterpriseNav organizationId={organizationId} />
    ) : (
      <ExecutiveModuleSectionNav moduleId="soe-enterprise" />
    )

  return (
    <EnterpriseEntryShell
      portal={portal}
      title="Ownership & shareholding"
      subtitle="Government and other share classes"
      sectionNav={sectionNav}
      onSave={() => save.mutate()}
      saving={save.isPending}
      readOnly={readOnly}
      saveLabel="Save ownership"
    >
      <EnterpriseHeader organization={org} reportingPeriodLabel={periodLabel} />

      {portal !== 'soe' ? (
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
      ) : null}

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
    </EnterpriseEntryShell>
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
  const [hierarchyView, setHierarchyView] = useState<'tree' | 'table'>('tree')
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
    queryFn: () => mockOrganizationService.getOrganizations({ pageSize: 250 }),
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

  const relatedEnterpriseOptions = useMemo(() => {
    const items = orgListQuery.data?.items ?? []
    return items.filter(
      (org) =>
        org.id !== organizationId &&
        (org.parentEntityId === organizationId ||
          relDraft.some((rel) => rel.relatedOrganizationId === org.id)),
    )
  }, [orgListQuery.data, organizationId, relDraft])

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
  const sectionNav =
    portal === 'moip' ? (
      <MoipEnterpriseNav organizationId={organizationId} />
    ) : (
      <ExecutiveModuleSectionNav moduleId="soe-enterprise" />
    )

  return (
    <EnterpriseEntryShell
      portal={portal}
      title="Corporate structure"
      subtitle="Hierarchy, subsidiaries, associates and JVs"
      sectionNav={sectionNav}
      onSave={() => save.mutate()}
      saving={save.isPending}
      readOnly={mode === 'readonly'}
      saveLabel="Save structure"
    >
      <EnterpriseHeader organization={orgQuery.data} reportingPeriodLabel={periodLabel} />

      <section className="mb-4 rounded-card border border-soe-border bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-soe-navy">Hierarchy</h3>
          <div className="flex items-center gap-1 rounded-md bg-soe-canvas p-1">
            <button
              type="button"
              className={cn(
                'rounded px-2.5 py-1 text-xs font-medium transition',
                hierarchyView === 'tree'
                  ? 'bg-white text-soe-navy shadow-sm'
                  : 'text-soe-slate hover:text-soe-navy',
              )}
              onClick={() => setHierarchyView('tree')}
            >
              Tree view
            </button>
            <button
              type="button"
              className={cn(
                'rounded px-2.5 py-1 text-xs font-medium transition',
                hierarchyView === 'table'
                  ? 'bg-white text-soe-navy shadow-sm'
                  : 'text-soe-slate hover:text-soe-navy',
              )}
              onClick={() => setHierarchyView('table')}
            >
              Table view
            </button>
          </div>
        </div>

        {hierarchyView === 'tree' ? (
          hierarchyQuery.data ? (
            <ul>
              <HierarchyTree node={hierarchyQuery.data} linkBase={linkBase} />
            </ul>
          ) : null
        ) : (
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
                  <tr
                    key={`${r.organizationId}-${r.level}-${r.relationshipType}`}
                    className="border-t border-soe-border"
                  >
                    <td className="px-3 py-2">{r.level}</td>
                    <td className="px-3 py-2">
                      {linkBase ? (
                        <Link
                          className="text-soe-navy hover:underline"
                          to={`${linkBase}/${r.organizationId}`}
                        >
                          {r.abbreviation} — {r.name}
                        </Link>
                      ) : (
                        `${r.abbreviation} — ${r.name}`
                      )}
                    </td>
                    <td className="px-3 py-2">{r.relationshipType}</td>
                    <td className="px-3 py-2">{r.ownershipPercentage ?? '—'}</td>
                    <td className="px-3 py-2">
                      <StatusBadge
                        status={r.status}
                        label={SOE_STATUS_LABEL[r.status as SoeStatus]}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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
                const related = relatedEnterpriseOptions.find(
                  (org) => !relDraft.some((rel) => rel.relatedOrganizationId === org.id),
                )
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
                    {(relatedEnterpriseOptions.length
                      ? relatedEnterpriseOptions
                      : (orgListQuery.data?.items ?? []).filter((o) => o.id !== organizationId)
                    ).map((o) => (
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
        <SubsidiaryDetailPanel
          parentOrganizationId={organizationId}
          detail={detailQuery.data}
          onClose={() => setSelectedRelatedId(null)}
          onSaved={() => {
            void queryClient.invalidateQueries({
              queryKey: ['subsidiary-detail', organizationId, selectedRelatedId],
            })
          }}
        />
      ) : null}
    </EnterpriseEntryShell>
  )
}

function SubsidiaryDetailPanel({
  parentOrganizationId,
  detail,
  onClose,
  onSaved,
}: {
  parentOrganizationId: string
  detail: SubsidiaryDetail
  onClose: () => void
  onSaved: () => void
}) {
  const role = useSessionStore((s) => s.role)
  const canEdit = hasPermission(role, PERMISSION.ORGANIZATION_EDIT)
  const pushToast = useUiStore((s) => s.pushToast)
  const [draft, setDraft] = useState(detail.relationship)

  useEffect(() => {
    setDraft(detail.relationship)
  }, [detail.relationship])

  const save = useMutation({
    mutationFn: () =>
      mockOrganizationService.updateSubsidiaryRelationship(
        parentOrganizationId,
        detail.organization.id,
        {
          reportingContact: draft.reportingContact,
          performanceNotes: draft.performanceNotes,
          revenueReported: draft.revenueReported,
          netProfitReported: draft.netProfitReported,
          capacityUtilizationReported: draft.capacityUtilizationReported,
        },
      ),
    onSuccess: () => {
      pushToast({ title: 'Subsidiary reporting saved.', tone: 'success' })
      onSaved()
    },
    onError: (err: unknown) => {
      pushToast({
        title: err instanceof AppError ? err.message : 'Save failed',
        tone: 'critical',
      })
    },
  })

  const revenue =
    draft.revenueReported ?? detail.performanceSnapshot.revenue
  const netProfit =
    draft.netProfitReported ?? detail.performanceSnapshot.netProfit
  const capacity =
    draft.capacityUtilizationReported ?? detail.performanceSnapshot.capacityUtilization

  return (
    <section className="mt-4 rounded-card border border-soe-border bg-[var(--color-canvas)] p-4">
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
      <EntryFormShell title="Subsidiary reporting" mode={canEdit ? 'edit' : 'view'}>
        <EntryFormSection title="Contact" />
        <TextField
          label="Reporting contact"
          value={draft.reportingContact ?? ''}
          disabled={!canEdit}
          onChange={(e) => setDraft({ ...draft, reportingContact: e.target.value })}
        />
        <EntryFormSection title="Reported performance" />
        <CurrencyField
          label="Revenue PKR"
          value={draft.revenueReported ?? ''}
          disabled={!canEdit}
          onChange={(e) =>
            setDraft({
              ...draft,
              revenueReported: e.target.value === '' ? undefined : Number(e.target.value),
            })
          }
        />
        <CurrencyField
          label="Net profit PKR"
          value={draft.netProfitReported ?? ''}
          disabled={!canEdit}
          onChange={(e) =>
            setDraft({
              ...draft,
              netProfitReported: e.target.value === '' ? undefined : Number(e.target.value),
            })
          }
        />
        <TextField
          label="Capacity utilization %"
          type="number"
          value={draft.capacityUtilizationReported ?? ''}
          disabled={!canEdit}
          onChange={(e) =>
            setDraft({
              ...draft,
              capacityUtilizationReported:
                e.target.value === '' ? undefined : Number(e.target.value),
            })
          }
        />
        <TextField
          label="Performance notes"
          value={draft.performanceNotes ?? ''}
          disabled={!canEdit}
          onChange={(e) => setDraft({ ...draft, performanceNotes: e.target.value })}
        />
      </EntryFormShell>
      <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
        <div className="flex justify-between gap-2">
          <dt className="text-soe-slate">Effective revenue</dt>
          <dd>{revenue != null ? formatCurrencyPkr(revenue) : '—'}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-soe-slate">Effective net profit</dt>
          <dd>{netProfit != null ? formatCurrencyPkr(netProfit) : '—'}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-soe-slate">Capacity utilization</dt>
          <dd>{capacity != null ? `${capacity}%` : '—'}</dd>
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
      </dl>
      {canEdit ? (
        <div className="mt-3 flex justify-end">
          <Button size="sm" disabled={save.isPending} onClick={() => save.mutate()}>
            Save subsidiary reporting
          </Button>
        </div>
      ) : null}
    </section>
  )
}

const UNIT_KIND_OPTIONS: Array<{ value: OrganizationLocation['kind']; label: string }> = [
  { value: 'head_office', label: 'Head office' },
  { value: 'factory', label: 'Industrial unit' },
  { value: 'warehouse', label: 'Warehouse' },
  { value: 'regional_office', label: 'Regional office' },
  { value: 'provincial_office', label: 'Provincial office' },
]

function emptyUnitLocation(organizationId: string): OrganizationLocation {
  return {
    id: '',
    organizationId,
    label: '',
    kind: 'factory',
    province: '',
    district: '',
    address: '',
    latitude: 0,
    longitude: 0,
  }
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
  const canEdit = mode === 'edit'

  const orgQuery = useQuery({
    queryKey: ['organization', organizationId],
    queryFn: () => mockOrganizationService.getOrganization(organizationId),
  })
  const locQuery = useQuery({
    queryKey: ['org-loc', organizationId],
    queryFn: () => mockOrganizationService.getLocations(organizationId),
  })

  const locations = locQuery.data ?? []
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [draft, setDraft] = useState<OrganizationLocation>(() => emptyUnitLocation(organizationId))
  const isCreate = !selectedId
  useScrollToEntryOnSelect(selectedId)

  useEffect(() => {
    setDraft(emptyUnitLocation(organizationId))
    setSelectedId(null)
  }, [organizationId])

  useEffect(() => {
    if (!selectedId) {
      setDraft(emptyUnitLocation(organizationId))
      return
    }
    const current = locations.find((row) => row.id === selectedId)
    if (current) setDraft(current)
  }, [locations, organizationId, selectedId])

  const save = useMutation({
    mutationFn: () => {
      if (!draft.label.trim() || !draft.province.trim() || !draft.district.trim()) {
        throw new AppError('Unit name, province and district are required', 'VALIDATION')
      }
      if (!draft.polygon || draft.polygon.length < 3) {
        throw new AppError('Select a unit footprint polygon on the map', 'VALIDATION')
      }
      const nextRecord: OrganizationLocation = {
        ...draft,
        organizationId,
        id: draft.id || `loc-${organizationId}-${Date.now()}`,
        label: draft.label.trim(),
      }
      const nextList = isCreate
        ? [...locations, nextRecord]
        : locations.map((row) => (row.id === nextRecord.id ? nextRecord : row))
      return mockOrganizationService.updateLocations(organizationId, nextList)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['org-loc', organizationId] })
      void queryClient.invalidateQueries({ queryKey: ['enterprise-history', organizationId] })
      setSelectedId(null)
      setDraft(emptyUnitLocation(organizationId))
      pushToast({ title: isCreate ? 'Unit location added.' : 'Unit location saved.', tone: 'success' })
    },
    onError: (err: unknown) => {
      pushToast({
        title: err instanceof AppError ? err.message : 'Location save failed',
        tone: 'critical',
      })
    },
  })

  const columns = useMemo<ColumnDef<OrganizationLocation, unknown>[]>(
    () => [
      {
        accessorKey: 'label',
        header: 'Unit',
        cell: ({ row }) =>
          canEdit ? (
            <button
              type="button"
              className="text-left font-medium text-soe-navy hover:underline"
              onClick={() => setSelectedId(row.original.id)}
            >
              {row.original.label}
            </button>
          ) : (
            row.original.label
          ),
      },
      {
        accessorKey: 'kind',
        header: 'Type',
        cell: ({ getValue }) =>
          UNIT_KIND_OPTIONS.find((option) => option.value === getValue())?.label ??
          String(getValue()).replaceAll('_', ' '),
      },
      { accessorKey: 'district', header: 'District' },
      { accessorKey: 'province', header: 'Province' },
      {
        accessorKey: 'address',
        header: 'Address',
        cell: ({ getValue }) => String(getValue() || '—'),
      },
    ],
    [canEdit],
  )

  if (orgQuery.isLoading) return <LoadingBlock />
  if (orgQuery.isError || !orgQuery.data) {
    return <ErrorState title="Unable to load locations" detail="Mock service error." />
  }

  const sectionNav =
    portal === 'moip' ? (
      <MoipEnterpriseNav organizationId={organizationId} />
    ) : (
      <ExecutiveModuleSectionNav moduleId="soe-enterprise" />
    )

  const saveDisabled =
    !draft.label.trim() ||
    !draft.province.trim() ||
    !draft.district.trim() ||
    !draft.polygon ||
    draft.polygon.length < 3

  const entry = (
    <EntryFormShell
      title="Unit location"
      subtitle={isCreate ? 'New operating unit' : draft.label}
      mode={canEdit ? (isCreate ? 'create' : 'edit') : 'view'}
    >
      <EntryFormSection title="Unit details" />
      <TextField
        label="Unit name"
        value={draft.label}
        disabled={!canEdit}
        required
        onChange={(event) => setDraft({ ...draft, label: event.target.value })}
      />
      <SelectField
        label="Unit type"
        value={draft.kind}
        disabled={!canEdit}
        options={UNIT_KIND_OPTIONS}
        onChange={(event) =>
          setDraft({ ...draft, kind: event.target.value as OrganizationLocation['kind'] })
        }
      />
      <TextField
        label="Province"
        value={draft.province}
        disabled={!canEdit}
        required
        onChange={(event) => setDraft({ ...draft, province: event.target.value })}
      />
      <TextField
        label="District"
        value={draft.district}
        disabled={!canEdit}
        required
        onChange={(event) => setDraft({ ...draft, district: event.target.value })}
      />
      <TextField
        label="Address"
        value={draft.address ?? ''}
        disabled={!canEdit}
        onChange={(event) => setDraft({ ...draft, address: event.target.value })}
      />
      <EntryFormSection title="Footprint on map" />
      <div className="col-span-full">
        <UnitLocationPolygonPicker
          kind={draft.kind}
          selectedPolygon={draft.polygon}
          existing={locations.filter((row) => row.id !== draft.id)}
          disabled={!canEdit}
          onSelect={(selection) =>
            setDraft({
              ...draft,
              province: draft.province || selection.province,
              district: draft.district || selection.district,
              latitude: selection.latitude,
              longitude: selection.longitude,
              polygon: selection.polygon,
              label: draft.label || `${selection.label} unit`,
            })
          }
        />
      </div>
    </EntryFormShell>
  )

  return (
    <ContributorModuleLayout
      moduleId={MODULE.ENTERPRISE}
      title="Locations"
      sectionNav={sectionNav}
      alerts={<EnterpriseHeader organization={orgQuery.data} reportingPeriodLabel={periodLabel} />}
      entry={entry}
      onSave={canEdit ? () => save.mutate() : undefined}
      onCancel={canEdit && !isCreate ? () => setSelectedId(null) : undefined}
      saving={save.isPending}
      saveDisabled={saveDisabled}
      showFormActions={canEdit}
      saveLabel={isCreate ? 'Add location' : 'Save location'}
      cancelLabel="Clear form"
      actions={
        canEdit && selectedId ? (
          <Button size="sm" variant="secondary" onClick={() => setSelectedId(null)}>
            Add new
          </Button>
        ) : null
      }
      registryTitle="Added units"
      registry={
        <DataTable
          data={locations}
          columns={columns}
          isLoading={locQuery.isLoading}
          searchPlaceholder="Search units…"
          selectedRowId={selectedId}
          getRowId={(row) => row.id}
          emptyTitle="No unit locations added yet."
        />
      }
    />
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
      {portal === 'moip' ? (
        <MoipEnterpriseNav organizationId={organizationId} />
      ) : (
        <ExecutiveModuleSectionNav moduleId="soe-enterprise" />
      )}
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
