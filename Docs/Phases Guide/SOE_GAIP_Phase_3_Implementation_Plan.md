# SOE-GAIP Frontend Development
## Phase 3 Implementation Plan — Information Architecture, Navigation and Portal Shells

**Project:** State-Owned Enterprises Governance, Asset & Performance Intelligence Platform (SOE-GAIP)  
**Development Stage:** Frontend-only stakeholder validation prototype  
**Data Source:** Realistic dummy data through mock services  
**Backend / Database:** Out of scope  
**External Government API Integrations:** Future phase  
**Implementation Principle:** Build the intended production operating model in the frontend without creating backend dependencies.

---

# 1. Phase Objective

Phase 3 creates the complete application skeleton for all role-specific SOE-GAIP portals before detailed business modules are built.

The platform must support multiple user experiences while remaining one coherent frontend application with shared routing, components, permissions and services.

---

# 2. Portal Architecture

## Portal A — SOE Management & Submission

Users:

- SOE Focal Person
- Finance
- HR
- Asset / Property
- Company Secretary
- Legal
- Procurement
- Internal Audit
- CEO
- CFO

Primary question:

> What do I need to complete, review, certify or submit?

## Portal B — MoIP Oversight & Review

Users:

- MoIP Wing users
- reviewers
- analysts
- Section Officers
- Deputy Secretaries
- Joint Secretaries

Primary question:

> Which SOEs or submissions require review, clarification, approval or intervention?

## Portal C — Secretary Command Centre

Primary question:

> What requires my attention?

## Portal D — Minister Strategic Intelligence

Primary question:

> What matters strategically across the SOE portfolio?

## Portal E — PMO / Strategic Government View

Primary question:

> What is the national-level fiscal, industrial and asset picture?

## Portal F — Authorized Assurance / Institutional View

Keep minimal/feature-flagged until stakeholder access is confirmed.

---

# 3. Route Architecture

Recommended namespaces:

```text
/soe/*
/moip/*
/secretary/*
/minister/*
/pmo/*
/assurance/*
```

Each namespace must define:

- layout
- sidebar/navigation configuration
- default landing page
- allowed roles
- access-denied behavior

Do not duplicate business modules simply because they appear in more than one portal. Render shared domain components in role-specific modes.

---

# 4. Configuration-Driven Navigation

Define portal navigation as data/configuration rather than hardcoded JSX.

Example model:

```ts
interface PortalNavigationItem {
  id: string;
  label: string;
  route: string;
  permission?: string;
  children?: PortalNavigationItem[];
}
```

Configuration should support permissions and feature flags.

---

# 5. SOE Portal Navigation

```text
Dashboard
Reporting Workspace

Enterprise
 ├─ Profile
 ├─ Ownership
 └─ Corporate Structure

Assets & Property
 ├─ Asset Registry
 ├─ Land
 ├─ Buildings
 ├─ Machinery
 └─ Vehicles

People & Governance
 ├─ Workforce
 ├─ Board Governance
 ├─ Executives
 └─ Governance Calendar

Financial & Fiscal

Accountability & Compliance
 ├─ Procurement
 ├─ Audit
 ├─ Litigation
 └─ Compliance

Industrial Performance
Privatization & Transformation
Documents
Tasks & Notifications
```

---

# 6. MoIP Portal Navigation

```text
Oversight Dashboard
SOE Portfolio
Submission Queue
Clarifications
Approvals
Tasks & Escalations

Enterprise Intelligence
Assets & Property
Governance
Financial & Fiscal
Audit & Compliance
Industrial Performance
Privatization
Documents
Reports
```

---

# 7. Secretary, Minister and PMO Navigation

## Secretary

```text
Command Centre
Critical Matters
Pending Decisions
Compliance & Submissions
Financial Concerns
Governance
Audit & Legal
Obligations
Reports
```

## Minister

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

## PMO

```text
National Overview
Government Capital
Fiscal Burden
Asset & Land Bank
Industrial Contribution
Employment & Exports
Privatization Potential
Strategic Indicators
```

Executive portals should not expose operational edit navigation.

---

# 8. Shared Application Shell

All portals use the same structural language:

- sidebar
- top header
- breadcrumb
- page-header region
- content area
- organization context where applicable
- reporting period context
- tasks
- notifications
- demo-role menu

Executive portals may reduce density but should still clearly belong to SOE-GAIP.

---

# 9. Demo Role Simulator

Support at minimum:

- SOE Focal Person
- Finance Officer
- HR Officer
- Asset Officer
- Company Secretary
- CEO
- CFO
- MoIP Reviewer
- MoIP Analyst
- Secretary
- Minister
- PMO

Role change must update:

1. permission context
2. portal
3. navigation
4. organization scope
5. landing page
6. visible actions

Display a clear Demo Mode indicator.

---

# 10. Organization Context

SOE users normally work in one organization. MoIP may switch between SOEs.

Implement:

- current organization selector when allowed
- organization identity in page header
- preserved organization context during navigation
- portfolio context for executive portals

---

# 11. Reporting Period Context

Provide a shared selector such as:

- FY2025
- FY2026
- FY2027
- Q1 FY2027

Rules:

- period-specific screens visibly show the active period
- period changes update applicable data
- master profile data should not look period-specific unless history is intentionally viewed

---

# 12. Portal Landing Shells

Build functional placeholders for later content.

SOE:

- reporting progress
- pending actions
- deadlines

MoIP:

- submission queue
- overdue items
- review workload

Secretary:

- critical matters
- escalations

Minister:

- portfolio health
- fiscal exposure
- asset intelligence

PMO:

- aggregate government exposure
- industrial contribution
- strategic indicators

---

# 13. Breadcrumb and Deep Linking

Example:

```text
SOE Portal
→ Assets & Property
→ Asset Registry
→ AST-000342
```

Every detail view must have stable deep-link behavior.

---

# 14. Permission-Aware Navigation

Examples:

- Finance Officer sees finance edit areas
- Company Secretary sees governance functions
- CEO sees certification
- Minister sees read-only intelligence
- PMO sees no SOE operational edit functions

Direct unauthorized routes show a clear access-denied state.

---

# 15. Context Persistence

Persist during demo sessions:

- current role
- organization
- reporting period
- portal location

Use the Phase 1 persistence adapter.

---

# 16. Navigation UX Rules

- limit top-level categories
- group by business domain
- avoid more than two nested levels where possible
- clearly show selected location
- preserve context on drill-down
- keep operational and executive navigation distinct
- feature-flag unfinished areas

---

# 17. Responsive Rules

Desktop/laptop: full sidebar.  
Tablet: collapsible sidebar.  
Mobile: drawer navigation with simplified executive use.

---

# 18. Required Screens

1. SOE portal shell
2. MoIP portal shell
3. Secretary shell
4. Minister shell
5. PMO shell
6. assurance placeholder/shell
7. demo-role selector
8. organization selector
9. reporting-period selector
10. access-denied page
11. not-found page
12. feature-not-enabled state

---

# 19. QA

Validate:

- each role routes correctly
- navigation changes by role
- organization context works
- period context works
- direct links preserve context
- unauthorized routes are blocked in UI
- executive roles cannot edit
- responsive navigation works
- refresh preserves intended demo state

---

# 20. Deliverables

1. portal route map
2. portal shell components
3. configuration-driven navigation
4. role-to-portal mapping
5. organization context
6. reporting-period context
7. role simulator
8. access-denied handling
9. responsive navigation
10. landing-page shells
11. route/permission documentation

---

# 21. Exit Gate

Phase 3 is complete when:

- every planned portal is navigable
- role switching is reliable
- navigation is role-specific
- organization/period context works
- executive portals expose no edit features
- shared shells use Phase 2 components
- stakeholders understand portal structure without developer explanation

## **Portal Architecture and Navigation — Approved for Data and Workflow Implementation**
