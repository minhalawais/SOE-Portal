# Phase 22 — Accessibility Test Matrix

**Project:** SOE-GAIP (frontend-only prototype)  
**Scope:** Keyboard, focus, labels, contrast, responsive, zoom, SR semantics  
**Severity:** Blocker / Critical / Major / Minor

---

## Component / surface matrix

| Surface | Keyboard | Focus | Labels / SR | Contrast | Responsive | Zoom (200%) | Result |
|---|---|---|---|---|---|---|---|
| App shell + skip link | Tab to skip → main | Skip visible on focus | `#main-content` landmark | Navy/blue focus ring | Drawer &lt; md | Main readable | Pass (hardened) |
| Sidebar (desktop) | Nav links | Focus-visible | Nav labels | White on navy | Hidden &lt; md | OK | Pass |
| Mobile nav drawer | Tab trap, Esc | Open → first control; close restore | `aria-modal`, titled | White on navy | &lt; md only | OK | Pass (hardened) |
| Modal / Confirm / Drawer | Tab trap, Esc | Initial + restore | `aria-labelledby` | Modal surface | Full-width mobile | OK | Pass (hardened) |
| PageHeader / RouteFocus | n/a | Route → `h1` | Single `h1` per page | Navy heading | Title wraps | OK | Pass (hardened) |
| Text / Select / Textarea | Tab order | Focus ring | `htmlFor`, `aria-invalid`, `aria-describedby` | Critical text + border | 1-col mobile | OK | Pass (hardened) |
| StatusBadge | n/a | n/a | Always text label + icon | Soft tone + text | Wraps | OK | Pass |
| DataTable | Sort buttons, pagination | Sticky header/col | `scope=col`, filter label | Ink on white | H-scroll + sticky col + mobile hint | OK | Pass (hardened) |
| ChartContainer | n/a | n/a | Title + sr-only summary; optional data table | Chart colors secondary | Height adapts | OK | Pass (hardened) |
| GIS map workspace | Filters, map/list toggle | Drawer trap | List as map alternative | Legend + badges | Auto list-first &lt; lg | OK | Pass (hardened) |
| Report preview | Actions, print | Standard | Print hides chrome | Ink | Stacks | OK | Pass (print CSS) |
| Toast region | Dismiss | n/a | `aria-live=polite` | Card surface | Width capped | OK | Pass (hardened) |

---

## Primary workflow keyboard checks

| Workflow | Portal | Expected | Status |
|---|---|---|---|
| Open mobile nav → navigate → close | All | Esc/backdrop; focus restore | Pass |
| Confirm submission dialog | SOE | Trap; Esc cancels; focus restore | Pass |
| Filter + table sort | Ops tables | Keyboard operable controls | Pass |
| GIS select asset → drawer | GIS | List alternative; Esc closes drawer | Pass |
| Report print | Reports | `window.print`; chrome hidden | Pass (CSS) |

---

## Open / provisional

| Item | Severity | Notes |
|---|---|---|
| Full NVDA/JAWS pass on all portals | Major | Not automated in this phase; matrix is the harness for stakeholder/IT validation |
| Mandated MoIP/NITB browser list | Minor | Record actual versions in browser test record when IT confirms |
| Column priority hide (per-table) | Minor | Sticky first column + H-scroll used as standard strategy; not card-every-row |

---

## Exit alignment

- Keyboard access for primary workflows: addressed  
- Focus + form errors associated: addressed  
- Statuses not color-only: StatusBadge text labels  
- Critical responsive/a11y defects from audit: resolved in Phase 22 hardening
