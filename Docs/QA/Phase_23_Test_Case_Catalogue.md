# Phase 23 — Test Case Catalogue

**RC:** SOE-GAIP-Frontend-RC1 · **Fixture:** seed-2026.08.10-rc1-names

Legend: **A** = automated (`src/qa` / phase tests) · **M** = manual checklist

---

## NAV — Navigation

| ID | Case | Type | Expected |
|---|---|---|---|
| NAV-01 | Every portal home loads | A/M | Dashboard heading for role portal |
| NAV-02 | Critical leaf routes implemented | A | finance/form, readiness, submissions, approvals, maps, search, reports |
| NAV-03 | Deep link preserves context | M | Org/period from session retained |
| NAV-04 | Breadcrumb trail | M | Matches nav hierarchy |
| NAV-05 | Back navigation | M | Browser back returns prior workspace |
| NAV-06 | Unknown path | M | Not-found page |
| NAV-07 | Feature-flagged portals | M | PMO/Assurance respect config flags |
| NAV-08 | Analyst cannot see Approvals nav | A | Filtered navigation |

## PERM — Permissions

| ID | Case | Type | Expected |
|---|---|---|---|
| PERM-01 | Role × permission must-have | A | Matrix in `phase23.permissions.matrix.test.ts` |
| PERM-02 | Role × permission must-not-have | A | Executive/analyst boundaries |
| PERM-03 | Sensitive personal gated | A | HR/CS only |
| PERM-04 | Portal mapping | A | SOE/MoIP/Secretary/Minister/PMO/Assurance |
| PERM-05 | UI action hide/disable | M | Certify/Approve buttons role-gated |

## FORM — Forms

| ID | Case | Type | Expected |
|---|---|---|---|
| FORM-01 | Required field errors | A/M | `aria-invalid` + describedby |
| FORM-02 | Save draft finance | A | Draft persists; no approved KPI |
| FORM-03 | Read-only / review mode | M | Locked fields after submit |
| FORM-04 | Dirty cancel | M | Confirm or discard |
| FORM-05 | Zero / large values | M | Accepted with validation rules |
| FORM-06 | Sticky form actions | M | Submission readiness actions reachable |

## TBL — Tables

| ID | Case | Type | Expected |
|---|---|---|---|
| TBL-01 | Sort / filter / search | M | Server-style client filters work |
| TBL-02 | Pagination | A/M | Workforce pageSize respected |
| TBL-03 | Empty / loading | M | EmptyState / Skeleton |
| TBL-04 | Sticky header + first column | A | Phase 22 DataTable behaviour |
| TBL-05 | Horizontal overflow mobile | M | Hint + scroll |

## WF — Workflows

| ID | Case | Type | Expected |
|---|---|---|---|
| WF-01 | Valid transitions | A | submission.ts machine |
| WF-02 | Invalid transitions blocked | A | Draft↛Locked etc. |
| WF-03 | Golden path end-to-end | A | Certify→submit→review→approve→lock |
| WF-04 | Clarification loop | A | Phase 5 finance workflow test |
| WF-05 | Analyst cannot approve | A | AppError |

## XPORT — Cross-portal

| ID | Case | Type | Expected |
|---|---|---|---|
| XPORT-01 | Draft not in MoIP submitted queue | A | Queue exclusion |
| XPORT-02 | Lock creates approved KPI | A | `approvedFinanceKpis` |
| XPORT-03 | Intelligence readable after lock | A | Scorecard for org |
| XPORT-04 | Minister sees strategy not ops controls | M | No certify/approve chrome |

## DASH — Dashboards / KPIs

| ID | Case | Type | Expected |
|---|---|---|---|
| DASH-01 | Scorecard org reconciliation | A | organizationId match |
| DASH-02 | Period switch | M | KPIs refresh for period |
| DASH-03 | Empty / unavailable dataStatus | M | Explicit unavailable band |
| DASH-04 | Source lineage present | M | Reports/intelligence lineage links |

## DOC — Documents

| ID | Case | Type | Expected |
|---|---|---|---|
| DOC-01 | Org-scoped list | A | organizationId filter |
| DOC-02 | Version family | A | Phase 12 tests |
| DOC-03 | Missing evidence | A | Phase 12 tests |
| DOC-04 | Mock upload | M | Simulated; no real storage |

## GIS

| ID | Case | Type | Expected |
|---|---|---|---|
| GIS-01 | Filters + presets | A | Phase 18 tests |
| GIS-02 | Zero results | A | Empty page |
| GIS-03 | Missing geometry list | A | Rows still returned |
| GIS-04 | Map/list sync + mobile list-first | M | Phase 22 behaviour |
| GIS-05 | SOE isolation | A | Phase 18 scoped query |

## SRCH — Search

| ID | Case | Type | Expected |
|---|---|---|---|
| SRCH-01 | Structured operators | A | Phase 20 tests |
| SRCH-02 | Zero results | A | isZeroResult |
| SRCH-03 | Role scope SOE | A | Phase 20 isolation |
| SRCH-04 | Sensitive fields omitted | A | Phase 20 |

## RPT — Reports

| ID | Case | Type | Expected |
|---|---|---|---|
| RPT-01 | Portal catalogue | A | Minister catalogue non-empty |
| RPT-02 | Mock export | A | completed + mock message |
| RPT-03 | Print layout | M | Chrome hidden (Phase 22 CSS) |
| RPT-04 | Preview parameters | M | Period labels correct |

## RESP / A11Y

| ID | Case | Type | Expected |
|---|---|---|---|
| RESP-01 | Desktop/laptop/tablet/mobile | M | Phase 22 audit record |
| A11Y-01 | Focus trap / labels / status text | A | phase23.a11y.regression |
| A11Y-02 | Skip link / route focus | M | Phase 22 matrix |

## EDGE

| ID | Case | Type | Expected |
|---|---|---|---|
| EDGE-01 | No GIS results | A | Empty |
| EDGE-02 | Missing geometry | A | List OK |
| EDGE-03 | Large workforce page | A | pageSize cap |
| EDGE-04 | Scenario catalogue integrity | A | Unique ids |
| EDGE-05 | No submissions / dormant SOE | M | Empty states on queues |
| EDGE-06 | Board vacancies / audit-heavy | M | Scenario filter narratives |

## PERF (frontend-only)

| ID | Case | Type | Expected |
|---|---|---|---|
| PERF-01 | Initial load | M | Acceptable on laptop |
| PERF-02 | Role switch | M | Portal redirect without hang |
| PERF-03 | Map interaction | M | Pan/zoom usable |
| PERF-04 | Large table scroll | M | Sticky col remains usable |
