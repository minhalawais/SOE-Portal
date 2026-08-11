# SOE-GAIP Frontend Development
## Phase 15 Implementation Plan — Secretary Command Centre

**Project:** State-Owned Enterprises Governance, Asset & Performance Intelligence Platform (SOE-GAIP)  
**Development Stage:** Frontend-only stakeholder validation prototype  
**Data Source:** Realistic dummy data through mock services  
**Backend / Database:** Out of scope  
**External Government API Integrations:** Future phase  
**Implementation Principle:** Build the intended production operating model in the frontend without creating backend dependencies.

---

# 1. Phase Objective

Phase 15 creates the Secretary Command Centre as an action-oriented operational governance view.

The core question is:

> **What requires my attention?**

This is not a general analytics dashboard and should not replicate the Minister portal.

The Secretary experience should prioritize:

- exceptions
- overdue obligations
- escalations
- pending decisions
- material operational risks
- cross-SOE follow-up

---

# 2. Primary Information Areas

Build:

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

---

# 3. Command Centre Home

Recommended structure:

## Executive Action Summary

Show counts for:

- Critical
- Attention
- Pending Decision
- Overdue
- Escalated

## Priority Queue

Show highest-priority items first.

Each item should include:

- SOE
- issue
- severity
- age/due date
- owner
- next action
- direct drill-down

## Upcoming 30/60/90 Days

Show major obligations such as:

- Board expiries
- loan repayments
- compliance deadlines
- major hearings
- reporting deadlines

---

# 4. Critical Matters

Create a ranked list driven by dummy alert/risk data.

Examples:

- overdue loan repayment
- major unresolved audit para
- Board quorum risk
- material litigation
- missing annual financial submission
- critical compliance lapse

Avoid arbitrary ranking formulas unless clearly marked as prototype rules.

---

# 5. Pending Decisions

Represent matters that require senior administrative intervention.

Fields:

- Decision ID
- SOE
- matter
- originating module
- date raised
- responsible Wing
- recommendation/summary placeholder
- urgency
- status
- linked evidence

Do not simulate formal government approvals beyond the defined prototype status.

---

# 6. Upcoming Obligations

Provide:

- calendar/list view
- due in 7/30/60/90 days
- organization
- obligation type
- owner
- severity

Focus on future action, not historical reporting.

---

# 7. Delayed Compliance

Show:

- SOE
- requirement
- due date
- days overdue
- responsible function
- current response
- escalation status

Allow drill-down to compliance record and evidence.

---

# 8. Financial Concerns

Use concise exception indicators such as:

- persistent loss
- material subsidy increase
- high debt exposure
- overdue repayment
- deteriorating cash/working capital where modeled

Do not show full financial statements on the Command Centre.

---

# 9. Board Governance

Show:

- Board vacancies
- expiries within 30/90 days
- expired appointments
- missing declarations
- committee gaps where configured

Provide direct link to Board detail.

---

# 10. Audit Exposure

Show:

- high-value open paras
- overdue responses
- recovery outstanding
- PAC matters requiring action

Use value + age + status.

---

# 11. Major Litigation

Show:

- high-value active cases
- upcoming hearings
- cases linked to strategic assets
- overdue legal actions where configured

---

# 12. Submission Compliance

Show:

- submissions due
- overdue
- under review too long
- clarification overdue
- approved

Use simple cross-SOE comparison.

---

# 13. Escalation Queue

Show:

- source issue
- escalation level
- current owner
- age
- due date
- current status

Secretary should be able to drill into the complete history.

---

# 14. Drill-Down Pattern

Use:

```text
Command Centre
↓
Issue
↓
SOE / Record
↓
Evidence / History
```

The user should never need to navigate manually through several module menus to investigate an alert.

---

# 15. UX Rules

- exception-first
- concise labels
- no decorative KPI grids
- limited chart count
- visible severity
- clear next action
- strong empty state: "No critical matters"
- preserve context when drilling down

---

# 16. Role Behavior

Secretary:
- read across Ministry portfolio
- inspect details
- view escalations
- view pending decisions

No source-data editing.

Any simulated action should be governance-oriented, such as acknowledge/assign/escalate, not modify SOE records.

---

# 17. Dummy Data Requirements

Create:

- 2–3 critical matters
- several Attention matters
- clean/healthy SOEs
- overdue compliance
- Board vacancy
- loan repayment due
- audit para exposure
- major litigation
- resolved escalation

Balance the data so the dashboard is informative without appearing permanently catastrophic.

---

# 18. QA

Test:

- priority sorting
- due-date calculations
- drill-down
- filter by SOE/type/severity
- empty critical queue
- many alerts
- role restrictions
- data consistency with underlying modules

---

# 19. Stakeholder Validation Questions

- What does the Secretary actually need daily/weekly?
- Which issues deserve Critical status?
- What decisions should appear here?
- Should the Secretary be able to assign tasks?
- What look-ahead period is useful?
- Which financial indicators are too detailed?
- Should unresolved reviewer workload appear?
- What requires escalation to Minister?

---

# 20. Deliverables

1. Secretary Command Centre
2. Priority Queue
3. Critical Matters
4. Pending Decisions
5. Upcoming Obligations
6. Delayed Compliance
7. Financial Concerns
8. Board Governance summary
9. Audit Exposure
10. Litigation summary
11. Submission Compliance
12. Escalation Queue
13. drill-down flows
14. role-specific fixtures

---

# 21. Exit Gate

Phase 15 is complete when:

- the dashboard answers "What requires my attention?"
- critical/overdue matters are prioritized
- drill-down is direct
- detail remains available without cluttering home
- no operational edit functions are exposed
- stakeholders approve the Secretary's action model

## **Secretary Command Centre — Approved**
