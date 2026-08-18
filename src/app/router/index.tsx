import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import {
  AppErrorBoundary,
  NotFoundPage,
  RequireAuthentication,
  RequirePortal,
  RoleHomeRedirect,
  RequirePermission,
} from '@/app/router/guards'
import { LoginPage } from '@/portals/auth/LoginPage'
import { SoeDashboardPage } from '@/portals/soe/SoeDashboardPage'
import { SoeExecutiveDashboardPage } from '@/portals/soe/SoeExecutiveDashboardPage'
import { OrganizationsPage } from '@/portals/soe/OrganizationsPage'
import { ReportingWorkspacePage } from '@/portals/soe/ReportingWorkspacePage'
import { ClarificationInboxPage } from '@/portals/soe/ClarificationInboxPage'
import { ValidationCentrePage } from '@/portals/soe/ValidationCentrePage'
import { SubmissionReadinessPage } from '@/portals/soe/SubmissionReadinessPage'
import { DocumentsPage } from '@/portals/soe/DocumentsPage'
import {
  AssuranceEvidencePage,
  EnterpriseTimelineWorkspace,
  EvidenceViewerWorkspace,
  FieldChangeComparisonWorkspace,
  LineageExplorerWorkspace,
  MoipDocumentsPage,
  SubmissionHistoryWorkspace,
} from '@/portals/shared/DocumentsEvidenceWorkspacePages'
import { PortalSearchPage } from '@/portals/soe/PortalSearchPage'
import {
  AlertDetailWorkspace,
  EscalationDetailWorkspace,
  MinisterAlertsPage,
  MoipLogsEarlyWarningPage,
  SoeAlertsPage,
  SoeNotificationsPage,
  TaskDetailWorkspace,
} from '@/portals/shared/TasksEarlyWarningWorkspacePages'
import { SoeLogsPage } from '@/portals/shared/LogsWorkspacePages'
import { FinanceReviewPage } from '@/portals/soe/finance/FinanceReviewPage'
import { FinanceCertifyPage } from '@/portals/soe/finance/FinanceCertifyPage'
import { FinanceClarificationPage } from '@/portals/soe/finance/FinanceClarificationPage'
import { FinanceHistoryPage } from '@/portals/soe/finance/FinanceHistoryPage'
import {
  FinanceBudgetPage,
  FinanceComparePage,
  FinanceExposurePage,
  FinancePerformancePage,
  FinanceStatementsPage,
  IndustrialWorkspacePage,
  LoanDetailWorkspace,
  MoipFinanceIntelligencePage,
} from '@/portals/shared/FinanceFiscalWorkspacePages'
import {
  AuditModulePage,
  BoardModulePage,
  ComplianceModulePage,
  EnterpriseHistoryPage,
  EnterpriseLocationsPage,
  EnterpriseOwnershipPage,
  EnterpriseProfilePage,
  EnterpriseStructurePage,
  ExecutivesModulePage,
  IndustrialModulePage,
  LitigationModulePage,
  LoansModulePage,
  PrivatizationModulePage,
  ProcurementModulePage,
  WorkforceModulePage,
  PacModulePage,
} from '@/portals/soe/DomainModulePages'
import {
  AuditParaDetailWorkspace,
  ContractDetailWorkspace,
  MoipAuditCompliancePage,
  PrivatizationDetailWorkspace,
  PrivatizationPipelineWorkspace,
  ProcurementDetailWorkspace,
  TransformationTrackerWorkspace,
  LitigationDetailWorkspace,
} from '@/portals/shared/AccountabilityWorkspacePages'
import {
  SecretaryAuditLegalCommandPage,
  SecretaryComplianceSubmissionsPage,
  SecretaryCriticalMattersPage,
  SecretaryDecisionDetailPage,
  SecretaryEscalationQueuePage,
  SecretaryFinancialConcernsPage,
  SecretaryGovernanceCommandPage,
  SecretaryObligationsLookaheadPage,
  SecretaryPendingDecisionsPage,
} from '@/portals/secretary/SecretaryCommandCentrePages'
import { SecretaryExecutiveDashboardPage } from '@/portals/secretary/SecretaryExecutiveDashboardPage'
import { MinisterExecutiveDashboardPage } from '@/portals/minister/MinisterExecutiveDashboardPage'
import {
  MoipEnterpriseHistoryPage,
  MoipEnterpriseHubPage,
  MoipEnterpriseLocationsPage,
  MoipEnterpriseOwnershipPage,
  MoipEnterpriseProfilePage,
  MoipEnterpriseStructurePage,
} from '@/portals/shared/EnterpriseWorkspacePages'
import {
  MinisterAssetDetailPage,
  MoipAssetDetailPage,
  MoipAssetsPage,
  SoeAssetDetailPage,
  SoeBuildingAssetsPage,
  SoeEquipmentAssetsPage,
  SoeLandAssetsPage,
  SoeMachineryAssetsPage,
  SoeVehicleAssetsPage,
} from '@/portals/shared/AssetWorkspacePages'
import {
  MinisterNationalAssetMapPage,
  MoipNationalAssetMapPage,
  PmoNationalAssetMapPage,
} from '@/portals/shared/NationalIndustrialAssetMapPages'
import {
  MinisterIntelligencePage,
  MoipIntelligencePage,
  SecretaryIntelligencePage,
} from '@/portals/shared/IntelligenceRiskWorkspacePages'
import {
  MinisterAdvancedSearchPage,
  MoipAdvancedSearchPage,
  PmoAdvancedSearchPage,
  SecretaryAdvancedSearchPage,
} from '@/portals/shared/AdvancedSearchWorkspacePages'
import {
  MinisterReportsPage,
  MoipReportsPage,
  PmoReportsPage,
  SecretaryReportsPage,
  SoeReportsPage,
} from '@/portals/shared/ReportsBriefingsWorkspacePages'
import {
  BoardMemberDetailWorkspace,
  EmployeeDetailWorkspace,
  ExecutiveDetailWorkspace,
  MoipGovernancePage,
} from '@/portals/shared/PeopleGovernanceWorkspacePages'
import { FoundationLabPage, MapFoundationPage } from '@/portals/soe/MapAndLabPages'
import { DesignSystemPage } from '@/portals/soe/DesignSystemPage'
import { DemoControlsPage } from '@/portals/soe/DemoControlsPage'
import { StakeholderValidationPage } from '@/portals/soe/StakeholderValidationPage'
import {
  MoipFinanceReviewPage,
  MoipSubmissionQueuePage,
} from '@/portals/moip/MoipFinanceReviewPages'
import {
  MoipApprovalsPage,
  MoipClarificationQueuePage,
  MoipDataQualityPage,
  MoipPortfolioPage,
} from '@/portals/moip/MoipOversightWorkspacePages'
import { MoipReviewPackagePage } from '@/portals/moip/MoipReviewPages'
import { MoipPortfolioModulePage } from '@/portals/moip/MoipPortfolioModulePage'
import {
  MoipAdministrationAuditPage,
  MoipSoeAdministrationPage,
  MoipUserManagementPage,
} from '@/portals/moip/MoipAdministrationPages'
import {
  MoipSoeAdministrationDetailPage,
  MoipUserAdministrationDetailPage,
} from '@/portals/moip/MoipAdministrationDetailPages'
import { FinanceOverviewPage } from '@/portals/soe/finance/FinanceOverviewPage'
import {
  MinisterFinanceDrillPage,
} from '@/portals/minister/MinisterFinancePages'
import {
  MinisterAssetIntelligencePage,
  MinisterAuditLegalRiskPage,
  MinisterFiscalExposurePage,
  MinisterGovernanceRiskPage,
  MinisterIndustrialPerformancePage,
  MinisterPortfolioHealthPage,
  MinisterPrivatizationPage,
  MinisterStrategicOpportunitiesPage,
} from '@/portals/minister/MinisterStrategicWorkspacePages'
import {
  AssuranceDashboardPage,
  MoipDashboardPage,
  PmoDashboardPage,
} from '@/portals/shared/PortalLandings'
import { ModulePlaceholderPage } from '@/portals/shared/PortalShells'
import { APP_CONFIG } from '@/app/config/app.config'
import { flattenNavigation, portalDefinitions } from '@/app/config/navigation'
import { implementedRoutes } from '@/app/router/implementedRoutes'
import type { PortalId } from '@/constants'
import { PORTAL, ROLE } from '@/constants'
import { PERMISSION } from '@/permissions'
import { useSessionStore } from '@/state/session'

/** Must return Route elements directly — RR v6 rejects custom wrapper components as Routes children. */
function placeholderRoutes(portal: PortalId) {
  const portalPrefix = `/${portal}`
  return flattenNavigation(portalDefinitions[portal].navigation)
    .filter(
      (item) =>
        item.route === portalPrefix || item.route.startsWith(`${portalPrefix}/`),
    )
    .filter((item) => !implementedRoutes.has(item.route))
    .map((item) => (
      <Route
        key={item.route}
        path={item.route.replace(`${portalPrefix}/`, '')}
        element={<ModulePlaceholderPage />}
      />
    ))
}

function SoeHomePage() {
  const role = useSessionStore((state) => state.role)
  if (role === ROLE.SOE_EXECUTIVE) return <Navigate to="/soe/executive" replace />
  return <SoeDashboardPage />
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <AppErrorBoundary>
        <Routes>
          <Route path="/" element={<RoleHomeRedirect />} />
          <Route path="/login" element={<LoginPage />} />

          <Route element={<RequireAuthentication />}>
            <Route path="/soe" element={<RequirePortal portal="soe" />}>
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<SoeHomePage />} />
              <Route
                path="executive"
                element={
                  <RequirePermission permission={PERMISSION.EXECUTIVE_DASHBOARD_READ}>
                    <SoeExecutiveDashboardPage />
                  </RequirePermission>
                }
              />
              <Route path="reporting" element={<ReportingWorkspacePage />} />
              <Route path="clarifications" element={<ClarificationInboxPage />} />
              <Route path="validation" element={<ValidationCentrePage />} />
              <Route path="readiness" element={<SubmissionReadinessPage />} />
              <Route path="search" element={<PortalSearchPage />} />
              <Route path="documents" element={<DocumentsPage />} />
              <Route
                path="documents/submission-history"
                element={<SubmissionHistoryWorkspace />}
              />
              <Route
                path="documents/enterprise-timeline"
                element={<EnterpriseTimelineWorkspace />}
              />
              <Route path="documents/lineage" element={<LineageExplorerWorkspace />} />
              <Route
                path="documents/field-changes"
                element={<FieldChangeComparisonWorkspace />}
              />
              <Route
                path="documents/:id"
                element={<EvidenceViewerWorkspace portal="soe" />}
              />
              <Route path="organizations" element={<OrganizationsPage />} />

              <Route path="enterprise" element={<Navigate to="/soe/enterprise/profile" replace />} />
              <Route path="enterprise/profile" element={<EnterpriseProfilePage />} />
              <Route path="enterprise/ownership" element={<EnterpriseOwnershipPage />} />
              <Route path="enterprise/structure" element={<EnterpriseStructurePage />} />
              <Route path="enterprise/locations" element={<EnterpriseLocationsPage />} />
              <Route path="enterprise/history" element={<EnterpriseHistoryPage />} />

              <Route path="assets" element={<Navigate to="/soe/assets/land" replace />} />
              <Route path="assets/registry" element={<Navigate to="/soe/assets/land" replace />} />
              <Route path="assets/new" element={<Navigate to="/soe/assets/land" replace />} />
              <Route
                path="assets/land"
                element={
                  <RequirePermission permission={PERMISSION.ASSETS_READ}>
                    <SoeLandAssetsPage />
                  </RequirePermission>
                }
              />
              <Route
                path="assets/buildings"
                element={
                  <RequirePermission permission={PERMISSION.ASSETS_READ}>
                    <SoeBuildingAssetsPage />
                  </RequirePermission>
                }
              />
              <Route
                path="assets/machinery"
                element={
                  <RequirePermission permission={PERMISSION.ASSETS_READ}>
                    <SoeMachineryAssetsPage />
                  </RequirePermission>
                }
              />
              <Route
                path="assets/vehicles"
                element={
                  <RequirePermission permission={PERMISSION.ASSETS_READ}>
                    <SoeVehicleAssetsPage />
                  </RequirePermission>
                }
              />
              <Route
                path="assets/equipment"
                element={
                  <RequirePermission permission={PERMISSION.ASSETS_READ}>
                    <SoeEquipmentAssetsPage />
                  </RequirePermission>
                }
              />
              <Route
                path="assets/map"
                element={<Navigate to="/soe/assets/land" replace />}
              />
              <Route
                path="assets/:assetId"
                element={
                  <RequirePermission permission={PERMISSION.ASSETS_READ}>
                    <SoeAssetDetailPage />
                  </RequirePermission>
                }
              />

              <Route path="people/workforce" element={<WorkforceModulePage />} />
              <Route path="people/workforce/:employeeId" element={<EmployeeDetailWorkspace />} />
              <Route path="people/board" element={<BoardModulePage />} />
              <Route path="people/board/:memberId" element={<BoardMemberDetailWorkspace />} />
              <Route path="people/executives" element={<ExecutivesModulePage />} />
              <Route path="people/executives/:executiveId" element={<ExecutiveDetailWorkspace />} />
              <Route path="people/calendar" element={<Navigate to="/soe/people/executives" replace />} />
              <Route path="people" element={<Navigate to="/soe/people/executives" replace />} />

              <Route path="finance" element={<FinanceOverviewPage />} />
              <Route path="finance/performance" element={<FinancePerformancePage />} />
              <Route path="finance/budget" element={<FinanceBudgetPage />} />
              <Route path="finance/statements" element={<FinanceStatementsPage />} />
              <Route path="finance/exposure" element={<FinanceExposurePage />} />
              <Route path="finance/compare" element={<FinanceComparePage />} />
              <Route path="finance/form" element={<Navigate to="/soe/finance" replace />} />
              <Route path="finance/review" element={<FinanceReviewPage />} />
              <Route path="finance/certify" element={<FinanceCertifyPage />} />
              <Route path="finance/clarification" element={<FinanceClarificationPage />} />
              <Route path="finance/history" element={<FinanceHistoryPage />} />
              <Route path="finance/loans" element={<LoansModulePage />} />
              <Route path="finance/loans/:loanId" element={<LoanDetailWorkspace portal="soe" />} />

              <Route path="accountability/procurement" element={<ProcurementModulePage />} />
              <Route
                path="accountability"
                element={<Navigate to="/soe/accountability/procurement" replace />}
              />
              <Route
                path="accountability/procurement/:id"
                element={
                  <RequirePermission permission={PERMISSION.ACCOUNTABILITY_READ}>
                    <ProcurementDetailWorkspace portal="soe" />
                  </RequirePermission>
                }
              />
              <Route
                path="accountability/contracts/:id"
                element={
                  <RequirePermission permission={PERMISSION.ACCOUNTABILITY_READ}>
                    <ContractDetailWorkspace portal="soe" />
                  </RequirePermission>
                }
              />
              <Route path="accountability/audit" element={<AuditModulePage />} />
              <Route path="accountability/audit/pac" element={<PacModulePage />} />
              <Route
                path="accountability/audit/paras/:id"
                element={
                  <RequirePermission permission={PERMISSION.ACCOUNTABILITY_READ}>
                    <AuditParaDetailWorkspace portal="soe" />
                  </RequirePermission>
                }
              />
              <Route path="accountability/litigation" element={<LitigationModulePage />} />
              <Route
                path="accountability/litigation/:id"
                element={
                  <RequirePermission permission={PERMISSION.ACCOUNTABILITY_READ}>
                    <LitigationDetailWorkspace portal="soe" />
                  </RequirePermission>
                }
              />
              <Route path="accountability/compliance" element={<ComplianceModulePage />} />

              <Route path="industrial" element={<IndustrialModulePage />} />
              <Route
                path="reports"
                element={
                  <RequirePermission permission={PERMISSION.ORGANIZATION_READ}>
                    <SoeReportsPage />
                  </RequirePermission>
                }
              />
              <Route path="privatization" element={<PrivatizationModulePage />} />
              <Route
                path="privatization/transformation"
                element={
                  <RequirePermission permission={PERMISSION.ACCOUNTABILITY_READ}>
                    <TransformationTrackerWorkspace portal="soe" />
                  </RequirePermission>
                }
              />
              <Route
                path="privatization/:caseId"
                element={
                  <RequirePermission permission={PERMISSION.ACCOUNTABILITY_READ}>
                    <PrivatizationDetailWorkspace portal="soe" />
                  </RequirePermission>
                }
              />
              <Route path="logs" element={<SoeLogsPage />} />
              <Route path="tasks" element={<Navigate to="/soe/logs" replace />} />
              <Route path="tasks/:taskId" element={<Navigate to="/soe/logs" replace />} />
              <Route path="notifications" element={<SoeNotificationsPage />} />
              <Route path="alerts" element={<SoeAlertsPage />} />
              <Route path="alerts/:alertId" element={<AlertDetailWorkspace portal="soe" />} />
              <Route path="map" element={<MapFoundationPage />} />
              <Route path="design-system" element={<DesignSystemPage />} />
              <Route path="demo-controls" element={<DemoControlsPage />} />
              <Route path="stakeholder-validation" element={<StakeholderValidationPage />} />
              <Route path="foundation" element={<FoundationLabPage />} />
              {placeholderRoutes(PORTAL.SOE)}
            </Route>

            <Route path="/moip" element={<RequirePortal portal="moip" />}>
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<MoipDashboardPage />} />
              <Route
                path="organizations"
                element={<Navigate to="/moip/portfolio" replace />}
              />
              <Route
                path="portfolio"
                element={
                  <RequirePermission permission={PERMISSION.PORTFOLIO_READ}>
                    <MoipPortfolioPage />
                  </RequirePermission>
                }
              />
              <Route path="enterprise" element={<MoipEnterpriseHubPage />} />
              <Route path="enterprise/:organizationId" element={<MoipEnterpriseProfilePage />} />
              <Route
                path="enterprise/:organizationId/review"
                element={
                  <RequirePermission permission={PERMISSION.PORTFOLIO_READ}>
                    <MoipReviewPackagePage />
                  </RequirePermission>
                }
              />
              <Route
                path="enterprise/:organizationId/ownership"
                element={<MoipEnterpriseOwnershipPage />}
              />
              <Route
                path="enterprise/:organizationId/structure"
                element={<MoipEnterpriseStructurePage />}
              />
              <Route
                path="enterprise/:organizationId/locations"
                element={<MoipEnterpriseLocationsPage />}
              />
              <Route
                path="enterprise/:organizationId/history"
                element={<MoipEnterpriseHistoryPage />}
              />
              <Route
                path="assets"
                element={
                  <RequirePermission permission={PERMISSION.ASSETS_READ}>
                    <MoipAssetsPage />
                  </RequirePermission>
                }
              />
              <Route
                path="assets/map"
                element={
                  <RequirePermission permission={PERMISSION.ASSETS_READ}>
                    <MoipNationalAssetMapPage />
                  </RequirePermission>
                }
              />
              <Route
                path="assets/:assetId"
                element={
                  <RequirePermission permission={PERMISSION.ASSETS_READ}>
                    <MoipAssetDetailPage />
                  </RequirePermission>
                }
              />
              <Route
                path="governance"
                element={
                  <RequirePermission permission={PERMISSION.BOARD_READ}>
                    <MoipGovernancePage />
                  </RequirePermission>
                }
              />
              <Route path="submissions" element={<MoipSubmissionQueuePage />} />
              <Route path="submissions/:submissionId" element={<MoipFinanceReviewPage />} />
              <Route
                path="modules/:moduleId"
                element={
                  <RequirePermission permission={PERMISSION.PORTFOLIO_READ}>
                    <MoipPortfolioModulePage />
                  </RequirePermission>
                }
              />
              <Route
                path="admin/soes"
                element={
                  <RequirePermission permission={PERMISSION.ORGANIZATION_MANAGE}>
                    <MoipSoeAdministrationPage />
                  </RequirePermission>
                }
              />
              <Route
                path="admin/soes/:organizationId"
                element={
                  <RequirePermission permission={PERMISSION.ORGANIZATION_MANAGE}>
                    <MoipSoeAdministrationDetailPage />
                  </RequirePermission>
                }
              />
              <Route
                path="admin/users"
                element={
                  <RequirePermission permission={PERMISSION.USER_READ}>
                    <MoipUserManagementPage />
                  </RequirePermission>
                }
              />
              <Route
                path="admin/users/:userId"
                element={
                  <RequirePermission permission={PERMISSION.USER_MANAGE}>
                    <MoipUserAdministrationDetailPage />
                  </RequirePermission>
                }
              />
              <Route
                path="admin/audit-log"
                element={
                  <RequirePermission permission={PERMISSION.AUDIT_LOG_READ}>
                    <MoipAdministrationAuditPage />
                  </RequirePermission>
                }
              />
              <Route
                path="clarifications"
                element={
                  <RequirePermission permission={PERMISSION.CLARIFICATION_CREATE}>
                    <MoipClarificationQueuePage />
                  </RequirePermission>
                }
              />
              <Route
                path="approvals"
                element={
                  <RequirePermission permission={PERMISSION.SUBMISSION_APPROVE}>
                    <MoipApprovalsPage />
                  </RequirePermission>
                }
              />
              <Route path="logs" element={<MoipLogsEarlyWarningPage />} />
              <Route path="tasks" element={<Navigate to="/moip/logs" replace />} />
              <Route path="tasks/:taskId" element={<Navigate to="/moip/logs" replace />} />
              <Route path="alerts/:alertId" element={<AlertDetailWorkspace portal="moip" />} />
              <Route path="escalations/:id" element={<EscalationDetailWorkspace portal="moip" />} />
              <Route
                path="data-quality"
                element={
                  <RequirePermission permission={PERMISSION.PORTFOLIO_READ}>
                    <MoipDataQualityPage />
                  </RequirePermission>
                }
              />
              <Route
                path="finance"
                element={
                  <RequirePermission permission={PERMISSION.FINANCE_READ}>
                    <MoipFinanceIntelligencePage />
                  </RequirePermission>
                }
              />
              <Route
                path="industrial"
                element={
                  <RequirePermission permission={PERMISSION.FINANCE_READ}>
                    <IndustrialWorkspacePage portal="moip" />
                  </RequirePermission>
                }
              />
              <Route
                path="intelligence"
                element={
                  <RequirePermission permission={PERMISSION.PORTFOLIO_READ}>
                    <MoipIntelligencePage />
                  </RequirePermission>
                }
              />
              <Route
                path="search"
                element={
                  <RequirePermission permission={PERMISSION.PORTFOLIO_READ}>
                    <MoipAdvancedSearchPage />
                  </RequirePermission>
                }
              />
              <Route
                path="reports"
                element={
                  <RequirePermission permission={PERMISSION.PORTFOLIO_READ}>
                    <MoipReportsPage />
                  </RequirePermission>
                }
              />
              <Route
                path="audit-compliance"
                element={
                  <RequirePermission permission={PERMISSION.ACCOUNTABILITY_READ}>
                    <MoipAuditCompliancePage />
                  </RequirePermission>
                }
              />
              <Route
                path="privatization"
                element={
                  <RequirePermission permission={PERMISSION.ACCOUNTABILITY_READ}>
                    <PrivatizationPipelineWorkspace portal="moip" />
                  </RequirePermission>
                }
              />
              <Route
                path="documents"
                element={
                  <RequirePermission permission={PERMISSION.DOCUMENT_READ}>
                    <MoipDocumentsPage />
                  </RequirePermission>
                }
              />
              <Route
                path="documents/:id"
                element={
                  <RequirePermission permission={PERMISSION.DOCUMENT_READ}>
                    <EvidenceViewerWorkspace portal="moip" />
                  </RequirePermission>
                }
              />
              {placeholderRoutes(PORTAL.MOIP)}
            </Route>

            <Route path="/secretary" element={<RequirePortal portal="secretary" />}>
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<SecretaryExecutiveDashboardPage />} />
              <Route
                path="critical"
                element={
                  <RequirePermission permission={PERMISSION.EXECUTIVE_DASHBOARD_READ}>
                    <SecretaryCriticalMattersPage />
                  </RequirePermission>
                }
              />
              <Route
                path="decisions"
                element={
                  <RequirePermission permission={PERMISSION.EXECUTIVE_DASHBOARD_READ}>
                    <SecretaryPendingDecisionsPage />
                  </RequirePermission>
                }
              />
              <Route
                path="decisions/:decisionId"
                element={
                  <RequirePermission permission={PERMISSION.EXECUTIVE_DASHBOARD_READ}>
                    <SecretaryDecisionDetailPage />
                  </RequirePermission>
                }
              />
              <Route
                path="obligations"
                element={
                  <RequirePermission permission={PERMISSION.EXECUTIVE_DASHBOARD_READ}>
                    <SecretaryObligationsLookaheadPage />
                  </RequirePermission>
                }
              />
              <Route
                path="obligations/:taskId"
                element={
                  <RequirePermission permission={PERMISSION.EXECUTIVE_DASHBOARD_READ}>
                    <TaskDetailWorkspace portal="secretary" />
                  </RequirePermission>
                }
              />
              <Route
                path="compliance"
                element={
                  <RequirePermission permission={PERMISSION.ACCOUNTABILITY_READ}>
                    <SecretaryComplianceSubmissionsPage />
                  </RequirePermission>
                }
              />
              <Route
                path="finance"
                element={
                  <RequirePermission permission={PERMISSION.FINANCE_READ}>
                    <SecretaryFinancialConcernsPage />
                  </RequirePermission>
                }
              />
              <Route
                path="governance"
                element={
                  <RequirePermission permission={PERMISSION.BOARD_READ}>
                    <SecretaryGovernanceCommandPage />
                  </RequirePermission>
                }
              />
              <Route
                path="audit-legal"
                element={
                  <RequirePermission permission={PERMISSION.ACCOUNTABILITY_READ}>
                    <SecretaryAuditLegalCommandPage />
                  </RequirePermission>
                }
              />
              <Route
                path="intelligence"
                element={
                  <RequirePermission permission={PERMISSION.EXECUTIVE_DASHBOARD_READ}>
                    <SecretaryIntelligencePage />
                  </RequirePermission>
                }
              />
              <Route
                path="search"
                element={
                  <RequirePermission permission={PERMISSION.EXECUTIVE_DASHBOARD_READ}>
                    <SecretaryAdvancedSearchPage />
                  </RequirePermission>
                }
              />
              <Route
                path="reports"
                element={
                  <RequirePermission permission={PERMISSION.EXECUTIVE_DASHBOARD_READ}>
                    <SecretaryReportsPage />
                  </RequirePermission>
                }
              />
              <Route
                path="escalations"
                element={
                  <RequirePermission permission={PERMISSION.EXECUTIVE_DASHBOARD_READ}>
                    <SecretaryEscalationQueuePage />
                  </RequirePermission>
                }
              />
              <Route
                path="escalations/:id"
                element={
                  <RequirePermission permission={PERMISSION.EXECUTIVE_DASHBOARD_READ}>
                    <EscalationDetailWorkspace portal="secretary" />
                  </RequirePermission>
                }
              />
              <Route
                path="alerts/:alertId"
                element={
                  <RequirePermission permission={PERMISSION.EXECUTIVE_DASHBOARD_READ}>
                    <AlertDetailWorkspace portal="secretary" />
                  </RequirePermission>
                }
              />
              {placeholderRoutes(PORTAL.SECRETARY)}
            </Route>

            <Route path="/minister" element={<RequirePortal portal="minister" />}>
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<MinisterExecutiveDashboardPage />} />
              <Route path="finance/:organizationId" element={<MinisterFinanceDrillPage />} />
              <Route
                path="portfolio"
                element={
                  <RequirePermission permission={PERMISSION.PORTFOLIO_READ}>
                    <MinisterPortfolioHealthPage />
                  </RequirePermission>
                }
              />
              <Route
                path="fiscal"
                element={
                  <RequirePermission permission={PERMISSION.FINANCE_READ}>
                    <MinisterFiscalExposurePage />
                  </RequirePermission>
                }
              />
              <Route
                path="assets"
                element={
                  <RequirePermission permission={PERMISSION.ASSETS_READ}>
                    <MinisterAssetIntelligencePage />
                  </RequirePermission>
                }
              />
              <Route
                path="assets/map"
                element={
                  <RequirePermission permission={PERMISSION.ASSETS_READ}>
                    <MinisterNationalAssetMapPage />
                  </RequirePermission>
                }
              />
              <Route
                path="assets/:assetId"
                element={
                  <RequirePermission permission={PERMISSION.ASSETS_READ}>
                    <MinisterAssetDetailPage />
                  </RequirePermission>
                }
              />
              <Route
                path="governance"
                element={
                  <RequirePermission permission={PERMISSION.BOARD_READ}>
                    <MinisterGovernanceRiskPage />
                  </RequirePermission>
                }
              />
              <Route
                path="audit-legal"
                element={
                  <RequirePermission permission={PERMISSION.ACCOUNTABILITY_READ}>
                    <MinisterAuditLegalRiskPage />
                  </RequirePermission>
                }
              />
              <Route
                path="industrial"
                element={
                  <RequirePermission permission={PERMISSION.FINANCE_READ}>
                    <MinisterIndustrialPerformancePage />
                  </RequirePermission>
                }
              />
              <Route
                path="privatization"
                element={
                  <RequirePermission permission={PERMISSION.ACCOUNTABILITY_READ}>
                    <MinisterPrivatizationPage />
                  </RequirePermission>
                }
              />
              <Route
                path="opportunities"
                element={
                  <RequirePermission permission={PERMISSION.EXECUTIVE_DASHBOARD_READ}>
                    <MinisterStrategicOpportunitiesPage />
                  </RequirePermission>
                }
              />
              <Route
                path="intelligence"
                element={
                  <RequirePermission permission={PERMISSION.EXECUTIVE_DASHBOARD_READ}>
                    <MinisterIntelligencePage />
                  </RequirePermission>
                }
              />
              <Route
                path="search"
                element={
                  <RequirePermission permission={PERMISSION.EXECUTIVE_DASHBOARD_READ}>
                    <MinisterAdvancedSearchPage />
                  </RequirePermission>
                }
              />
              <Route
                path="reports"
                element={
                  <RequirePermission permission={PERMISSION.EXECUTIVE_DASHBOARD_READ}>
                    <MinisterReportsPage />
                  </RequirePermission>
                }
              />
              <Route
                path="alerts"
                element={
                  <RequirePermission permission={PERMISSION.EXECUTIVE_DASHBOARD_READ}>
                    <MinisterAlertsPage />
                  </RequirePermission>
                }
              />
              <Route
                path="alerts/:alertId"
                element={
                  <RequirePermission permission={PERMISSION.EXECUTIVE_DASHBOARD_READ}>
                    <AlertDetailWorkspace portal="minister" />
                  </RequirePermission>
                }
              />
              {placeholderRoutes(PORTAL.MINISTER)}
            </Route>

            {APP_CONFIG.ENABLE_PMO_PORTAL ? (
              <Route path="/pmo" element={<RequirePortal portal="pmo" />}>
                <Route index element={<Navigate to="dashboard" replace />} />
                <Route path="dashboard" element={<PmoDashboardPage />} />
                <Route path="capital" element={<Navigate to="/pmo/dashboard#fiscal" replace />} />
                <Route path="fiscal-burden" element={<Navigate to="/pmo/dashboard#fiscal" replace />} />
                <Route path="land-bank" element={<Navigate to="/pmo/dashboard#assets" replace />} />
                <Route
                  path="map"
                  element={
                    <RequirePermission permission={PERMISSION.ASSETS_READ}>
                      <PmoNationalAssetMapPage />
                    </RequirePermission>
                  }
                />
                <Route path="industrial" element={<Navigate to="/pmo/dashboard#industry" replace />} />
                <Route path="employment-exports" element={<Navigate to="/pmo/dashboard#industry" replace />} />
                <Route path="privatization" element={<Navigate to="/pmo/dashboard#transformation" replace />} />
                <Route path="indicators" element={<Navigate to="/pmo/dashboard#overview" replace />} />
                <Route path="intelligence" element={<Navigate to="/pmo/dashboard#overview" replace />} />
                <Route
                  path="search"
                  element={
                    <RequirePermission permission={PERMISSION.EXECUTIVE_DASHBOARD_READ}>
                      <PmoAdvancedSearchPage />
                    </RequirePermission>
                  }
                />
                <Route
                  path="reports"
                  element={
                    <RequirePermission permission={PERMISSION.EXECUTIVE_DASHBOARD_READ}>
                      <PmoReportsPage />
                    </RequirePermission>
                  }
                />
                {placeholderRoutes(PORTAL.PMO)}
              </Route>
            ) : (
              <Route path="/pmo/*" element={<ModulePlaceholderPage title="PMO portal disabled" />} />
            )}

            {APP_CONFIG.ENABLE_ASSURANCE_PORTAL ? (
              <Route path="/assurance" element={<RequirePortal portal="assurance" />}>
                <Route index element={<Navigate to="dashboard" replace />} />
                <Route path="dashboard" element={<AssuranceDashboardPage />} />
                <Route
                  path="evidence"
                  element={
                    <RequirePermission permission={PERMISSION.DOCUMENT_READ}>
                      <AssuranceEvidencePage />
                    </RequirePermission>
                  }
                />
                <Route
                  path="evidence/:id"
                  element={
                    <RequirePermission permission={PERMISSION.DOCUMENT_READ}>
                      <EvidenceViewerWorkspace portal="assurance" />
                    </RequirePermission>
                  }
                />
                {placeholderRoutes(PORTAL.ASSURANCE)}
              </Route>
            ) : null}
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </AppErrorBoundary>
    </BrowserRouter>
  )
}
