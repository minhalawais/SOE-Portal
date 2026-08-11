# SOE-GAIP Frontend Development
## Phase 22 Implementation Plan — Responsive, Accessibility and UX Hardening

**Project:** State-Owned Enterprises Governance, Asset & Performance Intelligence Platform (SOE-GAIP)  
**Development Stage:** Frontend-only stakeholder validation prototype  
**Data Source:** Realistic dummy data through mock services  
**Backend / Database:** Out of scope  
**External Government API Integrations:** Future phase  
**Implementation Principle:** Build the intended production operating model in the frontend without creating backend dependencies.

---

# 1. Phase Objective

Phase 22 hardens the complete frontend for responsive behavior, accessibility and UX consistency.

This phase is not a visual redesign. It validates and fixes how the already-built system behaves across devices, input methods and common accessibility conditions.

---

# 2. Target Device Priorities

## Desktop

Primary operational environment.

Optimize for:

- large tables
- data entry
- review
- multi-panel layouts
- GIS

## Laptop

Primary day-to-day government workstation.

All core operational workflows must work comfortably.

## Tablet

Prioritize:

- executive dashboards
- review
- moderate-detail forms
- GIS summary

## Mobile

Prioritize:

- alerts
- tasks
- overview
- limited review
- executive summary

Do not force complex registries into unusable mobile tables.

---

# 3. Breakpoint Audit

Audit every screen at agreed breakpoints.

Check:

- sidebar behavior
- page padding
- toolbar wrapping
- table overflow
- form columns
- modal width
- chart sizing
- map panels
- KPI wrapping
- filters

---

# 4. Responsive Table Strategy

For operational tables:

- preserve table semantics
- horizontal scroll where appropriate
- sticky key columns where useful
- optional column priority/hiding
- dedicated detail view on narrow screens

Do not convert every table row to cards indiscriminately.

---

# 5. Forms

Responsive behavior:

- multi-column desktop
- reduced columns on tablet
- single-column mobile
- sticky/visible action bar where useful
- no clipped labels/errors

---

# 6. Executive Dashboards

Tablet/mobile:

- preserve information hierarchy
- stack KPI groups
- reduce secondary charts
- allow drill-down
- keep critical alerts visible

---

# 7. GIS

Desktop:
- split map/list

Tablet:
- collapsible list/filter panel

Mobile:
- simplified map/list toggle

Ensure controls remain reachable.

---

# 8. Accessibility Baseline

Validate:

- keyboard navigation
- visible focus
- semantic HTML
- heading hierarchy
- form labels
- required/error associations
- accessible dialog focus
- status text
- contrast
- link purpose
- button labels
- icon-only controls
- chart summaries
- map alternative list

---

# 9. Keyboard Testing

Users should be able to:

- navigate sidebar
- use filters
- move through forms
- operate dialogs
- select tabs
- submit actions
- navigate tables where appropriate
- escape modal/drawer

---

# 10. Focus Management

Ensure:

- modal opens with correct focus
- modal close returns focus
- validation errors can be reached
- route changes focus page heading appropriately where feasible
- drawers manage focus correctly

---

# 11. Forms and Errors

Every invalid input must have:

- visible error text
- programmatic association
- clear corrective guidance

Avoid error communication by color alone.

---

# 12. Status Accessibility

Risk/compliance/approval states must include text.

Example:

Not:

```text
●
```

Use:

```text
Critical
```

with color/icon as secondary reinforcement.

---

# 13. Chart Accessibility

Every important chart should have:

- meaningful title
- accessible summary
- legend
- data table or textual equivalent where practical

Charts should not be the only way to access key information.

---

# 14. Contrast and Color

Audit:

- normal text
- secondary text
- disabled text
- status badges
- focus ring
- charts
- table states
- link colors

Do not change semantic meaning between screens.

---

# 15. Content/UX Consistency

Audit:

- terminology
- action verbs
- status names
- date formats
- currency formats
- empty-state wording
- confirmation language
- breadcrumb structure

Use one standard vocabulary.

---

# 16. Performance UX

Check:

- page load skeletons
- chart rendering
- large tables
- map loading
- role switching
- period switching

Avoid layout shifts where possible.

---

# 17. Accessibility Test Matrix

Create matrix by component/screen:

- keyboard
- focus
- labels
- contrast
- responsive
- zoom
- screen-reader semantics where practical

---

# 18. Browser Coverage

At minimum validate supported modern browsers agreed with stakeholders/IT environment.

Record actual tested versions in QA documentation.

---

# 19. QA Severity

Classify issues:

- Blocker
- Critical
- Major
- Minor

Accessibility barriers to primary workflows should be Critical or Blocker depending on impact.

---

# 20. Stakeholder Validation Questions

- Which devices will officials actually use?
- Is tablet use expected for Minister/Secretary?
- Is mobile operational access required?
- Are there government accessibility standards to formally follow later?
- Which browsers are mandated by MoIP/NITB environment?

---

# 21. Deliverables

1. responsive audit
2. breakpoint fixes
3. table mobile strategy
4. form responsive fixes
5. executive responsive layouts
6. GIS responsive behavior
7. accessibility audit
8. keyboard/focus fixes
9. contrast fixes
10. chart accessibility
11. terminology consistency audit
12. accessibility test matrix
13. browser test record

---

# 22. Exit Gate

Phase 22 is complete when:

- desktop/laptop core workflows are fully usable
- tablet executive views are usable
- mobile summaries are usable
- keyboard access works for primary workflows
- focus and form errors are accessible
- statuses do not rely on color
- critical accessibility/responsive defects are resolved

## **Responsive, Accessibility and UX Hardening — Approved**
