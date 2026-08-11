# SOE-GAIP Frontend Development
## Phase 25 Implementation Plan — UX and Functional Freeze

**Project:** State-Owned Enterprises Governance, Asset & Performance Intelligence Platform (SOE-GAIP)  
**Development Stage:** Frontend-only stakeholder validation prototype  
**Data Source:** Realistic dummy data through mock services  
**Backend / Database:** Out of scope  
**External Government API Integrations:** Future phase  
**Implementation Principle:** Build the intended production operating model in the frontend without creating backend dependencies.

---

# 1. Phase Objective

Phase 25 formally freezes the stakeholder-approved frontend product definition before backend development begins.

The deliverable is:

## **SOE-GAIP Approved Functional Prototype v1.0**

The freeze does not mean the software can never change. It means changes after this point require controlled change management because backend and database work will depend on these decisions.

---

# 2. Freeze Scope

Finalize and baseline:

- portal architecture
- navigation
- modules
- terminology
- screen inventory
- workflows
- forms
- major data fields
- dashboards
- KPIs
- reports
- roles
- permissions
- status definitions
- validation rules
- data-entry patterns
- review patterns
- GIS interactions
- scorecards/risk methodology status

---

# 3. Functional Baseline

Create a formal baseline package containing:

- approved build/tag
- approved screen inventory
- approved workflows
- approved role matrix
- approved module map
- approved navigation
- approved reports
- approved dashboard catalogue
- accepted stakeholder decisions

---

# 4. Terminology Freeze

Create one final vocabulary for:

- portals
- modules
- statuses
- role names
- actions
- financial labels
- asset classifications
- governance terms
- compliance states
- risk levels

Remove duplicated/alternate terminology from UI.

---

# 5. Workflow Freeze

For every workflow document:

- states
- actors
- transitions
- entry conditions
- allowed actions
- blocking rules
- clarification
- return
- approval
- lock
- history behavior

The frontend implementation must match this documentation.

---

# 6. Role and Permission Freeze

Finalize:

**Role → Action → Scope**

Confirm:

- SOE department access
- certifier roles
- MoIP review roles
- executive read-only scope
- sensitive-field visibility

Any unresolved policy-level permission should be explicitly marked pending, not guessed.

---

# 7. Screen Inventory Freeze

Every approved screen should have:

- Screen ID
- Portal
- Module
- Route
- User role
- Purpose
- Primary actions
- Data entities
- Workflow states
- Backend dependency later

Screens not in the baseline are out of scope unless approved through change control.

---

# 8. Field Baseline

For every major form capture:

- field name
- business meaning
- type
- required/optional
- validation
- allowed values
- reporting frequency
- evidence requirement
- sensitivity
- edit role

This feeds Phase 26 API/database work.

---

# 9. KPI Baseline

For every approved KPI:

- name
- definition
- source fields
- formula
- period
- unit
- null behavior
- drill-down source
- methodology status

If a risk/score formula is still prototype-only, label it clearly rather than silently freezing it as official.

---

# 10. Report Baseline

For each report define:

- audience
- sections
- filters
- period
- data status
- export requirement later
- approval status

---

# 11. Known Limitations Register

Document frontend-only limitations:

- mock authentication
- mock persistence
- mock document storage
- mock Excel import
- mock notifications
- simulated workflow execution
- prototype analytics/rules
- no external integrations

This prevents stakeholders from confusing prototype behavior with production readiness.

---

# 12. Future Phase Register

Document items intentionally deferred:

- backend
- database
- production authentication
- file storage
- server-side workflow
- notification services
- production security
- reporting services
- external APIs
- production AI
- formal risk methodology where pending

---

# 13. Change Control After Freeze

Any post-freeze change requires:

- Change Request ID
- reason
- stakeholder sponsor
- impacted screens
- impacted data
- impacted workflow
- impacted backend design
- effort assessment
- approval

Do not allow undocumented edits to the frozen build.

---

# 14. Release Tagging

Create:

```text
SOE-GAIP Functional Prototype v1.0
```

Record:

- commit/tag
- build URL/package
- fixture version
- date
- known limitations
- acceptance reference

---

# 15. Final QA Smoke

Before freeze:

- role switch
- Golden Workflow
- MoIP review
- executive dashboards
- GIS
- search
- reports
- permissions
- responsive key screens

---

# 16. Deliverables

1. Approved Functional Prototype v1.0
2. Functional Baseline Register
3. Final Screen Inventory
4. Final Role/Permission Matrix
5. Workflow Catalogue
6. Field Baseline
7. KPI Baseline
8. Report Baseline
9. Terminology Dictionary
10. Known Limitations Register
11. Future Phase Register
12. Change Control Procedure
13. Release Notes

---

# 17. Exit Gate

Phase 25 is complete when:

- no major product architecture issues remain unresolved
- stakeholder-approved build is tagged
- scope baseline is documented
- workflows/roles/screens are frozen
- known limitations/future work are explicit
- backend team can consume the baseline without asking fundamental product questions

## **SOE-GAIP Approved Functional Prototype v1.0 — Frozen for Backend Handover**
