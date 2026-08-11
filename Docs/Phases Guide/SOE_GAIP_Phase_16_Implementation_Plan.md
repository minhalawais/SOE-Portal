# SOE-GAIP Frontend Development
## Phase 16 Implementation Plan — Minister Strategic Intelligence Portal

**Project:** State-Owned Enterprises Governance, Asset & Performance Intelligence Platform (SOE-GAIP)  
**Development Stage:** Frontend-only stakeholder validation prototype  
**Data Source:** Realistic dummy data through mock services  
**Backend / Database:** Out of scope  
**External Government API Integrations:** Future phase  
**Implementation Principle:** Build the intended production operating model in the frontend without creating backend dependencies.

---

# 1. Phase Objective

Phase 16 creates the Minister Strategic Intelligence Portal.

The Minister should see strategic portfolio intelligence first and detailed operational records only on demand.

The portal must answer:

- How is the SOE portfolio performing?
- What fiscal exposure exists?
- What assets/opportunities matter?
- Where are governance, audit or legal risks concentrated?
- What requires strategic attention?

---

# 2. Main Areas

Build:

- Executive Overview
- SOE Portfolio Health
- Government Investment
- Aggregate Asset Values
- Liabilities and Debt
- Profit / Loss
- Subsidy Exposure
- Fiscal Risk
- Board Governance
- Major Audit Exposure
- Major Litigation
- Privatization
- Industrial Capacity
- Underutilized Assets
- Strategic Opportunities

---

# 3. Executive Overview

Use a restrained layout with:

## Portfolio Summary

- number of SOEs by status
- profitable vs loss-making
- aggregate asset value
- aggregate liabilities/debt
- subsidies/government support
- capacity utilization summary

## Major Risks

Top strategic issues only.

## Strategic Opportunities

Examples:

- high-value vacant land
- underutilized industrial capacity
- privatization milestone opportunity
- strong-performing SOE

## Decisions / Attention

Small list of matters requiring strategic attention.

---

# 4. Portfolio Health

Present SOEs by:

- enterprise status
- financial position
- governance condition
- overall prototype health classification where configured

Do not rely solely on a single composite score. Preserve component indicators.

---

# 5. Fiscal Exposure

Show:

- total government investment
- aggregate debt
- guarantees
- subsidies
- grants
- losses
- contingent exposure where modeled

Allow trend and SOE breakdown.

---

# 6. Asset Intelligence

Show:

- total book value
- total market value
- land value
- vacant/unused assets
- underutilized assets
- encroached land
- assets under litigation

Link to GIS/Asset Intelligence.

---

# 7. Governance Risk

Show:

- Board vacancies
- expiring appointments
- major compliance gaps
- missing annual reports
- governance alerts

Keep detail summary-level.

---

# 8. Audit & Legal Risk

Show:

- major open audit paras
- total value exposed
- major litigation exposure
- high-priority upcoming legal matters

Use top items + drill-down.

---

# 9. Privatization

Show:

- SOEs in pipeline
- current stage
- blocked cases
- completed milestones
- potential value placeholder where dummy data supports it

Do not present speculative transaction proceeds as authoritative unless explicitly labeled prototype.

---

# 10. Industrial Performance

Show:

- aggregate installed capacity
- actual production
- capacity utilization
- export contribution
- domestic sales
- employment
- underutilized capacity

---

# 11. Strategic Opportunities

Prototype opportunity cards may include:

- vacant industrial land
- idle factory
- underutilized machinery
- high market/book value variance
- restructuring candidate
- privatization milestone

These are prototype decision-support signals, not formal recommendations.

---

# 12. Drill-Down Pattern

Implement:

```text
Portfolio
↓
Risk / Opportunity Area
↓
SOE
↓
Underlying Record
↓
Evidence
```

Every material KPI should have lineage when feasible.

---

# 13. Chart and KPI Rules

- few high-value KPIs
- use five-year trends only where meaningful
- avoid dense operational tables on landing page
- clearly label units/period
- every chart should answer a question
- avoid decorative gauges

---

# 14. Filters

Executive filters:

- reporting period
- sector
- enterprise status
- province where relevant

Do not burden the Minister with operational filters.

---

# 15. Role Behavior

Minister:

- read strategic intelligence
- drill into SOE and evidence
- no editing
- no workflow approvals unless later explicitly required by stakeholders

---

# 16. Dummy Data Requirements

Portfolio should contain:

- profitable entities
- loss-making entities
- high subsidy entity
- asset-rich entity
- underutilized entity
- governance-risk entity
- privatization case
- audit/legal risk cases

Ensure aggregate values reconcile to underlying fixtures.

---

# 17. QA

Test:

- aggregate reconciliation
- period switching
- sector filtering
- drill-down
- no-data state
- top-risk ranking
- lineage links
- read-only permissions
- responsive tablet use

---

# 18. Stakeholder Validation Questions

- Which KPIs belong on the first screen?
- Which risks are material enough for Minister view?
- Should government investment be defined differently?
- Which asset opportunities matter most?
- How much detail is too much?
- What should be included in the Minister Brief?
- Which issues should escalate from Secretary to Minister?

---

# 19. Deliverables

1. Executive Overview
2. Portfolio Health
3. Fiscal Exposure
4. Asset Intelligence
5. Governance Risk
6. Audit & Legal Risk
7. Privatization summary
8. Industrial Performance
9. Strategic Opportunities
10. drill-down/lineage flows
11. executive filters
12. reconciled dummy aggregates

---

# 20. Exit Gate

Phase 16 is complete when:

- strategic portfolio view is concise
- high-level indicators reconcile to source fixtures
- risk/opportunity drill-down works
- no operational clutter dominates
- the Minister can understand the portfolio without training
- stakeholders approve first-screen priorities and drill-down depth

## **Minister Strategic Intelligence Portal — Approved**
