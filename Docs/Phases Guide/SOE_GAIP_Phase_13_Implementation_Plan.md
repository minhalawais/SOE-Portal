# SOE-GAIP Frontend Development
## Phase 13 Implementation Plan — MoIP Oversight & Review Portal

**Project:** State-Owned Enterprises Governance, Asset & Performance Intelligence Platform (SOE-GAIP)  
**Development Stage:** Frontend-only stakeholder validation prototype  
**Data Source:** Realistic dummy data through mock services  
**Backend / Database:** Out of scope  
**External Government API Integrations:** Future phase  
**Implementation Principle:** Build the intended production operating model in the frontend without creating backend dependencies.

---

# 1. Phase Objective

Phase 13 builds the operational MoIP Oversight & Review Portal.

The portal's core operating model is:

> **Review → Compare → Query → Approve → Escalate**

This is not an SOE data-entry portal. It is a Ministry oversight workspace.

---

# 2. Primary Users

- MoIP Wing Users
- Reviewers
- Analysts
- Section Officers
- Deputy Secretaries
- Joint Secretaries

Different roles may receive different scopes but should share one oversight interface.

---

# 3. MoIP Oversight Dashboard

Show:

- total SOEs in scope
- submissions due
- submissions received
- overdue submissions
- under review
- clarification pending
- approved
- high-priority exceptions
- review workload
- upcoming deadlines

Every summary should drill into the relevant queue.

---

# 4. SOE Portfolio

Create portfolio table with:

- SOE
- sector
- status
- active reporting period
- submission status
- completion
- data quality
- major warnings
- reviewer
- last activity

Filters:

- sector
- status
- submission status
- reviewer
- risk/warning
- due/overdue

---

# 5. Submission Queue

Columns:

- Submission ID
- SOE
- reporting period
- module/return type
- submitted date
- current status
- validation issues
- evidence gaps
- assigned reviewer
- age
- priority

Support:

- assign reviewer
- open review
- filter
- sort by age/priority
- bulk assignment placeholder where useful

---

# 6. Reviewer Workspace

Recommended structure:

```text
SOE Header
Reporting Period
Submission Status

Module Summary
├── Financials
├── Assets
├── Board
├── Compliance
└── Industrial Performance

Issues
Evidence
Comparison
History
Actions
```

Show issue count per module.

---

# 7. Comparison Mode

Reviewer should compare:

- current submission
- previous approved period
- submitted vs revised version

Highlight:

- material changes
- missing values
- newly added records
- removed records
- changed statuses

Prototype comparison rules should be documented.

---

# 8. Review Modes

Support:

- read submitted value
- view evidence
- add reviewer comment
- flag issue
- request clarification
- return section/record where prototype supports it
- approve

Reviewer should not edit SOE source values.

---

# 9. Clarification Management

Create centralized Clarification Queue:

- SOE
- related record/module
- reviewer
- question
- issued date
- due date
- status
- response received
- age

Allow direct drill-down.

---

# 10. Validation and Data Quality

Surface:

- blocking validation issues
- warnings
- missing evidence
- historical anomalies
- incomplete records

Data quality should be visible but separate from formal approval status.

---

# 11. Approval

Before approval show:

- organization
- reporting period
- version
- unresolved issues
- non-blocking warnings
- reviewer identity
- approval statement

Require explicit confirmation.

---

# 12. Return / Rework

If the prototype supports returning records/sections:

- select affected item
- provide reason
- assign to SOE
- set due date
- create history event
- create task/notification

Avoid returning entire submission by default when a smaller correction is sufficient.

---

# 13. Escalation

Prototype escalation for:

- overdue SOE response
- overdue submission
- high-value audit/legal issue
- unresolved review beyond threshold

Escalation should create:

- severity
- owner
- due date
- history event
- task

---

# 14. Reviewer Workload

Show:

- assigned reviews
- due soon
- overdue
- clarifications waiting
- approvals pending

This is operational, not executive analytics.

---

# 15. SOE Detail from MoIP

MoIP should be able to open an SOE and see read/review views of:

- enterprise
- assets
- governance
- financial
- audit/compliance
- industrial performance
- documents
- submissions

Reuse business components in review/read mode.

---

# 16. Permissions

Example:

MoIP Reviewer:
- review assigned SOEs

MoIP Analyst:
- portfolio analysis, read approved data

Senior MoIP User:
- broader portfolio access
- escalation/approval where configured

No MoIP role should edit SOE source records in the prototype.

---

# 17. Dummy Data Scenarios

Include:

- clean submission ready for approval
- submission with clarification
- overdue submission
- submission with missing evidence
- submission with major year-on-year change
- resubmitted version
- approved locked submission
- reviewer with high workload

---

# 18. QA

Test:

- queue filtering
- reviewer assignment
- comparison mode
- clarification
- resubmission
- approval
- escalation
- role scope
- deep links
- locked record behavior
- evidence access

---

# 19. Stakeholder Validation Questions

- How are reviewers assigned?
- Can a reviewer approve their own assigned review?
- Should review happen by module or whole submission?
- Which changes need explanation?
- Which issues block approval?
- Who can escalate?
- Should MoIP return records or complete modules?
- What information should analysts see versus reviewers?
- What review SLAs should be represented later?

---

# 20. Deliverables

1. MoIP Oversight Dashboard
2. SOE Portfolio
3. Submission Queue
4. Reviewer Workspace
5. Comparison Mode
6. Clarification Queue
7. Data Quality view
8. Approval flow
9. Return/rework flow
10. Escalation flow
11. Reviewer workload view
12. MoIP SOE detail
13. role permissions
14. realistic review fixtures

---

# 21. Exit Gate

Phase 13 is complete when:

- reviewers can manage their workload
- current vs previous/revised values can be compared
- clarifications work end-to-end
- approvals/returns/escalations are clear
- source data remains read-only to MoIP
- role scopes are understandable
- stakeholders approve the Ministry review operating model

## **MoIP Oversight & Review Portal — Approved**
