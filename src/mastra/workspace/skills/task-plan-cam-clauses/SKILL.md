---
name: task-plan-cam-clauses
description: >
  ACTIVATE when the user asks about CAM/OpEx CLAUSES inside a specific lease
  — caps, base year, recovery, exclusions, controllable vs non-controllable,
  gross-up — and CAM-tagged alerts. Distinct from rules (rule library, see
  task-plan-cam-rules) and reconciliation history
  (task-plan-cam-reconciliation).
license: proprietary
metadata:
  author: lease-iq
  version: "1.0.0"
---

# CAM Clause (Lease-side) Operations

This is about what the **lease document itself says** about CAM — caps, base year, recovery terms, exclusions, gross-up rules. Plus any open CAM-tagged alerts on that lease.

## Capabilities

- Surface CAM-related fields from the merged lease (lease + amendments)
- Return CAM-tagged unresolved alerts for that lease

## Required Context

- `fetch-cam-data`: `portfolio_id`, `property_id`, optional `lease_id` (omit to use latest lease for the property)

## Dependencies

- If the user named a property and `property_id` is unknown, plan `search-properties` first ([[task-plan-portfolio-property]]).

## Task Graph Patterns

### "What does this lease say about CAM?" (UI has property_id)

```json
[
  { "id":"t1","toolName":"fetch-cam-data","inputs":"{\"portfolio_id\":\"<id>\",\"property_id\":\"<id>\"}","dependsOn":[],"isDynamic":false,"taskTitle":"Reading CAM clauses" }
]
```

### CAM clauses for a named property

**Iteration 0:**
```json
[
  { "id":"t1","toolName":"search-properties","inputs":"{\"property_name\":\"<name>\"}","dependsOn":[],"isDynamic":true,"taskTitle":"Looking up <name>" }
]
```

**Iteration 1:**
```json
[
  { "id":"t1","toolName":"fetch-cam-data","inputs":"{\"portfolio_id\":\"<from-search>\",\"property_id\":\"<from-search>\",\"lease_id\":\"<from-search>\"}","dependsOn":[],"isDynamic":false,"taskTitle":"Reading CAM clauses" }
]
```

### Cross-portfolio CAM clause keyword hunt

For "which leases have a CAM cap?" or "which leases exclude property taxes from CAM?" — use `fetch-lease-clauses` ([[task-plan-leases]]) with the relevant keyword (`"cam cap"`, `"property tax exclusion"`). `fetch-cam-data` is single-lease only.

## When to Route Elsewhere

- User asks about CAM **rule library** ("what's CAM-014?") → [[task-plan-cam-rules]]
- User asks about CAM **reconciliation** / true-up / adjustments / 2024 audit → [[task-plan-cam-reconciliation]]
- User asks "did CAM ever change in this lease?" → [[task-plan-amendments]] with `fieldFilter:"cam"`

## Common Triggers

CAM clause, CAM cap, base year, expense stop, recovery, controllable CAM, non-controllable, gross-up, vacancy assumption, OpEx, operating expense, what does the lease say about CAM, CAM exclusions in lease
