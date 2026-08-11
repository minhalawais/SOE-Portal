# SOE-GAIP Frontend Development
## Phase 23 Implementation Plan — Frontend Functional QA

**Project:** State-Owned Enterprises Governance, Asset & Performance Intelligence Platform (SOE-GAIP)  
**Development Stage:** Frontend-only stakeholder validation prototype  
**Data Source:** Realistic dummy data through mock services  
**Backend / Database:** Out of scope  
**External Government API Integrations:** Future phase  
**Implementation Principle:** Build the intended production operating model in the frontend without creating backend dependencies.

---

# 1. Phase Objective

Phase 23 performs full frontend functional QA across the complete SOE-GAIP prototype.

The frontend should now be tested as if it were production software even though it uses dummy data and mock services.

The objective is to verify:

- navigation
- permissions
- forms
- tables
- workflows
- dashboards
- documents
- GIS
- reports
- responsive behavior
- accessibility
- cross-portal consequences
- edge cases
- prototype stability

---

# 2. QA Governance

Create a formal QA process with:

- test plan
- test cases
- test execution record
- defect register
- severity
- owner
- retest status
- regression status
- release candidate identifier

Do not manage QA only through informal messages.

---

# 3. Test Environments

At minimum define:

- local development
- shared QA/demo build
- stakeholder/UAT build

All stakeholder validation should use a stable versioned build.

---

# 4. Test Data Baseline

Before each QA cycle:

- reset demo data
- select known scenario pack
- record fixture version
- record reporting period
- record test role

This ensures reproducibility.

---

# 5. Navigation Testing

Test every route for:

- correct page
- role access
- breadcrumb
- deep link
- back navigation
- not-found behavior
- feature flag behavior
- context preservation

---

# 6. Permission Testing

Test every role against:

- visible navigation
- view actions
- edit actions
- certification
- submission
- review
- approval
- executive read-only behavior
- sensitive data visibility

Use a formal Role × Permission test matrix.

---

# 7. Form Testing

Test:

- required fields
- valid input
- invalid input
- conditional fields
- computed fields
- save draft
- cancel
- dirty-state warning
- read-only mode
- review mode
- validation summary
- long text
- zero values
- large values
- date boundaries

---

# 8. Table Testing

Test:

- sorting
- filtering
- search
- pagination
- column formatting
- empty state
- loading state
- large dataset
- row actions
- bulk actions where implemented
- sticky headers/columns
- horizontal overflow

---

# 9. Workflow Testing

Test every valid transition.

Examples:

```text
Draft → In Progress
Ready → Certified
Certified → Submitted
Submitted → Under Review
Under Review → Clarification
Clarification → Resubmitted
Resubmitted → Approved
Approved → Locked
```

Test invalid transitions are blocked.

---

# 10. Cross-Portal Testing

Verify simulated consequences.

Example:

```text
SOE updates financial draft
→ CFO sees updated certification summary
→ MoIP sees after submission
→ Minister sees only after approval
```

This is a critical product-level test.

---

# 11. Dashboard Testing

Validate:

- KPI calculations
- chart source data
- period switching
- filters
- drill-down
- empty state
- source lineage
- aggregate reconciliation

---

# 12. Document Testing

Test:

- mock upload
- linked record
- version
- replacement
- preview
- missing evidence
- restricted evidence
- document filters
- lineage

---

# 13. GIS Testing

Test:

- map load
- marker/polygon rendering
- filters
- combined filters
- map/list sync
- province/district scope
- zero results
- missing geometry
- asset detail drill-down
- responsive behavior
- accessible list alternative

---

# 14. Search Testing

Test:

- global search
- structured query
- operators
- AND/OR behavior
- role scope
- saved queries
- zero results
- large result set
- sensitive-field restrictions

---

# 15. Reports Testing

Test:

- parameters
- preview
- period labels
- report data reconciliation
- empty sections
- long tables
- mock export
- role access
- print layout

---

# 16. Responsive Testing

Test all major flows at:

- desktop
- laptop
- tablet
- mobile summary

Use real browser viewport sizes agreed by team.

---

# 17. Accessibility Regression

Verify:

- keyboard
- focus
- labels
- error association
- dialog focus
- status text
- chart summaries
- contrast
- accessible map/list alternative

---

# 18. Edge Cases

Explicitly test roadmap examples:

- no assets
- thousands of employees
- missing financial period
- Board with no active members
- no litigation
- large number of audit paras
- zero-value financial records
- incomplete evidence

Add:

- no submissions
- all modules complete
- many overdue alerts
- no critical alerts
- missing GIS geometry
- SOE with no subsidiaries
- closed/dormant SOE

---

# 19. Performance Testing

Frontend-only performance checks:

- initial load
- route change
- role switch
- large table interaction
- map interaction
- query builder
- chart rendering

Record unacceptable lag and optimize obvious hotspots.

No backend load testing is part of this phase.

---

# 20. Defect Severity

Use:

## Blocker
Prevents core workflow/demo.

## Critical
Major workflow, permission, data-integrity or accessibility failure.

## Major
Important functionality impaired.

## Minor
Cosmetic or low-impact issue.

---

# 21. Regression Strategy

After fixes, rerun:

- affected test
- related workflow
- portal navigation
- permission checks
- core Golden Workflow

Maintain a small automated smoke suite.

---

# 22. Release Candidate

Create:

**SOE-GAIP Frontend RC1**

then RC2 etc. as needed.

Each candidate should have:

- build identifier
- commit/tag
- known issues
- fixture version
- test status

---

# 23. QA Deliverables

1. QA Plan
2. Test Case Catalogue
3. Role/Permission Matrix Tests
4. Workflow Tests
5. Module Tests
6. Dashboard Reconciliation Tests
7. GIS Tests
8. Responsive Tests
9. Accessibility Regression
10. Edge-Case Tests
11. Defect Register
12. Regression Record
13. Release Candidate Notes

---

# 24. Exit Gate

Phase 23 is complete when:

- no open Blocker defects remain
- no unresolved Critical defects remain for core stakeholder workflows
- major workflows pass
- role boundaries pass
- KPI/dashboard data reconciles
- GIS/search/reports function as intended
- responsive/accessibility critical issues are resolved
- a stable Release Candidate is approved for stakeholder validation

## **Frontend Functional QA — Passed for Formal Stakeholder Validation**
