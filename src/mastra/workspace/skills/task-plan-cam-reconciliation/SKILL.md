---
name: task-plan-cam-reconciliation
description: >
  ACTIVATE when the user asks about CAM reconciliation, the "Reconcile YYYY"
  audit, true-ups, over/under-billing, adjustment invoices, or per-unit
  deltas for a calendar year. Distinct from CAM clauses (lease-side) and
  CAM rules (rule library).
license: proprietary
metadata:
  author: lease-iq
  version: "1.0.0"
---

# CAM Reconciliation (Audit) Operations

A reconciliation **run** is the result of replaying the engine chronologically over all accepted/committed bills for one property × one calendar year, then diffing the canonical result against the actual committed invoices.

- `mode: "preview"` — diff captured, nothing written. Re-runnable.
- `mode: "applied"` — adjustment invoices were created (one per unit with non-zero delta). Append-only — never deleted.

A positive `delta` means the tenant was **under-billed**; negative means **over-billed**.

## Capabilities

- List historical runs for a property (optionally filtered by year, mode, unit)
- Fetch a specific run by `runId`
- See per-unit deltas (`by_unit[]`) inside any run

## Required Context

- `fetch-cam-reconciliation`: `portfolio_id`, optional `property_id`, `runId`, `calendar_year`, `mode`, `unit_id`, `limit`

## Dependencies

- If the user named the property and `property_id` is unknown, plan `search-properties` first ([[task-plan-portfolio-property]]).
- Not dynamic — safe to compose with other fetches in the same iteration.

## Task Graph Patterns

### "Show me reconciliation runs for this property"

```json
[
  { "id":"t1","toolName":"fetch-cam-reconciliation","inputs":"{\"portfolio_id\":\"<id>\",\"property_id\":\"<id>\"}","dependsOn":[],"isDynamic":false,"taskTitle":"Loading reconciliation history" }
]
```

### "What was the 2024 reconciliation for Apex Tower?"

After resolving Apex Tower via `search-properties`:
```json
[
  { "id":"t1","toolName":"fetch-cam-reconciliation","inputs":"{\"portfolio_id\":\"<from-search>\",\"property_id\":\"<from-search>\",\"calendar_year\":2024}","dependsOn":[],"isDynamic":false,"taskTitle":"Loading 2024 reconciliation" }
]
```

### "Did we apply any reconciliations this year?"

```json
[
  { "id":"t1","toolName":"fetch-cam-reconciliation","inputs":"{\"portfolio_id\":\"<id>\",\"mode\":\"applied\",\"calendar_year\":<year>}","dependsOn":[],"isDynamic":false,"taskTitle":"Loading applied reconciliations" }
]
```

### "What does unit 4B owe (or get back) for 2024?"

If the user gave a unit code/name, resolve to `unit_id` via property details first ([[task-plan-portfolio-property]]), then:
```json
[
  { "id":"t1","toolName":"fetch-cam-reconciliation","inputs":"{\"portfolio_id\":\"<id>\",\"property_id\":\"<id>\",\"unit_id\":\"<id>\",\"calendar_year\":2024}","dependsOn":[],"isDynamic":false,"taskTitle":"Loading unit reconciliation" }
]
```

If you don't have a `unit_id`, fetch the full property run and have the answering agent surface the specific unit row from `by_unit[]`.

### Specific run by id

```json
[
  { "id":"t1","toolName":"fetch-cam-reconciliation","inputs":"{\"portfolio_id\":\"<id>\",\"runId\":\"<runId>\"}","dependsOn":[],"isDynamic":false,"taskTitle":"Loading reconciliation run" }
]
```

## Output Artifact

For per-unit delta breakdowns use `artifactType: "table"`. For a single roll-up answer ("the 2024 reconciliation was applied on March 1 for $14,200") use `"text"`.

## Rules

- `total_delta > 0` → tenants under-billed → adjustment invoices charge them more.
- `total_delta < 0` → tenants over-billed → adjustment invoices credit them.
- Multiple runs can exist for the same (property, year): often a `preview` followed (sometimes much later) by an `applied`. Sort by `triggered_at` (the tool already returns newest-first).
- Adjustment invoices live in `tenant_invoices` (kind=`adjustment`) — those ids are listed in `adjustments_created`. A tool to fetch them directly does not exist yet; surface the ids in the answer for now.

## Common Triggers

reconciliation, reconcile, true-up, true up, audit, year-end, YEAR-end, 2023, 2024, 2025, billed vs entitled, under-billed, over-billed, owed back, adjustment, adjustment invoice, what does X owe, "Reconcile 2024"
