# Phase 22 — Responsive Audit & Browser Test Record

**Project:** SOE-GAIP  
**Phase:** 22 Responsive, Accessibility and UX Hardening  
**Principle:** Harden existing UX; no visual redesign

---

## 1. Breakpoint audit summary

| Breakpoint | Target use | Findings → fixes |
|---|---|---|
| Desktop (≥1280) | Tables, review, GIS split | Retained dense ops layout; sticky table columns |
| Laptop (~1024–1280) | Day-to-day ops | Shell + filters wrap; GIS split at `lg` |
| Tablet (&lt;1024) | Executive + moderate forms | GIS defaults list-first; KPI/filter grids already stack; modals full-width padding |
| Mobile (&lt;768) | Alerts/tasks/summary | Mobile nav drawer + focus trap; table H-scroll hint; chart height reduce; toast width capped |

### Checked surfaces

- Sidebar collapse / mobile drawer  
- Page padding (`p-4` / `md:p-6`)  
- Toolbar / PageHeader action wrap  
- Table overflow + sticky first column  
- Form fields single-column by default (grids at `sm`/`lg` where already defined)  
- Modal max height + scroll body  
- Chart container height `220` → `260`  
- Map / list toggle + auto list-first below `lg`  
- KPI grids (existing responsive classes retained)  
- Filter bars wrap  

---

## 2. Table strategy (locked)

| Approach | When |
|---|---|
| Preserve `<table>` semantics | Always for operational registries |
| Horizontal scroll | Narrow viewports |
| Sticky first column(s) | Default `stickyColumnCount={1}` |
| Mobile hint copy | Below `md` |
| Card-per-row | Not used (phase prohibition) |
| Detail drawer / route | Existing detail patterns retained |

---

## 3. Terminology consistency (spot audit)

| Concept | Standard term | Notes |
|---|---|---|
| Period package send | Submit to MoIP | Submission readiness |
| Financial attestation | Certify | Simulated; not production e-sign |
| MoIP action | Return / Clarification / Approve | Existing workflow labels |
| Empty states | Short factual (“No records found.”) | No marketing fluff |
| Currency | `formatCurrencyPkr` | en-PK |
| Status labels | Central `statusCatalog` | No color-only |

No new vocabulary introduced in Phase 22.

---

## 4. Browser / environment test record

Record actual validation performed in the development environment. Stakeholder IT may extend.

| Browser / engine | Version (dev machine) | Desktop ops | Tablet width | Mobile width | Keyboard | Notes |
|---|---|---|---|---|---|---|
| Chromium (Vite / Cursor) | Current embedded Chromium / Edge Chromium family | Smoke + unit suite | Simulated via resize | Simulated via resize | Skip, modal trap, fields | Automated suite green |
| Firefox | Not run in this session | — | — | — | — | Provisional — schedule with MoIP IT |
| Safari | Not run in this session | — | — | — | — | Provisional — schedule with MoIP IT |

**Automated:** `vitest` suite including Phase 22 a11y unit tests.  
**Print:** Report Centre `window.print` + `@media print` hides shell chrome.

---

## 5. Severity backlog after hardening

| ID | Severity | Issue | Disposition |
|---|---|---|---|
| P22-01 | Critical | Modal/drawer without focus trap | Fixed |
| P22-02 | Critical | Form errors not `aria-describedby` | Fixed |
| P22-03 | Major | No skip link / main landmark id | Fixed |
| P22-04 | Major | Mobile nav Esc/focus incomplete | Fixed |
| P22-05 | Major | Route focus not moved to heading | Fixed |
| P22-06 | Major | Tables lose identity context on H-scroll | Fixed (sticky col) |
| P22-07 | Major | Charts without text summary | Fixed (default + explicit summaries) |
| P22-08 | Minor | Print chrome on reports | Fixed (print CSS) |
| P22-09 | Minor | GIS dense on tablet | Fixed (list-first &lt; lg) |

---

## 6. Stakeholder questions (from phase plan)

Deferred to MoIP validation workshop:

1. Which devices will officials actually use?  
2. Is tablet use expected for Minister/Secretary?  
3. Is mobile operational access required?  
4. Are there government accessibility standards to formally follow later?  
5. Which browsers are mandated by MoIP/NITB?
