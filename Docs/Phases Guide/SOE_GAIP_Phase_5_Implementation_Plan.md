# SOE-GAIP Frontend Development
## Phase 5 Implementation Plan — Golden End-to-End Workflow

**Project:** State-Owned Enterprises Governance, Asset & Performance Intelligence Platform (SOE-GAIP)  
**Development Stage:** Frontend-only stakeholder validation prototype  
**Data Source:** Realistic dummy data through mock services  
**Backend / Database:** Out of scope  
**External Government API Integrations:** Future phase  
**Implementation Principle:** Build the intended production operating model in the frontend without creating backend dependencies.

---

# 1. Phase Objective

Phase 5 validates the complete frontend operating model by implementing one end-to-end vertical workflow before the same pattern is reused across modules.

Use **Financial Reporting** because it exercises data entry, period context, validation, evidence, certification, Ministry review, clarification, resubmission, approval, history and executive consequences.

---

# 2. Required Workflow

```text
SOE Finance Officer
        ↓
Create/Edit Financial Draft
        ↓
Validation
        ↓
Attach Evidence
        ↓
Mark Section Complete
        ↓
SOE Focal Review
        ↓
CEO/CFO Certification
        ↓
Submit to MoIP
        ↓
MoIP Review
        ↓
Clarification Requested
        ↓
SOE Response
        ↓
Resubmission
        ↓
Approval
        ↓
Approved Snapshot
        ↓
Executive KPI Updated
```

---

# 3. Roles

## Finance Officer

May edit/save/resolve issues/attach evidence/mark ready.

Cannot certify or approve.

## Focal Person

May review completeness and readiness.

## CFO / CEO

May review certification summary and certify according to scenario.

## MoIP Reviewer

May compare, inspect evidence, request clarification and approve.

## Executive Role

Read-only approved KPI and drill-down.

---

# 4. State Machine

```text
DRAFT
  ↓
IN_PROGRESS
  ↓
READY_FOR_INTERNAL_REVIEW
  ↓
READY_FOR_CERTIFICATION
  ↓
CERTIFIED
  ↓
SUBMITTED
  ↓
UNDER_REVIEW
  ├─→ CLARIFICATION_REQUESTED
  │      ↓
  │   RESUBMITTED
  │      ↓
  └──── UNDER_REVIEW
         ↓
      APPROVED
         ↓
       LOCKED
```

Only valid role/state actions should appear.

---

# 5. Required Screens

## Finance Overview

- period
- completion
- key values
- validation issues
- evidence status
- workflow status
- previous-period comparison

## Financial Form

Representative:

- revenue
- operating expenditure
- CAPEX
- profit/loss
- cash flow
- working capital
- subsidies
- government support

## Evidence Panel

- attached mock document
- category
- version
- uploader
- status

## Internal Review

- completeness
- warnings
- material changes
- evidence gaps
- comments

## Certification

- organization
- period
- summary metrics
- unresolved warnings
- certification statement
- certifier
- simulated certification action

## MoIP Review

- current values
- previous values
- percentage change
- warnings
- evidence
- reviewer comment
- Approve / Request Clarification

## Clarification

- reviewer question
- affected field/section
- due date
- response
- attachment placeholder
- Resubmit

## Approval Confirmation

- approved by
- date
- period
- version

## History

Show save, completion, certification, submission, clarification, resubmission and approval events.

## Executive Drill-Down

Approved KPI → source financial record.

---

# 6. Validation

Implement representative blocking errors and non-blocking warnings.

Examples:

- required fields
- valid numeric input
- percentage ranges
- missing mandatory evidence
- material year-on-year change warning

Prototype thresholds must be documented as demonstration rules unless formally approved.

---

# 7. Evidence Simulation

Allow simulated upload and metadata linking.

No real storage required.

---

# 8. Notifications

Generate mock notifications for:

- finance ready
- certification requested
- submission received
- clarification requested
- approval complete

Each notification links to the relevant screen.

---

# 9. Cross-Portal Consequences

Required behavior:

```text
Finance draft changed
        ↓
Certification summary changes
        ↓
MoIP review changes
        ↓
After approval only
        ↓
Executive KPI changes
```

Draft/unapproved data must not update executive intelligence.

---

# 10. Versioning

Demonstrate:

```text
Submitted v1.0
Clarification
Resubmitted v1.1
Approved v1.1
```

Retain prior version for comparison.

---

# 11. Permission Rules

- Finance Officer cannot certify
- SOE certifier cannot approve for MoIP
- MoIP Reviewer cannot edit source values
- Minister cannot edit
- approved/locked records are read-only

---

# 12. UX Rules

- always show workflow status
- show next action
- show current action owner
- use explicit action labels
- confirm governance-significant actions
- preserve comments and history

---

# 13. Stakeholder Demo Script

1. Finance Officer opens FY2027
2. edits revenue
3. triggers warning
4. attaches evidence
5. marks complete
6. CFO certifies
7. submits
8. MoIP Reviewer compares FY2026/FY2027
9. requests clarification
10. Finance responds
11. resubmits
12. MoIP approves
13. Minister sees updated approved KPI
14. KPI drills back to evidence/history

---

# 14. Technical Implementation

Use:

- mock services
- query invalidation
- centralized workflow helpers
- permission checks
- form schemas
- version utility
- timeline-event creation
- derived KPI logic

Do not hardcode transition logic inside page components.

---

# 15. Tests

Required:

- valid/invalid transitions
- role permissions
- validation
- certification order
- clarification cycle
- version increment
- approved KPI updates
- draft KPI does not update executive view
- locked record is read-only

---

# 16. Stakeholder Validation Questions

- Is the workflow realistic?
- Who certifies what?
- Can MoIP return field, section or whole submission?
- Which evidence is mandatory?
- Which changes require explanation?
- Are status names understandable?
- Is version history sufficient?
- Does reviewer context suffice?
- Is executive traceability adequate?

---

# 17. Deliverables

1. financial pilot
2. workflow state machine
3. internal review
4. certification
5. submission
6. MoIP review
7. clarification/resubmission
8. approval
9. version history
10. activity timeline
11. notifications
12. executive KPI consequence
13. demo script
14. workflow tests

---

# 18. Exit Gate

Phase 5 is complete when:

- complete path works without developer intervention
- roles only see valid actions
- clarification/resubmission works
- approved data updates executive intelligence
- draft data does not
- history/versioning are understandable
- stakeholders approve this pattern for reuse

## **Golden Workflow — Approved as the Standard SOE-GAIP Governance Interaction Pattern**
