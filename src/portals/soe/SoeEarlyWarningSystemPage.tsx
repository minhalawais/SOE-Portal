import { useMemo, useState } from 'react'
import {
  AlertTriangle,
  Building2,
  Factory,
  FileWarning,
  Landmark,
  Plus,
  ShieldAlert,
  Sparkles,
  Wallet,
} from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/design-system/components/Button'
import { Card } from '@/design-system/components/Card'
import { SelectField, TextField, CheckboxField, DateField } from '@/design-system/components/Fields'
import { EmptyState } from '@/design-system/components/Feedback'
import { Modal, Drawer } from '@/design-system/components/Overlays'
import { StatusBadge } from '@/design-system/components/StatusBadge'
import { useUiStore } from '@/state/ui'

type AlertSeverity = 'critical' | 'high' | 'attention'
type AlertSource = 'ai' | 'manual'
type ManualTriggerId =
  | 'email_on_return'
  | 'deadline_alert'
  | 'email_on_clarification'
  | 'non_submission_reminder'
  | 'custom'

type EarlyWarningAlert = {
  id: string
  source: AlertSource
  title: string
  category: string
  severity: AlertSeverity
  status: 'open' | 'acknowledged' | 'resolved'
  generatedAt: string
  summary: string
  explanation: string
  recommendedAction: string
  linkedModule: string
  triggerId?: ManualTriggerId
  triggerLabel?: string
  notifyByEmail?: boolean
  keepEmailActive?: boolean
  emailTo?: string
  deadlineAt?: string
}

type TriggerTemplate = {
  id: ManualTriggerId
  label: string
  description: string
  title: string
  category: string
  severity: AlertSeverity
  summary: string
  explanation: string
  recommendedAction: string
  linkedModule: string
  requiresDeadline?: boolean
  defaultNotifyByEmail?: boolean
}

const TRIGGER_TEMPLATES: TriggerTemplate[] = [
  {
    id: 'email_on_return',
    label: 'Send email on return',
    description: 'Notify assignees when a module is returned for correction.',
    title: 'Email on module return',
    category: 'Non-submission',
    severity: 'high',
    summary: 'Send email when a module submission is returned.',
    explanation: 'Trigger fires when SOE reviewer or MoIP returns a module and correction is required.',
    recommendedAction: 'Confirm recipient list and keep notification active until resubmission.',
    linkedModule: 'Submissions & Returns',
    defaultNotifyByEmail: true,
  },
  {
    id: 'deadline_alert',
    label: 'Deadline alert',
    description: 'Warn before a reporting or compliance deadline.',
    title: 'Deadline alert',
    category: 'Non-submission',
    severity: 'attention',
    summary: 'Alert before the selected deadline date.',
    explanation: 'Manual deadline watch for submission, evidence or compliance due dates.',
    recommendedAction: 'Complete the linked work before the deadline and resolve this alert.',
    linkedModule: 'Submissions & Returns',
    requiresDeadline: true,
    defaultNotifyByEmail: true,
  },
  {
    id: 'email_on_clarification',
    label: 'Send email on clarification',
    description: 'Notify the owner when a clarification is requested.',
    title: 'Email on clarification request',
    category: 'Governance risk',
    severity: 'attention',
    summary: 'Send email when a clarification is opened against this SOE.',
    explanation: 'Trigger fires when MoIP or SOE reviewer requests clarification on a module field.',
    recommendedAction: 'Respond in the clarifications inbox and attach supporting evidence.',
    linkedModule: 'Submissions & Returns',
    defaultNotifyByEmail: true,
  },
  {
    id: 'non_submission_reminder',
    label: 'Non-submission reminder',
    description: 'Remind owners when financial statements remain unsubmitted.',
    title: 'Non-submission reminder',
    category: 'Non-submission',
    severity: 'critical',
    summary: 'Remind finance owners that required statements are still outstanding.',
    explanation: 'Manual reminder for missing financial statement packs or incomplete finance submission.',
    recommendedAction: 'Complete finance entry and attach audited statements.',
    linkedModule: 'Financial & Fiscal',
    defaultNotifyByEmail: true,
  },
  {
    id: 'custom',
    label: 'Custom trigger',
    description: 'Define your own watch condition.',
    title: '',
    category: 'Other',
    severity: 'attention',
    summary: '',
    explanation: '',
    recommendedAction: '',
    linkedModule: 'Enterprise',
    defaultNotifyByEmail: false,
  },
]

const AI_ALERTS: EarlyWarningAlert[] = [
  {
    id: 'ai-fin-1',
    source: 'ai',
    title: 'Deteriorating financial health',
    category: 'Financial health',
    severity: 'critical',
    status: 'open',
    generatedAt: '2026-08-28',
    summary: 'Current ratio fell below 1.0 for two consecutive quarters.',
    explanation:
      'Liquidity indicators show sustained deterioration. Current ratio declined from 1.24 to 0.86 and operating cash flow turned negative in Q2 FY2026.',
    recommendedAction: 'Review working capital, debt service and cash forecast with Finance before next submission.',
    linkedModule: 'Financial & Fiscal',
  },
  {
    id: 'ai-board-1',
    source: 'ai',
    title: 'Board term expiry within 30 days',
    category: 'Board term expiry',
    severity: 'critical',
    status: 'open',
    generatedAt: '2026-08-30',
    summary: 'Two board seats expire on 28/09/2026 with no replacement recorded.',
    explanation:
      'Chair and independent member tenures end within 30 days. No succession or reappointment records are attached in People & Governance.',
    recommendedAction: 'Update board composition and attach appointment evidence before the expiry date.',
    linkedModule: 'People & Governance',
  },
  {
    id: 'ai-loan-1',
    source: 'ai',
    title: 'Loan repayment default risk',
    category: 'Loan default',
    severity: 'high',
    status: 'open',
    generatedAt: '2026-08-26',
    summary: 'Scheduled repayment overdue by 21 days on development loan line.',
    explanation:
      'Repayment status for the primary development loan is overdue. Interest accrual continues and covenant breach risk is elevated.',
    recommendedAction: 'Confirm repayment posting or escalate restructuring status in Financial & Fiscal.',
    linkedModule: 'Financial & Fiscal',
  },
  {
    id: 'ai-prod-1',
    source: 'ai',
    title: 'Declining production output',
    category: 'Production',
    severity: 'attention',
    status: 'open',
    generatedAt: '2026-08-22',
    summary: 'Industrial output declined 18% versus the prior quarter.',
    explanation:
      'Production volume and capacity utilization both declined beyond the demo threshold for Industrial Performance.',
    recommendedAction: 'Validate production figures and document cause of variance in Industrial Performance.',
    linkedModule: 'Industrial Performance',
  },
  {
    id: 'ai-fs-1',
    source: 'ai',
    title: 'Financial statements not submitted',
    category: 'Non-submission',
    severity: 'critical',
    status: 'open',
    generatedAt: '2026-08-31',
    summary: 'Audited financial statements pack missing for the open reporting period.',
    explanation:
      'Finance module submission remains incomplete and no audited financial statements evidence is linked for FY2026.',
    recommendedAction: 'Complete finance data entry and attach the audited statements before period submission.',
    linkedModule: 'Financial & Fiscal',
  },
  {
    id: 'ai-gov-1',
    source: 'ai',
    title: 'Significant governance risk',
    category: 'Governance risk',
    severity: 'high',
    status: 'acknowledged',
    generatedAt: '2026-08-18',
    summary: 'Board quorum shortfall recorded for two consecutive meetings.',
    explanation:
      'Governance calendar shows repeated quorum shortfalls and an open compliance finding related to board attendance.',
    recommendedAction: 'Update attendance records and close the related compliance finding.',
    linkedModule: 'People & Governance',
  },
]

const CATEGORY_OPTIONS = [
  { value: 'Financial health', label: 'Financial health' },
  { value: 'Board term expiry', label: 'Board term expiry' },
  { value: 'Loan default', label: 'Loan default' },
  { value: 'Production', label: 'Production' },
  { value: 'Non-submission', label: 'Non-submission' },
  { value: 'Governance risk', label: 'Governance risk' },
  { value: 'Other', label: 'Other' },
]

const SEVERITY_OPTIONS = [
  { value: 'critical', label: 'Critical' },
  { value: 'high', label: 'High' },
  { value: 'attention', label: 'Attention' },
]

const LINKED_MODULE_OPTIONS = [
  { value: 'Submissions & Returns', label: 'Submissions & Returns' },
  { value: 'Enterprise', label: 'Enterprise' },
  { value: 'Assets & Property', label: 'Assets & Property' },
  { value: 'People & Governance', label: 'People & Governance' },
  { value: 'Financial & Fiscal', label: 'Financial & Fiscal' },
  { value: 'Accountability & Compliance', label: 'Accountability & Compliance' },
  { value: 'Industrial Performance', label: 'Industrial Performance' },
  { value: 'Privatization & Transformation', label: 'Privatization & Transformation' },
  { value: 'Documents', label: 'Documents' },
]

function severityBadge(severity: AlertSeverity) {
  if (severity === 'critical') {
    return <StatusBadge status="critical" family="risk" label="Critical" />
  }
  if (severity === 'high') {
    return <StatusBadge status="high" family="risk" label="High" />
  }
  return <StatusBadge status="moderate" family="risk" label="Attention" />
}

function categoryIcon(category: string) {
  if (category === 'Financial health') return Wallet
  if (category === 'Board term expiry') return Building2
  if (category === 'Loan default') return Landmark
  if (category === 'Production') return Factory
  if (category === 'Non-submission') return FileWarning
  if (category === 'Governance risk') return ShieldAlert
  return AlertTriangle
}

function AlertDetailBody({ alert }: { alert: EarlyWarningAlert }) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {severityBadge(alert.severity)}
        <StatusBadge status={alert.status} family="approval" label={alert.status} />
        <span className="text-xs text-soe-slate">{alert.category}</span>
      </div>

      <div>
        <p className="text-[11px] font-semibold uppercase text-soe-slate">Summary</p>
        <p className="mt-1 text-sm text-soe-ink">{alert.summary}</p>
      </div>

      <div>
        <p className="text-[11px] font-semibold uppercase text-soe-slate">Explanation</p>
        <p className="mt-1 text-sm leading-5 text-soe-ink">{alert.explanation}</p>
      </div>

      <div>
        <p className="text-[11px] font-semibold uppercase text-soe-slate">Recommended action</p>
        <p className="mt-1 text-sm leading-5 text-soe-ink">{alert.recommendedAction}</p>
      </div>

      <dl className="grid grid-cols-2 gap-3 border border-soe-border bg-soe-canvas p-3 text-sm">
        <div>
          <dt className="text-[11px] font-semibold uppercase text-soe-slate">Source</dt>
          <dd className="mt-1 text-soe-navy">{alert.source === 'ai' ? 'AI alert' : 'Manual alert'}</dd>
        </div>
        <div>
          <dt className="text-[11px] font-semibold uppercase text-soe-slate">Generated</dt>
          <dd className="mt-1 text-soe-navy">{new Date(alert.generatedAt).toLocaleDateString('en-GB')}</dd>
        </div>
        <div className="col-span-2">
          <dt className="text-[11px] font-semibold uppercase text-soe-slate">Linked module</dt>
          <dd className="mt-1 text-soe-navy">{alert.linkedModule}</dd>
        </div>
        {alert.triggerLabel ? (
          <div className="col-span-2">
            <dt className="text-[11px] font-semibold uppercase text-soe-slate">Trigger</dt>
            <dd className="mt-1 text-soe-navy">{alert.triggerLabel}</dd>
          </div>
        ) : null}
        {alert.deadlineAt ? (
          <div>
            <dt className="text-[11px] font-semibold uppercase text-soe-slate">Deadline</dt>
            <dd className="mt-1 text-soe-navy">{new Date(alert.deadlineAt).toLocaleDateString('en-GB')}</dd>
          </div>
        ) : null}
        {alert.notifyByEmail != null ? (
          <div>
            <dt className="text-[11px] font-semibold uppercase text-soe-slate">Email</dt>
            <dd className="mt-1 text-soe-navy">
              {alert.notifyByEmail ? 'Enabled' : 'Off'}
              {alert.keepEmailActive ? ' · keep active' : ''}
            </dd>
          </div>
        ) : null}
        {alert.emailTo ? (
          <div className="col-span-2">
            <dt className="text-[11px] font-semibold uppercase text-soe-slate">Send to</dt>
            <dd className="mt-1 text-soe-navy">{alert.emailTo}</dd>
          </div>
        ) : null}
      </dl>
    </div>
  )
}

function AlertList({
  alerts,
  emptyTitle,
  onSelect,
}: {
  alerts: EarlyWarningAlert[]
  emptyTitle: string
  onSelect: (alert: EarlyWarningAlert) => void
}) {
  if (!alerts.length) {
    return (
      <div className="p-4">
        <EmptyState title={emptyTitle} />
      </div>
    )
  }

  return (
    <ul className="divide-y divide-soe-border">
      {alerts.map((alert) => {
        const Icon = categoryIcon(alert.category)
        return (
          <li key={alert.id}>
            <button
              type="button"
              className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-[#f8fafc]"
              onClick={() => onSelect(alert)}
            >
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-soe-canvas text-soe-blue">
                <Icon size={16} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-soe-navy">{alert.title}</p>
                  {severityBadge(alert.severity)}
                </div>
                <p className="mt-1 text-xs leading-5 text-soe-slate">{alert.summary}</p>
                <p className="mt-1 text-[11px] text-soe-slate">
                  {alert.triggerLabel ? `${alert.triggerLabel} · ` : ''}
                  {alert.linkedModule} · {new Date(alert.generatedAt).toLocaleDateString('en-GB')} · {alert.status}
                </p>
              </div>
            </button>
          </li>
        )
      })}
    </ul>
  )
}

export function SoeEarlyWarningSystemPage() {
  const pushToast = useUiStore((state) => state.pushToast)
  const [manualAlerts, setManualAlerts] = useState<EarlyWarningAlert[]>([
    {
      id: 'manual-1',
      source: 'manual',
      title: 'Email on module return',
      category: 'Non-submission',
      severity: 'high',
      status: 'open',
      generatedAt: '2026-08-20',
      summary: 'Send email when a module submission is returned.',
      explanation: 'Trigger fires when SOE reviewer or MoIP returns a module and correction is required.',
      recommendedAction: 'Confirm recipient list and keep notification active until resubmission.',
      linkedModule: 'Submissions & Returns',
      triggerId: 'email_on_return',
      triggerLabel: 'Send email on return',
      notifyByEmail: true,
      keepEmailActive: true,
      emailTo: 'focal@tusdec.gov.pk',
    },
  ])
  const [selected, setSelected] = useState<EarlyWarningAlert | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [triggerId, setTriggerId] = useState<ManualTriggerId>('email_on_return')
  const [title, setTitle] = useState(TRIGGER_TEMPLATES[0].title)
  const [category, setCategory] = useState(TRIGGER_TEMPLATES[0].category)
  const [severity, setSeverity] = useState<AlertSeverity>(TRIGGER_TEMPLATES[0].severity)
  const [linkedModule, setLinkedModule] = useState(TRIGGER_TEMPLATES[0].linkedModule)
  const [notifyByEmail, setNotifyByEmail] = useState(true)
  const [keepEmailActive, setKeepEmailActive] = useState(true)
  const [emailTo, setEmailTo] = useState('')
  const [deadlineAt, setDeadlineAt] = useState('')

  const selectedTrigger = TRIGGER_TEMPLATES.find((item) => item.id === triggerId) ?? TRIGGER_TEMPLATES[0]

  const aiOpenCount = useMemo(
    () => AI_ALERTS.filter((item) => item.status !== 'resolved').length,
    [],
  )
  const manualOpenCount = useMemo(
    () => manualAlerts.filter((item) => item.status !== 'resolved').length,
    [manualAlerts],
  )

  const applyTrigger = (nextId: ManualTriggerId) => {
    const template = TRIGGER_TEMPLATES.find((item) => item.id === nextId) ?? TRIGGER_TEMPLATES[0]
    setTriggerId(nextId)
    setTitle(template.title)
    setCategory(template.category)
    setSeverity(template.severity)
    setLinkedModule(template.linkedModule)
    setNotifyByEmail(Boolean(template.defaultNotifyByEmail))
    setKeepEmailActive(Boolean(template.defaultNotifyByEmail))
    if (!template.requiresDeadline) setDeadlineAt('')
  }

  const resetForm = () => {
    applyTrigger('email_on_return')
    setEmailTo('')
    setDeadlineAt('')
  }

  const createManualAlert = () => {
    if (!title.trim()) {
      pushToast({ title: 'Title is required.', tone: 'critical' })
      return
    }
    if (selectedTrigger.requiresDeadline && !deadlineAt) {
      pushToast({ title: 'Deadline date is required for this trigger.', tone: 'critical' })
      return
    }
    if (notifyByEmail && !emailTo.trim()) {
      pushToast({ title: 'Enter an email recipient or turn off email notification.', tone: 'critical' })
      return
    }
    const alert: EarlyWarningAlert = {
      id: `manual-${Date.now()}`,
      source: 'manual',
      title: title.trim(),
      category,
      severity,
      status: 'open',
      generatedAt: new Date().toISOString().slice(0, 10),
      summary: selectedTrigger.summary || title.trim(),
      explanation: selectedTrigger.explanation || selectedTrigger.summary || title.trim(),
      recommendedAction: selectedTrigger.recommendedAction || 'Monitor and update status when resolved.',
      linkedModule,
      triggerId,
      triggerLabel: selectedTrigger.label,
      notifyByEmail,
      keepEmailActive: notifyByEmail ? keepEmailActive : false,
      emailTo: notifyByEmail ? emailTo.trim() : undefined,
      deadlineAt: selectedTrigger.requiresDeadline ? deadlineAt : undefined,
    }
    setManualAlerts((prev) => [alert, ...prev])
    setFormOpen(false)
    resetForm()
    pushToast({ title: 'Manual alert created.', tone: 'success' })
  }

  return (
    <div className="space-y-5 pb-6">
      <PageHeader
        title="Early Warning System"
        subtitle="AI and manual alerts for financial health, board term expiry, loan defaults, production decline, non-submission and governance risk."
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="border border-t-[3px] border-soe-border border-t-soe-blue bg-white p-4 shadow-[var(--shadow-sm)]">
          <p className="text-[11px] font-semibold uppercase text-soe-slate">AI alerts open</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-soe-navy">{aiOpenCount}</p>
        </div>
        <div className="border border-t-[3px] border-soe-border border-t-soe-teal bg-white p-4 shadow-[var(--shadow-sm)]">
          <p className="text-[11px] font-semibold uppercase text-soe-slate">Manual alerts open</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-soe-navy">{manualOpenCount}</p>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card
          title="AI alerts"
          subtitle="Automated signals generated from SOE reporting data."
          actions={
            <span className="inline-flex items-center gap-1 text-xs font-medium text-soe-blue">
              <Sparkles size={14} />
              AI generated
            </span>
          }
        >
          <AlertList
            alerts={AI_ALERTS}
            emptyTitle="No AI alerts"
            onSelect={setSelected}
          />
        </Card>

        <Card
          title="Manual alerts"
          subtitle="Alerts created by your team for tracked risks."
          actions={
            <Button size="sm" onClick={() => setFormOpen(true)}>
              <Plus size={14} />
              Set alert
            </Button>
          }
        >
          <AlertList
            alerts={manualAlerts}
            emptyTitle="No manual alerts yet"
            onSelect={setSelected}
          />
        </Card>
      </div>

      <Drawer
        open={Boolean(selected)}
        title={selected?.title ?? 'Alert detail'}
        size="lg"
        onClose={() => setSelected(null)}
      >
        {selected ? <AlertDetailBody alert={selected} /> : null}
      </Drawer>

      <Modal
        open={formOpen}
        title="Set manual alert"
        onClose={() => {
          setFormOpen(false)
          resetForm()
        }}
        footer={(
          <>
            <Button
              variant="tertiary"
              onClick={() => {
                setFormOpen(false)
                resetForm()
              }}
            >
              Cancel
            </Button>
            <Button onClick={createManualAlert}>Create alert</Button>
          </>
        )}
      >
        <div className="space-y-3">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase text-soe-slate">Pre-built trigger</p>
            <div className="grid gap-2">
              {TRIGGER_TEMPLATES.map((template) => (
                <label
                  key={template.id}
                  className={`flex cursor-pointer items-start gap-3 border px-3 py-2.5 ${
                    triggerId === template.id
                      ? 'border-soe-blue bg-[var(--color-info-soft)]'
                      : 'border-soe-border bg-white'
                  }`}
                >
                  <input
                    type="radio"
                    name="manual-trigger"
                    className="mt-1 h-4 w-4 accent-[#1d5d8f]"
                    checked={triggerId === template.id}
                    onChange={() => applyTrigger(template.id)}
                  />
                  <span>
                    <span className="block text-sm font-medium text-soe-navy">{template.label}</span>
                    <span className="mt-0.5 block text-xs text-soe-slate">{template.description}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>

          <TextField
            label="Title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <SelectField
              label="Category"
              value={category}
              options={CATEGORY_OPTIONS}
              onChange={(event) => setCategory(event.target.value)}
            />
            <SelectField
              label="Severity"
              value={severity}
              options={SEVERITY_OPTIONS}
              onChange={(event) => setSeverity(event.target.value as AlertSeverity)}
            />
          </div>
          <SelectField
            label="Linked module"
            value={linkedModule}
            options={LINKED_MODULE_OPTIONS}
            onChange={(event) => setLinkedModule(event.target.value)}
          />
          {selectedTrigger.requiresDeadline ? (
            <DateField
              label="Deadline"
              value={deadlineAt}
              onChange={(event) => setDeadlineAt(event.target.value)}
              required
            />
          ) : null}

          <div className="space-y-2 border border-soe-border bg-soe-canvas p-3">
            <p className="text-xs font-semibold uppercase text-soe-slate">Email options</p>
            <CheckboxField
              label="Send email notification"
              checked={notifyByEmail}
              onChange={(event) => {
                const checked = event.target.checked
                setNotifyByEmail(checked)
                if (!checked) setKeepEmailActive(false)
              }}
            />
            <CheckboxField
              label="Keep email active until resolved"
              checked={keepEmailActive}
              disabled={!notifyByEmail}
              onChange={(event) => setKeepEmailActive(event.target.checked)}
            />
            {notifyByEmail ? (
              <TextField
                label="Email recipient"
                type="email"
                value={emailTo}
                onChange={(event) => setEmailTo(event.target.value)}
                placeholder="name@example.gov.pk"
                required
              />
            ) : null}
          </div>
        </div>
      </Modal>
    </div>
  )
}
