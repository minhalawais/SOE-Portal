import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState, type ReactNode } from 'react'
import { EntryFormSection, EntryFormShell, useScrollToEntryOnSelect } from '@/components/soe'
import { SelectField, CurrencyField, TextField } from '@/design-system/components/Fields'
import { ErrorState, LoadingBlock } from '@/design-system/components/Feedback'
import {
  DEMO_AS_OF_DATE,
  LENDER_CATEGORY,
  LENDER_CATEGORY_LABEL,
  LOAN_GUARANTEE_STATUS,
  LOAN_GUARANTEE_STATUS_LABEL,
  LOAN_REPAYMENT_STATUS,
  LOAN_REPAYMENT_STATUS_LABEL,
  type LenderCategoryConst,
} from '@/constants'
import { mockFinanceService, mockGrantService, mockLoanService } from '@/mock-services'
import { hasPermission, PERMISSION } from '@/permissions'
import { useSessionStore } from '@/state/session'
import { useUiStore } from '@/state/ui'
import type { BudgetLine, Grant, Loan } from '@/types/domain'
import { AppError } from '@/utils'

export interface FinanceEntryHookResult {
  entry: ReactNode
  onSave: (() => void) | undefined
  onCancel: (() => void) | undefined
  saving: boolean
  saveDisabled: boolean
  showFormActions: boolean
  saveLabel: string
}

function emptyLoan(organizationId: string): Loan {
  return {
    id: '',
    organizationId,
    lender: '',
    lenderCategory: 'bank',
    loanType: 'Term loan',
    principal: 0,
    outstanding: 0,
    interestRate: 0,
    nextDueDate: DEMO_AS_OF_DATE,
    repaymentStatus: LOAN_REPAYMENT_STATUS.ON_TRACK,
    guaranteeStatus: LOAN_GUARANTEE_STATUS.NONE,
    defaultStatus: 'none',
    isDummyDemonstrationData: true,
  }
}

function emptyGrant(organizationId: string): Grant {
  return {
    id: '',
    organizationId,
    source: '',
    project: '',
    amount: 0,
    utilized: 0,
    remaining: 0,
    status: 'active',
    isDummyDemonstrationData: true,
  }
}

export function useLoanEntry(
  loanId: string | null,
  organizationId: string,
  onRecordSaved: (id: string) => void,
): FinanceEntryHookResult {
  const role = useSessionStore((s) => s.role)
  const canEdit = hasPermission(role, PERMISSION.FINANCE_EDIT)
  const qc = useQueryClient()
  const pushToast = useUiStore((s) => s.pushToast)
  const isCreate = !loanId
  const query = useQuery({
    queryKey: ['loan-entry', loanId],
    queryFn: () => mockLoanService.getLoan(loanId!),
    enabled: Boolean(loanId),
  })
  const [draft, setDraft] = useState<Loan | null>(null)

  useEffect(() => {
    if (loanId && query.data) setDraft(query.data)
    else if (!loanId && canEdit) setDraft(emptyLoan(organizationId))
    else setDraft(null)
  }, [loanId, query.data, organizationId, canEdit])

  useScrollToEntryOnSelect(loanId)

  const save = useMutation({
    mutationFn: () => {
      if (!draft) throw new AppError('Nothing to save', 'VALIDATION')
      if (isCreate) {
        const { id: _id, ...payload } = draft
        return mockLoanService.createLoan(payload)
      }
      return mockLoanService.updateLoan(draft.id, draft)
    },
    onSuccess: (next) => {
      void qc.invalidateQueries({ queryKey: ['loans-registry'] })
      void qc.invalidateQueries({ queryKey: ['loan-entry', next.id] })
      setDraft(next)
      onRecordSaved(next.id)
      pushToast({
        title: isCreate ? 'Loan added.' : 'Loan saved.',
        tone: 'success',
      })
    },
    onError: (err: unknown) => {
      pushToast({
        title: err instanceof AppError ? err.message : 'Loan save failed',
        tone: 'critical',
      })
    },
  })

  let entry: ReactNode
  if (loanId && query.isLoading) {
    entry = <LoadingBlock label="Loading loan…" />
  } else if (loanId && (query.isError || !draft)) {
    entry = <ErrorState title="Loan not found" detail="Choose another row from the registry." />
  } else if (!draft) {
    entry = (
      <EntryFormShell title="Loan" mode="view">
        <p className="col-span-full text-sm text-soe-slate">Read-only for current role.</p>
      </EntryFormShell>
    )
  } else {
    entry = (
      <EntryFormShell
        title="Loan"
        subtitle={isCreate ? 'New loan entry' : draft.lender}
        meta={isCreate ? undefined : draft.id}
        mode={isCreate ? 'create' : 'edit'}
      >
        <EntryFormSection title="Lender" />
        <TextField
          label="Lender"
          value={draft.lender}
          disabled={!canEdit}
          required
          onChange={(e) => setDraft({ ...draft, lender: e.target.value })}
        />
        <SelectField
          label="Lender category"
          value={draft.lenderCategory}
          disabled={!canEdit}
          options={Object.values(LENDER_CATEGORY).map((c) => ({
            value: c,
            label: LENDER_CATEGORY_LABEL[c as LenderCategoryConst],
          }))}
          onChange={(e) =>
            setDraft({ ...draft, lenderCategory: e.target.value as Loan['lenderCategory'] })
          }
        />
        <TextField
          label="Loan type"
          value={draft.loanType}
          disabled={!canEdit}
          onChange={(e) => setDraft({ ...draft, loanType: e.target.value })}
        />
        <EntryFormSection title="Terms" />
        <CurrencyField
          label="Principal PKR"
          value={draft.principal}
          disabled={!canEdit}
          onChange={(e) => setDraft({ ...draft, principal: Number(e.target.value) })}
        />
        <CurrencyField
          label="Outstanding PKR"
          value={draft.outstanding}
          disabled={!canEdit}
          onChange={(e) => setDraft({ ...draft, outstanding: Number(e.target.value) })}
        />
        <TextField
          label="Interest rate %"
          type="number"
          value={draft.interestRate}
          disabled={!canEdit}
          onChange={(e) => setDraft({ ...draft, interestRate: Number(e.target.value) })}
        />
        <TextField
          label="Next due date"
          type="date"
          value={draft.nextDueDate}
          disabled={!canEdit}
          onChange={(e) => setDraft({ ...draft, nextDueDate: e.target.value })}
        />
        <EntryFormSection title="Status" />
        <SelectField
          label="Repayment status"
          value={draft.repaymentStatus}
          disabled={!canEdit}
          options={Object.entries(LOAN_REPAYMENT_STATUS_LABEL).map(([k, v]) => ({
            value: k,
            label: v,
          }))}
          onChange={(e) =>
            setDraft({ ...draft, repaymentStatus: e.target.value as Loan['repaymentStatus'] })
          }
        />
        <SelectField
          label="Guarantee status"
          value={draft.guaranteeStatus}
          disabled={!canEdit}
          options={Object.entries(LOAN_GUARANTEE_STATUS_LABEL).map(([k, v]) => ({
            value: k,
            label: v,
          }))}
          onChange={(e) =>
            setDraft({ ...draft, guaranteeStatus: e.target.value as Loan['guaranteeStatus'] })
          }
        />
        <TextField
          label="Repayment schedule note"
          value={draft.repaymentScheduleNote ?? ''}
          disabled={!canEdit}
          onChange={(e) => setDraft({ ...draft, repaymentScheduleNote: e.target.value })}
        />
      </EntryFormShell>
    )
  }

  return {
    entry,
    onSave: canEdit && draft ? () => save.mutate() : undefined,
    onCancel: isCreate && canEdit ? () => setDraft(emptyLoan(organizationId)) : undefined,
    saving: save.isPending,
    saveDisabled: !draft || !draft.lender.trim(),
    showFormActions: Boolean(canEdit && draft),
    saveLabel: isCreate ? 'Add loan' : 'Save loan',
  }
}

export function useGrantEntry(
  grantId: string | null,
  organizationId: string,
  onRecordSaved: (id: string) => void,
): FinanceEntryHookResult {
  const role = useSessionStore((s) => s.role)
  const canEdit = hasPermission(role, PERMISSION.FINANCE_EDIT)
  const qc = useQueryClient()
  const pushToast = useUiStore((s) => s.pushToast)
  const isCreate = !grantId
  const query = useQuery({
    queryKey: ['grant-entry', grantId],
    queryFn: () => mockGrantService.getGrant(grantId!),
    enabled: Boolean(grantId),
  })
  const [draft, setDraft] = useState<Grant | null>(null)

  useEffect(() => {
    if (grantId && query.data) setDraft(query.data)
    else if (!grantId && canEdit) setDraft(emptyGrant(organizationId))
    else setDraft(null)
  }, [grantId, query.data, organizationId, canEdit])

  useScrollToEntryOnSelect(grantId)

  const save = useMutation({
    mutationFn: () => {
      if (!draft) throw new AppError('Nothing to save', 'VALIDATION')
      if (isCreate) {
        const { id: _id, ...payload } = draft
        return mockGrantService.createGrant(payload)
      }
      return mockGrantService.updateGrant(draft.id, draft)
    },
    onSuccess: (next) => {
      void qc.invalidateQueries({ queryKey: ['grants-registry'] })
      void qc.invalidateQueries({ queryKey: ['grant-entry', next.id] })
      setDraft(next)
      onRecordSaved(next.id)
      pushToast({
        title: isCreate ? 'Grant added.' : 'Grant saved.',
        tone: 'success',
      })
    },
    onError: (err: unknown) => {
      pushToast({
        title: err instanceof AppError ? err.message : 'Grant save failed',
        tone: 'critical',
      })
    },
  })

  let entry: ReactNode
  if (grantId && query.isLoading) {
    entry = <LoadingBlock label="Loading grant…" />
  } else if (grantId && (query.isError || !draft)) {
    entry = <ErrorState title="Grant not found" detail="Choose another row from the registry." />
  } else if (!draft) {
    entry = (
      <EntryFormShell title="Grant" mode="view">
        <p className="col-span-full text-sm text-soe-slate">Read-only for current role.</p>
      </EntryFormShell>
    )
  } else {
    entry = (
      <EntryFormShell
        title="Grant"
        subtitle={isCreate ? 'New grant entry' : draft.source}
        meta={isCreate ? undefined : draft.id}
        mode={isCreate ? 'create' : 'edit'}
      >
        <EntryFormSection title="Grant details" />
        <TextField
          label="Source"
          value={draft.source}
          disabled={!canEdit}
          required
          onChange={(e) => setDraft({ ...draft, source: e.target.value })}
        />
        <TextField
          label="Project"
          value={draft.project ?? ''}
          disabled={!canEdit}
          onChange={(e) => setDraft({ ...draft, project: e.target.value })}
        />
        <CurrencyField
          label="Amount PKR"
          value={draft.amount}
          disabled={!canEdit}
          onChange={(e) => {
            const amount = Number(e.target.value)
            setDraft({
              ...draft,
              amount,
              remaining: Math.max(0, amount - (draft.utilized ?? 0)),
            })
          }}
        />
        <CurrencyField
          label="Utilized PKR"
          value={draft.utilized}
          disabled={!canEdit}
          onChange={(e) => {
            const utilized = Number(e.target.value)
            setDraft({
              ...draft,
              utilized,
              remaining: Math.max(0, draft.amount - utilized),
            })
          }}
        />
        <TextField
          label="Status"
          value={draft.status}
          disabled={!canEdit}
          onChange={(e) => setDraft({ ...draft, status: e.target.value })}
        />
        <TextField
          label="Completion target date"
          type="date"
          value={draft.completionTargetDate ?? ''}
          disabled={!canEdit}
          onChange={(e) => setDraft({ ...draft, completionTargetDate: e.target.value })}
        />
      </EntryFormShell>
    )
  }

  return {
    entry,
    onSave: canEdit && draft ? () => save.mutate() : undefined,
    onCancel: isCreate && canEdit ? () => setDraft(emptyGrant(organizationId)) : undefined,
    saving: save.isPending,
    saveDisabled: !draft || !draft.source.trim(),
    showFormActions: Boolean(canEdit && draft),
    saveLabel: isCreate ? 'Add grant' : 'Save grant',
  }
}

function emptyBudgetLine(organizationId: string, reportingPeriodId: string): BudgetLine {
  return {
    id: '',
    organizationId,
    reportingPeriodId,
    category: '',
    budget: 0,
    actual: 0,
  }
}

export function useBudgetLineEntry(
  lineId: string | null,
  organizationId: string,
  reportingPeriodId: string,
  onRecordSaved: (id: string) => void,
): FinanceEntryHookResult {
  const role = useSessionStore((s) => s.role)
  const canEdit = hasPermission(role, PERMISSION.FINANCE_EDIT)
  const qc = useQueryClient()
  const pushToast = useUiStore((s) => s.pushToast)
  const isCreate = !lineId
  const query = useQuery({
    queryKey: ['budget-line-entry', lineId],
    queryFn: () => mockFinanceService.getBudgetLine(lineId!),
    enabled: Boolean(lineId),
  })
  const [draft, setDraft] = useState<BudgetLine | null>(null)

  useEffect(() => {
    if (lineId && query.data) setDraft(query.data)
    else if (!lineId && canEdit) setDraft(emptyBudgetLine(organizationId, reportingPeriodId))
    else setDraft(null)
  }, [lineId, query.data, organizationId, reportingPeriodId, canEdit])

  useScrollToEntryOnSelect(lineId)

  const save = useMutation({
    mutationFn: () => {
      if (!draft) throw new AppError('Nothing to save', 'VALIDATION')
      if (isCreate) {
        const { id: _id, ...payload } = draft
        return mockFinanceService.createBudgetLine(payload)
      }
      return mockFinanceService.updateBudgetLine(draft.id, draft)
    },
    onSuccess: (next) => {
      void qc.invalidateQueries({ queryKey: ['budget-lines'] })
      void qc.invalidateQueries({ queryKey: ['budget-line-entry', next.id] })
      setDraft(next)
      onRecordSaved(next.id)
      pushToast({
        title: isCreate ? 'Budget line added.' : 'Budget line saved.',
        tone: 'success',
      })
    },
    onError: (err: unknown) => {
      pushToast({
        title: err instanceof AppError ? err.message : 'Budget save failed',
        tone: 'critical',
      })
    },
  })

  let entry: ReactNode
  if (lineId && query.isLoading) {
    entry = <LoadingBlock label="Loading budget line…" />
  } else if (lineId && (query.isError || !draft)) {
    entry = <ErrorState title="Budget line not found" detail="Choose another row from the table." />
  } else if (!draft) {
    entry = (
      <EntryFormShell title="Budget line" mode="view">
        <p className="col-span-full text-sm text-soe-slate">Read-only for current role.</p>
      </EntryFormShell>
    )
  } else {
    entry = (
      <EntryFormShell
        title="Budget line"
        subtitle={isCreate ? 'New budget line' : draft.category}
        meta={isCreate ? undefined : draft.id}
        mode={isCreate ? 'create' : 'edit'}
      >
        <EntryFormSection title="Category" />
        <TextField
          label="Category"
          value={draft.category}
          disabled={!canEdit}
          required
          onChange={(e) => setDraft({ ...draft, category: e.target.value })}
        />
        <CurrencyField
          label="Budget PKR"
          value={draft.budget}
          disabled={!canEdit}
          onChange={(e) => setDraft({ ...draft, budget: Number(e.target.value) })}
        />
        <CurrencyField
          label="Actual PKR"
          value={draft.actual}
          disabled={!canEdit}
          onChange={(e) => setDraft({ ...draft, actual: Number(e.target.value) })}
        />
      </EntryFormShell>
    )
  }

  return {
    entry,
    onSave: canEdit && draft ? () => save.mutate() : undefined,
    onCancel:
      isCreate && canEdit
        ? () => setDraft(emptyBudgetLine(organizationId, reportingPeriodId))
        : undefined,
    saving: save.isPending,
    saveDisabled: !draft || !draft.category.trim(),
    showFormActions: Boolean(canEdit && draft),
    saveLabel: isCreate ? 'Add line' : 'Save line',
  }
}
