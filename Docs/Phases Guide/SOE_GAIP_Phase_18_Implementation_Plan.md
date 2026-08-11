# SOE-GAIP Frontend Development
## Phase 18 Implementation Plan — GIS and National Industrial Asset Map

**Project:** State-Owned Enterprises Governance, Asset & Performance Intelligence Platform (SOE-GAIP)  
**Development Stage:** Frontend-only stakeholder validation prototype  
**Data Source:** Realistic dummy data through mock services  
**Backend / Database:** Out of scope  
**External Government API Integrations:** Future phase  
**Implementation Principle:** Build the intended production operating model in the frontend without creating backend dependencies.

---

# 1. Phase Objective

Phase 18 creates the GIS and National Industrial Asset Map as a flagship decision-support experience.

The map is not decorative. It should help stakeholders locate, filter, compare and drill into government/SOE assets geographically.

Core scenario:

> **Show vacant industrial land greater than 20 acres with no litigation.**

---

# 2. GIS Scope

Build:

- national map
- asset markers
- land polygons for selected fixtures
- map/list synchronized view
- filter panel
- asset detail drawer
- province/district navigation
- opportunity/result count
- drill-down to asset detail

---

# 3. Data Model

Each GIS-capable asset should provide:

- assetId
- organizationId
- name
- asset type
- latitude/longitude or geometry
- province
- district
- land area where applicable
- utilization
- encroachment
- litigation
- ownership
- book value
- market value
- current use
- evidence status

---

# 4. National Map

Default view:

- Pakistan extent
- clustered points where appropriate
- clear legend
- result count
- active filters
- map/list toggle or split view

Avoid overloading map with labels.

---

# 5. Filters

Must include:

- SOE
- asset type
- province
- district
- utilization
- encroachment
- litigation
- ownership
- land size
- valuation

Additional useful filters:

- current use
- evidence status
- market-value range

---

# 6. Geographic Navigation

Support:

- national
- province
- district
- selected asset

Breadcrumb/context should show current geographic scope.

---

# 7. Asset Marker Behavior

Clicking marker/polygon opens a detail drawer with:

- SOE
- asset type
- land area
- current use
- market value
- book value
- ownership
- utilization
- encroachment
- litigation
- documents
- opportunity status
- View Asset action

---

# 8. Land Polygon Behavior

For selected land fixtures:

- polygon outline/fill controlled by design system
- hover/selection
- area display
- detail drawer
- zoom-to-feature

Do not imply cadastral precision unless dummy geometry is explicitly labeled illustrative.

---

# 9. Map/List Synchronization

When filters change:

- map results change
- list results change
- counts update

Selecting a row should highlight/zoom to asset where possible.

Selecting a map feature should select corresponding list item.

---

# 10. Opportunity Query Examples

Support saved demonstration scenarios:

- vacant industrial land > 20 acres, no litigation
- underutilized machinery by province
- encroached land
- assets with market value but missing current use
- idle factories

These are frontend filter presets, not formal policy recommendations.

---

# 11. GIS Summary Panel

Show:

- assets in view
- total area
- total market value
- vacant/unused
- litigation count
- encroachment count

Values must derive from filtered data.

---

# 12. Data Quality UX

Show warnings for:

- missing coordinates
- missing geometry
- invalid/mismatched province-district
- missing valuation

Do not silently hide all incomplete assets; provide non-mapped count.

---

# 13. Map Performance

Frontend requirements:

- cluster markers if numerous
- memoize/filter efficiently
- avoid rerendering full map unnecessarily
- use limited polygon complexity
- lazy-load heavy GIS module if practical

---

# 14. Accessibility

Provide a complete list/table alternative to map interactions.

Users should be able to access asset results without relying solely on spatial interaction.

---

# 15. Responsive Behavior

Desktop/laptop:
- split map/list

Tablet:
- map with collapsible results panel

Mobile:
- simplified map and list, not full analytical filtering

---

# 16. Dummy Data Requirements

Provide geographically distributed assets across several provinces/districts:

- land
- factories
- offices
- warehouses
- idle assets
- encroached property
- litigation cases
- vacant industrial land

Use valid coordinates.

---

# 17. QA

Test:

- all filters
- combined filters
- map/list sync
- province/district scope
- marker selection
- polygon selection
- zero results
- missing geometry
- performance with larger fixture set
- accessibility list alternative

---

# 18. Stakeholder Validation Questions

- Which assets must be mapped?
- Is point-level location sufficient for some asset types?
- Is parcel polygon required for land?
- Which filters matter most?
- What constitutes available/usable land?
- Should disputed/encroached land be shown differently?
- Which asset opportunities should have saved queries?
- Are map providers/hosting constrained later by government infrastructure?

---

# 19. Deliverables

1. National Industrial Asset Map
2. filter panel
3. map/list synchronized results
4. markers/clusters
5. selected land polygons
6. geographic navigation
7. asset detail drawer
8. GIS summary panel
9. saved demo scenarios
10. data-quality warnings
11. accessible list alternative
12. geospatial fixtures

---

# 20. Exit Gate

Phase 18 is complete when:

- stakeholders can answer meaningful asset-location questions
- combined filters work
- map/list remain synchronized
- asset drill-down reaches underlying record
- incomplete GIS data is visible
- the experience is decision-support oriented rather than decorative
- stakeholders validate filters and geographic detail requirements

## **GIS and National Industrial Asset Map — Approved**
