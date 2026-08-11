# Phase 23 — Regression Record

**RC:** SOE-GAIP-Frontend-RC1  
**Fixture:** seed-2026.08.10-rc1-names  
**Automated command:** `npm test`

---

## Cycle R1 — Functional QA freeze

| Field | Value |
|---|---|
| Environment | local_development |
| Baseline | Begin QA cycle via Demo Controls / `beginQaCycle` |
| Default org | org-psm |
| Default period | period-fy2027 |
| Roles exercised (automated) | Focal, FO, CFO, MoIP Reviewer, Analyst, executive roles (matrix) |

### Suite results

| Suite | Result |
|---|---|
| Full vitest (`npm test`) | Pass (Phase 23 suites included) |
| Golden finance workflow | Pass (existing Phase 5) |
| Permissions matrix | Pass (`phase23.permissions.matrix`) |
| Navigation critical routes | Pass (`phase23.navigation`) |
| Cross-portal consequences | Pass (`phase23.crossportal.workflow`) |
| Modules / edge / reports / GIS / search | Pass (`phase23.modules.regression`) |
| A11y regression | Pass (`phase23.a11y.regression`) |
| TypeScript build (`tsc -b`) | Pass |

### Manual spot checks (this cycle)

| Check | Result | Notes |
|---|---|---|
| Demo Controls shows RC + fixture | Pass | Prototype tooling |
| Begin QA cycle toast + baseline line | Pass | |
| MoIP Approvals hidden for Analyst | Pass (automated) | |
| Report print CSS present | Pass (Phase 22 retained) | |

### Defects introduced / reopened

None open Blocker/Critical.

---

## Post-fix retest template

| Fix ID | Affected tests | Related workflow | Nav smoke | Perm check | Golden path | Result |
|---|---|---|---|---|---|---|
| | | | | | | |
