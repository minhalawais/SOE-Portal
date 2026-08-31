import { ROLE, SUBMISSION_STATUS, type RoleId, type SubmissionStatus } from '@/constants'
import { PERMISSION, hasPermission, type Permission } from '@/permissions'

/** Golden workflow transitions — Phase 5. Do not invent local statuses. */
const transitions: Partial<Record<SubmissionStatus, SubmissionStatus[]>> = {
  [SUBMISSION_STATUS.DRAFT]: [SUBMISSION_STATUS.IN_PROGRESS],
  [SUBMISSION_STATUS.IN_PROGRESS]: [
    SUBMISSION_STATUS.READY_FOR_REVIEW,
    SUBMISSION_STATUS.DRAFT,
  ],
  [SUBMISSION_STATUS.READY_FOR_REVIEW]: [
    SUBMISSION_STATUS.READY_FOR_CERTIFICATION,
    SUBMISSION_STATUS.IN_PROGRESS,
  ],
  [SUBMISSION_STATUS.READY_FOR_CERTIFICATION]: [
    SUBMISSION_STATUS.CERTIFIED,
    SUBMISSION_STATUS.IN_PROGRESS,
  ],
  [SUBMISSION_STATUS.CERTIFIED]: [SUBMISSION_STATUS.SUBMITTED],
  [SUBMISSION_STATUS.SUBMITTED]: [SUBMISSION_STATUS.UNDER_REVIEW],
  [SUBMISSION_STATUS.UNDER_REVIEW]: [
    SUBMISSION_STATUS.CLARIFICATION_REQUESTED,
    SUBMISSION_STATUS.RETURNED,
    SUBMISSION_STATUS.APPROVED,
  ],
  [SUBMISSION_STATUS.CLARIFICATION_REQUESTED]: [SUBMISSION_STATUS.RESUBMITTED],
  [SUBMISSION_STATUS.RESUBMITTED]: [SUBMISSION_STATUS.UNDER_REVIEW],
  [SUBMISSION_STATUS.RETURNED]: [SUBMISSION_STATUS.IN_PROGRESS],
  [SUBMISSION_STATUS.APPROVED]: [SUBMISSION_STATUS.LOCKED],
}

export type WorkflowActionId =
  | 'edit_draft'
  | 'mark_complete'
  | 'send_to_certification'
  | 'certify'
  | 'submit'
  | 'take_under_review'
  | 'request_clarification'
  | 'respond_clarification'
  | 'resubmit'
  | 'approve'
  | 'return'

export interface WorkflowActionDef {
  id: WorkflowActionId
  label: string
  toStatus: SubmissionStatus
  permission: Permission
  confirm?: boolean
}

const ACTION_DEFS: WorkflowActionDef[] = [
  {
    id: 'edit_draft',
    label: 'Save draft',
    toStatus: SUBMISSION_STATUS.IN_PROGRESS,
    permission: PERMISSION.FINANCE_EDIT,
  },
  {
    id: 'mark_complete',
    label: 'Mark section complete',
    toStatus: SUBMISSION_STATUS.READY_FOR_REVIEW,
    permission: PERMISSION.FINANCE_EDIT,
    confirm: true,
  },
  {
    id: 'send_to_certification',
    label: 'Send for certification',
    toStatus: SUBMISSION_STATUS.READY_FOR_CERTIFICATION,
    permission: PERMISSION.SUBMISSION_SUBMIT,
    confirm: true,
  },
  {
    id: 'certify',
    label: 'Certify',
    toStatus: SUBMISSION_STATUS.CERTIFIED,
    permission: PERMISSION.SUBMISSION_CERTIFY,
    confirm: true,
  },
  {
    id: 'submit',
    label: 'Submit to MoIP',
    toStatus: SUBMISSION_STATUS.SUBMITTED,
    permission: PERMISSION.SUBMISSION_SUBMIT,
    confirm: true,
  },
  {
    id: 'take_under_review',
    label: 'Take under review',
    toStatus: SUBMISSION_STATUS.UNDER_REVIEW,
    permission: PERMISSION.SUBMISSION_REVIEW,
  },
  {
    id: 'request_clarification',
    label: 'Request clarification',
    toStatus: SUBMISSION_STATUS.CLARIFICATION_REQUESTED,
    permission: PERMISSION.CLARIFICATION_CREATE,
    confirm: true,
  },
  {
    id: 'respond_clarification',
    label: 'Respond to clarification',
    toStatus: SUBMISSION_STATUS.RESUBMITTED,
    permission: PERMISSION.FINANCE_EDIT,
  },
  {
    id: 'resubmit',
    label: 'Resubmit',
    toStatus: SUBMISSION_STATUS.UNDER_REVIEW,
    permission: PERMISSION.SUBMISSION_SUBMIT,
    confirm: true,
  },
  {
    id: 'approve',
    label: 'Approve and lock',
    toStatus: SUBMISSION_STATUS.APPROVED,
    permission: PERMISSION.SUBMISSION_APPROVE,
    confirm: true,
  },
  {
    id: 'return',
    label: 'Return to SOE',
    toStatus: SUBMISSION_STATUS.RETURNED,
    permission: PERMISSION.SUBMISSION_REVIEW,
    confirm: true,
  },
]

/** Map current status → actions that leave that status */
const statusActions: Partial<Record<SubmissionStatus, WorkflowActionId[]>> = {
  [SUBMISSION_STATUS.DRAFT]: ['edit_draft', 'mark_complete'],
  [SUBMISSION_STATUS.IN_PROGRESS]: ['edit_draft', 'mark_complete'],
  [SUBMISSION_STATUS.READY_FOR_REVIEW]: ['send_to_certification', 'edit_draft'],
  [SUBMISSION_STATUS.READY_FOR_CERTIFICATION]: ['certify'],
  [SUBMISSION_STATUS.CERTIFIED]: ['submit'],
  [SUBMISSION_STATUS.SUBMITTED]: ['take_under_review'],
  [SUBMISSION_STATUS.UNDER_REVIEW]: ['request_clarification', 'approve', 'return'],
  [SUBMISSION_STATUS.CLARIFICATION_REQUESTED]: ['respond_clarification'],
  [SUBMISSION_STATUS.RESUBMITTED]: ['resubmit', 'take_under_review'],
  [SUBMISSION_STATUS.RETURNED]: ['edit_draft', 'mark_complete'],
}

export function canTransition(from: SubmissionStatus, to: SubmissionStatus): boolean {
  return transitions[from]?.includes(to) ?? false
}

export function isImmutableStatus(status: SubmissionStatus): boolean {
  return status === SUBMISSION_STATUS.LOCKED || status === SUBMISSION_STATUS.APPROVED
}

export function canOverrideWorkflowLock(role: RoleId): boolean {
  void role
  return false
}

export function isWorkflowLockedForRole(status: SubmissionStatus, role: RoleId): boolean {
  return isImmutableStatus(status) && !canOverrideWorkflowLock(role)
}

export function getActionDef(id: WorkflowActionId): WorkflowActionDef {
  const def = ACTION_DEFS.find((a) => a.id === id)
  if (!def) throw new Error(`Unknown workflow action: ${id}`)
  return def
}

export function getAvailableActions(
  status: SubmissionStatus,
  role: RoleId,
): WorkflowActionDef[] {
  const ids = statusActions[status] ?? []
  return ids
    .map(getActionDef)
    .filter((action) => {
      if (!hasPermission(role, action.permission)) return false
      if (action.id === 'edit_draft') {
        return (
          status === SUBMISSION_STATUS.DRAFT ||
          status === SUBMISSION_STATUS.IN_PROGRESS ||
          status === SUBMISSION_STATUS.READY_FOR_REVIEW ||
          status === SUBMISSION_STATUS.RETURNED
        )
      }
      return canTransition(status, action.toStatus)
    })
}

export function getActionOwnerLabel(status: SubmissionStatus): string {
  switch (status) {
    case SUBMISSION_STATUS.DRAFT:
    case SUBMISSION_STATUS.IN_PROGRESS:
    case SUBMISSION_STATUS.RETURNED:
      return 'SOE Contributor'
    case SUBMISSION_STATUS.READY_FOR_REVIEW:
      return 'SOE Contributor'
    case SUBMISSION_STATUS.READY_FOR_CERTIFICATION:
      return 'SOE Certifier'
    case SUBMISSION_STATUS.CERTIFIED:
      return 'SOE Contributor'
    case SUBMISSION_STATUS.CLARIFICATION_REQUESTED:
      return 'SOE Contributor'
    case SUBMISSION_STATUS.RESUBMITTED:
      return 'SOE Contributor / MoIP Reviewer'
    case SUBMISSION_STATUS.SUBMITTED:
    case SUBMISSION_STATUS.UNDER_REVIEW:
      return 'MoIP Reviewer'
    case SUBMISSION_STATUS.APPROVED:
    case SUBMISSION_STATUS.LOCKED:
      return '—'
    default:
      return '—'
  }
}

export function getNextActionHint(status: SubmissionStatus, _role?: RoleId): string {
  switch (status) {
    case SUBMISSION_STATUS.DRAFT:
      return 'Enter values, attach evidence, then mark section complete.'
    case SUBMISSION_STATUS.IN_PROGRESS:
      return 'Resolve validation issues and mark section complete.'
    case SUBMISSION_STATUS.READY_FOR_REVIEW:
      return 'SOE Contributor reviews completeness and sends for certification.'
    case SUBMISSION_STATUS.READY_FOR_CERTIFICATION:
      return 'SOE Certifier reviews summary and certifies.'
    case SUBMISSION_STATUS.CERTIFIED:
      return 'Submit certified pack to MoIP.'
    case SUBMISSION_STATUS.SUBMITTED:
      return 'MoIP takes the pack under review.'
    case SUBMISSION_STATUS.UNDER_REVIEW:
      return 'MoIP compares periods, then approves or requests clarification.'
    case SUBMISSION_STATUS.CLARIFICATION_REQUESTED:
      return 'Finance responds to clarification and prepares resubmission.'
    case SUBMISSION_STATUS.RESUBMITTED:
      return 'Resubmit to MoIP or await under-review pickup.'
    case SUBMISSION_STATUS.RETURNED:
      return 'Correct returned items and mark complete again.'
    case SUBMISSION_STATUS.APPROVED:
      return 'Snapshot will lock for immutable history.'
    case SUBMISSION_STATUS.LOCKED:
      return 'Approved snapshot is locked. Corrections require a new version narrative.'
    default:
      return ''
  }
}

export function bumpVersion(current: string, kind: 'minor' | 'major' = 'minor'): string {
  const parts = current.split('.').map((p) => Number(p) || 0)
  const major = parts[0] ?? 0
  const minor = parts[1] ?? 0
  if (kind === 'major') return `${major + 1}.0`
  return `${major}.${minor + 1}`
}

export function assertTransition(from: SubmissionStatus, to: SubmissionStatus): void {
  if (!canTransition(from, to)) {
    throw new Error(`Invalid transition: ${from} → ${to}`)
  }
}

/** Roles allowed to edit finance source values in SOE portal */
export function canEditFinanceSource(role: RoleId): boolean {
  if (!hasPermission(role, PERMISSION.FINANCE_EDIT)) return false
  return getPortalHint(role) === 'soe' || canOverrideWorkflowLock(role)
}

function getPortalHint(role: RoleId): 'soe' | 'moip' | 'exec' {
  if (
    role === ROLE.MOIP_REVIEWER ||
    role === ROLE.MOIP_ANALYST ||
    role === ROLE.MOIP_SUPERVISOR
  ) {
    return 'moip'
  }
  if (
    role === ROLE.SECRETARY ||
    role === ROLE.MINISTER ||
    role === ROLE.PMO ||
    role === ROLE.EXECUTIVE_VIEWER ||
    role === ROLE.ASSURANCE_USER
  ) {
    return 'exec'
  }
  return 'soe'
}
