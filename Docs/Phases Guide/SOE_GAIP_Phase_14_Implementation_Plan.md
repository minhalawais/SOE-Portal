# SOE-GAIP Frontend Development
## Phase 14 Implementation Plan — Tasks, Notifications and Early Warning UX

**Project:** State-Owned Enterprises Governance, Asset & Performance Intelligence Platform (SOE-GAIP)  
**Development Stage:** Frontend-only stakeholder validation prototype  
**Data Source:** Realistic dummy data through mock services  
**Backend / Database:** Out of scope  
**External Government API Integrations:** Future phase  
**Implementation Principle:** Build the intended production operating model in the frontend without creating backend dependencies.

---

# 1. Phase Objective

Phase 14 demonstrates how the future governance engine proactively turns deadlines, risk conditions and workflow events into tasks, notifications and early warnings.

The frontend should make the system feel active rather than passive.

---

# 2. Core Components

Build:

- Task Centre
- Notification Centre
- Alert Centre
- Escalation View
- Rule Metadata/Explanation
- Task Detail
- Alert Detail
- User/Role queues

---

# 3. Task Model

Each task should include:

- Task ID
- title
- type
- source module
- linked record
- assigned role/user
- organization
- created date
- due date
- priority
- status
- next action
- completion date
- history

Statuses:

- Open
- In Progress
- Completed
- Overdue
- Cancelled

---

# 4. Task Centre

Filters:

- assigned to me
- organization
- module
- due date
- status
- priority

Views:

- My Tasks
- Team Tasks where authorized
- Overdue
- Due Soon
- Completed

---

# 5. Notification Model

Notifications should be lightweight informational events.

Examples:

- submission received
- clarification requested
- certification requested
- review completed
- task assigned
- document added

Each notification should link to relevant context.

---

# 6. Alert Model

Alerts represent conditions requiring awareness or action.

Severity:

- Information
- Attention
- Critical

Each alert includes:

- rule/trigger
- generated date
- source entity
- severity
- explanation
- recommended next action
- linked record
- resolution state

---

# 7. Simulated Rule Examples

Implement at least:

```text
Board expiry < 90 days
→ Attention
```

```text
Board expiry < 30 days
→ Critical
```

```text
Loan repayment overdue
→ Critical
```

```text
Financial submission missing
→ Escalation
```

Additional useful prototype rules:

- compliance due within 14 days
- audit para overdue
- property valuation missing
- clarification overdue

Clearly label thresholds as prototype rules where not source-mandated.

---

# 8. Rule Evaluation Architecture

Keep simulated rules centralized.

Example:

```text
Domain Data
↓
Rule Evaluator
↓
Alert / Task
↓
Relevant Portal
```

Do not hardcode warnings independently inside dashboard components.

---

# 9. Alert-to-Task Relationship

Some alerts should create tasks.

Example:

```text
Board expiry < 30 days
↓
Critical Alert
↓
Task: Initiate appointment process
```

Not every informational alert requires a task.

---

# 10. Escalation

Represent escalation as:

- reason
- originating task/alert
- current owner
- escalation level
- escalated by/system
- escalated date
- due date
- status

The frontend should show escalation history.

---

# 11. Role-Specific Priorities

SOE User:
- completion tasks
- clarifications
- evidence gaps

MoIP Reviewer:
- reviews
- overdue responses
- data-quality issues

Secretary:
- critical escalations
- overdue obligations
- pending decisions

Minister:
- only material strategic alerts

Do not expose operational notification noise to senior roles.

---

# 12. Alert Deduplication UX

Avoid displaying multiple cards for the same underlying issue.

Group repeated/similar alerts where possible.

Example:

- 5 Board expiries within 90 days → one summary with drill-down

---

# 13. Resolution

Allow mock resolution:

- mark task complete
- mark alert resolved
- add resolution note
- navigate to source record

Resolved alerts should remain historically visible where useful.

---

# 14. Dummy Data Requirements

Create:

- normal task
- due-soon task
- overdue task
- critical Board alert
- overdue loan
- missing submission
- compliance due soon
- resolved alert
- escalated issue

---

# 15. QA

Test:

- due date calculations
- severity
- role visibility
- task assignment
- deep links
- alert resolution
- escalation
- grouped alerts
- no-alert state
- many-alert state

---

# 16. Stakeholder Validation Questions

- Which alerts are genuinely useful?
- What thresholds should create Attention vs Critical?
- Which alerts should create tasks automatically?
- Who receives escalations?
- What should senior executives see?
- Which notifications should be email/SMS later versus in-app only?
- What constitutes resolution?

---

# 17. Deliverables

1. Task Centre
2. Task Detail
3. Notification Centre
4. Alert Centre
5. Alert Detail
6. centralized rule evaluator
7. simulated alert-to-task behavior
8. Escalation View
9. role-aware queues
10. resolution flow
11. realistic alert/task fixtures

---

# 18. Exit Gate

Phase 14 is complete when:

- tasks and alerts are generated from centralized dummy rules
- users see role-relevant obligations
- deep links work
- overdue/critical states are clear
- escalation is understandable
- senior portals are not flooded with low-level notifications
- stakeholders approve alert usefulness and severity concepts

## **Tasks, Notifications and Early Warning UX — Approved**
