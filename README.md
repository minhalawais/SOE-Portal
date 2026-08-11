# SOE-GAIP

**State-Owned Enterprises Governance, Asset & Performance Intelligence Platform**

SOE-GAIP is a modern oversight and reporting application for State-Owned Enterprises under the Ministry of Industries and Production. It brings SOE registry data, submissions, assets, finance, governance, compliance, industrial performance, documents, MoIP review workflows, and executive intelligence into one structured workspace.

The current repository contains a frontend implementation with mock services and fixture data, designed to validate workflows, roles, dashboards, and module structure before backend integration.

## Product Scope

SOE-GAIP is built around three major operating surfaces:

- **SOE Management & Submission:** enterprise-level data entry, evidence management, validation, certification, and submission workflows.
- **MoIP Oversight & Review:** submission queue, module-by-module review, approvals, SOE registry administration, and user management.
- **Executive Viewer:** Secretary, Minister, and PMO dashboard lenses for operational monitoring, strategic portfolio intelligence, and national command views.

## Key Capabilities

- Comprehensive SOE master registry
- Enterprise profile, ownership, subsidiaries, and locations
- Asset and property registry with GIS-enabled map views
- Workforce, board governance, and executive management
- Finance, loans, grants, subsidies, guarantees, and fiscal exposure
- Procurement, audit, PAC observations, litigation, and compliance
- Industrial performance and transformation tracking
- Evidence repository with submission history and audit trail
- MoIP review queue with approve/return workflows
- SOE and user administration for MoIP Reviewer
- Role-based navigation and permission enforcement
- Modern executive dashboards for SOE, MoIP, Secretary, Minister, and PMO
- Responsive layout, reusable design system, charts, tables, and status components

## Tech Stack

| Layer | Technology |
| --- | --- |
| App framework | React 19 + Vite |
| Language | TypeScript |
| Routing | React Router |
| Server state | TanStack Query |
| Local state | Zustand |
| Forms | React Hook Form + Zod |
| Tables | TanStack Table |
| Charts | Recharts |
| Maps | Leaflet / React Leaflet + custom SVG map components |
| Styling | Tailwind CSS v4 |
| Icons | Lucide React |
| Testing | Vitest + Testing Library |
| Linting | ESLint |

## Getting Started

### Prerequisites

- Node.js 22 or newer recommended
- npm

### Install

```bash
npm install
```

### Run Locally

```bash
npm run dev
```

Open:

```text
http://localhost:5173
```

### Local Sign-In

The current frontend uses local authentication behavior for workflow validation.

```text
SOE user:
focal@pidc.gov.pk
Password123
```

```text
MoIP Reviewer:
reviewer@moip.gov.pk
Password123
```

For MFA, use any six-digit code:

```text
123456
```

Role routing is inferred from the email address in the local implementation. For example, `@moip.gov.pk` opens the MoIP Reviewer experience.

## Scripts

```bash
npm run dev
```

Start the local Vite development server.

```bash
npm run build
```

Run TypeScript build checks and create a production bundle.

```bash
npm run test
```

Run the Vitest suite.

```bash
npm run test:watch
```

Run tests in watch mode.

```bash
npm run lint
```

Run ESLint.

```bash
npm run preview
```

Preview the production build locally.

## Application Structure

```text
src/
  app/             routing, providers, navigation config
  components/      app shell, layout, workflow chrome
  constants/       central domain vocabularies and statuses
  design-system/   reusable UI components and design tokens
  mock-data/       fixture records for local workflows
  mock-services/   service interfaces and mock implementations
  permissions/     role permission matrix and portal routing
  portals/         SOE, MoIP, executive, PMO, assurance pages
  state/           session, UI state, persistence
  test/            test setup
  types/           domain models
  utils/           shared helpers
  workflow/        module catalogues, validation, KPIs, transitions
```

## Role Model

The app uses role-based navigation and permissions.

| Role | Purpose |
| --- | --- |
| SOE Contributor | Primary SOE data entry and coordination user |
| SOE Certifier | Compliance and evidence certification workspace |
| SOE Executive | Enterprise-level executive dashboard and read-only intelligence |
| MoIP Reviewer | Review submitted data, manage SOEs, manage users, approve or return submissions |
| MoIP Supervisory Officer | Portfolio oversight, review supervision, escalations, and registry control |
| Executive Viewer | Unified Secretary, Minister, and PMO dashboard lenses |

Legacy Secretary, Minister, and PMO entries are treated as Executive Viewer lenses rather than separate operational portals.

## Main Modules

### SOE Workspace

- Dashboard
- Submission validation and readiness
- Clarifications
- Enterprise profile
- Assets and property
- People and governance
- Finance and fiscal
- Accountability and compliance
- Industrial performance
- Privatization and transformation
- Documents and evidence
- Tasks and alerts

### MoIP Workspace

- Review and portfolio command dashboard
- Submission queue
- SOE review packages
- Portfolio module views across all SOEs
- Clarifications and approvals
- SOE management
- User management
- Validation and readiness monitoring
- National asset map
- Reports and search intelligence

### Executive Viewer

- Secretary View: operational monitoring, compliance, escalations, audit/legal, and pending decisions
- Minister View: strategic portfolio performance, fiscal exposure, assets, governance risk, and transformation
- PMO View: national strategic command dashboard, map, search, and strategic reports

## Architecture Notes

SOE-GAIP currently follows a frontend-service-fixture architecture:

```text
React UI
  -> TanStack Query hooks
  -> mock service interfaces
  -> mock data fixtures
  -> domain utilities and workflow rules
```

Important architecture conventions:

- Use `src/constants` for controlled statuses and domain vocabularies.
- Use `src/permissions` for all permission checks.
- Use `RequirePermission` and `hasPermission` for gated actions.
- Keep route/navigation definitions in `src/app/config/navigation.ts`.
- Keep reporting module ownership in `src/workflow/moduleCatalog.ts`.
- Avoid hardcoded domain arrays inside page components.
- Use design-system primitives before creating page-specific UI.

## Documentation

Core documents live in `Docs/`:

- `Docs/SOE oversight portal.md`
- `Docs/System Architecture Document.md`
- `Docs/Functional Requirements Specification.md`
- `Docs/Data Requirements & Reporting Framework.md`
- `Docs/Portal Route Map.md`
- `Docs/Frontend Architecture Notes.md`
- `Docs/Designing Guide/SOE-GAIP-DESIGN-SYSTEM.md`

QA and validation artifacts are under `Docs/QA/`.

## Quality Checks

Before opening a pull request, run:

```bash
npm run build
npm run lint
npm run test
```

For focused development, run targeted Vitest files, for example:

```bash
npx vitest run src/permissions/permissions.test.ts src/app/config/navigation.test.ts --pool forks
```

## Current Implementation Status

This repository is a frontend validation build. It includes:

- Production-style React architecture
- Rich module coverage
- Role-based portal shells
- Mock workflow mutations
- Local persistence
- Local sign-in flow
- Mock data and service interfaces

Backend API integration, real identity provider integration, production database storage, digital signature integration, and government system integrations are intended follow-on implementation layers.

## License

This project is prepared for SOE-GAIP application development and stakeholder validation. Add the final license terms before public distribution.
