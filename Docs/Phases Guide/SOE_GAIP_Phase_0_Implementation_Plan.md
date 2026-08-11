# SOE-GAIP Frontend Development
## Phase 0 Implementation Plan — Product Scope, Frontend Blueprint and UX Governance

**Project:** State-Owned Enterprises Governance, Asset & Performance Intelligence Platform (SOE-GAIP)  
**Development Stage:** Frontend-only functional prototype  
**Data Source:** Realistic dummy data  
**Backend / Database:** Out of scope for this phase  
**External Government APIs:** Future phase  

---

# 1. Purpose of Phase 0

Phase 0 establishes the authoritative functional blueprint for the frontend before detailed implementation begins.

No business module should be developed in depth until this phase has been completed properly.

The purpose is to ensure that:

- the complete frontend product scope is understood
- all portals and users are defined
- modules are organized correctly
- workflows are agreed
- terminology is standardized
- screen requirements are documented
- dummy-data requirements are planned
- stakeholder expectations are aligned
- frontend-only limitations are explicit

The primary output is:

## **SOE-GAIP Frontend Product Blueprint**

---

# 2. Governing Principles

## 2.1 Frontend Must Represent the Future Production System

The current system is not intended to be a collection of visual mockups.

It must behave like the proposed production platform from the user's perspective.

Example:

```text
SOE User
   ↓
Completes Financial Submission
   ↓
Submission Status Changes
   ↓
MoIP Reviewer Receives Submission
   ↓
Reviewer Requests Clarification
   ↓
SOE Responds
   ↓
Submission Approved
   ↓
Executive Dashboard Reflects Approved Information
```

All of this may use dummy data, but the operating logic must feel realistic.

## 2.2 Role-Specific Experience

Different users have different responsibilities and psychological needs.

The product must explicitly support separate experiences for:

- SOE operational users
- SOE certifying authorities
- Ministry reviewers
- Ministry leadership
- Secretary
- Minister
- PMO
- authorized assurance users

## 2.3 Governance Before Intelligence

The product model should preserve the sequence:

```text
Data
 ↓
Validation
 ↓
Evidence
 ↓
Certification
 ↓
Review
 ↓
Approval
 ↓
Intelligence
```

## 2.4 No Backend Dependency

The frontend prototype must operate independently from:

- backend APIs
- production database
- real authentication
- production file storage
- external government APIs
- real email/SMS
- production AI
- production digital signatures

---

# 3. Phase 0.1 — Confirm Product Boundary

The team must first document the exact frontend scope.

## In Scope

The prototype should demonstrate:

- complete portal navigation
- complete module architecture
- representative forms
- data tables
- record details
- dashboards
- reports
- documents
- GIS
- submission workflows
- certification
- review
- clarification
- approval
- tasks
- notifications
- alerts
- risk indicators
- scorecards
- benchmarking
- historical views
- permissions
- stakeholder-specific dashboards

## Out of Scope

Explicitly record:

- database
- backend services
- production authentication
- real digital signatures
- permanent data storage
- real document storage
- actual Excel ingestion
- real email/SMS
- real government API integrations
- production AI
- server-side analytics

These capabilities may be represented in the UI, but must be identified as simulated.

---

# 4. Phase 0.2 — Finalize Portal Architecture

The following portal structure should be treated as the working baseline.

## Portal A — SOE Management & Submission Portal

### Users

- SOE Focal Person
- Finance Officer
- HR Officer
- Asset / Property Officer
- Company Secretary
- Legal Officer
- Procurement Officer
- Internal Audit
- CEO
- CFO

### Primary User Question

> What information do I need to complete, certify or submit?

---

## Portal B — MoIP Oversight & Review Portal

### Users

- MoIP Wing Users
- Reviewers
- Analysts
- Section Officers
- Deputy Secretaries
- Joint Secretaries

### Primary User Question

> Which SOEs or submissions require review, clarification or intervention?

---

## Portal C — Secretary Command Centre

### Primary User Question

> What requires my attention or administrative intervention?

---

## Portal D — Minister Strategic Intelligence Portal

### Primary User Question

> What are the major performance issues, risks and strategic opportunities across the SOE portfolio?

---

## Portal E — PMO / Strategic Government View

### Primary User Question

> What is the national-level fiscal, industrial and strategic picture?

---

## Portal F — Authorized Assurance / Institutional View

Potential future users:

- audit institutions
- PAC-related users
- other authorized oversight institutions

During frontend development, this portal can remain limited until formal access requirements are confirmed.

---

# 5. Phase 0.3 — Establish Functional Domain Architecture

The frontend should not expose dozens of unrelated modules in one navigation structure.

Modules should be grouped into clear functional domains.

## Domain 1 — Enterprise & Ownership

- SOE Master Registry
- Enterprise Profile
- Corporate Structure
- Ownership
- Subsidiaries
- Associates
- Joint Ventures

## Domain 2 — Assets & Property

- Asset Registry
- Land
- Buildings
- Machinery
- Vehicles
- Other Equipment
- GIS
- Asset Utilization
- Valuation
- Encroachment

## Domain 3 — People & Governance

- Human Resources
- Workforce
- Board Governance
- Board Committees
- Executive Management
- Governance Calendar

## Domain 4 — Financial & Fiscal

- Financial Performance
- Budget
- Loans
- Debt
- Guarantees
- Grants
- Subsidies
- Government Support

## Domain 5 — Accountability & Compliance

- Procurement
- Audit
- Audit Paras
- PAC Observations
- Litigation
- Compliance

## Domain 6 — Industrial & Strategic Performance

- Production
- Capacity
- Capacity Utilization
- Exports
- Imports
- Domestic Sales
- Employment Contribution
- Energy
- Carbon Indicators

## Domain 7 — Privatization & Transformation

- Privatization Pipeline
- Due Diligence
- Valuation
- EOI
- Bidding
- Transaction
- Post-Sale Monitoring
- Restructuring

## Domain 8 — Evidence & Documents

- Document Repository
- Evidence
- Record Attachments
- Version History
- Enterprise Timeline

## Domain 9 — Reporting & Governance Workflow

- Reporting Periods
- Submission Management
- Certification
- Review
- Clarifications
- Approvals
- Tasks
- Notifications
- Escalations

## Domain 10 — Intelligence & Decision Support

- Executive Dashboards
- KPI Monitoring
- Performance Scorecards
- Risk Intelligence
- Early Warning
- Cross-SOE Benchmarking
- Advanced Search
- Reports
- GIS Intelligence
- Decision Support

---

# 6. Phase 0.4 — Create the User and Permission Matrix

A baseline role matrix should be finalized before implementation.

| Role | Primary Scope | Typical Capability |
|---|---|---|
| SOE Focal Person | Own SOE | Coordinate complete submission |
| Finance Officer | Own SOE | Edit financial data |
| HR Officer | Own SOE | Edit workforce data |
| Asset Officer | Own SOE | Edit asset records |
| Company Secretary | Own SOE | Board and governance data |
| Legal Officer | Own SOE | Litigation records |
| Procurement Officer | Own SOE | Procurement records |
| CEO | Own SOE | Review and certify |
| CFO | Own SOE | Review and certify financial information |
| MoIP Reviewer | Assigned SOEs | Review and return submissions |
| MoIP Analyst | Assigned / portfolio | Analyze approved data |
| Secretary | Ministry portfolio | Executive operational oversight |
| Minister | Ministry portfolio | Strategic intelligence |
| PMO | Authorized portfolio | National strategic intelligence |
| Assurance User | Authorized scope | Read and review approved information |

Phase 0 does not need every field-level permission finalized, but the access model must be defined.

---

# 7. Phase 0.5 — Define Role Psychology

The frontend should be designed around actual user behavior.

## SOE Operational User

Psychology:

> I need to complete my assigned information correctly and quickly.

Frontend should prioritize:

- assigned tasks
- progress
- incomplete records
- validation errors
- deadlines

## CEO / CFO

Psychology:

> I need to understand exactly what I am certifying.

Frontend should prioritize:

- certification summary
- unresolved issues
- material changes
- completeness
- certification action

## MoIP Reviewer

Psychology:

> I need to know whether this submission is trustworthy.

Frontend should prioritize:

- comparison
- anomalies
- evidence
- previous periods
- clarification
- approval

## Secretary

Psychology:

> Show me what requires action.

Frontend should prioritize:

- exceptions
- overdue matters
- critical risk
- escalations
- pending decisions

## Minister

Psychology:

> Show me what matters and why.

Frontend should prioritize:

- portfolio health
- strategic risk
- fiscal exposure
- important opportunities
- drill-down when required

## PMO

Psychology:

> Show me the national strategic impact.

Frontend should prioritize:

- aggregated indicators
- government capital
- fiscal burden
- industrial contribution
- strategic asset potential

---

# 8. Phase 0.6 — Define Navigation Architecture

A navigation map must be created for each portal.

Example SOE Portal:

```text
Dashboard

Reporting Workspace

Enterprise
 ├─ Profile
 └─ Ownership

Assets
 ├─ Asset Registry
 ├─ Land
 ├─ Buildings
 ├─ Machinery
 └─ Vehicles

People & Governance
 ├─ Workforce
 ├─ Board
 └─ Executives

Financial & Fiscal

Accountability
 ├─ Procurement
 ├─ Audit
 ├─ Litigation
 └─ Compliance

Industrial Performance

Privatization

Documents

Tasks & Notifications
```

Example Minister Portal:

```text
Executive Overview

Portfolio Performance

Fiscal Exposure

Asset Intelligence

Governance Risk

Audit & Legal Risk

Industrial Performance

Privatization

Strategic Opportunities

Executive Reports
```

---

# 9. Phase 0.7 — Define Core Workflow Catalogue

Each major workflow must be documented before detailed UI development.

## Reporting Submission

```text
Draft
 ↓
In Progress
 ↓
Ready for Internal Review
 ↓
Ready for Certification
 ↓
Certified
 ↓
Submitted
 ↓
Under MoIP Review
 ↓
Approved
```

## Clarification Workflow

```text
Under Review
 ↓
Clarification Requested
 ↓
SOE Response
 ↓
Resubmitted
 ↓
Under Review
```

## Record Return Workflow

```text
Submitted
 ↓
Returned
 ↓
Correction
 ↓
Resubmission
```

## Certification Workflow

```text
Department Complete
 ↓
Focal Person Review
 ↓
CEO/CFO Review
 ↓
Certification
```

## Governance Alert Workflow

```text
Upcoming Obligation
 ↓
Attention
 ↓
Critical
 ↓
Escalated
 ↓
Resolved
```

---

# 10. Phase 0.8 — Define Status Vocabulary

Developers must not invent statuses independently.

## Submission Status

- Draft
- In Progress
- Ready for Review
- Ready for Certification
- Certified
- Submitted
- Under Review
- Clarification Requested
- Returned
- Resubmitted
- Approved
- Locked

## Risk Status

- Low
- Moderate
- High
- Critical

## Attention Status

- Information
- Attention
- Critical

## Compliance Status

- Compliant
- Partially Compliant
- Non-Compliant
- Not Applicable
- Pending Verification

## Data Quality Status

- Complete
- Incomplete
- Validation Issue
- Evidence Missing
- Verified

These values should later be centralized in frontend constants.

---

# 11. Phase 0.9 — Create Complete Screen Inventory

Create a formal screen registry.

Recommended structure:

| Portal | Domain | Module | Screen | Screen Type | Role | Key Action |
|---|---|---|---|---|---|---|

Example:

| SOE | Financial | Financial Reporting | Financial Overview | Dashboard | Finance | Review |
| SOE | Financial | Financial Reporting | Add Annual Data | Form | Finance | Edit |
| MoIP | Review | Submissions | Review Financials | Review | Reviewer | Approve |
| Minister | Intelligence | Portfolio | Portfolio Overview | Dashboard | Minister | Drill-down |

Every future screen should originate from this registry.

---

# 12. Phase 0.10 — Define Screen Archetypes

Avoid building every screen independently.

Core screen archetypes should include:

- Dashboard
- List / Registry
- Record Detail
- Create / Edit Form
- Multi-Step Submission
- Review Screen
- Certification Screen
- Comparison Screen
- Evidence Viewer
- Timeline
- Map
- Executive Intelligence Screen
- Report Preview
- Task Centre
- Alert Centre

These archetypes will guide both design-system and engineering implementation.

---

# 13. Phase 0.11 — Define Dummy Data Scenarios

Dummy data must represent realistic SOE narratives.

## Scenario A — Healthy SOE

- profitable
- Board complete
- compliant
- good capacity utilization
- limited audit exposure

## Scenario B — Financially Distressed SOE

- consecutive losses
- rising debt
- subsidy dependence
- declining capacity utilization

## Scenario C — Asset-Rich SOE

- extensive land
- high market value
- significant underutilization

## Scenario D — Governance-Risk SOE

- Board vacancies
- directors near expiry
- missing compliance items

## Scenario E — Audit / Legal Risk SOE

- major audit paras
- litigation exposure
- unresolved recoveries

## Scenario F — SOE Under Privatization

- active privatization milestones
- due diligence
- valuation
- pending transaction stage

These scenarios are required so executive dashboards produce meaningful differences.

---

# 14. Phase 0.12 — Define Data Relationships

Define major relationships at conceptual level.

```text
SOE
 ├─ Subsidiaries
 ├─ Assets
 ├─ Employees
 ├─ Board Members
 ├─ Executives
 ├─ Financial Periods
 ├─ Loans
 ├─ Grants
 ├─ Procurements
 ├─ Audits
 ├─ Litigation
 ├─ Compliance Records
 ├─ Privatization Records
 ├─ Documents
 └─ Submissions
```

These relationships should directly inform the TypeScript models created during Phase 1.

---

# 15. Phase 0.13 — Define Reporting Period Model

The prototype should support reporting-period concepts from the beginning.

Example:

```text
FY2025
FY2026
FY2027
```

Potential reporting-period types:

- Annual
- Quarterly
- Monthly
- Event-Based

Each dummy record should be classified as:

- master information
- period-specific information
- event-driven information

---

# 16. Phase 0.14 — Define Stakeholder Validation Method

Formal stakeholder validation should begin during Phase 0.

Validate:

- portal structure
- user roles
- terminology
- modules
- navigation
- workflows

Feedback categories:

- Accepted
- Change Required
- New Requirement
- Future Phase
- Out of Scope

Maintain a Product Decision Register.

Suggested fields:

```text
Decision ID
Date
Topic
Stakeholder
Comment
Decision
Impact
Owner
Status
```

---

# 17. Phase 0 Deliverables

Phase 0 should produce:

1. Frontend Product Blueprint
2. Portal Architecture
3. Module and Domain Map
4. Role Matrix
5. Permission Baseline
6. User Psychology Matrix
7. Navigation Map
8. Workflow Catalogue
9. Status Dictionary
10. Screen Inventory
11. Screen Archetype Catalogue
12. Dummy Data Scenario Catalogue
13. Conceptual Entity Relationship Map
14. Reporting Period Model
15. Scope / Out-of-Scope Register
16. Product Decision Register
17. Stakeholder Validation Record

---

# 18. Phase 0 Exit Gate

Do not proceed to detailed module development until:

- portals are accepted
- roles are defined
- module hierarchy is accepted
- navigation is accepted
- core workflows are defined
- screen inventory exists
- dummy data scenarios are defined
- terminology is standardized
- frontend-only boundaries are understood

Phase 0 completion should be formally marked as:

## **Frontend Product Blueprint — Approved for Technical Foundation**
