**STATE-OWNED ENTERPRISES  
GOVERNANCE, ASSET & PERFORMANCE  
INTELLIGENCE PLATFORM**

**SOE-GAIP**

**System Architecture Document**

Production Architecture Blueprint

| **Document Code** | SOE-GAIP-SAD-001                                              |
|-------------------|---------------------------------------------------------------|
| **Version**       | 1.0                                                           |
| **Status**        | Draft for Stakeholder Validation                              |
| **Prepared for**  | Ministry of Industries and Production, Government of Pakistan |
| **Prepared by**   | Fruit of Sustainability (FOS)                                 |

*This document is a structured project design baseline and remains subject to formal stakeholder validation, policy approval and detailed technical design.*

# Document Control

| **Purpose**           | Define the target technical architecture for initial SOE-GAIP development and establish clear boundaries between user portals, business services, governance services, data services and intelligence functions. |
|-----------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **Scope**             | Covers logical architecture, application structure, data platform, workflow, imports, security, deployment, observability, performance, recovery and future integration readiness.                               |
| **Primary Basis**     | SOE-GAIP concept and module framework developed from the Ministry-focused SOE oversight requirements provided for this project.                                                                                  |
| **Current Exclusion** | External government API integrations are a future phase. The initial platform must be fully operational through internal APIs, manual forms, bulk imports and document uploads.                                  |

# Table of Contents

**1. Architecture Vision**

**2. Architecture Principles**

**3. Logical Architecture**

**4. Portal and Frontend Architecture**

**5. Backend and Domain Architecture**

**6. Data Architecture**

**7. Workflow and Event Architecture**

**8. Analytics and Intelligence Architecture**

**9. Security Architecture**

**10. Deployment Architecture**

**11. Operations and Observability**

**12. Performance and Scalability**

**13. Backup, Recovery and Continuity**

**14. Technology Direction**

**15. Future Integration Readiness**

**16. Architecture Decisions and Constraints**

# 1. Architecture Vision

The recommended architecture is a secure, modular and workflow-driven enterprise platform with a centralized authoritative data model and a separate intelligence layer. It should be simple enough to operate reliably within a government environment, but structured enough to scale into a national SOE intelligence platform.

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th><strong>Recommended Pattern<br />
</strong>Role-aware multi-portal frontend + API-first modular monolith backend + PostgreSQL/PostGIS + object storage + asynchronous job processing + centralized governance services + analytics/intelligence layer.</th>
</tr>
</thead>
<tbody>
</tbody>
</table>

# 2. Architecture Principles

| **Principle**                                | **Architecture Consequence**                                                                                                                |
|----------------------------------------------|---------------------------------------------------------------------------------------------------------------------------------------------|
| Authoritative core                           | Official data lives in one governed transactional platform. Dashboards and AI never become an independent source of truth.                  |
| Modular monolith first                       | Business domains are strongly separated in code, but initially deployed as one backend application to reduce distributed-system complexity. |
| API-first internally                         | All frontend experiences consume documented internal APIs. This supports future mobile, integration and reuse.                              |
| Workflow over free-form status               | Submissions, reviews, approvals and corrections use controlled state transitions.                                                           |
| Evidence by design                           | Documents and evidence are linked to exact records rather than stored as an unrelated file dump.                                            |
| History is immutable                         | Approved snapshots and audit history are retained.                                                                                          |
| Asynchronous heavy work                      | Imports, report generation, document processing and analytics refreshes use background jobs.                                                |
| Configurable policy rules                    | Thresholds and reporting rules are configurable where government policy may change.                                                         |
| Integration-ready, not integration-dependent | External government APIs are excluded from Phase 1 but future adapters can be added without redesigning core domains.                       |
| Security by least privilege                  | Access combines role, organization scope, record scope and field sensitivity.                                                               |

# 3. Logical Architecture

| **Layer**                   | **Primary Responsibilities**                                                                                                                                                    |
|-----------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Experience Layer            | SOE Portal; MoIP Oversight Portal; Executive Intelligence Portal; Administration.                                                                                               |
| Application API Layer       | Authenticated REST APIs, request validation, authorization, orchestration and API versioning.                                                                                   |
| Business Domain Layer       | SOE Registry, Ownership, Assets, HR, Board, Executives, Finance, Loans/Grants, Procurement, Audit, Litigation, Compliance, Privatization, Industrial Performance and Documents. |
| Governance Services         | Reporting cycles, workflow, certification, review, tasks, notifications, escalation, audit trail, versioning and data-quality rules.                                            |
| Data Platform               | PostgreSQL, PostGIS, object storage, cache, staging tables and historical snapshots.                                                                                            |
| Intelligence Layer          | KPI engine, risk engine, scorecards, early warning, GIS analytics, search, reports and executive dashboard read models.                                                         |
| Background Processing       | Queue, worker processes, import validation, report generation, scheduled alerts, analytics refresh and document checks.                                                         |
| Future Integration Boundary | Adapter layer reserved for future external government systems. No dependency in initial release.                                                                                |

## 3.1 Reference Logical Flow

| **USER EXPERIENCES**                                        |
|-------------------------------------------------------------|
| **INTERNAL APPLICATION API**                                |
| **BUSINESS DOMAINS + GOVERNANCE SERVICES**                  |
| **AUTHORITATIVE DATA PLATFORM**                             |
| **BACKGROUND JOBS / QUEUE**                                 |
| **INTELLIGENCE + REPORTING LAYER**                          |
| **FUTURE EXTERNAL INTEGRATION ADAPTERS (POST-DEVELOPMENT)** |

# 4. Portal and Frontend Architecture

The system should use one shared frontend design system and shared application components while exposing different role-specific experiences. This avoids separate codebases that diverge over time.

| **Portal**                    | **Primary UX Focus**                                                                                      |
|-------------------------------|-----------------------------------------------------------------------------------------------------------|
| SOE Portal                    | Data preparation, bulk upload, evidence, completeness, tasks, certification and query response.           |
| MoIP Oversight Portal         | Portfolio queue, review, clarification, comparison, exceptions, approval and escalation.                  |
| Executive Intelligence Portal | Secretary and Minister dashboards, risk, assets, fiscal exposure, strategic opportunities and drill-down. |
| Administration                | Users, roles, organizations, master data, reporting cycles, rules and configuration.                      |

## 4.1 Frontend Design Rules

- Use a shared component library for forms, tables, filters, status badges, charts, maps and workflow controls.

- Route visibility is determined by permission, not by frontend-only hiding.

- Heavy data-entry screens use autosave where safe, clear draft states and loss-of-work protection.

- Executive screens prioritize exceptions and decisions over raw data density.

- Large tables use server-side pagination, filtering and export rather than rendering all rows in the browser.

- All KPI components must show data period and status such as approved, provisional or pending verification where relevant.

# 5. Backend and Domain Architecture

A modular monolith is recommended for initial development. Each domain owns its service layer, data-access rules, validation, permissions and API endpoints, but all modules deploy within one controlled backend runtime.

| **Domain**        | **Owns**                                                                               |
|-------------------|----------------------------------------------------------------------------------------|
| Identity & Access | Authentication integration, roles, scopes and permissions.                             |
| Organization      | SOE master, ownership and corporate hierarchy.                                         |
| Assets            | Land, buildings, machinery, vehicles, equipment and GIS.                               |
| People            | HR, positions, consultants and workforce aggregates.                                   |
| Governance        | Boards, executives, committees, declarations and governance calendar.                  |
| Finance           | Financial periods, metrics, statements, loans, debt, guarantees, grants and subsidies. |
| Accountability    | Procurement, audit paras, litigation and compliance.                                   |
| Transformation    | Privatization milestones and industrial performance.                                   |
| Documents         | File metadata, evidence links, versions and classification.                            |
| Workflow          | Reporting cycles, submissions, certification, review and approval.                     |
| Tasks & Alerts    | Obligations, reminders, escalation and early warning.                                  |
| Intelligence      | KPIs, scores, risk, benchmarks, dashboard read models and reports.                     |
| Administration    | Master data, configurable rules, thresholds and system settings.                       |

## 5.1 Internal API Conventions

- Use versioned endpoints such as /api/v1/organizations, /api/v1/assets and /api/v1/reporting-periods.

- Use consistent pagination, filtering, sorting and error response formats.

- Validate all write requests at API boundary and again at domain service level for business rules.

- Never trust organization identifiers supplied by the browser without authorization checks against the authenticated user scope.

- Use idempotency keys for sensitive repeatable operations such as imports, certification or document upload finalization where appropriate.

- Generate API documentation from the implementation and maintain it as part of the build pipeline.

# 6. Data Architecture

## 6.1 Primary Transaction Database

PostgreSQL is recommended as the authoritative transactional database because the system is strongly relational and requires referential integrity, historical reporting and consistent transactions across related governance records.

| **Core Entity**                              | **Purpose**                                             |
|----------------------------------------------|---------------------------------------------------------|
| Organization                                 | SOE identity and administrative profile                 |
| OrganizationRelationship                     | Holding, subsidiary, associate and JV relationships     |
| ReportingPeriod                              | Monthly, quarterly, annual or special reporting scope   |
| Asset                                        | Common asset identity                                   |
| LandAsset / Building / Machine / Vehicle     | Asset subtype details                                   |
| Employee / Position / Consultant             | Workforce and position records                          |
| Board / BoardMember / Committee              | Governance records                                      |
| FinancialSubmission / FinancialMetric        | Period financial data                                   |
| Loan / Guarantee / Grant                     | Fiscal exposure and support                             |
| ProcurementContract                          | Procurement oversight                                   |
| Audit / AuditPara                            | Audit accountability                                    |
| LitigationCase                               | Legal exposure                                          |
| ComplianceRequirement / ComplianceSubmission | Obligations and evidence                                |
| PrivatizationCase / Milestone                | Transformation pipeline                                 |
| IndustrialPerformance                        | Capacity, output, export, employment, energy and carbon |
| Document / DocumentLink / DocumentVersion    | Evidence and file lineage                               |
| Submission / Certification / Review          | Governed reporting lifecycle                            |
| Task / Alert                                 | Action and early warning                                |
| AuditLog                                     | Immutable material activity history                     |

## 6.2 Geospatial Data

PostGIS should extend PostgreSQL for coordinates, land polygons and spatial queries. GIS is a first-class data capability, not only a visual map component.

- Point geometry for facilities, buildings or equipment locations.

- Polygon geometry for land parcels where boundary data is available.

- Spatial indexing for geographic filtering.

- Location master data for province, district, tehsil and other administrative units.

- Map layers filtered by SOE, asset type, utilization, litigation, encroachment and valuation status.

## 6.3 Document Storage

Document binaries should be stored in S3-compatible object storage or an approved government equivalent. PostgreSQL stores only metadata, classification, version, checksum, access context and relationships to business records.

## 6.4 Cache and Background Queue

- Redis may be used for short-lived cache, session support if required, rate limiting and background job coordination.

- RabbitMQ or a durable Redis-based job queue may be used for imports, scheduled alerts, report generation, document checks and analytics refresh.

- Queue technology should be selected based on hosting support and operational capability rather than preference alone.

## 6.5 Data Import Staging

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th><strong>Mandatory Import Pattern<br />
</strong>Upload file → Parse to staging → Schema validation → Reference validation → Duplicate detection → Business rules → Historical comparison → Exception report → User confirmation → Authoritative records.</th>
</tr>
</thead>
<tbody>
</tbody>
</table>

# 7. Workflow and Event Architecture

## 7.1 Workflow State Model

| **State**               | **Meaning**                                                 |
|-------------------------|-------------------------------------------------------------|
| Draft                   | SOE team prepares data; editable within permission.         |
| Internal Review         | SOE focal person validates internal completeness.           |
| Ready for Certification | Required sections complete and validation blockers cleared. |
| Certified               | Authorized certifier signs required submission content.     |
| Submitted               | Officially transmitted to MoIP workflow.                    |
| Under Review            | Assigned reviewer evaluates content.                        |
| Clarification Requested | Specific issues require SOE response.                       |
| Resubmitted             | Returned records updated and formally resubmitted.          |
| Approved                | Authorized Ministry reviewer approves content.              |
| Locked                  | Historical snapshot preserved; no direct overwrite.         |

## 7.2 Internal Events

| **Event**                   | **Typical Consumers**                                                                      |
|-----------------------------|--------------------------------------------------------------------------------------------|
| FinancialSubmissionApproved | Refresh financial KPIs; recalculate risk; update dashboard read model; append audit event. |
| BoardMemberCreatedOrUpdated | Recalculate expiry schedule and governance alerts.                                         |
| AssetStatusChanged          | Refresh utilization analytics and relevant map layers.                                     |
| AuditParaOverdue            | Create or escalate task and update accountability indicators.                              |
| ReportingPeriodOpened       | Create SOE workspaces and required obligations.                                            |
| SubmissionLocked            | Create immutable snapshot reference and analytics refresh request.                         |

These events may be implemented through an internal event bus within the modular monolith. Distributed event streaming is not required for the initial release.

# 8. Analytics and Intelligence Architecture

Analytics should read from approved data and should not modify authoritative transaction records. For the initial release, a separate data warehouse is optional. Reporting views, materialized views or a dedicated read schema can support dashboards. A warehouse can be introduced later if data volume or analytical complexity warrants it.

| **Capability**        | **Architecture Role**                                                                                      |
|-----------------------|------------------------------------------------------------------------------------------------------------|
| KPI Engine            | Central formulas, source fields, period logic and versioned definitions.                                   |
| Risk Engine           | Rule-based financial, governance, compliance, legal, audit and asset risk dimensions.                      |
| Scorecards            | Cross-SOE performance comparison using approved dimensions and weights.                                    |
| Early Warning         | Rules applied to dates, overdue obligations, financial changes and other conditions.                       |
| GIS Analytics         | Asset location, utilization, legal status, valuation and opportunity filtering.                            |
| Dashboard Read Models | Pre-aggregated queries optimized for executive and oversight screens.                                      |
| Reporting Engine      | Excel/PDF-compatible portfolio, SOE, asset, financial, governance, audit, legal and privatization outputs. |

# 9. Security Architecture

| **Control Area**        | **Required Architecture**                                                                                                          |
|-------------------------|------------------------------------------------------------------------------------------------------------------------------------|
| Authentication          | OIDC/OAuth2-compatible identity provider or approved government identity mechanism; MFA for privileged roles.                      |
| Authorization           | RBAC + organization scope + record context + field sensitivity.                                                                    |
| Data protection         | TLS in transit, encryption at rest, secure secrets management and encrypted backups.                                               |
| Sensitive fields        | Restricted access to CNIC, salary, disciplinary records and other personal data.                                                   |
| Documents               | Private object storage, signed/controlled download access, malware scanning and file validation.                                   |
| Auditability            | Immutable audit records for material writes, workflow actions and administration.                                                  |
| Application security    | Input validation, CSRF protection where applicable, secure headers, dependency scanning, rate limiting and OWASP-aligned controls. |
| Administrative security | No direct production data edits through normal administrator UI. Exceptional corrections must use governed process.                |
| Environment separation  | Distinct development, test/UAT, staging and production environments.                                                               |
| Logging privacy         | Logs must avoid storing passwords, tokens, full CNICs or unnecessary sensitive payloads.                                           |

# 10. Deployment Architecture

Containerized deployment is recommended. The exact hosting environment should be aligned with the Government hosting authority. Kubernetes is not required unless scale, availability or infrastructure standards justify it.

| **Component**                 | **Deployment Role**                                                                                         |
|-------------------------------|-------------------------------------------------------------------------------------------------------------|
| Reverse Proxy / Load Balancer | TLS termination, routing and multiple application instances.                                                |
| Frontend                      | Stateless web deployment or server-side rendered application as selected.                                   |
| Backend                       | Multiple stateless application instances where availability requires.                                       |
| Worker                        | Separate background worker processes for imports, reports, schedules and heavy processing.                  |
| PostgreSQL/PostGIS            | Managed or highly controlled database with replication and point-in-time recovery.                          |
| Object Storage                | Durable, private and backed-up document storage.                                                            |
| Redis / Queue                 | Optional cache and background job infrastructure.                                                           |
| Monitoring                    | Central application logs, infrastructure metrics, database monitoring, queue monitoring and error tracking. |

# 11. Operations and Observability

- Central structured application logging with correlation IDs.

- Separate immutable business audit trail from technical application logs.

- Health checks for web, API, database, queue and object storage dependencies.

- Error tracking with stack trace and release version.

- Background job monitoring including retry count and dead-letter handling.

- Database query performance monitoring and storage growth monitoring.

- Security event monitoring for repeated failed logins, privilege changes and unusual administrative activity.

- Operational runbooks for backup restore, queue failure, storage outage and release rollback.

# 12. Performance and Scalability

| **Area**             | **Approach**                                                                                          |
|----------------------|-------------------------------------------------------------------------------------------------------|
| Interactive requests | Optimize common API responses for sub-second backend processing under agreed load where practical.    |
| Dashboard queries    | Use indexed queries, read models, caching or pre-aggregation for cross-SOE aggregates.                |
| Large tables         | Server-side pagination and filters.                                                                   |
| Bulk imports         | Asynchronous processing with progress, validation report and resumable correction flow.               |
| Exports              | Asynchronous generation for large reports.                                                            |
| Documents            | Direct or controlled object-storage streaming rather than loading full files into application memory. |
| Scale-out            | Application and worker instances should be horizontally scalable because they remain stateless.       |
| Database             | Use indexes, partitioning where justified and archival strategy as historical volume grows.           |

# 13. Backup, Recovery and Continuity

- Automated database backups with point-in-time recovery capability.

- Redundant document storage and tested restore procedures.

- Backup encryption and access logging.

- Regular restore drills in a non-production environment.

- Documented disaster-recovery runbook.

- Final Recovery Point Objective (RPO) and Recovery Time Objective (RTO) to be approved with the hosting authority before production sign-off.

# 14. Technology Direction

| **Layer**        | **Preferred Direction**                                                                                              |
|------------------|----------------------------------------------------------------------------------------------------------------------|
| Frontend         | React / Next.js or equivalent enterprise web framework.                                                              |
| Backend          | NestJS/Node.js or .NET, subject to team capability and Government technology standards.                              |
| Primary Database | PostgreSQL.                                                                                                          |
| GIS              | PostGIS plus MapLibre/Leaflet or approved map provider.                                                              |
| Object Storage   | S3-compatible storage or approved equivalent.                                                                        |
| Cache / Jobs     | Redis and/or RabbitMQ depending on hosting support.                                                                  |
| Search           | PostgreSQL full-text initially; OpenSearch/Elasticsearch only when advanced search volume justifies it.              |
| Containers       | Docker.                                                                                                              |
| CI/CD            | Git-based pipeline with automated tests, dependency/security scanning and controlled promotion between environments. |
| Reporting        | Server-generated Excel and PDF-compatible outputs.                                                                   |
| Identity         | OIDC/OAuth2-compatible provider or approved government SSO mechanism.                                                |

# 15. Future Integration Readiness

Phase 1 must not depend on external government APIs. However, the architecture should deliberately preserve an integration boundary for a later phase.

- Store stable internal IDs plus external-reference fields such as SECP registration number, NTN, PPRA reference or land-record reference where relevant.

- Use internal APIs rather than direct frontend-to-database access.

- Keep external-specific transformation logic outside core business services.

- Plan a future adapter/integration service for authentication, retries, mapping, synchronization status and integration audit history.

- External verification should supplement the authoritative workflow rather than bypass certification and review rules.

# 16. Architecture Decisions and Constraints

| **Decision** | **Choice**                               | **Rationale**                                                                                                        |
|--------------|------------------------------------------|----------------------------------------------------------------------------------------------------------------------|
| ADR-001      | Modular monolith for initial backend     | Reduces operational complexity while preserving clear business boundaries.                                           |
| ADR-002      | PostgreSQL/PostGIS                       | Supports relational governance data and first-class GIS in one mature platform.                                      |
| ADR-003      | Object storage for documents             | Avoids database bloat and supports secure, scalable evidence storage.                                                |
| ADR-004      | Asynchronous background processing       | Protects interactive performance during imports, reports and scheduled jobs.                                         |
| ADR-005      | Approved data feeds intelligence         | Prevents dashboards or AI outputs from becoming an uncontrolled source of truth.                                     |
| ADR-006      | External APIs deferred                   | Initial release remains operational through manual forms, bulk import and evidence upload. Integrations are Phase 2. |
| ADR-007      | Configurable policy thresholds           | Avoids hardcoding values that require Government approval or may change.                                             |
| ADR-008      | Separate audit log from application logs | Ensures business accountability is preserved even if technical logs rotate.                                          |
