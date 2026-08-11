# FOS UI/UX Build Instructions

**Version:** 1.0  
**Purpose:** Rules for how every new FOS app’s interface must be built.  
**This is not a color/styling token file.** Do not invent palettes here. Follow product brand tokens separately. This file governs **structure, density, content, hierarchy, and restraint**.

> **For AI agents:** Read this entire file before writing any UI. Prefer fewer components, smaller chrome, shorter copy, and denser operational layouts. If something feels “impressive,” “modern,” or “AI demo,” delete it.

---

## 1. Core philosophy

FOS products are **professional operations, compliance, and sustainability platforms** — not consumer apps, not AI landing-page demos, not design portfolios.

| Feel like | Never feel like |
|-----------|-----------------|
| Calm, institutional, data-first | Hype startup / “vibe-coded” SaaS |
| Compact controls and readable density | Zoomed-in giant cards and huge type |
| Short nouns and task language | Motivational fluff and journey copy |
| One job per screen section | Kitchen-sink dashboards |
| Trustworthy for auditors, officers, brands | Decorative, playful, noisy |

**Master rule:**  
If a component, sentence, badge, icon, or animation does not help the user **see data, complete a task, or make a decision**, remove it.

---

## 2. Absolute dos and don’ts

### DO

1. Build **compact** UIs: small labels, medium titles, large numbers only where they are KPIs.
2. Put **data and actions first**; chrome second.
3. Use **short, factual labels** (“Total Cases”, “Pending”, “Sign in”).
4. Keep **one primary action** per section or dialog.
5. Prefer **4–5 KPI cards**, not 8–12.
6. Use **tables and lists** for operational truth; cards for summaries.
7. Match density to product type: ops dashboards stay tight; marketing pages may breathe more — never confuse the two.
8. Write empty states as one fact + one next step.
9. Keep filters **functional** (they change the data), not decorative.
10. Design for **desktop productivity** first on portals/dashboards; mobile must remain usable, not “app-zoomed.”

### DON’T

1. Don’t add components “because they look complete.”
2. Don’t write marketing copy on dashboards, tables, forms, or settings.
3. Don’t make everything huge (`text-4xl`/`text-5xl`, `p-8`/`p-10` everywhere, oversized buttons).
4. Don’t pack the first viewport with stats, badges, feature grids, schedules, and CTAs.
5. Don’t use journey/empowerment language (“Unlock”, “Your journey”, “Transform”, “Powerful insights”, “Seamless experience”).
6. Don’t wrap every block in a heavy shadowed card.
7. Don’t add floating badges, glow orbs, glass stacks, or icon feature rows as default chrome.
8. Don’t put multiple competing primary buttons on one view.
9. Don’t invent helper paragraphs under every field “for clarity.”
10. Don’t build onboarding carousels, tip callouts, or celebration modals unless explicitly requested.
11. Don’t use emoji in UI chrome, headings, buttons, or empty states.
12. Don’t create decorative side panels, progress mascots, or AI-assistant widgets unless the product requires them.
13. Don’t default to dark mode, neon accents, or “cyber” aesthetics.
14. Don’t repeat the same information as title + subtitle + badge + tooltip + helper text.

---

## 3. Density and sizing (stop the “zoomed-in” look)

AI agents routinely build portals that feel **magnified**: oversized headings, giant padding, tall buttons, sparse grids. FOS apps must feel **desktop-dense and professional**.

### 3.1 Default density targets (operational apps)

| Element | Target | Avoid |
|---------|--------|-------|
| Page title | ~18–26px (`text-lg` to `text-2xl`) | `text-4xl` / `text-5xl` on dashboards |
| Section title | ~16–20px (`text-base` to `text-xl`) | Huge section banners |
| Card title | ~14–16px (`text-sm` to `text-base`) | Card titles competing with page title |
| Body / table text | 13–14px (`text-sm`) | `text-base`/`text-lg` for dense tables |
| Labels / meta / badges | 10–12px (`text-xs` or slightly smaller) | Large muted paragraphs |
| KPI number | ~24–36px (`text-2xl` to `text-3xl`) | `text-5xl` KPI numbers |
| KPI label | 10–12px uppercase or semibold | Sentence-long KPI descriptions |
| Button height | 36–40px (`h-9` / `h-10`) | `h-12` / `h-14` as default |
| Input height | 40–44px | Tall “mobile app” inputs everywhere |
| Card padding | 16–20px (`p-4` / `p-5`) | `p-8` / `p-10` on every card |
| Section gap | 16–24px (`gap-4` / `gap-6`) | Huge empty vertical bands |
| Page padding | 16–32px (`px-4` to `px-8`) | Massive side margins that shrink content |

### 3.2 Zoom / scale rules

- Design at **100% browser zoom**. Do not compensate by enlarging every component.
- Prefer **more information visible above the fold** over oversized single widgets.
- KPI grids: typically **4–5 columns on large screens**, not 2 oversized cards.
- Charts: medium height (~220–320px), not full-viewport chart heroes unless the page is a single visualization.
- Tables: readable row height; do not turn every row into a mini-card stack by default.
- Modals: content-sized; avoid full-screen modal for simple confirmations.

### 3.3 When larger sizes are allowed

| Context | Allowed larger type |
|---------|---------------------|
| Marketing landing hero headline | Yes — one display headline |
| Public campaign / brand page | Yes — controlled hero scale |
| Single KPI highlight in a focused report | Sometimes |
| Admin dashboard page title | No — keep compact |
| Login form title | No — `text-xl`–`text-2xl` max |
| Table headers | No |

### 3.4 Spacing philosophy

- **Ops / dashboard / portal:** tight-professional. Content close, clear alignment, minimal dead space.
- **Marketing landing:** more air allowed — but still one composition, not sparse emptiness with floating widgets.
- Never use large empty regions to “look premium.” Premium here means **clarity and discipline**, not whitespace theater.

---

## 4. Content and heading instructions

### 4.1 Voice

Write like an **operations / compliance product**, not a startup pitch deck.

**Good:**
- “Sign in”
- “Welcome back”
- “Total Complaints”
- “Pending Approvals”
- “No linked products.”
- “Authorized Access Only”
- “Export PDF”
- “Items requiring attention”

**Bad:**
- “Unlock powerful insights into your sustainability journey”
- “Let’s get you started on transforming compliance”
- “Your all-in-one intelligent dashboard experience”
- “Discover what matters most today 🚀”
- “Magic happens here”
- “AI-powered everything at your fingertips”

### 4.2 Headings

| Level | Purpose | Rules |
|-------|---------|-------|
| Page H1 | Name the screen | Short noun phrase. Product/domain words. No slogan. |
| Section H2 | Name the data block | Factual (“Monthly Case Trends”, not “Understanding Your Trends”) |
| Card title | Name the widget | 2–6 words |
| Subtitle | Optional context only | One line max. Dates, scope, org — not marketing. |

**Rules:**
- One H1 per page.
- Do not stack H1 + long lede + eyebrow + badge + tagline.
- Prefer **“Provincial Aggregation Dashboard”** over **“Welcome to Your Provincial Command Center.”**
- Subtitles state **scope** (“Punjab · Jan 2026”), not inspiration.

### 4.3 Labels and microcopy

- Field labels: short nouns (“Email”, “Password”, “Reporting period”).
- Buttons: verbs (“Save”, “Submit”, “Approve”, “Download Report”) — not “Yes, let’s do it!”
- Status: single words or short pairs (“Pending”, “Synced”, “Needs correction”).
- Helper text: only when the field is genuinely ambiguous; never under every input.
- Errors: specific and calm (“Username and password are required”) — not dramatic.

### 4.4 Empty states

Pattern:
1. One factual line (“No unions found.”)
2. Optional one hint (“Try adjusting filters.”)
3. Optional one action button if useful

Do not add illustrations essays, mascot characters, or three paragraphs of encouragement.

### 4.5 Quantity limits

| Element | Limit |
|---------|-------|
| Hero headline | 1 |
| Hero supporting sentence | 1 |
| Hero CTA group | 1–2 buttons |
| Page intro paragraph | 0–1 short line |
| KPI cards above fold | 3–6 (prefer 4–5) |
| Primary buttons visible | 1 per section |
| Badges near a title | 0–2 |
| Tooltip / helper per field | Only if needed |

---

## 5. Component restraint (stop overbuilding)

### 5.1 Default component set for portals

Use only what the task needs:

- App shell (sidebar and/or top nav)
- Page header (title + optional actions)
- Filters
- KPI strip
- Charts
- Tables / lists
- Forms
- Modals / drawers
- Status badges
- Toasts for feedback

### 5.2 Do not add by default

- Feature icon grids
- “What’s new” banners
- Confetti / success celebrations
- Floating AI chat unless product requires it
- Multiple tip callout cards
- Duplicate summary widgets saying the same KPI
- Social proof strips inside authenticated apps
- Decorative progress rings with no actionable meaning
- Command-palette-looking chrome that isn’t implemented
- Settings “themes” and avatar playgrounds
- Breadcrumbs + title + tabs + chips all repeating location

### 5.3 Cards

- Cards group **a unit of work or data**, not every sentence.
- If removing the card chrome (border/shadow/bg) doesn’t hurt understanding, don’t use a card.
- Avoid nesting cards inside cards inside cards.
- Prefer one clean panel + internal dividers over five mini-cards.

### 5.4 Icons

- Icons support labels; they do not replace clear text in critical actions.
- One consistent icon set and stroke weight.
- No emoji.
- No icon row that restates the headline (“Fast”, “Secure”, “Smart”) on ops screens.

### 5.5 Motion

- Subtle hover, focus, and panel transitions only.
- No constant pulsing, shimmering KPIs, or animated gradient borders.
- Respect reduced-motion preferences.
- Motion must not delay task completion.

---

## 6. How to build dashboards

### 6.1 Job of a dashboard

A dashboard answers: **What is the state right now, and what needs action?**  
It is not a brochure and not a widget zoo.

### 6.2 Standard information order

1. **Page title + scope** (org, period, region) — compact
2. **Filters / period controls** — only filters that change data
3. **KPI strip** (3–6 metrics)
4. **Primary charts** (1–3 above the fold)
5. **Actionable list / table** (pending items, recent entries, alerts)
6. **Secondary analytics** below the fold

Do not invert this with marketing hero → feature tour → eventually data.

### 6.3 KPI rules

- Prefer **4–5 KPIs**.
- Each KPI: **label + number + optional delta/submetric**.
- Labels are short nouns.
- Numbers are the visual hero of the card — not icons, not illustrations.
- Do not put long explanations inside KPI cards.
- Clicking a KPI may filter the page; if so, make that behavior obvious and consistent.
- Avoid duplicate KPIs that restate the same metric in different words.

### 6.4 Filter bars

- Horizontal, compact controls (`text-sm`, modest padding).
- Typical controls: period, region, category, search.
- One Apply if needed; avoid auto-chaos.
- One export/download action is enough near filters.
- Do not build a “smart insights” paragraph next to filters.

### 6.5 Charts

- Choose charts that answer a question (trend, distribution, funnel, comparison).
- Cap visible series; avoid rainbow legends.
- Titles factual (“Case Status Distribution”).
- No chart without a clear title.
- Don’t place six large charts above the fold.
- Pair charts with a table or list when users need exact values.

### 6.6 Tables and queues

- Operational truth lives in tables: IDs, type, owner, time, status, action.
- Compact typography; sticky header when long.
- Row actions are small and clear (View / Approve / Open).
- “Pending actions” blocks beat decorative “insights” cards.

### 6.7 Dashboard chrome budget

| Allowed | Not allowed as default |
|---------|------------------------|
| Thin top bar / sidebar | Giant welcome banners |
| Short page title | “Good afternoon, Champion!” headers |
| KPI + charts + table | Motivational quotes |
| Status badges | Trophy / gamification |
| Export button | Share-to-social widgets |

### 6.8 Dashboard density checklist

- [ ] Page title is compact, not billboard-sized
- [ ] KPI cards use small labels and medium-large numbers
- [ ] Card padding feels tight (not oversized)
- [ ] At least one actionable list/table exists for ops products
- [ ] No marketing fluff copy
- [ ] No redundant widgets
- [ ] Primary action count is controlled

---

## 7. How to build landing pages

### 7.1 Job of a landing page

Communicate **who this is for and what to do next**.  
One composition. Brand-first. Not a dashboard pretending to be marketing.

### 7.2 First viewport (hero) — strict budget

Include **only**:
1. Brand / product name (strong)
2. One headline
3. One short supporting sentence
4. One CTA group (1–2 actions)
5. One dominant visual (product, place, atmosphere) when relevant

**Do not put in the first viewport:**
- Stat strips
- Partner logo marathons
- Feature icon grids
- Schedules, calendars, “this week” widgets
- Testimonials
- Pricing tables
- Multiple competing text blocks
- Floating badges / stickers on the hero image
- Dashboard screenshots stacked as a collage of cards

### 7.3 Below-the-fold sections

Each section has:
- One purpose
- One headline
- Usually one short supporting sentence
- Content that earns its place (features, outcomes, partners, login entry)

Do not turn every section into a card grid of six vague benefits.

### 7.4 Landing aesthetics (behavioral)

- Brand name must remain a hero-level signal — headline must not overpower brand.
- Prefer real imagery / product context over abstract decoration.
- Motion: 2–3 intentional moments max (e.g., subtle hero entrance, CTA hover, section reveal) — not constant animation noise.
- Avoid “template SaaS” layouts that could belong to any company after removing the logo.

### 7.5 Landing copy

- Headline states the product or mandate plainly.
- Support line states audience + value in one sentence.
- CTAs are concrete (“Stakeholder Login”, “Explore Dashboard”, “Sign in”) — not “Get started on your journey.”

### 7.6 Landing checklist

- [ ] First viewport passes the hero budget test
- [ ] Brand is unmistakable without reading nav
- [ ] No stats/features jammed into hero
- [ ] Sections are single-purpose
- [ ] CTA count is disciplined

---

## 8. How to build entry portals (login / signup / access)

### 8.1 Job of an entry portal

**Authenticate the user and get them to work.**  
It is not an onboarding story and not a marketing site.

### 8.2 Preferred patterns

**A. Centered auth card (most FOS ops apps)**
- Centered card, moderate max width (~400–440px)
- Product mark / name
- Title: “Sign in” / “Login” / “Welcome back”
- Optional one-line context (“Sign in to continue to …”)
- Email/username + password (+ OTP/2FA if required)
- One primary button
- Optional secondary path (OTP, SSO) as quiet alternative
- Minimal legal/trust note if needed

**B. Split shell (when brand partnership must be visible)**
- Left: brand, short product line, at most 3 short capability labels
- Right: compact form
- Left side is restrained product identity — not a long essay or feature carousel of 10 items

### 8.3 Entry portal rules

- No KPI stats on login.
- No testimonial carousels on login.
- No “Create your destiny” headlines.
- No excessive padding that makes the form feel like a mobile splash screen on desktop.
- Form title stays mid-size; inputs and button use standard control heights.
- Errors are inline and specific.
- Demo credentials, if shown, are small and secondary — not a banner festival.
- “Not registered?” points to a real contact/process — one line.

### 8.4 What “Authorized Access” tone means

For government / federation / compliance portals:
- Prefer institutional tone (“Authorized Access Only”)
- Avoid casual consumer copy
- Keep trust messaging operational (“Secure sign-in”), not theatrical

### 8.5 Entry portal checklist

- [ ] User can understand how to sign in in under 3 seconds
- [ ] Only fields required for auth are present
- [ ] One primary CTA
- [ ] No marketing widget stack
- [ ] Density is compact on desktop

---

## 9. Page types — quick recipes

### 9.1 Ops dashboard
Title → filters → 4–5 KPIs → 2 charts → pending table.

### 9.2 Detail / case page
Header with ID + status → key facts → timeline/activity → documents/actions.

### 9.3 List / registry page
Title + search/filter → dense table → row actions → optional side drawer.

### 9.4 Form / wizard
Title → progress only if multi-step is real → fields in logical groups → primary submit at end. No pep-talk between steps.

### 9.5 Settings / admin
Left subnav or tabs → forms in one column → save bar. No illustrative empty marketing panels.

### 9.6 Report / export view
Parameters → preview/table → export actions. No decorative cover art unless print template requires it.

---

## 10. Hierarchy and visual aesthetics (non-color)

These rules control look-and-feel without prescribing hex codes:

1. **Hierarchy over decoration.** Size, weight, and spacing create order — not gradients and glows.
2. **Quiet surfaces.** Most of the UI is neutral surface; emphasis is rare and intentional.
3. **Alignment.** Columns and gutters stay consistent; don’t free-float widgets.
4. **Corners and depth stay modest.** Soft elevation for cards/modals; no dramatic multi-shadow stacks.
5. **Consistency beats novelty.** Reuse button sizes, card padding, and table styles across pages.
6. **Status is semantic, not ornamental.** Badges communicate state; they are not confetti.
7. **Brand appears in shell and key actions**, not painted across every widget.
8. **Avoid visual trends** that read as generic AI output: glassmorphism everywhere, mesh gradients, neon borders, bento-grid overload, oversized rounded pills on every control.
9. **Readable > clever.** If a custom visualization needs a legend essay, simplify the chart.
10. **Professional silence.** Leave out the clever microcopy.

---

## 11. Interaction and UX behavior

- Primary actions are obvious; destructive actions require confirmation.
- Don’t block users with unnecessary tours.
- Saving/submitting gives clear success or error feedback (toast or inline) — not modal theater for every save.
- Filters should not reset unrelated user context without reason.
- Keep navigation stable; don’t change sidebar structure per mood.
- Loading: skeletons or compact spinners in context — not full-page brand animations by default.
- Permissions: hide or disable actions cleanly; don’t show fake controls.
- Keyboard focus must be visible on forms and dialogs.

---

## 12. Responsive behavior

- Desktop portals: preserve density; don’t enlarge to “fill space.”
- Tablet: collapse grids gracefully (4 KPIs → 2×2).
- Mobile: stack sections; keep controls tappable but not cartoonishly large.
- Tables on mobile: prioritize key columns or use a disciplined list pattern — don’t just shrink a 10-column table into unreadability without a plan.
- Landing heroes may scale type up on large screens; dashboards should not.

---

## 13. AI failure modes — explicit reject list

If your draft includes any of the following, revise before shipping:

| Failure mode | Why it fails | Fix |
|--------------|--------------|-----|
| Giant typography everywhere | Feels zoomed-in / amateur | Compact titles; large type only for KPI numbers or marketing hero |
| Too many widgets | Cognitive overload | Cut to title → KPIs → charts → table |
| Fluffy copy | Unprofessional | Replace with nouns and verbs |
| Extra onboarding chrome | Slows experts | Remove unless requested |
| Hero packed with stats/features | Looks template-generic | Enforce hero budget |
| Login page as brochure | Blocks access | Auth card + minimal brand |
| Nested cards + badges + icons | Visual noise | Flatten; keep one emphasis |
| Duplicate explanations | Patronizing | One label is enough |
| Decorative animation | Distracts | Remove continuous motion |
| Fake AI features UI | Dishonest / clutter | Only ship real capabilities |

---

## 14. Pre-ship review questions

Ask these before accepting any UI:

1. **Can I remove half the components and still complete the task?** If yes, remove them.
2. **Is any sentence sell-copy instead of task-copy?** Delete or rewrite.
3. **Does this look zoomed-in at 100% zoom?** Reduce type, padding, and control sizes.
4. **Is there more than one primary CTA in this section?** Cut to one.
5. **Does the first viewport match the page type budget?** (Hero vs dashboard vs login.)
6. **Would an auditor/officer trust this screen in 5 seconds?** If it looks like a toy, rebuild.
7. **Is every badge/icon earning its place?** Remove decorative ones.
8. **Are empty states short?** Trim.
9. **Are KPI labels short nouns?** Fix verbosity.
10. **Did I invent UI that wasn’t requested?** Remove it.

---

## 15. Prompt snippet for new builds

Paste this when starting a new app or screen with an AI agent:

```text
Follow FOS-UI-UX-INSTRUCTIONS.md strictly.

Build a [dashboard | landing page | entry portal | list | form] for [product].

Rules:
- Compact professional density — not zoomed-in giant UI
- Minimal components — no extra widgets, badges, or decorative chrome
- Short factual copy — no journey/unlock/transform language
- One primary CTA per section
- Dashboards: title → filters → 4–5 KPIs → charts → actionable table
- Landings: brand + one headline + one sentence + 1–2 CTAs in first viewport
- Entry portals: sign-in first; no marketing stacks
- Do not add features, sections, or copy that were not requested
```

---

## 16. Summary law

**Fewer components. Smaller chrome. Shorter words. Clearer hierarchy. Data before decoration.**

That is how FOS apps must look and behave.
