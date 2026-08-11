# Phase 24 — Demo Scripts

Canonical machine-readable scripts: `src/mock-data/validationRounds.ts`  
In-app: `/soe/stakeholder-validation`  
Legacy finance detail: `Docs/Phases Guide/SOE_GAIP_Phase_5_Demo_Script.md`

**Default cast context:** PSM (`org-psm`) · FY2027 (`period-fy2027`) · RC1 · latency none

---

## Script R1 — Shell & portals

1. Focal → `/soe/dashboard` — task-first SOE home  
2. MoIP Reviewer → `/moip/dashboard` — review psychology  
3. Secretary → `/secretary/critical` — exception-first  
4. Minister → `/minister/dashboard` — strategy + read-only  
5. PMO → `/pmo/dashboard` — national summary, no ops controls  

## Script R2 — Finance golden workflow

```text
Finance Officer → Complete FY2027
→ CFO Certifies
→ Submit
→ MoIP Requests Clarification
→ SOE Responds
→ MoIP Approves / Locks
→ Minister KPI updates (approved data only)
```

Checks: FO cannot certify · drafts absent from Minister KPIs · locked pack read-only · history/version visible

## Script R3 — Modules

Enterprise profile → Asset registry + evidence → Workforce → Board/governance → Documents/lineage

## Script R4 — MoIP review

Submissions queue → Analyst portfolio (no Approvals nav) → Approvals/lock → Tasks/early warning

## Script R5 — Executive

Secretary dashboard/critical → Minister dashboard → Portfolio drill-down + lineage

## Script R6 — Intelligence

National asset map filters + list → Intelligence scorecard/risk → Structured search → Minister reports → PMO indicators

## Script R7 — Acceptance

SOE readiness coherence → MoIP approvals model → Minister questions → PMO reports → classify residuals

---

## Asset example journey (optional deep-dive)

```text
Asset Officer → Add / open Land Asset → Attach Evidence
→ MoIP Reviews asset-linked submission or registry
→ Asset appears in GIS filters
→ Minister drills down from portfolio/map
```
