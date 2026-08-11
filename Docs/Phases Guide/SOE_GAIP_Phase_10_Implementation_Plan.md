# SOE-GAIP Frontend Development
## Phase 10 Implementation Plan — Financial, Fiscal and Operational Modules

**Project:** State-Owned Enterprises Governance, Asset & Performance Intelligence Platform (SOE-GAIP)  
**Development Stage:** Frontend-only stakeholder validation prototype  
**Data Source:** Realistic dummy data through mock services  
**Backend / Database:** Out of scope  
**External Government API Integrations:** Future phase  
**Implementation Principle:** Build the intended production operating model in the frontend without creating backend dependencies.

---

# 1. Phase Objective

Phase 10 expands the financial pilot from Phase 5 into the complete financial, fiscal exposure and industrial performance frontend.

Stakeholders should be able to assess:

- financial performance
- budgets
- profitability
- cash position
- working capital
- ratios
- subsidies
- government support
- loans/debt
- guarantees
- grants
- repayment obligations
- production
- capacity utilization
- exports/imports
- domestic sales
- employment contribution
- energy
- carbon indicators

The frontend should emphasize trend, comparison and exception rather than raw values only.

---

# 2. Domain Structure

```text
Financial & Fiscal
├── Financial Performance
├── Financial Statements / Indicators
├── Loans & Debt
├── Guarantees
├── Grants & Subsidies
└── Government Exposure

Industrial Performance
├── Production
├── Capacity Utilization
├── Sales / Trade
├── Employment Contribution
├── Energy
└── Carbon Indicators
```

---

# 3. Financial Overview

Show:

- Annual Budget
- Revenue
- Operating Expenses
- CAPEX
- Profit / Loss
- Cash Flow
- Working Capital
- Current Ratio
- Debt Ratio
- ROA
- ROE
- Subsidies
- Government Grants
- Loans
- Borrowings
- Guarantees
- Receivables
- Payables
- Inventory
- Audit Status

Every key value should show current period and comparison context where available.

---

# 4. Annual Budget

Support:

- budget
- actual
- variance
- variance %
- category
- period

Provide budget vs actual table and visualization.

Do not invent detailed budget classifications without stakeholder confirmation.

---

# 5. Revenue, Expenditure and CAPEX

Provide:

- current value
- previous period
- five-year trend where data exists
- year-on-year change

Example chart titles:

- Revenue Trend — Five Years
- Operating Expenditure vs Revenue
- CAPEX Trend

---

# 6. Profit and Loss

Show:

- profit/loss
- margin if derived
- historical trend
- consecutive loss years

Use controlled warning semantics.

---

# 7. Cash Flow and Working Capital

Show:

- cash flow
- working capital
- receivables
- payables
- inventory

Provide period comparison.

---

# 8. Financial Ratios

Support:

- Current Ratio
- Debt Ratio
- ROA
- ROE

Each includes:

- value
- period
- previous value
- trend
- definition tooltip

Formulas must live in centralized KPI utilities.

---

# 9. Financial Statement Evidence

Show metadata/placeholders for:

- Balance Sheet
- Income Statement
- Cash Flow Statement
- Notes
- audit report where linked

---

# 10. Loans and Debt

Loan Registry columns:

- Loan ID
- lender
- type
- amount
- interest
- outstanding
- next repayment
- repayment status
- guarantee status
- default status

Representative lender categories from the concept:

- Government
- Bank
- Foreign
- ADB
- World Bank
- China
- Commercial

Validate final taxonomy with stakeholders.

---

# 11. Loan Detail

Sections:

- lender
- terms
- outstanding
- interest
- repayment schedule
- default
- guarantee
- documents
- history

Provide repayment timeline/table.

---

# 12. Guarantees

Show:

- guarantee reference
- related loan
- amount
- guarantor/government
- status
- exposure

Aggregate into fiscal exposure views.

---

# 13. Grants and Subsidies

Grant fields:

- source
- amount
- project
- utilization
- remaining balance
- completion

Subsidy/government-support view:

- current period
- historical trend
- comparison

Avoid policy judgments not defined by stakeholders.

---

# 14. Government Exposure Summary

Prototype aggregation:

- total borrowings
- outstanding loans
- guarantees
- subsidies
- grants
- persistent losses

Clearly label as prototype intelligence where methodology is not yet formally approved.

---

# 15. Industrial Performance Overview

Show:

- Production Capacity
- Installed Capacity
- Actual Production
- Capacity Utilization
- Exports
- Imports
- Domestic Sales
- Employment
- Energy Consumption
- Carbon Emissions

Use reporting-period context consistently.

---

# 16. Production and Capacity

Display:

```text
Installed Capacity
Actual Production
Capacity Utilization
```

Capacity utilization:

```text
Actual Production / Installed Capacity
```

Handle zero installed capacity safely.

---

# 17. Sales and Trade

Represent:

- exports
- imports
- domestic sales

Use trend and comparison.

Do not expand into unrelated trade analytics.

---

# 18. Employment Contribution

Show aggregate employment contribution.

Link to workforce where appropriate without duplicating HR detail.

---

# 19. Energy and Carbon

Represent:

- energy consumption
- carbon emissions

Always show units.

Do not introduce Scope 1/2/3 unless separately approved.

---

# 20. Cross-Domain Analytical Views

Prototype carefully selected comparisons:

## Capacity vs Financial Performance

- capacity utilization trend
- revenue/profit trend

## Subsidy vs Profitability

- subsidy trend
- profit/loss trend

These are analytical comparisons, not causal conclusions.

---

# 21. Data Entry Experience

Use period-based segmented forms:

```text
Reporting Period
→ Financial Section
→ Fiscal Section
→ Industrial Performance
→ Evidence
→ Review
```

Allow Save Draft.

Avoid one extremely long form.

---

# 22. Comparison Mode

Example:

| Metric | FY2026 | FY2027 | Change |
|---|---:|---:|---:|
| Revenue | ... | ... | ... |
| Profit/Loss | ... | ... | ... |
| Subsidy | ... | ... | ... |
| Capacity Utilization | ... | ... | ... |

---

# 23. Visualization Rules

Use:

- line for time
- bar for comparison
- horizontal bar for ranking
- stacked bar for composition where justified

Avoid:

- 3D charts
- excessive gauges
- decorative donuts
- chart types that obscure exact values

---

# 24. KPI Definitions

Centralize prototype definitions for:

- Current Ratio
- Debt Ratio
- ROA
- ROE
- Capacity Utilization
- Budget Variance
- Year-over-Year Change

Each definition includes:

- label
- formula
- source fields
- format
- null handling

Final official definitions must be stakeholder-approved later.

---

# 25. Validation

Examples:

- numeric input validation
- period required
- capacity non-negative
- production non-negative
- zero-capacity handling
- outstanding loan non-negative
- valid repayment date
- required evidence where configured
- material historical-change warning

Prototype warnings are not official risk ratings.

---

# 26. Role Behavior

Finance Officer:

- edit financial/fiscal

Operations role where represented:

- edit industrial

Focal Person:

- review completion

CFO/CEO:

- certify

MoIP Reviewer:

- review/compare/clarify/approve

Secretary/Minister/PMO:

- read intelligence

---

# 27. Dummy Data Scenarios

Include:

- profitable SOE
- three-year loss SOE
- increasing subsidy
- high debt
- repayment due
- defaulted loan
- large guarantee exposure
- partially utilized grant
- high capacity utilization
- low capacity utilization
- declining exports
- high energy usage

Cross-domain values must tell coherent stories.

---

# 28. QA

Test:

- period switching
- trends
- ratio calculations
- capacity utilization
- zero/missing values
- large PKR values
- repayment schedule
- grant utilization
- evidence
- edit/read modes
- comparison
- chart empty states
- warnings

---

# 29. Stakeholder Validation Questions

- Are all financial indicators included?
- Are ratio definitions correct?
- Which metrics are annual vs quarterly?
- Which statements must be uploaded?
- Is government support represented correctly?
- Are lender categories correct?
- What qualifies as default?
- Are grant fields sufficient?
- Are capacity units sector-specific?
- Are energy/carbon indicators sufficient?
- Which metrics belong on Minister/PMO views?

---

# 30. Deliverables

1. Financial Overview
2. Annual Budget
3. revenue/expenditure/CAPEX trends
4. profit/loss
5. cash flow/working capital
6. ratio components
7. financial evidence
8. loan registry/detail
9. repayment schedule
10. guarantees
11. grants/subsidies
12. government exposure summary
13. Industrial Performance Overview
14. production/capacity
15. exports/imports/domestic sales
16. employment contribution
17. energy
18. carbon indicators
19. comparison mode
20. KPI definitions
21. validation schemas
22. coherent fixtures

---

# 31. Exit Gate

Phase 10 is complete when:

- financial performance is understandable across periods
- fiscal exposure is understandable
- loans/guarantees/grants are navigable
- industrial performance is visible
- capacity utilization calculates correctly
- comparison mode works
- charts answer meaningful questions
- role permissions work
- data-entry/review flow matches the Golden Workflow
- KPI terminology/definitions are captured for approval

## **Financial, Fiscal and Operational Modules — Approved**
