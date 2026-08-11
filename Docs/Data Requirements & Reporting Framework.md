**STATE-OWNED ENTERPRISES  
GOVERNANCE, ASSET & PERFORMANCE  
INTELLIGENCE PLATFORM**

**SOE-GAIP**

**Data Requirements & Reporting Framework**

Data Governance, Input, Validation and Reporting Baseline

| **Document Code** | SOE-GAIP-DRRF-001                                             |
|-------------------|---------------------------------------------------------------|
| **Version**       | 1.0                                                           |
| **Status**        | Draft for Stakeholder Validation                              |
| **Prepared for**  | Ministry of Industries and Production, Government of Pakistan |
| **Prepared by**   | Fruit of Sustainability (FOS)                                 |

*This document is a structured project design baseline and remains subject to formal stakeholder validation, policy approval and detailed technical design.*

# Document Control

| **Purpose**           | Define what data the platform requires, who owns it, how it enters the system, how it is validated and certified, how often it is reported and how it becomes executive information.        hy   |
|-----------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **Scope**             | Covers master data, SOE domain data, baseline migration, recurring reporting, input channels, data ownership, quality rules, evidence, reporting cycles, KPI governance and reporting outputs. |
| **Primary Basis**     | SOE-GAIP concept and module framework developed from the Ministry-focused SOE oversight requirements provided for this project.                                                                |
| **Current Exclusion** | External-source data verification and automated API synchronization are deferred to a separate post-development integration phase.                                                             |

# Table of Contents

**1. Data Governance Objective**

**2. Data Ownership Model**

**3. Data Input Strategy**

**4. Baseline Migration Framework**

**5. Master Data Requirements**

**6. Domain Data Requirements**

**7. Reporting Frequency Framework**

**8. Validation and Data Quality**

**9. Evidence and Certification**

**10. KPI and Metric Governance**

**11. Reporting Catalogue**

**12. Data Lifecycle and Retention**

**13. Data Security Classification**

**14. Data Governance Operating Model**

**15. Initial Implementation Deliverables**

# 1. Data Governance Objective

SOE-GAIP requires a common data framework because the value of the platform depends on comparability, traceability and confidence in the underlying information. The system should not accept unstructured or differently interpreted values without common definitions. Every material field should have a defined owner, data type, reporting frequency, validation rule, evidence requirement and approval state.

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th><strong>Core Data Principle<br />
</strong>SOEs provide and certify data they own; MoIP defines the standard, reviews submissions and governs the authoritative record; executive analytics consume only governed data according to approved status rules.</th>
</tr>
</thead>
<tbody>
</tbody>
</table>

# 2. Data Ownership Model

| **Data Domain**                       | **Primary Data Owner**                     | **SOE Certifier**                     | **MoIP Review Owner**                       |
|---------------------------------------|--------------------------------------------|---------------------------------------|---------------------------------------------|
| SOE Master Profile                    | SOE focal person / corporate affairs       | CEO or authorized corporate office    | MoIP designated Wing                        |
| Ownership & Subsidiaries              | Company Secretary / corporate affairs      | CEO / authorized certifier            | MoIP designated Wing                        |
| Land & Real Estate                    | Estate / administration / legal            | Authorized SOE management             | MoIP asset/property reviewer                |
| Machinery & Productive Assets         | Operations / engineering / asset custodian | Authorized SOE management             | MoIP technical/asset reviewer               |
| Human Resources                       | HR department                              | Head of HR / authorized management    | MoIP HR/administrative reviewer             |
| Board Governance                      | Company Secretary                          | CEO / Company Secretary as configured | MoIP governance reviewer                    |
| Executive Management                  | Company Secretary / HR / finance           | Authorized certifier                  | MoIP designated reviewer                    |
| Financial Performance                 | Finance department                         | CFO                                   | MoIP finance reviewer                       |
| Loans, Guarantees, Grants & Subsidies | Finance department                         | CFO                                   | MoIP finance reviewer                       |
| Procurement                           | Procurement / finance                      | Authorized SOE management             | MoIP procurement reviewer                   |
| Audit & PAC                           | Internal audit / finance                   | Authorized management                 | MoIP audit/PAC focal point                  |
| Litigation                            | Legal department                           | Authorized management                 | MoIP legal reviewer                         |
| Compliance                            | Company Secretary / compliance             | Authorized management                 | MoIP designated reviewer                    |
| Industrial Performance                | Operations / planning                      | CEO / authorized management           | MoIP technical/industrial reviewer          |
| Privatization / Transformation        | SOE focal team                             | CEO / authorized management           | MoIP / authorized privatization focal point |

# 3. Data Input Strategy

The initial platform should use a hybrid input model. Manual entry is appropriate for low-volume or judgment-based records. High-volume registers should use standard templates. Evidence remains document-based. Existing legacy datasets should be migrated once during onboarding.

| **Input Channel**       | **Typical Use**                                                                                  | **Reason**                                                   |
|-------------------------|--------------------------------------------------------------------------------------------------|--------------------------------------------------------------|
| Manual Structured Forms | SOE profile, Board, litigation, compliance, ownership, privatization milestones                  | Low-volume data requiring controlled fields and workflow.    |
| Excel / CSV Bulk Import | Employees, land register, machinery, vehicles, procurement, loans, audit paras                   | High-volume repetitive datasets.                             |
| Document Upload         | Financial statements, deeds, valuation reports, Board notifications, court orders, audit reports | Evidence and source documents.                               |
| Baseline Migration      | Existing SOE datasets from Excel, database exports or structured legacy files                    | One-time initial population of the platform.                 |
| Exception-Based Update  | Changes from prior period such as new hires, disposals, revaluations or Board changes            | Reduces repeated re-entry after the baseline is established. |

## 3.1 Import Control Requirements

- Every standard import template must have a version number and publication date.

- Users must not be able to alter protected template column names without receiving a validation error.

- Imports must be processed through staging tables before authoritative publication.

- Each rejected row must identify the row number, field, error and expected correction.

- Import batches must preserve the original source file, uploader, timestamp and processing result.

- Final import must require explicit user confirmation after validation.

- Where the same record already exists, the system must classify the row as new, update, duplicate or conflict rather than silently overwriting.

# 4. Baseline Migration Framework

| **Step**                   | **Activity**                                                                           | **Required Outcome** |
|----------------------------|----------------------------------------------------------------------------------------|----------------------|
| 1\. Data Discovery         | Inventory existing SOE spreadsheets, system exports, registers and document sources.   |                      |
| 2\. Source Assessment      | Identify owner, format, coverage period, completeness and known data-quality concerns. |                      |
| 3\. Mapping                | Map source columns to the SOE-GAIP data dictionary.                                    |                      |
| 4\. Cleaning               | Normalize dates, codes, units, organization names and duplicate records.               |                      |
| 5\. Staging Import         | Load mapped data into controlled staging tables.                                       |                      |
| 6\. Validation             | Run schema, business-rule, duplicate and reference checks.                             |                      |
| 7\. Exception Resolution   | SOE corrects errors or documents accepted exceptions.                                  |                      |
| 8\. SOE Verification       | Responsible functional owner confirms migrated information.                            |                      |
| 9\. Baseline Certification | Authorized SOE certifier confirms the baseline where required.                         |                      |
| 10\. MoIP Acceptance       | Ministry reviewer approves the baseline or records outstanding remediation items.      |                      |

# 5. Master Data Requirements

| **Master Dataset**           | **Initial Values / Principle**                                                                                                                                       | **Owner**  |
|------------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------|------------|
| Organization Status          | Active; Dormant; Under Liquidation; Under Privatization; Merged; Closed                                                                                              | MoIP Admin |
| Legal Status                 | Companies Act Company; Statutory Corporation; Public Limited Company; Section 42 Company; Government Company; Wholly Owned SOE; JV; Subsidiary; Holding Company; SPV | MoIP Admin |
| Sector / Sub-sector          | Government-approved taxonomy                                                                                                                                         | MoIP Admin |
| Province / District / Tehsil | Official administrative geography                                                                                                                                    | MoIP Admin |
| Asset Type                   | Land; Building; Machinery; Vehicle; IT; Office Equipment; Laboratory Equipment; Other                                                                                | MoIP Admin |
| Asset Condition              | Good; Fair; Poor; Idle; Scrap; Disposed or approved equivalent                                                                                                       | MoIP Admin |
| Employment Type              | Regular; Contract; Daily Wage; Consultant; Intern; Deputation                                                                                                        | MoIP Admin |
| Procurement Method           | Open Tender; Single Source; other approved methods                                                                                                                   | MoIP Admin |
| Audit Status                 | Open; Under Response; Recovery Pending; Settled; Closed or approved equivalent                                                                                       | MoIP Admin |
| Litigation Status            | Active; Stayed; Decided; Appealed; Closed or approved equivalent                                                                                                     | MoIP Admin |
| Compliance Status            | Compliant; Partially Compliant; Non-Compliant; Not Applicable; Pending                                                                                               | MoIP Admin |
| Risk Severity                | Information; Attention; Critical for alerting; detailed risk rating taxonomy configured separately                                                                   | MoIP Admin |

# 6. Domain Data Requirements

The following tables define the minimum structured data expected in the initial data dictionary. Detailed field lengths, enumerations and database types should be finalized in the technical data dictionary during implementation.

## 6.1 Enterprise Master Profile

| **Field / Group**                      | **Meaning**                        | **Owner** | **Frequency** | **Validation / Evidence**               |
|----------------------------------------|------------------------------------|-----------|---------------|-----------------------------------------|
| SOE_ID                                 | System-generated unique identifier | System    | Always        | Unique; immutable                       |
| SOE_Name                               | Official enterprise name           | SOE/MoIP  | Always        | Required                                |
| Abbreviation                           | Official short name                | SOE       | If applicable | Controlled text                         |
| Registration_No                        | Company registration identifier    | SOE       | If applicable | Format per approved rule                |
| SECP_Registration_No                   | SECP reference                     | SOE       | If applicable | Stored for future verification          |
| NTN / STRN                             | Tax identifiers                    | SOE       | If applicable | Sensitive/controlled access if required |
| Date_of_Incorporation                  | Legal incorporation date           | SOE       | If applicable | Valid date                              |
| Legal_Status                           | Legal form                         | SOE       | Always        | Master data                             |
| Parent_Ministry / Attached_Department  | Administrative relationship        | MoIP      | Always        | Master reference                        |
| Sector / Sub-sector                    | Economic classification            | MoIP/SOE  | Always        | Master data                             |
| SOE_Status                             | Operational status                 | MoIP      | Always        | Master data                             |
| Website / Corporate_Email              | Official contact channels          | SOE       | If available  | Format validation                       |
| Head_Office_Address                    | Official address                   | SOE       | Always        | Required                                |
| Provincial_Offices / Factory_Locations | Operating footprint                | SOE       | If applicable | Linked location records                 |

## 6.2 Corporate Ownership and Subsidiaries

| **Field / Group**                                                               | **Meaning**                        | **Owner** | **Frequency** | **Validation / Evidence**    |
|---------------------------------------------------------------------------------|------------------------------------|-----------|---------------|------------------------------|
| Relationship_ID                                                                 | Unique relationship identifier     | System    | Always        | Unique                       |
| Parent_Organization                                                             | Holding / parent entity            | SOE       | If applicable | Valid organization           |
| Related_Organization                                                            | Subsidiary / associate / JV        | SOE       | If applicable | Valid organization           |
| Relationship_Type                                                               | Holding, subsidiary, associate, JV | SOE       | Always        | Master data                  |
| Ownership_Percentage                                                            | Ownership share                    | SOE       | If applicable | 0-100%                       |
| Government_Shareholding                                                         | Government ownership               | SOE       | If applicable | 0-100%                       |
| Private / Foreign / Provincial / Employee / Public / Institutional_Shareholding | Shareholding components            | SOE       | If applicable | 0-100%; consistency rule     |
| Paid_Up / Authorized / Issued_Capital                                           | Capital structure                  | Finance   | If applicable | Non-negative monetary values |

## 6.3 Land and Real Estate

| **Field / Group**                    | **Meaning**                                                             | **Owner**           | **Frequency**            | **Validation / Evidence**       |
|--------------------------------------|-------------------------------------------------------------------------|---------------------|--------------------------|---------------------------------|
| Asset_ID                             | Unique asset identifier                                                 | System              | Always                   | Unique; immutable               |
| Province / District / Tehsil / Mouza | Administrative location                                                 | Asset owner         | Always where applicable  | Master geography                |
| Survey_No / Khasra_No                | Land reference                                                          | Asset owner         | If available             | Controlled text                 |
| Area_Value / Area_Unit               | Parcel area                                                             | Asset owner         | Always                   | Positive number + approved unit |
| Acquisition_Date                     | Date acquired                                                           | Asset owner         | If known                 | Valid date                      |
| Book_Value                           | Accounting value                                                        | Finance/Asset owner | If applicable            | Non-negative monetary value     |
| Market_Value                         | Latest market value                                                     | Asset owner         | If available             | Requires valuation date/method  |
| Valuation_Date / Method / Authority  | Valuation context                                                       | Asset owner         | When market value exists | Required with market value      |
| Purpose / Current_Use                | Intended and actual use                                                 | Asset owner         | Always                   | Controlled category + notes     |
| Occupancy_Status                     | Vacant / occupied / other                                               | Asset owner         | Always                   | Master data                     |
| Encroachment_Status                  | Encroached / clear / under verification                                 | Asset/Legal         | Always                   | Controlled status               |
| Litigation_Status                    | Legal dispute status                                                    | Legal               | Always                   | Linked litigation where yes     |
| Lease_Status                         | Lease condition                                                         | Asset owner         | If applicable            | Linked lease evidence           |
| GIS_Geometry                         | Point or polygon                                                        | Asset owner         | Where available          | Valid geospatial data           |
| Evidence                             | Ownership deed, mutation, revenue record, valuation, lease, photographs | Asset owner         | As required              | Document linkage                |

## 6.4 Buildings, Machinery and Vehicles

| **Field / Group**             | **Meaning**                                | **Owner**           | **Frequency**            | **Validation / Evidence**   |
|-------------------------------|--------------------------------------------|---------------------|--------------------------|-----------------------------|
| Asset_ID                      | Unique asset identifier                    | System              | Always                   | Unique                      |
| Asset_Subtype                 | Building / Machinery / Vehicle / Equipment | Asset owner         | Always                   | Master data                 |
| Description / Manufacturer    | Identity or make                           | Asset owner         | As applicable            | Required by subtype         |
| Purchase_Cost / Purchase_Date | Acquisition information                    | Finance/Asset owner | If available             | Valid date/value            |
| Depreciation / Useful_Life    | Accounting/life data                       | Finance             | If applicable            | Non-negative                |
| Condition                     | Current condition                          | Asset owner         | Always                   | Master data                 |
| Location                      | Facility or geo-location                   | Asset owner         | Always                   | Valid location              |
| Capacity / Utilization        | Productive capacity and use                | Operations          | For productive assets    | Non-negative; unit required |
| Maintenance_Schedule          | Planned maintenance                        | Operations          | For applicable machinery | Valid dates/status          |
| Occupancy / Floor_Area        | Building use                               | Asset owner         | For buildings            | Positive area               |
| Mileage / Fuel / Insurance    | Vehicle operating data                     | Transport/Admin     | For vehicles             | Validation by field         |
| Disposal_Status               | Active / disposed / auctioned / scrap      | Asset owner         | Always                   | Controlled status           |

## 6.5 Human Resources

| **Field / Group**                                 | **Meaning**                                                   | **Owner**     | **Frequency**          | **Validation / Evidence**    |
|---------------------------------------------------|---------------------------------------------------------------|---------------|------------------------|------------------------------|
| Employee_ID                                       | SOE employee identifier                                       | HR            | Always                 | Unique within SOE            |
| CNIC                                              | National identity number                                      | HR            | Where legally required | Sensitive; format validation |
| Name                                              | Employee name                                                 | HR            | Always                 | Required                     |
| Designation / BPS / Pay_Scale                     | Position and grade                                            | HR            | As applicable          | Reference/controlled         |
| Employment_Type                                   | Regular, contract, daily wage, consultant, intern, deputation | HR            | Always                 | Master data                  |
| Salary / Allowances / Benefits / Pension          | Compensation information                                      | HR/Finance    | As applicable          | Sensitive; non-negative      |
| Joining_Date / Retirement_Date                    | Service dates                                                 | HR            | As applicable          | Date consistency             |
| Qualification / Gender / Province / Disability    | Workforce attributes                                          | HR            | As applicable          | Controlled values            |
| Posting / Reporting_Officer                       | Organizational assignment                                     | HR            | Always                 | Valid references             |
| Performance_Rating / Training / Disciplinary_Case | Workforce management                                          | HR            | If applicable          | Restricted access            |
| Asset_Declaration_Status                          | Declaration compliance                                        | HR/Compliance | If required            | Controlled status            |

## 6.6 Board and Executive Management

| **Field / Group**                             | **Meaning**                                                      | **Owner**                 | **Frequency**  | **Validation / Evidence** |
|-----------------------------------------------|------------------------------------------------------------------|---------------------------|----------------|---------------------------|
| Board_Member_ID                               | Unique member record                                             | System                    | Always         | Unique                    |
| Name / CNIC                                   | Member identity                                                  | Company Secretary         | As required    | Sensitive CNIC            |
| Member_Type                                   | Chairman, independent, government, private, woman director, etc. | Company Secretary         | Always         | Controlled value          |
| Appointment_Date / Expiry_Date                | Board term                                                       | Company Secretary         | Always         | Expiry after appointment  |
| Attendance                                    | Meeting attendance                                               | Company Secretary         | Periodic       | 0-100% or meeting counts  |
| Committee_Membership                          | Audit, HR, Risk, Procurement, etc.                               | Company Secretary         | If applicable  | Valid committee           |
| Conflict_Declaration / Asset_Declaration      | Governance declarations                                          | Company Secretary         | As required    | Evidence/status           |
| Remuneration / Sitting_Fee / Travel_Expense   | Board cost                                                       | Finance/Company Secretary | If applicable  | Sensitive monetary values |
| Executive_Role                                | CEO, MD, GM, Director                                            | HR/Company Secretary      | For executives | Controlled value          |
| Executive_Salary / Bonus / Perks              | Executive compensation                                           | HR/Finance                | If applicable  | Sensitive                 |
| Official_Residence / Vehicle / Foreign_Visits | Executive benefits                                               | Admin/Finance             | If applicable  | Evidence as required      |
| Performance_KPI                               | Executive performance indicator                                  | Management                | Periodic       | Defined KPI reference     |

## 6.7 Financial Performance

| **Field / Group**                      | **Meaning**                                          | **Owner**   | **Frequency**   | **Validation / Evidence**          |
|----------------------------------------|------------------------------------------------------|-------------|-----------------|------------------------------------|
| Reporting_Period                       | Financial reporting period                           | System/MoIP | Always          | Valid reporting period             |
| Annual_Budget                          | Approved budget                                      | Finance     | Annual          | Non-negative                       |
| Revenue                                | Total revenue                                        | Finance     | Periodic/Annual | Monetary                           |
| Operating_Expenses                     | OPEX                                                 | Finance     | Periodic/Annual | Monetary                           |
| Capital_Expenditure                    | CAPEX                                                | Finance     | Periodic/Annual | Monetary                           |
| Profit_or_Loss                         | Net result                                           | Finance     | Periodic/Annual | Signed monetary                    |
| Cash_Flow                              | Cash-flow measure                                    | Finance     | Annual          | Signed monetary                    |
| Working_Capital                        | Working capital                                      | Finance     | Annual          | Signed monetary                    |
| Current_Ratio / Debt_Ratio / ROA / ROE | Calculated ratios                                    | System      | Annual          | Formula-driven                     |
| Receivables / Payables / Inventory     | Balance-sheet working items                          | Finance     | Periodic/Annual | Non-negative                       |
| Audit_Status                           | Financial statement audit status                     | Finance     | Annual          | Controlled status                  |
| Financial_Statements                   | Balance Sheet, Income Statement, Cash Flow and Notes | Finance     | Annual          | Required evidence where applicable |

## 6.8 Loans, Guarantees, Grants and Subsidies

| **Field / Group**                         | **Meaning**                   | **Owner**             | **Frequency** | **Validation / Evidence** |
|-------------------------------------------|-------------------------------|-----------------------|---------------|---------------------------|
| Loan_ID                                   | Unique loan identifier        | System                | Always        | Unique                    |
| Lender / Loan_Type                        | Funding source and category   | Finance               | Always        | Controlled text/master    |
| Principal / Interest / Outstanding        | Loan values                   | Finance               | Periodic      | Non-negative              |
| Repayment_Schedule                        | Future obligations            | Finance               | Periodic      | Valid dates/amounts       |
| Default_Status                            | Repayment/default condition   | Finance               | Periodic      | Controlled status         |
| Guarantee                                 | Government or other guarantee | Finance               | If applicable | Amount/type/evidence      |
| Grant_Source / Amount                     | Grant or subsidy source/value | Finance               | As applicable | Non-negative              |
| Project / Utilization / Remaining_Balance | Use of funds                  | Finance/Project owner | Periodic      | Consistency checks        |
| Completion_Status                         | Grant/project completion      | Project owner         | Periodic      | Controlled status         |

## 6.9 Procurement

| **Field / Group**            | **Meaning**                            | **Owner**           | **Frequency** | **Validation / Evidence** |
|------------------------------|----------------------------------------|---------------------|---------------|---------------------------|
| Procurement_ID               | Unique procurement/contract identifier | System              | Always        | Unique                    |
| Procurement_Plan_Reference   | Annual plan reference                  | Procurement         | If applicable | Controlled text           |
| Vendor                       | Supplier/contractor                    | Procurement         | Always        | Required                  |
| Contract_Value               | Contract amount                        | Procurement/Finance | Always        | Positive monetary         |
| Method                       | Procurement method                     | Procurement         | Always        | Master data               |
| PPRA_Compliance              | Compliance status                      | Procurement         | Always        | Controlled status         |
| Award_Date / Completion_Date | Lifecycle dates                        | Procurement         | As applicable | Date consistency          |
| Completion_Status            | Open / completed / terminated etc.     | Procurement         | Periodic      | Controlled status         |

## 6.10 Audit and PAC

| **Field / Group**                    | **Meaning**                              | **Owner**        | **Frequency** | **Validation / Evidence**            |
|--------------------------------------|------------------------------------------|------------------|---------------|--------------------------------------|
| Audit_ID / Para_ID                   | Unique audit and observation identifiers | System           | Always        | Unique                               |
| Audit_Type                           | Internal, external, AGP, special         | Audit            | Always        | Master data                          |
| Observation                          | Audit issue                              | Audit            | Always        | Required                             |
| Amount_Involved                      | Financial exposure                       | Audit/Finance    | If applicable | Non-negative                         |
| Management_Response                  | SOE response                             | Responsible unit | As required   | Required before review if configured |
| Corrective_Action / Owner / Due_Date | Remediation                              | Responsible unit | For open para | Required                             |
| PAC_Observation                      | PAC direction                            | Audit/MoIP       | If applicable | Controlled text/evidence             |
| Recovery_Status / Amount_Recovered   | Recovery tracking                        | Finance/Audit    | If applicable | Consistency checks                   |
| Para_Status                          | Pending / settled / closed etc.          | Audit/MoIP       | Always        | Controlled status                    |

## 6.11 Litigation

| **Field / Group**                       | **Meaning**                  | **Owner**     | **Frequency** | **Validation / Evidence** |
|-----------------------------------------|------------------------------|---------------|---------------|---------------------------|
| Case_ID                                 | Unique legal case identifier | System        | Always        | Unique                    |
| Court / Case_Number                     | Case reference               | Legal         | Always        | Required                  |
| Petitioner / Respondent                 | Parties                      | Legal         | Always        | Required                  |
| Nature                                  | Case category/summary        | Legal         | Always        | Controlled + notes        |
| Amount_Involved                         | Financial exposure           | Legal/Finance | If applicable | Monetary                  |
| Lawyer                                  | Counsel                      | Legal         | If applicable | Text/reference            |
| Status                                  | Current case status          | Legal         | Always        | Master data               |
| Next_Hearing                            | Upcoming hearing             | Legal         | If active     | Future/valid date         |
| Related_Asset / Contract / Other_Record | Context link                 | Legal         | If applicable | Valid entity reference    |
| Court_Order / Evidence                  | Supporting documents         | Legal         | As applicable | Document linkage          |

## 6.12 Compliance

| **Field / Group**      | **Meaning**                                                                                                                                                | **Owner**   | **Frequency**    | **Validation / Evidence** |
|------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------|-------------|------------------|---------------------------|
| Requirement_ID         | Unique compliance obligation                                                                                                                               | System      | Always           | Unique                    |
| Compliance_Area        | SOE Act, Companies Act, PPRA, SECP, Tax, EOBI, ESSI, Environmental, Labour, Board Evaluation, Annual Report, Strategic Plan, Risk Register, Internal Audit | MoIP        | Always           | Master data               |
| Frequency              | Monthly/quarterly/annual/event-based                                                                                                                       | MoIP        | Always           | Controlled value          |
| Due_Date               | Required completion date                                                                                                                                   | System/MoIP | Per cycle        | Valid date                |
| Responsible_Officer    | SOE owner                                                                                                                                                  | SOE         | Always           | Valid user/role           |
| Status                 | Compliance status                                                                                                                                          | SOE/MoIP    | Always           | Controlled                |
| Evidence               | Proof of compliance                                                                                                                                        | SOE         | As required      | Document linkage          |
| Reviewer / Review_Date | MoIP verification                                                                                                                                          | MoIP        | When reviewed    | Valid user/date           |
| Non_Compliance_Reason  | Reason and remediation                                                                                                                                     | SOE         | If not compliant | Required conditionally    |

## 6.13 Privatization and Industrial Performance

| **Field / Group**                             | **Meaning**                       | **Owner**              | **Frequency** | **Validation / Evidence** |
|-----------------------------------------------|-----------------------------------|------------------------|---------------|---------------------------|
| Privatization_Case_ID                         | Unique transformation case        | System                 | If applicable | Unique                    |
| Current_Stage                                 | Approved stage taxonomy           | Authorized focal point | Periodic      | Controlled                |
| Cabinet / CCOP / PC_Decision                  | Decision references               | Authorized focal point | If applicable | Evidence linkage          |
| Financial_Advisor / Valuation / Due_Diligence | Transaction preparation           | Authorized focal point | If applicable | Status + documents        |
| EOI / Bidding / Sale / Post_Sale              | Transaction milestones            | Authorized focal point | If applicable | Dates/status/evidence     |
| Installed_Capacity                            | Maximum installed capacity        | Operations             | Periodic      | Number + unit             |
| Actual_Production                             | Actual output                     | Operations             | Periodic      | Number + unit             |
| Capacity_Utilization                          | Calculated utilization            | System                 | Periodic      | Formula-driven            |
| Exports / Imports / Domestic_Sales            | Market performance                | Finance/Operations     | Periodic      | Monetary or approved unit |
| Employment                                    | Employment contribution           | HR/Operations          | Periodic      | Non-negative count        |
| Energy_Consumption / Carbon_Emissions         | Resource/environmental indicators | Operations             | Periodic      | Number + unit/method      |

# 7. Reporting Frequency Framework

| **Domain**               | **Recommended Frequency**                                     | **Framework Rule**                                                               |
|--------------------------|---------------------------------------------------------------|----------------------------------------------------------------------------------|
| SOE Master Profile       | Event-driven + annual confirmation                            | Update when legal/organizational change occurs; certify annually.                |
| Ownership / Subsidiaries | Event-driven + annual confirmation                            | Update when ownership structure changes.                                         |
| Asset Register           | Continuous maintenance + annual certification                 | High-value changes may be event-driven; full register certified annually.        |
| HR / Workforce           | Monthly or quarterly aggregate; annual detailed certification | Detailed frequency to be agreed by MoIP based on operational burden.             |
| Board Governance         | Event-driven                                                  | Appointments, expiries, vacancies and committee changes updated when they occur. |
| Financial Performance    | Monthly/quarterly management data + annual audited data       | Exact frequency configurable by SOE class or MoIP policy.                        |
| Loans / Guarantees       | Monthly or quarterly                                          | Repayment obligations monitored continuously through due dates.                  |
| Grants / Subsidies       | Quarterly or project-based                                    | Update utilization and balance during project lifecycle.                         |
| Procurement              | Quarterly + annual plan                                       | Major contracts may be recorded event-by-event.                                  |
| Audit / PAC              | Continuous                                                    | Update whenever response, recovery, hearing or closure status changes.           |
| Litigation               | Continuous                                                    | Next hearing and material case status updated event-by-event.                    |
| Compliance               | As per obligation frequency                                   | Each requirement carries its own frequency and due date.                         |
| Industrial Performance   | Monthly or quarterly                                          | Annual certified summary for portfolio reporting.                                |
| Privatization            | Milestone-based                                               | Update when a formal stage or transaction event changes.                         |

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th><strong>Important<br />
</strong>These frequencies are a proposed operating framework. Final mandatory frequencies should be approved by MoIP during requirements validation and can then be configured without code changes.</th>
</tr>
</thead>
<tbody>
</tbody>
</table>

# 8. Validation and Data Quality

| **Quality Dimension**   | **Definition**                                                              |
|-------------------------|-----------------------------------------------------------------------------|
| Completeness            | Required fields and required evidence are present.                          |
| Validity                | Values conform to datatype, format, range and reference rules.              |
| Consistency             | Related values agree, for example ownership percentages or period totals.   |
| Uniqueness              | Duplicate SOEs, assets, employees, loans or cases are prevented or flagged. |
| Timeliness              | Data is submitted and updated within the configured reporting window.       |
| Evidence                | Required supporting documents exist and remain linked.                      |
| Historical Plausibility | Material change from prior periods is flagged for explanation.              |
| Verification            | Record carries the correct workflow, reviewer and approval status.          |

## 8.1 Core Validation Rules

| **Area**   | **Rule**                                                                                            |
|------------|-----------------------------------------------------------------------------------------------------|
| Ownership  | Shareholding percentages should reconcile to the approved ownership model or require explanation.   |
| Board      | Expiry date must be after appointment date; active member cannot be simultaneously marked expired.  |
| Land       | Market value requires valuation date and source/method when policy requires.                        |
| Assets     | Disposed or auctioned assets should not contribute to active productive-asset counts.               |
| HR         | Filled and vacant posts should reconcile to sanctioned posts unless an approved exception exists.   |
| Financial  | Ratio calculations are system-derived where source components exist.                                |
| Loans      | Repayment dates and outstanding amounts must be logically consistent.                               |
| Audit      | Closed/settled paras require closure status and supporting evidence where mandated.                 |
| Litigation | Active cases with scheduled hearings require a valid next-hearing date where known.                 |
| Compliance | Non-compliant status requires reason and remediation/action where configured.                       |
| Industrial | Capacity utilization must be calculated from compatible installed and actual production units.      |
| Imports    | Rows failing mandatory validation remain in staging and cannot silently enter authoritative tables. |

# 9. Evidence and Certification

| **Data Area**          | **Typical Evidence**                                                                      |
|------------------------|-------------------------------------------------------------------------------------------|
| SOE Legal Profile      | Registration/incorporation or official notification where applicable.                     |
| Ownership              | Shareholding statement, statutory filing or other approved evidence.                      |
| Land                   | Ownership deed, mutation, revenue record, lease, valuation and court order as applicable. |
| Financials             | Audited financial statements and notes for annual reporting.                              |
| Board                  | Appointment notification, declarations and committee records as applicable.               |
| Audit                  | Audit report, management response, recovery evidence and closure documentation.           |
| Litigation             | Petition/order/case record and relevant court documents.                                  |
| Compliance             | Filing, certificate, report or policy evidence specified for the obligation.              |
| Privatization          | Cabinet/CCOP/PC decisions, valuation, due diligence and transaction documents.            |
| Industrial Performance | Source production or approved operational statement where required.                       |

## 9.1 Certification Rules

- Certification applies to defined reporting cycles or domain sections, not to every keystroke.

- The system must show the certifier a clear summary of completeness, material exceptions and outstanding validations before certification.

- Certification must record certifier identity, role, timestamp, statement version and submission version.

- After MoIP approval and locking, later correction must create a new version and preserve the original certified snapshot.

- Where data remains provisional, unaudited or estimated, the certification state must not misrepresent it as audited or independently verified.

# 10. KPI and Metric Governance

| **KPI Domain**   | **Illustrative Metrics**                                                                    | **Data Owner**         |
|------------------|---------------------------------------------------------------------------------------------|------------------------|
| Financial Health | Profit/loss trend; revenue growth; current ratio; debt ratio; ROA; ROE; subsidy dependence  | Finance                |
| Fiscal Exposure  | Outstanding debt; government guarantees; grants/subsidies; contingent liabilities           | Finance / MoIP         |
| Asset Efficiency | Vacant land; encroached land; idle machinery; asset utilization; market vs book value       | Asset / Operations     |
| Governance       | Board vacancies; members expiring; attendance; committee completeness; declaration status   | Company Secretary      |
| Workforce        | Sanctioned vs filled; vacancy rate; employment composition                                  | HR                     |
| Audit            | Pending paras; amount involved; recovery outstanding; age of unresolved paras               | Audit / Finance        |
| Legal            | Active cases; amount involved; high-value matters; upcoming hearings                        | Legal                  |
| Compliance       | On-time compliance; non-compliant items; overdue evidence                                   | Compliance             |
| Industrial       | Capacity utilization; production trend; exports; domestic sales; employment; energy; carbon | Operations             |
| Privatization    | Stage progress; overdue milestones; potential valuation/proceeds where formally approved    | Authorized focal point |

## 10.1 KPI Definition Standard

- Every KPI must have a unique ID and business name.

- Definition and formula must identify exact source fields.

- Unit, reporting frequency and period logic must be specified.

- Data-status rule must specify whether Draft, Certified, Approved or Locked data is eligible.

- Owner and approving authority must be identified.

- Materiality threshold, target and RAG logic must be configurable and separately approved.

- Formula changes must create a new KPI version so historical reports remain interpretable.

# 11. Reporting Catalogue

| **Report**                    | **Audience**                                    | **Frequency**           | **Core Content**                                                                                    |
|-------------------------------|-------------------------------------------------|-------------------------|-----------------------------------------------------------------------------------------------------|
| SOE Profile Report            | MoIP / SOE                                      | On demand / annual      | Identity, ownership, governance, assets, workforce, finance and key risks.                          |
| SOE Annual Submission         | MoIP                                            | Annual                  | Certified detailed submission by domain.                                                            |
| Portfolio Performance Report  | Secretary / Minister                            | Quarterly / annual      | Cross-SOE financial, governance and industrial performance.                                         |
| Fiscal Exposure Report        | Secretary / Minister / authorized finance users | Quarterly               | Debt, guarantees, subsidy, grants, losses and contingent exposure.                                  |
| Asset Portfolio Report        | MoIP / Minister                                 | Quarterly / annual      | Land, buildings, machinery, valuation, utilization, encroachment and litigation.                    |
| National Industrial Asset Map | Authorized users                                | Live from approved data | GIS view of properties, facilities and land.                                                        |
| Board Governance Report       | MoIP / Secretary                                | Monthly                 | Vacancies, expiries, committees, declarations and attendance.                                       |
| Audit & PAC Report            | MoIP / authorized oversight users               | Monthly / quarterly     | Open paras, amounts, recoveries, aging and PAC status.                                              |
| Legal Exposure Report         | MoIP / Secretary                                | Monthly / quarterly     | Active cases, amounts, hearings and major legal risks.                                              |
| Compliance Report             | MoIP                                            | Monthly / quarterly     | Due, compliant, overdue and non-compliant obligations.                                              |
| Privatization Pipeline Report | Authorized leadership                           | Monthly / milestone     | Stage progress, overdue actions and transaction status.                                             |
| Industrial Performance Report | MoIP / Minister                                 | Monthly / quarterly     | Capacity, production, utilization, exports, sales and employment.                                   |
| Secretary Exception Brief     | Secretary                                       | Weekly / on demand      | Overdue obligations, high risks, pending approvals and escalations.                                 |
| Minister Executive Brief      | Minister                                        | Monthly / on demand     | Portfolio health, fiscal exposure, asset opportunities, governance concerns and decisions required. |

# 12. Data Lifecycle and Retention

| **Lifecycle Stage** | **Rule**                                                                                                          |
|---------------------|-------------------------------------------------------------------------------------------------------------------|
| Create / Import     | Record enters Draft or Staging state.                                                                             |
| Validate            | System validates structure, references, business rules and evidence.                                              |
| Certify             | Authorized SOE role certifies the applicable submission.                                                          |
| Review              | MoIP reviews, queries, returns or approves.                                                                       |
| Approve / Lock      | Approved snapshot becomes immutable for the reporting period.                                                     |
| Use                 | Approved data feeds reports, dashboards, KPI and risk models.                                                     |
| Correct             | Correction creates new version without deleting prior approved history.                                           |
| Archive             | Inactive master records may be archived while historical references remain.                                       |
| Retain / Dispose    | Retention and disposal periods follow Government record-retention policy and must be finalized before production. |

# 13. Data Security Classification

| **Classification**                | **Handling Principle**                                                                                                      |
|-----------------------------------|-----------------------------------------------------------------------------------------------------------------------------|
| Public / Publishable              | Information formally approved for public disclosure. Public portal is not part of initial scope unless separately approved. |
| Internal Government               | Routine SOE operational and administrative information for authorized government users.                                     |
| Confidential                      | Detailed financial, legal, audit, procurement, property or governance information requiring restricted access.              |
| Restricted Personal               | CNIC, salary, disciplinary records and other sensitive personal information.                                                |
| Highly Restricted / Case Specific | Information requiring explicit role or case-level authorization based on Government policy.                                 |

# 14. Data Governance Operating Model

| **Role**                   | **Data Governance Responsibility**                                                                                                     |
|----------------------------|----------------------------------------------------------------------------------------------------------------------------------------|
| MoIP Data Governance Owner | Approves data standards, reporting cycles, master data and governance policies.                                                        |
| Domain Data Steward        | Maintains definitions, validations and reporting expectations for a specific domain.                                                   |
| SOE Data Owner             | Accountable for accuracy and timeliness of domain data within the SOE.                                                                 |
| SOE Data Contributor       | Enters or imports data and resolves validation exceptions.                                                                             |
| SOE Certifier              | Formally certifies defined submissions.                                                                                                |
| MoIP Reviewer              | Reviews evidence, exceptions and submitted data within assigned scope.                                                                 |
| System Administrator       | Configures approved rules and master data without owning business decisions.                                                           |
| Technical Custodian        | Operates platform, backups, security monitoring and releases without changing authoritative business data outside governed procedures. |

# 15. Initial Implementation Deliverables

| **Deliverable**              | **Purpose**                                                                                                                  |
|------------------------------|------------------------------------------------------------------------------------------------------------------------------|
| National SOE Data Dictionary | Field-level definitions, types, allowed values, evidence, sensitivity and reporting frequency.                               |
| Standard Import Templates    | Versioned Excel/CSV templates for assets, HR, machinery, vehicles, loans, procurement, audit and other high-volume datasets. |
| Master Data Catalogue        | Approved taxonomies and reference lists.                                                                                     |
| Validation Rule Catalogue    | Field, cross-field, historical and business-rule validations.                                                                |
| Reporting Calendar           | Monthly, quarterly, annual and event-driven obligations by domain.                                                           |
| Certification Matrix         | Which roles certify which data and at what stage.                                                                            |
| KPI Dictionary               | Formula, source fields, unit, frequency, status eligibility and owner.                                                       |
| Report Catalogue             | Audience, frequency, filters, content and export format.                                                                     |
| Migration Mapping Pack       | Source-to-target mapping for each initial SOE dataset.                                                                       |
| Data Quality Dashboard       | Completeness, validity, timeliness, evidence and verification indicators.                                                    |
| Data Governance SOP          | Responsibilities for entry, correction, review, approval, retention and escalation.                                          |

## 15.1 Phase Boundary for External Integrations

Initial implementation must be fully operational without external APIs. External-system integration, automated verification and synchronization shall be handled as a separate post-development phase after the core data model, workflows and authoritative internal records have stabilized. Phase 1 should retain external reference fields and documented internal APIs so future integration does not require restructuring the platform.
