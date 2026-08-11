# SOE-GAIP Frontend Development
## Phase 2 Implementation Plan — Design System

**Project:** State-Owned Enterprises Governance, Asset & Performance Intelligence Platform (SOE-GAIP)  
**Development Stage:** Frontend-only stakeholder validation prototype  
**Data Source:** Realistic dummy data through mock services  
**Backend / Database:** Out of scope  
**External Government API Integrations:** Future phase  
**Implementation Principle:** Build the intended production operating model in the frontend without creating backend dependencies.

---

# 1. Phase Objective

Phase 2 establishes the complete visual, interaction and component language that every SOE-GAIP portal and module must use.

The objective is not merely visual consistency. The design system must prevent later modules from becoming a collection of independently styled dashboards, tables and forms. It must provide a controlled UI foundation appropriate for a government governance and intelligence platform while remaining usable for both operational SOE users and senior decision-makers.

The approved FOS Product Design & UI Engineering Standard should remain the governing source for brand and styling. Phase 2 operationalizes it into reusable frontend tokens, components, patterns and usage rules. Developers must not independently invent colors, spacing, card styles, shadows or component behavior.

---

# 2. Preconditions

Phase 2 begins only after Phase 1 has provided:

- stable repository structure
- application shell
- routing
- TypeScript configuration
- mock-service pattern
- role simulator
- state architecture
- representative form/table foundations
- basic responsive behavior

---

# 3. Scope

Implement:

- design tokens
- typography
- spacing
- sizing
- surfaces
- borders
- radii
- shadows
- semantic colors
- layout primitives
- buttons
- inputs
- forms
- tables
- filters
- tabs
- badges
- navigation
- dialogs
- drawers
- tooltips
- alerts
- pagination
- KPI components
- chart containers
- empty/loading/error/validation states
- government-specific status components
- accessibility rules
- responsive rules
- component documentation

Do not build final business screens or final executive dashboards in this phase.

---

# 4. Design Principles

## 4.1 Institutional, Not Decorative

The interface should feel credible, structured, restrained and data-led.

Avoid:

- glassmorphism
- gratuitous gradients
- oversized rounded cards
- excessive shadows
- random accent colors
- generic SaaS dashboard styling
- decorative hero areas inside operational portals

## 4.2 Hierarchy Before Decoration

Use spacing, typography, alignment, section structure and restrained surfaces for hierarchy.

## 4.3 Density by User Type

Operational users require efficient tables/forms. Executive users require stronger hierarchy, concise summaries and exception-first views.

## 4.4 Semantic Status

Status colors must represent controlled meanings only.

---

# 5. Design Token Architecture

Create semantic tokens:

```text
tokens/
├── color
├── typography
├── spacing
├── radius
├── shadow
├── border
├── size
├── motion
└── z-index
```

Example semantic names:

```text
color.surface.base
color.surface.subtle
color.text.primary
color.text.secondary
color.border.default
color.status.success
color.status.warning
color.status.critical
color.status.info
color.action.primary
```

No arbitrary one-off values in business modules unless formally approved.

---

# 6. Typography System

Define styles for:

- application title
- portal title
- page title
- section title
- card title
- body
- secondary text
- labels
- table headers/body
- KPI values
- helper text
- captions

Use a limited number of weights and support tabular numerals for KPI/financial values where possible.

---

# 7. Spacing and Layout

Define:

- page outer padding
- section gaps
- card padding
- form-field spacing
- table density
- sidebar spacing
- toolbar spacing
- modal spacing
- responsive reductions

All spacing should derive from the approved scale.

---

# 8. Surface and Card Hierarchy

Use three main levels:

1. Page Surface
2. Section Surface
3. Elevated/Interactive Surface

Do not put every heading, filter, chart and table into a separate card.

---

# 9. Button System

Variants:

- Primary
- Secondary
- Tertiary/Ghost
- Destructive
- Icon-only

States:

- default
- hover
- focus
- disabled
- loading

Typical use:

- Primary: Submit, Approve, Certify
- Secondary: Save Draft, Add Record
- Destructive: Delete or other genuinely destructive actions
- Ghost: View Details, Cancel

---

# 10. Form System

Standardize:

- text
- numeric
- currency
- percentage
- date
- select
- multi-select
- radio
- checkbox
- textarea
- search-select
- read-only value
- computed value
- mock file control

Every field must support:

- label
- required state
- helper text
- error
- disabled
- read-only
- review mode

---

# 11. Table System

Support:

- sticky header
- sorting
- filtering
- search
- pagination
- row selection
- numeric alignment
- currency/date formatting
- status cells
- row actions
- bulk actions
- expandable rows
- loading/empty states
- horizontal overflow

Provide standard and compact density modes.

---

# 12. Filter System

Reusable filter bar:

- search
- dropdown filters
- date/period
- organization
- status
- advanced filters
- active-filter chips
- clear all

---

# 13. Government-Specific Status Components

Standardize:

## Approval
Draft, Under Review, Returned, Approved, Locked

## Certification
Not Ready, Ready, Certified

## Reporting
Not Started, In Progress, Complete, Submitted, Overdue

## Risk
Low, Moderate, High, Critical

## Compliance
Compliant, Partially Compliant, Non-Compliant, Pending Verification, Not Applicable

## Data Quality
Complete, Incomplete, Validation Issue, Evidence Missing, Verified

## Evidence
Available, Missing, Pending Review

## Deadline
Normal, Due Soon, Overdue

Each status must include text and not rely on color alone.

---

# 14. KPI Components

Create:

- `KpiValue`
- `KpiWithTrend`
- `KpiWithStatus`
- `KpiComparison`
- `KpiProgress`
- `KpiRisk`

Each supports label, value, unit, period, comparison, trend, status, drill-down and optional definition help.

---

# 15. Chart Container System

Provide a wrapper supporting:

- title
- explanatory subtitle
- period
- legend
- filter/action area
- tooltip
- loading/empty state
- accessible text summary

Approved chart types should be limited to meaningful analytical cases.

---

# 16. Navigation and Overlay Components

Standardize:

- sidebar
- tabs
- breadcrumbs
- menus
- modal
- drawer
- tooltip
- confirmation dialog

Governance-significant actions such as Certify, Submit and Approve require explicit confirmation.

---

# 17. Empty, Loading and Error States

Differentiate:

- no records
- no filter results
- no access
- not yet reported
- no issues
- query error
- validation problem
- permission problem

Use skeletons matching the final content layout.

---

# 18. Responsive and Accessibility Requirements

Priority:

1. Desktop
2. Laptop
3. Tablet
4. Mobile summary use

All shared components must support keyboard navigation, visible focus, semantic HTML, accessible labels and non-color status communication.

---

# 19. Component Documentation

For each shared component document:

- purpose
- variants
- props
- correct usage
- prohibited usage
- accessibility notes
- edge cases
- examples

Use Storybook or equivalent if practical.

---

# 20. Workstreams

## A — Foundations
Tokens, typography, spacing, surfaces.

## B — Inputs and Actions
Buttons, forms, selects, validation.

## C — Data Display
Tables, KPIs, status components, chart wrappers.

## D — Navigation and Overlays
Sidebar, tabs, breadcrumbs, dialogs, drawers.

## E — Feedback and States
Alerts, toasts, skeletons, empty/error states.

---

# 21. QA

Test shared components for:

- default rendering
- focus/keyboard behavior
- disabled state
- long labels
- empty values
- errors
- responsive behavior
- contrast

---

# 22. Deliverables

1. semantic token library
2. typography/spacing/layout system
3. button and form systems
4. table/filter system
5. navigation components
6. government status components
7. KPI components
8. chart wrappers
9. modal/drawer/feedback components
10. loading/empty/error states
11. accessibility/responsive rules
12. component documentation

---

# 23. Exit Gate

Phase 2 is complete when:

- tokens are centralized
- shared components use tokens
- common UI no longer requires custom styling
- government statuses are standardized
- representative form/table/dashboard section use only shared components
- responsive behavior is validated
- accessibility basics are validated
- developers have usage documentation

## **SOE-GAIP Design System — Approved for Portal and Module Development**
