# SOE-GAIP Frontend Development
## Phase 20 Implementation Plan — Advanced Search and Intelligence Query

**Project:** State-Owned Enterprises Governance, Asset & Performance Intelligence Platform (SOE-GAIP)  
**Development Stage:** Frontend-only stakeholder validation prototype  
**Data Source:** Realistic dummy data through mock services  
**Backend / Database:** Out of scope  
**External Government API Integrations:** Future phase  
**Implementation Principle:** Build the intended production operating model in the frontend without creating backend dependencies.

---

# 1. Phase Objective

Phase 20 builds structured advanced search and cross-system intelligence query capabilities.

The roadmap explicitly calls for a filter-driven interface. Natural-language AI search is a future enhancement.

The objective is to let users answer complex questions without manually opening multiple modules.

---

# 2. Search Scope

Search across approved dummy domains:

- SOEs
- Assets
- Board Members
- Financial Performance
- Loans
- Procurement
- Audit Paras
- Litigation
- Compliance
- Privatization
- Documents

---

# 3. Search Modes

## Global Search

Simple text search for:

- SOE name
- Asset ID/name
- Case number
- Audit Para ID
- document title

## Intelligence Query Builder

Structured filters for cross-domain questions.

---

# 4. Query Examples

Support at least these roadmap examples:

- SOEs with losses for three consecutive years
- encroached land in Punjab
- Board members expiring within 90 days
- audit paras above PKR 100 million
- SOEs with capacity utilization below 40%
- overdue loan repayments
- SOEs with missing annual reports
- land assets under litigation

---

# 5. Query Builder Architecture

Recommended UX:

```text
Entity / Dataset
↓
Conditions
↓
AND / OR
↓
Sort
↓
Result Columns
↓
Run Query
```

Example:

```text
Dataset: Land Assets
Province = Punjab
Current Use = Vacant
Area > 20 acres
Litigation = No
```

---

# 6. Filter Types

Support:

- text
- select
- multi-select
- numeric comparison
- date range
- status
- Boolean
- period
- organization
- sector
- province/district

---

# 7. Operators

At minimum:

- equals
- not equals
- contains
- greater than
- less than
- between
- in
- before
- after
- is empty
- is not empty

Do not expose operators irrelevant to a field type.

---

# 8. Result Table

Results should support:

- configurable columns
- sorting
- pagination
- drill-down
- result count
- active query summary
- export placeholder
- save-query placeholder

---

# 9. Saved Queries

Prototype useful saved queries:

- Board Expiry Watch
- High-Value Audit Paras
- Underutilized Assets
- Overdue Loan Repayments
- Non-Compliant SOEs
- Privatization Pipeline

Allow role-specific presets.

---

# 10. Query Context

Always show:

- reporting period
- dataset
- active filters
- result count

Avoid ambiguous cross-period results.

---

# 11. Permissions

Search must respect role scope.

Examples:

SOE User:
- only own SOE data

MoIP:
- authorized SOE portfolio

Secretary/Minister:
- aggregated/approved data

PMO:
- strategic approved scope

Search must not become a bypass around frontend permissions.

---

# 12. Sensitive Fields

Do not expose restricted fields such as:

- full CNIC
- detailed salary
- disciplinary information

in global search unless the role is explicitly authorized.

---

# 13. Search Index Simulation

Because no backend search engine exists:

- build frontend indexing/filter logic over dummy data
- keep query API behind a `SearchService` abstraction
- return standardized result types

Future backend can replace with dedicated search/API implementation.

---

# 14. Performance

For large fixture sets:

- debounce text search
- memoize/filter efficiently
- paginate results
- avoid scanning unrelated data repeatedly in render loops

---

# 15. Empty / No-Match State

Show:

- no results
- active criteria
- suggestion to clear/adjust filters

Do not display generic errors for valid zero-result queries.

---

# 16. Search Result Drill-Down

Each result should link to the correct portal/detail context:

- asset → asset detail
- audit para → audit para detail
- Board member → Board detail
- SOE → enterprise profile

---

# 17. Dummy Data Requirements

Ensure query examples produce:

- multiple results
- zero-result scenarios
- boundary values
- cross-period differences
- restricted records

---

# 18. QA

Test:

- all filter types/operators
- AND/OR combinations
- period scope
- role scope
- saved queries
- no results
- large results
- drill-down
- sensitive-field restrictions
- reset filters

---

# 19. Stakeholder Validation Questions

- Which queries are most valuable?
- Should users be allowed to build complex AND/OR conditions?
- Which datasets should be searchable together?
- Which fields are too sensitive?
- Which saved searches should be standard?
- Is export needed from the query interface?
- Should query sharing be supported later?

---

# 20. Deliverables

1. Global Search
2. Intelligence Query Builder
3. field-aware operators
4. active-filter summary
5. result table
6. saved query presets
7. SearchService abstraction
8. role-aware search
9. sensitive-field controls
10. drill-down routing
11. performance safeguards
12. query fixtures/tests

---

# 21. Exit Gate

Phase 20 is complete when:

- roadmap queries can be answered without manual module browsing
- permissions are respected
- structured filters are understandable
- result drill-down works
- zero-result behavior is clear
- stakeholders validate core query use cases

## **Advanced Search and Intelligence Query — Approved**
