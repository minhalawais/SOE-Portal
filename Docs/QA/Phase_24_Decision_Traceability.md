# Phase 24 — Decision Traceability

Maps accepted decisions → screens / requirements / workflow / data / roles / reports / KPIs (handover input for Phase 26).

| Decision ID | Screen / route | Requirement theme | Workflow | Data field / entity | Role / permission | Report / KPI |
|---|---|---|---|---|---|---|
| PD-001 | `/assurance/*` (flagged) | Assurance portal depth | Read-only evidence | — | ASSURANCE_USER | — |
| PD-002 | `/secretary/*`, `/moip/approvals` | Approve authority | MoIP approve; Secretary escalate | submission.status | SUBMISSION_APPROVE on MoIP roles | — |
| PD-003 | Demo scenario filter | Fixture narratives | — | organizations.scenario | — | Intelligence filters |
| PD-004 | Period switcher | Historical periods | Reporting period context | reportingPeriods | All | Reports period params |
| PD-005 | StatusBadge / catalogues | Status vocabulary | submission machine | statusCatalog | — | Report status columns |
| PD-024-002 | `/soe/stakeholder-validation` | Facilitation tooling | Validation rounds prep | validationRounds | Prototype Tools (SOE) | — |

Add a row for every **Accepted** session decision before Phase 25 freeze.
