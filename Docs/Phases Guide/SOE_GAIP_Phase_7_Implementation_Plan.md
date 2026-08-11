# SOE-GAIP Frontend Development
## Phase 7 Implementation Plan — Enterprise and Ownership Modules

**Project:** State-Owned Enterprises Governance, Asset & Performance Intelligence Platform (SOE-GAIP)  
**Development Stage:** Frontend-only stakeholder validation prototype  
**Data Source:** Realistic dummy data through mock services  
**Backend / Database:** Out of scope  
**External Government API Integrations:** Future phase  
**Implementation Principle:** Build the intended production operating model in the frontend without creating backend dependencies.

---

# 1. Phase Objective

Phase 7 develops the authoritative enterprise identity, legal structure and ownership experience.

A stakeholder should be able to open any SOE and understand:

- what entity it is
- legal status
- operational status
- sector
- where it operates
- ownership structure
- government ownership %
- subsidiaries
- associates
- joint ventures
- corporate hierarchy
- historical changes

---

# 2. Module Scope

Build:

- SOE Master Registry
- Enterprise Profile
- Corporate Structure
- Ownership
- Shareholding
- Subsidiaries
- Associates
- Joint Ventures
- Contact Information
- Locations
- Corporate Hierarchy
- basic history

---

# 3. SOE Master Registry

Authorized users should see a portfolio registry.

Recommended columns:

- SOE name
- abbreviation
- sector
- legal status
- government ownership %
- enterprise status
- parent/administrative relationship
- head office
- reporting status where useful

Features:

- search
- filtering
- sorting
- open enterprise
- export placeholder

SOE operational users should not browse unrelated SOEs unless their scope allows it.

---

# 4. Enterprise Profile

## Basic Information

- SOE name
- abbreviation
- company registration number
- SECP registration number
- NTN
- STRN
- date of incorporation
- legal status
- sector
- sub-sector
- nature of business
- status
- website
- corporate email

## Administrative Relationship

- parent ministry
- attached department
- administrative ministry
- operating ministry where applicable

## Contact and Location

- head office address
- provincial offices
- factory locations
- contact persons
- GIS coordinates

---

# 5. Legal Status

Use controlled values aligned with the concept:

- Companies Act company
- Statutory Corporation
- Public Limited Company
- Section 42 Company
- Government Company
- Wholly Owned SOE
- Joint Venture
- Subsidiary
- Holding Company
- Special Purpose Vehicle

Do not use free text for normal entry.

---

# 6. Enterprise Status

Controlled values:

- Active
- Dormant
- Under Liquidation
- Under Privatization
- Merged
- Closed

Display status prominently in the enterprise header.

---

# 7. Ownership Module

Represent:

- Government shareholding
- Private shareholding
- Foreign shareholding
- Provincial Government shareholding
- Employee shares
- Public shares
- Institutional shares
- Percentage owned by Government
- Ultimate Beneficial Owner
- Shareholding Structure
- Paid-up Capital
- Authorized Capital
- Issued Capital

Provide structured table + simple composition visualization.

---

# 8. Ownership Validation

Frontend rules:

- each percentage between 0 and 100
- ownership composition logically consistent
- total ownership warnings when values do not reconcile
- government ownership calculation visible

Use warning, not silent correction.

---

# 9. Corporate Structure

Represent relationships:

- Holding Company
- Subsidiary
- Associate
- Joint Venture

Each relationship includes:

- related entity
- relationship type
- ownership %
- status
- key performance snapshot where available

---

# 10. Corporate Hierarchy View

Build a visual hierarchy with:

- parent node
- child nodes
- relationship labels
- ownership %
- click-to-open
- multiple levels

Provide a table alternative for accessibility and dense review.

---

# 11. Subsidiary Detail

Representative information:

- identity
- ownership %
- relationship type
- annual performance snapshot
- financial-statement availability
- Board summary
- assets summary
- liabilities summary

Detailed domain information can link to later modules.

---

# 12. Locations

Primary list/table for:

- head office
- provincial offices
- factories

Allow simple map preview. Full GIS intelligence is later.

---

# 13. Enterprise Header Pattern

Create a reusable header showing:

- name
- abbreviation
- sector
- legal status
- enterprise status
- government ownership
- active reporting period where relevant

Reuse this header in SOE and MoIP detail views.

---

# 14. Edit / Review Modes

SOE users:

- edit permitted fields
- save draft
- see validation

MoIP reviewer:

- read submitted values
- compare
- later clarify/review

Executive roles:

- read only

Use shared components with mode flags rather than duplicate screens.

---

# 15. Validation Rules

Examples:

- required enterprise name
- incorporation date not in future
- ownership values bounded
- subsidiary parent valid
- relationship ownership non-negative
- enterprise status controlled
- basic registration fields validated to agreed prototype format

---

# 16. History

Show representative events:

- legal status changed
- ownership updated
- subsidiary added
- enterprise renamed
- enterprise status changed

Phase 12 will deepen history/evidence.

---

# 17. Filters

Registry filters:

- sector
- sub-sector
- enterprise status
- legal status
- government ownership band

Relationship filters:

- relationship type
- related entity status

---

# 18. Dummy Data

Include:

- wholly owned SOE
- mixed-shareholding SOE
- holding company
- SOE with subsidiaries
- SOE with associate/JV
- SOE under privatization
- dormant entity

All relationships must be internally consistent.

---

# 19. QA

Test:

- ownership totals
- hierarchy navigation
- edit vs read-only
- role permissions
- legal status display
- status filtering
- no-subsidiary case
- mixed ownership
- long names
- deep-link behavior

---

# 20. Stakeholder Validation Questions

- Are legal statuses correct?
- Is ownership represented correctly?
- Are subsidiary/JV relationships sufficient?
- Which identifiers are mandatory?
- Are contacts/locations complete?
- Should some fields be historical rather than overwritten?
- Which fields are master data versus period data?

---

# 21. Deliverables

1. SOE Master Registry
2. enterprise header
3. Enterprise Profile
4. legal/status controls
5. ownership table
6. ownership visualization
7. corporate relationship table
8. hierarchy view
9. subsidiary detail
10. location view
11. basic history
12. validation schemas
13. role-aware edit/review modes
14. enterprise fixtures

---

# 22. Exit Gate

Phase 7 is complete when:

- enterprise identity is understandable
- legal/status terminology is validated
- ownership is consistent
- hierarchy works across multiple levels
- subsidiary relationships are clear
- role-aware modes work
- structures are suitable for future backend mapping

## **Enterprise and Ownership Modules — Approved**
