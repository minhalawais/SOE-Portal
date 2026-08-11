# SOE-GAIP Frontend Development
## Phase 19 Implementation Plan — Intelligence, Risk and Benchmarking

**Project:** State-Owned Enterprises Governance, Asset & Performance Intelligence Platform (SOE-GAIP)  
**Development Stage:** Frontend-only stakeholder validation prototype  
**Data Source:** Realistic dummy data through mock services  
**Backend / Database:** Out of scope  
**External Government API Integrations:** Future phase  
**Implementation Principle:** Build the intended production operating model in the frontend without creating backend dependencies.

---

# 1. Phase Objective

Phase 19 builds the advanced analytical layer for SOE performance scorecards, risk intelligence, cross-SOE benchmarking and early-warning analysis.

The purpose is not to create opaque scoring. It is to help stakeholders:

- compare SOEs
- identify deteriorating conditions
- understand why a risk indicator exists
- distinguish strong performance from problem areas
- drill from score/risk to underlying evidence

---

# 2. Analytical Scope

Build:

- SOE Performance Scorecard
- Risk Matrix
- Portfolio Heat Map
- Cross-SOE Benchmarking
- Trend Deterioration Views
- Early Warning
- Peer Comparison
- Metric Definitions
- Explainability Panel

---

# 3. Performance Scorecard Dimensions

Use the roadmap dimensions:

- Financial
- Governance
- Compliance
- Operations
- Asset Efficiency
- Strategic Contribution

Each dimension should show:

- score/status
- component metrics
- trend
- definition
- data period
- drill-down

A composite overall score may be prototyped but must not hide component results.

---

# 4. Scoring Governance

All score logic must be centralized in configuration.

Prototype score definitions should document:

- metric
- normalization/threshold
- weight
- data source
- period
- missing-data behavior

Example configuration concept:

```text
Dimension: Financial
Components:
- Profitability
- Debt
- Subsidy Dependence
- Liquidity
```

Do not present a prototype composite score as an official government rating.

Use a visible **Prototype Methodology** indicator until approved.

---

# 5. Risk Dimensions

Show:

- Financial Risk
- Governance Risk
- Legal Risk
- Audit Risk
- Compliance Risk
- Asset Risk

Each risk must support:

- level
- reason(s)
- triggering indicators
- trend
- linked records
- last evaluated period

---

# 6. Risk Levels

Use:

- Low
- Moderate
- High
- Critical

Risk color/status must follow Phase 2 semantics.

Never show only a colored dot without text.

---

# 7. Explainability

Every risk or score should answer:

> Why is this status shown?

Example:

```text
Financial Risk: High

Drivers:
- Losses for 3 consecutive years
- Debt increased 18%
- Subsidy increased 25%
```

Each driver should link to the relevant financial view.

---

# 8. Cross-SOE Benchmarking

Allow comparison by:

- sector
- profitability
- subsidy dependence
- ROA
- debt
- capacity utilization
- governance performance
- asset efficiency

Recommended UX:

- select metric
- select comparison group
- rank/list/chart
- select SOEs
- open comparison detail

---

# 9. Peer Group Definition

Prototype comparison groups:

- all SOEs
- same sector
- selected SOEs

Do not invent sophisticated peer-group logic until stakeholders define it.

---

# 10. Benchmarking Table

Columns may include:

- SOE
- selected metric
- prior period
- current period
- change
- rank
- status

Allow sorting and drill-down.

---

# 11. Portfolio Heat Map

Create a matrix:

| SOE | Financial | Governance | Compliance | Audit | Legal | Assets |
|---|---|---|---|---|---|---|

Use text/icon/status and accessible tooltips.

Allow:

- sort by highest concern
- filter sector
- open SOE risk detail

---

# 12. Early Warning

Early warning should focus on change over time.

Prototype signals:

- consecutive losses
- declining revenue
- increasing subsidy dependence
- increasing debt
- falling capacity utilization
- repeated compliance delay
- Board expiry concentration
- unresolved audit exposure
- increasing litigation exposure

These are demonstration rules unless formally approved.

---

# 13. Trend Deterioration View

For selected SOE show:

- indicators deteriorating
- indicators improving
- indicators stable
- time period
- magnitude

Avoid claiming causation.

---

# 14. Missing Data

Missing data must not automatically become “good” or “bad.”

Use:

- Data Unavailable
- Insufficient History
- Pending Verification

Exclude incomplete metrics from composite scores unless the prototype methodology explicitly defines treatment.

---

# 15. Executive vs Analyst Views

Analyst/MoIP:

- more detailed score components
- metric definitions
- comparison tables

Secretary/Minister:

- concise risks/opportunities
- top drivers
- drill-down

PMO:

- portfolio/sector view only

---

# 16. Dummy Data Requirements

Ensure fixtures produce:

- high financial risk
- governance risk
- asset risk
- audit risk
- legal risk
- low-risk SOE
- improving SOE
- deteriorating SOE
- insufficient-data SOE

Scores must reconcile with underlying dummy values.

---

# 17. KPI / Risk Definition Registry

Create a frontend registry for internal validation containing:

- indicator name
- domain
- formula/rule
- period
- threshold
- weight if used
- output type
- status
- methodology note

This will later feed the backend KPI dictionary.

---

# 18. QA

Test:

- risk calculation
- score calculation
- missing-data handling
- period change
- benchmark ranking
- sector filtering
- explainability links
- heat-map accessibility
- aggregate reconciliation
- reset data

---

# 19. Stakeholder Validation Questions

- Are these six scorecard dimensions correct?
- Should there be an overall score?
- Which metrics belong in each dimension?
- What thresholds are legitimate?
- Which risks need separate treatment?
- What comparison groups are fair?
- Should incomplete data affect scores?
- Which alerts qualify as early warning?
- Should scorecards be visible to SOEs or only MoIP?

---

# 20. Deliverables

1. SOE Performance Scorecard
2. score methodology/config
3. Risk Matrix
4. risk explainability
5. Portfolio Heat Map
6. Cross-SOE Benchmarking
7. Peer Comparison
8. Early Warning view
9. Trend Deterioration
10. indicator-definition registry
11. role-specific analytical modes
12. reconciled fixtures

---

# 21. Exit Gate

Phase 19 is complete when:

- scores/risks are explainable
- all analytical outputs reconcile to dummy source data
- missing data is handled transparently
- benchmarking works
- executive views remain concise
- prototype methodology is clearly labeled
- stakeholders validate which analytical indicators should move toward formal implementation

## **Intelligence, Risk and Benchmarking — Approved**
