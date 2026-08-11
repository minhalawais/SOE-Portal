# SOE-GAIP Portal Route Map (Phase 3)

Configuration source: `src/app/config/navigation.ts`

## Namespaces

| Portal | Base path | Home | Org switch | Edit chrome |
|---|---|---|---|---|
| SOE | `/soe/*` | `/soe/dashboard` | Locked to assigned org (demo) | Yes |
| MoIP | `/moip/*` | `/moip/dashboard` | Yes | No (review) |
| Secretary | `/secretary/*` | `/secretary/dashboard` | Portfolio | No |
| Minister | `/minister/*` | `/minister/dashboard` | Portfolio | No |
| PMO | `/pmo/*` | `/pmo/dashboard` | Portfolio | No |
| Assurance | `/assurance/*` | `/assurance/dashboard` | Yes (limited) | No |

## Role → portal

| Role | Portal |
|---|---|
| SOE operational + CEO/CFO | SOE |
| MoIP Reviewer / Analyst / Supervisor | MoIP |
| Secretary | Secretary |
| Minister | Minister |
| PMO | PMO |
| Assurance User | Assurance |

## Implemented vs shell

**Implemented (deeper than placeholder):**
- `/soe/dashboard`, `/soe/reporting`, `/soe/clarifications`, `/soe/validation`, `/soe/readiness`, `/soe/search`
- `/soe/documents`, enterprise / people / accountability / industrial / privatization modules
- `/soe/organizations`, `/soe/assets/registry` (+ import simulation)
- `/soe/finance` (+ form, review, certify, clarification, history, loans)
- `/soe/tasks`, `/soe/map`, `/soe/design-system`, `/soe/demo-controls`, `/soe/foundation`
- `/moip/submissions`, `/moip/submissions/:submissionId`
- `/minister/dashboard`, `/minister/finance/:organizationId`
- Landing dashboards for all portals

**Shell placeholders:** all other configured nav leaf routes render `ModulePlaceholderPage` with org/period context.

## Unauthorized access

- Wrong portal namespace for current role → redirect to that role’s home
- Missing permission on a gated screen → Access denied state
- Unknown path → Not found

## Feature flags

- `APP_CONFIG.ENABLE_PMO_PORTAL`
- `APP_CONFIG.ENABLE_ASSURANCE_PORTAL`
- Per-item `enabled: false` → Feature not enabled state
