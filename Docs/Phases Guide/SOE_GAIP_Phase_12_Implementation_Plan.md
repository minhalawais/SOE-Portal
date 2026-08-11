# SOE-GAIP Frontend Development
## Phase 12 Implementation Plan — Documents, Evidence and Historical Intelligence

**Project:** State-Owned Enterprises Governance, Asset & Performance Intelligence Platform (SOE-GAIP)  
**Development Stage:** Frontend-only stakeholder validation prototype  
**Data Source:** Realistic dummy data through mock services  
**Backend / Database:** Out of scope  
**External Government API Integrations:** Future phase  
**Implementation Principle:** Build the intended production operating model in the frontend without creating backend dependencies.

---

# 1. Phase Objective

Phase 12 makes documents, evidence, versioning and historical intelligence first-class parts of the frontend.

The objective is to validate the principle:

> Important information must be traceable from executive insight back to source record, evidence, submission, certification and review history.

---

# 2. Module Scope

Build:

- Document Repository
- Record-Level Attachments
- Evidence Viewer
- Document Categories
- Document Metadata
- Version History
- Submission History
- Audit Timeline
- Enterprise Timeline
- Data Lineage Drill-Down

---

# 3. Document Repository

Create searchable repository with:

- Document ID
- title
- category
- related SOE
- linked module
- linked record
- reporting period
- version
- uploaded by
- upload date
- status
- file type
- evidence/official classification

Filters:

- SOE
- category
- module
- period
- version
- uploader
- status

---

# 4. Document Categories

Support categories aligned to the concept:

- Memorandum
- Articles
- Annual Reports
- Board Minutes
- Financial Statements
- Audit Reports
- Property Documents
- Lease Agreements
- HR Rules
- Service Rules
- Notifications
- Cabinet Decisions
- Court Orders
- Privatization Documents

Allow additional controlled categories later.

---

# 5. Record-Level Evidence

Any important record should be able to show related evidence.

Examples:

- Land Asset → ownership deed, mutation, valuation
- Board Member → appointment notification, declaration
- Financial Submission → audited statements
- Audit Para → audit report, management response
- Litigation → court orders
- Privatization → Cabinet/CCOP decisions, valuation

---

# 6. Evidence Viewer

Frontend viewer should support:

- document metadata
- preview placeholder/local sample
- linked record
- version
- uploader
- evidence status
- related documents
- download/mock action

Do not imply production secure storage in this phase.

---

# 7. Versioning

Represent versions explicitly.

Example:

```text
v1.0 — Submitted
v1.1 — Revised after clarification
v1.2 — Approved
```

Document version and submission version should be distinguishable.

---

# 8. Historical Snapshot View

Provide comparison for selected records:

- current value
- previous value
- changed field
- changed by
- date
- reason/comment

Do not overwrite earlier mock state.

---

# 9. Submission History

Show:

- draft created
- section complete
- certification
- submission
- reviewer action
- clarification
- resubmission
- approval
- lock

Each event should include:

- timestamp
- user/role
- action
- status
- comment
- related version

---

# 10. Audit Timeline

Create a timeline component reusable for:

- submission history
- asset history
- audit para history
- privatization milestone history
- enterprise status history

Timeline should remain concise and filterable for long histories.

---

# 11. Enterprise Timeline

Show significant enterprise events:

- ownership change
- Board change
- enterprise status change
- major asset event
- financial submission approval
- major audit event
- litigation event
- privatization milestone

Do not clutter with every low-level edit.

---

# 12. Data Lineage Drill-Down

Implement the roadmap pattern:

```text
Dashboard KPI
↓
Underlying Record
↓
Evidence
↓
Submission
↓
Certification
↓
Review History
```

At least three representative KPI paths should be demonstrable:

1. financial KPI
2. asset KPI
3. governance KPI

---

# 13. Evidence Status

Use controlled states:

- Available
- Missing
- Pending Review
- Verified
- Superseded

Use status text plus icon/color.

---

# 14. Mock Upload Behavior

Allow simulated:

- select file
- assign category
- link to record
- add notes
- create metadata
- version increment
- mark as replacement/new version

No real remote storage required.

---

# 15. Search

Document search should support:

- title
- category
- linked record
- SOE
- period

Full-text document content search is not required in the frontend-only phase unless separately requested.

---

# 16. Role Behavior

SOE operational users:
- upload/replace evidence where permitted

Focal Person:
- view completeness

MoIP Reviewer:
- inspect evidence
- flag missing/insufficient evidence through workflow comments

Executive users:
- read evidence metadata/drill-down only where authorized

---

# 17. Sensitive Document UX

Some documents may be sensitive.

Prototype:

- restricted badge
- masked metadata where needed
- role-based preview restriction

Do not implement real document encryption in this phase.

---

# 18. Dummy Data Requirements

Include:

- multiple versions of same document
- missing evidence
- superseded document
- verified evidence
- document linked to several business records where appropriate
- historical submission versions
- enterprise timeline with meaningful events

---

# 19. QA

Test:

- linked documents resolve
- version order
- timeline order
- role restrictions
- missing evidence
- superseded status
- lineage drill-down
- filters
- long document names
- no-document state
- mock replacement flow

---

# 20. Stakeholder Validation Questions

- Which document categories are mandatory?
- Which records require evidence?
- Who can verify evidence?
- Should documents have expiry dates?
- Which historical events belong on Enterprise Timeline?
- Should executive users see documents or only metadata?
- What versioning convention is preferred?
- Which records need immutable snapshots?

---

# 21. Deliverables

1. Document Repository
2. document filters/search
3. Record-Level Attachments
4. Evidence Viewer
5. evidence statuses
6. mock upload/version flow
7. Submission History
8. reusable timeline
9. Enterprise Timeline
10. version comparison
11. three end-to-end lineage demonstrations
12. role-aware document access
13. dummy evidence fixtures

---

# 22. Exit Gate

Phase 12 is complete when:

- evidence can be linked to major records
- version history is understandable
- submission history is visible
- Enterprise Timeline shows meaningful events
- KPI-to-evidence lineage is demonstrable
- role access is respected
- stakeholders confirm evidence/versioning expectations

## **Documents, Evidence and Historical Intelligence — Approved**
