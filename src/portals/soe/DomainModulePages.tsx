import {
  EnterpriseHistoryWorkspace,
  EnterpriseLocationsWorkspace,
  EnterpriseOwnershipWorkspace,
  EnterpriseProfileWorkspace,
  EnterpriseStructureWorkspace,
} from '@/portals/shared/EnterpriseWorkspacePages'
import { SoeAssetRegistryPage } from '@/portals/shared/AssetWorkspacePages'
import {
  BoardWorkspace,
  ExecutivesWorkspace,
  GovernanceCalendarWorkspace,
  WorkforceWorkspace,
} from '@/portals/shared/PeopleGovernanceWorkspacePages'
import {
  IndustrialWorkspacePage,
  LoansRegistryWorkspace,
} from '@/portals/shared/FinanceFiscalWorkspacePages'
import {
  AuditParaRegistryWorkspace,
  AuditRegisterWorkspace,
  ComplianceMatrixWorkspace,
  LitigationRegistryWorkspace,
  PacObservationsWorkspace,
  PrivatizationPipelineWorkspace,
  ProcurementRegistryWorkspace,
  TransformationTrackerWorkspace,
} from '@/portals/shared/AccountabilityWorkspacePages'

export function EnterpriseProfilePage() {
  return <EnterpriseProfileWorkspace portal="soe" />
}

export function EnterpriseOwnershipPage() {
  return <EnterpriseOwnershipWorkspace portal="soe" />
}

export function EnterpriseStructurePage() {
  return <EnterpriseStructureWorkspace portal="soe" />
}

export function EnterpriseLocationsPage() {
  return <EnterpriseLocationsWorkspace portal="soe" />
}

export function EnterpriseHistoryPage() {
  return <EnterpriseHistoryWorkspace portal="soe" />
}

export function WorkforceModulePage() {
  return <WorkforceWorkspace portal="soe" />
}

export function BoardModulePage() {
  return <BoardWorkspace portal="soe" />
}

export function ExecutivesModulePage() {
  return <ExecutivesWorkspace portal="soe" />
}

export function GovernanceCalendarPage() {
  return <GovernanceCalendarWorkspace portal="soe" />
}

export function LoansModulePage() {
  return <LoansRegistryWorkspace portal="soe" />
}

export function ProcurementModulePage() {
  return <ProcurementRegistryWorkspace portal="soe" />
}

export function AuditModulePage() {
  return (
    <div className="space-y-6">
      <AuditRegisterWorkspace portal="soe" />
      <AuditParaRegistryWorkspace portal="soe" />
    </div>
  )
}

export function LitigationModulePage() {
  return <LitigationRegistryWorkspace portal="soe" />
}

export function ComplianceModulePage() {
  return <ComplianceMatrixWorkspace portal="soe" />
}

export function IndustrialModulePage() {
  return <IndustrialWorkspacePage portal="soe" />
}

export function PrivatizationModulePage() {
  return (
    <div className="space-y-6">
      <PrivatizationPipelineWorkspace portal="soe" />
      <TransformationTrackerWorkspace portal="soe" />
    </div>
  )
}

export function AssetsModulePage() {
  return <SoeAssetRegistryPage />
}

export function PacModulePage() {
  return <PacObservationsWorkspace portal="soe" />
}
