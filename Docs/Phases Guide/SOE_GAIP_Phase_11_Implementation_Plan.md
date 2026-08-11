# SOE-GAIP Frontend Development
## Phase 11 Implementation Plan — Accountability, Compliance and Transformation Modules

**Project:** State-Owned Enterprises Governance, Asset & Performance Intelligence Platform (SOE-GAIP)  
**Development Stage:** Frontend-only stakeholder validation prototype  
**Data Source:** Realistic dummy data through mock services  
**Backend / Database:** Out of scope  
**External Government API Integrations:** Future phase  
**Implementation Principle:** Build the intended production operating model in the frontend without creating backend dependencies.

---

# 1. Phase Objective

Phase 11 builds the accountability, legal, compliance and transformation experiences that allow stakeholders to track obligations, exceptions and government actions as structured processes rather than static records.

This phase must cover:

- Procurement
- Contracts
- Audit
- Audit Paras
- PAC Observations
- Recovery Tracking
- Litigation
- Compliance
- Privatization
- Restructuring
- Transformation

The main user outcome is:

> Stakeholders can see what issue exists, who owns it, what stage it is in, what evidence supports it and what action is due next.

---

# 2. Core Product Principles

## 2.1 Case/Obligation Orientation

Audit paras, litigation matters, compliance requirements and privatization stages must behave like trackable records with status, dates, owners and history.

## 2.2 Evidence Linked to Record

Every material accountability item should be able to reference documents/evidence.

## 2.3 Exception First

Overview screens should prioritize overdue, high-value, unresolved or blocked items instead of showing decorative summaries.

## 2.4 No Legal or Compliance Conclusions Without Source Rules

The prototype may show configured statuses but must not infer legal validity or compliance beyond the defined dummy rules.

---

# 3. Procurement Module

Create a procurement registry with:

- Procurement ID
- procurement title
- annual procurement plan reference
- SOE
- vendor
- value
- procurement method
- PPRA compliance status
- contract status
- completion status
- responsible function
- evidence availability

Controlled procurement methods should include at least:

- Open Tender
- Single Source

Additional methods should be added only if validated by stakeholders.

---

# 4. Procurement Detail

Sections:

- Basic Information
- Procurement Method
- Vendor
- Value
- Timeline
- Compliance
- Contract
- Evidence
- History

Show alerts for:

- missing PPRA evidence
- incomplete procurement record
- procurement above configured demonstration threshold
- overdue completion

Thresholds are prototype rules until formally approved.

---

# 5. Contracts

Create contract detail with:

- Contract ID
- procurement reference
- vendor
- contract value
- start date
- end date
- completion %
- responsible officer
- status
- amendments
- documents

Link contract back to procurement.

---

# 6. Audit Module

Create Audit Register for:

- External Audit
- Internal Audit
- Auditor General
- Special Audit

Fields:

- Audit ID
- audit type
- audit period
- auditor
- report date
- status
- number of paras
- total amount involved
- evidence/report availability

---

# 7. Audit Para Management

Every audit para should be a trackable item.

Fields:

- Para ID
- audit reference
- title/subject
- amount involved
- date raised
- responsible SOE/function
- responsible officer
- response due date
- current status
- PAC status
- recovery status
- evidence
- age in days

Recommended states:

```text
Open
→ Response Submitted
→ Under Review
→ Action Required
→ Recovery In Progress
→ Settled
→ Closed
```

The exact final workflow must be validated with stakeholders.

---

# 8. PAC Observations

Represent:

- PAC observation
- related audit para
- observation date
- required action
- responsible party
- due date
- status
- supporting evidence

Allow direct drill-down from PAC observation to underlying para and audit report.

---

# 9. Recovery Tracking

Show:

- amount involved
- amount recovered
- outstanding amount
- recovery %
- latest action
- due date
- status

Use clear progress display without implying final audit settlement unless status explicitly says so.

---

# 10. Litigation Module

Create Litigation Register with:

- Case ID
- Court
- Case Number
- Petitioner
- Respondent
- Nature
- Amount Involved
- Lawyer
- Status
- Next Hearing
- SOE
- evidence/document status

Filters:

- court
- status
- SOE
- next hearing range
- value band

---

# 11. Litigation Detail

Sections:

- Case Summary
- Parties
- Financial Exposure
- Counsel
- Hearing Timeline
- Documents
- Related Assets
- Related Audit/Compliance Records
- History

Upcoming hearings should be surfaced in tasks/alerts later.

---

# 12. Compliance Module

Create a Compliance Matrix around requirements such as:

- SOE Act
- Companies Act
- PPRA
- SECP Filings
- Tax Returns
- EOBI
- ESSI
- Environmental
- Labour Laws
- Board Evaluation
- Annual Report
- Strategic Plan
- Risk Register
- Internal Audit

Each requirement should have:

- requirement name
- reporting frequency
- due date
- responsible function
- status
- evidence
- last submission
- verification state
- comments

---

# 13. Compliance Statuses

Use:

- Compliant
- Partially Compliant
- Non-Compliant
- Pending Verification
- Not Applicable
- Overdue

Do not use free-text compliance status.

---

# 14. Privatization Pipeline

Use a structured stage-based experience:

```text
Identified
↓
Approved
↓
Financial Advisor
↓
Due Diligence
↓
Valuation
↓
EOI
↓
Bidding
↓
Transaction
↓
Post-Sale
```

Each stage should show:

- status
- responsible institution
- target date
- actual completion date
- blocker
- approval
- linked documents
- comments

---

# 15. Privatization Case Detail

Sections:

- Overview
- Cabinet Decision
- CCOP Decision
- Privatization Commission Stage
- Financial Advisor
- Valuation
- Due Diligence
- EOI
- Bidding
- Transaction
- Post-Sale Monitoring
- Evidence
- History

---

# 16. Restructuring / Transformation

Create a controlled generic transformation tracker for:

- restructuring
- merger
- closure
- rehabilitation
- land monetization
- other approved transformation pathway

Fields:

- initiative
- rationale
- current stage
- responsible authority
- milestones
- decision status
- documents
- next action

Do not over-specify policy stages unless stakeholder-approved.

---

# 17. Cross-Module Links

Support links between:

- Audit Para → Recovery
- Audit Para → PAC Observation
- Litigation → Asset
- Compliance → Evidence
- Procurement → Contract
- Privatization → Valuation/Documents
- Transformation → Enterprise Status

These relationships should use stable IDs in dummy data.

---

# 18. Role Behavior

SOE Procurement Officer:
- create/edit procurement and contracts

Internal Audit / Finance:
- update audit and para responses

Legal Officer:
- update litigation

Company Secretary / Compliance Role:
- update compliance

SOE Focal Person:
- review completeness

MoIP Reviewer:
- review, compare, clarify, escalate

Secretary/Minister:
- read exception-focused summaries

---

# 19. Dummy Data Scenarios

Include:

- single-source procurement with warning
- open tender completed successfully
- high-value pending audit para
- partially recovered audit issue
- PAC observation overdue
- litigation with major financial exposure
- upcoming court hearing
- compliance item overdue
- fully compliant SOE
- privatization case blocked at due diligence
- privatization case progressing normally
- restructuring initiative awaiting approval

---

# 20. Validation Rules

Examples:

- contract must reference valid procurement
- amount values non-negative
- next hearing date valid
- settlement/closure requires configured evidence
- compliance due date required for recurring obligations
- privatization stage cannot skip required predecessor in prototype workflow
- recovery cannot be negative
- recovery amount should not exceed amount involved without explicit warning

---

# 21. QA

Test:

- procurement filtering
- audit para lifecycle
- PAC linkage
- recovery calculations
- litigation hearing sorting
- compliance due/overdue logic
- privatization stage movement
- role permissions
- evidence linking
- cross-module navigation
- empty/no-issue states

---

# 22. Stakeholder Validation Questions

- Are procurement methods complete?
- How should PPRA compliance be represented?
- What is the correct audit para lifecycle?
- How are PAC observations linked?
- Which recovery states matter?
- Which litigation values should be tracked?
- Are compliance categories complete?
- Which obligations are annual, quarterly or event-based?
- Are privatization stages correct?
- Should restructuring have a separate formal workflow?

---

# 23. Deliverables

1. Procurement Register
2. Contract Register/Detail
3. Audit Register
4. Audit Para Register/Detail
5. PAC Observation view
6. Recovery Tracking
7. Litigation Register/Detail
8. Compliance Matrix
9. Privatization Pipeline
10. Privatization Detail
11. Transformation Tracker
12. cross-module links
13. validation schemas
14. role-aware modes
15. realistic fixtures

---

# 24. Exit Gate

Phase 11 is complete when:

- accountability records are trackable as structured processes
- audit paras connect to PAC/recovery
- litigation is navigable and date-aware
- compliance obligations are visible and actionable
- privatization uses a clear stage model
- transformation records have owners, milestones and next actions
- evidence hooks exist
- stakeholders approve terminology and lifecycle assumptions

## **Accountability, Compliance and Transformation Modules — Approved**
