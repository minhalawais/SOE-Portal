**STATE-OWNED ENTERPRISES  
GOVERNANCE, ASSET & PERFORMANCE  
INTELLIGENCE PLATFORM**

**SOE-GAIP**

**Functional Requirements Specification**

Production Functional Baseline

| **Document Code** | SOE-GAIP-FRS-001                                              |
|-------------------|---------------------------------------------------------------|
| **Version**       | 1.0                                                           |
| **Status**        | Draft for Stakeholder Validation                              |
| **Prepared for**  | Ministry of Industries and Production, Government of Pakistan |
| **Prepared by**   | Fruit of Sustainability (FOS)                                 |

*This document is a structured project design baseline and remains subject to formal stakeholder validation, policy approval and detailed technical design.*

# Document Control

| **Purpose**           | Define the complete functional behavior required for the initial SOE-GAIP software release and provide a traceable baseline for design, development, testing and user acceptance.                                                                                    |
|-----------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **Scope**             | Covers the SOE submission portal, MoIP oversight portal, executive intelligence portal, all core SOE data domains, workflows, data import, documents, dashboards, reporting, security-related functions and administration.                                          |
| **Primary Basis**     | SOE-GAIP concept and module framework developed from the Ministry-focused SOE oversight requirements provided for this project.                                                                                                                                      |
| **Current Exclusion** | External integrations with SECP, FBR, AGPR, PPRA, Auditor General, Privatization Commission, PBS, NADRA, land record authorities or other third-party systems are not part of the initial development. The system shall remain integration-ready for a future phase. |

# Table of Contents

**1. Purpose and Product Definition**

**2. Scope and Boundaries**

**3. User Roles and Portals**

**4. Core Workflow**

**5. Functional Requirements by Domain**

**6. Cross-Cutting Platform Requirements**

**7. Non-Functional Requirements**

**8. Data and Validation Principles**

**9. User Acceptance Baseline**

**10. Initial Release Boundaries**

# 1. Purpose and Product Definition

SOE-GAIP shall operate as a centralized governance, asset and performance intelligence platform for State-Owned Enterprises under the oversight of the Ministry of Industries and Production. It shall not function as a simple asset declaration portal or a collection of disconnected forms. The system shall maintain authoritative SOE records, govern how information is submitted and approved, preserve historical evidence and convert approved information into role-specific oversight intelligence.

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th><strong>North-Star Requirement<br />
</strong>Every material executive insight must be traceable to an approved record, reporting period, responsible SOE, responsible official, supporting evidence and immutable audit history.</th>
</tr>
</thead>
<tbody>
</tbody>
</table>

## 1.1 Business Outcomes

- Create one authoritative registry of SOEs and their corporate structures.

- Maintain a structured registry of government assets with ownership, location, valuation, utilization and legal status.

- Standardize financial, governance, workforce, compliance, audit, legal and industrial performance information across SOEs.

- Enforce reporting, certification, review, correction, approval and historical locking workflows.

- Provide Secretary, Minister and other authorized senior users with decision-oriented dashboards and exception views.

- Create a foundation for early warning, benchmarking, asset opportunity analysis and future decision support.

# 2. Scope and Boundaries

## 2.1 In Scope for Initial Development

- Role-based user portals for SOEs, MoIP reviewers and executive users.

- Manual structured data entry, standardized Excel/CSV bulk import, document upload and baseline data migration support.

- Core enterprise, asset, people, governance, financial, accountability, compliance, industrial performance and privatization modules.

- Reporting periods, submissions, internal completion status, certification, Ministry review, clarification, approval and locking.

- Document evidence linking, version history, record-level audit logs and change history.

- GIS-enabled asset records and national industrial asset map functionality.

- KPI calculation, scorecards, risk indicators, early warning rules, cross-SOE comparison and executive reporting.

- System administration, master data management, permissions, notifications and configurable thresholds.

## 2.2 Out of Scope for Initial Development

- Direct external API integrations with government or third-party systems.

- Automatic synchronization with SECP, FBR, PPRA, AGPR, Auditor General, land record authorities or other agencies.

- Fully autonomous AI decision-making or automatic modification of official records.

- Public disclosure portal unless separately approved and scoped.

- Replacement of an SOE's existing ERP, HRMS, payroll or accounting system.

# 3. User Roles and Portals

| **Role**                              | **Primary Portal**        | **Core Responsibility**                                                                                                         |
|---------------------------------------|---------------------------|---------------------------------------------------------------------------------------------------------------------------------|
| SOE Focal Person                      | SOE Portal                | Coordinate reporting cycle, assign contributors, track completeness, submit for certification and respond to queries.           |
| SOE Department Contributor            | SOE Portal                | Maintain assigned finance, HR, asset, legal, procurement, audit, compliance or industrial records.                              |
| SOE CEO/CFO / Authorized Certifier    | SOE Portal                | Review submission summary and certify required reporting data.                                                                  |
| MoIP Reviewer                         | MoIP Oversight Portal     | Review assigned SOEs, validate submissions, raise clarifications, return records and approve within authority.                  |
| MoIP Supervisory Officer              | MoIP Oversight Portal     | Monitor reviewer workload, escalations, overdue obligations and high-risk items.                                                |
| Secretary / Senior Administration     | Executive Portal          | View operational exceptions, overdue obligations, governance gaps, major financial concerns and matters requiring intervention. |
| Minister / Senior Leadership          | Executive Portal          | View portfolio health, assets, fiscal exposure, performance, major risks, strategic opportunities and top decisions.            |
| Authorized Audit / Institutional User | Controlled Oversight View | Read only authorized records, evidence, audit history and institution-specific outputs.                                         |
| System Administrator                  | Administration            | Manage users, roles, master data, reporting periods, configurable rules, notification templates and system settings.            |

# 4. Core End-to-End Workflow

| **Step** | **Stage**               | **Required System Behavior**                                                                                         |
|----------|-------------------------|----------------------------------------------------------------------------------------------------------------------|
| 1        | Reporting Cycle Opened  | Authorized MoIP administrator creates monthly, quarterly, annual or special reporting cycle and assigns scope.       |
| 2        | SOE Workspace Generated | System creates required sections, deadlines, responsible functions and completion status for each participating SOE. |
| 3        | Data Prepared           | SOE users enter structured records, upload bulk files or attach supporting documents.                                |
| 4        | Validation Performed    | System checks mandatory fields, formats, data types, duplicate records, cross-field rules and historical anomalies.  |
| 5        | Internal Completion     | SOE focal person confirms all required sections are complete and exceptions are resolved or formally explained.      |
| 6        | Certification           | CEO/CFO or authorized certifier digitally certifies applicable submission content.                                   |
| 7        | MoIP Review             | Assigned Ministry reviewer evaluates records, evidence, changes, risks and data quality.                             |
| 8        | Clarification / Return  | Reviewer raises record-level query or returns selected items without invalidating unrelated approved content.        |
| 9        | Approval                | Authorized reviewer approves the reporting submission or individual domain section based on configured workflow.     |
| 10       | Historical Lock         | Approved snapshot becomes immutable for the reporting period. Corrections create a new version.                      |
| 11       | Intelligence Update     | Approved data updates KPIs, trends, risk indicators, scorecards, GIS views and executive dashboards.                 |
| 12       | Continuous Monitoring   | System generates tasks, alerts and escalations for future deadlines, expiries and configured risk conditions.        |

# 5. Functional Requirements by Domain

## 5.1 Authentication, Identity and Access Control

| **Requirement ID** | **Requirement**                                                                                                          | **Priority** |
|--------------------|--------------------------------------------------------------------------------------------------------------------------|--------------|
| FR-AUTH-001        | The system shall authenticate all users before granting access to protected functions.                                   | Must         |
| FR-AUTH-002        | The system shall support role-based access combined with organization scope and functional permissions.                  | Must         |
| FR-AUTH-003        | The system shall support multi-factor authentication for privileged and executive accounts.                              | Must         |
| FR-AUTH-004        | The system shall prevent SOE users from viewing or editing another SOE unless explicitly authorized.                     | Must         |
| FR-AUTH-005        | The system shall support field-level restriction for sensitive data such as CNIC, remuneration and disciplinary records. | Must         |
| FR-AUTH-006        | The system shall record login, logout, failed authentication and privileged administrative actions.                      | Must         |

## 5.2 SOE Master Registry and Corporate Structure

| **Requirement ID** | **Requirement**                                                                                                                                 | **Priority** |
|--------------------|-------------------------------------------------------------------------------------------------------------------------------------------------|--------------|
| FR-SOE-001         | The system shall create a unique SOE master record with system-generated identifier.                                                            | Must         |
| FR-SOE-002         | The system shall capture legal identity, registration, status, sector, administrative relationship, addresses, locations and official contacts. | Must         |
| FR-SOE-003         | The system shall record government, private, foreign, provincial, employee, public and institutional shareholding where applicable.             | Must         |
| FR-SOE-004         | The system shall model holding companies, subsidiaries, associates and joint ventures with ownership percentages.                               | Must         |
| FR-SOE-005         | The system shall preserve historical changes to legal status, ownership and organizational relationships.                                       | Must         |
| FR-SOE-006         | The system shall support configurable SOE statuses including active, dormant, under liquidation, under privatization, merged and closed.        | Must         |

## 5.3 Asset Registry, Land and GIS

| **Requirement ID** | **Requirement**                                                                                                                                                                                                | **Priority** |
|--------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|--------------|
| FR-AST-001         | The system shall assign a unique Asset ID to each material asset record.                                                                                                                                       | Must         |
| FR-AST-002         | The system shall support asset categories including land, buildings, machinery, vehicles, IT equipment and other equipment.                                                                                    | Must         |
| FR-AST-003         | Land records shall capture province, district, tehsil, mouza, survey or Khasra reference, area, ownership, current use, book value, market value, acquisition date, encroachment, litigation and lease status. | Must         |
| FR-AST-004         | Building records shall capture type, condition, age, floor area, occupancy, replacement value, maintenance cost and insurance.                                                                                 | Must         |
| FR-AST-005         | Machinery records shall capture manufacturer, purchase details, depreciation, useful life, condition, location, capacity, utilization and maintenance status.                                                  | Must         |
| FR-AST-006         | Vehicle records shall capture registration or vehicle number, type, year, current value, assignment, mileage, insurance, fuel use and disposal status.                                                         | Must         |
| FR-AST-007         | The system shall allow geo-coordinates and geospatial geometry to be associated with land and facility assets.                                                                                                 | Must         |
| FR-AST-008         | The system shall provide map-based filtering by organization, province, district, asset type, utilization, litigation and encroachment status.                                                                 | Must         |
| FR-AST-009         | The system shall link ownership documents, mutation, revenue record, valuation report, lease, photographs and court documents to individual assets.                                                            | Must         |
| FR-AST-010         | The system shall flag potential duplicate assets based on configurable identifiers and location attributes.                                                                                                    | Should       |

## 5.4 Human Resources and Workforce

| **Requirement ID** | **Requirement**                                                                                                                                                                                                                             | **Priority** |
|--------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|--------------|
| FR-HR-001          | The system shall maintain sanctioned, filled and vacant posts by SOE and organizational unit.                                                                                                                                               | Must         |
| FR-HR-002          | The system shall maintain employee records including identifier, designation, employment type, pay scale, salary components, joining, retirement, qualification, gender, province, disability, posting and reporting officer as applicable. | Must         |
| FR-HR-003          | The system shall separately support daily wagers, consultants, interns and deputation records.                                                                                                                                              | Must         |
| FR-HR-004          | The system shall support bulk import and exception-based annual updates for high-volume workforce data.                                                                                                                                     | Must         |
| FR-HR-005          | The system shall provide aggregated workforce analytics while restricting sensitive personal fields according to role.                                                                                                                      | Must         |

## 5.5 Board Governance and Executive Management

| **Requirement ID** | **Requirement**                                                                                                                                                                                                     | **Priority** |
|--------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|--------------|
| FR-GOV-001         | The system shall maintain Board composition, member category, appointment date, expiry date, attendance and committee membership.                                                                                   | Must         |
| FR-GOV-002         | The system shall maintain conflict-of-interest, asset declaration, remuneration, sitting fee and travel expense records where required.                                                                             | Must         |
| FR-GOV-003         | The system shall automatically create configurable Board-expiry alerts including 180-day, 90-day and 30-day thresholds.                                                                                             | Must         |
| FR-GOV-004         | The system shall identify Board vacancies and incomplete committee composition.                                                                                                                                     | Must         |
| FR-GOV-005         | The system shall separately maintain CEO, MD, GM and director-level management records including remuneration, bonuses, perks, official residences, vehicles, foreign visits and performance KPIs where applicable. | Must         |
| FR-GOV-006         | The system shall provide a governance calendar for appointments, expiries, declarations, evaluations and other scheduled obligations.                                                                               | Must         |

## 5.6 Financial Performance, Loans and Government Support

| **Requirement ID** | **Requirement**                                                                                                                                                                                     | **Priority** |
|--------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|--------------|
| FR-FIN-001         | The system shall maintain reporting-period financial data including budget, revenue, operating expenditure, CAPEX, profit or loss, cash flow, working capital, receivables, payables and inventory. | Must         |
| FR-FIN-002         | The system shall calculate approved financial ratios such as current ratio, debt ratio, ROA and ROE from defined source fields.                                                                     | Must         |
| FR-FIN-003         | The system shall maintain five-year and longer trends where historical data exists.                                                                                                                 | Must         |
| FR-FIN-004         | The system shall maintain loan records including lender, type, principal, interest, outstanding balance, repayment schedule, default status and guarantees.                                         | Must         |
| FR-FIN-005         | The system shall maintain grants, subsidies and other government support by source, amount, project, utilization and remaining balance.                                                             | Must         |
| FR-FIN-006         | The system shall link audited financial statements and supporting notes to the relevant reporting period.                                                                                           | Must         |
| FR-FIN-007         | The system shall flag material year-on-year changes based on configurable thresholds and require an explanation where configured.                                                                   | Should       |

## 5.7 Procurement, Audit, Litigation and Compliance

| **Requirement ID** | **Requirement**                                                                                                                                                                                                                                          | **Priority** |
|--------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|--------------|
| FR-ACC-001         | The system shall maintain annual procurement plans and contract records including vendor, value, procurement method, compliance status and completion.                                                                                                   | Must         |
| FR-ACC-002         | The system shall maintain audit engagements and individual audit paras or observations as actionable records.                                                                                                                                            | Must         |
| FR-ACC-003         | Audit paras shall support amount involved, responsible unit, management response, corrective action, recovery status, due date, PAC observation and closure status.                                                                                      | Must         |
| FR-ACC-004         | The system shall maintain litigation cases including court, case number, parties, nature, amount involved, counsel, status and next hearing.                                                                                                             | Must         |
| FR-ACC-005         | The system shall maintain a configurable compliance register covering SOE Act, Companies Act, PPRA, SECP filings, tax, EOBI, ESSI, environmental, labour, Board evaluation, annual report, strategic plan, risk register and internal audit obligations. | Must         |
| FR-ACC-006         | Compliance requirements shall support frequency, due date, evidence, responsible officer, status, reviewer and non-compliance reason.                                                                                                                    | Must         |

## 5.8 Privatization and Industrial Performance

| **Requirement ID** | **Requirement**                                                                                                                                                                                                           | **Priority** |
|--------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|--------------|
| FR-STR-001         | The system shall maintain privatization or transformation cases using configurable stages and milestones.                                                                                                                 | Must         |
| FR-STR-002         | The initial stage model shall support Cabinet decision, CCOP decision, Privatization Commission stage, financial advisor, valuation, due diligence, EOI, bidding, sale completion and post-sale monitoring as applicable. | Must         |
| FR-STR-003         | Each privatization milestone shall support owner, target date, completion date, status, evidence and blocker.                                                                                                             | Must         |
| FR-STR-004         | The system shall capture installed capacity, actual production, capacity utilization, exports, imports, domestic sales, employment, energy consumption and carbon emissions where applicable.                             | Must         |
| FR-STR-005         | The system shall support trend and cross-SOE comparison of industrial performance metrics.                                                                                                                                | Must         |

## 5.9 Document and Evidence Management

| **Requirement ID** | **Requirement**                                                                                                                                                                      | **Priority** |
|--------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|--------------|
| FR-DOC-001         | The system shall store document metadata separately from document binary files.                                                                                                      | Must         |
| FR-DOC-002         | Documents shall be linkable to the exact SOE, asset, employee, Board record, financial period, audit para, litigation case, compliance item or privatization milestone they support. | Must         |
| FR-DOC-003         | The system shall preserve document versions and prevent silent overwrite of previously approved evidence.                                                                            | Must         |
| FR-DOC-004         | The system shall support file type, size and malware validation before document acceptance.                                                                                          | Must         |
| FR-DOC-005         | The system shall support document classification, confidentiality level, uploader, upload date and checksum metadata.                                                                | Should       |

## 5.10 Reporting Cycle, Submission, Certification and Review

| **Requirement ID** | **Requirement**                                                                                                                                                                                                    | **Priority** |
|--------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|--------------|
| FR-WF-001          | The system shall allow authorized administrators to configure monthly, quarterly, annual and special reporting cycles.                                                                                             | Must         |
| FR-WF-002          | Each reporting cycle shall define participating SOEs, required sections, due dates, certification requirements and review authority.                                                                               | Must         |
| FR-WF-003          | The system shall display completion percentage, missing requirements, validation errors and pending evidence by section.                                                                                           | Must         |
| FR-WF-004          | The system shall support Draft, Internal Review, Ready for Certification, Certified, Submitted, Under Review, Clarification Requested, Resubmitted, Approved and Locked states, with configuration where required. | Must         |
| FR-WF-005          | The system shall support record-level clarification and return without requiring complete resubmission of unrelated valid sections.                                                                                | Must         |
| FR-WF-006          | The system shall record certification by CEO, CFO or other authorized role including timestamp and certification statement.                                                                                        | Must         |
| FR-WF-007          | Approved reporting snapshots shall be immutable. Corrections shall create a new version linked to the prior version.                                                                                               | Must         |
| FR-WF-008          | The system shall preserve complete workflow transition history.                                                                                                                                                    | Must         |

## 5.11 Tasks, Notifications and Early Warning

| **Requirement ID** | **Requirement**                                                                                                                                                                             | **Priority** |
|--------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|--------------|
| FR-ALR-001         | The system shall create tasks from configured obligations, workflow events and risk rules.                                                                                                  | Must         |
| FR-ALR-002         | Tasks shall support owner, due date, priority, related record, status and escalation path.                                                                                                  | Must         |
| FR-ALR-003         | The system shall support informational, attention and critical alert severity.                                                                                                              | Must         |
| FR-ALR-004         | The system shall support configurable reminders before due dates and escalation after overdue dates.                                                                                        | Must         |
| FR-ALR-005         | The system shall support rule-based early warning for Board expiry, overdue reporting, loan default, missing financial statements, deteriorating performance and other approved conditions. | Must         |
| FR-ALR-006         | Users shall be able to acknowledge, assign, resolve and document action on alerts.                                                                                                          | Should       |

## 5.12 Dashboards, KPI, Risk, Search and Reporting

| **Requirement ID** | **Requirement**                                                                                                                                                                                                                                  | **Priority** |
|--------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|--------------|
| FR-BI-001          | The system shall provide a distinct SOE operational dashboard focused on submission completeness, pending tasks, returned items and deadlines.                                                                                                   | Must         |
| FR-BI-002          | The system shall provide a MoIP oversight dashboard focused on reporting status, data-quality exceptions, governance gaps, financial deterioration, compliance and pending reviews.                                                              | Must         |
| FR-BI-003          | The Secretary view shall prioritize exceptions, overdue obligations, major audit matters, loan repayments, Board vacancies and escalations.                                                                                                      | Must         |
| FR-BI-004          | The Minister view shall summarize portfolio health, government investment, assets, liabilities, profit or loss, subsidies, capacity utilization, governance issues, litigation, audit exposure, privatization and strategic asset opportunities. | Must         |
| FR-BI-005          | The system shall calculate KPIs centrally from approved definitions rather than independently in frontend components.                                                                                                                            | Must         |
| FR-BI-006          | The system shall support configurable SOE scorecards across financial, governance, compliance, operational, asset efficiency and strategic contribution dimensions.                                                                              | Should       |
| FR-BI-007          | The system shall support multi-dimensional risk views without concealing individual risk dimensions behind a single composite score.                                                                                                             | Should       |
| FR-BI-008          | The system shall support advanced filtering and search across SOEs, assets, reporting periods, audit paras, litigation, documents and other key records.                                                                                         | Must         |
| FR-BI-009          | The system shall generate exportable executive, portfolio, asset, financial, governance, audit, legal, compliance and privatization reports.                                                                                                     | Must         |
| FR-BI-010          | Executive KPI values shall provide drill-down to supporting records where the user has permission.                                                                                                                                               | Must         |

## 5.13 Data Import and Baseline Migration

| **Requirement ID** | **Requirement**                                                                                                       | **Priority** |
|--------------------|-----------------------------------------------------------------------------------------------------------------------|--------------|
| FR-IMP-001         | The system shall support approved Excel/CSV templates for high-volume data import.                                    | Must         |
| FR-IMP-002         | Imported data shall first enter a staging area and shall not directly write to authoritative production records.      | Must         |
| FR-IMP-003         | The import process shall perform schema, datatype, required-field, reference, duplicate and business-rule validation. | Must         |
| FR-IMP-004         | The system shall produce row-level exception reports and allow correction before final import.                        | Must         |
| FR-IMP-005         | The system shall support initial baseline migration and later exception-based updates.                                | Must         |
| FR-IMP-006         | The system shall maintain source file, import batch, uploader, timestamp and import result history.                   | Must         |

## 5.14 Administration and Configuration

| **Requirement ID** | **Requirement**                                                                                                                                     | **Priority** |
|--------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------|--------------|
| FR-ADM-001         | Authorized administrators shall manage users, roles, permissions, organizations, master data and reporting cycles.                                  | Must         |
| FR-ADM-002         | Authorized administrators shall configure thresholds, alert rules, compliance frequencies and notification templates without direct database edits. | Should       |
| FR-ADM-003         | The system shall support activation, deactivation and archival of master records while preserving historical references.                            | Must         |
| FR-ADM-004         | The system shall provide administrative audit logs and configuration history.                                                                       | Must         |

# 6. Cross-Cutting Platform Requirements

| **Principle**                    | **Requirement**                                                                                                                                   |
|----------------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------|
| Record ownership                 | Every authoritative record shall be associated with an SOE, reporting period or master-data context as appropriate.                               |
| Evidence lineage                 | Where evidence is required, the record shall expose direct links to supporting documents.                                                         |
| Status model                     | Material records shall have controlled statuses rather than relying on free-text descriptions.                                                    |
| Historical integrity             | Approved historical data shall never be silently overwritten.                                                                                     |
| Exception-first UX               | Users shall see incomplete, overdue, returned or anomalous items before low-priority information.                                                 |
| Configurable thresholds          | Materiality and risk thresholds shall be configurable because final policy values require stakeholder approval.                                   |
| No AI writes to official records | Any AI-assisted extraction, summary or anomaly suggestion shall require human review before changing an authoritative record.                     |
| Integration readiness            | Internal APIs and external-reference fields shall be designed now so future external integrations do not require redesign of the core data model. |

# 7. Non-Functional Requirements

| **ID**        | **Category**        | **Requirement**                                                                                                                                                              |
|---------------|---------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| NFR-SEC-001   | Security            | Sensitive data shall be protected through least-privilege access, encryption in transit and at rest, secure sessions, MFA for privileged roles and auditable administration. |
| NFR-AV-001    | Availability        | Production availability targets shall be finalized with hosting authority. The architecture shall support redundant application instances and database recovery.             |
| NFR-PERF-001  | Performance         | Standard authenticated pages should normally render within 3 seconds under agreed production load, excluding heavy exports or large-file processing.                         |
| NFR-PERF-002  | Large imports       | Bulk imports and heavy report generation shall run asynchronously without blocking interactive user sessions.                                                                |
| NFR-SCALE-001 | Scalability         | The system shall support growth in SOEs, records, reporting periods and documents without changing the core architecture.                                                    |
| NFR-AUD-001   | Auditability        | All material create, update, submit, certify, approve, reject, return, delete and configuration actions shall be auditable.                                                  |
| NFR-DR-001    | Backup and Recovery | Automated backups, point-in-time recovery and disaster-recovery procedures shall be implemented. Final RPO/RTO shall be approved during infrastructure design.               |
| NFR-UX-001    | Usability           | SOE data-entry experiences shall prioritize guided workflows, bulk input, prepopulation and exception correction to minimize repetitive entry.                               |
| NFR-ACC-001   | Accessibility       | The web interface shall follow WCAG 2.1 AA principles where technically applicable, including keyboard access, contrast and semantic labeling.                               |
| NFR-COMP-001  | Browser support     | The system shall support current enterprise versions of major Chromium-based browsers and any additional browser mandated by the Government hosting environment.             |
| NFR-OBS-001   | Observability       | Application errors, background jobs, security events, database health and system performance shall be centrally monitorable.                                                 |
| NFR-MAINT-001 | Maintainability     | The backend shall use modular domain boundaries and documented internal APIs to minimize cross-module coupling.                                                              |
| NFR-PRIV-001  | Privacy             | Personal information shall be visible only to roles with a legitimate functional need and shall not be exposed in executive analytics unless required.                       |
| NFR-EXP-001   | Export              | Authorized users shall be able to export approved reports in Excel and PDF-compatible formats.                                                                               |

# 8. Data and Validation Principles

- All high-volume imports must pass through staging and validation before becoming authoritative.

- Financial and operational KPIs must use approved formulas with versioned definitions.

- Year-on-year anomalies should be flagged but should not automatically invalidate a legitimate change.

- External identifiers such as SECP number, NTN, PPRA reference or land-record reference may be stored in Phase 1 but are not externally verified until the integration phase.

- Where a value is estimated, unaudited or pending verification, that status must be explicitly captured.

- Approved reporting snapshots must preserve the exact values and evidence that existed at the time of approval.

# 9. User Acceptance Baseline

| **Acceptance Area**    | **Minimum Acceptance Condition**                                                                                               |
|------------------------|--------------------------------------------------------------------------------------------------------------------------------|
| SOE onboarding         | A new SOE can be created, users assigned and reporting workspace generated without developer intervention.                     |
| Bulk data              | A standardized Excel asset file can be uploaded, validated, exceptions corrected and accepted into staging before publication. |
| Certification          | Completed annual submission can be certified by an authorized CEO/CFO role and the certification is auditable.                 |
| Review                 | MoIP reviewer can raise a clarification on one record, receive the response and approve without reopening unrelated records.   |
| Versioning             | An approved period cannot be overwritten. A correction produces a new traceable version.                                       |
| Executive traceability | An authorized executive can drill from a KPI to the underlying approved records and evidence.                                  |
| Early warning          | A configured Board expiry or overdue reporting condition generates the expected task and alert.                                |
| Security               | SOE users cannot view another SOE and sensitive fields remain restricted according to permission.                              |
| Audit trail            | Material user and system actions are recoverable from immutable activity history.                                              |
| Reports                | Authorized users can generate agreed portfolio and SOE-level reports from approved data.                                       |

# 10. Initial Release Boundaries

The initial release is considered complete when the platform can operate end-to-end without dependency on any external government API: SOEs can be onboarded, data can be entered or imported, evidence can be attached, reporting can be certified and reviewed, approved information can be locked, dashboards can be produced and audit history can be demonstrated. External government integrations shall be executed as a separately governed post-development phase.
