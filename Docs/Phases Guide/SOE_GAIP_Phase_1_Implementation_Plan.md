# SOE-GAIP Frontend Development
## Phase 1 Implementation Plan — Frontend Technical Foundation

**Project:** State-Owned Enterprises Governance, Asset & Performance Intelligence Platform (SOE-GAIP)  
**Development Stage:** Frontend-only functional prototype  
**Data Source:** Realistic dummy data  
**Backend / Database:** Out of scope for this phase  
**External Government APIs:** Future phase  

---

# 1. Purpose of Phase 1

Phase 1 creates the production-grade frontend engineering foundation required to support the complete SOE-GAIP prototype.

The objective is not to build all business modules yet.

The objective is to establish a stable technical platform that supports:

- multiple portals
- role-aware navigation
- realistic dummy data
- mock service abstractions
- forms
- tables
- workflows
- GIS
- dashboards
- permissions
- stakeholder demonstrations
- future backend integration

The phase should produce a running application shell that can support all subsequent development without major architectural rewrites.

---

# 2. Governing Technical Principles

## 2.1 Dummy Data Must Be Isolated from UI Components

Required pattern:

```text
Screen
   ↓
Service / Repository Interface
   ↓
Mock Service
   ↓
Dummy Dataset
```

Future production pattern:

```text
Screen
   ↓
Service / Repository Interface
   ↓
API Service
   ↓
Backend
```

Components should never directly import hardcoded business datasets.

---

## 2.2 Backend-Ready but Backend-Independent

The frontend should be built using patterns compatible with future APIs while operating completely without backend services during the prototype stage.

---

## 2.3 Centralized Domain Rules

Roles, statuses, risk levels, reporting periods and module identifiers should be centralized.

Do not duplicate business constants across screens.

---

## 2.4 Separation of State

Separate:

- domain/query data
- global UI state
- local component state

Avoid one global store containing all data.

---

## 2.5 Role-Aware Architecture

Role permissions should be resolved centrally rather than through scattered conditional statements.

---

# 3. Phase 1.1 — Recommended Technology Stack

For the frontend-only application, the recommended baseline is:

## Core

- React
- TypeScript
- Vite

Vite is suitable because SOE-GAIP is primarily an authenticated enterprise application and SEO/server-side rendering is not a key requirement during the frontend prototype stage.

## Routing

Use one standardized routing solution such as:

- React Router
- TanStack Router

The selected router must support:

- nested routes
- portal layouts
- deep linking
- route metadata
- permission-aware navigation

## Data Fetching / Mock Service Consumption

Use:

- TanStack Query

Even with local mock services, treat domain data as service-provided data.

Benefits:

- loading states
- mutation patterns
- cache behavior
- future API migration
- consistent service architecture

## Local UI State

Use a lightweight state manager such as:

- Zustand

Appropriate for:

- active role
- demo session
- portal context
- organization context
- reporting period
- global filters
- drawers
- temporary workflow simulation

## Forms

Use:

- React Hook Form
- Zod

Benefits:

- schema validation
- reusable validation logic
- TypeScript integration
- future backend compatibility

## Tables

Use an enterprise-capable table abstraction such as:

- TanStack Table

Wrap it in project-specific components.

## Charts

Select one standardized charting library and wrap it in SOE-GAIP chart components.

## Maps

Use one mapping framework such as:

- MapLibre
- Leaflet

Use local dummy geospatial data during frontend development.

---

# 4. Phase 1.2 — Repository Architecture

Recommended project structure:

```text
src/
│
├── app/
│   ├── App.tsx
│   ├── router/
│   ├── providers/
│   └── config/
│
├── portals/
│   ├── soe/
│   ├── moip/
│   ├── secretary/
│   ├── minister/
│   ├── pmo/
│   └── assurance/
│
├── modules/
│   ├── organizations/
│   ├── ownership/
│   ├── assets/
│   ├── workforce/
│   ├── boards/
│   ├── executives/
│   ├── finance/
│   ├── loans/
│   ├── grants/
│   ├── procurement/
│   ├── audits/
│   ├── litigation/
│   ├── compliance/
│   ├── privatization/
│   ├── industrial-performance/
│   ├── documents/
│   ├── submissions/
│   └── intelligence/
│
├── components/
│   ├── layout/
│   ├── forms/
│   ├── tables/
│   ├── feedback/
│   ├── overlays/
│   └── data-display/
│
├── design-system/
│   ├── tokens/
│   ├── components/
│   └── foundations/
│
├── mock-data/
│   ├── organizations/
│   ├── assets/
│   ├── finance/
│   ├── governance/
│   └── scenarios/
│
├── mock-services/
│   ├── organization.service.ts
│   ├── asset.service.ts
│   ├── finance.service.ts
│   └── submission.service.ts
│
├── types/
│
├── schemas/
│
├── permissions/
│
├── workflow/
│
├── hooks/
│
├── state/
│
├── utils/
│
└── constants/
```

---

# 5. Phase 1.3 — Domain Model Foundation

Create TypeScript interfaces before deep module UI implementation.

Examples:

```ts
interface Organization {
  id: string;
  name: string;
  abbreviation: string;
  legalStatus: string;
  sector: string;
  status: string;
}
```

```ts
interface Asset {
  id: string;
  organizationId: string;
  assetType: string;
  name: string;
  bookValue?: number;
  marketValue?: number;
  utilizationStatus?: string;
  litigationStatus?: string;
}
```

```ts
interface ReportingPeriod {
  id: string;
  organizationId: string;
  type: 'annual' | 'quarterly' | 'monthly' | 'event';
  label: string;
  status: string;
}
```

```ts
interface Submission {
  id: string;
  organizationId: string;
  reportingPeriodId: string;
  module: string;
  status: SubmissionStatus;
  completeness: number;
}
```

Create initial models for all major future domains even if their full implementation occurs later.

---

# 6. Phase 1.4 — Central Constants and Enums

Centralize frontend definitions.

Example:

```ts
export const SUBMISSION_STATUS = {
  DRAFT: 'draft',
  IN_PROGRESS: 'in_progress',
  CERTIFIED: 'certified',
  SUBMITTED: 'submitted',
  UNDER_REVIEW: 'under_review',
  CLARIFICATION: 'clarification_requested',
  APPROVED: 'approved',
} as const;
```

Centralize:

- roles
- statuses
- risk levels
- compliance states
- asset types
- portal names
- module names
- reporting period types
- severity levels

No screen should invent independent versions of these values.

---

# 7. Phase 1.5 — Mock Service Architecture

Create service contracts.

Example:

```ts
interface OrganizationService {
  getOrganizations(): Promise<Organization[]>;
  getOrganization(id: string): Promise<Organization>;
}
```

Mock implementation:

```text
OrganizationService
        ↓
MockOrganizationService
        ↓
Dummy Data
```

Future implementation:

```text
OrganizationService
        ↓
ApiOrganizationService
        ↓
Backend API
```

This abstraction must exist before broad module development.

---

# 8. Phase 1.6 — Mock Mutation Behavior

The frontend should simulate changes.

Example:

```text
User updates asset
      ↓
Mock Service validates change
      ↓
Frontend state updates
      ↓
Asset screen refreshes
      ↓
Related KPI may recalculate
```

Prototype persistence may use:

- in-memory state
- browser storage where useful

Do not confuse simulated persistence with production persistence.

---

# 9. Phase 1.7 — Role and Permission Foundation

Create a centralized frontend permission model.

Example permissions:

```text
organization.read
organization.edit

assets.read
assets.create
assets.edit

finance.read
finance.edit

submission.submit
submission.certify
submission.review
submission.approve

executive.dashboard.read
```

Example role mapping:

```text
SOE Finance Officer
 ├─ finance.read
 ├─ finance.edit
 └─ document.upload
```

```text
MoIP Reviewer
 ├─ submission.read
 ├─ submission.review
 ├─ clarification.create
 └─ submission.approve
```

Permissions should be defined centrally.

---

# 10. Phase 1.8 — Development Role Simulator

Implement a development/demo role-switching utility.

Example:

```text
DEMO MODE

Current Role:
MoIP Reviewer

Switch Role:
SOE Focal Person
Finance Officer
CEO
CFO
MoIP Reviewer
Secretary
Minister
PMO
```

When the role changes:

- portal changes
- navigation changes
- permissions change
- dashboard context changes

This feature is critical for stakeholder demonstrations.

It should be disabled or replaced when production authentication is introduced.

---

# 11. Phase 1.9 — Routing Architecture

Define clear route namespaces.

Example:

```text
/soe
/soe/dashboard
/soe/reporting
/soe/assets
/soe/finance

/moip
/moip/dashboard
/moip/submissions
/moip/organizations

/secretary
/secretary/dashboard

/minister
/minister/dashboard

/pmo
/pmo/dashboard
```

Use nested layouts.

Routing should enforce portal context and frontend permissions.

---

# 12. Phase 1.10 — Application Shell

Build the shared application shell.

Include:

- Sidebar
- Top Header
- Breadcrumbs
- Page Header
- Content Area
- Global Search Placeholder
- Notifications Entry
- Task Entry
- User / Demo Role Menu
- Reporting Period Context
- Organization Context

The shell should be responsive from the beginning.

---

# 13. Phase 1.11 — Context Selectors

SOE-GAIP requires two important application contexts.

## Organization Context

Example:

```text
Pakistan Steel Mills
```

## Reporting Period Context

Example:

```text
FY2027
```

These contexts should influence:

- screens
- data
- dashboards
- comparisons
- submissions

Build the context mechanism during Phase 1.

---

# 14. Phase 1.12 — Query and State Architecture

Separate three state categories.

## Service / Domain Data

Examples:

- organizations
- assets
- financial data
- Board members

Handle through query/service architecture.

## Global UI State

Examples:

- current role
- active organization
- reporting period
- sidebar state

## Local Component State

Examples:

- open modal
- selected tab
- temporary filter

Avoid putting all state into one centralized store.

---

# 15. Phase 1.13 — Form Architecture Foundation

Build reusable form infrastructure.

Support:

- text fields
- number fields
- currency fields
- dates
- dropdowns
- multi-select
- radio groups
- checkboxes
- file placeholders
- textarea
- conditional fields
- validation
- sections
- multi-step forms

All forms should support:

```text
Default Value
Dirty State
Validation
Save
Cancel
Error Message
Read-Only Mode
Review Mode
```

---

# 16. Phase 1.14 — Table Architecture Foundation

SOE-GAIP will be table-heavy.

Create reusable table infrastructure supporting:

- columns
- sorting
- filtering
- search
- pagination
- row selection
- status cells
- numeric formatting
- currency formatting
- date formatting
- sticky columns where necessary
- row actions
- bulk actions
- empty state
- loading state

Do not create different table behavior for each module.

---

# 17. Phase 1.15 — Chart and KPI Abstraction

Do not build final dashboards yet.

Create reusable wrappers such as:

```text
KpiCard
TrendMetric
ChartContainer
ComparisonChart
StatusDistribution
```

Every chart wrapper should support:

- title
- subtitle
- date/period context
- empty state
- loading state
- tooltip
- accessible summary
- source/definition placeholder where appropriate

---

# 18. Phase 1.16 — GIS Foundation

Prepare map architecture without building the complete Asset Intelligence experience yet.

Support:

- point geometry
- polygon geometry
- asset markers
- selected feature
- filter state
- map/list synchronization

Use a limited dummy geospatial dataset during Phase 1.

---

# 19. Phase 1.17 — Feedback and Interaction Foundation

Create shared systems for:

- Toasts
- Inline Alerts
- Confirmation Dialogs
- Drawers
- Modals
- Error States
- Loading Skeletons
- Empty States
- Unsaved Changes Warning

These interaction patterns should be standardized.

---

# 20. Phase 1.18 — Error Handling Architecture

Even mock services should support realistic failure states.

Service calls should support:

```text
Success
Loading
Empty
Error
Validation Error
Permission Error
```

Create an application-level error boundary.

The frontend should be able to demonstrate realistic failure states during stakeholder testing.

---

# 21. Phase 1.19 — Prototype Persistence

Where useful, use browser storage to preserve:

- selected role
- selected SOE
- reporting period
- simple mock mutations
- prototype settings

Do not make business logic depend directly on browser storage.

Wrap persistence in a dedicated adapter.

---

# 22. Phase 1.20 — Engineering Quality Standards

Configure:

- ESLint
- formatting
- strict TypeScript
- import aliases
- naming standards
- reusable component standards
- accessibility linting where practical
- no unused code
- no implicit `any`
- no duplicated business constants

Recommended naming:

```text
PascalCase
→ Components

camelCase
→ Variables / Functions

SCREAMING_SNAKE_CASE
→ Constants where appropriate
```

---

# 23. Phase 1.21 — Testing Foundation

Set up tests before business complexity grows.

## Unit Tests

For:

- formatters
- permission functions
- schemas
- workflow helpers

## Component Tests

For:

- forms
- tables
- navigation
- permission rendering

## End-to-End Foundation

Prepare scenarios such as:

```text
Switch to Finance Officer
→ Open financial module
→ Edit record
→ Save
```

Full end-to-end coverage can expand in later phases.

---

# 24. Phase 1.22 — Accessibility Foundation

From the beginning ensure:

- semantic HTML
- keyboard navigation
- focus indicators
- form labels
- accessible buttons
- screen-reader labels
- proper heading hierarchy

Do not postpone fundamental accessibility until the end.

---

# 25. Phase 1.23 — Responsive Foundation

Define supported breakpoints.

Priority:

1. Desktop
2. Laptop
3. Tablet
4. Mobile executive overview

Complex operational modules should prioritize desktop and laptop usability.

---

# 26. Phase 1.24 — Configuration Architecture

Centralize application configuration.

Example:

```text
APP_NAME
DEMO_MODE
DEFAULT_ROLE
DEFAULT_ORGANIZATION
DEFAULT_REPORTING_PERIOD
ENABLE_PMO_PORTAL
ENABLE_ASSURANCE_PORTAL
```

Use feature flags for modules not yet ready for stakeholder review.

---

# 27. Phase 1.25 — Documentation

Create:

## README

Include:

- setup
- run instructions
- project structure
- architecture
- conventions

## Architecture Notes

Document:

- mock services
- state management
- permissions
- routing
- domain types

## Contribution Guide

Define how developers add:

- modules
- routes
- services
- types
- mock datasets

---

# 28. Phase 1 Deliverables

Phase 1 should produce:

1. Running frontend application
2. Final project structure
3. Portal route architecture
4. Application shell
5. Demo Role Simulator
6. Permission foundation
7. Domain TypeScript models
8. Central constants and enums
9. Mock service layer
10. Query architecture
11. UI state architecture
12. Organization context
13. Reporting-period context
14. Form infrastructure
15. Table infrastructure
16. Chart wrappers
17. GIS foundation
18. Error handling
19. Loading and empty-state system
20. Test infrastructure
21. Code-quality configuration
22. Responsive foundation
23. Accessibility foundation
24. Developer documentation

---

# 29. Phase 1 Exit Gate

Phase 1 should not be considered complete merely because the application launches.

The following must work.

## Portal Switching

SOE → MoIP → Secretary → Minister → PMO

## Role Switching

Navigation and permissions should visibly change.

## Context Switching

Organization and reporting period should update application context.

## Mock Query

At least one screen should read data through the service layer.

## Mock Mutation

At least one dummy record should update through the service layer.

## Routing

Nested portal routes should work.

## Form

A representative validated form should function.

## Table

A representative filterable table should function.

## Error Handling

Loading, empty and error states should be demonstrable.

## Responsive Shell

Core layout should work on supported screen sizes.

Phase 1 completion should be formally marked as:

## **Frontend Technical Foundation — Approved for Design System and Business Module Development**

---

# 30. Recommended Build Order

Practical implementation sequence:

```text
1. Initialize repository
2. Configure TypeScript and code quality
3. Establish application structure
4. Build domain types
5. Create centralized constants
6. Create mock service interfaces
7. Establish mock datasets
8. Configure query layer
9. Configure UI state
10. Build permission system
11. Build role simulator
12. Configure routing
13. Build application shell
14. Build organization selector
15. Build reporting-period selector
16. Build representative form
17. Build representative table
18. Build loading/error/empty states
19. Prepare chart abstraction
20. Prepare map abstraction
21. Configure tests
22. Document architecture
23. Validate technical foundation
```

---

# 31. What Must Not Happen During Phase 1

Avoid the following:

## Do Not Build Final Dashboards Yet

Dashboard requirements depend on underlying modules and workflows.

## Do Not Hardcode Role Logic Inside Individual Components

Permissions must be centralized.

## Do Not Hardcode Dummy Data Inside Pages

Use mock services.

## Do Not Duplicate Status Values

Use centralized constants and enums.

## Do Not Build Different Navigation Systems Independently

Navigation must be configuration-driven and permission-aware.

## Do Not Build a Real Backend

The current objective is frontend validation.

## Do Not Build Government Integrations

They are a future phase.

## Do Not Over-Engineer Infrastructure

The architecture should be production-ready in structure without introducing unnecessary complexity into a frontend-only prototype.

---

# 32. Definition of Success

At the end of Phase 1, the development team should be able to demonstrate:

```text
Launch Application
      ↓
Select Demo Role
      ↓
Portal Changes
      ↓
Navigation Changes
      ↓
Select SOE
      ↓
Select Reporting Period
      ↓
Open Prototype Module
      ↓
Load Dummy Data Through Mock Service
      ↓
Edit Dummy Record
      ↓
Validation Works
      ↓
Mock Save Works
```

The technical foundation should now be capable of supporting:

- all SOE modules
- all MoIP workflows
- Secretary Command Centre
- Minister intelligence
- PMO view
- GIS
- reports
- risk
- benchmarking
- stakeholder validation
- future backend integration

without fundamentally changing the frontend architecture.
