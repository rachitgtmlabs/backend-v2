---
name: task-plan-tasks-alerts
description: >
  ACTIVATE when the user asks about tasks, alerts, risks, "what's on my plate",
  upcoming deadlines, reminders, or anything time-sensitive. Covers open tasks,
  risk summary by severity, lease-specific tasks/alerts, and upcoming
  reminders.
license: proprietary
metadata:
  author: lease-iq
  version: "1.0.0"
---

# Tasks, Alerts & Reminders Operations

## Capabilities

- Open tasks across portfolio or property ("what's on my plate")
- Risk summary by severity (critical / high / medium / low) — what's exposed
- Tasks AND alerts for one specific lease (mirrors the Tasks & Alerts tab)
- Upcoming reminders & deadlines within a time window

## Required Context

- `fetch-open-tasks`: optional `portfolio_id`, `property_id`, `limit`
- `fetch-risk-summary`: optional `portfolio_id`, `property_id`, `minSeverity`
- `fetch-tasks-alerts`: `portfolio_id`, `property_id`, optional `lease_id`
- `fetch-reminders`: optional `portfolio_id`, `property_id`, `withinDays` (default sensible window)

## Dependencies

- None of these tools are dynamic — they aggregate. They can be emitted in parallel safely.
- For broad "what needs my attention" questions, plan **all three in parallel** in one iteration: risks (high+), open tasks, upcoming reminders.

## Task Graph Patterns

### "What's on my plate" / broad attention question

```json
[
  { "id":"t1","toolName":"fetch-risk-summary","inputs":"{\"minSeverity\":\"high\"}","dependsOn":[],"isDynamic":false,"taskTitle":"Loading high-severity risks" },
  { "id":"t2","toolName":"fetch-open-tasks","inputs":"{}","dependsOn":[],"isDynamic":false,"taskTitle":"Loading open tasks" },
  { "id":"t3","toolName":"fetch-reminders","inputs":"{\"withinDays\":14}","dependsOn":[],"isDynamic":false,"taskTitle":"Checking upcoming deadlines" }
]
```

Artifact: `"table"`.

### Tasks & alerts for one lease (UI has property_id + lease_id)

```json
[
  { "id":"t1","toolName":"fetch-tasks-alerts","inputs":"{\"portfolio_id\":\"<id>\",\"property_id\":\"<id>\",\"lease_id\":\"<id>\"}","dependsOn":[],"isDynamic":false,"taskTitle":"Loading tasks and alerts" }
]
```

### "What's the highest-severity risk?"

```json
[
  { "id":"t1","toolName":"fetch-risk-summary","inputs":"{\"minSeverity\":\"critical\"}","dependsOn":[],"isDynamic":false,"taskTitle":"Loading critical risks" }
]
```

### Reminders only (e.g. "what's due this month")

```json
[
  { "id":"t1","toolName":"fetch-reminders","inputs":"{\"withinDays\":30}","dependsOn":[],"isDynamic":false,"taskTitle":"Checking upcoming deadlines" }
]
```

## Rules

- Severity ranking: `critical > high > medium > low`. If user says "biggest risks" → `minSeverity: "high"`. "Critical only" → `"critical"`.
- `withinDays` defaults to a sensible window per tool — pass it explicitly only when the user named a window ("next 2 weeks" → 14, "this month" → 30, "next quarter" → 90).
- For broad attention questions, NEVER ask the user to pick a portfolio/property first. The tools work portfolio-wide when given no scope.

## Common Triggers

tasks, alerts, risks, what's on my plate, what needs my attention, todo, deadlines, due, reminders, upcoming, this week, this month, what should I worry about, exposure, open items, critical, high severity
