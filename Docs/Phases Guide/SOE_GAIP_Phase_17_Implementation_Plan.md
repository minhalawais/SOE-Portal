# SOE-GAIP Frontend Development
## Phase 17 Implementation Plan — PMO / Strategic Government View

**Project:** State-Owned Enterprises Governance, Asset & Performance Intelligence Platform (SOE-GAIP)  
**Development Stage:** Frontend-only stakeholder validation prototype  
**Data Source:** Realistic dummy data through mock services  
**Backend / Database:** Out of scope  
**External Government API Integrations:** Future phase  
**Implementation Principle:** Build the intended production operating model in the frontend without creating backend dependencies.

---

# 1. Phase Objective

Phase 17 creates the PMO / Strategic Government View as the highest-level portfolio perspective.

This view should avoid operational detail and focus on national strategic questions.

---

# 2. Focus Areas

Build:

- National Overview
- Total Government Capital Employed
- Market Value vs Book Value
- Fiscal Burden
- Contingent Liabilities
- Land Bank
- Employment
- Industrial Production
- Export Contribution
- Privatization Potential
- National Strategic Indicators

---

# 3. National Overview

Show a small number of strategic indicators:

- number of SOEs
- government capital employed
- aggregate assets
- fiscal burden
- employment
- industrial output
- export contribution
- privatization pipeline

Do not replicate the Minister portal page-for-page.

---

# 4. Government Capital

Show:

- investment/capital proxy defined in prototype
- return indicators where available
- trend
- breakdown by sector/SOE

Clearly document the prototype definition because "government capital employed" may need formal policy/finance definition later.

---

# 5. Market Value vs Book Value

Show:

- aggregate book value
- aggregate market value
- variance
- assets without current valuation

Allow limited drill-down to asset intelligence.

---

# 6. Fiscal Burden

Prototype:

- subsidies
- guarantees
- losses
- debt/government exposure

Do not combine items into one official number unless methodology is stakeholder-approved.

---

# 7. Contingent Liabilities

Represent guarantees and other modeled exposure separately.

Clearly distinguish:

- actual expenditure
- debt
- guarantee/contingent exposure

---

# 8. Land Bank

Show:

- total land area
- industrial land
- vacant/unused land
- unencumbered prototype category if available
- market value
- province distribution

Link to GIS.

---

# 9. Employment and Industrial Contribution

Show:

- total employment
- industrial production
- capacity utilization
- export contribution
- sector breakdown

---

# 10. Privatization Potential

Show:

- entities in pipeline
- current stages
- blocked/completed milestones
- prototype potential value only if clearly labeled and supported by dummy data

---

# 11. Strategic Indicator Cards

Each indicator should include:

- current value
- period
- trend
- definition tooltip
- drill-down route

Keep the number of cards limited.

---

# 12. Filters

Only high-level:

- reporting period
- sector
- province where relevant

Avoid operational workflow filters.

---

# 13. Drill-Down

Pattern:

```text
National Indicator
↓
Portfolio / Sector
↓
SOE
↓
Underlying Intelligence
```

Evidence-level drill-down may be available but should not dominate the PMO experience.

---

# 14. Role Behavior

PMO role:

- read-only
- portfolio scope
- no edit
- no submission review
- no operational task queues

---

# 15. Dummy Data Requirements

All high-level totals must reconcile to:

- financial fixtures
- asset fixtures
- workforce fixtures
- industrial fixtures
- privatization fixtures

Avoid hardcoded numbers disconnected from modules.

---

# 16. QA

Test:

- aggregate reconciliation
- sector filtering
- period filtering
- land-bank totals
- employment totals
- export totals
- drill-down
- read-only permissions
- tablet responsiveness

---

# 17. Stakeholder Validation Questions

- Which national indicators are actually required?
- How should government capital employed be defined?
- Which fiscal-burden components should remain separate?
- How should contingent liabilities be presented?
- What land-bank definition is meaningful?
- Is PMO access in initial system required or future?
- What depth of drill-down is appropriate?

---

# 18. Deliverables

1. National Overview
2. Government Capital view
3. Market vs Book Value
4. Fiscal Burden
5. Contingent Liabilities
6. Land Bank
7. Employment/Industrial Contribution
8. Export Contribution
9. Privatization Potential
10. strategic filters
11. drill-down flows
12. reconciled aggregate fixtures

---

# 19. Exit Gate

Phase 17 is complete when:

- the view is clearly more strategic than Minister/SOE portals
- all totals reconcile
- operational clutter is absent
- strategic drill-down works
- stakeholders validate required indicators and definitions

## **PMO / Strategic Government View — Approved**
