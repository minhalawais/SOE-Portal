# Phase 23 — Workflow Tests

**Machine:** `src/workflow/submission.ts`  
**Golden path service:** `mockFinanceWorkflowService`  
**Automated:** `src/workflow/financeWorkflow.test.ts`, `src/qa/phase23.crossportal.workflow.test.ts`

---

## Valid transitions (subset)

```text
Draft → In Progress
In Progress → Ready for Review | Draft
Ready for Review → Ready for Certification | In Progress
Ready for Certification → Certified | In Progress
Certified → Submitted
Submitted → Under Review
Under Review → Clarification | Returned | Approved
Clarification → Resubmitted
Resubmitted → Under Review
Returned → In Progress
Approved → Locked
```

Invalid examples (must block): Draft → Locked; Submitted → Certified; In Progress → Approved.

---

## Golden workflow (core stakeholder)

| Step | Actor | Action | Consequence |
|---|---|---|---|
| 1 | Finance Officer | Attach evidence + save draft | No approved KPI |
| 2 | Finance Officer | Mark complete | Ready for review path |
| 3 | Focal Person | Send for certification | Ready for certification |
| 4 | CFO | Certify | Certified (simulated, not e-sign) |
| 5 | Focal Person | Submit to MoIP | Appears in MoIP queue |
| 6 | MoIP Reviewer | Under review | Review workspace |
| 7a | MoIP Reviewer | Clarification (optional) | SOE clarification inbox |
| 7b | FO / Focal | Respond + resubmit | Version bump |
| 8 | MoIP Reviewer | Approve | Approved → Locked + approved KPI |

---

## Cross-portal consequence checks

| From | To | Assertion |
|---|---|---|
| SOE draft finance | MoIP queue | Not listed as Submitted |
| SOE draft finance | approvedFinanceKpis | Unchanged |
| MoIP approve/lock | approvedFinanceKpis | Row created |
| Locked finance | Intelligence scorecard | Readable for org |
| MoIP Analyst | Approve API | Rejected |

---

## Manual portal psychology checks

| Portal | After lock | Must not show |
|---|---|---|
| Minister / PMO | Strategic KPI / reports using approved data | Certify / Approve / Return controls |
| Secretary | Exception attention items | SOE data-entry chrome |
| Assurance | Evidence trace read | Mutation actions |

---

## Retest trigger

Any change to `submission.ts`, finance workflow service, MoIP queue filters, or approved KPI writers requires full golden path retest.
