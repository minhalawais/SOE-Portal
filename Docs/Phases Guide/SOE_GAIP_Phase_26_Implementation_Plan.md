# SOE-GAIP Frontend Development
## Phase 26 Implementation Plan — Backend Readiness and Frontend Handover

**Project:** State-Owned Enterprises Governance, Asset & Performance Intelligence Platform (SOE-GAIP)  
**Development Stage:** Frontend-only stakeholder validation prototype  
**Data Source:** Realistic dummy data through mock services  
**Backend / Database:** Out of scope  
**External Government API Integrations:** Future phase  
**Implementation Principle:** Build the intended production operating model in the frontend without creating backend dependencies.

---

# 1. Phase Objective

Phase 26 converts the approved frontend into an implementation-ready contract for backend, database, authentication, file storage, workflow services and later production infrastructure.

The key requirement is:

> The frontend should be able to transition from mock services to real APIs without redesigning the application.

---

# 2. Handover Package

Prepare:

- screen-to-API mapping
- data contracts
- domain entity catalogue
- workflow definitions
- permission matrix
- validation matrix
- KPI dictionary
- dummy-to-backend mapping
- error contract expectations
- file/document requirements
- reporting requirements
- integration-ready identifiers
- frontend service interfaces

---

# 3. Screen-to-API Mapping

For every approved screen list:

- Screen ID
- route
- data required
- read operation
- mutation operation
- filter/query requirements
- pagination requirement
- role requirement
- response states

Example:

```text
Asset List
GET /assets
```

```text
Asset Create
POST /assets
```

Do not finalize endpoint naming as a frontend-only decision if backend architecture uses a different standard. Treat these as contract requirements, not rigid implementation mandates.

---

# 4. Service Interface Mapping

Map existing mock services to future production services.

Example:

```text
MockAssetService
↓ replace with
ApiAssetService
```

Maintain the same domain-facing interface where practical.

---

# 5. Data Contracts

Use TypeScript models as initial reference but produce explicit API contract definitions.

Example entity:

```ts
interface Asset {
  id: string;
  organizationId: string;
  assetType: string;
  bookValue: number;
  marketValue: number;
  utilizationStatus: string;
  litigationStatus: string;
}
```

For every contract define:

- required fields
- optional fields
- enums
- nullability
- nested objects
- pagination
- timestamps
- IDs
- version field where applicable

---

# 6. Domain Entity Catalogue

Document all major backend entities:

- Organization
- Organization Relationship
- Reporting Period
- Submission
- Certification
- Review
- Clarification
- Asset
- Asset Valuation
- Employee
- Sanctioned Post
- Board Member
- Executive
- Financial Record
- Loan
- Guarantee
- Grant
- Procurement
- Contract
- Audit
- Audit Para
- PAC Observation
- Litigation
- Compliance Requirement
- Privatization Case
- Document
- Task
- Alert
- Timeline Event

This catalogue should map to frontend types and approved screens.

---

# 7. Workflow Definitions

For every workflow provide:

- state
- transition
- actor
- permission
- precondition
- resulting action
- notification
- history event
- lock behavior
- version behavior

Example:

```text
SUBMITTED
→ UNDER_REVIEW
Actor: MoIP Reviewer/System Assignment
```

---

# 8. Permission Matrix

Finalize:

**Role → Action → Scope**

Backend handover should distinguish:

- UI visibility
- API authorization
- data scope
- sensitive-field access

Frontend hiding is not a security control. Backend must enforce authorization independently.

---

# 9. Validation Matrix

Define:

**Field → Rule → Error Message → Blocking/Warning → Source**

Examples:

- required
- numeric range
- cross-field consistency
- evidence requirement
- date logic
- workflow precondition

The backend should become authoritative for production validation while frontend retains user-friendly pre-validation.

---

# 10. KPI Dictionary

For each KPI define:

- Metric ID
- label
- business definition
- source entity/fields
- calculation
- period
- unit
- aggregation
- null behavior
- threshold/risk link
- owner
- methodology status

This prevents frontend/backend calculation drift.

---

# 11. Dummy Data Mapping

Create:

| Dummy Entity | Frontend Type | Future Backend Entity | Notes |
|---|---|---|---|

Map every major fixture family.

Mark:

- prototype-only fields
- fields requiring stakeholder confirmation
- derived values
- future external reference IDs

---

# 12. Error Contract

Define frontend expectations for production API errors:

- validation error
- unauthorized
- forbidden
- not found
- conflict/version issue
- server error
- upload error
- workflow transition error

Frontend should map these into existing error components.

---

# 13. Pagination / Filtering Contract

For large datasets define needs for:

- server-side pagination
- sorting
- filtering
- search
- field selection where needed

Large registries such as employees/assets should not depend on loading all records in production.

---

# 14. Concurrency / Versioning Requirement

Identify screens requiring optimistic-lock/version checks later:

- submissions
- asset records
- financial records
- compliance records
- Board records

Frontend should be prepared to show conflict messages if backend rejects stale updates.

---

# 15. Document/File Handover Requirements

Define:

- file categories
- linked-record model
- metadata
- versioning
- upload size/type requirements later
- preview requirements
- access control
- checksum/virus scan requirements as future backend/security concerns

Do not implement these production controls in the frontend phase.

---

# 16. Authentication Handover

Replace Demo Role Simulator later with real identity context.

Document:

- required user attributes
- role
- organization scope
- Ministry scope
- permission claims
- session behavior

Keep demo role switching available only in non-production environments.

---

# 17. Reporting Handover

For each approved report define:

- data sources
- filters
- aggregation
- approved-only data rule
- output format
- role access
- generation mode later

---

# 18. GIS Handover

Define:

- geometry types
- coordinate system
- point vs polygon
- required spatial queries
- filters
- non-mapped asset behavior

Backend/PostGIS decisions come later but frontend requirements must be explicit.

---

# 19. Search Handover

Define structured search requirements:

- searchable entities
- filters
- operators
- role restrictions
- pagination
- saved query support

Do not mandate a specific search engine unless architecture phase decides it.

---

# 20. Risk / Scorecard Handover

Separate:

- approved methodology
- prototype-only methodology

Do not backend-implement provisional scoring without stakeholder approval.

---

# 21. Integration-Ready Fields

Although external government APIs are not part of initial backend development, identify fields that may later support external references:

- SECP registration/reference
- NTN/STRN
- PPRA reference
- land-record reference
- audit reference
- other authoritative-system IDs

This avoids future schema redesign.

---

# 22. Backend Acceptance Criteria

The future backend should be able to:

- provide the same data contracts
- enforce role/permission rules
- enforce workflow states
- support versions/history
- store evidence metadata/files
- provide approved data for dashboards
- support pagination/filtering
- support reporting periods
- preserve auditability

---

# 23. Migration from Mock to API

Recommended sequence:

```text
1. Implement backend endpoint
2. Add ApiService implementation
3. Feature-flag service adapter
4. Compare mock vs API contract
5. Run existing frontend tests
6. Validate workflow
7. Remove mock dependency for that module
```

Migrate module by module.

---

# 24. Handover Review

Conduct joint review with:

- frontend team
- backend team
- product owner
- data/database lead
- security/architecture lead where applicable

Resolve contract ambiguity before backend implementation begins.

---

# 25. Deliverables

1. Screen-to-API Mapping
2. Frontend Service Contract Catalogue
3. Data Contract Catalogue
4. Domain Entity Catalogue
5. Workflow Specification
6. Role/Permission Matrix
7. Validation Matrix
8. KPI Dictionary
9. Dummy-to-Backend Mapping
10. Error Contract
11. Pagination/Filtering Requirements
12. Versioning/Concurrency Requirements
13. Document/File Requirements
14. Authentication Context Requirements
15. Report Data Requirements
16. GIS Requirements
17. Search Requirements
18. Risk/Scorecard Methodology Register
19. Integration-Ready Field Register
20. Mock-to-API Migration Plan

---

# 26. Exit Gate

Phase 26 is complete when:

- every approved screen has backend data requirements
- every mock service maps to a future API/service responsibility
- data contracts are explicit
- workflow/permission/validation rules are documented
- KPI/report definitions are traceable
- provisional methodology is clearly separated from approved methodology
- backend engineers can begin implementation without redesigning frontend behavior
- future external integrations remain a separate phase

## **Frontend Handover — Approved for Backend and Database Development**
