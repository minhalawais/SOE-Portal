# SOE-GAIP Frontend — Release Candidate Notes

## Candidate: SOE-GAIP-Frontend-RC1

| Field | Value |
|---|---|
| Identifier | `SOE-GAIP-Frontend-RC1` |
| Fixture version | `seed-2026.08.10-rc1-names` (display-name enrichment; IDs unchanged) |
| Package version | `0.1.0` (`package.json`) |
| Commit/tag | *Provisional — workspace not under git at freeze; stamp commit when tagging* |
| Build | `npm run build` (tsc + vite) |
| Test status | Automated suite green; no open Blocker/Critical for core workflows |
| QA plan | `Docs/QA/Phase_23_QA_Plan.md` |

---

## What this RC is for

Stable frontend-only prototype for **formal stakeholder validation** (Phase 24), with:

- Mock services + deterministic seed reset
- Documented Role × Permission matrix
- Golden finance workflow with cross-portal consequences
- GIS / search / reports / intelligence surfaces
- Phase 22 responsive + accessibility hardening retained

## What this RC is not

- Production backend, SSO, file storage, Excel parsing, email/SMS, or government API integrations
- Production digital signatures
- AI writes to authoritative records

## Known issues

See `Phase_23_Defect_Register.md` deferred items (scenario pack depth, Firefox/Safari matrix, full SR pass, non-critical placeholders).

## How to start a validation cycle

1. Deploy/run this RC build
2. Sign in via demo role switcher (simulated)
3. **SOE → Demo Controls → Begin QA cycle**
4. Copy baseline string into the execution log
5. Follow `Phase_23_Test_Case_Catalogue.md` + Phase 24 stakeholder scripts

## Approval statement (exit gate)

**Frontend Functional QA — Passed for Formal Stakeholder Validation** for RC1, subject to deferred prototype limitations above.

| Role | Name | Date | Sign-off |
|---|---|---|---|
| Frontend lead | | | ☐ |
| Product/MoIP sponsor | | | ☐ |
