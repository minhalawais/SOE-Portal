# Phase 23 — Frontend Functional QA Plan

**Product:** SOE-GAIP  
**Stage:** Frontend-only stakeholder validation prototype  
**Release candidate:** `SOE-GAIP-Frontend-RC1`  
**Fixture version:** `seed-2026.08.10-rc1-names`

---

## 1. Objective

Test the complete frontend as if it were production software, while retaining mock services and dummy data. Confirm navigation, permissions, workflows, modules, dashboards, GIS, search, reports, responsive/a11y, edge cases, and cross-portal consequences before formal stakeholder validation.

## 2. Environments

| ID | Name | Use |
|---|---|---|
| `local_development` | Local Vite | Developer + automated suite |
| `shared_qa_demo` | Shared QA/demo build | Team execution cycles |
| `stakeholder_uat` | Stakeholder/UAT build | Formal validation (Phase 24) |

All stakeholder sessions must use a versioned RC build with a recorded fixture version.

## 3. Test data baseline (every cycle)

Before each cycle:

1. Open **SOE → Demo Controls** (or call `beginQaCycle`)
2. Reset demo data
3. Select known scenario filter (or All)
4. Record: fixture version, reporting period, organization, test role, RC id
5. Set latency to `none` for deterministic automated runs

## 4. Scope

### In scope
- All portals: SOE, MoIP, Secretary, Minister, PMO, Assurance
- Navigation, permissions, forms, tables, workflows
- Documents, GIS, search, reports, intelligence/dashboards
- Cross-portal simulated consequences
- Responsive + accessibility regression (Phase 22)
- Edge cases and frontend performance hotspots
- Defect register, regression record, RC notes

### Out of scope
- Real backend/database/auth/storage/APIs
- Backend load testing
- New product modules or redesign
- Guided tour / presentation mode (Phase 24)

## 5. Severity model

| Severity | Definition |
|---|---|
| Blocker | Prevents core workflow/demo |
| Critical | Major workflow, permission, data-integrity, or a11y failure |
| Major | Important functionality impaired |
| Minor | Cosmetic / low impact |

## 6. Regression strategy

After any fix:

1. Retest affected case
2. Rerun related workflow
3. Portal navigation smoke
4. Permission boundary checks
5. Core Golden Workflow (finance certify → submit → review → approve → lock)

Automated smoke: `npm test` (includes `src/qa/phase23.*.test.ts`).

## 7. Exit gate

Phase 23 passes when:

- No open Blockers
- No unresolved Criticals on core stakeholder workflows
- Major workflows + role boundaries pass
- KPI/dashboard data reconciles on golden path
- GIS / search / reports function as intended
- Critical responsive/a11y issues remain resolved
- Stable RC approved for stakeholder validation

## 8. Deliverable index

| # | Artifact |
|---|---|
| 1 | This QA Plan |
| 2 | `Phase_23_Test_Case_Catalogue.md` |
| 3 | `Phase_23_Role_Permission_Matrix.md` |
| 4 | `Phase_23_Workflow_Tests.md` |
| 5 | `Phase_23_Defect_Register.md` |
| 6 | `Phase_23_Regression_Record.md` |
| 7 | `Phase_23_Release_Candidate_Notes.md` |
| 8 | Automated suites under `src/qa/` |
