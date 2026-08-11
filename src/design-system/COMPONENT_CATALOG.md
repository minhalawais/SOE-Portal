# SOE-GAIP Design System — Component Catalog

**Source of truth for visuals:** `Docs/Designing Guide/SOE-GAIP-DESIGN-SYSTEM.md`  
**Source of truth for density/restraint:** `Docs/Designing Guide/FOS-UI-UX-INSTRUCTIONS.md`  
**Live gallery:** `/soe/design-system`

## Tokens

Import from `@/design-system/tokens` or `@/design-system`.

| Token group | Purpose |
|---|---|
| `color` | Navy / Blue / Teal / surfaces / status |
| `spacing` | 4–64px scale + page/section/card |
| `radius` | sm / control / card / feature / modal / pill |
| `shadow` | xs / sm / card / modal / focus |
| `typography` | page/section/card/body/table/kpi |
| `size` | control heights, sidebar, chart |
| `motion` | fast / normal / slow |
| `zIndex` | dropdown → tooltip |
| `statusCatalog` | Government status families |

**Prohibited:** inventing hex values or status labels in feature modules.

## Foundations

- `Stack`, `Inline`, `Surface`
- `PageTitle`, `SectionTitle`, `CardTitle`, `LabelText`, `HelperText`

## Actions

- `Button` — primary / secondary / tertiary / destructive / teal; sm/md/lg; loading
- `IconButton` — requires `aria-label` via `label` prop

**Usage:** one primary CTA per section. Certify / Approve / Submit should use `ConfirmDialog`.

## Forms

- `TextField`, `CurrencyField`, `PercentField`, `DateField`
- `SelectField`, `TextareaField`, `CheckboxField`, `RadioGroup`
- `ReadOnlyValue`, `MockFileControl`

Every field supports label, required, hint, error. Prefer these over raw inputs.

## Status

- `StatusBadge` — color + text + icon (never color alone)
- `StatusLegend` — family preview
- Families: approval, certification, reporting, risk, compliance, dataQuality, evidence, deadline

## Data display

- `Card`, `Panel`
- `KpiValue`, `KpiWithTrend`, `KpiWithStatus`, `KpiComparison`, `KpiProgress`, `KpiRisk`, `KpiGrid`, `KpiCard`
- `ChartContainer`
- `DataTable` (`@/components/tables/DataTable`) — sticky header, sort, search, pagination, density
- `FilterBar` — search, filters, chips, clear all

## Navigation & overlays

- `Tabs`, `Breadcrumbs`, `Pagination`
- `Modal`, `Drawer`, `Tooltip`, `ConfirmDialog`
- Shell: `Sidebar`, `TopBar`, `AppShell`, `PageHeader`

## Feedback

- `Alert`, `EmptyState`, `LoadingBlock`, `SkeletonTable`, `ErrorState`
- Toasts via `useUiStore`

## Accessibility rules

- Visible `:focus-visible`
- Status never color-only
- Dialogs/drawers support Escape + labelled close
- Icon-only controls require labels
- Charts need accessible summary text
- Prefer reduced motion respected in CSS

## Responsive rules

- Desktop/laptop first
- KPI grids collapse 4 → 2 → 1
- Tables scroll horizontally; do not force 10-column registries onto mobile
- Executive portals stay summary-oriented on small screens

## Prohibited usage

- Purple/gradient/glass/neon aesthetics
- Marketing copy on portal chrome
- Nested card spam
- White text on Warning Amber
- Ad-hoc status strings that bypass `statusCatalog` when a family exists
- Building final business dashboards inside the design-system gallery
