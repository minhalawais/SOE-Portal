# SOE-GAIP Frontend Development
## Phase 8 Implementation Plan — Asset and Property Intelligence Modules

**Project:** State-Owned Enterprises Governance, Asset & Performance Intelligence Platform (SOE-GAIP)  
**Development Stage:** Frontend-only stakeholder validation prototype  
**Data Source:** Realistic dummy data through mock services  
**Backend / Database:** Out of scope  
**External Government API Integrations:** Future phase  
**Implementation Principle:** Build the intended production operating model in the frontend without creating backend dependencies.

---

# 1. Phase Objective

Phase 8 builds the complete asset and property frontend experience, one of the core differentiating domains of SOE-GAIP.

The system must support both:

1. operational asset registration/maintenance
2. asset intelligence about ownership, valuation, utilization, legal risk and location

Stakeholders should be able to answer:

- What assets exist?
- Where are they?
- What are they worth?
- Are they used?
- Are they idle?
- Are they encroached?
- Are they under litigation?
- Is evidence complete?

---

# 2. Asset Domain Structure

Use one parent asset model:

```text
Asset
├── Land
├── Building
├── Machinery
├── Vehicle
└── Other Equipment
```

Common fields belong to the parent asset. Type-specific fields belong to subtype sections.

---

# 3. Asset Registry

Recommended columns:

- Asset ID
- Asset Name / Identifier
- Asset Type
- SOE
- Location
- Book Value
- Market Value
- Utilization Status
- Encroachment / Legal Indicator
- Evidence Status
- Last Updated

Filters:

- SOE
- type
- province
- district
- utilization
- encroachment
- litigation
- valuation availability
- evidence status

Support search, sort, pagination, row actions, detail and mock import.

---

# 4. Asset Detail Information Architecture

Use:

```text
Asset
├── Overview
├── Ownership
├── Valuation
├── Utilization
├── Location
├── Documents
├── Legal Status
└── History
```

Keep tab/section behavior consistent across asset types.

---

# 5. Land Module

Fields aligned with the source concept:

- Province
- District
- Tehsil
- Mouza
- Survey Number
- Khasra Number
- Area
- Acres
- Kanals
- Square Feet
- Market Value
- Book Value
- Date of Acquisition
- Purpose
- Current Use
- Encroachment Status
- Litigation Status
- GIS Mapping
- Lease Status
- occupancy/use classification

Use unit-aware inputs and display.

---

# 6. Land Use / Occupancy Taxonomy

The source includes terms such as:

- Vacant
- Occupied
- Industrial
- Commercial
- Residential
- Agricultural
- Unused

These likely represent more than one concept. Do not silently merge them.

Prototype the UI so stakeholders can confirm whether they belong to:

- occupancy status
- use classification
- utilization status

Record the final decision.

---

# 7. Land Evidence

Provide linked mock evidence for:

- ownership documents
- mutation
- revenue record
- lease
- valuation report
- photographs

---

# 8. Building Module

Representative fields:

- building type
- condition
- age
- replacement value
- occupancy
- floor area
- maintenance cost
- insurance
- linked land asset
- location

Types may include offices, factories, warehouses, schools, training institutes, guest houses, colonies, hospitals, rest houses and storage facilities.

---

# 9. Machinery Module

Fields:

- Machine ID
- manufacturer
- purchase cost
- purchase date
- depreciation
- useful life
- current condition
- running / idle / scrap / disposed
- location
- capacity
- utilization
- maintenance schedule

Keep physical condition distinct from operational status.

---

# 10. Vehicle Module

Fields:

- vehicle number
- type
- purchase year
- current value
- assigned officer
- mileage
- insurance
- fuel consumption
- GPS availability
- disposed/auctioned status

---

# 11. Other Equipment

Support categories such as:

- furniture
- computers
- IT equipment
- servers
- office equipment
- plant equipment
- laboratory equipment
- heavy machinery
- tools
- communication equipment

Use a flexible but controlled generic structure.

---

# 12. Valuation Experience

Show:

- book value
- market value
- valuation date
- valuation method
- valuation authority
- valuation evidence
- market/book variance

Use a clear comparison view.

Do not infer valuation quality unless rules are formally defined.

---

# 13. Utilization Experience

Show:

- current use
- utilization status
- utilization % where meaningful
- capacity where relevant
- idle/unused flag
- last update

Filters:

- utilized
- underutilized
- idle
- unused

Thresholds for underutilized are prototype configuration until approved.

---

# 14. Legal Risk

Surface:

- encroachment
- litigation
- lease status
- ownership-evidence completeness

Link litigation through stable mock IDs to the future litigation module.

Avoid making legal conclusions the system cannot substantiate.

---

# 15. GIS Preview

Phase 8 includes simple asset location:

- point marker
- selected land polygon
- map/list synchronization
- location detail

Full national map analytics is later.

---

# 16. Asset Summary

Within an SOE show:

- total asset count
- total book value
- total market value
- count by type
- idle/unused count
- encroached land
- assets under litigation
- missing valuation
- missing evidence

Every summary should drill into a filtered registry.

---

# 17. Mock Bulk Import

Flow:

1. Download Template placeholder
2. Select mock file
3. Simulated validation
4. Accepted rows
5. Warning rows
6. Rejected rows
7. Confirm
8. Registry updates

No real Excel parsing required.

---

# 18. Create/Edit Flow

Recommended staged form:

```text
1. Asset Type
2. Basic Information
3. Type-Specific Information
4. Ownership / Location
5. Valuation
6. Legal / Utilization
7. Evidence
8. Review
```

Avoid very long single-page forms.

---

# 19. Asset History

Events:

- created
- valuation changed
- status changed
- utilization changed
- encroachment updated
- evidence added
- disposal recorded

---

# 20. Permissions

SOE Asset Officer:

- create/edit
- mock evidence

Focal Person:

- review all assets

MoIP Reviewer:

- read/review/compare/clarify

Minister:

- read intelligence only

---

# 21. Dummy Data Scenarios

Include:

- vacant industrial land
- encroached land
- land under litigation
- outdated valuation
- idle machinery
- underutilized machinery
- disposed vehicle
- high-maintenance building
- missing evidence

These must later power executive intelligence.

---

# 22. QA

Test:

- filters
- area units
- subtype forms
- valuation variance
- missing evidence
- encroachment warnings
- litigation links
- map selection
- mock import
- role modes
- large registry behavior

---

# 23. Stakeholder Validation Questions

- Are asset types complete?
- Are land classifications separated correctly?
- Which valuation fields are mandatory?
- What defines underutilized?
- How is encroachment categorized?
- Which area units are authoritative?
- What evidence is mandatory?
- Which assets require GIS?
- How are disposed assets retained historically?

---

# 24. Deliverables

1. Asset Registry
2. Asset Summary
3. shared asset detail
4. Land
5. Buildings
6. Machinery
7. Vehicles
8. Other Equipment
9. valuation view
10. utilization view
11. legal status view
12. simple GIS view
13. evidence hooks
14. history
15. mock import
16. subtype-aware form
17. validation schemas
18. realistic asset fixtures

---

# 25. Exit Gate

Phase 8 is complete when:

- primary asset classes are represented
- users can register and inspect assets
- subtype fields are clear
- valuation/utilization are visible
- encroachment/litigation are visible
- mock evidence links work
- GIS location works
- summary drill-down works
- terminology is stakeholder-validated

## **Asset and Property Intelligence Modules — Approved**
