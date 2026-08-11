# Phase 23 — Role × Permission Matrix

**Source of truth in code:** `src/permissions/index.ts`  
**Automated enforcement:** `src/qa/phase23.permissions.matrix.test.ts`

Portal psychology (do not mix):

| Portal | Roles | Intent |
|---|---|---|
| SOE | Focal, FO, HR, Asset, CS, Legal, Procurement, Internal Audit, CEO, CFO | What must I complete? |
| MoIP | Reviewer, Analyst, Supervisor | Review → Compare → Query → Approve → Escalate |
| Secretary | Secretary | What requires my attention? |
| Minister | Minister | Strategic portfolio + drill-down |
| PMO | PMO | National strategic summary only |
| Assurance | Assurance user | Controlled read / evidence trace |

---

## Critical boundaries (must pass)

| Role | Must have | Must not have |
|---|---|---|
| SOE Focal Person | submit, finance edit | approve, sensitive personal |
| Finance Officer | finance edit | certify, approve |
| CFO | certify, finance edit | approve (MoIP) |
| CEO | certify, submit | approve (MoIP) |
| HR Officer | workforce edit, sensitive personal | approve |
| MoIP Reviewer | review, approve, clarification | SOE certify |
| MoIP Analyst | portfolio/finance read | approve, submit |
| Secretary | executive dashboard, portfolio | approve, submit, finance edit |
| Minister | executive dashboard, portfolio | approve, submit, finance/asset edit |
| PMO | executive dashboard, portfolio | approve, review, finance edit, clarification |
| Assurance | document/org read | approve, finance edit, upload |

---

## Sensitive fields

| Permission | Allowed roles (prototype) |
|---|---|
| `sensitive.personal.read` | HR Officer, Company Secretary (+ System Admin) |
| `sensitive.remuneration.read` | HR Officer, Company Secretary, CEO (+ System Admin) |

---

## Execution notes

- Demo role switcher in TopBar exercises portal redirect via `getPortalForRole`.
- Navigation visibility uses `filterNavigation` + `hasPermission`.
- Retest this matrix after any permission map change (regression Critical).
