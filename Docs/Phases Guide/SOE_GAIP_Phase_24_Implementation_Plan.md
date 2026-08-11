# SOE-GAIP Frontend Development
## Phase 24 Implementation Plan — Stakeholder Validation Rounds

**Project:** State-Owned Enterprises Governance, Asset & Performance Intelligence Platform (SOE-GAIP)  
**Development Stage:** Frontend-only stakeholder validation prototype  
**Data Source:** Realistic dummy data through mock services  
**Backend / Database:** Out of scope  
**External Government API Integrations:** Future phase  
**Implementation Principle:** Build the intended production operating model in the frontend without creating backend dependencies.

---

# 1. Phase Objective

Phase 24 conducts formal stakeholder validation of the complete frontend prototype.

The purpose is to validate the system progressively with business owners and decision-makers rather than asking stakeholders to approve a large system in one final session.

Every material comment must be recorded, classified, resolved or explicitly deferred.

---

# 2. Validation Principles

- validate workflows, not just appearance
- use realistic demo scenarios
- show role-specific experiences
- record exact decisions
- distinguish defects from new requirements
- prevent uncontrolled scope growth
- obtain explicit acceptance for major product decisions

---

# 3. Validation Rounds

Follow the roadmap sequence.

## Round 1 — Product Shell, Portals and Navigation

Validate:

- portal architecture
- role structure
- navigation
- terminology
- organization/period context

## Round 2 — SOE Submission Workflow

Validate:

- data entry
- completion
- certification
- submission
- clarification
- resubmission

## Round 3 — Core Business Modules

Validate:

- enterprise
- assets
- HR/governance
- finance
- accountability
- documents

## Round 4 — MoIP Review Workflow

Validate:

- submission queue
- comparison
- clarification
- approval
- escalation

## Round 5 — Secretary and Minister Dashboards

Validate:

- priorities
- KPIs
- risks
- drill-down
- executive density

## Round 6 — GIS, Scorecards, Risk and Intelligence

Validate:

- map filters
- scorecards
- benchmarking
- early warning
- search
- reports

## Round 7 — Full-System Acceptance

Validate:

- complete role journeys
- terminology
- functional coverage
- major reports
- final gaps

---

# 4. Session Preparation

For every session prepare:

- agenda
- target roles
- specific decisions required
- demo scenario
- preconfigured data
- stable build
- decision log template
- issue-capture owner

Avoid open-ended demos without decision objectives.

---

# 5. Stakeholder Groups

Potential groups:

- MoIP project owner
- MoIP Wings
- SOE representatives
- Finance stakeholders
- HR/governance stakeholders
- asset/property stakeholders
- legal/audit/compliance stakeholders
- Secretary office representatives
- Ministerial stakeholders
- IT/NITB stakeholders where relevant to future implementation

Exact participation should be decided by project governance.

---

# 6. Demo Scripts

Use pre-scripted journeys.

Example SOE workflow:

```text
Finance Officer
→ Complete FY2027
→ CFO Certifies
→ Submit
→ MoIP Requests Clarification
→ SOE Responds
→ MoIP Approves
→ Minister KPI Updates
```

Example asset workflow:

```text
Asset Officer
→ Add Land Asset
→ Attach Evidence
→ MoIP Reviews
→ Asset Appears in GIS
→ Minister Drills Down
```

---

# 7. Decision Classification

Every stakeholder comment must be classified as:

- Accepted
- Change Required
- New Requirement
- Out of Scope
- Future Phase

Additionally distinguish:

- Defect
- UX Improvement
- Business Rule Change
- Data Requirement Change
- Permission Change
- Terminology Change

---

# 8. Product Decision Register

Required fields:

- Decision ID
- Date
- Session
- Stakeholder
- Portal/Module
- Issue/Question
- Decision
- Classification
- Priority
- Owner
- Target Phase
- Status
- Resolution
- Evidence/Screenshot reference

This becomes the authoritative change record.

---

# 9. Change Control

New requirements should not be immediately coded during a session.

Process:

```text
Request
↓
Clarify
↓
Classify
↓
Assess Impact
↓
Approve / Defer / Reject
↓
Implement
↓
Revalidate
```

Record impacts on:

- screens
- workflow
- data model
- roles
- reports
- future backend

---

# 10. Acceptance Criteria by Area

## Portal

Stakeholder can identify where to work.

## Workflow

Actors/status/transitions match expected procedure.

## Module

Required information and actions are represented.

## Dashboard

Questions are answered without unnecessary clutter.

## Report

Content/filters are sufficient.

## GIS

Filters and drill-down support real decision questions.

---

# 11. Feedback Prioritization

Suggested:

## P0
Blocks approval or fundamentally incorrect operating model.

## P1
Major requirement or workflow correction.

## P2
Important improvement.

## P3
Minor polish.

Only accepted changes enter implementation backlog.

---

# 12. Revalidation

Every Change Required item should be revalidated after implementation.

Use:

- screenshot review for minor visual changes
- live workflow review for functional changes
- formal session for major architecture changes

---

# 13. Traceability

Map accepted stakeholder decisions to:

- screen inventory
- requirement
- workflow
- data field
- role permission
- report
- KPI

This becomes important in Phase 26 handover.

---

# 14. Meeting Outputs

Each validation session should produce:

- attendance
- build version
- modules reviewed
- decisions made
- open questions
- assigned actions
- next review scope

---

# 15. Final Acceptance Checklist

Before Round 7 sign-off verify:

- all portals reviewed
- all core roles reviewed
- all core modules reviewed
- Golden Workflow approved
- MoIP review approved
- executive dashboards approved
- GIS approved
- reports approved
- terminology approved
- unresolved items classified

---

# 16. Deliverables

1. Stakeholder Validation Plan
2. Session Agendas
3. Demo Scripts
4. Product Decision Register
5. Change Backlog
6. Session Minutes
7. Decision Traceability
8. Revalidation Records
9. Final Acceptance Checklist
10. Stakeholder Acceptance Record

---

# 17. Exit Gate

Phase 24 is complete when:

- all planned validation rounds are completed or formally waived
- material comments are resolved or categorized
- P0/P1 accepted changes are completed/revalidated
- open future-phase items are documented
- stakeholder acceptance exists for the frontend product definition

## **Stakeholder Validation — Completed and Ready for Functional Freeze**
