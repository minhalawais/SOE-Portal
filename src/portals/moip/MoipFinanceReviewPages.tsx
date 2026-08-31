import { RequirePermission } from '@/app/router/guards'
import { PERMISSION } from '@/permissions'
import { MoipModuleReviewPage } from '@/portals/moip/MoipReviewPages'
import { MoipSubmissionsApprovalsPage } from '@/portals/moip/MoipSubmissionsApprovalsPage'

export function MoipSubmissionQueuePage() {
  return (
    <RequirePermission permission={PERMISSION.SUBMISSION_REVIEW}>
      <MoipSubmissionsApprovalsPage />
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
