# SOE-GAIP Frontend Development
## Phase 4 Implementation Plan — Dummy Data Architecture and Mock Service Layer

**Project:** State-Owned Enterprises Governance, Asset & Performance Intelligence Platform (SOE-GAIP)  
**Development Stage:** Frontend-only stakeholder validation prototype  
**Data Source:** Realistic dummy data through mock services  
**Backend / Database:** Out of scope  
**External Government API Integrations:** Future phase  
**Implementation Principle:** Build the intended production operating model in the frontend without creating backend dependencies.

---

# 1. Phase Objective

Phase 4 creates the realistic data environment that makes the frontend behave like one coherent system instead of disconnected screens.

Dummy data must be realistic, relational, deterministic, period-aware, scenario-driven and mutable through mock services.

Random numbers and disconnected JSON files are not acceptable.

---

# 2. Data Access Principle

Required:

```text
UI
 ↓
Domain Hook / Query
 ↓
Service Interface
 ↓
Mock Service
 ↓
Mock Repository / Dataset
```

Future:

```text
UI
 ↓
Domain Hook / Query
 ↓
Service Interface
 ↓
API Service
 ↓
Backend
```

---

# 3. Representative SOE Scenarios

Create at minimum:

1. healthy profitable SOE
2. persistent loss-making SOE
3. asset-rich/land-rich SOE
4. governance-risk SOE
5. audit-heavy SOE
6. litigation-heavy SOE
7. high-subsidy SOE
8. underutilized industrial SOE
9. SOE under privatization
10. generally compliant SOE

When real entity names are used, clearly label all values as dummy demonstration data.

---

# 4. Entity Catalogue

Create fixtures for:

## Enterprise
organizations, ownership, subsidiaries, associates, JVs, contacts, locations.

## Assets
land, buildings, machinery, vehicles, equipment, valuation, utilization, legal status, encroachment, location.

## People
employees, sanctioned posts, Board members, executives, consultants, daily wagers.

## Finance
reporting periods, revenue, expenditure, CAPEX, profit/loss, cash flow, working capital, ratios, subsidies, government support.

## Fiscal
loans, repayments, guarantees, grants.

## Accountability
procurement, contracts, audits, audit paras, PAC observations, recovery, litigation, compliance.

## Transformation
privatization cases and milestones.

## Industrial
capacity, production, utilization, exports, imports, domestic sales, employment contribution, energy, carbon.

## Governance Workflow
submissions, module completion, certification, review, clarification, tasks, alerts, notifications, timeline events, document metadata.

---

# 5. Relationship Rules

Use stable IDs:

```text
organizationId
reportingPeriodId
assetId
submissionId
documentId
boardMemberId
auditId
```

Do not join data by display names.

---

# 6. Reporting Periods

Prepare multiple periods:

- FY2024
- FY2025
- FY2026
- FY2027

Create five-year financial series where required by later trends.

Each period-specific record must reference a valid period.

---

# 7. Scenario Narratives

Each SOE must tell a coherent story.

Example distressed SOE:

```text
Revenue: declining
Losses: 3 years
Debt: increasing
Subsidy: increasing
Capacity utilization: declining
Audit exposure: moderate
```

Example governance-risk SOE:

```text
Financial status: stable
Board vacancies: 2
Directors expiring: 3
Compliance: overdue
Audit exposure: low
```

---

# 8. Deterministic Data

Use fixed fixtures or seeded generation.

Requirements:

- stable IDs
- stable screenshots
- reproducible demos
- controlled dates

Do not randomize values on every refresh.

---

# 9. Data Volume

Maintain small, medium and larger fixtures.

Support:

- around 10 representative SOEs
- hundreds of assets
- enough employee rows to test high-volume tables
- dozens of audit/legal records
- multiple periods

Keep browser performance practical.

---

# 10. Mock Service Interfaces

Create domain services such as:

```text
OrganizationService
AssetService
WorkforceService
BoardService
FinanceService
LoanService
GrantService
AuditService
LitigationService
ComplianceService
PrivatizationService
SubmissionService
DocumentService
TaskService
NotificationService
```

Representative methods:

```text
getOrganizations()
getOrganization(id)
getAssets(filters)
getAsset(id)
createAsset(payload)
updateAsset(id, payload)
getFinancials(organizationId, periodId)
saveFinancialDraft(payload)
submitReportingPeriod(id)
certifySubmission(id)
requestClarification(id, payload)
approveSubmission(id)
```

---

# 11. Latency and Error Simulation

Support configurable:

- normal latency
- slow latency
- query failure
- save failure
- validation failure
- permission failure
- empty result

These support loading/error-state QA.

---

# 12. Mutation and Persistence

Use:

- query cache/in-memory state
- optional browser-storage adapter
- reset-to-seed function

Provide a **Reset Demo Data** control.

---

# 13. Derived Data

Calculate rather than hardcode where practical:

- completion %
- Board vacancies
- total asset values
- market/book variance
- capacity utilization
- loan due count
- overdue compliance count
- warning count

This allows mock mutations to propagate consistently.

---

# 14. Integrity Rules

Examples:

- percentages bounded
- parent relationships valid
- asset values non-negative
- appointment before expiry
- utilization bounded
- reporting records reference valid periods
- linked documents reference valid records

---

# 15. Formatting Standards

Store raw values. Format in UI utilities for:

- PKR
- percentages
- dates
- fiscal years
- land units
- energy units
- carbon units

---

# 16. Geospatial Fixtures

Provide valid coordinates for:

- head offices
- factories
- land parcels
- warehouses

Use sample polygons for selected land assets.

Province/district metadata must match coordinates.

---

# 17. Document Metadata

Since real storage is out of scope, represent document metadata:

```ts
interface MockDocument {
  id: string;
  title: string;
  category: string;
  fileName: string;
  recordType: string;
  recordId: string;
  uploadedAt: string;
  uploadedBy: string;
  version: number;
  status: string;
}
```

Use local placeholder files only where useful for preview.

---

# 18. Workflow Fixtures

Provide submissions in:

- Draft
- In Progress
- Ready for Certification
- Certified
- Submitted
- Under Review
- Clarification Requested
- Returned
- Resubmitted
- Approved
- Locked

---

# 19. Task and Alert Fixtures

Examples:

- Board expires in 30 days
- loan repayment overdue
- submission due
- audit para unresolved
- clarification pending
- compliance overdue
- valuation missing

Every task/alert should link to its underlying record.

---

# 20. Developer Utilities

Provide:

- reset demo data
- select scenario
- set latency
- trigger error
- switch period
- switch organization

Keep clearly marked as developer/demo controls.

---

# 21. QA

Validate:

- referential integrity
- totals vs details
- warning dates
- risk scenarios
- reporting completion
- cross-portal mutations
- reset behavior
- period comparison

---

# 22. Deliverables

1. domain fixture model
2. scenario catalogue
3. deterministic fixture library
4. relational IDs
5. period datasets
6. mock service interfaces/implementations
7. mutation behavior
8. persistence adapter
9. reset utility
10. error/latency controls
11. GIS fixtures
12. document metadata
13. workflow/task/alert fixtures
14. integrity tests

---

# 23. Exit Gate

Phase 4 is complete when:

- every major future domain has representative dummy data
- all data is consumed through mock services
- relationships are valid
- scenarios produce different outcomes
- mutations update the prototype
- data can be reset
- period comparisons work
- data is reliable for stakeholder demos

## **Dummy Data and Mock Service Layer — Approved for End-to-End Workflow Development**
