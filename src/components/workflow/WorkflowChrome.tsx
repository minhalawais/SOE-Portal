import { StatusBadge } from '@/design-system/components/StatusBadge'
import { SUBMISSION_STATUS_LABEL, type SubmissionStatus } from '@/constants'
import type { WorkflowActionDef } from '@/workflow/submission'
import { Button } from '@/design-system/components/Button'

export function WorkflowChrome({
  status,
  actionOwner,
  nextActionHint,
  actions,
  onAction,
  disabled,
}: {
  status: SubmissionStatus
  actionOwner: string
  nextActionHint: string
  actions: WorkflowActionDef[]
  onAction?: (action: WorkflowActionDef) => void
  disabled?: boolean
}) {
  const visibleActions = actions.filter((a) => a.id !== 'edit_draft')
  if (!nextActionHint && visibleActions.length === 0) return null

  return (
    <div className="mb-4 rounded-card border border-soe-border bg-white p-4">
      <div className="flex flex-wrap items-center gap-3">
        <StatusBadge status={status} label={SUBMISSION_STATUS_LABEL[status]} />
        <span className="text-xs text-soe-slate">Owner: {actionOwner}</span>
      </div>
      {nextActionHint ? <p className="mt-2 text-sm text-soe-ink">{nextActionHint}</p> : null}
      {visibleActions.length > 0 && onAction ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {visibleActions.map((action, i) => (
              <Button
                key={action.id}
                size="sm"
                variant={i === 0 ? 'primary' : 'secondary'}
                disabled={disabled}
                onClick={() => onAction(action)}
              >
                {action.label}
              </Button>
            ))}
        </div>
      ) : null}
    </div>
  )
}
