# SOE Governance, Asset & Performance Intelligence Platform (SOE-GAIP)
## Frontend-Only Implementation Roadmap

**Document Type:** Frontend Implementation Plan  
**Project Stage:** Stakeholder Validation Frontend  
**Development Scope:** Complete functional frontend with dummy data only  
**Backend / Database:** Out of scope for this phase  
**External Government API Integrations:** Future phase  

---

## 1. Purpose of This Document

This document defines the complete phase-by-phase implementation roadmap for the frontend-only development of the State-Owned Enterprises Governance, Asset & Performance Intelligence Platform (SOE-GAIP).

The objective of the current development stage is to build a complete, realistic and stakeholder-testable frontend using dummy data before backend, database and external integration development begins.

The frontend should behave like the intended production system from the perspective of users and stakeholders. It should allow stakeholders to validate:

- portal structure
- modules
- navigation
- workflows
- terminology
- data-entry experiences
- approval and certification flows
- dashboards
- GIS experiences
- reports
- roles and permissions
- executive intelligence
- alerts
- risk views
- scorecards
- overall usability

The frontend should therefore function as the **approved functional prototype of the future production system**.

The core implementation principle is:

> **Prototype the final operating model, not merely the final visual design.**

---

# 2. Frontend Development Scope

The frontend phase should include:

- complete responsive application UI
- all proposed user portals
- all agreed business modules
- role-specific navigation
- realistic dummy data
- simulated authentication
- development/demo role switching
- simulated reporting periods
- manual data-entry forms
- simulated Excel/CSV import interfaces
- simulated document upload
- multi-step forms
- data tables
- filters
- advanced search interfaces
- dashboards
- GIS interfaces
- scorecards
- risk indicators
- alerts
- tasks
- notifications
- certification interfaces
- submission workflows
- review workflows
- clarification flows
- approval flows
- version-history screens
- audit-history screens
- reports
- export interfaces
- executive intelligence screens
- empty states
- loading states
- validation states
- error states
- responsive behavior
- accessibility support

The frontend phase should **not** include:

- production database
- production backend APIs
- real user authentication
- real file storage
- real Excel processing
- external government integrations
- real email or SMS services
- production-grade AI services
- permanent audit logs
- server-side workflow execution
- production digital signatures

These capabilities should be simulated in the frontend only where required to demonstrate and validate the intended workflow.

---

# 3. Frontend Implementation Philosophy

The platform should not be developed as a collection of disconnected screens or separate dashboard pages.

The frontend should be organized around three major layers.

## 3.1 Product Foundation

Includes:

- technical frontend architecture
- design system
- navigation
- user roles
- dummy data
- mock service layer
- shared components
- workflow patterns

## 3.2 Operational Platform

Includes:

- SOE data entry
- business modules
- reporting periods
- certification
- Ministry review
- clarification
- approval
- evidence
- tasks
- notifications

## 3.3 Intelligence Platform

Includes:

- dashboards
- GIS
- performance scorecards
- risk indicators
- early warning
- cross-SOE benchmarking
- executive intelligence
- reporting

The platform should progressively move through:

**Data Entry → Governance → Intelligence → Executive Decision**

---

# 4. Phase 0 — Product Scope, Frontend Blueprint and UX Governance

## Objective

Establish the complete frontend product scope before implementation begins.

## Activities

Finalize:

- portal list
- user roles
- module taxonomy
- naming conventions
- terminology
- navigation hierarchy
- reporting-cycle model
- key workflows
- dashboard audiences
- dummy-data assumptions
- frontend-only limitations
- stakeholder evaluation criteria

Create a complete screen inventory.

Recommended hierarchy:

```text
Portal
  → Module
      → Screen
          → Action
              → State
```

## Key Deliverable

**Frontend Product Blueprint**

## Exit Criteria

The team must have an agreed understanding of:

- which portals exist
- which modules belong to each portal
- which users can access which areas
- how users move between modules
- how workflows connect users
- which screens are required for stakeholder validation

---

# 5. Phase 1 — Frontend Technical Foundation

## Objective

Create the frontend engineering foundation before business screens are developed.

## Recommended Project Structure

```text
src/
 ├── app/
 ├── portals/
 ├── modules/
 ├── components/
 ├── design-system/
 ├── mock-data/
 ├── mock-services/
 ├── hooks/
 ├── types/
 ├── permissions/
 ├── workflow/
 ├── state/
 └── utils/
```

## Core Implementation

Establish:

- application routing
- portal routing
- page layouts
- application shell
- frontend state management
- mock service layer
- TypeScript domain models
- reusable table infrastructure
- reusable forms architecture
- chart framework
- map framework
- notification system
- modal and drawer infrastructure
- responsive breakpoints
- error boundaries
- loading patterns

## Architectural Principle

UI components should never directly depend on hardcoded dummy data.

Use:

```text
Page / Component
      ↓
Frontend Service
      ↓
Mock Data
```

Later:

```text
Page / Component
      ↓
Frontend Service
      ↓
Real Backend API
```

## Exit Criteria

- application shell is functional
- routes are established
- shared state is working
- mock service pattern is implemented
- core project structure is stable

---

# 6. Phase 2 — SOE-GAIP Design System

## Objective

Create a consistent visual and interaction language for the complete platform.

## Design System Coverage

Establish:

- typography
- spacing scale
- color tokens
- semantic colors
- status colors
- page widths
- border radius
- shadows
- card hierarchy
- table styling
- form styling
- button hierarchy
- input controls
- tabs
- badges
- breadcrumbs
- navigation
- dialogs
- drawers
- tooltips
- alerts
- pagination
- filters
- KPI components
- chart containers
- empty states
- loading states
- validation states
- error states
- data-quality indicators

## Government-Specific Components

Standardize components for:

- approval status
- certification status
- reporting status
- risk level
- compliance status
- data quality
- evidence availability
- deadline
- escalation
- version
- verification status
- submission status

## Exit Criteria

All future module development must use the shared design system rather than custom styling.

---

# 7. Phase 3 — Information Architecture, Navigation and Portal Shells

## Objective

Create the complete product skeleton before deep module development.

The application should support multiple role-specific portal experiences while using shared frontend infrastructure.

---

## 7.1 Portal A — SOE Management & Submission Portal

Primary users:

- SOE focal person
- Finance team
- HR team
- asset and property team
- Legal team
- Procurement team
- Internal Audit
- Company Secretary
- CEO
- CFO

---

## 7.2 Portal B — MoIP Oversight & Review Portal

Primary users:

- MoIP Wings
- reviewers
- analysts
- Section Officers
- Deputy Secretaries
- Joint Secretaries

---

## 7.3 Portal C — Secretary Command Centre

Focused on:

- operational oversight
- exceptions
- escalations
- governance obligations
- required interventions

---

## 7.4 Portal D — Minister Strategic Intelligence Portal

Focused on:

- portfolio health
- fiscal exposure
- asset intelligence
- governance risks
- strategic issues
- major decisions

---

## 7.5 Portal E — PMO / Strategic Government View

Focused on:

- national strategic indicators
- government capital
- industrial performance
- fiscal burden
- asset potential
- privatization potential

---

## 7.6 Portal F — Authorized Assurance / Institutional View

Prepared for controlled future stakeholder views such as:

- audit institutions
- PAC support
- authorized coordination bodies

This portal can initially remain limited until institutional requirements are finalized.

---

## 7.7 Demo Role Simulator

Since production authentication is not part of this phase, implement a development/demo role selector.

Example:

```text
View As:

SOE Focal Person
SOE Finance Officer
CEO
CFO
MoIP Reviewer
Secretary
Minister
PMO
```

## Exit Criteria

- all portal shells exist
- navigation is role-aware
- demo role switching works
- users only see relevant modules

---

# 8. Phase 4 — Dummy Data Architecture and Mock Service Layer

## Objective

Create realistic, reusable and scenario-based dummy data.

Dummy data should not be random.

It should represent realistic SOE conditions so dashboards and workflows can demonstrate meaningful differences.

## Representative SOE Scenarios

Include examples of:

- financially healthy SOE
- loss-making SOE
- SOE with large land holdings
- SOE with Board vacancies
- SOE under privatization
- SOE with major audit exposure
- SOE with significant litigation
- SOE with underutilized industrial capacity
- SOE with overdue compliance
- SOE with high subsidy dependence

## Major Dummy Data Entities

Create datasets for:

- SOEs
- ownership
- subsidiaries
- associates
- joint ventures
- assets
- land
- buildings
- machinery
- vehicles
- employees
- sanctioned posts
- Board members
- executives
- reporting periods
- financial metrics
- loans
- guarantees
- grants
- procurement
- audits
- audit paras
- litigation
- compliance
- privatization
- industrial performance
- documents
- tasks
- alerts
- submissions
- certifications
- review comments
- timeline events

## Mock Service Examples

```text
getSOEs()
getSOE(id)
getAssets(soeId)
getFinancials(soeId, year)
getBoardMembers(soeId)
submitReportingPeriod()
certifySubmission()
approveSubmission()
returnSubmission()
requestClarification()
```

## Exit Criteria

- all major modules can consume dummy data through mock services
- data relationships are consistent
- different SOE scenarios create different dashboard outcomes

---

# 9. Phase 5 — Golden End-to-End Workflow

## Objective

Build one complete vertical workflow before scaling development across all modules.

## Recommended Pilot Workflow

Use **Financial Reporting** as the first complete workflow.

```text
SOE Finance Officer
        ↓
Enter Financial Data
        ↓
Attach Evidence
        ↓
Validation
        ↓
SOE Focal Review
        ↓
CEO/CFO Certification
        ↓
Submit to MoIP
        ↓
MoIP Review
        ↓
Clarification
        ↓
Resubmission
        ↓
Approval
        ↓
Executive Dashboard Updated
```

## What This Phase Validates

- role behavior
- form architecture
- workflow states
- permissions
- certification UX
- review UX
- evidence handling
- status system
- notifications
- dashboards
- historical state

## Exit Criteria

Stakeholders and product team approve the general workflow model before it is reused across other modules.

---

# 10. Phase 6 — SOE Management & Submission Portal

## Objective

Develop the primary operational portal used by SOEs.

## Home Dashboard Focus

The SOE user should immediately understand:

- active reporting period
- completion percentage
- assigned modules
- missing data
- validation errors
- returned records
- upcoming deadlines
- certification status
- submission status
- pending actions

## Recommended Workspace Pattern

```text
FY2027 Annual Submission

Enterprise Profile       100%
Assets                    82%
HR                        96%
Board                    100%
Financials                91%
Loans                    100%
Procurement               74%
Audit                     88%
Compliance                79%
Industrial Performance    93%
```

## UX Principle

The portal should answer:

> **What do I need to complete?**

rather than presenting users with a large list of unrelated modules.

## Exit Criteria

SOE users can navigate the full reporting workspace and understand submission progress.

---

# 11. Phase 7 — Enterprise and Ownership Modules

## Objective

Build the authoritative enterprise identity and corporate-structure areas.

## Modules

- SOE Master Registry
- Enterprise Profile
- Corporate Structure
- Ownership
- Shareholding
- Subsidiaries
- Associates
- Joint Ventures
- Contact Information
- Locations
- Corporate Hierarchy

## Important Experiences

- enterprise summary
- ownership visualization
- organization hierarchy
- legal status
- entity status
- ownership percentages
- historical changes

## Exit Criteria

A stakeholder can understand the legal, organizational and ownership structure of any SOE.

---

# 12. Phase 8 — Asset and Property Intelligence Modules

## Objective

Build the complete asset-management and asset-intelligence experience.

## Modules

- Asset Registry
- Land
- Buildings
- Machinery
- Vehicles
- Other Equipment
- Asset Documents
- Asset History
- Asset Utilization
- Encroachment
- Litigation Association
- Valuation
- GIS Location

## Recommended Asset Information Architecture

```text
Asset
├── Overview
├── Ownership
├── Valuation
├── Utilization
├── Location
├── Documents
├── Legal Status
└── History
```

## Important UX Principle

Different asset types should share a common asset framework while exposing asset-specific fields.

## Exit Criteria

Stakeholders can inspect, filter, compare and drill into different asset classes.

---

# 13. Phase 9 — People, HR and Governance Modules

## Objective

Build workforce, Board and executive governance experiences.

## Human Resources

Include:

- workforce overview
- sanctioned posts
- filled posts
- vacant posts
- employment categories
- workforce demographics
- consultants
- daily wagers
- postings
- organizational structure

## Board Governance

Include:

- Board composition
- directors
- committee membership
- appointments
- expiry dates
- attendance
- conflict declarations
- remuneration
- vacancies
- Board status

## Executive Management

Include:

- CEO
- MD
- GM
- Directors
- executive remuneration
- perks
- vehicles
- residences
- performance KPIs

## Governance Calendar

Surface:

- Board expiries
- committee requirements
- pending declarations
- vacancies
- pending appointments
- governance deadlines

## Exit Criteria

Stakeholders can understand governance health, workforce structure and executive oversight.

---

# 14. Phase 10 — Financial, Fiscal and Operational Modules

## Objective

Build the financial and industrial performance areas.

## Financial Modules

- Financial Performance
- Annual Budget
- Revenue
- Operating Expenditure
- CAPEX
- Profit / Loss
- Balance Sheet Indicators
- Cash Flow
- Working Capital
- Financial Ratios
- Subsidies
- Government Support

## Fiscal Modules

- Loans
- Debt
- Guarantees
- Grants
- Repayment Schedules
- Government Exposure

## Industrial Performance

- Production
- Installed Capacity
- Actual Production
- Capacity Utilization
- Exports
- Imports
- Domestic Sales
- Employment Contribution
- Energy Consumption
- Carbon Indicators

## Visualization Principle

Every chart should answer a business or governance question.

Example:

**Revenue Trend — Five Years**

rather than:

**Revenue Chart**

## Exit Criteria

Stakeholders can assess financial health and operational performance over time.

---

# 15. Phase 11 — Accountability, Compliance and Transformation Modules

## Objective

Build accountability, legal, compliance and privatization experiences.

## Modules

- Procurement
- Contracts
- Audit
- Audit Paras
- PAC Observations
- Recovery Tracking
- Litigation
- Compliance
- Privatization
- Restructuring
- Transformation

## Privatization Experience

Use a stage-based pipeline.

```text
Identified
   ↓
Approved
   ↓
Financial Advisor
   ↓
Due Diligence
   ↓
Valuation
   ↓
EOI
   ↓
Bidding
   ↓
Transaction
   ↓
Post-Sale
```

## Exit Criteria

Stakeholders can track accountability issues and transformation programs as structured processes.

---

# 16. Phase 12 — Documents, Evidence and Historical Intelligence

## Objective

Make evidence and history first-class elements of the user experience.

## Modules

- Document Repository
- Record-Level Attachments
- Evidence Viewer
- Document Categories
- Version History
- Submission History
- Audit Timeline
- Enterprise Timeline

## Data Lineage Pattern

```text
Dashboard KPI
      ↓
Underlying Record
      ↓
Evidence
      ↓
Submission
      ↓
Certification
      ↓
Review History
```

## Exit Criteria

Stakeholders can trace important information from executive summary back to source record and evidence.

---

# 17. Phase 13 — MoIP Oversight & Review Portal

## Objective

Build the operational review environment for Ministry users.

## Core Purpose

**Review → Compare → Query → Approve → Escalate**

## Main Capabilities

- SOE portfolio
- submission queue
- pending reviews
- overdue submissions
- clarification requests
- validation exceptions
- data-quality warnings
- risk flags
- evidence review
- record comparison
- historical comparison
- approval
- return
- escalation

## Recommended Reviewer Workspace

```text
Pakistan Steel Mills
FY2027

Submission Status: Under Review

Financials          3 Issues
Assets              7 Issues
Board               Approved
Compliance          2 Issues
Industrial Perf.    Approved
```

## Exit Criteria

MoIP reviewers can simulate the full review and approval process.

---

# 18. Phase 14 — Tasks, Notifications and Early Warning UX

## Objective

Demonstrate how the future governance engine will proactively manage obligations.

## Task Centre

Examples:

- review financial submission
- provide clarification
- update Board vacancy
- submit property valuation
- resolve audit para
- complete compliance return

## Alert Levels

Use:

- Information
- Attention
- Critical

## Simulated Rule Examples

```text
Board expiry < 90 days
→ Attention
```

```text
Board expiry < 30 days
→ Critical
```

```text
Loan repayment overdue
→ Critical
```

```text
Financial submission missing
→ Escalation
```

## Exit Criteria

Stakeholders can understand how obligations and risk events will be surfaced.

---

# 19. Phase 15 — Secretary Command Centre

## Objective

Create an action-oriented operational governance dashboard.

## Core Question

> **What requires my attention?**

## Main Areas

- Critical Matters
- Pending Decisions
- Upcoming Obligations
- Delayed Compliance
- Financial Concerns
- Board Governance
- Audit Exposure
- Loan Obligations
- Major Litigation
- Submission Compliance
- Escalations

## UX Principle

The Secretary should not need to navigate deeply through the module hierarchy for routine oversight.

## Exit Criteria

The Secretary-level experience prioritizes intervention and exception management rather than general reporting.

---

# 20. Phase 16 — Minister Strategic Intelligence Portal

## Objective

Create a concise strategic portfolio view.

## Main Areas

- SOE portfolio health
- government investment
- aggregate asset values
- liabilities
- profit and loss
- subsidy exposure
- fiscal risk
- Board governance
- major audit exposure
- major litigation
- privatization
- industrial capacity
- underutilized assets
- strategic opportunities

## Executive Drill-Down Pattern

```text
Portfolio
   ↓
Risk Area
   ↓
SOE
   ↓
Evidence
```

## Exit Criteria

The Minister sees strategic intelligence first and detailed records only when required.

---

# 21. Phase 17 — PMO / Strategic Government View

## Objective

Create a national-level strategic view.

## Focus Areas

- total government capital employed
- market value vs book value
- fiscal burden
- contingent liabilities
- land bank
- employment
- industrial production
- export contribution
- privatization potential
- national strategic indicators

## UX Principle

This portal should avoid operational detail.

## Exit Criteria

The interface communicates the national SOE portfolio at the highest strategic level.

---

# 22. Phase 18 — GIS and National Industrial Asset Map

## Objective

Create one of the flagship stakeholder demonstration features.

## National Map Filters

Include:

- SOE
- asset type
- province
- district
- utilization
- encroachment
- litigation
- ownership
- land size
- valuation

## Example Stakeholder Scenario

> Show vacant industrial land greater than 20 acres with no litigation.

## Asset Map Drill-Down

Show:

- SOE
- asset type
- land area
- current use
- market value
- book value
- ownership
- encroachment status
- litigation status
- documents
- opportunity status

## Exit Criteria

Stakeholders can use GIS to move from geographic overview to asset-level intelligence.

---

# 23. Phase 19 — Intelligence, Risk and Benchmarking

## Objective

Build advanced analytical experiences using approved dummy data.

## SOE Performance Scorecard

Recommended dimensions:

- Financial
- Governance
- Compliance
- Operations
- Asset Efficiency
- Strategic Contribution

## Risk Matrix

Show:

- financial risk
- governance risk
- legal risk
- audit risk
- compliance risk
- asset risk

## Cross-SOE Benchmarking

Allow comparison by:

- sector
- profitability
- subsidy dependence
- ROA
- debt
- capacity utilization
- governance performance
- asset efficiency

## Early Warning

Show emerging trends and deteriorating conditions.

## Exit Criteria

Stakeholders can compare SOEs and identify areas requiring attention.

---

# 24. Phase 20 — Advanced Search and Intelligence Query

## Objective

Allow users to find cross-system information quickly.

## Example Queries

- SOEs with losses for three consecutive years
- encroached land in Punjab
- Board members expiring within 90 days
- audit paras above PKR 100 million
- SOEs with capacity utilization below 40%
- overdue loan repayments
- SOEs with missing annual reports
- land assets under litigation

## Initial Approach

Use a structured filter-driven intelligence interface.

Natural-language AI search should remain a future enhancement.

## Exit Criteria

Users can locate complex subsets of information without manually browsing modules.

---

# 25. Phase 21 — Reports and Executive Briefings

## Objective

Validate the reporting outputs required by stakeholders.

## Report Catalogue

Include:

- SOE Profile Report
- Annual Portfolio Report
- Asset Report
- Fiscal Exposure Report
- Board Governance Report
- Audit Report
- Litigation Report
- Compliance Report
- Privatization Report
- Industrial Performance Report
- Minister Brief
- Cabinet Brief

## Frontend-Only Behavior

PDF and Excel actions may use:

- representative previews
- mock exports
- frontend-generated samples

The goal is to validate:

- report contents
- filters
- structure
- hierarchy
- usefulness

## Exit Criteria

Stakeholders approve report structure and content before backend report generation is developed.

---

# 26. Phase 22 — Responsive, Accessibility and UX Hardening

## Objective

Ensure the complete frontend is usable across appropriate devices and accessibility conditions.

## Target Devices

### Desktop
Primary operational environment.

### Laptop
Likely day-to-day government working environment.

### Tablet
Useful for executive dashboards.

### Mobile
Suitable for:

- alerts
- overview
- limited review
- high-level dashboard access

Complex tables should not simply be compressed into very small mobile layouts.

## Accessibility

Validate:

- keyboard navigation
- visible focus states
- contrast
- semantic hierarchy
- form labels
- validation messages
- error communication
- chart interpretation
- statuses that do not depend only on color

## Exit Criteria

The frontend meets agreed responsive and accessibility standards.

---

# 27. Phase 23 — Frontend Functional QA

## Objective

Test the frontend as if it were production software.

## QA Coverage

### Navigation
Test every route.

### Permissions
Test every role.

### Forms
Test:

- required fields
- validation
- conditional fields
- save states

### Tables
Test:

- filtering
- sorting
- pagination
- empty states

### Workflows
Test every status transition.

### Dashboards
Test drill-down behavior.

### Documents
Test preview and association.

### GIS
Test filters and map interaction.

### Responsive Behavior
Test supported devices.

### Edge Cases

Examples:

- no assets
- thousands of employees
- missing financial period
- Board with no active members
- no litigation
- large number of audit paras
- zero-value financial records
- incomplete evidence

## Exit Criteria

Critical frontend issues are resolved before final stakeholder validation.

---

# 28. Phase 24 — Stakeholder Validation Rounds

## Objective

Validate the frontend iteratively rather than waiting until the entire platform is complete.

## Recommended Validation Rounds

### Validation Round 1
Product shell, portals and navigation.

### Validation Round 2
SOE submission workflow.

### Validation Round 3
Core business modules.

### Validation Round 4
MoIP review workflow.

### Validation Round 5
Secretary and Minister dashboards.

### Validation Round 6
GIS, scorecards, risk and intelligence.

### Validation Round 7
Full-system acceptance.

## Decision Classification

Every stakeholder comment should be recorded as:

- Accepted
- Change Required
- New Requirement
- Out of Scope
- Future Phase

## Product Decision Register

Maintain a formal record of:

- issue
- stakeholder
- decision
- owner
- priority
- status
- final resolution

## Exit Criteria

All material stakeholder feedback is formally resolved or categorized.

---

# 29. Phase 25 — UX and Functional Freeze

## Objective

Finalize the stakeholder-approved frontend before backend development begins.

## Freeze Scope

Finalize:

- navigation
- portals
- modules
- terminology
- screens
- workflows
- forms
- major fields
- dashboard KPIs
- reports
- user roles
- permission model
- status definitions
- validation rules
- data-entry patterns
- review patterns

## Deliverable

**Approved Functional Prototype v1.0**

## Exit Criteria

No major product architecture changes remain unresolved.

---

# 30. Phase 26 — Backend Readiness and Frontend Handover

## Objective

Prepare the approved frontend for backend and database implementation.

## 30.1 Screen-to-API Mapping

Example:

```text
Asset List
GET /assets
```

```text
Create Asset
POST /assets
```

## 30.2 Data Contracts

TypeScript interfaces should become the initial API-contract reference.

Example:

```ts
interface Asset {
  id: string;
  organizationId: string;
  assetType: string;
  bookValue: number;
  marketValue: number;
  utilizationStatus: string;
  litigationStatus: string;
}
```

## 30.3 Workflow Definitions

Document exact:

- states
- transitions
- actors
- approvals
- rejection behavior
- clarification behavior

## 30.4 Permission Matrix

Define:

**Role → Action → Scope**

## 30.5 Validation Matrix

Define:

**Field → Rule → Error Message**

## 30.6 KPI Dictionary

Define:

**Metric → Source → Calculation → Frequency → Owner**

## 30.7 Dummy Data Mapping

Map:

**Dummy Entity → Future Backend Entity**

## Exit Criteria

The frontend can transition from mock services to backend APIs without redesigning the application.

---

# 31. Recommended Development Sequence

| Phase | Focus |
|---|---|
| 0 | Product scope and frontend blueprint |
| 1 | Frontend technical foundation |
| 2 | Design system |
| 3 | Portal shells and navigation |
| 4 | Dummy data and mock service architecture |
| 5 | Golden end-to-end workflow |
| 6 | SOE Submission Portal |
| 7 | Enterprise and ownership |
| 8 | Assets and property |
| 9 | HR and governance |
| 10 | Financial and industrial performance |
| 11 | Accountability, compliance and privatization |
| 12 | Documents, evidence and history |
| 13 | MoIP Oversight Portal |
| 14 | Tasks, notifications and early warning |
| 15 | Secretary Command Centre |
| 16 | Minister Strategic Intelligence Portal |
| 17 | PMO Strategic View |
| 18 | GIS Asset Intelligence |
| 19 | Risk, scorecards and benchmarking |
| 20 | Advanced search |
| 21 | Reports and executive briefings |
| 22 | Responsive and accessibility hardening |
| 23 | Functional QA |
| 24 | Stakeholder validation |
| 25 | Functional freeze |
| 26 | Backend readiness and handover |

---

# 32. Critical Frontend Implementation Principle

The frontend should not behave like disconnected mock screens.

Actions performed in the prototype should create visible simulated consequences elsewhere in the system.

Example:

```text
SOE changes financial data
        ↓
Financial submission changes
        ↓
Risk indicator changes
        ↓
MoIP reviewer sees issue
        ↓
Secretary dashboard changes
        ↓
Minister portfolio indicator changes
```

Even though the underlying data is dummy data, the **relationship between data, governance workflow and intelligence must feel real**.

This is essential for meaningful stakeholder validation.

---

# 33. Stakeholder Questions the Frontend Must Answer

Before backend development begins, stakeholders should be able to answer:

- Are the correct portals defined?
- Are the correct user roles represented?
- Are the modules complete?
- Is the navigation understandable?
- Are data-entry processes practical?
- Is the reporting process realistic?
- Are certification workflows correct?
- Are Ministry review processes correct?
- Are clarification and approval workflows appropriate?
- Do dashboards answer the right questions?
- Are KPIs meaningful?
- Are alerts useful?
- Does GIS support asset-management decisions?
- Are reports sufficient?
- Is historical information understandable?
- Does the system match actual government operating procedures?
- Are role boundaries appropriate?
- Are executive dashboards sufficiently concise?
- Is the system ready to be translated into backend requirements?

---

# 34. Final Frontend Deliverable

The final output of the frontend stage should be:

## **SOE-GAIP Approved Functional Prototype v1.0**

It should represent:

- approved portal architecture
- approved module structure
- approved information architecture
- approved workflows
- approved forms
- approved user roles
- approved dashboards
- approved reports
- approved navigation
- approved status model
- approved validation logic
- approved intelligence views
- approved GIS experience

At that point, the frontend becomes more than a prototype.

It becomes the **stakeholder-approved functional specification expressed as working software**.

The next development stage can then proceed with:

- backend engineering
- database implementation
- authentication
- file storage
- workflow services
- production security
- server-side validation
- reporting services
- deployment architecture
- external integration planning

without reopening the fundamental product design unless formally approved through change control.
