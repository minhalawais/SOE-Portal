# SOE-GAIP Frontend Product Blueprint

| Item | Detail |
|---|---|
| **Document Code** | SOE-GAIP-FPB-001 |
| **Version** | 1.0 |
| **Status** | Draft for Stakeholder Validation — Phase 0 Complete |
| **Product** | State-Owned Enterprises Governance, Asset & Performance Intelligence Platform (SOE-GAIP) |
| **Owner** | Ministry of Industries and Production (MoIP), Government of Pakistan |
| **Stage** | Frontend-only stakeholder validation prototype with dummy data |
| **Prepared from** | Phase 0 Implementation Plan, Frontend Roadmap, FRS, SAD, DRRF, Client Brief, Concept Note |
| **Design law** | `Docs/Designing Guide/SOE-GAIP-DESIGN-SYSTEM.md` + `Docs/Designing Guide/FOS-UI-UX-INSTRUCTIONS.md` |

> **Phase 0 Exit Marker**  
> This blueprint is the authoritative frontend product definition for technical foundation (Phase 1). No deep business-module UI should proceed until this document is stakeholder-accepted.

---

# 1. Purpose and Governing Principles

## 1.1 Purpose

This blueprint locks:

- product boundary
- portals and roles
- domain/module architecture
- navigation
- workflows and statuses
- screen inventory and archetypes
- dummy-data scenarios and relationships
- reporting-period model
- validation and decision registers

## 1.2 Governing Principles

1. **Prototype the operating model**, not only visuals.
2. **Role-specific experiences** — do not mix SOE, MoIP, Secretary, Minister, PMO psychologies.
3. **Governance before intelligence** — Data → Validation → Evidence → Certification → Review → Approval → Intelligence.
4. **No backend dependency** in this stage — simulate auth, storage, Excel, APIs, signatures, messaging.
5. **Consequence continuity** — actions in one portal must update related queues, statuses, KPIs and alerts in the prototype.
6. **North-star** — every material executive insight must be traceable to approved record, reporting period, SOE, official, evidence and immutable history.

---

# 2. Scope / Out-of-Scope Register

## 2.1 In Scope (Frontend Prototype)

| ID | Capability | Notes |
|---|---|---|
| IN-01 | Complete portal navigation | All six portals; Assurance limited |
| IN-02 | Complete module architecture | Ten functional domains |
| IN-03 | Representative forms, tables, record details | Via screen archetypes |
| IN-04 | Dashboards and executive intelligence | Role-specific |
| IN-05 | Reports and report previews | Mock export only |
| IN-06 | Documents / evidence UX | Simulated upload/versioning |
| IN-07 | GIS / National Industrial Asset Map | Dummy geospatial fixtures |
| IN-08 | Submission, certification, review, clarification, approval, lock | Dummy workflow engine |
| IN-09 | Tasks, notifications, alerts, escalations | Rule-simulated |
| IN-10 | Risk indicators, scorecards, benchmarking | Prototype methodology labeled |
| IN-11 | Historical / version / timeline views | Simulated snapshots |
| IN-12 | Permissions and demo role switching | Frontend RBAC + org/period scope |
| IN-13 | Realistic dummy data and mock services | Scenario-driven |
| IN-14 | Responsive and accessibility baseline | Per design system |

## 2.2 Out of Scope (Must Remain Simulated or Deferred)

| ID | Capability | Representation |
|---|---|---|
| OUT-01 | Production database | None — fixtures only |
| OUT-02 | Backend services / real APIs | Mock service interfaces only |
| OUT-03 | Production authentication / SSO | Demo role simulator |
| OUT-04 | Real digital signatures | Certification confirmation UX only |
| OUT-05 | Permanent / durable storage | In-memory or local demo state |
| OUT-06 | Real document/object storage | Metadata + mock preview |
| OUT-07 | Actual Excel ingestion | Template + staging UX simulation |
| OUT-08 | Real email / SMS | In-app notification centre only |
| OUT-09 | External government API integrations | Store reference fields only |
| OUT-10 | Production AI writing official records | Not built; anomaly UI only if explicitly tasked later |
| OUT-11 | Server-side analytics / warehouse | Frontend derived metrics from fixtures |
| OUT-12 | Public disclosure portal | Deferred unless separately approved |

**Rule:** Any UI that looks like OUT-* capabilities must be labeled or understood as **simulated**.

---

# 3. Portal Architecture

| Portal ID | Name | Primary Question | Character |
|---|---|---|---|
| A | SOE Management & Submission Portal | What do I need to complete, certify or submit? | Task / completion |
| B | MoIP Oversight & Review Portal | Which SOEs or submissions require review, clarification or intervention? | Review / compare / approve |
| C | Secretary Command Centre | What requires my attention or administrative intervention? | Exception-first |
| D | Minister Strategic Intelligence Portal | What are major performance issues, risks and strategic opportunities? | Strategic + drill-down |
| E | PMO / Strategic Government View | What is the national fiscal, industrial and strategic picture? | National summary |
| F | Authorized Assurance / Institutional View | What approved evidence and history can I inspect within authorized scope? | Read-only / limited in Phase 0–early phases |

### Portal A users
SOE Focal Person, Finance Officer, HR Officer, Asset/Property Officer, Company Secretary, Legal Officer, Procurement Officer, Internal Audit, CEO, CFO

### Portal B users
MoIP Wing Users, Reviewers, Analysts, Section Officers, Deputy Secretaries, Joint Secretaries

### Portal C–E users
Secretary / Senior Administration; Minister / Senior Leadership; PMO / Strategic Government Users

### Portal F users (provisional)
Authorized audit / PAC / institutional users — **limited shell until access requirements confirmed**  
**Provisional decision PD-001:** Portal F ships as feature-flagged minimal read-only shell.

---

# 4. Functional Domain and Module Map

| Domain | Modules |
|---|---|
| **1. Enterprise & Ownership** | SOE Master Registry; Enterprise Profile; Corporate Structure; Ownership; Subsidiaries; Associates; Joint Ventures; Locations/Contacts |
| **2. Assets & Property** | Asset Registry; Land; Buildings; Machinery; Vehicles; Other Equipment; GIS; Utilization; Valuation; Encroachment; Litigation link |
| **3. People & Governance** | HR/Workforce; Sanctioned Posts; Consultants/Daily Wagers; Board Governance; Committees; Executive Management; Governance Calendar |
| **4. Financial & Fiscal** | Financial Performance; Budget; Ratios; Loans; Debt; Guarantees; Grants; Subsidies; Government Support |
| **5. Accountability & Compliance** | Procurement; Contracts; Audit; Audit Paras; PAC; Recovery; Litigation; Compliance Register |
| **6. Industrial & Strategic Performance** | Production; Capacity; Utilization; Exports/Imports; Domestic Sales; Employment Contribution; Energy; Carbon |
| **7. Privatization & Transformation** | Privatization Pipeline; Advisor/Valuation/DD; EOI; Bidding; Transaction; Post-Sale; Restructuring |
| **8. Evidence & Documents** | Document Repository; Evidence; Record Attachments; Version History; Enterprise Timeline |
| **9. Reporting & Governance Workflow** | Reporting Periods; Submission Management; Certification; Review; Clarifications; Approvals; Tasks; Notifications; Escalations |
| **10. Intelligence & Decision Support** | Executive Dashboards; KPIs; Scorecards; Risk; Early Warning; Benchmarking; Advanced Search; Reports; GIS Intelligence |

---

# 5. Role Matrix and Permission Baseline

| Role | Primary Scope | Typical Capability | Primary Portal |
|---|---|---|---|
| SOE Focal Person | Own SOE | Coordinate submission, completeness, response to clarifications | A |
| Finance Officer | Own SOE | Edit financial / fiscal domain data | A |
| HR Officer | Own SOE | Edit workforce data | A |
| Asset Officer | Own SOE | Edit asset/property data | A |
| Company Secretary | Own SOE | Board / governance data | A |
| Legal Officer | Own SOE | Litigation records | A |
| Procurement Officer | Own SOE | Procurement records | A |
| Internal Audit | Own SOE | Audit para / response data | A |
| CEO | Own SOE | Review and certify (as configured) | A |
| CFO | Own SOE | Review and certify financial information | A |
| MoIP Reviewer | Assigned SOEs | Review, clarify, return, approve within authority | B |
| MoIP Analyst | Assigned / portfolio | Analyze approved data; limited write | B |
| MoIP Supervisory Officer | Portfolio | Workload, escalations, overdue monitoring | B |
| Secretary | Ministry portfolio | Operational exception oversight | C |
| Minister | Ministry portfolio | Strategic intelligence | D |
| PMO | Authorized portfolio | National strategic intelligence | E |
| Assurance User | Authorized scope | Read approved information / evidence | F |
| System Administrator | Platform | Users, roles, master data, cycles, rules (demo) | Admin surfaces |

### Permission baseline (Phase 0)

Access = **Role + Organization scope + Reporting-period context + Field sensitivity**

| Capability class | SOE ops | Certifier | MoIP reviewer | Secretary | Minister/PMO | Assurance |
|---|---|---|---|---|---|---|
| Edit own SOE draft data | Yes (assigned domain) | Limited | No | No | No | No |
| Certify submission | No | Yes | No | No | No | No |
| Submit to MoIP | Focal / authorized | As configured | No | No | No | No |
| Review / clarify / approve | No | No | Yes | No* | No | No |
| View executive intelligence | Limited own SOE | Own SOE summary | Portfolio | Yes | Yes | Authorized only |
| View CNIC / salary / discipline | Restricted | Restricted | Restricted | No | No | Case-authorized only |
| Cross-SOE browse | No | No | Assigned portfolio | Portfolio | Portfolio/national | Authorized |

\*Secretary may escalate/require action views; formal Approve remains MoIP workflow unless stakeholder later decides otherwise. **Provisional: PD-002**.

Field-level permission detail is deferred to Phase 1/26 matrices; this baseline is binding for navigation and action visibility.

---

# 6. User Psychology Matrix

| User | Psychology | Frontend prioritizes |
|---|---|---|
| SOE Operational User | Complete assigned information correctly and quickly | Tasks, progress, incomplete records, validation errors, deadlines |
| CEO / CFO | Understand exactly what is being certified | Certification summary, unresolved issues, material changes, completeness, certify action |
| MoIP Reviewer | Know whether submission is trustworthy | Comparison, anomalies, evidence, prior periods, clarification, approval |
| Secretary | Show what requires action | Exceptions, overdue, critical risk, escalations, pending decisions |
| Minister | Show what matters and why | Portfolio health, strategic risk, fiscal exposure, opportunities, drill-down |
| PMO | Show national strategic impact | Aggregates, government capital, fiscal burden, industrial contribution, asset potential |

---

# 7. Navigation Maps

## 7.1 Portal A — SOE

```text
Dashboard
Reporting Workspace
Enterprise
  ├─ Profile
  └─ Ownership / Structure
Assets
  ├─ Asset Registry
  ├─ Land
  ├─ Buildings
  ├─ Machinery
  └─ Vehicles
People & Governance
  ├─ Workforce
  ├─ Board
  └─ Executives
Financial & Fiscal
Accountability
  ├─ Procurement
  ├─ Audit
  ├─ Litigation
  └─ Compliance
Industrial Performance
Privatization
Documents
Tasks & Notifications
```

## 7.2 Portal B — MoIP

```text
Oversight Dashboard
SOE Portfolio
Submission Queue
Reviewer Workspace
Clarifications
Data Quality
Escalations
SOE Detail (read/review)
Tasks & Notifications
Reports
```

## 7.3 Portal C — Secretary

```text
Command Centre Home
Critical Matters
Pending Decisions
Upcoming Obligations
Delayed Compliance
Financial Concerns
Board Governance
Audit Exposure
Major Litigation
Submission Compliance
Escalation Queue
```

## 7.4 Portal D — Minister

```text
Executive Overview
Portfolio Performance
Fiscal Exposure
Asset Intelligence
Governance Risk
Audit & Legal Risk
Industrial Performance
Privatization
Strategic Opportunities
Executive Reports
```

## 7.5 Portal E — PMO

```text
National Overview
Government Capital
Market vs Book Value
Fiscal Burden
Contingent Liabilities
Land Bank
Employment / Industrial Contribution
Export Contribution
Privatization Potential
```

## 7.6 Portal F — Assurance (limited)

```text
Authorized Overview
Approved Records Search
Evidence / Timeline
Audit & PAC Views (authorized)
```

## 7.7 Cross-cutting chrome

- Organization selector (scoped by role)
- Reporting period selector
- Demo Role Simulator
- Notifications
- Simulated mode indicator

---

# 8. Workflow Catalogue

## 8.1 Reporting Submission

```text
Draft → In Progress → Ready for Review → Ready for Certification
→ Certified → Submitted → Under Review → Approved → Locked
```

Branches: Clarification Requested; Returned; Resubmitted (returns to Under Review).

## 8.2 Clarification

```text
Under Review → Clarification Requested → SOE Response → Resubmitted → Under Review
```

Record-level clarification preferred; unrelated approved sections stay intact.

## 8.3 Record Return

```text
Submitted / Under Review → Returned → Correction → Resubmission
```

## 8.4 Certification

```text
Department Complete → Focal Person Review → CEO/CFO Review → Certification
```

Certification records identity, role, timestamp, statement version, submission version.

## 8.5 Governance Alert

```text
Upcoming Obligation → Attention → Critical → Escalated → Resolved
```

## 8.6 Import (simulated)

```text
Upload template → Parse to staging → Validate → Exception report
→ User confirmation → Authoritative fixtures (demo)
```

## 8.7 Golden pilot workflow (Phase 5 reference)

Financial Reporting is the first vertical slice proving the full chain including executive KPI update from approved data only.

---

# 9. Status Dictionary (Central — Do Not Invent Locally)

## 9.1 Submission Status

`Draft` · `In Progress` · `Ready for Review` · `Ready for Certification` · `Certified` · `Submitted` · `Under Review` · `Clarification Requested` · `Returned` · `Resubmitted` · `Approved` · `Locked`

## 9.2 Risk Status

`Low` · `Moderate` · `High` · `Critical`

## 9.3 Attention / Alert Severity

`Information` · `Attention` · `Critical`

## 9.4 Compliance Status

`Compliant` · `Partially Compliant` · `Non-Compliant` · `Not Applicable` · `Pending Verification`

## 9.5 Data Quality Status

`Complete` · `Incomplete` · `Validation Issue` · `Evidence Missing` · `Verified`

## 9.6 SOE Operational Status (master)

`Active` · `Dormant` · `Under Liquidation` · `Under Privatization` · `Merged` · `Closed`

## 9.7 Common record statuses (domain-controlled)

| Area | Baseline values |
|---|---|
| Audit para | Open · Under Response · Recovery Pending · Settled · Closed |
| Litigation | Active · Stayed · Decided · Appealed · Closed |
| Asset condition | Good · Fair · Poor · Idle · Scrap · Disposed |
| Evidence | Available · Missing · Pending Verification · Superseded |

**Phase 1 rule:** these become centralized TypeScript enums/constants. Screens must not invent synonyms.

---

# 10. Screen Archetype Catalogue

| Archetype | Purpose |
|---|---|
| Dashboard | State now + what needs action |
| List / Registry | Dense searchable operational truth |
| Record Detail | Single-record inspection |
| Create / Edit Form | Structured entry with validation |
| Multi-Step Submission | Genuine multi-step only |
| Review Screen | Compare, issues, evidence, decide |
| Certification Screen | Summary of what is being certified |
| Comparison Screen | Current vs previous vs revised |
| Evidence Viewer | Document/metadata linked to record |
| Timeline | Workflow / enterprise events |
| Map | GIS decision support |
| Executive Intelligence Screen | Concise strategic view + drill-down |
| Report Preview | Structure/filters/mock export |
| Task Centre | Actionable obligations |
| Alert Centre | Early warning / severity queues |
| Access Denied / Not Found | Permission and routing honesty |
| Placeholder / Not Enabled | Honest stub for not-yet-built modules |

---

# 11. Screen Inventory (Baseline Registry)

> Every future screen should originate here or be added via Product Decision Register.  
> **Screen Type** uses archetypes from §10.  
> **Key Action** is the primary user verb for that screen.

## 11.1 Shared / Shell

| ID | Portal | Domain | Module | Screen | Type | Role | Key Action |
|---|---|---|---|---|---|---|---|
| SCR-000 | Shared | Shell | Auth | Sign In (simulated) | Form | All | Sign in |
| SCR-001 | Shared | Shell | Demo | Role Simulator | Form | Dev/Demo | Switch role |
| SCR-002 | Shared | Shell | Context | Org / Period Context | Dashboard | All | Select scope |
| SCR-003 | Shared | Shell | System | Access Denied | Detail | All | Navigate away |
| SCR-004 | Shared | Shell | System | Not Found | Detail | All | Navigate away |

## 11.2 Portal A — SOE

| ID | Domain | Module | Screen | Type | Role | Key Action |
|---|---|---|---|---|---|---|
| SCR-A01 | Workflow | Dashboard | SOE Home Dashboard | Dashboard | Focal / ops | Act on tasks |
| SCR-A02 | Workflow | Reporting | Reporting Workspace | Dashboard | Focal | Open module |
| SCR-A03 | Workflow | Reporting | Module Progress Row Detail | Detail | Focal | Continue |
| SCR-A04 | Workflow | Validation | Validation Centre | List | Focal / ops | Fix issues |
| SCR-A05 | Workflow | Clarification | Clarification Inbox | List | Focal / ops | Respond |
| SCR-A06 | Workflow | Clarification | Clarification Detail | Review | Focal / ops | Submit response |
| SCR-A07 | Workflow | Certification | Certification Summary | Certification | CEO/CFO | Certify |
| SCR-A08 | Workflow | Submission | Submission Readiness | Review | Focal | Submit |
| SCR-A09 | Workflow | Submission | Submission Confirmation | Detail | Focal | Acknowledge |
| SCR-A10 | Workflow | History | Submission History | Timeline | Focal / certifier | Inspect |
| SCR-A11 | Enterprise | Profile | Enterprise Profile | Detail/Form | Focal / corp | Edit/view |
| SCR-A12 | Enterprise | Ownership | Ownership & Shareholding | Detail/Form | Corp | Edit/view |
| SCR-A13 | Enterprise | Structure | Subsidiaries / JV Hierarchy | Detail | Corp | Inspect |
| SCR-A14 | Enterprise | Locations | Locations & Contacts | List/Form | Corp | Maintain |
| SCR-A15 | Assets | Registry | Asset Registry | List | Asset | Filter/open |
| SCR-A16 | Assets | Registry | Asset Detail | Detail | Asset | Inspect |
| SCR-A17 | Assets | Registry | Create / Edit Asset | Multi-Step Form | Asset | Save |
| SCR-A18 | Assets | Land | Land Register | List | Asset | Filter/open |
| SCR-A19 | Assets | Buildings | Buildings Register | List | Asset | Filter/open |
| SCR-A20 | Assets | Machinery | Machinery Register | List | Asset | Filter/open |
| SCR-A21 | Assets | Vehicles | Vehicles Register | List | Asset | Filter/open |
| SCR-A22 | Assets | Import | Asset Bulk Import (simulated) | Form | Asset | Validate/import |
| SCR-A23 | Assets | GIS | SOE Asset Map (scoped) | Map | Asset | Locate |
| SCR-A24 | People | Workforce | Workforce Overview | Dashboard | HR | Inspect |
| SCR-A25 | People | Posts | Sanctioned Posts | List | HR | Maintain |
| SCR-A26 | People | Employees | Employee Registry | List | HR | Filter/open |
| SCR-A27 | People | Employees | Employee Detail | Detail | HR | Inspect |
| SCR-A28 | People | Contingent | Daily Wagers / Consultants | List | HR | Maintain |
| SCR-A29 | Governance | Board | Board Overview | Dashboard | CoSec | Inspect |
| SCR-A30 | Governance | Board | Board Members | List/Form | CoSec | Maintain |
| SCR-A31 | Governance | Board | Board Member Detail | Detail | CoSec | Inspect |
| SCR-A32 | Governance | Committees | Committees | List/Form | CoSec | Maintain |
| SCR-A33 | Governance | Executives | Executive Management | List/Detail | CoSec/HR | Maintain |
| SCR-A34 | Governance | Calendar | Governance Calendar | Timeline | CoSec | Act on due items |
| SCR-A35 | Financial | Performance | Financial Overview | Dashboard | Finance | Inspect |
| SCR-A36 | Financial | Performance | Enter / Edit Period Financials | Form | Finance | Save |
| SCR-A37 | Financial | Fiscal | Loans Register | List | Finance | Maintain |
| SCR-A38 | Financial | Fiscal | Loan Detail / Schedule | Detail | Finance | Inspect |
| SCR-A39 | Financial | Fiscal | Guarantees / Grants / Subsidies | List/Form | Finance | Maintain |
| SCR-A40 | Financial | Evidence | Financial Statements Evidence | Evidence | Finance | Attach |
| SCR-A41 | Accountability | Procurement | Procurement Register | List | Procurement | Maintain |
| SCR-A42 | Accountability | Audit | Audit Register | List | Internal Audit | Maintain |
| SCR-A43 | Accountability | Audit | Audit Para Detail | Detail/Form | Internal Audit | Update response |
| SCR-A44 | Accountability | Litigation | Litigation Register | List | Legal | Maintain |
| SCR-A45 | Accountability | Litigation | Case Detail | Detail/Form | Legal | Update |
| SCR-A46 | Accountability | Compliance | Compliance Matrix | List/Form | CoSec | Update status |
| SCR-A47 | Industrial | Performance | Industrial Overview | Dashboard | Operations | Inspect |
| SCR-A48 | Industrial | Performance | Production / Capacity Entry | Form | Operations | Save |
| SCR-A49 | Privatization | Pipeline | Privatization Case | Detail/Form | Focal | Update milestones |
| SCR-A50 | Documents | Repository | Document Repository | List | All SOE | Search/open |
| SCR-A51 | Documents | Evidence | Evidence Viewer | Evidence | All SOE | Inspect |
| SCR-A52 | Workflow | Tasks | Task Centre | Task Centre | All SOE | Complete task |
| SCR-A53 | Workflow | Alerts | Alert / Notification Centre | Alert Centre | All SOE | Acknowledge |

## 11.3 Portal B — MoIP

| ID | Domain | Module | Screen | Type | Role | Key Action |
|---|---|---|---|---|---|---|
| SCR-B01 | Intelligence | Oversight | MoIP Oversight Dashboard | Dashboard | Reviewer/Supervisor | Triage |
| SCR-B02 | Enterprise | Registry | SOE Portfolio / Master Registry | List | MoIP | Open SOE |
| SCR-B03 | Workflow | Queue | Submission Queue | List | Reviewer | Open review |
| SCR-B04 | Workflow | Review | Reviewer Workspace | Review | Reviewer | Review modules |
| SCR-B05 | Workflow | Review | Module Review Detail | Review | Reviewer | Clarify/Approve |
| SCR-B06 | Workflow | Compare | Submission Comparison | Comparison | Reviewer | Compare |
| SCR-B07 | Workflow | Clarification | Clarification Queue | List | Reviewer | Track |
| SCR-B08 | Workflow | Quality | Data Quality Exceptions | List | Reviewer/Analyst | Investigate |
| SCR-B09 | Workflow | Escalation | Escalations | List | Supervisor | Escalate |
| SCR-B10 | Workflow | Workload | Reviewer Workload | Dashboard | Supervisor | Assign/monitor |
| SCR-B11 | Enterprise | SOE Detail | MoIP SOE Detail (read/review) | Detail | MoIP | Inspect |
| SCR-B12 | Documents | Evidence | Evidence Review | Evidence | Reviewer | Verify |
| SCR-B13 | Intelligence | Reports | MoIP Reports | Report Preview | MoIP | Preview/export mock |
| SCR-B14 | Workflow | Tasks | MoIP Task Centre | Task Centre | MoIP | Act |

## 11.4 Portal C — Secretary

| ID | Domain | Module | Screen | Type | Role | Key Action |
|---|---|---|---|---|---|---|
| SCR-C01 | Intelligence | Command | Command Centre Home | Executive | Secretary | Prioritize |
| SCR-C02 | Intelligence | Exceptions | Critical Matters | List | Secretary | Drill down |
| SCR-C03 | Intelligence | Decisions | Pending Decisions | List | Secretary | Decide/route |
| SCR-C04 | Intelligence | Obligations | Upcoming Obligations | List | Secretary | Monitor |
| SCR-C05 | Accountability | Compliance | Delayed Compliance | List | Secretary | Escalate view |
| SCR-C06 | Financial | Concerns | Financial Concerns | List | Secretary | Drill down |
| SCR-C07 | Governance | Board | Board Governance Exceptions | List | Secretary | Drill down |
| SCR-C08 | Accountability | Audit | Audit Exposure | List | Secretary | Drill down |
| SCR-C09 | Accountability | Legal | Major Litigation | List | Secretary | Drill down |
| SCR-C10 | Workflow | Submissions | Submission Compliance | List | Secretary | Monitor |
| SCR-C11 | Workflow | Escalation | Escalation Queue | List | Secretary | Intervene |

## 11.5 Portal D — Minister

| ID | Domain | Module | Screen | Type | Role | Key Action |
|---|---|---|---|---|---|---|
| SCR-D01 | Intelligence | Overview | Executive Overview | Executive | Minister | Assess |
| SCR-D02 | Intelligence | Portfolio | Portfolio Performance | Executive | Minister | Compare |
| SCR-D03 | Financial | Fiscal | Fiscal Exposure | Executive | Minister | Inspect |
| SCR-D04 | Assets | Intelligence | Asset Intelligence | Executive | Minister | Opportunity view |
| SCR-D05 | Governance | Risk | Governance Risk | Executive | Minister | Inspect |
| SCR-D06 | Accountability | Risk | Audit & Legal Risk | Executive | Minister | Inspect |
| SCR-D07 | Industrial | Performance | Industrial Performance | Executive | Minister | Inspect |
| SCR-D08 | Privatization | Pipeline | Privatization | Executive | Minister | Monitor |
| SCR-D09 | Intelligence | Opportunities | Strategic Opportunities | Executive | Minister | Prioritize |
| SCR-D10 | Intelligence | Reports | Minister / Executive Brief | Report Preview | Minister | Preview |
| SCR-D11 | Intelligence | Lineage | KPI Drill-down Lineage | Timeline/Detail | Minister | Trace |

## 11.6 Portal E — PMO

| ID | Domain | Module | Screen | Type | Role | Key Action |
|---|---|---|---|---|---|---|
| SCR-E01 | Intelligence | National | National Overview | Executive | PMO | Assess |
| SCR-E02 | Financial | Capital | Government Capital | Executive | PMO | Inspect |
| SCR-E03 | Assets | Valuation | Market vs Book Value | Executive | PMO | Inspect |
| SCR-E04 | Financial | Burden | Fiscal Burden | Executive | PMO | Inspect |
| SCR-E05 | Financial | Contingent | Contingent Liabilities | Executive | PMO | Inspect |
| SCR-E06 | Assets | Land Bank | Land Bank | Executive/Map | PMO | Inspect |
| SCR-E07 | Industrial | Contribution | Employment / Industrial / Export | Executive | PMO | Inspect |
| SCR-E08 | Privatization | Potential | Privatization Potential | Executive | PMO | Inspect |

## 11.7 Portal F — Assurance (limited)

| ID | Domain | Module | Screen | Type | Role | Key Action |
|---|---|---|---|---|---|---|
| SCR-F01 | Assurance | Overview | Authorized Overview | Dashboard | Assurance | Orient |
| SCR-F02 | Assurance | Search | Approved Records Search | List | Assurance | Find |
| SCR-F03 | Assurance | Evidence | Evidence / Audit Timeline | Evidence/Timeline | Assurance | Trace |

## 11.8 Intelligence finishers (shared surfaces; portal-gated)

| ID | Portal(s) | Module | Screen | Type | Role | Key Action |
|---|---|---|---|---|---|---|
| SCR-I01 | B/D/E | GIS | National Industrial Asset Map | Map | Authorized | Query geography |
| SCR-I02 | B/D | Scorecards | SOE Performance Scorecard | Executive | Analyst/MoIP/Exec | Compare |
| SCR-I03 | B/D | Risk | Risk Matrix / Heat Map | Executive | Analyst/MoIP/Exec | Inspect risk |
| SCR-I04 | B | Search | Advanced / Intelligence Query | List | MoIP/Analyst | Query |
| SCR-I05 | B/D/E | Reports | Report Centre | Report Preview | Authorized | Preview |

Screen IDs may be extended only through the Product Decision Register.

---

# 12. Dummy Data Scenario Catalogue

| Scenario | Narrative intent | Dashboard consequence |
|---|---|---|
| **A — Healthy** | Profitable; Board complete; compliant; good utilization; limited audit exposure | Green-leaning indicators |
| **B — Financially Distressed** | Consecutive losses; rising debt; subsidy dependence; declining utilization | Fiscal/performance alerts |
| **C — Asset-Rich** | Extensive land; high market value; underutilization | Asset opportunity flags |
| **D — Governance-Risk** | Board vacancies; near-expiry directors; missing compliance | Governance calendar / alerts |
| **E — Audit / Legal Risk** | Major paras; litigation; unresolved recoveries | Accountability exposure |
| **F — Under Privatization** | Active milestones; DD/valuation/transaction stages | Privatization pipeline progress |

**Provisional PD-003:** Phase 4 may expand to ~10 SOE fixtures by splitting E into audit-heavy vs litigation-heavy and adding subsidy-dependent / overdue-compliance variants — must map back to A–F narratives.

Representative MoIP entities for fixtures (non-exhaustive): PIDC, PECO, EDB, NFC, NFML, PSM, USC, PITAC, TUSDEC, PASDEC, SMEDA (admin oversight), plus sample subsidiaries/JVs.

---

# 13. Conceptual Entity Relationship Map

```text
Organization (SOE)
 ├─ OrganizationRelationship (holding / subsidiary / associate / JV)
 ├─ Asset (Land | Building | Machine | Vehicle | Equipment) + GIS
 ├─ Position / Employee / Consultant / DailyWager
 ├─ Board / BoardMember / Committee
 ├─ Executive
 ├─ ReportingPeriod
 │    ├─ FinancialSubmission / FinancialMetric
 │    ├─ IndustrialPerformance
 │    └─ Submission / Certification / Review / Clarification
 ├─ Loan / Guarantee / Grant / Subsidy
 ├─ ProcurementContract
 ├─ Audit / AuditPara / PAC / Recovery
 ├─ LitigationCase
 ├─ ComplianceRequirement / ComplianceSubmission
 ├─ PrivatizationCase / Milestone
 ├─ Document / DocumentLink / DocumentVersion
 ├─ Task / Alert
 └─ AuditLog (prototype activity history)
```

These relationships inform Phase 1 TypeScript models and Phase 4 fixtures.

---

# 14. Reporting Period Model

### Period types
`Annual` · `Quarterly` · `Monthly` · `Event-Based` · `Special`

### Baseline demo periods
`FY2025` · `FY2026` · `FY2027`  
**Provisional PD-004:** Phase 4 may include `FY2024` for trend depth and sample quarterly periods (e.g. `Q1 FY2027`) without changing the model.

### Record classification
| Class | Examples | Update pattern |
|---|---|---|
| Master | Legal identity, core profile | Event-driven + annual confirm |
| Period-specific | Financials, industrial metrics, submissions | Per reporting cycle |
| Event-driven | Board appointment, litigation hearing, privatization milestone | On event |

Each period-bound record carries period id + workflow/eligibility status for intelligence consumption.

---

# 15. Terminology Standard (Selected)

| Prefer | Avoid |
|---|---|
| Reporting Period | Cycle slang / “sprint” |
| Submission | “Form pack” |
| Certification | “Sign-off vibes” / casual “OK” |
| Clarification Requested | “Query ping” |
| Locked | Silent overwrite language |
| SOE / Organization | Inconsistent “company/entity” without definition |
| Evidence | Loose “attachment” when governance evidence is meant |
| MoIP Review | Generic “admin check” |
| Items Requiring Attention | “Insights for you” / journey copy |

Full microcopy law: design system + FOS instructions.

---

# 16. Stakeholder Validation Method

### Validate in Phase 0 / early rounds
Portal structure · roles · terminology · modules · navigation · workflows

### Feedback classification
`Accepted` · `Change Required` · `New Requirement` · `Future Phase` · `Out of Scope`

### Suggested early validation sequence (aligns to later Phase 24)
1. Shell / portals / navigation  
2. Submission workflow model  
3. Core module map  
4. MoIP review model  
5. Secretary / Minister information needs  
6. GIS / intelligence expectations (high level)  
7. Blueprint acceptance

---

# 17. Product Decision Register

| Decision ID | Date | Topic | Stakeholder | Comment | Decision | Impact | Owner | Status |
|---|---|---|---|---|---|---|---|---|
| PD-001 | 2026-08-08 | Portal F depth | Product | Assurance requirements not finalized | Ship limited feature-flagged shell | Portal F minimal until confirmed | Product | Provisional |
| PD-002 | 2026-08-08 | Secretary approve authority | Product | Secretary is exception-first | Approve remains MoIP workflow; Secretary escalates | Permission matrix | Product | Provisional |
| PD-003 | 2026-08-08 | Scenario count A–F vs Phase 4 ~10 | Product | Phase 4 expands fixtures | Expand fixtures but map to A–F narratives | Dummy data | Product | Provisional |
| PD-004 | 2026-08-08 | Reporting periods FY24 / quarterly | Product | Trends need history | Allow FY2024 + sample quarters in model | Period fixtures | Product | Provisional |
| PD-005 | 2026-08-08 | Status vocabulary authority | Product | Prevent local status invention | §9 of this blueprint is canonical until change-controlled | All modules | Product | Accepted (blueprint) |

Add new rows for every material stakeholder decision. Do not silently change §3–§11.

---

# 18. Stakeholder Validation Record

| Session ID | Date | Round / Focus | Participants | Materials | Outcomes | Open Items | Facilitator |
|---|---|---|---|---|---|---|---|
| SV-000 | — | Phase 0 Blueprint review | TBD | This document | Pending | Schedule validation | TBD |

Use feedback classes from §16. Link each material outcome to a Product Decision Register ID.

---

# 19. Phase 0 Deliverables Checklist

| # | Deliverable | Location in this blueprint |
|---|---|---|
| 1 | Frontend Product Blueprint | This document |
| 2 | Portal Architecture | §3 |
| 3 | Module and Domain Map | §4 |
| 4 | Role Matrix | §5 |
| 5 | Permission Baseline | §5 |
| 6 | User Psychology Matrix | §6 |
| 7 | Navigation Map | §7 |
| 8 | Workflow Catalogue | §8 |
| 9 | Status Dictionary | §9 |
| 10 | Screen Inventory | §11 |
| 11 | Screen Archetype Catalogue | §10 |
| 12 | Dummy Data Scenario Catalogue | §12 |
| 13 | Conceptual Entity Relationship Map | §13 |
| 14 | Reporting Period Model | §14 |
| 15 | Scope / Out-of-Scope Register | §2 |
| 16 | Product Decision Register | §17 |
| 17 | Stakeholder Validation Record | §18 |

---

# 20. Phase 0 Exit Gate

| Criterion | Status |
|---|---|
| Portals defined and ready for acceptance | Met in blueprint (pending stakeholder Accepted) |
| Roles defined | Met |
| Module hierarchy defined | Met |
| Navigation defined | Met |
| Core workflows defined | Met |
| Screen inventory exists | Met |
| Dummy data scenarios defined | Met |
| Terminology standardized (baseline) | Met |
| Frontend-only boundaries explicit | Met |
| Formal stakeholder “Accepted” on blueprint | **Pending** — required before treating blueprint as frozen |

### Completion marker (engineering)

**Frontend Product Blueprint — Ready for Technical Foundation (Phase 1)**  
subject to stakeholder validation recording `Accepted` in §18.

### Explicit non-goals of Phase 0
No application codebase, design-system implementation, or business-module UI was required in Phase 0.

---

# 21. Handoff to Phase 1

Phase 1 must consume this blueprint to create:

- TypeScript domain models matching §13
- central status enums from §9
- permission model from §5
- portal routing skeleton from §3 and §7
- mock service contracts (empty/stub ok until Phase 4 depth)
- Demo Role Simulator roles from §5

Do not invent alternate portals, domains, or submission statuses in Phase 1.
