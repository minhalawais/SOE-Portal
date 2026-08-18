import { RequirePermission } from '@/app/router/guards'
import { PERMISSION } from '@/permissions'
import { FinanceModuleContent } from '@/portals/soe/finance/FinanceFormPage'

export function FinanceOverviewPage() {
  return (
    <RequirePermission permission={PERMISSION.FINANCE_READ}>
      <FinanceModuleContent />
    </RequirePermission>
  )
}
