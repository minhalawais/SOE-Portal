# SOE-GAIP Frontend Architecture (Phase 1)

## Purpose

Technical foundation for the frontend-only SOE-GAIP prototype. Business modules deepen from Phase 2 onward; Phase 1 proves shell, permissions, mock services, forms, tables, GIS/chart wrappers, and portal routing.

## Data flow

```text
Page
  → TanStack Query / mutation
    → mock-*Service (interface-compatible)
      → mock-data / in-memory db
```

Later: swap mock implementation for API client without redesigning pages.

## State separation

| Kind | Tool | Examples |
|---|---|---|
| Domain/query | TanStack Query | organizations, assets, finance |
| Global UI/session | Zustand | role, org, period, sidebar, toasts |
| Local UI | React state | table search, selected map feature |

## Permissions

`src/permissions` maps `RoleId → Permission[]` and `RoleId → PortalId`. Navigation filters by permission. Screens use `RequirePermission`.

## Workflow

`src/workflow/submission.ts` encodes allowed submission transitions from the Phase 0 status dictionary. Full certification/review UX is Phase 5+.

## Design

Tokens live in `src/index.css` (`@theme` + CSS variables) sourced from `SOE-GAIP-DESIGN-SYSTEM.md`. Do not invent alternate palettes.

## Feature flags

`src/app/config/app.config.ts` controls demo defaults and portal enablement (`ENABLE_PMO_PORTAL`, `ENABLE_ASSURANCE_PORTAL`).
