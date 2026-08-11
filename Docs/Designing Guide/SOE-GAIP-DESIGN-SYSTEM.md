# SOE-GAIP — Design & Styling System

**Version:** 1.0  
**Product:** State-Owned Enterprises Governance, Asset & Performance Intelligence Platform  
**Audience:** Human designers, frontend developers and AI coding agents  
**Purpose:** Reproduce a serious, production-grade government enterprise interface for SOE oversight, governance, asset intelligence, reporting and executive decision support — and prevent generic “vibe-coded” UI.

> **How to use this with AI**
>
> Attach this entire file at the start of any SOE-GAIP UI/build task and instruct the agent:
>
> **“Follow SOE-GAIP-DESIGN-SYSTEM.md strictly. Do not invent a new palette, layout language or visual style.”**

---

# 0. Non-Negotiable Design Philosophy

SOE-GAIP is a **Government of Pakistan enterprise governance, asset, financial and oversight platform**.

It must feel:

| Feel like | Never feel like |
|---|---|
| Institutional, authoritative and trustworthy | Startup marketing dashboard |
| Data-first and operational | Decorative analytics showcase |
| Government-grade enterprise software | Consumer fintech / ecommerce |
| Calm, precise and restrained | Flashy, playful or “AI-generated” |
| Suitable for officers, reviewers, auditors and executives | Generic SaaS admin template |
| Dense enough for real work | Oversized “presentation UI” |
| Strategic at executive level | Widget zoo |
| Evidence-led and traceable | Decorative charts with no operational meaning |

## Color budget per screen

- **Neutral surfaces and white space:** 78–84%
- **Deep Navy / Government Blue:** 10–15%
- **Teal accent:** 3–6%
- **Status / warning colors:** 2–4%

The product should feel primarily **navy + white + cool gray**, with teal used deliberately and status colors used only when they communicate state.

---

# 1. Absolute Bans — Anti–Vibe-Code Rules

AI agents and developers **MUST NOT** introduce the following unless formally approved.

## 1.1 Visual Bans

1. No purple, violet or indigo brand theme.
2. No purple-to-blue, purple-to-pink or mesh gradients.
3. No neon colors, glowing borders or “cyber” aesthetics.
4. No glassmorphism as a general layout system.
5. No oversized floating rounded cards everywhere.
6. No emoji in UI chrome, buttons, empty states or dashboards.
7. No startup-style blue `#3B82F6` primary theme.
8. No rainbow KPI cards.
9. No huge welcome banners on authenticated dashboards.
10. No decorative abstract blobs, waves, orbs or hero shapes inside operational portals.
11. No dark mode by default.
12. No full-screen saturated color sections inside operational portals.
13. No rounded-full pill spam.
14. No multiple colored sidebars across portals.
15. No dramatic multi-layer shadows.
16. No invented brand colors outside this document.
17. No white text on Warning Amber `#C58A19`.
18. No color-only risk or compliance states.
19. No oversized illustrations on login or dashboard screens.
20. No gradient KPI cards.

## 1.2 UX Bans

1. Do not place more than one primary action in one section/dialog.
2. Do not build dashboards as collections of 10–15 KPI cards.
3. Do not repeat the same information as title + badge + helper text + tooltip.
4. Do not add “smart insights” text unless it communicates an actual implemented insight.
5. Do not create fake AI assistant widgets.
6. Do not use marketing copy in portals.
7. Do not create onboarding tours unless explicitly requested.
8. Do not hide operational truth behind decorative cards.
9. Do not use charts where a table is clearer.
10. Do not force executive users through operational data-entry patterns.
11. Do not make every component visually prominent.
12. Do not use vague labels such as “Explore”, “Discover” or “Unlock”.
13. Do not invent workflows or statuses independently inside a screen.
14. Do not show inactive controls for features that do not exist.
15. Do not treat responsive design as simply shrinking desktop UI.

---

# 2. Canonical SOE-GAIP Color System

This palette is mandatory for SOE-GAIP.

## 2.1 Core Colors

| Role | Name | Hex | Primary Use |
|---|---|---|---|
| Primary Structure | Deep Navy | `#12304A` | Sidebar, strong headings, major structure |
| Primary Action | Government Blue | `#1D5D8F` | Primary CTA, selected actions, links |
| Secondary Accent | Institutional Teal | `#16877A` | Active indicators, secondary emphasis, progress |
| Page Canvas | Cool Off-White | `#F6F8FA` | Application background |
| Surface | White | `#FFFFFF` | Cards, forms, dialogs, tables |
| Primary Text | Charcoal Navy | `#17212B` | Body copy, data values |
| Secondary Text | Slate | `#64748B` | Supporting labels, metadata |
| Border | Light Gray | `#DDE3E8` | Dividers, input borders, table lines |
| Success | Government Green | `#2E7D5A` | Approved, complete, healthy |
| Warning | Amber | `#C58A19` | Due soon, attention |
| Critical | Government Red | `#B84242` | Critical risk, overdue, rejected |
| Information | Institutional Blue | `#3B76A8` | Informational states |

---

# 2.2 Core Usage Rules

### Deep Navy `#12304A`

Use for:

- permanent sidebar
- primary headings
- high-authority navigation
- strong text accents
- major structural chrome

Do not fill large dashboard content areas with navy.

### Government Blue `#1D5D8F`

Use for:

- primary buttons
- active tabs
- primary links
- selected filters
- focused interactive states
- key chart series

This is the principal action color.

### Institutional Teal `#16877A`

Use for:

- secondary active indicators
- progress
- approved workflow emphasis where not status-specific
- map selections
- supporting chart series
- subtle active markers

Teal should remain restrained.

---

# 2.3 Semantic Status System

| Status | Strong | Soft Surface | Intended Meaning |
|---|---|---|---|
| Success | `#2E7D5A` | `rgba(46,125,90,0.10)` | Approved, complete, compliant |
| Warning | `#C58A19` | `rgba(197,138,25,0.12)` | Attention, due soon |
| Critical | `#B84242` | `rgba(184,66,66,0.10)` | Critical, overdue, rejected |
| Information | `#3B76A8` | `rgba(59,118,168,0.10)` | Informational |
| Neutral / Pending | `#64748B` | `rgba(100,116,139,0.10)` | Pending, inactive, unverified |

### Status law

Status must always use:

**color + text label + icon where useful**

Examples:

- `✓ Approved`
- `! Attention`
- `× Critical`
- `○ Pending`
- `i Information`

Never use a colored dot alone for governance status.

---

# 2.4 Ready CSS Tokens

```css
:root {
  /* Core Brand */
  --color-navy: #12304A;
  --color-blue: #1D5D8F;
  --color-teal: #16877A;

  /* Canvas & Surfaces */
  --color-background: #F6F8FA;
  --color-surface: #FFFFFF;
  --color-surface-subtle: rgba(18, 48, 74, 0.035);
  --color-surface-selected: rgba(29, 93, 143, 0.08);
  --color-surface-teal: rgba(22, 135, 122, 0.08);

  /* Text */
  --color-text-primary: #17212B;
  --color-text-secondary: #64748B;
  --color-text-inverse: #FFFFFF;
  --color-heading: #12304A;
  --color-link: #1D5D8F;

  /* Borders */
  --color-border-default: #DDE3E8;
  --color-border-subtle: rgba(221, 227, 232, 0.72);
  --color-border-focus: #1D5D8F;

  /* Status */
  --color-success: #2E7D5A;
  --color-warning: #C58A19;
  --color-critical: #B84242;
  --color-info: #3B76A8;
  --color-pending: #64748B;

  /* Soft Status */
  --color-success-soft: rgba(46, 125, 90, 0.10);
  --color-warning-soft: rgba(197, 138, 25, 0.12);
  --color-critical-soft: rgba(184, 66, 66, 0.10);
  --color-info-soft: rgba(59, 118, 168, 0.10);
  --color-pending-soft: rgba(100, 116, 139, 0.10);
}
```

---

# 3. Typography

## 3.1 Font Stack

| Role | Font | Weights |
|---|---|---|
| UI / Body / Headings | **Inter** | 400, 500, 600, 700 |
| IDs / Codes / Logs | **Roboto Mono** or **JetBrains Mono** | 400, 500 |

```css
--font-family-base: 'Inter', -apple-system, BlinkMacSystemFont,
  'Segoe UI', Roboto, Helvetica, Arial, sans-serif;

--font-family-mono: 'Roboto Mono', 'JetBrains Mono', monospace;
```

Use:

```css
-webkit-font-smoothing: antialiased;
```

---

# 3.2 Operational Type Scale

| Element | Target |
|---|---|
| Page Title | 22–28px |
| Executive Page Title | 24–30px |
| Section Title | 16–20px |
| Card Title | 14–16px |
| Body | 14px |
| Table Body | 13–14px |
| Labels | 12–13px |
| Meta / Badges | 11–12px |
| KPI Value | 26–36px |
| KPI Label | 11–12px |

### Typography rules

- Page headings use Deep Navy `#12304A`.
- Body text uses Charcoal Navy `#17212B`.
- Secondary information uses Slate `#64748B`.
- Operational screens should not use `text-4xl` or larger headings.
- Executive KPI numbers may be larger but must not dominate the whole screen.
- Use slightly tighter letter spacing on headings.
- Body line-height: 1.45–1.6.
- Heading line-height: 1.2–1.3.

---

# 4. Spacing, Radius, Elevation and Motion

## 4.1 Spacing Scale

Use an 8px-based rhythm:

`4 · 8 · 12 · 16 · 20 · 24 · 32 · 40 · 48 · 64`

Recommended:

| Use | Value |
|---|---|
| Tight inline gap | 4–8px |
| Control gap | 8–12px |
| Component gap | 16px |
| Card padding | 16–20px |
| Section gap | 20–24px |
| Page padding | 20–32px |

SOE-GAIP is a dense operational platform. Avoid large empty regions.

---

# 4.2 Radius

| Token | Value | Use |
|---|---|---|
| Small | 6px | Tags, compact controls |
| Control | 8px | Inputs, buttons |
| Card | 10–12px | Panels, cards |
| Feature | 14px | Large executive blocks |
| Modal | 14–16px | Dialogs |
| Pill | 9999px | Status badges only |

### Rule

Operational government UI should look structured, not “soft toy” rounded.

Avoid `rounded-2xl` / `rounded-3xl` everywhere.

---

# 4.3 Shadows

Use subtle neutral/navy-tinted shadows:

```css
--shadow-xs: 0 1px 2px rgba(18, 48, 74, 0.04);
--shadow-sm: 0 2px 5px rgba(18, 48, 74, 0.06);
--shadow-card: 0 4px 12px rgba(18, 48, 74, 0.07);
--shadow-card-hover: 0 6px 16px rgba(18, 48, 74, 0.10);
--shadow-modal: 0 18px 42px rgba(18, 48, 74, 0.16);
--shadow-focus: 0 0 0 3px rgba(29, 93, 143, 0.18);
```

Avoid strong floating-card effects.

---

# 4.4 Motion

| Token | Duration |
|---|---|
| Fast | 120–150ms |
| Normal | 200–250ms |
| Slow | 300ms |

Easing:

```css
cubic-bezier(0.4, 0, 0.2, 1)
```

Motion should be used for:

- hover
- focus
- drawer
- modal
- tab
- map selection

Do not animate KPIs continuously.

Respect `prefers-reduced-motion`.

---

# 4.5 Control Heights

| Control | Height |
|---|---|
| Button Small | 32px |
| Button Standard | 38–40px |
| Button Large | 44px |
| Input | 40–44px |
| Dense Table Row | 44–48px |
| Standard Table Row | 50–54px |
| Table Header | 44–48px |

---

# 5. Core Application Layout

## 5.1 Standard Operational Shell

```text
┌───────────────┬─────────────────────────────────────────────┐
│               │ Top bar / context / user                   │
│  Sidebar      ├─────────────────────────────────────────────┤
│  252–272px    │ Page title + scope + actions               │
│  #12304A      │ Filters / controls                         │
│               │ KPI / summary                              │
│               │ Charts / tables / workspace                │
│               │                                             │
└───────────────┴─────────────────────────────────────────────┘
```

### Sidebar

- Background: `#12304A`
- Default text/icons: white at restrained opacity
- Hover: subtle white overlay
- Active: Government Blue `#1D5D8F`
- Active indicator: Institutional Teal `#16877A`
- Dividers: `rgba(255,255,255,0.10)`
- Width: 252–272px

The sidebar should remain consistent across SOE and MoIP operational portals.

---

# 5.2 Top Bar

- White background
- Bottom border `#DDE3E8`
- Compact height
- Breadcrumb/context
- Organization selector
- Reporting period selector
- Notifications
- User / Demo Role switcher

No large greetings.

---

# 5.3 Executive Shell

Secretary, Minister and PMO views should remain visually related to the core application but with:

- reduced navigation density
- more concise summary blocks
- fewer editable controls
- larger strategic hierarchy
- stronger exception and decision emphasis

Do not introduce a new color scheme for executive portals.

---

# 5.4 Dashboard Information Architecture

Default order:

1. **Page title + context**
2. **Filters / reporting period / organization**
3. **3–6 KPIs**
4. **1–3 primary charts**
5. **Actionable list or table**
6. **Secondary analytics**
7. **Evidence / drill-down**

Operational dashboards must contain actionable data.

---

# 5.5 Forms

- White surface on `#F6F8FA`
- Labels above fields
- Border `#DDE3E8`
- Focus border `#1D5D8F`
- Focus ring using Government Blue soft opacity
- Error `#B84242`
- Related fields grouped into logical sections
- One primary submit action
- Multi-step forms only when the workflow is genuinely multi-step

---

# 5.6 Tables

| Element | Style |
|---|---|
| Header Background | subtle navy tint / `#F6F8FA` |
| Header Text | `#12304A` |
| Row Text | `#17212B` |
| Secondary Text | `#64748B` |
| Dividers | `#DDE3E8` |
| Hover | subtle blue/navy tint |
| Selected | `rgba(29,93,143,0.08)` |
| Critical Accent | `#B84242` |
| Warning Accent | `#C58A19` |

### Rules

- Do not paint whole rows in strong status colors.
- Use left border, badge or text emphasis.
- Align numbers right.
- Use tabular numerals where possible.
- Use sticky headers on long operational tables.

---

# 6. Component System

## 6.1 Buttons

| Type | Background | Text | Border |
|---|---|---|---|
| Primary | `#1D5D8F` | `#FFFFFF` | none |
| Secondary | `#FFFFFF` | `#1D5D8F` | `#1D5D8F` |
| Tertiary | transparent | `#1D5D8F` | none |
| Destructive | `#B84242` | `#FFFFFF` | none |
| Teal Accent | `#16877A` | `#FFFFFF` | none |

Primary actions:

- Submit
- Approve
- Certify
- Save
- Create

Use one primary CTA per region/dialog.

---

# 6.2 Cards

```css
.soe-card {
  background: #FFFFFF;
  border: 1px solid #DDE3E8;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(18, 48, 74, 0.07);
  padding: 18px;
}
```

Cards are for:

- KPIs
- grouped decision information
- executive summaries
- selected detail blocks

Do not wrap every line of content inside a card.

---

# 6.3 Inputs

```css
height: 42px;
padding: 9px 12px;
border: 1px solid #DDE3E8;
border-radius: 8px;
font-size: 14px;
color: #17212B;
background: #FFFFFF;
```

Focus:

```css
border-color: #1D5D8F;
box-shadow: 0 0 0 3px rgba(29, 93, 143, 0.14);
```

---

# 6.4 Badges / Status Chips

- Pill radius allowed
- 11–12px semibold text
- Soft tinted surface
- Strong status text
- Optional 14px icon
- No oversized pills

Examples:

`Approved` · `Under Review` · `Critical` · `Due Soon` · `Pending`

---

# 6.5 Tabs

Default:

- Slate text
- Active: Deep Navy / Government Blue
- 2px Government Blue underline
- Minimal tab chrome

Avoid card-style tabs unless necessary.

---

# 6.6 Icons

Prefer:

- `lucide-react`
- one consistent stroke width
- 16–20px operational
- 20–24px executive

No emoji.

---

# 7. Data Visualization

SOE-GAIP is highly analytical, so chart rules must be strict.

## 7.1 Recommended Chart Sequence

Use a restrained institutional sequence:

1. Government Blue `#1D5D8F`
2. Institutional Teal `#16877A`
3. Deep Navy `#12304A`
4. Information Blue `#3B76A8`
5. Government Green `#2E7D5A`
6. Slate `#64748B`
7. Warning Amber `#C58A19`
8. Critical Red `#B84242` only when meaning is actually critical

Never use Red as a normal categorical series.

---

# 7.2 Chart Chrome

| Element | Color |
|---|---|
| Title | `#17212B` |
| Axis | `#64748B` |
| Grid | `#DDE3E8` |
| Background | `#FFFFFF` |
| Tooltip | `#17212B` with white text |
| Selection | `#1D5D8F` |
| Secondary Highlight | `#16877A` |

Always label series.

Do not rely on color alone.

---

# 7.3 Chart-Type Rules

Use:

- line → trends over time
- bar → comparison
- horizontal bar → ranking
- stacked bar → controlled composition
- heatmap → risk / portfolio matrix
- scatter → analytical relationships only when useful
- donut → only simple composition with few categories

Avoid:

- 3D charts
- radar charts by default
- gauges everywhere
- oversized donut charts
- rainbow legends
- unnecessary area fills

---

# 7.4 Executive KPI Cards

Each KPI:

- short label
- large value
- optional trend
- optional period
- optional status
- optional drill-down

Do not add decorative icons unless the icon improves recognition.

---

# 8. SOE-GAIP Portal-Specific Design Rules

## 8.1 SOE Management & Submission Portal

Character:

**Operational, task-oriented, completion-focused**

Prioritize:

- reporting completion
- tasks
- validation issues
- module ownership
- clarifications
- submission readiness

Do not lead with strategic charts.

---

## 8.2 MoIP Oversight & Review Portal

Character:

**Review, compare, query, approve, escalate**

Prioritize:

- submission queue
- issue counts
- data quality
- comparison
- evidence
- reviewer comments
- overdue items

Use tables heavily.

---

## 8.3 Secretary Command Centre

Character:

**Exception-first operational leadership**

Prioritize:

- Critical Matters
- Pending Decisions
- Upcoming Obligations
- Escalations
- Delayed Compliance
- Financial Concerns

Use fewer charts and more ranked/actionable lists.

---

## 8.4 Minister Strategic Intelligence Portal

Character:

**Strategic, concise, portfolio-level**

Prioritize:

- portfolio health
- fiscal exposure
- major asset intelligence
- governance risk
- audit/legal exposure
- privatization
- strategic opportunities

Use drill-down rather than dense operational detail.

---

## 8.5 PMO Strategic View

Character:

**National-level strategic summary**

Prioritize:

- government capital
- fiscal burden
- aggregate assets
- land bank
- employment
- exports
- industrial output
- privatization potential

Do not include SOE workflow controls.

---

# 9. GIS & National Industrial Asset Map

GIS is a flagship product area and must visually match the rest of SOE-GAIP.

## 9.1 Map Styling

Use:

- cool neutral base map
- Government Blue for normal selected assets
- Institutional Teal for active opportunity/selection
- Critical Red for actual legal/critical risk
- Amber for attention
- Gray for unavailable/unverified

Avoid bright rainbow markers.

---

# 9.2 Map Layout

Desktop:

```text
┌──────────────────────────────┬─────────────────┐
│                              │ Filters / List  │
│         National Map         │ Asset Results   │
│                              │ Detail          │
└──────────────────────────────┴─────────────────┘
```

Support:

- map/list synchronization
- selected asset drawer
- result count
- active filters
- accessible list alternative

---

# 9.3 GIS Risk Law

Color on the map must reflect actual state.

Do not use Red simply to increase contrast.

Examples:

- Litigation = Critical Red only if configured as critical
- Encroachment = Warning/Critical based on defined status
- Available/usable land = Teal
- Standard asset = Government Blue

---

# 10. Forms and Workflow UX

## 10.1 Workflow States

Use controlled design tokens for:

- Draft
- In Progress
- Ready for Review
- Ready for Certification
- Certified
- Submitted
- Under Review
- Clarification Requested
- Returned
- Resubmitted
- Approved
- Locked

The same status must look identical everywhere.

---

# 10.2 Governance-Significant Actions

Actions such as:

- Certify
- Submit to MoIP
- Request Clarification
- Return
- Approve
- Lock

must include explicit confirmation and consequence language.

Avoid celebratory animation.

---

# 10.3 Validation

Differentiate:

### Blocking Error
Critical Red `#B84242`

### Warning
Amber `#C58A19`

### Information
Information Blue `#3B76A8`

### Complete / Approved
Green `#2E7D5A`

Do not use warning color for ordinary helper text.

---

# 11. Density Standards

SOE-GAIP should feel **desktop-dense and professional**.

| Element | Target | Avoid |
|---|---|---|
| Page Title | 22–28px | 40–56px |
| Section Title | 16–20px | oversized banners |
| Body | 14px | 18px default |
| Table Text | 13–14px | large mobile-like text |
| KPI Number | 26–36px | 48–64px |
| Button | 38–40px | 52–60px |
| Input | 40–44px | oversized |
| Card Padding | 16–20px | 32–40px |
| Page Gap | 20–24px | huge whitespace |
| Chart Height | 220–320px | near full-screen by default |

Design at 100% browser zoom.

---

# 12. Dashboard Rules

## Standard Order

1. Page title + scope
2. Period / organization / filters
3. 3–6 KPIs
4. 1–3 analytical visuals
5. Actionable table/list
6. Secondary details

### Operational Dashboard Law

A dashboard answers:

> **What is the current state and what requires action?**

### Executive Dashboard Law

A dashboard answers:

> **What matters, why does it matter and where can I drill down?**

---

# 13. Content & Microcopy

SOE-GAIP copy must be:

- factual
- institutional
- brief
- task-oriented

## Good

- `Pending Approvals`
- `Submission Status`
- `Board Vacancies`
- `Fiscal Exposure`
- `Approve Submission`
- `Request Clarification`
- `Items Requiring Attention`
- `Reporting Period`

## Bad

- `Unlock powerful insights`
- `Discover your SOE journey`
- `Transform governance`
- `AI-powered decision excellence`
- `Welcome to your command center`
- `Take control of the future`

---

# 14. Empty States

Pattern:

1. one factual line
2. optional one-line suggestion
3. one action only if needed

Examples:

**No audit paras found.**

**No critical matters for this reporting period.**

**No results match the selected filters.**

No mascot, illustration or marketing paragraph.

---

# 15. Entry / Login Experience

Preferred:

- centered login card
- Government of Pakistan / MoIP product identity
- SOE-GAIP name
- `Authorized Access Only`
- compact credentials fields
- one primary Sign In button
- optional minimal security note

Do not include:

- KPIs
- feature grids
- testimonials
- carousel
- marketing benefits
- oversized hero art

---

# 16. Branding & Identity

The platform should visually prioritize:

1. Government / Ministry identity
2. SOE-GAIP product identity
3. Functional portal context

FOS or implementation-partner identity should not visually compete with the Government product identity unless formally required.

Logo rules:

- preserve aspect ratio
- use clear safe area
- avoid oversized logos
- do not use logos as background watermark on operational screens
- do not place multiple partner marks in the application header

---

# 17. Accessibility — WCAG 2.2 AA Target

1. Normal text contrast ≥ 4.5:1.
2. Large text contrast ≥ 3:1.
3. Visible focus state.
4. Status = color + text + icon where useful.
5. Placeholder ≠ field label.
6. Keyboard access for forms/dialogs/navigation.
7. Modal/drawer focus management.
8. Charts require labels and readable values.
9. GIS must have a list/table alternative.
10. Error messages must identify corrective action.
11. Icon-only buttons require accessible labels.
12. Do not rely on hover alone.
13. Respect reduced motion.
14. Tables retain semantic structure.

---

# 18. Responsive Behavior

## Desktop / Laptop

Primary target.

Preserve:

- information density
- wide tables
- side-by-side review
- GIS split view
- dashboards

## Tablet

Use:

- collapsible sidebar
- 2-column KPI grid
- stacked charts where required
- compact review mode

## Mobile

Prioritize:

- tasks
- alerts
- summaries
- basic record view
- executive dashboard

Do not attempt to reproduce 10-column desktop registries at mobile width.

---

# 19. AI Agent Implementation Checklist

Before generating SOE-GAIP UI, confirm:

- [ ] This is SOE-GAIP, not generic FOS branding.
- [ ] Deep Navy `#12304A` is the structural color.
- [ ] Government Blue `#1D5D8F` is the primary action color.
- [ ] Teal `#16877A` is a restrained secondary accent.
- [ ] Canvas is `#F6F8FA`.
- [ ] Text uses `#17212B` / `#64748B`.
- [ ] Borders use `#DDE3E8`.
- [ ] Status colors use the official semantic palette.
- [ ] No purple gradients.
- [ ] No blue `#3B82F6` generic SaaS primary.
- [ ] No oversized type.
- [ ] No card overload.
- [ ] No marketing copy on portals.
- [ ] One primary CTA per section.
- [ ] Status = label + semantic color.
- [ ] Tables are used for operational truth.
- [ ] Executive views are concise.
- [ ] SOE data-entry and Minister dashboards do not look identical.
- [ ] GIS uses the same semantic palette.
- [ ] No emoji.
- [ ] No fake AI features.
- [ ] Accessibility states are implemented.

---

# 20. Tailwind Starter

```js
colors: {
  soe: {
    navy: '#12304A',
    blue: '#1D5D8F',
    teal: '#16877A',

    canvas: '#F6F8FA',
    surface: '#FFFFFF',

    ink: '#17212B',
    slate: '#64748B',
    border: '#DDE3E8',

    success: '#2E7D5A',
    warning: '#C58A19',
    critical: '#B84242',
    info: '#3B76A8',
  },
},

borderRadius: {
  sm: '6px',
  control: '8px',
  card: '12px',
  feature: '14px',
  modal: '16px',
},

fontFamily: {
  sans: ['Inter', 'system-ui', 'sans-serif'],
  mono: ['Roboto Mono', 'JetBrains Mono', 'monospace'],
},
```

---

# 21. Recommended Page Recipes

## SOE Operational Dashboard

```text
Title + Reporting Period
→ Completion KPIs
→ Pending Tasks / Validation
→ Module Progress
→ Clarifications / Deadlines
```

## MoIP Oversight Dashboard

```text
Title + Portfolio Scope
→ Submission KPIs
→ Review Queue
→ Data Quality / Exceptions
→ Portfolio Table
```

## Secretary Command Centre

```text
Title
→ Critical Matters
→ Pending Decisions
→ Upcoming Obligations
→ Escalations
→ Supporting Detail
```

## Minister Strategic Dashboard

```text
Title + Period
→ 4–6 Strategic KPIs
→ Portfolio Health
→ Fiscal Exposure
→ Asset / Governance Risk
→ Strategic Opportunities
```

## Registry Page

```text
Title + Search / Filters
→ Dense Table
→ Row Actions
→ Detail Drawer / Detail Page
```

## Form / Wizard

```text
Title + Status
→ Logical Sections / Steps
→ Validation
→ Evidence
→ One Primary Action
```

## Review Screen

```text
Submission Header
→ Current vs Previous
→ Issues / Evidence
→ Reviewer Comments
→ Approve / Clarify
```

## GIS Page

```text
Map
+ Filter Panel
+ Result List
+ Asset Drawer
```

---

# 22. Pre-Ship Review Questions

Before approving any SOE-GAIP screen, ask:

1. Does this look like serious government enterprise software?
2. Is the page compact at 100% zoom?
3. Does every component help the user see data, perform a task or make a decision?
4. Is there more than one competing primary action?
5. Are tables used where operational truth matters?
6. Is the status meaning explicit?
7. Is the palette dominated by navy, white and cool gray rather than color?
8. Is teal restrained?
9. Are Warning and Critical colors used only semantically?
10. Does the screen avoid startup/AI-demo aesthetics?
11. Can a government officer understand the page in seconds?
12. Is executive information concise enough?
13. Are role boundaries reflected in the UX?
14. Is the page accessible?
15. Did the design introduce anything not required by the product plan?

If the answer to any major question is “no”, revise before shipping.

---

# 23. Source-of-Truth Hierarchy

When implementation guidance conflicts, use this order:

1. **SOE-GAIP-DESIGN-SYSTEM.md** — visual system and product-specific design rules
2. **SOE-GAIP approved frontend implementation plans** — functional structure and workflow
3. **FOS-UI-UX-INSTRUCTIONS.md** — density, hierarchy and restraint principles
4. **Approved stakeholder decisions** — portal/module-specific product changes
5. Individual developer preference — lowest priority

No developer or AI agent may introduce a new visual language without explicit approval.

---

# 24. Prompt Snippet for AI Builds

```text
Follow SOE-GAIP-DESIGN-SYSTEM.md strictly.

Product:
State-Owned Enterprises Governance, Asset & Performance Intelligence Platform (SOE-GAIP)

Visual rules:
- Deep Navy #12304A structure
- Government Blue #1D5D8F primary actions
- Institutional Teal #16877A secondary accent
- Cool Off-White #F6F8FA canvas
- White #FFFFFF surfaces
- Charcoal Navy #17212B text
- Slate #64748B secondary text
- Border #DDE3E8
- Success #2E7D5A
- Warning #C58A19
- Critical #B84242
- Info #3B76A8

UX rules:
- Government-grade enterprise UI
- Compact professional density
- No generic SaaS aesthetic
- No purple gradients
- No oversized typography
- No card overload
- No emoji
- No fake AI widgets
- One primary CTA per section
- Tables for operational truth
- Status = color + label
- Executive dashboards concise and decision-oriented
- SOE operational screens task-oriented
- MoIP screens review-oriented
- GIS must be analytical, not decorative
- Preserve accessibility and responsive behavior
```

---

# 25. Summary Law

**Institutional navy structure. Government-blue actions. Restrained teal. Neutral surfaces. Dense operational clarity. Strategic executive hierarchy. Data before decoration. Evidence before claims.**

That is how SOE-GAIP must look and behave.
