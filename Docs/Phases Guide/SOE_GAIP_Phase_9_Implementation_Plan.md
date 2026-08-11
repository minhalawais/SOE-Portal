# SOE-GAIP Frontend Development
## Phase 9 Implementation Plan — People, HR and Governance Modules

**Project:** State-Owned Enterprises Governance, Asset & Performance Intelligence Platform (SOE-GAIP)  
**Development Stage:** Frontend-only stakeholder validation prototype  
**Data Source:** Realistic dummy data through mock services  
**Backend / Database:** Out of scope  
**External Government API Integrations:** Future phase  
**Implementation Principle:** Build the intended production operating model in the frontend without creating backend dependencies.

---

# 1. Phase Objective

Phase 9 develops workforce, Board governance, executive management and governance-calendar experiences.

Stakeholders should be able to understand:

- workforce structure
- sanctioned vs filled posts
- vacancies
- employment categories
- consultants and daily wagers
- Board composition
- Board vacancies
- director expiries
- committee structure
- executive leadership
- remuneration/perks
- governance obligations

Operational HR and governance oversight should remain conceptually distinct.

---

# 2. Domain Structure

```text
People & Governance
├── Workforce
├── Board Governance
├── Executive Management
└── Governance Calendar
```

---

# 3. Workforce Overview

Show:

- sanctioned posts
- filled posts
- vacant posts
- vacancy rate
- regular employees
- contract staff
- daily wagers
- consultants
- interns
- deputation
- gender distribution
- disability data where represented
- province/posting distribution

Summary cards should drill into the registry.

---

# 4. Sanctioned Posts

Registry columns:

- post title
- BPS / scale
- sanctioned count
- filled count
- vacant count
- department/function
- criticality where used in dummy data

This is essential because “vacancy” should be understood structurally.

---

# 5. Employee Registry

Representative columns:

- Employee ID
- Name
- Designation
- BPS / Pay Scale
- Employment Type
- Posting
- Reporting Officer
- Joining Date
- Retirement Date
- Gender
- Performance Rating
- Asset Declaration Status

Sensitive information should be restricted even though data is dummy.

---

# 6. Employee Detail

Sections:

- identity
- employment
- posting
- compensation summary
- qualification
- performance
- training
- disciplinary cases
- asset declaration

Role permissions control sensitive sections.

---

# 7. Daily Wagers

Show:

- number
- duration
- rate
- funding source

Do not force this into the same detailed schema as regular employees if the concept treats it separately.

---

# 8. Consultants

Show:

- name
- contract period
- monthly remuneration
- project
- TORs
- funding source
- deliverables
- completion status

Filter by active/completed/expiring.

---

# 9. Board Governance Overview

Show:

- Board size
- active members
- vacancies
- women directors
- independent directors
- government directors
- private directors
- upcoming expiries
- committee coverage
- declaration status
- Board status

Use exception-focused presentation.

---

# 10. Board Member Registry

Columns:

- Name
- Role
- Director Type
- Appointment Date
- Expiry Date
- Days Remaining
- Attendance
- Committees
- Declaration Status
- Status

Do not show full CNIC in normal list view.

---

# 11. Board Member Detail

Sections:

- profile
- appointment
- director classification
- qualification
- committees
- attendance
- conflict-of-interest declaration
- asset declaration
- remuneration
- sitting fees
- travel expenses
- evidence placeholders
- history

---

# 12. Board Expiry Logic

Implement:

- 180-day warning
- 90-day warning
- 30-day warning
- expired
- vacancy

These are directly aligned with the concept and should be demonstrable.

---

# 13. Board Committees

Support:

- Audit Committee
- HR Committee
- Risk Committee
- Procurement Committee

Show:

- chair
- members
- status
- vacancies

Do not infer statutory composition rules without stakeholder input.

---

# 14. Executive Management

Registry/detail for:

- CEO
- MD
- GM
- Directors

Representative information:

- appointment
- salary
- bonuses
- perks
- official residence
- vehicles
- foreign visits
- performance KPIs

Treat remuneration as sensitive.

---

# 15. Governance Calendar

Consolidate:

- Board expiries
- Board vacancies
- committee requirements
- declaration due dates
- pending appointments
- governance deadlines

Views:

- calendar
- upcoming
- overdue

Allow direct navigation to the related record.

---

# 16. Governance and Workforce Analytics

Workforce questions:

- Where are vacancies concentrated?
- What is the sanctioned/filled gap?
- What categories dominate?

Governance questions:

- Which positions are vacant?
- Which appointments expire soon?
- Which declarations are missing?

Avoid generic chart grids.

---

# 17. Role-Aware Access

HR Officer:

- workforce edit

Company Secretary:

- Board/governance edit

CEO/Focal Person:

- review

MoIP:

- oversight

Secretary/Minister:

- aggregate governance intelligence

Sensitive detail visibility should be narrower than aggregate visibility.

---

# 18. Dummy Data

Create:

- fully staffed SOE
- high-vacancy SOE
- Board with vacancies
- expiry within 30 days
- expiry within 90 days
- expired director
- missing declaration
- consultant nearing end date
- high daily-wager scenario
- executive KPI scenario

Use fictional personal data only.

---

# 19. Validation

Examples:

- filled posts generally not above sanctioned without explanation
- appointment before expiry
- retirement after joining
- controlled employment types
- committee member references active Board member
- remuneration numeric
- missing declaration creates warning

---

# 20. Privacy Rules

Model intended privacy:

- mask CNIC in normal views
- restrict salary detail
- do not surface disciplinary records in executive dashboards
- aggregate sensitive workforce data
- label demo data as fictional

---

# 21. QA

Test:

- vacancy calculations
- expiry warnings
- Board filtering
- role restrictions
- sensitive-field visibility
- committees
- calendar links
- no-Board scenario
- no-consultant scenario
- large employee registry

---

# 22. Stakeholder Validation Questions

- Are workforce categories correct?
- Is employee-level data truly required in initial scope?
- Which fields should senior users see?
- Are Board types correct?
- Are expiry thresholds correct?
- Which declarations are mandatory?
- Are committee types complete?
- Which executive benefits should be tracked?
- Is governance calendar useful?

---

# 23. Deliverables

1. Workforce Overview
2. sanctioned-post registry
3. employee registry/detail
4. daily-wager view
5. consultant view
6. Board Governance Overview
7. Board Member Registry/detail
8. committee view
9. expiry logic
10. Executive Management
11. Governance Calendar
12. privacy states
13. validation schemas
14. realistic fixtures

---

# 24. Exit Gate

Phase 9 is complete when:

- workforce structure is understandable
- vacancy calculations work
- Board composition is clear
- expiry warnings work
- committees are represented
- executive oversight is represented
- sensitive data respects role rules
- governance calendar is actionable
- terminology is approved

## **People, HR and Governance Modules — Approved**
