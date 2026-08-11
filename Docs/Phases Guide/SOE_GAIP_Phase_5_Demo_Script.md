# Phase 5 Demo Script — Financial Golden Workflow

Simulated prototype. Use **Reset Demo Data** before a stakeholder run.

## Cast

| Step | Role (demo switcher) | Org / Period |
|---|---|---|
| 1–5 | Finance Officer | PSM · FY2027 |
| 6 | SOE Focal Person | PSM · FY2027 |
| 7–8 | CFO | PSM · FY2027 |
| 9–10 | MoIP Reviewer | Submission Queue |
| 11–12 | Finance Officer → Focal | Clarification / Resubmit |
| 13–14 | MoIP Reviewer → Minister | Approve → Executive KPI |

## Path

1. Finance Officer → `/soe/finance` → Open form  
2. Edit revenue (large change triggers YoY warning) → Save draft  
3. Attach evidence (simulated)  
4. Mark section complete  
5. Focal Person → Internal Review → Send for certification  
6. CFO → Certification → Certify  
7. Focal/CEO → Submit to MoIP  
8. MoIP Reviewer → `/moip/submissions` → Review PSM  
9. Take under review → Request clarification on subsidies  
10. Finance Officer → Clarification → respond → Focal resubmits (v1.1)  
11. MoIP approves and locks  
12. Minister dashboard shows approved KPI → Trace to source  

## Checks

- Finance Officer cannot certify  
- Draft values do not appear on Minister KPIs  
- After approve, finance pack is read-only  
- History shows timeline + version snapshots  
