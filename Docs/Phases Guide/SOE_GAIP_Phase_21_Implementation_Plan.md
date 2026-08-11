# SOE-GAIP Frontend Development
## Phase 21 Implementation Plan — Reports and Executive Briefings

**Project:** State-Owned Enterprises Governance, Asset & Performance Intelligence Platform (SOE-GAIP)  
**Development Stage:** Frontend-only stakeholder validation prototype  
**Data Source:** Realistic dummy data through mock services  
**Backend / Database:** Out of scope  
**External Government API Integrations:** Future phase  
**Implementation Principle:** Build the intended production operating model in the frontend without creating backend dependencies.

---

# 1. Phase Objective

Phase 21 validates the reports and executive briefings required from SOE-GAIP.

The current frontend stage does not require production server-side report generation.

The goal is to validate:

- report catalogue
- content
- filters
- structure
- hierarchy
- usefulness
- preview layout
- mock export behavior

---

# 2. Report Catalogue

Build representative frontends for:

- SOE Profile Report
- Annual Portfolio Report
- Asset Report
- Fiscal Exposure Report
- Board Governance Report
- Audit Report
- Litigation Report
- Compliance Report
- Privatization Report
- Industrial Performance Report
- Minister Brief
- Cabinet Brief

---

# 3. Report Centre

Create a central report catalogue showing:

- report name
- audience
- description
- available filters
- latest period
- preview
- mock export actions

Group by:

- Enterprise
- Governance
- Financial
- Assets
- Accountability
- Executive

---

# 4. Report Parameter Screen

Common parameters:

- reporting period
- SOE / portfolio
- sector
- province where applicable
- status/risk where relevant

Only show parameters meaningful to a report.

---

# 5. SOE Profile Report

Sections:

- identity
- ownership
- assets summary
- workforce
- Board
- financial snapshot
- audit/legal
- compliance
- industrial performance
- privatization status where relevant

---

# 6. Annual Portfolio Report

Sections:

- portfolio composition
- financial performance
- assets
- governance
- fiscal exposure
- industrial performance
- accountability issues
- strategic highlights

---

# 7. Asset Report

Sections:

- asset count/value
- land
- utilization
- valuation
- encroachment
- litigation
- geographic distribution

---

# 8. Fiscal Exposure Report

Sections:

- debt
- loans
- guarantees
- subsidies
- grants
- losses
- trend

Definitions must be clear.

---

# 9. Board Governance Report

Sections:

- Board composition
- vacancies
- expiries
- committees
- declarations
- attendance summary where relevant

---

# 10. Audit Report

Sections:

- audits
- open paras
- amount involved
- recovery
- PAC observations
- aged issues

---

# 11. Litigation Report

Sections:

- active cases
- financial exposure
- upcoming hearings
- high-value matters
- status breakdown

---

# 12. Compliance Report

Sections:

- compliance status by SOE
- overdue requirements
- evidence gaps
- trend/comparison

---

# 13. Privatization Report

Sections:

- entities in pipeline
- current stage
- blockers
- milestones
- valuation/status
- next actions

---

# 14. Industrial Performance Report

Sections:

- production
- installed capacity
- utilization
- exports
- imports
- domestic sales
- employment contribution
- energy
- carbon indicators

---

# 15. Minister Brief

Keep concise.

Suggested sections:

- Portfolio Health
- Major Financial Risks
- Governance Issues
- Asset Opportunities
- Audit/Legal Exposure
- Privatization
- Decisions / Attention Required

---

# 16. Cabinet Brief

Prototype a high-level narrative/report structure suitable for senior policy review.

Keep data concise, with:

- key issue
- evidence
- strategic implication
- decision/attention placeholder

Do not simulate official Cabinet wording or approval process without stakeholder input.

---

# 17. Report Preview

Frontend preview should support:

- cover/header
- section hierarchy
- tables
- charts
- page-like layout
- print preview

Use representative dummy content.

---

# 18. Export Behavior

Allowed in frontend phase:

- mock PDF export
- mock Excel export
- frontend-generated simple sample where technically convenient

Do not treat these as production reporting services.

---

# 19. Data Lineage

Where practical, report preview elements should link back to application records in interactive mode.

For static mock export, include source/period metadata.

---

# 20. Version and Period

Reports should display:

- generated date
- reporting period
- data status (Approved / Prototype)
- organization/portfolio scope

Avoid mixing draft/unapproved data into executive reports unless clearly labeled.

---

# 21. Role Behavior

SOE:
- own reports

MoIP:
- portfolio/assigned reports

Secretary:
- governance/operational briefing

Minister:
- strategic briefs

PMO:
- national strategic outputs

---

# 22. Dummy Data Requirements

Ensure every report has:

- populated scenario
- zero/empty scenario where relevant
- multi-period data
- multiple SOEs

---

# 23. QA

Test:

- report parameters
- report preview
- data reconciliation
- period labels
- role access
- empty sections
- long tables
- print layout
- mock export buttons

---

# 24. Stakeholder Validation Questions

- Which reports are mandatory?
- Which are annual vs on-demand?
- What belongs in Minister Brief?
- What belongs in Cabinet Brief?
- Are PDFs and Excel both required later?
- Which reports use only approved data?
- Which report sections need sign-off?
- What is the preferred executive briefing length?

---

# 25. Deliverables

1. Report Centre
2. report parameter pattern
3. 10 domain report previews
4. Minister Brief
5. Cabinet Brief
6. print/page preview style
7. mock PDF/Excel actions
8. role-based access
9. period/status metadata
10. report fixtures

---

# 26. Exit Gate

Phase 21 is complete when:

- report catalogue is stakeholder-validated
- report structures are useful
- executive briefs are concise
- previews reconcile to underlying dummy data
- period/data-status labeling is clear
- mock export behavior demonstrates intended UX

## **Reports and Executive Briefings — Approved**
