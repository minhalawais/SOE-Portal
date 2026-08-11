import { RequirePermission } from '@/app/router/guards'
import { PERMISSION } from '@/permissions'
import {
  MoipSubmissionQueueWorkspace,
} from '@/portals/moip/MoipOversightWorkspacePages'
import { MoipModuleReviewPage } from '@/portals/moip/MoipReviewPages'

export function MoipSubmissionQueuePage() {
  return (
    <RequirePermission permission={PERMISSION.SUBMISSION_REVIEW}>
      <MoipSubmissionQueueWorkspace />
    </RequirePermission>
  )
}

export function MoipFinanceReviewPage() {
  return (
    <RequirePermission permission={PERMISSION.SUBMISSION_REVIEW}>
      <MoipModuleReviewPage />
    </RequirePermission>
  )
}
