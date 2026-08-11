import { PortalLandingShell } from '@/portals/shared/PortalShells'

export { MoipOversightDashboardPage as MoipDashboardPage } from '@/portals/moip/MoipOversightWorkspacePages'

export { SecretaryCommandCentrePage as SecretaryDashboardPage } from '@/portals/secretary/SecretaryCommandCentrePages'

export { MinisterDashboardPage } from '@/portals/minister/MinisterFinancePages'

export { PmoCommandDashboardPage as PmoDashboardPage } from '@/portals/pmo/PmoCommandDashboardPage'

export function AssuranceDashboardPage() {
  return (
    <PortalLandingShell
      kpis={[
        { label: 'Authorized scope', value: 'Limited' },
        { label: 'Evidence trails', value: 'Ready' },
        { label: 'Write access', value: 'None' },
      ]}
      sections={[
        {
          title: 'Assurance placeholder',
          body: 'Portal F remains limited until institutional access requirements are confirmed (PD-001).',
        },
        {
          title: 'Read-oriented',
          body: 'Navigation supports approved records and evidence/timeline shells only.',
        },
      ]}
    />
  )
}
