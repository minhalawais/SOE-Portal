import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { z } from 'zod'
import { ContributorModuleLayout, EntryFormSection, EntryFormShell, ExecutiveModuleSectionNav } from '@/components/soe'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/design-system/components/Card'
import { CurrencyField } from '@/design-system/components/Fields'
import { Button } from '@/design-system/components/Button'
import { FormActions } from '@/design-system/components/FormActions'
import { Alert, ErrorState, LoadingBlock } from '@/design-system/components/Feedback'
import { Modal } from '@/design-system/components/Overlays'
import { RequirePermission } from '@/app/router/guards'
import { MODULE } from '@/constants'
import { PERMISSION, hasPermission } from '@/permissions'
import { mockDocumentService, mockFinanceWorkflowService } from '@/mock-services'
import { useSessionStore } from '@/state/session'
import { useUiStore } from '@/state/ui'
import type { DocumentMeta } from '@/types/domain'
import { AppError, formatCurrencyPkr } from '@/utils'

function isUserAttachedEvidence(doc: DocumentMeta) {
  return doc.id.startsWith('doc-ev-')
}

function fileTitle(fileName: string) {
  return fileName.replace(/\.[^.]+$/, '') || fileName
}

const schema = z.object({
  revenue: z.coerce.number().min(0, 'Revenue cannot be negative'),
  operatingExpenses: z.coerce.number().min(0, 'Operating expenses cannot be negative'),
  capex: z.coerce.number().min(0, 'CAPEX cannot be negative'),
  profitOrLoss: z.coerce.number(),
  cashFlow: z.coerce.number(),
  workingCapital: z.coerce.number(),
  subsidies: z.coerce.number().min(0, 'Subsidies cannot be negative'),
  governmentSupport: z.coerce.number().min(0, 'Government support cannot be negative'),
  annualBudget: z.coerce.number().min(0, 'Budget cannot be negative'),
  receivables: z.coerce.number().min(0),
  payables: z.coerce.number().min(0),
  inventory: z.coerce.number().min(0),
  currentAssets: z.coerce.number().min(0),
  currentLiabilities: z.coerce.number().min(0),
  totalAssets: z.coerce.number().min(0),
  equity: z.coerce.number(),
  totalDebt: z.coerce.number().min(0),
})

type FormValues = z.infer<typeof schema>

export function FinanceFormPage() {
  return (
    <RequirePermission permission={PERMISSION.FINANCE_READ}>
      <FinanceFormStandalone />
    </RequirePermission>
  )
}

/** Standalone /soe/finance/form route — redirects layout to module page pattern */
function FinanceFormStandalone() {
  return <FinanceModuleContent showChrome={false} />
}

/** Primary finance module: entry form on page, comparison table below */
export function FinanceModuleContent({ showChrome = true }: { showChrome?: boolean }) {
  const organizationId = useSessionStore((s) => s.organizationId)
  const reportingPeriodId = useSessionStore((s) => s.reportingPeriodId)
  const role = useSessionStore((s) => s.role)
  const pushToast = useUiStore((s) => s.pushToast)
  const queryClient = useQueryClient()
  const canEdit = hasPermission(role, PERMISSION.FINANCE_EDIT)

  const query = useQuery({
    queryKey: ['finance-workspace', organizationId, reportingPeriodId, role],
    queryFn: () =>
      mockFinanceWorkflowService.getWorkspace(organizationId, reportingPeriodId, role),
  })

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      revenue: 0,
      operatingExpenses: 0,
      capex: 0,
      profitOrLoss: 0,
      cashFlow: 0,
      workingCapital: 0,
      subsidies: 0,
      governmentSupport: 0,
      annualBudget: 0,
      receivables: 0,
      payables: 0,
      inventory: 0,
      currentAssets: 0,
      currentLiabilities: 0,
      totalAssets: 0,
      equity: 0,
      totalDebt: 0,
    },
  })

  useEffect(() => {
    if (!query.data) return
    const c = query.data.current
    if (canEdit) {
      form.reset({
        revenue: 0,
        operatingExpenses: 0,
        capex: 0,
        profitOrLoss: 0,
        cashFlow: 0,
        workingCapital: 0,
        subsidies: 0,
        governmentSupport: 0,
        annualBudget: 0,
        receivables: 0,
        payables: 0,
        inventory: 0,
        currentAssets: 0,
        currentLiabilities: 0,
        totalAssets: 0,
        equity: 0,
        totalDebt: 0,
      })
    } else {
      form.reset({
        revenue: c.revenue,
        operatingExpenses: c.operatingExpenses,
        capex: c.capex,
        profitOrLoss: c.profitOrLoss,
        cashFlow: c.cashFlow ?? 0,
        workingCapital: c.workingCapital ?? 0,
        subsidies: c.subsidies,
        governmentSupport: c.governmentSupport ?? 0,
        annualBudget: c.annualBudget ?? 0,
        receivables: c.receivables ?? 0,
        payables: c.payables ?? 0,
        inventory: c.inventory ?? 0,
        currentAssets: c.currentAssets ?? 0,
        currentLiabilities: c.currentLiabilities ?? 0,
        totalAssets: c.totalAssets ?? 0,
        equity: c.equity ?? 0,
        totalDebt: c.totalDebt ?? 0,
      })
    }
  }, [query.data, form, canEdit])

  function invalidate() {
    void queryClient.invalidateQueries({
      queryKey: ['finance-workspace', organizationId, reportingPeriodId],
    })
    void queryClient.invalidateQueries({
      queryKey: ['finance-evidence-library', organizationId],
    })
  }

  const saveMutation = useMutation({
    mutationFn: (values: FormValues) =>
      mockFinanceWorkflowService.saveDraft(organizationId, reportingPeriodId, values, role),
    onSuccess: () => {
      invalidate()
      pushToast({ title: 'Draft saved.', tone: 'success' })
    },
    onError: (err: unknown) => {
      pushToast({
        title: err instanceof AppError ? err.message : 'Save failed',
        tone: 'critical',
      })
    },
  })

  const [pickerOpen, setPickerOpen] = useState(false)
  const [selectedLibraryIds, setSelectedLibraryIds] = useState<string[]>([])
  const [pickedFiles, setPickedFiles] = useState<File[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const libraryQuery = useQuery({
    queryKey: ['finance-evidence-library', organizationId],
    queryFn: () => mockDocumentService.getDocuments({ organizationId, pageSize: 80 }),
    enabled: pickerOpen,
  })

  const evidenceMutation = useMutation({
    mutationFn: async () => {
      const library = libraryQuery.data?.items ?? []
      for (const file of pickedFiles) {
        await mockFinanceWorkflowService.attachEvidence(
          organizationId,
          reportingPeriodId,
          { title: fileTitle(file.name), fileName: file.name },
          role,
        )
      }
      for (const id of selectedLibraryIds) {
        const doc = library.find((item) => item.id === id)
        if (!doc) continue
        await mockFinanceWorkflowService.attachEvidence(
          organizationId,
          reportingPeriodId,
          { title: doc.title, fileName: doc.fileName },
          role,
        )
      }
    },
    onSuccess: () => {
      invalidate()
      setPickerOpen(false)
      setSelectedLibraryIds([])
      setPickedFiles([])
      pushToast({ title: 'Evidence attached.', tone: 'success' })
    },
    onError: (err: unknown) => {
      pushToast({
        title: err instanceof AppError ? err.message : 'Upload failed',
        tone: 'critical',
      })
    },
  })

  const removeEvidenceMutation = useMutation({
    mutationFn: (documentId: string) =>
      mockFinanceWorkflowService.removeEvidence(
        organizationId,
        reportingPeriodId,
        documentId,
        role,
      ),
    onSuccess: () => {
      invalidate()
      pushToast({ title: 'Evidence removed.', tone: 'success' })
    },
    onError: (err: unknown) => {
      pushToast({
        title: err instanceof AppError ? err.message : 'Remove failed',
        tone: 'critical',
      })
    },
  })

  function closePicker() {
    setPickerOpen(false)
    setSelectedLibraryIds([])
    setPickedFiles([])
  }

  function toggleLibraryId(id: string) {
    setSelectedLibraryIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    )
  }

  function onFilesChosen(files: FileList | null) {
    const next = Array.from(files ?? [])
    if (!next.length) return
    setPickedFiles((current) => {
      const names = new Set(current.map((file) => file.name))
      return [...current, ...next.filter((file) => !names.has(file.name))]
    })
  }

  if (query.isLoading) return <LoadingBlock label="Loading finance workspace…" />
  if (query.isError || !query.data) {
    return <ErrorState title="Unable to load finance workspace" />
  }

  const ws = query.data
  const readOnly = ws.readOnly || !canEdit
  const attachedEvidence = ws.evidence.filter(isUserAttachedEvidence)
  const canAttach = hasPermission(role, PERMISSION.DOCUMENT_UPLOAD) && !ws.readOnly
  const libraryItems = (libraryQuery.data?.items ?? []).filter(
    (doc) =>
      !attachedEvidence.some(
        (attached) => attached.fileName === doc.fileName && attached.title === doc.title,
      ),
  )
  const canConfirmAttach = pickedFiles.length > 0 || selectedLibraryIds.length > 0
  const blocking = ws.validation.filter((v) => v.severity === 'blocking')
  const warnings = ws.validation.filter((v) => v.severity === 'warning')

  const entry = (
    <>
      <form
        id="finance-entry-form"
        className="space-y-4"
        onSubmit={form.handleSubmit((values) => saveMutation.mutate(values))}
      >
        <EntryFormShell
          title="Financial statement"
          subtitle={ws.period.label}
          meta={readOnly ? 'Read-only' : undefined}
          mode={readOnly ? 'view' : 'edit'}
          columns={2}
        >
          <EntryFormSection title="Statement values" />
            {(
              [
                ['revenue', 'Revenue (PKR)'],
                ['operatingExpenses', 'Operating expenditure (PKR)'],
                ['capex', 'CAPEX (PKR)'],
                ['profitOrLoss', 'Profit / Loss (PKR)'],
                ['cashFlow', 'Cash flow (PKR)'],
                ['workingCapital', 'Working capital (PKR)'],
                ['subsidies', 'Subsidies (PKR)'],
                ['governmentSupport', 'Government support (PKR)'],
                ['annualBudget', 'Annual budget (PKR)'],
              ] as const
            ).map(([name, label]) => (
              <CurrencyField
                key={name}
                label={label}
                name={name}
                disabled={readOnly}
                error={form.formState.errors[name]?.message}
                value={form.watch(name)}
                onChange={(e) => {
                  const raw = e.target.value
                  form.setValue(name, raw === '' ? 0 : Number(raw), {
                    shouldValidate: true,
                    shouldDirty: true,
                  })
                }}
                onBlur={() => void form.trigger(name)}
              />
            ))}
          <EntryFormSection title="Balance sheet indicators" />
            {(
              [
                ['receivables', 'Receivables (PKR)'],
                ['payables', 'Payables (PKR)'],
                ['inventory', 'Inventory (PKR)'],
                ['currentAssets', 'Current assets (PKR)'],
                ['currentLiabilities', 'Current liabilities (PKR)'],
                ['totalAssets', 'Total assets (PKR)'],
                ['equity', 'Equity (PKR)'],
                ['totalDebt', 'Total debt (PKR)'],
              ] as const
            ).map(([name, label]) => (
              <CurrencyField
                key={name}
                label={label}
                name={name}
                disabled={readOnly}
                error={form.formState.errors[name]?.message}
                value={form.watch(name)}
                onChange={(e) => {
                  const raw = e.target.value
                  form.setValue(name, raw === '' ? 0 : Number(raw), {
                    shouldValidate: true,
                    shouldDirty: true,
                  })
                }}
                onBlur={() => void form.trigger(name)}
              />
            ))}
          <EntryFormSection title="Evidence" />
            {attachedEvidence.length ? (
              <ul className="col-span-full mb-1 space-y-1 text-sm">
                {attachedEvidence.map((d) => (
                  <li
                    key={d.id}
                    className="flex items-start justify-between gap-3 border-b border-soe-border py-1.5"
                  >
                    <div>
                      <p className="font-medium">{d.title}</p>
                      <p className="text-xs text-soe-slate">{d.fileName}</p>
                    </div>
                    {canAttach ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="tertiary"
                        disabled={removeEvidenceMutation.isPending}
                        onClick={() => removeEvidenceMutation.mutate(d.id)}
                      >
                        Remove
                      </Button>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="col-span-full text-sm text-soe-slate">No evidence attached.</p>
            )}
            {canAttach ? (
              <div className="col-span-full">
                <Button type="button" variant="secondary" onClick={() => setPickerOpen(true)}>
                  Attach evidence
                </Button>
              </div>
            ) : null}
            {attachedEvidence.length === 0
              ? ws.validation
                  .filter((v) => v.code === 'EVIDENCE_REQUIRED')
                  .map((v) => (
                    <Alert key={v.code} className="col-span-full mt-1" tone="critical" title={v.message} />
                  ))
              : null}
        </EntryFormShell>
      </form>
      {readOnly ? (
        <p className="text-xs text-soe-slate">Read-only for current role or status.</p>
      ) : null}
    </>
  )

  const registry = (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card title="Validation">
        {blocking.length === 0 && warnings.length === 0 ? (
          <p className="text-sm text-soe-slate">No validation issues.</p>
        ) : (
          <div className="space-y-2">
            {blocking.map((i) => (
              <Alert key={i.code + i.message} tone="critical" title={i.message} />
            ))}
            {warnings.map((i) => (
              <Alert key={i.code + i.message} tone="warning" title={i.message} />
            ))}
          </div>
        )}
      </Card>
      <Card title="Previous period comparison">
        {ws.previous && ws.previousPeriod ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-soe-border text-xs text-soe-slate">
                  <th className="py-1.5 font-medium">Metric</th>
                  <th className="py-1.5 font-medium">{ws.previousPeriod.label}</th>
                  <th className="py-1.5 font-medium">{ws.period.label}</th>
                  <th className="py-1.5 font-medium">Δ %</th>
                </tr>
              </thead>
              <tbody>
                {(
                  [
                    ['Revenue', ws.previous.revenue, ws.current.revenue, ws.percentChange.revenue],
                    [
                      'OPEX',
                      ws.previous.operatingExpenses,
                      ws.current.operatingExpenses,
                      ws.percentChange.operatingExpenses,
                    ],
                    [
                      'P/L',
                      ws.previous.profitOrLoss,
                      ws.current.profitOrLoss,
                      ws.percentChange.profitOrLoss,
                    ],
                    [
                      'Subsidies',
                      ws.previous.subsidies,
                      ws.current.subsidies,
                      ws.percentChange.subsidies,
                    ],
                  ] as const
                ).map(([label, prev, curr, pct]) => (
                  <tr key={label} className="border-b border-soe-border">
                    <td className="py-1.5">{label}</td>
                    <td className="py-1.5">{formatCurrencyPkr(prev)}</td>
                    <td className="py-1.5">{formatCurrencyPkr(curr)}</td>
                    <td className="py-1.5">{pct === null ? '—' : `${pct}%`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-soe-slate">No prior annual period for comparison.</p>
        )}
      </Card>
    </div>
  )

  const evidencePicker = (
    <Modal
      open={pickerOpen}
      title="Attach evidence"
      onClose={closePicker}
      footer={
        <>
          <Button type="button" variant="secondary" onClick={closePicker}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!canConfirmAttach}
            loading={evidenceMutation.isPending}
            onClick={() => evidenceMutation.mutate()}
          >
            Attach selected
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-soe-slate">
            From this device
          </p>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="block w-full rounded-control border border-soe-border bg-[#f4f7fa] px-3 py-2 text-sm text-soe-ink file:mr-3 file:rounded-md file:border-0 file:bg-soe-navy file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-white"
            onChange={(e) => {
              onFilesChosen(e.target.files)
              e.target.value = ''
            }}
          />
          {pickedFiles.length ? (
            <ul className="mt-2 space-y-1 text-sm">
              {pickedFiles.map((file) => (
                <li key={file.name} className="flex items-center justify-between gap-2">
                  <span>{file.name}</span>
                  <Button
                    type="button"
                    size="sm"
                    variant="tertiary"
                    onClick={() =>
                      setPickedFiles((current) => current.filter((item) => item.name !== file.name))
                    }
                  >
                    Remove
                  </Button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        <div>
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-soe-slate">
            From repository
          </p>
          {libraryQuery.isLoading ? (
            <p className="text-sm text-soe-slate">Loading documents…</p>
          ) : libraryItems.length === 0 ? (
            <p className="text-sm text-soe-slate">No other documents available.</p>
          ) : (
            <ul className="max-h-56 space-y-0.5 overflow-auto rounded-control border border-soe-border">
              {libraryItems.map((doc) => {
                const checked = selectedLibraryIds.includes(doc.id)
                return (
                  <li key={doc.id} className="border-b border-soe-border last:border-b-0">
                    <label className="flex cursor-pointer items-start gap-2 px-3 py-2">
                      <input
                        type="checkbox"
                        className="mt-1"
                        checked={checked}
                        onChange={() => toggleLibraryId(doc.id)}
                      />
                      <span>
                        <span className="block text-sm font-medium text-soe-navy">{doc.title}</span>
                        <span className="block text-xs text-soe-slate">{doc.fileName}</span>
                      </span>
                    </label>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </Modal>
  )

  if (!showChrome) {
    return (
      <div>
        <PageHeader
          title="Financial form"
          subtitle={`${ws.organization.abbreviation} · ${ws.period.label}`}
          actions={
            <Link className="text-sm text-soe-blue underline" to="/soe/finance">
              Back to finance
            </Link>
          }
        />
        {entry}
        {evidencePicker}
        {!readOnly ? (
          <FormActions>
            <Button
              type="button"
              loading={saveMutation.isPending}
              onClick={form.handleSubmit((values) => saveMutation.mutate(values))}
            >
              Save draft
            </Button>
          </FormActions>
        ) : null}
      </div>
    )
  }

  return (
    <>
      <ContributorModuleLayout
        moduleId={MODULE.FINANCE}
        title="Financial reporting"
        sectionNav={<ExecutiveModuleSectionNav moduleId="soe-finance" />}
        actions={
          <Link className="text-sm text-soe-blue underline" to="/soe/finance/history">
            History
          </Link>
        }
        entry={entry}
        registryTitle="Validation & comparison"
        registry={registry}
        onSave={
          readOnly
            ? undefined
            : () => form.handleSubmit((values) => saveMutation.mutate(values))()
        }
        saving={saveMutation.isPending}
        saveLabel="Save finance data"
        showFormActions={!readOnly}
      />
      {evidencePicker}
    </>
  )
}
