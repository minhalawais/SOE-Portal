# Phase 23 — Defect Register

**RC under test:** SOE-GAIP-Frontend-RC1  
**Fixture:** seed-2026.08.10-rc1-names  
**Owner default:** Frontend prototype team

Severity: Blocker · Critical · Major · Minor  
Status: Open · Fixed · Verified · Deferred · Won’t fix (prototype)

---

## Open defects

| ID | Severity | Area | Summary | Owner | Status | Notes |
|---|---|---|---|---|---|---|
| — | — | — | *No open Blocker/Critical defects at RC1 freeze* | — | — | See deferred |

---

## Deferred / known prototype limitations (not Blocker)

| ID | Severity | Area | Summary | Status | Notes |
|---|---|---|---|---|---|
| P23-D01 | Minor | QA tooling | Scenario “packs” filter orgs; do not swap full alternate datasets | Deferred | Sufficient for reproducible cycles; full pack swap is future |
| P23-D02 | Minor | Browser matrix | Firefox/Safari not executed in this cycle | Deferred | Chromium/Vite + automated suite green; expand with MoIP IT |
| P23-D03 | Minor | A11y | Full NVDA/JAWS pass not completed | Deferred | Phase 22 matrix + automated regression present |
| P23-D04 | Major* | Placeholders | Some non-critical nav leaves may still resolve to ModulePlaceholder | Deferred | Critical stakeholder routes are implemented; *escalate if demo hits a placeholder* |

\* Treat as Critical if a placeholder blocks a scripted stakeholder path — open a Blocker immediately.

---

## Closed / verified in prior phases (reference)

| ID | Severity | Area | Resolution |
|---|---|---|---|
| P22-01 | Critical | Modal focus trap | Fixed Phase 22 |
| P22-02 | Critical | Form aria errors | Fixed Phase 22 |
| P22-03–09 | Major/Minor | Skip link, tables, charts, GIS, print | Fixed Phase 22 |

---

## Logging protocol

For each new defect record:

1. ID (`P23-NNN`)
2. Severity + area + portal/role
3. Steps + fixture baseline string from Demo Controls
4. Expected vs actual
5. Owner + status
6. Retest result in Regression Record
