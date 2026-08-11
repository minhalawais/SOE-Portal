# Phase 24 — Stakeholder Validation Plan

**Product:** SOE-GAIP frontend prototype  
**Build under validation:** `SOE-GAIP-Frontend-RC1`  
**Fixture:** `seed-2026.08.10-rc1-names`  
**Facilitator tooling:** `/soe/stakeholder-validation` · `/soe/demo-controls`

---

## 1. Objective

Validate the complete frontend progressively with business owners and decision-makers. Every material comment is recorded, classified, resolved, or explicitly deferred. No uncontrolled scope growth mid-session.

## 2. Principles

- Validate workflows, not appearance alone
- Use realistic demo scenarios (PSM · FY2027 default)
- Show role-specific experiences via demo role switcher
- Record exact decisions
- Distinguish defects from new requirements
- Obtain explicit acceptance for major product decisions

## 3. Validation rounds

| Round | Focus | Start route | Primary roles |
|---|---|---|---|
| R1 | Shell, portals, navigation | `/soe/dashboard` | Focal, MoIP Reviewer, Secretary, Minister, PMO |
| R2 | SOE submission workflow | `/soe/finance` | FO, Focal, CFO, MoIP Reviewer |
| R3 | Core business modules | `/soe/enterprise/profile` | Focal, Asset, HR, CS |
| R4 | MoIP review workflow | `/moip/submissions` | Reviewer, Analyst, Supervisor |
| R5 | Secretary & Minister | `/secretary/dashboard` | Secretary, Minister |
| R6 | GIS / intelligence / search / reports | `/moip/assets/map` | Analyst, Minister, PMO, Asset |
| R7 | Full-system acceptance | `/soe/dashboard` | All core roles |

Scripts live in code (`src/mock-data/validationRounds.ts`) and `Phase_24_Demo_Scripts.md`.

## 4. Session preparation checklist

- [ ] Agenda (see Session Agendas)
- [ ] Target roles confirmed
- [ ] Decisions required listed
- [ ] Demo scenario / org / period set
- [ ] Stable RC build identified
- [ ] Decision log owner assigned
- [ ] Issue-capture owner assigned
- [ ] Round prepared via facilitator page (**Prepare round**)

## 5. Classification

**Outcome:** Accepted · Change Required · New Requirement · Out of Scope · Future Phase  

**Type:** Defect · UX Improvement · Business Rule Change · Data Requirement Change · Permission Change · Terminology Change  

**Priority:** P0 · P1 · P2 · P3 (only Accepted items enter backlog)

## 6. Change control

```text
Request → Clarify → Classify → Assess Impact → Approve / Defer / Reject → Implement → Revalidate
```

Do not code new requirements during the session.

## 7. Environments

| Environment | Use |
|---|---|
| `stakeholder_uat` | Formal rounds (preferred) |
| `shared_qa_demo` | Dry runs |
| `local_development` | Facilitator rehearsal |

## 8. Exit gate

- All rounds completed or formally waived
- Material comments resolved or categorized
- P0/P1 accepted changes completed/revalidated
- Future-phase items documented
- Stakeholder acceptance recorded for frontend product definition

## 9. Provisional scheduling note

**PD-024-001 (provisional):** Live workshop calendar is owned by project governance. This Phase 24 implementation delivers the facilitation pack, scripts, registers, and in-app tooling required to conduct rounds against RC1. Round completion status is tracked in the Acceptance Record / Session Minutes.
