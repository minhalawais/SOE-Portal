# SOE-GAIP Frontend Development
## Phase 6 Implementation Plan — SOE Management & Submission Portal

**Project:** State-Owned Enterprises Governance, Asset & Performance Intelligence Platform (SOE-GAIP)  
**Development Stage:** Frontend-only stakeholder validation prototype  
**Data Source:** Realistic dummy data through mock services  
**Backend / Database:** Out of scope  
**External Government API Integrations:** Future phase  
**Implementation Principle:** Build the intended production operating model in the frontend without creating backend dependencies.

---

# 1. Phase Objective

Phase 6 develops the primary operational workspace used by SOEs to maintain information and complete reporting obligations.

The portal must be task-oriented rather than module-oriented.

The core user question is:

> **What do I need to complete, correct, certify or submit?**

The portal should provide one coherent reporting workspace across all future business modules.

---

# 2. Primary Users

Support role-aware experiences for:

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

The portal shell remains shared. Visible actions and priorities vary by role.

---

# 3. SOE Dashboard

The dashboard should show:

## Reporting Context

- active reporting period
- organization
- reporting deadline
- overall submission status

## Completion

- overall completion %
- modules complete
- modules incomplete
- blocking validation issues
- warnings
- evidence gaps

## Pending Actions

Examples:

- complete financial section
- respond to clarification
- certify submission
- upload required evidence
- resolve validation issue

## Upcoming Deadlines

Examples:

- annual return
- Board update
- compliance obligation

## Recent Activity

Examples:

- saved changes
- returned section
- certification
- reviewer comment

---

# 4. Reporting Workspace

Create the central workspace:

```text
Enterprise Profile
Assets
Human Resources
Board Governance
Executive Management
Financials
Loans & Grants
Procurement
Audit
Litigation
Compliance
Industrial Performance
Privatization
Documents
```

Each module row/card should show:

- completion %
- workflow status
- validation issue count
- evidence issue count
- assigned owner
- last updated
- next action

Example:

```text
Assets
82% complete
3 validation issues
2 evidence gaps
Owner: Asset Officer
[Continue]
```

---

# 5. Module Status Logic

Use controlled statuses:

- Not Started
- In Progress
- Complete
- Validation Issue
- Returned
- Ready for Review
- Ready for Certification
- Certified
- Submitted
- Approved

Status should derive from mock workflow state, not independent UI labels.

---

# 6. Assignment Model

Dummy data should assign module ownership.

Typical mapping:

- Finance → Finance Officer
- HR → HR Officer
- Board → Company Secretary
- Assets → Asset Officer
- Litigation → Legal Officer
- Procurement → Procurement Officer

The Focal Person sees all modules. Department users see their own responsibilities first.

---

# 7. Focal Person Experience

The Focal Person needs:

- overall completion
- department completion
- outstanding errors
- returned items
- cross-module issues
- certification readiness
- outstanding clarifications
- ability to navigate directly to incomplete work

Avoid executive-level analytics here.

---

# 8. CEO/CFO Experience

Prioritize:

- certification queue
- major changes
- unresolved warnings
- completeness
- evidence gaps
- prior-period comparison
- certification history

Senior users should not be forced through raw entry forms unless they deliberately drill down.

---

# 9. Clarification Inbox

Create a centralized area showing:

- clarification text
- related module
- related field/record
- received date
- due date
- status
- assigned SOE user
- response status

Each item must deep-link to the relevant record.

---

# 10. Validation Centre

Create one consolidated issue view.

Group by:

- blocking
- warning
- evidence missing
- incomplete required field

Support filtering by:

- module
- owner
- severity
- status

Clicking an issue opens the affected record.

---

# 11. Submission Readiness

Dedicated readiness summary:

- modules complete
- blocking errors
- warnings
- missing evidence
- outstanding clarifications
- certification requirements

Submission remains disabled while configured blocking conditions exist.

---

# 12. Submission Confirmation

Before final submission show:

- organization
- reporting period
- version
- certifiers
- completion
- unresolved non-blocking warnings
- formal submission statement

Require explicit confirmation.

---

# 13. Simulated Excel/CSV Import UX

Provide import entry points for high-volume areas.

Prototype flow:

1. Download Template placeholder
2. Select mock file
3. Simulated validation
4. Accepted rows
5. Warning rows
6. Rejected rows
7. Confirm import
8. Registry updates

Do not implement real parsing unless separately requested.

---

# 14. Simulated Document Upload

Allow:

- mock file selection
- category
- linked record
- version
- notes
- simulated upload

Use the shared mock document model.

---

# 15. Tasks and Notifications

SOE dashboard should surface tasks created by:

- incomplete modules
- clarifications
- deadlines
- certification
- returned records

Notifications must deep-link.

---

# 16. Search

Provide basic portal-level search for:

- modules
- records
- documents

Advanced intelligence query remains a later phase.

---

# 17. Common Module Page Pattern

Use a standard structure:

```text
Module Header
├── Reporting Period
├── Status
├── Completion
├── Owner
└── Actions

Module Content
├── Overview
├── Records
├── Validation
├── Evidence
└── History
```

This pattern should be reused in later phases.

---

# 18. Responsive Rules

Priority:

1. desktop
2. laptop
3. tablet
4. mobile summary

Mobile should focus on tasks, status, summary and limited review rather than complex bulk entry.

---

# 19. Dummy Data Requirements

Provide SOEs/submissions in multiple states:

- untouched
- partially complete
- ready for certification
- clarification requested
- overdue
- approved

---

# 20. QA

Test:

- role-specific dashboard
- role-specific module ownership
- completion recalculation
- clarification deep links
- readiness blocking rules
- submission confirmation
- import simulation
- period switching
- role switching
- responsive layout

---

# 21. Stakeholder Validation Questions

- Is module ownership realistic?
- Does the dashboard show the right priorities?
- Are completion percentages understandable?
- Are clarifications easy to resolve?
- Is certification readiness clear?
- Are deadlines visible enough?
- Are bulk import entry points appropriate?
- Does the Focal Person have enough oversight?
- Which modules should be annual, quarterly or monthly?

---

# 22. Deliverables

1. SOE dashboard
2. reporting workspace
3. module status system
4. completion calculation
5. assignment model
6. Focal Person view
7. CEO/CFO certification entry
8. clarification inbox
9. validation centre
10. submission readiness
11. submission confirmation
12. mock import UX
13. mock upload UX
14. task/notification integration
15. responsive operational layout

---

# 23. Exit Gate

Phase 6 is complete when:

- SOE users immediately understand required work
- module ownership is role-aware
- completion reflects dummy state
- Focal Person can coordinate the cycle
- CEO/CFO can access certification
- clarification workflow is actionable
- validation issues are centralized
- submission readiness is unambiguous
- stakeholders can navigate without developer explanation

## **SOE Management & Submission Portal — Approved for Core Domain Module Development**
